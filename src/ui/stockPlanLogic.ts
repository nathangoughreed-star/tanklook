// Pure logic for the stocking screen and the fork card (lane P5, 2026-10-20): picks and counts, tankmate ranking, the tank the picks need,
// fork options. No DOM; src/ui/stockPlan.ts draws it. Reads CARE (with the P1 group data merged in) and the P2 engine (scene/tankfit.ts).
import { CARE } from '../data/care';
import { bandMessage, bandOf, type GroupBand } from '../data/groups';
import { getSpecies, SPECIES, type Species } from '../data/species';
import { getTankModel, TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { whyAnimal } from '../scene/animalfit';
import { volume } from '../scene/physics';
import { spaceFit, tankExtent } from '../scene/space';
import { buildSpan, stepUps, tankFor, tankLabel, zoneOf, type AnimalCount, type BuildSpan, type StepUp, type TankFit } from '../scene/tankfit';
import { countsAgainstWater } from '../scene/stocking';
import type { Fish, SpaceLimit, Tank } from '../scene/types';

/** One species on the list. Usually sexed species (CARE.sexed) carry males in `n` and females in `f`; the rest just `n`. */
export interface Pk { id: string; n: number; f?: number }
export const isSexed = (id: string) => !!CARE[id]?.sexed;
export const totalOf = (p: Pk) => p.n + (p.f ?? 0);
/** The most one tank is advised to take (a warning past it, never a block). */
export const maxOf = (id: string) => CARE[id]?.max ?? 99;
export const minOf = (id: string) => CARE[id]?.bands?.ok ?? CARE[id]?.group ?? 1;

/** The picks as the tank-fit engine wants them (males and females together). */
export const animalsOf = (picks: Pk[]): AnimalCount[] => picks.filter(p => totalOf(p) > 0).map(p => ({ species: p.id, n: totalOf(p) }));

/** A species added at its recommended minimum; a sexed one at the smallest whole multiple of its ratio that reaches that minimum. */
export function startPick(id: string): Pk {
  const min = minOf(id), r = CARE[id]?.sexed?.ratio;
  if (!r) return { id, n: Math.min(min, maxOf(id)) };
  const per = r[0] + r[1] || 1, k = Math.max(1, Math.ceil(min / per));
  return { id, n: r[0] * k, f: r[1] * k };
}

/** Add `d` (+1 / -1) to one count of a pick, never below 0; males 'n', females 'f'. Past the species' advised most it only warns (overWarn). */
export function bump(p: Pk, which: 'n' | 'f', d: number): Pk {
  const cur = which === 'n' ? p.n : p.f ?? 0;
  const v = Math.max(0, cur + d);
  return which === 'n' ? { ...p, n: v } : { ...p, f: v };
}

/** The warning for keeping more of a species than advised (more than the advised most, or more than one of a keep-one animal), else undefined. */
export function overWarn(p: Pk): string | undefined {
  const c = CARE[p.id], n = totalOf(p), mx = c?.max ?? (c?.solo ? 1 : undefined);
  if (!mx || n <= mx) return undefined;
  const name = getSpecies(p.id)?.name ?? p.id;
  return mx === 1 ? `${name} is best kept one to a tank: expect fighting. The tank shown is sized for all of them` : `More than ${mx} ${name} in one tank is not advised: expect fighting or crowding`;
}

/** The band message for the total count, plus the sex-ratio line for sexed species. */
export interface PickNotes { band: GroupBand; line: string; ratio?: string; habitat: string[] }
export function notesOf(p: Pk): PickNotes {
  const c = CARE[p.id], n = totalOf(p);
  const band = bandOf(c, n), line = n === 0 ? '' : c?.max && c.max > 1 && n === c.max ? `${bandMessage(c, n)} (at the most one tank takes: ${c.max})` : bandMessage(c, n);
  let ratio: string | undefined;
  const r = c?.sexed;
  if (r) {
    const [rm, rf] = r.ratio, f = p.f ?? 0;
    const want = rm === 0 ? 'females only' : rf === 0 ? 'males only' : `${rm} male${rm === 1 ? '' : 's'} to ${rf} female${rf === 1 ? '' : 's'}`;
    const off = rm === 0 ? p.n > 0 : rf === 0 ? f > 0 : p.n > 0 && f / p.n < rf / rm * 0.75 || (f > 0 && p.n === 0 && rm > 0 && n > 1);
    ratio = `Kept ${want}${r.note ? `: ${r.note}` : ''}${off && n > 0 ? '. Your mix is short on females' : ''}`;
  }
  const habitat: string[] = [];
  if (c?.maxDepthMm) habitat.push(`Shallow water, ${Math.round(c.maxDepthMm / 10)} cm deep at most`);
  if (c?.flow) habitat.push(`${c.flow === 'low' ? 'Gentle' : c.flow === 'high' ? 'Strong' : 'Moderate'} flow`);
  const sp = getSpecies(p.id);
  if (sp) { const z = zoneOf(sp); if (z !== 'all') habitat.push(`Lives in the ${z === 'bottom' ? 'bottom' : z === 'top' ? 'top' : 'middle'} of the tank`); }
  if (c?.minLengthMm) habitat.push(`Tank at least ${Math.round(c.minLengthMm / 10)} cm long`);
  return { band, line, ...(ratio ? { ratio } : {}), habitat };
}

/** Why this pick does not suit the others on the list (first reason), or undefined. Advice only: nothing is blocked. */
export function conflictOf(picks: Pk[], id: string): string | undefined {
  const sp = getSpecies(id), others = picks.filter(p => p.id !== id && totalOf(p) > 0).map(p => getSpecies(p.id)).filter((x): x is Species => !!x);
  if (!sp || !others.length) return undefined;
  const clash = others.find(o => !!o.salt !== !!sp.salt);
  if (clash) return `${sp.salt ? 'Salt' : 'Fresh'} water: it cannot share a tank with ${clash.name}`;
  const w = whyAnimal(sp, Infinity, 3, others)?.text;
  return w?.replace(/^compatibility: /, '');
}

// ---------- tankmates ----------
export interface Mate { sp: Species; ok: boolean; why: string; score: number; n: number }
const overlap = (a?: [number, number], b?: [number, number]) => a && b ? Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) : 0;

