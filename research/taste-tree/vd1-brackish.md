# VD1 - Brackish style archetypes (Glass Box / TankLook picker)

Date 2026-10-30. Units: US gallons, inches, deg F, specific gravity (SG, at 77 F). Sources are mostly retailer / hobby care sheets; where they disagree the range below is the safe overlap and the disagreement is noted. Prior tree: research/taste-tree/C-marine-brackish-land.md (brk-* nodes, bio-tide-pool, bio-mangrove-root).

## Result at a glance (final list: 5 families, 11 archetypes)

| Family | Archetype id | Public name | Status vs draft |
|---|---|---|---|
| Mangrove & Estuary | mangrove-estuary | Mangrove Nursery | kept; absorbs brk-mangrove-riparium (propagule through rim) |
| Mangrove & Estuary | estuary-root-tangle | Archer Lookout | kept; renamed; big-tank gate |
| Mudflat & Shoreline | mudskipper-mudflat | Mudskipper Mudflat | kept; land+water build |
| Mudflat & Shoreline | fiddler-crab-beach | Fiddler Beach | kept; mostly-land build |
| Rocky Coast & Tidepool | brackish-rocky-coast | Rocky Cove | kept; fully submerged rock stack |
| Rocky Coast & Tidepool | brackish-tidepool | Estuary Tidepool | kept, WEAKEST PAIR; merge fallback below |
| Fish-First Brackish Habitats | puffer-den | Puffer Den | kept |
| Fish-First Brackish Habitats | silver-shoal | Silver Shoal | kept; size gate |
| Fish-First Brackish Habitats | brackish-molly-community | Sailfin Molly Bright | kept, flagged (looks freshwater) |
| Brackish Planting | brackish-planted | Fern & Wood | kept; mangrove REMOVED from it |
| Brackish Planting | brackish-meadow | Estuary Grass Flat | NEW (family needed a second); evidence-light |

Merges / moves:
1. brk-mangrove-riparium merged into mangrove-estuary (same picture: propagule leaves above rim, roots below). Open density = one propagule through the rim.
2. Mangrove seedlings dropped from brackish-planted (would make it read as mangrove-estuary, and mangroves want 1.008-1.012 vs ferns/anubias wanting <= 1.005-1.008).
3. brackish-rocky-coast + brackish-tidepool: if the renderer cannot draw a visible waterline with an exposed rock ledge, MERGE into one brackish-rocky-coast (tidepool becomes the "open" density).
4. brackish-molly-community: cross-family overlap with freshwater community tanks; keep in Fish-First only with a "salt is the point" fingerprint (white sand, sailfin / dalmatian mollies, bumblebee-free). If the cross-family consolidation (tree note 12) wins, fold into the freshwater community nodes with a salty flag.
5. Salinity is invisible: no archetype may be chosen for salinity alone. Pictures differ by animal, mangrove, land, waterline.

Global safety flags (apply to the picker, not just one archetype):
- Fiddler crabs and mudskippers are semi-terrestrial: never offered as a submerged tank; land fraction is part of the archetype and is not user-editable below the floor.
- Fiddler crabs are almost always sold as "freshwater"; they die in freshwater long-term (needs brackish + land).
- Monos / scats / archerfish / green spotted puffers are juvenile-sold big fish: show adult size and tank gate.
- Figure-8 puffer: one per tank by default (fin-nipping, aggression); never default a green spotted puffer (Tetraodon nigroviridis, 6-7 in, ends in near-marine).
- Marine salt mix only (not "aquarium salt"); hydrometer / refractometer required; change SG by <= 0.002 per day.
- Red mangrove propagules: SG mismatch with origin water can kill by osmotic shock; roots outgrow a small tank in about 3 years.
- Tight lid on every archetype with archers, mudskippers, fiddlers, nerites above the waterline (jumpers / climbers).

---

## Family 1: Mangrove & Estuary

