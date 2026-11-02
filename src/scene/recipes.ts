// Density recipes (lane VD4, 2026-11-02; spec research/design/visual-discovery-spec.md sections 03 and 04): an archetype
// (scene/archetypes.ts) + a density (open / balanced / full) + a tank -> the starting scene the discovery flow shows and
// Make It Your Own opens. Density changes ONLY visual amount: the hardscape and plant / coral layers' density stops
// (items.ts `LayerDens`, `STYLES`, drawn by `starterItems`). The tank, its gear, light, background, water, the
// composition (seed + `CompId`) and the focal animals come from one build and stay fixed across the trio, so the person
// chooses density and not lighting or livestock (spec 03 "Art-direction requirement"). No art of its own and no engine
// numbers: the scene is the look's starter set through scapes.ts `scapeSetup`, as Create a look draws it. Archetypes
// without a mapped look stay coming-soon (no recipe).
import { emptyBuild, buildsFor, type Build } from './builds';
import { itemDims, layerOf, STYLES } from './items';
import { getSpecies } from '../data/species';
import { groupMinimum } from './groupMin';
import { scapeSetup, type PlantMode } from './scapes';
import { catalogueSizes, fitIn, type AnimalCount } from './tankfit';
import { archetype as archetypeById, type Archetype, type Density } from './archetypes';
import type { TankModel } from '../data/tanks';
import type { Background, CompId, Item, LayerDens, LayoutId, TankSetup } from './types';

export const DENSITIES: readonly Density[] = ['open', 'balanced', 'full'];
type Stops = Pick<LayerDens, 'hard' | 'plant'>;
type Trio = Record<Density, Stops>;
/** The most hardscape a Full level asks for (stop 2 = the set as designed). Past about 2.8 the starter layers stop adding "a bit more" and start
 *  piling: one level above, rocks go from a few pieces to a wall (VD6, Nathan 2026-11-02), so Full stays within one step of the designed set. */
const HARD_FULL = 2.6;
/** Density slider stops (items.ts DENS_RANGE: -1 one piece .. 2 the set as designed .. 6 far too much) per level. */
const t = (o: [number, number], b: [number, number], f: [number, number]): Trio =>
  ({ open: { hard: o[0], plant: o[1] }, balanced: { hard: b[0], plant: b[1] }, full: { hard: Math.min(f[0], HARD_FULL), plant: f[1] } });

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

/** The back-glass background each family is drawn on (existing engine options; the person changes it in the editor's Background control). A
 *  COMPLEMENT, not a match (Nathan 2026-11-02): each is chosen against the scene's dominant colours so plants, wood, stone, fish and coral stand out,
 *  dark enough to read the silhouettes and never muddy. The line beside each says what it sets off. */
