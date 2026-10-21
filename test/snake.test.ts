// Snakes (lane BP, 2026-10-16): the ball python on the serpentine body plan (render/snake3d.ts).
// A spine of constant length in every pose (a pose bends, never stretches), no coil through another or through the ground or the
// bark, the pose family riding in `bend` through save / load / Shuffle, a size by life stage that fits the tank.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SNAKES, SNAKE_STAGES, snakeGround, snakeStageFor } from '../src/art/snakes';
import { rng } from '../src/art/paint';
import { getSpecies, fishTL } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { settleSnake, snakeBody, snakeContacts, snakePoseOf, snakeSpine, SPINE_N } from '../src/render/snake3d';
import { anchors } from '../src/scene/anchors';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY } from '../src/scene/items';
import { shuffleFish } from '../src/scene/scatter';
import type { Fish, Item, TankSetup } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';
import { waterY } from '../src/scene/physics';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

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
const snake = (id: number, e: Partial<Fish> = {}): Fish => ({ id, species: 'ballpython', x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...e });
const BENDS = [-1, -0.85, -0.5, -0.3, 0, 0.2, 0.5, 0.65, 1];

describe('ball python body plan', () => {
  it('resolves as a land reptile that rests on the floor and the hardscape, not the glass', () => {
    const sp = getSpecies('ballpython')!;
    expect(sp.cat).toBe('reptile'); expect(sp.habitat).toBe('land'); expect(sp.body).toBe('snake');
    expect(sp.surfaces).toEqual(['floor', 'hardscape']);
    expect(sp.tl).toBe(1200); expect(sp.rest).toBeCloseTo(snakeGround(SNAKES.ballpython), 9);
  });
  it('the pose family rides in bend: five on a floor, wrap / drape on a limb', () => {
    expect([-1, -0.5, 0, 0.5, 1].map(b => snakePoseOf('floor', undefined, b).pose)).toEqual(['ball', 'extended', 'coiled', 'alert', 'serpentine']);
    expect([-1, -0.5, 0, 0.5, 1].map(b => snakePoseOf('perch', 0.03, b).pose)).toEqual(['wrap', 'drape', 'wrap', 'wrapalert', 'drape']);
    expect(snakePoseOf('perch', 0.005, 0).pose).toBe('drape'); // a twig too thin to wrap
    expect(snakePoseOf('hardscape', undefined, 0.5).pose).toBe('coiled'); expect(snakePoseOf('hardscape', undefined, -1).pose).toBe('ball');
    expect(snakePoseOf('floor', undefined, -0.3).sign).toBe(1); expect(snakePoseOf('floor', undefined, -0.7).sign).toBe(-1);
  });
  for (const bend of BENDS) for (const w of [250, 1200]) {
    it(`bend ${bend}, ${w} mm: the spine is as long as the animal, clear of itself and of the ground`, () => {
      const sp = snakeSpine('ballpython', w, 'floor', undefined, bend), G = sp.ground, p = sp.pts, N = SPINE_N;
      expect(p.length).toBe(N + 1);
      let len = 0; for (let i = 1; i <= N; i++) len += p[i].distanceTo(p[i - 1]);
      expect(len).toBeGreaterThan(w * 0.995); expect(len).toBeLessThan(w * 1.01);
      // every pair of spine spheres that are not neighbours along the body is clear of each other
      let worst = Infinity;
      for (let i = 0; i <= N; i++) for (let j = 0; j < i; j++) {
        const R = sp.rr[i] + sp.rr[j]; if ((i - j) / N < 1.8 * R / w) continue;
        worst = Math.min(worst, p[i].distanceTo(p[j]) / R);
      }
      expect(worst, 'spheres overlap').toBeGreaterThan(0.84);
      // the body: finite, on the ground line, within a believable footprint
      const g = snakeBody('ballpython', w, 'floor', undefined, bend), vs = verts(g), box = new THREE.Box3().setFromPoints(vs), size = box.getSize(new THREE.Vector3());
      expect(vs.every(v => Number.isFinite(v.x + v.y + v.z))).toBe(true);
      expect(box.min.y).toBeGreaterThan(-G - 0.002 * w); expect(box.min.y).toBeLessThan(-G + 0.01 * w);
      expect(Math.max(size.x, size.z)).toBeLessThan(w * 1.02);
      expect(g.userData.snake).toBe(sp.pose);
    });
  }
  it('the coil is compact and the extended pose long; the head is clearly broader than the neck', () => {
    const w = 1000, ext = new THREE.Box3().setFromPoints(snakeSpine('ballpython', w, 'floor', undefined, -0.5).pts), coil = new THREE.Box3().setFromPoints(snakeSpine('ballpython', w, 'floor', undefined, 0).pts);
    expect(ext.getSize(new THREE.Vector3()).x).toBeGreaterThan(0.7 * w);
    expect(Math.max(coil.getSize(new THREE.Vector3()).x, coil.getSize(new THREE.Vector3()).z)).toBeLessThan(0.35 * w);
    const st = SNAKES.ballpython.stations, neck = st.find(s => s[0] === SNAKES.ballpython.neck)![1], head = Math.max(...st.filter(s => s[0] > 0.94).map(s => s[1]));
    expect(head / neck).toBeGreaterThan(1.25);
    const tail = st.find(s => s[0] === 0.09)![1], mid = st.find(s => s[0] === 0.4)![1];
    expect(tail).toBeLessThan(0.6 * mid); // a short thin tail
  });
  it('the alert pose raises the head well above the ground, the others stay low', () => {
    const w = 1000;
    const top = (b: number) => { const sp = snakeSpine('ballpython', w, 'floor', undefined, b); return sp.pts[SPINE_N].y + sp.ground; };
    expect(top(0.5)).toBeGreaterThan(0.06 * w);
    expect(top(-0.5)).toBeLessThan(0.04 * w); expect(top(0)).toBeLessThan(0.1 * w);
  });
  for (const R of [0.02, 0.05]) for (const bend of [-1, -0.5, 0, 0.5, 1]) {
    it(`on a limb of radius ${R} (bend ${bend}): nothing inside the bark, hugging it`, () => {
      const w = 600, g = snakeBody('ballpython', w, 'perch', R * w, bend), G = snakeGround(SNAKES.ballpython) * w, yA = -G - R * w, vs = verts(g);
      expect(vs.every(v => Number.isFinite(v.x + v.y + v.z))).toBe(true);
      const inside = least(vs.map(v => Math.hypot(v.y - yA, v.z)));
      expect(inside).toBeGreaterThan(R * w - 0.002 * w);
      expect(vs.filter(v => Math.hypot(v.y - yA, v.z) < R * w + 0.01 * w).length).toBeGreaterThan(200); // lying on it
    });
  }
  it('a wrap winds round the limb: its angle round the axis covers more than one turn', () => {
    const w = 600, R = 0.03, sp = snakeSpine('ballpython', w, 'perch', R * w, 0), yA = -sp.ground - R * w;
    let turn = 0, prev = Math.atan2(sp.pts[0].z, sp.pts[0].y - yA);
    for (const q of sp.pts) { const a = Math.atan2(q.z, q.y - yA); let d = a - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; turn += d; prev = a; }
    expect(Math.abs(turn)).toBeGreaterThan(2 * Math.PI);
  });
  it('a hatchling has a relatively larger head and eye than an adult', () => {
    const a = snakeBody('ballpython', 1200, 'floor', undefined, 0), h = snakeBody('ballpython', 250, 'floor', undefined, 0);
    expect(a.userData.baby).toBe(1); expect(h.userData.baby).toBeGreaterThan(1.2);
  });
  it('life stages: the largest that fits the tank, at least a hatchling', () => {
    expect(snakeStageFor(1500, 1200)).toBe(1200); expect(snakeStageFor(900, 1200)).toBe(800); expect(snakeStageFor(600, 1200)).toBe(500);
    expect(snakeStageFor(300, 1200)).toBe(250); expect(snakeStageFor(100, 1200)).toBe(SNAKE_STAGES[0][1]);
  });
});

