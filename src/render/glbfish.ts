/**
 * DOGFOOD ONLY (`?glbfish`): test of the generative image-to-3D method (research/multiview-to-3d.md, E-GEN).
 * Oscars are drawn with the Hunyuan3D-2mv mesh (sheet colours baked into a texture) instead of the measured loft.
 *   ?glbfish            every second oscar uses the 8000-triangle mesh, the others stay build B
 *   ?glbfish=3000       that triangle budget (20000 / 8000 / 3000 / 1200)
 *   ?glbfish=ladder     oscars cycle build B, 20000, 8000, 3000, 1200 (side-by-side look)
 *   ?glbfish=3000&glball  every oscar uses the mesh (performance runs)
 * The meshes are length 1 along +x (head), centred.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { outlineMat } from './fish3d';

const q = new URLSearchParams(location.search);
export const GLB_ON = q.has('glbfish');
const LODS = [20000, 8000, 3000, 1200];
const want = q.get('glbfish') || '8000', all = q.has('glball');
const order: (number | null)[] = want === 'ladder' ? [null, ...LODS] : all ? [+want] : [+want, null];
const parts = new Map<number, { geo: THREE.BufferGeometry; mat: THREE.Material }>();
let n = 0;
if (GLB_ON) {
  const loader = new GLTFLoader();
  await Promise.all([...new Set(order.filter((x): x is number => x != null))].map(async t => {
    const g = await loader.loadAsync(`${import.meta.env.BASE_URL}art/fish/lod/oscar-hy2mv-${t}.glb`).catch(e => { console.warn('glbfish', t, e); return null; });
    let mesh: THREE.Mesh | null = null; g?.scene.traverse(o => { if ((o as THREE.Mesh).isMesh && !mesh) mesh = o as THREE.Mesh; });
    if (!mesh) return;
    const geo = (mesh as THREE.Mesh).geometry, map = ((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial).map;
    // swim (swim.ts) reads `uv.x` as the body axis (0 tail .. 1 nose) and `aSwL` 1 = the unit body moves: the texture's atlas
    // UVs move to the second channel and `uv` becomes the body axis (the mesh is length 1 along +x, centred)
    const pos = geo.attributes.position, n = pos.count, ax = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { ax[i * 2] = pos.getX(i) + 0.5; ax[i * 2 + 1] = 0.5; }
    geo.setAttribute('uv1', geo.attributes.uv); geo.setAttribute('uv', new THREE.Float32BufferAttribute(ax, 2));
    geo.setAttribute('aSwL', new THREE.Float32BufferAttribute(new Float32Array(n).fill(1), 1));
    if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.channel = 1; }
    const mat = new THREE.MeshBasicMaterial({ map }); mat.userData.fish = true; mat.userData.swim = true; mat.userData.cached = true; // lit like a fish body, swims with the card
    parts.set(t, { geo, mat });
  }));
}

/** Swap this oscar to a generated mesh per the flag. Returns true when swapped. */
export function glbSwap(art: string, card: THREE.Mesh, w: number): boolean {
  if (!GLB_ON || art !== 'oscar') return false;
  const t = order[n++ % order.length]; const p = t == null ? null : parts.get(t);
  if (!p) return false;
  const cm = (card.material as THREE.Material).clone(); cm.visible = false; card.material = cm; // the card's median fins: the mesh has its own
  const grp = new THREE.Group(); grp.scale.setScalar(w); grp.userData.glbfish = t;
  grp.add(new THREE.Mesh(p.geo, p.mat));
  const o = new THREE.Mesh(p.geo, outlineMat); o.userData.nolight = true; grp.add(o); // the same silhouette line as the loft bodies
  card.add(grp);
  return true;
}
