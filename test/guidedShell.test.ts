// Guided Setup Rev 03, the shared onboarding shell (lane GS4): the pure parts of ui/guided/ and the Required / Available sheet in ui/ownedGear.ts. No DOM: the screens
// are checked in the browser (shots/gs4/), what they WRITE is checked here.
import { describe, expect, it } from 'vitest';
import { briefToWants, emptyBrief, getItem, projectExtras, valueOf, visionOf, setVision, type Brief } from '../src/scene/brief';
import { constraintOf, constraintsOf, equipmentOf, onboardingOf, projectOf, setEquipment, setScratch, worldOf, routeOf, CONSTRAINT_IDS, DEFAULT_LIMIT_KINDS } from '../src/scene/project';
import { GENERIC, emptyOwned, ownedStateOf, syncEquipment, useOf } from '../src/ui/ownedGear';
import { lockAnimals } from '../src/ui/setupBrief';
import {
  LIMIT_FIELDS, ONBOARD_STEPS, START_CARDS, WORLD_CARDS, applyKind, applyLimit, chooseRoute, chooseWorld, customTankModel, exploresOf, kindOfLimit, nextOnboard,
  onboardCrumbs, ownedTankList, ownedTankOf, parseDims, placeOf, prevOnboard, setSuggested, skipEquipment, skipLimits, skippedLine, suggestedOf,
} from '../src/ui/guided/logic';
import { getTankModel } from '../src/data/tanks';

const fresh = (): Brief => emptyBrief();
const ticked = (use: 'required' | 'available' | undefined, model = 'g40b') => { const s = emptyOwned(); s.on.add('tank'); s.model = model; s.tank = model; if (use) s.use = { tank: use }; return s; };

describe('the breadcrumb and where Guided opens', () => {
  it('shows the four onboarding steps with the current one marked, and walks them in order', () => {
    expect(onboardCrumbs('limits').map(c => [c.label, c.state])).toEqual([['World', 'done'], ['Equipment', 'done'], ['Limits', 'current'], ['Starting Point', 'todo']]);
    expect(ONBOARD_STEPS.map(s => nextOnboard(s))).toEqual(['equipment', 'limits', 'start', undefined]);
    expect(ONBOARD_STEPS.map(s => prevOnboard(s))).toEqual([undefined, 'world', 'equipment', 'limits']);
  });
  it('opens at the first step still waiting (a skipped step counts as answered), at the step asked for, and back inside the route once everything is settled', () => {
    let b = fresh();
    expect(placeOf(b)).toEqual({ at: 'world' });
    expect(placeOf(b, 'equipment')).toEqual({ at: 'equipment' });   // "Starting from something I have now"
    b = chooseWorld(b, 'aquarium'); expect(placeOf(b)).toEqual({ at: 'equipment' });
    b = skipEquipment(b); expect(placeOf(b)).toEqual({ at: 'limits' });
    b = skipLimits(b); expect(placeOf(b)).toEqual({ at: 'start' });
    b = chooseRoute(b, 'look'); expect(placeOf(b)).toEqual({ route: 'look' });
  });
});

