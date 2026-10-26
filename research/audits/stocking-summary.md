# Stocking summary: how assessments are presented (S243, review only, 2026-10-26)

Lane S243, Coordinator 11. Nathan's target (2026-10-26): ONE prominent number for spatial fullness; categorical results
(Compatible / Caution / Problem / Not enough information) for social needs, environment, behaviour and species tank
requirements, each expanding into its reasons; no percentage scores for the categorical ones. Nothing in `src/` was changed.
Pictures are in `research/audits/stocking-summary/` (fig1-fig5); the scripts that made them and every probe output are in
`research/audits/s243/` (driver.js + app.html drive the real app on the dev server and draw the call-outs; probes/ holds the
engine probes and their outputs). Numbers below are from build 1303 (origin/main 6a1dfda); tank sizes are gallons and inches.

## 0. The short answer

1. **Almost everything the target needs already exists as engine output.** What is missing is the grouping and one status per
   group, not the checks. The smallest change is a pure view-model (`categorize(S)`, prototyped in `research/audits/s243/mock.js`,
   about 60 lines) that sorts the existing reasons into four buckets and takes the worst level; no engine number changes.
2. **The fullness number is not pure space today.** Four things ride in it: the filtration (ammonia) percent is folded in with
   `max()` (stocking.ts:269); two species carry hand-set multipliers that encode needs other than room (discus x1.435, otocinclus
   x0.63 plus a group-growth term: 57 % -> 82 % and 122 % -> 82 %); the calibration set that fixed the scale is 9/37 temper-capped
   published lists; and the minimized pill is overwritten by "Too small" / "too big" / "compat risk". Territory, aggression and
   compatibility do NOT feed the percent (verified: territory.ts header and a sweep, section 3).
3. **The same failure is stated up to six times** across tile, stocking screen and plan sheet, mostly because every pairwise
   reason is said from both animals' side and each screen has its own copy. Predation, size and "too full" read as three
   different problems when they are one (fig 3).
4. **Green is not justified everywhere.** 16 of 85 water species have no tank minimum on record and still read "Meets
   minimum / Meets recommended"; behaviour has no intraspecific-aggression data, so a tank of demasoni reads "Compatible"
   (fig 5); 44 of 85 species have no GH range so the hardness check silently passes. S242 owns the full audit; section 4 gives
   only the counts this review needed.
5. **Not a UI rebuild.** The Fullness tile already is the right container (minimizable, already hosts every box). Mock = same tile,
   one big number, four expanders (fig 4, 5). Needs one small chip style and the dedupe rules in section 6.

## 1. Which assessments exist in the engine

