// The demand engine (lane KK phase 1): what the current tank asks of its keeper, derived from the scene, not from new fields.
// demandOf(setup, profile) -> per-item contributions + means + the 0-10 risk score. One expected value per bar; limits: cost.ts.
import { isFloat } from '../art/plants';
import { CARE } from '../data/care';
import { getSpecies, type Species } from '../data/species';
import factorsJson from '../data/factors.json';
import dj from '../data/demand-defaults.json';
import { groupShort, hasCorals, whyAnimal } from '../scene/animalfit';
import { grazerShort } from '../data/grazers';
import { itemLights } from '../scene/lightcheck';
import { NEEDS, isCoralNeed, isLand, parRange, type PlantNeed } from '../scene/lightneeds';
import { wattsOf } from '../scene/lightout';
import { lightProduct, listedPrice } from '../data/gearCatalog';
import { growRate } from '../scene/growtime';
import { LIBRARY } from '../scene/items';
import { outcomeOf } from '../scene/plantfit';
import { volume } from '../scene/physics';
import { minFit } from '../scene/tankMin';
import { tankSaleFor } from '../data/tanks';
import { groundVolume, pieceKg } from '../scene/setupsheet';
import type { TankSetup } from '../scene/types';
import { add3, mean3, r3, scale3, widen3 } from './range';
import { interp, price as rowPrice, priceRow, tankRowPrice } from './prices';
import { defaultFilter, defaultHeater, filterName, matchFilter, matchHeater, type FilterSpec } from './gear';
import { techDemand } from './tech';
import { choreDays } from './rhythm';
import { isLivePlantPatch, PATCH_PLANTS } from '../scene/nitrogen';
import { waterChangeFraction } from '../scene/stocking';
import { sumpLitres, techOf } from '../scene/tech';
import { TERRARIUM_STAND_ROW, terrariumPrice, terrariumStandK } from '../scene/drygear';
import type { Contribution, Demand, Domain, Group, Range3, Rangeish, UserProfile } from './types';

export const FACTORS = factorsJson;
export const DEFAULTS = dj;

export interface DemandOpts {
  /** The tank's own price (lane KA / KB data via a lookup); absent = the $/gallon rule of thumb in demand-defaults.json. */
  tankPrice?: (S: TankSetup, gallons: number) => Rangeish | undefined;
  /** A kit the user starts from: its listed price replaces the separate tank, stand, lid, light, filter and heater prices
   *  (their power use stays). Prices come from src/data/kits.ts (lane KB); a kit without a price falls back to the parts. */
  kit?: { id: string; priceUsd: number; asOf: string; /** which parts the price covers; default all six (a tank+stand deal says ['tank','stand']) */ includes?: string[]; /** row label, default `Kit (id)` */ label?: string; /** the real filter and heater the kit or deal ships with; matched to the nearest generic model (gear.ts) for power and row name */ filter?: FilterSpec; heater?: { watts: number } };
  /** A product on sale the user picked for a gear row (lane GD, demand/gearDeals.ts): row key -> its price, which replaces the
   *  row's typical price (power use stays). A kit covering the same part still wins. */
  parts?: Record<string, { usd: number; asOf: string; label: string }>;
  /** A plant pack the user bought (lane BS, demand/plantBundles.ts): the first `covers[variant]` plants of each variant it contains carry no set-up price of their own; one `bundle:<id>` row (price + shipping) stands in. Covers nothing in this tank = no row. */
  plantBundle?: { id: string; priceUsd: number; asOf: string; label: string; covers: Record<string, number> };
  /** For the price-age widening; default now. */
  now?: number;
}

/** Plant difficulty 0 easy / 1 medium / 2 hard, DERIVED from NEEDS (no hand labels): epiphytes and floaters are easy; band and CO2 add up. */
const EPIPHYTE = new Set(['anubias', 'moss', 'fern', 'buce']);
export function plantDifficulty(variant: string): 0 | 1 | 2 {
  const n = NEEDS[variant];
  if (!n || isLand(n) || isCoralNeed(n)) return 0;
  if (isFloat(variant) || EPIPHYTE.has(variant)) return 0;
  const p = n as PlantNeed;
  const s = { low: 0, medium: 1, high: 2 }[p.band] + { none: 0, recommended: 1, required: 2 }[p.co2];
  return s >= 3 ? 2 : s >= 1 ? 1 : 0;
}

