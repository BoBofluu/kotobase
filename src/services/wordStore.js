/**
 * 筆記與分類資料儲存服務
 * 使用 IndexedDB 取代 localStorage，解決 5MB 容量限制問題
 *
 * Stores:
 *   - words: keyPath = 'id'，每筆獨立存取
 *   - categories: keyPath = 'key'，單一文件 (key='main')
 *
 * 首次啟動自動從 localStorage 遷移資料
 */

import categoryData from '../locales/categories.json';

const DB_NAME = 'kotobase-data';
const DB_VERSION = 1;
const WORDS_STORE = 'words';
const CATEGORIES_STORE = 'categories';

// localStorage keys（用於遷移）
const LS_WORDS_KEY = 'jpLearningData_v2';
const LS_CATEGORIES_KEY = 'jpCategories_v2';

let dbInstance = null;

/**
 * 開啟 IndexedDB
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(WORDS_STORE)) {
        const store = db.createObjectStore(WORDS_STORE, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at');
      }
      if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
        db.createObjectStore(CATEGORIES_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // DB 連線關閉時重置 instance
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== 遷移邏輯 =====

let migrationDone = false;

/**
 * 從 localStorage 遷移資料到 IndexedDB（只執行一次）
 */
export async function migrateFromLocalStorage() {
  if (migrationDone) return;
  migrationDone = true;

  try {
    const db = await openDB();

    // 檢查 IndexedDB 是否已有資料（已遷移過就跳過）
    const wordCount = await new Promise((resolve) => {
      const tx = db.transaction(WORDS_STORE, 'readonly');
      const req = tx.objectStore(WORDS_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    if (wordCount > 0) return; // 已有資料，不需遷移

    // 讀取 localStorage
    const rawWords = localStorage.getItem(LS_WORDS_KEY);
    const rawCats = localStorage.getItem(LS_CATEGORIES_KEY);

    if (!rawWords && !rawCats) return; // 無資料可遷移

    // 遷移 words
    if (rawWords) {
      try {
        let words = JSON.parse(rawWords);
        if (!Array.isArray(words)) words = words?.words || [];

        if (words.length > 0) {
          const tx = db.transaction(WORDS_STORE, 'readwrite');
          const store = tx.objectStore(WORDS_STORE);
          for (const word of words) {
            if (word.id) store.put(word);
          }
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        }
      } catch (e) {
        console.warn('Failed to migrate words from localStorage:', e);
      }
    }

    // 遷移 categories
    if (rawCats) {
      try {
        const cats = JSON.parse(rawCats);
        if (cats && typeof cats === 'object') {
          await setCategories(cats);
        }
      } catch (e) {
        console.warn('Failed to migrate categories from localStorage:', e);
      }
    }

    // 遷移成功後清除 localStorage（釋放空間）
    localStorage.removeItem(LS_WORDS_KEY);
    localStorage.removeItem(LS_CATEGORIES_KEY);
    console.info('Migrated words & categories from localStorage to IndexedDB');
  } catch (error) {
    console.warn('Migration failed:', error);
  }
}

// ===== Words CRUD =====

/**
 * 取得所有筆記（依 created_at 降冪）
 */
export async function getAllWords() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(WORDS_STORE, 'readonly');
    const store = tx.objectStore(WORDS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const words = request.result || [];
      // 依建立時間降冪排序（最新在前）
      words.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      resolve(words);
    };
    request.onerror = () => resolve([]);
  });
}

/**
 * 取得單筆筆記
 */
export async function getWord(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(WORDS_STORE, 'readonly');
    const request = tx.objectStore(WORDS_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

/**
 * 新增筆記
 */
export async function addWord(word) {
  const newWord = {
    ...word,
    id: word.id || Date.now().toString(),
    created_at: word.created_at || new Date().toISOString(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, 'readwrite');
    tx.objectStore(WORDS_STORE).put(newWord);
    tx.oncomplete = () => resolve(newWord);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 更新筆記欄位
 */
export async function updateWord(id, updatedFields) {
  const db = await openDB();
  const existing = await getWord(id);
  if (!existing) return null;

  const updated = { ...existing, ...updatedFields };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, 'readwrite');
    tx.objectStore(WORDS_STORE).put(updated);
    tx.oncomplete = () => resolve(updated);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 刪除筆記
 */
export async function deleteWord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, 'readwrite');
    tx.objectStore(WORDS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 批次寫入筆記（匯入/同步用）
 */
export async function setAllWords(words) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, 'readwrite');
    const store = tx.objectStore(WORDS_STORE);
    store.clear();
    for (const word of words) {
      if (word.id) store.put(word);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 清除所有筆記
 */
export async function clearAllWords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORDS_STORE, 'readwrite');
    tx.objectStore(WORDS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ===== Categories =====

/**
 * 取得分類資料
 */
export async function getCategories() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(CATEGORIES_STORE, 'readonly');
    const request = tx.objectStore(CATEGORIES_STORE).get('main');
    request.onsuccess = () => resolve(request.result?.data || categoryData);
    request.onerror = () => resolve(categoryData);
  });
}

/**
 * 寫入分類資料
 */
export async function setCategories(cats) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CATEGORIES_STORE, 'readwrite');
    tx.objectStore(CATEGORIES_STORE).put({ key: 'main', data: cats });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
