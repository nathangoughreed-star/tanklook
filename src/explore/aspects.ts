// Explore, stage X2 (lane OX4): the PREFERENCE PROFILE, what Like / Pass / Save / Make This Mine and the "What caught your eye?" tags teach the ranking (spec section 5,
// research/design/open-to-anything-reconcile.md section 5). Stored in the brief as `preferences.aspects`, so it saves, undoes and shares with the project.
// PREFERENCES DECIDE PRIORITY, CONSTRAINTS DECIDE ELIGIBILITY: nothing here reads a limit, a gate verdict or an estimate's range, and no tag can name a limit (the vocabulary below is closed and a test
// walks it). The profile never changes the eligible set: it only ranks what the gate already let through (rank.ts, the one place that takes both, as two separate arguments).
// What it learns is per ASPECT of a candidate (a feature such as `colors:vivid`, `species:neon`, `world:marine`), not per archetype:
//   Like / Pass with tags      the tagged aspects only, at full step; "off" tags are the aspects that put the person off.
//   Like / Pass without tags   unattributed: a weak step over the candidate's features, and a Pass never lowers a WORLD or a look FAMILY (only explicit tags do), so one dislike is not a ban.
//   Unrated                    no event at all.
//   Save                       a weak positive, nothing committed.   Make This Mine   the strongest positive on every aspect of that candidate.
//   You told us                a person's own edit of the interpretation: it overrides what was learned, without the early-signal fade.
// Mechanics follow demand/taste.ts (capped event list, decay per later event, undo, clear, parse*): each event fades older ones, a feature's weight is scaled by how many events spoke for it
// (uncertainty), capped (tunnel vision), and a world's weight has a floor so a world can be lowered but never reaches zero.
import { FAMILIES, ARCHETYPES, type Env, type Water } from '../scene/archetypes';
import { clearItem, getItem, setItem, type Brief } from '../scene/brief';
import { getSpecies } from '../data/species';
import type { Outcome, ReasonKey } from '../scene/discoveryTypes';
import { ASPECT_CAP, ASPECT_DECAY, ASPECT_EVENTS, ASPECT_STEP, CARE_HIGH_MIN, CARE_LOW_MIN, CONFIDENCE_K, LUSH_PLANTS, NUMBER_FEW, NUMBER_MANY, SIZE_LARGE_MM, SIZE_SMALL_MM, SMALL_TANK_GAL, SOME_PLANTS, TOLD_WEIGHT, WORLD_FLOOR } from './constants';

// ---------------------------------------------------------------------------------------------------------------- the closed tag vocabulary
export type TagGroup = 'visual' | 'animals' | 'world' | 'ownership';
/** Reconcile 5.2: visual, animals, world and the ownership EXPERIENCE. There is no money, size-of-room or time tag: those are limits, changed only by "Adjust constraints". */
export const TAGS = [
  { id: 'look', group: 'visual', label: 'Overall look' }, { id: 'colors', group: 'visual', label: 'Colors' }, { id: 'natural', group: 'visual', label: 'Natural or artificial' },
  { id: 'plants', group: 'visual', label: 'Plant and decor density' }, { id: 'layout', group: 'visual', label: 'Layout' },
  { id: 'species', group: 'animals', label: 'The animals' }, { id: 'behavior', group: 'animals', label: 'How they behave' }, { id: 'size', group: 'animals', label: 'Animal size' },
  { id: 'number', group: 'animals', label: 'How many animals' }, { id: 'visibility', group: 'animals', label: 'How visible they are' },
  { id: 'fresh', group: 'world', label: 'Freshwater' }, { id: 'marine', group: 'world', label: 'Marine' }, { id: 'brackish', group: 'world', label: 'Brackish' },
  { id: 'land', group: 'world', label: 'Land' }, { id: 'landwater', group: 'world', label: 'Land and water' },
  { id: 'daily-care', group: 'ownership', label: 'Daily care' }, { id: 'maintenance', group: 'ownership', label: 'How often it needs maintenance' }, { id: 'complexity', group: 'ownership', label: 'Complexity and fragility' },
] as const;
export type AspectTag = typeof TAGS[number]['id'];
export const TAG_IDS: readonly AspectTag[] = TAGS.map(t => t.id);
export const tagLabel = (t: AspectTag): string => TAGS.find(x => x.id === t)!.label;

