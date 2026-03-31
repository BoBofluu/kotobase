import { useState, useEffect, useRef } from 'react';

/**
 * 偵測滾動方向
 * @param {number} threshold - 最小滾動距離才觸發（避免抖動）
 * @returns {'up' | 'down'} 滾動方向
 */
function useScrollDirection(threshold = 10, resetKey = '') {
  const [direction, setDirection] = useState('up');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // 頁面切換時重置為 'up'（顯示 navbar）
  useEffect(() => {
    setDirection('up');
    lastScrollY.current = 0;
  }, [resetKey]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY.current;

        if (Math.abs(diff) >= threshold) {
          setDirection(diff > 0 ? 'down' : 'up');
          lastScrollY.current = currentY;
        }

        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return direction;
}

export default useScrollDirection;
