// The visual discovery registry (lane VD1, 2026-10-30): the canonical tree of environments, water types, visual
// families and archetypes the discovery flow walks (research/design/visual-discovery-plan.md "Registry contract",
// spec research/design/visual-discovery-spec.md Revision 02). Pure data plus two lookups: the flow (src/ui/discovery/)
// draws the cards, the density recipes (scene/recipes.ts) turn an archetype + density into a scene. Card copy for the
// environments, waters and family names is the spec's, verbatim; fingerprints, taglines and look mappings come from
// research/taste-tree/ (TREE.md and the A / B / C / vd1-* files). No engine numbers live here: prices and checks stay
// with the existing engine. Support is set by rule until the capability audit (VD2): a mapped look = 'partial',
// none = 'coming-soon'; an entry's own `support` overrides the rule once VD2 has looked at the render.
import type { PlantMode } from './scapes';
import type { LayoutId } from './types';

export type Env = 'aquarium' | 'terrarium' | 'paludarium';
export type Water = 'freshwater' | 'saltwater' | 'brackish';
export type Density = 'open' | 'balanced' | 'full';
export type Support = 'supported' | 'partial' | 'coming-soon';
/** An environment or water card. */
export interface Card { id: string; name: string; tagline: string }
export interface Family extends Card { env: Env; water: Water | null; colour: string }
export interface Archetype extends Card {
  env: Env; water: Water | null; familyId: string;
  /** Other family ids it is shown under (cross-links). */
  alsoIn?: string[];
  /** The enclosure it really needs when that differs from where it was found (spec 01: a mudskipper mudflat found
   *  under Brackish Aquarium resolves to a paludarium-style build). */
  resolvesTo?: Env;
  /** 2-4 cues that make it recognizable. */
  fingerprint: string[];
  /** One explicit contrast with the closest sibling. */
  contrast: { sibling: string; how: string };
  /** looks = existing LayoutIds ([] = none today). */
  recipe: { looks: LayoutId[]; plantMode?: PlantMode; notes: string };
  density: Record<Density, { label: string; note: string }>;
  /** Missing rendering features, from DEPS (VD2 ranks feature packs by the archetypes each unlocks). */
  deps: string[];
  support: Support;
  /** Closest supported archetype id (required when coming-soon). */
  alternative?: string;
  tags: { chem?: ('soft' | 'hard' | 'marine' | 'brackish')[]; temp?: 'tropical' | 'cold' | 'any'; minGallons?: number };
}

/** The rendering features archetypes wait on, one vocabulary so packs can be counted. */
export const DEPS = [
  // decor / artificial
  'ornaments', 'coloured gravel', 'glow fish and decor', 'blacklight / colour LED', 'printed background', 'coral skeleton decor',
  // bare / minimal
  'bare bottom', 'plain background', 'white sand', 'black sand', 'single feature rock',
  // freshwater habitat
  'leaf litter', 'botanicals', 'water tint', 'floating plants with hanging roots', 'cliff / bonsai hardscape', 'shell bed', 'cobbles',
  // marine
  'live rock without coral', 'reef rock layouts', 'actinic light', 'seagrass / macroalgae', 'deep sand bed', 'kreisel tank', 'cold marine',
  // brackish / shore
  'brackish water type', 'mangrove prop roots', 'mud substrate', 'shoreline slope', 'oyster shell / coastal rock',
  // land / paludarium
  'waterfall / flowing water', 'background wall panel', 'emersed plants above the rim', 'floating island', 'moss carpet',
  'mushrooms / woodland decor', 'cork bark', 'screen enclosure', 'sand dunes', 'succulents', 'basking dock',
  'cypress knees', 'carnivorous plants', 'hanging moss', 'open-top enclosure',
  // shapes
  'bowl / jar shapes',
] as const;

export const ENVIRONMENTS: Card[] = [
  { id: 'aquarium', name: 'Aquarium', tagline: 'Dive into an underwater world. The fish are beautiful; the water needs looking after, too.' },
  { id: 'terrarium', name: 'Terrarium', tagline: 'A little piece of land behind glass. From tiny jungles to sun-baked deserts.' },
  { id: 'paludarium', name: 'Paludarium', tagline: 'Can’t decide between land and water? Have both! Twice the scenery, a little more engineering.' },
];

export const WATERS: Card[] = [
  { id: 'freshwater', name: 'Freshwater', tagline: 'Underwater forests, bright communities, and glowing playgrounds. More ways to get creative without making a splash in your wallet.' },
  { id: 'saltwater', name: 'Saltwater', tagline: 'Own a slice of the ocean. Incredible fish and living coral—your wallet might notice.' },
  { id: 'brackish', name: 'Brackish', tagline: 'Where rivers meet the sea. Mangrove roots, unusual creatures, and just a pinch of salt.' },
];

