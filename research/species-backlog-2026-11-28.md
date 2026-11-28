# Species backlog (Nathan 2026-11-28: catalogue expansion roadmap, checked against the repo)

Source: an outside roadmap Nathan pasted on 2026-11-28 ("YourArium aquarium species catalog expansion", 106 candidate additions, a 166-species milestone and a 222-species target). This file turns it into a backlog checked against the repo at build 6d103f62. It extends `research/roster-expansion-plan.md` (R139), it doesn't replace it. The repo is the source of truth for status.

## 1. What the repo has today

- **Catalogue:** 141 rows in `src/data/species.json`. The 25 terrarium animals are already hidden on live (R19), which leaves 116 aquarium species: freshwater fish 79, freshwater inverts 12, saltwater fish 20, saltwater inverts 3, aquatic amphibians 2. These match the roadmap's "current" column, so there's nothing to hide and no terrestrial work to do.
- **Roadmap species already built:** none of the 106. Each one was searched by common and scientific name across `src/data`, `src/scene`, `research`, `prompts`, `handoff`, `scripts` and `HANDOFF.md`.
- **Reference sheets, specs or partial models:** none. No `research/fish-specs/<id>.json`, no `research/fish-sheets/prompts/<id>-*.md`, no `public/art/fish/<id>*` for any of them.
- **Mentions on paper only:**
  - R139 secondaries: black neon, Congo, black ghost knifefish, *N. multifasciatus*.
  - R139 marine "next": Midas blenny, yellow coris, clown gobies.
  - R139 marine inverts: trochus, nassarius, cerith, emerald crab, peppermint shrimp, pistol shrimp.
  - Taste-tree and habitat notes: Jack Dempsey, severum, blood parrot, silver dollar, arowana, figure-eight puffer, lionfish, jawfish.
  - `src/data/aqadvisor.json` has ids for dojo loach, neon goby and yellow clown goby. Under R143 AqAdvisor counts as non-existent, so those ids carry no weight.
- **Corals:** 12 placeable items already exist in `src/scene/items.ts` and `src/render/coral3d.ts`: branching Acropora, fine Acropora, plate Montipora, plating Montipora, mushrooms, toadstool leather, zoanthids, hammer, torch, sea fan, macroalgae, and a **bubble-tip anemone**. The anemone is a decor item, not livestock.
- **Colour forms:** `src/data/forms.json` already lists forms for 13 species: betta, guppy, platy, molly, swordtail, angel, discus, danio, tiger barb, goldfish, cherry shrimp, black skirt and three-spot. That already covers most of the roadmap's section 9 table. The cherry shrimp forms are drawn. Fish forms stay unbuilt until every base model is approved (Nathan 2026-11-27).
- **How each kind of animal is drawn:**
  - Fish are build-B (`research/fish-sheets/PIPELINE.md`): one 5-row sheet per species, made by Nathan.
  - Shrimp and crayfish are parametric entries in `src/art/shrimps.ts`.
  - Snails are parametric entries in `src/art/snails.ts`.
  - The hermit crab is in `src/art/herps.ts`.
  - Thai micro crab and crayfish share the crustacean rig.

## 2. Tank styles that show up but have no animals to stock

These come from `src/scene/archetypes.ts`. Filling these gaps meets the roadmap's real goal ("distinct, realistic aquarium configurations") better than raw counts do, so they drive the order in section 5.

| Archetype | Missing animals (roadmap species that fill it) |
|---|---|
| shell-bed-lake ("Tiny fish living in snail shells") | multifasciatus, ocellatus. Also needs a snail-shell decor item. |
| predator-display | snowflake moray, lionfish, Picasso trigger |
| sand-bed-burrowers | blue-spotted jawfish, diamond watchman, nassarius, sand-sifting star |
| puffer-den | figure-eight puffer (brackish) |
| big-fish-showcase | Jack Dempsey, severum, blood parrot, flowerhorn, silver arowana |
| silver-shoal | silver dollar |
| cool-native-creek / coldwater | Japanese ricefish, paradise fish, dojo loach |
| clownfish-anemone | maroon clownfish (second host clown), bubble-tip anemone as livestock |

