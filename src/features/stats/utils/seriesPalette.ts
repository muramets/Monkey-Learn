/**
 * Per-innerface line colours for the stats charts. Respects the innerface's
 * explicit `color` override (set via the in-app ColorPicker) when present;
 * otherwise assigns a stable hue derived from the active theme's accent.
 *
 * Chart.js consumes concrete colour strings (no CSS `var()`), so the palette
 * is computed in JS from the theme's main colour: the accent keeps the "hero"
 * slot and every following slot is a hue rotation of it — distinct enough to
 * tell apart at a glance, yet always harmonised with the current theme.
 */

import type { Innerface } from '../../innerfaces/types';
import { shiftHue } from '../../../utils/themeManager';
import { isDefaultEntityColor } from '../../../utils/entityColor';

// Hue offsets from the theme accent; ordered so adjacent series contrast strongly.
const HUE_OFFSETS = [0, 210, 120, 300, 60, 255, 165, 30] as const;

export function buildStatsPalette(mainColor: string): string[] {
    return HUE_OFFSETS.map((offset) => (offset === 0 ? mainColor : shiftHue(mainColor, offset)));
}

export function colorForSeries(innerface: Innerface, index: number, mainColor: string): string {
    // Legacy default (#e2b714) follows the theme accent instead of staying yellow.
    if (innerface.color && !isDefaultEntityColor(innerface.color)) return innerface.color;
    const palette = buildStatsPalette(mainColor);
    return palette[index % palette.length];
}
