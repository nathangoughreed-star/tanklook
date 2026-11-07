// Guided Setup Rev 03, Animals First (lane GS5, 2026-11-02): roster -> compatibility -> enclosure -> discovery with the animals, as pure logic over the one project state
// (ui/guided/animalsLogic.ts). The DOM (animalsFirst.ts) only calls these; its screens are checked in the browser (shots/gs5/). Ends with the spec's journey B.
import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/species';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { archetypesOf } from '../src/scene/archetypes';
import { emptyBrief, getItem, setVision, valueOf, visionOf, type Brief } from '../src/scene/brief';
import { buildsFor } from '../src/scene/builds';
import { emptyScene } from '../src/scene/defaults';
import { handOff } from '../src/scene/reeval';
import { enclosureOf, equipmentOf, needsWaterQuestion, projectOf, routeOf, setOwnedUse, setWorld, unresolved, waterOf } from '../src/scene/project';
import { archetypeChoices, familyChoices, knownOf } from '../src/ui/discovery/logic';
import { emptyOwned, syncEquipment } from '../src/ui/ownedGear';
import { applyLimit, chooseRoute, chooseWorld, ownedTankOf } from '../src/ui/guided/logic';
import {
  applyFix, enclosureLine, inWorld, issuesOf, ownedCheck, pickedTank, picksOf, recommendEnclosure, rosterOfBrief, setEnclosure, sizeOptions, waterLine, withRoster,
} from '../src/ui/guided/animalsLogic';
import { planFor } from '../src/ui/stockPlanLogic';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const fresh = (): Brief => emptyBrief();
/** Nothing writes Required any more (lane EQ1, 2026-11-07); a flag an older save stored is still read, so the legacy cases set it by hand. */
const owned = (b: Brief, use: 'required' | 'available', model: string): Brief => { const s = emptyOwned(); s.on.add('tank'); s.model = model; s.tank = model; const r = syncEquipment(b, s); return use === 'required' ? setOwnedUse(r, 'tank', 'required') : r; };
const roster = (b: Brief) => rosterOfBrief(b).map(r => `${r.species}${r.n}`).join(',');
const COMMUNITY = [{ species: 'neon', n: 10 }, { species: 'pandacory', n: 6 }];
const withAnimals = (b: Brief, list: { species: string; n: number }[]) => withRoster(b, picksOf(list));

describe('the roster', () => {
  it('lists the animals of the world chosen, and every animal on request (a pick that does not suit is named, not hidden)', () => {
    const neon = getSpecies('neon')!, gecko = getSpecies('crestedgecko')!, snail = SPECIES.find(s => s.kind === 'snail')!;
    expect([inWorld(neon, 'aquarium'), inWorld(gecko, 'aquarium'), inWorld(snail, 'aquarium')]).toEqual([true, false, true]);
    expect([inWorld(neon, 'terrarium'), inWorld(gecko, 'terrarium')]).toEqual([false, true]);
    for (const e of ['paludarium', undefined] as const) expect([inWorld(neon, e), inWorld(gecko, e)]).toEqual([true, true]);
  });
  it('is written to the brief, locked, and the rest of the project stays as it was (picking an animal never discards the look)', () => {
    let b = setVision(setWorld(fresh(), 'aquarium'), { ...visionOf(fresh()), familyId: 'fw-sculpted', archetypeId: 'underwater-forest', density: 'full' });
    const before = structuredClone(visionOf(b));
    b = withAnimals(b, COMMUNITY);
    expect(roster(b)).toBe('neon10,pandacory6');
    expect(getItem(b, 'animals.stock')?.status).toBe('locked');
    expect(visionOf(b)).toEqual(before);
    expect(visionOf(b).archetypeId).toBe('underwater-forest');
    expect(picksOf(rosterOfBrief(b)).map(p => [p.id, p.n])).toEqual([['neon', 10], ['pandacory', 6]]);
  });
  it('never asks the water the animals fix (clownfish = saltwater), and says so', () => {
    const b = withAnimals(setWorld(fresh(), 'aquarium'), [{ species: 'ocellaris', n: 2 }]);
    expect(waterOf(b)).toEqual({ value: 'saltwater', by: 'animals' });
    expect(needsWaterQuestion(b)).toBe(false);
    expect(waterLine(b)).toMatch(/Saltwater.*not asked again/);
    const f = withAnimals(setWorld(fresh(), 'aquarium'), COMMUNITY);
    expect(waterLine(f)).toMatch(/Freshwater/);
    expect(waterLine(setWorld(fresh(), 'aquarium'))).toBe('');
  });
});

