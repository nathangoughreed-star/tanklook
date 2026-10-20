// Catalogued lights drawn as the real products (2026-10-20, Nathan: real sizes, true per-part colours from the product
// photos, simple geometry, never cartoony). Four shapes cover the 18 Amazon best sellers (data/gear-catalog.json `lights`):
// a slim bar on extendable wire-loop brackets resting on the rim (15 of 18), a flat slab raised on two clip legs, a
// gooseneck nano disc on a screw clamp, and a submersible stick on suction cups under the water. Black bodies; under the
// clear lens the LED board shows its rows of white dots with the product's coloured (RGB / blue) dots among them, lit.
// The fixture's emitters (lightout.ts) are the lighting samples; the dots here are only the look.
import * as THREE from 'three';
import type { LightProduct } from '../data/gearCatalog';
import { insideBy } from '../scene/shape';
import { SUB_DROP, barZ, emitters, ledBarDepth, subStick, type Emitter } from '../scene/lightout';
import type { LightSettings, Tank } from '../scene/types';

type Add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => THREE.Mesh;
/** lighting.ts's own leg builders, passed in (no import cycle): a bar's bent-wire brackets and a puck's clamp + gooseneck. */
export interface LegKit {
  barLegs: (T: Tank, b: { hx: number; zc: number }, armY: number, w: number, add: Add) => void;
  clipOns: (T: Tank, E: Emitter[], y: number, add: Add) => void;
}

const basic = (hex: string | number) => new THREE.MeshBasicMaterial({ color: hex });
/** A lighter edge of the same black (the anodised bar catches the room light along its top edges). */
const edgeOf = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color(0x8a9099), 0.22);
/** The LED board seen through a clear lens: a dark grey board (the dots sit on it). */
const BOARD = 0x2b2e33;

/** The LED dots on a flat face, `rows` front to back across `w`, along `len`: white in `glow`, accents in their colour. */
function ledDots(sc: THREE.Scene, p: LightProduct, glow: THREE.Material, len: number, w: number, at: (u: number, v: number) => THREE.Matrix4, overhead?: number) {
  const L = p.colors.leds, rows = Math.max(1, L.rows), pitch = L.kind === 'rings' ? 28 : rows >= 4 ? 14 : 18, n = Math.max(2, Math.floor(len / pitch));
  const r = L.kind === 'rings' ? 6 : rows >= 4 ? 1.8 : 2.2, cells: { u: number; v: number; c: number }[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
    const v = rows === 1 ? 0 : (j / (rows - 1) - 0.5) * w * (rows > 2 ? 0.7 : 0.45), u = (i + 0.5) / n * len - len / 2;
    const accent = L.accentRow != null ? j === L.accentRow : L.every > 0 && L.accents.length > 0 && (i + j * 2) % L.every === L.every - 1;
    cells.push({ u, v, c: accent ? 1 + ((i + j) % L.accents.length) : 0 });
  }
  const mats = [glow, ...L.accents.map(h => basic(h))];
  mats.forEach((m, k) => {
    const mine = cells.filter(c => c.c === k);
    if (!mine.length) return;
    const geo = L.kind === 'rings' ? new THREE.TorusGeometry(r, 1.6, 6, 18).rotateX(Math.PI / 2) : new THREE.CylinderGeometry(r, r, 0.8, 10);
    const im = new THREE.InstancedMesh(geo, m, mine.length);
    mine.forEach((c, i) => im.setMatrixAt(i, at(c.u, c.v)));
    im.userData.nolight = true; if (overhead != null) im.userData.overhead = overhead; sc.add(im);
  });
  // ring clusters (NICREW C10): a white centre in each ring
  if (L.kind === 'rings') {
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.6, 2.6, 0.8, 10), glow, n);
    for (let i = 0; i < n; i++) im.setMatrixAt(i, at((i + 0.5) / n * len - len / 2, 0));
    im.userData.nolight = true; if (overhead != null) im.userData.overhead = overhead; sc.add(im);
  }
}

/**
 * Draw `p` for the light `l` over (or in) the tank. `y` = the LEDs' height (the tank top + the fixture height),
 * `waterTop` = the water surface's y (the submersible hangs just under it).
 */
