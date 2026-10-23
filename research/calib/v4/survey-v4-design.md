# Stocking and compatibility survey v4: design (2026-10-23)

Replaces the round 1-3 survey on branch `xc` (`research/calib/`, design in `research/expert-calibration.md`). Nothing on `xc` is
changed by this note; the files here are the proposal and a working survey. What is in this folder:

| file | what |
|---|---|
| `scenarios-v4.json` | the 60 tanks: modules, tanks, species table, each tank's stock, what is asked, which engine component it tests and why |
| `make-survey-v4.mjs` | plain node, no dependencies; builds everything below from the JSON |
| `survey-v4.html` | the survey for people: one self-contained file, buttons only, answers autosave in the browser, Export downloads a JSON file |
| `survey-v4-llm-A.md` … `-D.md`, `-all.md` | the survey for LLM experts: the tanks as text plus a JSON answer template; the model answers in JSON, no screenshot, no browser |
| `survey-v4-index.md` | one line per tank: stock, questions asked, engine component tested, why (generated) |

Build `c7cb52e6` is a hash of the tanks and counts. Every export carries it, so answers can never be matched to tanks they did not
answer (the round-3 / 3a accident).

## 1. What went wrong with rounds 1-3, measured

From `research/calib/round-{1,2,3,3a}.json` on `xc` (90 tanks over four rounds):

- **Species.** 34 of the 86 roster species appeared. Panda corydoras was in 19 tanks, bronze cory in 12, dwarf pencilfish, white
  cloud, ember, oto, bristlenose and neon in 7 each. No betta, angelfish, goldfish, oscar, discus, tiger barb or Malawi community;
  no saltwater species, no reptile, no amphibian, no land invertebrate, no snail.
- **Counts nobody keeps.** The generator solved each focal count to land the engine near 75 or 100 %, so the tanks were 87 harlequins +
  28 rummy-noses in a 125, 126 embers in a 40, 90 otos in a 55, 101 pygmy corys + 33 embers + 55 CPDs in a 40, 109 CPDs + 4 SAE in
  a 75. An expert answering those is extrapolating, not remembering, and the answers calibrated species factors at counts the app
  will never be asked about.
- **Repeats.** Of 22 tanks a round, 8 were duplicates or near-duplicates: 2 repeats, 2 held-out anchors, 4 "pair" tanks. The anchor
  (87 harlequins + 28 rummy-noses) came back in rounds 2, 3 and 3a. Round 3a's f7 and f1 both were pea puffer mixes.
- **Questions.** 10 per tank (floor band, water band, overall band, limiting species, big-enough per species, two counts for the focal
  species, one for a tankmate, together, confidence, bare-tank effect) whether or not the tank could inform the thing asked.
- **Why.** A seeded random draw weighted by "information need" (species with few answers), filtered so every species meets its
  recommended minimum. Few floor species fit 10-30 gal at their recommended minimum, so pandas kept coming up; the pool itself was
  `fw-fish` and shrimp only (`src/calib/scenario.ts` POOL).
- **Result.** Nathan's 5 tanks and ChatGPT's 27 gave a fit that moved the water and floor scales by -15 to -20 % and made the held-out
  error worse (0.27 -> 0.52). Nothing was applied. Time spent: three survey versions, four rounds, two render passes.

## 2. Principles

1. **Likely cases only.** Every tank is one a keeper would post in a forum or a shop would sell: the 5 gal betta, the 10 gal with
   20 neons, the 20 long with neons, corys and a pleco, the 29 community, the 40 breeder with an angel pair, the full 55, the 55 with an
   oscar, the goldfish in a 10, the discus 55, the mbuna 55, the nano reef, the 40 breeder reef, the tang in a 55, the leopard gecko in a
   10, the ball python in a 40 breeder, the trio of dart frogs. Counts are what people buy, not what the engine needs.
2. **Every tank has a purpose tag.** `tests[]` names the engine component the answers inform (`space.*`, `tankmin.*`, `groups.*`,
   `compat.*`, `herp.*`, `limits.*`, `golden.*`, `gap.*`) and `why` says what the app does today. A tank that would not change a number is not in
   the set.