/** Every animal that is not already picked: the ones that suit ALL the picks first, best first, then the ones that do not (each with the first
 *  reason, naming the occupant it clashes with), by name. Salt against fresh counts as a clash. */
export function rankTankmates(picks: Pk[]): Mate[] {
  const have = picks.filter(p => totalOf(p) > 0).map(p => getSpecies(p.id)).filter((s): s is Species => !!s);
  if (!have.length) return [];
  const taken = new Set(have.map(s => s.id)), zones = new Set(have.map(zoneOf));
  const out: Mate[] = [];
  for (const sp of SPECIES) {
    if (taken.has(sp.id) || !countsAgainstWater(sp)) continue;
    const c = CARE[sp.id]; if (!c) continue;
    const salty = have.find(o => !!o.salt !== !!sp.salt);
    const why = salty ? `${sp.salt ? 'Salt' : 'Fresh'} water: it cannot share a tank with ${salty.name}` : whyAnimal(sp, Infinity, 3, have)?.text.replace(/^compatibility: /, '') ?? '';
    let score = why ? 0 : 100;
    if (!why) {
      // fills a part of the tank the others leave empty, shares their water, easy to keep, and likes the same things
      score += zones.has(zoneOf(sp)) ? 0 : 15;
      for (const o of have) { const oc = CARE[o.id]; score += Math.min(6, overlap(c.temp, oc?.temp)) * 2 + Math.min(1, overlap(c.ph, oc?.ph)) * 3 + (c.appeal?.filter(a => oc?.appeal?.includes(a)).length ?? 0) * 2; }
      score -= (c.care - 1) * 4 + c.temper * 6;
    }
    out.push({ sp, ok: !why, why, score, n: minOf(sp.id) });
  }
  const ok = out.filter(m => m.ok).sort((a, b) => b.score - a.score || a.sp.name.localeCompare(b.sp.name));
  const no = out.filter(m => !m.ok).sort((a, b) => a.sp.name.localeCompare(b.sp.name));
  return [...ok, ...no];
}

// ---------- the tank ----------
export interface Plan {
  /** the smallest catalogue tank that holds the picks (undefined with no animals in the water) */
  need?: TankFit;
  /** the tank shown: the needed one, or a bigger one the user chose */
  tank?: TankModel;
  litres: number;
  steps: StepUp[];
  span?: BuildSpan;
  /** one plain line when no tank is enough */
  problem?: string;
}
const litresOf = (m: TankModel) => volume(tankFromModel(m)).litres;

const FAIL_TEXT: Record<string, string> = {
  filtration: 'No filter can carry this many animals; take fewer',
  space: 'Too many animals for the biggest tank on the list; take fewer',
  minimum: 'Needs more water than the biggest tank on the list',
  length: 'Needs a longer tank than the list has',
  depth: 'Needs shallower water than any tank here gives',
  floor: 'Not enough floor for the bottom dwellers and swimmers together',
};

