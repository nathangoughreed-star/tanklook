// Baked lookup tables for the hardscape grit shader (render/items.ts GRIT; lane SG, 2026-10-15). The grit used to hash
// every noise lattice corner and every crack cell in the shader: 8 hashes per noise lookup, 81 for the 27-cell crack
// search, all inlined by the D3D compiler (the slowest program to link on a first visit, and most of the reef's GPU time).
// Now both are a table lookup: a tiling 3D texture of random lattice values (one trilinear fetch per noise lookup, the
// smoothstep weights applied to the coordinate first, so it interpolates exactly like the hashed noise did) and a small
// one of crack-cell jitter (one texel per cell). Same kind of grain and cracks, laid out from other random numbers.
import * as THREE from 'three';

/** Lattice cells per side of the noise table (it repeats every NOISE_N lattice units) and of the crack-cell table. */
export const NOISE_N = 128, CELL_N = 32;

function table(n: number, channels: number, seed: number) {
  const a = new Uint8Array(n * n * n * channels);
  let s = seed >>> 0;
  for (let i = 0; i < a.length; i++) { // xorshift32: uniform bytes, the same every load
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    a[i] = s >>> 24;
  }
  return a;
}
function tex3d(data: Uint8Array<ArrayBuffer>, n: number, format: THREE.PixelFormat, filter: THREE.MagnificationTextureFilter) {
  const t = new THREE.Data3DTexture(data, n, n, n);
  t.format = format; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = filter; t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.generateMipmaps = false; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
let uniforms: { gNoiseT: { value: THREE.Data3DTexture }; gCellT: { value: THREE.Data3DTexture } } | null = null;
/** The two tables as shader uniforms, made on first use (2 MB + 128 kB; shared by every hardscape material). */
export function gritUniforms() {
  return uniforms ??= {
    gNoiseT: { value: tex3d(table(NOISE_N, 1, 0x9e3779b9), NOISE_N, THREE.RedFormat, THREE.LinearFilter) },
    gCellT: { value: tex3d(table(CELL_N, 4, 0x85ebca6b), CELL_N, THREE.RGBAFormat, THREE.NearestFilter) },
  };
}
