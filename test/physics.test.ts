import { describe, expect, it } from 'vitest';
import { kelvinRGB } from '../src/render/lighting';
import { IN, floorY, fmtDims, glassThickness, mapToTank, rescaleTankA, substrateHeight, tankUnderside, volume } from '../src/scene/physics';
import { defaultScene } from '../src/scene/defaults';

describe('glass thickness', () => {
  const t = (hIn: number) => glassThickness({ L: 600, H: hIn * IN, D: 300 }, 'auto');
  it('follows the height table', () => {
    expect([t(12), t(13), t(16), t(18), t(24), t(30), t(31)]).toEqual([5, 5, 6, 8, 10, 12, 15]);
  });
  it('respects an explicit choice', () => expect(glassThickness({ L: 1, H: 1, D: 1 }, 19)).toBe(19));
});

describe('substrate', () => {
  const T = { L: 600, H: 300, D: 300 };
  const s = { show: true, type: 'gravel' as const, fl: 10, fr: 20, bl: 30, br: 40 };
  it('hits the four corners and blends bilinearly', () => {
    expect(substrateHeight(s, T, 0, 0)).toBe(10);
    expect(substrateHeight(s, T, 600, 0)).toBe(20);
    expect(substrateHeight(s, T, 0, 300)).toBe(30);
    expect(substrateHeight(s, T, 600, 300)).toBe(40);
    expect(substrateHeight(s, T, 300, 150)).toBe(25);
  });
  it('is zero when hidden and capped at 60 % of height', () => {
    expect(substrateHeight({ ...s, show: false }, T, 0, 0)).toBe(0);
    expect(substrateHeight({ ...s, fl: 999 }, T, 0, 0)).toBe(180);
  });
});

describe('tanks', () => {
  it('maps positions relatively between tanks', () => {
    const p = mapToTank({ L: 600, H: 300, D: 300 }, { L: 1200, H: 300, D: 600 }, { x: 150, y: 100, depth: 150 });
    expect(p).toEqual({ x: 300, y: 100, depth: 300 });
  });
  it('rescaling Tank A keeps fish at the same relative spot', () => {
    const s = defaultScene(), f = s.fish[0], rx = f.x / s.tankA.L, rd = f.depth / s.tankA.D;
    rescaleTankA(s, { L: 48 * IN, H: 21 * IN, D: 18 * IN });
    expect(f.x / s.tankA.L).toBeCloseTo(rx, 9); expect(f.depth / s.tankA.D).toBeCloseTo(rd, 9);
  });
  it('a 48x21x13 in tank is about 57 US gallons interior', () => {
    expect(volume({ L: 48 * IN, H: 21 * IN, D: 13 * IN }).gallons).toBeCloseTo(56.7, 1);
  });
  it('formats dimensions', () => expect(fmtDims({ L: 24 * IN, H: 12 * IN, D: 12 * IN }, 'in')).toBe('24 × 12 × 12″ (L×H×D)'));
});

describe('stand and floor', () => {
  const T = { L: 24 * IN, H: 12 * IN, D: 12 * IN }, R = defaultScene().render; // 12 in tall -> 5 mm glass, rimmed
  it('stand top is the tank underside; floor is a stand-height below it', () => {
    expect(tankUnderside(T, R)).toBe(-7);
    expect(tankUnderside(T, { ...R, rim: false })).toBe(-5);
    expect(floorY(T, R, { show: true, height: 30 * IN, finish: 'black' })).toBeCloseTo(-7 - 762, 6);
    expect(floorY(T, R, { show: false, height: 30 * IN, finish: 'black' })).toBe(-7);
  });
});

describe('colour temperature', () => {
  it('is scaled to unit luminance', () => {
    for (const K of [2700, 6500, 14000]) {
      const [r, g, b] = kelvinRGB(K);
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(1, 6);
    }
  });
  it('warm is redder than cool', () => { expect(kelvinRGB(2700)[0]).toBeGreaterThan(kelvinRGB(14000)[0]); });
});
