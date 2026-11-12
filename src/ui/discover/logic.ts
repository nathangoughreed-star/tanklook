// Discovery screen, pure part (lane DX4): everything the panel decides, with no DOM, so test/dx4.test.ts can drive it.
//   previewShot       one preview picture of a proposal: the live store shows the previewed tank for ONE draw and is put back, rev included
//   diffRows          the before / after lines of a card, by tab
//   dependencies      "these plants need this light" lines
//   applyCard         Apply (one undo step, never locks) / Apply and keep (the same step, plus a lock on exactly the applied items)
//   keepLocks         the "Keep this" toggles, written into the project's locks
//   rangeText         a Range3 as dollars
import { TABS, type Tab } from '../../scene/scope';
import { discoverTabs } from '../../scene/discoverScope';
import { checkProposal, previewProposal, type Proposal, type ApplyResult } from '../../scene/proposal';
import { lockObject, unlockObject, lockRoster, unlockRoster, locksOf, isLocked } from '../../scene/locks';
import { SUBSTRATE_KEYS } from '../../scene/locks';
import { newUid } from '../../scene/uid';
import { LIBRARY, layerOf } from '../../scene/items';
import { getSpecies } from '../../data/species';
import type { DiscoveryProposal, Objective } from '../../scene/discover';
import type { Range3 } from '../../demand/types';
import type { Fish, Item, RosterMode, TankSetup } from '../../scene/types';
import type { Store } from '../../scene/store';

export const TAB_LABEL: Record<Tab, string> = { tank: 'Tank', animals: 'Animals', plants: 'Plants', hardscape: 'Hardscape', substrate: 'Substrate' };
/** The left-panel section each tab (and each verdict issue tab) opens. */
export const SECTION_OF: Record<string, string> = { tank: 'tank', animals: 'fish', plants: 'plants', hardscape: 'hardscape', substrate: 'substrate', equipment: 'equipment', brief: 'brief', tech: 'equipment', water: 'fish', room: 'tank', quick: 'tank' };
export const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: 'explore', label: 'Explore', hint: 'Show me different directions' },
  { id: 'complete', label: 'Complete my tank', hint: 'Only fill in what is missing; nothing existing is removed' },
  { id: 'refine', label: 'Refine', hint: 'A small change to what I have' },
  { id: 'solve', label: 'Solve a problem', hint: 'Fix what the checks flag' },
];

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const to = (n: number, step: number) => Math.round(n / step) * step;
/** "$480 to $690" (or "about $480" when the spread is small); `unit` is appended to both ("a month"). */
export function rangeText(r: Range3, unit = '', step = 10): string {
  const lo = to(r.lo, step), hi = to(r.hi, step);
  return hi - lo < 2 * step ? `about ${usd(to(r.mode, step))}${unit}` : `${usd(lo)} to ${usd(hi)}${unit}`;
}

/** The tabs a fresh panel starts with: the contextual one, or every tab that has something unlocked (the global entry). */
export function defaultScope(tank: TankSetup, ctx?: Tab): Tab[] {
  if (ctx) return [ctx];
  const L = locksOf(tank), allLocked = (t: Tab) => (t === 'substrate' && L.objects.some(o => o.target === 'substrate')) || (t === 'tank' && L.objects.some(o => o.target === 'tank' && !o.props?.length));
  const on = discoverTabs(tank);   // DX7: the menu switches are the scope
  return TABS.filter(t => on.includes(t) && !allLocked(t));
}

