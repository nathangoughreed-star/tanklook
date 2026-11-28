# Aggression and predation audit (lane BR follow-up, 2026-11-28)

Scope: every water species in `species.json` (115; 99 of them fish). Rules read: `care.ts` (temper, nip, slow, feelers, prey, guard, solo, alone), `animalfit.ts` `preyRisk` / `whysAnimal`, `scene/foes.ts` `foesOf`. Nothing in the data or the rules was changed; Nathan decides.
Dump script: `research/aggression-audit-dump.ts.txt` (copy it to `test/`, run vitest on that one file with `OUT=<file>`). It writes one row per species with what `whysAnimal` flags from that species' side, pair by pair.

## How much to trust this
- Sources were mostly SeriouslyFish (seriouslyfish.com), Aquarium Co-Op, and hobby or retail care pages. The research agents read them through summarizing fetches, so quotes are second-hand. FishBase and papers were not reached.
- Almost no source gives a largest-prey size. The numbers in `prey.mm` (bichir, knifefish, shark, crayfish, oscar, hermit, sixline) are still estimates, as the code comments say. This audit confirms direction (eater or not), not inches.
- Per `ruleStatus.ts`, a rule with no source stays capped at Caution. Anything below marked low should stay a judgment rule if added.
- Questions to Nathan about a pair need a picture of the two fish in a tank. None are posed here, so none were made. The pairs worth asking about are listed at the end.

## Where our rules stand
Of 99 fish, 11 have a predator rule, 12 are marked researched-harmless, and 76 were never researched (no rule, so nothing flags). Predator rules exist for: `gbr`, `livingstonii`, `angel`, `clownknife`, `bambooshark`, `bichir`, `oscar`, `clownloach`, `balashark`, `peapuffer`, `sixline` (plus hermit crab, crayfish, axolotl and the reptiles).

## Highest-impact mismatches
Ranked by how many pairs or how common a stocking they touch. "Nathan decides" applies to every row.

| # | Species | Our rule | Sources say | Proposed change | Conf. |
|---|---|---|---|---|---|
| 1 | Angelfish (`angel`) | eats prey up to 1.2 in (30 mm) | SeriouslyFish: "may eat small fish such as tetras". Hobby care pages: anything that fits the mouth. One care site says a 3-4 in angel swallows a full-grown neon. No source gives a maximum size. | 1.8 in (46 mm): flags neon (38 mm), cardinal (45), ember, green neon, rasboras. Rummynose (50) stays clear. | med |
| 2 | 76 fish never researched | no rule, so no flag | Sources name small-prey eaters among them: goldfish (fry, "anything that fits"), cherry barb (shrimp, its own fry), Malawi synodontis ("fish so small as to be considered food"), yoyo loach (snails, shrimp). | Add a small rule where a source names the prey (rows below). Mark harmless only when a source says so. | med/low |
| 3 | Nimbochromis livingstonii | temper 2 | SeriouslyFish: generally peaceful with fish too big to eat, but an exclusive fish-eater. The 3.1 in prey cap has no source and may be low. | temper 1, keep the mouth rule. | low-med |
| 4 | German blue ram (`gbr`) | eats fw-invert up to 1.2 in, young up to 2.4 in | SeriouslyFish names no fish or shrimp prey. The rule flags cherry shrimp and amano against a gentle dwarf cichlid. | Drop it, or limit it to fry size. | med |
| 5 | Peapuffer | eats prey up to 1.8 in | The fish is 1.2 in long. Sources support nip, temper 2 and species-only tank. | Cap about 0.8 in (tiny shrimp, snails). | low-med |
| 6 | Black skirt tetra | temper 1: harasses long fins of guppy, betta, angel, discus | SeriouslyFish: "generally peaceful", a better community tetra, "a bit of a fin nipper", fixed by a shoal of 12 or more. | temper 0, keep nip (the nip flag keeps the longfin pairs). | med |
| 7 | Zebra danio | nip | SeriouslyFish does not mention nipping and says "very peaceful indeed". One source only. | Drop nip only after a second source. Today it flags five longfin pairs. | low |
| 8 | Clown loach | no nip | SeriouslyFish: nips trailing fins of slow, long-finned fish (bettas, guppies). | Add nip. | med |
| 9 | Yoyo loach | nip; no snail or shrimp rule | Aquarium Co-Op: keep away from snails and shrimp. SeriouslyFish: botiids prey on snails. | Add a snail/shrimp predator rule (clown loach has one). | med |
| 10 | Orchid dottyback, pajama cardinal, watchman goby | dottyback and cardinal harmless; watchman none | Practical Fishkeeping: dottyback is a natural predator of small shrimp. Care guides: cardinal may eat small shrimp. Watchman: only one unless a mated pair. | dottyback, cardinal: small sw-invert eater about 1 in (low-med). Watchman: `solo` (med). | low-med |
| 11 | Fire-bellied newt, ADF | no rule | Newt eats shrimp it can catch. ADF eats or tastes small shrimp and nips long fins by mistake (poor eyesight). | Small fw-invert eater about 1.2 in for both (low). Newt also coolwater, no fish. | low |
| 12 | Sparkling gourami | harmless | SeriouslyFish: some aquarists report small shrimp eaten. | Flag shrimp as a risk. | low-med |
| 13 | Peacock gudgeon | no guard | Male holds a cave and guards eggs almost constantly. | Add `guard`. | med |

Also from the notes: banggai cardinal, mandarin and firefish have sourced conspecific aggression but no `solo`; pleco (one per tank) rests on retail guides only.

## The angelfish -> neon case
- `angel.prey.mm` is 30. Neon is 38 mm, cardinal 45, ember 23, green neon 30, rummynose 50, glowlight 48. So 30 mm already catches ember, green neon and the dwarf rasboras (23-30 mm) but not neon.
- The rule is length-only and an angel is deep-bodied, so mouth width might be a better gate. No source here gives a gape width; that needs a separate pass.
- Young angels: `preyRisk` scales the mouth by the angel's current length, so a 2 in angel takes no neon. That matches keeper advice that angels eat neons once adult.
- Fish-eaters sourced but not flagged today: goldfish and comet (small fish and fry). Their mouth sizes are not sourced either.

## Pairs worth asking Nathan about (pictures to render when he wants them)
1. Angelfish with neon, cardinal and ember tetras (row 1).
2. German blue ram with cherry shrimp (row 4).
3. Goldfish with cherry shrimp and guppy fry (nothing flagged today).
4. Black skirt tetra with guppy and betta (row 6).
5. Orchid dottyback with cleaner shrimp (row 10).

## Per-species detail
Raw research notes, one section per species: our rule line, what sources say, verdict (AGREE, MISMATCH, NO DATA), proposed change, confidence, URLs. Group 1: tetras, rasboras, barbs, rainbows, livebearers, goldfish. Group 2: catfish, loaches, sharks, gouramis, bettas, cichlids, big predators. Group 3: inverts, amphibians, saltwater. Where a notes file says "SF", it means https://www.seriouslyfish.com/species/<slug>/.


### Group g1 notes (40 species; input line 31 held comet + yoyoloach merged)
Base URL pattern: SF = https://www.seriouslyfish.com/species/<genus-species>/ . SeriouslyFish (SF) pages rarely state a max prey size; "none found" for prey size means that. All predation fields are NO DATA in the data; verdicts below address temper/nip/longfins plus a proposed eatsPreyUpTo only where a source supports one.
Caveat: pages were read through a summarizer (WebFetch); quotes are as returned.

#### neon (Neon tetra)
- Data line: temper=0, 1.5in, no predation data
- Prey: omnivore, small invertebrates/crustaceans/algae/fruit; no adult prey size. Fry: microworm/BBS. Harmless to adult fish/shrimp implied, not stated.
- Nips-harasses: not mentioned
- Aggression: "Generally peaceful"; fine with others
- Territory: none; females rounder, larger
- Verdict: AGREE (temper); predation NO DATA
- Proposed change: eatsPreyUpTo ~0.3in (fry/baby shrimp only) - low
- Confidence: high (temper) / low (prey)
- URLs: https://www.seriouslyfish.com/species/paracheirodon-innesi/

#### cardinal (Cardinal tetra)
- Data line: temper=0, 1.8in
- Prey: omnivore, small invertebrates; no size
- Nips: not mentioned
- Aggression: "Generally peaceful"
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/paracheirodon-axelrodi/

#### ember (Ember tetra)
- Data line: temper=0, 0.9in
- Prey: micropredator on tiny invertebrates/zooplankton; "does not normally hunt fry"
- Nips: not mentioned; will not compete with boisterous/larger tankmates
- Aggression: calm
- Territory: none
- Verdict: AGREE
- Proposed change: none; mark as prey-vulnerable/timid - low
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/hyphessobrycon-amandae/

#### dwarfpencil (Dwarf pencilfish)
- Data line: temper=0, 1.4in
- Prey: micropredator on tiny invertebrates; "does not actively predate fry"
- Nips: not mentioned (rival males "rarely spar or do each other harm")
- Aggression: "Very peaceful", timid
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/nannostomus-marginatus/

#### greenneon (Green neon tetra)
- Data line: temper=0, 1.2in
- Prey: omnivore, small invertebrates; no size
- Nips: not mentioned
- Aggression: peaceful; ideally alone or with diminutive non-aggressive characids
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/paracheirodon-simulans/

#### merah (Strawberry rasbora)
- Data line: temper=0, 0.9in
- Prey: micropredator on small insects/worms/zooplankton; bloodworm hard to swallow unless chopped. Compatible with Caridina/Neocaridina shrimp ("in planted tanks")
- Nips: not mentioned
- Aggression: "very peaceful", timid
- Territory: dominant males form temporary territories when spawning
- Verdict: AGREE
- Proposed change: none (shrimp-safe adult)
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/boraras-merah/

#### exclamation (Exclamation point rasbora)
- Data line: temper=0, 0.7in
- Prey: micropredator zooplankton; shrimp (Caridina/Neocaridina) listed as tankmates
- Nips: not mentioned
- Aggression: very peaceful, timid
- Territory: dominant males temporary territories when spawning
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/boraras-urophthalmoides/

#### dwarfrasbora (Dwarf spotted rasbora)
- Data line: temper=0, 1.2in
- Prey: micropredator zooplankton; shrimp listed as tankmates
- Nips: not mentioned
- Aggression: very peaceful, timid
- Territory: temporary spawning territories (males)
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/boraras-maculatus/

