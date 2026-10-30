# Taste tree, slice C: saltwater, reef, brackish, odd aquatic, land

Researcher C. Date 2026-10-30. Units are US (gallons, inches, deg F).
Siblings: A = mainstream/artificial freshwater, B = natural planted freshwater and biotopes.

How to read this file
- Source quality: web search for this hobby returns mostly forum threads and retailer blogs. URLs below are ones that actually came back from searches this session (or from the one page I fetched). Where a node says "(hobby knowledge)" it rests on general reef-hobby convention and I found no page to cite; treat the details as defensible but unsourced.
- Popularity is my relative judgment inside the marine / land world (5 = very common, 1 = rare), NOT measured data. No public survey breaks reef styles down; I say so where it matters.
- "Render spec" = enough for a generic tank picture. "Distinguisher" = the single feature that should differ in the picker thumbnail.
- Cost tier = total setup + upkeep. Care tier = skill and daily effort.

---

## 0. Market data: saltwater vs freshwater

| Figure | Value | Source / confidence |
|---|---|---|
| US households with freshwater fish (APPA 2025 report) | about 10 million (secondary sites quote 9.6M to 11.8M) | https://americanpetproducts.org/news/from-bigger-tanks-to-stronger-bonds-fish-reptile-ownership-evolves-in-2025 (APPA release; freshwater figure confirmed in snippet, saltwater cut off) |
| US households with saltwater fish | about 1.9 to 2.0 million (secondary sources citing the 2024-25 survey; one older/low-quality source says 2.3% of all households vs 11.8% freshwater) | https://www.petage.com/?p=497423 plus secondary roll-ups; MEDIUM confidence, check APPA's own PDF |
| Implied saltwater share of fish-keeping households | roughly 16 to 20 percent (about 1 in 5 to 1 in 6). Overlap (people with both) not separated | derived from the two rows above |
| Ornamental-fish hobbyist sample (PeerJ 2022): freshwater only 86%, marine only 5%, both 9% | so about 14% keep any marine | https://pmc.ncbi.nlm.nih.gov/articles/PMC9661971 (one sample, not the whole market; best-quality figure found) |
| Reef-keeper demographics | skews male (forum guesses 70 to 90%); no good data | weak; do not use |
| Brackish, odd aquatic, land | no survey found; brackish is a few percent of fish keepers at most (my estimate). Land (reptile/amphibian/invert) is a separate APPA category; I did not retrieve its household count | not sourced |

Takeaway: saltwater is about one fish household in five or six, but it is a high-spend, high-engagement, high-image-sharing minority, so it is over-represented in forums, YouTube and aquascape contests. For a picker that shows pictures, marine deserves a first-round tile even though it is the minority.

---

## 1. Personas (referenced by nodes)

- P-nemo: Finding-Nemo first saltwater. Wants clownfish, blue tang, anemone, "it looks like the movie". Budget-limited, easily overwhelmed.
- P-chem: Reef chemistry / tech geek. Dosing, ICP tests, controllers, Alk/Ca/Mg. Wants stable parameters; tank look is secondary to the numbers.
- P-collector: Coral collector / "coral addict". Buys frags by name and colour (WWC, JF, TSA, Cornbred lines), wants maximum colour per square foot.
- P-fragger: Frag seller / hobby-fragger. Racks, grids, shallow tanks, utility look.
- P-mono: Monster / predator saltwater keeper. Wants big fish with personality, eats live or frozen food on camera.
- P-artist: Minimalist reef artist. Rock sculpture, negative space, a few perfect corals. Often Japanese / Scandinavian design taste.
- P-biotope: Biotope purist. Reproduces one real reef zone exactly (Red Sea, Caribbean, Hawaii).
- P-species: Species specialist (seahorses, mandarins, cephalopods, jellies).
- P-decor: Wants a living decoration, low-effort, colourful (the saltwater version of the "colourful fish tank" crowd).
- P-herp: Reptile / amphibian / invertebrate keeper, land side.
- P-nature: Wants "a piece of nature", paludarium / mangrove / shoreline.

---

## 2. Proposed tree (slice C), ids only

```
C-root  (round 1 sibling of A natural/ B planted; this slice is "Salt, brackish and land")
|
+-- marine  (salt water)
|   |
|   +-- marine-fish-led   (fish are the show; rock is furniture)
|   |    +-- fowlr-peaceful-community
|   |    +-- fowlr-predator            (lionfish, eel, grouper, big triggers)
|   |    +-- fowlr-aggressive-mixed    (triggers, large angels, tangs)
|   |    +-- fish-only-oldschool       (bleached skeleton / resin decor)
|   |    +-- nemo-clownfish-first-salt
|   |    +-- fish-forward-reef         (3-4 corals + schools of anthias/chromis)
|   |
|   +-- reef-coral-led    (corals are the show)
|   |    +-- by coral type
|   |    |    +-- reef-softie-garden
|   |    |    +-- reef-zoa-garden
|   |    |    +-- reef-mushroom-garden
|   |    |    +-- reef-lps
|   |    |    +-- reef-sps
|   |    |    +-- reef-sps-pastel-ulns
|   |    |    +-- reef-mixed
|   |    |    +-- reef-clam
|   |    |    +-- reef-anemone
|   |    |    +-- reef-nps-dark
|   |    |    +-- reef-macroalgae-seagrass
|   |    |    +-- reef-mangrove-display
|   |    +-- by rock layout (second pick, shown with whatever coral type was chosen)
|   |    |    +-- scape-rock-wall
|   |    |    +-- scape-islands
|   |    |    +-- scape-arches-bonded
|   |    |    +-- scape-japanese-rock-art
|   |    |    +-- scape-sand-lagoon
|   |    |    +-- scape-bare-bottom-skyline
|   |    |    +-- scape-shelf-terraced
|   |    |    +-- scape-frag-rack
|   |    +-- by light colour (third pick or a slider)
|   |    |    +-- light-actinic-blue
|   |    |    +-- light-daylight-white
|   |    +-- by format
|   |         +-- fmt-nano-aio
|   |         +-- fmt-pico-bowl
|   |         +-- fmt-sump-display
|   |         +-- fmt-peninsula-divider
|   |         +-- fmt-shallow-reef-pond
|   |         +-- fmt-mega-display
|   |
|   +-- marine-species   (one animal drives everything)
|   |    +-- sp-seahorse-pipefish
|   |    +-- sp-mandarin-pod-reef
|   |    +-- sp-jawfish-sand
|   |    +-- sp-garden-eel-deep-sand
|   |    +-- sp-cephalopod
|   |    +-- sp-jellyfish-kreisel
|   |    +-- sp-shrimp-goby
|   |    +-- sp-banggai-cardinal
|   |    +-- sp-anthias-shoal
|   |    +-- sp-shark-ray
|   |    +-- sp-cold-temperate
|   |    +-- sp-breeding-rack
|   |
|   +-- marine-biotope
|        +-- bio-red-sea
|        +-- bio-indo-pacific-reef-flat
|        +-- bio-caribbean
|        +-- bio-hawaiian
|        +-- bio-reef-crest
|        +-- bio-mangrove-root
|        +-- bio-seagrass-bed
|        +-- bio-deep-cryptic
|        +-- bio-tide-pool
|
+-- brackish
|    +-- brk-puffer
|    +-- brk-archerfish-mangrove
|    +-- brk-molly-community
|    +-- brk-goby-community
|    +-- brk-mono-scat-shoal
|    +-- brk-mangrove-riparium
|    +-- brk-mudskipper-shore
|
+-- odd-aquatic   (water but not a fish tank)
|    +-- odd-axolotl
|    +-- odd-aquatic-turtle
|    +-- odd-crayfish-lobster
|    +-- odd-aquatic-frog
|    +-- odd-closed-ecosphere
|
+-- land  (terrarium / vivarium)
     +-- humid
     |    +-- land-dartfrog-rainforest
     |    +-- land-crested-gecko-arboreal
     |    +-- land-chameleon-screen
     |    +-- land-paludarium
     |    +-- land-isopod-bioactive
     |    +-- land-hermit-crab
     +-- arid
     |    +-- land-leopard-gecko-desert
     |    +-- land-bearded-dragon
     |    +-- land-tortoise-table
     +-- cover-and-burrow
          +-- land-ball-python
          +-- land-jumping-spider
          +-- land-burrower-tarantula-scorpion
```

---

## 3. NODES: marine, fish-led

### marine-fish-led (branch)
- aka: fish-only, "marine tank", FOWLR family
- personas: P-mono, P-nemo, P-decor
- cues: more open water than a reef; rock sparse, mostly grey-purple-brown coralline-dusted live rock or plain white/grey dry rock; sand or crushed coral floor; lighting simple (one white or blue-white bar, no coral-grow light intensity); NO coral colours in the picture.
- cost: med | care: med | pop: 4
- distinguisher: absence of coral; big, visible fish.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want

### fowlr-peaceful-community
- aka: FOWLR (fish only with live rock), peaceful marine community, "fish-only"
- parent: marine-fish-led | personas: P-nemo, P-decor
- cues: 20 to 30 percent of tank as live rock arranged as one or two loose piles with caves; light-grey sand; fish in bright primary colours; no corals; calm flow; clean, bright but not blue-saturated.
- render spec: 75 to 125 gal rectangle, 48 to 72 in long. Rock: one back-left pile with a cave at mid height, one low pile right. Sand: 2 in light sand, open centre. Animals: yellow tang or purple tang, 2 percula clownfish, royal gramma, firefish, cleaner shrimp. Decor: 1 piece of coralline-covered rock as focal, no corals.
- cost: med | care: med | pop: 4
- distinguisher: bright tropical fish with plain rock, zero coral.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want ; https://gulf-coast-aquatics.pages.dev/guide/fowlr-vs-reef-tank/

