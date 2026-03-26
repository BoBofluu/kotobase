import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CategoryManager from '../components/CategoryManager';
import { toast, alert } from '../utils/swal';
import FuriganaText from '../components/FuriganaText';
import { AppField, AppButton, AppPill, AppInput, AppTextArea, AppSelect } from '../components/UI';

function InputPage({ onSave, categories, addCategory, updateCategory, deleteCategory }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [selectedSubcats, setSelectedSubcats] = useState(new Set());
  const [title, setTitle] = useState('');
  const [enContent, setEnContent] = useState('');
  const [jpContent, setJpContent] = useState('');
  const [note, setNote] = useState('');
  const [showEn, setShowEn] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  useEffect(() => { setSelectedSubcats(new Set()); }, [category]);
  useEffect(() => {
    const catKeys = Object.keys(categories || {});
    if (!category && catKeys.length > 0) setCategory(catKeys[0]);
  }, [categories, category]);

  const handleToggleSubcat = (subId) => {
    const newSet = new Set(selectedSubcats);
    if (newSet.has(subId)) newSet.delete(subId);
    else newSet.add(subId);
    setSelectedSubcats(newSet);
  };

  const handleSave = () => {
    if (!category || Object.keys(categories || {}).length === 0) {
      alert('warning', t('msg_no_category'));
      setIsCatManagerOpen(true);
      return;
    }
    if (!title.trim() && !jpContent.trim() && !enContent.trim()) {
      alert('warning', t('msg_save_no_content'));
      return;
    }
    onSave({ category, subcategories: Array.from(selectedSubcats), title: title.trim(), en_content: enContent.trim(), jp_content: jpContent.trim(), note: note.trim() });
    setTitle(''); setEnContent(''); setJpContent(''); setNote(''); setSelectedSubcats(new Set()); setShowFurigana(false);
    toast('success', t('msg_save_success'));
  };

  const currentCat = categories?.[category] || {};

  return (
    <div className="flex flex-col gap-6 pb-10 w-full animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 flex flex-col">
          <AppField label={t('label_category')}>
            <AppButton text={t('btn_manage_category')} action={() => setIsCatManagerOpen(true)} />
          </AppField>
          {Object.keys(categories || {}).length > 0 ? (
            <AppSelect value={category} onChange={(e) => setCategory(e.target.value)} className="mt-3">
              {Object.entries(categories).map(([id, cat]) => (<option key={id} value={id}>{cat.label}</option>))}
            </AppSelect>
          ) : (
            <button onClick={() => setIsCatManagerOpen(true)} className="mt-3 w-full py-3 border border-dashed border-[#818cf8]/50 rounded-xl text-[14px] text-[#818cf8] font-bold hover:bg-[#818cf8]/10 transition-colors">
              {t('msg_no_category')}
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <AppField label={t('label_subcategory')} />
          <div className="flex flex-wrap gap-2 min-h-[46px] items-center mt-3">
            {currentCat.subcats?.map(sub => (
              <AppPill key={sub.id} text={sub.label} active={selectedSubcats.has(sub.id)} action={() => handleToggleSubcat(sub.id)} />
            ))}
            {(!currentCat.subcats || currentCat.subcats.length === 0) && <span className="text-[14px] text-[#444] italic">{t('msg_no_subcat')}</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <AppField label={t('label_title')}>
          <AppButton text={showEn ? t('btn_hide_en') : t('btn_show_en')} action={() => setShowEn(!showEn)} />
        </AppField>
        <AppInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('placeholder_title')} className="mt-3" />
      </div>
      {showEn && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          <AppField label={t('label_en_content')} />
          <AppTextArea value={enContent} onChange={(e) => setEnContent(e.target.value)} placeholder={t('placeholder_content')} className="mt-3" />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <AppField label={t('label_content')}>
          <AppButton text={showFurigana ? t('btn_edit_original') : t('btn_show_furigana')} action={() => setShowFurigana(!showFurigana)} />
        </AppField>
        <div className="min-h-[120px] mt-3">
          {showFurigana ? (
            <div className="w-full bg-[#2c2c2c] border-2 border-[#3f3f3f] rounded-2xl p-5 text-[1.25rem] leading-[2.5]">
              {jpContent ? <FuriganaText text={jpContent} /> : <span className="text-[#444] italic text-sm">{t('msg_no_content')}</span>}
            </div>
          ) : (
            <AppTextArea value={jpContent} onChange={(e) => setJpContent(e.target.value)} placeholder={t('placeholder_content')} minHeight="150px" className="mt-0" />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <AppField label={t('label_note')} />
        <AppTextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('placeholder_note')} minHeight="80px" className="mt-3 italic text-[#888]" />
      </div>
      <button onClick={handleSave} className="mt-4 py-4 bg-[#818cf8]/10 border border-[#818cf8]/30 text-[#818cf8] rounded-full font-bold hover:bg-[#818cf8] hover:text-white transition-all active:scale-[0.98] shadow-sm">{t('btn_save')}</button>
      {isCatManagerOpen && <CategoryManager categories={categories} addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} onClose={() => setIsCatManagerOpen(false)} />}
    </div>
  );
}

export default InputPage;
