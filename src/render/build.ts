// Builds a three.js scene for one tank from scene data. Rebuilt on every content change (cheap at this scale);
// textures and card materials are cached across rebuilds.
import * as THREE from 'three';
import { SUBSTRATES } from '../art/placeholder';
import { snailAspect } from '../art/snails';
import { fishTL, getSpecies, needsWater, type Species } from '../data/species';
import { restsOnGround } from '../scene/water';
import { D2R, IN, WALL_GAP, clamp, floorY, glassThickness, mapToTank, RIM_DROP, RIM_H, tankUnderside, waterY } from '../scene/physics';
import { groundHeight, terrainPoint } from '../scene/terrain';
import type { Background, Fish, Scene, Tank } from '../scene/types';
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
const plane = (w: number, h: number, mat: THREE.Material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
function lines(pts: number[], color: number, opacity: number) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

/** Peninsula: the tank's right end stands against the room wall. */
const isPeninsula = (S: Scene) => S.wall.show && S.wall.side === 'peninsula';

function addTank(sc: THREE.Scene, S: Scene, T: Tank) {
  const { L, H, D } = T, R = S.render;
  // backing under the substrate; a bare-bottom tank has none, so the stand top or the room shows through the bottom pane
  if (S.substrate.show || S.layout.id === 'swamp' || S.terrain.on) {
    const floor = plane(L, D, basic(0xcdb98f, { side: THREE.DoubleSide })); floor.rotation.x = -Math.PI / 2; floor.position.set(L / 2, 0, -D / 2); sc.add(floor);
  }
  const bg = BACKGROUNDS[R.bg], t = glassThickness(T, R.glass), pen = isPeninsula(S);
  // the background covers the glass that faces the room wall: the back, or the right end in a peninsula (then the
  // long back glass is clear, since that side is viewable)
  if (bg.color !== null) {
    const back = plane(pen ? D : L, H, basic(bg.color, { map: bg.gradient ? gradientTexture() : null, side: THREE.DoubleSide }));
    if (pen) { back.position.set(L, H / 2, -D / 2); back.rotation.y = -Math.PI / 2; } else back.position.set(L / 2, H / 2, -D);
    sc.add(back);
  }
  // glass panes sit OUTSIDE the interior box; large faces nearly clear, thin edge faces tinted so thickness shows
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.06, depthWrite: false });
  const lowIron = R.glassType === 'lowiron';
  const edgeM = lowIron
    ? basic(0xa9d3da, { transparent: true, opacity: 0.75, depthWrite: false })
    : basic(0x3f8f72, { transparent: true, opacity: 0.85, depthWrite: false });
  // pane outlines: thin glass is often under a pixel thick, so its edge faces vanish; a line is always >= 1 px.
  // Light lines read on dark backgrounds, dark lines on light ones (and on clear glass over the grey stage).
  const lineCol = bg.light ? (lowIron ? 0x6f8f96 : 0x2f6f5a) : (lowIron ? 0xe2f3f6 : 0x8fd6bb);
  const edgeLine = new THREE.LineBasicMaterial({ color: lineCol, transparent: true, opacity: 0.75, depthWrite: false });
  const pane = (w: number, h: number, d: number, x: number, y: number, z: number, big: number, ro: number) => {
    const m = [edgeM, edgeM, edgeM, edgeM, edgeM, edgeM]; m[big * 2] = faceM; m[big * 2 + 1] = faceM;
    const geo = new THREE.BoxGeometry(w, h, d);
    const g = new THREE.Mesh(geo, m); g.position.set(x, y, z); g.renderOrder = ro; sc.add(g);
    const o = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLine); o.position.copy(g.position); o.renderOrder = ro + 1; sc.add(o);
  };
  pane(L + 2 * t, t, D + 2 * t, L / 2, -t / 2, -D / 2, 1, 5);
  pane(L + 2 * t, H, t, L / 2, H / 2, t / 2, 2, 6);
  pane(L + 2 * t, H, t, L / 2, H / 2, -D - t / 2, 2, 5);
  pane(t, H, D, -t / 2, H / 2, -D / 2, 0, 5); pane(t, H, D, L + t / 2, H / 2, -D / 2, 0, 5);
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, D)),
    new THREE.LineBasicMaterial({ color: R.rim ? 0x55636f : 0x7fb5a6, transparent: true, opacity: 0.35 }));
  box.position.set(L / 2, H / 2, -D / 2); sc.add(box);
  if (R.rim) {
    const rm = basic(0x1a1d21), r = t + 8, h = 20;
    for (const [w, d, x, z] of [[L + 2 * r, r, L / 2, r / 2], [L + 2 * r, r, L / 2, -D - r / 2], [r, D, -r / 2, -D / 2], [r, D, L + r / 2, -D / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rm); b.position.set(x, H - h / 2 + 2, z); sc.add(b);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rm); b2.position.set(x, -t - 2 + h / 2, z); sc.add(b2);
    }
  }
  if (R.grid) {
    const sub = (x: number, d: number) => groundHeight(S, T, x, d);
    const step = S.units === 'in' ? 2 * IN : 50, w: number[] = [], f: number[] = [];
    for (let x = step; x < L; x += step) { if (!pen) w.push(x, 0, -D + 0.5, x, H, -D + 0.5); f.push(x, sub(x, 0) + 0.5, 0, x, sub(x, D) + 0.5, -D); }
    for (let y = step; y < H; y += step) w.push(...(pen ? [L - 0.5, y, 0, L - 0.5, y, -D] : [0, y, -D + 0.5, L, y, -D + 0.5]));
    if (pen) for (let z = step; z < D; z += step) w.push(L - 0.5, 0, -z, L - 0.5, H, -z);
    for (let z = step; z < D; z += step) f.push(0, sub(0, z) + 0.5, -z, L, sub(L, z) + 0.5, -z);
    sc.add(lines(w, bg.light ? 0x000000 : 0xffffff, bg.light ? 0.12 : 0.16)); sc.add(lines(f, 0x000000, 0.14));
  }
}

