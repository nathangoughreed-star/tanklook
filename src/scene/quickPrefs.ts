// AB6 (2026-11-10): QUICK PREFERENCES. "Ask what they know; show what they don't." One optional screen after the habitat question and a "Your preferences" block in the
// Constraints menu write the SAME fields (this module is the one writer), so either can change them any time.
// ONE STRENGTH MODEL for every attribute (Coordinator 21 / Nathan, 2026-11-10):
//   required / prohibited  = HARD constraint (a candidate that breaks it is filtered out)        { strength: 'hard' }
//   preferred / avoided    = strong RANKING preference (never removes an alternative)             { strength: 'prefer' }
//   unsure                 = nothing expressed, nothing written
// Hard answers become a brief item at status 'hard' where the brief has a field for it (appearance.plantMode, preferences.lowtech, constraints.budget / careMin as a "firm maximum"),
// and are always returned by `readQuickPrefs`. Prefer answers become "You told us" weights in `preferences.aspects.told` (explore/aspects.ts, closed vocabulary; a told weight beats a
// learned one) or a status 'preference' limit. Nothing here is a DX0 lock. The answers themselves live in project extras `quick` (plus the limit items), so a re-write retracts exactly what the earlier answers wrote.
import { clearItem, getItem, projectExtras, rangeOf, setBound, setItem, setProjectExtras, setRange, setStatus, type Brief } from './brief';
import { aspectsOf, tell, type Aspects } from '../explore/aspects';
import { SIZE_LARGE_MM } from '../explore/constants';
import { getSpecies } from '../data/species';
import type { HabitatDirection } from './discoveryTypes';
import { dryOf, isDry, sizeOf, sizeRange, type SizeChoice } from './sizePrefs';

export type PlantsAnswer = 'definitely' | 'prefer' | 'prefer-not' | 'not';
export type LookChip = 'natural' | 'lush' | 'colourful' | 'minimal' | 'stylized';
/** Hard prohibitions only: things a candidate objectively has or does not have. Subjective dislikes (bright colours, "too busy") are never offered here: the look chips and A/B carry them. */
export type AvoidId = 'snails' | 'shrimp' | 'co2' | 'large-animals';
/** A practical limit: a TARGET (preference, "I'd prefer under") or a FIRM maximum (hard, "I can't spend more than"). */
export interface Limit { max: number; firm: boolean }
export interface QuickAnswers { size?: SizeChoice; look: LookChip[]; plants?: PlantsAnswer; avoid: AvoidId[]; budget?: Limit; care?: Limit }
export const emptyAnswers = (): QuickAnswers => ({ look: [], avoid: [] });

export const LOOK_CHIPS: readonly { id: LookChip; label: string }[] = [
  { id: 'natural', label: 'Natural' }, { id: 'lush', label: 'Lush' }, { id: 'colourful', label: 'Colourful' }, { id: 'minimal', label: 'Minimal' }, { id: 'stylized', label: 'Stylized' },
];
/** Unsure is the absence of an answer; the screen shows it as a button of its own. */
export const PLANT_ANSWERS: readonly { id: PlantsAnswer; label: string }[] = [
  { id: 'definitely', label: 'Definitely' }, { id: 'prefer', label: 'Prefer' }, { id: 'prefer-not', label: 'Prefer not' }, { id: 'not', label: 'Definitely not' },
];
const DRY = isDry;
export const AVOIDS: readonly { id: AvoidId; label: (d: HabitatDirection) => string; shown: (d: HabitatDirection) => boolean }[] = [
  { id: 'snails', label: () => 'Snails', shown: () => true },
  { id: 'shrimp', label: () => 'Shrimp', shown: d => !DRY(d) || d === 'paludarium' },
  { id: 'co2', label: () => 'A CO2 system', shown: d => d === 'freshwater' || d === 'paludarium' || d === 'unsure' },
  { id: 'large-animals', label: d => d === 'terrarium' ? 'Large animals' : 'Large fish', shown: () => true },
];
/** "Large" for the large-animals prohibition: adult length at or over this (150 mm = 6 in, explore/constants SIZE_LARGE_MM). */
export const LARGE_IN = Math.round(SIZE_LARGE_MM / 25.4);
export const plantsLabel = (d: HabitatDirection) => d === 'terrarium' ? 'Live plants (moss, ferns, vines)' : d === 'paludarium' ? 'Live plants (water and land)' : 'Live plants';
/** Saltwater has no plant row (its planting is coral and algae, which is the stock, not a planting choice). */
export const plantsShown = (d: HabitatDirection) => d !== 'saltwater';

