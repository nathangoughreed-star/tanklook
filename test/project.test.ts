// Guided Setup Rev 03 project state (lane GS2): one state for both routes. Every rule of research/design/guided-setup-rev03.md section 5 and 8.
import { describe, expect, it } from 'vitest';
import { briefToWants, clearItem, emptyBrief, getItem, parseBrief, serializeBrief, setItem, setRange, setFlex, setVision, valueOf, visionOf, type Brief } from '../src/scene/brief';
import {
  STARTER_CAP_GAL, applyChange, assumptionsInUse, availableEquipment, conflictsOf, constraintOf, enclosureOf, equipmentOf, galOfDims, impliedWater, needsWaterQuestion, projectOf, provisionalEnclosure,
  DEFAULT_LIMIT_KINDS, DEFAULT_OWNED_USE, defaultKindOf, markSkipped, onboardingOf, reevalInput, setLimitKind, setOwnedUse, removeEquipment, requiredEquipment, routeOf, setConstraint, setConstraintKind, setEquipment, setEquipmentUse, setRoute, setScratch, setWater, setWorld, skipConstraint, skipStep, unresolved, waterOf, worldOf,
} from '../src/scene/project';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { getTankModel } from '../src/data/tanks';
import { BRIEF_VERSION } from '../src/scene/brief';

const fish = (...ids: [string, number][]) => ids.map(([species, count]) => ({ species, count }));
const stocked = (b: Brief, ...ids: [string, number][]) => setItem(b, 'animals.stock', fish(...ids), 'preference');
const ids = (xs: { id: string }[]) => xs.map(x => x.id);

describe('constraints: unknown is not zero, hard is not flexible', () => {
  it('a fresh project has every constraint UNKNOWN, with no value at all (never 0, never Infinity)', () => {
    const c = projectOf(emptyBrief()).constraints;
    for (const k of Object.values(c)) { expect(k.unknown).toBe(true); expect('value' in k).toBe(false); expect('min' in k).toBe(false); }
    expect(JSON.stringify(c)).not.toMatch(/Infinity|null|:0/);
  });
  it('a skipped constraint goes back to unknown; skipping the step answers it without setting anything', () => {
    let b = setConstraint(emptyBrief(), 'startup', 400, 'hard');
    expect(constraintOf(b, 'startup')).toMatchObject({ unknown: false, kind: 'hard', value: 400 });
    b = skipConstraint(b, 'startup');
    expect(constraintOf(b, 'startup')).toEqual({ id: 'startup', unknown: true });
    b = skipStep(b, 'limits');
    expect(unresolved(b).some(i => i.decision === 'limits')).toBe(false);
    expect(constraintOf(b, 'startup').unknown).toBe(true);
  });
  it('zero is a real value, not a skip', () => {
    expect(constraintOf(setConstraint(emptyBrief(), 'ongoing', 0, 'hard'), 'ongoing')).toMatchObject({ unknown: false, value: 0 });
  });
  it('hard vs flexible per constraint, switchable without losing the value', () => {
    let b = setConstraint(emptyBrief(), 'startup', 500, 'flexible');
    expect(constraintOf(b, 'startup')).toMatchObject({ kind: 'flexible', value: 500 });
    b = setConstraintKind(b, 'startup', 'hard');
    expect(constraintOf(b, 'startup')).toMatchObject({ kind: 'hard', value: 500 });
    expect(getItem(b, 'constraints.budget')?.status).toBe('hard');
    expect(constraintOf(setConstraintKind(emptyBrief(), 'startup', 'hard'), 'startup').unknown).toBe(true);
  });
  it('old saves: a limit item reads the way it always meant (hard stays hard; "willing to change" is flexible; a lower-only range has no value)', () => {
    let b = setRange(emptyBrief(), 'constraints.monthly', { max: 40 });          // status 'hard' by default
    expect(constraintOf(b, 'ongoing')).toMatchObject({ kind: 'hard', value: 40 });
    b = setFlex(b, 'constraints.monthly', true);
    expect(constraintOf(b, 'ongoing').unknown === false && (constraintOf(b, 'ongoing') as { kind: string }).kind).toBe('flexible');
    const low = setRange(emptyBrief(), 'constraints.budget', { min: 200 });
    expect(constraintOf(low, 'startup')).toMatchObject({ unknown: false, min: 200 });
    expect('value' in constraintOf(low, 'startup')).toBe(false);
  });
  it('a limit that is switched off reads as unknown', () => {
    const b = setItem(emptyBrief(), 'constraints.budget', 300, 'hard'); const off = { ...b, items: { ...b.items, 'constraints.budget': { ...b.items['constraints.budget']!, off: true as const } } };
    expect(constraintOf(off, 'startup').unknown).toBe(true);
  });
  it('space is held in inches in the view', () => {
    const b = setConstraint(emptyBrief(), 'space', { w: 48, d: 18, h: 30 }, 'hard');
    expect(constraintOf(b, 'space')).toMatchObject({ kind: 'hard', value: { w: 48, d: 18, h: 30 } });
    expect(valueOf(b, 'constraints.maxSpace')).toEqual({ w: 1219, d: 457, h: 762 });
  });
  it('experience is advisory: it never conflicts and never blocks', () => {
    let b = setConstraint(emptyBrief(), 'experience', 0, 'hard');
    expect(constraintOf(b, 'experience')).toMatchObject({ unknown: false, advisory: true, kind: 'flexible', value: 0 });
    b = stocked(setWorld(b, 'aquarium'), ['oscar', 1]);
    expect(conflictsOf(b)).toEqual([]);
    expect(unresolved(b).filter(i => i.blocking && i.type === 'conflict')).toEqual([]);
  });
});

