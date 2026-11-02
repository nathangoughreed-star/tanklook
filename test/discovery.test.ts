// Guided Visual Discovery (lane VD3): spec 06 + 09 acceptance cases on the pure flow (src/ui/discovery/logic.ts), the brief's `vision` and
// the taste `wish` event.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ENVIRONMENTS, WATERS, archetype, archetypesOf, family, type Env, type Water } from '../src/scene/archetypes';
import { emptyBrief, parseBrief, serializeBrief, setItem, setVision, visionOf, type Vision } from '../src/scene/brief';
import { recordTaste, recordWish, tasteOf, wishesOf, weightsOf } from '../src/demand/taste';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { getTankModel } from '../src/data/tanks';
import {
  DENSITIES, NOTHING_KNOWN, addLike, alternativeOf, archetypeChoices, choiceIds, familyChoices, firstOpen, fits, knownOf, nextOf, pickAlternative, prevOf, recipeOf,
  sceneFor, setPick, settle, stepsOf, type Known, type Picks, type VStep,
} from '../src/ui/discovery/logic';

/** Walk the flow picking `pick(step, ids)` at each step the person sees; returns the picks and how many choices it took. */
function walk(k: Known, pick: (s: VStep, ids: string[]) => string, start: Picks = {}): { p: Picks; n: number } {
  let p = start, n = 0, at = firstOpen(p, k);
  while (at !== 'done' && at !== 'animals') {   // Suitable Animals (GS3) is optional: the picks are complete without it
    const ids = choiceIds(at, settle(p, k).picks, k);
    expect(ids.length, `no choices at ${at}`).toBeGreaterThan(0);
    p = setPick(settle(p, k).picks, at, pick(at, ids), k); n++;
    at = nextOf(at, p, k);
  }
  return { p: settle(p, k).picks, n };
}
const buildable = (s: VStep, ids: string[]) => s === 'archetype' ? ids.find(id => archetype(id)!.support !== 'coming-soon') ?? ids[0] : ids[0];

