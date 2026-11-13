// GS1: aquarium glass thickness solver and eurobrace optimizer. Pure module: no DOM, no three.js.
// Method, sources and validation: research/design/gs1-glass-solver.md.
//
// Each pane is a Kirchhoff (small-deflection) rectangular plate. The two vertical edges are simply supported
// (the silicone joint to the neighbouring panes), the bottom edge is simply supported, and the top edge is
//   - FREE (no brace),
//   - carried by an elastic edge beam (a perimeter / euro brace strip glued along the top, spanning corner to corner),
//   - optionally tied at points along its length (cross braces from front to back),
//   - or simply supported (a rigid lid / frame; used for the reference cases).
// The plate is solved exactly with the Levy series w = sum Y_m(y) sin(m pi x / a), which is exact for plates with two
// opposite simply supported edges and any condition on the other two. The hydrostatic load (zero at the water line,
// gamma*h at the floor) is piecewise linear in y, so each term is a closed-form ODE solution. Cross-brace ties are
// added by superposition (zero top-edge deflection at each tie). Units: mm, N, MPa (N/mm^2).

export const IN_MM = 25.4;

/** Annealed soda-lime float glass (low-iron the same). E and nu: ASTM E1300-16 sec. 3.2 (10.4e6 psi, 0.22). */
export const GLASS_E = 71_700;
export const GLASS_NU = 0.22;
/** Modulus of rupture used for design: 19.3 MPa (2800 psi), the value in Hiscocks, "Design of Aquarium Glass", the basis of the common hobby calculators. */
export const GLASS_MOR = 19.3;
/** Glass density, kg/m^3 (ASTM E1300 / typical soda-lime 2500). */
export const GLASS_DENSITY = 2500;
/** The usual hobby safety factor on the modulus of rupture (Hiscocks). */
export const DEFAULT_SF = 3.8;
/** Unit weight of water, N/mm^3: fresh 1000 kg/m^3, salt 1025 kg/m^3, g = 9.81 m/s^2. */
export const GAMMA_FRESH = 9.81e-6, GAMMA_SALT = 1.025 * 9.81e-6;

/** Stock glass thicknesses (mm). */
export const STOCK_METRIC = [4, 5, 6, 8, 10, 12, 15, 19, 25];
export const STOCK_US = [1 / 4, 5 / 16, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 1].map(t => t * IN_MM);
const US_LABEL = ['1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"', '1"'];

/** Display label of a stock thickness. */
export function thicknessLabel(mm: number): string {
  const i = STOCK_US.findIndex(t => Math.abs(t - mm) < 0.01);
  if (i >= 0) return US_LABEL[i];
  return `${+mm.toFixed(2)} mm`;
}

// ---------------------------------------------------------------- Levy plate solver

/** Top-edge condition. 'edge': free edge carried by an edge beam of bending stiffness EI (N mm^2; 0 = free) and tied at `ties`. */
export type TopEdge = { kind: 'ss' } | { kind: 'edge'; EI: number; ties?: TieSpec[] };
/** A cross-brace tie on the top edge: centre x (mm) and contact width (mm). The tie holds the top edge at zero deflection there. */
export interface TieSpec { x: number; width: number }
/** Load on the plate. hydro: gamma*(h - y) for y < h. uniform: q everywhere. */
export type PlateLoad = { kind: 'hydro'; gamma: number; h: number } | { kind: 'uniform'; q: number };

export interface PlateInput {
  a: number; // span between the simply supported vertical edges (mm)
  b: number; // height, bottom (y = 0, simply supported) to top (mm)
  t: number; // thickness (mm)
  load: PlateLoad;
  top: TopEdge;
  E?: number; nu?: number;
  terms?: number; // Levy terms m = 1..terms
  grid?: [number, number]; // evaluation grid nx, ny
}

export interface PlateResult {
  /** Largest principal bending stress anywhere on the plate (MPa). */
  sigma: number;
  /** Largest deflection (mm). */
  w: number;
  /** Where the largest stress is (mm). */
  at: { x: number; y: number };
  /** Largest bending moment in the top edge beam (N mm), 0 without one. */
  beamMoment: number;
  /** Tie forces (N, positive = pulls the edge inward). */
  ties: number[];
}

interface Seg { y0: number; len: number; c0: number; c1: number } // q = c0 + c1 * u, u = y - y0

