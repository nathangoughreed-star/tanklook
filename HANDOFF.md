# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Start here (trimmed 2026-10-16)
This file holds only what a new chat needs: the lane rules, the coordinator protocol, the CURRENT lanes, and the open
items. Every finished lane / feature section was moved verbatim to **HANDOFF-archive.md** (index below); search it by
heading when you need a subsystem's history. Add your own dated section under "Lane sections" here, and when your lane
is done the coordinator moves it to the archive.

**Lane rules:** Before EVERY push run `npm run build` (tsc over src AND test, then vite build), not just tsc on src or the tests: the deploy job runs it, and on 2026-10-21 a test-file type error kept the live site at build 1047 for six pushes. Any change that moves engine numbers also runs `GEN_RETABLE=1 npx vitest run test/calibtables.test.ts` after its last rebase and commits the rewritten `research/calib/tables/*.json` (S216's lock on the frozen expert rounds, 2026-10-23); otherwise that test fails on main. Since survey v4 (2026-10-26) also run `GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts`, regenerate the fit with the exact file order in test/calibv4.test.ts (`node scripts/calib-fit.mjs research/calib/round-1.json research/calib/round-2.json research/calib/round-3a.json research/calib/round-3.json research/calib/answers/round-1-ngr.json research/calib/answers/round-2-ngr-ai.json research/calib/answers/round-3-chatgpt.json research/calib/answers/round-3-chatgpt-high.json`) and re-run `scripts/calib-review.mjs` for rounds 1-3a. Never hand-merge these generated files: take main's, then regenerate. Rules: touch another lane's file only for a one-line hook, and say so in your section. No scene version bump without
asking Nathan. Shipping: in the worktree `git fetch` + `git merge origin/main`, tsc + tests + browser check, then
`git push origin HEAD:main` and `git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main`. HANDOFF.md
conflicts on merge: keep both sections. **In the shared folder itself** (C:/Users/nreed/Glass Box, any chat not in a
worktree) commit and push ONLY with `scripts/ship.sh -m "msg" <your files>` (bash): it commits just those files and
pushes from a throwaway worktree without touching other chats' edits. A hook (`scripts/git_guard.py`) denies stash,
--autostash, reset --hard, checkout --, restore, clean -f, commit -a, add -A / add ., push and pull there (2026-10-19). Each lane adds its own dated section under "Lane sections (current)" below.
**Deploy health:** live build = footer of https://tanklook.com/ ; one-line check: `curl -s https://tanklook.com/assets/$(curl -s https://tanklook.com/ | grep -o 'main-[^"]*\.js' | head -1) | grep -oE 'n:.[0-9]+.,sha' | head -1; git rev-list --count origin/main` (live n vs main; equal once the last deploy lands, ~5 min after a push); Actions state = `curl -s https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs?per_page=5` (status/conclusion per head_sha; `/deployments` for what shipped). A red deploy usually means one slow/failing test: reproduce with `npx vitest run` in a clean worktree.

**Chat IDs (Nathan 2026-10-20):** every chat has a unique ID and a title of the form `ID: Short Title` (`P2b: Tank Filtration & Honest Span`; coordinators are just `Coordinator N`). The COORDINATOR assigns the ID and sets the title when it starts a chat; chats never rename themselves and never reuse an ID. Lanes keep their letter code (P1-P6b, SE, SE2, LO, GD, DM, TG, UF = user flow design, SB source backfill, ST source traceability, ER equipment research, LC light catalogue, MC menu close, SF sponge filter, TV tank sizes, HM heater menu, HL hood lighting, BT bare tank, SC substrate contour, SO stand and cost). Side and older chats are `S001`-`S164` (numbered by age on 2026-10-20); the next free number is S165, the next lane codes are chosen by the coordinator and checked against this list. Chats started by hand get an ID at the next coordinator `check`.

**Coordinator protocol (Nathan 2026-10-13):** the coordinator chat is session `local_bbbd7610-737d-4dad-b5cc-25aacc03fb67`
("Coordinator 11", took over 2026-10-26 from `local_901f3080` (Coordinator 10)). Every lane messages it (send_message to that id) when its work is pushed to main, when it is done,
and at any milestone that unblocks another lane (A: plants pushed; D: shots/audit/AUDIT.md written). The message says
what landed (commit), what is still open, and which files are now free. The coordinator then sends Nathan the prompts
for any chats that can start now. If a prompt is still waiting when another lane opens, it sends all waiting prompts again
in one new message. Every new lane prompt includes this protocol. When a lane is done it stops its own preview servers (preview_stop): the app allows only five
per folder, and finished lanes holding them blocked lane G on 2026-10-14. Questions for Nathan stay in the lane's own chat.
New since 2026-10-16: lane prompts are one line ("You are lane X. Read prompts/lane-X.md and follow it."); a lane
whose chat gets long hands off to a fresh chat at a work-unit boundary (write its state into its HANDOFF section
first); dev servers are swept when a lane reports done and on "check" (no hourly sweep).

**Current lanes** (coordinator "Coordinator 11", `local_bbbd7610`):
| Lane | Worktree / branch | Port | Owns | State |
|---|---|---|---|---|
| Queued (Nathan 2026-10-16, roadmap re-rank) | - | - | after T1-T4: starter styles batch 2 DONE 2026-10-16 (lane SS2, see archive; its gaps: no water dish, no succulents, Malawi has only yellowlab / cockatoo); multi-select / duplicate (lane MS) + scatter brush (lane SB) DONE 2026-10-16, see archive; PNG import; LAST: build.ts / panels.ts splits; clownfish host in the bubble-tip anemone DONE 2026-10-16 (see its section) | queued |
| W Android app | `../Glass-Box-android` / `android` | 5543 (`android`, `--host` for phone tests) | landscape @media in `style.css`, view-map `narrow` in `ui/panels.ts`, new manifest / icons / SW in `public/`, their tags in `index.html`, new `android/` | Steps 1-3 DONE (layout, PWA, TWA APK works on S24+); PAUSED 2026-10-14 by Nathan before step 4 (Play material) and 5 (low-end check); files free, preview servers stopped |

**Next batch (Nathan 2026-10-19; coordinator to re-evaluate and write prompts once TG and SE have shipped and the shared checkout is clean):**
wizard follow-up (salt, the named animal, $ on the upgrade steps, tech preset from goal + budget); beginner setups + gate mode (plan lane E);
style tiles (plan lane F); wire stockingOf (stockingMemo / stockingLine / stockingDetail) into the demand panel and the wizard;
then the long list: plant propagation step 2, cling / perch leftovers (tree frogs share the gecko limb-spot miss), re-record the ~70 changed
models on /review.html (and its drawImage error), TG leftovers (heater product price in the cost, filter catalogue like the heater one, bundles matched to exact products, HOB body into the wall at the default 50 mm gap), TM/SE follow-ups in their archived sections, snake tongue, PNG import, reusable saved groups; LAST: build.ts / panels.ts splits with nothing else running.

Gotcha: the dev server reads the build number at start-up; restart it after merging main and before pressing Record.

## Lane sections (current)
## S238: Nano schoolers, crayfish, Thai micro crab, aquatic isopod (2026-10-26, branch `claude/s238-526a99`, worktree `.claude/worktrees/s238-526a99`; Coordinator 10; NOT pushed)
- Nathan 2026-10-26: "more small schooling fish for nano tanks ... crayfish and thai micro crabs. Aquatic isopods too." 10 new species, all freshwater: nano schools `greenneon` (Paracheirodon simulans), `merah` (Boraras merah), `exclamation` (B. urophthalmoides), `dwarfrasbora` (B. maculatus); crayfish `cpo` (Cambarellus patzcuarensis), `cajundwarf` (C. shufeldtii), `rswcrayfish` (Procambarus clarkii), `redclaw` (Cherax quadricarinatus); `thaicrab` (Limnopilos naiyanetri); `asellus` (Asellus aquaticus, the one isopod the hobby sells; Pond Informer says dealers sell it, Ward's listing is discontinued).
- Data (copy of the sterbai / pencilfish pattern): species.json, care.ts, groups.ts + research/groups-sources.md, waterchem.ts (pH / GH / group), climatedata.ts (water temperature), tankmin.json (via research/sourcing/tank-minimum/summary.json and `node scripts/tank-min-data.mjs`: fish a 45 x 30 cm footprint from Seriously Fish, inverts a gallon figure only), demand-items.json (prices: only the Cajun dwarf, red swamp and Thai crab have a listing price; the rest are marked judgement), lw-sources.json + bodymass.json + bodyvolume.json (fish masses reuse the neon / chili genus rows, inverts are estimates), careNeeds.ts (lids), scene/stocking.ts (met class). Every number has a rule in provenance.ts (care / minL / temper / group / prey / tl) and the five new pages are in sources.json; test/sources.test.ts green with the baseline untouched.
- Honest compatibility (test/nanocrays.test.ts): the Boraras and green neon want soft acidic water (pH 4-6.5, GH 1-5/8), the crayfish and micro crab want hard (pH 6.5-8, GH 6-20), so the engine blocks them together on chemistry. Only the exclamation point rasbora (pH 6-7, GH 1-10) overlaps a dwarf crayfish or the Thai crab. Dwarf crayfish prey on invertebrates (shrimp, snails, isopods) up to 40 mm; red swamp (60 mm) and redclaw (100 mm) take any animal in range and are solo. Isopods are prey for crayfish and most fish.
- Art: nano fish are new plans in fishgen.ts (from the chili / neon plans; no reference photos opened, colours from Seriously Fish's descriptions); crayfish extend the shrimp builder (shrimps.ts `claw`, shrimp3d.ts clawGeometry); the crab and isopod are Herp3D entries on the hermit's limb machinery (herps.ts). All recorded as v1 on the review page (`node scripts/export-sheets.mjs --record --only=<ids>`, new `--only=` list so a lane records only its own looks; review/main.ts takes a comma list). No gallery stills baked (they draw live until `scripts/bake-gallery.mjs` runs).
- One-line hooks in other lanes' files: `searchSpecies` ranks a whole-id match first (data/species.ts), `ONLY` in review/main.ts is a comma list, export-sheets `--only=`.
- Open: AqAdvisor ids for the four fish and the crayfish (scripts/aqadvisor-ids.py not run: space factor falls back to the class factor); gallery stills; a nano starter rule (lane SR) can use `exclamation`, `merah`, `dwarfrasbora`, `greenneon` (all school, need 8+, 41 L / 45 x 30 cm footprint).
- S238b (Nathan 2026-10-26, "rec"): `merah`, `exclamation` and `dwarfrasbora` take the chili rasbora's gallon-derived minimum (8 gal cube) as the red line, replacing the 45 x 30 cm hard minimum, which stays as their green (Recommended) line; green neon stays at 45 x 30 cm (about 15 gal). Rule in provenance.ts TANKMIN (precedent, assumption). Regenerated with `node scripts/tank-min-data.mjs`. scene/items.ts STYLES untouched: SR adds them to the starter lists.
- Pictures 2026-10-26 sent to Nathan: a 20 gal long with the new animals and the model sheets.
## SR: Stocking Rescale (2026-10-26, branch `claude/sr-67d7bd`, worktree `.claude/worktrees/sr-67d7bd`; Coordinator 10; NOT pushed)
- Nathan 2026-10-26: SR runs WITHOUT step 2 (no re-centre): SPACE_PER_L and every global water / floor scale stay with the calibration lane (S216b / S220). Steps 1, 3, 4, 5, 6 done or asked as below; step 7 only if Nathan wants it.
- **Step 1 DONE:** the 37 lists in `research/expert-stockings.json` carry `cap` (`room` 28 / `temper` 9) and `capReason`; six borderline ones (bristlenose min, goldfish minimum rule x2, demasoni, flowerhorn, BRS reef) also carry `capBorderline` and wait for Nathan's call (picture sent). Temper: pea puffers, apistogramma pair, angel pair and school, tiger barbs, chromis x2, demasoni (borderline).
- **Step 4 DONE (commit below):** starters no longer budget by summed litres (which ignored the school curve, so Full read a 52 % median). `starterAnimals` now adds a group while the stocking engine's own reading stays at or under the stop's target: `FULL_READING` = IDEAL_MAX - 1 = 74 at Full, the other stops the same shares (ANIMAL_FILL / 0.9). Past Full still climbs (about 2x at 6). Table in `research/sr-starter-full.md`: Full median 51.6 -> 67.5 %, p90 77.8 -> 74.5, 0 rows moved in tankFor / builds / sumps / the example scenes. Huge tanks (180+ gal) and the c-tanks stay low (pool, kinds and group caps bind, not the budget); five paludarium land-animal starters still read over 100 (as before).
- Tests re-blessed: density (bioload litres bound -> engine reading <= 100), starterfull (adds a median 60-75 check), sources (FULL_READING in the starter FORMULAS entry). Nothing else moved; GEN_RETABLE / GEN_RETABLE_V4 regenerate to the same content (no engine reading changed).
- `scripts/space-factors.mjs` already keeps everything after SPACE_FACTOR (SPACE_NUDGE, FLOOR_FACTOR, GROUP_GROW) since XC 2026-10-23; a run only changes the header date. Verified by running it, nothing dropped.
- **Step 3 + 7 DONE (Nathan 2026-10-26, via Coordinator 10):** no number change. Filtration advice is his words, recorded verbatim: "75% is ideal and can be attenuated with normal water changes and the fish will have no toxin-induced stress from under-filtering. Yellow is doable with heavier than normal water changes/schedule. 100% should get a larger filter or reduce load." The reason line in `stockingOf` (and `spaceReason` in ui/fullnessTile.ts) now reads "NN% · limited by floor / swimming room / filtration." plus the band's advice (green: normal water changes / Ideal; amber: heavier water changes; red filtration: larger filter or less load). "Room for about N% more load" is gone. Filter-upgrade cap: still waiting on Nathan. 8 gal starters (Full 76 -> 44: a school's minimum group no longer fits under 74) are with Nathan too.
- **Filter cap + nano starter rule DONE (Nathan 2026-10-26 via Coordinator 10):** filter cap: "sure" (a better filter's extra capacity counts only up to +50 % over the tank's baseline). `FILTER_BOOST_MAX` 0.5 in scene/nitrogen.ts; baseline = the generic model of the same kind fitted to the tank's gallons (`filterFor` without model / product override); several filters share the one +50 %; a sump is uncapped (its media is sized from the water). Moved: 6 builds rows only (filtration % of a 20 gal high with an oversized filter rises, e.g. neon x25 7.6 -> 9.9), tankFor / steps / sumps / examples 0; calibration tables regenerate identical. 8 gal starters, option (a): "In nano tanks the starter picks a smaller schooling species whose minimum group fits under the Full budget instead of falling back to snails." `starterAnimals` drops any species whose smallest group cannot fit under the Full target (no names in the rule, so S238's new nano schoolers join automatically): 161 starter rows moved, all in nano to 40 gal tanks. Still no fitting school with today's species (all seeds): 2.5 gal almost every style; 3 gal cube: stones driftwood reef jungle blackwater malawi stream softreef spsreef clownnano; 5 / 5.5 / 6 gal: stones reef jungle blackwater malawi softreef spsreef clownnano; 8 gal cube: stones reef malawi softreef spsreef clownnano; 10 gal: malawi spsreef clownnano; 6 and 8 gal c-tanks: malawi. (Reef / malawi / stones have no freshwater nano school by design.)
- **SR nano schoolers in the starter lists (Nathan "rec" 2026-10-26, after S238b):** exclamation, merah and dwarfrasbora added to the STYLES animal lists of driftwood, planted, nature, jungle, forest, blackwater, stream (soft-water styles; iwagumi / dutch / stones / malawi left alone). Pool order is seeded, so 615 of 1620 starter rows moved (Full median 68.4 -> 69.6 %, p90 74.7 -> 74.6); tankFor / builds / sumps / examples 0. Still no fitting school (all seeds): 2.5 gal nearly every style; 3 gal cube: stones driftwood reef jungle blackwater malawi stream softreef spsreef clownnano; 5 to 8 gal and c-tanks: stones reef malawi softreef spsreef clownnano (+ malawi only at c6 / c8); 10 gal: malawi spsreef clownnano. Left: 2.5 and 3 gal cubes (the red line is 8 gal cube) and the salt / hard-water styles by design.
- **Step 3 (asked):** ammoniaPercent 100 = the TAN reaching the bacteria equals 70 % of what the filter can nitrify (HEADROOM 0.7), NOT the point where the filter only just keeps up (that reads 143 %). 75 % = 52 % of capacity. So the scale already matches 75 ideal / 100 limit. Filter-upgrade cap: question to Nathan.
- **Step 6 (asked):** hand-set targets listed in the report to Coordinator 10 / Nathan.

## LT: Land animals in path 1, "An animal I want" (2026-10-26, main, Nathan's request from a ball python screenshot)
- **Bug:** a land animal (ball python, geckos, anoles, dart / tree frog, regal jumper, tarantula) showed "This animal lives on land: choose a terrarium in the editor" and Continue stayed grey. The tank-fit engine only counted water animals and only offered rectangular aquariums; the builds and the gear model (tech.ts) had nothing for a dry tank.
- **Tank step (scene/tankfit.ts):** `allLand(animals)` (every pick habitat 'land') -> candidates are the 14 catalogue terrariums, judged by `dryFit`: the sourced red / green lines (tankMin.ts `speciesMinimum`, floor + height) and herpstock.ts floor per animal + `hMin` (herpCheck's rules and 5 % / 1 in slack). New fail 'height'. `spacePct` = floor needed at the sources' minimum / floor; no filtration. Smallest that holds: ball python 48 x 24 x 24 in, leopard gecko 36 x 18 x 18, crested gecko 18 x 18 x 24, green anole 24 x 24 x 48, dart frog 24 x 12 x 12, tarantula 24 x 18 x 24. `tankLabel` for a terrarium: "Terrarium 48 x 24 in, 24 in tall". The stocking screen shows "Terrarium sizes", "Floor" bars, water off, mesh top, hinged doors.
- **Mixed land + water picks: unchanged** (water path; the land animals are not counted against the water). Open: should that become a paludarium? Nathan's call.
- **Gear (scene/drygear.ts, new):** `TankSetup.dryGear` (optional, no version bump; absent = the cheapest build inferred from the animals). Needs: heat from `DRY_NEEDS` / the climate's warm spot (lamp) or comfortable band over room (mat); UVB 't5' (anoles, required) or 'low' shade dweller (python, leopard gecko, crested gecko, White's tree frog: recommended); misting when humidity 60 % or more. Builds: cheapest = on/off thermostat + hand mister; balanced = dimming thermostat on a lamp; least work = automatic mister + light timer (folded into another build when it saves no minutes, as on water). Priced by the demand engine (dry:* rows in demand-items.json from research/terrarium-gear.json/.md, Sonnet agent 2026-10-26; bulbs / UVB tubes' replacements as upkeep via `lifeMonths`); the terrarium's own price = median of its catalogue listings (`terrariumPrice`), not the aquarium $/gal. Work: hand misting `terrariumMistMin` (old), auto mister `terrariumAutoMistMin`, dry `terrariumDryMin` (both est, no cited figure). Plan sheet (plan.ts) judges Floor / Height and says what each dry row is for.
- **Est rows:** dimming thermostat $150 (Herpstat 1; cheaper dimmers not priced), timer, all three minute figures. White's tree frog keeps a basking lamp (climate.ts warm 28-32 C) though the agent's sources said room temperature; dart frog no UVB (dartfrog.pet advises against).
- **Open / follow-ups:** (1) DONE S240 2026-10-26: one model, the Tech rows (the editor's Tech menu edits, the totals price and 3D draws the same gear; see S240). (2) DONE S240 2026-10-26 (Nathan's yes via Coordinator 11): leopard gecko, green / brown anole food likewise price x rate in `foodMo` (PetSmart: gecko every other day, anole 2-5 insects a day; Josh's Frogs crickets 250 for $9.99, medium dubia 100 for $19.99): gecko $18.3 -> $9.5, anoles $15.3 / $15.5 -> $7.9 a month; crested gecko, frogs, spiders left. Also DONE S239 2026-10-26: the ball python's food read $69 a month (reptile band 14 x length^0.8); `foodMo.ballpython` in demand-defaults.json now = large frozen rat ($24.95 / 5, RodentPro) every 2-3 weeks (Zen Habitats) = $3.6 / 8.7 / 10.8 a month, so the example upkeep is $37 (was $88 incl. gear); other land animals read near their class band (geckos $17-18, anoles $15, frogs $2.5-6, spiders $2-4), unchanged, no insect price page opened. [was: the ball python's own upkeep reads $69 a month (the animal model scales reptile food by length^0.8; frozen rats are more like $15-25): an animal-cost fix, not this lane's. (3) Stand: a terrarium is still costed with a stand like an aquarium ($320 for 4 ft).
- Tests: test/landpath.test.ts (new, 12); tankfit.test.ts's two "land animal = no tank" expectations updated.

## S240: one gear model for a dry tank, rows + 3D + totals (2026-10-26, branch `claude/vigilant-bouman-c9df78`; Coordinator 11; Nathan: "i take your recs")
- **Why the two disagreed:** a dry tank had TWO gear models. LT's `TankSetup.dryGear` (heat / thermostat / UVB / gauge / mist / timer, priced by the engine's `dryRows`, `dry:*` rows) and the Lid-lamps Tech rows (`heatlamp` / `uvb` / `mist`, priced by `techDemand`, drawn). Both were summed, so every basking tank paid its dome and UVB twice (python `dry:dome` + `heatlamp` in the totals) and the Tech menu could only edit the second. Path 1's build set `dryGear` and no `tech`, so its menu showed the inferred rows, not the build's.
- **Now one model: the Tech rows.** `dryGear` is gone from `TankSetup` (never saved before today's LT). Dry rows in tech.json: Basking heat none / dome / **mat**, **Thermostat** none / on-off / dimming, UVB none / **low (12 in shade dweller)** / T5, **Thermometer and hygrometer**, Misting none / **by hand** / system / fogger, **Timer**. Every part is priced from the `dry:*` demand-items rows (bulb and tube replacements as upkeep through `monthly {key, months}`), so the menu, the totals and the build cards read one number. `drygear.ts`: `dryRowsFor(needs, build)` writes the rows a build picks (`drySetup` sets `S.tech`); `inferTech` for a dry tank is `dryInferred(species)` = the cheapest build (same `DRY_NEEDS` table, so BASK_C is gone: tree frogs get their lamp again); `dryGearOf(S)` is a read-only view of the rows (plan sheet, mist work row). The engine's dry:* loop is deleted; `techDemand` is the only dry pricing. The mist work row is key `mistwork` (hand / system, fogger adds its own 10 min). Plan sheet rows are keyed by the row ids (`heatlamp`, `thermostat`, ...).
- **Drawn (render/gear3d.ts):** dome, UVB (the tube is the priced kit: 12 in low, 24 in T5, shortened on a short tank), mister, fogger as before, on the lid. New: heat mat under the glass (cord out the back), thermostat box (a bigger dimming one with a knob) and timer on the floor behind, hand sprayer bottle on the floor behind, gauge on the inside of the back glass. `GearDef.draw` marks a part with a body but no power. The small boxes are fixed slots (not dragged).
- **Top pieces avoid each other** (`clearOnTop`): the owner's spots first, then each default is moved to the nearest free spot (8 mm air); a long tube placed across a small tank's middle can leave no room, then they overlap. The LED-through-the-dome bug was already fixed by S231 (scene/topgear.ts raises the light). The python example's thumbnail is redrawn with its mesh top (src/examples/ss2-python.jpg).
- **Moved numbers (research/dry-gear/moved-numbers-s240.txt, same --now 2026-10-26 vs main 6a1dfda):** tankFor / steps / starters / sumps 0 moved. builds 30 rows: ball python, leopard gecko, green / brown anole (6 counts each): every build drops $131-132 setup (the double-counted dome and UVB; ball python 48 x 24 x 24 cheapest $1128 -> $996, leopard gecko 36 x 18 x 18 $770 -> $638). Examples: arid $1523 -> $1392, python $1750 -> $1619 (+ $10.81 / month gone); terrarium (tree frogs) upkeep $33.20 -> $32.73 and risk 4.294 -> 4.373 (the dome is back, so S231 raises the light again); rainforest unchanged. Re-blessed: gearFilters and tech.test LOCKs, gearDrag / gear3d / tech.test dry-row expectations.
- **Stand, S240b (2026-10-26, Nathan "rec"):** a terrarium has its own stand row, `gear:terrarium-stand-48x24` in demand-items.json (lo $189.51 / mode $199.99 / hi $299.99: GDLF 48 x 24 stand $199.99 list / $189.99 sale, Walmart 48 x 24 tabletop from $189.51, New Age Pet Versa 48 in $299.99 sale; only the 48 x 24 is sourced), scaled by footprint ^ 0.7 within 0.4-2.2 (`terrariumStandK`, our estimate). Engine: a dry tank's stand line is "Stand (terrarium)"; the aquarium gallon rule is unchanged for wet tanks. "Own furniture, $0" = the existing stand choice off (`need: 'none'`; the button reads "I'll use my own furniture" on a dry tank). Moved numbers (research/dry-gear/moved-numbers-s240b.txt, main 0a2361b): dry examples terrarium +$10.36, rainforest -$37.27, arid -$27.85, python -$27.85 setup; land builds drop $10-97 (ball python 48 x 24 x 24 cheapest $996 -> $899, leopard gecko 36 x 18 x 18 $638 -> $628). Wet tanks cannot move.
- Tests: test/drygear.test.ts (new, 5): one model (no dry:* lines, the rows' setup = the totals'), path-1 builds carry the rows and draw them, a row change moves the totals by that option's price and the drawn pieces follow, top pieces keep clear.

## S233: Product gate, real product vs custom size (2026-10-26, branch `s233`, worktree `.claude/worktrees/pgate`, port 5971; Coordinator 10)
- **Ask (Nathan 2026-10-26):** "If you pick a style of tank, then everything that comes along with that must remain unless you dleiberately change it after a warning message ... We should also clearly distinguish if the tank being worked on is a real commercially available tank or a custom size."
- **One mechanism:** scene/integrated.ts (the all-in-one hold) is generalised, no second gate. A library pick records `TankSetup.product` = { model, key (data/tanks.ts variantKey: brand|line|outer inches|retailer, not an index, so S224's merge cannot shift it), sig }. `locksOf` gains `rim` (a product only sold rimless); holdIntegrated now also holds the product (rim kept off; a size change by a path that did not ask still drops it, as tankSig did for kits).
- **Deliberate override:** `breakNote(S, what)` is the confirm text ("The Imagitarium (Petco) Open-Glass Rimless 10 gal is only sold rimless. Adding a rim makes this a custom tank, not that product. Continue?"), `mayChange` asks it, `releaseProduct` drops product + kit on yes (gear stays, now editable); no changes nothing. Held controls are disabled with the lock note and a "Change it anyway…" button (any `[data-unhold]`, one listener in panels.ts); size and shape inputs ask on edit. One undo step restores the product.
- **Ready-made vs custom (Nathan 2026-10-26, via Coordinator 10: "custom tanks are custom and anything can be changed. others not so much. If I get a standard 55g, I cant just take the rim off"):** every ready-made tank (a maker's product, a standard catalogue size, a size named after one product) holds its rim as sold, either way (rimless stays rimless, framed stays framed) and its size and shape; an all-in-one (variant `kit`, kit record without `kind`) also holds its light / lid / filter (/ heater). Starter / LED kit (new `KitModel.kind: 'starter'`, for S224's bundle records): gear applied once, gear not held. What people add to a bare tank (lid, light, filter, heater) stays free: asked Nathan before locking any of it. A size named after a single product (n_flex_9gal) picks that product (`soleProduct`); one with several (n_imagitarium_shallow_6_8) is ready-made under its own name. Only a custom tank changes freely.
- **Label:** tank panel `#prodLine`, always shown: "Ready-made: <brand> <line> (<retailer>)", "Ready-made: standard 55 gal tank (any maker)", or "Custom tank: any size, anything can be changed". Saved and loaded (validate.ts parseProduct; a product the library lost loads as custom); Compare lists it (diff.ts, matching copies size + product + kit + rim).
- **Tests:** test/productgate.test.ts (10). Build passes; full suite 1382 pass (1 skipped). Moved numbers vs main b8c3033 (same --now 2026-10-26, after the rebase and the ready-made rule): no numbers move (0 of 516 tankFor / steps / builds, 0 of 1620 starters, 0 of 45 sumps, 0 of 11 examples).
- **S233b, what each product comes with (2026-10-26, branch `s233b`; Nathan via Coordinator 10: "yes, as long as its truly a bare tank. Often times tanks come with at least a glass top, like the rimless imagitraium ones for example. Exactly what it comes with is important to figure out for every commercial tank"):** `TankVariant.includes` = { lid: glass | hood | mesh | none, light, filter, heater, stand } (field approved by Coordinator 10, same shape sent to S224b). A key left out = not recorded, false / 'none' = sold without. A `kit` variant reads its kits.json record (`kitIncludes`) unless it sets its own. Held like the rim: the lid it ships with (no kit) and everything a kit supplies, now including starter / LED kits (`KitModel.kind` is descriptive only). Free: what it is sold without, and what is not recorded (flagged under the label by `includesNote`, never guessed). Gear it ships with but no kit models (includes.light true, no `kit`) is flagged as not modelled and stays free: such bundles need a kits.json record. The data itself is S224b's.
## S224: Tank library, Petco's rimless Imagitarium line (2026-10-26, branch `s223`, worktree `.claude/worktrees/s223`; Coordinator 9; S223 was the audit)
- Added as variants (rimless, Imagitarium (Petco), retailer Petco, checked 2026-10-26; price_usd = the 50 % sale price, regular_usd = list): Open-Glass Rimless 2.5 / 5.5 / 10 gal (under g2_5, g5_5, g10), Open-Glass Frameless Cube 3 / 6 gal (g3c, g6c), Frameless Cube 14 / 35 and Frameless Shallow 6.8 / 13.3 / 28 (new bases below). Kits (price_kind 'kit', plain variants: no `kit` record, they run on ordinary gear): Frameless Freshwater Kit 6.8 gal (under g6c), Shallow Glass Shrimp & Aquatic Plants 6.8 (shallow 6.8), Glass Shrimp & Aquatic Plants 5 gal (g5; the page does not say frameless, the photo shows no rim). The 38 gal shallow (SKU 3966880) is off Petco's site: not added.
- **Picks or preloads (Nathan 2026-10-26: preloads only):** a size with no generic entry gets a base named for the product, so the engine never picks it (its candidates are names matching /^[\d.]+ (gal|ft)/): `n_imagitarium_cube_14`, `n_imagitarium_cube_35`, `n_imagitarium_shallow_6_8`, `n_imagitarium_shallow_13_3`, `n_imagitarium_shallow_28` ('Imagitarium Frameless Cube 14', ...). Glass on the new bases follows the catalogue's height rule (5 / 6 / 8 mm); Petco lists none except the 5.5 (6 mm, Q&A).
- **Estimated sizes (confidence low):** Petco gives no depth for the Frameless Shallow line: 6.8 -> 10 in (the shrimp kit's box: 20 x 10 x 8.62), 13.3 -> 11.7 in, 28 -> 15 in (from the rated gallons; Petco customer service "roughly 32 x 15"); the 13.3 reads 7 % under its rating, inside the 8 % check. The 3 gal cube's listed 12.83 in height is the 10 gal's pasted in: entered as an 8.78 in cube. The frameless 6.8 kit lists only 13.75 W x 14 H (depth back-solved); the 5 gal shrimp kit's listed size includes its light and filter (glass estimated by taking off what the 6.8 version adds).
- **g6c resized (Nathan 2026-10-26, applying his 10-20 rule that an estimated size takes the first checked listing):** the 6 gal cube was an estimate of 12.5 x 12.5 x 10 in; it is now Petco's 11.49 in cube. Moves vs main 7bc8536: tankFor amano x25 6 gal cube -> 8 gal cube (it sat at 100.4 % space); the 54 starters drawn in a 6 gal cube (14 change animals, 40 only their %); 2 default sumps.
- **Prices move costs, not picks:** tankfit's tank price (median of the non-kit variant prices) now exists for g3c ($30) and g6c ($40), so 48 step-up cost deltas move by $5-16; the rimless 5.5 at $25 is a live sale, so 26 builds in a 5 / 5.5 gal show "deal Petco $25" and cost $5-6 less. tankFor goes by litres, so no pick moves from a price.
- **Gate:** `scripts/moved-numbers.mjs` (new): dump on main and on the branch with the same `--now`, then `--diff`. Full table: research/tanks/moved-numbers-s224.txt.
- **Next (Nathan 2026-10-26: "a model for every currently available tank, kit, or bundle. Not just rimless"):** research fan-out by retailer, piloted on PetSmart (Sonnet agent, rows in the side-session notes, retailer-petsmart.json); cost per retailer and the plan go to Nathan before the rest launch.
- **S224b: the every-retailer merge landed (2026-10-26, lane S224b, branch `claude/s224b-56d9f9`; Coordinator 10).** tanks.json 59 -> 142 models, 913 variants (618 retailer products: 532 variants added, 83 product-named preload bases `n_<brand>_<slug>`, 8 price updates, 1 estimate resized (g3c), 9 discontinued flags). Sources: research/tanks/s224/ (7 retailers, ~1.87 M tokens; merge.cjs, merge-report.json). Left out: gallons check 55, no dims 38, curved / round 119 (needs bow / hex / cylinder bases), other 3; Chewy partial (Kasada wall, retry slowly). Prices keep price_usd / regular_usd / checked (saleLive 30-day rule). Source ratchet: one TANKS rule in provenance.ts for the six low-confidence preload bases (outer.{L,D,H}, `est`). Rimless flags come from the pages (researcher `rimless`); every merged product is ready-made, so S233's gate locks the flags as recorded. Moved numbers vs b8c3033 (research/tanks/s224/moved-numbers.txt): tankFor 1/516 (nerite x12 g3c space 97.7 -> 92.4), steps 386/516, builds 166/516, starters 51/1620, sumps 86/128 (83 new rows), examples 0/11. Watch: g50b had no price on main; its only non-kit price is now LANDEN rimless $610, so g50 step-ups read +$689 (was +$162). **Next lanes:** (1) kits: starter / LED bundles get `KitModel.kind 'starter'` records and true all-in-ones locked `kit` records (merged kit rows are plain variants, price_kind 'kit'); (2) curved / round bases; (3) price sweep over the new rows (S232 script).

## S232: Scheduled price sweep (2026-10-26, branch `claude/s232-ea38f8`; Coordinator 10)
- Nathan: "a sweep every now and then for sales and to see if prices were still accurate." Fields unchanged (price_usd / regular_usd / sale_ends / checked, saleLive 30-day rule). `scripts/price-sweep.mjs` (fetch / apply [--commit] / queue) walks tanks.json, so new variants with a url (S224 / S224b merge) are swept with no list to edit; recipe in `research/price-sweep/README.md`; test `test/pricesweep.test.ts`.
- Plain fetch (no model tokens, ~30 s) read 40 of 138 sweepable variants on 2026-10-26 (Shopify .js / JSON-LD: BRS, customaquariums, zenhabitats, dubia, frags2fishes, thatpetplace, natureaquariums, piscespets...), found 14 dead links (fishtanksdirect, one BRS, reptifiles). Petco 29, PetSmart 34, Chewy 1 and ~20 pages with no price in their source need Claude in Chrome. Rules: only existing prices are updated; far-off prices (x0.55..1.6), unpriced entries, dead links and unreadable pages are listed in report.md, not applied. One commit per sweep, nothing pushes.
- Update 2026-10-26 (Nathan: "yes, weekly"): PetSmart reads by plain fetch (60 s timeout), so the Chrome queue is Petco 29 + ~20 no-price pages; measured about 0.5k tokens a page, estimate 100-150k weighted tokens a sweep on Sonnet. A stored sale stays when the reader cannot see a list price. `includes_seen` in browser-results.json is compared with TankVariant.includes (lid / light / filter / heater / stand) as a report-only section, once S224b's catalogue carries it.
- Scheduled task `glass-box-weekly-price-sweep`, Mondays 08:00 local (cron `0 8 * * 1`; runs when the app is open, else on next launch): cuts its own worktree `price-sweep-<date>` from origin/main, one commit, never pushes, messages the coordinator named in this file's Start here with the sha and report. Prompt text: `research/price-sweep/task-prompt.md`. STATUS: created 2026-10-26 after Nathan allowed it (saved in Auto mode; actual fire time 08:10 Mondays after the load-balancing delay; first run Mon 2026-11-02). Manage it in the app's Scheduled section.

## SF: Sump follow-ups (2026-10-23, branch `sf`, worktree `.claude/worktrees/sf`; from SU's open items)
- Heat loss (tech.ts heatLoss): a tank with a sump adds the sump's glass up to its water line (H x SUMP_FILL), its floor, and its water surface at the OPEN rate (it sits open in the cabinet; the display's lid does not cover it). wallM2 / floorM2 / surfaceM2 include it; the Tech menu's heat hint says "(the sump included)". The model has no volume term (areas only), so the sump's water volume does not enter. Moves only tanks with a sump: e.g. salt 75 gal open + 20 gal high sump, room default: heater 250 -> 300 W, 67.5 -> 87.1 kWh/mo; heater $ flat (the generic heater prices are one class from 150 to 500 W).
- Skimmer default: inferTech's skimmer follows the filter ('sump' only with a sump filter, else 'hob'); techOf fills a saved tech's missing skimmer row from its own filter units. Old files with no tech do not move (demand/engine.ts still prices its inferred skimmer row); with the tech made explicit, reef $3310 -> $3303 and clownnano $1403 -> $1399, risk unchanged (both skimmers are tier 2). Re-blessed gearFilters LOCK (reef+tech, clownnano+tech); sump.test.ts "counts the sump once" pins skimmer 'hob' on both tanks (one-line hook in SU's test).
- No fixed minimum sump (Nathan 2026-10-26: "why have a min?" ... "drop"; an earlier 5 gal floor superseded): the limit is the drain-down (sumpDrainDown: 1 in over the display surface + 0.1 gal of return line, held in the sump's empty half); the default holds it, a hand-picked size that cannot gets a warning in the Sump row (sumpTooSmall). No tank pick or verdict moves; 7 filtration % move; table in research/sump-section.md "Lane SF".
- 3D sump under the stand (built 2026-10-26): gear3d.ts sump() draws it at its own size (sumpOf) with baffles, the in-sump skimmer and the return pump; drain and return run to its chambers. A click on a cabinet stand opens / closes its doors (tankView.standOpen, not saved; build.ts addOpenCabinet, viewer.standAt, pointer.ts). No stand: the sump stands on the floor beside the tank. A sump that does not fit inside the stand (scene/standspace.ts) is not drawn, the Sump row says "Won't fit in the stand", and the size picker greys it. Moved numbers: research/sump-section.md "the sump in the stand".
- Tests: test/sf.test.ts.

## SU: Sump section in Tech (2026-10-22..23, branch `su`, worktree `.claude/worktrees/su`, port 5917; Nathan approved the layout and the push)
- Nathan: "an additional section in the 'tech'. Reuse the same presets or custom size tanks for it." 2026-10-23: layout yes; a sump is one filter unit among the others (one sump per tank, it has one size); offer it on ANY tank; the builds pick it wherever it is the best option, any size; 3D under the stand yes (picture first, not built).
- `tech.sump = { model?, L, D, H }` (interior mm; catalogue sizes from 10 gal, SUMP_MODELS; custom 50-3000 mm). No size = `sumpDefault` (smallest plain size >= 25 % of the display volume that fits its length). Sump water (x 0.5, SUMP_FILL) counts in the nitrogen budget and the water change, NOT in Space or the tank minimum.
- Priced in the Filtration row (counted once): sump tank (bare-tank rows by its gallons), new cited row gear:sump-plumbing, return pump. The Tech menu's Sump row (techMenu.ts) reads "in Filtration"; "Pick a size..." opens the Tank sizes dialog in sump mode (panels.ts hook `openSumpPicker`).
- `sumpOffered` (any wet tank) is the one rule for tankfit and builds; tankfit's fallback filter is now the lowest filtration (was the highest rated capacity). Every fitting tankFor pick has a build at or under 100 %. Moved numbers: research/sump-section.md (only 12 blue tangs move, 240 -> 210 gal).
- Open: 3D sump under the stand (lane SF: picture sent, waiting on Nathan); heat loss and skimmer default done in lane SF.

## Calib-v4 notes: every answer read through its tank's note (2026-10-26, side chat from Glass-Box-stocking; branch `calib-v4-notes` cut from `calib-v4` cb2b48f, worktree `.claude/worktrees/calib-v4-notes`; NOT pushed)
- **Why:** Nathan 2026-10-26: "the notes contain quite a bit of golden knowledge. I want them to be read carefully and have all answers of a
  specific tank be read through the lens of the specific notes attached." Before this, notes were printed at the end of the review and only
  a hand-added `review` annotation could change how an answer was read.
- **Method:** research/calib/v4/note-reading.md. A model (never a regex) reads each note with the tank, the answers and the app's reading in
  front of it, and writes `research/calib/answers/v4-<expert>.notes.json` beside the answers: a summary, a status for every answered field
  (as-clicked / restated / conditional / aside, each change with the note's own words and why), a condition the app can model (stock,
  tempC, tl in mm), and claims (species, rule key, quote, firm).
- **Files:** scripts/calib-notes-v4.mjs (brief, check, skeleton, applyNotes, loadRead, ledger); calib-fit.mjs and calib-review-v4.mjs read
  answers only through applyNotes and refuse a file with an unread or changed note; src/calib/v4.ts `tl` override, condKey, condScenario;
  test/calibtablesv4.test.ts writes and locks research/calib/tables/v4-notes.json (tanks as notes describe them, `A13@expert`);
  test/calibnotesv4.test.ts. The review gains three sections: each noted tank read through its note, answers under a note's condition
  against the app on that tank (flag kind `conditional`), and the claims ledger (flag kind `claim`: two experts, or one keeper or
  professional firm with high confidence).
- **How to run:** `node scripts/calib-notes-v4.mjs brief <answers>` -> read -> `node scripts/calib-notes-v4.mjs check <answers>` ->
  `GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts` when a reading has a modelled condition -> fit and review as before.
- **State:** calibration tests 42 green (notes, v4 tables, v4 tooling, rounds 1-3). No real answers exist yet, so no readings either.

## Calib-v4: survey v4 adopted into the calibration tooling (2026-10-23, side chat from Glass-Box-stocking; branch `calib-v4` cut from `xc`, worktree `.claude/worktrees/calib-v4`; NOT pushed)
- **Why:** Nathan rejected the round 1-3 survey (random tanks, counts nobody keeps). Survey v4 (60 hand-written likely-case tanks in modules
  A community, B specialist, C saltwater, D herps; design research/calib/v4/survey-v4-design.md) was written in the stale copy; this lane
  brings it in and makes its answers usable. Rounds 1-3a are untouched: their fit and four reviews rerun byte-identical (line endings aside),
  and test/calibv4.test.ts locks the fit against fit-round-1-2-3a-3.json.
- **Files:** research/calib/v4/ (scenarios-v4.json, make-survey-v4.mjs, design note, survey-v4.html, the LLM packs, index; copied unchanged
  except the generator's folder lookup, which broke on the space in "Glass Box"; build **cba9d609**, every output byte-identical to the
  redesign chat's folder. The survey was rebuilt the same day on S216's lessons (design note section 10): six tanks count a second
  species, a bottom dweller (`mate`: A04, A05, A10, A16 bronze cory, A11 kuhli, B06 sterbai; answers mateIdeal / mateLimit / mateStatus),
  B10 asks max.kribensis, and the build hash includes `mate`. The first build here was c7cb52e6; no answers exist for it);
  src/calib/v4.ts (each tank built the way the stocking screen builds one: males, then females, then unsexed; a pair species' two animals
  described as a pair marked established; salt water for C; no water for env.water none; the paludarium layout and the stated depth for
  D10 / D11; then the app's own readings: tileState, tankMinimum, crowdWarnings, compatRisks, operatingCheck on the stated temperature,
  herpCheck, notesOf / overWarn, groups.ts and herpstock maxima, the tank minimum at the four offered sizes; per tank also each species'
  floor share on today's engine (`uses`: stocking.ts floorShare, the one rule since S216's f52efb3, snails as floor animals; shrimp and
  crabs 0.3, kuhli 0.6, the S212 zone audit), its adult length (`tlMm`), the rounds' mix gate (scenario.ts gateOf), and
  count tables for the counted species and the mate; the lock re-reads all of it but the count tables); test/calibtablesv4.test.ts
  -> research/calib/tables/v4.json; scripts/calib-parse-v4.mjs; scripts/calib-fit.mjs (v4 round + `--out`); scripts/calib-review-v4.mjs;
  scripts/calib-synth-v4.mjs + research/calib/answers-synth/v4-synth-{agree,shift}.json; test/calibv4.test.ts; sources.json `expert-v4`.
- **How to run:**
  `node research/calib/v4/make-survey-v4.mjs` (rebuilds the survey) ·
  `GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts` (rewrites the tables, about 3 s; the same file without the variable is a lock
  that fails when the engine moves) ·
  `node scripts/calib-parse-v4.mjs answers/v4-<model>-A.json ... [--check] [--strict]` (validates, merges into research/calib/answers/v4-<expert>.json) ·
  `node scripts/calib-fit.mjs research/calib/v4/scenarios-v4.json research/calib/answers/v4-<expert>.json [--out <base>]` (old rounds can be given beside it) ·
  `node scripts/calib-review-v4.mjs research/calib/answers/v4-<expert>.json [...]` (-> research/calib/review-v4-<expert>.md, Findings kept).
- **Decisions this lane took (open for Nathan):**
  - **"Too small" is the app's verdict of its own (Nathan 2026-10-26, chosen from: its own verdict / not workable / problems):** a
    species under its red-line tank minimum, or a herp under its bare floor or height (the same idea for land animals), gives `too-small`,
    with the 4-step reading of the other parts beside it (`rest`). The review keeps those tanks out of the 4-step agreement and reads them
    in their own section against the experts' "Bigger tank" / "not big enough" answers (flag: fewer than half ask for bigger; A05 and C05
    ask neither question, so they are shown, never flagged). The rest of the verdict (src/calib/v4.ts verdictOf, the reading this lane
    took): not workable = a blocked pair, a herp with animals it must not share with, or no shared temperature (or outside it); problems =
    past 100 % space, a fighting warning, another herp warning, a group too small; caution = past 75 %, a compat concern, under the
    recommended size, a narrow shared temperature, a herp floor under the usual recommendation, a sex mix off the ratio.
    **On main 75eb86c: 27 too small** (their other parts: 9 ideal, 5 caution, 6 problems, 7 not workable), 10 not workable, 12 problems,
    9 caution, 2 ideal. S214's otocinclus change moved A10 (122 -> 118 %), B13 (140 -> 105 %) and B15 (98 -> 72 %, caution -> ideal).
  - Retabled on d7b6c89 (kuhli chemistry widened to pH 5.5-7.5, GH 1-10): A14 went not workable -> caution (its kuhli / pygmy cory pH
    block is gone; the narrow shared temperature remains), A11 stays blocked on hardness only (boesemani GH 9-19 against kuhli 1-10).
  - The fit reads 22 tanks (counts asked and a space.* / golden.* tag); the verdict is the overall band unless the expert's first change
    is not about room (bigger, drop, ratio, other: band left out, counts kept); notroom and "not big enough" leave the tank out, as survey 2.
  - The review's count flag uses the "least" fix (the smallest move that makes the expert's count the engine's own nearest count), so a
    rounded small count is not a disagreement; the point fix is shown beside it.
- **Findings from the tables (no engine change made):**
  - The nerite snail's pH gate (7.0-8.5) blocks neon, harlequin and chili rasbora: A02, A06 and B16 read "High compatibility risk", where
    the survey's `why` for A02 expected no problem but temperature. Nathan (2026-10-26): being worked on in another chat; retable
    (GEN_RETABLE_V4) when that lands.
  - The coral-nipper caution (C04, C05) is not in these readings: the coral gate (animalfit.ts) needs coral items in the tank, the v4
    tanks are built with river stones as rounds 1-3 are, and compatRisks does not pass `corals` either. "LPS and soft corals" is listed
    among the tank's unmodelled notes; the experts' answers on compat.coral-nipper are therefore read against a tank without corals.
  - B02: the clown loach is fitted on the floor (bottom dweller), but the engine reads that tank water-bound (107 % water, 50 % floor), so a
    limit count there pulls the floor scale (the synthetic agreeing expert moved floor x1.06 until it left that count out). Fit-convention question.
  - 39 tanks carry notes the app has no input for (juvenile lengths, hard water, corals, humidity...): listed per tank in the tables (`unmodelled`).
- **Proof on synthetic experts (build cba9d609):** an agreeing expert fits water x1.00, floor x1.01 and gets no review flag; one keeping 30 %
  more fish and judging pairs a step milder fits water and floor at the x0.8 cap (the floor through the six mate counts) and gets only
  count (engine too full), room verdict (milder) and compat (milder) flags. Checked over S216's e93c3d1 in a throwaway worktree: no shared
  files, every calibration test green, the old-round lock follows its new fit. Full suite 1319 green (1 skipped as before), `npm run build` clean.
- **Next:** Nathan's yes on the verdict reading and the nerite question; then LLM experts per design section 7 (one module per conversation,
  saved as answers/v4-<model>-<module>.json), parse, review, Findings by hand. Not merged into `xc`; nothing pushed.
## XC: expert calibration rounds (2026-10-23, side chat from Glass-Box-stocking; branch `xc`, worktree `.claude/worktrees/xc`, port 5823; NOT pushed)
- **Why:** refine the stocking engine's space numbers from expert opinions over randomized rounds, instead of hand multipliers (SPACE_NUDGE).
  Design and findings: research/expert-calibration.md.
- **Nathan's decisions (2026-10-23, in chat):** experts answer on 75 % = ideal (green), 100 % = limit past which long-term problems are
  likely (red), tread carefully between (this differs from the lane SR prompt's 100 % = recommended capacity; Nathan: SR already knows).
  Mixed tanks are drawn through the compatibility gates (40 % one species, 40 % passing mixes, 20 % flagged) and get a "keep together?"
  question checked against the gates (not fitted). Sparse decor (river stones). Survey screen approved from a mockup.
- **Built:** src/calib/scenario.ts (seeded generator; every species passes its tank minimum and group, no fighting warning; engine table
  per focal count), test/calib.test.ts, scripts/calib-fit.mjs (log multipliers on today's factors: water g, floor f, class c, species d,
  expert bias; BFGS; cap x1.25 a round), scripts/calib-synth.mjs + test/calibfit.test.ts (a known shift is recovered: species error
  0.045 vs 0.077 unfitted), scripts/calib-survey.mjs -> research/calib/survey-round-1.html (24 tanks, 4.4 MB, renders inlined, no
  engine numbers inside). scripts/space-factors.mjs now keeps the hand-set blocks after the generated table (it dropped FLOOR_FACTOR).
- **Process (Nathan 2026-10-23):** batches of 10-20 tanks; Nathan answers the survey himself (spread band 50-130 %); `node scripts/calib-review.mjs` writes research/calib/review-round-N-<name>.md (per tank, patterns, flags) and Claude adds findings; Nathan approves broad changes; next batch. Design doc section 9. **Survey v2 (Nathan, after 5 round-1 tanks):** text only, room per dimension, limiting species, big enough, tankmate count, confidence, plants; round 2 (22 tanks: floor / water / both tight, 2 footprint pairs); fit per dimension (design doc section 10). Round 1 + survey-round-1.html frozen; his 5 answers in research/calib/answers/round-1-ngr.json. **Next: Nathan answers research/calib/survey-round-2.html.**
- **No engine number moved.** Full suite green, tsc clean.
- **Open:** who the experts are; goldens restated on the 75 / 100 scale (discus stays 6 in 55 gal = 85 %, per S214; still open: FLOOR_FACTOR kuhli, the
  S196 / HC / HB targets); src/data/expertfit.json + provenance rule once real answers exist; otocinclus blend into the gravel in the renders (they do render; no bug)
  (f13, f19 of round 1), amano shrimp nearly invisible.

## CP: compatibility gaps from a stocking audit (2026-10-22, Nathan's own chat opened from Glass-Box-stocking; branch `compat-puffer-krib`, worktree C:/Users/nreed/Glass-Box-compat)
Outside audit: 28 x 15 x 12 in (21.8 gal), 1 male + 3 female pea puffers, 1 male dwarf gourami, a mated krib pair. The tile said "Room for about 17% more" and no gate fired (puffer temper 2 + nip only hit `slow` fish or temper 0; gourami and kribs are temper 1).
- care.ts: `feelers` (dwarf, honey, pearl gourami): hit by `nip` only, blocking for a temper-2 nipper (tiger barb, pea puffer), a concern for danio; `slow` still means long fins, so kribs + gourami stay clean. `alone` (pea puffer): concern beside any other fish (inverts are the prey rule's). `guard` cm2 (kribensis 1800, about 2 x 1 ft): a sexed or established pair with other fish on a floor under twice that is a concern.
- territory.ts `compatRisks(S)` / `compatLine`: whole-stock compat, each pair once from the acting side, a blocked pair said by its blocker only; `high` when any blocker. Temperature, size, expertise stay elsewhere.
- fullnessTile.ts: the line leads the tile (red for high, amber for concern) and the pill adds "· compat risk"; bars and percents unchanged (load and compatibility kept apart, as the audit asked). Test: test/compatrisk.test.ts.
- CP2 (same day, branch `cover-guard`): `guard` also on gbr / bolivianram / cockatoo (900 cm2) and angel (2400; a pair in a 55 flags, a 75 does not), all estimates (provenance 'assumption'). Care `cover` ('plants' pea puffer, 'cave' kribensis + cockatoo) -> territory.ts `coverAdvice(S)`: under DENSE_PLANTS_PER_100L (10, live or artificial, patches x3) or with no cave or arch (water dishes do not count) an amber tile line. The sidebar stocking line (panels.ts stkWhy, one-line hook) now leads with the compat line and ends with the cover advice.

## SN: Snail waste and space (2026-10-22, branch `sn`, worktree `.claude/worktrees/sn`; chat SN, Nathan's yes on the numbers in chat)
- Snails take floor (HB floor side; water space stays 0): footprint 3.2 x mass^(2/3) cm2 x SNAIL_ROOM 3 (Nathan picked 3 of 2 / 3 / 5);
  small snails stay nearly free (10 trumpets in a 5 gal ~4 % of the floor). Mystery snails waste like a fish of their mass (MET_CLASS
  `applesnail`, 2.73 -> 5.45 mg TAN/day); other snails keep `shell`. Notes and sources: research/snail-load.md; test/snailload.test.ts.
- tankFor at 50: mystery 10 -> 30 breeder, nerite 2.5 -> 20 long, ramshorn 2.5 -> 5, turbo 75 -> 180; trumpets, shrimp, hermits unchanged.
  Starters' max Full % unchanged, examples unchanged.
- Masses checked (follow-up): not inflated, the notes were for pre-CB lengths; turbo now cites T. cornutus (SeaLifeBase), mystery kept
  at 14.4 g by Nathan (congeners say 23-35 g). Open: filters absorb huge TAN in
  small tanks (before SN, 50 mysteries' 136 mg TAN/day read 98 % in a 10 gal), so Filtration rarely binds tankFor.
## Nano-school check: no recalibration (2026-10-22, side chat from Glass-Box-stocking, branch `nano-check`)
- **Why:** 15 harlequins in a 20 long read water column 96 % ("cramped but doable"); a review called it comfortable. Hypothesis was a systematic over-read of nano schools.
- **Finding:** not on the current engine. Nano lists read median 68 % vs 77 % for larger fish at TINY_EXPERT 0.8; every stronger discount or mass curve fit both sets worse. Details: research/expert-stockings.md, section "Nano-school check". No engine change (Nathan agreed).
- **Open:** harlequin's AqAdvisor-fitted factor 0.71. Four 20 long combos added to COMBOS with no answers yet (aqadvisor.com down); run `node scripts/aq-compare.mjs`, then `GEN_AQ=1 npx vitest run test/aqcompare.test.ts`, and refit harlequin alone if AqAdvisor reads clearly lower.

## Kuhli sanity check -> tank-wide school discount + kuhli floor factor (2026-10-22, Nathan's own chat, no lane ID; branch `kuhli-floor-school` in a scratch worktree, pushed to main)
- **Why:** 17 kuhli + 15 zebra danio in a 50 gal (36 x 18 x 18 in) read Stocking 100 % (water 100, floor 96); AqAdvisor read the same tank 74 %.
  research/habitat-model.md (2026-10-22 section) has the findings, the candidate matrix and the decision.
- **Model (Nathan's decision, option C):** (1) the water limit's school discount is ONE curve over every fish that takes room (snails excluded),
  `SCHOOL_EXP` 0.72 (was 0.85 per species): six AqAdvisor answers for one tank fit stocking ~ (weighted fish)^0.72 across species, and the
  per-species rule added two schools linearly. (2) `FLOOR_FACTOR` (data/spacefactor.ts): kuhli 0.6 (est, piles into shared caves); the floor
  stays linear in count (audit F). (3) `SPACE_PER_L` x 0.9374 so the 37 published lists keep their median 74 % at the published max.
- **What moves:** that tank reads 86 % (water 86, floor 57); 13 kuhlis in the catalogue 20 long 96 % by water, cramped but doable, no longer failing (was 131 by floor;
  S188 test re-worded); two-school communities read lower (published lists over 100 %: 12 -> 10); AqAdvisor median over 31 combinations 1.01 (7 new
  answers in research/aq-compare.json, COMBOS in test/aqcompare.test.ts). The starters' litres per animal shrink 6 % with SPACE_PER_L. No UI change.
- Files: scene/stocking.ts, data/spacefactor.ts, data/provenance.ts, test/stocking.test.ts (new block), test/minimum.test.ts, test/aqcompare.test.ts,
  research/aq-compare.{json,md}, expert-stockings.md, space-audit.md, habitat-model.md, scripts/aq-queries.json.
- Open: a lone big fish among many small ones gets the same tank-wide discount (AqAdvisor's curve does the same in effect); a load-weighted count
  is the refinement if a case shows it wrong.

## CF: S207 review fixes (2026-10-22, done in Coordinator 8 at Nathan's request, branch `cf`)
- Fixed, tests in test/cf.test.ts: the no-heater line in plan.ts reads the Tech-menu room temperature (was always 21 C) and says "too warm" when the
  room is above the range; withChoice clears `filterless` when a filter is chosen (kitTech builds a fresh tech, so it never carried it); an all-female
  sexed group reads "Your mix has no males" (was "short on females"), males-only / females-only species name what is off; planFor keeps its last
  answer for the same animals and tank (one redraw asked it once per pick row); leaving the stocking screen with every pick removed sets the last box's
  tank at full size (the 0.7 x box reached the editor); nitrogen.ts's dead light-off branch removed (LightSettings has no off state; no number moves).
- NOT done, needs Nathan: tankfit's filter loop allows a sump while builds.ts never offers one. Excluding sumps moves 34 of 504 tankFor answers
  (species x 1/3/6/12/25/50): 3 oscars 180 gal -> 6 ft custom, 3 blue tangs 125 gal -> 6 ft, 6 yellow tangs 55 -> 90 gal, 12 turbo snails 15 -> 37 gal,
  6 axolotls 60 breeder -> 75 gal; big stockings start failing filtration. Question: should large / salt builds offer a sump instead?
  Also seen: 50 mystery snails pick a 10 gal (2.5 gal without sumps): snail bioload looks too low.
- Not done (cleanups): stockingMemo key lacks grow.feed; needsOf unread fields, dead 'floor' fail, capacityOf LU figures, three recommendedMin copies,
  esc / usd in 12 files, builds.ts baseSetup vs setupFor.

## S207: Code review fixes (2026-10-22, branch `s207`, worktree `.claude/worktrees/s207`; the review: chat S207, 20 findings on main b0a07bb, two confirmed by running the engine)
- **Length gate gets the 10 % slack (tankMin.ts `lengthShort`, read by tankfit `fitOf`):** it was strict while the same red-line length already sits in
  `tankMinimum.percent` with MIN_SLACK_PCT, so a tank a few mm under a line DERIVED from another catalogue tank was greyed "too short" where the
  tile's red line passed it: 10 rummynose in the 29 gal (756 vs 765 mm inside, 101 %); also goldfish x2, hatchet, tiger barb, bronze cory (29 / 37 gal),
  angel (30 / 40 / 50 breeder, 111 %), discus and livingstonii (90 / 120). Now 'length' fails only past the slack, when 'minimum' fails with it. Lane HB's
  rounding (the 0.3 mm case) covered the 20 long only.
- **Tankmates and swaps judged in the chosen tank (stockPlanLogic `rankTankmates`, `forkOptions`; new `tankfit.fitIn(animals, tank)`):** `fits` compared
  the litres of the smallest holding tank with the chosen one, but 25 catalogue cases hold in a smaller tank and fail a bigger one (cubes and talls:
  length / minimum). A honey gourami read as fitting a 6 gal cube with 10 cherry shrimp (the 5 gal, 19 L, holds both) though the cube fails its red line
  at 128 %; the fork card's "fits as it is" and its swaps had the same shortcut. `candidateOf` in tankfit replaces two copies of the catalogue lookup.
- Tests: S207 blocks in test/tankfit.test.ts and test/stockplan.test.ts. No threshold or data changed; what moves: the greyed sizes above open, tankmate
  badges on cubes / talls, the fork card's as-is answer.
- Open from the review, not done here (ranked): the ghost box's 0.7 x dims leak into the editor when every pick is removed before closing (stockPlan.ts
  settle / sync); plan.ts "too cold" reads ROOM_C, not the tank's roomC (tech.ts unheatedC does it); tankfit's filter loop may pass a tank on a sump that
  builds.ts never offers; planFor runs up to 8x per keystroke on the stocking screen (once per pick row); `filterless` survives a filter added by
  withChoice / kitTech (only withUnits clears it); nitrogen.ts light-off factor is dead (LightSettings has no `on`); a female-only sexed group reads
  "short on females"; stockingMemo's key lacks grow.feed (older files without tech). Cleanups: needsOf's unread fields and the dead 'floor' fail,
  capacityOf's unused LU figures, three copies of recommendedMin, esc / usd in 12 files, builds.ts baseSetup duplicating tankfit's setupFor.

## Temperature tiers (2026-10-22, branch `temp-tiers`; mandatory follow-up to the German blue ram review; NOT merged, awaiting Nathan)
The pairwise "share under 2 °C = incompatible" rule is gone. `src/scene/temprange.ts` (its header holds the definitions) keeps apart:
- **Shared range (about the species):** intersection of every aquatic species' recorded comfortable range (CARE.temp). `none` (no overlap):
  "No suitable shared temperature identified"; `single` (they meet at one value): "Only one shared temperature; no operating margin";
  both block. `narrow` = 2 °C wide OR LESS (`NARROW_C`; the cardinal 23-29 against gbr / neon / panda cory / CPD / hillstream / cherry shrimp
  lands at 2): a concern worded as a limited margin, never incompatibility, NO risk points (reviewer: width cannot tell mid-range from edge;
  a future penalty = target's distance to the nearest bound + expected variation, charged once per tank). `broad` = wider. Passing reads
  "temperature: shared range X–Y °C", never "compatible". Pairwise overlap guarantees an intersection for intervals.
- **This plan's water (about the plan), three inputs (Tech menu, `TechSetup.targetC` / `measuredC`, `tech.ts tempEvidence`):**
  target water temperature (`operatingCheck`: does the intended temperature fit), equipment + room (`holdCheck`: expected to hold it;
  a heater setting alone is never green), measured (`measuredCheck`: the observation). No target and no heater: the water is MODELLED from
  the room, labelled an estimate; an entered room is assessed, the default room gives only a conditional concern; no target with a heater
  = unchecked. A definitive outside keeps the range line from reading positive. Corrections follow the mismatch: below "raise ... (heater)",
  above "lower ... (a fan, a chiller or a cooler room)", never a heater for a warm room. heatLoss sizes for the target when set.
- The species gate, the plan sheet and the Tech menu's no-heater chip use the same check (the old per-species room loop is gone): the card
  says "requires heating / cooling" with the fix (the setup, not the combination); an assumed room is a concern only.
- `whysAnimal` returns every reason (blocking first, `concern` after); `whyAnimal` = first blocking. Shown: stock planner per pick (main in red,
  "Also:" under it) + whole-list lines; plan sheet one line per species with all blocking reasons + the temperature lines once; the species
  list gate "(+N more)" with the rest in the tooltip. Climate chart: "ideal" -> "in range".
- Re-blessed: reef risk 8.608 -> 6.451, paludarium 7.992 -> 7.467 (false 1 °C clashes removed). The "reef riskier than planted" ranking had no
  independent reason and is dropped; demand.test now tests the mechanism (narrow: no points; a real clash: points; other rows unchanged).
- Demand no-heater risk (demand/tech.ts) now goes through the same assessment: a species beyond its tolerable range is charged only when
  operatingCheck is definitive (an entered room); an assumed room adds no penalty, matching the "conditional" on screen.
- Display (browser-checked 2026-10-22): plan sheet main reason + indented "also:" lines; the species list shows a lone concern as a note
  without graying the item; the plan sheet takes the Tech menu's explicit heater choice over the shopping list's heater row.

## Lane RF: Path 1 Rule Fixes (2026-10-22, branch `rf`, worktree `.claude/worktrees/rf`, port 5911; prompt prompts/lane-RF-path1-rule-fixes.md)
Software fixes from research/rules-spec.md section 6; no threshold changed. Benchmark before / after: research/benchmark-baseline.md (regenerate with `GEN_BENCH=1 npx vitest run test/benchmarkBaseline.test.ts`). Tests: test/path1Rules.test.ts.
- **1 Care needs on their own path:** new `src/data/careNeeds.ts` (`NEEDS`, `needsOf`, `needLine`): feeding / maturity / environment conditions with a severity, evaluated apart from the count. All are `unchecked` today (no food-supply or tank-age model), so the line says "Not checked: ... confirm it before buying". Shown on every pick row (`notesOf().needs`) and in a plan-sheet section "Care needs the tool cannot check" (verdict reads "It fits the tank, with care needs to confirm"; .txt too, `planTextWithNeeds`). Moved out of band messages: mandarin pods + maturity, hatchetfish lid, hermit shells. FORMULAS entry in provenance.ts (claimed, wording only).
- **2 Group-size label + precedence:** the band line reads "Group size: ..."; `groupLineIn(nt, plan)` holds it (muted, "that is the group only: this tank fails (too full)") when the chosen tank fails, and the stocking screen puts "Tank verdict: ..." above the picks.
- **3 GroupCare fields defined** (doc comments in groups.ts): bands = group-size only; max = most per tank whatever its size; maxDepthMm = MAXIMUM WATER DEPTH (not recommended depth, not enclosure height), not read where tankmin.json has a sourced depth; minLengthMm / minWidthMm / minAreaCm2 superseded by tankmin.json (the engine does not read them). Invariant test: ok <= good <= great <= max. **Decided (Nathan 2026-10-22):** Q1 adf `max` 6 removed ("why would the maximum be 6? Makes no sense": no stated cap; room is the tank fit's job). Q2 the 450 mm is a "hard limit with a warning": GroupCare maxDepthMm now counts in tankfit / tankMin even beside a sourced advisory (one-line changes in lane MM's files), so deeper tanks fail 'depth' (greyed, warned, Continue stays on); the sourced 24 in stays as the advice note. Fixed test pollution in test/tankfit.test.ts (afterEach deleted the real adf depth).
- **4 Sex and pairing:** `Pk.u` = unsexed count (sexed species get a third stepper; the ratio is judged on sexed animals only and names the unsexed; a herp left unsexed keeps no gender). `Pk.pair` = established / unconfirmed / unknown, asked for two of a `PAIR_FORMERS` species (gbr, bolivianram, kribensis, angel, discus, ocellaris, banggai, firefish, watchman; a test keeps it in step with "bonded" / "male/female pair" lines); unless established the line adds "(only if they are a pair)".
- **5 Builds converge by configuration:** builds.ts `configKey` (tank, tech, light, bundle) + `distinctBuilds`: same gear = one card ("Cheapest and balanced"), price never merges. Two-line hook in src/ui/buildPick.ts (P6a, archived): distinctBuilds on open, heading "One / Two / Three ways to build it". Builds a dollar apart with different gear stay separate (neon cases): rules-spec's "inside the cost uncertainty, show one" is a separate, price-based decision, not built.
- One-line hooks in src/style.css (.planVerdict.warn, .spb-held, .spPair).
- Open: S3 care needs do not block Continue (no decision); hatchet / hermit wording is ours (claimed).

## Product review (2026-10-21, external review doc + follow-up, relayed by Nathan; design chat local_eda2d645)
- Accepted: severity separate from confidence; every consequential rule carries evidence (what the source says) apart from TankLook's interpretation / derived number / conservative default; "unknown" when inputs are missing; one assessment per setup in every path; user locks never relaxed silently; benchmark cases with reviewed expected verdicts, some held out of calibration (AqAdvisor fit = agreement, not correctness).
- Path 1 changes pending (not started): sex = male / female / unsexed and pairing = established / unconfirmed / unknown as separate inputs; group thresholds reviewed WITH their wording (5+ = "social need met; the tank now limits"); builds converge when not genuinely different (today always three); first-year cost beside setup cost, no winner inside the uncertainty; optional spending-ceiling lock + "I don't know yet" (one expected number stays); workload as daily / weekly / occasional; owner path judges the change AND the result; "plants never add room" = aquatic water volume and floor only.
- Build order (agreed): dogfood path 1 -> rules spec (draft: research/rules-spec.md) and benchmark run -> owner what-if -> look first -> newcomer. Kept: "AI-proof" as the internal test, "a better tank decision" as the promise.


## Animal-first: no tank until the user picks one (2026-10-21, branch `nt`; Nathan's request)
- **Decision (Nathan 2026-10-21), replaces the 2026-10-20 "the tool picks a tank" refinement:** at the start the tool selects no tank. The
  animals show on a blank view, grouped in an invisible box (0.7 x the length and depth of the smallest size that holds them; it follows
  the picks and is not a choice). The user picks a tank from Tank sizes; it is iterative: add animals, pick a bigger tank, add more.
- Code: `render/tankView.ts` (`tankView.ghost`, view-only, never saved); `buildTank` skips glass, water, algae, substrate, backdrop, lid,
  doors, light and beams while it is on; the fullness tile hides (nothing to be full). `stockPlan.ts`: ghost until a size is chosen;
  leaving the screen without a choice (Open in the editor, close) sets the smallest holding size as the real tank.
- **Decision (Nathan 2026-10-22): a failing tank warns, never blocks.** Continue stays on once a tank is chosen; the problem line reads
  "... You can still continue." 13 kuhlis grey out every size below a 60 gal breeder on main today (per-head floor rule, 4 x tl^2): sent to lane MM as an
  acceptance case (13 kuhlis in a 20 long: no red minimum, Continue on). The minimap still draws a tank outline in the ghost view.


## S165: Tank minimum policy (2026-10-21, branch `s165`)
- Six policy questions SETTLED; the rules are in research/tank-minimum-first-principles.md "Decisions". No policy code yet.
- Shipped bb778da (build 1053): build fix, the mystery snail's volume-only flag is now applied in `measureMinimum`.
- Policy settled and pushed ade4ca0 (build 1056). Next work units, as lanes (Coordinator 6, 2026-10-21):
  MA Tank Minimum Audit (prompts/lane-MA-min-audit.md: Space-bar audit, noncompensation test, clearance sweep; tests only) and
  MX Tank Minimum Sourcing (prompts/lane-MX-min-sourcing.md: research only, one measured batch then a quote) can run in parallel;
  MM Tank Minimum Migration (volume advisory, Recommended label, depth field, derived vs sourced reasons) waits for both, prompt
  written when they report. NB Nitrogen Balance (prompts/lane-NB-nitrogen-balance.md: S185's findings + Decision 2 water-change
  states) runs alongside; it owns nitrogen.ts and the water-change lines, MA only reads them.
- Nitrogen check (2026-10-21, ChatGPT review in Nathan's Downloads, TankLook_Nitrogen_Filtration_Review_for_Claude): the "2 % a week"
  for 13 tiger barbs in a planted 20 long is NOT a bug: plants' spare capacity (22 - 15 mg N/day) takes ~7 mg of the nitrate, ~2-3 mg
  N/day is left, about 0.2 mg N/L a week against the 9 mg N/L (40 ppm NO3) target. Units g N throughout, shared plant budget, no
  double count. Weak point is the input: plant uptake (one Egeria study, extrapolated) moves the figure 3 % / 15 % / 28 % at 22 / 11 /
  0 mg uptake. For lane NB (no model overhaul): label the figure "nitrate-only" beside the 10 % routine floor (a
  cited policy, not the calculation); show the plant-uptake uncertainty; show a plant-free filter load (25 / 73 = 34 % vs 14 %) as a
  resilience case; relabel the "Water changes 10 %" flow slice (share of nitrogen exported, not a % of the water); regression tests
  (conservation, shared plant cap, NO3 conversion, zero plants, less uptake raises the change, reproduce the 13-barb tank); check the
  litres passed in are net of substrate at the working waterline; say plainly that cycling and tap-water nitrate are not assessed.

## Lane MA: Tank Minimum Audit (2026-10-21, branch `ma`, worktree `.claude/worktrees/ma`; tests and research only, no engine change)
- Space-bar audit (Decision 6): `test/spaceaudit.test.ts`, table and verdicts in `research/space-audit.md` (`GEN_SPACE_AUDIT=1` rewrites
  it). Space sees only water and mass: equal water = equal Space whatever the shape (24 x 12 x 24 vs 48 x 24 x 6 in: 74 % both; 20 long
  104 % vs 20 high 107 %, while the gate reads them 108 % vs 143 %), and height is credited to bottom dwellers (10 cories on a 30 x 12 in
  floor: 95 % at 12 in high, 32 % at 36 in). Count is right (linear past the viable group, minimum unchanged): locked. 5 `it.todo`.
- Noncompensation (overall rule): `test/minimum.test.ts`. Locked: length, stated width and stated area fail on their own; 100x water,
  10x height and the filter choice never rescue a short floor. 4 `it.fails` + 1 `it.todo` (below).
- Clearance sweep (Decision 3): `research/clearance-sweep.md` (`GEN_CLEARANCE=1 npx vitest run test/minimum.test.ts`). No species fails
  clearance in its smallest passing tank (worst: clown loach / oscar at ~1.5x adult length front to back), and in the four extreme shapes
  nothing passes the gate yet fails clearance: as a gate it adds nothing today. Likely false positives as predicted: ball python, kuhli,
  long-tailed geckos and anoles. The bounding box overstates bowfronts (centre depth) and bowls (full diameter).
- Item 4 (nitrogen "2 % a week" pin): NOT done here; lane NB's prompt owns test/nitrogen.test.ts and pins the 13-barb case.
- **For lane MM (what must change; each `it.fails` turns into a plain `it` when fixed):**
  1. Decision 2: water must never fail a species on its own. Today the water share (bottom 0.25, swimmers 0.5) fails a danio in 12 L (3 gal) on a
     47 x 20 in floor (167 %, limiting water).
  2. Decision 2: the mystery snail's VOLUME_ONLY weight 1 makes 5 gal a hard failure (190 % in 10 L); it should be its Recommended mark.
  3. Overall rule: a floor area DERIVED from litres fails swimmers (tiger barb, 48 x 3 in floor, 18 in of water: 115 %, limiting floor area);
     an estimate may not silently fail.
  4. Decision 3: bottom dwellers ignore a stated length (run weight 0); hold it where a source states it (and mark which `minLengthMm`
     are sourced: most are (est) in research/groups-sources.md).
  5. Decision 3/4 (`it.todo`): kuhli in a 36 x 20 in tray at 2 in passes today (85 %); it must read "not assessed" (needs the depth field).
  6. Side finding: the ball python passes NO catalogue terrarium, not even 48 x 24 x 24 in: its 450 L is spread over 19.7 in of "water"
     by `refDepthCm` (asks 1395 sq in, the 4 x 2 ft has 1152). Land animals' gallon figures are enclosure sizes; derive geometry from the
     reference enclosure per Decision 5.
  7. Space bar (later, not MM unless asked): the five Space todos need habitat-based Space, which needs evidence-backed per-zone coefficients.

## Lane MX: Tank Minimum Sourcing (2026-10-21, branch `mx`, worktree `.claude/worktrees/mx`; DONE, research only)
- Write-up: `research/tank-minimum-sources.md` (method, coverage, US-unit table for all 84 species). Data:
  `research/sourcing/tank-minimum/` (M1-M9.json + verify, input.json, summary.json, table.md); brief
  `research/sourcing/brief-tank-minimum.md`; merge `node scripts/tank-min-sources.mjs`. Nathan's yes for 9 Sonnet agents; 0.78 M
  tokens (quote 0.70 M for M2-M9, actual 0.69 M).
- Found: 55 sourced footprints, 7 length-only, 22 derived (est) from gallons (incl. all invertebrates, which Decision 3 exempts);
  no page states a required water depth for any species; angelfish tank height 50 cm = Recommended; ADF max depth 24 in advisory.
- **MX1-MX9 DECIDED (Nathan 2026-10-21, research/sourcing/decisions.md):** two lines per species. RED = minimum (below = red bar,
  fails), GREEN = Recommended (at or above = green), between = yellow, allowed. Red = lowest well-supported figure (gallons turned
  into the smallest catalogue tank holding them compete when fewer than two pages state geometry, marked DERIVED est); green =
  the strictest credible geometry above it. Never averaged. Aquatic invertebrates: clearance only.
- **For MM:** load `research/sourcing/tank-minimum/summary.json` `species.<id>.lines` (red, green, heightRed, heightGreen, depth,
  why); the field list is in research/tank-minimum-sources.md "For lane MM". Volume = advisory only (`measures.volume`). No src/
  files touched by MX.

## Lane MM: Tank Minimum Migration (2026-10-21, branch `mm`, worktree `.claude/worktrees/mm`, port 5893; DONE)
- **What changed:** `src/scene/tankMin.ts` rewritten onto Nathan's MX1-MX9 lines. Data `src/data/tankmin.json`, generated by
  `node scripts/tank-min-data.mjs` from research/sourcing/tank-minimum/summary.json (re-run it after `tank-min-sources.mjs`). Per
  species: red = minimum (fails below, 10 % slack as before), green = Recommended (the red line where none is stated), heights, depth
  notes, advisory gallons; each value keeps sourced / sourced (est) / derived (est). Provenance: new audit target TANKMIN
  (cited by row url, researched for (est), derived for gallon-derived lines), source id `tank-min-sourcing`; ratchet green.
- **Rule (Decision 3/5):** floor dwellers (bottom zone and land animals) are held to floor area (L x W, or a stated area) plus the stated
  length and width; swimmers to the length, plus the width only when large-bodied (adult >= 15 cm, `LARGE_BODY_MM`, our cut), plus a
  stated "or equivalent" area (swordtail). A derived line gives one requirement (area for floor dwellers, length for swimmers). Water
  never fails anything: the gallon figure is only part of the green check (yellow "below the recommended size ... a small volume swings
  fast"). Aquatic invertebrates and the regal jumper have no red line and never fail on size.
- **MA items:** all five `it.fails` / `it.todo` in test/minimum.test.ts are plain passing tests; added depth (angel 50 cm Recommended,
  ADF 24 in advisory, usable depth = water level minus substrate), ball python (passes the 48 x 24 x 24 in terrarium, never judged by
  litres) and wording cases. Depth: water shallower than the animal's adult length = "not assessed" (red line, fails the gate: not a
  pass); 90 % of tank height is the labelled fallback when no water level is known.
- **Wording:** red sourced "wants a tank at least 35.5" long (Seriously Fish), this one is 24""; red derived "estimated from a gallon
  figure (Fishkeeping World: 10 gal, the smallest such tank is a 10 gal): wants about ..."; yellow "below the recommended size: Seriously
  Fish recommends ..."; nothing when every species is at its green line. "comfortable" / "cramped" are gone.
- **Consumers, one evaluation:** Fullness tile (`minWarnings`), tankfit (minimum fail; its `length` fail now uses the red-line length; a
  sourced advisory maximum depth (ADF) no longer fails `depth` or the hard truth), herpcheck (water-side species with a red line are
  judged by the tank minimum), count picker habitat lines (red / Recommended length, ADF depth advice), species-data review page
  (red / green / held / height / volume / depth / why columns). TIERS, MIN_WEIGHTS, VOLUME_ONLY, REF_DEPTH_CM etc. are gone.
- **Moved numbers (deliberate re-blesses):** example demand risk: betta 5.64 -> 4.934 and betta+tech 5.81 -> 5.132 (the nerite snail no
  longer fails: invertebrate, MX6); clownnano 6.998 -> 6.326 and +tech 7.116 -> 6.47 (skunk cleaner shrimp, same); terrarium and
  +tech 2.802 -> 4.294 (White's tree frogs now FAIL: the corner terrarium has 254 sq in of floor, The Bio Dude's 18 x 18 in = 324).
  Tank fit: the oscar starts at the 180 gal (72 x 24 in; SF 59 x 23.5 in with width held), so 2 step-ups not 3; 8 white clouds now get a
  10 gal (was 15). Tests updated: fullnessTile (wording), stockplan (ADF line), reasonable (wanted = the advisory gallons), tankfit,
  scapes (heater case pinned to the 15 gal), gearFilters / tech locks above.
- **Gaps:** (1) Space bar habitat model (MA item 7) untouched: 5 `it.todo` in spaceaudit remain. (2) "+ difficulty" for small volume
  (Decision 2) not wired, only the yellow note. (3) `LARGE_BODY_MM` and the "not assessed below adult length" depth rule are our
  assumptions; territorial / sedentary footprint class not modelled. (4) Land animals: herpcheck's HERP floor table still gives its own
  floor verdict beside the gate; the tile shows water species only. (5) DECIDED (Nathan 2026-10-21, "whatever you recommend"): a land animal's
  sourced L x W footprint stays held as AREA (Decision 3: amphibians = floor area; a corner or odd shape with the same sides has less
  floor). The terrarium example's 3 White's tree frogs therefore show red (254 vs 324 sq in); fixing the example scene is a follow-up. (6) DONE S193 2026-10-21: the 10 gal build
  listed a heater nobody needs: a heater-less starter kit (kitTech starts from inferTech, heater one) overwrote the build's heater none;
  bundleFor now keeps the build's heater choice when the kit has none (test in scapes.test.ts, 10 and 15 gal, every build). Also S193:
  `plural` (stocking.ts, now shared with fullnessTile) gives "Kuhli loaches" (ch / sh / x / z + es; fish and names in s unchanged). (7) groups.ts minLengthMm / minWidthMm / minAreaCm2 are no longer read by the gate
  (still on the review page); CARE.minL only in whyAnimal's no-fit fallback: retire later. (8) research/clearance-sweep.md not
  regenerated (its "Reading" text is hand-written about the old gate).
- **Follow-ups (2026-10-21, same lane):** (a) S188 acceptance: 13 kuhlis in a 20 long had only one failure, tankfit's per-head floor
  rule (`FLOOR_K` 4 x TL^2 each, a rule of thumb). It no longer fails a tank (Decisions 1 and 6: crowding is the Space bar's job), so
  "Continue" is enabled and the 20 long is offered; Tank minimum 94 %, yellow (77 cm < the 80 cm Recommended). Test in minimum.test.ts.
  `needsOf().floorCm2` is still computed. (b) Nathan "Bar back, keep lines" (relayed by local_971a3f4f): the Tank minimum bar is back under
  Space / Filtration (`minBar`: red below a red line with the 10 % slack, yellow below a Recommended mark, green past all; "Not assessed"
  when depth fails), with its list "Smallest tank they want, whatever the count:" (`topMin`, top 3: "at least X; Recommended Y",
  derived lines say "(est. from gallons)"). The red per-species lines stay; the yellow per-species line is gone (the bar says it); ADF's
  depth advisory stays a yellow line. Gap: `plural()` writes "Kuhli loachs".

## Lane MW: Minutes a Week (2026-10-21, branch `mw`, worktree `.claude/worktrees/mw`; Nathan approved the proposal in chat)
- Full write-up with the numbers and sources: `research/minutes-a-week.md` (Result section); agent batches `research/sourcing/minutes/` (not in the globbed folder: they use `items`, not `species`).
- Water changes now follow the nitrogen budget (floor 10 % cited, cap 50 %); new rows for feeding trips, glass wiping, painted live patches; plant trimming in bunches; testing every ~2 weeks; hose and automatic feeder as "Quality of life" tech rows that the least-work build adds. Builds now differ: least work is 4-22 min below cheapest, for $100-370 more. Every minutes-per-job figure is a labelled assumption; intervals and prices are cited.
- Tests re-blessed (see the research file); `starter.ts` `litresFor` is a function (one-line hook, import cycle with stocking.ts).
- Not done: filter-clean bioload scaling; a per-row minutes line for the hose / feeder in the Tech menu (the saving shows in "If picked" and in the water-change / feeding rows).

## Lane HC: swimmer height curve in the water limit (2026-10-21, branch `heightcurve`; DONE)
- **Bottom dwellers and height (Nathan 2026-10-22):** bottom-zone animals are credited the height curve at `BOTTOM_REF_CM` 35 cm of water whatever the tank's depth (10 kuhli in 30 x 12 in read 146 % at 6 in and 54 % at 50 in; now 76 % at every height). 35 is the one depth where every calibration test passes; research/habitat-model.md, last section.
- **Model (Nathan 2026-10-21, per species):** the water limit counts floor area linearly and height with diminishing returns. Each animal's water load x H / (Hs (1 - exp(-H / Hs))), H = mean water depth (litres / floor area, so bowls, swamp pools and other shapes work); Hs = 8 x body depth (card height), min 12 in, x 0.7 low class (danio, white cloud, rasbora, barbs, SAE, top-zone fish) or x 1.5 high class (aspect >= 0.9, gouramis, oscar, big cichlids); "all" zone half curve half raw; bottom dwellers use the curve too (floor limit unchanged). `SPACE_PER_L` x1.564 (median of the 37 lists still 74.2 %). Starters budget with the same depth (`litresPerAnimal(sp, depthCm)`).
- **Results:** 37 lists over 100 %: 11 -> 12, sdlog 0.463 -> 0.474 (classes are Nathan's call, experts do not separate them); Nathan's tank water 158 / 133 / 122 / 117 % at 12 / 18 / 24 / 30 in; oscar 48x18 water 48 / 33 / 25 %. Details and tuning table: `research/height-curve.md`. Provenance: assumption row in provenance.ts.
- **Tests re-blessed:** spaceaudit C / D / shape-blind (height now counts with diminishing returns), stocking mbuna 10 gal (> 150, was > 200), stockplan oscar (5 oscars fit the same catalogue size as 1, at a higher Space), density (starter load read at the tank's depth; paludarium excluded from the monotone check).
- **Oscar follow-up (2026-10-22):** research in `research/habitat/oscar.md` (2 passes, Claude in Chrome reached Hepper, Aquarium Co-Op, Practical Fishkeeping, Fishkeeping World; OATA not). Oscar height class set back to 1 (no source for 1.5; barely moves the numbers, its Hs is already large from body depth). The 2+ oscars warning already exists (max 1, `overWarn`); the group line now carries the sourced pair / trio sizes. Open finding: Space for oscars is far looser than the hobby rules (1 oscar reads 100 % at about 22-33 gal, hobby 55-75 gal; +20-30 gal per extra oscar vs about 20 gal in ours), and the planner's tank for 1 to 5 oscars is the same 169 gal (the tank minimum covers one oscar, nothing scales it with count); filtration is what binds (5 oscars 264 % in 72x18x21). Decision pending with Nathan: tie count to the tank minimum or fit the oscar SPACE_FACTOR.
- **Follow-ups:** paludarium seed 1 starter swaps 26-ember lead school for none at stop 3; 5 oscars at 73 % of 170 gal reads loose, review the oscar class if Nathan agrees.

## Lane HB: Habitat Model (2026-10-21, branch `hb`, worktree `.claude/worktrees/hb`, port 5897; DONE)
- **Research (step A):** `research/habitat-model.md` (reading notes with every url in `research/habitat/*.md`; 3 Sonnet agents, ~0.25 M tokens).
  No regulator states a floor area per bottom dweller; hobby / species sources scale with LENGTH: 12-24 sq in of floor per inch of fish
  (Scotcat "six to eight inches of fish to every square foot of base area"; Seriously Fish group footprints: bronze cory ~20, kuhli ~12,
  clown loach 10-17). No sourced run-length coefficient (run stays the tank minimum's sourced length), no sourced activity multiplier
  (activity stays in Filtration), no data on height. **Nathan approved the 7-row table 2026-10-21** ("approved, go ahead with step B").
- **Engine (step B):** `stockingOf` Space = the larger of WATER (the AqAdvisor-fitted per-litre number, unchanged; median ours / AqAdvisor
  1.03 before and after) and FLOOR (floor the bottom dwellers use / the tank floor). `FLOOR_SQIN_PER_IN` 15 sq in per inch of
  mass-equivalent length (`habitatLengthMm`: the length of a 65 mm bronze cory of the same mass, so eel-shaped kuhlis are not overcounted);
  `FLOOR_SHARE` bottom 1, "all"-zone 0.5 (est), midwater / top 0; invertebrates and land animals 0. New result fields: `waterPercent`,
  `floorPercent`, `spaceBy`, `floor {areaCm2, usedCm2}`, Contributor `floor`. The 5 `it.todo` in test/spaceaudit.test.ts are plain tests;
  research/space-audit.md regenerated. Provenance: FLOOR_SQIN_PER_IN fitted, FLOOR_REF derived, FLOOR_SHARE assumption (replaces FLOOR_K);
  sources `habitat-model`, `scotcat-floor`; ratchet green.
- **One evaluation (step C):** tankfit has no limit math left: `fitOf` reads `stockingOf` (space incl. floor, filtration) and `tankMinimum`
  (red lines, plus the new `lengthShort` (strict red-line length) and `tooDeep` / `maxDepthMm` / `depthMm` (GroupCare maxDepthMm, ADF advisory
  excluded)). FLOOR_K / floorNeedCm2 gone; `needsOf().floorCm2` now comes from `floorUseCm2`. plan.ts hard truths read `tooDeep`.
  Starters keep a floor budget beside the litre budget (`floorPerAnimal`), and trim semi-aquatic groups (paludarium toads / newts) to it.
  stepUps skips a bigger tank whose Space does not fall (more water on the same floor). `zoneOf` / `careOf` / `recommendedMin` moved to
  `src/scene/zone.ts` (tankfit re-exports; tankMin imports from zone.ts: one-line hook in tankMin, not its data).
- **Tile (step D, Nathan 2026-10-21: "split Space into water column bar and floor bar"):** the Fullness tile shows **Water column** and
  **Floor** bars in place of Space (Floor lists the bottom dwellers; "No bottom dwellers: the floor is free"); the pill still takes the larger.
  Reason text asks for sq in of floor when the floor binds. The plan sheet shows the same two bars; its verdict reads "Space: water column X %,
  floor Y %". Picture: research/habitat/tile-split.png (options shown to Nathan: tile-options.png).
- **Tile bar scale (Nathan 2026-10-26, branch `ftg`):** the load bars (water column, floor, filtration) show the whole scale, green to the
  ideal (IDEAL_MAX, 75 %), green -> amber to half way to the limit (87.5 %), amber -> red at 100 % and red past it, with a line where this
  tank is; the reached part is full strength, the part ahead faint. Past 100 % the scale runs to the tank's percent (`--scale = max(100,
  --pct)`), so the zones shrink to make room and the line sits at the end (Nathan: "the green bar would be pushed smaller"). style.css
  `.ftLoad`; `--ideal` is set on the tile from IDEAL_MAX, `--pct` on each track. (Nathan first asked for a line at the ideal and a plain
  gradient fill, then changed his mind the same day.) The minimum bar keeps one colour per level (its yellow line is Recommended, not
  75 %); the plan sheet's bars are its own and are untouched. Stocking screen (Nathan, same day: "yes"): its Space bars (`.spBar.gauge`)
  share the gauge, `ui/gauge.ts` + style.css `.gauge`; `spaceBand` still drives the past-ideal label and the near / over class; its
  tank-size bar (the animals' minimum against the tank) stays flat, like the tile's minimum bar. Pill and labels (Nathan, same day:
  "since this is just over ideal, it should still be pretty much green"): the collapsed tile's pill, the stocking screen's past-ideal label
  and the plan sheet's bars take the gauge's colour at the percent (`gaugeColor` / `gaugeText` in ui/gauge.ts; the plan sheet's bars are
  gauges now); the band words (`spaceBand`) are unchanged.
- **Moved numbers (deliberate; full list research/habitat/moved-numbers.txt, vs main 1740665):** 35 of 1944 starter scenes (kuhli-heavy
  ones lose 2-4 kuhlis, others gain swimmers; paludariums in 2.5-5 gal drop to 1 toad / 1 newt). 16 tankFor picks: 12 kuhli (2x group) 20 high -> 30 breeder,
  13 kuhlis in a 20 long now fail on Space (~123 %, Nathan approved; the tank minimum still passes, test in minimum.test.ts); 4 adf 10 -> 15 gal;
  and a FIX: rummynose, hatchet, tiger barb, bronze cory, sae, firefish, watchman 30 breeder -> 20 long, discus 125 -> 75, coral beauty
  125 -> 60 breeder: their red-line length is derived from that very tank (765 mm) and the old tankfit check failed it by 0.3 mm (T.L 764.7);
  the engine compares the rounded floor run. No pinned example-demand number moved (suite unchanged apart from the tests named here).
- **Gaps:** (1) 15 sq in / inch and FLOOR_SHARE 0.5 are calibrated / estimated, not stated per species; no Seriously Fish otocinclus or bristlenose
  floor figure was found. (2) Run length is not part of Space (nothing sourced); Hemdal's (L+W)/length ratios are in research/habitat/run.md if
  wanted later. (3) The stocking screen's tank list ("Space" column) and plan.ts still show one Space number (the larger); only the tile and
  the plan sheet split it. (4) Floor area is the tank's whole footprint: hardscape covering the floor and land in a paludarium are not
  subtracted. (5) BMEL 1998 / Swiss TSchV / Austrian THVO primary texts were not readable by the agents.

## Lane NB: Nitrogen Balance (2026-10-21, branch `nb`, worktree `.claude/worktrees/nb`, port 5871)
- **Ledger verified** (test/nitrogen.test.ts "nitrogen ledger and water-change states"): per day, the animals' N = plants (ammonium `byPlants` + nitrate `nitrateByPlants`) + what the water change removes + unprocessed, to 1e-9; 4 ppm NO3 a week -> 10 %; plants removed -> every gram ends as nitrate (the plant-free figure). The "2 % a week" is real arithmetic, not a units bug.
- **The review's tank, pinned** (S183 / S185: 20 gal long 30 x 12 x 12 in, 13 tiger barbs, 77 F, small internal filter, 31 root feeders; the review's other plants are unknown, 13 stems reconstruct its 22-25 mg N plant capacity): 70.8 L, 27 mg N a day (review 25), nitrate-only change 2.6 % a week (the schedule uses the 10 % floor), filter load 16 % with plants vs 39 % without (review 14 vs 34; our TAN is ~10 % higher).
- **Engine** (src/scene/nitrogen.ts): `waterChangeState(rise, tapMgN)` gives Decision 2's states: routine (one change <= 50 %), high (over 50 %: the uncapped figure, two changes of half each, linear steady-state), failure (tap nitrate at or above the 40 ppm target, `why: 'tap'`, or more than two 50 % changes, `why: 'too-much'`). `Nitrogen` gains `waterChange`, `nitrateByPlants`, `plantFreeAmmoniaPercent`; `waterChangePct` is now the nitrate-only figure with the tap's nitrate (100 in a failure). Source water: new `WaterSettings.tapNitrate` (ppm as NO3, default absent = 0), a "Tap nitrate" field in the sidebar's "Waste, filter and plants" (index.html, one line); formula c = rise / (40 ppm - tap).
- **Wording** (src/ui/fullnessTile.ts `nitrogenRows`, `waterChangeText`; src/ui/panels.ts `syncNitrogen`): "Nitrate-only water change" beside "the routine 10 % a week still applies"; every figure says mg N, "as ammonia (TAN)"; a "Filter load without plants" row; "cycle a new filter first" note; the fertilizer line softened ("likely", "may be enough", pale older leaves); the Filtration bar's tooltip claims only ammonia processing.
- **Filter gate** (Nathan 2026-10-21, relayed by the "Filtration bar display logic" chat, brief prompts/brief-filter-gate.md in Glass-Box-stocking): `filterState(S)` / `setFilterless(S, on)` and `TechSetup.filterless` in src/scene/tech.ts. 'unset' (inferred gear, or none without the box): no Filtration bar, no ammonia fold, pill and reason from space alone (`spaceReason`), the warning "This tank needs a filter" with the box "No filter: I am keeping this tank filterless (Walstad style)"; the sidebar verdict says the same. Ticking = one undo step writing filter none, filters [], filterless, the other rows still inferred; the bar comes back on surface bacteria only ("Surface bacteria" row). Tests in test/fullnessTile.test.ts "filter gate". CSS `.ftNoFilt` in style.css (one line).
- Files touched: nitrogen.ts, nitrogen.test.ts, fullnessTile.ts (+ test), panels.ts (syncNitrogen + the tap field handler), tech.ts (filterState block + the field), types.ts (one field), stocking.ts (memo key, one line), provenance.ts (two FORMULAS rows), index.html and style.css (one line each). All free now.
- **Gaps:** the minutes-a-week schedule still caps at 50 % (`waterChangeFraction`): a high-maintenance tank's second change and its time are not counted; the steady-state split is linear (two 30 % changes hold a little less than one 60 %); plant-uptake uncertainty range not shown; the mobile drawer layout untouched.
- **Filter gate follow-ups (Nathan 2026-10-21, branch `fg`):** adding a filter clears `filterless` (`withUnits`), so removing it again shows "This tank needs a filter". A tank started from path 1 ("An animal I want", `TankSetup.stockFirst`, set by ui/stockPlan.ts) draws no filter until the owner adds one (render/gear3d.ts `gearPicks`); every other tank still draws the inferred gear (`DRAW_INFERRED`, Nathan's choice A; he asked for path 1 "at least"). Fixed on the way: `filterless` and `feeding` were dropped on reload (parseTech / validate.ts); `stockFirst` is kept too. Tests: test/fullnessTile.test.ts "filter gate follow-ups".

## Gaps ledger (2026-10-20, coordinator 5: gaps the chats reported; start continuation chats from here)
- P1 group data: 63 of 84 species rows are estimates, 5 reef rows unverified (firefish, coralbeauty, watchman, mandarin, cleanershrimp): partly covered by the source fleet (SB).
- P2b: the cost span is only about $10 wide (only the filter differs between builds); widening needs an invented light tier (Nathan to decide).
- P3: the dashed space outline shows in PNG exports / thumbnails. P4: no artificial floaters or vines.
- P5: bare tank still draws the default filter / heater; appeal tags coarse; search has no 3D thumbnail. P6b: floaters dropped in artificial / mixed; artificial thinning constant (1 per 120 cm2) is a judgement. => chat PX: Path 1 Polish (prompts/chat-path1-polish.md).
- P2b / P6a / P6b: fresh water has almost no minutes-a-week lever; the stocking span uses a median tank price while builds use the editor's (a few $); bundle build about $4 under the editor panel. => chat MW: Minutes a Week (prompts/chat-minutes-a-week.md; proposal first).
- SE2: waste constant good to about 2x, plant classes extrapolated, filtration research built in part by S164 (branch nitrogen-ferts, awaiting Nathan's push yes).
- LC light catalogue: PAR for a 12 W bar looks high; light price not in cost totals; submersible lit from the surface and can overlap a centred filter intake. => chat LF: Lights Follow-ups (prompts/chat-lights-followups.md).
- SB / ST: about 90 source disagreements wait for Nathan (research/sourcing/decisions.md); 305 inline engine numbers need a by-hand look. => chat SQ: Source Decisions (prompts/chat-source-decisions.md).
- TV tank sizes: Walmart Marineland Portrait 5 deal removed 2026-10-20 (listing not available online); Amazon Aqueon SmartClean 20 size still a guess (listing gives a box size). SF sponge filter: Nathan to decide whether the fullness tile starts open on desktop (wait for S164 to land: both edit fullnessTile.ts).

## CW: Count warnings re-evaluated (2026-10-22, branch `cw`, worktree `.claude/worktrees/cw`)
- **Nathan 2026-10-22: "we need to reevaluate every one of those warnings".** Table + picture: research/count-warnings.md, count-warnings-screen.png. Nathan agreed the fighting rows stay as a shorthand ("surely a tank large enough could house more ... keeping this as a shorthand is still valid for this tool"); no objection to the rest.
- **Rule: `GroupCare.max` is a FIGHTING limit only** (one to a tank, one pair, a few herps, or with a sourced `territory` rule). Room is never a max: the stocking percent measures it. 74 -> 27 species keep a max. `fightsOverCount` = territory || solo || any max. test/groups.test.ts fails on a max over 4 without a territory rule.
- Removed (47): all schools, tiger barb, livebearers (male harassment stays on the sex-ratio line), goldfish / comet / discus / honey gourami, inverts (grazer check still limits turbo / nerite / oto by food), Malawi synodontis, mbuna and peacocks, cockatoo, pearl gourami, bristlenose, angel, White's tree frog, fire-bellied toad, newt.
- Code: `overWarn` (stocking screen) now warns only for fighters, wording "More than N X in one tank may fight"; `notesOf` reads "(the most before they fight: N)". Herp rules (data/herpstock.ts): `max` optional, dropped for White's tree frog, fire-bellied toad, newt and ADF (floor per animal covers room). Stocking screen and editor now agree: dart frog 3, axolotl 3 (were 5 / 4 in GROUPS; dart frog bands great 4 -> 3, its text from the herp rule). Platy's "Groups of 7+ may fight" (no source) -> "Great; keep more females than males".
- Banggai (Coordinator 8 review): now a sourced fighter, `territory` [[10, 2], [50, Infinity]] = one pair below 50 gal, a group above with no limit (Saltwater Aquarium Blog: a shoal in a small tank "leading to aggression and fatalities"; Top Shelf: 50 gal+ "prevents territorial conflicts"; quotes in research/territory-caps.md). Its bands are now 2 / 2 / 2 (a pair is best; Coordinator 8: the group line praised 5 while the warning said more than 2 fight). Angelfish stays without a count (no page gives one).
- **Dwarf gourami males DONE (Nathan 2026-10-22: "require like 15 gallons for each additional male"):** `GroupCare.males` {at 10 gal, each 15} -> `mostMalesFor` = 1 male from 10 gal, +1 per 15 gal (25 gal 2, 40 gal 3); females never count. A warning beside the S196 total rule, never in the percent. Stocking screen (dwarf gourami is not sexed there): "if more than M of these N are males, expect fighting"; editor / Fullness tile count each fish's sex (absent = male). CARE.dwarfgourami is no longer `solo` and has no flat max (the editor's "keeps one per tank" contradicted S196 already). Provenance `*.males.*`: assumption, Co-Op / SF say one male only, the 15 gal step is Nathan's. Picture research/dwarfgourami-males-warning.png.
- **Kribensis by LENGTH (2026-10-23, Nathan: option C in the S196 chat; Coordinator 9 found 10 kribs in a 75 gal passed):** one pair per 24 in of tank length, never below a pair (Seriously Fish: a 24 in tank "is suitable for a single pair"; the 24 in step is our reading, basis interpretation). `GroupCare.territory.basis: 'length'` (at / each in inches); `mostFor(g, litres, lengthMm)` reads inside length + 1 in (nominal tank sizes). Length passed by crowdWarnings (S.tank.L), overWarn / maxOf (stock plan `shownLengthMm`) and starter `fightMax`; without a length the flat max 2 stands. 29 / 55 / 75 / 125 gal = 2 / 4 / 4 / 6 kribs (test/territory.test.ts, also on the real tank models).
- Kept unchanged: too-few lines (minimum group), the sex-ratio line, grazer "feed X, or keep N" (food, R5), the floor percent, animalfit "keeps one per tank".
- Loose end: dart frog / axolotl max now come from the herp research but their provenance tag is still the GROUP_FIELDS groups-research rule.

## S196: Expert stocking validation (2026-10-21, branch `s196`, worktree `.claude/worktrees/s196`)
- **Published lists:** 37 lists (Aquarium Co-Op 20, Fishkeeping World 7, Aquarium Source 3, Gensou 3, Saltwater Aquarium Blog 2, BRS 1, Aqueon 1; 5-55 gal, no 75/125) in `research/expert-stockings.json`. `GEN_EXPERT=1 npx vitest run test/expert.test.ts` writes `research/expert-stockings.md` (table + findings; hand-written findings survive a rerun).
- **Nathan's decisions 2026-10-21: trust the published experts over AqAdvisor; space has diminishing returns per fish.** Found: each SPACE_FACTOR row was fitted at ONE count (mostly 20 fish in 55 gal) and applied linearly.
- **Engine (on top of lane HB):** WATER space per species: above SCHOOL_REF 10 fish a group of n counts 10 x (n/10)^SCHOOL_EXP 0.85; up to 10, every fish counts in full. Floor and filtration stay linear. Animals under 2 g count x TINY_EXPERT 0.8. Provenance and the sources.json entry `expert-stockings` are added.
  - Grid on the pre-HB base: the only setting that lowered both scatters (experts sdlog 0.40 -> 0.37, AqAdvisor-24 0.34 -> 0.23).
  - Rejected: class factors instead of AqAdvisor rows for nano fish (sdlog 0.47).
  - Rejected: the uncapped curve (1 fish = 1.41x). Only AqAdvisor reads lone fish higher; it put 1 goldfish in 20 gal at 111 % and a clown pair at 100 % against the experts' rules. Coordinator 7's concern, 2026-10-21.
- **Moved numbers on the HB base (published max, before -> after):**
  - Median 81 -> 74 %, over 100 %: 13 -> 11.
  - Nano schools fall: 6 neon in 5 gal 114 -> 91, cardinals in 10 gal 120 -> 96, 20 neon in 20 gal 134 -> 105, 15 danio in 20 gal 145 -> 121, Gensou small tetras 88 -> 61.
  - Singles and pairs are unchanged: 1 goldfish in 20 gal 79, clown pair 75, angel pair 63, flowerhorn 111, Aqueon 4 goldfish in 29 gal 223.
  - Re-blessed: test/tankfit.test.ts `danios` case is now 10 danios + 1 bristlenose (was 8). 8 + a pleco now fit 15 gal, in line with the experts (5 danios in 10 gal, 6 in 60 L).
  - Not from S196: on main the water readings rose about 1.4x since the S196 snapshot (goldfish space per fish x1.38). The Co-Op 10 gal betta set reads 238 % on main, 194 % after S196.
- **Expert curve:** 73 count-vs-size points (`research/expert-curve.json` / `.md` / `.svg`). Within one source, count grows as gallons^0.79 (recommended 0.89, maximum 0.73), which confirms 0.85. Calibrating "full = 90 %" was NOT done: the experts' own full / max stockings read a 59 % median (pre-HB) against 101-126 % for their nano lists. The low maximums are temperament caps (dwarf gourami, angel, chromis, barbs).
- **Fullness review fixes DONE 2026-10-22 (branch shrimp-floor; Nathan: "lets do this", "fix it on that branch", "do the other five").**
  - Shrimp and crabs take floor: the fish floor rule x INVERT_FLOOR 0.3 (10 cherries per gallon fill the floor; est). Snails keep their footprint rule.
  - Tank list sizes females at the female length (AnimalCount.f): 1 male + 4 female mollies in a 20 gal high 90 -> 104 %, now matching the tile.
  - Over is the rounded percent (`isOver`) in the tile, the stocking line and the tank list; near-full advice names the binding limit (no "water changes" when space binds).
  - White cloud floor 0 via FLOOR_FACTOR (zone stays all: zone also sets the height curve, and all -> middle raised 6 white clouds in 10 gal from 39 to 57 % water). Zone audit (Nathan: floor only, so the AqAdvisor fits stay put): FLOOR_FACTOR 0 for cpd, pygmycory, peapuffer, comet, yellowtang, bluetang (swim above the floor); 0.5 for demasoni, labeo, auratus, afra, coralbeauty, royalgramma (rock dwellers, counted like all-zone). Single-species readings unchanged (water binds). Kept: oscar, goldfish, oto, yellowlab, firenewt, shrimp, snails. Open: zones still double as height classes; a true zone fix needs a space-factor refit; firetoad (bottom) belongs to the herp model.
  - Tile: tank size line at the top; Tank minimum in words (Too small / Meets minimum / Meets recommended), percent in the tip.
- **Fighting limits DONE 2026-10-22 (Nathan: warn, scaled with the tank; option 1; never in the percent).**
  - Research: 2 Sonnet runs (~247k tokens), 29 species, `research/territory-batch1.json` / `territory-batch2.json`, tables in `research/territory-caps.md`.
  - Data: `GroupCare.territory` {at [gal, animals] steps, each gal per extra, per, note} for 6 species with a stated fighting rule: dwarf gourami 10 gal 3, +5 (note: 2 females per male); Bolivian ram 30 gal 1, +7.5; kribensis 20 gal a pair, +1 pair per 12.5 gal (one retailer page); pea puffer 5 gal 1, +3; royal gramma 1 / 2 at 50 / 3 at 100; coral beauty 1 / 2 at 180.
  - Code: `mostFor(g, litres)` in data/groups.ts replaces `max` when the tank size is known. Never below the species' bands.ok / group (Coordinator 8 review 2026-10-22: a ram pair read "keep one"). Wired into the stocking screen (`overWarn(p, litres)`), the Fullness tile (`.ftCrowd` lines) and the sidebar stocking reasons, via `crowdWarnings(S)` in scene/territory.ts. Provenance rule `*.territory.**`, source `territory-research`.
  - Left out as ROOM rules, not fighting (the stocking percent covers room): tiger barb "20 gal for 5, +3 gal each" (its 8+ band would always warn in a 20) and swordtail "15 gal, +5 gal per fish" (1 male : 3 females would warn under 40 gal).
  - Nathan 2026-10-22: "why do we have limits on schooling fish that number in the thousands in the wild?" Schools have no count limit; room is the stocking percent's job. `fightsOverCount(g)` (groups.ts) = a territory rule, one to a tank, or max <= 2. Only those species get the sidebar / Fullness warning and the starter cap (`fightMax` in starter.ts). Tiger barbs and danios are out: their temper is about nipping tankmates, not fighting each other. Mbuna and angels are out (no sourced count rule). Test: no starter tank shows a fighting warning.
  - DONE in lane CW (below): the stocking screen's over-max note for schools is gone.
  - Dropped: the agent's "labeo" sources were about the red-tailed shark, not our blue-nosed mbuna. Danio (paraphrased) and peacock / mbuna (no increment stated) keep the flat max. One-per-tank reef fish keep max 1 / 2.
  - Example: 43 dwarf gouramis in 72x18x21 in reads Stocking 66 % plus "more than about 24 in a tank this size may fight".
  - Phase 2 (agreed, not started): shared territory across species (for example a ram and a krib on one floor).

## Source traceability (2026-10-20, side chat in the `stocking` worktree; Nathan: the defence against "AI slop")
Goal: every advice number traces to a source, a fit, a stated derivation or a labelled assumption; never "made up".
- `src/data/sources.json` = source registry (id, title, by, url, accessed, kind: primary / reference / consensus / tool / retailer / internal). Never register a page nobody opened.
- `src/data/provenance.ts` (audit only, not in the bundle) = RULES per data target and path (status cited / fitted / derived / researched / claimed / assumption, src ids, why; `rowUrl` = cited by the row's own listing url unless `est`), FORMULAS for engine constants by file + symbol, EXCLUDED (render / UI constants), TABLES (engine tables audited as data).
- `scripts/source-audit.ts` walks the RUNTIME values (CARE after its merges, AIR after AIRDATA, ...); `test/sources.test.ts` checks every src id / symbol exists and RATCHETS: unsourced values and unsourced engine constants may not rise above `research/source-baseline.json`. **A new advice number or top-level engine constant needs a rule or the test fails.** Lower the baseline after sourcing: `GEN_SOURCES=1 npx vitest run test/sources.test.ts` (also rewrites `research/source-coverage.md`, the ranked work lists).
- One-line hook in another lane's file: `src/data/climate.ts` `AIR` is now exported (the audit reads it).
- 2026-10-20 on main: P1 group data (research/groups-sources.md, one url per species) wired in: 20 species researched, 59 `(est)` judgement rows claimed, 5 reef rows UNVERIFIED (P1 agent used placeholder urls: firefish, coralbeauty, watchman, mandarin, cleanershrimp) stay unsourced. Main count: 4994 values, 1302 unsourced.
- First count (2026-10-20): 4525 data values: cited 1707 (38 %, nearly all product / price rows with their listing url), fitted 59, derived 5, researched 570, claimed 433, assumption 419, **unsourced 1332 (29 %)**. Engine: 81 top-level constants documented, 0 unsourced; 305 numbers written inline in engine functions still need a by-hand look.
- Biggest unsourced, user-facing: CARE care level / minL / temperament (84 each), group, predation, marine pH; adult length `tl` (108); 5 land animals' air climate (anoles, leopard gecko, ball python: first guesses, no research row); neon / 3 others' water temperature; tech.json minutes / watts / risk; demand-defaults and factors (rule-of-thumb costs).
- Found while auditing: the nitrogen engine's research notes were not in the repo (SE2 committed them as research/filtration/, efb6e18; its constants are now "researched", plant classes and foam rate still extrapolated); LU_PER_L is calibrated to keep the starters' old counts, which came from a rule of thumb (circular); the BRS coral PAR page and the 0.17 USD/kWh statistic were never recorded. The light engine is the best sourced (reference/par-calibration-data.md, graded datasets).
- **Open fixes (do these alongside the backfill):**
  1. `LU_PER_L` (scene/stocking.ts) is circular: it was calibrated to keep the starters' old counts, which came from a rule of thumb. Check it against an outside reference: the nitrogen budget (scene/nitrogen.ts, research/filtration/, now sourced) and AqAdvisor's filtration figure. Then re-fit it, or record the outside check in its FORMULAS entry and change the status from circular "fitted" to fitted against that reference.
  2. BRS coral PAR page: find the Bulk Reef Supply page that states soft 50-150 / LPS 75-150 / SPS 150-400, put its url in sources.json `brs-par`, and move REEF_TIERS 1-3 from claimed to cited. If no page states those numbers, say so and keep them claimed.
  3. 0.17 USD/kWh (factors.json kwhUsd, tech.ts KWH_USD): find the statistic (likely US EIA average residential price), record the url, value and month in sources.json, update the number if it has moved, and mark it cited.
  4. Other unrecorded "standard" values: DENSITY (weight.ts), NWATER and optics (lightout.ts), lamp tables, SUB_ALBEDO, MET_CLASS, SALT_LOAD, NITRATE_TARGET_N. Each needs one opened page or a stated reason.
- **Pilot DONE 2026-10-20 (pilot-01, 10 species):** per-value sourcing in research/sourcing/ (brief-care-tl.md = agent brief; <batch>.json = url + verbatim quote per value; `node scripts/verify-quotes.mjs <batch>.json` re-fetches every page and checks the quote, writes <batch>.verify.json). provenance.ts turns agreeing, quote-checked fields into cited rules (source id = page host, registered in sources.json). 100.7 k Sonnet tokens for 10 species; 92 / 95 quotes found on the live pages, 0 invented. Unsourced on main 1302 -> 1264. Disagreements wait in research/sourcing/decisions.md; **fleet plan (14 agents, ~1.6 M Sonnet tokens) in research/sourcing/fleet-plan.md, waiting on Nathan's yes.**
- **Fleet DONE 2026-10-20 (Nathan's yes; 14 Sonnet agents, 1.28 M tokens + pilot 0.10 M; estimate was 1.6 M):** every species in CARE / species.json (A1-A9: length, care, min tank, temperament, group, pH, the land animals' air climate), gear watts and pack life (other/C.json), cost bands refit to the cited listings (other/D-cost-defaults.md, scripts/fit-cost-defaults.mjs), open fixes 1-4 (other/E1-E3). On main's data: unsourced 1280 -> 715 (14 %); cited 1949 -> 2301, assumption 421 -> 728 (gear minutes / hours, cost bands, MET_CLASS, SALT_LOAD, SUB_ALBEDO now say why), claimed 765 -> 679. Quote check: label-only quotes ("Care Level" with the value in another cell) no longer count. Open fixes: BRS page found (soft 75-150, SPS 200-350: ours wider, LPS cited); kWh cited (EIA 18.31 c July 2026); marine pH cited (Holmes-Farley); DENSITY / NWATER / NITRATE_TARGET_N cited; LU_PER_L bracketed 0.22 (AqAdvisor) to 1.7 (nitrogen budget), kept. **About 90 disagreements wait for Nathan in research/sourcing/decisions.md** (biggest: oscar 540 L, many care levels one step too hard, crested gecko 127 L, ball python RH 60-80, tank $/gal per class). Rerun after edits: `node scripts/verify-quotes.mjs <batch>.json`, `node scripts/sourcing-decisions.mjs`, `GEN_SOURCES=1 npx vitest run test/sources.test.ts`.
- **Decisions DONE 2026-10-20 (chat S168, Nathan's yes per group G1-G11; SQ did batches 1-2 first, Coordinator 5 settled the overlap: oto / hillstream care 2 kept, ADF 2, comet 300, mystery 40):** record in research/sourcing/decisions.md. Adopted values are cited from the batch file (`verdict: agrees`, `use` = source indices it cites); `derived` and `kept` are new verdicts the loader in provenance.ts turns into derived / assumption rules with the batch's `decision` text, so a kept value is labelled where its pages are. Unsourced 648 -> 575 on main's data. Follow-on fixes: the planted example's nerites are Malaysian trumpets (nerite pH 7-8.5 cited, neons 5-7 share no pH); scene/plan.ts: a kit row serves its parts' needs and a kit heater no longer reads as a missing heater; scene/starter.ts budgets every fish of a sexed species at its own sex's size (guppy females 50 mm took the swamp Full stop to 100.1 %; a mean undercounted lone kribensis males). Example risk locks re-blessed once.
- **R1-R5 DONE 2026-10-21 (Nathan's yes; 5 Sonnet agents, 478 k tokens: R1 105 k, R2 76 k, R3 91 k, R4 104 k, R5 103 k):** research/sourcing/R1-R4.json (+ R*-input.txt), R5-grazers.json. R1's 9 decisions applied (dart frog / crested harlequin / leopard gecko temper 1; axolotl care kept 2; night lows 18 C anoles, 16 C leopard gecko, its rhTol 20-80, derived). R2: no page states a female size for 12 of 14 species (kept, labelled). R3: SF minimum tanks agree; chili / danio cite Fishkeeping World only (SF says 41 / 81 L). R4: reef pages give gallons not tank length (minLengthMm kept). provenance.ts: host() keeps 3 labels for co.uk-style hosts; range / group fields (temp, tol, bands) are cited by their parts. Unsourced 648 -> 491 (9 %).
- **Grazer check + label DONE 2026-10-21 (Nathan's yes):** src/data/grazers.ts `GRAZE` = the most generous stated density (turbo 3 per 20 gal, nerite 1 per 5 gal, oto 6 in a 20 gal, amano 1 per 2 gal; R5 quotes), `grazerShort` = "feed X, or keep N" past it; feeding never raises the limit (no page says by how much); bristlenose / SAE (no density) and trumpets (detritus eaters) left out. Shown in the cost panel's warnings (one group-warning's points) and on the stock plan's pick rows. The cost panel's Risk bar is now "Relative difficulty" (safe reads easy; tech chips "Harder +"); the engine still calls it risk.
- **Basis (2026-10-21, UF request, research/rules-spec.md section 2):** every RULES / FORMULAS entry now carries `basis` (measured / source-stated / interpretation = TankLook interpretation / derived / conservative-default) beside `status`, and `says` = what the source itself states (batch rules fill it from the quote or the combined `states`). test/sources.test.ts fails on a missing basis, or on a measured / source-stated / conservative value backed by an outside source without `says`. So a page saying "keep in groups" can never read as support for our "5 or more": the threshold is basis interpretation. Report: a basis table in research/source-coverage.md (all data: source-stated 46 %, mostly product rows; interpretation 40 %; CARE 842 of 1277 are interpretation). The registry (sources.json) stays per page / site; basis and says live on the tag, since one page backs many values in different ways.
- **NEXT (Nathan 2026-10-21): combine the sources, a fresh chat, prompt prompts/lane-source-combine.md.** Instead of one page per value: weight the opened pages (sources.json kind: primary / reference 1, care sheet 0.7, retailer 0.5; generic pages half; one site once), keep each page in its own unit (gallons -> litres, a base -> tank length and floor area) feeding tankMin's measures, weighted median / vote, and split floor vs comfort tiers (tankMin TIERS) where pages are 1.5x apart. A script, no new research; Nathan approves one table of changes (research/sourcing/combined.md). It also settles the 7 open disagreements. After it: the "Sources & methods" page and a "why?" link per recommendation.
- **Combined sources DONE 2026-10-21 (lane CB; Nathan approved the table: "apply all except the 11", gallon-derived red lines kept).**
  `node scripts/source-combine.mjs` = the weights table (top of the file: primary / reference 1, care sheets (`consensus`) 0.7, retailer
  0.5, generic page x 0.5, TIER_SPLIT 1.5, SAME 6 %), claims parsed per unit from the A / R / pilot / M batches (only exact / compact quotes;
  SL, SVL and leg spans are not total length), weighted median / vote, floor and comfort tiers placed by each site's litres; writes
  research/sourcing/combined.md (what the combination would still change: now only the 14 kept rows) and combine/proposal.json.
  `node scripts/source-combine-apply.mjs` applies the FROZEN approved proposal (combine/approved-2026-10-21.json / .md) into care.ts,
  waterchem.ts, groups.ts, climate.ts, species.json and combine/tankmin-overlay.json (read by scripts/tank-min-data.mjs), and writes
  research/sourcing/combined.json, a batch with verdict `combined` (provenance.ts: 2+ sites derived, one site researched) or `kept`.
  139 values moved (list, kept rows and the two corrections: decisions.md "Combined sources": 12 earlier ADOPTED values restored, tank sizes keep the MX rule); all 7 open R3 / R4 disagreements settled. Unsourced 490 -> 479,
  derived 43 -> 220. 7 opened tank-minimum sites registered in sources.json (they had no kind). Re-blessed: anchor baseline, body volumes,
  example demand locks (gearFilters, tech, demand GOLD: reef upkeep +$16 a month, bigger fish), scale anchors (neon 38, chili 35 mm),
  ball python 1311 mm, regal jumper 18 / 23 mm, neon group 8 (compatgates), 4 goldfish for the nitrate-only wording, tankfit's heater case
  uses a betta (neon now holds 21 C). One-line hook in lane BP's src/art/snakes.ts: snakeStageFor returns the species' own adult when the
  tank is that long (the stage table stops at 1200). scripts/sourcing-decisions.mjs skips fields combined.json settled.
  Open: the browser check was skipped (the preview tool reads the shared checkout's launch.json); a "why?" link can read the
  `combined` lists in tankmin.json and the sources in combined.json.
  Tools: briefs research/sourcing/brief-care-tl.md and brief-items.md; `node scripts/verify-quotes.mjs <batch>.json` re-fetches pages (label-only quotes fail); scripts/fit-cost-defaults.mjs prints the cost refit. Known noise: test/growth and test/reef time out in the full suite under load, pass alone.

## User flow: paths, budget, deals (Nathan 2026-10-20, design chat; not built yet except the New / Open split)
- **New / Open are separate menus** (DONE, `caf2f0a`): New = Start from scratch + On sale / Bundles; Open = Starter tanks / Saved tanks; a link swaps them. First launch opens New.
- **New asks "What do you have so far?"**, worded as the user's situation, never "which type are you". Five paths:
  An animal I want (animal-first) / A look I want (look-first) / A tank I already own (model it, then what-if) /
  Just want to try the hobby (no idea yet: space, time, appeal first) / Sandbox (empty tank, no questions, gates as badges only).
  The answer pins part of the plan; the wizard then asks only what is still missing. Pins, not a mode; a chip shows what is pinned and reopens the wizard. Clicks count as answers (deal opened, saved tank edited, starter opened); a shared link skips the menu.
- **Budget is a layer in every path, not a path:** guided paths ask the expected set-up cost (the demand panel's one number) and gates quote unlock costs against it; owner what-if prices the change, not the tank; Sandbox: optional in the demand panel.
- **Deals go wherever a purchase decision is made, filtered to fit:** choosing a tank (New menu, the wizard's tank step, the Tank sizes dialog) shows tank / kit / bundle deals; tank picked but a heater / light / filter / skimmer / CO2 still needed shows gear deals that fit THIS plan (size, and the need behind it: heater for the animals' temperature, light for the plants' PAR, skimmer for salt). Building blocks exist: deal match (Tank B), `gearFits` / `gearOffers` in `demand/gearDeals.ts` (demand panel today). Missing: gear deals beside the pickers in the Tech menu, tank deals in the Tank sizes dialog, fit by need not only by size.
- **AI-proof (Nathan 2026-10-20, the product's core purpose):** the tool shows what a chatbot cannot: their exact tank to scale, computed numbers from our own engines (stocking, light map, growth over time, cost with live prices and deals), and how a change plays out. General knowledge (nitrogen cycle, care sheets) gets one line ("read about the nitrogen cycle before buying fish"), never a tutorial.
- **Paths in detail (2026-10-20):** anchor / tool decides / success = animal-first: the animal / a lot / it thrives; look-first: the picture / some / looks like it by month 6 (show the growth timeline, full vs low-tech side by side); owner: the real tank / little / the change does what they hoped; try the hobby: nothing / most / still in it at month 3; Sandbox: quiet.
- **Anchor does not fit (animal-first):** do not guess when the user gives up. The conflict itself is the trigger: the moment space or budget contradicts the animal, one card offers two roads, "Make room for it" (size + cost) or "Keep my space" (animals that fit, ranked by what they like about the original: personality, size, colour, showpiece). Needs per-species appeal tags (data).
- **Try the hobby:** after the basics, the next question is the kind of setup (aquarium, planted, gecko / frog terrarium, ...): each with pros and cons, a 3D example, up-front $, $ a month and minutes a week; they choose, then continue. Then 2-3 proven setups with **wide freedom inside the gates** (look, hardscape, plants at the cost of more work and tech, stocking) and **optimise presets**: pick the variable to minimise (up-front $, upkeep $, minutes a week) subject to "thrives", and the tool fills tank, gear, plants, tech and stocking (e.g. 50 gal planted, cheapest that thrives; 20 gal GloFish, least maintenance: plants, good filter, light stocking). Axes = the demand model's (setupUsd, upkeep, minPerWeek, risk). GloFish are not in species.json yet. **Presets are shown as three finished tanks side by side (cheapest, least work, balanced), not a goal picker** (Nathan agreed 2026-10-20).
- **Owner path depth follows the goal:** numbers only (stocking, compatibility, light, cost) = tank, light, filter, heater, animals and plants (plants change the numbers: light needs, nitrate uptake = fewer water changes; NOT space); accurate visual change = model the scape and substrate too. Ask what they want to know first.
- **Path 1, animal-first, mapped (2026-10-20; steps 1-5 are now one stocking screen with the growing tank, see below):** 1 pick the animal (3D) -> 2 what it needs (card) -> 3 space / time / budget -> 4 does it fit? (hard truths; no = fork card, swap returns to 2) -> 5 tankmates (optional, ranked by compatibility) -> 6 three finished tanks (cheapest / least work / balanced) -> 7 make it yours (look free, gates hold) -> 8 the plan (verdict, list traced to needs, one-line cycle note). Space input and scaping: settled below.
- **Count picker at step 1-2 (Nathan 2026-10-20):** choosing an animal suggests a group size (minimum, maximum or sex ratio) and the smallest tank FOR THAT COUNT, shown right away. The user sets the number they had in mind; the min / max note sits on the picker, graded in bands with their own messages (dwarf frog: 1 avoid, lonely; 2-4 doable; 5-6 good; 7+ great, needs a bigger tank), and the smallest tank updates live with the count. Species usually sexed in the hobby (aggression, breeding: livebearers, bettas, apistos, rams) get separate male / female counts with ratio advice. Habitat limits shown on the same card: dwarf frog = shallow water (they surface for every breath, roughly 30-45 cm max) and gentle flow. Data today: CARE has one `group` minimum, `solo`, a fixed `minL`; NEW data per species: count bands + messages, sex ratio + "usually sexed", max water depth, flow tolerance (and later lid / jumper); minL becomes count-dependent via the stocking engine's SPACE limit. Numbers need sources (research lane).
- **Tankmates on the same screen (Nathan 2026-10-20):** the count card asks "other animals in with them?"; yes = suggested tankmates (ranked by compatibility, each with its own count picker) and an updated recommended size, given as FLOOR AREA (length x width) more than volume: bottom dwellers and frogs share the floor, swimmers need length, and depth is capped for some (dwarf frogs). This merges step 5 into step 2; steps 6-8 follow. Engine gap: SPACE is per litre today; a floor-area answer needs each species' zone (bottom / middle / top) and minimum length.
- **Growing preview tank (Nathan 2026-10-20):** stocking comes first, so the animals appear in the viewer as they are added, in a bare tank (glass, sand) that steps up through the common sizes in the tank catalogue as the stocking needs more floor area (smallest size meeting floor area, length and any depth cap), labelled "About a 20 gal long (76 x 30 cm)". Proposed with it: the next step shown ("room for 1 more here" / "1 more frog = 29 gal"); the user's space (from step 3, or asked first) drawn as a dashed outline, so outgrowing it is visible and opens the fork card; live cost and effort (setup $ from cheapest to balanced gear for that size, minutes a week from the demand model) so they shape the stocking. Cost span "from $X to $Y" (cheapest to balanced build) is fine here (Nathan 2026-10-20; not the uncertainty range DS removed).
- **Refinements (Nathan 2026-10-20):** no space question up front: once the first species is in, the tool picks a tank, then steps it up as more animals are added (if they add more). When a step-up happens (or the tank outgrows a space they set), offer the next few good sizes, each with the cost increase of that decision. **Fullness bars:** a minimizable tile on the viewer with bars filling for the stocking engine's two limits (space, filtration), live as animals are added. Space limit is optional ("Set my space" on the tile, dashed outline once set; Nathan agreed). The first tank is picked for the species' recommended minimum count, with its band message. Each step-up option shows the space it gives, as the engine counts it (e.g. space bar 92 % now, 61 % in the 29 gal), beside its cost increase.
- **Scape choice after the three builds (Nathan 2026-10-20):** the user chooses: suggested styles that suit the animals, each shown rendered in THEIR tank with THEIR stocking (style tiles + the starter styles), or start the scape from scratch. Path 1 is fully mapped; next: path 2 (A look I want).
- **KW guided-start wizard is obsolete (Nathan 2026-10-20):** not shipped; the five-path New menu replaces it. Its code lives only on the local branch `wizard` (dbc7aa6); keep it, P6a reuses its tank / kit picking. Build plan: research/plan-path1-animal-first.md.
- **Every species added defaults to its recommended minimum group**, then + / - with the band warnings (Nathan 2026-10-20).
- **Scape step asks "Live plants?" (Nathan 2026-10-20):** live / artificial / mixed. Every style tile is honest like the stocking picker: setup $ span, minutes a week, light / CO2 needs. Proposed: artificial plants are a NEW item kind (none exist today): no growth, no light need, no nitrate uptake (so the filtration bar loses the plant help and water changes go up), one-time cost; silk not plastic for long-finned fish (betta). Choosing changes the fullness bars and minutes live.
- **Plants, ferts and the filter buffer (Nathan 2026-10-20, on main 3acd218):** plants take at most 60 % of the animals' TAN as ammonium (bacteria compete, little uptake at night); the filter always sees the rest, so the Filtration bar is never 0 with animals in. Root feeders (sword, crypt, val, lotus, sagittaria, carpets, hairgrass) count half against the water column. A water-column fert adds nitrate (aio ~5, doser ~10, EI ~60 ppm NO3 a week; root tabs 0): plants take the animals' N first, the fert's leftover is nitrate to change out (EI's own weekly change, not counted). When the animals cover the plants' N the tile says a fert without nitrogen is enough. All guesses, in FORMULAS. The Fullness tile has a fold-out "Where the ammonia goes" breakdown.
- **Plants vs stocking (Nathan 2026-10-20: "space is space"):** plants never add room. They take up nitrogen (fewer / smaller water changes, which the stocking engine already models as its FILTRATION limit only, never SPACE) and give cover (less stress for shy fish; rock and wood break lines of sight for territorial ones). Proposal: show the plant effect as water changes and minutes a week, and cover as lower stress risk, not as "stocking headroom".
- **Gates (proposal, Nathan agreed to the six user types; gate kinds still to settle, after the paths):** hard truths (eaten, temperature, outgrows) always shown, override by "I understand"; fit (skill, light, effort, budget) gray in guided paths, badges in Sandbox; taste = suggestions. Every gate says why and what unlocks it, with its cost. Shopping list traces each item to the need it serves (gear no need asks for = overspend, a need with no gear = underspend).

## Lid lamps: a dry tank's heat lamp, UVB and misting on the top, draggable (2026-10-21, branch `claude/lid-lamps-9806d8`, port 5871; side session of S165's chat)
Nathan 2026-10-21: a dry tank's lights sit on the lid and "slide anywhere theres surface".
- Rows (tech.json, `water: 'dry'`): Basking heat (none / dome), UVB (none / T5 tube in a reflector), Misting (by hand / misting system / fogger). `rowsFor` gives a dry tank only these; `inferTech` infers dome + UVB when a stocked animal has an AIR `warm` band (ball python, leopard gecko, anoles), else none. Gear prices are first guesses (`est`, provenance rule `gear.{heatdome,uvbtube,mister,fogger}.**` = assumption); the dome has no risk points (unsourced). The demand engine still skips a dry tank's tech (`techDemand` returns for dry), so the Tech menu shows their costs but the tank totals do not count them (said in the menu); wiring them in would make a mere drag add costs, since `withPlace` writes the inferred rows.
- Drawn (gear3d.ts `TOP`): 8.5 in dome (5.5 in under 3 ft) with a lit aluminium inside and a basking bulb; a T5 channel on end caps with the tube in clips, the longest standard tube up to ~72 % of the length; a misting nozzle with its reservoir on the floor behind; a fogger outlet with its hose to the unit behind. Cords and hoses run over the back edge, outside the grab box.
- Drag: mount `'lid'`; `placeFor` hits the top's plane (`lidTop`: mesh / glass panels, the hood's curve, or the rim with no lid) and clamps to the footprint by the piece's half size (`onTop`); saved as `{ wall: 'lid', at: x share, y: depth share }`, kept by a resize. No lid: the spot is kept as pointed and the piece is drawn on the nearest rim (a long piece only front / back), so adding a lid later puts it back where it was dragged. HOOD_H moved to scene/physics.ts (build.ts re-exports it).
- 2026-10-26 (Nathan: "1. fine 2. tell the light code the problem. 3. fix it"): (1) the python example has a mesh lid now. (2) The LED-through-the-dome bug went to Coordinator 10 for the light lane (LED on legs under 110 mm vs a 139 mm dome; raise / hang it over top gear). (3) The lamps count in the totals: `techDemand` runs for every dry tank, its inferred rows too, so the drawn gear is the priced gear and a drag never moves the totals; the Tech menu's If-picked preview works on dry tanks. The inference now needs a warm spot from 29 C / 84 F (`BASK_C`): ball python, leopard gecko, anoles get dome + UVB; crested geckos (26 C) and tree frogs (28 C) do not, so terrarium and rainforest keep their totals. A misting system's minutes are net of the spraying it saves (-1..-6 min a week, like the ATO). Re-blessed: arid +$132 setup +$10.81/mo; python +$172 (+$40 of it the mesh lid) +$10.81/mo (gearFilters and tech.test LOCKs). Still open: top pieces do not avoid each other; the python example's thumbnail still shows the open top.
- Tests: test/gearDrag.test.ts "gear on the lid"; tech.test.ts dry-row expectations updated.

## Lane TG: menu focus + Show boxes (2026-10-20, branch `techgear`, port 5833)
Nathan 2026-10-20: drag only what the open menu covers; a Show box per kind of thing; keep the fade as the hint of what is draggable.
- Drag gate: gear moves (drag, Shift+wheel lean) only while Tech is open, like pieces (Hardscape / Plants) and animals (Animals): `canPick('gear')` in interact/pointer.ts, `pickSec` in new `render/menuFocus.ts`, used by main.ts.
- Menu focus: while Tech / Animals / Hardscape / Plants is open, its things are drawn as they are and the rest fades 55 % toward the room (viewer.ts drawFocus, the painted-patch fade, no rebuild). Tech = gear + light fixture; Animals = fish, herps, corals; glass, water, ground, room never focus. Not in PNG exports or thumbnails (`exporting`). Off while the panel is hidden. Hook: one line in panels.ts's section toggle sets `viewer.menuFocus`.
- Show boxes (Viewer menu): Animals, Plants, Hardscape, Equipment (= the old Show equipment). Unticked ones are left out of the view and exports, and cannot be picked (`viewer.hidden`, `isHidden` in hitTest). Per viewer, localStorage `tanklook.hide`.
- Tests: test/menuFocus.test.ts. Shared files touched: viewer.ts, panels.ts (show boxes block + toggle line), pointer.ts (2 lines), main.ts (1 line), index.html, style.css (3 lines).


## Popular gear from Amazon, mini heaters, measured sponge (2026-10-20, `stocking` worktree; Nathan's request)
- research/gear-popular/{heaters,filters,lights}.{json,md}: Amazon best sellers with the popularity evidence per product
  (rank / ratings / bought per month, seen 2026-10-20), sizes from listings, colours read from product photos.
- Catalogue: +23 heaters (hygger HG-031 mini 10/25/50/100 W = the heater in Nathan's picture; VCRAZE SC-170xx ceramic
  bars 10/15/25/50 W, 51-112 mm; DaToo, PULACO, Orlushy, Aquaneat, Hitop, Fluval M200/E300 ...) and +16 filters (Tetra
  Whisper IQ 20/45, EX 70, NICREW slim HOB, AquaMiracle, Pawfly, AQQA ...). `popularity` field on both.
- Drawing: a heater's cap and foot shrink with its length (a 105 mm mini is not mostly cap) and the overall length now
  includes the foot (footed heaters were drawn 24 mm too long); element kind 'core' (a PTC block, no wire);
  `colors.controller` = an inline thermostat box on the cord, hung outside the back glass, digits to the room.
- Sponge filters: optional `spongeParts` (base disc, neck, fluted sponge, collar, lift tube at its real length, bubbles out
  its top under water). Aquaneat small (Amazon B08F79B7MS, Nathan's 9 gal bowl pick) measured off its listing image.
- Lights: catalogued and drawn 2026-10-20, see "Light product catalogue" below.

## Light product catalogue: the 18 Amazon best-selling lights, drawn and pickable (2026-10-20, side session; Nathan's request)
- Data: `lights` in src/data/gear-catalog.json (converted from research/gear-popular/lights.json), typed `LightProduct` in
  data/gearCatalog.ts: mount `bar` (14: slim bar on extendable wire brackets) / `rim-legs` (2: slab on two clip legs) /
  `gooseneck` (DaToo 70 mm disc) / `submersible` (hygger stick); fitMinMm..fitMaxMm, body L x W x H, watts, tech
  (led-planted for white+RGB, led-reef for the NICREW marine, led-white otherwise), `colors.leds` (rows of white dots, one
  accent in `every`, NICREW C10 = ring clusters, Fluval = an RGB middle row), est, names, popularity. `lightsFor(L)` = the
  ones that fit, most popular first.
- ESTIMATES added here (in each entry's `est`): watts of the six 48 in bars and the SEAOURA clip (the brand's W per inch x
  body; none published); fit range of the DaToo (200-410 mm, a 1-5 gal nano) and the submersible (350-1220 mm). No PAR is
  published for any of the 18: the light model estimates it from the watts and the card says so. Mount heights
  (scene/lightproduct.ts MOUNT_H: bar 25 mm, rim-legs 60, gooseneck 80) are read off photos, estimates.
- Light: `LightSettings.product` (optional, no version bump; dropped on load when unknown or under a hood).
  scene/lightproduct.ts `applyLightProduct` sets type (led; gooseneck = one LED puck), tech, count 1, watts, kelvin, PAR if
  published. lightout emitters run along the product's own body and width (`productBar`, `ledBarDepth(T, l)`), so a
  457 mm bar on a 610 mm tank lights like one. The submersible is lit as a bar at the surface (the model takes lights from
  above): drawn in the water, lit from the top.
- Drawing: render/light3d.ts `addProductLight` (called first in lighting.ts addFixture; it reuses lighting's barLegs and
  clipOns for the wire brackets and the gooseneck clamp). Pictures: research/gear-popular/lights-drawn-{front,three}.jpg;
  redo with `scripts/light-shots.js` (tall pane, e.g. 900 x 1300; it grabs the whole canvas because exportPNG crops a
  fixture above the rim off).
- UI: Tech > Lighting starts with a Product select (index.html `#lProduct`, rendered by techMenu.ts): Generic + the lights
  that fit the tank length; the card gives size, mount, fit, watts published or estimated, the PAR note and the estimated
  substrate PAR, popularity and the listing. Hooks in other files (one line each): panels.ts lType / lTech change drops the
  product, its front-to-back range uses the product width; build.ts passes the water level to addFixture.
- Follow-ups (lane LF, 2026-10-20, all four closed; test/lightfollowups.test.ts):
  1. 70 PAR for the 12 W AQUANEAT on a 24 in 20 gal: CHECKED, NOT CHANGED. Against 9 published LED bars (reference/par-calibration-data.md
     D3: 5-65 W, in air under the bar at 12-14 in, grade C, no method stated) the model reads 27 % (white LED) / 18 % (planted RGB) BELOW the
     median, and a short 12 W bar concentrates its light (the published 5 and 20 W clips give 4-7 PAR/W, the model 4.3). In air at 12 in under
     the bar the model gives 52; in the tank the mean is 70 because of glass images and substrate bounce (+~20 %; WALL_W 0.7 was fitted to the
     JBL koi tank with ASSUMED dimensions, so that part is the soft one). So no derate: the picker note now says "Assumption, not a
     measurement: the model reads 18-27 % below 9 published bar readings (mid-priced brands, in air); a budget bar's driver may fall short" (bars and
     rim-leg slabs without a published PAR). `BAR_CHECK` (lightproduct.ts) holds the numbers, the test recomputes them; provenance rule added.
     Still open: no meter reading of any budget bar (AQUANEAT / Pawfly) exists; one would settle it.
  2. Price: demand/engine.ts's 'light' row uses the product's listed price (+-10 %, then the engine's price-age widening) and is labelled
     "Light: brand model"; generic lights keep the old per-W / led-row price; kWh unchanged. Under a kit the kit price still covers the light.
     (Lights have no tech row, so this is in the engine row, not techDemand.)
  3. Submersible lit from under the water: lightout.ts `lightEnv` drops a stick's emitters to `waterY - SUB_DROP (18) - height/2`;
     `addSrc` treats an emitter below the surface as in the water: straight-line Beer-Lambert, no surface Fresnel loss, no lid loss, the wall
     images count in full. The beam is still cos^m about straight down (the real stick is tipped ~20 degrees toward the front): ESTIMATE.
     24 in tank: mean 34 PAR (was 29 lit as a rim bar), brightest 125 beside the stick, 5 at the far end (the stick is 12 in long).
  4. Offset: `subStick` (lightout.ts) puts the stick flush to the right end of the back glass (10 mm off the side glass), the model's emitters
     and the drawing (light3d.ts) both use it. On a 24 in tank no place clears the exact middle (the 12 in stick spans 11.5-23.5 in), but a
     HOB strainer at the middle is clear of it; from 28 in the middle half is free. Pictures: shots/lf_centred_filter_{front,three}.png.
  Files touched outside the lane's own: demand/engine.ts (the light row, one block); src/data/provenance.ts (two rules).

## Heaters and filters as lists (2026-10-20, side work in the `stocking` worktree; Nathan's request from the Tech menu)
- `TechSetup.heaters[]` / `filters[]` (scene/tech.ts): one entry per unit, generic (heater `w` editable; filter `model` steps) or a
  catalogue `product`; `kit: true` = the bundle's own. rows.heater / rows.filter follow the list (withUnits); the old single
  fields still load (heaterUnits / filterUnits read them). Several filters: flows and nitrifying capacity add, the best one sets
  stocking + risk. Units added on top of a bundle are their own demand row (`heater+` / `filter+`), so the bundle price holds;
  removing the bundle's own unit drifts it (dealdrift kitUnitSig). Place keys per unit: 'heater', 'heater.1', ...
- Tech menu: Heating / Filtration show a card per unit (name first, bundle price struck "in the bundle", ×), "+ Add" opens a
  picker (heater: generic + near sizes + all others; filter: type, then generic or any modelled product of it).
- Top Fin Essentials 20: deal filter name set to the Silenstream PF20 (catalogued already; PetSmart contents graphic).
- Kit gear research (2026-10-20, approved): Top Fin LED Black Glass 10 ships a Silenstream PF10 HOB (PetSmart gallery
  image 5300979_alt2 "Included Inside"; the text says "Integrated Filter System") -> deal fixed. STILL GENERIC, nothing
  published: Imagitarium kit heater wattage (Petco text, Q&A, box photos 3946395/408/416/424/432-center-1/2/5 checked; box
  side lists "aquarium heater with adjustable temperature settings" only; Petco CS says the 5.5 gal one is preset 78 F);
  Marineland Portrait 5 (ML90609) pump gph (Walmart text + 7 images, web). Its filter is a full-height chamber behind the
  back glass. Only a person with the box / heater label can settle these.

## Tech menu decision (Nathan 2026-10-19, opened lanes TM + TG)
A Tech section where the owner picks the tech level, Walstad to high-tech planted / SPS reef: filtration (none to canister / sump, sized), heater(s) (optional, sized from heat loss: surface area, tank temp minus room temp, lid; Nathan: not gallons), lighting (the Lighting section moves in), CO2, ferts, aeration, UV, salt gear (skimmer, return pump, powerheads, dosing, ATO, RO/DI). Every option shows setup $, $/month, minutes/week and what it buys (plant growth, AqAdvisor stocking % with that filter, species allowed by temperature, coral tier, risk), with a hover preview of the four demand numbers. Every cost, kWh and minute figure is for this tank (size class, volume, real watts x hours), never flat per option. Presets ladder: Walstad / Low-tech / Planted mid / High-tech; FOWLR / Soft coral / LPS / SPS. `TankSetup.tech` optional, no version bump, absent = today's inferred gear with identical demand numbers. grow.feed becomes derived from the CO2 + ferts rows (Plant care slider = shortcut). Lane TG draws the gear in the tank (not cartoony), with a Show equipment toggle. Prompts: prompts/lane-TM-tech-menu.md, prompts/lane-TG-tech-gear-3d.md.

## Lane KD: bundle deals (2026-10-19)
- `src/data/deals.json` (+ `deals.ts`): retailer tank+stand bundles {retailer, gal, tank (catalog id, optional), kit (optional), includes, price{usd, regularUsd}, saleEnds, url, asOf, est}. `src/demand/deals.ts` `dealOffers` = saving vs buying the parts (engine `kit` option generalised with `includes` + `label`, no parallel mechanism).
- Demand panel (Quick Setup) lists up to 2 fitting deals with "as of <date>, check current price"; `src/demand/pinned.ts` pins the bundle when a scene is started from a deal (`Price the parts instead` unpins).
- Start dialog "Deals running now" strip (`src/ui/featuredDeals.ts`, slot `#startDeals`): best saving first, hides expired `saleEnds` and rows with asOf older than 30 days, needs a catalog `tank` id. One-click start = `sceneFromDeal` (catalog tank, stand, kit light/lid).
- Bundle / preset price lost on edit (2026-10-19): `src/demand/dealdrift.ts` fingerprints the parts a bundle includes (tank size, stand, lid, light, hand-picked filter / heater); `pinnedKit(S, i)` drops the bundle price once one differs and the panel says so, with a notice + Undo (`src/ui/priceNotice.ts`). A tank picked on sale in Presets (`pinPreset`) warns the same way on a resize. Undo / redo (`store.loadedBy === 'history'`) keeps the pin, so undoing the change prices the bundle again.
- Sweep: `prompts/deals-sweep.md` (Sonnet only, 3 agents, one search at a time). Measured batch 2026-10-19: 3 agents, ~233k Sonnet tokens (~77k each), 3 verified rows (all PetSmart; ~78k per row). Amazon/Walmart/Chewy and Tractor Supply/Home Depot/That Pet Place/Big Al's/Aquarium Co-Op gave nothing (search cannot reach live listings; petco.com 403s fetch, Aquarium Co-Op geo-blocked). Better next sweep: PetSmart + Petco pages through the browser tools, not web search.
- Second sweep 2026-10-19 (user-approved): PetSmart full list, Petco, Walmart/Amazon via browser pane; 3 Sonnet agents, ~241k tokens (69k+68k+105k). Added the 75 gal Marineland HD ($499.99, was $799.99, featured) and the 45 gal Simple Modern (est, out of stock). Petco: no combos (403 on fetch, search shows only separate items). Walmart/Amazon: only a third-party 40 gal frame combo at $1,954 with contradictory specs, left out. Next time: PetSmart product pages are the only reliable source; check Petco by hand in a browser.
- Weak spots: 45 gal HD Marineland has no matching catalog tank (prices in the panel, not featured); 36 and 60 gal rows map to the closest catalog size, footprints differ a little. The 36 gal Top Fin shows no saving vs the app's parts estimate, so it is not featured.
- Deal match (lane DM, shipped 2026-10-19, section archived): a same-size bundle whose gear does as well for the build is offered as Tank B (`src/demand/dealmatch.ts`, `src/ui/dealMatch.ts`); per-tank pins in `pinned.ts` drift like the scene pin.
- Gear sales (lane GD, 2026-10-20; research and verdicts per source in `research/gear-deal-sources.md`). Nathan: "build all five".
  `scripts/gear-deals.py` (no model calls, ~8 min, run by hand before a release) reads Buce Plant, Aqua Forest Aquarium, Aquarium Co-Op,
  CO2Art (Shopify `/products.json`, compare_at_price) and Bulk Reef Supply (sitemap -> ~200 gear pages, embedded Magento
  special_price < regular_price; Marine Depot redirects there) -> `src/data/gear-deals.json` (slot light / filter / heater / skimmer /
  co2, in stock, >= 5 % off, sizes parsed from names: light fitMm, heater watts, galMax). First run: 32 rows (BRS 21: heaters, skimmers;
  Aqua Forest 10: Twinstar lights, Archaea CO2; Buce Plant 1). Many BRS heaters are OPEN BOX (the title says so).
  App: `src/demand/gearDeals.ts` (`gearFits`: light by tank length + fresh/salt, heater 0.8-1.6x heatLoss watts, filter/skimmer by
  rated gal, co2 fresh only, 30-day expiry; `gearOffers` best % off per row, at most 2.5x the row's price) ; engine option `parts`
  (row key -> sale price, applied after techDemand, a kit still wins); demand panel lines "On sale for your heater ... Price my heater
  as this" / "Your heater: ... Price a typical one instead". Pins ride on the tank as `gearPins` (like dealPin; saved files drop them).
  Skipped: Keepa (paid API), camelcamelcamel (no API), Amazon PA-API (affiliate), Slickdeals (robots disallows RSS search).
  Weak spots: unsized rows (Chihiros pendants, puck reef lights, Co-Op sponge filters by S/M/L) are never offered; Aquarium Co-Op and
  CO2Art had nothing on sale today. Best time to rerun: late November (Black Friday).
## Lane CL: animals cling to leaves, undersides and sides of hardscape (2026-10-16..19; main, no branch; Nathan approved the pictures; pushed to main)
Nathan's rules: things that cling or suck (snails, shrimp, sucker fish: oto, pleco) go on the undersides and sides of
things; things that perch (African dwarf frog) go only on TOP of things (hardscape, leaves, cave tops), never glass.
Shrimp do NOT cling to glass (Nathan, 2026-10-16). Animals can spawn anywhere their species allows, in proportion to area.
- Surfaces (scene/anchors.ts, render/items.ts, test/leafperch.test.ts): anchor kind `leaf`; `rest(x, depth, hard, leaves)`
  takes the leaf-top minimum normal (`leafUp(sp)`: 0.6 perchers, 0.3 clingers; 0 = not on leaves); `leafProbe` ray down on
  the plant meshes' revealed geometry (clear of the ground by 8 mm). New Surface `'under'` (types.ts): the cling surface for
  everything that is not a top: `underProbe(leaves, solids, ground)` looks straight up (leaf undersides: either face; solids:
  true downward faces only: ledges, cave roofs, cork) and sideways in 16 rays within SIDE_REACH 150 mm for steep faces
  (|normal.y| <= 0.5); the nearer wins. Pose: `hang3` in build.ts (steep face: yaw runs in the face, 0 level, 90 up).
- Species (data/species.json + species.ts): `cling: 'any'` = floor, glass, hardscape, under; `'hangs'` = shrimp (no glass);
  `'top'` = ADF (floor, hardscape, top; perches on tops and leaves, never glass or under). Land climbers (frogs, geckos,
  spiders) never take `under` or leaves. `onLeaves(sp)`, `leafUp(sp)`.
- Shuffle (scene/scatter.ts, scene/items.ts `hardscape(..., leaves)` and `underside(S)`): spots are only estimates (the
  renderer finds the face; none there = the animal rests on the ground). Broad-leaved plants weighted by type (LEAFY: crypt 1,
  anubias .6 ... swords/ferns low: their leaves stand nearly upright). Clingers take under/side faces with probability
  = face area / (faces + floor + tops). ADFs not floating: 40 % perch on hardscape or leaf tops.
- Dragging (interact/pointer.ts): top view drops onto a leaf or rock top; side/front views snap to a face within ~30 mm.
- African dwarf frog model flattened dorso-ventrally (art/herps.ts ADF_FLAT 0.55 height, width x1.12). Model-versions
  record for `adf` NOT bumped: press Record on the review sheet.
- test/fixtures/anchor-baseline.json re-recorded (shrimp, otos, snails move now).
- Not done: leaf SWAY is ignored (an animal on a leaf stays put as the leaf moves); thin stem plants offer no faces; no
  perch/cling check when a plant grows past or away from an animal (the renderer re-finds the face each build, so it follows
  the revealed geometry, falling to the ground if the leaf is gone). Floating plants (frogbit, lettuce) not leaf surfaces.


## Lane PR: plant propagation, step 1 (2026-10-16; branch `plant-propagation`, port 5693; design + Nathan's decisions in research/plant-propagation.md)
- **Built:** `BREED` table in `art/plants.ts` (mode runner / offset / rhizome / bulb / cuttings / float / mat, rate = daughters per Time per mature
  plant in a low-tech tank, hop mm, cap, from = parent growth to start). Sagittaria / vallisneria (`grass`) / hairgrass / sword / ozelot runners; crypt,
  balansae, succulents + bromeliad pups; anubias, buce, ferns rhizome (stay on their wood or rock); lotus bulb; stem plants cuttings (from growth 0.7);
  the four floaters (stop at 90 % water-line cover, none without water); moss + sphagnum `mat` (no new Items: `render/items.ts` widens the mesh x/z).
- **`scene/propagate.ts`:** `daughtersAt(item, t, feed, tank, planted)` pure + seeded (n-th daughter's direction / distance / birth Time never change; 8 placement
  tries, rejected = slot used up); `planBroods` = whole tank incl. grandchildren in birth order, plant cap `MAX_PLANTS` 250 (earliest births kept, so Time only
  adds); `syncBroods(s, t, feed)` puts preview daughters in `s.items` (`Item.brood` key, growth 0, `planted = -born * rate` so GR3's Time machinery grows them from
  birth). Called at the top of `growStep` (ui/panels.ts). Feeding scales the breeding rate by the same factor as growth. Daughters use a pool of 3 seeds per species
  (shared built mesh, GR4 GPU reveal, no rebuild per step).
- **Keep / undo:** `endGrow` strips `brood`; daughters stay as ordinary Items with optional `parent` (validate.ts keeps it only if that id exists; no scene
  version bump). Undo = store rollback; Time back = daughters removed. A later preview of the same parent skips its kept daughters' directions (salt).
- **Cost:** syncBroods median 1.9 ms per step at 150 plants (alternating A/B per step against growth alone; 0.1 ms), ~250 plants at the cap. Rendering cost is the
  extra plants themselves.
- **Not built (step 2):** competition (suppression, shading, overlap), light-map scaling, rhizome limited to a piece's real top, mat limited by glass / wood.
  Defaults are conservative: carpet, pothos, creeper, vines, tiger-less species have no breed data yet.
- **Test:** `test/propagate.test.ts` (determinism, scrub round trip, cap, containment, rhizome host, floater cover, keep + file round trip).

## Lane W: Android app (2026-10-14; OPENED same day, Nathan: "start work on the android app"; prompt `prompts/lane-W-android-app.md`)
- **Route: Trusted Web Activity (TWA)** around https://tanklook.com/ (Bubblewrap or PWABuilder). Real Chrome, so WebXR
  AR keeps working and pushes to main update the app with no store release. **Not Capacitor**: Android WebView has no
  WebXR (AR would need a native ARCore plugin); revisit only if offline use beats AR. Estimate: 1-2 days of code; the
  calendar time is Play's 14-day / 12-tester closed test that new personal accounts must run before production.
- **Missing today:** no web manifest, no service worker, no `/.well-known/assetlinks.json`.
- **Landscape gap (found 2026-10-14, not fixed):** the layout only switches on width (`style.css` `max-width: 760px`).
  Sideways, phones wider than 760 px get the desktop layout (menu left, 350 px, ~40 % of the width): roughly right.
  Phones 760 px or narrower in landscape stay stacked at ~180 px per half: unusable. Fix: a short-landscape rule that
  always puts the panel on the left at ~260-280 px. The view map's phone default reads the width once at load.
- **Step 1 DONE (2026-10-14, Nathan approved the pictures):** `style.css` `(orientation: landscape) and (max-height: 500px)`
  rule after the narrow one: panel left at 280 px (row / nudge / flabel columns narrowed to fit), view fills the rest,
  toast over the panel, sticky Add row, map 140x105. View-map default (`panels.ts` `narrow`) counts a sideways phone as a
  phone but is still read once at load (rotating never flips the viewer's map). Fixed on the way: the sticky `#addRow`
  floated 40 px (the panel's bottom padding) above the bottom on portrait phones too, with list rows showing under it;
  now `bottom: -40px`. Pictures: `shots/landscape/W1-W4` (worktree only); taken by a CDP script (touch emulated).
- **Step 2 DONE (2026-10-14): installable PWA.** `public/manifest.webmanifest` (standalone, orientation any, colours
  #15181e = dark --bg), `public/icons/` (any 192/512, maskable 192/512, apple-touch 180; placeholder art = the favicon's
  tank + fish, drawn by PIL; replace before the store listing if wanted), link + theme-color tags in `index.html`, and
  `public/sw.js` registered from `main.ts` (PROD only, one line). SW: the app page network-first (pushes show on the
  next open), `assets/` cache-first capped at 120, other same-origin network-first, other origins (aqadvisor proxy)
  untouched. Lazy chunks are cached only once loaded, so offline covers what the visitor has already opened. Checked
  on `android-prod` (vite preview, 5544): SW active and controlling, the app opens with the server stopped,
  `Page.getInstallabilityErrors` = none. Not yet checked: the install prompt on a real phone (needs the live https site).
- **Step 3 in progress (2026-10-14): TWA project in `android/`** (Bubblewrap 1.x, `twa-manifest.json` written by hand,
  then `bubblewrap update`): package `com.tanklook.app`, host tanklook.com, orientation default (follows the phone),
  target/compile SDK 36, min 21, version 1.0.0 (code 1). Toolchain on this PC (not in the repo): Bubblewrap CLI (npm -g),
  Temurin JDK 17.0.11 and Android cmdline-tools 6609375 in `%USERPROFILE%\.bubblewrap` (config.json points there).
  Upload key: `C:\Users\nreed\keys\tanklook-upload.jks`, alias `upload`; Nathan makes it and keeps the passwords,
  never in the repo (`android/.gitignore` blocks *.jks / *.aab / build output). Nathan runs `bubblewrap build` himself
  (it asks for the passwords and for the Android SDK licences). Then: its `assetlinks.json` goes to
  `public/.well-known/assetlinks.json`; after Play App Signing is on, ADD Play's app-signing SHA-256 too (from Play
  Console > App integrity), or the store build shows the browser bar.
- **Step 3 built (2026-10-14):** `android/app-release-signed.apk` + `app-release-bundle.aab` (git-ignored), signed with
  the upload key, SHA-256 `EB:FB:F5:12:...:FA:DC:2E` (full value in `public/.well-known/assetlinks.json`, served at
  tanklook.com/.well-known/assetlinks.json). minSdk raised to 24 (androidbrowserhelper 2.7.4 needs it). Gotchas for the
  next build: (1) Bubblewrap installed a 32-bit JDK on Windows (Gradle's 1.5 GB heap fails); config.json now points at
  64-bit Temurin 17 in `%USERPROFILE%\.bubblewrap\jdk\x64`. (2) PowerShell blocks `bubblewrap.ps1`: run `bubblewrap.cmd`.
  (3) The app's terminals set `NoDefaultCurrentDirectoryInExePath=1`, so `gradlew.bat` is "not recognized": clear it
  first. Build line: `cd C:/Users/nreed/Glass-Box-android/android; $env:NoDefaultCurrentDirectoryInExePath = $null;
  bubblewrap.cmd build`. To ship an update to the shell only: bump appVersionCode / appVersionName in twa-manifest.json.
- **Step 3 DONE (2026-10-14):** Nathan installed the APK on his S24+: "it works". Google's asset-links check = linked.
  Next: step 4, Play listing material; Nathan opens the developer account (14-day / 12-tester closed test).
- **Order:** landscape layout, PWA manifest + SW, TWA shell + asset links, Play listing material (Nathan does the account
  and submissions), low-end phone performance check.


## Model review sheet + model versions (2026-10-14, Nathan: "keep it where it can be updated with version number every time a model is updated")
- `review.html` (live at tanklook.com/review.html; second Vite page, `src/review/`): every species look (females too)
  from Side, 3/4, Front, Top, each in the preview tile's flat light and in the default tank's LED bar + water. Filter,
  "Needs work" tick + note per model (this browser only), "Copy flagged list" puts them on the clipboard as text.
- Versions: `src/data/model-versions.json` holds, per look, a fingerprint (geometry on a 1/500 grid, 24 px texture
  thumbnails at 3 bits, material colours, art/tl/aspect), `v`, and the build it shipped in. A model whose fingerprint
  no longer matches shows "changed since" (orange); "Changed only" filters to them.
- **Rule for any chat that changes a model** (art/, fish3d, snail3d, herp3d, species.json sizes): open
  `/review.html` on your dev server, wait for it to render, press "Record N changed models", commit
  `src/data/model-versions.json` and `public/model-sheets/` with the change. The button only exists on the dev server (plugin
  `scripts/model-versions-plugin.mjs`); it stamps build = current commit count + 1, i.e. the commit you are about to make.
- All 68 looks recorded as v1 at build 217 (stamped 216; another chat committed first, so check the number after pushing). Fingerprints held across reloads and at phone size in the app's browser.
- **Anatomy audit v1** (2026-10-14, ChatGPT from the model sheets; `reference/model-anatomy-audit-v1.md`): 6 P0
  (rebuild: cherry/amano/cleaner shrimp = fish tail + leg spikes; mystery/ramshorn/turbo snail = open shell sector,
  shell floats over a slab foot), 26 species P1 (fin layout: median fins drawn as short rear paddles, two-dorsal species
  merged into one, livebearer gonopodia, frog/newt limbs), 25 P2 (proportions). Spot-checked turbo + cherryshrimp
  sheets: findings hold. Its "keep" list (gourami feelers, angel streamers, barbels, axolotl 3 gill pairs, puffer
  fins) and constraints are binding for the fix lanes. Not started; Nathan to pick lane order.
- **Pre-rendered sheets for reviewers without WebGL** (2026-10-14: ChatGPT's cloud browser has WebGL disabled and saw
  nothing): `public/model-sheets/` = one labelled JPEG per look (title, sci name, id, size, version; 4 views x 2 lights,
  1710 x 556) + a static `index.html` gallery, live at tanklook.com/model-sheets/. review.html links to it and, with
  no WebGL, says so and points there. Record writes the changed models' sheets + the gallery too, so commit
  `public/model-sheets/` with the versions. `npm run sheets` rewrites every sheet headlessly (Vite + headless
  Edge/Chrome with SwiftShader, ~80 s; `scripts/export-sheets.mjs`), no dev-server slot needed. JPEG 0.9: 4.7 MB the set
  (PNG was 18 MB).

## Plant / coral light-and-care advice (BUILT 2026-10-16 by lane PG, see archive; OPEN for Nathan: eyeball the shaded Light map, care sets dosing advice?, stretch slider?, estimate numbers)

**In plain words (coordinator 3, 2026-10-16):** the tank has a light level (the fixture's PAR at the plants) and the owner a
care level (low-tech, ferts, or CO2 + ferts). Every plant and coral needs a certain light band and care. Four steps, each
pushed on its own: (1) tag each plant / coral with its light band and care demand; (2) let the light map count shade from
floaters, canopy and hardscape (a toggle, off = today); (3) check each plant against the light it really gets and show a small
badge (too dim / fine / too bright) plus one tank summary line, advice only, never blocking; (4) the starter-set UI gets
light level and care level controls and auto-populate picks only plants that fit, so a low-light low-tech tank gets a
beautiful scape from anubias, java fern, crypts, mosses, swords and floaters. Lane PG (`prompts/lane-PG-plant-gates.md`)
builds it; the detailed plan follows.

Today there is only static advice: the PAR guide (`src/ui/parGuide.ts`, Lighting menu: freshwater and reef tiers with
what grows, CO2 and fert / dosing level), the light hover (PAR, lux, depth) and the growth feed setting
(`src/scene/growtime.ts`, speed only). Nothing checks the tank: no per-species light need in `LIBRARY`
(`src/scene/items.ts`), no per-item or tank-level warning, nothing in `validate.ts`.
Plan:
1. Add to each plant and coral variant a light band (low / medium / high, from the PAR guide tiers) and a CO2 / fert
   demand (none, recommended, required; reef: dosing level).
2. Sample the PAR at each item's position (the light hover already does this) and compare with its band.
3. Show a small badge on the item (too dim / too bright / fine) and a tank summary, e.g. "medium light with stems and
   carpets: CO2 recommended, full ferts", "Acropora at 90 PAR: too dim", "reef with SPS: daily dosing".

Auto-populate from the tank's setup (Nathan 2026-10-16, the headline use of the data above): the user states the light
level (or it is read from the fixture's PAR at the substrate) and the care they will give (`GrowFeed`: low-tech /
ferts / CO2 + ferts, already in `growtime.ts`); `starterItems` (`items.ts`) then scapes only plants whose band and
demand fit, with the same layout quality either way:
- Low care / low light: a beautiful scape from the undemanding set (anubias, java fern, crypts, mosses, swords,
  floaters), placed on wood and rock the way the existing styles do.
- High care / high light: full freedom, stems, reds, carpets, with CO2 where the plants need it.
- Reef: the same idea with PAR band deciding soft, LPS or SPS corals.
Needs: 29 plant variants tagged with band and demand (step 1), a plant-pick filter in `starterItems`, two clear
controls (light level, care level) in the starter-set UI, and a one-line caption saying what was chosen and why.
Open for Nathan: does "care" also set the dosing advice shown, and do we offer a "stretch" slider (one tier above the
tank's means, with a warning)?

Step 0, scape shading in the light map (Nathan 2026-10-16): today PAR (`lightout.ts` `bandsAt`, the light-map shader
in `render/lighting.ts` and the hover readout) is open water; plants and hardscape block nothing. Add a toggle in
Light map mode, "Account for the aquascape" (off = today's numbers, so the fixture-only view stays available):
- Floaters: per-species transmission at full cover (salvinia, water lettuce, frogbit, red root, duckweed; sources to
  be checked, my first guesses were 70-95 % blocked) times the patch's cover from its spread and density, soft edges.
- Canopy: stems reaching the surface, broad leaves (sword, lily), overhanging wood.
- Hardscape: stone and wood shadow, a shadow-casting pass from the fixture's emitters.
- The JS and the shader must stay in step (the shader is a port); the hover must honour the toggle too.
- The badges and auto-populate below read the shaded PAR when the toggle is on, so a frogbit-covered tank counts as
  low light underneath.

Nathan 2026-10-16 (lane AD): no stretch slider. Care becomes effort tiers (0 watch only, 1 root tabs, ... a pareto front of
growth impact and plant freedom against effort, time and cost, each level showing what you commit to) and sets dosing advice.
Light and effort must correlate: high effort without high light gives mediocre results, high light without high effort gives
algae (a mismatch badge on the tank summary). The tool works both ways: pick plants, get suggested light and effort; or pick
light and/or effort, get the plant list recommended or gated to fit.

Advice only, never a hard gate. Keep the tier numbers in one place so the guide and the checks cannot drift.

## Still open (rewritten 2026-10-14, lane D)

Review pack R1-R12 (`shots/review/REVIEW.md`) decided 2026-10-14 (Nathan: "go ahead with the models, take the
recommendation for the rest"); all done by lane D in `models-fix`:
- R1 frogs: thighs = tucked teardrops with smooth normals, eyes set deeper with a lid mound (`250f4d7`; 5 herps v2,
  build 287). The far eye still shows over the head at 50°: accepted as anatomy (frog eyes bulge above the skull).
- R2 / R3 fish (`6176008`, versions `66d2dba` build 309): honey gourami soft breast, discus bands cleaner head-on,
  betta median fins drape (`Plan.drape`, `drapedCard`, one-line hook in build.ts; the card is not fingerprinted, so
  the betta's version did not bump), harlequin `Plan.sharp`; generic: outline thins on fish small on screen (1 px
  floor), fish texture anisotropy 16. Accepted as is: ember / chili head-on (a 40 px fish blown up 7x by the sheet,
  not a model fault), harlequin patch (foreshortened, roughly true).
- R4 `drawTetra` / `drawGourami` deleted (`352f441`). R7 sexes, R10 sizes: pass.
- R8 hardscape (`250f4d7`): coconut doorway a clean ragged rim with shell thickness; chunkier driftwood trunks and limb
  roots; worn tapered limb tips. Example thumbnails re-shot (betta bowl, terrarium, paludarium).
- R9 wall spill: NOT built (lane D's call). The broad wash stands in fairly for real room spill (mostly bounce off the
  water and substrate); with the light hung high the beams mostly miss a wall 50 mm behind the tank; and it would mean
  editing K2's lighting.ts. Revisit only if the wash looks wrong beside the light map.
- R12 shareable scene URLs: recommended as its own small lane (deflate the ~9 KB scene with CompressionStream,
  base64url in the `#` = ~3-4 KB; Share button, decode on load, "opened a shared tank" note with Undo; ui + scene
  files). The most useful thing for showing the tool to people.
  DONE by lane N (`0d0b85a`), see its section.
- R5 shrimp, R6 snails: rebuilt by lanes M and L. R11: http already 301-redirects to https.
- Leftover (not done, cheap): `shrimpMarksCanvas` (fishgen) and fish3d's `p.glass` branch may be dead now that shrimp
  have their own builder; check `Plan.glass` users before pruning.
First-visit audit: `shots/audit/AUDIT.md`, 53 findings (4 S1, 20 S2, 29 S3) with shots; fix lane G works from it.
The S1s: water level piles every fish at x = 12 mm; phone label overflow widens the page; aquascape drag erratic in the
straight-on view; first visit is an empty box (no pointer to Examples / Animals).
Not decided, low priority: camera limits (orbit already clamps elevation -20..85; "release" never defined); fish ignore
rocks (a bottom dweller can sit inside a stone); tank weight ignores hardscape.

Settled since this list was first written (2026-10-08), kept here so nobody reopens them: plain TypeScript, no React
(Phase 2 stack); lighting shipped (spot / tube / LED, light map, beams); art is procedural generators only (Nathan
rejected bought / AI models, repo is public), so the provenance question is moot; hardscape steps 3-4 shipped, step 5
(3D plants) shipped as lane A, corals + live rock as lane E.

## Known gaps (rewritten 2026-10-14, lane D)

- Every one of the 57 species (12 salt) draws in 3D from a generator (fish PLANS incl. shrimp, `HERP3D`, snail shells;
  11 with a female look); flat cards remain only as the fallback / picking target. Watch items are R1-R6 above.
- Mobile: usable but rough (audit S1 #2, S2 #6-8): no pinch zoom, page overflow from the tank label, half-screen panel.
- No stocking guidance for salt tanks (AqAdvisor's marine calculator is broken on their side; Nathan: leave it off).
- Moving / turning / resizing one fish or item, selection and the colour sliders patch the scene in place (lane J);
  geometry changes (water level, tank size, stand, substrate, terrain, Split, opening a file) still rebuild fully.
- Examples (Open…) are plain scene files: re-save them when art changes (see Lane F).
- Many "uncommitted" / "not pushed" notes in the dated sections below 2026-10-12 are stale: all that work is on main.
## Archive index (sections in HANDOFF-archive.md, newest first)
- Chat PX: Path 1 Polish (2026-10-21, branch `px2` from origin/main, pushed to main)
- Lane P6b: scape choice + plan sheet, path 1 steps 7-8 (2026-10-20, branch `p6bscape`, port 5923)
- Lane P6a: three builds, path 1 (2026-10-20, branch `p6abuilds`, port 5913)  (lane fills this in)
- Lane P4: artificial plants, path 1 (2026-10-20, branch `p4artplants`, port 5893)
- Lane SE: our own stocking engine, load vs capacity (2026-10-19, branch `stocking`, port 5843)
- Lane P5: stocking screen + fork card, path 1 (2026-10-20, branch `p5stocking`, port 5903)
- Lane P1: group data, path 1 (2026-10-20, branch `p1groups`, port 5863)
- Lane P3: fullness tile, path 1 (2026-10-20, branch `p3fullness`, port 5883)
- Lane P2: tank fit engine, path 1 (2026-10-20, branch `p2tankfit`, port 5873)
- Lane TG: tech gear in 3D (2026-10-19, branch `techgear`, port 5833)
- Lane DM: deal match, "a bundle close to your build" as Tank B (2026-10-19; Nathan approved the pictures; pushed to main)
- Lane TM: tech menu (2026-10-19, branch `techmenu`, port 5823)
- Lane CS: CI workflow split (2026-10-19, branch `cisplit`, port 5803)
- Lane KW: start wizard (2026-10-19, branch `wizard`, port 5783)  (lane fills this in)
- Lane DS: one expected-cost number (2026-10-19, branch `expectedcost`, port 5793)
- Lane AQ: AqAdvisor ids + Malawi pool (2026-10-19, branch `aqids`, port 5813)
- Lane CG: compatibility gates (2026-10-19)
- Lane CI: deploy health, live site stuck on build 738 (2026-10-19, branch `ci`, port 5773)
- Lane GS: gecko support surfaces (2026-10-19, branch `geckosupport`, port 5743)
- Lane AN: anole models (2026-10-19, branch `anoles`, port 5753)
- Lane SD: one start chooser (2026-10-19, branch `startchooser`, port 5763; Nathan approved the pictures, shipped)
- Lane KK: demand model (panel hook in `ui/panels.ts` only after KA lands) (2026-10-19, branch `demand`, port 5733)
- Lane KC: kit light wiring (stub data until KB lands) (2026-10-19, branch `kitlight`, port 5723)
- Lane KA: tank catalog (2026-10-19, branch `tankcat`, port 5703)
- Lane KB: kit catalog (2026-10-19, branch `kits`, port 5713)
- Lane EN: enclosure presentation (2026-10-16; branch `enclosure`, port 5673; opened by coordinator 3)
- Lane CP: content pack (2026-10-16; branch `content-pack`, port 5683; batch 1 pushed, Nathan approved the pictures)
- Lane SB: scatter brush (2026-10-16; branch `scatter-brush`, port 5693; opened by coordinator 3; started)
- Lane SS2: starter styles batch 2 (2026-10-16; branch `starters2`, port 5683; opened by coordinator 3; DONE: Nathan approved all styles 2026-10-16; pushed to main)
- Lane BP2: ball python follow-ups (2026-10-16; branch `python2`, port 5703; built + tested on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane PG: plant / coral light and care gating (2026-10-16; branch `plant-gates`, port 5673; opened by coordinator 3, not started)
- Lane BP: ball python, serpentine body plan (2026-10-16; branch `python`, port 5673; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane T1: dry ground, terrestrial substrates + leaf litter (2026-10-16; branch `dry-ground`, port 5633; Nathan: "leaf litter looks great", ship; pushed to main)
- Lane TA: tarantula, large arachnid body plan (2026-10-16; branch `tarantula`, port 5683; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane SW: swamp land as editable terrain (2026-10-16; worktree `agitated-lumiere-a79eba`, port 5663; side session of T1)
- Lane JS: regal jumping spider, first arthropod body plan (2026-10-16; branch `spider`, port 5673; built + tested, committed on the branch, NOT pushed: pictures sent to Nathan, awaiting his verdict)
- Lane MS: multi-select, duplicate, controlled variation (2026-10-16; branch `multiselect`, port 5683; pushed to main, awaiting Nathan's verdict on the pictures)
- Lane SH: setup sheet / shopping list (2026-10-16; branch `setup-sheet`, port 5683; built, waiting on Nathan's look at the 3 example sheets before push)
- Lane PP: plant polish (2026-10-16; branch `plant-polish`, port 5673; Nathan approved the pictures; pushed to main)
- Lane G1: lizard body plan, crested gecko + leopard gecko (2026-10-16; branch `gecko`, port 5663; Nathan approved the pictures, "ship it"; pushed to main)
- Clownfish host in the bubble-tip anemone (2026-10-16; worktree `musing-snyder-0e96c4`, port 5693 `clown-host`; Nathan approved the pictures; pushed to main)
- Lane T3: dry hardscape pieces + surface anchors, tree frogs perch (2026-10-16; branch `dry-hardscape`, port 5663; Nathan approved the pictures; pushed to main)
- Lane FM: fish parts merged per material (2026-10-16; branch `fish-merge`, no preview server; Nathan approved shipping the few changed edge pixels, phase 2 skipped; pushed to main)
- Lane T2: terrestrial plants (2026-10-16; branch `terra-plants`, port 5653; batches 1 + 2 and vines on wood approved by Nathan and pushed; DONE)
- Lane T4: aquatic roster (2026-10-16; branch `aqua-roster`, port 5673; DONE: fish batches 1-2 and reef P1 + P2 approved by Nathan and pushed)
- Lane SG: stone grain from baked tables, first visit about halved (2026-10-16; branch `stone-grain`, port 5653; Nathan approved the pictures; pushed to main)
- Lane PL: progressive first load, the tank builds part by part (2026-10-15; branch `progressive-load`, port 5633; Nathan approved the look; pushed to main)
- Lane SS: scape styles, Composition picker, Quick aquascape setup (2026-10-15; branch `scape-styles`, port 5663; DONE: Nathan approved the styles and the menu; pushed to main)
- Lane LA: algae on plant leaves + bowl glass film (2026-10-15; branch `leaf-algae`, port 5673; Nathan approved the pictures; pushed to main)
- Lane EF1: shader link time, first visit 35-87 s -> 10-13 s (2026-10-15; branch `shader-link`, port 5633; DONE, pushed to main)
- Lane CC: unreachable 2D card fallbacks deleted (2026-10-15; E2 audit item 14, Nathan: "we can delete those"; pushed to main)
- Edit speed: water colour and light power (2026-10-15; lane EF2, branch `edit-speed`, port 5643; pushed to main)
- Lane SF: single-file build fixed (2026-10-15; branch `single-fix`; DONE, pushed to main)
- First download: examples on demand (2026-10-15; lane EF3, branch `download-size`, port 5653; pushed to main)
- Plants against the glass, roots at the glass (2026-10-15; main)
- Drag-in, plant list, clumps on slopes (2026-10-15; branch `drag-place`, port 5613; pushed to main)
- Efficiency review (2026-10-15; Nathan: the features are in and look right, so review for efficiency; lanes E1 + E2 OPEN, measure / audit only)
- Lane SD: scape density sliders (2026-10-15; branch `scape-density`, port 5603; DONE, pushed to main)
- Lane X2: fish leftovers from X and F2 (2026-10-15; branch `fish-x2`, port 5583; Nathan approved all four steps; pushed to main)
- Plant growth (2026-10-15; design agreed in chat; lane GR1 DONE: branch `plants3d`, port 5283, pushed to main; GR3 DONE (`plant-time`, 5593); GR2 DONE (pushed); GR4 DONE (GPU reveal + worker prebuild, pushed); PR step 1 propagation: see "Lane PR" above)
- 3D back wall (2026-10-15; main checkout; Nathan chose "3D panel inside" over a flat printed sheet; pushed to main)
- Aquascape menu split into Hardscape and Plants (2026-10-14; Nathan asked; pushed to main)
- Lane Z: corals sit on the rock (2026-10-14; branch `coral-seat`, port 5563; Nathan approved; pushed to main)
- Lane F2: harder fish, new shapes (2026-10-14; branch `fish-hard`, port 5573; Nathan approved all four; pushed to main)
- Lane X: anatomy audit P2, freshwater mid-water fish (2026-10-14; branch `fish-fins`, port 5503; Nathan approved both sheets; pushed to main)
- Lane Y: anatomy audit P2, bottom dwellers + marine fish (2026-10-14; branch `fish-p2b`, port 5533; Nathan approved both batches; pushed to main)
- Lane V: zoom out further (2026-10-14; branch `zoom-out`, port 5523; Nathan approved option (b) and the pictures; pushed to main)
- Lane S2: anatomy audit P1, fish batch 4 (2026-10-14; branch `fish-fins-b4`, port 5513; Nathan approved the sheets; pushed to main)
- Lane T: AR view on iPhone, AR Quick Look (2026-10-14; branch `ar-view`, port 5483; pushed to main, HIDDEN behind `?ar=ios`)
- Background pictures (2026-10-14; main checkout, pushed to main)
- Lane P: final polish, FINAL.md items 1-6 (2026-10-14; branch `final-fixes`, port 5473; Nathan approved via the coordinator; pushed to main)
- Lane S: anatomy audit P1, fish fins (2026-10-14; branch `fish-fins`, port 5503; DONE: batches 1-3 approved and pushed; batch 4 is lane S2's)
- Lane R: anatomy audit P2, axolotl + zebra nerite (2026-10-14; branch `p2-small`, port 5493; Nathan approved both sheets; pushed to main)
- Lane N: shareable scene links (2026-10-14; branch `share-url`; review item R12; pushed to main)
- Lane O: anatomy audit P1, non-fish animals (2026-10-14; branch `herps-p1`, port 5463; Nathan approved all five sheets; pushed to main)
- Lane Q: AR view, WebXR (2026-10-14; branch `ar-view`, port 5483; DONE, phone-tested; Nathan's idea: the tank at real size in his room)
- Final check before showing (2026-10-14; main `fe28ad3`; no src/ edits)
- Lane I: reef polish + example refresh (2026-10-14; branch `reef-polish`; Nathan approved rock C and reef option B; pushed to main)
- Lanes L + M: anatomy audit P0 fixes (2026-10-14; opened, run in parallel)
- Lane J2: performance leftovers (2026-10-14; branch `perf`, port 5373; pushed to main)
- Lane K2: light output follow-ups (2026-10-14; branch `light-output`, port 5383)
- Lane J: edit performance, audit #52-53 (2026-10-14; branch `perf`, port 5373; pushed to main)
- Lane A2: plant library (2026-10-14; branch `plants3d`, port 5283; crypt + 9 species + Spread / Stems pushed to main)
- Lane K: light output (2026-10-14; branch `light-output`, port 5383; DONE, all 4 steps pushed)
- Light output: watts -> PAR / lux (2026-10-14; draft only, no src/ edits)
- Lane G: audit fixes, UI share (2026-10-14; branch `audit-fixes`; batches 1 + 2 pushed to main, DONE)
- Lane G2: core audit fixes (2026-10-14; branch `core-fixes`, port 5363; owns src/interact, src/scene, src/render minus lane I's files)
- Lane D: first-visit audit + review pack (2026-10-14; no src/ edits)
- African dwarf frog (2026-10-14; Nathan: "can we add an african dwarf frog model?"; branch `adf-frog`, port 5553)
- Tree frogs climb the glass (2026-10-14; Nathan: "like otos and snails cling to the glass")
- Lane A: 3D plants (2026-10-14; Nathan approved the style test "looks good, roll out"; pushed to main)
- Lane H: AqAdvisor for salt tanks (2026-10-14; Nathan: leave it off; pushed to main)
- Lane AL: condition / algae view (2026-10-15; branch `algae`; Nathan approved v2; pushed to main)
- Lane E: live rock + corals (2026-10-14; branch `corals`; Nathan approved the style test, live rock salt only; pushed to main)
- Lane C: marine species (2026-10-13; Nathan approved the sheets, hermit "fine for now"; pushed to main)
- Lane F: example tanks (2026-10-13; branch `examples`, shipped to main)
- Lane B: fresh or salt tank (2026-10-13; branch `salt-tank`, shipped to main)
- Parallel lanes (2026-10-13, Nathan: fill the gaps before showing other people)
- Pan stays put (2026-10-13)
- Fish stand out (2026-10-13)
- Custom substrate: grain, colour, blends (2026-10-13)
- Optimized spot pattern (2026-10-13)
- Hardscape surface grit (2026-10-13)
- Pie slice tank shape (2026-10-13)
- Light beam overlay (2026-10-13)
- Aquascape Shuffle rolls a style (2026-10-13)
- Male / female fish (2026-10-13; DEPLOYED `23633f2`)
- Hardscape placement: yaw / pitch / roll, resize, free move, cut off by the glass (2026-10-12)
- Bowl tank shape (2026-10-12; DEPLOYED: pushed to origin/main `84595e5`, merged with main's background sides / arc)
- NEXT (Nathan 2026-10-09, closing session 11): 3D sequence
- Hardscape system: roadmap steps 3 + 4 built (2026-10-09, session 13; committed and pushed, checked in the browser)
- Muse UX feedback fixes (2026-10-09; uncommitted, checked on the dev server)
- HTTPS live (2026-10-09)
- Stocking list replaces per-fish chips (2026-10-09, Nathan; uncommitted, checked on the dev server)
- Shuffle button (2026-10-09, Nathan; uncommitted, not yet checked in the browser)
- Species preview tile (2026-10-09, Nathan; committed, ships in the next deploy)
- Deployed 2026-10-09: build 63 (`e721433`), everything on main incl. the 3D pilot, Edit boxes, cabinet doors
- Split view: per-view "Edit" boxes (2026-10-09, Nathan; committed `80379ef`, deployed in build 63)
- Status (2026-10-09, session 11c: alpha fix on `fix-canvas-alpha`; 8-species pilot on `audit-3d`; neither merged)
- Status (2026-10-09, session 11b: four generic 3D fixes built on branch `audit-3d`, NOT merged)
- Status (2026-10-09, session 11: species audit (d) done; awaiting Nathan's call on the open points)
- Status (2026-10-09, session 10: 3D fish (a) markings + (b) cory shape built, committed, NOT pushed; awaiting Nathan's review)
- AqAdvisor stocking level (2026-10-09, separate chat; LIVE with the proxy)
- Status (2026-10-09, session 9: 3D fish style test built, NOT committed; awaiting Nathan's verdict)
- Status (2026-10-09, session 8: tank shapes phases 1 + 2 deployed `9286b85`)
- Roadmap (2026-10-09, agreed with Nathan)
- Status (2026-10-08, session 7: tank shapes phase 1 built, NOT committed)
- Status (2026-10-08, session 6: split-view polish deployed `eee6334`; spot-light grid committed `fda7d88`)
- Tank shapes + table stands (requested 2026-10-08; phase 1 built 2026-10-08 session 7, phases 2-3 not built)
- Status (2026-10-08, session 5: split tanks deployed)
- Status (2026-10-08, end of session 2)
- Water level + colour + swamp + frame stand: built and deployed (session 3, 2026-10-08)
- Custom terrain (Nathan's idea, 2026-10-08; built and deployed session 3, `2e9ce54`)
- Dry tank / terrarium (Nathan 2026-10-08: "TankLook, not AquariumLook"; built and deployed session 3, `2e9ce54`)
- Approximate tank weight (Nathan 2026-10-08; built and deployed session 3, `2e9ce54`)
- NEXT WORK UNIT: land + semi-aquatic species (Nathan 2026-10-08: "mixed land and water animals in the same tank")
- Split tanks: built and deployed (session 5, 2026-10-08)
- Next work unit: water level + water colour (requested by Nathan 2026-10-08)
- Fish art style (done 2026-10-08)
- Species, layouts, snails, custom sizes (2026-10-08; pushed for dogfooding, sizes table still to review)
- Decisions made (2026-10-08)
- Phase 2 build decisions (2026-10-08)
- Phase 2 plan (approved 2026-10-08, built as above)


## Lane P1: performance ladder (2026-10-19; research only, no src/ change yet)
Goal (Nathan): a Performance slider so a laggy machine can orbit / pan at 30 fps. Steady orbit frame time is the target; load / rebuild
cost is a separate, lower-priority track (E1 report). Design agreed in chat: (1) a motion layer: drop the pixel ratio while the camera
moves and draw one full-quality frame ~150 ms after it stops (nothing changes on fast machines, it only acts when frames miss budget);
(2) the slider holds heavier rungs and auto-steps down until 30 fps is held (smoothed, with a visible readout and manual lock).
- Measured (research/efficiency/P1-*.json, 100 paired frames, RTX 500 Ada): pixel ratio 2 -> 1 saves 6-14 ms GPU; frosted film ->
  plain sheet saves 6.9 ms on iwagumi (0 where there is no film; Nathan rated it unnoticeable on a still, 2026-10-19; recheck with
  a picture behind the film); fin cards hidden removes every fish (not a rung). Plants / hardscape hidden are upper bounds only.
- Real orbit at a stress pixel ratio of 5 (about 30 fps baseline): 28-33 fps at full ratio, 47-60 fps at 75 % of it. The sharp frame
  after stopping costs 9-13 ms. So the motion-time drop alone fixes the stand-in case.
- Frost swap changes the shader program (a long first link on D3D11): slider only, unless both variants are precompiled at load.
- Tools: `scripts/perf-baseline.mjs --ab research/efficiency/P1-ab-rungs.mjs --ab-shots dir` (rung A/B + pictures), `--orbit R0`
  (real orbit sweep); `research/efficiency/P1-score.py` (SSIM / colour diff), `P1-sheet.py` (rating sheets).
- BUILT 2026-10-19 (render/viewer.ts `drawGoverned` / `govRest`): the motion-time ratio. While the camera moves and the frame gap
  (EMA) is over `govBudget` (26 ms) for 8 frames, the pixel ratio steps down x0.8, never below half; the scale is kept for the next
  orbit (the first frame of a burst is sharp); 150 ms with nothing drawn draws the full ratio; 600 fast frames probe one step up.
  Skipped on build / reveal frames; `viewer.adaptive = false` turns it off; export always at full ratio. Checked with
  `perf-baseline.mjs --governor` (no change at the default budget on this GPU; forced misses step to 0.5 and restore at rest).
- BUILT 2026-10-19 (render/perf.ts, viewer.ts, Display & export > Performance row): levels 0 full, 1 plain background film + resting
  resolution 75 %, 2 = 50 %, 3 = 35 % (the film swap is folded into level 1, so a tank with no film still gains at every step; Nathan 2026-10-19). Per-viewer (localStorage `tanklook.perf`). Auto (default on) steps one level down when the motion-time
  drop is already at half and frames still miss 30 fps while orbiting, never back up;
  moving the slider locks (auto off), the Auto box re-enables. Readout: fps while moving. The other film variant's programs are linked
  while idle (`precompileVariant`), so a switch adds no program (checked: `perf-baseline.mjs --perfcheck`, 18 ms switch). The level-1 picture
  is pixel-identical to the one Nathan rated. Open: antialiasing off (renderer rebuild; manual only); cheaper plant / stone shaders;
  unmeasured on a genuinely slow machine; the rating sheet's film row on a tank with a picture behind the film.
- Open: antialiasing off (needs a renderer rebuild, manual option only); cheaper plant / stone shaders (the plant bucket is the
  biggest GPU cost, 3-7 ms); a picture-behind-the-film rating row; then build the governor + slider in render/viewer.ts and ui.
**Phase 2 DONE 2026-10-19 (data).** `src/data/demand-items.json`: 184 researched rows (animals each, plants per pot, stone per lb, wood per
piece, gear classes, tank-only prices by gallons; each row lo/mode/hi + unit note + one source url; `est: true` = no listing found, 2 rows:
`animal:syno`, `gear:conditioner`; many lo/hi are partly judgement, said in the unit note). Research cost: about 2.0M Sonnet tokens in two
passes (first pass rate-limited: 115 of 169 rows came back as guesses; retry at 3 agents at a time fixed it). `src/demand/prices.ts` looks
rows up; `engine.ts` prefers a row, falls back to demand-defaults.json. Substrate and the water-source rates stay on the factor defaults
(the sand row is per branded 5 lb bag, too dear per litre). Weak rows: goldfish, clownloach, discus, bronzecory, ember, tank:75, tank:125,
ball python, harlequin crested gecko, hard:ledge / lava / river (proxies from bagged landscape rock). Starter examples (setup p10/mean/p90):
betta $310/379/454 (light row clamps at 24 in; being tuned), planted 45 gal $1187/1410/1640, reef 73 gal $2829/3416/4029.
**Phase 3 DONE / Phase 4 DONE 2026-10-19 (panel UI).** Nathan chose Quick Setup as host and kept the risk cut points (safe < 3, moderate < 6,
demanding above). `src/ui/demandPanel.ts` (the panel) + `src/demand/swaps.ts` (best swap per driver, effect on all four numbers) are hooked in with
two one-liners: `<div id="demandPanel">` at the top of the Quick Setup section in `index.html` and `attachDemandPanel(store, $('demandPanel'))` at the
end of `attachPanels` in `ui/panels.ts`; CSS appended to `style.css` (`.dm*`). Recomputes 450 ms after the scene settles (kinds scene / load).
Profile (skill by domain, water source, kWh rate, limits, budget mode) is in localStorage `tanklook.demand`. Bars: red when over a limit; click a
bar for drivers (+ each item's share of the doubt) and swaps; limits form asks "expect to spend" vs "most I can spend" the first time a $ limit is set.
Gotcha: preview_start serves the primary folder; to preview this worktree I pointed the `demand` entry of the primary's `.claude/launch.json` at it
with `npm --prefix` (local edit, not committed). Phase 5 (Shuffle and Quick Setup respect the limits; care-tier slider sets all limits) is next.


## 2026-10-19 Generic filter / heater models (Nathan's idea)
- `src/data/gear-models.json`: 6 generic filters (sponge, internal, HOB small/large, canister medium/large: gph, tank range, watts, price row key, name aliases) and 6 heater classes (25-500 W). New est price row `gear:filter-internal` in demand-items.json (no listing found, widened).
- `src/demand/gear.ts`: pure `matchFilter({kind, rating, name, gph, gal})` (name alias > flow in log distance, within the class > tank size > class), `matchHeater(watts)` (round up), `defaultFilter/defaultHeater(gal)`, `parseGph` (gph and L/h). Tests: `test/gear.test.ts`.
- Engine: filter/heater rows take price row and kWh from the matched model; `kit.filter` / `kit.heater` (new optional fields) name the generic in the row label and set power from the real heater watts. `kitGear(kit)` in kits.ts; `Deal` gets optional `filter` / `heater`, and `dealAsKit` passes them (or the linked kit's) only for parts the deal includes.
- Behaviour change without a kit: heater power now uses the heater class watts (rounded up) instead of the raw 3 W/gal figure; filter power uses the model's watts (3-25 W, was flat 6 W).
- Not done: no deal in deals.json lists a filter/heater yet; UI does not show the matched generic beyond the demand row label. Full-suite failures in scene/reef/leafperch/growth tests were already there (uncommitted plant3d.ts from another chat).
**Phase 5 DONE 2026-10-19 (limits steer the build).** `src/demand/fit.ts` `fitToLimits` (greedy: the bar furthest over its limit, best swap among its top drivers, locked swapped-in kinds,
stops when every limit holds or nothing helps; reports the floor the tank/gear/routine work alone cost). Hooks in `ui/panels.ts`: `fitLimits()` after Shuffle and after the Plant care
refit (same undo step: second `store.edit` with history false; skipped when both tanks of a split are edited); the Plant care slider (Low / Medium / High) also sets time / upkeep / risk limits via
`demand.setLimits` (30 min, low, safe / 60, low, moderate / 120, flexible, any; money untouched). Swaps keep floaters floaters, carpets carpets, never a succulent. demandOf's upkeep mean now
includes the expected loss replacement (`Contribution.lossMo`) so swaps and the panel agree with the Monte Carlo. Not covered: density sliders / restock do not fit to limits. Lane KK is
finished unless Nathan asks for more; the preview server on 5733 is stopped.

## Length audit lane (2026-10-23, applied on branch length-audit, not pushed)
- research/species-length-audit.md: 51 freshwater fish tl vs FishBase / Seriously Fish. Off by more than 25 %: chili 35 (typical 23), clown loach 300, swordtail 140/160. Nathan said update, so 11 lengths changed (chili 23, clown loach 230, swordtail 110/120, guppy 38, kadango 170/140, honey gourami 60, pea puffer 30, ram 50, dwarf gourami 80, ember 23, hatchet 40) plus three female lengths.
- Found: lane CB's 10-21 lengths were applied without refitting SPACE_FACTOR (21 rows). Refitted all 22 changed-length rows to AqAdvisor in a 55 gal (water %); fit.tsv rows updated. Chili now reads 37 % in that tank (was 103 %). Rule: a length change must refit that species' factor (research/length-refit.scratch.test.ts.txt: copy to test/, REFIT=1 REFIT_LOG=out.txt npx vitest run; then node scripts/space-factors.mjs).
- Sourcing batch research/sourcing/LA.json (derived, quotes verified); anchor baseline and demand locks re-blessed. scripts/body-mass.mjs not rerun (it overwrites lane SN's hand edits).
- Open: the other fitted factors have drifted from AqAdvisor since lane HC (median reading 1.1x, range 0.6-1.9x): a full refit is its own lane.

## S216b: Expert calibration fit (2026-10-26, branch s216b; done)
- Landed: one fit over rounds 1-3 + v4 (scripts/calib-fit.mjs --one-ai, --no-implausible; research/calib/fit-all-*.md), implausible-count flags in the round 1-3a reviews, research/expert-calibration.md sections 16-17 (decisions, dry run), two small fixes from Nathan (CPD males rule; gallon-figure Recommended mark gets the 10 % slack, so a ram pair in a 20 long reads green).
- DECISION: the global fit is DEFERRED (circular validation: fitting to AI answers then scoring against them). No global water / floor scale, no class or species terms. The AI rounds stay as regression checks and preliminary targets; AI rounds continue; real fitting waits for an independent reference set (experienced aquarists, held-out part never fitted; long-running tanks show survival, not ideal stocking).
- Open: ember reads 7 ideal in 5.5 gal where the expert says caution at 6 (not changed). v5 survey wishes: shared tanks across experts, plausible anchors, human respondents first, repeats.
