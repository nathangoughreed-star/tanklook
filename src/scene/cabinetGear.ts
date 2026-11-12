// Where the stand-housed gear stands inside a cabinet (lane CB1, Nathan 2026-11-12: "no overlap ... shift them, or move one out
// and flag it"). Pure numbers (no three.js), shared by the drawing (render/gear/*) and the Checks strip (scene/verdict.ts).
// The pieces stand in a row along the cabinet's inside: canister filter, sump, CO2 cylinder. When the row is longer than the
// inside, the canister then the cylinder stand beside the stand on the floor instead (the sump already must fit: tech.ts).
import { FILTER_MODELS } from '../demand/gear';
import { filterProduct } from '../data/gearCatalog';
import { glassThickness } from './physics';
import { sumpOf, techParts, filterState } from './tech';
import { standInside, STAND_PANEL } from './standspace';
import type { TankSetup } from './types';

export const CO2_CYL_R = 68, CO2_CYL_H = 430, CAN_GAP = 30; // mm: the cylinder's radius and its tallest body; clear space between pieces

export interface CabinetGear {
  /** Centre x (world mm, tank x 0..L) of each piece inside the cabinet; undefined = not in the cabinet (the sump: none; the others: beside it). */
  canisterX?: number; co2X?: number; sumpX?: number;
  canisterBeside: boolean; co2Beside: boolean;
  /** Plain-language flags for the Checks strip. */
  notes: string[];
}

/** The canister's body (mm): radius and height, from its product or its size class (as render/gear/filter.ts draws it). */
export function canisterBody(S: TankSetup): { r: number; h: number } | undefined {
  if (S.stockFirst && filterState(S) !== 'chosen') return undefined;
  const p = techParts(S).find(q => q.gear === 'filter' && q.model && FILTER_MODELS.find(m => m.id === q.model)?.kind === 'canister'); if (!p) return undefined;
  const m = FILTER_MODELS.find(x => x.id === p.model)!, prod = filterProduct(p.product), s = Math.cbrt(m.gph / 265);
  const pr = prod?.kind === 'canister' ? prod : undefined;
  return { r: pr ? pr.bodyMm.w / 2 : 95 * s, h: pr?.bodyMm.h ?? 380 * s };
}

const hasCo2 = (S: TankSetup) => techParts(S).some(p => p.gear === 'co2kit' || p.gear === 'diyco2' || p.gear === 'co2cart');

/** The gear's places in a cabinet stand (style 'cabinet'); undefined for no stand or another style, which keep their own layout. */
export function cabinetGear(S: TankSetup): CabinetGear | undefined {
  const room = standInside(S); if (!room || S.stand.style !== 'cabinet') return undefined;
  const T = S.tank, t = glassThickness(T, S.render.glass), x0 = -t + STAND_PANEL, notes: string[] = [];
  const can = canisterBody(S), sump = S.water.on ? sumpOf(S) : undefined, co2 = hasCo2(S);
  const canFits = !can || (can.h + 60 <= room.H && 2 * can.r + 20 <= room.L);
  const items: { k: 'can' | 'sump' | 'co2'; w: number }[] = [];
  if (can && canFits) items.push({ k: 'can', w: 2 * can.r });
  if (sump) items.push({ k: 'sump', w: sump.L });
  if (co2) items.push({ k: 'co2', w: 2 * CO2_CYL_R });
  const row = (list: typeof items) => list.reduce((a, i) => a + i.w, 0) + CAN_GAP * Math.max(0, list.length - 1);
  let canisterBeside = !!can && !canFits, co2Beside = false;
  // too long for the inside: the canister goes out first, then the cylinder
  if (row(items) > room.L && items.some(i => i.k === 'can')) { items.splice(items.findIndex(i => i.k === 'can'), 1); canisterBeside = true; }
  if (row(items) > room.L && items.some(i => i.k === 'co2')) { items.splice(items.findIndex(i => i.k === 'co2'), 1); co2Beside = true; }
  // spread the row over the inside with equal gaps at both ends and between
  const free = Math.max(0, room.L - items.reduce((a, i) => a + i.w, 0)), gap = free / (items.length + 1), out: CabinetGear = { canisterBeside, co2Beside, notes };
  let x = x0 + gap;
  // order: canister, sump, cylinder (the canister's hoses on the left, as before)
  for (const i of items) { const c = x + i.w / 2; if (i.k === 'can') out.canisterX = c; else if (i.k === 'sump') out.sumpX = c; else out.co2X = c; x += i.w + gap; }
  if (canisterBeside) notes.push('The canister filter does not fit in the stand with the rest of the gear, so it stands beside the stand.');
  if (co2Beside) notes.push('The CO2 cylinder does not fit in the stand with the rest of the gear, so it stands beside the stand.');
  return out;
}