| Assessment | Where | Output | Data it rests on | Target category |
|---|---|---|---|---|
| Water-column space | `stockingOf` stocking.ts:245 (`waterPercent`) | number | body mass^0.45 x per-species factor (54/85 own AqAdvisor fit, rest class default) x height curve x one school curve | **Fullness** |
| Floor space | same (`floorPercent`, `floorUseCm2`) | number | 15 sq in per inch of fish, zone share, `FLOOR_FACTOR` | **Fullness** |
| Filtration / ammonia | `nitrogenBudget` (nitrogen.ts) -> `filtrationPercent` | number | mass, metabolism class, temperature, feeding, plants, filter capacity | not space: **Environment** (water quality) or equipment |
| Nitrate / weekly water change | `Nitrogen.waterChange` (3 states) | text + % per week | same budget | Environment |
| Tank minimum (footprint, length, depth) | `tankMinimum` tankMin.ts:178 | percent per species, red/green lines | tankmin.json, 69/85 species have a red line | **Tank requirements** |
| Group size band | `notesOf` stockPlanLogic.ts:79, `groupShort` animalfit.ts:139 | band + prose | groups.ts bands, CARE.group | **Social** |
| Sex ratio / pairing | `notesOf` (ratio, pairing), `pairingIn` | prose | groups.ts `sexed`, pair rules | Social |
| Fighting counts (males, one-to-a-tank, size-scaled max) | `crowdWarnings` territory.ts:14, `overWarn` | sentence | groups.ts territory / males / solo rules | **Behaviour** |
| Predation | `preyRisk` + `whysAnimal` animalfit.ts:32/45 | block / concern | CARE.prey (13 species) | Behaviour |
| Nipping, long fins, feelers, "too aggressive", species-only tank, look-alike rivals | `whysAnimal` | block / concern | CARE.temper (required 0-2 field, no "unknown"), nip, slow, feelers, alone, fam | Behaviour |
| Water chemistry (pH, GH) | `whysAnimal` (preferred vs acceptable ranges) | block / concern | waterchem.ts; GH on 41/85 only | **Environment** |
| Temperature, whole stocking | temprange.ts `sharedRange`, `operatingCheck`, `holdCheck`, `measuredCheck` | states none / single / narrow / broad / unknown + the tank's own three checks | climatedata.ts (85/85 have a range) | Environment (+ the S242 "tank not set" case) |
| Cover (plants, caves) | `coverAdvice` territory.ts:70 | sentence | CARE.cover | Environment (links to Behaviour) |
| Care needs (lid, shells, live food, tank age) | careNeeds.ts `needsOf` | always "unchecked" | 9 species | Environment ("not enough information" by construction) |
| Grazer food shortage | grazers.ts `grazerShort` | short / severe | 4 species (turbo, nerite, oto, amano) | Environment |
| Reptile / amphibian rules | `herpCheck` herpcheck.ts:23 | warn / note / info | herpstock.ts | all four, in one list |
| Salt vs fresh, land vs water, expertise | `conflictsOf`, `whysAnimal` | block | species flags, `layout.expertise` | Environment / (expertise is not stocking) |
| Light and CO2 per plant | lightcheck.ts | verdict per plant | out of scope here (plants, not stocking) | - |
| Water "Agreement n/100" | climate.ts:68 | **a 0-100 score** | same ranges as temperature | Environment: the only categorical-in-spirit result that is a percentage-like score today |

## 2. Where each is shown, and how

| Surface | What it shows | How |
|---|---|---|
| **Fullness tile** (top left of the view, fullnessTile.ts) | water / floor / filtration gauges, tank-minimum bar + one red line per species, one compat box, fighting counts, cover advice, a closing reason sentence, "What counts", an ammonia fold | gauges for numbers; amber/red boxes (`ftWarn`) for the rest; no grouping, order is by code path |
| **Minimized pill** | the larger of space and filtration, OR "Too small" (tank minimum), OR "N% . too big" (set space) + " . compat risk" | one slot, five meanings (fullnessTile.ts:113, 240) |
| **Stocking screen** "An animal I want" | per species: pairwise conflicts (red), "Also:" extra reasons, group band (green/teal), sex ratio, fighting warning, grazing warning, habitat notes, care needs, pairing; panel top: "Tank verdict", temperature range + setpoint; tank-size list with space band + "too full / too small / too short" | text lines, colour by severity; the group line repeats "this tank fails ... see the tank verdict" under every species (`groupLineIn`) |
| **Plan sheet** (Print / .txt) | water, floor, filtration bars; "Does it fit?" = no line is red; one line per animal with its blocking reasons (+ indented "also:"); a temperature trio; "Care needs the tool cannot check"; shopping list rows that repeat the percentages ("Space: ... 82 % ...", "Waste: ... 25 % ...") | text list with tick / ! / x |
| **Editor species list** (Quick setup, "Stock by care gates") | greys a species with the first blocking reason + count of others; expertise, tank size, compat | per-species gate, `gateOf` |
| **Editor "Animal checks"** | herp rules, warn / note / info | separate collapsible list (panels.ts:1838) |
| **Split-view label** | "Stocking 78 %" = max(space, filtration) | one chip per tank while comparing (panels.ts:2224) |
| **Climate panel** | "Set to 78 F, pH 7.2 . Agreement 100/100", per-axis "not recommended long term" | score out of 100 |
| **Builds screen / tank-size list** | `tankfit` `fails[]`: space, filtration, minimum, length, depth, floor, height, one flat list | "too full", "no filter carries it", "too small for them" ... |

## 3. Problems carried by the spatial number

Measured on build 1303 (`probes/out-*.txt`).