#### rummynose (Rummy-nose tetra)
- Data line: temper=0, 2.0in
- Prey: omnivore, small mouth ("correspondingly-sized foods"); no predation noted
- Nips: not mentioned
- Aggression: "very peaceful"; won't compete with boisterous/large tankmates
- Territory: none; needs group 10+
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/hemigrammus-rhodostomus/

#### blackskirt (Black skirt tetra)
- Data line: temper=1, nip, 2.8in
- Prey: unfussy omnivore; no fish/shrimp prey info
- Nips: "a reputation as a bit of a fin nipper"; "can usually be rectified" with a shoal of 12+
- Aggression: "generally peaceful and lively"; "one of the better tetras for the general community tank"
- Territory: none
- Verdict: MISMATCH (temper too strict): SF calls it peaceful; nip is the valid flag, conditional on group size
- Proposed change: temper 0, keep nip (maybe "nip only if shoal under 6-12") - med
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/gymnocorymbus-ternetzi/

#### harlequin (Harlequin rasbora)
- Data line: temper=0, 2.0in
- Prey: micropredator zooplankton; no size
- Nips: not mentioned
- Aggression: "very peaceful indeed"; schooling
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/trigonostigma-heteromorpha/

#### chili (Chili rasbora)
- Data line: temper=0, 0.9in
- Prey: micropredator zooplankton; no size
- Nips: not mentioned
- Aggression: very peaceful, timid; shrimp listed as tankmates
- Territory: dominant males temporary spawning territories
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/boraras-brigittae/

#### danio (Zebra danio)
- Data line: temper=0, nip, 2.0in
- Prey: micropredator on small crustaceans/mosquito larvae; "unfussy"; no size
- Nips: SF does not mention fin-nipping at all
- Aggression: "very peaceful indeed"; males compete for females only
- Territory: none
- Verdict: MISMATCH (nip flag unsupported by SF; might be too strict). Not verified with a second source.
- Proposed change: consider dropping nip or keep as low-risk; needs a second source (e.g. Aquarium Co-Op) - low
- Confidence: low
- URLs: https://www.seriouslyfish.com/species/danio-rerio/

#### whitecloud (White cloud mountain minnow)
- Data line: temper=0, 1.6in
- Prey: micropredator small insects/zooplankton; no size
- Nips: not mentioned
- Aggression: "Very peaceful indeed"; mature males spar regularly; not a suitable goldfish companion
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/tanichthys-albonubes/ ; https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates (longfin white clouds are caught by goldfish)

#### cpd (Celestial pearl danio)
- Data line: temper=0, 1.0in
- Prey: small invertebrates/zooplankton; eats own eggs
- Nips: "not uncommon to see nipped fins within a group" but "does not normally extend to tankmates"
- Aggression: dominant males combative within group; timid, may be intimidated by larger tankmates
- Territory: rival males spar daily; no territory guarding
- Verdict: AGREE (temper 0 toward tankmates; intra-species sparring only)
- Proposed change: none - low value
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/danio-margaritatus/

#### hatchet (Marbled hatchetfish)
- Data line: temper=0, 1.6in
- Prey: surface invertebrates (small insects, Drosophila, young crickets); "does not actively predate fry"
- Nips: not mentioned
- Aggression: very peaceful, timid
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/carnegiella-strigata/

#### cherrybarb (Cherry barb)
- Data line: temper=0, 2.2in
- Prey: adults hunt own fry; larger amano shrimp usually coexist but barbs "may go after adult cherry shrimp" (anecdote-level advice from the Co-Op article)
- Nips: not described as a nipper ("exception to the rule" among barbs)
- Aggression: not aggressive; male chasing mild
- Territory: none
- Verdict: AGREE (temper); SF page 404 under pethia-titteya, SF not read
- Proposed change: possibly cherry shrimp not safe - low
- Confidence: med
- URLs: https://aquariumcoop.com/blogs/aquarium/cherry-barb ; (search listing only) https://en.wikipedia.org/wiki/Cherry_barb

#### tigerbarb (Tiger barb)
- Data line: temper=2, nip, 2.8in
- Prey: omnivore on aquatic invertebrates; small foods only
- Nips: "notoriously aggressive with a reputation for biting the fins of other fishes"; pronounced when kept in too small a group (<8-10) or cramped; avoid timid, slow, long-finned species (livebearers, cichlids, anabantoids)
- Aggression: males boisterous
- Territory: none
- Verdict: AGREE (note SF says nipping is group-size dependent: 8-10+ lessens it)
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/puntigrus-tetrazona/

#### boesemani (Boeseman's rainbowfish)
- Data line: temper=0, 4.3in
- Prey: unfussy; predation of fish not covered; adults "tend not to eat the spawn"
- Nips: not mentioned; "can disturb smaller or slow-moving fish with its rapid movements and relatively large size"
- Aggression: "Very peaceful"; skittish; males display to each other
- Territory: none
- Verdict: AGREE (temper); consider note that it is boisterous towards small/slow fish
- Proposed change: eatsPreyUpTo none found; keep unset - low
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/melanotaenia-boesemani/

#### guppy (Guppy)
- Data line: temper=0, longfins, 1.5in
- Prey: eats fry ("adult fish will eat the young"), mosquito larvae; shrimp not mentioned
- Nips: not a nipper; is a victim: "Do not keep with fin-nipping species such as tiger" barbs and serpae tetras
- Aggression: "very peaceful"; males relentlessly pursue females
- Territory: none
- Verdict: AGREE (longfins fits)
- Proposed change: none; could add eatsPreyUpTo ~0.4in (newborn fry only) - low
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/poecilia-reticulata/

#### endler (Endler's livebearer)
- Data line: temper=0, longfins, 1.1in
- Prey: omnivore; adults "rarely eat their young"
- Nips: not mentioned; males extended fins (longfins plausible)
- Aggression: males peaceful with each other; females may be territorial; males harass females
- Territory: females "quite territorially"
- Verdict: AGREE (temper 0 acceptable); longfins weak: Endler males have shorter fins than guppies, the SF page does not call them long-finned
- Proposed change: none - low
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/poecilia-wingei/

#### glasscatfish (Glass catfish)
- Data line: temper=0, 3.1in
- Prey: "Probably a predator feeding on small invertebrates and zooplankton"; "may predate on eggs or fry"; no size given
- Nips: not mentioned
- Aggression: peaceful, timid
- Territory: none
- Verdict: AGREE (temper); predation NO DATA beyond small invertebrates/fry
- Proposed change: eatsPreyUpTo ~0.5in (small fry/baby shrimp) - low
- Confidence: low (page returned through summarizer; check mapped to Kryptopterus vitreolus page)
- URLs: https://www.seriouslyfish.com/species/kryptopterus-vitreolus/

#### neonrainbow (Neon dwarf rainbowfish)
- Data line: temper=0, 3.8in
- Prey: omnivore; no predation noted
- Nips: not mentioned
- Aggression: "Very peaceful"; males display to each other; skittish
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/melanotaenia-praecox/

#### peacockgudgeon (Peacock gudgeon)
- Data line: temper=1, 3.5in
- Prey: prefers small live/frozen food; eats eggs of others? Page says other fish "will eat the eggs" of the gudgeon. No fish/shrimp predation stated
- Nips: not mentioned
- Aggression: "A little territorial with its own kind"; squabbling is display and flaring; caution with other territorial dwarf cichlids
- Territory: male holds cave, ejects female after spawning and guards eggs almost constantly -> guardsTerritory
- Verdict: AGREE (temper 1 reasonable; could be 0 with other species); add guardsTerritory
- Proposed change: guardsTerritory true (male, cave) - med
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/tateurndina-ocellicauda/

#### clownkilli (Clown killifish)
- Data line: temper=0, 1.7in
- Prey: larger invertebrates risk to eggs; older fry eat younger; adults do not eat own offspring; fish prey not listed (Epiplatys are surface micro-predators in the wild; no source read)
- Nips: not mentioned
- Aggression: "Peaceful with other species"; males spar but rarely harm
- Territory: none noted
- Verdict: AGREE; predation unresolved (killifish are mouth-limited predators; no source found)
- Proposed change: none
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/epiplatys-annulatus/

#### glowlight (Glowlight tetra)
- Data line: temper=0, 1.9in
- Prey: unfussy; larger fish (angelfish) may eat it
- Nips: not mentioned
- Aggression: "lively, quite colourful and peaceful"
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/hemigrammus-erythrozonus/

#### platy (Platy)
- Data line: temper=0, 1.6in
- Prey: "The adult fish will not eat their young"; shrimp not mentioned
- Nips: not mentioned
- Aggression: "Very peaceful... none of the aggression of some swordtails and mollies"; males relentless toward females; keep several females per male
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/xiphophorus-maculatus/

#### molly (Black molly)
- Data line: temper=0, 3.3in
- Prey: "The adult fish will predate on the young"; shrimp not mentioned
- Nips: not mentioned
- Aggression: peaceful; males incessantly pursue females
- Territory: none
- Verdict: AGREE (temper). Fry predation confirmed.
- Proposed change: eatsPreyUpTo ~0.5in (fry only) - low
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/poecilia-sphenops/

#### swordtail (Swordtail)
- Data line: temper=1, 4.3in
- Prey: wild: aquatic and terrestrial invertebrates; fry/shrimp predation not addressed on page
- Nips: not mentioned
- Aggression: SF quick-facts list "fine with others"; "groups of males tend to form dominance hierarchies"; platy page notes "some swordtails and mollies" are more aggressive than platies
- Territory: dominance hierarchies, no territory guarding
- Verdict: AGREE (temper 1 reasonable; SF itself is mixed)
- Proposed change: none
- Confidence: low-med
- URLs: https://www.seriouslyfish.com/species/xiphophorus-hellerii/ ; https://www.seriouslyfish.com/species/xiphophorus-maculatus/

