import * as THREE from 'three';
import { LECA, drawBlendTile, drawFishCard, drawLook, drawPerson, drawSubstrate, substrateMask, type PresetSubstrate } from '../art/placeholder';
import { drawPairedFin, type PairedFin } from '../art/fishgen';
import { drawScene, type BgScene } from '../art/bgscenes';
import { FX } from './fx';
import { SUBSTRATES } from '../art/placeholder';
import { rng } from '../art/paint';
import { FIN_A, FIN_A2C, style } from '../art/paint';
import type { Species } from '../data/species';
import type { BgFit, EdgeMode, SubstrateBlend } from '../scene/types';

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
  return finish(drawFishCard(sp.art, sp.aspect, 1024, edge === 'a2c' ? FIN_A2C : undefined, true, !solid, hollow));
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
    style.finA = edge === 'a2c' ? FIN_A2C : FIN_A;
    drawPairedFin({ ...f, a: f.kind === 'pectoral' ? undefined : f.a }, ctx, (u, v) => [(u - box.u0) * R, (v - box.v0) * R], R);
    style.finA = FIN_A;
    return finish(c);
  });
export const substrateTexture = (type: PresetSubstrate) => cached('sub:' + type + (FX.sand && SUBSTRATES[type].kind === 'sand' ? ':d' : ''), () => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  drawSubstrate(c.getContext('2d')!, 512, type);
  if (FX.sand && SUBSTRATES[type].kind === 'sand') sandDetail(c.getContext('2d')!, 512, type); // VF-C2
  return finish(c, true);
});
/**
 * VF-C2 (fx sand): the painted-only sands (white, black, aragonite, crushed coral, terrarium) are blobs of three or four
 * shades; up close that is one flat colour. Over the base tile, per pixel-scale: single grains (a dot a pixel or two,
 * light and dark, in the bed's shades), a few mineral specks (dark heavy grains in pale sands, pale ones in dark), soft
 * ripple streaks (slightly lighter and darker, drifting), and for the crushed coral the odd shell fragment. Tiles seamlessly
 * (everything is stamped at 3 x 3 offsets).
 */
function sandDetail(x: CanvasRenderingContext2D, W: number, type: PresetSubstrate) {
  const t = SUBSTRATES[type], r = rng(23), dark = (hexLum(t.base) < 90);
  const at = (f: (dx: number, dy: number) => void) => { for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) f(dx, dy); };
  // broad ripples: long, thin, faint streaks along one drift direction, tilted a little by position
  for (let i = 0; i < 46; i++) {
    const px = r() * W, py = r() * W, len = 60 + r() * 150, th = 1.5 + r() * 3.5, tilt = (r() - 0.5) * 0.25, light = r() < 0.5;
    x.strokeStyle = light ? 'rgba(255,248,232,0.07)' : 'rgba(30,22,12,0.08)'; x.lineWidth = th; x.lineCap = 'round';
    at((dx, dy) => { x.beginPath(); x.moveTo(px + dx, py + dy); x.lineTo(px + dx + len, py + dy + len * tilt); x.stroke(); });
  }
  // single grains in the bed's shades, light and dark of them
  const n = Math.round(W * W / 9);
  for (let i = 0; i < n; i++) {
    const px = r() * W, py = r() * W, sh = t.shades[Math.floor(r() * t.shades.length)], k = 0.78 + r() * 0.45, rad = 0.5 + r() * 0.9;
    const [R, G, B] = hexRgbL(sh); x.fillStyle = `rgba(${Math.min(255, R * k) | 0},${Math.min(255, G * k) | 0},${Math.min(255, B * k) | 0},${0.35 + r() * 0.4})`;
    at((dx, dy) => { x.beginPath(); x.ellipse(px + dx, py + dy, rad, rad * (0.65 + r() * 0.35), r() * 3, 0, 7); x.fill(); });
  }
  // mineral specks and, in the coral, fragments of shell
  const specks = Math.round(W * W / 420);
  for (let i = 0; i < specks; i++) {
    const px = r() * W, py = r() * W, rad = 0.6 + r() * 1.1;
    x.fillStyle = dark ? `rgba(225,215,200,${0.3 + r() * 0.3})` : `rgba(40,32,26,${0.28 + r() * 0.35})`;
    at((dx, dy) => { x.beginPath(); x.arc(px + dx, py + dy, rad, 0, 7); x.fill(); });
  }
  if (type === 'coral') for (let i = 0; i < 60; i++) {
    const px = r() * W, py = r() * W, a = r() * 3, l = 3 + r() * 5, th = 1.2 + r() * 1.6;
    x.strokeStyle = r() < 0.5 ? 'rgba(250,246,236,0.7)' : 'rgba(205,192,168,0.65)'; x.lineWidth = th; x.lineCap = 'round';
    at((dx, dy) => { x.beginPath(); x.moveTo(px + dx, py + dy); x.lineTo(px + dx + Math.cos(a) * l, py + dy + Math.sin(a) * l); x.stroke(); });
  }
}
const hexRgbL = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hexLum = (h: string) => { const [r, g, b] = hexRgbL(h); return (r + g + b) / 3; };
/** The clay-ball drainage layer of 'layered' ground (its cross-section at the glass). */
export const lecaTexture = () => cached('sub:leca', () => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  drawLook(c.getContext('2d')!, 512, LECA);
  return finish(c, true);
});
/** The mesh sheet between the drainage layer and the soil: a fine dark weave. */
export const meshTexture = () => cached('sub:mesh', () => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#1c1e1b'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#4a4f47';
  for (let i = 0; i < 64; i += 8) { x.fillRect(i, 0, 3, 64); x.fillRect(0, i, 64, 3); }
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
export const personTexture = () => cached('person', () => {
  const c = document.createElement('canvas'); c.height = 1536; c.width = Math.round(1536 * 0.34);
  drawPerson(c.getContext('2d')!, c.width, c.height);
  return finish(c);
});
/** Top-to-bottom colour stops of the gradient backgrounds (render/build.ts BACKGROUNDS.gradient). */
export const BG_GRADIENTS = {
  ocean: [[0, '#7fc0e3'], [0.55, '#2f7fb3'], [1, '#123a5e']],
  abyss: [[0, '#1d5a8c'], [0.5, '#0d2c4a'], [1, '#03080f']],
  sky: [[0, '#f2f8fc'], [0.5, '#bfe0f2'], [1, '#86c3e6']],
} as const satisfies Record<string, readonly (readonly [number, string])[]>;
export type BgGradient = keyof typeof BG_GRADIENTS;
export const gradientTexture = (kind: BgGradient = 'ocean') => cached(kind === 'ocean' ? 'bg-gradient' : 'bg-gradient-' + kind, () => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [at, col] of BG_GRADIENTS[kind]) g.addColorStop(at, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  return finish(c);
});

