import {
  doc, getDoc, setDoc, getDocs, collection,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

function verifyUid(uid) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('UID mismatch: operation not allowed');
  }
}

const BATCH_LIMIT = 499;

/**
 * 上傳資料到 Firestore（subcollection 架構）
 * - categories + updatedAt 存在主文件 users/{uid}
 * - 每筆 word 存在 users/{uid}/words/{wordId}
 */
export async function uploadToCloud(uid, words, categories) {
  verifyUid(uid);

  const userRef = doc(db, 'users', uid);
  const wordsCol = collection(db, 'users', uid, 'words');

  // 1. 更新主文件（categories + updatedAt）
  await setDoc(userRef, {
    categories,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. 取得雲端現有 word IDs
  const existingSnap = await getDocs(wordsCol);
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const localIds = new Set(words.map(w => String(w.id)));

  // 3. Batch 寫入：新增/更新 words + 刪除孤兒
  let batch = writeBatch(db);
  let opCount = 0;

  const flushBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  // 新增/更新每筆 word
  for (const word of words) {
    const wordRef = doc(db, 'users', uid, 'words', String(word.id));
    batch.set(wordRef, word);
    opCount++;
    if (opCount >= BATCH_LIMIT) await flushBatch();
  }

  // 刪除雲端有但本地沒有的（孤兒）
  for (const existingId of existingIds) {
    if (!localIds.has(existingId)) {
      const wordRef = doc(db, 'users', uid, 'words', existingId);
      batch.delete(wordRef);
      opCount++;
      if (opCount >= BATCH_LIMIT) await flushBatch();
    }
  }

  await flushBatch();
}

/**
 * 從 Firestore 下載資料（相容新舊格式）
 * - 新格式：從 subcollection 讀取 words
 * - 舊格式：從主文件的 words 陣列讀取（向下相容）
 */
export async function downloadFromCloud(uid) {
  verifyUid(uid);

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();

  const wordsCol = collection(db, 'users', uid, 'words');
  const wordsSnap = await getDocs(wordsCol);
  const words = wordsSnap.docs.map(d => d.data());

  return {
    words,
    categories: data.categories || null,
    updatedAt: data.updatedAt,
  };
}

/**
 * 合併兩組 words（以 id 為 key，取較新的）
 */
export function mergeWords(localWords, cloudWords) {
  const map = new Map();

  // 先放 cloud 的
  for (const w of cloudWords) {
    map.set(String(w.id), w);
  }

  // local 的覆蓋（如果 id 相同，以 created_at 較新的為準）
  for (const w of localWords) {
    const key = String(w.id);
    if (!map.has(key)) {
      map.set(key, w);
    }
    // 同 id 已存在就不覆蓋（兩邊 id 相同代表同一筆，保留任一即可）
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

/**
 * 合併兩組 categories（以 local 為主，cloud 補充缺少的）
 */
export function mergeCategories(localCats, cloudCats) {
  if (!cloudCats) return localCats;
  if (!localCats) return cloudCats;
  return { ...cloudCats, ...localCats };
}

/**
 * 匯出資料為 JSON 檔案下載
 */
export function exportData(words, categories) {
  const data = {
    version: 'v2',
    exportedAt: new Date().toISOString(),
    words,
    categories,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kotobase_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 讀取匯入的 v2 JSON 檔案
 * @returns {{ words: Array, categories: Object|null }}
 */
const MAX_IMPORT_WORDS = 10000;

export function parseImportFile(jsonString) {
  const data = JSON.parse(jsonString);

  if (data.version === 'v2' || (data.words && data.categories)) {
    const words = data.words || [];
    if (!Array.isArray(words)) throw new Error('Invalid format: words is not an array');
    if (words.length > MAX_IMPORT_WORDS) throw new Error(`Too many entries: ${words.length} (max ${MAX_IMPORT_WORDS})`);
    for (const w of words) {
      if (!w.id || !w.created_at) throw new Error('Invalid word entry: missing id or created_at');
    }
    return {
      words,
      categories: data.categories || null,
    };
  }

  throw new Error('Unknown file format');
}
