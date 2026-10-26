// Integrated kits (2026-10-20, Nathan: "integrated kits/tanks like this can really only be used with their own tech and equipment and
// aren't customizable like a bare glass tank"). An all-in-one such as a Fluval Flex is picked from the tank picker with its kit
// (TankVariant.kit, an id in data/kits.json). The kit's light, lid and filter are applied once and then HELD: the panels grey
// out what the kit supplies (locksOf), and holdIntegrated, called after every scene edit, puts any drift back. Ordinary starter kits
// (hood, light and filter on a glass tank, KitModel.kind 'starter') are not integrated: their gear is applied once and stays editable.
//
// The product gate (2026-10-26, Nathan: "If you pick a style of tank, then everything that comes along with that must remain unless you
// deliberately change it after a warning message"). The same mechanism holds the product the tank was picked as (TankSetup.product):
// every ready-made tank (a maker's product, a standard catalogue size, a size named after one product) holds its rim as sold
// (locksOf().rim) and its size and shape, and an all-in-one its kit's gear. Nathan 2026-10-26: "custom tanks are custom and anything
// can be changed. others not so much. If I get a standard 55g, I cant just take the rim off". A held control is greyed with lockNote;
// changing it anyway goes through breakNote, a confirm saying what it breaks, then releaseProduct (the tank is a custom one with what
// it had; undo brings the product back). What people add to any tank (lid, light, filter, heater) stays free unless a kit supplies it.
import { kitById, kitGear, type KitModel } from '../data/kits';
import { getTankModel, namedModel, pickRimless, variantByKey, variantName, type TankModel, type TankVariant } from '../data/tanks';
import { kitTech } from '../demand/tech';
import { filterUnits, heaterUnits } from './tech';
import { applyKitLight } from './kitlight';
import type { IntegratedKit, LightSettings, Tank, TankProduct, TankSetup } from './types';

/** What the product supplies and so cannot be changed without releasing it: the kit's gear (the heater is the user's unless the kit
 *  ships one), and the rim of a tank only sold rimless. */
export interface Locks { light: boolean; lid: boolean; filter: boolean; heater: boolean; rim: boolean }
/** What a change can break: something locked, or the size and shape the product is sold at. */
export type Held = keyof Locks | 'size';
type Gated = Pick<TankSetup, 'integrated' | 'product'>;

/** The library pick the tank is: its size and, for a maker's product, the variant (none for a catalogue size). */
export function productOf(S: Pick<TankSetup, 'product'>): { m: TankModel; v?: TankVariant } | undefined {
  const p = S.product, m = p && getTankModel(p.model);
  if (!p || !m) return undefined;
  const v = p.key ? variantByKey(m, p.key) : undefined;
  return p.key && !v ? undefined : { m, v };
}

export function locksOf(S: Gated): Locks | undefined {
  const k = S.integrated && kitById(S.integrated.kit), pv = productOf(S);
  const rim = !!pv; // a ready-made tank keeps the rim it is sold with, either way
  if (!k && !rim) return undefined;
  return { light: !!k && k.lightIncluded !== false, lid: !!k, filter: !!k?.filter, heater: !!k?.heater?.watts, rim };
}
export const integratedKit = (S: Pick<TankSetup, 'integrated'>): KitModel | undefined => S.integrated ? kitById(S.integrated.kit) : undefined;

/** The tank as the kit was applied to it: any other size or shape is a different tank. */
export const tankSig = (T: Tank) => [Math.round(T.L), Math.round(T.D), Math.round(T.H), T.shape ?? 'rect', Math.round(T.bowMin ?? 0), T.sides ?? 0].join('x');

/** The fixture's own fields: what the kit fixes. Exposure, room light and the map settings are the viewer's, not equipment. */
const LIGHT_KEYS = ['type', 'count', 'rows', 'pattern', 'spacing', 'cone', 'kelvin', 'height', 'mount', 'pos', 'hoodLed', 'product', 'watts', 'tech', 'bulbW', 'par'] as const;
const pickLight = (l: LightSettings): Partial<LightSettings> => { const o: Record<string, unknown> = {}; for (const k of LIGHT_KEYS) if (l[k] !== undefined) o[k] = l[k]; return o as Partial<LightSettings>; };
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Put a kit's gear on the tank: its light and lid, and its filter (and heater, when it ships one). A starter kit's stays editable. */
export function applyKit(t: TankSetup, k: KitModel) {
  const light = k.lightIncluded !== false;
  const n = applyKitLight(t, k as never); // the kit's light and lid (a kit with no light listed: lid only)
  if (light) t.light = n.light;
  t.lid = n.lid;
  if (k.filter || k.heater?.watts) {
    const gear = kitGear(k), tech = kitTech(t, { filter: k.filter ? gear.filter : undefined, heater: gear.heater, label: `${k.brand} ${k.name}` });
    if (tech) t.tech = tech;
  }
}