/** One-line summary of what is kept: "Locked: 2 pieces, 3 species, the substrate". */
export function lockedSummary(tank: TankSetup): string {
  const L = locksOf(tank), uids = L.objects.filter(o => o.target !== 'tank' && o.target !== 'substrate');
  const itemUids = new Set(tank.items.map(i => i.uid)), fishUids = new Set(tank.fish.map(f => f.uid));
  const pieces = uids.filter(o => itemUids.has(o.target)).length, animals = uids.filter(o => fishUids.has(o.target)).length;
  const bits = [pieces && `${pieces} piece${pieces === 1 ? '' : 's'}`, animals && `${animals} animal${animals === 1 ? '' : 's'}`, L.roster.length && `${L.roster.length} species count${L.roster.length === 1 ? '' : 's'}`,
    L.objects.some(o => o.target === 'substrate') && 'the substrate', L.objects.some(o => o.target === 'tank') && 'the tank'].filter(Boolean);
  return bits.length ? `Locked (kept as it is): ${bits.join(', ')}.` : 'Nothing is locked: every checked tab may change.';
}

// ---------------------------------------------------------------------------------------------------------------- preview picture
/**
 * A picture of `tank` drawn through the live viewer: the store shows it for one `draw`, then the original is put back and the revision is
 * restored, so the project (and every proposal made against it) is exactly as it was. `draw` is the viewer's thumbnail; a throw still restores.
 */
export function previewShot(store: Store, tank: TankSetup, draw: () => string): string {
  const i = store.scene.active, orig = structuredClone(store.tank), rev = store.rev;
  const put = (S: TankSetup) => store.update(s => { s.tanks[i] = structuredClone(S); }, { history: false });
  try { put(tank); return draw(); } finally { put(orig); store.rev = rev; }
}

// ---------------------------------------------------------------------------------------------------------------- card text
const itemName = (it: Item) => LIBRARY[it.variant]?.label ?? it.variant;
const fishName = (f: Fish) => getSpecies(f.species)?.name ?? f.species;
const tally = (names: string[]) => { const m = new Map<string, number>(); for (const n of names) m.set(n, (m.get(n) ?? 0) + 1); return [...m].map(([n, k]) => k > 1 ? `${k} ${n}` : n).join(', '); };

export interface DiffRow { tab: Tab | 'gear'; verb: 'add' | 'remove' | 'change'; text: string }
/** What the proposal changes, by tab (computed against `tank`, the project it was made for). */
export function diffRows(tank: TankSetup, p: DiscoveryProposal): DiffRow[] {
  const after = previewProposal(tank, p), rows: DiffRow[] = [];
  const uidIn = (T: TankSetup) => ({ it: new Map(T.items.map(i => [i.uid, i])), fi: new Map(T.fish.map(f => [f.uid, f])) });
  const A = uidIn(tank), B = uidIn(after);
  const tabOf = (it: Item): Tab => layerOf(it) === 'plant' ? 'plants' : 'hardscape';
  const group = (tab: Tab, verb: DiffRow['verb'], names: string[]) => { if (names.length) rows.push({ tab, verb, text: tally(names) }); };
  for (const tab of ['animals', 'plants', 'hardscape'] as const) {
    const items = (T: Map<string | undefined, Item>) => [...T.values()].filter(i => tabOf(i) === tab);
    if (tab === 'animals') {
      group(tab, 'add', [...B.fi].filter(([u]) => !A.fi.has(u)).map(([, f]) => fishName(f)));
      group(tab, 'remove', [...A.fi].filter(([u]) => !B.fi.has(u)).map(([, f]) => fishName(f)));
      group(tab, 'change', [...B.fi].filter(([u, f]) => A.fi.has(u) && JSON.stringify({ ...A.fi.get(u)!, id: 0 }) !== JSON.stringify({ ...f, id: 0 })).map(([, f]) => fishName(f)));
    } else {
      group(tab, 'add', items(B.it).filter(i => !A.it.has(i.uid)).map(itemName));
      group(tab, 'remove', items(A.it).filter(i => !B.it.has(i.uid)).map(itemName));
      group(tab, 'change', items(B.it).filter(i => A.it.has(i.uid) && JSON.stringify({ ...A.it.get(i.uid)!, id: 0 }) !== JSON.stringify({ ...i, id: 0 })).map(itemName));
    }
  }
  if (SUBSTRATE_KEYS.some(k => JSON.stringify(tank[k]) !== JSON.stringify(after[k]))) rows.push({ tab: 'substrate', verb: 'change', text: 'Substrate, ground shape or patches' });
  if (JSON.stringify(tank.tank) !== JSON.stringify(after.tank)) rows.push({ tab: 'tank', verb: 'change', text: 'Tank size or shape' });
  for (const g of p.gear) rows.push({ tab: 'gear', verb: 'change', text: g });
  return rows;
}

