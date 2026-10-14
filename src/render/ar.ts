/// <reference types="webxr" />
// AR view (lane Q, Nathan 2026-10-14): the current tank at true size in the room through the phone camera (WebXR
// immersive-ar with hit-test; Android Chrome / ARCore). The scene is the viewer's own build, in mm: rather than scaling
// it (its lighting and water shaders work in world mm), the XR camera hangs from a rig that maps the room's metres to
// tank mm (rigMatrix), so 1 mm = 0.001 m with no other scale. iPhone: AR Quick Look with a .usdz export (lane T,
// render/arUsdz.ts), chosen in attachAR when WebXR is missing.
import * as THREE from 'three';
import { restsOnFloor, speciesOf } from '../data/species';
import { floorY, unitMM } from '../scene/physics';
import { footprint } from '../scene/shape';
import type { Store } from '../scene/store';
import type { Tank, TankSetup, Units } from '../scene/types';
import { LU, setLightUniforms, setWaterUniforms } from './lighting';
import { OUTLINE } from './fish3d';
import type { Viewer, Viewport } from './viewer';

/** Metres per scene unit (the scene is in mm). */
export const MM = 0.001;
/** Water tint per mm in AR, as a share of the normal view's: the camera feed behind is brighter than the page. */
export const AR_WATER = 0.6;
/** A hit counts as a surface to stand the tank on when its normal is within this of straight up (floor, table, stand top). */
export const LEVEL_COS = Math.cos(20 * Math.PI / 180);
/** Screen px a touch may move and still be a tap. */
export const TAP_PX = 10;

/** The point of the tank that sits on the hit surface: the middle of its footprint, at the bottom of the stand (or the tank). */
export function baseCentre(S: TankSetup, T: Tank = S.tank) {
  const ring = footprint(T).ring, xs = ring.map(p => p[0]), ds = ring.map(p => p[1]);
  return new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, floorY(T, S.render, S.stand), -(Math.min(...ds) + Math.max(...ds)) / 2);
}

/**
 * Room (XR reference space, m) -> tank scene (mm): the tank's base centre `c` sits at `hit`, turned by `yaw` about the
 * vertical. Tank -> room is X = hit + R(yaw) (MM (x - c)); this is its inverse, T(c) R(-yaw) S(1/MM) T(-hit).
 */
export function rigMatrix(hit: THREE.Vector3, yaw: number, c: THREE.Vector3, out = new THREE.Matrix4()) {
  const k = 1 / MM;
  return out.makeTranslation(c.x, c.y, c.z)
    .multiply(new THREE.Matrix4().makeRotationY(-yaw))
    .multiply(new THREE.Matrix4().makeScale(k, k, k))
    .multiply(new THREE.Matrix4().makeTranslation(-hit.x, -hit.y, -hit.z));
}

/** Turn so the tank's front (its +z face) looks at the eye standing at `eye` (both in the room, m). */
export const faceYaw = (hit: THREE.Vector3, eye: THREE.Vector3) => Math.atan2(eye.x - hit.x, eye.z - hit.z);

/** A one-finger drag of dx px on a screen w px wide turns the tank by half a turn per screen width. */
export const dragYaw = (dx: number, w: number) => dx / Math.max(1, w) * Math.PI;

/** Is a hit pose's up axis (the surface normal, y of its matrix) level enough to stand a tank on? */
export const isLevel = (m: ArrayLike<number>) => m[5] / (Math.hypot(m[4], m[5], m[6]) || 1) >= LEVEL_COS;

/** "Size check" line: L × D × H in the user's units, plus the stand under it (what a tape measure should read). */
export function sizeText(S: TankSetup, u: Units) {
  const T = S.tank, k = unitMM(u), suf = u === 'in' ? '″' : ' cm', f = (mm: number) => +(mm / k).toFixed(1);
  const stand = S.stand.show ? ` on a ${f(S.stand.height)}${suf} stand` : '';
  return `Size check: ${f(T.L)} × ${f(T.D)} × ${f(T.H)}${suf} (L × D × H)${stand}`;
}

// ---------- scene prep / restore (callable from the dev page: window.__gb) ----------

