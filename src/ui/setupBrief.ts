// The setup brief as the entry points use it (lane U3, 2026-10-28): the logic over lane U1's Brief (scene/brief.ts). Entry points only PRE-FILL it;
// `summarise` says what is set and what is open per group; `nextQuestions` is progressive discovery (ask only what would change the design); the
// setters build the next brief from a choice. The brief lives in the active tank (`TankSetup.brief`: saved, shared, undoable), reached through
// getBrief / editBrief after `bindBriefStore`. No engine here: the bar (briefBar.ts) draws it, and the feasibility numbers come from the existing
// totals and `compliance`. Welfare is not a brief item: it is a gate the generator always applies.
import { getSpecies } from '../data/species';
import { TANK_MODELS } from '../data/tanks';
import { PICK_CARE, OWNED, type OwnedMap, type Tag } from '../demand/suggest';
import {
  ADAPTS, DESIRES, GROUPS, clearItem, dialogOf, emptyBrief, getItem, hasState, isEmpty, lock, setDialog, setFlex, setItem, setRange, setBound, rangeOf, rangeText, targetOf, unlock, valueOf,
  type Adapt, type Brief, type Desire, type GroupId, type ItemId, type LimitId, type NumLimitId, type Range, type Status, type TapWater, type WaterSrc,
} from '../scene/brief';
import { lookLabel, LOOK_TILES, type LookStyle } from '../scene/looks';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';

export { emptyBrief, isEmpty, GROUPS, ADAPTS, DESIRES, setFlex, setRange, setBound, rangeOf, rangeText, targetOf, dialogOf };
export type { Brief, GroupId, ItemId, Status, LimitId, NumLimitId, Range, Adapt, Desire, TapWater, WaterSrc };

const MM_IN = 25.4;
const NUM_LIMITS: readonly ItemId[] = ['constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.tankGal'];

// ---------- reading the brief ----------
export interface RowView { id: ItemId; label: string; status: Status; off: boolean }
export interface GroupView { id: GroupId; label: string; rows: RowView[]; /** what the chip says */ text: string; open: boolean }
const OPEN_TEXT: Record<GroupId, string> = { animals: 'open', appearance: 'open', equipment: 'open', constraints: 'none set', preferences: 'none set' };
/** Where an item shows: U1 groups by id prefix; the tank you already own and the gear you own read as "Tank and equipment" to a person. */
const SHOWN_IN: Partial<Record<ItemId, GroupId>> = { 'constraints.existingTank': 'equipment', 'constraints.owned': 'equipment' };
const ORDER: ItemId[] = ['animals.stock', 'animals.kinds', 'animals.groups', 'appearance.look', 'appearance.plantMode', 'equipment.tank', 'constraints.existingTank', 'constraints.owned', 'equipment.needStand',
  'constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.tankGal', 'constraints.maxSpace', 'constraints.phased', 'preferences.hightech', 'preferences.tags', 'preferences.wishes', 'preferences.experience', 'preferences.effort',
  'constraints.roomTempC', 'constraints.tapWater', 'preferences.desired', 'preferences.adapt', 'preferences.future'];
