// Budget / As designed / Luxury (lane BL1, Nathan 2026-11-03: a Malawi rockscape of dragon stone cost $1,797; "holey limestone being the classic,
// cheaper Malawi rock would be great to include in a luxury vs budget build so the user can see the visual difference").
// Pure: the Budget and Luxury versions of the SAME design. The tank, the pieces' positions and sizes, the animals and the layout never change;
// only the materials (rock, wood, plants, ground) and the gear picks do. Every swap is checked against the demand engine's own price and kept only
// when it moves the right way (Budget never costs more than the design, Luxury never less), and each one says how honest the drawn texture is.
//
// Water rules (never traded for price): limestone (holey, lace) dissolves, so it is offered only where hard water is right (a look tagged hard or
// brackish, never one that also names soft or marine water) and only while no animal in the tank needs soft water; aquasoil lowers pH, so it is
// never put under a hard-water look or a hard-water animal. A swap that fails these is simply not made.
import { archetype } from './archetypes';
import { visionOf } from './brief';
import { CHEM } from '../data/waterchem';
import { LIBRARY } from './items';
import { groundVolume, isTerraSub, pieceKg } from './setupsheet';
import { filterUnits, heatLoss, heaterUnits, techOf, withUnits } from './tech';
import { filtersNear, filterProduct, heatersNear, genericHeaterW, listedPrice, productName } from '../data/gearCatalog';
import { volume } from './physics';
import { demandOf, type DemandOpts } from '../demand/engine';
import { mean3 } from '../demand/range';
import { defaultProfile, type UserProfile } from '../demand/types';
import type { Item, SubstrateBlend, TankSetup } from './types';

export type Tier = 'budget' | 'designed' | 'luxury';
export const TIERS: readonly Tier[] = ['budget', 'designed', 'luxury'];
export const TIER_LABEL: Record<Tier, string> = { budget: 'Budget', designed: 'As designed', luxury: 'Luxury' };
export type SwapGroup = 'rock' | 'wood' | 'plants' | 'ground' | 'gear';
/** How well the drawn piece matches the named material: 'close' = the library's own texture for it, 'nearest' = the library has none, so the closest one is drawn (and the text says so). */
export type Match = 'close' | 'nearest';
export interface Swap { group: SwapGroup; from: string; to: string; n: number; match: Match; text: string }
export interface TierLine { key: string; label: string; usd: number; note?: string }
export interface TierResult { tier: Tier; scene: TankSetup; swaps: Swap[]; setupUsd: number; lines: TierLine[] }
export interface TierOpts { archetypeId?: string; P?: UserProfile; now?: number; /** extra demand-engine options (lane FR1: the catalogue's tank price) */ demand?: DemandOpts; /** swap groups to leave alone (lane FR1: a semi-professional range keeps the gear it was built with, not the dearest rated product) */ skip?: SwapGroup[] }

const usd0 = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const nameOf = (v: string) => LIBRARY[v]?.label ?? v;
const isSalt = (S: TankSetup) => S.water.on && !!S.water.salt;