function segments(b: number, load: PlateLoad): Seg[] {
  if (load.kind === 'uniform') return [{ y0: 0, len: b, c0: load.q, c1: 0 }];
  const h = Math.min(Math.max(load.h, 0), b), g = load.gamma;
  const s: Seg[] = [];
  if (h > 0) s.push({ y0: 0, len: h, c0: g * h, c1: -g });
  if (b - h > 1e-9) s.push({ y0: h, len: b - h, c0: 0, c1: 0 });
  return s;
}

/** Basis f1 = e^{al(u-L)}, f2 = u e^{al(u-L)}, f3 = e^{-al u}, f4 = u e^{-al u} and derivatives 0..3 (all bounded on [0, L]). */
function basis(al: number, u: number, L: number, out: Float64Array) {
  const E = Math.exp(al * (u - L)), F = Math.exp(-al * u), a2 = al * al, a3 = a2 * al;
  // out[k*4 + j] = k-th derivative of f_j
  out[0] = E; out[1] = u * E; out[2] = F; out[3] = u * F;
  out[4] = al * E; out[5] = (1 + al * u) * E; out[6] = -al * F; out[7] = (1 - al * u) * F;
  out[8] = a2 * E; out[9] = (2 * al + a2 * u) * E; out[10] = a2 * F; out[11] = (-2 * al + a2 * u) * F;
  out[12] = a3 * E; out[13] = (3 * a2 + a3 * u) * E; out[14] = -a3 * F; out[15] = (3 * a2 - a3 * u) * F;
}

function solveLinear(A: Float64Array, rhs: Float64Array, n: number): Float64Array {
  for (let c = 0; c < n; c++) {
    let p = c, best = Math.abs(A[c * n + c]);
    for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > best) { best = v; p = r; } }
    if (p !== c) {
      for (let k = 0; k < n; k++) { const tmp = A[c * n + k]; A[c * n + k] = A[p * n + k]; A[p * n + k] = tmp; }
      const tmp = rhs[c]; rhs[c] = rhs[p]; rhs[p] = tmp;
    }
    const d = A[c * n + c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r * n + c] / d;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k];
      rhs[r] -= f * rhs[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = rhs[r];
    for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k];
    x[r] = s / A[r * n + r];
  }
  return x;
}

/** One Levy term: coefficients of the homogeneous part per segment, for distributed-load factor km and edge line-load factor fm. */
function levyTerm(al: number, Dp: number, nu: number, segs: Seg[], top: TopEdge, km: number, fm: number): Float64Array {
  const n = segs.length, N = 4 * n, A = new Float64Array(N * N), r = new Float64Array(N), B = new Float64Array(16);
  const a4 = al ** 4;
  // particular part (derivatives 0..3) of segment s at local u
  const part = (s: number, u: number) => {
    const g = segs[s], k = km / (Dp * a4);
    return [k * (g.c0 + g.c1 * u), k * g.c1, 0, 0];
  };
  let row = 0;
  const put = (s: number, k: number, coef: number) => { for (let j = 0; j < 4; j++) A[row * N + 4 * s + j] += coef * B[4 * k + j]; };
  // bottom: Y = 0, Y'' = 0
  basis(al, 0, segs[0].len, B);
  let P = part(0, 0);
  put(0, 0, 1); r[row++] = -P[0];
  put(0, 2, 1); r[row++] = -P[2];
  // interfaces: Y, Y', Y'', Y''' continuous
  for (let s = 0; s < n - 1; s++) {
    const Pa = part(s, segs[s].len), Pb = part(s + 1, 0);
    for (let k = 0; k < 4; k++) {
      basis(al, segs[s].len, segs[s].len, B); put(s, k, 1);
      basis(al, 0, segs[s + 1].len, B); put(s + 1, k, -1);
      r[row++] = -(Pa[k] - Pb[k]);
    }
  }
  // top
  const s = n - 1, L = segs[s].len;
  basis(al, L, L, B); P = part(s, L);
  if (top.kind === 'ss') {
    put(s, 0, 1); r[row++] = -P[0];
    put(s, 2, 1); r[row++] = -P[2];
  } else {
    // M_y = 0: Y'' - nu al^2 Y = 0
    put(s, 2, 1); put(s, 0, -nu * al * al); r[row++] = -(P[2] - nu * al * al * P[0]);
    // Kirchhoff shear with edge beam and edge line load f (+w): Y''' - (2-nu) al^2 Y' - (EI/D) al^4 Y = -f/D
    const kb = top.EI / Dp;
    put(s, 3, 1); put(s, 1, -(2 - nu) * al * al); put(s, 0, -kb * a4);
    r[row++] = -fm / Dp - (P[3] - (2 - nu) * al * al * P[1] - kb * a4 * P[0]);
  }
  return solveLinear(A, r, N);
}

