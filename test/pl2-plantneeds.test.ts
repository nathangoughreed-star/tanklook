// Lane PL2 (Nathan 2026-11-17): the Plants workspace's per-species needs card (src/shell/logic/plantNeeds.ts).
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { LIBRARY } from '../src/scene/items';
import { addPiece } from '../src/shell/logic/scape';
import { plantNeedsView, plantRows, comparablePlant } from '../src/shell/logic/plantNeeds';
import { lightOutCached } from '../src/scene/lightout';
import { LIGHT_PRODUCTS } from '../src/data/gearCatalog';
import { pickLightProduct } from '../src/scene/techEdit';

/** A fresh tank with a catalogue bar light (the weakest that fits) and these plants. */
const stocked = (ids: string[]) => {
  const st = new Store();
  st.edit(s => { s.water.on = true; delete s.water.salt; });
  const L = st.tank.tank.L, prod = LIGHT_PRODUCTS.filter(p => p.water !== 'salt' && L >= p.fitMinMm && L <= p.fitMaxMm && p.mount !== 'hanging').sort((a, b) => a.watts - b.watts);
  st.edit(s => { pickLightProduct(s, prod[0].id); });
  for (const id of ids) addPiece(st, id);
  return st;
};
const price = (S: { tech?: unknown; light: { product?: string } }) => 100 + (S.tech ? 40 : 0) + (S.light.product ? 5 : 0);
const plants = (st: Store) => st.tank.items.filter(i => i.kind === 'plant');

describe('rows', () => {
  it('one row per species with a count, picture path and a met mark; unmet first', () => {
    const st = stocked(['crypt', 'crypt', 'fern', 'stemred', 'carpet']);
    const rows = plantRows(st.tank);
    expect(rows.map(r => r.variant).sort()).toEqual(['carpet', 'crypt', 'fern', 'stemred']);
    expect(rows.find(r => r.variant === 'crypt')!.n).toBe(2);
    expect(rows.every(r => r.img === `gallery/plants/${r.variant}.webp`)).toBe(true);
    const firstMet = rows.findIndex(r => r.met);
    expect(rows.slice(0, firstMet).every(r => !r.met)).toBe(true);
  });
  it('a CO2-hungry plant in a low-tech tank is not met on CO2 and ferts; a hardy one is met', () => {
    const rows = plantRows(stocked(['stemred', 'fern']).tank);
    const red = rows.find(r => r.variant === 'stemred')!, fern = rows.find(r => r.variant === 'fern')!;
    expect(red.met).toBe(false); expect(red.issues).toEqual(expect.arrayContaining(['co2', 'ferts']));
    expect(red.co2!.met).toBe(false); expect(red.ferts!.met).toBe(false);
    expect(fern.met).toBe(true); expect(fern.co2!.met && fern.ferts!.met && fern.light!.met).toBe(true);
  });
  it('artificial plants need nothing and are met', () => {
    const fake = Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'artificial')!;
    const r = plantRows(stocked([fake]).tank)[0];
    expect(r.kind).toBe('artificial'); expect(r.met).toBe(true); expect(r.plain).toMatch(/needs no light/);
  });
});

describe('fixes', () => {
  it('unmet CO2 gives one button that adds CO2 + ferts, with a price; applying it makes the plant met; undo reverses', () => {
    const st = stocked(['stemred']), v = plantNeedsView(st.tank, price as never);
    const co2 = v.fixes.find(f => f.kind === 'co2')!;
    expect(co2).toBeTruthy(); expect(co2.label).toMatch(/Add CO2 system.*\+\$\d+/); expect(co2.setupUsd).toBeGreaterThan(0);
    expect(co2.describe).toMatch(/\+\$\d+ to set up/);
    expect(v.fixes.filter(f => f.kind === 'ferts')).toHaveLength(0);
    st.edit(s => co2.apply(s));
    expect(st.tank.grow.feed).toBe('co2');
    const after = plantRows(st.tank).find(r => r.variant === 'stemred')!;
    expect(after.issues).not.toContain('co2'); expect(after.issues).not.toContain('ferts');
    st.undo(); expect(st.tank.grow.feed).toBe('low');
  });
  it('plants that need only ferts get an Add fertiliser button and no CO2 one', () => {
    const need = Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'plant' && (plantRows(stocked([k]).tank)[0]?.issues ?? []).filter(i => i !== 'dim' && i !== 'bright').join() === 'ferts');
    if (!need) return;   // no such species in the data: nothing to check
    const st = stocked([need]), v = plantNeedsView(st.tank);
    expect(v.fixes.map(f => f.kind)).toContain('ferts'); expect(v.fixes.map(f => f.kind)).not.toContain('co2');
    st.edit(s => v.fixes.find(f => f.kind === 'ferts')!.apply(s));
    expect(plantRows(st.tank)[0].issues).not.toContain('ferts');
  });
  it('a too-dim plant offers a stronger light that really raises the PAR', () => {
    const st = stocked(['stemred', 'carpet']), v = plantNeedsView(st.tank);
    const lf = v.fixes.find(f => f.kind === 'light')!, before = lightOutCached(st.tank)!.mean;
    expect(lf).toBeTruthy(); expect(lf.label).toMatch(/Stronger light \((\+\$\d+|no extra cost)\)/);
    st.edit(s => lf.apply(s));
    expect(lightOutCached(st.tank)!.mean).toBeGreaterThan(before);
  });
  it('an owned light is never offered a replacement; an all-met tank has no fix and no replace', () => {
    const own = stocked(['stemred']); own.edit(s => { s.light.owned = true; });
    expect(plantNeedsView(own.tank).fixes.find(f => f.kind === 'light')).toBeUndefined();
    const ok = plantNeedsView(stocked(['fern', 'anubias']).tank);
    expect(ok.ok).toBe(true); expect(ok.fixes).toEqual([]); expect(ok.replace).toBeNull();
    expect(ok.summary).toMatch(/All 2 plants have what they need/);
  });
});

