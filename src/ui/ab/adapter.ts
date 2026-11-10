// The A/B screen's seam (lane AB3). The screen talks ONLY to this interface; `fake.ts` implements it from the working project (DX2 propose) so the UI could be built
// before AB0 (session), AB1 (pairs) and AB2 (history) landed, and `real.ts` (when those merge) implements it over discoverySession / pairGen / proposalHistory.
// All calls are synchronous (the screen paints "Looking..." first). Records are immutable: choosing, keeping, adapting never edits one.
import type { Tab } from '../../scene/scope';
import type { AttrKey, ThumbMap } from '../../scene/attrs';
import type { Verdict } from '../../scene/verdict';
import type { CandidateFacts, CandidateRecord, DiscoverySession, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';

export interface HistoryRow { rec: CandidateRecord; favourite: boolean; champion: boolean }
export interface HistoryPage { rows: HistoryRow[]; total: number; page: number; pages: number }
/** A candidate seen again NOW (spec 6.3): the old facts stay on the record; this is beside them, never over them. */
export interface ReEval { verdict: Verdict; facts: CandidateFacts; conflicts: string[] }
export type AdaptResult = { ok: true; record: CandidateRecord } | { ok: false; reason: string };

/** Combine (AB5): one tab of `donor` taken into `target` as a PROPOSED combination. Nothing is stored or shown until the person approves it (`acceptCombine`); a refusal keeps the pair on screen and says why. */
export interface CombineProposal { record: CandidateRecord; targetId: string; donorId: string; tab: Tab; /** every dependent change, in words, shown BEFORE the design exists on screen */ adjustments: string[]; spendLine: string }
export type CombineOutcome = { ok: true; proposal: CombineProposal } | { ok: false; reason: string; relaxations: string[] };

export interface AbEngine {
  /** the session as it stands (always one: `open` makes or resumes it) */
  session(): DiscoverySession;
  record(id: string): CandidateRecord | undefined;
  /** start (or resume) the session for the working project; `scope` = a run-only override of the tabs (from a menu / start flow) */
  open(scope?: Tab[]): void;
  /** the working project moved since the session last looked (manual edits): the screen offers Continue (re-check) or New session */
  isStale(): boolean;
  rebase(): void;
  restart(): void;
  /** the pair on screen, or a new one when none is */
  next(): PairResult;
  /** record the choice and return the next pair */
  /** `rel`: AB13 optional per-attribute A / B picks, recorded at this same moment (soft evidence on the preferred value only); never recorded for Skip. */
  choose(outcome: Outcome, why?: ReasonKey[], otherGood?: ReasonKey[], rel?: { attr: AttrKey; elements: string[]; side: 'A' | 'B' }[]): PairResult;
  /** Explore Something Different */
  different(): PairResult;
  /** a shuffle switch: on = Discovery may change the tab, off = freeze it at the champion's (or the project's) values */
  setScope(tab: Tab, on: boolean): void;
  /** "Keep A's hardscape for now": freeze the tab at a specific record's values */
  freeze(tab: Tab, source: string): void;
  /** the working project's locks changed (Keep / Lock): re-check the champion; the reply names what broke, if anything */
  recheckChampion(): { ok: boolean; conflicts: string[] };
  history(page: number): HistoryPage;
  favourite(id: string, on: boolean): void;
  /** bring a past candidate back as the next challenger */
  bringBack(id: string): PairResult;
  /** make it the discovery favourite (validated against the current locks first) */
  setFavourite(id: string): { ok: true } | { ok: false; reason: string };
  reEvaluate(id: string): ReEval;
  /** a NEW record that honours the current locks (spec 5.4), or a refusal */
  adapt(id: string): AdaptResult;
  /** take the donor's tab into the target: a NEW record, never an edit; the originals stay as they were. Optional so the stand-in engine needs none. */
  combine?(targetId: string, donorId: string, tab: Tab): CombineOutcome;
  /** the person approved a proposal: it becomes a record, the donor's tab is liked, and combined vs the favourite is the next pair */
  acceptCombine?(p: CombineProposal): PairResult;
  /** AB7 attribute panel: the thumbs the person has given (soft guidance), and set one on an attribute value of record `id` (1 up, -1 down, 0 take back). Ranking only; optional so the stand-in engine needs none. */
  thumbs?(): ThumbMap;
  setThumb?(id: string, attr: AttrKey, elements: string[], v: 1 | -1 | 0): void;
  /** an optional one-line suggestion to narrow (never applied by the engine; the screen offers it and the person decides) */
  suggestion?(): { text: string; tab: Tab } | undefined;
  /** leave discovery resumable */
  pause(): void;
}
