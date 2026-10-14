// 3D snails: one shell generator for every species (a logarithmic spiral, see `Shell3D` in art/snails.ts), a soft
// foot with a flat sole, and two tentacles (tapered tubes, as the shrimp's legs). Unit frame like a fish card: width
// 1, x = u - 0.5 (head at +x), y up from the sole, z to the side. The shell is painted along its own coordinates
// (along the coil x around the whorl), so stripes follow growth lines and bands follow the coil at every angle.
import * as THREE from 'three';
import { shell3D, type Shell3D, type SnailSpec } from '../art/snails';
import { taperTube } from './fish3d';
import { hexA } from '../art/paint';

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.MeshBasicMaterial>();
const mat = (key: string, make: () => THREE.MeshBasicMaterial) => {
  let m = matCache.get(key);
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
};

/** Soft form shading (as the fish body): undersides turn away from the light above. */
function shade(g: THREE.BufferGeometry, dark = 0.28, flank = 0) {
  g.computeVertexNormals();
  const n = g.attributes.normal, col: number[] = [];
  // flank: the sides fall off too, so a low rounded body reads as round rather than as a flat disc
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i), k = 1 - dark * Math.max(0, -ny) + 0.04 * Math.max(0, ny) - flank * (1 - Math.abs(ny)); col.push(k, k, k); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}

const TH = 160, PH0 = 24; // samples along the coil, around the whorl (a shell's own `ph` overrides)

/** A coil's frame: growth k per radian, total angle T, the whorl centre / tangent at angle th (shell frame, coil axis = y, spire up). */
function coil(s: Shell3D) {
  const T = s.turns * Math.PI * 2, k = Math.log(s.grow) / (Math.PI * 2);
  // the whorl cross-section at angle th, around the whorl ph (0 = outer edge, pi/2 = toward the spire), flared by f
  const pt = (th: number, ph: number, f = 1): [number, number, number] => {
    const sc = Math.exp(k * (th - T)), r = sc * (1 + f * s.ap[0] * Math.cos(ph));
    return [r * Math.cos(th), sc * (-s.drop + f * s.ap[1] * Math.sin(ph)), r * Math.sin(th)];
  };
  return { T, k, pt };
}

/**
 * Where the shell's own whorls cover each other, around the whorl (ph): a self-similar coil meets the whorl before it
 * at the same ph on every turn, so these are the sutures. Returns the visible ph range [from, to] (outer side, through
 * the top), or null for a coil whose whorls do not touch.
 */
export function sutures(s: Shell3D): [number, number] | null {
  const g = s.grow, [a, b] = s.ap, inside = (ph: number, m: number) => { // inside the whorl scaled by m (1/g = the one before, g = after)
    const r = 1 + a * Math.cos(ph), y = -s.drop + b * Math.sin(ph);
    return ((r - m) / (a * m)) ** 2 + ((y + s.drop * m) / (b * m)) ** 2 < 1;
  };
  const N = 720, hid = Array.from({ length: N }, (_, i) => { const ph = (i / N) * Math.PI * 2; return inside(ph, 1 / g) || inside(ph, g); });
  if (!hid.some(Boolean)) return null;
  // the visible run that holds the outer edge (ph = 0)
  let i0 = 0, i1 = 0;
  while (!hid[(N + i0 - 1) % N] && i0 > -N) i0--;
  while (!hid[(i1 + 1) % N] && i1 < N) i1++;
  return [(i0 / N) * Math.PI * 2, (i1 / N) * Math.PI * 2];
}

/**
 * The shell surface in its own frame (coil axis = y, spire up), uv = (along the coil 0 apex..1 aperture, around the
 * whorl). The aperture is cut on a plane turned `incl` degrees from the cross-section toward the shell's base, as a
 * real aperture faces down onto the foot rather than straight along the coil; its last stretch flares into a lip.
 * Then a dark mantle cavity closes it, its rim on duplicated lip vertices so the lip keeps a crisp edge.
 */
