// Procedural wood grain for wood stand finishes (lane WG1, 2026-11-03; Nathan: "put some wood grain on that stand rather
// than flat untextured wood colour"). One small tileable DataTexture per finish (no image files: the single-file build
// stays small), multiplied into the stand's shaded vertex colours: the texture carries only light / dark, and the
// vertex colours are scaled by 1 / its mean so the stand keeps its finish colour on average. Black and white laminate
// stay plain. A DataTexture (not a canvas) so it also builds under node and the USDZ exporter can copy it.
import * as THREE from 'three';
import type { TankSetup } from '../scene/types';

type Finish = TankSetup['stand']['finish'];
/** How a wood finish's grain looks: growth rings across the board, ring contrast, open pores (0-1), warmth of the dark lines. */
export interface WoodLook { rings: number; contrast: number; pores: number; warm: number }
/** The catalogue's wood finishes (oak only today; a new wood finish adds a line here and its colour in STAND_FINISHES).
 *  Oak reads open-grained (visible pores, broad rings); a darker, tighter wood would take more rings and fewer pores. */
export const WOOD_LOOK: Partial<Record<Finish, WoodLook>> = { oak: { rings: 5, contrast: 0.36, pores: 0.55, warm: 1.5 } };

/** Texture size in px; one texel is about 1 mm along the grain (U_MM across the texture) and 1 mm across it (V_MM). */
const W = 1024, H = 256;
export const GRAIN_U_MM = 960, GRAIN_V_MM = 240;

const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Value noise, periodic with period (px, py) cells over the unit square. */
function noise(u: number, v: number, px: number, py: number, s: number) {
  const x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), w = (i: number, j: number) => hash(((i % px) + px) % px, ((j % py) + py) % py, s);
  return (w(x0, y0) * (1 - sx) + w(x0 + 1, y0) * sx) * (1 - sy) + (w(x0, y0 + 1) * (1 - sx) + w(x0 + 1, y0 + 1) * sx) * sy;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const cache = new Map<Finish, THREE.DataTexture>();
/** The finish's grain texture (shared), or null for a finish that is not wood. `userData.mean` = its mean linear brightness. */
export function woodTexture(f: Finish): THREE.DataTexture | null {
  const look = WOOD_LOOK[f]; if (!look || (import.meta.env?.DEV && (globalThis as { __gbNoGrain?: boolean }).__gbNoGrain)) return null; // __gbNoGrain: dev-only A/B switch (scripts/wg1-shots.js)
  let t = cache.get(f); if (t) return t;
  const data = new Uint8Array(W * H * 4), tones = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, v = (y + 0.5) / H;
    // rings wander along the board (cathedral figure): low-frequency warp of the across-grain coordinate
    const warp = noise(u, v, 3, 2, 1) * 0.9 + noise(u, v, 7, 5, 2) * 0.35;
    const p = (v * look.rings + warp) % 1, ring = smooth(0.5, 0.9, p) * (1 - smooth(0.9, 1, p)) + 0.25 * smooth(0, 0.08, p) * (1 - smooth(0.08, 0.3, p));
    // pores / fine streaks: long thin flecks along the grain
    const pore = noise(u, v, 48, 220, 3) * 0.6 + noise(u, v, 24, 110, 4) * 0.4, fleck = smooth(0.55, 0.85, pore);
    const tone = 1 - look.contrast * ring * (0.55 + 0.45 * noise(u, v, 5, 3, 5)) - look.pores * 0.3 * fleck - 0.08 * noise(u, v, 2, 3, 6);
    tones[y * W + x] = tone;
  }
  const top = tones.reduce((a, b) => Math.max(a, b), 0); // normalise so the lightest texel is 1
  for (let i = 0; i < tones.length; i++) {
    const k = tones[i] / top, o = i * 4;
    // dark lines go browner: red falls least, blue most
    data[o] = Math.round(255 * Math.pow(k, 1)); data[o + 1] = Math.round(255 * Math.pow(k, 1 + 0.12 * look.warm)); data[o + 2] = Math.round(255 * Math.pow(k, 1 + 0.35 * look.warm)); data[o + 3] = 255;
  }
  t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true;
  let m = 0; for (let i = 0; i < tones.length; i++) m += Math.pow(tones[i] / top, 2.2);
  t.userData.mean = Math.max(0.3, m / tones.length); // red channel's linear mean (green / blue only darken the lines further)
  cache.set(f, t); return t;
}

/** What a stand piece's grain looks like: its direction, and a per-piece offset (own grain, a visible seam to its neighbour). */
export interface Grain { finish: Finish; vertical?: boolean; seed: number }

/** Per-vertex UVs for a solid, projected along the dominant normal axis (mm over the texture's size): the grain runs along
 *  the horizontal for a carcass, up the panel for a vertical piece; a top face runs along x. Non-indexed or box geometry. */
export function applyGrainUV(geo: THREE.BufferGeometry, g: Grain) {
  const pos = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  const ou = hash(g.seed, 1, 7), ov = hash(g.seed, 2, 7);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let along: number, across: number;
    if (ay >= ax && ay >= az) { along = x; across = z; } else if (ax > az) { along = z; across = y; } else { along = x; across = y; }
    if (g.vertical && ay < ax + az) { const h = along; along = across; across = h; } // up the panel; the horizontal runs across it
    uv[i * 2] = along / GRAIN_U_MM + ou; uv[i * 2 + 1] = across / GRAIN_V_MM + ov;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
