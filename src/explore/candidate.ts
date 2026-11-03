// Explore, stage X2 (lane OX4): CANDIDATE IDENTITY (reconcile section 6). A candidate is the same candidate across sessions, so a favourite is found again and a re-generated duplicate is recognised:
//   configKey   the canonical string of the configuration (look | tank | roster, then density stop, composition seed, owned-gear picks); `id` is its stable short hash.
//   snapshot    the TankSetup Make This Mine installs, stored whole and run through parseScene on load (the way a saved tank is), never re-derived: a recipe re-run could differ after a code change.
//   dedupe      an exact key match, or a conceptDistance-style distance (suggest.ts) extended with world, water, roster overlap and look terms under MIN_DISTANCE, to anything already shown / liked / passed.
//   variantOf   only on an explicit "show me a variation of this" request: the variation is allowed near its parent and stamped with the parent's id.
// Pure: the pool's output goes in, a plain-JSON `StoredCandidate` comes out (everything frozen at generation: the estimate a favourite is compared by tomorrow is the estimate it was shown with).
import { parseScene } from '../scene/validate';
import { SCENE_VERSION, type TankSetup } from '../scene/types';
import { recipeLook } from '../scene/recipes';
import { PRICES_AS_OF } from '../demand/prices';
import { MIN_DISTANCE } from '../demand/suggest';
import type { Candidate as PoolCandidate, Identity } from './pool';
import type { Estimate } from './estimate';
import type { GateId, GateState, Verdict } from './gate';
import type { AspectSubject } from './aspects';
import { featuresOf } from './aspects';

/** Bumped when the stored shape or the feature vocabulary changes in a way an old record cannot be read through. */
export const CANDIDATE_VERSION = 1;
/** The density every card is made at (Balanced = stop 2 of the 0-4 slider, reconcile section 9 assumption 2). */
export const CARD_DENSITY_STOP = 2;

// ---------------------------------------------------------------------------------------------------------------- key and id
export interface KeyParts { /** the pool's `candidateKey` (look | tank | roster) */ key: string; densityStop?: number; /** the composition seed, when the recipe was drawn at a chosen one */ seed?: number; /** owned-gear picks (OwnedMap values) the scene was built with */ gear?: readonly string[] }
/** The canonical configuration key: the same configuration always spells the same string. */
export const configKey = (p: KeyParts): string => `${p.key}|d${p.densityStop ?? CARD_DENSITY_STOP}|s${p.seed ?? ''}|g${[...(p.gear ?? [])].sort().join('+')}`;
/** A stable short id (two 32-bit FNV-1a hashes, base 36): 12 characters, the same in every session and every browser. */
export function idOf(key: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ key.length;
  for (let i = 0; i < key.length; i++) { const c = key.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ (c + i), 0x85ebca6b) >>> 0; }
  return a.toString(36).padStart(7, '0') + b.toString(36).slice(0, 5).padStart(3, '0');
}

// ---------------------------------------------------------------------------------------------------------------- what a candidate is, for distance and ranking
/** The small summary distance is measured on (kept on the stored record, so a saved candidate needs no registry lookup). */
export interface Fingerprint { world: Identity['world']; water: Identity['water']; familyId: string; archetypeId: string; tankId: string; species: string[]; /** the look the recipe draws (a layout id) */ look: string; startupUsd: number }
/** One candidate as the dedupe and the ranker see it. */
export interface Entry { id: string; key: string; fp: Fingerprint; /** the feature keys of aspects.ts */ features: string[] }

const jaccard = (a: readonly string[], b: readonly string[]) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; const u = A.size + B.size - i; return u ? i / u : 1; };
/** How different two candidates are (0..1), conceptDistance's shape (suggest.ts: family, archetype, tank, price band) with the terms Explore needs: the world and water, the overlap of the rosters, and the look the scene is drawn in.
 *  Weights sum to 1. */