/**
 * The water surface (seen from above or when orbiting; edge-on straight on) and a faint meniscus line where it meets
 * the glass. The colour of the water itself is a tint in the lighting shader (see aqWaterPath).
 */
function addWater(sc: THREE.Scene, S: Scene, T: Tank) {
  if (!S.water.on) return;
  const { L, D } = T, y = waterY(T, S.water.level), c = new THREE.Color(0xd8eef2).lerp(new THREE.Color(S.water.color), 0.25 + 0.5 * S.water.opacity);
  const surf = plane(L, D, basic(c, { transparent: true, opacity: 0.1 + 0.25 * S.water.opacity, depthWrite: false, side: THREE.DoubleSide }));
  surf.rotation.x = -Math.PI / 2; surf.position.set(L / 2, y, -D / 2); surf.renderOrder = 4; surf.userData.nolight = true; sc.add(surf);
  const e = 0.6, line = lines([e, y, -e, L - e, y, -e, L - e, y, -e, L - e, y, -D + e, L - e, y, -D + e, e, y, -D + e, e, y, -D + e, e, y, -e], 0xe8f6fa, 0.45);
  line.renderOrder = 4; sc.add(line);
}

export const STAND_FINISHES: Record<Scene['stand']['finish'], { label: string; color: number }> = {
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

/** Cabinet under the tank, same footprint as the outer glass, from the floor up to the tank's underside. */
function addStand(sc: THREE.Scene, S: Scene, T: Tank) {
  if (!S.stand.show) return;
  const { L, D } = T, t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), h = S.stand.height;
  const W = L + 2 * t, Dp = D + 2 * t, fin = STAND_FINISHES[S.stand.finish];
  if (S.stand.style === 'frame') { addFrameStand(sc, T, W, Dp, top, h, fin.color); return; }
  const body = shadedBox(W, h, Dp, fin.color); body.position.set(L / 2, top - h / 2, -D / 2); sc.add(body);
  // two cabinet doors: seams just proud of the front face, kick-plate line near the floor
  const z = t + 0.6, inset = Math.min(30, h * 0.08), y0 = top - h + Math.min(70, h * 0.12), y1 = top - inset;
  const seam = fin.color === STAND_FINISHES.white.color ? 0x9a9890 : 0x111214;
  sc.add(lines([
    -t + inset, y1, z, L + t - inset, y1, z, L + t - inset, y1, z, L + t - inset, y0, z,
    L + t - inset, y0, z, -t + inset, y0, z, -t + inset, y0, z, -t + inset, y1, z,
    L / 2, y1, z, L / 2, y0, z,
  ], seam, 0.8));
}