describe('World: Aquarium, Terrarium, Paludarium, Open to anything', () => {
  it('has four cards and never asks the water here', () => {
    expect(WORLD_CARDS.map(c => c.id)).toEqual(['aquarium', 'terrarium', 'paludarium', 'any']);
    const b = chooseWorld(fresh(), 'aquarium');
    expect(worldOf(b)).toBe('aquarium'); expect(visionOf(b).waterType).toBeUndefined();
  });
  it('Open to anything is its own world: after Limits the branch step is Explore, not Animals First / Look First', () => {
    const b = chooseWorld(fresh(), 'any');
    expect(worldOf(b)).toBe('any'); expect(visionOf(b).environment).toBeUndefined(); expect(exploresOf(b)).toBe(true);
    expect(WORLD_CARDS.find(c => c.id === 'any')!.tagline).not.toMatch(/a little later/);
    expect(onboardCrumbs('limits', 'any').map(c => c.label)).toEqual(['World', 'Equipment', 'Limits', 'Explore']);
    expect(onboardCrumbs('limits', 'aquarium').map(c => c.label)).toEqual(['World', 'Equipment', 'Limits', 'Starting Point']);
    // it never lands on the route cards: Explore is where it opens once World, Equipment and Limits are settled, even with an old route saved
    const done = skipLimits(skipEquipment(b));
    expect(placeOf(done)).toEqual({ at: 'start' }); expect(placeOf(chooseRoute(done, 'look'))).toEqual({ at: 'start' });
    expect(exploresOf(chooseWorld(b, 'aquarium'))).toBe(false);
  });
  it('the same answer changes nothing; a different world drops only what cannot stand in it', () => {
    const b0 = chooseWorld(fresh(), 'aquarium');
    expect(chooseWorld(b0, 'aquarium')).toBe(b0);
    const wet = setVision(b0, { ...visionOf(b0), waterType: 'freshwater', familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'balanced' });
    const same = chooseWorld(wet, 'aquarium'); expect(visionOf(same).familyId).toBe('fw-wild');
    const dry = visionOf(chooseWorld(wet, 'terrarium'));
    expect(dry.environment).toBe('terrarium'); expect(dry.familyId).toBeUndefined(); expect(dry.archetypeId).toBeUndefined(); expect(dry.waterType).toBeUndefined();
  });
});

describe('Equipment: Required / Available, scratch, skip', () => {
  it('a skipped equipment step is skipped, not "none"; Starting from scratch is an answer of its own', () => {
    expect(equipmentOf(fresh()).status).toBe('unanswered');
    expect(equipmentOf(skipEquipment(fresh())).status).toBe('skipped');
    expect(equipmentOf(setScratch(fresh())).status).toBe('scratch');
    expect(onboardingOf(skipEquipment(fresh())).equipment).toBe('skipped'); expect(onboardingOf(setScratch(fresh())).equipment).toBe('done');
  });
  it('a ticked item is Available unless one tap makes it Required (the default is Available)', () => {
    expect(useOf(emptyOwned(), 'tank')).toBe('available');
    const a = syncEquipment(fresh(), ticked(undefined));
    expect(equipmentOf(a).items).toMatchObject([{ key: 'tank', use: 'available', model: 'g40b' }]);
    const r = syncEquipment(fresh(), ticked('required'));
    expect(equipmentOf(r).items[0].use).toBe('required');
  });
  it('Required tank = locked and the generator builds around it; an Available tank is NOT locked and is not demanded of the generator', () => {
    const req = syncEquipment(fresh(), ticked('required')), av = syncEquipment(fresh(), ticked('available'));
    expect(getItem(req, 'constraints.existingTank')?.status).toBe('locked');
    expect(briefToWants(req).ownTank?.id).toBe('g40b');
    expect(getItem(av, 'constraints.existingTank')?.status).not.toBe('locked');
    expect(briefToWants(av).ownTank).toBeUndefined();
    expect(valueOf(av, 'constraints.existingTank')).toEqual({ model: 'g40b' });   // still known: the pictures and the savings use it
  });
  it('gear is recorded with its own flag, generic as "I do not care", an exact product as the product; unticking takes it out', () => {
    const s = emptyOwned(); s.on.add('heater'); s.on.add('light'); s.heater = GENERIC; s.light = 'x-light'; s.use = { light: 'required' };
    const b = syncEquipment(fresh(), s);
    const it = (k: string) => equipmentOf(b).items.find(i => i.key === k)!;
    expect(it('heater')).toMatchObject({ use: 'available', pick: 'care', kind: 'gear' });
    expect(it('light')).toMatchObject({ use: 'required', pick: 'x-light', product: 'x-light' });
    s.on.delete('heater');
    expect(equipmentOf(syncEquipment(b, s)).items.map(i => i.key)).toEqual(['light']);
    // ticked but not answered yet: nothing is recorded
    const t = emptyOwned(); t.on.add('filter');
    expect(equipmentOf(syncEquipment(fresh(), t)).items).toEqual([]);
  });
  it('the sheet starts from what the project already says (Back, or a revisit shows the answers)', () => {
    let b = syncEquipment(fresh(), ticked('required'));
    b = setEquipment(b, 'heater', { use: 'available', pick: 'care' });
    const s = ownedStateOf(b);
    expect([...s.on].sort()).toEqual(['heater', 'tank']);
    expect(s.model).toBe('g40b'); expect(s.use).toMatchObject({ tank: 'required', heater: 'available' }); expect(s.heater).toBe(GENERIC);
  });
  it('a tank given as typed dimensions is a stand-in model the pictures can use, with its gallons', () => {
    expect(parseDims('48', '13', '21')).toEqual({ L: 48, D: 13, H: 21 });
    expect(parseDims('48', '', '21')).toBeUndefined(); expect(parseDims('2', '13', '21')).toBeUndefined(); expect(parseDims('abc', '13', '21')).toBeUndefined();
    const s = emptyOwned(); s.on.add('tank'); s.dims = { L: 48, D: 13, H: 21 }; s.use = { tank: 'required' };
    const b = syncEquipment(fresh(), s), t = ownedTankOf(b)!;
    expect(t.custom).toBe(true); expect(t.use).toBe('required'); expect(t.model.ratedGal).toBeCloseTo(customTankModel({ L: 48, D: 13, H: 21 }).ratedGal);
    expect(t.model.outer.L).toBeCloseTo(48 * 25.4);
    expect(projectOf(b).enclosure).toMatchObject({ source: 'owned-required', dimsIn: { L: 48, D: 13, H: 21 } });
  });
  it('a catalogue tank is the owned tank for the pictures, with its use; no tank = undefined', () => {
    expect(ownedTankOf(fresh())).toBeUndefined();
    expect(ownedTankOf(syncEquipment(fresh(), ticked('available')))).toMatchObject({ custom: false, use: 'available', model: { id: 'g40b' } });
    expect(ownedTankList(false).some(m => m.id === 'g40b')).toBe(true);
    expect(ownedTankList(true).every(m => m.terrarium)).toBe(true);
    expect(getTankModel('g40b')?.name).toMatch(/40 gal breeder/);
  });
});