export function distance(a: Fingerprint, b: Fingerprint): number {
  const hi = Math.max(a.startupUsd, b.startupUsd), lo = Math.min(a.startupUsd, b.startupUsd);
  return (a.world !== b.world ? 0.2 : 0) + (a.water !== b.water ? 0.05 : 0) + (a.familyId !== b.familyId ? 0.15 : 0) + (a.archetypeId !== b.archetypeId ? 0.15 : 0) + (a.tankId !== b.tankId ? 0.1 : 0)
    + (1 - jaccard(a.species, b.species)) * 0.2 + (a.look !== b.look ? 0.1 : 0) + (hi > 0 && (hi - lo) / hi >= 0.25 ? 0.05 : 0);
}

const VIVID = /colou?r|vivid|neon|reef|coral|bright|glow|vibrant|rainbow/i;
/** What a pool candidate is in the vocabulary of aspects.ts. `vivid` reads the look's own words (name, tagline, fingerprint): a stated heuristic, tuned in X5. */
export function subjectOf(c: PoolCandidate): AspectSubject {
  const a = c.archetype;
  return { world: c.identity.world, water: c.identity.water, familyId: c.identity.familyId, archetypeId: c.identity.archetypeId, roster: c.roster.map(r => ({ species: r.species, n: r.n })),
    ...(a.recipe.plantMode ? { plantMode: a.recipe.plantMode } : {}), plants: c.scene.items.filter(i => i.kind === 'plant').length, vivid: VIVID.test(`${a.name} ${a.tagline} ${a.fingerprint.join(' ')}`),
    minPerWeek: c.estimate.minPerWeek.mean, gal: c.estimate.gal, difficulty: c.estimate.difficulty.level };
}
export function fingerprintOf(c: PoolCandidate): Fingerprint {
  return { world: c.identity.world, water: c.identity.water, familyId: c.identity.familyId, archetypeId: c.identity.archetypeId, tankId: c.tank.id, species: c.roster.map(r => r.species).sort(),
    look: recipeLook(c.archetype) ?? '', startupUsd: c.estimate.startupUsd.mean };
}
/** A pool candidate as an entry (the candidate itself rides along so a caller can get it back from a pick). */
export function entryOf(c: PoolCandidate, o: KeyParts = { key: c.key }): Entry & { candidate: PoolCandidate } {
  const key = configKey({ ...o, key: c.key });
  return { id: idOf(key), key, fp: fingerprintOf(c), features: featuresOf(subjectOf(c)), candidate: c };
}

// ---------------------------------------------------------------------------------------------------------------- dedupe
export interface Dropped<T> { item: T; why: 'same' | 'near'; /** the id it matched */ of: string }
export interface Deduped<T> { kept: T[]; dropped: Dropped<T>[] }
/** Keep the entries that are new: not the same configuration as anything known, nor within MIN_DISTANCE of anything known or already kept. `variantOf` (an explicit request for a variation of that candidate)
 *  lifts the distance rule against that one parent only; an identical configuration is never a variation. */
