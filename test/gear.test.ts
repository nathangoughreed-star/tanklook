import { describe, expect, it } from 'vitest';
import { FILTER_MODELS, HEATER_MODELS, defaultFilter, defaultHeater, matchFilter, matchHeater, parseGph } from '../src/demand/gear';
import { price } from '../src/demand/prices';
import { KITS, kitGear } from '../src/data/kits';
import { dealAsKit, type Deal } from '../src/data/deals';
import { defaultProfile, demandOf } from '../src/demand';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';

describe('generic gear models', () => {
  it('every price key exists', () => {
    for (const m of [...FILTER_MODELS, ...HEATER_MODELS]) expect(price(m.priceKey), m.id).toBeDefined();
  });
  it('parses flow text', () => {
    expect(parseGph('3-stage rear, 132 gph pump')).toBe(132);
    expect(parseGph('~230 L/h')).toBeCloseTo(60.8, 0);
    expect(parseGph('QuietFlow 10 LED PRO')).toBeUndefined();
  });
  it('matches product names and flows', () => {
    expect(matchFilter({ name: 'Marineland Penguin 250B' })!.model.id).toBe('hob-l');
    expect(matchFilter({ kind: 'hob', rating: 'QuietFlow 10 LED PRO' })!.model.id).toBe('hob-s');
    expect(matchFilter({ kind: 'hob', rating: '3-stage rear, 132 gph pump' })!.model.id).toBe('hob-s');
    expect(matchFilter({ kind: 'hob', rating: '3-stage rear, 53 gph pump' })!.model.id).toBe('hob-s');
    expect(matchFilter({ kind: 'canister', gph: 450 })!.model.id).toBe('canister-l');
    expect(matchFilter({ kind: 'sponge' })!.model.kind).toBe('sponge');
    expect(matchFilter({ kind: 'hob', gal: 55 })!.how).toBe('size');
  });
  it('keeps the class when a name from another class would win', () => {
    expect(matchFilter({ kind: 'canister', name: 'AquaClear 50' })!.model.kind).toBe('canister');
  });
  it('heater classes round up', () => {
    expect(matchHeater(50).id).toBe('heater-50');
    expect(matchHeater(60).id).toBe('heater-100');
    expect(matchHeater(9999).id).toBe('heater-500');
    expect(defaultHeater(10, 3).watts).toBe(50);
    expect(defaultFilter(20).kind).toBe('hob');
    expect(defaultFilter(100).kind).toBe('canister');
  });
  it('every kit resolves to a generic filter', () => {
    for (const k of KITS) expect(kitGear(k).filterName, k.id).toBeTruthy();
  });
});

describe('engine uses the matched model', () => {
  const S = parseScene(SCENES['planted']).scene.tanks[0], P = defaultProfile(), NOW = Date.parse('2026-10-19');
  const kw = (o: object, key: string) => demandOf(S, P, { now: NOW, ...o }).items.find(i => i.key === key)!;
  it('a kit filter and heater name their generic and drive the power', () => {
    const kit = { id: 'k', priceUsd: 100, asOf: '2026-10-19' };
    const big = kw({ kit: { ...kit, filter: { name: 'Fluval 307' }, heater: { watts: 300 } } }, 'filter');
    expect(big.label).toContain('Canister');
    expect(big.kwhMo).toBeCloseTo(12 * 24 * 30 / 1000, 5);
    expect(kw({ kit: { ...kit, heater: { watts: 300 } } }, 'heater').kwhMo!).toBeGreaterThan(kw({ kit: { ...kit, heater: { watts: 50 } } }, 'heater').kwhMo!);
    expect(kw({}, 'filter').label).toBe('Filter');
  });
  it('a deal inherits its kit gear only for the parts it includes', () => {
    const k = KITS.find(x => x.heater?.watts)!;
    const deal = { id: 'd', retailer: 'R', name: 'n', gal: 10, kit: k.id, includes: ['tank', 'filter', 'heater'], price: { usd: 100 }, url: 'u', asOf: '2026-10-19' } as Deal;
    expect(dealAsKit(deal).heater?.watts).toBe(k.heater!.watts);
    expect(dealAsKit({ ...deal, includes: ['tank'] }).filter).toBeUndefined();
  });
});
