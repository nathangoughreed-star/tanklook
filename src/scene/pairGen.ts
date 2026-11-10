// Discovery v2, lane AB1 (spec sections 3, 4, 5, 7, 9, 10): the PAIR GENERATOR. `nextPair` returns two complete, validated, comparable CandidateRecords (or an honest no-solution); `adapt` makes a NEW record fit the current locks.
// Sources: DX2 `propose()` on the baseline (scope and locks honoured by the engine itself) and, when the Tank tab may change and the habitat is not locked, Explore recipes (`explorePool` on ONE look at a time, so the first pair
// never waits for the minutes a whole pool takes). Every candidate, whatever its source, takes the same road: confine (scope, locks, freezes) -> checkProposal (a lock breaker is DROPPED, never shown) -> equipPlan rules
// (Must use always in, No new equipment infeasible) -> verdictOf (welfare and physical gates, the person's limits) -> Explore's firm gate -> facts filled by ONE accounting (pairFacts.ts). Only feasible candidates make a pair.
// Equipment is never shuffled: it is derived from each design by equipPlan. Candidates are cached per (project rev, session, scope, freezes, direction, pair type) so later challengers cost almost nothing.
import { TABS, type Tab } from './scope';
import { discoverTabs } from './discoverScope';
import { confine, propose, type DiscoveryProposal } from './discover';
import { checkProposal, deltaBetween, previewProposal } from './proposal';
import { locksOf, lockViolations, rosterMet } from './locks';
import { verdictOf, type Issue } from './verdict';
import { capableOf, equipPlan, noNewEquipment } from './equipPlan';
import { equipmentOf, requiredEquipment } from './project';
import { filterUnits, heaterUnits, inferTech, withUnits } from './tech';
import { briefToWants, type Brief } from './brief';
import { ensureUids } from './uid';
import { fitGear } from './gearFit';
import { stockTier } from './sizeTiers';
import { passesHard, readQuickPrefs, type QuickPrefs } from './quickPrefs';
import { volume } from './physics';
import { breadthOf, targetDistance, visuallyDistinct, type Breadth } from './breadth';
import { diffTouches } from './scope';
import { dropPlants, splice, strongerLight, strugglingPlants, trimAnimals } from './combine';
import { ARCHETYPES, type Archetype } from './archetypes';
import { explorePool, isBuildable, identityOf, type Candidate as PoolCandidate } from '../explore/pool';
import { aspectScore, aspectsOf, weightsOf } from '../explore/aspects';
import { distance as fpDistance, idOf, type Entry } from '../explore/candidate';
import { rankEligible } from '../explore/rank';
import { customTankWants, type Kind, type Wants } from '../demand/suggest';
import { defaultProfile, type UserProfile } from '../demand/types';
import type { Fish, TankSetup, Units } from './types';
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
  /** receives plain lines about what happened on the way (a kept species added, a conflicting champion replaced) */
  notes?: string[];
  /** receives the breadth the engine chose for this pair (objective, structure, learned confidence) */
  breadth?: (b: Breadth) => void;
  /** the person's quick preferences (lane AB6 shape): only 'hard' values filter; the rest rank */
  prefs?: QuickPrefs;
  /** candidate cache (default: a small shared one keyed by the situation) */
  cache?: PairCache;
}

interface Pending { rec: CandidateRecord; entry: Entry; tokens: string[]; source: 'propose' | 'explore'; world: string; sc: Scored }
interface Rej { text: string; issues: Issue[]; relax: string[] }
export interface PairCache { sig: string; pend: Pending[]; keys: Set<string>; round: number; looksDone: Set<string>; bigDone: Set<string>; rej: Rej[]; proposeDone: boolean; stats: { propose: number; explore: number; ms: number } }
const SHARED = new Map<string, PairCache>();
export const clearPairCache = () => SHARED.clear();
const newCache = (sig: string): PairCache => ({ sig, pend: [], keys: new Set(), round: 0, looksDone: new Set(), bigDone: new Set(), rej: [], proposeDone: false, stats: { propose: 0, explore: 0, ms: 0 } });

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
  seedLocked(base, session, lookup, notes);
  return { base, notes };
}
/** A roster lock RECONCILES with what the baseline holds (Coordinator 21): the species' count becomes what the lock says (exact n; at least n; the species stays), replacing the held count, never adding to it (a hold of 6 plus an exact 8 is 8, not 14).
 *  Missing animals come from a history record that has the species, else the lock's own count. Other held animals are untouched; welfare is judged later, and a conflict is reported, never silently resolved. Writes no lock. */