#### goldfish (Fancy goldfish)
- Data line: temper=0, 8.0in
- Prey: "most sources agree goldfish will eat anything that fits in their mouths"; Co-Op: avoid species "small enough to fit in their mouths"; "will happily eat most of the fry" (platy fry); shrimp are common casualties per third-party guides; small spiny fish (otocinclus, corydoras) can lodge in gill plate
- Nips: article does not describe nipping; goldfish mouth other fish; larger underfed plecos suck slime coats
- Aggression: not aggressive; fancy goldfish slow, more likely to be bullied; fast barbs only for common/comet
- Territory: none
- Verdict: AGREE (temper 0); predation gap: eatsPreyUpTo missing. NO DATA for an inch figure; no source gave a size
- Proposed change: eatsPreyUpTo ~ body-fit rule (mouth of 8 in fancy about 1 in prey; no sourced number) - low
- Confidence: low
- URLs: https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates ; (search listing) https://www.hepper.com/do-goldfish-eat-each-other-or-other-fish/

#### comet (Comet goldfish)
- Data line: temper=0, 9.8in
- Prey: same as goldfish; Co-Op: comet/common goldfish "are fast and more likely to swallow things they shouldn't"
- Nips: none described
- Aggression: not aggressive; fast, robust; fine with fast barbs
- Territory: none
- Verdict: AGREE (temper); NO DATA for predation figure
- Proposed change: eatsPreyUpTo at least that of fancy (larger body, faster) - low
- Confidence: low
- URLs: https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates

#### yoyoloach (Yoyo loach)
- Data line: temper=1, nip, 6.3in
- Prey: "most botiids prey on aquatic snails"; Co-Op: "keep away from snails and shrimp"; small fish not explicitly listed as prey
- Nips: avoid slow, long-finned fish (bettas, guppies, many cichlids) because "trailing fins can be nipped"
- Aggression: "Not especially aggressive but much smaller fishes may be intimidated by its size"; "relatively mild temperament" but ornery with each other; keep 6+; singly kept "can become withdrawn or aggressive"
- Territory: dominance hierarchy, fights when new fish are introduced
- Verdict: AGREE (nip); temper 1 slightly strict (SF: not especially aggressive) but defensible
- Proposed change: add shrimp/snail predator flag (eats snails, shrimp) - med
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/botia-almorhae/ ; https://www.aquariumcoop.com/blogs/aquarium/yoyo-loach

#### clownpleco (Clown pleco)
- Data line: temper=0, 3.9in
- Prey: wood eater/biofilm; no fish or shrimp predation reported in search summaries
- Nips: none found
- Aggression: peaceful; territorial issues over caves/space with other bottom dwellers (anecdote/retail guides)
- Territory: cave disputes; no breeding guard noted in sources read
- Verdict: AGREE (low evidence). SF page 404; only retail/guide listings surfaced
- Proposed change: none
- Confidence: low
- URLs: https://www.hepper.com/clown-pleco/ ; https://www.planetcatfish.com/L104 (search listing only, not read)

#### saltpepper (Salt and pepper corydoras)
- Data line: temper=0, 1.7in
- Prey: omnivore on sinking foods; no fish/shrimp predation mentioned
- Nips: not mentioned; harmless
- Aggression: "Peaceful and gregarious", fine with others
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/corydoras-habrosus/

#### falsejulii (False julii corydoras)
- Data line: temper=0, 2.6in
- Prey: omnivore; eats eggs and "bite-sized fry"; shrimp not stated
- Nips: none
- Aggression: very peaceful; hostility to other species "almost unheard of"
- Territory: none
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/corydoras-trilineatus/

#### pleco (Common pleco)
- Data line: temper=1, 15.0in
- Prey: algae/plant eater; no fish predation
- Nips: slime-coat sucking on goldfish reported mainly with larger underfed plecos (Co-Op)
- Aggression: adults territorial with other plecos and can injure tankmates with armor/tail per search-summaries; sources disagree ("mostly peaceful" vs territorial); sizes quoted 15-24 in
- Territory: territorial over caves/floor space
- Verdict: AGREE (temper 1 plausible). SF page 404; evidence is retail-guide level
- Proposed change: onePerTank for same genus - low
- Confidence: low
- URLs: https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates ; (search listing) https://www.tfhmagazine.com/articles/freshwater/hypostomus-plecostomus

#### threespot (Three-spot gourami)
- Data line: temper=1, feelers, 7.1in
- Prey: plants, algae, small invertebrates, zooplankton; fry cannibalism noted among own fry; no tank-fish predation stated
- Nips: not mentioned
- Aggression: "Some individuals can become very spiteful as they mature, while others remain peaceful"; males territorial and squabble; hard on females in breeding
- Territory: males territorial; breeding male hard on females
- Verdict: AGREE (temper 1; perhaps varies to 2 for some individuals)
- Proposed change: none
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/trichopodus-trichopterus/

#### betta (Betta)
- Data line: temper=1, longfins, onePerTank, 2.6in
- Prey: invertebrates in nature; shrimp safety not stated on SF; Co-Op says depends on individual
- Nips: avoids trailing-fin tankmates "a male may view these as rivals"
- Aggression: ornamental strains "more aggressive than any other" Betta; "Not recommended for the standard community aquarium"; "only a single individual can be kept per tank in most cases"
- Territory: nest-building male intolerant of females
- Verdict: AGREE (note SF is stricter on community suitability: possibly temper 2 vs. fin-flowy rivals; keep 1 if temper is community-wide)
- Proposed change: none; optional: temper 1 -> 2 toward fin-flowy tankmates - low
- Confidence: med
- URLs: https://www.seriouslyfish.com/species/betta-splendens/

#### dwarfgourami (Dwarf gourami)
- Data line: temper=1, feelers, 3.1in
- Prey: small invertebrates in diet; shrimp "can also work well" but eating not stated (inference)
- Nips: not mentioned
- Aggression: "both shy and territorial"; bettas or showy fish like guppies "can cause some male dwarf gouramis to become very aggressive"; two males "a recipe for disaster"; male hard on females
- Territory: male intolerant of mate after spawning
- Verdict: AGREE
- Proposed change: none
- Confidence: med-high
- URLs: https://www.seriouslyfish.com/species/trichogaster-lalius/

#### honeygourami (Honey gourami)
- Data line: temper=0, feelers, 2.4in
- Prey: insects/small invertebrates; shrimp not addressed; does not warn against fry predation
- Nips: not mentioned
- Aggression: not aggressive; "easily intimidated or outcompeted for food by larger or more vigorous tankmates"; avoid territorial species
- Territory: dominant fish defend a favourite spot; males chase females after spawning
- Verdict: AGREE
- Proposed change: none
- Confidence: high
- URLs: https://www.seriouslyfish.com/species/trichogaster-chuna/

#### Summary of MISMATCH
- blackskirt: temper 1 too strict (SF "generally peaceful"; nip valid)
- danio: nip unsupported by SF (low conf; second source needed)

### g2 aggression/predation notes
SF = https://www.seriouslyfish.com/species/<slug>/ . Almost no SF page gives a numeric prey size; "none found" for numbers unless stated. SF fetches were summarized by a fetch model, so quotes are as returned.

#### sparklinggourami (Sparkling gourami)
- Data line: temper 0, harmless researched
- Prey: SF: eats insects/small invertebrates; "some aquarists report" it preys on small Caridina/Neocaridina shrimp (anecdote-level in SF). No fish predation.
- Nips: not mentioned.
- Aggression: temperament unknown on SF; males territorial when breeding (nest), croak to settle disputes without injury. Needs peaceful tankmates of similar size.
- Territory: breeding male defends nest.
- Verdict: MISMATCH (minor): "harmless" to shrimp is too lenient
- Proposed: add small shrimp (cherry 1.2 in) as possible prey, or flag shrimp "risk"; fish harmless. Confidence low-med.
- URLs: https://www.seriouslyfish.com/species/trichopsis-pumila/

#### croakinggourami (Croaking gourami)
- Data line: temper 1, harmless researched
- Prey: eats aquatic/terrestrial invertebrates; no fish/shrimp predation reported on SF.
- Nips: not mentioned.
- Aggression: "peaceful unless breeding"; both sexes croak in agonistic encounters (non-injurious).
- Territory: breeding male builds bubble nest and defends; female may help guard.
- Verdict: AGREE-ish (temper 1 ok as breeding-only; could be 0 outside breeding). Confidence med.
- Proposed: keep; optionally guardsTerritory (breeding) flag.
- URLs: https://www.seriouslyfish.com/species/trichopsis-vittata/

#### gourami (Pearl gourami)
- Data line: temper 0, feelers, predation never researched
- Prey: unfussy omnivore, eats hydra; no fish/shrimp predation mentioned. Fry/eggs: fry food list only.
- Nips: not mentioned.
- Aggression: "one of the most peaceful gouramis", "excellent community fish"; withdrawn if with boisterous fish. Males territorial toward each other; males rough with females when breeding.
- Verdict: AGREE (temper 0). Predation: harmless to adult fish/shrimp per SF (not explicit on shrimp; no report found). Proposed: mark predationResearchedHarmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/trichopodus-leerii/

#### syno (Malawi synodontis)
- Data line: temper 1, never researched
- Prey: omnivore; SF: "should not be kept with any fish so small as to be considered food". No size.
- Nips: not mentioned.
- Aggression: "fairly vigorous"; fights other Synodontis, not aggressive to conspecifics; suits robust hard-water Malawi cichlids, not shy species.
- Verdict: AGREE on temper 1. Predation: NO numeric data; qualitative = eats very small fish. Proposed: add eatsPreyUpTo ~1.2 in (neon-class small fish), low confidence; no number found.
- URLs: https://www.seriouslyfish.com/species/synodontis-njassae/

#### bronzecory (Bronze corydoras)
- Data line: temper 0, never researched
- Prey: omnivore, sinking foods/bloodworm; no fish/shrimp predation. (Genus note: corys eat bite-sized eggs/fry.)
- Nips: no. Aggression: peaceful, gregarious, groups 4-6+. Territory: none.
- Verdict: AGREE; predation = harmless to adult fish/shrimp (SF silent, low-risk). Proposed: mark researched harmless (fry/eggs only). Confidence med.
- URLs: https://www.seriouslyfish.com/species/corydoras-aeneus/ ; https://www.seriouslyfish.com/species/corydoras-panda/ (genus note on eggs/fry)

#### pepperedcory (Peppered corydoras)
- Data line: temper 0, never researched
- Prey: opportunistic omnivore (worms, crustaceans, plants, zoobenthos); accepts virtually anything. No report of eating fish/shrimp.
- Nips: no. Aggression: "Peaceful catfish for the smaller community aquarium"; tankmates tetras/dwarf cichlids. Groups.
- Verdict: AGREE; predation harmless to adults (small crustaceans in wild diet = possible baby shrimp). Proposed: mark harmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/corydoras-paleatus/