interface LevySol { a: number; b: number; Dp: number; nu: number; segs: Seg[]; terms: number; coef: Float64Array[]; km: number[] }

function levySolve(a: number, b: number, Dp: number, nu: number, segs: Seg[], top: TopEdge, terms: number, distributed: boolean, patches: { x: number; width: number; F: number }[]): LevySol {
  const coef: Float64Array[] = [], km: number[] = [];
  for (let m = 1; m <= terms; m++) {
    const al = m * Math.PI / a;
    const k = distributed && m % 2 === 1 ? 4 / (m * Math.PI) : 0;
    let f = 0;
    for (const p of patches) f += 4 * p.F / (a * p.width * al) * Math.sin(al * p.x) * Math.sin(al * p.width / 2);
    km.push(k);
    coef.push(k === 0 && f === 0 ? new Float64Array(4 * segs.length) : levyTerm(al, Dp, nu, segs, top, k, f));
  }
  return { a, b, Dp, nu, segs, terms, coef, km };
}

/** Y_m and its derivatives 0..2 at height y. */
function evalY(S: LevySol, m: number, y: number, B: Float64Array, out: number[]) {
  let s = 0;
  while (s < S.segs.length - 1 && y > S.segs[s].y0 + S.segs[s].len) s++;
  const g = S.segs[s], u = Math.min(Math.max(y - g.y0, 0), g.len), al = m * Math.PI / S.a;
  basis(al, u, g.len, B);
  const c = S.coef[m - 1], k = S.km[m - 1] / (S.Dp * al ** 4);
  for (let d = 0; d < 3; d++) {
    let v = 0;
    for (let j = 0; j < 4; j++) v += c[4 * s + j] * B[4 * d + j];
    out[d] = v;
  }
  out[0] += k * (g.c0 + g.c1 * u); out[1] += k * g.c1;
}

function combine(base: LevySol, parts: LevySol[], R: number[]): LevySol {
  const coef = base.coef.map((c, i) => { const o = Float64Array.from(c); parts.forEach((p, j) => { for (let k = 0; k < o.length; k++) o[k] += R[j] * p.coef[i][k]; }); return o; });
  return { ...base, coef };
}

function topDeflection(S: LevySol, x: number): number {
  const B = new Float64Array(16), o = [0, 0, 0];
  let w = 0;
  for (let m = 1; m <= S.terms; m++) { evalY(S, m, S.b, B, o); w += o[0] * Math.sin(m * Math.PI * x / S.a); }
  return w;
}

/** Plate bending rigidity D = E t^3 / 12(1 - nu^2). */
export const rigidity = (t: number, E = GLASS_E, nu = GLASS_NU) => E * t ** 3 / (12 * (1 - nu * nu));

