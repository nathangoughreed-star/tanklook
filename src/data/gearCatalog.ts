// Real aquarium gear by brand (lane TG, Nathan 2026-10-19: "a generic 50 W heater as the default as long as it's sized
// correctly, and the Top Fin 50 W to choose from"). Data in gear-catalog.json: each product's rating, measured size and
// a source; the drawing uses its own size, the Tech menu lists the products near the size the tank needs.
import { gearCatalog as data } from './gear';

export interface HeaterProduct {
  id: string; brand: string; model: string; watts: number;
  /** overall length (tube + cap) and tube diameter, mm */
  lengthMm: number; diaMm: number;
  /** what it looks like: 'glass' (a clear tube), 'shroud' (a plastic guard over the glass), 'titanium' (a metal tube) */
  look: 'glass' | 'shroud' | 'titanium';
  galMin?: number; galMax?: number; priceUsd?: number; url: string; asOf: string; priceUrl?: string;
  /** what it looks like, part by part, from product photos (Nathan 2026-10-19: true colours, simple shapes) */
  colors?: HeaterLook;
  /** colour fields not seen in a photo (cups hidden by the box), and what is not drawn (a separate controller) */
  colorsEst?: string[]; colorsNote?: string;
  /** fields that are estimates, not published */
  est?: string[];
  /** lowercase names a bundle listing uses for this product (deals.ts / kits.ts are matched by them) */
  names?: string[];
  /** the heater the brand's retail kits ship (an Aqueon kit has the Aqueon Preset, not the Pro) */
  kit?: boolean;
  /** why it counts as popular: Amazon rank / ratings / bought per month, where and when seen */
  popularity?: Popularity;
}
export interface Popularity { evidence: string; url: string; seen: string }
/** A heater's colours part by part (hex), as researched from photos. */
export interface HeaterLook {
  /** the top cap; `ribbed`: a stack of rings (a grip) */
  cap: { hex: string; dial?: boolean; display?: string; led?: string; ribbed?: boolean; note?: string };
  /** the bottom end: absent = a rounded end in the cap's (or guard's) colour */
  foot?: { hex: string; ribbed?: boolean };
  /** the tube: 'opaque' = a solid sleeve in `hex`, clear only over `window` (shares of the length from the bottom) */
  tube: { kind: 'glass' | 'frosted' | 'metal' | 'hidden' | 'opaque'; hex: string; window?: [number, number] };
  /** a thermometer scale seen through the glass (white strip, red line) */
  thermometer?: boolean;
  /** 'core': a solid core seen through the glass (a mini PTC heater's grey block), no wire */
  element: { kind: 'coil' | 'wire' | 'none' | 'core'; hex: string; note?: string };
  guard: { has: boolean; hex?: string; pattern?: 'slots' | 'mesh' | 'solid' };
  cord: string; cups: 'clear' | 'frosted' | 'black';
  /** 'flat': a flat rectangular body instead of a round tube */ shape?: 'tube' | 'flat';
  /** a thermostat box on the cord outside the tank (mm), `display` = the digits' colour */
  controller?: { hex: string; display?: string; wMm: number; hMm: number; dMm: number };
  photo?: string;
}
export const HEATER_PRODUCTS = (data as unknown as { heaters: HeaterProduct[] }).heaters;
export const heaterProduct = (id?: string) => (id ? HEATER_PRODUCTS.find(h => h.id === id) : undefined);

/** The sizes heaters are sold in. */
export const HEATER_SIZES = [25, 50, 75, 100, 150, 200, 250, 300, 500];
/** The generic heater for a need of `w` watts (each heater when there are two): the smallest common size holding it. */
export const genericHeaterW = (w: number) => HEATER_SIZES.find(s => s >= w) ?? HEATER_SIZES[HEATER_SIZES.length - 1];

/** Products worth offering for a heater of `w` watts: the same size first, then the next sizes up and down, nearest first. */
export function heatersNear(w: number, n = 8): HeaterProduct[] {
  const g = genericHeaterW(w), i = HEATER_SIZES.indexOf(g), ok = new Set(HEATER_SIZES.slice(Math.max(0, i - 1), i + 2));
  return HEATER_PRODUCTS.filter(h => ok.has(genericHeaterW(h.watts)))
    .sort((a, b) => Math.abs(Math.log(a.watts / g)) - Math.abs(Math.log(b.watts / g)) || a.brand.localeCompare(b.brand)).slice(0, n);
}

