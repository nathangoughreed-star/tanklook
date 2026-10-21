// Integrated kits (2026-10-20, Nathan: "integrated kits/tanks like this can really only be used with their own tech and equipment and
// aren't customizable like a bare glass tank"). An all-in-one such as a Fluval Flex is picked from the tank picker with its kit
// (TankVariant.kit, an id in data/kits.json). The kit's light, lid and filter are applied once and then HELD: the panels grey
// out what the kit supplies (locksOf), and holdIntegrated, called after every scene edit, puts any drift back. The product is the
// tank as sold, so a new size or shape releases it (the tank is then an ordinary one with the gear it had). Ordinary starter kits
// (hood, light and filter on a glass tank) are not integrated: their gear stays editable.
import { kitById, kitGear, type KitModel } from '../data/kits';
import { kitTech } from '../demand/tech';
import { filterUnits, heaterUnits } from './tech';
import { applyKitLight } from './kitlight';
import type { IntegratedKit, LightSettings, Tank, TankSetup } from './types';

/** What the kit supplies and so cannot be changed. The heater is the user's unless the kit ships one. */
export interface Locks { light: boolean; lid: boolean; filter: boolean; heater: boolean }

export function locksOf(S: Pick<TankSetup, 'integrated'>): Locks | undefined {
  const k = S.integrated && kitById(S.integrated.kit);
  if (!k) return undefined;
  return { light: k.lightIncluded !== false, lid: true, filter: !!k.filter, heater: !!k.heater?.watts };
}
export const integratedKit = (S: Pick<TankSetup, 'integrated'>): KitModel | undefined => S.integrated ? kitById(S.integrated.kit) : undefined;

/** The tank as the kit was applied to it: any other size or shape is a different tank. */
export const tankSig = (T: Tank) => [Math.round(T.L), Math.round(T.D), Math.round(T.H), T.shape ?? 'rect', Math.round(T.bowMin ?? 0), T.sides ?? 0].join('x');

/** The fixture's own fields: what the kit fixes. Exposure, room light and the map settings are the viewer's, not equipment. */
const LIGHT_KEYS = ['type', 'count', 'rows', 'pattern', 'spacing', 'cone', 'kelvin', 'height', 'mount', 'pos', 'hoodLed', 'product', 'watts', 'tech', 'bulbW', 'par'] as const;
const pickLight = (l: LightSettings): Partial<LightSettings> => { const o: Record<string, unknown> = {}; for (const k of LIGHT_KEYS) if (l[k] !== undefined) o[k] = l[k]; return o as Partial<LightSettings>; };
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Apply the kit to the tank for the first time: its light and lid, and its filter (and heater, when it ships one). */
function adopt(t: TankSetup, g: IntegratedKit, k: KitModel) {
  const L = locksOf(t)!;
  const n = applyKitLight(t, k as never); // the kit's light and lid (a kit with no light listed: lid only)
  if (L.light) t.light = n.light;
  t.lid = n.lid;
  if (L.filter || L.heater) {
    const gear = kitGear(k), tech = kitTech(t, { filter: L.filter ? gear.filter : undefined, heater: gear.heater, label: `${k.brand} ${k.name}` });
    if (tech) t.tech = tech;
  }
  g.sig = tankSig(t.tank); g.lid = t.lid;
  if (L.light) g.light = pickLight(t.light); else delete g.light;
  if (L.filter && t.tech) g.filter = { row: t.tech.rows.filter, units: filterUnits(t.tech).map(u => ({ ...u })) }; else delete g.filter;
  if (L.heater && t.tech) g.heater = { row: t.tech.rows.heater, units: heaterUnits(t.tech).map(u => ({ ...u })) }; else delete g.heater;
}

/** Called on every scene edit (scene/store.ts): applies a freshly picked kit, releases one whose tank changed, and puts back what
 *  the kit supplies when something else (a preset, a slider, an old shortcut) moved it. Cheap when the tank has no kit. */
export function holdIntegrated(t: TankSetup) {
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

/** The one line the panels show beside what is locked. */
export function lockNote(S: Pick<TankSetup, 'integrated'>, what: 'light' | 'lid' | 'filter' | 'heater'): string {
  const k = integratedKit(S);
  return k ? `All-in-one kit: its ${what} comes with it and cannot be swapped. A different tank or size takes the kit off.` : '';
}

/** A saved file's `integrated`: kept only for a kit that exists (the rest is rebuilt on first edit when the snapshot is missing). */
export function parseIntegrated(raw: unknown): IntegratedKit | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as IntegratedKit;
  if (typeof r.kit !== 'string' || !kitById(r.kit)) return undefined;
  return { kit: r.kit, ...(typeof r.sig === 'string' ? { sig: r.sig } : {}), ...(typeof r.lid === 'string' ? { lid: r.lid } : {}), ...(r.light && typeof r.light === 'object' ? { light: r.light } : {}), ...(r.filter && typeof r.filter === 'object' ? { filter: r.filter } : {}), ...(r.heater && typeof r.heater === 'object' ? { heater: r.heater } : {}) };
}