### mangrove-estuary - "Mangrove Nursery"
- Tagline: "A tiny forest with its feet wet; roots outgrow the glass."
- Fingerprint: 1-3 red mangrove propagules standing through the open top (green leaves above the rim); reddish-brown prop roots hanging into tea-tinted water; soft mud-sand floor; small silver / orange fish and shrimp in the root shade.
- Contrast with closest sibling (estuary-root-tangle): full-depth water to the rim and a small mixed shoal; leaves above the rim, not a low waterline with a big air gap and banded silver fish.
- Baseline scene: 40 gal; sand-mud mix 2-3 in; 2 propagules at the back corners rooted in the substrate with the top third dry; one driftwood branch; a few rocks; water gently tea-tinted; bright top light; open centre swim space about 40 %. Land fraction 0 (leaves above rim only).
- Density: open = one propagule, sand open, one wood piece; balanced = 2 propagules, roots beginning to hang, one wood; full = 3 propagules and a root tangle with hanging aerial roots and leaf litter.
- Rendering needs: red mangrove model (stem, 3-4 pairs of leaves, propagule pod, hanging aerial roots, prop roots with lenticel texture); tea water tint; mud-sand substrate; top-light god-rays; open-top frame with leaf above rim; fallen-leaf decals.
- Salinity SG 1.008-1.012 (one source 1.008-1.012; propagule roots survive fresh to marine but must be acclimated). Temp 72-80 F. Min tank 30 gal (40 recommended).
- Animals: sailfin mollies, Endler / guppy-type livebearers (only if SG >= 1.005 is tolerated), nerite snails, bumblebee gobies, ghost / grass shrimp. Not default: fiddler crab (needs land, belongs in the mudflat family), monos/scats (outgrow).
- Welfare: acclimate propagule to tank salinity gradually; remove fallen leaves; plan root space; no shock changes; do not keep crabs without land.
- Sources: https://www.liveaquaria.com/blogs/species-spotlight/introduction-to-red-mangroves ; https://wetwebmedia.com/mangrovetrees.htm ; https://gensou.sg/?p=29481

### estuary-root-tangle - "Archer Lookout"
- Tagline: "Sharpshooters under the roots; they need a lid and a long tank."
- Fingerprint: waterline visibly low with a 6-8 in air gap under a lid; branches / hanging roots overhead at the surface; silver-and-black-banded archerfish angled upward; tea-brown water, bright warm top light.
- Contrast with closest sibling (mangrove-estuary): the waterline is lowered and the air space is the feature; the fish is one large banded archer, not a tiny shoal; root tangle is overhead, not underwater.
- Baseline scene: 75 gal long (48 in or longer); sand 2 in; 3 wood branches reaching above the water; 2 hanging root / vine strands; clear air gap (about 20 % of height); open centre; floating cork islet optional; lid.
- Density: open = one overhead branch, bare sand; balanced = two branches plus hanging roots; full = branch canopy with a root curtain, still keeping a clear 3 ft swim lane.
- Rendering needs: lowered waterline with a visible gap and lid; overhead branch / root meshes; banded archerfish (tall disc body with 5-6 black bars, small upturned mouth); tea water tint; surface caustics; optional prey insect decal on the branch (static).
- Salinity SG 1.005-1.010 (banded Toxotes jaculatrix; largescale T. chatareus is freshwater tolerant - ID matters). Temp 77-82 F. Min tank: sources conflict (55 gal to 100 gal); gate at 75 gal for one to two fish, 100+ gal for a group of 3.
- Animals: 1-3 banded archerfish (adult 7-9 in captive, up to about 12 in wild). Not default: mollies as dithers if they could be eaten once archers outgrow them; keep dithers larger (monos, not tiny fish).
- Welfare: tight lid (jumpers); live / meaty diet; small tankmates get eaten; do not keep with fin-nippers.
- Sources: https://gensou.sg/?p=24335 ; https://aquifarm.com/aquarium-archer-fish ; https://fishtanksetups.com/archer-fish-care/ ; https://guidarium.com/fishes/banded-archerfish-brackish

---

## Family 2: Mudflat & Shoreline (both resolve to paludarium-style land + water builds)

