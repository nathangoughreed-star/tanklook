// Spiders (lane JS, 2026-10-16): the regal jumping spider (male and female) on the arthropod body plan (render/spider3d.ts).
// Eight eyes, eight legs of six segments, poses on their anchors through save / load / Shuffle, nothing through the glass or the bark.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SPIDERS, spiderGround } from '../src/art/spiders';
import { rng } from '../src/art/paint';
import { getSpecies } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { spiderBody, spiderChains } from '../src/render/spider3d';
import { anchors } from '../src/scene/anchors';
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
const least = (a: number[]) => a.reduce((m, x) => Math.min(m, x), Infinity);
const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
function dry(items: Item[]): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 600, D: 450, H: 450 }; S.water.on = false; S.items = items; S.fish = [];
  return S;
}
const spider = (id: number, species: string, e: Partial<Fish> = {}): Fish => ({ id, species, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...e });

describe('spider body plan', { timeout: 60000 }, () => {
  it('the species resolve as a land invertebrate, clinging anywhere, the female with her own look', () => {
    const sp = getSpecies('regaljumper')!;
    expect(sp.cat).toBe('land-invert'); expect(sp.habitat).toBe('land');
    expect(sp.surfaces).toEqual(['floor', 'glass', 'hardscape']);
    for (const s of [sp, sp.female!]) expect(s.rest).toBeCloseTo(spiderGround(SPIDERS[s.art]), 9);
    expect(sp.tl).toBe(12); expect(sp.female!.tl).toBe(15); expect(sp.female!.sex).toBe('f');
  });
  for (const art of Object.keys(SPIDERS)) for (const [surface, R] of [['floor', 0], ['glass', 0], ['perch', 9], ['perch', 30]] as const) for (const alert of [false, true]) {
    it(`${art} ${surface}${R ? ' r ' + R : ''}${alert ? ' alert' : ''}: finite, eight eyes, standing on its surface`, () => {
      const w = 15, g = spiderBody(art, w, surface, R || undefined, alert), G = spiderGround(SPIDERS[art]) * w, vs = verts(g);
      expect(vs.every(v => Number.isFinite(v.x + v.y + v.z))).toBe(true);
      expect(g.children.filter(o => (o as THREE.Mesh).geometry?.type === 'SphereGeometry').length).toBe(8);
      const box = new THREE.Box3().setFromPoints(vs), size = box.getSize(new THREE.Vector3());
      expect(g.userData.spider).toBe(surface === 'floor' ? 'ground' : surface); expect(g.userData.alert).toBe(alert);
      expect(size.x).toBeGreaterThan(w * 1.15); expect(size.x).toBeLessThan(w * 2.6);
      expect(size.z).toBeGreaterThan(w * 0.8); expect(size.z).toBeLessThan(w * 2.8);
      if (surface !== 'perch') {
        expect(box.min.y).toBeGreaterThan(-G - 0.01); // nothing below the surface it stands on
        expect(box.min.y).toBeLessThan(-G + 0.4);     // and the feet down on it
      } else {
        const yA = -G - R, inside = least(vs.map(v => Math.hypot(v.y - yA, v.z)));
        expect(inside).toBeGreaterThan(R - 0.05);
      }
      // eight legs, each of six segments: every link has length, the tip rests on the surface
      const ch = spiderChains(art, w, surface, R || undefined, alert);
      expect(ch.length).toBe(8);
      for (const c of ch) { expect(c.length).toBe(7); for (let k = 0; k < 6; k++) expect(c[k].distanceTo(c[k + 1])).toBeGreaterThan(0.02 * w); }
      if (!alert && surface !== 'perch') for (const c of ch) expect(Math.abs(c[6].y - (-G + 0.016 * w))).toBeLessThan(0.02);
    });
  }
  it('alert raises the front pair: their tips well above the surface, the other six on it', () => {
    const w = 15, G = spiderGround(SPIDERS.regaljumper_f) * w, ch = spiderChains('regaljumper_f', w, 'floor', undefined, true);
    const heights = ch.map(c => c[6].y + G);
    expect(heights.filter(h => h > 0.15 * w).length).toBe(2);
    expect(heights.filter(h => h < 0.05 * w).length).toBe(6);
  });
  it('the male is black and white, the female grey-brown: their paint differs', () => {
    expect(SPIDERS.regaljumper.sex).toBe('m'); expect(SPIDERS.regaljumper_f.sex).toBe('f');
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) + (n >> 8 & 255) + (n & 255)) / 3; };
    expect(lum(SPIDERS.regaljumper.abdomenCol)).toBeLessThan(30);
    expect(lum(SPIDERS.regaljumper_f.abdomenCol)).toBeGreaterThan(70);
    expect(lum(SPIDERS.regaljumper.palpCol)).toBeGreaterThan(200);
  });
});