function seedLocked(base: TankSetup, session: DiscoverySession | undefined, lookup: Lookup | undefined, notes: string[]): void {
  const ids = new Set<string>(); if (session) { for (const x of [session.championId, session.pendingFreshId, session.current?.aId, session.current?.bId]) if (x) ids.add(x); for (const c of session.comparisons) { ids.add(c.aId); ids.add(c.bId); } }
  for (const lk of locksOf(base).roster) {
    const held = base.fish.filter(f => f.species === lk.species), c = held.length;
    const want = lk.mode === 'exact' ? lk.n : lk.mode === 'atLeast' ? Math.max(c, lk.n) : Math.max(c, 1);
    if (want === c) continue;
    if (want < c) {
      const drop = new Set(held.slice(want).map(f => f.id)); base.fish = base.fish.filter(f => !drop.has(f.id));
      notes.push(`Your kept ${lk.species} (exactly ${want}) replace the ${c} the held animals had.`); continue;
    }
    const src = [...ids].map(i => lookup?.(i)).find(r => r?.snapshot.fish.some(f => f.species === lk.species)), have = held.length ? held : src ? src.snapshot.fish.filter(f => f.species === lk.species) : [];
    let id = Math.max(0, ...base.fish.map(f => f.id)) + 1;
    for (let i = c; i < want; i++) {
      const t = have[i % Math.max(have.length, 1)], T = base.tank;
      const f = (t ? structuredClone(t) : { species: lk.species, x: T.L * 0.3 + (i * 37) % (T.L * 0.4), y: Math.min(100, T.H / 3), depth: T.D / 2 + ((i * 23) % 60) - 30, yaw: 0, pitch: 0, roll: 0, bend: 0 }) as Fish;
      f.id = id++; delete f.uid; if (t) { f.x += (i * 13) % 40 - 20; } base.fish.push(f);
    }
    notes.push(c ? `Your kept ${lk.species} (${want}) replace the ${c} the held animals had.` : `Your kept ${lk.species} (${want}) are added to every design.`);
  }
  ensureUids(base);
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
/** Owned gear and a design (Coordinator 21): MUST-USE gear is always in the design (equipPlan adds a supplement when it is too small, or calls it infeasible under "No new equipment"). HAVE-AVAILABLE gear is optional: it goes into a design only when it is
 *  capable for THAT design (then it is $0, the cheaper choice); otherwise it is left out and the design's own gear is derived (a purchase), never forced in. Pure; `S` is the finished design, `orig` the working project that owns the gear. */
export function reconcileGear(orig: TankSetup, S: TankSetup, brief: Brief): TankSetup {
  const must = new Set(requiredEquipment(brief).map(i => String(i.key))), r = structuredClone(S), ot = orig.tech;
  const oh = ot ? heaterUnits(ot).filter(u => u.owned) : [], of = ot ? filterUnits(ot).filter(u => u.owned) : [], ol = !!orig.light.owned;
  if (!oh.length && !of.length && !ol) return r;
  const trial = structuredClone(r);
  if (ol) trial.light = structuredClone(orig.light);
  if (oh.length) trial.tech = withUnits(trial.tech ?? structuredClone(ot!), 'heater', structuredClone(oh));
  if (of.length) trial.tech = withUnits(trial.tech ?? structuredClone(ot!), 'filter', structuredClone(of));
  const cap = capableOf(trial), inferred = () => inferTech(r);
  const keep = (item: 'light' | 'heater' | 'filter') => must.has(item) || cap[item] !== false;
  if (ol) { if (keep('light')) r.light = structuredClone(orig.light); else r.light = { ...r.light, owned: false } as never; }
  if (oh.length) r.tech = keep('heater') ? withUnits(r.tech ?? structuredClone(ot!), 'heater', structuredClone(oh)) : withUnits(r.tech ?? inferred(), 'heater', heaterUnits(inferred()).map(u => ({ ...u, owned: false })));
  if (of.length) r.tech = keep('filter') ? withUnits(r.tech ?? structuredClone(ot!), 'filter', structuredClone(of)) : withUnits(r.tech ?? inferred(), 'filter', filterUnits(inferred()).map(u => ({ ...u, owned: false })));
  return r;
}
interface Ctx { noCo2?: boolean; prefs?: QuickPrefs; orig: TankSetup; brief: Brief; w: Wants; P: UserProfile; units: Units; now: number; scope: Tab[]; baseRev: number; sessionId: string; purpose: ProposalPurpose; parentId?: string; cache: PairCache; plan0?: ReturnType<typeof equipPlan> }
const drop = (c: Ctx, text: string, issues: Issue[] = [], relax: string[] = []) => { c.cache.rej.push({ text, issues, relax }); return null; };

/** Run one design through every check; null = dropped (and counted for the no-solution explanation). */
function ingest(c: Ctx, scene: TankSetup, label: string, source: Pending['source'], ids: { familyId?: string; archetypeId?: string; name?: string } = {}): Pending | null {
  const { orig, brief } = c;
  const conf0 = confine(orig, scene, c.scope), fg = conf0 ? fitGear(conf0, { noCo2: c.noCo2 }) : undefined, conf = fg?.scene ?? null, fin = conf && reconcileGear(orig, conf, brief);
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
  if (c.prefs) {   // quick preferences (AB6): only HARD answers filter a candidate
    const live = after.items.filter(i => i.kind === 'plant').length, art = after.items.filter(i => i.kind === 'artificial').length, IN2 = 25.4 * 25.4;
    const why = !passesHard(c.prefs, { gallons: after.water.on ? volume(after.tank).gallons : null, floorSqIn: after.tank.L * after.tank.D / IN2, heightIn: after.tank.H / 25.4, plants: live >= 3 ? (art ? 'mixed' : 'live') : 'artificial', species: [...new Set(after.fish.map(f => f.species))], co2: after.grow.feed === 'co2', setupUsd: sc.totals.setupUsd, weeklyMin: sc.totals.minPerWeek });
    if (why) return drop(c, `${label}: breaks something you said is required or not wanted`, [], ['Relax the requirement that rules this design out']);
  }
  const v = verdictOf(after, brief, { totals: sc.totals, units: c.units });
  if (!v.feasible) return drop(c, label, [...v.gates, ...v.hard], [...v.gates, ...v.hard].map(i => i.relax ?? `Relax: ${i.text}`));
  const facts = factsOf(after, brief, sc, ids.name);
  const assumptions = [...sc.estimate.assumptions, ...sc.gate.assumptions, ...sc.gate.reasons.filter(r => r.severity === 'provisional').map(r => r.text), ...sc.plan.flags.map(f => f.text)];
  if (sc.plan.capsPlants) assumptions.push('Your light is weak for plants: it limits what can grow, and CO2 or fertilizer do not make up for it.');
  if (sc.plan.supplementUsd > 0) assumptions.push('A Must-use item is too small on its own: the design adds the gear that makes up the difference, and that is in the purchases.');
  if (fg?.said.length) assumptions.push(`Gear matched to what is drawn: ${fg.said.join('; ')}.`);
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
function fromLook(c: Ctx, a: Archetype, sizes = 1): void {
  const t0 = performance.now();
  (sizes > 1 ? c.cache.bigDone : c.cache.looksDone).add(a.id);
  try {
    const r = explorePool(c.w, c.P, c.units, c.now, { only: [a.id], sizes, explain: false, stock: stockTier }), id = identityOf(a);
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

/** Two designs look different at a glance (world, look family or hardscape-to-plant balance); see breadth.ts. */
const distinct = (a: Pending, b: Pending) => visuallyDistinct(a.rec.snapshot, b.rec.snapshot, a.entry.fp.familyId, b.entry.fp.familyId);
function choosePair(pool: Pending[], type: 'first' | 'fresh', champ: Pending | undefined, scoreOf: (p: Pending) => number, contrast: boolean, strict = false, tw = 0.1): [Pending, Pending] | undefined {
  let best: [Pending, Pending] | undefined, bv = -Infinity;
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j], d = dist(a, b); if (d < MIN_PAIR) continue;
    if (strict && !contrast && !distinct(a, b)) continue;                       // an exploration pair must look different at a glance: another is drawn
    // far apart, and (fresh) far from the champion; a controlled contrast would rather differ in few things than in many, so only the first-pair spread rewards size
    const away = champ ? Math.min(dist(a, champ), dist(b, champ)) : 0;
    if (type === 'fresh' && champ && away < MIN_PAIR) continue;
    if (strict && type === 'fresh' && champ && !contrast && !distinct(a, champ) && !distinct(b, champ)) continue;
    const v = (contrast ? -Math.abs(d - 0.3) : d) + (type === 'fresh' ? away : 0) + tw * Math.max(-1, Math.min(1, scoreOf(a) + scoreOf(b))) + (a.world !== b.world && !contrast ? 0.1 : 0);
    if (v > bv) { bv = v; best = [a, b]; }
  }
  return best;
}
/** The challenger: about `target` away from the favourite (the engine's adaptive breadth decides how far, never a round count). Refinement prefers a CONTROLLED contrast (few tabs differ); exploration, when broad, must look different at a glance (`strict`). Learned taste only adds a bounded ranking bonus. */
function chooseChallenger(pool: Pending[], champ: Pending, target: number, scoreOf: (p: Pending) => number, refine: boolean, strict: boolean, tasteW: number): Pending | undefined {
  let best: Pending | undefined, bv = -Infinity;
  for (const p of pool) {
    const d = dist(p, champ); if (d < MIN_PAIR) continue;
    if (strict && !refine && !distinct(p, champ)) continue;
    const tabs = refine ? diffTouches(champ.rec.snapshot, p.rec.snapshot).tabs.length : 0;
    const v = -Math.abs(d - target) - (refine ? 0.12 * Math.max(0, tabs - 1) : 0) + tasteW * Math.max(-1, Math.min(1, scoreOf(p)));
    if (v > bv) { bv = v; best = p; }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------- the entry point
const noSolution = (c: PairCache, extra: string[] = [], more: string[] = []): PairResult => {
  const conflicts = new Map<string, string>(), relax = new Set<string>();
  for (const r of c.rej) { for (const i of r.issues) conflicts.set(i.id, i.text); for (const x of r.relax) relax.add(x); }
  if (!conflicts.size) for (const r of c.rej.slice(0, 4)) conflicts.set(r.text, r.text);
  return { ok: false, conflicts: [...extra, ...conflicts.values()].slice(0, 8), relaxations: [...relax, ...more].slice(0, 10) };
};

/** The next pair for the session on screen: two complete, validated, comparable designs. `final` generates nothing: the fresh winner against the champion, both from history (A = champion, B = the fresh winner). */
export function nextPair(project: PairProject, brief: Brief, session: DiscoverySession, lookup: Lookup, opts: PairOpts = {}): PairResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), t0 = performance.now();
  let champ = session.championId ? lookup(session.championId) : undefined;
  let type: Comparison['type'] = opts.next ?? (champ ? 'champion' : 'first');
  if (type === 'final') {
    const fresh = session.pendingFreshId ? lookup(session.pendingFreshId) : undefined;
    return champ && fresh ? { ok: true, a: champ, b: fresh } : { ok: false, conflicts: [!champ ? 'There is no favourite to compare against yet.' : 'There is no new winner waiting to face the favourite.'], relaxations: [] };
  }
  // a champion that no longer fits the locks or the welfare checks is never shown as a valid design: the pair is drawn afresh (two valid challengers), and the caller is told why
  if (type === 'champion' && champ) {
    const unmet = locksOf(project.tank).roster.filter(r => !rosterMet(champ!.snapshot, r)).map(r => `${r.species}: ${r.mode === 'exact' ? `exactly ${r.n}` : r.mode === 'atLeast' ? `at least ${r.n}` : 'the species stays'} is kept, the favourite has ${champ!.snapshot.fish.filter(f => f.species === r.species).length}`);
    const bad = [...lockViolations(project.tank, champ.snapshot).map(v => v.detail), ...unmet];
    if (bad.length) {
      // the favourite meets the new locks only after a NEW adapted record (the old one is never edited); when it cannot, it is replaced, never shown as valid
      const ad = adapt(champ, project, brief, { now, units: opts.units ?? 'in', P, sessionId: session.id });
      if (ad.ok) { opts.notes?.push(`Your favourite was adapted to your kept items: ${bad.slice(0, 3).join('; ')}.`); champ = ad.record; }
      else { opts.notes?.push(`Your favourite no longer fits: ${bad.slice(0, 3).join('; ')}. New designs are drawn instead.`); champ = undefined; type = 'first'; }
    } else {
      const v = verdictOf(champ.snapshot, brief, { units: opts.units ?? 'in' });
      if (!v.feasible) { opts.notes?.push(`Your favourite no longer fits: ${[...v.gates, ...v.hard].slice(0, 3).map(i => i.text).join('; ')}. New designs are drawn instead.`); champ = undefined; type = 'first'; }
    }
  }
  const scope = effectiveScope(project, session);
  if (!scope.length) return { ok: false, conflicts: ['Nothing is open to change: every menu is switched off or kept for now.'], relaxations: ['Switch a menu on, or release a kept menu'] };
  const { base, notes } = baselineOf(project, session, lookup), freezeNotes = session.freezes.map(f => `Release the kept ${f.tab} tab`);
  const pf = opts.prefs ?? readQuickPrefs(brief), w0 = customTankWants(brief, briefToWants(brief)), w = w0, br: Breadth = breadthOf(project.tank, session, lookup, scope, type);
  opts.breadth?.(br);
  const purpose: ProposalPurpose = type === 'fresh' ? 'fresh' : type === 'champion' ? (br.objective === 'refine' ? 'contrast' : 'challenger') : scope.length <= 2 ? 'contrast' : 'first';
  // the cache key holds EVERY input a candidate depends on: the project (its whole design, so locks, hard constraints, owned and Must-use gear, the Discovery switches), the brief, the scope and holds, the direction and the champion
  const sig = idOf(JSON.stringify([project.rev, session.id, scope, session.freezes, session.direction, type, type === 'first' ? '' : champ?.id, pf, brief, { ...project.tank, camera: undefined, render: undefined }]));
  const cache = opts.cache?.sig === sig ? opts.cache : opts.cache ? Object.assign(opts.cache, newCache(sig)) : (SHARED.get(sig) ?? (() => { if (SHARED.size >= 6) SHARED.delete(SHARED.keys().next().value!); const n = newCache(sig); SHARED.set(sig, n); return n; })());
  opts.notes?.push(...notes);
  const known = new Set<string>([...(opts.shownKeys ?? []), ...(champ?.key ? [champ.key] : [])]);
  // the champion as a design in the CURRENT project's terms: challengers are variations around it (nearer it as the session goes on)
  const champBase = type === 'champion' && champ ? confine(base, champ.snapshot, scope) : null;
  const champPending: Pending | undefined = champ ? ((): Pending | undefined => {
    const S = champ.snapshot, sc = scoreScene(S, brief, w, P, now);
    return { rec: champ, entry: { id: champ.id, key: champ.key ?? keyOf(S), fp: fingerprintOf(S, sc), features: featuresFor(S, sc) }, tokens: tokensOf(S), source: 'propose', world: '', sc };
  })() : undefined;
  const scoreW = weightsOf(aspectsOf(brief)), scoreOf = (p: Pending) => type === 'fresh' ? 0 : aspectScore(scoreW, p.entry.features) + prefOf(p);   // Something Different ignores learned taste
  const told = !!(pf.sizeGal || pf.floorSqIn || pf.heightIn || pf.plants || Object.keys(pf.look).length), tasteW = 0.1 + 0.25 * br.confidence + (told ? 0.4 : 0);     // a told preference ranks harder than a learned one
  const prefOf = (p: Pending): number => {   // ranking only (a 'prefer' answer never removes a candidate); a hard answer already filtered
    let v = 0; const S = p.rec.snapshot, g = p.rec.facts.gallons, n = S.items.filter(i => i.kind === 'plant').length, inR = (x: number, r: { lo: number; hi: number }) => x >= r.lo && x <= r.hi;
    if (pf.sizeGal && g != null) v += inR(g, pf.sizeGal.value) ? 0.5 : -0.2;
    if (pf.floorSqIn) v += inR(S.tank.L * S.tank.D / (25.4 * 25.4), pf.floorSqIn.value) ? 0.3 : -0.1;
    if (pf.heightIn) v += inR(S.tank.H / 25.4, pf.heightIn.value) ? 0.3 : -0.1;
    if (pf.plants?.strength === 'prefer') v += (pf.plants.value === 'live') === (n >= 6) ? 0.3 : -0.2;
    if ((pf.look.lush ?? 0) > 0) v += n >= 30 ? 0.2 * pf.look.lush! : 0;
    return v; };                                                                                             // learned taste narrows the RANKING, bounded; it never removes a candidate
  const usable = () => {
    const fresh = cache.pend.filter(p => !known.has(p.rec.key ?? '') && !(champPending && type !== 'fresh' && same(p, champPending)));
    const eligible = rankEligible(fresh.filter(p => p.sc.gate.verdict !== 'blocked').map(p => ({ ...p.entry, p })), aspectsOf(brief)).map(e => e.p);
    return eligible;
  };
  const want = type === 'champion' ? 3 : 4, soft = performance.now() + (opts.budgetMs ?? 2200), hard = performance.now() + 4 * (opts.budgetMs ?? 2200);
  const choose = (strict = false) => {
    const pool = usable();
    if (type === 'champion') { const ch = champPending && chooseChallenger(pool, champPending, targetDistance(br), scoreOf, br.objective === 'refine', strict, tasteW); return ch && champ ? { a: champ, b: ch.rec, pool: pool.length } : undefined; }
    const pr = choosePair(pool, type === 'fresh' ? 'fresh' : 'first', champPending, scoreOf, purpose === 'contrast', strict, tasteW); if (!pr) return undefined;
    const [x, y] = pr[0].rec.key! <= pr[1].rec.key! ? pr : [pr[1], pr[0]]; return { a: x.rec, b: y.rec, pool: pool.length };
  };
  // generate only as much as is needed: DX2's proposals on the baseline first (cheap), then one Explore look at a time while there is time and a whole habitat may be drawn
  const gen = champBase ?? base;
  const ctx: Ctx = { prefs: pf, ...(pf.prohibit.includes('co2') ? { noCo2: true } : {}), orig: gen, brief, w, P, units, now, scope, baseRev: project.rev, sessionId: session.id, purpose, ...(type === 'champion' && champ ? { parentId: champ.id } : {}), cache };
  const looks = habitatFree(base, scope) ? looksFor(ctx, session.direction, type, champ) : [];
  let result: { a: CandidateRecord; b: CandidateRecord; pool: number } | undefined;
  for (;;) {
    if (!cache.proposeDone) { fromPropose(ctx, gen, 10); cache.proposeDone = true; }
    else if (cache.looksDone.size < looks.length) fromLook(ctx, looks.find(a => !cache.looksDone.has(a.id))!, type === 'first' ? 1 : 3);   // size is a real variable: later pairs offer each look in 2-3 sizes, each with its own stocking
    else if (type === 'first' && cache.bigDone.size < looks.length) fromLook(ctx, looks.find(a => !cache.bigDone.has(a.id))!, 3);
    else if (cache.round < 3) { cache.round++; fromPropose(ctx, gen, 10); }
    else break;
    const usableN = usable().length, now2 = performance.now();
    // before the soft deadline an exploration pair must look different at a glance (another is drawn); after it, the best available pair is shown
    if (usableN >= want) { result = choose(now2 < soft); if (result) break; }
    if (now2 > soft && usableN >= 2) { result = choose(); if (result) break; }
    if (now2 > hard) break;
  }
  result ??= choose();
  cache.stats.ms = Math.max(cache.stats.ms, performance.now() - t0);
  if (result) { const out = { ok: true as const, a: result.a, b: result.b }; return out; }
  const few = usable().length;
  return noSolution(cache, [...notes, ...(few === 1 ? ['Only one design fits your locks and limits, so there is nothing to compare it with.'] : few === 0 && cache.pend.length ? ['Every design that fits has already been shown.'] : [])], [...freezeNotes, ...(locksOf(base).objects.some(o => o.target === 'tank') ? ['Unlock the tank for a larger one'] : [])]);
}

/** A NEW record (purpose 'adapted', parentId = the old one) of `record` fitted to the project as it is now: the current locks and limits hold, equipment is re-derived. The old record is never touched. */
export type AdaptResult = { ok: true; record: CandidateRecord; notes: string[] } | { ok: false; conflicts: string[]; relaxations: string[] };
export function adapt(record: CandidateRecord, project: PairProject, brief: Brief, opts: { now?: number; units?: Units; P?: UserProfile; sessionId?: string; scope?: Tab[] } = {}): AdaptResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), base = ensureUids(structuredClone(project.tank));
  seedLocked(base, undefined, undefined, []);
  const scope = opts.scope ?? discoverTabs(project.tank), cache = newCache('adapt'), w = customTankWants(brief, briefToWants(brief));
  const ctx: Ctx = { orig: base, brief, w, P, units, now, scope, baseRev: project.rev, sessionId: opts.sessionId ?? record.sessionId, purpose: 'adapted', parentId: record.id, cache };
  const got = ingest(ctx, ensureUids(structuredClone(record.snapshot)), record.facts.title, 'propose', { name: record.facts.title });
  if (!got) return noSolution(cache) as AdaptResult;
  const notes: string[] = [], was = JSON.stringify(record.snapshot.fish.map(f => f.species).sort()), now2 = JSON.stringify(got.rec.snapshot.fish.map(f => f.species).sort());
  if (was !== now2) notes.push('The animals changed to honour what you kept.');
  if (got.rec.key !== record.key) notes.push('The design was adjusted to fit your current locks and limits.');
  return { ok: true, record: got.rec, notes };
}