describe('compatibility: conflicts are explained with viable adjustments, and no animal is dropped for the person', () => {
  it('a land animal in an aquarium is named with a paludarium fix, and stays in the roster until a fix that takes it out is pressed', () => {
    let b = withAnimals(chooseWorld(fresh(), 'aquarium'), [{ species: 'neon', n: 10 }, { species: 'crestedgecko', n: 1 }]);
    const is = issuesOf(b), w = is.find(i => i.id === 'world-vs-animals')!;
    expect(w).toBeTruthy(); expect(w.welfare).toBe(true);
    expect(w.fixes.map(f => f.label).join('|')).toMatch(/paludarium/i);
    expect(roster(b)).toBe('neon10,crestedgecko1');                       // listing the conflict changed nothing
    const pal = applyFix(b, w.fixes.find(f => /paludarium/i.test(f.label))!.patch);
    expect(roster(pal)).toBe('neon10,crestedgecko1'); expect(issuesOf(pal).find(i => i.id === 'world-vs-animals')).toBeUndefined();
    const out = applyFix(b, w.fixes.find(f => /out of the stocking/i.test(f.label))!.patch);
    expect(roster(out)).toBe('neon10');                                   // only the fix the person chose removes it
  });
  it('fresh and salt animals together are a hard conflict with both ways out, and never read as fine', () => {
    const b = withAnimals(setWorld(fresh(), 'aquarium'), [{ species: 'neon', n: 10 }, { species: 'ocellaris', n: 2 }]);
    const w = issuesOf(b).find(i => i.id === 'water-vs-animals')!;
    expect(w.welfare).toBe(true); expect(w.fixes.length).toBeGreaterThanOrEqual(2);
    expect(roster(b)).toBe('neon10,ocellaris2');
  });
  it('a compatible community raises nothing', () => { expect(issuesOf(withAnimals(setWorld(fresh(), 'aquarium'), COMMUNITY))).toEqual([]); });
});

