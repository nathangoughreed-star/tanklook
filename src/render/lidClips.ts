// Glass lid clips (lane CB1, Nathan 2026-11-12: "include these clips when the user has a glass lid installed ... make the lid
// itself a little undersized ... and add the clips so the lid lays on them rather than the tank sides"). A rimless rectangular
// tank's glass lid does not lie on the panes: clear acrylic clips hook over the top edge (a corner clip on each corner, one or
// two straight clips along each long side) and each has a small ledge just inside the pane, a few mm below the rim, that the
// lid (1/4 in short of the inside of the top on every side) rests on.
import * as THREE from 'three';
import { glassThickness } from '../scene/physics';
import { shapeOf } from '../scene/shape';
import type { Tank, TankSetup } from '../scene/types';

export const LID_CLIP_DROP = 3;   // mm: the lid's top face sits this far below the pane tops
export const LID_SHORT = 6.35;    // mm: 1/4 in, the lid's clearance to the inside of the top
export const LID_T = 4;           // mm: lid panel thickness
const LEG = 32, CW = 22, LEDGE = 14, PLATE = 2.2, SEAT = LID_CLIP_DROP + LID_T; // corner leg / straight clip length, ledge reach inside the pane, plate thickness, depth of the ledge's top face

/** Does this tank's glass lid sit on clips (a glass lid on a rimless rectangular tank)? */
export const clipLid = (S: TankSetup, T: Tank) => S.lid === 'glass' && !S.render.rim && shapeOf(T) === 'rect';

type Box6 = [number, number, number, number, number, number];

/** The clip boxes: [centre x, y, z, size x, y, z] in mm, world axes (x right, y up, z toward the viewer = -depth). */
export function lidClipBoxes(S: TankSetup, T: Tank): Box6[] {
  const { L, H, D } = T, t = glassThickness(T, S.render.glass), out: Box6[] = [];
  const ledgeBot = H - SEAT - 2.4, DROP = 20;
  // a hook along one pane from c0 to c1 (along x on the front / back pane, along z on a side pane): `ci` is the pane's inner
  // face (z = 0 front, -D back; x = 0 left, L right), `ow` the way out (+1 / -1). Profile in a = mm outward of the inner face.
  const hook = (wall: 'x' | 'z', ci: number, ow: number, c0: number, c1: number) => {
    const mid = (c0 + c1) / 2, len = Math.abs(c1 - c0);
    const bx = (a0: number, a1: number, y0: number, y1: number) => {
      const am = ow * (a0 + a1) / 2 + ci, as = Math.abs(a1 - a0), ym = (y0 + y1) / 2, ys = y1 - y0;
      out.push(wall === 'x' ? [mid, ym, am, len, ys, as] : [am, ym, mid, as, ys, len]);
    };
    bx(t, t + PLATE, H - DROP, H + PLATE);       // outer plate
    bx(-PLATE, t + PLATE, H, H + PLATE);         // the cap over the top edge
    bx(-PLATE, 0, ledgeBot, H + PLATE);          // inner plate
    bx(-LEDGE, 0, ledgeBot, ledgeBot + 2.4);     // the ledge the lid rests on
  };
  for (const [ix, ow] of [[0, -1], [L, 1]] as const) for (const [iz, oz, ez] of [[0, 1, -1], [-D, -1, 1]] as const) {
    const ex = ix === 0 ? 1 : -1; // along x, away from this corner's side pane
    hook('x', iz, oz, ix, ix + ex * LEG);        // the leg on the front / back pane
    hook('z', ix, ow, iz, iz + ez * LEG);        // the leg on the side pane
  }
  for (const x of L > 800 ? [L / 3, 2 * L / 3] : [L / 2]) { hook('x', 0, 1, x - CW / 2, x + CW / 2); hook('x', -D, -1, x - CW / 2, x + CW / 2); }
  return out;
}

/** The clips as meshes in the given clear material (frosted acrylic). */
export function addLidClips(sc: THREE.Scene, S: TankSetup, T: Tank, mat: THREE.Material, edge: THREE.Material | null) {
  for (const [x, y, z, w, h, d] of lidClipBoxes(S, T)) {
    const geo = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.renderOrder = 7; sc.add(m);
    if (edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge); e.position.copy(m.position); e.renderOrder = 8; sc.add(e); }
  }
}
