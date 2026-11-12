// SD1: substrate depth checks, the substrate table, bottom-dweller substrate flags, Discover's Guided gate.
import { describe, expect, it } from 'vitest';
import { bareSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { bedOf, substrateCheck } from '../src/scene/substrateCheck';
import { DEEP_MM, DWELLER, PLANT_DEPTH, SUBSTRATE_TRAITS } from '../src/data/substrateTraits';
import { verdictOf } from '../src/scene/verdict';
import { blockingIssues } from '../src/scene/rules';
import { emptyBrief } from '../src/ui/setupBrief';
import { getSpecies } from '../src/data/species';
import type { Fish, Item, SubstrateType, TankSetup } from '../src/scene/types';

const fish = (species: string, id = 1): Fish => ({ id, species, x: 300, y: 20, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 });
const plant = (variant: string, x: number, depth: number, id = 1): Item => ({ id, kind: 'plant', variant, seed: 1, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: 200 }) as unknown as Item;
function tank(type: SubstrateType, fl: number, fr = fl, bl = fl, br = fl, f: Fish[] = [], items: Item[] = []): TankSetup {
  const s = bareSetup();
  s.substrate = { ...s.substrate, show: true, type, fl: fl * IN, fr: fr * IN, bl: bl * IN, br: br * IN };
  s.fish = f; s.items = items;
  return s;
}
const ids = (s: TankSetup) => substrateCheck(s).map(n => n.id);

describe('substrate table', () => {
  it('maps every aquatic type to a grain, only coral is sharp, custom follows its grain', () => {
    for (const t of ['gravel', 'pea', 'clown', 'blue', 'onyx', 'black', 'white', 'aragonite', 'coral'] as const) expect(SUBSTRATE_TRAITS[t]).toBeTruthy();
    expect(Object.entries(SUBSTRATE_TRAITS).filter(([, v]) => v!.sharp).map(([k]) => k)).toEqual(['coral']);
    expect(SUBSTRATE_TRAITS.aragonite!.grain).toBe('sand');
    expect(SUBSTRATE_TRAITS.pea!.grain).toBe('pebble');
    const s = tank('custom', 2); s.substrate.custom = { ...s.substrate.custom, grain: 'sand', grain2: 'pebble', share: 40 };
    expect(bedOf(s)!.grain).toBe('pebble');
    s.substrate.custom.share = 10; expect(bedOf(s)!.grain).toBe('sand');
    for (const t of ['soil', 'tsand', 'clay', 'bark', 'layered'] as const) expect(bedOf(tank(t, 2))).toBeUndefined();
    expect(bedOf({ ...tank('gravel', 2), substrate: { ...tank('gravel', 2).substrate, show: false } })).toBeUndefined();
  });
  it('every animal rule names a real species', () => { for (const id of Object.keys(DWELLER)) expect(getSpecies(id), id).toBeTruthy(); });
  it('min <= rec for every plant', () => { for (const [k, d] of Object.entries(PLANT_DEPTH)) expect(d.min, k).toBeLessThanOrEqual(d.rec); });
});

describe('plant depth', () => {
  it('a sword in 1 in of gravel is flagged with the depth it needs; in 4 in it is not', () => {
    const n = substrateCheck(tank('gravel', 1, 1, 1, 1, [], [plant('sword', 300, 150)]));
    expect(n.map(x => x.id)).toEqual(['substrate:plant:sword']);
    expect(n[0].text).toMatch(/2 in/);
    expect(ids(tank('gravel', 4, 4, 4, 4, [], [plant('sword', 300, 150)]))).toEqual([]);
  });
  it('uses the depth where the plant stands: front shallow, back deep', () => {
    const s = (d: number) => tank('gravel', 1, 1, 4, 4, [], [plant('sword', 300, d)]);
    expect(ids(s(10))).toEqual(['substrate:plant:sword']);   // front
    expect(ids(s(290))).toEqual([]);                          // back
  });
  it('epiphytes and floaters need no substrate', () => { expect(ids(tank('gravel', 0, 0, 0, 0, [], [plant('anubias', 300, 150, 1), plant('fern', 100, 100, 2), plant('frogbit', 200, 100, 3), plant('moss', 50, 50, 4)]))).toEqual([]); });
});

describe('too deep', () => {
  it('flags beds over the grain threshold with mitigation, and not below it', () => {
    const deepSand = substrateCheck(tank('aragonite', 5)), okSand = substrateCheck(tank('aragonite', 4));
    expect(deepSand.map(n => n.id)).toEqual(['substrate:deep']);
    expect(deepSand[0].text).toMatch(/trumpet snails/);
    expect(okSand).toEqual([]);
    expect(ids(tank('gravel', 6))).toEqual([]);
    expect(ids(tank('gravel', 7))).toEqual(['substrate:deep']);
    expect(ids(tank('pea', 7))).toEqual([]);
    expect(DEEP_MM.mud).toBeLessThan(DEEP_MM.sand);
  });
  it('a terrain mound counts', () => {
    const s = tank('gravel', 2);
    s.terrain = { on: true, cols: 3, rows: 3, h: new Array(9).fill(9 * IN), pools: [] };
    expect(ids(s)).toContain('substrate:deep');
  });
});

describe('bottom dwellers', () => {
  it('kuhli on gravel is a needs Caution; on sand 2 in deep it is fine; on sand 0.5 in it is too shallow', () => {
    expect(ids(tank('gravel', 2, 2, 2, 2, [fish('kuhli')]))).toEqual(['substrate:needs:grain:kuhli']);
    expect(ids(tank('aragonite', 2, 2, 2, 2, [fish('kuhli')]))).toEqual([]);
    expect(ids(tank('aragonite', 0.5, 0.5, 0.5, 0.5, [fish('kuhli')]))).toEqual(['substrate:needs:depth:kuhli']);
  });
  it('corys on smooth gravel is a soft preference; on sand nothing; on crushed coral a needs Caution', () => {
    expect(ids(tank('gravel', 2, 2, 2, 2, [fish('bronzecory')]))).toEqual(['substrate:prefers:bronzecory']);
    expect(ids(tank('aragonite', 2, 2, 2, 2, [fish('bronzecory')]))).toEqual([]);
    expect(ids(tank('coral', 2, 2, 2, 2, [fish('bronzecory')]))).toEqual(['substrate:needs:sharp:bronzecory']);
  });
  it('other fish are untouched', () => { expect(ids(tank('coral', 2, 2, 2, 2, [fish('neon')]))).toEqual([]); });
});

describe('in the verdict and Discover', () => {
  const B = emptyBrief();
  it('needs mismatch is an advisory (not a gate), prefers is an advisory; ids reach the verdict', () => {
    const v = verdictOf(tank('gravel', 2, 2, 2, 2, [fish('kuhli'), fish('bronzecory', 2)]), B);
    const a = v.advisories.map(i => i.id);
    expect(a).toContain('substrate:needs:grain:kuhli');
    expect(a).toContain('substrate:prefers:bronzecory');
    expect(v.gates.some(i => i.id.startsWith('substrate'))).toBe(false);
  });
  it('Guided Discover drops a needs mismatch, Sandbox and prefers do not', () => {
    const v = verdictOf(tank('gravel', 2, 2, 2, 2, [fish('kuhli'), fish('bronzecory', 2)]), B);
    expect(blockingIssues(v, 'guided').map(i => i.id).filter(i => i.startsWith('substrate'))).toEqual(['substrate:needs:grain:kuhli']);
    expect(blockingIssues(v, 'sandbox').map(i => i.id)).not.toContain('substrate:needs:grain:kuhli');
  });
  it('the warning goes away with sand', () => {
    const v = verdictOf(tank('aragonite', 2, 2, 2, 2, [fish('kuhli')]), B);
    expect(v.advisories.some(i => i.id.startsWith('substrate'))).toBe(false);
  });
});

describe('sampling reaches the corners', () => {
  it('a bed that is 6.5 in only at the back corners is still flagged (gravel limit 6 in)', () => {
    expect(ids(tank('gravel', 1, 1, 6.5, 6.5))).toEqual(['substrate:deep']);
  });
});
