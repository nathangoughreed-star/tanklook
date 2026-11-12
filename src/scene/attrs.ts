// AB7 (2026-11-10): the ATTRIBUTE PANEL's pure model. Every attribute of a candidate tank, its value in words, the lock that holds it, and the thumbs (soft guidance).
// ONE lock model: the DX0 locks (scene/locks.ts: 'tank', 'substrate', 'backdrop', the gear parts 'light' / 'filter' / 'heater', item uids, roster rows). Nothing here invents another.
// THUMBS are soft: a thumb up / down on an attribute VALUE is a small, bounded ranking nudge (thumbBonus, used only by pairGen's ranking, never by a filter or a gate) and, where the
// learner's closed vocabulary has a tag for the attribute, a tagged taste event (explore/aspects.ts). A thumb is never a "told" hard answer and never a lock.
import { BACKDROPS } from '../render/backdrop';
import { LIBRARY, layerOf } from './items';
import { choiceOf, optionDef } from './tech';
import { gearPart, HARDSCAPE_KEYS, isLocked, locksOf, SUBSTRATE_KEYS, type GearLock } from './locks';
import type { AspectTag } from '../explore/aspects';
import type { CandidateFacts } from './discoveryTypes';
import type { TankSetup } from './types';
import { MAX_FEEDBACK, type Feedback } from './brief';

export type AttrKey = 'tank' | 'stocking' | 'hardscape' | 'background' | 'substrate' | 'plants' | 'lighting' | 'filtration' | 'heating' | 'stand';
export const ATTRS: readonly { key: AttrKey; label: string }[] = [
  { key: 'tank', label: 'Tank size' }, { key: 'stocking', label: 'Stocking' }, { key: 'hardscape', label: 'Hardscape' }, { key: 'background', label: 'Background' }, { key: 'substrate', label: 'Substrate' },
  { key: 'plants', label: 'Plants' }, { key: 'lighting', label: 'Lighting' }, { key: 'filtration', label: 'Filtration' }, { key: 'heating', label: 'Heating' },
  { key: 'stand', label: 'Stand color' },
];

/** What holds an attribute: one of the existing lock targets, or the set of them (every species, every piece). */
export type AttrLock = { kind: 'tank' } | { kind: 'substrate' } | { kind: 'backdrop' } | { kind: 'gear'; part: GearLock } | { kind: 'fish'; species: string[] } | { kind: 'items'; uids: string[] };
export interface AttrValue { key: AttrKey; label: string; /** the value in words */ text: string; /** the parts that make it up (species, variants, ...), the unit a thumb remembers */ elements: string[]; lock: AttrLock | undefined }

const lib = (v: string) => LIBRARY[v]?.label ?? v;
const uniq = (xs: string[]) => { const u = [...new Set(xs)].sort(); return u.length ? u : ['none']; };
const countBy = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const withN = (xs: string[]) => [...countBy(xs)].map(([k, n]) => `${n > 1 ? n + ' ' : ''}${lib(k)}`).join(', ');
const optLabel = (S: TankSetup, row: 'filter' | 'heater') => { try { const o = optionDef(row, choiceOf(S, row)); return o?.label ?? 'None'; } catch { return 'Not set'; } };

