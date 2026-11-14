// Lane P2: stocking edits (scene/stockEdit.ts) and the animal picker's fit / gate / readout logic (ui/logic/animalPicker.ts).
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { SPECIES, getSpecies, type Species } from '../src/data/species';
import { LIMITS } from '../src/scene/validate';
import { startCount } from '../src/ui/pickerStrict';
import * as E from '../src/scene/stockEdit';
import * as P from '../src/ui/logic/animalPicker';
import type { TankSetup } from '../src/scene/types';

const empty = (): TankSetup => { const s = defaultSetup(); s.fish = []; return s; };
const neon = getSpecies('neon')!;
const salty = SPECIES.find(x => x.salt && x.habitat === 'water')!;
const dimorphic = SPECIES.find(x => x.female && !x.salt && x.habitat === 'water')!;
const land = SPECIES.find(x => x.habitat === 'land')!;
const opts = (first = 1000) => ({ first, seed: 7, pct: 100 });
const count = (s: TankSetup, x: Species) => s.fish.filter(f => f.species === x.id).length;

describe('P2 setCount (applyCount)', () => {
  it('counts up to a number, then down, then to zero', () => {
    const s = empty();
    E.applyCount(s, neon, () => 6, undefined, opts());
    expect(count(s, neon)).toBe(6);
    expect(new Set(s.fish.map(f => f.id)).size).toBe(6);
    const before = s.fish.map(f => [f.id, f.x, f.y, f.depth]);
    E.applyCount(s, neon, k => k + 1, undefined, opts(2000));
    expect(count(s, neon)).toBe(7);
    expect(s.fish.slice(0, 6).map(f => [f.id, f.x, f.y, f.depth])).toEqual(before); // the others stay put
    E.applyCount(s, neon, k => k - 3, undefined, opts());
    expect(count(s, neon)).toBe(4);
    E.applyCount(s, neon, () => 0, undefined, opts());
    expect(s.fish).toEqual([]);
  });
  it('is deterministic for the same seed and first id', () => {
    const a = empty(), b = empty();
    E.applyCount(a, neon, () => 5, undefined, opts()); E.applyCount(b, neon, () => 5, undefined, opts());
    expect(a.fish).toEqual(b.fish);
  });
  it('keeps one row per sex for a dimorphic species', () => {
    const s = empty();
    E.applyCount(s, dimorphic, () => 2, undefined, opts());
    E.applyCount(s, dimorphic, () => 3, 'f', opts(2000));
    expect(E.rowCount(s, dimorphic)).toBe(2); expect(E.rowCount(s, dimorphic, 'f')).toBe(3);
    E.applyCount(s, dimorphic, () => 0, 'f', opts());
    expect(E.rowCount(s, dimorphic)).toBe(2); expect(E.rowCount(s, dimorphic, 'f')).toBe(0);
    expect(E.rowName(dimorphic)).toBe(`${dimorphic.name} (male)`);
    expect(E.rowName(dimorphic, 'f')).toBe(`${dimorphic.name} (female)`);
    expect(E.rowName(neon)).toBe(neon.name);
    expect(E.countKey(dimorphic, 'f')).toBe(`count:${dimorphic.id}:f`);
  });
  it('never goes past the animal limit', () => {
    const s = empty();
    E.applyCount(s, neon, () => LIMITS.maxFish + 50, undefined, opts());
    expect(s.fish.length).toBe(LIMITS.maxFish);
    const p = E.planCount(s, neon, k => k + 1);
    expect(p.kind).toBe('full');
    expect(p.kind === 'full' && p.message).toBe(`A tank holds at most ${LIMITS.maxFish} animals.`);
  });
  it('plans: ok, and blocked in a dry tank', () => {
    const s = empty();
    expect(E.planCount(s, neon, () => 3)).toEqual({ kind: 'ok', want: 3, have: 0 });
    s.water.on = false;
    expect(E.planCount(s, neon, () => 3)).toEqual({ kind: 'blocked', why: 'Fish need water: turn Water on (Water section).' });
    expect(E.planCount(s, neon, () => 0).kind).toBe('ok');   // removing is never blocked
    expect(E.blocked(s, neon)).not.toBe('');
  });
  it('a land animal needs ground above the water', () => {
    const s = empty(); s.water.level = 1;
    expect(E.blocked(s, land)).toContain('Land animals need ground');
  });
});

describe('P2 dropSpecies (drop target + placement)', () => {
  it('first drop adds the start count, later drops add one', () => {
    expect(E.dropTarget(0, startCount(neon))).toBe(6);
    expect(E.dropTarget(6, startCount(neon))).toBe(7);
    expect(E.dropTarget(0, 2)).toBe(2);
  });
  it('the newcomers gather at the drop point', () => {
    const s = empty(), T = s.tank;
    const at = { x: T.L * 0.8, depth: T.D * 0.5 } as never;
    E.applyCount(s, neon, k => E.dropTarget(k, 6), undefined, { ...opts(), at });
    expect(s.fish.length).toBe(6);
    const mx = s.fish.reduce((a, f) => a + f.x, 0) / 6;
    const plain = empty(); E.applyCount(plain, neon, () => 6, undefined, opts());
    expect(mx).toBeGreaterThan(plain.fish.reduce((a, f) => a + f.x, 0) / 6);
  });
});