/** Steel tube size for the open frame stand (mm): 1.5" square tube, the common size for welded aquarium stands. */
const TUBE = 38;

/**
 * Open welded steel stand: square-tube legs at the corners, a top frame the tank sits on, a bottom frame just above
 * the floor, and extra legs (with their rails) every ~90 cm on long tanks. Nothing in between: the room shows through.
 */
function addFrameStand(sc: THREE.Scene, T: Tank, W: number, Dp: number, top: number, h: number, color: number) {
  const s = Math.min(TUBE, h / 6), x0 = T.L / 2 - W / 2 + s / 2, x1 = T.L / 2 + W / 2 - s / 2, z0 = -T.D / 2 + Dp / 2 - s / 2, z1 = -T.D / 2 - Dp / 2 + s / 2;
  const bar = (w: number, hh: number, d: number, x: number, y: number, z: number) => { const b = shadedBox(w, hh, d, color); b.position.set(x, y, z); sc.add(b); };
  const n = Math.max(1, Math.round((W - s) / 900)), xs = Array.from({ length: n + 1 }, (_, i) => x0 + (x1 - x0) * i / n);
  const foot = 12, yLow = top - h + foot + s / 2, yTop = top - s / 2;
  for (const x of xs) for (const z of [z0, z1]) bar(s, h - foot, s, x, top - (h - foot) / 2, z);  // legs (on small levelling feet)
  for (const x of xs) for (const z of [z0, z1]) bar(s * 0.7, foot, s * 0.7, x, top - h + foot / 2, z);
  for (const y of [yTop, yLow]) {
    for (const z of [z0, z1]) bar(x1 - x0 - s, s, s, (x0 + x1) / 2, y, z);                          // long rails
    for (const x of xs) bar(s, s, z0 - z1 - s, x, y, (z0 + z1) / 2);                                  // cross rails
  }
}

/** Hood height at the back (mm), above the rim top. */
export const HOOD_H = 38;

/**
 * Classic low-profile moulded hood (lights inside): sits just inside the rim, tallest at the back, curving down to a
 * rounded front, with a recessed feeding hatch. Side profile extruded along the tank length; shaded per vertex so the
 * curve reads without lights.
 */
function addHood(sc: THREE.Scene, S: Scene, T: Tank) {
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 14 });
  geo.rotateY(Math.PI / 2); geo.translate(x0, base, 0);     // local (u, y, e) -> world (x0 + e, base + y, -u)
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
  sc.add(lines([hx0, ya, -ua, hx1, ya, -ua, hx1, ya, -ua, hx1, yb, -ubh, hx1, yb, -ubh, hx0, yb, -ubh, hx0, yb, -ubh, hx0, ya, -ua], 0x45484e, 0.95));
}

/** Lid: classic black moulded hood with a hinged front flap, or two glass canopy panels on a plastic hinge strip. */
function addLid(sc: THREE.Scene, S: Scene, T: Tank) {
  if (S.lid === 'open') return;
  const { L, H, D } = T, t = glassThickness(T, S.render.glass), rim = S.render.rim;
  if (S.lid === 'hood') { addHood(sc, S, T); return; }
  // glass top: two panels split along the length, resting on the inner rim lip (rimmed) or on the panes (rimless)
  const pt = 4, y = rim ? H - RIM_H + RIM_DROP + 6 + pt / 2 : H + pt / 2, gap = 3, inset = rim ? 2 : -t;
  const lowIron = S.render.glassType === 'lowiron';
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.1, depthWrite: false });
  const edgeM = basic(lowIron ? 0xa9d3da : 0x3f8f72, { transparent: true, opacity: 0.8, depthWrite: false });
  const lineM = new THREE.LineBasicMaterial({ color: BACKGROUNDS[S.render.bg].light ? 0x2f6f5a : 0x8fd6bb, transparent: true, opacity: 0.7, depthWrite: false });
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
export const straightOnEye = (S: Scene, T: Tank) => ({ x: T.L / 2, z: S.camera.dist });
/**
 * Where the scale person stands: a fixed spot in the room, chosen from the straight-on view: beside the tank on the
 * chosen side, as far from that eye as the tank centre (equal scale when viewed straight on). If that spot is behind
 * the room wall they take the other side; if both are, they stand against the wall. They stay put while orbiting
 * (Nathan, 2026-10-08: following the view made them jump sides).
 */
