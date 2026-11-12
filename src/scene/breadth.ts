// Discovery v2, lane AB5 (adaptive breadth): HOW FAR APART should the next pair be. There is no fixed round count. The answer rests on two things, in this order:
//   1. EXPLICIT structure: what the person locked, froze or switched off. More fixed = narrower (the choice space is smaller and the person has already said what matters).
//   2. LEARNED confidence: consistent wins for one world or one look narrow within it; contradictory, `neither` or skipped rounds keep it broad.
// A learned preference only changes how candidates are RANKED and how far the challenger sits from the favourite. It never makes a candidate ineligible, never overrides a switch, and never writes a lock.
// "Explore Something Different" (type 'fresh') is always broad. Pure: nothing here reads or writes a project.
import { TABS, type Tab } from './scope';
import { locksOf } from './locks';
import { layerOf } from './items';
import { worldOf } from './pairFacts';
import { labelOf } from '../explore/aspects';
import type { TankSetup } from './types';
import type { CandidateRecord, Comparison, DiscoverySession } from './discoveryTypes';

export type Objective = 'explore' | 'refine';
export interface Breadth {
  /** 0 = tightest .. 1 = broadest */
  breadth: number;
  /** exploration = candidates visibly and functionally different; refinement = controlled contrasts that vary one tab (or a tight group) and hold the rest near the favourite */
  objective: Objective;
  /** 0..1 from what is locked, frozen or switched off */
  structure: number;
  /** 0..1 from how consistent the person's choices have been */
  confidence: number;
  /** the world the choices keep returning to, and how many times (undefined when there is no pattern) */
  leaning?: { world: string; picks: number };
  why: string[];
}
type Lookup = (id: string) => CandidateRecord | undefined;
const WINDOW = 8;

/** The world a design belongs to, in the aspect vocabulary ('fresh', 'marine', 'land', 'landwater'). */
export function worldKey(S: TankSetup): string {
  const w = worldOf(S); return w.env === 'terrarium' ? 'land' : w.env === 'paludarium' ? 'landwater' : w.water === 'saltwater' ? 'marine' : 'fresh';
}
/** Hardscape share of the pieces (0 = all plants, 1 = all hardscape): the "balance" of a scape at a glance. */
export function balanceOf(S: TankSetup): number {
  let hard = 0, plant = 0; for (const i of S.items) layerOf(i) === 'plant' ? plant++ : hard++;
  return hard + plant ? hard / (hard + plant) : 0.5;
}
/** Do two designs look different AT A GLANCE? The world, the look family (the layout style), or the hardscape-to-plant balance differs. */
export function visuallyDistinct(a: TankSetup, b: TankSetup, familyA?: string, familyB?: string): boolean {
  if (worldKey(a) !== worldKey(b)) return true;
  if (a.layout.id !== b.layout.id || (familyA && familyB && familyA !== familyB)) return true;
  return Math.abs(balanceOf(a) - balanceOf(b)) >= 0.25;
}

/** What the person fixed: switched-off or frozen tabs (the Discovery switches), object locks and roster locks. 0..1. */
export function structureOf(tank: TankSetup, session: DiscoverySession, effScope: readonly Tab[]): number {
  const off = TABS.length - effScope.length, L = locksOf(tank), locks = L.objects.length + L.roster.length;
  return Math.min(1, off * 0.25 + Math.min(locks, 6) * 0.1 + session.freezes.length * 0.05);
}

/** How consistent the recent decisive choices are. Wins for one world (or one look) count; `neither` and skipped rounds dilute; wins split across worlds read as contradictory. */
export function confidenceOf(session: DiscoverySession, lookup: Lookup): { confidence: number; leaning?: { world: string; picks: number } } {
  const recent = session.comparisons.slice(-WINDOW);
  const decisive = recent.filter(c => c.outcome === 'A' || c.outcome === 'B');
  if (decisive.length < 2) return { confidence: 0 };
  const worlds = new Map<string, number>(), styles = new Map<string, number>();
  let counted = 0;
  for (const c of decisive) {
    const r = lookup(c.outcome === 'A' ? c.aId : c.bId); if (!r) continue; counted++;
    const w = worldKey(r.snapshot), s = r.snapshot.layout.id; worlds.set(w, (worlds.get(w) ?? 0) + 1); styles.set(s, (styles.get(s) ?? 0) + 1);
  }
  if (counted < 2) return { confidence: 0 };
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1])[0];
  const [wk, wn] = top(worlds), [, sn] = top(styles);
  const consistency = Math.max((wn / counted - 0.5) * 2, (sn / counted - 0.5) * 2 * 0.8), volume = Math.min(1, counted / 4);
  const noise = recent.filter(c => c.outcome === 'neither' || c.outcome === 'skip').length / recent.length;
  const confidence = Math.max(0, Math.min(1, consistency * volume * (1 - 0.6 * noise)));
  return { confidence, ...(wn >= 2 && wn / counted > 0.5 ? { leaning: { world: wk, picks: wn } } : {}) };
}

