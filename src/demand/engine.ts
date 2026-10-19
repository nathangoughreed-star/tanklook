// The demand engine (lane KK phase 1): what the current tank asks of its keeper, derived from the scene, not from new fields.
// demandOf(setup, profile) -> per-item contributions + means + the 0-10 risk score. Spread and percentiles: cost.ts.
import { isFloat } from '../art/plants';
import { CARE } from '../data/care';
import { getSpecies, type Species } from '../data/species';
import factorsJson from '../data/factors.json';
import dj from '../data/demand-defaults.json';
import { whyAnimal } from '../scene/animalfit';
import { itemLights } from '../scene/lightcheck';
import { NEEDS, isCoralNeed, isLand, parRange, type PlantNeed } from '../scene/lightneeds';
import { wattsOf } from '../scene/lightout';
import { growRate } from '../scene/growtime';
import { LIBRARY } from '../scene/items';
import { outcomeOf } from '../scene/plantfit';
import { volume } from '../scene/physics';
import { groundVolume } from '../scene/setupsheet';
import type { TankSetup } from '../scene/types';
import { add3, mean3, r3, scale3, widen3 } from './range';
import type { Contribution, Demand, Domain, Group, Range3, Rangeish, UserProfile } from './types';

export const FACTORS = factorsJson;
export const DEFAULTS = dj;

export interface DemandOpts {
  /** The tank's own price (lane KA / KB data via a lookup); absent = the $/gallon rule of thumb in demand-defaults.json. */
  tankPrice?: (S: TankSetup, gallons: number) => Rangeish | undefined;
  /** A kit the user starts from: its listed price replaces the separate tank, stand, lid, light, filter and heater prices
   *  (their power use stays). Prices come from src/data/kits.ts (lane KB); a kit without a price falls back to the parts. */
  kit?: { id: string; priceUsd: number; asOf: string };
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
  const price = (r: Range3) => widen3(r, wid); // price-age widening; the shared price level is a factor in cost.ts
  const G = DEFAULTS.gear;

  // ---- tank, stand, lid, substrate, gear
  const tank = opts.tankPrice?.(S, gal), band = G.tank.find(b => gal <= b.maxGal) ?? G.tank[G.tank.length - 1];
  add('tank', `Tank (${Math.round(gal)} gal)`, 'tank', { setup: price(tank !== undefined ? r3(tank)! : scale3(pick(band.perGal), gal)) });
  if (S.stand.show) add('stand', 'Stand', 'gear', { setup: price(add3(pick(G.stand.base), scale3(pick(G.stand.perGal), gal))) });
  const lid = (G.lid as Record<string, Rangeish>)[S.lid];
  if (lid && r3(lid)!.mode > 0) add('lid', `Lid (${S.lid})`, 'gear', { setup: price(r3(lid)!) });
  const gv = S.substrate.show ? groundVolume(S, 24).litres : 0;
  if (gv > 0) add('substrate', 'Substrate', 'gear', { setup: price(scale3(pick(G.substrateUsdPerL), gv * 1.1)) });
  const watts = wattsOf(S);
  if (watts > 0) add('light', `Light (${Math.round(watts)} W)`, 'gear', { setup: price(scale3(pick(G.lightUsdPerW), watts * sMul.setup)), kwhMo: watts * G.lightHoursPerDay * 30 / 1000 });
  if (wet) {
    add('filter', 'Filter', 'gear', { setup: price(scale3(add3(pick(G.filter.base), scale3(pick(G.filter.perGal), gal)), sMul.setup)), upkeep: scale3(pick(G.filter.upkeepUsdMo), sMul.upkeep), kwhMo: G.filter.watts * 24 * 30 / 1000 });
    const hw = Math.min(300, Math.max(25, G.heater.wattsPerGal * gal));
    add('heater', 'Heater', 'gear', { setup: price(scale3(add3(pick(G.heater.base), scale3(pick(G.heater.perGal), gal)), sMul.setup)), kwhMo: hw * 24 * 30 * G.heater.duty / 1000 });
    if (salt) add('skimmer', 'Protein skimmer', 'gear', { setup: price(pick(G.skimmer.setup)), upkeep: pick(G.skimmer.upkeepUsdMo) });
    if (plants.some(p => NEEDS[p.variant] && !isLand(NEEDS[p.variant]))) {
      if (S.grow.feed === 'co2') add('co2', 'CO2 injection', 'gear', { setup: price(pick(G.co2.setup)), upkeep: pick(G.co2.upkeepUsdMo), minutes: r3(G.co2.minPerWeek) });
      if (S.grow.feed !== 'low') add('ferts', 'Fertilizer', 'consumable', { upkeep: pick(G.ferts.upkeepUsdMo), minutes: r3(G.ferts.minPerWeek) });
    }
  }