| # | What is in the number that is not space | Evidence | Effect |
|---|---|---|---|
| P1 | **Filtration folded in.** `percent = max(spacePercent, filtrationPercent)` (stocking.ts:269). Space and filtration are two limits; the headline (split-view chip, pill once a filter is set, `tankFor`) is the larger. | 1 oscar + 6 neon in 18.7 gal: space 154 %, filtration 274 %, engine `percent` 274. In the 37 published lists filtration is the binding limit in only 2 (the flowerhorn 40 gal, 111 % against space 53 %, and the angelfish school, 150 % against 118 %), so the leak is rare for hobby stockings but it is the headline whenever a big messy body is in. | Equipment adequacy shown as "how full" |
| P2 | **Hand-set per-species nudges for non-room needs.** `SPACE_NUDGE` discus 1.435 ("6 discus in 55 gal should read 85 %", Nathan 10-22), otocinclus 0.63; `GROUP_GROW` oto (food and grazing surface "a big group exhausts"); `FLOOR_FACTOR` oto 0.5, kuhli 0.6 (behaviour: piles into caves). | 6 discus, 48x13x21: **82 %**, 57 % without the nudge. 25 oto in 30x12x18: **82 %**, 122 % without nudge + group growth. 12 oto in 24x12x12: 79 % vs 126 %. | A discus's need for big water and an oto's food supply are in the room number, with no label saying so. These are legitimate calibration targets; the reason is just not visible. |
| P3 | **The scale was calibrated on lists capped by temper, not room.** SR step 1 tagged the 37 published lists: 28 `room`, 9 `temper` (pea puffers, apistogramma pair, angel pair, tiger barbs, saulosi, damselfish ...). | Space reads a median **73 %** on the room-capped lists and **47 %** on the temper-capped lists at their published maximum. SPACE_PER_L was fitted to a median 74 % over all 37. | The scale absorbs "experts stop here because they fight" as "experts stop here because it is full". Every "ideal / caution" colour inherits it. |
| P4 | **Pill substitution.** `head: tooSmall && head.level !== 'over' ? {text: 'Too small'} : head`; "N % . too big"; " . compat risk". | 8 demasoni in 44.9 gal: bar 47 %, pill "Too small". | When minimized the number the target wants always visible is replaced by a category. |
| P5 | **One flat failure list.** `tankfit` `fails[]` mixes space, filtration, minimum, length, depth, floor and height; the size picker greys a tank for any of them and `tankFor` / `planOf` treat them as one "fits / does not fit". | stockPlanLogic.ts:223 (`FAIL_WORD`), tankfit.ts:161-170 | The tank-size list and "Does it fit?" give fullness, filtration and species requirements the same weight and colour |
| P6 | `FLOOR_FACTOR`, `TINY_EXPERT`, the school curve | behaviour-shaped but they describe *how animals use space*; keep in the number. | none (noted so nobody removes them) |

**Does not leak (checked):** territory caps, `crowdWarnings`, compat risks, cover, grazers, temperature and tank minimum never
change `percent` (territory.ts header: "the stocking percent never reads it"; the sweep above recomputed percent with them absent).
So the largest cleanup is P1 (decide where filtration lives) and P2/P3 (label, do not remove).

## 4. Is the data good enough for a green status? (counts only; S242 owns the audit)

Counts over 85 water species (96 total, 11 land), `probes/out-counts.json`, `probes/out-no-minimum.txt`.

| Category | What a green would claim | Data present | Gap that makes a green dishonest today |
|---|---|---|---|
| Fullness | "room is fine" | mass for all; 22/85 masses are estimates (inverts, herps); 54/85 own space factor | not a green, a number; engine says "good to about a factor of two" (plan sheet). Show it as a number only (the target does). |
| Social needs | "group is big enough" | group bands for all | pairing is unknown by default (handled); sex ratio only on the stocking screen, never on the editor tile. |
| Behaviour | "nobody will be eaten, nipped or fought" | prey 13/85, `temper` is a **required** 0-2 field (cannot be unknown), `alone` / `nip` / `feelers` sparse; **no intraspecific aggression field** (demasoni, rams, krib pairs are prose in `msg`) | pairwise only: a tank of one aggressive species reads "nothing found". Fig 5: demasoni 8 in 44.9 gal Behaviour = Compatible while the stocking screen says "Dominance fights; only in a big tank". Needs "no rule fired" to read "Not enough information", or a rule. |
| Environment | "water suits them" | temperature 85/85; pH 85/85; **GH 41/85** (44 silently skip the hardness check); flow and light per species mostly absent; care needs 9 species (all unchecked) | missing GH / flow reads as pass; tank temperature unset is a different case (S242 situation 3) and today shows as an amber "unchecked" on every plan |
| Tank requirements | "tank is big enough" | red line 69/85; **16 species have none** (15 inverts + fire-bellied toad) | the bar still prints "Meets minimum" / "Meets recommended" (12 in cube, 1 redclaw crayfish: "Meets minimum"). "Not assessed" exists only for the too-shallow case and is painted red (fig 3). |

