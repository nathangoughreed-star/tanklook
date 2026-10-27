import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import {
  applyPreset, coldSpecies, feedFor, feedOf, filterFor, heatLoss, inferTech, optionCost, parseTech, presetsFor, rowsFor,
  setFeed, stockCapacity, techOf, techParts, walstadGaps, withChoice,
} from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';
import { getSpecies } from '../src/data/species';
import { whyAnimal } from '../src/scene/animalfit';
import { whyNot } from '../src/scene/plantfit';
import { reefFeedOf, tempEvidence } from '../src/scene/tech';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';

const tankOf = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
/** The planted example, resized (mm) and emptied of animals unless asked. */
function sized(L: number, D: number, H: number, o: { fish?: boolean; lid?: TankSetup['lid'] } = {}): TankSetup {
  const S = structuredClone(tankOf('planted'));
  S.tank = { ...S.tank, L, D, H };
  if (!o.fish) S.fish = [];
  if (o.lid) S.lid = o.lid;
  delete S.tech;
  return S;
}
const G10 = () => sized(508, 254, 305), G20L = (lid?: TankSetup['lid']) => sized(762, 305, 305, { lid }), G75 = () => sized(1219, 457, 533);

describe('tech menu model (lane TM step 1)', () => {
  it('an old file infers the gear the demand engine assumed, and the same grow feed', () => {
    for (const id of Object.keys(SCENES)) {
      const S = tankOf(id);
      expect(S.tech, id).toBeUndefined();
      const t = techOf(S);
      // a dry tank: only its own rows (lamps, misting), a basking lamp and UVB inferred when an animal wants a warm spot
      if (!S.water.on) { expect(rowsFor(S).map(r => r.water), id).toEqual(rowsFor(S).map(() => 'dry')); expect(rowsFor(S).length, id).toBe(6); continue; }
      expect(feedFor(S), id).toBe(S.grow.feed);
      if (!S.water.salt) expect(feedOf(t), id).toBe(S.grow.feed);
      else expect(t.rows.skimmer, id).toBe('hob'); // lane SF: no sump in the inferred filter, so a hang-on skimmer
      expect(t.rows.heater, id).toBe('one');
    }
  });

  it('grow feed derives from the CO2 + ferts rows, and the Plant care slider sets them', () => {
    const S = G20L();
    const by = (id: string) => feedOf(applyPreset(S, id));
    expect([by('walstad'), by('lowtech'), by('midplanted'), by('hightech')]).toEqual(['low', 'low', 'ferts', 'co2']);
    for (const f of ['low', 'ferts', 'co2'] as const) for (const p of ['walstad', 'lowtech', 'midplanted', 'hightech'])
      expect(feedOf(setFeed(applyPreset(S, p), f)), `${p} -> ${f}`).toBe(f);
    // the slider keeps what already fits: EI stays EI when going to CO2
    expect(setFeed(applyPreset(S, 'midplanted'), 'co2').rows.co2).toBe('pressurized');
    expect(setFeed({ rows: { co2: 'none', ferts: 'ei' } }, 'co2').rows.ferts).toBe('ei');
  });

  it('presets by water, and Walstad says what it lacks', () => {
    expect(presetsFor(G20L()).map(p => p.id)).toEqual(['walstad', 'lowtech', 'midplanted', 'hightech']);
    const reef = tankOf('reef');
    expect(presetsFor(reef).map(p => p.id)).toEqual(['fowlr', 'soft', 'lps', 'sps']);
    expect(rowsFor(reef).some(r => r.id === 'co2')).toBe(false);
    expect(rowsFor(G20L()).some(r => r.id === 'skimmer')).toBe(false);
    const bare = G20L(); bare.items = []; bare.substrate = { ...bare.substrate, type: 'gravel' };
    expect(walstadGaps(bare).length).toBe(2);
  });

  it('heat loss: area, tank temperature and room temperature; a lid cuts it', () => {
    const open = { ...G20L('open'), tech: { rows: {}, roomC: 19 } }, lid = { ...G20L('glass'), tech: { rows: {}, roomC: 19 } };
    const h = heatLoss(open), hl = heatLoss(lid);
    expect(h.targetC).toBe(24); // no animals: the freshwater fallback 22-26
    expect(h.lossW).toBeGreaterThan(25); expect(h.lossW).toBeLessThan(55); // 20 gal long, 5 K: ~40 W open
    expect(hl.lossW).toBeLessThan(h.lossW * 0.8);
    expect(heatLoss({ ...G75(), tech: { rows: {}, roomC: 19 } }).heater.watts).toBeGreaterThan(h.heater.watts);
    // a warm room needs no heat; a reef in a hot room wants a chiller
    expect(heatLoss({ ...open, tech: { rows: {}, roomC: 26 } }).lossW).toBe(0);
    expect(heatLoss({ ...tankOf('reef'), tech: { rows: {}, roomC: 29 } }).coolW).toBeGreaterThan(0);
  });

  it('a colder room raises the heater kWh', () => {
    const at = (c: number) => optionCost({ ...G20L(), tech: { rows: {}, roomC: c } }, 'heater', 'one').kwhMo;
    expect(at(17)).toBeGreaterThan(at(20));
    expect(at(20)).toBeGreaterThan(at(23));
    // two heaters split the power, not the energy
    const S = { ...G75(), tech: { rows: {}, roomC: 18 } };
    expect(optionCost(S, 'heater', 'two').kwhMo).toBeCloseTo(optionCost(S, 'heater', 'one').kwhMo, 5);
  });

  it('every figure is for this tank: the same option on a 10 and a 75 gal differs in setup, monthly and minutes', () => {
    for (const [row, opt] of [['filter', 'canister'], ['filter', 'sponge'], ['ferts', 'aio'], ['co2', 'pressurized'], ['uv', 'uv']]) {
      const a = optionCost(G10(), row, opt), b = optionCost(G75(), row, opt);
      expect(b.setup.mode, `${opt} setup`).toBeGreaterThanOrEqual(a.setup.mode);
      expect(b.monthlyUsd.mode, `${opt} monthly`).toBeGreaterThan(a.monthlyUsd.mode);
      if (row === 'filter') expect(b.minutes.mode, `${opt} minutes`).toBeGreaterThan(a.minutes.mode);
    }
    const c10 = optionCost(G10(), 'filter', 'canister'), c75 = optionCost(G75(), 'filter', 'canister');
    expect(c75.setup.mode).toBeGreaterThan(c10.setup.mode);
    expect(c75.kwhMo).toBeGreaterThan(c10.kwhMo);
  });

  it('filters are sized: model for the volume, units to cover it, turnover, and the stocking capacity it allows', () => {
    expect(filterFor(G75(), 'canister').model.id).toBe('canister-l');
    expect(filterFor(G20L(), 'hob').model.id).toBe('hob-s');
    const sp = filterFor(G75(), 'sponge');
    expect(sp.n).toBeGreaterThan(1);
    const S = G75();
    expect(stockCapacity(S, { rows: { filter: 'none' } })).toBe(0.5);
    expect(stockCapacity(S, { rows: { filter: 'sponge' } })).toBeLessThan(stockCapacity(S, { rows: { filter: 'canister' } }));
  });

  it('no heater: tropical species are flagged at room temperature', () => {
    const S = sized(762, 305, 305, { fish: true });
    expect(S.fish.length).toBeGreaterThan(0);
    expect(coldSpecies(S)).toEqual([]); // heater on
    const cold = coldSpecies({ ...S, tech: { rows: { heater: 'none' }, roomC: 18 } });
    expect(cold.length).toBeGreaterThan(0);
  });

  it('choices: custom on a hand change, a sump skimmer needs the sump, presets keep the room', () => {
    const reef = tankOf('reef');
    const t = withChoice(reef, 'skimmer', 'sump');
    expect(t.rows.filter).toBe('sump');
    expect(t.preset).toBe('custom');
    expect(withChoice({ ...reef, tech: t }, 'filter', 'hob').rows.skimmer).toBe('hob');
    expect(applyPreset({ ...reef, tech: { rows: {}, roomC: 25 } }, 'sps')).toMatchObject({ preset: 'sps', roomC: 25, rows: { flow: 'wave', dosing: 'doser' } });
  });

  it('techParts names the models lane TG draws', () => {
    const S = { ...G75(), tech: applyPreset(G75(), 'hightech') };
    const parts = techParts(S);
    expect(parts.find(p => p.gear === 'filter')).toMatchObject({ model: 'canister-l', n: 1 });
    expect(parts.find(p => p.gear === 'heater')?.model).toMatch(/^heater-/);
    expect(parts.some(p => p.gear === 'co2kit')).toBe(true);
    expect(parts.some(p => p.gear === 'dropchecker')).toBe(true);
    const sps = techParts({ ...tankOf('reef'), tech: applyPreset(tankOf('reef'), 'sps') });
    expect(sps.find(p => p.gear === 'wavemaker')?.n).toBe(2);
    expect(sps.find(p => p.gear === 'returnpump')?.gph).toBeGreaterThan(0);
  });

  it('saves and reads back; junk is dropped', () => {
    const S = G20L();
    const t = { ...withChoice(S, 'filter', 'canister'), roomC: 19.5, place: { filter: { wall: 'left' as const, at: 0.3 } } };
    expect(parseTech(JSON.parse(JSON.stringify(t)))).toEqual(t);
    expect(parseTech({ rows: { filter: 'warp-drive', bogus: 'x' } })).toBeUndefined();
    expect(parseTech({ rows: { filter: 'hob' }, roomC: 99, place: { filter: { wall: 'ceiling' } } })).toEqual({ rows: { filter: 'hob' }, roomC: 40 });
    const scene = parseScene(SCENES.planted).scene;
    scene.tanks[0].tech = t;
    expect(parseScene(JSON.parse(JSON.stringify(scene))).scene.tanks[0].tech).toEqual(t);
    expect(inferTech({ ...S, water: { ...S.water, on: false } }).rows).toEqual({ heatlamp: 'none', thermostat: 'none', uvb: 'none', gauge: 'yes', mist: 'none', timer: 'none' }); // planted's fish want no basking spot
  });
});

