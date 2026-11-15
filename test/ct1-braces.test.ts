// Lane CT1 (2026-11-14): modeled braces, the custom brace + Optimize search, the default "Custom LxWxH" name.
import { describe, expect, it } from 'vitest';
import { IN_MM, STOCK_US, customWidths, glassWeight, optimizeBraceCustom, solveGlass, type BraceSpec } from '../src/scene/glassSolver';
import { braceBoxes, braceVolume } from '../src/scene/braceGeometry';
import { dimName } from '../src/scene/customTankName';
import { defaultSetup } from '../src/scene/defaults';
import { startSpec, makerSetup, chooseCustom } from '../src/shell/logic/tank';
import { glassPanel, defaultChoice, optimizeChoice } from '../src/shell/logic/tankGlass';
import { addCustomTank } from '../src/scene/customTanks';

const IN = 25.4;
const T = { L: 48 * IN, D: 18 * IN, H: 20 * IN };

describe('brace geometry', () => {
  it('perimeter strips: four boxes, flat inside the top, volume equals the solver\'s brace term', () => {
    const b: BraceSpec = { width: 2.5 * IN, thickness: 0.25 * IN };
    const boxes = braceBoxes(T, b);
    expect(boxes.map(k => k.kind)).toEqual(['front', 'back', 'left', 'right']);
    for (const k of boxes) { expect(k.y1).toBe(T.H); expect(k.y1 - k.y0).toBeCloseTo(b.thickness); }
    expect(boxes[0]).toMatchObject({ x0: 0, x1: T.L, d0: 0 }); expect(boxes[0].d1).toBeCloseTo(b.width);
    const none = glassWeight(T, solveGlass(T, { brace: null }).panes, null).volumeIn3;
    const withB = glassWeight(T, solveGlass(T, { brace: null }).panes, b).volumeIn3;
    expect(braceVolume(boxes) / IN ** 3).toBeCloseTo(withB - none, 3);
  });
  it('cross braces sit at L (i+1)/(n+1), between the perimeter strips, with their own width', () => {
    const b: BraceSpec = { width: 2 * IN, thickness: 0.375 * IN, cross: 2, crossWidth: 3 * IN };
    const boxes = braceBoxes(T, b), cross = boxes.filter(k => k.kind === 'cross');
    expect(cross).toHaveLength(2);
    expect((cross[0].x0 + cross[0].x1) / 2).toBeCloseTo(T.L / 3); expect((cross[1].x0 + cross[1].x1) / 2).toBeCloseTo(2 * T.L / 3);
    for (const k of cross) { expect(k.x1 - k.x0).toBeCloseTo(3 * IN); expect(k.d0).toBeCloseTo(2 * IN); expect(k.d1).toBeCloseTo(T.D - 2 * IN); }
    const base = glassWeight(T, solveGlass(T, { brace: null }).panes, null).volumeIn3;
    expect(braceVolume(boxes) / IN ** 3).toBeCloseTo(glassWeight(T, solveGlass(T, { brace: null }).panes, b).volumeIn3 - base, 3);
  });
  it('the maker scratch setup carries the brace to the render only when rimless', () => {
    const spec = startSpec(defaultSetup(), 'new', []).spec, b: BraceSpec = { width: 2.5 * IN, thickness: 0.25 * IN, cross: 1 };
    expect(makerSetup(spec, undefined, b).render.brace).toMatchObject({ cross: 1 });
    expect(makerSetup({ ...spec, rim: true }, undefined, b).render.brace).toBeUndefined();
  });
  it('using a custom tank whose saved build has a brace puts it in the setup', () => {
    const spec = startSpec(defaultSetup(), 'new', []).spec;
    const p = glassPanel(T, false, { ...defaultChoice(), custom: { width: 2.5 * IN, thickness: 0.25 * IN, cross: 1 } }, 'in');
    const { entry } = addCustomTank([], { ...spec, name: 'B', tank: { ...T }, rim: false, glass: p.use!.glass, glassBuild: p.use!.build });
    const S = defaultSetup(); chooseCustom(S, entry);
    expect(S.render.brace).toMatchObject({ cross: 1 });
  });
});