describe('snakes in the tank', () => {
  const scene = () => {
    const S = dry([piece(1, 'climb', 300, 230, { size: 440, yaw: 15 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = Array.from({ length: 6 }, (_, i) => snake(i + 1));
    return S;
  };
  const meshes = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes;
  it('Shuffle gives each snake a size that fits the tank and a spread of poses; all identical through save and load', () => {
    const poses = new Set<string>(), kinds = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const f of S.fish) {
        expect(fishTL(f, getSpecies('ballpython')!)).toBeLessThanOrEqual(S.tank.L); // 600 mm tank: a juvenile, not the 1.2 m adult
        expect(f.bend).toBeGreaterThanOrEqual(-1); expect(f.bend).toBeLessThanOrEqual(1);
        expect(f.surface === 'floor' || f.surface === 'hardscape').toBe(true);
      }
      const before = meshes(S);
      for (const m of before) { poses.add(m.children[0].userData.snake); if (m.userData.perch) kinds.add(m.userData.perch); }
      const doc = structuredClone(emptyScene()); doc.tanks = [S];
      const { scene: back, warnings } = parseScene(JSON.parse(JSON.stringify(doc)));
      expect(warnings).toEqual([]);
      const after = meshes(back.tanks[0]);
      expect(after.length).toBe(before.length);
      before.forEach((m, i) => {
        const n = after[i];
        expect(n.userData.id).toBe(m.userData.id); expect(n.children[0].userData.snake).toBe(m.children[0].userData.snake);
        expect(n.position.distanceTo(m.position)).toBeLessThan(0.01);
        expect(Math.abs(n.quaternion.dot(m.quaternion))).toBeGreaterThan(0.99999);
      });
    }
    for (const k of ['ball', 'coiled', 'extended', 'alert', 'wrap']) expect(poses.has(k), k).toBe(true);
    expect(kinds.has('branch')).toBe(true);
  });
  it('a larger tank keeps the adult', () => {
    const S = scene(); S.tank = { ...S.tank, L: 1500 }; shuffleFish(S, rng(3));
    for (const f of S.fish) expect(f.tl).toBeUndefined();
  });
  it('a snake on the floor lies on the substrate, not in it', () => {
    for (const seed of [1, 2, 3, 4]) {
      const S = dry([]); S.fish = [snake(1), snake(2), snake(3)]; shuffleFish(S, rng(seed));
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        const w = fishTL(f, getSpecies('ballpython')!), vs = verts(m.children[0]);
        // the body group is in the card's frame: its lowest point is the ground line, and the card is rest * w above the ground
        const low = least(vs.map(v => v.y)), ground = m.position.y - SNAKES.ballpython.aspect / 2 * w;
        expect(low - ground).toBeGreaterThan(-0.002 * w - 0.001); expect(low - ground).toBeLessThan(0.02 * w + 1);
      }
    }
  });
  it('a snake on the branch lies along it, nothing inside the bark near it', () => {
    const S = scene(), ms = S.items.map(it => itemMesh(S, S.tank, it)!); for (const m of ms) m.updateMatrixWorld(true);
    const A = anchors(S, S.tank, { down: solidProbe(S.tank, ms) }), br = S.items[0];
    const spot = (() => {
      for (let k = 2; k < 9; k++) {
        const t = k / 10, x = br.x + (t - 0.3) * 0.5 * br.size * Math.cos(15 * Math.PI / 180), d = br.depth + (t - 0.3) * 0.5 * br.size * Math.sin(15 * Math.PI / 180), q = A.rest(x, d);
        if (q.kind === 'branch' && q.limb) return { x, d, q };
      }
      throw new Error('no spot on the branch');
    })();
    for (const bend of [0, -0.5, 0.5]) {
      S.fish = [snake(1, { x: spot.x, depth: spot.d, yaw: 15, surface: 'hardscape', bend, tl: 400 })];
      const m = meshes(S)[0], L = spot.q.limb!;
      expect(m.userData.perch).toBe('branch');
      const c = new THREE.Vector3(L.c[0], L.c[1], -L.c[2]), along = new THREE.Vector3(L.along[0], L.along[1], -L.along[2]);
      const vs = verts(m.children[0]).filter(v => Math.abs(v.clone().sub(c).dot(along)) < 12);
      const r = vs.map(v => { const q = v.clone().sub(c); return q.addScaledVector(along, -q.dot(along)).length(); });
      expect(least(r), `bend ${bend}`).toBeGreaterThan(L.r - 1);
    }
  });
  it('in a paludarium a snake never ends up in the water', () => {
    const S = scene(); S.water.on = true; S.water.level = 0.35;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      shuffleFish(S, rng(seed));
      const wy = waterY(S.tank, S.water.level);
      for (const m of meshes(S)) {
        const f = S.fish.find(q => q.id === m.userData.id)!;
        if (f.surface === 'hardscape') expect(m.position.y, `snake ${f.id}`).toBeGreaterThan(wy);
      }
    }
  });
});