## 3a. Nathan's answers (2026-11-28)

1. **Anemones are animals you stock**, not decorations: "should probably be treated as animals, but some plumbing might have to change since they are sessile". So:
   - The bubble-tip and rock flower anemones become species rows.
   - The stocking and swim code needs a sessile mode: placed on rock like an item, slow creep, light and flow needs, the host link to clownfish and porcelain crabs.
   - Clams (maxima, derasa) use the same mode.
   - The current bubble-tip coral item migrates to the new animal.
2. **Welfare-flagged species are included, each with a warning** ("include them but more information is good. Just have a warning with it"). This is the common-pleco treatment: list the true adult size, the minimum tank, and why they usually fail.
3. **Hybrids get their own species rows** (Nathan: "Own species rows"). Blood parrot and flowerhorn each get a full species.json row with their own care, size and compatibility data, not rules inherited from a parent cichlid. The scientific-name field says "hybrid" and names the likely parent species. They can't take FishBase length-weight rows, so their body mass needs a cited stand-in source (R143b).
4. **30 fish sheets for the first 50: yes.**
5. **New ask: soft corals, snails and shrimp may each need a new modeling process** ("modeling the soft corals may need a new modeling process, same with snails and shrimp"). The parametric snail and shrimp specs and the procedural coral items aren't assumed good enough anymore. Effect on section 5:
   - Steps 1 and 2 aren't "no sheets, quick wins" any more. Each waits on an invert modeling method, which could be a reference-sheet method like build-B for fish.
   - Write that method first: pilot one snail (trochus), one shrimp (peppermint) and one soft coral (zoanthids), then batch.
   - Until that method exists, saltwater and freshwater fish (steps 3 and 4) can go first, since build-B is ready.

## 3. Decisions for Nathan (asked 2026-11-28; answers in 3a)

1. **Anemones as livestock or decor?** Today the bubble-tip anemone is a coral item. The roadmap wants it, and the rock flower anemone, as livestock with a clownfish or porcelain-crab pairing. Recommendation: keep anemones as placeable items (they sit, light and flow matter) and add a host link from item to fish, rather than putting them in species.json.
2. **Welfare-flagged species.** These usually die in home tanks or outgrow them. Should they get the common-pleco treatment (listed, with a true-size or "expert, usually starves" warning), or stay out?
   - sand-sifting star (starves)
   - blue Linckia (high import mortality)
   - sea hare (starves once the algae is gone)
   - silver arowana (36 in, 250+ gal)
   - motoro ray (180+ gal, 18 in disc)
   - copperband (hard to feed)
   - frontosa (13 in, colony in 125+ gal)
   - emperor angel (15 in, 220+ gal)
   - naso tang (18 in)
3. **Hybrids.** Blood parrot and flowerhorn have no species name. R139 phase 5 already asks where hybrid-level rules attach. Decide that before building them.
4. **Sheet budget.** Each fish needs Nathan to make a 5-row sheet. The 50-species milestone below is 30 fish, so 30 sheets. Inverts don't need sheets because they're parametric.

## 4. The full backlog

Columns:
- **Reuse:** the built model or rig it starts from (T = repaint only, G = repaint plus shape change). "new" means a new body plan.
- **New system:** behaviour or rendering the app doesn't have yet.
- **M50:** in the first-50 milestone.

Every row's status is "new: no sheet, no spec, no model".

### Freshwater fish (41)

