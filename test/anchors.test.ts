// Surface anchors (lane T3, 2026-10-16): one query for every surface an animal sits on or clings to, and tree frogs
// perching on the climbing branch and the rock ledge.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { rng } from '../src/art/paint';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { anchorKind, anchors, limbPaths, turnOut, type V3 } from '../src/scene/anchors';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY, itemDims, itemSink } from '../src/scene/items';
import { shuffleFish } from '../src/scene/scatter';
import { groundHeight } from '../src/scene/terrain';
import type { Fish, Item, TankSetup } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';

// the build paints textures on canvases: a do-nothing 2D context is enough for positions
const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
function dry(items: Item[]): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 600, D: 450, H: 450 }; S.water.on = false; S.items = items; S.fish = [];
  return S;
}
function probeFor(S: TankSetup) {
  const ms = S.items.map(it => itemMesh(S, S.tank, it)!).filter(Boolean);
  for (const m of ms) m.updateMatrixWorld(true);
  return solidProbe(S.tank, ms);
}
const near = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('surface anchors: one query per surface kind', () => {
  const S = dry([
    piece(1, 'river', 100, 100), piece(2, 'ledge', 300, 400, { lift: 200 }), piece(3, 'climb', 300, 230, { size: 420, yaw: 20 }),
    piece(4, 'corkflat', 480, 110), piece(5, 'branch', 470, 330, { size: 220 }), piece(6, 'halflog', 120, 330),
  ]);
  const A = anchors(S, S.tank, { down: probeFor(S) }), T = S.tank;

  it('names the kind of every new piece', () => {
    expect(['ledge', 'climb', 'corkflat', 'corktube', 'halflog', 'branch', 'seiryu', 'arch'].map(v => anchorKind(LIBRARY[v] && { kind: LIBRARY[v].kind, variant: v })))
      .toEqual(['ledge', 'branch', 'cork', 'cork', 'wood', 'wood', 'rock', 'rock']);
  });
  it('floor: where nothing stands, and whenever hardscape is not asked for', () => {
    for (const [x, d, hard] of [[550, 420, true], [100, 100, false]] as const) {
      const a = A.rest(x, d, hard);
      expect(a.kind).toBe('floor'); expect(a.p[1]).toBeCloseTo(groundHeight(S, T, x, d), 6); expect(a.n).toEqual([0, 1, 0]);
    }
  });
  it('rock, ledge, cork, wood: the top of the piece under the point, facing up', () => {
    for (const [id, kind] of [[1, 'rock'], [2, 'ledge'], [4, 'cork'], [6, 'wood']] as const) {
      const it = S.items.find(i => i.id === id)!, a = A.rest(it.x, it.depth);
      expect(a.kind, it.variant).toBe(kind); expect(a.item).toBe(id);
      expect(a.n[1], it.variant).toBeGreaterThan(kind === 'rock' || kind === 'ledge' ? 0.5 : 0.25); // bark is furrowed: its faces tip
      const g = groundHeight(S, T, it.x, it.depth), h = itemDims(it)[1];
      expect(a.p[1], it.variant).toBeGreaterThan(g + it.lift - itemSink(it) + h * 0.6);
      expect(a.p[1], it.variant).toBeLessThan(g + it.lift + h * 1.15);
    }
    // the ledge's top is level: a frog's width either side of its middle is within a few mm
    const l = S.items[1], ys = [-40, 0, 40].map(dx => A.rest(l.x + dx, l.depth - 20).p[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(6);
  });
  it('branch: the limb under the point, its axis, direction and radius', () => {
    const br = S.items[2];
    let hits = 0;
    for (let k = 1; k < 10; k++) {
      // along the trunk in plan view: its foot is at x - 0.25 s cos(lean), it rises toward +x (turned by the yaw)
      const t = k / 10, x = br.x + (t - 0.3) * 0.5 * br.size * Math.cos(20 * Math.PI / 180), d = br.depth + (t - 0.3) * 0.5 * br.size * Math.sin(20 * Math.PI / 180);
      const a = A.rest(x, d);
      if (a.kind !== 'branch') continue;
      hits++;
      const L = a.limb!;
      expect(Math.hypot(...L.along)).toBeCloseTo(1, 6);
      expect(L.r).toBeGreaterThan(1); expect(L.r).toBeLessThan(0.03 * br.size);
      // the point lies on the limb's surface: its distance from the axis is the radius
      expect(Math.abs(near(a.p, L.c) - L.r)).toBeLessThan(0.5);
      // limbPaths: the axis point lies on one of the piece's limb paths (a segment of its control polyline)
      const paths = limbPaths(br, a.toTank!), onPath = Math.min(...paths.flatMap(q => q.pts.slice(1).map((b, i) => {
        const a0 = q.pts[i], ab: V3 = [b[0] - a0[0], b[1] - a0[1], b[2] - a0[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
        const t = Math.max(0, Math.min(1, ((L.c[0] - a0[0]) * ab[0] + (L.c[1] - a0[1]) * ab[1] + (L.c[2] - a0[2]) * ab[2]) / L2));
        return near(L.c, [a0[0] + ab[0] * t, a0[1] + ab[1] * t, a0[2] + ab[2] * t]);
      })));
      expect(onPath).toBeLessThan(1e-6);
    }
    expect(hits).toBeGreaterThan(3);
  });
  it('turnOut turns a vector of a piece\'s own frame the way its mesh is turned', () => {
    const r = rng(9);
    for (let k = 0; k < 20; k++) {
      const it = { yaw: r() * 360 - 180, pitch: r() * 180 - 90, tilt: r() * 360 - 180 }, v: V3 = [r() - 0.5, r() - 0.5, r() - 0.5];
      const w = new THREE.Vector3(...v).applyEuler(new THREE.Euler(it.pitch * Math.PI / 180, it.yaw * Math.PI / 180, it.tilt * Math.PI / 180, 'YXZ'));
      const t = turnOut(it, v);
      expect(near(t, [w.x, w.y, -w.z])).toBeLessThan(1e-9);
    }
  });
  it('glass: the nearest pane, normal into the tank, heading laid in the pane', () => {
    const a = A.glass(300, 2, 200, 90, 50);
    expect(a.kind).toBe('glass'); expect(a.p[2]).toBeCloseTo(0, 6); expect(a.p[1]).toBe(200);
    expect(a.n[0]).toBeCloseTo(0, 6); expect(a.n[2]).toBeCloseTo(1, 6); // the front pane: into the tank = deeper
    expect(a.head[1]).toBeCloseTo(1, 6); // yaw 90 = straight up the pane
    const s = A.glass(598, 200, 100, 0, 50);
    expect(s.p[0]).toBeCloseTo(600, 6); expect(s.n[0]).toBeCloseTo(-1, 6); expect(s.head[1]).toBeCloseTo(0, 6);
  });
  it('wall: the probe\'s point and normal where the 3D wall covers the pane, the heading laid onto it', () => {
    const W = anchors(S, T, { wall: (at, _out, _head, w) => (expect(w).toBe(60), [[at[0], at[1], at[2] - 40], [0.6, 0, -0.8]]) });
    const a = W.glass(300, 448, 200, 30, 60);
    expect(a.kind).toBe('wall'); expect(a.p).toEqual([300, 200, 410]); expect(a.n).toEqual([0.6, 0, -0.8]);
    expect(Math.abs(a.head[0] * 0.6 - a.head[2] * 0.8)).toBeLessThan(1e-9); // in the wall's plane
  });
  it('nearest: the glass beside a point, or what lies under it', () => {
    expect(A.nearest(300, 3, 200).kind).toBe('glass');
    const r = S.items[0];
    expect(A.nearest(r.x, r.depth, A.rest(r.x, r.depth).p[1] + 5).kind).toBe('rock');
  });
});

describe('tree frogs perch on the climbing branch and the ledge', () => {
  const scene = () => {
    const S = dry([piece(1, 'climb', 300, 230, { size: 440, yaw: 15 }), piece(2, 'ledge', 300, 410, { size: 220, lift: 220 }), piece(3, 'corkflat', 150, 120)]);
    S.fish = Array.from({ length: 8 }, (_, i): Fish => ({ id: i + 1, species: 'treefrog', x: 100, y: 50, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor' }));
    return S;
  };
  const perched = (S: TankSetup) => {
    const b = buildTank({ ...S, units: 'cm' }, S.tank, null);
    return new Map(b.fishMeshes.filter(m => m.userData.perch).map(m => [m.userData.id as number, { kind: m.userData.perch as string, p: m.position.toArray() as V3, q: m.quaternion.toArray() }]));
  };
  it('Shuffle puts frogs on them; they stay put through save and load', () => {
    let branch = 0, ledge = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const S = scene(); shuffleFish(S, rng(seed));
      const before = perched(S);
      for (const v of before.values()) v.kind === 'branch' ? branch++ : ledge++;
      // save and load: the scene through JSON and the validator
      const doc = structuredClone(emptyScene()); doc.tanks = [S];
      const { scene: back, warnings } = parseScene(JSON.parse(JSON.stringify(doc)));
      expect(warnings).toEqual([]);
      const after = perched(back.tanks[0]);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [id, v] of before) {
        const w = after.get(id)!;
        expect(w.kind).toBe(v.kind);
        expect(near(w.p, v.p), `frog ${id}`).toBeLessThan(1);
        expect(Math.abs(w.q.reduce((a, x, i) => a + x * v.q[i], 0))).toBeGreaterThan(0.9999);
      }
    }
    expect(branch).toBeGreaterThan(2);
    expect(ledge).toBeGreaterThan(0);
  });
  it('a frog on the branch sits on top of the limb, along it, its belly on the bark', () => {
    const S = scene(), A = anchors(S, S.tank, { down: probeFor(S) });
    // a spot on the limb straight under a point on its axis
    const br = S.items[0], a = (() => { for (let k = 2; k < 9; k++) { const t = k / 10, x = br.x + (t - 0.3) * 0.5 * br.size * Math.cos(15 * Math.PI / 180), d = br.depth + (t - 0.3) * 0.5 * br.size * Math.sin(15 * Math.PI / 180), q = A.rest(x, d); if (q.kind === 'branch') return { x, d, q }; } return null; })()!;
    expect(a).toBeTruthy();
    S.fish = [{ id: 1, species: 'treefrog', x: a.x, y: 0, depth: a.d, yaw: 15, pitch: 0, roll: 0, bend: 0, surface: 'hardscape' }];
    const b = buildTank({ ...S, units: 'cm' }, S.tank, null), m = b.fishMeshes[0];
    expect(m.userData.perch).toBe('branch');
    const L = a.q.limb!, c = new THREE.Vector3(L.c[0], L.c[1], -L.c[2]), head = new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion);
    const along = new THREE.Vector3(L.along[0], L.along[1], -L.along[2]);
    expect(Math.abs(head.dot(along))).toBeGreaterThan(0.999); // along the limb
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    expect(up.y).toBeGreaterThan(0); // back up, belly down onto the limb
    // the body's centre is over the axis by the radius plus the frog's belly height
    const off = m.position.clone().sub(c);
    expect(off.clone().addScaledVector(up, -off.dot(up)).length()).toBeLessThan(1e-6); // straight over the axis
    expect(off.dot(up)).toBeGreaterThan(L.r);
    expect(off.dot(up)).toBeLessThan(L.r + 40);
  });
});
