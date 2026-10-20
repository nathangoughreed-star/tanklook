# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Start here (trimmed 2026-10-16)
This file holds only what a new chat needs: the lane rules, the coordinator protocol, the CURRENT lanes, and the open
items. Every finished lane / feature section was moved verbatim to **HANDOFF-archive.md** (index below); search it by
heading when you need a subsystem's history. Add your own dated section under "Lane sections" here, and when your lane
is done the coordinator moves it to the archive.

**Lane rules:** Rules: touch another lane's file only for a one-line hook, and say so in your section. No scene version bump without
asking Nathan. Shipping: in the worktree `git fetch` + `git merge origin/main`, tsc + tests + browser check, then
`git push origin HEAD:main` and `git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main`. HANDOFF.md
conflicts on merge: keep both sections. **In the shared folder itself** (C:/Users/nreed/Glass Box, any chat not in a
worktree) commit and push ONLY with `scripts/ship.sh -m "msg" <your files>` (bash): it commits just those files and
pushes from a throwaway worktree without touching other chats' edits. A hook (`scripts/git_guard.py`) denies stash,
--autostash, reset --hard, checkout --, restore, clean -f, commit -a, add -A / add ., push and pull there (2026-10-19). Each lane adds its own dated section under "Lane sections (current)" below.
**Deploy health:** live build = footer of https://tanklook.com/ ; one-line check: `curl -s https://tanklook.com/assets/$(curl -s https://tanklook.com/ | grep -o 'main-[^"]*\.js' | head -1) | grep -oE 'n:.[0-9]+.,sha' | head -1; git rev-list --count origin/main` (live n vs main; equal once the last deploy lands, ~5 min after a push); Actions state = `curl -s https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs?per_page=5` (status/conclusion per head_sha; `/deployments` for what shipped). A red deploy usually means one slow/failing test: reproduce with `npx vitest run` in a clean worktree.

**Coordinator protocol (Nathan 2026-10-13):** the coordinator chat is session `local_408aa124-ce91-4651-abaf-a221f0ceac82`
("Lanes coordinator 4", took over 2026-10-19 from `local_f068e2c9` (coordinator 3)). Every lane messages it (send_message to that id) when its work is pushed to main, when it is done,
and at any milestone that unblocks another lane (A: plants pushed; D: shots/audit/AUDIT.md written). The message says
what landed (commit), what is still open, and which files are now free. The coordinator then sends Nathan the prompts
for any chats that can start now. If a prompt is still waiting when another lane opens, it sends all waiting prompts again
in one new message. Every new lane prompt includes this protocol. When a lane is done it stops its own preview servers (preview_stop): the app allows only five
per folder, and finished lanes holding them blocked lane G on 2026-10-14. Questions for Nathan stay in the lane's own chat.
New since 2026-10-16: lane prompts are one line ("You are lane X. Read prompts/lane-X.md and follow it."); a lane
whose chat gets long hands off to a fresh chat at a work-unit boundary (write its state into its HANDOFF section
first); dev servers are swept when a lane reports done and on "check" (no hourly sweep).

**Current lanes** (coordinator "Lanes coordinator 4", `local_408aa124`):
| Lane | Worktree / branch | Port | Owns | State |
|---|---|---|---|---|
| SE stocking engine | `../Glass-Box-stocking` / `stocking` | 5843 | new `scene/stocking.ts`, `data/bodymass.json`, stocking line in `ui/panels.ts`, bioload helpers in `scene/starter.ts` | opened 2026-10-19 |
| Queued (Nathan 2026-10-16, roadmap re-rank) | - | - | after T1-T4: starter styles batch 2 DONE 2026-10-16 (lane SS2, see archive; its gaps: no water dish, no succulents, Malawi has only yellowlab / cockatoo); multi-select / duplicate (lane MS) + scatter brush (lane SB) DONE 2026-10-16, see archive; PNG import; LAST: build.ts / panels.ts splits; clownfish host in the bubble-tip anemone DONE 2026-10-16 (see its section) | queued |
| W Android app | `../Glass-Box-android` / `android` | 5543 (`android`, `--host` for phone tests) | landscape @media in `style.css`, view-map `narrow` in `ui/panels.ts`, new manifest / icons / SW in `public/`, their tags in `index.html`, new `android/` | Steps 1-3 DONE (layout, PWA, TWA APK works on S24+); PAUSED 2026-10-14 by Nathan before step 4 (Play material) and 5 (low-end check); files free, preview servers stopped |