/** The tag a feature key belongs to (`world:marine` -> marine, `colors:vivid` -> colors). */
export function tagOf(key: string): AspectTag | undefined {
  const [head, value] = key.split(':'), t = (head === 'world' ? value : head) as AspectTag;
  return TAG_IDS.includes(t) ? t : undefined;
}
const isWorldKey = (k: string) => k.startsWith('world:'), isLookKey = (k: string) => k.startsWith('look:');

// ---------------------------------------------------------------------------------------------------------------- features of a candidate
/** What a candidate is, in the terms the vocabulary speaks. Built from a candidate by candidate.ts `subjectOf`; every field is a fact about the setup, never a limit. */
export interface AspectSubject {
  world: Env; water: Water | 'none'; familyId: string; archetypeId: string; roster: { species: string; n: number }[];
  plantMode?: 'live' | 'artificial' | 'mixed'; /** plant pieces in the scene */ plants: number; vivid: boolean;
  /** care minutes a week (mean), tank gallons and the difficulty rating, for the ownership aspects */
  minPerWeek: number; gal: number; difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}
const worldOf = (s: AspectSubject): string => s.world === 'terrarium' ? 'land' : s.world === 'paludarium' ? 'landwater' : s.water === 'saltwater' ? 'marine' : s.water === 'brackish' ? 'brackish' : 'fresh';
const sizeClass = (mm: number) => mm < SIZE_SMALL_MM ? 'small' : mm < SIZE_LARGE_MM ? 'medium' : 'large';
const numberClass = (n: number) => n <= NUMBER_FEW ? 'few' : n <= NUMBER_MANY ? 'some' : 'many';
/** How the animals carry themselves: the way a group moves, a resting bottom-dweller, a pair, a land animal; the first that applies, per species, de-duplicated. */
function behaviorOf(id: string): string {
  const sp = getSpecies(id); if (!sp) return 'solitary';
  return sp.group ? (sp.group === 'school' ? 'schooling' : 'shoaling') : sp.pair ? 'pair' : sp.zone === 'bottom' || sp.level === 'low' ? 'bottom' : sp.habitat === 'land' ? 'land' : sp.kind === 'snail' ? 'grazer' : 'solitary';
}

/** Every aspect of a subject as a feature key, in a fixed order. */
export function featuresOf(s: AspectSubject): string[] {
  const out: string[] = [`world:${worldOf(s)}`, `look:${s.familyId}`, `layout:${s.archetypeId}`, `natural:${s.plantMode ?? 'live'}`, `colors:${s.vivid ? 'vivid' : 'natural'}`,
    `plants:${s.plants < SOME_PLANTS ? 'none' : s.plants >= LUSH_PLANTS ? 'lush' : 'some'}`];
  const sp = s.roster.map(r => getSpecies(r.species)).filter((x): x is NonNullable<typeof x> => !!x), total = s.roster.reduce((t, r) => t + r.n, 0);
  for (const r of [...s.roster].sort((a, b) => a.species.localeCompare(b.species))) out.push(`species:${r.species}`);
  for (const b of [...new Set(s.roster.map(r => behaviorOf(r.species)))].sort()) out.push(`behavior:${b}`);
  if (sp.length) out.push(`size:${sizeClass(Math.max(...sp.map(x => x.tl)))}`);
  out.push(`number:${numberClass(total)}`);
  // visible = something swims or perches in the open; otherwise the animals mostly hide or rest on the floor
  out.push(`visibility:${s.roster.some(r => { const x = getSpecies(r.species); return !!x && !x.zone && x.level !== 'low' && x.habitat !== 'land'; }) ? 'open' : 'hidden'}`);
  out.push(`daily-care:${s.minPerWeek <= CARE_LOW_MIN ? 'low' : s.minPerWeek >= CARE_HIGH_MIN ? 'high' : 'medium'}`);
  out.push(`maintenance:${s.world === 'terrarium' ? 'light' : s.water === 'saltwater' || s.gal < SMALL_TANK_GAL ? 'frequent' : 'routine'}`);
  out.push(`complexity:${s.difficulty.toLowerCase()}`);
  return out;
}