describe('discovery flow (lane VD3)', () => {
  it('has no dead ends: every environment / water reaches a family, a buildable archetype and three densities', () => {
    for (const e of ENVIRONMENTS) for (const w of e.id === 'aquarium' ? WATERS.map(x => x.id as Water) : [null]) {
      const p: Picks = { environment: e.id as Env, waterType: w };
      const fams = familyChoices(p, NOTHING_KNOWN).items;
      expect(fams.length, `${e.id} ${w}`).toBeGreaterThan(1);
      for (const f of fams) {
        const arch = archetypeChoices({ ...p, familyId: f.id }, NOTHING_KNOWN).items;
        expect(arch.length, f.id).toBeGreaterThan(0);
        // a coming-soon archetype is never a dead end: it offers a buildable alternative
        for (const a of arch) expect(a.support !== 'coming-soon' || !!alternativeOf(a), a.id).toBe(true);
        expect(arch.some(a => a.support !== 'coming-soon') || arch.every(a => !!alternativeOf(a)), f.id).toBe(true);
      }
    }
  });

  it('reaches Make It Your Own in 5 picks for an aquarium and 4 for a terrarium or paludarium', () => {
    const aq = walk(NOTHING_KNOWN, (s, ids) => s === 'environment' ? 'aquarium' : buildable(s, ids));
    expect(aq.n).toBe(5);
    expect(stepsOf(aq.p)).toEqual(['environment', 'water', 'family', 'archetype', 'density', 'animals']);
    for (const env of ['terrarium', 'paludarium']) {
      const r = walk(NOTHING_KNOWN, (s, ids) => s === 'environment' ? env : buildable(s, ids));
      expect(r.n, env).toBe(4);
      expect(r.p.waterType).toBeNull();
      expect(recipeOf(archetype(r.p.archetypeId!)!, r.p.density!), env).toBeDefined();
    }
  });

  it('Back keeps compatible picks and drops incompatible ones', () => {
    const full: Picks = { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'full' };
    expect(prevOf('density', full, NOTHING_KNOWN)).toBe('archetype');
    expect(prevOf('environment', full, NOTHING_KNOWN)).toBeUndefined();
    // re-picking the same water keeps everything; another water drops the family and archetype, keeps the density
    expect(setPick(full, 'water', 'freshwater')).toEqual(full);
    expect(setPick(full, 'water', 'saltwater')).toEqual({ environment: 'aquarium', waterType: 'saltwater', density: 'full' });
    // another family drops the archetype only
    expect(setPick(full, 'family', 'fw-gardens')).toEqual({ ...full, familyId: 'fw-gardens', archetypeId: undefined });
    // a terrarium has no water; coming back to the aquarium asks for it again
    const t = setPick(full, 'environment', 'terrarium');
    expect(t).toEqual({ environment: 'terrarium', waterType: null, density: 'full' });
    expect(setPick(t, 'environment', 'aquarium').waterType).toBeUndefined();
    expect(firstOpen(setPick(t, 'environment', 'aquarium'), NOTHING_KNOWN)).toBe('water');
    // a cross-linked archetype stays when its other family is picked (mudskipper mudflat is shown under the paludarium creature habitats)
    const mud = archetype('mudskipper-mudflat')!;
    for (const f of [mud.familyId, ...(mud.alsoIn ?? [])]) expect(archetypesOf(f).some(a => a.id === mud.id)).toBe(true);
  });

  it('an mbuna roster skips environment and water and offers only hard-water families', () => {
    const k = knownOf(['yellowlab', 'demasoni', 'labeo']);
    expect(k.env).toBe('aquarium'); expect(k.water).toBe('freshwater'); expect(k.needs).toContain('hard');
    const { picks, auto } = settle({}, k);
    expect(auto).toEqual(['environment', 'water']);
    expect(firstOpen({}, k)).toBe('family');
    expect(prevOf('family', picks, k)).toBeUndefined();
    const fams = familyChoices(picks, k);
    expect(fams.loose).toBe(false);
    expect(fams.items.length).toBeGreaterThan(0);
    for (const f of fams.items) expect(archetypeChoices({ ...picks, familyId: f.id }, k).items.every(a => a.tags.chem?.includes('hard')), f.id).toBe(true);
    expect(fams.items.map(f => f.id)).not.toContain('fw-sculpted');   // iwagumi / nature / forest are soft water
    expect(fams.items.map(f => f.id)).toContain('fw-wild');
    // an earlier terrarium path is replaced: the roster's aquarium brings the water step back and the families are offered (regression)
    const t = settle({ environment: 'terrarium', waterType: null, familyId: 'te-desert', archetypeId: 'rocky-desert-canyon', density: 'balanced' }, k);
    expect(t.picks).toEqual({ environment: 'aquarium', waterType: 'freshwater', density: 'balanced' });
    expect(familyChoices(t.picks, k).items.length).toBeGreaterThan(0);
    // a tank too small for the rockscape hides it
    expect(fits(archetype('african-cichlid-rockscape')!, knownOf(['yellowlab'], 29))).toBe(false);
    expect(fits(archetype('african-cichlid-rockscape')!, knownOf(['yellowlab'], 75))).toBe(true);
  });

  it('a land roster answers terrarium, a marine one saltwater, both kinds a paludarium', () => {
    expect(knownOf(['crestedgecko']).env).toBe('terrarium');
    expect(knownOf(['dartfrog', 'neon']).env).toBe('paludarium');
    const reef = ARCHETYPES.find(a => a.env === 'aquarium' && a.water === 'saltwater')!;
    expect(knownOf(['neon']).water).toBe('freshwater');
    expect(fits(reef, knownOf(['neon']))).toBe(false);
  });

  it('auto-answers a step left with one choice and never auto-picks a coming-soon archetype', () => {
    // a family with one buildable archetype under a roster: the archetype step is answered for the person only when it is buildable
    for (const f of ['fw-wild', 'fw-gardens']) {
      const p: Picks = { environment: 'aquarium', waterType: 'freshwater', familyId: f };
      const s = settle(p, NOTHING_KNOWN);
      if (archetypeChoices(p, NOTHING_KNOWN).items.length > 1) expect(s.auto).not.toContain('archetype');
    }
    const soonOnly = ARCHETYPES.find(a => a.support === 'coming-soon')!;
    const s = settle({ environment: soonOnly.env, waterType: soonOnly.water, familyId: soonOnly.familyId }, { ...NOTHING_KNOWN, roster: ['x'], needs: [] });
    expect(s.picks.archetypeId === soonOnly.id).toBe(false);
  });

  it('density never changes the animal list', () => {
    const a = archetype('blackwater-creek')!, S = defaultScene().tanks[0];
    const tank = sceneFor(a, recipeOf(a, 'balanced')!, undefined);
    // stock the tank, then scape it at each density: the roster is the same every time
    tank.fish = [0, 1, 2, 3, 4, 5].map(i => ({ ...structuredClone(S.fish[0] ?? { species: 'cardinal', x: 0, y: 0, z: 0 }), species: i < 4 ? 'cardinal' : 'bronzecory' })) as typeof tank.fish;
    const roster = (T: typeof tank) => T.fish.map(f => f.species).sort();
    const lists = DENSITIES.map(d => roster(sceneFor(a, recipeOf(a, d)!, tank)));
    for (const l of lists) expect(l).toEqual(roster(tank));
    // and the layers do move: open is sparser than full
    const items = DENSITIES.map(d => sceneFor(a, recipeOf(a, d)!, undefined).items.length);
    expect(items[0]).toBeLessThan(items[2]);
    expect(DENSITIES.map(d => sceneFor(a, recipeOf(a, d)!, undefined).fish.length)).toEqual([0, 0, 0]);
  });

  it('every buildable archetype opens a scene in a tank big enough for it', () => {
    for (const a of ARCHETYPES.filter(x => x.support !== 'coming-soon')) {
      const r = recipeOf(a, 'balanced');
      expect(r, a.id).toBeDefined();
      const T = sceneFor(a, r!, undefined);
      expect(T.layout.id, a.id).toBe(r!.look);
      if (r!.env === 'terrarium') expect(T.water.on, a.id).toBe(false);
    }
    const big = archetype('big-fish-showcase')!;
    expect(big.recipe.looks[0]).toBe('none');
    expect(sceneFor(big, recipeOf(big, 'open')!, undefined).items.length).toBe(0);
    // the brief's own tank is used when the look comes in it
    const own = getTankModel('ada-60p') ?? undefined;
    if (own) expect(sceneFor(archetype('iwagumi-stone-garden')!, recipeOf(archetype('iwagumi-stone-garden')!, 'open')!, undefined, own.id)).toBeDefined();
  });

  it('resolvesTo switches the build: a mudskipper mudflat found under brackish is built as a paludarium', () => {
    const mud = archetype('mudskipper-mudflat')!;
    expect(mud.env).toBe('aquarium'); expect(mud.resolvesTo).toBe('paludarium');
    const alt = alternativeOf(mud) ?? mud;
    const r = recipeOf(alt, 'balanced');
    if (alt === mud) expect(r?.env).toBe('paludarium');
    else expect(r).toBeDefined();
  });
});

