// Our stocking engine (lane SE): known-good and known-bad stockings give sane percentages in the right order, and the
// percent is monotonic in animals, filter and volume.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { loadOf, massG, stockingOf } from '../src/scene/stocking';
import { withChoice } from '../src/scene/tech';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const fish = (species: string, n: number, tl?: number): Fish[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(tl ? { tl } : {}) }));
/** A tank of L x D x H inches with these animals (ids numbered afresh), salt or fresh, optional filter row. */
function tank(L: number, D: number, H: number, stock: [string, number][], o: { salt?: boolean; filter?: string; plants?: number } = {}): TankSetup {
  const s = defaultSetup();
  s.tank = { ...s.tank, L: L * IN, D: D * IN, H: H * IN };
  s.water.on = true; s.water.level = 0.9; s.water.salt = !!o.salt;
  s.fish = stock.flatMap(([id, n]) => fish(id, n)).map((f, i) => ({ ...f, id: i + 1 }));
  s.items = Array.from({ length: o.plants ?? 0 }, (_, i) => ({ id: i + 1, kind: 'plant', variant: 'x', seed: i, x: 0, depth: 0, lift: 0, yaw: 0 }) as unknown as Item);
  if (o.filter) s.tech = withChoice(s, 'filter', o.filter);
  return s;
}
const pct = (s: TankSetup) => stockingOf(s).percent;

const SALT = { salt: true };
describe('stocking engine (lane SE)', () => {
  it('mass is FishBase length-weight at the animal length: a neon is about half a gram, an oscar about a kilo, juveniles weigh less', () => {
    expect(massG('neon')).toBeGreaterThan(0.3); expect(massG('neon')).toBeLessThan(0.8);
    expect(massG('oscar')).toBeGreaterThan(600); expect(massG('oscar')).toBeLessThan(1300);
    expect(massG('oscar', 100)).toBeLessThan(massG('oscar') / 20);
    expect(massG('nosuchfish')).toBe(0);
  });
  it('an empty tank reads 0 and says there are no animals', () => {
    const r = stockingOf(tank(30, 12, 16, []));
    expect(r.percent).toBe(0); expect(r.contributors).toEqual([]); expect(r.reasons[0]).toMatch(/No animals/);
  });
  it('a lightly stocked 20 gal community reads well under 100 %', () => {
    const p = pct(tank(30, 12, 16, [['neon', 8], ['bronzecory', 4]]));
    expect(p).toBeGreaterThan(10); expect(p).toBeLessThan(80);
  });
  it('a 20 gal with neons, corydoras and a pleco is close to full, not far over (AqAdvisor puts such a tank near 90-100 %)', () => {
    const p = pct(tank(30, 12, 16, [['neon', 8], ['bronzecory', 4], ['bristlenose', 1]]));
    expect(p).toBeGreaterThan(60); expect(p).toBeLessThan(130);
  });
  it('mbuna cichlids in a 10 gal are overstocked and the peacocks are named as the reason', () => {
    const r = stockingOf(tank(20, 10, 12, [['kribensis', 2], ['peacock', 4]]));
    expect(r.percent).toBeGreaterThan(200); expect(r.contributors[0].id).toBe('peacock');
    expect(r.reasons.join(' ')).toMatch(/Overstocked mainly because of the 4 Peacock/);
  });
  it('a goldfish in a bowl is badly overstocked; two in a 55 gal are not', () => {
    expect(pct(tank(12, 8, 8, [['goldfish', 1]]))).toBeGreaterThan(300);
    expect(pct(tank(48, 13, 20, [['goldfish', 2]]))).toBeLessThan(100);
  });
  it('a blue tang is a big load in a 75 gal reef, and a salt tank counts more per gram than fresh', () => {
    const reef = tank(48, 18, 21, [['bluetang', 1], ['ocellaris', 2]], SALT);
    expect(stockingOf(reef).contributors[0].id).toBe('bluetang');
    expect(pct(reef)).toBeGreaterThan(80);
    const same = { ...reef, water: { ...reef.water, salt: false } };
    expect(pct(reef)).toBeGreaterThan(pct(same));
  });
  it('two oscars in a 55 gal are far over; ordering: community < angelfish < oscars', () => {
    const a = pct(tank(48, 13, 20, [['neon', 10]])), b = pct(tank(48, 13, 20, [['angel', 6]])), c = pct(tank(48, 13, 20, [['oscar', 2]]));
    expect(a).toBeLessThan(b); expect(b).toBeLessThan(c); expect(c).toBeGreaterThan(400);
  });
  it('a heavily filtered, planted tank holds more than a bare one with a sponge filter', () => {
    const stock: [string, number][] = [['rummynose', 12], ['bronzecory', 6], ['angel', 2]];
    const bare = pct(tank(36, 18, 18, stock, { filter: 'sponge' })), strong = pct(tank(36, 18, 18, stock, { filter: 'canister', plants: 30 }));
    expect(strong).toBeLessThan(bare * 0.8);
  });
  it('monotonic: more animals, a bigger tank, a better filter and more plants each move the percent the right way', () => {
    const base = (n: number) => tank(36, 18, 18, [['danio', n]]);
    for (let n = 1; n < 12; n++) expect(pct(base(n + 1))).toBeGreaterThan(pct(base(n)));
    expect(pct(tank(48, 18, 18, [['danio', 10]]))).toBeLessThan(pct(tank(36, 18, 18, [['danio', 10]])));
    const fil = ['none', 'sponge', 'hob', 'canister'].map(f => pct(tank(36, 18, 18, [['danio', 20]], { filter: f })));
    for (let i = 1; i < fil.length; i++) expect(fil[i]).toBeLessThan(fil[i - 1]);
    expect(pct(tank(36, 18, 18, [['danio', 20]], { plants: 20 }))).toBeLessThan(pct(tank(36, 18, 18, [['danio', 20]])));
  });
  it('warmer water raises the load (Q10), and a juvenile loads less than the adult', () => {
    const t = tank(36, 18, 18, [['danio', 10]]);
    expect(loadOf({ species: 'danio' }, 28)).toBeGreaterThan(loadOf({ species: 'danio' }, 22));
    expect(loadOf({ species: 'oscar', tl: 100 })).toBeLessThan(loadOf({ species: 'oscar' }) / 10);
    expect(pct(t)).toBeGreaterThan(0);
  });
  it('land animals are not counted against the water; frogs, newts and axolotls in the water are', () => {
    const geckos = tank(36, 18, 18, [['crestedgecko', 2], ['leopardgecko', 1], ['treefrog', 2]]);
    expect(stockingOf(geckos).percent).toBe(0);
    expect(pct(tank(36, 18, 18, [['axolotl', 2]]))).toBeGreaterThan(0);
    expect(pct(tank(36, 18, 18, [['firenewt', 3]]))).toBeGreaterThan(0);
  });
  it('an overstocked tank names a filter that fixes it when one does, and capacity parts add up', () => {
    const s = tank(36, 18, 18, [['goldfish', 3]], { filter: 'sponge' });
    const r = stockingOf(s);
    expect(r.percent).toBeGreaterThan(100);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
    const c = r.capacity;
    expect(c.capacity).toBeCloseTo(c.litres * c.perL * c.filter * c.plants, 6);
    expect(r.contributors.reduce((a, x) => a + x.load, 0)).toBeCloseTo(r.load, 9);
  });
});
