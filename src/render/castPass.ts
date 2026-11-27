// The cast-shadow depth pass (lane SH1, request R191a; the shader side is render/castShadow.ts). The rock, wood,
// plants and gear are drawn as depth from the fixture into a depth texture. The scape is static, so the map is redrawn
// only when its key changes: a scene edit (build / patch), the light (emitters, type, height), the Show boxes, the
// resolution. Orbiting, caustic steps and plant sway reuse it; the fish neither cast (they move; their soft contact
// shadow stays) nor force a redraw, but they do receive.
import * as THREE from 'three';
import { CAST, castNone } from './castShadow';
import { LU } from './lighting';
import { GROW_DECL, GROW_VERT, SWAY } from './plant3d';
import { FX } from './fx';
import { perf } from './perf';
import type { Tank } from '../scene/types';

/** Shadow-map size by the Performance level: Full quality 2048, every lighter level 1024. */
export const castRes = (level = perf.level) => (level > 0 ? 1024 : 2048);
/** The parts that cast (build.ts PART): hardscape (rock, wood, gear, a 3D back wall), plants. */
const CASTS = new Set([3, 4]);

interface Pass { rt: THREE.WebGLRenderTarget; key: string; cam: THREE.PerspectiveCamera; soft: [number, number] }
/** One map per view slot (side A / B), reused across rebuilds: a full build makes a new scene, and a map per scene would leak GPU memory. */
const passes = new Map<number, Pass>();
const depthMats = new WeakMap<THREE.Material, THREE.MeshDepthMaterial>();
/** Counts depth passes drawn (for the tests and the A/B scripts: orbiting must not add any). */
export const castStats = { passes: 0 };

function depthOf(m: THREE.Material): THREE.MeshDepthMaterial {
  let d = depthMats.get(m);
  if (d) return d;
  const b = m as THREE.MeshBasicMaterial, plant = !!m.userData.plantClip;
  d = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  // cut-out leaves and fronds: their texture's alpha is the outline
  const cut = b.alphaTest > 0 || ((m.transparent || plant) && !!b.map);
  if (cut) { d.map = b.map; d.alphaMap = b.alphaMap; d.alphaTest = b.alphaTest > 0 ? b.alphaTest : 0.5; }
  if (plant) { // a growing plant's leaves are placed in the vertex shader (plant3d growShader): the shadow grows with them
    d.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, SWAY);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GROW_DECL).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GROW_VERT);
    };
    d.customProgramCacheKey = () => 'castGrow' + (cut ? 'c' : '');
  }
  depthMats.set(m, d);
  return d;
}

const topOf = (o: THREE.Object3D) => { while (o.parent && !(o.parent as THREE.Scene).isScene) o = o.parent; return o; };
const casts = (m: THREE.Material) => !!m.userData.aq && !m.userData.room && !m.userData.pane && !m.userData.fish;

/**
 * The shadow camera: a point at the middle of the fixture's emitters, looking straight down (the beam axis). A
 * spread-out fixture (several pucks, an LED bar, tubes) is a broad source: the point is lifted by its spread so the
 * shadows fall nearly straight, and a long bar or tube softens the edges along its length. Null: nothing to cast from
 * (no fixture, or a light below the rim, as a submersible stick).
 */