3. **Ask only what the purpose needs.** Two to five questions a tank instead of ten: a count question only where a count is the unit
   (25 tanks), a minimum question only where the tank sits near a species' minimum (14), a compatibility question only where a pair
   is in doubt (31), a "most of this species" question only where a fighting or group rule is tested (15, plus 2 male-count questions).
   Every tank gets the verdict, the first thing you would change, and a confidence.
4. **One scale, kept.** Ideal / caution / problems / not workable, with the 75 / 100 anchors: an ideal count reads 75 %, an at-most count
   100 %. The existing fit (`scripts/calib-fit.mjs`) can read v4 counts without a change of meaning.
5. **Reasons map onto the gates.** The compatibility reasons are the engine's own gate kinds (section 5), so a disagreement points
   at a rule, not at a feeling.
6. **No verbatim repeats.** Two transform pairs that are themselves informative: the 20 long vs the 20 high with the same stock (A04 /
   A05, footprint vs height) and the same reef in a 40 breeder vs a 55 (C04 / C05, the salt scale against volume and width). An expert's
   consistency is read from those and from the overlap between experts, not from re-asking a tank.
7. **Modules by domain, skip is an answer.** A: freshwater community (16), B: freshwater specialist (16), C: saltwater (12),
   D: reptiles, amphibians and paludaria (16). An expert picks modules; any tank can be skipped ("I don't know these animals"), and a
   skip is stored, never turned into a number. The old survey's lesson stands: a forced number is invented data.
8. **Two formats, one answer schema.** People get the HTML (buttons only, no dropdowns, one tank per 1366 x 640 screen, verified on all
   60). LLMs get a text pack per module with a JSON template and answer in JSON: no screenshots, no browser, parseable without a
   human copying numbers. The two produce the same answer objects.
9. **Text, no picture.** Round 1 showed renders bias the room judgement (camera, decor); v2 went text-only and v4 stays there.

## 3. The set

60 tanks, 68 of the 86 roster species. Left out on purpose: dwarf pencilfish, CPD, hatchetfish, cockatoo cichlid, the five rarer
Malawi species (kadango, labeo, auratus, livingstonii, afra), comet goldfish, hillstream loach, the mystery / ramshorn / trumpet
snails, the crested gecko and green anole colour morphs (same rules as the base species), the brown anole and the jumping spider.
Tank sizes: 5, 10, 20 high, 20 long, 29, 40 breeder, 55, 75, 125, two all-in-one
cubes, a 20 long paludarium and four terrarium sizes. The full list is `survey-v4-index.md`; in short:

| module | tanks | what it informs |
|---|---|---|
| A community | 16 | the water and floor scales at the counts people keep (A04, A10, A13), tiny / mid classes (A11, A14, A15), footprint vs height (A04 / A05), the betta minimum (A01), temperature-margin gates (A02, A06), the nip gate (A07), the angel height minimum and the prey-size rule (A08, A09), sexed livebearer groups and the swordtail refit (A16) |
| B specialist | 16 | the oscar, goldfish, clown loach minimums (B01-B03), the big class (B02, B04), the discus golden (B05) and discus community (B06), mbuna overstocking and demasoni width (B07), Malawi mixes (B08), chemistry gate (B09), breeding-pair floor guards (B10, B14), a no-overlap temperature plus a shrimp-predation block (B11), the males rule (B12), puffer territory and species-only (B13), a food-not-room limit (B15), the invert class (B16) |
| C saltwater | 12 | clown and royal gramma minimums in nanos (C01, C02), invert predation by size vs by habit (C03), a full 40 breeder reef and the coral-nipper gate (C04), the salt scale against volume (C05, C08), yellow and blue tang minimums and two tangs together (C06, C07), maturity / food (C09), Banggai, gramma, firefish and clown caps (C10-C12) |
| D herps | 16 | floor minimums for leopard gecko, crested gecko, ball python, axolotl, tarantula (D01, D03, D06, D13, D16), per-extra-animal floor and height (D02, D05, D09, D15), sex rules (D02, D05, D15), cross-species on land (D04, D08), amphibian groups (D07, D10, D11), the two pairings shops suggest (D12 frogs + betta, D14 axolotls + fish), a toxin gap (D10) |

Counts are asked of the species marked `*` in the index; the other animals are held as shown.

