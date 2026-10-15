// Lane AL: the dirty / algae view. Display only, all uniforms: Pristine leaves the render untouched, the slider never
// forces a rebuild between non-zero values, and the setting survives files and share links.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AU, addAlgae, amounts, leafAlgaeShader } from '../src/render/algae';
import { grownView, plantGeometry } from '../src/render/plant3d';
import { envKey } from '../src/render/build';
import { LU, setWaterUniforms } from '../src/render/lighting';
import { emptyScene } from '../src/scene/defaults';
import { readShare, shareHash } from '../src/scene/share';
import { bowlDims } from '../src/scene/shape';
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
    expect(AU.uAlgL.value).toBe(0);
  });

  it('one slider drives every effect and never touches the water', () => {
    expect(Object.values(amounts({ level: 0.6 }))).toEqual([0.6, 0.6, 0.6, 0.6, 0.6]);
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

  it('leaf algae (lane LA): slow growers take it, fast ones stay clean; each plant view carries its own', () => {
    const v = (t: Parameters<typeof plantGeometry>[0]) => grownView(plantGeometry(t, 3, 80), 0.5).attributes.aAlg.array;
    expect(v('anubias')[0]).toBe(1);
    expect(v('buce')[0]).toBe(1);
    expect(v('fern')[0]).toBe(1);
    expect(v('stem')[0]).toBe(0);
    expect(v('anubias')[1]).toBeGreaterThan(20); // its height at full growth (the lower leaves first)
    setWaterUniforms(tank().tank, tank().water, 0, { level: 0.5 });
    expect(AU.uAlgL.value).toBe(0.5);
  });

  it('the leaf patch goes in only after the lighting', () => {
    const sh = { vertexShader: 'void main() { #include <begin_vertex> }', fragmentShader: 'void main() { }', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    leafAlgaeShader(sh);
    expect(sh.vertexShader).not.toContain('leafAlgVert');
  });

  it('a bowl gets the glass film on its sphere (no scum yet)', () => {
    const sc = new THREE.Scene(), T = { L: 300, H: 260, D: 300, shape: 'bowl' as const, bowlFloor: 180, bowlTop: 180 };
    addAlgae(sc, T, 200, {});
    expect(sc.children.length).toBe(1);
    const p = (sc.children[0] as THREE.Mesh).geometry.attributes.position, { R, c } = bowlDims(T);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(200 + 1e-6);
      expect(Math.hypot(p.getX(i) - R, y - c, p.getZ(i) + R)).toBeCloseTo(R - 0.6, 3); // 0.6 mm inside the glass
    }
  });
});