const FAMILY_BG: Record<string, { bg: Background; color?: string }> = {
  'fw-gardens': { bg: 'blue' },            // green and red stems against deep blue pop more than green on green
  'fw-sculpted': { bg: 'abyss' },          // pale sand, grey stone and tan wood against a blue-to-black fade: a gallery wall
  'fw-wild': { bg: 'black' },              // cichlid blues and yellows, river stone and bark all read cleanest against black
  'fw-minimal': { bg: 'black' },           // white sand and a few stones: the sparest scene gets the strongest contrast
  'fw-playful': { bg: 'black' },           // neon, glow and bright decor against black
  'fw-showcase': { bg: 'blue' },           // orange goldfish, red betta, oscar: warm bodies against deep blue
  'sw-coral': { bg: 'black' },             // coral colours against black
  'sw-fish': { bg: 'blue' },               // orange clowns and yellow tangs against deep blue
  'sw-habitat': { bg: 'abyss' },           // pale sand, green seagrass and kelp against a deep-sea fade
  'sw-sculpted': { bg: 'blue' },           // pale live-rock arches and islands against deep blue
  'sw-glow': { bg: 'black' },              // fluorescent corals and neon against black
  'bk-mangrove': { bg: 'abyss' },          // brown roots and green leaves against a blue-black fade
  'bk-shore': { bg: 'blue' },              // tan mud and sand against deep blue
  'bk-rocky': { bg: 'lightblue' },         // dark rock and shell are the silhouettes here: a light back shows them
  'bk-fish': { bg: 'blue' },               // silver shoals and yellow archers against deep blue
  'bk-planted': { bg: 'black' },           // green fern on brown wood against black
  'te-rainforest': { bg: 'custom', color: '#33223a' }, // greens and bromeliad reds against dark plum, the opposite of green
  'te-desert': { bg: 'custom', color: '#14414a' },     // orange sand and tan rock against deep teal
  'te-woodland': { bg: 'custom', color: '#22303f' },   // bark, moss and red toadstools against slate blue
  'te-climb': { bg: 'black' },             // grey rock, cork and green against black
  'te-botanical': { bg: 'blue' },          // succulent greens and pale pots against deep blue
  'te-creature': { bg: 'blue' },           // tan and brown animals and bark against deep blue
  'pa-waterfall': { bg: 'black' },         // mossy rock, falling water and green against black
  'pa-riverbank': { bg: 'blue' },          // brown mud and green growth against deep blue
  'pa-swamp': { bg: 'custom', color: '#14414a' },      // tea-brown water and cypress against deep teal
  'pa-stream': { bg: 'abyss' },            // grey boulders and moss against a blue-black fade
  'pa-fantasy': { bg: 'black' },           // glow and colour against black
  'pa-creature': { bg: 'blue' },           // green and brown shells and shore against deep blue
};
/** Per-archetype exceptions to its family's background. */
const ARCH_BG: Record<string, { bg: Background; color?: string }> = {
  'blackwater-creek': { bg: 'blue' },      // amber water, brown leaves and wood against deep blue (black would swallow them)
  'african-cichlid-rockscape': { bg: 'black' }, // blue and yellow cichlids against black
  'betta-retreat': { bg: 'black' },        // a blue or red betta must not vanish into blue
};
/** The background an archetype's recipe draws on (a family default; never none, so a render always has one). */
export const recipeBg = (a: Archetype): { bg: Background; color?: string } => ARCH_BG[a.id] ?? FAMILY_BG[a.familyId] ?? { bg: 'black' };
/** A scene with the archetype's background on the back glass. */
export function withBg(a: Archetype, S: TankSetup): TankSetup {
  const { bg, color } = recipeBg(a);
  S.render = { ...S.render, bg, bgSides: ['back'] }; if (color) S.render.bgColor = color; else delete S.render.bgColor;
  return S;
}

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
export interface RecipeBase { archetype: Archetype; tank: TankModel; animals: AnimalCount[]; build: Build; seed: number; scenes: Record<Density, TankSetup>; /** the in-between stops 1 and 3, drawn on first use (`stopScene`) */ mids: (TankSetup | undefined)[] }

function draw(a: Archetype, b: Build, seed: number, d: Density): TankSetup {
  const tw = TWEAKS[a.id] ?? {}, setup = structuredClone(b.setup);
  setup.layout = { ...setup.layout, seed, comp: tw.comp ?? 'any' };
  delete setup.layout.plantSeed; delete setup.layout.animalSeed;
  const mode: PlantMode = a.recipe.plantMode ?? 'live';
  const S = scapeSetup(b, recipeLook(a)!, mode, setup, { dens: recipeDens(a, d) });
  if (tw.noPlants) S.items = S.items.filter(it => it.kind !== 'plant' && it.kind !== 'artificial');
  if (a.recipe.looks[0] === 'none' && d === 'open') S.items = [];
  return withBg(a, S);
}
/** The trio reads as a progression: each level visibly fuller than the one before (by `margin`, a share of the level
 *  below), and a terrarium's open level keeps every hide and climb the balanced one has. */
function progresses(a: Archetype, s: Record<Density, TankSetup>, margin: number) {
  const [o, b, f] = DENSITIES.map(d => coverOf(s[d]));
  return o * (1 + margin) < b && b * (1 + margin) < f && (!land(a) || shelterCount(s.open) >= shelterCount(s.balanced));
}
/** The most the covered share of the tank by hardscape may rise from one level to the next (see `coverOf`: boxes, a relative measure). */
export const COVER_STEP = 0.3;
/** The largest side of a hardscape piece, mm. */
const reach = (it: Item) => Math.max(...itemDims(it));
export const isHard = (it: Item) => layerOf(it) === 'hard';
/** The most a piece may grow from one level to the next (its longest side, as a share of the biggest piece the lower levels have). */
export const PIECE_GROWTH = 1.25;
/** With no hardscape below, the biggest piece a level may add, as a share of the tank height (a first accent, not a wall). */
const FIRST_PIECE = 0.3;
/** Which way an archetype's rock mix leans (Nathan 2026-11-02): few big stones, mostly mid-small, or both. */
type Lean = 'large' | 'small' | 'both';
const LEAN: Record<string, Lean> = { 'iwagumi-stone-garden': 'large', 'rocky-river-stream': 'small', 'boulder-creek': 'small', 'brackish-rocky-coast': 'small', 'african-cichlid-rockscape': 'large', 'stone-wood-sculpture': 'large' };
const hashOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const leanOf = (a: Archetype): Lean => LEAN[a.id] ?? (['large', 'both', 'small'] as const)[hashOf(a.id) % 3];
/** Share of a level's free stones in each size tier (large / mid / small): Open = a few large + mid, Balanced = a mix, Full = many small + a few large. */
const TIERS: Record<Density, [number, number, number]> = { open: [0.5, 0.35, 0.15], balanced: [0.2, 0.4, 0.4], full: [0.12, 0.23, 0.65] };
/** Tier sizes as a share of the level's biggest stone (a band each, so two stones of one tier still differ). */
const TIER_SIZE: [number, number][] = [[0.9, 1], [0.5, 0.65], [0.27, 0.35]];
/** The fewest free stones a level needs for a size spread to mean anything (fewer = a hero and an accent, left as drawn). */
export const MIX_MIN = 4;
/**
 * Piece sizes follow a spread, not one repeated size: the level's stones, biggest first, are dealt into large / mid / small tiers by `TIERS` (leaning to
 * larger or smaller by archetype) and set to a size in the tier's band of the biggest stone, which stays the biggest and so keeps `PIECE_GROWTH` and
 * the cover step. Stones stacked on another go with the one beneath.
 */
