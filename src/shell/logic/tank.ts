// UI2 shell step 3 (lane S3, 2026-11-13): the Tank section's view-models and edits (screen map §2a "Section Tank", §3 rows "Tank shape,
// size, glass, rim", "Which tank", "Custom tank price"). Pure: no DOM. The components in ../tank*.tsx only draw these and call the edits.
// Engine calls go through scene/tankEdit.ts (P1), scene/customTanks.ts (P9) and the pure picker logic of ui/tankDockLogic.ts (ST1).
import { BACKGROUNDS, STAND_FINISHES } from '../../render/build';
import { defaultSetup } from '../../scene/defaults';
import { tankRowPrice } from '../../demand/prices';
import { getTankModel, modelOfVariant, outerOf, pickRimless, saleLive, soleProduct, tankFromModel, tankSaleFor, variantByKey, variantName, type TankModel, type TankVariant } from '../../data/tanks';
import { dockGroups, optKey, previewSetup, rangeText, isBundle, type DockOpt } from '../../ui/tankDockLogic';
import { applyTankPick } from '../../ui/tankPick';
import { applyTankEdit, flatEnds } from '../../scene/tankEdit';
import { autoName, refOf, specOfSetup, newerVersion, libraryLost, type CustomTank, type CustomTankSpec } from '../../scene/customTanks';
import { productOf, productName, locksOf as kitLocks } from '../../scene/integrated';
import { isLocked } from '../../scene/locks';
import { placementOf } from '../../scene/placement';
import { tankKind, type SetupKind } from '../../scene/pickerKind';
import { glassThickness, volume, waterY, ceilingH, IN } from '../../scene/physics';
import { SHAPES, shapeOf, volumeBetween } from '../../scene/shape';
import { spaceFit } from '../../scene/space';
import { tankWeight } from '../../scene/weight';
import { adaptToTank } from '../../scene/reeval';
import { bareTech } from '../../scene/tech';
import type { Scene, Tank, TankSetup, TankShape } from '../../scene/types';

export type Units = Scene['units'];
const KG_LB = 2.20462;

/** A length in the scene's units: "48 in" / "121.9 cm". */
export const len = (mm: number, u: Units) => u === 'in' ? `${+(mm / IN).toFixed(1)} in` : `${+(mm / 10).toFixed(1)} cm`;
/** L x D x H: "36 × 18 × 16 in". */
export const dims = (T: Pick<Tank, 'L' | 'D' | 'H'>, u: Units) => u === 'in'
  ? `${+(T.L / IN).toFixed(1)} × ${+(T.D / IN).toFixed(1)} × ${+(T.H / IN).toFixed(1)} in`
  : `${+(T.L / 10).toFixed(1)} × ${+(T.D / 10).toFixed(1)} × ${+(T.H / 10).toFixed(1)} cm`;
export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const gal = (T: Tank) => volume(T).gallons;
export const galText = (g: number) => `${g < 10 ? +g.toFixed(1) : Math.round(g)} gal`;
/** Glass thickness as people say it: "3/8 in" (US stock) or "10 mm". */
export function glassText(mm: number, u: Units): string {
  if (u !== 'in') return `${Math.round(mm)} mm`;
  const e = mm / IN, n = Math.round(e * 16);
  if (Math.abs(e * 16 - n) > 0.08) return `${+e.toFixed(2)} in`;
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a), d = g(n, 16);
  return n === 16 ? '1 in' : `${n / d}/${16 / d} in`;
}

/** The shape words of the new shell. Box / Corner / Round up front; Bow and the rarer shapes under More (Nathan 2026-11-13: few people
 *  build a bowfront, but old saves and owned tanks still need it, so it stays one click away). */
export const SHAPE_WORD: Record<TankShape, string> = { rect: 'Box', bow: 'Bow', pie: 'Corner', round: 'Round', poly: 'Polygon', bowl: 'Bowl', arch: 'Curved front' };
export const SHAPE_MAIN: TankShape[] = ['rect', 'pie', 'round'];
export const SHAPE_MORE: TankShape[] = ['bow', 'poly', 'bowl', 'arch'];
export const shapeLong = (s: TankShape) => SHAPES[s];

