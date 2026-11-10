// The A/B screen, pure part (lane AB3): everything the screen decides, with no DOM, so test/ab3.test.ts can drive it.
//   figText / metricsOf    "about $120" style figures (estimates read "about"; new spend leads)
//   roleOf / bannerOf      "Your favourite" vs "Challenger", the fresh-pair line
//   differs                what one card has that the other does not
//   freezeNote             "Hardscape: kept from A"
//   keepFromRecord         Keep / Lock from a card: exact by default for animals; the ONLY write besides Make It Yours
//   championConflicts      does the favourite still honour the project's locks (after a Keep)?
//   makePlan / acceptPlan  Make It Yours: preview diff, conflicts, then applyProposal (one undo step, never locks)
//   adaptToLocks           a design that honours the current locks, or a refusal (the record it came from is never touched)
import { TABS, type Tab } from '../../scene/scope';
import { SUBSTRATE_KEYS, HARDSCAPE_KEYS, lockObject, lockRoster, unlockObject, unlockRoster, lockViolations, locksOf, isLocked, gearPart, type GearLock } from '../../scene/locks';
import { foreignPieces, type AttrLock } from '../../scene/attrs';
import { applyProposal, checkProposal, deltaBetween, type Proposal } from '../../scene/proposal';
import { ensureUids, newUid } from '../../scene/uid';
import { getSpecies } from '../../data/species';
import { diffRows, TAB_LABEL, type DiffRow } from '../discover/logic';
import type { DiscoveryProposal } from '../../scene/discover';
import type { CandidateFacts, CandidateRecord, DiscoverySession, Figure, ReasonKey } from '../../scene/discoveryTypes';
import type { Store } from '../../scene/store';
import type { Fish, RosterMode, TankSetup } from '../../scene/types';

// ---------------------------------------------------------------------------------------------------------------- figures
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const round = (n: number, step: number) => Math.round(n / step) * step;
/** "about $120" / "$80 to $140" (a wide estimate shows its range; any estimate says "about"). */
export function figText(f: Figure, o: { kind: 'usd' | 'min'; unit?: string } = { kind: 'usd' }): string {
  const fmt = (n: number) => o.kind === 'usd' ? usd(round(n, n >= 200 ? 10 : 5)) : `${Math.round(round(n, 5))} min`;
  const u = o.unit ? ' ' + o.unit : '';
  if (o.kind === 'usd' && f.hi <= 0.5) return 'nothing more to buy';
  const spread = f.hi - f.lo > Math.max(0.25 * f.mean, o.kind === 'usd' ? 20 : 10);
  if (spread && o.kind === 'min') return `about ${Math.round(round(f.lo, 5))} to ${fmt(f.hi)}${u}`;
  return spread ? `${f.est ? 'about ' : ''}${fmt(f.lo)} to ${fmt(f.hi)}${u}` : `${f.est || o.kind === 'min' ? 'about ' : ''}${fmt(f.mean)}${u}`;
}
export interface Metrics { spend: string; upkeep: string; minutes: string; difficulty: string }
export function metricsOf(f: CandidateFacts): Metrics {
  return { spend: figText(f.newSpendUsd), upkeep: f.monthlyUsd ? figText(f.monthlyUsd, { kind: 'usd', unit: 'a month' }) : '', minutes: figText(f.weeklyMin, { kind: 'min', unit: 'a week' }), difficulty: f.difficulty };
}
/** The one-line strip the 375 px layout keeps visible for both cards. */
export const stripText = (f: CandidateFacts) => { const m = metricsOf(f); return `${m.spend} · ${m.minutes.replace(' a week', '/wk')} · ${m.difficulty}`; };

