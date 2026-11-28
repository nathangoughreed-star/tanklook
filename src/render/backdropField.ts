// The 3D backdrop's height and colour fields, and the texture bake from them (BD1, R199). Its own module so the bake can run
// in a worker (render/backdropWorker.ts) as well as on the page: no DOM, no WebGL here. See render/backdrop.ts.
import * as THREE from 'three';
import { rng } from '../art/paint';
import type { BackdropKind } from '../scene/types';

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
export const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
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
  const cells = new Map<number, T>();
  const at = (i: number, j: number) => {
    const k = (i + 32768) * 65536 + (j + 32768);
    let c = cells.get(k);
    if (!c) { const r = rng(seed * 7919 + i * 92821 + j * 68917); c = make(r, (i + 0.5 + (r() - 0.5) * 0.7) * cw, (j + 0.5 + (r() - 0.5) * 0.7) * ch); cells.set(k, c); }
    return c;
  };
  return (u: number, y: number, f: (c: T) => void) => {
    const i = Math.floor(u / cw), j = Math.floor(y / ch);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) f(at(i + a, j + b));
  };
}

/**
 * Voronoi pieces (rock blocks, bark plates): one jittered site per cell (cw x ch mm, every other row shifted half a cell),
 * the nearest site `a`, the next `b`, and `e` = the distance (mm) to the border between them, so 0 along every joint.
 */
interface Site { cx: number; cy: number }
function voronoi<T extends Site>(seed: number, cw: number, ch: number, jit: number, make: (r: () => number, cx: number, cy: number) => T) {
  const cells = new Map<number, T>();
  const at = (i: number, j: number) => {
    const k = (i + 32768) * 65536 + (j + 32768);
    let c = cells.get(k);
    if (!c) { const r = rng(seed * 7919 + i * 92821 + j * 68917); c = make(r, (i + 0.5 + (j & 1) * 0.5 + (r() - 0.5) * jit) * cw, (j + 0.5 + (r() - 0.5) * jit) * ch); cells.set(k, c); }
    return c;
  };
  const out = { a: null as unknown as T, b: null as unknown as T, e: 0 };
  return (u: number, y: number) => {
    const j0 = Math.floor(y / ch);
    let d1 = Infinity, d2 = Infinity, a: T | null = null, b: T | null = null;
    for (let dj = -1; dj <= 1; dj++) {
      const j = j0 + dj, i0 = Math.floor(u / cw - (j & 1) * 0.5);
      for (let di = -1; di <= 1; di++) {
        const c = at(i0 + di, j), d = (u - c.cx) ** 2 + (y - c.cy) ** 2;
        if (d < d1) { d2 = d1; b = a; d1 = d; a = c; } else if (d < d2) { d2 = d; b = c; }
      }
    }
    out.a = a!; out.b = b!;
    out.e = (d2 - d1) / (2 * Math.max(1e-6, Math.hypot(b!.cx - a!.cx, b!.cy - a!.cy))); // distance to the bisector
    return out;
  };
}

