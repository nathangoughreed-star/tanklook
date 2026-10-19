// Anoles (lane AN, 2026-10-19): green and brown anole on the lizard body plan (render/lizard3d.ts). The dewlap shows folded and
// displayed, the tail lies along a branch (not wound round it), and the poses stay on their anchor through save / load / Shuffle.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LIZARDS, lizardGround } from '../src/art/lizards';
import { rng } from '../src/art/paint';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { lizardBody } from '../src/render/lizard3d';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY } from '../src/scene/items';
import { shuffleFish } from '../src/scene/scatter';
import { nearestGlass } from '../src/scene/shape';
import type { Fish, Item, TankSetup } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';
import { waterY } from '../src/scene/physics';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const ANOLES = ['greenanole', 'greenanolebrown', 'brownanole'];
function verts(o: THREE.Object3D) {
  o.updateMatrixWorld(true);
  const out: THREE.Vector3[] = [];
  o.traverse(m => {
    const g = (m as THREE.Mesh).geometry; if (!g) return;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  });
  return out;
}
const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
function dry(items: Item[]): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 600, D: 450, H: 450 }; S.water.on = false; S.items = items; S.fish = [];
  return S;
}
const anole = (id: number, species: string, e: Partial<Fish> = {}): Fish => ({ id, species, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...e });

describe('anoles', () => {
  it('are reptiles on land that climb glass and branches, with care data; males and females differ in size and look', () => {
    for (const id of ANOLES) {
      const sp = getSpecies(id)!;
      expect(sp.cat).toBe('reptile'); expect(sp.habitat).toBe('land');
      expect(sp.surfaces).toEqual(['floor', 'glass', 'hardscape']);
      expect(sp.rest).toBeCloseTo(lizardGround(LIZARDS[sp.art]), 9);
      expect(CARE[id], id).toBeTruthy();
    }
    for (const id of ['greenanole', 'brownanole']) {
      const sp = getSpecies(id)!;
      expect(sp.female, id).toBeTruthy(); expect(sp.female!.tl).toBeLessThan(sp.tl);
      expect(LIZARDS[sp.female!.art]).toBeTruthy();
    }
  });
  it('the dewlap is there folded and bigger displayed (a taller, lower reach under the throat), on the male not the female', () => {
    for (const art of ['greenanole', 'brownanole']) {
      const folded = new THREE.Box3().setFromPoints(verts(lizardBody(art, 200, 'floor'))), shown = new THREE.Box3().setFromPoints(verts(lizardBody(art, 200, 'floor', undefined, true)));
      expect(shown.max.y - shown.min.y, art).toBeGreaterThan(folded.max.y - folded.min.y + 3); // the head is raised too
      expect(LIZARDS[art].dewlap!.depth).toBeGreaterThan(LIZARDS[art + '_f'].dewlap!.depth * 2);
      expect(shown.min.y, `${art} nothing below the floor`).toBeGreaterThan(-lizardGround(LIZARDS[art]) * 200 - 0.05);
    }
  });
  it('on a branch the tail lies out along it, not wound round it', () => {
    for (const art of ANOLES) {
      const L = LIZARDS[art], G = lizardGround(L) * 200, R = 9, vs = verts(lizardBody(art, 200, 'perch', R));
      const tail = vs.filter(v => v.x < (0.2 - 0.5) * 200);
      expect(tail.length).toBeGreaterThan(100);
      const yA = -G - R;
      expect(Math.max(...tail.map(v => Math.abs(v.z))), art).toBeLessThan(4); // within the thickness of the tail base of the limb's top line
      expect(Math.min(...tail.map(v => Math.hypot(v.y - yA, v.z))), art).toBeGreaterThan(R - 0.05);
    }
  });
});

describe('anoles in the tank: on their anchors, out of the glass and the bark', () => {
  const scene = () => {
    const S = dry([piece(1, 'climb', 300, 230, { size: 440, yaw: 15 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = [...Array.from({ length: 8 }, (_, i) => anole(i + 1, ANOLES[i % 3], i % 2 && i < 6 ? { sex: 'f' as const } : {}))];
    return S;
  };
  const meshes = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes;
  it('Shuffle puts anoles on the glass, the branch and the floor, all identical through save and load', () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const f of S.fish) seen.add(f.surface === 'hardscape' ? 'hard' : f.surface ?? 'floor');
      const before = meshes(S);
      for (const m of before) if (m.userData.perch) seen.add(m.userData.perch);
      const doc = structuredClone(emptyScene()); doc.tanks = [S];
      const { scene: back, warnings } = parseScene(JSON.parse(JSON.stringify(doc)));
      expect(warnings).toEqual([]);
      const after = meshes(back.tanks[0]);
      expect(after.length).toBe(before.length);
      before.forEach((m, i) => {
        const n = after[i];
        expect(n.userData.id).toBe(m.userData.id); expect(n.userData.perch).toBe(m.userData.perch);
        expect(n.position.distanceTo(m.position)).toBeLessThan(0.01);
        expect(Math.abs(n.quaternion.dot(m.quaternion))).toBeGreaterThan(0.99999);
      });
    }
    for (const k of ['glass', 'branch', 'floor']) expect(seen.has(k), k).toBe(true);
  }, 60000);
  it('an anole on the glass lies on the pane, nothing through it', () => {
    let n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface !== 'glass') continue;
        const g = nearestGlass(S.tank, f.x, f.depth, f.y), out = new THREE.Vector3(g.n[0], 0, -g.n[1]), at = new THREE.Vector3(g.x, f.y, -g.depth);
        const d = verts(m.children[0]).map(v => out.dot(at.clone().sub(v)));
        expect(Math.min(...d), `anole ${f.id}`).toBeGreaterThan(0.2);
        expect(Math.min(...d), `anole ${f.id}`).toBeLessThan(3);
        n++;
      }
    }
    expect(n).toBeGreaterThan(0);
  }, 60000);
  it('in a paludarium an anole never ends up in the water', { timeout: 60000 }, () => {
    const S = scene(); S.water.on = true; S.water.level = 0.35;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      shuffleFish(S, rng(seed));
      const wy = waterY(S.tank, S.water.level);
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface === 'glass' || f.surface === 'hardscape') expect(m.position.y, `anole ${f.id} ${f.surface}`).toBeGreaterThan(wy);
      }
    }
  });
});
