// Discovery v2, lane AB1 (spec sections 3, 4, 5, 7, 9, 10): the PAIR GENERATOR. `nextPair` returns two complete, validated, comparable CandidateRecords (or an honest no-solution); `adapt` makes a NEW record fit the current locks.
// Sources: DX2 `propose()` on the baseline (scope and locks honoured by the engine itself) and, when the Tank tab may change and the habitat is not locked, Explore recipes (`explorePool` on ONE look at a time, so the first pair
// never waits for the minutes a whole pool takes). Every candidate, whatever its source, takes the same road: confine (scope, locks, freezes) -> checkProposal (a lock breaker is DROPPED, never shown) -> equipPlan rules
// (Must use always in, No new equipment infeasible) -> verdictOf (welfare and physical gates, the person's limits) -> Explore's firm gate -> facts filled by ONE accounting (pairFacts.ts). Only feasible candidates make a pair.
// Equipment is never shuffled: it is derived from each design by equipPlan. Candidates are cached per (project rev, session, scope, freezes, direction, pair type) so later challengers cost almost nothing.
import { TABS, type Tab } from './scope';
import { discoverTabs } from './discoverScope';
import { confine, propose, type DiscoveryProposal } from './discover';
import { checkProposal, deltaBetween, previewProposal } from './proposal';
import { locksOf } from './locks';
import { verdictOf, type Issue } from './verdict';
import { equipPlan, noNewEquipment } from './equipPlan';
import { equipmentOf } from './project';
import { filterUnits, heaterUnits, withUnits } from './tech';
import { briefToWants, type Brief } from './brief';
import { ensureUids } from './uid';
import { ARCHETYPES, type Archetype } from './archetypes';
import { explorePool, isBuildable, identityOf, type Candidate as PoolCandidate } from '../explore/pool';
import { aspectScore, aspectsOf, weightsOf } from '../explore/aspects';
import { distance as fpDistance, idOf, type Entry } from '../explore/candidate';
import { rankEligible } from '../explore/rank';
import { customTankWants, type Kind, type Wants } from '../demand/suggest';
import { defaultProfile, type UserProfile } from '../demand/types';
import type { TankSetup, Units } from './types';
import type { CandidateRecord, DiscoverySession, HabitatDirection, PairResult, ProposalPurpose, Comparison } from './discoveryTypes';
import { contentDistance, factsOf, featuresFor, fingerprintOf, keyOf, scoreScene, tokensOf, type Scored } from './pairFacts';

/** The working project: its tank (design, brief, locks) and the store revision it was read at. */
export interface PairProject { tank: TankSetup; rev: number }
export type Lookup = (id: string) => CandidateRecord | undefined;
export interface PairOpts {
  /** the type of pair wanted; default: derived from the session (no champion = 'first', else 'champion') */
  next?: Comparison['type'];
  /** keys (CandidateRecord.key) of everything already shown this session: never offered again */
  shownKeys?: Iterable<string>;
  now?: number; units?: Units; P?: UserProfile;
  /** generation budget, ms (default 2200: the first pair is due in about 3 s with the validation that follows) */
  budgetMs?: number;
  /** candidate cache (default: a small shared one keyed by the situation) */
  cache?: PairCache;
}

interface Pending { rec: CandidateRecord; entry: Entry; tokens: string[]; source: 'propose' | 'explore'; world: string; sc: Scored }
interface Rej { text: string; issues: Issue[]; relax: string[] }
export interface PairCache { sig: string; pend: Pending[]; keys: Set<string>; round: number; looksDone: Set<string>; rej: Rej[]; proposeDone: boolean; stats: { propose: number; explore: number; ms: number } }
const SHARED = new Map<string, PairCache>();
export const clearPairCache = () => SHARED.clear();
const newCache = (sig: string): PairCache => ({ sig, pend: [], keys: new Set(), round: 0, looksDone: new Set(), rej: [], proposeDone: false, stats: { propose: 0, explore: 0, ms: 0 } });

const MIN_PAIR = 0.12;           // two designs closer than this are the same design to the person
const KIND_OF = (a: Archetype): Kind => a.env === 'terrarium' ? 'terrarium' : a.env === 'paludarium' ? 'vivarium' : a.water === 'saltwater' ? 'saltwater' : 'freshwater';
const DIRECTION_KIND: Partial<Record<HabitatDirection, Kind>> = { freshwater: 'freshwater', saltwater: 'saltwater', terrarium: 'terrarium', paludarium: 'vivarium' };