export function field(kind: BackdropKind, seed: number): Field {
  const big = fbm(seed, 3), fine = fbm(seed + 5, 4), n3 = fbm(seed + 9, 3);
  switch (kind) {
    case 'rock': { // (the original look, kept and drawn high-res: Nathan 2026-11-27 "Yes, same as cork") stacked slabs of layered stone: ledges in rough courses, cracked apart, a little tilted
      const pal = ['#6f7377', '#7d8084', '#62666b', '#76716a', '#5d6064'].map(C);
      const slabs = scatter(seed, 150, 62, (r, cx, cy) => ({ cx, cy, rx: 70 + r() * 130, ry: 24 + r() * 44, tilt: (r() - 0.5) * 0.4, out: 0.4 + r() * 0.6, lean: (r() - 0.5) * 0.5, c: pickOf(pal, r()).clone().multiplyScalar(0.9 + r() * 0.2) }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null, second = 0;
        slabs(u, y, s => {
          const dx = (u - s.cx) / s.rx, dy = (y - s.cy - (u - s.cx) * s.tilt) / s.ry, d = (Math.abs(dx) ** 2.3 + Math.abs(dy) ** 2.3) ** (1 / 2.3);
          // a broken, uneven outline; the face leans a little out or in
          const v = s.out * (1 + s.lean * dy) * smooth(1, 0.82, d + 0.2 * big(u / 55, y / 55) + 0.08 * fine(u / 20, y / 20) + 0.03 * fine(u / 6, y / 6));
          if (v > h) { second = h; h = v; top = s; } else second = Math.max(second, v);
        });
        const crack = smooth(0.0, 0.12, h - second); // where two slabs meet, a dark joint
        const grain = 0.03 * fine(u / 3, y / 3) - 0.04 * Math.max(0, fine(u / 2.4 + 7, y / 2.4) - 0.3); // stone grain and pits
        h = 0.12 + 0.88 * h * (0.45 + 0.55 * smooth(0.0, 0.08, h - second)) + 0.05 * fine(u / 12, y / 12) + grain;
        col.copy(top ? top.c : pal[0]).multiplyScalar((0.8 + 0.2 * crack + 0.12 * big(u / 90, y / 90)) * (0.92 + 2.2 * grain) * (0.6 + 0.4 * crack));
        return h;
      };
    }
    case 'rockblock': { // BD1's faceted foam rock blocks (kept as an option, Nathan 2026-11-27; Aquadecor / Back to Nature style): angular blocks in rough courses, flat facets broken at sharp
      // ridges, near-black joints between blocks, hairline cracks, pale dust on the faces that look up (refs: backdrop-3d-refs.md)
      const pal = ['#5f6267', '#6b6d71', '#55585d', '#68635c', '#5c5f63', '#726d66'].map(C), dust = C('#a9a69e'), joint = C('#0e0f10');
      const blocks = voronoi(seed, 205, 112, 0.75, (r, cx, cy) => {
        const out = 0.3 + 0.7 * r(), n = 3 + Math.floor(r() * 3), a0 = r() * 6.28;
        // each facet a plane through the block: h = top - g . (p - c); the block is the lowest of them (a faceted cap)
        const fac = Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * 6.28 + (r() - 0.5) * 0.9, m = 0.007 + r() * 0.016; return { gx: Math.cos(a) * m, gy: Math.sin(a) * m * 1.4, t: out + 0.1 + r() * 0.35 }; });
        fac.push({ gx: (r() - 0.5) * 0.003, gy: (r() - 0.25) * 0.004, t: out }); // the face itself, a little tilted, most often up
        return { cx, cy, fac, c: pickOf(pal, r()).clone().multiplyScalar(0.88 + r() * 0.2) };
      });
      const cracks = voronoi(seed + 17, 46, 38, 0.9, (_r, cx, cy) => ({ cx, cy }));
      return (u, y, col) => {
        // a warped lookup: block outlines wander instead of following straight bisectors
        const wu = u + 28 * big(u / 95, y / 95) + 6 * fine(u / 18, y / 18), wy = y + 18 * n3(u / 80, y / 80) + 4 * fine(u / 15 + 9, y / 15);
        const v = blocks(wu, wy), bk = v.a, dx = wu - bk.cx, dy = wy - bk.cy;
        let h = Infinity, gy = 0;
        for (const f of bk.fac) { const t = f.t - f.gx * dx - f.gy * dy; if (t < h) { h = t; gy = f.gy; } }
        h = sat(h);
        const j = smooth(0.5, 9, v.e);                                   // the joint: a sharp drop to the back
        const cr = cracks(u + 9 * fine(u / 12, y / 12), y), crack = smooth(0.9, 0, cr.e) * smooth(0.15, 0.55, n3(u / 140 + 4, y / 140)); // hairlines, in patches
        const grain = 0.035 * fine(u / 3.2, y / 3.2) + 0.02 * fine(u / 9, y / 9);
        h = (0.1 + 0.9 * h) * (0.08 + 0.92 * j) - 0.025 * crack + grain * j;
        col.copy(bk.c).multiplyScalar(0.86 + 0.16 * big(u / 70, y / 70) + 1.4 * grain).lerp(dust, sat((gy - 0.003) * 90) * 0.35 * j);
        // under a ledge (a facet turned down) the light from above never reaches: darker, like the photos' undersides
        col.multiplyScalar(1 - 0.4 * sat(-gy * 70)).lerp(joint, (1 - smooth(0, 20, v.e)) * 0.9).multiplyScalar(1 - 0.5 * crack);
        return sat(h);
      };
    }
    case 'river': { // rounded river stones packed in a bed, long side level
      const pal = ['#736c62', '#81796d', '#5b5853', '#8c8478', '#675f54', '#4c4945', '#77726a', '#83735d', '#494642', '#6a7076'].map(C);
      const stones = scatter(seed, 78, 54, (r, cx, cy) => ({ cx, cy, rx: 32 + r() * 42, ry: 22 + r() * 22, a: (r() - 0.5) * 0.6, out: 0.5 + r() * 0.5, c: pickOf(pal, r()).clone().multiplyScalar(0.78 + r() * 0.38) }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null;
        stones(u, y, s => {
          const ca = Math.cos(s.a), sa = Math.sin(s.a), x0 = u - s.cx, y0 = y - s.cy;
          const dx = (x0 * ca + y0 * sa) / s.rx, dy = (-x0 * sa + y0 * ca) / s.ry, q = 1 - dx * dx - dy * dy;
          const v = q > 0 ? s.out * Math.sqrt(q) : 0; // a dome
          if (v > h) { h = v; top = s; }
        });
        col.copy(top ? top.c : C('#1e1c1a')).multiplyScalar(top ? 0.88 + 0.12 * fine(u / 10, y / 10) + 0.08 * fine(u / 1.8, y / 1.8) : 0.5).multiplyScalar(0.55 + 0.45 * smooth(0, 0.35, h));
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
        const pu = u + 5 * fine(u / 7, y / 7), py = y + 5 * fine(u / 7 + 5, y / 7); // ragged, not drilled
        pits(pu, py, p => { const d = Math.hypot(pu - p.cx, py - p.cy) / (p.rr * (0.8 + 0.4 * n3(pu / 9, py / 9))); if (d < 1) hole = Math.max(hole, p.k * Math.sqrt(1 - d * d)); });
        h = sat(h - hole);
        const lit = (1 - hole * 2.2) * (0.55 + 0.45 * crev);
        col.copy(base).multiplyScalar(0.3 + 0.7 * sat(lit));
        const a = n3(u / 70, y / 70), cover = sat(lit);
        col.lerp(pickOf(cor, sat(0.5 + n3(u / 300, y / 300))), Math.min(0.7, Math.max(0, (a - 0.08) * 1.7)) * cover);
        col.lerp(algae, Math.min(0.35, Math.max(0, big(u / 40, y / 40) * 1.4 - 0.2)) * cover);
        return 0.06 + 0.94 * h;
      };
    }
    case 'cork': { // cork bark (the original look, kept by Nathan 2026-11-27: "I liked the old one, just wanted a higher res version of it"): thick, broken bark plates between deep, branching furrows that run mostly up and down
      const dark = C('#33241a'), mid = C('#6e5038'), light = C('#9c7a55'), furrow = fbm(seed + 21, 4), knob = fbm(seed + 33, 3);
      return (u, y, col) => {
        // the same furrows and colours as before; BD1 adds the detail a 1 mm texel can carry: a third, finer furrow octave
        // (small branching cracks), crisper plate edges, bark grain along the trunk and pitting on the plates
        const f = Math.abs(furrow(u / 55, y / 240) + 0.35 * furrow(u / 22, y / 70) + 0.12 * furrow(u / 7, y / 22));
        const plate = smooth(0.03, 0.13, f), bump = 0.5 + 0.5 * knob(u / 16, y / 22);
        const grain = 1 - Math.abs(2 * (0.5 + 0.5 * fine(u / 4, y / 36)) - 1), pit = 0.5 + 0.5 * fine(u / 2.2, y / 2.6);
        const panel = 0.6 + 0.4 * n3(u / 300, y / 420);
        col.copy(dark).lerp(mid, plate).lerp(light, sat(plate * bump * 1.4 - 0.55) * (0.6 + 0.4 * fine(u / 35, y / 35)));
        col.multiplyScalar(0.86 + 0.16 * grain * plate + 0.1 * (pit - 0.5));
        return 0.08 + 0.92 * sat(panel * (0.3 + 0.55 * plate + 0.2 * bump * plate + 0.05 * grain * plate + 0.03 * pit * plate));
      };
    }
    case 'corkplate': { // BD1's virgin cork plates (Nathan 2026-11-27: "keep that as an option"; refs: backdrop-3d-refs.md): thick, broken plates, grey-tan on top, between deep dark-brown
      // fissures that meander mostly up and down and branch; plate on plate in places; rough, pitted tops with short cross cracks
      const ash = C('#7a7369'), tan = C('#8b6c4c'), brown = C('#563e2c'), fiss = C('#170f0a'), lichen = C('#8e8f86');
      // tall plates (the bark splits along the trunk), each bulging across its width, a few riding over their neighbours
      const plates = voronoi(seed + 3, 32, 165, 0.9, (r, cx, cy) => ({ cx, cy, out: 0.45 + 0.55 * r(), bulge: 0.25 + 0.35 * r(), gy: (r() - 0.5) * 0.003, grey: r(), tone: 0.82 + 0.3 * r() }));
      const flakes = voronoi(seed + 5, 16, 30, 0.9, (r, cx, cy) => ({ cx, cy, up: r() < 0.35 ? 0.08 + r() * 0.1 : 0 }));
      return (u, y, col) => {
        const wu = u + 14 * n3(u / 45, y / 160) + 6 * fine(u / 12, y / 40), wy = y + 30 * big(u / 70, y / 200);
        const v = plates(wu, wy), pl = v.a, dx = (wu - pl.cx) / 22, dy = wy - pl.cy;
        const f = flakes(wu * 1.1 + 7, wy), lip = f.a.up * smooth(0.3, 2.5, f.e);                         // a flake raised on the plate
        // the plate's skin: ridges along the trunk, knobs, fine pitting, and short lenticel cracks across
        const ridge = 1 - Math.abs(2 * (0.5 + 0.5 * fine(u / 5.5, y / 48)) - 1), knob = fine(u / 9, y / 13);
        const rough = 0.14 * ridge + 0.1 * knob + 0.05 * fine(u / 2.2, y / 2.8);
        const xcrack = smooth(0.84, 1, Math.abs(Math.sin(y / 4.5 + 2.5 * fine(u / 18, y / 18)))) * smooth(0.25, 0.65, fine(u / 8 + 3, y / 26));
        const wide = 3 + 11 * sat(0.5 + 0.9 * big(u / 50, y / 120));                                    // fissures from hairline to a finger wide
        const deep = smooth(0.3, wide, v.e);
        let h = sat(pl.out - pl.bulge * dx * dx + pl.gy * dy + lip + rough - 0.08 * xcrack);
        h = 0.04 + 0.96 * h * (0.06 + 0.94 * deep);
        const top = ash.clone().lerp(tan, sat(0.2 + pl.grey * 0.9 - 0.5 * sat(big(u / 160, y / 260) + 0.3))).multiplyScalar(pl.tone);
        top.lerp(lichen, 0.5 * smooth(0.25, 0.6, n3(u / 40 + 11, y / 55)) * ridge);                      // weathered grey on the ridges
        col.copy(brown).lerp(top, smooth(1, wide + 4, v.e) * (0.7 + 0.3 * ridge) + 0.3 * lip * 4).multiplyScalar(0.8 + 0.9 * rough - 0.4 * xcrack);
        col.lerp(fiss, 1 - smooth(0.2, wide * 0.8, v.e));
        return sat(h);
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
    case 'jungle': { // broad overlapping leaves (philodendron / monstera style) with a midrib groove and side veins, dark soil between
      const greens = ['#2f5a28', '#3b6b2e', '#2a4f26', '#477a35', '#35622c', '#52863a'].map(C), shade = C('#17240f');
      const leaves = scatter(seed, 150, 150, (r, cx, cy) => ({ cx, cy, rx: 90 + r() * 110, ry: 36 + r() * 36, ang: r() * 6.28, out: 0.5 + r() * 0.5, c: pickOf(greens, r()), vein: 7 + r() * 5 }));
      return (u, y, col) => {
        let h = 0, top = null as { c: THREE.Color } | null, rib = 0, vein = 0, rim = 0;
        leaves(u, y, s => {
          const ca = Math.cos(s.ang), sa = Math.sin(s.ang), dx = u - s.cx, dy = y - s.cy, a = (dx * ca + dy * sa) / s.rx, b = (-dx * sa + dy * ca) / s.ry;
          if (a < -1 || a > 1) return;
          const w = (1 - a * a) ** 0.75 * (a < 0 ? 1 : 1 - 0.25 * a), d = Math.abs(b) / Math.max(w, 0.02);   // pointed tip, rounded base
          if (d >= 1) return;
          const edge = smooth(1, 0.82, d), v = s.out * (1 - 0.4 * d * d) * edge; // tapers to nothing at the outline, so the grid shows no steps
          if (v > h) { h = v; top = s; rim = 1 - edge; rib = smooth(0.12, 0, Math.abs(b) * s.ry / 9) * edge; vein = smooth(0.78, 1, Math.abs(Math.sin((a * s.rx / s.vein) * 1.3 + Math.abs(b) * 2.2))) * (1 - rib) * edge; }
        });
        const spot = 0.05 * fine(u / 9, y / 9);
        if (!top) { col.copy(shade).multiplyScalar(0.8 + 0.4 * big(u / 70, y / 70)); return sat(0.06 + 0.1 * (0.5 + big(u / 90, y / 90))); }
        col.copy(top.c).lerp(shade, Math.min(1, 0.22 * (1 - h) + 0.7 * rim)).multiplyScalar(0.9 + 0.25 * big(u / 60, y / 60) + spot).lerp(C('#a6c86a'), 0.2 * rib)  /* BD1: crisp at 1 mm, the old 0.38 read as stray lines */.lerp(shade, 0.28 * vein);
        return sat(0.2 + 0.7 * h - 0.07 * rib - 0.04 * vein + spot);
      };
    }
    default: return () => 0;
  }
}

/** How much of the old "hollows in shadow" darkening a style keeps (rock and cork draw their own joints into the colour). */
const HOLLOW: Record<BackdropKind, number> = { none: 0.5, rock: 0.5, rockblock: 0.25, river: 0.75, reef: 0.7, cork: 0.5, corkplate: 0.25, moss: 0.45, jungle: 0.5 };
/** Grit kind per style (see GRIT in render/items.ts): the original styles keep their fine grain and hairline cracks over the textures; the BD1 options draw their own. */
export const GRIT: Record<BackdropKind, number> = { none: 0, rock: 2, rockblock: 0, river: 1, reef: 3, cork: 10, corkplate: 0, moss: 12, jungle: 12 };
/** Normal strength per style: the relief is shallow (an inch or two), so the light reads it a little steeper than it is. */
const NSTR: Record<BackdropKind, number> = { none: 1, rock: 1.4, rockblock: 1.6, river: 1.3, reef: 1.4, cork: 1.3, corkplate: 1.7, moss: 1.3, jungle: 1.2 };

/** One run of wall as the textures see it: arc length (mm) and its rows in the atlas. */
export interface RunMap { len: number; row0: number; w: number; h: number }
export interface TexLayout { mm: number; W: number; H: number; runs: RunMap[] }
/** Texel size (mm): about 1 mm, coarser on big walls (at most ~1.2 M texels: a 6 ft tank wrapped on three sides gets ~1.4 mm). */
export const texelMM = (area: number) => Math.min(3, Math.max(0.9, Math.sqrt(area / 1.2e6)));
const toSRGB = (c: number) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.min(1, c), 1 / 2.4) - 0.055));
/** Where each run sits in the atlas at texel size `mm`. */
export function texLayout(lens: number[], top: number, mm: number): TexLayout {
  const runs: RunMap[] = []; let H = 0, W = 0;
  for (const len of lens) { const w = Math.ceil(len / mm) + 2, h = Math.ceil(top / mm) + 2; runs.push({ len, row0: H, w, h }); H += h; W = Math.max(W, w); }
  return { mm, W, H, runs };
}
export interface BakeJob { kind: BackdropKind; seed: number; lens: number[]; top: number; depth: number; gap: number; mm: number; r0?: number; r1?: number }
export type BakeOut = TexLayout & { alb: Uint8Array<ArrayBuffer>; nrm: Uint8Array<ArrayBuffer>; r0: number; r1: number };
/**
 * The colour (sRGB bytes) and normal (wall frame) textures' pixels for atlas rows r0..r1 (all by default): a band, so several
 * workers can share one bake. The heights are worked one row past each end of the band for the normals there.
 */
