import { getScoreColor, getInterpolatedColor, getLevelGradient, getTierColor } from './colorUtils';

describe('getScoreColor', () => {
  it('returns red for score 0 (level 1)', () => {
    expect(getScoreColor(0)).toBe('#CA4754');
  });

  it('returns red for score 2 (level 3, boundary)', () => {
    expect(getScoreColor(2)).toBe('#CA4754');
  });

  it('returns gold for score 3 (level 4)', () => {
    expect(getScoreColor(3)).toBe('#E2B714');
  });

  it('returns gold for score 5 (level 6, boundary)', () => {
    expect(getScoreColor(5)).toBe('#E2B714');
  });

  it('returns green for score 6 (level 7)', () => {
    expect(getScoreColor(6)).toBe('#98C379');
  });

  it('returns purple for score 9 (level 10)', () => {
    expect(getScoreColor(9)).toBe('#C678DD');
  });

  it('returns blue for score 19 (level 20)', () => {
    expect(getScoreColor(19)).toBe('#61AFEF');
  });

  it('returns blue for very high score 50 (level 51)', () => {
    expect(getScoreColor(50)).toBe('#61AFEF');
  });

  it('clamps negative score to 0, returning red (level 1)', () => {
    expect(getScoreColor(-5)).toBe('#CA4754');
  });
});

describe('getInterpolatedColor', () => {
  it('returns red at first point (level 1)', () => {
    expect(getInterpolatedColor(1)).toBe('#CA4754');
  });

  it('returns red below first point (level 0.5)', () => {
    expect(getInterpolatedColor(0.5)).toBe('#CA4754');
  });

  it('returns blue at last point (level 30)', () => {
    expect(getInterpolatedColor(30)).toBe('#61AFEF');
  });

  it('returns blue above last point (level 50)', () => {
    expect(getInterpolatedColor(50)).toBe('#61AFEF');
  });

  it('returns gold at exact center (level 5)', () => {
    expect(getInterpolatedColor(5).toUpperCase()).toBe('#E2B714');
  });

  it('returns green at exact center (level 8)', () => {
    expect(getInterpolatedColor(8).toUpperCase()).toBe('#98C379');
  });

  it('returns purple at exact center (level 14)', () => {
    expect(getInterpolatedColor(14).toUpperCase()).toBe('#C678DD');
  });

  it('returns a valid hex color between gold and green (level between 5 and 6.5)', () => {
    const color = getInterpolatedColor(5.75);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('getLevelGradient', () => {
  it('returns a CSS linear-gradient for same start and end level', () => {
    const gradient = getLevelGradient(5, 5);
    expect(gradient).toContain('linear-gradient');
  });

  it('returns a simple 2-stop gradient for small range', () => {
    const gradient = getLevelGradient(5, 5.3);
    // Small range (<0.5) produces "linear-gradient(to right, colorA, colorB)"
    // which has exactly 2 color stops separated by a comma inside the parentheses
    const insideParens = gradient.replace('linear-gradient(to right, ', '').replace(')', '');
    const stops = insideParens.split(', ');
    expect(stops).toHaveLength(2);
  });

  it('returns multiple stops for a large range', () => {
    const gradient = getLevelGradient(1, 20);
    // Large range produces 6 stops (steps=5, i from 0 to 5)
    const insideParens = gradient.replace('linear-gradient(to right, ', '').replace(')', '');
    // Each stop contains a percentage like "0%", "20%", etc.
    const percentMatches = insideParens.match(/\d+%/g);
    expect(percentMatches).not.toBeNull();
    expect(percentMatches!.length).toBeGreaterThanOrEqual(6);
  });

  it('returns a valid CSS gradient string format', () => {
    const gradient = getLevelGradient(1, 20);
    expect(gradient).toMatch(/^linear-gradient\(to right, .+\)$/);
  });
});

describe('getTierColor', () => {
  it('returns red for level 1', () => {
    expect(getTierColor(1)).toBe('#CA4754');
  });

  it('returns red for level 3 (boundary)', () => {
    expect(getTierColor(3)).toBe('#CA4754');
  });

  it('returns gold for level 4', () => {
    expect(getTierColor(4)).toBe('#E2B714');
  });

  it('returns purple for level 10', () => {
    expect(getTierColor(10)).toBe('#C678DD');
  });

  it('returns blue for level 20', () => {
    expect(getTierColor(20)).toBe('#61AFEF');
  });
});