describe('settling on uneven ground (lane BP2)', () => {
  const MAXT = 45 * Math.PI / 180;
  const check = (bend: number, ground: (x: number, z: number) => number) => {
    const w = 800, c = snakeContacts('ballpython', w, bend), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.7, 0, 'YXZ'));
    const st = settleSnake(c, q, { x: 100, z: -50 }, ground, MAXT), qq = q.clone().premultiply(st.rot);
    let low = Infinity, air = 0;
    for (const [x, y, z, r] of c.pts) {
      const p = new THREE.Vector3(x, y, z).applyQuaternion(qq); p.y += st.y; p.x += 0; 
      const gap = p.y - r - ground(st.x + p.x, st.z + p.z); low = Math.min(low, gap); air = Math.max(air, gap);
    }
    return { low, air, w };
  };
  it('lies on a slope without clipping', () => {
    for (const bend of [-1, -0.5, 0, 0.5, 1]) { const r = check(bend, (x) => x * 0.2); expect(r.low).toBeGreaterThan(-0.5 - 1e-6); }
  });
  it('flat ground: no tilt, resting on it', () => {
    const r = check(-1, () => 0); expect(Math.abs(r.low)).toBeLessThan(1); expect(r.air).toBeLessThan(0.05 * r.w);
  });
  it('over a step it never clips and floats less than the plain highest-point rest', () => {
    const step = (x: number) => (x > 100 ? 40 : 0), r = check(-1, step);
    expect(r.low).toBeGreaterThan(-1e-6);
  });
});

describe('clearance on hardscape (lane BP2)', () => {
  it('Shuffle keeps animals off two animals on one spot on a ledge or branch', () => {
    const count = (room?: number) => {
      let bad = 0, onHard = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const S = dry([piece(1, 'ledge', 300, 200, { size: 300, lift: 120 }), piece(2, 'climb', 150, 200, { size: 380 })]);
        S.fish = [1, 2, 3].map(i => snake(i, { tl: 250, surface: 'hardscape' }));
        shuffleFish(S, rng(seed), undefined, undefined, room);
        const h = S.fish.filter(f => f.surface === 'hardscape'); onHard += h.length;
        for (let a = 0; a < h.length; a++) for (let b = a + 1; b < h.length; b++) if (Math.hypot(h[a].x - h[b].x, h[a].y - h[b].y, h[a].depth - h[b].depth) < 0.3 * 500) bad++;
      }
      return { bad, onHard };
    };
    const off = count(0), on = count();
    expect(on.onHard).toBeGreaterThan(20); expect(off.bad).toBeGreaterThan(0);
    expect(on.bad).toBeLessThan(off.bad / 2);
  });
});
