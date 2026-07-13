import { resolveEntityColor, isDefaultEntityColor, DEFAULT_ENTITY_COLOR, THEME_ACCENT_COLOR } from './entityColor';

describe('isDefaultEntityColor', () => {
  it('treats undefined, null and empty string as default', () => {
    expect(isDefaultEntityColor(undefined)).toBe(true);
    expect(isDefaultEntityColor(null)).toBe(true);
    expect(isDefaultEntityColor('')).toBe(true);
  });

  it('treats the legacy serika yellow as default, case-insensitively', () => {
    expect(isDefaultEntityColor(DEFAULT_ENTITY_COLOR)).toBe(true);
    expect(isDefaultEntityColor('#E2B714')).toBe(true);
  });

  it('treats any other color as explicit', () => {
    expect(isDefaultEntityColor('#7fb3d3')).toBe(false);
    expect(isDefaultEntityColor('#ffffff')).toBe(false);
  });
});

describe('resolveEntityColor', () => {
  it('maps missing colors to the theme accent', () => {
    expect(resolveEntityColor(undefined)).toBe(THEME_ACCENT_COLOR);
    expect(resolveEntityColor(null)).toBe(THEME_ACCENT_COLOR);
    expect(resolveEntityColor('')).toBe(THEME_ACCENT_COLOR);
  });

  it('maps the legacy default yellow to the theme accent', () => {
    expect(resolveEntityColor('#e2b714')).toBe(THEME_ACCENT_COLOR);
    expect(resolveEntityColor('#E2B714')).toBe(THEME_ACCENT_COLOR);
  });

  it('passes explicit user picks through unchanged', () => {
    expect(resolveEntityColor('#7fb3d3')).toBe('#7fb3d3');
    expect(resolveEntityColor('#ca4754')).toBe('#ca4754');
  });
});
