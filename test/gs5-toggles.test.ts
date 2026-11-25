// Glass check toggles (Nathan 2026-11-24: "there should simply be a toggle for allowing glass of different thicknesses in the same build, and a
// toggle for bracing (optimized or custom)"), shared by the Glass / Size / Safety factor modes.
import { describe, expect, it } from 'vitest';
import { IN_MM, solveGlass } from '../src/scene/glassSolver';
import { braceFor, checkTank, maxHeight, widestStrip, type EnvelopeBase } from '../src/scene/glassEnvelope';
import { bestBrace, sfPanel, sizeTable, TOGGLES0, type SolveInputs } from '../src/shell/logic/tankEnvelope';
import { defaultChoice, glassPanel } from '../src/shell/logic/tankGlass';
import { diagnose } from '../src/scene/glassDiagnose';

const IN = IN_MM, T14 = 0.25 * IN, T38 = 0.375 * IN, T12 = 0.5 * IN;
const base = (o: Partial<EnvelopeBase> = {}): EnvelopeBase => ({ glass: T14, strip: T14, stripWidth: 3 * IN, sf: 3.8, D: 18 * IN, ...o });
const inp = (o: Partial<SolveInputs> = {}): SolveInputs => ({ glass: T38, strip: T14, stripWidth: 3 * IN, depth: null, ...o });

describe('mixed glass', () => {
  it('solveGlass "fixed" at one thickness is the old one-thickness check', () => {
    const spec = { L: 36 * IN, D: 18 * IN, H: 20 * IN, waterDepth: 20 * IN }, o = { safetyFactor: 0.01, deflection: { thicknessRatio: 1e6 }, continuous: false };
    const a = solveGlass(spec, { ...o, stock: [T38], mode: 'uniform' }), b = solveGlass(spec, { ...o, fixed: { long: T38, end: T38, bottom: T38 } });
    expect(b.panes.front.sf).toBeCloseTo(a.panes.front.sf, 9);
    expect(b.panes.left.sf).toBeCloseTo(a.panes.left.sf, 9);
    expect(b.panes.bottom.thickness).toBe(a.panes.bottom.thickness);
  });
  it('each pane is checked at its own thickness: thicker ends raise only the ends', () => {
    const same = checkTank(48 * IN, 22 * IN, 'none', base({ glass: T38 })), mixed = checkTank(48 * IN, 22 * IN, 'none', base({ glass: T38, glassEnds: T12 }));
    expect(mixed.sf.ends).toBeGreaterThan(same.sf.ends * 1.5);
    expect(mixed.sf.front).toBeCloseTo(same.sf.front, 6);
  });
  it('a thicker bottom on edge support lets the tank grow; a thinner one shrinks it', () => {
    const b = base({ glass: T38, bottom: 'perimeter' }), h = (o: Partial<EnvelopeBase>) => maxHeight(36 * IN, 'none', { ...b, ...o }, { max: 48 * IN }).value;
    expect(h({ glassBottom: T12 })).toBeGreaterThanOrEqual(h({}) - 1e-9);
    expect(h({ glassBottom: T14 })).toBeLessThanOrEqual(h({}) + 1e-9);
  });
  it('the failure view draws each pane at its own thickness', () => {
    const d = diagnose(36 * IN, 18 * IN, 'none', base({ glass: T38, glassEnds: T14, glassBottom: T12 }));
    expect(d.panes.map(p => p.t)).toEqual([T38, T14, T12]);
  });
});