/** "These plants need this light": the linked changes, said together. */
export function dependencies(tank: TankSetup, p: DiscoveryProposal): string[] {
  const rows = diffRows(tank, p), plants = rows.find(r => r.tab === 'plants' && r.verb === 'add')?.text, animals = rows.find(r => r.tab === 'animals' && r.verb === 'add')?.text;
  const out: string[] = [];
  if (p.gear.includes('light') && plants) out.push(`${plants} go with the new light.`);
  else if (p.gear.includes('light')) out.push('The light changes to suit the plants.');
  if (p.gear.some(g => g.startsWith('filtration')) && animals) out.push(`${animals} need the filtration / heating change.`);
  if (p.gear.includes('tank product') || p.gear.includes('integrated kit')) out.push('The tank product changes with it.');
  return out;
}

export const costLines = (p: DiscoveryProposal) => ({
  startup: p.cost.remaining.hi <= 0 ? 'Nothing more to buy' : rangeText(p.cost.remaining),
  monthly: rangeText(p.cost.monthly, ' a month', 1),
});

// ---------------------------------------------------------------------------------------------------------------- apply
/** The uids a proposal adds or changes (what "Apply and keep" locks), plus whether it set the substrate or the tank. */
export function appliedTargets(p: Proposal): { uids: string[]; substrate: boolean; tank: boolean } {
  const d = p.delta, uids = [...(d.items?.add ?? []), ...(d.fish?.add ?? [])].map(o => o.uid!).filter(Boolean).concat([...(d.items?.change ?? []), ...(d.fish?.change ?? [])].map(c => c.uid));
  return { uids: [...new Set(uids)], substrate: !!d.set && SUBSTRATE_KEYS.some(k => k in d.set!), tank: !!d.set?.tank };
}
/** A copy of `p` whose added objects all carry a uid (so Apply and keep can name them). */
export function withUids(p: DiscoveryProposal): DiscoveryProposal {
  const q = structuredClone(p);
  for (const o of [...(q.delta.items?.add ?? []), ...(q.delta.fish?.add ?? [])]) o.uid ??= newUid(layerOrFish(o));
  return q;
}
const layerOrFish = (o: Item | Fish) => 'species' in o ? 'f' : 'i';

/**
 * Apply a card. Refuses a stale proposal (the project moved since it was made: the caller shows the conflict and offers Refresh), one outside its scope,
 * or one that breaks a lock; nothing changes then. One undo step. `keep` adds locks for exactly the applied objects in the SAME step; plain Apply never locks.
 */
export function applyCard(store: Store, p0: DiscoveryProposal, keep: boolean): ApplyResult {
  const p = withUids(p0);
  if (p.baseRev !== store.rev) return { ok: false, reason: 'stale', baseRev: p.baseRev, currentRev: store.rev };
  const c = checkProposal(store.tank, p);
  if (!c.ok) return { ok: false, reason: c.violations.length ? 'locks' : 'scope', outside: c.outside, violations: c.violations };
  const t = appliedTargets(p), i = store.scene.active;
  store.seal();
  store.update(s => {
    const A = c.after;
    if (keep) { for (const u of t.uids) lockObject(A, u); if (t.substrate) lockObject(A, 'substrate'); if (t.tank) lockObject(A, 'tank', ['dimensions']); }
    s.tanks[i] = A;
  });
  store.seal();
  return { ok: true, touches: c.touches };
}