const shadowTexture = (() => {
  let t: THREE.Texture | undefined;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!; g.filter = 'blur(20px)'; g.fillStyle = '#000'; g.fillRect(44, 44, 168, 168);
    return (t = new THREE.CanvasTexture(c));
  };
})();

/** What only makes sense in the page's room, not the real one: the scale person, the room floor, the wall panel(s). */
export function roomObjects(sc: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  sc.traverse(o => {
    const m = o as THREE.Mesh, mat = m.material as THREE.Material | undefined;
    if (o.name === 'person') out.push(o);
    else if ((m.geometry as THREE.PlaneGeometry | undefined)?.parameters?.width === 8000) out.push(o); // the room floor (build addFloor)
    else if (mat?.userData?.wallPaint && o.parent && o.parent !== sc) out.push(o.parent); // a wall panel and its skirting
  });
  return out;
}

export interface ARPrep {
  reticle: THREE.Object3D;
  shadow: THREE.Mesh;
  /** Show or hide the tank (hidden until it is placed); the reticle is shown separately. */
  showTank(on: boolean): void;
  /** Gentle idle motion of the swimming animals at time t (ms); the app's animals are otherwise still. */
  sway(t: number): void;
  restore(): void;
}

/**
 * Ready a viewport's built scene for the room: hide what makes no sense there (room floor, wall, scale person, terrain
 * dots), swap the frosted film's transmission for a plain translucent sheet, and add a soft contact shadow under the
 * base and a reticle. restore() puts every changed object back exactly.
 */
export function prepScene(vp: Viewport): ARPrep {
  const sc = vp.scene!, S = vp.S, T = vp.T, vis = new Map<THREE.Object3D, boolean>(), mats = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const hide = (o: THREE.Object3D) => { if (!vis.has(o)) vis.set(o, o.visible); o.visible = false; };
  const roomOnly = roomObjects(sc);
  sc.traverse(o => {
    const m = o as THREE.Mesh, mat = m.material as THREE.Material | undefined;
    if (mat?.userData?.frost) {
      const f = mat as THREE.MeshPhysicalMaterial;
      mats.set(m, f); m.material = new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    }
  });
  // selection boxes (a fish's or an item's): lines drawn over everything, meaningless in the room
  sc.traverse(o => { if ((o as THREE.LineSegments).isLineSegments && ((o as THREE.LineSegments).material as THREE.Material).depthTest === false) roomOnly.push(o); });
  for (const o of [...roomOnly, ...(vp.dotMeshes ?? [])]) hide(o);
  const tankObjs = sc.children.filter(o => o.visible);

  // contact shadow: a blurred dark quad under the footprint, just above the base (unlit: added after applyLighting)
  const c = baseCentre(S, T), ring = footprint(T).ring, xs = ring.map(p => p[0]), ds = ring.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...ds) - Math.min(...ds), pad = 1.5;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.scale.set(w * pad, 1, d * pad); shadow.position.set(c.x, c.y + 1, c.z); shadow.renderOrder = -1; shadow.name = 'arShadow';
  sc.add(shadow);

  // reticle: built in metres, placed each frame by rig x hit pose (so it is drawn at room scale)
  const reticle = new THREE.Group(); reticle.name = 'arReticle'; reticle.matrixAutoUpdate = false; reticle.visible = false;
  const rm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
  reticle.add(new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 40).rotateX(-Math.PI / 2), rm));
  reticle.add(new THREE.Mesh(new THREE.CircleGeometry(0.012, 16).rotateX(-Math.PI / 2), rm));
  for (const o of reticle.children) o.renderOrder = 999;
  sc.add(reticle);

  // idle sway: swimming animals only (not snails, bottom dwellers, land animals or anything on the glass)
  const swim = (S.render.beams && S.light.type !== 'flat' ? [] : S.fish).flatMap((f, i) => {
    const sp = speciesOf(f), part = vp.fishParts?.[i];
    if (!sp || !part || restsOnFloor(sp, f.surface) || f.surface === 'glass') return [];
    return part.objs.map(o => ({ o, y: o.position.y, q: o.quaternion.clone(), ph: (f.id * 2.399) % (2 * Math.PI) }));
  });
  const up = new THREE.Vector3(0, 1, 0), dq = new THREE.Quaternion();
  return {
    reticle, shadow,
    showTank(on) { for (const o of tankObjs) o.visible = on; shadow.visible = on; },
    sway(t) {
      for (const s of swim) {
        const a = t / 1000 * 1.3 + s.ph;
        s.o.position.y = s.y + 3 * Math.sin(a);
        s.o.quaternion.copy(dq.setFromAxisAngle(up, 0.07 * Math.sin(a * 0.6))).multiply(s.q);
      }
    },
    restore() {
      for (const s of swim) { s.o.position.y = s.y; s.o.quaternion.copy(s.q); }
      for (const o of tankObjs) o.visible = true;
      for (const [o, v] of vis) o.visible = v;
      for (const [m, mat] of mats) { (m.material as THREE.Material).dispose(); m.material = mat; }
      for (const o of [shadow, reticle]) { sc.remove(o); o.traverse(x => { (x as THREE.Mesh).geometry?.dispose(); }); }
      (shadow.material as THREE.Material).dispose(); rm.dispose();
      sc.updateMatrixWorld(true);
    },
  };
}