// ---------------------------------------------------------------- Tank model card

export interface ModelCard {
  kind: 'commercial' | 'custom';
  title: string;
  /** "Commercial tank · $139" / "Custom tank · your figure $520" */
  sub: string;
  /** the group's one-line summary: "Commercial · 40 gal breeder" */
  sum: string;
  rows: [string, string][];
  note: string;
  /** the library has a newer version of this custom tank */
  newer?: CustomTank;
  /** the library entry this setup came from was deleted */
  lost: boolean;
  /** this custom tank is in the library (Edit edits that entry) */
  libId?: string;
  locked: boolean;
}

/** Filled weight in pounds of a setup's tank: water to the full line, glass, substrate (scene/weight.ts). */
export const filledLb = (S: TankSetup) => tankWeight({ ...S, water: { ...S.water, on: true, level: 1 } }).total * KG_LB;

function glassRim(S: TankSetup, u: Units) {
  const t = glassThickness(S.tank, S.render.glass);
  return `${glassText(t, u)} ${S.render.glassType === 'lowiron' ? 'low-iron' : 'float'} · ${S.render.rim ? 'rimmed' : 'rimless'}`;
}

/** What the Tank model group shows: a commercial tank read-only, or a custom one with Edit (§2a, mockup 01). */
export function modelCard(S: TankSetup, u: Units, lib: readonly CustomTank[]): ModelCard {
  const T = S.tank, g = gal(T), locked = isLocked(S, 'tank');
  const rows: [string, string][] = [['Shape', SHAPE_WORD[shapeOf(T)]], ['Size', `${dims(T, u)} · ${galText(g)}`], ['Glass, rim', glassRim(S, u)]];
  const lb = Math.round(filledLb(S) / 10) * 10;
  if (S.product || S.integrated) {
    const pv = productOf(S), name = productName(S) || 'Commercial tank', v = pv?.v ?? (pv ? soleProduct(pv.m) : undefined);
    const price = v?.price_usd != null ? usd(saleLive(v) ? v.price_usd : v.regular_usd ?? v.price_usd) : (tankRowPrice(g) ? `about ${usd(tankRowPrice(g)!.mode)}` : '');
    return { kind: 'commercial', title: name, sub: `Commercial tank${price ? ' · ' + price : ''}`, sum: `Commercial · ${pv?.m.name ?? name}`, rows,
      note: `A commercial tank's size and build are fixed. About ${lb} lb filled.`, lost: false, locked };
  }
  const c = S.customTank, name = c?.name ?? autoName(T), own = c?.priceUsd;
  const libId = c?.id && lib.some(e => e.id === c.id) ? c.id : undefined;
  return { kind: 'custom', title: name, sub: `Custom tank${own != null ? ` · your figure ${usd(own)}` : ''}${c?.owned ? ' · owned' : ''}`, sum: `Custom · ${galText(g)}`, rows,
    note: `Your own size and build. About ${lb} lb filled.`, newer: newerVersion(S, lib), lost: libraryLost(S, lib), libId, locked };
}

// ---------------------------------------------------------------- group summaries (§1a: every group folds to one line)

