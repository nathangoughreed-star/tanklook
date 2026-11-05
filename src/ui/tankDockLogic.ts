// The docked tank picker's pure part (lane ST1, Nathan 2026-11-05): which sizes a kind of setup offers, grouped by band like the old modal; what each row says
// (size, tank price, finished-tank range); and the view-only setup a highlighted row draws. Free of the DOM so test/tankdock.test.ts can check it.
import { finishedRange, type FinishedRange } from '../demand/finishedRange';
import { tankRowPrice } from '../demand/prices';
import { BANDS, TANK_MODELS, dimsInches, modelOfVariant, soleProduct, tankFromModel, variantName, variantUsd, type TankModel, type TankVariant } from '../data/tanks';
import { adaptToTank } from '../scene/reeval';
import type { SetupKind } from '../scene/pickerKind';
import { applyTankPick } from './tankPick';
import type { TankSetup } from '../scene/types';

/** One thing the picker can choose: a generic size, or one maker's product at that size. */
export interface DockOpt {
  key: string; m: TankModel; v?: TankVariant;
  /** "55 gal", or the product's name for a variant row */
  name: string; gal: number;
  /** outer size as sold, inches: "48×13×21" */
  dims: string;
  /** the tank's own price: a product's, else the typical bare-glass price at this size */
  usd?: number; typical: boolean;
  /** what the finished tank costs at this size (lane FR1), null = not known (the row hides it) */
  range: FinishedRange | null;
}
export interface DockGroup { title: string; opts: DockOpt[] }

/** Which catalogue models a kind of setup offers: aquariums for water, dry enclosures for a terrarium, both for a vivarium (a paludarium may be either). */
export const offers = (m: TankModel, k: SetupKind): boolean => k === 'vivarium' || (k === 'terrarium') === !!m.terrarium;

export const optKey = (m: TankModel, v?: TankVariant) => v ? `${m.id}|${v.brand}|${v.line ?? ''}|${v.L_in}x${v.D_in}x${v.H_in}|${v.retailer ?? ''}` : m.id;

/** The picker's rows for a kind and a search: by band, each size smallest first, its products beneath. `withProducts` false = generic sizes only. */
export function dockGroups(kind: SetupKind, q = '', now = Date.now()): DockGroup[] {
  const needle = q.trim().toLowerCase();
  const hit = (m: TankModel) => !needle || [m.name, m.shape, ...(m.tags ?? []), ...(m.variants ?? []).flatMap(v => [v.brand, v.line ?? ''])].join(' ').toLowerCase().includes(needle);
  const out: DockGroup[] = [];
  for (const [b, title] of BANDS) {
    const opts: DockOpt[] = [];
    for (const m of TANK_MODELS.filter(x => x.band === b && offers(x, kind) && hit(x)).sort((a, c) => a.ratedGal - c.ratedGal)) {
      const range = finishedRange(m.id, kind), typ = tankRowPrice(m.ratedGal)?.mode;
      opts.push({ key: optKey(m), m, name: m.name, gal: m.ratedGal, dims: dimsInches(m.outer), usd: typ, typical: true, range });
      for (const v of m.variants ?? []) {
        const price = variantUsd(v, now);
        opts.push({ key: optKey(m, v), m, v, name: variantName(v), gal: m.ratedGal, dims: dimsInches({ L: v.L_in * 25.4, D: v.D_in * 25.4, H: v.H_in * 25.4 }), usd: price, typical: false, range });
      }
    }
    if (opts.length) out.push({ title, opts });
  }
  return out;
}

/** "$1,240 - $3,100" or '' when the range is unknown. */
export function rangeText(r: FinishedRange | null): string {
  if (!r) return '';
  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  return `${usd(r.lo)} - ${usd(r.hi)}`;
}

/** The room view while flipping through sizes in the empty Sandbox room: the lens opens up with the tank so the person (and so the scale) stays on screen at about the same size
 *  whatever the tank (a 4 ft tank gets the default environment's 0.34; the lens never goes below the camera's own 0.1). */
export const roomZoom = (T: { L: number; H: number }) => Math.min(0.6, Math.max(0.1, Math.max(T.L, T.H * 1.6) * 0.34 / 1219));
/** The empty room itself: lit enough to see the wall, floor and person (no tank light to do it), framed on the spot. A copy; the scene keeps Nathan's low room light. */
export function emptyRoomView(base: TankSetup): TankSetup {
  const p = structuredClone(base);
  p.light.room = Math.max(p.light.room, 0.45); p.camera.zoom = roomZoom(p.tank);
  return p;
}

/** The setup a highlighted row draws: the edited tank with that size and product applied the way Choose would (the same applyTankPick, glass and reshaping), on a COPY. Never the scene. */
export function previewSetup(base: TankSetup, o: DockOpt, room = false): TankSetup {
  const p = structuredClone(base), v = o.v ?? soleProduct(o.m), mm = v ? modelOfVariant(o.m, v) : o.m, T = tankFromModel(mm);
  applyTankPick(p, o.m, v);
  p.render.glass = mm.glassMm;
  if (p.fish.length || p.items.length) adaptToTank(p, T, { thin: false }); else p.tank = T;
  if (room) p.camera.zoom = roomZoom(p.tank); // the empty Sandbox room keeps the person in the picture
  return p;
}