/** The look axes, -1 .. +1; absent = no opinion. `ordered` is order versus wild (Minimal leans ordered); only the first three have a ranking aspect today. Look is ALWAYS a preference. */
export interface AxisWeights { natural?: number; lush?: number; colourful?: number; ordered?: number }
const LOOK_AXES: Record<LookChip, AxisWeights> = {
  natural: { natural: 1 }, stylized: { natural: -1 }, lush: { lush: 1 }, minimal: { lush: -1, colourful: -1, ordered: 1 }, colourful: { colourful: 1 },
};
export const axesOf = (look: readonly LookChip[]): AxisWeights => {
  const out: AxisWeights = {};
  for (const c of look) for (const [k, v] of Object.entries(LOOK_AXES[c]) as [keyof AxisWeights, number][]) out[k] = v;
  return out;
};
/** Look chips to "You told us" keys, all from the closed vocabulary (explore/aspects.ts TAGS). Natural also says live plants, Stylized artificial decor; the plants answer is written after and wins. */
const LOOK_TOLD: Record<LookChip, Record<string, 1 | -1>> = {
  natural: { 'colors:natural': 1, 'natural:live': 1 }, stylized: { 'natural:artificial': 1 }, lush: { 'plants:lush': 1 }, minimal: { 'plants:none': 1, 'plants:lush': -1 }, colourful: { 'colors:vivid': 1 },
};
const PLANT_TOLD: Record<PlantsAnswer, Record<string, 1 | -1>> = {
  definitely: { 'natural:live': 1 }, prefer: { 'natural:live': 1 }, 'prefer-not': { 'natural:artificial': 1, 'natural:live': -1 }, not: { 'natural:live': -1 },
};

/** Drop what contradicts itself: opposite look chips cannot both stay (the one picked later wins). */
export function normalize(a: QuickAnswers): QuickAnswers {
  let look = [...new Set(a.look)];
  const clash = (x: LookChip, y: LookChip) => { if (look.includes(x) && look.includes(y)) look = look.filter(c => c !== (look.indexOf(x) < look.indexOf(y) ? x : y)); };
  clash('lush', 'minimal'); clash('natural', 'stylized');
  const lim = (l?: Limit) => l && Number.isFinite(l.max) && l.max > 0 ? { max: Math.round(l.max), firm: !!l.firm } : undefined, b = lim(a.budget), c = lim(a.care);
  return { ...(a.size ? { size: a.size } : {}), look, ...(a.plants ? { plants: a.plants } : {}), avoid: [...new Set(a.avoid)], ...(b ? { budget: b } : {}), ...(c ? { care: c } : {}) };
}
const toldKeys = (a: QuickAnswers): Record<string, 1 | -1> => {
  const t: Record<string, 1 | -1> = {};
  for (const c of a.look) Object.assign(t, LOOK_TOLD[c]);
  if (a.plants) Object.assign(t, PLANT_TOLD[a.plants]);
  return t;
};
const dirOf = (b: Brief): HabitatDirection => projectExtras(b).direction ?? 'unsure';
const sizeNow = (b: Brief): SizeChoice | undefined => {
  const d = dirOf(b); if (isDry(d)) return projectExtras(b).quick?.size;
  const r = rangeOf(b, 'constraints.tankGal'); return sizeOf(d, r.min !== undefined && r.max !== undefined ? { lo: r.min, hi: r.max } : undefined);
};
const limitOf = (b: Brief, id: 'constraints.budget' | 'constraints.careMin'): Limit | undefined => {
  const it = getItem(b, id), r = rangeOf(b, id); return it && !it.off && r.max !== undefined ? { max: r.max, firm: it.status === 'hard' } : undefined;
};

/** The answers as the brief holds them: the stored answers, with plants, size and the practical limits read back from the items (the left menus and the limits panel write the same fields, so a change there shows here). */
export function answersOf(b: Brief): QuickAnswers {
  const q = projectExtras(b).quick, a: QuickAnswers = { look: (q?.look ?? []) as LookChip[], avoid: ((q?.avoid ?? []) as string[]).filter(x => AVOIDS.some(v => v.id === x)) as AvoidId[], ...(q?.plants ? { plants: q.plants } : {}) };
  const pm = getItem(b, 'appearance.plantMode');
  if (pm && !pm.off && pm.status === 'hard') { if (pm.value === 'live') a.plants = 'definitely'; else if (pm.value === 'artificial') a.plants = 'not'; }
  const lt = getItem(b, 'preferences.lowtech'); if (lt && !lt.off && lt.status === 'hard' && lt.value && !a.avoid.includes('co2')) a.avoid = [...a.avoid, 'co2'];
  const s = sizeNow(b); if (s) a.size = s;
  const bu = limitOf(b, 'constraints.budget'); if (bu) a.budget = bu;
  const ca = limitOf(b, 'constraints.careMin'); if (ca) a.care = ca;
  return a;
}