function mixSizes(a: Archetype, d: Density | 'mid', S: TankSetup, cap: number, o: { B?: number; tiers?: [number, number, number] } = {}) {
  const free = S.items.filter(it => it.kind === 'stone' && it.lift <= 1).sort((x, y) => reach(y) - reach(x));
  if (free.length < MIX_MIN) return;
  const lean = leanOf(a), n = free.length, B = o.B ?? (d === 'open' ? reach(free[0]) : Math.min(cap, reach(free[0]) * PIECE_GROWTH)); // a fuller level may bring its biggest stone up to the growth limit
  let [pl, pm, ps] = o.tiers ?? TIERS[d as Density];
  if (lean === 'large') { pl *= 1.4; ps *= 0.8; } else if (lean === 'small') { pl *= 0.6; ps *= 1.15; }
  const tot = pl + pm + ps, nl = Math.max(1, Math.round(n * pl / tot)), ns = Math.min(n - nl - 1, Math.round(n * ps / tot)), h = hashOf(a.id + d);
  const factor = new Map<Item, number>();
  free.forEach((it, i) => {
    const tier = i < nl ? 0 : i < n - ns ? 1 : 2, [lo, hi] = TIER_SIZE[tier], j = ((h + i * 2654435761) >>> 0) % 1000 / 1000;
    const f = B * (i === 0 ? 1 : lo + (hi - lo) * j) / reach(it);
    factor.set(it, f); it.size *= f;
  });
  for (const it of S.items) {
    if (it.lift <= 1 || layerOf(it) !== 'hard') continue;
    const base = free.reduce((b, c) => Math.hypot(c.x - it.x, c.depth - it.depth) < Math.hypot(b.x - it.x, b.depth - it.depth) ? c : b), f = factor.get(base) ?? 1;
    it.size *= f; it.lift *= f;
  }
}
/**
 * The starter layers re-roll their pieces at every stop, so one stop up can swap a few small stones for a single huge one or add a whole rock
 * wall (Nathan 2026-11-02: a planted tank with no rock at Open and Balanced had boulders over half the tank at Full). A level reads as the
 * same scape a bit fuller only when its pieces are the same size as the level below's, so the pieces of a fuller level are brought down to
 * `PIECE_GROWTH` times the biggest piece below (`FIRST_PIECE` of the tank height where there is none): counts still rise, scale does not jump.
 * Anything stacked on a shrunk piece is lowered with it.
 */