export const skillMul = (P: UserProfile, d: Domain) => FACTORS.fundamentalsShare * FACTORS.skillRiskMultiplier[P.skill.fundamentals] + (1 - FACTORS.fundamentalsShare) * FACTORS.skillRiskMultiplier[P.skill[d]];

const RISK_REPEAT = 0.5;
const ageWiden = (asOf: string, now: number) => Math.min(FACTORS.priceAgeMax, 1 + FACTORS.priceAgePerMonth * Math.max(0, (now - Date.parse(asOf)) / (30.44 * 864e5)));
const pick = (r: Range3): Range3 => ({ lo: r.lo, mode: r.mode, hi: r.hi });
/** A plant's care need met at a comfortable light, so only the CO2 / dosing mismatch can make it struggle. */
const comfortPar = (n: PlantNeed) => { const [lo, hi] = parRange(n); return Math.min(hi, lo * 1.2 + 5); };

/** Identical rows (same key) become one row with n: keeps the driver list short and the Monte Carlo cheap. */
function fold(items: Contribution[]): Contribution[] {
  const m = new Map<string, Contribution>(), out: Contribution[] = [];
  for (const c of items) {
    const g = m.get(c.key);
    if (!g) { const k = { ...c, n: c.n ?? 1 }; m.set(c.key, k); out.push(k); continue; }
    g.n! += c.n ?? 1; g.risk = Math.max(g.risk, c.risk);
    for (const f of ['setup', 'upkeep', 'minutes'] as const) if (c[f]) g[f] = g[f] ? add3(g[f]!, c[f]!) : c[f];
    if (c.kwhMo) g.kwhMo = (g.kwhMo ?? 0) + c.kwhMo;
  }
  // many of one kind are not many times the risk: the worst one counts in full, each further doubling adds half again
  for (const c of out) if (c.n! > 1) c.risk *= 1 + RISK_REPEAT * Math.log(c.n!);
  return out;
}

/** Expected electricity rate, USD per kWh: the user's own, else the US mean. */
export const kwhRate = (P: Pick<UserProfile, 'kwhUsd'>) => P.kwhUsd ?? mean3(FACTORS.kwhUsd);

