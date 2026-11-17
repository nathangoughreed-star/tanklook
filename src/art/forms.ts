// CM3: colour / pattern forms and fin forms of one species, as patches over its base Plan (the same model, repainted or reshaped).
// Ids match src/data/forms.json. A fish with `form` (colour axis) and / or `finForm` (fin axis) is drawn from the plan
// `<art>~f:<form>:<finForm>` (formArt), registered at load for every combination. Pure data in, data out.
import type { Plan } from './fishgen';
import data from '../data/forms.json';

export interface FormDef { id: string; name: string; est?: boolean }
export interface SpeciesForms { src: string; colour: FormDef[]; fin: FormDef[]; finNote?: string; colourNote?: string }
export const FORMS = Object.fromEntries(Object.entries(data.species as Record<string, Partial<SpeciesForms>>).map(([k, v]) => [k, { src: v.src ?? '', colour: v.colour ?? [], fin: v.fin ?? [], finNote: v.finNote, colourNote: v.colourNote } as SpeciesForms])) as Record<string, SpeciesForms>;

/** The art / look key of a species drawing in a colour form and / or a fin form. */
export const formArt = (art: string, form?: string, fin?: string) => form || fin ? `${art}~f:${form ?? ''}:${fin ?? ''}` : art;

type Marks = NonNullable<Plan['marks']>;
type Patch = (p: Plan, female: boolean) => Plan;

// ---------- colour helpers
const n = (h: string) => parseInt(h.slice(1), 16);
const mix = (a: string, b: string, t: number) => { const x = n(a), y = n(b), c = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return '#' + [16, 8, 0].map(s => c(s).toString(16).padStart(2, '0')).join(''); };
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
/** n soft patches of the given colours scattered over a box (body u / v), seeded so a form always looks the same. */
function blobs(seed: number, count: number, cols: string[], u0: number, u1: number, v0: number, v1: number, r0: number, r1: number, a = 0.85): Marks {
  const r = lcg(seed);
  return Array.from({ length: count }, () => ({ k: 'blob' as const, u: u0 + r() * (u1 - u0), v: v0 + r() * (v1 - v0), ru: r0 + r() * (r1 - r0), rv: (r0 + r() * (r1 - r0)) * 0.8, c: cols[Math.floor(r() * cols.length)], a }));
}
const spots = (c: string, count: number, u0: number, u1: number, v0: number, v1: number, r: number, a = 0.5): Marks[number] => ({ k: 'spots', n: count, u0, u1, v0, v1, r, c, a });
const band = (u0: number, u1: number, v0: number, v1: number, c: string, a = 0.8, f = 0.02): Marks[number] => ({ k: 'band', u0, u1, v0, v1, c, a, f });

/** What a colour form sets (male); a female takes it at `fm` strength (livebearer and betta females carry far less colour). */
interface Look {
  shade: [string, string, string]; fin?: string; tail?: string; edge?: string; ray?: string; dorsal?: string; anal?: string; pelvic?: string; pec?: string;
  marks?: Marks; finMarks?: Marks; iris?: [string, string]; shimmerRgb?: string; shimmer?: number; fm?: number; tailA?: number; fmarks?: Marks;
}
/** Anything with a tint field (fins). */
const tint = <T extends object | undefined>(f: T, c?: string): T => (f && c ? { ...f, tint: c } : f);
function look(L: Look): Patch {
  return (p, female) => {
    const k = female ? L.fm ?? 0.35 : 1, mx = (a: string, b?: string) => b ? (female ? mix(a, b, k) : b) : a;
    const q: Plan = { ...p, shade: p.shade.map((c, i) => mx(c, L.shade[i])) as Plan['shade'] };
    q.fin = mx(p.fin, L.fin ?? L.tail);
    if (p.ray && L.ray) q.ray = mx(p.ray, L.ray);
    q.tail = { ...p.tail, ...(L.tail ?? L.fin ? { tint: mx(p.tail.tint ?? p.fin, (L.tail ?? L.fin)!) } : {}), ...(L.edge && !female ? { edge: L.edge } : {}), ...(L.tailA && !female ? { a: L.tailA } : {}) };
    const fc = (c?: string, own?: string) => c ? mx(own ?? p.fin, c) : undefined;
    if (p.dorsal) q.dorsal = tint(p.dorsal, fc(L.dorsal ?? L.fin ?? L.tail, (p.dorsal as { tint?: string }).tint)) ;
    if (p.anal) q.anal = tint(p.anal, fc(L.anal ?? L.fin ?? L.tail, (p.anal as { tint?: string }).tint));
    if (p.pelvic) q.pelvic = { ...p.pelvic, ...(L.pelvic ?? L.fin ?? L.tail ? { tint: mx(p.pelvic.tint ?? p.fin, (L.pelvic ?? L.fin ?? L.tail)!) } : {}) };
    if (p.pec && (L.pec ?? L.fin)) q.pec = { ...p.pec, tint: mx(p.pec.tint ?? p.fin, (L.pec ?? L.fin)!) };
    if (L.marks) { if (female) { if (L.fmarks) q.marks = L.fmarks; } else q.marks = L.marks; }
    if (L.finMarks && !female) q.finMarks = L.finMarks;
    if (L.iris && !female) q.eye = { ...p.eye, iris: L.iris };
    if (L.shimmerRgb) q.shimmerRgb = L.shimmerRgb;
    if (L.shimmer !== undefined) q.shimmer = L.shimmer;
    return q;
  };
}
/** Fin form: the tail type / size, and size changes to the dorsal and anal fins (a female's are far smaller). */
function fins(o: { tail?: { type: NonNullable<Plan['tail']['type']>; h: number; cut?: number; a?: number }; dorsalH?: number; analH?: number; dorsalLen?: number; analLen?: number; pec?: number; pelvic?: number }): Patch {
  return (p, female) => {
    const kf = female ? 0.5 : 1, q: Plan = { ...p };
    if (o.tail) q.tail = { ...p.tail, type: o.tail.type, h: o.tail.h * kf + (female ? p.tail.h * 0.5 * 0.5 : 0), ...(o.tail.cut ? { cut: o.tail.cut } : { cut: undefined }), ...(o.tail.a && !female ? { a: o.tail.a } : {}) };
    const sc = (f: Plan['dorsal'], h?: number, len?: number) => { if (!f) return f; const g = { ...f } as { h: number; len?: number; u0?: number; u1?: number }; if (h) g.h = f.h * (female ? 1 + (h - 1) * 0.4 : h); if (len && 'len' in f) g.len = (f as { len: number }).len * len; return g as typeof f; };
    q.dorsal = sc(p.dorsal, o.dorsalH, o.dorsalLen); q.anal = sc(p.anal, o.analH, o.analLen);
    if (o.pec) q.pec = { ...p.pec, s: (p.pec?.s ?? 1) * o.pec };
    if (o.pelvic && p.pelvic) q.pelvic = { ...p.pelvic, len: p.pelvic.len * o.pelvic };
    return q;
  };
}

