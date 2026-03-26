import React from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { theme } from '../styles/theme';
import ModalWrapper from './ModalWrapper';

function SubcatFilterModal({ categories, selectedSubcats, onToggle, onClear, onClose }) {
  const { t } = useTranslation();

  return (
    <ModalWrapper
      title={t('btn_filter')}
      onClose={onClose}
      zIndex={100}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClear} className="py-2.5 text-[14px] text-[#b3b3b3] border border-[#3f3f3f] rounded-[10px] hover:bg-[#2c2c2c] transition-colors truncate px-2">{t('clear')}</button>
          <button onClick={onClose} className="py-2.5 text-[14px] bg-[#818cf8] text-white rounded-[10px] font-bold active:scale-95 transition-all truncate px-2">{t('btn_confirm')}</button>
        </div>
      }
    >
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
    </ModalWrapper>
  );
}

export default SubcatFilterModal;