function evenScale(a: Archetype, s: Record<Density, TankSetup>, mix = true): Record<Density, TankSetup> {
  // stones and the other pieces (wood, caves) are capped each against their own kind below: a stone must not grow to the size of a branch
  const kinds = [(it: Item) => it.kind === 'stone', (it: Item) => it.kind !== 'stone'], below = [0, 0];
  for (const d of DENSITIES) {
    const S = s[d], capOf = (k: number) => below[k] > 0 ? below[k] * PIECE_GROWTH : S.tank.H * FIRST_PIECE;
    const capTo = () => kinds.forEach((of, k) => {
      const hard = S.items.filter(it => isHard(it) && of(it)), cap = capOf(k), t = Math.max(0, ...hard.map(reach));
      if (d !== 'open' && t > cap) { const f = cap / t; for (const it of hard) { const m = reach(it) > cap ? cap / reach(it) : 1; it.size *= m; it.lift *= f; } }
    });
    capTo(); if (mix) { mixSizes(a, d, S, capOf(0)); capTo(); }
    // a still-too-big step in covered share (a rock group where there was one stone): drop the biggest new pieces, and anything stacked on them, until it is gradual
    const share = (T: TankSetup) => coverOf({ ...T, items: T.items.filter(isHard) }), prev = d === 'full' ? s.balanced : d === 'balanced' ? s.open : undefined;
    if (prev && d !== 'open') {
      const base = share(prev), n0 = prev.items.filter(isHard).length;
      while (share(S) - base > COVER_STEP && S.items.filter(isHard).length > n0) {
        const big = S.items.filter(it => isHard(it) && it.lift <= 1).sort((x, y) => reach(y) - reach(x))[0]; if (!big) break;
        S.items = S.items.filter(it => it !== big && !(isHard(it) && it.lift > 1 && Math.abs(it.x - big.x) < reach(big) && Math.abs(it.depth - big.depth) < reach(big)));
      }
    }
    kinds.forEach((of, k) => { below[k] = Math.max(below[k], ...S.items.filter(it => isHard(it) && of(it)).map(reach), 0); });
  }
  return s;
}
/** No seed progresses: the one whose smaller step between levels is the biggest (else the archetype's own). */
function bestStep(trios: Record<Density, TankSetup>[], seeds: number[], own: number): number {
  const gap = (t: Record<Density, TankSetup>) => Math.min(coverOf(t.balanced) - coverOf(t.open), coverOf(t.full) - coverOf(t.balanced));
  const i = trios.reduce((b, t, k) => gap(t) > gap(trios[b]) ? k : b, 0);
  return gap(trios[i]) > 0 ? seeds[i] : own;
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
  // the size spread comes first; a composition where it leaves the levels no fuller than each other (a tank with almost no stone) keeps the plain caps instead
  const trio = (seed: number, mix: boolean) => evenScale(arch, { open: draw(arch, build, seed, 'open'), balanced: draw(arch, build, seed, 'balanced'), full: draw(arch, build, seed, 'full') }, mix);
  const tried = new Map<string, Record<Density, TankSetup>>(), at = (s: number, mix = true) => { const k = `${s}:${mix}`; return tried.get(k) ?? (tried.set(k, trio(s, mix)), tried.get(k)!); };
  const pick = (mix: boolean) => seeds.find(s => progresses(arch, at(s, mix), 0.08)) ?? seeds.find(s => progresses(arch, at(s, mix), 0));
  const seedMixed = pick(true), seedPlain = seedMixed === undefined ? pick(false) : undefined, mixed = seedPlain === undefined;
  const seed = seedMixed ?? seedPlain ?? bestStep(seeds.map(s => at(s, true)), seeds, own);
  return { archetype: arch, tank, animals: roster, build, seed, scenes: at(seed, mixed), mids: [undefined, undefined] };
}

/** The density slider's stops: 0 Open, 2 A Bit of Both (Balanced), 4 Full, and a step between each pair. */
export const STOPS = 5;
export type Stop = 0 | 1 | 2 | 3 | 4;
export const STOP_OF: Record<Density, Stop> = { open: 0, balanced: 2, full: 4 };
/** The named level a stop belongs to: its own, or for the steps between, the one nearer the middle (the saved `density`). */
export const densityOfStop = (s: number): Density => s <= 0 ? 'open' : s >= 4 ? 'full' : s === 1 ? 'open' : s === 3 ? 'full' : 'balanced';
const lerp = (x: number, y: number, t: number) => x + (y - x) * t;
const hardShare = (T: TankSetup) => coverOf({ ...T, items: T.items.filter(isHard) });
/**
 * The step between two named levels (stop 1 = Open..Balanced, 3 = Balanced..Full), same build, seed and composition. Its layer stops sit part way between
 * its neighbours'; the draw is then brought between them like the named levels are: each kind's biggest piece about the geometric mean of its neighbours'
 * (never past the upper one), the same size spread, hardscape cover no higher than the upper level's. A random draw can still land outside its neighbours'
 * total cover, so positions along the way are tried and the first strictly between them wins (else the nearest).
 */
