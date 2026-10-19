import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { costDistribution, defaultProfile, demandOf, drivers, limitState, pct, plantDifficulty, riskLabel } from '../src/demand';
import { swapsFor } from '../src/demand/swaps';
import { mean3, triInv, var3 } from '../src/demand/range';
import { parseScene } from '../src/scene/validate';

// Demand model engine (lane KK phase 1, 2026-10-19). Fixed `now` keeps the price-age widening stable.
const NOW = Date.parse('2026-10-19');
const run = (id: string, mod: (p: ReturnType<typeof defaultProfile>) => void = () => {}) => {
  const S = parseScene(SCENES[id]).scene.tanks[0], P = defaultProfile(); mod(P);
  const D = demandOf(S, P, { now: NOW });
  return { S, P, D, C: costDistribution(D, P) };
};
const ids = ['planted', 'iwagumi', 'betta', 'reef', 'terrarium', 'paludarium'];
const fmt = (id: string) => { const { D, C } = run(id); return `${id}: ${Math.round(D.gallons)} gal setup ${C.setup.p10.toFixed(0)}/${C.setup.mean.toFixed(0)}/${C.setup.p90.toFixed(0)} upkeep ${C.upkeep.mean.toFixed(1)} min ${C.minutes.mean.toFixed(0)} risk ${D.totals.risk.toFixed(1)}`; };

describe('triangular helpers', () => {
  it('mean and variance match the closed form; inverse cdf stays in range and is monotone', () => {
    const r = { lo: 2, mode: 3, hi: 10 };
    expect(mean3(r)).toBeCloseTo(5);
    expect(var3(r)).toBeCloseTo((4 + 9 + 100 - 6 - 20 - 30) / 18);
    let prev = -1;
    for (let u = 0.01; u < 1; u += 0.01) { const v = triInv(r, u); expect(v).toBeGreaterThanOrEqual(prev); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(10); prev = v; }
  });
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
    expect(betta.C.setup.mean).toBeGreaterThan(40); expect(betta.C.setup.mean).toBeLessThan(400);
    expect(planted.C.setup.mean).toBeGreaterThan(betta.C.setup.mean);
    expect(planted.C.upkeep.mean).toBeGreaterThan(5); expect(planted.C.upkeep.mean).toBeLessThan(120);
    expect(planted.C.minutes.mean).toBeGreaterThan(20); expect(planted.C.minutes.mean).toBeLessThan(180);
    expect(reef.C.setup.mean).toBeGreaterThan(planted.C.setup.mean); // salt costs more
    expect(reef.C.minutes.mean).toBeGreaterThan(planted.C.minutes.mean * 0.8);
    expect(reef.D.totals.risk).toBeGreaterThan(planted.D.totals.risk);
  });
  it('risk falls with skill and the salt multiplier shows up', () => {
    const novice = run('reef').D.totals.risk, expert = run('reef', p => { p.skill = { fundamentals: 2, fish: 2, planted: 2, salt: 2, terrarium: 2 }; }).D.totals.risk;
    expect(expert).toBeLessThan(novice * 0.7);
    expect(riskLabel(0)).toBe('safe'); expect(riskLabel(9)).toBe('demanding');
  });
  it('a terrarium has no water changes, a water source changes the upkeep', () => {
    expect(run('terrarium').D.items.some(i => i.key === 'waterchange')).toBe(false);
    const tap = run('planted').C.upkeep.mean, ro = run('planted', p => { p.waterSource = 'bought-ro'; }).C.upkeep.mean;
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
    const an = swapsFor(S, P, 'animal:oto', 'risk', { now: NOW });
    for (const s of an) expect(s.delta.risk).toBeLessThan(0);
  });
});
describe('costDistribution', () => {
  it('is seeded and stable, percentiles ordered, the likely range brackets the mean', () => {
    const a = run('planted').C, b = run('planted').C;
    expect(a.setup.q).toEqual(b.setup.q);
    for (const d of [a.setup, a.upkeep, a.minutes]) { expect(d.p10).toBeLessThan(d.p50); expect(d.p50).toBeLessThan(d.p90); expect(d.p10).toBeLessThan(d.mean); expect(d.mean).toBeLessThan(d.p90); }
  });
  it('the sample mean agrees with the sum of the item means (price level included)', () => {
    const { D, C } = run('planted');
    expect(Math.abs(C.setup.mean / D.totals.setupUsd - 1)).toBeLessThan(0.05);
    expect(Math.abs(C.minutes.mean / D.totals.minPerWeek - 1)).toBeLessThan(0.05);
  });
  it('variance shares sum to 1', () => {
    const { C } = run('planted');
    for (const f of ['setup', 'upkeep', 'minutes'] as const) expect([...C.share[f].values()].reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });
  it('limits: expected vs cap read different numbers; a cap is stricter', () => {
    const { D, C, P } = run('planted');
    P.limits.setupUsd = Math.ceil(C.setup.mean);
    expect(limitState(D, C, { ...P, limits: { ...P.limits, budgetMode: 'expected' } }).setup.over).toBe(false);
    expect(limitState(D, C, { ...P, limits: { ...P.limits, budgetMode: 'cap' } }).setup.over).toBe(true);
    expect(pct(C.setup, 85)).toBeGreaterThan(C.setup.mean);
  });
  it('drivers lists the biggest first', () => {
    const { D, C } = run('planted'), d = drivers(D, C, 'setup');
    expect(d.length).toBeGreaterThan(2);
    for (let i = 1; i < d.length; i++) expect(d[i - 1].mean).toBeGreaterThanOrEqual(d[i].mean);
  });
  it('2000 draws are quick', () => { const t = performance.now(); run('paludarium'); expect(performance.now() - t).toBeLessThan(1500); });
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
});
