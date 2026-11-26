// Free-roam swimming, the viewer's side (lane FX1, part 3): runs the swim sim (scene/swimSim.ts) against the collision
// field (render/swimField.ts) and puts each fish's pose on its mesh every frame. The placed spot is the truth: it is
// remembered per mesh and put back whenever the motion is off (exports, picking, the setting off, Reset). Nothing here is saved.
import * as THREE from 'three';
import { swimFieldFor } from './swimWorld';
import { makeSwimSim } from '../scene/swimSim';
import type { SwimmerSpec, SwimSim } from '../scene/swimTypes';
import type { Tank, TankSetup } from '../scene/types';
import { flowAt, jetsKey, type FlowJet } from '../scene/flow';

/** What build.ts leaves on a fish's card mesh so the viewer can roam it. */
export interface RoamData { spec: SwimmerSpec; world: { S: TankSetup; T: Tank; rise?: (x: number, depth: number) => number } }
interface Home { p: THREE.Vector3; q: THREE.Quaternion; sp?: THREE.Vector3 }
const D2R = Math.PI / 180, _e = new THREE.Euler();
interface Pec { m: THREE.Object3D; side: number; a: number; rx: number }
const pecsOf = new WeakMap<THREE.Object3D, Pec[]>();
/** Fan a fish's pectorals (FB1): each swings about its root by `amp` radians at `hz`, the pair a little out of step. 0 puts them back at rest. */
function fanPecs(root: THREE.Object3D, amp: number, hz: number, t: number, id: number) {
  let ps = pecsOf.get(root);
  if (!ps) { ps = []; root.traverse(o => { const p = o.userData.pec; if (p) ps!.push({ m: o, side: p.side, a: p.a, rx: p.rx }); }); pecsOf.set(root, ps); }
  const w = 6.2832 * hz * t + id * 1.7;
  for (const p of ps) p.m.rotation.set(p.rx, p.side * (p.a + (amp > 0 ? amp * Math.sin(w + (p.side > 0 ? 0 : 0.5)) : 0)), 0, 'YXZ');
}