function rawShell(s: Shell3D) {
  const PH = s.ph ?? PH0, { T, k, pt } = coil(s), drop = s.drop, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const C = new THREE.Vector3(...pt(T, 0, 0));
  const tan = new THREE.Vector3(k * Math.cos(T) - Math.sin(T), -k * drop, k * Math.sin(T) + Math.cos(T)).normalize();
  const b = (s.incl ?? 0) * Math.PI / 180, n = tan.clone().multiplyScalar(Math.cos(b)).add(new THREE.Vector3(0, -Math.sin(b), 0)).normalize();
  const P = new THREE.Vector3(), F = 1 + (s.lip ?? 0.12), LIP = 0.05; // the lip: last 5 % of the coil, flared by `lip`
  // the cut: per ph, how far past T the whorl runs before it meets the aperture plane (Newton on the plane distance)
  const ends = Array.from({ length: PH + 1 }, (_, j) => {
    const ph = Math.PI * 2 * j / PH, d = (t: number) => P.set(...pt(t, ph)).sub(C).dot(n);
    let t = T;
    for (let it = 0; it < 6; it++) { const e = 1e-4, f0 = d(t), f1 = (d(t + e) - f0) / e; if (Math.abs(f1) < 1e-6) break; t -= f0 / f1; }
    if (s.fillCut) return Math.abs(t - T) < 0.6 && Math.abs(d(t)) < 1e-4 ? t : NaN;
    return Math.max(T - 0.6, Math.min(T + 0.6, t)); // a fast-growing coil (nerite) can find a far crossing: stay on the last whorl
  });
  // `fillCut`: where the inner side of the whorl never meets the plane (a nerite's columella), run the cut on smoothly
  // between the rows that do, so the rim has no jumps (clamped, those rows ended at +-0.6 alternately: a crease)
  const ok = ends.map(Number.isFinite);
  if (!ok.some(Boolean)) ends.fill(T);
  else for (let j = 0; j < PH; j++) if (!ok[j]) {
    let a = j, b = j; do a = (a - 1 + PH) % PH; while (!ok[a]); do b = (b + 1) % PH; while (!ok[b]);
    const da = (j - a + PH) % PH || PH, db = (b - j + PH) % PH || PH, w = da / (da + db), k = (1 - Math.cos(Math.PI * w)) / 2;
    ends[j] = ends[a] + (ends[b] - ends[a]) * k;
  }
  if (!ok[PH]) ends[PH] = ends[0];
  // with `fillCut` the paint follows the coil's angle (each row ends at its own angle: by sample, stripes stepped row to row)
  const end = Math.max(...ends);
  for (let i = 0; i <= TH; i++) for (let j = 0; j <= PH; j++) {
    const u = i / TH, th = ends[j] * u, w = Math.min(1, Math.max(0, (u - 1 + LIP) / LIP)), f = 1 + (F - 1) * w * w * (3 - 2 * w);
    pos.push(...pt(th, Math.PI * 2 * j / PH, f)); uv.push(s.fillCut ? th / end : u, j / PH);
  }
  const R = PH + 1;
  for (let i = 0; i < TH; i++) for (let j = 0; j < PH; j++) { const a = i * R + j, c = a + R; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  // the cavity: lip ring again, then a centre pushed into the shell
  const rim = pos.length / 3, lip: THREE.Vector3[] = [];
  for (let j = 0; j <= PH; j++) { const v = new THREE.Vector3().fromArray(pos, (TH * R + j) * 3); lip.push(v); pos.push(v.x, v.y, v.z); uv.push(0.999, j / PH); }
  const mid = lip.slice(0, PH).reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / PH);
  const deep = mid.clone().addScaledVector(n, -0.8 * Math.min(s.ap[0], s.ap[1])), cap = pos.length / 3;
  pos.push(deep.x, deep.y, deep.z); uv.push(0.999, 0.5);
  for (let j = 0; j < PH; j++) idx.push(cap, rim + j + 1, rim + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { g, n, rim, cap };
}

/**
 * The shell placed on the body: turned so the aperture opens toward `open` (default down and a little forward, onto
 * the foot), then spun about that direction so the spire points as near `axis` as it can; scaled to fit `size` x
 * `tall`, centred at `at`. On a snail (lift > 0) the aperture's lower lip sinks into the foot's back; a hermit crab's
 * shell (lift 0) stands on the ground. userData.lip / open = the aperture ring and the way it faces, body frame.
 */
function shellGeometry(s: Shell3D, lift: number) {
  const PH = s.ph ?? PH0, { g, n, rim, cap } = rawShell(s);
  const down = new THREE.Vector3(...(s.open ?? [0.25, -1, 0])).normalize(), q1 = new THREE.Quaternion().setFromUnitVectors(n, down);
  const flat = (v: THREE.Vector3) => v.clone().projectOnPlane(down).normalize();
  const spire = flat(new THREE.Vector3(0, 1, 0).applyQuaternion(q1)), want = flat(new THREE.Vector3(...s.axis));
  const ang = Math.atan2(new THREE.Vector3().crossVectors(spire, want).dot(down), spire.dot(want));
  const q = new THREE.Quaternion().setFromAxisAngle(down, ang).multiply(q1);
  g.applyQuaternion(q);
  const open = n.clone().applyQuaternion(q);
  if (s.tilt) { g.rotateZ(s.tilt * Math.PI / 180); open.applyAxisAngle(new THREE.Vector3(0, 0, 1), s.tilt * Math.PI / 180); } // lean the spire back (a hermit crab's shell lies on its body whorl)
  g.computeBoundingBox();
  const bb = g.boundingBox!, sc = Math.min(s.size / (bb.max.x - bb.min.x), s.tall / (bb.max.y - bb.min.y)), p = g.attributes.position;
  let low = Infinity; // the lowest point of the lip
  for (let j = 0; j < PH; j++) low = Math.min(low, p.getY(rim + j));
  const y0 = lift > 0 ? lift * 0.5 - (low - bb.min.y) * sc : 0; // snail: the lower lip in the foot's back
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2).scale(sc, sc, sc).translate(s.at - 0.5, Math.max(y0, lift * 0.3), 0);
  shade(g);
  const col = g.attributes.color;
  for (let j = 0; j <= PH; j++) col.setXYZ(rim + j, 0.32, 0.3, 0.28);
  col.setXYZ(cap, 0.1, 0.1, 0.1);
  g.userData.lip = Array.from({ length: PH }, (_, j) => new THREE.Vector3().fromBufferAttribute(p, rim + j));
  g.userData.open = open;
  return g;
}

