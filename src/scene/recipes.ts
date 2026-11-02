// Density recipes (lane VD4, 2026-11-02; spec research/design/visual-discovery-spec.md sections 03 and 04): an archetype
// (scene/archetypes.ts) + a density (open / balanced / full) + a tank -> the starting scene the discovery flow shows and
// Make It Your Own opens. Density changes ONLY visual amount: the hardscape and plant / coral layers' density stops
// (items.ts `LayerDens`, `STYLES`, drawn by `starterItems`). The tank, its gear, light, background, water, the
// composition (seed + `CompId`) and the focal animals come from one build and stay fixed across the trio, so the person
// chooses density and not lighting or livestock (spec 03 "Art-direction requirement"). No art of its own and no engine
// numbers: the scene is the look's starter set through scapes.ts `scapeSetup`, as Create a look draws it. Archetypes
// without a mapped look stay coming-soon (no recipe).
import { emptyBuild, buildsFor, type Build } from './builds';
import { itemDims, STYLES } from './items';
import { getSpecies } from '../data/species';
import { groupMinimum } from './groupMin';
import { scapeSetup, type PlantMode } from './scapes';
import { catalogueSizes, fitIn, type AnimalCount } from './tankfit';
import { archetype as archetypeById, type Archetype, type Density } from './archetypes';
import type { TankModel } from '../data/tanks';
import type { CompId, LayerDens, LayoutId, TankSetup } from './types';

export const DENSITIES: readonly Density[] = ['open', 'balanced', 'full'];
type Stops = Pick<LayerDens, 'hard' | 'plant'>;
type Trio = Record<Density, Stops>;
/** Density slider stops (items.ts DENS_RANGE: -1 one piece .. 2 the set as designed .. 6 far too much) per level. */
const t = (o: [number, number], b: [number, number], f: [number, number]): Trio =>
  ({ open: { hard: o[0], plant: o[1] }, balanced: { hard: b[0], plant: b[1] }, full: { hard: f[0], plant: f[1] } });

/**
 * The stops per look (spec 04 where it names the archetype; the archetype's own `density` notes otherwise). Balanced is
 * always the set as designed (2 / 2); full stays at or under Packed (4) so dense still reads as the archetype.
 */
const BY_LOOK: Partial<Record<Exclude<LayoutId, 'none'>, Trio>> = {
  // Iwagumi: 3 / 5 / 7 stones (STYLES.iwagumi.stones), a richer stone composition and a fuller carpet, never a jungle
  iwagumi: t([0, 1], [2, 2], [4, 3.5]),
  // Dutch: no hardscape at any level; fuller groups, still distinct streets (not Packed)
  dutch: t([0, 0.5], [2, 2], [2, 3.5]),
  // Blackwater Creek: one main branch / several roots / a tangle of roots, swimming space kept
  blackwater: t([-1, 0], [2, 2], [4, 3]),
  // Underwater Forest: few isolated trees / woodland + clearings / interconnected forest
  forest: t([0, 0.5], [2, 2], [3.5, 3.5]),
  // African Cichlid Rockscape: one stable rock pile / several caves / layered stone end to end
  malawi: t([0, 0.5], [2, 2], [4, 2.5]),
  // coral: separate focal points / spaced colonies / rich cover with safe spacing (coral at Full, not Packed)
  reef: t([1, 0], [2, 2], [2.5, 3]), softreef: t([1, 0], [2, 2], [2.5, 3]), spsreef: t([1, 0], [2, 2], [2.5, 3]), clownnano: t([1, 0], [2, 2], [2.5, 3]),
  // shore and paludarium: the land keeps some structure even when open (animals use it)
  swamp: t([1, 0.5], [2, 2], [3, 3.5]), paludarium: t([1, 0.5], [2, 2], [3, 3.5]),
};
/** Terrarium looks: open never removes hides, climbing or thermal structure (spec 03), so hardscape stays as designed
 *  at open and balanced; open thins only the plants, full adds both. */
const LAND: Trio = t([2, 0.5], [2, 2], [3, 3.5]);
const WATER: Trio = t([0.5, 0.5], [2, 2], [3.5, 3.5]);

/** Per-archetype choices on top of the look: the composition that tells siblings sharing one look apart (fixed across
 *  the trio), and archetypes whose recipe is not the look's own plants. */