| Species | Sci. name (to verify) | Reuse | New system | M50 | Notes |
|---|---|---|---|---|---|
| Black neon tetra | *Hyphessobrycon herbertaxelrodi* | G neon/ember | - | yes | R139 secondary |
| Congo tetra | *Phenacogrammus interruptus* | G black skirt | - | yes | R139 secondary; long finnage on males |
| Serpae tetra | *Hyphessobrycon eques* | G black skirt | - | yes | fin-nipper flag |
| Bleeding heart tetra | *H. erythrostigma* | G black skirt | - | yes | |
| Silver dollar | *Metynnis argenteus* | new (disc characin) | - | yes | fills silver-shoal; eats plants |
| Scarlet badis | *Dario dario* | G pygmy fish | - | yes | live food; male/female differ |
| Pictus catfish | *Pimelodus pictus* | new (long-barbel catfish) | barbel rig | yes | 55+ gal, eats small fish |
| Dojo loach | *Misgurnus anguillicaudatus* | G kuhli (long body) | - | yes | coldwater-capable |
| Black ghost knifefish | *Apteronotus albifrons* | G clown knife (ribbon fin) | - | yes | R139 phase 4 |
| Jack Dempsey | *Rocio octofasciata* | G convict/firemouth | - | yes | big-fish-showcase; electric-blue form later |
| Severum | *Heros efasciatus* | G angel/acara | - | yes | |
| Blood parrot | hybrid | G acara | - | yes | decision 3 |
| Agassiz's dwarf cichlid | *Apistogramma agassizii* | G cockatoo | - | yes | sexes differ |
| Rosy barb | *Pethia conchonius* | G cherry/tiger barb | - | yes | |
| Silver arowana | *Osteoglossum bicirrhosum* | new | surface-cruiser | - | decision 2 |
| Forktail blue-eye | *Pseudomugil furcatus* | G neon rainbow | - | - | |
| Paradise fish | *Macropodus opercularis* | G three-spot gourami | - | - | coldwater |
| Japanese ricefish | *Oryzias latipes* | G white cloud | - | - | coldwater, top-dweller |
| Denison barb | *Sahyadria denisonii* | G bala/barb | - | - | |
| Golden wonder killifish | *Aplocheilus lineatus* | G clown killi | - | - | surface |
| Gardner's killifish | *Fundulopanchax gardneri* | G clown killi | - | - | |
| Asian stone catfish | *Hara jerdoni* | new (tiny flat catfish) | - | - | |
| Black kuhli loach | *Pangio oblonga* | T kuhli | - | - | cheapest fish in the list |
| Ropefish | *Erpetoichthys calabaricus* | G bichir | eel swim (stronger body wave) | - | escape-artist lid flag |
| Chinese algae eater | *Gyrinocheilus aymonieri* | G SAE | - | - | turns aggressive as an adult (see FS1 SAE audit) |
| Buenos Aires tetra | *Hyphessobrycon anisitsi* | G black skirt | - | - | eats plants |
| Emperor tetra | *Nematobrycon palmeri* | G tetra | - | - | |
| Odessa barb | *Pethia padamya* | T rosy barb | - | - | |
| Celebes rainbowfish | *Marosatherina ladigesi* | G neon rainbow | - | - | |
| Rainbow kribensis | *Pelvicachromis taeniatus* | T kribensis | - | - | |
| Multifasciatus | *Neolamprologus multifasciatus* | new (Tanganyika dwarf) | shell-dwelling (shell item, claims a shell, digs) | yes | fills shell-bed-lake |
| Ocellatus | *Lamprologus ocellatus* | G multis | shell-dwelling | yes | |
| Lemon cichlid | *Neolamprologus leleupi* | G multis | - | yes | rock Tanganyika |
| Masked julie | *Julidochromis transcriptus* | new (elongate cichlid) | - | yes | |
| Fairy cichlid | *Neolamprologus brichardi* | G lemon cichlid | - | - | colony breeder |
| Duboisi | *Tropheus duboisi* | new | - | - | large groups only; juvenile spotted look differs from the adult |
| Frontosa | *Cyphotilapia frontosa* | new | - | - | decision 2 |
| Motoro stingray | *Potamotrygon motoro* | new (disc) | ray swim plus resting on the sand | - | hardest build; decision 2 |
| Flowerhorn | hybrid | G acara | - | - | decision 3 |
| African butterflyfish | *Pantodon buchholzi* | new | surface-hover | - | lid flag |
| Figure-eight puffer | *Dichotomyctere ocellatus* | G pea puffer | brackish salinity range | - | fills puffer-den |