**Next batch (Nathan 2026-10-19; coordinator to re-evaluate and write prompts once TG and SE have shipped and the shared checkout is clean):**
wizard follow-up (salt, the named animal, $ on the upgrade steps, tech preset from goal + budget); beginner setups + gate mode (plan lane E);
style tiles (plan lane F); wire stockingOf (stockingMemo / stockingLine / stockingDetail) into the demand panel and the wizard;
then the long list: plant propagation step 2, cling / perch leftovers (tree frogs share the gecko limb-spot miss), re-record the ~70 changed
models on /review.html (and its drawImage error), TG leftovers (heater product price in the cost, filter catalogue like the heater one, bundles matched to exact products, HOB body into the wall at the default 50 mm gap), TM/SE follow-ups in their archived sections, snake tongue, PNG import, reusable saved groups; LAST: build.ts / panels.ts splits with nothing else running.

Gotcha: the dev server reads the build number at start-up; restart it after merging main and before pressing Record.

## Lane sections (current)
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
- **Path 1, animal-first, mapped (2026-10-20):** 1 pick the animal (3D) -> 2 what it needs (card) -> 3 space / time / budget -> 4 does it fit? (hard truths; no = fork card, swap returns to 2) -> 5 tankmates (optional, ranked by compatibility) -> 6 three finished tanks (cheapest / least work / balanced) -> 7 make it yours (look free, gates hold) -> 8 the plan (verdict, list traced to needs, one-line cycle note). Open: space input (sliders + sofa for scale?), step 6 tanks come scaped? (tankmates: settled, on the count screen)
- **Count picker at step 1-2 (Nathan 2026-10-20):** choosing an animal suggests a group size (minimum, maximum or sex ratio) and the smallest tank FOR THAT COUNT, shown right away. The user sets the number they had in mind; the min / max note sits on the picker, graded in bands with their own messages (dwarf frog: 1 avoid, lonely; 2-4 doable; 5-6 good; 7+ great, needs a bigger tank), and the smallest tank updates live with the count. Species usually sexed in the hobby (aggression, breeding: livebearers, bettas, apistos, rams) get separate male / female counts with ratio advice. Habitat limits shown on the same card: dwarf frog = shallow water (they surface for every breath, roughly 30-45 cm max) and gentle flow. Data today: CARE has one `group` minimum, `solo`, a fixed `minL`; NEW data per species: count bands + messages, sex ratio + "usually sexed", max water depth, flow tolerance (and later lid / jumper); minL becomes count-dependent via the stocking engine's SPACE limit. Numbers need sources (research lane).
- **Tankmates on the same screen (Nathan 2026-10-20):** the count card asks "other animals in with them?"; yes = suggested tankmates (ranked by compatibility, each with its own count picker) and an updated recommended size, given as FLOOR AREA (length x width) more than volume: bottom dwellers and frogs share the floor, swimmers need length, and depth is capped for some (dwarf frogs). This merges step 5 into step 2; steps 6-8 follow. Engine gap: SPACE is per litre today; a floor-area answer needs each species' zone (bottom / middle / top) and minimum length.
- **Growing preview tank (Nathan 2026-10-20):** stocking comes first, so the animals appear in the viewer as they are added, in a bare tank (glass, sand) that steps up through the common sizes in the tank catalogue as the stocking needs more floor area (smallest size meeting floor area, length and any depth cap), labelled "About a 20 gal long (76 x 30 cm)". Proposed with it: the next step shown ("room for 1 more here" / "1 more frog = 29 gal"); the user's space (from step 3, or asked first) drawn as a dashed outline, so outgrowing it is visible and opens the fork card; live cost and effort (setup $ from cheapest to balanced gear for that size, minutes a week from the demand model) so they shape the stocking. Open: this is a span of builds, not the uncertainty range DS removed (2026-10-19, one expected number); Nathan to confirm a "from $X to $Y" span is fine here.
- **Plants vs stocking (Nathan 2026-10-20: "space is space"):** plants never add room. They take up nitrogen (fewer / smaller water changes, which the stocking engine already models as its FILTRATION limit only, never SPACE) and give cover (less stress for shy fish; rock and wood break lines of sight for territorial ones). Proposal: show the plant effect as water changes and minutes a week, and cover as lower stress risk, not as "stocking headroom".
- **Gates (proposal, Nathan agreed to the six user types; gate kinds still to settle, after the paths):** hard truths (eaten, temperature, outgrows) always shown, override by "I understand"; fit (skill, light, effort, budget) gray in guided paths, badges in Sandbox; taste = suggestions. Every gate says why and what unlocks it, with its cost. Shopping list traces each item to the need it serves (gear no need asks for = overspend, a need with no gear = underspend).

