import { useState, useMemo } from 'react';

export function useWordFilter(words, categories) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [currentCatFilters, setCurrentCatFilters] = useState(new Set(['all']));
  const [selectedSubcats, setSelectedSubcats] = useState(new Set());
  const [searchOptions, setSearchOptions] = useState({
    title: true, category: true, subcat: true, en: true, jp: true, note: true,
  });

  const toggleCatFilter = (id) => {
    setCurrentCatFilters(prev => {
      const next = new Set(prev);
      if (id === 'all') { next.clear(); next.add('all'); }
      else {
        next.delete('all');
        if (next.has(id)) { next.delete(id); if (next.size === 0) next.add('all'); }
        else next.add(id);
      }
      return next;
    });
  };

  const toggleSearchOption = (key) => setSearchOptions(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleAllOptions = (value) => setSearchOptions(prev => Object.fromEntries(Object.keys(prev).map(k => [k, value])));
  const toggleDate = (dateStr) => setSelectedDates(prev => { const next = new Set(prev); next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr); return next; });
  const toggleSubcat = (subId) => setSelectedSubcats(prev => { const next = new Set(prev); next.has(subId) ? next.delete(subId) : next.add(subId); return next; });

  const filteredWords = useMemo(() => {
    let result = [...words];
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(w => {
        if (searchOptions.title && w.title?.toLowerCase().includes(lower)) return true;
        if (searchOptions.category && categories[w.category]?.label?.toLowerCase().includes(lower)) return true;
        if (searchOptions.subcat && w.subcategories?.some(subId => {
          const label = categories[w.category]?.subcats?.find(s => s.id === subId)?.label;
          return label?.toLowerCase().includes(lower);
        })) return true;
        if (searchOptions.en && w.en_content?.toLowerCase().includes(lower)) return true;
        if (searchOptions.jp && w.jp_content?.toLowerCase().includes(lower)) return true;
        if (searchOptions.note && w.note?.toLowerCase().includes(lower)) return true;
        return false;
      });
    }
    if (!currentCatFilters.has('all')) result = result.filter(w => currentCatFilters.has(w.category));
    if (selectedSubcats.size > 0) result = result.filter(w => w.subcategories?.some(id => selectedSubcats.has(id)));
    if (selectedDates.size > 0) result = result.filter(w => selectedDates.has(new Date(w.created_at).toISOString().split('T')[0]));
    result.sort((a, b) => {
      const diff = new Date(b.created_at) - new Date(a.created_at);
      return sortOrder === 'newest' ? diff : -diff;
    });
    return result;
  }, [words, searchTerm, sortOrder, selectedDates, searchOptions, categories, currentCatFilters, selectedSubcats]);

  return {
    searchTerm, setSearchTerm,
    sortOrder, setSortOrder,
    selectedDates, setSelectedDates,
    currentCatFilters, searchOptions,
    selectedSubcats, setSelectedSubcats,
    filteredWords,
    toggleCatFilter, toggleSearchOption, toggleAllOptions, toggleDate, toggleSubcat,
  };
}