### Saltwater fish (30)

| Species | Sci. name | Reuse | New system | M50 | Notes |
|---|---|---|---|---|---|
| Diamond watchman goby | *Valenciennea puellaris* | G yellow watchman | sand-sifting | yes | sand-bed-burrowers |
| Powder blue tang | *Acanthurus leucosternon* | G blue/kole tang | - | yes | ich-prone, 100+ gal |
| Yellow coris wrasse | *Halichoeres chrysus* | G six-line | buries at night | yes | |
| Bicolor blenny | *Ecsenius bicolor* | T tailspot | - | yes | |
| Purple firefish | *Nemateleotris decora* | T firefish | - | yes | |
| Copperband butterflyfish | *Chelmon rostratus* | new (butterflyfish) | - | yes | the butterflyfish family; hard to feed |
| Lyretail anthias | *Pseudanthias squamipinnis* | new (anthias) | harem group (male differs) | yes | the anthias family |
| Purple tang | *Zebrasoma xanthurum* | T yellow tang | - | yes | |
| Flame hawkfish | *Neocirrhites armatus* | new (hawkfish) | perches on rock | yes | eats shrimp |
| Neon goby | *Elacatinus oceanops* | G goby | cleaner station | yes | |
| Maroon clownfish | *Amphiprion biaculeatus* | G ocellaris | anemone host | yes | in place of blue damsel (see M50 note) |
| McCosker's flasher wrasse | *Paracheilinus mccoskeri* | G six-line | display (fin flash) | yes | |
| Blue damselfish | *Chrysiptera cyanea* | T yellowtail blue damsel | - | - | almost a repaint of a fish we have |
| Snowflake moray | *Echidna nebulosa* | new (eel) | eel swim, lives in a rock cave | - | predator-display |
| Picasso triggerfish | *Rhinecanthus aculeatus* | new (trigger) | - | - | |
| Emperor angelfish | *Pomacanthus imperator* | G coral beauty | juvenile look differs from the adult | - | decision 2 |
| Red lionfish | *Pterois volitans* | new | - | - | venomous; predator-display |
| Blue-spotted jawfish | *Opistognathus rosenblatti* | new | burrow-hover | - | sand-bed-burrowers |
| Longhorn cowfish | *Lactoria cornuta* | new (boxfish) | - | - | toxin flag; grows to 18 in |
| Midas blenny | *Ecsenius midas* | G tailspot | - | - | R139 "next" |
| Blonde naso tang | *Naso elegans* | G tang | - | - | decision 2 |
| Green clown goby | *Gobiodon histrio* | new (clown goby) | perches in Acropora | - | R139 "next" |
| Yellow clown goby | *Gobiodon okinawae* | T green clown goby | perches in Acropora | - | |
| Melanurus wrasse | *Halichoeres melanurus* | G yellow coris | buries at night | - | |
| Tomini tang | *Ctenochaetus tominiensis* | T kole tang | - | - | |
| Sailfin tang | *Zebrasoma velifer* | G yellow tang | - | - | |
| One-spot foxface | *Siganus unimaculatus* | T foxface | - | - | |
| Blue-throat triggerfish | *Xanthichthys auromarginatus* | G Picasso | - | - | reef-safe trigger |
| Marine betta | *Calloplesiops altivelis* | new | - | - | |
| Raccoon butterflyfish | *Chaetodon lunula* | G copperband | - | - | not reef-safe |

Reef safety: the roadmap asks for three levels (safe, with caution, not safe). Check whether species.json already holds this before adding a field.

### Freshwater inverts (13), all parametric

