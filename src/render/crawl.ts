// Crawlers, the viewer's side (R90): runs the crawl sim (scene/crawlSim.ts) for shrimp, crabs and snails against the shared
// collision field and puts each animal's pose on its mesh. Same rules as roam.ts: the placed spot is the truth, remembered per
// mesh and put back when the motion is off (exports, picking, the setting off, Reset). Nothing here is saved.
import * as THREE from 'three';
import { swimFieldFor, type SwimWorld } from './swimWorld';
import { makeCrawlSim, type CrawlPlane, type CrawlSim, type CrawlSpec } from '../scene/crawlSim';
import type { SwimField, V3 } from '../scene/swimTypes';

/** What build.ts leaves on a crawler's mesh. `plane` (glass): the card's own axes at spin 0; bounds and the water side are worked out here. */
export interface CrawlData { spec: Omit<CrawlSpec, 'plane'> & { plane?: { u: V3; v: V3 } }; world: SwimWorld }
interface Home { p: THREE.Vector3; q: THREE.Quaternion; sp?: THREE.Vector3; ex: number; ey: number }
const D2R = Math.PI / 180, _e = new THREE.Euler();
interface Limb { m: THREE.Object3D; i: number; rx: number; ry: number }
const limbsOf = new WeakMap<THREE.Object3D, Limb[]>();
/** Swing a frog's limbs about their root joints: limb 0 (hind) by `hind`, limb 1 (fore) by `fore` radians, about the body's side axis. */
function poseLimbs(root: THREE.Object3D, hind: number, fore: number) {
  let ls = limbsOf.get(root);
  if (!ls) { ls = []; root.traverse(o => { const l = o.userData.limb; if (l) ls!.push({ m: o, i: l.i, rx: l.rx, ry: l.ry }); }); limbsOf.set(root, ls); }
  for (const l of ls) { const a = l.i === 0 ? hind : fore, c = Math.cos(a), sn = Math.sin(a); l.m.rotation.z = a; l.m.position.set(l.rx - (l.rx * c - l.ry * sn), l.ry - (l.rx * sn + l.ry * c), 0); }
}

/** Bounds of a flat vertical pane for a body of `size`, and which way is into the water; null if the pane is not flat (bowl, relief wall). */
function paneOf(field: SwimField, home: { x: number; y: number; z: number }, u: V3, v: V3, size: number): CrawlPlane | null {
  if (Math.abs(v[1]) < 0.99) return null;
  const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0]; // n = u x v
  if (Math.abs(ny) > 0.05 || (Math.abs(nx) < 0.99 && Math.abs(nz) < 0.99)) return null;
  const a = field.clearance(home.x + nx * 40, home.y, home.z + nz * 40, undefined, 80), b = field.clearance(home.x - nx * 40, home.y, home.z - nz * 40, undefined, 80);
  const into: V3 = a >= b ? [nx, 0, nz] : [-nx, 0, -nz];
  const m = size * 0.5 + 2, cs = [[field.min[0], field.min[2]], [field.max[0], field.min[2]], [field.min[0], field.max[2]], [field.max[0], field.max[2]]].map(c => c[0] * u[0] + c[1] * u[2]);
  let fl = 0;
  for (let k = 0; k <= 10; k++) fl = Math.max(fl, field.floorAt(field.min[0] + (field.max[0] - field.min[0]) * k / 10, field.min[2] + (field.max[2] - field.min[2]) * k / 10));
  return { u, v, into, u0: Math.min(...cs) + m, u1: Math.max(...cs) - m, v0: fl + m, v1: field.waterTop - m };
}

export class Crawl {
  private sim: CrawlSim | null = null;
  private key = '';
  private homes = new WeakMap<THREE.Object3D, Home>();
  private moved = new Set<THREE.Object3D>();
  private seed = 4242;
  reset() { this.sim?.reset(); this.seed++; this.key = ''; }
  update(meshes: THREE.Object3D[], dt: number, on: boolean, paused: boolean) {
    if (!on || !meshes.length) { this.home(); return; }
    const world = (meshes[0].userData.crawl as CrawlData).world, { field, key: wk } = swimFieldFor(world);
    const key = meshes.map(m => { const s = (m.userData.crawl as CrawlData).spec; return `${s.id}|${s.len}|${s.kind}|${s.speed}|${s.rest}|${s.plane ? 'p' : ''}|${s.home.x},${s.home.y},${s.home.z},${s.home.yaw}`; }).join(';') + '#' + wk;
    if (key !== this.key || !this.sim) {
      const specs: CrawlSpec[] = [];
      for (const m of meshes) {
        const d = (m.userData.crawl as CrawlData).spec; let plane: CrawlPlane | undefined;
        if (d.plane) { const p = paneOf(field, d.home, d.plane.u, d.plane.v, d.len); if (!p) continue; plane = p; } // a bowl or a relief wall: it stays where it was placed
        specs.push({ ...d, plane });
      }
      this.sim = makeCrawlSim(specs, field, this.seed); this.key = key;
    }
    if (!paused && dt > 0) this.sim.step(Math.min(dt, 0.2));
    for (const m of meshes) {
      const d = m.userData.crawl as CrawlData, p = this.sim.pose(d.spec.id); if (!p) continue;
      let h = this.homes.get(m);
      if (!h) { _e.setFromQuaternion(m.quaternion, 'YXZ'); h = { p: m.position.clone(), q: m.quaternion.clone(), sp: (m.userData.shadow as THREE.Object3D | undefined)?.position.clone(), ex: _e.x, ey: _e.y }; this.homes.set(m, h); }
      m.position.set(p.x, p.y, p.z);
      if (d.spec.plane) m.quaternion.setFromEuler(_e.set(h.ex, h.ey, p.yaw * D2R, 'YXZ')); // spin about the pane normal
      else m.quaternion.setFromEuler(_e.set(p.roll * D2R, p.yaw * D2R, p.pitch * D2R, 'YXZ'));
      if (d.spec.kind === 'frog') poseLimbs(m, p.hind, p.fore);
      m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined;
      if (sh && h.sp) { sh.position.set(h.sp.x + p.x - h.p.x, h.sp.y, h.sp.z + p.z - h.p.z); sh.rotation.y = p.yaw * D2R; sh.updateMatrixWorld(true); }
      this.moved.add(m);
    }
  }
  private home() {
    for (const m of this.moved) {
      const h = this.homes.get(m); if (!h) continue;
      if ((m.userData.crawl as CrawlData).spec.kind === 'frog') poseLimbs(m, 0, 0);
      m.position.copy(h.p); m.quaternion.copy(h.q); m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; if (sh && h.sp) { sh.position.copy(h.sp); sh.updateMatrixWorld(true); }
    }
    this.moved.clear();
  }
}