/** Take back exactly what an earlier set of answers wrote (never an item the person has since changed by hand). */
function retract(b: Brief, was: QuickAnswers): Brief {
  let out = b;
  if (was.size && !isDry(dirOf(out)) && sizeNow(out) === was.size && getItem(out, 'constraints.tankGal')?.status === 'preference') out = clearItem(out, 'constraints.tankGal');
  const pm = getItem(out, 'appearance.plantMode');
  if (pm?.status === 'hard' && ((was.plants === 'definitely' && pm.value === 'live') || (was.plants === 'not' && pm.value === 'artificial'))) out = clearItem(out, 'appearance.plantMode');
  const lt = getItem(out, 'preferences.lowtech'); if (was.avoid.includes('co2') && lt?.status === 'hard') out = clearItem(out, 'preferences.lowtech');
  for (const [k, id] of [['budget', 'constraints.budget'], ['care', 'constraints.careMin']] as const) if (was[k]) out = setBound(out, id, 'max', undefined);
  let asp: Aspects | undefined = aspectsOf(out);
  for (const k of Object.keys(toldKeys(was))) asp = tell(asp, k, 0);
  return putAspects(out, asp);
}
const putAspects = (b: Brief, a: Aspects | undefined): Brief => a ? setItem(b, 'preferences.aspects', a, 'preference') : clearItem(b, 'preferences.aspects');

/** Write a full set of answers: retract the earlier ones, then write these. The ONE writer for the screen and the Constraints block. */
export function applyQuickPrefs(b: Brief, next: QuickAnswers): Brief {
  const was = answersOf(b), a = normalize(next), d = dirOf(b);
  let out = retract(b, was);
  if (a.size && !isDry(d)) { const r = sizeRange(d, a.size); out = setRange(out, 'constraints.tankGal', { min: r.lo, max: r.hi }, 'preference'); }
  if (a.plants === 'definitely') out = setItem(out, 'appearance.plantMode', 'live', 'hard');
  if (a.plants === 'not') out = setItem(out, 'appearance.plantMode', 'artificial', 'hard');
  if (a.avoid.includes('co2')) out = setItem(out, 'preferences.lowtech', true, 'hard');
  for (const [k, id] of [['budget', 'constraints.budget'], ['care', 'constraints.careMin']] as const) { const l = a[k]; if (l) out = setStatus(setBound(out, id, 'max', l.max), id, l.firm ? 'hard' : 'preference'); }
  let asp = aspectsOf(out);
  for (const [k, v] of Object.entries(toldKeys(a))) asp = tell(asp, k, v);
  out = putAspects(out, asp);
  const { quick: _q, ...rest } = projectExtras(out), has = a.size || a.look.length || a.plants || a.avoid.length;
  return setProjectExtras(out, has ? { ...rest, quick: { ...(a.size ? { size: a.size } : {}), ...(a.look.length ? { look: a.look } : {}), ...(a.plants ? { plants: a.plants } : {}), ...(a.avoid.length ? { avoid: a.avoid } : {}) } } : rest);
}

export type Strength = 'hard' | 'prefer';
export interface Pref<T> { value: T; strength: Strength }
export interface QuickPrefs {
  /** aquatic habitats: the tank-size range, US gallons. 'prefer' for a size answer; 'hard' only when the same limit was made firm by hand */
  sizeGal?: Pref<{ lo: number; hi: number }>;
  /** dry habitats (terrarium, paludarium): floor area in square inches and height in inches. Always 'prefer' */
  floorSqIn?: Pref<{ lo: number; hi: number }>; heightIn?: Pref<{ lo: number; hi: number }>;
  /** live or artificial plants: Definitely = live/hard, Prefer = live/prefer, Prefer not = artificial/prefer, Definitely not = artificial/hard */
  plants?: Pref<'live' | 'artificial'>;
  /** the most the set-up may cost, USD; the most weekly upkeep, minutes. 'prefer' = a target, 'hard' = a firm maximum */
  budgetUsd?: Pref<number>; careMinPerWeek?: Pref<number>;
  /** look axes, always a preference */
  look: AxisWeights;
  /** HARD prohibitions (ids of AVOIDS): 'snails' | 'shrimp' | 'co2' | 'large-animals' (adult length at or over 6 in) */
  prohibit: AvoidId[];
}
/** The ONE reader for lane AB5's generator and ranking. Pure; an empty brief gives `{ look: {}, prohibit: [] }`.
 *  DO NOT OVERFIT: except for entries with `strength: 'hard'`, every answer only RANKS candidates. A 'prefer' answer must never remove an interesting alternative:
 *  a "prefer medium" project can still be offered a large tank, just lower in the order. Filter only through `passesHard`. */
