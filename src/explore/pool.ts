// Explore, stage X1 (lane OX3): the CANDIDATE POOL, stage A of the two-stage pipeline (spec section 7: generate and validate; rank and diversify is stage B, later).
// Candidates come from the VD registry (scene/archetypes.ts: the worlds and the looks, `buildable` ones only), each stocked with the same `stockingSuggestion` the Look First flow shows and sized from the
// catalogue, then run through the demand generator's own gates by `evaluateCandidate` (demand/suggest.ts) ON THE SCENE THAT WILL OPEN (the recipe's balanced scene), so a card's numbers describe exactly the
// scene the editor receives. The pool is PURE and renders nothing: a cheap screen on the bare build first (a firm limit already broken there cannot be saved by plants: they only add), the recipe scene
// only for what survives. Every candidate resolves to a real world and water; ponds, brackish (Q3) and coming-soon looks never enter.
import { catalogueSizes, fitIn, type AnimalCount } from '../scene/tankfit';
import { ARCHETYPES, type Archetype as VdArchetype, type Env, type Water } from '../scene/archetypes';
import { minTank, recipeBase, recipeLook } from '../scene/recipes';
import { buildsFor, type Build } from '../scene/builds';
import { spaceFit } from '../scene/space';
import { tankFromModel, type TankModel } from '../data/tanks';
import { evaluateCandidate, ownTankWhy, suggestSetups, type ConceptEval, type Infeasible, type Kind, type Wants } from '../demand/suggest';
import { explainInfeasible } from '../demand/infeasible';
import type { UserProfile } from '../demand/types';
import type { TankSetup, Units } from '../scene/types';
import { rosterPlan } from '../ui/discovery/animals';
import { estimateOf, type Estimate } from './estimate';
import { gateCandidate, type GateId, type GateVerdict, type Reason } from './gate';
import { SIZE_MULTIPLES } from './constants';

export interface Identity { world: Env; /** the water the enclosure holds: a terrarium is 'none' (land only); a paludarium resolves to freshwater */ water: Water | 'none'; familyId: string; archetypeId: string; name: string; tagline: string }
export interface Candidate {
  /** canonical configuration key (look | tank | roster): the same configuration is the same candidate (X2 hashes it into the stored id) */
  key: string;
  identity: Identity;
  archetype: VdArchetype;
  tank: TankModel;
  roster: AnimalCount[];
  /** how the roster was made (lane RC1): through the generator's own gates, one kind at a time under the strict welfare rule; `why` says why it holds fewer than 2 kinds */
  rosterSource?: { source: 'generator-gates'; kinds: number; why?: string };
  /** the build the scene stands on (`buildsFor(roster, tank)[2]`, the balanced build Look First hands over) */
  build: Build;
  /** the recipe's Balanced scene with this roster: what Make This Mine installs. A copy is safe to mutate. */
  scene: TankSetup;
  eval: ConceptEval;
  estimate: Estimate;
  verdict: GateVerdict;
  tankSource?: ConceptEval['tankSource']; tankNote?: string;
}
/** A look the pool turned away before it was a full candidate, and why (the "why nothing / fewer" explanation counts these). */
export interface Withheld { archetypeId: string; tankId?: string; name: string; reasons: Reason[] }
export type ControlledEdit =
  | { kind: 'adjust-limit'; limit: 'budget' | 'monthly' | 'care' | 'setup' | 'space' | 'size'; to?: number; text: string }
  | { kind: 'make-flexible'; limit: GateId; text: string }
  | { kind: 'change-required'; item: 'tank'; text: string }
  | { kind: 'broaden-world'; text: string };
