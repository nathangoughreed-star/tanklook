// The scape choice of path 1, "An animal I want" (lane P6b, 2026-10-20): after the user picks a build, which STYLES suit these animals, and
// what each one costs in THEIR tank. Pure functions (src/ui/scapePick.ts draws them): rank the starter styles by how well the animals
// belong in them, build each one into the picked build's tank (animals and gear stay), turn the live plants into silk / plastic ones when
// the user asked for artificial or mixed, and read the set-up $, minutes a week, light and CO2 need off the engines (the demand model,
// the plant light needs, the light check), never from numbers of its own. It READS builds, tankfit, stocking and the demand model.
import { getSpecies } from '../data/species';
import { CARE } from '../data/care';
import { dealAsKit } from '../data/deals';
import { defaultProfile, demandOf } from '../demand';
import { plantDifficulty } from '../demand/engine';
import { gearParts } from '../demand/gearDeals';
import { isFloat } from '../art/plants';
import { rng } from '../art/paint';
import type { Build } from './builds';
import { DEFAULT_DENS, FAKE_ASPECT, LAYOUTS, LIBRARY, STYLES, STYLE_KIND, isLandStyle, isSwampy, makeItem } from './items';
import { FRESH_TIERS, isCoralNeed, isLand, minPar, needOf, type PlantNeed } from './lightneeds';
import { itemLights } from './lightcheck';
import { shuffleFish } from './scatter';
import { regenerate } from './starter';
import { styleGround } from './scapeground';
import { SWAMP_LEVEL } from './terrain';
import { needsOf, type AnimalCount } from './tankfit';
import type { FitLight } from './plantfit';
import type { Item, LayerDens, LayoutId, TankSetup } from './types';

export type PlantMode = 'live' | 'artificial' | 'mixed';
export const PLANT_MODES: { id: PlantMode; label: string; blurb: string }[] = [
  { id: 'live', label: 'Live plants', blurb: 'They clean the water a little and need light, and some need CO2 and feeding.' },
  { id: 'artificial', label: 'Artificial plants', blurb: 'No light or feeding needed, never grow, no help for the water.' },
  { id: 'mixed', label: 'A mix', blurb: 'Live where the plant is easy (ferns, anubias, swords, most stems); artificial for the ones that need strong light, CO2 or feeding (carpets, red stems).' },
];

/** The tea tint blackwater styles give the water (the same colour the editor's style picker uses, ui/panels.ts BLACKWATER). */
const BLACKWATER: [string, number] = ['#6b3d14', 0.42];

/** Species of these animals, with their counts (animals that are not in the species list are ignored). */
const careOf = (id: string) => CARE[id];
const speciesOf = (animals: AnimalCount[]) => animals.flatMap(a => { const sp = getSpecies(a.species); return sp && a.n > 0 ? [{ sp, n: a.n }] : []; });

/** Water flow each style gives (the streams run the water fast; a still planted tank does not). Compared with the species' flow need. */
const STYLE_FLOW: Partial<Record<LayoutId, 'medium' | 'high'>> = { stream: 'medium', hillstream: 'high' };
const FLOW_RANK = { low: 0, medium: 1, high: 2 } as const;

export interface StyleScore { style: Exclude<LayoutId, 'none'>; score: number; why: string[] }

/**
 * Which styles may hold these animals at all: the water kind (salt animals: the marine styles; land animals: the terrarium styles; a mix of
 * land and water animals: the swamp and paludarium; everything else: the fresh and any-water styles) and nothing the animals would eat or
 * be eaten in is added here (the stocking screen's gates already answered that).
 */
export function allowedStyles(animals: AnimalCount[]): Exclude<LayoutId, 'none'>[] {
  const sp = speciesOf(animals), salt = needsOf(animals).salt;
  const dry = sp.length > 0 && sp.every(({ sp: s }) => s.habitat === 'land'), amphibious = sp.some(({ sp: s }) => s.habitat !== 'water');
  return (Object.keys(STYLES) as Exclude<LayoutId, 'none'>[]).filter(id => {
    const k = STYLE_KIND[id] ?? 'any';
    if (salt) return k === 'salt';
    if (dry) return k === 'land' || isSwampy(id);
    if (k === 'salt') return false;
    if (k === 'land') return false;
    if (isSwampy(id)) return amphibious;
    return true;
  });
}

