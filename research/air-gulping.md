# Air gulping across the roster (R145, 2026-11-24)

Nathan's ask: which species on the roster gulp air at the surface, and add it in for them. Research by a Sonnet subagent
(FishBase first, then Seriously Fish, then papers), five missing sources filled by a second fetch. The swim-sim table this feeds
is `GULP` in `src/scene/fishBehavior.ts`; the trip itself is `startGulp` / `gulpStep` in `src/scene/swimSim.ts`.

## What went into the sim (GULP, trips per hour at about 77 F, normal oxygen)

| id | per hour | night (dark tank) x | trip | basis |
|---|---|---|---|---|
| betta | 12 | 1 | slow rise | estimate 6-12/h (no published figure) |
| dwarfgourami, honeygourami, gourami | 10 | 1 | slow rise | estimate 6-15/h |
| threespot | 12 | 1 | slow rise | estimate 6-15/h (FishBase: obligate) |
| sparklinggourami, croakinggourami | 15 | 1 | slow rise | estimate 10-30/h (Trichopsis, small body) |
| corys (bronze, peppered, panda, pygmy, sterbai, salt-and-pepper, false julii) | 4 | 1.3 | dart | FishBase C. aeneus "1 to 45 times per hour"; low end for normoxic water |
| pleco, bristlenose | 1 | 1.5 | dart | estimate 1-6/h; mostly when oxygen is short |
| oto | 2 | 1 | dart | estimate 1-3/h |
| kuhli | 1.5 | 1.5 | dart | estimate 1-3/h (FishBase: facultative, mechanism not given) |
| clownknife | 8 | 1 | slow rise | estimate 6-15/h (FishBase: obligate) |
| bichir | 4 | 1.5 | dart | estimate 2-6/h (FishBase: facultative). Not on this branch's roster yet (onboarded on claude/exciting-engelbart-800558); the key is ready for it |
| adf | 4 | 1 | dart | estimate 2-6/h |
| axolotl | 3 | 1 | dart | published 1.2-1.6 breaths / 30 min normoxic |
| firenewt | 2 | 1 | dart | estimate 1-4/h; only acts if the newt is in the swim sim |

Not in the sim although they breathe air: mystery snail and ramshorn (snails are not driven by the swim sim). In GULP but not acting yet: pleco, bristlenose, oto (sucker-mouth clingers, render/cling.ts) and adf, axolotl, firenewt (herps, render/crawl.ts) never enter the swim sim, so their rows wait for a surface trip in those movers (follow-up).

Seen on screen 2026-11-24 (dev server, forced trips, frames in research/screens/R145/): bronze cory (dart, about 0.3 s up, pitch 72), dwarf gourami (slow rise, about 1.8 s, pitch 44), kuhli (dart, pitch 72); each back at its spot afterwards, the other corys stayed on the floor. Day / night:
no source gives a day-night pattern; the night factor is judgement (the catfish, loaches and the bichir are more active in the dark).
Every rate rises a lot in warm or low-oxygen water (corys to 15-45/h); the sim does not model oxygen, so it uses the normoxic figure.

Not air-gulpers, by decision: goldfish, molly, guppy, endler, platy, swordtail do aquatic surface respiration (skim the surface film
when oxygen is low), which is a sign of bad water, not a habit; hatchetfish, killifish and pencilfish live at the surface but do not breathe air;
clown loach, yoyo loach and Panaque have no air-breathing record (low confidence: Armbruster 1998 full text not read).

## Per-species findings

Counts: {'no': 85, 'no-ASR': 6, 'yes': 25} (total 116). Marine fish and non-gill-breathing-invert 'no' rows are collapsed to generic names.

'opened' = fetched in this session; 'snippet' = search result only. Rows with 'estimate' are judgement. FishBase 'Ref. 126274' is the source of its air-breathing flags.

