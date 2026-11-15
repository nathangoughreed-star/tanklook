// Lane PC1 (2026-11-15): the Plants picker as picture cards grouped by type, like the Animals picker. No DOM. Every field comes from data the
// app already has: LIBRARY (label, hint, size), PLANT3D (grown size, speed, form), NEEDS (light, CO2, ferts), PLANT_CARE (keeper level),
// FAKE (artificial). Plants already in the tank are not cards (the placed rows own them), as in Animals.
import { LIBRARY } from '../../scene/items';
import { PLANT3D, PLANT_ASPECT, growthLen, isCarpet, isFloat, isLand, type PlantType } from '../../art/plants';
import { needOf, isLand as needIsLand, isCoralNeed } from '../../scene/lightneeds';
import { DIFFICULTY_NAME, PLANT_CARE } from '../../data/plantCare';
import { speedOf } from '../../scene/growtime';
import { fmtLen } from '../../scene/physics';
import type { Units } from '../../scene/types';
import type { TankSetup } from '../../scene/types';
import { plantLibrary } from './plants';

export type PlantGroup = 'fore' | 'mid' | 'back' | 'epi' | 'float' | 'emersed' | 'succ' | 'fake';
export const GROUPS: { id: PlantGroup; label: string }[] = [
  { id: 'fore', label: 'Foreground and carpet' },
  { id: 'mid', label: 'Midground' },
  { id: 'back', label: 'Background and stems' },
  { id: 'epi', label: 'On wood and rock' },
  { id: 'float', label: 'Floating' },
  { id: 'emersed', label: 'Emersed and houseplants' },
  { id: 'succ', label: 'Succulents' },
  { id: 'fake', label: 'Artificial' },
];
const EPI = new Set(['fern', 'anubias', 'buce', 'moss']);
const FORE = new Set(['carpet', 'hairgrass', 'sagittaria', 'fittonia', 'sphagnum']);
const SUCC = new Set(['echeveria', 'haworthia', 'jade', 'aloe', 'burrotail', 'barrel', 'sansevieria', 'agave', 'columnar']);
/** The group a plant is shown in: its form (carpet, floater, epiphyte, emersed) first, then how tall it grows (a taller one goes at the back). */
export function groupOf(id: string): PlantGroup {
  const v = LIBRARY[id];
  if (v.kind === 'artificial') return 'fake';
  if (isFloat(id)) return 'float';
  if (SUCC.has(id)) return 'succ';
  if (EPI.has(id)) return 'epi';
  if (isCarpet(id) || FORE.has(id)) return 'fore';
  if (isLand(id) || /^(Riparium|Houseplant|Terrarium)/.test(v.hint)) return 'emersed';
  return v.size > 200 ? 'back' : 'mid';
}

export interface PlantCard {
  id: string; label: string; hint: string; group: PlantGroup; fake: boolean;
  /** "to 11 in tall", "spreads to 6 in" */
  size: string;
  /** Beginner / Intermediate / Expert, or '' where the app has no keeper level for it */
  care: string;
  /** "Low light" ... or '' (artificial, land plants) */
  light: string;
  /** the gate's reason this plant does not suit the tank, or '' */
  why: string;
}
export interface PlantPick { groups: { id: PlantGroup; label: string; cards: PlantCard[] }[]; chips: { id: PlantGroup | null; label: string; n: number }[]; shown: number; inTank: number; none: string }

const LIGHT = { low: 'Low light', medium: 'Medium light', high: 'High light' } as const;
const lightOf = (id: string) => { const n = needOf(id); return !n || needIsLand(n) || isCoralNeed(n) ? '' : LIGHT[n.band]; };
const careOf = (id: string) => { const c = PLANT_CARE[id]; return c ? DIFFICULTY_NAME[c.level] : ''; };

/** Grown size in mm: an upright plant's full-growth height, a patch's (carpet, floater) full-growth width; an artificial plant's size (its height, a mat's width). */
export function grownMm(id: string): number {
  const v = LIBRARY[id];
  if (v.kind === 'artificial') return v.size;
  const t = id as PlantType;
  const len = PLANT3D[t]?.grow ? growthLen(t, 1) : v.size;
  return Math.min(len, v.max);
}
const sizeText = (id: string, units: Units) => {
  const v = LIBRARY[id], mm = grownMm(id);
  if (v.kind === 'artificial') return v.fake?.form === 'mat' ? `${fmtLen(mm, units)} wide` : `${fmtLen(mm, units)} tall`;
  return isCarpet(id) || isFloat(id) ? `spreads to ${fmtLen(mm, units)}` : `to ${fmtLen(mm, units)} tall`;
};