#### pandacory (Panda corydoras)
- Data line: temper 0, never researched
- Prey: omnivore; sinking pellets; eats bite-sized eggs/fry (genus note). No fish/shrimp.
- Nips: no. Aggression: "Very peaceful"; avoid large/aggressive tankmates.
- Verdict: AGREE; harmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/corydoras-panda/

#### pygmycory (Pygmy corydoras)
- Data line: temper 0, never researched
- Prey: tiny mouth; no fish/shrimp predation. SF says small shrimp are suitable companions.
- Nips: no. Aggression: "very peaceful", easily intimidated; larger angelfish, gouramis, large catfish "may treat it as food" (it is a PREY species).
- Verdict: AGREE; harmless to shrimp and fish. Proposed: mark harmless. Confidence high.
- URLs: https://www.seriouslyfish.com/species/corydoras-pygmaeus/

#### sterbai (Sterba's corydoras)
- Data line: temper 0, never researched
- Prey: omnivore; eats bite-sized eggs/fry; no fish/shrimp.
- Nips: no. Aggression: "Very peaceful"; groups of 6+.
- Verdict: AGREE; harmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/corydoras-sterbai/

#### bristlenose (Bristlenose pleco, Ancistrus sp.)
- Data line: temper 0, never researched
- Prey: SF: aufwuchs/algae plus gelatin foods; no natural prey described; no fish/shrimp predation reported. (Shrimpy Business blog title "Do bristlenose eat other fish" seen in search, not read.)
- Nips: not mentioned (Practical-style slime-feeding not reported for Ancistrus).
- Aggression: SF (cf. cirrhosus): "Relatively peaceful but territorial with conspecifics and similarly-shaped species"; best in a pair; males fight over caves (search snippets, anecdote-grade).
- Territory: males defend caves/brood.
- Verdict: AGREE on temper 0 toward other species; note intra-species male-male cave fighting (could add guardsTerritory-like flag vs conspecific/similar plecos). Predation harmless. Confidence med.
- URLs: https://seriouslyfish.com/species/ancistrus-cf-cirrhosus

#### oto (Otocinclus vittatus)
- Data line: temper 0, never researched
- Prey: herbivore/algae; no predation. SF page for O. vittatus not found (404); used O. cocama SF page as genus proxy.
- Nips: SF (O. cocama): "reports of otos feeding off the sides of certain other fish", attributed to stress/shortage of algae. Practical Fishkeeping says possible on sick hosts, never witnessed by author. Treat as low-risk anecdote.
- Aggression: peaceful, timid, groups of 6+; "does not make an ideal community fish"; shrimp (Caridina/Neocaridina) listed as good companions.
- Verdict: AGREE; harmless to fish/shrimp. Confidence med.
- URLs: https://www.seriouslyfish.com/species/otocinclus-cocama ; https://www.practicalfishkeeping.co.uk/features/keeping-otocinclus-catfish-in-the-aquarium/

#### kuhli (Kuhli loach)
- Data line: temper 0, never researched
- Prey: "micropredator" on insect larvae/small crustaceans; "may prey on eggs or fry". Adult fish: none. Shrimp not named; SF cites no reports of harming tankmates.
- Nips: no. Aggression: SF: "no reports of them harming tankmates"; peaceful.
- Verdict: AGREE; harmless to adults; fry/eggs and possibly baby shrimp. Proposed: mark harmless with fry note. Confidence med-high.
- URLs: https://www.seriouslyfish.com/species/pangio-kuhlii/

#### clownloach (Clown loach)
- Data line: temper 0, eatsPreyUpTo=1.2in cats:fw-invert
- Prey: chiefly carnivorous; preys on snails ("not an obligate molluscivore"); shrimp and small fish not mentioned on SF (no prey size).
- Nips: SF: "slow-moving, long-finned fish should be avoided because trailing fins can be nipped" (bettas, guppies, many cichlids).
- Aggression: "Not especially aggressive" but intimidates much smaller fish; single fish can turn aggressive toward similarly shaped fish; dominance hierarchy in groups; alpha often female.
- Verdict: MISMATCH: data lacks nip flag (too lenient). Proposed: add nip (fin-nip of slow long-finned fish, per SF); keep temper 0; 1.2 in/fw-invert unverified (no number found). Confidence med (nip).
- URLs: https://www.seriouslyfish.com/species/chromobotia-macracanthus/

#### sae (Siamese algae eater)
- Data line: temper 0, never researched
- Prey: SF genus page covers only biofilm browsing; no predation. Species page not found at SF (genus page was a different layout).
- Nips: none found. Aggression: SF genus page notes sparring in some Crossocheilus, bullying of weaker individuals in small groups. No species-specific harassment of tankmates found.
- Verdict: NO DATA for tankmates; temper 0 not contradicted. Confidence low. (Common hobby knowledge says adults get semi-aggressive; none found in sources.)
- URLs: https://www.seriouslyfish.com/species/crossocheilus-oblongus/

#### balashark (Bala shark)
- Data line: temper 0, eatsPreyUpTo=1.2in
- Prey: omnivore; SF: "will also eat very small fishes". No size.
- Nips: not mentioned.
- Aggression: "normally quite peaceful" but upsets slow-moving/timid tankmates with constant activity; unsuitable for general community due to size; pecking order; needs groups of 5+.
- Verdict: AGREE (1.2 in plausible; no number in source). Maybe temper 0 fine. Confidence med.
- URLs: https://www.seriouslyfish.com/species/balantiocheilos-melanopterus/

#### rainbowshark (Rainbow shark)
- Data line: temper 2, onePerTank, harmless researched
- Prey: aufwuchs grazer, algae, small crustaceans/insect larvae; no fish/shrimp predation found.
- Nips: not mentioned; constant attacks on similar-looking fish (congeners, Crossocheilus, Garra, Gyrinocheilus).
- Aggression: territorial, grows with age; "particularly high levels of aggression toward similar-looking species"; "largely unsuitable for general community"; cichlids/catfish may be picked on; keep singly (about 1 m territory).
- Verdict: AGREE (temper 2 is conservative vs individual variation; consider 1 toward dissimilar fish). Confidence med.
- URLs: https://www.seriouslyfish.com/species/epalzeorhynchos-frenatum/

#### redtailshark (Red-tail shark)
- Data line: temper 2, onePerTank, harmless researched
- Prey: algae/crustaceans/insect larvae; no fish predation.
- Nips: not mentioned; attacks conspecifics/similar fish constantly.
- Aggression: "largely unsuitable for general community"; territory >= 1 m diameter; keep singly; add last.
- Verdict: AGREE. Confidence med-high.
- URLs: https://www.seriouslyfish.com/species/epalzeorhynchos-bicolor/

#### hillstream (Reticulated hillstream loach)
- Data line: temper 0, never researched
- Prey: benthic algae, insect larvae opportunistic. No fish/shrimp predation.
- Nips: no. Aggression: "not generally aggressive towards dissimilar-looking fishes"; "territorial to an extent" (guards feeding spots, males dominant, vs similar benthic fish).
- Verdict: AGREE (temper 0; note intraspecific/benthic-similar competition). Harmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/sewellia-lineolata/

#### peapuffer (Pea puffer)
- Data line: temper 2, nip, speciesTankBest, eatsPreyUpTo=1.8in cats:fw-invert
- Prey: snails and shellfish (needed for beak wear); shrimp "kept with varying degrees of success"; dried foods usually not accepted. Eats fish? SF says "could easily end up on the menu of larger companions" (it is prey).
- Nips: SF: "tends to nip the fins of slow-moving or long-finned fish". 
- Aggression: "not usually recommended for the community tank"; rival males fight to the death; broken lines of sight needed. Otocinclus listed as a decent tankmate.
- Verdict: AGREE (nip, temper 2, speciesTankBest). 1.8 in prey: no SF number; as a 1.2 in fish it can't eat 1.8 in fish whole; likely it nips rather than swallows, but cats:fw-invert aligned. Possible mismatch: eatsPreyUpTo=1.8in looks too strict (exceeds own length 1.2 in); consider ~0.8 in. Confidence low-med.
- URLs: https://www.seriouslyfish.com/species/carinotetraodon-travancoricus/

#### firemouth (Firemouth cichlid)
- Data line: temper 1, guardsTerritory, never researched
- Prey: benthophagous omnivore; SF: "may eat much smaller fishes". No size.
- Nips: not mentioned.
- Aggression: "Not especially aggressive, though territorial when breeding"; temperament "peaceful"; can go with similar Central American cichlids, Poecilia, Xiphophorus.
- Verdict: AGREE (temper 1, guards). Predation: add eatsPreyUpTo small (about 1.2 in guess; no number found). Confidence low for number.
- URLs: https://www.seriouslyfish.com/species/thorichthys-meeki/

#### electricblueacara (Electric blue acara)
- Data line: temper 1, guardsTerritory, never researched
- Prey: "mainly carnivorous"; "can be combined with other species too large to swallow". No size.
- Nips: not mentioned.
- Aggression: "Peaceful for a cichlid of this size"; pair defends spawning site; remove others when pair forms unless tank very large.
- Verdict: AGREE (temper 1 slightly strict vs "peaceful"). Predation: add eatsPreyUpTo (small fish that fit mouth); no number. Confidence low-med.
- URLs: https://www.seriouslyfish.com/species/andinoacara-pulcher/

#### convict (Convict cichlid)
- Data line: temper 2, guardsTerritory, never researched
- Prey: unfussy omnivore; no prey data on SF.
- Nips: not mentioned.
- Aggression: "aggressive, territorial species that becomes downright violent when breeding"; "will take on fish several times its own size and win with ease"; "not a good community fish"; males intolerant.
- Verdict: AGREE (temper 2, guards). Confidence high.
- URLs: https://www.seriouslyfish.com/species/amatitlania-nigrofasciata/

#### gbr (German blue ram)
- Data line: temper 0, guardsTerritory, eatsPreyUpTo=1.2in cats:fw-invert youngUpTo=2.4in
- Prey: benthophagous; SF names no shrimp/fish/fry as prey; inexperienced pairs may eat their own brood. Poor competitor.
- Nips: not mentioned.
- Aggression: SF does not describe aggression; each pair holds territory "a couple of feet across" when breeding; males territorial vs rivals; avoid other cichlids.
- Verdict: MISMATCH (too strict on predation): SF gives no shrimp/fish predation; eatsPreyUpTo=1.2in cats:fw-invert unsupported. Proposed: drop prey rule or restrict to fry/tiny (<0.5 in); keep temper 0 and guards. Confidence med.
- URLs: https://www.seriouslyfish.com/species/mikrogeophagus-ramirezi/

