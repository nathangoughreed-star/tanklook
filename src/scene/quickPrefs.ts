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
import { dryOf, isDry, sizeAtBand, sizeOf, sizeRange, type SizeChoice } from './sizePrefs';
import { archetypeByKey, archetypesFor, QUICK_ARCHETYPES, type ArchAxes, type QuickArchetype } from './quickArchetypes';

/** PRE-QP1 answers (the Look chips and the Live plants question). Not asked any more; `answersOf` migrates what an older save holds (see `migrateLegacy`). */
export type PlantsAnswer = 'definitely' | 'prefer' | 'prefer-not' | 'not';
export type LookChip = 'natural' | 'lush' | 'colourful' | 'minimal' | 'stylized';
/** QP1: a card's state. Unselected = absent from `arch` (nothing inferred from inaction). */
export type ArchState = 'interested' | 'avoid';
export type AvoidId = 'snails' | 'shrimp' | 'co2' | 'large-animals' | 'no-live-plants';
/** A practical limit: a TARGET (preference, "I'd prefer under") or a FIRM maximum (hard, "I can't spend more than"). */
export interface Limit { max: number; firm: boolean }
export interface QuickAnswers { size?: SizeChoice; /** slider thumb 0..1 inside the size band (UI only: the answer everyone reads is `size`) */ sizeAt?: number; /** archetype cards: catalogue key (scene/quickArchetypes.ts) to state; a card not listed is Unselected */ arch: Record<string, ArchState>; avoid: AvoidId[]; budget?: Limit; care?: Limit }
export const emptyAnswers = (): QuickAnswers => ({ arch: {}, avoid: [] });

const DRY = isDry;
export const AVOIDS: readonly { id: AvoidId; label: (d: HabitatDirection) => string; shown: (d: HabitatDirection) => boolean }[] = [
  { id: 'snails', label: () => 'Snails', shown: () => true },
  { id: 'shrimp', label: () => 'Shrimp', shown: d => !DRY(d) || d === 'paludarium' },
  { id: 'co2', label: () => 'A CO2 system', shown: d => d === 'freshwater' || d === 'paludarium' || d === 'unsure' },
  { id: 'large-animals', label: d => d === 'terrarium' ? 'Large animals' : 'Large fish', shown: () => true },
  /** QP1: a HARD exclusion (not the same as Avoid on a planted card). Saltwater has no plant planting (coral and algae are the stock). */
  { id: 'no-live-plants', label: () => 'Live plants', shown: d => d !== 'saltwater' },
];
export const NO_LIVE_LABEL = 'No live plants';
/** "Large" for the large-animals prohibition: adult length at or over this (150 mm = 6 in, explore/constants SIZE_LARGE_MM). */
export const LARGE_IN = Math.round(SIZE_LARGE_MM / 25.4);
/** The look axes, -1 .. +1; absent = no opinion. `ordered` is order versus wild (Minimal leans ordered); only the first three have a ranking aspect today. Look is ALWAYS a preference. */
export interface AxisWeights { natural?: number; lush?: number; colourful?: number; ordered?: number }
/** What the cards pull on: Interested adds the card's axes, Avoid subtracts them; the sum is clamped to -1 .. +1 (ranking only). */
export const axesOf = (arch: Readonly<Record<string, ArchState>>): AxisWeights => {
  const sum: Record<string, number> = {};
  for (const [k, st] of Object.entries(arch)) { const c = archetypeByKey(k); if (c) for (const [ax, v] of Object.entries(c.axes) as [keyof ArchAxes, number][]) sum[ax] = (sum[ax] ?? 0) + (st === 'interested' ? v : -v); }
  const out: AxisWeights = {};
  for (const [ax, v] of Object.entries(sum)) if (v) out[ax as keyof AxisWeights] = Math.max(-1, Math.min(1, v));
  return out;
};
// ---- PRE-QP1 answers: how an older save is read, and the told keys it wrote (so the next write can take them back)
const LEGACY_LOOK_TOLD: Record<LookChip, Record<string, 1 | -1>> = {
  natural: { 'colors:natural': 1, 'natural:live': 1 }, stylized: { 'natural:artificial': 1 }, lush: { 'plants:lush': 1 }, minimal: { 'plants:none': 1, 'plants:lush': -1 }, colourful: { 'colors:vivid': 1 },
};
const LEGACY_PLANT_TOLD: Record<PlantsAnswer, Record<string, 1 | -1>> = {
  definitely: { 'natural:live': 1 }, prefer: { 'natural:live': 1 }, 'prefer-not': { 'natural:artificial': 1, 'natural:live': -1 }, not: { 'natural:live': -1 },
};
const CHIP_MATCH: Record<LookChip, (a: ArchAxes) => boolean> = {
  natural: a => (a.natural ?? 0) > 0, lush: a => (a.lush ?? 0) > 0, colourful: a => (a.colourful ?? 0) > 0, minimal: a => (a.lush ?? 0) < 0 && (a.ordered ?? 0) > 0, stylized: a => (a.natural ?? 0) < 0,
};
export interface Migrated { arch: Record<string, ArchState>; avoid: AvoidId[]; /** what could not be carried over, in words (a chip no card stands for); undefined when everything moved */ note?: string }
/** Old Look chips and Live plants answer to cards: a chip becomes Interested on this habitat's cards that pull the same way (Stylized has none: it is reported, never dropped silently);
 *  Definitely not becomes the No live plants exclusion; Prefer / Definitely become Interested and Prefer not Avoid on the live-planted cards. ("Definitely live" stays the brief's own hard item.) */
