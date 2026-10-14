// Light map hover readout (lane K step 4, Nathan 2026-10-14): with the Light map on and the fixture's power set, the
// pointer is followed down onto the ground and the light model (scene/lightout.ts bandsAt, the function the map's
// shader is a port of) is evaluated there: "62 µmol PAR · 3,400 lux · 31 cm deep". Both values whichever unit the map
// shows; hidden off the substrate, while dragging, and on touch (no hover). One evaluation per animation frame.
import * as THREE from 'three';
import type { Viewer } from '../render/viewer';
import { bandsAt, lightEnvCached, luxOf, parOf } from '../scene/lightout';
import { fmtLen } from '../scene/physics';
import type { Store } from '../scene/store';
import { groundHeight, groundInsideBy } from '../scene/terrain';
import type { TankSetup } from '../scene/types';

/** Where a ray first meets the ground inside the tank (marched, then bisected); null if it misses. */
function groundHit(S: TankSetup, ray: THREE.Ray): THREE.Vector3 | null {
  const T = S.tank, g = (x: number, z: number) => groundHeight(S, T, x, -z);
  const box = new THREE.Box3(new THREE.Vector3(0, 0, -T.D), new THREE.Vector3(T.L, T.H * 2, 0)), start = ray.intersectBox(box, new THREE.Vector3());
  if (!start) return null;
  const t0 = ray.origin.distanceTo(start), step = 3, p = new THREE.Vector3();
  for (let t = t0; t < t0 + 3 * (T.L + T.D + T.H); t += step) {
    ray.at(t, p);
    if (p.y <= g(p.x, p.z)) {
      let a = t - step, b = t;
      for (let k = 0; k < 12; k++) { const m = (a + b) / 2; ray.at(m, p); if (p.y <= g(p.x, p.z)) b = m; else a = m; }
      return ray.at(b, new THREE.Vector3());
    }
    if (p.y < 0 || !box.containsPoint(p)) break;
  }
  return null;
}

const round = (v: number) => (v >= 100 ? Math.round(v / 5) * 5 : Math.round(v));
const roundLux = (v: number) => (v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10).toLocaleString('en-US');

export function attachLightHover(viewer: Viewer, store: Store) {
  const tip = document.createElement('div');
  tip.id = 'lightTip'; tip.hidden = true; tip.setAttribute('role', 'status');
  tip.style.cssText = 'position:fixed;z-index:60;pointer-events:none;padding:3px 8px;border-radius:4px;background:rgba(16,20,24,0.88);' +
    'color:#f2f4f5;font:12px/1.4 system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.35)';
  document.body.append(tip);
  const ray = new THREE.Raycaster();
  let last: PointerEvent | null = null, raf = 0;
  const hide = () => { tip.hidden = true; last = null; };
  const show = () => {
    raf = 0;
    const e = last; if (!e) return;
    const r = viewer.host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const vp = viewer.active.find(v => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h);
    const S = vp?.S, l = S?.light;
    if (!vp || !S || !l || !S.render.beams || l.type === 'flat' || !(l.watts && l.watts > 0) || !S.substrate.show) { tip.hidden = true; return; }
    const env = lightEnvCached({ ...S, tank: vp.T });
    ray.setFromCamera(new THREE.Vector2((x - vp.x) / vp.w * 2 - 1, -(y - vp.y) / vp.h * 2 + 1), vp.cam);
    const p = env && groundHit({ ...S, tank: vp.T }, ray.ray);
    if (!env || !p || groundInsideBy(S, vp.T, p.x, -p.z) <= 0) { tip.hidden = true; return; }
    // the ground's normal there, as the map uses it (substratePoints)
    const h = (a: number, d: number) => groundHeight(S, vp.T, a, d), d = -p.z;
    const hx = (h(p.x + 5, d) - h(p.x - 5, d)) / 10, hd = (h(p.x, d + 5) - h(p.x, d - 5)) / 10, k = Math.hypot(hx, 1, hd);
    const b = bandsAt(env, [p.x, p.y + 0.5, p.z], [-hx / k, 1 / k, hd / k]);
    const u = store.scene.units, wd = Number.isFinite(env.ys) ? env.ys - p.y : -1;
    const where = wd > 0 ? `${fmtLen(wd, u, u === 'in' ? 1 : 0)} deep` : Number.isFinite(env.ys) ? 'above the water' : 'dry';
    tip.textContent = `${round(parOf(b))} µmol PAR · ${roundLux(luxOf(b))} lux · ${where}`;
    tip.hidden = false;
    const w = tip.offsetWidth, flip = e.clientX + 16 + w > innerWidth - 8;
    tip.style.left = `${flip ? e.clientX - 12 - w : e.clientX + 16}px`; tip.style.top = `${Math.max(e.clientY - 30, 4)}px`;
  };
  viewer.host.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || e.buttons) { hide(); return; }
    last = e; if (!raf) raf = requestAnimationFrame(show);
  });
  for (const ev of ['pointerleave', 'pointerdown', 'wheel'] as const) viewer.host.addEventListener(ev, hide, { passive: true });
  // the light or the view changed under a still pointer: re-read it
  store.subscribe(() => { if (last && !raf) raf = requestAnimationFrame(show); });
}