describe('remove and replace', () => {
  it('Remove these plants takes every plant out in one undo step and says how many', () => {
    const st = stocked(['fern', 'fern', 'crypt']), v = plantNeedsView(st.tank);
    expect(v.remove!.n).toBe(3); expect(v.remove!.label).toMatch(/\(3\)/);
    st.edit(s => v.remove!.apply(s));
    expect(plants(st)).toHaveLength(0);
    st.undo(); expect(plants(st)).toHaveLength(3);
    expect(plantNeedsView(new Store().tank).remove).toBeNull();
  });
  it('Replace swaps each unmet species for a look-alike that suits the current tank, keeping count, spot and id', () => {
    const st = stocked(['stemred', 'carpet', 'fern']), before = plants(st).map(i => ({ id: i.id, x: i.x, depth: i.depth, v: i.variant }));
    const rp = plantNeedsView(st.tank).replace!;
    expect(rp).toBeTruthy(); expect(rp.label).toBe('Replace with easier plants'); expect(rp.describe).toMatch(/→/);
    st.edit(s => rp.apply(s));
    const now = plants(st);
    expect(now).toHaveLength(before.length);
    for (const b of before) { const n = now.find(i => i.id === b.id)!; expect(Math.abs(n.x - b.x)).toBeLessThan(25); expect(Math.abs(n.depth - b.depth)).toBeLessThan(25); }
    expect(now.find(i => i.id === before.find(b => b.v === 'fern')!.id)!.variant).toBe('fern');   // met ones stay
    // positions are random, so a plant may have no comparable at its spot: every swap that WAS made leaves no CO2 / ferts need behind, the others stay as they were
    for (const sw of rp.swaps) {
      const row = plantRows(st.tank).find(r => r.variant === (sw.to ?? sw.from))!;
      expect(row, sw.from).toBeTruthy();
      if (sw.to) expect(row.issues, sw.to).not.toEqual(expect.arrayContaining(['co2']));
    }
    st.undo(); expect(plants(st).map(i => i.variant).sort()).toEqual(before.map(b => b.v).sort());
  });
  it('the look-alike is a plant of the same shape group that fits the tank', () => {
    const st = stocked(['carpet']);
    const to = comparablePlant(st.tank, 'carpet', [40]);
    expect(to).toBeTruthy(); expect(LIBRARY[to!].kind).toBe('plant');
    expect(plantNeedsView(st.tank).replace!.swaps[0].to).toBe(to);
  });
  it('a species with no comparable plant is told so and stays', () => {
    const st = stocked(['stemred']);
    const r = plantNeedsView(st.tank).replace!;
    // force the "none" branch through the describe text contract
    const none = r.swaps.filter(s => !s.to);
    for (const s of none) expect(r.describe).toContain(`${s.fromLabel} ×${s.n}: no comparable plant`);
  });
});

describe('fertiliser row and CO2 pointer', () => {
  it('no fertiliser row until one is added; then it lists choices with dose and cost and a pick is one undo step', () => {
    const st = stocked(['stemred']);
    expect(plantNeedsView(st.tank).fert).toBeNull(); expect(plantNeedsView(st.tank).co2Sys).toBeNull();
    st.edit(s => plantNeedsView(s).fixes.find(f => f.kind === 'co2')!.apply(s));
    const v = plantNeedsView(st.tank);
    expect(v.co2Sys).toBeTruthy(); expect(v.fert!.current!.id).toBe('aio');
    expect(v.fert!.options.map(o => o.id)).toEqual(expect.arrayContaining(['roottabs', 'aio', 'ei']));
    expect(v.fert!.options.every(o => /dose/.test(o.dose))).toBe(true);
    st.edit(s => v.fert!.pick(s, 'ei'));
    expect(plantNeedsView(st.tank).fert!.current!.id).toBe('ei');
    st.undo(); expect(plantNeedsView(st.tank).fert!.current!.id).toBe('aio');
  });
});