// ---------- betta
const bettaC: Record<string, Patch> = {
  red: look({ fm: 0.85, shade: ['#4a0a16', '#a8142a', '#c83440'], fin: '#b61a2e', ray: '#5a0a14', marks: [spots('#e8586a', 50, 0.38, 0.85, -0.08, 0.08, 0.009, 0.25)], finMarks: [], iris: ['#6a2a2a', '#1a0808'] }),
  blue: look({ fm: 0.85, shade: ['#0c1646', '#1a3a98', '#3560c8'], fin: '#1e3c9e', ray: '#0c1640', marks: [spots('#78b0f0', 70, 0.38, 0.85, -0.09, 0.09, 0.01, 0.38)], finMarks: [spots('#6a98e0', 50, 0, 0.6, -0.4, 0.4, 0.013, 0.2)], shimmerRgb: '150,190,255', iris: ['#3a4a6a', '#0a0a18'] }),
  turquoise: look({ fm: 0.85, shade: ['#08343a', '#14787a', '#38b0a6'], fin: '#1c8a86', ray: '#0a3a3a', marks: [spots('#7ae0d0', 70, 0.38, 0.85, -0.09, 0.09, 0.01, 0.4)], finMarks: [spots('#5ad0c0', 50, 0, 0.6, -0.4, 0.4, 0.013, 0.2)], shimmerRgb: '150,255,235', iris: ['#3a5a5a', '#081414'] }),
  'black-orchid': look({ fm: 0.85, shade: ['#08080e', '#171722', '#2a2a3a'], fin: '#12121c', ray: '#33335a', marks: [spots('#4a5ab0', 60, 0.38, 0.85, -0.08, 0.08, 0.01, 0.3)], finMarks: [spots('#4650a0', 50, 0, 0.6, -0.4, 0.4, 0.012, 0.18)], shimmerRgb: '120,140,230', iris: ['#4a4a5a', '#0a0a10'] }),
  koi: look({ fm: 0.85, shade: ['#cdbab2', '#ece0d8', '#f6efe9'], fin: '#f3e8e2', tail: '#f4eae4', ray: '#c4a8a0', tailA: 0.85,
    marks: [{ k: 'blob', u: 0.88, v: -0.03, ru: 0.12, rv: 0.1, c: '#d8281e', a: 0.9 }, { k: 'blob', u: 0.62, v: -0.05, ru: 0.15, rv: 0.1, c: '#14141a', a: 0.92 }, { k: 'blob', u: 0.5, v: 0.04, ru: 0.1, rv: 0.07, c: '#dc2c20', a: 0.9 }, { k: 'blob', u: 0.74, v: 0.05, ru: 0.08, rv: 0.06, c: '#14141a', a: 0.85 }, { k: 'blob', u: 0.43, v: -0.04, ru: 0.06, rv: 0.05, c: '#e03a28', a: 0.85 }],
    finMarks: [{ k: 'blob', u: 0.22, v: -0.18, ru: 0.12, rv: 0.1, c: '#d8281e', a: 0.9 }, { k: 'blob', u: 0.4, v: 0.12, ru: 0.1, rv: 0.1, c: '#14141a', a: 0.85 }, { k: 'blob', u: 0.08, v: 0.16, ru: 0.08, rv: 0.1, c: '#dc2c20', a: 0.85 }], shimmerRgb: '255,235,225', iris: ['#5a4a42', '#0c0808'] }),
  marble: look({ fm: 0.85, shade: ['#2a2a54', '#7a6a96', '#c8b0b8'], fin: '#8c4c7c', ray: '#4a2a5a', marks: blobs(11, 14, ['#d8302a', '#f2eae6', '#1a2a74', '#14141a'], 0.4, 0.95, -0.07, 0.08, 0.03, 0.07, 0.8), finMarks: blobs(12, 10, ['#d8302a', '#f2eae6', '#1a2a74'], 0, 0.5, -0.35, 0.35, 0.05, 0.1, 0.8), iris: ['#5a4a42', '#0c0808'] }),
  'mustard-gas': look({ fm: 0.85, shade: ['#10304c', '#24547a', '#4a88a8'], fin: '#e8a02c', tail: '#eba636', ray: '#a45a14', dorsal: '#e89a28', anal: '#e8a030', pelvic: '#e8a030', marks: [spots('#6ab4cc', 70, 0.38, 0.85, -0.09, 0.09, 0.01, 0.4)], finMarks: [], shimmerRgb: '150,225,255', iris: ['#a06a2a', '#2a1408'] }),
  'white-platinum': look({ fm: 0.85, shade: ['#b8bec6', '#e6eaee', '#f6f7f9'], fin: '#f0f3f6', tail: '#f1f3f6', ray: '#aab2bc', tailA: 0.88, marks: [spots('#ffffff', 50, 0.38, 0.85, -0.08, 0.08, 0.01, 0.4)], finMarks: [], shimmerRgb: '255,255,255', iris: ['#4a4a52', '#0a0a0c'] }),
  yellow: look({ fm: 0.85, shade: ['#b88e14', '#e4bc34', '#f4dc78'], fin: '#f0cc46', tail: '#f1d052', ray: '#a07c10', marks: [spots('#fff0a0', 50, 0.38, 0.85, -0.08, 0.08, 0.009, 0.3)], finMarks: [], shimmerRgb: '255,240,170', iris: ['#6a4a1a', '#1a1008'] }),
  cambodian: look({ fm: 0.85, shade: ['#c29a8c', '#e4c0b0', '#f2dccf'], fin: '#c8202e', tail: '#c9222f', ray: '#7a0e18', pelvic: '#c8202e', marks: [], finMarks: [], shimmerRgb: '255,225,210', iris: ['#5a2a2a', '#140808'] }),
  cellophane: look({ fm: 0.85, shade: ['#cba8a0', '#e8cdc4', '#f6e6df'], fin: '#f0dcd6', tail: '#f1ddd8', ray: '#c8aaa4', tailA: 0.6, marks: [], finMarks: [], shimmerRgb: '255,235,230', iris: ['#4a3a3a', '#0c0808'] }),
  dragon: look({ fm: 0.85, shade: ['#8c1422', '#c4303c', '#e07880'], fin: '#c02636', ray: '#5e0a16', edge: '#f2e8e4', marks: [spots('#f2e6e0', 190, 0.38, 0.9, -0.1, 0.09, 0.0125, 0.6), spots('#ffffff', 60, 0.4, 0.88, -0.09, 0.08, 0.008, 0.5)], finMarks: [], shimmerRgb: '255,240,235', iris: ['#6a2a2a', '#1a0808'] }),
  butterfly: look({ fm: 0.85, shade: ['#0c1646', '#1a3a98', '#3560c8'], fin: '#1e3c9e', ray: '#0c1640', marks: [spots('#78b0f0', 60, 0.38, 0.85, -0.09, 0.09, 0.01, 0.35)], finMarks: [band(0, 0.16, -0.5, 0.5, '#f0f2f4', 0.92, 0.07)], shimmerRgb: '150,190,255', iris: ['#3a4a6a', '#0a0a18'] }),
  copper: look({ fm: 0.85, shade: ['#5a3010', '#a8641e', '#d8a050'], fin: '#b4501c', ray: '#5a2208', marks: [spots('#f0c070', 90, 0.38, 0.88, -0.09, 0.09, 0.011, 0.45)], finMarks: [], shimmerRgb: '255,215,140', iris: ['#7a4a1a', '#1a0c04'] }),
};

