// Whole-stocking water temperature (2026-10-22, follow-up to the German blue ram review): two SEPARATE outputs.
//
// 1. SHARED RANGE (about the species): the intersection of the recorded comfortable ranges (CARE.temp: data/climatedata.ts, sourced in
//    research/climate) of every aquatic species on the list, not pair by pair. States:
//      none   = the ranges do not overlap: "No suitable shared temperature identified". Blocking.
//      single = they meet at exactly one value: the ranges do overlap, so a caution (yellow), not an incompatibility
//               ("Only one shared temperature; no operating margin"). Nathan 2026-10-28: red only when nothing satisfies all.
//      narrow = (retired 2026-10-28, NARROW_C = 0: never produced) a range of any width is green.
//      broad  = wider than NARROW_C.
//    For ordinary intervals pairwise overlap guarantees a shared intersection, whose width runs from the highest low end to the lowest high end.
// 2. THIS PLAN'S WATER (about the plan), three inputs kept apart (TempEvidence):
//      target   = the Tech menu's target water temperature: whether the intended operating temperature fits the stocking (operatingCheck)
//      kit/room = heater, chiller and room: whether the setup is expected to HOLD that target (holdCheck); a heater setting alone never
//                 turns the assessment green
//      measured = an existing tank's measured water temperature: whether it falls in the range now (measuredCheck)
//    With no target and no heater the water is MODELLED as following the room: an estimate, labelled so. A room the user entered is
//    assessed as that estimate; the default room is not information enough for a failure (a conditional concern). Unknown = unchecked.
//
// The recorded range is what the sources support as bounds. It does not mean equal comfort throughout, so nothing here calls a value
// inside it ideal or optimal; this file infers no comfort rating.
import { CARE } from '../data/care';
import type { Species } from '../data/species';

type R = [number, number];
/** A shared range this wide or narrower (°C) is "narrow": a limited margin, not an incompatibility. */
export const NARROW_C = 0; // Nathan 2026-10-28: any real range is green; only one shared value is yellow, no overlap red

export type RangeState = 'none' | 'single' | 'narrow' | 'broad' | 'unknown';
export interface SharedRange {
  state: RangeState;
  /** the intersection, °C (one value when single; absent when none or unknown) */
  range?: R;
  /** the species whose comfortable range sets the floor (highest low end) and the ceiling (lowest high end) */
  floor?: Species; ceiling?: Species;
  /** the aquatic species with a recorded range that were counted */
  counted: Species[];
  /** aquatic species with no recorded range: left out of the intersection */
  unrecorded: Species[];
}

const aquatic = (s: Species) => s.habitat !== 'land';
const toF = (c: number) => Math.round(c * 9 / 5 + 32);
/** One temperature as text: °C, or °F when `us`. */
export const fmtT = (c: number, us?: boolean) => us ? `${toF(c)} °F` : `${c} °C`;
/** A range as text: °C, or °F when `us` (US units). */
export const fmtC = (r: R, us?: boolean) => r[0] === r[1] ? (us ? `${toF(r[0])} °F` : `${r[0]} °C`) : us ? `${toF(r[0])}–${toF(r[1])} °F` : `${r[0]}–${r[1]} °C`;

/** Output 1: the intersection of every aquatic species' comfortable range (each species once). */
export function sharedRange(list: Species[]): SharedRange {
  const seen = new Set<string>(), counted: Species[] = [], unrecorded: Species[] = [];
  for (const s of list) {
    if (seen.has(s.id) || !aquatic(s)) continue;
    seen.add(s.id);
    (CARE[s.id]?.temp ? counted : unrecorded).push(s);
  }
  if (!counted.length) return { state: 'unknown', counted, unrecorded };
  let floor = counted[0], ceiling = counted[0];
  for (const s of counted) {
    if (CARE[s.id].temp![0] > CARE[floor.id].temp![0]) floor = s;
    if (CARE[s.id].temp![1] < CARE[ceiling.id].temp![1]) ceiling = s;
  }
  const lo = CARE[floor.id].temp![0], hi = CARE[ceiling.id].temp![1];
  if (hi < lo) return { state: 'none', floor, ceiling, counted, unrecorded };
  if (hi === lo) return { state: 'single', range: [lo, hi], floor, ceiling, counted, unrecorded };
  return { state: hi - lo <= NARROW_C ? 'narrow' : 'broad', range: [lo, hi], floor, ceiling, counted, unrecorded };
}