/** Apply the kit to the tank for the first time and keep what it set, to hold it. */
function adopt(t: TankSetup, g: IntegratedKit, k: KitModel) {
  const L = locksOf(t)!;
  applyKit(t, k);
  g.sig = tankSig(t.tank); g.lid = t.lid;
  if (L.light) g.light = pickLight(t.light); else delete g.light;
  if (L.filter && t.tech) g.filter = { row: t.tech.rows.filter, units: filterUnits(t.tech).map(u => ({ ...u })) }; else delete g.filter;
  if (L.heater && t.tech) g.heater = { row: t.tech.rows.heater, units: heaterUnits(t.tech).map(u => ({ ...u })) }; else delete g.heater;
}

/** The product's own rule, on every edit: a product the tank no longer is (one the library lost, or a size or shape changed by a
 *  path that did not ask) is dropped, and a rimless one keeps its rim off. The panels ask before any of that (breakNote). */
function holdProduct(t: TankSetup) {
  const p = t.product;
  if (!p) return;
  const pv = productOf(t);
  if (!pv) { delete t.product; return; }
  if (!p.sig) p.sig = tankSig(t.tank);
  else if (p.sig !== tankSig(t.tank)) { delete t.product; return; }
  t.render.rim = !pickRimless(pv.m, pv.v);
}

/** Called on every scene edit (scene/store.ts): holds the product, applies a freshly picked kit, releases one whose tank changed, and
 *  puts back what the kit supplies when something else (a preset, a slider, an old shortcut) moved it. Cheap when the tank has none. */
export function holdIntegrated(t: TankSetup) {
  holdProduct(t);
  const g = t.integrated;
  if (!g) return;
  const k = kitById(g.kit);
  if (!k) { delete t.integrated; return; }
  if (!g.sig) { adopt(t, g, k); return; }
  if (g.sig !== tankSig(t.tank)) { delete t.integrated; return; }
  const L = locksOf(t)!;
  if (L.lid && g.lid && t.lid !== g.lid) t.lid = g.lid;
  if (L.light && g.light && !same(pickLight(t.light), g.light)) {
    const keep = g.light as Record<string, unknown>, l = t.light as unknown as Record<string, unknown>;
    for (const key of LIGHT_KEYS) { if (keep[key] === undefined) delete l[key]; else l[key] = keep[key]; }
  }
  if (t.tech) {
    if (L.filter && g.filter && (t.tech.rows.filter !== g.filter.row || !same(t.tech.filters, g.filter.units))) {
      if (g.filter.row !== undefined) t.tech.rows.filter = g.filter.row;
      t.tech.filters = g.filter.units?.map(u => ({ ...u }));
      delete t.tech.filterModel; delete t.tech.filterProduct;
    }
    if (L.heater && g.heater && (t.tech.rows.heater !== g.heater.row || !same(t.tech.heaters, g.heater.units))) {
      if (g.heater.row !== undefined) t.tech.rows.heater = g.heater.row;
      t.tech.heaters = g.heater.units?.map(u => ({ ...u }));
      delete t.tech.heaterW; delete t.tech.heaterProduct;
    }
  }
}

/** The product's name: "Imagitarium (Petco) Open-Glass Rimless 10 gal", "Fluval Flex 9" for a kit with no product recorded, "standard
 *  55 gal" for a catalogue size, or the size's own name when it is named after one product. */
export function productName(S: Gated): string {
  const pv = productOf(S), k = integratedKit(S);
  return pv?.v ? variantName(pv.v) : k ? `${k.brand} ${k.name}` : pv ? (namedModel(pv.m) ? pv.m.name : `standard ${pv.m.name}`) : '';
}

