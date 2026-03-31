import { useState, useEffect, useCallback } from 'react';
import categoryData from '../locales/categories.json';
import * as store from '../services/wordStore';

/**
 * 分類管理 Hook（IndexedDB 版）
 */
function useCategories() {
  const [categories, setCategories] = useState(categoryData);

  // 初始化：從 IndexedDB 載入
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cats = await store.getCategories();
      if (!cancelled) setCategories(cats);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveCats = useCallback(async (newCats) => {
    setCategories(newCats);
    await store.setCategories(newCats);
  }, []);

  const addCategory = useCallback(async (id, label, color) => {
    setCategories(prev => {
      const next = { ...prev, [id]: { label, subcats: [], customColor: color } };
      store.setCategories(next);
      return next;
    });
  }, []);

  const updateCategory = useCallback(async (id, updatedFields) => {
    setCategories(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...updatedFields } };
      store.setCategories(next);
      return next;
    });
  }, []);

  const deleteCategory = useCallback(async (id) => {
    setCategories(prev => {
      const next = { ...prev };
      delete next[id];
      store.setCategories(next);
      return next;
    });
  }, []);

  /** 整體覆蓋（匯入/同步用） */
  const replaceAll = useCallback(async (newCats) => {
    await saveCats(newCats);
  }, [saveCats]);

  return { categories, addCategory, updateCategory, deleteCategory, replaceAll };
}

export default useCategories;
