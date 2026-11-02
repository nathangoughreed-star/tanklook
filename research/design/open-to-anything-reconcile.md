# Open to Anything: Explore Complete Setups, reconciled against the code (lane OX1, 2026-11-02; docs only)

Answers section 11 of the spec (`research/design/open-to-anything.md`, Nathan 2026-11-02; the copy read here is the scratchpad `open-anything.txt`, same text) by file and function.
Code read at `origin/main` bf254538 (GS3 on main). GA1's generator work is on branch `ga1-available` (8a3d07bf, merged with main, not yet on `origin/main` when I fetched);
GS4 (`src/ui/guided/*`) and GS6 (`src/scene/reeval.ts`, `screens.ts` / `stockPlan.ts` edits) were still uncommitted in their worktrees, so I read their working copies and mark every GS4 / GS6 fact "in flight".
Rev 03 stays in force except Q1, which this spec REPLACES: Open to anything no longer defers the world. Rev 02 / VD1-VD6 (taxonomy, support levels, density never raises stocking) and the Rev 03 preservation invariants stay.

## 0. Verdict (spec section 11 items 1-8)

| # | Question | Short answer |
|---|---|---|
| 1 | What can be reused | A lot of the pieces, none of the loop. Reusable: `Wants`/`briefToWants`, gates inside `conceptMaker().attempt`, `selectDiverse`/`conceptDistance`, taste storage and decay, `Previews`/`recipeBase` renders, `buildsFor`/`demandOf`/`costLines`/`buildPlanOf`/`figuresOf`, `stockingSuggestion`, `makeItMine`, `library.ts`. Missing: a **pool** (the generator throws away everything but 3 proposals), a bridge from the **VD registry** (86 archetypes, 44 buildable, has paludariums) to the **demand generator** (23 concepts, no paludarium, no brackish), aspect-level taste, a candidate store, a batch loop. See 1. |
| 2 | Where snapshots live | A new browser-local **candidate store** (`src/explore/store.ts`, same pattern as `scene/library.ts`), one record per candidate: a full `TankSetup` snapshot + a frozen `estimate` + `provenance`. Only the small **taste profile** and the exploration state (route `explore`, batch counter, interpretation line) live in the brief. Not share links, not the scene. See 2. |
| 3 | Firm gating before presentation | The gates exist and already run before anything is shown (`attempt`: strict welfare rule, `compliance` on hard limits only after GA1). Gaps: they gate on the **mean**, no uncertainty; `Figure.conf` ("validated"/"provisional") exists but "no gate or score reads it"; care / setup minutes are **always provisional**. A policy decision is needed (Q1). See 3. |
| 4 | Required vs Available in the generator | **Works on `ga1-available`** (not yet on origin/main at my fetch): `Wants.availTank`, `requiredOwned`, `flexLimits`, `Proposal.tankSource/tankNote/warnings`. Verified by reading the diff and `test/available.test.ts`. Gap: an owned tank given only as custom dimensions is invisible to it. See 4. |
| 5 | Taste vs limits stay separate | They already are two different brief items (`preferences.taste` vs `constraints.*`), and taste is ranking-only by construction. The new aspect tags must be a **closed vocabulary with no money / size / time tag**; "Adjust constraints" is a separate button that calls `setConstraint`. See 5. |
| 6 | Candidate identity | Stable `id` = hash of a canonical **configuration key** (VD archetype, tank model, roster, density stop, seed, gear picks); `snapshot` is the truth, never re-derived; near-duplicates deduped by a distance on the same key. See 6. |
| 7 | Resets that block a non-destructive hand-off | `finish()` (`discovery/screens.ts:284`) and `open()` (`stockPlan.ts:327`, `store.replace(s)` `:344`). GS6 is fixing both in flight (`handOff`, `hasDesign`, `lookUnchanged`). Explore adds one new rule: **Make This Mine from a candidate is itself an update, not a replace**, and needs a snapshot-aware variant of `handOff`. See 7. |
| 8 | Plan, ownership, blockers, tests | Five stages, new files only (`src/explore/*`, `src/ui/explore/*`, `test/explore*.test.ts`), three one-line hooks, tests mapped to the 12 criteria. Blockers: render cost, brackish / paludarium / terrarium support, confidence policy. See 8. |

## 1. What exists, and what is missing (item 1)

### 1.0 The one structural finding: two registries, two pipelines

| | Visual registry (VD) | Demand generator |
|---|---|---|
| Where | `scene/archetypes.ts` (`ARCHETYPES` `:690`, `FAMILIES`, `ENVIRONMENTS`) + `scene/recipes.ts` (`recipeBase` `:342`, `focalAnimals` `:165`, `minTank` `:150`) | `data/archetypes.json` loaded as `ARCHETYPES` in `demand/suggest.ts:63`; `suggestSetups` `:412`, `generate` `:515`, `conceptMaker` `:429` |
| Size | 86 archetypes: FW 25, SW 20, BK 11, TE 16, PA 14. **44 buildable** (a mapped look: FW 18, SW 10, BK 5, TE 7, PA 4); 42 coming-soon | 23 concepts: freshwater 4, saltwater 1, terrarium herp 3 + arthropod 14, vivarium 1 |
| Worlds | aquarium / terrarium / paludarium, water fresh / salt / brackish | `Kind` freshwater / saltwater / terrarium / vivarium (`suggest.ts:54`): **no paludarium, no brackish** |
| Output | a scene that LOOKS like the archetype (render, density stops, one focal animal or none) | a priced, gated, welfare-checked `Proposal` (tank + gear + finish ladder + stocking) |
| Gates | none (recipes only check the focal animal fits: `focalAnimals`) | strict stocking rule, filtration, hard caps, owned credit, flexible ranking (GA1) |

A candidate in the spec needs BOTH: the look the user sees AND gated, costed numbers. Today they never meet except through `tiles.ts` `sceneWithAnimals` (`:76`: builds the roster's balanced `buildsFor(...)[2]` setup and lays the archetype's scape over it) and the editor afterwards (`briefFeasibility.ts` `consequence` `:50` costs ANY scene with `demandOf` + `compliance`). **Recommendation: candidates are generated from the VD registry (it holds the worlds and the looks) and gated by running the generator's own gates on the final scene**, so the card numbers describe exactly the scene that will open in the editor (see 3 and 6). The demand `ARCHETYPES` stay as the source of tested stocking sets where one exists, and are not the candidate list.

### 1.1 Reuse inventory