export const tankName = (model?: string) => TANK_MODELS.find(m => m.id === model)?.name ?? model ?? 'a tank';
const EXP = ['beginner', 'some experience', 'experienced'];
const TAG_WORD: Record<Tag, string> = { colorful: 'colorful', active: 'lively', calm: 'calm', natural: 'natural', unusual: 'unusual', 'low-maint': 'low upkeep' };
const WISH_WORD = { 'larger-tank': 'a larger tank', 'more-planted': 'more planted', 'less-maintenance': 'less upkeep', cheaper: 'cheaper' } as const;
const WATER_WORD: Record<WaterSrc, string> = { tap: 'tap', well: 'well', ro: 'RO' };
export const DESIRE_WORD: Record<Desire, string> = { watch: 'watch the activity', plants: 'grow plants', breed: 'breed', centerpiece: 'a centerpiece', relax: 'relax', learn: 'learn', kids: 'for kids' };
export const ADAPT_WORD: Record<Adapt, string> = { fixed: 'keep my plan', some: 'open to some changes', open: 'open to changes' };
/** A limit as one chip: "$300-600", "at least $300", "up to $600 a month", "20-40 min a week" (lane GV8). */
export function limitText(b: Brief, id: NumLimitId): string {
  const r = rangeOf(b, id);
  switch (id) {
    case 'constraints.budget': return rangeText(r, '', '$');
    case 'constraints.monthly': return rangeText(r, ' a month', '$');
    case 'constraints.careMin': return rangeText(r, ' min a week');
    case 'constraints.setupHours': return rangeText(r, ' h of set-up');
    case 'constraints.tankGal': return rangeText(r, ' gal');
  }
}
/** One plain label per item, in the person's units. */
export function labelOf(b: Brief, id: ItemId): string {
  if ((NUM_LIMITS as readonly string[]).includes(id)) return limitText(b, id as NumLimitId);
  const raw = (getItem(b, id) as { value: unknown } | undefined)?.value;
  switch (id) {
    case 'animals.stock': return (raw as { species: string; count: number }[]).map(a => `${a.count} ${getSpecies(a.species)?.name ?? a.species}`).join(', ');
    case 'animals.kinds': return (raw as string[]).join(' / ');
    case 'animals.groups': return (raw as string[]).join(' / ');
    case 'appearance.look': return lookLabel(raw as LookStyle);
    case 'appearance.plantMode': return `${raw as string} plants`;
    case 'equipment.tank': return tankName((raw as { model?: string }).model);
    case 'constraints.existingTank': return `own ${tankName((raw as { model?: string }).model)}`;
    case 'constraints.owned': return `own ${Object.keys(raw as object).join(', ')}`;
    case 'equipment.needStand': return (raw as boolean) ? 'needs a stand' : 'has a stand';
    case 'constraints.roomTempC': return `room ${Math.round((raw as number) * 9 / 5 + 32)} deg F`;
    case 'constraints.tapWater': { const w = raw as TapWater; return `${WATER_WORD[w.source]} water${w.hardnessDgh !== undefined ? `, ${w.hardnessDgh} dGH` : ''}${w.ph !== undefined ? `, pH ${w.ph}` : ''}`; }
    case 'preferences.desired': return (raw as Desire[]).map(d => DESIRE_WORD[d]).join(', ');
    case 'preferences.adapt': return ADAPT_WORD[raw as Adapt];
    case 'preferences.future': return `saved for later: ${(raw as { text: string }[]).map(a => a.text).join('; ')}`;
    case 'constraints.maxSpace': { const s = raw as { w: number; d: number }; const r = (mm: number) => Math.round(mm / MM_IN * 10) / 10; return `space ${r(s.w)} x ${r(s.d)} in`; }
    case 'preferences.tags': return (raw as Tag[]).map(t => TAG_WORD[t]).join(', ');
    case 'preferences.wishes': return (raw as (keyof typeof WISH_WORD)[]).map(w => WISH_WORD[w]).join(', ');
    case 'preferences.experience': return EXP[raw as number];
    case 'constraints.phased': return 'buy in phases';
    case 'preferences.hightech': return 'high-tech planted';
    case 'preferences.effort': return `${raw as string} effort`;
    default: return id;
  }
}
const groupShown = (id: ItemId): GroupId => SHOWN_IN[id] ?? (id.split('.')[0] as GroupId);
/** Five rows: the items that are set (locked ones marked), or "open" when nothing is. */
export function summarise(b: Brief): GroupView[] {
  return GROUPS.map(g => {
    const rows = ORDER.filter(id => groupShown(id) === g.id && getItem(b, id)).map(id => { const it = getItem(b, id)!; return { id, label: labelOf(b, id), status: it.status, off: !!it.off }; });
    const on = rows.filter(r => !r.off);
    return { id: g.id, label: g.label, rows, open: !on.length, text: on.length ? on.map(r => r.status === 'locked' ? `${r.label} (locked)` : r.label).join(', ') : OPEN_TEXT[g.id] };
  });
}
/** The animals the person chose and the generator may not change: species and counts. */
export function lockedStock(b: Brief): { species: string; n: number }[] {
  const it = getItem(b, 'animals.stock');
  return it && !it.off && it.status === 'locked' ? it.value.map(a => ({ species: a.species, n: a.count })) : [];
}
export const budgetOf = (b: Brief) => valueOf(b, 'constraints.budget');
export const monthlyOf = (b: Brief) => valueOf(b, 'constraints.monthly');
export const careTimeOf = (b: Brief) => valueOf(b, 'constraints.careMin');
export const spaceOf = (b: Brief): { w: number; d: number } | undefined => { const s = valueOf(b, 'constraints.maxSpace'); return s ? { w: s.w, d: s.d } : undefined; };
/** The lower bounds ("at least"): undefined = none. */
export const budgetMinOf = (b: Brief) => rangeOf(b, 'constraints.budget').min;
export const roomTempFOf = (b: Brief): number | undefined => { const c = valueOf(b, 'constraints.roomTempC'); return c === undefined ? undefined : Math.round(c * 9 / 5 + 32); };
export const tapWaterOf = (b: Brief) => valueOf(b, 'constraints.tapWater');
export const desiredOf = (b: Brief): Desire[] => valueOf(b, 'preferences.desired') ?? [];
export const adaptOf = (b: Brief) => valueOf(b, 'preferences.adapt');
/** Future ambitions saved in the brief (empty until lane NG4 writes them). */
export const futureOf = (b: Brief) => valueOf(b, 'preferences.future') ?? [];
/** The profile's waterSource ('tap' | 'well' | 'bought-ro' | 'own-ro') implied by the brief; undefined for RO (the profile keeps bought vs own) or when unset. Pricing still reads the profile. */
export const profileWaterSource = (b: Brief): 'tap' | 'well' | undefined => { const s = tapWaterOf(b)?.source; return s === 'tap' || s === 'well' ? s : undefined; };
export const experienceOf = (b: Brief) => valueOf(b, 'preferences.experience');
/** One bound of a range limit ("at least" = min, "at most" = max); undefined clears that bound and keeps the other. Lower above upper is swapped (see scene/brief cleanRange). */
export const setLimitBound = (b: Brief, id: NumLimitId, which: 'min' | 'max', v: number | undefined): Brief => setBound(b, id, which, v !== undefined && v >= 0 ? v : undefined);
/** Room temperature typed in deg F (stored deg C); undefined / NaN clears. */
export const setRoomTempF = (b: Brief, f: number | undefined): Brief => f === undefined || !Number.isFinite(f) ? clearItem(b, 'constraints.roomTempC') : setItem(b, 'constraints.roomTempC', Math.round((f - 32) * 5 / 9 * 10) / 10, 'preference');
export function setTapWater(b: Brief, w: Partial<TapWater> | undefined): Brief {
  if (!w || !w.source) return clearItem(b, 'constraints.tapWater');
  return setItem(b, 'constraints.tapWater', { source: w.source, ...(w.hardnessDgh !== undefined && w.hardnessDgh >= 0 ? { hardnessDgh: w.hardnessDgh } : {}), ...(w.ph !== undefined && w.ph >= 0 && w.ph <= 14 ? { ph: w.ph } : {}) }, 'preference');
}
export const setDesired = (b: Brief, d: readonly Desire[]): Brief => d.length ? setItem(b, 'preferences.desired', [...d], 'preference') : clearItem(b, 'preferences.desired');
export const setAdapt = (b: Brief, a: Adapt | undefined): Brief => a ? setItem(b, 'preferences.adapt', a, 'preference') : clearItem(b, 'preferences.adapt');
/** Park a goal for later (a smaller project now): lane NG4 calls this. */
export const addFuture = (b: Brief, text: string, from?: string): Brief => text.trim() ? setItem(b, 'preferences.future', [...futureOf(b), { text: text.trim(), ...(from ? { from } : {}) }], 'preference') : b;
export const removeFuture = (b: Brief, i: number): Brief => { const l = futureOf(b).filter((_, k) => k !== i); return l.length ? setItem(b, 'preferences.future', l, 'preference') : clearItem(b, 'preferences.future'); };
// the conversation state: answered questions and the chosen direction persist in the brief
export const answeredOf = (b: Brief): QId[] => dialogOf(b).answered as QId[];
export const directionOf = (b: Brief): Direction | undefined => dialogOf(b).direction as Direction | undefined;
export const recordAnswer = (b: Brief, q: QId): Brief => setDialog(b, { ...dialogOf(b), answered: [...dialogOf(b).answered, q] });
export const setDirection = (b: Brief, d: Direction | undefined): Brief => setDialog(b, { ...dialogOf(b), direction: d });
export const hasTag = (b: Brief, t: Tag) => !!valueOf(b, 'preferences.tags')?.includes(t);