const VALUE_LABEL: Record<string, string> = {
  'world:fresh': 'freshwater', 'world:marine': 'marine', 'world:brackish': 'brackish', 'world:land': 'land habitats', 'world:landwater': 'land-and-water setups',
  'natural:live': 'live plants', 'natural:artificial': 'artificial decor', 'natural:mixed': 'a mix of live and artificial', 'colors:vivid': 'vivid color', 'colors:natural': 'natural tones',
  'plants:none': 'bare, open scapes', 'plants:some': 'a few plants', 'plants:lush': 'lush planting', 'size:small': 'small animals', 'size:medium': 'mid-size animals', 'size:large': 'large animals',
  'number:few': 'a few animals', 'number:some': 'a modest group', 'number:many': 'big groups', 'visibility:open': 'animals out in the open', 'visibility:hidden': 'animals that hide',
  'behavior:schooling': 'schooling animals', 'behavior:shoaling': 'shoaling animals', 'behavior:pair': 'bonded pairs', 'behavior:bottom': 'bottom-dwellers', 'behavior:land': 'land animals', 'behavior:grazer': 'grazers', 'behavior:solitary': 'loners',
  'daily-care:low': 'easy daily care', 'daily-care:medium': 'a steady daily routine', 'daily-care:high': 'hands-on daily care', 'maintenance:light': 'light maintenance', 'maintenance:routine': 'routine maintenance', 'maintenance:frequent': 'frequent maintenance',
  'complexity:beginner': 'simple, forgiving setups', 'complexity:intermediate': 'moderately involved setups', 'complexity:advanced': 'demanding, delicate setups',
};
/** A feature in words: "lush planting", "the Woodland Creek look", "neon tetras". */
export function labelOf(key: string): string {
  const [head, ...rest] = key.split(':'), value = rest.join(':');
  if (VALUE_LABEL[key]) return VALUE_LABEL[key];
  if (head === 'species') return (getSpecies(value)?.name ?? value).toLowerCase();
  if (head === 'look') return `${FAMILIES.find(f => f.id === value)?.name ?? value} looks`;
  if (head === 'layout') return `the ${ARCHETYPES.find(a => a.id === value)?.name ?? value} layout`;
  return value || key;
}

// ---------------------------------------------------------------------------------------------------------------- the profile
export type AspectKind = 'like' | 'pass' | 'save' | 'mine' | 'tag';
export const ASPECT_KINDS: readonly AspectKind[] = ['like', 'pass', 'save', 'mine', 'tag'];
/** One reaction, oldest first in the list. `c` is the candidate id; `pos` / `neg` the feature keys it speaks for (already resolved, so the profile never needs the candidate again); `att` = the person said which aspects. */
export interface AspectEvent { c: string; k: AspectKind; pos?: string[]; neg?: string[]; att?: true }
export interface Aspects { events: AspectEvent[]; /** "You told us": keys the person set by hand, +1 / -1; they override the learned weight */ told?: Record<string, 1 | -1> }
const MAX_KEYS = 24, MAX_TOLD = 20;

export const aspectsOf = (b: Brief): Aspects | undefined => { const it = getItem(b, 'preferences.aspects'); return it && !it.off ? it.value : undefined; };
const put = (b: Brief, a: Aspects | undefined): Brief => a && (a.events.length || (a.told && Object.keys(a.told).length)) ? setItem(b, 'preferences.aspects', a, 'preference') : clearItem(b, 'preferences.aspects');

/** What a reaction is, before it is recorded. `kind: 'unrated'` is NO event (a skipped card is neutral). `on` = the tags the person said caught their eye, `off` = those that put them off. */
export interface Reaction { kind: AspectKind | 'unrated'; c: string; features: string[]; on?: readonly AspectTag[]; off?: readonly AspectTag[] }
const inTags = (keys: string[], tags: readonly AspectTag[] | undefined) => tags?.length ? keys.filter(k => { const t = tagOf(k); return !!t && tags.includes(t); }) : [];

/** The event a reaction records, or undefined (Unrated; or a tag event naming nothing the candidate has). */
export function eventOf(r: Reaction): AspectEvent | undefined {
  if (r.kind === 'unrated') return undefined;
  const all = r.features.slice(0, MAX_KEYS), pos = inTags(all, r.on), neg = inTags(all, r.off), attributed = pos.length > 0 || neg.length > 0;
  if (r.kind === 'tag') return attributed ? { c: r.c, k: 'tag', ...(pos.length ? { pos } : {}), ...(neg.length ? { neg } : {}), att: true } : undefined;
  if (r.kind === 'save' || r.kind === 'mine') return { c: r.c, k: r.kind, pos: all };
  if (attributed) return { c: r.c, k: r.kind, ...(pos.length ? { pos } : {}), ...(neg.length ? { neg } : {}), att: true };
  // unattributed: a Like speaks for every aspect; a Pass for this candidate's own aspects, never for its world or its look family
  return r.kind === 'like' ? { c: r.c, k: 'like', pos: all } : { c: r.c, k: 'pass', neg: all.filter(k => !isWorldKey(k) && !isLookKey(k)) };
}