describe('spiders in the tank: on their anchors, out of the glass and the bark', { timeout: 60000 }, () => {
  const scene = () => {
    const S = dry([piece(1, 'climb', 300, 230, { size: 440, yaw: 15 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = Array.from({ length: 8 }, (_, i) => spider(i + 1, 'regaljumper', i % 2 ? { sex: 'f' } : {}));
    return S;
  };
  const meshes = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes;
  it('Shuffle puts spiders on the glass, the branch and the floor, some alert; all stay through save and load', () => {
    const seen = new Set<string>(); let alert = 0, calm = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const f of S.fish) { seen.add(f.surface === 'hardscape' ? 'hard' : f.surface ?? 'floor'); if (f.bend > 0.5) alert++; else calm++; }
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
        expect(n.children[0].userData.alert).toBe(m.children[0].userData.alert);
      });
    }
    for (const k of ['glass', 'branch', 'floor']) expect(seen.has(k), k).toBe(true);
    expect(alert).toBeGreaterThan(0); expect(calm).toBeGreaterThan(alert);
  });
  it('a spider on the glass lies on the pane, nothing through it, at every heading', () => {
    const heads = new Set<number>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface !== 'glass') continue;
        const g = nearestGlass(S.tank, f.x, f.depth, f.y), out = new THREE.Vector3(g.n[0], 0, -g.n[1]), at = new THREE.Vector3(g.x, f.y, -g.depth);
        const d = verts(m.children[0]).map(v => out.dot(at.clone().sub(v)));
        expect(least(d), `spider ${f.id}`).toBeGreaterThan(0.2);
        expect(least(d), `spider ${f.id}`).toBeLessThan(2.5);
        heads.add(Math.round(Math.atan2(new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion).y, 1) * 4));
      }
    }
    expect(heads.size).toBeGreaterThan(2);
  });
  it('a spider on the branch walks along it, nothing inside the bark near it', () => {
    const S = scene(), ms = S.items.map(it => itemMesh(S, S.tank, it)!); for (const m of ms) m.updateMatrixWorld(true);
    const A = anchors(S, S.tank, { down: solidProbe(S.tank, ms) }), br = S.items[0];
    const spot = (() => {
      for (let k = 2; k < 9; k++) {
        const t = k / 10, x = br.x + (t - 0.3) * 0.5 * br.size * Math.cos(15 * Math.PI / 180), d = br.depth + (t - 0.3) * 0.5 * br.size * Math.sin(15 * Math.PI / 180), q = A.rest(x, d);
        if (q.kind === 'branch' && q.limb) return { x, d, q };
      }
      throw new Error('no spot on the branch');
    })();
    S.fish = [spider(1, 'regaljumper', { x: spot.x, depth: spot.d, yaw: 15, surface: 'hardscape', sex: 'f' })];
    const m = meshes(S)[0], L = spot.q.limb!;
    expect(m.userData.perch).toBe('branch');
    const c = new THREE.Vector3(L.c[0], L.c[1], -L.c[2]), along = new THREE.Vector3(L.along[0], L.along[1], -L.along[2]);
    const vs = verts(m.children[0]).filter(v => Math.abs(v.clone().sub(c).dot(along)) < 12);
    const r = vs.map(v => { const q = v.clone().sub(c); return q.addScaledVector(along, -q.dot(along)).length(); });
    expect(least(r)).toBeGreaterThan(L.r - 0.6);
    expect(r.filter(x => x < L.r + 1).length).toBeGreaterThan(20); // the feet on the bark
  });
  it('in a paludarium a spider never ends up in the water', () => {
    const S = scene(); S.water.on = true; S.water.level = 0.35;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      shuffleFish(S, rng(seed));
      const wy = waterY(S.tank, S.water.level);
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface === 'glass' || f.surface === 'hardscape') expect(m.position.y, `spider ${f.id} ${f.surface}`).toBeGreaterThan(wy);
      }
    }
  });
});
