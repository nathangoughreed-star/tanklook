// Free-roam swimming, the viewer's side (lane FX1, part 3): runs the swim sim (scene/swimSim.ts) against the collision
// field (render/swimField.ts) and puts each fish's pose on its mesh every frame. The placed spot is the truth: it is
// remembered per mesh and put back whenever the motion is off (exports, picking, the setting off, Reset). Nothing here is saved.
import * as THREE from 'three';
import { swimFieldFor } from './swimWorld';
import { makeSwimSim } from '../scene/swimSim';
import type { SwimmerSpec, SwimSim } from '../scene/swimTypes';
import type { Tank, TankSetup } from '../scene/types';

/** What build.ts leaves on a fish's card mesh so the viewer can roam it. */
export interface RoamData { spec: SwimmerSpec; world: { S: TankSetup; T: Tank; rise?: (x: number, depth: number) => number } }
interface Home { p: THREE.Vector3; q: THREE.Quaternion; sp?: THREE.Vector3 }
const D2R = Math.PI / 180, _e = new THREE.Euler();

export class Roam {
  private sim: SwimSim | null = null;
  private key = '';
  private homes = new WeakMap<THREE.Object3D, Home>();
  private moved = new Set<THREE.Object3D>();
  private seed = 1337;
  ms = 0; // the last field + sim build, for the debug page
  /** Put every fish back at its placed spot at the next update, and start the roam afresh. */
  reset() { this.sim?.reset(); this.seed++; this.key = ''; }
  /** `on` = move them; off puts them home. `paused` = hold where they are (a fish is selected). */
  update(meshes: THREE.Object3D[], dt: number, on: boolean, paused: boolean) {
    if (!on || !meshes.length) { this.home(); return; }
    const specs: SwimmerSpec[] = [], world = (meshes[0].userData.roam as RoamData).world;
    for (const m of meshes) specs.push((m.userData.roam as RoamData).spec);
    const wf = swimFieldFor(world);
    const key = specs.map(s => `${s.id}|${s.len}|${s.zone}|${s.pace ?? 1}|${s.band}|${s.group?.key}|${s.home.x},${s.home.y},${s.home.z},${s.home.yaw},${s.home.pitch},${s.home.roll}`).join(';') + '#' + wf.key;
    if (key !== this.key || !this.sim) {
      const t0 = performance.now();
      this.sim = makeSwimSim(specs, wf.field, this.seed); this.key = key;
      this.ms = performance.now() - t0;
    }
    if (!paused && dt > 0) this.sim.step(Math.min(dt, 0.2));
    for (const m of meshes) {
      const p = this.sim.pose((m.userData.roam as RoamData).spec.id); if (!p) continue;
      let h = this.homes.get(m); if (!h) { h = { p: m.position.clone(), q: m.quaternion.clone(), sp: (m.userData.shadow as THREE.Object3D | undefined)?.position.clone() }; this.homes.set(m, h); }
      m.position.set(p.x, p.y, p.z); m.quaternion.setFromEuler(_e.set(p.roll * D2R, p.yaw * D2R, p.pitch * D2R, 'YXZ'));
      m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; // the contact shadow follows along the floor
      if (sh && h.sp) { sh.position.set(h.sp.x + p.x - h.p.x, h.sp.y, h.sp.z + p.z - h.p.z); sh.rotation.y = p.yaw * D2R; sh.updateMatrixWorld(true); }
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