#### bolivianram (Bolivian ram)
- Data line: temper 0, guardsTerritory, never researched
- Prey: benthophagous; no shrimp/fish listed. Pairs may eat brood.
- Nips: no. Aggression: males "more aggressive in defending territory" in confined space; "not recommended for general community"; poor competitor.
- Verdict: AGREE; consider temper 0-1 for males in small tanks. Harmless to adult fish/shrimp (SF silent). Confidence med.
- URLs: https://www.seriouslyfish.com/species/mikrogeophagus-altispinosus/

#### kribensis (Kribensis)
- Data line: temper 1, guardsTerritory, never researched
- Prey: accepts most foods; no shrimp/fish listed.
- Nips: not mentioned.
- Aggression: "generally shy and retiring", "very territorial when breeding"; some females turn on partner; keep one pair unless large tank; West African dwarfs ideal tankmates.
- Verdict: AGREE (temper 1 for breeding, guards). Confidence med.
- URLs: https://www.seriouslyfish.com/species/pelvicachromis-pulcher/

#### cockatoo (Cockatoo dwarf cichlid)
- Data line: temper 1, guardsTerritory, never researched
- Prey: SF page is for A. cacatuoides-like profile; carnivorous benthic invertebrates; no shrimp/fish predation listed. (Page described wild fish/captive-bred distinction.)
- Nips: not mentioned.
- Aggression: temperament "unknown" on SF; breeding female may be "hyper-aggressive" toward the male in small tanks; captive-raised fish "recommended for general community".
- Verdict: AGREE (temper 1 / guards for breeding female). Confidence low-med (SF thin).
- URLs: https://www.seriouslyfish.com/species/apistogramma-cacatuoides/

#### yellowlab (Yellow lab cichlid)
- Data line: temper 1, never researched
- Prey: mostly herbivorous/omnivore; mother may eat brood; no fish/shrimp predation.
- Nips: not mentioned.
- Aggression: "somewhat peaceful (for a mbuna)"; territorial mainly spawning; males pushy to females (1 male : several females).
- Verdict: AGREE (temper 1 reasonable; could be 0-1). Confidence med.
- URLs: https://www.seriouslyfish.com/species/labidochromis-caeruleus/

#### peacock (Peacock cichlid, A. stuartgranti)
- Data line: temper 0, never researched
- Prey: benthophagous, hunts tiny movements; SF does not say it eats fish/fry. 
- Nips: not mentioned.
- Aggression: "relatively peaceful" but males "aggressive toward any fish with similar colour pattern"; males territorial, chase females; mbuna "excessively boisterous and thus unsuitable".
- Verdict: AGREE on temper 0 broadly; consider temper 1 for males (colour-pattern aggression). Confidence med-low.
- URLs: https://www.seriouslyfish.com/species/aulonocara-stuartgranti/

#### demasoni (Demasoni cichlid)
- Data line: temper 2, never researched
- Prey: plant-based diet; no fish predation.
- Nips: not mentioned.
- Aggression: SF genus-style text: "Belligerent and very aggressive towards its own species", "should not be kept with peace loving species such as Peacocks or Utaka"; overcrowd to dilute aggression.
- Verdict: AGREE (temper 2). (Note: the fetched text matches the typical mbuna profile; slug returned a valid page.) Confidence med-high.
- URLs: https://www.seriouslyfish.com/species/pseudotropheus-demasoni/

#### kadango (Kadango/red-fin cichlid)
- Data line: temper 0, never researched
- Prey: specialised zooplankton feeder; no fish predation noted.
- Nips: not mentioned.
- Aggression: "generally peaceful"; males aggressive when courting; won't do well with rowdy tankmates/mbuna; avoid similarly coloured fish.
- Verdict: AGREE. Confidence med-high.
- URLs: https://www.seriouslyfish.com/species/copadichromis-borleyi/

#### labeo (Blue-nosed mbuna, Labeotropheus trewavasae)
- Data line: temper 2, never researched
- Prey: vegetable matter dominant; eats plants; no fish predation.
- Nips: not mentioned.
- Aggression: "Aggressive and territorial", "very aggressive towards its own kind"; keep away from peacocks/utaka; overcrowd; several females per male.
- Verdict: AGREE. Confidence high.
- URLs: https://www.seriouslyfish.com/species/labeotropheus-trewavasae/

#### auratus (Golden mbuna)
- Data line: temper 2, never researched
- Prey: vegetable-heavy; none.
- Nips: not mentioned.
- Aggression: "One of the most aggressive and territorial mbuna"; "incredibly aggressive towards own species"; subdominant males may be killed; males dark, females golden.
- Verdict: AGREE. Confidence high.
- URLs: https://www.seriouslyfish.com/species/melanochromis-auratus/

#### livingstonii (Livingstone's cichlid)
- Data line: temper 2, eatsPreyUpTo=3.1in
- Prey: "exclusive piscivore in nature"; eats "smaller mbuna and young fish"; no numeric size.
- Nips: not mentioned.
- Aggression: "generally peaceful with species too big to be considered food"; "a loner in nature"; "not a fish for the general Malawi community"; harem for breeding. Compatibility "unknown".
- Verdict: MISMATCH (temper too strict): SF says generally peaceful toward fish too big to eat; data temper 2 is harsh; eatsPreyUpTo 3.1 in unsupported by a number (ambush predator, mouth rule plausible; adult ~9.8 in could eat more). Proposed: temper 1 (peaceful but piscivore), keep mouth rule; consider prey cap larger (about 3.5-4 in, ie ~35-40 % of TL) — no number found. Confidence low-med.
- URLs: https://www.seriouslyfish.com/species/nimbochromis-livingstonii/

#### afra (Dogtooth cichlid, Cynotilapia afra)
- Data line: temper 2, never researched
- Prey: zooplankton, insects, small invertebrates (wild). No fish predation noted.
- Nips: not mentioned.
- Aggression: SF text for the fetched page: temperament "peaceful", compatibility "fine with others", behaviour section missing; the page may be a different species profile (content was the "Discus-like" wild-diet text; unverified). Hobby sources say aggressive mbuna; none read.
- Verdict: NO DATA / unreliable (SF page ambiguous; one fetch said "peaceful"). Do not change; label low confidence. Confidence low.
- URLs: https://www.seriouslyfish.com/species/cynotilapia-afra/

#### angel (Angelfish)
- Data line: temper 1, longfins, guardsTerritory, eatsPreyUpTo=1.2in
- Prey: SF: "good community fish but may eat small fish such as tetras"; wild diet small crustaceans. No size given.
- Largest fish size reports (as asked): neon tetra 1.5 in and cardinal tetra 1.8 in: only hobby anecdotes. No peer-reviewed or SeriouslyFish figure found. Care-site claim (unverified, aquifarm): angelfish body 3-4 in (6-8 months) can swallow a full-grown neon; same page anecdote of a 5 in angel eating 3 tetras in one night. Aquarium Co-Op forum thread titled "angelfish size before able to eat neons" exists (403, not read). Rule of thumb from several forums: anything that fits in the mouth. Ember tetra 0.9 in is within any report. So adult angels (body 5.9 in TL) eating 1.5-1.8 in tetras is consistent with keeper reports; 1.2 in is too low.
- Nips: SF does not mention fin nipping BY angels; angels' own long fins are targets (longfins flag fine).
- Aggression: "generally a peaceful cichlid", may squabble with own kind; males more aggressive/territorial when breeding; sexing hard; 6 juveniles to form a pair.
- Verdict: MISMATCH (eatsPreyUpTo too lenient): 1.2 in lets cardinal (1.8) and neon (1.5) pass. Proposed: eatsPreyUpTo = 1.8 in (adult), cats fish only; keep temper 1/guards. Confidence med (size numbers are anecdote/care-site; qualitative statement is SF).
- URLs: https://www.seriouslyfish.com/species/pterophyllum-scalare/ ; https://aquifarm.com/will-angelfish-eat-other-fish (403, via search snippet only) ; https://forum.aquariumcoop.com/topic/2563-angelfish-size-before-able-to-eat-neons/ (anecdote, not read) ; https://www.aquariumnexus.com/?p=2920 ("can still decide to eat smaller fish that fit into their mouth"; angelfish up to 8 in)

#### discus (Discus)
- Data line: temper 0, longfins, never researched
- Prey: wild: zooplankton, insects, small invertebrates; no fish predation listed.
- Nips: not mentioned.
- Aggression: SF lists "peaceful", "fine with others", "very shy, skittish" needs cover, in groups; behaviour section missing.
- Verdict: AGREE (temper 0); predation harmless. Confidence med.
- URLs: https://www.seriouslyfish.com/species/symphysodon-aequifasciatus/

#### clownknife (Clown knifefish)
- Data line: temper 1, onePerTank, eatsPreyUpTo=17.7in
- Prey: "obligate, typically nocturnal, predator": smaller fish, crustaceans, invertebrates. No size given.
- Nips: not mentioned.
- Aggression: "Relatively peaceful with fishes too large to be considered prey"; territorial with conspecifics/similar shapes when space short; fine alone; tank >= 6.5 ft long.
- Verdict: AGREE (temper 1; 17.7 in = ~half TL, plausible; no number in source). Confidence med.
- URLs: https://www.seriouslyfish.com/species/chitala-ornata/

#### bambooshark (Brownbanded bamboo shark)
- Data line: temper 1, onePerTank, eatsPreyUpTo=5.9in
- Prey: Florida Museum: benthic organisms and small fishes; Australian study found crabs, polychaetes, shrimps, small fishes. Search sources: eats any crustacean/mollusk, "not reef safe", small fish. No size cap found.
- Nips: n/a. Aggression: solitary; harmless except nipping divers; search snippet advises against pairing with triggers/puffers/some angelfish that harass it.
- Verdict: AGREE-ish; qualitative support only for small fish + crustaceans; cats should include marine inverts (shrimp/crabs). 5.9 in unverified. Confidence low-med.
- URLs: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/brownbanded-bambooshark/ ; https://www.thatpetplace.com/articles/true-sharks-article (search listing only)