export const personSpot = (S: Scene, T: Tank) => personPlacement(S, T, straightOnEye(S, T));
export function personPlacement(S: Scene, T: Tank, eye: { x: number; z: number }) {
  const t = glassThickness(T, S.render.glass), rim = S.render.rim ? t + 8 : t;
  const h = S.person.height, w = h * PERSON_ASPECT, floor = floorY(T, S.render, S.stand);
  const vx = T.L / 2 - eye.x, vz = -T.D / 2 - eye.z, r = Math.hypot(vx, vz) || 1, ux = vx / r, uz = vz / r;
  const half = (T.L / 2 + rim) * Math.abs(uz) + (T.D / 2 + rim) * Math.abs(ux); // tank half-width across the view
  const phi = Math.asin(Math.min(0.9, (half + PERSON_GAP + w / 2) / r));
  // rotate eye->tank about the eye: a positive angle swings toward screen-right
  const spot = (a: number) => ({ x: eye.x + vx * Math.cos(a) - vz * Math.sin(a), z: eye.z + vx * Math.sin(a) + vz * Math.cos(a) });
  const wb = -T.D - t - WALL_GAP, wr = T.L + t + WALL_GAP, m = w / 2 + 5;
  const blocked = (p: { x: number; z: number }) => S.wall.show && (S.wall.side === 'back' ? p.z - m < wb : p.x + m > wr);
  let side: -1 | 1 = S.person.side === 'left' ? -1 : 1, p = spot(side * phi);
  if (blocked(p)) {
    const q = spot(-side * phi);
    if (!blocked(q)) { p = q; side = side === 1 ? -1 : 1; } else p = S.wall.side === 'back' ? { ...p, z: wb + m } : { ...p, x: wr - m };
  }
  return { x: p.x, z: p.z, w, h, floor, side };
}
function addPerson(sc: THREE.Scene, S: Scene, T: Tank) {
  if (!S.person.show) return;
  const p = personSpot(S, T), g = new THREE.PlaneGeometry(p.w, p.h); g.translate(0, p.h / 2, 0);
  const m = new THREE.Mesh(g, cardMaterial('person', personTexture(), 'cutout'));
  m.position.set(p.x, p.floor, p.z); m.name = 'person'; m.userData.room = true; sc.add(m);
}

/** Plain room floor under the stand/wall, so the room doesn't float in a void. One-sided (invisible from below). */
function addFloor(sc: THREE.Scene, S: Scene, T: Tank) {
  if (!S.stand.show && !S.wall.show && !S.person.show) return;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), basic(0xb3aca1));
  f.rotation.x = -Math.PI / 2; f.position.set(T.L / 2, floorY(T, S.render, S.stand) - 0.5, -T.D / 2);
  f.userData.room = true; sc.add(f);
}

/** Room wall behind the tank or against a short end (peninsula). One-sided, so it vanishes when viewed from behind. */
function addWall(sc: THREE.Scene, S: Scene, T: Tank) {
  if (!S.wall.show) return;
  const { L, D } = T, t = glassThickness(T, S.render.glass), fy = floorY(T, S.render, S.stand);
  const ROOM_H = 2700, SPAN = 6000, SKIRT_H = 90, SKIRT_D = 14;
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, ROOM_H), basic(S.wall.color)); // normal +z, toward the tank
  wall.position.set(0, ROOM_H / 2, 0); wall.userData.room = true; g.add(wall);
  const skirt = shadedBox(SPAN, SKIRT_H, SKIRT_D, 0xf1efe9); skirt.position.set(0, SKIRT_H / 2, SKIRT_D / 2); g.add(skirt);
  if (S.wall.side === 'back') g.position.set(L / 2, fy, -D - t - WALL_GAP);
  else { g.position.set(L + t + WALL_GAP, fy, -D / 2); g.rotation.y = -Math.PI / 2; }
  sc.add(g);
}