/** Solve one pane: largest principal stress and deflection. */
export function plate(p: PlateInput): PlateResult {
  const E = p.E ?? GLASS_E, nu = p.nu ?? GLASS_NU, terms = p.terms ?? 81, [nx, ny] = p.grid ?? [41, 29];
  const Dp = rigidity(p.t, E, nu), segs = segments(p.b, p.load);
  const ties = p.top.kind === 'edge' ? p.top.ties ?? [] : [];
  let S = levySolve(p.a, p.b, Dp, nu, segs, p.top, terms, true, []);
  let R: number[] = [];
  if (ties.length) {
    // unit tie loads (+w direction), then forces that bring the top edge to zero deflection at each tie
    const unit = ties.map(tie => levySolve(p.a, p.b, Dp, nu, segs, p.top, terms, false, [{ x: tie.x, width: tie.width, F: 1 }]));
    const n = ties.length, W = new Float64Array(n * n), rhs = new Float64Array(n);
    ties.forEach((ti, i) => { rhs[i] = -topDeflection(S, ti.x); unit.forEach((u, j) => { W[i * n + j] = topDeflection(u, ti.x); }); });
    R = Array.from(solveLinear(W, rhs, n));
    S = combine(S, unit, R);
  }
  // evaluate moments on a grid (plus the top edge and the water line)
  const B = new Float64Array(16), o = [0, 0, 0];
  const ys: number[] = [];
  for (let j = 0; j < ny; j++) ys.push(p.b * j / (ny - 1));
  if (p.load.kind === 'hydro' && p.load.h > 0 && p.load.h < p.b) ys.push(p.load.h);
  const xs: number[] = [];
  for (let i = 0; i < nx; i++) xs.push(p.a * i / (nx - 1));
  for (const ti of ties) xs.push(ti.x);
  let sigma = 0, wMax = 0, at = { x: 0, y: 0 }, beam = 0;
  const EI = p.top.kind === 'edge' ? p.top.EI : 0;
  const Y = ys.map(y => { const rows: number[][] = []; for (let m = 1; m <= terms; m++) { evalY(S, m, y, B, o); rows.push([o[0], o[1], o[2]]); } return rows; });
  for (const x of xs) {
    const sn: number[] = [], cs: number[] = [];
    for (let m = 1; m <= terms; m++) { const al = m * Math.PI / p.a; sn.push(Math.sin(al * x)); cs.push(Math.cos(al * x)); }
    ys.forEach((y, j) => {
      let w = 0, wxx = 0, wyy = 0, wxy = 0;
      for (let m = 1; m <= terms; m++) {
        const al = m * Math.PI / p.a, [y0, y1, y2] = Y[j][m - 1];
        w += y0 * sn[m - 1]; wxx -= al * al * y0 * sn[m - 1]; wyy += y2 * sn[m - 1]; wxy += al * y1 * cs[m - 1];
      }
      const Mx = -Dp * (wxx + nu * wyy), My = -Dp * (wyy + nu * wxx), Mxy = -Dp * (1 - nu) * wxy;
      const Mp = Math.abs((Mx + My) / 2) + Math.hypot((Mx - My) / 2, Mxy);
      const s = 6 * Mp / (p.t * p.t);
      if (s > sigma) { sigma = s; at = { x, y }; }
      wMax = Math.max(wMax, Math.abs(w));
      if (EI && j === ny - 1) beam = Math.max(beam, Math.abs(EI * wxx));
    });
  }
  return { sigma, w: wMax, at, beamMoment: beam, ties: R.map(f => -f) };
}

// ---------------------------------------------------------------- tank solve

export type PaneId = 'front' | 'back' | 'left' | 'right' | 'bottom';
export const PANES: PaneId[] = ['front', 'back', 'left', 'right', 'bottom'];

/** Tank to solve: INTERIOR dimensions (mm), as in scene Tank. waterDepth defaults to H - 25 mm (the scene's full waterline). */
export interface GlassTankSpec { L: number; D: number; H: number; waterDepth?: number }

/** Eurobrace: a strip of glass of `width` x `thickness` glued flat along the inside top of all four walls, plus `cross` front-to-back strips evenly spaced. */
export interface BraceSpec { width: number; thickness: number; cross?: number; crossWidth?: number }

/**
 * How large a deflection is acceptable: the largest deflection may not exceed `thicknessRatio` x the glass thickness.
 * Default 1.0: the end of the small-deflection range in which the plate theory used here is valid (Timoshenko & Woinowsky-Krieger,
 * Theory of Plates and Shells, ch. 1 and 13: beyond about one thickness membrane action makes linear results inaccurate).
 */
export interface DeflectionLimit { thicknessRatio: number }

export interface GlassOpts {
  safetyFactor?: number;
  /** Modulus of rupture (MPa); default 19.3 (2800 psi). */
  mor?: number;
  E?: number; nu?: number;
  /** Water unit weight (N/mm^3), default fresh. */
  gamma?: number;
  units?: 'us' | 'metric';
  /** Override the stock list (mm). */
  stock?: number[];
  /** 'uniform': one thickness for every pane; 'perPane': each pane its own (front and back are always equal). */
  mode?: 'uniform' | 'perPane';
  deflection?: DeflectionLimit;
  /** 'full': bottom rests on a flat stand / mat; 'perimeter': only its edges are carried (framed tank on a trim). */
  bottomSupport?: 'full' | 'perimeter';
  brace?: BraceSpec | null;
  /** Levy terms and grid (accuracy vs speed). */
  terms?: number; grid?: [number, number];
  /** Also find the smallest continuous thickness per pane (default true; the optimizer turns it off for speed). */
  continuous?: boolean;
}