export function addProductLight(sc: THREE.Scene, T: Tank, l: LightSettings, p: LightProduct, y: number, add: Add, glow: THREE.Material, kit: LegKit, waterTop: number) {
  const { L, H } = T, c = p.colors, body = basic(c.body), cap = basic(c.endcaps), edge = basic(edgeOf(c.body).getHex()), board = basic(BOARD);
  const mx = new THREE.Matrix4();
  if (p.mount === 'bar' || p.mount === 'rim-legs') {
    const bl = p.lengthMm, bw = ledBarDepth(T, l), th = p.heightMm, zc = barZ(T, l, bw), yc = y + th / 2;
    // the body: a slab, its top edges a shade lighter, end caps (the brackets slide into them), a board under a clear lens
    add(new THREE.BoxGeometry(bl - 8, th, bw), body, L / 2, yc, zc);
    for (const s of [1, -1]) {
      add(new THREE.BoxGeometry(bl - 10, 1.2, 1.6), edge, L / 2, y + th - 0.4, zc + s * (bw / 2 - 0.6));
      add(new THREE.BoxGeometry(4, th + 0.6, bw + 0.6), cap, L / 2 + s * (bl / 2 - 2), yc, zc);
    }
    add(new THREE.BoxGeometry(bl - 16, 0.6, bw - 8), board, L / 2, y - 0.2, zc);
    ledDots(sc, p, glow, bl - 30, bw - 14, (u, v) => mx.makeTranslation(L / 2 + u, y - 0.7, zc + v).clone(), y);
    if (p.mount === 'bar') {
      // extendable wire-loop brackets: two wires out of each end cap, out to the rim and down onto it (lighting's barLegs)
      kit.barLegs(T, { hx: bl / 2, zc }, y + th / 2, Math.min(bw * 0.55, 46), add);
    } else rimLegs(T, { bl, bw, zc, y }, cap, edge, add);
    return;
  }
  if (p.mount === 'gooseneck') {
    // the disc head on a ball joint; the neck and the screw clamp on the nearest back or side glass (lighting's clipOns)
    const E = emitters(T, l), r = p.lengthMm / 2, th = Math.min(p.heightMm, 18);
    kit.clipOns(T, E, y, add);
    for (const e of E) {
      add(new THREE.CylinderGeometry(r - 2, r, th, 40), body, e[0], y + th / 2, e[2]);
      add(new THREE.CylinderGeometry(r + 0.4, r + 0.4, 1.4, 40), edge, e[0], y + th - 0.5, e[2]);
      add(new THREE.CylinderGeometry(r - 4, r - 4, 0.6, 40), board, e[0], y - 0.2, e[2]);
      add(new THREE.SphereGeometry(6.5, 16, 10), cap, e[0], y + th + 4, e[2]);
      // ~30 dots in rings round the centre, every fourth coloured (white / red / blue / green on the DaToo)
      const pts: [number, number][] = [[0, 0]];
      for (const [rr, k] of [[r * 0.3, 7], [r * 0.55, 11], [r * 0.78, 13]] as const) for (let i = 0; i < k; i++) pts.push([rr * Math.cos(i / k * 2 * Math.PI), rr * Math.sin(i / k * 2 * Math.PI)]);
      const acc = c.leds.accents, every = Math.max(1, c.leds.every), groups = [glow, ...acc.map(h => basic(h))];
      groups.forEach((m, k) => {
        const mine = pts.filter((_, i) => (k === 0 ? acc.length === 0 || i % every !== every - 1 : i % every === every - 1 && (Math.floor(i / every) % acc.length) === k - 1));
        if (!mine.length) return;
        const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.7, 1.7, 0.8, 8), m, mine.length);
        mine.forEach(([u, v], i) => im.setMatrixAt(i, mx.makeTranslation(e[0] + u, y - 0.7, e[2] + v)));
        im.userData.nolight = true; im.userData.overhead = y; sc.add(im);
      });
    }
    return;
  }
  // submersible: a stick on the inside of the back glass just under the water, the LEDs on its front face looking out and
  // down into the tank, two clear suction cups behind it holding it to the glass, the cord up and over the back rim
  // under the water it never covers the tank from above: not hidden with the overhead fixtures
  const addIn: Add = (g, m, x, yy, z) => { const o = add(g, m, x, yy, z); delete o.userData.overhead; return o; };
  const { len, hh, dd, cx: sx, zb, zc } = subStick(T, p), yc = waterTop - SUB_DROP - hh / 2; // pushed off the middle: a centred filter intake clears it
  addIn(new THREE.BoxGeometry(len - 10, hh, dd), body, sx, yc, zc);
  for (const s of [1, -1]) addIn(new THREE.BoxGeometry(6, hh + 1, dd + 1), cap, sx + s * (len / 2 - 3), yc, zc);
  // the front face: a clear lens over the board, tipped 20° down (the stick is angled to light the tank, not the viewer)
  const face = new THREE.Group(); face.position.set(sx, yc, zc + dd / 2 + 0.4); face.rotation.x = 0.35;
  const boardM = new THREE.Mesh(new THREE.BoxGeometry(len - 16, hh - 6, 0.6), board); boardM.userData.nolight = true; face.add(boardM);
  sc.add(face); face.updateMatrixWorld(true);
  const tilt = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  ledDots(sc, p, glow, len - 26, hh - 10, (u, v) => face.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(u, v, 0.6)).multiply(tilt));
  const cupM = new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.45, depthWrite: false });
  for (const s of [1, -1]) {
    addIn(new THREE.CylinderGeometry(9, 9, 2, 20).rotateX(Math.PI / 2), cupM, sx + s * len * 0.33, yc, zb + 1);
    addIn(new THREE.CylinderGeometry(3, 4, 8, 10).rotateX(Math.PI / 2), cupM, sx + s * len * 0.33, yc, zb + 5);
  }
  // the cord: from the right end cap up the back glass and over the rim
  const cord = basic(0x111111), cx = sx + len / 2 - 3, up = H + 6 - yc;
  addIn(new THREE.CylinderGeometry(1.8, 1.8, up, 8), cord, cx, yc + up / 2, zb + 3);
  addIn(new THREE.CylinderGeometry(1.8, 1.8, 16, 8).rotateX(Math.PI / 2), cord, cx, H + 6, zb - 5);
  addIn(new THREE.CylinderGeometry(1.8, 1.8, 40, 8), cord, cx, H - 14, zb - 13);
}

