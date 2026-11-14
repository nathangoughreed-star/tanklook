// UI2 shell step 4 (lane S4, 2026-11-14): the Animals section, Water look and the Selection drawer as pure view-models + edits
// (screen map §2a rows "Section Animals", inventory rows 28-29). No DOM. Engine calls go ONLY through P2's scene/stockEdit.ts and
// ui/logic/animalPicker.ts; the selected-animal edits are the old panel's, moved here unchanged in behaviour.
import { SPECIES, fishTL, getSpecies, searchSpecies, speciesTag, type Sex, type Species } from '../../data/species';
import { HERP } from '../../data/herpstock';
import { pairRule } from '../../data/groups';
import { pairingIn, setPairing } from '../../scene/pairs';
import { FRESH_CLEAR, SALT_CLEAR } from '../../scene/tankEdit';
import { fitFish, setWaterLevel } from '../../scene/water';
import { backdropDepth, clampFish, fmtLen, waterY } from '../../scene/physics';
import { ROLES, groupPicker, offeredIn, roleOf, rolesFor, tankKind, type Fit, type Role, type SetupKind } from '../../scene/pickerKind';
import * as stockEdit from '../../scene/stockEdit';
import { experienceIn, fitsThisTank, type createFitter } from '../../ui/logic/animalPicker';
import { startCount } from '../../ui/pickerStrict';
import { scopeSpecies } from '../../scope';
import { CARE } from '../../data/care';
import type { Rules } from '../../scene/brief';
import { LIMITS } from '../../scene/validate';
import type { Fish, Pairing, TankSetup, Units } from '../../scene/types';
import type { Store } from '../../scene/store';

/** The ONE place the shell reads the keeper's experience for the animal gate (lane P10 replaces it with experienceOf(area)).
 *  The fitter reads the same value from the scene itself; this exposes it for display ("Suits experience level N"). */
export const experienceNow = (S: TankSetup) => experienceIn(S);

export type Fitter = ReturnType<typeof createFitter>;

/** The kind names the picker says: "freshwater" / "saltwater" / ... */
export const KIND_WORD: Record<SetupKind, string> = { freshwater: 'freshwater', saltwater: 'saltwater', terrarium: 'terrarium', vivarium: 'vivarium' };

export interface PickRow { id: string; name: string; sci: string; size: string; tag: string; level: Fit['level']; /** one line why it is greyed ('' when it fits) */ reason: string; more: string[]; /** every row of this species already in the tank, summed */ inTank: number; dimorphic: boolean; startCount: number }
export interface PickGroup { role: Role; label: string; rows: PickRow[] }
export interface PickView {
  kind: SetupKind;
  chips: { role: Role | undefined; label: string; n: number }[];
  groups: PickGroup[];
  /** rows listed now */
  shown: number;
  /** rows the "Fits this tank" filter holds back */
  hidden: number;
  /** nothing listed: the sentence that says why */
  none: string;
  placeholder: string;
}

export interface PickQuery { q: string; role?: Role; fitsOnly: boolean }
/** "Fits this tank" is ON by default (screen map §2a); the choice is remembered per browser by the component. */
export const DEFAULT_QUERY: PickQuery = { q: '', role: undefined, fitsOnly: true };

/** The species this kind of tank offers that match the search and the chosen group. */
export const findSpecies = (S: TankSetup, q: string, role?: Role) => { const k = tankKind(S); return searchSpecies(q).filter(sp => offeredIn(sp, k) && (!role || roleOf(sp) === role)); };

export function pickView(S: TankSetup, units: Units, rules: Rules, fitter: Fitter, query: PickQuery): PickView {
  const kind = tankKind(S), salt = kind === 'saltwater';
  const fitOf = fitter.fitsFor(S, units, rules);
  const counts = new Map<Role, number>();
  for (const sp of scopeSpecies(SPECIES)) if (offeredIn(sp, kind)) counts.set(roleOf(sp), (counts.get(roleOf(sp)) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, n) => a + n, 0);
  const chips = [{ role: undefined as Role | undefined, label: 'All', n: total }, ...rolesFor(kind).filter(r => counts.has(r)).map(r => ({ role: r as Role | undefined, label: ROLES.find(x => x[0] === r)![1], n: counts.get(r)! }))];
  const role = query.role && counts.has(query.role) ? query.role : undefined;
  const all = findSpecies(S, query.q, role);
  const list = query.fitsOnly ? fitsThisTank(all, fitOf) : all;
  const groups: PickGroup[] = groupPicker(list, kind, fitOf).map(g => ({
    role: g.role, label: g.label,
    rows: g.rows.map(({ sp, fit }) => pickRow(S, sp, fit, units)),
  }));
  const other = query.q.trim() ? searchSpecies(query.q).length : 0;
  const hidden = all.length - list.length;
  const none = list.length ? ''
    : all.length ? `Nothing here fits this tank${query.q.trim() ? ' for that search' : ''}: ${hidden} more ${hidden > 1 ? 'are' : 'is'} held back. Switch off "Fits this tank" to see them.`
    : query.q.trim() ? `Nothing for a ${kind} setup matches${other ? ` (${other} in other kinds: change the kind in the Tank section)` : ''}.` : 'No animals for this kind of setup yet.';
  const rn = role ? ROLES.find(r => r[0] === role)![1].toLowerCase() : '';
  return { kind, chips, groups, shown: list.length, hidden, none, placeholder: role ? `Search ${rn}` : `Search ${salt ? 'marine ' : ''}species (common or scientific name)` };
}