describe('equipment: required vs available, scratch vs not answered', () => {
  it('"not answered", "from scratch" and "skip for now" are three different answers', () => {
    expect(equipmentOf(emptyBrief()).status).toBe('unanswered');
    expect(equipmentOf(setScratch(emptyBrief())).status).toBe('scratch');
    expect(equipmentOf(skipStep(emptyBrief(), 'equipment')).status).toBe('skipped');
    expect(unresolved(emptyBrief()).some(i => i.decision === 'equipment')).toBe(true);
    expect(unresolved(setScratch(emptyBrief())).some(i => i.decision === 'equipment')).toBe(false);
    expect(unresolved(skipStep(emptyBrief(), 'equipment')).some(i => i.decision === 'equipment')).toBe(false);
  });
  it('ownership alone never sets Required: an owned item is Available unless the person says Required', () => {
    let b = setEquipment(emptyBrief(), 'filter', { pick: 'unknown' });
    b = setEquipment(b, 'tank', { model: 'g40b' });
    expect(equipmentOf(b).items.map(i => [i.key, i.use])).toEqual([['tank', 'available'], ['filter', 'available']]);
    expect(requiredEquipment(b)).toEqual([]);
    expect(availableEquipment(b)).toHaveLength(2);
    b = setEquipmentUse(b, 'tank', 'required');
    expect(requiredEquipment(b).map(i => i.key)).toEqual(['tank']);
    b = setEquipmentUse(b, 'tank', 'available');
    expect(requiredEquipment(b)).toEqual([]);
  });
  it('listing anything ends "from scratch" and a skipped step; "from scratch" clears what was listed', () => {
    let b = setEquipment(setScratch(emptyBrief()), 'heater', { pick: 'care' });
    expect(equipmentOf(b).status).toBe('listed');
    expect(projectOf(b).equipment.items[0]).toMatchObject({ key: 'heater', group: 'heater', pick: 'care' });
    b = setScratch(b);
    expect(equipmentOf(b)).toEqual({ status: 'scratch', items: [] });
    b = setEquipment(skipStep(emptyBrief(), 'equipment'), 'light', {});
    expect(equipmentOf(b).status).toBe('listed');
  });
  it('removing an item removes its use too; groups: tank / filter / heater / light / other', () => {
    let b = setEquipment(setEquipment(emptyBrief(), 'skimmer', { use: 'required' }), 'light', {});
    expect(equipmentOf(b).items.map(i => i.group)).toEqual(['light', 'other'].sort((x, y) => equipmentOf(b).items.findIndex(i => i.group === x) - equipmentOf(b).items.findIndex(i => i.group === y)));
    b = removeEquipment(b, 'skimmer');
    expect(equipmentOf(b).items.map(i => i.key)).toEqual(['light']);
    expect(b.project?.use?.skimmer).toBeUndefined();
    expect(equipmentOf(removeEquipment(b, 'light')).status).toBe('unanswered');
  });
  it('old saves: an existing tank with no project reads Available like every owned item (lane EQ1, 2026-11-07: there is one state)', () => {
    const old = setItem(setItem(emptyBrief(), 'constraints.existingTank', { model: 'g40b' }, 'locked'), 'constraints.owned', { filter: 'care' }, 'preference');
    expect(old.project).toBeUndefined();
    expect(equipmentOf(old).items.map(i => [i.key, i.use])).toEqual([['tank', 'available'], ['filter', 'available']]);
    expect(briefToWants(old).availTank?.id).toBe('g40b');
  });
  it('an Available tank is credited but not forced on the generator', () => {
    const b = setEquipment(emptyBrief(), 'tank', { model: 'g40b', use: 'available' });
    expect(briefToWants(b).ownTank).toBeUndefined();
    expect(briefToWants(setEquipmentUse(b, 'tank', 'required')).ownTank?.id).toBe('g40b');
  });
  it('a hand-measured tank carries its dimensions', () => {
    const b = setEquipment(emptyBrief(), 'tank', { dimsIn: { L: 36, D: 12, H: 16 }, use: 'required' });
    expect(equipmentOf(b).items[0]).toMatchObject({ key: 'tank', use: 'required', dimsIn: { L: 36, D: 12, H: 16 } });
    expect(enclosureOf(b)).toMatchObject({ kind: 'owned-required', dimsIn: { L: 36, D: 12, H: 16 }, gal: galOfDims({ L: 36, D: 12, H: 16 }) });
  });
});

