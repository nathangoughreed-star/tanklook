// Filter models: hang-on-back, sponge, internal and canister. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { type FilterModel } from '../../demand/gear';
import { type FilterProduct } from '../../data/gearCatalog';
import { clamp } from '../../scene/physics';
import { Bucket, V, hash, C, flowScale, hexOr, partOf, Frame, Spot, lerp, sucker, overRim } from './common';
import { airPump, bubbles } from './pump';

export function hob(f: Frame, m: FilterModel, sp: Spot, pr?: FilterProduct) {
  const { kit, t } = f, s = pr?.gph ? Math.cbrt(pr.gph / 100) : flowScale(m, 100), W = pr?.bodyMm.w ?? 150 * s, D = pr?.bodyMm.d ?? 105 * s, Hb = pr?.bodyMm.h ?? 170 * s, yTop = f.H + 28;
  // a real product (lane TG step 3): its own colours part by part; an intake shorter than the tank leaves the strainer up in the water
  const L = pr?.colors, body = partOf(L?.body, C.charcoal, 'room'), lid = partOf(L?.lid, C.grey, 'room'), motor = hexOr(L?.motor?.hex, C.black);
  const lip = partOf(L?.outlet ?? (L?.body?.translucent ? undefined : L?.body), C.charcoal), inC = partOf(L?.intake, C.grey), stC = partOf(L?.strainer ?? L?.intake, C.grey);
  const it = 8 * Math.sqrt(s), stY = Math.max(f.ground(sp.u, 26) + 45, pr?.intakeMm ? f.H + 16 - pr.intakeMm : -Infinity); // intake tube radius; the strainer's foot clears the ground
  const uI = f.slot(sp.fixed ? sp.u - W / 2 + 12 : sp.u + 12, 30, stY, f.wy, 0, 50, sp.fixed), u = uI - 12 + W / 2; // only the intake takes wall room: the body is outside
  // the body behind the back glass, its lid and the motor housing
  const bc = f.P(u, yTop - Hb / 2, -t - 6 - D / 2);
  f.box(body.bk, bc, W, Hb, D, body.c, 10, body.base);
  if (body.bk === 'clear') f.box('room', f.P(u, yTop - Hb * 0.55, -t - 6 - D / 2), W * 0.8, Hb * 0.7, D * 0.7, hexOr(L?.sponge, 0x3a3f44), 4); // the media seen through a tinted body
  f.box(lid.bk, f.P(u, yTop + 4, -t - 6 - D / 2), W, 8, D, lid.c, 6, lid.base);
  f.box('room', f.P(u - W * 0.22, yTop - Hb - 18, -t - 4 - D * 0.35), 46 * s, 36, 46 * s, motor, 8); // motor under the box
  if (L?.accent && !/wheel|window/i.test(L.accent.where)) f.box('room', f.P(u - W * 0.3, yTop + 8.5, -t - 6 - D * 0.25), W * 0.22, 2, D * 0.18, hexOr(L.accent.hex, C.grey), 1); // a coloured latch / tab on top (Seachem blue)
  if (L?.accent && /wheel/i.test(L.accent.where)) kit.rod('room', f.P(u + W * 0.3, yTop - Hb * 0.35, -t - 6 - D), f.P(u + W * 0.3, yTop - Hb * 0.35, -t - 6 - D - 6), Hb * 0.3, hexOr(L.accent.hex, C.grey), { seg: 28 }); // a Bio-Wheel at the back
  // hanger over the glass and the spillway lip into the tank, with the sheet of water falling off it
  f.box(lip.bk, f.P(u + W * 0.08, f.H + 14, (24 - t) / 2), W * 0.8, 6, 24 + t + 8, lip.c, 2, lip.base);
  const lipB = 30 * s, lipY = f.H + 10, uL = u + W * 0.08;
  f.box(lip.bk, f.P(uL, lipY, lipB / 2), W * 0.7, 4, lipB, lip.c, 1.5, lip.base);
  const n = 8, drop = lipY - f.wy, w2 = W * 0.33, pos: number[] = [], sg = new THREE.BufferGeometry();
  const at = (k: number, side: number) => f.P(uL + side * w2, lipY - drop * k, lipB + 10 * Math.sqrt(k) * s).toArray();
  for (let i = 0; i < n; i++) { const a0 = i / n, a1 = (i + 1) / n; pos.push(...at(a0, -1), ...at(a0, 1), ...at(a1, 1), ...at(a0, -1), ...at(a1, 1), ...at(a1, -1)); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.computeVertexNormals();
  kit.put('clear', sg, C.water, undefined, 0.2);
  // the flow's ripples on the surface where the sheet lands
  for (const [k, w] of [[1, 0.9], [1.7, 0.7], [2.5, 0.5]]) {
    const ring = new THREE.RingGeometry(W * 0.36 * k, W * 0.36 * k + 1.6, 40, 1, 0, Math.PI);
    ring.rotateX(-Math.PI / 2); ring.scale(1, 1, 0.45); ring.rotateY(f.wall === 'left' ? -Math.PI / 2 : f.wall === 'right' ? Math.PI / 2 : 0);
    const c = f.P(uL, f.wy + 0.6, lipB + 10);
    kit.put('clear', ring, C.water, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z), 0.18 * w);
  }
  // intake: a smoky tube from the box over the glass and down, its slotted strainer at the foot
  const ib = 22;
  kit.tube(inC.bk, [f.P(uI, yTop - 30, -t - 30), f.P(uI, f.H + 16, -t - 12), f.P(uI, f.H + 16, ib * 0.5), f.P(uI, f.H - 8, ib), f.P(uI, stY + 90, ib)], it, inC.c, inC.bk === 'clear' ? inC.base : 0, 12);
  kit.rod(inC.bk, f.P(uI, stY + 90, ib), f.P(uI, stY + 70, ib), it, inC.c, { r2: it + 3, base: inC.base });
  strainer(f, f.P(uI, stY, ib), 70 * Math.sqrt(s), it + 4, stC);
  f.kit.rod('wet', f.P(uI, stY - 2, ib), f.P(uI, stY, ib), it + 4, C.black, { seg: 16 });
  void D;
}