/**
 * Styles that suit these animals, best first. A style scores the share of the animals (by count) that are in its starter pool (the species
 * the style was designed for), less a flow clash (a low-flow species in a stream, a high-flow species in still water). The ranking is
 * what the user sees as "suits your animals"; `why` says it in words.
 */
export function rankStyles(animals: AnimalCount[]): StyleScore[] {
  const sp = speciesOf(animals), total = sp.reduce((a, x) => a + x.n, 0) || 1;
  const out: StyleScore[] = allowedStyles(animals).map(style => {
    const pool = new Set(STYLES[style].animals), inPool = sp.filter(({ sp: s }) => pool.has(s.id));
    const share = inPool.reduce((a, x) => a + x.n, 0) / total;
    let score = share;
    const why: string[] = [];
    if (inPool.length) why.push(`${inPool.length === sp.length ? 'All' : `${inPool.length} of ${sp.length}`} of your kinds of animal are in this style's usual stock`);
    else why.push('None of your animals is in this style\'s usual stock, but nothing in it clashes with them');
    const flow = STYLE_FLOW[style] ?? 'low';
    for (const { sp: s } of sp) {
      const want = careOf(s.id)?.flow as keyof typeof FLOW_RANK | undefined; if (!want) continue;
      const gap = FLOW_RANK[flow] - FLOW_RANK[want];
      if (gap > 0) { score -= 0.15 * gap * (1 / sp.length); why.push(`${s.name} prefers gentler water than this style gives`); }
      else if (gap < 0 && flow === 'low' && want === 'high') { score -= 0.1 / sp.length; why.push(`${s.name} likes more flow than a still tank has (add a powerhead)`); }
      else if (want === flow && flow !== 'low') { score += 0.1 / sp.length; why.push(`${s.name} likes this much flow`); }
    }
    return { style, score: Math.max(0, score), why };
  });
  return out.sort((a, b) => b.score - a.score || Object.keys(STYLES).indexOf(a.style) - Object.keys(STYLES).indexOf(b.style));
}

/** True when an animal's long fins can be torn by hard plastic leaves (the care table's `slow` flag: long, flowing fins). */
export const finSensitive = (animals: AnimalCount[]) => speciesOf(animals).some(({ sp }) => careOf(sp.id)?.slow);
/** The long-finned species among these animals, by name. */
export const finSensitiveNames = (animals: AnimalCount[]) => speciesOf(animals).filter(({ sp }) => careOf(sp.id)?.slow).map(({ sp }) => sp.name);

const STEMS = new Set(['stem', 'stemred', 'rotala', 'ludwigia', 'hornwort', 'anacharis', 'grass', 'balansae']);
const ROSETTES = new Set(['sword', 'crypt', 'ozelot', 'lotus', 'fern', 'anubias', 'buce']);
const MATS = new Set(['moss', 'carpet', 'sagittaria', 'hairgrass']);
/** The artificial variant that stands in for a live plant, or undefined when there is none (floaters; land plants stay live). */
export function fakeFor(variant: string, silk: boolean): string | undefined {
  const m = silk ? 'silk' : 'plastic';
  if (STEMS.has(variant)) return `${m}stem`;
  if (ROSETTES.has(variant)) return `${m}sword`;
  if (MATS.has(variant)) return `${m}moss`;
  return undefined;
}

/** Whether a live plant item is swapped for an artificial one in this mode: artificial swaps every aquarium plant, mixed only the demanding ones (strong light, CO2 or both). */
const swapped = (it: Item, mode: PlantMode): boolean => {
  if (it.kind !== 'plant' || mode === 'live') return false;
  const n = needOf(it.variant);
  if (!n || isLand(n) || isCoralNeed(n)) return false;
  if (mode === 'mixed' && isFloat(it.variant)) return false; // floaters have no artificial form: a mix keeps them live
  return mode === 'artificial' || plantDifficulty(it.variant) > 1;
};

