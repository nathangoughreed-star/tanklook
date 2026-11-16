// Lane IL1 (2026-11-16): heated canisters count as the heater; in-line heaters, CO2 diffusers and reactors sit on a canister's return hose.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { filterProduct, FILTER_PRODUCTS, INLINE_PRODUCTS, inlineFor, inlineProduct } from '../src/data/gearCatalog';
import { deliveredFlow, heatLoss, inlineFlowLoss, optionCost, parseTech, techOf, techParts, unitCosts, type TechSetup } from '../src/scene/tech';
import * as TE from '../src/scene/techEdit';
import { gearPicks } from '../src/render/gear3d';
import { demandOf } from '../src/demand/engine';
import { planOf } from '../src/scene/plan';
import { defaultProfile } from '../src/demand/types';
import type { TankSetup } from '../src/scene/types';

const load = (k: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[k])).scene; return sc.tanks[sc.active]; };
/** the planted example with a canister (a product or generic), pressurized CO2, and the edits applied the way the menu does */
const tank = (filter: { kind: string; product?: string }, ...edits: ((S: TankSetup) => TechSetup)[]): TankSetup => {
  const S = structuredClone(load('planted'));
  S.tech = { rows: { ...techOf(S).rows, filter: filter.kind, co2: 'pressurized' }, filters: [filter], preset: 'custom' };
  for (const e of edits) TE.commitTech(S, e);
  return S;
};
const THERMO = 'oase-filtosmart-thermo-200', F107 = 'fluval-107', F307 = 'fluval-307';

describe('IL1: heated canister is the heater', () => {
  it('the Oase Thermo models carry their heater', () => {
    for (const id of ['oase-filtosmart-thermo-100', THERMO, 'oase-filtosmart-thermo-300']) {
      const p = filterProduct(id)!; expect(p.kind).toBe('canister'); expect(p.heater!.w).toBeGreaterThan(0); expect(p.priceUsd).toBeGreaterThan(100);
    }
  });
  it('picking it fills the heater row: no separate heater, no second price', () => {
    const S = tank({ kind: 'canister', product: THERMO }), t = techOf(S), h = heatLoss(S, t);
    expect(h.n).toBe(1); expect(h.units[0].builtIn?.id).toBe(THERMO); expect(h.totalW).toBe(200);
    expect(unitCosts(S, 'heater', { tech: t })[0].setup.mode).toBe(0);
    expect(optionCost(S, 'heater', t.rows.heater, { tech: t }).setup.mode).toBe(0);
    expect(techParts(S).some(p => p.gear === 'heater')).toBe(false); // nothing separate to draw
    const plain = tank({ kind: 'canister', product: F307 });
    expect(optionCost(plain, 'heater', techOf(plain).rows.heater, { tech: techOf(plain) }).setup.mode).toBeGreaterThan(0);
  });
  it('even with the heater row set to none it counts as heated', () => {
    const S = tank({ kind: 'canister', product: THERMO }); S.tech!.rows.heater = 'none';
    expect(techOf(S).rows.heater).toBe('one'); expect(heatLoss(S).totalW).toBe(200);
  });
  it('an added heater is on top of the built-in one, and the built-in one is not duplicated into the list', () => {
    const S = tank({ kind: 'canister', product: THERMO }, s => TE.addHeater(s));
    const h = heatLoss(S); expect(h.n).toBe(2); expect(h.units.filter(u => u.builtIn)).toHaveLength(1);
    expect(TE.heatersNow(S, techOf(S))).toHaveLength(1);
  });
});