// ---------- progressive discovery ----------
export interface QOption { id: string; label: string }
export type QId = 'priority' | 'activity' | 'look' | 'space' | 'careTime';
export interface Question { id: QId; text: string; why: string; options: QOption[] }
export interface Next {
  /** generate = enough to design now; ask = show these questions first; evaluate = a locked animal under a budget ceiling: check it fits before proposing anything */
  action: 'generate' | 'ask' | 'evaluate';
  questions: Question[];
}
export type Direction = 'animals' | 'look' | 'lowmaint' | 'small';
/** What the caller knows that the brief does not: the smallest tank (US gal) the locked animals need (from the stocking engine), the direction the person
 *  said matters most, and the questions already answered (a "no limit" leaves nothing in the brief to show it was asked). */
export interface NextCtx { animalTankGal?: number; direction?: Direction; answered?: readonly QId[] }
/** A tank this small (or smaller) is no real space constraint: a betta locked in does not make us ask how much room there is. */
export const SMALL_GAL = 10;

const QUESTIONS: Record<QId, Question> = {
  priority: { id: 'priority', text: 'What do you care about most?', why: 'It decides whether we start from animals, from a look, or from keeping things simple.',
    options: [{ id: 'animals', label: 'Particular animals' }, { id: 'look', label: 'How it looks' }, { id: 'lowmaint', label: 'Little upkeep' }, { id: 'small', label: 'Small and cheap' }] },
  activity: { id: 'activity', text: 'Lively or calm?', why: 'Active schools and shoals need different tanks than calm, slow animals.',
    options: [{ id: 'active', label: 'Active, lots to watch' }, { id: 'calm', label: 'Calm and peaceful' }, { id: 'either', label: 'Either' }] },
  look: { id: 'look', text: 'Which look?', why: 'The look decides the plants, rock and wood, and so the tank and light.',
    options: LOOK_TILES.slice(0, 6).map(s => ({ id: s, label: lookLabel(s) })) },
  space: { id: 'space', text: 'How much room is there?', why: 'The tank has to fit the spot; it also caps the animals.',
    options: [{ id: 'sm', label: 'Small (24 in wide)' }, { id: 'md', label: 'Medium (36 in)' }, { id: 'lg', label: 'Large (48 in)' }, { id: 'none', label: 'No limit' }] },
  careTime: { id: 'careTime', text: 'How much time a week?', why: 'Planted and heavily stocked tanks take more time than a plain, lightly stocked one.',
    options: [{ id: '15', label: '15 min' }, { id: '30', label: '30 min' }, { id: '60', label: '1 hour' }, { id: 'none', label: 'No limit' }] },
};

