// Lane GS7 (2026-11-03): the roster keeps its sex / pair choices in the brief, and count changes reconcile the scene's animals. Pure logic, no renders. The two bugs GS5 named:
// (1) sex / pair picks were not saved (a revisit showed all males); (2) after a design is in the editor, new counts only ADDED species the scene lacked.
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { emptyBrief, getItem, parseBrief, setItem, setVision, valueOf, visionOf, type Brief, type Stocked } from '../src/scene/brief';
import { setWater, setWorld } from '../src/scene/project';
import { recipeScene } from '../src/scene/recipes';
import { handOff, hasDesign, reconcileRoster } from '../src/scene/reeval';
import type { TankSetup } from '../src/scene/types';
import { lockAnimals, lockedRoster } from '../src/ui/setupBrief';
import { picksOfBrief, withRoster } from '../src/ui/guided/animalsLogic';
import { bump, pickOfStock, picksFromTank, stockedOf, totalOf, type Pk } from '../src/ui/stockPlanLogic';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const M40 = getTankModel('g40b')!;
// guppy: kept by sex, drawn dimorphic; kribensis: kept by sex AND forms pairs; neon: no sex
const base = (): Brief => setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater');
const roundTrip = (b: Brief): Brief => parseBrief(JSON.parse(JSON.stringify(b)))!;
const counts = (S: TankSetup) => { const m: Record<string, number> = {}; for (const f of S.fish) m[f.species] = (m[f.species] ?? 0) + 1; return m; };
const sexes = (S: TankSetup, id: string) => S.fish.filter(f => f.species === id).map(f => f.gender ?? 'u').sort().join('');
const design = (): TankSetup => {
  const S = recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 5 }, { species: 'guppy', n: 3 }])!;
  S.fish.forEach((f, i) => { f.x = 10 + i * 7; });   // positions to keep (animals carry no name: their ids are their identity)
  return S;
};
const rosterBrief = (picks: Pk[]): Brief => withRoster(base(), picks);

describe('the brief keeps the sex / pair split', () => {
  it('survives save -> reload -> picker reopen (females and the pairing are still there, not all males)', () => {
    const picks: Pk[] = [{ id: 'guppy', n: 2, f: 3 }, { id: 'kribensis', n: 1, f: 1, pair: 'established' }, { id: 'neon', n: 8 }, { id: 'cpd', n: 1, f: 1, u: 2, tl: 20 }];
    const back = picksOfBrief(roundTrip(rosterBrief(picks)));
    expect(back).toEqual(picks.map(p => ({ ...p })));
    expect(totalOf(back[0])).toBe(5);
  });
  it('does not make a split up: a v5 brief (counts only) loads unchanged, all males, and a bad split is ignored', () => {
    const old = parseBrief({ v: 5, items: { 'animals.stock': { value: [{ species: 'guppy', count: 4 }, { species: 'neon', count: 6 }], status: 'locked' } } })!;
    expect(valueOf(old, 'animals.stock')).toEqual([{ species: 'guppy', count: 4 }, { species: 'neon', count: 6 }]);
    expect(picksOfBrief(old)).toEqual([{ id: 'guppy', n: 4 }, { id: 'neon', n: 6 }]);
    const bad = parseBrief({ v: 5, items: { 'animals.stock': { value: [{ species: 'guppy', count: 3, f: 9, pair: 'bogus' }], status: 'locked' } } })!;
    expect(valueOf(bad, 'animals.stock')).toEqual([{ species: 'guppy', count: 3 }]);
  });
  it('is the same brief version, and a species without a split stays small', () => {
    expect(stockedOf({ id: 'neon', n: 8 })).toEqual({ species: 'neon', count: 8 });
    expect(stockedOf({ id: 'kribensis', n: 1, f: 1, pair: 'unknown' })).toEqual({ species: 'kribensis', count: 2, f: 1 });   // 'unknown' is the default, not stored
    expect(stockedOf({ id: 'kribensis', n: 2, f: 1, pair: 'established' }).pair).toBeUndefined();   // the pairing is asked for exactly two animals
    expect(pickOfStock({ species: 'neon', count: 8, f: 3 })).toEqual({ id: 'neon', n: 8 });   // an unsexed species never splits
    expect(emptyBrief().v).toBe(5);
  });
  it('changing a count changes the group: its pairing is unknown again, and a count-only writer keeps the split of a species whose count did not change', () => {
    const p = bump({ id: 'kribensis', n: 1, f: 1, pair: 'established' }, 'n', 1);
    expect(p.pair).toBeUndefined();
    const b = rosterBrief([{ id: 'guppy', n: 2, f: 3 }, { id: 'neon', n: 8 }]);
    const b2 = lockAnimals(b, [{ species: 'guppy', n: 5 }, { species: 'neon', n: 12 }]);   // e.g. the generator's alternatives write counts only
    expect(lockedRoster(b2)).toEqual([{ species: 'guppy', count: 5, f: 3 }, { species: 'neon', count: 12 }]);
  });
  it('is read back from a scene too (the stocking screen over a design opens with the animals sexes, not all males)', () => {
    const S = design(); reconcileRoster(S, [{ species: 'neon', count: 5 }, { species: 'guppy', count: 3, f: 2 }]);
    const g = picksFromTank(S).find(p => p.id === 'guppy')!;
    expect([g.n, g.f]).toEqual([1, 2]);
  });
});