export function sitsOnSummary(S: TankSetup, u: Units): string {
  const p = placementOf(S);
  if (p === 'floor') return S.stand.need === 'ask' ? 'Not chosen yet' : 'The floor';
  if (p === 'furniture') return `My own furniture, ${len(S.stand.height, u)}`;
  return `${S.stand.style === 'frame' ? 'Open frame' : S.stand.style === 'custom' ? 'Custom stand' : 'Cabinet'}, ${STAND_FINISHES[S.stand.finish].label.toLowerCase()}`;
}
export const LIDS: [TankSetup['lid'], string][] = [['open', 'Open'], ['glass', 'Glass lid'], ['mesh', 'Mesh'], ['hood', 'Hood']];
export function lidSummary(S: TankSetup): string {
  const l = LIDS.find(x => x[0] === S.lid)?.[1] ?? S.lid;
  return S.doors ? `${l} · ${S.doors} doors` : l;
}
export function bgSummary(S: TankSetup): string {
  const b = S.render.bg, n = S.render.bgSides.length;
  if (b === 'none') return 'None';
  return `${BACKGROUNDS[b].label}, ${n === 1 ? S.render.bgSides[0] : `${n} sides`}`;
}
export function roomSummary(S: TankSetup, u: Units): string {
  const wall = S.wall.show ? `Wall ${S.wall.side === 'back' ? 'behind' : S.wall.side === 'corner' ? 'in a corner' : `at the ${S.wall.side}`}` : 'No wall';
  const ceil = S.wall.show ? ` · ${u === 'in' ? `${Math.round(ceilingH(S.wall) / 304.8 * 10) / 10} ft` : `${(ceilingH(S.wall) / 1000).toFixed(1)} m`} ceiling` : '';
  const me = S.person.show ? ` · you, ${heightText(S.person.height, u)}` : '';
  return wall + ceil + me;
}
/** A person's height: 5 ft 9 in / 175 cm. */
export function heightText(mm: number, u: Units): string {
  if (u !== 'in') return `${Math.round(mm / 10)} cm`;
  const i = Math.round(mm / IN); return `${Math.floor(i / 12)} ft ${i % 12} in`;
}

// ---------------------------------------------------------------- the docked picker (§2a: Custom tanks / Commercial tanks, both closed at first)

export interface PickRow {
  key: string;
  name: string;
  /** "Bow front · 48 × 18 × 24 in · 62 gal · rimless" */
  meta: string;
  price?: string;
  /** a commercial tank's finished-tank range (lane FR1) */
  range?: string;
  inUse: boolean;
  owned: boolean;
  locked: boolean;
  custom?: CustomTank;
  opt?: DockOpt;
}

const customKey = (e: CustomTank) => `custom:${e.id}`;
export function customRows(S: TankSetup, lib: readonly CustomTank[], u: Units, q = ''): PickRow[] {
  const n = q.trim().toLowerCase();
  return lib.filter(e => !n || e.name.toLowerCase().includes(n)).map(e => {
    const inUse = !S.product && !S.integrated && S.customTank?.id === e.id;
    return { key: customKey(e), name: e.name, custom: e, inUse, owned: !!e.owned, locked: inUse && isLocked(S, 'tank'),
      meta: `${SHAPE_WORD[shapeOf(e.tank)]} · ${dims(e.tank, u)} · ${galText(gal(e.tank))} · ${e.rim ? 'rimmed' : 'rimless'}`,
      ...(e.priceUsd != null ? { price: `${usd(e.priceUsd)} yours` } : {}) };
  });
}
export const customLine = (lib: readonly CustomTank[]) => lib.length ? lib.slice(0, 3).map(e => e.name).join(', ') + (lib.length > 3 ? ', …' : '') : 'none yet';

/** Size chips of the commercial group (mockup 06b). */
export type SizeChip = 'u20' | '20-40' | '40-75' | '75+';
export const SIZE_CHIPS: [SizeChip, string][] = [['u20', 'Under 20 gal'], ['20-40', '20-40'], ['40-75', '40-75'], ['75+', '75+']];
const inChip = (g: number, c: SizeChip) => c === 'u20' ? g < 20 : c === '20-40' ? g >= 20 && g < 40 : c === '40-75' ? g >= 40 && g < 75 : g >= 75;

/** The commercial tank in use, as the picker's key (or undefined for a custom tank). */
export function productKey(S: TankSetup): string | undefined {
  const pr = S.product, m = pr && getTankModel(pr.model), v = m && pr.key ? variantByKey(m, pr.key) : undefined;
  return m ? optKey(m, v) : undefined;
}