/** The shell's paint along its own coordinates: base by side of the whorl, then the species' pattern. */
function shellTexture(s: Shell3D, sp: Pick<SnailSpec, 'shell' | 'mark'>) {
  const W = 1024, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, [dk, md, lt] = sp.shell;
  // around the whorl (the texture is flipped: canvas row = 1 - ph / 2pi): outer edge md, top (toward the spire) lt,
  // inner md, underside dk
  const row = (ph: number) => 1 - ph / (Math.PI * 2), g = x.createLinearGradient(0, 0, 0, H);
  // a flat coil (ramshorn) stands on edge, both faces in view: light on both
  g.addColorStop(row(Math.PI * 2), md); g.addColorStop(row(Math.PI * 1.5), s.drop ? dk : lt); g.addColorStop(row(Math.PI), md); g.addColorStop(row(Math.PI * 0.4), lt); g.addColorStop(row(0), md);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  x.strokeStyle = sp.mark;
  if (s.mark === 'axial') { // zebra: wavy stripes across the whorl, fourteen per turn
    // one whole sine wave round the whorl, so a stripe meets itself where the paint wraps (an S-curve chevroned there);
    // drawn on past both edges so the slanted stroke's flat ends do not notch the rows the wrap lands on
    const n = Math.round(s.turns * 14);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n * W; x.globalAlpha = 0.85; x.lineWidth = W / n * 0.38;
      x.beginPath(); for (let k = -4; k <= 36; k++) x.lineTo(u + W / n * 0.3 * Math.sin(k / 32 * Math.PI * 2), H * k / 32); x.stroke();
    }
  } else if (s.mark === 'spiral') { // faint bands along the coil
    for (const v of [0.1, 0.3, 0.62]) { x.globalAlpha = 0.4; x.fillStyle = sp.mark; x.fillRect(0, v * H, W, H * 0.04); }
  } else if (s.mark === 'growth') { // fine growth lines
    const n = Math.round(s.turns * 34);
    for (let i = 0; i < n; i++) { const u = (i + r()) / n * W; x.globalAlpha = 0.18 + 0.15 * r(); x.lineWidth = 1.5; x.beginPath(); x.moveTo(u, 0); x.lineTo(u, H); x.stroke(); }
  } else { // spots, and flame lines across the whorl
    x.fillStyle = sp.mark;
    for (let i = 0; i < 260; i++) { x.globalAlpha = 0.5; x.beginPath(); x.ellipse(r() * W, r() * H, 3 + 3 * r(), 2 + 2 * r(), 0, 0, 7); x.fill(); }
    const n = Math.round(s.turns * 6);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * W; x.globalAlpha = 0.45; x.lineWidth = W / n * 0.18; x.beginPath(); x.moveTo(u, 0); x.lineTo(u - 6, H); x.stroke(); }
  }
  // the suture: where each whorl runs in under the one before it, a dark seam and a little shade just below it
  const su = s.seam === false ? null : sutures(s);
  if (su) {
    const y = row(su[1]) * H;
    const sh = x.createLinearGradient(0, y, 0, y + H * 0.08);
    sh.addColorStop(0, hexA(dk, 0.75)); sh.addColorStop(1, hexA(dk, 0));
    x.globalAlpha = 1; x.fillStyle = sh; x.fillRect(0, y, W, H * 0.08);
    x.fillStyle = dk; x.globalAlpha = 0.9; x.fillRect(0, y - 1.5, W, 3);
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** The foot: half a squashed ellipsoid with a flat sole, from `foot` to `footEnd`, `footW` wide; front end fuller. */
const footSpan = (s: Shell3D) => { const e = s.footEnd ?? 0.97, L = (e - s.foot) / 2; return { L, c: s.foot + L - 0.5, w: s.footW ?? 0.32 }; };
function footGeometry(s: Shell3D, h: number) {
  const { L, c, w } = footSpan(s), g = new THREE.SphereGeometry(1, 28, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i); const x = p.getX(i), z = p.getZ(i);
    if (y < 0) y *= 0.12; // flat sole
    const head = Math.max(0, x) ** 2; // the head end is fuller
    p.setXYZ(i, x * L + c, (y + 0.12) * h * (0.75 + 0.35 * head), z * L * w * (1 - 0.25 * Math.max(0, -x)));
  }
  shade(g, 0.4, 0.35);
  return g;
}

