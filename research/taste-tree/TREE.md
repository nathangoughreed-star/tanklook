# Taste tree: "I like this one" rounds (draft 2 2026-10-30)

Master tree for the look picker / GV6 narrowing. Built from three research files in this folder (full per-style
specs, generic representative tank, cues, personas, sources live there; this file only cites their node ids):
- `A-artificial-mainstream.md` (51 nodes, personas, demographics): decorative, themed, interior, animal-driven, working tanks
- `B-natural-freshwater.md` (70+ nodes): aquascaping schools, low-tech / natural method, biotopes, paludarium / riparium
- `C-marine-brackish-land.md` (81 nodes): marine, reef, brackish, odd aquatic, land

**Draft 2 (Nathan 2026-10-30):** the first pick is the kind of tank (aquarium / terrarium / paludarium), then
fresh or salt for aquariums, then the style rounds. Every tile carries a short playful line that hints at the
trade-off (cost, care, effort) without spelling it out ("Own a slice of the ocean, but it may cost you!").

## Shape

```
Kind of tank      Aquarium                    Terrarium        Paludarium
Water             Freshwater | Saltwater      -                -
Style round A     4 tiles      4 tiles        3 tiles          3 tiles
Style round B     3-4 tiles = the style       3-4 tiles        3-4 tiles
then GV6 variations around the picked style (variants, composition, density, size, tier)
```

Picks to reach a style: aquarium 4, terrarium and paludarium 3. Each round has 2-4 tiles.

## Rules

1. **Rounds pick the style; GV6 variations do the rest.** The tree stops at the style (Iwagumi, Malawi rock,
   GloFish). A style's named variants (classic three-stone vs many-stone Iwagumi, Malawi rock vs sand) and the
   continuous axes (composition, density, gravel colour, light colour, size, plant mode) are GV6 variations, not
   rounds.
2. **One faithful, generic picture per tile.** The tile renders the style's "generic representative tank" from the
   research file. The label says what you see; the jargon goes in small print ("Stones and a green lawn" / Iwagumi).