/** Ask only what changes the design, in the order to ask (the panel shows the first).
 *  - nothing set: no questions, generate.   - only a limit (budget) or only a tank: ask what matters most first.
 *  - animals locked: no lively/calm question (they are chosen); a space question only when they need real room.
 *  - a tank held (owned or picked): no space question.   - a locked animal under a budget ceiling: evaluate before proposing. */
export function nextQuestions(b: Brief, ctx: NextCtx = {}): Next {
  if (isEmpty(b)) return { action: 'generate', questions: [] };
  const done = (q: QId) => !!ctx.answered?.includes(q);
  const animals = lockedStock(b).length > 0, hasLook = !!valueOf(b, 'appearance.look'), hasTank = !!(valueOf(b, 'equipment.tank') || valueOf(b, 'constraints.existingTank'));
  const cares = !!ctx.direction || animals || hasLook; // a direction is known
  const q: Question[] = [];
  if (!cares) q.push(QUESTIONS.priority);
  else {
    if (!animals && ctx.direction === 'look' && !hasLook) return { action: 'ask', questions: [QUESTIONS.look] }; // the look first: it changes what the rest means
    if (!animals && !done('activity') && !hasTag(b, 'active') && !hasTag(b, 'calm')) q.push(QUESTIONS.activity);
    const bigNeed = animals ? (ctx.animalTankGal === undefined || ctx.animalTankGal > SMALL_GAL) : true;
    if (!hasTank && !valueOf(b, 'constraints.maxSpace') && !done('space') && bigNeed) q.push(QUESTIONS.space);
    if (ctx.direction === 'lowmaint' && careTimeOf(b) === undefined && !done('careTime')) q.push(QUESTIONS.careTime);
  }
  const evaluate = animals && budgetOf(b) !== undefined;
  return { action: evaluate ? 'evaluate' : q.length ? 'ask' : 'generate', questions: q };
}

