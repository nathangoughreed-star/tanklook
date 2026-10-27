// Our stocking engine (lane SE): known-good and known-bad stockings give sane percentages in the right order, and the
// percent is monotonic in animals, filter and volume.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { isOver, loadOf, massG, plural, schoolScale, schoolShare, stockingLine, stockingOf } from '../src/scene/stocking';
import { tankSizeLine } from '../src/ui/fullnessTile';
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
  if (o.filter === 'none') s.tech = { ...s.tech!, filterless: true }; // an owner's own no-filter tank; a bare 'none' with nothing chosen now runs on an assumed filter (B1)
  return s;
}
// S243 step 4: `percent` is room only now; these tests are about the whole load (room or filtration), loadPercent
const pct = (s: TankSetup) => stockingOf(s).loadPercent;

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
    expect(p).toBeGreaterThan(10); expect(p).toBeLessThan(95); // AqAdvisor: about 70-90 %
  });
  it('a 20 gal with neons, corydoras and a pleco is close to full, not far over (AqAdvisor puts such a tank near 90-100 %)', () => {
    const p = pct(tank(30, 12, 16, [['neon', 8], ['bronzecory', 4], ['bristlenose', 1]]));
    expect(p).toBeGreaterThan(60); expect(p).toBeLessThan(130);
  });
  it('mbuna cichlids in a 10 gal are overstocked and the peacocks are named as the reason', () => {
    const r = stockingOf(tank(20, 10, 12, [['kribensis', 2], ['peacock', 4]]));
    expect(r.percent).toBeGreaterThan(150); // lane HC: 4 peacocks get a height credit (was 200 on raw litres) expect(r.contributors[0].id).toBe('peacock');
    expect(r.reasons.join(' ')).toMatch(/Overstocked mainly because of the 4 Peacock/);
  });
  it('a goldfish in a bowl is badly overstocked; two in a 55 gal are not', () => {
    expect(pct(tank(12, 8, 8, [['goldfish', 1]]))).toBeGreaterThan(300);
    expect(pct(tank(48, 13, 20, [['goldfish', 2]]))).toBeLessThan(100);
  });
  it('a blue tang is a big load in a 75 gal reef, and a salt tank counts more per gram than fresh', () => {
    const reef = tank(48, 18, 21, [['bluetang', 1], ['ocellaris', 2]], SALT);
    expect(stockingOf(reef).contributors[0].id).toBe('bluetang');
    expect(pct(reef)).toBeGreaterThan(25);
    const same = { ...reef, water: { ...reef.water, salt: false } };
    expect(pct(reef)).toBeGreaterThan(pct(same));
  });
  it('two oscars in a 55 gal are far over; ordering: community < angelfish < oscars', () => {
    const a = pct(tank(48, 13, 20, [['neon', 10]])), b = pct(tank(48, 13, 20, [['angel', 6]])), c = pct(tank(48, 13, 20, [['oscar', 2]]));
    expect(a).toBeLessThan(b); expect(b).toBeLessThan(c); expect(c).toBeGreaterThan(100);
  });
  it('a heavily filtered, planted tank holds more than a bare one with a sponge filter', () => {
    const stock: [string, number][] = [['rummynose', 12], ['bronzecory', 6], ['angel', 2]];
    const bare = pct(tank(36, 18, 18, stock, { filter: 'sponge' })), strong = pct(tank(36, 18, 18, stock, { filter: 'canister', plants: 30 }));
    expect(stockingOf(tank(36, 18, 18, stock, { filter: 'canister', plants: 30 })).filtrationPercent).toBeLessThan(stockingOf(tank(36, 18, 18, stock, { filter: 'sponge' })).filtrationPercent); expect(strong).toBeLessThanOrEqual(bare);
  });
  it('monotonic: more animals, a bigger tank, a better filter and more plants each move the percent the right way', () => {
    const base = (n: number) => tank(36, 18, 18, [['danio', n]]);
    for (let n = 1; n < 12; n++) expect(pct(base(n + 1))).toBeGreaterThan(pct(base(n)));
    expect(pct(tank(48, 18, 18, [['danio', 10]]))).toBeLessThan(pct(tank(36, 18, 18, [['danio', 10]])));
    const fil = ['none', 'sponge', 'hob', 'canister'].map(f => stockingOf(tank(36, 18, 18, [['danio', 20]], { filter: f })));
    for (let i = 1; i < fil.length; i++) { expect(fil[i].filtrationPercent).toBeLessThan(fil[0].filtrationPercent); expect(fil[i].percent).toBeLessThanOrEqual(fil[0].percent); } // any filter beats none; which real filter beats which depends on its media (nitrogen.ts)
    expect(stockingOf(tank(36, 18, 18, [['danio', 20]], { plants: 20 })).filtrationPercent).toBeLessThan(stockingOf(tank(36, 18, 18, [['danio', 20]])).filtrationPercent);
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
  it('space and filtration are separate: a better filter lowers filtration only, space only moves with water and animals', () => {
    const a = stockingOf(tank(36, 18, 18, [['danio', 14]], { filter: 'none' })), b = stockingOf(tank(36, 18, 18, [['danio', 14]], { filter: 'canister' }));
    expect(b.spacePercent).toBeCloseTo(a.spacePercent, 9); expect(b.filtrationPercent).toBeLessThan(a.filtrationPercent);
    expect(a.percent).toBeCloseTo(a.spacePercent, 9); expect(a.loadPercent).toBeCloseTo(Math.max(a.spacePercent, a.filtrationPercent), 9); // S243 step 4: fullness = room only
    const crammed = stockingOf(tank(20, 10, 12, [['danio', 40]], { filter: 'sump' }));
    expect(crammed.spacePercent).toBeGreaterThan(100); expect(crammed.reasons.join(' ')).toMatch(/no filter fixes that/);
  });
  it('an overstocked tank names a filter that fixes it when one does, and capacity parts add up', () => {
    const s = tank(48, 13, 20, [['oscar', 2]], { filter: 'sponge' });
    const r = stockingOf(s);
    expect(r.loadPercent).toBeGreaterThan(100);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
    expect(r.nitrogen.tan).toBeCloseTo(r.load, 9);
    expect(r.contributors.reduce((a, x) => a + x.load, 0)).toBeCloseTo(r.load, 9);
  });
  it('snails take no swimming room: 10 trumpet snails in a 5 gal read water space 0 % and a little floor (lane SN), their waste counts in filtration', () => {
    const r = stockingOf(tank(16, 8, 10, [['trumpet', 10]]));
    expect(r.waterPercent).toBe(0); expect(r.floorPercent).toBeGreaterThan(0); expect(r.spacePercent).toBeLessThan(10); expect(r.filtrationPercent).toBeGreaterThan(0); expect(r.percent).toBeLessThan(100);
  });
});