export interface PaneResult {
  pane: PaneId;
  span: number; height: number;
  /** Smallest continuous thickness meeting stress and deflection (mm); NaN when `continuous` is off. */
  required: number;
  /** What governs the continuous thickness. */
  governs: 'stress' | 'deflection' | 'rule';
  /** Chosen stock thickness (mm), null if thicker than the stock list allows. */
  thickness: number | null;
  label: string;
  /** At the chosen thickness: */
  sigma: number; deflection: number; sf: number;
}

export interface BraceResult { width: number; thickness: number; cross: number; sigma: number; sf: number; tieForce: number; ok: boolean }

export interface GlassSolution {
  panes: Record<PaneId, PaneResult>;
  mode: 'uniform' | 'perPane';
  brace: BraceResult | null;
  /** Glass weight (lb) and volume index (sum of area x thickness, in^3). */
  weightLb: number; volumeIn3: number;
  ok: boolean;
  notes: string[];
}

interface Resolved { sf: number; mor: number; E: number; nu: number; gamma: number; stock: number[]; mode: 'uniform' | 'perPane'; defl: number; bottom: 'full' | 'perimeter'; brace: BraceSpec | null; terms: number; grid: [number, number] }

function resolve(o: GlassOpts): Resolved {
  return {
    sf: o.safetyFactor ?? DEFAULT_SF, mor: o.mor ?? GLASS_MOR, E: o.E ?? GLASS_E, nu: o.nu ?? GLASS_NU, gamma: o.gamma ?? GAMMA_FRESH,
    stock: [...(o.stock ?? (o.units === 'metric' ? STOCK_METRIC : STOCK_US))].sort((x, y) => x - y),
    mode: o.mode ?? 'uniform', defl: o.deflection?.thicknessRatio ?? 1, bottom: o.bottomSupport ?? 'full', brace: o.brace ?? null,
    terms: o.terms ?? 61, grid: o.grid ?? [33, 25],
  };
}

const waterDepth = (s: GlassTankSpec) => Math.min(s.waterDepth ?? s.H - 25, s.H);

/** Ties of n cross braces evenly spaced along a front / back pane of span a. */
function crossTies(a: number, br: BraceSpec | null): TieSpec[] {
  const n = br?.cross ?? 0, w = br?.crossWidth ?? br?.width ?? 0;
  return Array.from({ length: n }, (_, i) => ({ x: a * (i + 1) / (n + 1), width: w }));
}

/** Check one wall at thickness t. */
function wallAt(kind: 'long' | 'end', spec: GlassTankSpec, t: number, r: Resolved) {
  const a = kind === 'long' ? spec.L : spec.D;
  const br = r.brace;
  const top: TopEdge = br ? { kind: 'edge', EI: r.E * br.thickness * br.width ** 3 / 12, ties: kind === 'long' ? crossTies(a, br) : [] } : { kind: 'edge', EI: 0 };
  return plate({ a, b: spec.H, t, load: { kind: 'hydro', gamma: r.gamma, h: waterDepth(spec) }, top, E: r.E, nu: r.nu, terms: r.terms, grid: r.grid });
}

function bottomAt(spec: GlassTankSpec, t: number, r: Resolved) {
  return plate({ a: spec.L, b: spec.D, t, load: { kind: 'uniform', q: r.gamma * waterDepth(spec) }, top: { kind: 'ss' }, E: r.E, nu: r.nu, terms: r.terms, grid: r.grid });
}

const passes = (res: PlateResult, t: number, r: Resolved) => res.sigma * r.sf <= r.mor && res.w <= r.defl * t;