| Species | Sci. name | Reuse | New system | M50 | Notes |
|---|---|---|---|---|---|
| Crystal red shrimp | *Caridina logemanni* | cherry shrimp spec | - | yes | soft, acidic water |
| Assassin snail | *Anentome helena* | trumpet spec | eats snails (stock rule) | yes | |
| Ghost shrimp | *Palaemon paludosus* (trade: mixed *Palaemon/Palaemonetes*) | amano spec | - | yes | clear body |
| Bamboo shrimp | *Atyopsis moluccensis* | amano spec | fan feeding in the current | yes | |
| Rabbit snail | *Tylomelania* spp. | trumpet spec | - | yes | |
| Horned nerite | *Clithon corona* | nerite spec | - | yes | needs brackish water to breed |
| Japanese trapdoor snail | *Heterogen* (*Cipangopaludina*) *japonica* | mystery spec | - | yes | coldwater |
| Sulawesi cardinal shrimp | *Caridina dennerli* | cherry shrimp spec | - | yes | Sulawesi water parameters; pairs with rabbit snail |
| Vampire shrimp | *Atya gabonensis* | bamboo shrimp | fan feeding | - | |
| Bladder snail | *Physella acuta* | ramshorn spec | hitchhiker (rides in on plants) | - | pest, listed for realism |
| Black devil snail | *Faunus ater* | trumpet spec | - | - | prefers hard or slightly brackish water |
| Red-nose shrimp | *Caridina gracilirostris* | amano spec | - | - | larvae need brackish water |
| ~~Blue bolt shrimp~~ | *Caridina* (bee shrimp line) | - | - | - | **Not a species.** A colour form of crystal/Taiwan bee shrimp; add it to forms.json after the crystal red shrimp. |

### Saltwater inverts (22)

| Species | Sci. name | Reuse | New system | M50 | Notes |
|---|---|---|---|---|---|
| Banded trochus snail | *Trochus* spp. | turbo spec | - | yes | R139 |
| Nassarius snail | *Nassarius vibex* | snail spec | burrows, comes up at feeding | yes | R139 |
| Cerith snail | *Cerithium* spp. | trumpet spec | - | yes | R139 |
| Astrea snail | *Lithopoma tectum* | turbo spec | - | yes | can't right itself if flipped |
| Fighting conch | *Strombus alatus* | snail spec | sand grazer | yes | |
| Scarlet reef hermit | *Paguristes cadenati* | blue-leg hermit (herps.ts) | - | yes | |
| Emerald crab | *Mithraculus sculptus* | micro crab / crustacean rig | - | yes | R139 |
| Peppermint shrimp | *Lysmata wurdemanni* | cleaner shrimp spec | eats Aiptasia | yes | R139 |
| Fire shrimp | *Lysmata debelius* | cleaner shrimp spec | cleaner | yes | |
| Coral-banded shrimp | *Stenopus hispidus* | cleaner shrimp, G long claws | - | yes | one per tank |
| Randall's pistol shrimp | *Alpheus randalli* | crustacean rig | burrows, pairs with a goby | yes | pairs with the diamond or yellow watchman |
| Tuxedo urchin | *Mespilia globulus* | new (urchin) | carries debris | yes | |
| Sexy shrimp | *Thor amboinensis* | cleaner shrimp, G | lives with an anemone | - | |
| Brittle star | *Ophioderma* spp. | new (star) | night scavenger | - | |
| Bubble-tip anemone | *Entacmaea quadricolor* | **exists as an item** | host link | - | decision 1 |
| Rock flower anemone | *Phymanthus crucifer* | coral item, new | - | - | decision 1 |
| Maxima clam | *Tridacna maxima* | new (clam, sessile) | light placement | - | |
| Derasa clam | *Tridacna derasa* | T maxima | light placement | - | |
| Sand-sifting starfish | *Archaster typicus* | brittle star rig | burrows | - | decision 2 |
| Blue Linckia | *Linckia laevigata* | star rig | - | - | decision 2 |
| Sea hare | *Dolabella auricularia* | new | - | - | decision 2 |
| Porcelain anemone crab | *Neopetrolisthes maculatus* | crustacean rig | lives with an anemone, fan feeding | - | decision 1 |

## 5. Recommended order (first 50, matching the roadmap's 18 / 12 / 8 / 12 split)

1. **Saltwater cleanup crew (12, no sheets needed):** trochus, nassarius, cerith, astrea, fighting conch, scarlet hermit, emerald crab, peppermint, fire, coral-banded, pistol shrimp, tuxedo urchin.
   - The urchin is the only new body plan here.
   - The pistol shrimp waits for the goby pairing in step 3.