/** The head: a rounded snout over the front of the foot, the tentacles on top of it. Returns its centre and radius. */
const headAt = (s: Shell3D, h: number) => { const { L, c, w } = footSpan(s), r = s.head ?? Math.max(0.045, L * w * 0.62); return { x: c + L - r, y: h * 0.82, r }; };
function headGeometry(s: Shell3D, h: number) {
  const { x, y, r } = headAt(s, h), g = new THREE.SphereGeometry(1, 20, 12);
  g.scale(r * 1.4, r * 0.75, r * 0.85).translate(x, y, 0);
  shade(g, 0.4, 0.2);
  return g;
}

/**
 * The soft body inside the aperture: the lip ring, drawn in a little, down onto the foot, and a dark mantle cap inside.
 * So the shell's opening is filled by the animal, which reads as coming out of it rather than sitting under it.
 */
function plugGeometry(s: Shell3D, lip: THREE.Vector3[], open: THREE.Vector3, h: number) {
  const fs = footSpan(s), n = lip.length, mid = lip.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / n);
  const top = lip.map(v => v.clone().lerp(mid, 0.16).addScaledVector(open, -0.01));
  // the bottom ring inside the foot's back: drawn in to the foot's width there, so the body narrows into the foot
  const bot = top.map(v => {
    const b = v.clone().lerp(mid, 0.3), t = Math.acos(Math.max(-1, Math.min(1, (b.x - fs.c) / fs.L))), half = soleAt(s, t)[1] * 0.8;
    b.z = Math.max(-half, Math.min(half, b.z)); b.y = Math.min(b.y, h * 0.6); return b;
  });
  const pos: number[] = [], idx: number[] = [];
  for (const v of [...top, ...bot]) pos.push(v.x, v.y, v.z);
  for (let j = 0; j < n; j++) { const a = j, b = (j + 1) % n; idx.push(a, n + a, b, b, n + a, n + b); }
  const deep = mid.clone().addScaledVector(open, -0.04), c = pos.length / 3; pos.push(deep.x, deep.y, deep.z);
  for (let j = 0; j < n; j++) idx.push(c, j, (j + 1) % n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  shade(g, 0.45, 0.2);
  return g;
}