### mudskipper-mudflat - "Mudskipper Mudflat"
- Tagline: "A fish that stands on land; it wants a beach and a lid."
- Fingerprint: dark wet mud-sand slope rising from a shallow pool; a bulging-eyed mudskipper perched on the bank with its dorsal fin raised; cork bark / low roots on the mud; fog / humid air with condensation on glass.
- Contrast with closest sibling (fiddler-crab-beach): dark mud, about half water, fish is the star; fiddler beach is pale dry sand, mostly land and crabs.
- Baseline scene: 40 gal long minimum (4 ft footprint, shallow water 3-4 in deep at the deep end); about 50 % land (mud-sand bank sloping up, plus cork island); 1-2 mangrove roots; hardscape of low rocks and cork; lid with a heat lamp; water zone about 40-50 % of footprint. Humid, warm.
- Density: open = one bank and bare mud, one skipper; balanced = bank plus cork island and a root; full = mangrove roots, mud burrows, and rock hide with the water pool still clear.
- Rendering needs: shoreline slope mesh with continuous water-to-land transition; wet-mud shader (specular, darker where damp); shallow water volume; mudskipper model with raised dorsal fin; condensation / fog; heat-lamp glow; lid; burrow hole decal.
- Salinity SG about 1.005-1.012 (no species-specific source found; use brackish low end; check species: African Periophthalmus barbarus vs Indo-Pacific). Temp water 77-82 F, air 80-86 F, humidity 80 %+. Min 40 gal long for 1-2.
- Animals: 1-2 mudskippers (species-matched); optional tiny fish only if they cannot get eaten. Not default: fiddler crabs with skippers (will be eaten / out-competed).
- Welfare: land is at least 40-50 % of the footprint (sources: 40-60 %); shallow water; tight lid, humidity, warm air; they are territorial (one per 20 gal footprint); never a fully aquatic tank.
- Sources: https://gensou.sg/?p=30799 ; https://www.paludariums.net/mudskippers.php ; https://www.tankflare.com/blogs/african-mudskipper-care-guide ; https://gensou.sg/paludarium-setup-guide/

### fiddler-crab-beach - "Fiddler Beach"
- Tagline: "A crab parade on the sand; it needs a shore, not a swim."
- Fingerprint: pale sand beach filling most of the tank with a shallow pool at one end; several fiddler crabs, males with one huge orange / red claw; shell and driftwood bits; burrow holes in the sand.
- Contrast with closest sibling (mudskipper-mudflat): dry-looking pale sand, about 70-80 % land, a colony of small crabs with big claws; no fish on the bank.
- Baseline scene: 20 gal long (a 10 gal is the floor for 3-5 crabs); 70-80 % land, sand 3-4 in deep on the land side for burrows; 1-2 in deep brackish pool at one end; small driftwood and shells; cover for shade; lid.
- Density: open = two crabs, smooth beach; balanced = 4-5 crabs, shells and a root; full = 6+ crabs on a beach with driftwood and a rock ledge (only if tank 30 gal+).
- Rendering needs: sand-beach heightfield with burrows; shoreline slope to shallow pool; fiddler crab model (one oversized claw, eye stalks, red / orange claw, blue-grey carapace); sand shader (wet near the pool, dry elsewhere); condensation optional; lid.
- Salinity SG 1.005-1.015 (marine salt mix; the Florida species Leptuca / Uca can cope with lower but brackish is the safe default); Temp 72-82 F, air 75-85 F. Min 10 gal; 20 gal recommended.
- Animals: 3-6 fiddler crabs (1-2 males, rest females, one male per 10 gal footprint); optional nerites in the pool.
- Welfare: sources conflict (50/50 to 70-80 % land): default to the land-heavy end; they drown in deep water; usually sold as "freshwater" but die there; tight lid; molts need salt; sand for burrowing (no gravel).
- Sources: https://www.aquariumsource.com/fiddler-crab/ ; https://vetverified.com/articles/the-complete-guide-to-keeping-fiddler-crabs ; https://gensou.sg/?p=41849 ; https://petguide.com/blog/fish/tips-for-keeping-fiddler-crabs-in-your-brackish-tank/

---

## Family 3: Rocky Coast & Tidepool

