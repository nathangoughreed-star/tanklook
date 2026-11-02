// Personalized discovery tiles (lane VD6): the tank choice rules and the scenes behind steps 4 and 5 (no WebGL: the picture callback is a stub).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, archetypesOf, type Density } from '../src/scene/archetypes';
import { TANK_MODELS } from '../src/data/tanks';
import { DENSITIES, coverOf, minTank, recipeBg } from '../src/scene/recipes';
import { Previews, previewOf, tankChoice, tankOptions } from '../src/ui/discovery/tiles';
import { sceneFor, recipeOf } from '../src/ui/discovery/logic';

const byName = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const BREEDER40 = byName('40 gal breeder');
const family = (id: string) => archetypesOf(id);
const buildable = (id: string) => family(id).filter(a => a.support !== 'coming-soon' && a.recipe.looks.length);

describe('personalized discovery tiles (lane VD6)', () => {
  it('suggests one labelled tank that holds every drawn archetype, and never calls it yours', () => {
    for (const f of new Set(ARCHETYPES.map(a => a.familyId))) {
      const arches = family(f), drawn = buildable(f);
      const tc = tankChoice(arches);
      if (!drawn.length) { expect(tc, f).toBeUndefined(); continue; }
      expect(tc!.source, f).toBe('suggested');
      for (const a of drawn) expect(tc!.model.ratedGal, `${f}: ${a.id}`).toBeGreaterThanOrEqual(minTank(a).ratedGal);
      expect(tankOptions(arches).some(m => m.id === tc!.model.id), f).toBe(true);
    }
  });

  it("the person's own tank wins, a chosen one beats the suggestion, and their size floor raises it", () => {
    const arches = buildable('fw-planted').length ? family('fw-planted') : family(ARCHETYPES.find(a => a.recipe.looks.length)!.familyId);
    expect(tankChoice(arches, { yours: BREEDER40 })).toMatchObject({ source: 'yours' });
    expect(tankChoice(arches, { yours: BREEDER40 })!.model.id).toBe(BREEDER40.id);
    const small = tankChoice(arches)!, big = tankChoice(arches, { floorGal: 55 })!;
    expect(big.model.ratedGal).toBeGreaterThanOrEqual(55);
    expect(big.model.ratedGal).toBeGreaterThanOrEqual(small.model.ratedGal);
    const pick = tankOptions(arches).find(m => m.id !== small.model.id)!;
    expect(tankChoice(arches, { pick: pick.id })).toMatchObject({ source: 'picked', model: { id: pick.id } });
  });

  it('a family trio shares one tank; the density trio shares build, animals and composition and gets fuller', () => {
    const a = ARCHETYPES.find(x => x.support === 'partial' && x.recipe.looks[0] === 'iwagumi')!;
    const tank = tankChoice(family(a.familyId))!.model, pv = previewOf(a, tank)!;
    expect(pv).toBeDefined();
    const [o, b, f] = DENSITIES.map(d => pv.scenes[d]);
    expect(o.tank).toEqual(b.tank); expect(b.tank).toEqual(f.tank);
    expect(o.fish.map(x => x.species)).toEqual(b.fish.map(x => x.species));
    for (const S of [o, b, f]) expect(S.render.bg).toBe(recipeBg(a).bg);
    expect(recipeOf(a, 'open')!.bg).toBe(recipeBg(a).bg);
    expect(coverOf(o)).toBeLessThan(coverOf(b)); expect(coverOf(b)).toBeLessThan(coverOf(f));
  });

  it('caches scenes and pictures per (archetype, tank, density) and draws each once', () => {
    const a = ARCHETYPES.find(x => x.support === 'partial' && x.recipe.looks[0] === 'iwagumi')!;
    let n = 0;
    const pv = new Previews(() => `data:image/png;base64,${++n}`);
    const s1 = pv.render(a, 'balanced', BREEDER40)!, s2 = pv.render(a, 'balanced', BREEDER40)!;
    expect(s2).toBe(s1); expect(n).toBe(1);
    expect(pv.scenesOf(a, BREEDER40)).toBe(pv.scenesOf(a, BREEDER40));
    pv.render(a, 'full', BREEDER40); expect(n).toBe(2);
    pv.render(a, 'balanced', byName('20 gal long')); expect(n).toBe(3);
    expect(pv.log.length).toBe(3);
    expect(new Previews().render(a, 'open', BREEDER40)).toBeUndefined();   // no viewer: flat tiles
    expect(new Previews(() => '').render(a, 'open', BREEDER40)).toBeUndefined();   // nothing to picture: flat tiles
  });

  it('coming-soon archetypes are not drawn', () => {
    const soon = ARCHETYPES.find(a => a.support === 'coming-soon')!;
    expect(previewOf(soon, BREEDER40)).toBeUndefined();
  });

  it("Make It Your Own gets the scene the density step showed: the cached scene of the chosen archetype and density, no other layout", () => {
    const a = ARCHETYPES.find(x => x.support === 'partial' && x.recipe.looks[0] === 'iwagumi')!;
    const pv = new Previews(() => 'x'), shown = (d: Density) => pv.scenesOf(a, BREEDER40)!.scenes[d];
    for (const d of DENSITIES) {
      const again = pv.scenesOf(a, BREEDER40)!.scenes[d];
      expect(again.items.map(i => `${i.kind}:${i.x}:${i.depth}`)).toEqual(shown(d).items.map(i => `${i.kind}:${i.x}:${i.depth}`));
      expect(again.layout.seed).toBe(shown(d).layout.seed);
    }
    // the old hand-off built an unrelated scene from the look's own default size; the two paths agree on the recipe's look
    expect(recipeOf(a, 'balanced')!.look).toBe(a.recipe.looks[0]);
    expect(sceneFor(a, recipeOf(a, 'balanced')!, undefined, BREEDER40.id).layout.id).toBe(shown('balanced').layout.id);
  });
});
