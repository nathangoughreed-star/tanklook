// UI2 shell step 4 (lane S4, 2026-11-14): the Animals section, Water look and the Selection drawer as pure view-models + edits
// (screen map §2a rows "Section Animals", inventory rows 28-29). No DOM. Engine calls go ONLY through P2's scene/stockEdit.ts and
// ui/logic/animalPicker.ts; the selected-animal edits are the old panel's, moved here unchanged in behaviour.
import { SPECIES, fishTL, getSpecies, searchSpecies, gloForm, speciesOf, speciesTag, type Sex, type Species } from '../../data/species';
import { HERP } from '../../data/herpstock';
import { pairRule } from '../../data/groups';
import { pairingIn, setPairing } from '../../scene/pairs';
import { FRESH_CLEAR, SALT_CLEAR } from '../../scene/tankEdit';
import { fitFish, setWaterLevel } from '../../scene/water';
import { backdropDepth, clampFish, fmtLen, waterY } from '../../scene/physics';
import { ROLES, groupPicker, offeredIn, roleOf, rolesFor, tankKind, OK_FIT, type Fit, type Role, type SetupKind } from '../../scene/pickerKind';
import * as stockEdit from '../../scene/stockEdit';
import { experienceIn, fitsThisTank, type createFitter } from '../../ui/logic/animalPicker';
import { startGroup } from '../../ui/pickerStrict';
import { sexFish } from '../../ui/stockPlanLogic';
import { scopeSpecies } from '../../scope';
import { CARE, EXPERTISE_NAME } from '../../data/care';
import { CONTINENTS, continentText, inContinent, originOf, regionText, type Continent } from '../../data/origin';
import { CHEM } from '../../data/waterchem';
import { zoneOf, recommendedMin } from '../../scene/zone';
import { fmtLenShort, fmtTemp, fmtVol } from '../../units';
import type { Rules } from '../../scene/brief';
import { LIMITS } from '../../scene/validate';
import { ADULT_SHARE, monthsToAdult } from '../../data/growth';
import type { Fish, Pairing, TankSetup, Units } from '../../scene/types';
import type { Store } from '../../scene/store';

/** The ONE place the shell reads the keeper's experience for the animal gate (lane P10 replaces it with experienceOf(area)).
 *  The fitter reads the same value from the scene itself; this exposes it for display ("Suits experience level N"). */
export const experienceNow = (S: TankSetup) => experienceIn(S);

export type Fitter = ReturnType<typeof createFitter>;

/** The kind names the picker says: "freshwater" / "saltwater" / ... */
export const KIND_WORD: Record<SetupKind, string> = { freshwater: 'freshwater', saltwater: 'saltwater', terrarium: 'terrarium', vivarium: 'vivarium' };

export interface PickRow { /** CM3: a GloFish row: Add puts the species in with this colour form; `art` draws it */ glo?: string; art?: string; id: string; name: string; sci: string; size: string; tag: string; level: Fit['level']; /** one line why it is greyed ('' when it fits) */ reason: string; more: string[]; /** every row of this species already in the tank, summed */ inTank: number; dimorphic: boolean; startCount: number; /** care level badge: 'Beginner' / 'Intermediate' / 'Expert' ('' = no care data) */ care: string; /** which look the picture is baked under */ look: string }
export interface PickGroup { role: Role; label: string; rows: PickRow[] }
export interface PickView {
  kind: SetupKind;
  chips: { role: Role | undefined; label: string; n: number }[];
  /** R104: where-from chips (continent / ocean region); only places with an animal in the pool, counts follow the group chip */
  origins: { c: PickOrigin | undefined; label: string; n: number }[];
  groups: PickGroup[];
  /** rows listed now */
  shown: number;
  /** rows the "Fits this tank" filter holds back */
  hidden: number;
  /** nothing listed: the sentence that says why */
  none: string;
  placeholder: string;
}

/** R132: "The Lab" is the where-from of GloFish (lab-made colours): they are listed there INSTEAD of under their wild species' continent (the plain zebra danio stays under Asia). */
export type PickOrigin = Continent | 'lab';
export const LAB_LABEL = 'The Lab';
export interface PickQuery { q: string; role?: Role; origin?: PickOrigin; fitsOnly: boolean }
/** "Fits this tank" is ON by default (screen map §2a); the choice is remembered per browser by the component. */
export const DEFAULT_QUERY: PickQuery = { q: '', role: undefined, fitsOnly: true };

