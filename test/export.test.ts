import { describe, expect, it } from 'vitest';
import { exportCrop } from '../src/render/viewer';

describe('PNG export crop (audit #49)', () => {
  it('keeps the tank with a small margin instead of the whole grey stage', () => {
    const c = exportCrop([{ x0: 400, x1: 1000, y0: 100, y1: 700 }], 1400, 850);
    expect(c).toEqual({ x: 364, y: 64, w: 672, h: 672 });
  });
  it('never runs past the canvas, and spans both views when split', () => {
    const c = exportCrop([{ x0: 10, x1: 600, y0: 5, y1: 840 }, { x0: 800, x1: 1390, y0: 5, y1: 840 }], 1400, 850);
    expect(c).toEqual({ x: 0, y: 0, w: 1400, h: 850 });
  });
});
