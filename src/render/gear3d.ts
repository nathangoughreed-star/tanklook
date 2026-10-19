// Tech gear drawn in the tank (lane TG, Nathan 2026-10-19): filters, heaters, air, CO2, UV, flow and reef gear, built
// procedurally to the real class's size (gear-models.json: gph / watts -> body size) and placed on the back wall at one
// side, intake low and outlet high, clear of the hardscape. Everything a tank's gear is made of merges into four meshes
// (lit in-tank parts, lit room parts, clear parts, glowing indicators), so the whole set costs four draw calls.
// What is drawn: the tank's `tech` through lane TM's techParts (scene/tech.ts); a file without it, the inferred gear.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FILTER_MODELS, HEATER_MODELS, type FilterModel } from '../demand/gear';
import { techParts, type GearPlace } from '../scene/tech';
import { backdropDepth, glassThickness, tankUnderside, floorY, waterY, clamp } from '../scene/physics';
import { chord } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Tank, TankSetup } from '../scene/types';

// ---------- what is drawn ----------

/** Gear classes beyond gear-models.json's filters and heaters. */
export const EXTRA_GEAR = ['airstone', 'co2', 'uv', 'powerhead', 'wavemaker', 'skimmer', 'sump', 'ato'] as const;
export type ExtraGear = (typeof EXTRA_GEAR)[number];
/** One piece of gear: a filter or heater model id (gear-models.json) or an extra class. */
export interface GearPick {
  id: string; /** CO2 only: the drop checker's colour, when the tech model knows the level. */ co2?: 'low' | 'ok' | 'high';
  /** units (two heaters, two powerheads); absent = 1 */ n?: number;
  /** the owner's placement (TechSetup.place): the back corner it starts from and how far in from that side glass, mm */ side?: GearSide; u?: number;
}
/** Which back corner the gear sits in. */
export type GearSide = 'left' | 'right';

/** Whether a file without `tech` draws the gear the demand engine infers (true) or none (false): Nathan's call, pending. */
export const DRAW_INFERRED = true;

/** The tank's gear as picks: from lane TM's techParts (scene/tech.ts), which also fills a file without `tech` with the
 *  inferred gear (a HOB up to 60 gal, else a canister; a heater; salt: skimmer; CO2 when the plants are fed CO2). */
export function gearPicks(S: TankSetup): GearPick[] {
  if (!S.water.on || (!S.tech && !DRAW_INFERRED)) return [];
  const out: GearPick[] = [], parts = techParts(S), sump = parts.some(p => p.gear === 'sump');
  for (const p of parts) {
    const where = placeOf(S, p.place), pick = (id: string, o: Partial<GearPick> = {}) => out.push({ id, ...(p.n > 1 ? { n: p.n } : {}), ...where, ...o });
    switch (p.gear) {
      case 'filter': case 'heater': if (p.model) pick(p.model); break;
      case 'sump': pick('sump'); break;
      case 'co2kit': case 'diyco2': pick('co2'); break;
      case 'airpump': pick('airstone'); break;
      case 'uv': pick('uv'); break;
      case 'ato': pick('ato'); break;
      case 'skimmerhob': pick('skimmer'); break;
      case 'skimmer': if (!sump) pick('skimmer'); break; // a sump skimmer is drawn in the sump
      case 'powerhead': pick('powerhead'); break;
      case 'wavemaker': pick('wavemaker'); break;
      default: break; // dosing, test kits, RO/DI, the chiller: not in the tank
    }
  }
  return out;
}
/** A row's placement as a corner and a start along the back wall (side walls: that side's corner). */
function placeOf(S: TankSetup, p?: GearPlace): Pick<GearPick, 'side' | 'u'> {
  if (!p) return {};
  if (p.wall !== 'back') return { side: p.wall };
  const at = p.at ?? 0, side: GearSide = at <= 0.5 ? 'left' : 'right';
  return { side, u: Math.max(22, (side === 'left' ? at : 1 - at) * S.tank.L) };
}

// ---------- show / hide (Viewer "Show equipment") ----------

const SHOW_KEY = 'tanklook-show-gear';
let shown = true;
try { shown = localStorage.getItem(SHOW_KEY) !== '0'; } catch { /* private window */ }
let live: THREE.Object3D[] = [];
export const gearShown = () => shown;
/** Show or hide every built tank's gear in place (no rebuild); remembered in this browser. */
export function setGearShown(on: boolean) {
  shown = on;
  try { localStorage.setItem(SHOW_KEY, on ? '1' : '0'); } catch { /* private window */ }
  live = live.filter(o => o.parent);
  for (const o of live) o.visible = on;
}

// ---------- materials (shared, never disposed) ----------

