// Scoped, lock-aware Discovery engine (lane DX2; spec sections 2, 5, 9). Turns the existing generators into PROPOSAL PRODUCERS:
//   propose(project, brief, request, n)  ->  up to n Proposals (deltas against the project, never replacement scenes), ranked by verdictOf.
// Rules it keeps (spec invariants):
//   1  nothing outside the checked tabs changes     2  nothing locked changes (objects, props, roster floors)
//   4  the live store is never touched (every generator runs on a copy)    7  generators see the WHOLE tank, unchecked tabs included
//   9  a narrow objective gives a narrow delta       10 no solution = the blocking conflicts and the smallest relaxations, as text, never applied
// Each candidate: copy -> generator -> CONFINE (restore every unchecked tab, every lock, the brief, the viewer) -> deltaBetween -> checkProposal
// (belt and braces) -> verdictOf. A proposal never changes the brief's limits and never adds a lock; equipment / light / tech may change only as the
// supporting system a candidate needs, and every such change is listed in `gear` (accepting the proposal is what accepts the purchase).
import { diffTouches, TABS, type Tab } from './scope';
import { ITEM_PROPS, FISH_PROPS, TANK_PROPS, SUBSTRATE_KEYS, locksOf, type Violation } from './locks';
import { checkProposal, deltaBetween, type Proposal } from './proposal';
import { verdictOf, type Issue, type Verdict, type VerdictOpts } from './verdict';
import { ensureUids } from './uid';
import { layerOf, DEFAULT_DENS } from './items';
import { regenerate, shuffleHard } from './starter';
import { adaptToTank, handOff } from './reeval';
import { applySwap, type Swap } from '../demand/swaps';
import type { Brief } from './brief';
import type { Store } from './store';
import type { Fish, Item, TankSetup } from './types';

export type Objective = 'explore' | 'complete' | 'refine' | 'solve';
export type Region = 'back-left' | 'back' | 'back-right' | 'left' | 'center' | 'right' | 'front-left' | 'front' | 'front-right';
export interface Focus { tab: Tab; uids?: string[]; region?: Region; text?: string }
export interface DiscoveryRequest { scope: Tab[]; objective: Objective; focus?: Focus }
export interface DiscoveryOpts extends VerdictOpts {
  /** whole generated scenes from Explore (src/explore) to hand off as looks */
  explore?: TankSetup[];
  /** demand-engine swaps (src/demand/swaps.ts) to offer as candidates */
  swaps?: Swap[];
  /** variants per generator (default 4) */
  variants?: number;
  /** seed base (default: the layout seed) */
  seed?: number;
}
export interface DiscoveryProposal extends Proposal {
  source: string;
  /** the delta's own size (objects added + removed + changed + fields set) */
  size: number;
  /** supporting system changed (light, tech, tank product ...), each listed: accepting the proposal is what accepts the purchase */
  gear: string[];
  verdict: Verdict;
  /** the diversity axes */
  axes: { style: string; sizeClass: string; stocking: string; tech: string };
}
export interface NoSolution { conflicts: Issue[]; relaxations: string[] }
export interface Discovery { proposals: DiscoveryProposal[]; noSolution?: NoSolution }

const key = (o: Item | Fish) => o.uid ?? `id:${o.id}`;
const tabOfItem = (it: Item): Tab => (layerOf(it) === 'plant' ? 'plants' : 'hardscape');
/** keys of the TankSetup that are never design and never change in a proposal */
const FROZEN: (keyof TankSetup)[] = ['brief', 'locks', 'constraints', 'camera', 'render'];
const SUPPORT_NAMES: Record<string, string> = { light: 'light', tech: 'filtration / heating / CO2 / ferts', product: 'tank product', integrated: 'integrated kit', lid: 'lid', stand: 'stand', feeding: 'feeding', layout: '' };

// ---------------------------------------------------------------------------------------------------------------- regions
export function inRegion(x: number, depth: number, T: { L: number; D: number }, r: Region): boolean {
  const cx = x / (T.L || 1), cd = depth / (T.D || 1); // depth 0 = front glass
  const col = cx < 1 / 3 ? 'left' : cx > 2 / 3 ? 'right' : 'center', row = cd < 1 / 3 ? 'front' : cd > 2 / 3 ? 'back' : 'mid';
  const want = r.split('-'); // 'back-left' | 'back' | 'left' | 'center'
  return want.every(w => w === col || w === row || (w === 'center' && col === 'center' && row === 'mid') || (w === 'center' && want.length === 1 && col === 'center'));
}
const inFocus = (o: Item | Fish, f: Focus, T: { L: number; D: number }) => (!f.uids?.length || f.uids.includes(key(o))) && (!f.region || inRegion(o.x, o.depth, T, f.region));

