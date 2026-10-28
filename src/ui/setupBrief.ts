// The setup brief as the entry points use it (lane U3, 2026-10-28): the pure part. Entry tiles only PRE-FILL a brief; `summarise` says what
// is set and what is open per group; `nextQuestions` is progressive discovery (ask only what would change the design); the setters build the
// next brief from a choice. No DOM, no engine: the bar (briefBar.ts) draws it, and the feasibility numbers come from the existing totals and
// `compliance` (scene/constraints.ts), never re-derived here. Welfare is not a brief item: it is a gate the generator always applies.
import { LOOK_TILES, lookLabel, type LookStyle } from '../scene/looks';
import { GROUPS, briefItems, emptyBrief, findItem, hasPrefix, isEmpty, type Brief, type BriefItem, type GroupId, type ItemStatus } from './briefShape';

export { emptyBrief, isEmpty, GROUPS };
export type { Brief, BriefItem, GroupId, ItemStatus };

const MM_IN = 25.4;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// ---------- reading the brief ----------
export interface GroupView { id: GroupId; label: string; items: BriefItem[]; /** what the row says */ text: string; open: boolean }
const OPEN_TEXT: Record<GroupId, string> = { animals: 'open', appearance: 'open', tank: 'open', constraints: 'none set', preferences: 'none set' };
/** Five rows: the items that are set (locked ones marked), or "open" when nothing is. */
export function summarise(b: Brief): GroupView[] {
  return GROUPS.map(g => {
    const items = b.groups[g.id];
    return { id: g.id, label: g.label, items, open: !items.length, text: items.length ? items.map(i => i.status === 'locked' ? `${i.label} (locked)` : i.label).join(', ') : OPEN_TEXT[g.id] };
  });
}
export const lockedAnimals = (b: Brief) => b.groups.animals.filter(i => i.status === 'locked');
const num = (b: Brief, key: string) => { const v = findItem(b, key)?.value; return typeof v === 'number' ? v : undefined; };
export const budgetOf = (b: Brief) => num(b, 'budget');
export const careTimeOf = (b: Brief) => num(b, 'careTime');
export const spaceOf = (b: Brief): { w: number; d: number } | undefined => { const v = findItem(b, 'space')?.value; return v && typeof v === 'object' && 'w' in v ? v : undefined; };

// ---------- progressive discovery ----------
export interface QOption { id: string; label: string }
export interface Question { id: 'priority' | 'activity' | 'look' | 'space' | 'careTime'; text: string; why: string; options: QOption[] }
export interface Next {
  /** generate = enough to design now; ask = show these questions first; evaluate = a locked animal under a hard limit: check it fits before proposing anything */
  action: 'generate' | 'ask' | 'evaluate';
  questions: Question[];
}
/** What the caller can tell us that the brief itself cannot: the smallest tank (US gal) the locked animals need, from the stocking engine. */
export interface NextCtx { animalTankGal?: number }
/** A tank this small (or smaller) is no real space constraint: a betta locked in does not make us ask how much room there is. */
export const SMALL_GAL = 10;

