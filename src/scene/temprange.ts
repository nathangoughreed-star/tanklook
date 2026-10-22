// Whole-stocking water temperature (2026-10-22, follow-up to the German blue ram review): two SEPARATE outputs.
//
// 1. SHARED RANGE: the intersection of the recorded comfortable ranges (CARE.temp: data/climatedata.ts, sourced in research/climate)
//    of every aquatic species on the list, not pair by pair. Three states:
//      none   = the ranges do not meet, or meet at a single value: "No suitable shared temperature identified". The only blocking
//               temperature verdict.
//      narrow = the shared range is NARROW_C (2 °C) wide or less. A limited margin, NOT an incompatibility: the animals share a range,
//               there is little room inside it. Why 2 °C: the ranges are recorded to whole degrees, and a heater's swing plus a cold
//               night (tech.ts HEAT.nightDropK) move the water by about that much, so a band this narrow leaves no slack.
//      broad  = wider than NARROW_C.
//    (For intervals the whole-stock width equals the narrowest pairwise overlap, so this never finds an empty set the pairs miss;
//    what it adds is the range itself, the narrow tier and the setpoint check below.)
// 2. SETPOINT: does the plan actually run at a temperature inside that range? Known only where the water follows the room (no heater):
//    the Tech menu's room temperature. A heated tank records no heater setting (heatLoss's targetC is the tool's own recommendation,
//    inside the range by construction, so checking it would prove nothing): unchecked, never passed.
//
// The recorded range is what the sources support as bounds. It does not mean equal comfort throughout, so nothing here calls a value
// inside it ideal or optimal; this file infers no comfort rating.
import { CARE } from '../data/care';
import type { Species } from '../data/species';

type R = [number, number];
/** A shared range this wide or narrower (°C) is "narrow": a limited margin, not an incompatibility. */
export const NARROW_C = 2;

export type RangeState = 'none' | 'narrow' | 'broad' | 'unknown';
export interface SharedRange {
  state: RangeState;
  /** the intersection, °C (absent when none or unknown) */
  range?: R;
  /** the species whose comfortable range sets the floor (highest low end) and the ceiling (lowest high end) */
  floor?: Species; ceiling?: Species;
  /** the aquatic species with a recorded range that were counted */
  counted: Species[];
  /** aquatic species with no recorded range: left out of the intersection */
  unrecorded: Species[];
}

const aquatic = (s: Species) => s.habitat !== 'land';
export const fmtC = (r: R) => `${r[0]}–${r[1]} °C`;

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
  if (hi <= lo) return { state: 'none', floor, ceiling, counted, unrecorded };
  return { state: hi - lo <= NARROW_C ? 'narrow' : 'broad', range: [lo, hi], floor, ceiling, counted, unrecorded };
}

/** Output 1 as a line. Passing temperature is temperature only: it never says "compatible". */
export function rangeLine(r: SharedRange): string {
  const miss = r.unrecorded.length ? ` (no recorded range for ${r.unrecorded.map(s => s.name).join(', ')})` : '';
  if (r.state === 'unknown') return `Temperature: no recorded ranges to compare${miss}`;
  if (r.state === 'none') {
    const f = r.floor!, c = r.ceiling!;
    return `Temperature: No suitable shared temperature identified. ${c.name} (${fmtC(CARE[c.id].temp!)}) and ${f.name} (${fmtC(CARE[f.id].temp!)}) have no recorded range in common${miss}`;
  }
  if (r.state === 'narrow') return `Temperature: shared range ${fmtC(r.range!)}, a narrow margin (${NARROW_C} °C or less): the recorded ranges meet, with little room for heater swing or a cold night${miss}`;
  return `Temperature: shared range ${fmtC(r.range!)}${miss}`;
}

export type SetpointState = 'inside' | 'outside' | 'unchecked';
/** Where the water temperature of the plan comes from. `room`: no heater, the water follows the room (`set`: the user entered it;
 *  otherwise the default room is assumed). `heater`: heated; `c` is the heater's setting when the plan records one. Absent: no tank set up. */
export type Setpoint = { kind: 'room'; c: number; set: boolean } | { kind: 'heater'; c?: number };

/** Output 2, kept apart from output 1: does the plan run inside the shared range? A broad range still fails at a setpoint outside
 *  it, and the correction is offered in the mismatch's direction (`fix`: raise = heater, lower = fan / chiller / cooler room); the species combination is not at fault.
 *  A setpoint the plan does not record (or an assumed room) is unchecked, never passed. */
export function setpointCheck(r: SharedRange, at?: Setpoint): { state: SetpointState; text: string; fix?: string } {
  const inRange = r.range ? `set it inside ${fmtC(r.range)}` : 'there is no shared range to set';
  if (!at) return { state: 'unchecked', text: `Setpoint: unchecked, no tank set up yet (${inRange})` };
  if (at.kind === 'heater' && at.c === undefined) return { state: 'unchecked', text: `Setpoint: unchecked, the plan records no heater setting (${inRange})` };
  const where = at.kind === 'heater' ? `the heater is set to ${at.c} °C` : `no heater, the water follows the ${at.set ? '' : 'assumed '}${at.c} °C room`;
  if (!r.range) return { state: 'unchecked', text: `Setpoint: ${where}; ${inRange}` };
  const c = at.c!, [lo, hi] = r.range, band = fmtC(r.range);
  if (c < lo || c > hi) {
    // a correction in the direction of the mismatch: below the range warms (a heater), above it cools (never a heater)
    const fix = c < lo
      ? `raise the temperature to ${band}: ${at.kind === 'heater' ? 'turn the heater up' : `add a heater set to ${band}${at.set ? ', or a warmer room' : ''}`}`
      : `lower the temperature to ${band}: ${at.kind === 'heater' ? 'turn the heater down; if the room is warmer than that, cool it with ' : 'cool it with '}a fan, a chiller or a cooler room`;
    return { state: 'outside', fix, text: `Setpoint: ${where}, outside the shared range ${band}: ${fix}. The animals are not at fault, the setting is` };
  }
  if (at.kind === 'room' && !at.set) return { state: 'unchecked', text: `Setpoint: unchecked, the room temperature is not set (${c} °C assumed, inside ${band})` };
  return { state: 'inside', text: `Setpoint: ${where}, inside the shared range ${band}` };
}

/** The level of the shared-range line once the setpoint is known: no shared range blocks; a valid range is never shown as positive
 *  while the plan's setpoint lies outside it (the line then says so, about this plan, not the species); a narrow one is a margin. */
export function rangeVerdict(r: SharedRange, at: { state: SetpointState }): { level: 'ok' | 'warn' | 'bad'; text: string } {
  const text = rangeLine(r);
  if (r.state === 'none') return { level: 'bad', text };
  if (at.state === 'outside') return { level: 'warn', text: `${text}; this plan runs outside it until the setpoint changes (see Setpoint)` };
  return { level: r.state === 'broad' ? 'ok' : 'warn', text };
}