  // ---- hardscape
  for (const it of S.items) {
    if (it.kind === 'plant' || it.kind === 'coral') continue;
    const h = (DEFAULTS.hardscape as unknown as Record<string, { setup: Range3 }>)[it.variant === 'liverock' ? 'liverock' : it.kind];
    if (h) add(`hard:${it.variant}`, LIBRARY[it.variant]?.label ?? it.variant, 'hardscape', { setup: price(scale3(pick(h.setup), Math.pow(it.size / 150, 1.5))) });
  }

  // ---- plants and corals
  const lights = watts > 0 ? itemLights(S) : null;
  const pdom = domOf('plant');
  for (const it of plants) {
    const n = NEEDS[it.variant], label = LIBRARY[it.variant]?.label ?? it.variant, diff = plantDifficulty(it.variant);
    const cls = !wet || (n && isLand(n)) ? 'land' : n && isCoralNeed(n) ? `coral-${n.band}` : (n as PlantNeed | undefined)?.note === 'succulent' ? 'succulent' : (['easy', 'medium', 'hard'] as const)[diff];
    const unit = (DEFAULTS.plants as unknown as Record<string, { setup: Range3 }>)[cls];
    // risk: difficulty, plus a struggle (the light's verdict when set, else only the care mismatch: CO2 / dosing)
    const out = n && !isLand(n) && !isFloat(it.variant) ? lights?.get(it.id)?.outcome ?? outcomeOf(it.variant, comfortPar(n as PlantNeed), S.grow.feed) : null;
    const struggle = out && out.state === 'struggle' ? Math.max(out.severity, DEFAULTS.risk.struggleMinPts) : 0;
    if (out && out.state === 'struggle') { const w = `${label}: ${out.short}`; if (!warnings.includes(w)) warnings.push(w); }
    const raw = (n && !isLand(n) ? DEFAULTS.risk.plantDifficulty[diff] : 0) + struggle;
    add(`plant:${it.variant}`, label, 'plant', {
      setup: unit ? price(pick(unit.setup)) : undefined, livestock: true, domain: pdom,
      minutes: r3(DEFAULTS.plants.minPerWeekEach * growRate(it.variant, S.grow.feed) * (it.size / DEFAULTS.plants.refSizeMm)), risk: raw * skillMul(P, pdom),
    });
  }

  // ---- animals
  const present: Species[] = [];
  for (const a of animals) if (!present.includes(a.sp)) present.push(a.sp);
  const adom = domOf('animal');
  for (const { f, sp } of animals) {
    const u = (DEFAULTS.animals as unknown as Record<string, typeof DEFAULTS.animals["fw-fish"]>)[sp.cat];
    if (!u) continue;
    const tl = f.tl ?? sp.tl, c = CARE[sp.id];
    let raw = c ? DEFAULTS.risk.careLevel[c.care] : 0.4;
    const why = c ? whyAnimal(sp, litres, (P.skill[adom] + 1) as 1 | 2 | 3, present) : null;
    if (why) { raw += DEFAULTS.risk.animalWarnPts[why.kind]; const w = `${sp.name}: ${why.text}`; if (!warnings.includes(w)) warnings.push(w); }
    add(`animal:${sp.id}`, sp.name, 'animal', {
      setup: price(scale3(pick(u.setup), Math.pow(tl / u.refMm, 1.2))), upkeep: scale3(pick(u.upkeep), Math.pow(tl / u.refMm, 0.8) * sMul.upkeep), minutes: r3(u.mins * sMul.minutes),
      livestock: true, domain: adom, risk: raw * skillMul(P, adom),
    });
  }