/** The value of every attribute of one design, in the fixed ATTRS order. A dry build has no gallons; `facts` only supplies the names the screen already shows. */
export function attrValues(S: TankSetup, facts: CandidateFacts): AttrValue[] {
  const items = S.items.filter(i => i.uid), plantIt = items.filter(i => layerOf(i) === 'plant'), hardIt = items.filter(i => layerOf(i) !== 'plant');
  const sub = facts.substrate.length ? facts.substrate : ['Substrate'];
  const out: Record<AttrKey, Omit<AttrValue, 'key' | 'label'>> = {
    tank: { text: facts.gallons == null ? `Dry build, ${Math.round(S.tank.L / 25.4)} x ${Math.round(S.tank.D / 25.4)} x ${Math.round(S.tank.H / 25.4)} in` : `${facts.gallons} gal`, elements: [facts.gallons == null ? `dry:${Math.round(S.tank.L / 25.4)}x${Math.round(S.tank.D / 25.4)}x${Math.round(S.tank.H / 25.4)}` : `gal:${facts.gallons}`], lock: { kind: 'tank' } },
    stocking: { text: facts.stocking.map(s => `${s.n} ${s.name}`).join(', ') || 'No animals', elements: uniq(facts.stocking.map(s => s.species)), lock: facts.stocking.length ? { kind: 'fish', species: facts.stocking.map(s => s.species) } : undefined },
    hardscape: { text: withN(hardIt.map(i => i.variant)) || 'None', elements: uniq(hardIt.map(i => i.variant)), lock: hardIt.length ? { kind: 'items', uids: hardIt.map(i => i.uid!) } : undefined },
    background: { text: S.backdrop.kind === 'none' ? 'None' : (BACKDROPS[S.backdrop.kind] ?? S.backdrop.kind), elements: [`backdrop:${S.backdrop.kind}`], lock: { kind: 'backdrop' } },
    substrate: { text: sub.join(', '), elements: uniq(sub.map(x => 'sub:' + x)), lock: { kind: 'substrate' } },
    plants: { text: withN(plantIt.map(i => i.variant)) || 'None', elements: uniq(plantIt.map(i => i.variant)), lock: plantIt.length ? { kind: 'items', uids: plantIt.map(i => i.uid!) } : undefined },
    lighting: { text: S.light.type === 'led' || S.light.type === 'flat' || S.light.type === 'tube' || S.light.type === 'spot' ? `${S.light.count > 1 ? S.light.count + ' x ' : ''}${S.light.type} light` : 'Light', elements: [`light:${S.light.type}:${S.light.count}`], lock: { kind: 'gear', part: 'light' } },
    filtration: { text: optLabel(S, 'filter'), elements: ['filter:' + choiceOf(S, 'filter')], lock: { kind: 'gear', part: 'filter' } },
    stand: { text: S.stand.finish === 'oak' ? 'Oak' : S.stand.finish === 'white' ? 'White' : 'Black', elements: ['stand:' + S.stand.finish], lock: { kind: 'gear', part: 'stand' } },
    heating: { text: optLabel(S, 'heater'), elements: ['heater:' + choiceOf(S, 'heater')], lock: { kind: 'gear', part: 'heater' } },
  };
  return ATTRS.map(a => ({ key: a.key, label: a.label, ...out[a.key] }));
}
/** Two values read the same (the panel then shows one cell instead of two). */
export const sameValue = (a: AttrValue, b: AttrValue) => a.text === b.text && JSON.stringify(a.elements) === JSON.stringify(b.elements);

/** Is the attribute held fixed in the working project right now (all of its parts)? Reads the SAME locks the lock / unlock controls write. */
export function isHeld(tank: TankSetup, l: AttrLock | undefined): boolean {
  if (!l) return false;
  const L = locksOf(tank);
  switch (l.kind) {
    case 'tank': case 'substrate': case 'backdrop': return isLocked(tank, l.kind);
    case 'gear': return isLocked(tank, l.part);
    case 'fish': return [...new Set(l.species)].every(sp => L.roster.some(r => r.species === sp));
    case 'items': return l.uids.every(u => isLocked(tank, u));
  }
}

// ---------------------------------------------------------------------------------------------------------------- thumbs (soft guidance)
export interface Thumb { v: 1 | -1; /** the attribute value's parts */ e: string[] }
export type ThumbMap = Record<string, Thumb>;
const MAX_THUMBS = 60, MAX_PARTS = 30;
export const thumbKey = (attr: AttrKey, elements: readonly string[]) => `${attr}|${[...elements].sort().join(',')}`.slice(0, 200);
export const thumbOf = (m: ThumbMap | undefined, attr: AttrKey, elements: readonly string[]): 0 | 1 | -1 => m?.[thumbKey(attr, elements)]?.v ?? 0;
/** Set a thumb on one attribute VALUE: up and down are mutually exclusive (setting one replaces the other), 0 takes it back. Pure; the oldest thumbs fall off the end. */
export function setThumb(m: ThumbMap | undefined, attr: AttrKey, elements: readonly string[], v: 1 | -1 | 0): ThumbMap {
  const k = thumbKey(attr, elements), out: ThumbMap = { ...(m ?? {}) }; delete out[k];
  if (v) out[k] = { v, e: [...elements].slice(0, MAX_PARTS) };
  const keys = Object.keys(out); for (const x of keys.slice(0, Math.max(0, keys.length - MAX_THUMBS))) delete out[x];
  return out;
}
/** The size of one thumb's nudge on the ranking, per attribute, at full overlap (small: a thumb is a hint, a told preference weighs 0.3 to 0.5). */
export const THUMB_STEP = 0.12;
/**
 * The ranking nudge the thumbs give a design: for each thumbed value, +/- THUMB_STEP times how much of that value's parts the design has (0 to 1). Bounded, so one run of thumbs never
 * outweighs a told preference. RANKING ONLY: this number is added to a score; nothing reads it as a filter, a gate or a constraint (tested).
 */