export interface Commercial { rows: PickRow[]; total: number; /** no space set in Constraints: "Fits my space" cannot filter */ noSpace: boolean }
/** Every catalogue choice for the setup's kind (bare tanks first, then kits and bundles), filtered by the search, size chips and "Fits my space". */
export function commercialRows(S: TankSetup, _u: Units, o: { q?: string; chips?: ReadonlySet<SizeChip>; fits?: boolean; now?: number } = {}): Commercial {
  const kind: SetupKind = tankKind(S), groups = dockGroups(kind, o.q ?? '', o.now), inUse = productKey(S), space = S.layout.space;
  const all = groups.flatMap(g => g.bands.flatMap(b => b.opts));
  const chips = o.chips ?? new Set<SizeChip>();
  const rows = all.filter(x => (!chips.size || [...chips].some(c => inChip(x.gal, c))) && (!o.fits || !space || spaceFit(optTank(x), space).fits)).map(x => {
    const rim = pickRimless(x.m, x.v) ? 'rimless' : 'rimmed', kit = x.v && isBundle(x.v) ? ' · kit' : '';
    const price = x.usd == null ? undefined : `${x.typical ? '~' : ''}${usd(x.usd)}${x.v && saleLive(x.v) ? ' sale' : ''}`;
    return { key: x.key, name: x.v ? x.name : `${x.m.name}${x.typical ? ' (any maker)' : ''}`, meta: `${x.dims.replace(/×/g, ' × ')} in · ${rim}${kit}`,
      ...(price ? { price } : {}), ...(x.range ? { range: rangeText(x.range) } : {}),
      inUse: x.key === inUse, owned: false, locked: x.key === inUse && isLocked(S, 'tank'), opt: x };
  });
  return { rows, total: all.length, noSpace: !space };
}
/** The interior tank a catalogue choice gives. */
export function optTank(o: DockOpt): Tank { const v = o.v ?? soleProduct(o.m); return tankFromModel(v ? modelOfVariant(o.m, v) : o.m); }
export function commercialLine(S: TankSetup, total: number): string {
  const pv = productOf(S);
  return `${total} · fixed size and build${pv ? ` · in use: ${pv.v ? variantName(pv.v) : pv.m.name}` : ''}`;
}

/** What a highlighted row draws in the room: the setup with that tank, on a COPY (the viewer's preview; the scene is not edited). */
export function previewRow(base: TankSetup, r: PickRow): TankSetup {
  return r.opt ? previewSetup(base, r.opt) : previewSpec(base, r.custom!);
}
/** The setup with a custom tank spec in it, on a COPY: the picker's custom rows and the maker's "Preview in my setup". */
export function previewSpec(base: TankSetup, e: CustomTankSpec): TankSetup {
  const p = structuredClone(base);
  if (p.fish.length || p.items.length) adaptToTank(p, structuredClone(e.tank), { thin: false }); else p.tank = structuredClone(e.tank);
  p.render.glass = e.glass; p.render.glassType = e.glassType; p.render.rim = e.rim; delete p.product; delete p.integrated;
  return p;
}

/** A sale picked from the catalogue, remembered so a later resize can say the sale price no longer applies (demand/pinned.ts). */
export function saleOf(m: TankModel, v?: TankVariant): { product: string; retailer: string; usd: number } | undefined {
  if (v) return saleLive(v) && v.price_usd != null ? { product: variantName(v), retailer: v.retailer ?? 'a retailer', usd: v.price_usd } : undefined;
  const t = tankSaleFor(m.ratedGal, m.shape, Date.now(), undefined, undefined, tankFromModel(m));
  return t && { product: t.product, retailer: t.retailer, usd: t.usd };
}

/** Choose a commercial tank: the old shell's library pick (panels.ts applyPick), size + glass + the product's rim, lid, kit and stand. */
export function chooseCommercial(s: TankSetup, o: DockOpt): void {
  const v = o.v ?? soleProduct(o.m), mm = v ? modelOfVariant(o.m, v) : o.m;
  applyTankEdit(s, () => tankFromModel(mm), { glass: mm.glassMm, also: t => { applyTankPick(t, o.m, v); delete t.customTank; }, thin: true });
}