3. **Taglines hint, they don't lecture.** One line, under about 60 characters, playful, with an upside and a quiet
   catch. The real numbers ($, minutes a week) stay on the GV6 cards, where they are priced. Taglines never make a
   claim the engine contradicts (no "cheap" on a style the price says isn't).
4. **Feasibility prunes, never compromises** (GV rule). Every style carries tags: kind, water (`soft` / `hard` /
   `brackish` / `marine`), temp (`tropical` / `cold`), min gallons, tech / cost / care tier. When Guided already
   has a roster or a tank, impossible tiles are hidden; a round with ONE tile left is skipped (a mbuna roster skips
   kind, water and round A and lands on the Malawi styles); a round with none drops back a level.
5. **Every round has "None of these" (show the next most different tiles) and Back** (GV6 breadcrumb). "Not this"
   is a taste reject as today. Taste records the style id, so a style reachable two ways (see cross-links) counts once.
6. **Styles marked GAP show as "coming soon" tiles** (Nathan 2026-10-30). Same slot, label and tagline, a
   "Coming soon" badge, no render and no price (those come from the engine, which can't build it yet). Picking it
   doesn't continue the flow: it records interest (a `wish` taste event, so we learn which packs people want
   first) and says what's closest that the app can draw today. A round where every tile is coming soon still
   shows, with its closest drawable style offered below. Feasibility pruning (rule 4) applies to coming-soon tiles
   too, by their tags. A tile drops the badge when its pack lands; no other change.

## Kind of tank

| Tile | Tagline | Picture |
|---|---|---|
| Aquarium | "A living window. Fair warning: you'll stare at it for hours." | a full, lit planted tank with a school |
| Terrarium | "No water changes ever. Just crickets. Lots of crickets." | a dart-frog vivarium or a desert gecko set-up |
| Paludarium | "Land, water and a waterfall. Twice the magic, twice the plumbing." | half-land, half-water with a waterfall |

## Aquarium: water

| Tile | Tagline | Picture |
|---|---|---|
| Freshwater | "Thousands of fish, and forgiving when life gets busy." | planted community tank |
| Saltwater | "Own a slice of the ocean, but it may cost you!" | mixed reef with clownfish |

Brackish lives under Saltwater ("Where the river meets the sea"); its fish (puffers, mollies, archers) carry the
`brackish` tag, so a freshwater roster that includes one still prunes correctly.

## Freshwater

### Round A
| Tile | Tagline | Picture |
|---|---|---|
| F1 Living art | "Gallery-worthy. Bring scissors." | crisp contest scape: carpet, stone or wood, clear layout |
| F2 Easy green | "Lush and alive, and fine if you skip a weekend." | relaxed planted community, mixed plants, fish front and centre |
| F3 Wild places | "A real river, lake or swamp. Less tidy, more true." | tea-coloured water, leaves and roots |
| F4 Decorated | "Your tank, your rules. Nothing to trim." | colourful gravel, an ornament, bright fish |

### Round B (the style; style ids from B unless marked; `maps` = existing LayoutId)
- **F1 Living art**
  - "Stones and a green lawn" (Iwagumi): "Zen in a box. The lawn has opinions." -> `iwagumi` (variants `iwagumi-sanzon-classic`, `iwagumi-modern-multistone`) | maps `iwagumi`
  - "Driftwood and moss" (Nature aquarium): "Driftwood, moss and patience." -> `ryuboku-wood-nature` (variants `forest-scape`, `moss-scape`) | maps `nature`, `forest`
  - "A landscape in miniature" (diorama): "Tiny mountains. Big bragging rights." -> `diorama-landscape` (variants `mountain-cliff-scape` + `chinese-mountain-stone`, `valley-trail-scape`, `bonsai-tree-scape`, `island-lagoon-scape`) | GAP
  - "Plants as the art" (Dutch): "A flower garden underwater. You're the gardener." -> `dutch` (variants `taiwanese-terrace`, `red-plant-showcase`, `plant-collector-showcase`) | maps `dutch`
- **F2 Easy green**
  - "Pretty planted community": "The classic. Fish, plants, happy everybody." -> `living-room-planted-community` | maps `planted`
  - "Overgrown jungle": "Let it grow wild. Pruning optional, mostly." -> `jungle-wild` (variants `lowtech-jungle-no-co2`, `walstad-dirted`, `wild-type-messy-natural`) | maps `jungle`, `swamp`
  - "Wood with tough plants": "Plants that survive you. Slow growers, though." -> `lowtech-epiphyte-tank` (variant `shrimp-moss-nano`) | maps `driftwood`
  - "Floating canopy": "Shade from above, roots from the ceiling. Bettas approve." -> `floating-plant-surface-cover` (variant A `betta-sorority-jungle`) | GAP
- **F3 Wild places**
  - "Tea water and leaves" (blackwater): "Amber water, fallen leaves. Not for the 'clean glass' crowd." -> `amazon-blackwater-rio-negro` (variants `amazon-igapo-flooded-forest`, `peat-swamp-blackwater`, `botanical-method-tannin`) | maps `blackwater`
  - "Rocky lake" (African cichlids): "Freshwater fish in saltwater colours. Feisty, too." -> `malawi-mbuna-rocky-shore` (variants `malawi-sand-utaka`, `tanganyika-shell-bed`, `central-american-rock-cichlid`) | maps `malawi`
  - "River and stream": "Rushing water, polished stones. Your filter works overtime." -> `sand-stone-river-tank` (variants `hillstream-torrent`, `southeast-asian-planted-stream`, `rice-paddy-shallows`) | maps `stream`, `hillstream`
  - "Cool native waters": "No heater needed. Local legends only." -> `native-creek-darters` (variants `native-swamp-sunfish`, `biotope-europe-cold`, `biotope-japan-medaka`) | GAP (cold-water natives)
- **F4 Decorated** (style ids from A)
  - "Bright and colourful": "Glow fish, rainbow gravel, zero apologies." -> `glofish-neon-blacklight` (variants `rainbow-gravel-clown`, `classic-castle-kit` + `kid-first-tank-kit`, `colour-led-party`, `retro-nostalgia-70s`) | GAP
  - "A themed scene": "Every tank tells a story. Yours has pirates." -> `themed-narrative` (variants `holiday-seasonal`, `pop-culture-fandom`, `printed-3d-background-scene`, `fantasy-scifi-glow`) | GAP
  - "Fake, but looks real": "Fools the guests, never needs a trim. The fish know." -> `natural-ish-artificial` (variants `silk-plastic-jungle`, `faux-natural-from-couch`) | maps any natural look with plant mode `artificial`
  - "Clean and bare": "One star fish, nothing in the way. Easy to clean, hard to hide in." -> `black-sand-black-back-modern` (variants `white-sand-single-rock`, `rimless-showpiece`, B `hardscape-only-rock-wood`, and the bare star-animal tanks: `oscar-american-cichlid`, `flowerhorn-show`, `arowana-fengshui`, `monster-predator-bare`, `discus-bare`, `fancy-goldfish-bare-or-sand`, `axolotl-cold`) | GAP (bare bottom, plain backgrounds)

Animal-driven tanks: when Guided already holds the animal (oscar, discus, goldfish, axolotl, turtle), feasibility
pruning does the work: only the styles that suit it remain (often just "Clean and bare" and one natural style).
Turtles (`turtle-basking`) need a basking dock: a variation on any freshwater style they pass.

## Saltwater (style ids from C)

### Round A
| Tile | Tagline | Picture |
|---|---|---|
| S1 Coral garden | "Living colour that grows. So does the electric bill." | rock covered in coral |
| S2 Ocean fish | "Big, bold saltwater fish. Coral optional." | live rock, open water, tangs and angels |
| S3 Where the river meets the sea | "Mangroves, mudflats and puffers with attitude." | mangrove roots, sand, brackish fish |
| S4 Strange sea life | "Seahorses, jellyfish, octopus. Not your average tank." | a seahorse tank or a jellyfish kreisel |

### Round B
- **S1 Coral garden** (rock layout and light colour are GV6 variations: `scape-rock-wall`, `scape-islands`, `scape-arches-bonded`, `scape-bare-bottom-skyline`; actinic blue vs daylight)
  - "Soft and easy corals": "Swaying, forgiving and fast to grow." -> `reef-softie-garden` (variants zoa, mushroom) | maps `softreef`
  - "Big fleshy corals" (LPS): "Bold shapes, gentle flow, sweepers with a sting." -> `reef-lps` | maps `reef`
  - "Stony corals" (SPS): "The peak of the hobby. Your test kit becomes a hobby." -> `reef-sps` (variant `reef-sps-pastel-ulns`) | maps `spsreef`
  - "A bit of everything" (mixed reef): "The best of every coral. Mind the neighbours." -> `reef-mixed` (variants `reef-clam-tank`, reef biotopes) | maps `reef`
- **S2 Ocean fish**
  - "Peaceful community": "Colourful fish, live rock and no coral worries." -> `fowlr-peaceful-community` | GAP
  - "Predators": "Lionfish, eels and triggers. Feeding time is a show." -> `fowlr-predator` (variant aggressive-mixed) | GAP
  - "Old-school classic": "White coral skeletons and bright fish. Very 1995, in a good way." -> `fish-only-oldschool` | GAP
  - "Finding Nemo": "A clownfish and its anemone. The anemone may wander." -> `nemo-clownfish-first-salt` (variant `reef-anemone`) | maps `clownnano`
- **S3 Where the river meets the sea** (brackish + mangrove + seagrass)
  - "Mangrove roots": "A real tree, growing in your tank. Slowly." -> `reef-mangrove-display` (= `bio-mangrove-root`, variant `brk-archerfish-mangrove`) | GAP
  - "Seagrass lagoon": "Soft green meadows and quiet fish." -> `reef-macroalgae-seagrass` | GAP
  - "Mudskipper shore": "Fish that walk. Escape artists included." -> `brk-mudskipper-shore` | GAP
  - "Puffers and gobies" (brackish): "Big eyes, bigger personalities. Snail budget required." -> `brk-puffer` (variants `brk-goby-community`, `brk-molly-community`) | GAP
- **S4 Strange sea life**
  - "Seahorses and gentle oddities": "Slow, strange and hand-fed. Bring patience." -> `sp-seahorse-pipefish` (variants `sp-mandarin-pod-reef`, `sp-banggai-cardinal`, `sp-jawfish-sand`, `sp-garden-eel-deep-sand`) | GAP
  - "Glowing in the dark": "Drifting jellyfish or a cave of glowing polyps. Hypnotic, high-maintenance." -> `sp-jellyfish-kreisel` (variant `reef-nps-dark`) | GAP
  - "Cold sea": "Kelp and anemones from colder shores. Needs a chiller." -> `sp-cold-temperate` (variant `bio-tide-pool`) | GAP
  - "Big and strange": "Octopus or small sharks. Brilliant, demanding, escape-prone." -> `sp-cephalopod` (variant `sp-shark-ray`) | GAP

## Terrarium (style ids from C)

| Round A | Tagline | Round B (the style) | maps |
|---|---|---|---|
| T1 Rainforest | "Misty, green and humid. Your glasses will fog." | "Dart frog jungle" `land-dartfrog-rainforest`: "Tiny jewels. Tiny flies to match."; "Tall and leafy" `land-crested-gecko-arboreal` (+ chameleon): "Climbers that sleep all day."; "Bioactive clean-up crew" `land-isopod-bioactive` (+ hermit crab): "The bugs do the cleaning. Mostly." | `rainforest`, `frogs` |
| T2 Desert | "Sun, sand and rock. Bring a heat lamp." | "Leopard gecko desert" `land-leopard-gecko-desert`: "The smiling lizard. Low-key and loyal."; "Bearded dragon basking" `land-bearded-dragon`: "Sunbather, salad eater, needs room."; "Tortoise table" `land-tortoise-table`: "Slow living. They outlive leases." | `arid` |
| T3 Hide and burrow | "Cosy hides for creatures that like their privacy." | "Snake hideaway" `land-ball-python`: "Calm, curious, eats once a week."; "Tarantulas and scorpions" `land-burrower-tarantula-scorpion`: "A dug-in pet rock with legs."; "Jumping spider" `land-jumping-spider`: "Small, smart, oddly cute." | `python`, `burrow`, `jumper` |

## Paludarium (style ids from B unless marked)

Split by how much is water, the clearest difference in the picture.

| Round A | Tagline | Round B (the style) | maps |
|---|---|---|---|
| P1 Mostly land | "A jungle with a pond. The frogs get the view." | "Waterfall jungle" `paludarium-waterfall-jungle`: "The showstopper. Listen to it run."; "Rock and cork wall" `paludarium-rock-wall`: "A cliff face dripping with plants." | `paludarium` |
| P2 Half and half | "A shoreline in a box. Fish below, frogs above." | "Flooded forest" `paludarium-flooded-forest`: "Roots in the water, leaves in the air."; "Shoreline" `half-tank-shoreline`: "Sand slopes into water. Crabs welcome."; C "Mudskipper shore" (cross-link, brackish) | `paludarium` (GAP: shoreline slope) |
| P3 Mostly water | "An aquarium with plants spilling out the top." | "Riparium" `riparium` (variant `open-top-pothos-roots`): "Houseplants with their feet wet."; "Wabi-kusa and bowls" `wabi-kusa-bowl` (variants `sealed-jar-ecosphere`, `medaka-tub-bowl`, A `lotus-bowl-ornamental`): "A tiny world on your desk."; C "Mangrove riparium" `brk-mangrove-riparium` (cross-link, brackish) | GAP |

Ponds and patio tubs (`patio-pond-water-garden`, A `patio-tub-pond`, `bog-garden`) are left out (Nathan 2026-10-30).

## Variation axes (GV6, after a style)

Each GV6 "look" variation moves ONE of these (plus the style's named variants listed above):
- composition: mound / side / U / V / scattered (exists: `CompId`)
- density: sparse / usual / full (exists: layer densities)
- plant mode: live / artificial / mixed (exists)
- substrate colour: black soil / pale sand / white sand / natural gravel / coloured (GAP for coloured)
- water tint: clear / light tea / dark tea
- light colour: daylight / reef blue (actinic) / warm amber / blacklight (GAP)
- reef rock layout: wall / islands / arch / bare-bottom skyline (GAP)
- format: nano / standard / large / furniture (in-wall, divider, coffee table, column) / rack (GV6 size axis covers part)

## Coverage: what the app draws today vs what the tree needs

About 55 styles at round B. 24 existing looks (`LayoutId`) cover about 20 of them. Gaps grouped into packs, in the
order that unlocks the most tiles (grep check of `src/`; not verified tile by tile):
1. **Decor pack** (F4 except "Fake, but looks real"): ornaments (castle, sunken ship, chest, diver, skull, resin
   ruins, bubbler), coloured gravel, printed backgrounds, glow fish and plants with a blacklight / LED colour mode.
   Today only artificial plants and a priced resin arch item exist.
2. **Bare and minimal pack** ("Clean and bare", S2): bare bottom, plain black / blue / white backgrounds, white and
   black sand, a single feature rock, FOWLR rock with open water.
3. **Habitat pack** (diorama, floating canopy, F3 variants, cold natives): leaf litter and seed pods, flooded-forest
   roots, shell beds, cobbles, cliff / bonsai hardscape, dense floaters with hanging roots.
4. **Shore and sea pack** (S3, S4, P2-P3): mangrove roots, seagrass and macroalgae, brackish water type, shoreline
   slope, reef rock layouts, actinic light, cold-water marine, kreisel.
5. **Shapes pack** (bowls, jars, cylinder, coffee table, in-wall, racks).

## Open questions for Nathan

1. ~~Round 1 tile count~~: answered 2026-10-30, kind of tank first, then fresh / salt.
2. ~~Ponds and patio tubs~~: answered 2026-10-30, left out (Nathan: "Leave them out").
3. ~~Undrawable styles~~: answered 2026-10-30, show them as "coming soon" (rule 6).
