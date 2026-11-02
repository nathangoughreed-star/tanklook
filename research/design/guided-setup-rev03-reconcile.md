# Guided Setup Rev 03 reconciled against the code (lane GS1, 2026-11-02; docs only; code read at origin/main 8c5a7fe4, live build 1582)

Answers section 10 of `research/design/guided-setup-rev03.md` (the spec) by file and function. Rev 02 / VD1-VD6 stay in force (taxonomy, support
levels, curated pictures to Family, renders of the user's enclosure from Archetype, Balanced first, density never raises stocking).
Screenshots of the live screens: `research/design/gs1-shots/` (01-world, 02-animals-screen, 03-owned-gear, 04-limits).

## 0. Verdict in one table

| Goal (spec 10) | Code today | Verdict |
|---|---|---|
| 1. Two entry paths | One path: Discovery (World, Water, Family, Look, Density) plus an "I already know my animals" link that opens the old stocking screen | Restructure: a Starting Point screen after shared onboarding; both routes become one shell |
| 2. Existing tank in shared equipment onboarding | Owned gear sheet (`ownedGear.ts`) is reachable from the New dialog link and the brief bar, not from Guided; an owned tank is always LOCKED | Reusable UI, conflicting semantics (no Required vs Available) |
| 3. Equipment and constraints fast / skippable | Both are optional panels, but there is no "skipped" state, and the limits panel is the full 7-section form | Reuse fields, add a short form and a recorded skip |
| 4. Keep the taxonomy | `scene/archetypes.ts`, `discovery/logic.ts` | Keep as is. One add: world "Open to anything" |
| 5. Renders from Archetype | Done (VD6): `discovery/tiles.ts` `Previews`, `tankChoice`, `previewOf` | Keep. Extend `tankChoice` with max space (GS3) |
| 6. One project, one editor | Brief (`scene/brief.ts`) + `Vision` + the active tank is already the project; two exits from the animals screen still bypass Discovery (P6 builds / scape pick) | Mostly there; needs a Project read model (GS2) and one exit |
| 7. Keep info, re-evaluate on change | `keepCompatible` keeps picks inside Discovery only; `finish()` REPLACES the scene; nothing re-evaluates a scene when a brief item changes | Biggest gap (GS6) |

## 1. What the flow is today (build 1582)

- Entry: New dialog (`index.html:62-70`, `startMode.ts:60-112`) -> "Start guided" `modeGuided` -> `host.guidedNew()` (`panels.ts:312`: clean tank + empty brief
  after the NW1 warning) -> `welcome.show()` -> `attachDiscovery(...).open()` (`welcome.ts:16-20`, `discovery/screens.ts:269-275`).
- Discovery dialog (`screens.ts:41-277`): rail `World > Water > Family > Look > Density > Make it your own` (`logic.ts:21-26`, `drawRail` `screens.ts:74`), picks
  saved live in `brief.vision` (`screens.ts:71`), Back / Next, links row (`screens.ts:49`): "I already know my animals", "Switch to Sandbox", deals, starters.
  `finish()` (`screens.ts:217-233`) replaces the active tank with the recipe scene and closes: the editor opens.
- Animals today: the link calls `host.stocking()` = `$('startAnimal').click()` (`panels.ts:289`) = `attachStockPlan` (`stockPlan.ts:47`): a side panel + gallery. It writes the
  roster to the brief LOCKED (`toBrief`, `stockPlan.ts:283-284`). On close of that panel Discovery shows a dock "Next: pick the look for these animals"
  (`screens.ts:52`, `:258`), and `open()` re-reads the roster (`knownNow`, `screens.ts:64-68`; `knownOf`, `logic.ts:50`) so World / Water answer themselves
  and archetypes that cannot hold the animals are hidden (`fits`, `logic.ts:76`). BUT the same panel also has "Continue: ways to build it" (`stockPlan.ts:270`, `:313`)
  that goes to the old P6 three-builds screen (`buildPick.ts`) and scape pick (`scapePick.ts`), which never touch Discovery. Two exits, so Animals First is not one route today.
- Owned gear: `ownedGear.ts` (tick Tank / Light / Heater / Filter + Stand; per item the exact product or generic; `applyOwned` `:51-71` writes it into the TANK as `owned:true`
  units / light, `recordOwnedTank` `:75` writes `constraints.existingTank` LOCKED). Opened from the New dialog link `modeOwned` (`startMode.ts:107`) and the brief bar
  (`briefBar.ts:50`, `panels.ts:307`). Not part of Guided. `mountOwnedSheet(store, host, root, opts)` (`:79`) is already mountable into any element.
- Limits: `limitsPanel.ts` = `attachWelcomeGuard` (`welcomeGuard.ts:15-59`: money, time, space, tank size, room temp, water, desires, adapt, experience, owned chips) + set-up hours.
  Every limit is a range (GV8). Also opened from the brief bar. Not part of Guided.
- Brief (`scene/brief.ts`, v3, `:109`): items with `status` hard / preference / locked, `off`, `flex` (`:23`, `:168`); `LimitItem` min/max (`:26`); `Vision` (`:86`: environment, waterType, familyId,
  archetypeId, density, densityStop, secondaryLikes, renderRecipe); `dialog.answered` (QId list, `:81`) for questions answered with "no limit". Saved per tank (`TankSetup.brief`),
  undo-safe. Generator reads it through `briefToWants` (`:360`).

## 2. Spec sections 2-6, step by step

### Step 1: World ("Aquarium / Terrarium / Paludarium / Open to anything")
- (a) Code: `ENVIRONMENTS` has exactly the three cards (`archetypes.ts:61-65`); `envChoices` (`logic.ts:95`) prunes by roster; `setPick` env (`logic.ts:127`); picture tiles `cardTile` (`screens.ts:81`).
- (b) Reuse: tiles, `setPick`, `keepCompatible`, `Vision.environment`.
- (c) Restructure: add a fourth "Open to anything / Not sure yet" card that records "world left open" (proposal: `Vision.world: Env | 'open'`, or `environmentOpen: true`; GS2 decides). It must NOT be a project type.
  Meaning by route: Animals First resolves it from the animals (`knownOf.env`); Look First inserts the existing World step (all three worlds, curated pictures) before Water, so the person still
  decides the world, just later. Water is dropped from this step: it is a Look First step 1 and an Animals First inference (`stepsOf`, `logic.ts:119`).
- (d) Conflict: the Discovery rail today STARTS with World and Water; under Rev 03 World moves to shared onboarding and Water moves into Look First only. `STEP_LABEL` / `VSTEPS` are rewritten by GS3 (Look First tail) and by the GS4 shell (breadcrumbs).

### Step 2: Existing equipment
- (a) Code: sheet above; stand + "do you need a stand" (`ownedGear.ts:43`, `setNeedStand` `setupBrief.ts:114`); supplies / accessories exist only as chips in `welcomeGuard.ts:37` (`OWNED_CHOICES` from `OWNED`, `demand/suggest.ts:85`: filter, heater, light, skimmer, flow, lid, stand, testkit, dryheat, siphon, net, conditioner, thermometer, bucket) and as `constraints.owned: OwnedMap` (key -> pick: `PICK_CARE` / `PICK_UNKNOWN` / product id, `suggest.ts:74`).
- (b) Reuse as-is: `mountOwnedSheet` (mountable), `applyOwned`, `recordOwnedTank`, `pickTank` (`panels.ts:301`), the OwnedMap chips, `ownedAssess` crediting ($0 "you have", `suggest.ts:114`).
- (c) Restructure: (1) a per-item use flag: Required / Available. Nothing carries it today. (2) "Starting from scratch" and "Skip for now" actions (the sheet's Done is disabled until something is ticked: `ownedReady`, `ownedGear.ts:44`). (3) Tank + dimensions: the sheet's tank row borrows the full tank picker dialog (`pickTank`), heavy for a fast step; a compact "tank size / custom dimensions" row is wanted. (4) Supplies and accessories use the chips, the hardware uses the sheet: two UIs in one step.
- (d) Conflicts: (i) an owned tank is written LOCKED (`recordOwnedTank`, `ownedGear.ts:75`) and `briefToWants` turns it into `Wants.ownTank` WITHOUT looking at status (`brief.ts:374-378`), so the generator offers only setups that tank holds, which is "Required" semantics for every owner (`suggest.ts:297`, `:445`, `:118`). Spec: ownership alone never locks. "Available" (savings counted, alternatives may be recommended) has no generator support (needs a `Wants.availTank`-style hook in `demand/suggest.ts`, a U2-owned file: separate lane, see section 5). Same for gear: owned units are kept (`keepSet`) and credited; the generator never offers a different heater/filter for an owned one. (ii) VD5 moved owned gear + limits OUT of Guided into Make It Your Own panels (`welcome.ts:1-4`); Rev 03 moves them back in as primary entry, with the panels staying for revisiting. (iii) The New dialog's "Starting from something I have now" link (`index.html:70`, `startMode.ts:107`) opens the sheet WITHOUT Guided; under Rev 03 it should open Guided at Equipment.

### Step 3: Constraints ("What should we work around?")
- (a) Code: money (budget, monthly), time (careMin, setupHours), space (maxSpace footprint + tankGal range), experience (`preferences.experience`), room / water, desires, adapt: all exist as brief items (`brief.ts:46-69`) with UI in `welcomeGuard.ts:26-38`, and a per-item "willing to change" checkbox (`flex`, `welcomeGuard.ts:19`).
- (b) Reuse: every brief item, `rangeOf` / `setLimitBound` / `setSpace` / `setExperience`, `limitText`, `summarise`.
- (c) Restructure: a SHORT form with the six spec items only (space, startup budget, ongoing budget, setup time, maintenance time, experience) and a prominent "Skip for now"; room temp, water, desires, adapt stay in the revisit panel. "Maintenance time / care rhythm" = `constraints.careMin` ("min a week", a field with no derived model yet, unified plan "Open items"); "setup time" = `constraints.setupHours`, which `welcomeGuard.ts:28` still says "is coming" while `limitsPanel.ts:19` adds it.
- (d) Conflicts / gaps:
  1. UNKNOWN vs skipped. An absent item already means "no ceiling" to the generator and nothing is assumed, so unknown-is-not-zero holds. But "never asked" and "skipped" cannot be told apart, and the person is never told which provisional assumptions TankLook used. Needs a recorded skip (`dialog.answered` can carry step ids; GS2 chooses) and an assumptions list ("no budget ceiling assumed", "tank suggested: 20 gal", `tankChoice.why`, `tiles.ts:31-43`).
  2. HARD vs FLEXIBLE. `status:'hard'` + `flex` exists as data, and NOTHING reads `flex` (grep: only `brief.ts` defines it and the checkbox writes it). The generator treats every cap as a hard filter (`capItem`, `brief.ts:333`). The GV8 note retired `target`; a narrow range is the "target" idiom. So "flexible target" needs either generator support (rank instead of filter; `Wants.startupTarget` exists, `suggest.ts:325` `targetBonus`, and `briefToWants` already sets it from the middle of a band, `brief.ts:389`) or a plain mapping: flexible = shown, ranked, never filtering, over-limit allowed with a warning.
  3. Experience is stored as a `preference` and is context only (`welcomeGuard.ts:36`): matches the spec.
- Existing but not in the spec: `nextQuestions` / the bar's "n to ask" (`setupBrief.ts:165`, `briefBar.ts:44-50`) are progressive questions that overlap the new onboarding; with onboarding asking space and time up front they should stay quiet for steps the person skipped on purpose (use the recorded skip).

### Step 4: Starting Point (the one branch)
- (a) Code: none. The nearest are the New dialog's two cards (Guided / Sandbox, `index.html:66-80`) and Discovery's links row (`screens.ts:49`).
- (c) New screen with two equal cards, Animals First / Look First, with the spec's two sentences. The links row (Sandbox, deals, starter tanks) is outside the branch: keep it as a footer on World only (assumption, section 7).
- (d) Conflict: "I already know my animals" (`screens.ts:49`, `:258`) disappears as a link; its job becomes the Animals First card. The dock (`screens.ts:51-53`, `:263-266`) is the mechanism that returns from the animals screen to Discovery and is reused by GS5 until the route is a single shell.

### Animals First (spec 3)
| Spec step | Code today | Status |
|---|---|---|
| 1. Choose animals (search / browse, species + counts) | `stockPlan.ts` + `stockGallery.ts` (search `searchSpecies`, gallery by kind, counts `bump`, sexes `sexFish`, pairing); roster saved LOCKED `toBrief` (`:283`) | Reusable; a side panel with side effects (see below) |
| 2. Compatibility and feasibility | `stockPlanLogic.ts`: `planFor` `:301`, `conflictsOf` `:170`, `notesOf` `:112`, `rosterWarnings` `:466`, `forkOptions` `:375`, `budgetGap` `:413`, `laterOf` `:327`; `evaluateAnimals` (`briefFeasibility.ts:31`) against the budget; welfare is a gate, never a toggle | Done; surfaced inside the animals panel, not as a named step with the spec's "explain with viable adjustments" (it does: `applyRosterFix`, `RosterFixOp`) |
| 3. Establish an enclosure (existing if appropriate, else recommend) | `planFor(...).tank` / `.need.tank` = smallest catalogue tank; `chosen` pick (`stockPlan.ts:64`); owned tank kept through `kept` (`stockPlan.ts:333-340`) | Reusable; recommendation exists, "keep owned if it fits" exists, owned-Available vs Required does not |
| 4. Compatible aesthetics | Discovery with `known` roster: `fits` / `familyChoices` / `archetypeChoices` prune by env, water, chemistry, temperature, min gallons (`logic.ts:76-106`) | Done (VD3) |
| 5. Archetype + density with the animals | `inHand()` + `previewOf(a, tank, inHand)` keep the roster, tank and gear and redraw only the scape (`tiles.ts:63-72`); `sceneFor(inHand)` does the same at the hand-off (`logic.ts:213-221`); `lookWithAnimals` (`looks.ts:56`) is the older equivalent | Done, but `inHand` is read from the tank store (`screens.ts:90`), so the animals must already be IN the tank, not only in the brief |
| 6. Make It Your Own | `finish()` (`screens.ts:217`) | Done |
Gaps: (1) `stockPlan.ts` `open()` REPLACES the whole scene (`store.replace(s)` `:344`) after rescuing gear in `kept` (`:327-343`): fine from the dock, hostile inside a shell that already holds an enclosure and owned gear. (2) The panel's two exits (Continue -> three builds -> scape pick = P6; "Open in the editor as it is") bypass Discovery. (3) `stockPlan.ts` is 393 lines of DOM + scene writes mixed together; GS5 has to split a mountable "roster picker" from the scene side effects. (4) Conflicts between the world the person chose and the animals (World = Aquarium, then a gecko): not handled; `knownOf` only infers FROM animals. Proposal: the catalogue is filtered by the chosen world (Open = everything); an explicit conflict is named with the viable adjustment, never silent. (5) Brackish is never inferred (`logic.ts:48`: no species carries the flag), so an Animals First brackish route needs the Water question; unchanged.

### Look First (spec 4)
| Spec step | Code today | Status |
|---|---|---|
| 1. Water type | `water` step (`logic.ts:98`, `waterChoices`) | Done |
| 2. Visual Family (curated) | `family` step, `famTile`, art slots `public/art/discovery/<id>.webp` | Done |
| 3. Archetype (renders, Balanced) | `archetype` step with `Previews`, tile `shot` at stop 2 (`screens.ts:83-86`, `:98-103`) | Done |
| 4. Density (archetype-specific) | 5-stop slider over `recipeDensAt` with per-archetype labels / notes (`screens.ts:104-131`, `recipes.ts:144-150`, `:414`) | Done; spec's 3 named levels are the slider's 0 / 2 / 4 |
| 5. Suitable Animals | None as a step. Pieces: `focalAnimals` (one headliner, `recipes.ts:165`), `STYLES[look].animals`, `rankTankmates` (`stockPlanLogic.ts:224`), the look-first Suggest generator | MISSING (GS3 builds it) |
| 6. Make It Your Own | `finish()` | Done |
Provisional enclosure: `tankChoice` (`tiles.ts:31-43`): owned tank -> user's pick -> smallest catalogue tank that fits every drawn archetype, the tank-size floor (`constraints.tankGal` min) and known animals; labelled "suggested tank" with a selector (`screens.ts:151-158`). The spec also wants known SPACE (maxSpace) and, when nothing is known, "an editable example enclosure": the first is missing from `tankChoice` (small change, GS3's `tiles.ts`); the second is what the fallback already is. Terrariums / paludariums already use their own families (`familiesOf`). The coming-soon behaviour (Reference / Coming soon panel, `drawPanel` `screens.ts:197`, `addLike`, `alternativeOf`) is untouched.

### Shared project state (spec 5)
What exists vs the spec's list:
| Spec item | Where it lives today | Gap |
|---|---|---|
| world / environment | `Vision.environment` | no "open" |
| water type | `Vision.waterType` | ok |
| existing equipment + required flag | `constraints.owned` (map), `constraints.existingTank`, gear `owned:true` in the scene (`TankSetup.light.owned`, `tech` units) | required flag; owned supplies vs gear split across two places |
| constraints + hard / flexible / unknown | limit items (`status`, `flex`, `off`) | unknown vs skipped; `flex` unused |
| selected animals | `animals.stock` (locked) + `tank.fish` | two copies, kept in step by `toBrief` only on the stocking screen |
| enclosure | `equipment.tank` (preference) / `existingTank` (locked) / the scene's tank | provisional vs owned vs suggested is `TankChoice.source` (UI only), not saved |
| family, archetype, density | `Vision` | ok |
| generated scene configuration | `Vision.renderRecipe` + the scene | ok |
| remaining decisions | `nextQuestions` (U3) | not the Rev 03 step list |
| unresolved feasibility issues | `stockSummary`, `sandboxFlags`, `consequence` | not stored; recomputed on demand |
So GS2's `project.ts` is a READ MODEL over brief + vision + scene (see section 4), plus a few new saved fields; it does not need a second store.

### Make It Your Own (spec 6)
Exists: the editor, the brief bar with chips, the owned panel, the limits panel, Report, Suggest "Fill in what I left open" (`briefBar.ts:20-98`). What the spec adds: change enclosure / equipment from the same place and see re-evaluation. The pieces for re-evaluating exist but are not connected: `onSpaceFork` / `forkOptions` (space vs animals), `applyAlternative` / `Infeasible` (`demand/infeasible.ts`), `applyRosterFix`, `consequence` (cost vs limits), `variationsOf` (GV6). None runs when a brief item changes; `finish()` is a one-way replace. No primitive re-lays hardscape when the tank dimensions change (`recipeBase` draws a fresh scene in a new tank, losing manual edits: GS6 must check what `store` does on a tank resize before promising "adapt the scene").

## 3. Conflicts with the current flow (consolidated)
1. Rail: Discovery starts at World / Water; Rev 03 puts World, Equipment, Limits, Starting Point first and Water only in Look First.
2. "I already know my animals" link vs the Animals First card; two animal exits (dock vs P6 builds / scape pick).
3. VD5 moved owned gear + limits to panels; Rev 03 wants them in Guided first, panels kept for revisiting.
4. World has no "Open to anything"; Water is asked before the route is known.
5. Owned gear: no Required / Available; an owned tank is locked and always required by the generator; owned gear is always kept.
6. Limits: no unknown vs skipped; `flex` data is dead; every cap is a hard filter.
7. `nextQuestions` / "n to ask" would re-ask what onboarding skipped on purpose.
8. `stockPlan.open()` wipes the scene; `finish()` replaces the scene: neither is compatible with "keep the design and re-evaluate".
9. Naming: Discovery's rail calls the archetype step "Look" (`STEP_LABEL`); the spec says Archetype, and "Look First" is the route name; the old look picker (`lookPick.ts`) is a different thing. UI copy only.
10. The New dialog "Starting from something I have now" link bypasses Guided.
11. Tests that will need updating by their lanes: `test/discovery.test.ts` (steps, firstOpen, settle), `test/ownedGear.test.ts`, `test/newTank.test.ts`; `test/discoverytiles.test.ts` and `test/setupBrief.test.ts` if `tankChoice` / setters change; no test covers the shell yet.

## 4. What GS2 and GS3 must expose

**GS2 (`src/scene/brief.ts`, new `src/scene/project.ts`, pure, no DOM; saved inside the brief so share links and old saves keep parsing, `parseBrief` stays the validator):**
1. A Project read model `projectOf(brief, scene?)`: world (Env | 'open'), water, route ('animals' | 'look' | undefined), onboarding step states (`world|equipment|limits|start`: pending / done / skipped), equipment items each `{ key, kind: 'tank'|'gear'|'supply', product?, use: 'required'|'available' }`, limits each `{ id, state: 'unknown'|'hard'|'flexible', range }`, animals, enclosure `{ model?, source: 'owned-required'|'owned-available'|'suggested'|'provisional'|'picked' }`, vision, `assumptions: string[]`, `remaining: Step[]`.
2. Setters (so no UI lane edits `setupBrief.ts`): `setWorld`, `setRoute`, `markSkipped(step)`, `setOwnedUse(key, 'required'|'available')`, `setLimitKind(id, 'hard'|'flexible')`, plus mapping notes: Required tank -> `existingTank` locked (today's behaviour); Available tank -> a new status or item (not `locked`); `briefToWants` must stop emitting `ownTank` for Available (`brief.ts:374-378`).
3. Brief version bump (v4) with parse tests; `BRIEF_VERSION` is `brief.ts:109`; no scene SCENE bump.
4. `reevalInput(before, after)`: a pure diff naming which project fields changed (GS6 consumes it).
Not GS2: the generator's treatment of an Available tank / gear (`demand/suggest.ts`, U2's file); flag a follow-up lane (section 5) rather than editing it from GS2.

**GS3 (`src/ui/discovery/*`):**
1. A mountable module: `mountDiscovery(store, host, root, opts)` returning `{ destroy }`, rendering into `root` with NO own `<dialog>` and NO own rail; `opts = { route: 'look'|'animals', roster?: AnimalCount[], tank?: TankModel, onCrumbs(steps, current), onExit(kind) }`. `attachDiscovery` stays as a thin wrapper that builds its own dialog from it, so main keeps working until GS4 swaps it in.
2. Roster and tank as parameters, not read from the store: `knownNow` (`screens.ts:64`) and `inHand` (`:90`) read `store.tank` / brief today; in Animals First the animals live in the roster the shell passes. `Known` and `knownOf` already take a plain roster + gallons.
3. Step vocabulary exported from `logic.ts`: `lookFirstSteps` (Water, Family, Archetype, Density, Suitable Animals) and `animalsFirstSteps` (Family, Archetype, Density, with water auto-answered), with labels for the breadcrumbs (spec 8: after the branch only the route's steps; Water hidden when resolved).
4. `tankChoice` takes `maxSpace` (footprint from `constraints.maxSpace`), and returns `source` including 'owned-available' vs 'owned-required' (use the owned tank for the pictures either way; only Required locks it).
5. "Suitable Animals" as a step: a card list from `STYLES[look].animals` + the archetype's FOCAL + `rankTankmates` for the shown tank, with suggested counts at group minimums, all optional ("Skip: I'll choose animals in the editor"), result written as unlocked suggestions, NOT as `lockAnimals` (final stocking not required before the editor, and visual density never raises stocking).
6. `onExit('editor')` is the ONLY place `finish()`-style scene replacement happens; the shell never calls it.

## 5. File-ownership plan for the queued UI lanes

Rule: a lane edits only its own files; any other file is a one-line hook and the lane says so in its HANDOFF section. `src/ui/style.css` and `src/ui/panels.ts` are the two shared hazards (single hook lines / own block each).

| Lane | Owns (new unless noted) | One-line hooks only | Reads (exposed by) |
|---|---|---|---|
| GS4 shared onboarding shell | `src/ui/guided/shell.ts` (the one dialog, breadcrumbs, Back, Skip, route handoff), `guided/worldStep.ts`, `guided/equipmentStep.ts`, `guided/limitsStep.ts`, `guided/startStep.ts`; edits: `src/ui/welcome.ts` (attachWelcome mounts the shell), `src/ui/ownedGear.ts` (Required / Available toggle per item, "Starting from scratch" / "Skip"; the sheet is already mountable), `test/guidedShell.test.ts`, the `.gs-*` block of `style.css` | `panels.ts` (host wiring at `:287-292`, `:310-313`), `startMode.ts:107` + `index.html:70` (owned link opens Guided at Equipment), `welcomeGuard.ts` untouched (short form is built from the same setters) | GS2 `project.ts` setters; GS3 `mountDiscovery`, step vocabulary |
| GS5 Animals First route | `src/ui/guided/animalsFirst.ts` (roster -> compatibility -> enclosure -> hands to `mountDiscovery({ route:'animals', roster, tank })`), `src/ui/stockPlan.ts` (split out an embeddable roster picker; drop `store.replace` and the P6 exits when embedded; keep the old side panel for Sandbox / direct use), `src/ui/stockGallery.ts`, `src/ui/stockPlanLogic.ts` (only if a new pure helper is needed), `test/animalsFirst.test.ts` | `buildPick.ts` / `scapePick.ts` (only to keep them out of the embedded route), `panels.ts` (`stocking:` host) | GS4 shell mount point; GS3 roster / tank params; GS2 enclosure source |
| GS6 revisit + re-evaluation | `src/scene/reeval.ts` (pure: before / after project + scene -> conflicts, kept pieces, adapted scene), `src/ui/guided/revisit.ts`, `src/ui/briefBar.ts` (breadcrumb / "revisit this step" chips), `src/ui/limitsPanel.ts`, `src/ui/briefFeasibility.ts`, `test/reeval.test.ts` | `fullnessTile.ts` fork entry (reuse `onSpaceFork`), `ownedGear.ts` (reuse the GS4 toggle) | GS2 `reevalInput`; GS4 steps remount in the editor; existing `applyAlternative`, `applyRosterFix`, `variationsOf` |
| Follow-up (not queued): generator support for Available tank / gear, `flex` used for ranking | `src/demand/suggest.ts` (`Wants.availTank`, flexible limits as targets), `src/demand/infeasible.ts` | none | GS2 mapping; Nathan's answers to Q2, Q3 |

Ordering that keeps files disjoint: GS2 and GS3 now (their prompts are file-disjoint); GS4 after both (it mounts `mountDiscovery` and calls the GS2 setters); GS5 after GS4 (it needs the shell mount point and GS3's roster param); GS6 after GS5 (it re-runs steps from the editor). GS4 and GS5 both touch `panels.ts`: GS5 should only touch the `stocking:` line, GS4 the rest.

## 6. Reusable inventory (checked)
- `ownedGear.ts`: `mountOwnedSheet`, `applyOwned`, `recordOwnedTank`, `OwnedState` (the only piece already mountable). Needs: use flag, skip, scratch.
- `limitsPanel.ts` + `welcomeGuard.ts`: fields and setters reusable; the whole form is too long for onboarding.
- `setupBrief.ts` / `briefBar.ts`: `summarise`, `labelOf`, `limitText`, `setLimitBound`, `setSpace`, `setExperience`, `setOwnedKey`, `setTank`, `lockAnimals`; the bar stays the revisit surface.
- `discovery/logic.ts`: `knownOf`, `fits`, `settle`, `keepCompatible`, `setPick`, choices; `tiles.ts`: `Previews`, `tankChoice`, `tankOptions`, `previewOf`; `scene/recipes.ts`: `recipeBase` / `sceneAt` / `stopScene`, `focalAnimals`, `minTank`; `scene/archetypes.ts` registry.
- `newTank.ts` (`hasWork`, `confirmNew`): unchanged; New already starts clean (NW1).
- `startMode.ts`: New dialog and Sandbox flags unchanged; only the "something I have now" link is repointed.
- `welcome.ts`: becomes a 6-line host for the shell.
- Animals: `stockPlan.ts`, `stockGallery.ts`, `stockPlanLogic.ts`, `briefFeasibility.ts` (`evaluateAnimals`), `suggest.ts` / `demand/infeasible.ts`.

## 7. Assumptions made (tell the coordinator if wrong; none needs a picture)
1. Sandbox, deals / bundles and starter tanks stay reachable as a footer link row on the World step only; not in the branch.
2. Experience lives in the Limits step (the spec lists it under Constraints); it never filters.
3. The 5-stop density slider (VD6) already satisfies "Open & Airy / Balanced / Dense"; no change.
4. Ponds and patio tubs stay out of scope; Coming Soon behaviour unchanged.
5. Welfare stays a gate on every route; the Starting Point screen carries the existing "Welfare checks always apply" line.

## 8. Open questions for Nathan (pictures in `research/design/gs1-shots/`)

**Q1 (picture 01-world.png): what does "Open to anything / Not sure yet" do?** Today World has three cards. Recommendation: it defers the choice, never a fourth project type. Animals First resolves it from the animals; Look First re-asks the world (all three, curated pictures) right before Water. Alternative: Look First's Family step shows families from all three worlds at once (a cross-world browse): more discovery, but families, support rules and renders are all per world, so it is a larger change.

**Q2 (picture 03-owned-gear.png): default for a ticked item, and for the tank?** Today ticking Tank locks it and the generator then offers only setups that tank holds (Required behaviour for everyone); gear is kept and credited. Spec: owning never locks. Recommendation: every ticked item defaults to Available / flexible with a one-tap "Required: I want to use this", the tank included. Until the generator learns "alternatives may be recommended" (a follow-up lane), an Available tank is used for the pictures and the starting scene but nothing is recommended instead.

**Q3 (picture 04-limits.png): hard or flexible by default?** Typed limits are firm ceilings today; the "willing to change" checkbox is saved but no code reads it. Recommendation: typed values default to Firm (matches the 2026-10-28 budget-ceiling rule), with a one-tap Flexible per limit; Flexible = ranks designs and shows a warning when exceeded, never filters. Experience stays context only.

**Q4 (picture 02-animals-screen.png): Animals First and the "ways to build it" screens.** This panel's "Continue: ways to build it" opens three finished builds with prices (the P6 flow), a step Rev 03 does not have. Recommendation: in Animals First, Continue = confirm the enclosure and go straight to Family / Archetype / Density with the animals; the price tiers live in Make It Your Own (the report's minimum vs ideal). The three-builds screen stays reachable from the old Animals entry outside Guided. OK to drop it from the new route?

(The big-fish-showcase minimum, 75 vs 180 gal, is already open from the coordinator.)
