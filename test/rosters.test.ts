// Lane RC1 (2026-11-03): suggested rosters built through the generator's own gates (ui/discovery/animals.ts rosterPlan / stockingSuggestion), the roster the Discovery tiles and the Explore pool both use.
// Pure: no WebGL, no pictures. The plans for the 44 buildable archetypes x their spike tank sizes are made once and shared.
import { beforeAll, describe, expect, it } from 'vitest';
import { ARCHETYPES, type Archetype } from '../src/scene/archetypes';
import { catalogueSizes, fitIn } from '../src/scene/tankfit';
import { focalAnimals, minTank, recipeLook } from '../src/scene/recipes';
import { buildsFor } from '../src/scene/builds';
import type { TankModel } from '../src/data/tanks';
import { SPECIES } from '../src/data/species';
import { evaluateCandidate } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';
import { clearRosterPlans, rosterPlan, stockingSuggestion, type RosterPlan } from '../src/ui/discovery/animals';
import { explorePool } from '../src/explore/pool';

const NOW = Date.parse('2026-11-02T12:00:00Z'), P = defaultProfile(), sp = (id: string) => SPECIES.find(s => s.id === id)!;
const key = (r: { species: string; n: number }[]) => r.map(x => `${x.species}${x.n}`).sort().join(',');
/** the tanks the cost spike tried per archetype: the smallest that meets the archetype's own minimum, then about 2x and 4x (an aquarium at least 29 and 55 gal), nearest catalogue sizes, de-duplicated */
function tanksOf(a: Archetype): TankModel[] {
  const land = a.env === 'terrarium', all = catalogueSizes(land).map(c => c.m), g0 = minTank(a).ratedGal;
  const want = land ? [g0, g0 * 2, g0 * 4] : [g0, Math.max(g0 * 2, 29), Math.max(g0 * 4, 55)];
  const pick = (g: number) => all.find(m => m.ratedGal >= g) ?? all[all.length - 1];
  return [...new Map(want.map(pick).map(m => [m.id, m])).values()].slice(0, 3);
}
const worldOf = (a: Archetype) => a.env === 'aquarium' ? (a.water === 'saltwater' ? 'SW' : a.water === 'brackish' ? 'BK' : 'FW') : a.env === 'terrarium' ? 'TE' : 'PA';
interface Row { a: Archetype; tank: TankModel; plan: RosterPlan }
let rows: Row[] = [];
beforeAll(() => {
  rows = ARCHETYPES.filter(a => a.support !== 'coming-soon' && recipeLook(a)).flatMap(a => tanksOf(a).map(tank => ({ a, tank, plan: rosterPlan(a, tank) })));
}, 120000);
const stocked = () => rows.filter(r => r.plan.roster.length);

describe('rule 1: every animal suits the look\'s world and habitat', () => {
  it('there are 45 buildable archetypes in 133 candidates, and brackish has no roster (Q3)', () => {
    expect(new Set(rows.map(r => r.a.id)).size).toBe(45);
    expect(rows.length).toBe(133);
    for (const r of rows.filter(x => worldOf(x.a) === 'BK')) { expect(r.plan.roster).toEqual([]); expect(r.plan.why).toMatch(/brackish/i); }
  });
  it('an aquarium holds only water animals of its own water (salt matching the water)', () => {
    for (const r of stocked().filter(x => x.a.env === 'aquarium'))
      for (const c of r.plan.roster) { const s = sp(c.species); expect(s.habitat, `${r.a.id} ${c.species}`).not.toBe('land'); expect(!!s.salt, `${r.a.id} ${c.species}`).toBe(r.a.water === 'saltwater'); }
  });
  it('a terrarium holds only land animals of the kinds its look names: a dart-frog rainforest is amphibians, never a tarantula', () => {
    const frogs = rows.filter(r => r.a.id === 'dart-frog-rainforest' && r.plan.roster.length);
    expect(frogs.length).toBeGreaterThan(0);
    for (const r of frogs) for (const c of r.plan.roster) expect(sp(c.species).cat).toBe('amphibian');
    for (const r of stocked().filter(x => x.a.env === 'terrarium')) for (const c of r.plan.roster) expect(sp(c.species).habitat, `${r.a.id} ${c.species}`).toBe('land');
    for (const r of rows.filter(x => x.a.id === 'tarantula-burrow' && x.plan.roster.length)) for (const c of r.plan.roster) expect(sp(c.species).cat).toBe('land-invert');
  });
  it('a paludarium holds water animals and amphibians only: no reptile or land invertebrate, no salt animal', () => {
    for (const r of stocked().filter(x => (x.a.resolvesTo ?? x.a.env) === 'paludarium'))
      for (const c of r.plan.roster) { const s = sp(c.species); expect(s.salt, `${r.a.id} ${c.species}`).toBeFalsy(); expect(['reptile', 'land-invert'], `${r.a.id} ${c.species}`).not.toContain(s.cat); }
  });
});

