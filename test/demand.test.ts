import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile, demandOf, drivers, limitState, plantDifficulty, riskLabel } from '../src/demand';
import { swapsFor } from '../src/demand/swaps';
import { fitToLimits, hasLimits } from '../src/demand/fit';
import { mean3 } from '../src/demand/range';
import { parseScene } from '../src/scene/validate';

// Demand model engine (lane KK phase 1, 2026-10-19). Fixed `now` keeps the price-age widening stable.
const NOW = Date.parse('2026-10-19');
const run = (id: string, mod: (p: ReturnType<typeof defaultProfile>) => void = () => {}) => {
  const S = parseScene(SCENES[id]).scene.tanks[0], P = defaultProfile(); mod(P);
  const D = demandOf(S, P, { now: NOW });
  return { S, P, D };
};
const ids = ['planted', 'iwagumi', 'betta', 'reef', 'terrarium', 'paludarium'];
const fmt = (id: string) => { const { D } = run(id); return `${id}: ${Math.round(D.gallons)} gal setup ${D.totals.setupUsd.toFixed(0)} upkeep ${D.totals.upkeepUsdMo.toFixed(1)} min ${D.totals.minPerWeek.toFixed(0)} risk ${D.totals.risk.toFixed(1)}`; };

describe('triangle mean', () => {
  it('mean3 is the mean of the triangle', () => { expect(mean3({ lo: 2, mode: 3, hi: 10 })).toBeCloseTo(5); });
});
describe('plant difficulty is derived from NEEDS', () => {
  it('floaters and epiphytes easy, CO2-required reds and carpets hard', () => {
    for (const v of ['salvinia', 'frogbit', 'anubias', 'moss', 'crypt']) expect(plantDifficulty(v), v).toBe(0);
    for (const v of ['stemred', 'carpet', 'rotala']) expect(plantDifficulty(v), v).toBe(2);
    expect(plantDifficulty('sword')).toBe(1);
  });
});
describe('demandOf on the starter examples', () => {
  it('prints a summary and every total is positive and finite', () => {
    for (const id of ids) { const { D } = run(id); console.log(fmt(id)); for (const v of Object.values(D.totals)) expect(Number.isFinite(v)).toBe(true); expect(D.totals.setupUsd).toBeGreaterThan(0); expect(D.totals.minPerWeek).toBeGreaterThan(0); }
  });
  it('plausible ranges', () => {
    const betta = run('betta'), planted = run('planted'), reef = run('reef');
    expect(betta.D.totals.setupUsd).toBeGreaterThan(40); expect(betta.D.totals.setupUsd).toBeLessThan(400);
    expect(planted.D.totals.setupUsd).toBeGreaterThan(betta.D.totals.setupUsd);
    expect(planted.D.totals.upkeepUsdMo).toBeGreaterThan(5); expect(planted.D.totals.upkeepUsdMo).toBeLessThan(120);
    expect(planted.D.totals.minPerWeek).toBeGreaterThan(20); expect(planted.D.totals.minPerWeek).toBeLessThan(180);
    expect(reef.D.totals.setupUsd).toBeGreaterThan(planted.D.totals.setupUsd); // salt costs more
    expect(reef.D.totals.minPerWeek).toBeGreaterThan(planted.D.totals.minPerWeek * 0.8);
    // (reef above planted held only through five reef species wrongly flagged as temperature clashes; no independent reason keeps that
    // ranking, so the mechanism is tested below instead: temp-tiers 2026-10-22)
  });
  it('temperature risk: a narrow overlap carries no incompatibility points, a genuine clash still does, the rest is untouched', () => {
    // the planted tank with its fish replaced: the same animal rows with and without a tankmate whose range meets theirs narrowly or not at all
    const withFish = (...ids: [string, number][]) => {
      const S = structuredClone(parseScene(SCENES.planted).scene.tanks[0]); let k = 1;
      S.fish = ids.flatMap(([species, n]) => Array.from({ length: n }, () => ({ id: k++, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
      return demandOf(S, defaultProfile(), { now: NOW });
    };
    const rowRisk = (D: ReturnType<typeof demandOf>, id: string) => D.items.find(r => r.key === `animal:${id}`)!.risk;
    const temps = (D: ReturnType<typeof demandOf>) => D.warnings.filter(w => /temperature/.test(w));
    // cardinal 23-29 and German blue ram 27-30 share 27-29: narrow, no warning, the cardinal's row carries the same risk as alone
    const alone = withFish(['cardinal', 6]), narrow = withFish(['cardinal', 6], ['gbr', 2]);
    expect(temps(narrow)).toEqual([]);
    expect(rowRisk(narrow, 'cardinal')).toBeCloseTo(rowRisk(alone, 'cardinal'), 9);
    // goldfish and discus share nothing: the goldfish row warns and gains the compatibility points (the engine records each species'
    // main blocking reason; the discus's main one is not temperature)
    const gold = withFish(['goldfish', 2]), clash = withFish(['goldfish', 2], ['discus', 5]);
    expect(temps(clash)).toEqual([expect.stringMatching(/^Fancy goldfish: water temperature: No suitable shared temperature identified/)]);
    expect(rowRisk(clash, 'goldfish')).toBeGreaterThan(rowRisk(gold, 'goldfish'));
    // what is not temperature stays: the tank, filter and routine rows are the same with or without the narrow tankmate
    const rest = (D: ReturnType<typeof demandOf>) => D.items.filter(r => !r.key.startsWith('animal:')).map(r => [r.key, r.risk]);
    expect(rest(narrow).filter(([k]) => !/^(food|feed|water|nitro|bio)/.test(String(k)))).toEqual(rest(alone).filter(([k]) => !/^(food|feed|water|nitro|bio)/.test(String(k))));
  });
  it('risk falls with skill and the salt multiplier shows up', () => {
    const novice = run('reef').D.totals.risk, expert = run('reef', p => { p.skill = { fundamentals: 2, fish: 2, planted: 2, salt: 2, terrarium: 2 }; }).D.totals.risk;
    expect(expert).toBeLessThan(novice * 0.7);
    expect(riskLabel(0)).toBe('safe'); expect(riskLabel(9)).toBe('demanding');
  });
  it('a terrarium has no water changes, a water source changes the upkeep', () => {
    expect(run('terrarium').D.items.some(i => i.key === 'waterchange')).toBe(false);
    const tap = run('planted').D.totals.upkeepUsdMo, ro = run('planted', p => { p.waterSource = 'bought-ro'; }).D.totals.upkeepUsdMo;
    expect(ro).toBeGreaterThan(tap);
  });
});
describe('kit pricing', () => {
  it('a kit price replaces the parts it contains', () => {
    const S = parseScene(SCENES['betta']).scene.tanks[0], P = defaultProfile();
    const parts = demandOf(S, P, { now: NOW }), kit = demandOf(S, P, { now: NOW, kit: { id: 'x', priceUsd: 60, asOf: '2026-10-19' } });
    expect(kit.items.some(i => i.key === 'kit')).toBe(true);
    expect(kit.items.find(i => i.key === 'tank')?.setup).toBeUndefined();
    expect(kit.totals.setupUsd).toBeLessThan(parts.totals.setupUsd);
    expect(kit.totals.upkeepUsdMo).toBeCloseTo(parts.totals.upkeepUsdMo, 5); // electricity still counted
  });
});
describe('researched prices (phase 2)', () => {
  it('every row has an ordered range and a source or an est flag', async () => {
    const { default: d } = await import('../src/data/demand-items.json');
    const rows = Object.entries(d.rows as Record<string, { lo: number; mode: number; hi: number; url: string; est?: boolean }>);
    expect(rows.length).toBeGreaterThan(170);
    for (const [k, r] of rows) { expect(r.lo, k).toBeLessThanOrEqual(r.mode); expect(r.mode, k).toBeLessThanOrEqual(r.hi); expect(r.est || r.url, k).toBeTruthy(); }
  });
});
describe('swaps', () => {
  it('suggest cheaper or easier replacements that lower the chosen bar', () => {
    const { S, P } = run('planted');
    const sw = swapsFor(S, P, 'plant:stemred', 'setup', { now: NOW });
    expect(sw.length).toBeGreaterThan(0);
    for (const s of sw) expect(s.delta.setup).toBeLessThan(0);
    for (const v of ['sword', 'hornwort', 'stem']) for (const s of swapsFor(S, P, `plant:${v}`, 'setup', { now: NOW }, 20)) expect(['echeveria', 'haworthia', 'jade', 'aloe', 'burrotail', 'barrel', 'sansevieria', 'agave', 'columnar']).not.toContain(s.toId);
    const an = swapsFor(S, P, 'animal:oto', 'risk', { now: NOW });
    for (const s of an) expect(s.delta.risk).toBeLessThan(0);
  });
});
describe('fit to limits', () => {
  it('swaps toward cheaper / easier until the limits hold, or says what is left', () => {
    const S = parseScene(SCENES['planted']).scene.tanks[0], P = defaultProfile();
    expect(hasLimits(P)).toBe(false);
    P.limits = { setupUsd: 1200 };
    const r = fitToLimits(S, P, { now: NOW });
    expect(r.swaps.length).toBeGreaterThan(0);
    const before = demandOf(S, P, { now: NOW }).totals.setupUsd, after = demandOf(r.scene, P, { now: NOW }).totals.setupUsd;
    expect(after).toBeLessThan(before);
    expect(r.after.setup.value).toBeLessThanOrEqual(r.before.setup.value);
    const none = fitToLimits(S, defaultProfile(), { now: NOW });
    expect(none.swaps.length).toBe(0);
  });
});
describe('expected cost (lane DS: one number, no spread)', () => {
  // Means of the old 20000-draw Monte Carlo (cost.ts, deleted 2026-10-19) for fixed setups; the expected value must not move. Upkeep and minutes re-blessed 2026-10-21 (lane MW: water changes now follow the nitrogen budget, new feeding / glass / plant rows), and again by lane CB (combined sources: larger adult sizes, more waste); setup is unchanged. Terrarium re-blessed 2026-10-26 (lane LT: heat, UVB and gauge rows, spot cleaning instead of misting when the animals want under 60 % humidity).
  // Paludarium, terrarium, rainforest and arid re-blessed 2026-10-26 (starter tanks pass their animal checks: one gecko each, three toads with white clouds, a 30 in corner tank for three tree frogs).
  const GOLD: Record<string, number[]> = {"planted/0": [1352.56, 53.39, 55.66], "planted/1": [1352.56, 56.2, 55.66], "planted/2": [1352.56, 58.21, 55.66], "iwagumi/0": [2141.73, 43.37, 53.94], "iwagumi/1": [2141.73, 43.44, 53.94], "iwagumi/2": [2141.73, 37.38, 53.94], "betta/0": [332.12, 9.64, 33.95], "betta/1": [332.12, 11.15, 33.95], "betta/2": [332.12, 10.61, 33.95], "reef/0": [3581.29, 178.47, 89.57], "reef/1": [3581.29, 191.57, 89.57], "reef/2": [3581.29, 171.97, 89.57], "terrarium/0": [1913.52, 35.42, 17.43], "terrarium/1": [1913.52, 38.73, 17.43], "terrarium/2": [1913.52, 35.42, 17.43], "paludarium/0": [1376.95, 43.02, 56], "paludarium/1": [1376.95, 48.57, 56], "paludarium/2": [1376.95, 48.47, 56]};
  const prof = (v: number) => (P: ReturnType<typeof defaultProfile>) => { if (v === 1) { P.kwhUsd = 0.3; P.skill.fish = 1; } if (v === 2) { P.skill.salt = 2; P.skill.planted = 2; P.waterSource = 'bought-ro'; } };
  it('the expected value equals the old Monte Carlo mean for fixed setups', () => {
    for (const [k, [setup, upkeep, minutes]] of Object.entries(GOLD)) {
      const [id, v] = k.split('/'), { D } = run(id, prof(+v));
      expect(Math.abs(D.totals.setupUsd / setup - 1), k + ' setup').toBeLessThan(0.01);
      expect(Math.abs(D.totals.upkeepUsdMo / upkeep - 1), k + ' upkeep').toBeLessThan(0.03); // the old sample mean also carried the mean of the kWh-rate spread (x1.033 on electricity)
      expect(Math.abs(D.totals.minPerWeek / minutes - 1), k + ' minutes').toBeLessThan(0.01);
    }
  });
  it('a limit is read against the expected value, nothing else', () => {
    const { D, P } = run('planted');
    P.limits.setupUsd = Math.ceil(D.totals.setupUsd);
    expect(limitState(D, P).setup.over).toBe(false);
    P.limits.setupUsd = Math.floor(D.totals.setupUsd) - 1;
    expect(limitState(D, P).setup.over).toBe(true);
    expect(limitState(D, { ...P, limits: { ...P.limits, budgetMode: 'cap' } as typeof P.limits }).setup.over).toBe(true);
  });
  it('drivers lists the biggest first and adds up to the bar', () => {
    const { D, P } = run('planted'), d = drivers(D, P, 'setup', 99);
    expect(d.length).toBeGreaterThan(2);
    for (let i = 1; i < d.length; i++) expect(d[i - 1].mean).toBeGreaterThanOrEqual(d[i].mean);
    expect(d.reduce((t, r) => t + r.mean, 0)).toBeCloseTo(D.totals.setupUsd, 0);
    const u = drivers(D, P, 'upkeep', 99);
    expect(u.reduce((t, r) => t + r.mean, 0)).toBeCloseTo(D.totals.upkeepUsdMo, 1);
  });
});

describe('bundle deals (lane KD)', () => {
  it('a tank+stand deal replaces only those parts, drops expired sales, and reports the saving', async () => {
    const { dealOffers } = await import('../src/demand/deals');
    const { dealsFor } = await import('../src/data/deals');
    const S = parseScene(SCENES['planted']).scene.tanks[0], P = defaultProfile(), gal = Math.round(demandOf(S, P, { now: NOW }).gallons);
    S.stand.show = true;
    const deal = { id: 't', retailer: 'X', name: 'combo', gal, includes: ['tank', 'stand' as const], price: { usd: 50, regularUsd: 90 }, url: 'https://x', asOf: '2026-10-19' } as never;
    const expired = { ...(deal as object), id: 'e', saleEnds: '2026-10-01' } as never;
    expect(dealsFor(gal, true, NOW, 2.5, [deal, expired]).map(d => d.id)).toEqual(['t']);
    expect(dealsFor(gal, false, NOW, 2.5, [deal])).toEqual([]);
    const o = dealOffers(S, P, { now: NOW }, [deal])[0];
    expect(o.savingUsd).toBeGreaterThan(0);
    expect(o.saleOffUsd).toBe(40);
    const D = demandOf(S, P, { now: NOW, kit: { id: 't', priceUsd: 50, asOf: '2026-10-19', includes: ['tank', 'stand'] } });
    expect(D.items.find(i => i.key === 'stand')?.setup).toBeUndefined();
    expect(D.items.find(i => i.key === 'filter')?.setup).toBeDefined();
  });
});

describe('featured deals (lane KD)', () => {
  it('builds a scene from a catalog deal, features it, and hides stale or expired ones', async () => {
    const { featuredDeals, sceneFromDeal } = await import('../src/demand/dealscene');
    const { DEALS } = await import('../src/data/deals');
    const d = DEALS.find(x => x.tank && x.price.regularUsd)!;
    const sc = sceneFromDeal(d)!;
    expect(sc.tanks[0].stand.show).toBe(true);
    const now = Date.parse(d.asOf) + 864e5;
    expect(featuredDeals(now, 5, [d]).length).toBe(1);
    expect(featuredDeals(Date.parse(d.asOf) + 40 * 864e5, 5, [d])).toEqual([]);
    expect(featuredDeals(now, 5, [{ ...d, saleEnds: '2000-01-01' }])).toEqual([]);
    expect(featuredDeals(now, 5, DEALS.filter(x => !x.tank))).toEqual([]);
  });
});

describe('percent off (lane KD)', () => {
  it('rounds to a whole percent and needs a higher regular price', async () => {
    const { pctOff } = await import('../src/data/deals');
    const d = (usd: number, regularUsd?: number) => ({ price: { usd, regularUsd } }) as never;
    expect(pctOff(d(499.99, 799.99))).toBe(38);
    expect(pctOff(d(399.99))).toBeUndefined();
    expect(pctOff(d(100, 100))).toBeUndefined();
  });
});

describe('deal scene light (lane KD)', () => {
  it('a bundle with a light gets an LED bar in the scene; its watts feed the power use', async () => {
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    const { DEALS } = await import('../src/data/deals');
    const d = DEALS.find(x => x.tank && x.includes.includes('light'))!;
    const L = sceneFromDeal(d)!.tanks[0].light;
    expect(L.type).toBe('led');
    expect(L.tech).toBe('led-white');
  });
});

describe('deal guesses (lane KD)', () => {
  it('a light without published watts is listed as a guess; a stated one is not', async () => {
    const { dealGuesses } = await import('../src/data/deals');
    const base = { id: 'x', retailer: 'R', name: 'n', gal: 20, includes: ['tank', 'light'], price: { usd: 1 }, url: 'https://x', asOf: '2026-10-19' };
    expect(dealGuesses({ ...base } as never).some(g => g.includes('light power'))).toBe(true);
    expect(dealGuesses({ ...base, look: { light: { watts: 20, par: 40 } } } as never)).toEqual([]);
    expect(dealGuesses({ ...base, includes: ['tank'], look: { guessed: ['stand colour'] } } as never)).toEqual(['stand colour']);
  });
  it('a catalog tank without the listing\'s dims is a guess; with dims the scene takes the real outer size', async () => {
    const { dealGuesses, DEALS } = await import('../src/data/deals');
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    const base = { id: 'x', retailer: 'R', name: 'n', gal: 10, tank: 'g8c', includes: ['tank'], price: { usd: 1 }, url: 'https://x', asOf: '2026-10-19' };
    expect(dealGuesses(base as never).some(g => g.startsWith('tank size'))).toBe(true);
    const d = { ...base, dims: { L_in: 14.09, D_in: 14.09, H_in: 14.09 } };
    expect(dealGuesses(d as never)).toEqual([]);
    const T = sceneFromDeal(d as never)!.tanks[0].tank, glass = 4; // g8c glass
    expect(T.L + 2 * glass).toBeCloseTo(14.09 * 25.4, 0);
    expect(T.H + glass).toBeCloseTo(14.09 * 25.4, 0);
    for (const x of DEALS.filter(x => x.dims)) { // every recorded size is a real tank shape (inches, not mm or gallons)
      for (const v of [x.dims!.L_in, x.dims!.D_in, x.dims!.H_in]) expect(v, x.id).toBeGreaterThan(6), expect(v, x.id).toBeLessThan(80);
    }
  });
});

describe('stacked deal savings', () => {
  it('splits the total into sale + bundle and words each case', async () => {
    const { savingSplit, savingLine, DEALS } = await import('../src/data/deals');
    const d = { ...DEALS[0], price: { usd: 100, regularUsd: 130 } };
    expect(savingSplit(d, 95)).toEqual({ total: 95, sale: 30, bundle: 65 });
    expect(savingLine(d, 95)).toBe('Save about $95: $30 sale + $65 bundle, against buying the parts');
    expect(savingLine(d, 20)).toMatch(/all from the \$30 sale .*about \$10 over/);
    expect(savingLine(d, -5)).toMatch(/\$30 off on sale, but still about \$5 over/);
    const plain = { ...DEALS[0], price: { usd: 100 } };
    expect(savingLine(plain, 40)).toBe('Save about $40 as a bundle, against buying the parts');
    expect(savingLine(plain, -12)).toBe('About $12 over buying the parts');
  });
});
describe('bare-tank sales (parts estimate)', () => {
  it('finds the cheapest live sale at the size and shape, and drops stale or ended ones', async () => {
    const { tankSaleFor } = await import('../src/data/tanks');
    const v = (o: object) => ({ brand: 'B', L_in: 48, D_in: 13, H_in: 21, price_kind: 'street', checked: '2026-10-19', ...o });
    const m = (variants: object[], shape = 'rect') => ({ id: 'x', name: 'x', ratedGal: 55, shape, outer: { L: 1, H: 1, D: 1 }, glassMm: 6, band: 'mid', source: 's', variants }) as never;
    const now = Date.parse('2026-10-20');
    const models = [m([v({ price_usd: 100, regular_usd: 200, retailer: 'Petco' }), v({ price_usd: 90, regular_usd: 95 }), v({ price_usd: 80 })])];
    expect(tankSaleFor(55, 'rect', now, 2.5, models)).toMatchObject({ usd: 90, regularUsd: 95 });
    expect(tankSaleFor(55, 'bow', now, 2.5, models)).toBeUndefined();
    expect(tankSaleFor(55, 'rect', Date.parse('2026-12-31'), 2.5, models)).toBeUndefined();
    expect(tankSaleFor(55, 'rect', now, 2.5, [m([v({ price_usd: 50, regular_usd: 99, sale_ends: '2026-10-18' })])])).toBeUndefined();
    expect(tankSaleFor(55, 'rect', now, 2.5, [m([v({ price_usd: 50, regular_usd: 99, line: 'acrylic' })])])).toBeUndefined();
  });
});
describe('stand not chosen yet', () => {
  it('counts a stand only once added: undecided and "I don\'t need a stand" count nothing (Nathan 2026-10-26)', async () => {
    const { demandOf } = await import('../src/demand/engine');
    const { defaultProfile } = await import('../src/demand/types');
    const { emptyScene } = await import('../src/scene/defaults');
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    const { DEALS } = await import('../src/data/deals');
    const S = emptyScene().tanks[0], P = defaultProfile(), row = (st: object) => demandOf({ ...S, stand: { ...S.stand, ...st } }, P).items.find(r => r.key === 'stand');
    expect(row({ show: false, need: 'ask' })).toBeUndefined();
    expect(row({ show: false, need: 'none' })).toBeUndefined();
    expect(row({ show: true, need: 'added' })?.label).toBe('Stand');
    const kit = DEALS.find(d => d.tank && !d.includes.includes('stand'))!, ens = DEALS.find(d => d.tank && d.includes.includes('stand'))!;
    expect(sceneFromDeal(kit)!.tanks[0].stand).toMatchObject({ show: false, need: 'ask' });
    expect(sceneFromDeal(ens)!.tanks[0].stand.show).toBe(true);
  });
});
describe('path-1 gear and lid advice (Nathan 2026-10-26)', () => {
  it('a tank started from its animals counts no filter or heater until the owner adds one; an ordinary tank still does', async () => {
    const { demandOf } = await import('../src/demand/engine');
    const { defaultProfile } = await import('../src/demand/types');
    const { emptyScene } = await import('../src/scene/defaults');
    const S0 = emptyScene().tanks[0], S = { ...S0, water: { ...S0.water, on: true } }, P = defaultProfile();
    const keys = (T: typeof S) => demandOf(T, P).items.map(r => r.key);
    expect(keys(S)).toEqual(expect.arrayContaining(['filter', 'heater', 'filterclean']));
    const p1 = keys({ ...S, stockFirst: true });
    expect(p1).not.toContain('filter'); expect(p1).not.toContain('heater'); expect(p1).not.toContain('filterclean');
    expect(keys({ ...S, stockFirst: true, tech: { rows: { filter: 'hob', heater: 'one' } } })).toEqual(expect.arrayContaining(['filter', 'heater']));
  });
  it('an open top with animals that get out suggests a lid: mesh when dry, glass when wet; none for plain fish or a lidded tank', async () => {
    const { lidAdvice } = await import('../src/demand/lid');
    const { emptyScene } = await import('../src/scene/defaults');
    const S0 = emptyScene().tanks[0], f = (species: string) => ({ id: 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 });
    const dry = { ...S0, lid: 'open' as const, water: { ...S0.water, on: false }, fish: [f('regaljumper')] };
    expect(lidAdvice(dry)).toMatchObject({ lid: 'mesh', who: ['Regal jumping spider'] });
    expect(lidAdvice({ ...dry, lid: 'mesh' })).toBeUndefined();
    const wet = { ...dry, water: { ...S0.water, on: true } };
    expect(lidAdvice({ ...wet, fish: [f('hatchet')] })?.lid).toBe('glass');
    expect(lidAdvice({ ...wet, fish: [f('neon')] })).toBeUndefined();
  });
});