#### bichir (Senegal bichir)
- Data line: temper 0, eatsPreyUpTo=4.3in
- Prey: "Predatory"; wild hunts invertebrates and small fish; SF: "Not to be trusted with tankmates it can fit in its mouth"; rated "relatively peaceful".
- Nips: not mentioned.
- Aggression: relatively peaceful, "one of the more peaceful and active" Polypterus.
- Verdict: AGREE (mouth rule; 4.3 in not sourced). Add shrimp/invert cat if not already. Confidence med.
- URLs: https://www.seriouslyfish.com/species/polypterus-senegalus/

#### oscar (Oscar)
- Data line: temper 1, eatsPreyUpTo=3.9in
- Prey: eats smaller fish, insects, crustaceans; Winemiller (1990) found most fish eaten were benthic catfish; preferred meaty foods; "should not be combined with much smaller fishes". No size.
- Nips: not mentioned.
- Aggression: "not especially aggressive for a cichlid of this size"; potential tankmates characids, anostomids, other cichlids, big catfish; pair: remove others.
- Verdict: AGREE-ish; 3.9 in likely lenient for an 11.8 in adult (ate fish up to ~1/3 TL is plausible, no number found). Proposed: keep, low-priority review. Confidence low.
- URLs: https://www.seriouslyfish.com/species/astronotus-ocellatus/

#### Caveats
- SF pages were read through a summarizing fetch tool; Otocinclus vittatus, SAE, bamboo-shark SF pages unavailable (404/generic).
- Pages for demasoni/afra summaries resembled generic mbuna/other text; afra verdict unreliable.

### g3 notes: freshwater inverts, amphibians, saltwater fish and inverts

Method note: sources were read through search-result summaries (WebSearch), not full page fetches. Most are hobby/retail pages (labelled "anecdote/retail" where weak). Largest-prey sizes in inches were almost never stated in any source: "none found" unless given. FishBase/SeriouslyFish did not appear in results for these queries.

#### bambooshark (Brownbanded bamboo shark)
- Data line: temper=1 onePerTank eatsPreyUpTo=5.9in (adult 37.2in)
- Prey: Florida Museum: feeds on benthic organisms and small fishes. Retail/hobby: will try to eat any tank mate that fits its mouth; small fish "devoured". Largest prey size: none found.
- Nips-harasses: none found as a nipper. It is the target: triggers, puffers, some angelfish nip its fins (retail).
- Aggression: not aggressive to large robust fish; predatory to small fish/inverts. Best single or with large, peaceful, non-nippy fish; 125-600+ gal.
- Territory: none found.
- Verdict: AGREE (prey-size number unsourced; 5.9in is plausible for a mouth rule). 
- Proposed change: none.
- Confidence: med
- URLs: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/brownbanded-bambooshark/ ; https://www.qualitymarine.com/news/proper-elasmobranch-choices-for-the-home-aquarium-the-brownbanded-bamboo-shark/ (retail)

#### cherryshrimp (Cherry shrimp)
- Data line: temper=0 predationNeverResearched
- Prey: harmless to adult fish and shrimp; none found for fry (no source reports it eating fry).
- Nips-harasses: none.
- Aggression: peaceful. Is itself prey: most fish eat shrimplets, bettas/cichlids/predators eat adults; adults safe with small peaceful fish.
- Territory: none.
- Verdict: AGREE (temper 0, harmless). Predation of shrimp is a rule on the predators, not here.
- Proposed change: mark predation researched-harmless. Confidence: med
- URLs: https://www.aquariumcoop.com/blogs/aquarium/cherry-shrimp-tankmates ; https://www.practicalfishkeeping.co.uk/features/what-can-i-keep-with-shrimp/

#### amano (Amano shrimp)
- Data line: temper=0 predationNeverResearched
- Prey: none found (algae/detritus eater; competes for fish food).
- Nips-harasses: none.
- Aggression: peaceful; steals fish food, outcompetes cherry shrimp (Aquarium Co-Op). Prey for cichlids (even dwarf), most loaches, larger gouramis (PFK).
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.aquariumcoop.com/blogs/aquarium/amano-shrimp ; https://www.practicalfishkeeping.co.uk/features/what-can-i-keep-with-shrimp/

#### cpo (Orange dwarf crayfish)
- Data line: temper=1 eatsPreyUpTo=1.6in cats:fw-invert
- Prey: vendors say it has on occasion attacked dwarf shrimp; "not recommended" with shrimp (Aquatic Arts, retail). Fine with fast small fish (rasboras, rainbows, danios). Largest prey: none found.
- Nips-harasses: none found.
- Aggression: "quite peaceful" for a crayfish (TFH); brief territorial squabbles with own kind only.
- Territory: some (retail: territorial squabbles).
- Verdict: AGREE (temper 1 is on the strict side of the sources; shrimp rule fits). Proposed change: none; 1.6in unsourced. Confidence: low-med
- URLs: https://www.tfhmagazine.com/articles/freshwater/the-orange-dwarf-crayfish-full-article ; https://aquaticarts.com/pages/orange-dwarf-mexican-dwarf-crayfish-care-guide ; https://www.theshrimpfarm.com/dwarf-orange-crayfish-cpo.php

#### cajundwarf (Cajun dwarf crayfish)
- Data line: temper=1 eatsPreyUpTo=1.6in cats:fw-invert
- Prey: Aquatic Arts: small enough to be harmless to most tankmates but sometimes attacked dwarf shrimp. Retail: not 100% shrimp/fish safe. Largest prey: none found.
- Nips-harasses: none found.
- Aggression: peaceful, "not known to kill fish" (care guide); Wikipedia: aggressive toward other crayfish species.
- Territory: can act territorial (retail).
- Verdict: AGREE. Proposed change: none. Confidence: low-med
- URLs: https://aquaticarts.com/products/cajun-dwarf-crayfish ; https://www.aquariadise.com/caresheet-dwarf-crayfish-cambarellus/ ; https://en.wikipedia.org/wiki/Cambarellus_shufeldtii (pointer)

#### rswcrayfish (Red swamp crayfish)
- Data line: temper=2 onePerTank eatsPreyUpTo=2.4in
- Prey: Aquarium Wiki: ambushes sleeping bottom fish; vendor: will attack crabs, shrimp, dwarf frogs, weak fish, anything on the bottom. Chewy: seldom catches healthy fish. Largest prey: none found.
- Nips-harasses: Aquarium Wiki: slow and long-finned fish are easy targets.
- Aggression: aggressive, cannibalistic, to crayfish and all tank inhabitants.
- Territory: furiously territorial.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://theaquariumwiki.com/wiki/Mudbug (retail/wiki) ; https://be.chewy.com/?p=10230

#### redclaw (Redclaw crayfish)
- Data line: temper=2 onePerTank eatsPreyUpTo=3.9in
- Prey: Aquarium Wiki: eats passing fish it can catch. German guide: only with robust fish; not with lively livebearers, clown loaches, cichlids. Largest prey: none found.
- Nips-harasses: none found.
- Aggression: wild: relatively non-aggressive (NSW DPI), but aquarium guides: very aggressive to smaller crayfish; solitary or single bonded pair.
- Territory: yes; aggression rises in small tanks.
- Verdict: AGREE (NSW DPI is milder than temper 2; hobby sources support it). Proposed change: none. Confidence: low-med
- URLs: https://theaquariumwiki.com/wiki/Blue_Yabby ; https://www.sera.de/fileadmin/epapers/aqua-shrimps-en/page7.html ; https://www.dpi.nsw.gov.au/dpi/fishing/aquaculture/resources/publications/species2/freshwater/freshwater-crayfish ; https://gensou.sg/?p=33039

#### thaicrab (Thai micro crab)
- Data line: temper=0 predationNeverResearched
- Prey: none found. Tiny, shy; recommended with neocaridina, snails, mini rasboras.
- Nips-harasses: none.
- Aggression: peaceful; at risk from predatory fish (reedfish, golden wonder killi).
- Territory: none found.
- Verdict: AGREE (temper 0). Predation: NO DATA beyond "harmless". Proposed change: mark researched-harmless, low. Confidence: low
- URLs: https://fishtankadvisor.com/thai-micro-crab/ ; https://guidarium.com/fishes/thai-micro-crab ; https://www.theshrimpfarm.com/posts/ramshorn-snail-care/ (says Thai micro crab is safe with ramshorns)

#### asellus (Aquatic isopod)
- Data line: temper=0 predationNeverResearched
- Prey: detritivore/periphyton feeder; zebrafish larvae unharmed even without other food (Sci Rep 2024). It eats dead fish eggs.
- Nips-harasses: none.
- Aggression: none; is prey for perch and other fish.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.nature.com/articles/s41598-024-57903-4.pdf ; https://www.wikipedia.org/wiki/Water_louse (pointer)

#### nerite (Nerite snail)
- Data line: temper=0 predationNeverResearched
- Prey: harmless to fish and shrimp (algae). None found otherwise.
- Nips-harasses: none.
- Aggression: peaceful. Is prey/target: puffers, loaches, some bettas/gouramis eat snails; nippers chew antennae.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.aquariumcoop.com/blogs/aquarium/nerite-snail ; https://www.chewy.com/education/fish/general/nerite-snail-care-guide

#### mystery (Mystery snail)
- Data line: temper=0 predationNeverResearched
- Prey: none found (scavenger/algae; assassin snails and crayfish hunt it, not reverse).
- Nips-harasses: does not nip; its antennae are a nip target (tiger barbs, serpae tetras, some danios, some bettas).
- Aggression: peaceful; "bullying" is a topic on aquifarm pages (retail, not read in full).
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless; if the planner has a "snail target for nippers" flag, tiger barb/serpae apply. Confidence: med
- URLs: https://aquariumcoop.com/blogs/aquarium/mystery-snail ; https://aquifarm.com/what-fish-should-not-be-put-in-with-mystery-snails ; https://www.buildyouraquarium.com/mystery-snails/

#### ramshorn (Ramshorn snail)
- Data line: temper=0 predationNeverResearched
- Prey: none found; retail: shrimp-safe, fish-safe. No predation data on shrimp.
- Nips-harasses: none.
- Aggression: peaceful; prey of crayfish, crabs, puffers, loaches.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.theshrimpfarm.com/posts/ramshorn-snail-care/ ; https://en.wikipedia.org/wiki/Planorbella_duryi (pointer)