/** The foot's outline at the sole (unit circle param t), as footGeometry shapes it. */
const soleAt = (s: Shell3D, t: number): [number, number] => {
  const { L, c, w } = footSpan(s), x = Math.cos(t);
  return [x * L + c, Math.sin(t) * L * w * (1 - 0.25 * Math.max(0, -x))];
};

/** The sole as seen through the glass: a flat fan just under the foot, facing down, uv = (along, across) the sole. */
function soleGeometry(s: Shell3D) {
  const N = 40, [cx] = soleAt(s, Math.PI / 2), pos = [cx, -0.003, 0], uv = [0.5, 0.5], idx: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / N * Math.PI * 2, [x, z] = soleAt(s, t);
    pos.push(x, -0.003, z); uv.push((Math.cos(t) + 1) / 2, (Math.sin(t) + 1) / 2);
    idx.push(0, 1 + i, 1 + (i + 1) % N); // wound to face down (-y)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Sole paint (as the glass card's): pale centre, darker rim, the transverse waves of a crawling foot, the mouth at the head. */
function soleTexture(sp: SnailSpec) {
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  g.addColorStop(0, sp.foot[1]); g.addColorStop(0.7, sp.foot[1]); g.addColorStop(1, sp.foot[0]);
  x.save(); x.scale(1, H / W); x.fillStyle = g; x.fillRect(0, 0, W, W); x.restore();
  x.strokeStyle = sp.foot[0]; x.globalAlpha = 0.4; x.lineWidth = 3;
  for (let i = 0; i < 8; i++) { const u = W * (0.14 + i * 0.09); x.beginPath(); x.moveTo(u, 0); x.quadraticCurveTo(u + W * 0.04, H / 2, u, H); x.stroke(); }
  x.globalAlpha = 0.6; x.fillStyle = '#3a2a22'; x.beginPath(); x.ellipse(W * 0.93, H / 2, W * 0.025, H * 0.09, 0, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Tentacles from the top of the head, up and forward, splayed. */
function tentacleGeometry(s: Shell3D, h: number, side: number) {
  const hd = headAt(s, h), r0 = new THREE.Vector3(hd.x + hd.r * 0.4, hd.y + hd.r * 0.55, 0.35 * hd.r * side), len = s.tent * 1.4;
  const end = r0.clone().add(new THREE.Vector3(len * 0.6, len * 0.75, len * 0.4 * side));
  const g = taperTube(new THREE.QuadraticBezierCurve3(r0, r0.clone().add(new THREE.Vector3(len * 0.45, len * 0.2, len * 0.1 * side)), end), 0.009);
  shade(g, 0.3); // the skin material takes vertex colours (without them the tentacles drew black)
  return g;
}

/** A shell on its own (unit frame, its bottom at lift x 0.55): a snail's, or the one a hermit crab carries. */
export function shellMesh(key: string, s: Shell3D, look: Pick<SnailSpec, 'shell' | 'mark'>, lift = 0) {
  let g = geoCache.get(key + ':shell'); if (!g) { g = shellGeometry(s, lift); g.userData.keep = true; geoCache.set(key + ':shell', g); }
  return new THREE.Mesh(g, mat('shell:' + key, () => new THREE.MeshBasicMaterial({ map: shellTexture(s, look), vertexColors: true, side: THREE.DoubleSide })));
}

const FOOT_H = 0.22; // a muscular foot, not a wafer: it reads as a body from the side and edge-on on the glass

/** The 3D snail for a card of width w: shell, foot, tentacles; origin at the sole under the card centre. */
export function snailBody(art: string, w: number) {
  const s = shell3D(art), sp = s.spec, grp = new THREE.Group();
  const geo = (key: string, make: () => THREE.BufferGeometry) => {
    let g = geoCache.get(art + key); if (!g) { g = make(); g.userData.keep = true; geoCache.set(art + key, g); }
    return g;
  };
  const skin = mat('foot:' + art, () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(sp.foot[1]).lerp(new THREE.Color(sp.foot[0]), 0.4) });
    return m;
  });
  const fh = s.footH ?? FOOT_H, shell = shellMesh(art, s, sp, fh), sg = shell.geometry;
  shell.add(new THREE.Mesh(geo(':plug', () => plugGeometry(s, sg.userData.lip, sg.userData.open, fh)), skin)); // turns with the shell (sagShell)
  grp.add(shell); // first child: sagShell turns children[0]
  grp.add(new THREE.Mesh(geo(':foot', () => footGeometry(s, fh)), skin));
  grp.add(new THREE.Mesh(geo(':head', () => headGeometry(s, fh)), skin));
  for (const side of [1, -1]) grp.add(new THREE.Mesh(geo(':tent' + side, () => tentacleGeometry(s, fh, side)), skin));
  grp.add(new THREE.Mesh(geo(':sole', () => soleGeometry(s)), mat('sole:' + art, () => new THREE.MeshBasicMaterial({ map: soleTexture(sp) }))));
  grp.scale.setScalar(w);
  grp.userData.pivot = new THREE.Vector3(s.at - 0.5, fh * 0.55, 0); // where the shell sits on the foot
  return grp;
}