// ---------- setters: each returns the next brief (the input is not changed) ----------
export const removeItem = (b: Brief, id: ItemId) => clearItem(b, id);
export const toggleLock = (b: Brief, id: ItemId): Brief => getItem(b, id)?.status === 'locked' ? unlock(b, id) : lock(b, id);
/** The animals the person chose (stocking builder): locked. Replaces the earlier animals; none clears the item. */
export function lockAnimals(b: Brief, animals: { species: string; name?: string; n: number }[]): Brief {
  const list = animals.filter(a => a.n > 0).map(a => ({ species: a.species, count: a.n }));
  return list.length ? setItem(b, 'animals.stock', list, 'locked') : clearItem(b, 'animals.stock');
}
/** The look chosen in the look picker. Locked unless told otherwise: it is what the person came for. */
export const setLook = (b: Brief, style: LookStyle | undefined, status: Status = 'locked'): Brief => style ? setItem(b, 'appearance.look', style, status) : clearItem(b, 'appearance.look');
/** A tank the person picked (a preference: the generator may suggest a bigger one) or owns (locked: it is what they have). */
export function setTank(b: Brief, tank: { id: string; label?: string; owned?: boolean } | undefined): Brief {
  let n = clearItem(clearItem(b, 'equipment.tank'), 'constraints.existingTank');
  if (tank) n = tank.owned ? setItem(n, 'constraints.existingTank', { model: tank.id }, 'locked') : setItem(n, 'equipment.tank', { model: tank.id }, 'preference');
  return n;
}
/** The UPPER bound of a limit (the one every v1 / v2 caller means); the lower bound is kept. */
const cap = (id: NumLimitId) => (b: Brief, v: number | undefined): Brief => setLimitBound(b, id, 'max', v);
export const setBudget = cap('constraints.budget'), setMonthly = cap('constraints.monthly'), setCareTime = cap('constraints.careMin');
export const setBudgetMin = (b: Brief, v: number | undefined): Brief => setLimitBound(b, 'constraints.budget', 'min', v);
/** Space in mm; setting it also switches the space guardrail on, clearing it removes both. */
export function setSpace(b: Brief, s: { w: number; d: number } | undefined, _units: 'in' | 'cm' = 'in'): Brief {
  return s ? setItem(setItem(b, 'constraints.maxSpace', { w: s.w, d: s.d }, 'hard'), 'constraints.spaceGate', true, 'hard') : clearItem(clearItem(b, 'constraints.maxSpace'), 'constraints.spaceGate');
}
/** Brief -> the figures the Suggest panel's fields hold (startup budget, monthly, minutes, space). */
export const constraintsOf = (b: Brief) => ({ startupUsd: budgetOf(b), monthlyUsd: monthlyOf(b), minutesPerWeek: careTimeOf(b), space: spaceOf(b) });

export type Experience = 0 | 1 | 2;
export const EXPERIENCE: readonly { id: Experience; label: string }[] = [{ id: 0, label: 'Beginner' }, { id: 1, label: 'Some experience' }, { id: 2, label: 'Experienced' }];
/** Experience is context, never a limit: it shapes the difficulty explanation and the learning path, and nothing is rejected for it. */
export const setExperience = (b: Brief, e: Experience | undefined): Brief => e === undefined ? clearItem(b, 'preferences.experience') : setItem(b, 'preferences.experience', e, 'preference');
/** Equipment already owned (the generator credits it): one entry per piece in `constraints.owned`. */
export function setOwnedKey(b: Brief, key: string, on: boolean): Brief {
  const map: OwnedMap = { ...(valueOf(b, 'constraints.owned') ?? {}) };
  if (on) map[key as keyof OwnedMap] = PICK_CARE; else delete map[key as keyof OwnedMap];
  return Object.keys(map).length ? setItem(b, 'constraints.owned', map, 'hard') : clearItem(b, 'constraints.owned');
}
export const ownedKeys = (b: Brief): string[] => Object.keys(valueOf(b, 'constraints.owned') ?? {});
export const OWNED_CHOICES = OWNED.map(o => ({ id: o.id as string, label: o.label }));
const setTag = (b: Brief, t: Tag, on: boolean): Brief => {
  const cur = (valueOf(b, 'preferences.tags') ?? []).filter(x => x !== t), next = on ? [...cur, t] : cur;
  return next.length ? setItem(b, 'preferences.tags', next, 'preference') : clearItem(b, 'preferences.tags');
};