function drawMid(base: RecipeBase, i: 1 | 3): TankSetup {
  const a = base.archetype, [lo, hi] = i === 1 ? ['open', 'balanced'] as const : ['balanced', 'full'] as const, L = base.scenes[lo], H = base.scenes[hi];
  const cl = coverOf(L), ch = coverOf(H), kinds = [(it: Item) => it.kind === 'stone', (it: Item) => it.kind !== 'stone'];
  const maxOf = (S: TankSetup, k: number) => Math.max(0, ...S.items.filter(it => isHard(it) && kinds[k](it)).map(reach));
  const tiers = TIERS[lo].map((x, j) => (x + TIERS[hi][j]) / 2) as [number, number, number];
  const make = (t: number) => {
    const dl = recipeDens(a, lo), dh = recipeDens(a, hi);
    const tw = TWEAKS[a.id] ?? {}, setup = structuredClone(base.build.setup);
    setup.layout = { ...setup.layout, seed: base.seed, comp: tw.comp ?? 'any' }; delete setup.layout.plantSeed; delete setup.layout.animalSeed;
    const S = scapeSetup(base.build, recipeLook(a)!, a.recipe.plantMode ?? 'live', setup, { dens: { hard: lerp(dl.hard, dh.hard, t), plant: lerp(dl.plant, dh.plant, t) } });
    if (tw.noPlants) S.items = S.items.filter(it => it.kind !== 'plant' && it.kind !== 'artificial');
    if (a.recipe.looks[0] === 'none' && lo === 'open') S.items = [];
    withBg(a, S);
    kinds.forEach((of, k) => {
      const lm = maxOf(L, k), hm = maxOf(H, k), own = maxOf(S, k), want = lm > 0 && hm > 0 ? Math.sqrt(lm * hm) : hm * 0.8, cap = hm || S.tank.H * FIRST_PIECE;
      if (!own) return;
      const m = Math.min(cap, want) / own;
      for (const it of S.items) if (isHard(it) && of(it)) { it.size *= m; it.lift *= m; }
      if (k === 0) mixSizes(a, 'mid', S, cap, { B: Math.min(cap, want), tiers });
    });
    const n0 = L.items.filter(isHard).length;
    while (hardShare(S) > hardShare(H) && S.items.filter(isHard).length > n0) {
      const big = S.items.filter(it => isHard(it) && it.lift <= 1).sort((x, y) => reach(y) - reach(x))[0]; if (!big) break;
      S.items = S.items.filter(it => it !== big && !(isHard(it) && it.lift > 1 && Math.abs(it.x - big.x) < reach(big) && Math.abs(it.depth - big.depth) < reach(big)));
    }
    return S;
  };
  // the first position whose total cover sits strictly between its neighbours'; else the one nearest to between them
  const off = (S: TankSetup) => Math.max(0, cl - coverOf(S), coverOf(S) - ch) + (coverOf(S) === cl || coverOf(S) === ch ? 1e-6 : 0);
  let best: TankSetup | undefined, bestOff = Infinity;
  for (const t of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8, 0.15, 0.85]) {
    const S = make(t), o = off(S);
    if (o < bestOff) { best = S; bestOff = o; }
    if (o === 0) break;
  }
  if (bestOff === 0) return best!;
  // no position landed between them (two levels almost as full as each other): the upper level, thinned until its cover is half way, so the step is nested in it
  const S = structuredClone(H), target = (cl + ch) / 2, area = (it: Item) => { const [l, h, w] = itemDims(it); return l * w + l * h; };
  const plants = S.items.filter(it => !isHard(it)).sort((x, y) => area(y) - area(x));
  while (coverOf(S) > target && plants.length) S.items = S.items.filter(it => it !== plants.shift());
  for (let k = 0; k < 8 && coverOf(S) > target; k++) for (const it of S.items) if (isHard(it)) { it.size *= 0.85; it.lift *= 0.85; }
  return coverOf(S) > cl && coverOf(S) < ch ? S : best!;
}
/** The layer stops of any slider stop 0..4: the named levels' own, the steps between half way. */
export function recipeDensAt(a: Archetype, stop: number): Stops {
  const x = Math.max(0, Math.min(4, stop)) / 2, i = Math.min(1, Math.floor(x)), t = x - i, [lo, hi] = [DENSITIES[i], DENSITIES[i + 1]], dl = recipeDens(a, lo), dh = recipeDens(a, hi);
  return { hard: lerp(dl.hard, dh.hard, t), plant: lerp(dl.plant, dh.plant, t) };
}
/** The scene of one slider stop 0..4 (a copy). The three named stops come with the base; the two between are drawn here, once. */
export function stopScene(base: RecipeBase, stop: number): TankSetup {
  const s = Math.max(0, Math.min(4, Math.round(stop)));
  if (s % 2 === 0) return structuredClone(base.scenes[s === 0 ? 'open' : s === 2 ? 'balanced' : 'full']);
  const k = s === 1 ? 0 : 1;
  base.mids[k] ??= drawMid(base, s as 1 | 3);
  return structuredClone(base.mids[k]!);
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