### fowlr-predator
- aka: predator tank, carnivore tank, lionfish tank, "monster FOWLR", eel tank, grouper tank
- parent: marine-fish-led | personas: P-mono
- cues: 150 to 300+ gal; few, stable rock structures with big caves and open swim lanes (rock stacked solidly so fish cannot topple it); thick sand or bare bottom; very large fish seen face-on; heavy gear (huge skimmer, sump) often visible on stand; nothing small or colourful.
- render spec: 180 gal (72x24x25 or taller). Rock: 3 sturdy cave stacks at back and sides, one big tunnel/arch the eel uses. Sand: 3 in coarse sand or crushed coral. Animals: volitan lionfish, snowflake or zebra moray, panther or miniatus grouper, one dogface puffer or Picasso trigger (see source note: trigger + lionfish is a known bad pair), large hermit or none. No plants, no corals, perhaps a tough Caulerpa clump.
- cost: high | care: med-high (bioload) | pop: 3
- distinguisher: one very large predatory fish (lionfish, eel head out of cave) filling the frame.
- src: https://www.monsterfishkeepers.com/forums/goto/post?id=8213958 ; https://forums.reefcentral.com/threads/questions-about-building-a-predator-tank.1316502

### fowlr-aggressive-mixed
- aka: aggressive marine tank, "semi-aggressive", triggerfish tank, big-angel / tang tank
- parent: marine-fish-led | personas: P-mono, P-decor
- cues: like predator but fish are bold/colourful rather than monstrous: tangs, large angels, triggers (Picasso, Niger), puffers, wrasses; plenty of swimming room; rock stacked high and sturdy; coloured fish dominate.
- render spec: 125 to 200 gal. Rock: tall stable ridge on the left, low scattered rubble right; coarse sand 2 in. Animals: blue hippo tang, Emperor angel (juvenile blue-ring), clown trigger, Valentini puffer, fox-face rabbitfish.
- cost: med-high | care: med | pop: 3
- distinguisher: many large, brightly patterned fish crowding the open water (vs predator's few dark bulky fish).
- src: https://www.monsterfishkeepers.com/forums/goto/post?id=5950466

### fish-only-oldschool
- aka: fish-only (FO), "old school" saltwater, bleached coral skeleton tank, resin reef decor, crushed coral, undergravel filter tank, plastic coral
- parent: marine-fish-led | personas: P-decor, P-nemo, retro-nostalgic
- cues: WHITE or pink branched coral skeletons (bleached Acropora/Pocillopora), shells, resin "reef" pieces, ceramic arches, sometimes plastic fan corals; crushed-coral or white aragonite floor; high-gloss white-blue light; saturated clown/damsel/tang colours; very clean "pet-shop" look, often 55 to 90 gal. Contrast with live-rock grey-purple.
- render spec: 55 to 75 gal. Decor: 2 bleached branching coral skeletons (one centre-left, one right), a white skull-shaped rock, resin arch, scatter of shells; bright white crushed-coral. Animals: 2 clowns, yellowtail damsel, blue tang, lawnmower blenny, hermit crabs. (Note: using real skeletons is legally/ethically sensitive; resin and ceramic equivalents are safe to draw.)
- cost: low | care: low-med | pop: 2 (declining; strong in older print tutorials and some Asian pet shops)
- distinguisher: bone-white branching skeletons on white gravel.
- src: https://reefbuilders.com/2020/11/02/time-capsule-of-german-mini-reef-aquariums-from-1985 (history context; no direct page for this node) (hobby knowledge for the look)

### nemo-clownfish-first-salt
- aka: Finding Nemo tank, clownfish tank, clown and anemone, "first saltwater", starter marine
- parent: marine-fish-led | personas: P-nemo
- cues: ORANGE clownfish pair is the clear subject; bubble-tip anemone (green-tan, bulb-ended tentacles) on a rock, a blue tang or blue-green Chromis nearby; light rock, soft corals optional (a few mushrooms, a cluster of green star polyps); bright, friendly, cartoon-adjacent composition.
- render spec: 20 to 40 gal (AIO) or 75 gal. Rock: single mound centre-left with a flat top for the anemone. Sand: white. Elements: bubble-tip anemone on rock, a patch of green star polyp, small zoa colony. Animals: ocellaris pair, blue-green chromis x3, cleaner shrimp, yellow clown goby, snails.
- cost: med | care: med (anemones are hard) | pop: 5
- distinguisher: clownfish swimming in an anemone, centred.
- src: https://reefbuilders.com/2016/11/30/what-to-keep-in-saltwater-aquarium (general starter list) (look is hobby knowledge)

### fish-forward-reef
- aka: "small coral-and-fish tank" (a Reefbuilders author's favourite), reef-safe community with a few corals
- parent: marine-fish-led | personas: P-nemo, P-decor, P-artist
- cues: only 3 to 4 big, easy corals (a hammer, a frogspawn, a toadstool leather, a mushroom colony) in a fairly open rockscape; ONE or TWO schools (green Chromis, lyretail or Bartlett anthias, firefish) filling open water in front of the rock; the school is the visual hero.
- render spec: 75 to 120 gal, rock in two islands. Corals: hammer coral, frogspawn, toadstool leather, mushroom. Animals: school of 6 anthias, mated clowns (no anemone), flame hawkfish, yellow watchman goby with pistol shrimp.
- cost: med | care: med | pop: 3
- distinguisher: a shoal of small fish in front of a sparse, large-coral rock.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want

---

## 4. NODES: reef, by coral type

### reef-coral-led (branch)
- aka: reef tank, coral reef aquarium, reef-safe
- personas: P-collector, P-chem, P-artist, P-fragger
- cues: LOTS of colour in a rock; coral covers 30 to 80 percent of the rock surface; rock mostly hidden; stronger lighting (blue-white spectrum), visible tech (skimmer, return nozzles, powerheads); fish present but secondary.
- cost: high | care: high | pop: 4
- distinguisher: the rock is covered in colourful coral.
- src: https://reefbuilders.com/2016/11/30/what-to-keep-in-saltwater-aquarium

### reef-softie-garden
- aka: soft coral reef, "softies", leather / xenia / star polyp / kenya tree tank, beginner reef
- parent: reef-coral-led | personas: P-nemo (stepping up), P-decor, P-nature
- cues: SWAYING, feathery or leathery forms in muted greens, browns, pinks: toadstool leather (mushroom-cap on a stalk), pulsing xenia (white pom-pom fans), green star polyp (bright-green carpet), kenya tree (branching), mushroom discs; rock covered in a soft "fuzzy" skyline; slow motion in current; light mostly white-blue medium intensity.
- render spec: 40 to 75 gal. Rock: one wide pile covered by soft corals in tiers: carpet (GSP) at the base, leathers mid, xenia on top ridge. Animals: ocellaris clowns, blue-green chromis, cleaner shrimp, hawkfish. Colour: green, tan, pink, white.
- cost: low-med | care: low-med | pop: 4
- distinguisher: soft, swaying, tree-like and carpet corals (no hard branches).
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want ; https://gulf-coast-aquatics.pages.dev/guide/sps-vs-lps-vs-soft-corals/

### reef-zoa-garden
- aka: zoanthid / "zoa" / palythoa colony tank, zoa-only, "paly", button polyps
- parent: reef-coral-led | personas: P-collector, P-nemo
- cues: CARPETS of small button polyps in saturated multi-colour (neon green with orange centres, red/pink "bling", rainbow, "Eagle Eyes"); each colony 1 to 4 in across; rock reads as a mosaic of coloured discs; more compact, calm, low aggression. Source warns of terpenoid chemical warfare and that zoas can fill the tank quickly.
- render spec: 20 to 40 gal. Rock: low pile, 6 to 12 named zoa colonies packed side by side (green, orange, blue, pink); a hardy clown and a few snails. No big LPS.
- cost: med (rare morphs expensive) | care: low-med | pop: 4
- distinguisher: dense mosaic of coloured polyp carpets with orange or yellow centres.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want

### reef-mushroom-garden
- aka: mushroom / "rock flower anemone" / ricordea / discosoma tank, shroom tank, "Bounce shrooms"
- parent: reef-coral-led | personas: P-nemo, P-collector (rare shrooms are luxury)
- cues: flat, ruffled discs (smooth or warty), 1 to 6 in across, in blue, red, orange, green, "Bounce"-spotted; low-lit (even shaded) look; rock often covered with rounded pads like a plush rug; calmer, softer than zoas.
- render spec: 20 to 40 gal. Rock: low rubble pile, shaded ledges. Elements: hairy shrooms, rhodactis, ricordea florida, green striped mushrooms. Animals: pair of clowns, small gobies, snails.
- cost: low-med | care: low | pop: 3
- distinguisher: flat, ruffled, saucer-shaped discs instead of polyp carpets.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want (hobby knowledge for look)

### reef-lps
- aka: LPS-dominant tank, large polyp stony, "euphyllia tank", torch / hammer / frogspawn / brain / acan / goniopora / chalice
- parent: reef-coral-led | personas: P-collector, P-chem (middle-difficulty)
- cues: FAT, fleshy, inflated heads on bold colour: torch coral (long tentacle fans, gold/green tips), hammer, frogspawn (wavy-tentacled), brain corals with grooved bumpy domes, acanthastrea (neon spotted), chalice (flat mosaic), goniopora (flower with tentacles); corals visibly spaced out with air gaps; coral tentacles sway in medium flow; lighting medium; sweeper tentacles mean spacing.
- render spec: 60 to 90 gal. Rock: broad island, corals on mid shelves, each a hand-span apart. Corals: gold torch, green hammer, WWC acan colony, rainbow chalice, rainbow brain. Animals: Tailspot blenny, clown pair, bicolor Foxface, shrimp.
- cost: med-high | care: med | pop: 4
- distinguisher: big fleshy, tentacle-sporting domes and fans (vs fine branches of SPS).
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want ; https://www.ratemyfishtank.com/blog/types-of-coral-for-reef-tanks

### reef-sps
- aka: SPS-dominant, small polyp stony, Acropora tank, Montipora tank, "acro tank", staghorn/tabling, high-flow reef
- parent: reef-coral-led | personas: P-chem, P-collector, P-fragger
- cues: FINE, upward BRANCHING and plating colonies in electric colours (blue/green/purple/orange tips, "neon green slimer", "Walt Disney"); strongest blue-white light; rock thin or nearly hidden under coral at maturity; heavy visible flow (powerheads / gyres / wavemakers); many tanks run bare-bottom; fish few and fast (anthias, tangs); water crystal clear. Text note: new tanks often look sparse and very expensive.
- render spec: 90 to 180 gal. Rock: thin spined towers or an island lattice; bare bottom or thin sand. Corals: staghorn Acro (blue tips, 14 in), tabling Acro (green), pink Montipora plating, branching Stylophora, millepora. Animals: 6 Anthias, Yellow tang, pair of clowns (no host), Pseudochromis.
- cost: high | care: high | pop: 4
- distinguisher: forests of fine, upright, neon-tipped branches under heavy blue light.
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want ; https://www.nano-reef.com/forums/topic/366969-mikeymikemikes-shallow-reef-iwagumi-sps-edition-updated-july/page/19/

### reef-sps-pastel-ulns
- aka: ULNS (ultra-low nutrient system), Zeovit, "pastel SPS", Acropora "colour-morph" tank, pale sps, nutrient-limited reef, "clean" reef
- parent: reef-sps | personas: P-chem, P-collector
- cues: PASTEL tones (cream, pale pink, lavender, pale green tips, pastel "blue") instead of dark brown; very sparse rock; high clarity; very white sand or completely bare; many tanks with sparse fish; minimal macro-algae. Corals appear slightly "washed out" but with neon polyp tips; lighting often daylight-blue.
- render spec: 120 gal bare-bottom, rock reduced to 3 pillars. Corals: pale cream Acro tables, pink Montipora, light lavender Stylo. Animals: 3 yellow clown gobies, group of Chromis.
- cost: high | care: very high | pop: 2
- distinguisher: pale, pastel coral colours with white sand rather than saturated dark.
- src: hobby knowledge; context on the German tank tradition: https://reefbuilders.com/2020/11/02/time-capsule-of-german-mini-reef-aquariums-from-1985 (no fetched page for ULNS itself)

### reef-mixed
- aka: mixed reef, "traditional reef", everything-corals
- parent: reef-coral-led | personas: P-collector, P-chem
- cues: softie carpet at the base, LPS in the mid shelves, SPS on top near the light, anemone somewhere; a "layer cake" of textures and colours; varied fish; the source calls it the hardest to run long-term because each group wants different conditions. Rock usually a tall pile.
- render spec: 120 to 150 gal. Rock: 36 in wide stack, 24 in tall, with ledges. Placement: zoas and GSP low, hammer and acans mid, SPS table on top. Animals: tang trio, wrasses, pair clowns, cleaner shrimp, feather duster.
- cost: high | care: high | pop: 5
- distinguisher: all coral textures at once (tufts, domes, branches, carpets).
- src: https://reefbuilders.com/2023/10/28/what-kind-of-saltwater-tank-do-you-want ; https://www.sgreefclub.com/home/?p=10922

### reef-clam-tank
- aka: clam tank, Tridacna / maxima / derasa / squamosa tank, "giant clam reef"
- parent: reef-coral-led | personas: P-collector, P-species
- cues: big clam mantles with electric blue, gold, purple "streaks" and wavy lips set directly on rock or sand; mantle hallmark. Needs strong light so many of these tanks are bright white-blue; tank low or standard; few corals.
- render spec: 90 gal. Rock: low platform with 3 clams (blue maxima, gold squamosa, large derasa) set in flat spots. Animals: pair of clowns (no host), one Goby.
- cost: med-high | care: med | pop: 2
- distinguisher: giant ruffled, iridescent mantle lips as the focal point.
- src: hobby knowledge. no fetched page

### reef-anemone
- aka: anemone reef, clownfish host tank, BTA / carpet anemone / sebae / long-tentacle, "carpet and clowns", Heteractis
- parent: reef-coral-led | personas: P-nemo, P-species
- cues: LARGE anemones as the main show: bubble-tip (tan/green with bulbs), rainbow or sebae carpet, long-tentacle; clownfish nestle in them; sand-heavy aquascape since anemones wander; few other corals (to avoid stings); bright light.
- render spec: 75 gal. Rock: two low rock mounds, wide flat sand zone; 2 to 3 big anemones on rock tops, one on sand. Animals: pair of Maroon or percula clowns in each, Condy Anemone shrimp.
- cost: med | care: med-high | pop: 3
- distinguisher: anemones the size of dinner plates with clowns weaving in them.
- src: hobby knowledge. no fetched page

### reef-nps-dark
- aka: NPS (non-photosynthetic) reef, "dark tank", sun coral / gorgonian / Dendronephthya / sponge tank, cryptic reef
- parent: reef-coral-led | personas: P-species, P-biotope, P-chem
- cues: DARK. Overhead light very dim (2 low blue LEDs, a few hours a day), rock in shade; the corals are brightly coloured (orange, red, yellow, pink) but fleshy, feathery, tree-shaped, often with open polyps in the dark; much visible plumbing (feeding, strong filtration); little algae. Source: nearly the reverse of a standard reef, low light + heavy feeding.
- render spec: 60 gal dark. Rock: tall dark overhang, vertical shelves. Corals: orange sun coral clusters (Tubastraea), yellow gorgonian (Diodogorgia), Swiftia, purple, a red sponge. Animals: pair of Pseudochromis, cleaner shrimp, snail.
- cost: med-high | care: very high (daily target-feeding) | pop: 1
- distinguisher: dim blue-black scene with glowing orange/yellow polyps.
- src: https://reefbuilders.com/2016/11/01/marks-simply-elegant-nps-biotope ; https://www.podyourreef.com/blogs/care/mastering-nps-corals-feeding-care-coral-species-for-non-photosynthetic-reefs ; https://forums.reefcentral.com/threads/non-photosynthetic-tank.595796

### reef-macroalgae-seagrass
- aka: macroalgae display, lagoon / seagrass tank, chaeto / halimeda / caulerpa garden, "marine planted tank", refugium-as-display
- parent: reef-coral-led | personas: P-artist, P-biotope, P-nature
- cues: GREEN. Meadow of turtle grass (Thalassia) or manatee grass on a deep sand bed, tufts of Halimeda (white-beaded), red Gracilaria, Chaeto balls; NO or few corals; warm white light; lagoon feel; fish: pipefish, seahorses, jawfish, gobies, crabs. The macro is the "carpet".
- render spec: 40 to 75 gal. Sand: 3 in. Elements: seagrass bed across the back two-thirds, a rock outcrop with Halimeda, bubble algae. Animals: dwarf seahorse pair or pipefish, gobies, hermit crabs, sand-sifting star, conch.
- cost: med | care: med-high | pop: 1-2
- distinguisher: green seagrass meadow (no coloured corals).
- src: https://gensou.sg/minimalist-reef-aquascape-marine/ (lagoon context); hobby knowledge for plants

### reef-mangrove-display
- aka: marine mangrove tank, red mangrove (Rhizophora) in sump or display, "mangrove reef"
- parent: reef-coral-led / marine-biotope | personas: P-biotope, P-nature
- cues: red mangrove propagules (green stalk with leaves) emerging above the water line, stilt roots hanging into water; often combined with a lagoon bottom; upside-down jellyfish (Cassiopea), pipefish, seahorses; some rimless tanks have the mangrove growing out of the open top.
- render spec: 40 gal rimless. Mangrove propagule top-left with a few leaves above the rim and bare roots below; sand-and-rubble floor; a few corals. Animals: Cassiopea jelly, pipefish, mangrove snails.
- cost: med | care: med | pop: 1-2
- distinguisher: living tree-like mangrove plant with leaves above water.
- src: https://atlantareefclub.org/threads/florida-mangrove-biotope-build-thread.1196874/latest

---

## 5. NODES: reef, by rock layout (second pick)

These are rendered on top of whatever coral type the user picked; each has a distinct silhouette.

### scape-rock-wall
- aka: Berlin pile, classic rock wall, back-wall reef, "Berlin method" look
- parent: reef-coral-led | personas: P-collector, P-chem, P-decor
- cues: a continuous mass of rock along the back glass, 12 to 18 in deep, forming a flat "cliff" with ledges for corals; open sand strip in front; maybe a slight cave or two; takes up most of the rear; the tank reads as "a landscape in front of a wall". Source: shows a lot of coral space but makes the tank feel small and hard to clean behind.
- render spec: 120 gal. Rock: one back-wall of rock 30 in tall, 6 in gap behind (hidden), terraced to a 10 in ledge in front. Sand: front 4 in open strip. Corals: whatever type chosen.
- cost: med | care: med | pop: 5
- distinguisher: a flat cliff of rock spanning the whole back.
- src: https://aquifarm.com/saltwater-aquarium-aquascaping-ideas-2 ; https://gensou.sg/minimalist-reef-aquascape-marine/ ; history: https://reefbuilders.com/2020/11/02/time-capsule-of-german-mini-reef-aquariums-from-1985

### scape-islands
- aka: rock islands, two-tower, negative space aquascape (NSA), bommies, "twin islands", floating islands
- parent: reef-coral-led | personas: P-artist, P-mono (swimming room), P-chem (flow)
- cues: 1 to 3 distinct rock structures standing separate on open sand, with 6 to 20 in of space between; sand visible everywhere; fish swim between; sources suggest 30 to 50 percent negative space; clean silhouettes.
- render spec: 120 gal. Rock: two towers (24 in and 18 in), one low mound, 12 in spacing. Sand: pale sand 2 in, bare patches. Corals: 5-8 pieces per island.
- cost: med | care: med-high (flow) | pop: 4
- distinguisher: separate rock islands with open sand between.
- src: https://gensou.sg/?p=41069 ; https://gensou.sg/minimalist-reef-aquascape-marine/

### scape-arches-bonded
- aka: bonded dry rock, arches, bridges, caves, "overhangs", glued rock, epoxy aquascape, "reef tunnel"
- parent: reef-coral-led | personas: P-artist, P-collector, P-mono
- cues: architectural rock: arch or bridge with a clear opening fish swim through, tunnels, cantilevered shelves, narrow pillars (sculpted look; often plain white/grey dry rock with pink coralline). More engineered than natural. Corals mounted on arch top and underside. A hallmark of modern "hero" reefs.
- render spec: 90 to 180 gal. Rock: central arch 14 in wide opening, bridge at top, side pillar. Corals: SPS on top, LPS under, softie sides.
- cost: med-high (labour) | care: med | pop: 4
- distinguisher: arch / tunnel you can see through.
- src: https://aquifarm.com/amazing-aquascapes-reef-aquascape-ideas ; https://aquifarm.com/aquascaping-marine-tank-ideas

### scape-japanese-rock-art
- aka: Japanese reef, "reef iwagumi", zen reef, karesansui reef, raked-sand reef, minimalist rock-art, "one rock, three corals"
- parent: reef-coral-led | personas: P-artist
- cues: ONE dramatic rock pillar or three-rock group, big expanse of bright white sand (sometimes raked patterns), a very small number of perfect corals, 40 to 60 percent negative space; low clutter; muted fish (one school). Sources borrow iwagumi proportions; I found no Japan-specific reef source, so treat as an adaptation of freshwater iwagumi + Singapore / Scandinavian minimalism.
- render spec: 60 gal rimless. Rock: one sharp 18 in obelisk, two small companion rocks left-low; white sand 3 in, raked ripples; Corals: 3 pieces (one torch, one blue Acro frag, one zoa dot). Animals: 5 Chromis.
- cost: med | care: high (nowhere to hide flaws) | pop: 2
- distinguisher: vast empty white sand with one sculptural rock.
- src: https://gensou.sg/minimalist-reef-aquascape-marine/ ; https://gensou.sg/aquascape-zen-garden-minimalist-guide/ ; https://aquifarm.com/saltwater-aquascape-ideas

### scape-sand-lagoon
- aka: sand-heavy lagoon, shallow reef-flat scape, scattered patch reef, rubble field, "sandy flat"
- parent: reef-coral-led / marine-biotope | personas: P-biotope, P-species
- cues: low, scattered rock patches on a broad sand bed; sand takes more than half of the floor area; rubble, a few clam or anemone on sand; open and airy; reads as shallow lagoon. Source describes low scattered rockwork to mimic a shallow reef flat.
- render spec: 75 gal long. Sand: 3 in. Rock: 4 or 5 low mounds, none above 8 in. Corals: anemone on sand, Clam on sand, hammer on rock. Animals: gobies, wrasse, jawfish.
- cost: med | care: med | pop: 3
- distinguisher: low rock patches scattered across a sand flat.
- src: https://gensou.sg/minimalist-reef-aquascape-marine/ (lagoon layout)

### scape-bare-bottom-skyline
- aka: bare-bottom, glass-bottom, no sand, "skyline" coral stacks, rack-on-rod, sculpted towers on rods, SPS platform
- parent: reef-coral-led / reef-sps | personas: P-chem, P-collector, P-fragger
- cues: NO substrate (the bottom glass or a black/white board is visible); rock replaced or supplemented by small pieces on acrylic rods or PVC or stacked on a platform; corals form a colourful "skyline" of stacks at different heights; strong flow without sand blowing; very clean, high-clarity look.
- render spec: 90 gal. Bare black bottom. Four 14 to 22 in rock stacks with Acro colonies at the top forming a skyline. Animals: schooling Chromis, yellow tang.
- cost: med-high | care: high | pop: 3
- distinguisher: visible empty bottom glass under a coloured skyline.
- src: hobby knowledge. no fetched page

### scape-shelf-terraced
- aka: terraced shelves, "cascading spire", stepped reef, ledge scape
- parent: reef-coral-led | personas: P-collector, P-decor
- cues: stacked horizontal flat shelves (like terraces) getting narrower toward the top, giving each coral a level; looks like a ziggurat or "stairs"; very easy to frag and feed.
- render spec: 90 gal. Rock: 3 levels of slabs, widest at the bottom. Corals: LPS on lowest, SPS on upper.
- cost: med | care: med | pop: 3
- distinguisher: stepped, tiered shelves.
- src: https://fast-aquatics.pages.dev/glossary/aquascape/ (names minimalist island, terraced shelf, cascading spire)

### scape-frag-rack
- aka: frag tank, frag rack, frag grid, egg-crate rack, "coral farm", frag plugs, rack of frags, frag-seller tank
- parent: reef-coral-led | personas: P-fragger, P-collector
- cues: utilitarian GRID of identical ceramic plugs / frag discs on an egg-crate or on rows of rack pegs; a shallow tray; coloured sets in labelled rows; almost no rock; looks like a "coral nursery". Often seen in retail and breeder shops and as a second tank.
- render spec: 40 gal breeder or 60x24x10 shallow. Egg-crate rack at 8 in under water with 40 frag plugs, 5 rows by 8; bare bottom; small light bar. Animals: a few snails.
- cost: med | care: med | pop: 2-3 (huge among hobby frag-sellers)
- distinguisher: orderly rows of identical little frag plugs.
- src: hobby knowledge. no fetched page

---

## 6. NODES: reef, light colour

### light-actinic-blue
- aka: blue-light reef, actinic look, "blue reef", 20,000 K, "UV glow", fluorescent look
- parent: reef-coral-led | personas: P-collector, P-chem, P-fragger
- cues: whole tank washed in royal blue with FLUORESCENT corals glowing green, orange, pink; shadows near-black; fish appear icy; dramatic, "night-club" tone; the look that sells corals in photos.
- render spec: same tank; swap light to blue (440 to 460 nm) with 20 percent white.
- cost: n/a | care: n/a | pop: 4
- distinguisher: electric blue wash with glowing corals.
- src: https://www.bulkreefsupply.com/content/post/md-2016-04-how-to-set-up-an-orbit-20-jellyfish-aquarium-and-care-for-moon-jellies (blue-light mood; hobby knowledge for reef context)

### light-daylight-white
- aka: natural-light look, 10,000 K to 14,000 K, daylight white, "true colour", viewing mode
- parent: reef-coral-led | personas: P-artist, P-biotope, P-nemo
- cues: whiter, warmer light where coral appear in "true" colours: browns, tans, greens, pinks; natural shadows; more like a real daytime reef; less fluorescence; looks more like a real-world "ocean".
- render spec: same tank; neutral daylight 12,000 K.
- cost: n/a | care: n/a | pop: 4
- distinguisher: natural colour (brown/green coral) vs fluorescent glow.
- src: hobby knowledge. no fetched page

---

## 7. NODES: reef, format

### fmt-nano-aio
- aka: nano reef, all-in-one (AIO), cube, 10 to 40 gal, desktop reef
- parent: reef-coral-led | personas: P-nemo, P-artist, P-collector
- cues: compact, often with a rear chamber (hidden filtration compartment behind a black or smoked glass panel), rimless or lidded with a clip light; rock a single small mound; 1 to 3 fish max; desk/shelf environment.
- render spec: 20 gal cube (16 in), rear chamber visible as black strip, 8 corals, 2 clownfish.
- cost: low-med | care: med | pop: 5
- distinguisher: small cube with a visible rear filtration chamber.
- src: https://www.narcosis-the-game.com/best-nano-reef-tanks/ (low quality retail roundup; use only for product category) ; https://reefbuilders.com/tag/nano-reef

### fmt-pico-bowl
- aka: pico reef, 5 gal or less, bowls, reef cylinder, mini jar, desktop reef bowl, "Fluval Evo mini"
- parent: reef-coral-led | personas: P-artist, P-nemo
- cues: tiny (under 5 gal, sometimes 0.5 gal), rock a single fist-size piece, 3 to 5 tiny corals (zoas, mushrooms), shrimp or one goby; may be round; lit by small LED.
- render spec: 3 gal cylinder, 1 rock, 4 zoas, 1 goby.
- cost: low | care: med-high (stability is hard in tiny volumes) | pop: 3
- distinguisher: tiny round or square vessel with a single rock.
- src: https://reefbuilders.com/tag/pico-reef/page/2/ ; https://reefbuilders.com/2019/05/01/how-to-pico-reef-with-bobby-melton-of-worldwide-corals-video

### fmt-sump-display
- aka: sump-based display, overflow box tank, 75 to 180 gal standard, "drilled tank", hidden sump
- parent: reef-coral-led | personas: P-chem, P-collector
- cues: standard rectangular tank, black-painted back, overflow box in a corner or hidden in a weir, tidy cabinet below; rock structure is the show; no visible equipment inside tank.
- render spec: 120 gal 4 ft, corner overflow, rock wall plus island.
- cost: med-high | care: med-high | pop: 5
- distinguisher: overflow weir in the back corner.
- src: hobby knowledge. no fetched page

### fmt-peninsula-divider
- aka: peninsula, room divider, three-sided view, island tank
- parent: reef-coral-led | personas: P-artist, P-mono
- cues: tank sticks out from the wall with glass on 3 sides, rockwork central and visible from all sides, no black backing; fish on all sides; the aquascape must be 3D.
- render spec: 150 gal; rock island in the centre rising 22 in; front, left, right glass.
- cost: high | care: high | pop: 2
- distinguisher: glass on 3 sides, rock in the middle of the room.
- src: hobby knowledge. no fetched page

### fmt-shallow-reef-pond
- aka: shallow reef, frag tank, "reef pond", low-profile, top-down viewing, "shallow iwagumi SPS"
- parent: reef-coral-led / reef-sps | personas: P-artist, P-fragger, P-collector
- cues: very wide and LOW (e.g. 48 to 72 in long, 12 to 18 in deep); viewed from above like a pond; corals grow in sheets across the top; high light intensity; sand or rock, few tall pieces.
- render spec: 72 x 24 x 14 in; low rock plateau, Acro and Monti spread across.
- cost: med-high | care: high | pop: 2
- distinguisher: very low and wide; viewed from the top.
- src: https://www.nano-reef.com/forums/topic/366969-mikeymikemikes-shallow-reef-iwagumi-sps-edition-updated-july/page/19/

### fmt-mega-display
- aka: large reef, 300 to 1000+ gal, "public aquarium look", built-in wall reef, in-wall
- parent: reef-coral-led | personas: P-collector, P-mono, P-chem
- cues: tank 8 to 12 ft long, huge rock structures with swim-through arches, many larger fish (tang schools, large angels), deep colour, visible big gear room.
- render spec: 500 gal 10 x 3 x 2.5 ft; two 40-in arches; schooling tangs.
- cost: very high | care: high | pop: 2
- distinguisher: scale: person-high glass with schooling fish.
- src: hobby knowledge. no fetched page

---

## 8. NODES: marine species specialists

### sp-seahorse-pipefish
- aka: seahorse tank, pipefish, dwarf seahorse (Hippocampus zosterae), SH tank
- parent: marine-species | personas: P-species
- cues: TALL tank (18 in+ high) over wide; gentle flow; many HITCHING POSTS at multiple heights (gorgonians, macroalgae, PVC, sponge, branching dead coral); sparse rock; calm; seahorses wrapped tails on the posts; light white-blue dim; sand light. Source: hitching posts are the "single most important element"; corals are risky (seahorses damage them).
- render spec: 40 gal tall. Elements: 5 hitching posts: purple gorgonian left, Gracilaria clump centre, branching skeleton right, a net-shaped sponge. Animals: 2 seahorses, 2 pipefish, shrimp.
- cost: med | care: high | pop: 2
- distinguisher: seahorses holding on to tall branching posts.
- src: https://gensou.sg/?p=31749 ; https://gensou.sg/?p=22472 ; https://www.ratemyfishtank.com/blog/the-secret-to-keeping-seahorses

### sp-mandarin-pod-reef
- aka: mandarin dragonet tank, pod tank, spotted mandarin, scooter blenny, "mature reef"
- parent: marine-species | personas: P-species, P-collector
- cues: very mature, older-looking rock covered in algae and coralline (more "lived-in"), lots of small crevices; dim; mandarins wandering over rock; refugium; often a 30 to 90 gal; minimal fish; the "mature" brown-green look.
- render spec: 50 gal. Rock: porous live rock stack with branches. Animals: one mandarin pair, a green Chromis, shrimp, small snails.
- cost: med | care: high | pop: 3
- distinguisher: electric-blue and orange mandarin on mature, pitted rock.
- src: hobby knowledge. no fetched page

### sp-jawfish-sand
- aka: jawfish tank, yellowhead / pearly jawfish, rubble burrow, sand and rubble tank
- parent: marine-species | personas: P-species, P-biotope
- cues: DEEP sand and coarse rubble mounds with visible burrows (round holes ringed with shells and pebbles); jawfish hovering vertically at a burrow mouth; low rock; calm flow; clear and neat.
- render spec: 40 gal; 4 in sand and rubble; 2 burrows with stacked shell rings; one jawfish upright.
- cost: low-med | care: med | pop: 2
- distinguisher: fish poking head out of a rubble burrow.
- src: hobby knowledge. no fetched page

### sp-garden-eel-deep-sand
- aka: garden eel colony, Heteroconger, sand-dwelling eels
- parent: marine-species | personas: P-species, P-biotope
- cues: DEEP (6 to 8 in) sand bed spanning the whole floor; a colony of upright eels swaying like grass; very little rock; sand slopes; lower light; quiet tank-mates only.
- render spec: 75 gal; 7 in sand; 8 spotted garden eels in a drift; a single small rock.
- cost: med-high (eels pricey) | care: high | pop: 1
- distinguisher: a lawn of upright eels in a sand field.
- src: hobby knowledge. no fetched page

### sp-cephalopod
- aka: octopus tank, cuttlefish tank, mimic octopus, dwarf octopus, "octo tank"
- parent: marine-species | personas: P-species, P-mono
- cues: tightly sealed lid (escape), lots of caves and shells, no coral, no small fish, dim; sand; a single octopus arm or cuttlefish above sand with changing skin colour.
- render spec: 55 gal; flat-top rock with caves; cuttlefish hovering above sand; sealed lid.
- cost: med | care: high (short life, specialist) | pop: 1
- distinguisher: a cuttlefish or octopus with textured, colour-shifting skin.
- src: hobby knowledge. no fetched page

### sp-jellyfish-kreisel
- aka: jellyfish tank, moon jelly, kreisel, Orbit 20, cylindrical, Jellyfish Art, "jelly cylinder"
- parent: marine-species | personas: P-species, P-decor
- cues: ROUND or D-shaped tank with circular flow (no corners), NO rock or decor, translucent bell-shaped jellies drifting; background lit with a colour-changing LED, usually deep blue, so bells glow. Source: jellies themselves don't need light; the LED is accent. Only jellies in the tank.
- render spec: 20 gal cylinder, blue back-light; 5 moon jellies; empty.
- cost: med | care: med-high | pop: 2
- distinguisher: empty round tank with glowing jellies.
- src: https://www.bulkreefsupply.com/content/post/md-2016-04-how-to-set-up-an-orbit-20-jellyfish-aquarium-and-care-for-moon-jellies ; https://www.chewy.com/education/fish/general/moon-jellyfish-care-guide ; https://reefbuilders.com/2018/02/27/jelly-cylinder-5-by-jellyfish-art

### sp-shrimp-goby
- aka: shrimp-goby pair, pistol shrimp and watchman goby, Randall's, "symbiotic pair"
- parent: marine-species | personas: P-species, P-nemo
- cues: sand-and-rubble bottom with burrows; a goby stands guard over a hole and a shrimp clears the sand; low rock with shelves; small, calm.
- render spec: 20 gal; 3 in sand; rubble mound; yellow watchman goby and tiger pistol shrimp.
- cost: low-med | care: low-med | pop: 3
- distinguisher: a tiny pair at a burrow with sand kicked out.
- src: hobby knowledge. no fetched page

### sp-banggai-cardinal
- aka: Banggai cardinalfish tank, "Banggai", cardinal schooling fish, small peaceful
- parent: marine-species | personas: P-nemo, P-species
- cues: a school of Banggai (silver with black bars and white spots) hovering above a sea-urchin, anemone or branching rock; slow, calm tank; light daytime white; sparse.
- render spec: 30 gal; branching rock with 6 Banggai at the top; corals few.
- cost: low-med | care: low-med | pop: 2
- distinguisher: silver-white fish with long, banner-like fins hovering near rock.
- src: hobby knowledge. no fetched page

### sp-anthias-shoal
- aka: anthias tank, lyretail anthias, Bartlett anthias, planktivore shoal, "shoaling reef"
- parent: marine-species | personas: P-collector, P-mono
- cues: 10 to 30 anthias in orange, purple, magenta in a pulsing cloud in front of an island; frequent feeding; high-volume; deep tank; bright blue.
- render spec: 150 gal; sparse island left; 12 lyretail anthias. Corals SPS.
- cost: high | care: high | pop: 2
- distinguisher: a dense orange-pink cloud of tiny fish.
- src: hobby knowledge. no fetched page

### sp-shark-ray
- aka: bamboo shark tank, epaulette shark, stingray tank, elasmobranch, "mini shark tank"
- parent: marine-species | personas: P-mono
- cues: very large and long (6 ft+, 300+ gal), wide-open sand floor, sparse low rock, sleek sharks gliding; no corals; clear water.
- render spec: 300 gal 8 ft; wide sand; a few low rocks; 2 bamboo sharks.
- cost: very high | care: very high | pop: 1
- distinguisher: a shark or ray gliding over open sand.
- src: hobby knowledge. no fetched page

### sp-cold-temperate
- aka: cold-water marine, temperate marine, Pacific Northwest tank, "kelp tank", chiller tank, PNW anemones, California tide pool
- parent: marine-species | personas: P-species, P-biotope, P-nature
- cues: NO tropical colours: red, orange, pink and white anemones, sea stars, kelp or red algae, sculpins and gunnels, coralline-covered grey/brown rock, cooler (50 to 65 F, some hobbyists up to 75 F), often a chiller visible; looks like a Pacific tide pool.
- render spec: 40 to 75 gal; rock arch in the centre; plumose anemone (white), strawberry anemone, 2 sea stars, kelp frond; sculpin fish; chiller line.
- cost: med-high (chiller) | care: high | pop: 1
- distinguisher: orange, pink, white anemones and kelp, no tropical coral.
- src: https://forums.reefcentral.com/threads/cold-temperate-water-reef.240156/page-2 ; https://wetwebmedia.com/coldanemfaqs.htm

### sp-breeding-rack
- aka: clownfish breeding rack, fry rack, hatchery, "tupperware tanks", aquaculture, "bare tub"
- parent: marine-species | personas: P-fragger, P-species
- cues: utilitarian shelves of identical bare tubs or tanks, each with a pair of clownfish and a flower pot or tile; no rock, no coral; plumbing.
- render spec: 5 shelves of 10 gal tubs; each with pair of orange clowns and a terra-cotta pot.
- cost: med | care: med | pop: 1
- distinguisher: rows of identical plain tanks.
- src: hobby knowledge. no fetched page

---

## 9. NODES: marine biotopes

For the picker, biotopes are best shown as one tile "a real reef zone, accurately" and then the sub-tile pictures differ by LIGHT + rock + sea life. Source for biotope-as-a-hobby-category: https://reefbuilders.com/2016/11/01/marks-simply-elegant-nps-biotope

### bio-red-sea
- aka: Red Sea biotope, Red Sea reef
- parent: marine-biotope | personas: P-biotope, P-collector
- cues: tall Acropora tables and staghorns, Stylophora, Goniopora; yellow-blue-purple palette; Red Sea sailfin tang, Red Sea Anemonefish (Amphiprion bicinctus), Red Sea Anthias, Red Sea Bannerfish; sand and rubble sections.
- render spec: 150 gal; table Acropora, Stylo, Goniopora; bicinctus pair; sailfin tang.
- cost: high | care: high | pop: 2
- distinguisher: Red Sea bannerfish + table Acro with clean white sand.
- src: hobby knowledge. no fetched page

### bio-indo-pacific-reef-flat
- aka: Indo-Pacific reef flat, shallow lagoon, back-reef, Fiji / Great Barrier Reef style, "reef flat"
- parent: marine-biotope | personas: P-biotope, P-nature
- cues: shallow, low branching corals (Acropora, Pocillopora), blue-green Chromis clouds, giant clams, bubble anemones on the sand, sandy lagoon floor with scattered coral heads.
- render spec: 120 gal; low-profile; 8 coral heads; Giant clam; Chromis shoal.
- cost: high | care: high | pop: 2
- distinguisher: scattered coral heads on pale sand with blue-green Chromis.
- src: https://gensou.sg/minimalist-reef-aquascape-marine/ (lagoon scape) ; hobby knowledge

### bio-caribbean
- aka: Caribbean reef, Atlantic reef, Florida Keys, gorgonian reef, sea fans, sponges
- parent: marine-biotope | personas: P-biotope, P-species
- cues: WAVY purple sea fans, sea rods, finger sponges in orange / purple / brown, brown knobby corals (Montastraea, Siderastrea), no neon Acropora; Atlantic fish: Queen angel, French angel, blue-chromis, royal gramma, rock beauty, Spanish hogfish.
- render spec: 125 gal; sea fans left; orange sponge; brain coral; fish: Blue Chromis, Queen angel, gramma.
- cost: high | care: very high (sponges, gorgonians) | pop: 1-2
- distinguisher: purple sea fans and tube sponges.
- src: https://atlantareefclub.org/threads/florida-mangrove-biotope-build-thread.1196874/latest (Florida mangrove biotope) ; hobby knowledge

### bio-hawaiian
- aka: Hawaiian biotope, Hawaii tank, Hawaii endemics, "Kona", endemic fish
- parent: marine-biotope | personas: P-biotope
- cues: lava-black rock, Montipora and Pocillopora cauliflower corals, endemics: Hawaiian cleaner wrasse, Potter's angel, Fisher's angel, Hawaiian yellow tang, Achilles tang, Lemonpeel; dark/brown colour with orange and yellow fish.
- render spec: 100 gal; black rock; yellow tang, Potter's angel; pocillopora.
- cost: very high (fish prices) | care: high | pop: 1
- distinguisher: black lava rock with orange-yellow fish.
- src: hobby knowledge. no fetched page

### bio-reef-crest
- aka: reef crest, surge zone, wave-exposed reef, high-energy reef
- parent: marine-biotope | personas: P-biotope, P-chem
- cues: heavy surge, flat tabling Acropora (like plates), encrusting coralline, blurred fast fish; tank has a surge device; rock robust.
- render spec: 90 gal; rock bar and table Acro; wave maker; Blue tang.
- cost: high | care: high | pop: 1
- distinguisher: flat coral tables with visible surge.
- src: hobby knowledge. no fetched page

### bio-mangrove-root
- aka: mangrove root biotope, marine mangrove (see reef-mangrove-display)
- parent: marine-biotope | personas: P-biotope, P-nature
- cues: see reef-mangrove-display. Tied here as a biotope with mud-brown water, sand, root tangle and upside-down jellies, juvenile fish nursery.
- render spec: 40 gal; mangrove roots dangling; jellies.
- src: https://atlantareefclub.org/threads/florida-mangrove-biotope-build-thread.1196874/latest

### bio-seagrass-bed
- aka: seagrass meadow biotope, turtle grass, shoal-grass bed
- parent: marine-biotope | personas: P-biotope, P-nature
- cues: see reef-macroalgae-seagrass; a green carpet; sand; seahorses, pipefish, queen conch.
- render spec: 75 gal; blade grass; conch; pipefish.
- src: https://gensou.sg/minimalist-reef-aquascape-marine/ (lagoon) ; hobby knowledge

### bio-deep-cryptic
- aka: deep reef, mesophotic, cryptic zone, dimly lit biotope
- parent: marine-biotope | personas: P-biotope, P-species
- cues: dim blue-purple, orange / red tubastrea, sponges, gorgonians, deepwater anthias, flame angels; vertical overhangs.
- render spec: 90 gal; vertical wall; Flame angel; sun coral.
- src: https://reefbuilders.com/2016/11/01/marks-simply-elegant-nps-biotope

### bio-tide-pool
- aka: rocky intertidal, tide pool, wave-pool biotope
- parent: marine-biotope / sp-cold-temperate | personas: P-biotope, P-nature
- cues: dark wet rock, barnacles, mussels, anemones, urchins, crabs, shallow; may be a short open-top bowl; cool.
- render spec: 20 gal open-top; barnacle rock; anemone; hermit crab.
- src: https://forums.reefcentral.com/threads/cold-temperate-water-reef.240156/page-10

---

## 10. NODES: brackish

General: salinity about 1.003 to 1.015 specific gravity (figure 8 puffers about 1.005 to 1.008 per the sources); mangrove is one of the few plants tolerating freshwater-to-brackish; dense live planting is hard. Most brackish tanks look like freshwater tanks with driftwood, rocks and sand; pictures differ by ANIMAL and MANGROVE.
Family sources: https://www.ratemyfishtank.com/blog/brackish-aquariums-for-beginners-reliable-setups-stocking-and-salinity-tips ; https://aquifarm.com/aquarium-brackish-water/ ; https://forum.aquariumcoop.com/topic/36532-about-setting-up-a-brackish-tank

### brk-puffer
- aka: figure 8 puffer, green spotted puffer (GSP), "puffer tank", Tetraodon biocellatus / nigroviridis
- parent: brackish | personas: P-mono, P-species, P-nature
- cues: a round, chubby puffer in the centre of an open, warm-lit tank; sand, driftwood and a few rocks; tough plants (Java fern, anubias, mangrove); snails / shells for the beak; usually no other fish; "cute grumpy face".
- render spec: 30 to 40 gal long. Sand 2 in, 2 pieces driftwood, 3 river rocks, Java fern, 1 mangrove propagule. Animals: one figure 8 puffer, ramshorn snails.
- cost: med | care: med-high (messy, aggression) | pop: 3
- distinguisher: a single pudgy puffer with large eyes against bare sand.
- src: https://gensou.sg/figure-eight-puffer-care-guide/ ; https://www.fishkeepingworld.com/figure-8-puffer ; https://forum.aquariumcoop.com/topic/15146-what-puffer-to-buy/

### brk-archerfish-mangrove
- aka: archerfish tank, Toxotes, spitting fish, surface-hunter mangrove tank
- parent: brackish | personas: P-species, P-nature
- cues: water line low with a big air gap and a lid; mangrove roots hang at the surface; silver-and-black-banded archerfish look up at insects on branches; mid-brown water, bright top light.
- render spec: 60 gal with 6 in air gap below the lid; surface branches / mangrove top; driftwood; 3 archerfish; 2 mollies as dithers.
- cost: med | care: med | pop: 2
- distinguisher: banded silver fish at the surface under hanging roots.
- src: https://aquaticsunlimited.com/?p=10891 (retailer caption: archerfish, puffer, mangrove roots) ; hobby knowledge

### brk-molly-community
- aka: molly tank, sailfin molly, guppy / platy / endler brackish, beginner brackish, salt-tolerant livebearers
- parent: brackish | personas: P-decor
- cues: colourful livebearers (black, white, dalmatian, sailfin) with a fine planted look (Java fern, Vallisneria, hornwort), driftwood; reads as a bright community tank, only slightly different (white sand).
- render spec: 30 gal; mollies and bumblebee goby; Vallisneria; driftwood.
- cost: low | care: low | pop: 3
- distinguisher: looks like a freshwater community tank but with sailfin mollies and white sand.
- src: https://forum.aquariumcoop.com/topic/8638-36-gallon-planted-brackish-community/ ; https://www.ratemyfishtank.com/blog/brackish-aquariums-for-beginners-reliable-setups-stocking-and-salinity-tips

### brk-goby-community
- aka: bumblebee goby, brackish goby tank, knight goby, estuary gobies
- parent: brackish | personas: P-species, P-nature
- cues: small tank with lots of caves and ceramic pots; tiny yellow-black-banded bumblebee gobies perched on rocks; sand; a few plants; calm.
- render spec: 20 gal; cave stack; 6 bumblebee gobies; shell shards.
- cost: low | care: low-med | pop: 2
- distinguisher: yellow-and-black striped tiny gobies on rocks.
- src: https://www.tankflare.com/blogs/brackish-water-aquariums

### brk-mono-scat-shoal
- aka: monodactylus (mono), scat (Scatophagus), Argus, disc shoal, big-fish brackish
- parent: brackish | personas: P-decor, P-mono
- cues: a school of tall silver discs (monos) or spotted green-gold discs (scats) in large, open water; minimal decor (sand, a few roots); 75 to 125 gal; fish move to brackish as they grow.
- render spec: 90 gal; open water; 4 monos and 3 scats; 2 mangrove roots.
- cost: med | care: med | pop: 2
- distinguisher: tall, disc-shaped schooling fish in open water.
- src: https://www.ratemyfishtank.com/blog/brackish-aquariums-for-beginners-reliable-setups-stocking-and-salinity-tips

### brk-mangrove-riparium
- aka: mangrove brackish riparium, brackish paludarium, mangrove swamp, propagule tank, estuarine planted
- parent: brackish | personas: P-nature, P-biotope
- cues: mangrove saplings with roots in brackish water and leaves above; mud-sand floor; roots form the aquascape; waterline shows both above and below; hanging roots; crabs.
- render spec: 40 gal; 3 propagules through the open top; fiddler crab, mollies, shrimp.
- cost: med | care: med | pop: 2
- distinguisher: mangrove leaves above the tank rim with roots below.
- src: https://atlantareefclub.org/threads/florida-mangrove-biotope-build-thread.1196874/latest ; https://forum.aquariumcoop.com/topic/36532-about-setting-up-a-brackish-tank

### brk-mudskipper-shore
- aka: mudskipper tank, shoreline paludarium, fiddler crab, mud flat, land and water
- parent: brackish (shares picture with land-paludarium) | personas: P-species, P-nature
- cues: roughly half land (damp mud-sand slope or cork), half shallow brackish water; mudskippers perched on land with raised dorsal fins; fiddler crabs; heat lamp and humidity; the key is the BEACH and a roof.
- render spec: 40 gal long with a 4-in-deep water zone and a mud-sand beach, cork bark island, a mangrove, 3 mudskippers.
- cost: med | care: med-high | pop: 2
- distinguisher: a fish standing on land.
- src: hobby knowledge (my searches found no dedicated mudskipper page)

---

## 11. NODES: odd non-fish aquatic

All "hobby knowledge, no fetched page".

### odd-axolotl
- aka: axolotl tank, cool-water amphibian, Mexican walking fish, newt tank (fire belly, paddle-tail)
- parent: odd-aquatic | personas: P-species, P-herp
- cues: a pink or leucistic axolotl with feathery gills on sand or smooth gravel, hides (cave, pipe), floating or low-light plants; cool 60 to 68 F; low flow; no fish.
- render spec: 20 gal long; fine sand; 2 caves; anubias; one pink axolotl.
- cost: low-med | care: med | pop: 3
- distinguisher: feathery external gills on a smiling pink salamander.

### odd-aquatic-turtle
- aka: turtle tank, red-eared slider, musk and mud turtle, basking dock
- parent: odd-aquatic | personas: P-herp
- cues: large water area, an above-water BASKING platform and heat lamp, canister filter, sometimes plastic plants; sparse; a utilitarian look.
- render spec: 75 gal; floating dock; heat and UVB lamp; river rocks; 1 painted turtle.
- cost: med | care: med-high (messy) | pop: 3
- distinguisher: dock above the water with a turtle basking.

### odd-crayfish-lobster
- aka: crayfish tank, dwarf crayfish (CPO), blue lobster, Cherax, freshwater lobster
- parent: odd-aquatic | personas: P-species, P-decor
- cues: sand-and-rock tank with many shelters; a bright blue or orange crayfish prominently displayed; usually only the crayfish.
- render spec: 20 gal; rock caves; 1 blue crayfish; anacharis.
- cost: low | care: low-med | pop: 2
- distinguisher: single colourful crayfish with claws raised.

### odd-aquatic-frog
- aka: African dwarf frog, pacman frog, Xenopus, tadpole tank
- parent: odd-aquatic | personas: P-herp
- cues: shallow or low water level, soft substrate, plants and floating leaves, frogs floating at the top; sometimes a land patch.
- render spec: 10 gal; sand; Java moss; 3 ADFs.
- cost: low | care: low | pop: 2
- distinguisher: small frogs hanging at the water surface.

### odd-closed-ecosphere
- aka: jar ecosystem, marimo bowl, bottle garden, closed terrarium, EcoSphere, mini aquarium jar
- parent: odd-aquatic / land | personas: P-decor, P-artist
- cues: small glass jar, moss balls (marimo) or sealed plants and a snail; no equipment; a "desk decor" look.
- render spec: 1 gal bowl; 2 marimo; 2 neocaridina.
- cost: low | care: low | pop: 3
- distinguisher: sealed jar without filter or fish.

---

## 12. NODES: land / terrarium (separate subtree: 3 levels = humid / arid / cover-and-burrow, then species, then layout)

Family sources: https://en.wikipedia.org/wiki/Vivarium ; https://bantam.earth/vivariums/ ; https://www.thebiodude.com/blogs/how-to-setup-a-bioactive-vivarium-terrarium-or-paludarium?page=3 ; https://www.reptilecentre.com/blogs/reptile-blog/vivarium-vs-terrarium-key-differences
Facts from searches: dart frog vivariums run 80 percent+ humidity, heavy planting, cleanup crew, glass fronts; desert setups 20 to 40 percent humidity, sand-based or arid mix, hard to keep bioactively; a paludarium has aerial space above and water below; a riparium has land beside water.

### land-dartfrog-rainforest
- aka: dart frog vivarium, rainforest bioactive, poison dart, tropical jungle, epiphyte wall, cork background
- parent: land-humid | personas: P-herp, P-nature, P-artist
- cues: lush GREEN, layered: tree-fern, bromeliads, pothos, creeping fig, orchids; cork-bark or foam background with moss; leaf litter; tall front-opening glass (18x18x24 in or larger), misting droplets; tiny jewel-coloured frogs (blue, yellow, black) perched on a leaf; springtails and isopods in the litter.
- render spec: 18x18x24 in front-opening. Cork background left, a central log with bromeliads, 2 vines, moss hill; leaf litter; small water dish. Plants: pothos, bromeliad, creeping fig, peperomia. Animals: 3 blue dart frogs.
- cost: med-high | care: med | pop: 4
- distinguisher: a tiny bright frog on dense jungle foliage.
- src: https://bantam.earth/vivariums/ ; https://www.thebiodude.com/blogs/how-to-setup-a-bioactive-vivarium-terrarium-or-paludarium?page=3

### land-crested-gecko-arboreal
- aka: crested gecko, gargoyle gecko, arboreal vivarium, "cresty", tall tropical, vine tank
- parent: land-humid | personas: P-herp
- cues: TALL (18x18x24 in or more), many branches and vines at height, hanging cork flats, live or fake pothos, coir floor; moderate humidity; a gecko clinging to a vertical surface.
- render spec: 18x18x24; cork backing; 3 branches; 2 high hides; pothos; one crested gecko.
- cost: low-med | care: low-med | pop: 4
- distinguisher: vertical, many branches, gecko on a leaf.
- src: hobby knowledge; family framing at https://bantam.earth/vivariums/

### land-chameleon-screen
- aka: chameleon cage, veiled chameleon, panther chameleon, screen enclosure
- parent: land-humid | personas: P-herp
- cues: tall mesh (screen) cage rather than glass; lots of live foliage (ficus, hibiscus, pothos), sun lamp up high, mister; a chameleon on a branch; looks like a leafy tower.
- render spec: 2x2x4 ft mesh; ficus; vines; veiled chameleon.
- cost: med | care: high | pop: 2
- distinguisher: mesh cage full of branches with a chameleon.
- src: hobby knowledge

### land-paludarium
- aka: paludarium, half-land half-water, riparium, waterfall paludarium, newts, fire-bellied toads
- parent: land-humid | personas: P-nature, P-artist, P-herp
- cues: a water zone (bottom third) AND a landscape (top two thirds) with a rock cliff or driftwood; moss, ferns; waterfall; small fish in the water; amphibians; mist; both aquatic and land plants.
- render spec: 36x18x24 in; water 6 in with a rock wall rising on the left; waterfall; moss; ferns; fire-bellied newts and white cloud fish.
- cost: med-high | care: med-high | pop: 3
- distinguisher: water and a land cliff in the same box.
- src: https://en.wikipedia.org/wiki/Vivarium ; https://aquifarm.com/which-animals-live-in-terrarium

### land-isopod-bioactive
- aka: isopod tub, isopod and springtail culture, bug bin, dairy cow isopod, powder blue isopod, bioactive condo
- parent: land-humid | personas: P-herp, P-decor
- cues: shallow plastic or glass tub, leaf litter, cork, moss, springtails, white and blue isopods; a miniature forest floor; often multiple tubs on racks.
- render spec: 10 gal; leaf litter and cork; moss; 12 Dairy Cow isopods.
- cost: low | care: low | pop: 2
- distinguisher: no vertebrate, only the forest floor and small bugs.
- src: https://exuvium.net/enclosure-escape-proof-with-ultra-fine-mesh-m3-7-5-liter-w-4-openings/ ; hobby knowledge

### land-hermit-crab
- aka: crabitat, land hermit crab, Coenobita
- parent: land-humid | personas: P-herp, P-decor
- cues: deep sand-coconut-fibre substrate for digging, two dishes (fresh and salt), climbing branches or rope, many spare shells, humidity gauge and heat.
- render spec: 20 gal; 6 in sand-coir; two dishes; driftwood; 4 crabs in painted shells.
- cost: low | care: med | pop: 3
- distinguisher: shells everywhere and a salt-water dish.
- src: https://crabstreetjournal.org/blog/faq-pets-can-live-hermit-crabs/

### land-leopard-gecko-desert
- aka: leopard gecko enclosure, arid terrarium, desert vivarium, rock and slate, dry bioactive
- parent: land-arid | personas: P-herp
- cues: warm tan sand and clay, flat rocks or slate, a rock hide with a moist cave, dry-adapted plants (aloe, haworthia), a basking heat spot; muted tan-orange; a gecko on flat rock.
- render spec: 40 gal breeder 36x18; sand-clay mix; two rock hides; 1 aloe; leopard gecko.
- cost: low-med | care: low | pop: 5
- distinguisher: tan sand with rock hides and a heat lamp.
- src: https://bantam.earth/vivariums/ ; https://www.reptilecentre.com/blogs/reptile-blog/vivarium-vs-terrarium-key-differences

### land-bearded-dragon
- aka: bearded dragon, desert lizard, basking branch, beardie
- parent: land-arid | personas: P-herp
- cues: big (4x2x2 ft), bright basking lamp with UVB, flat slate, tall basking rock or branch, sand-soil mix, non-toxic desert plants, the dragon near the light.
- render spec: 4x2x2 ft; slate basking pile, branch, hide, tiles; beardie.
- cost: med | care: med | pop: 5
- distinguisher: spiky-bearded lizard on a basking rock under a bright lamp.
- src: hobby knowledge

### land-tortoise-table
- aka: tortoise table, Russian / Hermann's tortoise, open-top tortoise enclosure, outdoor pen
- parent: land-arid | personas: P-herp
- cues: wide, shallow, open-top "table" (4x2 ft or larger), coconut-soil mix with a slope, slate, edible plants (dandelion) and a humid hide; UVB lamp; the tortoise grazing.
- render spec: 4x2 table; substrate 4 in; hide; slate dish; dandelions; tortoise.
- cost: med | care: med (long-lived) | pop: 3
- distinguisher: wide open-top table with a tortoise and edible greens.
- src: hobby knowledge

### land-ball-python
- aka: ball python, snake enclosure, royal python, hide-and-heat snake setup
- parent: land-cover-burrow | personas: P-herp
- cues: low, wide cage; two hides (warm and cool), a water bowl, a cork branch, sparse faux plants; heat mat or lamp; clean, minimal; a coiled snake in a hide (or a bioactive version with deeper substrate and plants).
- render spec: 4x2x2 ft; cork hide, water bowl, branch, 3 fake vines; snake in hide.
- cost: med | care: low-med | pop: 4
- distinguisher: coiled patterned snake near hide and water bowl.
- src: https://ball-pythons.net/forums/showthread.php?p=2676983

### land-jumping-spider
- aka: jumping spider enclosure, jumper, Phidippus, Salticidae, mini terrarium
- parent: land-cover-burrow | personas: P-herp
- cues: small, vertical, bright, with climbing room; small plastic or acrylic cube; twigs and a silk-web hide; a tiny colourful spider on a leaf.
- render spec: 8x8x12 in cube; cork twig; leaf; silk nest; one jumper.
- cost: low | care: low | pop: 4
- distinguisher: tiny cube and a big-eyed spider.
- src: https://arachnoboards.com/threads/exo-terra-for-jumpers.347898

### land-burrower-tarantula-scorpion
- aka: tarantula enclosure, burrowing tarantula, emperor scorpion, desert scorpion, deep substrate, "T tank"
- parent: land-cover-burrow | personas: P-herp
- cues: DEEP substrate (6+ in) with a visible burrow; cork bark hide; a water dish; sparse plants; arboreal species get tall setups with cork tubes; the animal is often hidden or at the burrow mouth.
- render spec: 12x12x12 in; 6 in coir; half-round cork; Chilean rose tarantula at the mouth of a burrow.
- cost: low | care: low | pop: 3
- distinguisher: a hairy spider at the mouth of a visible burrow.
- src: https://www.thebiodude.com/collections/mini-terrariums-and-speciality-vivariums/terrarium

---

## 13. MERGE ADVICE (picker tiles that look too alike)

1. fowlr-aggressive-mixed + fowlr-predator -> one tile "big or aggressive fish". The difference is WHICH fish; a picture cannot show it.
2. fish-only-oldschool vs nemo-clownfish-first-salt vs fowlr-peaceful-community: distinct only by decor (bone-white skeletons vs anemone vs plain rock). Keep OLD-SCHOOL as its own tile (very recognizable); fold Nemo and peaceful FOWLR into one "classic fish tank, fish are the stars".
3. reef-softie-garden, reef-zoa-garden, reef-mushroom-garden: three pictures of a "carpet-like rock". Merge into ONE "soft and easy corals" tile; expose zoa / mushroom only as a sub-choice.
4. reef-sps vs reef-sps-pastel-ulns: pastel shows only in colour palette. Merge in the tree, expose as a "colour mood" toggle.
5. reef-lps vs reef-mixed: keep both; LPS has a distinct "fat fleshy domes" look, mixed shows variety.
6. scape-islands vs scape-japanese-rock-art vs scape-sand-lagoon: all "open sand + few rocks". Keep ISLANDS, keep JAPANESE-ROCK-ART as an extreme variant (one pillar), fold sand-lagoon into islands unless drawn with low scattered rubble patches.
7. scape-bare-bottom-skyline + scape-frag-rack: both show a bare bottom; art vs utility. Merge early, split only if the user picks "coral farm".
8. light-actinic-blue vs light-daylight-white: should NOT be tiles; render as a lighting toggle visible in every picture (the single most dramatic cue in reef photos).
9. fmt-nano-aio vs fmt-pico-bowl: nearly the same ("tiny"). Merge.
10. fmt-sump-display cannot be seen in a picture; drop as a tile. fmt-shallow-reef-pond and fmt-mega-display are visibly distinct.
11. bio-red-sea / bio-indo-pacific / bio-hawaiian / bio-reef-crest: pictures differ by FISH and coral shape only; one tile "named real reef", sub-pick by colour. bio-mangrove-root = reef-mangrove-display = brk-mangrove-riparium (same picture: tree with roots); merge to ONE "mangrove" node reachable from marine and brackish. bio-seagrass-bed = reef-macroalgae-seagrass; merge.
12. brk-molly-community looks like a freshwater community tank; merge into sibling A's community nodes with a "salty" flag. brk-mono-scat-shoal merges with A's big-schooling tank.
13. odd-closed-ecosphere belongs with a land mini-terrarium; odd-crayfish merges with A's invert nodes.
14. land-isopod-bioactive and land-hermit-crab: low visual distinctness; fold into "small-animal bioactive".
15. land-crested-gecko and land-chameleon: both "vertical leafy"; merge to "tall arboreal".

---

## 14. Suggested picker flow for this slice (3 to 4 rounds)

- R1 (global): natural planted / colourful artificial / salt and reef / land-brackish-odd
- R2 (if salt), 4 tiles with ONE picture each: big fish no coral / colourful coral reef / one special animal (seahorse, jelly, octopus) / a real reef zone
- R3 (if reef): tiles by coral FEEL: soft and carpet / fleshy domes / fine branches / mixed + anemone and clam
- R4: rock layout (wall / islands / arch / zen minimalist); plus a blue-vs-daylight light toggle
- R3 (if big fish): predator-aggressive / old-school decor / Nemo-peaceful
- R3 (if species): seahorse / jelly / cephalopod / sand-diggers (jawfish, garden eels, mandarin)
- R2 (if land): humid jungle / desert / hides-and-burrows / half-water; R3: species tile
- R2 (if brackish or odd aquatic): puffer / mangrove / shoal / amphibian-turtle

---

## 15. Surprising / missed groups found

1. NPS dark tanks (sun coral, gorgonian) look unlike any other reef and have a loyal micro-community.
2. Shallow "reef pond" top-down SPS tanks and frag racks: the "coral farm" look is a legitimate taste (P-fragger).
3. Old-school bleached-skeleton fish-only tanks, distinct from live-rock FOWLR.
4. Mangrove, marine and brackish: the "tree in the tank" aesthetic.
5. Cold-water Pacific Northwest marine (no tropical colours) and jellyfish kreisels (an empty round tank as extreme minimalism).
6. Land side: isopod / bioactive condo and jar ecospheres, for people who want a living miniature rather than an animal.