/** A slotted intake strainer standing at p (its foot), height h, radius r: dark bars round a darker core. */
export function strainer(f: Frame, p: THREE.Vector3, h: number, r: number, col: { c: number; bk: Bucket; base: number } = { c: C.grey, bk: 'wet', base: 0.06 }) {
  const { kit } = f;
  kit.rod('wet', p, p.clone().add(V(0, h, 0)), r * 0.72, 0x0e0f10, { seg: 16 });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, o = V(Math.cos(a) * r * 0.86, 0, Math.sin(a) * r * 0.86);
    kit.box(col.bk, p.clone().add(o).add(V(0, h / 2, 0)), 2.4, h, 3, col.c, 0, -a, col.base);
  }
  kit.rod(col.bk, p.clone().add(V(0, h - 3, 0)), p.clone().add(V(0, h, 0)), r, col.c, { seg: 18, base: col.base });
}

export function sponge(f: Frame, m: FilterModel, sp: Spot, pr?: FilterProduct) {
  const { kit } = f, s = flowScale(m, 40), r = pr ? pr.bodyMm.w / 2 : 34 * s, h = pr?.bodyMm.h ?? 110 * s, b = Math.max(r + 8, sp.b ?? 0);
  const L = pr?.colors, baseC = hexOr(L?.accent && /base/i.test(L.accent.where) ? L.accent.hex : L?.body?.hex, C.charcoal), capC = hexOr(L?.lid?.hex ?? L?.body?.hex, C.grey), tubeC = partOf(L?.intake ?? L?.outlet, C.grey);
  const u = f.slot(sp.fixed ? sp.u : sp.u + r, 2 * r + 8, 0, h + 40, 0, 2 * r + 12, sp.fixed), g = f.ground(u, b) - 6;
  const sP = pr?.spongeParts;
  if (sP) {
    // a measured product, part by part from the bottom up (base disc, neck, fluted sponge, collar, a lift tube at its own
    // length whose top lets the bubbles out under water)
    let y = g + 6;
    const seg = (mm: number, dia: number, c: number) => { kit.rod('wet', f.P(u, y, b), f.P(u, y + mm, b), dia / 2, c, { seg: 28 }); y += mm; };
    seg(sP.baseMm, sP.baseDiaMm, baseC);
    if (sP.neckMm) seg(sP.neckMm, sP.neckDiaMm ?? sP.baseDiaMm * 0.75, baseC);
    const sh = sP.spongeMm, fl = sP.flutes ?? 0, sg = new THREE.CylinderGeometry(r, r, sh, 48, 12), q = sg.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), yy = q.getY(i), z = q.getZ(i), rr = Math.hypot(x, z);
      if (rr < r * 0.9) continue;
      // narrow grooves cut into the foam (cos^8 peaks), a little foam roughness, edges softened
      const groove = fl ? 0.16 * Math.max(0, Math.cos(Math.atan2(z, x) * fl)) ** 8 : 0;
      const k = 1 - groove + 0.04 * (hash(x, yy, z) - 0.5) - 0.03 * (Math.abs(yy) / (sh / 2)) ** 4;
      q.setX(i, x * k); q.setZ(i, z * k);
    }
    sg.computeVertexNormals();
    kit.put('wet', sg, hexOr(L?.sponge, C.sponge), new THREE.Matrix4().makeTranslation(f.P(u, 0, b).x, y + sh / 2, f.P(u, 0, b).z), 0, 0.22);
    y += sh;
    seg(sP.collarMm, sP.collarDiaMm, capC);
    // the acrylic tube reads silvery in the water, so it is drawn more solid than other clear parts
    kit.rod(tubeC.bk, f.P(u, y, b), f.P(u, y + sP.tubeMm, b), sP.tubeDiaMm / 2, tubeC.c, { seg: 14, base: Math.max(tubeC.base, 0.75) });
    const top = f.P(u, Math.min(y + sP.tubeMm, f.wy - 2), b);
    bubbles(f, top, f.wy, 6, 2.2);
    airPump(f, u, top, b);
    return;
  }
  // weighted base, the sponge (a soft, porous column), its cap and the lift tube
  kit.rod('wet', f.P(u, g, b), f.P(u, g + 14, b), r + 5, baseC, { seg: 28 });
  const sg = new THREE.CylinderGeometry(r, r, h, 36, 18);
  const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr > r * 0.9) { const k = 1 + 0.05 * (hash(x, y, z) - 0.5) - 0.02 * (Math.abs(y) / (h / 2)) ** 4; p.setX(i, x * k); p.setZ(i, z * k); } }
  sg.computeVertexNormals();
  kit.put('wet', sg, hexOr(L?.sponge, C.sponge), new THREE.Matrix4().makeTranslation(f.P(u, 0, b).x, g + 14 + h / 2, f.P(u, 0, b).z), 0, 0.22);
  kit.rod('wet', f.P(u, g + 14 + h, b), f.P(u, g + 22 + h, b), r * 0.92, capC, { seg: 28 });
  const tt = Math.max(g + 22 + h + 30, f.wy - 25);
  kit.rod(tubeC.bk, f.P(u, g + 22 + h, b), f.P(u, tt, b), 9 * Math.sqrt(s), tubeC.c, { seg: 14, base: tubeC.base });
  kit.rod('wet', f.P(u, tt, b), f.P(u, tt + 6, b), 11 * Math.sqrt(s), hexOr(L?.outlet?.hex, C.charcoal), { seg: 14 });
  bubbles(f, f.P(u, tt + 4, b), f.wy, 6, 2.2);
  airPump(f, u, f.P(u, tt + 6, b), b);
}