Provenance: 842 of 1277 CARE values are TankLook interpretation (research/source-coverage.md); `rules-spec.md` section 3 (severity and
confidence separate) is the right frame for the chip, not a new idea.

## 5. Duplicate warnings

Scenario A (2 dwarf gourami, 6 tiger barb, 1 pea puffer, 18.7 gal), fig 1 and 2. Each underlying failure and how many times a
reader meets it:

| Failure | Tile | Stocking screen | Plan sheet | Total |
|---|---|---|---|---|
| Tiger barb nips the gourami's feelers (A) | in one compat box | gourami row + tiger barb row | gourami line + tiger barb line | **5** |
| Pea puffer nips the gourami's feelers (B) | same box | gourami "Also" + puffer row | gourami "also" + puffer line | **5** |
| Two male gouramis fight (C) | box | gourami row (red text, then "Group size: Great" directly below) | **absent** | 2 |
| Pea puffer wants a species tank (F) | in the compat box | on all three rows ("Also: best kept in a species-only tank") | absent | **4** |
| Tank too full (H, 20 gal long: 106 %) | bar + sentence | "Tank verdict" + per-species "this tank fails (too full ...), see the tank verdict" x3 + "too full" on the size button | space line + shopping-list row "Space: ... 82 % ..." | **8+** |

Patterns, all visible in fig 1-3:

- **Both sides of a pair.** The engine says a pair once from the acting side, but the stocking screen and plan sheet say it again
  from the victim's side ("it would nip this one's feelers" under the gourami, "would nip its feelers" under the barb). The plan sheet
  counts it as two failures.
- **One cause, three languages (fig 3).** An oscar in 18.7 gal is "Water column 145 %", "Filtration 274 %" (hidden behind "needs a filter"),
  a red "Tank minimum: Not assessed" and a sentence "tank is too small for them (145 % of its space)". They are one fact
  (it is too big for this tank); nothing says so, and one of the four is an unknown rendered as a failure.
- **Surfaces disagree.** The plan sheet omits fighting counts, cover advice and grazer shortages, so it can say "fits" where the
  tile warns: 25 otocinclus in a 29 gal reads fits = true on the plan sheet; the stocking screen says "will run out, feed algae wafers".
  Betta x2 + 6 panda cory (10 gal): "betta best one to a tank" on tile and screen, only the cory minimum on the plan sheet.
- **Same line on every row.** A narrow shared temperature range (24-25 C) is printed under every species on the stocking screen and
  again on the plan sheet next to "Water temperature: unchecked".
- **Contradictory pairs.** Under the red "Dwarf gourami males fight" the same row says "Group size: Great" (green/teal); the pea puffer
  row says both "best one to a tank: expect fighting" and "Keep one male to several females".
- **Colour reused.** The compat box is the most severe colour on the tile yet carries mild "concern" items beside blocking ones.

Rule for the target (Nathan: the same failure may appear in several categories only if the UI explains the link): every item
belongs to exactly one category; a cross-link is printed as a short "(also counts under Behaviour)" tail, never as a second line.
Pairs are one line, naming both animals ("Tiger barb nips Dwarf gourami's feelers"). Where one cause has several measures
(oscar), the primary category holds the sentence and the others show "see Fullness". The prototype already does the first two.

## 6. How much UI is actually needed

