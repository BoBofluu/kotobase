import { useEffect } from 'react';

/** 開啟 modal 時鎖定背景滾動 */
function useBodyScrollLock() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
}

export default useBodyScrollLock;