// ---------------------------------------------------------------------------------------------------------------- labels
export type Role = 'favourite' | 'challenger' | 'fresh' | 'first';
export function roleOf(s: DiscoverySession, id: string): Role {
  const t = s.current?.type;
  if (s.championId === id) return 'favourite';
  if (t === 'fresh') return 'fresh';
  if (t === 'final' || t === 'champion') return 'challenger';
  return 'first';
}
export const ROLE_LABEL: Record<Role, string> = { favourite: 'Your favourite', challenger: 'Challenger', fresh: 'Fresh idea', first: 'First pair' };
export function bannerOf(s: DiscoverySession): string {
  const t = s.current?.type;
  if (t === 'fresh') return s.championId ? 'Fresh pair: the winner then faces your favourite.' : 'Fresh pair: pick the one you like more.';
  if (t === 'final') return 'Fresh winner against your favourite: this decides the favourite.';
  if (t === 'champion') return 'Your favourite against a new challenger.';
  return 'Which one would you rather live with?';
}
export const REASONS: { key: ReasonKey; label: string }[] = [
  { key: 'animals', label: 'Animals' }, { key: 'plants', label: 'Plants' }, { key: 'hardscape', label: 'Hardscape' }, { key: 'substrate', label: 'Substrate' }, { key: 'tank', label: 'Tank size' },
  { key: 'look', label: 'Overall look' }, { key: 'upfront', label: 'Upfront cost' }, { key: 'ongoing', label: 'Ongoing cost' }, { key: 'maintenance', label: 'Maintenance' }, { key: 'difficulty', label: 'Difficulty' },
];
export const toggleReason = (list: ReasonKey[], k: ReasonKey): ReasonKey[] => list.includes(k) ? list.filter(x => x !== k) : [...list, k];

