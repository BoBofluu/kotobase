import useLocalStorage from './useLocalStorage';
import categoryData from '../locales/categories.json';
import { STORAGE_KEYS } from '../utils/storage';

function useCategories() {
  const [categories, setCategories] = useLocalStorage(STORAGE_KEYS.CATEGORIES, categoryData);

  const addCategory = (id, label, color) => {
    setCategories(prev => ({
      ...prev,
      [id]: { label, subcats: [], customColor: color }
    }));
  };

  const updateCategory = (id, updatedFields) => {
    setCategories(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updatedFields }
    }));
  };

  const deleteCategory = (id) => {
    setCategories(prev => {
      const newCats = { ...prev };
      delete newCats[id];
      return newCats;
    });
  };

  return { categories, addCategory, updateCategory, deleteCategory };
}

export default useCategories;
