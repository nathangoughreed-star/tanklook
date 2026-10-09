// Builds a three.js scene for one tank from scene data. Rebuilt on every content change (cheap at this scale);
// textures and card materials are cached across rebuilds.
import * as THREE from 'three';
import { SUBSTRATES } from '../art/placeholder';
import { snailAspect } from '../art/snails';
import { fishTL, getSpecies, needsWater, type Species } from '../data/species';
import { restsOnGround } from '../scene/water';
import { D2R, IN, clamp, floorY, glassThickness, RIM_DROP, RIM_H, tankUnderside, waterY } from '../scene/physics';
import { alongRun, chord, clipToFootprint, facingRuns, footprint, halfWidth, inside, nearestGlass, offsetRing, offsetWalls, runLength, shapeOf, subRun, type P } from '../scene/shape';
import { TABLE_TOP, tableCentre, tableOn, tableRing, wallPlane } from '../scene/table';
import { groundHeight, terrainPoint } from '../scene/terrain';
import type { Background, Fish, Tank, TankSetup, Units } from '../scene/types';
import { addFixture, applyLighting } from './lighting';
import { layoutGroup } from './layouts';
import { cardMaterial, fishTexture, gradientTexture, personTexture, snailTexture, substrateTexture } from './textures';

/** Back-wall options; color null = no background (back glass only); light = use dark grid lines. */
export const BACKGROUNDS: Record<Background, { label: string; color: number | null; gradient?: boolean; light?: boolean }> = {
  black: { label: 'Black', color: 0x0b0c0e },
  blue: { label: 'Deep blue', color: 0x15395a },
  gradient: { label: 'Blue gradient', color: 0xffffff, gradient: true },
  grey: { label: 'Charcoal grey', color: 0x3a3e44 },
  frosted: { label: 'Frosted white', color: 0xe6ecee, light: true },
  none: { label: 'None (clear glass)', color: null, light: true },
};

const basic = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
function lines(pts: number[], color: number, opacity: number) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

/** Peninsula: the end of the tank against the room wall ('left' / 'right'), else null. */
const penEnd = (S: TankSetup) => (S.wall.show && S.wall.side !== 'back' ? S.wall.side : null);

/** World position of footprint point p at height y (depth runs toward -z). */
const at = (p: P, y: number): [number, number, number] => [p[0], y, -p[1]];

/** Triangles from quads / fans, with material groups, as one BufferGeometry. */
class Tris {
  pos: number[] = []; uv: number[] = []; groups: number[] = [];
  tri(a: number[], b: number[], c: number[], g = 0, uv?: number[][]) {
    this.pos.push(...a, ...b, ...c); this.groups.push(g);
    if (uv) this.uv.push(...uv[0], ...uv[1], ...uv[2]);
  }
  quad(a: number[], b: number[], c: number[], d: number[], g = 0, uv?: number[][]) {
    this.tri(a, b, c, g, uv && [uv[0], uv[1], uv[2]]); this.tri(a, c, d, g, uv && [uv[0], uv[2], uv[3]]);
  }
  geometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    if (this.uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    let start = 0;
    for (let i = 1; i <= this.groups.length; i++) if (i === this.groups.length || this.groups[i] !== this.groups[start]) { geo.addGroup(start * 3, (i - start) * 3, this.groups[start]); start = i; }
    geo.computeVertexNormals();
    return geo;
  }
}

/**
 * A wall of thickness between polylines `inner` and `outer` (same length), from y0 to y1: group 0 = the two big faces,
 * group 1 = the top, bottom and end strips (the glass edge). Closed = a full ring with no ends.
 */
function wallGeometry(inner: P[], outer: P[], y0: number, y1: number, closed = false) {
  const t = new Tris(), n = inner.length;
  for (let i = 0; i < n - 1; i++) {
    const a = inner[i], b = inner[i + 1], c = outer[i], d = outer[i + 1];
    // wound so every face points out of the solid (front faces only are drawn)
    t.quad(at(a, y0), at(a, y1), at(b, y1), at(b, y0), 0); t.quad(at(c, y0), at(d, y0), at(d, y1), at(c, y1), 0);
    t.quad(at(a, y1), at(c, y1), at(d, y1), at(b, y1), 1); t.quad(at(a, y0), at(b, y0), at(d, y0), at(c, y0), 1);
  }
  if (!closed) { t.quad(at(inner[0], y0), at(outer[0], y0), at(outer[0], y1), at(inner[0], y1), 1); t.quad(at(inner[n - 1], y0), at(inner[n - 1], y1), at(outer[n - 1], y1), at(outer[n - 1], y0), 1); }
  return t.geometry();
}

/** A solid prism over a convex ring from y0 to y1: group 0 = top and bottom, group 1 = the sides. */
function prismGeometry(ring: P[], y0: number, y1: number) {
  const t = new Tris(), n = ring.length;
  for (let i = 1; i < n - 1; i++) { t.tri(at(ring[0], y1), at(ring[i], y1), at(ring[i + 1], y1), 0); t.tri(at(ring[0], y0), at(ring[i + 1], y0), at(ring[i], y0), 0); }
  for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; t.quad(at(a, y0), at(b, y0), at(b, y1), at(a, y1), 1); }
  return t.geometry();
}

/** A flat convex polygon at height y (floor backing, water surface). */
function flatGeometry(ring: P[], y: number) {
  const t = new Tris();
  for (let i = 1; i < ring.length - 1; i++) t.tri(at(ring[0], y), at(ring[i], y), at(ring[i + 1], y));
  return t.geometry();
}