export function internal(f: Frame, m: FilterModel, sp: Spot, pr?: FilterProduct) {
  const { kit } = f, s = flowScale(m, 80), w = pr?.bodyMm.w ?? 62 * s, d = pr?.bodyMm.d ?? 50 * s, h = pr?.bodyMm.h ?? 150 * s, b = d / 2 + 9;
  const L = pr?.colors, body = partOf(L?.body, C.charcoal), head = partOf(L?.motor ?? L?.lid, C.black), noz = hexOr(L?.outlet?.hex ?? L?.motor?.hex, C.black);
  const yT = lerp(Math.min(f.ground(sp.u, b) + h + 10, f.wy - 22), f.wy - 22, sp.y ?? 1), yB = yT - h, u = f.slot(sp.fixed ? sp.u : sp.u + w / 2, w + 6, yB, yT, 0, d + 12, sp.fixed);
  f.box(body.bk, f.P(u, yB + h / 2, b), w, h, d, body.c, 6, body.base);
  if (body.bk === 'clear') f.box('wet', f.P(u, yB + h * 0.45, b), w * 0.8, h * 0.6, d * 0.75, hexOr(L?.sponge, C.sponge), 4); // the sponge seen through
  // intake slots round the bottom third, the head with its outlet nozzle, two suction cups
  for (let i = 0; i < 6; i++) f.box('wet', f.P(u, yB + 10 + i * 7, b + d / 2 + 0.2), w * 0.72, 2.2, 1, 0x0b0c0d);
  f.box(head.bk, f.P(u, yT - 14, b), w + 3, 28, d + 3, head.c, 6, head.base);
  kit.rod('wet', f.P(u, yT - 14, b + d / 2), f.P(u, yT - 14, b + d / 2 + 22), 7, noz, { r2: 9 });
  if (L?.accent) f.box('wet', f.P(u, yT + 1.5, b), w * 0.7, 3, d * 0.7, hexOr(L.accent.hex, C.grey), 1); // a coloured cartridge top (Tetra Whisper i: green)
  for (const k of [-0.25, 0.25]) sucker(f, u + k * w, yB + h * 0.55, 9, L?.cups);
  kit.tube('room', overRim(f, u + w * 0.3, f.P(u + w * 0.3, yT, b), b, f.top + 20), 2.6, C.black, 0, 6);
}