/** The species this kind of tank offers that match the search and the chosen group. */
export const findSpecies = (S: TankSetup, q: string, role?: Role, origin?: PickOrigin) => { const k = tankKind(S); return searchSpecies(q).filter(sp => offeredIn(sp, k) && (!role || (role === 'glo' ? !!gloForm(sp) : roleOf(sp) === role)) && (!origin || (origin === 'lab' ? !!gloForm(sp) : inContinent(sp.id, origin)))); };

/** AT1 (R54): the start door reuses the picker with no tank behind it: `held` = species already on its list (they leave the tiles, as in-tank species do), `free` = nothing is judged against a tank. */
export interface PickOpts { held?: ReadonlySet<string>; free?: boolean; heldWord?: string }
export function pickView(S: TankSetup, units: Units, rules: Rules, fitter: Fitter, query: PickQuery, opt: PickOpts = {}): PickView {
  const kind = tankKind(S), salt = kind === 'saltwater';
  const fitOf = opt.free ? () => OK_FIT : fitter.fitsFor(S, units, rules);
  const counts = new Map<Role, number>(), oCounts = new Map<Continent, number>();
  const inTank = new Set([...S.fish.map(f => f.species), ...(opt.held ?? [])]);   // AT1 (R51): a species already in the tank is in the stock rows, not in the tiles
  const pool = scopeSpecies(SPECIES).filter(sp => offeredIn(sp, kind) && !inTank.has(sp.id));
  const gloOn = !opt.free && !opt.held && kind === 'freshwater';   // CM3: the GloFish group needs a tank behind it (forms are set on animals in the tank)
  const isGlo = (sp: (typeof pool)[number]) => gloOn && !!gloForm(sp);
  const labN = pool.filter(isGlo).length;
  const origin: PickOrigin | undefined = query.origin === 'lab' ? (labN ? 'lab' : undefined) : query.origin && pool.some(sp => inContinent(sp.id, query.origin as Continent)) ? query.origin : undefined;
  const wild = (sp: (typeof pool)[number]) => !origin || (origin !== 'lab' && inContinent(sp.id, origin));   // a plain (wild-form) row: GloFish rows are the Lab's
  const roleAll = new Map<Role, number>();
  for (const sp of pool) roleAll.set(roleOf(sp), (roleAll.get(roleOf(sp)) ?? 0) + 1);
  if (gloOn) { const n = pool.filter(isGlo).length; if (n) roleAll.set('glo', n); }
  const inRole = (sp: (typeof pool)[number]) => !role || (role === 'glo' ? isGlo(sp) : roleOf(sp) === role);
  const role = query.role && roleAll.has(query.role) ? query.role : undefined;
  // faceted counts: the group chips follow the chosen place, the place chips follow the chosen group
  for (const sp of pool) {
    if (wild(sp)) counts.set(roleOf(sp), (counts.get(roleOf(sp)) ?? 0) + 1);
    if (isGlo(sp) && (!origin || origin === 'lab')) counts.set('glo', (counts.get('glo') ?? 0) + 1);
    if (role !== 'glo' && inRole(sp)) for (const c of originOf(sp.id)?.c ?? []) oCounts.set(c, (oCounts.get(c) ?? 0) + 1);
  }
  const total = [...counts].reduce((a, [r, n]) => r === 'glo' ? a : a + n, 0);   // GloFish species are already counted in their own groups
  const chips = [{ role: undefined as Role | undefined, label: 'All', n: total }, ...rolesFor(kind).filter(r => counts.has(r) || r === role).map(r => ({ role: r as Role | undefined, label: ROLES.find(x => x[0] === r)![1], n: counts.get(r) ?? 0 }))];
  const originChips = pool.some(sp => originOf(sp.id)) ? [{ c: undefined as Continent | undefined, label: 'Anywhere', n: pool.filter(inRole).length }, ...CONTINENTS.filter(([c]) => oCounts.has(c) || c === origin).map(([c, l]) => ({ c: c as PickOrigin | undefined, label: l, n: oCounts.get(c) ?? 0 })), ...(labN ? [{ c: 'lab' as PickOrigin | undefined, label: LAB_LABEL, n: !role || role === 'glo' ? labN : 0 }] : [])] : [];
  const found = findSpecies(S, query.q, role, origin), all = found.filter(sp => !inTank.has(sp.id)), already = found.filter(sp => inTank.has(sp.id));
  const list = query.fitsOnly && !opt.free ? fitsThisTank(all, fitOf) : all;
  let groups: PickGroup[] = role === 'glo' || origin === 'lab' ? [] : groupPicker(list, kind, fitOf).map(g => ({
    role: g.role, label: g.label,
    rows: g.rows.map(({ sp, fit }) => pickRow(S, sp, fit, units)),
  }));
  if (gloOn && (!role || role === 'glo') && (!origin || origin === 'lab')) {   // CM3: GloFish as its own group (after the schooling fish): the same species, added in a GloFish colour; change it in the Selection drawer
    const rows = list.filter(sp => gloForm(sp)).sort((a, b) => a.name.localeCompare(b.name)).map(sp => { const f = gloForm(sp)!, g = speciesOf({ species: sp.id, form: f })!; return { ...pickRow(S, sp, fitOf(sp), units), name: `GloFish ${sp.name.toLowerCase()}`, glo: f, art: g.art, look: g.look }; });
    if (rows.length) { const i = groups.findIndex(g => g.role === 'school'), at = i < 0 ? 0 : i + 1; groups = [...groups.slice(0, at), { role: 'glo', label: ROLES.find(r => r[0] === 'glo')![1], rows }, ...groups.slice(at)]; }
  }
  const other = query.q.trim() ? searchSpecies(query.q).filter(sp => !inTank.has(sp.id)).length : 0;
  const hidden = all.length - list.length;
  const none = list.length ? ''
    : all.length ? `Nothing here fits this tank${query.q.trim() ? ' for that search' : ''}: ${hidden} more ${hidden > 1 ? 'are' : 'is'} held back. Switch off "Fits this tank" to see them.`
    : already.length ? `${already.length > 2 ? `${already.length} matches are` : `${already.map(sp => sp.name).join(' and ')} ${already.length > 1 ? 'are' : 'is'}`} already in ${opt.heldWord ?? 'your tank'} (above).`
    : query.q.trim() ? `Nothing for a ${kind} setup matches${other ? ` (${other} in other kinds: change the kind in the Tank section)` : ''}.` : 'No animals for this kind of setup yet.';
  const rn = role ? ROLES.find(r => r[0] === role)![1].toLowerCase() : '';
  return { kind, chips, origins: originChips, groups, shown: list.length, hidden, none, placeholder: role ? `Search ${rn}` : `Search ${salt ? 'marine ' : ''}species (common or scientific name)` };
}