2. **Freshwater inverts (8, no sheets):** crystal red, assassin, ghost, bamboo, rabbit, horned nerite, trapdoor, Sulawesi cardinal.
   - Steps 1 and 2 add 20 species with no build-B sheets: spec entries in `shrimps.ts`, `snails.ts` and `herps.ts`, and species.json rows under R143's onboarding rules.
3. **Saltwater fish (12 sheets):**
   - Repaints first: purple firefish, bicolor blenny, purple tang, diamond watchman, maroon clown, powder blue tang.
   - Then new families: neon goby, yellow coris, McCosker's flasher, flame hawkfish, lyretail anthias, copperband.
   - The blue damsel moved out of the milestone for the maroon clown. It's nearly a repaint of the yellowtail damsel, while the maroon gives the clownfish-anemone tank a second host clown.
4. **Freshwater fish (18 sheets):**
   - Tanganyika four, built together with a snail-shell item: multifasciatus, ocellatus, lemon cichlid, masked julie.
   - Tier 1 minus the arowana: black neon, Congo, serpae, bleeding heart, silver dollar, scarlet badis, pictus, dojo, black ghost, Jack Dempsey, severum, blood parrot (after decision 3), Agassiz's, rosy barb.

New systems, in the order the milestone needs them:
1. Snail-shell decor item and shell-dweller behaviour (step 4).
2. Goby and pistol-shrimp pairing (steps 1 and 3).
3. Item-to-fish anemone host link (maroon clown; also R139).
4. Burrowing (nassarius, jawfish later).
5. Rock-perching (hawkfish).

After the milestone, the next systems are eel swim (moray, ropefish), ray swim (motoro), sessile clams, and stars and urchin.

Colour morphs (roadmap section 9) stay parked until every base model is approved (Nathan 2026-11-27). Most of that table is already in forms.json. Missing from it: Endler's tiger, black bar and Japan blue; bristlenose albino and super red; oscar tiger, albino and red; German blue ram electric blue and gold; dwarf gourami flame and powder blue; Jack Dempsey electric blue; ocellaris black, snowflake and mocha; mystery snail gold, blue, ivory and magenta.

Corals (roadmap section 8): 12 exist. The roadmap's list minus what's built is GSP, Ricordea, Xenia, Kenya tree, frogspawn, Duncan, candy cane, Acan, Blastomussa, Scolymia, Goniopora, branching Montipora, birdsnest, Pocillopora, Stylophora. R170 (reef style, lane ART2) comes first.

## 6. Picker labels the roadmap flags (current values from species.json)

| Species | Now | Roadmap suggests |
|---|---|---|
| Royal gramma | Bottom & cleanup crew | Community fish |
| Orchid dottyback | Bottom & cleanup crew | Community fish, plus a territorial flag |
| Pea puffer | Community fish | Specialist |
| Senegal bichir | Bottom & cleanup crew | Predatory |
| Reticulated hillstream loach | Centerpiece fish | Algae grazer / bottom specialist |
| Peacock gudgeon | Schooling fish | Community / small centerpiece |
| Livebearers (platy, molly, swordtail, guppy, Endler's) | Schooling fish | Community fish (they don't school) |

Lawnmower blenny, tailspot blenny and yellow watchman are also in "Bottom & cleanup crew" for saltwater. The roadmap's point, picker group not equal to function, belongs with R139 phase 5. A predator should never be offered as cleanup crew.

## 7. Scientific names to check before any row is added

- Ghost shrimp is a trade mix.
- *Heterogen japonica* is also listed as *Cipangopaludina japonica*.
- "Blue bolt" is a form, not a species.
- *Strombus alatus* and *Lithopoma tectum* have both been moved between genera.
- *Ophioderma* and *Trochus* spp. need a named species for the FishBase / SeaLifeBase length-weight row (R143b).

Every other name matches current usage as far as this check went; verify each against FishBase / WoRMS when its row is added.