// ---------------------------------------------------------------------------------------------------------------- the baseline
/** The working project with each frozen tab copied from its source record (a frozen tab keeps THAT source's values: spec 5.2). `working` freezes need no copy. Never writes the project. */
export function baselineOf(project: PairProject, session: DiscoverySession, lookup: Lookup): { base: TankSetup; notes: string[] } {
  let base = ensureUids(structuredClone(project.tank)); const notes: string[] = [], bySource = new Map<string, Tab[]>();
  for (const f of session.freezes) if (f.source !== 'working') bySource.set(f.source, [...(bySource.get(f.source) ?? []), f.tab]);
  for (const [id, tabs] of bySource) {
    const src = lookup(id);
    if (!src) { notes.push(`The kept ${tabs.join(' and ')} came from a design that is no longer in the history, so the working design's ${tabs.join(' and ')} stay.`); continue; }
    const c = confine(base, src.snapshot, tabs);
    if (c) base = c; else notes.push(`The kept ${tabs.join(' and ')} could not be placed in this project, so the working design's stay.`);
  }
  return { base, notes };
}
/** Tabs a pair may vary: the session's checked tabs, minus frozen ones, minus tabs whose Discovery switch is off. */
export const effectiveScope = (project: PairProject, session: DiscoverySession): Tab[] => {
  const frozen = new Set(session.freezes.map(f => f.tab)), on = new Set(discoverTabs(project.tank));
  return TABS.filter(t => session.scope.includes(t) && !frozen.has(t) && on.has(t));
};
/** May a whole new habitat be drawn? The Tank tab is in scope and neither the tank dimensions nor the water are locked. */
function habitatFree(base: TankSetup, scope: readonly Tab[]): boolean {
  if (!scope.includes('tank')) return false;
  const lk = locksOf(base).objects.find(o => o.target === 'tank');
  return !lk || (!!lk.props?.length && !lk.props.includes('dimensions') && !lk.props.includes('water'));
}

// ---------------------------------------------------------------------------------------------------------------- one candidate
/** Gear the person OWNS stays theirs whatever design is drawn: a catalogue look or an older record brings its own light, heater and filter, so the owned ones of the working project replace them (equipPlan then credits them only when capable). */
function carryOwned(orig: TankSetup, scene: TankSetup): TankSetup {
  const r = structuredClone(scene);
  if (orig.light.owned) r.light = structuredClone(orig.light);
  if (orig.tech) {
    const h = heaterUnits(orig.tech).filter(u => u.owned), f = filterUnits(orig.tech).filter(u => u.owned);
    if (h.length) r.tech = withUnits(r.tech ?? structuredClone(orig.tech), 'heater', structuredClone(h));
    if (f.length) r.tech = withUnits(r.tech ?? structuredClone(orig.tech), 'filter', structuredClone(f));
  }
  return r;
}
interface Ctx { orig: TankSetup; brief: Brief; w: Wants; P: UserProfile; units: Units; now: number; scope: Tab[]; baseRev: number; sessionId: string; purpose: ProposalPurpose; parentId?: string; cache: PairCache; plan0?: ReturnType<typeof equipPlan> }
const drop = (c: Ctx, text: string, issues: Issue[] = [], relax: string[] = []) => { c.cache.rej.push({ text, issues, relax }); return null; };