const SAG = 40 * Math.PI / 180;

/**
 * A snail on a wall (glass): its shell swivels on the foot, about the foot's own up (the pane's normal), so its weight
 * hangs toward `down` (gravity in the body's frame, unit), by up to SAG as far as down lies along the pane. A swivel
 * never brings the shell nearer the glass (tipping it toward the pane did, and lifting it clear tore it off the foot).
 */
export function sagShell(body: THREE.Group, down: THREE.Vector3) {
  const shell = body.children[0] as THREE.Mesh, piv = body.userData.pivot as THREE.Vector3;
  const k = Math.hypot(down.x, down.z);
  if (k < 0.05) return;
  const c = new THREE.Vector3().fromBufferAttribute(shell.geometry.attributes.position, 0).sub(piv); // the spire tip (vertex 0 = the coil's apex), seen from the shell's seat
  if (Math.hypot(c.x, c.z) < 1e-3) return;
  const ang = (v: { x: number; z: number }) => Math.atan2(-v.z, v.x); // rotation about +y adds to this
  let d = ang(down) - ang(c); d = Math.atan2(Math.sin(d), Math.cos(d));
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sign(d) * Math.min(Math.abs(d), SAG * Math.min(1, k)));
  shell.quaternion.copy(q);
  shell.position.copy(piv).sub(piv.clone().applyQuaternion(q));
}