// betta fin forms: tail type + the dorsal / anal that go with it
const bettaT: Record<string, Patch> = {
  halfmoon: fins({ tail: { type: 'half', h: 0.4 }, dorsalH: 1.25, analH: 1.2, dorsalLen: 1.1 }),
  hmpk: fins({ tail: { type: 'half', h: 0.27 }, dorsalH: 0.75, analH: 0.7, analLen: 0.8, pelvic: 0.9 }),
  plakat: fins({ tail: { type: 'round', h: 0.19 }, dorsalH: 0.6, analH: 0.5, analLen: 0.75, dorsalLen: 0.8, pelvic: 0.8 }),
  crowntail: fins({ tail: { type: 'crown', h: 0.36 }, dorsalH: 0.9, analH: 1.0 }),
  delta: fins({ tail: { type: 'delta', h: 0.33 } }),
  spade: fins({ tail: { type: 'spade', h: 0.33 } }),
  doubletail: fins({ tail: { type: 'double', h: 0.3 }, dorsalH: 1.35, dorsalLen: 1.3 }),
  dumbo: fins({ pec: 2.1 }),
};

// ---------- guppy (male: fancy tail and gonopodium; the female keeps her plain body with a coloured tail)
const gDelta = { type: 'delta' as const, h: 0.22 };
const guppyC: Record<string, Patch> = {
  'full-red': look({ shade: ['#7a1218', '#b8202a', '#d8524e'], fin: '#c4222c', tail: '#c8222c', dorsal: '#c4222c', fm: 0.5, marks: [], finMarks: [spots('#e8504a', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.25)], iris: ['#8a3a30', '#2a0c08'], fmarks: undefined }),
  'japan-blue': look({ shade: ['#142a58', '#2c5ca8', '#5a8cc8'], fin: '#2a58b4', tail: '#2c5eb8', dorsal: '#2c5eb8', fm: 0.45, marks: [spots('#8ab8f0', 36, 0.45, 0.95, -0.05, 0.06, 0.012, 0.3)], finMarks: [spots('#7aa8e8', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.25)], shimmerRgb: '150,195,255' }),
  'moscow-blue': look({ shade: ['#0c1844', '#183c98', '#3868c0'], fin: '#1a3ca0', tail: '#1c40a8', dorsal: '#1a3ca0', fm: 0.45, marks: [spots('#6a9ee8', 36, 0.45, 0.95, -0.05, 0.06, 0.012, 0.3)], finMarks: [spots('#4a7ad0', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.25)], shimmerRgb: '130,175,255', iris: ['#3a4a6a', '#0a0a18'] }),
  'moscow-green': look({ shade: ['#0c3a20', '#1a7a44', '#3cb070'], fin: '#1c8a4c', tail: '#1e8e50', dorsal: '#1c8a4c', fm: 0.45, marks: [spots('#78e0a0', 36, 0.45, 0.95, -0.05, 0.06, 0.012, 0.3)], finMarks: [spots('#4ac07a', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.25)], shimmerRgb: '150,255,190' }),
  'moscow-purple': look({ shade: ['#2a0c4a', '#5a24a0', '#8c58c8'], fin: '#5a28a4', tail: '#5e2aa8', dorsal: '#5a28a4', fm: 0.45, marks: [spots('#b090f0', 36, 0.45, 0.95, -0.05, 0.06, 0.012, 0.3)], finMarks: [spots('#8a60d0', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.25)], shimmerRgb: '200,170,255' }),
  'black-moscow': look({ shade: ['#08080c', '#14141c', '#26262e'], fin: '#101018', tail: '#12121a', dorsal: '#101018', fm: 0.55, marks: [spots('#3a3a50', 30, 0.45, 0.95, -0.05, 0.06, 0.012, 0.3)], finMarks: [band(0.02, 0.38, 0.03, 0.26, '#d8782a', 0.6, 0.07), band(0.02, 0.3, -0.2, -0.02, '#b8b090', 0.3, 0.07)], shimmerRgb: '130,140,190', iris: ['#4a4a52', '#0a0a0c'] }),
  tuxedo: look({ shade: ['#2a2a30', '#6a6c70', '#a8aab0'], fin: '#2a64b8', tail: '#2a64b8', dorsal: '#2a64b8', fm: 0.4,
    marks: [{ k: 'band', u0: 0.38, u1: 0.62, v0: -0.12, v1: 0.12, c: '#0a0a0e', a: 0.97, f: 0.05 }, { k: 'band', u0: 0.4, u1: 0.5, v0: -0.12, v1: 0.12, c: '#0a0a0e', a: 0.9, f: 0.03 }, { k: 'blob', u: 0.86, v: 0, ru: 0.2, rv: 0.1, c: '#c4d0dc', a: 0.55 }], finMarks: [spots('#1a3a8a', 24, 0.04, 0.4, -0.24, 0.24, 0.012, 0.3)] }),
  cobra: look({ shade: ['#8a6a2a', '#d8b050', '#f0dc94'], fin: '#e8a830', tail: '#e8a830', dorsal: '#e8a830', fm: 0.4,
    marks: [...Array.from({ length: 5 }, (_, i) => band(0.36 + i * 0.12, 0.42 + i * 0.12, -0.1, 0.1, '#3a2a10', 0.55, 0.012)), spots('#6a4a18', 70, 0.35, 0.95, -0.08, 0.08, 0.009, 0.5)], finMarks: [...[-0.2, -0.1, 0, 0.1, 0.2].map(v => band(0, 0.36, v - 0.012, v + 0.012, '#8a3a10', 0.7, 0.01)), spots('#5a2a10', 30, 0.04, 0.38, -0.24, 0.24, 0.012, 0.5)], iris: ['#d8b070', '#3a2a10'] }),
  gold: look({ shade: ['#9a7a2a', '#e0bc50', '#f6e394'], fin: '#f0d060', tail: '#eecc54', dorsal: '#f0d060', fm: 0.5, marks: [], finMarks: [], shimmerRgb: '255,235,170', iris: ['#e0c880', '#5a3a14'] }),
  white: look({ shade: ['#b4bac2', '#e4e8ee', '#f6f8fa'], fin: '#f0f3f6', tail: '#eff2f5', dorsal: '#f0f3f6', fm: 0.55, marks: [], finMarks: [], shimmerRgb: '255,255,255', iris: ['#e8d8d0', '#5a3030'] }),
  'blue-grass': look({ shade: ['#1a3a68', '#3a7ab8', '#78a8d0'], fin: '#3a7ac0', tail: '#4284c8', dorsal: '#3a7ac0', fm: 0.4, marks: [spots('#9ac8f4', 120, 0.35, 0.95, -0.08, 0.08, 0.009, 0.45)], finMarks: [spots('#9ac8f4', 90, 0.04, 0.38, -0.24, 0.24, 0.008, 0.4)], shimmerRgb: '170,210,255' }),
  leopard: look({ shade: ['#7a6a34', '#c8b068', '#e8d8a0'], fin: '#e0a840', tail: '#e4ac44', dorsal: '#e0a840', fm: 0.4, marks: [spots('#2a2418', 36, 0.38, 0.95, -0.08, 0.08, 0.015, 0.7)], finMarks: [spots('#241c10', 55, 0.04, 0.4, -0.25, 0.25, 0.022, 0.8)], iris: ['#d8b070', '#3a2a10'] }),
};
const guppyT: Record<string, Patch> = {
  delta: fins({ tail: gDelta, dorsalH: 1.5 }),
  fan: fins({ tail: { type: 'round', h: 0.2 }, dorsalH: 1.3 }),
  veil: fins({ tail: { type: 'veil', h: 0.3 }, dorsalH: 2 }),
  lyre: fins({ tail: { type: 'lyre', h: 0.24, cut: 0.45 }, dorsalH: 1.5 }),
  spade: fins({ tail: { type: 'spade', h: 0.22 }, dorsalH: 1.3 }),
  round: fins({ tail: { type: 'round', h: 0.16 } }),
  pin: fins({ tail: { type: 'pin', h: 0.22 } }),
  doublesword: fins({ tail: { type: 'double', h: 0.22 }, dorsalH: 1.5 }),
  dumbo: fins({ pec: 2.4, tail: { type: 'delta', h: 0.2 }, dorsalH: 1.4 }),
};

