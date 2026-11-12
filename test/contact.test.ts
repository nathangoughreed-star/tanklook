// Lane VF-C (plan VF stages VF3 / VF4, 2026-11-11): substrate variation (fx ground) and contact shadows (fx contact).
// - an old save (the VF0 reference tanks) loads with the same layout whichever switches are on (render only)
// - the switches off give the old scene: no contact objects, the same object list and ground colours as before
// - the contact blob follows a dragged rock (patchTank rebuilds the contact part; the blob's middle moves with it)
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTank, patchTank } from '../src/render/build';
import { FX_DEFAULT, setFx } from '../src/render/fx';
import { parseScene } from '../src/scene/validate';
import { insideBy } from '../src/scene/shape';
import type { TankSetup } from '../src/scene/types';
import planted4 from '../research/visual/vf0/scenes/planted4.json';
import nano from '../research/visual/vf0/scenes/nano.json';
import reef from '../research/visual/vf0/scenes/reef.json';
const FILES: Record<string, unknown> = { planted4, nano, reef };

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const load = (n: string) => parseScene(structuredClone(FILES[n]) as never).scene.tanks[0];
const build = (S: TankSetup) => buildTank({ ...S, units: 'in' } as TankSetup & { units: 'in' }, S.tank, null);
const contacts = (sc: THREE.Scene) => { const o: THREE.Object3D[] = []; sc.traverse(x => { if (x.userData.contact) o.push(x); }); return o; };
const blob = (sc: THREE.Scene) => contacts(sc).find(o => !(o as THREE.InstancedMesh).isInstancedMesh) as THREE.Mesh | undefined;
const sig = (sc: THREE.Scene) => sc.children.map(o => o.type + ((o as THREE.Mesh).geometry?.attributes.position?.count ?? 0)).join(',');
/** The ground mesh's vertex colours (the first mesh with userData.sub on its material and a colour attribute). */
const groundCols = (sc: THREE.Scene) => { let c: number[] = []; sc.traverse(o => { const m = o as THREE.Mesh; if (!c.length && (m.material as THREE.Material)?.userData?.sub && m.geometry.attributes.color) c = Array.from(m.geometry.attributes.color.array as Float32Array); }); return c; };

beforeEach(() => setFx({ embed: false })); // (embed, VF-C2, has its own tests below; on by default since 2026-11-12)
afterEach(() => setFx({ contact: FX_DEFAULT.contact, ground: FX_DEFAULT.ground, embed: FX_DEFAULT.embed }));