interface Tweak { comp?: CompId; seed?: number; noPlants?: boolean; dens?: Trio }
const TWEAKS: Record<string, Tweak> = {
  // reef siblings (one 'reef' look): the shape of the rock is the archetype
  'reef-arches': { comp: 'v' }, 'reef-islands': { comp: 'u' }, 'reef-rock-art': { comp: 'mound' }, 'reef-skyline': { comp: 'scattered' },
  'mixed-reef': { comp: 'scattered', seed: 2 }, 'blue-glow-reef': { comp: 'mound', seed: 3 },
  // driftwood siblings
  'betta-retreat': { comp: 'side' }, 'puffer-den': { comp: 'mound' }, 'brackish-planted': { comp: 'u' },
  // shore: open mud / beach kept to one side
  'mudskipper-mudflat': { comp: 'side' }, 'fiddler-crab-beach': { comp: 'side', seed: 2 }, 'riverbank-shore': { comp: 'side' },
  'basking-scrubland': { comp: 'mound' }, 'cascade-wall': { comp: 'u' },
  // Big Fish Showcase: bare floor / one rock / sand, rocks and a root, no plants (big fish uproot them)
  'big-fish-showcase': { noPlants: true, dens: t([-1, -1], [-1, -1], [0, -1]) },
};

const land = (a: Archetype) => a.env === 'terrarium';
/** The look an archetype's scene is drawn in (its first mapped look); 'none' (bare) is drawn as plain stones. */
export function recipeLook(a: Archetype): Exclude<LayoutId, 'none'> | undefined {
  const l = a.recipe.looks[0];
  return l === undefined ? undefined : l === 'none' ? 'stones' : l;
}
/** The density stops of one level of an archetype. */
export function recipeDens(a: Archetype, d: Density): Stops {
  const look = recipeLook(a), trio = TWEAKS[a.id]?.dens ?? (land(a) ? LAND : (look && BY_LOOK[look]) ?? WATER);
  return { ...trio[d] };
}

/** The smallest catalogue tank the archetype's own `minGallons` allows (terrariums for terrarium archetypes). */
export function minTank(a: Archetype): TankModel {
  const all = catalogueSizes(land(a)), g = a.tags.minGallons ?? 0;
  return (all.find(c => c.m.ratedGal >= g) ?? all[all.length - 1]).m;
}

/** The animal an archetype is named for, where it has one (the look's pool leads with a community fish otherwise). */
const FOCAL: Record<string, string> = {
  'goldfish-palace': 'goldfish', 'big-fish-showcase': 'oscar', 'betta-retreat': 'betta', 'clownfish-anemone': 'ocellaris',
  'african-cichlid-rockscape': 'labeo', 'blackwater-creek': 'cardinal', 'snake-hideaway': 'ballpython', 'rocky-desert-canyon': 'leopardgecko',
  'basking-scrubland': 'leopardgecko', 'tarantula-burrow': 'chacogoldenknee', 'jumping-spider-loft': 'regaljumper',
  'dart-frog-rainforest': 'dartfrog', 'rainforest-canopy': 'crestedgecko',
};
/** The focal animals that stay fixed across the trio: the archetype's own animal, else the first species of the look's
 *  pool (its headliner), at its recommended minimum group and only if it fits the tank. None when nothing fits, and none
 *  by default for brackish archetypes (their looks' pools are freshwater animals; the brief brings its own). */
export function focalAnimals(a: Archetype, tank: TankModel): AnimalCount[] {
  const look = recipeLook(a), own = FOCAL[a.id];
  const pool = own ? [own] : !look || a.recipe.looks[0] === 'none' || a.water === 'brackish' ? [] : STYLES[look].animals;
  for (const id of pool) {
    const sp = getSpecies(id), n = sp ? groupMinimum(sp)?.n ?? 1 : 0, fit = sp && fitIn([{ species: id, n }], tank);
    if (fit && !fit.fails.length) return [{ species: id, n }];
  }
  return [];
}

/** Hides and climbing: caves (half-logs, burrows) and wood (branches, cork) a terrarium's open level must keep. */
export const shelterCount = (S: TankSetup) => S.items.filter(it => it.kind === 'cave' || it.kind === 'wood').length;

/** One archetype in one tank, ready for its three densities: the build (tank, gear, animals) every level shares, and the
 *  composition seed the trio is drawn with. */
export interface RecipeBase { archetype: Archetype; tank: TankModel; animals: AnimalCount[]; build: Build; seed: number; scenes: Record<Density, TankSetup> }

function draw(a: Archetype, b: Build, seed: number, d: Density): TankSetup {
  const tw = TWEAKS[a.id] ?? {}, setup = structuredClone(b.setup);
  setup.layout = { ...setup.layout, seed, comp: tw.comp ?? 'any' };
  delete setup.layout.plantSeed; delete setup.layout.animalSeed;
  const mode: PlantMode = a.recipe.plantMode ?? 'live';
  const S = scapeSetup(b, recipeLook(a)!, mode, setup, { dens: recipeDens(a, d) });
  if (tw.noPlants) S.items = S.items.filter(it => it.kind !== 'plant' && it.kind !== 'artificial');
  if (a.recipe.looks[0] === 'none' && d === 'open') S.items = [];
  return S;
}
/** The trio reads as a progression: each level visibly fuller than the one before (by `margin`, a share of the level
 *  below), and a terrarium's open level keeps every hide and climb the balanced one has. */