// ---------- the session ----------

export async function arSupported() {
  try { return !!(await navigator.xr?.isSessionSupported('immersive-ar')); } catch { return false; }
}

const OVERLAY_CSS = `#arOverlay{position:fixed;inset:0;font:500 15px system-ui,"Segoe UI",sans-serif;color:#fff;touch-action:none;user-select:none}
#arOverlay .bar{position:absolute;left:12px;right:12px;bottom:max(16px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
#arOverlay .msg{background:rgba(20,24,30,.72);padding:6px 12px;border-radius:12px;text-align:center;max-width:100%}
#arOverlay .fps{position:absolute;top:14px;left:14px;background:rgba(20,24,30,.55);padding:2px 8px;border-radius:8px;font-size:12px}
#arOverlay button{position:absolute;top:10px;right:10px;font:600 16px system-ui,sans-serif;min-width:44px;min-height:44px;padding:0 16px;border-radius:22px;border:0;background:rgba(20,24,30,.8);color:#fff}
#arOverlay .bar .swap{position:static;align-self:flex-end;pointer-events:auto;min-height:52px;font-size:17px}`; // swap: lower right, under the thumb (Nathan 2026-10-14)

/** Can this browser open AR Quick Look (iPhone / iPad Safari)? */
export function quickLookSupported() {
  try { return document.createElement('a').relList.supports('ar'); } catch { return false; }
}

/** The iPhone path (lane T) waits for a test on a real iPhone: until then it shows only with ?ar=ios in the URL. */
export const IOS_FLAG = true;
const iosAllowed = () => !IOS_FLAG || new URLSearchParams(location.search).get('ar') === 'ios';

/**
 * Show the AR button when this device can do AR, and run it from the button: WebXR immersive-ar where it works
 * (Android Chrome), else AR Quick Look (iPhone: the tank exported as a .usdz, render/arUsdz.ts).
 */
export async function attachAR(viewer: Viewer, store: Store, button: HTMLButtonElement) {
  button.hidden = true;
  const run = (await arSupported()) ? runAR : quickLookSupported() && iosAllowed() ? runQuickLook : null;
  if (!run) return;
  button.hidden = false;
  let busy = false;
  button.addEventListener('click', async () => {
    if (busy) return; busy = true;
    try { await run(viewer, store, button); } catch (e) { console.error(e); alert('AR could not start: ' + ((e as Error).message || e)); } finally { busy = false; }
  });
}

// ---------- iPhone: AR Quick Look ----------