// ---------------------------------------------------------------------------------------------------------------- "Keep this"
export type FishKeep = 'none' | RosterMode;
/** The keep mode a species row shows. */
export const fishKeepOf = (tank: TankSetup, species: string): FishKeep => locksOf(tank).roster.find(r => r.species === species)?.mode ?? 'none';
export const FISH_KEEP_LABEL: Record<FishKeep, string> = { none: 'Not kept', exact: 'Keep exact', atLeast: 'Keep at least', speciesOnly: 'Keep species' };
/** Lock or unlock a piece / the substrate / the tank (locks bind discovery only; no undo step, a lock is not a design edit). */
export function setKeep(store: Store, target: string, on: boolean) {
  store.update(s => { const t = s.tanks[s.active]; if (on) lockObject(t, target); else unlockObject(t, target); }, { history: false });
}
/** Set a species row's mode with the count it has now. */
export function setFishKeep(store: Store, species: string, mode: FishKeep) {
  store.update(s => {
    const t = s.tanks[s.active];
    if (mode === 'none') unlockRoster(t, species); else lockRoster(t, species, mode, t.fish.filter(f => f.species === species).length || 1);
  }, { history: false });
}
export const keptItem = (tank: TankSetup, it: Item) => !!it.uid && isLocked(tank, it.uid);

// ---------------------------------------------------------------------------------------------------------------- DQ10: Discover inside the editor (the preview controller; no DOM)
// A preview is a candidate shown THROUGH the live viewer (the caller's `show`), never written to the design and never freezing the store.
//   run('finish' | 'fill' | 'regen')   generate; the result replaces the preview and the one it replaced goes to the back list (D8)
//   apply()                            applyProposal, ONE undo step; a stale preview is refused, nothing changes
//   onChange()                         call on every store change: a preview whose revision no longer matches is marked stale and its picture is dropped
//   relax(r)                           one "smallest change" from a no-fit result, applied alone, then the same request is re-run (D9)
import { nextCandidates, finishSetup, gapsOf, type CandidateResult, type CandidateOpts } from '../../scene/candidates';
import { applyProposal, deltaBetween } from '../../scene/proposal';
import { setDiscoverTab } from '../../scene/discoverScope';
import { newCache, type PairCache } from '../../scene/pairGen';
import type { Brief } from '../../scene/brief';
import type { CandidateRecord } from '../../scene/discoveryTypes';

import { discoverGates, type DiscoverGates } from '../../scene/rules';
import { rulesOf, type Rules } from '../../scene/brief';
import { PRESET_INFO, inferPreset, type Preset } from '../../scene/breadth';
import { volume } from '../../scene/physics';
import type { PoolMetrics } from '../../scene/pairGen';
export { discoverGates };   // DQ12: the real DQ9 gate set (scene/rules.ts); the generator reads it through the brief's rules (candidates.ts -> pairGen.ingest / discover.propose)

export type InlineKind = 'finish' | 'fill' | 'regen';
export interface Preview {
  /** DQ12: how many designs fit (this one, the ones already shown and the ones still to come); a lower bound, the search is time-boxed */
  fit: number;
  id: number; kind: InlineKind; tab?: Tab; rec: CandidateRecord; baseRev: number; proposal: Proposal; rows: DiffRow[]; after: TankSetup; title: string; stale: boolean;
}
/** A smallest-change button from a no-fit result: `label` is the generator's text, `act` the edit it stands for (undefined: said, not applied). */
export interface Relax { label: string; act?: 'unlockTank' | 'switchOn' | 'alternatives' | 'release'; tab?: Tab; /** 'release': the kept animal (uid) or species row it stops keeping */ target?: string; species?: string }
export type RunResult =
  | { ok: true; preview: Preview }
  | { ok: false; conflicts: string[]; relaxations: Relax[]; nothingMissing?: boolean; needsChange?: boolean; /** DQ12: every design that fits was already shown (not a conflict) */ exhausted?: boolean; /** DQ12: what is kept, in words ("the tank (20 gal), 1 Oscar") */ kept?: string };

