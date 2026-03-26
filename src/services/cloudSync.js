import {
  doc, getDoc, setDoc, getDocs, deleteDoc, collection,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

function verifyUid(uid) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('UID mismatch: operation not allowed');
  }
}

const BATCH_LIMIT = 499;

/** 內部工具：batch 寫入 helper */
async function batchWriteWords(uid, words) {
  let batch = writeBatch(db);
  let opCount = 0;

  const flush = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const word of words) {
    const wordRef = doc(db, 'users', uid, 'words', String(word.id));
    batch.set(wordRef, word);
    opCount++;
    if (opCount >= BATCH_LIMIT) await flush();
  }

  return { batch, opCount, flush };
}

/**
 * 取代模式上傳：本地完全覆蓋雲端
 */
export async function uploadToCloud(uid, words, categories) {
  verifyUid(uid);

  const userRef = doc(db, 'users', uid);
  const wordsCol = collection(db, 'users', uid, 'words');

  // 1. 更新主文件
  await setDoc(userRef, {
    categories,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. 取得雲端現有 word IDs
  const existingSnap = await getDocs(wordsCol);
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const localIds = new Set(words.map(w => String(w.id)));

  // 3. 寫入本地 words
  const { batch, opCount, flush } = await batchWriteWords(uid, words);

  // 4. 刪除雲端有但本地沒有的（孤兒）
  let currentBatch = batch;
  let currentCount = opCount;
  for (const existingId of existingIds) {
    if (!localIds.has(existingId)) {
      const wordRef = doc(db, 'users', uid, 'words', existingId);
      currentBatch.delete(wordRef);
      currentCount++;
      if (currentCount >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        currentCount = 0;
      }
    }
  }
  if (currentCount > 0) await currentBatch.commit();
  else await flush();
}

/**
 * 合併模式上傳：本地資料合併到雲端（保留雲端獨有的資料）
 */
export async function mergeUploadToCloud(uid, words, categories) {
  verifyUid(uid);

  const userRef = doc(db, 'users', uid);

  // 1. 讀取雲端 categories 並合併（本地優先）
  const snap = await getDoc(userRef);
  const cloudCats = snap.exists() ? snap.data().categories : null;
  const mergedCats = mergeCategories(categories, cloudCats);

  await setDoc(userRef, {
    categories: mergedCats,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. 只寫入本地 words（set = 同 id 覆蓋，不同 id 新增，不刪除雲端獨有的）
  const { flush } = await batchWriteWords(uid, words);
  await flush();
}

/**
 * 清除雲端所有資料
 */
export async function clearCloud(uid) {
  verifyUid(uid);

  const userRef = doc(db, 'users', uid);
  const wordsCol = collection(db, 'users', uid, 'words');

  // 1. 刪除所有 words
  const wordsSnap = await getDocs(wordsCol);
  let batch = writeBatch(db);
  let opCount = 0;

  for (const wordDoc of wordsSnap.docs) {
    batch.delete(wordDoc.ref);
    opCount++;
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();

  // 2. 刪除主文件
  await deleteDoc(userRef);
}

/**
 * 從 Firestore 下載資料
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