/** Smallest continuous thickness that passes (bisection; stress and deflection both fall with thickness). */
function minThickness(check: (t: number) => PlateResult, r: Resolved): { t: number; governs: 'stress' | 'deflection' } {
  let lo = 0.5, hi = 120;
  for (let i = 0; i < 40 && hi - lo > 0.01; i++) {
    const mid = (lo + hi) / 2;
    if (passes(check(mid), mid, r)) hi = mid; else lo = mid;
  }
  const res = check(hi);
  // which criterion is binding at the boundary
  const sStress = res.sigma * r.sf / r.mor, sDefl = res.w / (r.defl * hi);
  return { t: hi, governs: sStress >= sDefl ? 'stress' : 'deflection' };
}

function paneResult(pane: PaneId, span: number, height: number, required: number, governs: PaneResult['governs'], t: number | null, res: PlateResult | null, r: Resolved): PaneResult {
  return {
    pane, span, height, required, governs, thickness: t, label: t == null ? 'over stock' : thicknessLabel(t),
    sigma: res?.sigma ?? 0, deflection: res?.w ?? 0, sf: res && res.sigma > 0 ? r.mor / res.sigma : Infinity,
  };
}

/**
 * Minimum glass per pane for a rectangular tank. The custom tank maker calls this.
 * Bottom rule ('full' support, the default): the bottom carries almost no bending when it rests on a flat stand,
 * so it is matched to the thickest wall (the common builder rule: it also has to survive point loads from rock and an
 * imperfect stand, which the uniform-load model does not see). 'perimeter': solved as a plate simply supported on four edges.
 */
export function solveGlass(spec: GlassTankSpec, opts: GlassOpts = {}): GlassSolution {
  const r = resolve(opts);
  const notes: string[] = [];
  const stockPick = (check: (t: number) => PlateResult, floor = 0) => {
    for (const t of r.stock) { if (t + 1e-9 < floor) continue; const res = check(t); if (passes(res, t, r)) return { t, res }; }
    return { t: null as number | null, res: null as PlateResult | null };
  };
  const longCheck = (t: number) => wallAt('long', spec, t, r), endCheck = (t: number) => wallAt('end', spec, t, r);
  const cont = opts.continuous ?? true, skip = { t: NaN, governs: 'stress' as const };
  const longReq = cont ? minThickness(longCheck, r) : skip, endReq = cont ? minThickness(endCheck, r) : skip;
  let long = stockPick(longCheck), end = stockPick(endCheck);
  const wallMax = Math.max(long.t ?? Infinity, end.t ?? Infinity);
  let bottom: PaneResult;
  if (r.bottom === 'full') {
    const bt = Number.isFinite(wallMax) ? wallMax : null;
    bottom = paneResult('bottom', spec.L, spec.D, Math.max(longReq.t, endReq.t), 'rule', bt, bt ? bottomAt(spec, bt, r) : null, r);
    notes.push('Bottom rests on a flat stand: matched to the thickest wall (rule), not solved as a plate.');
  } else {
    const bc = (t: number) => bottomAt(spec, t, r), req = cont ? minThickness(bc, r) : skip, pick = stockPick(bc);
    bottom = paneResult('bottom', spec.L, spec.D, req.t, req.governs, pick.t, pick.res, r);
  }
  if (r.mode === 'uniform') {
    const all = [long.t, end.t, bottom.thickness];
    const t = all.some(v => v == null) ? null : Math.max(...(all as number[]));
    if (t != null) {
      long = { t, res: longCheck(t) }; end = { t, res: endCheck(t) };
      if (bottom.thickness !== t) bottom = { ...bottom, thickness: t, label: thicknessLabel(t), ...(() => { const b = bottomAt(spec, t, r); return { sigma: b.sigma, deflection: b.w, sf: r.mor / b.sigma }; })() };
    }
  }
  const front = paneResult('front', spec.L, spec.H, longReq.t, longReq.governs, long.t, long.res, r);
  const left = paneResult('left', spec.D, spec.H, endReq.t, endReq.governs, end.t, end.res, r);
  const panes: Record<PaneId, PaneResult> = { front, back: { ...front, pane: 'back' }, left, right: { ...left, pane: 'right' }, bottom };

  let brace: BraceResult | null = null;
  if (r.brace) {
    const br = r.brace, tl = long.t ?? r.stock[r.stock.length - 1], te = end.t ?? r.stock[r.stock.length - 1];
    const L = wallAt('long', spec, tl, r), En = wallAt('end', spec, te, r);
    const M = Math.max(L.beamMoment, En.beamMoment), sigma = 6 * M / (br.thickness * br.width ** 2);
    const tie = Math.max(0, ...L.ties);
    brace = { width: br.width, thickness: br.thickness, cross: br.cross ?? 0, sigma, sf: sigma > 0 ? r.mor / sigma : Infinity, tieForce: tie, ok: sigma * r.sf <= r.mor };
    if (!brace.ok) notes.push(`Brace strip is over-stressed (SF ${brace.sf.toFixed(1)}): make it wider or thicker.`);
    if (tie > 0) notes.push(`Each cross brace carries ${(tie / 4.448).toFixed(0)} lbf of tension through its silicone joints.`);
  }
  const { weightLb, volumeIn3 } = glassWeight(spec, panes, r.brace);
  const ok = PANES.every(p => panes[p].thickness != null) && (brace?.ok ?? true);
  return { panes, mode: r.mode, brace, weightLb, volumeIn3, ok, notes };
}