### brackish-rocky-coast - "Rocky Cove"
- Tagline: "A stack of dark rock and shell; tiny gobies guard every crack."
- Fingerprint: fully submerged stack of dark grey / black rock slabs and pale oyster shell clumps; cave openings with small yellow-and-black bumblebee gobies perched at the entrances; nerite snails on the rock; pale sand; clear water.
- Contrast with closest sibling (brackish-tidepool): everything is underwater with a crowded cave stack; the tidepool shows an exposed wet ledge and a waterline.
- Baseline scene: 20 gal long; fine sand 2 in; 1 stack of rock slabs (about 12 in high) with caves, 6-10 oyster shells scattered; ceramic pot optional; open sand front 35 %; moderate light, no plant growth beyond algae film.
- Density: open = single rock stack and shells, 3 gobies; balanced = two stacks with a lane between and shells; full = a reef wall of stacked rock and oyster-shell clumps with many cave openings.
- Rendering needs: stacked-rock meshes (dark, slightly pitted, with lighter shell and calcareous patches); oyster-shell clumps; cave / hole shapes; small goby model (3 yellow bands on black); nerite model with zebra / tiger stripes; sand; clear water with slight blue-green tint.
- Salinity SG 1.005-1.012 (bumblebee gobies sources 1.002-1.008; stable to within 0.002; marine salt mix). Temp 74-80 F. Min 15 gal; 20 gal for a stable group.
- Animals: 4-8 bumblebee gobies (Brachygobius; ID is notoriously unreliable - Practical Fishkeeping notes only partly brackish) and nerites; sources disagree whether nerites are goby-safe (large nerites usually OK).
- Welfare: fine sand not gravel (digging); gobies need live / frozen small foods; no larger tankmates; stable SG.
- Sources: https://gensou.sg/?p=19902 ; https://www.tankflare.com/blogs/bumblebee-goby-care-guide ; https://www.practicalfishkeeping.co.uk/features/how-to-set-up-a-brackish-goby-aquarium/ ; https://biotopeaquariumproject.com/bam/chesapeake-bay-oyster-reef-biotope-phoebus-virginia-usa-kwilson/

### brackish-tidepool - "Estuary Tidepool"
- Tagline: "A wet ledge and a shallow pool; the tide line is the detail."
- Fingerprint: shallow open-top tank with a rock ledge breaking the surface; a dark tide-line stain on the rock; wet gleaming rock above water; nerites climbing the ledge; barnacle / shell crust; clear water in a low, wide frame.
- Contrast with closest sibling (brackish-rocky-coast): 25-30 % of the rock is above the waterline with a visible tide stain; one low, wide, open frame instead of a high cave stack.
- Baseline scene: 15-20 gal low / wide (about 24 x 12 in); water 6-8 in deep; one rock ledge with a shelf above water; sand strip; scattered shells; lid or tight rim; bright light; no plants.
- Density: open = one ledge and nerite pair; balanced = ledge plus a second shelf and shell crust; full = rock terraces with rock pools and barnacle / shell crust.
- Rendering needs: partly emersed rock mesh with wet / dry shading split at the waterline; tide-line stain decal; barnacle and shell crust; shallow water volume; nerite models; shoreline caustics.
- Salinity SG 1.010-1.018 (estuarine rock; higher than goby-only tanks; unsourced as a hobby style - mark "stylized" and verify before animal list). Temp 72-80 F. Min 10 gal; 15 gal recommended.
- Animals: nerite snails, grass shrimp; bumblebee gobies optional.
- Welfare: nerites climb out (lid); no true marine tidepool animals in brackish; do not add fiddler crabs here (they get the beach build).
- MERGE FALLBACK: weakest pair in the family (two rock builds with small gobies / nerites). If the renderer cannot draw the exposed ledge and tide line, fold into brackish-rocky-coast as a density step. Also marine tidepool (bio-tide-pool) exists in the marine family: label this one "brackish" visibly.
- Sources: https://en.wikipedia.org/wiki/Brackish-water_aquarium ; https://forums.reefcentral.com/threads/cold-temperate-water-reef.240156/page-10 (marine tidepool contrast) ; https://guidarium.com/compatibility/bumblebee-goby-brackish-and-nerite-snail

---

## Family 4: Fish-First Brackish Habitats