| id | species | gulps air? | kind | obligate/facultative | source (URL) | source wording / figure | frequency (normoxic; hypoxic/warm) | day/night | notes |
|---|---|---|---|---|---|---|---|---|---|
| neon | Paracheirodon innesi | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| cardinal | P. axelrodi | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| ember | Hyphessobrycon amandae | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| dwarfpencil | Nannostomus marginatus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| greenneon | P. simulans | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| merah | Boraras merah | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| exclamation | Boraras urophthalmoides | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| dwarfrasbora | Boraras maculatus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| rummynose | Hemigrammus rhodostomus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| blackskirt | Gymnocorymbus ternetzi | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| harlequin | Trigonostigma heteromorpha | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| chili | Boraras brigittae | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| danio | Danio rerio | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| whitecloud | Tanichthys albonubes | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| cpd | Danio margaritatus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| cherrybarb | Puntius titteya | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| tigerbarb | Puntigrus tetrazona | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| glowlight | Hemigrammus erythrozonus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| hatchet | Carnegiella strigata | no |  |  |  |  |  |  | FishBase page opened: no air-breathing field. Surface-living and leaps, but no accessory organ documented. |
| boesemani | Melanotaenia boesemani | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| neonrainbow | Melanotaenia praecox | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| glasscatfish | Kryptopterus vitreolus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| yoyoloach | Botia almorhae | no |  |  |  |  |  |  | FishBase page opened: no air-breathing field. Botiidae not documented as air-breathers (unlike Cobitidae, e.g. Misgurnus). Low confidence. |
| clownloach | Chromobotia macracanthus | no |  |  |  |  |  |  | FishBase page opened: no air-breathing field. Not documented. Low confidence. |
| clownpleco | Panaque maccus | no |  |  |  |  |  |  | FishBase page opened: no air-breathing field. Armbruster 1998 abstract (search snippet only, full text not read) names Hypostomus, Pterygoplichthys, Hemiancistrus, Lithoxus, not Panaque. Treated as no; UNVERIFIED against full text. |
| firemouth | Thorichthys meeki | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| peacockgudgeon | Tateurndina ocellicauda | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| clownkilli | Epiplatys annulatus | no |  |  |  |  |  |  | Killifish: no labyrinth or gut organ known; some killifish do ASR in hypoxia. Page not opened. |
| electricblueacara | Andinoacara pulcher | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| convict | Amatitlania nigrofasciata | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| gbr | Mikrogeophagus ramirezi | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| bolivianram | M. altispinosus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| kribensis | Pelvicachromis pulcher | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| cockatoo | Apistogramma cacatuoides | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| yellowlab | Labidochromis caeruleus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| peacock | Aulonocara stuartgranti | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| demasoni | Pseudotropheus demasoni | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| kadango | Copadichromis borleyi | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| labeo | Labeotropheus trewavasae | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| auratus | Melanochromis auratus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| livingstonii | Nimbochromis livingstonii | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| afra | Cynotilapia afra | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| syno | Synodontis njassae | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| angel | Pterophyllum scalare | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| discus | Symphysodon aequifasciatus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| oscar | Astronotus ocellatus | no |  |  |  |  |  |  | No air-breathing organ; hangs at surface in severe hypoxia (general knowledge). |
| sae | Crossocheilus oblongus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| balashark | Balantiocheilos melanopterus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| rainbowshark | Epalzeorhynchos frenatum | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| redtailshark | E. bicolor | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| hillstream | Sewellia lineolata | no |  |  |  |  |  |  | Hillstream loach of high-O2 torrents; no air-breathing organ known. |
| peapuffer | Carinotetraodon travancoricus | no |  |  |  |  |  |  | no air-breathing organ known (general knowledge; page not opened) |
| bambooshark | Chiloscyllium punctatum | no |  |  |  |  |  |  | Elasmobranch, gills only. |
| cleanershrimp | Lysmata amboinensis | no |  |  |  |  |  |  | Gills (general knowledge). |
| nerite | Neritina natalensis | no |  |  |  |  |  |  | Gill-breathing operculate prosobranch; may leave water but does not surface-gulp (general knowledge, page not opened). |
| trumpet | Melanoides tuberculata | no |  |  |  |  |  |  | Operculate gill-breathing prosobranch; tolerates low O2 by burrowing; no lung or siphon (general knowledge). |
| cherryshrimp | Neocaridina davidi | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| amano | Caridina multidentata | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| cpo | Cambarellus patzcuarensis | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| cajundwarf | Cambarellus shufeldtii | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| rswcrayfish | Procambarus sp. | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| redclaw | Cherax quadricarinatus | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| thaicrab | Thaiphusa sirikit | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| asellus | Asellus aquaticus | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| hermit | marine hermit crab | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| turbo | Turbo / Astraea snail | no |  |  |  |  |  |  | Gill-breathing crustacean or marine snail (general knowledge). Crayfish/crabs may emerge but do not surface-gulp. |
| ocellaris | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| royalgramma | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| yellowtang | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| bluetang | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| firefish | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| banggai | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| sixline | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| koletang | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| foxface | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| flameangel | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| lawnmowerblenny | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| orchiddottyback | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| pajamacardinal | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| yellowtailblue | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| tailspotblenny | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| chromis | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| coralbeauty | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| watchman | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| mandarin | marine fish | no |  |  |  |  |  |  | Marine fish, gills only. (Intertidal blennies can breathe air out of water but do not surface-gulp.) |
| goldfish | Carassius auratus | no-ASR | none (gills; mouth at surface film, no air swallowed) |  | https://www.fishbase.se/summary/Carassius-auratus.html |  |  |  | FishBase Carassius-auratus page opened: no air-breathing field. Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| molly | Poecilia sphenops | no-ASR | none (gills; mouth at surface film, no air swallowed) |  |  |  |  |  | Poecilia ASR well known (general knowledge, not opened). Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| guppy | Poecilia reticulata | no-ASR | none (gills; mouth at surface film, no air swallowed) |  |  |  |  |  | Guppy ASR in hypoxia is documented (general knowledge, not opened). Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| endler | Poecilia wingei | no-ASR | none (gills; mouth at surface film, no air swallowed) |  |  |  |  |  | As guppy (estimate). Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| platy | Xiphophorus maculatus | no-ASR | none (gills; mouth at surface film, no air swallowed) |  |  |  |  |  | Livebearers do ASR in low O2 (general knowledge). Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| swordtail | X. hellerii | no-ASR | none (gills; mouth at surface film, no air swallowed) |  |  |  |  |  | Livebearers do ASR in low O2 (general knowledge). Skims the oxygen-rich surface film only when O2 is low; not true air-gulping. Hangs at surface rather than periodic dashes. |
| betta | Betta splendens | yes | labyrinth | facultative (FishBase) | https://www.fishbase.se/summary/Betta-splendens.html | "Facultative air-breathing"; "Air breather and bubble nest builder" | published: none found; estimate normoxic ~6-12 breaths/h, warm/hypoxic ~20-40/h (estimate); display raises air-breathing 2.3x (Alton et al. 2013, via search snippet) | no day/night data | Labyrinth not named on FishBase page (general knowledge). Males surface in synchrony. Conductscience page opened: no rates. |
| threespot | Trichopodus trichopterus | yes | labyrinth | obligate (FishBase) | https://www.fishbase.se/summary/Trichopodus-trichopterus.html | "Obligate air-breathing" | none published; estimate ~6-15/h normoxic, 20-40/h hypoxic/warm (estimate) | no data | Mendez-Sanchez & Burggren 2017 (search snippet only): air-breathing-organ ventilation Q10 ~3.7 in juveniles. |
| croakinggourami | Trichopsis vittata | yes | labyrinth | obligate (FishBase) | https://www.fishbase.se/summary/Trichopsis-vittata.html | "Obligate air-breathing (Ref. 126274)" | none; estimate ~10-30/h (estimate, small body) | no data |  |
| sparklinggourami | Trichopsis pumila | yes | labyrinth | obligate (congener inference; estimate) | https://www.fishbase.se/summary/Trichopsis-vittata.html (congener page only) | Congener T. vittata listed obligate | estimate ~10-30/h; more in hypoxia | no data | T. pumila page not opened. |
| gourami | Trichopodus leerii | yes | labyrinth | facultative to obligate (estimate) | https://www.seriouslyfish.com/species/trichopodus-leerii/ | Seriously Fish: "a labyrinth fish from Thailand, Malaysia, Borneo and Sumatra" | estimate ~6-15/h normoxic, 20-40/h hypoxic/warm (estimate) | no data | Page confirms labyrinth class only; no rates. |
| dwarfgourami | Trichogaster lalius | yes | labyrinth | facultative to obligate (estimate) | https://www.fishbase.se/summary/Trichogaster-lalius.html | "Facultative air-breathing"; "An air-breathing species" (FishBase) | estimate ~6-15/h normoxic, 20-40/h hypoxic/warm (estimate) | no data | Labyrinth fish: general knowledge, page not opened. |
| honeygourami | Trichogaster chuna | yes | labyrinth | facultative to obligate (estimate) | https://www.fishbase.se/summary/Trichogaster-chuna.html | "Facultative air-breathing" (FishBase) | estimate ~6-15/h normoxic, 20-40/h hypoxic/warm (estimate) | no data | Labyrinth fish: general knowledge, page not opened. |
| bronzecory | Corydoras aeneus | yes | intestinal (posterior intestine) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html | "1 to 45 times per hour"; "facultative air-breathing" | published range 1-45/h; hypoxia (20% sat) raised group breaths ~45% vs 60/100% sat; 30C vs 25C more group breaths (Pineda et al. 2020, https://pmc.ncbi.nlm.nih.gov/articles/PMC7673363, opened); normoxic estimate ~2-6/h | FishBase: nocturnal, benthic; Pineda did not test day/night | Kramer & McClure 1980 (Can J Zool 58:1984, abstract via search snippet): posterior intestine, rapid dash to surface, survived 9 days without air access in normoxia. |
| pepperedcory | Corydoras paleatus | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. |
| pandacory | Corydoras panda | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. |
| pygmycory | Corydoras pygmaeus | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. Midwater pygmy cory may surface less; uncertain. |
| sterbai | Corydoras sterbai | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. |
| saltpepper | Corydoras habrosus | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. |
| falsejulii | Corydoras trilineatus | yes | intestinal (genus; congener inference) | facultative | https://www.fishbase.se/summary/Corydoras-aeneus.html (congener page; species page not opened) | Genus air-breathes via intestine (C. aeneus) | none species-specific; estimate 2-6/h normoxic, 15-45/h hypoxic/warm (estimate from C. aeneus range) | no data | Species page not opened. |
| pleco | Hypostomus plecostomus | yes | stomach (air-holding, enlarged thin-walled) | facultative | https://www.fishbase.se/summary/Hypostomus-plecostomus.html | "Facultative air-breathing"; Armbruster 1998 lists Hypostomus with enlarged stomach (search snippet) | none; estimate 1-6/h normoxic, 10+/h hypoxic/warm (estimate) | no data | Armbruster 1998 Copeia 663-675; full text not read. |
| bristlenose | Ancistrus sp. | yes (probable) | stomach (air-holding; genus-level, moderate confidence) | facultative | UNSOURCED (Seriously Fish 404, PlanetCatfish 403) | genus inference from loricariid air-holding stomachs; needs a source | estimate 1-4/h normoxic, 8-20/h hypoxic/warm (estimate) | no data | UNVERIFIED in opened sources; treat as probable-yes. |
| oto | Otocinclus vittatus | yes | esophageal diverticulum | facultative | https://www.fishbase.se/summary/Otocinclus-vittatus.html | "Facultative air-breathing in the genus (Ref. 126274)"; Practical Fishkeeping (opened): "primitive lung when oxygen levels are low" | none; estimate 1-3/h normoxic, 6-15/h hypoxic/warm (estimate) | no data | https://www.practicalfishkeeping.co.uk/features/keeping-otocinclus-catfish-in-the-aquarium/ ; pouch also buoyancy organ. |
| kuhli | Pangio kuhlii | yes (mechanism unconfirmed) | unconfirmed, likely intestinal (Cobitidae; estimate) | facultative | https://www.fishbase.se/summary/Pangio-kuhlii.html | "Facultative air-breathing" (Ref. 126274); no mechanism given | none; estimate 1-3/h normoxic, 6-15/h hypoxic/warm (estimate) | no data | Seriously Fish Pangio kuhlii page opened: no air-breathing mention. Intestinal route documented for Misgurnus, not confirmed for Pangio in sources opened. |
| clownknife | Chitala ornata | yes | swim-bladder (air-breathing gas bladder; organ from general knowledge, not on FishBase) | obligate (FishBase) | https://www.fishbase.se/summary/Chitala-ornata.html | "obligate air-breathing" (page names no organ) | none; estimate ~6-15/h, more in warm/hypoxic water (estimate) | no data |  |
| bichir | Polypterus senegalus | yes | lungs (paired) | facultative (FishBase) | https://www.fishbase.se/summary/Polypterus-senegalus.html | "Facultative air-breathing"; surfaces in hottest hours | none; estimate ~2-6/h normoxic, 15-30/h warm/hypoxic (estimate) | FishBase: surfaces during hottest hours of day | Page does not mention lungs; lungs from general knowledge. |
| mystery | Pomacea diffusa | yes | lung + siphon (plus gill) | obligate in P. canaliculata (PeerJ 2021 snippet); facultative in practice for gill-retaining Pomacea (sources conflict) | https://applesnail.net/content/anatomy/respiration.htm | Lung is an air-filled sac; siphon about 2.5x shell length when stretched | none; estimate 1-3/h normoxic, 6-12/h warm/hypoxic (estimate) | no data | PeerJ and PMC full texts gave 403/captcha, not read. Species page not opened: genus inference. |
| ramshorn | Planorbella duryi | yes | pulmonary sac (pneumostome) | facultative (also cutaneous; hemoglobin allows long dives) | https://en.wikipedia.org/wiki/Planorbella_duryi | "air-breathing freshwater snail, a pulmonate gastropod" | none; estimate 1-4/h normoxic, 6-15/h hypoxic/warm (estimate) | no data | No P. duryi data; Lymnaea study (Zink & Wood 2025, snippet) shows surfacing tied to falling O2. |
| adf | Hymenochirus boettgeri | yes | lungs | obligate (adults) | https://www.nature.com/articles/188869a0.pdf (search result only, not opened) | Nature 1961 note: surfacing "about every second minute" during spawning | normoxic: no data, estimate 2-6/h (estimate); spawning ~30/h | no data | FishBase page not in public version; no frequency study found. |
| axolotl | Ambystoma mexicanum | yes | lungs (plus gills, skin) | facultative | https://sicb.org/?p=23473 | Per 30 min: still 1.6, aerated 1.2-1.6, hypoxic 6.0-9.0 (non-floaters/recovered) | normoxic ~2.4-3.2/h; hypoxic (1.1 mg/L) 12-18/h; floating-syndrome animals 0.4-3.2/h | not given | Warmer (20 vs 11 C) gives more breaths (Czech thesis, search snippet). |
| firenewt | Cynops orientalis | yes | lungs (plus skin) | facultative | UNSOURCED (Wikipedia silent, AmphibiaWeb bot check) | general: salamandrids have lungs; needs a source | none; estimate 1-4/h normoxic, 6-12/h warm/hypoxic (estimate) | no data | No source opened; general knowledge. |
