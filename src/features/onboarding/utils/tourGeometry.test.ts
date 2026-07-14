import { placePanel, spotlightRect } from './tourGeometry';

const viewport = { width: 1280, height: 800 };
const panel = { width: 320, height: 170 };

describe('spotlightRect', () => {
  it('expands the target by the padding on every side', () => {
    const r = spotlightRect({ top: 100, left: 200, width: 50, height: 40 }, 8);
    expect(r).toEqual({ top: 92, left: 192, width: 66, height: 56 });
  });
});

describe('placePanel', () => {
  it('prefers the requested side when it fits', () => {
    const target = { top: 100, left: 500, width: 200, height: 60 };
    const pos = placePanel(target, panel, viewport, 'bottom');
    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBeGreaterThan(target.top + target.height);
  });

  it('falls back to another side when the preferred one has no room', () => {
    const target = { top: 700, left: 500, width: 200, height: 80 };
    const pos = placePanel(target, panel, viewport, 'bottom');
    expect(pos.placement).toBe('top');
    expect(pos.top + panel.height).toBeLessThanOrEqual(target.top);
  });

  it('clamps the panel into the viewport horizontally', () => {
    const target = { top: 100, left: 0, width: 40, height: 40 };
    const pos = placePanel(target, panel, viewport, 'bottom');
    expect(pos.left).toBeGreaterThanOrEqual(12);
  });

  it('pins to the bottom edge on tiny viewports', () => {
    const tiny = { width: 340, height: 180 };
    const target = { top: 10, left: 10, width: 300, height: 160 };
    const pos = placePanel(target, panel, tiny, 'bottom');
    expect(pos.top + panel.height).toBeLessThanOrEqual(tiny.height);
    expect(pos.left).toBeGreaterThanOrEqual(12);
  });
});