/** Closed loop of line segments round a ring at height y. */
const ringLines = (ring: P[], y: number) => ring.flatMap((p, i) => [...at(p, y), ...at(ring[(i + 1) % ring.length], y)]);

/** Direction (footprint coordinates) from the tank toward the room wall: the back, or the peninsula end. */
const wallDir = (S: TankSetup): P => { const pen = penEnd(S); return pen === 'left' ? [-1, 0] : pen === 'right' ? [1, 0] : [0, 1]; };

/** Runs of the inside of the glass that face the room wall (the background goes there), each from its front-left end. */
function backRuns(S: TankSetup, T: Tank): P[][] {
  return facingRuns(T, 0, wallDir(S), 0.3).map(r => (r[0][0] + r[0][1] > r[r.length - 1][0] + r[r.length - 1][1] ? [...r].reverse() : r));
}

function addTank(sc: THREE.Scene, S: TankSetup & { units: Units }, T: Tank) {
  const { H } = T, R = S.render, fp = footprint(T);
  // backing under the substrate; a bare-bottom tank has none, so the stand top or the room shows through the bottom pane
  if (S.substrate.show || S.layout.id === 'swamp' || S.terrain.on) sc.add(new THREE.Mesh(flatGeometry(fp.ring, 0), basic(0xcdb98f, { side: THREE.DoubleSide })));
  const bg = BACKGROUNDS[R.bg], t = glassThickness(T, R.glass), runs = backRuns(S, T);
  // the background covers the glass that faces the room wall: the back, or the end against it in a peninsula (then the
  // long back glass is clear, since that side is viewable); on a round or angled tank it wraps round the back
  if (bg.color !== null) {
    for (const r of runs) {
      const g = new Tris(), len = runLength(r) || 1; let s = 0;
      for (let i = 0; i < r.length - 1; i++) {
        const s1 = s + Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
        g.quad(at(r[i], 0), at(r[i + 1], 0), at(r[i + 1], H), at(r[i], H), 0, [[s / len, 0], [s1 / len, 0], [s1 / len, 1], [s / len, 1]]); s = s1;
      }
      sc.add(new THREE.Mesh(g.geometry(), basic(bg.color, { map: bg.gradient ? gradientTexture() : null, side: THREE.DoubleSide })));
    }
  }
  // glass sits OUTSIDE the interior outline; large faces nearly clear, thin edge faces tinted so thickness shows
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.06, depthWrite: false });
  const lowIron = R.glassType === 'lowiron';
  const edgeM = lowIron
    ? basic(0xa9d3da, { transparent: true, opacity: 0.75, depthWrite: false })
    : basic(0x3f8f72, { transparent: true, opacity: 0.85, depthWrite: false });
  // pane outlines: thin glass is often under a pixel thick, so its edge faces vanish; a line is always >= 1 px.
  // Light lines read on dark backgrounds, dark lines on light ones (and on clear glass over the grey stage).
  const lineCol = bg.light ? (lowIron ? 0x6f8f96 : 0x2f6f5a) : (lowIron ? 0xe2f3f6 : 0x8fd6bb);
  const edgeLine = new THREE.LineBasicMaterial({ color: lineCol, transparent: true, opacity: 0.75, depthWrite: false });
  const add = (geo: THREE.BufferGeometry, ro: number) => {
    const g = new THREE.Mesh(geo, [faceM, edgeM]); g.renderOrder = ro; sc.add(g);
    const o = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeLine); o.renderOrder = ro + 1; sc.add(o); // 20°: no seams between a curved shell's facets
  };
  // bottom pane under everything; one wall per pane (a curved shell is one wall), mitred at the corners
  const outer = offsetWalls(T, t);
  add(prismGeometry(offsetRing(T, t), -t, 0), 5);
  fp.walls.forEach((w, i) => {
    const front = fp.edges.some(e => e.wall === i && e.n[1] < -0.5);
    add(wallGeometry(w.pts, outer[i], 0, H, fp.walls.length === 1), front ? 6 : 5);
  });
  // interior outline: top and bottom loops, and the vertical corners where panes meet
  const box: number[] = [...ringLines(fp.ring, 0), ...ringLines(fp.ring, H)];
  if (fp.walls.length > 1) for (const w of fp.walls) box.push(...at(w.pts[0], 0), ...at(w.pts[0], H));
  sc.add(lines(box, R.rim ? 0x55636f : 0x7fb5a6, 0.35));
  if (R.rim) {
    const rm = basic(0x1a1d21), r = t + 8, h = RIM_H, inner = fp.ring, rr = offsetRing(T, r);
    for (const y0 of [H - h + 2, -t - 2]) sc.add(new THREE.Mesh(wallGeometry([...inner, inner[0]], [...rr, rr[0]], y0, y0 + h, true), rm));
  }
  if (R.grid) {
    const sub = (x: number, d: number) => groundHeight(S, T, x, d);
    const step = S.units === 'in' ? 2 * IN : 50, w: number[] = [], f: number[] = [];
    // on the background, 0.5 mm in front of it: vertical lines every step along it, and the heights
    for (const r of runs) {
      const len = runLength(r), inset = (p: P): P => { const g = nearestGlass(T, p[0], p[1]); return [p[0] - g.n[0] * 0.5, p[1] - g.n[1] * 0.5]; };
      for (let s = step; s < len; s += step) { const p = inset(alongRun(r, s)); w.push(...at(p, 0), ...at(p, H)); }
      const pts = r.map(inset);
      for (let y = step; y < H; y += step) for (let i = 0; i < pts.length - 1; i++) w.push(...at(pts[i], y), ...at(pts[i + 1], y));
    }
    // on the floor: lines across at every step, ending on the glass, following the ground
    for (let x = step; x < T.L; x += step) { const c = chord(T, 0, x); if (c) f.push(x, sub(x, c[0]) + 0.5, -c[0], x, sub(x, c[1]) + 0.5, -c[1]); }
    for (let z = step; z < T.D; z += step) { const c = chord(T, 1, z); if (c) f.push(c[0], sub(c[0], z) + 0.5, -z, c[1], sub(c[1], z) + 0.5, -z); }
    sc.add(lines(w, bg.light ? 0x000000 : 0xffffff, bg.light ? 0.12 : 0.16)); sc.add(lines(f, 0x000000, 0.14));
  }
}