/** Choose a custom tank from the library: the setup gets its own copy (P9 useCustomTank's fields), the scene fits to it (P1 applyTankEdit). */
export function chooseCustom(s: TankSetup, e: CustomTank): void {
  applyTankEdit(s, () => structuredClone(e.tank), {
    // useCustomTank's fields, without the tank itself: applyTankEdit moves the fish and pieces from the old tank to the new one
    also: t => { t.render.glass = e.glass; t.render.glassType = e.glassType; t.render.rim = e.rim; t.customTank = refOf(e); delete t.product; delete t.integrated; },
    thin: true,
  });
  if (!flatEnds(s.tank) && s.lid === 'hood') s.lid = 'glass';
}

/** Lid buttons a commercial kit holds (its own lid / doors) and which shapes can take a hood. */
export function lidHeld(S: TankSetup): { lid: boolean; doors: boolean } {
  const k = kitLocks(S);
  return { lid: !!k?.lid, doors: !!k?.doors };
}

// ---------------------------------------------------------------- the custom tank maker (§2a "Custom tank maker", mockup 07)

export interface MakerFacts { gross: number; water: number; lb: number; footprint: string; L: string; D: string; H: string; bow?: string }
/** The chips under the maker's view: gallons (gross, and water to the line), filled pounds, outer footprint. */
export function makerFacts(spec: CustomTankSpec, u: Units): MakerFacts {
  const T = spec.tank, t = glassThickness(T, spec.glass), o = outerOf(T, t);
  const S = makerSetup(spec);
  const water = volumeBetween(T, 0, waterY(T, 1)) / 1e6 / 3.785411784;
  return { gross: gal(T), water, lb: filledLb(S), footprint: u === 'in' ? `${+(o.L / IN).toFixed(1)} × ${+(o.D / IN).toFixed(1)} in` : `${+(o.L / 10).toFixed(1)} × ${+(o.D / 10).toFixed(1)} cm`,
    L: len(T.L, u), D: len(T.D, u), H: len(T.H, u), ...(shapeOf(T) === 'bow' && T.bowMin != null ? { bow: len(T.D - T.bowMin, u) } : {}) };
}

/** The maker's own scratch setup: the tank on a plain floor, empty (no water, ground, stand, gear, scape, wall or person). Drawn as a
 *  view-only preview; the setup itself is never edited while the maker is open. */
export function makerSetup(spec: CustomTankSpec, base?: TankSetup): TankSetup {
  const S = structuredClone(base ?? defaultSetup());
  S.tank = structuredClone(spec.tank);
  S.render = { ...S.render, glass: spec.glass, glassType: spec.glassType, rim: spec.rim, bg: 'none', bgSides: [], bgImages: [] };
  S.fish = []; S.items = []; delete S.patches; S.terrain = { ...S.terrain, on: false, h: [], pools: [] };
  S.substrate = { ...S.substrate, show: false };
  S.water = { ...S.water, on: true, level: 0 };
  S.stand = { ...S.stand, show: false, need: 'none' };
  S.wall = { ...S.wall, show: false }; S.person = { ...S.person, show: false };
  S.backdrop = { ...S.backdrop, kind: 'none' }; S.lid = 'open'; delete S.doors;
  S.light = { ...S.light, type: 'flat', product: undefined, room: 0.9, roomAuto: false }; // 'flat' = no fixture drawn (render/lighting.ts addFixture)
  delete S.product; delete S.integrated; delete S.locks;
  S.tech = bareTech(S); // no filter, heater, light or other gear: every row that can be 'none' is
  return S;
}

/** The maker's starting spec: the setup's own tank (Edit), a copy of the commercial one ("Make a custom tank from this"), or the setup's
 *  size for a new tank. */