/**
 * A rim-leg slab's legs (the hygger / SEAOURA clip-on, from its photo): at each end of the slab a pair of flat struts
 * splaying down from under it to a clamp block that sits on the side glass's rim, a lip down the outside of the glass.
 * The clamp goes to wherever the side glass is at the slab's depth, so a slab longer or shorter than the tank leans
 * its legs in or out.
 */
function rimLegs(T: Tank, s: { bl: number; bw: number; zc: number; y: number }, cap: THREE.Material, edge: THREE.Material, add: Add) {
  const { L, H } = T, rim = H + 3, up = new THREE.Vector3(0, 1, 0), d = -s.zc;
  const strut = (a: THREE.Vector3, b: THREE.Vector3) => {
    const v = b.clone().sub(a), n = v.length();
    add(new THREE.BoxGeometry(7, n, 3), cap, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).quaternion.setFromUnitVectors(up, v.divideScalar(n));
  };
  for (const sx of [1, -1]) {
    // the side glass at this depth (bisection along x, as lighting's barLegs finds the rim)
    let lo = L / 2, hi = L / 2 + sx * (L / 2 + 60);
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (insideBy(T, m, d) >= 0) lo = m; else hi = m; }
    const gx = lo, top = s.y + 1, from = L / 2 + sx * (s.bl / 2 - 30);
    // the clamp: a block over the glass edge, a lip outside, a thumb wheel
    add(new THREE.BoxGeometry(22, 10, 30), cap, gx, rim + 5, s.zc);
    add(new THREE.BoxGeometry(5, 26, 30), cap, gx + sx * 8, rim - 13, s.zc);
    add(new THREE.CylinderGeometry(5, 5, 6, 14).rotateZ(Math.PI / 2), edge, gx + sx * 13, rim - 20, s.zc);
    for (const dz of [-s.bw * 0.32, s.bw * 0.32]) strut(new THREE.Vector3(from, top, s.zc + dz), new THREE.Vector3(gx, rim + 10, s.zc + dz * 0.3));
  }
}