#### trumpet (Malaysian trumpet snail)
- Data line: temper=0 predationNeverResearched
- Prey: detritus/algae. One Chewy anecdote of feeding on dead/dying shrimp; no report of killing healthy ones.
- Nips-harasses: none.
- Aggression: harmless to fish (PFK); eaten by puffers, botiine loaches, some cichlids/synodontis.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.practicalfishkeeping.co.uk/features/natural-born-killers/ ; https://www.tfhmagazine.com/articles/freshwater/taming-the-tenacious-trumpet-snail ; https://www.chewy.com/education/fish/general/aquarium-snails-what-to-keep-and-what-to-avoid

#### ocellaris (Ocellaris clownfish)
- Data line: temper=1 predationNeverResearched
- Prey: most sources: leaves mobile inverts alone; one: very small ornamental shrimp may occasionally be seen as food. Largest prey: none found.
- Nips-harasses: none found.
- Aggression: peaceful to semi-aggressive depending on source; pairs defend their territory/host; don't mix with other clowns (maroon/clarkii).
- Territory: yes, pair guards host area.
- Verdict: AGREE (temper 1 within range). Proposed change: none; leave prey unset. Confidence: med
- URLs: https://www.practicalfishkeeping.co.uk/features/common-clownfish-the-complete-care-guide-to-amphiprion-ocellaris/ ; https://www.aquariumsource.com/ocellaris-clownfish/ ; https://topshelfaquatics.com/pages/saltwater-fish/ocellaris-clownfish (retail)

#### royalgramma (Royal gramma)
- Data line: temper=0 onePerTank predationNeverResearched
- Prey: mostly safe with shrimp (retail); anecdote: one ate a peppermint shrimp; shrimp near its cave at risk. Size: none found.
- Nips-harasses: none found.
- Aggression: territorial and aggressive to own kind (jaw-locking); more aggressive in nanos.
- Territory: yes (cave).
- Verdict: AGREE (onePerTank covers conspecific fights; temper 0 acceptable, borderline 1 in small tanks). Proposed change: none. Confidence: low-med
- URLs: https://topshelfaquatics.com/blogs/news/why-grammas-fight-their-own-kind ; https://www.liveaquaria.com/blogs/stocking-your-aquarium/reef-basslets-grammas ; https://www.reef2reef.com/threads/basslets.1115850/latest (anecdote)

#### yellowtang (Yellow tang)
- Data line: temper=1 onePerTank predationNeverResearched
- Prey: herbivore; shrimp, hermits, snails untouched (retail/TFH). 
- Nips-harasses: none to fish; may pick at corals.
- Aggression: peaceful to most; hostile to same-shape tangs; size/tank-size driven.
- Territory: some.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.tfhmagazine.com/articles/saltwater/zebrasoma-flavescens ; https://theaquariumwiki.com/wiki/Yellow_Tang ; https://www.liveaquaria.com/product/392/?pcatid=392

#### bluetang (Blue tang)
- Data line: temper=1 onePerTank predationNeverResearched
- Prey: herbivore; none found on shrimp/fish (reef safe).
- Nips-harasses: none; but it is a nip target (long fins/spines; can be bullied and stop eating).
- Aggression: peaceful to most, aggressive to conspecifics and similar-shaped fish; one retailer rates "aggressive".
- Territory: some.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://www.tfhmagazine.com/articles/saltwater/paracanthurus-hepatus ; https://topshelfaquatics.com/pages/saltwater-fish/blue-hippo-tang ; https://www.liveaquaria.com/blogs/species-spotlight/the-blue-tang

#### firefish (Firefish goby)
- Data line: temper=0 predationNeverResearched
- Prey: none found on shrimp (sources silent; planktivore).
- Nips-harasses: none found.
- Aggression: peaceful to other species; aggressive to own kind and similar firefish/dartfish (pairs fine).
- Territory: burrow, conspecific aggression.
- Verdict: AGREE for temper; conspecific aggression sourced but data has no onePerTank (pairs ok). Proposed change: none, or "no 2+ unless pair" if such a rule exists. Confidence: low-med
- URLs: https://www.aquariumsource.com/firefish-goby/ ; https://theaquariumwiki.com/wiki/Firefish ; https://www.tfhmagazine.com/articles/saltwater/nemateleotris-magnifica

#### banggai (Banggai cardinalfish)
- Data line: temper=0 predationNeverResearched
- Prey: sources split: one guide calls it a micropredator that may eat small shrimp and tiny fish; another says reef-safe with shrimp; forum: shrimp may be an issue, snails fine. Largest prey: none found.
- Nips-harasses: none found.
- Aggression: peaceful to other species; aggression is within species, worse in small tanks. Avoid boisterous tank mates (dottybacks).
- Territory: some (pairs).
- Verdict: MISMATCH (slightly too lenient: small shrimp risk unrecorded). 
- Proposed change: add eatsPreyUpTo about 1.0in cats:sw-invert (small shrimp, tiny fish), or leave as NO DATA. Confidence: low
- URLs: https://www.practicalfishkeeping.co.uk/features/beyond-the-banggai-cardinals-for-your-reef-tank/ ; https://topshelfaquatics.com/pages/saltwater-fish/banggai-cardinalfish ; https://www.reef2reef.com/threads/banggai-breeding-setup-cleanup-crew.1104822/ (anecdote)

#### sixline (Six-line wrasse)
- Data line: temper=1 onePerTank eatsPreyUpTo=1.2in cats:sw-invert
- Prey: eats bristleworms/pests; reviews: small shrimp eaten, a larger ornamental shrimp torn apart; hermit crabs killed (anecdotes). Size: none found.
- Nips-harasses: none found.
- Aggression: semi-aggressive; bullies peaceful wrasses and newcomers; keep singly.
- Territory: yes.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://reefbuilders.com/2014/02/14/sixline-wrasse-pseudocheilinus-hexataenia ; https://www.liveaquaria.com/product/375/?pcatid=375 ; https://www.aquariadise.com/six-line-wrasse/

#### koletang (Kole tang)
- Data line: temper=1 onePerTank predationResearchedHarmless
- Prey: should not bother crabs and shrimp (retail); herbivore/detritus grazer.
- Nips-harasses: none to fish; may pick polyps if underfed.
- Aggression: aggressive to other tangs/similar shapes; target for aggressive tank mates.
- Territory: some.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://reefbuilders.com/2014/06/16/the-kole-tang-a-commendable-surgeonfish-for-medium-sized-aquariums ; https://www.aquariumsource.com/kole-tang/

#### foxface (Foxface rabbitfish)
- Data line: temper=0 onePerTank predationResearchedHarmless
- Prey: herbivore; none found on shrimp/fish.
- Nips-harasses: none; venomous spines (hazard to keepers). May nip corals if hungry.
- Aggression: peaceful; poor with aggressive tankmates; one per tank unless pair.
- Territory: none.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://reefbuilders.com/2013/10/02/foxface-rabbitfish-siganus-vulpinus-hardy-herbivore-overview ; https://www.liveaquaria.com/product/687/?pcatid=687 ; https://www.buildyouraquarium.com/foxface-rabbitfish/

#### flameangel (Flame angelfish)
- Data line: temper=1 onePerTank predationResearchedHarmless
- Prey: none found on fish/shrimp; picks at corals, zoanthids, clam mantles (outside scope).
- Nips-harasses: none to fish found.
- Aggression: semi-aggressive; territorial toward own kind and other dwarf angels; add last.
- Territory: yes.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://reefbuilders.com/2013/06/12/flame-angelfish-centropyge-loriculus-overview ; https://www.tfhmagazine.com/articles/saltwater/centropyge-loricula ; https://www.liveaquaria.com/blogs/species-spotlight/the-flame-angelfish

#### lawnmowerblenny (Lawnmower blenny)
- Data line: temper=0 onePerTank predationResearchedHarmless
- Prey: algae grazer; some guides say may eat small crustaceans (one source, vague).
- Nips-harasses: some guides say may nibble tank mates that enter its territory; usually ignores others.
- Aggression: peaceful to other species; hostile to blennies and look-alikes; more aggressive in small tanks.
- Territory: yes (algae/territory).
- Verdict: AGREE (borderline: temper 1 is defensible in small tanks). Proposed change: none. Confidence: low
- URLs: https://www.tfhmagazine.com/articles/saltwater/uber-algae-eaters-the-lawnmower-blennies-full-article ; https://reefbuilders.com/2015/05/08/the-lawnmower-blenny-a-funny-fascinating-fish-of-unpredictable-utility ; https://www.themandaringarden.com/lawnmower-blenny.html

#### orchiddottyback (Orchid dottyback)
- Data line: temper=1 onePerTank predationResearchedHarmless
- Prey: PFK: natural predator of small shrimp; wild diet tiny shrimp, amphipods, copepods, bristleworms. Care guide: cleaner, peppermint, fire shrimp coexist; very small (sexy) shrimp occasionally targeted. Size: none found.
- Nips-harasses: none found.
- Aggression: semi-aggressive, milder than other dottybacks; harasses newcomers; add last.
- Territory: yes.
- Verdict: MISMATCH (too lenient only for small shrimp; "harmless" overstated). 
- Proposed change: replace researched-harmless with eatsPreyUpTo about 1.0in cats:sw-invert (small shrimp), fish prey none. Confidence: low-med
- URLs: https://www.practicalfishkeeping.co.uk/features/dottybacks-for-the-reef-aquarium/ ; https://www.tfhmagazine.com/articles/saltwater/pseudochromis-fridmani ; https://gensou.sg/?p=30501 (retail)

#### pajamacardinal (Pajama cardinalfish)
- Data line: temper=0 predationResearchedHarmless
- Prey: sources conflict: threat to small crustaceans/small shrimp (care guides); "reef safe but not invertebrate safe". Size: none found.
- Nips-harasses: none found.
- Aggression: most peaceful cardinal; mild toward other cardinals; itself bullied by assertive fish.
- Territory: none; group squabbles in small tanks.
- Verdict: MISMATCH (too lenient: "harmless" ignores small shrimp). 
- Proposed change: drop researched-harmless; eatsPreyUpTo about 1.0in cats:sw-invert. Confidence: low-med
- URLs: https://reefbuilders.com/2014/06/25/dig-those-crazy-pajama-cardinalfish ; https://theaquariumwiki.com/wiki/Pajama_Cardinalfish ; https://topshelfaquatics.com/pages/saltwater-fish/pajama-cardinalfish