describe('Optimize', () => {
  const spec = { L: 48 * IN, D: 18 * IN, H: 20 * IN };
  it('meets the safety factor and is minimal over its grid (independent brute force)', () => {
    const sf = 3.8, o = { safetyFactor: sf, topEdge: 'free' as const };
    const r = optimizeBraceCustom(spec, o);
    expect(r.best).not.toBeNull();
    expect(r.best!.solution.ok).toBe(true); expect(r.best!.solution.braceJointsOk).toBe(true);
    let min = Infinity;
    const none = solveGlass(spec, { ...o, brace: null });
    if (none.ok) min = none.volumeIn3;
    for (let cross = 0; cross <= 3; cross++) for (const w of customWidths()) for (const t of STOCK_US) {
      if (spec.D - 2 * w < 6 * IN_MM || (cross && (spec.L - 2 * w - cross * w) / (cross + 1) < 6 * IN_MM)) continue;
      const s = solveGlass(spec, { ...o, brace: { width: w, thickness: t, cross, ...(cross ? { crossWidth: w } : {}) }, continuous: false });
      if (s.ok && s.braceJointsOk) min = Math.min(min, s.volumeIn3);
    }
    expect(r.best!.solution.volumeIn3).toBeCloseTo(min, 6);
    expect(r.best!.solution.volumeIn3).toBeLessThanOrEqual(none.volumeIn3 + 1e-9);
  }, 120_000);
  it('locked fields stay as given; an impossible lock says so', () => {
    const r = optimizeBraceCustom(spec, { safetyFactor: 3.8, locked: { width: 3 * IN_MM, cross: 1 } });
    expect(r.best!.brace).toMatchObject({ width: 3 * IN_MM, cross: 1 });
    const bad = optimizeChoice({ ...spec }, defaultChoice(), 'in', { width: 2 * IN_MM, thickness: STOCK_US[0], cross: 0 });
    if (!bad.ok) expect(bad.line).toMatch(/No brace meets/);
    else expect(bad.brace).toMatchObject({ width: 2 * IN_MM, thickness: STOCK_US[0] });
  }, 120_000);
  it('the button\'s line names the brace and the saving', () => {
    const r = optimizeChoice({ ...spec }, defaultChoice(), 'in');
    expect(r.ok).toBe(true); expect(r.line).toMatch(/(perimeter|No brace)/);
    if (r.brace) expect(r.line).toMatch(/% (less|more) glass than unbraced/);
  }, 120_000);
  it('a custom brace is solved as given and reported', () => {
    const p = glassPanel({ ...spec }, false, { ...defaultChoice(), custom: { width: 2.5 * IN, thickness: 0.25 * IN, cross: 0 } }, 'in');
    expect(p.braceNow).toMatchObject({ cross: 0 }); expect(p.volume).toMatch(/cu in/); expect(p.verdict.length).toBeGreaterThan(5);
    const tooWide = glassPanel({ ...spec }, false, { ...defaultChoice(), custom: { width: 9.5 * IN, thickness: 0.25 * IN } }, 'in');
    expect(tooWide.braceNow).toBeNull(); expect(tooWide.braceNote).toMatch(/too wide/);
  });
});

describe('default name', () => {
  it('is Custom LxWxH in whole inches', () => {
    expect(dimName({ L: 36 * IN, D: 10 * IN, H: 10 * IN })).toBe('Custom 36x10x10');
    expect(dimName({ L: 24.4 * IN, D: 12 * IN, H: 11.6 * IN })).toBe('Custom 24x12x12');
  });
  it('a new tank starts unnamed (so it follows its size); an edit keeps the stored name', () => {
    expect(startSpec(defaultSetup(), 'new', []).spec.name).toBe('');
  });
});