describe('Limits: skip = unknown, hard vs flexible', () => {
  it('has the six fields of the spec', () => { expect(LIMIT_FIELDS.map(f => f.id)).toEqual([...CONSTRAINT_IDS]); });
  it('untouched or skipped is UNKNOWN (never 0, never unlimited), and the step counts as answered', () => {
    const b = skipLimits(fresh());
    for (const id of CONSTRAINT_IDS) expect(constraintOf(b, id)).toEqual({ id, unknown: true });
    expect(onboardingOf(b).limits).toBe('skipped');
    expect(skippedLine(b)).toMatch(/limits/);
    // a blank or non-positive field goes back to unknown, never zero
    for (const v of [undefined, 0, -5, NaN]) expect(constraintOf(applyLimit(applyLimit(fresh(), 'startup', 500), 'startup', v), 'startup').unknown).toBe(true);
    expect(valueOf(applyLimit(fresh(), 'startup', 0), 'constraints.budget')).toBeUndefined();
  });
  it('defaults: space Firm; budgets, setup time and care time Flexible targets; a typed value keeps the kind the person chose', () => {
    expect(DEFAULT_LIMIT_KINDS).toMatchObject({ space: 'hard', startup: 'flexible', ongoing: 'flexible', setup: 'flexible', care: 'flexible' });
    let b = applyLimit(fresh(), 'startup', 600);
    expect(constraintOf(b, 'startup')).toMatchObject({ unknown: false, kind: 'flexible', value: 600 });
    b = applyKind(b, 'startup', 'hard');   // "Hard cap"
    expect(constraintOf(b, 'startup')).toMatchObject({ kind: 'hard', value: 600 });
    b = applyLimit(b, 'startup', 800);     // retyping keeps the cap
    expect(constraintOf(b, 'startup')).toMatchObject({ kind: 'hard', value: 800 });
    const sp = applyLimit(fresh(), 'space', { w: 48, d: 20 });
    expect(constraintOf(sp, 'space')).toMatchObject({ kind: 'hard', value: { w: 48, d: 20 } });
    expect(valueOf(sp, 'constraints.spaceGate')).toBe(true);   // the Guardrails space switch comes with a Firm footprint
    const soft = applyKind(sp, 'space', 'flexible'); expect(constraintOf(soft, 'space')).toMatchObject({ kind: 'flexible' }); expect(valueOf(soft, 'constraints.spaceGate')).toBeUndefined();
    expect(kindOfLimit(fresh(), 'care')).toBe('flexible'); expect(kindOfLimit(b, 'startup')).toBe('hard');
  });
  it('one limit given leaves the others unknown; care and setup time are their own limits; experience is advisory', () => {
    const b = applyLimit(applyLimit(applyLimit(fresh(), 'care', 45), 'setup', 3), 'experience', 2);
    const c = constraintsOf(b);
    expect(c.care).toMatchObject({ unknown: false, value: 45 }); expect(c.setup).toMatchObject({ unknown: false, value: 3 });
    expect(c.startup.unknown).toBe(true); expect(c.ongoing.unknown).toBe(true); expect(c.space.unknown).toBe(true);
    expect(c.experience).toMatchObject({ unknown: false, advisory: true, value: 2 });
    expect(constraintOf(applyLimit(b, 'experience', undefined), 'experience').unknown).toBe(true);
    expect(onboardingOf(b).limits).toBe('done');
  });
});