// ---------------------------------------------------------------------------------------------------------------- Combine (lane AB5)
export type CombineResult = { ok: true; record: CandidateRecord; notes: string[] } | { ok: false; conflicts: string[]; relaxations: string[] };
const TAB_WORD: Record<Tab, string> = { tank: 'tank', animals: 'animals', plants: 'plants', hardscape: 'hardscape', substrate: 'substrate' };
/** A NEW record (purpose 'adapted', parentId = `target`) that is `target` with `donor`'s `tab` in it. The same road as every candidate (locks, the welfare and Explore gates, equipPlan, facts), then, when the parts do not work together,
 *  the SMALLEST repair inside the combined tab only (fewer animals; plants the light cannot carry left out), said plainly; or an honest refusal with the reason. Neither original is touched; the project is never written; no lock is added.
 *  A tab the person switched off is never combined (`opts.scope` = the tabs Discovery may change; default the project's switches). */
export function combine(target: CandidateRecord, donor: CandidateRecord, tab: Tab, project: PairProject, brief: Brief, opts: { now?: number; units?: Units; P?: UserProfile; sessionId?: string; scope?: Tab[] } = {}): CombineResult {
  const now = opts.now ?? Date.now(), units = opts.units ?? 'in', P = opts.P ?? defaultProfile(), word = TAB_WORD[tab];
  const refuse = (c: string[], r: string[] = []): CombineResult => ({ ok: false, conflicts: c, relaxations: r });
  if (target.id === donor.id) return refuse(['Both are the same design.']);
  if (!(opts.scope ?? discoverTabs(project.tank)).includes(tab)) return refuse([`The ${word} tab is switched off for Discovery, so it is not combined.`], [`Switch the ${word} tab on`]);
  const base = ensureUids(structuredClone(project.tank)); seedLocked(base, undefined, undefined, []);
  const t0 = ensureUids(structuredClone(target.snapshot)); if (project.tank.locks) t0.locks = structuredClone(project.tank.locks); else delete t0.locks;
  const sp = splice(t0, donor.snapshot, tab);
  if (!sp) return refuse([`${donor.facts.title}'s ${word} cannot be placed in ${target.facts.title} (a piece would end up outside the tank).`]);
  const w = customTankWants(brief, briefToWants(brief)), sessionId = opts.sessionId ?? target.sessionId, name = `${target.facts.title} + new ${word}`;
  const fixed = new Set(locksOf(base).roster.map(r => r.species)), first: { rej: Rej[] }[] = [], steps: string[] = [];
  const attempt = (scene: TankSetup): Pending | null => {
    const cache = newCache('combine'), ctx: Ctx = { orig: base, brief, w, P, units, now, scope: [...TABS], baseRev: project.rev, sessionId, purpose: 'adapted', parentId: target.id, cache };
    const got = ingest(ctx, ensureUids(structuredClone(scene)), name, 'propose', { name }); first.push(cache); return got;
  };
  const done = (got: Pending): CombineResult => {
    if (got.rec.key === target.key) return refuse([`${donor.facts.title}'s ${word} is the same as the ${word} already in ${target.facts.title}, so nothing would change.`]);
    const rec: CandidateRecord = { ...got.rec, assumptions: [`Combined: ${donor.facts.title}'s ${word} in ${target.facts.title}.`, ...steps.map(s => `Adjusted to fit: ${s}.`), ...got.rec.assumptions] };
    return { ok: true, record: rec, notes: steps };
  };
  let scene = sp;
  // the combined plants may want more light than this design has: a stronger light (a purchase the gear then prices) is the first, smallest answer
  if (tab === 'plants' || tab === 'tank') { const L = strongerLight(scene); if (L) { scene = L.scene; steps.push(L.said); } }
  let got = attempt(scene);
  // a Must-use light too weak for the combined plants caps them (CO2 never makes up for light): the plants it cannot carry are left out rather than shown struggling. A light that is only owned, not required, is priced as new gear by equipPlan instead.
  if (got && got.sc.plan.capsPlants) { const sad = new Set(strugglingPlants(got.rec.snapshot)), d = sad.size ? dropPlants(got.rec.snapshot, sad) : null; if (d) { const g2 = attempt(d.scene); if (g2) { got = g2; scene = d.scene; steps.push(d.said); } } }
  if (got) return done(got);
  // the animals (or the room they now share) do not fit: the smallest trim of the animals that were combined in
  if (tab === 'animals' || tab === 'tank') for (let i = 0; i < 12; i++) {
    const tr = trimAnimals(scene, i, fixed); if (!tr) break;
    const g = attempt(tr.scene); if (g) { steps.push(tr.said); return done(g); }
  }
  const why = new Map<string, string>(), relax = new Set<string>();
  for (const c of first.slice(0, 1)) for (const r of c.rej) { for (const i of r.issues) why.set(i.id, i.text); for (const x of r.relax) relax.add(x); if (!r.issues.length) why.set(r.text, r.text); }
  const smallest = tab === 'animals' ? ['Take fewer of those animals, or use a bigger tank'] : tab === 'plants' ? ['Use plants that suit this light, or a stronger light'] : tab === 'tank' ? ['Keep this tank and take only the animals or plants'] : [];
  return refuse([`${donor.facts.title}'s ${word} does not work in ${target.facts.title}.`, ...[...why.values()].slice(0, 5)], [...new Set([...relax, ...smallest])].slice(0, 6));
}