export function thumbBonus(m: ThumbMap | undefined, S: TankSetup, facts: CandidateFacts): number {
  if (!m) return 0;
  const vals = new Map(attrValues(S, facts).map(a => [a.key, a.elements] as const)); let v = 0;
  for (const [k, t] of Object.entries(m)) {
    const mine = vals.get(k.split('|')[0] as AttrKey); if (!mine || !t.e.length) continue;
    const inter = t.e.filter(x => mine.includes(x)).length, union = new Set([...t.e, ...mine]).size;
    v += t.v * THUMB_STEP * (union ? inter / union : 0);
  }
  return Math.max(-0.5, Math.min(0.5, v));
}
// ---------------------------------------------------------------------------------------------------------------- DQ8: Like / Dislike feedback (the thumbs' successor)
/** Identity of one feedback entry: the same level, category, target and parts replace each other (like and dislike are exclusive; 0 takes it back). */
export const feedbackKey = (f: Pick<Feedback, 'level' | 'cat' | 'target' | 'elements'>) => `${f.level}|${f.cat ?? ''}|${f.target ?? ''}|${[...(f.elements ?? [])].sort().join(',')}`.slice(0, 260);
/** Put one entry (v 1 / -1) or take it back (v 0). Pure. `at` is one past the newest, so the newest wins; the oldest fall off past MAX_FEEDBACK (FIFO). */
export function setFeedback(list: readonly Feedback[] | undefined, e: Omit<Feedback, 'at' | 'v'> & { v: 1 | -1 | 0 }): Feedback[] {
  const k = feedbackKey(e), rest = (list ?? []).filter(x => feedbackKey(x) !== k);
  if (!e.v) return rest;
  const at = rest.reduce((m, x) => Math.max(m, x.at), 0) + 1;
  return [...rest, { ...e, v: e.v, ...(e.elements ? { elements: e.elements.slice(0, MAX_PARTS) } : {}), at }].slice(-MAX_FEEDBACK);
}
/** The attribute-level entries as the old thumb map (the Discovery screen and its adapter still speak ThumbMap). */
export function thumbMapOf(list: readonly Feedback[] | undefined): ThumbMap {
  const m: ThumbMap = {};
  for (const f of list ?? []) if (f.level === 'attr' && f.cat && f.elements) m[thumbKey(f.cat as AttrKey, f.elements)] = { v: f.v, e: f.elements };
  return m;
}
/** AB13 pick / AB7 thumb on one attribute VALUE, written as a feedback entry. */
export const setAttrFeedback = (list: readonly Feedback[] | undefined, attr: AttrKey, elements: readonly string[], v: 1 | -1 | 0): Feedback[] => setFeedback(list, { level: 'attr', cat: attr, elements: [...elements], v });
/** DQ8 (D5): direct feedback has its OWN cap, separate from the A/B-learned one. */
export const FEEDBACK_CAP = 0.8, FEEDBACK_STEP = { attr: THUMB_STEP, category: THUMB_STEP, item: 0.25, design: 0.25 } as const;
export interface FeedbackScore { total: number; raw: number; why: string[] }
/**
 * The ranking nudge direct feedback gives a design, capped at +-FEEDBACK_CAP. RANKING ONLY (nothing filters on it). Each entry scores by how much of its parts the design has:
 *   attr / category: overlap with that attribute's value (as the old thumbs). item: the share of its parts present anywhere in the design. design: overlap with the design's feature keys.
 * A Dislike therefore only lowers designs that contain THAT element; a category or a layout is never banned.
 */