// ---------------------------------------------------------------------------------------------------------------- water rules
/** The look's chemistry tags: from the archetype named, else the one in the scene's brief. */
function chemTags(S: TankSetup, archetypeId?: string): readonly string[] {
  const id = archetypeId ?? (S.brief ? visionOf(S.brief).archetypeId : undefined);
  return (id ? archetype(id)?.tags.chem : undefined) ?? [];
}
const chemOf = (sp: string) => CHEM[sp];
/** An animal that needs soft water (its preferred pH tops out under 7.2) or hard (its pH floor is 7.0 or more). */
const needsSoft = (S: TankSetup) => S.fish.some(f => { const c = chemOf(f.species); return !!c && c.ph[1] < 7.2; });
const needsHard = (S: TankSetup) => S.fish.some(f => { const c = chemOf(f.species); return !!c && c.ph[0] >= 7.0; });
/** Limestone buffers pH and hardness up: right for a rift-lake or brackish look, wrong for anything that names soft or marine water or keeps a soft-water animal. */
export function limestoneOk(S: TankSetup, archetypeId?: string): boolean {
  if (!S.water.on || isSalt(S)) return false;
  const tags = chemTags(S, archetypeId);
  // a design with no named look (built by hand): limestone only when every animal in it is a documented hard-water one
  if (!tags.length) return S.fish.length > 0 && S.fish.every(f => { const c = chemOf(f.species); return !!c && c.ph[0] >= 7.0; });
  if (!(tags.includes('hard') || tags.includes('brackish')) || tags.includes('soft') || tags.includes('marine')) return false;
  return !needsSoft(S);
}
/** Aquasoil lowers pH and softens the water: never under a hard-water or brackish look, never with an animal that needs hard water. */
export function aquasoilOk(S: TankSetup, archetypeId?: string): boolean {
  if (!S.water.on || isSalt(S) || isTerraSub(S.substrate.type)) return false;
  const tags = chemTags(S, archetypeId);
  if (tags.includes('hard') || tags.includes('brackish') || tags.includes('marine')) return false;
  return !needsHard(S);
}

// ---------------------------------------------------------------------------------------------------------------- the swap tables
/** Rock. Budget: the pitted clay-brown dragon stone becomes Texas holey limestone (with lace rock for every third piece, as a budget buyer mixes them) where hard
 *  water is right, else the nearest cheaper inert stone (lava rock). A limestone crag (seiryu) becomes holey limestone where hard water is right. Luxury: smooth
 *  river stone or lava rock become dragon stone (inert, clay-brown, pitted: not the same colour, so 'nearest'). Sizes and positions never change. */
function rockSwap(it: Item, i: number, tier: Tier, lime: boolean): { to: string; match: Match } | undefined {
  if (it.kind !== 'stone') return undefined;
  if (tier === 'budget') {
    if (it.variant === 'dragon') return lime ? { to: i % 3 === 2 ? 'lace' : 'holey', match: 'close' } : { to: 'lava', match: 'nearest' };
    if (it.variant === 'seiryu' && lime) return { to: 'holey', match: 'nearest' };
  } else if (tier === 'luxury') {
    if (it.variant === 'river' || it.variant === 'lava') return { to: 'dragon', match: 'nearest' };
  }
  return undefined;
}
/** Wood. Budget: manzanita (a fine-twigged tree, $32 a piece) becomes spider wood (thin pale roots, $20); Luxury: spider wood becomes manzanita. Neither is the other's look. */
const WOOD: Record<Exclude<Tier, 'designed'>, Record<string, string>> = { budget: { manzanita: 'spider' }, luxury: { spider: 'manzanita' } };
/** Plants. Budget: red stem plants (high light, CO2) become the plain green stem plant that grows in anything; Luxury: green stems become red ones where CO2 feeds them. */
const PLANTS: Record<Exclude<Tier, 'designed'>, Record<string, string>> = { budget: { stemred: 'stem', rotala: 'stem' }, luxury: { stem: 'stemred' } };

// ---------------------------------------------------------------------------------------------------------------- the ground (priced here, beside the engine)
/** The engine prices every ground at one default (about $1.20 a litre). The two grounds a tier can swap to or from are priced by their own published figure here:
 *  pool-filter sand (50 lb Quikrete $15.95-19.99 retail now, about 14 L, so about $1.1-1.4 a litre; $5-6 older, about $0.40 a litre) and aquasoil (ADA Amazonia about
 *  5.55 EUR a litre in Europe; Fluval Stratum $37 for 8.8 lb in this repo's demand-items row). */