const fam = (id: string, env: Env, water: Water | null, name: string, colour: string, tagline: string): Family =>
  ({ id, name, tagline, env, water, colour });

/** In the spec's order within each branch (spec 02). */
export const FAMILIES: Family[] = [
  fam('fw-gardens', 'aquarium', 'freshwater', 'Underwater Gardens', '#3f8f4e', 'Plants first, fish second. The plants keep growing.'),
  fam('fw-sculpted', 'aquarium', 'freshwater', 'Sculpted Nature', '#5f7f6a', 'A landscape in glass. Composed, so it needs a gardener.'),
  fam('fw-wild', 'aquarium', 'freshwater', 'Wild Habitats', '#8a5a2b', 'A real river, lake or creek. Less tidy, more true.'),
  fam('fw-minimal', 'aquarium', 'freshwater', 'Clean & Minimal', '#6b7280', 'Stone, wood and calm. Every speck of algae shows.'),
  fam('fw-playful', 'aquarium', 'freshwater', 'Bright & Playful', '#c2477f', 'Your tank, your rules. Taste is optional.'),
  fam('fw-showcase', 'aquarium', 'freshwater', 'Fish Showcases', '#2f6fb0', 'One star fish, built around it. Stars have demands.'),
  fam('sw-coral', 'aquarium', 'saltwater', 'Living Coral Gardens', '#e0605a', 'Living colour that grows. So does the electric bill.'),
  fam('sw-fish', 'aquarium', 'saltwater', 'Fish-First Oceans', '#1f5fa8', 'Big, bold saltwater fish. Coral optional.'),
  fam('sw-habitat', 'aquarium', 'saltwater', 'Natural Ocean Habitats', '#3f9a8f', 'Seagrass, sand and shy oddities. Patience included.'),
  fam('sw-sculpted', 'aquarium', 'saltwater', 'Sculpted Reef Landscapes', '#7a6fb0', 'Rock as architecture. Coral moves in later.'),
  fam('sw-glow', 'aquarium', 'saltwater', 'Glowing & Otherworldly', '#3a3aa0', 'Hypnotic after dark. Strange things need special care.'),
  fam('bk-mangrove', 'aquarium', 'brackish', 'Mangrove & Estuary', '#6e7a3a', 'Roots in the tide. The trees take their time.'),
  fam('bk-shore', 'aquarium', 'brackish', 'Mudflat & Shoreline', '#9a7b55', 'Half beach, half water. The residents walk.'),
  fam('bk-rocky', 'aquarium', 'brackish', 'Rocky Coast & Tidepool', '#5a6670', 'Stones, shells and tiny gobies. Mind the salt.'),
  fam('bk-fish', 'aquarium', 'brackish', 'Fish-First Brackish Habitats', '#b08a2a', 'Puffers, archers and silver shoals. They grow up.'),
  fam('bk-planted', 'aquarium', 'brackish', 'Brackish Planting', '#4f7f5a', 'Green in salty water. Only the tough plants stay.'),
  fam('te-rainforest', 'terrarium', null, 'Tropical Rainforest', '#2e7d32', 'Misty, green and humid. Your glasses will fog.'),
  fam('te-desert', 'terrarium', null, 'Desert & Drylands', '#c98a3c', 'Sun, sand and rock. Bring a heat lamp.'),
  fam('te-woodland', 'terrarium', null, 'Enchanted Woodland', '#5b6e3a', 'Moss, ferns and fairy-tale gloom. Cool rooms only.'),
  fam('te-climb', 'terrarium', null, 'Rocks, Cliffs & Canopies', '#7b5e44', 'Built tall for climbers. The best seat is up top.'),
  fam('te-botanical', 'terrarium', null, 'Botanical Worlds', '#6a9a4a', 'A garden behind glass. The plants run the show.'),
  fam('te-creature', 'terrarium', null, 'Creature Showcases', '#8a4f3a', 'Built around one animal. It sets the house rules.'),
  fam('pa-waterfall', 'paludarium', null, 'Rainforest Waterfalls', '#2f8a7a', 'Falling water, dripping green. Listen to the pump run.'),
  fam('pa-riverbank', 'paludarium', null, 'Overgrown Riverbanks', '#5a8a5a', 'Where the bank meets the river. Roots get their feet wet.'),
  fam('pa-swamp', 'paludarium', null, 'Swamps & Mangroves', '#4a5e3a', 'Still water, twisted roots. Moody by design.'),
  fam('pa-stream', 'paludarium', null, 'Rocky Streams & Cliffs', '#4f6f8a', 'Wet stone and moving water. The splash zone grows moss.'),
  fam('pa-fantasy', 'paludarium', null, 'Fantasy Water Gardens', '#8a6ab0', 'Plants spilling out the top. A little magic, a little mess.'),
  fam('pa-creature', 'paludarium', null, 'Waterside Creature Habitats', '#a0703a', 'Land and water for animals that use both. They escape, too.'),
];

