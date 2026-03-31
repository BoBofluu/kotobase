import { useState, useEffect, useRef } from 'react';

/**
 * 偵測滾動方向
 * @param {number} threshold - 最小滾動距離才觸發（避免抖動）
 * @returns {'up' | 'down'} 滾動方向
 */
function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState('up');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

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