/** Run one design through every check; null = dropped (and counted for the no-solution explanation). */
function ingest(c: Ctx, scene: TankSetup, label: string, source: Pending['source'], ids: { familyId?: string; archetypeId?: string; name?: string } = {}): Pending | null {
  const { orig, brief } = c;
  const fin = confine(orig, carryOwned(orig, scene), c.scope);
  if (!fin) return drop(c, `${label}: leaves a plant without its hardscape or a piece outside the tank`);
  const delta = deltaBetween(orig, fin), chk = checkProposal(orig, { baseRev: c.baseRev, scope: c.scope, delta, summary: '' });
  if (!chk.ok) return drop(c, `${label}: ${chk.outside.length ? `would change ${chk.outside.join(', ')}` : chk.violations.map(v => v.detail).join(' ')}`, [], chk.violations.map(v => v.kind === 'roster' ? `Lower the roster floor: ${v.detail}` : `Unlock "${v.target}": ${v.detail}`));
  const after = chk.after, key = keyOf(after);
  // a roster lock holds on the finished design even for a species the baseline did not have (confine only restores animals the baseline holds)
  for (const lk of locksOf(orig).roster) {
    const n = after.fish.filter(f => f.species === lk.species).length, ok = lk.mode === 'exact' ? n === lk.n : lk.mode === 'atLeast' ? n >= lk.n : n >= 1;
    if (!ok) return drop(c, `${label}: breaks the kept ${lk.species} (${lk.mode === 'exact' ? 'exactly' : lk.mode === 'atLeast' ? 'at least' : 'the species stays,'} ${lk.n})`, [], [`Lower the roster floor for ${lk.species}`]);
  }
  if (c.cache.keys.has(key)) return null;
  // equipment: a Must-use item that cannot work is infeasible; No new equipment forbids any new purchase and any supporting-gear change; a Must-use tank is never resized
  const must = new Set(equipmentOf(brief).items.filter(i => i.use === 'required').map(i => i.key)), plan0 = c.plan0 ??= equipPlan(orig, brief, c.P);
  const plan = equipPlan(after, brief, c.P), gearChange = chk.touches.support.filter(k => k === 'light' || k === 'tech' || k === 'product' || k === 'integrated');
  const newBuys = plan.toBuy.filter(l => !plan0.toBuy.some(o => o.key === l.key && o.usd >= l.usd));
  const eqWhy = plan.infeasible ? plan.infeasible : noNewEquipment(brief) && (gearChange.length || newBuys.length) ? `${label}: needs new equipment (${[...gearChange, ...newBuys.map(l => l.label)].join(', ')}), and the project allows none` : must.has('tank') && chk.touches.tank.includes('dimensions') ? `${label}: resizes the tank you marked Must use` : '';
  if (eqWhy) return drop(c, eqWhy, [{ id: 'equip:rule', tab: 'equipment', uids: [], text: eqWhy, relax: noNewEquipment(brief) && !plan.infeasible ? 'Allow new equipment for this run' : 'Mark the item Have available instead of Must use' }], ['Allow new equipment, or mark the item Have available instead of Must use']);
  const v0 = verdictOf(after, brief, { units: c.units });
  if (!v0.feasible) return drop(c, label, [...v0.gates, ...v0.hard], [...v0.gates, ...v0.hard].map(i => i.relax ?? `Relax: ${i.text}`));
  const sc = scoreScene(after, brief, c.w, c.P, c.now), blocked = sc.gate.reasons.filter(r => r.severity === 'blocked');
  if (blocked.length) return drop(c, `${label}: ${blocked[0].text}`, [], blocked.map(r => `Relax: ${r.text}`));
  const v = verdictOf(after, brief, { totals: sc.totals, units: c.units });
  if (!v.feasible) return drop(c, label, [...v.gates, ...v.hard], [...v.gates, ...v.hard].map(i => i.relax ?? `Relax: ${i.text}`));
  const facts = factsOf(after, brief, sc, ids.name);
  const assumptions = [...sc.estimate.assumptions, ...sc.gate.assumptions, ...sc.gate.reasons.filter(r => r.severity === 'provisional').map(r => r.text), ...sc.plan.flags.map(f => f.text)];
  if (sc.plan.capsPlants) assumptions.push('Your light is weak for plants: it limits what can grow, and CO2 or fertilizer do not make up for it.');
  if (sc.plan.supplementUsd > 0) assumptions.push('A Must-use item is too small on its own: the design adds the gear that makes up the difference, and that is in the purchases.');
  if (source === 'explore') assumptions.push('Drawn from a catalogue look: the layout is a suggested arrangement.');
  const rec: CandidateRecord = {
    id: `ab-${idOf(`${c.sessionId}|${c.baseRev}|${c.purpose}|${c.parentId ?? ''}|${key}`)}`, sessionId: c.sessionId, createdAt: c.now, baseRev: c.baseRev, purpose: c.purpose, ...(c.parentId ? { parentId: c.parentId } : {}),
    snapshot: structuredClone(after), facts, verdict: v, assumptions: [...new Set(assumptions)], key,
  };
  const features = featuresFor(after, sc, ids), fp = fingerprintOf(after, sc, ids);
  c.cache.keys.add(key);
  return { rec, entry: { id: rec.id, key, fp, features }, tokens: tokensOf(after), source, world: features[0] ?? '', sc };
}

