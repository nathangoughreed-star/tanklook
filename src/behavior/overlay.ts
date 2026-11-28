// R208 BH-S1: the debug overlay `?bh&places`: the affordance map drawn over the tank as coloured dots (colours of the BH1 picture
// 02-scape-affordances), a short line for each place's facing, small squares for food patches, and a legend with counts.
// Rebuilt when the scene changes; drawn on top of everything (no depth test) so cave insides show through the shell.
import * as THREE from 'three';
import type { Viewer } from '../render/viewer';
import type { Store } from '../scene/store';
import { worldKey } from '../render/swimWorld';
import { PLACE_TAGS, buildAffordance, type AffordanceMap, type PlaceTag } from './affordance';

export const TAG_COLOUR: Record<PlaceTag, string> = {
  'cave-in': '#e0283c', 'cave-mouth': '#ff8c00', overhang: '#a030d8', crevice: '#0a64d2', 'root-mass': '#7a4a1e',
  'open-sand': '#d4a820', 'open-gravel': '#9a8a50', glass: '#20b0b0', 'stem-thicket': '#2a9a2a', surface: '#7ab4f0',
};
const NAME = 'bh-places';

export function placesGroup(m: AffordanceMap): THREE.Group {
  const g = new THREE.Group(); g.name = NAME; g.renderOrder = 999;
  const sph = new THREE.SphereGeometry(5, 10, 8), mat = new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0.95 });
  const inst = new THREE.InstancedMesh(sph, mat, Math.max(1, m.places.length)); inst.renderOrder = 999; inst.frustumCulled = false;
  const col = new THREE.Color(), mx = new THREE.Matrix4(), lines: number[] = [];
  m.places.forEach((p, i) => {
    mx.makeTranslation(p.p[0], p.p[1], p.p[2]).scale(new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, mx); inst.setColorAt(i, col.set(TAG_COLOUR[p.tag]));
    if (p.tag !== 'open-sand' && p.tag !== 'open-gravel') lines.push(p.p[0], p.p[1], p.p[2], p.p[0] + p.n[0] * 28, p.p[1] + p.n[1] * 28, p.p[2] + p.n[2] * 28);
  });
  inst.count = m.places.length; g.add(inst);
  if (lines.length) {
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#202020', depthTest: false })); ln.renderOrder = 999; ln.frustumCulled = false; g.add(ln);
  }
  if (m.food.length) {
    const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: '#f4f0d0', depthTest: false }), m.food.length);
    fm.renderOrder = 999; fm.frustumCulled = false;
    m.food.forEach((f, i) => { mx.makeTranslation(f.p[0], f.p[1], f.p[2]); fm.setMatrixAt(i, mx); });
    g.add(fm);
  }
  return g;
}

function legend(m: AffordanceMap): HTMLElement {
  let el = document.getElementById('bh-legend');
  if (!el) { el = document.createElement('div'); el.id = 'bh-legend'; el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:50;background:rgba(255,255,255,.92);border:1px solid #aaa;border-radius:6px;padding:6px 10px;font:12px/1.5 system-ui,sans-serif;color:#222;pointer-events:none'; document.body.append(el); }
  const c = m.counts();
  el.innerHTML = '<b>BH-S1 places</b><br>' + PLACE_TAGS.map(t => `<span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${TAG_COLOUR[t]};margin-right:5px"></span>${t} ${c[t]}`).join('<br>')
    + `<br><span style="display:inline-block;width:9px;height:9px;background:#f4f0d0;border:1px solid #888;margin-right:5px"></span>food ${m.food.length}<br>hollows ${m.hollows.length}, roots/thickets ${m.perm.length}`;
  return el;
}

/** Keep the overlay on the active tank of the viewer, and rebuild it when the scene changes. */
export function attachPlaces(viewer: Viewer, store: Store) {
  let key = '', map: AffordanceMap | null = null;
  const tick = () => {
    try {
      const vp = viewer.vps[store.scene.active] ?? viewer.vps[0];
      if (!vp?.scene || !vp.S || !vp.T) return;
      const k = worldKey({ S: vp.S, T: vp.T });
      if (k !== key || !map) { key = k; const t0 = performance.now(); map = buildAffordance(vp.S, vp.T); legend(map); (window as unknown as { __bh?: unknown }).__bh = { map, ms: performance.now() - t0 }; vp.scene.getObjectByName(NAME)?.removeFromParent(); }
      if (!vp.scene.getObjectByName(NAME)) { vp.scene.add(placesGroup(map)); viewer.invalidate(); }
    } catch (e) { console.warn('bh places', e); }
  };
  setInterval(tick, 400); tick();
}
