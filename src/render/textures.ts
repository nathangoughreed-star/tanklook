import * as THREE from 'three';
import { drawBlendTile, drawFishCard, drawPerson, drawSubstrate, substrateMask, type PresetSubstrate } from '../art/placeholder';
import { drawPairedFin, type PairedFin } from '../art/fishgen';
import { FIN_A, style } from '../art/paint';
import { drawPlantCard, type PlantType } from '../art/plants';
import { drawSnailCard, type SnailView } from '../art/snails';
import type { Species } from '../data/species';
import type { EdgeMode, SubstrateBlend } from '../scene/types';

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

/**
 * Per edge mode: alpha-to-coverage gets clearer fins (cutout needs fin alpha above its 0.5 test). `solid` = the card
 * of a 3D fish: only the median fins (paired fins are their own meshes; the body is cut out, as it showed past the solid).
 */
export const fishTexture = (sp: Species, edge: EdgeMode = 'cutout', solid = false, hollow = solid) => cached(`fish:${sp.look}:${edge}:${solid}:${hollow}`, () => {
  return finish(drawFishCard(sp.art, sp.aspect, 1024, edge === 'a2c' ? 0.36 : undefined, true, !solid, hollow));
});
/** The 3D body's texture: the card painting without eye, gill and mouth (fins are hidden inside the solid anyway). */
export const fishBodyTexture = (sp: Species) => cached(`fishbody:${sp.look}`, () => {
  return finish(drawFishCard(sp.art, sp.aspect, 1024, undefined, false, false));
});
/** A 3D fish's paired fin as its own small texture (drawn at the card's resolution); `box` = its extent in card units. */
export const pairedFinTexture = (art: string, f: PairedFin, box: { u0: number; v0: number; w: number; h: number }, edge: EdgeMode) =>
  cached(`fin:${art}:${f.kind}:${edge}`, () => {
    const R = 1024, c = document.createElement('canvas'); c.width = Math.ceil(box.w * R); c.height = Math.ceil(box.h * R);
    const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    style.finA = edge === 'a2c' ? 0.36 : FIN_A;
    drawPairedFin({ ...f, a: f.kind === 'pectoral' ? undefined : f.a }, ctx, (u, v) => [(u - box.u0) * R, (v - box.v0) * R], R);
    style.finA = FIN_A;
    return finish(c);
  });
export const substrateTexture = (type: PresetSubstrate) => cached('sub:' + type, () => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  drawSubstrate(c.getContext('2d')!, 512, type);
  return finish(c, true);
});
/**
 * Custom substrate tiles ('a' / 'b' each grain alone, 'm' mixed grain by grain). Only the inputs a tile depends on
 * are in its key; kept in a small cache of their own (dragging a colour makes a new tile per step), the oldest disposed.
 */
const blendTex = new Map<string, THREE.Texture>();
export function blendTexture(b: SubstrateBlend, which: 'a' | 'b' | 'm') {
  const key = which === 'a' ? `a:${b.grain}:${b.color}:${b.grain2}` : which === 'b' ? `b:${b.grain2}:${b.color2}:${b.grain}`
    : `m:${b.grain}:${b.color}:${b.grain2}:${b.color2}:${b.share}`;
  let t = blendTex.get(key);
  if (t) { blendTex.delete(key); blendTex.set(key, t); return t; } // most recent last
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  drawBlendTile(c.getContext('2d')!, 1024, b, which);
  t = finish(c, true); t.userData.keep = true; blendTex.set(key, t);
  if (blendTex.size > 18) { const [k0, t0] = blendTex.entries().next().value!; blendTex.delete(k0); t0.dispose(); }
  return t;
}
/** Where each grain of a custom blend lies (see placeholder `substrateMask`). */
let maskTex: THREE.DataTexture | undefined;
export function substrateMaskTexture() {
  if (maskTex) return maskTex;
  const t = new THREE.DataTexture(substrateMask().data, 256, 256);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; t.userData.keep = true;
  return (maskTex = t);
}
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
