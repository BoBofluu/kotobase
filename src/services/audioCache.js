/**
 * 音訊快取服務
 * 使用 IndexedDB 儲存已生成的 TTS 音訊，避免重複呼叫 API
 */

const DB_NAME = 'kotobase-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio';
const MAX_CACHE_SIZE = 500; // 最多快取 500 筆

/**
 * 產生快取 key（根據文字+語言+聲音）
 */
export function getCacheKey(text, languageCode, voiceName) {
  return `${text}|${languageCode}|${voiceName}`;
}

/**
 * 開啟 IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 從快取取得音訊
 * @returns {Promise<string|null>} base64 音訊或 null
 */
export async function getCachedAudio(cacheKey) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(cacheKey);
      request.onsuccess = () => resolve(request.result?.audioContent || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * 將音訊存入快取
 */
export async function setCachedAudio(cacheKey, audioContent) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 存入新資料
    store.put({
      key: cacheKey,
      audioContent,
      timestamp: Date.now(),
    });

    // 檢查快取大小，超過上限就刪除最舊的
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result > MAX_CACHE_SIZE) {
        const index = store.index('timestamp');
        const deleteCount = countRequest.result - MAX_CACHE_SIZE;
        let deleted = 0;
        const cursor = index.openCursor();
        cursor.onsuccess = (event) => {
          const c = event.target.result;
          if (c && deleted < deleteCount) {
            store.delete(c.primaryKey);
            deleted++;
            c.continue();
          }
        };
      }
    };
  } catch (error) {
    console.warn('Failed to cache audio:', error);
  }
}

/**
 * 清除所有音訊快取
 */
export async function clearAudioCache() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (error) {
    console.warn('Failed to clear audio cache:', error);
  }
}