export function readQuickPrefs(b: Brief): QuickPrefs {
  const a = answersOf(b), d = dirOf(b), out: QuickPrefs = { look: axesOf(a.look), prohibit: [...a.avoid] };
  if (a.size) {
    if (isDry(d)) { const x = dryOf(d, a.size)!; out.floorSqIn = { value: { ...x.floorSqIn }, strength: 'prefer' }; out.heightIn = { value: { ...x.heightIn }, strength: 'prefer' }; }
    else { const r = rangeOf(b, 'constraints.tankGal'); out.sizeGal = { value: { lo: r.min ?? 0, hi: r.max ?? Number.POSITIVE_INFINITY }, strength: getItem(b, 'constraints.tankGal')?.status === 'hard' ? 'hard' : 'prefer' }; }
  } else if (!isDry(d)) {
    const r = rangeOf(b, 'constraints.tankGal'); if (r.min !== undefined || r.max !== undefined) out.sizeGal = { value: { lo: r.min ?? 0, hi: r.max ?? Number.POSITIVE_INFINITY }, strength: getItem(b, 'constraints.tankGal')?.status === 'hard' ? 'hard' : 'prefer' };
  }
  const told = aspectsOf(b)?.told ?? {};
  if (a.plants === 'definitely') out.plants = { value: 'live', strength: 'hard' };
  else if (a.plants === 'not') out.plants = { value: 'artificial', strength: 'hard' };
  else if (a.plants === 'prefer') out.plants = { value: 'live', strength: 'prefer' };
  else if (a.plants === 'prefer-not') out.plants = { value: 'artificial', strength: 'prefer' };
  else if (told['natural:live'] === 1) out.plants = { value: 'live', strength: 'prefer' };
  else if (told['natural:live'] === -1 || told['natural:artificial'] === 1) out.plants = { value: 'artificial', strength: 'prefer' };
  if (a.budget) out.budgetUsd = { value: a.budget.max, strength: a.budget.firm ? 'hard' : 'prefer' };
  if (a.care) out.careMinPerWeek = { value: a.care.max, strength: a.care.firm ? 'hard' : 'prefer' };
  return out;
}

/** What `passesHard` needs to know about a candidate (all optional: an unknown fact never filters). */
export interface PrefFacts { gallons?: number | null; floorSqIn?: number; heightIn?: number; plants?: 'live' | 'artificial' | 'mixed'; species?: string[]; co2?: boolean; setupUsd?: number; weeklyMin?: number }
const inR = (v: number | undefined | null, r: { lo: number; hi: number }) => v === undefined || v === null || (v >= r.lo && v <= r.hi);
/** The only filter: a candidate fails when it breaks something marked HARD (a required / prohibited answer or a firm maximum). Preferences never fail a candidate. */
export function passesHard(q: QuickPrefs, c: PrefFacts): boolean {
  if (q.sizeGal?.strength === 'hard' && !inR(c.gallons, q.sizeGal.value)) return false;
  if (q.floorSqIn?.strength === 'hard' && !inR(c.floorSqIn, q.floorSqIn.value)) return false;
  if (q.heightIn?.strength === 'hard' && !inR(c.heightIn, q.heightIn.value)) return false;
  if (q.plants?.strength === 'hard' && c.plants) { if (q.plants.value === 'live' ? c.plants === 'artificial' : c.plants !== 'artificial') return false; }
  if (q.budgetUsd?.strength === 'hard' && c.setupUsd !== undefined && c.setupUsd > q.budgetUsd.value) return false;
  if (q.careMinPerWeek?.strength === 'hard' && c.weeklyMin !== undefined && c.weeklyMin > q.careMinPerWeek.value) return false;
  const sp = (c.species ?? []).map(getSpecies).filter((x): x is NonNullable<typeof x> => !!x);
  for (const p of q.prohibit) {
    if (p === 'co2' && c.co2) return false;
    if (p === 'snails' && sp.some(x => x.kind === 'snail')) return false;
    if (p === 'shrimp' && sp.some(x => /shrimp/i.test(x.name))) return false;
    if (p === 'large-animals' && sp.some(x => x.kind !== 'snail' && x.tl >= SIZE_LARGE_MM)) return false;
  }
  return true;
}
