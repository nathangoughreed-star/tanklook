// Custom substrate blend as an ordered list of grains (lane GB1, 2026-11-17; Nathan: "as many grains in the mix as we want").
// Pure (no DOM). Each entry { grain, color, share % }; the shares are whole numbers that sum to 100; 1 to MAX_GRAINS entries.
// Before GB1 a blend held two grains in six fields { grain, color, grain2, color2, share, mix } (share = the SECOND grain's %):
// `migrateBlend` reads those (saved tanks, shared links, recipes, examples) into a 1- or 2-entry list that draws identically.
import type { BlendGrain, Grain, SubstrateBlend } from './types';

export const MAX_GRAINS = 5;
export const BLEND_GRAIN_IDS: readonly Grain[] = ['mud', 'sand', 'gravel', 'pebble'];
const HEX = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLOR2 = '#6f6556';
/** Colours offered to a grain added to the mix, in turn. */
const ADD_COLORS = ['#6f6556', '#a89678', '#3f3a34', '#c9b9a0'];

/** SB1: named blends. 'clownpuke' = the popular multicolour aquarium gravel (mixed bright dyed gravel, every colour about equally common), evenly mixed. */
export const BLEND_PRESETS: Record<string, SubstrateBlend> = {
  clownpuke: { grains: [['#d42a2a', 20], ['#1f5fd1', 20], ['#f2c81f', 20], ['#2ea84a', 20], ['#f06aa8', 20]].map(([color, share]) => ({ grain: 'gravel' as Grain, color: color as string, share: share as number })), mix: 1, preset: 'clownpuke' },
  // grain editor examples (Nathan 2026-11-28): 1/2" blue glass marbles, rough angular mixed gravel, oval semi-smooth river stone
  marbles: { grains: [{ grain: 'pebble', color: '#2f6fd6', color2: '#1d4fa8', share: 100, size: [12.7, 12.7], sphere: 1, angular: 0, rough: 0, opacity: 0.35 }], mix: 1, preset: 'marbles' },
  crushed: { grains: [{ grain: 'gravel', color: '#8a8378', color2: '#4d4a46', share: 60, size: [3, 9], sphere: 0.45, angular: 0.9, rough: 0.85 }, { grain: 'gravel', color: '#b39a7a', color2: '#6e5a45', share: 40, size: [3, 8], sphere: 0.5, angular: 0.8, rough: 0.8 }], mix: 1, preset: 'crushed' },
  riverstone: { grains: [{ grain: 'pebble', color: '#9a8f80', color2: '#5e5750', share: 100, size: [12, 32], sphere: 0.55, angular: 0.05, rough: 0.4 }], mix: 1, preset: 'riverstone' },
};

/** A grain's shape and surface with the kind's defaults filled in (absent fields: scene/types.ts BlendGrain). */
export interface GrainShape { color2: string | null; size: [number, number] | null; sphere: number; angular: number; rough: number; opacity: number }
export const GRAIN_SHAPE_DEFAULT: Record<Grain, Omit<GrainShape, 'color2' | 'size'>> = {
  mud: { sphere: 0.8, angular: 0, rough: 0.7, opacity: 1 },
  sand: { sphere: 0.75, angular: 0.2, rough: 0.6, opacity: 1 },
  gravel: { sphere: 0.6, angular: 0.35, rough: 0.6, opacity: 1 },
  pebble: { sphere: 0.6, angular: 0.1, rough: 0.4, opacity: 1 },
};
/** Size range offered per kind (mm diameter) by the grain editor. */
export const GRAIN_SIZE_RANGE: Record<Grain, [number, number]> = { mud: [0.02, 0.1], sand: [0.1, 1], gravel: [1, 10], pebble: [5, 50] };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export function grainShape(g: BlendGrain): GrainShape {
  const d = GRAIN_SHAPE_DEFAULT[g.grain], [lo, hi] = GRAIN_SIZE_RANGE[g.grain];
  const size = g.size ? [Math.min(hi, Math.max(lo, Math.min(...g.size))), Math.min(hi, Math.max(lo, Math.max(...g.size)))] as [number, number] : null;
  return {
    color2: g.color2 ?? null, size, sphere: clamp01(g.sphere ?? d.sphere), angular: clamp01(g.angular ?? d.angular),
    rough: clamp01(g.rough ?? d.rough), opacity: Math.min(1, Math.max(0.2, g.opacity ?? d.opacity)),
  };
}
/** The grain-editor fields of a stored grain, checked; whatever is missing or bad is left out (= the kind's own). */
export function shapeFields(o: Record<string, unknown>): Partial<BlendGrain> {
  const out: Partial<BlendGrain> = {}, num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (typeof o.color2 === 'string' && HEX.test(o.color2)) out.color2 = o.color2.toLowerCase();
  if (Array.isArray(o.size) && o.size.length === 2 && o.size.every(num) && o.size.every(v => (v as number) > 0)) out.size = [Math.min(200, o.size[0] as number), Math.min(200, o.size[1] as number)];
  for (const k of ['sphere', 'angular', 'rough', 'opacity'] as const) if (num(o[k])) out[k] = clamp01(o[k] as number);
  return out;
}

/** The six-field constructor the presets and recipes were written in: `grain2` 'none' = one grain; `share` = the second grain's %. */
export function blendFrom(grain: Grain, color: string, grain2: Grain | 'none' = 'none', color2 = DEFAULT_COLOR2, share = 30, mix = 0.5): SubstrateBlend {
  if (grain2 === 'none') return { grains: [{ grain, color, share: 100 }], mix };
  const s = Math.round(Math.min(100, Math.max(0, share)));
  return { grains: [{ grain, color, share: 100 - s }, { grain: grain2, color: color2, share: s }], mix };
}