// ---------- platy / molly / swordtail (males: gonopodium; females are paler)
const platyC: Record<string, Patch> = {
  red: look({ shade: ['#7a0e10', '#c01a1c', '#e05a50'], fin: '#c81e20', fm: 0.7, iris: ['#cfb890', '#4a3e2c'] }),
  sunburst: look({ shade: ['#b82a1a', '#ea6a24', '#f6c050'], fin: '#f0a838', tail: '#f2b440', fm: 0.7, marks: [{ k: 'band', u0: 0.12, u1: 0.5, v0: -0.2, v1: 0.2, c: '#f8d256', a: 0.85, f: 0.12 }], fmarks: [{ k: 'band', u0: 0.12, u1: 0.5, v0: -0.2, v1: 0.2, c: '#f8d256', a: 0.7, f: 0.12 }] }),
  gold: look({ shade: ['#b88a1a', '#ecc030', '#f8e48a'], fin: '#f2cc4a', fm: 0.8, marks: [], fmarks: [] }),
  mickey: look({ shade: ['#b84a28', '#e87038', '#f2a878'], fin: '#e88048', fm: 0.7, marks: [{ k: 'blob', u: 0.27, v: -0.045, ru: 0.045, rv: 0.04, c: '#101012', a: 0.95 }, { k: 'blob', u: 0.27, v: 0.045, ru: 0.045, rv: 0.04, c: '#101012', a: 0.95 }, { k: 'blob', u: 0.2, v: 0, ru: 0.045, rv: 0.05, c: '#101012', a: 0.95 }], fmarks: [{ k: 'blob', u: 0.27, v: -0.045, ru: 0.045, rv: 0.04, c: '#101012', a: 0.9 }, { k: 'blob', u: 0.27, v: 0.045, ru: 0.045, rv: 0.04, c: '#101012', a: 0.9 }, { k: 'blob', u: 0.2, v: 0, ru: 0.045, rv: 0.05, c: '#101012', a: 0.9 }] }),
  tuxedo: look({ shade: ['#2a1a1a', '#6a3a2a', '#d8785a'], fin: '#20202a', tail: '#1c1c24', fm: 0.7, marks: [{ k: 'band', u0: 0.12, u1: 0.62, v0: -0.2, v1: 0.2, c: '#0c0c10', a: 0.97, f: 0.1 }, { k: 'band', u0: 0.3, u1: 0.6, v0: 0.0, v1: 0.2, c: '#0c0c10', a: 0.9, f: 0.1 }], fmarks: [{ k: 'band', u0: 0.12, u1: 0.62, v0: -0.2, v1: 0.2, c: '#0c0c10', a: 0.95, f: 0.1 }] }),
  blue: look({ shade: ['#1a3a58', '#3a7aa8', '#8cb8d0'], fin: '#4a88b0', fm: 0.7, marks: [spots('#a8d8f0', 60, 0.3, 0.95, -0.12, 0.1, 0.012, 0.35)], fmarks: [] }),
  calico: look({ shade: ['#a85a2a', '#e4a060', '#f6dcb0'], fin: '#ecc08a', fm: 0.7, marks: [...blobs(21, 8, ['#e4521e', '#f6f0e4'], 0.3, 0.95, -0.14, 0.12, 0.03, 0.07, 0.8), spots('#101012', 40, 0.18, 0.7, -0.16, 0.14, 0.014, 0.85)], fmarks: [...blobs(22, 6, ['#e4521e', '#f6f0e4'], 0.3, 0.95, -0.14, 0.12, 0.03, 0.07, 0.8), spots('#101012', 30, 0.18, 0.7, -0.16, 0.14, 0.014, 0.8)] }),
  'salt-pepper': look({ shade: ['#6a6a58', '#a8a890', '#d4d2bc'], fin: '#b8b4a0', fm: 0.7, marks: [spots('#2a2a24', 90, 0.15, 0.95, -0.16, 0.14, 0.01, 0.55)], fmarks: [spots('#2a2a24', 80, 0.15, 0.95, -0.16, 0.14, 0.01, 0.5)] }),
};
const platyT: Record<string, Patch> = { hifin: fins({ dorsalH: 2.4, dorsalLen: 0.85 }) };

