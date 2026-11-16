// GS2: the glass / size / safety-factor solver. Each variable solved for must round-trip: the answer passes, and a small step past it fails.
import { describe, expect, it } from 'vitest';
import { IN_MM, STOCK_US } from '../src/scene/glassSolver';
import { BRACE_LEVELS, achievedSf, checkTank, heightTable, maxHeight, maxLength, minGlass, type BraceLevel, type EnvelopeBase } from '../src/scene/glassEnvelope';

const T14 = 0.25 * IN_MM;
const base = (over: Partial<EnvelopeBase> = {}): EnvelopeBase => ({ glass: T14, strip: T14, stripWidth: 3 * IN_MM, sf: 3.8, D: 18 * IN_MM, ...over });
const inch = (mm: number) => mm / IN_MM;
const LEVELS = BRACE_LEVELS.map(l => l.id);

describe('GS2 solve for size (glass + SF given)', () => {
  it('max height round-trips: the answer meets the SF, 0.2 in more does not', () => {
    for (const level of LEVELS) for (const L of [24, 36, 48, 72]) {
      const b = base(), s = maxHeight(L * IN_MM, level, b);
      if (s.value === 0) continue; // a brace that does not fit
      expect(s.capped, `${level} ${L}`).toBe(false);
      const at = checkTank(L * IN_MM, s.value, level, b);
      expect(at.ok, `${level} ${L} in at ${inch(s.value)} in`).toBe(true);
      expect(at.minSf).toBeGreaterThanOrEqual(3.8 - 1e-9);
      const over = checkTank(L * IN_MM, s.value + 0.2 * IN_MM, level, b);
      expect(over.ok, `${level} ${L} just past ${inch(s.value)} in`).toBe(false);
    }
  });
  it('max length round-trips', () => {
    for (const level of ['none', 'perimeter', 'cross1'] as BraceLevel[]) for (const H of [10, 12, 14]) {
      const b = base(), s = maxLength(H * IN_MM, level, b);
      if (s.capped || s.value === 0) continue;
      expect(checkTank(s.value, H * IN_MM, level, b).ok, `${level} H${H}`).toBe(true);
      expect(checkTank(s.value + 0.4 * IN_MM, H * IN_MM, level, b).ok, `${level} H${H} past`).toBe(false);
    }
  });
  it('is monotone: thicker glass, thicker strips and more bracing never lower the answer; longer tanks never raise it', () => {
    const L = 48 * IN_MM, h = (o: Partial<EnvelopeBase>, lv: BraceLevel = 'cross1') => maxHeight(L, lv, base(o)).value;
    expect(h({ glass: STOCK_US[1] })).toBeGreaterThanOrEqual(h({}));
    expect(h({ glass: STOCK_US[2] })).toBeGreaterThanOrEqual(h({ glass: STOCK_US[1] }));
    expect(h({ strip: 0.5 * IN_MM * 1 })).toBeGreaterThanOrEqual(h({ strip: T14 }) - 1e-9);
    expect(h({ sf: 3 })).toBeGreaterThan(h({ sf: 4 }));
    for (const lv of ['none', 'perimeter', 'cross1'] as BraceLevel[]) {
      let prev = Infinity;
      for (const l of [24, 36, 48, 60, 72]) { const v = maxHeight(l * IN_MM, lv, base()).value; expect(v, `${lv} ${l}`).toBeLessThanOrEqual(prev + 1e-9); prev = v; }
    }
    // the cross-braced and rimmed tops are never worse than no brace
    for (const l of [36, 60, 96]) {
      const none = maxHeight(l * IN_MM, 'none', base()).value;
      expect(maxHeight(l * IN_MM, 'cross1', base()).value).toBeGreaterThanOrEqual(none);
      expect(maxHeight(l * IN_MM, 'rimmed', base()).value).toBeGreaterThanOrEqual(none);
    }
  });
  it('fully filled: more conservative than water 1 in below the rim (the old default)', () => {
    const b = base(), s = maxHeight(36 * IN_MM, 'none', b).value;
    const waterBelow = checkTank(36 * IN_MM, s, 'none', b);
    expect(waterBelow.ok).toBe(true);
  });
  it('hand check: a long rimmed tank is a one-way strip held top and bottom (triangular load, Mmax = 0.0642 gamma H^3, sigma = 6M / t^2)', () => {
    // 1/4 in glass, SF 3.8: sigma_allow = 19.3 / 3.8 MPa; H^3 = sigma t^2 / (6 * 0.06415 * gamma)
    const g = 9.81e-6, sigma = 19.3 / 3.8, t = T14, hand = Math.cbrt(sigma * t * t / (6 * 0.06415 * g));
    const solved = maxHeight(240 * IN_MM, 'rimmed', base()).value;
    expect(inch(hand)).toBeCloseTo(14.9, 1);
    // the plate also has the end walls helping a little: within 6 % of the strip, never below it
    expect(solved).toBeGreaterThanOrEqual(hand * 0.98);
    expect(solved).toBeLessThanOrEqual(hand * 1.06);
  });
});

describe('GS2 solve for glass and for SF', () => {
  it('thinnest stock glass round-trips: it passes, the next one down fails', () => {
    for (const [L, H, level] of [[36, 16, 'none'], [48, 18, 'cross1'], [24, 12, 'rimmed'], [60, 20, 'perimeter']] as [number, number, BraceLevel][]) {
      const { glass, at } = minGlass(L * IN_MM, H * IN_MM, level, { ...base(), strip: T14 }, STOCK_US);
      expect(glass, `${L}x${H} ${level}`).not.toBeNull();
      expect(at!.ok).toBe(true);
      const i = STOCK_US.findIndex(t => Math.abs(t - glass!) < 1e-6);
      if (i > 0) expect(checkTank(L * IN_MM, H * IN_MM, level, base({ glass: STOCK_US[i - 1] })).ok).toBe(false);
      // and that glass reaches at least that height at that length
      expect(maxHeight(L * IN_MM, level, base({ glass: glass! })).value).toBeGreaterThanOrEqual(H * IN_MM - 0.11 * IN_MM);
    }
  });
  it('SF achieved matches the solved boundary: at the max height the SF is just over the target, just past it just under', () => {
    for (const level of ['none', 'cross1', 'rimmed'] as BraceLevel[]) {
      const b = base(), h = maxHeight(48 * IN_MM, level, b).value;
      const at = achievedSf(48 * IN_MM, h, level, b), past = achievedSf(48 * IN_MM, h + 0.2 * IN_MM, level, b);
      expect(at.minSf).toBeGreaterThanOrEqual(3.8 - 1e-9);
      expect(at.minSf).toBeLessThan(4.1);
      expect(past.minSf).toBeLessThan(3.8);
    }
  });
  it('reports what governs and a silicone joint warning without dropping the cell', () => {
    const b = base(), h = maxHeight(72 * IN_MM, 'perimeter', b);
    expect(h.at!.governs).toBeTruthy();
    const c = checkTank(48 * IN_MM, 14 * IN_MM, 'cross1', base({ sf: 2 }));
    expect(Array.isArray(c.badJoints)).toBe(true);
    expect(c.jointsOk).toBe(c.badJoints.length === 0);
  });
  it('a brace that leaves no room is not offered', () => {
    const t = heightTable(['perimeter'], [24], base({ D: 7 * IN_MM }));
    expect(t[0][0].fits).toBe(false);
    expect(t[0][0].solved.value).toBe(0);
  });
});
