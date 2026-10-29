// Create a look (lane C7, spec research/design/start-flow.md section (e)): style first, animals second. Pure logic for ui/lookPick.ts: the
// style tiles, the size chips each style offers, the empty-stocking tank, and the animals that suit a chosen style (allowedStyles inverted,
// ranked by pool membership as rankStyles does). Everything priced and placed by the existing scape / build engines; no numbers of its own.
import { SPECIES } from '../data/species';
import { emptyBuild, buildsFor, type Build } from './builds';
import { groupMinimum } from './groupMin';
import { LAYOUTS, STYLES, STYLE_KIND } from './items';
import { allowedStyles, finSensitive, plantNeeds, priceScape, scapeOption, scapeSetup, type PlantMode, type ScapeOption } from './scapes';
import { itemLights } from './lightcheck';
import { catalogueSizes, fitIn, type AnimalCount } from './tankfit';
import type { TankModel } from '../data/tanks';
import type { LayerDens, LayoutId } from './types';

export type LookStyle = Exclude<LayoutId, 'none'>;
/** The tiles of screen 1: the spec's eight plus the biotopes people ask for by name. */
export const LOOK_TILES: readonly LookStyle[] = ['nature', 'iwagumi', 'dutch', 'jungle', 'planted', 'driftwood', 'blackwater', 'malawi', 'reef', 'rainforest', 'arid', 'paludarium'];
export const isLandLook = (s: LookStyle) => STYLE_KIND[s] === 'land';
/** Whether the plants question applies: live / artificial / mixed makes sense for freshwater and paludarium looks only. */
export const asksPlants = (s: LookStyle) => !isLandLook(s) && STYLE_KIND[s] !== 'salt';

const SIZE_NAMES = ['10 gal', '20 gal long', '29 gal', '40 gal breeder', '75 gal'];
/** The size chips: the spec's 10 / 20 long / 29 / 40 / 75 for water looks; terrarium looks get four evenly spread terrarium sizes. */
export function lookSizes(style: LookStyle): TankModel[] {
  const land = isLandLook(style), all = catalogueSizes(land).map(c => c.m);
  if (land) return [0, 0.3, 0.6, 1].map(f => all[Math.round(f * (all.length - 1))]).filter((m, i, a) => a.indexOf(m) === i);
  const named = SIZE_NAMES.flatMap(n => all.filter(m => m.name === n).slice(0, 1));
  return named.length ? named : all.slice(0, 5);
}
/** The default size a look first appears in: 20 gal long (spec), or the second terrarium size. */
export const defaultSize = (style: LookStyle): TankModel => { const s = lookSizes(style); return s.find(m => m.name === '20 gal long') ?? s[Math.min(1, s.length - 1)]; };

export const lookLabel = (s: LookStyle) => LAYOUTS[s].label;
export const lookHint = (s: LookStyle) => LAYOUTS[s].hint;

/** The style in an empty tank of this size: the empty-stocking build, scaped. */
export function lookOption(style: LookStyle, tank: TankModel, mode: PlantMode, now = Date.now()): ScapeOption {
  return scapeOption(emptyBuild(tank, now), { style, score: 1, why: [] }, asksPlants(style) ? mode : 'live', now);
}

export interface LookAnimal { id: string; name: string; n: number; inPool: boolean }
/** Animals that suit this look and fit this tank at their recommended minimum group: the styles' own stock first, then the rest by name. */
export function animalsFor(style: LookStyle, tank: TankModel, max = 12): LookAnimal[] {
  const pool = new Set(STYLES[style].animals);
  const out: LookAnimal[] = [];
  for (const sp of SPECIES) {
    if (!allowedStyles([{ species: sp.id, n: 1 }]).includes(style)) continue;
    const n = groupMinimum(sp)?.n ?? 1;
    const fit = fitIn([{ species: sp.id, n }], tank);
    if (!fit || fit.fails.length) continue;
    out.push({ id: sp.id, name: sp.name, n, inPool: pool.has(sp.id) });
  }
  return out.sort((a, b) => +b.inPool - +a.inPool || a.name.localeCompare(b.name)).slice(0, max);
}

