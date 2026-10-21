import { describe, expect, it } from 'vitest';
import { buildsFor } from '../src/scene/builds';
import { getTankModel } from '../src/data/tanks';
import { allowedStyles, fakeFor, finSensitive, plantNeeds, rankStyles, scapeOptions, scapeSetup, withPlantMode } from '../src/scene/scapes';
import { animalsOfSetup, hardTruths, planOf, planText } from '../src/scene/plan';
import { tankFor, type AnimalCount } from '../src/scene/tankfit';
import { LIBRARY, makeItem } from '../src/scene/items';
import { stockingOf } from '../src/scene/stocking';

const BETTA: AnimalCount[] = [{ species: 'betta', n: 1 }];
const TETRA: AnimalCount[] = [{ species: 'neon', n: 10 }, { species: 'bronzecory', n: 6 }];
const MALAWI: AnimalCount[] = [{ species: 'yellowlab', n: 6 }, { species: 'peacock', n: 3 }];
const SALT: AnimalCount[] = [{ species: 'ocellaris', n: 2 }];
const NOW = Date.parse('2026-10-20');
const buildOf = (a: AnimalCount[], i = 0) => buildsFor(a, tankFor(a)!.tank, NOW)[i];

describe('style ranking', () => {
  it("only styles of the animals' water kind are allowed", () => {
    const fresh = allowedStyles(TETRA), salt = allowedStyles(SALT);
    expect(fresh).toContain('planted'); expect(fresh).not.toContain('reef'); expect(fresh).not.toContain('rainforest');
    expect([...salt].sort()).toEqual(['clownnano', 'reef', 'softreef', 'spsreef'].sort());
  });
  it('a cichlid stocking ranks the Malawi rock tank first; a tetra stocking does not', () => {
    expect(rankStyles(MALAWI)[0].style).toBe('malawi');
    expect(rankStyles(TETRA)[0].style).not.toBe('malawi');
  });
  it('a style whose usual stock holds all the animals outranks one that holds none', () => {
    const r = rankStyles([{ species: 'neon', n: 10 }]);
    const sc = (id: string) => r.find(x => x.style === id)!.score;
    expect(sc('planted')).toBeGreaterThan(sc('stones'));
  });
  it('a gentle-water animal does not rank a hillstream above still planted water', () => {
    const r = rankStyles(BETTA);
    expect(r.find(x => x.style === 'hillstream')?.score ?? 0).toBeLessThanOrEqual(r.find(x => x.style === 'planted')!.score);
  });
});

describe('plant mode', () => {
  const b = buildOf(TETRA);
  it('live keeps every plant; artificial leaves no live aquarium plant; mixed swaps only the demanding ones', () => {
    const live = scapeSetup(b, 'planted', 'live'), art = scapeSetup(b, 'planted', 'artificial'), mix = scapeSetup(b, 'planted', 'mixed');
    expect(live.items.some(i => i.kind === 'plant')).toBe(true);
    expect(live.items.some(i => i.kind === 'artificial')).toBe(false);
    expect(art.items.some(i => i.kind === 'plant')).toBe(false);
    expect(art.items.some(i => i.kind === 'artificial')).toBe(true);
    expect(mix.items.some(i => i.kind === 'artificial')).toBe(true);
    expect(mix.items.filter(i => i.kind === 'plant').length).toBeLessThan(live.items.filter(i => i.kind === 'plant').length);
  });
  it('artificial plants use silk for a long-finned fish and plastic otherwise', () => {
    expect(finSensitive(BETTA)).toBe(true); expect(finSensitive(TETRA)).toBe(false);
    const mats = (a: AnimalCount[]) => new Set(scapeSetup(buildOf(a), 'planted', 'artificial').items.filter(i => i.kind === 'artificial').map(i => LIBRARY[i.variant].fake!.mat));
    expect([...mats(BETTA)]).toEqual(['silk']); expect([...mats(TETRA)]).toEqual(['plastic']);
  });
  it('fakeFor maps stems, rosettes and mats; floaters have none', () => {
    expect(fakeFor('stem', true)).toBe('silkstem'); expect(fakeFor('sword', false)).toBe('plasticsword'); expect(fakeFor('carpet', true)).toBe('silkmoss');
    expect(fakeFor('salvinia', true)).toBeUndefined();
  });
  it('artificial plants need no light or CO2 and take no nitrogen', () => {
    const art = scapeSetup(b, 'planted', 'artificial'), live = scapeSetup(b, 'planted', 'live');
    expect(plantNeeds(art).live).toBe(0);
    expect(plantNeeds(art).light).toMatch(/Any light/);
    expect(stockingOf(art).filtrationPercent).toBeGreaterThanOrEqual(stockingOf(live).filtrationPercent);
  });
  it('a mixed scape keeps live floaters; all-artificial still drops them', () => {
    const S = { ...b.setup, items: ['salvinia', 'frogbit', 'redroot', 'lettuce'].map((v, i) => makeItem(b.setup.tank, v, i + 1, i + 1, 0, 0.5, {}, b.setup)) };
    const floats = (T: typeof S) => T.items.filter(i => i.kind === 'plant' && ['salvinia', 'frogbit', 'redroot', 'lettuce'].includes(i.variant)).length;
    expect(floats(withPlantMode(S, 'mixed', false))).toBe(4);
    expect(floats(withPlantMode(S, 'artificial', false))).toBe(0);
  });
  it('live mode is the identity', () => { expect(withPlantMode(b.setup, 'live', false)).toBe(b.setup); });
});

