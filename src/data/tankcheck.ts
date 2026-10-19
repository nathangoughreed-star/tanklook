// The tank catalog's checks (lane KA): used by test/tanks.test.ts and scripts/check-tanks.mjs.
import { volume } from '../scene/physics';
import { bandOf, outerOf, TANK_MODELS, tankFromModel, type TankModel } from './tanks';

/** Largest allowed gap between the derived interior volume and the label (fraction of rated). */
export const VOL_TOL = 0.08;
/** Known honest exceptions: rated gallons are nominal (total volume incl. overfill, or a round-number size name), so the volume inside
 * the glass is further off than the tolerance. id -> [lowest, highest] allowed ratio computed / rated. Do not widen VOL_TOL instead. */
export const VOL_EXCEPTIONS: Record<string, [number, number]> = {
  g125: [0.90, 0.94],   // "125" is 72x18x22 outside: ~116 gal inside the glass
  g300: [0.88, 0.94],   // 120x24x24 is the nominal 300; 15 mm glass leaves ~270
};

export interface TankReport { id: string; rated: number; gal: number; ratio: number; interior: { L: number; H: number; D: number }; problems: string[] }

export function checkModel(m: TankModel): TankReport {
  const T = tankFromModel(m), gal = volume(T).gallons, ratio = gal / m.ratedGal, problems: string[] = [];
  const [lo, hi] = VOL_EXCEPTIONS[m.id] ?? [1 - VOL_TOL, 1 + VOL_TOL];
  if (ratio < lo || ratio > hi) problems.push(`volume ${gal.toFixed(1)} gal vs rated ${m.ratedGal} (${((ratio - 1) * 100).toFixed(1)} %, allowed ${((lo - 1) * 100).toFixed(0)}..${((hi - 1) * 100).toFixed(0)} %)`);
  const back = outerOf(T, m.glassMm);
  for (const k of ['L', 'H', 'D'] as const) if (Math.abs(back[k] - m.outer[k]) > 0.1) problems.push(`round trip ${k}: outer ${m.outer[k]} -> interior ${T[k].toFixed(2)} -> outer ${back[k].toFixed(2)}`);
  if (!m.terrarium && m.band !== bandOf(m.ratedGal)) problems.push(`band ${m.band} but ${m.ratedGal} gal is ${bandOf(m.ratedGal)}`);
  if (m.shape === 'bow' && m.bowMin == null) problems.push('bow without bowMin');
  if (m.shape === 'poly' && !m.sides) problems.push('poly without sides');
  if (m.shape === 'pie' && !m.pieDeg) problems.push('pie without pieDeg');
  return { id: m.id, rated: m.ratedGal, gal, ratio, interior: { L: T.L, H: T.H, D: T.D }, problems };
}

export function checkAll() {
  const reports = TANK_MODELS.map(checkModel), seen = new Set<string>(), global: string[] = [];
  for (const m of TANK_MODELS) { if (seen.has(m.id)) global.push(`duplicate id ${m.id}`); seen.add(m.id); }
  return { reports, global };
}
