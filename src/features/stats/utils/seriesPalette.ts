/**
 * Per-innerface line colours for the stats charts. Respects the innerface's
 * explicit `color` override (set via the in-app ColorPicker) when present;
 * otherwise assigns a stable hue from a curated 8-colour palette.
 *
 * The palette is a subset of `PRESET_COLORS` picked specifically for
 * legibility against `serika_dark` without clashing with `--main-color`
 * (the accent yellow stays the "hero" slot but every hue after it is
 * distinct enough to tell apart at a glance).
 */

import type { Innerface } from '../../innerfaces/types';

const STATS_PALETTE = [
    '#e2b714', // Yellow (main)
    '#7fb3d3', // Blue
    '#98c379', // Green
    '#c678dd', // Purple
    '#e6934a', // Orange
    '#56b6c2', // Cyan
    '#e06c75', // Light Red
    '#d19a66', // Light Orange
] as const;

export function colorForSeries(innerface: Innerface, index: number): string {
    if (innerface.color) return innerface.color;
    return STATS_PALETTE[index % STATS_PALETTE.length];
}
