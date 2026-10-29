// Shapes of the equipment pieces (lane EN): lit primitives merged with vertex colours, base on y = 0, centred in x and z.
// Detailed on purpose (rounded bodies, grilles, ribs, lathe-turned glass): they are small, but the eye reads them close up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { equipDims } from '../scene/equipment';

type Part = { g: THREE.BufferGeometry; c: string; p?: [number, number, number]; r?: [number, number, number] };
const cyl = (r: number, h: number, rt = r, n = 28) => new THREE.CylinderGeometry(rt, r, h, n);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const rbox = (x: number, y: number, z: number, k: number) => new RoundedBoxGeometry(x, y, z, 3, Math.min(k, x / 2.2, y / 2.2, z / 2.2));
/** A solid of revolution from (radius, y) points, bottom to top (outside faces) or top to bottom (inside faces). */
const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 36);

function build(parts: Part[]) {
  const gs = parts.map(({ g, c, p, r }) => {
    const m = g.clone();
    if (r) m.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r)));
    if (p) m.translate(...p);
    const q = m.index ? m.toNonIndexed() : m, col = new THREE.Color(c), a = new Float32Array(q.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b; }
    for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k);
    q.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return q;
  });
  return mergeGeometries(gs)!;
}

export function equipShape(variant: string, size: number): THREE.BufferGeometry {
  const s = size, [w, h, d] = equipDims(variant, s);
  switch (variant) {
    case 'heater': { // a glass-tube aquarium heater: scale bands, element, ribbed dial, suction feet, cord
      const r = w / 2, P: Part[] = [
        { g: cyl(r * 0.86, h * 0.78), c: '#c3d6dc', p: [0, h * 0.5, 0] },                         // glass tube
        { g: box(r * 0.5, h * 0.62, r * 0.3), c: '#d9822f', p: [0, h * 0.5, r * 0.74] },           // element seen through the front
        { g: lathe([[0, 0], [r * 0.7, 0], [r * 0.9, h * 0.015], [r * 0.9, h * 0.1], [0, h * 0.1]]), c: '#1b1d21' }, // bottom end cap
        { g: cyl(r * 1.08, h * 0.09), c: '#202328', p: [0, h * 0.915, 0] },                        // top cap
        { g: lathe([[0, h * 0.96], [r * 0.9, h * 0.96], [r * 1.02, h * 0.985], [r * 0.8, h * 1.0], [0, h * 1.0]]), c: '#e4e4e0' }, // dial
        { g: box(r * 0.14, h * 0.012, r * 0.55), c: '#d33a2c', p: [0, h * 1.0, r * 0.4] },         // dial pointer
        { g: cyl(r * 0.2, h * 0.14), c: '#15171a', p: [r * 0.95, h * 0.99, 0] },                  // cord
        { g: cyl(r * 0.2, r * 1.6), c: '#15171a', p: [r * 0.95 + r * 0.8, h * 1.05, 0], r: [0, 0, Math.PI / 2] }, // cord leaving sideways
      ];
      for (let i = 0; i < 6; i++) P.push({ g: cyl(r * 0.88, h * 0.006), c: '#7f969e', p: [0, h * (0.17 + i * 0.1), 0] }); // scale rings
      for (const sx of [-1, 1]) P.push({ g: cyl(r * 0.55, h * 0.03, r * 0.9), c: '#17191c', p: [sx * r * 1.5, h * 0.05, 0], r: [0, 0, 0] }, // suction cups
        { g: box(r * 1.2, h * 0.02, r * 0.35), c: '#202328', p: [sx * r * 0.95, h * 0.07, 0] });
      return build(P);
    }
    case 'hobfilter': { // a power filter: rounded body, lid with motor housing, front grille, spillway, rim hooks, intake tube
      const bw = w * 0.94, by = h * 0.68, bh = h * 0.62, P: Part[] = [
        { g: rbox(bw, bh, d, w * 0.08), c: '#2e333a', p: [0, by, 0] },                              // body
        { g: rbox(bw * 1.02, h * 0.07, d * 1.04, w * 0.05), c: '#3d434b', p: [0, by + bh / 2 + h * 0.01, 0] }, // lid
        { g: cyl(d * 0.26, h * 0.06), c: '#23272d', p: [-bw * 0.26, by + bh / 2 + h * 0.06, 0] },   // motor housing
        { g: box(bw * 0.8, h * 0.012, d * 0.3), c: '#4c535b', p: [0, by - bh / 2 + h * 0.06, d * 0.55], r: [0.28, 0, 0] }, // spillway lip
        { g: box(bw * 0.5, bh * 0.2, d * 0.02), c: '#7fa4bb', p: [bw * 0.12, by - bh * 0.28, d * 0.505] }, // media window
        { g: box(bw * 0.1, h * 0.55, d * 0.06), c: '#1a1d21', p: [-bw * 0.36, h * 0.78, -d * 0.52] }, // hook over the rim, left
        { g: box(bw * 0.1, h * 0.55, d * 0.06), c: '#1a1d21', p: [bw * 0.36, h * 0.78, -d * 0.52] },  // hook, right
        { g: cyl(w * 0.05, h * 0.46), c: '#d6e0e4', p: [bw * 0.36, h * 0.25, -d * 0.74] },          // intake tube
        { g: cyl(w * 0.085, h * 0.12), c: '#202328', p: [bw * 0.36, h * 0.06, -d * 0.74] },         // strainer
      ];
      for (let i = 0; i < 7; i++) P.push({ g: box(bw * 0.035, bh * 0.34, d * 0.02), c: '#15171a', p: [-bw * 0.4 + i * bw * 0.07, by + bh * 0.2, d * 0.505] }); // grille slots
      for (let i = 0; i < 3; i++) P.push({ g: box(w * 0.03, h * 0.1, w * 0.012), c: '#14161a', p: [bw * 0.36 + (i - 1) * w * 0.04, h * 0.06, -d * 0.74 + w * 0.085] }); // strainer slits
      return build(P);
    }
    case 'lilypipe': { // a glass lily pipe outflow: turned stem flaring to a hollow bell, with a hose spigot at the foot
      const r = w * 0.15, R = w * 0.5;
      return build([
        { g: lathe([[0, 0], [r * 2.0, 0], [r * 2.0, h * 0.02], [r * 1.25, h * 0.045], [r, h * 0.07], [r, h * 0.6], [r * 1.5, h * 0.7], [R * 0.7, h * 0.83], [R * 0.95, h * 0.93], [R, h * 0.97], [R * 0.97, h]]), c: '#c9e4ea' }, // outside
        { g: lathe([[R * 0.9, h * 0.995], [R * 0.84, h * 0.95], [R * 0.6, h * 0.86], [r * 0.7, h * 0.72], [r * 0.6, h * 0.6]]), c: '#8fb7c2' },                                                     // inside of the bell
        { g: cyl(r * 0.7, h * 0.22), c: '#1f2a2e', p: [r * 2.3, h * 0.06, 0], r: [0, 0, Math.PI / 2] },     // hose stub at the foot
        { g: cyl(r * 0.95, h * 0.03), c: '#2b3a40', p: [r * 3.3, h * 0.06, 0], r: [0, 0, Math.PI / 2] },
      ]);
    }
    case 'mister': { // a mister line: a horizontal PVC pipe with three brass nozzles, end caps, a hose barb and two clips
      const L = w, R = h * 0.17, P: Part[] = [
        { g: cyl(R, L), c: '#e9e9e4', p: [0, h * 0.62, 0], r: [0, 0, Math.PI / 2] },                  // pipe
        { g: cyl(R * 1.18, L * 0.04), c: '#d7d7d1', p: [-L / 2 + L * 0.02, h * 0.62, 0], r: [0, 0, Math.PI / 2] }, // end cap
        { g: cyl(R * 1.18, L * 0.04), c: '#d7d7d1', p: [L / 2 - L * 0.02, h * 0.62, 0], r: [0, 0, Math.PI / 2] },
        { g: cyl(R * 0.55, R * 3), c: '#2b2f34', p: [L / 2 + R * 1.5, h * 0.62, 0], r: [0, 0, Math.PI / 2] },    // hose barb
      ];
      for (const f of [-0.33, 0, 0.33]) P.push(
        { g: cyl(R * 0.7, h * 0.3), c: '#c9a24c', p: [f * L, h * 0.38, 0] },                          // brass nozzle body
        { g: cyl(R * 0.45, h * 0.1, R * 0.7), c: '#d7b45e', p: [f * L, h * 0.18, 0] },                // cone
        { g: cyl(R * 0.16, h * 0.05), c: '#3a3226', p: [f * L, h * 0.06, 0] });                       // orifice
      for (const f of [-0.42, 0.42]) P.push({ g: rbox(L * 0.05, h * 0.5, R * 2.3, 2), c: '#3a3f46', p: [f * L, h * 0.62, 0] }); // mounting clips
      return build(P);
    }
    default: { // lightbar: aluminium extrusion with cooling fins, a lit diffuser, end caps and clip brackets
      const e = Math.min(26, w * 0.05), P: Part[] = [
        { g: rbox(w - 2 * e, h * 0.7, d * 0.92, 4), c: '#a6adb4', p: [0, h * 0.62, 0] },            // housing
        { g: box(w - 2 * e - 8, h * 0.14, d * 0.7), c: '#fff6d8', p: [0, h * 0.27, 0] },            // diffuser strip (underside, bright)
        { g: rbox(e, h * 1.1, d, 4), c: '#2a2e34', p: [-w / 2 + e / 2, h * 0.58, 0] },              // end caps
        { g: rbox(e, h * 1.1, d, 4), c: '#2a2e34', p: [w / 2 - e / 2, h * 0.58, 0] },
      ];
      for (let i = 0; i < 9; i++) P.push({ g: box(w - 2 * e - 20, h * 0.28, d * 0.035), c: '#8f969d', p: [0, h * 1.1, -d * 0.36 + i * (d * 0.72 / 8)] }); // fins
      for (const f of [-0.36, 0.36]) P.push({ g: box(w * 0.03, h * 0.15, d * 1.15), c: '#1f2327', p: [f * w, h * 0.98, 0] }, // clip strap
        { g: box(w * 0.03, h * 1.0, d * 0.05), c: '#1f2327', p: [f * w, h * 0.5, d * 0.56] });  // clip leg
      return build(P);
    }
  }
}
