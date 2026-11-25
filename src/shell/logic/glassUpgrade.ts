// Lane GC (R148): "Free: size". The glass and the minimum safety factor are locked and the size is free; when a pane drops under the minimum this
// offers the way back: thicker stock glass (the failing panes, or the whole tank, per the Mixed toggle) or a cheaper brace, each with its approx
// added cost. Pure; the slow brace search is passed in (bestBrace in tankEnvelope.ts), so this stays fast.
import { IN_MM, STOCK_METRIC, STOCK_US_PICK, type BraceSpec } from '../../scene/glassSolver';
import { checkTank, type TankCheck } from '../../scene/glassEnvelope';
import { MM2_PER_SQFT, priceSqFt, type GlassKind, type GlassPrices } from '../../scene/glassPrice';
import { baseOf, braceText, type SolveInputs } from './tankEnvelope';
import { glassText, type Units } from './tank';

/** Per-wall thickness (mm): front and back, the two ends, the bottom. */
export interface PaneThick { long: number; end: number; bottom: number }
export type Dims = { L: number; D: number; H: number };
export interface UpgradeOption { kind: 'glass' | 'brace'; label: string; sf: number; costUsd: number; panes: PaneThick; brace: BraceSpec | null; own: boolean }

const GROUPS: (keyof PaneThick)[] = ['long', 'end', 'bottom'];
const sqft = (mm2: number) => mm2 / MM2_PER_SQFT;
/** Glass area (sq ft) of each group: both long walls, both end walls, the bottom. */
export const areasOf = (T: Dims) => ({ long: sqft(2 * T.L * T.H), end: sqft(2 * T.D * T.H), bottom: sqft(T.L * T.D) });
/** The brace strips' area (sq ft): the perimeter ring plus the cross strips. */
export function braceArea(T: Dims, b: BraceSpec | null): number {
  if (!b) return 0;
  const ring = T.L * T.D - Math.max(0, T.L - 2 * b.width) * Math.max(0, T.D - 2 * b.width), cw = b.crossWidth ?? b.width;
  return sqft(ring + (b.cross ?? 0) * cw * Math.max(0, T.D - 2 * b.width));
}

const inputsOf = (p: PaneThick): SolveInputs => ({ glass: p.long, glassEnds: p.end, glassBottom: p.bottom, strip: 0.25 * IN_MM, stripWidth: 3 * IN_MM, depth: null });
/** One check of a tank at these panes and this brace (fully filled). */
export const checkAt = (T: Dims, rim: boolean, p: PaneThick, brace: BraceSpec | null, sf: number, bottom: 'full' | 'perimeter'): TankCheck =>
  checkTank(T.L, T.H, rim ? 'rimmed' : 'custom', { ...baseOf(inputsOf(p), sf, T.D, bottom, { mixed: true, bracing: 'custom', brace }), D: T.D });

/** Which wall groups are under the minimum (a bottom on a stand is matched to the walls and never fails; a wall-bending fail counts on both wall groups). */
export function failing(c: TankCheck, sf: number): (keyof PaneThick)[] {
  const f: (keyof PaneThick)[] = [];
  if (c.sf.front + 1e-9 < sf) f.push('long');
  if (c.sf.ends + 1e-9 < sf) f.push('end');
  if (c.sf.bottom != null && c.sf.bottom + 1e-9 < sf) f.push('bottom');
  if (!f.length && !c.ok && c.fits) f.push('long', 'end');
  return f;
}

/** Added cost (USD) of going from `a` to `b` on this tank, glass only: area x (new price - old price) per group. */
export function addedGlassCost(T: Dims, a: PaneThick, b: PaneThick, kind: GlassKind, over?: GlassPrices): { usd: number; own: boolean } {
  const ar = areasOf(T); let usd = 0, own = false;
  for (const g of GROUPS) if (Math.abs(a[g] - b[g]) > 1e-6) {
    const n = priceSqFt(b[g], kind, over), o = priceSqFt(a[g], kind, over); usd += ar[g] * (n.usd - o.usd); own ||= n.own || o.own;
  }
  return { usd, own };
}

export interface UpgradeIn { T: Dims; rim: boolean; panes: PaneThick; brace: BraceSpec | null; sf: number; bottom: 'full' | 'perimeter'; mixed: boolean; kind: GlassKind; over?: GlassPrices; u: Units;
  /** the least-glass brace that meets the minimum at the current glass (bestBrace), when bracing is Optimized and it has been worked out */
  best?: { brace: BraceSpec | null; meets: boolean } | null }
export interface UpgradeCard { ok: boolean; check: TankCheck; failGroups: (keyof PaneThick)[]; options: UpgradeOption[] }

const optLabel = (kind: 'glass' | 'brace', from: PaneThick, to: PaneThick, mixed: boolean, brace: BraceSpec | null, u: Units): string => {
  if (kind === 'brace') return `Add a brace: ${braceText(brace, u)}`;
  const parts = GROUPS.filter(g => Math.abs(from[g] - to[g]) > 1e-6).map(g => `${g === 'long' ? 'front and back' : g === 'end' ? 'ends' : 'bottom'} ${glassText(to[g], u)}`);
  return mixed ? `Thicker glass on the failing panes: ${parts.join(', ')}` : `Thicker glass all round: ${glassText(to.long, u)}`;
};

/** The way back when a pane is under the minimum, cheapest first. Mixed: only the failing panes go up (to the thinnest stock thickness that
 *  passes, possibly several steps); Same everywhere: every pane goes to one thickness. Never special-order 5/16 in. */
export function upgradeCard(i: UpgradeIn): UpgradeCard {
  const { T, rim, panes, brace, sf, bottom, mixed, kind, over, u } = i, check = checkAt(T, rim, panes, brace, sf, bottom);
  if (check.ok) return { ok: true, check, failGroups: [], options: [] };
  const fg = failing(check, sf), stock = (u === 'in' ? STOCK_US_PICK : STOCK_METRIC).slice().sort((a, b) => a - b);
  const options: UpgradeOption[] = [];
  const from = mixed ? Math.max(...fg.map(g => panes[g])) : Math.max(panes.long, panes.end, panes.bottom);
  for (const t of stock.filter(t => t > from + 1e-6)) {
    const next: PaneThick = mixed ? { ...panes, ...Object.fromEntries(fg.map(g => [g, Math.max(panes[g], t)])) } as PaneThick : { long: Math.max(panes.long, t), end: Math.max(panes.end, t), bottom: Math.max(panes.bottom, t) };
    const c = checkAt(T, rim, next, brace, sf, bottom);
    if (c.ok) { const cost = addedGlassCost(T, panes, next, kind, over); options.push({ kind: 'glass', label: optLabel('glass', panes, next, mixed, null, u), sf: c.minSf, costUsd: cost.usd, panes: next, brace, own: cost.own }); break; }
  }
  if (!rim && i.best?.meets && i.best.brace) {
    const c = checkAt(T, false, panes, i.best.brace, sf, bottom);
    if (c.ok) { const p = priceSqFt(i.best.brace.thickness, kind, over); options.push({ kind: 'brace', label: optLabel('brace', panes, panes, mixed, i.best.brace, u), sf: c.minSf, costUsd: braceArea(T, i.best.brace) * p.usd, panes, brace: i.best.brace, own: p.own }); }
  }
  options.sort((a, b) => a.costUsd - b.costUsd);
  return { ok: false, check, failGroups: fg, options };
}