export interface Counts { kept: number; open: number }
/** "3 kept, 12 open": pieces and animals Discover may not / may change, within the checked tabs (D2). The tank and the substrate count as one each. */
export function openCounts(tank: TankSetup, tankFree = true): Counts {
  const on = new Set(discoverTabs(tank)), L = locksOf(tank);
  let kept = 0, open = 0;
  for (const it of tank.items) { const tab: Tab = layerOf(it) === 'plant' ? 'plants' : 'hardscape'; if (it.uid && isLocked(tank, it.uid)) kept++; else if (on.has(tab)) open++; }
  for (const f of tank.fish) { if ((f.uid && isLocked(tank, f.uid)) || L.roster.some(r => r.species === f.species)) kept++; else if (on.has('animals')) open++; }
  for (const t of ['substrate', 'tank'] as const) { if (L.objects.some(o => o.target === t) || (t === 'tank' && !tankFree && on.has(t))) kept++; else if (on.has(t)) open++; }
  return { kept, open };
}
export const countText = (c: Counts) => `${c.kept} kept, ${c.open} open`;

/** The tabs of the checked ones that have nothing in them (what "Fill this section" can fill). */
export const gapTabs = (tank: TankSetup): Tab[] => (['hardscape', 'plants', 'animals', 'substrate'] as const).filter(t => gapsOf(tank, [t]).length);

export function relaxOf(text: string, tank: TankSetup): Relax {
  const off = TABS.find(t => !discoverTabs(tank).includes(t));
  if (/unlock the tank/i.test(text)) return { label: text, act: 'unlockTank' };
  if (/switch a menu on/i.test(text) && off) return { label: `Switch ${TAB_LABEL[off]} on for Discover`, act: 'switchOn', tab: off };
  if (/show alternatives/i.test(text)) return { label: text, act: 'alternatives' };
  return { label: text };
}

/** "the tank (20 gal), 1 Oscar, the substrate": what the person kept, for the conflict card (the tank counts as kept unless it was unlocked). */
export function keptWords(tank: TankSetup, tankKept: boolean): string {
  const L = locksOf(tank), bits: string[] = [];
  if (tankKept) bits.push(`the tank (${Math.round(volume(tank.tank).gallons)} gal)`);
  const names = [...tank.fish.filter(f => f.uid && isLocked(tank, f.uid) && !L.roster.some(r => r.species === f.species)).map(fishName), ...L.roster.map(r => `${r.n} ${getSpecies(r.species)?.name ?? r.species}`)];
  if (names.length) bits.push(tally(names));
  const pieces = tank.items.filter(i => i.uid && isLocked(tank, i.uid)).length; if (pieces) bits.push(`${pieces} piece${pieces === 1 ? '' : 's'}`);
  if (L.objects.some(o => o.target === 'substrate')) bits.push('the substrate');
  return bits.join(', ');
}
/** One "stop keeping" button per kept animal / species row (at most 4): the next smallest thing to give up after the tank. */
export function releasable(tank: TankSetup): Relax[] {
  const L = locksOf(tank), out: Relax[] = [];
  for (const r of L.roster) out.push({ label: `Stop keeping the ${getSpecies(r.species)?.name ?? r.species}`, act: 'release', species: r.species });
  for (const f of tank.fish) if (f.uid && isLocked(tank, f.uid) && !L.roster.some(r => r.species === f.species)) out.push({ label: `Stop keeping the ${fishName(f)}`, act: 'release', target: f.uid });
  return out.slice(0, 4);
}