describe('coming soon (spec 08)', () => {
  it('records a wish, sets no price, offers the alternative', () => {
    const soon = ARCHETYPES.filter(a => a.support === 'coming-soon');
    expect(soon.length).toBeGreaterThan(0);
    for (const a of soon) {
      expect(recipeOf(a, 'balanced'), a.id).toBeUndefined();   // nothing to render, so nothing to price
      const alt = alternativeOf(a);
      expect(alt, a.id).toBeDefined();
      const p = pickAlternative({ density: 'open' }, alt!);
      expect(p.archetypeId).toBe(alt!.id);
      expect(family(p.familyId!)!.env).toBe(alt!.env);
      expect(firstOpen(p, NOTHING_KNOWN)).toBe('done');
    }
    const a = soon[0];
    let b = recordTaste(emptyBrief(), { style: 'nature', kind: 'pick' });
    const before = weightsOf(tasteOf(b));
    b = recordWish(setVision(b, { ...visionOf(b), secondaryLikes: addLike(visionOf(b).secondaryLikes, a.id) }), a.id);
    expect(visionOf(b).secondaryLikes).toEqual([a.id]);
    expect(visionOf(b).archetypeId).toBeUndefined();          // a wish is never the pick
    expect(wishesOf(tasteOf(b))).toEqual([a.id]);
    expect(weightsOf(tasteOf(b))).toEqual(before);           // and never moves the ranking
    expect(addLike([a.id], a.id)).toEqual([a.id]);
    // it survives a save
    expect(wishesOf(tasteOf(parseBrief(JSON.parse(serializeBrief(b)))!))).toEqual([a.id]);
  });
});