describe('plural (S193)', () => {
  it('ch / sh / x / z take "es"; fish and Latin names in s are their own plural; the rest take "s"', () => {
    expect(plural(8, 'Kuhli loach')).toBe('8 Kuhli loaches');
    expect(plural(3, 'Red marsh')).toBe('3 Red marshes');
    expect(plural(2, 'Box')).toBe('2 Boxes');
    expect(plural(6, 'Fancy goldfish')).toBe('6 Fancy goldfish');
    expect(plural(5, 'Discus')).toBe('5 Discus');
    expect(plural(6, 'Panda corydoras')).toBe('6 Panda corydoras');
    expect(plural(10, 'Neon tetra')).toBe('10 Neon tetras');
    expect(plural(1, 'Kuhli loach')).toBe('1 Kuhli loach');
  });
});

// 2026-10-22 (Nathan's chat, kuhli sanity check; research/habitat-model.md): the school discount is one curve over every fish in the
// water, and a kuhli spreads over FLOOR_FACTOR of its floor footprint. The tank that started it: 17 kuhli + 15 zebra danio in a 36 x 18 x 18 in,
// AqAdvisor 74 %, ours was 104 % (water 104, floor 95).
describe('shrimp and crabs take floor like a bottom fish, scaled by INVERT_FLOOR (2026-10-22)', () => {
  it('100 cherry shrimp fill a 20 x 10 in floor (10 per gallon), 12 take about 12 %; crabs and big shrimp count more each', () => {
    const fl = (s: [string, number][]) => stockingOf(tank(20, 10, 12, s)).floorPercent;
    expect(fl([['cherryshrimp', 100]])).toBeGreaterThan(90); expect(fl([['cherryshrimp', 100]])).toBeLessThan(110);
    expect(fl([['cherryshrimp', 12]])).toBeGreaterThan(8); expect(fl([['cherryshrimp', 12]])).toBeLessThan(16);
    expect(fl([['amano', 1]])).toBeGreaterThan(fl([['cherryshrimp', 1]]));
    expect(fl([['cherryshrimp', 24]])).toBeCloseTo(2 * fl([['cherryshrimp', 12]]), 6);
  });
});