/** The tank panel's line, always shown: ready-made (a maker's product or a standard size) or custom. */
export const CUSTOM_LABEL = 'Custom tank: any size, anything can be changed';
export function productLabel(S: Gated): string {
  const pv = productOf(S);
  if (!pv) return S.integrated ? `Ready-made: ${productName(S)}` : CUSTOM_LABEL;
  if (!pv.v) return `Ready-made: ${namedModel(pv.m) ? pv.m.name : `standard ${pv.m.name} tank (any maker)`}`;
  const r = pv.v.retailer && !pv.v.brand.includes(pv.v.retailer) ? ` (${pv.v.retailer})` : '';
  return `Ready-made: ${variantName(pv.v)}${r}`;
}
const soldRimless = (S: Gated) => { const pv = productOf(S); return !!pv && pickRimless(pv.m, pv.v); };

const GEAR = { light: 'light', lid: 'lid', filter: 'filter', heater: 'heater' } as const;
/** The one line the panels show beside what is locked. */
export function lockNote(S: Gated, what: keyof Locks): string {
  if (what === 'rim') return locksOf(S)?.rim ? `The ${productName(S)} is ${soldRimless(S) ? 'only sold rimless' : 'sold with its rim'}.` : '';
  return integratedKit(S) ? `All-in-one kit: its ${GEAR[what]} comes with it. Changing it makes this a custom tank.` : '';
}

/** The confirm a change to something held asks, saying what it breaks; undefined when nothing is held there (it changes freely). */
export function breakNote(S: Gated, what: Held): string | undefined {
  const name = productName(S), tail = 'makes this a custom tank, not that product.';
  if (what === 'size') {
    const pv = productOf(S), v = pv?.v, o = pv?.m.outer, inch = (mm: number) => +(mm / 25.4).toFixed(1);
    if (!pv && !S.integrated) return undefined; // a custom tank: any size
    return `The ${name} is sold at ${v ? `${v.L_in} × ${v.D_in} × ${v.H_in} in` : o ? `${inch(o.L)} × ${inch(o.D)} × ${inch(o.H)} in` : 'one size'}. A new size or shape ${tail}${S.integrated ? ' Its gear stays on it and can then be changed.' : ''} Continue?`;
  }
  if (!locksOf(S)?.[what]) return undefined;
  if (what === 'rim') return soldRimless(S) ? `The ${name} is only sold rimless. Adding a rim ${tail} Continue?` : `The ${name} is sold with its rim. Taking it off ${tail} Continue?`;
  return `The ${name} runs on its own ${GEAR[what]}. Changing it ${tail} Continue?`;
}

/** Yes to breakNote: the tank becomes a custom one with what it had (the gear stays, now editable). Undo brings the product back. */
export function releaseProduct(t: TankSetup) { delete t.product; delete t.integrated; }

/** Ask before a change to something held: true to go ahead (nothing held, or the user said yes). `ask` is window.confirm in the app. */
export function mayChange(tanks: Gated[], what: Held, ask: (msg: string) => boolean): boolean {
  const msg = tanks.map(t => breakNote(t, what)).find(Boolean);
  return !msg || ask(msg);
}

/** A saved file's `integrated`: kept only for a kit that exists (the rest is rebuilt on first edit when the snapshot is missing). */
export function parseIntegrated(raw: unknown): IntegratedKit | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as IntegratedKit;
  if (typeof r.kit !== 'string' || !kitById(r.kit)) return undefined;
  return { kit: r.kit, ...(typeof r.sig === 'string' ? { sig: r.sig } : {}), ...(typeof r.lid === 'string' ? { lid: r.lid } : {}), ...(r.light && typeof r.light === 'object' ? { light: r.light } : {}), ...(r.filter && typeof r.filter === 'object' ? { filter: r.filter } : {}), ...(r.heater && typeof r.heater === 'object' ? { heater: r.heater } : {}) };
}

/** A saved file's `product`: kept only for a size (and maker's product) the library still has. */
export function parseProduct(raw: unknown): TankProduct | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as TankProduct;
  if (typeof r.model !== 'string' || (r.key !== undefined && typeof r.key !== 'string')) return undefined;
  const p: TankProduct = { model: r.model, ...(r.key ? { key: r.key } : {}), ...(typeof r.sig === 'string' ? { sig: r.sig } : {}) };
  return productOf({ product: p }) ? p : undefined;
}