const mollyC: Record<string, Patch> = {
  dalmatian: look({ shade: ['#8c8e94', '#e6e6e4', '#f6f6f4'], fin: '#e8e8e6', tail: '#e8e8e6', fm: 1, marks: [spots('#0e0e12', 70, 0.2, 0.95, -0.15, 0.14, 0.022, 0.92), spots('#0e0e12', 40, 0.2, 0.95, -0.15, 0.14, 0.012, 0.9)], fmarks: [spots('#0e0e12', 70, 0.2, 0.95, -0.15, 0.14, 0.022, 0.92), spots('#0e0e12', 40, 0.2, 0.95, -0.15, 0.14, 0.012, 0.9)], iris: ['#9a8a6a', '#2a2418'] }),
  gold: look({ shade: ['#9a7a2a', '#dcb64a', '#f2e090'], fin: '#e8c458', fm: 1, marks: [spots('#6a4a14', 60, 0.2, 0.95, -0.14, 0.13, 0.009, 0.35)], fmarks: [spots('#6a4a14', 60, 0.2, 0.95, -0.14, 0.13, 0.009, 0.35)] }),
  silver: look({ shade: ['#8a9096', '#cdd2d6', '#eef0f2'], fin: '#d8dce0', fm: 1, marks: [], fmarks: [], shimmerRgb: '255,255,255', shimmer: 0.4 }),
  orange: look({ shade: ['#b8501a', '#e88a34', '#f6c47a'], fin: '#ec9a48', fm: 1, marks: [spots('#2a1a10', 30, 0.2, 0.95, -0.14, 0.13, 0.012, 0.5)], fmarks: [spots('#2a1a10', 30, 0.2, 0.95, -0.14, 0.13, 0.012, 0.5)] }),
  chocolate: look({ shade: ['#2a160e', '#5a3420', '#8a6048'], fin: '#5a3a28', fm: 1, marks: [], fmarks: [] }),
};
const mollyT: Record<string, Patch> = { sailfin: fins({ dorsalH: 2.3, dorsalLen: 1.15 }), lyre: fins({ tail: { type: 'lyre', h: 0.26, cut: 0.5 } }) };

const swordC: Record<string, Patch> = {
  green: look({ shade: ['#3c5a2a', '#6a9a48', '#b8c890'], fin: '#7aa458', tail: '#7aa458', fm: 0.9, marks: [band(0.25, 0.9, -0.012, 0.012, '#a02a20', 0.8, 0.008)], fmarks: [] , finMarks: [band(0, 0.33, 0.062, 0.09, '#1c1c1c', 0.85, 0.006)]}),
  wag: look({ shade: ['#a8201a', '#d03a2c', '#e8806a'], fin: '#1a1a1e', tail: '#1c1c20', dorsal: '#1a1a1e', fm: 0.8, finMarks: [] }),
  tuxedo: look({ shade: ['#1a1a1e', '#46464c', '#c86a58'], fin: '#1c1c20', tail: '#c83a2a', fm: 0.7, marks: [{ k: 'band', u0: 0.3, u1: 0.72, v0: -0.1, v1: 0.1, c: '#0a0a0e', a: 0.97, f: 0.05 }], finMarks: [] }),
  pineapple: look({ shade: ['#b88a1e', '#e8b838', '#f6dc88'], fin: '#2a2a20', tail: '#c8a030', dorsal: '#2a2a20', fm: 0.8, marks: [spots('#3a3010', 60, 0.25, 0.9, -0.08, 0.08, 0.008, 0.3)], finMarks: [band(0, 0.33, 0.062, 0.09, '#1c1c1c', 0.85, 0.006)] }),
  lemon: look({ shade: ['#c8a420', '#f0d040', '#faeaa0'], fin: '#f4dc60', tail: '#f2d850', fm: 0.9, marks: [], finMarks: [] }),
  black: look({ shade: ['#0a0a0e', '#1c1c22', '#34343c'], fin: '#16161c', tail: '#14141a', fm: 0.9, marks: [], finMarks: [] }),
};
const swordT: Record<string, Patch> = { hifin: fins({ dorsalH: 3, dorsalLen: 1.3 }), lyre: fins({ tail: { type: 'lyre', h: 0.13, cut: 0.5 } }) };

