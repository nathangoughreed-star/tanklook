// What a generated setup needs beyond its pieces (lane LN1, Nathan 2026-11-03: "when generating a tank, lighting needs to be added. And if a chosen style requires plants with a certain
// light level or ferts / CO2, that needs to be added, informed of the user, and added to the cost"). Pure: a scene in, a scene out, plus the plain "Why" lines.
//   light       every generated scene gets one the user can see and pay for, sized to the tank's length and the PAR tier of its plants / corals (lightneeds.ts is the ONE tier table)
//   ferts / CO2 the plants whose NEEDS say 'required' (liquid ferts; pressurised CO2); a low-tech brief or a tight budget never gets CO2: the demanding plants are swapped for ones that suit
//               the light instead, and the swap is told
//   reef        coral dosing tiers (soft none, LPS regular, SPS daily) raise the tank's feed, as tech.ts reefFeedOf reads it
//   owned gear  a light the user owns is used, never replaced, and the user is told when it is too weak, with the cheapest fix
// Prices come from the existing sources only (gearCatalog listed prices, tech.ts optionCost); nothing here has a second table.
import { NEEDS, isCoralNeed, isLand, minPar, type CoralNeed, type PlantNeed } from './lightneeds';
import { isFloat } from '../art/plants';
import { LIBRARY } from './items';
import { fixtureOf, fitFixture, lightOutCached, powerRange, wattsOf } from './lightout';
import { applyLightProduct, hangingUnits } from './lightproduct';
import { feedFor, needFeed, optionCost, optionDef, setFeed, techOf } from './tech';
import { volume } from './physics';
import { valueOf, type Brief } from './brief';
import { LIGHT_PRODUCTS, listedPrice, productName, type LightProduct } from '../data/gearCatalog';
import { basicLight, lightFor } from '../demand/needs';
import type { GrowFeed, Item, TankSetup } from './types';

export interface NeedLine {
  kind: 'light' | 'co2' | 'ferts' | 'dosing' | 'swap' | 'flag';
  /** the plain sentence for the user */
  text: string;
  /** what the line adds, US $ */
  setupUsd: number; monthlyUsd: number;
}
export interface SetupNeeds {
  scene: TankSetup;
  lines: NeedLine[];
  /** the light the scene now has (catalogue product, or undefined for a generic one) */
  light?: LightProduct;
  setupUsd: number; monthlyUsd: number;
}
export interface NeedOpts {
  brief?: Brief;
  /** the scene came whole from the generator, not from the user: its light may be replaced when too weak and its care rows are not a choice. Default false: only an absent (flat) light is replaced. */
  generated?: boolean;
  /** the look is a low-tech one (LOW_TECH_STYLES): no CO2, the plants that demand it are swapped */
  lowTech?: boolean;
}

/** Stand-ins for plants that REQUIRE injected CO2: the same job (a stem, a lawn) at a light level a plain tank reaches (swap size kept, a lawn no taller than it grows). */
export const LOW_TECH_SWAP: Record<string, string> = { stemred: 'ludwigia', carpet: 'sagittaria' };
/** A setup that needs more than this share of the startup budget for light and plant care counts as tight (an estimate, not a measurement: review with Nathan). */
export const TIGHT_SHARE = 0.3;
/** Looks that are low-tech by their own recipe (the jungle is "low-tech, Walstad-style"; the rest are low-light shade / epiphyte / blackwater looks): they never get CO2, whatever the plants in
 *  them ask for. A judgment call, to review with Nathan; a brief's own low-tech preference does the same for any look. */
export const LOW_TECH_STYLES: ReadonlySet<string> = new Set(['overgrown-jungle', 'overgrown-garden', 'mossy-wood-ferns', 'blackwater-creek', 'betta-retreat', 'floating-canopy']);