/** Output 1 as a line. Passing temperature is temperature only: it never says "compatible". */
export function rangeLine(r: SharedRange, us?: boolean): string {
  const miss = r.unrecorded.length ? ` (no recorded range for ${r.unrecorded.map(s => s.name).join(', ')})` : '';
  if (r.state === 'unknown') return `Temperature: no recorded ranges to compare${miss}`;
  if (r.state === 'none' || r.state === 'single') {
    const f = r.floor!, c = r.ceiling!, pair = `${c.name} (${fmtC(CARE[c.id].temp!, us)}) and ${f.name} (${fmtC(CARE[f.id].temp!, us)})`;
    return r.state === 'none' ? `Temperature: No suitable shared temperature identified. ${pair} have no recorded range in common${miss}`
      : `Temperature: Only one shared temperature (${us ? `${toF(r.range![0])} °F` : `${r.range![0]} °C`}); no operating margin. ${pair} meet at that one value${miss}`;
  }
  return `Temperature: shared range ${fmtC(r.range!, us)}${miss}`;
}

/** This plan's water temperature inputs (tech.ts tempEvidence). */
export interface TempEvidence {
  /** the target water temperature the user set (Tech menu), °C */
  target?: number;
  /** a measured water temperature (an existing tank), °C */
  measured?: number;
  heater: boolean; chiller: boolean;
  /** US units: say every temperature in °F (the values stay °C) */
  us?: boolean;
  /** the room, °C; `roomSet`: the user entered it (otherwise the default is assumed) */
  room: number; roomSet: boolean;
  /** the heaters are expected to hold the target in this room (heat loss against their watts); absent = not known */
  heatHolds?: boolean;
}
export type CheckState = 'inside' | 'outside' | 'conditional' | 'unchecked';
export interface TempCheck { state: CheckState; text: string; fix?: string }

const below = (c: number, r: R) => c < r[0];
/** The correction in the direction of the mismatch: below the range warms, above it cools (never a heater). */
function correction(c: number, r: R, how: { heater: boolean; target: boolean }, us?: boolean): string {
  const band = fmtC(r, us);
  if (how.target) return `${below(c, r) ? 'raise' : 'lower'} the target to ${band}`;
  return below(c, r) ? `raise the temperature to ${band}: ${how.heater ? 'turn the heater up' : `add a heater set to ${band}`}`
    : `lower the temperature to ${band}: cool it with a fan, a chiller or a cooler room`;
}
/** Who on the list a value misses (each species' own recorded range), e.g. "too cold for Discus, Neon tetra". */
function misses(r: SharedRange, c: number): string {
  const cold = r.counted.filter(s => c < CARE[s.id].temp![0]).map(s => s.name), warm = r.counted.filter(s => c > CARE[s.id].temp![1]).map(s => s.name);
  return [cold.length ? `too cold for ${cold.join(', ')}` : '', warm.length ? `too warm for ${warm.join(', ')}` : ''].filter(Boolean).join('; ');
}

/** Does this plan's intended operating temperature fit the shared range? The target if set; with no target and no heater, the water
 *  modelled from the room (an estimate); otherwise unchecked. A default room outside the range is a conditional concern, not a failure. */
export function operatingCheck(r: SharedRange, ev?: TempEvidence, usArg?: boolean): TempCheck {
  const us = ev?.us ?? usArg, inRange = r.range ? `set it ${r.state === 'single' ? 'to' : 'inside'} ${fmtC(r.range, us)}` : 'there is no shared range to set';
  if (!ev) return { state: 'unchecked', text: `Water temperature: unchecked, no tank set up yet (${inRange})` };
  if (!r.range) return { state: 'unchecked', text: `Water temperature: ${inRange}` };
  const band = fmtC(r.range, us);
  if (ev.target !== undefined) {
    const c = ev.target;
    if (c >= r.range[0] && c <= r.range[1]) return { state: 'inside', text: `Target water temperature ${fmtT(c, us)}: inside the shared range ${band}` };
    const fix = correction(c, r.range, { heater: ev.heater, target: true }, us);
    return { state: 'outside', fix, text: `Target water temperature ${fmtT(c, us)}: outside the shared range ${band} (${misses(r, c)}): ${fix}` };
  }
  if (ev.heater) return { state: 'unchecked', text: `Water temperature: unchecked, no target water temperature set (${inRange}; Tech menu)` };
  const c = ev.room, C = fmtT(c, us), model = `no heater, so the water is estimated at the ${ev.roomSet ? '' : 'assumed '}${C} room (a model, not a measurement)`;
  if (c >= r.range[0] && c <= r.range[1]) return ev.roomSet
    ? { state: 'inside', text: `Water temperature: ${model}, inside the shared range ${band}` }
    : { state: 'unchecked', text: `Water temperature: unchecked, the room temperature is not entered (${C} assumed, inside ${band})` };
  const fix = correction(c, r.range, { heater: false, target: false }, us);
  if (!ev.roomSet) return { state: 'conditional', fix, text: `Water temperature: if the room is about ${C} (assumed, not entered), the unheated water would be ${below(c, r.range) ? 'below' : 'above'} ${band} (${misses(r, c)}): enter the room temperature, or ${fix}` };
  return { state: 'outside', fix, text: `Water temperature: ${model}, outside the shared range ${band} (${misses(r, c)}): ${fix}` };
}