/** How broad the next pair of `type` should be. Structure first, then learned confidence; 'fresh' is always broad. */
export function breadthOf(tank: TankSetup, session: DiscoverySession, lookup: Lookup, effScope: readonly Tab[], type: Comparison['type'] = 'champion'): Breadth {
  const structure = structureOf(tank, session, effScope), { confidence, leaning } = confidenceOf(session, lookup), why: string[] = [];
  if (type === 'fresh') return { breadth: 1, objective: 'explore', structure, confidence, ...(leaning ? { leaning } : {}), why: ['Explore Something Different always goes broad.'] };
  if (structure > 0) why.push(`${Math.round(structure * 100)}% of the design is fixed by switches, holds and locks`);
  if (confidence > 0) why.push(`your last choices agree (${Math.round(confidence * 100)}% sure)`);
  const breadth = Math.max(0.1, Math.min(1, 1 - 0.5 * structure - 0.45 * confidence));
  return { breadth, objective: breadth < 0.55 ? 'refine' : 'explore', structure, confidence, ...(leaning ? { leaning } : {}), why };
}
/** How far from the favourite a challenger should sit (content distance 0..1): about 0.45 when broad, 0.2 when tight. */
export const targetDistance = (b: Breadth): number => 0.2 + 0.25 * b.breadth;

/** One optional line the screen MAY show (never acted on by the engine): when the choices keep returning to one world and the Tank switch is on, offer to switch the tank off. */
export function suggestNarrowing(tank: TankSetup, session: DiscoverySession, lookup: Lookup, effScope: readonly Tab[]): { text: string; tab: Tab } | undefined {
  const { confidence, leaning } = confidenceOf(session, lookup);
  if (!leaning || leaning.picks < 3 || confidence < 0.5 || !effScope.includes('tank')) return undefined;
  if (locksOf(tank).objects.some(o => o.target === 'tank')) return undefined;
  const label = labelOf(`world:${leaning.world}`);
  return { text: `You've picked ${label} ${leaning.picks} times. Switch Tank off to focus on the inside?`, tab: 'tank' };
}

// ---------------------------------------------------------------------------------------------------------------- DQ12: Discover's three presets (D3)
// One `breadth` number (0..1) is what the generator reads (nextCandidates: how many looks are tried; 0 = variations of the scene only); the person sees three words, no slider.
export type Preset = 'explore' | 'remix' | 'refine';
export const PRESETS: readonly Preset[] = ['explore', 'remix', 'refine'];
export const PRESET_INFO: Record<Preset, { label: string; hint: string; breadth: number; objective: Objective }> = {
  explore: { label: 'Explore', hint: 'Very different directions', breadth: 1, objective: 'explore' },
  remix: { label: 'Remix', hint: 'New looks that keep your pieces', breadth: 0.4, objective: 'explore' },
  refine: { label: 'Refine', hint: 'Small changes to what you have', breadth: 0, objective: 'refine' },
};
/** The preset a `breadth` number stands for (the nearest one). */
export const presetOfBreadth = (b: number): Preset => b >= 0.7 ? 'explore' : b >= 0.2 ? 'remix' : 'refine';
/** The STARTING preset: the more of the design is kept, the narrower (half or more kept: Refine; a quarter: Remix; little or nothing: Explore). The person's pick then sticks. */
export function inferPreset(kept: number, open: number): Preset {
  const total = kept + open, share = total ? kept / total : 0;
  return share >= 0.5 ? 'refine' : share >= 0.25 ? 'remix' : 'explore';
}
