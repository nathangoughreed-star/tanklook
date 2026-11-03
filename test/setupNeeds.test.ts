// Lane LN1 (Nathan 2026-11-03): a generated setup always has a light, and the light / ferts / CO2 / dosing its plants and corals need are added, told and priced.
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { recipeScene } from '../src/scene/recipes';
import { handOff } from '../src/scene/reeval';
import { bareSetup } from '../src/scene/defaults';
import { applySetupNeeds, LOW_TECH_STYLES } from '../src/scene/setupNeeds';
import { fixtureOf, wattsOf } from '../src/scene/lightout';
import { feedFor } from '../src/scene/tech';
import { emptyBrief, setItem } from '../src/scene/brief';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import type { TankSetup } from '../src/scene/types';

const M20 = getTankModel('g20h')!, M60 = getTankModel('g60b')!;
const scene = (id: string, m = M20) => recipeScene(id, 'balanced', m)!;
/** the editor's tank with a design in place (a product) and no light: the reported case */
const inPlace = (m = M20) => { const c = bareSetup(); c.product = { model: m.id } as never; return c; };
const lit = (S: TankSetup) => fixtureOf(S.light) !== 'flat' && wattsOf(S) > 0;
const plants = (S: TankSetup) => S.items.filter(i => i.kind === 'plant').map(i => i.variant);

describe('the reported case: a planted tank handed off to the editor had no light', () => {
  const ho = handOff(inPlace(), scene('planted-community'), { openTop: false });
  it('keeps a glass top but now has a catalogue light the render and the price list can show', () => {
    expect(ho.scene.lid).toBe('glass');
    expect(lit(ho.scene)).toBe(true);
    expect(ho.scene.light.product).toBeTruthy();
  });
  it('red stems need CO2 and ferts: both are added, with their prices, and told', () => {
    expect(feedFor(ho.scene)).toBe('co2');
    const kinds = ho.needs.map(n => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(['light', 'co2', 'ferts']));
    for (const n of ho.needs.filter(n => n.kind !== 'swap')) expect(n.text).toMatch(/\$\d/);
    expect(ho.changed.join(' ')).toMatch(/CO2/);
  });
  it('the price list charges them: a light row, a CO2 row, a ferts row', () => {
    const d = demandOf(ho.scene, defaultProfile());
    const keys = d.items.map(i => i.key);
    expect(keys).toEqual(expect.arrayContaining(['light', 'co2', 'ferts']));
    expect(d.items.find(i => i.key === 'light')!.label).toMatch(/Light:/);
  });
});

describe('every route out of Guided gives a lit scene', () => {
  for (const id of ['dutch-garden', 'blackwater-creek', 'goldfish-palace', 'driftwood-nature', 'stone-wood-sculpture']) {
    it(`${id}: in place and fresh`, () => {
      expect(lit(handOff(inPlace(), scene(id), { openTop: false }).scene)).toBe(true);
      expect(lit(handOff(bareSetup(), scene(id), { openTop: false }).scene)).toBe(true);
    });
  }
  it('an open-top look keeps no lid but still has its light', () => {
    const ho = handOff(inPlace(), scene('overgrown-garden'), { openTop: true });
    expect(ho.scene.lid).toBe('open'); expect(lit(ho.scene)).toBe(true);
  });
});

describe('light fits the plants, never the reverse where it is low-tech', () => {
  it('low-light plants get a basic light and no CO2', () => {
    const ho = handOff(inPlace(), scene('mossy-wood-ferns'), { openTop: false, lowTech: true });
    expect(feedFor(ho.scene)).not.toBe('co2');
    expect(ho.needs.some(n => n.kind === 'co2')).toBe(false);
  });
  it('a low-tech look swaps the plants that demand CO2 and says so', () => {
    const ho = handOff(inPlace(), scene('betta-retreat'), { openTop: false, lowTech: true });
    expect(plants(ho.scene)).not.toContain('stemred'); expect(plants(ho.scene)).not.toContain('carpet');
    expect(feedFor(ho.scene)).not.toBe('co2');
    const swap = ho.needs.find(n => n.kind === 'swap');
    expect(swap?.text).toMatch(/low-tech/);
  });
  it('a low-tech brief does the same for any look', () => {
    const b = setItem(emptyBrief(), 'preferences.lowtech', true, 'hard');
    const r = applySetupNeeds(scene('dutch-garden'), { brief: b });
    expect(feedFor(r.scene)).not.toBe('co2');
    expect(plants(r.scene)).not.toContain('stemred');
  });
  it('a tight budget swaps them too and names the budget; a roomy one does not', () => {
    const tight = applySetupNeeds(scene('iwagumi-stone-garden'), { brief: setItem(emptyBrief(), 'constraints.budget', 150, 'hard') });
    expect(tight.lines.find(l => l.kind === 'swap')?.text).toMatch(/\$150 budget/);
    expect(plants(tight.scene)).not.toContain('carpet');
    const roomy = applySetupNeeds(scene('iwagumi-stone-garden'), { generated: true, brief: setItem(emptyBrief(), 'constraints.budget', 5000, 'hard') });
    expect(roomy.lines.some(l => l.kind === 'swap')).toBe(false);
    expect(feedFor(roomy.scene)).toBe('co2');
  });
  it('the jungle and its kin are the named low-tech looks', () => {
    expect(LOW_TECH_STYLES.has('overgrown-jungle')).toBe(true);
    expect(LOW_TECH_STYLES.has('dutch-garden')).toBe(false);
  });
});

