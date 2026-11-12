// Caustics (plan VF5; render/fx.ts `caustics`): the moving net of light the rippled water surface focuses onto whatever
// faces up under it. One 256 px tileable pattern, made once on first use: a cellular (Worley F2 - F1) net, its lookup
// bent by a periodic warp so the cell walls curve like real caustics instead of meeting in straight polygon edges.
// render/lighting.ts aqPatch samples it twice, at two scales drifting in different directions, and keeps min() of the
// two, so the net changes shape as it moves rather than sliding as one picture. `CAUS_MEAN` is the mean of that min(),
// so the shader can redistribute the light (brighter lines, darker cells) without changing the tank's brightness.
import * as THREE from 'three';

const N = 256, CELLS = 5;

function rand(i: number) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function makePattern() {
  // one jittered point per cell, the grid wrapping around so the tile repeats seamlessly
  const pt = (cx: number, cy: number) => {
    const x = ((cx % CELLS) + CELLS) % CELLS, y = ((cy % CELLS) + CELLS) % CELLS, k = x * 31 + y * 7 + 3;
    return [cx + 0.15 + 0.7 * rand(k), cy + 0.15 + 0.7 * rand(k + 101)];
  };
  const v = new Float32Array(N * N), TAU = Math.PI * 2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let u = i / N, w = j / N;
    // periodic warp (whole-number frequencies, so the tile still repeats)
    const du = 0.035 * Math.sin(TAU * (2 * w + 0.3)) + 0.02 * Math.sin(TAU * (3 * u + 5 * w)), dw = 0.035 * Math.sin(TAU * (2 * u + 0.7)) + 0.02 * Math.sin(TAU * (4 * u - 3 * w + 0.2));
    u += du; w += dw;
    const px = u * CELLS, py = w * CELLS, cx = Math.floor(px), cy = Math.floor(py);
    let f1 = 9, f2 = 9;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const [qx, qy] = pt(cx + a, cy + b), d = Math.hypot(qx - px, qy - py);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    const e = f2 - f1; // 0 on a cell wall
    v[j * N + i] = Math.exp(-e * e / 0.012); // bright walls, dark cells
  }
  let mx = 0; for (const x of v) mx = Math.max(mx, x);
  const data = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) data[k] = Math.round(255 * v[k] / mx);
  return data;
}

/** The share of the cells' darkening kept (lines brighten fully): full-depth dark cells read as dirt on pale sand. */
export const CAUS_DARK = 0.35;
/** The brightest a caustic line gets, x the mean (2026-11-12 review: was 3, the open sand's centre still drew the eye). */
export const CAUS_PEAK = 2.5;
/**
 * The distribution of min(X, Y), X and Y drawn independently from the pattern (the two samples' scales differ, so they
 * decorrelate): its mean m, and the mean of the shader's response h(c) = c / m - 1 above m, CAUS_DARK x that below,
 * which the shader subtracts so the light still averages out to what it was.
 */
function stats(data: Uint8Array) {
  const h = new Float64Array(256); for (const x of data) h[x]++;
  const n = data.length, pm = new Float64Array(256); // P(min = t) = P(X >= t)^2 - P(X >= t + 1)^2
  let above = n;
  for (let t = 0; t < 256; t++) { const a = above / n; above -= h[t]; pm[t] = a * a - (above / n) ** 2; }
  let m = 0; for (let t = 0; t < 256; t++) m += pm[t] * t / 255;
  let off = 0; for (let t = 0; t < 256; t++) { const r = t / 255 / m - 1; off += pm[t] * Math.min(r > 0 ? r : CAUS_DARK * r, CAUS_PEAK); }
  return { m, off };
}

let tex: THREE.DataTexture | null = null;
export let CAUS_MEAN = 0.2, CAUS_OFF = 0;

/** The pattern (made on the first call). Red channel, repeating, mipmapped: the shader's mip bias softens it under bars. */
export function causticTexture() {
  if (tex) return tex;
  const data = makePattern();
  ({ m: CAUS_MEAN, off: CAUS_OFF } = stats(data));
  tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
  return tex;
}