export function feedbackScore(list: readonly Feedback[] | undefined, S: TankSetup, facts: CandidateFacts, features: readonly string[] = []): FeedbackScore {
  if (!list?.length) return { total: 0, raw: 0, why: [] };
  const vals = attrValues(S, facts), byKey = new Map(vals.map(a => [a.key as string, a.elements] as const)), all = new Set<string>([...vals.flatMap(a => a.elements), ...features]);
  let raw = 0; const why: string[] = [];
  for (const f of list) {
    const parts = f.elements ?? []; if (!parts.length) continue; let share = 0;
    if (f.level === 'attr' || f.level === 'category') { const mine = f.cat ? byKey.get(f.cat) : undefined; if (!mine) continue; const u = new Set([...parts, ...mine]).size; share = u ? parts.filter(x => mine.includes(x)).length / u : 0; }
    else if (f.level === 'item') share = parts.filter(x => all.has(x)).length / parts.length;
    else { const u = new Set([...parts, ...features]).size; share = u ? parts.filter(x => features.includes(x)).length / u : 0; }
    const d = f.v * FEEDBACK_STEP[f.level] * share; if (d) { raw += d; why.push(`${f.v > 0 ? '+' : '-'}${f.level}${f.cat ? ':' + f.cat : ''} ${parts.slice(0, 2).join('/')}`); }
  }
  return { total: Math.max(-FEEDBACK_CAP, Math.min(FEEDBACK_CAP, raw)), raw, why };
}
// ---------------------------------------------------------------------------------------------------------------- AB13: A / No opinion / B (replaces the thumbs matrix)
/** One optional comparison row the person staged before the overall vote: which side's VALUE of the attribute appeals more. Absent = no opinion (never dislike, never equal). */
export type RelSide = 'A' | 'B';
export type RelPicks = Partial<Record<AttrKey, RelSide>>;
/** The attributes worth a comparison row: those whose value differs between the two designs (same text AND same parts = no row). */
export function differingAttrs(a: readonly AttrValue[], b: readonly AttrValue[]): AttrKey[] { return a.filter((x, i) => b[i] && !sameValue(x, b[i])).map(x => x.key); }
/** Staged picks -> what the engine records at the vote: the PREFERRED side's value only (a soft +1 evidence on that value). The other side's value gets nothing: no dislike, no ban, no lock. Picks for attributes that do not differ are dropped. */
export function relEvidence(p: RelPicks | undefined, a: readonly AttrValue[], b: readonly AttrValue[]): { attr: AttrKey; elements: string[]; side: RelSide }[] {
  if (!p) return []; const diff = new Set(differingAttrs(a, b)), out: { attr: AttrKey; elements: string[]; side: RelSide }[] = [];
  for (const k of ATTRS.map(x => x.key)) { const s = p[k]; if (!s || !diff.has(k)) continue; const v = (s === 'A' ? a : b).find(x => x.key === k); if (v) out.push({ attr: k, elements: v.elements, side: s }); }
  return out;
}
/** The attributes the Combine path can carry from one design to the other (the five tabs). Others get no "Try ... in ..." button. */
export const COMBINE_ATTR_TAB: Partial<Record<AttrKey, 'tank' | 'animals' | 'plants' | 'hardscape' | 'substrate'>> = { tank: 'tank', stocking: 'animals', plants: 'plants', hardscape: 'hardscape', substrate: 'substrate' };

/** The learner's tags an attribute can speak for (explore/aspects.ts vocabulary). An empty list = only the ranking nudge applies (no tag exists for it, and none is invented). */
export const ATTR_TAGS: Record<AttrKey, readonly AspectTag[]> = {
  tank: [], stocking: ['species', 'behavior', 'size', 'number', 'visibility'], hardscape: ['layout'], background: [], substrate: [], plants: ['plants', 'natural'], lighting: [], filtration: [], heating: [], stand: [],
};

/**
 * AB10: is THIS candidate's value the one that is locked? 'held' = the lock is on and it names this very value; 'other' = the attribute is locked but to a DIFFERENT value
 * (the other card's, or the working design's): a persistent lock names exactly one value, so the cell must not read "Locked" (it offers to replace the lock); 'free' = not locked.
 * Whole-attribute locks of the singular parts (tank, substrate, background, gear) hold the working design's value, so compare it with the candidate's. Pieces and animals are named by uid / species already.
 */
export type HeldState = 'held' | 'other' | 'free';
export function heldState(tank: TankSetup, cand: TankSetup, l: AttrLock | undefined): HeldState {
  if (l?.kind === 'items' && foreignPieces(tank, cand, l.uids).length) return 'other';
  if (!isHeld(tank, l)) return 'free';
  if (!l) return 'free';
  const same = (ks: readonly (keyof TankSetup)[]) => ks.every(k => JSON.stringify(tank[k]) === JSON.stringify(cand[k]));
  switch (l.kind) {
    case 'tank': return JSON.stringify(tank.tank) === JSON.stringify(cand.tank) ? 'held' : 'other';
    case 'substrate': return same(SUBSTRATE_KEYS) ? 'held' : 'other';
    case 'backdrop': return same(HARDSCAPE_KEYS) ? 'held' : 'other';
    case 'gear': return JSON.stringify(gearPart(tank, l.part)) === JSON.stringify(gearPart(cand, l.part)) ? 'held' : 'other';
    case 'items': {   // PS1: a lock holds ONE set of pieces (hardscape, or plants): pieces locked from another design make this 'other' (locking replaces them, after a warning)
      if (foreignPieces(tank, cand, l.uids).length) return 'other';
      return 'held';
    }
    default: return 'held';
  }
}
/** PS1: locked pieces of the same kind (plants / hardscape) as `uids` that are not in `cand`: they belong to another design (or the working one), so locking `uids` would replace them. */
export function foreignPieces(tank: TankSetup, cand: TankSetup, uids: readonly string[]): string[] {
  const cls = (i: { variant: string }) => layerOf(i as never) === 'plant', first = cand.items.find(i => i.uid && uids.includes(i.uid)); if (!first) return [];
  const mine = cls(first), inCand = new Set(cand.items.map(i => i.uid));
  return tank.items.filter(i => i.uid && cls(i) === mine && isLocked(tank, i.uid) && !inCand.has(i.uid)).map(i => i.uid!);
}
