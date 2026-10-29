// Shared by every gear builder: the materials, the Kit that merges parts into four meshes, the wall Frame, colours and helpers. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type FilterModel } from '../../demand/gear';
import { type PartColour } from '../../data/gearCatalog';
import { backdropDepth, glassThickness, tankUnderside, floorY, waterY, clamp } from '../../scene/physics';
import { chord } from '../../scene/shape';
import { groundHeight } from '../../scene/terrain';
import type { Tank, TankSetup } from '../../scene/types';

/** Where the owner put a piece (from TechSetup.place): a wall and mm along it (back: from the left end; side walls: from
 *  the back corner forward; floor and lid: x), the height share (glass mounts), lean (heaters) and, on the floor and the
 *  lid, mm from the front. */
export interface GearSpot { wall: GearWall | 'floor' | 'lid'; u: number; y?: number; lean?: number; d?: number }
/** One piece of gear: a filter or heater model id (gear-models.json) or an extra class. */
export interface GearPick {
  id: string; /** CO2 only: the drop checker's colour, when the tech model knows the level. */ co2?: 'low' | 'ok' | 'high';
  /** units (two heaters, two powerheads); absent = 1 */ n?: number;
  /** the tech row it comes from (what a drag writes to) */ row?: string;
  /** heaters: the watts drawn (a generic heater of the size the tank needs); heaters and filters: the real product picked, if any */ watts?: number; product?: string;
  /** the owner's placement; absent = placed by TG (default corner, clear of the hardscape) */ place?: GearSpot;
}
/** Which back corner the gear sits in. */
export type GearSide = 'left' | 'right';

// ---------- materials (shared, never disposed) ----------