const SPACES: Record<string, { w: number; d: number }> = { sm: { w: 610, d: 305 }, md: { w: 915, d: 380 }, lg: { w: 1220, d: 460 } };
/** Apply an answer to the brief. A "no limit" or "either" writes nothing: the caller records it as answered (see `answered` in NextCtx). */
export function answer(b: Brief, q: QId, option: string): Brief {
  switch (q) {
    case 'priority': return option === 'lowmaint' ? setTag(b, 'low-maint', true) : option === 'small' ? setItem(b, 'preferences.wishes', ['cheaper'], 'preference') : b;
    case 'activity': return option === 'active' || option === 'calm' ? setTag(setTag(b, option === 'active' ? 'calm' : 'active', false), option, true) : b;
    case 'look': return setLook(b, option as LookStyle, 'preference');
    case 'space': return SPACES[option] ? setSpace(b, SPACES[option]) : b;
    case 'careTime': return option === 'none' ? b : setCareTime(b, +option);
  }
}

// ---------- the button that fits where the person is ----------
export type PrimaryId = 'animals' | 'styles' | 'equipment' | 'explore' | 'generate';
/** The one next step, by what the brief holds. `entry` = the card last pressed on the Welcome screen, for a person who picked a card but has nothing in it yet.
 *  (Refine this setup / Build my aquarium belong to a chosen concept: lanes U6 / U7.) */
export function primaryAction(b: Brief, entry?: 'animals' | 'appearance' | 'equipment' | 'open'): { id: PrimaryId; label: string } {
  const animals = lockedStock(b).length > 0, look = !!valueOf(b, 'appearance.look'), gear = !!(valueOf(b, 'equipment.tank') || valueOf(b, 'constraints.existingTank') || valueOf(b, 'constraints.owned'));
  if (animals || (look ? 1 : 0) + (gear ? 1 : 0) >= 2) return { id: 'generate', label: 'Generate setup concepts' };
  if (entry === 'animals') return { id: 'animals', label: 'Choose animals' };
  if (look || entry === 'appearance') return { id: 'styles', label: 'Explore styles' };
  if (gear || entry === 'equipment') return { id: 'equipment', label: 'Add my equipment' };
  return { id: 'explore', label: 'Explore setup ideas' };
}

// ---------- the brief of the tank on screen ----------
// One brief per tank: it lives in `TankSetup.brief`, so it saves, shares and undoes with the tank. `bindBriefStore` is called once at start-up.
// The budget, monthly and minutes caps are copied to `TankSetup.constraints` (the brief wins) so the guardrail line keeps working.
type Listener = (b: Brief) => void;
const NONE = emptyBrief();
let bound: Store | undefined, last: Brief = NONE;
const listeners = new Set<Listener>();
export const getBrief = (): Brief => bound?.tank.brief ?? NONE;
const CAPS = [['constraints.budget', 'startupUsd'], ['constraints.monthly', 'monthlyUsd'], ['constraints.careMin', 'minutesPerWeek']] as const;
function syncCaps(T: TankSetup, before: Brief, after: Brief) {
  const c = { ...(T.constraints ?? {}) };
  for (const [id, key] of CAPS) {
    const it = getItem(after, id);
    if (it?.value !== undefined) c[key] = { on: !it.off, value: it.value }; else if (getItem(before, id)) delete c[key];   // the guardrail shape holds the upper bound only
  }
  if (Object.keys(c).length) T.constraints = c; else delete T.constraints;
}
export function setBrief(b: Brief) {
  if (!bound) return;
  const before = getBrief();
  bound.update(s => {
    const T = s.tanks[s.active];
    if (!hasState(b)) delete T.brief; else T.brief = b;
    syncCaps(T, before, b);
  });
}
export const editBrief = (fn: (b: Brief) => Brief) => setBrief(fn(getBrief()));
export const onBrief = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function bindBriefStore(s: Store) {
  bound = s; last = getBrief();
  s.subscribe(() => { const b = getBrief(); if (b !== last) { last = b; for (const fn of listeners) fn(b); } });
}