const OPEN = 'Open & Airy', BOTH = 'A Bit of Both', FULL = 'Wild & Full';
type Raw = Omit<Archetype, 'support' | 'density'> & {
  support?: Support;
  /** open / balanced / full notes; `labels` replaces the spec's three labels when the archetype has better words. */
  density: [string, string, string]; labels?: [string, string, string];
};
const arch = (r: Raw): Archetype => {
  const [o, b, f] = r.density, [lo, lb, lf] = r.labels ?? [OPEN, BOTH, FULL];
  const { labels: _labels, ...rest } = r;
  return {
    ...rest,
    density: { open: { label: lo, note: o }, balanced: { label: lb, note: b }, full: { label: lf, note: f } },
    support: r.support ?? (r.recipe.looks.length ? 'partial' : 'coming-soon'),
  };
};

const FW: Raw[] = [
  // Underwater Gardens
  { id: 'dutch-garden', name: 'Dutch Garden', tagline: 'A flower garden underwater. You’re the gardener.', env: 'aquarium', water: 'freshwater', familyId: 'fw-gardens',
    fingerprint: ['terraced "streets" of stem plants', 'contrasting reds and greens in groups', 'little or no hardscape', 'no carpet'],
    contrast: { sibling: 'planted-community', how: 'Formal colour-blocked streets of one species each, not a relaxed mix with wood.' },
    recipe: { looks: ['dutch'], notes: 'The dutch look as drawn: rows of stems stepping up to the back.' },
    density: ['Few, well-spaced streets; open sand between groups', 'Full streets in three tiers, a clear front lane', 'Every street dense to the waterline, groups still distinct'],
    labels: ['Minimal', 'Classic', 'Layered'],
    deps: [], tags: { chem: ['soft'], temp: 'tropical', minGallons: 20 } },
  // Sculpted Nature
  { id: 'iwagumi-stone-garden', name: 'Iwagumi Stone Garden', tagline: 'Zen in a box. The lawn has opinions.', env: 'aquarium', water: 'freshwater', familyId: 'fw-sculpted',
    fingerprint: ['angular stones in one main group', 'a low green carpet', 'open water above', 'no wood'],
    contrast: { sibling: 'driftwood-nature', how: 'Stone and lawn only; driftwood nature adds wood, moss and a mixed backdrop.' },
    recipe: { looks: ['iwagumi'], notes: 'The iwagumi look: a main stone and companions on a carpet.' },
    density: ['A main stone and two companions on a low lawn', 'A full stone group with a few satellites', 'Many stones layered into a ridge, carpet to the glass'],
    labels: ['Minimal', 'Classic', 'Layered'],
    deps: [], tags: { chem: ['soft'], temp: 'tropical', minGallons: 10 } },
  // Wild Habitats
  { id: 'blackwater-creek', name: 'Blackwater Creek', tagline: 'Amber water, fallen leaves. Not for the clean-glass crowd.', env: 'aquarium', water: 'freshwater', familyId: 'fw-wild',
    fingerprint: ['amber tea-coloured water', 'leaf litter on sand', 'tangled roots and branches', 'floating plants for shade'],
    contrast: { sibling: 'african-cichlid-rockscape', how: 'Wood, leaves and tinted water; the cichlid rockscape is pale sand and stacked stone in clear water.' },
    recipe: { looks: ['blackwater'], notes: 'The blackwater look tints the water and lays leaf litter; spec 07 worked example.' },
    density: ['One focal branch, scattered leaves, sandy bottom visible', 'Several interlocking roots, botanical clusters, clear openings', 'A layered root canopy and deep leaf litter, swimming space kept'],
    deps: ['botanicals'], tags: { chem: ['soft'], temp: 'tropical', minGallons: 20 } },
  // Clean & Minimal
  { id: 'stone-wood-sculpture', name: 'Stone & Wood Sculpture', tagline: 'Pure hardscape, nothing to trim. Algae has nowhere to hide.', env: 'aquarium', water: 'freshwater', familyId: 'fw-minimal',
    fingerprint: ['one sculptural piece of wood or stone', 'no plants', 'plain sand floor', 'lots of open water'],
    contrast: { sibling: 'white-sand-stone', how: 'Natural-coloured wood and stone as the subject; white sand & stone is a bright, gallery-white single rock.' },
    recipe: { looks: ['stones', 'driftwood'], notes: 'River stones or driftwood with the plants left out.' },
    density: ['One piece, centred, everything else open', 'A main piece and two smaller echoes', 'A connected wood and stone sculpture across the tank'],
    deps: ['plain background'], tags: { chem: ['soft', 'hard'], temp: 'any', minGallons: 10 } },
  // Bright & Playful
  { id: 'silk-plant-natural', name: 'Fake but Natural', tagline: 'Fools the guests, never needs a trim. The fish know.', env: 'aquarium', water: 'freshwater', familyId: 'fw-playful',
    fingerprint: ['natural-looking artificial plants', 'wood and stones', 'tidy, unchanging green', 'bright community fish'],
    contrast: { sibling: 'castle-coloured-gravel', how: 'Aims to pass as a real planted tank; the castle tank is openly decorative.' },
    recipe: { looks: ['planted', 'driftwood'], plantMode: 'artificial', notes: 'Any natural look in artificial plant mode; planted and driftwood read best.' },
    density: ['A few silk plants by the wood, open sand', 'A green backdrop and side groups', 'Plants from glass to glass, a lane at the front'],
    deps: [], tags: { chem: ['soft', 'hard'], temp: 'any', minGallons: 5 } },
  // Fish Showcases
  { id: 'big-fish-showcase', name: 'Big Fish Showcase', tagline: 'One big personality, nothing in its way. It rearranges anyway.', env: 'aquarium', water: 'freshwater', familyId: 'fw-showcase',
    fingerprint: ['bare or thin sand floor', 'one large fish as the subject', 'plain dark back', 'a single heavy rock or none'],
    contrast: { sibling: 'discus-showcase', how: 'Bare and rugged for a heavy-bodied fish; the discus showcase is warm, soft and lightly planted.' },
    recipe: { looks: ['none'], notes: 'The bare tank; the fish (oscar, flowerhorn, arowana) is chosen and checked later.' },
    density: ['Bare floor, nothing else', 'Thin sand and one heavy rock', 'Sand, two large rocks and a root, all secured'],
    deps: ['plain background', 'bare bottom'], tags: { chem: ['soft', 'hard'], temp: 'tropical', minGallons: 75 } },
];

