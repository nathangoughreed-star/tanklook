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
    geo.setAttribute('aSwL', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count), 1)); // holds still
    if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; }
    parts.set(t, { geo, mat: new THREE.MeshBasicMaterial({ map }) });
  }));
}

/** Swap this oscar to a generated mesh per the flag. Returns true when swapped. */
export function glbSwap(art: string, card: THREE.Mesh, w: number): boolean {
  if (!GLB_ON || art !== 'oscar') return false;
  const t = order[n++ % order.length]; const p = t == null ? null : parts.get(t);
  if (!p) return false;
  const cm = (card.material as THREE.Material).clone(); cm.visible = false; card.material = cm; // the card's median fins: the mesh has its own
  const m = new THREE.Mesh(p.geo, p.mat); m.scale.setScalar(w); m.userData.glbfish = t;
  card.add(m);
  return true;
}