export interface NoResult { blocker: GateId; text: string; edits: ControlledEdit[]; /** the generator's own explanation with verified one-click alternatives (mark-available / make-flexible / raise-budget ...) */ infeasible?: Infeasible }
export interface PoolStats { looks: number; tried: number; eligible: number; provisional: number; withheld: number; byGate: Partial<Record<GateId, number>>; ms: number }
export interface PoolResult { candidates: Candidate[]; eligible: Candidate[]; provisional: Candidate[]; withheld: Withheld[]; stats: PoolStats; noResult?: NoResult }
export interface PoolOptions { /** stocking per size tier (lane AB5): the roster for look `a` in `tank`, `tier` 0 = the smallest tried size; default `rosterPlan` */ stock?: (a: VdArchetype, tank: TankModel, tier: number) => ReturnType<typeof rosterPlan>; /** only these registry looks (tests, measurements); default every buildable look */ only?: readonly string[]; /** catalogue sizes tried per look (default the smallest plus one per SIZE_MULTIPLES; the Available tank is always one more) */ sizes?: number; /** skip the generator's verified alternatives when nothing is eligible (they take a second or two) */ explain?: boolean }

const KIND_OF = (a: VdArchetype): Kind => a.env === 'terrarium' ? 'terrarium' : a.env === 'paludarium' ? 'vivarium' : a.water === 'saltwater' ? 'saltwater' : 'freshwater';
export const isBuildable = (a: VdArchetype) => a.support !== 'coming-soon' && !!recipeLook(a);
const rosterKey = (r: AnimalCount[]) => r.map(x => `${x.species}${x.n}`).sort().join(',');
export const candidateKey = (a: VdArchetype, tank: TankModel, roster: AnimalCount[]) => `${a.id}|${tank.id}|${rosterKey(roster)}`;
export function identityOf(a: VdArchetype): Identity {
  const world = a.resolvesTo ?? a.env;
  return { world, water: world === 'terrarium' ? 'none' : a.water ?? 'freshwater', familyId: a.familyId, archetypeId: a.id, name: a.name, tagline: a.tagline };
}

/** The tanks tried for one look: the Required tank alone; else the smallest catalogue size that suits the look and the sizes nearest SIZE_MULTIPLES x it (within the space, length and size limits that are FIRM); plus the Available tank as one more. */
function tanksFor(a: VdArchetype, w: Wants, sizes: number): { tank: TankModel; avail?: true }[] {
  if (w.ownTank) return [{ tank: w.ownTank }];
  const firmSpace = w.constraints.space?.on === false || w.flexLimits?.space ? undefined : w.space, g = w.tankGal, min = minTank(a).ratedGal;
  const ok = (m: TankModel) => m.ratedGal >= min && (!firmSpace || spaceFit(tankFromModel(m), firmSpace).fits) && (!w.maxLengthMm || m.outer.L <= w.maxLengthMm)
    && (!g || ((g.min === undefined || m.ratedGal >= g.min) && (g.max === undefined || m.ratedGal <= g.max)));
  const all = catalogueSizes(a.env === 'terrarium').map(c => c.m).filter(ok), out: { tank: TankModel; avail?: true }[] = [];
  if (all.length) {
    const first = all[0], near = (target: number) => all.reduce((b, m) => Math.abs(m.ratedGal - target) < Math.abs(b.ratedGal - target) ? m : b, first);
    for (const m of [first, ...SIZE_MULTIPLES.map(k => near(first.ratedGal * k))].slice(0, sizes)) if (!out.some(o => o.tank.id === m.id)) out.push({ tank: m });
  }
  if (w.availTank && ok(w.availTank) && !out.some(o => o.tank.id === w.availTank!.id)) out.push({ tank: w.availTank, avail: true });
  return out;
}

const BUILDS = new Map<string, Build>();
/** The balanced build of this roster in this tank, remembered for ten minutes of prices (the same slot `recipeBase` fills). */
function balancedBuild(roster: AnimalCount[], tank: TankModel, now: number, owned: boolean): Build {
  const k = `${Math.floor(now / 600000)}|${owned}|${candidateKey({ id: '' } as VdArchetype, tank, roster)}`;
  // an owned tank cannot be part of a kit price (the generator never offers a bundle with it): its build is the balanced one made of parts
  let b = BUILDS.get(k); if (!b) { const all = buildsFor(roster, tank, now); b = all[2]; if (owned && b.bundle) b = all.find(x => !x.bundle) ?? b; if (BUILDS.size >= 300) BUILDS.delete(BUILDS.keys().next().value!); BUILDS.set(k, b); } return b;
}
const SCENES = new Map<string, { build: Build; scene: TankSetup } | null>();
function sceneOf(a: VdArchetype, tank: TankModel, roster: AnimalCount[], now: number): { build: Build; scene: TankSetup } | undefined {
  const k = `${Math.floor(now / 600000)}|${candidateKey(a, tank, roster)}`;
  if (!SCENES.has(k)) { const r = recipeBase(a, tank, roster, now); if (SCENES.size >= 120) SCENES.delete(SCENES.keys().next().value!); SCENES.set(k, r ? { build: r.build, scene: r.scenes.balanced } : null); }
  const hit = SCENES.get(k); return hit ? { build: hit.build, scene: structuredClone(hit.scene) } : undefined;
}

