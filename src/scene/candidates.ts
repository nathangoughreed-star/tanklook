// DQ7 (Discover redesign, wave 1): the CANDIDATE API, pulled out of the A/B pair generator (pairGen.ts). Nothing visible changes.
//   gatherPool(env)          the generation loop both callers share: proposals on the baseline, then one Explore look at a time, until `env.decide` says the pool is enough (A/B: coverage for a pair).
//   nextCandidates(...)      the top-N diverse, feasible candidates for ANY scene (empty, partial, complete): same `ingest` road as a pair (confine, locks, equipment, welfare gates, limits, facts), the same pool and `diversify`.
//   finishSetup(...)         "Finish my setup": objective 'complete', tank OUT of scope, the look drawn for the tank that is there (adaptToTank), and only the GAPS filled (handOff mode 'fill').
// Kept items are never touched (confine + checkProposal). Hand-added items are NOT kept automatically: with objective 'explore' they may be replaced; with 'complete' nothing present is ever changed.
// Circular with pairGen.ts by design (it owns `ingest`, the pool types and the caches); every cross reference is used at call time only.
import { TABS, type Tab } from './scope';
import { discoverTabs } from './discoverScope';
import type { Objective, Focus } from './discover';
import { handOff, adaptScene } from './reeval';
import { locksOf } from './locks';
import { ensureUids } from './uid';
import { projectExtras, rulesOf, type Brief } from './brief';
import { scoreBreakdown, type ScoreBreakdown } from './scorePolicy';
import { readQuickPrefs, type QuickPrefs } from './quickPrefs';
import { aspectsOf, weightsOf } from '../explore/aspects';
import { idOf } from '../explore/candidate';
import { rankEligible } from '../explore/rank';
import { explorePool, identityOf, type Candidate as PoolCandidate } from '../explore/pool';
import { meaningfulDryTiers, stockTier } from './sizeTiers';
import { leanOf } from './learning';
import { defaultProfile, type UserProfile } from '../demand/types';
import type { Archetype } from './archetypes';
import type { TankSetup, Units } from './types';
import type { CandidateRecord } from './discoveryTypes';
import {
  coverageOf, dist, distinct, diversify, excludedSpecies, feasibilityBrief, feasibilityPrefs, FAMS_WANTED, fromLook, fromPropose, habitatFree, ingest, liveWants, lookOrder, newCache, noSolution, seedLocked,
  type Ctx, type PairCache, type PairProject, type Pending, type PoolMetrics, type ScoredRow,
} from './pairGen';

// ---------------------------------------------------------------------------------------------------------------- the shared generation loop
export interface GatherEnv {
  ctx: Ctx; cache: PairCache; /** the baseline the proposals are made on */ gen: TankSetup; looks: Archetype[];
  /** a first pair (or any candidate set that is not a challenger) */ first: boolean;
  /** each look is tried at ONE size first (A/B first pair without a size preference) */ sizesAtFirst: boolean;
  /** after every look, a second pass through them with 3 sizes */ bigPass: boolean;
  /** the pool as the caller sees it (unseen, not blocked, pruned) */ poolOf: () => Pending[];
  /** absolute `performance.now()` after which generation stops whatever the pool holds */ hard: number;
  /** after each generation step: a stop reason when the pool is enough, else undefined */ decide: (pool: Pending[], t: number) => 'coverage' | 'soft' | 'hard' | undefined;
  /** how a look becomes candidates (default: a catalogue tank drawn for that look) */ look?: (c: Ctx, a: Archetype, sizes: number, big: boolean) => void;
}
/** Generate step by step: DX2 proposals on the baseline (cheap, few: variations of one design), then one Explore look at a time (families spread by `lookOrder`), then more proposal rounds. Stops when `decide` says so, at `hard`, or when every source is spent. */
export function gatherPool(e: GatherEnv): PoolMetrics['stop'] {
  const { ctx, cache, looks, first } = e, look = e.look ?? fromLook;
  for (;;) {
    if (!cache.proposeDone) { fromPropose(ctx, e.gen, first && looks.length ? 4 : 10); cache.proposeDone = true; }
    else if (cache.looksDone.size < looks.length) look(ctx, looks.find(a => !cache.looksDone.has(a.id))!, e.sizesAtFirst ? 1 : 3, false);   // with a size preference the first pair already looks across the range; later pairs offer each look in 2-3 sizes, each with its own stocking
    else if (e.bigPass && cache.bigDone.size < looks.length) look(ctx, looks.find(a => !cache.bigDone.has(a.id))!, 3, true);
    else if (cache.round < 3) { cache.round++; fromPropose(ctx, e.gen, 10); }
    else return 'exhausted';
    const pool = e.poolOf(), t = performance.now(), s = e.decide(pool, t);
    if (s) return s;
    if (t > e.hard) return 'hard';
  }
}