#### yellowtailblue (Yellowtail blue damselfish)
- Data line: temper=1 predationResearchedHarmless
- Prey: none found on fish/shrimp.
- Nips-harasses: none found.
- Aggression: mildest damsel; aggression mainly vs own kind, worse alone/small tanks; add last-ish, peaceful mates first (sources conflict on order).
- Territory: small territory.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://www.tfhmagazine.com/articles/saltwater/chrysiptera-parasema ; https://reefbuilders.com/2013/11/25/chrysiptera-parasema-yellowtail-damselfish-demoiselle ; https://www.practicalfishkeeping.co.uk/features/are-damsels-suitable-for-a-community-reef-tank/

#### tailspotblenny (Tailspot blenny)
- Data line: temper=0 onePerTank predationResearchedHarmless
- Prey: none found.
- Nips-harasses: none to others found.
- Aggression: peaceful to unrelated fish; aggressive to blennies and look-alikes (gobies, firefish) especially without hides.
- Territory: yes.
- Verdict: AGREE. Proposed change: none. Confidence: med
- URLs: https://www.saltwateraquariumblog.com/tailspot-blenny-reef-safe-care-guide/ ; https://fishbase.org/summary/7663 (taxonomy only) ; https://buildyouraquarium.com/tailspot-blenny

#### chromis (Blue-green chromis)
- Data line: temper=0 predationNeverResearched
- Prey: none found on shrimp directly; wild diet planktonic copepods/tiny crustaceans.
- Nips-harasses: none found.
- Aggression: mostly peaceful; sources conflict: some say territorial/hierarchical aggression in groups, bullying of weak members.
- Territory: some in small tanks.
- Verdict: NO DATA for predation; temper AGREE with low confidence (temper 1 defensible). Proposed change: none. Confidence: low
- URLs: https://topshelfaquatics.com/blogs/news/chromis-care-guide-schooling-reality-tank-size-and-best-chromis-for-reefs ; https://www.tfhmagazine.com/articles/saltwater/chromis-viridis ; https://wetwebmedia.com/chromcompfaqs.htm

#### coralbeauty (Coral beauty angelfish)
- Data line: temper=1 onePerTank predationNeverResearched
- Prey: none found on fish; "marine shrimp generally fine"; may pick at inverts/corals (Petco says not reef safe).
- Nips-harasses: none found.
- Aggression: peaceful to non-angels; fights own kind and similar shapes (males to the death).
- Territory: yes.
- Verdict: AGREE. Proposed change: mark researched-harmless (fish/shrimp). Confidence: med
- URLs: https://reefbuilders.com/2013/12/16/coral-beauty-angelfish-centropyge-bispinosa-twospined-dusky ; https://topshelfaquatics.com/pages/saltwater-fish/coral-beauty-angel ; https://www.buildyouraquarium.com/coral-beauty-angelfish

#### watchman (Yellow watchman goby)
- Data line: temper=0 predationNeverResearched
- Prey: none found; safe with cleaner shrimp, hermits, snails (retail). Classic partner of pistol shrimp.
- Nips-harasses: none found.
- Aggression: peaceful to others, but keep only one unless mated pair; conspecific aggression rises with maturity; may defend burrow vs clowns/pygmy angels (anecdote).
- Territory: yes, burrow.
- Verdict: MISMATCH (too lenient: no onePerTank). 
- Proposed change: add onePerTank (unless mated pair). Confidence: med
- URLs: https://www.bulkreefsupply.com/content/post/how-to-care-for-watchman-gobies ; https://reefbuilders.com/2015/12/11/the-hardy-colorful-nano-friendly-yellow-watchman-goby ; https://ask.ifas.ufl.edu/publication/fa226

#### mandarin (Mandarin dragonet)
- Data line: temper=0 predationNeverResearched
- Prey: eats copepods/pods; none found on fish/shrimp.
- Nips-harasses: none.
- Aggression: peaceful to others; males fight males; timid, outcompeted/bullied by others.
- Territory: male-male.
- Verdict: AGREE temper 0. Conspecific rule sourced (singly or mated pair) but data has no onePerTank; optional. Proposed change: mark researched-harmless; consider onePerTank (males). Confidence: low-med
- URLs: https://www.bulkreefsupply.com/content/post/how-to-care-for-mandarin-dragonets ; https://www.chewy.com/education/fish/freshwater-fish/tips-on-keeping-the-mandarin-dragonet ; https://seahorse.org/library/articles/tankmates/dragonette.shtml

#### cleanershrimp (Skunk cleaner shrimp)
- Data line: temper=0 predationNeverResearched
- Prey: no reports of harming adult fish; would likely eat fry, eggs, larvae (one aquarist, retail/anecdote).
- Nips-harasses: none.
- Aggression: peaceful; mild dominance if crowded. Prey of hawkfish, lionfish, triggers, puffers, large wrasses, dottybacks.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless to adult fish (fry risk noted). Confidence: med
- URLs: https://topshelfaquatics.com/pages/saltwater-invertebrates/skunk-cleaner-shrimp ; https://aquariadise.com/cleaner-shrimp/ ; https://reefbuilders.com/2013/06/14/cleaner-shrimp-aquarium-invertebrates

#### turbo (Mexican turbo snail)
- Data line: temper=0 predationNeverResearched
- Prey: algae grazer; harmless to fish/shrimp.
- Nips-harasses: none.
- Aggression: none; topples loose frags/rock; prey of aggressive crabs/fish.
- Territory: none.
- Verdict: AGREE. Proposed change: mark researched-harmless. Confidence: med
- URLs: https://topshelfaquatics.com/pages/saltwater-invertebrates/mexican-turbo-snail ; https://www.aquaticcommunity.com/SwSnails/MexicanTurbo.php

#### hermit (Blue-leg hermit crab)
- Data line: temper=0 eatsPreyUpTo=2.0in cats:sw-invert (adult 1.0in)
- Prey: sources: eats small snails, bristleworms, polyps; may kill snails for shells (disputed; opportunistic on dying/dead snails, more so if shell-short or fed mostly meat). Nothing found on fish or shrimp. Largest prey: none found.
- Nips-harasses: none found.
- Aggression: mostly peaceful reef scavenger.
- Territory: none.
- Verdict: AGREE directionally (invert predation sourced); the 2.0in figure is unsourced and large for a 1.0in crab. Proposed change: none, or lower prey size if a source exists. Confidence: low
- URLs: https://www.tfhmagazine.com/articles/saltwater/clibanarius-tricolor ; https://topshelfaquatics.com/pages/saltwater-invertebrates/blue-leg-hermit-crab ; https://reefs.com/forum/general-discussion/271531-you-sure-they-kill.html (anecdote)

#### firetoad (Fire-bellied toad)
- Data line: temper=0 predationNeverResearched
- Prey: none found that it eats fish; larger toads eat smaller toads. Eats small insects/worms (general).
- Nips-harasses: none.
- Aggression: not aggressive; toxic skin secretions (bombesin) can harm other aquatic animals; not good with fish; needs only 1-2 in water.
- Territory: none.
- Verdict: NO DATA on predation; incompatibility is toxin/habitat, not predation. Proposed change: no predation value; flag as unsuitable for fish tanks if the planner has such a flag. Confidence: low
- URLs: https://petkeen.com/best-tank-mates-for-fire-bellied-toads/ ; https://www.petco.com/pet-education/caresheets/fire-bellied-toad ; https://articles.hepper.com/oriental-fire-bellied-toad/ (retail/blog)

#### firenewt (Chinese fire-bellied newt)
- Data line: temper=0 predationNeverResearched
- Prey: carnivore; expect it to eat shrimp it can catch; cherry shrimp "do ok" but may be snacks (caudata forum, anecdote). Largest prey: none found.
- Nips-harasses: none found.
- Aggression: not aggressive; mildly toxic skin; coolwater (62-68 F); most keepers advise no fish (only White Cloud minnows suggested).
- Territory: none.
- Verdict: MISMATCH (too lenient: shrimp predation unrecorded). 
- Proposed change: add eatsPreyUpTo about 1.2in cats:fw-invert; flag coolwater/no-fish. Confidence: low
- URLs: https://www.caudata.org/threads/what-fish-can-i-keep-with-cynops-orientalis.18806/post-143164 (anecdote) ; https://petkeen.com/fire-belly-newt/ ; https://en.wikipedia.org/wiki/Chinese_fire_belly_newt (pointer)

#### adf (African dwarf frog)
- Data line: temper=0 predationNeverResearched
- Prey: very small shrimp may be eaten or tasted; adult amanos too large; cherry shrimp often snacks (hobby blogs). Fry: none found.
- Nips-harasses: poor eyesight; may accidentally nip long-finned fish (betta) mistaking them for food (hobby blogs). Bettas may harass frogs.
- Aggression: peaceful; outcompeted for food.
- Territory: none.
- Verdict: MISMATCH (too lenient: small shrimp predation). 
- Proposed change: add eatsPreyUpTo about 1.2in cats:fw-invert; fry unsourced. Confidence: low
- URLs: https://www.buildyouraquarium.com/african-dwarf-frog-tank-mates/ ; https://aquariadise.com/african-dwarf-frog-tank-mates/ ; https://articles.hepper.com/african-dwarf-frog-tank-mates/ (blogs)

#### axolotl (Axolotl)
- Data line: temper=0 eatsPreyUpTo=3.1in
- Prey: wide gape swallows surprisingly large prey (aquifarm); shrimp will be eaten (cherry lasted a day to a week, caudata anecdote); small fish like guppies recommended by some listicles but breeders say risky. Size: none found.
- Nips-harasses: none by axolotl. It is the target: active fish and guppies chew its feathery gills; plecos/bottom fish harmful (Axolotl Planet).
- Aggression: not aggressive to fish; may bite same-species tank mates (cannibal juveniles; unsourced here).
- Territory: none.
- Verdict: AGREE (prey rule fits; 3.1in unsourced). Note axolotl gills make it a "longfin" target for nippers. Proposed change: none. Confidence: low-med
- URLs: https://axolotlplanet.com/blogs/all-about-axolotls/can-axolotls-live-with-fish-the-definitive-tank-mate-guide-from-professional-breeders ; https://aquifarm.com/axolotl-fish-tank-mates/ ; https://www.caudata.org/threads/axolotls-with-shrimp.33031/post-236863 (anecdote)
