// Lane T (AR on iPhone): the pure parts of the .usdz export. The export itself and Quick Look are checked in the
// browser (dev page) and on a phone.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import {
  CARPET, FROST_OPACITY, GLASS_MIN, PAD, TILE, WATER_OPACITY, atlasUV, backFaces, clipTriangles, colourPlane, compact, droppedObjects,
  keepShare, packUsdz, pieces, planeAt, planeST, rootMatrix, roundGeometry, specOf, thin, tileOrigin, trimUsda, weld,
} from '../src/render/arUsdz';
import { IOS_FLAG, MM, baseCentre } from '../src/render/ar';
import { defaultSetup } from '../src/scene/defaults';

const tex = () => new THREE.Texture();
const geo = (pos: number[], idx: number[], extra: Record<string, [number[], number]> = {}) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const [k, [a, n]] of Object.entries(extra)) g.setAttribute(k, new THREE.Float32BufferAttribute(a, n));
  g.setIndex(idx);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
};

describe('materials in Quick Look', () => {
  it('drops outlines, lines, hidden hit cards and the decal shadows', () => {
    expect(specOf(new THREE.ShaderMaterial(), false)).toBeNull();
    expect(specOf(new THREE.LineBasicMaterial(), false)).toBeNull();
    expect(specOf(new THREE.MeshBasicMaterial({ visible: false }), false)).toBeNull();
    const shadow = new THREE.MeshBasicMaterial({ map: tex(), transparent: true, opacity: 0.4 });
    expect(specOf(shadow, false, { nolight: true })).toBeNull();
    expect(specOf(shadow, false)).not.toBeNull(); // a translucent textured part of an animal stays
  });

  it('turns the water volume shader into a light translucent tint in its colour', () => {
    const w = new THREE.ShaderMaterial({ uniforms: { uWCol: { value: new THREE.Color(0.2, 0.5, 0.4) } } });
    const s = specOf(w, false)!;
    expect(s.transparent).toBe(true); expect(s.opacity).toBe(WATER_OPACITY); expect(s.color.g).toBeCloseTo(0.5);
  });

  it('frosted film = translucent sheet both sides; glass keeps at least GLASS_MIN; glow glows', () => {
    const f = new THREE.MeshPhysicalMaterial(); f.userData.frost = true;
    expect(specOf(f, false)).toMatchObject({ opacity: FROST_OPACITY, transparent: true, double: true });
    expect(specOf(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.06 }), false)!.opacity).toBe(GLASS_MIN);
    const g = new THREE.MeshBasicMaterial(); g.userData.glow = true;
    expect(specOf(g, false)!.emissive).toBe(true);
  });

  it('soft-edged cards blend their alpha; cut-out cards keep alphaTest; double-sided stays double', () => {
    const soft = new THREE.MeshBasicMaterial({ map: tex(), side: THREE.DoubleSide }); soft.alphaToCoverage = true;
    expect(specOf(soft, false)).toMatchObject({ transparent: true, alphaTest: 0, double: true });
    expect(specOf(new THREE.MeshBasicMaterial({ map: tex(), alphaTest: 0.5 }), false)).toMatchObject({ transparent: false, alphaTest: 0.5 });
  });

  it('bakes vertex colours only where there is no map', () => {
    expect(specOf(new THREE.MeshBasicMaterial({ vertexColors: true }), true)!.bake).toBe(true);
    expect(specOf(new THREE.MeshBasicMaterial({ vertexColors: true, map: tex() }), true)!.bake).toBe(false);
  });
});

describe('placement in the room', () => {
  it('puts the base centre at the origin, in metres', () => {
    const S = defaultSetup(), c = baseCentre(S), M = rootMatrix(c);
    expect(c.clone().applyMatrix4(M).length()).toBeLessThan(1e-9);
    const a = c.clone().add(new THREE.Vector3(1000, 250, -400)).applyMatrix4(M);
    expect(a.x).toBeCloseTo(1); expect(a.y).toBeCloseTo(0.25); expect(a.z).toBeCloseTo(-0.4);
    expect(MM).toBe(0.001);
  });

  it('leaves out the scale person, the room floor, the wall and the terrain dots, keeps the tank', () => {
    const sc = new THREE.Scene(), person = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); person.name = 'person';
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshBasicMaterial());
    const wallMat = new THREE.MeshBasicMaterial(); wallMat.userData.wallPaint = true;
    const wall = new THREE.Group(); wall.add(new THREE.Mesh(new THREE.PlaneGeometry(6000, 2700), wallMat));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(3), new THREE.MeshBasicMaterial()), tank = new THREE.Mesh(new THREE.BoxGeometry(900, 400, 450), new THREE.MeshBasicMaterial());
    sc.add(person, floor, wall, dot, tank);
    const d = droppedObjects({ scene: sc, dotMeshes: [dot] } as never);
    for (const o of [person, floor, wall, dot]) expect(d.has(o)).toBe(true);
    expect(d.has(tank)).toBe(false);
  });

  it('the iPhone path waits behind ?ar=ios until it is tested on a phone', () => expect(IOS_FLAG).toBe(true));
});

