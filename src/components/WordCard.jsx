import React from 'react';
import { useTranslation } from 'react-i18next';

function WordCard({ word, categories, onClick }) {
  const { t } = useTranslation();
  const catColor = categories[word.category]?.customColor || '#fb923c';

  return (
    <div
      onClick={() => onClick(word.id)}
      className="relative bg-[#1e1e1e] border border-transparent rounded-[20px] p-[16px] flex flex-col group active:scale-[0.98] transition-all duration-300 cursor-pointer hover:shadow-[0_8px_15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 overflow-hidden h-[220px]"
    >
      <div className="absolute top-0 left-0 right-0 h-[6px]" style={{ backgroundColor: catColor }} />

      <div className="flex flex-col gap-2 mt-1 shrink-0">
        <div className="flex flex-wrap gap-1.5 items-center max-h-[72px] overflow-hidden">
          <span className="px-[12px] py-[5px] rounded-[6px] text-sm font-bold text-[#121212] uppercase shadow-sm inline-block" style={{ backgroundColor: catColor }}>
            {categories[word.category]?.label || t('cat_other_label')}
          </span>
          {word.subcategories?.map(subId => {
            const sub = categories[word.category]?.subcats?.find(s => s.id === subId);
            return sub ? (
              <span key={subId} className="px-[12px] py-[5px] rounded-[6px] text-sm font-bold text-[#121212] uppercase shadow-sm inline-block opacity-80" style={{ backgroundColor: catColor }}>
                {sub.label}
              </span>
            ) : null;
          })}
        </div>
        <span className="text-sm text-[#b3b3b3] font-medium leading-none">{new Date(word.created_at).toLocaleString()}</span>
      </div>

      <div className="flex flex-col gap-1 mt-2 min-h-0 overflow-hidden">
        <h3 className="text-[17px] font-bold text-white truncate leading-tight">{word.title || t('msg_no_content')}</h3>
        <p className="text-sm text-[#b3b3b3] line-clamp-2 leading-relaxed whitespace-pre-wrap overflow-hidden max-h-[3rem]">
          {word.jp_content || word.en_content || t('msg_no_content')}
        </p>
      </div>
    </div>
  );
}

export default WordCard;