## Lane TG: menu focus + Show boxes (2026-10-20, branch `techgear`, port 5833)
Nathan 2026-10-20: drag only what the open menu covers; a Show box per kind of thing; keep the fade as the hint of what is draggable.
- Drag gate: gear moves (drag, Shift+wheel lean) only while Tech is open, like pieces (Hardscape / Plants) and animals (Animals): `canPick('gear')` in interact/pointer.ts, `pickSec` in new `render/menuFocus.ts`, used by main.ts.
- Menu focus: while Tech / Animals / Hardscape / Plants is open, its things are drawn as they are and the rest fades 55 % toward the room (viewer.ts drawFocus, the painted-patch fade, no rebuild). Tech = gear + light fixture; Animals = fish, herps, corals; glass, water, ground, room never focus. Not in PNG exports or thumbnails (`exporting`). Off while the panel is hidden. Hook: one line in panels.ts's section toggle sets `viewer.menuFocus`.
- Show boxes (Viewer menu): Animals, Plants, Hardscape, Equipment (= the old Show equipment). Unticked ones are left out of the view and exports, and cannot be picked (`viewer.hidden`, `isHidden` in hitTest). Per viewer, localStorage `tanklook.hide`.
- Tests: test/menuFocus.test.ts. Shared files touched: viewer.ts, panels.ts (show boxes block + toggle line), pointer.ts (2 lines), main.ts (1 line), index.html, style.css (3 lines).


