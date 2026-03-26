import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { theme } from '../styles/theme';

function SubcatFilterModal({ categories, selectedSubcats, onToggle, onClear, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#121212] border border-[#3f3f3f] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#3f3f3f]">
          <h2 className="font-bold text-white text-[14px]">{t('btn_filter')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#2c2c2c] rounded-lg transition-colors text-white"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex flex-col gap-6 text-white">
          {Object.entries(categories).map(([id, cat]) => (
            <div key={id} className="flex flex-col gap-3">
              <h3 className="text-[14px] font-bold text-[#818cf8] border-l-2 border-[#818cf8] pl-2">{cat.label}</h3>
              <div className="flex flex-wrap gap-2 ml-2">
                {cat.subcats?.map(sub => (
                  <button key={sub.id} onClick={() => onToggle(sub.id)} className={clsx(theme.pill.base, selectedSubcats.has(sub.id) ? theme.pill.active : theme.pill.inactive)}>
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[#3f3f3f] grid grid-cols-2 gap-3">
          <button onClick={onClear} className="py-2.5 text-[14px] text-[#b3b3b3] border border-[#3f3f3f] rounded-[10px] hover:bg-[#2c2c2c] transition-colors truncate px-2">{t('clear')}</button>
          <button onClick={onClose} className="py-2.5 text-[14px] bg-[#818cf8] text-white rounded-[10px] font-bold active:scale-95 transition-all truncate px-2">{t('btn_confirm')}</button>
        </div>
      </div>
    </div>
  );
}

export default SubcatFilterModal;