// ---- filters (lane TG step 3, 2026-10-19): real HOB, canister, internal and sponge filters, colours read from photos

export type FilterProductKind = 'hob' | 'canister' | 'internal' | 'sponge';
/** One part's colour: hex, and whether it is tinted clear plastic you see into (an AquaClear body). */
export interface PartColour { hex: string; translucent?: boolean }
/** A filter's colours part by part, as researched from a product photo. */
export interface FilterLook {
  body: PartColour; lid?: PartColour;
  /** HOB motor housing, canister head, internal pump head */
  motor?: PartColour;
  /** intake tube (canister: the in-tank pipes) and its strainer */
  intake?: PartColour; strainer?: PartColour;
  /** spillway lip / outlet nozzle / spray bar */
  outlet?: PartColour;
  /** canister latches and the foot ring round its base */
  clips?: PartColour; foot?: PartColour;
  hose?: string; sponge?: string;
  /** one distinctive coloured part (a Bio-Wheel, a blue ring) */
  accent?: { hex: string; where: string };
  cups?: 'clear' | 'frosted' | 'black';
  photo?: string;
}
export interface FilterProduct {
  id: string; brand: string; model: string; kind: FilterProductKind;
  /** rated flow (sponge filters: absent, air driven) */
  gph?: number; galMin?: number; galMax?: number; watts?: number;
  /** body size, mm: w along the glass, d away from it, h tall (canister: footprint and height; sponge: sponge diameter / height) */
  bodyMm: { w: number; d: number; h: number };
  /** HOB / canister intake tube below the rim, mm */
  intakeMm?: number;
  priceUsd?: number; url: string; asOf: string;
  /** where the price was read, when not the product page in `url` */
  priceUrl?: string;
  /** a sponge filter's parts from the bottom up, mm (overall = base + sponge + collar + tube = bodyMm.h): a base neck and
   *  disc, the sponge (bodyMm.w across, `flutes` vertical grooves round it), a collar on top, and the lift tube at its real
   *  length (the bubbles leave its top, under water); absent = the old drawing (sponge bodyMm.h tall, tube to the surface) */
  spongeParts?: { baseMm: number; baseDiaMm: number; neckMm?: number; neckDiaMm?: number; spongeMm: number; flutes?: number; collarMm: number; collarDiaMm: number; tubeMm: number; tubeDiaMm: number };
  names?: string[]; est?: string[];
  colors: FilterLook; colorsEst?: string[]; colorsNote?: string;
  popularity?: Popularity;
}
export const FILTER_PRODUCTS = ((data as unknown as { filters?: FilterProduct[] }).filters ?? []);
export const filterProduct = (id?: string) => (id ? FILTER_PRODUCTS.find(f => f.id === id) : undefined);

/** Products of a kind worth offering for a tank of `gal` gallons: rated for it first, then the nearest ranges. */
export function filtersNear(kind: string, gal: number, n = 8): FilterProduct[] {
  const off = (f: FilterProduct) => gal < (f.galMin ?? 0) ? Math.log((f.galMin ?? 1) / Math.max(gal, 1)) : gal > (f.galMax ?? Infinity) ? Math.log(gal / (f.galMax ?? 1)) : 0;
  return FILTER_PRODUCTS.filter(f => f.kind === kind && off(f) < 0.7)
    .sort((a, b) => off(a) - off(b) || a.brand.localeCompare(b.brand) || (a.gph ?? 0) - (b.gph ?? 0)).slice(0, n);
}

/** The catalogued product a bundle listing names (deals.ts `filter.name`, kits.ts `filter.rating`): the longest of the
 *  products' `names` found in the text, of the given kind when known. Undefined: no product named. */