// ---------------------------------------------------------------------------------------------------------------- sources
function fromPropose(c: Ctx, base: TankSetup, n: number): void {
  const t0 = performance.now(), round = c.cache.round;
  const d = propose(base, c.brief, { scope: c.scope, objective: 'explore' }, n, { variants: 3, seed: base.layout.seed + 7919 * round });
  for (const p of d.proposals) { const s = previewProposal(base, p as DiscoveryProposal); const got = ingest(c, s, (p as DiscoveryProposal).source, 'propose'); if (got) { c.cache.pend.push(got); c.cache.stats.propose++; } }
  if (d.noSolution) for (const i of d.noSolution.conflicts) c.cache.rej.push({ text: i.text, issues: [i], relax: i.relax ? [i.relax] : [] });
  if (d.noSolution) c.cache.rej.push({ text: 'no proposal passed', issues: [], relax: d.noSolution.relaxations });
  c.cache.stats.ms += performance.now() - t0;
}

/** The Explore looks to try, in the order that spreads worlds and families apart (or stays near the champion's). */
function looksFor(c: Ctx, direction: HabitatDirection, type: Comparison['type'], champ?: CandidateRecord): Archetype[] {
  const kinds = c.w.kinds?.length ? c.w.kinds : undefined, want = DIRECTION_KIND[direction];
  const all = ARCHETYPES.filter(a => isBuildable(a) && identityOf(a).water !== 'brackish' && (!kinds || kinds.includes(KIND_OF(a))));
  const soft = (type === 'first' || type === 'champion') && want ? all.filter(a => KIND_OF(a) === want) : all;
  const pool = soft.length ? soft : all, champFam = champ ? champ.snapshot.layout.id : undefined;
  const byFam = new Map<string, Archetype[]>(); for (const a of pool) byFam.set(a.familyId, [...(byFam.get(a.familyId) ?? []), a]);
  const fams = [...byFam.values()], out: Archetype[] = [];
  for (let i = 0; fams.some(f => f.length > i); i++) for (const f of fams) if (f[i]) out.push(f[i]);
  return type === 'fresh' && champFam ? out.filter(a => !a.recipe.looks.includes(champFam as never)).concat(out.filter(a => a.recipe.looks.includes(champFam as never))) : out;
}
function fromLook(c: Ctx, a: Archetype): void {
  const t0 = performance.now();
  c.cache.looksDone.add(a.id);
  try {
    const r = explorePool(c.w, c.P, c.units, c.now, { only: [a.id], sizes: 1, explain: false }), id = identityOf(a);
    for (const cand of [...r.eligible, ...r.provisional] as PoolCandidate[]) {
      const got = ingest(c, ensureUids(structuredClone(cand.scene)), cand.identity.name, 'explore', { familyId: id.familyId, archetypeId: a.id, name: cand.identity.name });
      if (got) { c.cache.pend.push(got); c.cache.stats.explore++; }
    }
    for (const x of r.withheld.slice(0, 3)) c.cache.rej.push({ text: `${x.name}: ${x.reasons[0]?.text ?? 'turned away'}`, issues: [], relax: [] });
  } catch { /* a look that cannot be drawn for this project yields nothing */ }
  c.cache.stats.ms += performance.now() - t0;
}

// ---------------------------------------------------------------------------------------------------------------- choosing
const dist = (a: Pending, b: Pending) => Math.max(fpDistance(a.entry.fp, b.entry.fp), contentDistance(a.tokens, b.tokens));
const same = (a: Pending, b: Pending) => dist(a, b) < MIN_PAIR / 2;

