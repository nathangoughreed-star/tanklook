import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import {
  applyPreset, coldSpecies, feedFor, feedOf, filterFor, heatLoss, inferTech, optionCost, parseTech, presetsFor, rowsFor,
  setFeed, stockCapacity, techOf, techParts, walstadGaps, withChoice,
} from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

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
      if (!S.water.on) { expect(rowsFor(S), id).toEqual([]); continue; }
      expect(feedFor(S), id).toBe(S.grow.feed);
      if (!S.water.salt) expect(feedOf(t), id).toBe(S.grow.feed);
      else expect(t.rows.skimmer, id).toBe('sump');
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
    expect(inferTech({ ...S, water: { ...S.water, on: false } }).rows).toEqual({});
  });
});