/**
 * The water surface (seen from above or when orbiting; edge-on straight on) and a faint meniscus line where it meets
 * the glass. The colour of the water itself is a tint in the lighting shader (see aqWaterPath).
 */
function addWater(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.water.on) return;
  const y = waterY(T, S.water.level), c = new THREE.Color(0xd8eef2).lerp(new THREE.Color(S.water.color), 0.25 + 0.5 * S.water.opacity);
  const surf = new THREE.Mesh(flatGeometry(footprint(T).ring, y), basic(c, { transparent: true, opacity: 0.1 + 0.25 * S.water.opacity, depthWrite: false, side: THREE.DoubleSide }));
  surf.renderOrder = 4; surf.userData.nolight = true; sc.add(surf);
  const line = lines(ringLines(offsetRing(T, -0.6), y), 0xe8f6fa, 0.45);
  line.renderOrder = 4; sc.add(line);
}

export const STAND_FINISHES: Record<TankSetup['stand']['finish'], { label: string; color: number }> = {
  black: { label: 'Black', color: 0x23262b },
  white: { label: 'White', color: 0xe4e2dc },
  oak: { label: 'Oak', color: 0xa77b4f },
};

/** Box faces in BoxGeometry order (+x, -x, +y, -y, +z, -z), shaded so it reads as 3D; lit as a room surface. */
function shadedBox(w: number, h: number, d: number, color: number) {
  const c = new THREE.Color(color), k = [0.78, 0.78, 1.08, 0.5, 0.95, 0.7];
  const mats = k.map(f => basic(c.clone().multiplyScalar(f)));
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.userData.room = true;
  return m;
}

/**
 * A solid over a convex footprint ring, y0..y1, shaded per face like shadedBox (top bright, front lighter than the
 * back, ends between) so it reads as 3D; lit as a room surface.
 */
function shadedPrism(ring: P[], y0: number, y1: number, color: number) {
  const geo = prismGeometry(ring, y0, y1), n = geo.attributes.normal, c = new THREE.Color(color), cols: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), nz = n.getZ(i), k = ny > 0.5 ? 1.08 : ny < -0.5 ? 0.5 : 0.78 + nz * (nz > 0 ? 0.17 : 0.08);
    cols.push(c.r * k, c.g * k, c.b * k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.clearGroups();
  const m = new THREE.Mesh(geo, basic(0xffffff, { vertexColors: true })); m.userData.room = true;
  return m;
}

/** Stand under the tank, from the floor up to the tank's underside: a cabinet with the outer glass's footprint, an open frame, or a table. */
function addStand(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.stand.show) return;
  const t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), h = S.stand.height, fin = STAND_FINISHES[S.stand.finish];
  if (S.stand.style === 'frame') { addFrameStand(sc, T, t, top, h, fin.color); return; }
  if (S.stand.style === 'table') { addTableStand(sc, S, T, top, h, fin.color); return; }
  sc.add(shadedPrism(offsetRing(T, t), top - h, top, fin.color));
  // doors on the faces toward the viewer (a curved front gets curved doors): seams just proud of the face, a
  // kick-plate line near the floor, a split in the middle; a peninsula is open on both long sides, so its cabinet has
  // doors on the back too (Nathan 2026-10-08)
  const inset = Math.min(30, h * 0.08), y0 = top - h + Math.min(70, h * 0.12), y1 = top - inset;
  const seam = fin.color === STAND_FINISHES.white.color ? 0x9a9890 : 0x111214, pts: number[] = [];
  const runs = facingRuns(T, t + 0.6, [0, -1]).concat(penEnd(S) ? facingRuns(T, t + 0.6, [0, 1]) : []);
  for (const r of runs) {
    const len = runLength(r); if (len < 2 * inset + 40) continue;
    const door = subRun(r, inset, len - inset), m = alongRun(r, len / 2);
    for (const y of [y0, y1]) for (let i = 0; i < door.length - 1; i++) pts.push(...at(door[i], y), ...at(door[i + 1], y));
    for (const p of [door[0], door[door.length - 1], m]) pts.push(...at(p, y1), ...at(p, y0));
  }
  sc.add(lines(pts, seam, 0.8));
}

/**
 * Table stand: a top (rectangular or round) the tank sits on anywhere, an apron just under it set in from the edge,
 * and four square legs (round: at the diagonals) on that apron's corners.
 */