/** Record a reaction (the oldest events fall off the end of the list). Unrated returns the profile untouched. A like / pass / tag that names aspects for a candidate
 *  already reacted to without naming any REPLACES that earlier unattributed event (the panel is optional and comes after the click), so the signal is counted once. */
export function react(p: Aspects | undefined, r: Reaction): Aspects | undefined {
  const ev = eventOf(r); if (!ev) return p;
  const events = [...(p?.events ?? [])];
  if (ev.att && (r.kind === 'tag' || r.kind === 'like' || r.kind === 'pass')) {
    let at = -1; for (let i = events.length - 1; i >= 0 && at < 0; i--) if (events[i].c === r.c && !events[i].att && (events[i].k === 'like' || events[i].k === 'pass')) at = i;
    if (at >= 0) { events[at] = r.kind === 'tag' ? { ...ev, k: events[at].k } : ev; return { ...p, events: events.slice(-ASPECT_EVENTS) }; }
  }
  return { ...p, events: [...events, ev].slice(-ASPECT_EVENTS) };
}
/** Take back the latest event (undo). With the list under its cap this restores the profile exactly; undefined when nothing is left. */
export function undoLast(p: Aspects | undefined): Aspects | undefined {
  if (!p?.events.length) return p;
  const events = p.events.slice(0, -1), out: Aspects = { events, ...(p.told ? { told: p.told } : {}) };
  return events.length || out.told ? out : undefined;
}
/** Take back every event for one candidate (a Like undone from the strip). */
export function undoCandidate(p: Aspects | undefined, c: string): Aspects | undefined {
  if (!p) return p;
  const events = p.events.filter(e => e.c !== c), out: Aspects = { events, ...(p.told ? { told: p.told } : {}) };
  return events.length || out.told ? out : undefined;
}
/** "You told us": set one aspect by hand (+1 wants more, -1 wants less), or 0 to hand it back to what was learned. Beats the learned weight until cleared. */
export function tell(p: Aspects | undefined, key: string, v: 1 | -1 | 0): Aspects | undefined {
  if (!tagOf(key)) return p;
  const told = { ...(p?.told ?? {}) }; if (v === 0) delete told[key]; else if (key in told || Object.keys(told).length < MAX_TOLD) told[key] = v;
  const out: Aspects = { events: p?.events ?? [], ...(Object.keys(told).length ? { told } : {}) };
  return out.events.length || out.told ? out : undefined;
}

export interface Weight { key: string; /** the weight ranking uses */ w: number; /** events that spoke for this aspect */ n: number; source: 'learned' | 'told' }
/** The ranking weight of every aspect with a signal: each event's step, faded by ASPECT_DECAY for every later event, scaled by n / (n + K) (one signal is a hint, several a trend), capped at +-ASPECT_CAP;
 *  a world never goes under WORLD_FLOOR; "You told us" replaces the learned weight. */
export function weightsOf(p: Aspects | undefined): Map<string, Weight> {
  const raw = new Map<string, { w: number; n: number }>(), ev = p?.events ?? [], len = ev.length;
  ev.forEach((e, i) => {
    const step = (e.k === 'mine' ? ASPECT_STEP.mine : e.k === 'save' ? ASPECT_STEP.save : e.att ? ASPECT_STEP.tagged : ASPECT_STEP.unattributed) * Math.pow(ASPECT_DECAY, len - 1 - i);
    for (const [keys, sign] of [[e.pos, 1], [e.neg, -1]] as const) for (const k of keys ?? []) { const x = raw.get(k) ?? { w: 0, n: 0 }; x.w += sign * step; x.n++; raw.set(k, x); }
  });
  const out = new Map<string, Weight>();
  for (const [key, x] of raw) out.set(key, { key, w: bound(key, Math.max(-ASPECT_CAP, Math.min(ASPECT_CAP, x.w * x.n / (x.n + CONFIDENCE_K)))), n: x.n, source: 'learned' });
  for (const [key, v] of Object.entries(p?.told ?? {})) out.set(key, { key, w: bound(key, v * TOLD_WEIGHT), n: out.get(key)?.n ?? 0, source: 'told' });
  return out;
}
const bound = (key: string, w: number) => isWorldKey(key) ? Math.max(WORLD_FLOOR, w) : w;