describe('the enclosure', () => {
  const big = [{ species: 'oscar', n: 2 }];
  it('an owned Required tank that holds them is used; one that does not says why and offers to mark it Available', () => {
    const ok = withAnimals(owned(chooseWorld(fresh(), 'aquarium'), 'required', 'g40b'), COMMUNITY), c = ownedCheck(ok, picksOf(COMMUNITY).map(p => ({ species: p.id, n: p.n })))!;
    expect(c.fits).toBe(true); expect(c.use).toBe('required'); expect(enclosureOf(ok).kind).toBe('owned-required');
    const small = withAnimals(owned(chooseWorld(fresh(), 'aquarium'), 'required', 'g20h'), big), s = ownedCheck(small, big)!;
    expect(s.fits).toBe(false); expect(s.why).toMatch(/20 gal.*for these animals.*they need about \d+ gal/i);
    const conflict = issuesOf(small).find(i => i.id === 'animals-vs-enclosure')!;
    expect(conflict.fixes.map(f => f.label).join('|')).toMatch(/flexible/i);
    expect(roster(small)).toBe('oscar2');
    const flexible = applyFix(small, conflict.fixes.find(f => /flexible/i.test(f.label))!.patch);
    expect(equipmentOf(flexible).items.find(i => i.key === 'tank')?.use).toBe('available');
    // the 20 gal still stands as the enclosure until one is recommended: the conflict stays, now with the way out the Available mark opens
    expect(issuesOf(flexible).find(i => i.id === 'animals-vs-enclosure')?.fixes.map(f => f.label).join('|')).toMatch(/recommend/i);
    const rec = recommendEnclosure(flexible)!; expect(rec.model.ratedGal).toBeGreaterThan(20);
    expect(issuesOf(setEnclosure(flexible, rec.model.id)).find(i => i.id === 'animals-vs-enclosure')).toBeUndefined();
  });
  it('no tank owned: the recommendation fits the animals and the known limits, and is confirmed into the project as the enclosure', () => {
    let b = withAnimals(chooseWorld(fresh(), 'aquarium'), COMMUNITY);
    expect(enclosureOf(b).kind).toBe('provisional');
    expect(unresolved(b).some(i => i.decision === 'enclosure')).toBe(false);   // not on the route yet
    b = chooseRoute(b, 'animals');
    expect(unresolved(b).find(i => i.decision === 'enclosure')?.blocking).toBe(true);
    const r = recommendEnclosure(b)!;
    expect(r).toBeTruthy(); expect(r.source).toBe('new');
    expect(planFor(picksOf(COMMUNITY)).options.find(o => o.tank.id === r.model.id)?.fails).toEqual([]);   // it holds them
    b = setEnclosure(b, r.model.id);
    expect(enclosureOf(b)).toMatchObject({ kind: 'chosen', model: r.model.id });
    expect(unresolved(b).some(i => i.decision === 'enclosure')).toBe(false);
    expect(pickedTank(b)).toBe(r.model.id);
  });
  it('a space limit steers the recommendation (the hard limit is honoured, or the miss is named)', () => {
    let b = chooseRoute(withAnimals(chooseWorld(fresh(), 'aquarium'), COMMUNITY), 'animals');
    b = applyLimit(b, 'space', { w: 36, d: 15 });
    const r = recommendEnclosure(b)!, m = r.model;
    const out = m.outer.L / 25.4, dep = m.outer.D / 25.4;
    expect(out <= 36.05 && dep <= 15.05 || r.source === 'provisional' || r.warnings.length > 0).toBe(true);
  });
  it('an Available tank the generator uses is said so (GA1 tankNote); the sizes list marks what does not hold them', () => {
    let b = chooseRoute(withAnimals(owned(chooseWorld(fresh(), 'aquarium'), 'available', 'g40b'), COMMUNITY), 'animals');
    const r = recommendEnclosure(b)!;
    expect(r.tankNote).toMatch(/gal/);
    if (r.source === 'owned-available') { expect(r.tankNote).toMatch(/Uses your/); b = setEnclosure(b, undefined); expect(enclosureOf(b).kind).toBe('owned-available'); expect(pickedTank(b)).toBeUndefined(); }
    const sizes = sizeOptions(withAnimals(fresh(), big));
    expect(sizes.some(s => !s.fits && s.why)).toBe(true); expect(sizes.some(s => s.fits)).toBe(true);
  });
  it('flexible limits the recommendation misses come back as GA1 warnings, never silently', () => {
    let b = chooseRoute(withAnimals(owned(chooseWorld(fresh(), 'aquarium'), 'required', 'g40b'), COMMUNITY), 'animals');
    b = applyLimit(b, 'startup', 150);   // flexible target by default (Q3)
    const r = recommendEnclosure(b)!;
    expect(r.source).not.toBe('provisional');
    expect(r.tankNote).toMatch(/Required/);
    expect(r.warnings.join(' ')).toMatch(/target/i);
  });
  it('the Required tank wins over a tank picked in the design (the pictures use what the person said they will use)', () => {
    const b = setEnclosure(owned(withAnimals(chooseWorld(fresh(), 'aquarium'), COMMUNITY), 'required', 'g40b'), 'g55');
    expect(pickedTank(b)).toBeUndefined(); expect(ownedTankOf(b)?.use).toBe('required');
  });
});