function addTableStand(sc: THREE.Scene, S: TankSetup, T: Tank, top: number, h: number, color: number) {
  const tb = S.stand.table, topT = Math.min(TABLE_TOP, h / 4), apronH = Math.min(90, h / 6), leg = Math.min(60, h / 8);
  const inset = Math.min(50, tb.L / 8, tb.D / 8), y0 = top - h;
  sc.add(shadedPrism(tableRing(T, tb), top - topT, top, color));
  const [cx, cd] = tableCentre(T, tb), r = tb.L / 2 - inset;
  const apron = tableRing(T, tb).map(([x, d]) => [cx + (x - cx) * (1 - inset / (tb.L / 2)), cd + (d - cd) * (1 - inset / (tb.D / 2))] as P);
  sc.add(shadedPrism(apron, top - topT - apronH, top - topT, color));
  const legs: P[] = tb.shape === 'round'
    ? [1, 3, 5, 7].map(k => [cx + (r - leg * 0.75) * Math.cos(k * Math.PI / 4), cd + (r - leg * 0.75) * Math.sin(k * Math.PI / 4)] as P)
    : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sd]) => [cx + sx * (tb.L / 2 - inset - leg / 2), cd + sd * (tb.D / 2 - inset - leg / 2)] as P);
  const lh = h - topT;
  for (const [x, d] of legs) { const b = shadedBox(leg, lh, leg, color); b.position.set(x, y0 + lh / 2, -d); sc.add(b); }
}

/** Steel tube size for the open frame stand (mm): 1.5" square tube, the common size for welded aquarium stands. */
const TUBE = 38;

/**
 * Open welded steel stand: square-tube legs at the corners (round: spaced round the circle), a top frame the tank sits
 * on, a bottom frame just above the floor, and extra legs (with cross rails) every ~90 cm on long panes. Nothing in
 * between: the room shows through.
 */
function addFrameStand(sc: THREE.Scene, T: Tank, t: number, top: number, h: number, color: number) {
  const s = Math.min(TUBE, h / 6), foot = 12, yLow = top - h + foot + s / 2, yTop = top - s / 2;
  const box = (w: number, hh: number, d: number, x: number, y: number, z: number, ry = 0) => { const b = shadedBox(w, hh, d, color); b.position.set(x, y, z); b.rotation.y = ry; sc.add(b); };
  // leg centres: the outline pushed out to the tube's centre line; each pane's start, plus more along long panes
  const legs: P[] = [];
  for (const w of offsetWalls(T, t - s / 2)) {
    const len = runLength(w), curved = w.length > 2, n = curved ? Math.max(2, Math.round(len / 600)) : Math.max(1, Math.round(len / 900));
    for (let k = 0; k < n; k++) legs.push(alongRun(w, len * k / n));
  }
  const rail = (p: P, q: P, y: number) => {
    const dx = q[0] - p[0], dz = -(q[1] - p[1]), len = Math.hypot(dx, dz) - s;
    if (len > 1) box(len, s, s, (p[0] + q[0]) / 2, y, -(p[1] + q[1]) / 2, Math.atan2(-dz, dx));
  };
  for (const p of legs) { box(s, h - foot, s, p[0], top - (h - foot) / 2, -p[1]); box(s * 0.7, foot, s * 0.7, p[0], top - h + foot / 2, -p[1]); } // legs on small levelling feet
  for (const y of [yTop, yLow]) {
    legs.forEach((p, i) => rail(p, legs[(i + 1) % legs.length], y));                                       // round the outline
    // cross rails front to back between the middle legs of a long tank
    const d0 = Math.min(...legs.map(p => p[1])), d1 = Math.max(...legs.map(p => p[1]));
    for (const p of legs) if (Math.abs(p[1] - d0) < 1) { const q = legs.find(b => Math.abs(b[1] - d1) < 1 && Math.abs(b[0] - p[0]) < 1); if (q && legs.indexOf(q) !== (legs.indexOf(p) + 1) % legs.length && legs.indexOf(p) !== (legs.indexOf(q) + 1) % legs.length) rail(p, q, y); }
  }
}

/** Hood height at the back (mm), above the rim top. */
export const HOOD_H = 38;

/**
 * Classic low-profile moulded hood (lights inside): sits just inside the rim, tallest at the back, curving down to a
 * rounded front, with a recessed feeding hatch. Side profile extruded along the tank length; shaded per vertex so the
 * curve reads without lights.
 */