function pickRow(S: TankSetup, sp: Species, fit: Fit, units: Units): PickRow {
  return {
    id: sp.id, name: sp.name, sci: sp.sci, size: fmtLen(sp.tl, units), tag: speciesTag(sp) ?? '',
    level: fit.level, reason: fit.level === 'ok' ? '' : fit.text, more: fit.level === 'ok' ? [] : fit.more,
    inTank: S.fish.filter(f => f.species === sp.id).length, dimorphic: !!sp.female, startCount: startGroup(sp).total, care: CARE[sp.id] ? EXPERTISE_NAME[CARE[sp.id].care] : '', look: sp.look,
  };
}

// ---------- the stocking list ----------

export interface StockRow {
  key: string; id: string; sex?: Sex; name: string; sci: string; n: number;
  /** R156: adult size, and the animals' own size now when they are still growing ("Adult about 5\"; yours are 2\" now, about 14 months to grow") */
  size: string;
  /** does not live in this tank's water */
  off: boolean;
  /** greyed: the one-line reason (the engine's fit text, e.g. "tight with 2"), '' when fine */
  reason: string; level: Fit['level']; more: string[];
}
export interface StockView { rows: StockRow[]; total: number; misfits: number; misfitText: string; misfitNames: string; atLimit: boolean; empty: string }