/** Every card the library offers for this tank (search and the gate's reasons applied), minus the plants already in the tank, grouped by type. */
export function plantPick(s: TankSetup, q: string, units: Units, role: PlantGroup | null): PlantPick {
  const lib = plantLibrary(s, q), have = new Set(s.items.filter(it => it.kind === 'plant' || it.kind === 'artificial').map(it => it.variant));
  const all: PlantCard[] = []; let inTank = 0;
  for (const r of lib.rows) for (const c of r.chips) {
    if (have.has(c.id)) { inTank++; continue; }
    const v = LIBRARY[c.id];
    all.push({ id: c.id, label: c.label, hint: c.hint, group: groupOf(c.id), fake: v.kind === 'artificial', size: sizeText(c.id, units), care: v.kind === 'artificial' ? 'Artificial' : careOf(c.id), light: lightOf(c.id), why: c.why });
  }
  const present = GROUPS.filter(g => all.some(c => c.group === g.id));
  // greyed ones sink below the rest of their group, as everywhere else
  const sorted = (cs: PlantCard[]) => [...cs].sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0));
  const groups = present.filter(g => !role || g.id === role).map(g => ({ ...g, cards: sorted(all.filter(c => c.group === g.id)) }));
  const shown = groups.reduce((n, g) => n + g.cards.length, 0);
  const needle = q.trim();
  return {
    groups, shown, inTank,
    chips: [{ id: null, label: 'All', n: all.length }, ...present.map(g => ({ id: g.id, label: g.label, n: all.filter(c => c.group === g.id).length }))],
    none: shown ? '' : needle && inTank ? `"${needle}" only matches plants that are already in the tank.` : needle ? `Nothing in Plants matches "${needle}".` : inTank ? 'Every plant on offer is already in the tank.' : lib.none,
  };
}

export interface PlantDetail { id: string; label: string; hint: string; fake: boolean; rows: [string, string][]; why: string; inTank: number }
const CO2 = { none: 'not needed', recommended: 'helps', required: 'needed' } as const;
const SPEED = { slow: 'Slow', medium: 'Medium', fast: 'Fast' } as const;
const PLACE: Record<PlantGroup, string> = { fore: 'Foreground', mid: 'Midground', back: 'Background', epi: 'Attach to wood or rock', float: 'Floats at the water line', emersed: 'In a rim planter, leaves above water', succ: 'On dry ground', fake: 'Anywhere' };

/** The rundown for one plant: only fields the app has. */
export function plantDetail(s: TankSetup, id: string, units: Units, why = ''): PlantDetail | null {
  const v = LIBRARY[id]; if (!v || (v.kind !== 'plant' && v.kind !== 'artificial')) return null;
  const rows: [string, string][] = [], g = groupOf(id), mm = grownMm(id), t = id as PlantType;
  rows.push([v.kind === 'artificial' ? (v.fake?.form === 'mat' ? 'Width' : 'Height') : isCarpet(id) || isFloat(id) ? 'Spread, grown' : 'Height, grown', fmtLen(mm, units)]);
  if (v.kind === 'plant' && !isCarpet(id) && !isFloat(id) && PLANT_ASPECT[t]) rows.push(['Spread, grown', fmtLen(mm / PLANT_ASPECT[t], units)]);
  rows.push(['Placement', PLACE[g]]);
  if (v.kind === 'artificial') { rows.push(['Growth', 'Never grows']); rows.push(['Light, CO2', 'None needed']); rows.push(['Material', v.fake?.mat === 'silk' ? 'Silk: soft, drapes, safe for long fins' : 'Plastic: stiff, hard edges can tear long fins']); }
  else {
    rows.push(['Growth', SPEED[speedOf(id)]]);
    const n = needOf(id), land = !n || needIsLand(n) || isCoralNeed(n);
    rows.push(['Light', land ? 'Above the water: room light' : LIGHT[n.band]]);
    if (!land) { rows.push(['CO2', CO2[n.co2]]); rows.push(['Fertilizer', CO2[n.ferts]]); }
    const c = PLANT_CARE[id]; rows.push(['Care', c ? DIFFICULTY_NAME[c.level] : 'No keeper rating yet']);
  }
  return { id, label: v.label, hint: v.hint, fake: v.kind === 'artificial', rows, why, inTank: s.items.filter(it => it.variant === id).length };
}