// ---------- angelfish
const angelC: Record<string, Patch> = {
  zebra: look({ shade: ['#8c8a80', '#bab8ac', '#e0ddd2'], marks: [{ k: 'bars', us: [0.935, 0.865, 0.78, 0.645, 0.55, 0.43, 0.33], w: 0.04, c: '#26262a', a: 0.9 }, { k: 'bars', us: [0.235], w: 0.06, c: '#26262a', a: 0.5 }], finMarks: [{ k: 'bars', us: [0.7, 0.58, 0.46, 0.34, 0.22], w: 0.035, c: '#26262a', a: 0.75 }] }),
  marble: look({ shade: ['#8a887c', '#b8b6aa', '#e0ddd2'], marks: [...blobs(31, 12, ['#26262a', '#d8d4c4'], 0.3, 0.95, -0.25, 0.25, 0.04, 0.1, 0.8), { k: 'bars', us: [0.865], w: 0.05, c: '#26262a', a: 0.9 }], finMarks: blobs(32, 8, ['#26262a'], 0.1, 0.9, -0.2, 0.3, 0.03, 0.07, 0.7) }),
  gold: look({ shade: ['#c4a24a', '#e6cc78', '#f6ecc0'], fin: '#ece0b4', tail: '#ece0b4', pelvic: '#f4eac8', marks: [{ k: 'blob', u: 0.86, v: -0.15, ru: 0.1, rv: 0.08, c: '#e0902a', a: 0.7 }], finMarks: [], iris: ['#e08a3a', '#5b2a1c'] }),
  koi: look({ shade: ['#d0c8b8', '#ebe5d8', '#f8f4ec'], fin: '#f2ece0', tail: '#f2ece0', marks: [{ k: 'blob', u: 0.8, v: -0.2, ru: 0.12, rv: 0.1, c: '#e8601e', a: 0.92 }, { k: 'blob', u: 0.55, v: -0.12, ru: 0.12, rv: 0.1, c: '#e8601e', a: 0.9 }, { k: 'blob', u: 0.62, v: 0.1, ru: 0.08, rv: 0.07, c: '#f0b848', a: 0.85 }, { k: 'blob', u: 0.4, v: -0.04, ru: 0.06, rv: 0.06, c: '#14141a', a: 0.9 }], finMarks: [], iris: ['#d8683a', '#5b2a1c'] }),
  black: look({ shade: ['#0c0c10', '#1c1c22', '#34343c'], fin: '#14141a', tail: '#16161c', pelvic: '#1e1e26', marks: [], finMarks: [{ k: 'bars', us: [0.645, 0.43], w: 0.05, c: '#34343c', a: 0.4 }], shimmerRgb: '140,150,190', iris: ['#c8673f', '#2b1208'] }),
  platinum: look({ shade: ['#c0c4c6', '#e6e8e8', '#f8f9f9'], fin: '#f0f1f2', tail: '#eff0f1', pelvic: '#f4f4f4', marks: [], finMarks: [], iris: ['#d8683a', '#5b2a1c'] }),
  smokey: look({ shade: ['#6a6a66', '#a29e92', '#d8d2c4'], fin: '#bcb8ac', tail: '#bcb8ac', marks: [{ k: 'blob', u: 0.6, v: 0.0, ru: 0.28, rv: 0.2, c: '#3a3a3c', a: 0.5 }, { k: 'bars', us: [0.865, 0.645, 0.43], w: 0.05, c: '#26262a', a: 0.7 }], finMarks: [] }),
  blushing: look({ shade: ['#b8b4a8', '#dcd8cc', '#f2eee4'], fin: '#e8e2d6', tail: '#e8e2d6', marks: [{ k: 'blob', u: 0.88, v: 0.05, ru: 0.1, rv: 0.12, c: '#e87a78', a: 0.5 }, { k: 'blob', u: 0.6, v: -0.06, ru: 0.22, rv: 0.2, c: '#ffffff', a: 0.14 }], finMarks: [] }),
};
const angelT: Record<string, Patch> = { veil: (p) => ({ ...p, tail: { ...p.tail, type: 'veil', h: 0.38 }, dorsal: p.dorsal && { ...p.dorsal, h: (p.dorsal as { h: number }).h * 1.25 } as typeof p.dorsal, anal: p.anal && { ...p.anal, h: (p.anal as { h: number }).h * 1.3 } as typeof p.anal, pelvic: p.pelvic && { ...p.pelvic, len: p.pelvic.len * 1.3 } }) };

