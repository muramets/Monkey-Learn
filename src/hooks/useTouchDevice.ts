/**
 * Touch device detection singleton.
 * Computed once at module load — no per-component state or listeners.
 * `pointer: coarse` media query doesn't change on resize.
 */
const IS_TOUCH = typeof window !== 'undefined' && (
    window.matchMedia('(pointer: coarse)').matches
    || 'ontouchstart' in window
    || navigator.maxTouchPoints > 0
);

export const useTouchDevice = () => IS_TOUCH;
