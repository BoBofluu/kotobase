import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Palette, X } from 'lucide-react';
import { clsx } from 'clsx';
import { alert, confirmDelete } from '../utils/swal';
import ModalWrapper from './ModalWrapper';

const PRESET_COLORS = ['#f87171', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#818cf8', '#6366f1', '#c084fc', '#f472b6', '#a8a29e'];

function CategoryManager({ categories, addCategory, updateCategory, deleteCategory, onClose }) {
  const { t } = useTranslation();
  const safeCategories = categories || {};
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[5]);

  useEffect(() => {
    const keys = Object.keys(safeCategories);
    if (!selectedCatId && keys.length > 0) {
      setSelectedCatId(keys[0]);
    }
  }, [safeCategories, selectedCatId]);

  const selectedCatColor = safeCategories[selectedCatId]?.customColor || PRESET_COLORS[5];

  const handleEditCatColor = (color) => {
    if (!selectedCatId) return;
    updateCategory(selectedCatId, { customColor: color });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) { alert('warning', t('msg_input_required'), t('msg_cat_name_empty')); return; }
    const newId = `cat_${Date.now()}`;
    addCategory(newId, newCatName.trim(), newCatColor);
    setNewCatName(''); setSelectedCatId(newId);
  };

  const handleDeleteCategory = (id) => {
    confirmDelete(t).then((result) => {
      if (result.isConfirmed) {
        deleteCategory(id);
        const remainingKeys = Object.keys(safeCategories).filter(cid => cid !== id);
        if (selectedCatId === id) setSelectedCatId(remainingKeys[0] || '');
      }
    });
  };

  const handleAddSubcat = () => {
    if (!newSubcatName.trim()) { alert('warning', t('msg_input_required'), t('msg_subcat_name_empty')); return; }
    if (!selectedCatId) return;
    const currentCat = safeCategories[selectedCatId];
    const newSubcat = { id: `sub_${Date.now()}`, label: newSubcatName.trim() };
    updateCategory(selectedCatId, { subcats: [...(currentCat?.subcats || []), newSubcat] });
    setNewSubcatName('');
  };

  const handleDeleteSubcat = (subId) => {
    if (!selectedCatId) return;
    const currentCat = safeCategories[selectedCatId];
    updateCategory(selectedCatId, { subcats: (currentCat?.subcats || []).filter(sub => sub.id !== subId) });
  };

  const btnClass = "text-[14px] text-[#818cf8] border border-[#818cf8] px-4 py-2 rounded-xl hover:bg-[#818cf8] hover:text-white transition-all font-bold focus:outline-none flex items-center gap-2 active:scale-95";
  const subBtnClass = "text-[14px] text-[#818cf8] border border-[#818cf8] px-3 py-1.5 rounded-xl hover:bg-[#818cf8] hover:text-white transition-all font-bold focus:outline-none flex items-center gap-1.5 active:scale-95";

  return (
    <ModalWrapper
      title={t('btn_manage_category')}
      onClose={onClose}
      zIndex={200}
      footer={<div className="flex justify-end"><button onClick={onClose} className="bg-white text-black px-8 py-2.5 rounded-xl font-bold active:scale-95 transition-all shadow-lg">{t('btn_done')}</button></div>}
    >
      {/* 新增分類 */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-[#818cf8] uppercase tracking-wider">{t('label_main_cat_settings')}</h3>
        <div className="flex gap-2">
          <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t('placeholder_new_cat')} className="flex-1 bg-[#2c2c2c] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#818cf8]" onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
          <button onClick={handleAddCategory} className={btnClass}><Plus size={18} /> {t('btn_add')}</button>
        </div>
        <div className="flex flex-wrap gap-2.5 px-1 items-center">
          {PRESET_COLORS.map(color => (<button key={color} onClick={() => setNewCatColor(color)} className={clsx("w-6 h-6 rounded-full transition-all", newCatColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110" : "opacity-60 hover:opacity-100")} style={{ backgroundColor: color }} />))}
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#444] hover:scale-110 transition-transform"><input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="absolute -inset-2 w-10 h-10 cursor-pointer" /><Palette size={12} className="absolute inset-0 m-auto pointer-events-none text-white" /></div>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="border-t border-[#333]" />

      {/* 既有分類列表 */}
      <div className="flex flex-col gap-2">
        {Object.entries(safeCategories).map(([id, cat]) => (
          <div key={id} className="flex flex-col">
            <div className={clsx("group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all", selectedCatId === id ? "bg-[#2c2c2c] border-[#818cf8]" : "bg-[#252525] border-transparent hover:border-[#444]")} onClick={() => setSelectedCatId(id)}>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.customColor }} /><span className={clsx("text-sm font-medium", selectedCatId === id ? "text-white" : "text-[#b3b3b3]")}>{cat.label}</span></div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(id); }} className="text-[#ff6b6b] p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[#333] rounded-lg transition-all"><Trash2 size={16} /></button>
            </div>
            {selectedCatId === id && (
              <div className="flex flex-wrap gap-2.5 px-3 py-2.5 items-center">
                {PRESET_COLORS.map(color => (<button key={color} onClick={() => handleEditCatColor(color)} className={clsx("w-5 h-5 rounded-full transition-all", selectedCatColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110" : "opacity-50 hover:opacity-100")} style={{ backgroundColor: color }} />))}
                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-[#444] hover:scale-110 transition-transform"><input type="color" value={selectedCatColor} onChange={(e) => handleEditCatColor(e.target.value)} className="absolute -inset-2 w-10 h-10 cursor-pointer" /><Palette size={10} className="absolute inset-0 m-auto pointer-events-none text-white" /></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 pt-6 border-t border-[#333]">
        <h3 className="text-sm font-bold text-[#818cf8] uppercase tracking-wider">{t('label_subcats_of', { name: safeCategories[selectedCatId]?.label || '' })}</h3>
        <div className="flex gap-2">
          <input type="text" value={newSubcatName} onChange={(e) => setNewSubcatName(e.target.value)} placeholder={t('placeholder_new_subcat')} className="flex-1 bg-[#2c2c2c] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#818cf8]" />
          <button onClick={handleAddSubcat} className={subBtnClass}><Plus size={16} /> {t('btn_add')}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {(safeCategories[selectedCatId]?.subcats || []).map((sub) => (
            <div key={sub.id} className="bg-[#2c2c2c] border border-[#3f3f3f] rounded-full px-3 py-1.5 flex items-center gap-2 text-[14px] text-[#b3b3b3] hover:text-white transition-colors group"><span>{sub.label}</span><button onClick={() => handleDeleteSubcat(sub.id)} className="text-[#555] hover:text-[#ff6b6b] transition-colors"><X size={14} /></button></div>
          ))}
          {(!safeCategories[selectedCatId]?.subcats || safeCategories[selectedCatId]?.subcats.length === 0) && (<span className="text-[14px] text-[#555] italic py-2">{t('msg_no_subcat_yet')}</span>)}
        </div>
      </div>
    </ModalWrapper>
  );
}

export default CategoryManager;