export function canister(f: Frame, m: FilterModel, sp: Spot, prod?: FilterProduct) {
  const { kit, t } = f, s = flowScale(m, 265), pr = 7.5, gap = clamp(f.T.L * 0.18, 110, 320);
  // a real product (lane TG step 3): its own pipe, hose and body colours (Fluval / Eheim pipes are opaque plastic, not glass)
  const L = prod?.colors, pipeL = L?.intake ?? L?.outlet, pipe = pipeL ? partOf(pipeL, C.grey) : { c: C.glass, bk: 'clear' as Bucket, base: 0.13 };
  const hoseC = hexOr(L?.hose, C.hose), bodyC = hexOr(L?.body?.hex, C.charcoal), headC = hexOr(L?.lid?.hex ?? L?.motor?.hex, C.grey), acc = (re: RegExp) => (L?.accent && re.test(L.accent.where) ? L.accent.hex : undefined);
  const clipC = hexOr(L?.clips?.hex ?? acc(/clamp|clip|latch/i) ?? L?.motor?.hex, C.black), valveC = hexOr(acc(/tap|valve|connector/i) ?? L?.motor?.hex, C.black);
  const u0 = sp.fixed ? sp.u - gap / 2 : sp.u + 10, stY = f.ground(u0, 22) + 40;
  const uI = f.slot(u0, 30, stY, f.wy, 0, 40, sp.fixed);
  const uO = f.slot(uI + gap, 70, f.wy - 90, f.wy, 0, 70, sp.fixed);
  const ib = 18, outB = -t - 16, hoseY = f.H - 30;
  // intake lily pipe: glass, over the rim, straight down to its slotted basket
  const intake = [f.P(uI, hoseY, outB), f.P(uI, f.H + 10, outB + 2), f.P(uI, f.H + 26, (ib - t) / 2), f.P(uI, f.H + 6, ib), f.P(uI, stY + 80, ib)];
  kit.tube(pipe.bk, intake, pr, pipe.c, pipe.bk === 'clear' ? pipe.base : 0, 14);
  kit.rod(pipe.bk, f.P(uI, stY, ib), f.P(uI, stY + 80, ib), pr + 4, pipe.c, { base: pipe.base + 0.01, seg: 18 });
  for (let i = 0; i < 9; i++) f.box('wet', f.P(uI, stY + 14 + i * 6, ib + pr + 4), 8, 1.2, 0.6, 0x9fb2b4); // the slits, catching the light
  // outlet lily pipe: over the rim, down under the surface, turning forward into the flared lily
  const oy = f.wy - 55;
  const out = [f.P(uO, hoseY, outB), f.P(uO, f.H + 10, outB + 2), f.P(uO, f.H + 26, (ib - t) / 2), f.P(uO, f.H + 6, ib), f.P(uO, oy + 30, ib), f.P(uO, oy + 4, ib + 8), f.P(uO, oy, ib + 30)];
  kit.tube(pipe.bk, out, pr, pipe.c, pipe.bk === 'clear' ? pipe.base : 0, 14);
  kit.lathe(pipe.bk, [[pr, 0], [pr + 1, 6], [pr + 5, 14], [pr + 13, 20], [pr + 15, 21]], f.P(uO, oy, ib + 29), V(0, 0, 1), pipe.c, pipe.base + 0.02, 28);
  // hoses down the back, into the stand and the canister in it
  const standY = f.S.stand.show ? f.top : f.floor;
  for (const [uu, p] of [[uI, intake[0]], [uO, out[0]]] as [number, THREE.Vector3][]) {
    kit.rod('room', p, p.clone().add(V(0, -40, 0)), pr + 4, C.charcoal, { seg: 12 }); // the hose clamp / connector
    kit.tube('room', [p.clone().add(V(0, -40, 0)), f.P(uu, (standY + p.y) / 2, outB - 6), f.P(uu, standY + 30, outB - 10), f.P(uu, standY - 30, outB - 10 + (f.S.stand.show ? 60 : -20))], 10, hoseC, 0, 10);
  }
  if (f.S.stand.show) {
    const r = prod ? prod.bodyMm.w / 2 : 95 * s, ch = prod?.bodyMm.h ?? 380 * s, cu = clamp(f.T.L * 0.25, r + 20, f.T.L - r - 20), cb = f.T.D * 0.45;
    const c0 = f.P(cu, f.floor, cb);
    kit.rod('room', c0, c0.clone().add(V(0, ch * 0.78, 0)), r, bodyC, { seg: 32 });
    if (L?.foot) kit.rod('room', c0, c0.clone().add(V(0, ch * 0.06, 0)), r * 1.04, hexOr(L.foot.hex, bodyC), { seg: 32 }); // a foot ring in its own colour (Fluval 07)
    kit.rod('room', c0.clone().add(V(0, ch * 0.78, 0)), c0.clone().add(V(0, ch, 0)), r * 0.96, headC, { seg: 32, r2: r * 0.8 });
    for (const k of [-1, 1]) kit.box('room', c0.clone().add(V(k * r * 0.95, ch * 0.8, 0)), 16, 34, 30, clipC, 4); // the clips
    kit.rod('room', c0.clone().add(V(0, ch, 0)), c0.clone().add(V(0, ch + 45, 0)), 18, valveC, { seg: 16 }); // valve block
    for (const k of [-1, 1]) kit.tube('room', [c0.clone().add(V(k * 12, ch + 40, 0)), c0.clone().add(V(k * 20, ch + 120, -cb * 0.4)), f.P(k < 0 ? uI : uO, f.top - 40, -40)], 10, hoseC, 0, 10);
  }
}