/** The whole pool for a brief's wants: every buildable look in every tried tank, gated. Deterministic (registry order, then size). */
export function explorePool(w: Wants, P: UserProfile, units: Units, now: number, opt: PoolOptions = {}): PoolResult {
  const t0 = performance.now(), candidates: Candidate[] = [], withheld: Withheld[] = [], byGate: PoolStats['byGate'] = {}, seen = new Set<string>();
  const kinds = w.kinds?.length ? w.kinds : undefined;
  const looks = ARCHETYPES.filter(a => isBuildable(a) && (!opt.only || opt.only.includes(a.id)) && (!kinds || kinds.includes(KIND_OF(a))));
  let tried = 0;
  const turn = (a: VdArchetype, tank: TankModel | undefined, reasons: Reason[]) => {
    withheld.push({ archetypeId: a.id, ...(tank ? { tankId: tank.id } : {}), name: a.name, reasons });
    for (const g of new Set(reasons.filter(r => r.severity === 'blocked').map(r => r.gate))) byGate[g] = (byGate[g] ?? 0) + 1;
  };
  for (const a of looks) {
    const id = identityOf(a);
    if (id.water === 'brackish') { turn(a, undefined, [{ gate: 'world', severity: 'blocked', text: 'No brackish animals are in the data yet, so a brackish setup cannot be stocked honestly.' }]); continue; }
    const tanks = tanksFor(a, w, opt.sizes ?? 1 + SIZE_MULTIPLES.length);
    if (!tanks.length) { turn(a, undefined, [{ gate: w.ownTank ? 'equipment' : 'size', severity: 'blocked', text: w.ownTank ? 'Your Required tank is too small for this look.' : 'No catalogue tank suits this look inside your size and space limits.' }]); continue; }
    for (const [ti, { tank, avail }] of tanks.entries()) {
      tried++;
      const plan = opt.stock ? opt.stock(a, tank, ti) : rosterPlan(a, tank), roster = plan.roster;   // `stock` (lane AB5): a caller's own stocking per size tier

      if (!roster.length) { turn(a, tank, [{ gate: 'welfare', severity: 'blocked', text: `${plan.why ?? 'No animals suit this look in this tank'}${/[.!]$/.test(plan.why ?? '') ? ' ' : '. '}A complete setup needs animals.` }]); continue; }
      if (avail && ownTankWhy(roster, w, w.constraints.space?.on === false ? undefined : w.space)) continue;   // the Available tank is one more option, never a failure
      const key = candidateKey(a, tank, roster); if (seen.has(key)) continue; seen.add(key);
      const holds = !fitIn(roster, tank)?.fails.length, owned = !!w.ownTank || w.availTank?.id === tank.id, bare = balancedBuild(roster, tank, now, owned);
      const run = (build: Build, scene?: TankSetup) => {
        const ev = evaluateCandidate(w, P, units, now, { animals: roster, tank, build, ...(scene ? { scene } : {}) }), est = estimateOf(ev, build, P, now);
        return { ev, est, verdict: gateCandidate({ w, ev, est, world: id.world, water: id.water === 'none' ? 'freshwater' : id.water, tank, roster, holds }) };
      };
      // cheap screen on the bare build: whatever a firm limit already rules out here (plants only add; a lower bound is the one thing a scene can still fix) is final
      const first = run(bare), final = first.verdict.reasons.filter(r => r.severity === 'blocked' && r.gate !== 'lower');
      if (final.length) { turn(a, tank, first.verdict.reasons); continue; }
      const made = sceneOf(a, tank, roster, now); if (!made) { turn(a, tank, [{ gate: 'welfare', severity: 'blocked', text: 'This look cannot be drawn in this tank.' }]); continue; }
      const mine = owned ? balancedBuild(roster, tank, now, true) : made.build, full = run(mine, made.scene);
      if (full.verdict.verdict === 'blocked') { turn(a, tank, full.verdict.reasons); continue; }
      candidates.push({ key, identity: id, archetype: a, tank, roster, rosterSource: { source: plan.source, kinds: plan.kinds, ...(plan.why ? { why: plan.why } : {}) }, build: mine, scene: full.ev.scene, eval: full.ev, estimate: full.est, verdict: full.verdict, ...(full.ev.tankSource ? { tankSource: full.ev.tankSource } : {}), ...(full.ev.tankNote ? { tankNote: full.ev.tankNote } : {}) });
    }
  }
  const eligible = candidates.filter(c => c.verdict.verdict === 'eligible'), provisional = candidates.filter(c => c.verdict.verdict === 'provisional');
  const stats: PoolStats = { looks: looks.length, tried, eligible: eligible.length, provisional: provisional.length, withheld: withheld.length, byGate, ms: Math.round(performance.now() - t0) };
  const out: PoolResult = { candidates, eligible, provisional, withheld, stats };
  if (!eligible.length) out.noResult = noResultOf(w, P, units, now, withheld, provisional, opt.explain !== false);
  return out;
}