describe('demand rows from the tech (lane TM step 3)', () => {
  const NOW = Date.parse('2026-10-19');
  const D = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW });
  it('a file without tech keeps its demand numbers (locked 2026-10-19; minutes and upkeep re-blessed 2026-10-21, lane MW: water change from the nitrogen budget, feeding, glass, plant bunches; lane CB: combined sources moved adult sizes and minimums)', () => {
    // reef re-blessed 2026-10-22 (lane SN: turbo snail mass from Turbo cornutus, upkeep +$2 a year, minutes +0.8); reef and paludarium risk re-blessed 2026-10-22 (temp-tiers: a shared temperature range of 2 °C or less is a narrow margin, not a compatibility flag)
    // 2026-10-27: arid and python re-blessed (their basking lamp and UVB count: +$132 / +$172 with python's mesh lid, +$10.81/mo); terrarium risk 4.294 (no dome for tree frogs, so no raised light)
    // Paludarium, terrarium, rainforest and arid re-blessed 2026-10-26 (starter tanks pass their animal checks: one gecko each, three toads with white clouds, a 30 in corner tank for three tree frogs)
    const LOCK: Record<string, number[]> = { planted: [1334.104, 53.447, 55.66, 8.229], iwagumi: [2111.437, 43.308, 53.943, 6.696], betta: [337.872, 9.969, 33.949, 4.984], paludarium: [1394.952,  43.441,  55.999,  5.614], terrarium: [1920.226,  35.536,  17.43,  3.077] /* lane LT 2026-10-26: heat, UVB, gauge rows; spot cleaning, no misting */, reef: [3421.776, 175.13, 89.573, 6.451], rainforest: [1254.771,  28.805,  30.904,  1.73] /* lane LT: UVB, gauge, hand mister */, arid: [1306.621,  25.408,  13.569,  2.842], python: [1590.378, 26.347, 21.769, 1.813], blackwater: [1236.514, 49.617, 44.674, 5.613], clownnano: [1556.626, 96.605, 74.453, 6.326] };;
    for (const [id, want] of Object.entries(LOCK)) {
      const t = D(tankOf(id)).totals;
      expect([t.setupUsd, t.upkeepUsdMo, t.minPerWeek, t.risk].map(v => Math.round(v * 1000) / 1000), id).toEqual(want);
    }
  });
  it('the chosen tech sets the gear rows: Walstad has no filter, high-tech has CO2 and a canister', () => {
    const S = G20L();
    const walstad = D({ ...S, tech: applyPreset(S, 'walstad') }), high = D({ ...S, tech: applyPreset(S, 'hightech') });
    { const f = walstad.items.find(c => c.key === 'filter')!; expect([f.setup, f.kwhMo]).toEqual([undefined, undefined]); } // its risk only
    expect(walstad.items.find(c => c.key === 'filter')!.risk).toBeGreaterThan(0);
    expect(walstad.items.some(c => c.key === 'filterclean')).toBe(false);
    expect(high.items.find(c => c.key === 'filter')?.label).toMatch(/Canister/);
    expect(high.items.some(c => c.key === 'co2')).toBe(true);
    expect(high.totals.setupUsd).toBeGreaterThan(walstad.totals.setupUsd + 150);
    expect(high.totals.minPerWeek).toBeGreaterThan(walstad.totals.minPerWeek);
    // no heater: no heater row, and less power
    const cold = D({ ...S, tech: withChoice({ ...S, tech: applyPreset(S, 'lowtech') }, 'heater', 'none') }), warm = D({ ...S, tech: applyPreset(S, 'lowtech') });
    expect(cold.items.some(c => c.key === 'heater')).toBe(false);
    expect(cold.totals.upkeepUsdMo).toBeLessThan(warm.totals.upkeepUsdMo);
  });
  it('a kit price still covers the tech filter and heater', () => {
    const S = { ...G20L(), tech: applyPreset(G20L(), 'midplanted') };
    const kit = D(S), withKit = demandOf(S, defaultProfile(), { now: NOW, kit: { id: 'x', priceUsd: 60, asOf: '2026-10-19' } });
    expect(withKit.items.find(c => c.key === 'filter')?.setup).toBeUndefined();
    expect(kit.items.find(c => c.key === 'filter')?.setup).toBeDefined();
  });
});