describe('bracing: optimized', () => {
  it('Size uses the strongest strips that fit: as wide as leaves 6 in clear (up to 4 in), in the wall glass', () => {
    expect(widestStrip(36 * IN, 18 * IN, 0)).toBeCloseTo(4 * IN, 6);
    expect(widestStrip(36 * IN, 12 * IN, 0)).toBeCloseTo(3 * IN, 6);
    expect(widestStrip(24 * IN, 18 * IN, 2)).toBeCloseTo(1.5 * IN, 6); // (24 - 18) / 4
    expect(braceFor('perimeter', base({ glass: T38, glassEnds: T12, autoStrips: true }), 36 * IN)).toEqual({ width: 4 * IN, thickness: T12, cross: 0 });
  });
  it('optimized strips never give a smaller tank than the 3 in x 1/4 in default', () => {
    const t0 = sizeTable({ L: 36 * IN }, false, inp(), 3.8, 18 * IN, 'full', 'in', { ...TOGGLES0, bracing: 'custom', brace: { width: 3 * IN, thickness: T14, cross: 0 } });
    const t1 = sizeTable({ L: 36 * IN }, false, inp(), 3.8, 18 * IN, 'full', 'in', TOGGLES0);
    const own = t0.rows[0].cells, per = t1.rows.find(r => r.level === 'perimeter')!.cells;
    own.forEach((c, i) => expect(per[i].H).toBeGreaterThanOrEqual(c.H - 1e-9));
    expect(per.every(c => c.none || (c.brace && c.brace.thickness === T38))).toBe(true);
  });
  it('Safety factor: the least-glass brace that meets the target, or the strongest when none does', () => {
    // 48 x 18 x 22 in: 1/2 in passes with a brace; 3/8 in cannot (the front wall tops out near SF 3.1 however it is braced)
    const T = { L: 48 * IN, D: 18 * IN, H: 22 * IN };
    const ok = bestBrace(T, inp({ glass: T12 }), 3.8, 'full', 'in', false);
    expect(ok.meets).toBe(true);
    expect(ok.brace).not.toBeNull();
    expect(sfPanel(T, false, ok.brace, inp({ glass: T12 }), 3.8, 'full', 'in').ok).toBe(true);
    const t0 = Date.now(), no = bestBrace(T, inp({ glass: T38 }), 3.8, 'full', 'in', false);
    expect(Date.now() - t0).toBeLessThan(3000); // no search when even the strongest brace fails
    expect(no.meets).toBe(false);
    expect(no.line).toMatch(/Strongest that fits: 4 in perimeter/);
  });
  it('Glass mode: optimized takes the optimizer\'s best brace and ignores a leftover custom one', () => {
    const T = { L: 48 * IN, D: 18 * IN, H: 22 * IN } as Parameters<typeof glassPanel>[0];
    const leftover = { width: 2 * IN, thickness: T14, cross: 3 };
    const opt = glassPanel(T, false, { ...defaultChoice(), bracing: 'optimized', custom: leftover }, 'in');
    const cus = glassPanel(T, false, { ...defaultChoice(), bracing: 'custom', custom: leftover }, 'in');
    expect(cus.braceNow).toEqual(leftover);
    expect(opt.braceNow).not.toEqual(leftover);
    expect(opt.braces.find(b => b.on)).toBeTruthy();
  });
});

describe('bracing: custom', () => {
  it('Size: one row for the person\'s brace plus the rimmed reference', () => {
    const brace = { width: 2.5 * IN, thickness: T14, cross: 1 };
    const t = sizeTable({ L: 36 * IN }, false, inp(), 3.8, 18 * IN, 'full', 'in', { mixed: false, bracing: 'custom', brace });
    expect(t.rows.map(r => r.level)).toEqual(['custom', 'rimmed']);
    expect(t.rows[0].label).toBe('2.5 in perimeter + 1 cross, 1/4 in strips');
    expect(t.rows[0].cells.every(c => c.none || c.brace === brace)).toBe(true);
  });
  it('Safety factor with a custom brace is the same check as that brace level', () => {
    const T = { L: 36 * IN, D: 18 * IN, H: 20 * IN }, brace = { width: 3 * IN, thickness: T14, cross: 0 };
    const p = sfPanel(T, false, brace, inp({ glass: T14 }), 3.8, 'full', 'in');
    const c = checkTank(T.L, T.H, 'perimeter', base({ glass: T14, strip: T14, stripWidth: 3 * IN }));
    expect(p.min).toBe(c.minSf.toFixed(1));
  });
});