describe('tank-wide school discount and the kuhli floor factor (2026-10-22)', () => {
  it('17 kuhli + 15 zebra danio in a 36 x 18 x 18 in tank read well under full (AqAdvisor 74 %), neither limit near 95 %', () => {
    const r = stockingOf(tank(36, 18, 18, [['kuhli', 17], ['danio', 15]]));
    expect(r.percent).toBeGreaterThan(60); expect(r.percent).toBeLessThan(92);
    expect(r.waterPercent).toBeLessThan(92); expect(r.floorPercent).toBeLessThan(70);
  });
  it('the discount is over all the fish in the water: two schools of 10 read less than the sum of each alone', () => {
    const a = stockingOf(tank(36, 18, 18, [['neon', 10]])).waterPercent, b = stockingOf(tank(36, 18, 18, [['cardinal', 10]])).waterPercent;
    const ab = stockingOf(tank(36, 18, 18, [['neon', 10], ['cardinal', 10]])).waterPercent;
    expect(ab).toBeLessThan(a + b); expect(ab).toBeGreaterThan((a + b) * schoolScale(20) - 1e-9);
    expect(schoolScale(10)).toBe(1); expect(schoolScale(20)).toBeGreaterThan(0.75); expect(schoolScale(20)).toBeLessThan(0.9);
  });
  it('one species reads exactly n x schoolScale(n): the ranked shares of n add up to the flat curve', () => {
    for (const n of [1, 10, 11, 17, 40]) expect(Array.from({ length: n }, (_, i) => schoolShare(i + 1)).reduce((x, y) => x + y)).toBeCloseTo(n * schoolScale(n), 9);
  });
  it('adding an animal never lowers the water reading (6 angels + 30 cherry shrimp read 79 -> 65 % with one flat factor)', () => {
    const w = (st: [string, number][]) => stockingOf(tank(48, 13, 21, st)).waterPercent;
    expect(w([['angel', 6], ['cherryshrimp', 30]])).toBeGreaterThan(w([['angel', 6]]));
    expect(w([['angel', 10], ['ember', 10]])).toBeGreaterThan(w([['angel', 10]]));
    expect(w([['angel', 10], ['ember', 1]])).toBeGreaterThan(w([['angel', 10]]));
  });
  it('snails take no room and do not discount the fish', () => {
    const f = stockingOf(tank(20, 10, 12, [['neon', 12]])).waterPercent, fs = stockingOf(tank(20, 10, 12, [['neon', 12], ['nerite', 10]])).waterPercent;
    expect(fs).toBeCloseTo(f, 6);
  });
  it('bottom dwellers read the same at any height (Nathan 2026-10-22: 10 kuhli read 146 % at 6 in, 54 % at 50 in)', () => {
    const w = [6, 12, 24, 50].map(H => stockingOf(tank(30, 12, H, [['kuhli', 10]])).waterPercent);
    for (const v of w) expect(v).toBeCloseTo(w[0], 0);
    expect(w[0]).toBeGreaterThan(60); expect(w[0]).toBeLessThan(90);
  });
  it('6 kuhli stay inside the floor of their Seriously Fish minimum tank (24 x 12 in base), and the floor stays linear in count', () => {
    const r = stockingOf(tank(24, 12, 12, [['kuhli', 6]]));
    expect(r.floorPercent).toBeGreaterThan(30); expect(r.floorPercent).toBeLessThan(100);
    const f = (n: number) => stockingOf(tank(36, 18, 18, [['kuhli', n]])).floorPercent;
    expect(f(20) / f(10)).toBeCloseTo(2, 6);
  });
});

describe('fullness wording (2026-10-22 review of 12 white clouds + 12 cherry shrimp + 1 ramshorn)', () => {
  it('over is decided on the shown percent: 100.4 reads 100 % and not overstocked, 100.6 reads 101 %, overstocked', () => {
    expect(isOver(100.4)).toBe(false); expect(isOver(100.6)).toBe(true); expect(isOver(Infinity)).toBe(true);
    const r = stockingOf(tank(20, 10, 12, [['whitecloud', 12]]));
    expect(stockingLine({ ...r, percent: 100.4 })).toBe('Stocking 100%'); expect(stockingLine({ ...r, percent: 100.6 })).toBe('Stocking 101%, overstocked');
  });
  it('near full by swimming room does not prescribe water changes; it names fewer animals or a longer tank', () => {
    const near = Array.from({ length: 40 }, (_, i) => stockingOf(tank(20, 10, 12, [['whitecloud', i + 1]]))).find(r => Math.round(r.percent) >= 85 && !isOver(r.percent))!;
    expect(near.spacePercent).toBeGreaterThanOrEqual(near.filtrationPercent);
    expect(near.reasons.join(' ')).not.toMatch(/keep up with water changes/); expect(near.reasons.join(' ')).toMatch(/fewer animals or a longer tank/);
  });
  it('white clouds swim above the floor: they take none of it', () => {
    expect(stockingOf(tank(20, 10, 12, [['whitecloud', 12]])).floorPercent).toBe(0);
  });
  it('the tile names the tank the percents are of', () => {
    const S = tank(20, 10, 12, [['whitecloud', 12]]);
    expect(tankSizeLine(S, stockingOf(S), 'in')).toMatch(/^Tank 2\d.* × 1\d.* in, [\d.]+ gal of water$/);
  });
});