export function demandOf(S: TankSetup, P: UserProfile, opts: DemandOpts = {}): Demand {
  const wid = ageWiden(DEFAULTS.asOf, opts.now ?? Date.now());
  const wet = S.water.on, salt = !!S.water.salt && wet, vol = volume(S.tank), gal = vol.gallons, litres = vol.litres;
  const animals = S.fish.map(f => ({ f, sp: getSpecies(f.species) })).filter((a): a is { f: typeof a.f; sp: Species } => !!a.sp);
  const plants = S.items.filter(i => i.kind === 'plant' || i.kind === 'coral');
  const domain: Domain = !wet ? 'terrarium' : salt ? 'salt' : animals.length ? 'fish' : 'planted';
  const domOf = (kind: 'animal' | 'plant'): Domain => !wet ? 'terrarium' : salt ? 'salt' : kind === 'animal' ? 'fish' : 'planted';
  const sMul = salt ? FACTORS.saltMultiplier : { setup: 1, upkeep: 1, minutes: 1 };
  const rows: Contribution[] = [], warnings: string[] = [];
  const add = (key: string, label: string, group: Group, c: Partial<Contribution> = {}) => rows.push({ key, label, group, risk: 0, ...c });
  const price = (r: Range3) => widen3(r, wid); // price-age widening; the price level's mean is applied in the totals
  const G = DEFAULTS.gear;

  // ---- tank, stand, lid, substrate, gear
  const tank = opts.tankPrice?.(S, gal) ?? (wet ? undefined : terrariumPrice(S.tank)), band = G.tank.find(b => gal <= b.maxGal) ?? G.tank[G.tank.length - 1];
  const catTank = tankRowPrice(gal);
  const tankTypical = tank !== undefined ? r3(tank)! : catTank ?? scale3(pick(band.perGal), gal);
  // a bare tank of this size on sale right now (read from a retailer page) is what buying the parts would cost
  const tSale = tank === undefined && wet ? tankSaleFor(gal, S.tank.shape ?? 'rect', opts.now ?? Date.now(), undefined, undefined, S.tank) : undefined;
  if (tSale && tSale.usd < tankTypical.mode) add('tank', `Tank (${Math.round(gal)} gal; on sale at ${tSale.retailer} $${Math.round(tSale.usd)}, was $${Math.round(tSale.regularUsd)}${tSale.saleEnds ? ', ends ' + tSale.saleEnds : ''})`, 'tank', { setup: price({ lo: tSale.usd * 0.97, mode: tSale.usd, hi: Math.min(tankTypical.mode, tSale.usd * 1.15) }) });
  else add('tank', `Tank (${Math.round(gal)} gal)`, 'tank', { setup: price(tankTypical) });
  const stand = interp('gear:stand-', [20, 55], gal);
  // only a stand the owner added counts (Nathan 2026-10-26: an undecided stand is not in the price)
  const tStand = !wet ? rowPrice(TERRARIUM_STAND_ROW) : undefined; // a terrarium: its own reptile-stand row, by footprint (S240b)
  if (S.stand.show) add('stand', tStand ? 'Stand (terrarium)' : 'Stand', 'gear', { setup: price(tStand ? scale3(tStand, terrariumStandK(S.tank)) : stand ? scale3(stand, gal > 55 ? Math.pow(gal / 55, 0.8) : 1) : add3(pick(G.stand.base), scale3(pick(G.stand.perGal), gal))) });
  const lidRow = S.lid === 'open' ? undefined : rowPrice(`gear:lid-${S.lid === 'glass' ? 'glass' : S.lid === 'mesh' ? 'mesh' : 'hood'}`), lidK = Math.min(2.5, Math.max(0.6, Math.sqrt(gal / 25)));
  const lid = (G.lid as Record<string, Rangeish>)[S.lid];
  if (lidRow) add('lid', `Lid (${S.lid})`, 'gear', { setup: price(scale3(lidRow, lidK)) });
  else if (lid && r3(lid)!.mode > 0) add('lid', `Lid (${S.lid})`, 'gear', { setup: price(r3(lid)!) });
  const gv = S.substrate.show ? groundVolume(S, 24).litres : 0;
  if (gv > 0) add('substrate', 'Substrate', 'gear', { setup: price(scale3(pick(G.substrateUsdPerL), gv * 1.1)) });
  const watts = wattsOf(S);
  if (watts > 0) {
    const inch = S.tank.L / 25.4, rowL = salt ? rowPrice('gear:led-reef-24') && scale3(rowPrice('gear:led-reef-24')!, Math.max(0.6, inch / 24)) : interp('gear:led-planted-', [24, 48], inch);
    // a catalogued product (Tech > Lighting) costs its own listed price (one retailer, one day: +-10 %), as heaters and filters do
    const lprod = lightProduct(S.light.product), listed = listedPrice(lprod);
    const lp = listed ? { lo: listed * 0.9, mode: listed, hi: listed * 1.1 } : rowL ? scale3(rowL, !salt && inch > 48 ? inch / 48 : !salt && inch < 24 ? Math.max(0.3, inch / 24) : 1) : scale3(pick(G.lightUsdPerW), watts * sMul.setup);
    add('light', listed && lprod ? `Light: ${lprod.brand} ${lprod.model}` : `Light (${Math.round(watts)} W)`, 'gear', { setup: price(lp), kwhMo: watts * G.lightHoursPerDay * 30 / 1000 });
  }
  // a tank started from its animals (path 1) has no filter or heater until the owner adds one (Nathan 2026-10-26: not in the price either)
  const bare = !!S.stockFirst && !opts.kit;
  if (wet) {
    if (!bare) {
      const fm = (opts.kit?.filter && matchFilter({ ...opts.kit.filter, gal })?.model) || defaultFilter(gal);
      add('filter', opts.kit?.filter ? `Filter (${filterName(fm)})` : 'Filter', 'gear', { setup: price(scale3(rowPrice(fm.priceKey) ?? add3(pick(G.filter.base), scale3(pick(G.filter.perGal), gal)), sMul.setup)), upkeep: scale3(pick(G.filter.upkeepUsdMo), sMul.upkeep), kwhMo: fm.watts * 24 * 30 / 1000 });
      const hm = opts.kit?.heater ? matchHeater(opts.kit.heater.watts) : defaultHeater(gal, G.heater.wattsPerGal);
      add('heater', opts.kit?.heater ? `Heater (${hm.label})` : 'Heater', 'gear', { setup: price(scale3(rowPrice(hm.priceKey) ?? add3(pick(G.heater.base), scale3(pick(G.heater.perGal), gal)), sMul.setup)), kwhMo: (opts.kit?.heater?.watts ?? hm.watts) * 24 * 30 * G.heater.duty / 1000 });
    }
    if (salt) add('skimmer', 'Protein skimmer', 'gear', { setup: price(rowPrice('gear:skimmer') ?? pick(G.skimmer.setup)), upkeep: pick(G.skimmer.upkeepUsdMo) });
    if (plants.some(p => NEEDS[p.variant] && !isLand(NEEDS[p.variant]))) {
      if (S.grow.feed === 'co2') add('co2', 'CO2 injection', 'gear', { setup: price(rowPrice('gear:co2-kit') ?? pick(G.co2.setup)), upkeep: rowPrice('gear:co2-refill') ? scale3(rowPrice('gear:co2-refill')!, 1 / 3) : pick(G.co2.upkeepUsdMo), minutes: r3(G.co2.minPerWeek) });
      if (S.grow.feed !== 'low') add('ferts', 'Fertilizer', 'consumable', { upkeep: rowPrice('gear:ferts') ?? pick(G.ferts.upkeepUsdMo), minutes: r3(G.ferts.minPerWeek) });
    }
  }

  // ---- hardscape
  for (const it of S.items) {
    if (it.kind === 'plant' || it.kind === 'coral') continue;
    const h = (DEFAULTS.hardscape as unknown as Record<string, { setup: Range3 }>)[it.variant === 'liverock' ? 'liverock' : it.kind], row = rowPrice(`hard:${it.variant}`), perLb = priceRow(`hard:${it.variant}`)?.unit.startsWith('per lb');
    const label = LIBRARY[it.variant]?.label ?? it.variant;
    if (row) add(`hard:${it.variant}`, label, 'hardscape', { setup: price(scale3(row, perLb ? pieceKg(it) * 2.2046 : Math.pow(it.size / (LIBRARY[it.variant]?.size ?? 150), 1.5))) });
    else if (h) add(`hard:${it.variant}`, label, 'hardscape', { setup: price(scale3(pick(h.setup), Math.pow(it.size / 150, 1.5))) });
  }

  // ---- plants and corals
  const lights = watts > 0 ? itemLights(S) : null;
  const pdom = domOf('plant'), left = { ...(opts.plantBundle?.covers ?? {}) };
  let packed = 0;
  for (const it of plants) {
    const n = NEEDS[it.variant], label = LIBRARY[it.variant]?.label ?? it.variant, diff = plantDifficulty(it.variant);
    const cls = !wet || (n && isLand(n)) ? 'land' : n && isCoralNeed(n) ? `coral-${n.band}` : (n as PlantNeed | undefined)?.note === 'succulent' ? 'succulent' : (['easy', 'medium', 'hard'] as const)[diff];
    const unit = (DEFAULTS.plants as unknown as Record<string, { setup: Range3 }>)[cls];
    // risk: difficulty, plus a struggle (the light's verdict when set, else only the care mismatch: CO2 / dosing)
    const out = n && !isLand(n) && !isFloat(it.variant) ? lights?.get(it.id)?.outcome ?? outcomeOf(it.variant, comfortPar(n as PlantNeed), S.grow.feed) : null;
    const struggle = out && out.state === 'struggle' ? Math.max(out.severity, DEFAULTS.risk.struggleMinPts) : 0;
    if (out && out.state === 'struggle') { const w = `${label}: ${out.short}`; if (!warnings.includes(w)) warnings.push(w); }
    const raw = (n && !isLand(n) ? DEFAULTS.risk.plantDifficulty[diff] : 0) + struggle;
    const inPack = (left[it.variant] ?? 0) > 0 && !!n && !isLand(n);
    if (inPack) { left[it.variant]--; packed++; }
    add(`plant:${it.variant}`, label, 'plant', {
      setup: inPack ? undefined : rowPrice(`plant:${it.variant}`) ? price(rowPrice(`plant:${it.variant}`)!) : unit ? price(pick(unit.setup)) : undefined, livestock: true, domain: pdom,
      minutes: r3(DEFAULTS.plants.minPerWeekEach * Math.pow(plants.filter(q => q.variant === it.variant).length, -DEFAULTS.plants.bunchExp) * (isFloat(it.variant) ? DEFAULTS.plants.floaterMinK : 1) * growRate(it.variant, S.grow.feed) * (it.size / DEFAULTS.plants.refSizeMm)), risk: raw * skillMul(P, pdom),
    });
  }

  if (opts.plantBundle && packed) add(`bundle:${opts.plantBundle.id}`, opts.plantBundle.label, 'plant', { setup: widen3({ lo: opts.plantBundle.priceUsd * 0.95, mode: opts.plantBundle.priceUsd, hi: opts.plantBundle.priceUsd * 1.05 }, Math.min(FACTORS.priceAgeMax, 1 + FACTORS.priceAgePerMonth * Math.max(0, ((opts.now ?? Date.now()) - Date.parse(opts.plantBundle.asOf)) / (30.44 * 864e5)))) });

  // painted patches of live plants (carpets, moss mats) are trimmed too
  for (const pt of S.patches ?? []) if (isLivePlantPatch(pt)) add('patch', 'Live plant patches (carpet, moss)', 'plant', { minutes: r3(DEFAULTS.time.plantPatchMin.mode * growRate(pt.brush.slice(6), S.grow.feed)) });

  // ---- animals
  const present: Species[] = [];
  for (const a of animals) if (!present.includes(a.sp)) present.push(a.sp);
  const adom = domOf('animal'), env = { corals: hasCorals(S.items), fit: minFit(S) }, nOf = (id: string) => animals.filter(a => a.sp.id === id).length;
  for (const { f, sp } of animals) {
    const u = (DEFAULTS.animals as unknown as Record<string, typeof DEFAULTS.animals["fw-fish"]>)[sp.cat];
    if (!u) continue;
    const tl = f.tl ?? sp.tl, c = CARE[sp.id];
    const food = (DEFAULTS.foodMo as Record<string, Range3 | undefined>)[sp.id];   // a species fed from a listed price x its feeding rate, not scaled by length
    let raw = c ? DEFAULTS.risk.careLevel[c.care] : 0.4;
    const why = c ? whyAnimal(sp, litres, (P.skill[adom] + 1) as 1 | 2 | 3, present, env) : null;
    if (why) { raw += DEFAULTS.risk.animalWarnPts[why.kind]; const w = `${sp.name}: ${why.text}`; if (!warnings.includes(w)) warnings.push(w); }
    const few = groupShort(sp, nOf(sp.id));
    if (few) { const w = `${sp.name}: ${few}`; if (!warnings.includes(w)) { warnings.push(w); raw += DEFAULTS.risk.animalWarnPts.group; } } // once per species
    const hungry = wet ? grazerShort(sp.id, nOf(sp.id), litres) : null; // more grazers than the algae feeds (data/grazers.ts)
    if (hungry) { const w = `${sp.name}: ${hungry}`; if (!warnings.includes(w)) { warnings.push(w); raw += DEFAULTS.risk.animalWarnPts.group; } }
    add(`animal:${sp.id}`, sp.name, 'animal', {
      setup: price(scale3(rowPrice(`animal:${sp.id}`) ?? pick(u.setup), Math.pow(tl / (rowPrice(`animal:${sp.id}`) ? sp.tl : u.refMm), 1.2))), upkeep: scale3(food ? pick(food) : pick(u.upkeep), (food ? 1 : Math.pow(tl / u.refMm, 0.8)) * sMul.upkeep), minutes: r3(u.mins * sMul.minutes), everyDays: (DEFAULTS.reptileCadence as Record<string, { everyDays?: number }>)[sp.id]?.everyDays,
      livestock: true, domain: adom, risk: raw * skillMul(P, adom),
    });
  }

  // ---- routine work and consumables (water changes, testing, cleaning, yearly jobs)
  const T = DEFAULTS.time;
  if (!wet) {
    // lane LT: hand misting is the bulk of a humid terrarium's work; an automatic mister leaves the refill; a dry one only the spot clean
    const mr = techOf(S).rows.mist, mist = mr === 'hand' ? 'hand' : mr === 'mister' || mr === 'fogger' ? 'auto' : 'none';
    add('mistwork', mist === 'auto' ? 'Spot cleaning, refilling the mister' : mist === 'hand' ? 'Misting by hand and spot cleaning' : 'Spot cleaning', 'work', { minutes: pick(mist === 'hand' ? T.terrariumMistMin : mist === 'auto' ? T.terrariumAutoMistMin : T.terrariumDryMin), everyDays: choreDays('mistwork') });
  }
  else {
    // the share of the tank to change comes from the nitrogen budget (plants and the filter take part of it away), floored and capped
    const frac = waterChangeFraction(S), galWk = (gal + sumpLitres(S) / 3.785) * frac; // lane SU: the change is a share of all the water, the sump's too
    const hose = techOf(S).rows.wcmethod === 'hose';
    const water = (P.waterSource === 'bought-ro' ? rowPrice('gear:ro-bought') : undefined) ?? pick((FACTORS.waterUsdPerGal as Record<string, Range3>)[P.waterSource]), per = salt ? add3(water, rowPrice('gear:salt-mix') ?? pick(FACTORS.saltMixUsdPerGal)) : water;
    if (P.waterSource === 'own-ro' && rowPrice('gear:ro-unit')) add('rounit', 'RO unit', 'gear', { setup: price(rowPrice('gear:ro-unit')!) });
    // a test kit is recommended, not required: only the setups where water chemistry can go wrong unseen carry it in the set-up cost (a simple betta or small community tank does not); the build plan's cycling section recommends one whenever this row is absent
    const needsKit = salt || hasCorals(S.items) || gal >= 30 || animals.length >= 8 || S.items.filter(i => i.kind === 'plant').length >= 10;
    if (needsKit && rowPrice('gear:test-kit')) add('testkit', 'Water test kit (ammonia, nitrite, nitrate, pH)', 'gear', { setup: price(rowPrice('gear:test-kit')!) });
    // lane U5: the rest of a COMPLETE set-up: the maintenance tools and first consumables every wet tank needs on day one (a salt tank mixes with RO water and needs a refractometer, not dechlorinator)
    if (salt) { if (rowPrice('gear:refractometer')) add('refractometer', 'Refractometer (salinity)', 'gear', { setup: price(rowPrice('gear:refractometer')!) }); }
    else if (rowPrice('gear:start-conditioner')) add('startconditioner', 'Dechlorinator (first bottle)', 'gear', { setup: price(rowPrice('gear:start-conditioner')!) });
    if (rowPrice('gear:siphon')) add('siphon', 'Siphon / gravel vacuum', 'gear', { setup: price(rowPrice('gear:siphon')!) });
    if (rowPrice('gear:bucket')) add('bucket', 'Bucket (aquarium only)', 'gear', { setup: price(rowPrice('gear:bucket')!) });
    if (rowPrice('gear:net')) add('net', 'Fish net', 'gear', { setup: price(rowPrice('gear:net')!) });
    if (rowPrice('gear:thermometer')) add('thermometer', 'Thermometer', 'gear', { setup: price(rowPrice('gear:thermometer')!) });
    add('waterchange', `Water changes (${Math.round(frac * 100)} % a week${hose ? ', by hose' : ''})`, 'work', { upkeep: scale3(per, galWk * 4.33), minutes: add3(scale3(pick(hose ? T.waterChangeHosePerGalMin : T.waterChangePerGalMin), galWk * sMul.minutes), scale3(pick(hose ? T.waterChangeHoseFixedMin : T.waterChangeFixedMin), sMul.minutes)), everyDays: choreDays('waterchange') });
    // feeding trips (an automatic feeder leaves only the refill) and wiping the glass (algae follows the light; live plants take nutrients, artificial ones need a wipe)
    add('feeding', techOf(S).rows.feeder === 'auto' ? 'Feeding (automatic feeder: refills)' : 'Feeding trips', 'work', { minutes: pick(techOf(S).rows.feeder === 'auto' ? T.feederRefillMinPerWeek : T.feedingTripMinPerWeek), everyDays: techOf(S).rows.feeder === 'auto' ? 14 : 1 });
    const g = T.glass, wpg = Math.min(g.wpgCap, wattsOf(S) / Math.max(gal, 1)), live = S.items.filter(i => i.kind === 'plant').length + (S.patches ?? []).filter(isLivePlantPatch).length * PATCH_PLANTS;
    const fake = S.items.filter(i => i.kind === 'artificial').length, cover = Math.min(1, live / Math.max(gal / 10, 1));
    const glassMid = (g.baseMin + g.minPerHalfWpg * wpg / 0.5) * (1 - g.liveCut * cover) + Math.min(g.artificialCapMin, g.artificialEachMin * fake);
    add('glass', 'Wiping the glass and algae', 'work', { minutes: { lo: glassMid * 0.6, mode: glassMid, hi: glassMid * 1.6 }, everyDays: choreDays('glass') });
    const tt = T.testing, testDays = salt ? tt.salt.everyDays : animals.some(a => a.sp.id === 'goldfish') ? tt.goldfish.everyDays : tt.fresh.everyDays; // sourced intervals per tank type (research/maintenance/cadence.json)
    add('testing', 'Testing the water', 'work', { minutes: scale3(pick(tt.minPerSession), 7 / testDays), everyDays: testDays });
    if (!bare) add('filterclean', 'Cleaning the filter', 'work', { minutes: pick(T.filterCleanMinPerWeek), everyDays: 14 });
    if (salt) add('saltwork', 'Mixing salt water, top-off, dosing', 'work', { minutes: pick(T.saltExtraMin) });
  }
  add('yearly', 'Yearly jobs (deep clean, replacing gear)', 'work', { minutes: pick(T.yearlyJobsMinPerWeek), everyDays: choreDays('yearly') });

  // ---- tank-level risk: a small volume is unforgiving, salt is harder
  const small = DEFAULTS.risk.tankSmall.find(b => gal <= b.maxGal);
  const tankRisk = (wet && small ? small.pts : 0) + (salt ? DEFAULTS.risk.salt : 0);
  if (tankRisk) add('stability', salt ? 'Saltwater chemistry and volume' : 'Small volume', 'tank', { risk: tankRisk * skillMul(P, domain), domain });

  techDemand(S, rows, { price, riskMul: skillMul(P, domain), domain }); // lane TM: gear rows from the chosen tech (a wet tank without S.tech: no-op; a dry tank: its lamps and misting)
  for (const c of rows) {
    const p = opts.parts?.[c.key];
    if (p && c.setup) { c.setup = widen3({ lo: p.usd * 0.97, mode: p.usd, hi: p.usd * 1.1 }, ageWiden(p.asOf, opts.now ?? Date.now())); c.label += ` (${p.label})`; }
  }
  if (opts.kit) {
    // the kit's one price (listing +-15 %, widened with age) stands in for the parts it contains
    const parts = new Set(opts.kit.includes ?? ['tank', 'stand', 'lid', 'light', 'filter', 'heater']);
    for (const c of rows) if (parts.has(c.key)) delete c.setup;
    const k = opts.kit.priceUsd, w = Math.min(FACTORS.priceAgeMax, 1 + FACTORS.priceAgePerMonth * Math.max(0, ((opts.now ?? Date.now()) - Date.parse(opts.kit.asOf)) / (30.44 * 864e5)));
    add('kit', opts.kit.label ?? `Kit (${opts.kit.id})`, 'tank', { setup: widen3({ lo: k * 0.85, mode: k, hi: k * 1.15 }, w) });
  }
  const items = fold(rows), sum = (f: (c: Contribution) => number) => items.reduce((s, c) => s + f(c), 0);
  const pl = mean3(pick(FACTORS.priceLevel));
  for (const c of items) if (c.livestock && c.domain && c.setup) c.lossMo = mean3(c.setup) * pl * mean3(pick((FACTORS.annualLoss as Record<Domain, Range3[]>)[c.domain][P.skill[c.domain]])) / 12;
  const kwh = kwhRate(P), riskRaw = sum(c => c.risk);
  return {
    items, domain, gallons: gal, warnings,
    totals: {
      setupUsd: sum(c => (c.setup ? mean3(c.setup) : 0)) * mean3(pick(FACTORS.priceLevel)),
      upkeepUsdMo: sum(c => (c.upkeep ? mean3(c.upkeep) : 0) + (c.kwhMo ?? 0) * kwh + (c.lossMo ?? 0)),
      minPerWeek: sum(c => (c.minutes ? mean3(c.minutes) : 0)),
      riskRaw, risk: riskScore(riskRaw),
    },
  };
}
/** Raw points -> 0-10, saturating so a pile of small risks cannot clip at once. Cut points are a proposal (phase 3). */
export const riskScore = (raw: number) => 10 * (1 - Math.exp(-raw / DEFAULTS.risk.squashScale));
export const riskLabel = (score: number): 'safe' | 'moderate' | 'demanding' => score < DEFAULTS.risk.cut.safe ? 'safe' : score < DEFAULTS.risk.cut.demanding ? 'moderate' : 'demanding';