export function migrateLegacy(d: HabitatDirection, look: readonly LookChip[], plants?: PlantsAnswer): Migrated {
  const cards = archetypesFor(d), arch: Record<string, ArchState> = {}, lost: string[] = [], avoid: AvoidId[] = [];
  for (const chip of look) { const hit = cards.filter(c => CHIP_MATCH[chip](c.axes)); if (!hit.length) lost.push(chip); for (const c of hit) arch[c.key] = 'interested'; }
  if (plants === 'not' && AVOIDS.find(x => x.id === 'no-live-plants')!.shown(d)) avoid.push('no-live-plants');
  if (plants === 'prefer' || plants === 'definitely') for (const c of cards) if (c.needsLive) arch[c.key] ??= 'interested';
  if (plants === 'prefer-not') for (const c of cards) if (c.needsLive) arch[c.key] ??= 'avoid';
  return { arch, avoid, ...(lost.length ? { note: `Your earlier "${lost.join('", "')}" look ${lost.length > 1 ? 'choices have' : 'choice has'} no picture card in this habitat and was not carried over.` } : {}) };
}

/** Tidy a set of answers: unknown cards and states dropped, duplicates removed, limits rounded. A card holds one state, so cards never contradict. */
export function normalize(a: QuickAnswers): QuickAnswers {
  const arch: Record<string, ArchState> = {};
  for (const [k, v] of Object.entries(a.arch ?? {})) if (archetypeByKey(k) && (v === 'interested' || v === 'avoid')) arch[k] = v;
  const lim = (l?: Limit) => l && Number.isFinite(l.max) && l.max > 0 ? { max: Math.round(l.max), firm: !!l.firm } : undefined, b = lim(a.budget), c = lim(a.care);
  const at = a.size && a.sizeAt !== undefined && sizeAtBand(a.sizeAt) === a.size ? { sizeAt: a.sizeAt } : {};
  return { ...(a.size ? { size: a.size } : {}), ...at, arch, avoid: [...new Set(a.avoid)].filter(x => AVOIDS.some(v => v.id === x)), ...(b ? { budget: b } : {}), ...(c ? { care: c } : {}) };
}
/** The cards as "You told us" keys: Avoid writes -1 first, Interested +1 after, so where two cards share a key the positive wins. All from the closed vocabulary (explore/aspects.ts). */
const toldKeys = (a: QuickAnswers): Record<string, 1 | -1> => {
  const t: Record<string, 1 | -1> = {}, keys = (k: string) => archetypeByKey(k)?.told ?? [];
  for (const [k, st] of Object.entries(a.arch)) if (st === 'avoid') for (const x of keys(k)) t[x] = -1;
  for (const [k, st] of Object.entries(a.arch)) if (st === 'interested') for (const x of keys(k)) t[x] = 1;
  return t;
};
interface Legacy { look: LookChip[]; plants?: PlantsAnswer }
const legacyOf = (b: Brief): Legacy | undefined => { const q = projectExtras(b).quick; return q && (q.look?.length || q.plants) ? { look: (q.look ?? []) as LookChip[], ...(q.plants ? { plants: q.plants } : {}) } : undefined; };
const legacyTold = (l: Legacy): Record<string, 1 | -1> => { const t: Record<string, 1 | -1> = {}; for (const c of l.look) Object.assign(t, LEGACY_LOOK_TOLD[c]); if (l.plants) Object.assign(t, LEGACY_PLANT_TOLD[l.plants]); return t; };
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
  const q = projectExtras(b).quick, d = dirOf(b), lg = legacyOf(b), mig = lg ? migrateLegacy(d, lg.look, lg.plants) : undefined;
  const a: QuickAnswers = { arch: { ...(mig?.arch ?? {}), ...((q?.arch ?? {}) as Record<string, ArchState>) }, avoid: [...new Set([...((q?.avoid ?? []) as string[]), ...(mig?.avoid ?? [])])].filter(x => AVOIDS.some(v => v.id === x)) as AvoidId[] };
  for (const k of Object.keys(a.arch)) if (!archetypeByKey(k)) delete a.arch[k];
  const pm = getItem(b, 'appearance.plantMode');
  if (pm && !pm.off && pm.status === 'hard' && pm.value === 'artificial' && !a.avoid.includes('no-live-plants')) a.avoid = [...a.avoid, 'no-live-plants'];
  const lt = getItem(b, 'preferences.lowtech'); if (lt && !lt.off && lt.status === 'hard' && lt.value && !a.avoid.includes('co2')) a.avoid = [...a.avoid, 'co2'];
  const s = sizeNow(b); if (s) { a.size = s; const at = q?.sizeAt; if (at !== undefined && sizeAtBand(at) === s) a.sizeAt = at; }
  const bu = limitOf(b, 'constraints.budget'); if (bu) a.budget = bu;
  const ca = limitOf(b, 'constraints.careMin'); if (ca) a.care = ca;
  return a;
}
/** What an older save's Look / Live plants answers could not become (data for the UI to say once); undefined when nothing was lost. */
export const migrationNote = (b: Brief): string | undefined => { const lg = legacyOf(b); return lg ? migrateLegacy(dirOf(b), lg.look, lg.plants).note : undefined; };