/** Artificial pieces a tank holds, per cm2 of floor: a starter style draws dozens of small live cards (carpets, moss) that one artificial mat or stem set stands in for. */
const FAKE_PER_CM2 = 1 / 120;

/** Replace the tank's live plants by artificial ones as `mode` asks (floaters have no artificial form: dropped when all-artificial, kept live in a mix; a clump of six or more stems becomes up to three pieces; the pieces are thinned evenly to what the floor holds). */
export function withPlantMode(S: TankSetup, mode: PlantMode, silk: boolean): TankSetup {
  if (mode === 'live') return S;
  const fakes: Item[] = [], keep: Item[] = [];
  let id = S.items.reduce((m, it) => Math.max(m, it.id), 0) + 1;
  for (const it of S.items) {
    if (!swapped(it, mode)) { keep.push(it); continue; }
    const v = fakeFor(it.variant, silk); if (!v) continue;
    const form = LIBRARY[v].fake!.form, n = form === 'mat' ? 1 : Math.max(1, Math.min(3, Math.round((it.stems ?? 1) / 3)));
    const size = Math.min(LIBRARY[v].max, Math.max(LIBRARY[v].min, it.size));
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k - (n - 1) / 2) * size * FAKE_ASPECT[form] * 1.1;
      fakes.push(makeItem(S.tank, v, k === 0 ? it.id : id++, it.seed + k, it.x + off, it.depth, { yaw: it.yaw, size, lift: it.lift }, S));
    }
  }
  const cap = Math.max(4, Math.round(S.tank.L * S.tank.D / 100 * FAKE_PER_CM2));
  const thin = fakes.length <= cap ? fakes : Array.from({ length: cap }, (_, i) => fakes[Math.floor(i * fakes.length / cap)]);
  return { ...S, items: [...keep, ...thin] };
}

export interface ScapeOption {
  style: Exclude<LayoutId, 'none'>;
  label: string;
  hint: string;
  score: number;
  why: string[];
  /** the build's tank with this style's ground, hardscape and plants (animals placed among them) */
  setup: TankSetup;
  setupUsd: number;
  upkeepUsdMo: number;
  minPerWeek: number;
  /** the light the live plants want, in words; the CO2 they want; a note when this build's light is too weak for some of them */
  light: string;
  co2: string;
  lightNote?: string;
  /** live plants the build's light and care would not suit */
  struggling?: number;
  liveCount: number;
  fakeCount: number;
  mode: PlantMode;
  /** the material used for artificial plants */
  silk: boolean;
}

/** The style placed in the build's tank: its ground, hardscape and plants (the animals stay where the build put them, re-scattered round the new pieces). */
export function scapeSetup(build: Build, style: Exclude<LayoutId, 'none'>, mode: PlantMode, base: TankSetup = build.setup, opts: { dens?: Partial<LayerDens>; fit?: FitLight } = {}): TankSetup {
  const S = structuredClone(base);
  S.layout.id = style; S.layout.dens = { ...DEFAULT_DENS, ...opts.dens, animal: 0 };
  if (opts.fit) S.layout.fit = opts.fit; // only plants that suit this light (plantfit.fitItems), so a finished tank never has plants that would struggle
  if (isSwampy(style) && S.water.level > SWAMP_LEVEL) S.water.level = SWAMP_LEVEL;
  if (isLandStyle(style)) S.water.on = false;
  if (style === 'blackwater') Object.assign(S.water, { color: BLACKWATER[0], opacity: BLACKWATER[1] });
  styleGround(S);
  regenerate(S, 'all', 0);
  const silk = finSensitive(build.animals), T = withPlantMode(S, mode, silk);
  shuffleFish(T, rng(11 + style.length * 17 + T.fish.length), undefined, 100);
  return T;
}

const CO2_WORD = { none: 'No CO2 needed', recommended: 'CO2 helps', required: 'Needs CO2' } as const;
const CO2_RANK = { none: 0, recommended: 1, required: 2 } as const;

