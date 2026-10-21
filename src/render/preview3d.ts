// Species preview tile in 3D: the same model the tank draws (card + solid body, or the 3D snail), on its own small
// renderer, orbited by dragging. Rendered on demand only (after a drag or a resize), with the flat-light key so the
// body shows its form but does not depend on the tank's lamps or water colour.
import * as THREE from 'three';
import type { Species } from '../data/species';
import { cardGeometry } from './build';
import { fish3d, fishBody } from './fish3d';
import { LU, applyLighting } from './lighting';
import { herpBody, isHerp3D } from './herp3d';
import { snailBody } from './snail3d';
import { cardMaterial, fishBodyTexture, fishTexture } from './textures';

const EDGE = 'a2c' as const, FOV = 28, YAW0 = 0.55, PITCH0 = 0.18, PITCH_MAX = 1.35;

/** The model for a species at width 1 (unit frame: head at +x, card facing +z). */
export function speciesModel(sp: Species) {
  const g = new THREE.Group();
  if (sp.kind === 'snail') { g.add(snailBody(sp.art, 1)); return g; }
  if (isHerp3D(sp.art)) { g.add(herpBody(sp.art, 1)); return g; }
  const tex = fishTexture(sp, EDGE, true, fish3d.fade);
  const m = new THREE.Mesh(cardGeometry(1, sp.aspect, 0), cardMaterial(`fish:${sp.look}:${fish3d.fade}`, tex, EDGE));
  m.add(fishBody(sp.art, sp.aspect, 1, 0, fishBodyTexture(sp), EDGE));
  g.add(m);
  return g;
}

export class SpeciesPreview {
  readonly canvas = document.createElement('canvas');
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 2, 0.01, 100);
  private model?: THREE.Group;
  private centre = new THREE.Vector3();
  private dist = 2;
  private yaw = YAW0;
  private pitch = PITCH0;
  private queued = false;

  /** Throws if WebGL is unavailable (the caller keeps the 2D card then). */
  constructor(pixelRatio = Math.min(devicePixelRatio, 2)) {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.canvas.className = 'orbit';
    this.canvas.title = 'Drag to turn · double-click to reset';
    let drag: { x: number; y: number; id: number } | null = null;
    this.canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      this.yaw -= (e.clientX - drag.x) * 0.012;
      this.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, this.pitch + (e.clientY - drag.y) * 0.012));
      drag.x = e.clientX; drag.y = e.clientY; this.draw();
    });
    const end = () => { drag = null; };
    this.canvas.addEventListener('pointerup', end); this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('dblclick', () => { this.yaw = YAW0; this.pitch = PITCH0; this.draw(); });
    new ResizeObserver(() => this.draw()).observe(this.canvas);
  }

  /** Show a species, from the starting 3/4 view. */
  show(sp: Species) { this.load(sp); this.draw(); }

  /** A still of a species from the starting view, as a transparent PNG data URL (the stocking gallery's tiles). */
  snapshot(sp: Species, w: number, h: number): string {
    this.load(sp);
    this.render(w, h);
    return this.canvas.toDataURL('image/png');
  }

  private load(sp: Species) {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse(o => { const g = (o as THREE.Mesh).geometry; if (g && !g.userData.keep) g.dispose(); });
    }
    this.model = speciesModel(sp);
    this.scene.add(this.model);
    applyLighting(this.scene);
    const sphere = new THREE.Box3().setFromObject(this.model).getBoundingSphere(new THREE.Sphere());
    this.centre.copy(sphere.center);
    // fit (most of) the bounding sphere: the model stays in frame whichever way it is turned, bar a nibble at the
    // tile's top and bottom when its length is turned upright
    this.dist = sphere.radius / Math.sin((FOV / 2) * THREE.MathUtils.DEG2RAD) * 0.85;
    this.yaw = YAW0; this.pitch = PITCH0;
  }

  /** Render on the next frame (coalesces drag events). */
  draw() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => { this.queued = false; this.render(); });
  }

  private render(w = this.canvas.clientWidth, h = this.canvas.clientHeight) {
    if (!this.model || !w || !h) return;
    this.renderer.setSize(w, h, false);
    // the wider of the two fits: a tall canvas keeps the fish's length inside the width
    this.camera.aspect = w / h;
    const fit = Math.max(1, 1 / this.camera.aspect);
    const d = this.dist * fit, cp = Math.cos(this.pitch);
    this.camera.position.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).multiplyScalar(d).add(this.centre);
    this.camera.lookAt(this.centre);
    this.camera.updateProjectionMatrix();
    // flat light + no water tint for the preview; the uniforms are shared with the tank, so restore them after
    const mode = LU.uMode.value, water = LU.uWater.value.w;
    LU.uMode.value = 0; LU.uWater.value.w = 0;
    this.renderer.render(this.scene, this.camera);
    LU.uMode.value = mode; LU.uWater.value.w = water;
  }
}