// ---------------------------------------------------------------------------------------------------------------- confinement
function restoreProps(into: object, from: object, table: Record<string, readonly string[]>, groups?: readonly string[]) {
  for (const g of groups?.length ? groups : Object.keys(table)) for (const k of table[g] ?? []) {
    const v = (from as Record<string, unknown>)[k];
    if (v === undefined) delete (into as Record<string, unknown>)[k]; else (into as Record<string, unknown>)[k] = structuredClone(v);
  }
}

/** The candidate `w` made to obey the run: every unchecked tab, lock, the brief and the viewer come back from `orig`. null = the result cannot be made coherent (orphaned parent, out of the tank). */
export function confine(orig: TankSetup, w: TankSetup, scope: readonly Tab[]): TankSetup | null {
  const on = (t: Tab) => scope.includes(t), r = structuredClone(w), L = locksOf(orig);
  for (const k of FROZEN) { const v = orig[k]; if (v === undefined) delete r[k]; else (r as unknown as Record<string, unknown>)[k] = structuredClone(v); }
  if (!on('tank')) for (const k of Object.values(TANK_PROPS).flat()) { const v = orig[k]; if (v === undefined) delete r[k]; else (r as unknown as Record<string, unknown>)[k] = structuredClone(v); }
  if (!on('substrate')) for (const k of SUBSTRATE_KEYS) { const v = orig[k]; if (v === undefined) delete r[k]; else (r as unknown as Record<string, unknown>)[k] = structuredClone(v); }
  // items: the checked layers from the candidate, the rest from the original; a candidate id that collides with a kept one is renumbered (parents follow)
  const keep = orig.items.filter(it => !on(tabOfItem(it))), mine = r.items.filter(it => on(tabOfItem(it)));
  const used = new Set(keep.map(it => it.id)); let next = Math.max(0, ...orig.items.map(i => i.id), ...r.items.map(i => i.id)) + 1;
  const remap = new Map<number, number>();
  for (const it of mine) if (used.has(it.id)) { remap.set(it.id, next); it.id = next++; }
  for (const it of mine) if (it.parent !== undefined && remap.has(it.parent)) it.parent = remap.get(it.parent)!;
  r.items = [...keep.map(i => structuredClone(i)), ...mine];
  if (!on('animals')) { r.fish = structuredClone(orig.fish); if (orig.pairs) r.pairs = structuredClone(orig.pairs); else delete r.pairs; }
  // locks: held objects come back (whole, or just the held property groups); a roster floor is met from the original animals
  for (const o of L.objects) {
    if (o.target === 'tank' || o.target === 'substrate') continue; // handled by the tab restores above and by checkProposal
    for (const [list, table, from] of [[r.items, ITEM_PROPS, orig.items], [r.fish, FISH_PROPS, orig.fish]] as [(Item | Fish)[], Record<string, readonly string[]>, (Item | Fish)[]][]) {
      const was = from.find(x => key(x) === o.target); if (!was) continue;
      const now = list.find(x => key(x) === o.target);
      if (!now) { const c = structuredClone(was); if (list.some(x => x.id === c.id)) c.id = Math.max(0, ...list.map(x => x.id)) + 1; list.push(c as never); }
      else if (o.props?.length) restoreProps(now, was, table, o.props); else { const id = now.id; Object.assign(now, structuredClone(was)); now.id = id; }
    }
  }
  if (on('animals')) for (const lk of L.roster) {
    const was = orig.fish.filter(f => f.species === lk.species), now = r.fish.filter(f => f.species === lk.species);
    const ok = lk.mode === 'exact' ? now.length === lk.n : lk.mode === 'atLeast' ? now.length >= lk.n : now.length >= 1;
    if (ok || !was.length) continue;
    r.fish = [...r.fish.filter(f => f.species !== lk.species), ...structuredClone(was)];
    let id = 0; const seen = new Set<number>(); for (const f of r.fish) { if (seen.has(f.id)) f.id = Math.max(id, ...r.fish.map(x => x.id)) + 1; seen.add(f.id); id = Math.max(id, f.id); }
  }
  // coherent? every parent exists, every piece inside the tank
  const ids = new Set(r.items.map(i => i.id));
  if (r.items.some(i => i.parent !== undefined && !ids.has(i.parent))) return null;
  if (r.items.some(i => i.x < -1 || i.x > r.tank.L + 1 || i.depth < -1 || i.depth > r.tank.D + 1)) return null;
  if (r.fish.some(f => f.x < -1 || f.x > r.tank.L + 1 || f.depth < -1 || f.depth > r.tank.D + 1)) return null;
  return ensureUids(r);
}