/** The plan for these picks: tank (the user's bigger choice `chosen` holds while it is at least what is needed), step-ups, cost span. */
export function planFor(picks: Pk[], chosen?: string): Plan {
  const animals = animalsOf(picks), need = tankFor(animals);
  if (!need) return { litres: 0, steps: [] };
  const ch = chosen ? getTankModel(chosen) : undefined;
  const tank = ch && litresOf(ch) > need.litres ? ch : need.tank;
  const bad = need.fails.length ? FAIL_TEXT[need.fails.includes('filtration') ? 'filtration' : need.fails[0]] : undefined;
  return { need, tank, litres: litresOf(tank), steps: stepUps(animals, tank, 3), span: buildSpan(animals, tank), ...(bad ? { problem: bad } : {}) };
}

export { tankLabel };

// ---------- the fork card ----------
export interface RoomOption { tank: TankModel; label: string; w: number; d: number; costUsd?: number; costDeltaUsd?: number }
export interface SwapOption { from: string; to: Species; n: number; shared: string[]; tank: TankModel }
export interface Fork {
  animals: AnimalCount[];
  /** the sizes the animals need, from the smallest that holds them */
  room: RoomOption[];
  /** the largest catalogue tank inside the space */
  inSpace?: RoomOption;
  /** the animals fit the space's tank as they are */
  fitsAsIs: boolean;
  /** swaps for each animal that does not fit, ranked by shared appeal */
  swaps: SwapOption[];
}

/** The animals in a tank, one entry per species. */
export function animalsInTank(fish: Pick<Fish, 'species'>[]): AnimalCount[] {
  const by = new Map<string, number>();
  for (const f of fish) by.set(f.species, (by.get(f.species) ?? 0) + 1);
  return [...by].map(([species, n]) => ({ species, n }));
}

const RECT = TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name)).sort((a, b) => litresOf(a) - litresOf(b));
const optionOf = (m: TankModel, animals: AnimalCount[], base?: number): RoomOption => {
  const e = tankExtent(tankFromModel(m)), span = animals.length ? buildSpan(animals, m) : undefined;
  return { tank: m, label: tankLabel(m), w: e.w, d: e.d, ...(span ? { costUsd: span.setupUsd.balanced, ...(base != null ? { costDeltaUsd: span.setupUsd.balanced - base } : {}) } : {}) };
};

/** What the fork card offers when the animals' tank is past the owner's space: make room (the sizes they need, with cost) or keep the space (the biggest tank in it, and animals that fit there). */
export function forkOptions(animals: AnimalCount[], limit: SpaceLimit, current?: Tank): Fork {
  const need = tankFor(animals), wet = animals.filter(a => { const s = getSpecies(a.species); return s && countsAgainstWater(s); });
  const room: RoomOption[] = [];
  // the tank that is past the space (matched back to the catalogue by its inside size), else the smallest the animals need
  const cur = current && RECT.find(m => { const t = tankFromModel(m); return Math.abs(t.L - current.L) < 1 && Math.abs(t.H - current.H) < 1 && Math.abs(t.D - current.D) < 1; });
  const base = cur ?? need?.tank;
  if (base) {
    const first = optionOf(base, animals);
    room.push(first, ...stepUps(animals, base, 2).map(s => optionOf(s.tank, animals, first.costUsd)));
  }
  const inTank = [...RECT].reverse().find(m => spaceFit(tankFromModel(m), limit).fits);
  const inSpace = inTank ? optionOf(inTank, animals) : undefined;
  const fitsAsIs = !need || (!!inTank && need.fails.length === 0 && litresOf(need.tank) <= litresOf(inTank) * 1.001);
  const swaps: SwapOption[] = [];
  if (!fitsAsIs && inTank) {
    const litres = litresOf(inTank), salt = wet.some(a => getSpecies(a.species)?.salt);
    for (const a of wet) {
      const from = getSpecies(a.species)!, mine = CARE[a.species]?.appeal ?? [], rest = animals.filter(x => x.species !== a.species);
      const present = rest.map(x => getSpecies(x.species)!).filter(Boolean);
      const cands: SwapOption[] = [];
      for (const sp of SPECIES) {
        if (sp.id === a.species || !!sp.salt !== salt || !countsAgainstWater(sp) || animals.some(x => x.species === sp.id)) continue;
        const shared = (CARE[sp.id]?.appeal ?? []).filter(t => mine.includes(t));
        if (!shared.length || (present.length && whyAnimal(sp, litres, 3, present))) continue;
        const n = minOf(sp.id), t = tankFor([...rest, { species: sp.id, n }]);
        if (t && !t.fails.length && litresOf(t.tank) <= litres * 1.001) cands.push({ from: from.name, to: sp, n, shared, tank: inTank });
      }
      cands.sort((x, y) => y.shared.length - x.shared.length || Math.abs(x.to.tl - from.tl) - Math.abs(y.to.tl - from.tl));
      swaps.push(...cands.slice(0, 4));
    }
  }
  return { animals, room, ...(inSpace ? { inSpace } : {}), fitsAsIs, swaps };
}