// ---------- discus
const eyeBar = (c = '#10202a', a = 0.55): Marks[number] => ({ k: 'bars', us: [0.925], w: 0.026, c, a });
const net = (c: string, a: number, seed: number, o: { lv?: number; w?: number; scale?: number; stretch?: number; rim?: [number, number]; core?: number; above?: boolean } = {}): Marks[number] => ({ k: 'maze', u0: 0.13, u1: 1, v0: -0.42, v1: 0.42, c, a, scale: o.scale ?? 0.07, w: o.w ?? 0.26, lv: o.lv, seed, stretch: o.stretch ?? 1.5, rim: o.rim, core: o.core, above: o.above });
const fnet = (c: string, a: number, o: { lv?: number; w?: number } = {}): Marks[number] => ({ k: 'maze', u0: 0, u1: 1, v0: -0.6, v1: 0.6, c, a, scale: 0.05, w: o.w ?? 0.42, lv: o.lv, seed: 31, stretch: 1.4 });
const discusC: Record<string, Patch> = {
  'red-turquoise': look({ shade: ['#8a2a18', '#d4502c', '#ee9468'], fin: '#c8502a', tail: '#b46a4c', marks: [net('#2f9ab8', 0.85, 41, { w: 0.14, scale: 0.075, stretch: 2.2, rim: [0.25, 0.8], core: 0.15 }), net('#6adbe0', 0.9, 41, { w: 0.1, lv: 0.4, scale: 0.075, stretch: 2.2, rim: [0.25, 0.8], core: 0.15 }), eyeBar('#3a1008', 0.5)], finMarks: [fnet('#5a2218', 0.7), fnet('#58d4dc', 0.8, { lv: 0.5, w: 0.2 })], iris: ['#f2552a', '#a82010'] }),
  'pigeon-blood': look({ shade: ['#e07c36', '#f4aa62', '#fadcae'], fin: '#e8884a', tail: '#e6a070', marks: [{ k: 'blob', u: 0.55, v: 0.15, ru: 0.35, rv: 0.25, c: '#fff2dc', a: 0.5 }, { k: 'blob', u: 0.8, v: -0.2, ru: 0.15, rv: 0.12, c: '#e05a28', a: 0.45 }, net('#f0e0c8', 0.55, 43, { w: 0.2, stretch: 1.8, rim: [0.1, 0.7], core: 0.3 }), eyeBar('#8a3014', 0.35)], finMarks: [fnet('#f2c898', 0.5, { w: 0.2 })], iris: ['#e8281a', '#7a0c08'] }),
  snakeskin: look({ shade: ['#5a4a30', '#bc9c5c', '#e0cc94'], fin: '#a88858', tail: '#9a8058', marks: [net('#2a1e12', 0.8, 47, { scale: 0.04, w: 0.3, stretch: 1.2 }), net('#f0e2b0', 0.8, 47, { scale: 0.04, w: 0.2, lv: 0.55, stretch: 1.2 }), eyeBar('#2a1e12', 0.5)], finMarks: [fnet('#2a1e12', 0.7), fnet('#e8d8a0', 0.7, { lv: 0.5, w: 0.2 })] }),
  cobalt: look({ shade: ['#142a72', '#2a58bc', '#5a90dc'], fin: '#2c58b8', tail: '#4468b0', marks: [net('#0a0e30', 0.85, 53, { rim: [0.65, 0.95] }), net('#6aa8f6', 0.9, 53, { lv: 0.5, w: 0.2, rim: [0.65, 0.95] }), eyeBar('#0a1030', 0.6)], finMarks: [fnet('#0a1030', 0.8), fnet('#62a0f0', 0.9, { lv: 0.5, w: 0.2 })], shimmerRgb: '125,180,255' }),
  checkerboard: look({ shade: ['#9ab8c0', '#d8eaee', '#eaf4f4'], fin: '#a85a48', tail: '#8a6a60', marks: [net('#e04a1a', 0.95, 59, { scale: 0.068, w: 0.5, stretch: 1.5 }), { k: 'blob', u: 0.9, v: 0.04, ru: 0.12, rv: 0.2, c: '#ee6a28', a: 0.95 }, { k: 'maze', u0: 0.82, u1: 1, v0: -0.22, v1: 0.26, c: '#fff0e0', a: 0.85, scale: 0.034, w: 0.14, seed: 77, stretch: 0.45 }, eyeBar('#802010', 0.4)], finMarks: [fnet('#7a1a14', 0.8, { w: 0.3 }), fnet('#86e0e8', 0.75, { lv: 0.55, w: 0.2 })], iris: ['#e8281a', '#7a0c08'] }),
  red: look({ shade: ['#6e1010', '#b81e20', '#de5c52'], fin: '#c01e20', tail: '#a84048', marks: [net('#3a0c0c', 0.3, 61, { w: 0.2, rim: [0.7, 0.97] }), eyeBar('#3a0c0c', 0.3)], finMarks: [fnet('#3a0c0c', 0.35, { w: 0.2 })], iris: ['#e8281a', '#6a0808'] }),
  golden: look({ shade: ['#b88c20', '#f0c636', '#f8e88c'], fin: '#f0c850', tail: '#e8cc70', marks: [{ k: 'blob', u: 0.5, v: 0.1, ru: 0.35, rv: 0.25, c: '#fff6c8', a: 0.45 }, eyeBar('#6a4a10', 0.3)], finMarks: [], iris: ['#e8381a', '#7a0c08'] }),
  white: look({ shade: ['#c4c8cc', '#e8ebee', '#f8f9fa'], fin: '#e4e8ea', tail: '#e2e6e8', marks: [net('#2a2a30', 0.75, 67, { lv: 1.05, w: 0.5, scale: 0.1, stretch: 1.1, above: true }), eyeBar('#2a2a30', 0.3)], finMarks: [], iris: ['#e8281a', '#7a0c08'] }),
  brown: look({ shade: ['#38281a', '#6c4c30', '#a68866'], fin: '#6a5238', tail: '#7a6248', marks: [{ k: 'bars', us: [0.925, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22], w: 0.03, c: '#1a1210', a: 0.55 }, net('#c8a878', 0.25, 71, { scale: 0.06, w: 0.18, rim: [0.2, 0.9] })], finMarks: [fnet('#2a1c10', 0.5, { w: 0.2 })], shimmerRgb: '255,225,180', iris: ['#d85a2a', '#6a1a0c'] }),
};

// ---------- zebra danio / tiger barb: GloFish colours (fluorescent, no stripes) and others
const glo = (c: [string, string, string], f: string, shimmer: string): Look => ({ shade: c, fin: f, tail: f, dorsal: f, anal: f, pelvic: f, marks: [{ k: 'band', u0: 0.2, u1: 0.9, v0: -0.01, v1: 0.01, c: mix(c[1], '#ffffff', 0.35), a: 0.45, f: 0.01 }], finMarks: [], shimmerRgb: shimmer, shimmer: 0.6, iris: ['#2a2a2a', '#0a0a0a'] });
const danioC: Record<string, Patch> = {
  'glo-red': look(glo(['#8a0c28', '#e02050', '#f06a8a'], '#e83060', '255,170,190')),
  'glo-green': look(glo(['#0c7a1a', '#40e03a', '#a0f890'], '#58f050', '200,255,170')),
  'glo-orange': look(glo(['#b84a08', '#ff8a1c', '#ffc070'], '#ff9a2c', '255,215,150')),
  'glo-blue': look(glo(['#0a2a9a', '#2a6aff', '#8ab0ff'], '#3a78ff', '170,200',)),
  'glo-purple': look(glo(['#4a1a9a', '#8a40ff', '#c09aff'], '#9650ff', '210,180,255')),
  leopard: look({ shade: ['#6a6038', '#c8b878', '#e8dcb0'], marks: [spots('#241c10', 90, 0.17, 0.93, -0.07, 0.07, 0.012, 0.8)], finMarks: [spots('#241c10', 20, 0, 0.3, -0.2, 0.2, 0.01, 0.6)] }),
  gold: look({ shade: ['#a88a30', '#e6c860', '#f6eab4'], fin: '#f0dc90', tail: '#ecd682', marks: [], finMarks: [], shimmerRgb: '255,235,170' }),
};
const danioT: Record<string, Patch> = { longfin: fins({ tail: { type: 'veil', h: 0.2 }, dorsalH: 1.5, analH: 1.6, analLen: 1.1 }) };
const gloBarb = (c: [string, string, string], f: string, s: string): Look => ({ shade: c, fin: f, tail: f, dorsal: f, anal: f, pelvic: f, edge: f, marks: [], finMarks: [], shimmerRgb: s, shimmer: 0.6, iris: ['#2a2a2a', '#0a0a0a'] });
const barbC: Record<string, Patch> = {
  green: look({ shade: ['#2a4a1a', '#5a8a3a', '#a0b878'], fin: '#6a9a48', tail: '#7aa458', pelvic: '#c4442e', marks: [{ k: 'bars', us: [0.9, 0.67, 0.45, 0.24], w: 0.06, c: '#101810', a: 0.85 }], shimmerRgb: '190,255,160' }),
  'glo-red': look(gloBarb(['#8a0c28', '#e02050', '#f06a8a'], '#e83060', '255,170,190')),
  'glo-green': look(gloBarb(['#0c7a1a', '#40e03a', '#a0f890'], '#58f050', '200,255,170')),
  'glo-orange': look(gloBarb(['#b84a08', '#ff8a1c', '#ffc070'], '#ff9a2c', '255,215,150')),
  'glo-purple': look(gloBarb(['#4a1a9a', '#8a40ff', '#c09aff'], '#9650ff', '210,180,255')),
};

