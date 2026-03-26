import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { Globe, Trash2, ExternalLink, LogIn, LogOut, User, Download, Upload, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloud, mergeUploadToCloud, downloadFromCloud, clearCloud, mergeWords, mergeCategories, exportData, parseImportFile } from '../services/cloudSync';
import { toast, alert, confirmDelete, chooseMode } from '../utils/swal';
import { STORAGE_KEYS, getLocalWords, setLocalWords, getLocalCategories, setLocalCategories } from '../utils/storage';

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef(null);

  const changeLanguage = () => {
    Swal.fire({
      title: t('btn_switch_lang'),
      input: 'select',
      inputOptions: { 'zh-TW': t('lang_zh_tw'), 'ja': t('lang_ja'), 'ko': t('lang_ko') },
      inputValue: i18n.language,
      showCancelButton: true,
      cancelButtonText: t('btn_cancel'),
      confirmButtonText: t('btn_confirm'),
      background: '#1a1a1a',
      color: '#fff',
    }).then((result) => {
      if (result.isConfirmed) {
        i18n.changeLanguage(result.value);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, result.value);
      }
    });
  };

  const handleClearData = () => {
    confirmDelete(t, t('msg_delete_confirm'), t('msg_reset_cat_text')).then((result) => {
      if (result.isConfirmed) { localStorage.removeItem(STORAGE_KEYS.WORDS); window.location.reload(); }
    });
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
      toast('success', t('msg_sign_in_success'));
    } catch (error) {
      console.error('Sign in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('error', t('msg_sign_in_error'));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast('info', t('msg_sign_out_success'));
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // ===== 匯出 =====
  const handleExport = () => {
    const words = getLocalWords();
    const categories = getLocalCategories();
    if (words.length === 0) {
      toast('info', t('msg_no_data'));
      return;
    }
    exportData(words, categories);
    toast('success', t('msg_export_success'));
  };

  // ===== 匯入 =====
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      alert('error', t('msg_import_error'), `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 5MB)`);
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const { words: importedWords, categories: importedCats } = parseImportFile(text);

      const localWords = getLocalWords();
      const localCats = getLocalCategories();

      const result = await chooseMode(t, {
        title: t('msg_import_title'),
        html: `${t('msg_import_found', { count: importedWords.length })}<br/>${t('msg_import_mode')}`,
        confirmText: t('btn_import_merge'),
        denyText: t('btn_import_replace'),
      });

      if (result.isConfirmed) {
        const merged = mergeWords(localWords, importedWords);
        const mergedCats = mergeCategories(localCats, importedCats);
        setLocalWords(merged);
        setLocalCategories(mergedCats);
        toast('success', t('msg_import_merge_success', { count: merged.length }), 2000);
      } else if (result.isDenied) {
        setLocalWords(importedWords);
        if (importedCats) setLocalCategories(importedCats);
        toast('success', t('msg_import_replace_success', { count: importedWords.length }), 2000);
      }

      if (result.isConfirmed || result.isDenied) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('error', t('msg_import_error'), error.message);
    }

    e.target.value = '';
  };

  // ===== 雲端同步共用 wrapper =====
  const runSyncAction = async (action, logLabel) => {
    setSyncing(true);
    try {
      await action();
    } catch (error) {
      console.error(`${logLabel} error:`, error);
      toast('error', t('msg_sync_error'), 2000);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) return;
    const localWords = getLocalWords();
    const localCats = getLocalCategories();

    const result = await chooseMode(t, {
      title: t('msg_sync_upload_title'),
      html: `${t('msg_sync_local_count', { count: localWords.length })}<br/><br/>${t('msg_import_mode')}`,
      confirmText: t('btn_import_merge'),
      denyText: t('btn_sync_replace_cloud'),
    });
    if (!result.isConfirmed && !result.isDenied) return;

    runSyncAction(async () => {
      if (result.isConfirmed) {
        await mergeUploadToCloud(user.uid, localWords, localCats);
        toast('success', t('msg_sync_merge_upload_success'));
      } else {
        await uploadToCloud(user.uid, localWords, localCats);
        toast('success', t('msg_sync_upload_success'));
      }
    }, 'Sync upload');
  };

  const handleClearCloud = async () => {
    if (!user) return;
    const result = await confirmDelete(t, t('btn_sync_clear_cloud'), t('msg_sync_clear_confirm'));
    if (!result.isConfirmed) return;

    runSyncAction(async () => {
      await clearCloud(user.uid);
      toast('success', t('msg_sync_clear_success'));
    }, 'Clear cloud');
  };

  const handleSyncFromCloud = async () => {
    if (!user) return;

    runSyncAction(async () => {
      const cloudData = await downloadFromCloud(user.uid);
      if (!cloudData || (!cloudData.words?.length)) {
        toast('info', t('msg_sync_no_cloud_data'));
        return;
      }

      const localWords = getLocalWords();
      const localCats = getLocalCategories();

      const result = await chooseMode(t, {
        title: t('msg_sync_download_title'),
        html: `${t('msg_sync_cloud_count', { count: cloudData.words.length })}<br/>${t('msg_sync_local_count', { count: localWords.length })}<br/><br/>${t('msg_import_mode')}`,
        confirmText: t('btn_import_merge'),
        denyText: t('btn_sync_replace_local'),
      });

      if (result.isConfirmed) {
        const merged = mergeWords(localWords, cloudData.words);
        const mergedCats = mergeCategories(localCats, cloudData.categories);
        setLocalWords(merged);
        setLocalCategories(mergedCats);
        toast('success', t('msg_sync_merge_success', { count: merged.length }), 2000);
      } else if (result.isDenied) {
        setLocalWords(cloudData.words);
        if (cloudData.categories) setLocalCategories(cloudData.categories);
        toast('success', t('msg_sync_replace_success'), 2000);
      }

      if (result.isConfirmed || result.isDenied) {
        setTimeout(() => window.location.reload(), 500);
      }
    }, 'Sync download');
  };

  const cardClass = "bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]";

  /** 彩色動作按鈕（匯出匯入/雲端同步共用） */
  const ColorBtn = ({ onClick, color, icon, text, disabled, className = '' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 py-3 px-2 bg-[${color}]/10 border border-[${color}]/30 text-[${color}] rounded-xl font-bold hover:bg-[${color}] hover:text-white transition-all active:scale-[0.98] text-[14px] ${disabled ? 'opacity-60 cursor-wait' : ''} ${className}`}
      style={{ backgroundColor: `${color}1a`, borderColor: `${color}4d`, color: color }}
    >
      {icon}
      <span className="truncate">{text}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      {/* 語言切換 */}
      <div onClick={changeLanguage} className={cardClass}>
        <div className="flex items-center gap-4">
          <Globe className="text-[#818cf8]" size={24} />
          <div className="flex flex-col"><span className="text-[16px] font-bold text-white">{t('btn_switch_lang')}</span><span className="text-[14px] text-[#555]">{t(`lang_${i18n.language === 'zh-TW' ? 'zh_tw' : i18n.language}`)}</span></div>
        </div>
        <div className="text-[#444] text-[14px]">➔</div>
      </div>

      {/* 帳號登入區塊 */}
      {!loading && (
        user ? (
          <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#3f3f3f]">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full border-2 border-[#818cf8]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#818cf8] flex items-center justify-center"><User size={20} className="text-white" /></div>
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[16px] font-bold text-white truncate">{user.displayName || t('label_account')}</span>
                <span className="text-[13px] text-[#555] truncate">{user.email}</span>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-2 text-[14px] text-[#ff6b6b] border border-[#ff6b6b]/30 px-3 py-1.5 rounded-xl hover:bg-[#ff6b6b] hover:text-white transition-all font-bold shrink-0 whitespace-nowrap">
                <LogOut size={14} />
                <span>{t('btn_sign_out')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div onClick={!signingIn ? handleSignIn : undefined} className={`${cardClass} ${signingIn ? 'opacity-60 cursor-wait' : ''}`}>
            <div className="flex items-center gap-4">
              <LogIn className="text-[#818cf8]" size={24} />
              <div className="flex flex-col">
                <span className="text-[16px] font-bold text-white">{signingIn ? t('msg_signing_in') : t('btn_sign_in')}</span>
                <span className="text-[13px] text-[#555]">{t('msg_sign_in_for_tts')}</span>
              </div>
            </div>
            <div className="text-[#444] text-[14px]">➔</div>
          </div>
        )
      )}

      {/* 匯出匯入 */}
      <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#3f3f3f]">
        <div className="flex items-center gap-4 mb-4">
          <Download className="text-[#818cf8]" size={24} />
          <span className="text-[16px] font-bold text-white">{t('label_data_management')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorBtn onClick={handleExport} color="#818cf8" icon={<Download size={16} className="shrink-0" />} text={t('btn_export')} />
          <ColorBtn onClick={handleImport} color="#f59e0b" icon={<Upload size={16} className="shrink-0" />} text={t('btn_import')} />
        </div>
        <p className="text-[12px] text-[#444] mt-2">{t('msg_import_hint')}</p>
      </div>

      {/* 雲端同步（已登入才顯示） */}
      {user && (
        <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#3f3f3f]">
          <div className="flex items-center gap-4 mb-4">
            <Cloud className="text-[#10b981]" size={24} />
            <span className="text-[16px] font-bold text-white">{t('label_cloud_sync')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorBtn onClick={handleSyncToCloud} color="#10b981" disabled={syncing} icon={syncing ? <RefreshCw size={16} className="shrink-0 animate-spin" /> : <Upload size={16} className="shrink-0" />} text={t('btn_sync_upload')} />
            <ColorBtn onClick={handleSyncFromCloud} color="#3b82f6" disabled={syncing} icon={syncing ? <RefreshCw size={16} className="shrink-0 animate-spin" /> : <Download size={16} className="shrink-0" />} text={t('btn_sync_download')} />
          </div>
          <p className="text-[12px] text-[#444] mt-2">{t('msg_sync_hint')}</p>
          <ColorBtn onClick={handleClearCloud} color="#ff6b6b" disabled={syncing} icon={<CloudOff size={14} className="shrink-0" />} text={t('btn_sync_clear_cloud')} className="mt-3 w-full text-[13px]" />
        </div>
      )}

      {/* 清除資料 */}
      <div onClick={handleClearData} className="bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]">
        <div className="flex items-center gap-4">
          <Trash2 className="text-[#ff6b6b]" size={24} />
          <div className="flex flex-col"><span className="text-[16px] font-bold text-[#ff6b6b]">{t('btn_delete')}</span><span className="text-[14px] text-[#555]">{t('msg_reset_data')}</span></div>
        </div>
      </div>

      {/* 版本資訊 */}
      <div className="mt-16 flex flex-col items-center gap-3 text-[#444]"><ExternalLink size={28} className="opacity-30" /><span className="text-[14px] font-medium tracking-widest uppercase opacity-50">Version 2.1</span></div>
    </div>
  );
}

export default SettingsPage;