describe('count changes reconcile the scene', () => {
  const survivors = (S: TankSetup, T: TankSetup, id: string) => T.fish.filter(f => f.species === id).filter(f => S.fish.some(q => q.id === f.id && q.x === f.x));
  it('5 -> 8 adds three, 8 -> 5 removes three, and the ones that stay keep their place', () => {
    const S = design(), neons = S.fish.filter(f => f.species === 'neon');
    const up = handOff(S, S, { accept: ['neon', 'guppy'], brief: rosterBrief([{ id: 'neon', n: 8 }, { id: 'guppy', n: 3 }]) }).scene;
    expect(counts(up)).toEqual({ neon: 8, guppy: 3 });
    expect(survivors(S, up, 'neon').length).toBe(5);
    expect(new Set(up.fish.map(f => f.id)).size).toBe(11);   // new ids, no clashes
    const down = handOff(up, up, { accept: ['neon', 'guppy'], brief: rosterBrief([{ id: 'neon', n: 5 }, { id: 'guppy', n: 3 }]) }).scene;
    expect(counts(down)).toEqual({ neon: 5, guppy: 3 });
    expect(survivors(up, down, 'neon').length).toBe(5);
    expect(down.fish.filter(f => f.species === 'neon').map(f => f.id)).toEqual(neons.map(f => f.id));
  });
  it('a removed species leaves the tank, a new one arrives, and the sexes match the roster exactly', () => {
    const S = design();
    const ho = handOff(S, S, { accept: ['guppy', 'cherrybarb'], brief: rosterBrief([{ id: 'guppy', n: 1, f: 4 }, { id: 'cherrybarb', n: 2, f: 2 }]) });
    expect(counts(ho.scene)).toEqual({ guppy: 5, cherrybarb: 4 });   // no neon any more
    expect(sexes(ho.scene, 'guppy')).toBe('ffffm');
    expect(ho.scene.fish.filter(f => f.species === 'guppy' && f.gender === 'f').length).toBe(4);
    expect(ho.scene.fish.filter(f => f.species === 'cherrybarb' && f.gender === 'f').length).toBe(2);
    expect(ho.changed.join(' ')).toMatch(/\+2 guppy/i);
    expect(ho.changed.join(' ')).toMatch(/-5 /);   // the five neon
  });
  it('unsexed animals of a sexed species stay unsexed (the mix is not guessed)', () => {
    const S = design(), ho = handOff(S, S, { accept: ['guppy'], brief: rosterBrief([{ id: 'guppy', n: 1, f: 1, u: 2 }]) });
    expect(sexes(ho.scene, 'guppy')).toBe('fmuu');
  });
  it('a pairing the person set is written to the two animals', () => {
    const S = design(), ho = handOff(S, S, { accept: ['kribensis'], brief: rosterBrief([{ id: 'kribensis', n: 1, f: 1, pair: 'established' }]) });
    expect(ho.scene.pairs?.kribensis?.status).toBe('established');
    expect(picksFromTank(ho.scene)[0].pair).toBe('established');
  });
  it('never replaces a design: the pieces, plants, tank and look stay, only the roster changes', () => {
    const S = design(), j = JSON.stringify([S.items, S.patches, S.tank, S.substrate, S.backdrop]);
    const b = setVision(rosterBrief([{ id: 'neon', n: 9 }]), { ...visionOf(base()), archetypeId: 'underwater-forest', density: 'full' });
    expect(hasDesign(S, b)).toBe(true);
    const ho = handOff(S, recipeScene('underwater-forest', 'balanced', M40)!, { accept: ['neon'], brief: b });
    expect(ho.fresh).toBe(false);
    expect(counts(ho.scene)).toEqual({ neon: 9 });
    expect(S.fish.length).toBe(8);   // `current` itself is untouched
    const same = handOff(S, S, { accept: ['neon'], brief: b }).scene;   // the look unchanged: nothing but the roster moves
    expect(JSON.stringify([same.items, same.patches, same.tank, same.substrate, same.backdrop])).toBe(j);
    expect(JSON.stringify(ho.scene.tank)).toBe(JSON.stringify(S.tank));
  });
  it('an empty scene with only a roster in the brief still gets the animals (GS5), exactly the roster', () => {
    const gen = recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 12 }])!;
    const ho = handOff({ ...gen, fish: [], items: [] }, gen, { accept: ['neon'], brief: rosterBrief([{ id: 'neon', n: 7 }]) });
    expect(counts(ho.scene)).toEqual({ neon: 7 });
  });
  it('a Look First hand-off (the roster species not passed as accepted) only adds, as before', () => {
    const S = design(), gen = recipeScene('underwater-forest', 'full', M40, [{ species: 'cherrybarb', n: 4 }])!;
    const ho = handOff(S, gen, { accept: ['cherrybarb'], brief: rosterBrief([{ id: 'neon', n: 2 }]) });
    expect(counts(ho.scene)).toEqual({ neon: 5, guppy: 3, cherrybarb: 4 });
  });
  it('a welfare-flagged change is shown with the result, never blocked', () => {
    const S = design(), ho = handOff(S, S, { accept: ['guppy'], brief: rosterBrief([{ id: 'guppy', n: 80 }]) });
    expect(counts(ho.scene)).toEqual({ guppy: 80 });   // done as asked
    expect(ho.warnings.length).toBeGreaterThan(0);
    expect(ho.changed.join(' ')).toContain(ho.warnings[0]);
  });
});

describe('where it is wired', () => {
  const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8') as string;
  it('the stocking screen and the Animals First picker write and read the split; the screen reconciles through the shared step', () => {
    const sp = read('src/ui/stockPlan.ts'), af = read('src/ui/guided/animalsFirst.ts'), al = read('src/ui/guided/animalsLogic.ts');
    expect(sp).toMatch(/lockRoster\(b, picks\.map\(stockedOf\)\)/);
    expect(sp).toMatch(/reconcileFish\(T, picks\)/);
    expect(sp).toMatch(/pickOfStock/);
    expect(af).toMatch(/picksOfBrief\(getBrief\(\)\)/);
    expect(al).toMatch(/lockRoster\(b, picks\.map\(stockedOf\)\)/);
  });
  it('the brief item for the animals is a plain optional extension (the stock item still validates as before)', () => {
    const b = setItem(emptyBrief(), 'animals.stock', [{ species: 'guppy', count: 3, f: 1 } as Stocked], 'locked');
    expect(getItem(roundTrip(b), 'animals.stock')?.status).toBe('locked');
  });
});
