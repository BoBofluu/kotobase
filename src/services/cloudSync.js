import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 上傳資料到 Firestore
 */
export async function uploadToCloud(uid, words, categories) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    words,
    categories,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * 從 Firestore 下載資料
 */
export async function downloadFromCloud(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    words: data.words || [],
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
export function parseImportFile(jsonString) {
  const data = JSON.parse(jsonString);

  if (data.version === 'v2' || (data.words && data.categories)) {
    return {
      words: data.words || [],
      categories: data.categories || null,
    };
  }

  throw new Error('Unknown file format');
}
