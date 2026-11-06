// The docked tank picker's pure part (lane ST1, Nathan 2026-11-05): which sizes a kind of setup offers, grouped by band like the old modal; what each row says
// (size, tank price, finished-tank range); and the view-only setup a highlighted row draws. Free of the DOM so test/tankdock.test.ts can check it.
import { roomOf } from '../scene/roomlight';
import { finishedRange, type FinishedRange } from '../demand/finishedRange';
import { tankRowPrice } from '../demand/prices';
import { BANDS, TANK_MODELS, dimsInches, modelOfVariant, namedModel, soleProduct, tankFromModel, variantName, variantUsd, type TankBand, type TankModel, type TankVariant } from '../data/tanks';
import { adaptToTank } from '../scene/reeval';
import { bareTech, type TechSetup } from '../scene/tech';
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
/** A size band of one group: closed until the person opens it (ui/tankDock.ts). */
export interface DockBand { id: string; band: TankBand; title: string; opts: DockOpt[]; /** how many choices it holds */ n: number; /** the lowest and highest known tank price in it */ lo?: number; hi?: number }
/** The two top-level groups (lane ST2, Nathan 2026-11-06): a bare tank, or a kit / bundle that comes with gear. */
export interface DockGroup { id: 'tank' | 'kit'; title: string; hint: string; bands: DockBand[] }

/** Which catalogue models a kind of setup offers: aquariums for water, dry enclosures for a terrarium, both for a vivarium (a paludarium may be either). */
export const offers = (m: TankModel, k: SetupKind): boolean => k === 'vivarium' || (k === 'terrarium') === !!m.terrarium;

export const optKey = (m: TankModel, v?: TankVariant) => v ? `${m.id}|${v.brand}|${v.line ?? ''}|${v.L_in}x${v.D_in}x${v.H_in}|${v.retailer ?? ''}` : m.id;

/** THE RULE for a kit / bundle (lane ST2, from the catalogue's own data): a product is one when it is sold with gear, i.e. any of
 *   - it carries a kit record (`kit`, an all-in-one that runs only on its own gear), or its price is a kit price (`price_kind: 'kit'`);
 *   - `includes` says it comes with a light, filter, heater or stand;
 *   - its name says so (kit, starter, ensemble, all-in-one, bundle, combo, package, system, "with a cabinet / stand").
 *  Every other product, and every generic size, is a bare tank. */
const KIT_WORDS = /\b(kit|kits|starter|ensemble|all[- ]in[- ]one|aio|bundle|combo|package|system|set)\b|\bw\/\s*(cabinet|stand)|\bwith (a )?(cabinet|stand)/i;
export function isBundle(v: TankVariant): boolean {
  const inc = v.includes;
  return !!v.kit || v.price_kind === 'kit' || !!(inc && (inc.light || inc.filter || inc.heater || inc.stand)) || KIT_WORDS.test(`${v.brand} ${v.line ?? ''}`);
}
/** A model that is itself a kit (its own catalogue name says so, e.g. "Penn-Plax SpongeBob ... Starter Kit 1.5 gal", or its name is a maker's product and every product it lists is a bundle). */
export function modelIsBundle(m: TankModel): boolean {
  if (/\b(kit|starter|ensemble|all[- ]in[- ]one|bundle|combo)\b/i.test(m.name)) return true;
  const vs = m.variants ?? [];
  return namedModel(m) && vs.length > 0 && vs.every(isBundle);
}

const bandRow = (id: string, band: TankBand, title: string, opts: DockOpt[]): DockBand => {
  const p = opts.map(o => o.usd).filter((x): x is number => x != null && x > 0);
  return { id, band, title, opts, n: opts.length, ...(p.length ? { lo: Math.min(...p), hi: Math.max(...p) } : {}) };
};