function choosePair(pool: Pending[], type: 'first' | 'fresh', champ: Pending | undefined, scoreOf: (p: Pending) => number, contrast: boolean): [Pending, Pending] | undefined {
  let best: [Pending, Pending] | undefined, bv = -Infinity;
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j], d = dist(a, b); if (d < MIN_PAIR) continue;
    // far apart, and (fresh) far from the champion; a controlled contrast would rather differ in few things than in many, so only the first-pair spread rewards size
    const away = champ ? Math.min(dist(a, champ), dist(b, champ)) : 0;
    if (type === 'fresh' && champ && away < MIN_PAIR) continue;
    const v = (contrast ? -Math.abs(d - 0.3) : d) + (type === 'fresh' ? away : 0) + 0.1 * Math.max(-1, Math.min(1, scoreOf(a) + scoreOf(b))) + (a.world !== b.world && !contrast ? 0.1 : 0);
    if (v > bv) { bv = v; best = [a, b]; }
  }
  return best;
}
/** Nearer the champion as the session goes on: broad early, a close contest later. */
const targetFor = (comparisons: number) => comparisons < 2 ? 0.45 : comparisons < 5 ? 0.3 : 0.2;
function chooseChallenger(pool: Pending[], champ: Pending, comparisons: number, scoreOf: (p: Pending) => number): Pending | undefined {
  let best: Pending | undefined, bv = -Infinity;
  for (const p of pool) { const d = dist(p, champ); if (d < MIN_PAIR) continue; const v = -Math.abs(d - targetFor(comparisons)) + 0.1 * Math.max(-1, Math.min(1, scoreOf(p))); if (v > bv) { bv = v; best = p; } }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------- the entry point
const noSolution = (c: PairCache, extra: string[] = []): PairResult => {
  const conflicts = new Map<string, string>(), relax = new Set<string>();
  for (const r of c.rej) { for (const i of r.issues) conflicts.set(i.id, i.text); for (const x of r.relax) relax.add(x); }
  if (!conflicts.size) for (const r of c.rej.slice(0, 4)) conflicts.set(r.text, r.text);
  return { ok: false, conflicts: [...extra, ...conflicts.values()].slice(0, 8), relaxations: [...relax].slice(0, 8) };
};

/** The next pair for the session on screen: two complete, validated, comparable designs. `final` generates nothing: the fresh winner against the champion, both from history (A = champion, B = the fresh winner). */
export function nextPair(project: PairProject, brief: Brief, session: DiscoverySession, lookup: Lookup, opts: PairOpts = {}): PairResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), t0 = performance.now();
  const champ = session.championId ? lookup(session.championId) : undefined;
  const type: Comparison['type'] = opts.next ?? (champ ? 'champion' : 'first');
  if (type === 'final') {
    const fresh = session.pendingFreshId ? lookup(session.pendingFreshId) : undefined;
    return champ && fresh ? { ok: true, a: champ, b: fresh } : { ok: false, conflicts: [!champ ? 'There is no favourite to compare against yet.' : 'There is no new winner waiting to face the favourite.'], relaxations: [] };
  }
  const scope = effectiveScope(project, session);
  if (!scope.length) return { ok: false, conflicts: ['Nothing is open to change: every menu is switched off or kept for now.'], relaxations: ['Switch a menu on, or release a kept menu'] };
  const { base, notes } = baselineOf(project, session, lookup);
  const w = customTankWants(brief, briefToWants(brief)), purpose: ProposalPurpose = type === 'fresh' ? 'fresh' : type === 'champion' ? 'challenger' : scope.length <= 2 ? 'contrast' : 'first';
  const sig = idOf(JSON.stringify([project.rev, session.id, scope, session.freezes, session.direction, type, type === 'first' ? '' : champ?.id, brief]));
  const cache = opts.cache?.sig === sig ? opts.cache : opts.cache ? Object.assign(opts.cache, newCache(sig)) : (SHARED.get(sig) ?? (() => { if (SHARED.size >= 6) SHARED.delete(SHARED.keys().next().value!); const n = newCache(sig); SHARED.set(sig, n); return n; })());
  const known = new Set<string>([...(opts.shownKeys ?? []), ...(champ?.key ? [champ.key] : [])]);
  // the champion as a design in the CURRENT project's terms: challengers are variations around it (nearer it as the session goes on)
  const champBase = type === 'champion' && champ ? confine(base, champ.snapshot, scope) : null;
  const champPending: Pending | undefined = champ ? ((): Pending | undefined => {
    const S = champ.snapshot, sc = scoreScene(S, brief, w, P, now);
    return { rec: champ, entry: { id: champ.id, key: champ.key ?? keyOf(S), fp: fingerprintOf(S, sc), features: featuresFor(S, sc) }, tokens: tokensOf(S), source: 'propose', world: '', sc };
  })() : undefined;
  const scoreW = weightsOf(aspectsOf(brief)), scoreOf = (p: Pending) => aspectScore(scoreW, p.entry.features);
  const usable = () => {
    const fresh = cache.pend.filter(p => !known.has(p.rec.key ?? '') && !(champPending && type !== 'fresh' && same(p, champPending)));
    const eligible = rankEligible(fresh.filter(p => p.sc.gate.verdict !== 'blocked').map(p => ({ ...p.entry, p })), aspectsOf(brief)).map(e => e.p);
    return eligible;
  };
  const want = type === 'champion' ? 3 : 4, soft = performance.now() + (opts.budgetMs ?? 2200), hard = performance.now() + 4 * (opts.budgetMs ?? 2200);
  const choose = () => {
    const pool = usable();
    if (type === 'champion') { const ch = champPending && chooseChallenger(pool, champPending, session.comparisons.length, scoreOf); return ch && champ ? { a: champ, b: ch.rec, pool: pool.length } : undefined; }
    const pr = choosePair(pool, type === 'fresh' ? 'fresh' : 'first', champPending, scoreOf, purpose === 'contrast'); if (!pr) return undefined;
    const [x, y] = pr[0].rec.key! <= pr[1].rec.key! ? pr : [pr[1], pr[0]]; return { a: x.rec, b: y.rec, pool: pool.length };
  };
  // generate only as much as is needed: DX2's proposals on the baseline first (cheap), then one Explore look at a time while there is time and a whole habitat may be drawn
  const gen = champBase ?? base;
  const ctx: Ctx = { orig: gen, brief, w, P, units, now, scope, baseRev: project.rev, sessionId: session.id, purpose, ...(type === 'champion' && champ ? { parentId: champ.id } : {}), cache };
  const looks = habitatFree(base, scope) ? looksFor(ctx, session.direction, type, champ) : [];
  let result: { a: CandidateRecord; b: CandidateRecord; pool: number } | undefined;
  for (;;) {
    if (!cache.proposeDone) { fromPropose(ctx, gen, 10); cache.proposeDone = true; }
    else if (cache.looksDone.size < looks.length) fromLook(ctx, looks.find(a => !cache.looksDone.has(a.id))!);
    else if (cache.round < 3) { cache.round++; fromPropose(ctx, gen, 10); }
    else break;
    const usableN = usable().length, now2 = performance.now();
    if (usableN >= want && now2 >= 0) { result = choose(); if (result) break; }
    if (now2 > soft && usableN >= 2) { result = choose(); if (result) break; }
    if (now2 > hard) break;
  }
  result ??= choose();
  cache.stats.ms = Math.max(cache.stats.ms, performance.now() - t0);
  if (result) { const out = { ok: true as const, a: result.a, b: result.b }; return out; }
  const few = usable().length;
  return noSolution(cache, [...notes, ...(few === 1 ? ['Only one design fits your locks and limits, so there is nothing to compare it with.'] : few === 0 && cache.pend.length ? ['Every design that fits has already been shown.'] : [])]);
}

