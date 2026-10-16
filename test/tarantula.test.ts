// Tarantulas (lane TA, 2026-10-16): the Chaco golden knee (male and female) on the large-arachnid body plan (render/tarantula3d.ts).
// Eight eyes, eight legs of seven segments, three modes (walk, tuck, threat), poses on their anchors through save / load / Shuffle,
// hides, nothing through the glass or the bark.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TARANTULAS, TAR_BEND, tarGround } from '../src/art/tarantulas';
import { rng } from '../src/art/paint';
import { getSpecies } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { tarantulaBody, tarantulaChains } from '../src/render/tarantula3d';
import { itemToTank } from '../src/scene/items';
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
const tara = (id: number, species: string, e: Partial<Fish> = {}): Fish => ({ id, species, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...e });

describe('tarantula body plan', { timeout: 120000 }, () => {
  it('the species resolve as a land invertebrate, clinging anywhere, the female with her own look', () => {
    const sp = getSpecies('chacogoldenknee')!;
    expect(sp.cat).toBe('land-invert'); expect(sp.habitat).toBe('land');
    expect(sp.surfaces).toEqual(['floor', 'glass', 'hardscape']);
    for (const s of [sp, sp.female!]) expect(s.rest).toBeCloseTo(tarGround(TARANTULAS[s.art]), 9);
    expect(sp.tl).toBe(45); expect(sp.female!.tl).toBe(50); expect(sp.female!.sex).toBe('f');
  });
  for (const art of Object.keys(TARANTULAS)) for (const [surface, R] of [['floor', 0], ['glass', 0], ['perch', 12]] as const) for (const [mode, bend] of Object.entries(TAR_BEND)) {
    it(`${art} ${surface}${R ? ' r ' + R : ''} ${mode}: finite, eight eyes, standing on its surface, a leg span of about three body lengths`, () => {
      const w = 50, g = tarantulaBody(art, w, surface, R || undefined, bend), G = tarGround(TARANTULAS[art]) * w, vs = verts(g);
      expect(vs.every(v => Number.isFinite(v.x + v.y + v.z))).toBe(true);
      expect(g.children.filter(o => (o as THREE.Mesh).geometry?.type === 'SphereGeometry').length).toBe(8);
      const box = new THREE.Box3().setFromPoints(vs), size = box.getSize(new THREE.Vector3());
      expect(g.userData.tarantula).toBe(surface === 'floor' ? 'ground' : surface); expect(g.userData.mode).toBe(mode);
      if (mode === 'walk' && surface !== 'perch') {
        // the span: the extreme feet, corner to corner (the diagonal of the footprint), about 3x the body
        expect(Math.hypot(size.x, size.z)).toBeGreaterThan(2.5 * w); expect(Math.hypot(size.x, size.z)).toBeLessThan(3.6 * w);
      }
      if (surface !== 'perch') {
        expect(box.min.y).toBeGreaterThan(-G - 0.01);   // nothing below the surface it stands on
        expect(box.min.y).toBeLessThan(-G + 3);         // and the feet down on it (a swinging foot a little off)
      } else {
        const yA = -G - R, inside = least(vs.map(v => Math.hypot(v.y - yA, v.z)));
        expect(inside).toBeGreaterThan(R - 0.1);
      }
      // eight legs of seven segments: every link has length, planted tips rest on the surface
      const ch = tarantulaChains(art, w, surface, R || undefined, bend);
      expect(ch.length).toBe(8);
      for (const c of ch) { expect(c.length).toBe(8); for (let k = 0; k < 7; k++) expect(c[k].distanceTo(c[k + 1])).toBeGreaterThan(0.015 * w); }
      if (surface !== 'perch') {
        const h = ch.map(c => c[7].y + G), planted = h.filter(x => x < 0.06 * w).length;
        expect(planted).toBe(mode === 'walk' ? (surface === 'floor' ? 4 : 8) : mode === 'tuck' ? 8 : 4);
      }
    });
  }
  it('walking: an alternating tetrapod swings (four feet lifted, the other four down), the body clear of the ground', () => {
    const w = 50, G = tarGround(TARANTULAS.gpulchripes_f) * w, ch = tarantulaChains('gpulchripes_f', w, 'floor');
    expect(ch.filter(c => c[7].y + G > 0.03 * w).length).toBe(4);
    const box = new THREE.Box3().setFromObject(tarantulaBody('gpulchripes_f', w, 'floor'));
    expect(box.min.y).toBeGreaterThan(-G - 0.01);
  });
  it('the threat pose raises the front pair high with the head up; resting tucks the legs and drops the belly', () => {
    const w = 50, G = tarGround(TARANTULAS.gpulchripes_f) * w, hs = (b: number) => tarantulaChains('gpulchripes_f', w, 'floor', undefined, b).map(c => c[7].y + G);
    expect(hs(1).filter(h => h > 0.3 * w).length).toBe(2);
    const span = (b: number) => { const s = new THREE.Box3().setFromObject(tarantulaBody('gpulchripes_f', w, 'floor', undefined, b)).getSize(new THREE.Vector3()); return Math.hypot(s.x, s.z); };
    expect(span(0.5)).toBeLessThan(0.7 * span(0));
    const eyeY = (b: number) => Math.max(...tarantulaBody('gpulchripes_f', w, 'floor', undefined, b).children.filter(o => (o as THREE.Mesh).geometry?.type === 'SphereGeometry').map(o => o.position.y));
    expect(eyeY(0.5)).toBeLessThan(eyeY(0) - 0.05);   // the carapace sits lower
    expect(eyeY(1)).toBeGreaterThan(eyeY(0) + 0.05);  // and in a threat the head is up
  });
  it('the male is darker and carries tibial hooks on the front pair; the female is lighter and has none', () => {
    expect(TARANTULAS.gpulchripes.sex).toBe('m'); expect(TARANTULAS.gpulchripes_f.sex).toBe('f');
    expect(TARANTULAS.gpulchripes.hooks).toBe(true); expect(TARANTULAS.gpulchripes_f.hooks).toBe(false);
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) + (n >> 8 & 255) + (n & 255)) / 3; };
    expect(lum(TARANTULAS.gpulchripes.carapaceCol)).toBeLessThan(lum(TARANTULAS.gpulchripes_f.carapaceCol));
    const count = (a: string) => { let n = 0; tarantulaBody(a, 50, 'floor').children.forEach(o => { n += (o as THREE.Mesh).geometry.attributes.position.count; }); return n; };
    expect(count('gpulchripes')).not.toBe(count('gpulchripes_f'));
  });
});

