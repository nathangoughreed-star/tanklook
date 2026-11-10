// Discovery v2 (A/B) shared contract (Coordinator 21, 2026-11-09; spec research/design/discovery-v2-handoff.md section 10, plan research/design/discovery-v2-plan.md).
// TYPES ONLY. Lanes V0 (session), V1 (pair generator), V2 (history) and V3 (A/B screen) all build against this file so they can run in parallel.
// A lane that needs a change here says so in its report; the coordinator edits it (never two lanes at once). Keep it free of runtime code.
import type { TankSetup } from './types';
import type { Tab } from './scope';
import type { Verdict } from './verdict';
import type { BuyLine } from './equipPlan';

/** The broad habitat direction asked at Start New (spec 2.1). A SOFT preference unless the user locks it (`locks` / brief world). */
export type HabitatDirection = 'freshwater' | 'saltwater' | 'terrarium' | 'paludarium' | 'unsure';

/** Why a candidate was generated (spec 10, Proposal.generatedPurpose). */
export type ProposalPurpose = 'first' | 'challenger' | 'fresh' | 'contrast' | 'adapted';

/** A low / typical / high figure; `est` = rests on stated estimates, show as "about". */
export interface Figure { lo: number; mean: number; hi: number; est?: boolean }

/** Everything a card shows, frozen when the candidate was generated (a historical snapshot; spec 6.3: never shown as current without re-evaluation). */
export interface CandidateFacts {
  title: string;
  /** e.g. "Freshwater planted", "Terrarium" */
  habitat: string;
  /** US gallons (aquatic) or null for a dry build */
  gallons: number | null;
  /** remaining acquisition cost for THIS user (owned and capable gear = $0), USD; leads every card (spec 7.3) */
  newSpendUsd: Figure;
  /** optional total retail value, USD */
  retailUsd?: Figure;
  /** ongoing, USD per month */
  monthlyUsd?: Figure;
  /** weekly upkeep, minutes */
  weeklyMin: Figure;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  /** derived purchases for this candidate, priced */
  toBuy: BuyLine[];
  /** owned items this candidate uses (credited $0) and must-use items included */
  reused: string[];
  mustUse: string[];
  /** species and counts, plants / hardscape / substrate summaries for the quick sheet */
  stocking: { species: string; name: string; n: number }[];
  plants: string[];
  hardscape: string[];
  substrate: string[];
}

/** One generated, complete, validated habitat. IMMUTABLE once created: selecting, locking from it or adapting it makes a NEW record (spec 10, "Proposal identity"). */
export interface CandidateRecord {
  id: string;
  sessionId: string;
  createdAt: number;
  /** store.rev of the working project it was generated against */
  baseRev: number;
  purpose: ProposalPurpose;
  /** the record it was derived from (adapted / contrast) */
  parentId?: string;
  /** the whole design, stable uids; Make It Yours installs THIS (through applyProposal against the current project), never a re-derived recipe */
  snapshot: TankSetup;
  facts: CandidateFacts;
  verdict: Verdict;
  /** honest uncertainty: estimated prices, unknown gear specs ... */
  assumptions: string[];
  /** small data-URL picture, lazily filled; never the source of truth */
  thumb?: string;
  /** Explore's candidate identity key (src/explore/candidate.ts), for dedupe */
  key?: string;
}

export type Outcome = 'A' | 'B' | 'both' | 'neither' | 'skip';

/** Optional reasons (spec 3.4): never required. */
export type ReasonKey = 'animals' | 'plants' | 'hardscape' | 'substrate' | 'tank' | 'look' | 'upfront' | 'ongoing' | 'maintenance' | 'difficulty';

export interface Comparison {
  id: string;
  aId: string;
  bId: string;
  /** 'champion' = favourite vs challenger; 'fresh' = Explore Something Different pair; 'final' = fresh winner vs champion */
  type: 'first' | 'champion' | 'fresh' | 'final';
  outcome: Outcome;
  /** reasons for the chosen side, and optional positives of the other side */
  why?: ReasonKey[];
  otherGood?: ReasonKey[];
  championBefore?: string;
  championAfter?: string;
  at: number;
}

/** A temporary per-tab freeze (spec 5.2): the tab is unchecked for shuffling and keeps THIS source's values. Never a persistent lock, never writes the working design. */
export interface TabFreeze {
  tab: Tab;
  /** a CandidateRecord id, or 'working' = the working project at `rev` */
  source: string;
  rev?: number;
}

export interface DiscoverySession {
  id: string;
  /** store.rev the session was started / last rebased on */
  baseRev: number;
  /** tabs allowed to vary (unchecked = frozen for now) */
  scope: Tab[];
  freezes: TabFreeze[];
  direction: HabitatDirection;
  /** the overall favourite; a fresh-pair winner never takes this without beating it (spec 3.3) */
  championId?: string;
  /** local winner of a fresh pair, waiting to face the champion */
  pendingFreshId?: string;
  /** the pair on screen */
  current?: { aId: string; bId: string; type: Comparison['type'] };
  comparisons: Comparison[];
  status: 'active' | 'paused';
}

/** What the generator returns: a pair, or an honest no-solution (spec 5.4). */
export type PairResult =
  | { ok: true; a: CandidateRecord; b: CandidateRecord }
  | { ok: false; conflicts: string[]; relaxations: string[] };