/** What the live plants (not artificial ones, not land plants) in this tank want: their light in words, and CO2. */
export function plantNeeds(S: TankSetup): { light: string; co2: string; live: number } {
  const live = S.items.filter(it => it.kind === 'plant' && !isLand(needOf(it.variant) ?? { band: 'land' }) && !!needOf(it.variant));
  const coral = S.items.some(it => it.kind === 'coral');
  if (!live.length) return { light: coral ? 'Reef light for the corals' : S.items.some(it => it.kind === 'plant') ? 'Terrarium light' : 'Any light: nothing here needs it', co2: 'No CO2 needed', live: 0 };
  const par = Math.max(...live.map(it => minPar(it.variant)));
  const tier = FRESH_TIERS.find(t => par >= t.lo && par < t.hi) ?? FRESH_TIERS[FRESH_TIERS.length - 1];
  const co2 = live.reduce<keyof typeof CO2_RANK>((m, it) => { const c = (needOf(it.variant) as PlantNeed).co2; return CO2_RANK[c] > CO2_RANK[m] ? c : m; }, 'none');
  return { light: par < 5 ? 'Any light: these plants take shade' : `${tier.name} light (PAR ${tier.par})`, co2: CO2_WORD[co2], live: live.length };
}

/** Price a scape with the build's own deals (its bundle, else the gear sales it pinned), the way builds.ts priced the build. */
export function priceScape(S: TankSetup, build: Build, now = Date.now()) {
  const P = defaultProfile(), bundle = build.bundle;
  const opts = { now, ...(bundle ? { kit: dealAsKit(bundle) } : {}), ...(!bundle && build.gearDeals.length ? { parts: gearParts(S, now) } : {}) };
  return demandOf(S, P, opts);
}

/** One scape option: the style built into the tank and read off the engines. */
export function scapeOption(build: Build, sc: StyleScore, mode: PlantMode, now = Date.now()): ScapeOption {
  const S = scapeSetup(build, sc.style, mode), D = priceScape(S, build, now), needs = plantNeeds(S);
  const lights = itemLights(S), hard = lights ? [...lights.values()].filter(l => l.outcome.state === 'struggle') : [];
  const dim = hard.filter(l => l.outcome.why === 'dim').length, bright = hard.filter(l => l.outcome.why === 'bright').length, care = hard.filter(l => l.outcome.why === 'care').length;
  const causes = [dim && `${dim} too dim under this build's light`, bright && `${bright} too bright`, care && `${care} want CO2 or feeding this build does not have`].filter(Boolean).join(', ');
  return {
    style: sc.style, label: LAYOUTS[sc.style].label, hint: LAYOUTS[sc.style].hint, score: sc.score, why: sc.why, setup: S,
    setupUsd: Math.round(D.totals.setupUsd), upkeepUsdMo: Math.round(D.totals.upkeepUsdMo), minPerWeek: Math.round(D.totals.minPerWeek),
    light: needs.light, co2: needs.co2,
    ...(hard.length ? { lightNote: `${hard.length} of ${needs.live} live plants would struggle: ${causes}. A stronger light, CO2 or other plants fix it`, struggling: hard.length } : {}),
    liveCount: needs.live, fakeCount: S.items.filter(it => it.kind === 'artificial').length, mode, silk: finSensitive(build.animals),
  };
}

/** How many styles the choice shows. */
export const SHOWN = 4;

/** The suggested scapes for this build in this plant mode: the best-fitting styles, with a bare-ish fallback when few styles fit. */
export function scapeOptions(build: Build, mode: PlantMode, now = Date.now(), n = SHOWN): ScapeOption[] {
  const ranked = rankStyles(build.animals);
  const good = ranked.filter(r => r.score > 0), pool = (good.length >= 3 ? good : ranked).slice(0, n * 2);
  // styles that suit the animals about equally are told apart by what they ask of the user: the share of live plants that would struggle with this build, then the price
  const band = (o: ScapeOption) => Math.round(o.score * 10);
  const share = (o: ScapeOption) => o.liveCount ? (o.struggling ?? 0) / o.liveCount : 0;
  return pool.map(r => scapeOption(build, r, mode, now)).sort((a, b) => band(b) - band(a) || Math.round(share(a) * 4) - Math.round(share(b) * 4) || a.setupUsd - b.setupUsd).slice(0, n);
}