const QUESTIONS: Record<Question['id'], Question> = {
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
 *  - a tank held (owned or picked): no space question.   - a locked animal under a hard limit: evaluate before proposing. */
export function nextQuestions(b: Brief, ctx: NextCtx = {}): Next {
  if (isEmpty(b)) return { action: 'generate', questions: [] };
  const animals = lockedAnimals(b).length > 0, hasLook = b.groups.appearance.length > 0, hasTank = b.groups.tank.length > 0;
  const hardLimit = b.groups.constraints.some(i => i.status === 'hard' && i.value !== undefined);
  const prio = hasPrefix(b, 'priority:'), cares = prio || animals || hasLook; // a direction is known
  const wantsLook = !!findItem(b, 'priority:look') && !hasLook;
  const q: Question[] = [];
  if (!cares) q.push(QUESTIONS.priority);
  else {
    if (!animals && wantsLook) return { action: 'ask', questions: [QUESTIONS.look] }; // the look first: it changes what the rest means
    if (!animals && !['active', 'calm', 'either'].some(x => findPref(b, x))) q.push(QUESTIONS.activity);
    const bigNeed = animals ? (ctx.animalTankGal === undefined || ctx.animalTankGal > SMALL_GAL) : true;
    if (!hasTank && !findItem(b, 'space') && bigNeed) q.push(QUESTIONS.space);
    if (findItem(b, 'priority:lowmaint') && !findItem(b, 'careTime')) q.push(QUESTIONS.careTime);
  }
  const evaluate = animals && hardLimit;
  return { action: evaluate ? 'evaluate' : q.length ? 'ask' : 'generate', questions: q };
}

// ---------- setters: each returns the next brief (the input is not changed) ----------
const clone = (b: Brief): Brief => structuredClone(b);
const put = (b: Brief, g: GroupId, it: BriefItem, replacePrefix?: string): Brief => {
  const n = clone(b);
  n.groups[g] = n.groups[g].filter(i => i.key !== it.key && !(replacePrefix && i.key.startsWith(replacePrefix)));
  n.groups[g].push(it);
  return n;
};
const drop = (b: Brief, pred: (i: BriefItem) => boolean): Brief => { const n = clone(b); for (const g of GROUPS) n.groups[g.id] = n.groups[g.id].filter(i => !pred(i)); return n; };

export const removeItem = (b: Brief, key: string) => drop(b, i => i.key === key);
export function toggleLock(b: Brief, key: string): Brief {
  const n = clone(b);
  for (const g of GROUPS) for (const i of n.groups[g.id]) if (i.key === key) i.status = i.status === 'locked' ? 'preference' : 'locked';
  return n;
}
/** The animals the person chose (stocking builder): locked, one item per species. Replaces the earlier animals. */
export function lockAnimals(b: Brief, animals: { species: string; name: string; n: number }[]): Brief {
  const n = clone(b);
  n.groups.animals = animals.filter(a => a.n > 0).map(a => ({ key: `animal:${a.species}`, label: `${a.n} ${a.name}`, status: 'locked' as const, value: { species: a.species, n: a.n } }));
  return n;
}
/** The look chosen in the look picker. Locked: it is what the person came for. */
export const setLook = (b: Brief, style: LookStyle | undefined, status: ItemStatus = 'locked'): Brief =>
  style ? put(b, 'appearance', { key: `look:${style}`, label: lookLabel(style), status }, 'look:') : drop(b, i => i.key.startsWith('look:'));
/** A tank the person picked (preference: the generator may suggest a bigger one) or owns (locked: it is what they have). */
export const setTank = (b: Brief, tank: { id: string; label: string; owned?: boolean } | undefined): Brief =>
  tank ? put(b, 'tank', { key: tank.owned ? 'tank:owned' : `tank:${tank.id}`, label: tank.owned ? `own ${tank.label}` : tank.label, status: tank.owned ? 'locked' : 'preference' }, 'tank:') : drop(b, i => i.key.startsWith('tank:'));
export const setBudget = (b: Brief, v: number | undefined): Brief =>
  v === undefined || !(v >= 0) ? removeItem(b, 'budget') : put(b, 'constraints', { key: 'budget', label: `up to ${usd(v)}`, status: 'hard', value: v });
export const setMonthly = (b: Brief, v: number | undefined): Brief =>
  v === undefined || !(v >= 0) ? removeItem(b, 'monthly') : put(b, 'constraints', { key: 'monthly', label: `up to ${usd(v)} a month`, status: 'hard', value: v });
export const findPref = (b: Brief, id: string) => findItem(b, `pref:${id}`);
export const monthlyOf = (b: Brief) => num(b, 'monthly');
export const setPref = (b: Brief, id: string, on: boolean): Brief =>
  on ? put(b, 'preferences', { key: `pref:${id}`, label: id, status: 'preference' }) : removeItem(b, `pref:${id}`);
export const setCareTime = (b: Brief, v: number | undefined): Brief =>
  v === undefined || !(v >= 0) ? removeItem(b, 'careTime') : put(b, 'constraints', { key: 'careTime', label: `up to ${v} min a week`, status: 'hard', value: v });
export const setSpace = (b: Brief, s: { w: number; d: number } | undefined, units: 'in' | 'cm' = 'in'): Brief => {
  if (!s) return removeItem(b, 'space');
  const k = units === 'in' ? MM_IN : 10, r = (mm: number) => Math.round(mm / k * 10) / 10;
  return put(b, 'constraints', { key: 'space', label: `space ${r(s.w)} x ${r(s.d)} ${units}`, status: 'hard', value: { w: s.w, d: s.d } });
};
/** Brief -> the figures the Suggest panel's fields hold (startup budget, minutes, space). */
export const constraintsOf = (b: Brief) => ({ startupUsd: budgetOf(b), monthlyUsd: monthlyOf(b), minutesPerWeek: careTimeOf(b), space: spaceOf(b) });

const SPACES: Record<string, { w: number; d: number }> = { sm: { w: 610, d: 305 }, md: { w: 915, d: 380 }, lg: { w: 1220, d: 460 } };
/** Apply an answer to a question: what the question's option writes into the brief. */
export function answer(b: Brief, q: Question['id'], option: string, units: 'in' | 'cm' = 'in'): Brief {
  const label = QUESTIONS[q].options.find(o => o.id === option)?.label ?? option;
  switch (q) {
    case 'priority': return put(b, 'preferences', { key: `priority:${option}`, label: `most important: ${label.toLowerCase()}`, status: 'preference' }, 'priority:');
    case 'activity': return put(b, 'preferences', { key: `pref:${option}`, label: option === 'either' ? 'lively or calm' : label.split(',')[0].toLowerCase(), status: 'preference' }, 'pref:');
    case 'look': return setLook(b, option as LookStyle, 'preference');
    case 'space': return option === 'none' ? put(b, 'constraints', { key: 'space', label: 'no space limit', status: 'preference' }) : setSpace(b, SPACES[option], units);
    case 'careTime': return option === 'none' ? put(b, 'constraints', { key: 'careTime', label: 'no time limit', status: 'preference' }) : setCareTime(b, +option);
  }
}

// ---------- resources and context (Nathan's design note 2026-10-28) ----------
export type Experience = 0 | 1 | 2;
export const EXPERIENCE: readonly { id: Experience; label: string }[] = [{ id: 0, label: 'Beginner' }, { id: 1, label: 'Some experience' }, { id: 2, label: 'Experienced' }];
/** Experience is context, never a limit: it shapes the difficulty explanation and the learning path, and nothing is rejected for it. */
export const setExperience = (b: Brief, e: Experience | undefined): Brief =>
  e === undefined ? removeItem(b, 'experience') : put(b, 'preferences', { key: 'experience', label: EXPERIENCE[e].label.toLowerCase(), status: 'preference', value: e });
export const experienceOf = (b: Brief) => num(b, 'experience') as Experience | undefined;
/** Initial set-up time, hours: separate from the upkeep minutes a week (a weekend of building is fine for someone who wants 30 minutes a week). A field only: the model that derives it is a later lane. */
export const setSetupTime = (b: Brief, hours: number | undefined): Brief =>
  hours === undefined || !(hours >= 0) ? removeItem(b, 'setupTime') : put(b, 'constraints', { key: 'setupTime', label: `set-up within ${hours} h`, status: 'hard', value: hours });
export const setupTimeOf = (b: Brief) => num(b, 'setupTime');
/** Equipment already owned (the generator credits it): one item per piece, Tank and equipment group. */
export const setOwnedKey = (b: Brief, key: string, label: string, on: boolean): Brief =>
  on ? put(b, 'tank', { key: `owned:${key}`, label: `own ${label.toLowerCase()}`, status: 'locked' }) : removeItem(b, `owned:${key}`);
export const ownedKeys = (b: Brief) => b.groups.tank.filter(i => i.key.startsWith('owned:')).map(i => i.key.slice(6));

// ---------- the button that fits where the person is ----------
export type PrimaryId = 'animals' | 'styles' | 'equipment' | 'explore' | 'generate';
/** The one next step, by what the brief holds. `entry` = the card last pressed on the Welcome screen, for the person who has picked a card but nothing in it yet.
 *  (Refine / Build my aquarium belong to a chosen concept: lane U6.) */
export function primaryAction(b: Brief, entry?: 'animals' | 'appearance' | 'equipment' | 'open'): { id: PrimaryId; label: string } {
  const animals = lockedAnimals(b).length > 0, look = b.groups.appearance.length > 0, gear = b.groups.tank.length > 0;
  if ((animals ? 1 : 0) + (look ? 1 : 0) + (gear ? 1 : 0) >= 2 || (animals && budgetOf(b) !== undefined)) return { id: 'generate', label: 'Generate setup concepts' };
  if (animals) return { id: 'generate', label: 'Generate setup concepts' };
  if (entry === 'animals') return { id: 'animals', label: 'Choose animals' };
  if (look || entry === 'appearance') return { id: 'styles', label: 'Explore styles' };
  if (gear || entry === 'equipment') return { id: 'equipment', label: 'Add my equipment' };
  return { id: 'explore', label: 'Explore setup ideas' };
}

// ---------- the brief as one shared object ----------
// One brief for the whole page: the bar, the stocking builder, the look picker, the tank chooser and the Suggest panel read and write it here.
// (Persistence with the project is lane U1's: this holds it in memory until its save / load lands.)
type Listener = (b: Brief) => void;
let current: Brief = emptyBrief();
const listeners = new Set<Listener>();
export const getBrief = () => current;
export const setBrief = (b: Brief) => { current = b; for (const fn of listeners) fn(b); };
export const editBrief = (fn: (b: Brief) => Brief) => setBrief(fn(current));
export const onBrief = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const briefItemCount = (b: Brief) => briefItems(b).length;
