// Water flow from the filter outlets (Nathan 2026-11-26: "plants and fish react to areas of the tank with higher flow ...
// no fluid dynamics, just a direction and proximity from the flow source"). Each outlet is one or more JETS: a point, a
// direction, an exit speed and a source radius. The speed at a point is a free round jet's: full at the nozzle, falling as
// 1 / distance once the jet has widened (it spreads about 1 in 5), Gaussian across it, nothing behind the nozzle, and
// fading out over a tank's length. Jets add. No walls, no return flow, no recirculation: a picture of where the current is
// strong and which way it runs, not a simulation. The plant shader (plant3d FLOW_GLSL) evaluates the same formula on the GPU.
// Pure: no three.js, no DOM; node tests use it.

/** One outlet stream, in tank coordinates (mm: x along the length, y up from the tank floor, z = -depth). */
export interface FlowJet {
  /** nozzle centre */
  x: number; y: number; z: number;
  /** unit direction the water leaves in */
  dx: number; dy: number; dz: number;
  /** exit speed, mm/s */
  u0: number;
  /** source radius, mm (a lily's flare, a nozzle's bore, a spray-bar's hole row band) */
  r0: number;
}

/** How a filter's return enters the tank. A HOB always spills over its lip ('sheet'); a canister's is the owner's pick. */
export type OutletKind = 'lily' | 'spraybar' | 'nozzle' | 'sheet' | 'powerhead';
export const RETURN_OUTLETS: { id: Exclude<OutletKind, 'sheet' | 'powerhead'>; label: string; hint: string }[] = [
  { id: 'lily', label: 'Lily pipe', hint: 'A flared glass outlet: a broad, medium current across the tank' },
  { id: 'spraybar', label: 'Spray bar', hint: 'A bar of small holes along the back: a wide, gentle current, the calmest spread' },
  { id: 'nozzle', label: 'Nozzle', hint: 'The plain outlet the canister ships with: a narrow, fast jet, strong near it' },
];

/** The jet spreads this much per mm it travels (half-width), about 24 degrees: wider than a free jet's 12, as a tank's walls, plants and mixing fan it out. */
export const JET_SPREAD = 0.45;
/** A jet's reach: past this many mm along it the current has faded away (into the tank's general circulation). */
export const JET_REACH = 900;
/** Most jets the shader takes (extra jets are dropped, the weakest first). */
export const MAX_JETS = 12;

/** gal/h -> mm^3/s */
export const GPH_MM3S = 3785411.8 / 3600;

/** The jets of one outlet. `at` = the nozzle (or the bar's middle), `dir` = into the water, `along` = the bar's axis (spray
 *  bar, HOB lip: a horizontal unit vector), `len` = the bar's or lip's length, mm; gph = the flow it delivers. */
export function outletJets(kind: OutletKind, gph: number, at: [number, number, number], dir: [number, number, number], along: [number, number, number] = [1, 0, 0], len = 0): FlowJet[] {
  const Q = Math.max(0, gph) * GPH_MM3S; if (Q <= 0) return [];
  const n = norm(dir), one = (p: [number, number, number], q: number, r0: number): FlowJet => ({ x: p[0], y: p[1], z: p[2], dx: n[0], dy: n[1], dz: n[2], u0: q / (Math.PI * r0 * r0), r0 });
  const row = (count: number, r0: number) => {
    const out: FlowJet[] = [];
    for (let i = 0; i < count; i++) { const k = count > 1 ? (i / (count - 1) - 0.5) * len : 0; out.push(one([at[0] + along[0] * k, at[1] + along[1] * k, at[2] + along[2] * k], Q / count, r0)); }
    return out;
  };
  switch (kind) {
    case 'nozzle': return [one(at, Q, 7)];                   // ~14 mm bore: the fast, narrow jet
    case 'lily': return [one(at, Q, 18)];                    // the flare spreads it: slower, wider
    case 'powerhead': return [one(at, Q, 14)];
    case 'sheet': return row(3, Math.max(10, len * 0.16));  // a HOB's falling sheet: wide, slow, into the surface
    case 'spraybar': return row(Math.max(3, Math.min(6, Math.round(len / 80))), 12); // many holes: a broad, gentle band
  }
}

function norm(v: [number, number, number]): [number, number, number] { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/** Water velocity (mm/s) at (x, y, z) from every jet, written into out[0..2]; returns the speed. */
export function flowAt(jets: readonly FlowJet[], x: number, y: number, z: number, out: { [k: number]: number } = [0, 0, 0]): number {
  let vx = 0, vy = 0, vz = 0;
  for (const j of jets) {
    const rx = x - j.x, ry = y - j.y, rz = z - j.z, a = rx * j.dx + ry * j.dy + rz * j.dz;
    if (a < -2 * j.r0) continue;
    const ap = Math.max(a, 0), l2 = Math.max(0, rx * rx + ry * ry + rz * rz - a * a), w = j.r0 + JET_SPREAD * ap;
    const u = j.u0 * Math.min(1, 1.6 * j.r0 / w) * Math.exp(-l2 / (w * w)) * Math.exp(-ap / JET_REACH) * (a < 0 ? Math.exp(a / j.r0) : 1);
    vx += u * j.dx; vy += u * j.dy; vz += u * j.dz;
  }
  out[0] = vx; out[1] = vy; out[2] = vz;
  return Math.hypot(vx, vy, vz);
}

/** A short key of a jet set, for caches (rounded to whole mm). */
export const jetsKey = (jets: readonly FlowJet[]) => jets.map(j => [j.x, j.y, j.z, j.dx * 100, j.dy * 100, j.dz * 100, j.u0, j.r0].map(Math.round).join(',')).join(';');

/** At most MAX_JETS, the strongest (by momentum flux, u0^2 r0^2) kept. */
export function strongest(jets: readonly FlowJet[], n = MAX_JETS): FlowJet[] {
  return jets.length <= n ? [...jets] : [...jets].sort((a, b) => b.u0 * b.u0 * b.r0 * b.r0 - a.u0 * a.u0 * a.r0 * a.r0).slice(0, n);
}
