import { buildStatsPalette, colorForSeries } from './seriesPalette';
import type { Innerface } from '../../innerfaces/types';

const MAIN = '#e2b714';

function iface(color?: string): Innerface {
  return { id: '1', name: 'Focus', color } as Innerface;
}

describe('buildStatsPalette', () => {
  it('keeps the theme accent in the hero slot', () => {
    expect(buildStatsPalette(MAIN)[0]).toBe(MAIN);
  });

  it('produces 8 distinct colors for a saturated accent', () => {
    const palette = buildStatsPalette(MAIN);
    expect(new Set(palette).size).toBe(8);
  });
});

describe('colorForSeries', () => {
  it('respects an explicit innerface color', () => {
    expect(colorForSeries(iface('#7fb3d3'), 0, MAIN)).toBe('#7fb3d3');
  });

  it('assigns theme-derived slots for missing colors', () => {
    const palette = buildStatsPalette(MAIN);
    expect(colorForSeries(iface(), 0, MAIN)).toBe(palette[0]);
    expect(colorForSeries(iface(), 3, MAIN)).toBe(palette[3]);
  });

  it('treats the legacy default yellow as themed, not as an explicit pick', () => {
    const palette = buildStatsPalette(MAIN);
    expect(colorForSeries(iface('#e2b714'), 2, MAIN)).toBe(palette[2]);
  });

  it('wraps around the palette for high indices', () => {
    const palette = buildStatsPalette(MAIN);
    expect(colorForSeries(iface(), 9, MAIN)).toBe(palette[1]);
  });
});
