import { useState, useEffect, useCallback } from 'react';
import * as store from '../services/wordStore';

/**
 * 筆記管理 Hook（IndexedDB 版）
 * 初始化時從 IndexedDB 載入所有筆記，操作後同步更新 state + DB
 */
function useWords() {
  const [words, setWords] = useState([]);
  const [ready, setReady] = useState(false);

  // 初始化：遷移 + 載入
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.migrateFromLocalStorage();
      const data = await store.getAllWords();
      if (!cancelled) {
        setWords(data);
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addWord = useCallback(async (word) => {
    const newWord = await store.addWord(word);
    setWords(prev => [newWord, ...prev]);
    return newWord;
  }, []);

  const updateWord = useCallback(async (id, updatedFields) => {
    const updated = await store.updateWord(id, updatedFields);
    if (updated) {
      setWords(prev => prev.map(w => w.id === id ? updated : w));
    }
    return updated;
  }, []);

  const deleteWord = useCallback(async (id) => {
    await store.deleteWord(id);
    setWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const getWord = useCallback((id) => {
    return words.find(w => w.id === id) || null;
  }, [words]);

  /** 批次覆蓋（匯入/同步用） */
  const replaceAll = useCallback(async (newWords) => {
    await store.setAllWords(newWords);
    setWords([...newWords].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
  }, []);

  /** 清除全部 */
  const clearAll = useCallback(async () => {
    await store.clearAllWords();
    setWords([]);
  }, []);

  /** 重新從 DB 載入（同步後 reload 用） */
  const reload = useCallback(async () => {
    const data = await store.getAllWords();
    setWords(data);
  }, []);

  return { words, ready, addWord, updateWord, deleteWord, getWord, replaceAll, clearAll, reload };
}

export default useWords;