/** R156: adult length, and where the animals are now. A fish with no recorded length is an adult for the engine, so only an entered young size shows a growing line. */
export function sizeLine(S: TankSetup, sp: Species, sex: Sex | undefined, units: Units): string {
  const adult = sex === 'f' && sp.female ? sp.female.tl : sp.tl, mine = S.fish.filter(f => f.species === sp.id && (sex === 'f') === (f.sex === 'f') && f.tl !== undefined).map(f => f.tl!);
  const base = `Adult about ${fmtLenShort(adult, units)}`;
  if (!mine.length) return base;
  const now = Math.min(...mine);
  if (now >= adult * ADULT_SHARE) return base;
  const mo = Math.max(1, Math.round(monthsToAdult(sp, now, adult)));
  return `${base}; yours are ${fmtLenShort(now, units)} now${Number.isFinite(mo) && mo > 0 ? `, about ${mo} month${mo === 1 ? '' : 's'} to grow` : ''}`;
}

/** One row per species (a dimorphic species has a row per sex present), in order of arrival. */
export function stockView(S: TankSetup, rules: Rules, units: Units, fitter: Fitter): StockView {
  const fitOf = fitter.fitsFor(S, units, rules), salt = stockEdit.isSalt(S);
  const counts = new Map<string, number>();
  for (const f of S.fish) { const sp = getSpecies(f.species), k = sp?.female && f.sex === 'f' ? f.species + '~f' : f.species; counts.set(k, (counts.get(k) ?? 0) + 1); }
  const rows: StockRow[] = [];
  for (const [key, n] of counts) {
    const [id, fem] = key.split('~'), sp = getSpecies(id); if (!sp) continue;
    const sex: Sex | undefined = fem ? 'f' : undefined, off = !stockEdit.fitsWater(sp, S), fit = fitOf(sp);
    rows.push({ key, id, sex, name: stockEdit.rowName(sp, sex), sci: sp.sci, n, size: sizeLine(S, sp, fem ? 'f' : undefined, units), off, reason: off ? `does not live in ${salt ? 'saltwater' : 'freshwater'}` : fit.level === 'ok' ? '' : fit.text, level: off ? 'problem' : fit.level, more: off ? [] : fit.more });
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
export function addSpecies(store: StockStore, sp: Species, sex?: Sex, pct = 100, albino = false, form?: string): EditResult {
  const sx = sp.female ? sex : undefined;
  if (store.tank.fish.some(f => stockEdit.inRow(f, sp, sx))) return { ok: false, why: `${stockEdit.rowName(sp, sx)} is already in the stocking list: use + or type a number.` };
  const g = startGroup(sp), before = new Set(store.tank.fish.map(f => f.id));
  const r = setCount(store, sp, () => g.total, sx, pct);
  if (r.ok) sexNew(store, sp, g, before, sx);
  if (r.ok && albino) albinoNew(store, sp, before);
  if (r.ok && form) formNew(store, sp, before, form);
  return r.ok ? { ok: true, note: `${g.total} ${sp.name} added${g.f ? ` (${g.n} male${g.n === 1 ? '' : 's'}, ${g.f} female${g.f === 1 ? '' : 's'})` : ''}.` } : r;
}

/** CM3: the animals just added from the GloFish group come in with that colour form. */
function formNew(store: StockStore, sp: Species, before: Set<number>, form: string) {
  if (!sp.forms?.colour.some(c => c.id === form)) return;
  const ids = new Set(store.tank.fish.filter(f => !before.has(f.id) && f.species === sp.id).map(f => f.id));
  if (ids.size) store.edit(s => { for (const f of s.fish) if (ids.has(f.id)) f.form = form; });
}
/** AL1: the animals just added from an albino search come in with the albino form on (species sold in it only). */
function albinoNew(store: StockStore, sp: Species, before: Set<number>) {
  if (!sp.albino) return;
  const ids = new Set(store.tank.fish.filter(f => !before.has(f.id) && f.species === sp.id).map(f => f.id));
  if (ids.size) store.edit(s => { for (const f of s.fish) if (ids.has(f.id)) f.albino = true; });
}

/** The animals just added get the start group's mix of sexes (males, then females), in the same undo step as the add. */
function sexNew(store: StockStore, sp: Species, g: ReturnType<typeof startGroup>, before: Set<number>, sex: Sex | undefined) {
  if (!g.f) return;
  const ids = store.tank.fish.filter(f => !before.has(f.id) && f.species === sp.id).map(f => f.id);
  store.edit(s => sexFish(ids.map(id => s.fish.find(f => f.id === id)!).filter(Boolean), g), { coalesce: stockEdit.countKey(sp, sex) });
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
  /** AL1: the albino switch, for a species sold in that form; n = how many of the species it turns */
  albino: { on: boolean; src: string; n: number } | null;
  /** CM3: colour / pattern and fin forms of the species (the drawn look of the same animal); `on` = this animal's form id ('' = the species' own look), n = animals of the species */
  forms: { n: number; src: string; note: string[]; axes: { axis: 'colour' | 'fin'; title: string; on: string; list: { id: string; name: string; est: boolean; art: string; aspect: number }[] }[] } | null;
  /** the tracked sex of a reptile / amphibian */
  gender: { on: '' | 'm' | 'f'; how: string } | null;
  /** this animal's size as a share of its adult length (the length itself is in `lines`) */
  size: { pct: number; text: string; stages: { name: string; pct: number; text: string; on: boolean }[] | null };
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
    albino: sp.albino ? { on: !!f.albino, src: sp.albino, n: S.fish.filter(x => x.species === f.species).length } : null,
    forms: formsView(S, f, sp),
    gender: hr ? { on: f.gender ?? '', how: hr.sexing.how } : null,
    size: (() => { const adult = fishTL({ sex: f.sex }, sp), pct = clampN(Math.round(fishTL(f, sp) / adult * 100), 15, 130); return { pct, text: `${pct}% of adult · ${fmt(fishTL(f, sp))}`, stages: stagesOf(sp, units, pct) }; })(),
    extra,
  };
}

/** CM3: the forms menu of one animal: each axis lists the species' own look first, then every form with the art that draws it (the swatch). */
function formsView(S: TankSetup, f: Fish, sp: Species): SelectionView['forms'] {
  const F = sp.forms; if (!F) return null;
  const base = speciesOf({ species: f.species, sex: f.sex })!;
  const list = (axis: 'colour' | 'fin', own: string) => [{ id: '', name: own, est: false, art: speciesOf({ species: f.species, sex: f.sex, ...(axis === 'colour' ? { finForm: f.finForm } : { form: f.form }) })!.art, aspect: base.aspect },
    ...F[axis].map(x => { const s = speciesOf({ species: f.species, sex: f.sex, form: f.form, finForm: f.finForm, [axis === 'colour' ? 'form' : 'finForm']: x.id })!; return { id: x.id, name: x.name, est: !!x.est, art: s.art, aspect: s.aspect }; })];
  const axes: NonNullable<SelectionView['forms']>['axes'] = [];
  if (F.colour.length) axes.push({ axis: 'colour', title: sp.id === 'cherryshrimp' ? 'Colour' : 'Colour / pattern', on: f.form ?? '', list: list('colour', 'Standard') });
  if (F.fin.length) axes.push({ axis: 'fin', title: 'Fins', on: f.finForm ?? '', list: list('fin', 'Standard') });
  return { n: S.fish.filter(x => x.species === f.species).length, src: F.src, note: [F.finNote, F.colourNote].filter((x): x is string => !!x), axes };
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

/** AL1: the albino form for every animal of the selected one's species (a group looks alike); only species sold in that form. */
export const setAlbino = (store: SelStore, on: boolean) => {
  const id = store.selId, sel = id == null ? undefined : store.tank.fish.find(q => q.id === id), sp = sel && getSpecies(sel.species);
  if (!sel || !sp?.albino) return;
  store.edit(s => { for (const f of s.fish) if (f.species === sel.species) { if (on) { f.albino = true; delete f.form; } else delete f.albino; } });
};

/** CM3: a colour / pattern form or fin form (`id` '' = the species' own look). `all`: every animal of the species (a group looks alike), else only the selected one. Forms and albino exclude each other. */
export const setForm = (store: SelStore, axis: 'colour' | 'fin', id: string, all = true) => {
  const sid = store.selId, sel = sid == null ? undefined : store.tank.fish.find(q => q.id === sid), sp = sel && getSpecies(sel.species);
  if (!sel || !sp?.forms || (id && !sp.forms[axis].some(x => x.id === id))) return;
  store.edit(s => { for (const f of s.fish) if (f.species === sel.species && (all || f.id === sel.id)) {
    const k = axis === 'colour' ? 'form' : 'finForm';
    if (id) { f[k] = id; if (axis === 'colour') delete f.albino; } else delete f[k];
  } });
};

/** AT1 (R42): the selected animal's size as % of its adult length (100 = adult, stored as no override). */
export const setSize = (store: SelStore, raw: number) => editSel(store, (f, s) => {
  const sp = getSpecies(f.species); if (!sp) return;
  const adult = fishTL({ sex: f.sex }, sp), tl = Math.round(adult * sizePct(raw) / 100);
  if (tl === adult) delete f.tl; else f.tl = tl;
  fitFish(f, s);
}, 'selSize');

// ---------- SC: new-animal size, life stages, Copies, drop into the tank ----------
import { lifeStages } from '../../data/lifestages';
import { COPY_DEFAULTS, copyGroup, groupSize, MAX_COPIES, type Group } from '../../scene/duplicate';
import { MAX_ITEMS } from '../../scene/items';

const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** The "New animal size" slider: % of adult length (100 = adult, stored as no override), 15-130. */
export const sizePct = (raw: number) => clampN(Math.round(raw || 100), 15, 130);
/** Each new animal varies around this size like real ones (audit #39). */
export const sizeText = (pct: number, sp: Species | undefined, units: Units) => pct === 100 ? 'Adult ±10 %' : `${pct}%${sp ? ' · ' + fmtLen(sp.tl * pct / 100, units) : ''} ±10 %`;
/** Life-stage buttons (reptiles, arachnids): each sets the slider to that stage's length. null = this species has none. */
export function stagesOf(sp: Species | undefined, units: Units, cur: number): { name: string; pct: number; text: string; on: boolean }[] | null {
  const st = sp && lifeStages(sp); if (!st || !sp) return null;
  return st.map(([name, mm]) => { const pct = sizePct(mm / sp.tl * 100); return { name, pct, text: `${name}: ${fmtLen(mm, units)}`, on: pct === cur }; });
}

/** A species dropped into the tank: its start count gathered round the drop point, or one more there if it is already listed. */
export function dropSpecies(store: StockStore & Pick<Store, 'seal'>, sp: Species, sex: Sex | undefined, at: Parameters<typeof stockEdit.applyCount>[4]['at'], pct = 100, albino = false, form?: string): EditResult {
  const g = startGroup(sp), before = new Set(store.tank.fish.map(f => f.id));
  const r = setCount(store, sp, k => stockEdit.dropTarget(k, g.total), sex, pct, at);
  if (r.ok) { if (!store.tank.fish.some(f => f.species === sp.id && before.has(f.id))) sexNew(store, sp, g, before, sex); if (albino) albinoNew(store, sp, before); if (form) formNew(store, sp, before, form); store.seal(); }
  return r;
}

export interface CopyOpt { n: number; angle: number; scale: number; spacing: number; reshape: boolean }
export const COPY_START: CopyOpt = { n: 5, angle: 20, scale: 10, spacing: 30, reshape: false };
export const COPY_RANGE = { n: [1, MAX_COPIES], angle: [0, 90], scale: [0, 40], spacing: [0, 100] } as const;
/** "Copies...": N copies of the selection with a little random variation (a school). The copies become the selection. */
export function copySelection(store: Pick<Store, 'edit' | 'nextId' | 'nextItemId' | 'tank' | 'group' | 'selectGroup'>, o: CopyOpt, seed = 1 + Math.floor(Math.random() * 1e9), support?: (t: TankSetup, x: number, d: number, skip: Set<number>) => number): { ok: true; made: number } | { ok: false; why: string } {
  const g = store.group; if (!groupSize(g)) return { ok: false, why: 'Nothing selected.' };
  const T = store.tank;
  if ((g.fish.length && T.fish.length >= LIMITS.maxFish) || (g.items.length && T.items.length >= MAX_ITEMS)) return { ok: false, why: `A tank holds at most ${LIMITS.maxFish} animals and ${MAX_ITEMS} pieces.` };
  const ids = { fish: store.nextId(), item: store.nextItemId() };
  let made: Group = { fish: [], items: [], patches: [] };
  store.edit(t => {
    const m = copyGroup(t, g, { ...COPY_DEFAULTS, ...o, n: clampN(Math.round(o.n), 1, MAX_COPIES), seed, ...(support ? { support: (x: number, d: number, skip: Set<number>) => support(t, x, d, skip) } : {}) } as never, ids);
    if (!groupSize(made)) made = m;
  });
  if (!groupSize(made)) return { ok: false, why: 'Nothing to copy.' };
  store.selectGroup(made);
  return { ok: true, made: made.fish.length + made.items.length };
}


// ---------- AT1 (R48): the species detail view (only fields the catalogue has) ----------

/** AT1: a species note is written in deg C ("about 18-22 °C"); US users read deg F. Converts the ranges and single values in the text. */
export function noteIn(note: string, units: Units): string {
  if (units !== 'in') return note;
  const F = (c: string) => Math.round(+c * 9 / 5 + 32);
  return note.replace(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*°\s*C/g, (_m, a, b) => `${F(a)}-${F(b)} °F`).replace(/(\d+(?:\.\d+)?)\s*°\s*C/g, (_m, a) => `${F(a)} °F`);
}

export interface SpeciesDetail {
  id: string; name: string; sci: string; look: string; tag: string; note: string;
  /** label, value rows in reading order; a row is left out when the catalogue lacks the field */
  rows: [string, string][];
  /** how it sits with this tank and its current stock */
  fit: { level: Fit['level']; text: string; more: string[]; inTank: number };
  startCount: number; start: string; dimorphic: boolean;
  /** R104: where it lives in the wild: the continent / ocean label and the one-line region; absent when the catalogue has no range for it */
  origin?: { place: string; region: string; src: string; est: boolean };
}
const TEMPER = ['Peaceful', 'Territorial or pushy: can harass slow, long-finned or shy tankmates', 'Aggressive: bullies most tankmates'];
const SWIM: Record<string, string> = { top: 'Top of the tank', middle: 'Middle of the tank', bottom: 'Bottom of the tank', all: 'All through the tank' };
const rng = (r: [number, number], f: (n: number) => string) => (r[0] === r[1] ? f(r[0]) : `${f(r[0])} to ${f(r[1])}`);

export function speciesDetail(S: TankSetup, sp: Species, fit: Fit, units: Units): SpeciesDetail {
  const c = CARE[sp.id], chem = CHEM[sp.id], g = startGroup(sp), rows: [string, string][] = [];
  if (c) rows.push(['Care level', `${EXPERTISE_NAME[c.care]} (level ${c.care} of 3)`]);
  if (sp.albino) rows.push(['Albino form', 'Sold in an albino form: switch it on in the Selection drawer once it is in the tank']);
  rows.push(['Adult size', sp.female ? `${fmtLen(sp.tl, units)} male, ${fmtLen(sp.female.tl, units)} female` : fmtLen(sp.tl, units)]);
  if (c) rows.push(['Smallest tank', fmtVol(c.minL, units)]);
  const min = recommendedMin(sp.id);
  rows.push(['Group', sp.pair ? 'Kept as a pair' : min > 1 ? `Best in a group of ${min} or more${g.f ? ` (${g.n} male${g.n === 1 ? '' : 's'}, ${g.f} female${g.f === 1 ? '' : 's'} to start)` : ''}` : c?.solo ? 'One per tank' : 'Fine on its own']);
  if (c) rows.push(['Temperament', TEMPER[c.temper]]);
  if (c?.temp) rows.push(['Water temperature', rng(c.temp, n => fmtTemp(n, units === 'in'))]);
  if (chem) { rows.push(['pH', rng(chem.ph, n => String(n))]); if (chem.gh) rows.push(['Hardness (dGH)', rng(chem.gh, n => String(n))]); }
  if (c) rows.push(['Swims in', SWIM[zoneOf(sp)] ?? '']);
  return {
    id: sp.id, name: sp.name, sci: sp.sci, look: sp.look, tag: speciesTag(sp) ?? '', note: noteIn(sp.note ?? '', units), rows,
    fit: { level: fit.level, text: fit.level === 'ok' ? (S.fish.length ? 'Gets along with what is in the tank now, and suits this tank.' : 'Suits this tank.') : fit.text, more: fit.level === 'ok' ? [] : fit.more, inTank: S.fish.filter(f => f.species === sp.id).length },
    origin: (() => { const o = originOf(sp.id); return o ? { place: continentText(o), region: regionText(o), src: o.s, est: !!o.est } : undefined; })(),
    startCount: g.total, start: g.f ? `${g.total} (${g.n} male${g.n === 1 ? '' : 's'}, ${g.f} female${g.f === 1 ? '' : 's'})` : String(g.total), dimorphic: !!sp.female,
  };
}