/** Refine: only the focused tab / uids / region keeps the candidate's change; everything else goes back. */
function narrow(orig: TankSetup, c: TankSetup, f: Focus): TankSetup {
  const r = structuredClone(c), T = orig.tank;
  const pass = <O extends Item | Fish>(a: O[], b: O[], tabOf: (o: O) => Tab): O[] => {
    const A = new Map(a.map(o => [key(o), o])), B = new Map(b.map(o => [key(o), o])), out: O[] = [];
    const inTab = (o: O) => tabOf(o) === f.tab;
    for (const [k, was] of A) {
      const now = B.get(k), focused = inTab(was) && inFocus(was, f, T);
      out.push(focused ? now ?? (null as never) : was);
      if (out.at(-1) === null) out.pop();
    }
    for (const [k, now] of B) if (!A.has(k) && inTab(now) && !f.uids?.length && (!f.region || inRegion(now.x, now.depth, T, f.region))) out.push(now);
    return out;
  };
  r.items = pass(orig.items, c.items, tabOfItem);
  r.fish = pass(orig.fish, c.fish, () => 'animals');
  r.layout = structuredClone(orig.layout); // seeds and density stops are generator state, not part of a narrow change
  return r;
}

// ---------------------------------------------------------------------------------------------------------------- producers
interface Producer { id: string; family: string; needs: Tab[]; run(w: TankSetup, k: number, seed: number): boolean | void }
const nextFishId = (w: TankSetup) => Math.max(0, ...w.fish.map(f => f.id)) + 1;
const stops = (w: TankSetup) => ({ ...(w.layout.dens ?? DEFAULT_DENS) });
const clampStop = (n: number) => Math.max(0, Math.min(4, Math.round(n)));
const PRODUCERS: Producer[] = [
  { id: 'plants', family: 'regenerate', needs: ['plants'], run(w, k, seed) { const d = stops(w); d.plant = clampStop(d.plant + [0, 1, -1, 2][k % 4]); w.layout.dens = d; w.layout.plantSeed = seed; regenerate(w, 'plant', nextFishId(w)); } },
  { id: 'hardscape', family: 'regenerate', needs: ['hardscape'], run(w, k, seed) { const d = stops(w); d.hard = clampStop(d.hard + [0, 1, -1, 2][k % 4]); w.layout.dens = d; shuffleHard(w, seed); } },
  { id: 'animals', family: 'regenerate', needs: ['animals'], run(w, k, seed) { const d = stops(w); d.animal = clampStop([2, 3, 4, 1][k % 4]); w.layout.dens = d; w.layout.animalSeed = seed; regenerate(w, 'animal', nextFishId(w)); } },
  { id: 'look', family: 'regenerate', needs: ['hardscape', 'plants'], run(w, _k, seed) { shuffleHard(w, seed); w.layout.plantSeed = seed + 17; regenerate(w, 'plant', nextFishId(w)); } },
  { id: 'tank', family: 'adapt', needs: ['tank'], run(w, k) { const f = [1.25, 0.8, 1.5, 1.1][k % 4]; adaptToTank(w, { ...w.tank, L: Math.round(w.tank.L * f), ...(w.tank.shape && w.tank.shape !== 'rect' ? {} : {}) }, { thin: false }); } },
];

