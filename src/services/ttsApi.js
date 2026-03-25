const TTS_API_URL = import.meta.env.VITE_TTS_API_URL || '';

/**
 * 呼叫後端 TTS API，取得 Gemini 2.5 Flash TTS 合成語音
 * @param {string} text - 要朗讀的文字
 * @param {string} languageCode - 語言代碼 (例如 "ja-JP", "en-us")
 * @param {string} idToken - Firebase Auth ID token
 * @param {object} options - 額外選項
 * @returns {Promise<string>} base64 編碼的音訊資料
 */
export async function synthesizeSpeech(text, languageCode, idToken, options = {}) {
  if (!TTS_API_URL) {
    throw new Error('TTS API URL not configured');
  }

  const response = await fetch(`${TTS_API_URL}/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      languageCode,
      voiceName: options.voiceName || 'Achernar',
      speakingRate: options.speakingRate || 1.0,
      pitch: options.pitch || 0,
      prompt: options.prompt || '',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `TTS API error: ${response.status}`);
    error.code = errorData.error || 'unknown_error';
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  // 取得剩餘使用次數
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');

  return {
    audioContent: data.audioContent,
    remaining: remaining ? parseInt(remaining) : null,
    limit: limit ? parseInt(limit) : null,
  };
}

/**
 * 播放 base64 編碼的 LINEAR16 音訊
 * @param {string} base64Audio - base64 編碼的音訊
 */
export async function playAudio(base64Audio) {
  // 將 base64 轉為 ArrayBuffer
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 嘗試用 AudioContext 解碼播放
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    return new Promise((resolve) => {
      source.onended = resolve;
    });
  } catch {
    // fallback: 使用 data URL 播放 WAV
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audio.play();
    return new Promise((resolve) => {
      audio.onended = resolve;
    });
  }
}

/**
 * 取得可用的聲音列表
 */
export async function getVoices() {
  if (!TTS_API_URL) return { voices: [], languages: [] };

  const response = await fetch(`${TTS_API_URL}/voices`);
  if (!response.ok) return { voices: [], languages: [] };
  return response.json();
}

/**
 * 呼叫後端 Yahoo Japan ふりがな API，取得精確的假名標注
 * 不需要登入，所有使用者都能使用
 * @param {string} text - 要標注假名的日文文字
 * @returns {Promise<Array<{surface: string, reading: string|null}>>}
 */
export async function fetchFurigana(text) {
  if (!TTS_API_URL) {
    throw new Error('API URL not configured');
  }

  const response = await fetch(`${TTS_API_URL}/furigana`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Furigana API error: ${response.status}`);
  }

  const data = await response.json();
  return data.readings;
}