function addHood(sc: THREE.Scene, S: TankSetup, T: Tank) {
  const { L, D } = T, t = glassThickness(T, S.render.glass), rim = S.render.rim;
  const o = rim ? t + 8 : t, inset = 6, base = rim ? T.H + RIM_DROP : T.H, bev = 3;
  const x0 = -o + inset + bev, x1 = L + o - inset - bev;
  // profile in (u, y): u = -z (front of the hood has the smallest u), y up from the rim top
  const uf = -(o - inset - bev), ub = D + o - inset - bev, hf = 22, hb = HOOD_H - bev, um = (uf + ub) / 2;
  const p0 = new THREE.Vector2(uf + hf, hf), c = new THREE.Vector2(um, hb), p1 = new THREE.Vector2(ub, hb);
  const shape = new THREE.Shape();
  shape.moveTo(uf, 0); shape.lineTo(uf, hf * 0.45);
  shape.quadraticCurveTo(uf, hf, p0.x, p0.y);               // rounded front nose
  shape.quadraticCurveTo(c.x, c.y, p1.x, p1.y);             // gently domed top rising to the back
  shape.lineTo(ub, 0); shape.closePath();
  const bow = shapeOf(T) === 'bow';
  const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, steps: bow ? 32 : 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 14 });
  geo.rotateY(Math.PI / 2); geo.translate(x0, base, 0);     // local (u, y, e) -> world (x0 + e, base + y, -u)
  // bowfront: the profile's front follows the bow (stretched toward the back, which stays straight)
  const warp = (x: number, u: number) => { if (!bow) return u; const f = chord(T, 0, clamp(x, 0, L))?.[0] ?? 0; return ub - (ub - u) * (ub - (f + uf)) / (ub - uf); };
  if (bow) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -warp(p.getX(i), -p.getZ(i))); }
  geo.computeVertexNormals();
  const n = geo.attributes.normal, base3 = new THREE.Color(0x1b1d21), light = new THREE.Vector3(-0.35, 1, 0.6).normalize(), cols: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const k = 0.62 + 0.75 * Math.max(0, n.getX(i) * light.x + n.getY(i) * light.y + n.getZ(i) * light.z);
    cols.push(base3.r * k, base3.g * k, base3.b * k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const hood = new THREE.Mesh(geo, basic(0xffffff, { vertexColors: true })); hood.userData.room = true; sc.add(hood);
  // feeding hatch: a rectangle on the top, front-centre, following the dome
  const topY = (u: number) => {                             // height of the top curve at u (sampled Bezier)
    let best = hb, err = Infinity;
    for (let i = 0; i <= 64; i++) {
      const s = i / 64, x = (1 - s) ** 2 * p0.x + 2 * (1 - s) * s * c.x + s * s * p1.x;
      if (Math.abs(x - u) < err) { err = Math.abs(x - u); best = (1 - s) ** 2 * p0.y + 2 * (1 - s) * s * c.y + s * s * p1.y; }
    }
    return base + best + bev + 0.8;
  };
  const ua = uf + (ub - uf) * 0.2, ubh = uf + (ub - uf) * 0.42, hx0 = L / 2 - L * 0.13, hx1 = L / 2 + L * 0.13;
  const ya = topY(ua), yb = topY(ubh);
  const hp: number[] = [], seg = bow ? 12 : 1, W = (x: number, y: number, u: number) => [x, y, -warp(x, u)];
  for (let i = 0; i < seg; i++) { const xa = hx0 + (hx1 - hx0) * i / seg, xb = hx0 + (hx1 - hx0) * (i + 1) / seg; hp.push(...W(xa, ya, ua), ...W(xb, ya, ua), ...W(xa, yb, ubh), ...W(xb, yb, ubh)); }
  hp.push(...W(hx0, ya, ua), ...W(hx0, yb, ubh), ...W(hx1, ya, ua), ...W(hx1, yb, ubh));
  sc.add(lines(hp, 0x45484e, 0.95));
}

/** Lid: classic black moulded hood with a hinged front flap, or two glass canopy panels on a plastic hinge strip. */
function addLid(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (S.lid === 'open') return;
  const { L, H, D } = T, t = glassThickness(T, S.render.glass), rim = S.render.rim;
  if (S.lid === 'hood') { addHood(sc, S, T); return; }
  // glass top: two panels split along the length, resting on the inner rim lip (rimmed) or on the panes (rimless)
  const pt = 4, y = rim ? H - RIM_H + RIM_DROP + 6 + pt / 2 : H + pt / 2, gap = 3, inset = rim ? 2 : -t;
  const lowIron = S.render.glassType === 'lowiron';
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.1, depthWrite: false });
  const edgeM = basic(lowIron ? 0xa9d3da : 0x3f8f72, { transparent: true, opacity: 0.8, depthWrite: false });
  const lineM = new THREE.LineBasicMaterial({ color: BACKGROUNDS[S.render.bg].light ? 0x2f6f5a : 0x8fd6bb, transparent: true, opacity: 0.7, depthWrite: false });
  if (shapeOf(T) !== 'rect') { // one plate cut to the outline (lifted off, not hinged)
    const geo = prismGeometry(offsetRing(T, -inset), y - pt / 2, y + pt / 2);
    const g = new THREE.Mesh(geo, [faceM, edgeM]); g.renderOrder = 7; sc.add(g);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), lineM); e.renderOrder = 8; sc.add(e);
    return;
  }
  const w = (L - 2 * inset - gap) / 2, dp = D - 2 * inset;
  for (const cx of [inset + w / 2, L - inset - w / 2]) {
    const geo = new THREE.BoxGeometry(w, pt, dp), m = [edgeM, edgeM, faceM, faceM, edgeM, edgeM];
    const g = new THREE.Mesh(geo, m); g.position.set(cx, y, -D / 2); g.renderOrder = 7; sc.add(g);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineM); e.position.copy(g.position); e.renderOrder = 8; sc.add(e);
  }
  const hinge = shadedBox(L - 2 * inset, pt + 2, 12, 0x2b2e33); hinge.position.set(L / 2, y, -D * 0.38); sc.add(hinge); // back strip | front flap
}

/** Silhouette card width / height. */
export const PERSON_ASPECT = 0.34;
/** Gap between the tank's outline (as seen from the eye) and the person's near side, mm. */
const PERSON_GAP = 250;
/** Straight-on eye position (horizontal), for placements that do not follow the orbit. */
export const straightOnEye = (S: TankSetup, T: Tank) => ({ x: T.L / 2, z: S.camera.dist });
/**
 * Where the scale person stands: a fixed spot in the room, chosen from the straight-on view: beside the tank on the
 * chosen side, as far from that eye as the tank centre (equal scale when viewed straight on). If that spot is behind
 * the room wall they take the other side; if both are, they stand against the wall. They stay put while orbiting
 * (Nathan, 2026-10-08: following the view made them jump sides).
 */