/** A NEW record (purpose 'adapted', parentId = the old one) of `record` fitted to the project as it is now: the current locks and limits hold, equipment is re-derived. The old record is never touched. */
export type AdaptResult = { ok: true; record: CandidateRecord; notes: string[] } | { ok: false; conflicts: string[]; relaxations: string[] };
export function adapt(record: CandidateRecord, project: PairProject, brief: Brief, opts: { now?: number; units?: Units; P?: UserProfile; sessionId?: string; scope?: Tab[] } = {}): AdaptResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), base = ensureUids(structuredClone(project.tank));
  const scope = opts.scope ?? discoverTabs(project.tank), cache = newCache('adapt'), w = customTankWants(brief, briefToWants(brief));
  const ctx: Ctx = { orig: base, brief, w, P, units, now, scope, baseRev: project.rev, sessionId: opts.sessionId ?? record.sessionId, purpose: 'adapted', parentId: record.id, cache };
  const got = ingest(ctx, ensureUids(structuredClone(record.snapshot)), record.facts.title, 'propose', { name: record.facts.title });
  if (!got) return noSolution(cache) as AdaptResult;
  const notes: string[] = [], was = JSON.stringify(record.snapshot.fish.map(f => f.species).sort()), now2 = JSON.stringify(got.rec.snapshot.fish.map(f => f.species).sort());
  if (was !== now2) notes.push('The animals changed to honour what you kept.');
  if (got.rec.key !== record.key) notes.push('The design was adjusted to fit your current locks and limits.');
  return { ok: true, record: got.rec, notes };
}