### puffer-den - "Puffer Den"
- Tagline: "One round grump in a tidy tank; no roommates."
- Fingerprint: a single chubby figure-8 puffer (green with dark ring / "8" markings, big eyes) over bare pale sand; two driftwood pieces and 3 river rocks; Java fern; snail shells scattered.
- Contrast with closest sibling (silver-shoal): one small solitary fish in a small tank; shoal is a school of tall silver discs in open water.
- Baseline scene: 20-30 gal long; sand 2 in; 2 wood pieces with a cave; 3 rocks; Java fern / anubias on the wood; ramshorn snails; warm light; open sand front 50 %.
- Density: open = one cave, bare sand; balanced = wood, rocks, ferns; full = wood arches, many sightline breaks, and fern curtains with sand lane.
- Rendering needs: figure-8 puffer (chubby body, spotted dorsal surface, big eyes, mild belly bulge); sand; driftwood; Java fern; snail shells; mild water tint.
- Salinity SG 1.005-1.010 (sources cluster 1.005-1.008; many keepers raise toward 1.010-1.012 as the fish matures; sources disagree; do not present a schedule). Temp 76-82 F. Min 20 gal for one adult (3 in); sources 15-30 gal.
- Animals: one figure-8 puffer (Tetraodon biocellatus); snails for beak wear. Never default: green spotted puffer (outgrows, marine-ish).
- Welfare: solo; beak trimming foods (snails); heavy bioload; no fin-nipper-vulnerable tankmates; hydrometer.
- Sources: https://gensou.sg/figure-eight-puffer-care-guide/ ; https://www.tankflare.com/blogs/figure-eight-puffer-care-guide ; https://wetwebmedia.com/BrackishSubWebIndex/fig8pufffaqs.htm ; https://guidarium.com/fishes/figure-8-puffer-brackish

### silver-shoal - "Silver Shoal"
- Tagline: "A shimmering school in open water; they outgrow the starter tank."
- Fingerprint: a school of tall silver-and-yellow discs (monos) with a few spotted gold-green scats; wide open water; sand; two root pieces at the sides; strong flow.
- Contrast with closest sibling (puffer-den): many fish, big open swim lane, minimal hardscape vs. one small puffer with wood and ferns.
- Baseline scene: 90 gal long (6 ft preferred); sand 2 in; two large roots at the ends; open centre 70 %; dim-to-bright overhead light; fast flow.
- Density: open = 3 monos, bare sand; balanced = 4 monos + 3 scats, two roots; full = 5 monos + 3 scats, root arches, still 50 % open.
- Rendering needs: tall disc mono model (silver with yellow tinges, black fin edges); scat model (round, green-gold with black spots); schooling animation; sand; root meshes; open-water shading.
- Salinity: juveniles SG 1.003-1.010; adults monos 1.010-1.022, scats 1.020-1.025 (sources differ; ramp up over weeks). Temp 76-82 F. Min tank 75 gal (monos group of 3; sources go up to 80 gal); default 90 gal.
- Animals: monos (Monodactylus argenteus, 8-10 in), scats (Scatophagus argus, 10-12 in).
- Welfare: gate under 75 gal; show adult size at purchase; strong filtration (scats are messy); gradual salinity ramp; not freshwater long-term.
- Sources: https://gensou.sg/?p=33043 ; https://gensou.sg/?p=33044 ; https://guidarium.com/fishes/scat-brackish ; https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/

### brackish-molly-community - "Sailfin Molly Bright"
- Tagline: "Sailfins in white sand; a little salt, lots of babies."
- Fingerprint: black / dalmatian / sailfin mollies in bright light; white sand and wood; Java fern / Vallisneria in the back; a few guppy-type livebearers.
- Contrast with closest sibling (silver-shoal): mixed colourful livebearers and plants in a mid-size tank vs. a mono-species silver disc school in open water.
- Baseline scene: 30 gal; white sand; one wood piece; Java fern / Vallisneria back; open 50 %.
- Density: open = 3 mollies, one wood; balanced = 1 male + 3-4 females, a few plants; full = a livebearer shoal with plants and nerites (breeding will fill it).
- Rendering needs: sailfin molly models (tall sail dorsal; black / dalmatian / orange variants); white sand; Java fern / Vallisneria; clear water.
- Salinity SG 1.003-1.010 (sailfins tolerate fresh to marine; sources found no reliable SG; keep low-brackish). Temp 75-82 F. Min 20 gal for a small group (sources 20-40).
- Animals: sailfin mollies (1 male per 2-3 females), guppy / Endler, nerites.
- Welfare: male fighting; prolific breeding (population plan); sailfin needs open swim for fins.
- CROSS-FAMILY FLAG: overlaps with a freshwater community tank; keep only if the salt story is shown.
- Sources: https://gensou.sg/sailfin-molly-brackish-care-guide/ ; https://thetropicaltank.co.uk/Fishindx/molly1.htm ; https://guidarium.com/compatibility/guppy-and-sailfin-molly ; https://forum.aquariumcoop.com/topic/8638-36-gallon-planted-brackish-community/

