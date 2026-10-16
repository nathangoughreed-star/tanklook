// Lane T3 (2026-10-16): the surface anchors (scene/anchors.ts) took over where animals rest and cling. This holds every
// animal of the examples (and Shuffled stockings of them, with and without a 3D wall) to the place and turn it had
// before that move, within 1 mm. Animals perching on a thin branch or a ledge (new) are left out.
// Re-record (only on purpose): RECORD=1 npx vitest run test/anchorbase.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { rng } from '../src/art/paint';
import { SCENES } from '../src/examples/scenes';
import { buildTank } from '../src/render/build';
import { shuffleFish } from '../src/scene/scatter';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';
import BASE from './fixtures/anchor-baseline.json';

// the build paints textures on canvases: a do-nothing 2D context is enough for positions
const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

type Pose = { id: number; sp: string; surf: string; p: number[]; q: number[] };

function cases() {
  const out: [string, TankSetup][] = [];
  for (const id of Object.keys(SCENES).sort()) {
    const S = parseScene(SCENES[id]).scene.tanks[0];
    out.push([id, S]);
    for (const seed of [1, 2, 3]) {
      for (const wall of ['none', 'rock', 'cork'] as const) {
        const s = structuredClone(S); shuffleFish(s, rng(seed * 101 + id.length));
        if (wall !== 'none') s.backdrop = { kind: wall, depth: 60, seed: 3 };
        out.push([`${id}/${seed}/${wall}`, s]);
      }
    }
  }
  return out;
}

function poses(S: TankSetup): Pose[] {
  const b = buildTank({ ...S, units: 'cm' }, S.tank, null), out: Pose[] = [];
  const seen = new Map<number, number>();
  for (const m of b.fishMeshes) {
    const f = S.fish.find(f => f.id === m.userData.id)!, k = seen.get(f.id) ?? 0; seen.set(f.id, k + 1);
    m.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(); m.matrixWorld.decompose(p, q, new THREE.Vector3());
    if (m.userData.perch) continue;
    out.push({ id: f.id * 10 + k, sp: f.species, surf: f.surface ?? '-', p: p.toArray().map(v => +v.toFixed(3)), q: q.toArray().map(v => +v.toFixed(5)) });
  }
  return out;
}

describe('animals rest and cling where they did before the anchors', () => {
  const all = Object.fromEntries(cases().map(([k, S]) => [k, poses(S)]));
  if ((globalThis as any).process?.env.RECORD) {
    it('recorded', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      fs.writeFileSync(new URL('./fixtures/anchor-baseline.json', import.meta.url), JSON.stringify(all));
    });
    return;
  }
  const base = BASE as Record<string, Pose[]>;
  it('covers floor, glass, 3D wall and hardscape animals', () => {
    const surf = new Set(Object.values(base).flat().map(p => p.surf));
    for (const s of ['floor', 'glass', 'hardscape']) expect(surf.has(s), s).toBe(true);
  });
  for (const [k, now] of Object.entries(all)) it(k, () => {
    const was = new Map(base[k].map(p => [p.id, p]));
    let n = 0;
    for (const p of now) {
      const b = was.get(p.id); if (!b) continue; n++;
      const d = Math.hypot(...p.p.map((v, i) => v - b.p[i]));
      expect(d, `${k} ${p.sp} ${p.surf} moved ${d.toFixed(2)} mm`).toBeLessThan(1);
      const dq = Math.abs(p.q.reduce((a, v, i) => a + v * b.q[i], 0));
      expect(dq, `${k} ${p.sp} ${p.surf} turned`).toBeGreaterThan(0.9995); // under ~3.6°
    }
    expect(n).toBe(now.filter(p => was.has(p.id)).length);
  });
});