export function filterByName(text: string | undefined, kind?: string, gal?: number): FilterProduct | undefined {
  const t = (text ?? '').toLowerCase();
  if (!t) return undefined;
  // the longest name wins; a name several sizes share ("top fin internal filter") goes to the size rated for the tank
  // (a tank measures a little over its rated size, so a rated range holds up to 15 % more)
  const fit = (f: FilterProduct) => gal === undefined ? 0 : gal < (f.galMin ?? 0) ? (f.galMin ?? 0) - gal : gal > (f.galMax ?? Infinity) * 1.15 ? gal - (f.galMax ?? 0) * 1.15 : 0;
  const find = (pool: FilterProduct[]) => pool.flatMap(f => (f.names ?? []).filter(n => t.includes(n)).map(n => ({ f, n: n.length })))
    .sort((a, b) => b.n - a.n || fit(a.f) - fit(b.f) || (a.f.galMax ?? 0) - (b.f.galMax ?? 0))[0]?.f;
  // the listing's kind first; a product named outright wins over a listing that has its kind wrong (the kits' SmartClean hangs on the back)
  return find(FILTER_PRODUCTS.filter(f => !kind || f.kind === kind)) ?? find(FILTER_PRODUCTS);
}
/** The heater a bundle ships: its brand named in the listing (a Top Fin kit ships a Top Fin heater) at its watts, else the
 *  brand's size nearest `watts`. Undefined: no catalogued heater of that brand. */
export function heaterForBundle(label: string, watts: number): HeaterProduct | undefined {
  const t = label.toLowerCase();
  const mine = HEATER_PRODUCTS.filter(h => t.includes(h.brand.toLowerCase()) || (h.names ?? []).some(n => t.includes(n)));
  return mine.sort((a, b) => Math.abs(Math.log(a.watts / watts)) - Math.abs(Math.log(b.watts / watts)) || +!!b.kit - +!!a.kit)[0];
}

/** A product's price when it was read from a listing (not an estimate): the cost uses it in place of the class price. */
export const listedPrice = (p?: { priceUsd?: number; est?: string[] }) => (p?.priceUsd && !p.est?.includes('priceUsd') ? p.priceUsd : undefined);
/** A product's display name: the model, with the brand in front unless the model already starts with it. */
export const productName = (p: { brand: string; model: string }) => (p.model.toLowerCase().startsWith(p.brand.toLowerCase()) ? p.model : `${p.brand} ${p.model}`);

// ---- lights (2026-10-20): the Amazon best-selling aquarium lights (research/gear-popular/lights.*), colours read from photos

/** How it is held: 'bar' = a slim bar on extendable wire-loop brackets resting on the rim; 'rim-legs' = a flat slab raised
 *  on two clip legs; 'gooseneck' = a nano disc on a bendable neck from a screw clamp; 'submersible' = a stick on suction cups
 *  under the water. */
export type LightMount = 'bar' | 'rim-legs' | 'gooseneck' | 'submersible' | 'hanging';
/* 'hanging' (lane GL, 2026-10-27) = a compact reef fixture (about 10-16 in) on a rim arm or hanging kit over the water: one
 *  box per `coverageMm` of tank length (published coverage; absent = one fixture, and the light check says whether it carries). */
/** The LEDs as seen from below: `rows` of white dots (front to back), one accent dot in `every` (0 = none; a row index in
 *  `accentRow` = that whole row in the accents), 'rings' = one row of ring clusters (NICREW C10), 'disc' = a round head. */