const usd = (n: number) => `$${Math.round(n)}`;
const round = (x: number) => Math.round(x);
const nameOf = (v: string) => LIBRARY[v]?.label ?? v;
const listOf = (vs: string[]) => { const n = vs.map(nameOf); return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] ?? ''; };
const inch = (mm: number) => Math.round(mm / 25.4);

/** Plants (live, not floaters, not land) and corals that ask the water light for something. */
const demanding = (S: TankSetup): Item[] => S.items.filter(it => (it.kind === 'plant' || it.kind === 'coral') && !!NEEDS[it.variant] && !isLand(NEEDS[it.variant]) && !isFloat(it.variant));
/** The PAR at the substrate (coral: at the coral) they need to live fine: the strictest of them, from lightneeds' own minimum. */
const parTarget = (items: Item[]) => Math.max(0, ...items.map(it => minPar(it.variant)));
const names = (items: Item[], par: number) => [...new Set(items.filter(it => minPar(it.variant) >= par - 0.01).map(it => it.variant))];
const meanPar = (S: TankSetup) => lightOutCached(S)?.mean ?? 0;
const parWith = (S: TankSetup, p: LightProduct) => { const T = structuredClone(S); T.light.owned = false; applyLightProduct(T.light, T.tank, p); return meanPar(T); };

/** The cheapest reef light for this tank that reaches `want` PAR, else the strongest: bars that fit its length, hanging fixtures (one box per published coverage). */
function reefLight(S: TankSetup, want: number): { product: LightProduct; par: number; priceUsd: number } | undefined {
  const L = S.tank.L, list = LIGHT_PRODUCTS.filter(p => p.water === 'salt' && L >= p.fitMinMm && L <= p.fitMaxMm && !!listedPrice(p))
    .map(p => ({ product: p, par: parWith(S, p), priceUsd: listedPrice(p)! * (p.mount === 'hanging' ? hangingUnits(S.tank, p) : 1) }))
    .sort((a, b) => a.priceUsd - b.priceUsd);
  return list.find(x => x.par >= want) ?? list.reduce<typeof list[number] | undefined>((a, b) => !a || b.par > a.par ? b : a, undefined);
}

const FEED_RANK: Record<GrowFeed, number> = { low: 0, ferts: 1, co2: 2 };
const CORAL_TIER: Record<CoralNeed['dosing'], GrowFeed> = { none: 'low', light: 'low', regular: 'ferts', daily: 'co2' };
const DOSING_WORDS: Record<GrowFeed, string> = { low: 'light', ferts: 'regular', co2: 'daily' };

/**
 * Add what the scene's plants / corals need and say so. `scene` is not mutated. A scene with nothing photosynthetic still gets a basic light (it is a tank the person looks at); a dry enclosure
 * gets a generic LED fixture over its plants. Safe to run again: a scene that already has what it needs is returned unchanged with no lines.
 */
