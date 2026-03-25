import React from 'react';
import { useTranslation } from 'react-i18next';

function Header() {
  const { t } = useTranslation();
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#1a1a1a]/90 backdrop-blur-md h-14 flex items-center justify-center border-b border-[#2a2a2a] z-50">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#818cf8] to-[#6366f1]" />
      <h1 className="text-[17px] font-bold tracking-wide bg-gradient-to-r from-white to-[#b3b3ff] bg-clip-text text-transparent">
        {t('app_title')}
      </h1>
    </header>
  );
}

export default Header;