### Mapping (proposal, nothing built)
| Today's item | Category | Level source |
|---|---|---|
| water, floor bars | **Fullness** (the one number: `spacePercent`, "limited by swimming room / floor") | gauge, no chip |
| filtration bar, nitrate change, "needs a filter" | Environment (water quality), as a categorical line; **decision for Nathan: leave out of `percent`** (P1) | `nitrogen` states |
| group band `avoid`, pairing, sex ratio | Social needs | warn |
| `crowdWarnings` (fighting), solo, predation, nipping, feelers, aggressive, species-only, look-alike | Behaviour | bad = block, warn = concern |
| pH / GH, temperature, cover, grazer food, lid/shell/live-food needs, land vs water, salt vs fresh | Environment | bad / warn / unk |
| `tankMinimum` lines, tank depth | Tank requirements | bad if over the red line, warn below Recommended or deeper than advised |
| species with no minimum / no GH / no temper rule | the same category, level `unk` | "Not enough information" |
| tank temperature not set | the same category, level `unv` | "Compatible, unverified" (S242's situation 3) |

Status per category: any bad -> **Problem**; else any warn -> **Caution**; else any unk -> **Not enough information**; else any
unv -> **Compatible, unverified**; else **Compatible**. That is exactly the four states Nathan named (plus the S242 qualifier).

### The mock (fig 4, 5), built from existing parts
The real Fullness tile re-skinned by `research/audits/s243/mock.js`: tile title, tank size line and the gauge are unchanged
(`bar()`, `gaugeStyle`); the one number is the existing `spacePercent`; each category is a `<details>` like the tile's existing
"What counts"; items are the strings the engine already produces. New CSS: the chip (4 colours) and the big number.
Fig 4 (scenario A): 82 % fullness, Social Caution, Environment Caution, Behaviour Problem, Tank requirements Compatible,
instead of seven boxes. Fig 5 (scenario H): the number stays at 47 % while Tank requirements shows Problem, the pill problem (P4)
disappears, and Behaviour honestly shows what an absent rule looks like (gap G1).

### Work list, smallest first (each is independent)
1. **View-model only** (`scene/stockSummary.ts` + tile render swap). `categorize()` reuses `whysAnimal`, `crowdWarnings`,
   `coverAdvice`, `minWarnings`, `sharedRange`, `needsOf`, `grazerShort`, `notesOf`. About 150 lines with tests; tile only; no engine
   change; the stocking screen and plan sheet keep their text until step 3.
2. **Level for the unknowns.** Make "no minimum", "no GH", "no prey/temper rule fired for a species with prose aggression" emit
   `unk`; needs S242's field list (do not duplicate it).
3. **Point the other two surfaces at the same view-model**: the plan sheet's "Does it fit?" lines and the stocking screen's per-species
   red text become the category rows (kills the both-sides duplicates, the per-row "see the tank verdict", and the plan sheet's
   missing C / D lines).
4. **Fix P4 / P1**: the minimized pill shows only the number (+ a coloured dot for the worst category); decide whether filtration
   leaves `percent`. This is the only step that moves engine numbers (then `GEN_RETABLE` x2 per the lane rules).
5. **Label P2 / P3**: a one-line reason beside the number for species that carry a hand-set nudge ("6 discus are counted at 1.4x:
   they need more water than their size"), and note the 9 temper-capped lists in SR's HANDOFF so the next re-fit knows.
6. Retire the climate "Agreement n/100" score for a category chip (Environment), since the target forbids a percentage score there.

### Open decisions for Nathan
- Filtration: Environment line (recommended; a second number would be a second fullness) or keep as the larger-of in `percent`?
- "Compatible, unverified" vs "Not enough information" wording for a tank with no temperature set (S242 proposes the former).
- Behaviour for species with prose-only aggression (demasoni): show Caution from `temper` 2 in a single-species tank, or leave
  Compatible until a rule exists? (the mock leaves Compatible and says so)
- Does "Not assessed" (oscar too shallow) belong under Tank requirements as Problem or Not enough information?

## 7. Reproduce
`npm run dev` (port 5173), then `powershell -File research/audits/s243/shot.ps1 -Fig A-stock -Out x.png -W 1400 -H 1000 -Extra 'tank=20%20gal%20long'`
(figs: A-stock, A-plan, G-tile, A-tile, H-tile, A-mock, H-mock); `python research/audits/s243/compose.py <tmpdir> research/audits/stocking-summary`.
Engine probes: `probes/*.test.ts.txt` (copy to `test/*.test.ts` to run; they write to `probes/out-*.txt`).
Uncommitted dev-only files created for this lane: none outside `research/audits/`.
