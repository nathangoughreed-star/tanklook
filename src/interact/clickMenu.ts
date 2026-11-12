// Click to its menu (Nathan 2026-11-11: "if the user clicks on the stand, I want to open up the menu that contains the
// stand and pull it up to exactly where the options for the stand are located. Same with the light, filters, fish,
// plants, etc. Skip substrate."): a plain click (no drag) on a thing in the view opens the side panel's section that
// holds it, opens the sub-part (a Tech row, Lighting), scrolls that spot to the top of the panel and flashes it.
// Animals and pieces are selected too, so their editor is what shows. The ground / substrate and empty water are not
// targets (a click there clears the selection, as before).
import * as THREE from 'three';
import { gearShown, type GearPiece } from '../render/gear3d';
import type { Store } from '../scene/store';
import type { Viewer, Viewport } from '../render/viewer';
import type { ItemKind } from '../scene/types';

/** Where a click goes: the section (details.sec[data-sec]), then a Tech row, a Tech sub-section, or an element to show. */
export type ClickTarget =
  | { kind: 'fish'; id: number }
  | { kind: 'item'; id: number; item: ItemKind }
  | { kind: 'gear'; row: string }
  | { kind: 'light' }
  | { kind: 'stand' }
  | { kind: 'lid' };

type Hit = { vp: Viewport; ray: THREE.Ray; fishId: number | null; itemId: number | null; mesh?: THREE.Mesh };

/** How far along the ray the nearest drawn part tagged `tag` (a top-level scene child: the light's bar and legs, the
 *  stand, the lid) is, by its box (as viewer.standAt does), or null when none is under the pointer. */
function nearestTagged(vp: Viewport, ray: THREE.Ray, tag: string, viewer: Viewer): number | null {
  const sc = vp.scene; if (!sc) return null;
  let best: number | null = null; const box = new THREE.Box3(), at = new THREE.Vector3();
  for (const o of sc.children) {
    if (!o.userData[tag] || !o.visible || viewer.isHidden(o)) continue;
    box.makeEmpty().expandByObject(o); if (box.isEmpty()) continue;
    if (ray.intersectBox(box.expandByScalar(3), at)) { const d = at.distanceTo(ray.origin); if (best == null || d < best) best = d; }
  }
  return best;
}

/** The gear drawn under the pointer: the ray must meet the gear's own surface (the pieces' boxes are loose: a HOB's
 *  reaches across the water), then the smallest piece box holding that point names the row. */
function gearAt(hit: Hit): { row: string; d: number } | null {
  const sc = hit.vp.scene!, rc = new THREE.Raycaster(hit.ray.origin, hit.ray.direction), meshes: THREE.Object3D[] = [];
  sc.traverse(o => { if (o.userData.gear && (o as THREE.Mesh).isMesh && o.renderOrder !== 3.5 && o.visible) meshes.push(o); }); // not the 'clear' bucket (water flow)
  const h = rc.intersectObjects(meshes, false)[0]; if (!h) return null;
  const pieces = sc.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]), sz = new THREE.Vector3();
  let best: { row: string; vol: number } | null = null;
  for (const p of pieces) {
    if (!p.box.clone().expandByScalar(6).containsPoint(h.point)) continue;
    const vol = p.box.getSize(sz).x * sz.y * sz.z;
    if (!best || vol < best.vol) best = { row: p.row.split('.')[0], vol };
  }
  return best ? { row: best.row, d: h.distance } : null;
}

/** What a click on `hit` is about: an animal or piece the hit test found, else gear, the light, the stand, the lid
 *  (nearest of the last three wins). Null for the ground, water, glass and the room. */
export function clickTarget(viewer: Viewer, store: Store, hit: Hit): ClickTarget | null {
  const S = store.scene.tanks[hit.vp.i]; if (!S) return null;
  const it = hit.itemId != null ? S.items.find(q => q.id === hit.itemId) : undefined;
  // an animal or a solid piece the pointer is on always wins: gear boxes are loose (a HOB's reaches over the scape)
  if (it && !hit.mesh?.userData.plant) return { kind: 'item', id: it.id, item: it.kind };
  if (hit.fishId != null) return { kind: 'fish', id: hit.fishId };
  // gear (every mount, fixed pieces too: a click only opens their row); a plant wins unless the gear is nearer
  if (gearShown() && hit.vp.scene) {
    const g = gearAt(hit);
    const plantD = it && hit.mesh ? new THREE.Raycaster(hit.ray.origin, hit.ray.direction).intersectObject(hit.mesh, false)[0]?.distance : undefined;
    if (g && (!it || (plantD != null && g.d < plantD - 5))) return { kind: 'gear', row: g.row };
  }
  if (it) return { kind: 'item', id: it.id, item: it.kind };
  const near = ([['light', nearestTagged(hit.vp, hit.ray, 'fixture', viewer)], ['stand', S.stand.show ? nearestTagged(hit.vp, hit.ray, 'stand', viewer) : null], ['lid', nearestTagged(hit.vp, hit.ray, 'lidPart', viewer)]] as const)
    .filter((x): x is readonly ['light' | 'stand' | 'lid', number] => x[1] != null).sort((a, b) => a[1] - b[1])[0];
  return near ? { kind: near[0] } : null;
}

