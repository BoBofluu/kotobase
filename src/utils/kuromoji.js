let tokenizer = null;
let isInitializing = false;
let initializationPromise = null;

export const initKuromoji = () => {
  if (!window.kuromoji) { console.error("kuromoji.js library not found on window object."); return Promise.reject("Library not loaded"); }
  if (tokenizer) return Promise.resolve(tokenizer);
  if (isInitializing && initializationPromise) return initializationPromise;
  isInitializing = true;
  initializationPromise = new Promise((resolve, reject) => {
    window.kuromoji.builder({ dicPath: import.meta.env.BASE_URL + 'dict/' }).build((err, _tokenizer) => {
      isInitializing = false;
      if (err) { console.error("Kuromoji initialization error:", err); reject(err); } 
      else { tokenizer = _tokenizer; resolve(tokenizer); }
    });
  });
  return initializationPromise;
};

const isKana = (text) => /^[\u3040-\u309F\u30A0-\u30FF\u3000-\u303F]+$/.test(text);
const toHiragana = (text) => text.replace(/[\u30a1-\u30f6]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0x60));

export const parseFurigana = async (text) => {
  if (!text) return [];
  try {
    const _tokenizer = await initKuromoji();
    const tokens = _tokenizer.tokenize(text);
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let { surface_form, reading } = token;
      if (surface_form === "一" && i + 1 < tokens.length && tokens[i+1].surface_form === "本") { result.push({ surface: "一本", reading: "いっぽん" }); i++; continue; }
      if (!reading || surface_form === reading || isKana(surface_form)) { result.push({ surface: surface_form, reading: null }); } 
      else { result.push({ surface: surface_form, reading: toHiragana(reading) }); }
    }
    return result;
  } catch (e) { console.warn("Furigana parsing failed:", e); return [{ surface: text, reading: null }]; }
};
