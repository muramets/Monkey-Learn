/**
 * Utility for resolving level/tier colors as CSS color expressions.
 *
 * Colors are theme-derived: `--tier-1..5` are written by
 * `themeManager.applyTheme` from the active theme's tokens
 * (error → main → correct → hue-shifted accents), so every consumer
 * automatically follows theme changes. Returned strings are valid CSS
 * colors (`var(...)` / `color-mix(...)`) — safe for inline styles and
 * gradients, but NOT for canvas APIs that need concrete hex values.
 */

const TIER_COLORS = [
    { maxLevel: 3, color: 'var(--tier-1)' },     // Levels 1-3: theme error (Beginner)
    { maxLevel: 6, color: 'var(--tier-2)' },     // Levels 4-6: theme accent (Intermediate)
    { maxLevel: 9, color: 'var(--tier-3)' },     // Levels 7-9: theme correct (Advanced)
    { maxLevel: 19, color: 'var(--tier-4)' },    // Levels 10-19: accent hue +60° (Master)
    { maxLevel: Infinity, color: 'var(--tier-5)' } // Levels 20+: accent hue +180° (Legend)
];

/**
 * Returns a CSS color based on the Level (derived from score).
 * Infinite scaling with tiers.
 */
export function getScoreColor(score: number): string {
    // Score 0 -> L1, Score 1 -> L2 (matches xpUtils: 0-99 XP is L1)
    const safeScore = Math.max(0, score);
    const level = Math.floor(safeScore) + 1;

    const tier = TIER_COLORS.find(t => level <= t.maxLevel) || TIER_COLORS[TIER_COLORS.length - 1];

    return tier.color;
}

// Helper to blend two CSS colors via color-mix
function mixColors(color1: string, color2: string, factor: number): string {
    if (color1 === color2) return color1;
    const pct = Math.round(factor * 100);
    if (pct <= 0) return color1;
    if (pct >= 100) return color2;
    return `color-mix(in srgb, ${color1} ${100 - pct}%, ${color2})`;
}

/**
 * Returns a smoothly blended CSS color based on fractional level.
 */
export function getInterpolatedColor(level: number): string {
    // Tier boundaries: 1-3 / 4-6 / 7-9 / 10-19 / 20+
    // Use tier centers for smooth transitions
    const points = [
        { level: 1, color: 'var(--tier-1)' },
        { level: 3.5, color: 'var(--tier-1)' },
        { level: 5, color: 'var(--tier-2)' },
        { level: 6.5, color: 'var(--tier-2)' },
        { level: 8, color: 'var(--tier-3)' },
        { level: 9.5, color: 'var(--tier-3)' },
        { level: 14, color: 'var(--tier-4)' },
        { level: 19.5, color: 'var(--tier-4)' },
        { level: 30, color: 'var(--tier-5)' }
    ];

    if (level <= points[0].level) return points[0].color;
    if (level >= points[points.length - 1].level) return points[points.length - 1].color;

    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        if (level >= start.level && level <= end.level) {
            const factor = (level - start.level) / (end.level - start.level);
            return mixColors(start.color, end.color, factor);
        }
    }

    return points[0].color;
}

/**
 * Generates a CSS gradient string for a range of levels.
 */
export function getLevelGradient(startLevel: number, endLevel: number): string {
    // If range is small, just return a simple two-color gradient
    if (Math.abs(endLevel - startLevel) < 0.5) {
        return `linear-gradient(to right, ${getInterpolatedColor(startLevel)}, ${getInterpolatedColor(endLevel)})`;
    }

    // Add intermediate steps for smoothness across tiers
    const stops = [];
    const steps = 5; // Divide the journey into steps
    for (let i = 0; i <= steps; i++) {
        const level = startLevel + (endLevel - startLevel) * (i / steps);
        stops.push(`${getInterpolatedColor(level)} ${(i / steps) * 100}%`);
    }

    return `linear-gradient(to right, ${stops.join(', ')})`;
}

// Keep helper for direct tier access if needed
export function getTierColor(level: number): string {
    const tier = TIER_COLORS.find(t => level <= t.maxLevel) || TIER_COLORS[TIER_COLORS.length - 1];
    return tier.color;
}
