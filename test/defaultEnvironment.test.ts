// Lane ED1 (2026-11-03): generated setups come in Nathan's environment (src/scene/defaultEnvironment.ts); a design in place, a saved file and a plain New tank do not change.
import { describe, expect, it } from 'vitest';
import { getTankModel, TANK_MODELS } from '../src/data/tanks';
import { emptyBuild } from '../src/scene/builds';
import { recipeScene } from '../src/scene/recipes';
import { handOff } from '../src/scene/reeval';
import { bareSetup, defaultScene, emptyScene } from '../src/scene/defaults';
import { DEFAULT_ENVIRONMENT, environmentGaps } from '../src/scene/defaultEnvironment';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { IN } from '../src/scene/physics';

const M40 = getTankModel('g40b')!;
const TERRA = TANK_MODELS.find(t => t.terrarium)!;

describe('the default environment on generated scenes', () => {
  it('is Nathan\'s: person on, wall on, low room light', () => {
    expect(DEFAULT_ENVIRONMENT.person).toMatchObject({ show: true, height: 1750, side: 'left' });
    expect(DEFAULT_ENVIRONMENT.wall).toMatchObject({ show: true, side: 'back', color: '#d8d2c6' });
    expect(DEFAULT_ENVIRONMENT.room).toBe(0.05);
  });
  it('an aquarium build, a terrarium build and a recipe scene all carry it exactly', () => {
    expect(environmentGaps(emptyBuild(M40).setup)).toEqual([]);
    expect(environmentGaps(emptyBuild(TERRA).setup)).toEqual([]);
    expect(environmentGaps(recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 15 }])!)).toEqual([]);
  });
  it('the hand-off of a pristine scene carries it too, and the look keeps its own background', () => {
    const gen = recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 15 }])!, ho = handOff(bareSetup(), gen);
    expect(ho.fresh).toBe(true);
    expect(environmentGaps(ho.scene)).toEqual([]);
    expect(ho.scene.render.bg).toBe(gen.render.bg);
  });
});

describe('what the person changed stays theirs', () => {
  it('a pristine scene with the person switched off / room light raised keeps those through the hand-off', () => {
    const cur = bareSetup(); cur.person = { ...cur.person, show: false }; cur.light = { ...cur.light, room: 0.4 };
    cur.person = { show: true, height: 1600, side: 'right' };
    const gen = recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 15 }])!;
    const ho = handOff(cur, gen);
    expect(ho.scene.person).toEqual({ show: true, height: 1600, side: 'right' });
    expect(ho.scene.light.room).toBe(0.4);
    expect(ho.scene.wall.show).toBe(true);   // untouched: the default
  });
  it('a design in place keeps its whole environment when a new look is handed off (the wall is not the look\'s)', () => {
    const cur = recipeScene('underwater-forest', 'full', M40, [{ species: 'neon', n: 15 }])!;
    cur.wall = { ...cur.wall, show: false }; cur.person = { ...cur.person, show: false }; cur.light = { ...cur.light, room: 0.3 }; cur.camera = { ...cur.camera, az: -40, el: 5, zoom: 0.8 };
    const gen = recipeScene('underwater-forest', 'open', M40, [{ species: 'neon', n: 15 }])!;
    const ho = handOff(cur, gen);
    expect(ho.fresh).toBe(false);
    expect(ho.scene.wall.show).toBe(false); expect(ho.scene.person.show).toBe(false); expect(ho.scene.light.room).toBe(0.3);
    expect(ho.scene.camera).toMatchObject({ az: -40, el: 5, zoom: 0.8 });
  });
  it('undo restores the previous environment', () => {
    const st = new Store(emptyScene());
    const before = structuredClone(st.tank.person);
    st.update(s => { s.tanks[s.active].person.show = true; });
    st.undo();
    expect(st.tank.person).toEqual(before);
  });
});

describe('unchanged elsewhere', () => {
  it('a plain New tank starts clean (NW1), without the environment', () => {
    const t = emptyScene().tanks[0];
    expect(t.person.show).toBe(false); expect(t.wall.show).toBe(false); expect(t.light.room).toBe(0.15);
  });
  it('a saved project loads exactly as it was (no migration)', () => {
    const sc = defaultScene(); sc.tanks[0].wall.show = false; sc.tanks[0].person.show = false; sc.tanks[0].light.room = 0.15; sc.tanks[0].camera.az = 12;
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0];
    expect(back.wall.show).toBe(false); expect(back.person.show).toBe(false); expect(back.light.room).toBe(0.15); expect(back.camera.az).toBe(12);
    expect(back.stand.finish).toBe('black');
    expect(back.stand.height).toBe(30 * IN);
  });
});
