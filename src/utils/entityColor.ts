/**
 * Resolves user-assigned entity colors (protocols, innerfaces, states,
 * groups, teams, personalities) into CSS colors that respect the active
 * theme.
 *
 * Historically every entity defaulted to serika_dark's accent (#e2b714),
 * which was stored in Firestore as a literal hex — so "default" entities
 * stayed yellow in every theme. We keep that hex as the stored default
 * (data model unchanged) but render it — and any missing color — as the
 * theme accent. Deliberately picked non-default colors pass through as-is.
 */

/** Stored default entity color (serika_dark accent). Kept for data compatibility. */
export const DEFAULT_ENTITY_COLOR = '#e2b714';

/** The CSS expression the default resolves to at render time. */
export const THEME_ACCENT_COLOR = 'var(--main-color)';

/** True when the stored color is the legacy default that should follow the theme. */
export function isDefaultEntityColor(color?: string | null): boolean {
    if (!color) return true;
    const normalized = color.toLowerCase().replace(/\s+/g, '');
    // Some documents were saved with the literal CSS expression as the color
    // (old skill-form default) — canvas contexts can't parse it, so treat it
    // as "default" and let callers substitute a concrete theme color.
    return normalized === DEFAULT_ENTITY_COLOR || normalized === THEME_ACCENT_COLOR;
}

/**
 * Returns a CSS color for an entity: the user's explicit pick, or the theme
 * accent when the color is missing / the legacy default. Output is a CSS
 * expression (may be `var(...)`) — not suitable for canvas APIs.
 */
export function resolveEntityColor(color?: string | null): string {
    return isDefaultEntityColor(color) ? THEME_ACCENT_COLOR : (color as string);
}