export const GROUND_USD_PER_L = { engine: 1.2, poolsand: 0.9, aquasoil: 5 } as const;
export type GroundKind = keyof typeof GROUND_USD_PER_L;
const SOIL = '#2f2620', POOL = '#cbb894';
const PLANTED_LOOKS = new Set(['planted', 'iwagumi', 'nature', 'dutch', 'forest']);
const blend = (color: string): SubstrateBlend => ({ grain: color === POOL ? 'sand' : 'gravel', color, grain2: 'none', color2: '#6f6556', share: 30, mix: 0.5 });
const dark = (hex: string) => { const v = parseInt(hex.slice(1), 16); return ((v >> 16) & 255) + ((v >> 8) & 255) + (v & 255) < 200; };
export function groundKind(S: TankSetup): GroundKind {
  const s = S.substrate; if (!s.show || s.type !== 'custom') return 'engine';
  if (s.custom.grain === 'sand' && s.custom.grain2 === 'none' && s.custom.color.toLowerCase() === POOL) return 'poolsand';
  if (PLANTED_LOOKS.has(S.layout.id) && s.custom.grain !== 'sand' && dark(s.custom.color)) return 'aquasoil';
  return 'engine';
}
/** The dollars the ground's own price adds to the engine's flat one (the engine buys about 1.1 x the litres, for settling). */
const groundAdjust = (S: TankSetup) => (GROUND_USD_PER_L[groundKind(S)] - GROUND_USD_PER_L.engine) * (S.substrate.show ? groundVolume(S, 24).litres * 1.1 : 0);

// ---------------------------------------------------------------------------------------------------------------- price
const NOW = Date.UTC(2026, 10, 3);
function priced(S: TankSetup, o: TierOpts) {
  const D = demandOf(S, o.P ?? defaultProfile(), { now: o.now ?? NOW, ...o.demand });
  const raw = D.items.filter(c => c.setup).map(c => ({ key: c.key, label: c.label, usd: mean3(c.setup!) })), sum = raw.reduce((t, c) => t + c.usd, 0);
  const k = sum > 0 ? D.totals.setupUsd / sum : 1, adj = groundAdjust(S);
  const lines: TierLine[] = raw.map(c => ({ key: c.key, label: c.label, usd: c.usd * k }));
  if (adj) { const g = lines.find(l => l.key === 'substrate'); if (g) { g.usd += adj; g.label = `Substrate (${groundKind(S) === 'aquasoil' ? 'aquasoil' : 'pool-filter sand'}, priced by type)`; } }
  return { usd: D.totals.setupUsd + adj, lines };
}
export const setupUsdOf = (S: TankSetup, o: TierOpts = {}) => priced(S, o).usd;

