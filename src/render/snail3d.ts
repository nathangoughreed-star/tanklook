// 3D snails: one shell generator for every species (a logarithmic spiral, see `Shell3D` in art/snails.ts), a soft
// foot with a flat sole, and two tentacles (tapered tubes, as the shrimp's legs). Unit frame like a fish card: width
// 1, x = u - 0.5 (head at +x), y up from the sole, z to the side. The shell is painted along its own coordinates
// (along the coil x around the whorl), so stripes follow growth lines and bands follow the coil at every angle.
import * as THREE from 'three';
import { shell3D, type Shell3D, type SnailSpec } from '../art/snails';
import { taperTube } from './fish3d';

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

const TH = 160, PH = 20; // samples along the coil, around the whorl

/** The shell surface in its own frame (coil axis = y, spire up), uv = (along the coil 0 apex..1 aperture, around the whorl). */
function rawShell(s: Shell3D) {
  const T = s.turns * Math.PI * 2, k = Math.log(s.grow) / (Math.PI * 2), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const pt = (th: number, ph: number) => {
    const sc = Math.exp(k * (th - T)), r = sc * (1 + s.ap[0] * Math.cos(ph));
    return [r * Math.cos(th), sc * (-s.drop + s.ap[1] * Math.sin(ph)), r * Math.sin(th)];
  };
  for (let i = 0; i <= TH; i++) for (let j = 0; j <= PH; j++) {
    const th = T * i / TH, ph = Math.PI * 2 * j / PH;
    pos.push(...pt(th, ph)); uv.push(i / TH, j / PH);
  }
  const R = PH + 1;
  for (let i = 0; i < TH; i++) for (let j = 0; j < PH; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // close the aperture with the dark body inside
  const c = pos.length / 3, [cx, cy, cz] = [Math.cos(T), -s.drop, Math.sin(T)];
  pos.push(cx, cy, cz); uv.push(0.999, 0.5);
  for (let j = 0; j < PH; j++) idx.push(c, TH * R + j + 1, TH * R + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { g, cap: c };
}

/**
 * The shell placed on the body: turned so the aperture opens down onto the foot (a little forward), then spun about
 * that direction so the spire points as near `axis` as it can; scaled to fit `size` x `tall`, centred at `at`, on the foot.
 */
function shellGeometry(s: Shell3D, footH: number) {
  const { g, cap } = rawShell(s), T = s.turns * Math.PI * 2, k = Math.log(s.grow) / (Math.PI * 2);
  // the coil's direction of growth at the aperture = the way the aperture opens
  const open = new THREE.Vector3(k * Math.cos(T) - Math.sin(T), -k * s.drop, k * Math.sin(T) + Math.cos(T)).normalize();
  const down = new THREE.Vector3(...(s.open ?? [0.25, -1, 0])).normalize(), q1 = new THREE.Quaternion().setFromUnitVectors(open, down);
  const flat = (v: THREE.Vector3) => v.clone().projectOnPlane(down).normalize();
  const spire = flat(new THREE.Vector3(0, 1, 0).applyQuaternion(q1)), want = flat(new THREE.Vector3(...s.axis));
  const ang = Math.atan2(new THREE.Vector3().crossVectors(spire, want).dot(down), spire.dot(want));
  g.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(down, ang).multiply(q1));
  if (s.tilt) g.rotateZ(s.tilt * Math.PI / 180); // lean the spire back (a hermit crab's shell lies on its body whorl)
  g.computeBoundingBox();
  const b = g.boundingBox!, sc = Math.min(s.size / (b.max.x - b.min.x), s.tall / (b.max.y - b.min.y));
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2).scale(sc, sc, sc).translate(s.at - 0.5, footH * 0.55, 0);
  shade(g);
  const col = g.attributes.color; col.setXYZ(cap, 0.3, 0.3, 0.3);
  for (let j = 0; j <= PH; j++) col.setXYZ(TH * (PH + 1) + j, 0.55, 0.55, 0.55); // aperture lip a little darker
  return g;
}

/** The shell's paint along its own coordinates: base by side of the whorl, then the species' pattern. */
function shellTexture(s: Shell3D, sp: Pick<SnailSpec, 'shell' | 'mark'>) {
  const W = 1024, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, [dk, md, lt] = sp.shell;
  // around the whorl: v 0 = outer edge, 0.25 = top (toward the spire), 0.5 = inner, 0.75 = underside
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, md); g.addColorStop(0.2, lt); g.addColorStop(0.45, md); g.addColorStop(0.75, dk); g.addColorStop(1, md);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  x.strokeStyle = sp.mark;
  if (s.mark === 'axial') { // zebra: wavy stripes across the whorl, fourteen per turn
    const n = Math.round(s.turns * 14);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n * W; x.globalAlpha = 0.85; x.lineWidth = W / n * 0.38;
      x.beginPath(); x.moveTo(u, 0); x.bezierCurveTo(u - W / n * 0.5, H * 0.33, u + W / n * 0.5, H * 0.66, u, H); x.stroke();
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
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** The foot: half a squashed ellipsoid with a flat sole, from `foot` to the head at u = 1; head end slightly raised. */
function footGeometry(s: Shell3D, h: number) {
  const L = (1 - s.foot) / 2, g = new THREE.SphereGeometry(1, 28, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i); const z = p.getZ(i);
    if (y < 0) y *= 0.12; // flat sole
    const head = Math.max(0, x) ** 2; // the head end is fuller
    p.setXYZ(i, x * L + s.foot + L - 0.5, (y + 0.12) * h * (0.75 + 0.5 * head), z * L * 0.32 * (1 - 0.25 * Math.max(0, -x)));
  }
  shade(g, 0.4, 0.35);
  return g;
}

/** The foot's outline at the sole (unit circle param t), as footGeometry shapes it. */
const soleAt = (s: Shell3D, t: number): [number, number] => {
  const L = (1 - s.foot) / 2, x = Math.cos(t);
  return [x * L + s.foot + L - 0.5, Math.sin(t) * L * 0.32 * (1 - 0.25 * Math.max(0, -x))];
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
  const r0 = new THREE.Vector3(0.4, h * 0.85, 0.02 * side), len = s.tent * 1.4;
  const end = r0.clone().add(new THREE.Vector3(len * 0.6, len * 0.75, len * 0.4 * side));
  const g = taperTube(new THREE.QuadraticBezierCurve3(r0, r0.clone().add(new THREE.Vector3(len * 0.45, len * 0.2, len * 0.1 * side)), end), 0.009);
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
  grp.add(shellMesh(art, s, sp, FOOT_H));
  const skin = mat('foot:' + art, () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(sp.foot[1]).lerp(new THREE.Color(sp.foot[0]), 0.4) });
    return m;
  });
  grp.add(new THREE.Mesh(geo(':foot', () => footGeometry(s, FOOT_H)), skin));
  for (const side of [1, -1]) grp.add(new THREE.Mesh(geo(':tent' + side, () => tentacleGeometry(s, FOOT_H, side)), skin));
  grp.add(new THREE.Mesh(geo(':sole', () => soleGeometry(s)), mat('sole:' + art, () => new THREE.MeshBasicMaterial({ map: soleTexture(sp) }))));
  grp.scale.setScalar(w);
  grp.userData.pivot = new THREE.Vector3(s.at - 0.5, FOOT_H * 0.55, 0); // where the shell sits on the foot
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