export function bakeData(job: BakeJob): BakeOut {
  const { kind, seed, top, depth, gap } = job, lay = texLayout(job.lens, top, job.mm), { mm, W, H } = lay;
  const r0 = job.r0 ?? 0, r1 = Math.min(H, job.r1 ?? H);
  const f = field(kind, seed), col = new THREE.Color();
  const alb = new Uint8Array(W * (r1 - r0) * 4), nrm = new Uint8Array(W * (r1 - r0) * 4), hk = HOLLOW[kind], ns = NSTR[kind];
  const cap = (x: number) => Math.max(-2.5, Math.min(2.5, x)); // a one-texel cliff (a leaf over a leaf) would light as a hard line
  for (const r of lay.runs) {
    const j0 = Math.max(0, r0 - r.row0), j1 = Math.min(r.h, r1 - r.row0);
    if (j1 <= j0) continue;
    const h0 = Math.max(0, j0 - 1), h1 = Math.min(r.h, j1 + 1), ht = new Float32Array(r.w * (h1 - h0));
    for (let j = h0; j < h1; j++) for (let i = 0; i < r.w; i++) {
      const u = Math.min(r.len, i * mm), y = Math.min(top, j * mm), hh = sat(f(u, y, col));
      ht[(j - h0) * r.w + i] = gap + hh * (depth - gap);
      if (j < j0 || j >= j1) continue;
      col.multiplyScalar(1 - hk + hk * hh);
      const o = ((r.row0 + j - r0) * W + i) * 4;
      alb[o] = toSRGB(col.r); alb[o + 1] = toSRGB(col.g); alb[o + 2] = toSRGB(col.b); alb[o + 3] = 255;
    }
    const at = (a: number, b: number) => ht[(Math.min(h1 - 1, Math.max(h0, b)) - h0) * r.w + Math.min(r.w - 1, Math.max(0, a))];
    for (let j = j0; j < j1; j++) for (let i = 0; i < r.w; i++) {
      const du = cap(ns * (at(i + 1, j) - at(i - 1, j)) / (2 * mm)), dv = cap(ns * (at(i, j + 1) - at(i, j - 1)) / (2 * mm)), l = Math.hypot(du, dv, 1);
      const o = ((r.row0 + j - r0) * W + i) * 4;
      nrm[o] = Math.round(127.5 * (1 - du / l)); nrm[o + 1] = Math.round(127.5 * (1 - dv / l)); nrm[o + 2] = Math.round(127.5 * (1 + 1 / l)); nrm[o + 3] = 255;
    }
  }
  return { ...lay, alb, nrm, r0, r1 };
}