const SW: Raw[] = [
  { id: 'lps-coral-garden', name: 'LPS Coral Garden', tagline: 'Bold shapes, gentle flow. Some corals sting the neighbours.', env: 'aquarium', water: 'saltwater', familyId: 'sw-coral',
    fingerprint: ['large fleshy coral polyps', 'hammer, torch and brain corals', 'live rock islands', 'corals spaced on the sand and low rock'],
    contrast: { sibling: 'sps-reef', how: 'Soft, fleshy polyps on low rock; SPS is tall rock with branching and plating stony coral.' },
    recipe: { looks: ['reef'], notes: 'The reef look: live rock islands with corals on the rock and the sand.' },
    density: ['A few specimen corals, wide spacing, open sand', 'Rock islands with corals in groups, sweeper room kept', 'Coral cover over most of the rock, still spaced to avoid stinging contact'],
    deps: [], tags: { chem: ['marine'], temp: 'tropical', minGallons: 30 } },
  { id: 'marine-fish-rock', name: 'Marine Fish & Rock', tagline: 'Colourful fish and live rock, no coral worries. They get big.', env: 'aquarium', water: 'saltwater', familyId: 'sw-fish',
    fingerprint: ['live rock with no coral', 'open blue water', 'tangs, angels and wrasses as the colour', 'sand floor'],
    contrast: { sibling: 'clownfish-anemone', how: 'Big open water and rock for a fish community; the clownfish tank centres on one anemone.' },
    recipe: { looks: [], notes: 'The reef look without corals; needs a coral-free rock build.' },
    density: ['A single low rock island, lots of swimming room', 'Two rock islands with caves', 'A rock wall with arches and overhangs'],
    deps: ['live rock without coral'], alternative: 'lps-coral-garden', tags: { chem: ['marine'], temp: 'tropical', minGallons: 75 } },
  { id: 'seahorse-garden', name: 'Seahorse Garden', tagline: 'Slow, strange and hand-fed. Bring patience.', env: 'aquarium', water: 'saltwater', familyId: 'sw-habitat',
    fingerprint: ['tall branching holdfasts (gorgonians, macroalgae)', 'calm, low flow', 'seahorses perched on the branches', 'sand with sparse rock'],
    contrast: { sibling: 'seagrass-lagoon', how: 'Tall branches for perching in a taller tank; the lagoon is a low green meadow.' },
    recipe: { looks: [], notes: 'Needs hitching posts and macroalgae; no current look draws them.' },
    density: ['Three tall holdfasts, mostly open sand', 'A small grove of branches and macroalgae', 'A dense grove, open water kept above'],
    deps: ['seagrass / macroalgae'], alternative: 'lps-coral-garden', tags: { chem: ['marine'], temp: 'tropical', minGallons: 30 } },
  { id: 'reef-arches', name: 'Reef Arches', tagline: 'Rock bridges with fish swimming through. Gravity has a say.', env: 'aquarium', water: 'saltwater', familyId: 'sw-sculpted',
    fingerprint: ['one or two bonded rock arches', 'swim-through openings', 'sand below and around', 'corals on the arch tops'],
    contrast: { sibling: 'reef-islands', how: 'Rock spans across the tank; islands are separate stacks with sand channels between.' },
    recipe: { looks: ['reef'], notes: 'The reef look rebuilt as an arch (reef rock layout work).' },
    density: ['A single slim arch, sand all round', 'An arch and a side island, corals in groups', 'Two arches with overhangs, coral on most rock'],
    deps: ['reef rock layouts'], tags: { chem: ['marine'], temp: 'tropical', minGallons: 40 } },
  { id: 'blue-glow-reef', name: 'Blue Glow Reef', tagline: 'Corals that glow under blue light. Your camera will struggle.', env: 'aquarium', water: 'saltwater', familyId: 'sw-glow',
    fingerprint: ['deep actinic blue light', 'fluorescing corals in orange, green and pink', 'dark rock silhouettes'],
    contrast: { sibling: 'lps-coral-garden', how: 'The same kind of corals seen under deep blue light, glowing instead of daylight colours.' },
    recipe: { looks: ['reef'], notes: 'The reef look under an actinic-heavy light colour.' },
    density: ['A few glowing specimens on low rock', 'Coral groups across two islands', 'Coral cover on most rock, every polyp lit'],
    deps: ['actinic light'], tags: { chem: ['marine'], temp: 'tropical', minGallons: 30 } },
];