/** Nothing eligible: the limiting gate (the one that turned away the most looks, ties by order), what it says, and the controlled edits that could change it. Never a fabricated candidate. */
export function noResultOf(w: Wants, P: UserProfile, units: Units, now: number, withheld: Withheld[], provisional: Candidate[], explain: boolean): NoResult {
  const tally = new Map<GateId, number>();
  for (const x of withheld) for (const g of new Set(x.reasons.filter(r => r.severity === 'blocked').map(r => r.gate))) tally.set(g, (tally.get(g) ?? 0) + 1);
  const order: GateId[] = ['equipment', 'budget', 'monthly', 'care', 'setup', 'space', 'size', 'lower', 'world', 'welfare'];
  const blocker = provisional.length && !tally.size ? 'welfare' as GateId : [...tally.entries()].sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))[0]?.[0] ?? 'welfare';
  const sample = withheld.find(x => x.reasons.some(r => r.gate === blocker && r.severity === 'blocked'))?.reasons.find(r => r.gate === blocker)?.text ?? 'Nothing passed every check.';
  const edits: ControlledEdit[] = [];
  const LIMIT: Partial<Record<GateId, 'budget' | 'monthly' | 'care' | 'setup' | 'space' | 'size'>> = { budget: 'budget', monthly: 'monthly', care: 'care', setup: 'setup', space: 'space', size: 'size' };
  const lim = LIMIT[blocker];
  if (lim) { edits.push({ kind: 'adjust-limit', limit: lim, text: `Adjust your ${lim === 'budget' ? 'set-up budget' : lim === 'monthly' ? 'monthly limit' : lim === 'care' ? 'care-time limit' : lim === 'setup' ? 'set-up time' : lim === 'space' ? 'space' : 'tank size range'}.` }); edits.push({ kind: 'make-flexible', limit: blocker, text: 'Make that limit flexible: it then ranks and warns instead of filtering.' }); }
  if (blocker === 'equipment' || w.ownTank) edits.push({ kind: 'change-required', item: 'tank', text: 'Mark your tank Available instead of Required, so a better-fitting tank can be recommended.' });
  edits.push({ kind: 'broaden-world', text: 'Broaden the kind of enclosure: other worlds have other costs and sizes.' });
  const infeasible = explain ? explainInfeasible({ w, misses: [], stats: { pool: 0, rejectedWelfare: 0, rejectedConstraint: withheld.length }, locked: false, space: w.space, P, units, now, run: x => suggestSetups(x, P, units, now) }) : undefined;
  return { blocker, text: sample, edits, ...(infeasible ? { infeasible } : {}) };
}
