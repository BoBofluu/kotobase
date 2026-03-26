import { useEffect } from 'react';

/** 按 ESC 鍵關閉 modal */
function useEscClose(onClose) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

export default useEscClose;
