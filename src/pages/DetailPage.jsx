import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Trash2, FileDown, Globe, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { toast, confirmDelete } from '../utils/swal';
import { STORAGE_KEYS } from '../utils/storage';
import FuriganaText from '../components/FuriganaText';
import CategoryManager from '../components/CategoryManager';
import AudioPlayer from '../components/AudioPlayer';
import { theme } from '../styles/theme';
import { AppField, AppButton, AppPill, AppInput, AppTextArea, AppSelect } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { synthesizeSpeech } from '../services/ttsApi';
import { getCacheKey, getCachedAudio, setCachedAudio } from '../services/audioCache';

// Gemini 2.5 Flash TTS 專用聲音列表
const GEMINI_VOICES = [
  { name: 'Achernar', gender: 'FEMALE' },
  { name: 'Algenib', gender: 'MALE' },
  { name: 'Alnilam', gender: 'MALE' },
  { name: 'Aoede', gender: 'FEMALE' },
  { name: 'Autonoe', gender: 'FEMALE' },
  { name: 'Callirrhoe', gender: 'FEMALE' },
  { name: 'Despina', gender: 'FEMALE' },
  { name: 'Erinome', gender: 'FEMALE' },
  { name: 'Gacrux', gender: 'MALE' },
  { name: 'Laomedeia', gender: 'FEMALE' },
  { name: 'Puck', gender: 'MALE' },
  { name: 'Rasalgethi', gender: 'MALE' },
  { name: 'Sadachbia', gender: 'MALE' },
  { name: 'Sadatoni', gender: 'MALE' },
  { name: 'Schedar', gender: 'MALE' },
  { name: 'Sulafat', gender: 'FEMALE' },
  { name: 'Umbriel', gender: 'MALE' },
  { name: 'Vindemiatrix', gender: 'FEMALE' },
  { name: 'Zephyr', gender: 'MALE' },
  { name: 'Zubenelgenubi', gender: 'MALE' },
];

// 英文固定聲音（label 用 i18n key）
const EN_VOICES = [
  { key: 'en-us', labelKey: 'voice_us', voice: 'Achernar', lang: 'en-us' },
  { key: 'en-gb', labelKey: 'voice_gb', voice: 'Fenrir', lang: 'en-gb' },
  { key: 'en-au', labelKey: 'voice_au', voice: 'Aoede', lang: 'en-au' },
];

