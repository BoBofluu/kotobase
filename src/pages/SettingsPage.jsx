import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Trash2, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';

function SettingsPage() {
  const { t, i18n } = useTranslation();

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

  return (
    <div className="flex flex-col gap-4 w-full">
      <div onClick={changeLanguage} className="bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]">
        <div className="flex items-center gap-4">
          <Globe className="text-[#818cf8]" size={24} />
          <div className="flex flex-col"><span className="text-[16px] font-bold text-white">{t('btn_switch_lang')}</span><span className="text-[14px] text-[#555]">{i18n.language === 'zh-TW' ? '繁體中文' : i18n.language === 'ja' ? '日本語' : '한국어'}</span></div>
        </div>
        <div className="text-[#444] text-[14px]">➔</div>
      </div>
      <div onClick={handleClearData} className="bg-[#1e1e1e] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-[#2c2c2c] transition-colors border border-[#3f3f3f]">
        <div className="flex items-center gap-4">
          <Trash2 className="text-[#ff6b6b]" size={24} />
          <div className="flex flex-col"><span className="text-[16px] font-bold text-[#ff6b6b]">{t('btn_delete')}</span><span className="text-[14px] text-[#555]">重置所有單字資料</span></div>
        </div>
      </div>
      <div className="mt-16 flex flex-col items-center gap-3 text-[#444]"><ExternalLink size={28} className="opacity-30" /><span className="text-[14px] font-medium tracking-widest uppercase opacity-50">Version 2.0 (React Migration)</span></div>
    </div>
  );
}

export default SettingsPage;