function pickRow(S: TankSetup, sp: Species, fit: Fit, units: Units): PickRow {
  return {
    id: sp.id, name: sp.name, sci: sp.sci, size: fmtLen(sp.tl, units), tag: speciesTag(sp) ?? '',
    level: fit.level, reason: fit.level === 'ok' ? '' : fit.text, more: fit.level === 'ok' ? [] : fit.more,
    inTank: S.fish.filter(f => f.species === sp.id).length, dimorphic: !!sp.female, startCount: startCount(sp),
  };
}

// ---------- the stocking list ----------

export interface StockRow {
  key: string; id: string; sex?: Sex; name: string; sci: string; n: number;
  /** does not live in this tank's water */
  off: boolean;
  /** greyed: the one-line reason (the engine's fit text, e.g. "tight with 2"), '' when fine */
  reason: string; level: Fit['level']; more: string[];
}
export interface StockView { rows: StockRow[]; total: number; misfits: number; misfitText: string; misfitNames: string; atLimit: boolean; empty: string }

/** One row per species (a dimorphic species has a row per sex present), in order of arrival. */
export function stockView(S: TankSetup, rules: Rules, units: Units, fitter: Fitter): StockView {
  const fitOf = fitter.fitsFor(S, units, rules), salt = stockEdit.isSalt(S);
  const counts = new Map<string, number>();
  for (const f of S.fish) { const sp = getSpecies(f.species), k = sp?.female && f.sex === 'f' ? f.species + '~f' : f.species; counts.set(k, (counts.get(k) ?? 0) + 1); }
  const rows: StockRow[] = [];
  for (const [key, n] of counts) {
    const [id, fem] = key.split('~'), sp = getSpecies(id); if (!sp) continue;
    const sex: Sex | undefined = fem ? 'f' : undefined, off = !stockEdit.fitsWater(sp, S), fit = fitOf(sp);
    rows.push({ key, id, sex, name: stockEdit.rowName(sp, sex), sci: sp.sci, n, off, reason: off ? `does not live in ${salt ? 'saltwater' : 'freshwater'}` : fit.level === 'ok' ? '' : fit.text, level: off ? 'problem' : fit.level, more: off ? [] : fit.more });
  }
  const mis = stockEdit.misfits(S), by = new Map<string, number>();
  for (const f of mis) { const nm = getSpecies(f.species)?.name ?? f.species; by.set(nm, (by.get(nm) ?? 0) + 1); }
  return {
    rows, total: S.fish.length, misfits: mis.length,
    misfitText: mis.length ? `${mis.length} ${mis.length > 1 ? 'animals do' : 'animal does'} not live in ${salt ? 'saltwater' : 'freshwater'}.` : '',
    misfitNames: [...by].map(([nm, n]) => `${n} ${nm}`).join(', '),
    atLimit: S.fish.length >= LIMITS.maxFish,
    empty: 'No animals yet. Pick one below to add it.',
  };
}

/** Which row of the list holds this animal (to open it / to highlight it). */
export const rowKeyOf = (f: Fish) => { const sp = getSpecies(f.species); return sp?.female && f.sex === 'f' ? f.species + '~f' : f.species; };

// ---------- edits (engine calls only through P2) ----------

type StockStore = Pick<Store, 'edit' | 'nextId' | 'select' | 'selId' | 'tank'>;
export type EditResult = { ok: true; note?: string } | { ok: false; why: string };

