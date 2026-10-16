// Animals that sit on broad plant leaves (anchors kind 'leaf'): the probe finds a leaf top over a crypt's crown, rest()
// puts a leaf-sitter on it (and never a species that cannot), and Shuffle perches some dwarf frogs on plants and hardscape.
import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import * as THREE from 'three';
import { buildTank } from '../src/render/build';
import { itemMesh, leafProbe, underProbe } from '../src/render/items';
import { anchors } from '../src/scene/anchors';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY } from '../src/scene/items';
import { shuffleFish } from '../src/scene/scatter';
import { groundHeight } from '../src/scene/terrain';
import { getSpecies, onLeaves } from '../src/data/species';
import type { Item, TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const crypt: Item = { id: 1, kind: 'plant', variant: 'crypt', seed: 3, x: 300, depth: 200, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY.crypt.size };
function tank(): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 600, D: 400, H: 400 }; S.items = [crypt]; S.fish = [];
  return S;
}

describe('leaf anchors', () => {
  it('who may sit on leaves', () => {
    for (const id of ['adf', 'cherryshrimp', 'amano', 'nerite', 'oto']) expect(onLeaves(getSpecies(id)!), id).toBe(true);
    for (const id of ['treefrog', 'dartfrog', 'neon']) if (getSpecies(id)) expect(onLeaves(getSpecies(id)!), id).toBe(false);
  });
  it('the probe finds a leaf over the crown, above the ground; rest() uses it only when asked', () => {
    const S = tank(), m = itemMesh(S, S.tank, crypt)!; m.updateMatrixWorld(true);
    const ground = (x: number, d: number) => groundHeight(S, S.tank, x, d), leaf = leafProbe(S.tank, [m], ground), A = anchors(S, S.tank, { leaf });
    let hit = 0;
    for (let k = 0; k < 200; k++) {
      const x = crypt.x + (Math.random() - 0.5) * 160, d = crypt.depth + (Math.random() - 0.5) * 160, h = leaf(x, d, 0.3);
      if (!h) continue;
      hit++;
      expect(h.y).toBeGreaterThan(ground(x, d) + 8); expect(h.n[1]).toBeGreaterThan(0.29);
      expect(A.rest(x, d, true, 0.3).kind).toBe('leaf'); expect(A.rest(x, d, true, 0.3).p[1]).toBeCloseTo(h.y, 6);
      expect(A.rest(x, d, true, 0).kind).toBe('floor');
    }
    expect(hit).toBeGreaterThan(5);
    // a perch (0.6) is pickier than a cling (0.3)
    let flat = 0, any = 0;
    for (let k = 0; k < 300; k++) { const x = crypt.x + (Math.random() - 0.5) * 120, d = crypt.depth + (Math.random() - 0.5) * 120; if (leaf(x, d, 0.6)) flat++; if (leaf(x, d, 0.3)) any++; }
    expect(flat).toBeLessThanOrEqual(any);
  });
  it('Shuffle perches dwarf frogs on hardscape or plants some of the time, never on the glass', () => {
    let perched = 0, all = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const S = tank();
      for (let i = 0; i < 6; i++) S.fish.push({ id: i + 1, species: 'adf', x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0 });
      shuffleFish(S, rng(seed));
      for (const f of S.fish) { all++; expect(f.surface).not.toBe('glass'); if (f.surface === 'hardscape') perched++; }
    }
    expect(perched / all).toBeGreaterThan(0.1);
  });

  it('animals hang under a leaf: belly on the underside, back down, head in its plane; none there = the ground', () => {
    const S = tank(), m = itemMesh(S, S.tank, crypt)!; m.updateMatrixWorld(true);
    const ground = (x: number, d: number) => groundHeight(S, S.tank, x, d), under = underProbe([m], [], ground);
    let spot: { x: number; d: number; u: { y: number; n: number[] } } | null = null;
    for (let k = 0; k < 400 && !spot; k++) { const x = crypt.x + (Math.random() - 0.5) * 120, d = crypt.depth + (Math.random() - 0.5) * 120, u = under(x, d, 40, 0.3); if (u) spot = { x, d, u }; }
    expect(spot).toBeTruthy();
    expect(spot!.u.n[1]).toBeLessThan(-0.29);
    for (const sp of ['oto', 'cherryshrimp', 'nerite']) {
      S.fish = [{ id: 1, species: sp, x: spot!.x, y: spot!.u.y, depth: spot!.d, yaw: 30, pitch: 0, roll: 0, bend: 0, surface: 'under' }];
      const mesh = buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes[0];
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
      expect(up.y, sp).toBeLessThan(-0.29);                       // back down
      expect(mesh.position.y, sp).toBeLessThan(spot!.u.y);        // under the leaf
      expect(spot!.u.y - mesh.position.y, sp).toBeLessThan(30);   // and touching it
    }
    S.fish = [{ id: 1, species: 'cherryshrimp', x: 20, y: 100, depth: 20, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'under' }]; // no leaf there
    const down = buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes[0];
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(down.quaternion).y).toBeGreaterThan(0.5);
  });
  it('Shuffle hangs some clingers under leaves; dwarf frogs and tree frogs never', () => {
    let under = 0, all = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const S = tank();
      for (let i = 0; i < 6; i++) for (const [j, sp] of ['cherryshrimp', 'nerite', 'oto', 'adf'].entries()) S.fish.push({ id: i * 4 + j + 1, species: sp, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0 });
      shuffleFish(S, rng(seed));
      for (const f of S.fish) { if (f.species === 'adf') expect(f.surface).not.toBe('under'); else { all++; if (f.surface === 'under') under++; } }
    }
    expect(under / all).toBeGreaterThan(0.1);
  });

  it('hangs under a ledge, and a rock on the ground has no underside to hang from', () => {
    const S = tank(), mk = (variant: string, id: number, x: number, d: number, e: Partial<Item> = {}): Item => ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth: d, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
    const ledge = mk('ledge', 1, 200, 200, { lift: 120 }), rock = mk('river', 2, 450, 200);
    S.items = [ledge, rock];
    const ms = S.items.map(it => itemMesh(S, S.tank, it)!); for (const m of ms) m.updateMatrixWorld(true);
    const un = underProbe([], ms, (x, d) => groundHeight(S, S.tank, x, d)), hit = un(200, 200, 100, 0.3);
    expect(hit).toBeTruthy(); expect(hit!.item).toBe(1); expect(hit!.n[1]).toBeLessThan(-0.29); expect(hit!.y).toBeGreaterThan(100);
    expect(un(450, 200, 40, 0.3)).toBeNull();          // inside a rock's footprint on the floor: its top is no underside
    S.fish = [{ id: 1, species: 'nerite', x: 200, y: hit!.y, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'under' }];
    const m = buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes[0];
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion).y).toBeLessThan(-0.29);
    expect(m.position.y).toBeLessThan(hit!.y);
  });
});