export function castCamera(T: Tank, em: Float32Array, n: number) {
  if (n < 1) return null;
  let cx = 0, cy = 0, cz = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, w = 0;
  for (let i = 0; i < n; i++) {
    const x = em[i * 4], y = em[i * 4 + 1], z = em[i * 4 + 2], h = em[i * 4 + 3];
    cx += x / n; cy += y / n; cz += z / n; w = Math.max(w, h);
    x0 = Math.min(x0, x - h); x1 = Math.max(x1, x + h); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  if (cy < T.H + 10) return null;
  const lift = 0.8 * Math.max(x1 - x0, z1 - z0), P = new THREE.Vector3(cx, cy + lift, cz);
  let t = 0.05;
  for (const x of [0, T.L]) for (const z of [0, -T.D]) for (const y of [0, T.H]) t = Math.max(t, Math.abs(x - P.x) / (P.y - y), Math.abs(z - P.z) / (P.y - y));
  const fov = 2 * Math.atan(Math.min(t * 1.04, 5)) * 180 / Math.PI;
  const near = Math.max(5, (P.y - T.H) * 0.5), far = P.y + 40;
  const cam = new THREE.PerspectiveCamera(fov, 1, near, far);
  cam.position.copy(P); cam.up.set(0, 0, -1); cam.lookAt(P.x, P.y - 1, P.z); cam.updateMatrixWorld(true);
  // a bar or a tube: a line source along x, so its shadows blur that way (texels at 2048; scaled with the map)
  const soft: [number, number] = [w > 0 ? 1 + Math.min(w / 150, 2.5) : n > 1 ? 1.5 : 1, n > 1 ? 1.3 : 1];
  return { cam, soft };
}

/**
 * Before drawing a tank: make sure its shadow map is current and point the shared uniforms at it. Call after
 * setLightUniforms (it reads the emitters from LU). `rev` changes whenever the scene was built or patched; `hidden`
 * is the Show boxes' test for a top-level object (a hidden plant throws no shadow).
 */
export function castShadows(r: THREE.WebGLRenderer, slot: number, sc: THREE.Scene, T: Tank, rev: number, hidden: (o: THREE.Object3D) => boolean, hiddenKey = '') {
  const em = LU.uEm.value, n = LU.uEmN.value;
  if (!FX.shadows || LU.uMode.value !== 1) { off(); return; }
  const res = castRes();
  const key = [sc.id, rev, res, hiddenKey, T.L, T.H, T.D, n, ...Array.from(em.subarray(0, n * 4), v => Math.round(v))].join(',');
  let p = passes.get(slot);
  if (!p || p.key !== key) {
    const cc = castCamera(T, em, n);
    if (!cc) { off(); return; }
    if (!p || p.rt.width !== res) {
      p?.rt.dispose();
      const dt = new THREE.DepthTexture(res, res); dt.compareFunction = THREE.LessEqualCompare; dt.minFilter = dt.magFilter = THREE.LinearFilter;
      const rt = new THREE.WebGLRenderTarget(res, res, { depthTexture: dt, depthBuffer: true, type: THREE.UnsignedByteType });
      p = { rt, key: '', cam: cc.cam, soft: cc.soft }; passes.set(slot, p);
    }
    p.cam = cc.cam; p.soft = cc.soft; p.key = key;
    draw(r, sc, p, hidden);
  }
  const k = 2048 / res;
  CAST.uCastOn.value = 1; CAST.uCastMap.value = p.rt.depthTexture!;
  CAST.uCastMat.value.multiplyMatrices(p.cam.projectionMatrix, p.cam.matrixWorldInverse);
  CAST.uCastNF.value.set(p.cam.near, p.cam.far, 1 / res);
  CAST.uCastSoft.value.set(p.soft[0] / k, p.soft[1] / k).max(new THREE.Vector2(1, 1));
}

/** After the views are drawn: the other renderers (gear / plant stills, the fish preview, AR) never see this one's map. */
export function off() { CAST.uCastOn.value = 0; CAST.uCastMap.value = castNone(); }

function draw(r: THREE.WebGLRenderer, sc: THREE.Scene, p: Pass, hidden: (o: THREE.Object3D) => boolean) {
  const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [], held: THREE.Object3D[] = [];
  const top = new Map<THREE.Object3D, boolean>();
  const castsHere = (o: THREE.Object3D) => {
    const t = topOf(o); let c = top.get(t);
    if (c === undefined) { c = CASTS.has(t.userData.part ?? 0) && !hidden(t) && !t.userData.spaceOutline && !t.userData.gearSelBox; top.set(t, c); }
    return c;
  };
  sc.traverse(o => {
    if (o === sc || !o.visible) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const mats = ([] as THREE.Material[]).concat(mesh.material);
      if (castsHere(o) && !o.userData.nolight && mats.some(casts)) {
        swapped.push([mesh, mesh.material]);
        mesh.material = Array.isArray(mesh.material) ? mats.map(depthOf) : depthOf(mats[0]);
        return;
      }
    }
    if (mesh.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite) { o.visible = false; held.push(o); }
  });
  const prev = r.getRenderTarget(), bg = sc.background, fog = sc.fog;
  sc.background = null; sc.fog = null;
  try {
    r.setRenderTarget(p.rt); r.clear(true, true, true); r.render(sc, p.cam); castStats.passes++;
  } finally {
    r.setRenderTarget(prev); sc.background = bg; sc.fog = fog;
    for (const [m, mat] of swapped) m.material = mat;
    for (const o of held) o.visible = true;
  }
}
