// Leaf textures for the 3D plants (lane PT, R151). The painted atlas (public/art/plants/leaves.png) and its manifest
// (src/data/plantart/leaves.json) are written by scripts/plant-leaves.py from the ChatGPT leaf sheets. Pure data and
// maths, no DOM, so the plant worker can use it. A plant type without an entry keeps its vertex colours exactly.
import LEAVES from '../data/plantart/leaves.json';

/** A rectangle of the atlas in uv (v up): u0, v0 (bottom), u1, v1 (top). */
export type Rect = [number, number, number, number];
type RGB = [number, number, number];
/** One leaf of a sheet: its upper side and its underside (blade base at the bottom, tip at the top, midrib vertical), and
 *  the mean linear colour of each (the 'lum' mode divides it out of the vertex colour). */
export interface LeafCell { up: Rect; un: Rect; mu: RGB; mn: RGB }
/** A leaf with a cell per look: the blade runs from `v0` of the cell's height (below it the stalk) to the tip. */
export interface LeafTex { kind: 'leaf'; v0: number; cells: LeafCell[] }
/** A strap (vallisneria): per number of repeated middle tiles n (1..), one atlas column holding base, n middles, tip. */
export interface StrapTex {
  kind: 'strap'; baseMm: number; tipMm: number; midMm: number; mean: RGB;
  cols: { n: number; rect: Rect; fb: number; ft: number }[];
}
export type PlantTex = LeafTex | StrapTex;

const M = LEAVES as unknown as { test?: string[]; file?: string; white: [number, number]; types: Record<string, PlantTex | undefined> };
/** uv of a white texel: what every vertex without a leaf texture samples, so it keeps its vertex colour as it is. */
export const WHITE_UV: [number, number] = M.white;
/** The atlas image under public/art/plants/. */
export const ATLAS_FILE = M.file ?? 'leaves.png';
export const texOf = (name: string | undefined) => (name ? M.types[name] : undefined);

/** Which leaf look (cell) leaf number `i` takes: `pick` = its index in the species' colour list, or a hash when it has none. */
export const cellIndex = (pick: number, salt: number, n: number) => {
  if (pick >= 0) return pick % n;
  const x = Math.sin(salt * 12.9898 + 4.1414) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * n) % n;
};

export const rectUV = (r: Rect, x: number, y: number, out: number[]) => { out.push(r[0] + (r[2] - r[0]) * x, r[1] + (r[3] - r[1]) * y); };

/** Where along a strap of length L (mm) the atlas column is: the tile count it uses and v (0..1 over the column) per
 *  length. Base and tip keep their lengths (shrunk together on a short leaf), the middle is stretched to whole tiles. */
export function strapAlong(t: StrapTex, L: number) {
  const bt = t.baseMm + t.tipMm, sc = L < bt * 1.5 ? L / (bt * 1.5) : 1, B = t.baseMm * sc, T = t.tipMm * sc, Lm = Math.max(1, L - B - T);
  const nmax = t.cols[t.cols.length - 1].n, n = Math.max(1, Math.min(nmax, Math.round(Lm / t.midMm)));
  const col = t.cols.find(c => c.n === n) ?? t.cols[t.cols.length - 1];
  return { rect: col.rect, v: (len: number) => {
    if (len <= B) return col.fb * (len / B);
    if (len >= L - T) return 1 - col.ft + col.ft * ((len - (L - T)) / T);
    return col.fb + (1 - col.fb - col.ft) * ((len - B) / Lm);
  } };
}