function addSubstrate(sc: THREE.Scene, S: Scene, T: Tank) {
  const swamp = S.layout.id === 'swamp' || S.terrain.on;
  if (!S.substrate.show && !swamp) return;
  const { L, D } = T, tile = SUBSTRATES[S.substrate.type].tile * 2, h = (x: number, d: number) => groundHeight(S, T, x, d);
  // top surface as a 16x16 grid (bilinear surfaces curve along diagonals), front face and two side faces;
  // UVs from physical mm so grain size is constant
  type V3 = [number, number, number];
  const top: number[][] = [], side: number[][] = [], N = swamp ? 72 : 16, wy = waterY(T, S.water.level);
  const quad = (arr: number[][], pts: V3[], uv: (p: V3) => number[]) => { for (const i of [0, 1, 2, 0, 2, 3]) arr.push(pts[i], uv(pts[i])); };
  const P = (i: number, j: number): V3 => { const x = L * i / N, d = D * j / N; return [x, h(x, d), -d]; };
  // cheap slope shading: brightness from each cell's tilt toward a light above, front and left
  const light = new THREE.Vector3(-0.35, 1, 0.45).normalize(), topCol: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    const a = new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])), b = new THREE.Vector3(...q[3]).sub(new THREE.Vector3(...q[0]));
    const n = new THREE.Vector3().crossVectors(a, b).normalize(); if (n.y < 0) n.negate();
    const k = clamp(0.55 + 0.6 * n.dot(light), 0, 1.15) / 1.15;
    // emerged ground reads as damp soil and moss (mottled), not aquarium gravel
    const my = (q[0][1] + q[2][1]) / 2, dry = clamp((my - wy) / 12, 0, 1), mo = 0.5 + 0.5 * Math.sin(q[0][0] * 0.045 + Math.sin(q[0][2] * 0.05) * 2.4);
    const c = [k * (1 - dry * (0.42 + 0.12 * mo)), k * (1 - dry * (0.3 - 0.12 * mo)), k * (1 - dry * (0.62 + 0.05 * mo))];
    quad(top, q, p => [p[0] / tile, -p[2] / tile]); for (let v = 0; v < 6; v++) topCol.push(...c);
  }
  // front and end faces in N strips, so their top edge follows the ground (swamp banks are not straight)
  for (let i = 0; i < N; i++) {
    const x0 = L * i / N, x1 = L * (i + 1) / N, d0 = D * i / N, d1 = D * (i + 1) / N;
    quad(side, [[x0, 0, 0], [x1, 0, 0], [x1, h(x1, 0), 0], [x0, h(x0, 0), 0]], p => [p[0] / tile, p[1] / tile]);
    for (const x of [0, L]) quad(side, [[x, 0, -d1], [x, 0, -d0], [x, h(x, d0), -d0], [x, h(x, d1), -d1]], p => [-p[2] / tile, p[1] / tile]);
  }
  const mk = (arr: number[][], shade: number, cols?: number[]) => {
    const g = new THREE.BufferGeometry(); if (cols) g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 0).flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 1).flat(), 2));
    const m = new THREE.MeshBasicMaterial({ map: substrateTexture(S.substrate.type), color: shade, vertexColors: !!cols, side: THREE.DoubleSide });
    m.userData.sub = true; sc.add(new THREE.Mesh(g, m));
  };
  mk(top, 0xffffff, topCol); mk(side, 0xb4b4b4); // front/sides a touch darker so the layer reads through the glass
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
function addTerrainDots(sc: THREE.Scene, S: Scene, T: Tank, hot: number | null): THREE.Mesh[] {
  const t = S.terrain, g = (x: number, d: number) => groundHeight(S, T, x, d), dots: THREE.Mesh[] = [], pts: number[] = [];
  const r = clamp(Math.min(T.L / (t.cols - 1), T.D / (t.rows - 1)) * 0.09, 3.5, 9);
  const geo = new THREE.SphereGeometry(r, 12, 8), ring = new THREE.SphereGeometry(r * 1.45, 12, 8);
  const mat = (c: number) => basic(c, { depthTest: false, transparent: true, opacity: 0.95 });
  const fill = mat(0xffffff), hotM = mat(0xffb020), edge = mat(0x1d2a33);
  for (let j = 0; j < t.rows; j++) for (let i = 0; i < t.cols; i++) {
    const k = j * t.cols + i, p = terrainPoint(t, T, i, j), y = g(p.x, p.depth);
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

export function buildTank(S: Scene, T: Tank, selId: number | null, edit?: { hot: number | null }): BuiltTank {
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
    const w = fishTL(f, sp), h = w * sp.aspect, p = mapToTank(S.tankA, T, f);
    const m = new THREE.Mesh(cardGeometry(w, h, f.bend), cardMaterial('fish:' + f.species, fishTexture(f.species), S.render.edge));
    // bottom dwellers and animals on land rest on the ground wherever they are (their stored height is ignored)
    const y = restsOnGround(S, T, sp, p.x, p.depth, h) ? groundHeight(S, T, p.x, p.depth) + sp.rest * w - 1 : Math.min(p.y, Math.max(0, waterY(T, S.water.level) - h / 2));
    m.position.set(p.x, y, -p.depth); m.rotation.set(f.roll * D2R, f.yaw * D2R, f.pitch * D2R, 'YXZ');
    register(f, m, w, h);
  }
  addLid(sc, S, T);
  if (S.lid !== 'hood') addFixture(sc, T, S.light); // with a hood the fixture is inside it; its light still applies
  const dotMeshes = edit && S.terrain.on ? addTerrainDots(sc, S, T, edit.hot) : [];
  applyLighting(sc);
  sc.updateMatrixWorld(true);
  return { scene: sc, fishMeshes, meshById, dotMeshes };
}

/** How far a glass snail sits off the inside of the pane (mm). */
const PANE_GAP = 0.8;
/** Pane rotation about y that turns local +z (the foot side) toward that pane's glass. */
const PANE_Y = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 } as const;