/** Is the setup expected to hold the target? Asked only once a target is set: a target above the room needs a heater that holds it,
 *  one below the room needs cooling. Expected, never measured; with an assumed room the answer is conditional. */
export function holdCheck(ev?: TempEvidence): TempCheck | null {
  if (!ev || ev.target === undefined) return null;
  const us = ev.us, T = (c: number) => fmtT(c, us), t = ev.target, room = `${ev.roomSet ? '' : 'assumed '}${T(ev.room)} room`;
  const cond = (x: TempCheck): TempCheck => ev.roomSet ? x : { ...x, state: 'conditional' };
  if (t > ev.room + 0.5) {
    if (!ev.heater) return cond({ state: 'outside', fix: `add a heater set to ${T(t)}`, text: `Holding ${T(t)}: requires heating, the ${room} is cooler and there is no heater: add a heater set to ${T(t)}` });
    if (ev.heatHolds === false) return cond({ state: 'outside', fix: 'a stronger heater', text: `Holding ${T(t)}: the heater is not expected to hold it in the ${room}: a stronger heater` });
    return { state: 'inside', text: `Holding ${T(t)}: the heater is expected to hold it in the ${room} (expected, not measured)` };
  }
  if (t < ev.room - 0.5) {
    if (!ev.chiller) return cond({ state: 'outside', fix: `cool it to ${T(t)}`, text: `Holding ${T(t)}: requires cooling, the ${room} is warmer: a fan, a chiller or a cooler room` });
    return { state: 'inside', text: `Holding ${T(t)}: the chiller is expected to hold it in the ${room} (expected, not measured)` };
  }
  return { state: 'inside', text: `Holding ${T(t)}: the ${room} is about that temperature (expected, not measured)` };
}

/** An existing tank's measured water temperature against the shared range: the observation, assessed directly. */
export function measuredCheck(r: SharedRange, ev?: TempEvidence): TempCheck | null {
  if (!ev || ev.measured === undefined || !r.range) return null;
  const us = ev.us, c = ev.measured, band = fmtC(r.range, us);
  if (c >= r.range[0] && c <= r.range[1]) return { state: 'inside', text: `Measured water temperature ${fmtT(c, us)}: inside the shared range ${band}` };
  const fix = correction(c, r.range, { heater: ev.heater, target: false }, us);
  return { state: 'outside', fix, text: `Measured water temperature ${fmtT(c, us)}: outside the shared range ${band} (${misses(r, c)}): ${fix}` };
}

/** The level of the shared-range line given this plan's checks: no shared range blocks, one shared value is a caution; a valid range is never shown as
 *  positive while a definitive check (target, entered room, measurement) puts the water outside it; an assumed room only qualifies it. */
export function rangeVerdict(r: SharedRange, checks: (TempCheck | null)[], us?: boolean): { level: 'ok' | 'warn' | 'bad'; text: string } {
  const text = rangeLine(r, us);
  if (r.state === 'none') return { level: 'bad', text };
  if (checks.some(c => c?.state === 'outside')) return { level: 'warn', text: `${text}; this plan's water is outside it as set (see below)` };
  return { level: r.state === 'broad' || r.state === 'narrow' ? 'ok' : 'warn', text };
}
/** A check's level on the plan sheet: outside fails the current setup, a conditional or unchecked one is a concern. */
export const checkLevel = (c: TempCheck): 'ok' | 'warn' | 'bad' => c.state === 'outside' ? 'bad' : c.state === 'inside' ? 'ok' : 'warn';
