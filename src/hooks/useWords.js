import useLocalStorage from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';

function useWords() {
  const [storedValue, setStoredValue] = useLocalStorage(STORAGE_KEYS.WORDS, []);

  // 確保 words 永遠是陣列，相容物件格式與異常資料
  const words = Array.isArray(storedValue) 
    ? storedValue 
    : (storedValue && typeof storedValue === 'object' && Array.isArray(storedValue.words) ? storedValue.words : []);

  const addWord = (word) => {
    const newWord = {
      ...word,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setStoredValue(prev => {
      const currentWords = Array.isArray(prev) ? prev : (prev?.words || []);
      return [newWord, ...currentWords];
    });
  };

  const updateWord = (id, updatedFields) => {
    setStoredValue(prev => {
      const currentWords = Array.isArray(prev) ? prev : (prev?.words || []);
      return currentWords.map(w => w.id === id ? { ...w, ...updatedFields } : w);
    });
  };

  const deleteWord = (id) => {
    setStoredValue(prev => {
      const currentWords = Array.isArray(prev) ? prev : (prev?.words || []);
      return currentWords.filter(w => w.id !== id);
    });
  };

  const getWord = (id) => {
    return words.find(w => w.id === id);
  };

  return { words, addWord, updateWord, deleteWord, getWord };
}

export default useWords;