describe('P2 misfits', () => {
  it('a marine animal in fresh water (and the reverse) is a misfit; removing takes only those', () => {
    const s = empty();
    E.applyCount(s, neon, () => 3, undefined, opts());
    E.applyCount(s, salty, () => 2, undefined, opts(2000));
    expect(E.misfits(s).map(f => f.species)).toEqual([salty.id, salty.id]);
    E.removeFish(s, E.misfitIds(s));
    expect(s.fish.every(f => f.species === neon.id)).toBe(true);
    expect(E.misfitIds(s).size).toBe(0);
    s.water.salt = true;   // the tank turns salty: now the neons are the misfits
    expect(E.isSalt(s)).toBe(true);
    expect(E.misfits(s).length).toBe(3);
    expect(E.fitsWater(salty, s)).toBe(true);
  });
  it('a dry tank counts as fresh', () => {
    const s = empty(); s.water.on = false; s.water.salt = true;
    expect(E.isSalt(s)).toBe(false);
  });
  it('status line pluralises', () => {
    expect(E.misfitNote(1)).toBe('1 animal removed. Ctrl+Z brings them back.');
    expect(E.misfitNote(3)).toBe('3 animals removed. Ctrl+Z brings them back.');
  });
});

describe('P2 fit vs gate', () => {
  it('fit reader grays some animals; the gate is null while off', () => {
    const fit = P.createFitter().fitsFor(empty(), 'in', 'guided');
    expect(SPECIES.some(x => fit(x).level === 'ok')).toBe(true);
    expect(SPECIES.some(x => fit(x).level !== 'ok')).toBe(true);
    expect(P.animalGate(empty(), 'in')).toBeNull();
  });
  it('sandbox rules gray nothing', () => {
    const fit = P.createFitter().fitsFor(empty(), 'in', 'sandbox');
    expect(SPECIES.every(x => fit(x).level === 'ok')).toBe(true);
  });
  it('the gate reads the care level and gives reasons per species', () => {
    const s = empty(); s.layout.gateStock = true; s.layout.gateAnimals = true; s.layout.expertise = 1;
    const v = P.gateView(s);
    expect(v).toMatchObject({ stock: true, on: true, ex: 1, animals: true });
    expect(v.care).toBe(P.CARE_LEVEL[1]); expect(v.hint).toContain('Grayed in the list');
    const g = P.animalGate(s, 'in')!;
    const reasons = SPECIES.map(x => g(x)).filter(Boolean);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons[0]).toHaveProperty('block');
    expect(P.experienceIn(s)).toBe(1);
    s.layout.expertise = 3; expect(P.gateView(s).ex).toBe(3); expect(P.gateView(s).care).toBe(P.CARE_LEVEL[3]);
    delete s.layout.gateAnimals; expect(P.gateView(s)).toMatchObject({ on: false, hint: '' });
  });
  it('the memo key follows what the fit depends on', () => {
    const a = empty(), b = empty(); b.fish.push({ ...defaultSetup().fish[0] });
    expect(P.stockKey(a, 'in', 'guided')).toBe(P.stockKey(empty(), 'in', 'guided'));
    expect(P.stockKey(a, 'in', 'guided')).not.toBe(P.stockKey(b, 'in', 'guided'));
    expect(P.stockKey(a, 'in', 'guided')).not.toBe(P.stockKey(a, 'cm', 'guided'));
  });
  it('refine fills in the exact reading, then calls done once', async () => {
    const s = empty(), f = P.createFitter(), list = SPECIES.slice(0, 12);
    let n = 0;
    await new Promise<void>(res => f.refineFits(s, 'in', 'guided', list, () => { n++; res(); }));
    expect(n).toBe(1);
    expect(typeof f.exactNow(s, 'in', 'guided', list[0]).level).toBe('string');
  });
});

describe('P2 Fits this tank filter', () => {
  it('keeps only the animals whose fit is ok', () => {
    const fit = P.createFitter().fitsFor(empty(), 'in', 'guided');
    const kept = P.fitsThisTank(SPECIES, fit);
    expect(kept.length).toBeGreaterThan(0); expect(kept.length).toBeLessThan(SPECIES.length);
    expect(kept.every(x => fit(x).level === 'ok')).toBe(true);
    expect(SPECIES.filter(x => fit(x).level === 'ok').length).toBe(kept.length);
  });
});

describe('P2 readout text', () => {
  const s = defaultSetup(), f = s.fish[0], x = getSpecies(f.species)!;
  const m = (a: number) => ({ len: 80, ref: 100, formula: 0.8, sideAngle: a }) as never;
  it('says what to do with nothing selected', () => {
    expect(P.readoutHtml(null, null, null, 'in', false)).toBe(P.READOUT_NONE);
    expect(P.readoutHtml(f, x, null, 'in', false)).toBe(P.READOUT_NONE);
  });
  it('shows name, depth and apparent size; debug rows only with ?debug', () => {
    const h = P.readoutHtml(f, x, m(30), 'in', false);
    expect(h).toContain(x.name); expect(h).toContain('Depth behind glass'); expect(h).toContain('80 % as big');
    expect(h).not.toContain('On screen');
    const d = P.readoutHtml(f, x, m(30), 'in', true);
    expect(d).toContain('80 px'); expect(d).toContain('reads fine'); expect(d).toContain('×0.800');
    expect(P.readoutHtml(f, x, m(50), 'in', true)).toContain('marginal');
    expect(P.readoutHtml(f, x, m(60), 'in', true)).toContain('too thin');
  });
  it('shows a custom size beside the adult length, and the sex mark of a dimorphic species', () => {
    expect(P.readoutHtml({ ...f, tl: 30 }, x, m(30), 'in', false)).toContain('(adult');
    expect(P.readoutHtml({ ...f, species: dimorphic.id }, dimorphic, m(30), 'in', false)).toContain('♂');
  });
});
