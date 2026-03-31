import React from 'react';
import { useTranslation } from 'react-i18next';
import { PenTool, List, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import useScrollDirection from '../hooks/useScrollDirection';

function BottomNavbar({ currentTab, setTab }) {
  const { t } = useTranslation();
  const scrollDir = useScrollDirection(15, currentTab);
  const hidden = scrollDir === 'down';

  const tabs = [
    { id: 'input', label: t('tab_input'), icon: PenTool },
    { id: 'list',  label: t('tab_list'),  icon: List },
    { id: 'settings', label: t('tab_settings'), icon: Settings },
  ];

  return (
    <nav className={clsx(
      "fixed bottom-0 left-0 right-0 h-16 bg-[#1e1e1e]/95 backdrop-blur-md border-t border-[#2a2a2a] flex items-stretch justify-around z-50 pb-safe transition-transform duration-300",
      hidden && "translate-y-full"
    )}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={clsx(
            'relative flex-1 flex flex-col items-center justify-center gap-1 transition-all active:bg-[#2c2c2c] focus:outline-none',
            currentTab === id ? 'text-[#818cf8]' : 'text-[#666]'
          )}
        >
          {currentTab === id && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#818cf8] rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
          )}
          <Icon size={22} className={clsx('transition-transform', currentTab === id && 'scale-110')} />
          <span className={clsx('text-[11px] font-semibold transition-all', currentTab === id && 'font-bold')}>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNavbar;