export const keep = <M extends THREE.Material>(m: M) => { m.userData.keep = true; return m; };
export const WET = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
export const ROOM = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
export const GLOW = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
/** Clear parts (glass, acrylic, tubing, bubbles, falling water): nearly clear face-on, brighter and more opaque edge-on, like real glass. */
export const CLEAR = keep(new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: true,
  vertexShader: `attribute float aBase; varying vec3 vC; varying float vB; varying vec3 vN; varying vec3 vV;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; vC = color; vB = aBase; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `varying vec3 vC; varying float vB; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float a = clamp(vB + (0.62 - 0.4 * vB) * f, 0.0, 1.0);
  gl_FragColor = vec4(mix(vC, vec3(1.0), 0.45 * f * (1.0 - vB)), a);
  #include <colorspace_fragment>
}`,
}));

export type Bucket = 'wet' | 'room' | 'clear' | 'glow';
export const UP = new THREE.Vector3(0, 1, 0);
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Collects a set of gear's parts, each in its bucket, and merges each bucket into one mesh. */
export class Kit {
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
  box(bk: Bucket, c: THREE.Vector3, w: number, h: number, d: number, color: number, r = 0, yaw = 0, base = 0.06) {
    const g = r > 0 ? roundedBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
    this.put(bk, g, color, new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1)), base);
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
export function along(a: THREE.Vector3, dir: THREE.Vector3, shift: number) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return new THREE.Matrix4().compose(a.clone().addScaledVector(dir.clone().normalize(), shift), q, new THREE.Vector3(1, 1, 1));
}
export const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
/** A box with rounded vertical edges and a small chamfer top and bottom (moulded plastic). */
export function roundedBox(w: number, h: number, d: number, r: number) {
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
export const C = {
  black: 0x1b1d20, charcoal: 0x2a2d31, grey: 0x4a4f55, lightGrey: 0x9ba1a7, white: 0xe6e6e1, hose: 0x55665c, sponge: 0x2c3033,
  glass: 0xd8eef0, airline: 0xdfe9ea, cup: 0xe4eef0, copper: 0x6f4a2c, ceramic: 0xc4beb2, stone: 0x8e959b, brass: 0xb59448,
  water: 0xf2fbff, skimmate: 0x5c4220, amber: 0xff8a2a, uvBlue: 0x6fa8ff, locline: 0x203a5c, gauge: 0xf0eee6, red: 0xb83a2e,
};
export const DROP_COLOURS = { low: 0x3a6fd0, ok: 0x41b441, high: 0xd9c93a } as const;

/** Size factor of a filter body against its class's reference flow (cube root: body volume ~ flow). */
export const flowScale = (m: FilterModel, ref: number) => Math.cbrt(m.gph / ref);
/** A catalogue colour as a number, else the generic default. */
export const hexOr = (h: string | undefined, d: number) => (h && /^#[0-9a-f]{6}$/i.test(h) ? parseInt(h.slice(1), 16) : d);
/** A product part's colour and how it is drawn: tinted clear plastic goes in the clear bucket, seen into. */
export const partOf = (c: PartColour | undefined, d: number, wet: Bucket = 'wet') => ({ c: hexOr(c?.hex, d), bk: (c?.translucent ? 'clear' : wet) as Bucket, base: c?.translucent ? 0.5 : 0.06 });

/** A wall the gear hangs on: the back glass (u from the `side` corner) or a side glass (u from the back corner forward). */
export type GearWall = 'back' | 'left' | 'right';
export interface Frame {
  S: TankSetup; T: Tank; kit: Kit; side: GearSide; wall: GearWall;
  /** Turn of a box that sits square to this wall (0 on the back glass). */ yaw: number;
  /** kit.box turned square to this wall. */ box(bk: Bucket, c: THREE.Vector3, w: number, h: number, d: number, color: number, r?: number, base?: number): void;
  /** World directions of +u (along the wall) and +b (into the tank, off the glass). */
  along: THREE.Vector3; inward: THREE.Vector3;
  /** Water line, tank top (inner glass top), glass thickness, stand top, room floor, the wall's inner length. */
  wy: number; H: number; t: number; top: number; floor: number; len: number;
  /** World point at u mm along the wall, height y, b mm off the glass's inner face into the tank (b < 0: outside it). */
  P(u: number, y: number, b: number): THREE.Vector3;
  /** The ground height there. */
  ground(u: number, b: number): number;
  /** u clear of the hardscape for a part `w` wide spanning heights y0..y1 and b0..b1 off the glass, searching on from u0
   *  (`fixed`: the owner put it there: kept, only held inside the wall). */
  slot(u0: number, w: number, y0: number, y1: number, b0: number, b1: number, fixed?: boolean): number;
  /** Ranges of u taken by gear on this wall so far. */
  taken: [number, number][];
}

export function frame(S: TankSetup, T: Tank, kit: Kit, side: GearSide, solids: THREE.Box3[], wall: GearWall = 'back'): Frame {
  const bd = backdropDepth(S.backdrop, T), t = glassThickness(T, S.render.glass), Db = T.D - bd;
  let P: Frame['P'], ground: Frame['ground'], along: THREE.Vector3, inward: THREE.Vector3, len: number;
  if (wall === 'back') {
    const ix = side === 'left' ? 1 : -1, xOf = (u: number) => side === 'left' ? u : T.L - u;
    const backD = (x: number) => (chord(T, 0, clamp(x, 1, T.L - 1))?.[1] ?? T.D) - bd;
    P = (u, y, b) => { const x = xOf(u); return V(x, y, -(backD(x) - b)); };
    ground = (u, b) => { const x = xOf(u); return groundHeight(S, T, x, backD(x) - b); };
    along = V(ix, 0, 0); inward = V(0, 0, 1); len = T.L;
  } else {
    // a side glass: u runs from the back corner toward the front, b into the tank
    const k = wall === 'left' ? 1 : -1, xAt = (d: number) => { const c = chord(T, 1, clamp(d, 1, T.D - 1)); return wall === 'left' ? c?.[0] ?? 0 : c?.[1] ?? T.L; };
    P = (u, y, b) => { const d = Db - u; return V(xAt(d) + k * b, y, -d); };
    ground = (u, b) => { const d = Db - u; return groundHeight(S, T, xAt(d) + k * b, d); };
    along = V(0, 0, 1); inward = V(k, 0, 0); len = Db;
  }
  const f: Frame = {
    S, T, kit, side: wall === 'back' ? side : wall, wall, along, inward, len, yaw: wall === 'back' ? 0 : Math.PI / 2,
    box: (bk, c, w, h, d, color, r = 0, base) => kit.box(bk, c, w, h, d, color, r, wall === 'back' ? 0 : Math.PI / 2, base),
    wy: waterY(T, S.water.level), H: T.H, t, top: tankUnderside(T, S.render), floor: floorY(T, S.render, S.stand),
    P, ground, taken: [],
    slot(u0, w, y0, y1, b0, b1, fixed = false) {
      const lim = len - 30 - w / 2;
      if (fixed) { const u = clamp(u0, 22 + w / 2, Math.max(22 + w / 2, lim)); f.taken.push([u - w / 2, u + w / 2]); return u; }
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

// ---------- models ----------

/** Where a builder puts its piece: u along the wall (the owner's spot = the piece's centre, kept; else a start to search
 *  on from), and the owner's height share (0 = lowest it can go .. 1 = highest), lean (degrees) and floor offset b. */
export interface Spot { u: number; fixed?: boolean; y?: number; lean?: number; b?: number }
export const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp(k, 0, 1);

/** Suction cup on the back glass at p (a clear dome, its stem forward to the part it holds at b = reach). */
export function sucker(f: Frame, u: number, y: number, reach: number, look: 'clear' | 'frosted' | 'black' = 'clear') {
  const { kit } = f;
  if (look === 'black') kit.lathe('wet', [[0, 0], [9, 0], [8.5, 1.5], [5, 4], [2.2, 6], [0, 6.5]], f.P(u, y, 0.2), f.inward, C.black, 0, 20);
  else kit.lathe('clear', [[0, 0], [9, 0], [8.5, 1.5], [5, 4], [2.2, 6], [0, 6.5]], f.P(u, y, 0.2), f.inward, C.cup, look === 'frosted' ? 0.55 : 0.32, 20);
  kit.rod('wet', f.P(u, y, 6), f.P(u, y, reach), 1.8, look === 'black' ? C.black : C.cup);
}

/** Thin clear airline (or CO2 line) along the points. */
export const line = (f: Frame, pts: THREE.Vector3[], color = C.airline) => f.kit.tube('clear', pts, 2.4, color, 0.18, 8);

/** A route from a point inside the tank up the back glass, over the rim, down the outside to y = yEnd at b = bOut (< 0). */
export function overRim(f: Frame, u: number, from: THREE.Vector3, bIn: number, yEnd: number, bOut = -f.t - 12) {
  const rimY = f.H + 18;
  return [from, f.P(u, Math.max(from.y + 1, f.wy + 20), bIn), f.P(u, rimY - 6, bIn), f.P(u, rimY + 4, (bIn - f.t) / 2), f.P(u, rimY - 6, bOut), f.P(u, Math.min(yEnd + 40, rimY - 60), bOut), f.P(u, yEnd, bOut)];
}

/** A catalogue product's part colour (lane GX, true colours): its listing's hex as a number, else the model's default. */
export const hexOf = (hex: string | undefined, dflt: number) => (hex && /^#[0-9a-f]{6}$/i.test(hex) ? parseInt(hex.slice(1), 16) : dflt);