function progresses(a: Archetype, s: Record<Density, TankSetup>, margin: number) {
  const [o, b, f] = DENSITIES.map(d => coverOf(s[d]));
  return o * (1 + margin) < b && b * (1 + margin) < f && (!land(a) || shelterCount(s.open) >= shelterCount(s.balanced));
}
/** Composition seeds tried, after the archetype's own (seed 1 = the set as designed). */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * The shared build, then the trio. A starter set is a random draw, and at one seed a sparser level can happen to cover
 * more than a fuller one (a carpet patch landing big); the density step must show a real progression, so the trio is
 * drawn at the first seed (the archetype's own first) where each level is clearly fuller than the last, else where it is
 * fuller at all, else at the archetype's own seed. The seed is one composition for all three levels.
 */
export function recipeBase(a: Archetype | string, tank: TankModel, animals?: AnimalCount[], now = Date.now()): RecipeBase | undefined {
  const arch = typeof a === 'string' ? archetypeById(a) : a;
  if (!arch || arch.support === 'coming-soon' || !recipeLook(arch)) return undefined;
  const roster = animals ?? focalAnimals(arch, tank);
  const build = roster.length ? buildsFor(roster, tank, now)[2] : emptyBuild(tank, now);
  const own = TWEAKS[arch.id]?.seed ?? 1, seeds = [own, ...SEEDS.filter(s => s !== own)];
  const trio = (seed: number) => ({ open: draw(arch, build, seed, 'open'), balanced: draw(arch, build, seed, 'balanced'), full: draw(arch, build, seed, 'full') });
  const tried = new Map<number, Record<Density, TankSetup>>(), at = (s: number) => tried.get(s) ?? (tried.set(s, trio(s)), tried.get(s)!);
  const seed = seeds.find(s => progresses(arch, at(s), 0.08)) ?? seeds.find(s => progresses(arch, at(s), 0)) ?? own;
  return { archetype: arch, tank, animals: roster, build, seed, scenes: at(seed) };
}

/** The starting scene of an archetype at a density (a copy: the base can hand it out again). */
export const sceneAt = (base: RecipeBase, d: Density): TankSetup => structuredClone(base.scenes[d]);

/** `recipeScene(archetype, density, tank)`: the starting scene, or undefined for an archetype without a look (coming soon). */
export function recipeScene(a: Archetype | string, d: Density, tank: TankModel, animals?: AnimalCount[], now = Date.now()): TankSetup | undefined {
  const base = recipeBase(a, tank, animals, now);
  return base && sceneAt(base, d);
}
/** All three densities on one build (what the density step shows side by side). */
export function recipeTrio(a: Archetype | string, tank: TankModel, animals?: AnimalCount[], now = Date.now()): Record<Density, TankSetup> | undefined {
  const base = recipeBase(a, tank, animals, now);
  return base && { open: sceneAt(base, 'open'), balanced: sceneAt(base, 'balanced'), full: sceneAt(base, 'full') };
}

/** Visual amount, 0..1: the share of the floor the items cover seen from above, and of the front glass they fill seen
 *  from the front, averaged (a coarse grid, overlaps counted once, boxes not shapes: a relative measure for comparing the
 *  densities of one scene). */
export function coverOf(S: TankSetup): number {
  const { L, H, D } = S.tank, N = 64, top = new Uint8Array(N * N), front = new Uint8Array(N * N);
  const mark = (g: Uint8Array, x0: number, x1: number, y0: number, y1: number) => {
    const i0 = Math.max(0, Math.floor(x0 * N)), i1 = Math.min(N - 1, Math.floor(x1 * N)), j0 = Math.max(0, Math.floor(y0 * N)), j1 = Math.min(N - 1, Math.floor(y1 * N));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g[j * N + i] = 1;
  };
  for (const it of S.items) {
    const [l0, h, w0] = itemDims(it), turn = Math.abs(Math.sin(it.yaw * Math.PI / 180)), l = l0 + (w0 - l0) * turn, w = w0 + (l0 - w0) * turn;
    mark(top, (it.x - l / 2) / L, (it.x + l / 2) / L, (it.depth - w / 2) / D, (it.depth + w / 2) / D);
    mark(front, (it.x - l / 2) / L, (it.x + l / 2) / L, Math.max(0, it.lift) / H, (Math.max(0, it.lift) + h) / H);
  }
  const share = (g: Uint8Array) => g.reduce((a, v) => a + v, 0) / g.length;
  return (share(top) + share(front)) / 2;
}