function DetailPage({ wordId, getWord, onBack, onUpdate, onDelete, onAdd, onViewDuplicate, categories, addCategory, updateCategory, deleteCategory }) {
  const { t, i18n } = useTranslation();
  const { user, getIdToken } = useAuth();
  const word = getWord(wordId);
  const player = useAudioPlayer();

  const [editedWord, setEditedWord] = useState(word);
  const [showEn, setShowEn] = useState(!!word?.en_content);
  const [showFurigana, setShowFurigana] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [activePlayerKey, setActivePlayerKey] = useState(null);

  // 日文 TTS 設定
  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem(STORAGE_KEYS.TTS_VOICE) || 'Achernar'
  );
  const [ttsPrompt, setTtsPrompt] = useState(
    () => localStorage.getItem(STORAGE_KEYS.TTS_PROMPT) || 'Read aloud in a warm, welcoming tone.'
  );
  const [showJpPrompt, setShowJpPrompt] = useState(false);
  const [showEnPrompt, setShowEnPrompt] = useState(false);

  // 保存日文 textarea 高度，切換平假名時不會被還原
  const jpTextareaHeightRef = useRef(null);
  const jpTextareaRef = useRef(null);

  // debounce 儲存，避免拖曳 resize 時每個 onChange 都寫 localStorage
  const saveTimerRef = useRef(null);
  const debouncedUpdate = useCallback((field, value) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onUpdate(word.id, { [field]: value }), 300);
  }, [onUpdate, word?.id]);

  useEffect(() => { if (word) setEditedWord({ ...word }); }, [word, wordId]);

  // 離開頁面時停止播放
  useEffect(() => {
    return () => player.stop();
  }, []);

  if (!word || !editedWord) return null;

  const handleChange = (field, value) => {
    const updated = { ...editedWord, [field]: value };
    setEditedWord(updated);
    // 文字欄位用 debounce 避免每次按鍵/拖曳都寫 localStorage
    if (['title', 'jp_content', 'en_content', 'note'].includes(field)) {
      debouncedUpdate(field, value);
    } else {
      onUpdate(word.id, { [field]: value });
    }
  };

  const handleDuplicate = () => {
    const newId = Date.now().toString();
    const newWord = { ...word, id: newId, title: (word.title || '') + t('msg_duplicate_title_suffix'), created_at: new Date().toISOString() };
    onAdd(newWord);
    toast('success', t('msg_duplicate_success'));
    onViewDuplicate(newId);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(word, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `note_${word.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast('success', t('msg_copied'));
    });
  };

  /**
   * 播放 TTS（含快取）
   * @param {string} text - 朗讀文字
   * @param {string} lang - 語言代碼
   * @param {string} playerKey - 播放器識別 key
   * @param {string} voiceName - 指定聲音名稱（可選，預設用 selectedVoice）
   */
  const handleSpeak = async (text, lang, playerKey, voiceName) => {
    // 檢查是否有實際內容（排除空白、特殊符號）
    const hasContent = text && /[\p{L}\p{N}]/u.test(text);
    if (!hasContent) {
      toast('warning', t('msg_tts_no_content'), 2000);
      return;
    }

    if (activePlayerKey === playerKey && player.status !== 'idle') return;

    if (activePlayerKey !== playerKey) {
      player.stop();
    }
    setActivePlayerKey(playerKey);

    const voice = voiceName || selectedVoice;

    player.setLoading();
    try {
      const cacheKey = getCacheKey(text, lang, voice);
      let audioContent = await getCachedAudio(cacheKey);

      if (!audioContent) {
        const idToken = await getIdToken();
        const result = await synthesizeSpeech(text, lang, idToken, { voiceName: voice, prompt: ttsPrompt });
        audioContent = result.audioContent;
        await setCachedAudio(cacheKey, audioContent);
      }

      await player.loadAndPlay(audioContent);
    } catch (error) {
      console.error('Gemini TTS failed:', error);
      player.stop();
      if (error.status === 403) {
        toast('error', t('msg_tts_not_authorized'), 3000);
      } else if (error.status === 429) {
        toast('warning', t('msg_rate_limit'), 2000);
      } else {
        toast('error', t('msg_tts_error'), 2000);
      }
    }
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, voice);
  };

  const handlePromptChange = (value) => {
    setTtsPrompt(value);
    localStorage.setItem(STORAGE_KEYS.TTS_PROMPT, value);
  };

const handleDelete = () => {
    confirmDelete(t, t('msg_delete_item_confirm')).then((result) => {
      if (result.isConfirmed) { onDelete(word.id); onBack(); }
    });
  };

  /**
   * 渲染播放器（已登入用 AudioPlayer 元件，未登入用簡單按鈕）
   */
  const renderPlayer = (text, lang, playerKey, label, voiceName) => {
    if (!user) return null;

    const isActive = activePlayerKey === playerKey;
    return (
      <AudioPlayer
        status={isActive ? player.status : 'idle'}
        onPlay={() => handleSpeak(text, lang, playerKey, voiceName)}
        onPause={player.pause}
        onResume={player.resume}
        onRestart={player.restart}
        onStop={() => { player.stop(); setActivePlayerKey(null); }}
        isHD={true}
        label={label}
      />
    );
  };

  const currentCat = categories?.[editedWord.category] || {};
  const catColor = currentCat.customColor || '#818cf8';

  return (
    <div className="flex flex-col gap-6 pb-24 w-full animate-in fade-in duration-300 px-4 max-w-[1600px] mx-auto">

      <div className="sticky top-14 bg-[#1a1a1a]/90 backdrop-blur-md z-40 py-3 border-b border-[#3f3f3f] flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#818cf8] hover:text-white transition-colors font-bold focus:outline-none">
          <ArrowLeft size={20} />
          <span>{t('btn_back')}</span>
        </button>
        <span className="text-[14px] text-[#555] font-medium">{t('created_at')}: {new Date(word.created_at).toLocaleString()}</span>
      </div>

      <div className="bg-[#1e1e1e] border border-[#3f3f3f] rounded-[24px] p-6 sm:p-10 flex flex-col gap-10 shadow-2xl relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 right-0 h-2 opacity-100" style={{ backgroundColor: catColor }}></div>

        <div className="flex flex-wrap gap-3 mt-2">
            <AppButton size="main" text={t('btn_duplicate')} action={handleDuplicate} icon={<Copy size={14} />} />
            <AppButton size="main" text={t('btn_export_item')} action={handleExport} icon={<FileDown size={14} />} />
            <AppButton size="main" text={showEn ? t('btn_hide_en') : t('btn_show_en')} action={() => setShowEn(!showEn)} icon={<Globe size={14} />} />
        </div>

        <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1 flex flex-col">
                <AppField label={t('label_category')}>
                    <AppButton text={t('btn_manage_category')} action={() => setIsCatManagerOpen(true)} />
                </AppField>
                {Object.keys(categories || {}).length > 0 ? (
                  <AppSelect value={editedWord.category} onChange={(e) => handleChange('category', e.target.value)} className="mt-3">
                    {Object.entries(categories).map(([id, cat]) => (<option key={id} value={id}>{cat.label}</option>))}
                  </AppSelect>
                ) : (
                  <button onClick={() => setIsCatManagerOpen(true)} className="mt-3 w-full py-3 border border-dashed border-[#818cf8]/50 rounded-xl text-[14px] text-[#818cf8] font-bold hover:bg-[#818cf8]/10 transition-colors">
                    {t('msg_no_category')}
                  </button>
                )}
            </div>

            <div className="flex-1 flex flex-col">
                <AppField label={t('label_subcategory')}>
                    <div className="h-[32px] invisible pointer-events-none">Placeholder</div>
                </AppField>
                <div className="flex flex-wrap gap-2 min-h-[44px] items-center mt-3">
                    {currentCat.subcats?.map(sub => (
                        <AppPill
                            key={sub.id}
                            text={sub.label}
                            active={editedWord.subcategories?.includes(sub.id)}
                            action={() => {
                                let newSubcats = [...(editedWord.subcategories || [])];
                                if (newSubcats.includes(sub.id)) newSubcats = newSubcats.filter(id => id !== sub.id);
                                else newSubcats.push(sub.id);
                                handleChange('subcategories', newSubcats);
                            }}
                        />
                    ))}
                    {(!currentCat.subcats || currentCat.subcats.length === 0) && <span className="text-[14px] text-[#444] italic">{t('msg_no_subcat')}</span>}
                </div>
            </div>
        </div>

        <div>
            <AppField label={t('label_title')} />
            <AppInput value={editedWord.title} onChange={(e) => handleChange('title', e.target.value)} placeholder={t('placeholder_title')} className="mt-3" />
        </div>

        {showEn && (
            <div className="animate-in fade-in duration-300">
                <AppField label={t('label_en_content')}>
                    <AppButton text={t('btn_copy')} action={() => handleCopyText(editedWord.en_content)} />
                </AppField>

                {/* 英文 TTS 控制區（僅登入時顯示） */}
                {user && (
                  <div className="mt-2 bg-[#242424] rounded-xl border border-[#3f3f3f] p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {EN_VOICES.map((ev) => (
                        <React.Fragment key={ev.key}>
                          {renderPlayer(editedWord.en_content, ev.lang, ev.key, `${t(ev.labelKey)} (${ev.voice})`, ev.voice)}
                        </React.Fragment>
                      ))}
                      <button
                        onClick={() => setShowEnPrompt(!showEnPrompt)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[12px] font-bold transition-all ${showEnPrompt ? 'bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30' : 'bg-[#2c2c2c] text-[#555] border border-[#3f3f3f] hover:text-[#b3b3b3]'}`}
                      >
                        <MessageSquare size={12} />
                        <span>{t('label_prompt')}</span>
                      </button>
                    </div>
                    {showEnPrompt && (
                      <div className="animate-in fade-in duration-200">
                        <textarea
                          value={ttsPrompt}
                          onChange={(e) => handlePromptChange(e.target.value)}
                          placeholder={t('placeholder_prompt')}
                          rows={2}
                          className="w-full bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-medium leading-relaxed resize-none transition-colors"
                        />
                        <p className="text-[11px] text-[#444] mt-1">{t('msg_prompt_hint')}</p>
                      </div>
                    )}
                  </div>
                )}

                <AppTextArea value={editedWord.en_content} onChange={(e) => handleChange('en_content', e.target.value)} className="mt-3" />
            </div>
        )}

        <div>
            <AppField label={t('label_content')}>
                <AppButton text={t('btn_copy')} action={() => handleCopyText(editedWord.jp_content)} />
                <AppButton text={showFurigana ? t('btn_edit_original') : t('btn_show_furigana')} action={() => {
                  if (!showFurigana && jpTextareaRef.current) {
                    jpTextareaHeightRef.current = jpTextareaRef.current.style.height || jpTextareaRef.current.offsetHeight + 'px';
                  }
                  setShowFurigana(!showFurigana);
                }} />
            </AppField>

            {/* 日文 TTS 控制區（僅登入時顯示） */}
            {user && (
              <div className="mt-2 bg-[#242424] rounded-xl border border-[#3f3f3f] p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedVoice}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-1.5 rounded-xl focus:outline-none focus:border-[#818cf8] font-bold flex-1 min-w-[160px]"
                  >
                    {GEMINI_VOICES.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.gender === 'FEMALE' ? t('gender_female') : t('gender_male')})
                      </option>
                    ))}
                  </select>

                  {renderPlayer(editedWord.jp_content, 'ja-JP', 'jp-main', t('btn_tts_jp'))}

                  <button
                    onClick={() => setShowJpPrompt(!showJpPrompt)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[12px] font-bold transition-all ${showJpPrompt ? 'bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30' : 'bg-[#2c2c2c] text-[#555] border border-[#3f3f3f] hover:text-[#b3b3b3]'}`}
                  >
                    <MessageSquare size={12} />
                    <span>{t('label_prompt')}</span>
                  </button>
                </div>

                {showJpPrompt && (
                  <div className="animate-in fade-in duration-200">
                    <textarea
                      value={ttsPrompt}
                      onChange={(e) => handlePromptChange(e.target.value)}
                      placeholder={t('placeholder_prompt')}
                      rows={2}
                      className="w-full bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-medium leading-relaxed resize-none transition-colors"
                    />
                    <p className="text-[11px] text-[#444] mt-1">{t('msg_prompt_hint')}</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3">
                {showFurigana ? (
                    <div className="w-full bg-[#2c2c2c] border-2 border-[#3f3f3f] rounded-2xl p-5 text-[1.25rem] leading-[2.5]">
                        {editedWord.jp_content ? <FuriganaText text={editedWord.jp_content} /> : <span className="text-[#444] italic text-[14px]">{t('msg_no_content')}</span>}
                    </div>
                ) : (
                    <AppTextArea
                      ref={jpTextareaRef}
                      value={editedWord.jp_content}
                      onChange={(e) => handleChange('jp_content', e.target.value)}
                      minHeight={jpTextareaHeightRef.current || "150px"}
                      className="mt-0"
                    />
                )}
            </div>
        </div>

        <div>
            <AppField label={t('label_note')} />
            <AppTextArea value={editedWord.note} onChange={(e) => handleChange('note', e.target.value)} minHeight="80px" className="mt-3 italic text-[#888]" />
        </div>

        <button onClick={handleDelete} className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] focus:outline-none shadow-sm">{t('btn_delete_item')}</button>
      </div>

      {isCatManagerOpen && <CategoryManager categories={categories} addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} onClose={() => setIsCatManagerOpen(false)} />}
    </div>
  );
}

export default DetailPage;