/** The picker's rows for a kind and a search: two groups (a bare tank; kits and bundles), each in size bands, each size smallest first with its products beneath. */
export function dockGroups(kind: SetupKind, q = '', now = Date.now()): DockGroup[] {
  const needle = q.trim().toLowerCase();
  const hit = (m: TankModel) => !needle || [m.name, m.shape, ...(m.tags ?? []), ...(m.variants ?? []).flatMap(v => [v.brand, v.line ?? ''])].join(' ').toLowerCase().includes(needle);
  const mk = (m: TankModel, v?: TankVariant): DockOpt => {
    const dims = v ? dimsInches({ L: v.L_in * 25.4, D: v.D_in * 25.4, H: v.H_in * 25.4 }) : dimsInches(m.outer);
    return v ? { key: optKey(m, v), m, v, name: variantName(v), gal: m.ratedGal, dims, usd: variantUsd(v, now), typical: false, range: finishedRange(m.id, kind) }
      : { key: optKey(m), m, name: m.name, gal: m.ratedGal, dims, usd: tankRowPrice(m.ratedGal)?.mode, typical: true, range: finishedRange(m.id, kind) };
  };
  const tank = new Map<TankBand, DockOpt[]>(), kit = new Map<TankBand, DockOpt[]>();
  const add = (g: Map<TankBand, DockOpt[]>, b: TankBand, ...o: DockOpt[]) => g.set(b, [...(g.get(b) ?? []), ...o]);
  for (const m of TANK_MODELS.filter(x => offers(x, kind) && hit(x)).sort((a, c) => a.ratedGal - c.ratedGal)) {
    const vs = m.variants ?? [];
    if (modelIsBundle(m)) add(kit, m.band, mk(m), ...vs.map(v => mk(m, v)));
    else {
      add(tank, m.band, mk(m), ...vs.filter(v => !isBundle(v)).map(v => mk(m, v)));
      for (const v of vs.filter(isBundle)) add(kit, m.band, mk(m, v));
    }
  }
  const bands = (id: string, g: Map<TankBand, DockOpt[]>) => BANDS.filter(([b]) => g.get(b)?.length).map(([b, t]) => bandRow(`${id}:${b}`, b, t, g.get(b)!));
  return ([
    { id: 'tank', title: 'Tank only', hint: 'A bare glass or acrylic tank: no light, filter or heater', bands: bands('tank', tank) },
    { id: 'kit', title: 'Kits and bundles', hint: 'Starter kits, all-in-ones and tank-and-stand sets that come with gear', bands: bands('kit', kit) },
  ] as DockGroup[]).filter(g => g.bands.length);
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
/** The empty room itself, framed on the spot, lit by the room-light slider (UI4: high while the tank has no light, so the wall, floor and person read; the person's own value if they moved it). A copy. */
export function emptyRoomView(base: TankSetup): TankSetup {
  const p = structuredClone(base);
  p.light.room = roomOf(p.light); delete p.light.roomAuto;
  return p;
}

/** The setup a highlighted row draws: the edited tank with that size and product applied the way Choose would (the same applyTankPick, glass and reshaping), on a COPY. Never the scene. */
/** What gear a pick starts the Sandbox with (lane ST2, Nathan 2026-11-06): a bare tank brings NONE (no filter, heater, light, lid...); only a kit / bundle brings what it includes
 *  (an all-in-one's own record, scene/integrated.ts, or the filter / heater its listing says it has). `undefined` = leave the scene's tech as it is (what a kit with no recorded
 *  contents has always done). `S` is the setup with the pick applied (the inferred gear depends on the tank's size). */
export function startGear(S: TankSetup, o: DockOpt): TechSetup | undefined {
  const bundle = o.v ? isBundle(o.v) : modelIsBundle(o.m);
  if (!bundle) return bareTech(S);
  const v = o.v ?? soleProduct(o.m);
  if (!v || v.kit || !v.includes) return undefined;
  return bareTech(S, [...(v.includes.filter ? ['filter'] : []), ...(v.includes.heater ? ['heater'] : [])]);
}

export function previewSetup(base: TankSetup, o: DockOpt, start = false): TankSetup {
  const p = structuredClone(base), v = o.v ?? soleProduct(o.m), mm = v ? modelOfVariant(o.m, v) : o.m, T = tankFromModel(mm);
  applyTankPick(p, o.m, v);
  p.render.glass = mm.glassMm;
  if (p.fish.length || p.items.length) adaptToTank(p, T, { thin: false }); else p.tank = T;
  if (start) { const g = startGear(p, o); if (g) p.tech = g; } // the Sandbox's first tank: the preview carries the gear Choose will give it
  return p;
}
