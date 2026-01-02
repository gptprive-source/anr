import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeNavigationOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeNavigation = (options: SwipeNavigationOptions = {}) => {
  const { 
    onSwipeRight, 
    onSwipeLeft, 
    threshold = 100,
    enabled = true 
  } = options;
  
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only trigger if horizontal swipe is greater than vertical (avoid triggering on scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right - go back
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left - go forward
          onSwipeLeft();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onSwipeRight, onSwipeLeft, threshold, navigate]);
};