// ---------- black skirt tetra: GloFish colours (no bars; body, skirt and fins glow in one colour) and the sold plain variants
const gloTetra = (c: [string, string, string], f: string, s: string): Look => ({ shade: c, fin: f, tail: f, dorsal: f, anal: f, pelvic: f, tailA: 0.8, marks: [], finMarks: [], shimmerRgb: s, shimmer: 0.6, iris: ['#2a2a2a', '#0a0a0a'] });
const skirtC: Record<string, Patch> = {
  'glo-red': look(gloTetra(['#8a0c28', '#e02050', '#f06a8a'], '#e83060', '255,170,190')),
  'glo-green': look(gloTetra(['#0c7a1a', '#40e03a', '#a0f890'], '#58f050', '200,255,170')),
  'glo-orange': look(gloTetra(['#b84a08', '#ff8a1c', '#ffc070'], '#ff9a2c', '255,215,150')),
  'glo-blue': look(gloTetra(['#0a2a9a', '#2a6aff', '#8ab0ff'], '#3a78ff', '170,200,255')),
  'glo-purple': look(gloTetra(['#4a1a9a', '#8a40ff', '#c09aff'], '#9650ff', '210,180,255')),
  'glo-pink': look(gloTetra(['#a02a6a', '#ff5ab0', '#ffb0d8'], '#ff6ab8', '255,200,230')),
  white: look({ shade: ['#c8cacc', '#e8eaea', '#f8f8f8'], fin: '#eceded', tail: '#e6e8e8', dorsal: '#eceded', anal: '#e8eaea', pelvic: '#eceded', marks: [{ k: 'bars', us: [0.865, 0.78], w: 0.035, c: '#d8c8c8', a: 0.5 }], finMarks: [], iris: ['#e8b8b8', '#7a2a30'] }),
  gold: look({ shade: ['#a0803a', '#d8bc6a', '#f2e4ae'], fin: '#e8d088', tail: '#e6cc80', dorsal: '#e8d088', anal: '#e6cc7c', pelvic: '#e8d088', marks: [{ k: 'bars', us: [0.865, 0.78], w: 0.035, c: '#7a5a1c', a: 0.6 }], finMarks: [] }),
};
const skirtT: Record<string, Patch> = { longfin: fins({ tail: { type: 'veil', h: 0.24 }, dorsalH: 1.5, analH: 1.5, analLen: 1.1 }) };

// ---------- goldfish
const gfC: Record<string, Patch> = {
  red: look({ shade: ['#b8200c', '#dc3a14', '#f0805a'], fin: '#e04a1c', tail: '#e04a1c', iris: ['#2a2420', '#0a0806'] }),
  sarasa: look({ shade: ['#c8280e', '#f2ede4', '#f8f4ee'], fin: '#f4eee6', tail: '#f4eee6', marks: [{ k: 'blob', u: 0.75, v: -0.18, ru: 0.22, rv: 0.12, c: '#dc2e12', a: 0.95 }, { k: 'blob', u: 0.45, v: -0.2, ru: 0.12, rv: 0.1, c: '#dc2e12', a: 0.9 }, { k: 'blob', u: 0.9, v: 0, ru: 0.1, rv: 0.12, c: '#dc2e12', a: 0.9 }] }),
  calico: look({ shade: ['#c8d0d8', '#f2f0ec', '#fbf9f6'], fin: '#f4ece4', tail: '#f4ece4', marks: [...blobs(41, 9, ['#e8501a', '#14141c', '#2c5ab0', '#f0b030'], 0.2, 0.95, -0.22, 0.2, 0.025, 0.07, 0.85)] }),
  white: look({ shade: ['#c8ccd0', '#eef0f0', '#fafafa'], fin: '#f4f5f5', tail: '#f4f5f5', marks: [] }),
  black: look({ shade: ['#0a0a10', '#1c1c24', '#34343c'], fin: '#14141c', tail: '#16161e', marks: [], iris: ['#6a5a40', '#0a0806'] }),
  lemon: look({ shade: ['#c8a820', '#f0d444', '#faeaa0'], fin: '#f4dc64', tail: '#f4dc64', marks: [] }),
};

export const COLOUR_PATCH: Record<string, Record<string, Patch>> = { betta: bettaC, guppy: guppyC, platy: platyC, molly: mollyC, swordtail: swordC, angel: angelC, discus: discusC, danio: danioC, blackskirt: skirtC, tigerbarb: barbC, goldfish: gfC };
export const FIN_PATCH: Record<string, Record<string, Patch>> = { betta: bettaT, guppy: guppyT, platy: platyT, molly: mollyT, swordtail: swordT, angel: angelT, danio: danioT, blackskirt: skirtT };

/** The plan of a base plan in a colour form and / or fin form (fin shape first, then the paint). */
export function formPlan(species: string, base: Plan, female: boolean, form?: string, fin?: string): Plan {
  let q = base;
  const t = fin && FIN_PATCH[species]?.[fin], c = form && COLOUR_PATCH[species]?.[form];
  if (t) q = t(q, female);
  if (c) q = c(q, female);
  return q;
}
