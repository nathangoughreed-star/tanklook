// Lane AL: the dirty / algae view. Display only, all uniforms: Pristine leaves the render untouched, the slider never
// forces a rebuild between non-zero values, and the setting survives files and share links.
import { describe, expect, it } from 'vitest';
import { AU, amounts } from '../src/render/algae';
import { envKey } from '../src/render/build';
import { LU, setWaterUniforms } from '../src/render/lighting';
import { emptyScene } from '../src/scene/defaults';
import { readShare, shareHash } from '../src/scene/share';
import { parseScene } from '../src/scene/validate';
import { EXAMPLES } from '../src/examples';
import { SCENES } from '../src/examples/scenes';

const tank = () => structuredClone(emptyScene().tanks[0]);

describe('condition (lane AL)', () => {
  it('pristine sets the water uniforms exactly as before and zeroes every algae amount', () => {
    const t = tank(); t.water.opacity = 0.4; t.water.color = '#335577';
    setWaterUniforms(t.tank, t.water, 0);
    const w0 = LU.uWater.value.toArray(), c0 = LU.uWCol.value.toArray();
    setWaterUniforms(t.tank, t.water, 0, { level: 0 });
    expect(LU.uWater.value.toArray()).toEqual(w0);
    expect(LU.uWCol.value.toArray()).toEqual(c0);
    expect(AU.uAlg.value.toArray()).toEqual([0, 0, 0, 0]);
  });

  it('one slider drives every effect and never touches the water', () => {
    expect(Object.values(amounts({ level: 0.6 }))).toEqual([0.6, 0.6, 0.6, 0.6]);
    expect(amounts(undefined).glass).toBe(0);
    const t = tank(); t.water.opacity = 0.2;
    setWaterUniforms(t.tank, t.water, 0); const w0 = LU.uWater.value.toArray();
    setWaterUniforms(t.tank, t.water, 0, { level: 1 });
    expect(LU.uWater.value.toArray()).toEqual(w0);
  });

  it('dragging the slider is uniforms only (no rebuild between non-zero levels)', () => {
    const a = tank(), b = tank(); a.condition = { level: 0.2 }; b.condition = { level: 0.9 };
    expect(envKey(a)).toBe(envKey(b));
  });

  it('old files load pristine; the level is clamped and round-trips through a share link', async () => {
    for (const x of EXAMPLES) expect(parseScene(SCENES[x.id]).scene.tanks[0].condition).toEqual({ level: 0 });
    const raw = JSON.parse(SCENES[EXAMPLES[0].id]);
    raw.tanks[0].condition = { level: 7 };
    expect(parseScene(JSON.stringify(raw)).scene.tanks[0].condition).toEqual({ level: 1 });
    raw.tanks[0].condition = { level: 0.4567 };
    const scene = parseScene(JSON.stringify(raw)).scene;
    expect(scene.tanks[0].condition).toEqual({ level: 0.457 });
    expect((await readShare(await shareHash(scene))).scene).toEqual(scene);
  });
});