export const personSpot = (S: TankSetup, T: Tank) => personPlacement(S, T, straightOnEye(S, T));
export function personPlacement(S: TankSetup, T: Tank, eye: { x: number; z: number }) {
  const t = glassThickness(T, S.render.glass), rim = S.render.rim ? t + 8 : t;
  const h = S.person.height, w = h * PERSON_ASPECT, floor = floorY(T, S.render, S.stand);
  const vx = T.L / 2 - eye.x, vz = -T.D / 2 - eye.z, r = Math.hypot(vx, vz) || 1, ux = vx / r, uz = vz / r;
  let half = halfWidth(T, ux, uz, rim); // tank half-width across the view (with a table: the table's, from its edge)
  if (tableOn(S)) for (const [x, d] of tableRing(T, S.stand.table)) half = Math.max(half, Math.abs((x - T.L / 2) * -uz + (-d + T.D / 2) * ux));
  const phi = Math.asin(Math.min(0.9, (half + PERSON_GAP + w / 2) / r));
  // rotate eye->tank about the eye: a positive angle swings toward screen-right
  const spot = (a: number) => ({ x: eye.x + vx * Math.cos(a) - vz * Math.sin(a), z: eye.z + vx * Math.sin(a) + vz * Math.cos(a) });
  const wp = wallPlane(S, T), wb = wp.back, wr = wp.right, wl = wp.left, m = w / 2 + 5, ws = S.wall.side;
  const blocked = (p: { x: number; z: number }) => S.wall.show && (ws === 'back' ? p.z - m < wb : ws === 'right' ? p.x + m > wr : p.x - m < wl);
  let side: -1 | 1 = S.person.side === 'left' ? -1 : 1, p = spot(side * phi);
  if (blocked(p)) {
    const q = spot(-side * phi);
    if (!blocked(q)) { p = q; side = side === 1 ? -1 : 1; } else p = ws === 'back' ? { ...p, z: wb + m } : ws === 'right' ? { ...p, x: wr - m } : { ...p, x: wl + m };
  }
  return { x: p.x, z: p.z, w, h, floor, side };
}
function addPerson(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.person.show) return;
  const p = personSpot(S, T), g = new THREE.PlaneGeometry(p.w, p.h); g.translate(0, p.h / 2, 0);
  const m = new THREE.Mesh(g, cardMaterial('person', personTexture(), 'cutout'));
  m.position.set(p.x, p.floor, p.z); m.name = 'person'; m.userData.room = true; sc.add(m);
}

/** Plain room floor under the stand/wall, so the room doesn't float in a void. One-sided (invisible from below). */
function addFloor(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.stand.show && !S.wall.show && !S.person.show) return;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), basic(0xb3aca1));
  f.rotation.x = -Math.PI / 2; f.position.set(T.L / 2, floorY(T, S.render, S.stand) - 0.5, -T.D / 2);
  f.userData.room = true; sc.add(f);
}

/** Room wall behind the tank or against a short end (peninsula). One-sided, so it vanishes when viewed from behind. */
function addWall(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.wall.show) return;
  const { L, D } = T, wp = wallPlane(S, T), fy = floorY(T, S.render, S.stand);
  const ROOM_H = 2700, SPAN = 6000, SKIRT_H = 90, SKIRT_D = 14;
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, ROOM_H), basic(S.wall.color)); // normal +z, toward the tank
  wall.position.set(0, ROOM_H / 2, 0); wall.userData.room = true; g.add(wall);
  const skirt = shadedBox(SPAN, SKIRT_H, SKIRT_D, 0xf1efe9); skirt.position.set(0, SKIRT_H / 2, SKIRT_D / 2); g.add(skirt);
  if (S.wall.side === 'back') g.position.set(L / 2, fy, wp.back);
  else if (S.wall.side === 'right') { g.position.set(wp.right, fy, -D / 2); g.rotation.y = -Math.PI / 2; }
  else { g.position.set(wp.left, fy, -D / 2); g.rotation.y = Math.PI / 2; }
  sc.add(g);
}

