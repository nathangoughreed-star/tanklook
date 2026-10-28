// Lane U3: the setup brief's UI logic over U1's Brief: five groups, locks, progressive discovery (nextQuestions), the primary action, and the brief
// living in the tank (saved, undoable, budget copied to the guardrails).
import { describe, expect, it } from 'vitest';
import { getItem, valueOf } from '../src/scene/brief';
import { Store } from '../src/scene/store';
import { defaultScene } from '../src/scene/defaults';
import {
  answer, bindBriefStore, careTimeOf, editBrief, emptyBrief, experienceOf, getBrief, lockAnimals, lockedStock, nextQuestions, ownedKeys, primaryAction, removeItem, setBudget, setCareTime, setExperience,
  setLook, setMonthly, setOwnedKey, setSpace, setTank, summarise, toggleLock, budgetOf, type NextCtx, type QId,
} from '../src/ui/setupBrief';

const ids = (b: ReturnType<typeof emptyBrief>, ctx: NextCtx = {}) => nextQuestions(b, ctx).questions.map(q => q.id);
const betta = () => lockAnimals(emptyBrief(), [{ species: 'betta', n: 1 }]);

describe('summarise', () => {
  it('has the five groups, open when empty, locked items marked; owned gear reads under Tank and equipment', () => {
    const rows = summarise(emptyBrief());
    expect(rows.map(r => r.label)).toEqual(['Animals', 'Appearance', 'Tank and equipment', 'Constraints', 'Preferences']);
    expect(rows.every(r => r.open)).toBe(true);
    expect(summarise(betta())[0]).toMatchObject({ open: false, text: '1 Betta (locked)' });
    expect(summarise(setOwnedKey(emptyBrief(), 'filter', true))[2].text).toBe('own filter');
  });
});

describe('nextQuestions: the five starting cases', () => {
  it('nothing set: no questions, generate', () => {
    expect(nextQuestions(emptyBrief())).toEqual({ action: 'generate', questions: [] });
  });
  it('only a $200 budget: ask what they care most about, nothing else yet', () => {
    const n = nextQuestions(setBudget(emptyBrief(), 200));
    expect(n.action).toBe('ask');
    expect(n.questions.map(q => q.id)).toEqual(['priority']);
  });
  it('a betta locked: no lively / calm question, no space question (a small tank), generate', () => {
    expect(nextQuestions(betta(), { animalTankGal: 5 })).toEqual({ action: 'generate', questions: [] });
  });
  it('an owned 40 gallon tank: no space question, ever', () => {
    const b = setTank(emptyBrief(), { id: 't40', owned: true });
    expect(ids(b)).toEqual(['priority']);
    expect(ids(b, { direction: 'animals' })).toEqual(['activity']);
    expect(ids(b, { direction: 'animals', answered: ['activity'] })).toEqual([]);
  });
  it('goldfish + $200: evaluate before proposing; the space question still waits behind it', () => {
    const b = setBudget(lockAnimals(emptyBrief(), [{ species: 'goldfish', n: 1 }]), 200);
    const n = nextQuestions(b, { animalTankGal: 20 });
    expect(n.action).toBe('evaluate');
    expect(n.questions.map(q => q.id)).toEqual(['space']);
  });
  it('a betta + $200 is also evaluated first, with nothing left to ask', () => {
    expect(nextQuestions(setBudget(betta(), 200), { animalTankGal: 5 })).toEqual({ action: 'evaluate', questions: [] });
  });
});

describe('nextQuestions: follow-ups', () => {
  it('"how it looks" asks the look first, not lively / calm; answering it fills Appearance', () => {
    let b = setBudget(emptyBrief(), 200);
    expect(ids(b, { direction: 'look' })).toEqual(['look']);
    b = answer(b, 'look', 'iwagumi');
    expect(summarise(b)[1].text).toBe('Iwagumi');
    expect(ids(b, { direction: 'look' })).not.toContain('look');
  });
  it('a locked look asks space once; an answer (even "no limit", which leaves nothing in the brief) stops it', () => {
    const b = setLook(emptyBrief(), 'jungle');
    expect(ids(b)).toContain('space');
    expect(ids(b, { answered: ['space' as QId] })).not.toContain('space');
    expect(ids(answer(b, 'space', 'md'))).not.toContain('space');
  });
  it('"little upkeep" asks the time a week', () => {
    const b = answer(setBudget(emptyBrief(), 100), 'priority', 'lowmaint');
    expect(ids(b, { direction: 'lowmaint', answered: ['activity', 'space'] })).toEqual(['careTime']);
    expect(careTimeOf(answer(b, 'careTime', '30'))).toBe(30);
  });
  it('a picked (not owned) tank is also not asked about space', () => {
    expect(ids(setTank(setLook(emptyBrief(), 'nature'), { id: 'g20' }))).toEqual(['activity']);
  });
  it('lively / calm answers are one tag, replacing each other', () => {
    let b = answer(setLook(emptyBrief(), 'nature'), 'activity', 'active');
    b = answer(b, 'activity', 'calm');
    expect(valueOf(b, 'preferences.tags')).toEqual(['calm']);
  });
});

