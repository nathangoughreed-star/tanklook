// Clingers, the viewer's side (R92): runs the cling sim (scene/clingSim.ts) for otocinclus, bristlenose and hillstream loaches
// against the shared collision field and puts each fish's pose (a quaternion that follows the surface) on its mesh.
// Same rules as roam.ts / crawl.ts: the placed spot is the truth, remembered per mesh and put back when the motion is off.
import * as THREE from 'three';
import { swimFieldFor, type SwimWorld } from './swimWorld';
import { makeClingSim, type ClingSim, type ClingSpec } from '../scene/clingSim';

/** What build.ts leaves on a clinger's mesh. */
export interface ClingData { spec: ClingSpec; world: SwimWorld }
interface Home { p: THREE.Vector3; q: THREE.Quaternion; sp?: THREE.Vector3 }

export class Cling {
  private sim: ClingSim | null = null;
  private key = '';
  private homes = new WeakMap<THREE.Object3D, Home>();
  private moved = new Set<THREE.Object3D>();
  private seed = 777;
  reset() { this.sim?.reset(); this.seed++; this.key = ''; }
  update(meshes: THREE.Object3D[], dt: number, on: boolean, paused: boolean) {
    if (!on || !meshes.length) { this.home(); return; }
    const world = (meshes[0].userData.cling as ClingData).world, wf = swimFieldFor(world);
    const key = meshes.map(m => { const s = (m.userData.cling as ClingData).spec, h = s.home; return `${s.id}|${s.len}|${s.off}|${s.creep}|${h.surf}|${h.x},${h.y},${h.z}`; }).join(';') + '#' + wf.key;
    if (key !== this.key || !this.sim) { this.sim = makeClingSim(meshes.map(m => (m.userData.cling as ClingData).spec), wf.field, this.seed); this.key = key; }
    if (!paused && dt > 0) this.sim.step(Math.min(dt, 0.2));
    for (const m of meshes) {
      const d = m.userData.cling as ClingData, p = this.sim.pose(d.spec.id); if (!p) continue;
      let h = this.homes.get(m); if (!h) { h = { p: m.position.clone(), q: m.quaternion.clone(), sp: (m.userData.shadow as THREE.Object3D | undefined)?.position.clone() }; this.homes.set(m, h); }
      m.position.set(p.x, p.y, p.z); m.quaternion.set(p.qx, p.qy, p.qz, p.qw);
      m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; // the contact shadow follows along the floor
      if (sh && h.sp) { sh.position.set(h.sp.x + p.x - h.p.x, h.sp.y, h.sp.z + p.z - h.p.z); sh.updateMatrixWorld(true); }
      this.moved.add(m);
    }
  }
  private home() {
    for (const m of this.moved) {
      const h = this.homes.get(m); if (!h) continue;
      m.position.copy(h.p); m.quaternion.copy(h.q); m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; if (sh && h.sp) { sh.position.copy(h.sp); sh.updateMatrixWorld(true); }
    }
    this.moved.clear();
  }
}