/** Whole-number shares summing to exactly `total` (100; largest-remainder rounding); all zero or invalid -> an even split. */
export function normalizeShares(gs: BlendGrain[], total = 100): BlendGrain[] {
  const raw = gs.map(g => (Number.isFinite(g.share) && g.share > 0 ? g.share : 0)), tot = raw.reduce((a, b) => a + b, 0);
  const want = tot > 0 ? raw.map(v => v * total / tot) : gs.map(() => total / gs.length), fl = want.map(Math.floor);
  let left = total - fl.reduce((a, b) => a + b, 0);
  want.map((v, i) => [v - fl[i], i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
  return gs.map((g, i) => ({ ...g, share: fl[i] }));
}

/** Read any stored blend: the list (`grains`) or the pre-GB1 six fields. `fallback` = the blend used for whatever is missing. */
export function migrateBlend(raw: unknown, fallback: SubstrateBlend): SubstrateBlend {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hex = (v: unknown, f: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : f);
  const pickG = (v: unknown, f: Grain) => (BLEND_GRAIN_IDS as readonly unknown[]).includes(v) ? v as Grain : f;
  const mix = typeof c.mix === 'number' && Number.isFinite(c.mix) ? Math.min(1, Math.max(0, c.mix)) : fallback.mix;
  if (Array.isArray(c.grains) && c.grains.length) {
    const gs: BlendGrain[] = c.grains.slice(0, MAX_GRAINS).map((e, i) => {
      const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>, f = fallback.grains[Math.min(i, fallback.grains.length - 1)];
      return { grain: pickG(o.grain, f.grain), color: hex(o.color, f.color), share: typeof o.share === 'number' ? o.share : 0, ...shapeFields(o) };
    });
    return { grains: normalizeShares(gs), mix, ...seedOf(c.seed), ...presetOf(c.preset) };
  }
  // the old fields: absent ones read as the fallback's; the old range of `share` was 5-95
  const f0 = fallback.grains[0], f1 = fallback.grains[1];
  const grain = pickG(c.grain, f0.grain), color = hex(c.color, f0.color);
  const g2 = c.grain2 === 'none' ? 'none' : BLEND_GRAIN_IDS.includes(c.grain2 as Grain) ? c.grain2 as Grain : f1 ? f1.grain : 'none';
  const share = typeof c.share === 'number' && Number.isFinite(c.share) ? Math.round(Math.min(95, Math.max(5, c.share))) : f1 ? f1.share : 30;
  const b = blendFrom(grain, color, g2, hex(c.color2, f1?.color ?? DEFAULT_COLOR2), share, mix);
  return { ...b, ...seedOf(c.seed) };
}

/** A stored preset name (letters only), or nothing. */
const presetOf = (v: unknown) => (typeof v === 'string' && /^[a-z]{1,24}$/.test(v) ? { preset: v } : {});
/** A stored shuffle seed (whole number 1 to 1e6), or nothing. */
const seedOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 1 ? { seed: Math.min(1e6, Math.round(v)) } : {});
/** Shuffle: the next seed, a different layout of the same grains, colours, shares and mix. */
export const nextBlendSeed = (b: SubstrateBlend) => ((b.seed ?? 0) * 7919 + 104729) % 999983 + 1;
/** Set one grain's share (0-100); the others are scaled to fill what is left (an even split if they were all 0). */
export function setShare(gs: BlendGrain[], i: number, v: number): BlendGrain[] {
  if (gs.length === 1) return [{ ...gs[0], share: 100 }];
  const s = Math.round(Math.min(100, Math.max(0, v))), rest = gs.filter((_, k) => k !== i), tot = rest.reduce((a, g) => a + g.share, 0);
  const scaled = normalizeShares(rest.map(g => ({ ...g, share: tot > 0 ? g.share : 1 })), 100 - s);
  let k = 0;
  return gs.map((g, j) => (j === i ? { ...g, share: s } : { ...g, share: scaled[k++].share }));
}
/** Add a grain at the end (up to MAX_GRAINS); it takes a fair share (100 / n) from the others. */
export function addGrain(gs: BlendGrain[]): BlendGrain[] {
  if (gs.length >= MAX_GRAINS) return gs;
  const used = new Set(gs.map(g => g.grain)), grain = BLEND_GRAIN_IDS.find(g => !used.has(g) && g !== 'mud') ?? 'gravel';
  const color = ADD_COLORS.find(c => !gs.some(g => g.color.toLowerCase() === c)) ?? ADD_COLORS[0];
  return setShare([...gs, { grain, color, share: 0 }], gs.length, Math.round(100 / (gs.length + 1)));
}
/** Remove grain `i` (at least one stays); its share goes to the others in proportion. */
export function removeGrain(gs: BlendGrain[], i: number): BlendGrain[] {
  if (gs.length <= 1 || i < 0 || i >= gs.length) return gs;
  return normalizeShares(gs.filter((_, k) => k !== i));
}

/**
 * The grains in the order the ground shader and the 3D stones treat them: [0] is the remainder (what the others leave),
 * [1..] each have their own local ratio. Two grains keep their order (as before GB1); with more, the largest share is the
 * remainder, so the others' ratios rarely add past 1.
 */
export function blendOrder(b: SubstrateBlend): BlendGrain[] {
  const gs = b.grains;
  if (gs.length <= 2) return gs;
  let m = 0; gs.forEach((g, i) => { if (g.share > gs[m].share) m = i; });
  return [gs[m], ...gs.filter((_, i) => i !== m)];
}