// ---------------------------------------------------------------------------------------------------------------- gaps
export type Category = 'hardscape' | 'plants' | 'animals' | 'substrate';
/** The categories (within `scope`) the scene has nothing of: the gaps `finishSetup` fills. */
export function gapsOf(S: TankSetup, scope: readonly Tab[]): Category[] {
  const out: Category[] = [];
  if (scope.includes('hardscape') && !S.items.some(i => i.kind !== 'plant' && i.kind !== 'artificial')) out.push('hardscape');
  if (scope.includes('plants') && !S.items.some(i => i.kind === 'plant' || i.kind === 'artificial')) out.push('plants');
  if (scope.includes('animals') && !S.fish.length) out.push('animals');
  if (scope.includes('substrate') && !S.substrate.show) out.push('substrate');
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- the API
export interface CandidateRequest {
  /** 'explore' (default): whole new designs from every unkept item in scope. 'complete': only fill gaps, never change what is there. 'refine': variations (with `focus`, only that tab / items / region). 'solve': fixes. */
  objective?: Objective;
  /** the tabs Discover may change (default: the tank's Discovery switches, i.e. the checked tabs); always cut down to the switches that are on */
  scope?: readonly Tab[];
  focus?: Focus;
  /** 0..1: how many Explore looks are tried (0 = variations of the scene only; 1 = up to 8 looks). Default 0.5. */
  breadth?: number;
  /** how many candidates to return (default 3) */
  n?: number;
  /** keep the tank as it is and draw the look for it (default: true for 'complete', else false): the Tank tab leaves the scope */
  tankFixed?: boolean;
}
export interface CandidateOpts {
  now?: number; units?: Units; P?: UserProfile; budgetMs?: number; prefs?: QuickPrefs; sessionId?: string;
  /** keys (CandidateRecord.key) never returned again */
  shownKeys?: Iterable<string>;
  /** reuse generated designs across calls with the same project, brief, scope and objective (feedback changes only re-rank) */
  cache?: PairCache;
  notes?: string[]; scores?: (rows: ScoredRow[]) => void; metrics?: (m: PoolMetrics) => void;
}
export type CandidateResult =
  | { ok: true; candidates: CandidateRecord[]; /** the scope actually used */ scope: Tab[]; /** the gaps that were open (objective 'complete') */ gaps: Category[]; notes: string[] }
  | { ok: false; conflicts: string[]; relaxations: string[]; scope: Tab[]; gaps: Category[];
      /** objective 'complete' only: the gaps cannot be filled without changing something that is not kept; `relaxations` offers Show alternatives */ needsChange?: boolean;
      /** objective 'complete' only: nothing is missing in scope */ nothingMissing?: boolean };

const LOOKS_MAX = 8;
/** Look source for a scene whose tank stays: the look is drawn in a catalogue tank, ADAPTED to the tank that is there (adaptToTank), and for 'complete' handed over as a FILL (only the gaps). */
function lookOnTank(fill: boolean) {
  return (c: Ctx, a: Archetype, sizes: number, big: boolean): void => {
    const t0 = performance.now();
    (big ? c.cache.bigDone : c.cache.looksDone).add(a.id);
    try {
      const r = explorePool(c.w, c.P, c.units, c.now, { only: [a.id], sizes, explain: false, stock: (arch, tank, tier) => stockTier(arch, tank, tier, c.exclude) }), id = identityOf(a);
      const dry = a.env === 'terrarium' || a.env === 'paludarium', c0 = [...r.eligible, ...r.provisional] as PoolCandidate[], cands = dry ? meaningfulDryTiers(c0) : c0;
      for (const cand of cands) {
        let s = adaptScene(ensureUids(structuredClone(cand.scene)), c.orig.tank).scene;
        if (fill) s = handOff(c.orig, s, { mode: 'fill', brief: c.brief, accept: c.scope.includes('animals') ? s.fish.map(f => f.species) : [] }).scene;
        const got = ingest(c, ensureUids(s), cand.identity.name, 'explore', { familyId: id.familyId, archetypeId: a.id, name: cand.identity.name });
        if (got) { c.cache.pend.push(got); c.cache.stats.explore++; }
      }
    } catch { /* a look that cannot be drawn for this project yields nothing */ }
    c.cache.stats.ms += performance.now() - t0;
  };
}

/** The top-N diverse, feasible candidates for `project` (any scene: empty, partial or complete). Pure: writes nothing, adds no lock. Every candidate takes the road of an A/B candidate (`ingest`), so a kept item, a lock, a limit or a welfare gate is never broken. */
export function nextCandidates(project: PairProject, brief: Brief, req: CandidateRequest = {}, opts: CandidateOpts = {}): CandidateResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), t0 = performance.now(), objective: Objective = req.objective ?? 'explore', n = Math.max(1, req.n ?? 3);
  const breadth = Math.max(0, Math.min(1, req.breadth ?? 0.5)), notes = opts.notes ?? [];
  const on = new Set(discoverTabs(project.tank)), tankFixed = req.tankFixed ?? objective === 'complete';
  const open = TABS.filter(t => (req.scope ?? TABS).includes(t) && on.has(t) && !(tankFixed && t === 'tank'));
  const base = ensureUids(structuredClone(project.tank)); seedLocked(base, undefined, undefined, notes);
  const gaps = objective === 'complete' ? gapsOf(base, open) : [];
  // 'complete' fills ONLY the gaps: a tab that already has content is not touched, whether or not it is kept
  const scope = objective === 'complete' ? open.filter(t => gaps.includes(t as Category)) : open;
  if (objective === 'complete' && !gaps.length && open.length) return { ok: false, conflicts: ['Nothing is missing in the open menus: there is no gap to fill.'], relaxations: ['Show alternatives to change what is there'], scope, gaps, nothingMissing: true };
  if (!open.length) return { ok: false, conflicts: ['Nothing is open to change: every menu is switched off or kept.'], relaxations: ['Switch a menu on, or release a kept menu'], scope, gaps };
  const pf = opts.prefs ?? readQuickPrefs(brief), w = liveWants(brief), excl = excludedSpecies(pf);
  const sig = idOf(JSON.stringify([rulesOf(brief), project.rev, scope, objective, req.focus, breadth, feasibilityPrefs(pf), feasibilityBrief(brief), { ...project.tank, camera: undefined, render: undefined, brief: undefined }]));
  const cache = opts.cache?.sig === sig ? opts.cache : opts.cache ? Object.assign(opts.cache, newCache(sig)) : newCache(sig);
  const ctx: Ctx = { rules: rulesOf(brief), objective, ...(req.focus ? { focus: req.focus } : {}), additive: objective === 'complete', prefs: pf, ...(excl.size ? { exclude: excl } : {}), ...(pf.prohibit.includes('co2') ? { noCo2: true } : {}),
    orig: base, brief, w, P, units, now, scope, baseRev: project.rev, sessionId: opts.sessionId ?? 'candidates', purpose: 'first', cache };
  const free = habitatFree(base, scope), looksOn = objective === 'explore' || objective === 'complete' || (objective === 'refine' && !req.focus);
  // a whole new habitat only when the Tank tab is open; otherwise (the tank stays) the look is drawn for the tank that is there
  const looks = looksOn && breadth > 0 && (free || tankFixed || scope.some(t => t !== 'tank')) ? lookOrder(ctx, 'unsure', 'first').slice(0, Math.max(1, Math.round(1 + breadth * (LOOKS_MAX - 1)))) : [];
  const known = new Set<string>(opts.shownKeys ?? []);
  const scoreW = weightsOf(aspectsOf(brief)), feedback = projectExtras(brief).feedback;
  const breakdownOf = (p: Pending): ScoreBreakdown => scoreBreakdown({ pf, S: p.rec.snapshot, facts: p.rec.facts, features: p.entry.features, archetypeId: p.entry.fp.archetypeId, familyId: p.entry.fp.familyId, totals: p.sc.totals, weights: scoreW, feedback, lean: leanOf(brief) });
  const scoreOf = (p: Pending) => breakdownOf(p).total;
  const usable = () => rankEligible(cache.pend.filter(p => !known.has(p.rec.key ?? '') && p.sc.gate.verdict !== 'blocked' && (objective !== 'complete' || !gapsOf(p.rec.snapshot, scope).length)).map(p => ({ ...p.entry, p })), aspectsOf(brief)).map(e => e.p);
  let pruned = 0;
  const pooled = (): Pending[] => {
    const u = usable();
    if (looks.length) { const d = diversify(u, scoreOf, distinct); pruned = d.pruned; return d.kept; }
    const out: Pending[] = []; for (const p of [...u].sort((a, b) => scoreOf(b) - scoreOf(a))) if (!out.some(k => dist(k, p) < 0.06)) out.push(p);   // variations of one scene: near-duplicates only are pruned
    pruned = u.length - out.length; return out;
  };
  const soft = performance.now() + (opts.budgetMs ?? 2200), hard = performance.now() + 4 * (opts.budgetMs ?? 2200);
  const stop = gatherPool({ ctx, cache, gen: base, looks, first: true, sizesAtFirst: true, bigPass: false, poolOf: pooled, hard, look: tankFixed || !free ? lookOnTank(objective === 'complete') : undefined,
    decide: (pool, t) => { const cov = coverageOf(pool); return pool.length >= n && cov.fams >= Math.min(FAMS_WANTED, Math.max(1, looks.length)) ? 'coverage' : t > soft && pool.length >= 1 ? 'soft' : undefined; } });
  const pool = pooled(), picked = pool.slice(0, n);
  opts.metrics?.({ type: 'first', ms: Math.round(performance.now() - t0), stop, tried: cache.stats.tried, generated: cache.pend.length, yield: cache.stats.tried ? +(cache.pend.length / cache.stats.tried).toFixed(2) : 0, usable: usable().length, pooled: pool.length, pruned,
    families: coverageOf(pool).fams, sizeClasses: coverageOf(pool).sizes, worlds: coverageOf(pool).worlds, stockPatterns: coverageOf(pool).stock, looksTried: cache.looksDone.size, proposals: cache.stats.propose, explores: cache.stats.explore, rejections: {}, excludedSpecies: excl.size, preExcluded: cache.stats.pre });
  if (picked.length) {
    if (opts.scores) { const ids = new Set(picked.map(p => p.rec.id)); opts.scores(pool.map(p => ({ id: p.rec.id, title: p.rec.facts.title, chosen: ids.has(p.rec.id), breakdown: breakdownOf(p) }))); }
    return { ok: true, candidates: picked.map(p => p.rec), scope, gaps, notes };
  }
  // blocker 5: 'complete' found nothing. When a candidate that CHANGES something not kept would be feasible, say so (the gap cannot be filled as it is) and offer Show alternatives; never change it silently.
  const probe = objective === 'complete' ? nextCandidates(project, brief, { objective: 'refine', scope: open, n: 1, breadth: 0, tankFixed: true }, { now, units, P, prefs: pf, sessionId: opts.sessionId, budgetMs: 800 }) : undefined, needsChange = !!probe?.ok;
  const res = noSolution(cache, needsChange ? ['The gaps cannot be filled without changing something that is there and not kept.', ...notes] : notes, locksOf(base).objects.some(o => o.target === 'tank') ? ['Unlock the tank for a larger one'] : []);
  const relaxations = needsChange ? ['Show alternatives instead of filling only the gaps', ...(res.ok ? [] : res.relaxations)] : res.ok ? [] : res.relaxations;
  return { ok: false, conflicts: res.ok ? [] : res.conflicts, relaxations, scope, gaps, ...(needsChange ? { needsChange: true } : {}) };
}

/** "Finish my setup" (decision D2, "Fill only the gaps"): objective 'complete' over the open tabs, the tank staying as it is, the look made for it. Everything present stays; only what a category lacks is added. */
export const finishSetup = (project: PairProject, brief: Brief, req: Omit<CandidateRequest, 'objective' | 'tankFixed'> = {}, opts: CandidateOpts = {}): CandidateResult => nextCandidates(project, brief, { ...req, objective: 'complete', tankFixed: true }, opts);