function addSubstrate(sc: THREE.Scene, S: TankSetup, T: Tank) {
  const swamp = S.layout.id === 'swamp' || S.terrain.on;
  if (!S.substrate.show && !swamp) return;
  const { L, D } = T, tile = SUBSTRATES[S.substrate.type].tile * 2, h = (x: number, d: number) => groundHeight(S, T, x, d);
  // top surface as a 16x16 grid (bilinear surfaces curve along diagonals) clipped to the outline, and a skirt round the
  // outline; UVs from physical mm so grain size is constant
  type V3 = [number, number, number];
  const top: number[][] = [], side: number[][] = [], N = swamp ? 72 : 16, wy = waterY(T, S.water.level);
  const G = (p: P): V3 => [p[0], h(p[0], p[1]), -p[1]];
  const P3 = (i: number, j: number): V3 => G([L * i / N, D * j / N]);
  // cheap slope shading: brightness from each cell's tilt toward a light above, front and left
  const light = new THREE.Vector3(-0.35, 1, 0.45).normalize(), topCol: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cell = clipToFootprint(T, [[L * i / N, D * j / N], [L * (i + 1) / N, D * j / N], [L * (i + 1) / N, D * (j + 1) / N], [L * i / N, D * (j + 1) / N]]);
    if (cell.length < 3) continue;
    const q = [P3(i, j), P3(i + 1, j), P3(i + 1, j + 1), P3(i, j + 1)];
    const a = new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])), b = new THREE.Vector3(...q[3]).sub(new THREE.Vector3(...q[0]));
    const n = new THREE.Vector3().crossVectors(a, b).normalize(); if (n.y < 0) n.negate();
    const k = clamp(0.55 + 0.6 * n.dot(light), 0, 1.15) / 1.15;
    // emerged ground reads as damp soil and moss (mottled), not aquarium gravel
    const my = (q[0][1] + q[2][1]) / 2, dry = clamp((my - wy) / 12, 0, 1), mo = 0.5 + 0.5 * Math.sin(q[0][0] * 0.045 + Math.sin(q[0][2] * 0.05) * 2.4);
    const c = [k * (1 - dry * (0.42 + 0.12 * mo)), k * (1 - dry * (0.3 - 0.12 * mo)), k * (1 - dry * (0.62 + 0.05 * mo))];
    const v = cell.map(G); // a whole cell is the quad as before; a cut one is a fan
    for (let m = 1; m < v.length - 1; m++) for (const p of [v[0], v[m], v[m + 1]]) { top.push(p, [p[0] / tile, -p[2] / tile]); topCol.push(...c); }
  }
  // the skirt round the outline in short strips, so its top edge follows the ground (swamp banks are not straight);
  // the back shows through clear back glass (peninsula, orbiting round the back)
  const seg = Math.min(L, D) / N;
  for (const e of footprint(T).edges) {
    const m = Math.max(1, Math.ceil(e.len / seg));
    for (let k = 0; k < m; k++) {
      const p: P = [e.a[0] + (e.b[0] - e.a[0]) * k / m, e.a[1] + (e.b[1] - e.a[1]) * k / m], q: P = [e.a[0] + (e.b[0] - e.a[0]) * (k + 1) / m, e.a[1] + (e.b[1] - e.a[1]) * (k + 1) / m];
      const s0 = e.s0 + e.len * k / m, s1 = e.s0 + e.len * (k + 1) / m, gp = G(p), gq = G(q);
      const pts: V3[] = [[p[0], 0, -p[1]], [q[0], 0, -q[1]], gq, gp], uv = [[s0, 0], [s1, 0], [s1, gq[1]], [s0, gp[1]]];
      for (const i of [0, 1, 2, 0, 2, 3]) side.push(pts[i], [uv[i][0] / tile, uv[i][1] / tile]);
    }
  }
  const mk = (arr: number[][], shade: number, cols?: number[]) => {
    const g = new THREE.BufferGeometry(); if (cols) g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 0).flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 1).flat(), 2));
    const m = new THREE.MeshBasicMaterial({ map: substrateTexture(S.substrate.type), color: shade, vertexColors: !!cols, side: THREE.DoubleSide });
    m.userData.sub = true; sc.add(new THREE.Mesh(g, m));
  };
  mk(top, 0xffffff, topCol); mk(side, 0xb4b4b4); // the skirt a touch darker so the layer reads through the glass
}

export function cardGeometry(w: number, h: number, bend: number) {
  const g = new THREE.PlaneGeometry(w, h, 16, 1);
  if (bend) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2); p.setZ(i, bend * w * 0.14 * (1 - u * u)); }
    g.computeBoundingSphere();
  }
  return g;
}

function outline(w: number, h: number) {
  const r = lines([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0, -w / 2, h / 2, 0, -w / 2, -h / 2, 0], 0x3d8bff, 1);
  (r.material as THREE.Material).depthTest = false; r.renderOrder = 10;
  return r;
}

export interface BuiltTank {
  scene: THREE.Scene;
  fishMeshes: THREE.Mesh[];
  meshById: Map<number, THREE.Mesh>;
  /** Custom terrain grid points (userData.dot = index), present while editing. */
  dotMeshes: THREE.Mesh[];
}

/**
 * Custom terrain editing aids: a dot on every grid point (drawn over everything so plants never hide one) and faint
 * grid lines following the ground between them. `hot` = the point being dragged.
 */
function addTerrainDots(sc: THREE.Scene, S: TankSetup, T: Tank, hot: number | null): THREE.Mesh[] {
  const t = S.terrain, g = (x: number, d: number) => groundHeight(S, T, x, d), dots: THREE.Mesh[] = [], pts: number[] = [];
  const r = clamp(Math.min(T.L / (t.cols - 1), T.D / (t.rows - 1)) * 0.09, 3.5, 9);
  const geo = new THREE.SphereGeometry(r, 12, 8), ring = new THREE.SphereGeometry(r * 1.45, 12, 8);
  const mat = (c: number) => basic(c, { depthTest: false, transparent: true, opacity: 0.95 });
  const fill = mat(0xffffff), hotM = mat(0xffb020), edge = mat(0x1d2a33);
  for (let j = 0; j < t.rows; j++) for (let i = 0; i < t.cols; i++) {
    const k = j * t.cols + i, p = terrainPoint(t, T, i, j), y = g(p.x, p.depth);
    if (!inside(T, p.x, p.depth, -1)) continue; // outside a round or angled tank: still shapes the ground, not shown
    const o = new THREE.Mesh(ring, edge); o.position.set(p.x, y, -p.depth); o.renderOrder = 20; o.userData.nolight = true; sc.add(o);
    const m = new THREE.Mesh(geo, k === hot ? hotM : fill); m.position.copy(o.position); m.renderOrder = 21; m.userData = { nolight: true, dot: k }; sc.add(m); dots.push(m);
  }
  const seg = 10;
  for (let j = 0; j < t.rows; j++) for (let i = 0; i < (t.cols - 1) * seg; i++) {
    const d = T.D * j / (t.rows - 1), x0 = T.L * i / ((t.cols - 1) * seg), x1 = T.L * (i + 1) / ((t.cols - 1) * seg);
    pts.push(x0, g(x0, d) + 1, -d, x1, g(x1, d) + 1, -d);
  }
  for (let i = 0; i < t.cols; i++) for (let j = 0; j < (t.rows - 1) * seg; j++) {
    const x = T.L * i / (t.cols - 1), d0 = T.D * j / ((t.rows - 1) * seg), d1 = T.D * (j + 1) / ((t.rows - 1) * seg);
    pts.push(x, g(x, d0) + 1, -d0, x, g(x, d1) + 1, -d1);
  }
  sc.add(lines(pts, 0xffffff, 0.35));
  return dots;
}