/** The finished look with animals: the balanced build for them in this tank, scaped in the style (the existing hand-off). */
export function lookWithAnimals(style: LookStyle, tank: TankModel, mode: PlantMode, animals: AnimalCount[], now = Date.now()): { build: Build; setup: ReturnType<typeof scapeSetup> } {
  const build = buildsFor(animals, tank, now)[2];
  return { build, setup: scapeSetup(build, style, asksPlants(style) ? mode : 'live') };
}

// ---- seeded variant tiles (lane NG5, demand/taste.ts): several real rendered examples per look, told apart by size, plant mode, density and seed ----
/** One example of a look. A style cue only: it promises neither species nor gear (the tank is drawn empty, priced as the empty-stocking build). */
export interface LookVariant { id: string; style: LookStyle; tank: TankModel; mode: PlantMode; dens: Partial<LayerDens>; seed: number; caption: string }
const MODE_WORD: Record<PlantMode, string> = { live: 'live plants', artificial: 'artificial plants', mixed: 'live and artificial' };
/** Three examples per look: a small, plain one; the look's usual size; a larger, fuller one (water looks also change plant mode, so cost and care really differ). */
export function lookVariants(style: LookStyle): LookVariant[] {
  const sizes = lookSizes(style), plants = asksPlants(style), at = (i: number) => sizes[Math.max(0, Math.min(sizes.length - 1, i))];
  const defs: { key: string; tank: TankModel; mode: PlantMode; dens: Partial<LayerDens>; seed: number; word: string }[] = [
    { key: 'small', tank: at(0), mode: 'artificial', dens: { hard: 1, plant: 1 }, seed: 1101, word: 'sparse' },
    { key: 'usual', tank: defaultSize(style), mode: 'live', dens: {}, seed: 2203, word: 'balanced' },
    { key: 'full', tank: at(Math.min(3, sizes.length - 1)), mode: 'live', dens: { hard: 2, plant: 3 }, seed: 3307, word: 'full' },
  ];
  return defs.map(d => {
    const mode: PlantMode = plants ? d.mode : 'live';
    return { id: `${style}.${d.key}`, style, tank: d.tank, mode, dens: d.dens, seed: d.seed, caption: `${d.word}${plants ? `, ${MODE_WORD[mode]}` : ''}` };
  });
}
/** A variant drawn and priced, in the shape of lookOption's result (the same engines; the light note is read off the variant's own plants). */
export function lookVariant(v: LookVariant, now = Date.now()): ScapeOption {
  const build = emptyBuild(v.tank, now), base = structuredClone(build.setup);
  base.layout = { ...base.layout, seed: v.seed };
  const setup = scapeSetup(build, v.style, v.mode, base, { dens: v.dens }), D = priceScape(setup, build, now), needs = plantNeeds(setup);
  const lights = itemLights(setup), hard = lights ? [...lights.values()].filter(l => l.outcome.state === 'struggle') : [];
  return {
    style: v.style, label: lookLabel(v.style), hint: lookHint(v.style), score: 1, why: [], setup,
    setupUsd: Math.round(D.totals.setupUsd), upkeepUsdMo: Math.round(D.totals.upkeepUsdMo), minPerWeek: Math.round(D.totals.minPerWeek),
    light: needs.light, co2: needs.co2,
    ...(hard.length ? { lightNote: `${hard.length} of ${needs.live} live plants would struggle under this build's light. A stronger light, CO2 or other plants fix it`, struggling: hard.length } : {}),
    liveCount: needs.live, fakeCount: setup.items.filter(it => it.kind === 'artificial').length, mode: v.mode, silk: finSensitive(build.animals),
  };
}