describe('VF-C ground and contact', () => {
  it('switches off: no contact objects, and the scene is the same as before', () => {
    setFx({ contact: false, ground: false }); // (both on by default since 2026-11-12)
    const S = load('planted4');
    const a = build(S);
    expect(contacts(a.scene)).toHaveLength(0);
    setFx({ contact: true, ground: true }); setFx({ contact: false, ground: false });
    const b = build(S);
    expect(sig(b.scene)).toBe(sig(a.scene));
    expect(groundCols(b.scene)).toEqual(groundCols(a.scene));
  });

  it('an old save keeps its layout with the switches on', () => {
    for (const n of ['planted4', 'nano', 'reef']) {
      const S = load(n), before = JSON.stringify(S.items);
      const off = build(S);
      setFx({ contact: true, ground: true });
      const on = build(S);
      expect(JSON.stringify(S.items)).toBe(before);
      // every item mesh in the same place
      expect(on.itemMeshes.map(m => m.position.toArray().map(v => v.toFixed(2)).join())).toEqual(off.itemMeshes.map(m => m.position.toArray().map(v => v.toFixed(2)).join()));
      setFx({ contact: false, ground: false });
    }
  });

  it('one blob mesh (one draw call) under the hardscape, and the ground varies in colour', () => {
    setFx({ contact: true, ground: true });
    const S = load('reef'), b = build(S), m = blob(b.scene);
    expect(m).toBeTruthy();
    expect(contacts(b.scene).filter(o => !(o as THREE.InstancedMesh).isInstancedMesh)).toHaveLength(1);
    expect(contacts(b.scene).length).toBeLessThanOrEqual(3); // the blobs + at most two grain meshes
    const c = groundCols(build(load('planted4')).scene), lums = c.filter((_, i) => i % 3 === 1);
    expect(Math.max(...lums) - Math.min(...lums)).toBeGreaterThan(0.05);
  });

  it('the blob follows a dragged rock', () => {
    setFx({ contact: true, ground: false });
    const S = structuredClone(load('nano'));
    S.items = S.items.filter(i => i.kind === 'wood').slice(0, 1); // the piece alone: its blob is the whole mesh
    const wood = S.items[0];
    const b = build(S), units = { ...S, units: 'in' } as TankSetup & { units: 'in' };
    const mid = (sc: THREE.Scene) => { const g = blob(sc)!.geometry; g.computeBoundingBox(); return g.boundingBox!.getCenter(new THREE.Vector3()); };
    const c0 = mid(b.scene);
    wood.x += 60; // drag it 60 mm (about 2.4 in) to the right
    patchTank(b, units, S.tank, null);
    const c1 = mid(b.scene);
    expect(contacts(b.scene).filter(o => !(o as THREE.InstancedMesh).isInstancedMesh)).toHaveLength(1); // the old one was replaced
    expect(c1.x - c0.x).toBeGreaterThan(50); expect(c1.x - c0.x).toBeLessThan(70); // moved with it
  });

  it('the foot grains follow a dragged piece and go with a removed one; the ground itself does not depend on the items', () => {
    setFx({ contact: true, ground: true });
    const S = structuredClone(load('planted4'));
    S.items = S.items.filter(i => i.kind === 'wood').slice(0, 1);
    const units = { ...S, units: 'in' } as TankSetup & { units: 'in' }, b = build(S);
    const grains = (sc: THREE.Scene) => contacts(sc).filter(o => (o as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
    const meanX = (sc: THREE.Scene) => { let x = 0, n = 0; const m4 = new THREE.Matrix4(); for (const g of grains(sc)) for (let i = 0; i < g.count; i++) { g.getMatrixAt(i, m4); x += m4.elements[12]; n++; } return x / n; };
    expect(grains(b.scene).length).toBeGreaterThan(0);
    const x0 = meanX(b.scene), g0 = groundCols(b.scene);
    S.items[0].x += 60; patchTank(b, units, S.tank, null);
    expect(meanX(b.scene) - x0).toBeGreaterThan(50); expect(meanX(b.scene) - x0).toBeLessThan(70);
    // a full rebuild with the piece moved: the same ground (colours and its own grains), so a drag leaves nothing behind
    const moved = build(S);
    expect(groundCols(moved.scene)).toEqual(g0);
    const own = (sc: THREE.Scene) => { const o: number[] = []; sc.traverse(x => { const m = x as THREE.InstancedMesh; if (m.isInstancedMesh && m.userData.grains && !m.userData.contact) o.push(...Array.from(m.instanceMatrix.array as Float32Array).slice(0, 64)); }); return o; };
    expect(own(moved.scene)).toEqual(own(b.scene));
    units.items = []; patchTank(b, units, S.tank, null); // (units is a shallow copy of S: set its list)
    expect(contacts(b.scene)).toHaveLength(0);
  });

  it('a small low pebble gets a small faint shadow; no coarse grains on marine sand', () => {
    setFx({ contact: true, ground: true });
    const S = structuredClone(load('reef'));
    S.items = S.items.filter(i => i.id === 31); // 31 mm across, 15 mm tall, at the front
    const b = build(S), m = blob(b.scene)!, g = m.geometry; g.computeBoundingBox();
    const box = g.boundingBox!.getSize(new THREE.Vector3());
    expect(Math.max(box.x, box.z)).toBeLessThan(70); // the grid (the fade's full reach): was 87 mm (3.4 in) for this 31 mm pebble
    const col = g.attributes.color.array as Float32Array;
    expect(Math.max(...col)).toBeLessThan(0.08); // linear; the big rocks reach about 0.25
    expect(contacts(b.scene).filter(o => (o as THREE.InstancedMesh).isInstancedMesh)).toHaveLength(0);
  });
});

describe('VF-C2 embed', () => {
  it('sinks a stone deeper only while the switch is on, and never a stacked piece or a plant', async () => {
    const { embedSink } = await import('../src/render/contact');
    const stone = { id: 3, kind: 'stone', variant: 'granite', seed: 5, size: 220, lift: 0 } as never, stacked = { id: 4, kind: 'stone', variant: 'granite', seed: 5, size: 220, lift: 60 } as never, plant = { id: 5, kind: 'plant', variant: 'sword', seed: 1, size: 200, lift: 0 } as never;
    setFx({ embed: false }); expect(embedSink(stone)).toBe(0);
    setFx({ embed: true });
    const s = embedSink(stone); expect(s).toBeGreaterThanOrEqual(3); expect(s).toBeLessThanOrEqual(35);
    expect(embedSink(stacked)).toBe(0); expect(embedSink(plant)).toBe(0);
  });
});

describe('VF-C2 embed: berm and spill stay inside the glass (Nathan 2026-11-12: a slab stuck out through the right pane)', () => {
  const rock = () => structuredClone(load('reef').items.find(i => i.kind === 'stone')!);
  const inside = (T: TankSetup['tank'], x: number, d: number) => insideBy(T, x, d);
  for (const [name, shape] of [['planted4', undefined], ['reef', undefined], ['planted4', 'round']] as const) {
    it(`${name}${shape ? ' as ' + shape : ''}: pieces at every pane, no berm vertex or spilled grain outside`, () => {
      setFx({ embed: true, contact: true, ground: true });
      const S = structuredClone(load(name)); if (shape) { S.tank.shape = shape; S.tank.D = S.tank.L = 500; }
      const { L, D } = S.tank, r0 = rock();
      S.items = [[30, D / 2], [L - 30, D / 2], [L / 2, 30], [L / 2, D - 30], [30, 30]].map(([x, d], i) => ({ ...structuredClone(r0), id: 900 + i, x, depth: d, lift: 0, size: 160 }));
      const b = build(S); let berms = 0;
      b.scene.traverse(o => {
        if (!o.userData.contact) return;
        const m = o as THREE.Mesh;
        if ((m as THREE.InstancedMesh).isInstancedMesh) {
          const im = m as THREE.InstancedMesh, mx = new THREE.Matrix4(), p = new THREE.Vector3();
          for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, mx); p.setFromMatrixPosition(mx); expect(inside(S.tank, p.x, -p.z)).toBeGreaterThan(-0.5); }
        } else if ((m.material as THREE.Material).userData.sub) { // the berm
          berms++; const pos = m.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) expect(inside(S.tank, pos.getX(i), -pos.getZ(i))).toBeGreaterThan(-0.05);
        }
      });
      expect(berms).toBeGreaterThan(0);
    });
  }
  it('clampInside pulls a point out of the glass and leaves an inside one alone', async () => {
    const { clampInside } = await import('../src/render/contact');
    for (const n of ['planted4', 'reef']) {
      const T = load(n).tank, c = clampInside(T);
      for (const [x, d] of [[-50, 20], [T.L + 40, T.D / 2], [T.L / 2, -30], [T.L / 2, T.D + 30], [-10, -10]]) { const [a, bb] = c(x, d); expect(insideBy(T, a, bb)).toBeGreaterThan(-0.01); }
      const [x, d] = c(T.L / 2, T.D / 2); expect([x, d]).toEqual([T.L / 2, T.D / 2]);
    }
  });
});