/** How well a candidate's aspects match the profile: the sum of its features' weights (0 with no profile). RANKING ONLY. */
export function aspectScore(w: Map<string, Weight>, features: readonly string[]): number {
  let s = 0; for (const k of features) s += w.get(k)?.w ?? 0; return s;
}
/** The features of a candidate that moved its score, strongest first, for a card's "because you liked ..." line. */
export function matchesOf(w: Map<string, Weight>, features: readonly string[], n = 2): { key: string; w: number }[] {
  return features.map(k => ({ key: k, w: w.get(k)?.w ?? 0 })).filter(x => x.w > 0.05).sort((a, b) => b.w - a.w || a.key.localeCompare(b.key)).slice(0, n);
}

// ---------------------------------------------------------------------------------------------------------------- the interpretation line
export interface Learned { key: string; label: string; w: number; source: 'learned' | 'told' }
export interface Interpretation { toward: Learned[]; away: Learned[]; /** the person leans toward easy care / simple setups (a preference: the care-time LIMIT is separate) */ easyCare: boolean; text: string }
/** Under this weight the line says nothing (a faded or early signal is not a finding). */
export const SHOW_AT = 0.2;
/** The one short, editable sentence between rounds ("You seem to like ... but not ..."): top two aspects toward, the strongest away, and an easy-care lean. undefined while nothing is above the threshold. */
export function interpretationOf(p: Aspects | undefined): Interpretation | undefined {
  const all = [...weightsOf(p).values()].filter(x => Math.abs(x.w) >= SHOW_AT).sort((a, b) => Math.abs(b.w) - Math.abs(a.w) || a.key.localeCompare(b.key));
  if (!all.length) return undefined;
  const learned = (x: Weight): Learned => ({ key: x.key, label: labelOf(x.key), w: x.w, source: x.source });
  // one line per kind of thing: not both "lush planting" and "live plants" and "plants" cards in a row
  const distinct = (xs: Weight[], n: number) => { const seen = new Set<string>(), out: Learned[] = []; for (const x of xs) { const t = tagOf(x.key) ?? x.key; if (seen.has(t)) continue; seen.add(t); out.push(learned(x)); if (out.length === n) break; } return out; };
  const toward = distinct(all.filter(x => x.w > 0), 2), away = distinct(all.filter(x => x.w < 0), 1);
  const easyCare = all.some(x => x.w > 0 && (x.key === 'daily-care:low' || x.key === 'complexity:beginner' || x.key === 'maintenance:light')) || all.some(x => x.w < 0 && (x.key === 'daily-care:high' || x.key === 'complexity:advanced'));
  const list = (xs: Learned[]) => xs.map(x => x.label).join(' and ');
  const text = (toward.length ? `You seem to like ${list(toward)}` : 'Nothing stands out yet') + (away.length ? `${toward.length ? ', but' : '; you seem'} to want less of ${list(away)}` : '') + (easyCare && !toward.some(x => /care|simple/.test(x.label)) ? ', and you lean toward easier care' : '')
    + '. Want more like that, or something different?';
  return { toward, away, easyCare, text };
}

// ---------------------------------------------------------------------------------------------------------------- brief wrappers (the one item the feedback panel writes)
export const recordAspect = (b: Brief, r: Reaction): Brief => put(b, react(aspectsOf(b), r));
export const undoAspect = (b: Brief): Brief => put(b, undoLast(aspectsOf(b)));
export const undoAspectsOf = (b: Brief, c: string): Brief => put(b, undoCandidate(aspectsOf(b), c));
export const tellAspect = (b: Brief, key: string, v: 1 | -1 | 0): Brief => put(b, tell(aspectsOf(b), key, v));
/** Forget everything learned. */
export const clearAspects = (b: Brief): Brief => clearItem(b, 'preferences.aspects');