export function buildTank(S: TankSetup & { units: Units }, T: Tank, selId: number | null, edit?: { hot: number | null }): BuiltTank {
  const sc = new THREE.Scene(), fishMeshes: THREE.Mesh[] = [], meshById = new Map<number, THREE.Mesh>();
  addTank(sc, S, T); addWater(sc, S, T); addSubstrate(sc, S, T); addStand(sc, S, T); addWall(sc, S, T); addPerson(sc, S, T); addFloor(sc, S, T);
  const lay = layoutGroup(S, T); if (lay) sc.add(lay);
  const register = (f: Fish, m: THREE.Mesh, w: number, h: number) => {
    m.userData.id = f.id; if (f.id === selId) m.add(outline(w, h));
    sc.add(m); fishMeshes.push(m); if (!meshById.has(f.id)) meshById.set(f.id, m);
  };
  for (const f of S.fish) {
    const sp = getSpecies(f.species); if (!sp) continue;
    if (sp.kind === 'snail') { for (const [m, w, h] of snailMeshes(S, T, f, sp)) register(f, m, w, h); continue; }
    if (!S.water.on && needsWater(sp)) continue; // dry tank: fish stay in the scene data, hidden until the water is back
    const w = fishTL(f, sp), h = w * sp.aspect, p = f;
    const m = new THREE.Mesh(cardGeometry(w, h, f.bend), cardMaterial('fish:' + f.species, fishTexture(f.species), S.render.edge));
    // bottom dwellers and animals on land rest on the ground wherever they are (their stored height is ignored)
    const y = restsOnGround(S, T, sp, p.x, p.depth, h) ? groundHeight(S, T, p.x, p.depth) + sp.rest * w - 1 : Math.min(p.y, Math.max(0, waterY(T, S.water.level) - h / 2));
    m.position.set(p.x, y, -p.depth); m.rotation.set(f.roll * D2R, f.yaw * D2R, f.pitch * D2R, 'YXZ');
    register(f, m, w, h);
  }
  addLid(sc, S, T);
  if (S.lid !== 'hood') addFixture(sc, T, S.light, floorY(T, S.render, S.stand) + 2700); // ceiling: the wall's room height // with a hood the fixture is inside it; its light still applies
  const dotMeshes = edit && S.terrain.on ? addTerrainDots(sc, S, T, edit.hot) : [];
  applyLighting(sc);
  sc.updateMatrixWorld(true);
  return { scene: sc, fishMeshes, meshById, dotMeshes };
}

/** How far a glass snail sits off the inside of the pane (mm). */
const PANE_GAP = 0.8;

/**
 * Snail cards. On the substrate: one upright side-view card. On glass: two one-sided cards back to back, the foot
 * facing the glass (what you see through that pane) and the shell facing into the tank; yaw = heading in the pane.
 */
function snailMeshes(S: TankSetup, T: Tank, f: Fish, sp: Species): [THREE.Mesh, number, number][] {
  const p = f, surf = f.surface ?? 'floor', w = fishTL(f, sp), edge = S.render.edge;
  const sub = (x: number, d: number) => groundHeight(S, T, x, d);
  if (surf === 'floor') {
    const h = w * sp.aspect, m = new THREE.Mesh(cardGeometry(w, h, 0), cardMaterial(`snail:${sp.art}:side`, snailTexture(sp.art, 'side'), edge));
    m.position.set(p.x, sub(p.x, p.depth) + sp.rest * w - 0.5, -p.depth); m.rotation.set(0, f.yaw * D2R, 0, 'YXZ');
    return [[m, w, h]];
  }
  // on the glass at the point nearest its (x, depth), just off the inside face, foot (local +z) toward the glass
  const h = w * snailAspect(sp.art, 'foot'), g = nearestGlass(T, p.x, p.depth), ry = Math.atan2(g.n[0], -g.n[1]);
  const x = g.x - g.n[0] * PANE_GAP, d = g.depth - g.n[1] * PANE_GAP;
  const top = S.water.on ? waterY(T, S.water.level) : T.H; // dry: the whole pane
  const y = clamp(p.y, sub(x, d) + h / 2, Math.max(sub(x, d) + h / 2, top - w / 2));
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMaterial(`snail:${sp.art}:foot`, snailTexture(sp.art, 'foot'), edge, THREE.FrontSide));
  const sg = new THREE.PlaneGeometry(w, h).rotateY(Math.PI), uv = sg.attributes.uv; // face into the tank, texture not mirrored
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  const shell = new THREE.Mesh(sg, cardMaterial(`snail:${sp.art}:shell`, snailTexture(sp.art, 'shell'), edge, THREE.FrontSide));
  for (const m of [foot, shell]) { m.position.set(x, y, -d); m.rotation.set(0, ry, f.yaw * D2R, 'YXZ'); }
  return [[foot, w, h], [shell, w, h]];
}

export function disposeScene(sc: THREE.Scene | undefined) {
  sc?.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.geometry?.userData.keep) m.geometry?.dispose();
    if (m.material) for (const mat of ([] as THREE.Material[]).concat(m.material)) if (!mat.userData.cached && !mat.userData.keep) mat.dispose();
  });
}