// ---------------------------------------------------------------------------------------------------------------- scoring + diversity
const sizeOf = (d: ReturnType<typeof deltaBetween>) => (d.items?.add?.length ?? 0) + (d.items?.remove?.length ?? 0) + (d.items?.change?.length ?? 0) + (d.fish?.add?.length ?? 0) + (d.fish?.remove?.length ?? 0) + (d.fish?.change?.length ?? 0) + Object.keys(d.set ?? {}).length;
const axesOf = (t: TankSetup): DiscoveryProposal['axes'] => {
  const litres = t.tank.L * t.tank.D * t.tank.H / 1e6, n = t.fish.length;
  return { style: t.layout.id, sizeClass: litres < 40 ? 'nano' : litres < 120 ? 'small' : litres < 300 ? 'medium' : 'large', stocking: n === 0 ? 'none' : n < 6 ? 'light' : n < 15 ? 'moderate' : 'busy', tech: JSON.stringify([t.light, t.tech ?? null]).length.toString(36) + (t.tech ? 't' : '') };
};
const distance = (a: DiscoveryProposal, b: DiscoveryProposal) => (Object.keys(a.axes) as (keyof DiscoveryProposal['axes'])[]).filter(k => a.axes[k] !== b.axes[k]).length + +(a.source !== b.source);
const score = (v: Verdict) => v.targets.length * 10 + v.advisories.length;
const idsOf = (v: Verdict) => new Set([...v.gates, ...v.hard].map(i => i.id));

function describe(p: { source: string; objective: Objective; touches: ReturnType<typeof diffTouches>; focus?: Focus }): string {
  const t = p.touches, bits: string[] = [];
  const n = (l: { added: string[]; removed: string[]; changed: Record<string, string[]> }) => [l.added.length && `+${l.added.length}`, l.removed.length && `-${l.removed.length}`, Object.keys(l.changed).length && `~${Object.keys(l.changed).length}`].filter(Boolean).join(' ');
  if (t.fish.added.length + t.fish.removed.length + Object.keys(t.fish.changed).length) bits.push(`animals ${n(t.fish)}`);
  if (t.items.added.length + t.items.removed.length + Object.keys(t.items.changed).length) bits.push(`${t.tabs.filter(x => x === 'plants' || x === 'hardscape').join(' and ')} ${n(t.items)}`);
  if (t.tank.length) bits.push(`tank ${t.tank.join(', ')}`);
  if (t.substrate) bits.push('substrate');
  return `${p.source}${p.focus?.text ? ` (${p.focus.text})` : ''}: ${bits.join('; ') || 'no design change'}.`;
}

// ---------------------------------------------------------------------------------------------------------------- the engine
/**
 * Up to `n` proposals for `project` (a Store, or a bare tank for tests). Pure: neither the store nor the tank moves (invariant 4).
 * editable = scope ∩ unlocked; a checked tab is a ceiling, not an obligation.
 */
