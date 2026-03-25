import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Trash2, FileDown, Globe } from 'lucide-react';
import Swal from 'sweetalert2';
import { clsx } from 'clsx';
import FuriganaText from '../components/FuriganaText';
import CategoryManager from '../components/CategoryManager';
import AudioPlayer from '../components/AudioPlayer';
import { theme } from '../styles/theme';
import { AppField, AppButton, AppPill, AppInput, AppTextArea, AppSelect } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { synthesizeSpeech } from '../services/ttsApi';
import { getCacheKey, getCachedAudio, setCachedAudio } from '../services/audioCache';

function DetailPage({ wordId, getWord, onBack, onUpdate, onDelete, onAdd, categories, addCategory, updateCategory, deleteCategory }) {
  const { t, i18n } = useTranslation();
  const { user, getIdToken } = useAuth();
  const word = getWord(wordId);
  const player = useAudioPlayer();

  const [editedWord, setEditedWord] = useState(word);
  const [showEn, setShowEn] = useState(!!word?.en_content);
  const [showFurigana, setShowFurigana] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [ttsLang, setTtsLang] = useState('ja-JP');
  // 記住目前哪個按鈕正在播放
  const [activePlayerKey, setActivePlayerKey] = useState(null);

  useEffect(() => { if (word) setEditedWord({ ...word }); }, [word, wordId]);

  // 離開頁面時停止播放
  useEffect(() => {
    return () => player.stop();
  }, []);

  if (!word || !editedWord) return null;

  const handleChange = (field, value) => {
    const updated = { ...editedWord, [field]: value };
    setEditedWord(updated);
    onUpdate(word.id, { [field]: value });
  };

  const handleDuplicate = () => {
    const newWord = { ...word, id: Date.now().toString(), title: (word.title || '') + t('msg_duplicate_title_suffix'), created_at: new Date().toISOString() };
    onAdd(newWord);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_duplicate_success'), showConfirmButton: false, timer: 1500 });
    onBack();
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
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_copied'), showConfirmButton: false, timer: 1500 });
    });
  };

  /**
   * 播放 TTS（含快取）
   */
  const handleSpeak = async (text, lang, playerKey) => {
    if (!text) return;

    // 如果同一個按鈕正在播放/暫停，不做任何事（由 AudioPlayer 控制）
    if (activePlayerKey === playerKey && player.status !== 'idle') return;

    // 切換到不同的播放按鈕，先停止舊的
    if (activePlayerKey !== playerKey) {
      player.stop();
    }
    setActivePlayerKey(playerKey);

    // 已登入：使用 Gemini TTS + 快取
    if (user) {
      player.setLoading();
      try {
        const voiceName = localStorage.getItem('ttsVoice') || 'Achernar';
        const prompt = localStorage.getItem('ttsPrompt') || '';
        const cacheKey = getCacheKey(text, lang, voiceName);

        // 先查快取
        let audioContent = await getCachedAudio(cacheKey);

        if (!audioContent) {
          // 快取沒有，呼叫 API
          const idToken = await getIdToken();
          const result = await synthesizeSpeech(text, 'ja-JP', idToken, { voiceName, prompt });
          audioContent = result.audioContent;

          // 存入快取
          await setCachedAudio(cacheKey, audioContent);
        }

        await player.loadAndPlay(audioContent);
      } catch (error) {
        console.error('Gemini TTS failed:', error);
        player.stop();
        if (error.status === 429) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: t('msg_rate_limit'), showConfirmButton: false, timer: 2000 });
        } else {
          Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: t('msg_tts_fallback'), showConfirmButton: false, timer: 1500 });
          speakWithBrowser(text, lang);
        }
      }
      return;
    }

    // 未登入：瀏覽器 TTS
    speakWithBrowser(text, lang);
  };

  const speakWithBrowser = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleDelete = () => {
    Swal.fire({
      title: t('msg_delete_item_confirm'), icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff6b6b', cancelButtonColor: '#3f3f3f', confirmButtonText: t('btn_delete'), cancelButtonText: t('btn_cancel'), background: '#1a1a1a', color: '#fff',
    }).then((result) => {
      if (result.isConfirmed) { onDelete(word.id); onBack(); }
    });
  };

  /**
   * 渲染播放器（已登入用 AudioPlayer 元件，未登入用簡單按鈕）
   */
  const renderPlayer = (text, lang, playerKey, label) => {
    if (!user) {
      return (
        <AppButton
          text={label}
          action={() => handleSpeak(text, lang, playerKey)}
          icon={<span style={{ fontSize: '10px' }}>▶</span>}
        />
      );
    }

    const isActive = activePlayerKey === playerKey;
    return (
      <AudioPlayer
        status={isActive ? player.status : 'idle'}
        onPlay={() => handleSpeak(text, lang, playerKey)}
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
                <AppSelect value={editedWord.category} onChange={(e) => handleChange('category', e.target.value)} className="mt-3">
                    {Object.entries(categories || {}).map(([id, cat]) => (<option key={id} value={id}>{cat.label}</option>))}
                </AppSelect>
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
                <div className="flex flex-wrap gap-2 mt-2">
                    {renderPlayer(editedWord.en_content, 'en-us', 'en-us', t('btn_tts_en_us'))}
                    {renderPlayer(editedWord.en_content, 'en-gb', 'en-gb', t('btn_tts_en_gb'))}
                    {renderPlayer(editedWord.en_content, 'en-au', 'en-au', t('btn_tts_en_au'))}
                </div>
                <AppTextArea value={editedWord.en_content} onChange={(e) => handleChange('en_content', e.target.value)} className="mt-3" />
            </div>
        )}

        <div>
            <AppField label={t('label_content')}>
                <AppButton text={t('btn_copy')} action={() => handleCopyText(editedWord.jp_content)} />
                <AppButton text={showFurigana ? t('btn_edit_original') : t('btn_show_furigana')} action={() => setShowFurigana(!showFurigana)} active={showFurigana} />
            </AppField>
            <div className="flex items-center gap-2 mt-2">
                <select value={ttsLang} onChange={(e) => setTtsLang(e.target.value)} className="bg-[#2c2c2c] text-[14px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-1 rounded-xl focus:outline-none font-bold">
                    <option value="ja-JP">ja-JP</option><option value="en-US">en-US</option>
                    <option value="ko-KR">ko-KR</option>
                </select>
                {renderPlayer(editedWord.jp_content, ttsLang, `jp-${ttsLang}`, t('btn_tts_jp'))}
            </div>
            <div className="mt-3">
                {showFurigana ? (
                    <div className="w-full bg-[#2c2c2c] border-2 border-[#3f3f3f] rounded-2xl p-5 text-[1.25rem] leading-[2.5]">
                        {editedWord.jp_content ? <FuriganaText text={editedWord.jp_content} /> : <span className="text-[#444] italic text-[14px]">{t('msg_no_content')}</span>}
                    </div>
                ) : (
                    <AppTextArea value={editedWord.jp_content} onChange={(e) => handleChange('jp_content', e.target.value)} minHeight="150px" className="mt-0" />
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
