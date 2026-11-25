// The one painted leaf atlas every plant shares (lane PT, R151): public/art/plants/leaves.png, cut by
// scripts/plant-leaves.py. Until the image has loaded the texture is a white pixel, so plants draw in their vertex
// colours; a type with no leaf texture samples a white texel in the atlas, so it keeps its colours exactly.
import * as THREE from 'three';
import { ATLAS_FILE } from '../art/plantTex';

let tex: THREE.Texture | undefined, img: HTMLImageElement | undefined, pix: ImageData | null | undefined;
/** Called once the image has arrived (the viewer redraws). */
export const atlasLoaded: { on?: () => void } = {};

export function plantAtlas() {
  if (tex) return tex;
  if (typeof document === 'undefined' || typeof Image === 'undefined') { tex = new THREE.DataTexture(Uint8Array.of(255, 255, 255, 255), 1, 1); tex.needsUpdate = true; return tex; } // (headless: tests)
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const im = new Image();
  im.onload = () => {
    img = im; pix = undefined;
    tex!.image = im; tex!.dispose(); tex!.needsUpdate = true; // (a new size: the GPU texture is made again)
    atlasLoaded.on?.();
  };
  im.src = `${import.meta.env.BASE_URL}art/plants/${ATLAS_FILE}`;
  tex.userData.keep = true;
  return tex;
}

/** The atlas pixels (null until it has loaded): for the USDZ export, which bakes the leaf colours into vertex colours. */
export function atlasPixels() {
  if (pix !== undefined) return pix;
  if (!img) return null;
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0);
  return (pix = x.getImageData(0, 0, c.width, c.height));
}
