import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckSquare, Square, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import MiniCalendar from '../components/MiniCalendar';
import WordCard from '../components/WordCard';
import SubcatFilterModal from '../components/SubcatFilterModal';
import { useWordFilter } from '../hooks/useWordFilter';
import { theme } from '../styles/theme';

function ListPage({ words, categories, onViewDetail }) {
  const { t } = useTranslation();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const {
    searchTerm, setSearchTerm,
    sortOrder, setSortOrder,
    selectedDates, setSelectedDates,
    currentCatFilters, searchOptions,
    selectedSubcats, setSelectedSubcats,
    filteredWords,
    toggleCatFilter, toggleSearchOption, toggleAllOptions, toggleDate, toggleSubcat,
  } = useWordFilter(words, categories);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="sticky top-14 bg-[#1a1a1a]/95 backdrop-blur-md z-40 py-4 border-b border-[#3f3f3f] flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" size={16} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('placeholder_search')} className="w-full bg-[#2c2c2c] border border-[#3f3f3f] rounded-xl pl-10 pr-3 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#818cf8]" />
            </div>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-[#2c2c2c] border border-[#3f3f3f] rounded-xl px-3 text-[14px] text-white focus:outline-none">
              <option value="newest">{t('sort_newest')}</option>
              <option value="oldest">{t('sort_oldest')}</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 p-3 bg-white/5 border border-[#3f3f3f] rounded-xl">
            {[
              { key: 'title', label: t('label_title') },
              { key: 'category', label: t('label_category') },
              { key: 'subcat', label: t('label_subcategory') },
              { key: 'en', label: t('label_en_content') },
              { key: 'jp', label: t('label_content') },
              { key: 'note', label: t('label_note') },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-[14px] text-[#b3b3b3] hover:text-white transition-colors">
                <input type="checkbox" className="hidden" checked={searchOptions[key]} onChange={() => toggleSearchOption(key)} />
                {searchOptions[key] ? <CheckSquare size={14} className="text-[#818cf8]" /> : <Square size={14} />}
                <span>{label}</span>
              </label>
            ))}
            <div className="flex gap-2 ml-auto">
              <button onClick={() => toggleAllOptions(true)} className="text-[14px] text-[#b3b3b3] hover:text-[#818cf8]">{t('all')}</button>
              <button onClick={() => toggleAllOptions(false)} className="text-[14px] text-[#b3b3b3] hover:text-[#818cf8]">{t('clear')}</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => toggleCatFilter('all')} className={clsx(theme.pill.base, currentCatFilters.has('all') ? theme.pill.active : theme.pill.inactive)}>{t('all')}</button>
            {Object.entries(categories).map(([id, cat]) => (
              <button key={id} onClick={() => toggleCatFilter(id)} className={clsx(theme.pill.base, currentCatFilters.has(id) ? theme.pill.active : theme.pill.inactive)}>{cat.label}</button>
            ))}
            <button onClick={() => setIsFilterModalOpen(true)} className={clsx("ml-auto p-2 rounded-[10px] border border-[#3f3f3f] transition-all bg-transparent flex items-center gap-2 text-[14px] font-bold", selectedSubcats.size > 0 ? "text-[#818cf8] border-[#818cf8]" : "text-[#b3b3b3] hover:text-white")}>
              <Filter size={16} /><span>{t('btn_filter')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end md:w-[280px]">
          <MiniCalendar selectedDates={selectedDates} onToggleDate={toggleDate} words={words} />
          {selectedDates.size > 0 && (
            <button onClick={() => setSelectedDates(new Set())} className="mt-2 text-[14px] text-[#818cf8] underline">
              {t('clear')} ({selectedDates.size})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
        {filteredWords.length > 0 ? (
          filteredWords.map(word => <WordCard key={word.id} word={word} categories={categories} onClick={onViewDetail} />)
        ) : (
          <div className="col-span-full py-24 text-center">
            <p className="text-[14px] text-[#b3b3b3] font-medium italic">{t('msg_no_results')}</p>
          </div>
        )}
      </div>

      {isFilterModalOpen && (
        <SubcatFilterModal
          categories={categories}
          selectedSubcats={selectedSubcats}
          onToggle={toggleSubcat}
          onClear={() => setSelectedSubcats(new Set())}
          onClose={() => setIsFilterModalOpen(false)}
        />
      )}
    </div>
  );
}

export default ListPage;