const keep = <M extends THREE.Material>(m: M) => { m.userData.keep = true; return m; };
const WET = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
const ROOM = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
const GLOW = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
/** Clear parts (glass, acrylic, tubing, bubbles, falling water): nearly clear face-on, brighter and more opaque edge-on, like real glass. */
const CLEAR = keep(new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: true,
  vertexShader: `attribute float aBase; varying vec3 vC; varying float vB; varying vec3 vN; varying vec3 vV;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; vC = color; vB = aBase; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `varying vec3 vC; varying float vB; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float a = clamp(vB + (0.62 - 0.4 * vB) * f, 0.0, 1.0);
  gl_FragColor = vec4(mix(vC, vec3(1.0), 0.45 * f * (1.0 - vB)), a);
  #include <colorspace_fragment>
}`,
}));

type Bucket = 'wet' | 'room' | 'clear' | 'glow';
const UP = new THREE.Vector3(0, 1, 0);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Collects a set of gear's parts, each in its bucket, and merges each bucket into one mesh. */
class Kit {
  parts: Record<Bucket, THREE.BufferGeometry[]> = { wet: [], room: [], clear: [], glow: [] };
  /** Add `geo` (consumed) in colour `color` (clear parts: `base` = face-on opacity), moved by `m`. */
  put(b: Bucket, geo: THREE.BufferGeometry, color: number, m?: THREE.Matrix4, base = 0.06, shade = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose();
    g.deleteAttribute('uv'); g.deleteAttribute('uv1'); g.deleteAttribute('uv2');
    if (!g.attributes.normal) g.computeVertexNormals();
    if (m) g.applyMatrix4(m);
    const n = g.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3), nor = g.attributes.normal;
    for (let i = 0; i < n; i++) {
      // room parts: shaded per face like the furniture (top bright, underside dark); `shade` = fine colour noise (sponge, stone)
      let k = 1;
      if (b === 'room') { const ny = nor.getY(i), nz = nor.getZ(i); k = ny > 0.5 ? 1.08 : ny < -0.5 ? 0.5 : 0.78 + nz * (nz > 0 ? 0.17 : 0.08); }
      if (shade) k *= 1 - shade + 2 * shade * hash(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
      col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (b === 'clear') g.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(n).fill(base), 1));
    this.parts[b].push(g);
  }
  /** A cylinder of radius r (r2 at b) from a to b. */
  rod(bk: Bucket, a: THREE.Vector3, b: THREE.Vector3, r: number, color: number, o: { r2?: number; seg?: number; open?: boolean; base?: number; shade?: number } = {}) {
    const d = b.clone().sub(a), len = d.length(); if (len < 1e-3) return;
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, len, o.seg ?? 16, 1, o.open ?? false);
    this.put(bk, g, color, along(a, d.normalize(), len / 2), o.base, o.shade);
  }
  /** A tube of radius r along the points (a smooth curve through them). */
  tube(bk: Bucket, pts: THREE.Vector3[], r: number, color: number, base = 0.06, seg = 10) {
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), n = Math.max(8, Math.round(c.getLength() / 8));
    this.put(bk, new THREE.TubeGeometry(c, n, r, seg, false), color, undefined, base);
  }
  box(bk: Bucket, c: THREE.Vector3, w: number, h: number, d: number, color: number, r = 0, yaw = 0) {
    const g = r > 0 ? roundedBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
    this.put(bk, g, color, new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1)));
  }
  ball(bk: Bucket, c: THREE.Vector3, r: number, color: number, base = 0.06, detail = 1) {
    this.put(bk, new THREE.IcosahedronGeometry(r, detail), color, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z), base);
  }
  /** A lathe profile [radius, height] turned round axis `dir` from `at`. */
  lathe(bk: Bucket, prof: [number, number][], at: THREE.Vector3, dir: THREE.Vector3, color: number, base = 0.06, seg = 24) {
    this.put(bk, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg), color, along(at, dir, 0), base);
  }
  meshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    const mats: Record<Bucket, THREE.Material> = { wet: WET, room: ROOM, clear: CLEAR, glow: GLOW };
    for (const k of ['wet', 'room', 'glow', 'clear'] as Bucket[]) {
      const ps = this.parts[k]; if (!ps.length) continue;
      const g = mergeGeometries(ps); for (const p of ps) p.dispose();
      if (!g) continue;
      const m = new THREE.Mesh(g, mats[k]);
      m.userData.gear = true;
      if (k === 'room') m.userData.room = true;
      if (k === 'glow' || k === 'clear') m.userData.nolight = true;
      if (k === 'clear') m.renderOrder = 3.5; // after the water volume, before the water surface and the panes
      out.push(m);
    }
    return out;
  }
}

/** A matrix taking +Y to `dir`, then the origin to a + dir * shift. */
function along(a: THREE.Vector3, dir: THREE.Vector3, shift: number) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return new THREE.Matrix4().compose(a.clone().addScaledVector(dir.clone().normalize(), shift), q, new THREE.Vector3(1, 1, 1));
}
const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
/** A box with rounded vertical edges and a small chamfer top and bottom (moulded plastic). */
function roundedBox(w: number, h: number, d: number, r: number) {
  // the bevel grows the outline by its size: draw the outline that much smaller, so the box is w x h x d
  const bev = Math.min(r * 0.5, h * 0.1), bs = bev * 0.8; w -= 2 * bs; d -= 2 * bs;
  r = Math.max(0.5, Math.min(r - bs, w / 2 - 0.1, d / 2 - 0.1));
  const s = new THREE.Shape(), x = w / 2 - r, z = d / 2 - r;
  s.moveTo(-x, -d / 2); s.lineTo(x, -d / 2); s.absarc(x, -z, r, -Math.PI / 2, 0, false); s.lineTo(w / 2, z); s.absarc(x, z, r, 0, Math.PI / 2, false);
  s.lineTo(-x, d / 2); s.absarc(-x, z, r, Math.PI / 2, Math.PI, false); s.lineTo(-w / 2, -z); s.absarc(-x, -z, r, Math.PI, 1.5 * Math.PI, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bs, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, -(h - 2 * bev) / 2, 0); // extrude along +y, centred
  return g;
}

// ---------- colours ----------
const C = {
  black: 0x1b1d20, charcoal: 0x2a2d31, grey: 0x4a4f55, lightGrey: 0x9ba1a7, white: 0xe6e6e1, hose: 0x55665c, sponge: 0x2c3033,
  glass: 0xd8eef0, airline: 0xdfe9ea, cup: 0xe4eef0, copper: 0x6f4a2c, ceramic: 0xc4beb2, stone: 0x8e959b, brass: 0xb59448,
  water: 0xf2fbff, skimmate: 0x5c4220, amber: 0xff8a2a, uvBlue: 0x6fa8ff, locline: 0x203a5c, gauge: 0xf0eee6, red: 0xb83a2e,
};
export const DROP_COLOURS = { low: 0x3a6fd0, ok: 0x41b441, high: 0xd9c93a } as const;

// ---------- the frame the gear is placed in ----------

/** A heater's glass length (mm) by its rating: about what the common brands' tubes measure. */
export function heaterLength(watts: number) {
  const t: [number, number][] = [[25, 160], [50, 220], [100, 275], [200, 310], [300, 340], [500, 420]];
  for (let i = 1; i < t.length; i++) if (watts <= t[i][0]) { const [w0, l0] = t[i - 1], [w1, l1] = t[i]; return l0 + (l1 - l0) * clamp((watts - w0) / (w1 - w0), 0, 1); }
  return t[t.length - 1][1];
}
/** Size factor of a filter body against its class's reference flow (cube root: body volume ~ flow). */
const flowScale = (m: FilterModel, ref: number) => Math.cbrt(m.gph / ref);

interface Frame {
  S: TankSetup; T: Tank; kit: Kit; side: GearSide; ix: number;
  /** Water line, tank top (inner glass top), glass thickness, stand top, room floor. */
  wy: number; H: number; t: number; top: number; floor: number;
  /** World point at u mm in from the gear side's glass, height y, b mm forward of the back glass's inner face (b < 0: behind it). */
  P(u: number, y: number, b: number): THREE.Vector3;
  /** The ground height there. */
  ground(u: number, b: number): number;
  /** u clear of the hardscape for a part `w` wide spanning heights y0..y1 and b0..b1 off the back glass, searching inward from u0. */
  slot(u0: number, w: number, y0: number, y1: number, b0: number, b1: number): number;
  /** Ranges of u taken by gear on the back wall so far. */
  taken: [number, number][];
}

function frame(S: TankSetup, T: Tank, kit: Kit, side: GearSide, solids: THREE.Box3[]): Frame {
  const ix = side === 'left' ? 1 : -1, bd = backdropDepth(S.backdrop, T), t = glassThickness(T, S.render.glass);
  const xOf = (u: number) => side === 'left' ? u : T.L - u;
  const backD = (x: number) => (chord(T, 0, clamp(x, 1, T.L - 1))?.[1] ?? T.D) - bd;
  const P = (u: number, y: number, b: number) => { const x = xOf(u); return V(x, y, -(backD(x) - b)); };
  const f: Frame = {
    S, T, kit, side, ix, wy: waterY(T, S.water.level), H: T.H, t, top: tankUnderside(T, S.render), floor: floorY(T, S.render, S.stand),
    P, ground: (u, b) => { const x = xOf(u); return groundHeight(S, T, x, backD(x) - b); },
    taken: [],
    slot(u0, w, y0, y1, b0, b1) {
      const lim = T.L - 30 - w / 2;
      for (let u = u0; u <= lim; u += 10) {
        const a = P(u - w / 2, y0, b0), c = P(u + w / 2, y1, b1);
        const box = new THREE.Box3(a.clone().min(c), a.clone().max(c)).expandByScalar(4);
        if (!solids.some(s => s.intersectsBox(box)) && !f.taken.some(([p, q]) => u + w / 2 > p && u - w / 2 < q)) { f.taken.push([u - w / 2, u + w / 2]); return u; }
      }
      f.taken.push([u0 - w / 2, u0 + w / 2]); return u0; // nowhere clear: where it wanted to be
    },
  };
  return f;
}

/** The back corner away from the scape's weight (its hardscape's centre of volume), else left. */
export function gearSide(T: Tank, solids: THREE.Box3[]): GearSide {
  let m = 0, mx = 0;
  for (const b of solids) { const s = b.getSize(new THREE.Vector3()), v = s.x * s.y * s.z; m += v; mx += v * (b.min.x + b.max.x) / 2; }
  if (!m) return 'left';
  const c = mx / m / T.L;
  return c < 0.45 ? 'right' : 'left';
}

// ---------- models ----------

/** Suction cup on the back glass at p (a clear dome, its stem forward to the part it holds at b = reach). */
function sucker(f: Frame, u: number, y: number, reach: number) {
  const { kit } = f;
  kit.lathe('clear', [[0, 0], [9, 0], [8.5, 1.5], [5, 4], [2.2, 6], [0, 6.5]], f.P(u, y, 0.2), V(0, 0, 1), C.cup, 0.32, 20);
  kit.rod('wet', f.P(u, y, 6), f.P(u, y, reach), 1.8, C.cup);
}

/** Thin clear airline (or CO2 line) along the points. */
const line = (f: Frame, pts: THREE.Vector3[], color = C.airline) => f.kit.tube('clear', pts, 2.4, color, 0.18, 8);

/** A route from a point inside the tank up the back glass, over the rim, down the outside to y = yEnd at b = bOut (< 0). */
function overRim(f: Frame, u: number, from: THREE.Vector3, bIn: number, yEnd: number, bOut = -f.t - 12) {
  const rimY = f.H + 18;
  return [from, f.P(u, Math.max(from.y + 1, f.wy + 20), bIn), f.P(u, rimY - 6, bIn), f.P(u, rimY + 4, (bIn - f.t) / 2), f.P(u, rimY - 6, bOut), f.P(u, Math.min(yEnd + 40, rimY - 60), bOut), f.P(u, yEnd, bOut)];
}

function heater(f: Frame, watts: number, u0: number) {
  const { kit } = f, len = heaterLength(watts), r = watts >= 500 ? 14 : 11, b = r + 9;
  const g0 = Math.max(f.ground(u0, b), 0) + 25, room = f.wy - 15 - g0;
  // vertical when it fits under the water line, else leaning at 45 degrees (how a long heater goes in a shallow tank)
  const tilt = len + 44 > room ? Math.max(0.35, Math.acos(clamp(room / (len + 44), 0, 1))) : 0, span = tilt ? len * Math.sin(tilt) : 0;
  const u = f.slot(u0 + span / 2, 2 * r + 6 + span, g0, f.wy, 0, 2 * r + 12);
  const topY = f.wy - 15 - 44 * Math.cos(tilt), dir = V(-f.ix * Math.sin(tilt), Math.cos(tilt), 0); // leaning back toward the corner at the top
  const top = f.P(u - span / 2, topY, b), bot = top.clone().addScaledVector(dir, -len);
  kit.rod('clear', bot, top, r, C.glass, { seg: 20, base: 0.07 });
  // the ceramic core with its element wound round it, inside the glass
  const c0 = bot.clone().addScaledVector(dir, len * 0.12), c1 = top.clone().addScaledVector(dir, -len * 0.1);
  kit.rod('wet', c0, c1, r * 0.6, C.ceramic, { seg: 12 });
  const turns = Math.round((len * 0.7) / 6), cl = c1.distanceTo(c0), coil: THREE.Vector3[] = [], q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  for (let i = 0; i <= turns * 8; i++) { const a = (i / 8) * Math.PI * 2, h = (i / (turns * 8)) * cl; coil.push(V(Math.cos(a) * r * 0.66, h, Math.sin(a) * r * 0.66).applyQuaternion(q).add(c0)); }
  kit.put('wet', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), turns * 8, 0.45, 4, false), C.copper);
  // black cap with the dial, the rounded foot, the amber pilot light
  kit.rod('wet', top, top.clone().addScaledVector(dir, 36), r + 2, C.black, { seg: 20 });
  kit.rod('wet', top.clone().addScaledVector(dir, 36), top.clone().addScaledVector(dir, 44), r - 1, C.charcoal, { seg: 20 });
  kit.ball('wet', bot.clone().addScaledVector(dir, 2), r * 0.98, C.black, 0, 1);
  kit.ball('glow', top.clone().addScaledVector(dir, 22).add(V(0, 0, r + 1.5)), 2.2, C.amber);
  // the cord up out of the water and over the rim, and two clips with suction cups
  const capTop = top.clone().addScaledVector(dir, 44);
  kit.tube('room', overRim(f, u, capTop, b, f.top + 20), 2.6, C.black, 0, 6);
  for (const k of [0.25, 0.72]) {
    const p = bot.clone().lerp(top, k);
    kit.put('wet', new THREE.TorusGeometry(r + 1.6, 1.6, 6, 20), C.black, along(p, dir, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    const pu = u + (p.x - f.P(u, 0, 0).x) * f.ix;
    sucker(f, pu, p.y, b - r - 1);
  }
}

function hob(f: Frame, m: FilterModel, u0: number) {
  const { kit, t } = f, s = flowScale(m, 100), W = 150 * s, D = 105 * s, Hb = 170 * s, yTop = f.H + 28;
  const it = 8 * Math.sqrt(s), stY = f.ground(u0, 26) + 45; // intake tube radius; the strainer's foot clears the ground
  const uI = f.slot(u0 + 12, 30, stY, f.wy, 0, 50), u = uI - 12 + W / 2; // only the intake takes wall room: the body is outside
  // the body behind the back glass, its lid and the motor housing
  const bc = f.P(u, yTop - Hb / 2, -t - 6 - D / 2);
  kit.box('room', bc, W, Hb, D, C.charcoal, 10, 0);
  kit.box('room', f.P(u, yTop + 4, -t - 6 - D / 2), W, 8, D, C.grey, 6);
  kit.box('room', f.P(u - W * 0.22, yTop - Hb - 18, -t - 4 - D * 0.35), 46 * s, 36, 46 * s, C.black, 8); // motor under the box
  // hanger over the glass and the spillway lip into the tank, with the sheet of water falling off it
  kit.box('wet', f.P(u + W * 0.08, f.H + 14, (24 - t) / 2), W * 0.8, 6, 24 + t + 8, C.charcoal, 2);
  const lipB = 30 * s, lipY = f.H + 10, uL = u + W * 0.08;
  kit.box('wet', f.P(uL, lipY, lipB / 2), W * 0.7, 4, lipB, C.charcoal, 1.5);
  const sheet: THREE.Vector3[] = [], n = 8, drop = lipY - f.wy;
  for (let i = 0; i <= n; i++) { const k = i / n; sheet.push(new THREE.Vector3(0, -drop * k, lipB + 10 * Math.sqrt(k) * s)); }
  const sg = new THREE.BufferGeometry(), pos: number[] = [], w2 = W * 0.33;
  for (let i = 0; i < n; i++) for (const [a, c] of [[sheet[i], sheet[i + 1]]]) {
    const p0 = f.P(uL - w2, lipY, 0), p1 = f.P(uL + w2, lipY, 0);
    const q = (p: THREE.Vector3, v: THREE.Vector3) => [p.x, p.y + v.y, p.z + v.z];
    pos.push(...q(p0, a), ...q(p1, a), ...q(p1, c), ...q(p0, a), ...q(p1, c), ...q(p0, c));
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.computeVertexNormals();
  kit.put('clear', sg, C.water, undefined, 0.2);
  // the flow's ripples on the surface where the sheet lands
  for (const [k, w] of [[1, 0.9], [1.7, 0.7], [2.5, 0.5]]) {
    const ring = new THREE.RingGeometry(W * 0.36 * k, W * 0.36 * k + 1.6, 40, 1, 0, Math.PI);
    ring.rotateX(-Math.PI / 2); ring.scale(1, 1, 0.45);
    kit.put('clear', ring, C.water, new THREE.Matrix4().makeTranslation(f.P(uL, 0, 0).x, f.wy + 0.6, f.P(0, 0, lipB + 10).z), 0.18 * w);
  }
  // intake: a smoky tube from the box over the glass and down, its slotted strainer at the foot
  const ib = 22;
  kit.tube('wet', [f.P(uI, yTop - 30, -t - 30), f.P(uI, f.H + 16, -t - 12), f.P(uI, f.H + 16, ib * 0.5), f.P(uI, f.H - 8, ib), f.P(uI, stY + 90, ib)], it, C.grey, 0, 12);
  kit.rod('wet', f.P(uI, stY + 90, ib), f.P(uI, stY + 70, ib), it, C.grey, { r2: it + 3 });
  strainer(f, f.P(uI, stY, ib), 70 * Math.sqrt(s), it + 4);
  f.kit.rod('wet', f.P(uI, stY - 2, ib), f.P(uI, stY, ib), it + 4, C.black, { seg: 16 });
  void D;
}

/** A slotted intake strainer standing at p (its foot), height h, radius r: dark bars round a darker core. */
function strainer(f: Frame, p: THREE.Vector3, h: number, r: number) {
  const { kit } = f;
  kit.rod('wet', p, p.clone().add(V(0, h, 0)), r * 0.72, 0x0e0f10, { seg: 16 });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, o = V(Math.cos(a) * r * 0.86, 0, Math.sin(a) * r * 0.86);
    kit.box('wet', p.clone().add(o).add(V(0, h / 2, 0)), 2.4, h, 3, C.grey, 0, -a);
  }
  kit.rod('wet', p.clone().add(V(0, h - 3, 0)), p.clone().add(V(0, h, 0)), r, C.grey, { seg: 18 });
}

function sponge(f: Frame, m: FilterModel, u0: number) {
  const { kit } = f, s = flowScale(m, 40), r = 34 * s, h = 110 * s, b = r + 8;
  const u = f.slot(u0 + r, 2 * r + 8, 0, h + 40, 0, 2 * r + 12), g = f.ground(u, b) - 6;
  // weighted base, the sponge (a soft, porous column), its cap and the lift tube
  kit.rod('wet', f.P(u, g, b), f.P(u, g + 14, b), r + 5, C.charcoal, { seg: 28 });
  const sg = new THREE.CylinderGeometry(r, r, h, 36, 18);
  const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr > r * 0.9) { const k = 1 + 0.05 * (hash(x, y, z) - 0.5) - 0.02 * (Math.abs(y) / (h / 2)) ** 4; p.setX(i, x * k); p.setZ(i, z * k); } }
  sg.computeVertexNormals();
  kit.put('wet', sg, C.sponge, new THREE.Matrix4().makeTranslation(f.P(u, 0, b).x, g + 14 + h / 2, f.P(u, 0, b).z), 0, 0.22);
  kit.rod('wet', f.P(u, g + 14 + h, b), f.P(u, g + 22 + h, b), r * 0.92, C.grey, { seg: 28 });
  const tt = Math.max(g + 22 + h + 30, f.wy - 25);
  kit.rod('wet', f.P(u, g + 22 + h, b), f.P(u, tt, b), 9 * Math.sqrt(s), C.grey, { seg: 14 });
  kit.rod('wet', f.P(u, tt, b), f.P(u, tt + 6, b), 11 * Math.sqrt(s), C.charcoal, { seg: 14 });
  bubbles(f, f.P(u, tt + 4, b), f.wy, 6, 2.2);
  airPump(f, u, f.P(u, tt + 6, b), b);
}

function internal(f: Frame, m: FilterModel, u0: number) {
  const { kit } = f, s = flowScale(m, 80), w = 62 * s, d = 50 * s, h = 150 * s, b = d / 2 + 9;
  const yT = f.wy - 22, yB = yT - h, u = f.slot(u0 + w / 2, w + 6, yB, yT, 0, d + 12);
  kit.box('wet', f.P(u, yB + h / 2, b), w, h, d, C.charcoal, 6);
  // intake slots round the bottom third, the head with its outlet nozzle, two suction cups
  for (let i = 0; i < 6; i++) kit.box('wet', f.P(u, yB + 10 + i * 7, b + d / 2 + 0.2), w * 0.72, 2.2, 1, 0x0b0c0d);
  kit.box('wet', f.P(u, yT - 14, b), w + 3, 28, d + 3, C.black, 6);
  kit.rod('wet', f.P(u, yT - 14, b + d / 2), f.P(u, yT - 14, b + d / 2 + 22), 7, C.black, { r2: 9 });
  for (const k of [-0.25, 0.25]) sucker(f, u + k * w, yB + h * 0.55, 9);
  kit.tube('room', overRim(f, u + w * 0.3, f.P(u + w * 0.3, yT, b), b, f.top + 20), 2.6, C.black, 0, 6);
}

function canister(f: Frame, m: FilterModel, u0: number) {
  const { kit, t } = f, s = flowScale(m, 265), pr = 7.5, gap = clamp(f.T.L * 0.18, 110, 320);
  const stY = f.ground(u0, 22) + 40;
  const uI = f.slot(u0 + 10, 30, stY, f.wy, 0, 40);
  const uO = f.slot(uI + gap, 70, f.wy - 90, f.wy, 0, 70);
  const ib = 18, outB = -t - 16, hoseY = f.H - 30;
  // intake lily pipe: glass, over the rim, straight down to its slotted basket
  const intake = [f.P(uI, hoseY, outB), f.P(uI, f.H + 10, outB + 2), f.P(uI, f.H + 26, (ib - t) / 2), f.P(uI, f.H + 6, ib), f.P(uI, stY + 80, ib)];
  kit.tube('clear', intake, pr, C.glass, 0.13, 14);
  kit.rod('clear', f.P(uI, stY, ib), f.P(uI, stY + 80, ib), pr + 4, C.glass, { base: 0.14, seg: 18 });
  for (let i = 0; i < 9; i++) kit.box('wet', f.P(uI, stY + 14 + i * 6, ib + pr + 4), 8, 1.2, 0.6, 0x9fb2b4); // the slits, catching the light
  // outlet lily pipe: over the rim, down under the surface, turning forward into the flared lily
  const oy = f.wy - 55;
  const out = [f.P(uO, hoseY, outB), f.P(uO, f.H + 10, outB + 2), f.P(uO, f.H + 26, (ib - t) / 2), f.P(uO, f.H + 6, ib), f.P(uO, oy + 30, ib), f.P(uO, oy + 4, ib + 8), f.P(uO, oy, ib + 30)];
  kit.tube('clear', out, pr, C.glass, 0.13, 14);
  kit.lathe('clear', [[pr, 0], [pr + 1, 6], [pr + 5, 14], [pr + 13, 20], [pr + 15, 21]], f.P(uO, oy, ib + 29), V(0, 0, 1), C.glass, 0.15, 28);
  // hoses down the back, into the stand and the canister in it
  const standY = f.S.stand.show ? f.top : f.floor;
  for (const [uu, p] of [[uI, intake[0]], [uO, out[0]]] as [number, THREE.Vector3][]) {
    kit.rod('room', p, p.clone().add(V(0, -40, 0)), pr + 4, C.charcoal, { seg: 12 }); // the hose clamp / connector
    kit.tube('room', [p.clone().add(V(0, -40, 0)), f.P(uu, (standY + p.y) / 2, outB - 6), f.P(uu, standY + 30, outB - 10), f.P(uu, standY - 30, outB - 10 + (f.S.stand.show ? 60 : -20))], 10, C.hose, 0, 10);
  }
  if (f.S.stand.show) {
    const r = 95 * s, ch = 380 * s, cu = clamp(f.T.L * 0.25, r + 20, f.T.L - r - 20), cb = f.T.D * 0.45;
    const c0 = f.P(cu, f.floor, cb);
    kit.rod('room', c0, c0.clone().add(V(0, ch * 0.78, 0)), r, C.charcoal, { seg: 32 });
    kit.rod('room', c0.clone().add(V(0, ch * 0.78, 0)), c0.clone().add(V(0, ch, 0)), r * 0.96, C.grey, { seg: 32, r2: r * 0.8 });
    for (const k of [-1, 1]) kit.box('room', c0.clone().add(V(k * r * 0.95, ch * 0.8, 0)), 16, 34, 30, C.black, 4); // the clips
    kit.rod('room', c0.clone().add(V(0, ch, 0)), c0.clone().add(V(0, ch + 45, 0)), 18, C.black, { seg: 16 }); // valve block
    for (const k of [-1, 1]) kit.tube('room', [c0.clone().add(V(k * 12, ch + 40, 0)), c0.clone().add(V(k * 20, ch + 120, -cb * 0.4)), f.P(k < 0 ? uI : uO, f.top - 40, -40)], 10, C.hose, 0, 10);
  }
}

function sump(f: Frame, u0: number) {
  const { kit, t } = f;
  // overflow box hung on the back glass (inside box with a comb, a U-tube over the rim to the outside box), drain down
  const w = 130, d = 70, h = 150, yT = f.H - 6, u = f.slot(u0 + w / 2, w + 8, yT - h, yT, 0, d + 8);
  kit.box('wet', f.P(u, yT - h / 2, d / 2 + 2), w, h, d, C.black, 4);
  for (let i = 0; i < 12; i++) kit.box('wet', f.P(u - w / 2 + 8 + i * (w - 16) / 11, f.wy - 6, d + 2.4), 3.2, 22, 1, 0x070808);
  kit.tube('clear', [f.P(u, f.wy - 40, d / 2), f.P(u, f.H + 40, d / 2), f.P(u, f.H + 60, -t / 2), f.P(u, f.H + 40, -t - 40), f.P(u, f.H - 40, -t - 40)], 12, C.glass, 0.1, 14);
  kit.box('room', f.P(u, f.H - 70, -t - 40), w * 0.8, 140, 70, C.black, 4);
  const standY = f.S.stand.show ? f.top : f.floor;
  kit.tube('room', [f.P(u, f.H - 140, -t - 40), f.P(u, standY + 40, -t - 50), f.P(u, standY - 30, -t + 30)], 14, C.charcoal, 0, 10);
  // return: a rigid line up the back and over the rim, loc-line beads curving forward, a flared nozzle
  const uR = f.slot(u + w / 2 + 120, 40, f.wy - 100, f.H, 0, 50), rr = 10;
  kit.tube('room', [f.P(uR, standY - 30, -t + 30), f.P(uR, standY + 40, -t - 22), f.P(uR, f.H + 10, -t - 22)], rr, C.black, 0, 10);
  kit.tube('wet', [f.P(uR, f.H + 10, -t - 22), f.P(uR, f.H + 34, -t / 2), f.P(uR, f.H + 10, 16), f.P(uR, f.wy - 30, 16)], rr, C.black, 0, 10);
  let p = f.P(uR, f.wy - 30, 16), dir = V(0, -1, 0);
  for (let i = 0; i < 4; i++) {
    const nd = dir.clone().lerp(V(0, -0.35, 1), 0.35).normalize(), q = p.clone().addScaledVector(nd, 14);
    kit.ball('wet', p.clone().addScaledVector(nd, 7), 10.5, C.locline, 0, 2); kit.rod('wet', p, q, 7.5, C.locline, { seg: 14 });
    p = q; dir = nd;
  }
  kit.lathe('wet', [[7, 0], [7.5, 10], [10, 22], [12, 24]], p, dir, C.locline, 0, 20);
  // the sump in the stand: a glass box of water, its skimmer and return pump
  if (f.S.stand.show) {
    const sw = Math.min(f.T.L * 0.7, 750), sd = f.T.D * 0.6, sh = Math.min(330, (f.top - f.floor) * 0.55), cu = f.T.L / 2, cb = f.T.D * 0.45, c = f.P(cu, f.floor + 30 + sh / 2, cb);
    const sx = f.P(cu, 0, 0).x;
    kit.box('clear', c, sw, sh, sd, C.glass); kit.parts.clear[kit.parts.clear.length - 1].getAttribute('aBase').array.fill(0.1);
    kit.box('clear', c.clone().add(V(0, -sh * 0.1, 0)), sw - 8, sh * 0.78, sd - 8, 0xcfe7ec);
    kit.rod('room', V(sx - sw * 0.28, f.floor + 30, c.z), V(sx - sw * 0.28, f.floor + 30 + sh * 1.15, c.z), 48, C.black, { seg: 24 });
    kit.rod('clear', V(sx - sw * 0.28, f.floor + 30 + sh * 1.15, c.z), V(sx - sw * 0.28, f.floor + 60 + sh * 1.15, c.z), 44, C.cup, { base: 0.35 });
    kit.box('room', V(sx + sw * 0.32, f.floor + 70, c.z), 80, 70, 70, C.black, 10);
  }
}

function skimmerHob(f: Frame, u0: number) {
  const { kit, t } = f, W = 120, D = 110, Hb = 300, yTop = f.H + 60;
  const u = f.slot(u0 + 40, 80, f.wy - 140, f.H, 0, 70);
  // the reaction body behind the glass, its collection cup on top (skimmate in the bottom), the intake box inside
  kit.box('room', f.P(u, yTop - Hb / 2, -t - 6 - D / 2), W, Hb, D, C.black, 12);
  const cc = f.P(u, yTop, -t - 6 - D / 2);
  kit.rod('clear', cc, cc.clone().add(V(0, 110, 0)), 44, C.cup, { base: 0.18, seg: 28 });
  kit.rod('clear', cc.clone().add(V(0, 2, 0)), cc.clone().add(V(0, 12, 0)), 42, C.skimmate, { base: 0.55, seg: 28 }); // a thin layer of skimmate
  kit.rod('room', cc.clone().add(V(0, 110, 0)), cc.clone().add(V(0, 118, 0)), 46, C.black, { seg: 28 });
  kit.rod('clear', cc, cc.clone().add(V(0, 80, 0)), 14, C.cup, { base: 0.25, seg: 16 }); // the neck rising through the cup
  kit.box('wet', f.P(u, f.H + 10, (30 - t) / 2), 80, 8, 30 + t + 6, C.black, 2);
  kit.box('wet', f.P(u, f.wy - 60, 22), 70, 140, 40, C.black, 6);
  for (let i = 0; i < 7; i++) kit.box('wet', f.P(u, f.wy - 110 + i * 9, 42.3), 52, 3, 1, 0x070808);
}

function airPump(f: Frame, u: number, to: THREE.Vector3, bIn: number) {
  const { kit, t } = f, pu = -60, pb = 50;
  // on the floor at the back corner, beside the tank (a check valve on its line)
  const xs = f.side === 'left' ? -f.t - 90 : f.T.L + f.t + 90, z = f.P(0, 0, 0).z + pb;
  const pc = V(xs, f.floor + 30, z);
  kit.box('room', pc, 130, 60, 75, C.charcoal, 14, Math.PI / 2);
  for (const k of [-1, 1]) for (const j of [-1, 1]) kit.box('room', pc.clone().add(V(j * 26, -32, k * 50)), 14, 4, 14, C.black, 4);
  const nip = pc.clone().add(V(0, 30, -38));
  kit.rod('room', nip, nip.clone().add(V(0, 6, 0)), 3, C.grey);
  const route = overRim(f, u, to, bIn, f.H - 80, -t - 10);
  const last = route[route.length - 1];
  line(f, [...route, last.clone().add(V(0, -80, -10)), V(xs, f.floor + 80, z - 40), nip.clone().add(V(0, 6, 0))]);
  const cv = route[5]; kit.rod('room', cv.clone().add(V(0, -14, 0)), cv.clone().add(V(0, 14, 0)), 5, C.lightGrey); // check valve
  void pu;
}

function airstone(f: Frame, u0: number) {
  const { kit } = f, b = 26, u = f.slot(u0 + 20, 44, 0, 40, 0, 52), g = f.ground(u, b);
  kit.put('wet', new THREE.CylinderGeometry(12, 12, 38, 18, 4), C.stone, along(f.P(u, g + 10, b), V(f.ix, 0, 0.3).normalize(), 0), 0, 0.3);
  bubbles(f, f.P(u, g + 22, b), f.wy, 26, 3);
  airPump(f, u, f.P(u, g + 14, b), b);
}

/** A rising column of bubbles from p to the surface: `n` per 100 mm, up to radius rmax, wandering a little as they rise. */
function bubbles(f: Frame, p: THREE.Vector3, top: number, n: number, rmax: number) {
  const k = Math.max(1, Math.round(((top - p.y) / 100) * n));
  for (let i = 0; i < k; i++) {
    const y = p.y + ((i + hash(i, 1, 2) * 0.6) / k) * (top - p.y - 3), sway = 1 + (y - p.y) / 60;
    const r = rmax * (0.45 + 0.55 * hash(i, 3, 4)) * (0.8 + 0.25 * (y - p.y) / (top - p.y + 1));
    f.kit.ball('clear', V(p.x + (hash(i, 5, 6) - 0.5) * 2 * sway, y, p.z + (hash(i, 7, 8) - 0.5) * 2 * sway), r, C.water, 0.04, 1);
  }
}

function co2(f: Frame, u0: number, outlet: number, level: GearPick['co2']) {
  const { kit, t } = f, b = 26, g0 = f.ground(u0, b);
  // diffuser low under the filter's outlet: a glass cup round a white ceramic disc, on a glass stem with a suction cup
  const u = f.slot(outlet, 40, g0 + 40, g0 + 120, 0, 50), y = g0 + 80;
  const c = f.P(u, y, b);
  kit.rod('clear', c.clone().add(V(0, -8, 0)), c.clone().add(V(0, 10, 0)), 15, C.glass, { base: 0.1, seg: 24 });
  kit.rod('wet', c.clone().add(V(0, 6, 0)), c.clone().add(V(0, 8, 0)), 13, C.white, { seg: 24 });
  kit.tube('clear', [c.clone().add(V(0, -8, 0)), c.clone().add(V(0, -18, 0)), f.P(u, y - 18, 8), f.P(u, y + 30, 6)], 3, C.glass, 0.12, 8);
  sucker(f, u, y + 10, 4);
  // the fine mist rising from the disc toward the outlet's flow
  for (let i = 0; i < 60; i++) {
    const h = hash(i, 9, 1) ** 1.6 * (f.wy - y - 20), dr = 4 + h * 0.18;
    kit.ball('clear', c.clone().add(V((hash(i, 2, 3) - 0.5) * dr * 2, 12 + h, (hash(i, 4, 5) - 0.5) * dr)), 0.7 + 0.5 * hash(i, 6, 7), C.water, 0.1, 0);
  }
  // the line up out of the tank, the bubble counter outside the rim, down to the cylinder
  const route = overRim(f, u, f.P(u, y + 30, 6), 6, f.H - 60, -t - 18);
  line(f, route, 0xc9d6d8);
  const bc = route[route.length - 1];
  kit.rod('clear', bc.clone().add(V(0, -60, 0)), bc.clone(), 10, C.glass, { base: 0.1, seg: 18 });
  kit.rod('clear', bc.clone().add(V(0, -58, 0)), bc.clone().add(V(0, -22, 0)), 8.5, 0xcfe8ee, { base: 0.35, seg: 18 });
  kit.rod('room', bc, bc.clone().add(V(0, 6, 0)), 10.5, C.black, { seg: 18 });
  const cyl = f.S.stand.show ? V(f.P(clamp(f.T.L * 0.7, 80, f.T.L - 80), 0, 0).x, f.floor, -f.T.D * 0.5) : V(f.side === 'left' ? -f.t - 110 : f.T.L + f.t + 110, f.floor, -f.T.D + 100);
  const ch = Math.min(430, (f.S.stand.show ? f.top - f.floor : 600) - 140);
  kit.rod('room', cyl, cyl.clone().add(V(0, ch - 60, 0)), 68, C.black, { seg: 28 });
  kit.rod('room', cyl.clone().add(V(0, ch - 60, 0)), cyl.clone().add(V(0, ch, 0)), 68, C.black, { seg: 28, r2: 20 });
  const rg = cyl.clone().add(V(0, ch + 30, 0));
  kit.rod('room', cyl.clone().add(V(0, ch, 0)), rg, 14, C.brass, { seg: 16 });
  kit.box('room', rg, 70, 34, 34, C.brass, 4);
  for (const k of [-1, 1]) {
    const gp = rg.clone().add(V(k * 36, 18, 0));
    kit.put('room', new THREE.CylinderGeometry(22, 22, 12, 24), C.black, along(gp, V(0, 0, 1), 0));
    kit.put('glow', new THREE.CircleGeometry(19, 24), C.gauge, new THREE.Matrix4().makeTranslation(gp.x, gp.y, gp.z + 6.2));
  }
  kit.box('room', rg.clone().add(V(0, 0, 38)), 34, 34, 40, C.black, 5); // solenoid
  // down the back of the tank, then (in a stand) in under its top to the regulator
  const b0 = bc.clone().add(V(0, -60, 0)), low = V(b0.x, f.top - 60, b0.z - 10);
  line(f, [b0, b0.clone().add(V(0, -40, -6)), V(b0.x, f.top + 30, b0.z - 10), low, V(rg.x, f.top - 80, low.z + 40), rg.clone().add(V(0, 40, 30))], 0xc9d6d8);
  // drop checker on the far end of the back glass, half way up: its reservoir green / blue / yellow
  const ud = f.T.L - 60, yd = f.wy * 0.62, pd = f.P(ud, yd, 22);
  kit.lathe('clear', [[0, 30], [8, 29], [13, 22], [15, 10], [15, 0], [14, -1]], pd, V(0, 1, 0), C.glass, 0.1, 24);
  kit.lathe('clear', [[0, 2], [13.5, 2], [13.5, 8], [10, 12], [0, 12]], pd, V(0, 1, 0), DROP_COLOURS[level ?? 'ok'], 0.62, 24);
  kit.tube('clear', [pd.clone().add(V(0, 30, 0)), pd.clone().add(V(0, 44, -6)), f.P(ud, yd + 44, 6)], 2.5, C.glass, 0.12, 8);
  sucker(f, ud, yd + 44, 6);
}

function uv(f: Frame, u0: number, filter: FilterModel | undefined) {
  const { kit, t } = f;
  if (filter && filter.kind === 'canister' || !filter) {
    // inline on the outlet hose: in the stand beside the canister (behind the tank there is rarely room before the
    // wall), else behind the tank: a white tube with grey end caps and a blue indicator window
    const c = f.S.stand.show ? f.P(clamp(f.T.L * 0.25, 140, f.T.L - 140) + 190, f.floor + 170, f.T.D * 0.45) : f.P(u0, (f.floor + f.H) / 2, -t - 34);
    kit.rod('room', c.clone().add(V(0, -140, 0)), c.clone().add(V(0, 140, 0)), 30, C.white, { seg: 28 });
    for (const k of [-1, 1]) kit.rod('room', c.clone().add(V(0, k * 140, 0)), c.clone().add(V(0, k * 160, 0)), 32, C.grey, { seg: 28 });
    kit.box('glow', c.clone().add(V(0, 100, 30.2)), 8, 24, 1, C.uvBlue);
    return;
  }
  // a submersible unit on the back glass beside the filter: the lamp tube and its pump head
  const w = 46, h = 200, yT = f.wy - 30, u = f.slot(u0 + w / 2, w + 6, yT - h, yT, 0, 60), b = 32;
  kit.rod('wet', f.P(u, yT - h, b), f.P(u, yT - 40, b), 22, C.charcoal, { seg: 24 });
  kit.rod('wet', f.P(u, yT - 40, b), f.P(u, yT, b), 24, C.black, { seg: 24 });
  kit.box('glow', f.P(u, yT - 110, b + 22.2), 6, 40, 1, C.uvBlue);
  for (const k of [0.25, 0.7]) sucker(f, u, yT - h * k, b - 22);
  kit.tube('room', overRim(f, u, f.P(u, yT, b), b, f.top + 20), 2.6, C.black, 0, 6);
}

/** A powerhead / wavemaker on a side glass (`far`: the other side), aimed along the tank. */
function powerhead(f: Frame, far: boolean, big: boolean) {
  const { kit, T } = f, r = big ? 32 : 26, len = big ? 50 : 42, y = f.wy * (far ? 0.55 : 0.72), dz = T.D * (far ? 0.55 : 0.3);
  const xs = (far ? f.side === 'right' : f.side === 'left') ? 0 : T.L, dir = V(xs === 0 ? 1 : -1, 0, 0.12).normalize();
  const c = chord(T, 1, dz), x0 = xs === 0 ? (c?.[0] ?? 0) : (c?.[1] ?? T.L), p0 = V(x0, y, -dz);
  // the magnet mount on the glass, the motor body, the cage with its bars and the propeller hub inside
  kit.put('wet', new THREE.CylinderGeometry(r * 0.85, r * 0.85, 10, 28), C.black, along(p0, dir, 5));
  kit.rod('wet', p0.clone().addScaledVector(dir, 10), p0.clone().addScaledVector(dir, 10 + len * 0.5), r, C.charcoal, { seg: 28 });
  const cg = p0.clone().addScaledVector(dir, 10 + len * 0.5), ce = p0.clone().addScaledVector(dir, 10 + len);
  kit.put('wet', new THREE.TorusGeometry(r - 1.5, 1.8, 6, 32), C.black, along(ce, dir, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, o = V(Math.cos(a) * (r - 1.5), 0, Math.sin(a) * (r - 1.5)).applyQuaternion(q);
    kit.rod('wet', cg.clone().add(o), ce.clone().add(o), 1.4, C.black, { seg: 5 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, o = V(Math.cos(a) * (r - 2), 0, Math.sin(a) * (r - 2)).applyQuaternion(q);
    kit.rod('wet', ce.clone().addScaledVector(o, -0.04), ce.clone().add(o), 1.2, C.black, { seg: 4 });
  }
  kit.rod('wet', cg, cg.clone().addScaledVector(dir, len * 0.3), r * 0.3, C.grey, { seg: 16, r2: r * 0.2 });
  // the cord, up the side glass and over the rim
  kit.tube('room', [p0.clone().addScaledVector(dir, 12).add(V(0, r * 0.7, 0)), V(p0.x + dir.x * 6, f.H + 12, p0.z), V(p0.x - dir.x * (f.t + 12), f.H + 12, p0.z), V(p0.x - dir.x * (f.t + 12), f.top + 30, p0.z)], 2.4, C.black, 0, 6);
}

function ato(f: Frame, u0: number) {
  const { kit, t } = f, u = f.slot(u0, 30, f.wy - 30, f.H, 0, 30), y = f.wy;
  kit.box('wet', f.P(u, y + 8, 12), 22, 34, 18, C.black, 4);
  kit.rod('clear', f.P(u, y - 2, 21), f.P(u, y - 14, 21), 4, C.glass, { base: 0.3, seg: 12 });
  kit.box('wet', f.P(u, f.H + 6, (14 - t) / 2), 24, 6, 14 + t + 8, C.black, 2);
  kit.tube('room', overRim(f, u, f.P(u, y + 25, 12), 12, f.top + 20), 2, C.black, 0, 6);
}

// ---------- the set ----------

const isFilter = (id: string) => FILTER_MODELS.find(m => m.id === id);
const isHeater = (id: string) => HEATER_MODELS.find(m => m.id === id);

/** Build the gear for `picks` (default: gearPicks(S)) in tank S, clear of the solid pieces `solids` (world boxes). */
export function buildGear(S: TankSetup, T: Tank, solids: THREE.Box3[], picks = gearPicks(S), side?: GearSide): THREE.Mesh[] {
  if (!picks.length) return [];
  const kit = new Kit(), dflt = side ?? gearSide(T, solids);
  // each corner its own frame: the owner may put the filter in one corner and the heater in the other
  for (const sd of ['left', 'right'] as GearSide[]) {
    const mine = picks.filter(p => (p.side ?? dflt) === sd);
    if (mine.length) buildSet(frame(S, T, kit, sd, solids), mine);
  }
  const out = kit.meshes();
  for (const m of out) m.visible = shown;
  live = live.filter(o => o.parent).concat(out);
  return out;
}

function buildSet(f: Frame, picks: GearPick[]) {
  const get = (id: string) => picks.find(p => p.id === id), has = (id: string) => !!get(id);
  const fp = picks.find(p => isFilter(p.id)), hp = picks.find(p => isHeater(p.id));
  const fm = fp && isFilter(fp.id), hm = hp && isHeater(hp.id);
  let cursor = 22, outlet = 120;
  const after = () => Math.max(cursor, ...f.taken.map(r => r[1])) + 10;
  const at = (p: GearPick | undefined, u: number) => p?.u ?? u; // the owner's spot, else the next free one
  if (has('sump')) { sump(f, at(get('sump'), cursor)); cursor = after(); outlet = cursor - 40; }
  // the heater in the corner, the filter's intake next to it, so the intake draws the warm water through the tank
  if (hm) for (let i = 0; i < (hp!.n ?? 1); i++) { heater(f, hm.watts, i ? after() : at(hp, cursor)); cursor = after(); }
  if (fm) {
    const n0 = f.taken.length, u0 = at(fp, cursor);
    if (fm.kind === 'hob') hob(f, fm, u0); else if (fm.kind === 'canister') canister(f, fm, u0);
    else if (fm.kind === 'sponge') sponge(f, fm, u0); else internal(f, fm, u0);
    const mine = f.taken.slice(n0);
    outlet = fm.kind === 'canister' ? mine[mine.length - 1][0] + 35 : (mine[0][0] + mine[0][1]) / 2;
  }
  cursor = after();
  if (has('uv')) uv(f, fm?.kind === 'canister' || has('sump') ? outlet + 40 : at(get('uv'), cursor), has('sump') ? undefined : fm);
  if (has('skimmer') && !has('sump')) skimmerHob(f, at(get('skimmer'), after()));
  if (has('airstone')) airstone(f, at(get('airstone'), after()));
  if (has('ato') && !has('sump')) ato(f, at(get('ato'), after()));
  if (has('co2')) co2(f, cursor, outlet, get('co2')!.co2);
  if (has('powerhead')) { powerhead(f, false, false); if ((get('powerhead')!.n ?? 1) > 1) powerhead(f, true, false); }
  if (has('wavemaker')) powerhead(f, true, true);
}

/** World boxes of the tank's solid pieces (hardscape, not plants). */
export const solidBoxes = (meshes: THREE.Mesh[]) => meshes.filter(m => !m.userData.plant).map(m => new THREE.Box3().setFromObject(m));

/** The part key: what the gear's look depends on beyond the scene's envKey (the hardscape it keeps clear of, the plants' feed). */
export const gearKey = (S: TankSetup, hard: string[]) => 'gear' + JSON.stringify(gearPicks(S)) + hard.join('');
