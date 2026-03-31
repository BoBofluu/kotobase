import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Trash2, FileDown, Globe, Play, Pause, RotateCcw, Square, Loader2, Download } from 'lucide-react';
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
import { synthesizeSpeech, synthesizeStandardSpeech } from '../services/ttsApi';
import { getCacheKey, getCachedAudio, setCachedAudio, getWordAudio, setWordAudio } from '../services/audioCache';

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

// 英文固定聲音
const EN_VOICES = [
  { key: 'en-us', labelKey: 'btn_tts_en_us', voice: 'Achernar', lang: 'en-us' },
  { key: 'en-gb', labelKey: 'btn_tts_en_gb', voice: 'Fenrir', lang: 'en-gb' },
  { key: 'en-au', labelKey: 'btn_tts_en_au', voice: 'Aoede', lang: 'en-au' },
];

// TTS Prompt 預設風格
const PROMPT_PRESETS = [
  { id: 'natural', label: '🎙️ 自然・穩定',
    value: '自然で安定した話し方で、呼吸音があり、少し抑揚をつけて読んでください。' },
  { id: 'teacher', label: '📖 教師朗讀',
    value: '教師が教科書を読むように、はっきりと正確な発音で読んでください。試験のリスニング練習に適したスタイルで。' },
  { id: 'anime-girl', label: '✨ 動漫女角・元氣',
    value: 'アニメの元気な女の子キャラクターのように、明るく活発に、感情豊かに読んでください。' },
  { id: 'chuuni-boy', label: '⚔️ 中二男角',
    value: '中二病の男キャラクターのように、大げさで芝居がかった口調で、ドラマチックに読んでください。' },
  { id: 'host-idol', label: '💎 牛郎・偶像磁性',
    value: 'ホストやアイドルのように、色気があり磁力のある声で、甘くささやくように読んでください。' },
  { id: 'news', label: '📺 NHKニュース',
    value: 'NHKのニュースアナウンサーのように、落ち着いた正確な標準語で、丁寧に読んでください。' },
  { id: 'grandma', label: '👵 優しいおばあちゃん',
    value: 'おばあちゃんが孫に話しかけるように、温かくゆっくりと優しい口調で読んでください。' },
  { id: 'samurai', label: '⚔️ 武士・時代劇',
    value: '時代劇の武士のように、威厳があり力強い口調で読んでください。' },
  { id: 'whisper', label: '🌙 ASMR囁き',
    value: 'ASMRのように、そっと囁くような小さな声で、リラックスできるように読んでください。' },
];