export interface InlineDeps { brief: () => Brief; show: (tank: TankSetup | null) => void; opts?: CandidateOpts; backMax?: number }
export type InlineApply = ApplyResult | { ok: false; reason: 'none' | 'stale' };
export interface InlineController {
  current(): Preview | undefined; back(): Preview[]; counts(): Counts;
  /** DQ12: the tank is kept unless unlocked (Nathan 2026-11-12); `unlockTank` also releases a tank lock */
  tankKept(): boolean; unlockTank(): void; keepTank(): void;
  /** DQ12: the breadth preset (the starting one is inferred from what is kept; a pick sticks for the session) and the rule set the run follows */
  preset(): Preset; setPreset(p: Preset): void; picked(): boolean; gates(): DiscoverGates & { rules: Rules };
  run(kind: InlineKind, tab?: Tab): RunResult;
  regenerate(): RunResult | undefined;
  showBack(i: number): boolean;
  apply(): InlineApply;
  relax(r: Relax): RunResult | undefined;
  onChange(): void;
  close(): void;
}

export function createInline(store: Store, d: InlineDeps): InlineController {
  let tankFree = false, pick: Preset | undefined;
  let cur: Preview | undefined, last: { kind: InlineKind; tab?: Tab } | undefined, seq = 0;
  const cache: PairCache = newCache(''), back: Preview[] = [], seen = new Set<string>(), backMax = d.backMax ?? 4;
  const toPreview = (kind: InlineKind, tab: Tab | undefined, rec: CandidateRecord, baseRev: number, fit: number): Preview => {
    const tank = store.tank, delta = deltaBetween(tank, rec.snapshot);
    // a design never carries the project's own settings: locks, brief, constraints, camera and render stay as they are
    if (delta.set) { for (const k of ['locks', 'brief', 'constraints', 'camera', 'render', 'discoverOn']) delete (delta.set as Record<string, unknown>)[k]; if (!Object.keys(delta.set).length) delete delta.set; }
    const proposal: Proposal = { baseRev, scope: [...TABS], delta, summary: rec.facts.title };
    const after = previewProposal(tank, proposal), gear = delta.set ? Object.keys(delta.set).filter(k => !['tank', 'substrate', 'terrain', 'patches'].includes(k)) : [];
    const rows = diffRows(tank, { ...proposal, gear: [] } as unknown as DiscoveryProposal);
    return { fit, id: ++seq, kind, ...(tab ? { tab } : {}), rec, baseRev, proposal, rows: gear.length ? [...rows, { tab: 'gear', verb: 'change', text: 'Equipment and settings that go with it' }] : rows, after, title: rec.facts.title, stale: false };
  };
  const tankKept = () => !tankFree || locksOf(store.effTank).objects.some(o => o.target === 'tank');
  const counts = () => openCounts(store.effTank, !tankKept());
  const presetNow = (): Preset => pick ?? inferPreset(counts().kept, counts().open);
  const fail = (r: Extract<CandidateResult, { ok: false }>): RunResult => {
    const tank = store.effTank, rel = r.relaxations.map(t => relaxOf(t, tank)), k = keptWords(tank, tankKept());
    // D9: every kept thing that stands in the way is its own button (applied alone, then the request re-runs), never a bundle
    if (!r.nothingMissing && discoverTabs(tank).includes('tank') && tankKept() && !rel.some(x => x.act === 'unlockTank')) rel.push({ label: 'Let Discover change the tank (it is kept now)', act: 'unlockTank' });
    if (!r.nothingMissing) rel.push(...releasable(tank));
    return { ok: false, conflicts: r.conflicts, relaxations: rel, ...(k ? { kept: k } : {}), ...(r.nothingMissing ? { nothingMissing: true } : {}), ...(r.needsChange ? { needsChange: true } : {}) };
  };
  const put = (p: Preview) => { if (cur) { back.unshift(cur); back.length = Math.min(back.length, backMax); } cur = p; if (p.rec.key) seen.add(p.rec.key); d.show(p.after); };

  const ctl: InlineController = {
    current: () => cur, back: () => back, counts,
    tankKept, unlockTank() { tankFree = true; store.update(s => { unlockObject(s.tanks[s.active], 'tank'); }, { history: false }); }, keepTank() { tankFree = false; },
    preset: presetNow, setPreset(p) { pick = p; }, picked: () => !!pick, gates: () => ({ ...discoverGates(rulesOf(d.brief())), rules: rulesOf(d.brief()) }),
    run(kind, tab) {
      if (store.frozen) return { ok: false, conflicts: ['The A/B comparison is open: close it first.'], relaxations: [] };
      const project = { tank: store.effTank, rev: store.rev }, opts: CandidateOpts = { units: store.scene.units, ...(d.opts ?? {}), shownKeys: [...seen], cache };
      const t = kind === 'fill' ? tab ?? gapTabs(project.tank)[0] : undefined;
      if (kind === 'fill' && !t) return { ok: false, conflicts: ['Nothing is missing in the open menus: there is no gap to fill.'], relaxations: [], nothingMissing: true };
      last = { kind, ...(t ? { tab: t } : {}) };
      let pooled = 0; const ask = (o: CandidateOpts) => t ? finishSetup(project, d.brief(), { scope: [t], n: 1 }, o)
        : nextCandidates(project, d.brief(), { objective: PRESET_INFO[presetNow()].objective, breadth: PRESET_INFO[presetNow()].breadth, tankFixed: tankKept(), n: 1 }, o);
      let r = ask({ ...opts, metrics: m => { pooled = (m as PoolMetrics).pooled; } });
      if (!r.ok && seen.size) {   // nothing NEW: either every design that fits has been shown, or nothing fits at all
        const all = ask({ ...opts, shownKeys: [] });
        if (all.ok) return { ok: false, conflicts: [`Only ${seen.size === 1 ? 'that one design fits' : `${seen.size} designs fit`}, and you have seen ${seen.size === 1 ? 'it' : 'them all'}. Try another preset, or change what is kept.`], relaxations: [], exhausted: true };
        r = all;
      }
      if (!r.ok) return fail(r);
      const p = toPreview(kind, t, r.candidates[0], project.rev, pooled + seen.size);
      put(p); return { ok: true, preview: p };
    },
    regenerate() { return last ? ctl.run(last.kind === 'fill' ? 'fill' : 'regen', last.tab) : undefined; },
    showBack(i) {
      const p = back[i]; if (!p || p.stale || p.baseRev !== store.rev) return false;
      back.splice(i, 1); if (cur) back.unshift(cur); cur = p; d.show(p.after); return true;
    },
    apply() {
      if (!cur) return { ok: false, reason: 'none' };
      if (cur.stale || cur.baseRev !== store.rev) { cur.stale = true; d.show(null); return { ok: false, reason: 'stale' }; }
      const r = applyProposal(store, cur.proposal);
      if (r.ok) { d.show(null); back.length = 0; cur = undefined; seen.clear(); }
      return r;
    },
    relax(r) {
      if (r.act === 'unlockTank') ctl.unlockTank();
      else if (r.act === 'release') store.update(s => { const t = s.tanks[s.active]; if (r.target) unlockObject(t, r.target); if (r.species) unlockRoster(t, r.species); }, { history: false });
      else if (r.act === 'switchOn' && r.tab) store.update(s => { setDiscoverTab(s.tanks[s.active], r.tab!, true); }, { history: false });
      else if (r.act !== 'alternatives') return undefined;
      return last ? ctl.run(r.act === 'alternatives' ? 'regen' : last.kind, last.tab) : undefined;
    },
    onChange() {
      if (cur && !cur.stale && cur.baseRev !== store.rev) { cur.stale = true; d.show(null); }
      for (const p of back) if (p.baseRev !== store.rev) p.stale = true;
    },
    close() { d.show(null); cur = undefined; back.length = 0; seen.clear(); },
  };
  return ctl;
}