  // ---- routine work and consumables (water changes, testing, cleaning, yearly jobs)
  const T = DEFAULTS.time;
  if (!wet) add('mist', 'Misting and upkeep', 'work', { minutes: pick(T.terrariumMistMin) });
  else {
    const inches = animals.reduce((s, a) => s + (a.f.tl ?? a.sp.tl) / 25.4, 0), stock = Math.min(1.4, Math.max(0.6, 0.5 + inches / Math.max(gal, 1)));
    const frac = T.waterChangeFraction[domain] * stock, galWk = gal * frac;
    const water = pick((FACTORS.waterUsdPerGal as Record<string, Range3>)[P.waterSource]), per = salt ? add3(water, pick(FACTORS.saltMixUsdPerGal)) : water;
    add('waterchange', `Water changes (${Math.round(frac * 100)} % a week)`, 'work', { upkeep: scale3(per, galWk * 4.33), minutes: add3(scale3(pick(T.waterChangePerGalMin), galWk * sMul.minutes), scale3(pick(T.waterChangeFixedMin), sMul.minutes)) });
    add('testing', 'Testing the water', 'work', { minutes: scale3(pick(T.testingMin), sMul.minutes) });
    add('filterclean', 'Cleaning the filter', 'work', { minutes: pick(T.filterCleanMinPerWeek) });
    if (salt) add('saltwork', 'Mixing salt water, top-off, dosing', 'work', { minutes: pick(T.saltExtraMin) });
  }
  add('yearly', 'Yearly jobs (deep clean, replacing gear)', 'work', { minutes: pick(T.yearlyJobsMinPerWeek) });

  // ---- tank-level risk: a small volume is unforgiving, salt is harder
  const small = DEFAULTS.risk.tankSmall.find(b => gal <= b.maxGal);
  const tankRisk = (wet && small ? small.pts : 0) + (salt ? DEFAULTS.risk.salt : 0);
  if (tankRisk) add('stability', salt ? 'Saltwater chemistry and volume' : 'Small volume', 'tank', { risk: tankRisk * skillMul(P, domain), domain });

  if (opts.kit) {
    // the kit's one price (listing +-15 %, widened with age) stands in for the parts it contains
    const parts = new Set(['tank', 'stand', 'lid', 'light', 'filter', 'heater']);
    for (const c of rows) if (parts.has(c.key)) delete c.setup;
    const k = opts.kit.priceUsd, w = Math.min(FACTORS.priceAgeMax, 1 + FACTORS.priceAgePerMonth * Math.max(0, ((opts.now ?? Date.now()) - Date.parse(opts.kit.asOf)) / (30.44 * 864e5)));
    add('kit', `Kit (${opts.kit.id})`, 'tank', { setup: widen3({ lo: k * 0.85, mode: k, hi: k * 1.15 }, w) });
  }
  const items = fold(rows), sum = (f: (c: Contribution) => number) => items.reduce((s, c) => s + f(c), 0);
  const kwh = P.kwhUsd ?? mean3(pick(FACTORS.kwhUsd)), riskRaw = sum(c => c.risk);
  return {
    items, domain, gallons: gal, warnings,
    totals: {
      setupUsd: sum(c => (c.setup ? mean3(c.setup) : 0)) * mean3(pick(FACTORS.priceLevel)),
      upkeepUsdMo: sum(c => (c.upkeep ? mean3(c.upkeep) : 0) + (c.kwhMo ?? 0) * kwh),
      minPerWeek: sum(c => (c.minutes ? mean3(c.minutes) : 0)),
      riskRaw, risk: riskScore(riskRaw),
    },
  };
}
/** Raw points -> 0-10, saturating so a pile of small risks cannot clip at once. Cut points are a proposal (phase 3). */
export const riskScore = (raw: number) => 10 * (1 - Math.exp(-raw / DEFAULTS.risk.squashScale));
export const riskLabel = (score: number): 'safe' | 'moderate' | 'demanding' => score < DEFAULTS.risk.cut.safe ? 'safe' : score < DEFAULTS.risk.cut.demanding ? 'moderate' : 'demanding';
