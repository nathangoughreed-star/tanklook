// Lane LB1 (Nathan 2026-11-03): the background the discovery picture showed is the background the editor opens with, and a background the person picked is never overwritten.
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { recipeScene, recipeBg } from '../src/scene/recipes';
import { archetype } from '../src/scene/archetypes';
import { handOff, lookOwnsBackground } from '../src/scene/reeval';
import { emptyBrief, setVision } from '../src/scene/brief';
import { bareSetup, defaultSetup } from '../src/scene/defaults';
import type { TankSetup } from '../src/scene/types';

const M60 = getTankModel('g60b')!;
const rock = (animals = [{ species: 'yellowlab', n: 3 }]) => recipeScene('african-cichlid-rockscape', 'balanced', M60, animals)!;
const withProduct = (S: TankSetup) => { S.product = { model: 'g60b' } as never; return S; };
const briefWith = (bg?: string, bgColor?: string) => setVision(emptyBrief(), { secondaryLikes: [], archetypeId: 'african-cichlid-rockscape', renderRecipe: { look: 'stones', plantMode: 'live', dens: { hard: 2, plant: 1 }, env: 'aquarium', ...(bg ? { bg: bg as never } : {}), ...(bgColor ? { bgColor } : {}) } });

describe('Malawi rockscape hand-off keeps its black background (the reported case)', () => {
  it('the look itself draws black on the back glass', () => {
    expect(recipeBg(archetype('african-cichlid-rockscape')!).bg).toBe('black');
    expect(rock().render.bg).toBe('black');
  });
  it('a bare tank with a catalogue product (a design in place) opens with the look\'s black, not the bare tank\'s none', () => {
    const cur = withProduct(bareSetup()); expect(cur.render.bg).toBe('none');
    const ho = handOff(cur, rock());
    expect(ho.fresh).toBe(false);
    expect(ho.scene.render.bg).toBe('black'); expect(ho.scene.render.bgSides).toEqual(['back']);
  });
  it('the factory default background with no look picked yet is replaced too', () => {
    const ho = handOff(withProduct(defaultSetup()), rock());
    expect(ho.scene.render.bg).toBe('black');
  });
  it('a pristine scene is taken whole, background included', () => {
    expect(handOff(bareSetup(), rock()).scene.render.bg).toBe('black');
  });
});

describe('a background the person chose is theirs', () => {
  it('a colour picked in the editor over the previous look\'s is kept', () => {
    const cur = withProduct(rock()); cur.render.bg = 'green';
    const ho = handOff(cur, recipeScene('african-cichlid-rockscape', 'full', M60, [{ species: 'yellowlab', n: 3 }])!, { brief: briefWith('black') });
    expect(ho.scene.render.bg).toBe('green');
  });
  it('the previous look\'s own background is replaced by the new look\'s', () => {
    const cur = withProduct(recipeScene('underwater-forest', 'balanced', M60, [{ species: 'neon', n: 6 }])!), prevBg = cur.render.bg;
    expect(prevBg).not.toBe('black');
    const ho = handOff(cur, rock(), { brief: briefWith(prevBg, cur.render.bgColor) });
    expect(ho.scene.render.bg).toBe('black');
  });
  it('uploaded pictures are never touched', () => {
    const cur = withProduct(bareSetup()); cur.render.bgImages = [{ img: 'x', sides: ['back'] } as never];
    expect(lookOwnsBackground(cur)).toBe(false);
    expect(handOff(cur, rock()).scene.render.bg).toBe('none');
  });
  it('the custom colour of a look travels with it', () => {
    const gen = recipeScene('white-sand-stone', 'balanced', M60, [])!;
    const ho = handOff(withProduct(bareSetup()), gen);
    expect(ho.scene.render.bg).toBe(gen.render.bg); expect(ho.scene.render.bgColor).toBe(gen.render.bgColor);
  });
});