/** Take back exactly what an earlier set of answers wrote (never an item the person has since changed by hand). */
function retract(b: Brief, was: QuickAnswers): Brief {
  let out = b;
  if (was.size && !isDry(dirOf(out)) && sizeNow(out) === was.size && getItem(out, 'constraints.tankGal')?.status === 'preference') out = clearItem(out, 'constraints.tankGal');
  const pm = getItem(out, 'appearance.plantMode');
  if (pm?.status === 'hard' && pm.value === 'artificial' && was.avoid.includes('no-live-plants')) out = clearItem(out, 'appearance.plantMode');
  const lt = getItem(out, 'preferences.lowtech'); if (was.avoid.includes('co2') && lt?.status === 'hard') out = clearItem(out, 'preferences.lowtech');
  for (const [k, id] of [['budget', 'constraints.budget'], ['care', 'constraints.careMin']] as const) if (was[k]) out = setBound(out, id, 'max', undefined);
  let asp: Aspects | undefined = aspectsOf(out);
  const lg = legacyOf(b); for (const k of [...Object.keys(toldKeys(was)), ...Object.keys(lg ? legacyTold(lg) : {})]) asp = tell(asp, k, 0);
  return putAspects(out, asp);
}
const putAspects = (b: Brief, a: Aspects | undefined): Brief => a ? setItem(b, 'preferences.aspects', a, 'preference') : clearItem(b, 'preferences.aspects');