describe('rule 2: the roster passes the welfare rule as built, or the record says why not', () => {
  it('every roster of 2 or more kinds passes the generator\'s strict welfare gate on its balanced build, exactly as the Explore gate reads it', () => {
    const many = stocked().filter(r => r.plan.kinds >= 2);
    expect(many.length).toBeGreaterThan(60);
    for (const r of many) {
      const ev = evaluateCandidate({ constraints: {} }, P, 'in', NOW, { animals: r.plan.roster, tank: r.tank, build: buildsFor(r.plan.roster, r.tank, NOW)[2] });
      expect(ev.welfareWords, `${r.a.id} ${Math.round(r.tank.ratedGal)} gal ${key(r.plan.roster)}`).toEqual([]);
      expect(ev.needsOk).toBe(true);
    }
  });
  it('every roster is as large as the plan says, holds in its tank, and every one short of 2 kinds comes with its reason', () => {
    for (const r of rows.filter(x => worldOf(x.a) !== 'BK')) {
      expect(r.plan.kinds).toBe(r.plan.roster.length);
      if (r.plan.roster.length) expect(fitIn(r.plan.roster, r.tank)?.fails, `${r.a.id} ${key(r.plan.roster)}`).toEqual([]);
      if (r.plan.kinds < 2) expect(r.plan.why, `${r.a.id} ${Math.round(r.tank.ratedGal)} gal`).toMatch(/^.{20,}/);
      else expect(r.plan.why).toBeUndefined();
    }
  });
  it('most looks reach 3 kinds in most tanks (the old ladder cut about half to one kind or none)', () => {
    const live = rows.filter(r => worldOf(r.a) !== 'BK'), three = live.filter(r => r.plan.kinds === 3).length, one = live.filter(r => r.plan.kinds <= 1).length;
    expect(three / live.length).toBeGreaterThan(0.6);
    expect(one / live.length).toBeLessThan(0.25);
  });
});

describe('rule 3: looks of one family do not all share one roster', () => {
  it('distinct rosters over the 44 archetypes x their tank sizes stay above a floor', () => {
    const keys = stocked().map(r => key(r.plan.roster)), distinct = new Set(keys).size;
    // 2026-11-02 spike: the old stockingSuggestion gave 26 distinct rosters over 113 stocked candidates (0.23); the floor is set from the measured value
    expect(distinct / keys.length).toBeGreaterThan(0.45);
  });
  it('in every family with 3 or more looks, no single roster is shared by every look, nor by more than two thirds of them', () => {
    const fams = new Map<string, Row[]>();
    for (const r of stocked()) fams.set(r.a.familyId, [...(fams.get(r.a.familyId) ?? []), r]);
    for (const [fam, rs] of fams) {
      const looks = new Set(rs.map(r => r.a.id)).size; if (looks < 3) continue;
      const tally = new Map<string, Set<string>>();
      for (const r of rs) tally.set(key(r.plan.roster), (tally.get(key(r.plan.roster)) ?? new Set()).add(r.a.id));
      const top = Math.max(...[...tally.values()].map(s => s.size));
      expect(top, `${fam}: ${top} of ${looks} looks share one roster`).toBeLessThan(looks);
      expect(top / looks, `${fam}: ${top} of ${looks} looks share one roster`).toBeLessThanOrEqual(0.67);
    }
  });
});

describe('rule 4: the headliner is kept whenever it fits the tank', () => {
  it('the look\'s focal animal leads its roster when it fits', () => {
    let checked = 0;
    for (const r of rows.filter(x => worldOf(x.a) !== 'BK')) {
      const f = focalAnimals(r.a, r.tank)[0]; if (!f) continue;
      checked++; expect(r.plan.roster[0]?.species, `${r.a.id} ${Math.round(r.tank.ratedGal)} gal`).toBe(f.species); expect(r.plan.focal).toBe(f.species);
    }
    expect(checked).toBeGreaterThan(80);
  });
  it('a look named for one animal is not stocked with others when that animal does not fit (an oscar showcase in 75 gal)', () => {
    const big = rows.filter(r => r.a.id === 'big-fish-showcase');
    expect(big.some(r => r.plan.roster.length === 0 && /Oscar/.test(r.plan.why ?? ''))).toBe(true);
    for (const r of big.filter(x => x.plan.roster.length)) expect(r.plan.roster[0].species).toBe('oscar');
  });
});

describe('rule 5: deterministic for a given (archetype, tank)', () => {
  it('a plan made afresh is the same plan, and the suggestion is its roster (a copy that is safe to change)', () => {
    const pick = rows.filter((_, i) => i % 9 === 0).slice(0, 12), before = pick.map(r => JSON.stringify(rosterPlan(r.a, r.tank)));
    clearRosterPlans();
    expect(pick.map(r => JSON.stringify(rosterPlan(r.a, r.tank)))).toEqual(before);
    const r0 = pick.find(r => r.plan.roster.length)!, s = stockingSuggestion(r0.a, r0.tank);
    expect(s).toEqual(r0.plan.roster); s[0].n += 5; expect(stockingSuggestion(r0.a, r0.tank)).toEqual(r0.plan.roster);
  });
});

describe('the Explore pool takes the same rosters', () => {
  it('each candidate\'s roster is the plan\'s, with its source, and a look with no roster is withheld with the plan\'s reason', () => {
    const res = explorePool({ constraints: {} }, P, 'in', NOW, { only: ['planted-community', 'cypress-swamp', 'big-fish-showcase', 'mudskipper-mudflat'], sizes: 1, explain: false });
    expect(res.candidates.length).toBeGreaterThan(1);
    for (const c of res.candidates) { expect(key(c.roster)).toBe(key(rosterPlan(c.archetype, c.tank).roster)); expect(c.rosterSource?.source).toBe('generator-gates'); expect(c.rosterSource?.kinds).toBe(c.roster.length); }
    const showcase = res.withheld.find(w => w.archetypeId === 'big-fish-showcase');
    expect(showcase?.reasons[0].text).toMatch(/Oscar/);
    expect(res.withheld.some(w => w.archetypeId === 'mudskipper-mudflat')).toBe(true);
  });
});
