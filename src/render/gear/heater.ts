// Heater models. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { heaterProduct } from '../../data/gearCatalog';
import { clamp } from '../../scene/physics';
import { UP, V, along, roundedBox, C, Frame, Spot, lerp, sucker, overRim } from './common';

// ---------- the frame the gear is placed in ----------

/** A heater's glass length (mm) by its rating: a typical compact tube of that class (Nathan 2026-10-19: the longer
 *  brands made them look oversized); a real product's own length comes with the gear catalogue. */
export function heaterLength(watts: number) {
  const t: [number, number][] = [[25, 150], [50, 190], [100, 240], [200, 290], [300, 320], [500, 400]];
  for (let i = 1; i < t.length; i++) if (watts <= t[i][0]) { const [w0, l0] = t[i - 1], [w1, l1] = t[i]; return l0 + (l1 - l0) * clamp((watts - w0) / (w1 - w0), 0, 1); }
  return t[t.length - 1][1];
}
export function heater(f: Frame, watts: number, sp: Spot, product?: string) {
  // a real product at its own size (overall length = cap + tube + foot), else the generic tube for the rating; the cap is
  // 44 mm (36 grip + 8 dial) and the foot 24 mm past the tube, both shrunk on a short heater (a 105 mm mini is not mostly cap)
  const hp = heaterProduct(product), cl = hp ? Math.min(44, Math.round(hp.lengthMm * 0.22)) : 44, fl = cl * 24 / 44, fe = hp?.colors?.foot ? fl : 0;
  const { kit } = f, len = hp ? Math.max(40, hp.lengthMm - cl - fe) : heaterLength(watts), r = hp ? hp.diaMm / 2 : watts >= 500 ? 14 : 11, b = r + 9, u0 = sp.u;
  // a heater stands about 10 mm off the gravel with its cap just under the surface (fully submersible)
  const g0 = Math.max(f.ground(u0, b), 0) + 10, room = f.wy - 5 - g0;
  // vertical when it fits under the water line, else lying flat low along the glass (Nathan 2026-10-19: tilted heaters
  // are rare); turned only when the owner turns it (Shift + wheel), and then never so upright that it leaves the water
  const fits = len + cl <= room, need = fits ? 0 : Math.acos(clamp(room / (len + cl), 0, 1));
  const tilt = sp.lean != null ? Math.max(need, Math.abs(sp.lean) * Math.PI / 180) : fits ? 0 : Math.PI / 2, sgn = (sp.lean ?? 1) < 0 ? -1 : 1, span = (len + cl) * Math.sin(tilt); // along the glass, cap included
  const u = f.slot(sp.fixed ? u0 : u0 + span / 2, 2 * r + 6 + span, g0, f.wy, 0, 2 * r + 12, sp.fixed);
  // the cap's top: at most 15 mm under the water line, at least the heater's height off the ground (the owner's height
  // share between; default: high when upright, low when lying flat)
  const ext = Math.max((len + cl) * Math.cos(tilt), 2 * r + 4), capY = lerp(Math.min(g0 + ext, f.wy - 5), f.wy - 5, sp.y ?? (tilt > 1.2 ? 0 : 1));
  const topY = capY - cl * Math.cos(tilt) - r * Math.sin(tilt), dir = f.along.clone().multiplyScalar(-sgn * Math.sin(tilt)).add(V(0, Math.cos(tilt), 0)); // the cap toward the corner
  const top = f.P(u - sgn * (span / 2 - cl * Math.sin(tilt)), topY, b), bot = top.clone().addScaledVector(dir, -len);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  // every part in the product's own colours (catalogue `colors`, from photos); the generic heater: clear glass, a white
  // core with a copper-brown wire, a black cap
  const L = hp?.colors, hx = (h: string | undefined, d: number) => (h && /^#[0-9a-f]{6}$/i.test(h) ? parseInt(h.slice(1), 16) : d);
  const tube = L?.tube.kind ?? (hp?.look === 'titanium' ? 'metal' : 'glass'), guard = L ? L.guard.has : hp?.look === 'shroud';
  const capC = hx(L?.cap.hex, C.black), guardC = hx(L?.guard.hex, C.charcoal), elemC = hx(L?.element.hex, C.copper), tubeC = hx(L?.tube.hex, tube === 'metal' ? 0x8b9096 : C.glass);
  const cordC = hx(L?.cord, C.black), ri = guard ? r - 2.5 : r;
  if (L?.shape === 'flat') {
    // a flat body (e.g. a heater in a slim rectangular housing): a rounded slab on the glass in the body colour
    const mid = bot.clone().lerp(top, 0.5), w = r * 2.2, d = r * 1.3;
    kit.put('wet', roundedBox(w, len, d, Math.min(6, d / 2)), guard ? guardC : capC, along(mid, dir, 0).multiply(new THREE.Matrix4().makeRotationY(f.yaw)));
  } else if (tube === 'metal') kit.rod('wet', bot, top, r, tubeC, { seg: 20 }); // a metal tube, nothing to see inside
  else if (tube === 'opaque') {
    // a solid sleeve with a clear window (the element and any thermometer show through it)
    const [w0, w1] = L?.tube.window ?? [0, 0], at = (k: number) => bot.clone().lerp(top, k);
    if (w0 > 0) kit.rod('wet', bot, at(w0), r, tubeC, { seg: 20 });
    if (w1 < 1) kit.rod('wet', at(w1), top, r, tubeC, { seg: 20 });
    if (w1 > w0) {
      kit.rod('clear', at(w0), at(w1), r, C.glass, { seg: 20, base: 0.07 });
      kit.rod('wet', at(w0), at(w1), r * 0.55, hx(L?.element.hex, C.ceramic), { seg: 12 });
      if (L?.thermometer) {
        const sideO = f.inward.clone().multiplyScalar(r * 0.7);
        f.box('wet', at((w0 + w1) / 2).add(sideO), 5, (w1 - w0) * len * 0.9, 0.8, 0xf2f2ee);
        f.box('wet', at(w0 + (w1 - w0) * 0.35).add(sideO).addScaledVector(f.inward, 0.6), 1.4, (w1 - w0) * len * 0.5, 0.6, 0xc8322a);
      }
    }
  } else {
    kit.rod('clear', bot, top, ri, tubeC, { seg: 20, base: tube === 'frosted' ? 0.35 : tube === 'hidden' ? 0.6 : 0.07 });
    // what shows inside: a core with the wire wound round it, or the wire alone
    const kind = L?.element.kind ?? 'coil', c0 = bot.clone().addScaledVector(dir, len * 0.12), c1 = top.clone().addScaledVector(dir, -len * 0.1);
    if (kind === 'coil') kit.rod('wet', c0, c1, ri * 0.6, C.ceramic, { seg: 12 });
    if (kind === 'core') kit.rod('wet', c0, c1, ri * 0.72, elemC, { seg: 12 }); // a solid core (a PTC block), no wire
    else if (kind !== 'none' && tube !== 'hidden') {
      const turns = Math.round((len * 0.7) / 6), cl = c1.distanceTo(c0), coil: THREE.Vector3[] = [], rw = kind === 'wire' ? ri * 0.45 : ri * 0.66;
      for (let i = 0; i <= turns * 8; i++) { const a = (i / 8) * Math.PI * 2, h = (i / (turns * 8)) * cl; coil.push(V(Math.cos(a) * rw, h, Math.sin(a) * rw).applyQuaternion(q).add(c0)); }
      kit.put('wet', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), turns * 8, kind === 'wire' ? 0.7 : 0.45, 4, false), elemC);
    }
    // a guard over the glass: bars round it (slots: 8, mesh: 16) or a solid sleeve, rings at the ends and the middle
    if (guard) {
      const pat = L?.guard.pattern ?? 'slots';
      if (pat === 'solid') kit.rod('wet', bot, top, r, guardC, { seg: 20 });
      else for (let i = 0, n = pat === 'mesh' ? 16 : 8; i < n; i++) { const a = (i / n) * Math.PI * 2, o = V(Math.cos(a) * (r - 1), 0, Math.sin(a) * (r - 1)).applyQuaternion(q); kit.rod('wet', bot.clone().add(o), top.clone().add(o), pat === 'mesh' ? 1 : 1.6, guardC, { seg: 5 }); }
      for (const k of pat === 'mesh' ? [0.02, 0.26, 0.5, 0.74, 0.98] : [0.02, 0.5, 0.98]) kit.rod('wet', bot.clone().lerp(top, k - 0.015), bot.clone().lerp(top, k + 0.015), r, guardC, { seg: 20 });
    }
  }
  // the cap (with its dial), the rounded foot, the pilot light or display
  const cg = cl * 36 / 44, ribs = (a: THREE.Vector3, l: number, rad: number, c: number) => { for (let i = 0; i < 6; i++) kit.rod('wet', a.clone().addScaledVector(dir, (l * i) / 6), a.clone().addScaledVector(dir, (l * (i + 0.6)) / 6), rad + (i % 2 ? 0 : 1.2), c, { seg: 20 }); };
  if (L?.cap.ribbed) { kit.rod('wet', top, top.clone().addScaledVector(dir, cg), r + 1, capC, { seg: 20 }); ribs(top, cg, r + 2, capC); }
  else kit.rod('wet', top, top.clone().addScaledVector(dir, cg), r + 2, capC, { seg: 20 });
  kit.rod('wet', top.clone().addScaledVector(dir, cg), top.clone().addScaledVector(dir, cl), r - 1, L?.cap.dial === false ? capC : new THREE.Color(capC).multiplyScalar(0.8).getHex(), { seg: 20 });
  if (L?.foot) { const fc = hx(L.foot.hex, capC), f0 = bot.clone().addScaledVector(dir, -fl); kit.rod('wet', f0, bot.clone().addScaledVector(dir, 4), r + 1, fc, { seg: 20 }); if (L.foot.ribbed) ribs(f0, fl + 4, r + 2, fc); }
  else if (L?.shape !== 'flat') kit.ball('wet', bot.clone().addScaledVector(dir, 2), r * 0.98, guard ? guardC : capC, 0, 1);
  if (L?.cap.display) kit.put('glow', new THREE.PlaneGeometry(r * 1.1, 14), hx(L.cap.display, 0x66ccff), along(top.clone().addScaledVector(dir, cl * 20 / 44).addScaledVector(f.inward, r + 2.1), dir, 0).multiply(new THREE.Matrix4().makeRotationY(f.wall === 'back' ? 0 : Math.PI / 2)));
  if (!L || L.cap.led) kit.ball('glow', top.clone().addScaledVector(dir, cl / 2).addScaledVector(f.inward, r + 1.5), 2.2, hx(L?.cap.led, C.amber));
  // the cord up out of the water and over the rim, and two clips with suction cups
  const capTop = top.clone().addScaledVector(dir, cl);
  // the cord rises straight up from the cap (not from the heater's middle), so a flat heater's cord does not cross the tank
  const cu = u + capTop.clone().sub(f.P(u, 0, b)).dot(f.along);
  kit.tube('room', overRim(f, cu, capTop, b, f.top + 20), 2.6, cordC, 0, 6);
  // an inline thermostat on the cord (a mini heater's controller): a box hanging on the cord outside the back glass, its
  // digits facing the room side away from the tank
  const ct = L?.controller;
  if (ct) {
    const cy = Math.max(f.top + 30 + ct.hMm / 2, (f.H + f.top) / 2), cb = -f.t - 12 - ct.dMm / 2, cc = f.P(cu, cy, cb);
    f.box('room', cc, ct.wMm, ct.hMm, ct.dMm, hx(ct.hex, C.black), Math.min(4, ct.dMm / 3), f.yaw);
    if (ct.display) kit.put('glow', new THREE.PlaneGeometry(ct.wMm * 0.6, ct.hMm * 0.25), hx(ct.display, 0xff3030), along(cc.clone().addScaledVector(f.inward, -ct.dMm / 2 - 0.3).setY(cy + ct.hMm * 0.18), UP, 0).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(-f.inward.x, -f.inward.z))));
  }
  const cups = L?.cups ?? 'clear';
  for (const k of [0.25, 0.72]) {
    const p = bot.clone().lerp(top, k);
    kit.put('wet', new THREE.TorusGeometry(r + 1.6, 1.6, 6, 20), capC, along(p, dir, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    const pu = u + p.clone().sub(f.P(u, 0, 0)).dot(f.along);
    sucker(f, pu, p.y, b - r - 1, cups);
  }
}

