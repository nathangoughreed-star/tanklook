// Product stand models (lane R96, Nathan 2026-11-16: "accurate pictures/models of the stands for each product, especially
// color/sheen/texture"). Each catalogue stand carries a `look` read off its product photos (src/data/gear/stands.json:
// sampled colours, sheen, grain, door layout, handles, base, frame tubes). This file builds a simple model from it: boxes
// in the sampled colours (no snapping to the three generic finishes), the real door / opening / leg layout, a grain
// texture where the real stand has wood grain, and a soft highlight on the front for satin and gloss.
// Pure three.js; `mk` (build.ts shadedBox) makes each piece so the stand keeps the drawn style of the other furniture.
import * as THREE from 'three';
import type { Grain } from './woodGrain';
import type { StandLook } from '../data/stands';

type Mk = (w: number, h: number, d: number, color: number, grain?: Grain) => THREE.Mesh;
const hex = (s: string | undefined, d = 0x222222) => (s && /^#[0-9a-f]{6}$/i.test(s) ? parseInt(s.slice(1), 16) : d);
const shade = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

let sheenTex: THREE.DataTexture | undefined;
/** A soft diagonal highlight band (alpha) laid over a glossy or satin front. */
function sheenMap() {
  if (sheenTex) return sheenTex;
  const W = 64, H = 64, d = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, t = (u * 0.8 + v * 0.35 - 0.38) / 0.16, a = Math.exp(-t * t) * 255, o = (y * W + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = Math.round(a);
  }
  sheenTex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); sheenTex.needsUpdate = true; sheenTex.colorSpace = THREE.SRGBColorSpace;
  return sheenTex;
}
const SHEEN_ALPHA = { matte: 0, satin: 0.04, gloss: 0.14 } as const; // a soft band: product photos of laminate cabinets read near-matte, only lacquered wood (Winston) is glossy

/** A flat quad carrying the soft highlight band for `sheen` (undefined for matte): reused by the PM1 hoods; the caller rotates and places it. */
export function sheenQuad(sheen: 'matte' | 'satin' | 'gloss' | undefined, w: number, h: number): THREE.Mesh | undefined {
  const a = SHEEN_ALPHA[sheen ?? 'matte']; if (!a) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sheenMap(), transparent: true, opacity: a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.userData.room = true; return m;
}

/** Where the stand is built: tank-local axes, x along the length, +z toward the viewer, y up; `top` = underside of the tank, `h` = stand height (mm). */
export interface StandSpace { L: number; D: number; top: number; h: number }

/** Add the product's model to `sc`. `look` has been validated by the caller (kind and look present). */
export function addProductStand(sc: THREE.Scene, kind: 'cabinet' | 'frame', look: StandLook, sp: StandSpace, mk: Mk): void {
  const g = new THREE.Group(); g.name = 'standProduct';
  if (kind === 'frame') frame(g, look, sp, mk); else cabinet(g, look, sp, mk);
  g.position.set(sp.L / 2, 0, -sp.D / 2); // the tank's footprint runs x 0..L, front at z = 0, back at z = -D: the model is built about its own centre
  sc.add(g);
  for (const h of g.children.filter(o => o.userData.handle)) { g.remove(h); h.position.add(g.position); sc.add(h); } // door handles sit directly in the scene, where the click box looks for them
}

function put(g: THREE.Group, m: THREE.Mesh, x: number, y: number, z: number) { m.position.set(x, y, z); g.add(m); return m; }

function sheenPlane(g: THREE.Group, look: StandLook, w: number, h: number, x: number, y: number, z: number) {
  const a = SHEEN_ALPHA[look.sheen ?? 'satin']; if (!a) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sheenMap(), transparent: true, opacity: a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.position.set(x, y, z); m.userData.room = true; g.add(m);
}