const QL_CSS = `#arQL{position:fixed;left:12px;right:12px;bottom:max(16px,env(safe-area-inset-bottom));z-index:50;display:flex;flex-direction:column;gap:8px;align-items:center;
background:rgba(20,24,30,.97);color:#fff;padding:12px 44px;border-radius:14px;font:500 14px system-ui,sans-serif;text-align:center}
#arQL a{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 18px;border-radius:22px;background:#fff;color:#14181e;font-weight:600;text-decoration:none}
#arQL a img{width:1px;height:1px}
#arQL .x{position:absolute;top:4px;right:6px;min-width:44px;min-height:44px;border:0;background:none;color:#fff;font-size:20px}
#arQL .hint{opacity:.8;font-size:12.5px}`;
let qlUrl = '';

/** Export the current tank to .usdz and open it in AR Quick Look; a small panel keeps the Size check line and the link. */
async function runQuickLook(viewer: Viewer, store: Store, button: HTMLButtonElement) {
  viewer.draw(); // the current build, up to date
  const vp = viewer.current, label = button.textContent;
  if (!vp.scene) return;
  button.textContent = 'Preparing AR…'; button.disabled = true;
  try {
    const { exportUSDZ } = await import('./arUsdz');
    const { blob, stats } = await exportUSDZ(vp);
    console.info('AR Quick Look export', stats);
    if (qlUrl) URL.revokeObjectURL(qlUrl);
    qlUrl = URL.createObjectURL(blob);
  } finally { button.textContent = label; button.disabled = false; }
  if (!document.getElementById('arQLCss')) { const st = document.createElement('style'); st.id = 'arQLCss'; st.textContent = QL_CSS; document.head.appendChild(st); }
  document.getElementById('arQL')?.remove();
  const box = document.createElement('div'); box.id = 'arQL';
  box.innerHTML = '<button type="button" class="x" aria-label="Close">×</button><div class="size"></div><a rel="ar">Open in AR <img alt=""></a><div class="hint"></div>';
  box.querySelector('.size')!.textContent = sizeText(vp.S, store.scene.units);
  box.querySelector('.hint')!.textContent = 'Tap the floor or a stand top to place it. True size: pinch-zoom is turned off.';
  const a = box.querySelector('a')!;
  a.href = qlUrl + '#allowsContentScaling=0'; // Quick Look: no pinch-scaling, the tank stays at true size
  a.querySelector('img')!.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='; // Quick Look needs an img child
  box.querySelector('.x')!.addEventListener('click', () => box.remove());
  document.body.appendChild(box);
  a.click(); // opens Quick Look right away where the tap still counts; else the link in the panel does
}

