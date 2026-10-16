// Lizards (lane G1, 2026-10-16): the crested gecko and leopard gecko on the one lizard body plan (render/lizard3d.ts).
// Poses stay on their anchor through save / load / Shuffle; no part goes into the glass or the branch it grips.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LIZARDS, lizardGround } from '../src/art/lizards';
import { rng } from '../src/art/paint';
import { getSpecies } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { lizardBody } from '../src/render/lizard3d';
import { anchors, type V3 } from '../src/scene/anchors';
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

/** Every vertex of a group (or one of its meshes) in the group's parent frame. */
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
const gecko = (id: number, species: string, e: Partial<Fish> = {}): Fish => ({ id, species, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...e });

describe('lizard body plan', () => {
  it('the species resolve as reptiles on land, the crested gecko clinging anywhere, the leopard gecko on the floor', () => {
    for (const id of ['crestedgecko', 'crestedharlequin', 'leopardgecko']) {
      const sp = getSpecies(id)!;
      expect(sp.cat).toBe('reptile'); expect(sp.habitat).toBe('land');
      expect(sp.rest).toBeCloseTo(lizardGround(LIZARDS[sp.art]), 9);
    }
    expect(getSpecies('crestedgecko')!.surfaces).toEqual(['floor', 'glass', 'hardscape']);
    expect(getSpecies('leopardgecko')!.surfaces).toBeUndefined();
  });
  for (const art of Object.keys(LIZARDS)) for (const [surface, R] of [['floor', 0], ['glass', 0], ['perch', 9], ['perch', 30]] as const) {
    it(`${art} ${surface}${R ? ' r ' + R : ''}: about its length, finite, standing on its surface`, () => {
      const L = LIZARDS[art], g = lizardBody(art, 200, surface, R || undefined), G = lizardGround(L) * 200, vs = verts(g);
      expect(vs.every(v => Number.isFinite(v.x + v.y + v.z))).toBe(true);
      const box = new THREE.Box3().setFromPoints(vs), size = box.getSize(new THREE.Vector3());
      const pose = g.userData.lizard;
      expect(pose).toBe(!L.climbs ? 'ground' : surface === 'floor' ? 'ground' : surface);
      if (pose !== 'perch') {
        // nothing below the surface it stands on (the plane y = -ground), and the feet and belly down on it
        expect(box.min.y).toBeGreaterThan(-G - 0.02);
        expect(box.min.y).toBeLessThan(-G + 0.3);
        expect(size.x).toBeGreaterThan(130); expect(size.x).toBeLessThan(205);
        expect(size.z).toBeLessThan(110);
      } else {
        // on the branch: nothing inside the bark (radius R about the axis along x at y = -ground - R)
        const yA = -G - R, inside = Math.min(...vs.map(v => Math.hypot(v.y - yA, v.z)));
        expect(inside).toBeGreaterThan(R - 0.05);
        // toes curled round it: some reach past the side of the limb
        const grip = vs.filter(v => Math.hypot(v.y - yA, v.z) < R + 1.5 && v.y < yA + R * 0.4).length;
        expect(grip).toBeGreaterThan(50);
      }
    });
  }
});

describe('geckos in the tank: on their anchors, out of the glass and the bark', () => {
  const scene = () => {
    const S = dry([piece(1, 'climb', 300, 230, { size: 440, yaw: 15 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = [...Array.from({ length: 6 }, (_, i) => gecko(i + 1, i % 2 ? 'crestedharlequin' : 'crestedgecko')), gecko(7, 'leopardgecko'), gecko(8, 'leopardgecko')];
    return S;
  };
  const meshes = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes;
  it('Shuffle puts crested geckos on the glass, the branch, the ledge and the floor; leopard geckos on the floor; all stay through save and load', () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const f of S.fish) {
        if (f.species === 'leopardgecko') expect(f.surface).toBe('floor');
        seen.add(f.surface === 'hardscape' ? 'hard' : f.surface ?? 'floor');
      }
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
  });
  it('a gecko on the glass lies on the pane, nothing through it; head up or head down', () => {
    let up = 0, down = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface !== 'glass') continue;
        const g = nearestGlass(S.tank, f.x, f.depth, f.y), out = new THREE.Vector3(g.n[0], 0, -g.n[1]), at = new THREE.Vector3(g.x, f.y, -g.depth);
        const d = verts(m.children[0]).map(v => out.dot(at.clone().sub(v)));
        expect(Math.min(...d), `gecko ${f.id}`).toBeGreaterThan(0.2); // inside the tank
        expect(Math.min(...d), `gecko ${f.id}`).toBeLessThan(3); // belly and pads on the glass
        const head = new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion);
        if (head.y > 0.3) up++; else if (head.y < -0.3) down++;
      }
    }
    expect(up).toBeGreaterThan(0); expect(down).toBeGreaterThan(0);
  });
  it('a gecko on the branch grips it: along the limb, nothing inside the bark near it', () => {
    const S = scene(), ms = S.items.map(it => itemMesh(S, S.tank, it)!); for (const m of ms) m.updateMatrixWorld(true);
    const A = anchors(S, S.tank, { down: solidProbe(S.tank, ms) }), br = S.items[0];
    const spot = (() => { for (let k = 2; k < 9; k++) { const t = k / 10, x = br.x + (t - 0.3) * 0.5 * br.size * Math.cos(15 * Math.PI / 180), d = br.depth + (t - 0.3) * 0.5 * br.size * Math.sin(15 * Math.PI / 180), q = A.rest(x, d); if (q.kind === 'branch') return { x, d, q }; } return null; })()!;
    S.fish = [gecko(1, 'crestedgecko', { x: spot.x, depth: spot.d, yaw: 15, surface: 'hardscape' })];
    const m = meshes(S)[0], L = spot.q.limb!;
    expect(m.userData.perch).toBe('branch');
    const c = new THREE.Vector3(L.c[0], L.c[1], -L.c[2]), along = new THREE.Vector3(L.along[0], L.along[1], -L.along[2]);
    // within a body length of the anchor the limb is close to straight: its surface is the cylinder through the anchor
    const vs = verts(m.children[0]).filter(v => Math.abs(v.clone().sub(c).dot(along)) < 30);
    const r = vs.map(v => { const q = v.clone().sub(c); return q.addScaledVector(along, -q.dot(along)).length(); });
    expect(Math.min(...r)).toBeGreaterThan(L.r - 0.6);
    expect(r.filter(x => x < L.r + 1.5).length).toBeGreaterThan(50); // the toes and the tail on the bark
  });
  it('in a paludarium a crested gecko never ends up in the water', () => {
    const S = scene(); S.water.on = true; S.water.level = 0.35;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      shuffleFish(S, rng(seed));
      const wy = waterY(S.tank, S.water.level);
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.species === 'leopardgecko') continue;
        if (f.surface === 'glass' || f.surface === 'hardscape') expect(m.position.y, `gecko ${f.id} ${f.surface}`).toBeGreaterThan(wy);
      }
    }
  });
});
export type { V3 };