type ScapeOf = (k: ItemKind) => 'hardscape' | 'plants';
const secOf = (t: ClickTarget, scape: ScapeOf) => t.kind === 'fish' ? 'fish' : t.kind === 'item' ? scape(t.item) : t.kind === 'stand' ? 'room' : t.kind === 'lid' ? 'tank' : 'tech';

/** Open the side panel at the target's options: its section, the row inside, scrolled to the top of the panel.
 *  `scape` = panels.ts scapeSec (passed in: panels imports the pointer module). */
export function openMenuFor(t: ClickTarget, store: Store, scape: ScapeOf) {
  const app = document.getElementById('app');
  if (app?.classList.contains('collapsed')) document.getElementById('sideOpen')?.click();
  const sec = document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${secOf(t, scape)}"]`); if (!sec) return;
  if (!sec.open) sec.open = true;
  if (t.kind === 'fish') store.select(t.id);
  if (t.kind === 'item') store.selectItem(t.id);
  if (t.kind === 'light') { const sub = sec.querySelector<HTMLDetailsElement>('details.tsub[data-sub="lighting"]'); if (sub && !sub.open) sub.open = true; }
  // after the panel has re-rendered for the open section / new selection
  requestAnimationFrame(() => requestAnimationFrame(() => {
    let el: HTMLElement | null = null;
    if (t.kind === 'gear') {
      const row = sec.querySelector<HTMLElement>(`#techMenu .trow[data-row="${t.row}"]`);
      if (row && !row.classList.contains('open')) row.querySelector<HTMLElement>('.thead')?.click(); // the menu re-renders
      el = sec.querySelector<HTMLElement>(`#techMenu .trow[data-row="${t.row}"]`) ?? document.getElementById('techMenu');
    }
    else if (t.kind === 'light') el = sec.querySelector('details.tsub[data-sub="lighting"]');
    else if (t.kind === 'stand') el = document.getElementById('standOn')?.closest<HTMLElement>('.field') ?? null;
    else if (t.kind === 'lid') el = document.getElementById('lidOpen')?.closest<HTMLElement>('.field') ?? null;
    else if (t.kind === 'fish') el = document.getElementById('selBox');
    else if (t.kind === 'item') el = sec.querySelector<HTMLElement>(`#plantList .pr[data-id="${t.id}"]`) ?? document.getElementById('itemBox'); // a plant's editor opens under its row in the list
    showAt(el && el.offsetParent ? el : sec);
  }));
}

/** The flash, injected once (kept beside its only user rather than in style.css). */
let flashCss = false;
const addFlashCss = () => {
  if (flashCss) return; flashCss = true;
  const st = document.createElement('style');
  st.textContent = '.menuflash { animation: menuflash 1.4s ease-out } @keyframes menuflash { 0%, 30% { box-shadow: 0 0 0 2px var(--accent, #4a9eff); background-color: color-mix(in srgb, var(--accent, #4a9eff) 14%, transparent) } 100% { box-shadow: 0 0 0 2px transparent; background-color: transparent } }';
  document.head.append(st);
};

/** Scroll `el` to the top of the side panel (just under the section's own heading) and flash it once. */
function showAt(el: HTMLElement) {
  addFlashCss();
  const side = document.getElementById('side'); if (!side) return;
  const off = () => el.getBoundingClientRect().top - side.getBoundingClientRect().top - 8;
  side.scrollTo({ top: Math.max(0, side.scrollTop + off()), behavior: 'smooth' });
  // a menu opened just now may still be laying out (Tech renders its rows on open): put it right once it has settled
  setTimeout(() => { if (Math.abs(off()) > 12) side.scrollTo({ top: Math.max(0, side.scrollTop + off()) }); }, 700);
  el.classList.remove('menuflash'); void el.offsetWidth; el.classList.add('menuflash');
  setTimeout(() => el.classList.remove('menuflash'), 1600);
}