| Need | Code (file:line) | Status for Explore |
|---|---|---|
| Constraints as input | `briefToWants` `scene/brief.ts:421` (hard / flexible, Required / Available via GA1's hook), `Wants` `suggest.ts:137`, `projectOf` `scene/project.ts:432` | Reuse as is. Explore reads the same `Wants` as Suggest and Guided |
| Generator pool | `generate` `suggest.ts:515` builds `pool` (each concept x strategy, gated), dedupes to `uniq` (`:582`), then `selectDiverse(uniq, 3)` (`:585`) and returns only `proposals` (3), `stats.pool` (count) and `misses` | **The pool is not returned.** Need `candidatePool(w, P, ...)` = everything up to `uniq`, plus a `selectDiverse(pool, n)` over a larger n. One additive export in `suggest.ts` (GA1's file; see 8 ownership) |
| Gates | `conceptMaker().attempt` `suggest.ts:443`: `meetsNeeds`, strict welfare (`wordsOf` `:438`, any Problem OR Caution in the five stocking categories rejects, `:459-461`), `compliance` on hard caps only, `ownedAssess` credit, lower bounds | Reuse. Takes a demand `Archetype` and an animals list: wrap a VD archetype with an adaptor like `lockedArchetype` (`suggest.ts:332`, builds a synthetic Archetype from a roster) |
| Scoring / ranking | score `suggest.ts:~503-509` = appeal tags + headroom + `targetBonus` + `tasteBonus(w.taste, finish.style)` + GA1's flexible penalty and tank credit | Reuse the shape; Explore ranks with its own aspect score (see 5), the generator score stays "constraint-fit usefulness" |
| Diversity | `conceptDistance` `suggest.ts:345` (family .2, archetype .2, tank .15, tier .1, price band .1, strategy .15, style .1), `MIN_DISTANCE` .3, `selectDiverse` `:356` | Reuse; add world / water / roster / care-effort terms. This is also the near-duplicate rule (6) |
| Taste | `demand/taste.ts`: events `{style, kind: pick/reject/refine/wish}`, `MAX_EVENTS = 30` `:17`, decay `DECAY = 0.8` `:20`, ranking-only `tasteBonus` `:66` (cap +-5), `forgetStyle`, `clearTaste`, `recordWish`, `parseTaste` `:94`; stored as brief item `preferences.taste`; `style` = a LayoutId | **Keyed by look id only, no aspects, 30-event cap**: too coarse. Reuse the mechanics (decay, cap, undo, `parseTaste`, ranking-only) for a second item `preferences.aspects` (see 5). `wish` events stay for coming-soon looks. The old GV6 narrowing (`narrowTaste` `suggest.ts:612`: pass for every other look shown, pick for the chosen) survives only as a helper; VD5 retired the rounds (`git log -S narrowTaste`, c5b4e48e added them, e2d3673d retired them) |
| Renders | `ui/discovery/tiles.ts`: `Previews` `:110` (cache per archetype + tank + roster, one picture at a time), `previewOf` `:91`, `recipeBase` `recipes.ts:342`, `sceneWithAnimals` `:76`, `TILE_VIEW` `:23` | Reuse. Add a card renderer that draws a **snapshot** (not an archetype) through the same `shot` host callback |
| Stocking for a card | `ui/discovery/animals.ts`: `stockingSuggestion(a, tank, kinds=3)` `:84` (up to 3 kinds that suit each other, at group minimums, whole set judged to fit), `suitableAnimals` `:63`; `focalAnimals` `recipes.ts:165` | Reuse `stockingSuggestion` for the roster. Gap: brackish archetypes have no focal animal and no species carries a brackish flag (`focalAnimals` returns none for `a.water === 'brackish'`; `logic.ts:48`) |
| Costs and stats | `demandOf` `demand/engine.ts:90` (setup / upkeep / min a week / risk, per-item `Range3`), `costLines` `costlines.ts:46`, `layerTotals`, `buildPlanOf` `buildplan.ts:174` (cycling weeks, setup steps, stocking stages), `figuresOf` `effort.ts:80`, `setupEffortOf` `effort.ts:32`, `careCommitmentOf` `:57`, `setupHoursOf` `suggest.ts:319`, `complexityOf` `suggest.ts:372`, `riskScore` / `riskLabel` `engine.ts:278-279` | Reuse. See the card-statistics table in 3.3 |
| Favourites / history | **Nothing for candidates.** `scene/library.ts` ("My tanks": `saveToLib`, `listLib`, `loadFromLib`, `LIB_KEY` `tanklook.library`, whole `Scene` + thumbnail per id, browser-only) is the pattern; Suggest has no history | New store (2). Do not push candidates into "My tanks": they are proposals, not tanks, and the library would fill up |
| Hand-off | `makeItMine` `ui/suggest.ts:55` (replaces the open project as one undoable step, keeps the brief, limits, stand, space, pins a kit price via `pinTank`), `finish()` `screens.ts:284`, GS6 `handOff` (in flight) | Reuse `makeItMine`'s ingredients; the "replace" part is what GS6 changes (7) |
| Print / share | `ui/report.ts`, `scene/setupsheet.ts` (`buildSheet`), `buildPlanSheet.ts`, `scene/share.ts` (`shareHash`, `LONG_LINK = 2000`) | Reuse `buildPlanOf` + report for the expanded view. Share links carry the **scene** (and its brief), never the candidate store |
| Infeasibility | `demand/infeasible.ts` `explainInfeasible`, `Alternative` kinds incl. GA1's `mark-available` / `make-flexible`, `ui/infeasibleCard.ts` | Reuse for "no feasible results" (criterion 11): the same card, its alternatives become the controlled edits |
| Project state | `scene/project.ts`: `projectOf`, `applyChange`, `conflictsOf`, `assumptionsInUse` `:368`, `unresolved` `:392`, `onboardingOf`; `Route = 'animals' \| 'look'` (`brief.ts:119`), `World` includes `'any'` | Reuse. Add route `'explore'` (see 8, Stage 1) |
| Onboarding shell | GS4 `src/ui/guided/*` (shell, worldStep, equipmentStep, limitsStep, startStep; in flight), adds an `openExplore` stub after Limits for World = any | Explore mounts at that hook |

### 1.2 What does not exist
1. A **pool** and a **batch**: nothing returns more than 3 proposals; `stats.pool` is a count.
2. The **VD-to-demand bridge** (above).
3. **Aspect-level feedback** and its interpretation line.
4. A **candidate store** with ids, snapshots, provenance, reaction state, staleness.
5. **Compare**: `diff.ts` + the split view compare two tanks (GV7), usable for the favourites compare but only between scenes opened as tanks; Explore needs it on snapshots.
6. A **world-diverse** generator: paludarium candidates exist only on the VD side (4 buildable archetypes), brackish only as coming-soon (see 8, blockers).

## 2. Where complete candidate snapshots and provenance live (item 2)

Requirements from the spec: candidates are proposals not edits; stable so a favourite can be revisited later; carry the assumptions, pricing coverage and feasibility status behind their claims; survive a constraint change (relabelled, never silently deleted).

Options considered:
| Option | Verdict |
|---|---|
| In the brief (`brief.explore.candidates[]`, like `vision`) | No. The brief is saved in the tank, undo-snapshotted on every edit, serialised into every share link (`LONG_LINK` 2000 chars). A scene snapshot is tens of KB each; six per batch would blow both. Keep ONLY small things here (below). |
| In "My tanks" (`library.ts`) | No (see 1.1). |
| A new store, same pattern as `library.ts` | **Yes.** `src/explore/store.ts`: key `tanklook.explore` (index: ids, reaction, name, thumbnail, batch, status) + `tanklook.explore.<id>` per record (the heavy snapshot), browser-only, try/catch around every storage call like `library.ts`, capped (e.g. 60 records; unreacted records evict first; likes / saves never auto-evict). Scoped by a `projectId` so one exploration does not leak into another project. |

**Record shape** (`Candidate`):
```
id            stable hash of configKey (6)
configKey     canonical string: archetype id | tank model id | roster (species+n sorted) | density stop | seed | owned-gear picks
snapshot      full TankSetup (what Make This Mine installs), SCENE-version stamped, parsed through parseScene on load like library.ts
identity      { world, water, familyId, archetypeId, name, tagline }       (real classification, never 'any')
roster        [{species, n}]                                               (for aspect logic and compare without opening the snapshot)
estimate      { startupUsd, monthlyUsd, minPerWeek, setupHours, cycleWeeks, difficulty, footprintIn, risk, ranges, figures: {startup, monthly, care, setup}: {conf, why} }
provenance    { priceAsOf (PRICES_AS_OF), generatorVersion, briefDigest (the Wants fields the verdict used), tankSource, assumptions: string[] }
verdict       { state: 'eligible' | 'provisional' | 'withheld', gates: {welfare, budget, monthly, care, setup, space, equipment}: pass|over|unknown, reasons: string[] }
reaction      { state: 'unrated' | 'liked' | 'passed', saved: boolean, aspects?: AspectNote[], at }
status        'current' | 'stale'   (stale = no longer meets the CURRENT firm limits; relabelled with the broken limit, never deleted)
```
- `estimate` is **frozen at generation time** so a favourite compared tomorrow shows what it was shown as; a "re-check" recomputes `verdict` against the current brief and sets `status` (criterion 9) without touching `snapshot`.
- In the brief (small, saves / undoes / shares with the project): route `'explore'`, `preferences.aspects` (5), the batch counter and the one interpretation line, and on Make This Mine the **chosen candidate id + configKey + the estimate's assumptions** (so the editor can say "opened from Woodland Creek" and GS6's re-evaluation has its provenance). The full snapshot is installed into the scene, not the brief.
- Share links carry the scene (and brief), so a shared project opens the chosen design but not the explored-and-passed ones. Say so; no change to `share.ts`.
- Storage failure (private window, quota): exploration still works in memory for the session; the favourites strip says "not saved in this browser" (the `library.ts` message pattern).

## 3. Firm gating before presentation, and uncertainty (item 3)

### 3.1 What gates exist today
All inside `conceptMaker().attempt` (`suggest.ts:443`), so a failing concept never reaches `pool` and never reaches the user:
1. **Welfare** (independent gate, never a toggle): `meetsNeeds` (filtration / space inside the build's own limit, `builds.ts` `FILTRATION_LIMIT` `:45`) and the strict rule "nothing the stocking screen words as a Problem OR a Caution in any of its five categories" (`:459-461`; only "not enough information" lines pass, carried as `Proposal.unknown`). `rejectedWelfare` is counted in `stats`.
2. **Hard limits**: `compliance(sceneH, totals, effectiveLimits, units)` (`scene/constraints.ts:103`) on the scene with flexible caps switched off (GA1's `hard()`); admitted only when `overall` is `within` or `off`. An `unknown` overall (a cap whose total is not known: `constraints.ts:110`) is **not admitted** (it matches neither branch), so "unknown total" is already refused rather than certified.
3. **Lower bounds** (`w.mins`, GV8), **space** (`fitsFor` / `spaceFit`), **tank length / size range**, **set-up hours** (`w.setupHours`), all before the pool.
4. After GA1: flexible limits rank down and warn (`flexReview`, `FLEX_WEIGHT = 12`), never filter; unknown limits neither filter nor rank.

So the mechanics of "firm limits are a hard gate before presentation" are present and tested; the spec needs **the same gates applied to the VD-built scene, plus an uncertainty rule** (3.2).

### 3.2 What the models report about confidence today
- **Money.** `demandOf` returns `Contribution.setup / upkeep / minutes: Range3` per item (`demand/types.ts`), with price-age widening (`widen3`, `engine.ts:101`); `Demand.totals` are the **means only** ("the user sees one expected number per bar", `types.ts` header). So a conservative upper bound is computable (sum of `hi`) but is not exposed.
- **`effort.ts` `Figure { conf: 'validated' | 'provisional', why }`** (`:12`): `costFigure` `:70` = share of set-up dollars backed by a retailer listing (>= 80 % = validated, else provisional with the percentage); monthly is always `provisional` ("food, conditioner, power and the expected loss of animals"); `careFigure` `:65` is **always provisional** ("minutes per job are our estimate, because no page states them"); `setupEffortOf` `:32` is **always provisional** (every part is "assumption"). The file header says plainly: "Information only: no gate or score reads it."
- **Animals.** `Proposal.unknown` lists husbandry lines that read "not enough information" (one shown); per-species support levels live in the species data (`data/provenance.ts`).
- **Difficulty.** There is no Beginner / Intermediate / Advanced rating. Nearest: `complexityOf(build, scene)` `suggest.ts:372` (0..1 from minutes a week, salt, CO2, volume under 10 gal, top finish tier), `riskScore` / `riskLabel` safe / moderate / demanding `engine.ts:278-279` (per-animal and per-system risk points, **scaled by the user's skill**, `skillMul`), `experienceNote` `suggest.ts:~376`.

### 3.3 Proposed gate for Explore ("do not certify a candidate as within a firm bound when an estimate is not confident")
Three verdict states, decided per firm limit from the **estimate with its range**, before any card is built:
| State | Rule | Shown |
|---|---|---|
| `eligible` | welfare passes AND every firm limit holds on the **conservative** figure (upper bound `hi` for money / minutes; footprint exact) AND no essential figure is missing | In the recommendation set |
| `provisional` | welfare passes, firm limits hold on the mean but not on the conservative figure, OR an essential figure rests on a rule of thumb (`conf: 'provisional'` AND within 10 % of the cap) | **Outside** the recommendation set: a separate, clearly marked "Provisional concepts" strip, never counted in the batch of six, never labelled "fits your budget" |
| `withheld` | any firm limit exceeded on the mean, welfare not passed, Required item not honoured, or a species in the roster lacks support data | Not shown; counted in the "why nothing / fewer" explanation (the `stats` pattern) |

Per-limit specifics:
- **Startup budget** (firm): conservative = sum of `setup.hi` after owned credit and tax. Money has real listing backing, so this will usually be decidable.
- **Monthly**: conservative = sum of `upkeep.hi` + loss. Provisional by `Figure`, but ranged: gate on `hi`.
- **Care minutes a week / setup hours**: the minutes are our stated estimate, so every candidate is `conf: 'provisional'` on these figures **by construction**. Read literally, no candidate could ever be certified within a firm care or setup-time cap. See **Q1** (recommendation: certify on the `hi` of the minutes range with the basis shown; the generator already treats these caps as hard filters on the mean today, `capItem`).
- **Space / footprint**: exact (`spaceFit`); clearance (stand, lid, hood): the inputs exist (`scene/space.ts`, `standspace.ts`, lid / hood heights) but no helper words them yet; include in the footprint number.
- **Skipped / unknown limits**: neither filter nor rank, never zero, never infinity (`project.ts` `LimitView.state 'unknown'`). The card says "no budget limit set" in its assumptions list (`assumptionsInUse` `project.ts:368` already produces these strings), and the verdict records `gate: 'unknown'` rather than `pass`.
- **Flexible targets**: GA1 semantics (rank + warn, labelled "over your $300 target by $40"); a flexible overage can never be mistaken for a pass because `verdict.gates` stores `over` for it and the card's pill reads "over your target".
- **Required**: Required tank / gear honoured (4); a candidate that cannot honour a Required item is `withheld`.

### 3.4 Card statistics: what can supply each today
| Statistic (spec 3) | Function today | Confidence reported | Missing |
|---|---|---|---|
| Startup cost (net of reused equipment, range where warranted) | `Proposal.totals.startupUsd` after `ownedAssess` credit + tax (`suggest.ts`); for a VD scene `demandOf(scene).totals.setupUsd` + `tankSaved`; range from summing `Range3` | `costFigure` validated / provisional with the listed-price share; price-age widening in the ranges | A range output (only means exposed); credit for owned gear on a VD scene outside `attempt` (reuse `ownedAssess` with the scene's build); kit-price pinning (`pinned.ts`) |
| Monthly recurring | `totals.monthlyUsd` (`demandOf.upkeep` + kWh + `lossMo`) | Always `provisional` (stated loss rate) | A way to say which part is modelled (food, power, consumables, replacement) from `costLines`/`drivers` (`cost.ts:25`) |
| Weekly upkeep | `totals.minPerWeek`; `careCommitmentOf` `effort.ts:57` ("about 45 min a week, 1 x 12 gal water change"); `rhythmOf` for the rhythm in words | Always `provisional` | "Bigger jobs separately" (yearly jobs are averaged into the weekly figure, `types.ts` `minPerWeek`; `Contribution.everyDays` allows a "less frequent jobs" list) |
| Difficulty (Beginner / Intermediate / Advanced) | `complexityOf` (0..1), `riskLabel` | none | **A real rating.** Define from husbandry risk + sensitivity (salt, CO2, small volume) + consequence of error (species support / outgrows / group needs). `Demand.totals.riskRaw` is **skill-scaled** (`engine.ts:266`, each `Contribution.risk` is "after skill scaling"), so the rating must be computed with one fixed reference profile (`defaultProfile()`, skill 0) or it would change with the viewer's own experience; cut it into 3 bands. New, small, pure; needs Nathan's cut points (Q4) |
| Footprint (+ clearances) | `p.build.tank.outer` (L x D x H), `scene/space.ts` `spaceFit`, `standspace.ts`, lid / hood heights | exact | Clearance text ("allow 6 in above for the hood") needs one helper over lid / hood / stand data |
| Setup time (+ cycling flagged separately) | `setupHoursOf` `suggest.ts:319` -> `setupEffortOf`; `cyclingOf` `buildplan.ts:66` (weeks range, method) | `provisional` ("No page states how long a set-up takes") | Terrarium / paludarium: `habitatOf` has only fresh / salt / dry; a paludarium reads as "dry" or "fresh", so its setup and cycling lines need a third habitat or an explicit rule |
| Inhabitants (species + counts) | `p.build.animals`, `stockingSuggestion` | welfare gate | none; show names without plurals (GS3 convention, `nameOf` in `screens.ts`) |
| Ownership description (2-4 sentences) | `Proposal.tradeoff` (`tradeoffOf` `suggest.ts`, "Lowest cost: the smallest tank ...") and `Archetype.why`; `fingerprint` / `contrast` on the VD archetype | n/a | **Copy.** Tradeoff text is a pros-and-cons line, not an ownership experience. Needs a short authored line per archetype (86 archetypes, 44 buildable) plus the generated "one trade-off" from real numbers. Tone per spec 3; none exists yet |
| Assumptions / pricing coverage / feasibility status | `Proposal.ownedNotes`, `warnings` (GA1), `unknown`, `figures[*].why`, `assumptionsInUse` | as above | One expanded-view list assembled from those |

## 4. Required vs Available in the generator (item 4)

Verified on `ga1-available` (8a3d07bf; the coordinator's "just landed" had not reached `origin/main` at my fetch, so GS4 / Explore must merge after it):
- `briefToWants` hook (`brief.ts`, +8 lines on the branch): `availTank` (tank use `'available'`), `requiredOwned` (gear use `'required'`), `flexLimits` (limit status not hard, or `flex`; same rule as `project.ts` `constraintOf`, a test asserts parity). Required tank = unchanged `ownTank`.
- `suggest.ts`: an Available tank is **one extra candidate tank per archetype** (`Sizes.own`, `ownTankWhy`, `runStrategy(..., own=true)`), never a restriction; a setup using it is credited its price and ranks up 1 point per $60 (max 5, `AVAIL_USD_PER_POINT`, `AVAIL_BONUS_MAX`); every `Proposal` carries `tankSource` ('owned-required' | 'owned-available' | 'new'), `tankNote` ("Uses your 20 gal ..." / "A 29 gal instead: your 10 gal is too small for this."), `tankCreditUsd`, `warnings`. Required gear is kept with a warning; Available gear is credited when it suits and replaced with the reason when not.
- `test/available.test.ts` (199 lines on the branch) covers Available vs Required, flexible limits not filtering, gear kept / replaced, parity with `project.ts`.

**Gaps that matter for Explore:**
1. **Custom-dimension tanks are invisible to the generator** (GA1 "Not covered"): `enclosureOf` (`project.ts:275`) builds an `owned-*` enclosure from `dimsIn` with no model, but `Wants.ownTank` / `availTank` are `TankModel`s and `briefToWants` needs a catalogue `model`. A user who typed 36 x 18 x 16 in their Required "tank" gets candidates that ignore it. Spec criterion 4 ("Required tank is respected as a binding constraint") fails for them. Fix: a `tankFromDims(dimsIn)` adaptor to a synthetic `TankModel` (the scene can already hold a custom tank; `tankFromModel` exists the other way) in `suggest.ts` / `brief.ts`, GA1's follow-up. Until then Explore must say "your custom tank is not used for recommendations yet" rather than silently ignoring it.
2. `briefFromWants` does not write `availTank` back (GA1); irrelevant for Explore unless Suggest's round-trip is reused.
3. **The VD side has no Required / Available logic**: `tankChoice` (`tiles.ts:39`) uses the owned tank for pictures either way and only labels Required vs Available. For Explore the Required tank must be the tank of **every** candidate and the Available tank an option among catalogue tanks: this must be the generator's `sizesFor` / `Sizes.own` logic, not `tankChoice`'s. Routing candidates through `conceptMaker` gives that for free.
4. Owned **gear** on a VD scene: the scene-side credit lives in `ownedAssess(build, ...)`, which needs a `Build`. For a VD scene take the build `buildsFor(roster, tank)[2]` that `sceneWithAnimals` already uses and run `ownedAssess` on it.
5. A Required item that no candidate can honour must surface through `explainInfeasible`'s new `equipment` limiting factor (GA1), not as an empty strip.

## 5. Feedback preferences vs project constraints, kept separate (item 5)

**Today they are already apart**: limits are brief items under `constraints.*` (status hard / preference, `flex`, ranges), taste is `preferences.taste` (`taste.ts`), and `tasteBonus` is added after every gate ("RANKING ONLY, never feasibility", header). Keep both properties:
1. **Two stores, two writers.** Like / Pass / aspect tags write only `preferences.aspects` (new, below). Only `setConstraint` / `setLimitKind` / `applyChange` (`project.ts`) write constraints, and they are reachable only from an explicit "Adjust constraints" action (a separate button and panel mounting GS4's limits step), never from the feedback panel.
2. **Closed tag vocabulary with no constraint-shaped tag.** Visual: overall look, colours, natural vs artificial, plant / decor density, layout. Animals: species, behaviour, size, number, visibility. World: fresh / marine / brackish / land / land-and-water. Ownership experience: daily care, maintenance frequency, complexity / fragility. No `too expensive`, `too large`, `too much upkeep`, `too much time`. A unit test enumerates the vocabulary and fails if any tag id maps to a `constraints.*` item. "Easier care" as a preference IS allowed (spec 5): it tilts ranking toward lower `complexity` but the candidate gate still reads the separately stated `careMin` limit.
3. **Aspect profile** `preferences.aspects` (new brief item, same status `preference`, same save / undo / share path as `preferences.taste`): a map `aspect -> signed weight with uncertainty` (count of events and last-update), derived from capped, decaying events `{ candidateId, reaction, tags?: AspectTag[] }`. Reuse `taste.ts` mechanics: `DECAY` `:20`, cap (raise from 30 for aspects, or keep a per-aspect cap), `forget*`, `clear*`, `parse*` validation. Rules from the spec: Like = positive evidence for the TAGGED aspects only (untagged like = weak evidence spread over the candidate's aspects, flagged "unattributed"); Pass = negative evidence for this candidate, **not** a ban on its world or style (a world / family is only down-weighted by explicit world tags, with a floor so it can never reach zero); Unrated = no event; Save = a separate weak positive event kind, no commit; "Make This Mine" = the strongest positive on all aspects of that candidate. Track uncertainty (events per aspect) and fade after one or two signals (tunnel-vision guard); expose undo / clear.
4. **The interpretation line** is derived from the profile (top 2 positive aspects, strongest negative, any "easy care" preference) and is editable: the user's edit writes the profile directly (set / clear an aspect) with a visible "You told us" source flag that overrides the learned weight.
5. **A constraint change never touches the profile** (criterion 9): `applyChange` / reeval re-runs Stage A and re-labels saved candidates (`status: 'stale'`); `preferences.aspects` is untouched. Stage A's gate uses constraints only; Stage B's score uses aspects only. No code path imports both in one function except the final batch assembler, which reads `eligible[]` (gate output) and `aspects` (profile) as two separate arguments. Add a purity test: the gate function is called with the profile deleted and returns the same set.
6. **Exploration share**: reserve about 25 % of slots (1-2 of 6) for exploration (spec 4, tunable): chosen from eligible candidates farthest from the liked set in aspect space, drawn from a different world where possible; constant in one place (`EXPLORE_SHARE`), test with a counted batch rather than hard-coding policy.

## 6. Candidate identity: compared, saved, opened (item 6)

1. **Stable id** = short hash of `configKey` = archetype id | tank model id (or dims for a custom tank) | sorted `species+n` | density stop | composition seed (recipes.ts draws at a chosen seed, `recipeBase` `:342`, `bestStep`) | owned-gear picks. The same configuration always has the same id, across sessions, so a re-generated duplicate is recognised and a saved favourite is found again.
2. **`snapshot` is the truth.** The card, the compare view and Make This Mine all read the stored `TankSetup`; none of them re-run `recipeBase`. (A recipe re-run could differ after a code change; the snapshot cannot.) The scene version is stamped and the snapshot goes through `parseScene` on load (same path as `library.ts` `loadFromLib`), so old candidates upgrade like old files.
3. **Dedupe** at pool time: (a) exact `configKey` match; (b) `conceptDistance`-style distance below `MIN_DISTANCE` (0.3, `suggest.ts:352`) to anything already shown, liked or passed in this exploration, extended with world, water, roster-Jaccard and look terms; a controlled variation (same archetype, one axis changed) is allowed only when the user asked for it (an explicit "show me a variation of this" action, which stamps `variantOf: id`).
4. **Opening in the editor** installs the snapshot as an update (7) and writes `{ candidateId, configKey }` into the brief so the editor, GS6 re-evaluation and a later "back to my explored favourites" can find the origin. The candidate record is **kept** after being chosen (reaction: liked + `chosenAt`), so Undo and "reopen the other favourite" both work.
5. **Compare** runs on two `snapshot`s: reuse `diff.ts` / `setCompare` / `sigOf` (GV7) by installing the snapshots as the two compare tanks without touching the project's scene, or a lighter table built from `estimate` + `roster` (no render needed for the table). The table version needs no scene work and is the Stage 4 default; the split-view version is optional.

## 7. Scene / stocking resets that block a non-destructive hand-off (item 7)

State read at main bf254538, GS6 working copy in `wizardly-euler-ffdafa` (uncommitted):

| Hazard | main (cite) | GS6 in flight | Remaining for Explore |
|---|---|---|---|
| `finish()` replaces the scene | `ui/discovery/screens.ts:284`: `store.update(s => Object.assign(s.tanks[s.active], structuredClone(T)))` after `setVision`, plus `recordTaste(..., {kind:'pick'})` | `handOff(store.tank, T, { accept, brief })` / `lookUnchanged` (new `scene/reeval.ts`): pristine scene taken whole; a design in place keeps tank, gear, roster and swaps only `LOOK_FIELDS` (items, patches, substrate, terrain, layout, backdrop, wall, grow, condition); the look's own animals are suggestions unless accepted | **GS6's `handOff` keeps the roster and tank and changes only the look, which is the wrong rule for a whole candidate**: Explore's chosen candidate carries its OWN roster, tank and gear. See 7.1 |
| `stockPlan.open()` replaces the scene | `ui/stockPlan.ts:327`, `store.replace(s)` `:344`, after rescuing owned gear into `kept` (`:333-340`) | `hasDesign` guard: over a design it opens with the roster seeded from the brief / scene, no replace, and a size change calls `adaptForEdit` | None for Explore directly (Explore does not open the animals panel), but the Animals First / editor flows must stay consistent with it |
| `makeItMine` replaces the project | `ui/suggest.ts:55`: `store.replace(next); store.seal()` after copying the brief, limits, stand, space, kit pin | not touched | Explore must not reuse it verbatim over an existing design (see 7.1) |
| New / Guided start | `panels.ts` `guidedNew()`: clean tank + empty brief after the NW1 warning (`newTank.ts` `hasWork` / `confirmNew`) | n/a | Explore is entered from inside Guided, so the scene it starts from holds only Equipment (owned gear flagged `owned: true`) and Limits |
| Opening a discovery screen / navigating back wiping the scene | `attachDiscovery().open()`, `mountDiscovery` take roster / tank as parameters (GS3) | n/a | Explore must follow the same rule: browsing candidates **never** writes the scene; renders go through the viewer `shot` host callback that puts the tank back (`panels.ts:291`, `history:false`) |

**7.1 Make This Mine = a snapshot-aware update (new, small, pure: `scene/reeval.ts` neighbour `explore/handOff.ts`, or an `opts.wholeDesign` flag added to GS6's `handOff` by GS6 / coordinator).** Rules:
- Scene is pristine (`hasDesign` false, which is the normal case: only owned gear flagged): take the snapshot whole, then **overlay the project's owned equipment**: gear flagged `owned: true` in the current scene replaces the candidate's priced equivalent (the candidate was costed with that credit through `ownedAssess`; verify the credit still holds), and a Required tank is already the candidate's tank.
- Scene already holds a design (user went Back, explored again, or came from the editor): **never replace silently.** Compute `changes(current, snapshot)` and show a confirm card "Replace your current design with Woodland Creek?" listing what is replaced (tank, roster, look) and what is kept (limits, equipment marked Required, brief), as one undoable step (`store.seal()`), with the previous scene recoverable by Undo. GS6's invariants "alternatives stay candidates until picked" and "the REQUESTED design is kept separate from the FEASIBLE one" apply: the chosen candidate is requested; `reevaluate` (GS6) then checks it against current constraints.
- No regeneration (criterion 10): the snapshot is installed verbatim; `Vision` / `renderRecipe` for the chosen archetype is written from the candidate's `identity` (not recomputed); the livestock list equals `candidate.roster`; the test asserts species, counts, tank id and item count are identical before and after hand-off.
- Taste profile (aspects) stays in the brief as is; the chosen archetype / density is recorded in `Vision` so Look First's later "back to the look" works.

## 8. Staged implementation plan (item 8)

### 8.1 File ownership (no collision with GS4 / GS5 / GS6 / GA1)
| Owner | Files | Rule |
|---|---|---|
| Explore lanes (new) | `src/explore/*` (pure: `candidate.ts`, `pool.ts`, `gate.ts`, `rank.ts`, `aspects.ts`, `store.ts`, `handOff.ts`, `copy.ts`), `src/ui/explore/*` (`explore.ts` mount, `card.ts`, `strip.ts`, `compare.ts`, `interpret.ts`), `test/explore*.test.ts`, one `.ex-*` CSS block | New files only |
| GS4 (in flight) | `src/ui/guided/*`, `welcome.ts`, `ownedGear.ts`, `startMode.ts`, `index.html`, the `.gs-*` CSS | Explore mounts at GS4's `openExplore` hook; do not edit `src/ui/guided/*` |
| GS6 (in flight) | `scene/reeval.ts`, `scene/project.ts` additions, `discovery/screens.ts`, `stockPlan.ts`, `briefBar.ts`, `limitsPanel.ts`, `briefFeasibility.ts` | Explore calls `hasDesign`, `reevaluate`, `adaptToTank` as a client; asks GS6 for the `wholeDesign` hand-off variant rather than editing `handOff` |
| GA1 (landed on branch) | `demand/suggest.ts`, `demand/infeasible.ts`, `test/available.test.ts` | Explore needs **three additive exports** from `suggest.ts` (a follow-up to GA1 or a coordinated one-liner after GA1 merges): `candidatePool(w, P, units, now)` (everything up to `uniq`), `gateScene`/`evaluateCandidate` (the `attempt` gates on a given build + scene + synthetic archetype), `custom-dimension tank` support (4.1) |
| Shared hazards | `src/ui/style.css` (own block), `src/ui/panels.ts` (one host-wiring line), `src/scene/brief.ts` (`Route` gets `'explore'`, one new item `preferences.aspects`, a `parse*`, brief version bump 4 -> 5 with a parse test; GS2 owned this file's last change, coordinate through the coordinator) | One-line hooks, say so in the HANDOFF section |

### 8.2 Stages (each ends in a sha + focused tests; ordering that keeps files disjoint)
| Stage | Content | Depends on | Tests |
|---|---|---|---|
| **X0 Spike (docs + 1 script, no UI)** | Measure the real cost of one batch: pool size and wall time of `candidatePool` over 44 buildable archetypes x 2-3 tank sizes; render time of 6 cards (`Previews.log` `shotMs`) in one browser through `scripts/lowprio.ps1`; count how many candidates survive typical limits per world | GA1 merged | Report only; decides the numbers in 8.3 |
| **X1 Pool + gate (pure)** | `candidatePool` / `evaluateCandidate` in `suggest.ts`; `src/explore/pool.ts` building VD-registry candidates through the VD-to-demand adaptor; `gate.ts` with the three verdict states (3.3); `estimate` with ranges; `difficulty` rating; custom-dimension tank adaptor | GA1; Nathan's Q1, Q4 | criteria 2, 3, 4, 5, 11, 12 (below) |
| **X2 Store + identity (pure)** | `candidate.ts` (`configKey`, id, snapshot, dedupe), `store.ts` (`tanklook.explore`, caps, try/catch), staleness re-check, `preferences.aspects` + `aspects.ts` (closed vocabulary, decay, undo), `rank.ts` (Stage B: aspect score + exploration share + diversify) | X1 | criteria 7, 8, 9 |
| **X3 Explore UI** | `ui/explore/*`: batch of 6 cards (render via the `shot` callback, a card shows 4 stats + expand), Like / Pass / Save / Unrated, optional "What caught your eye?" panel, interpretation line (editable), "Show more", favourites strip, "Adjust constraints" (mounts GS4's limits step), no-result card (reuses `infeasibleCard`) | X2; GS4 `openExplore` hook | criteria 1, 6, 7, 11 |
| **X4 Hand-off + compare** | `explore/handOff.ts` (7.1), the confirm card over an existing design, `Vision` / candidate provenance written, compare table of favourites, "re-check saved candidates" on constraint change | X3; GS6 `handOff`/`reevaluate` merged | criteria 9, 10 |
| **X5 Polish** | ownership copy for the buildable archetypes (needs Nathan's tone review), terrarium / paludarium / brackish cards as support lands, tuning of 6 / 25 % / 4 stats from usability | X4; VD packs | criterion 6 (copy) |

### 8.3 Likely blockers
1. **Render cost.** Six candidates per batch means up to six scene builds plus six `shot` draws per "Show more". Today one tile costs a `recipeBase` (the trio, 12 seeds searched by `bestStep`) plus one draw (`Previews.log` records `buildMs` and `shotMs`; no timings are written down anywhere, X0 measures them). Machine load rules apply: `scripts/lowprio.ps1`, one browser, one page at a time, cache by `configKey` (the id), at most Balanced density per card (a second density only on expand), no re-render of a viewed card, no render sweeps in tests (tests assert scene structure, not pixels). Stage A (the pool) is pure and must be cheap enough to run without rendering: only the batch of six is rendered, never the pool. Render each card lazily as it scrolls into view and show a flat placeholder in the family colour first (the `vd-shot` / `vd-wait` pattern).
2. **World coverage.** Buildable archetypes: aquarium FW 18 + SW 10 + BK 5, terrarium 7, paludarium 4 (44 of 86). Without a restricting world the diversity requirement (criterion 2) is only as good as these counts, and brackish candidates cannot be stocked (no focal animal, no brackish species flag, `focalAnimals`; `logic.ts:48`). Under a tight budget the pool may collapse to one or two worlds; the "fewer than six, here is why" message is a required state, not an edge case.
3. **Terrarium / paludarium card statistics.** `habitatOf` is fresh / salt / dry (a paludarium has water and land), `setupEffortOf` has a dry branch with a fixed 1.5 h habitat line, `cyclingOf` has no paludarium rule, demand `ARCHETYPES` has one vivarium concept. Cost and care for these worlds are the least modelled (and the care minutes are provisional everywhere). Until covered, they are eligible only as `provisional` unless Nathan accepts the current dry / fresh blend (Q2).
4. **Confidence policy** (Q1): without it, every firm care-time or setup-time limit makes every candidate non-certifiable.
5. **Ownership copy**: no per-archetype ownership prose exists (3.4); the spec's tone needs authored text.
6. **GA1 not on main yet**, and custom-dimension owned tanks are not generated for (4.1).
7. **VD-to-demand adaptor correctness**: a synthetic demand `Archetype` (as `lockedArchetype` does) carries no tags, so the appeal-tag score and `Kind` filters are inert; Explore must not rely on them. Welfare / needs / limit gates do not depend on tags and are the only ones Explore needs.
8. **Brief version** bump (`preferences.aspects`, route `'explore'`): changes `parseBrief` and every saved project; must go through GS2's owner with a parse test.

### 8.4 Acceptance tests mapped to spec section 10 (12 criteria)
All pure (no WebGL), `test/explore*.test.ts`, run through the background rule; a full-run timeout in `tarantula` / `taste` / `u5layers` / `suggest` is re-run alone per HANDOFF.
| # | Criterion | Focused test |
|---|---|---|
| 1 | Branch routing | GS4's shell test extended: `world: 'any'` -> after Limits the next step is Explore (not Starting Point); `routeOf` = `'explore'`; Equipment and Limits answers are the same brief items Animals First / Look First read; `onExit('editor')` fires once |
| 2 | World diversity | with no restricting world and open limits, the first batch contains >= 2 distinct `identity.world`s (when X0 shows the pool supports it); every candidate `identity.world` is aquarium / terrarium / paludarium, `water` is a real Water, never `'any'` / `null` |
| 3 | Constraint enforcement | property test over generated briefs ($300 / $120 / 30 min caps, firm and flexible): every candidate in the recommendation set has `estimate.hi <= cap` on every firm limit; a $275-ok / $330-over pair confirms the $330 candidate is `withheld`; a feedback event (a pass tagged anything) does not change the eligible set (purity test, 5) |
| 4 | Required vs Available | Required 20 gal: every candidate's `snapshot.tank` is that tank and `tankSource` 'owned-required'; Available 20 gal: candidates include at least one other tank and the owned tank is credited only on candidates that use it; custom-dimension Required tank: expected failure documented, then passes once 4.1 is fixed |
| 5 | Welfare checks | every candidate in the set passes `summaryOf` with no Problem / Caution; a roster with a `not enough information` line is `provisional`, never `eligible`; an unsupported species combination is withheld |
| 6 | Informative cards | a candidate record has non-empty scene snapshot, >= 1 species with counts, ownership text (2-4 sentences), the 4 prominent stats, and an `assumptions` list that includes "no budget limit set" when the budget is skipped; numbers equal `demandOf(snapshot)` recomputed from the snapshot (card = scene, no drift) |
| 7 | Feedback semantics | Like vs Pass vs Unrated vs Save vs aspect tag each produce distinct profile deltas; Unrated = no event; a Pass on a reef candidate leaves saltwater above its floor weight and still allowed in the pool; undo / clear restore the profile exactly; vocabulary test (no constraint-shaped tag) |
| 8 | Adaptive batches | after 3 liked planted-FW candidates (tagged colour + plants) the next batch's top-ranked set is more planted-FW than batch 1 AND still holds >= 1 candidate from another world / family (the `EXPLORE_SHARE` slot); no minimum round count; a single like does not exceed the tunnel-vision cap |
| 9 | Constraint changes | lower the budget -> `preferences.aspects` byte-identical before / after; the next batch gates on the new cap; a saved favourite above it becomes `status: 'stale'` with the broken limit named and is not deleted; raising it again makes it `current` |
| 10 | Preserved selection | Make This Mine over a pristine scene with owned gear: installed species / counts, tank id, item count equal the snapshot (gear overlay only); over a scene with a design: confirm required, one undo restores the previous scene exactly; no call to `recipeBase` during hand-off (spy) |
| 11 | No feasible results | an impossible brief ($40 + a Required 200 gal) returns zero candidates and an `Infeasible` naming the blocker with `mark-available` / `make-flexible` / `raise-budget` alternatives; nothing eligible is fabricated; the card says what the broken limit is |
| 12 | Skip-friendly | Equipment and Limits both skipped (`onboardingOf` = skipped): Explore still returns a batch; every figure's `assumptions` names the missing limit as unknown; no gate state is `pass` for a limit that was never set (it is `unknown`) |

## 9. Assumptions made (tell the coordinator if wrong)
1. Candidates come from the **VD registry** (86 archetypes, 44 buildable), gated by the demand generator's gates; the 23 demand concepts are not the candidate list.
2. Density is **Balanced** on every card; the user changes it later in the editor (VD6's slider), or via an expand control. Visual density never raises stocking (Rev 02 rule kept).
3. Experience level stays advisory (Rev 03 Q3): it never gates and never appears as an aspect tag.
4. Brackish aquarium candidates are labelled "brackish" and are shown only when a roster with brackish support exists; otherwise they stay out (not faked with freshwater animals).
5. Ponds and patio tubs stay out of scope (spec 2); Coming Soon archetypes are not candidates.
6. Candidates are browser-local (like "My tanks"); cross-device favourites are out of scope.
7. Six per batch, 25 % exploration share, four prominent stats are constants in one file, per the spec's "tunable".

## 10. Open questions for Nathan
Pictures: no Explore screen exists yet, so these use the existing screens they will attach to (`research/design/gs1-shots/04-limits.png`, `03-owned-gear.png`; sent with the report). A candidate-card mock-up is not drawn: nothing exists to screenshot, and the stats table in 3.4 is the content.

**Q1 (picture 04-limits.png): can a firm care-time or setup-time limit ever certify a candidate?** The minutes a week and the setup hours are our own estimates (every one is marked provisional in the code, `effort.ts`); no page states them. Read literally, "do not certify a candidate as within a firm bound when an estimate is not confident" means no candidate can ever be certified against a firm care-time or setup-time cap. Recommendation: certify on the HIGH end of the estimated range (minutes with their spread), say "estimate" on the card with the basis one tap away, and keep any candidate within 10 % of the cap in the separate "provisional" strip. Money is different: most prices have listings, so a firm budget certifies on the high end of the price range. Alternative: care / setup time is never a certified firm bound (always a flexible target).

**Q2 (picture 04-limits.png, then 03-owned-gear.png for context): terrariums and paludariums.** Their cost and care numbers are the least modelled (no paludarium habitat in the effort model; one vivarium concept in the demand data; care minutes provisional everywhere). Recommendation: they appear in the first batch as normal candidates only when their figures come from the same model as aquariums; until then they are marked "provisional" and shown in a separate strip, so the first batches are mostly aquarium. Alternative: show them as normal candidates with a visible "rough estimate" tag now.

**Q3: brackish.** There is no brackish animal data, so a brackish candidate cannot be stocked honestly. Recommendation: no brackish candidates until a brackish roster exists (a separate data lane), and say so in the world-diversity message. Alternative: show a brackish look with no animals, as a "scape only" card, which the spec's "complete, stocked" rule forbids.

**Q4: difficulty bands.** There is no Beginner / Intermediate / Advanced rating. Recommendation: derive it from the husbandry risk score computed with one fixed reference profile (not the viewer's own skill, which the engine scales by), cut at the existing "safe / moderate / demanding" boundaries (`riskLabel`), so the labels are Beginner / Intermediate / Advanced. Nathan to confirm the three names and that a salt or CO2 system never reads Beginner.

**Q5: does a chosen candidate replace the design in progress?** Recommendation: if the scene already holds a design, Make This Mine asks first ("Replace your current design with X? Your limits and the equipment you marked Required stay"), as one undoable step; on a fresh project it just opens. Alternative: always keep the current design and add the candidate as a second tank in the same project.

**Q6: where do saved candidates live?** Recommendation: browser-local like "My tanks", capped (60), likes and saves never evicted; not in share links (a shared project carries the chosen design only). Alternative: also put the liked ones in the project file so they follow a download or share link, at the cost of a bigger project file.

(Order that keeps the work moving: Q1 and Q4 block Stage X1; Q2 and Q3 block only the terrarium / paludarium / brackish cards; Q5 and Q6 block Stage X4. None blocks X0, the cost spike.)
