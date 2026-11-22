/**
 * DOGFOOD ONLY (`?glbfish`): test of the generative image-to-3D method (research/multiview-to-3d.md, E-GEN).
 * Every second oscar is drawn with the Hunyuan3D-2mv mesh (sheet colours baked into vertex colours) instead of the
 * measured loft, so the two sit side by side in one tank. The mesh is length 1 along +x (head), centred.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const GLB_ON = new URLSearchParams(location.search).has('glbfish');
let geo: THREE.BufferGeometry | null = null, mat: THREE.Material | null = null, n = 0;
if (GLB_ON) {
  const g = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}art/fish/oscar-hy2mv.glb`).catch(e => { console.warn('glbfish', e); return null; });
  g?.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !geo) { geo = m.geometry; } });
  if (geo) {
    const c = (geo as THREE.BufferGeometry).attributes.position.count;
    (geo as THREE.BufferGeometry).setAttribute('aSwL', new THREE.Float32BufferAttribute(new Float32Array(c), 1)); // holds still
    // the bake wrote the sheet's sRGB bytes; glTF vertex colours are read as linear, so convert (else the fish washes out)
    const col = (geo as THREE.BufferGeometry).attributes.color as THREE.BufferAttribute, lin = new Float32Array(c * 3), tmp = new THREE.Color();
    for (let i = 0; i < c; i++) { tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i)).convertSRGBToLinear(); lin[i * 3] = tmp.r; lin[i * 3 + 1] = tmp.g; lin[i * 3 + 2] = tmp.b; }
    (geo as THREE.BufferGeometry).setAttribute('color', new THREE.Float32BufferAttribute(lin, 3));
    mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  }
}

/** Swap this oscar to the generated mesh (every second one). Returns true when swapped. */
export function glbSwap(art: string, card: THREE.Mesh, w: number): boolean {
  if (!GLB_ON || art !== 'oscar' || !geo || !mat || n++ % 2 === 1) return false;
  const cm = (card.material as THREE.Material).clone(); cm.visible = false; card.material = cm; // the card's median fins: the mesh has its own
  const m = new THREE.Mesh(geo, mat); m.scale.setScalar(w); m.userData.glbfish = true;
  card.add(m);
  return true;
}
