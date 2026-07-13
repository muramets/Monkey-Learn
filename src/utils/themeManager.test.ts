vi.mock('../styles/allThemes', () => ({
  allThemes: {
    serika_dark: {
      name: 'serika_dark',
      bgColor: '#323437',
      mainColor: '#e2b714',
      subColor: '#646669',
      textColor: '#d1d0c5',
    }
  }
}));

import { hexToRgb, hexToHSL, hslToHex, shiftHue } from './themeManager';

describe('hexToRgb', () => {
  it('returns 255 255 255 for #ffffff (white)', () => {
    expect(hexToRgb('#ffffff')).toBe('255 255 255');
  });

  it('returns 0 0 0 for #000000 (black)', () => {
    expect(hexToRgb('#000000')).toBe('0 0 0');
  });

  it('returns 255 0 0 for #ff0000 (red)', () => {
    expect(hexToRgb('#ff0000')).toBe('255 0 0');
  });

  it('returns 0 255 0 for #00ff00 (green)', () => {
    expect(hexToRgb('#00ff00')).toBe('0 255 0');
  });

  it('returns 0 0 255 for #0000ff (blue)', () => {
    expect(hexToRgb('#0000ff')).toBe('0 0 255');
  });

  it('returns 50 52 55 for #323437 (serika_dark bg)', () => {
    expect(hexToRgb('#323437')).toBe('50 52 55');
  });

  it('returns 226 183 20 for #e2b714 (serika_dark main)', () => {
    expect(hexToRgb('#e2b714')).toBe('226 183 20');
  });
});

describe('hexToHSL', () => {
  it('returns h:0, s:0, l:0 for #000000 (pure black)', () => {
    const result = hexToHSL('#000000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBe(0);
  });

  it('returns h:0, s:0, l:100 for #ffffff (pure white)', () => {
    const result = hexToHSL('#ffffff');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBe(100);
  });

  it('returns h:0, s:100, l:50 for #ff0000 (pure red)', () => {
    const result = hexToHSL('#ff0000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('returns h:120, s:100, l:50 for #00ff00 (pure green)', () => {
    const result = hexToHSL('#00ff00');
    expect(result.h).toBe(120);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('returns h:240, s:100, l:50 for #0000ff (pure blue)', () => {
    const result = hexToHSL('#0000ff');
    expect(result.h).toBe(240);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('handles 4-char short hex #fff correctly', () => {
    const result = hexToHSL('#fff');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBe(100);
  });

  it('returns h:0, s:0, l:~50 for #808080 (mid gray)', () => {
    const result = hexToHSL('#808080');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBeCloseTo(50.2, 1);
  });
});

describe('hslToHex', () => {
  it('round-trips pure red', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('round-trips pure green', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });

  it('round-trips pure blue', () => {
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('round-trips black and white', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('round-trips serika_dark main color within rounding tolerance', () => {
    const { h, s, l } = hexToHSL('#e2b714');
    const back = hexToHSL(hslToHex(h, s, l));
    expect(back.h).toBeCloseTo(h, -1);
    expect(back.s).toBeCloseTo(s, 0);
    expect(back.l).toBeCloseTo(l, 0);
  });
});

describe('shiftHue', () => {
  it('rotates red by 120° to green', () => {
    expect(shiftHue('#ff0000', 120)).toBe('#00ff00');
  });

  it('rotating by 360° is identity for primary colors', () => {
    expect(shiftHue('#ff0000', 360)).toBe('#ff0000');
  });

  it('handles negative rotation', () => {
    expect(shiftHue('#00ff00', -120)).toBe('#ff0000');
  });

  it('preserves saturation and lightness', () => {
    const original = hexToHSL('#e2b714');
    const shifted = hexToHSL(shiftHue('#e2b714', 60));
    expect(shifted.s).toBeCloseTo(original.s, 0);
    expect(shifted.l).toBeCloseTo(original.l, 0);
    expect(shifted.h).toBeCloseTo((original.h + 60) % 360, -1);
  });

  it('keeps grayscale colors gray (no hue to rotate)', () => {
    expect(shiftHue('#808080', 90)).toBe('#808080');
  });
});