// Brackish (research/taste-tree/vd1-brackish.md). No brackish water type in the engine yet: every entry lists it.
const BK: Raw[] = [
  { id: 'mangrove-estuary', name: 'Mangrove Estuary', tagline: 'A tiny forest with its feet wet. The roots outgrow the glass.', env: 'aquarium', water: 'brackish', familyId: 'bk-mangrove',
    fingerprint: ['mangrove saplings rising through the open top, leaves above the rim', 'arching prop roots in the water', 'light tea-tinted water over sand', 'a small shoal between the roots'],
    contrast: { sibling: 'estuary-root-tangle', how: 'Living mangrove trees fill the tank; the archer lookout is a low waterline under overhanging dead branches.' },
    recipe: { looks: [], notes: 'Needs prop roots and emersed leaves above the rim; brk-mangrove-riparium merged in (one propagule through the rim = open).' },
    density: ['One propagule through the rim, sand open', 'Three saplings, roots interlocking at one side', 'A root thicket across the back, a clear front for the shoal'],
    deps: ['brackish water type', 'mangrove prop roots', 'emersed plants above the rim', 'open-top enclosure', 'water tint'],
    alternative: 'brackish-planted', tags: { chem: ['brackish'], temp: 'tropical', minGallons: 30 } },
  { id: 'mudskipper-mudflat', name: 'Mudskipper Mudflat', tagline: 'A fish that stands on land. It wants a beach and a lid.', env: 'aquarium', water: 'brackish', familyId: 'bk-shore',
    alsoIn: ['pa-creature'], resolvesTo: 'paludarium',
    fingerprint: ['a dark wet mud bank sloping into shallow water', 'about half land', 'fish perched on the bank', 'warm, humid air'],
    contrast: { sibling: 'fiddler-crab-beach', how: 'Dark mud and a wide shallow pool for fish that walk; the fiddler beach is pale sand, mostly land, a small pool.' },
    recipe: { looks: ['swamp'], notes: 'The swamp look (land around pools, water lowered) with mud instead of soil; land never drops below about half.' },
    density: ['A bare mud bank and open pool, a few burrows', 'Mud bank with roots and stones to perch on', 'Roots, stones and a planted back edge; open mud kept'],
    deps: ['brackish water type', 'mud substrate', 'shoreline slope'], tags: { chem: ['brackish'], temp: 'tropical', minGallons: 40 } },
  { id: 'brackish-rocky-coast', name: 'Rocky Cove', tagline: 'Dark rock and shell, tiny gobies in every crack. Mind the salt.', env: 'aquarium', water: 'brackish', familyId: 'bk-rocky',
    fingerprint: ['a fully submerged stack of dark rock and oyster shell', 'caves and cracks at the base', 'bumblebee gobies and nerite snails', 'coarse sand'],
    contrast: { sibling: 'brackish-tidepool', how: 'All under water; the tidepool shows a rock ledge above the waterline and a tide-line stain.' },
    recipe: { looks: ['malawi'], notes: 'The Malawi rock caves on sand as the base; darker rock and oyster shell needed.' },
    density: ['A low rock pile, shells scattered on open sand', 'A cave stack with shell beds at its foot', 'Rock and shell along the back, caves everywhere, a sand front'],
    deps: ['brackish water type', 'oyster shell / coastal rock'], tags: { chem: ['brackish'], temp: 'tropical', minGallons: 20 } },
  { id: 'puffer-den', name: 'Puffer Den', tagline: 'One round grump with big eyes. No roommates, lots of snails.', env: 'aquarium', water: 'brackish', familyId: 'bk-fish',
    fingerprint: ['a single figure-8 puffer as the star', 'one driftwood piece with java fern', 'open sand floor', 'snail shells on the sand'],
    contrast: { sibling: 'silver-shoal', how: 'One small puffer in a tidy wood tank; the silver shoal is a big open tank of disc-shaped schooling fish.' },
    recipe: { looks: ['driftwood'], notes: 'The driftwood look (wood, java fern, anubias) on sand; one puffer by default, never a green spotted puffer.' },
    density: ['One wood piece, open sand', 'Wood with ferns and a rock cave', 'Wood across the back, ferns and stones, a clear front'],
    deps: ['brackish water type'], tags: { chem: ['brackish'], temp: 'tropical', minGallons: 20 } },
  { id: 'brackish-planted', name: 'Brackish Fern & Wood', tagline: 'Green on wood in salty water. Only the tough plants stay.', env: 'aquarium', water: 'brackish', familyId: 'bk-planted',
    fingerprint: ['java fern and anubias tied to wood', 'Cryptocoryne ciliata clumps', 'clear water over sand', 'no mangroves'],
    contrast: { sibling: 'brackish-meadow', how: 'Plants on wood and rock; the grass flat is open sand with a ribbon lawn and no hardscape.' },
    recipe: { looks: ['driftwood'], notes: 'The driftwood look as drawn; mangrove seedlings left out (they read as Mangrove Estuary and want more salt).' },
    density: ['One wood piece with a few ferns', 'Wood and rock with fern and crypt groups', 'Wood across the tank, plants on every branch'],
    deps: ['brackish water type'], tags: { chem: ['brackish'], temp: 'tropical', minGallons: 20 } },
];
// Terrarium (research/taste-tree/vd1-terrarium.md). Open density never removes hides, cover, climbing or the
// warm / cool ends; heated archetypes keep two hides at every density.
const TE: Raw[] = [
  { id: 'dart-frog-rainforest', name: 'Jewel Frog Jungle', tagline: 'Tiny jewels in a living jungle. It wants misting every day.', env: 'terrarium', water: null, familyId: 'te-rainforest',
    fingerprint: ['bromeliads and ferns packed low', 'a cork back wall', 'deep leaf litter on the floor', 'a tiny bright frog'],
    contrast: { sibling: 'rainforest-canopy', how: 'Low and packed, the eye on the floor; the vine canopy is a tall open climb for a gecko.' },
    recipe: { looks: ['frogs'], notes: 'The tree frog look kept low: plants and cork, then leaf litter on the floor.' },
    density: ['Cork wall, a few bromeliads, open litter floor', 'Bromeliads on cork, ferns and moss, a litter clearing', 'Plants floor to lid, a small litter clearing kept'],
    deps: ['leaf litter', 'background wall panel'], tags: { temp: 'tropical', minGallons: 25 } },
  { id: 'rocky-desert-canyon', name: 'Rocky Desert Canyon', tagline: 'Warm red stone and a gecko. Keep the cool end cool.', env: 'terrarium', water: null, familyId: 'te-desert',
    fingerprint: ['stacked slate or sandstone ledges', 'a packed sand-soil floor', 'a boulder hide at each end', 'long, low enclosure'],
    contrast: { sibling: 'basking-scrubland', how: 'Rock ledges and canyon hides for a small gecko; the scrubland is a wide sunlit floor for a big basking lizard.' },
    recipe: { looks: ['arid'], notes: 'The arid look as drawn: sand and clay, stacked rock ledges, a hide at each end. Never loose sand by default.' },
    density: ['One ledge stack, a hide at each end, open floor', 'Ledges along the back, scattered stones', 'A canyon wall end to end, the floor kept walkable'],
    deps: [], tags: { temp: 'tropical', minGallons: 20 } },
  { id: 'mossy-woodland', name: 'Mossy Woodland', tagline: 'Soft moss, ferns and a fallen log. Cool rooms only.', env: 'terrarium', water: null, familyId: 'te-woodland',
    fingerprint: ['a moss carpet over rolling ground', 'a fallen log on the diagonal', 'temperate ferns', 'dim, cool light'],
    contrast: { sibling: 'fairy-forest', how: 'A real forest floor; the fairy forest adds toadstools, a tiny path and a warm glow.' },
    recipe: { looks: [], notes: 'Plant-led; clean-up crew only (isopods, springtails). No amphibian default (Bsal, injurious-species rules).' },
    density: ['Moss and the log, open ground', 'Moss, log, ferns and litter', 'Ferns over the log, moss to the glass'],
    deps: ['moss carpet', 'leaf litter'], alternative: 'dart-frog-rainforest', tags: { temp: 'cold', minGallons: 25 } },
  { id: 'branch-canopy', name: 'Chameleon Branch Tower', tagline: 'An open leafy tower for one chameleon. It wants misting twice a day.', env: 'terrarium', water: null, familyId: 'te-climb',
    fingerprint: ['open black screen mesh', 'a lattice of bare branches', 'a basking lamp on top', 'a few potted live plants'],
    contrast: { sibling: 'cliff-wall-climber', how: 'Airy mesh and branches for a chameleon; the cliff wall is a stone back with crevice hides.' },
    recipe: { looks: [], notes: 'A screen cage; the rainforest look has the branches but in glass.' },
    density: ['A few branches, a plant at the base', 'A branch lattice with plants at two heights', 'Dense branches and foliage, a basking branch clear under the lamp'],
    deps: ['screen enclosure'], alternative: 'dart-frog-rainforest', tags: { temp: 'tropical', minGallons: 120 } },
  { id: 'closed-jar-garden', name: 'Closed Jar Garden', tagline: 'A sealed mini-world. It looks after itself, mostly.', env: 'terrarium', water: null, familyId: 'te-botanical',
    fingerprint: ['a lidded glass jar', 'condensation on the glass', 'moss and fittonia', 'no animals'],
    contrast: { sibling: 'succulent-garden', how: 'Sealed, wet and green; the succulent garden is an open, dry bowl of rosettes.' },
    recipe: { looks: [], notes: 'Plants only, sealed; needs the jar shape.' },
    density: ['Moss and one plant', 'Moss, a stone and three plants', 'Plants to the lid, moss everywhere'],
    deps: ['bowl / jar shapes', 'moss carpet'], alternative: 'dart-frog-rainforest', tags: { temp: 'any', minGallons: 1 } },
  { id: 'snake-hideaway', name: 'Snake Hideaway', tagline: 'A calm coil in a snug hide. It needs heat and a cool end.', env: 'terrarium', water: null, familyId: 'te-creature',
    fingerprint: ['bark floor', 'a hide at the warm end and the cool end', 'a water bowl', 'a long, low cage'],
    contrast: { sibling: 'tarantula-burrow', how: 'A long floor with hides for a snake; the tarantula burrow is deep soil cut away to show the tunnel.' },
    recipe: { looks: ['python'], notes: 'The ball python look as drawn.' },
    density: ['Two hides, bowl, one branch, open bark', 'Hides, branch, cork and tufts of cover', 'Cover over most of the floor, both hides and the bowl kept'],
    deps: [], tags: { temp: 'tropical', minGallons: 120 } },
];
// Paludarium (research/taste-tree/vd1-paludarium.md).
const PA: Raw[] = [
  { id: 'rainforest-waterfall', name: 'Rainforest Waterfall', tagline: 'A jungle cliff that roars. Plan for the pump hum.', env: 'paludarium', water: null, familyId: 'pa-waterfall',
    fingerprint: ['one waterfall down a mossy rock face', 'a visible pool below', 'tropical plants on cork and branches', 'about 60 % land'],
    contrast: { sibling: 'cascade-wall', how: 'One loud plunge into a real pool; the drip wall weeps over the whole back into a tiny basin.' },
    recipe: { looks: ['paludarium'], notes: 'The paludarium look (land round pools, foliage on cork); needs the falling water.' },
    density: ['A bare rock face, the fall and a few plants, open pool', 'Planted ledges beside the fall, a clear pool', 'Plants from the waterline to the lid, the fall still visible'],
    deps: ['waterfall / flowing water', 'background wall panel'], tags: { chem: ['soft'], temp: 'tropical', minGallons: 30 } },
  { id: 'riverbank-shore', name: 'Sandy Riverbank', tagline: 'Half beach, half river. The sand never stays put.', env: 'paludarium', water: null, familyId: 'pa-riverbank',
    fingerprint: ['a sand slope running down into the water', 'about half beach', 'emersed grasses at the waterline', 'open water in front'],
    contrast: { sibling: 'flooded-forest', how: 'A sunny open beach; the flooded forest is trunks standing in deep tea-coloured water.' },
    recipe: { looks: ['paludarium'], notes: 'The paludarium look with the land as one slope instead of a ring round pools.' },
    density: ['A bare beach and open water', 'Grasses along the waterline, a root on the beach', 'Grasses, roots and stones across the bank, open water kept'],
    deps: ['shoreline slope', 'emersed plants above the rim'], tags: { chem: ['soft'], temp: 'tropical', minGallons: 40 } },
  { id: 'cypress-swamp', name: 'Cypress Swamp', tagline: 'Black water, knobbly knees, drooping moss. Humid all year.', env: 'paludarium', water: null, familyId: 'pa-swamp',
    fingerprint: ['dark still water with a film of duckweed', 'cypress knees and buttressed trunks', 'hanging moss', 'a mossy hummock with a pitcher plant'],
    contrast: { sibling: 'mangrove-paludarium', how: 'Fresh, dark and still with knees and hanging moss; the mangrove shore is brackish mud and prop roots.' },
    recipe: { looks: ['swamp'], notes: 'The swamp look (land round pools); knees are sculpted props, carnivorous plants a flagged accent (they want soft water, strong light and a winter rest).' },
    density: ['One trunk and a hummock, mostly open water', 'Trunks, knees and floaters, a clear patch', 'Trunks, knees, moss and floaters wall to wall, one opening'],
    deps: ['cypress knees', 'hanging moss', 'water tint', 'carnivorous plants'], tags: { chem: ['soft'], temp: 'any', minGallons: 30 } },
  { id: 'boulder-creek', name: 'Mossy Boulder Creek', tagline: 'A mountain creek in a box. The pump works hard.', env: 'paludarium', water: null, familyId: 'pa-stream',
    fingerprint: ['rounded river boulders', 'a fast shallow riffle', 'moss on the wet stone', 'cool, clear water'],
    contrast: { sibling: 'cliff-gorge', how: 'Low rounded boulders and running water; the gorge is a tall angular cliff with a thread of water.' },
    recipe: { looks: [], notes: 'Hillstream stones above and below a lowered waterline; needs flowing water.' },
    density: ['A few boulders, a wide open riffle', 'Boulders in a line with moss, a pool below', 'Boulders bank to bank, ferns and moss on every stone'],
    deps: ['waterfall / flowing water', 'cobbles', 'moss carpet'], alternative: 'rainforest-waterfall', tags: { chem: ['soft'], temp: 'cold', minGallons: 30 } },
  { id: 'riparium-garden', name: 'Rim Garden', tagline: 'A leafy rim over a quiet tank. Mind the jumpers.', env: 'paludarium', water: null, familyId: 'pa-fantasy',
    fingerprint: ['houseplants rooted in planters on the rim', 'foliage spilling above the glass', 'roots trailing in the water', 'mostly open water below'],
    contrast: { sibling: 'floating-island', how: 'The plants hang from the rim; the floating island is a planted raft on the surface.' },
    recipe: { looks: [], notes: 'An aquarium with emersed plants above an open top; B node riparium (open-top pothos roots merged).' },
    density: ['A single planter in one corner', 'Planters along the back rim', 'Planters all round the rim, roots curtaining the back'],
    deps: ['emersed plants above the rim', 'open-top enclosure'], alternative: 'rainforest-waterfall', tags: { chem: ['soft'], temp: 'tropical', minGallons: 20 } },
  { id: 'turtle-shore', name: 'Turtle Basking Shore', tagline: 'A basking dock over a deep swim. Turtles need real water.', env: 'paludarium', water: null, familyId: 'pa-creature',
    fingerprint: ['a basking dock under a lamp', 'deep open swimming water', 'a small shore at one end'],
    contrast: { sibling: 'newt-shore', how: 'Warm, bright and mostly deep water for a basker; the newt pond is cool, shaded and mossy.' },
    recipe: { looks: [], notes: 'Musk turtle scale only (one adult, 40 gal or more); sliders and painted turtles do not fit a paludarium.' },
    density: ['Dock and open water only', 'Dock, a root and a planted shore', 'Dock, roots, plants and floaters, swim lane kept'],
    deps: ['basking dock'], alternative: 'riverbank-shore', tags: { chem: ['soft', 'hard'], temp: 'tropical', minGallons: 40 } },
];

export const ARCHETYPES: Archetype[] = [...FW, ...SW, ...BK, ...TE, ...PA].map(arch);

const BY_ID = new Map(ARCHETYPES.map(a => [a.id, a]));
const FAM_BY_ID = new Map(FAMILIES.map(f => [f.id, f]));
export const archetype = (id: string): Archetype | undefined => BY_ID.get(id);
export const family = (id: string): Family | undefined => FAM_BY_ID.get(id);

/** The families shown after an environment (and, for an aquarium, a water type); terrarium and paludarium ignore water. */
export function familiesOf(env: Env, water: Water | null): Family[] {
  const w = env === 'aquarium' ? water : null;
  return FAMILIES.filter(f => f.env === env && f.water === w);
}

/** The archetypes shown under a family, its own first, then the ones cross-linked into it (`alsoIn`). */
export function archetypesOf(familyId: string): Archetype[] {
  return [...ARCHETYPES.filter(a => a.familyId === familyId), ...ARCHETYPES.filter(a => a.alsoIn?.includes(familyId))];
}