describe('benefits wired (lane TM step 5)', () => {
  it('salt gear sets the coral care level: the lowest of skimmer, flow and dosing', () => {
    const reef = tankOf('reef');
    const by = (id: string) => feedFor({ ...reef, tech: applyPreset(reef, id) });
    expect([by('fowlr'), by('soft'), by('lps'), by('sps')]).toEqual(['low', 'low', 'ferts', 'co2']);
    expect(reefFeedOf(inferTech(reef))).toBe(reef.grow.feed); // an old reef keeps its care level
    for (const f of ['low', 'ferts', 'co2'] as const) for (const p of ['fowlr', 'soft', 'lps', 'sps'])
      expect(reefFeedOf(setFeed(applyPreset(reef, p), f, true)), `${p} -> ${f}`).toBe(f);
    // the coral gate reads that care: an Acropora wants SPS gear, a hammer is fine on LPS gear
    const lps = feedFor({ ...reef, tech: applyPreset(reef, 'lps') }), sps = feedFor({ ...reef, tech: applyPreset(reef, 'sps') });
    expect(whyNot('acropora', 300, lps)?.kind).toBe('care');
    expect(whyNot('acropora', 300, sps)).toBeNull();
    expect(whyNot('hammer', 110, lps)).toBeNull();
    // SPS dosing without the flow is still LPS care
    expect(feedFor({ ...reef, tech: withChoice({ ...reef, tech: applyPreset(reef, 'sps') }, 'flow', 'two') })).toBe('ferts');
  });
  it('no heater: the Animals gate flags species the room is too cold for', () => {
    const neon = getSpecies('neon')!;
    expect(neon).toBeTruthy();
    const S = sized(762, 305, 305, { fish: true }), cold = tempEvidence({ ...S, tech: { rows: { heater: 'none' }, roomC: 17 } });
    expect(cold).toMatchObject({ heater: false, room: 17, roomSet: true });
    expect(whyAnimal(neon, 200, 3, [], { water: cold })?.text).toMatch(/requires heating.*no heater/);
    expect(whyAnimal(neon, 200, 3, [], {})).toBeNull();
    expect(tempEvidence({ ...S, tech: { rows: { heater: 'one' } } })).toMatchObject({ heater: true, roomSet: false });
    expect(tempEvidence({ ...S, tech: { rows: { heater: 'one' }, targetC: 25, measuredC: 24 } })).toMatchObject({ target: 25, measured: 24 });
  });
  it('no heater in a cold room raises the risk of a tropical stocking', () => {
    const S = sized(762, 305, 305, { fish: true });
    const risk = (c: number) => demandOf({ ...S, tech: { rows: { heater: 'none' }, roomC: c } }, defaultProfile(), { now: Date.parse('2026-10-19') }).totals.risk;
    expect(risk(17)).toBeGreaterThan(risk(25));
  });
  it('an assumed room adds no definite temperature penalty: the same shared assessment as the display (temp-tiers)', () => {
    const S = sized(762, 305, 305, { fish: true }), D = (tech: TankSetup['tech']) => demandOf({ ...S, tech }, defaultProfile(), { now: Date.parse('2026-10-19') });
    const heaterRisk = (tech: TankSetup['tech']) => D(tech).items.filter(r => r.key === 'heater').reduce((a, r) => a + r.risk, 0);
    // the default room is 21 °C: assumed, so no penalty; the same 21 °C entered is definitive and charged; a warm entered room is not
    expect(heaterRisk({ rows: { heater: 'none' }, roomC: 17 })).toBeGreaterThan(heaterRisk({ rows: { heater: 'none' } }));
    expect(heaterRisk({ rows: { heater: 'none' }, roomC: 17 })).toBeGreaterThan(heaterRisk({ rows: { heater: 'none' }, roomC: 26 }));
    expect(heaterRisk({ rows: { heater: 'none' } })).toBeCloseTo(heaterRisk({ rows: { heater: 'none' }, roomC: 26 }), 9);
  });
});
