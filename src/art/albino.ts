// AL1: the albino (amelanistic) look of a fish plan: the same model with the melanin taken out.
// Melanin goes: dark and grey-brown paint becomes pale cream-pink, dark bars / spots / stripes are dropped; what is not melanin
// stays (red and orange fin pigment, pale spots), only lightened. The eye turns pink with a red pupil. Pure data in, data out.
import type { Plan } from './fishgen';

const HEX = /^#([0-9a-f]{6})$/i;
function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, '0');
  return '#' + q(r) + q(g) + q(b);
}
/** Red / orange / yellow pigment that is not melanin (erythrophores, xanthophores): kept, only lightened. */
const carotenoid = (h: number, s: number, l: number) => s > 0.45 && l > 0.25 && (h <= 55 || h >= 335);

/** A plan colour as an albino fish carries it. */
export function albinoColour(hex: string): string {
  const m = HEX.exec(hex); if (!m) return hex;
  const [h, s, l] = toHsl(hex);
  if (carotenoid(h, s, l)) return fromHsl(h, s * 0.8, Math.min(0.78, l * 0.5 + 0.42));
  // melanin and structural colour: pale pink-cream, a little shade left so the form still reads (belly palest)
  const L = 0.66 + 0.3 * l, hue = 30 + 14 * l, sat = 0.5 - 0.3 * l;
  return fromHsl(hue, sat, L);
}
/** A colour counts as melanic paint (to drop from marks) when it is dark and not carotenoid. */
const melanic = (hex: string) => { const m = HEX.exec(hex); if (!m) return false; const [h, s, l] = toHsl(hex); return !carotenoid(h, s, l) && l < 0.45; };

const mapColours = (v: unknown, key = ''): unknown => {
  if (typeof v === 'string') return key === 'shimmerRgb' ? v : albinoColour(v);
  if (Array.isArray(v)) return v.map(x => mapColours(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapColours(x, k)]));
  return v;
};

/** Hand-tuned albino looks, where the generic recolour is not enough (matched to trade photos, 2026-11-15). Keyed by art. */
const TUNE: Record<string, (q: Plan) => void> = {
  // Albino tiger oscar: white-cream body and head, pale blue-white fins, big strong red-orange marbling over the flanks and back, gold-ringed eye with a dark red pupil
  oscar(q) {
    q.shade = ['#ece6d6', '#f1ebdf', '#f4dcb6'];
    q.fin = '#d3dedf'; q.tail = { ...q.tail, tint: '#dbe3e1', a: 0.85 };
    q.marks = [
      { k: 'blob', u: 0.84, v: 0.07, ru: 0.15, rv: 0.1, c: '#f3d9c4', a: 0.7 },
      { k: 'blob', u: 0.5, v: -0.06, ru: 0.3, rv: 0.17, c: '#ee7a2a', a: 0.72 },
      { k: 'blob', u: 0.34, v: 0.04, ru: 0.2, rv: 0.16, c: '#e8602a', a: 0.8 },
      { k: 'blob', u: 0.6, v: 0.09, ru: 0.2, rv: 0.1, c: '#f08a30', a: 0.78 },
      { k: 'blob', u: 0.2, v: 0.0, ru: 0.1, rv: 0.13, c: '#e4602a', a: 0.85 },
      { k: 'blob', u: 0.42, v: 0.12, ru: 0.14, rv: 0.07, c: '#f0983a', a: 0.7 },
      { k: 'spots', n: 110, u0: 0.14, u1: 0.8, v0: -0.12, v1: 0.17, r: 0.012, c: '#e8602a', a: 0.9 },
      { k: 'spots', n: 22, u0: 0.18, u1: 0.74, v0: -0.1, v1: 0.14, r: 0.026, c: '#dc4c1c', a: 0.85 },
      { k: 'blob', u: 0.24, v: -0.02, ru: 0.045, rv: 0.045, c: '#f0a040', a: 0.95 },
    ];
    q.eye = { ...q.eye, iris: ['#f3d68e', '#d98c3c'], pupil: '#8a1428' };
  },
  // Albino bristlenose: a uniform golden-yellow to orange-yellow body (no brown), lighter mottling, amber fins edged cream, pink-red eyes
  bristlenose(q) {
    q.shade = ['#e08a28', '#ea9e3a', '#f2c880']; q.keel = '#ea9e3a';
    q.fin = '#eeb050'; if (q.tail) q.tail = { ...q.tail, tint: '#eca848' };
    if (q.dorsal) q.dorsal = { ...q.dorsal, tint: '#e8a040' };
    if (q.pec) q.pec = { ...q.pec, tint: '#eeb050' };
    if (q.pelvic) q.pelvic = { ...q.pelvic, tint: '#eeb050' };
  },
  // Albino bronze cory: pink-white with a peach flush, clear fins, red eyes
  bronzecory(q) { q.shade = ['#eec6b0', '#f5d8c6', '#fbeadc']; },
  // Albino tiger barb: orange-cream body, the stripes gone, orange fins
  tigerbarb(q) {
    q.shade = ['#ea9a56', '#f3b97e', '#f8dcb4'];
    q.fin = '#f09a50'; if (q.tail) q.tail = { ...q.tail, tint: '#f08a48', edge: '#e8703a' };
    if (q.dorsal) q.dorsal = { ...q.dorsal, tint: '#f0a258' };
  },
};

export function albinoPlan(p: Plan, art = ''): Plan {
  const keep = <T extends { c: string }>(ms?: T[]) => ms?.filter(m => !melanic(m.c));
  const q = mapColours({ ...p, marks: keep(p.marks as { c: string }[]), finMarks: keep(p.finMarks as { c: string }[]) }) as Plan;
  if (!q.marks?.length) delete q.marks;
  if (!q.finMarks?.length) delete q.finMarks;
  // `mapColours` also ran over strings like fin shape names: only '#rrggbb' values change, the rest pass through
  q.eye = { ...p.eye, iris: ['#f0a0b4', '#b8405c'], pupil: '#7c1428' };
  if (p.shimmerRgb) q.shimmerRgb = '255,225,215';
  if (p.shimmer) q.shimmer = p.shimmer * 0.7;
  TUNE[art]?.(q);
  return q;
}