export interface LightLeds { kind: 'dots' | 'rings' | 'disc'; rows: number; white: string; accents: string[]; every: number; accentRow?: number }
export interface LightLook { body: string; endcaps: string; legs: string; lens: string; leds: LightLeds; ledLook?: string; photo?: string }
export interface LightProduct {
  id: string; brand: string; model: string; mount: LightMount;
  /** the tank lengths it fits, mm (a bar's brackets slide out from its body to this) */
  fitMinMm: number; fitMaxMm: number;
  /** body length x width (front to back) x thickness, mm (gooseneck: the disc's diameter, the disc's thickness) */
  lengthMm: number; widthMm: number; heightMm: number;
  watts: number; tech: 'led-white' | 'led-planted' | 'led-reef';
  /** published PAR at the substrate; absent on all 18 (2026-10-20): the light model estimates it from the watts */
  par?: number; kelvin?: number;
  /** hanging fixtures: the tank length one unit covers (mm, published) and its beam angle (degrees, when published) */
  coverageMm?: number; beamDeg?: number;
  spectrum?: string; controller?: string; water?: 'fresh' | 'salt';
  priceUsd?: number; url: string; priceUrl?: string; asOf: string;
  est?: string[]; colors: LightLook; colorsEst?: string[]; names?: string[];
  popularity?: Popularity; note?: string;
}
export const LIGHT_PRODUCTS = ((data as unknown as { lights?: LightProduct[] }).lights ?? []);
export const lightProduct = (id?: string) => (id ? LIGHT_PRODUCTS.find(p => p.id === id) : undefined);
/** The lights that fit a tank `lengthMm` long (fitMinMm..fitMaxMm), most popular (lowest Amazon rank) first. */
export function lightsFor(lengthMm: number): LightProduct[] {
  const rank = (p: LightProduct) => Number(/#(\d+)/.exec(p.popularity?.evidence ?? '')?.[1] ?? 999);
  return LIGHT_PRODUCTS.filter(p => lengthMm >= p.fitMinMm && lengthMm <= p.fitMaxMm).sort((a, b) => rank(a) - rank(b));
}

// ---- pumps (lane GP, 2026-10-27): the Amazon air pumps, powerheads and wavemakers (research/gear-popular/pumps.md)

/** 'air' = an air pump (airstone, sponge filter); 'powerhead' = a circulation pump or a wave maker with steady flow; 'wavemaker' =
 *  one whose listing describes a wave / pulse controller (the only kind that counts for the Wavemaker row). */
export type PumpKind = 'air' | 'powerhead' | 'wavemaker';
export interface PumpProduct {
  id: string; brand: string; model: string; kind: PumpKind; watts: number;
  /** water pumps: rated flow, gal/h */ gph?: number;
  /** air pumps: outlets, listed air flow (gal/h, or litres a minute where the listing gives that), water depth rating in inches */
  outlets?: number; airGph?: number; airLpm?: number; depthIn?: number;
  /** the tank sizes the listing rates it for */ galMin?: number; galMax?: number;
  /** the loudest figure the listing gives, dB */ dB?: number;
  /** a wave / pulse controller comes with it */ controller?: boolean;
  /** listed size (L x W x H) as w across, d long, h tall, mm; absent on air pumps whose page gives none */ bodyMm?: { w: number; d: number; h: number };
  priceUsd: number; url: string; asOf: string; est?: string[];
  /** colours sampled from the listing photo: the body, and an accent (a knob, a nozzle) */ colors: { body: string; accent?: string }; colorsEst?: string[];
  names?: string[]; note?: string; popularity?: Popularity;
}
export const PUMP_PRODUCTS = ((data as unknown as { pumps?: PumpProduct[] }).pumps ?? []);
export const pumpProduct = (id?: string) => (id ? PUMP_PRODUCTS.find(p => p.id === id) : undefined);
/** The gear parts (tech.json gear) a pump product stands in for, and the product kinds each accepts (a wavemaker also runs as a powerhead). */
export const PUMP_GEAR_KINDS: Record<string, PumpKind[]> = { airpump: ['air'], powerhead: ['powerhead', 'wavemaker'], wavemaker: ['wavemaker'] };
/** The pumps a gear part may be, those rated for a tank of `gal` gallons first (a rating the listing does not give counts as fitting), then by price. */
export function pumpsFor(gear: string, gal: number): PumpProduct[] {
  const kinds = PUMP_GEAR_KINDS[gear] ?? [], off = (p: PumpProduct) => (p.galMin !== undefined && gal < p.galMin) || (p.galMax !== undefined && gal > p.galMax) ? 1 : 0;
  return PUMP_PRODUCTS.filter(p => kinds.includes(p.kind)).sort((a, b) => off(a) - off(b) || a.priceUsd - b.priceUsd);
}
/** Whether the listing rates the pump for a tank of `gal` gallons: true / false, undefined when it gives no range. */
export const pumpRatedFor = (p: PumpProduct, gal: number): boolean | undefined => (p.galMin === undefined && p.galMax === undefined ? undefined : !((p.galMin !== undefined && gal < p.galMin) || (p.galMax !== undefined && gal > p.galMax)));
// ---- reef and planted gear (lane GX, 2026-10-27): protein / surface skimmers, UV, CO2, auto top-off, chillers, read from Amazon
// listings. A spec the listing does not give is absent and named in `needSpec`; est lists fields that are estimates.

export interface GearListing {
  id: string; brand: string; model: string; priceUsd?: number; url: string; asOf: string;
  est?: string[]; needSpec?: string[]; note?: string; popularity?: Popularity;
  /** part colours (hex) as far as the listing says; `colorsEst` the ones not seen in a photo */
  colors?: { body: string; cup?: string }; colorsEst?: string[];
  watts?: number;
}
/** hob = hang-on / clip-on, sump = in-sump, surface = a freshwater-and-marine surface (film) skimmer. */
export interface SkimmerProduct extends GearListing {
  kind: 'hob' | 'sump' | 'surface';
  /** the maker's rated tank, gallons; protein skimmers are rated for about 1.5-2 times the tank they really keep (SKIM_RATED_K) */
  ratedGal?: number; gph?: number; dimsMm?: { w: number; d: number; h: number };
}
export interface UvProduct extends GearListing {
  kind: 'internal' | 'inline'; galMin?: number; galMax?: number; bulbHours?: number; dimsMm?: { w: number; d: number; h: number };
}
export interface Co2Product extends GearListing {
  /** regulator = a regulator for a cylinder bought separately; cartridge = a disposable-cartridge desktop kit; diy = a yeast generator */
  kind: 'regulator' | 'cartridge' | 'diy'; stages?: number; cartridgeG?: number; lastsDays?: number; bottleL?: number;
}
export interface AtoProduct extends GearListing { sensors?: number; pump?: string }
export interface ChillerProduct extends GearListing {
  kind: 'fan' | 'compressor'; hp?: string; ratedGal?: number; suitsGal?: number;
  /** cooling a fan gives, deg F (min, max); a compressor's drop, deg F (one number or min-max) */
  coolF?: [number, number]; dropF?: number | [number, number]; noiseDb?: [number, number];
}
const reef = data as unknown as { skimmers?: SkimmerProduct[]; uv?: UvProduct[]; co2?: Co2Product[]; ato?: AtoProduct[]; chillers?: ChillerProduct[] };
export const SKIMMER_PRODUCTS = reef.skimmers ?? [];
export const UV_PRODUCTS = reef.uv ?? [];
export const CO2_PRODUCTS = reef.co2 ?? [];
export const ATO_PRODUCTS = reef.ato ?? [];
export const CHILLER_PRODUCTS = reef.chillers ?? [];
export type ReefProduct = SkimmerProduct | UvProduct | Co2Product | AtoProduct | ChillerProduct;
/** The Tech rows that take a catalogue product (TechSetup.products), with their products. */
export const REEF_ROWS: Record<string, ReefProduct[]> = { skimmer: SKIMMER_PRODUCTS, surfskim: SKIMMER_PRODUCTS, uv: UV_PRODUCTS, co2: CO2_PRODUCTS, ato: ATO_PRODUCTS, chiller: CHILLER_PRODUCTS };
/** A protein skimmer's rating is for about this many times the tank it keeps clean (Nathan's brief: 1.5 to 2). A surface skimmer is rated for its tank. */
export const SKIM_RATED_K = 1.75;
/** The tank size a skimmer really suits, gallons (undefined: no rating read). */
export const skimmerSuitsGal = (p: SkimmerProduct) => p.ratedGal === undefined ? undefined : p.kind === 'surface' ? p.ratedGal : p.ratedGal / SKIM_RATED_K;
/** The catalogue product a Tech row's saved id names, only when it belongs to that row's chosen option kind (the picker's rule). */
export function reefProduct(row: string, id?: string): ReefProduct | undefined { return id ? REEF_ROWS[row]?.find(p => p.id === id) : undefined; }
/** Which products a row's option offers: skimmer hob / sump, surface, UV, CO2 by option, ATO, chiller fan / compressor. */
export function reefOptionProducts(row: string, opt: string): ReefProduct[] {
  const all = REEF_ROWS[row] ?? [];
  const kinds: Record<string, string> = { 'skimmer.hob': 'hob', 'skimmer.sump': 'sump', 'surfskim.surface': 'surface', 'co2.pressurized': 'regulator', 'co2.cartridge': 'cartridge', 'co2.diy': 'diy', 'chiller.fan': 'fan', 'chiller.chiller': 'compressor', 'uv.uv': '' };
  const k = kinds[`${row}.${opt}`];
  if (k === undefined) return row === 'ato' && opt === 'ato' ? all : [];
  return k ? all.filter(p => (p as { kind?: string }).kind === k) : all;
}