/**
 * Snail cards. On the substrate: one upright side-view card. On glass: two one-sided cards back to back, the foot
 * facing the glass (what you see through that pane) and the shell facing into the tank; yaw = heading in the pane.
 */
function snailMeshes(S: Scene, T: Tank, f: Fish, sp: Species): [THREE.Mesh, number, number][] {
  const p = mapToTank(S.tankA, T, f), surf = f.surface ?? 'floor', w = fishTL(f, sp), edge = S.render.edge;
  const sub = (x: number, d: number) => groundHeight(S, T, x, d);
  if (surf === 'floor') {
    const h = w * sp.aspect, m = new THREE.Mesh(cardGeometry(w, h, 0), cardMaterial(`snail:${sp.art}:side`, snailTexture(sp.art, 'side'), edge));
    m.position.set(p.x, sub(p.x, p.depth) + sp.rest * w - 0.5, -p.depth); m.rotation.set(0, f.yaw * D2R, 0, 'YXZ');
    return [[m, w, h]];
  }
  const h = w * snailAspect(sp.art, 'foot'), x = surf === 'left' ? PANE_GAP : surf === 'right' ? T.L - PANE_GAP : p.x;
  const d = surf === 'front' ? PANE_GAP : surf === 'back' ? T.D - PANE_GAP : p.depth;
  const top = S.water.on ? waterY(T, S.water.level) : T.H; // dry: the whole pane
  const y = clamp(p.y, sub(x, d) + h / 2, Math.max(sub(x, d) + h / 2, top - w / 2));
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMaterial(`snail:${sp.art}:foot`, snailTexture(sp.art, 'foot'), edge, THREE.FrontSide));
  const sg = new THREE.PlaneGeometry(w, h).rotateY(Math.PI), uv = sg.attributes.uv; // face into the tank, texture not mirrored
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  const shell = new THREE.Mesh(sg, cardMaterial(`snail:${sp.art}:shell`, snailTexture(sp.art, 'shell'), edge, THREE.FrontSide));
  for (const m of [foot, shell]) { m.position.set(x, y, -d); m.rotation.set(0, PANE_Y[surf], f.yaw * D2R, 'YXZ'); }
  return [[foot, w, h], [shell, w, h]];
}

export function disposeScene(sc: THREE.Scene | undefined) {
  sc?.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.geometry?.userData.keep) m.geometry?.dispose();
    if (m.material) for (const mat of ([] as THREE.Material[]).concat(m.material)) if (!mat.userData.cached && !mat.userData.keep) mat.dispose();
  });
}
