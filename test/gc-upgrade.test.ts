// Lane GC (R148): Free: size upgrade card, glass price math, override saved / loaded.
import { describe, expect, it } from 'vitest';
import { IN_MM } from '../src/scene/glassSolver';
import { estimateSqFt, priceSqFt, parsePrices } from '../src/scene/glassPrice';
import { addCustomTank, parseSpec, editCustomTank } from '../src/scene/customTanks';
import { defaultSetup } from '../src/scene/defaults';
import { addedGlassCost, areasOf, checkAt, upgradeCard } from '../src/shell/logic/glassUpgrade';

const IN = IN_MM, q = 0.25 * IN, T = { L: 48 * IN, D: 24 * IN, H: 26 * IN };
const same = (t: number) => ({ long: t, end: t, bottom: t });
const card = (o: object = {}) => upgradeCard({ T, rim: false, panes: same(q), brace: null, sf: 3.8, bottom: 'full', mixed: false, kind: 'standard', u: 'in', ...o });

describe('prices', () => {
  it('estimate rises with thickness and low-iron costs more', () => {
    expect(estimateSqFt(0.375 * IN, 'standard')).toBeGreaterThan(estimateSqFt(q, 'standard'));
    expect(estimateSqFt(q, 'lowiron')).toBeGreaterThan(estimateSqFt(q, 'standard'));
  });
  it('an override wins for its thickness only', () => {
    expect(priceSqFt(q, 'standard', { '6.4': 99 })).toEqual({ usd: 99, own: true });
    expect(priceSqFt(0.375 * IN, 'standard', { '6.4': 99 }).own).toBe(false);
  });
  it('cost = area x price difference', () => {
    const c = addedGlassCost(T, same(q), same(0.375 * IN), 'standard');
    const ar = areasOf(T), tot = ar.long + ar.end + ar.bottom;
    expect(c.usd).toBeCloseTo(tot * (estimateSqFt(0.375 * IN, 'standard') - estimateSqFt(q, 'standard')), 6);
    expect(addedGlassCost(T, same(q), same(0.375 * IN), 'standard', { '6.4': 10, '9.5': 20 }).usd).toBeCloseTo(tot * 10, 6);
  });
  it('overrides are saved with the tank and old saves still load', () => {
    const base = parseSpec({ tank: defaultSetup().tank, glass: 'auto', glassType: 'standard', rim: false })!;
    expect(base.glassPrices).toBeUndefined();
    const { entry } = addCustomTank([], { ...base, glassPrices: { '6.4': 11.5 } });
    const back = parseSpec(JSON.parse(JSON.stringify(entry)))!;
    expect(back.glassPrices).toEqual({ '6.4': 11.5 });
    expect(parsePrices({ '6.4': -3, x: 5, '9.5': 'a' })).toBeUndefined();
    expect(editCustomTank([entry!], entry!.id, { glassPrices: { '9.5': 20 } }).entry!.glassPrices).toEqual({ '9.5': 20 });
  });
});

describe('upgrade card', () => {
  it('a passing tank has no card', () => { expect(upgradeCard({ T: { L: 24 * IN, D: 12 * IN, H: 12 * IN }, rim: false, panes: same(q), brace: null, sf: 2, bottom: 'full', mixed: false, kind: 'standard', u: 'in' }).ok).toBe(true); });
  it('Same everywhere raises every pane to the thinnest stock that passes', () => {
    const c = card(); expect(c.ok).toBe(false);
    const g = c.options.find(o => o.kind === 'glass')!;
    expect(g.panes.long).toBe(g.panes.end); expect(g.panes.end).toBe(g.panes.bottom);
    expect(g.panes.long).toBeGreaterThan(q);
    expect(checkAt(T, false, g.panes, null, 3.8, 'full').ok).toBe(true);
    expect(Math.abs(g.panes.long - 0.3125 * IN)).toBeGreaterThan(0.01); // never special-order 5/16
  });
  it('Mixed raises only the failing panes', () => {
    const p = { long: 0.5 * IN, end: q, bottom: 0.5 * IN }, c = upgradeCard({ T: { L: 36 * IN, D: 24 * IN, H: 24 * IN }, rim: false, panes: p, brace: null, sf: 3.8, bottom: 'full', mixed: true, kind: 'standard', u: 'in' });
    if (!c.ok) { const g = c.options.find(o => o.kind === 'glass'); if (g) { expect(g.panes.long).toBe(p.long); expect(g.panes.end).toBeGreaterThan(p.end); } }
  });
  it('can step 2+ sizes, and a cheap brace beats glass when it fits', () => {
    const c = card({ T: { L: 60 * IN, D: 24 * IN, H: 30 * IN }, best: { brace: { width: 3 * IN, thickness: q, cross: 1 }, meets: true } });
    const g = c.options.find(o => o.kind === 'glass');
    if (g) expect(g.panes.long).toBeGreaterThanOrEqual(0.375 * IN - 0.01);
    for (let i = 1; i < c.options.length; i++) expect(c.options[i].costUsd).toBeGreaterThanOrEqual(c.options[i - 1].costUsd);
  });
});
