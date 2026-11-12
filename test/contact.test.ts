// Lane VF-C (plan VF stages VF3 / VF4, 2026-11-11): substrate variation (fx ground) and contact shadows (fx contact).
// - an old save (the VF0 reference tanks) loads with the same layout whichever switches are on (render only)
// - the switches off give the old scene: no contact objects, the same object list and ground colours as before
// - the contact blob follows a dragged rock (patchTank rebuilds the contact part; the blob's middle moves with it)
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTank, patchTank } from '../src/render/build';
import { setFx } from '../src/render/fx';
import { parseScene } from '../src/scene/validate';
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

afterEach(() => setFx({ contact: false, ground: false }));

describe('VF-C ground and contact', () => {
  it('switches off: no contact objects, and the scene is the same as before', () => {
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
});