export function startSpec(S: TankSetup, how: 'edit' | 'copy' | 'new', lib: readonly CustomTank[]): { spec: CustomTankSpec; libId?: string } {
  const base = specOfSetup(S);
  if (how === 'edit') {
    const id = S.customTank?.id, e = id ? lib.find(x => x.id === id) : undefined;
    return e && !newerVersion(S, lib) ? { spec: specOfEntry(e), libId: e.id } : { spec: base, ...(e ? { libId: e.id } : {}) };
  }
  if (how === 'copy') return { spec: { ...base, name: `${autoName(S.tank)} (from ${productName(S)})`, owned: false, priceUsd: undefined } };
  // a new custom tank starts as what people usually have built: a glass box, rimless, at the setup's length / depth / height (Nathan 2026-11-13)
  const tank: Tank = { L: S.tank.L, D: S.tank.D, H: S.tank.H };
  return { spec: { name: autoName(tank), tank, glass: 'auto', glassType: base.glassType, rim: false } };
}
export const specOfEntry = (e: CustomTank): CustomTankSpec => { const { id: _i, version: _v, updated: _u, ...s } = e; return structuredClone(s); };

export interface PriceView { estimate: number | null; how: string; own: boolean }
/** "Our estimate" and its one-line "how" (§3 "Custom tank price"); the engine's estimate is the catalogue price of a stock tank this size. */
export function priceView(spec: CustomTankSpec): PriceView {
  const g = gal(spec.tank), r = tankRowPrice(g);
  const extras = [shapeOf(spec.tank) !== 'rect' ? `${SHAPE_WORD[shapeOf(spec.tank)].toLowerCase()} shape` : '', 'glass thickness', spec.glassType === 'lowiron' ? 'low-iron' : '', !spec.rim ? 'rimless' : ''].filter(Boolean);
  return { estimate: r ? r.mode : null, own: spec.priceUsd != null,
    how: r ? `How we got this: the typical price of a stock ${galText(g)} tank. Not counted yet: ${extras.join(', ')}.` : 'No stock tank of this size to price it from: use your own price.' };
}

/** Sliders' ranges in the scene's units (the field takes any value inside LIMITS). */
export const SIDE_RANGE: Record<'L' | 'D' | 'H', [number, number]> = { L: [6 * IN, 120 * IN], D: [6 * IN, 48 * IN], H: [6 * IN, 48 * IN] };

/** Is a maker spec any different from where it started (Cancel asks only then)? */
export const specChanged = (a: CustomTankSpec, b: CustomTankSpec) => JSON.stringify(a) !== JSON.stringify(b);

/** The `Tank` a setup gets from a library entry, for tests and the setup card. */
export const entryTank = (e: CustomTank): Tank => structuredClone(e.tank);

// ---------------------------------------------------------------- groups remember open / closed per browser (§1a.3)

export type TankGroup = 'model' | 'sits' | 'lid' | 'bg' | 'room' | 'custom' | 'commercial';
const GROUP_KEY = 'tanklook.ui2.groups';
/** Tank model open, the rest closed (mockup 01); the picker's two groups both closed (Nathan 11-13). */
export const GROUP_DEFAULT: Record<TankGroup, boolean> = { model: true, sits: false, lid: false, bg: false, room: false, custom: false, commercial: false };
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const ls = (): KV | undefined => { try { return (globalThis as { localStorage?: KV }).localStorage; } catch { return undefined; } };
export function loadGroups(store: KV | undefined = ls()): Record<TankGroup, boolean> {
  try { const j = JSON.parse(store?.getItem(GROUP_KEY) ?? '{}'); const out = { ...GROUP_DEFAULT }; for (const k of Object.keys(out) as TankGroup[]) if (typeof j[k] === 'boolean') out[k] = j[k]; return out; } catch { return { ...GROUP_DEFAULT }; }
}
export function saveGroups(g: Record<TankGroup, boolean>, store: KV | undefined = ls()): void { try { store?.setItem(GROUP_KEY, JSON.stringify(g)); } catch { /* blocked storage: forget */ } }
