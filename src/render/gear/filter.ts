// Filter models: hang-on-back, sponge, internal and canister. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { type FilterModel } from '../../demand/gear';
import { type FilterProduct } from '../../data/gearCatalog';
import { backdropDepth, clamp } from '../../scene/physics';
import { standInside } from '../../scene/standspace';
import { cabinetGear } from '../../scene/cabinetGear';
import { Bucket, V, hash, C, flowScale, hexOr, partOf, Frame, Spot, lerp, sucker, overRim, behind } from './common';
import { airPump, bubbles } from './pump';

/** Clear room kept between a hang-on-back body and the end of the wall it hangs on, mm. */
const HOB_MARGIN = 10;

export function hob(f: Frame, m: FilterModel, sp: Spot, pr?: FilterProduct) {
  const { kit, t } = f, s = pr?.gph ? Math.cbrt(pr.gph / 100) : flowScale(m, 100), yTop = f.H + 28;
  // the body fits the glass it hangs on (lane FL2, 2026-11-06): never wider than the wall less a margin each end, and its motor never lower than the floor
  const M = HOB_MARGIN, W = Math.min(pr?.bodyMm.w ?? 150 * s, Math.max(60, f.len - 2 * M)), D = pr?.bodyMm.d ?? 105 * s, Hb = Math.max(60, Math.min(pr?.bodyMm.h ?? 170 * s, yTop - 40 - f.floor));
  // a real product (lane TG step 3): its own colours part by part; an intake shorter than the tank leaves the strainer up in the water
  const L = pr?.colors, body = partOf(L?.body, C.charcoal, 'room'), lid = partOf(L?.lid, C.grey, 'room'), motor = hexOr(L?.motor?.hex, C.black);
  const lip = partOf(L?.outlet ?? (L?.body?.translucent ? undefined : L?.body), C.charcoal), inC = partOf(L?.intake, C.grey), stC = partOf(L?.strainer ?? L?.intake, C.grey);
  // intake tube radius; the strainer (sh tall) stands clear of the ground and its top stays under the water line, so a short tank gets a short intake
  const it = 8 * Math.sqrt(s), sh = 70 * Math.sqrt(s), g0 = f.ground(sp.u, 26) + 8, stY = Math.max(g0, Math.min(Math.max(g0 + 37, pr?.intakeMm ? f.H + 16 - pr.intakeMm : -Infinity), f.wy - sh - 30));
  const uS = f.slot(sp.fixed ? sp.u - W / 2 + 12 : sp.u + 12, 30, stY, f.wy, 0, 50, sp.fixed); // only the intake takes wall room: the body is outside
  // the whole body stays over the glass: it never starts past either end of the wall, and the intake (12 mm in from its edge) moves with it
  const u = clamp(uS - 12 + W / 2, M + W / 2, f.len - M - W / 2), uI = u - W / 2 + 12;
  if (uI !== uS) f.taken.push([uI - 15, uI + 15]);
  // on a curved back (round, hex, pie) the box stands back of the farthest point of the glass under it, so no corner reaches into the water
  const qOf = (v: number) => f.P(v, 0, 0).dot(f.inward), q0 = qOf(u), bF = Math.min(...[u - W / 2, u - W / 4, u, u + W / 4, u + W / 2].map(qOf)) - q0 - t - 6;
  // the body behind the back glass, its lid and the motor housing
  const bc = f.P(u, yTop - Hb / 2, bF - D / 2);
  f.box(body.bk, bc, W, Hb, D, body.c, 10, body.base);
  if (body.bk === 'clear') f.box('room', f.P(u, yTop - Hb * 0.55, bF - D / 2), W * 0.8, Hb * 0.7, D * 0.7, hexOr(L?.sponge, 0x3a3f44), 4); // the media seen through a tinted body
  f.box(lid.bk, f.P(u, yTop + 4, bF - D / 2), W, 8, D, lid.c, 6, lid.base);
  f.box('room', f.P(u - W * 0.22, yTop - Hb - 18, bF + 2 - D * 0.35), 46 * s, 36, 46 * s, motor, 8); // motor under the box
  if (L?.accent && !/wheel|window/i.test(L.accent.where)) f.box('room', f.P(u - W * 0.3, yTop + 8.5, bF - D * 0.25), W * 0.22, 2, D * 0.18, hexOr(L.accent.hex, C.grey), 1); // a coloured latch / tab on top (Seachem blue)
  if (L?.accent && /wheel/i.test(L.accent.where)) kit.rod('room', f.P(u + W * 0.3, yTop - Hb * 0.35, bF - D), f.P(u + W * 0.3, yTop - Hb * 0.35, bF - D - 6), Hb * 0.3, hexOr(L.accent.hex, C.grey), { seg: 28 }); // a Bio-Wheel at the back
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
  // (kept inside the glass: the rings shrink to the room the tank has either side of the lip and in front of it)
  const rk = Math.min(1, (Math.min(uL, f.len - uL) - 8) / (W * 0.9), (f.T.D - backdropDepth(f.S.backdrop, f.T) - lipB - 20) / (W * 0.4));
  for (const [k, w] of [[1, 0.9], [1.7, 0.7], [2.5, 0.5]]) {
    const rr = W * 0.36 * k * Math.max(0.1, rk), ring = new THREE.RingGeometry(rr, rr + 1.6, 40, 1, 0, Math.PI);
    ring.rotateX(-Math.PI / 2); ring.scale(1, 1, 0.45); ring.rotateY(f.wall === 'left' ? -Math.PI / 2 : f.wall === 'right' ? Math.PI / 2 : 0);
    const c = f.P(uL, f.wy + 0.6, lipB + 10);
    kit.put('clear', ring, C.water, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z), 0.18 * w);
  }
  // intake: a smoky tube from the box over the glass and down, its slotted strainer at the foot
  const ib = 22;
  kit.tube(inC.bk, [f.P(uI, yTop - 30, bF - 24), f.P(uI, f.H + 16, bF - 6), f.P(uI, f.H + 16, ib * 0.5), f.P(uI, f.H - 8, ib), f.P(uI, stY + sh + 20, ib)], it, inC.c, inC.bk === 'clear' ? inC.base : 0, 12);
  kit.rod(inC.bk, f.P(uI, stY + sh + 20, ib), f.P(uI, stY + sh, ib), it, inC.c, { r2: it + 3, base: inC.base });
  strainer(f, f.P(uI, stY, ib), sh, it + 4, stC);
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
  const { kit } = f, s = flowScale(m, 40), r = pr ? pr.bodyMm.w / 2 : 34 * s, b = clamp(Math.max(r + 8, sp.b ?? 0), r + 8, Math.max(r + 8, f.T.D - backdropDepth(f.S.backdrop, f.T) - r - 8));
  // a generic sponge's lift tube ends under the water line, so its height fits the water a short tank holds (lane FL2, 2026-11-06)
  const h = pr?.bodyMm.h ?? Math.max(40, Math.min(110 * s, f.wy - f.ground(sp.u, b) - 62));
  const L = pr?.colors, baseC = hexOr(L?.accent && /base/i.test(L.accent.where) ? L.accent.hex : L?.body?.hex, C.charcoal), capC = hexOr(L?.lid?.hex ?? L?.body?.hex, C.grey), tubeC = partOf(L?.intake ?? L?.outlet, C.grey);
  const u = clamp(f.slot(sp.fixed ? sp.u : sp.u + r, 2 * r + 8, 0, h + 40, 0, 2 * r + 12, sp.fixed), r + 8, Math.max(r + 8, f.len - r - 8)), g = f.ground(u, b) - 6;
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
  const { kit } = f, s = flowScale(m, 80), w = pr?.bodyMm.w ?? 62 * s, d = pr?.bodyMm.d ?? 50 * s, b = Math.min(d / 2 + 9, Math.max(d / 2 + 2, f.T.D - backdropDepth(f.S.backdrop, f.T) - d / 2 - 6));
  // the body stands on the floor under the water line (never through the base of a short tank): its height fits the water, head included (lane FL2, 2026-11-06)
  const h = Math.max(50, Math.min(pr?.bodyMm.h ?? 150 * s, f.wy - 22 - f.ground(sp.u, b) - 6));
  const L = pr?.colors, body = partOf(L?.body, C.charcoal), head = partOf(L?.motor ?? L?.lid, C.black), noz = hexOr(L?.outlet?.hex ?? L?.motor?.hex, C.black);
  const yT = lerp(Math.min(f.ground(sp.u, b) + h + 10, f.wy - 22), f.wy - 22, sp.y ?? 1), yB = yT - h, u = clamp(f.slot(sp.fixed ? sp.u : sp.u + w / 2, w + 6, yB, yT, 0, d + 12, sp.fixed), w / 2 + 8, Math.max(w / 2 + 8, f.len - w / 2 - 8));
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
  const { kit, t } = f, s = flowScale(m, 265), pr = 7.5, gap = Math.min(clamp(f.T.L * 0.18, 110, 320), Math.max(60, f.len - 100)); // both pipes stay inside the glass on a short tank
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
  // hoses down the back and the canister: in a cabinet, in through grommeted holes in its back panel (lane CB1, Nathan 2026-11-12:
  // "have lines enter the cabinet through the back"); a canister too tall for the cabinet stands beside it on the floor
  const standY = f.S.stand.show ? f.top : f.floor, st = f.S.stand, cab = st.show && (st.style === 'cabinet' || st.style === 'custom');
  const r = prod ? prod.bodyMm.w / 2 : 95 * s, ch = prod?.bodyMm.h ?? 380 * s, room = standInside(f.S);
  const cg = cabinetGear(f.S), beside = cg ? cg.canisterBeside : st.show && !!room && (ch + 60 > room.H || 2 * r + 20 > room.L); // does not fit (with the rest of the gear): on the floor next to the stand (the Checks strip says so)
  const cu = f.T.L >= 2 * r + 40 ? clamp(f.T.L * 0.25, r + 20, f.T.L - r - 20) : f.T.L / 2, cb = f.T.D * 0.45;
  const c0 = beside ? V(f.side === 'left' ? -f.t - r - 90 : f.T.L + f.t + r + 90, f.floor, -f.T.D * 0.3) : cg?.canisterX != null ? V(cg.canisterX, f.floor, f.P(cu, f.floor, cb).z) : f.P(cu, f.floor, cb); // cabinet: the gear row's place (scene/cabinetGear.ts)
  const valve = (k: number) => c0.clone().add(V(k * 12, ch + 40, 0));
  const hy = f.top - 120; // the holes' height in the cabinet's back panel (its outer face = the glass's, behind any backdrop: behind())
  for (const [uu, p, k] of [[uI, intake[0], -1], [uO, out[0], 1]] as [number, THREE.Vector3, number][]) {
    kit.rod('room', p, p.clone().add(V(0, -40, 0)), pr + 4, C.charcoal, { seg: 12 }); // the hose clamp / connector
    const s0 = p.clone().add(V(0, -40, 0)), v = valve(k);
    if (cab && !beside) {
      const o = behind(f, uu, hy, -14), inside = behind(f, uu, hy, 55);
      kit.rod('room', behind(f, uu, hy, -2), behind(f, uu, hy, 20), 17, C.black, { seg: 20 }); // the grommet in the panel's hole
      kit.tube('room', [s0, behind(f, uu, (hy + s0.y) / 2, -14), behind(f, uu, hy + 40, -14), o, inside, V(v.x, hy - 40, inside.z + 20), V(v.x, v.y + 50, c0.z), v], 10, hoseC, 0, 10);
    } else if (beside) {
      const low = behind(f, uu, f.floor + 30, -14 - k * 10);
      kit.tube('room', [s0, behind(f, uu, (standY + s0.y) / 2, -14), low, V(v.x, f.floor + 30, low.z), V(v.x, f.floor + 80, c0.z), v], 10, hoseC, 0, 10);
    } else kit.tube('room', [s0, f.P(uu, (standY + p.y) / 2, outB - 6), f.P(uu, standY + 30, outB - 10), f.P(uu, standY - 30, outB - 10 + (st.show ? 60 : -20))], 10, hoseC, 0, 10);
  }
  if (st.show) {
    kit.rod('room', c0, c0.clone().add(V(0, ch * 0.78, 0)), r, bodyC, { seg: 32 });
    if (L?.foot) kit.rod('room', c0, c0.clone().add(V(0, ch * 0.06, 0)), r * 1.04, hexOr(L.foot.hex, bodyC), { seg: 32 }); // a foot ring in its own colour (Fluval 07)
    kit.rod('room', c0.clone().add(V(0, ch * 0.78, 0)), c0.clone().add(V(0, ch, 0)), r * 0.96, headC, { seg: 32, r2: r * 0.8 });
    for (const k of [-1, 1]) kit.box('room', c0.clone().add(V(k * r * 0.95, ch * 0.8, 0)), 16, 34, 30, clipC, 4); // the clips
    kit.rod('room', c0.clone().add(V(0, ch, 0)), c0.clone().add(V(0, ch + 45, 0)), 18, valveC, { seg: 16 }); // valve block
    if (!cab && !beside) for (const k of [-1, 1]) kit.tube('room', [c0.clone().add(V(k * 12, ch + 40, 0)), c0.clone().add(V(k * 20, ch + 120, -cb * 0.4)), f.P(k < 0 ? uI : uO, f.top - 40, -40)], 10, hoseC, 0, 10);
  }
}