## Lane SE: our own stocking engine, load vs capacity (2026-10-19, branch `stocking`, port 5843)
**Step 1 DONE (probe).** Mesh volume from the 3D fish loft works but is only about 2x accurate vs FishBase length-weight (goldfish 4.8x heavy, guppy 0.29x, pleco 2x, swordtail 0.22x). **Nathan's decision 2026-10-19: mass = FishBase length-weight for EVERY species (shrimp, snails, herps: keeper-reference estimates, `src: estimate`); the model volume is only a cross-check that flags outliers.**
**Steps 2 + 3 DONE (engine, calibration; UI is step 4, not started).**
- `scripts/lw-sources.json` (FishBase a, b per species; 50 of 60 fish fetched by Haiku agents from fishbase.se species summary pages, all Bayesian body-shape estimates except goldfish, a measured Florida row) -> `node scripts/body-mass.mjs` -> `src/data/bodymass.json` (a, b, src, `model` = 3D mass / table mass, `flag` outside 1/1.6..1.6: 22 species flagged, listed by the script). `src/data/bodyvolume.json` = the loft volumes (cm3 at species length), rebuilt with `GEN_BODYVOLUME=1 npx vitest run test/bodymass.test.ts`; `scripts/body-volume.ts` copies fish3d.ts sections() (not exported): keep in step, the test fails on drift.
- `src/scene/stocking.ts`: `massG`, `metClass` (messy/active/normal/sedentary/grazer/shrimp/shell/herp; by id, else by category), `tempFactor` (Q10 2, 25 C), `loadOf`, `animalLoad`, `litresPerAnimal`, `capacityOf` (litres x LU_PER_L 0.3 x `stockCapacity` (tech.ts) x live-plant factor up to +25 %), `stockingOf(S)` -> {percent, load, contributors, capacity parts, reasons, fixFilter}. Land animals are not counted; salt fish x1.5. Water temperature = `heatLoss(S).targetC`.
- `starter.ts`: `litresFor` is now `litresPerAnimal` (load / LU_PER_L); the bottom-of-range keep uses floor (cheap small fish make a Few set 30+ animals). Before/after counts per starter: `research/stocking-calibration.md`. Full stop reads about 55-65 % in our engine (plants, filter, group slack); the 11 starters keep their species, counts differ a little (fewer cory / pleco-type, more small tetras).
- Known tension for Nathan: mass^0.75 weights bottom feeders (cory 7 g, pleco 27 g by FishBase) more than AqAdvisor does; corydoras are set 'sedentary' to compensate. Swordtail (table 20 g vs model 4.5 g) is the worst outlier: likely the Bayesian a is too fat for a swordtail.
- **Step 4 DONE (UI, pictures to Nathan = step 5, waiting):** sidebar `#stkRow` (percent, `#stkWhy` reason, `<details id=stkList>` contributors; `syncStocking` in panels.ts, also refreshed from the draw callback when the tech / water / plants change), the split-view label chip now shows our percent with the breakdown in its tooltip (`aqChip`), the AqAdvisor row is relabelled as a comparison (Check only when the site is up, link kept), aqadvisor.ts demoted by comment. `stockingMemo / stockingLine / stockingDetail` exported for the demand panel and the wizard (not wired). Picture: research/stocking-line.jpg.
- **Space vs filtration (Nathan 2026-10-19: keep AqAdvisor's split):** `Stocking` has `spacePercent` (load / litres x LU_PER_L x SPACE_ROOM 1.5, no filter) and `filtrationPercent` (load / the same x filter x plants); `percent` = the larger. Reasons say when only more water helps (space over 100) vs a filter. The panel details list leads with both numbers.
- **AqAdvisor comparison RUN 2026-10-20 (site back up; probe via scripts/aq-compare.mjs, 24 combinations, results research/aq-compare.json / .md).** Finding: AqAdvisor's stocking level (its SPACE figure) grows like mass^0.45 (about length^1.4-1.75), metabolism does not show, scatter about +-40 % (sdlog 0.35, species-specific on their side); our first model (mass^0.75 x metabolism) overrated big fish 2-4x (oscar 4x, peacock 2x, discus 2x) and underrated small fish 3x (neon, betta, guppy, rasbora). Fix landed: SPACE now = sum mass^0.45 / (litres x SPACE_PER_L 1/4.242), fitted so the median of ours / AqAdvisor is 1.00 (7 combinations ours >10 % high, 11 >10 % low); FILTRATION keeps waste = mass^0.75 x metabolism x Q10 (LU_PER_L 0.3 unchanged, so starters are unchanged; median filtration / space is 1.1 at a standard filter). Not probed: AqAdvisor's filtration figure (the page text with the filter chosen was not captured; the saved sentences are page script, ignore). Contributor shares are of whichever limit binds.
- **NEXT (lane SE2, prompt `prompts/lane-SE2-species-calibration.md`, 2026-10-20, Nathan not yet agreed to step 3 wiring):** (1) probe AqAdvisor one species at a time and fit per-species / per-class space factors (scatter now +-40 %, target about +-15 %); (2) probe the filtration figure with a filter chosen (Claude in Chrome) and fit only if off by over 25 %; (3) re-check the starters at the Full stop (read 55-65 % before the space fit) and wire stockingOf into the demand panel / wizard only on Nathan's yes. Worktree ../Glass-Box-stocking, branch stocking, port 5843.
- **SE2 step 1 DONE 2026-10-20 (per-species space factors).** 54 single-species AqAdvisor probes (55 gal, filter Choose, count sized to ~100 % of ours, up to 20; test/aqspecies.test.ts -> scripts/aq-compare.mjs; answers in research/aq-compare.json, fit rows research/fit.tsv). Factor = AqAdvisor % / our % per species, stored in `src/data/spacefactor.ts` (rebuild: scripts/space-factors.mjs; one row per species with why; class fallback tiny <2 g 1.47, mid 0.93, big >30 g 1.45, invert 0.48, amphibian 0.56). Engine: `spaceFactor`, `Contributor.spaceFactor`, detail line says "counted 1.4x for space". SPACE_PER_L 1/3.96 re-centres the mixed set. Re-check on the 24 mixed combinations: median ours/AqAdvisor 1.00 -> 0.99, scatter (sdlog) 0.39 -> 0.29. Five worst after: 1 betta in 10 gal 0.40, 20 chili + 10 amano 2.07, 6 harlequin + 6 panda cory + kribensis 1.56, 30 neon 1.53, 12 guppy 1.44. Why not tighter: AqAdvisor's percent is not linear in count (a lone betta costs 41 % in 10 gal, 20 bettas 59 % in 55 gal; per-neon cost falls from 10 % to 7 % as the school grows), which a per-species multiplier cannot fix. Recheck script: research/recheck.test.ts.txt.
- Open: Nathan's verdict on the calibration (Full stop reads 55-65 %), outliers (22 flagged), whether to wire the wizard / demand panel.

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