describe('locks and setters', () => {
  it('toggleLock flips an item, a setter does not change its input, removeItem drops it', () => {
    const b0 = setLook(emptyBrief(), 'reef', 'preference');
    const b1 = toggleLock(b0, 'appearance.look');
    expect(getItem(b0, 'appearance.look')?.status).toBe('preference');
    expect(getItem(b1, 'appearance.look')?.status).toBe('locked');
    expect(removeItem(b1, 'appearance.look').items).toEqual({});
  });
  it('lockAnimals replaces the earlier animals and locks them', () => {
    const b = lockAnimals(betta(), [{ species: 'neon', n: 8 }, { species: 'cory', n: 0 }]);
    expect(lockedStock(b)).toEqual([{ species: 'neon', n: 8 }]);
    expect(lockedStock(toggleLock(b, 'animals.stock'))).toEqual([]);
  });
  it('space is held in mm and switches the space guardrail on; none clears both', () => {
    const b = setSpace(emptyBrief(), { w: 915, d: 380 });
    expect(valueOf(b, 'constraints.maxSpace')).toEqual({ w: 915, d: 380 });
    expect(valueOf(b, 'constraints.spaceGate')).toBe(true);
    expect(summarise(b)[3].text).toBe('space 36 x 15 in');
    expect(setSpace(b, undefined).items).toEqual({});
  });
  it('a budget is a hard item; a second one replaces the first; none removes it; blank is unspecified', () => {
    let b = setBudget(emptyBrief(), 200);
    b = setBudget(b, 150);
    expect(getItem(b, 'constraints.budget')).toMatchObject({ status: 'hard', value: 150 });
    expect(budgetOf(setBudget(b, undefined))).toBeUndefined();
    expect(budgetOf(emptyBrief())).toBeUndefined();
  });
  it('monthly is hard; experience is context (a preference, never a limit); owned gear toggles', () => {
    expect(getItem(setMonthly(emptyBrief(), 30), 'constraints.monthly')).toMatchObject({ status: 'hard', value: 30 });
    const b = setExperience(emptyBrief(), 0);
    expect(getItem(b, 'preferences.experience')?.status).toBe('preference');
    expect(experienceOf(b)).toBe(0);
    expect(ownedKeys(setOwnedKey(setOwnedKey(emptyBrief(), 'filter', true), 'heater', true))).toEqual(['filter', 'heater']);
    expect(ownedKeys(setOwnedKey(setOwnedKey(emptyBrief(), 'filter', true), 'filter', false))).toEqual([]);
  });
});

describe('the primary button follows progress', () => {
  it('names the next step', () => {
    const e = emptyBrief();
    expect(primaryAction(e).label).toBe('Explore setup ideas');
    expect(primaryAction(e, 'animals').label).toBe('Choose animals');
    expect(primaryAction(setLook(e, 'jungle')).label).toBe('Explore styles');
    expect(primaryAction(setTank(e, { id: 't', owned: true })).label).toBe('Add my equipment');
    expect(primaryAction(betta()).label).toBe('Generate setup concepts');
    expect(primaryAction(setTank(setLook(e, 'jungle'), { id: 't' })).label).toBe('Generate setup concepts');
  });
});

describe('the brief lives in the tank', () => {
  it('editBrief saves in TankSetup.brief, undoes with the tank, and copies the budget to the guardrails (the brief wins)', () => {
    const store = new Store(defaultScene());
    bindBriefStore(store);
    expect(getBrief().items).toEqual({});
    editBrief(b => setBudget(b, 200));
    expect(store.tank.brief && valueOf(store.tank.brief, 'constraints.budget')).toBe(200);
    expect(store.tank.constraints?.startupUsd).toEqual({ on: true, value: 200 });
    editBrief(b => setCareTime(setBudget(b, 150), 30));
    expect(store.tank.constraints?.startupUsd?.value).toBe(150);
    expect(store.tank.constraints?.minutesPerWeek?.value).toBe(30);
    editBrief(b => setBudget(b, undefined));
    expect(store.tank.constraints?.startupUsd).toBeUndefined();
    expect(store.tank.constraints?.minutesPerWeek?.value).toBe(30);
    store.undo();
    expect(store.tank.constraints?.startupUsd?.value).toBe(150);
  });
});
