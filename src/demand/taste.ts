// Taste (lane NG5, gap 7 of research/design/guided-sandbox-plan.md): what the person's picks and rejections in the look picker teach the ranking.
// RANKING ONLY, never feasibility: the bonus is added to a concept's score after every welfare gate and limit has passed, so a strong liking
// never makes a failing concept pass and never changes a number the engines compute. Stored in the brief as `preferences.taste`, so it saves,
// shares and undoes with the project.
// Early picks never lock the project: each new event fades every older one (DECAY), the list is capped, and the person can clear it.
import { clearItem, getItem, setItem, type Brief } from '../scene/brief';
import { LAYOUTS } from '../scene/items';

export type TasteKind = 'pick' | 'reject' | 'refine';
export const TASTE_KINDS: readonly TasteKind[] = ['pick', 'reject', 'refine'];
/** One signal, oldest first in the list. `style` is a look id (LayoutId); `variant` the example tile it came from, when there was one. */
export interface TasteEvent { style: string; kind: TasteKind; variant?: string }
export interface Taste { events: TasteEvent[] }

export const MAX_EVENTS = 30;
/** What one signal is worth when new, and how much of an older signal is left after each later event. */
export const STEP: Record<TasteKind, number> = { pick: 1, reject: -1, refine: 0.5 };
export const DECAY = 0.8;
/** Score points per unit of weight, and the cap either way. A matched appeal tag is worth 10, so taste breaks ties and nudges; it never outvotes what the person asked for. */
export const POINTS = 2.5;
export const MAX_BONUS = 5;
/** Under this weight the card says nothing (a faded signal is not a reason). */
export const SHOW_AT = 0.4;

const nameOf = (style: string) => (LAYOUTS as Record<string, { label: string } | undefined>)[style]?.label ?? style;

export const tasteOf = (b: Brief): Taste | undefined => { const it = getItem(b, 'preferences.taste'); return it && !it.off ? it.value : undefined; };

/** Append one signal (the oldest fall off the end of the list). */
export function recordTaste(b: Brief, ev: TasteEvent): Brief {
  const events = [...(tasteOf(b)?.events ?? []), ev].slice(-MAX_EVENTS);
  return setItem(b, 'preferences.taste', { events }, 'preference');
}
/** Forget everything learned. */
export const clearTaste = (b: Brief): Brief => clearItem(b, 'preferences.taste');
/** Forget one look's signals only (a rejection can be undone from the strip). */
export function forgetStyle(b: Brief, style: string): Brief {
  const t = tasteOf(b); if (!t) return b;
  const events = t.events.filter(e => e.style !== style);
  return events.length ? setItem(b, 'preferences.taste', { events }, 'preference') : clearTaste(b);
}

/** Take back one example's signals of a kind (an undone "not this"). */
export function forgetVariant(b: Brief, variant: string, kind: TasteKind): Brief {
  const t = tasteOf(b); if (!t) return b;
  const events = t.events.filter(e => !(e.variant === variant && e.kind === kind));
  return events.length ? setItem(b, 'preferences.taste', { events }, 'preference') : clearTaste(b);
}

/** The weight of every look with a signal: each event's step, faded by 0.8 for every later event. */
export function weightsOf(t: Taste | undefined): Record<string, number> {
  const w: Record<string, number> = {}, n = t?.events.length ?? 0;
  t?.events.forEach((e, i) => { w[e.style] = (w[e.style] ?? 0) + STEP[e.kind] * Math.pow(DECAY, n - 1 - i); });
  return w;
}
export const weightOf = (t: Taste | undefined, style: string | undefined): number => style ? weightsOf(t)[style] ?? 0 : 0;

/** The ranking points a concept in this look gets (0 with no taste or no look). Added to the score at demand/suggest.ts after the gates. */
export function tasteBonus(t: Taste | undefined, style: string | undefined): number {
  return Math.max(-MAX_BONUS, Math.min(MAX_BONUS, weightOf(t, style) * POINTS));
}

const times = (n: number) => n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
const count = (t: Taste, style: string, kind: TasteKind) => t.events.filter(e => e.style === style && e.kind === kind).length;

/** The card's reason, or undefined when taste did not move it: "Ranked higher because you picked Clean & minimal twice." */
export function tasteWhy(t: Taste | undefined, style: string | undefined): string | undefined {
  if (!t || !style) return undefined;
  const w = weightOf(t, style), name = nameOf(style);
  if (Math.abs(w) < SHOW_AT) return undefined;
  if (w > 0) {
    const p = count(t, style, 'pick'), r = count(t, style, 'refine');
    return p ? `Ranked higher because you picked ${name} ${times(p)}${r ? ' and kept refining it' : ''}.` : `Ranked higher because you kept refining ${name}.`;
  }
  const r = count(t, style, 'reject');
  return `Ranked lower because you said "not this" to ${name}${r > 1 ? ` ${times(r)}` : ''}.`;
}

/** The "what I have learned" line for the look picker: leaning toward / away from, strongest first; undefined while nothing is above the threshold. */
export function tasteSummary(t: Taste | undefined): { toward: string[]; away: string[] } | undefined {
  const w = Object.entries(weightsOf(t)).filter(([, v]) => Math.abs(v) >= SHOW_AT).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0]));
  if (!w.length) return undefined;
  return { toward: w.filter(([, v]) => v > 0).map(([s]) => nameOf(s)), away: w.filter(([, v]) => v < 0).map(([s]) => nameOf(s)) };
}

/** Validate a saved / shared taste (brief.ts parseBrief): known kinds only, capped, empty = dropped. */
export function parseTaste(v: unknown): Taste | undefined {
  const raw = (v as { events?: unknown } | undefined)?.events; if (!Array.isArray(raw)) return undefined;
  const events = raw.filter((e): e is TasteEvent => !!e && typeof e.style === 'string' && e.style.length < 40 && e.style !== 'none' && TASTE_KINDS.includes(e.kind))
    .map(e => ({ style: e.style, kind: e.kind, ...(typeof e.variant === 'string' && e.variant.length < 40 ? { variant: e.variant } : {}) })).slice(-MAX_EVENTS);
  return events.length ? { events } : undefined;
}
