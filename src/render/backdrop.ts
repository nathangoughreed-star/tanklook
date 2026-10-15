// The 3D back wall (TankSetup.backdrop): a relief panel inside the tank against the back glass, like the foam rock, cork
// and moss backgrounds sold for tanks and terrariums. One height field per style over the glass (along the back run,
// up the height), pushed in from the glass by up to `depth` mm, shaded per vertex like the stones (render/items.ts:
// a baked top-front-left light, darker in the hollows, the grit shader for the fine detail). Nathan 2026-10-15.
import * as THREE from 'three';
import { rng } from '../art/paint';
import { backdropDepth, RIM_H } from '../scene/physics';
import { backgroundRuns, shapeOf, type P } from '../scene/shape';
import type { BackdropKind, BackdropSettings, Tank } from '../scene/types';
import { grit, solidMaterial } from './items';

export const BACKDROPS: Record<BackdropKind, string> = {
  none: 'None', rock: 'Rock wall', river: 'River stones', reef: 'Live rock wall', cork: 'Cork bark', moss: 'Moss / plant mat',
};
/** Grit kind per style (see GRIT in render/items.ts). */
const GRIT: Record<BackdropKind, number> = { none: 0, rock: 2, river: 1, reef: 3, cork: 10, moss: 12 };


// ---------- Noise ----------
/** Smooth 2D value noise in -1..1 with its own lattice per seed. */
function noise2(seed: number) {
  const h = (i: number, j: number) => {
    let t = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 1442695041);
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 2147483648 - 1;
  };
  // a turned, shifted lattice per seed, so no feature lines up with the tank's edges
  const ang = (((seed * 0.6180339) % 1) + 1) * 3.1, ca = Math.cos(ang), sa = Math.sin(ang), ox = (seed * 13.37) % 97, oy = (seed * 7.77) % 89;
  return (x0: number, y0: number) => {
    const x = x0 * ca - y0 * sa + ox, y = x0 * sa + y0 * ca + oy;
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(seed: number, oct = 4) {
  const ns = Array.from({ length: oct }, (_, k) => noise2(seed * 31 + k * 977));
  return (x: number, y: number) => { let s = 0, a = 0.5, f = 1; for (const n of ns) { s += a * n(x * f, y * f); a *= 0.5; f *= 2.03; } return s; };
}
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const C = (hex: string) => new THREE.Color(hex);
const pickOf = <T>(a: T[], r: number) => a[Math.min(a.length - 1, Math.floor(r * a.length))];

/** A style's surface: relief h (0 = at the glass .. 1 = full depth) and colour at (u along the glass, y up), both mm. */
type Field = (u: number, y: number, col: THREE.Color) => number;

/**
 * Pieces scattered on a jittered grid (stones, slabs), looked up from the cells round a point: `best` gets each candidate
 * and keeps the highest. cw / ch = cell size (mm).
 */
function scatter<T>(seed: number, cw: number, ch: number, make: (r: () => number, cx: number, cy: number) => T) {
  const cells = new Map<string, T>();
  const at = (i: number, j: number) => {
    const k = i + ',' + j;
    let c = cells.get(k);
    if (!c) { const r = rng(seed * 7919 + i * 92821 + j * 68917); c = make(r, (i + 0.5 + (r() - 0.5) * 0.7) * cw, (j + 0.5 + (r() - 0.5) * 0.7) * ch); cells.set(k, c); }
    return c;
  };
  return (u: number, y: number, f: (c: T) => void) => {
    const i = Math.floor(u / cw), j = Math.floor(y / ch);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) f(at(i + a, j + b));
  };
}