describe('vertex colours -> atlas', () => {
  it('reproduces colours on a plane exactly, and says how far others are off', () => {
    const cols: number[] = [], base = [0.2, 0.5, 0.1], a = [0.3, 0.1, 0.05], b = [-0.05, 0.2, 0.1];
    for (let i = 0; i < 20; i++) { const s = (i % 5) / 4, t = Math.floor(i / 5) / 3; cols.push(...base.map((v, k) => v + s * a[k] + t * b[k])); }
    const pl = colourPlane(cols);
    expect(pl.err).toBeLessThan(1e-6);
    for (let i = 0; i < 20; i++) {
      const [s, t] = planeST(pl, cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]), c = planeAt(pl, s, t);
      expect(c.r).toBeCloseTo(cols[i * 3], 5); expect(c.g).toBeCloseTo(cols[i * 3 + 1], 5); expect(c.b).toBeCloseTo(cols[i * 3 + 2], 5);
    }
    const cube = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1];
    expect(colourPlane(cube).err).toBeGreaterThan(0.1);
  });

  it('a single colour collapses the plane but stays exact', () => {
    const pl = colourPlane([0.3, 0.6, 0.2, 0.3, 0.6, 0.2]), c = planeAt(pl, 0.5, 0.5);
    expect(pl.err).toBeLessThan(1e-9); expect(c.g).toBeCloseTo(0.6, 6);
  });

  it('maps (s, t) into the inside of its tile, flipped to v-up', () => {
    const cols = 5, W = cols * TILE;
    for (const k of [0, 7, 24]) {
      const [x0, y0] = tileOrigin(k, cols), [u0, v0] = atlasUV(k, cols, 0, 0), [u1, v1] = atlasUV(k, cols, 1, 1);
      expect(u0 * W).toBeCloseTo(x0 + PAD); expect(u1 * W).toBeCloseTo(x0 + TILE - PAD);
      expect((1 - v0) * W).toBeCloseTo(y0 + PAD); expect((1 - v1) * W).toBeCloseTo(y0 + TILE - PAD);
    }
  });
});