// ---------------------------------------------------------------------------------------------------------------- pairwise outcomes (lane AB1, Discovery v2 plan decision 6)
// An A/B result is evidence too, kept as the same events the profile already learns from (so every existing reader, undo and parse keeps working). Nothing here creates a lock, reads a limit or changes the working project.
//   A / B     the chosen side: a like (the reasons' aspects only when given, else every aspect); the other side a weak pass on its own aspects (never its world or look family), or on the reasoned aspects when reasons were given.
//   both      a like on each side.      neither   a pass on each side.      skip   no event (a skipped pair is neutral, never a dislike).
// Reasons are optional and speak only for ASPECTS of the designs. The money and time reasons (upfront, ongoing) are LIMITS, which a preference never touches, so they teach nothing here; maintenance and difficulty teach the experience aspects.
const REASON_TAGS: Record<ReasonKey, readonly AspectTag[]> = {
  animals: ['species', 'behavior', 'size', 'number', 'visibility'], plants: ['plants', 'natural'], hardscape: ['layout', 'look'], substrate: [], tank: ['fresh', 'marine', 'brackish', 'land', 'landwater'],
  look: ['look', 'colors', 'layout', 'natural'], upfront: [], ongoing: [], maintenance: ['maintenance', 'daily-care'], difficulty: ['complexity'],
};
export const reasonTags = (why: readonly ReasonKey[] | undefined): AspectTag[] => [...new Set((why ?? []).flatMap(r => REASON_TAGS[r] ?? []))];
export interface PairSide { id: string; features: string[] }
export interface PairReaction { outcome: Outcome; a: PairSide; b: PairSide; why?: ReasonKey[]; otherGood?: ReasonKey[] }
/** The events one pairwise result records (0 to 2), oldest-first order a then b. */
export function pairEvents(r: PairReaction): AspectEvent[] {
  if (r.outcome === 'skip') return [];
  const out: AspectEvent[] = [], on = reasonTags(r.why), good = reasonTags(r.otherGood);
  const side = (s: PairSide, role: 'win' | 'lose' | 'like' | 'pass') => {
    const ev = role === 'like' || role === 'win'
      ? eventOf({ kind: 'like', c: s.id, features: s.features, ...(role === 'win' && on.length ? { on } : {}) })
      : eventOf({ kind: 'pass', c: s.id, features: s.features, ...(role === 'lose' && on.length ? { off: on } : {}), ...(role === 'lose' && good.length ? { on: good } : {}) });
    if (ev) out.push(ev);
  };
  if (r.outcome === 'A' || r.outcome === 'B') { const [w, l] = r.outcome === 'A' ? [r.a, r.b] : [r.b, r.a]; side(w, 'win'); side(l, 'lose'); }
  else if (r.outcome === 'both') { side(r.a, 'like'); side(r.b, 'like'); }
  else { side(r.a, 'pass'); side(r.b, 'pass'); }
  return out;
}
/** Record a pairwise result. Skip returns the profile untouched. */
export function reactPair(p: Aspects | undefined, r: PairReaction): Aspects | undefined {
  const ev = pairEvents(r); if (!ev.length) return p;
  return { ...p, events: [...(p?.events ?? []), ...ev].slice(-ASPECT_EVENTS) };
}
export const recordPair = (b: Brief, r: PairReaction): Brief => put(b, reactPair(aspectsOf(b), r));
/** Take a pair's result back (both candidates' events), as undo for a changed mind. */
export const undoPairAspects = (b: Brief, aId: string, bId: string): Brief => put(b, undoCandidate(undoCandidate(aspectsOf(b), aId), bId));

/** Validate a saved / shared profile (brief.ts parseBrief): known kinds and tags only, capped, empty = dropped. */
export function parseAspects(v: unknown): Aspects | undefined {
  const raw = v as { events?: unknown; told?: unknown } | undefined; if (!raw || typeof raw !== 'object') return undefined;
  const keys = (x: unknown): string[] | undefined => Array.isArray(x) ? (() => { const k = x.filter((s): s is string => typeof s === 'string' && s.length < 60 && /^[a-z0-9-]+(:[a-z0-9.~_-]+)+$/.test(s) && !!tagOf(s)).slice(0, MAX_KEYS); return k.length ? k : undefined; })() : undefined;
  const events: AspectEvent[] = [];
  if (Array.isArray(raw.events)) for (const e of raw.events as Partial<AspectEvent>[]) {
    if (!e || typeof e.c !== 'string' || e.c.length > 40 || !ASPECT_KINDS.includes(e.k as AspectKind)) continue;
    const pos = keys(e.pos), neg = keys(e.neg); if (!pos && !neg) continue;
    events.push({ c: e.c, k: e.k as AspectKind, ...(pos ? { pos } : {}), ...(neg ? { neg } : {}), ...(e.att === true ? { att: true as const } : {}) });
  }
  const told: Record<string, 1 | -1> = {};
  if (raw.told && typeof raw.told === 'object') for (const [k, x] of Object.entries(raw.told as Record<string, unknown>)) if ((x === 1 || x === -1) && k.length < 60 && !!tagOf(k) && Object.keys(told).length < MAX_TOLD) told[k] = x;
  const out: Aspects = { events: events.slice(-ASPECT_EVENTS), ...(Object.keys(told).length ? { told } : {}) };
  return out.events.length || out.told ? out : undefined;
}
