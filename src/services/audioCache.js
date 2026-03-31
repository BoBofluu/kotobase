/**
 * 音訊快取服務
 * 使用 IndexedDB 儲存已生成的 TTS 音訊
 *
 * 兩種用途：
 * 1. 一般快取：key = text|lang|voice|prompt（避免重複 API 呼叫）
 * 2. 單字綁定：key = word_{wordId}（持久化語音，關閉瀏覽器後仍在）
 */

const DB_NAME = 'kotobase-audio-cache';
const DB_VERSION = 2; // v2: 增加 word-audio store
const STORE_NAME = 'audio';
const WORD_STORE_NAME = 'word-audio';
const MAX_CACHE_SIZE = 500;

/**
 * 產生快取 key（根據文字+語言+聲音+prompt）
 */
export function getCacheKey(text, languageCode, voiceName, prompt = '') {
  return `${text}|${languageCode}|${voiceName}|${prompt}`;
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
      if (!db.objectStoreNames.contains(WORD_STORE_NAME)) {
        db.createObjectStore(WORD_STORE_NAME, { keyPath: 'wordId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===== 一般快取（text+lang+voice+prompt 組合）=====

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

export async function setCachedAudio(cacheKey, audioContent) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: cacheKey, audioContent, timestamp: Date.now() });

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

// ===== 單字綁定語音（wordId → 音訊）=====

/**
 * 取得單字綁定的語音
 * @returns {Promise<{audioContent: string, voice: string, prompt: string, createdAt: number}|null>}
 */
export async function getWordAudio(wordId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(WORD_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORD_STORE_NAME);
      const request = store.get(wordId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * 儲存單字綁定的語音
 */
export async function setWordAudio(wordId, audioContent, meta = {}) {
  try {
    const db = await openDB();
    const tx = db.transaction(WORD_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORD_STORE_NAME);
    store.put({
      wordId,
      audioContent,
      voice: meta.voice || '',
      prompt: meta.prompt || '',
      type: meta.type || 'gemini',  // 'gemini' | 'standard'
      label: meta.label || '',
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn('Failed to save word audio:', error);
  }
}

/**
 * 清除所有音訊快取
 */
export async function clearAudioCache() {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, WORD_STORE_NAME], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(WORD_STORE_NAME).clear();
  } catch (error) {
    console.warn('Failed to clear audio cache:', error);
  }
}