/** Write a full set of answers: retract the earlier ones, then write these. The ONE writer for the screen and the Constraints block. */
export function applyQuickPrefs(b: Brief, next: QuickAnswers): Brief {
  const was = answersOf(b), a = normalize(next), d = dirOf(b);
  let out = retract(b, was);
  if (a.size && !isDry(d)) { const r = sizeRange(d, a.size); out = setRange(out, 'constraints.tankGal', { min: r.lo, max: r.hi }, 'preference'); }
  if (a.avoid.includes('no-live-plants')) out = setItem(out, 'appearance.plantMode', 'artificial', 'hard');
  if (a.avoid.includes('co2')) out = setItem(out, 'preferences.lowtech', true, 'hard');
  for (const [k, id] of [['budget', 'constraints.budget'], ['care', 'constraints.careMin']] as const) { const l = a[k]; if (l) out = setStatus(setBound(out, id, 'max', l.max), id, l.firm ? 'hard' : 'preference'); }
  let asp = aspectsOf(out);
  for (const [k, v] of Object.entries(toldKeys(a))) asp = tell(asp, k, v);
  out = putAspects(out, asp);
  const { quick: _q, ...rest } = projectExtras(out), has = a.size || Object.keys(a.arch).length || a.avoid.length;
  return setProjectExtras(out, has ? { ...rest, quick: { ...(a.size ? { size: a.size } : {}), ...(a.size && a.sizeAt !== undefined ? { sizeAt: a.sizeAt } : {}), ...(Object.keys(a.arch).length ? { arch: a.arch } : {}), ...(a.avoid.length ? { avoid: a.avoid } : {}) } } : rest);
}

export type Strength = 'hard' | 'prefer';
export interface Pref<T> { value: T; strength: Strength }
export interface QuickPrefs {
  /** aquatic habitats: the tank-size range, US gallons. 'prefer' for a size answer; 'hard' only when the same limit was made firm by hand */
  sizeGal?: Pref<{ lo: number; hi: number }>;
  /** dry habitats (terrarium, paludarium): floor area in square inches and height in inches. Always 'prefer' */
  floorSqIn?: Pref<{ lo: number; hi: number }>; heightIn?: Pref<{ lo: number; hi: number }>;
  /** live or artificial plants. Only the brief's own HARD "live plants" item or a told weight from A/B lives here now; No live plants is in `prohibit`. */
  plants?: Pref<'live' | 'artificial'>;
  /** the most the set-up may cost, USD; the most weekly upkeep, minutes. 'prefer' = a target, 'hard' = a firm maximum */
  budgetUsd?: Pref<number>; careMinPerWeek?: Pref<number>;
  /** look axes, always a preference */
  look: AxisWeights;
  /** QP1: the cards. `layouts` / `families` are Explore ids, +1 Interested / -1 Avoid: RANKING signals only (Interested wins where two cards share an id). `interested` / `avoid` are card keys. */
  arch: { interested: string[]; avoid: string[]; layouts: Record<string, 1 | -1>; families: Record<string, 1 | -1> };
  /** HARD prohibitions (ids of AVOIDS): 'snails' | 'shrimp' | 'co2' | 'large-animals' (adult length at or over 6 in) | 'no-live-plants' (no candidate may hold a living plant) */
  prohibit: AvoidId[];
}
const archPrefs = (arch: Readonly<Record<string, ArchState>>): QuickPrefs['arch'] => {
  const out: QuickPrefs['arch'] = { interested: [], avoid: [], layouts: {}, families: {} };
  for (const st of ['avoid', 'interested'] as const) for (const [k, v] of Object.entries(arch)) {
    const c = archetypeByKey(k); if (!c || v !== st) continue; (st === 'interested' ? out.interested : out.avoid).push(k);
    const w = st === 'interested' ? 1 : -1; for (const l of c.layouts) out.layouts[l] = w; for (const f of c.families) out.families[f] = w;
  }
  return out;
};
/** The ONE reader for lane AB5's generator and ranking. Pure; an empty brief gives `{ look: {}, prohibit: [] }`.
 *  DO NOT OVERFIT: except for entries with `strength: 'hard'`, every answer only RANKS candidates. A 'prefer' answer must never remove an interesting alternative:
 *  a "prefer medium" project can still be offered a large tank, just lower in the order. Filter only through `passesHard`. */
