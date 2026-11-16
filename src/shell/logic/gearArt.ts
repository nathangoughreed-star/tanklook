// Lane EQ2 (R61, 2026-11-15): which picture a catalogue product gets on its Equipment row. The picture is a still of the product's own 3D model in its
// real per-part colours (src/render/gearStill.ts), baked to public/gallery/gear/<stem>.webp (scripts/bake-gallery.mjs). Products that share a generic
// model (every air pump, every top-off sensor ...) share one picture. No retailer photos. Pure: no DOM, no three.js.
import { FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS, PUMP_PRODUCTS, REEF_ROWS, filterProduct, heaterProduct, lightProduct, pumpProduct, reefProduct } from '../../data/gearCatalog';
import { hoodProduct, HOOD_PRODUCTS } from '../../data/hoods';
import { FILTER_MODELS, matchHeater } from '../../demand/gear';
import { GENERIC } from '../../scene/gearOwn';
import type { GearPick } from '../../render/gear/common';

export type StillSpec = { kind: 'gear'; picks: GearPick[]; salt?: boolean; /** the part bucket the body is found in (a sponge filter's air pump sits in the cabinet: the sponge is 'wet') */ main?: 'wet' | 'room' | 'clear' | 'glow' } | { kind: 'light'; id: string; /** camera yaw / pitch (rad): a light seen from below shows its LEDs (PM1) */ view?: { yaw: number; pitch: number } } | { kind: 'hood'; id: string };
export interface Art { /** file stem under gallery/gear/ */ stem: string; spec: StillSpec }

/** The filter model nearest a product's flow (what Tune-as-generic picks); a sponge filter has no flow, so the smallest of its kind. */
function filterModelFor(kind: string, gph?: number) {
  const ms = FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph);
  return gph ? [...ms].sort((a, b) => Math.abs(Math.log(a.gph / gph)) - Math.abs(Math.log(b.gph / gph)))[0] : ms[0];
}
const shared = (stem: string, id: string, salt = false): Art => ({ stem: `generic-${stem}`, spec: { kind: 'gear', picks: [{ id }], ...(salt ? { salt } : {}) } });

/** PM1: a light whose look was read off its photos is drawn from below, where the photos show its LEDs (an arm-mounted box from the side). */
const lightView = (p: { colors: { arm?: string; pm1?: string } }) => (p.colors.arm ? { view: { yaw: 0.6, pitch: -0.1 } } : p.colors.pm1 ? { view: { yaw: 0.9, pitch: -0.5 } } : {});

/** The picture of `item` in `cat`, or undefined when the product has no model to draw (the row keeps its icon). */
export function artOf(cat: string, item: string): Art | undefined {
  if (item === GENERIC) return undefined;
  switch (cat) {
    case 'filter': { const p = filterProduct(item), m = p && filterModelFor(p.kind, p.gph); return p && m ? { stem: p.id, spec: { kind: 'gear', picks: [{ id: m.id, product: p.id }], ...(p.kind === 'sponge' ? { main: 'wet' as const } : {}) } } : undefined; }
    case 'heater': { const p = heaterProduct(item); return p ? { stem: p.id, spec: { kind: 'gear', picks: [{ id: matchHeater(p.watts).id, watts: p.watts, product: p.id }] } } : undefined; }
    case 'light': return hoodProduct(item) ? { stem: item, spec: { kind: 'hood', id: item } } : lightProduct(item) ? { stem: item, spec: { kind: 'light', id: item, ...lightView(lightProduct(item)!) } } : undefined;
    case 'air': return pumpProduct(item) ? shared('airstone', 'airstone') : undefined;
    case 'flow': { const p = pumpProduct(item); return p ? { stem: p.id, spec: { kind: 'gear', picks: [{ id: p.kind === 'wavemaker' ? 'wavemaker' : 'powerhead', product: p.id }], salt: true } } : undefined; }
    case 'uv': { const p = reefProduct('uv', item); return p ? { stem: p.id, spec: { kind: 'gear', picks: [{ id: 'uv', product: p.id }] } } : undefined; }
    case 'skimmer': case 'surfskim': { const p = reefProduct(cat, item) as { kind?: string } | undefined; return !p ? undefined : p.kind === 'surface' ? shared('surfskim', 'surfskim') : shared(p.kind === 'sump' ? 'skimmer-sump' : 'skimmer', 'skimmer', true); }
    case 'chiller': { const p = reefProduct('chiller', item) as { kind?: string } | undefined; return p?.kind === 'fan' ? shared('chillerfan', 'chillerfan', true) : undefined; }
    case 'co2': return reefProduct('co2', item) ? shared('co2', 'co2') : undefined;
    case 'ato': return reefProduct('ato', item) ? shared('ato', 'ato', true) : undefined;
    default: return undefined;
  }
}

/** Every distinct picture the catalogue needs (the bake list): stem -> spec. */
export function allArt(): Map<string, StillSpec> {
  const out = new Map<string, StillSpec>(), add = (cat: string, id: string) => { const a = artOf(cat, id); if (a && !out.has(a.stem)) out.set(a.stem, a.spec); };
  for (const p of FILTER_PRODUCTS) add('filter', p.id);
  for (const p of HEATER_PRODUCTS) add('heater', p.id);
  for (const p of LIGHT_PRODUCTS) add('light', p.id);
  for (const p of HOOD_PRODUCTS) add('light', p.id);
  for (const p of PUMP_PRODUCTS) add(p.kind === 'air' ? 'air' : 'flow', p.id);
  for (const [cat, list] of Object.entries(REEF_ROWS)) for (const p of list) add(cat, p.id);
  return out;
}
