// Lane U3: the setup brief's pure logic: five groups, locks, and progressive discovery (nextQuestions).
import { describe, expect, it } from 'vitest';
import { setMonthly, setPref, findPref, answer, emptyBrief, lockAnimals, nextQuestions, removeItem, setBudget, setLook, setSpace, setTank, summarise, toggleLock, lockedAnimals } from '../src/ui/setupBrief';

const ids = (b: ReturnType<typeof emptyBrief>, gal?: number) => nextQuestions(b, { animalTankGal: gal }).questions.map(q => q.id);

describe('summarise', () => {
  it('has the five groups, open when empty, locked items marked', () => {
    const rows = summarise(emptyBrief());
    expect(rows.map(r => r.label)).toEqual(['Animals', 'Appearance', 'Tank and equipment', 'Constraints', 'Preferences']);
    expect(rows.every(r => r.open)).toBe(true);
    const b = lockAnimals(emptyBrief(), [{ species: 'betta', name: 'betta', n: 1 }]);
    expect(summarise(b)[0]).toMatchObject({ open: false, text: '1 betta (locked)' });
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
    const b = lockAnimals(emptyBrief(), [{ species: 'betta', name: 'betta', n: 1 }]);
    expect(nextQuestions(b, { animalTankGal: 5 })).toEqual({ action: 'generate', questions: [] });
  });
  it('an owned 40 gallon tank: no space question, ever', () => {
    let b = setTank(emptyBrief(), { id: 't40', label: '40 gal breeder', owned: true });
    expect(ids(b)).toEqual(['priority']);
    b = answer(b, 'priority', 'animals');
    expect(ids(b)).toEqual(['activity']);
    expect(ids(answer(b, 'activity', 'calm'))).toEqual([]);
  });
  it('goldfish + $200: evaluate before proposing; the space question still waits behind it', () => {
    const b = setBudget(lockAnimals(emptyBrief(), [{ species: 'goldfish', name: 'goldfish', n: 1 }]), 200);
    const n = nextQuestions(b, { animalTankGal: 20 });
    expect(n.action).toBe('evaluate');
    expect(n.questions.map(q => q.id)).toEqual(['space']);
  });
  it('a betta + $200 is also evaluated first, with nothing left to ask', () => {
    const b = setBudget(lockAnimals(emptyBrief(), [{ species: 'betta', name: 'betta', n: 1 }]), 200);
    expect(nextQuestions(b, { animalTankGal: 5 })).toEqual({ action: 'evaluate', questions: [] });
  });
});

describe('nextQuestions: follow-ups', () => {
  it('"how it looks" asks the look, not lively / calm; answering it fills Appearance', () => {
    let b = answer(setBudget(emptyBrief(), 200), 'priority', 'look');
    expect(ids(b)).toEqual(['look']);
    b = answer(b, 'look', 'iwagumi');
    expect(summarise(b)[1].text).toBe('Iwagumi');
    expect(ids(b)).not.toContain('look');
  });
  it('a locked look asks space once, and an answer (even "no limit") stops it', () => {
    let b = setLook(emptyBrief(), 'jungle');
    expect(ids(b)).toContain('space');
    b = answer(b, 'space', 'none');
    expect(ids(b)).not.toContain('space');
  });
  it('"little upkeep" asks the time a week', () => {
    const b = answer(emptyBrief(), 'priority', 'lowmaint');
    expect(ids(answer(answer(b, 'activity', 'either'), 'space', 'none'))).toEqual(['careTime']);
  });
  it('a picked (not owned) tank is also not asked about space', () => {
    expect(ids(setTank(setLook(emptyBrief(), 'nature'), { id: 'g20', label: '20 gal long' }))).toEqual(['activity']);
  });
});

describe('locks and setters', () => {
  it('toggleLock flips an item, a setter does not change its input, removeItem drops it', () => {
    const b0 = setLook(emptyBrief(), 'reef', 'preference');
    const b1 = toggleLock(b0, 'look:reef');
    expect(b0.groups.appearance[0].status).toBe('preference');
    expect(b1.groups.appearance[0].status).toBe('locked');
    expect(removeItem(b1, 'look:reef').groups.appearance).toEqual([]);
  });
  it('lockAnimals replaces the earlier animals and locks them', () => {
    let b = lockAnimals(emptyBrief(), [{ species: 'betta', name: 'betta', n: 1 }]);
    b = lockAnimals(b, [{ species: 'neon', name: 'neon tetra', n: 8 }, { species: 'cory', name: 'corydoras', n: 0 }]);
    expect(lockedAnimals(b).map(i => i.key)).toEqual(['animal:neon']);
  });
  it('space is held in mm and labelled in the person\'s units', () => {
    expect(setSpace(emptyBrief(), { w: 915, d: 380 }, 'in').groups.constraints[0].label).toBe('space 36 x 15 in');
  });
  it('a budget is a hard item; a second one replaces the first; none removes it', () => {
    let b = setBudget(emptyBrief(), 200);
    b = setBudget(b, 150);
    expect(b.groups.constraints).toHaveLength(1);
    expect(b.groups.constraints[0]).toMatchObject({ status: 'hard', value: 150 });
    expect(setBudget(b, undefined).groups.constraints).toEqual([]);
  });
});

describe('welcome limits column', () => {
  it('monthly budget is a hard item; a preference chip toggles and does not hide the lively / calm question', () => {
    expect(setMonthly(emptyBrief(), 30).groups.constraints[0]).toMatchObject({ key: 'monthly', status: 'hard', value: 30 });
    let b = setPref(setLook(emptyBrief(), 'nature'), 'colorful', true);
    expect(findPref(b, 'colorful')).toBeTruthy();
    expect(ids(b)).toContain('activity');
    b = setPref(b, 'colorful', false);
    expect(findPref(b, 'colorful')).toBeUndefined();
  });
});

describe('resources, context and the primary action', () => {
  it('experience is context (a preference item, never a limit); set-up time and upkeep time are separate; blank = unspecified', async () => {
    const m = await import('../src/ui/setupBrief');
    let b = m.setExperience(m.emptyBrief(), 0);
    expect(b.groups.preferences[0]).toMatchObject({ key: 'experience', status: 'preference' });
    expect(b.groups.constraints).toEqual([]);
    b = m.setCareTime(m.setSetupTime(b, 6), 30);
    expect(m.setupTimeOf(b)).toBe(6); expect(m.careTimeOf(b)).toBe(30);
    expect(m.budgetOf(m.emptyBrief())).toBeUndefined();
    expect(m.ownedKeys(m.setOwnedKey(b, 'filter', 'Filter', true))).toEqual(['filter']);
  });
  it('the primary button follows progress', async () => {
    const m = await import('../src/ui/setupBrief');
    const e = m.emptyBrief(), betta = m.lockAnimals(e, [{ species: 'betta', name: 'Betta', n: 1 }]);
    expect(m.primaryAction(e).label).toBe('Explore setup ideas');
    expect(m.primaryAction(e, 'animals').label).toBe('Choose animals');
    expect(m.primaryAction(m.setLook(e, 'jungle')).label).toBe('Explore styles');
    expect(m.primaryAction(m.setTank(e, { id: 't', label: '40 gal', owned: true })).label).toBe('Add my equipment');
    expect(m.primaryAction(betta).label).toBe('Generate setup concepts');
    expect(m.primaryAction(m.setTank(m.setLook(e, 'jungle'), { id: 't', label: 'x' })).label).toBe('Generate setup concepts');
  });
});