describe('journey B: an experienced keeper (spec section 9)', () => {
  it('Aquarium, a 40 gal breeder Required, a budget and care time, Animals First, a community, compatibility for the 40 breeder, families, archetype + density, the editor with the fish in place', () => {
    let b = chooseWorld(fresh(), 'aquarium');
    b = owned(b, 'required', 'g40b');
    b = applyLimit(applyLimit(b, 'startup', 500), 'care', 60);
    b = chooseRoute(b, 'animals');
    expect(routeOf(b)).toBe('animals');
    b = withAnimals(b, COMMUNITY);                                              // builds a community
    expect(issuesOf(b)).toEqual([]);                                            // compatibility for the 40 breeder
    const oc = ownedCheck(b, rosterOfBrief(b))!;
    expect(oc.fits).toBe(true);
    b = setEnclosure(b, undefined);                                             // "Use my tank"
    expect(enclosureOf(b).kind).toBe('owned-required');
    expect(unresolved(b).filter(i => i.blocking && i.decision !== 'family' && i.decision !== 'archetype' && i.decision !== 'density' && i.type === 'decision').map(i => i.decision)).toEqual([]);
    // discovery is mounted with the roster and the owned tank: world and water answered by the animals, so only the look steps are left
    const own = ownedTankOf(b)!, k = knownOf(rosterOfBrief(b).map(r => r.species), own.model.ratedGal);
    expect(k.env).toBe('aquarium'); expect(k.water).toBe('freshwater'); expect(needsWaterQuestion(b)).toBe(false);
    const p = { environment: 'aquarium' as const, waterType: 'freshwater' as const };
    const fams = familyChoices(p, k).items; expect(fams.length).toBeGreaterThan(0);
    const arches = archetypeChoices({ ...p, familyId: fams[0].id }, k).items; expect(arches.length).toBeGreaterThan(0);
    const a = arches.find(x => x.support !== 'coming-soon') ?? arches[0];
    expect(archetypesOf(fams[0].id).some(x => x.id === a.id)).toBe(true);
    // the editor: the very scene the density step draws has the fish in it, in the owned tank, and the project still holds the roster
    const scene = buildsFor(rosterOfBrief(b), own.model)[2].setup;
    expect(scene.fish.length).toBe(16);
    expect(scene.fish.filter(f => f.species === 'neon').length).toBe(10); expect(scene.fish.filter(f => f.species === 'pandacory').length).toBe(6);
    expect(scene.product?.model ?? own.model.id).toBe('g40b');
    // the hand-off (discovery's finish): the roster is only in the brief, the scene is the empty one, and the fish still arrive with the look, in the owned tank
    const ho = handOff(emptyScene().tanks[0], scene, { accept: rosterOfBrief(b).map(r => r.species), brief: b });
    expect(ho.scene.fish.length).toBe(16); expect([ho.scene.tank.L, ho.scene.tank.D, ho.scene.tank.H]).toEqual([tankFromModel(own.model).L, tankFromModel(own.model).D, tankFromModel(own.model).H]);
    expect(handOff(emptyScene().tanks[0], scene, { brief: b }).scene.fish.length).toBe(0);   // without the roster passed as accepted, the animals would be left out (the bug this guards)
    b = setVision(b, { ...visionOf(b), environment: 'aquarium', familyId: fams[0].id, archetypeId: a.id, density: 'balanced' });
    expect(roster(b)).toBe('neon10,pandacory6');
    expect(valueOf(b, 'animals.stock')?.length).toBe(2);
    expect(projectOf(b).route).toBe('animals');
  });
});

describe('guards on the embedded route', () => {
  const src = (f: string) => fs.readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');
  it('the embedded roster never replaces the scene, boxes the tank, or offers the P6 "ways to build it" exit', () => {
    for (const f of ['guided/animalsFirst.ts', 'guided/animalsLogic.ts']) { const s = src(f).replace(/\/\/.*$/gm, ''); expect(s).not.toMatch(/store\.replace|buildPick|scapePick|ghost|builds\.open|Continue: ways to build it/); }
  });
  it('the old panel keeps its open() contract (a design is never replaced, picks seed from the brief roster, a different tank adapts)', () => {
    const s = src('stockPlan.ts');
    expect(s).toMatch(/hasDesign\(store\.tank, getBrief\(\)\)/); expect(s).toMatch(/valueOf\(b, 'animals\.stock'\)/); expect(s).toMatch(/adaptForEdit\(T, tankFromModel\(show\), true\)/);
    expect(s).toMatch(/Continue: ways to build it/);   // still reachable from the old Animals entry, outside Guided
  });
  it('the shell mounts animalsFirst by default, and Animals First is the one route that does not use the old three-builds exit', () => {
    const s = src('guided/shell.ts');
    expect(s).toMatch(/o\.animalsEntry \?\? animalsFirst/); expect(s).not.toMatch(/buildPick|scapePick/);
  });
  it('enclosureLine reads the project enclosure for the verdict', () => { expect(enclosureLine(setEnclosure(fresh(), 'g40b'))).toMatch(/40 gal/); expect(getTankModel('g40b')).toBeTruthy(); });
});