// ---------------------------------------------------------------------------------------------------------------- gear
/** Budget: every bought filter / heater goes back to the generic part sized for the tank; Luxury: a generic one becomes the dearest catalogue product rated for the tank. Owned gear is never touched. */
function gearSwap(S: TankSetup, tier: Exclude<Tier, 'designed'>, part: 'filter' | 'heater', swaps: Swap[]) {
  const t0 = techOf(S);
  if (!S.water.on) return;
  let t = t0;
  const gal = volume(S.tank).gallons;
  const fu = filterUnits(t0), hu = heaterUnits(t0);
  if (part === 'filter' && fu.length) {
    let n = 0, label = '';
    const next = fu.map(u => {
      if (u.owned) return u;
      if (tier === 'budget') { if (!u.product) return u; n++; label = filterProduct(u.product) ? productName(filterProduct(u.product)!) : 'catalogue filter'; const { product: _p, ...rest } = u; return rest; }
      if (u.product) return u;
      const pick = filtersNear(u.kind, gal, 12).filter(f => listedPrice(f) && gal >= (f.galMin ?? 0) && gal <= (f.galMax ?? Infinity)).sort((a, b) => listedPrice(b)! - listedPrice(a)!)[0];
      if (!pick) return u; n++; label = productName(pick); return { ...u, product: pick.id };
    });
    if (n) { t = withUnits(t, 'filter', next); swaps.push({ group: 'gear', from: tier === 'budget' ? label : 'generic filter', to: tier === 'budget' ? 'generic filter sized for the tank' : label, n, match: 'close', text: tier === 'budget' ? 'A generic filter of the same kind and flow replaces the catalogue pick.' : `The dearest ${fu[0].kind} filter in the catalogue rated for ${Math.round(gal)} gal.` }); }
  }
  if (part === 'heater' && hu.length) {
    const h = heatLoss(S, t), each = h.units;
    let n = 0, label = '';
    const next = hu.map((u, i) => {
      if (u.owned) return u;
      const w = each[i]?.watts ?? u.w ?? h.needW / hu.length;
      if (tier === 'budget') { if (!u.product) return u; n++; label = u.product; const { product: _p, ...rest } = u; return { ...rest, w: u.w ?? w }; }
      if (u.product) return u;
      const g = genericHeaterW(w), pick = heatersNear(w, 24).filter(x => listedPrice(x) && genericHeaterW(x.watts) === g).sort((a, b) => listedPrice(b)! - listedPrice(a)!)[0];
      if (!pick) return u; n++; label = productName(pick); return { ...u, product: pick.id, w: pick.watts };
    });
    if (n) { t = withUnits(t, 'heater', next); swaps.push({ group: 'gear', from: tier === 'budget' ? 'catalogue heater' : 'generic heater', to: tier === 'budget' ? 'generic heater' : label, n, match: 'close', text: tier === 'budget' ? 'A generic heater of the same watts replaces the catalogue pick.' : 'The dearest catalogue heater of the same size class.' }); }
  }
  if (t !== t0) S.tech = t;
}

// ---------------------------------------------------------------------------------------------------------------- the tiers
type Step = (S: TankSetup, swaps: Swap[]) => void;
const retype = (S: TankSetup, swaps: Swap[], group: SwapGroup, pick: (it: Item, i: number) => { to: string; match: Match } | undefined, why: (from: string, to: string) => string) => {
  const tally = new Map<string, { from: string; to: string; n: number; match: Match }>();
  S.items.forEach((it, i) => {
    const p = pick(it, i); if (!p || p.to === it.variant) return;
    const k = `${it.variant}>${p.to}`, e = tally.get(k) ?? { from: it.variant, to: p.to, n: 0, match: p.match };
    e.n++; tally.set(k, e); it.variant = p.to;
  });
  for (const e of tally.values()) swaps.push({ group, from: nameOf(e.from), to: nameOf(e.to), n: e.n, match: e.match, text: why(e.from, e.to) });
};
function steps(tier: Exclude<Tier, 'designed'>, o: TierOpts): Step[] {
  return [
    (S, w) => { const lime = limestoneOk(S, o.archetypeId); let k = 0;
      retype(S, w, 'rock', it => it.kind === 'stone' ? rockSwap(it, k++, tier, lime) : undefined, (a, b) => b === 'holey' || b === 'lace'
        ? `${nameOf(b)} for ${nameOf(a)}: ${b === 'holey' ? 'pale, pitted, through-holes' : 'dark, rough and lacy'}; a limestone, so it hardens the water (right for this look).`
        : `${nameOf(b)} for ${nameOf(a)}: the library has no closer drawn material, so the colour and surface differ.`); },
    (S, w) => retype(S, w, 'wood', it => it.kind === 'wood' && WOOD[tier][it.variant] ? { to: WOOD[tier][it.variant], match: 'nearest' } : undefined, (a, b) => `${nameOf(b)} for ${nameOf(a)}: a different shape of wood, the nearest the library draws.`),
    (S, w) => { if (tier === 'luxury' && S.grow.feed !== 'co2') return;
      retype(S, w, 'plants', it => it.kind === 'plant' && PLANTS[tier][it.variant] ? { to: PLANTS[tier][it.variant], match: 'close' } : undefined, (a, b) => `${nameOf(b)} for ${nameOf(a)}.`); },
    (S, w) => {
      if (!S.water.on || isSalt(S) || !S.substrate.show) return;
      const k = groundKind(S);
      if (tier === 'budget' && k === 'aquasoil') { S.substrate = { ...S.substrate, type: 'custom', custom: blend(POOL) }; w.push({ group: 'ground', from: 'aquasoil', to: 'pool-filter sand', n: 1, match: 'close', text: 'Plain sand rooted plants can still use with root tabs; no nutrients of its own.' }); }
      else if (tier === 'luxury' && k === 'engine' && PLANTED_LOOKS.has(S.layout.id) && aquasoilOk(S, o.archetypeId) && !isTerraSub(S.substrate.type)) {
        S.substrate = { ...S.substrate, type: 'custom', custom: blend(SOIL) }; w.push({ group: 'ground', from: 'plain ground', to: 'aquasoil', n: 1, match: 'close', text: 'Nutrient-rich soil under the plants; it softens the water slightly.' });
      }
    },
    (S, w) => { if (!o.skip?.includes('gear')) gearSwap(S, tier, 'filter', w); },
    (S, w) => { if (!o.skip?.includes('gear')) gearSwap(S, tier, 'heater', w); },
  ];
}