function field(kind: BackdropKind, seed: number): Field {
  const big = fbm(seed, 3), fine = fbm(seed + 5, 4), n3 = fbm(seed + 9, 3);
  switch (kind) {
    case 'rock': { // stacked slabs of layered stone: ledges in rough courses, cracked apart, a little tilted
      const pal = ['#6f7377', '#7d8084', '#62666b', '#76716a', '#5d6064'].map(C);
      const slabs = scatter(seed, 150, 62, (r, cx, cy) => ({ cx, cy, rx: 70 + r() * 130, ry: 24 + r() * 44, tilt: (r() - 0.5) * 0.4, out: 0.4 + r() * 0.6, lean: (r() - 0.5) * 0.5, c: pickOf(pal, r()).clone().multiplyScalar(0.9 + r() * 0.2) }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null, second = 0;
        slabs(u, y, s => {
          const dx = (u - s.cx) / s.rx, dy = (y - s.cy - (u - s.cx) * s.tilt) / s.ry, d = (Math.abs(dx) ** 2.3 + Math.abs(dy) ** 2.3) ** (1 / 2.3);
          // a broken, uneven outline; the face leans a little out or in
          const v = s.out * (1 + s.lean * dy) * smooth(1, 0.7, d + 0.2 * big(u / 55, y / 55) + 0.08 * fine(u / 20, y / 20));
          if (v > h) { second = h; h = v; top = s; } else second = Math.max(second, v);
        });
        const crack = smooth(0.0, 0.12, h - second); // where two slabs meet, a dark joint
        h = 0.12 + 0.88 * h * (0.55 + 0.45 * crack) + 0.05 * fine(u / 12, y / 12);
        col.copy(top ? top.c : pal[0]).multiplyScalar(0.8 + 0.2 * crack + 0.12 * big(u / 90, y / 90));
        return h;
      };
    }
    case 'river': { // rounded river stones packed in a bed, long side level
      const pal = ['#8a8378', '#9a9184', '#6e6a64', '#a89f90', '#7c7466', '#5f5c58', '#8f8a80', '#9c8a70', '#5a5650'].map(C);
      const stones = scatter(seed, 78, 54, (r, cx, cy) => ({ cx, cy, rx: 32 + r() * 42, ry: 22 + r() * 22, a: (r() - 0.5) * 0.6, out: 0.5 + r() * 0.5, c: pickOf(pal, r()).clone().multiplyScalar(0.78 + r() * 0.38) }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null;
        stones(u, y, s => {
          const ca = Math.cos(s.a), sa = Math.sin(s.a), x0 = u - s.cx, y0 = y - s.cy;
          const dx = (x0 * ca + y0 * sa) / s.rx, dy = (-x0 * sa + y0 * ca) / s.ry, q = 1 - dx * dx - dy * dy;
          const v = q > 0 ? s.out * Math.sqrt(q) : 0; // a dome
          if (v > h) { h = v; top = s; }
        });
        col.copy(top ? top.c : C('#3a3632')).multiplyScalar(top ? 0.92 + 0.12 * fine(u / 10, y / 10) : 0.6);
        return 0.08 + 0.92 * h;
      };
    }
    case 'reef': { // stacked live rock: craggy lumps, pitted with round holes, cream under pink and purple coralline, turf on top
      const base = C(pickOf(['#b8a687', '#ad9c80', '#c2b294'], rng(seed)())), cor = [C('#8e4d86'), C('#c4698f'), C('#a65a9c')], algae = C('#6f6b45');
      const lumps = scatter(seed, 140, 110, (r, cx, cy) => ({ cx, cy, rr: 85 + r() * 55, out: 0.55 + r() * 0.45, ph: r() * 6.28 }));
      const pits = scatter(seed + 1, 38, 38, (r, cx, cy) => ({ cx, cy, rr: r() < 0.15 ? 12 + r() * 10 : 4 + r() * 7, k: 0.25 + r() * 0.3 }));
      return (u, y, col) => {
        let h = 0, second = 0;
        lumps(u, y, s => {
          const a = Math.atan2(y - s.cy, u - s.cx), rr = s.rr * (1 + 0.25 * Math.sin(3 * a + s.ph) + 0.15 * Math.sin(5 * a + 2 * s.ph));
          const d = Math.hypot(u - s.cx, y - s.cy) / rr, v = d < 1 ? s.out * Math.sqrt(1 - d * d) ** 0.6 : 0;
          if (v > h) { second = h; h = v; } else second = Math.max(second, v);
        });
        const crev = smooth(0, 0.1, h - second); // dark gaps where lumps meet
        h = h * (0.7 + 0.3 * crev) + 0.12 * fine(u / 30, y / 30);
        let hole = 0;
        pits(u, y, p => { const d = Math.hypot(u - p.cx, y - p.cy) / p.rr; if (d < 1) hole = Math.max(hole, p.k * Math.sqrt(1 - d * d)); });
        h = sat(h - hole);
        const lit = (1 - hole * 2.2) * (0.55 + 0.45 * crev);
        col.copy(base).multiplyScalar(0.3 + 0.7 * sat(lit));
        const a = n3(u / 70, y / 70), cover = sat(lit);
        col.lerp(pickOf(cor, sat(0.5 + n3(u / 300, y / 300))), Math.min(0.7, Math.max(0, (a - 0.08) * 1.7)) * cover);
        col.lerp(algae, Math.min(0.35, Math.max(0, big(u / 40, y / 40) * 1.4 - 0.2)) * cover);
        return 0.06 + 0.94 * h;
      };
    }
    case 'cork': { // cork bark: thick, broken bark plates between deep, branching furrows that run mostly up and down
      const dark = C('#33241a'), mid = C('#6e5038'), light = C('#9c7a55'), furrow = fbm(seed + 21, 4), knob = fbm(seed + 33, 3);
      return (u, y, col) => {
        const f = Math.abs(furrow(u / 55, y / 240) + 0.35 * furrow(u / 22, y / 70)); // ridged noise: furrows where it crosses 0
        const plate = smooth(0.03, 0.22, f), bump = 0.5 + 0.5 * knob(u / 16, y / 22);
        const panel = 0.6 + 0.4 * n3(u / 300, y / 420);
        col.copy(dark).lerp(mid, plate).lerp(light, sat(plate * bump * 1.4 - 0.55) * (0.6 + 0.4 * fine(u / 35, y / 35)));
        return 0.08 + 0.92 * sat(panel * (0.3 + 0.55 * plate + 0.2 * bump * plate));
      };
    }
    case 'moss': { // a planted mat: moss cushions of many sizes running into each other, brown fibre between them
      const greens = ['#3f5e2a', '#4f7030', '#5f8236', '#6b8e3a', '#48682c', '#57722e'].map(C), fibre = C('#4a3a28');
      const cush = scatter(seed, 64, 64, (r, cx, cy) => ({ cx, cy, rr: 22 + r() * 58, out: 0.45 + r() * 0.55, ph: r() * 6.28, c: pickOf(greens, r()) }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null, wsum = 0;
        const c = new THREE.Color(0, 0, 0);
        cush(u, y, s => {
          const a = Math.atan2(y - s.cy, u - s.cx), rr = s.rr * (1 + 0.3 * Math.sin(2 * a + s.ph) + 0.18 * Math.sin(5 * a + s.ph * 2));
          const d = Math.hypot(u - s.cx, y - s.cy) / rr, v = d < 1 ? s.out * (1 - d * d) ** 0.45 : 0;
          if (v > 0) { c.r += s.c.r * v; c.g += s.c.g * v; c.b += s.c.b * v; wsum += v; } // neighbours blend where they meet
          if (v > h) { h = v; top = s; }
        });
        const tuft = 0.1 * fine(u / 4, y / 4) + 0.06 * fine(u / 11, y / 11);
        const green = wsum ? c.multiplyScalar(1 / wsum) : fibre;
        col.copy(fibre).lerp(top ? green : fibre, smooth(0.02, 0.25, h)).multiplyScalar(0.8 + 0.3 * big(u / 70, y / 70) + tuft * 1.5);
        return sat(0.15 + 0.8 * h + tuft);
      };
    }
    default: return () => 0;
  }
}

const LIGHT = new THREE.Vector3(-0.35, 1, 0.55).normalize();
const cache = new Map<string, THREE.BufferGeometry>();

/** The wall's geometry for one tank (cached by tank and settings: the scene rebuilds on every edit). */
export function backdropGeometry(T: Tank, b: BackdropSettings, rim = false): THREE.BufferGeometry | null {
  const depth = backdropDepth(b, T);
  if (!depth) return null;
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.H}|${T.sides}|${T.bowMin}|${b.kind}|${depth}|${b.seed}|${rim}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = field(b.kind, b.seed), col = new THREE.Color(), gap = 1.5;
  // stop just under the lid (Nathan 2026-10-15): rimmed, under the rim band (it hides the cut top from the front);
  // rimless, a few mm under the glass top resting on the panes
  const top = rim ? T.H - RIM_H : T.H - 4;
  const pos: number[] = [], cols: number[] = [], idx: number[] = [], inward: number[] = [];
  for (const run of backgroundRuns(T, ['back'], 145, 0)) {
    // run arc length, then the grid along it
    const acc = [0];
    for (let i = 1; i < run.length; i++) acc.push(acc[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
    const len = acc[acc.length - 1];
    if (len < 10) continue;
    const step = Math.min(8, Math.max(3, Math.max(len, top) / 260)), nu = Math.ceil(len / step) + 1, ny = Math.ceil(top / step) + 1;
    const pointAt = (s: number): [P, P] => { // point on the glass and the inward normal (toward the front)
      let k = 1; while (k < acc.length - 1 && acc[k] < s) k++;
      const a = run[k - 1], c = run[k], t = (s - acc[k - 1]) / Math.max(1e-9, acc[k] - acc[k - 1]);
      const tx = c[0] - a[0], td = c[1] - a[1], tl = Math.hypot(tx, td) || 1;
      let n: P = [-td / tl, tx / tl]; if (n[1] > 0) n = [-n[0], -n[1]];
      return [[a[0] + tx * t, a[1] + td * t], n];
    };
    const base = pos.length / 3;
    const vert = (p: P, n: P, out: number, y: number, c: THREE.Color) => {
      pos.push(p[0] + n[0] * out, y, -(p[1] + n[1] * out)); cols.push(c.r, c.g, c.b); inward.push(n[0], -n[1]);
    };
    for (let i = 0; i < nu; i++) {
      const s = Math.min(len, i * step), [p, n] = pointAt(s);
      for (let j = 0; j < ny; j++) {
        const y = Math.min(top, j * step), h = sat(f(s, y, col));
        col.multiplyScalar(0.5 + 0.5 * h); // hollows in shadow
        vert(p, n, gap + h * (depth - gap), y, col);
      }
    }
    for (let i = 0; i < nu - 1; i++) for (let j = 0; j < ny - 1; j++) {
      const a = base + i * ny + j, b2 = a + ny;
      idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
    }
    // caps: the cut top, and each end where it meets the side glass, closed back to the glass
    const dark = C('#000000');
    const capRow = (list: number[], close: (k: number) => [P, P, number]) => {
      const b0 = pos.length / 3;
      list.forEach((v, k) => { const [p, n, y] = close(k); vert(p, n, 0.5, y, dark.copy(new THREE.Color(cols[v * 3], cols[v * 3 + 1], cols[v * 3 + 2])).multiplyScalar(0.6)); });
      for (let k = 0; k < list.length - 1; k++) idx.push(list[k], list[k + 1], b0 + k, list[k + 1], b0 + k + 1, b0 + k);
    };
    const tops = Array.from({ length: nu }, (_, i) => base + i * ny + ny - 1);
    capRow(tops, k => { const [p, n] = pointAt(Math.min(len, k * step)); return [p, n, top]; });
    for (const i of [0, nu - 1]) {
      const colV = Array.from({ length: ny }, (_, j) => base + i * ny + j), [p, n] = pointAt(Math.min(len, i * step));
      capRow(colV, k => [p, n, Math.min(top, k * step)]);
    }
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // wind the faces toward the room inside the tank (back faces are drawn darker, as a cut-open inside)
  const nrm = g.attributes.normal;
  let dot = 0;
  for (let i = 0; i < nrm.count; i += 7) dot += nrm.getX(i) * inward[i * 2] + nrm.getZ(i) * inward[i * 2 + 1];
  if (dot < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  // bake the light like the stones (render/items.ts bakedShape)
  const out = new Float32Array(cols.length), nn = new THREE.Vector3();
  for (let i = 0; i < nrm.count; i++) {
    nn.fromBufferAttribute(g.attributes.normal, i);
    const k = 0.42 + 0.72 * Math.max(0, nn.dot(LIGHT)) + 0.08 * nn.y;
    out[i * 3] = cols[i * 3] * k; out[i * 3 + 1] = cols[i * 3 + 1] * k; out[i * 3 + 2] = cols[i * 3 + 2] * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  grit(g, GRIT[b.kind], b.seed);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.keep = true;
  cache.set(key, g);
  if (cache.size > 6) { const [k0, g0] = cache.entries().next().value!; cache.delete(k0); g0.dispose(); }
  return g;
}

/** Add the wall to a tank's scene (nothing when off or in a bowl). */
export function addBackdrop(sc: THREE.Scene, b: BackdropSettings | undefined, T: Tank, rim = false) {
  if (!b) return;
  const g = backdropGeometry(T, b, rim);
  if (!g) return;
  const m = new THREE.Mesh(g, solidMaterial(T));
  m.userData.backdrop = true;
  sc.add(m);
}