function cabinet(g: THREE.Group, look: StandLook, sp: StandSpace, mk: Mk) {
  const front = hex(look.front), topC = hex(look.top, front), over = look.overhangMm ?? 12, grain: Grain | undefined = look.grain && look.grain !== 'none' ? { finish: 'oak', seed: 3, soft: true } : undefined;
  const W = sp.L + 2 * over, D = sp.D + 2 * over, y1 = sp.top, y0 = sp.top - sp.h, topT = look.topMm ?? Math.min(28, sp.h * 0.06);
  const base = look.base ?? 'plinth', baseH = look.baseMm ?? (base === 'plinth' || base === 'recessed' ? Math.min(70, sp.h * 0.1) : base === 'feet' ? 32 : base === 'tapered' ? Math.min(150, sp.h * 0.22) : base === 'poles' ? 40 : base === 'block' ? 70 : 0);
  const bodyY0 = y0 + baseH, bodyY1 = y1 - topT, bodyH = bodyY1 - bodyY0, cz = 0, front_z = D / 2 - over * 0.3;
  const bodyC = hex(look.bodyHex, front), dark = shade(front, new THREE.Color(front).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? 0.97 : 0.45);
  // top slab, with the overhang the product has
  put(g, mk(W, topT, D, topC, grain && look.grain !== 'laminate' ? { ...grain, seed: 9 } : undefined), 0, y1 - topT / 2, cz);
  // carcass: side and back panels so an open centre shows depth
  const inset = 6;
  if (look.open === 'half') { // Seapora Roman: the left half open (back panel, chrome pole), the right half a solid panel; Marineland Modern (R183): mirrored, a door on the closed half
    const sw = W * (look.halfW ?? 0.4), m = look.halfClosed === 'left' ? -1 : 1, cx = m * (W / 2 - sw / 2 - inset), ox = -m * sw / 2;
    put(g, mk(sw, bodyH, D - 2 * inset, bodyC), cx, bodyY0 + bodyH / 2, cz);
    if (look.insetHex) put(g, mk(sw * 0.7, bodyH * 0.8, 8, hex(look.insetHex)), cx, bodyY0 + bodyH / 2, D / 2 - inset + 1); // a cane / rattan door panel
    if (look.halfDoor) doorPanel(g, look, mk, front, grain, sw - 8, bodyH - 8, cx, bodyY0 + bodyH / 2, front_z, m < 0 ? 0 : 1); // the handle on the edge by the open half
    put(g, mk(W - sw - 2 * inset, 14, D - 2 * inset, bodyC), ox, bodyY0 + bodyH * (look.openShelf ?? 0.5), cz); // the middle shelf of the open half
    put(g, mk(W - sw - 2 * inset, bodyH, 8, dark), ox, bodyY0 + bodyH / 2, -(D / 2 - inset - 4));
    put(g, mk(W - sw - 2 * inset, 18, D - 2 * inset, front), ox, bodyY0 + 16, cz);
    put(g, mk(18, bodyH, D - 2 * inset, bodyC), -m * (W / 2 - inset - 9), bodyY0 + bodyH / 2, cz); // the open half's outer side panel (Vibrant Life 29 had none: the cabinet showed through its left end)
  } else if (look.open === 'arch' || look.open === 'center') {
    const sideW = look.open === 'arch' ? Math.max(45, W * 0.1) : Math.max(60, W * 0.36);
    const sides: [number, number][] = [[-(W / 2 - sideW / 2 - inset), sideW], [W / 2 - sideW / 2 - inset, sideW]];
    for (const [x, w] of sides) put(g, mk(w, bodyH, D - 2 * inset, bodyC, grain && { ...grain, seed: 4 }), x, bodyY0 + bodyH / 2, cz);
    // the opening: dark back wall, a shelf
    const openW = W - 2 * (sideW + inset);
    if (!look.noBack) put(g, mk(openW, bodyH, 8, dark), 0, bodyY0 + bodyH / 2, -(D / 2 - inset - 4));
    put(g, mk(openW, 18, D - 2 * inset - 16, front, grain && { ...grain, seed: 5 }), 0, bodyY0 + bodyH * (look.openShelf ?? (look.open === 'arch' ? 0.12 : 0.5)), cz);
    if (look.open === 'center' && (look.doors ?? 2) >= 2) { // two doors on the sides of the opening
      const dw = sideW + 4;
      for (const s of [-1, 1]) doorPanel(g, look, mk, front, grain, dw, bodyH, s * (W / 2 - dw / 2 - inset + 2), bodyY0 + bodyH / 2, front_z, s);
    }
  } else {
    put(g, mk(W - 2 * inset, bodyH, D - 2 * inset, bodyC, grain && { ...grain, seed: 4 }), 0, bodyY0 + bodyH / 2, cz);
    // frameMm: the carcass shows as a frame round the doors and between them (Marineland HD 45 ensemble stand, bundle parts sweep 2026-11-26)
    const fr = look.frameMm ?? 0, gap = fr ? Math.max(4, fr * 0.6) : 4, fw = W - 2 * inset - 2 * fr;
    const n = Math.max(1, look.doors ?? 2), dw = look.doorW && n === 1 ? fw * look.doorW : (fw - gap * (n + 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = look.doorW && n === 1 ? (look.doorX ?? 0) * W : -fw / 2 + gap + dw / 2 + i * (dw + gap);
      doorPanel(g, look, mk, front, grain, dw, bodyH - 2 * gap - 2 * fr, x, bodyY0 + bodyH / 2, front_z, n === 1 ? 0 : i < n / 2 ? -1 : 1, i);
    }
    sheenPlane(g, look, W - 2 * inset, bodyH, 0, bodyY0 + bodyH / 2, front_z + 8.5);
  }
  // base
  const bc = hex(look.baseHex, shade(front, 0.9));
  if (look.plate) put(g, mk(W + 2 * (look.plateOver ?? 0), look.plate, D + 2 * (look.plateOver ?? 0), shade(front, 0.9)), 0, y0 + look.plate / 2, cz); // a thin base plate under the cabinet (Seapora, Aquatic Fundamentals)
  if (base === 'plinth') put(g, mk(W - 24 + 2 * (look.plinthOver ?? 0), baseH, D - 24 + 2 * (look.plinthOver ?? 0), shade(front, 0.55)), 0, y0 + baseH / 2 + (look.plate ?? 0) / 2, cz);
  else if (base === 'recessed') { // a full-width recessed plinth panel with screw caps (Imagitarium Modern)
    put(g, mk(W - 12, baseH, D - 12, shade(front, 0.72)), 0, y0 + baseH / 2, cz);
    if (look.caps) for (const x of [-W * 0.34, 0, W * 0.34]) put(g, mk(12, 12, 6, 0xcfcfcf), x, y0 + baseH / 2, D / 2 - 3);
  }
  else if (base === 'feet' || base === 'block' || base === 'tapered') {
    const fw = base === 'tapered' ? 46 : base === 'block' ? 62 : 36, xs = [-(W / 2 - fw / 2 - 14), W / 2 - fw / 2 - 14], zs = [-(D / 2 - fw / 2 - 14), D / 2 - fw / 2 - 14];
    for (const x of xs) for (const z of zs) put(g, mk(base === 'tapered' ? fw * 0.75 : fw, baseH, base === 'tapered' ? fw * 0.75 : fw, bc), x, y0 + baseH / 2, z);
  } else if (base === 'poles') {
    const pc = hex(look.baseHex, 0xb9bdc2);
    for (const x of [-(W / 2 - 30), W / 2 - 30]) put(g, mk(34, sp.h - topT, 34, pc), x, y0 + (sp.h - topT) / 2, D / 2 - 40);
  }
}

function doorPanel(g: THREE.Group, look: StandLook, mk: Mk, color: number, grain: Grain | undefined, w: number, h: number, x: number, y: number, z: number, side: number, i = 0) {
  const st = look.doorStyle ?? 'flat', tc = shade(color, 1.0), t = 14;
  put(g, mk(w, h, t, tc, grain && { ...grain, vertical: true, seed: 20 + i }), x, y, z - t / 2 + 4);
  const zf = z + 8;
  if (st === 'louver') { // horizontal slats, each a little proud, with a dark gap between
    const rows = Math.max(6, Math.round(h / 52)), sh = (h * 0.84) / rows;
    for (let r = 0; r < rows; r++) put(g, mk(w * 0.84, sh * 0.8, 6, shade(color, 1.04), grain && { ...grain, seed: 40 + r }), x, y - h * 0.42 + sh * (r + 0.5), zf);
  } else if (st === 'plank' || st === 'bead') { // vertical boards / beadboard grooves
    const cols = look.planks ?? Math.max(3, Math.round(w / (st === 'bead' ? 38 : 70))), cw = (w * 0.9) / cols;
    for (let c = 0; c < cols; c++) put(g, mk(cw * 0.86, h * 0.88, 5, shade(color, 1 + (c % 2) * 0.05), grain && { ...grain, vertical: true, seed: 60 + c }), x - w * 0.45 + cw * (c + 0.5), y, zf);
  } else if (st === 'raised') { // a raised panel inside the door frame
    put(g, mk(w * 0.66, h * 0.66, 7, shade(color, 1.1), grain && { ...grain, vertical: true, seed: 80 }), x, y, zf);
  }
  const hc = hex(look.handleHex, 0xb9bdc2), hs = look.handle ?? 'none';
  const hx = side === 0 ? x + w * 0.4 : x - side * (w / 2 - 22);
  if (hs === 'bar') put(g, mk(10, Math.min(260, h * 0.32), 18, hc), hx, y + h * 0.04, z + 16).userData.handle = true; // handles are the click target that opens the doors (interact/doorBox.ts)
  else if (hs === 'knob') put(g, mk(26, 26, 22, hc), hx, y + h * 0.3, z + 16).userData.handle = true;
}

function frame(g: THREE.Group, look: StandLook, sp: StandSpace, mk: Mk) {
  const c = hex(look.tube, 0x232323), s = look.tubeMm ?? 22, W = sp.L + 10, D = sp.D + 10, y1 = sp.top, y0 = sp.top - sp.h, foot = 10;
  const sc2 = shade(c, 1.0), shelfC = hex(look.shelfHex, shade(c, 1.15));
  const sa = (look.splayDeg ?? 0) * Math.PI / 180;
  const leg = (x: number, z: number) => { const m = put(g, mk(s, sp.h - foot, s, sc2), x + Math.sign(x) * Math.tan(sa) * (sp.h - foot) / 4, y0 + foot + (sp.h - foot) / 2, z); m.rotation.z = Math.sign(x) * sa; };
  const xs = [-(W / 2 - s / 2), W / 2 - s / 2], zs = [-(D / 2 - s / 2), D / 2 - s / 2];
  for (const x of xs) for (const z of zs) leg(x, z);
  if (W > 1000) leg(0, zs[0]), leg(0, zs[1]);
  const rail = (len: number, x: number, y: number, z: number, alongX: boolean) => put(g, mk(alongX ? len : s, s, alongX ? s : len, sc2), x, y, z);
  const yt = y1 - s / 2;
  if (look.topPlate) put(g, mk(W, 20, D, hex(look.topPlate)), 0, y1 - 10, 0); // a wood panel on top of the frame
  for (const z of zs) rail(W - 2 * s, 0, yt, z, true);                       // top rails, front and back
  for (const x of xs) rail(D - 2 * s, x, yt, 0, false);                      // top rails, ends
  const slats = Math.max(1, Math.round(W / 280) - 1);                        // support rails across the top
  for (let i = 1; i <= slats; i++) rail(D - 2 * s, -W / 2 + (W * i) / (slats + 1), yt, 0, false);
  const levels = look.shelfAt ?? [look.shelf && look.shelf !== 'none' ? 0.3 : 0];
  for (const lv of levels) {
    const ly = y0 + foot + sp.h * lv + (lv ? 0 : s / 2 + 2);
    if (look.shelf === 'solid') { put(g, mk(W - 2 * s, 8, D - 2 * s, shelfC), 0, ly, 0); if (look.shelfRails) { for (const z of zs) rail(W - 2 * s, 0, ly, z, true); for (const x of xs) rail(D - 2 * s, x, ly, 0, false); } }
    else if (look.shelf === 'mesh') { put(g, mk(W - 2 * s, 5, D - 2 * s, shade(shelfC, 1.25)), 0, ly, 0); for (const z of zs) rail(W - 2 * s, 0, ly - 6, z, true); }
    else { for (const z of zs) rail(W - 2 * s, 0, ly, z, true); for (const x of xs) rail(D - 2 * s, x, ly, 0, false); }
  }
  if (look.brace === 'x') { // thin diagonal braces on the back
    const bl = Math.hypot(W - 2 * s, sp.h * 0.6), ang = Math.atan2(sp.h * 0.6, W - 2 * s);
    for (const a of [ang, -ang]) { const b = mk(bl, 5, 5, sc2); b.rotation.z = a; put(g, b, 0, y0 + sp.h * 0.55, zs[0]); }
  } else if (look.brace === 'xside') { // X braces in the end frames
    const [lo, hi] = look.braceSpan ?? [0.25, 0.75], span = sp.h * (hi - lo), bl = Math.hypot(D - 2 * s, span), ang = Math.atan2(span, D - 2 * s);
    for (const x of xs) for (const a of [ang, -ang]) { const b = mk(5, 5, bl, sc2); b.rotation.x = a; put(g, b, x, y0 + sp.h * (lo + hi) / 2, 0); }
  } else if (look.brace === 'window') { // a cross in each end frame: a mid rail with a mullion above and below it
    for (const x of xs) { rail(D - 2 * s, x, y0 + sp.h * 0.5, 0, false); put(g, mk(s * 0.7, sp.h * 0.5 - s, s * 0.7, sc2), x, y0 + sp.h * 0.75 - s / 2, 0); put(g, mk(s * 0.7, sp.h * 0.5 - foot, s * 0.7, sc2), x, y0 + foot + (sp.h * 0.5 - foot) / 2, 0); } // lower mullion runs floor to mid rail (was 0.1h-0.5h, floating)
    for (const z of zs) rail(W - 2 * s, 0, y0 + sp.h * 0.5, z, true);
  } else if (look.brace === 'rails') rail(W - 2 * s, 0, y0 + sp.h * 0.55, zs[0], true);
  if (look.apron) { // a front apron: a door and two drawers when the stand has them (Filko), else one panel
    const ac = hex(look.front, c), ay = y1 - s - look.apron / 2, aw = W - 2 * s;
    if (look.drawers) {
      put(g, mk(aw, look.apron, D - 2 * s - 20, shade(ac, 0.8)), 0, ay, 0); // the solid cabinet body behind the fronts
      put(g, mk(aw * 0.5 - 6, look.apron - 8, 12, ac), -aw * 0.25, ay, D / 2 - s - 6);
      for (const dy of [0.25, -0.25]) put(g, mk(aw * 0.5 - 6, look.apron / 2 - 8, 12, ac), aw * 0.25, ay + dy * look.apron, D / 2 - s - 6);
      for (const [x, y] of [[-aw * 0.05, ay], [aw * 0.25, ay + look.apron * 0.25], [aw * 0.25, ay - look.apron * 0.25]]) put(g, mk(18, 18, 14, 0x2a2a2a), x, y, D / 2 - s + 2);
    } else put(g, mk(aw, look.apron, 12, ac), 0, ay, D / 2 - s - 6);
    if (look.motif) { // the square scroll cut-out at both ends of the apron: a square frame with a smaller one inside
      const q = Math.min(look.apron * 0.8, 90), mc = shade(c, 1.5);
      for (const sx of [-1, 1]) {
        const mx = sx * (aw / 2 - q * 0.75), mz = D / 2 - s + 2;
        for (const [w2, h2, dx, dy] of [[q, 7, 0, q / 2], [q, 7, 0, -q / 2], [7, q, -q / 2, 0], [7, q, q / 2, 0], [q * 0.45, 7, 0, 0], [7, q * 0.5, q * 0.22, q * 0.2]] as [number, number, number, number][]) put(g, mk(w2, h2, 6, mc), mx + dx, ay + dy, mz);
      }
    }
  }
  if (look.feetMm) for (const x of xs) for (const z of zs) put(g, mk(s * 1.35, look.feetMm, s * 1.35, shade(c, 0.9)), x, y0 + look.feetMm / 2, z); // square foot blocks
}