## 4. Questions and the answer schema

Per tank, in this order; a question appears only when the tank's `ask` lists it.

| key | question | values |
|---|---|---|
| `verdict` | your verdict on this tank as shown | `ideal` · `caution` · `problems` · `unworkable`; or `skip: true` (nothing else asked) |
| `change` (+ `changeSp[]`) | the first thing you would change | `nothing` · `fewer` (of changeSp) · `bigger` (tank) · `drop` (changeSp) · `ratio` (group size or sex ratio) · `notroom` (food, maturity or habitat is the limit) · `other` (note) |
| `together` (+ `reasons[]`, `problem[]`) | keep these together long term? | `yes` · `caution` · `no`; reasons from `eat`, `nip`, `aggression`, `temperature`, `chemistry`, `habitat`, `food`, `disease`, `breeding`, `other`; `problem` names the species when the tank has three or more |
| `ideal`, `limit` (or `countStatus`) | with the others as shown, how many of the counted species | whole numbers, 0 allowed; or `cant-say` · `no-valid-count` |
| `bigEnough`, `smallest` | big enough for one adult of the named species at all; the smallest of four offered sizes you would use for it as stocked | `yes` · `no`; one of the four size labels or `larger` |
| `max.<species>` | the most of that species you would keep in this tank, whatever else is in it | one of the offered counts (e.g. 0 · 1 · 2 · 3 · 5 · 7+) |
| `maxMales.<species>` | the most males of that species here | 0 · 1 · 2 · 3 |
| `confidence` | how sure | `low` · `medium` · `high` |
| `note` | free text | |

Export file: `{ survey: "v4", build, expert, expertKind (keeper · professional · ai), modules[], made, answers: { <tankId>: {...} }, carried[] }`.
`ms` per tank is time spent. An LLM pack returns the same object for one module, with `expertKind: "ai"`. The HTML stores the same
shape (it flattens `max.<species>` to `max:<species>` internally and nests it on export; import accepts both).

## 5. What each answer calibrates

| answer | engine component | how it is read |
|---|---|---|
| `verdict` | the app's overall verdict for the same tank: the space band (75 / 100), the tank minimum (`tankMinimum`), the group bands, the fighting limits (`crowdWarnings`), the compatibility gates (`compatRisks`), the herp checks (`herpcheck`) | a 4 x 4 agreement table per `tests` tag; the median expert verdict vs the app's. A tag whose tanks disagree by a band is a change proposal |
| `ideal` / `limit` | `SPACE_FACTOR` per species, the class factors, the global water and floor scales (`scripts/calib-fit.mjs`, unchanged meaning: ideal = 75, at most = 100) | the fit on the 25 count tanks, same priors, each expert with a bias term; salt tanks read with `water.salt = true` (SALT_LOAD 1.5 is then on trial too) |
| `change` | which dimension binds | `fewer` of X = the space engine's biggest contributor should be X (the max-rule check of round 2, one click instead of three bands); `bigger` = a tank-minimum answer; `drop` X = a compatibility answer about X; `ratio` = groups.ts bands / sexed / males; `notroom` = careNeeds, grazers, maturity |
| `together` + `reasons` | `animalfit.ts whysAnimal` gate kinds | `eat` = `prey` (size, cats, shrimp); `nip` = `nip` vs `slow` / `feelers`; `aggression` = `temper`, `alone`, `guard`, `territory`, `max`; `temperature` = the comfortable bands and the narrow-margin rule; `chemistry` = `ph` / `gh` / salt; `habitat` = land vs water, herp `mates`; `food` = careNeeds, grazers; `breeding` = `sexed`, pair rules; `disease` = **no rule exists** (toxins, D10): a gap, not a calibration |
| `bigEnough` / `smallest` | `tankmin.json` red (the line) and green (recommended) per species | the largest size experts call not big enough -> red; the median "smallest you would use" -> green. Fourteen species get a direct reading: betta, angel, oscar, goldfish, ocellaris, royal gramma, yellow tang, blue tang, leopard gecko, crested gecko, ball python, White's tree frog (for three), axolotl, tarantula |
| `max.<species>` | `groups.ts` `max`, `territory`, and `herpstock.ts` `max` / `each` | the median vs the app's figure for that tank size; eleven species |
| `maxMales.<species>` | `groups.ts` `males` (dwarf gourami), herp `males2` (anole) | the same |
| `confidence` | weight | 0.5 / 1 / 1.5 as before |
| `skip` | nothing | counted per expert and module; a module with many skips from a keeper is outside their domain, a module with many skips from an LLM is a prompt problem |

