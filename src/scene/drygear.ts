// Terrarium gear (lane LT, 2026-10-26): what a land animal's enclosure needs in place of a filter and a heater, so path 1 ("An animal I
// want") can build a terrarium and the cost panel can price one. Heat (a basking lamp for the baskers, a heat mat for the rest that want
// it warmer than the room) on a thermostat, UVB where the care guides call for it, a gauge for temperature and humidity, and misting for
// the humid species. Needs come from the air climate (data/climate.ts: warm spot, comfortable band, humidity) and the per-species table
// below (research/terrarium-gear.md); prices are the dry:* rows of data/demand-items.json. Pure: no UI.
import { AIR } from '../data/climate';
import { getSpecies } from '../data/species';
import { TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { bareSetup } from './defaults';
import techData from '../data/tech.json';
import { techOf } from './tech';
import type { DryGear, Fish, TankSetup } from './types';

/** What the picks need; AnimalCount without importing tankfit (it imports this file). */
interface Count { species: string; n: number; tl?: number }

/** Per species (research/terrarium-gear.md): UVB the guides require or recommend ('t5' a T5 HO 6 % or similar, 'low' a shade-dweller
 *  tube) and the primary heat they now recommend. Absent = no UVB, heat from the climate's warm spot. */
export const DRY_NEEDS: Record<string, { uvb?: 't5' | 'low'; heat?: 'lamp' | 'mat' | 'none' }> = {
  // UVB required (ReptiFiles anole guide; brown anole extrapolated from the green): a full T5 HO 6 % tube
  greenanole: { uvb: 't5', heat: 'lamp' }, greenanolebrown: { uvb: 't5', heat: 'lamp' }, brownanole: { uvb: 't5', heat: 'lamp' },
  // UVB recommended, not required (ReptiFiles): a low-output shade-dweller tube; heat from a basking lamp on a thermostat
  ballpython: { uvb: 'low', heat: 'lamp' }, leopardgecko: { uvb: 'low', heat: 'lamp' },
  // recommended UVB, room temperature is fine (ReptiFiles 72-78 F for the crested gecko; the warm spot in data/climate.ts is optional)
  crestedgecko: { uvb: 'low', heat: 'none' }, crestedharlequin: { uvb: 'low', heat: 'none' },
  // White's tree frog: UVB recommended; its basking spot (data/climate.ts warm 28-32 C) keeps the lamp
  treefrog: { uvb: 'low', heat: 'lamp' },
  // optional or advised against (dartfrog.pet), room temperature: no UVB, no heat
  dartfrog: { heat: 'none' }, regaljumper: { heat: 'none' }, chacogoldenknee: { heat: 'none' },
  // arthropod research 2026-10-28: the heat the care sheets ask for (a heat mat on a thermostat, a lamp for the mantis); none for the room-temperature species
  redknee: { heat: 'none' }, chileanrose: { heat: 'none' }, curlyhair: { heat: 'none' }, pinktoe: { heat: 'none' }, emperorscorpion: { heat: 'mat' }, africanmillipede: { heat: 'mat' }, hissingroach: { heat: 'mat' }, zebraisopod: { heat: 'none' }, powderblueisopod: { heat: 'none' }, orchidmantis: { heat: 'lamp' }, indianstick: { heat: 'none' }, purplepincher: { heat: 'mat' },
};

export interface DryNeeds { heat: 'lamp' | 'mat' | 'none'; uvb: 't5' | 'low' | 'none'; mist: boolean }
const ROOM_C = techData.roomC;
const UVB_RANK = { none: 0, low: 1, t5: 2 } as const;

/** The enclosure's needs for these animals: the hottest heat any of them wants, the strongest UVB, misting when one wants 60 % humidity or more. */
export function dryNeedsOf(species: string[]): DryNeeds {
  let heat: DryNeeds['heat'] = 'none', uvb: DryNeeds['uvb'] = 'none', mist = false;
  for (const id of new Set(species)) {
    const a = AIR[id], d = DRY_NEEDS[id], sp = getSpecies(id);
    if (!sp || sp.habitat !== 'land') continue;
    const h = d?.heat ?? (a?.warm ? 'lamp' : a && a.c[0] > ROOM_C ? 'mat' : 'none');
    if (h === 'lamp' || (h === 'mat' && heat === 'none')) heat = h;
    const u = d?.uvb ?? 'none';
    if (UVB_RANK[u] > UVB_RANK[uvb]) uvb = u;
    if (a && a.rh[0] >= 60) mist = true;
  }
  return { heat, uvb, mist };
}

export type DryBuild = 'cheapest' | 'leastWork' | 'balanced';
/** The Tech menu's dry rows (scene/tech.ts, tech.json) one build chooses for these needs: cheapest an on/off thermostat and a hand mister;
 *  balanced a dimming thermostat on a lamp (no hot spot runs away, the bulb lasts longer); least work an automatic mister and a timer on
 *  the lights. The one gear model of a dry tank (Nathan 2026-10-26: the Tech menu, the 3D and the totals read the same rows). */
export function dryRowsFor(n: DryNeeds, build: DryBuild): Record<string, string> {
  return {
    heatlamp: n.heat === 'lamp' ? 'dome' : n.heat === 'mat' ? 'mat' : 'none',
    thermostat: n.heat === 'none' ? 'none' : n.heat === 'lamp' && build !== 'cheapest' ? 'dimming' : 'onoff',
    uvb: n.uvb === 't5' ? 'tube' : n.uvb === 'low' ? 'low' : 'none',
    gauge: 'yes',
    mist: !n.mist ? 'none' : build === 'leastWork' ? 'mister' : 'hand',
    timer: build === 'leastWork' && (n.heat === 'lamp' || n.uvb !== 'none') ? 'yes' : 'none',
  };
}
/** The gear a dry tank's animals call for, as rows: the cheapest build (what the Tech menu shows until the owner changes a row). */
export const dryInferred = (species: string[]) => dryRowsFor(dryNeedsOf(species), 'cheapest');

/** The tank's dry gear read off its Tech rows (the plan sheet and the work row ask what misting there is). */
export function dryGearOf(S: TankSetup): DryGear {
  const r = techOf(S).rows;
  return {
    heat: r.heatlamp === 'dome' ? 'lamp' : r.heatlamp === 'mat' ? 'mat' : 'none',
    thermostat: r.thermostat === 'onoff' || r.thermostat === 'dimming' ? r.thermostat : 'none',
    uvb: r.uvb === 'tube' ? 't5' : r.uvb === 'low' ? 'low' : 'none',
    gauge: r.gauge === 'yes',
    mist: r.mist === 'hand' ? 'hand' : r.mist === 'mister' || r.mist === 'fogger' ? 'auto' : 'none',
    timer: r.timer === 'yes',
  };
}

/** A terrarium's own price: the catalogue terrarium of this inside size (within 2 mm), the median of its listed prices; undefined when
 *  none matches or none is priced (the demand model then falls back to its $ per gallon rule, an aquarium's). */
let terraria: { m: TankModel; t: TankSetup['tank'] }[] | undefined;
export function terrariumPrice(T: TankSetup['tank']): number | undefined {
  terraria ??= TANK_MODELS.filter(m => m.terrarium).map(m => ({ m, t: tankFromModel(m) }));
  for (const { m, t } of terraria) {
    if (Math.abs(t.L - T.L) > 2 || Math.abs(t.D - T.D) > 2 || Math.abs(t.H - T.H) > 2) continue;
    const ps = (m.variants ?? []).filter(v => !v.discontinued && v.price_usd && v.price_kind !== 'kit').map(v => v.price_usd!).sort((a, b) => a - b);
    if (ps.length) return ps[Math.floor(ps.length / 2)];
  }
  return undefined;
}

/** A terrarium's stand costs its own row (S240b, Nathan 2026-10-26 "rec": not the aquarium stand rule, which prices by gallons of water): the
 *  reptile 48 x 24 stand's price scaled by footprint ^ 0.7 (our estimate; only the 48 x 24 is sourced), kept within 0.4 to 2.2 times. */
export const TERRARIUM_STAND_ROW = 'gear:terrarium-stand-48x24';
export const terrariumStandK = (T: TankSetup['tank']) => Math.min(2.2, Math.max(0.4, Math.pow((T.L * T.D) / (1219.2 * 609.6), 0.7)));

/** The bare terrarium with the animals in it and a build's gear: water off, a mesh top, hinged front doors, no lamp of its own (the
 *  basking and UVB lights are the build's gear; a planted scape adds its light in the scape step). */
export function drySetup(m: TankModel, animals: Count[], build: DryBuild): TankSetup {
  const S = bareSetup();
  S.tank = tankFromModel(m);
  S.water.on = false; S.water.salt = false;
  S.lid = 'mesh'; S.doors = 'hinged';
  let id = 1;
  S.fish = animals.flatMap(a => Array.from({ length: Math.max(0, a.n) }, (): Fish => ({ id: id++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(a.tl ? { tl: a.tl } : {}) })));
  S.tech = { rows: dryRowsFor(dryNeedsOf(animals.filter(a => a.n > 0).map(a => a.species)), build) };
  return S;
}

/** The build's gear in plain words, one line each, for the build cards. */
export function dryGearLines(S: TankSetup): string[] {
  const g = dryGearOf(S), lines: string[] = [];
  const lampName = g.heat === 'lamp' ? 'Dome heat lamp and basking bulb' : g.heat === 'mat' ? 'Heat mat' : '';
  if (g.heat === 'none') lines.push('No heat: these animals are comfortable at room temperature');
  else lines.push(`${lampName} on ${g.thermostat === 'dimming' ? 'a dimming' : g.thermostat === 'onoff' ? 'an on/off' : 'no'} thermostat`);
  if (g.uvb !== 'none') lines.push(g.uvb === 't5' ? 'UVB light (T5 HO tube and fixture)' : 'UVB light (low output, shade dweller)');
  if (g.gauge) lines.push('Thermometer and hygrometer');
  lines.push(g.mist === 'hand' ? 'Hand pressure mister' : g.mist === 'auto' ? 'Automatic misting system' : 'No misting: these animals want drier air');
  if (g.timer) lines.push('Timer for the lights');
  return lines;
}