/** Glass weight (lb) and volume (in^3) of the five panes plus brace strips. */
export function glassWeight(spec: GlassTankSpec, panes: Record<PaneId, PaneResult>, brace: BraceSpec | null) {
  const t = (p: PaneId) => panes[p].thickness ?? 0;
  let mm3 = 2 * spec.L * spec.H * t('front') + 2 * spec.D * spec.H * t('left') + spec.L * spec.D * t('bottom');
  if (brace) {
    const w = brace.width, n = brace.cross ?? 0, cw = brace.crossWidth ?? w;
    mm3 += (2 * (spec.L + spec.D) * w - 4 * w * w) * brace.thickness + n * Math.max(0, spec.D - 2 * w) * cw * brace.thickness;
  }
  return { volumeIn3: mm3 / IN_MM ** 3, weightLb: mm3 * 1e-9 * GLASS_DENSITY * 2.20462 };
}

// ---------------------------------------------------------------- eurobrace optimizer

export interface BraceOption {
  label: string;
  brace: BraceSpec | null;
  solution: GlassSolution;
  /** Glass volume relative to the unbraced tank (= 100): float glass is priced by area and roughly in proportion to thickness. */
  costIndex: number;
  /** Clear opening left between brace strips, front-to-back and along the length (mm). */
  opening: { depth: number; length: number };
}

export interface OptimizeOpts extends GlassOpts {
  /** Brace widths to try (mm); default 2, 2.5, 3, 3.5, 4 in. */
  widths?: number[];
  /** Largest number of cross braces to try (default 2). */
  maxCross?: number;
  /** Smallest clear opening each way (mm), default 6 in, for hands and gear. */
  minOpening?: number;
}

/**
 * Find the brace geometry that minimises total glass (cost index) at the given safety factor.
 * Returns three rows: no brace, best perimeter brace, best perimeter + cross brace(s); `best` is the cheapest valid one.
 */
export function optimizeBrace(spec: GlassTankSpec, opts: OptimizeOpts = {}): { options: BraceOption[]; best: BraceOption; tried: number } {
  const widths = opts.widths ?? [2, 2.5, 3, 3.5, 4].map(v => v * IN_MM);
  const maxCross = opts.maxCross ?? 2, minOpen = opts.minOpening ?? 6 * IN_MM;
  const stock = [...(opts.stock ?? (opts.units === 'metric' ? STOCK_METRIC : STOCK_US))].sort((x, y) => x - y);
  const none = solveGlass(spec, { ...opts, brace: null });
  const base = none.volumeIn3 || 1;
  const row = (label: string, brace: BraceSpec | null, s: GlassSolution): BraceOption => ({
    label, brace, solution: s, costIndex: 100 * s.volumeIn3 / base,
    opening: brace ? { depth: spec.D - 2 * brace.width, length: (spec.L - 2 * brace.width - (brace.cross ?? 0) * (brace.crossWidth ?? brace.width)) / ((brace.cross ?? 0) + 1) } : { depth: spec.D, length: spec.L },
  });
  const noneRow = row('No brace', null, none);
  let bestPerim: BraceOption | null = null, bestCross: BraceOption | null = null, tried = 0;
  const wallCap = Math.max(...PANES.map(p => none.panes[p].thickness ?? stock[stock.length - 1]));
  const better = (a: BraceOption, b: BraceOption | null) => !b || a.costIndex < b.costIndex - 1e-9 || (Math.abs(a.costIndex - b.costIndex) < 1e-9 && a.opening.depth > b.opening.depth);
  for (let cross = 0; cross <= maxCross; cross++) {
    for (const w of widths) {
      if (spec.D - 2 * w < minOpen) continue;
      if (cross && (spec.L - 2 * w - cross * w) / (cross + 1) < minOpen) continue;
      for (const tb of stock) {
        if (tb > wallCap + 1e-9) break;
        const brace: BraceSpec = { width: w, thickness: tb, cross };
        tried++;
        const s = solveGlass(spec, { ...opts, brace, continuous: false });
        if (!s.ok) continue;
        const o = row(cross ? `Perimeter ${fmtIn(w)} + ${cross} cross` : `Perimeter ${fmtIn(w)}`, brace, s);
        if (cross) { if (better(o, bestCross)) bestCross = o; } else if (better(o, bestPerim)) bestPerim = o;
        // a thicker strip is stiffer and may let the walls drop a step, so keep trying until the walls stop changing
        if (s.panes.front.thickness === stock[0] && s.panes.left.thickness === stock[0]) break;
      }
    }
  }
  const options = [noneRow, ...(bestPerim ? [bestPerim] : []), ...(bestCross ? [bestCross] : [])];
  const valid = options.filter(o => o.solution.ok);
  const best = (valid.length ? valid : options).reduce((a, b) => (better(b, a) ? b : a));
  return { options, best, tried };
}

