import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PAGE_ORDER } from '../constants/navigation';

const MIN_SWIPE_DISTANCE = 50;
const MAX_VERTICAL_DISTANCE = 50;

export const useSwipeNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Skip if touch target is inside a no-swipe zone (DnD lists, editors)
            const target = e.target as HTMLElement;
            if (target.closest('[data-no-swipe]')) return;

            touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStart.current) return;

            const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
            const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

            touchStart.current = null;

            if (Math.abs(deltaY) > MAX_VERTICAL_DISTANCE) return;
            if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE) return;

            const currentIndex = PAGE_ORDER.indexOf(location.pathname);
            if (currentIndex === -1) return;

            if (deltaX < 0 && currentIndex < PAGE_ORDER.length - 1) {
                navigate(PAGE_ORDER[currentIndex + 1]);
            } else if (deltaX > 0 && currentIndex > 0) {
                navigate(PAGE_ORDER[currentIndex - 1]);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [navigate, location.pathname]);
};
