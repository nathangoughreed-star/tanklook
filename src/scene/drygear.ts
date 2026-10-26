// Terrarium gear (lane LT, 2026-10-26): what a land animal's enclosure needs in place of a filter and a heater, so path 1 ("An animal I
// want") can build a terrarium and the cost panel can price one. Heat (a basking lamp for the baskers, a heat mat for the rest that want
// it warmer than the room) on a thermostat, UVB where the care guides call for it, a gauge for temperature and humidity, and misting for
// the humid species. Needs come from the air climate (data/climate.ts: warm spot, comfortable band, humidity) and the per-species table
// below (research/terrarium-gear.md); prices are the dry:* rows of data/demand-items.json. Pure: no UI.
import { AIR } from '../data/climate';
import { getSpecies } from '../data/species';
import { TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { bareSetup } from './defaults';
import { ROOM_C } from './tech';
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
};

export interface DryNeeds { heat: 'lamp' | 'mat' | 'none'; uvb: 't5' | 'low' | 'none'; mist: boolean }
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
/** The gear one build chooses for these needs: cheapest an on/off thermostat and a hand mister; balanced a dimming thermostat on a lamp
 *  (no hot spot runs away, the bulb lasts longer); least work an automatic mister and a timer on the lights. */
export function dryGearFor(n: DryNeeds, build: DryBuild): DryGear {
  return {
    heat: n.heat,
    thermostat: n.heat === 'none' ? 'none' : n.heat === 'lamp' && build !== 'cheapest' ? 'dimming' : 'onoff',
    uvb: n.uvb,
    mist: !n.mist ? 'none' : build === 'leastWork' ? 'auto' : 'hand',
    gauge: true,
    timer: build === 'leastWork' && (n.heat === 'lamp' || n.uvb !== 'none'),
  };
}

/** The gear an enclosure on screen has: its own choice, else the cheapest build for the animals in it (the editor's terrariums). */
export const dryGearOf = (S: TankSetup): DryGear => S.dryGear ?? dryGearFor(dryNeedsOf(S.fish.map(f => f.species)), 'cheapest');

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

/** The bare terrarium with the animals in it and a build's gear: water off, a mesh top, hinged front doors, no lamp of its own (the
 *  basking and UVB lights are the build's gear; a planted scape adds its light in the scape step). */
export function drySetup(m: TankModel, animals: Count[], build: DryBuild): TankSetup {
  const S = bareSetup();
  S.tank = tankFromModel(m);
  S.water.on = false; S.water.salt = false;
  S.lid = 'mesh'; S.doors = 'hinged';
  let id = 1;
  S.fish = animals.flatMap(a => Array.from({ length: Math.max(0, a.n) }, (): Fish => ({ id: id++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(a.tl ? { tl: a.tl } : {}) })));
  S.dryGear = dryGearFor(dryNeedsOf(animals.filter(a => a.n > 0).map(a => a.species)), build);
  return S;
}

/** One priced gear row for the demand model: the dry:* price key, the label, how many, watts on and hours a day (for the electricity). */
export interface DryRow { key: string; price: string; label: string; qty?: number; watts?: number; hours?: number }
/** The tank's floor area decides the heat: a bigger enclosure takes a stronger bulb or mat (the rows price a typical 50-100 W bulb / 20-40 gal mat). */
export function dryRows(S: TankSetup): DryRow[] {
  const g = dryGearOf(S), out: DryRow[] = [], L = S.tank.L / 25.4;
  if (g.heat === 'lamp') {
    const w = L > 40 ? 100 : L > 20 ? 75 : 50;
    out.push({ key: 'dry:dome', price: 'dry:dome', label: 'Dome lamp fixture' });
    out.push({ key: 'dry:basking-bulb', price: 'dry:basking-bulb', label: `Basking bulb (about ${w} W)`, watts: w, hours: 12 * 0.6 });
  } else if (g.heat === 'mat') {
    const w = L > 30 ? 24 : 16;
    out.push({ key: 'dry:heat-mat', price: 'dry:heat-mat', label: `Heat mat (about ${w} W)`, watts: w, hours: 24 * 0.5 });
  }
  if (g.thermostat !== 'none') out.push({ key: 'dry:thermostat', price: `dry:thermostat-${g.thermostat}`, label: g.thermostat === 'dimming' ? 'Dimming thermostat' : 'On/off thermostat' });
  if (g.uvb !== 'none') out.push({ key: 'dry:uvb', price: g.uvb === 't5' ? 'dry:uvb-t5-24' : 'dry:uvb-low', label: g.uvb === 't5' ? 'UVB light (T5 HO tube and fixture)' : 'UVB light (low output, shade dweller)', watts: g.uvb === 't5' ? 24 : 14, hours: 12 });
  if (g.gauge) out.push({ key: 'dry:gauge', price: 'dry:gauge', label: 'Thermometer and hygrometer' });
  if (g.mist === 'hand') out.push({ key: 'dry:mist', price: 'dry:hand-mister', label: 'Hand pressure mister' });
  if (g.mist === 'auto') out.push({ key: 'dry:mist', price: 'dry:auto-mister', label: 'Automatic misting system' });
  if (g.timer) out.push({ key: 'dry:timer', price: 'dry:timer', label: 'Timer for the lights' });
  return out;
}

/** The build's gear in plain words, one line each, for the build cards. */
export function dryGearLines(S: TankSetup): string[] {
  const g = dryGearOf(S), lines = dryRows(S).filter(r => r.key !== 'dry:dome' && r.key !== 'dry:thermostat').map(r => r.label);
  if (g.thermostat !== 'none') lines[0] = `${lines[0]} on ${g.thermostat === 'dimming' ? 'a dimming' : 'an on/off'} thermostat`;
  if (g.heat === 'none') lines.unshift('No heat: these animals are comfortable at room temperature');
  if (g.mist === 'none') lines.push('No misting: these animals want drier air');
  return lines;
}