/** A printed-scene background, drawn at the sheet's aspect (rounded, so a resize does not repaint every frame). */
export function sceneTexture(kind: BgScene, aspect: number) {
  const a = Math.min(5, Math.max(1, Math.round(aspect * 2) / 2)), h = 512;
  return cached(`bg-scene-${kind}-${a}`, () => {
    const c = document.createElement('canvas'); c.height = h; c.width = Math.round(h * a);
    drawScene(c.getContext('2d')!, kind, c.width, h);
    return finish(c);
  });
}

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

/** Decoded background pictures by id, and who to tell when one finishes decoding (the viewer redraws). */
const pictures = new Map<string, HTMLImageElement>();
const pictureListeners: (() => void)[] = [];
export const onPictureLoad = (fn: () => void) => { pictureListeners.push(fn); };

/**
 * A background picture laid on a sheet `aspect` wide per unit of height (Nathan 2026-10-14): fill = cover and crop the
 * middle, fit = whole picture on `pad`, stretch = to the sheet, tile = repeats `scale` % of the sheet tall. Composed on a
 * canvas the sheet's shape, so the sheet's own 0..1 UVs need nothing else. Not cached: disposed with the scene.
 */
export function pictureTexture(id: string, data: string, fit: BgFit, scale: number, aspect: number, pad: string) {
  const M = 2048, a = Math.max(0.02, aspect);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(a >= 1 ? M : M * a)); c.height = Math.max(1, Math.round(a >= 1 ? M / a : M));
  const t = finish(c);
  const paint = (img: HTMLImageElement) => {
    const ctx = c.getContext('2d')!, W = c.width, H = c.height, iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    ctx.fillStyle = pad; ctx.fillRect(0, 0, W, H);
    if (fit === 'stretch') ctx.drawImage(img, 0, 0, W, H);
    else if (fit === 'tile') {
      const h = Math.max(4, H * scale / 100), w = h * iw / ih;
      for (let y = H - h; y > -h; y -= h) for (let x = 0; x < W; x += w) ctx.drawImage(img, x, y, w, h); // rows from the floor up
    } else {
      const k = fit === 'fill' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
      ctx.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    }
    t.needsUpdate = true;
  };
  let img = pictures.get(id);
  if (img?.complete && img.naturalWidth) paint(img);
  else {
    const ctx = c.getContext('2d')!; ctx.fillStyle = pad; ctx.fillRect(0, 0, c.width, c.height);
    if (!img) { img = new Image(); img.src = data; pictures.set(id, img); }
    img.addEventListener('load', () => { paint(img!); for (const fn of pictureListeners) fn(); }, { once: true });
  }
  return t;
}
