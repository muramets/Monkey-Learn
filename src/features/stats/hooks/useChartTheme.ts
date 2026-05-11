import { useEffect, useState } from 'react';

/**
 * Resolves the MonkeyType-derived CSS theme variables into concrete hex
 * strings that Chart.js can consume directly. Subscribes to theme changes
 * via a MutationObserver on `:root` — whenever `themeManager` rewrites
 * `--bg-color` et al, charts receive a fresh palette and re-render.
 *
 * Matches the `themeManager.applyTheme` contract (see utils/themeManager.ts):
 * each token is written both as `--<name>` (raw css colour) and
 * `--<name>-rgb` (comma-separated RGB), so components can compose rgba()
 * strings via `rgb(var(--main-color-rgb) / 0.5)` if needed.
 */
export interface ChartTheme {
    bg: string;
    subAlt: string;
    sub: string;
    text: string;
    main: string;
    mainRgb: string;
    subRgb: string;
    subAltRgb: string;
    textRgb: string;
    error: string;
    correct: string;
}

function readCssVar(name: string): string {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readPalette(): ChartTheme {
    return {
        bg: readCssVar('--bg-color') || '#323437',
        subAlt: readCssVar('--sub-alt-color') || '#2c2e31',
        sub: readCssVar('--sub-color') || '#646669',
        text: readCssVar('--text-color') || '#d1d0c5',
        main: readCssVar('--main-color') || '#e2b714',
        mainRgb: readCssVar('--main-color-rgb') || '226, 183, 20',
        subRgb: readCssVar('--sub-color-rgb') || '100, 102, 105',
        subAltRgb: readCssVar('--sub-alt-color-rgb') || '44, 46, 49',
        textRgb: readCssVar('--text-color-rgb') || '209, 208, 197',
        error: readCssVar('--error-color') || '#ca4754',
        correct: readCssVar('--correct-color') || '#98c379',
    };
}

/**
 * Builds an rgba() string from the triple `themeManager` emits. The manager
 * writes values in modern CSS space-separated form (`226 183 20`), while
 * Chart.js still requires comma-separated `rgba(r, g, b, a)`. Normalise on
 * the way out so every caller stays ergonomic.
 */
export function withAlpha(rgbTriple: string, alpha: number): string {
    const normalised = rgbTriple.trim().replace(/\s+/g, ', ');
    return `rgba(${normalised}, ${alpha})`;
}

export function useChartTheme(): ChartTheme {
    const [theme, setTheme] = useState<ChartTheme>(() => readPalette());

    useEffect(() => {
        const root = document.documentElement;
        const refresh = () => setTheme(readPalette());

        // The style attribute rewrites every time themeManager swaps themes.
        // Observing just that attribute keeps the observer scope minimal and
        // cheap — no subtree, no attribute list filter needed.
        const observer = new MutationObserver(refresh);
        observer.observe(root, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    return theme;
}