describe('geometry', () => {
  // two triangles side by side in the xy plane: x 0..2
  const quad = () => geo([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 2, 1, 0], [0, 1, 2, 1, 3, 2, 1, 4, 3, 4, 5, 3]);

  it('drops the triangles a clipping plane cuts away (by centroid)', () => {
    const g = clipTriangles(quad(), [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1)]); // keeps x <= 1
    expect(g.index!.count / 3).toBe(2);
  });

  it('back faces: reversed winding, flipped normals', () => {
    const g = quad(), b = backFaces(g);
    expect([b.index!.getX(0), b.index!.getX(1), b.index!.getX(2)]).toEqual([0, 2, 1]);
    expect(b.attributes.normal.getZ(0)).toBeCloseTo(-g.attributes.normal.getZ(0));
  });

  it('compact keeps only the used vertices', () => {
    const g = compact(quad(), [1, 4, 3]);
    expect(g.attributes.position.count).toBe(3);
    expect(g.attributes.position.getX(1)).toBe(2);
    expect(Array.from(g.index!.array)).toEqual([0, 1, 2]);
  });

  it('welds a triangle soup at shared corners (same uv), keeps uv seams apart', () => {
    const p = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const uv = [0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1];
    expect(weld(geo(p, [0, 1, 2, 3, 4, 5], { uv: [uv, 2] })).attributes.position.count).toBe(4);
    const seam = uv.slice(); seam[6] = 0.5; // the shared corner (1,0,0) has another uv in the second triangle
    expect(weld(geo(p, [0, 1, 2, 3, 4, 5], { uv: [seam, 2] })).attributes.position.count).toBe(5);
  });

  it('pieces: separate leaves are separate', () => {
    const g = geo([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 0, 0, 6, 0, 0, 5, 1, 0], [0, 1, 2, 3, 4, 5]);
    expect(new Set(pieces(g.index!.array, 6)).size).toBe(2);
  });

  it('keepShare keeps a leaf\'s front and back together, and about the share asked', () => {
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i < 400; i++) {
      const x = (i % 20) * 10, z = Math.floor(i / 20) * 10;
      for (const side of [0, 1]) {
        const o = pos.length / 3;
        pos.push(x, 0, z, x + 3, 0, z, x, 5, z);
        idx.push(...(side ? [o, o + 2, o + 1] : [o, o + 1, o + 2]));
      }
    }
    const g = geo(pos, idx), kept = keepShare(g, 0.4), n = kept.length / 3;
    expect(n % 2).toBe(0);
    const at = (t: number) => Math.min(...kept.slice(t * 3, t * 3 + 3).map(v => pos[v * 3]));
    const fronts = new Map<string, number>();
    for (let t = 0; t < n; t++) { const k = at(t) + '|' + pos[kept[t * 3] * 3 + 2]; fronts.set(k, (fronts.get(k) ?? 0) + 1); }
    for (const c of fronts.values()) expect(c).toBe(2);
    expect(n / 2 / 400).toBeGreaterThan(0.3); expect(n / 2 / 400).toBeLessThan(0.5);
    expect(keepShare(g, 1).length).toBe(idx.length); expect(keepShare(g, 0).length).toBe(0);
  });

  it('simplifies a dense flat grid to a handful of triangles, same outline', async () => {
    const N = 40, pos: number[] = [], idx: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pos.push(i * 5, j * 5, 0);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const parts = [{ g: geo(pos, idx), kind: 'other' }];
    await thin(parts, 1e9);
    const g = parts[0].g; g.computeBoundingBox();
    expect(g.index!.count / 3).toBeLessThan(50);
    expect(g.boundingBox!.max.x).toBeCloseTo(200); expect(g.boundingBox!.max.y).toBeCloseTo(200);
  });

  it('over budget, carpets give way first', async () => {
    const blades = (n: number) => {
      const pos: number[] = [], idx: number[] = [];
      for (let i = 0; i < n; i++) { const x = (i % 50) * 4, z = Math.floor(i / 50) * 4, o = pos.length / 3; pos.push(x, 0, z, x + 1, 0, z, x + 0.5, 6, z); idx.push(o, o + 1, o + 2); }
      return geo(pos, idx, { color: [Array(n * 9).fill(0.4), 3] });
    };
    const carpet = { g: blades(CARPET + 500), kind: 'plants' }, stem = { g: blades(200), kind: 'plants' };
    const share = await thin([carpet, stem], 1000);
    expect(share.carpets).toBeLessThan(1); expect(share.leaves).toBe(1);
  });
});

describe('the file', () => {
  it('drops trailing zeros, keeps integers', () => {
    expect(trimUsda('point3f[] points = [(0.1235000, -0.0000000, 1.000000), (12, 3, 40)]'))
      .toBe('point3f[] points = [(0.1235, 0, 1), (12, 3, 40)]');
    expect(trimUsda('int[] faceVertexIndices = [0, 10, 200]\n#usda 1.0')).toBe('int[] faceVertexIndices = [0, 10, 200]\n#usda 1.0');
  });

  it('rounds points to 0.1 mm (in m), normals to 0.01', () => {
    const g = geo([0.123456, -0.00001, 1, 0, 0, 0, 0, 1, 0], [0, 1, 2]);
    roundGeometry(g);
    expect(g.attributes.position.getX(0)).toBeCloseTo(0.1235, 6); expect(g.attributes.position.getY(0)).toBe(0);
  });

  it('packs a stored zip, files in order, each file\'s data on a 64-byte boundary', async () => {
    const enc = new TextEncoder(), files = { 'model.usda': enc.encode('#usda 1.0\n'), 'geometries/Geometry_1.usda': enc.encode('x'.repeat(77)), 'textures/Texture_9.png': new Uint8Array(1000) };
    const zip = await packUsdz(files), dv = new DataView(zip.buffer, zip.byteOffset);
    let off = 0;
    const names: string[] = [];
    while (dv.getUint32(off, true) === 0x04034b50) {
      const size = dv.getUint32(off + 18, true), nl = dv.getUint16(off + 26, true), el = dv.getUint16(off + 28, true), data = off + 30 + nl + el;
      expect(dv.getUint16(off + 8, true)).toBe(0); // stored
      expect(data % 64).toBe(0);
      names.push(new TextDecoder().decode(zip.subarray(off + 30, off + 30 + nl)));
      off = data + size;
    }
    expect(names).toEqual(Object.keys(files));
    expect(new TextDecoder().decode(unzipSync(zip)['geometries/Geometry_1.usda'])).toBe('x'.repeat(77));
  });
});