export function applySetupNeeds(scene: TankSetup, opts: NeedOpts = {}): SetupNeeds {
  const S = structuredClone(scene), lines: NeedLine[] = [];
  const wet = S.water.on, salt = wet && !!S.water.salt;
  const budget = opts.brief ? valueOf(opts.brief, 'constraints.budget') : undefined;
  const asked = !!opts.brief && valueOf(opts.brief, 'preferences.lowtech') === true, lowTech = asked || !!opts.lowTech;
  let setupUsd = 0, monthlyUsd = 0;
  const say = (l: NeedLine) => { lines.push(l); setupUsd += l.setupUsd; monthlyUsd += l.monthlyUsd; };
  const hasPhoto = S.items.some(it => (it.kind === 'plant' || it.kind === 'coral') && !!NEEDS[it.variant]);

  // ---- CO2: never for a low-tech brief or a budget that cannot carry it; the plants that demand it are swapped for ones that suit the light
  const co2Plants = () => demanding(S).filter(it => it.kind === 'plant' && (NEEDS[it.variant] as PlantNeed).co2 === 'required');
  if (wet && !salt && co2Plants().length) {
    const kit = optionCost(S, 'co2', co2Option(S)).setup.mode, fert = optionCost(S, 'ferts', 'aio').monthly.mode;
    const tight = typeof budget === 'number' && budget > 0 && kit + fert * 12 + (lightFor(S)?.priceUsd ?? 0) > budget * TIGHT_SHARE;
    if (lowTech || tight) {
      const swapped: string[] = [];
      for (const it of co2Plants()) {
        const to = LOW_TECH_SWAP[it.variant];
        if (!to || !LIBRARY[to]) continue;
        swapped.push(it.variant);
        it.variant = to; it.size = Math.min(it.size, LIBRARY[to].max ?? it.size);
      }
      const gone = [...new Set(swapped)];
      if (gone.length) say({ kind: 'swap', setupUsd: 0, monthlyUsd: 0, text: `${listOf(gone)} need${gone.length > 1 ? '' : 's'} CO2 and strong light. ${asked ? 'You asked for low-tech' : lowTech ? 'This look is low-tech' : `To keep light and plant care inside your ${usd(budget as number)} budget`}, so ${gone.map(g => `${nameOf(g)} became ${nameOf(LOW_TECH_SWAP[g])}`).join(', ')}: plants that grow in the light your tank has, with no CO2.` });
    }
  }

  // ---- light
  const items = demanding(S), want = parTarget(items), who = names(items, want);
  const fx = fixtureOf(S.light), hasLight = fx !== 'flat' && wattsOf(S) > 0, owned = !!S.light.owned;
  let picked: LightProduct | undefined;
  if (!hasPhoto || !items.length) {
    // nothing that needs strength: a tank still has a light the person can see
    if (!hasLight && !owned) {
      if (wet && !salt) { const b = basicLight(S); if (b) { applyLightProduct(S.light, S.tank, b.product); picked = b.product; say({ kind: 'light', setupUsd: b.priceUsd, monthlyUsd: 0, text: `A light is included so the tank is lit: the ${productName(b.product)} (${inch(S.tank.L)} in tank), ${usd(b.priceUsd)}.` }); } }
      else if (!wet) { S.light = { ...S.light, type: 'led', tech: 'led-planted', count: 1, watts: undefined }; fitFixture(S.light, S.tank, true); say({ kind: 'light', setupUsd: 0, monthlyUsd: 0, text: 'A light is included so the enclosure is lit.' }); }
    }
  } else if (wet) {
    const cur = hasLight ? meanPar(S) : 0, weak = cur < want;
    const pick = salt ? reefLight(S, want) : lightFor(S);
    const replace = pick && !owned && (!hasLight || (weak && !!opts.generated) || badFit(S));
    const unitsOf = (p: LightProduct) => (p.mount === 'hanging' ? hangingUnits(S.tank, p) : 1);
    if (replace && pick) {
      applyLightProduct(S.light, S.tank, pick.product); picked = pick.product;
      const units = unitsOf(pick.product);
      say({
        kind: 'light', setupUsd: pick.priceUsd, monthlyUsd: 0,
        text: `${want < 15 ? `${listOf(who)} ${who.length > 1 ? 'are' : 'is'} low-light, so a basic light does it` : `${listOf(who)} ${who.length > 1 ? 'want' : 'wants'} about ${round(want)} PAR${salt ? ' at the coral' : ' at the substrate'}`}: a ${units > 1 ? `${units} x ` : ''}${productName(pick.product)} is included (${units > 1 ? `${units} boxes to span the ${inch(S.tank.L)} in tank, about ${round(pick.par)} PAR` : pick.product.mount === 'hanging' ? `one box covers the ${inch(S.tank.L)} in tank, about ${round(pick.par)} PAR` : `${inch(S.tank.L)} in tank, about ${round(pick.par)} PAR`}), ${usd(pick.priceUsd)}.${pick.par < want ? ` It is the strongest that fits this tank and still falls short (${round(pick.par)} of ${round(want)}): ${salt ? 'a bigger or second fixture' : 'a stronger light'} or hardier ${salt ? 'corals' : 'plants'} would fit better.` : ''}`,
      });
    } else if (hasLight && weak) {
      const fix = salt ? reefLight(S, want) : lightFor(S);
      const cheap = fix && fix.par >= want ? ` The cheapest fix is the ${productName(fix.product)} (${usd(fix.priceUsd)}, about ${round(fix.par)} PAR).` : '';
      say({ kind: 'flag', setupUsd: 0, monthlyUsd: 0, text: `${owned ? 'Your light' : 'The light'} gives about ${round(cur)} PAR; ${listOf(who)} want${who.length > 1 ? '' : 's'} about ${round(want)}.${cheap}${owned ? ' It is kept as it is.' : ''}` });
    }
  } else if (!owned && (!hasLight || (opts.generated && meanPar(S) < want))) {
    // a dry enclosure: a generic LED over the plants, its watts raised within the fixture's range until it reaches what they want
    S.light = { ...S.light, type: 'led', tech: 'led-planted', count: 1, watts: undefined }; fitFixture(S.light, S.tank, true);
    const r = powerRange(S.light, S.tank);
    if (r) { let w = r[2]; for (; w < r[1] && meanPar({ ...S, light: { ...S.light, watts: w } }) < want; w = Math.min(r[1], w * 1.25)); S.light.watts = Math.round(w); }
    const got = meanPar(S);
    say({ kind: 'light', setupUsd: 0, monthlyUsd: 0, text: `${listOf(who)} want${who.length > 1 ? '' : 's'} about ${round(want)} PAR: a ${round(wattsOf(S))} W grow light is included over the plants (about ${round(got)} PAR).${got < want ? ` It is the strongest this fixture goes: ${listOf(who)} will want a stronger one.` : ''}` });
  }

  // ---- ferts and CO2 (fresh), coral dosing (salt): the feed the plants / corals call for, raised never lowered. The care rows go into the scene's tech, so the price list charges what these lines say
  // (the Tech menu's own parts); rows the owner chose are theirs and are only flagged when they fall short. A generated scene's rows are the generator's, not a choice.
  const chosen = !opts.generated && (S.tech?.rows.co2 !== undefined || S.tech?.rows.ferts !== undefined || (salt && S.tech?.rows.dosing !== undefined));
  const raise = (feed: GrowFeed) => { S.tech = setFeed(techOf(S), feed, salt); S.grow.feed = feed; if (feed === 'co2' && !salt) S.tech.rows.co2 = co2Option(S); };
  if (wet && !salt) {
    const feed = needFeed(S), have = feedFor(S);
    if (FEED_RANK[feed] > FEED_RANK[have] && chosen) {
      const who = [...new Set(demanding(S).filter(it => it.kind === 'plant' && (NEEDS[it.variant] as PlantNeed)[feed === 'co2' ? 'co2' : 'ferts'] === 'required').map(it => it.variant))];
      say({ kind: 'flag', setupUsd: 0, monthlyUsd: 0, text: `${listOf(who)} need${who.length > 1 ? '' : 's'}${feed === 'co2' ? ' injected CO2 and' : ''} regular fertiliser; the care you set up (CO2 ${S.tech?.rows.co2 ?? 'none'}, ferts ${S.tech?.rows.ferts ?? 'none'}) is kept, so they will struggle until it is raised.` });
    } else if (FEED_RANK[feed] > FEED_RANK[have]) {
      raise(feed);
      const fp = demanding(S).filter(it => it.kind === 'plant' && (NEEDS[it.variant] as PlantNeed).ferts === 'required').map(it => it.variant), cp = co2Plants().map(it => it.variant);
      if (feed === 'co2') {
        const opt = S.tech?.rows.co2 ?? co2Option(S), c = optionCost(S, 'co2', opt), cv = [...new Set(cp)];
        say({ kind: 'co2', setupUsd: c.setup.mode, monthlyUsd: c.monthly.mode, text: `${listOf(cv)} need${cv.length > 1 ? '' : 's'} injected CO2 and strong light: a ${(optionDef('co2', opt)?.label ?? 'CO2 kit').toLowerCase()} is included${opt === 'diy' ? ' (the cheapest way: a yeast or citric acid and baking soda bottle; a pressurized kit is the upgrade)' : ''}, ${usd(c.setup.mode)} to set up and about ${usd(c.monthly.mode)} a month for the refill.` });
      }
      const f = optionCost(S, 'ferts', S.tech?.rows.ferts ?? 'aio'), fv = [...new Set(fp.length ? fp : cp)];
      say({ kind: 'ferts', setupUsd: f.setup.mode, monthlyUsd: f.monthly.mode, text: `${listOf(fv)} need${fv.length > 1 ? '' : 's'} regular fertiliser: an all-in-one liquid is included, about ${usd(f.monthly.mode)} a month.` });
    }
  } else if (salt) {
    const corals = S.items.filter(it => it.kind === 'coral' && isCoralNeed(NEEDS[it.variant]));
    const tier = corals.reduce<GrowFeed>((t, it) => { const x = CORAL_TIER[(NEEDS[it.variant] as CoralNeed).dosing]; return FEED_RANK[x] > FEED_RANK[t] ? x : t; }, 'low');
    const hungry = [...new Set(corals.filter(it => CORAL_TIER[(NEEDS[it.variant] as CoralNeed).dosing] === tier).map(it => it.variant))];
    if (FEED_RANK[tier] > FEED_RANK[feedFor(S)] && chosen) {
      say({ kind: 'flag', setupUsd: 0, monthlyUsd: 0, text: `${listOf(hungry)} need ${DOSING_WORDS[tier]} calcium and alkalinity dosing; the dosing you set up is kept, so they will struggle until it is raised.` });
    } else if (FEED_RANK[tier] > FEED_RANK[feedFor(S)]) {
      raise(tier);
      const c = optionCost(S, 'dosing', S.tech?.rows.dosing ?? 'twopart');
      say({ kind: 'dosing', setupUsd: c.setup.mode, monthlyUsd: c.monthly.mode, text: `${listOf(hungry)} use up calcium and alkalinity and need ${DOSING_WORDS[tier]} dosing: ${tier === 'co2' ? 'a dosing pump with two-part' : 'two-part dosing by hand'} is included, ${usd(c.setup.mode)} to set up and about ${usd(c.monthly.mode)} a month.` });
    }
  }
    if (monthlyUsd + setupUsd > 0 && typeof budget === 'number' && budget > 0 && setupUsd > budget * TIGHT_SHARE) {
    say({ kind: 'flag', setupUsd: 0, monthlyUsd: 0, text: `Light and plant care add ${usd(setupUsd)} at set-up, ${Math.round(setupUsd / budget * 100)} % of your ${usd(budget)} budget. Dropping the demanding plants would remove most of it.` });
  }
  return { scene: S, lines, ...(picked ? { light: picked } : {}), setupUsd, monthlyUsd };
}

/** The cheapest CO2 that still does the job (Nathan 2026-11-03): the DIY bottle (yeast, or citric acid and baking soda, about $15) up to the 30 gal the tech note says it holds; a pressurized kit above. */
export const DIY_CO2_MAX_GAL = 30;
const co2Option = (S: TankSetup) => (volume(S.tank).gallons <= DIY_CO2_MAX_GAL ? 'diy' : 'pressurized');

/** A catalogue light that no longer fits the tank's length (a tank swapped after the light was chosen). */
function badFit(S: TankSetup): boolean {
  const p = LIGHT_PRODUCTS.find(x => x.id === S.light.product);
  return !!p && (p.mount === 'bar' || p.mount === 'rim-legs') && (S.tank.L < p.fitMinMm || S.tank.L > p.fitMaxMm);
}