// ---------------------------------------------------------------------------------------------------------------- what differs
const only = (a: string[], b: string[]) => a.filter(x => !b.includes(x));
export interface Differs { tab: Tab; text: string }
/** What `mine` has that `other` does not, by tab (the quick sheet's "what differs from the other card"). */
export function differs(mine: CandidateFacts, other: CandidateFacts): Differs[] {
  const out: Differs[] = [];
  const sp = only(mine.stocking.map(s => s.name), other.stocking.map(s => s.name)); if (sp.length) out.push({ tab: 'animals', text: sp.join(', ') });
  const pl = only(mine.plants, other.plants); if (pl.length) out.push({ tab: 'plants', text: pl.join(', ') });
  const hs = only(mine.hardscape, other.hardscape); if (hs.length) out.push({ tab: 'hardscape', text: hs.join(', ') });
  const sb = only(mine.substrate, other.substrate); if (sb.length) out.push({ tab: 'substrate', text: sb.join(', ') });
  if (mine.gallons !== other.gallons) out.push({ tab: 'tank', text: mine.gallons == null ? 'a dry build' : `${mine.gallons} gal` });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- freezes
export const nameOfSource = (s: DiscoverySession, id: string, a?: string, b?: string): string =>
  id === 'working' ? 'your project' : id === a ? 'A' : id === b ? 'B' : id === s.championId ? 'your favourite' : 'an earlier idea';
/** "Hardscape: kept from A" for a frozen tab, else '' (the tab is free to change). */
export function freezeNote(s: DiscoverySession, tab: Tab, a?: string, b?: string): string {
  const f = s.freezes.find(x => x.tab === tab); return f ? `${TAB_LABEL[tab]}: kept from ${nameOfSource(s, f.source, a, b)}` : '';
}
/** A switch is checked when its tab is in the session scope (unchecked = frozen for now). */
export const switchOn = (s: DiscoverySession, tab: Tab) => s.scope.includes(tab);
/** The label of a card's "Keep A's <tab> for now" button. */
export const keepForNowLabel = (side: 'A' | 'B', tab: Tab) => `Keep ${side}'s ${TAB_LABEL[tab].toLowerCase()} for now`;

// ---------------------------------------------------------------------------------------------------------------- Keep / Lock from a card
export type KeepTarget = { kind: 'fish'; species: string; mode: RosterMode } | { kind: 'item'; uid: string } | { kind: 'substrate' } | { kind: 'tank' } | { kind: 'backdrop' } | { kind: 'gear'; part: GearLock };
export const KEEP_MODES: { mode: RosterMode; label: string; hint: string }[] = [
  { mode: 'exact', label: 'Exactly', hint: 'Always this many' }, { mode: 'atLeast', label: 'At least', hint: 'This many or more' }, { mode: 'speciesOnly', label: 'Species only', hint: 'Any sensible number' },
];
export function describeKeep(t: KeepTarget, n = 0): string {
  return t.kind === 'fish' ? `${t.mode === 'exact' ? 'exactly ' : t.mode === 'atLeast' ? 'at least ' : ''}${t.mode === 'speciesOnly' ? '' : n + ' '}${getSpecies(t.species)?.name ?? t.species}` : t.kind === 'item' ? 'that piece' : t.kind === 'substrate' ? 'the substrate' : t.kind === 'backdrop' ? 'the background' : t.kind === 'gear' ? `the ${t.part === 'light' ? 'lighting' : t.part === 'filter' ? 'filtration' : t.part === 'stand' ? 'stand color' : 'heating'}` : 'the tank size';
}
/**
 * Keep / Lock something a card shows. Animals lock a roster entry (exactly N by default, plan decision 2); a piece, the substrate or the tank is first copied into the working
 * project when it is not there yet (ONE undo step) and then locked. A pure roster lock is not a design edit (no undo step). Never touches the record.
 */
export function keepFromRecord(store: Store, rec: CandidateRecord, t: KeepTarget): { ok: boolean; message: string } {
  const S = rec.snapshot;
  if (t.kind === 'fish') {
    const n = S.fish.filter(f => f.species === t.species).length || 1;
    store.update(s => { lockRoster(s.tanks[s.active], t.species, t.mode, n); }, { history: false });
    return { ok: true, message: `Kept ${describeKeep(t, n)}. Discovery will not change it; your own edits stay free.` };
  }
  // PS1: nothing below writes the working design. A lock holds ONE value; when the working design does not have it yet, the lock carries it (HeldValue) until Make It Yours.
  const E = store.effTank, W = store.tank, differs = (ks: readonly (keyof TankSetup)[]) => ks.some(k => JSON.stringify(W[k]) !== JSON.stringify(S[k]));
  const pick = (ks: readonly (keyof TankSetup)[]) => Object.fromEntries(ks.map(k => [k, structuredClone(S[k])]));
  void E;
  if (t.kind === 'item') {
    const it = S.items.find(i => i.uid === t.uid); if (!it) return { ok: false, message: 'That piece is not in this design.' };
    const has = W.items.some(i => i.uid === t.uid);
    store.update(s => { lockObject(s.tanks[s.active], t.uid, undefined, has ? undefined : { item: structuredClone(it) }); }, { history: false });
    return { ok: true, message: has ? 'Kept that piece.' : 'Kept that piece for Discovery. It is only in your design if you choose Make It Yours.' };
  }
  if (t.kind === 'backdrop' || t.kind === 'gear') {
    const keys: readonly (keyof TankSetup)[] = t.kind === 'backdrop' ? HARDSCAPE_KEYS : t.part === 'light' ? ['light'] : t.part === 'stand' ? ['stand'] : ['tech'];
    const copy = t.kind === 'backdrop' ? differs(HARDSCAPE_KEYS) : JSON.stringify(gearOf(W, t.part)) !== JSON.stringify(gearOf(S, t.part));
    const target = t.kind === 'backdrop' ? 'backdrop' : t.part;
    store.update(s => { lockObject(s.tanks[s.active], target, undefined, copy ? { patch: pick(keys) } : undefined); }, { history: false });
    return { ok: true, message: `${describeKeep(t)[0].toUpperCase()}${describeKeep(t).slice(1)} kept${copy ? ' for Discovery; your design only changes if you choose Make It Yours' : ''}.` };
  }
  const copy = t.kind === 'substrate' ? differs(SUBSTRATE_KEYS) : differs(['tank']);
  store.update(s => {
    const T = s.tanks[s.active];
    if (t.kind === 'substrate') lockObject(T, 'substrate', undefined, copy ? { patch: pick(SUBSTRATE_KEYS) } : undefined);
    else lockObject(T, 'tank', ['dimensions'], copy ? { patch: pick(['tank']) } : undefined);
  }, { history: false });
  return { ok: true, message: `${t.kind === 'substrate' ? 'Substrate' : 'Tank size'} kept${copy ? ' for Discovery; your design only changes if you choose Make It Yours' : ''}.` };
}
export const isKept = (tank: TankSetup, t: KeepTarget): boolean =>
  t.kind === 'fish' ? locksOf(tank).roster.some(r => r.species === t.species) : t.kind === 'item' ? isLocked(tank, t.uid) : t.kind === 'gear' ? isLocked(tank, t.part) : isLocked(tank, t.kind);

const gearOf = (t: TankSetup, part: GearLock) => gearPart(t, part);
/** Lock a whole ATTRIBUTE of a card (AB7): the same locks as every Keep (every species exactly as shown, every piece, the tank, the substrate, the background, a gear part). Pieces and gear that are not in the working design yet are copied in first (one undo step). Never touches the record. */
export function holdAttr(store: Store, rec: CandidateRecord, l: AttrLock): { ok: boolean; message: string } {
  const S = rec.snapshot;
  if (l.kind === 'tank' || l.kind === 'substrate' || l.kind === 'backdrop') return keepFromRecord(store, rec, { kind: l.kind });
  if (l.kind === 'gear') return keepFromRecord(store, rec, { kind: 'gear', part: l.part });
  if (l.kind === 'fish') {
    store.update(s => { for (const sp of new Set(l.species)) lockRoster(s.tanks[s.active], sp, 'exact', S.fish.filter(f => f.species === sp).length || 1); }, { history: false });
    return { ok: true, message: 'Kept the stocking exactly as shown. Discovery will not change it; your own edits stay free.' };
  }
  store.update(s => {
    const T = s.tanks[s.active];
    for (const u of foreignPieces(store.effTank, S, l.uids)) unlockObject(T, u);   // a lock holds ONE hardscape (or plant set): the earlier one is replaced, never added to
    const missing = l.uids.filter(u => !T.items.some(i => i.uid === u));
    for (const u of l.uids) { const it = S.items.find(i => i.uid === u); if (it) lockObject(T, u, undefined, missing.includes(u) ? { item: structuredClone(it) } : undefined); }
  }, { history: false });
  const added = l.uids.some(u => !store.tank.items.some(i => i.uid === u));
  return { ok: true, message: added ? 'Kept those pieces for Discovery. They are only in your design if you choose Make It Yours.' : 'Kept those pieces.' };
}
/** The locked pieces that `uids` would replace (see foreignPieces), and the replacing itself (unlock only: no design change, no undo step). */
export const foreignOf = (store: Store, rec: CandidateRecord, uids: readonly string[]) => foreignPieces(store.effTank, rec.snapshot, uids);
export function releasePieces(store: Store, uids: readonly string[]): void { store.update(s => { for (const u of uids) unlockObject(s.tanks[s.active], u); }, { history: false }); }
/** Unlock a whole attribute: the same unlock the other lock controls do (no design change, no undo step). */
export function releaseAttr(store: Store, l: AttrLock): void {
  store.update(s => {
    const T = s.tanks[s.active];
    if (l.kind === 'fish') for (const sp of new Set(l.species)) unlockRoster(T, sp);
    else if (l.kind === 'items') for (const u of l.uids) unlockObject(T, u);
    else unlockObject(T, l.kind === 'gear' ? l.part : l.kind);
  }, { history: false });
}

/** What the project's locks say about a design (empty = it honours them). The design is read, never changed. */
export function lockConflicts(tank: TankSetup, design: TankSetup): string[] {
  return lockViolations(ensureUids(structuredClone(tank)), ensureUids(structuredClone(design)), tank.locks).map(v => v.detail);
}
/** After a Keep: does the favourite still honour the locks? Names what broke; the caller says so and asks for a new challenger. */
export const championConflicts = (tank: TankSetup, champion: CandidateRecord | undefined): string[] => champion ? lockConflicts(tank, champion.snapshot) : [];

// ---------------------------------------------------------------------------------------------------------------- adapt (fake-grade; AB1's adapt replaces it)
/** A copy of `design` that honours `tank`'s locks (held pieces, substrate, tank, animal counts), or null when it cannot be done honestly. */
export function adaptToLocks(design: TankSetup, tank: TankSetup): TankSetup | null {
  const S = ensureUids(structuredClone(design)), P = ensureUids(structuredClone(tank)), L = locksOf(P);
  const nextId = (xs: { id: number }[]) => xs.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  for (const o of L.objects) {
    if (o.target === 'substrate') for (const k of SUBSTRATE_KEYS) (S as unknown as Record<string, unknown>)[k] = structuredClone(P[k]);
    else if (o.target === 'tank') S.tank = structuredClone(P.tank);
    else {
      const it = P.items.find(i => i.uid === o.target), fi = P.fish.find(f => f.uid === o.target);
      if (it) { const j = S.items.findIndex(i => i.uid === it.uid); const c = { ...structuredClone(it), id: j >= 0 ? S.items[j].id : nextId(S.items) }; if (j >= 0) S.items[j] = c; else S.items.push(c); }
      if (fi) { const j = S.fish.findIndex(f => f.uid === fi.uid); const c = { ...structuredClone(fi), id: j >= 0 ? S.fish[j].id : nextId(S.fish) }; if (j >= 0) S.fish[j] = c; else S.fish.push(c); }
    }
  }
  for (const r of L.roster) {
    const have = S.fish.filter(f => f.species === r.species), want = r.mode === 'exact' ? r.n : r.mode === 'atLeast' ? Math.max(r.n, have.length) : Math.max(1, have.length);
    const proto: Fish | undefined = have[0] ?? P.fish.find(f => f.species === r.species);
    if (have.length > want) { const drop = new Set(have.slice(want).map(f => f.uid)); S.fish = S.fish.filter(f => !drop.has(f.uid)); }
    else if (have.length < want) { if (!proto) return null; for (let k = have.length; k < want; k++) S.fish.push({ ...structuredClone(proto), id: nextId(S.fish), uid: newUid('f') }); }
  }
  return lockConflicts(P, S).length ? null : S;
}

// ---------------------------------------------------------------------------------------------------------------- Make It Yours
export interface Plan {
  rec: CandidateRecord;
  proposal: Proposal;
  rows: DiffRow[];
  /** tabs the change reaches beyond the session's checked tabs */
  outside: Tab[];
  conflicts: string[];
  buy: CandidateRecord['facts']['toBuy'];
}
/** The preview of installing `rec` (its whole snapshot, as a delta against the CURRENT project). Nothing is written. */
export function makePlan(store: Store, rec: CandidateRecord, s: DiscoverySession): Plan {
  const delta = deltaBetween(store.tank, rec.snapshot);
  // a design never carries the project's own settings: locks, the brief, constraints, camera and render stay as they are
  if (delta.set) { for (const k of ['locks', 'brief', 'constraints', 'camera', 'render', 'discoverOn'] as const) delete (delta.set as Record<string, unknown>)[k]; if (!Object.keys(delta.set).length) delete delta.set; }
  const proposal: Proposal = { baseRev: store.rev, scope: [...TABS], delta, summary: rec.facts.title };
  const chk = checkProposal(store.tank, proposal, store.effTank);
  const gear = delta.set ? Object.keys(delta.set).filter(k => !['tank', 'substrate', 'terrain', 'patches'].includes(k)) : [];
  const rows = diffRows(store.tank, { ...proposal, gear: [] } as unknown as DiscoveryProposal);
  return {
    rec, proposal, rows: gear.length ? [...rows, { tab: 'gear', verb: 'change', text: 'Equipment and settings that go with it' }] : rows,
    outside: chk.touches.tabs.filter(t => !s.scope.includes(t)), conflicts: chk.violations.map(v => v.detail), buy: rec.facts.toBuy,
  };
}
/** Install the design: re-checks revision and locks, ONE undo step, never adds a lock, existing locks kept. */
export const acceptPlan = (store: Store, rec: CandidateRecord, s: DiscoverySession) => applyProposal(store, makePlan(store, rec, s).proposal);
export { TAB_LABEL };
