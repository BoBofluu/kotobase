import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Trash2, ExternalLink, LogIn, LogOut, User, Volume2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';

const VOICE_OPTIONS = [
  'Achernar', 'Algenib', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Despina', 'Erinome', 'Gacrux', 'Laomedeia',
  'Puck', 'Rasalgethi', 'Sadachbia', 'Sadatoni', 'Schedar',
  'Sulafat', 'Umbriel', 'Vindemiatrix', 'Zephyr',
];

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  // 語音設定 (存在 localStorage)
  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem('ttsVoice') || 'Achernar'
  );

  const changeLanguage = () => {
    Swal.fire({
      title: t('btn_switch_lang'),
      input: 'select',
      inputOptions: { 'zh-TW': '繁體中文', 'ja': '日本語', 'ko': '한국어' },
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

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('ttsVoice', voice);
  };

  const cardClass = "bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 語言切換 */}
      <div onClick={changeLanguage} className={cardClass}>
        <div className="flex items-center gap-4">
          <Globe className="text-[#818cf8]" size={24} />
          <div className="flex flex-col"><span className="text-[16px] font-bold text-white">{t('btn_switch_lang')}</span><span className="text-[14px] text-[#555]">{i18n.language === 'zh-TW' ? '繁體中文' : i18n.language === 'ja' ? '日本語' : '한국어'}</span></div>
        </div>
        <div className="text-[#444] text-[14px]">➔</div>
      </div>

      {/* 帳號登入區塊 */}
      {!loading && (
        user ? (
          /* 已登入狀態 */
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
              <button onClick={handleSignOut} className="flex items-center gap-2 text-[14px] text-[#ff6b6b] border border-[#ff6b6b]/30 px-3 py-1.5 rounded-xl hover:bg-[#ff6b6b] hover:text-white transition-all font-bold">
                <LogOut size={14} />
                <span>{t('btn_sign_out')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* 未登入狀態 */
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

      {/* 語音設定（已登入時顯示）*/}
      {user && (
        <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#3f3f3f]">
          <div className="flex items-center gap-4 mb-4">
            <Volume2 className="text-[#818cf8]" size={24} />
            <span className="text-[16px] font-bold text-white">{t('label_tts_settings')}</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#b3b3b3]">{t('label_tts_voice')}</span>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="bg-[#2c2c2c] text-[14px] text-[#b3b3b3] border border-[#3f3f3f] px-3 py-1.5 rounded-xl focus:outline-none font-bold"
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
              </select>
            </div>
          </div>
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
      <div className="mt-16 flex flex-col items-center gap-3 text-[#444]"><ExternalLink size={28} className="opacity-30" /><span className="text-[14px] font-medium tracking-widest uppercase opacity-50">Version 2.0 (React Migration)</span></div>
    </div>
  );
}

export default SettingsPage;