describe('world, water, route', () => {
  it('world answers: any is an answer, not unanswered; old saves take the world from the look', () => {
    expect(worldOf(emptyBrief())).toBeUndefined();
    expect(worldOf(setWorld(emptyBrief(), 'any'))).toBe('any');
    expect(visionOf(setWorld(emptyBrief(), 'any')).environment).toBeUndefined();
    const old = setVision(emptyBrief(), { environment: 'terrarium', secondaryLikes: [] });
    expect(worldOf(old)).toBe('terrarium');
    expect(setWorld(emptyBrief(), 'paludarium').vision?.environment).toBe('paludarium');
    expect(unresolved(emptyBrief())[0]).toMatchObject({ decision: 'world', blocking: true });
  });
  it('water: asked vs implied by the animals; the animals fix it so it is not asked', () => {
    let b = setWorld(emptyBrief(), 'aquarium');
    expect(waterOf(b)).toEqual({});
    expect(needsWaterQuestion(b)).toBe(true);
    b = stocked(b, ['ocellaris', 2]);
    expect(impliedWater(b)).toBe('saltwater');
    expect(waterOf(b)).toEqual({ value: 'saltwater', by: 'animals' });
    expect(needsWaterQuestion(b)).toBe(false);
    const asked = setWater(setWorld(emptyBrief(), 'aquarium'), 'brackish');
    expect(waterOf(asked)).toEqual({ value: 'brackish', by: 'asked' });
    expect(waterOf(setVision(emptyBrief(), { waterType: 'freshwater', secondaryLikes: [] }))).toEqual({ value: 'freshwater', by: 'asked' });   // old save
    expect(waterOf(setWater(asked, null))).toEqual({});
  });
  it('terrariums and paludariums never ask for water', () => {
    expect(needsWaterQuestion(setWorld(emptyBrief(), 'terrarium'))).toBe(false);
    expect(needsWaterQuestion(setWorld(emptyBrief(), 'paludarium'))).toBe(false);
  });
  it('the route is not a mode: switching it keeps every answer', () => {
    let b = setConstraint(setEquipment(stocked(setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater'), ['neon', 6]), 'filter', {}), 'startup', 300, 'hard');
    b = setVision(b, { familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'balanced', densityStop: 2, secondaryLikes: [] });
    const asLook = setRoute(b, 'look'), asAnimals = setRoute(asLook, 'animals');
    expect(routeOf(asLook)).toBe('look'); expect(routeOf(asAnimals)).toBe('animals');
    const strip = (x: Brief) => { const { project: _p, ...r } = x; return { ...r, w: x.project?.world, wa: x.project?.water }; };
    expect(strip(asAnimals)).toEqual(strip(b));
    expect(setRoute(asAnimals, undefined).project?.route).toBeUndefined();
  });
});

describe('provisional enclosure', () => {
  it('nothing known: an editable EXAMPLE, labelled as one', () => {
    const e = provisionalEnclosure(emptyBrief());
    expect(e).toMatchObject({ kind: 'provisional', reason: 'example' });
    expect(e.label).toMatch(/^Example: /);
    expect(e.label).toMatch(/\d+(\.\d+)? x \d+(\.\d+)? x \d+(\.\d+)? in/);
    expect(e.basis).toBeUndefined();
  });
  it('terrarium world: the example is a terrarium', () => {
    const e = provisionalEnclosure(setWorld(emptyBrief(), 'terrarium'));
    expect(e.reason).toBe('example');
    expect(getTankModel(e.model!)?.terrarium).toBe(true);
  });
  it('from constraints: space that fits, capped at a starter size, labelled "from your space"', () => {
    const big = provisionalEnclosure(setConstraint(emptyBrief(), 'space', { w: 96, d: 30 }, 'hard'));
    expect(big).toMatchObject({ kind: 'provisional', reason: 'from constraints', basis: ['space'] });
    expect(big.gal).toBeLessThanOrEqual(STARTER_CAP_GAL);
    expect(big.label).toMatch(/^Provisional: .*sized from your space/);
    const small = provisionalEnclosure(setConstraint(emptyBrief(), 'space', { w: 26, d: 14, h: 18 }, 'hard'));
    expect(small.dimsIn.L).toBeLessThanOrEqual(26); expect(small.dimsIn.D).toBeLessThanOrEqual(14); expect(small.dimsIn.H).toBeLessThanOrEqual(18);
  });
  it('from constraints: a startup budget limits the tank (a known price may take about a third of it)', () => {
    const lean = provisionalEnclosure(setConstraint(emptyBrief(), 'startup', 90, 'hard')), rich = provisionalEnclosure(setConstraint(emptyBrief(), 'startup', 3000, 'hard'));
    expect(lean).toMatchObject({ reason: 'from constraints', basis: ['budget'] });
    expect(lean.gal).toBeLessThanOrEqual(rich.gal);
  });
  it('from the roster: at least the smallest tank the animals need; space and the roster together', () => {
    const b = stocked(setWorld(emptyBrief(), 'aquarium'), ['oscar', 1]);
    const e = provisionalEnclosure(b);
    expect(e).toMatchObject({ reason: 'from constraints', basis: ['animals'] });
    expect(e.gal).toBeGreaterThanOrEqual(168.9 * 0.9);
    const tight = provisionalEnclosure(setConstraint(b, 'space', { w: 36, d: 16 }, 'hard'));
    expect(tight.notes.length).toBeGreaterThan(0);      // the animals win, the clash is named, nothing is dropped
    expect(tight.basis).toEqual(['space', 'animals']);
  });
  it('a provisional enclosure never conflicts: it is sized from what is known', () => {
    expect(conflictsOf(stocked(setWorld(emptyBrief(), 'aquarium'), ['oscar', 1]))).toEqual([]);
  });
  it('precedence: owned Required > chosen > owned Available > provisional', () => {
    let b = setEquipment(emptyBrief(), 'tank', { model: 'g40b', use: 'available' });
    expect(enclosureOf(b)).toMatchObject({ kind: 'owned-available', model: 'g40b' });
    b = setItem(b, 'equipment.tank', { model: 'g75' }, 'preference');
    expect(enclosureOf(b)).toMatchObject({ kind: 'chosen', model: 'g75' });
    b = setEquipmentUse(b, 'tank', 'required');
    expect(enclosureOf(b)).toMatchObject({ kind: 'owned-required', model: 'g40b', dimsIn: { L: expect.any(Number) } });
    expect(enclosureOf(clearItem(clearItem(b, 'equipment.tank'), 'constraints.existingTank')).kind).toBe('provisional');
  });
});

describe('assumptions in use', () => {
  it('nothing is named before the design starts (onboarding never nags)', () => {
    expect(assumptionsInUse(emptyBrief())).toEqual([]);
    expect(assumptionsInUse(setWorld(emptyBrief(), 'aquarium'))).toEqual([]);
  });
  it('once the design has a route, each unknown the design leans on is named; known ones are not', () => {
    let b = setConstraint(setRoute(setWorld(emptyBrief(), 'aquarium'), 'look'), 'startup', 400, 'hard');
    const a = assumptionsInUse(b);
    expect(ids(a)).toEqual(expect.arrayContaining(['enclosure', 'space', 'ongoing', 'setup', 'care', 'experience', 'equipment']));
    expect(ids(a)).not.toContain('startup');
    expect(a.find(x => x.id === 'experience')!.text).toMatch(/beginner/);
    b = setConstraint(setScratch(b), 'space', { w: 60, d: 20 }, 'flexible');
    expect(ids(assumptionsInUse(b))).not.toContain('space');
    expect(ids(assumptionsInUse(b))).not.toContain('equipment');          // "from scratch" is an answer, not an assumption
    expect(ids(assumptionsInUse(setEquipment(b, 'tank', { model: 'g40b', use: 'required' })))).not.toContain('enclosure');
  });
  it('an unknown budget is never turned into a number', () => {
    const b = setRoute(setWorld(emptyBrief(), 'aquarium'), 'animals');
    expect(valueOf(b, 'constraints.budget')).toBeUndefined();
    expect(assumptionsInUse(b).find(x => x.id === 'startup')!.text).toMatch(/none is treated as a limit/);
  });
});

describe('unresolved: remaining decisions by route', () => {
  const dec = (b: Brief) => unresolved(b).filter(i => i.type === 'decision').map(i => i.decision);
  it('a fresh project: world, equipment, limits, route', () => {
    expect(dec(emptyBrief())).toEqual(['world', 'equipment', 'limits', 'route']);
  });
  it('Look First: water, family, archetype, then density, then animals (not blocking) and enclosure', () => {
    let b = setRoute(setScratch(skipStep(setWorld(emptyBrief(), 'aquarium'), 'limits')), 'look');
    expect(dec(b)).toEqual(['water', 'family', 'archetype', 'animals', 'enclosure']);
    b = setWater(b, 'freshwater');
    b = setVision(b, { ...visionOf(b), familyId: 'fw-wild', archetypeId: 'blackwater-creek' });
    expect(dec(b)).toContain('density');
    const issues = unresolved(b);
    expect(issues.find(i => i.decision === 'animals')!.blocking).toBe(false);
    expect(issues.find(i => i.decision === 'density')!.blocking).toBe(true);
  });
  it('Animals First: water is implied by the animals so it is not asked; animals are blocking until chosen', () => {
    let b = setRoute(setScratch(skipStep(setWorld(emptyBrief(), 'aquarium'), 'limits')), 'animals');
    expect(unresolved(b).find(i => i.decision === 'animals')!.blocking).toBe(true);
    b = stocked(b, ['ocellaris', 2]);
    expect(dec(b)).not.toContain('water'); expect(dec(b)).not.toContain('animals');
    expect(unresolved(b).find(i => i.decision === 'enclosure')!.blocking).toBe(true);   // a suitable enclosure must be established
  });
  it('a hard conflict blocks; the editor entry list drops decisions as they are made', () => {
    const b = stocked(setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater'), ['ocellaris', 2]);
    expect(unresolved(b).find(i => i.type === 'conflict')).toMatchObject({ blocking: true });
  });
});

describe('applyChange: keep the design, name the conflicts', () => {
  const base = () => {
    let b = setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater');
    b = stocked(b, ['neon', 6], ['betta', 1]);
    b = setVision(b, { ...visionOf(b), familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'full', densityStop: 3, secondaryLikes: ['x'] });
    return setRoute(b, 'look');
  };
  it('water freshwater -> saltwater: the freshwater animals AND the look are kept, with conflicts and fixes', () => {
    const b = base(), c = applyChange(b, { water: 'saltwater' });
    expect(valueOf(c.state, 'animals.stock')).toEqual(valueOf(b, 'animals.stock'));        // never silently dropped
    expect(visionOf(c.state)).toMatchObject({ familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'full', densityStop: 3 });
    expect(c.introduced.map(x => x.kind).sort()).toEqual(['water-vs-animals', 'water-vs-look']);
    expect(c.conflicts).toHaveLength(2);
    expect(c.introduced.find(x => x.kind === 'water-vs-animals')!.text).toMatch(/Neon|neon/);
    for (const x of c.introduced) expect(x.fixes.length).toBeGreaterThan(0);
    expect(routeOf(c.state)).toBe('look');
  });
  it('a fix is a patch: applying "switch the water back" resolves the conflicts and keeps everything', () => {
    const c = applyChange(base(), { water: 'saltwater' }), fix = c.conflicts.find(x => x.kind === 'water-vs-animals')!.fixes.find(f => f.patch.water)!;
    const back = applyChange(c.state, { water: 'freshwater' });
    expect(back.conflicts).toEqual([]);
    expect(back.resolved).toHaveLength(2);
    expect(fix.patch).toEqual({ water: 'freshwater' });
  });
  it('removing the animals is only ever an offered fix, and it removes only the animals named', () => {
    const c = applyChange(setStocked(base(), [['neon', 6], ['ocellaris', 2]]), { water: 'freshwater' }), conflict = c.conflicts.find(x => x.kind === 'water-vs-animals')!;
    const drop = conflict.fixes.find(f => f.patch.animals)!;
    expect(valueOf(c.state, 'animals.stock')).toHaveLength(2);
    expect(applyChange(c.state, drop.patch).conflicts.filter(x => x.kind === 'water-vs-animals')).toEqual([]);
    expect(valueOf(applyChange(c.state, drop.patch).state, 'animals.stock')).toEqual(fish(['neon', 6]));
  });
  it('world aquarium -> terrarium: the aquarium look is kept with a conflict that says what it is', () => {
    const c = applyChange(base(), { world: 'terrarium' });
    expect(visionOf(c.state).archetypeId).toBe('blackwater-creek');
    expect(c.introduced.map(x => x.kind)).toEqual(expect.arrayContaining(['world-vs-look', 'world-vs-animals']));
    expect(c.introduced.find(x => x.kind === 'world-vs-look')!.severity).toBe('advice');
    expect(c.introduced.find(x => x.kind === 'world-vs-look')!.fixes.some(f => f.patch.vision?.archetypeId === null)).toBe(true);
  });
  it('changing the tank: a smaller Required tank than the animals need is a hard conflict; the animals stay', () => {
    let b = setWorld(emptyBrief(), 'aquarium'); b = stocked(b, ['oscar', 1]);
    expect(conflictsOf(setEquipment(b, 'tank', { model: 'g180', use: 'required' }))).toEqual([]);
    const c = applyChange(setEquipment(b, 'tank', { model: 'g180', use: 'required' }), { equipment: [{ key: 'tank', model: 'g20l', use: 'required' }] });
    expect(c.introduced).toMatchObject([{ kind: 'animals-vs-enclosure', severity: 'hard' }]);
    expect(valueOf(c.state, 'animals.stock')).toEqual(fish(['oscar', 1]));
    const flex = c.introduced[0].fixes.find(f => f.patch.equipment?.[0]?.use === 'available')!;
    const after = applyChange(c.state, flex.patch);
    expect(enclosureOf(after.state).kind).toBe('owned-available');
    expect(equipmentOf(after.state).items[0].use).toBe('available');
  });
  it('unlocking the owned tank (Required -> Available) keeps the pick and lets the enclosure be recommended again', () => {
    let b = stocked(setWorld(emptyBrief(), 'aquarium'), ['oscar', 1]);
    b = setEquipment(b, 'tank', { model: 'g20l', use: 'required' });
    expect(conflictsOf(b).map(x => x.kind)).toEqual(['animals-vs-enclosure']);
    const c = applyChange(b, { equipment: [{ key: 'tank', use: 'available' }], tank: null });
    expect(conflictsOf(c.state).map(x => x.kind)).toEqual(['animals-vs-enclosure']);   // still the owned 20 gal: available tanks are not silently swapped either
    expect(equipmentOf(c.state).items.map(i => i.key)).toEqual(['tank']);
  });
  it('a hard space smaller than the enclosure conflicts hard; a flexible one only advises; unknown space never conflicts', () => {
    const b = setEquipment(emptyBrief(), 'tank', { model: 'g75', use: 'required' });
    expect(conflictsOf(b)).toEqual([]);
    const hard = applyChange(b, { constraints: [{ id: 'space', value: { w: 36, d: 16 }, kind: 'hard' }] });
    expect(hard.introduced).toMatchObject([{ kind: 'enclosure-vs-space', severity: 'hard' }]);
    const soft = applyChange(hard.state, { constraints: [{ id: 'space', kind: 'flexible' }] });
    expect(soft.conflicts).toMatchObject([{ kind: 'enclosure-vs-space', severity: 'advice' }]);
    expect(applyChange(hard.state, { constraints: [{ id: 'space', skip: true }] }).conflicts).toEqual([]);
  });
  it('adding the animals later: a water the person asked for is checked against them', () => {
    const c = applyChange(setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater'), { animals: fish(['ocellaris', 2]) });
    expect(c.introduced.map(x => x.kind)).toEqual(['water-vs-animals']);
  });
  it('freshwater and saltwater animals together conflict even with no asked water', () => {
    const c = applyChange(setWorld(emptyBrief(), 'aquarium'), { animals: fish(['neon', 6], ['ocellaris', 2]) });
    expect(c.conflicts.map(x => x.kind)).toEqual(['water-vs-animals']);
  });
  it('a patch with several parts applies in order; null clears; the original brief is never mutated', () => {
    const b = base(), snap = serializeBrief(b);
    const c = applyChange(b, { route: 'animals', world: 'any', vision: { archetypeId: null, density: null }, animals: null });
    expect(serializeBrief(b)).toBe(snap);
    expect(routeOf(c.state)).toBe('animals'); expect(worldOf(c.state)).toBe('any');
    expect(visionOf(c.state).archetypeId).toBeUndefined(); expect(visionOf(c.state).density).toBeUndefined(); expect(visionOf(c.state).familyId).toBe('fw-wild');
    expect(valueOf(c.state, 'animals.stock')).toBeUndefined();
  });
  it('a skipped budget is added later without disturbing anything', () => {
    const b = base(), c = applyChange(b, { constraints: [{ id: 'startup', value: { min: 200, max: 400 }, kind: 'hard' }] });
    expect(constraintOf(c.state, 'startup')).toMatchObject({ kind: 'hard', value: 400, min: 200 });
    expect(c.introduced).toEqual([]);
  });
});
function setStocked(b: Brief, s: [string, number][]): Brief { return setItem(b, 'animals.stock', fish(...s), 'preference'); }

describe('storage: old saves load unchanged, new answers travel with the project', () => {
  it('an old brief round-trips with no project field and the same meaning', () => {
    let old = setItem(emptyBrief(), 'constraints.budget', 300, 'hard');
    old = setVision(old, { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-wild', secondaryLikes: [] });
    const back = parseBrief(JSON.parse(serializeBrief(old)))!;
    expect(back).toEqual(old);
    expect(back.project).toBeUndefined();
    expect(worldOf(back)).toBe('aquarium'); expect(waterOf(back)).toEqual({ value: 'freshwater', by: 'asked' });
    expect(back.v).toBe(BRIEF_VERSION);
  });
  it('project answers round-trip through parseBrief and the scene file', () => {
    let b = setEquipment(setEquipment(emptyBrief(), 'tank', { dimsIn: { L: 30, D: 12, H: 12 }, use: 'required' }), 'filter', { use: 'available' });
    b = setRoute(setWorld(skipStep(b, 'limits'), 'any'), 'look');
    b = setScratch(setEquipment(b, 'heater', {})); // scratch clears the list
    expect(parseBrief(JSON.parse(serializeBrief(b)))).toEqual(b);
    const s = defaultScene(); s.tanks[0].brief = b;
    expect(parseScene(JSON.stringify(s)).scene.tanks[0].brief).toEqual(b);
    expect(projectOf(parseScene(JSON.stringify(s)).scene.tanks[0].brief!).equipment.status).toBe('scratch');
  });
  it('a brief that only has project answers still counts as saved state', () => {
    expect(parseBrief(JSON.parse(serializeBrief(setRoute(emptyBrief(), 'animals'))))?.project?.route).toBe('animals');
  });
  it('junk in the project field is dropped, never trusted', () => {
    const raw = { v: 3, items: {}, project: { world: 'mars', water: 'lava', route: 'x', use: { tank: 'maybe', filter: 'required' }, tankDims: { L: -1, D: 1, H: 1 }, skipped: ['equipment', 'bogus'], scratch: 'yes' } };
    expect(parseBrief(raw)?.project).toEqual({ use: { filter: 'required' }, skipped: ['equipment'] });
  });
  it('projectOf is one view of everything (both routes read it)', () => {
    const p = projectOf(stocked(setRoute(setWorld(emptyBrief(), 'aquarium'), 'animals'), ['neon', 6]));
    expect(p).toMatchObject({ world: 'aquarium', route: 'animals', water: { value: 'freshwater', by: 'animals' }, animals: [{ species: 'neon', count: 6 }] });
    expect(p.enclosure.kind).toBe('provisional');
    expect(Object.keys(p.constraints).sort()).toEqual(['care', 'experience', 'ongoing', 'setup', 'space', 'startup']);
  });
});

describe('Rev 03 read model for the UI lanes (GS4-GS6)', () => {
  it('defaults: owned items Available (tank too); typed limits take their own default kind (Nathan Q3, 2026-11-02): space hard, budgets and times flexible, experience advisory', () => {
    expect(DEFAULT_OWNED_USE).toBe('available');
    expect(DEFAULT_LIMIT_KINDS).toEqual({ space: 'hard', startup: 'flexible', ongoing: 'flexible', setup: 'flexible', care: 'flexible', experience: 'advisory' });
    expect(defaultKindOf('space')).toBe('hard'); expect(defaultKindOf('care')).toBe('flexible'); expect(defaultKindOf('experience')).toBe('flexible');
    expect(equipmentOf(setEquipment(emptyBrief(), 'tank', { model: 'g40b' })).items[0].use).toBe('available');
    expect(constraintOf(setConstraint(emptyBrief(), 'startup', 300), 'startup')).toMatchObject({ kind: 'flexible' });
    expect(constraintOf(setConstraint(emptyBrief(), 'startup', 300, 'hard'), 'startup')).toMatchObject({ kind: 'hard' });
    expect(constraintOf(setConstraint(emptyBrief(), 'space', { w: 40, d: 16 }), 'space')).toMatchObject({ kind: 'hard' });
  });
  it('onboarding step states: pending / done / skipped, done wins over skipped', () => {
    expect(onboardingOf(emptyBrief())).toEqual({ world: 'pending', equipment: 'pending', limits: 'pending', start: 'pending' });
    let b = markSkipped(markSkipped(setWorld(emptyBrief(), 'any'), 'equipment'), 'limits');
    expect(onboardingOf(b)).toEqual({ world: 'done', equipment: 'skipped', limits: 'skipped', start: 'pending' });
    b = setRoute(setConstraint(setScratch(b), 'startup', 300), 'look');
    expect(projectOf(b).onboarding).toEqual({ world: 'done', equipment: 'done', limits: 'done', start: 'done' });
    expect(onboardingOf(setEquipment(markSkipped(emptyBrief(), 'equipment'), 'filter')).equipment).toBe('done');
  });
  it('limits list: unknown / hard / flexible with the range; remaining lists the open decision ids', () => {
    const b = setConstraint(setConstraint(emptyBrief(), 'startup', { min: 200, max: 400 }, 'flexible'), 'space', { w: 40, d: 16 });
    const l = projectOf(b).limits;
    expect(l.find(x => x.id === 'startup')).toEqual({ id: 'startup', state: 'flexible', value: 400, min: 200 });
    expect(l.find(x => x.id === 'space')).toMatchObject({ state: 'hard', value: { w: 40, d: 16 } });
    expect(l.find(x => x.id === 'care')).toEqual({ id: 'care', state: 'unknown' });
    expect(constraintOf(setLimitKind(b, 'startup', 'hard'), 'startup')).toMatchObject({ kind: 'hard' });
    expect(projectOf(emptyBrief()).remaining).toEqual(['world', 'equipment', 'limits', 'route']);
  });
  it('equipment kinds: tank / gear / supply, with the product when one was named', () => {
    const b = setEquipment(setEquipment(setEquipment(emptyBrief(), 'tank', { model: 'g40b' }), 'filter', { pick: 'some-product' }), 'net', {});
    expect(projectOf(b).equipment.items.map(i => [i.key, i.kind, i.product])).toEqual([['tank', 'tank', undefined], ['filter', 'gear', 'some-product'], ['net', 'supply', undefined]]);
  });
  it('Required tank -> existingTank locked; Available tank -> NOT locked and never forced on the generator', () => {
    let b = setEquipment(emptyBrief(), 'tank', { model: 'g40b', use: 'required' });
    expect(getItem(b, 'constraints.existingTank')?.status).toBe('locked');
    expect(briefToWants(b).ownTank?.id).toBe('g40b');
    b = setOwnedUse(b, 'tank', 'available');
    expect(getItem(b, 'constraints.existingTank')?.status).not.toBe('locked');
    expect(briefToWants(b).ownTank).toBeUndefined();
  });
  it('enclosure source: owned-required, owned-available, picked, suggested (for the animals), provisional', () => {
    expect(enclosureOf(emptyBrief()).source).toBe('provisional');
    expect(enclosureOf(setConstraint(emptyBrief(), 'space', { w: 60, d: 20 })).source).toBe('provisional');
    expect(enclosureOf(stocked(setWorld(emptyBrief(), 'aquarium'), ['neon', 6])).source).toBe('suggested');
    expect(enclosureOf(setEquipment(emptyBrief(), 'tank', { model: 'g40b' })).source).toBe('owned-available');
    expect(enclosureOf(setEquipment(emptyBrief(), 'tank', { model: 'g40b', use: 'required' })).source).toBe('owned-required');
    expect(enclosureOf(setItem(emptyBrief(), 'equipment.tank', { model: 'g75' }, 'preference')).source).toBe('picked');
  });
  it('projectOf(brief, scene): the active catalogue tank of the editor counts as picked, behind a Required owned tank', () => {
    expect(projectOf(emptyBrief(), { product: { model: 'g75' } }).enclosure).toMatchObject({ source: 'picked', model: 'g75' });
    expect(projectOf(setEquipment(emptyBrief(), 'tank', { model: 'g40b', use: 'required' }), { product: { model: 'g75' } }).enclosure.source).toBe('owned-required');
    expect(projectOf(emptyBrief(), {}).enclosure.source).toBe('provisional');
  });
  it('assumptions come as sentences once the design has started', () => {
    expect(projectOf(emptyBrief()).assumptions).toEqual([]);
    const p = projectOf(setRoute(emptyBrief(), 'look'));
    expect(p.assumptions.length).toBeGreaterThan(0);
    expect(p.assumptions.every(x => typeof x === 'string')).toBe(true);
    expect(p.assumptions.length).toBe(p.assumptionList.length);
  });
  it('reevalInput names what changed; a route switch alone needs no re-check', () => {
    const b = setConstraint(setWater(setWorld(emptyBrief(), 'aquarium'), 'freshwater'), 'startup', 300, 'hard');
    expect(reevalInput(b, b)).toEqual({ fields: [], limits: [], equipment: [], recheck: false });
    expect(reevalInput(b, setRoute(b, 'look'))).toMatchObject({ fields: ['route'], recheck: false });
    const c = reevalInput(b, setConstraint(setEquipment(setItem(b, 'animals.stock', fish(['neon', 6]), 'preference'), 'tank', { model: 'g40b', use: 'required' }), 'startup', 500, 'hard'));
    expect(c).toMatchObject({ limits: ['startup'], equipment: ['tank'], recheck: true });
    expect(c.fields).toEqual(expect.arrayContaining(['equipment', 'limits', 'animals', 'enclosure']));
    expect(reevalInput(b, setConstraintKind(b, 'startup', 'flexible')).limits).toEqual(['startup']);
    expect(reevalInput(b, setWater(b, 'saltwater')).fields).toEqual(['water']);
    expect(reevalInput(b, applyChange(b, { vision: { familyId: 'fw-wild' } }).state).fields).toEqual(['family']);
  });
  it('brief v5: v1-v3 saves parse as the current version with the same meaning (the owned tank now reads Available, lane EQ1) and no project; v5 round-trips', () => {
    expect(BRIEF_VERSION).toBe(5);
    for (const v of [1, 2, 3]) {
      const raw = { v, items: { 'constraints.budget': { value: 250, status: 'hard' }, 'constraints.existingTank': { value: { model: 'g40b' }, status: 'locked' } }, vision: { environment: 'aquarium', secondaryLikes: [] } };
      const b = parseBrief(raw)!;
      expect(b.v).toBe(5); expect(b.project).toBeUndefined();
      expect(constraintOf(b, 'startup')).toMatchObject({ kind: 'hard', value: 250 });
      expect(equipmentOf(b).items[0]).toMatchObject({ key: 'tank', use: 'available' });
      expect(worldOf(b)).toBe('aquarium');
    }
    const b = markSkipped(setScratch(setRoute(setWorld(emptyBrief(), 'paludarium'), 'animals')), 'limits');
    expect(parseBrief(JSON.parse(serializeBrief(b)))).toEqual(b);
    expect(parseBrief({ v: 9, items: {}, project: { route: 'look', future: 1 } })?.project).toEqual({ route: 'look' });
  });
});