export function readQuickPrefs(b: Brief): QuickPrefs {
  const a = answersOf(b), d = dirOf(b), out: QuickPrefs = { look: axesOf(a.arch), arch: archPrefs(a.arch), prohibit: [...a.avoid] };
  if (a.size) {
    if (isDry(d)) { const x = dryOf(d, a.size)!; out.floorSqIn = { value: { ...x.floorSqIn }, strength: 'prefer' }; out.heightIn = { value: { ...x.heightIn }, strength: 'prefer' }; }
    else { const r = rangeOf(b, 'constraints.tankGal'); out.sizeGal = { value: { lo: r.min ?? 0, hi: r.max ?? Number.POSITIVE_INFINITY }, strength: getItem(b, 'constraints.tankGal')?.status === 'hard' ? 'hard' : 'prefer' }; }
  } else if (!isDry(d)) {
    const r = rangeOf(b, 'constraints.tankGal'); if (r.min !== undefined || r.max !== undefined) out.sizeGal = { value: { lo: r.min ?? 0, hi: r.max ?? Number.POSITIVE_INFINITY }, strength: getItem(b, 'constraints.tankGal')?.status === 'hard' ? 'hard' : 'prefer' };
  }
  const told = aspectsOf(b)?.told ?? {};
  const pm = getItem(b, 'appearance.plantMode');
  if (pm && !pm.off && pm.status === 'hard' && pm.value === 'live') out.plants = { value: 'live', strength: 'hard' };
  else if (a.avoid.includes('no-live-plants')) { /* the exclusion is in prohibit; nothing softer to add */ }
  else if (told['natural:live'] === 1) out.plants = { value: 'live', strength: 'prefer' };
  else if (told['natural:live'] === -1 || told['natural:artificial'] === 1) out.plants = { value: 'artificial', strength: 'prefer' };
  if (a.budget) out.budgetUsd = { value: a.budget.max, strength: a.budget.firm ? 'hard' : 'prefer' };
  if (a.care) out.careMinPerWeek = { value: a.care.max, strength: a.care.firm ? 'hard' : 'prefer' };
  return out;
}

/** What `passesHard` needs to know about a candidate (all optional: an unknown fact never filters). */
export interface PrefFacts { gallons?: number | null; floorSqIn?: number; heightIn?: number; plants?: 'live' | 'artificial' | 'mixed'; species?: string[]; co2?: boolean; /** living plants in the finished design (items of kind plant); unknown never filters */ livePlants?: number; setupUsd?: number; weeklyMin?: number }
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
    if (p === 'no-live-plants' && ((c.livePlants ?? 0) > 0 || (c.livePlants === undefined && c.plants !== undefined && c.plants !== 'artificial'))) return false;
    if (p === 'snails' && sp.some(x => x.kind === 'snail')) return false;
    if (p === 'shrimp' && sp.some(x => /shrimp/i.test(x.name))) return false;
    if (p === 'large-animals' && sp.some(x => x.kind !== 'snail' && x.tl >= SIZE_LARGE_MM)) return false;
  }
  return true;
}

/** The conflict case as DATA for the UI: a card for a live-planted look is Interested while No live plants is on. The exclusion wins (those looks are never generated, and artificial plants are never passed off as
 *  the live-planted look); `text` says so honestly and names the closest looks that need no living plants. `flag` false = no conflict. */
export interface CompromiseNote { flag: boolean; text: string; /** card keys the exclusion left out */ lost: string[]; /** closest cards that need no live plants (same habitat) */ alternatives: string[] }
export function compromiseNote(q: Pick<QuickPrefs, 'arch' | 'prohibit'>): CompromiseNote {
  const none: CompromiseNote = { flag: false, text: '', lost: [], alternatives: [] };
  if (!q.prohibit.includes('no-live-plants')) return none;
  const lost = q.arch.interested.map(archetypeByKey).filter((c): c is QuickArchetype => !!c && c.needsLive);
  if (!lost.length) return none;
  const dot = (x: QuickArchetype, y: QuickArchetype) => (['natural', 'lush', 'colourful', 'ordered'] as const).reduce((t, k) => t + (x.axes[k] ?? 0) * (y.axes[k] ?? 0), 0);
  const alts = new Map<string, number>();
  for (const l of lost) for (const c of QUICK_ARCHETYPES) if (c.habitat === l.habitat && !c.needsLive && !q.arch.avoid.includes(c.key)) alts.set(c.key, Math.max(alts.get(c.key) ?? -9, dot(l, c)));
  const alternatives = [...alts].sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]);
  const names = lost.map(c => c.label), alt = alternatives.map(k => archetypeByKey(k)!.label);
  return { flag: true, lost: lost.map(c => c.key), alternatives, text: `No live plants stays on, so the exact ${names.join(' / ')} look (living plants) is not offered, and artificial plants are not passed off as it.${alt.length ? ` Closest looks without living plants: ${alt.join(', ')}.` : ' Nothing close enough exists without living plants in this habitat.'}` };
}