export function propose(project: Store | TankSetup, brief: Brief, request: DiscoveryRequest, n = 3, opts: DiscoveryOpts = {}): Discovery {
  const isStore = (p: Store | TankSetup): p is Store => 'scene' in p && 'rev' in p;
  const orig = ensureUids(structuredClone(isStore(project) ? project.tank : project)), baseRev = isStore(project) ? project.rev : 0;
  const scope = TABS.filter(t => request.scope.includes(t) && (!request.focus || request.objective !== 'refine' || t === request.focus.tab));
  if (!scope.length) return { proposals: [] };
  const baseV = verdictOf(orig, brief, opts), baseIds = idsOf(baseV);
  const variants = opts.variants ?? 4, seed0 = opts.seed ?? orig.layout.seed;
  type Cand = { source: string; family: string; w: TankSetup };
  const cands: Cand[] = [];
  const make = (source: string, family: string, needs: Tab[], fn: (w: TankSetup) => void) => {
    if (!needs.some(t => scope.includes(t))) return;
    const w = structuredClone(orig); try { fn(w); } catch { return; } // a generator that cannot handle this tank yields no candidate
    cands.push({ source, family, w });
  };
  for (const P of PRODUCERS) {
    if (request.objective === 'refine' && request.focus && !P.needs.includes(request.focus.tab)) continue;
    for (let k = 0; k < (request.objective === 'refine' ? Math.min(variants, 2) : variants); k++) make(`${P.id} #${k + 1}`, P.family, P.needs, w => P.run(w, k, seed0 + 101 * (k + 1) + P.id.length * 7));
  }
  for (const [i, s] of (opts.swaps ?? []).entries()) make(`swap ${s.from} → ${s.to}`, 'swap', [s.kind === 'animal' || (s.kind === 'remove' && s.key.startsWith('animal')) ? 'animals' : 'plants'], w => { Object.assign(w, applySwap(w, s)); void i; });
  for (const [i, snap] of (opts.explore ?? []).entries()) make(`explore look ${i + 1}`, 'explore', ['hardscape', 'plants'], w => {
    const r = handOff(w, snap, { brief, accept: scope.includes('animals') ? snap.fish.map(f => f.species) : [] }); Object.assign(w, r.scene);
  });

  const accepted: DiscoveryProposal[] = [], rejected: { why: Violation[]; issues: Issue[]; text: string }[] = [], seen = new Set<string>();
  for (const c of cands) {
    let fin = confine(orig, c.w, scope);
    if (!fin) { rejected.push({ why: [], issues: [], text: `${c.source}: leaves a plant without its hardscape or a piece outside the tank` }); continue; }
    if (request.objective === 'refine' && request.focus) fin = narrow(orig, fin, request.focus);
    const delta = deltaBetween(orig, fin);
    if (!sizeOf(delta)) continue;
    // 'complete' only fills in: never removes or reshapes what is there
    if (request.objective === 'complete' && (delta.items?.remove?.length || delta.items?.change?.length || delta.fish?.remove?.length || delta.fish?.change?.length || delta.set?.tank)) continue;
    const p: Proposal = { baseRev, scope, delta, summary: '' };
    const chk = checkProposal(orig, p);
    if (!chk.ok) { rejected.push({ why: chk.violations, issues: [], text: `${c.source}: ${chk.outside.length ? `would change ${chk.outside.join(', ')}` : chk.violations.map(v => v.detail).join(' ')}` }); continue; }
    const v = verdictOf(chk.after, brief, opts), bad = [...v.gates, ...v.hard].filter(i => !baseIds.has(i.id));
    const sig = JSON.stringify(delta); if (seen.has(sig)) continue; seen.add(sig);
    if (bad.length || (request.objective === 'solve' && !v.feasible)) { rejected.push({ why: [], issues: bad.length ? bad : [...v.gates, ...v.hard], text: c.source }); continue; }
    if (request.objective === 'solve' && baseV.feasible) continue; // nothing to solve
    p.summary = describe({ source: c.source, objective: request.objective, touches: chk.touches, focus: request.focus });
    const gear = chk.touches.support.filter(k => !FROZEN.includes(k as never) && SUPPORT_NAMES[k] !== '').map(k => SUPPORT_NAMES[k] ?? k);
    accepted.push({ ...p, source: c.source, size: sizeOf(delta), gear: [...new Set(gear)], verdict: v, axes: axesOf(chk.after) });
  }

  // rank: verdict first, then (narrow objectives) the smallest delta; pick n that differ (diversity), explore / solve prefer spread
  const narrowObj = request.objective === 'refine' || request.objective === 'complete';
  accepted.sort((a, b) => score(a.verdict) - score(b.verdict) || (narrowObj ? a.size - b.size : 0) || a.size - b.size);
  const chosen: DiscoveryProposal[] = [];
  while (chosen.length < n && accepted.length) {
    let bi = 0, bd = -1;
    if (chosen.length) for (let i = 0; i < accepted.length; i++) { const d = Math.min(...chosen.map(c => distance(c, accepted[i]))); if (d > bd) { bd = d; bi = i; } if (!narrowObj && d >= 3) break; }
    if (chosen.length && bd < 1 && !narrowObj) break; // nothing meaningfully different left
    chosen.push(accepted.splice(bi, 1)[0]);
  }
  if (chosen.length) return { proposals: chosen };

  // nothing passes: say why and what the smallest relaxation is (invariant 10), never relax automatically
  if (!rejected.length) return { proposals: [] };
  const conflicts = new Map<string, Issue>(), relax = new Set<string>();
  for (const r of rejected) {
    for (const i of r.issues) { conflicts.set(i.id, i); relax.add(i.relax ?? `Relax: ${i.text}`); }
    for (const v of r.why) relax.add(v.kind === 'roster' ? `Lower the roster floor: ${v.detail}` : `Unlock "${v.target}": ${v.detail}`);
    if (!r.issues.length && !r.why.length) relax.add(`Add a tab to the scope: ${r.text}`);
  }
  for (const i of [...baseV.gates, ...baseV.hard]) if (request.objective === 'solve') { conflicts.set(i.id, i); if (i.relax) relax.add(i.relax); }
  return { proposals: [], noSolution: { conflicts: [...conflicts.values()], relaxations: [...relax] } };
}