/** One version of a scene. `designed` is the scene itself (priced the same way, so the three totals compare). Every step is kept only when it moves the price the right way. */
export function tierOf(S0: TankSetup, tier: Tier, o: TierOpts = {}): TierResult {
  let S = structuredClone(S0), cur = priced(S, o);
  const swaps: Swap[] = [];
  if (tier !== 'designed') for (const step of steps(tier, o)) {
    const T = structuredClone(S), w: Swap[] = [];
    step(T, w);
    if (!w.length) continue;
    const p = priced(T, o);
    if (tier === 'budget' ? p.usd <= cur.usd + 1e-6 : p.usd >= cur.usd - 1e-6) { S = T; cur = p; swaps.push(...w); }
  }
  return { tier, scene: S, swaps, setupUsd: cur.usd, lines: cur.lines };
}
export const tierPair = (S: TankSetup, o: TierOpts = {}) => ({ budget: tierOf(S, 'budget', o), designed: tierOf(S, 'designed', o), luxury: tierOf(S, 'luxury', o) });

// ---------------------------------------------------------------------------------------------------------------- the per-line price diff
export interface DiffLine { label: string; a: string; b: string; deltaUsd: number }
/** Lines whose price differs between two versions, biggest difference first; a line one side lacks reads "none". */
export function priceDiff(a: TierResult, b: TierResult): DiffLine[] {
  const keys = [...new Set([...a.lines, ...b.lines].map(l => l.key))], out: DiffLine[] = [];
  for (const k of keys) {
    const x = a.lines.find(l => l.key === k), y = b.lines.find(l => l.key === k), d = (y?.usd ?? 0) - (x?.usd ?? 0);
    if (Math.abs(d) < 0.5) continue;
    out.push({ label: (y ?? x)!.label, a: x ? usd0(x.usd) : 'none', b: y ? usd0(y.usd) : 'none', deltaUsd: d });
  }
  return out.sort((p, q) => Math.abs(q.deltaUsd) - Math.abs(p.deltaUsd));
}
/** The rock line of a version: pounds of stone and caves, and what the engine charges for them (dollars). */
export function rockLine(r: TierResult): { lb: number; usd: number; names: string[] } {
  const rocks = r.scene.items.filter((i: Item) => i.kind === 'stone');
  return {
    lb: rocks.reduce((t, i) => t + pieceKg(i), 0) * 2.2046,
    usd: r.lines.filter(l => l.key.startsWith('hard:') && rocks.some(i => l.key === `hard:${i.variant}`)).reduce((t, l) => t + l.usd, 0),
    names: [...new Set(rocks.map(i => nameOf(i.variant)))],
  };
}
