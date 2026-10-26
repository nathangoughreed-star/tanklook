// The whole-scale gauge (S229, Nathan 2026-10-26): a bar that shows the whole stocking scale, green to the ideal (IDEAL_MAX), green -> amber
// to half way to the limit, amber -> red at 100 and red past it, with a line where this tank is; the reached part full strength, the part
// ahead faint. Past 100 the scale runs to the tank's percent, so the zones shrink to make room ("the green bar would be pushed smaller").
// style.css .gauge draws it from --pct and --ideal; the Fullness tile's load bars and the stocking screen's space bars use it.
import { IDEAL_MAX } from '../scene/stocking';

/** Inline style for an element with class `gauge` (put `<i></i>` inside): the tank's percent, clamped to 0..999, and the ideal. */
export const gaugeStyle = (pct: number) => `--pct:${Number.isFinite(pct) ? Math.min(Math.max(0, pct), 999) : 999};--ideal:${IDEAL_MAX}`;
export const GAUGE_TIP = `The scale: green to the ideal (${IDEAL_MAX}%), amber half way to the limit, red at 100%; the line is this tank. Past 100% the scale stretches to reach it.`;

/** The gauge's stops; style.css .gauge uses the same three. */
export const GAUGE_GREEN = '#2e9e6a', GAUGE_AMBER = '#d99a1e', GAUGE_RED = '#d8432f';
const MID = (IDEAL_MAX + 100) / 2;
const ch = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
const mix = (a: string, b: string, t: number) => '#' + [0, 1, 2].map(i => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('');
/** How far into the amber a percent is, 0..1: 0 on green and red, 1 at the amber stop. */
const amberWeight = (pct: number) => !Number.isFinite(pct) || pct <= IDEAL_MAX || pct >= 100 ? 0 : pct <= MID ? (pct - IDEAL_MAX) / (MID - IDEAL_MAX) : (100 - pct) / (100 - MID);
/** The gauge's colour at a percent, where the bar's line sits, for everything that colours the current level (the tile's pill, the
 *  stocking screen's past-ideal label): Nathan 2026-10-26, "just over ideal, it should still be pretty much green". Linear in sRGB like the CSS. */
export function gaugeColor(pct: number): string {
  if (!Number.isFinite(pct) || pct >= 100) return GAUGE_RED;
  if (pct <= IDEAL_MAX) return GAUGE_GREEN;
  return pct <= MID ? mix(GAUGE_GREEN, GAUGE_AMBER, (pct - IDEAL_MAX) / (MID - IDEAL_MAX)) : mix(GAUGE_AMBER, GAUGE_RED, (pct - MID) / (100 - MID));
}
/** Text colour on a gaugeColor background: dark while the amber dominates, white on green and red (the pill's old pairings). */
export const gaugeText = (pct: number) => amberWeight(pct) >= 0.5 ? '#1d2330' : '#fff';
