import * as THREE from 'three';
import { drawFishCard, drawPerson, drawSubstrate } from '../art/placeholder';
import { drawPlantCard, type PlantType } from '../art/plants';
import { drawSnailCard, type SnailView } from '../art/snails';
import { getSpecies } from '../data/species';
import type { EdgeMode, SubstrateType } from '../scene/types';

let anisotropy = 1;
export function setMaxAnisotropy(a: number) { anisotropy = a; }

const texCache = new Map<string, THREE.Texture>();
function finish(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy;
  return t;
}
function cached(key: string, make: () => THREE.Texture) {
  let t = texCache.get(key); if (!t) { t = make(); texCache.set(key, t); }
  return t;
}

export const fishTexture = (speciesId: string) => cached('fish:' + speciesId, () => {
  const sp = getSpecies(speciesId)!;
  return finish(drawFishCard(sp.art, sp.aspect));
});
export const substrateTexture = (type: SubstrateType) => cached('sub:' + type, () => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  drawSubstrate(c.getContext('2d')!, 512, type);
  return finish(c, true);
});
export const plantTexture = (type: PlantType) => cached('plant:' + type, () => finish(drawPlantCard(type)));
export const snailTexture = (art: string, view: SnailView) => cached(`snail:${art}:${view}`, () => finish(drawSnailCard(art, view)));
export const personTexture = () => cached('person', () => {
  const c = document.createElement('canvas'); c.height = 1536; c.width = Math.round(1536 * 0.34);
  drawPerson(c.getContext('2d')!, c.width, c.height);
  return finish(c);
});
export const gradientTexture = () => cached('bg-gradient', () => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#7fc0e3'); g.addColorStop(0.55, '#2f7fb3'); g.addColorStop(1, '#123a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  return finish(c);
});

/** Card materials are shared across rebuilds (marked cached so scene disposal leaves them alone). */
const matCache = new Map<string, THREE.MeshBasicMaterial>();
export function cardMaterial(key: string, map: THREE.Texture, edge: EdgeMode, side: THREE.Side = THREE.DoubleSide) {
  const k = key + '|' + edge + '|' + side;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map, side });
    if (edge === 'cutout') m.alphaTest = 0.5; else m.alphaToCoverage = true;
    m.userData.cached = true;
    matCache.set(k, m);
  }
  return m;
}