describe('IL1: cost lines', () => {
  it('the heater line says built into the filter and prices no second heater', () => {
    const P = defaultProfile(), line = (S: TankSetup, k: string) => demandOf(S, P).items.find(i => i.key === k);
    const heated = tank({ kind: 'canister', product: THERMO }), plain = tank({ kind: 'canister', product: F307 });
    expect(line(heated, 'heater')!.label).toBe('Heater: built into Oase FiltoSmart Thermo 200 Canister Filter');
    expect(line(heated, 'heater')!.setup).toBeUndefined();
    expect(line(plain, 'heater')!.setup!.mode).toBeGreaterThan(0);
    // the filter line carries the filter's own price once
    expect(line(heated, 'filter')!.setup!.mode).toBeCloseTo(filterProduct(THERMO)!.priceUsd!, 0);
  });
  it('a built-in heater is not reported missing from the shopping list', () => {
    const heated = tank({ kind: 'canister', product: THERMO }); heated.tech!.roomC = 12; // a cold room: the animals want a heater
    expect(planOf(heated).missing.filter(m => m.startsWith('Heater'))).toEqual([]);
  });
  it('the CO2 line names the in-line diffuser', () => {
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    expect(demandOf(S, defaultProfile()).items.find(i => i.key === 'co2')!.label).toMatch(/in-line diffuser \(CO2Art/);
  });
});

describe('IL1: in-line gear on the return', () => {
  it('is refused on HOB, sponge and sump filters, and dropped when the canister goes', () => {
    const id = 'upaqua-inline-1-2';
    for (const kind of ['hob', 'sponge', 'internal']) {
      const S = tank({ kind }); TE.commitTech(S, s => TE.addReturnInline(s, id));
      expect(techOf(S).returnInline).toBeUndefined();
    }
    const C = tank({ kind: 'canister', product: F107 }, s => TE.addReturnInline(s, id));
    expect(techOf(C).returnInline).toEqual([id]);
    TE.commitTech(C, s => TE.addFilter(s, 'hob')); C.tech!.filters = [{ kind: 'hob' }]; C.tech!.rows.filter = 'hob';
    expect(techOf(C).returnInline).toBeUndefined(); expect(deliveredFlow(C, techOf(C))).toBeUndefined();
    const sump = tank({ kind: 'sump' }); sump.tech!.returnInline = [id]; expect(techOf(sump).returnInline).toBeUndefined();
  });
  it('matches the hose: only what fits the canister is offered or kept', () => {
    expect(inlineFor(0.5).every(p => p.hoseIdIn.includes(0.5))).toBe(true);
    expect(inlineFor(0.5).some(p => p.id === 'co2art-inline-5-8')).toBe(false);
    const small = tank({ kind: 'canister', product: F107 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    expect(techOf(small).returnInline).toBeUndefined(); // 5/8 in unit, 1/2 in canister
    const small2 = tank({ kind: 'canister', product: F107 }, s => TE.addReturnInline(s, 'co2art-inline-1-2'));
    expect(techOf(small2).returnInline).toEqual(['co2art-inline-1-2']);
    const mid = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    expect(techOf(mid).returnInline).toEqual(['co2art-inline-5-8']);
    // a stored list that no longer fits (the canister changed) is cut back on load
    mid.tech!.filters = [{ kind: 'canister', product: F107 }]; expect(techOf(mid).returnInline).toBeUndefined();
    expect(INLINE_PRODUCTS.every(p => p.hoseIdIn.length && p.url && p.asOf && p.colors.body)).toBe(true);
  });
  it('the flow loss lowers the delivered flow and the turnover by the stated amount', () => {
    const base = tank({ kind: 'canister', product: F307 }), t0 = techOf(base), c0 = optionCost(base, 'filter', 'canister', { tech: t0 }).turnover!;
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'), s => TE.addReturnInline(s, 'hydor-eth-200-5-8'));
    const t = techOf(S), d = deliveredFlow(S, t)!, keep = (1 - inlineProduct('co2art-inline-5-8')!.flowLossPct / 100) * (1 - inlineProduct('hydor-eth-200-5-8')!.flowLossPct / 100);
    expect(d.rated).toBe(filterProduct(F307)!.gph); expect(d.delivered).toBeCloseTo(d.rated * keep, 6); expect(inlineFlowLoss(d.items)).toBeCloseTo(1 - keep, 9);
    expect(optionCost(S, 'filter', 'canister', { tech: t }).turnover!).toBeCloseTo(c0 * keep, 6);
  });
  it('an in-line heater is the heater; a diffuser is the CO2 diffuser (priced once, kit diffuser replaced)', () => {
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'hydor-eth-300-5-8'), s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    const t = techOf(S), h = heatLoss(S, t);
    expect(h.units.filter(u => u.inline).map(u => u.inline!.id)).toEqual(['hydor-eth-300-5-8']); expect(h.totalW).toBe(300);
    expect(unitCosts(S, 'heater', { tech: t })[0].setup.mode).toBeCloseTo(inlineProduct('hydor-eth-300-5-8')!.priceUsd!, 6);
    const co2 = optionCost(S, 'co2', 'pressurized', { tech: t }), line = co2.parts.filter(p => p.gear === 'inlineco2');
    expect(line).toHaveLength(1); expect(line[0].label).toMatch(/replaces the kit's in-tank diffuser/); expect(line[0].setup!.mode).toBeCloseTo(43.99, 6);
    // a second CO2 injector replaces the first (one at a time); the heater stays
    const S2 = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'), s => TE.addReturnInline(s, 'bioscape-inline-reactor-5-8'), s => TE.addReturnInline(s, 'hydor-eth-300-5-8'));
    expect(techOf(S2).returnInline).toEqual(['bioscape-inline-reactor-5-8', 'hydor-eth-300-5-8']);
  });
  it('is drawn: the canister pick lists the in-line units in flow order, the CO2 kit knows its diffuser is in line', () => {
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'hydor-eth-300-5-8'), s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    const picks = gearPicks(S);
    expect(picks.find(p => p.product === F307)?.inline).toEqual(['hydor-eth-300-5-8', 'co2art-inline-5-8']);
    expect(picks.find(p => p.id === 'co2')?.inlineCo2).toBe(true);
    expect(picks.some(p => p.id.startsWith('heater') && p.watts !== undefined)).toBe(false);
  });
  it('removing an in-line unit puts the tank back as it was', () => {
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'upaqua-inline-5-8'), s => TE.removeReturnInline(s, 'upaqua-inline-5-8'));
    expect(techOf(S).returnInline).toBeUndefined();
  });
});

describe('IL1: saved files', () => {
  it('an old file without the new fields loads unchanged', () => {
    const old = JSON.parse(JSON.stringify(load('planted').tech ?? { rows: {} }));
    expect(parseTech(old)?.returnInline).toBeUndefined();
    const S = load('planted'); expect(techOf(S).returnInline).toBeUndefined();
    expect(FILTER_PRODUCTS.filter(p => p.kind === 'canister' && p.hoseIdIn === undefined)).toHaveLength(0);
  });
  it('returnInline round-trips; unknown ids and junk are dropped', () => {
    const t = parseTech({ rows: { filter: 'canister' }, returnInline: ['co2art-inline-5-8', 'nope', 7, 'hydor-eth-300-5-8'] })!;
    expect(t.returnInline).toEqual(['co2art-inline-5-8', 'hydor-eth-300-5-8']);
    expect(parseTech({ rows: { filter: 'canister' }, returnInline: 'x' })?.returnInline).toBeUndefined();
    const S = tank({ kind: 'canister', product: F307 }, s => TE.addReturnInline(s, 'co2art-inline-5-8'));
    expect(parseTech(JSON.parse(JSON.stringify(S.tech)))?.returnInline).toEqual(['co2art-inline-5-8']);
  });
});