async function runAR(viewer: Viewer, store: Store, _button?: HTMLButtonElement) {
  viewer.draw(); // the current build, up to date
  // split view: start with the tank the panel edits; the A / B button swaps to the other one in place
  const views = viewer.active.filter(v => v.scene), r = viewer.renderer, units = store.scene.units;
  let vp = viewer.current, S = vp.S;
  if (!vp.scene) return;
  if (!document.getElementById('arCss')) { const st = document.createElement('style'); st.id = 'arCss'; st.textContent = OVERLAY_CSS; document.head.appendChild(st); }
  const overlay = document.createElement('div'); overlay.id = 'arOverlay';
  overlay.innerHTML = '<div class="fps"></div><button type="button" class="close">Close</button><div class="bar"><button type="button" class="swap" hidden></button><div class="msg hint"></div><div class="msg size"></div></div>';
  document.body.appendChild(overlay);
  const hint = overlay.querySelector<HTMLElement>('.hint')!, fpsEl = overlay.querySelector<HTMLElement>('.fps')!;
  const sizeEl = overlay.querySelector<HTMLElement>('.size')!, swapBtn = overlay.querySelector<HTMLButtonElement>('.swap')!;
  const label = () => {
    sizeEl.textContent = (views.length > 1 ? `Tank ${vp.key} · ` : '') + sizeText(S, units);
    swapBtn.hidden = views.length < 2; swapBtn.textContent = `Show tank ${views.find(v => v !== vp)?.key ?? ''}`;
  };
  label();
  hint.textContent = 'Point the phone at the floor or a stand top and move it slowly';

  let session: XRSession;
  try {
    session = await navigator.xr!.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: overlay } });
  } catch (e) { overlay.remove(); throw e; }

  r.xr.enabled = true; r.xr.setReferenceSpaceType('local');
  await r.xr.setSession(session);
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitSource = (await session.requestHitTestSource!({ space: viewerSpace }))!;

  let prep = prepScene(vp), centre = baseCentre(S, vp.T);
  prep.showTank(false);
  const rig = new THREE.Object3D(); rig.matrixAutoUpdate = false;
  const cam = new THREE.PerspectiveCamera(50, 1, 0.02, 60); rig.add(cam); // near / far in m: the view space is the room's
  const hit = { ok: false, pos: new THREE.Vector3(), m: new THREE.Matrix4() }, eye = new THREE.Vector3();
  let placed: THREE.Vector3 | null = null, yaw = 0;

  const place = () => {
    if (!hit.ok) return;
    if (!placed) yaw = faceYaw(hit.pos, eye);
    placed = hit.pos.clone(); prep.showTank(true);
    hint.textContent = 'Tap to move it · drag to turn it';
  };
  // input: through the DOM overlay when there is one (tap = place, one-finger drag = turn), else XR select (tap only)
  let down: { x: number; last: number; moved: boolean } | null = null;
  overlay.addEventListener('beforexrselect', e => e.preventDefault());
  overlay.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('button')) return; down = { x: e.clientX, last: e.clientX, moved: false }; });
  overlay.addEventListener('pointermove', e => {
    if (!down) return;
    if (Math.abs(e.clientX - down.x) > TAP_PX) down.moved = true;
    if (down.moved && placed) yaw += dragYaw(e.clientX - down.last, innerWidth);
    down.last = e.clientX;
  });
  overlay.addEventListener('pointerup', () => { if (down && !down.moved) place(); down = null; });
  overlay.addEventListener('pointercancel', () => { down = null; });
  session.addEventListener('select', () => { if (!session.domOverlayState) place(); });
  overlay.querySelector('.close')!.addEventListener('click', () => { session.end(); });
  // the other tank on the same spot of the floor, turned the same way (its own stand height: base centre on the floor)
  swapBtn.addEventListener('click', () => {
    const next = views.find(v => v !== vp); if (!next) return;
    prep.restore(); vp = next; S = vp.S; prep = prepScene(vp); centre = baseCentre(S, vp.T);
    prep.showTank(!!placed); label();
  });

  let frames = 0, t0 = 0;
  viewer.xrFrame = (t, frame) => {
    const ref = r.xr.getReferenceSpace()!;
    const pose = frame.getViewerPose(ref);
    if (pose) eye.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
    const res = frame.getHitTestResults(hitSource).map(h => h.getPose(ref)).find(p => p && isLevel(p.transform.matrix));
    hit.ok = !!res;
    if (res) { hit.m.fromArray(res.transform.matrix); hit.pos.setFromMatrixPosition(hit.m); }
    if (hit.ok && !placed) hint.textContent = 'Tap to place the tank';
    rigMatrix(placed ?? hit.pos, yaw, centre, rig.matrix); rig.matrixWorld.copy(rig.matrix);
    prep.reticle.visible = hit.ok;
    if (hit.ok) { prep.reticle.matrix.multiplyMatrices(rig.matrix, hit.m); prep.reticle.matrixWorldNeedsUpdate = true; }
    prep.sway(t);
    setLightUniforms(vp.T, S.light, S.lid, S.render.beams, S); setWaterUniforms(vp.T, S.water, S.render.pop);
    LU.uWater.value.w *= AR_WATER;
    OUTLINE.uPop.value = S.render.pop; OUTLINE.uVpH.value = r.getDrawingBufferSize(new THREE.Vector2()).y;
    r.setClearColor(0x000000, 0);
    r.render(vp.scene!, cam);
    if (++frames >= 30) { if (t0) fpsEl.textContent = `${Math.round(30000 / (t - t0))} fps`; frames = 0; t0 = t; }
  };

  await new Promise<void>(done => session.addEventListener('end', () => {
    viewer.xrFrame = null;
    hitSource.cancel();
    prep.restore();
    r.xr.enabled = false;
    overlay.remove();
    viewer.invalidate();
    done();
  }, { once: true }));
}