/** Set how many of a species the tank holds. One undo step per burst of clicks; a selection that vanished is cleared. */
export function setCount(store: StockStore, sp: Species, to: (n: number) => number, sex: Sex | undefined, pct = 100, at?: Parameters<typeof stockEdit.applyCount>[4]['at']): EditResult {
  const plan = stockEdit.planCount(store.tank, sp, to, sex);
  if (plan.kind === 'blocked') return { ok: false, why: plan.why };
  if (plan.kind === 'full') return { ok: false, why: plan.message };
  const first = store.nextId(), seed = Math.random() * 1e9;
  store.edit(s => stockEdit.applyCount(s, sp, to, sex, { first, seed, pct, at }), { coalesce: stockEdit.countKey(sp, sex) });
  if (store.selId != null && !store.tank.fish.some(f => f.id === store.selId)) store.select(null);
  return { ok: true };
}

/** Add a species at its start count (a group for schooling fish, else one). Already listed: say so, change nothing. */
export function addSpecies(store: StockStore, sp: Species, sex?: Sex, pct = 100): EditResult {
  const sx = sp.female ? sex : undefined;
  if (store.tank.fish.some(f => stockEdit.inRow(f, sp, sx))) return { ok: false, why: `${stockEdit.rowName(sp, sx)} is already in the stocking list: use + or type a number.` };
  const r = setCount(store, sp, () => startCount(sp), sx, pct);
  return r.ok ? { ok: true, note: `${startCount(sp)} ${sp.name} added.` } : r;
}

/** "Remove misfits" after a tank change (Ctrl+Z brings them back). */
export function removeMisfits(store: StockStore): EditResult {
  const out = stockEdit.misfitIds(store.tank); if (!out.size) return { ok: false, why: 'Nothing to remove.' };
  store.edit(s => stockEdit.removeFish(s, out));
  if (store.selId != null && out.has(store.selId)) store.select(null);
  return { ok: true, note: stockEdit.misfitNote(out.size) };
}

// ---------- Water look (level and tint; the water numbers live in the Water drawer) ----------

export interface WaterLook {
  on: boolean; salt: boolean;
  level: number; levelText: string; opacity: number; tintText: string; color: string;
  presets: { id: string; label: string; color: string; opacity: number }[];
  /** which preset the water matches now ('' when none) */
  current: string;
  off: string;
}
export function waterLook(S: TankSetup, units: Units): WaterLook {
  const w = S.water, salt = !!w.salt, clear = salt ? SALT_CLEAR : FRESH_CLEAR;
  const presets = [{ id: 'clear', label: 'Clear', color: clear[0], opacity: clear[1] },
    ...(salt ? [{ id: 'reef', label: 'Reef blue', color: '#2f86d0', opacity: 0.22 }, { id: 'ocean', label: 'Deep blue', color: '#1f5fb0', opacity: 0.4 }]
      : [{ id: 'tannin', label: 'Blackwater', color: '#6b3d14', opacity: 0.6 }, { id: 'green', label: 'Green', color: '#5d8a2e', opacity: 0.5 }])];
  return {
    on: w.on, salt, level: w.level, levelText: w.level >= 1 ? 'Full' : `${fmtLen(waterY(S.tank, w.level), units)} high`,
    opacity: w.opacity, tintText: w.opacity < 0.01 ? 'Clear' : `${Math.round(w.opacity * 100)}%`, color: w.color, presets,
    current: presets.find(p => p.color === w.color && Math.abs(p.opacity - w.opacity) < 0.005)?.id ?? '',
    off: w.on ? '' : 'Water is off in this tank: turn it on in the Tank section to set its look.',
  };
}
export const setLevel = (store: Pick<Store, 'edit'>, v: number) => store.edit(s => setWaterLevel(s, v), { coalesce: 'wLevel' });
export const setTint = (store: Pick<Store, 'edit'>, v: number) => store.edit(s => { s.water.opacity = v; }, { coalesce: 'wOpac' });
export const setColor = (store: Pick<Store, 'edit'>, c: string) => store.edit(s => { s.water.color = c; if (s.water.opacity < 0.05) s.water.opacity = 0.3; }, { coalesce: 'wColor' }); // a colour picked on clear water should show
export const applyPreset = (store: Pick<Store, 'edit'>, p: { color: string; opacity: number }) => store.edit(s => { Object.assign(s.water, { color: p.color, opacity: p.opacity }); });

// ---------- the Selection drawer (the old "selected animal" box) ----------