export class Roam {
  private sim: SwimSim | null = null;
  private key = '';
  private homes = new WeakMap<THREE.Object3D, Home>();
  private moved = new Set<THREE.Object3D>();
  private seed = 1337;
  private t = 0; // seconds of roaming, for the fin fan
  ms = 0; // the last field + sim build, for the debug page
  /** Put every fish back at its placed spot at the next update, and start the roam afresh. */
  reset() { this.sim?.reset(); this.seed++; this.key = ''; }
  /** BR: an alarm at a point in the tank (mm): a click on open water. No-op until the sim exists. */
  startle(x: number, y: number, z: number, radius?: number) { this.sim?.startle(x, y, z, radius); }
  private zMid = 0; private xr: [number, number] = [0, 0]; private yr: [number, number] = [0, 0];
  /** BR: a click ray into the tank: the alarm goes off where the ray crosses the tank's middle depth (false when it misses the water). */
  startleRay(ray: THREE.Ray): boolean {
    if (!this.sim || Math.abs(ray.direction.z) < 1e-6) return false;
    const t = (this.zMid - ray.origin.z) / ray.direction.z; if (t < 0) return false;
    const x = ray.origin.x + ray.direction.x * t, y = ray.origin.y + ray.direction.y * t;
    if (x < this.xr[0] || x > this.xr[1] || y < this.yr[0] || y > this.yr[1]) return false;
    this.sim.startle(x, y, this.zMid); return true;
  }
  /** BR: rushes and random alarms on or off (off while something is selected or dragged in edit mode). */
  setEvents(on: boolean) { this.sim?.setEvents(on); this.eventsOn = on; }
  private eventsOn = true;
  /** BR: counts of rushes / alarms since the sim was made, for the debug page. */
  get events() { return this.sim?.events; }
  /** `on` = move them; off puts them home. `paused` = hold where they are (a fish is selected). */
  update(meshes: THREE.Object3D[], dt: number, on: boolean, paused: boolean) {
    if (!on || !meshes.length) { this.home(); return; }
    const specs: SwimmerSpec[] = [], world = (meshes[0].userData.roam as RoamData).world;
    for (const m of meshes) specs.push((m.userData.roam as RoamData).spec);
    const wf = swimFieldFor(world), jets = (meshes[0].userData.flowJets as FlowJet[] | undefined) ?? [];
    const key = specs.map(s => `${s.id}|${s.len}|${s.zone}|${s.pace ?? 1}|${s.style ? [s.style.rate, s.style.tau, s.style.turn, s.style.mix] : ''}|${s.rest ?? ''}|${s.hover ? [s.hover.w, s.hover.pec, s.hover.caudal] : ''}|${s.dig ? [s.dig.k, s.dig.dark, s.dig.rest, s.dig.rate] : ''}|${s.habit ? [s.habit.home, s.habit.post, s.habit.leash, s.habit.act, s.habit.dart, s.habit.peck, s.habit.patrol, s.habit.flick, s.habit.hop] : ''}|${s.band}|${s.tall ?? ''}|${s.kind ?? ''}|${s.foes ?? ''}|${s.guard ?? ''}|${s.pair ?? ''}|${s.group?.key}|${s.home.x},${s.home.y},${s.home.z},${s.home.yaw},${s.home.pitch},${s.home.roll}`).join(';') + '#' + wf.key + '#' + jetsKey(jets);
    if (key !== this.key || !this.sim) {
      const t0 = performance.now();
      // the outlets' current (scene/flow.ts): the field answers flow() too; still water without outlets
      const field = jets.length ? Object.assign(Object.create(wf.field) as typeof wf.field, { flow: (x: number, y: number, z: number, out: [number, number, number]) => flowAt(jets, x, y, z, out) }) : wf.field;
      this.sim = makeSwimSim(specs, field, this.seed); this.key = key;
      if (!this.eventsOn) this.sim.setEvents(false);
      this.zMid = (wf.field.min[2] + wf.field.max[2]) / 2; this.xr = [wf.field.min[0], wf.field.max[0]]; this.yr = [wf.field.min[1], wf.field.waterTop];
      this.ms = performance.now() - t0;
    }
    if (!paused && dt > 0) { this.sim.step(Math.min(dt, 0.2)); this.t += Math.min(dt, 0.2); }
    for (const m of meshes) {
      const p = this.sim.pose((m.userData.roam as RoamData).spec.id); if (!p) continue;
      let h = this.homes.get(m); if (!h) { h = { p: m.position.clone(), q: m.quaternion.clone(), sp: (m.userData.shadow as THREE.Object3D | undefined)?.position.clone() }; this.homes.set(m, h); }
      m.position.set(p.x, p.y, p.z); m.quaternion.setFromEuler(_e.set(p.roll * D2R, p.yaw * D2R, p.pitch * D2R, 'YXZ'));
      const sp = (m.userData.roam as RoamData).spec, fan = p.fan ?? 0;
      m.userData.breath = p.breath ?? 0; m.userData.dig = p.dig ?? 0; m.userData.sub = p.sub; m.userData.fanA = fan; m.userData.calm = p.calm ?? 1; // the tail beat of this fish (swim.ts hookCalm)
      m.userData.beatT = ((m.userData.beatT as number | undefined) ?? this.t) + Math.min(Math.max(dt, 0), 0.2) * (p.beat ?? 1); // its own beat clock: quicker against a current, never a jump in phase
      if (fan > 0.01 || m.userData.fanned) { // fanning pectorals: about 2.5-4 Hz, wider for a small fish's quick sculling
        fanPecs(m, fan * 0.42 * (sp.hover?.pec ?? 0), Math.min(4.2, Math.max(2.2, 3.4 * Math.pow(60 / Math.max(20, sp.len), 0.25))), this.t, sp.id);
        m.userData.fanned = fan > 0.01;
      }
      m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; // the contact shadow follows along the floor
      if (sh && h.sp) { sh.position.set(h.sp.x + p.x - h.p.x, h.sp.y, h.sp.z + p.z - h.p.z); sh.rotation.y = p.yaw * D2R; sh.updateMatrixWorld(true); }
      this.moved.add(m);
    }
  }
  private home() {
    for (const m of this.moved) {
      const h = this.homes.get(m); if (!h) continue;
      m.position.copy(h.p); m.quaternion.copy(h.q); m.userData.calm = 1; m.userData.breath = 0; if (m.userData.fanned) { fanPecs(m, 0, 1, 0, 0); m.userData.fanned = false; } m.updateMatrix(); m.updateMatrixWorld(true);
      const sh = m.userData.shadow as THREE.Object3D | undefined; if (sh && h.sp) { sh.position.copy(h.sp); sh.updateMatrixWorld(true); }
    }
    this.moved.clear();
  }
}
