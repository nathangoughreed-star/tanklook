# Fable brief 6: making every verdict trustworthy (stocking %, compatibility, gear fit, plant needs)

Written 2026-11-25 by a Sonnet evidence-gathering agent from origin/main (checkout `Glass-Box-fable`, branch fable-briefs). Observations only; the design is yours. Pictures are in `research/fable/6-trust/` (paths relative to the repo root).

## The one question

> The category's top complaint is stocking and compatibility numbers people don't trust (AqAdvisor's unexplained % called "hocus-pocus"; the top Reddit reply says calculators are too conservative). Given how TankLook's engine computes and shows its verdicts today, design how every verdict (stocking %, compatibility, gear fit, plant needs) should be presented so a beginner trusts it and an expert can audit it: the levels of warning, what each warning must carry (reason, source, confidence, fix), whether a headline % survives, and how to show that the engine is expert-calibrated rules and data, not generative AI. Rank the changes by trust gained per unit of effort.

## 1. Product context (short)

TankLook / YourArium (live https://tanklook.com) is Nathan's personal 3D aquarium and vivarium planner (Vite + TypeScript + three.js). It is for every experience level, free, no account. Vision: help people plan, evaluate, be inspired and learn; experience is an optional gate; money matters (real products, prices, deals); it is NOT a care guide. All verdicts are advice: "nothing blocks adding anything" (header of `src/scene/animalfit.ts`). The engine is deterministic TypeScript over hand-curated data; no model call anywhere in a verdict. Units: US in chat; the engine works in litres/cm and the UI converts.

## 2. Competitor evidence (what users distrust, what the trusted ones do)

Files: `research/competitors/` (SUMMARY.md, 17, 18, 19, 20, 23, chatgpt-report-delta.md).

**AqAdvisor (17-aqadvisor.md), the incumbent, one unexplained percentage.**
- "one member entered 10 neon tetras in 10 gallons, got 80%, and called it 'completely hocus-pocus'"; "a 55-gallon mix scored 99%, and adding 8 more corydoras made 118%, and the poster questioned whether that was really too much" (17, Complaints).
- Non-linear: "28 chili rasboras = 100% in 15 gallons but 8 = 46%" (17, from a search snippet only).
- "Ignores live plants ... shows effectively 0% filtration with no filter" (r/Aquariums comment, snippet only).
- Its own disclaimers: "does not guarantee long-term compatibility, recommends understocking for beginners, 'far from' perfect, rarer species have less data, diet is stored but not analyzed, biotope checks only cover mbuna" (17, What it does).
- Still the de facto citation on forums: "a retired FishForums moderator says it ... is useful for planning a new tank, comparing it to a sat nav"; staying under 100% "generally avoids overstocking" (17, What users love).
- SUMMARY s2: "Untrustworthy stocking numbers. AqAdvisor percentages are 'hocus-pocus' or non-linear and ignore plants."

**My Aquarium Guide (18-my-aquarium-guide.md), crude math, no explanation.**
- "DO NOT use it to calculate stocking info"; gallons required "seems off"; "goldfish and Jack Dempsey tank sizes called wrong; stocking ignores that species differ in waste" (18, Complaints, via a review aggregator, 23 reviews).
- Size shown only as S/M/L. Ideas taken: juvenile vs adult size per species; "per-species waste/bioload explained next to stocking numbers, since users distrust crude gallons-per-fish rules."

**The Reddit thread (23-reddit-3d-ar-planner.md), the cardinal case.**
- "The top reply: calculators are too conservative. Its example: one reads 80% for 10 cardinals in a 40 breeder, where experienced keepers run 30-40 cardinals plus apistos, corys and a pleco. It recommends forums and a parameter / water-change tracker instead."
- Builders of a rival calculator complained about AqAdvisor's "dated UI, a page reload for every tweak, missing newer species" and planned "top / middle / bottom zone capacity", "a planted-tank toggle offsetting nitrate" and "temperature, fin-nipping, substrate-digging and lid warnings."
- On AI: "a top-1% r/Aquascape commenter warned the sub 'heavily frowns upon' AI-based planners"; the idea taken: "state plainly how setups are generated (rules and data, not generative AI) wherever we say 'suggest' or 'generate'" (23, Ideas).

**The two trust-first products (new, tiny, no audience, but the pattern is the point).**
- Impossible Aquariums (19): "Returns animal and plant recommendations with a reason and source for each verdict, checked against published ranges." Idea: "Show a source and plain reason beside every stocking or plant verdict."
- AquaCompat (20): "Deliberately shows evidence instead of a single pass/fail percentage"; pairwise score 1-10 "from six factors (temperature, temperament, size/predation, pH, hardness, swim level); 8+ compatible, 5-7 caution, under 5 incompatible; two hard deal-breakers"; "Cites 23 documents from 12 publishers" on a methodology page. It states what it does not model: "filters, plants or feeding", adult size only.

**The ChatGPT report (chatgpt-report-delta.md), the warning grammar and the dissent from a headline %.**
- "Warnings: hard / conditional / preference levels; each warning gives a reason, source, confidence and a fix. It argues against a single '92% safe' score. That cuts against our headline % (and our R152 idea): show the % with its reasons, never alone." (line 23)
- "Aquarium Designer: suggested goldfish habitat and Anubias planted in substrate called out as bad husbandry. A wrong care rule costs trust even in a game." (line 17)
- Benchmark rule it proposes: "a husbandry failure can't be averaged away by good rendering" (line 26).
- Sandbox principle: "warnings that never erase work" (line 22), which TankLook already follows (advice only).

**Requests logged for this** (`research/requests.md`, all still "needs a lane brief" or "check engine, then brief"; none built):
- R152: "explain every stocking percentage species by species, and show where we differ from AqAdvisor (the category's top trust complaint)".
- R153: "show live plants' effect on filtration / bioload visibly (AqAdvisor ignores plants). First check whether the engine counts plants at all." (Answered in section 4: it does, a little.)
- R156: "show juvenile vs adult size per species from the engine's growth data".
- R161: "capacity meter with explicit warn / block thresholds, plus a 'which filter fits' quiz as a way into gear (Aquabuildr)".
- R141 (older, 11-18): a species-onboarding checklist requiring "specific needs, checks and warnings ... minimum tank dimensions" per species, with a test.

## 3. How the engine computes verdicts today

### 3a. Stocking: `src/scene/stocking.ts` (395 lines), calibration in `research/expert-calibration.md`, `expert-curve.md`, `aq-compare.md`, `habitat-model.md`
- **Load** per animal = body mass^0.75 x a metabolism class (messy 1.5, active 1.2, normal 1, sedentary 0.7, grazer 0.6, shrimp 0.5, shell 0.3, herp 0.4) x a temperature factor (waste doubles every 10 K). Mass comes from FishBase length-weight (`src/data/bodymass.json`); shrimp, snails and herps are marked "estimate".
- **Space** (what the headline % is) = sum of mass^0.45 x a per-species or per-class multiplier, divided by the tank's effective litres x a fitted constant. The 0.45 exponent and the constant were fitted to 31 AqAdvisor answers (`research/aq-compare.md`: "Median ratio 1.01 (ours / AqAdvisor); ours higher by over 10% in 8, lower by over 10% in 11"). Then Nathan tilted it toward experts: animals under 2 g count 0.8 of their AqAdvisor-fitted space (`TINY_EXPERT`, "Nathan: trust the experts over AqAdvisor"), and the constant was re-centred so 37 published expert lists keep a median 74% at their published maximum.
- **School curve**: up to 10 animals each counts in full; above that n fish take 10 x (n/10)^0.72 fish's worth of room, one curve over all the fish in the water (fitted to six AqAdvisor answers for one tank, 2026-10-22). So later fish add less.
- **Height credit**: swimmers get room = floor area x a saturating credit of water height (Hs x (1 - exp(-H/Hs)), Hs per species from body depth and a class). Bottom dwellers are credited the same fixed 14 in of water whatever the depth.
- **Floor** (second limit, bottom dwellers): 15 sq in of floor per inch of mass-equivalent length; space = the larger of water and floor. Snails take no swimming room, only floor.
- **Filtration %** = waste load / (litres x 0.3 LU/L x filter capacity from the chosen filter x a live-plant factor). Since S243 step 4 (Nathan 2026-10-27) **the headline `percent` is room only** (= spacePercent). `loadPercent` (max of space and filtration) still decides "too much" for reasons, the starter's Full stop and the tile's pill colour.
- **Bands** (`IDEAL_MAX = 75`, `isOver`): up to 75% ideal (green), 75-100% "tread carefully" (amber), over 100% likely long-term problems (red). Scale chosen by Nathan 2026-10-23: 75 = what experienced keepers aim for, 100 = limit.
- **Reasons** are generated text from the contributors, for example "Overstocked mainly because of the 2 Fancy goldfish (70% of the load)" and "The tank itself is too small for them (156% of its space): no filter fixes that, it needs about 119 L of water or fewer animals." A `fixFilter` names the filter that would bring a filter-bound tank under 100%.
- **Expert calibration** (`research/expert-curve.md`, 2026-10-21): 73 points, 17 species, from light.fish, Fishkeeping World, Aquarium Co-Op, Tankarium and others; school exponent fitted slope 0.79 within one species and source ("The engine's SCHOOL_EXP 0.85 sits inside this range"; later changed to 0.72 by the AqAdvisor curve). Key finding: "The experts' 'full' and maximum stockings read only 59 % median in our engine ... The low maximums are temperament limits, not room ... Temperament caps belong in a separate per-species rule, not in the stocking percent." A survey-and-fit tool for further expert rounds exists (`research/expert-calibration.md`, `scripts/calib-fit.mjs`); the global fit was deferred 2026-10-26.
- **Per-species sanity table** `research/reasonableness.md`: smallest catalogue tank passing each species, with the limiting measure (length or floor area) and whether a stated source exists. Cardinal tetra: passes from a 24 x 12 x 12 in tank, 0.85 of the wanted size.

### 3b. Growth ("outgrows it in N months"): `src/scene/outgrows.ts`, `growcheck.ts`, `src/data/growth.ts`
Every stocking check is run at today's animal sizes and then stepped forward along every animal's growth curve together (monthly for two years, then quarterly, then yearly; bisected to the first failing month). The editor line reads "fine for now: this tank should last about N months, until it is about X in long; then <why>." (`growcheck.ts` line 29.) The failing check can be the tank minimum or a tankmate that can then eat another animal. Herps have their own line in `herpcheck.ts`.

### 3c. Compatibility and gates: `src/scene/animalfit.ts`, `src/data/care.ts`, `waterchem.ts`, `groups.ts`, `src/scene/temprange.ts`, `tankMin.ts`, `groupMin.ts`
- `whysAnimal` returns reasons of kind `expertise`, `size` or `compat`, blocking ones first and "material concerns" (`concern`) after. Pairwise: predation (mouth vs size), aggression/fighting counts (`territory.ts` `crowdWarnings`, e.g. dwarf gourami males), water chemistry (pH/GH ranges "follow FishBase" with a wider `phOk`/`ghOk` acceptable range set by Nathan 2026-10-26 after a blanket widening turned 360 of 388 failing pairs amber; `research/chem-audit.md`), temperature judged on the whole stocking's shared range, group minimums (`groupMin.ts`).
- Tank minimums come from `src/data/tankmin.json` red lines "sourced for a full-grown animal in a viable group", with 10% slack; the UI quotes the source inline, e.g. "(Fishkeeping World: 20 gal ...)" or "(est. from gallons)".
- A species with no data for a check does not fire; those are counted in "N checks had no data", a small line, not a warning (`src/ui/stockSummary.ts` header).

### 3d. Plants: do they count in bioload? (R153) Yes, weakly, and not in the headline
- `stocking.ts capacityOf` (lines ~291-295): live plants multiply filtration capacity by 1 + 0.25 x min(1, plants per 100 L / 15). Cap +25% at 15 plants per 100 L (about 25 plants in a 45 gal); a painted patch counts 3 plants. The code comment calls it "A documented guess".
- `src/scene/nitrogen.ts` runs a fuller nitrogen budget (waste in, filter bacteria, plant uptake by light and CO2, nitrate, weekly water change) behind the filtration % and a "nitrate line".
- Because the headline % is room only since S243, plants do not move the headline number at all; they only move filtration % and the amber/red "filter over" cases. Nothing in the UI says "plants helped here."

### 3e. Plant needs: `src/scene/lightneeds.ts`, `lightcheck.ts`, `plantfit.ts`, `gearFit.ts`
Each plant or coral has a PAR band and a care demand (low-tech / ferts / CO2). `lightcheck` gives each item a verdict `dim | fine | bright` ("only when the item will really struggle ... hardy plants outside their range are 'fine' with a recommendation") plus a tank line. `gearFit.fitGear` makes a generated design carry what is drawn: it adds CO2 only when a drawn species requires it ("recommended" CO2 never forces it) and swaps in the smallest stronger light or drops the plants it cannot carry, "in words" (`said`). The experience gate (`src/demand/experience.ts`, `scene/experienceGate.ts`) can mark plants and gear as "rated harder than the keeper said"; it is off by default.

### 3f. Gear fit: `src/scene/ownedFit.ts`, `tankfit.ts`, `src/ui/equipmentWarn.ts`
`ownedFit` emits notes (`{id, item: tank|light|heater|filter, text}`) when the design outgrows or stops using gear the person owns; a one-time popup with a button to My equipment, "never blocking". Product lists show badges such as "fits 29 gal" and "In use". A "Which filter fits" quiz does not exist (R161).

### 3g. One verdict object and the four-level vocabulary
- `src/scene/verdict.ts` composes every check into four buckets that "must never be confused": **gates** (welfare and physical: the animals, the water or the room cannot do it; never traded for money), **hard** (the person's own limits: budget, upkeep, time, space), **targets** (soft preferences; rank, never block), **advisories** (experience, caution, growth, "your light is not used"). Each `Issue` has `id`, `tab`, `uids` (which animal), one-line `text`, optional `relax` ("said, never applied") and optional `fix` (limit raise). No `source` or `confidence` field exists.
- `src/ui/stockSummary.ts` (S243): five topics (Tank minimums, Social needs, Environment, Behavior, Spatial fullness), each one level: **Compatible / Caution / Problem / Not enough information**.
- Per-animal `StockIssue.level`: `warn | note | info`.
- `src/data/provenance.ts` tags every advice value with a status: cited, fitted, derived, researched, claimed, assumption (else unsourced). Its header: "Read only by the source audit ..., never by the app, so nothing here reaches the bundle." The audit baseline (`research/source-baseline.json`) counts 10,225 values: cited 5,744; researched 1,175; claimed 994; assumption 1,429; derived 316; fitted 84; unsourced 483. A test ratchet fails if unsourced rises. So the data to label confidence exists and is not shown.
- Pictures show the current grammar: orange text = concern, red text = problem, with no confidence difference. `research/count-warnings-screen.png` (shown below) is a case where an unsourced judgment ("max 30 is P1 judgement") renders in the same red as a sourced fighting rule; the note in that picture proposes removing the judgment notes.

## 4. How verdicts are shown today (live site, 2026-11-25)

All pictures are screenshots of https://tanklook.com opened with a share link built from the engine (headless Chrome, 1500 px viewport, cropped). The scene is a fresh tank, so no heater and no filter were chosen.

| # | File | What it shows |
|---|---|---|
| 1 | `research/fable/6-trust/01-habitat-check-10-cardinals-40b.png` | Habitat check drawer: 10 cardinal tetras in 36 x 18 x 16 in (44.9 gal). Verdict pill "Not enough information" (no filter chosen). Water column 27% with "10 Cardinal tetras: 100%"; Floor 0%; Tank minimum "Meets recommended" with "at least 23.6" x 11.8"; Recommended 20 gal of water". By topic: Compatible x4, Environment "Not enough information" with a "Fix it" button. Footer line "27% · limited by swimming room. Ideal." |
| 2 | `.../02-habitat-check-40-cardinals-40b.png` | Same tank, 40 cardinals: Water column 73%, green bar, footer "73% · limited by swimming room. Ideal." Every topic still Compatible. |
| 3 | `.../03-habitat-check-overstock-top.png` | 2 fancy goldfish + 6 neon + 1 oscar (70 mm) in a 24 x 12 x 16 in (20 gal): verdict "Problem"; red box quoting "Fishkeeping World: 20 gal ... wants about 30.1" long, this one is 24" long"; amber "No filter chosen"; Water column 156% red with the per-species split (goldfish 70%, neon 20%, oscar 11%); Floor 40%; Tank minimum "Too small" with per-species numbers and "(est. from gallons)". |
| 4 | `.../04-habitat-check-overstock-by-topic.png` | Lower half of the same drawer: Tank minimums Problem; Social needs Caution ("group of 6: Neons are usually kept in schools of 8 or more"); Environment Caution; Behavior Problem "Oscar with Neon tetra: would eat it"; Spatial fullness Problem "156% of the swimming room: too many for this tank". |
| 5 | `.../05-animals-panel-cardinals-heater-warning.png` | Animals panel row for 10 cardinal tetras: orange line "requires heating, wants 73-84 °F, no heater, the water is estimated at the assumed 70 °F room: raise the temperature ... add a heater set to 73-84 °F". The row also has an "AqAdvisor [Check]" button and an "AqAdvisor" link: the app can show AqAdvisor's number next to its own (needs the proxy; availability polled). |
| 6 | `research/fable/2-first-visit/10-habitat-check-drawer.png` (existing) | Habitat check with a filter chosen (8 neon + 1 bristlenose pleco, 29.8 gal): "Compatible", Water column 46% with "8 Neon tetras: 67% / 1 Bristlenose pleco: 33%", Floor 17%, Tank minimum "Meets recommended", five topics Compatible. |
| 7 | `research/count-warnings-screen.png` (existing, build 1129) | Count notes: 30 neon grey "(at the most one tank takes: 30)", 31 neon red "More than 30 ... expect fighting or crowding"; green dwarf gourami (sourced fighting rule). Annotated: the neon max is "P1 judgement" with no source. |
| 8 | `research/dwarfgourami-males-warning.png` (existing) | Red: "Dwarf gourami males fight: a tank this size takes one male (one more per 15 gal); if more than 1 of these 2 are males, expect fighting. Females do not count." |

Observations from the live pages:
- The headline number is "Stocking N%" (top bar pill shows words: Compatible, Caution, Problem, Not enough information), and the Habitat check drawer shows N% under the name "Water column" and "Spatial fullness". No screen shows a formula, a constant, the AqAdvisor-fit status or the expert calibration. The only "why" is the per-species share list ("10 Cardinal tetras: 100%") and a one-line reason.
- The "Ideal / amber / red" bands (75 / 100) are not labelled in the bar pictures; the footer says "Ideal." only below 75.
- Sources appear inline only for tank minimums and some care rules (Seriously Fish, Fishkeeping World), and only as a parenthesis inside the warning text. No link, no confidence word. "(est. from gallons)" is the only confidence marker anywhere (it marks an estimate vs a measured dimension).
- With no filter chosen the whole verdict becomes "Not enough information", even though room is fine. The cardinal example therefore opens on a grey pill rather than green.
- Species growth appears as a separate editor line ("fine for now ..."); it is not in the pictures above because the test animals were adult-sized.
- No picture was captured for the fullness tile on the 3D view (it is hidden in the editor layout used) or for the Print report; gaps listed at the end.

## 5. Worked example: 10 cardinal tetras in a 40 gallon breeder

Run on the current engine (`stockingOf`, origin/main e2646cc0), tank 36 x 18 x 16 in = 44.9 gal = 169.9 L (the live page also says 44.9 gal; `src/data/tanks.json` g40b is listed as 40 gal rated, 36 x 18 x 16 in outer), freshwater, 26 C (78.8 F), fresh scene (no filter, no heater), cardinal tetra adult 1.8 in, 1 g each:

| Fish | Space % (headline) | Reading | Filtration % |
|---|---|---|---|
| 10 | 26.8% | Ideal (green) | 1.4% |
| 20 | 44.1% | Ideal | 2.8% |
| 30 | 59.0% | Ideal | 4.2% |
| 40 | 72.6% | Ideal (just under the 75% line) | 5.6% |

Why:
- Binding limit is water (swimming room); floor 0% (cardinals are midwater, no floor use). Contributors: 10 Cardinal tetras 100% of the load.
- Each cardinal counts about 2.7% of the tank's room at 10 fish. Above 10 fish the school curve gives 10 x (n/10)^0.72 fish-equivalents: 20 fish count as 16.5, 40 as 27.1 (so 40 fish read 2.7 times, not 4 times, the 10-fish figure). 26.75 x 4 x (27.1/40) = 72.6.
- The `TINY_EXPERT` factor makes animals under 2 g (cardinals are about 1 g) count 0.8 of what the AqAdvisor fit would give; the constant was re-centred on 37 expert lists (median 74% at their maximum).
- The Reddit claim: another calculator reads 80% for 10 cardinals in a 40 breeder; experienced keepers run "30-40 cardinals plus apistos, corys and a pleco". TankLook reads 27% for 10 and 59-73% for 30-40, so 30-40 cardinals land in the green "ideal" band, consistent with the expert list. (The full "plus apistos, corys and pleco" stocking was not run.)
- The tank-minimum check agrees: "at least 23.6 in x 11.8 in; Recommended 20 gal of water" (smallest passing tank in `research/reasonableness.md`: 24 x 12 x 12 in, 0.85 of wanted).
- What the user sees in the live drawer (pictures 1 and 2): the bar, the 27% or 73%, "Ideal", the species share. What the user does NOT see: that the number is about room only, that filtration (1-6%) is a separate and almost irrelevant limit here, that the curve rewards schools, that cardinals' count was tuned to experts, or how this differs from the 80% in the thread.
- Separate from room: the warning in picture 5 (needs 73-84 F, no heater) is a different category (environment) that the % does not capture.
- Honest caution for the answerer: experts' own maximums in `expert-curve.md` often read well under 100% in our engine because temperament caps bind before room (dwarf gourami 8 in 55 gal reads 31%). The % alone can therefore also under-warn; it is room only, by design.

## 6. Constraints and facts the answer must respect

- Verdicts are advice, never blocks; "warnings that never erase work."
- The headline % is room-only since 2026-10-27 (Nathan: "fullness means room"); filtration, compatibility and group minimums are separate checks with their own levels.
- The 75/100 bands are Nathan's call (75 = ideal for experienced keepers, 100 = limit).
- A check with no data does not fire and is counted in a small "N checks had no data" line.
- Provenance statuses exist per value but never reach the bundle (a size and perf concern for the answerer: a 10k-row table is not free to ship; only the statuses of the values a verdict used would need to).
- The engine's stocking numbers are partly fitted to AqAdvisor (31 answers) and partly to expert lists (37 lists, 73 count points). Publicly saying "fitted to AqAdvisor" and "tuned to experts" are both true; the expert survey tool exists but no real expert answers have been fitted yet (deferred).
- No generative AI anywhere in the verdict path; setup suggestions come from rules (`discover`, `archetypes`, `plantfit`, `gearFit`). Reddit's r/Aquascape is hostile to AI planners.
- Every price needs a sourced default plus an override (project rule R-prices); each fix goes through a logged request. Not relevant to wording but relevant to sequencing.

## 7. Gaps in this evidence

- No capture of the 3D-view fullness tile or the Print/report page, so how verdicts print is not shown.
- No capture of a growth ("fine for now / outgrows") line, a plant light verdict (dim/bright), an owned-gear note popup, or the AqAdvisor Check result (proxy availability varies; not run).
- Competitor user feedback is thin: the AqAdvisor complaints come from three forum threads and search snippets; AquaCompat and Impossible Aquariums have no user feedback at all, so "reasons and sources build trust" is inferred from the Reddit/forum complaints, not measured.
- The cardinal numbers are engine output with a fresh scene; the real planted tank would change filtration % (plants, filter chosen) but not the 27% room figure.
- Calibration provenance for each species' `SPACE_FACTOR` row and the `TINY_EXPERT` value is in code comments and research notes, not in one place a user could cite.

## What a good answer looks like

**1. A warning taxonomy table.** One row per level, with: name and colour (and the non-colour cue), what triggers it (a check that is sourced and physical versus a judgment or estimate), what the user can still do, whether it affects feasibility ("gate") or only ranking, and an example from the pictures above (goldfish in 20 gal; oscar with neon; 2 gourami males; no heater for cardinals; neon "max 30" judgment; dim light for a plant). It should say how today's four levels (Compatible, Caution, Problem, Not enough information), the three bands (75 / 100), the verdict buckets (gates, hard, targets, advisories) and the per-animal warn/note/info map onto it, and whether any level is merged or split (for example: "estimate/judgment" as its own visible tier distinct from "sourced rule").

**2. The fields every verdict carries.** A concrete schema, for example: level; one-line claim; reason in plain words (which animals, which numbers, which limit binds); source (name and link, or "our rule" with the rule's status from provenance: cited, fitted, derived, researched, claimed, assumption); confidence (a small fixed vocabulary and what earns each label, e.g. cited and measured versus "estimated from gallons" versus judgment); the fix (the smallest change, with its effect, "said, never applied" or a button); applies-to (which animal, which item); what it does not model (AquaCompat's "does not model filters, plants or feeding"). Say which fields are shown by default for a beginner and which sit behind an "audit" disclosure for an expert, and what happens when a field is unknown.

**3. A decision on the headline %.** Does a single number survive? If yes, in what form: for example a word band with a number demoted to the audit view, a range, a bar with labelled zones (ideal under 75, tread carefully 75-100, over 100), a percentage always accompanied by the binding limit and top contributors, or a per-limit breakdown (room, filter, floor, temperament) with no overall percent. Address both failure modes in the evidence: a number that looks arbitrary ("hocus-pocus": 10 neons in 10 gal = 80%) and a number that looks too conservative (10 cardinals = 80% in a 40 breeder), and say how the cardinal case should read (27% room, ideal; 40 cardinals still ideal) and what the screen says about why this differs from other calculators. Say what to do about the temperament cap that room-only misses.

**4. Mockup descriptions per screen** (text, pixel-level enough to build): (a) the Habitat check drawer for the cardinal case; (b) the same drawer for the overstock case in pictures 3-4; (c) the Animals panel row (heater warning, count notes, growth line); (d) a plant row with a light verdict and a CO2 requirement; (e) a gear card with "fits this tank" and an owned-gear note; (f) the printed report; (g) the "How we calculate" page or overlay (what is cited, what is fitted to which dataset, what is our assumption, counts per status, "rules and data, not generative AI", where we differ from AqAdvisor and why, R152). For each, state what is visible by default, what expands, and where the source and confidence appear.

**5. How to show "expert-calibrated rules and data, not generative AI".** Specific wording and placement (not a slogan): where it appears (footer of every verdict? the methodology page? an "audit" panel?), what proof backs it (the published lists used, the 37 lists / 73 points, the 31 AqAdvisor comparisons, the provenance counts, the species table, the code being deterministic), and how to word the part that is a fit or an assumption honestly given 1,429 "assumption" values and 483 unsourced ones.

**6. A ranked change list**, by trust gained per unit of effort, each with a rough effort (hours/days, which files: `stocking.ts` reasons, `stockSummary.ts`, `verdict.ts` Issue fields, `provenance.ts` surfacing, UI drawer), the evidence it answers (cite the competitor line or picture), what it needs from data (e.g. plumbing provenance status to the bundle for only the values a verdict used), and what to defer. Include R152 (per-species breakdown, difference from AqAdvisor), R153 (plants' visible effect, given that today it only moves filtration), R156 (juvenile versus adult size), R161 (thresholds), the methodology page, and the removal or relabelling of unsourced judgment warnings (the neon "max 30" case).