export interface SelectionView {
  id: number; name: string; sci: string; sexMark: string;
  lines: [string, string][];
  /** ♂ / ♀ buttons (a dimorphic species) */
  sex: { on: 'm' | 'f' } | null;
  /** pair status, asked while exactly two of a pair species are in the tank */
  pair: { on: Pairing; choices: [Pairing, string][] } | null;
  /** the tracked sex of a reptile / amphibian */
  gender: { on: '' | 'm' | 'f'; how: string } | null;
  /** more animals selected with it */
  extra: number;
}
const PAIR_CHOICES: [Pairing, string][] = [['established', 'Established'], ['unconfirmed', 'Not confirmed'], ['unknown', "Don't know"]];

/** `measure(f)` = viewer.measure (how big it looks on screen vs at the front glass); absent / null in tests. */
export function selectionView(S: TankSetup, id: number | null | undefined, units: Units, measure?: (f: Fish) => { len: number; ref: number } | null, extra = 0): SelectionView | null {
  const f = id == null ? undefined : S.fish.find(x => x.id === id), sp = f && getSpecies(f.species); if (!f || !sp) return null;
  const fmt = (mm: number) => fmtLen(mm, units), m = measure?.(f) ?? null;
  const two = pairRule(f.species) && S.fish.filter(x => x.species === f.species).length === 2, hr = HERP[sp.sci];
  const lines: [string, string][] = [
    ['Length', f.tl ? `${fmt(f.tl)} (adult ${fmt(sp.tl)})` : `adult ${fmt(sp.tl)}`],
    ['Depth behind glass', fmt(f.depth)],
    ...(m ? [['Looks, vs. at the front glass', `${Math.round(100 * m.len / m.ref)} % as big`] as [string, string]] : []),
  ];
  return {
    id: f.id, name: sp.name, sci: sp.sci, sexMark: sp.female ? (f.sex === 'f' ? ' ♀' : ' ♂') : '', lines,
    sex: sp.female ? { on: f.sex === 'f' ? 'f' : 'm' } : null,
    pair: two ? { on: pairingIn(S, f.species), choices: PAIR_CHOICES } : null,
    gender: hr ? { on: f.gender ?? '', how: hr.sexing.how } : null,
    extra,
  };
}

type SelStore = Pick<Store, 'edit' | 'nextId' | 'select' | 'selId' | 'tank'>;
const editSel = (store: SelStore, fn: (f: Fish, s: TankSetup) => void, coalesce?: string) => {
  const id = store.selId; if (id == null) return;
  store.edit(s => { const f = s.fish.find(q => q.id === id); if (f) fn(f, s); }, { coalesce });
};
export const flip = (store: SelStore) => editSel(store, f => { f.yaw = f.yaw > 0 ? f.yaw - 180 : f.yaw + 180; });
/** Delete the selected animal; the one before it in the list takes the selection (as before). */
export function del(store: SelStore) {
  const id = store.selId, i = store.tank.fish.findIndex(f => f.id === id); if (i < 0) return;
  store.edit(s => { s.fish = s.fish.filter(f => f.id !== id); });
  store.select(store.tank.fish[Math.max(0, i - 1)]?.id ?? null);
}
export function dup(store: SelStore) {
  const src = store.selId; if (src == null || !store.tank.fish.some(f => f.id === src)) return;
  const id = store.nextId();
  store.edit(s => {
    const f = s.fish.find(q => q.id === src), sp = f && getSpecies(f.species); if (!f || !sp) return;
    const n: Fish = { ...f, id, x: f.x + fishTL(f, sp) * 0.9 };
    clampFish(n, s.tank, backdropDepth(s.backdrop, s.tank), s.render.bgSides); s.fish.push(n);
  });
  store.select(id);
}
/** Switch the selected animal's sex; a custom size keeps its share of the adult length. */
export const setSex = (store: SelStore, sex?: Sex) => editSel(store, (f, s) => {
  const sp = getSpecies(f.species); if (!sp?.female || (f.sex === 'f') === (sex === 'f')) return;
  const was = fishTL({ sex: f.sex }, sp), now = fishTL({ sex }, sp);
  if (f.tl) { f.tl = Math.round(f.tl * now / was); if (f.tl === now) delete f.tl; }
  if (sex) f.sex = sex; else delete f.sex;
  if (CARE[f.species]?.sexed) f.gender = sex === 'f' ? 'f' : 'm';
  fitFish(f, s);
});
export const setPair = (store: SelStore, st: Pairing) => { const f = store.tank.fish.find(q => q.id === store.selId); if (f) store.edit(s => setPairing(s, f.species, st)); };
export const setGender = (store: SelStore, g?: 'm' | 'f') => editSel(store, f => { if (g) f.gender = g; else delete f.gender; });