---

## Family 5: Brackish Planting

Plant evidence: sources are retailer / forum; cautious sources say Java fern yellows above SG 1.008 and Anubias is borderline at 1.005, while many keepers run both at 1.003-1.005. Cryptocoryne ciliata is the genuine estuarine crypt (no hard SG figure found). Dense stem-plant planting is not realistic in brackish.

### brackish-planted - "Fern & Wood"
- Tagline: "Green on wood in salty water; keep the salt low."
- Fingerprint: driftwood and river rock covered by Java fern, anubias and a patch of Cryptocoryne ciliata; clear water; white-grey sand; a small shoal in front.
- Contrast with closest sibling (brackish-meadow): plants grow ON wood and rock in tight clumps; the meadow is an open sand lawn of ribbon leaves.
- Baseline scene: 30-40 gal; sand 2 in; 2 wood pieces with ferns and anubias attached; Crypt. ciliata in the sand at the foreground edge; 3-6 small fish (Endlers, bumblebee gobies) in front; open 40 %.
- Density: open = 1 wood, a few ferns; balanced = 2 wood, ferns, anubias, crypt patch; full = overgrown wood with clustered crypt, ferns and anubias.
- Rendering needs: Java fern, anubias, crypt (ciliata long strap leaves) models with attachment points; driftwood; clear water; brackish SG label.
- Salinity SG 1.003-1.006 (hard cap about 1.008). Temp 74-80 F. Min 20 gal.
- Animals: Endlers, small mollies, bumblebee gobies, nerites, grass shrimp. Mangrove NOT in this archetype.
- Welfare: acclimate plants gradually; stable salinity; no shock changes.
- Sources: https://www.chewy.com/education/fish/general/4-brackish-water-plants-for-the-aquarium ; https://gensou.sg/?p=41811 ; https://gensou.sg/?p=41812 ; https://aka.org/community/plants-and-aquarium/plants-and-salt/

### brackish-meadow - "Estuary Grass Flat" (NEW; evidence-light)
- Tagline: "A green lawn in salty water; trim it before it takes over."
- Fingerprint: an open sandy bed with a ribbon-leaf Vallisneria lawn swaying in a current; small fish above; a few rocks; no wood, no mangrove.
- Contrast with closest sibling (brackish-planted): single-layer grass lawn with open sand and no hardscape; Fern & Wood is a clustered hardscape.
- Baseline scene: 30 gal long; sand 2-3 in; Vallisneria clumps in the back and sides; 2 rocks; open centre 50 %; moderate light.
- Density: open = few clumps at the back; balanced = lawn along the rear and sides; full = full-height meadow wall with a clear lane.
- Rendering needs: Vallisneria ribbon-blade meshes with sway; sand; gentle flow; light shafts.
- Salinity SG 1.002-1.006 (Vallisneria is anecdotal in forum lists; no verified cap). Temp 74-80 F. Min 20 gal.
- Animals: mollies, Endlers, nerites.
- Welfare: verify plant survival before offering; low brackish only.
- FALLBACK: if Vallisneria survival is not confirmed, replace with brackish-riparium (leaves above the rim, mangrove propagule and rim planters) and accept some overlap with mangrove-estuary.
- Sources: https://www.aquariadise.com/?p=7119 ; https://www.houstonfishbox.com/forum/freshwater-aquaria/general-brackish-discussion/25628- ; https://www.petshrimp.com/?p=4313