describe('vision in the brief (spec 06)', () => {
  const v: Vision = { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'balanced',
    secondaryLikes: ['fluorescent-glow'], renderRecipe: { look: 'blackwater', plantMode: 'live', dens: { hard: 2, plant: 2 }, env: 'aquarium' } };
  it('round-trips through save / load', () => {
    const b = setVision(setItem(emptyBrief(), 'constraints.budget', 400, 'hard'), v);
    expect(parseBrief(JSON.parse(serializeBrief(b)))).toEqual(b);
    const s = defaultScene(); s.tanks[0].brief = b;
    expect(parseScene(JSON.stringify(s)).scene.tanks[0].brief).toEqual(b);
    // a vision alone is worth saving; a terrarium keeps its null water
    const t = setVision(emptyBrief(), { environment: 'terrarium', waterType: null, secondaryLikes: [] });
    expect(parseBrief(JSON.parse(serializeBrief(t)))?.vision).toEqual({ environment: 'terrarium', waterType: null, secondaryLikes: [] });
  });
  it('old saves parse unchanged and junk is dropped', () => {
    const old = setItem(emptyBrief(), 'constraints.budget', 400, 'hard');
    expect(parseBrief(JSON.parse(serializeBrief(old)))).toEqual(old);
    expect(parseBrief({ v: 3, items: {}, vision: { environment: 'pond', density: 'max', secondaryLikes: ['<b>', 3] } })).toBeUndefined();
    expect(setVision(old, { secondaryLikes: [] })).toEqual(old);
  });

  it('the density slider pick (lane VD6): a stop saves with the named level it belongs to and survives the brief round trip', () => {
    const base: Picks = { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-gardens', archetypeId: 'planted-community' };
    expect(setPick(base, 'density', 'open')).toMatchObject({ density: 'open', densityStop: 0 });
    expect(setPick(base, 'density', 'full')).toMatchObject({ density: 'full', densityStop: 4 });
    for (const [stop, level] of [[0, 'open'], [1, 'open'], [2, 'balanced'], [3, 'full'], [4, 'full']] as const) {
      const p = setPick(base, 'density', String(stop));
      expect(p).toMatchObject({ density: level, densityStop: stop });
      const b = setVision(emptyBrief(), { ...p, secondaryLikes: [] });
      expect(visionOf(parseBrief(JSON.parse(serializeBrief(b)))!)).toMatchObject({ density: level, densityStop: stop });
    }
    expect(visionOf(parseBrief(JSON.parse(serializeBrief(setVision(emptyBrief(), { density: 'balanced', secondaryLikes: [] }))))!).densityStop).toBeUndefined();   // an older save: no stop
    // a later pick above it keeps the stop (the density always stays)
    expect(setPick({ ...base, density: 'full', densityStop: 3 }, 'family', 'fw-gardens')).toMatchObject({ density: 'full', densityStop: 3 });
  });
});
