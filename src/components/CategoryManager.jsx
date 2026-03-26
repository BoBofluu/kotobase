import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Palette } from 'lucide-react';
import Swal from 'sweetalert2';
import { clsx } from 'clsx';

const PRESET_COLORS = ['#f87171', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#818cf8', '#6366f1', '#c084fc', '#f472b6', '#a8a29e'];

function CategoryManager({ categories, addCategory, updateCategory, deleteCategory, onClose }) {
  const { t } = useTranslation();
  const safeCategories = categories || {};
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [customColor, setCustomColor] = useState(PRESET_COLORS[5]);

  useEffect(() => {
    const keys = Object.keys(safeCategories);
    if (!selectedCatId && keys.length > 0) {
      setSelectedCatId(keys[0]);
      setCustomColor(safeCategories[keys[0]].customColor || PRESET_COLORS[5]);
    }
  }, [safeCategories, selectedCatId]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChangeCatColor = (id, color) => {
    if (!id) return;
    updateCategory(id, { customColor: color });
    setCustomColor(color);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) { Swal.fire({ icon: 'warning', title: t('msg_input_required'), text: t('msg_cat_name_empty'), timer: 1500 }); return; }
    const newId = `cat_${Date.now()}`;
    addCategory(newId, newCatName.trim(), customColor);
    setNewCatName(''); setSelectedCatId(newId);
  };

  const handleDeleteCategory = (id) => {
    if (Object.keys(safeCategories).length <= 1) { Swal.fire({ icon: 'warning', title: t('msg_cannot_delete'), text: t('msg_keep_one_cat') }); return; }
    Swal.fire({ title: t('msg_delete_confirm'), icon: 'warning', showCancelButton: true, confirmButtonText: t('btn_delete'), background: '#1a1a1a', color: '#fff',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteCategory(id);
        const remainingKeys = Object.keys(safeCategories).filter(cid => cid !== id);
        if (selectedCatId === id) setSelectedCatId(remainingKeys[0] || '');
      }
    });
  };

  const handleAddSubcat = () => {
    if (!newSubcatName.trim()) { Swal.fire({ icon: 'warning', title: t('msg_input_required'), text: t('msg_subcat_name_empty'), timer: 1500 }); return; }
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
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-200 text-white">
        <div className="flex items-center justify-between p-4 border-b border-[#333]"><h2 className="text-lg font-bold">{t('btn_manage_category')}</h2><button onClick={onClose} className="p-1 hover:bg-[#333] rounded-lg transition-colors text-[#888]"><X size={20} /></button></div>
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-8 custom-scrollbar">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#818cf8] uppercase tracking-wider">{t('label_main_cat_settings')}</h3>
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t('placeholder_new_cat')} className="flex-1 bg-[#2c2c2c] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#818cf8]" />
                    <button onClick={handleAddCategory} className={btnClass}><Plus size={18} /> {t('btn_add')}</button>
                </div>
                <div className="flex flex-wrap gap-2.5 mt-1 px-1 items-center">
                    {PRESET_COLORS.map(color => (<button key={color} onClick={() => handleChangeCatColor(selectedCatId, color)} className={clsx("w-6 h-6 rounded-full transition-all", customColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110" : "opacity-60 hover:opacity-100")} style={{ backgroundColor: color }} />))}
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#444] hover:scale-110 transition-transform"><input type="color" value={customColor} onChange={(e) => handleChangeCatColor(selectedCatId, e.target.value)} className="absolute -inset-2 w-10 h-10 cursor-pointer" /><Palette size={12} className="absolute inset-0 m-auto pointer-events-none text-white" /></div>
                </div>
            </div>
            <div className="flex flex-col gap-2 mt-2 max-h-[200px] overflow-y-auto pr-1">
              {Object.entries(safeCategories).map(([id, cat]) => (
                <div key={id} className={clsx("group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all", selectedCatId === id ? "bg-[#2c2c2c] border-[#818cf8]" : "bg-[#252525] border-transparent hover:border-[#444]")} onClick={() => { setSelectedCatId(id); setCustomColor(cat.customColor || PRESET_COLORS[5]); }}>
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.customColor }} /><span className={clsx("text-sm font-medium", selectedCatId === id ? "text-white" : "text-[#b3b3b3]")}>{cat.label}</span></div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(id); }} className="text-[#ff6b6b] p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[#333] rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
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
        </div>
        <div className="p-4 bg-[#252525] border-t border-[#333] flex justify-end"><button onClick={onClose} className="bg-white text-black px-8 py-2.5 rounded-xl font-bold active:scale-95 transition-all shadow-lg">{t('btn_done')}</button></div>
      </div>
    </div>
  );
}

export default CategoryManager;
