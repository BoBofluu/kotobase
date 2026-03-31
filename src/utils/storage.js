/**
 * 共用常數 + IndexedDB 讀寫工具
 *
 * 筆記與分類已搬至 IndexedDB（wordStore.js）
 * STORAGE_KEYS 保留給語言、TTS 等小型設定用
 */
import * as wordStore from '../services/wordStore';

export const STORAGE_KEYS = {
  LANGUAGE: 'appLanguage',
  TTS_VOICE: 'ttsVoice',
  TTS_PROMPT: 'ttsPrompt',
};

// ===== Words（非同步，委託 wordStore）=====

export async function getLocalWords() {
  return await wordStore.getAllWords();
}

export async function setLocalWords(words) {
  await wordStore.setAllWords(words);
}

// ===== Categories（非同步，委託 wordStore）=====

export async function getLocalCategories() {
  return await wordStore.getCategories();
}

export async function setLocalCategories(cats) {
  if (cats) await wordStore.setCategories(cats);
}
