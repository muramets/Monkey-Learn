import { getScoreColor, getInterpolatedColor, getLevelGradient, getTierColor } from './colorUtils';

describe('getScoreColor', () => {
  it('returns tier-1 for score 0 (level 1)', () => {
    expect(getScoreColor(0)).toBe('var(--tier-1)');
  });

  it('returns tier-1 for score 2 (level 3, boundary)', () => {
    expect(getScoreColor(2)).toBe('var(--tier-1)');
  });

  it('returns tier-2 for score 3 (level 4)', () => {
    expect(getScoreColor(3)).toBe('var(--tier-2)');
  });

  it('returns tier-2 for score 5 (level 6, boundary)', () => {
    expect(getScoreColor(5)).toBe('var(--tier-2)');
  });

  it('returns tier-3 for score 6 (level 7)', () => {
    expect(getScoreColor(6)).toBe('var(--tier-3)');
  });

  it('returns tier-4 for score 9 (level 10)', () => {
    expect(getScoreColor(9)).toBe('var(--tier-4)');
  });

  it('returns tier-5 for score 19 (level 20)', () => {
    expect(getScoreColor(19)).toBe('var(--tier-5)');
  });

  it('returns tier-5 for very high score 50 (level 51)', () => {
    expect(getScoreColor(50)).toBe('var(--tier-5)');
  });

  it('clamps negative score to 0, returning tier-1 (level 1)', () => {
    expect(getScoreColor(-5)).toBe('var(--tier-1)');
  });
});

describe('getInterpolatedColor', () => {
  it('returns tier-1 at first point (level 1)', () => {
    expect(getInterpolatedColor(1)).toBe('var(--tier-1)');
  });

  it('returns tier-1 below first point (level 0.5)', () => {
    expect(getInterpolatedColor(0.5)).toBe('var(--tier-1)');
  });

  it('returns tier-5 at last point (level 30)', () => {
    expect(getInterpolatedColor(30)).toBe('var(--tier-5)');
  });

  it('returns tier-5 above last point (level 50)', () => {
    expect(getInterpolatedColor(50)).toBe('var(--tier-5)');
  });

  it('returns tier-2 at exact center (level 5)', () => {
    expect(getInterpolatedColor(5)).toBe('var(--tier-2)');
  });

  it('returns tier-3 at exact center (level 8)', () => {
    expect(getInterpolatedColor(8)).toBe('var(--tier-3)');
  });

  it('returns tier-4 at exact center (level 14)', () => {
    expect(getInterpolatedColor(14)).toBe('var(--tier-4)');
  });

  it('returns a plain var color inside a same-color plateau (level 2)', () => {
    // Between level 1 and 3.5 both stops are tier-1 — no color-mix needed
    expect(getInterpolatedColor(2)).toBe('var(--tier-1)');
  });

  it('returns a color-mix between tier-2 and tier-3 (level between 6.5 and 8)', () => {
    const color = getInterpolatedColor(7.25);
    expect(color).toMatch(/^color-mix\(in srgb, var\(--tier-2\) \d+%, var\(--tier-3\)\)$/);
  });

  it('blends proportionally: level 7.25 is halfway between 6.5 and 8', () => {
    expect(getInterpolatedColor(7.25)).toBe('color-mix(in srgb, var(--tier-2) 50%, var(--tier-3))');
  });
});

describe('getLevelGradient', () => {
  it('returns a CSS linear-gradient for same start and end level', () => {
    const gradient = getLevelGradient(5, 5);
    expect(gradient).toContain('linear-gradient');
  });

  it('contains both endpoint colors for a small range', () => {
    const gradient = getLevelGradient(5, 5.3);
    // Small range (<0.5) produces "linear-gradient(to right, colorA, colorB)"
    expect(gradient.startsWith('linear-gradient(to right, ')).toBe(true);
    expect(gradient).toContain('var(--tier-2)');
  });

  it('returns multiple stops for a large range', () => {
    const gradient = getLevelGradient(1, 20);
    // Large range produces 6 stops (steps=5, i from 0 to 5)
    const percentMatches = gradient.match(/ \d+(\.\d+)?%/g);
    expect(percentMatches).not.toBeNull();
    expect(percentMatches!.length).toBeGreaterThanOrEqual(6);
  });

  it('returns a valid CSS gradient string format', () => {
    const gradient = getLevelGradient(1, 20);
    expect(gradient).toMatch(/^linear-gradient\(to right, .+\)$/);
  });
});

describe('getTierColor', () => {
  it('returns tier-1 for level 1', () => {
    expect(getTierColor(1)).toBe('var(--tier-1)');
  });

  it('returns tier-1 for level 3 (boundary)', () => {
    expect(getTierColor(3)).toBe('var(--tier-1)');
  });

  it('returns tier-2 for level 4', () => {
    expect(getTierColor(4)).toBe('var(--tier-2)');
  });

  it('returns tier-4 for level 10', () => {
    expect(getTierColor(10)).toBe('var(--tier-4)');
  });

  it('returns tier-5 for level 20', () => {
    expect(getTierColor(20)).toBe('var(--tier-5)');
  });
});