/** 格式化秒數 */
const fmt = (s) => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

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
  const [selectedPresetId, setSelectedPresetId] = useState(
    () => localStorage.getItem('ttsPresetId') || ''
  );
  const [showEnPrompt, setShowEnPrompt] = useState(false);

  // 單字綁定語音（持久化）
  const [wordAudioData, setWordAudioData] = useState(null);
  const [jpGenerating, setJpGenerating] = useState(false);

  // 保存日文 textarea 高度
  const jpTextareaHeightRef = useRef(null);
  const jpTextareaRef = useRef(null);
  const progressBarRef = useRef(null);

  // debounce 儲存
  const saveTimerRef = useRef(null);
  const debouncedUpdate = useCallback((field, value) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onUpdate(word.id, { [field]: value }), 300);
  }, [onUpdate, word?.id]);

  // 只在切換不同筆記時同步
  useEffect(() => { if (word) setEditedWord({ ...word }); }, [wordId]);

  // 載入該單字綁定的語音
  useEffect(() => {
    if (!wordId) return;
    getWordAudio(wordId).then((data) => {
      if (data) setWordAudioData(data);
    });
  }, [wordId]);

  // 離開頁面時停止播放
  useEffect(() => {
    return () => player.stop();
  }, []);

  if (!word || !editedWord) return null;

  const handleChange = (field, value) => {
    const updated = { ...editedWord, [field]: value };
    setEditedWord(updated);
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

  // 取得音訊來源標籤
  const getAudioLabel = (type, voice) => {
    if (type === 'standard') {
      return voice === 'ja-JP-Wavenet-C' ? t('label_audio_std_male') : t('label_audio_std_female');
    }
    return t('label_audio_gemini');
  };

  // ===== 日文 Gemini TTS =====
  const handleJpSpeak = async (voiceName, type = 'gemini') => {
    const text = editedWord.jp_content;
    const hasContent = text && /[\p{L}\p{N}]/u.test(text);
    if (!hasContent) { toast('warning', t('msg_tts_no_content'), 2000); return; }

    setJpGenerating(true);
    setActivePlayerKey('jp-main');
    player.setLoading();

    try {
      const idToken = await getIdToken();
      let audioContent;

      if (type === 'standard') {
        // 標準 Wavenet TTS（無 prompt）
        const cacheKey = getCacheKey(text, 'ja-JP', voiceName, '__standard__');
        audioContent = await getCachedAudio(cacheKey);
        if (!audioContent) {
          const result = await synthesizeStandardSpeech(text, 'ja-JP', idToken, { voiceName });
          audioContent = result.audioContent;
          await setCachedAudio(cacheKey, audioContent);
        }
      } else {
        // Gemini TTS（有 prompt）
        const cacheKey = getCacheKey(text, 'ja-JP', voiceName, ttsPrompt);
        audioContent = await getCachedAudio(cacheKey);
        if (!audioContent) {
          const result = await synthesizeSpeech(text, 'ja-JP', idToken, { voiceName, prompt: ttsPrompt });
          audioContent = result.audioContent;
          await setCachedAudio(cacheKey, audioContent);
        }
      }

      // 綁定到此單字
      const label = getAudioLabel(type, voiceName);
      await setWordAudio(wordId, audioContent, { voice: voiceName, prompt: type === 'gemini' ? ttsPrompt : '', type, label });
      setWordAudioData({ audioContent, voice: voiceName, type, label });

      await player.loadAndPlay(audioContent);
    } catch (error) {
      console.error('TTS failed:', error);
      player.stop();
      if (error.status === 403) toast('error', t('msg_tts_not_authorized'), 3000);
      else if (error.status === 429) toast('warning', t('msg_rate_limit'), 2000);
      else toast('error', t('msg_tts_error'), 2000);
    } finally {
      setJpGenerating(false);
    }
  };

  // 播放已存的語音
  const handlePlaySaved = async () => {
    if (!wordAudioData?.audioContent) return;
    setActivePlayerKey('jp-main');
    await player.loadAndPlay(wordAudioData.audioContent);
  };

  // 下載音檔
  const handleDownloadAudio = () => {
    if (!wordAudioData?.audioContent) return;
    const binaryString = atob(wordAudioData.audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedWord.title || word.id}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
  };

  // 進度條點擊跳轉
  const handleBarClick = (e) => {
    if (!progressBarRef.current || !player.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seek(ratio);
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, voice);
  };

  const handlePresetChange = (presetId) => {
    const preset = PROMPT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setTtsPrompt(preset.value);
      localStorage.setItem('ttsPresetId', presetId);
      localStorage.setItem(STORAGE_KEYS.TTS_PROMPT, preset.value);
    }
  };

  const handlePromptChange = (value) => {
    setTtsPrompt(value);
    setSelectedPresetId('');
    localStorage.setItem('ttsPresetId', '');
    localStorage.setItem(STORAGE_KEYS.TTS_PROMPT, value);
  };

  const handleDelete = () => {
    confirmDelete(t, t('msg_delete_item_confirm')).then((result) => {
      if (result.isConfirmed) { onDelete(word.id); onBack(); }
    });
  };

  // ===== 英文 TTS（保持原有方式）=====
  const handleEnSpeak = async (text, lang, playerKey, voiceName) => {
    const hasContent = text && /[\p{L}\p{N}]/u.test(text);
    if (!hasContent) { toast('warning', t('msg_tts_no_content'), 2000); return; }
    if (activePlayerKey === playerKey && player.status !== 'idle') return;
    if (activePlayerKey !== playerKey) player.stop();
    setActivePlayerKey(playerKey);
    player.setLoading();
    try {
      const cacheKey = getCacheKey(text, lang, voiceName, ttsPrompt);
      let audioContent = await getCachedAudio(cacheKey);
      if (!audioContent) {
        const idToken = await getIdToken();
        const result = await synthesizeSpeech(text, lang, idToken, { voiceName, prompt: ttsPrompt });
        audioContent = result.audioContent;
        await setCachedAudio(cacheKey, audioContent);
      }
      await player.loadAndPlay(audioContent);
    } catch (error) {
      console.error('EN TTS failed:', error);
      player.stop();
      if (error.status === 403) toast('error', t('msg_tts_not_authorized'), 3000);
      else if (error.status === 429) toast('warning', t('msg_rate_limit'), 2000);
      else toast('error', t('msg_tts_error'), 2000);
    }
  };

  const renderEnPlayer = (text, lang, playerKey, label, voiceName) => {
    if (!user) return null;
    const isActive = activePlayerKey === playerKey;
    const isBusy = player.status !== 'idle' && !isActive;
    return (
      <AudioPlayer
        status={isActive ? player.status : 'idle'}
        onPlay={() => handleEnSpeak(text, lang, playerKey, voiceName)}
        onPause={player.pause}
        onResume={player.resume}
        onRestart={player.restart}
        onStop={() => { player.stop(); setActivePlayerKey(null); }}
        onSeek={player.seek}
        label={label}
        progress={isActive ? player.progress : 0}
        currentTime={isActive ? player.currentTime : 0}
        duration={isActive ? player.duration : 0}
        disabled={isBusy}
      />
    );
  };

  const renderPromptToggle = (isOpen, toggle) => (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[12px] font-bold transition-all ${isOpen ? 'bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30' : 'bg-[#2c2c2c] text-[#555] border border-[#3f3f3f] hover:text-[#b3b3b3]'}`}
    >
      <span>{t('label_prompt')}</span>
    </button>
  );

  const renderEnPromptEditor = () => (
    <div className="animate-in fade-in duration-200 flex flex-col gap-2">
      <select value={selectedPresetId} onChange={(e) => handlePresetChange(e.target.value)} className="appearance-none bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-bold cursor-pointer">
        <option value="">{t('label_prompt_preset')}</option>
        {PROMPT_PRESETS.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
      </select>
      <textarea value={ttsPrompt} onChange={(e) => handlePromptChange(e.target.value)} placeholder={t('placeholder_prompt')} rows={2} className="w-full bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-medium leading-relaxed resize-none transition-colors" />
      <p className="text-[11px] text-[#444] mt-1">{t('msg_prompt_hint')}</p>
    </div>
  );

  const currentCat = categories?.[editedWord.category] || {};
  const catColor = currentCat.customColor || '#818cf8';

  const isJpActive = activePlayerKey === 'jp-main';
  const jpPlayerStatus = isJpActive ? player.status : 'idle';
  const isBusy = player.status !== 'idle';
  const hasAudio = !!wordAudioData?.audioContent;

  // 共用按鈕樣式
  const genBtnBase = "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] focus:outline-none";
  const genBtnEnabled = `${genBtnBase} bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8] hover:text-white`;
  const genBtnDisabled = `${genBtnBase} bg-[#2c2c2c] text-[#444] border border-[#333] cursor-not-allowed`;

  return (
    <div className="flex flex-col gap-6 pb-24 w-full animate-in fade-in duration-300 px-4 max-w-[1600px] mx-auto">

      <div className="sticky top-0 bg-[#1a1a1a]/90 backdrop-blur-md z-40 py-3 border-b border-[#3f3f3f] flex items-center justify-between">
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

                {/* 英文 TTS 控制區（保持原有，僅登入時顯示） */}
                {user && (
                  <div className="mt-2 bg-[#242424] rounded-xl border border-[#3f3f3f] p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {EN_VOICES.map((ev) => (
                        <React.Fragment key={ev.key}>
                          {renderEnPlayer(editedWord.en_content, ev.lang, ev.key, t(ev.labelKey), ev.voice)}
                        </React.Fragment>
                      ))}
                      {renderPromptToggle(showEnPrompt, () => setShowEnPrompt(!showEnPrompt))}
                    </div>
                    {showEnPrompt && renderEnPromptEditor()}
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
              <div className="mt-2 bg-[#242424] rounded-xl border border-[#3f3f3f] p-4 flex flex-col gap-4">

                {/* 「音声」標題 */}
                <h4 className="text-[13px] font-bold text-[#818cf8] uppercase tracking-wider">{t('label_tts_section')}</h4>

                {/* Row 1: Voice select + 音声生成 button */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedVoice}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-bold min-w-0"
                  >
                    {GEMINI_VOICES.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.gender === 'FEMALE' ? t('gender_female') : t('gender_male')})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => !isBusy && handleJpSpeak(selectedVoice, 'gemini')}
                    disabled={isBusy}
                    className={isBusy ? genBtnDisabled : genBtnEnabled}
                  >
                    {jpGenerating && isJpActive ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                    <span>{t('btn_tts_jp')}</span>
                  </button>
                </div>

                {/* Row 2: 標準音声 buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => !isBusy && handleJpSpeak('ja-JP-Wavenet-A', 'standard')}
                    disabled={isBusy}
                    className={isBusy ? genBtnDisabled : `${genBtnBase} bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981] hover:text-white`}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{t('btn_tts_std_female')}</span>
                  </button>
                  <button
                    onClick={() => !isBusy && handleJpSpeak('ja-JP-Wavenet-C', 'standard')}
                    disabled={isBusy}
                    className={isBusy ? genBtnDisabled : `${genBtnBase} bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-[#3b82f6] hover:text-white`}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{t('btn_tts_std_male')}</span>
                  </button>
                </div>

                {/* 風格指令（永遠展開） */}
                <div className="flex flex-col gap-2 pt-3 border-t border-[#3f3f3f]">
                  <select value={selectedPresetId} onChange={(e) => handlePresetChange(e.target.value)} className="appearance-none bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-bold cursor-pointer">
                    <option value="">{t('label_prompt_preset')}</option>
                    {PROMPT_PRESETS.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                  <textarea value={ttsPrompt} onChange={(e) => handlePromptChange(e.target.value)} placeholder={t('placeholder_prompt')} rows={2} className="w-full bg-[#2c2c2c] text-[13px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-2 rounded-xl focus:outline-none focus:border-[#818cf8] font-medium leading-relaxed resize-none transition-colors" />
                  <p className="text-[11px] text-[#444]">{t('msg_prompt_hint')}</p>
                </div>

                {/* 進度條播放器（有音訊時顯示） */}
                {(hasAudio || jpPlayerStatus !== 'idle') && (
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-[#3f3f3f]">
                    {/* 音訊來源標籤 */}
                    {wordAudioData?.label && (
                      <span className="text-[12px] text-[#888] font-medium">▶ {wordAudioData.label}</span>
                    )}
                    {/* 控制按鈕列 */}
                    <div className="flex items-center gap-2">
                      {jpPlayerStatus === 'playing' ? (
                        <button onClick={player.pause} className="h-10 px-5 flex items-center justify-center gap-1.5 rounded-xl bg-[#818cf8] text-white text-[13px] font-medium hover:bg-[#6366f1] transition-colors">
                          <Pause size={15} fill="currentColor" />
                          <span>{t('btn_pause')}</span>
                        </button>
                      ) : (
                        <button onClick={jpPlayerStatus === 'paused' ? player.resume : handlePlaySaved} className="h-10 px-5 flex items-center justify-center gap-1.5 rounded-xl bg-[#818cf8] text-white text-[13px] font-medium hover:bg-[#6366f1] transition-colors">
                          <Play size={15} fill="currentColor" />
                          <span>{jpPlayerStatus === 'paused' ? t('btn_resume') : t('btn_restart')}</span>
                        </button>
                      )}
                      <button onClick={player.restart} className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#2c2c2c] text-[#b3b3b3] text-[13px] border border-[#3f3f3f] hover:bg-[#3f3f3f] transition-colors" title={t('btn_restart')}>
                        <RotateCcw size={13} />
                        <span>{t('btn_restart')}</span>
                      </button>
                      {(jpPlayerStatus === 'playing' || jpPlayerStatus === 'paused') && (
                        <button onClick={() => { player.stop(); setActivePlayerKey(null); }} className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#ff6b6b]/10 text-[#ff6b6b] text-[13px] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b] hover:text-white transition-colors" title={t('btn_stop')}>
                          <Square size={11} fill="currentColor" />
                          <span>{t('btn_stop')}</span>
                        </button>
                      )}
                      <button onClick={handleDownloadAudio} className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#2c2c2c] text-[#b3b3b3] text-[13px] border border-[#3f3f3f] hover:bg-[#3f3f3f] transition-colors ml-auto" title={t('btn_tts_download')}>
                        <Download size={13} />
                        <span>{t('btn_tts_download')}</span>
                      </button>
                    </div>

                    {/* 進度條 + 時間（同一行） */}
                    <div className="flex items-center gap-2.5">
                      <div
                        ref={progressBarRef}
                        onClick={handleBarClick}
                        className="flex-1 h-2 bg-[#333] rounded-full cursor-pointer relative overflow-hidden group"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-[#818cf8] rounded-full"
                          style={{ width: `${(isJpActive ? player.progress : 0) * 100}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${(isJpActive ? player.progress : 0) * 100}% - 7px)` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#888] tabular-nums whitespace-nowrap">
                        {fmt(isJpActive ? player.currentTime : 0)} / {fmt(isJpActive ? player.duration : 0)}
                      </span>
                    </div>

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
                      minHeight={jpTextareaHeightRef.current || "225px"}
                      className="mt-0"
                    />
                )}
            </div>
        </div>

        <div>
            <AppField label={t('label_note')} />
            <AppTextArea value={editedWord.note} onChange={(e) => handleChange('note', e.target.value)} minHeight="120px" className="mt-3 italic text-[#888]" />
        </div>

        <button onClick={handleDelete} className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] focus:outline-none shadow-sm">{t('btn_delete_item')}</button>
      </div>

      {isCatManagerOpen && <CategoryManager categories={categories} addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} onClose={() => setIsCatManagerOpen(false)} />}
    </div>
  );
}

export default DetailPage;
