// The whole-scale gauge (S229, Nathan 2026-10-26): a bar that shows the whole stocking scale, green to the ideal (IDEAL_MAX), green -> amber
// to half way to the limit, amber -> red at 100 and red past it, with a line where this tank is; the reached part full strength, the part
// ahead faint. Past 100 the scale runs to the tank's percent, so the zones shrink to make room ("the green bar would be pushed smaller").
// style.css .gauge draws it from --pct and --ideal; the Fullness tile's load bars and the stocking screen's space bars use it.
import { IDEAL_MAX } from '../scene/stocking';

/** Inline style for an element with class `gauge` (put `<i></i>` inside): the tank's percent, clamped to 0..999, and the ideal. */
export const gaugeStyle = (pct: number) => `--pct:${Number.isFinite(pct) ? Math.min(Math.max(0, pct), 999) : 999};--ideal:${IDEAL_MAX}`;
export const GAUGE_TIP = `The scale: green to the ideal (${IDEAL_MAX}%), amber half way to the limit, red at 100%; the line is this tank. Past 100% the scale stretches to reach it.`;
