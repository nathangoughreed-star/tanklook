// Discovery screen, pure part (lane DX4): everything the panel decides, with no DOM, so test/dx4.test.ts can drive it.
//   previewShot       one preview picture of a proposal: the live store shows the previewed tank for ONE draw and is put back, rev included
//   diffRows          the before / after lines of a card, by tab
//   dependencies      "these plants need this light" lines
//   applyCard         Apply (one undo step, never locks) / Apply and keep (the same step, plus a lock on exactly the applied items)
//   keepLocks         the "Keep this" toggles, written into the project's locks
//   rangeText         a Range3 as dollars
import { TABS, type Tab } from '../../scene/scope';
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
export const SECTION_OF: Record<string, string> = { tank: 'tank', animals: 'fish', plants: 'plants', hardscape: 'hardscape', substrate: 'substrate', equipment: 'equipment', brief: 'brief', tech: 'tech', water: 'water', room: 'room' };
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
  return TABS.filter(t => !allLocked(t));
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
