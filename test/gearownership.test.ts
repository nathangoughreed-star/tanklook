// Lane GM6 (2026-10-29): "I own one" is saved on the unit / light, prices at $0 "you have" (power and welfare still count), lists under
// "Already have"; generic filter prices follow curves fitted to the library; gear swaps offer only welfare-passing alternatives.
import { describe, expect, it } from 'vitest';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset, heatLoss, parseTech, unitCosts, withUnits, techOf } from '../src/scene/tech';
import { ownedGearLines } from '../src/scene/ownedGear';
import { buildSheet } from '../src/scene/setupsheet';
import { CURVES, curveAt, filterModelPrice } from '../src/demand/pricecurves';
import { FILTER_MODELS } from '../src/demand/gear';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, listedPrice } from '../src/data/gearCatalog';
import { gearSwapsFor } from '../src/demand/swaps';
import type { TankSetup } from '../src/scene/types';

const P = defaultProfile();
const planted = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES.planted)).scene; return sc.tanks[sc.active]; };
const withHeater = (S: TankSetup, u: object): TankSetup => ({ ...S, tech: withUnits(applyPreset(S, 'midplanted'), 'heater', [u]) });

describe('I own one', () => {
  it('an owned heater costs $0 to set up; power is unchanged', () => {
    const S = withHeater(planted(), { product: 'topfin-50' }), O = withHeater(planted(), { product: 'topfin-50', owned: true, paidUsd: 14 });
    const a = demandOf(S, P).items.find(i => i.key === 'heater')!, b = demandOf(O, P).items.find(i => i.key === 'heater')!;
    expect(a.setup!.mode).toBeGreaterThan(5); expect(b.setup).toBeUndefined();
    expect(b.kwhMo).toBeCloseTo(a.kwhMo!, 6);
    expect(demandOf(O, P).totals.setupUsd).toBeLessThan(demandOf(S, P).totals.setupUsd - 5);
    expect(unitCosts(O, 'heater')[0].setup.mode).toBe(0);
    expect(unitCosts(O, 'heater')[0].kwhMo).toBeGreaterThan(0);
  });
  it('an owned light has no set-up price but still draws power', () => {
    const S = planted(), O = { ...S, light: { ...S.light, owned: true } }, a = demandOf(S, P).items.find(i => i.key === 'light'), b = demandOf(O, P).items.find(i => i.key === 'light');
    if (a?.setup) { expect(b?.setup).toBeUndefined(); expect(b?.kwhMo).toBeCloseTo(a.kwhMo!, 6); }
  });
  it('lists as $0 "you have", with what was paid in the note, and in the setup sheet', () => {
    const O = withHeater(planted(), { product: 'topfin-50', owned: true, paidUsd: 14 }), lines = ownedGearLines(O);
    expect(lines.map(l => [l.usd, l.note])).toContainEqual([0, 'paid $14']);
    expect(lines[0].label).toMatch(/^Heater: /);
    const sheet = buildSheet({ ...parseScene(JSON.parse(SCENES.planted)).scene, tanks: [O], active: 0 });
    expect(sheet.sections.find(s => s.title === 'Already have')?.rows.length).toBeGreaterThan(0);
    expect(ownedGearLines(planted())).toEqual([]);
  });
  it('is saved, shared and loaded back; old saves load unchanged', () => {
    const O = { ...withHeater(planted(), { w: 75, owned: true, paidUsd: 20 }), light: { ...planted().light, owned: true, paidUsd: 30 } };
    const sc = parseScene(JSON.parse(SCENES.planted)).scene, back = parseScene(JSON.parse(JSON.stringify({ ...sc, tanks: [O], active: 0 }))).scene.tanks[0];
    expect(back.tech!.heaters).toEqual([{ w: 75, owned: true, paidUsd: 20 }]); expect(back.light.owned).toBe(true); expect(back.light.paidUsd).toBe(30);
    const old = parseTech({ rows: { heater: 'one' }, heaters: [{ w: 75 }], filters: [{ kind: 'hob', owned: false, paidUsd: 5 }] })!;
    expect(old.heaters).toEqual([{ w: 75 }]); expect(old.filters).toEqual([{ kind: 'hob' }]); // paidUsd without owned is dropped
    expect(JSON.stringify(parseScene(JSON.parse(SCENES.planted)).scene)).not.toContain('owned');
  });
});

describe('generic price curves', () => {
  it('the stored curves match a refit of the library (regenerate src/data/gear-price-curves.json when this fails)', () => {
    const refit = (pts: [number, number][]) => { const n = pts.length, lx = pts.map(p => Math.log(p[0])), ly = pts.map(p => Math.log(p[1])), mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n; const b = lx.reduce((s, x, i) => s + (x - mx) * (ly[i] - my), 0) / lx.reduce((s, x) => s + (x - mx) ** 2, 0); return { a: Math.exp(my - b * mx), b, n }; };
    const cases: [string, [number, number][]][] = [
      ['heater', HEATER_PRODUCTS.flatMap(p => { const l = listedPrice(p); return l ? [[p.watts, l] as [number, number]] : []; })],
      ...(['hob', 'canister', 'internal'] as const).map(k => [`filter:${k}`, FILTER_PRODUCTS.filter(p => p.kind === k).flatMap(p => { const l = listedPrice(p); return l && p.gph ? [[p.gph, l] as [number, number]] : []; })] as [string, [number, number][]]),
    ];
    for (const [k, pts] of cases) { const f = refit(pts); expect(f.n, k).toBe(CURVES[k].n); expect(f.b, k).toBeCloseTo(CURVES[k].b, 2); expect(f.a / CURVES[k].a, k).toBeCloseTo(1, 1); }
  });
  it('is used only where the fit is good, and stays inside the library range', () => {
    for (const c of Object.values(CURVES)) expect(c.use).toBe(c.n >= 7 && c.r2 >= 0.7);
    const hob = FILTER_MODELS.find(m => m.kind === 'hob')!, p = filterModelPrice(hob)!;
    expect(p.mode).toBeCloseTo(curveAt(CURVES['filter:hob'], hob.gph), 6); expect(p.lo).toBeLessThan(p.mode); expect(p.hi).toBeGreaterThan(p.mode);
    expect(curveAt(CURVES['filter:hob'], 1e6)).toBe(curveAt(CURVES['filter:hob'], CURVES['filter:hob'].xMax));
    const can = FILTER_MODELS.find(m => m.kind === 'canister')!;
    expect(filterModelPrice(can)!.mode).toBe(filterModelPrice({ ...can, gph: can.gph * 2 })!.mode); // canister keeps its hand-set row
  });
});

describe('gear swaps', () => {
  it('heater swaps keep the cold-night need and show stat, price and power changes', () => {
    const S = withHeater(planted(), { product: 'topfin-50' }), sw = gearSwapsFor(S, P, 'heater', 0);
    expect(sw.length).toBeGreaterThan(0);
    for (const w of sw) {
      const S2 = withHeater(planted(), { product: w.toId }), h = heatLoss(S2, techOf(S2));
      expect(h.totalW).toBeGreaterThanOrEqual(h.needW); expect(w.welfare).toMatch(/cold night/); expect(w.dWatts).toBe(HEATER_PRODUCTS.find(p => p.id === w.toId)!.watts - 50);
    }
    expect(sw.map(w => w.delta.setup)).toEqual([...sw.map(w => w.delta.setup)].sort((a, b) => a - b));
  });
});
