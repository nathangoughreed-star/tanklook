// GS4 (R110): where the glass fails and the deflection view: the diagnosis uses the solver's own numbers (no new physics).
import { describe, expect, it } from 'vitest';
import { GAMMA_FRESH, IN_MM, plate } from '../src/scene/glassSolver';
import { checkTank, type BraceLevel, type EnvelopeBase } from '../src/scene/glassEnvelope';
import { deflText, diagnose, exaggeration, toneOf, verdictText } from '../src/scene/glassDiagnose';

const T14 = 0.25 * IN_MM;
const base = (o: Partial<EnvelopeBase> = {}): EnvelopeBase => ({ glass: T14, strip: T14, stripWidth: 3 * IN_MM, sf: 3.8, D: 18 * IN_MM, ...o });
const CASES: [number, number, BraceLevel, Partial<EnvelopeBase>][] = [
  [36, 16, 'none', {}], [36, 12, 'none', {}], [48, 14, 'perimeter', {}], [72, 15, 'cross1', {}], [48, 20, 'rimmed', {}], [30, 24, 'none', { glass: 0.375 * IN_MM }], [48, 16, 'none', { bottom: 'perimeter' }],
];

describe('GS4 diagnosis matches the solver', () => {
  it('the governing member is the one with the lowest safety factor, and equals checkTank minSf', () => {
    for (const [L, H, lv, o] of CASES) {
      const b = base(o), d = diagnose(L * IN_MM, H * IN_MM, lv, b), c = checkTank(L * IN_MM, H * IN_MM, lv, b);
      expect(d.governing.sf, `${L}x${H} ${lv}`).toBeCloseTo(c.minSf, 9);
      expect(d.governing.member === 'ends' ? 'ends' : d.governing.member, `${L}x${H} ${lv}`).toBe(c.governs === 'deflection' ? d.governing.member : c.governs);
      expect(d.ok).toBe(c.ok);
    }
  });
  it('the labelled deflection equals the solver value, and the limit is the solver criterion (1 x the glass)', () => {
    for (const [L, H, lv, o] of CASES) {
      const b = base(o), d = diagnose(L * IN_MM, H * IN_MM, lv, b), c = checkTank(L * IN_MM, H * IN_MM, lv, b);
      expect(d.panes[0].w).toBeCloseTo(c.solution.panes.front.deflection, 9);
      expect(d.panes[1].w).toBeCloseTo(c.solution.panes.left.deflection, 9);
      expect(d.panes[0].wLimit).toBeCloseTo(b.glass, 9);
      expect(d.usage.deflection).toBeCloseTo(Math.max(d.panes[0].w, d.panes[1].w) / b.glass, 9);
      expect(d.panes[0].sf).toBeCloseTo(c.sf.front, 9);
    }
  });
  it('asking for the grid does not change the plate result, and the grid holds the same extremes', () => {
    const inp = { a: 36 * IN_MM, b: 16 * IN_MM, t: T14, load: { kind: 'hydro' as const, gamma: GAMMA_FRESH, h: 16 * IN_MM }, top: { kind: 'edge' as const, EI: 0 }, terms: 61, grid: [33, 25] as [number, number] };
    const a = plate(inp), b = plate({ ...inp, field: true });
    expect(b.sigma).toBe(a.sigma); expect(b.w).toBe(a.w); expect(b.at).toEqual(a.at);
    const g = b.grid!;
    expect(g.w.length).toBe(25); expect(g.w[0].length).toBe(33);
    expect(Math.max(...g.sigma.flat())).toBeCloseTo(a.sigma, 9);
    expect(Math.max(...g.w.flat().map(Math.abs))).toBeCloseTo(a.w, 9);
    expect(g.w[0][0]).toBeCloseTo(0, 9); // simply supported corner
  });
  it('where it fails (the solver peak): a rimless short wall peaks on its free top edge at mid-span; a held top peaks low and mid-span; always on the pane', () => {
    const free = diagnose(36 * IN_MM, 16 * IN_MM, 'none', base()).panes[0], held = diagnose(48 * IN_MM, 16 * IN_MM, 'rimmed', base()).panes[0];
    expect(free.at.y).toBeGreaterThan(0.95 * free.b); expect(Math.abs(free.at.x - free.a / 2)).toBeLessThan(0.1 * free.a);
    expect(held.at.y).toBeLessThan(0.5 * held.b); expect(Math.abs(held.at.x - held.a / 2)).toBeLessThan(0.1 * held.a);
    for (const [L, H, lv, o] of CASES) for (const p of diagnose(L * IN_MM, H * IN_MM, lv, base(o)).panes) { expect(p.at.x).toBeGreaterThanOrEqual(0); expect(p.at.x).toBeLessThanOrEqual(p.a + 1e-6); expect(p.at.y).toBeGreaterThanOrEqual(0); expect(p.at.y).toBeLessThanOrEqual(p.b + 1e-6); }
  });
});

describe('GS4 units, tones, scale and words', () => {
  it('true deflection converts: inches to 3 decimals, millimetres to 2', () => {
    expect(deflText(25.4, 'in')).toBe('1.000 in'); expect(deflText(1.3208, 'in')).toBe('0.052 in'); expect(deflText(1.3208, 'cm')).toBe('1.32 mm'); expect(deflText(0, 'in')).toBe('0.000 in');
    const d = diagnose(36 * IN_MM, 14 * IN_MM, 'none', base());
    expect(deflText(d.panes[0].w, 'in')).toBe(`${(d.panes[0].w / 25.4).toFixed(3)} in`);
    expect(Number(deflText(d.panes[0].w, 'cm').replace(' mm', ''))).toBeCloseTo(d.panes[0].w, 2);
  });
  it('tones: green with 25 % to spare, amber when it passes with less, red when it fails', () => {
    expect(toneOf(5, 3.8)).toBe('ok'); expect(toneOf(4.0, 3.8)).toBe('near'); expect(toneOf(3.8, 3.8)).toBe('near'); expect(toneOf(3.7, 3.8)).toBe('bad');
  });
  it('the exaggeration is a round factor that makes the deepest point a fraction of the pane height', () => {
    for (const [w, h] of [[1.3, 400], [0.05, 400], [6, 500]]) { const n = exaggeration(w, h); expect([1, 2, 5].includes(n / 10 ** Math.floor(Math.log10(n)))).toBe(true); expect(n * w).toBeLessThan(0.3 * h); expect(n * w).toBeGreaterThan(0.04 * h); }
    expect(exaggeration(0, 400)).toBe(1);
  });
  it('the words name the governing member, the check, the needed SF and both units of deflection', () => {
    const bad = diagnose(36 * IN_MM, 16 * IN_MM, 'none', base()), ok = diagnose(36 * IN_MM, 10 * IN_MM, 'none', base());
    expect(bad.ok).toBe(false); expect(ok.ok).toBe(true);
    expect(verdictText(bad, 'in')).toMatch(/^Fails\. Strength governs: Front and back: safety factor [\d.]+ against 3\.8 needed/);
    expect(verdictText(bad, 'in')).toMatch(/in against 0\.250 in allowed/);
    expect(verdictText(bad, 'cm')).toMatch(/mm against 6\.35 mm allowed/);
    expect(verdictText(ok, 'in')).toMatch(/^Passes\./);
  });
});