describe('scape options', () => {
  for (const [name, a] of [['betta', BETTA], ['tetra', TETRA], ['salt', SALT]] as const) {
    it(`${name}: three or four options with $, minutes, light and CO2 read off the engines, the animals and gear kept`, () => {
      const b = buildOf(a), opts = scapeOptions(b, 'live', NOW);
      expect(opts.length).toBeGreaterThanOrEqual(3); expect(opts.length).toBeLessThanOrEqual(4);
      for (const o of opts) {
        expect(o.setupUsd).toBeGreaterThan(0); expect(o.minPerWeek).toBeGreaterThan(0);
        expect(o.light.length).toBeGreaterThan(0); expect(o.co2.length).toBeGreaterThan(0);
        expect(o.setup.fish.length).toBe(b.setup.fish.length);
        expect(o.setup.tech).toEqual(b.setup.tech);
        expect(o.setup.tank.L).toBe(b.setup.tank.L);
      }
    });
  }
  it('artificial plants carry no CO2 or live-light need', () => {
    const b = buildOf(TETRA), art = scapeOptions(b, 'artificial', NOW);
    expect(art.every(o => o.liveCount === 0 && o.co2 === 'No CO2 needed')).toBe(true);
  });
});

describe('the plan', () => {
  const b = buildOf(TETRA, 2), S = scapeSetup(b, 'planted', 'mixed');
  const p = planOf(S, b, NOW);
  it('names the animals, the tank and the one-line cycle note', () => {
    expect(p.animals.join()).toMatch(/Neon/); expect(p.cycleNote).toMatch(/nitrogen cycle/);
    expect(planText(p)).toMatch(/nitrogen cycle/);
  });
  it("every shopping row names the need it serves, and the totals are the demand model's one number each", () => {
    expect(p.rows.length).toBeGreaterThan(3);
    for (const r of p.rows) { expect(r.serves.length).toBeGreaterThan(8); expect(r.usd).toBeGreaterThan(0); }
    expect(p.rows.find(r => r.item.startsWith('Filtration'))!.serves).toMatch(/Waste/);
    expect(p.rows.find(r => r.item.startsWith('Tank'))!.serves).toMatch(/Space/);
    expect(Number.isInteger(p.setupUsd) && Number.isInteger(p.minPerWeek) && Number.isInteger(p.upkeepUsdMo)).toBe(true);
  });
  it('a heater a cold animal needs is tied to it; none is listed when nothing asks for one', () => {
    const cold = buildOf([{ species: 'bolivianram', n: 2 }]);
    // the heater is its own row, or inside the kit the build picked (then the kit row names the need; S168 2026-10-20)
    const cp = planOf(cold.setup, cold, NOW);
    expect(cp.rows.find(r => r.item.startsWith('Heating') || /Temperature:/.test(r.serves))?.kind).toBe('need');
    expect(cp.missing.join()).not.toMatch(/Heater/);
    // lane MM: white clouds now fit a 10 gal (red line derived from Fishkeeping World's 10 gal); the 10 gal build lists a heater nobody
    // needs ("Nothing here needs it", a builds.ts gap, HANDOFF "Lane MM"), so this case keeps the 15 gal it was written for
    const wc = [{ species: 'whitecloud', n: 8 }], room = buildsFor(wc, getTankModel('g15')!, NOW)[0];
    expect(planOf(room.setup, room, NOW).rows.some(r => r.item.startsWith('Heating'))).toBe(false);
  });
  it('an overstocked tank does not fit', () => {
    const bad = structuredClone(b.setup); bad.fish = Array.from({ length: 80 }, (_, i) => ({ ...bad.fish[0], id: 900 + i }));
    expect(planOf(bad, b, NOW).fits).toBe(false);
  });
  it('plastic plants with a long-finned fish are a warning', () => {
    const s = scapeSetup(buildOf(BETTA), 'planted', 'artificial');
    expect(hardTruths(s, animalsOfSetup(s), true).some(t => /silk/.test(t.text))).toBe(false);
    const pl = structuredClone(s); pl.items.push({ ...pl.items.find(i => i.kind === 'artificial')!, id: 999, variant: 'plasticstem' });
    expect(hardTruths(pl, animalsOfSetup(pl), true).some(t => /silk/.test(t.text))).toBe(true);
  });
});