describe('tarantulas in the tank: hides, the floor, the glass; on their anchors, out of the glass and the bark', { timeout: 120000 }, () => {
  const scene = () => {
    const S = dry([piece(1, 'halflog', 300, 230, { size: 260, yaw: 20 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = Array.from({ length: 8 }, (_, i) => tara(i + 1, 'chacogoldenknee', i % 2 ? { sex: 'f' } : {}));
    return S;
  };
  const meshes = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes;
  it('Shuffle gives them hides, the floor and now and then the glass, in all three modes; all stay through save and load', () => {
    const seen = new Set<string>(), modes = new Set<number>(); let hid = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const S = scene(); shuffleFish(S, rng(seed));
      const hide = S.items[0], mouths = [1, -1].map(e => itemToTank(S, hide, [e * (hide.size / 2 - 0.1 * 50), 0, 0]));
      for (const f of S.fish) {
        seen.add(f.surface === 'hardscape' ? 'hard' : f.surface ?? 'floor'); modes.add(f.bend);
        if (mouths.some(q => Math.hypot(q.x - f.x, q.depth - f.depth) < 12)) hid++;
        if (f.surface === 'glass') expect(f.bend).toBe(0);
      }
      const before = meshes(S);
      const doc = structuredClone(emptyScene()); doc.tanks = [S];
      const { scene: back, warnings } = parseScene(JSON.parse(JSON.stringify(doc)));
      expect(warnings).toEqual([]);
      const after = meshes(back.tanks[0]);
      expect(after.length).toBe(before.length);
      before.forEach((m, i) => {
        const n = after[i];
        expect(n.userData.id).toBe(m.userData.id);
        expect(n.position.distanceTo(m.position)).toBeLessThan(0.01);
        expect(Math.abs(n.quaternion.dot(m.quaternion))).toBeGreaterThan(0.99999);
        expect(n.children[0].userData.mode).toBe(m.children[0].userData.mode);
      });
    }
    expect(seen.has('floor')).toBe(true); expect(seen.has('glass')).toBe(true);
    expect(hid).toBeGreaterThan(30);                          // most of them take the hide (8 animals x 12 shuffles x 70 %)
    expect([...modes].sort()).toEqual(expect.arrayContaining([0, 0.5, 1]));
  });
  it('a tarantula in a hide sits at its mouth, facing out, on the floor', () => {
    let n = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const S = scene(); shuffleFish(S, rng(seed));
      const hide = S.items[0];
      for (const f of S.fish) {
        const near = [1, -1].map(e => ({ e, q: itemToTank(S, hide, [e * (hide.size / 2 - 5), 0, 0]) })).find(m => Math.hypot(m.q.x - f.x, m.q.depth - f.depth) < 2);
        if (!near) continue;
        n++;
        const out = Math.atan2(Math.sin(hide.yaw * Math.PI / 180) * near.e, Math.cos(hide.yaw * Math.PI / 180) * near.e) * 180 / Math.PI;
        expect(Math.abs((((f.yaw - out) % 360) + 540) % 360 - 180)).toBeLessThan(25);
        expect(f.surface).toBe('floor');
      }
    }
    expect(n).toBeGreaterThan(5);
  });
  it('a tarantula on the glass lies on the pane, nothing through it, at any heading', () => {
    const heads = new Set<number>(); let n = 0;
    for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface !== 'glass') continue;
        n++;
        const g = nearestGlass(S.tank, f.x, f.depth, f.y), out = new THREE.Vector3(g.n[0], 0, -g.n[1]), at = new THREE.Vector3(g.x, f.y, -g.depth);
        const d = verts(m.children[0]).map(v => out.dot(at.clone().sub(v)));
        expect(least(d), `tarantula ${f.id}`).toBeGreaterThan(0.2);
        expect(least(d), `tarantula ${f.id}`).toBeLessThan(3.5);
        heads.add(Math.round(Math.atan2(new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion).y, 1) * 4));
      }
    }
    expect(n).toBeGreaterThan(3); expect(heads.size).toBeGreaterThan(2);
  });
  it('walking over a cork flat: the body over its top, nothing below the floor', () => {
    const S = scene(), ms = S.items.map(it => itemMesh(S, S.tank, it)!); for (const m of ms) m.updateMatrixWorld(true);
    const A = anchors(S, S.tank, { down: solidProbe(S.tank, ms) }), cork = S.items[2], q = A.rest(cork.x, cork.depth);
    expect(q.kind).toBe('cork');
    S.fish = [tara(1, 'chacogoldenknee', { x: cork.x, depth: cork.depth, yaw: 40, surface: 'hardscape', sex: 'f' })];
    const m = meshes(S)[0];
    const vs = verts(m.children[0]); expect(least(vs.map(v => v.y))).toBeGreaterThan(-1.5);   // the feet on the arch's sides, none below the floor
    expect(vs.reduce((a, v) => Math.max(a, v.y), -Infinity)).toBeGreaterThan(q.p[1] + 5);                     // the body over its top
  });
  it('in a paludarium a tarantula on the glass or a piece stays above the water', () => {
    const S = scene(); S.water.on = true; S.water.level = 0.35;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      shuffleFish(S, rng(seed));
      const wy = waterY(S.tank, S.water.level);
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface === 'glass' || f.surface === 'hardscape') expect(m.position.y, `tarantula ${f.id} ${f.surface}`).toBeGreaterThan(wy);
      }
    }
  });
});