describe('Starting Point and the route handoff', () => {
  it('two equal cards with the spec words', () => {
    expect(START_CARDS.map(c => [c.id, c.title, c.line])).toEqual([
      ['animals', 'Animals First', "Choose the creatures you love, and we'll build a world around them."],
      ['look', 'Look First', 'Create a world you love, then discover who can live there.'],
    ]);
  });
  it('choosing a route keeps every answer so far; switching the route keeps them too', () => {
    let b = chooseWorld(fresh(), 'aquarium');
    b = syncEquipment(b, ticked('required')); b = applyLimit(b, 'care', 45); b = applyLimit(b, 'startup', 600);
    const look = chooseRoute(b, 'look');
    expect(routeOf(look)).toBe('look');
    for (const bb of [look, chooseRoute(look, 'animals')]) {
      expect(worldOf(bb)).toBe('aquarium'); expect(equipmentOf(bb).items[0]).toMatchObject({ key: 'tank', use: 'required' });
      expect(constraintOf(bb, 'care')).toMatchObject({ value: 45 }); expect(constraintOf(bb, 'startup')).toMatchObject({ value: 600 });
    }
    expect(routeOf(chooseRoute(look, 'animals'))).toBe('animals');
    expect(projectExtras(look).world).toBe('aquarium');
  });
  it('a skipped step is named, never counted as zero', () => {
    const b = skipLimits(skipEquipment(chooseWorld(fresh(), 'aquarium')));
    expect(skippedLine(b)).toMatch(/equipment and limits/); expect(skippedLine(chooseWorld(fresh(), 'aquarium'))).toBe('');
  });
  it('the Suitable Animals the person chose are kept in the project as unlocked suggestions, and never replace animals they locked', () => {
    let b = setSuggested(fresh(), [{ species: 'cardinal', n: 8 }, { species: 'cherry-barb', n: 0 }]);
    expect(suggestedOf(b)).toEqual([{ species: 'cardinal', n: 8 }]);
    expect(getItem(b, 'animals.stock')?.status).toBe('preference');
    expect(projectOf(b).animals).toEqual([{ species: 'cardinal', count: 8 }]);
    b = setSuggested(b, []); expect(getItem(b, 'animals.stock')).toBeUndefined();
    const locked = lockAnimals(fresh(), [{ species: 'betta', n: 1 }]);
    expect(setSuggested(locked, [{ species: 'cardinal', n: 8 }])).toBe(locked);
    expect(setSuggested(locked, [])).toBe(locked);
    expect(suggestedOf(locked)).toEqual([]);
    expect(setSuggested(fresh(), [])).toEqual(fresh());
  });
  it('a skipped constraint never turns into a value when the route starts', () => {
    const b = chooseRoute(skipLimits(chooseWorld(fresh(), 'aquarium')), 'look');
    for (const id of CONSTRAINT_IDS) expect(constraintsOf(b)[id].unknown).toBe(true);
  });
});