export function dedupe<T extends Entry>(items: readonly T[], known: readonly Entry[], opt: { variantOf?: string; minDistance?: number } = {}): Deduped<T> {
  const min = opt.minDistance ?? MIN_DISTANCE, kept: T[] = [], dropped: Dropped<T>[] = [], seen: Entry[] = [...known];
  for (const it of items) {
    const same = seen.find(k => k.id === it.id || k.key === it.key);
    if (same) { dropped.push({ item: it, why: 'same', of: same.id }); continue; }
    const near = seen.find(k => k.id !== opt.variantOf && distance(k.fp, it.fp) < min);
    if (near) { dropped.push({ item: it, why: 'near', of: near.id }); continue; }
    kept.push(it); seen.push(it);
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------------------------------------------------------- the stored record
export type ReactionState = 'unrated' | 'liked' | 'passed';
export interface Reaction { state: ReactionState; /** saved to Favourites: independent of like / pass, and weak evidence only */ saved: boolean; at: number }
/** `status`: current = the firm limits in force allow it; stale = a limit changed and it no longer fits (relabelled with the broken limit, never deleted). */
export type CandidateStatus = 'current' | 'stale';
export interface StoredVerdict { state: Verdict; gates: Partial<Record<GateId, GateState>>; reasons: string[]; /** the welfare "not enough information" line, so a re-check can rebuild the gate's input */ welfareUnknown?: string }
export interface Provenance {
  priceAsOf: string; generatorVersion: number;
  /** the firm / flexible caps the verdict was reached against (an unset limit is absent: it was unknown) */
  limits: Partial<Record<GateId, { kind: 'firm' | 'flexible'; cap: number }>>;
  tankSource?: string; tankNote?: string; assumptions: string[];
}
export interface StoredCandidate {
  id: string; key: string; v: number;
  /** the TankSetup Make This Mine installs; sceneVersion stamps what it was written under so parseScene upgrades it like an old file */
  snapshot: TankSetup; sceneVersion: number;
  identity: Identity; roster: { species: string; n: number }[]; tankId: string;
  /** frozen at generation: what the card showed, and what a favourite is compared by */
  estimate: Estimate; features: string[]; fp: Fingerprint; provenance: Provenance; verdict: StoredVerdict;
  reaction: Reaction; status: CandidateStatus; /** while stale: the limit that broke it, and what it says */ staleLimit?: GateId; staleBecause?: string;
  batch: number; created: number; variantOf?: string; chosenAt?: number; /** the exploration (project) it belongs to */ project?: string;
}
export type StoredLite = Omit<StoredCandidate, 'snapshot'>;

/** A pool candidate as a record to keep: the caps its verdict was reached against go into the provenance, the snapshot is a deep copy. */
export function toStored(c: PoolCandidate, o: { batch: number; now: number; project?: string; variantOf?: string; key?: KeyParts }): StoredCandidate {
  const e = entryOf(c, o.key), limits: Provenance['limits'] = {};
  for (const g of c.verdict.gates) if (g.cap !== undefined && (g.kind === 'firm' || g.kind === 'flexible')) limits[g.id] = { kind: g.kind, cap: g.cap };
  const welfare = c.verdict.gates.find(g => g.id === 'welfare');
  return {
    id: e.id, key: e.key, v: CANDIDATE_VERSION, snapshot: structuredClone(c.scene), sceneVersion: SCENE_VERSION,
    identity: { ...c.identity }, roster: c.roster.map(r => ({ species: r.species, n: r.n })), tankId: c.tank.id,
    estimate: structuredClone(c.estimate), features: e.features, fp: e.fp,
    provenance: { priceAsOf: PRICES_AS_OF, generatorVersion: CANDIDATE_VERSION, limits, ...(c.tankSource ? { tankSource: c.tankSource } : {}), ...(c.tankNote ? { tankNote: c.tankNote } : {}), assumptions: [...c.estimate.assumptions, ...c.verdict.assumptions] },
    verdict: { state: c.verdict.verdict, gates: Object.fromEntries(c.verdict.gates.map(g => [g.id, g.state])), reasons: c.verdict.reasons.map(r => r.text), ...(welfare?.state === 'uncertain' ? { welfareUnknown: welfare.text } : {}) },
    reaction: { state: 'unrated', saved: false, at: o.now }, status: 'current', batch: o.batch, created: o.now,
    ...(o.variantOf ? { variantOf: o.variantOf } : {}), ...(o.project ? { project: o.project } : {}),
  };
}
export const entryOfStored = (s: StoredLite): Entry => ({ id: s.id, key: s.key, fp: s.fp, features: s.features });

/** A stored snapshot, read back the way a saved tank is: wrapped as a one-tank scene and run through parseScene (older versions upgrade, a damaged one throws a SceneError). */
export function loadSnapshot(raw: unknown, sceneVersion = SCENE_VERSION): TankSetup {
  return parseScene({ version: sceneVersion, name: 'Explore candidate', units: 'in', tanks: [raw], active: 0, camLock: true }).scene.tanks[0];
}
