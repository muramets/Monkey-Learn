export type Theme = {
    name: string;
    bgColor: string;
    mainColor: string;
    subColor: string;
    textColor: string;
    // Optional overrides
    subAltColor?: string;
    caretColor?: string;
    errorColor?: string;
    errorExtraColor?: string;
    colorfulErrorColor?: string;
    colorfulErrorExtraColor?: string;
    correctColor?: string;
};

const STORAGE_KEY = 'theme';
const DEFAULT_THEME = 'serika_dark';

let _allThemes: Record<string, Theme> | null = null;

export async function getAllThemes(): Promise<Record<string, Theme>> {
    if (!_allThemes) {
        const module = await import('../styles/allThemes');
        _allThemes = module.allThemes;
    }
    return _allThemes;
}

// Helper to convert hex to rgb
export function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
}

// Helper to convert hex to HSL for sorting (Match MonkeyType implementation)
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
    let r = 0, g = 0, b = 0;

    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 5) { // Assuming #RGBA, but only RGB used for HSL
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    } else if (hex.length === 9) { // Assuming #RRGGBBAA, but only RGB used for HSL
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;

    let h = 0;
    let s = 0;
    let l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    // Convert to 0-100 range with 1 decimal precision as per MonkeyType
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
}

// Helper to convert HSL (h: 0-360, s/l: 0-100) back to hex
export function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Rotates the hue of a hex color, preserving saturation and lightness.
// Used to derive theme-harmonized accent variants (tier ladder, chart series).
export function shiftHue(hex: string, degrees: number): string {
    const { h, s, l } = hexToHSL(hex);
    const shifted = ((h + degrees) % 360 + 360) % 360;
    return hslToHex(shifted, s, l);
}

export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    const setVar = (name: string, value: string) => {
        root.style.setProperty(`--${name}`, value);
        const rgb = hexToRgb(value);
        if (rgb) {
            root.style.setProperty(`--${name}-rgb`, rgb);
        }
    };

    // 1. Set Base Colors
    setVar('bg-color', theme.bgColor);
    setVar('main-color', theme.mainColor);
    setVar('sub-color', theme.subColor);
    setVar('text-color', theme.textColor);

    // 2. Set Derived/Optional Colors
    setVar('caret-color', theme.caretColor || theme.mainColor);
    setVar('sub-alt-color', theme.subAltColor || theme.bgColor);

    // Default error colors if not provided
    const errorColor = theme.errorColor || '#ca4754';
    const correctColor = theme.correctColor || '#98c379';
    setVar('error-color', errorColor);
    setVar('error-extra-color', theme.errorExtraColor || '#7e2a33');
    setVar('colorful-error-color', theme.colorfulErrorColor || '#ca4754');
    setVar('colorful-error-extra-color', theme.colorfulErrorExtraColor || '#7e2a33');
    setVar('correct-color', correctColor);

    // Derived tier ladder (level colors) — semantic theme tokens for the low
    // tiers, hue-rotated accents for the high ones, so progression colors
    // always harmonize with the active theme instead of a static palette.
    setVar('tier-1', errorColor);
    setVar('tier-2', theme.mainColor);
    setVar('tier-3', correctColor);
    setVar('tier-4', shiftHue(theme.mainColor, 60));
    setVar('tier-5', shiftHue(theme.mainColor, 180));

    // 3. Update Meta Theme Color for Mobile Browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme.bgColor);
    }
};

export const setTheme = async (themeName: string) => {
    const themes = await getAllThemes();
    const theme = themes[themeName];
    if (theme) {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, themeName);
    } else {
        console.warn(`Theme ${themeName} not found.`);
    }
};

export const initTheme = async () => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    // Determine theme: Saved -> Default -> 'serika_dark' as generic fallback
    const themeName = savedTheme || DEFAULT_THEME;
    await setTheme(themeName);
    return themeName;
};

export const getCurrentTheme = (): string => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
};

const FAV_STORAGE_KEY = 'favThemes';

export const getFavorites = (): string[] => {
    try {
        const stored = localStorage.getItem(FAV_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const toggleFavorite = (themeName: string): string[] => {
    const favs = getFavorites();
    const index = favs.indexOf(themeName);
    let newFavs;
    if (index === -1) {
        newFavs = [...favs, themeName];
    } else {
        newFavs = favs.filter((t) => t !== themeName);
    }
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(newFavs));
    return newFavs;
};

export const isThemeFavorite = (themeName: string): boolean => {
    return getFavorites().includes(themeName);
};

