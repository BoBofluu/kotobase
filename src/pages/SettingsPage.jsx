import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Trash2, ExternalLink, LogIn, LogOut, User, Download, Upload, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloud, downloadFromCloud, mergeWords, mergeCategories, exportData, parseImportFile } from '../services/cloudSync';

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef(null);

  // 讀取 localStorage 資料
  const getLocalWords = () => {
    try {
      const raw = localStorage.getItem('jpLearningData_v2');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : (parsed?.words || []);
    } catch (e) { console.warn('Failed to parse words from localStorage:', e); return []; }
  };

  const getLocalCategories = () => {
    try {
      const raw = localStorage.getItem('jpCategories_v2');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { console.warn('Failed to parse categories from localStorage:', e); return null; }
  };

  const setLocalWords = (words) => {
    localStorage.setItem('jpLearningData_v2', JSON.stringify(words));
  };

  const setLocalCategories = (cats) => {
    if (cats) localStorage.setItem('jpCategories_v2', JSON.stringify(cats));
  };

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
        localStorage.setItem('appLanguage', result.value);
      }
    });
  };

  const handleClearData = () => {
    Swal.fire({
      title: t('msg_delete_confirm'), text: t('msg_reset_cat_text'), icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff6b6b', cancelButtonColor: '#3f3f3f', confirmButtonText: t('btn_delete'), cancelButtonText: t('btn_cancel'), background: '#1a1a1a', color: '#fff',
    }).then((result) => {
      if (result.isConfirmed) { localStorage.removeItem('jpLearningData_v2'); window.location.reload(); }
    });
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_sign_in_success'), showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error('Sign in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        Swal.fire({ icon: 'error', title: t('msg_sign_in_error'), background: '#1a1a1a', color: '#fff' });
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: t('msg_sign_out_success'), showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // ===== 匯出 =====
  const handleExport = () => {
    const words = getLocalWords();
    const categories = getLocalCategories();
    if (words.length === 0) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: t('msg_no_data'), showConfirmButton: false, timer: 1500 });
      return;
    }
    exportData(words, categories);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_export_success'), showConfirmButton: false, timer: 1500 });
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
      Swal.fire({ icon: 'error', title: t('msg_import_error'), text: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 5MB)`, background: '#1a1a1a', color: '#fff' });
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const { words: importedWords, categories: importedCats } = parseImportFile(text);

      const localWords = getLocalWords();
      const localCats = getLocalCategories();

      const result = await Swal.fire({
        title: t('msg_import_title'),
        html: `${t('msg_import_found', { count: importedWords.length })}<br/>${t('msg_import_mode')}`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: t('btn_import_merge'),
        denyButtonText: t('btn_import_replace'),
        cancelButtonText: t('btn_cancel'),
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#818cf8',
        denyButtonColor: '#f59e0b',
      });

      if (result.isConfirmed) {
        // 合併模式
        const merged = mergeWords(localWords, importedWords);
        const mergedCats = mergeCategories(localCats, importedCats);
        setLocalWords(merged);
        setLocalCategories(mergedCats);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_import_merge_success', { count: merged.length }), showConfirmButton: false, timer: 2000 });
      } else if (result.isDenied) {
        // 取代模式
        setLocalWords(importedWords);
        if (importedCats) setLocalCategories(importedCats);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_import_replace_success', { count: importedWords.length }), showConfirmButton: false, timer: 2000 });
      }

      // 重新載入頁面以更新 state
      if (result.isConfirmed || result.isDenied) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('Import error:', error);
      Swal.fire({ icon: 'error', title: t('msg_import_error'), text: error.message, background: '#1a1a1a', color: '#fff' });
    }

    // 清空 input 以便重複選同一檔案
    e.target.value = '';
  };

  // ===== 雲端同步 =====
  const handleSyncToCloud = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const words = getLocalWords();
      const categories = getLocalCategories();
      await uploadToCloud(user.uid, words, categories);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_sync_upload_success'), showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error('Sync upload error:', error);
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: t('msg_sync_error'), showConfirmButton: false, timer: 2000 });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFromCloud = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const cloudData = await downloadFromCloud(user.uid);
      if (!cloudData || (!cloudData.words?.length)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: t('msg_sync_no_cloud_data'), showConfirmButton: false, timer: 1500 });
        setSyncing(false);
        return;
      }

      const localWords = getLocalWords();
      const localCats = getLocalCategories();

      const result = await Swal.fire({
        title: t('msg_sync_download_title'),
        html: `${t('msg_sync_cloud_count', { count: cloudData.words.length })}<br/>${t('msg_sync_local_count', { count: localWords.length })}<br/><br/>${t('msg_import_mode')}`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: t('btn_import_merge'),
        denyButtonText: t('btn_sync_replace_local'),
        cancelButtonText: t('btn_cancel'),
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#818cf8',
        denyButtonColor: '#f59e0b',
      });

      if (result.isConfirmed) {
        const merged = mergeWords(localWords, cloudData.words);
        const mergedCats = mergeCategories(localCats, cloudData.categories);
        setLocalWords(merged);
        setLocalCategories(mergedCats);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_sync_merge_success', { count: merged.length }), showConfirmButton: false, timer: 2000 });
      } else if (result.isDenied) {
        setLocalWords(cloudData.words);
        if (cloudData.categories) setLocalCategories(cloudData.categories);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('msg_sync_replace_success'), showConfirmButton: false, timer: 2000 });
      }

      if (result.isConfirmed || result.isDenied) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('Sync download error:', error);
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: t('msg_sync_error'), showConfirmButton: false, timer: 2000 });
    } finally {
      setSyncing(false);
    }
  };

  const cardClass = "bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 隱藏的檔案選擇 input */}
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
          <button onClick={handleExport} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#818cf8]/10 border border-[#818cf8]/30 text-[#818cf8] rounded-xl font-bold hover:bg-[#818cf8] hover:text-white transition-all active:scale-[0.98] text-[14px]">
            <Download size={16} className="shrink-0" />
            <span className="truncate">{t('btn_export')}</span>
          </button>
          <button onClick={handleImport} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] rounded-xl font-bold hover:bg-[#f59e0b] hover:text-white transition-all active:scale-[0.98] text-[14px]">
            <Upload size={16} className="shrink-0" />
            <span className="truncate">{t('btn_import')}</span>
          </button>
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
            <button
              onClick={handleSyncToCloud}
              disabled={syncing}
              className={`flex items-center justify-center gap-2 py-3 px-2 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] rounded-xl font-bold hover:bg-[#10b981] hover:text-white transition-all active:scale-[0.98] text-[14px] ${syncing ? 'opacity-60 cursor-wait' : ''}`}
            >
              {syncing ? <RefreshCw size={16} className="shrink-0 animate-spin" /> : <Upload size={16} className="shrink-0" />}
              <span className="truncate">{t('btn_sync_upload')}</span>
            </button>
            <button
              onClick={handleSyncFromCloud}
              disabled={syncing}
              className={`flex items-center justify-center gap-2 py-3 px-2 bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] rounded-xl font-bold hover:bg-[#3b82f6] hover:text-white transition-all active:scale-[0.98] text-[14px] ${syncing ? 'opacity-60 cursor-wait' : ''}`}
            >
              {syncing ? <RefreshCw size={16} className="shrink-0 animate-spin" /> : <Download size={16} className="shrink-0" />}
              <span className="truncate">{t('btn_sync_download')}</span>
            </button>
          </div>
          <p className="text-[12px] text-[#444] mt-2">{t('msg_sync_hint')}</p>
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