const fmtIn = (mm: number) => `${+(mm / IN_MM).toFixed(2)} in`;

// ---------------------------------------------------------------- reference: the hobby-calculator formula

/**
 * The closed-form used by the common hobby calculators (Hiscocks, "Design of Aquarium Glass"): a wall is a plate with three
 * edges simply supported and the top free, under hydrostatic load from a full tank: t = sqrt(beta * gamma * H^3 * SF / MOR),
 * beta from a table by L/H (Roark). Exposed so the validation table can reproduce those calculators.
 */
export const HISCOCKS_TABLE: { ratio: number[]; beta: number[]; alpha: number[] } = {
  ratio: [0.5, 0.666, 1.0, 1.5, 2.0, 2.5, 3.0],
  beta: [0.085, 0.1156, 0.16, 0.26, 0.32, 0.35, 0.37],
  alpha: [0.003, 0.0085, 0.022, 0.042, 0.056, 0.063, 0.067],
};

export function hiscocksThickness(L: number, H: number, opts: { sf?: number; mor?: number; gamma?: number } = {}): { t: number; beta: number } {
  const { ratio, beta } = HISCOCKS_TABLE, x = Math.min(Math.max(L / H, ratio[0]), ratio[ratio.length - 1]);
  let i = 0;
  while (i < ratio.length - 2 && x > ratio[i + 1]) i++;
  const f = (x - ratio[i]) / (ratio[i + 1] - ratio[i]), b = beta[i] + f * (beta[i + 1] - beta[i]);
  const t = Math.sqrt(b * (opts.gamma ?? GAMMA_FRESH) * H ** 3 * (opts.sf ?? DEFAULT_SF) / (opts.mor ?? GLASS_MOR));
  return { t, beta: b };
}

/** Round a continuous thickness up to the stock list (null if above it). */
export function roundUpStock(t: number, stock: number[] = STOCK_US): number | null {
  for (const s of [...stock].sort((a, b) => a - b)) if (s + 1e-9 >= t) return s;
  return null;
}

// ---------------------------------------------------------------- hook-up for the custom tank maker (lane P9 owns the spec)

/**
 * What a custom tank spec can carry once the maker uses the solver: per-pane thickness (mm) and the brace.
 * P9's spec adopts this shape (or a field of this type); nothing here reads or writes customTanks.ts.
 */
export interface GlassBuild { panes: Record<PaneId, number>; brace: BraceSpec | null; safetyFactor: number }

/** The solver's answer as a GlassBuild (null when a pane is thicker than the stock list allows). */
export function toGlassBuild(sol: GlassSolution, brace: BraceSpec | null, safetyFactor = DEFAULT_SF): GlassBuild | null {
  if (!sol.ok) return null;
  const panes = Object.fromEntries(PANES.map(p => [p, sol.panes[p].thickness as number])) as Record<PaneId, number>;
  return { panes, brace, safetyFactor };
}