## 6. Reading the results

1. **Per tag, not per tank.** Group the tanks by `tests` tag; for each tag show the app's verdict and the experts' median verdict, and for
   the count tanks the engine's reading at the median ideal and at-most counts. A tag is "flagged" when its tanks disagree with the app
   by a band in the same direction, or when the median count fix (the multiplier the engine's reading needs) is more than 15 % off.
2. **Disagreement between experts is the noise floor.** With three or more experts per module, the spread on a tank bounds what the
   app can be asked to match; a tank where the experts split is a tank where the app may stay as it is.
3. **A flagged tag becomes one proposal**: a factor, a minimum row, a group cap, a gate rule, with the tanks that drove it, for Nathan's
   yes, then provenance (`src: expert-v4`) and re-blessed tests. The count fit stays a cross-check, as section 9 of the old design says.
4. **The two gaps that cannot calibrate, only add**: toxins (D10) and "predation by habit" (hermits killing snails for shells, C03; six-line
   wrasses harassing shrimp, C03) have no rule to tune. If experts flag them, they are new rules.

## 7. Running it

- **Who.** Three to five experts per module give a usable disagreement estimate. Keepers and professionals answer the modules they
  know (A + B is about 45 minutes, C about 20, D about 25). LLMs answer all four, one module per conversation, from the text pack.
- **LLM protocol.** Paste `survey-v4-llm-<module>.md`, ask for the JSON only, save the reply as `answers/v4-<model>-<module>.json`
  with `expert` set to the model name and date. Each model is one expert with its own bias term; two runs of the same model are not
  two experts (they share the bias). Nathan's own answers go through the HTML like anyone else's.
- **Hygiene.** The build id in every file; an export from another build is kept apart. Nothing in a tank changes once anyone has
  answered it; a new tank is a new id in a new build (v4.1), never an edit.
- **Nothing to render**: no pictures, so a round costs the scenario file and the generator run.

## 8. Round B

Not a new seed. Round B is 15-25 tanks written the same way around whatever round A flagged: the same tag at a second tank size or a second
species of the same class, and the three or four most-split tanks of round A reworded (another count, another tankmate) to see whether the
split was the tank or the question. Round A's unflagged tags are not asked again.

## 9. Work for the lane that adopts this (not done here)

This folder is the stale copy; the files need copying into the live repo on `xc` (suggested `research/calib/v4/`). Then:

1. **Engine tables for v4** (`GEN_RETABLE`-style, one engine run per tank): fresh tanks through the existing `setupOf`; salt tanks with
   `water.salt = true`; terrarium tanks through `herpcheck` (floor sq ft, height, max, mates); the paludarium (D10) with whatever the app
   says today, recorded as such. Store the app's verdict per tank (band, tank-minimum result, group warnings, compat level and items)
   next to the counts table, since section 5 reads verdicts as well as counts.
2. **A parser for LLM answers**: validate every value against section 4 (unknown values -> set aside and listed), merge the four
   module files of one model into one answer file.
3. **`calib-fit.mjs`**: accept the v4 fields (`verdict` as the overall band, `ideal` / `limit` as before, `countStatus`), fit counts only on
   tanks whose `tests` include a `space.*` or `golden.*` tag.
4. **A review script** that prints section 6's per-tag tables and the per-species minimum and max readings, and keeps a hand-written
   Findings section across reruns, like `calib-review.mjs` does.
5. **Provenance**: a `sources.json` entry `expert-v4` with the experts (names only with consent) and the build id.

## 10. Decisions this note takes, open for Nathan to overrule

- 60 tanks in one set, modular, instead of 22 random tanks a round.
- Counts asked for 25 tanks only; minimums, maxima and compatibility carry the rest.
- Text only, no renders.
- LLM experts answer from a text pack in JSON, not from screenshots of the HTML.
- The discus golden stays in the set as B05 so the experts, not only Nathan, anchor it.
