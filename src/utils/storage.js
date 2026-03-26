/**
 * localStorage key 常數 + 共用讀寫工具
 * 避免各處硬寫 key 字串
 */

export const STORAGE_KEYS = {
  WORDS: 'jpLearningData_v2',
  CATEGORIES: 'jpCategories_v2',
  LANGUAGE: 'appLanguage',
  TTS_VOICE: 'ttsVoice',
  TTS_PROMPT: 'ttsPrompt',
};

/** 安全讀取 localStorage JSON */
function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e);
    return fallback;
  }
}

/** 寫入 localStorage JSON */
function safeSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalWords() {
  const parsed = safeGet(STORAGE_KEYS.WORDS, []);
  return Array.isArray(parsed) ? parsed : (parsed?.words || []);
}

export function setLocalWords(words) {
  safeSet(STORAGE_KEYS.WORDS, words);
}

export function getLocalCategories() {
  return safeGet(STORAGE_KEYS.CATEGORIES, null);
}

export function setLocalCategories(cats) {
  if (cats) safeSet(STORAGE_KEYS.CATEGORIES, cats);
}