describe('owned gear is kept and flagged', () => {
  const weakOwned = (): TankSetup => { const S = scene('iwagumi-stone-garden'); S.light = { ...S.light, type: 'led', tech: 'led-white', count: 1, watts: 4, owned: true }; return S; };
  it('an owned light is never replaced, and its shortfall is told with the cheapest fix', () => {
    const r = applySetupNeeds(weakOwned());
    expect(r.scene.light.owned).toBe(true); expect(r.scene.light.product).toBeUndefined(); expect(r.scene.light.watts).toBe(4);
    const f = r.lines.find(l => l.kind === 'flag');
    expect(f?.text).toMatch(/Your light gives about \d+ PAR/); expect(f?.text).toMatch(/cheapest fix/);
  });
  it('care rows the owner chose are kept, and a shortfall is flagged', () => {
    const S = scene('iwagumi-stone-garden'); S.tech = { rows: { co2: 'none', ferts: 'none' } } as never;
    const r = applySetupNeeds(S);
    expect(r.scene.tech?.rows.co2).toBe('none');
    expect(r.lines.some(l => l.kind === 'flag' && /kept/.test(l.text))).toBe(true);
  });
  it('running it again changes nothing', () => {
    const once = applySetupNeeds(scene('dutch-garden'), { generated: true }).scene, twice = applySetupNeeds(once, { generated: true });
    expect(twice.lines).toEqual([]);
    expect(twice.scene.light).toEqual(once.light);
  });
});

describe('reef and dry', () => {
  it('a reef gets a reef light and the coral dosing, priced', () => {
    const ho = handOff(bareSetup(), scene('sps-reef', M60), { openTop: false });
    expect(lit(ho.scene)).toBe(true);
    expect(ho.scene.light.product).toMatch(/hyper|navareef|v165|ai-prime|kessil|reef|nicrew|smatfarm|pawfly/);
    const dose = ho.needs.find(n => n.kind === 'dosing');
    expect(dose?.text).toMatch(/\$\d/); expect(feedFor(ho.scene)).not.toBe('low');
  });
  it('a dry enclosure with demanding plants gets a grow light strong enough or says it is not', () => {
    const S = scene('rocky-desert-canyon');
    const r = applySetupNeeds(S, { generated: true });
    expect(lit(r.scene)).toBe(true);
    expect(r.lines.some(l => l.kind === 'light')).toBe(true);
  });
  it('a tank with no plants still gets a light, and nothing else is added', () => {
    const r = applySetupNeeds((() => { const S = scene('stone-wood-sculpture'); S.light = { ...S.light, type: 'flat' }; return S; })());
    expect(lit(r.scene)).toBe(true);
    expect(r.lines.map(l => l.kind)).toEqual(['light']);
  });
});

describe('CO2 defaults to the cheapest option that works', () => {
  it('a 20 gal gets the DIY bottle, a 60 gal a pressurized kit', () => {
    const small = handOff(inPlace(), scene('iwagumi-stone-garden'), { openTop: false });
    expect(small.scene.tech?.rows.co2).toBe('diy');
    expect(small.needs.find(n => n.kind === 'co2')?.text).toMatch(/diy/i);
    expect(small.needs.find(n => n.kind === 'co2')!.setupUsd).toBeLessThan(40);
    expect(feedFor(small.scene)).toBe('co2');
    const big = handOff(inPlace(M60), scene('iwagumi-stone-garden', M60), { openTop: false });
    expect(big.scene.tech?.rows.co2).toBe('pressurized');
  });
});
