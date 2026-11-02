# Explore Complete Setups, stage X0: cost spike (lane OX2, 2026-11-02)

Measures what a batch of about six rendered candidates costs, before anyone builds Explore (plan: `open-to-anything-reconcile.md` 8.2 X0, 8.3, 11; Nathan accepted Q1-Q6 as recommended).
Script: `scripts/explore-spike.mjs` (modes `pool`, `gen`, `render`; changes no app code, writes no file in the repo). Raw JSON stayed outside the repo; every number below is from it.
Code read at `origin/main` b738d83c. OX3's `candidatePool` / `evaluateCandidate` had **not** landed, so the pool is APPROXIMATED here (section 0).

Run rules followed: every run through `scripts/lowprio.ps1`, one browser, one page, one job at a time, a SAMPLE of renders (12 cards per browser), dev server and Edge killed after each run.
**The machine was never idle**: CPU 25-45 % busy at the start of every run, 16-20 `msedge.exe` and 6-13 `node.exe` processes (other lanes and the user's own Edge). Read every time as "on a shared, loaded laptop"; medians are steadier than means (the same pool run took 95 s once and 219 s the next time, with one 40 s scene hiccup).

## Headline (the numbers for the plan)

| Question | Answer |
|---|---|
| Is 6 affordable? | **On a GPU, yes, if cards stream in.** Warm cost is about 1 s per NEW card (6.0-6.2 s for a second batch of 6 new looks) and 0.2 s per re-drawn card (1.15 s for six). **On software GL, no**: 50-87 s per batch. |
| First-ever batch | **20.5-20.9 s** on the hardware GPU (two fresh browsers). 8.3 s of it is the first card (shaders, plant / fish assets), 2.5-3.6 s each for the first terrarium / paludarium / second-look cards. It is one-time warm-up, not per-card cost: **pre-warm the renderer during the Equipment / Limits steps**. |
| Pool without rendering | **~0.4 s per candidate at the median** (roster 0.2 s + scene 0.2 s + figures 0.03 s); 95-219 s for all 130 candidates. Far too slow to build in one go: build **incrementally, rosters cached**. The real generator's whole pass (23 concepts, finish ladder included) is **0.8-2.9 s**. |
| Survivors under typical firm limits | **Often fewer than six.** Firm $300 or firm 30 min a week leave 0-7 candidates on the VD pool (Balanced scene) and at most 2 worlds (1 world for care time: terrariums only). Saltwater needs $1,636+ (VD) and never appears under $600 even in the real generator. |
| Q1's "high end of the range" | Turns firm $600 from **10 survivors (mean) into 1 (high end)** at the Balanced scene: median high / mean ratio is 1.40 (set-up $), 1.51 (min a week), 1.42 ($ a month). The width of that range is the single biggest lever on how often "fewer than six" appears. |

Recommended constants: **batch 6 on a GPU, 3 on software GL** (detect `UNMASKED_RENDERER` containing SwiftShader / Basic Render and say why); render lazily in view order with a flat family-colour placeholder, **yield between cards**; **no pre-render of the next batch** (feedback changes it) but a **2-card lookahead after the 4th reaction**; cache **images by candidate id in memory**, persist a thumbnail only for liked / saved candidates; do not cache scenes (rebuild + redraw is 0.2 s warm).

## 0. What was measured, and how close the approximation is

A **candidate** here = one buildable VD archetype (`scene/archetypes.ts`, `recipeLook` set: **44 = FW 18, SW 10, BK 5, TE 7, PA 4**, `support !== 'coming-soon'`) in one catalogue tank (the smallest that meets the archetype's `minGallons`, then about 2x and 4x; aquariums at least 29 and 55 gal; 44 x 3 = 132, **130 candidates** because two archetypes have a duplicate size), stocked with `stockingSuggestion` (`ui/discovery/animals.ts`) and drawn by `recipeBase(a, tank, roster)` at Balanced.
The gates are the generator's own: strict welfare (`summaryOf`, no Problem or Caution in the five stocking categories, `suggest.ts` `wordsOf`) and the firm limits (`compliance` semantics: money / minutes on the mean, and on the high end of `demandOf`'s item ranges, the Q1 rule; space exact via the tank's outside L x D).

| Approximation | Effect on the numbers |
|---|---|
| One concept per archetype x tank (no strategies, no finish ladder) | **Over-states cost.** The card scene is the Balanced build's gear (`buildsFor(...)[2]`) plus a full-density look: median Balanced set-up is **$1,118 FW / $1,007 TE**, the cheapest build with no finish is **0.51 x** that, and the Open-density scene is 0.85 x. The real generator's economy concept reaches **$120**. Section 3 brackets the truth between the two scene costs and the real generator. |
| Roster = `stockingSuggestion` (3 kinds), then fewer kinds while the strict rule words a problem | Real X1 rosters will come from `conceptMaker().attempt` instead. 73 of 130 candidates kept 3 kinds, 6 two, 29 one, 5 only the focal animal, 17 none (15 brackish: no brackish species data; 2 Big Fish Showcase: an oscar does not fit 75 / 150 gal). A roster of one kind ("8 ember tetras alone in a 29 gal iwagumi") passes welfare but is not a convincing "complete setup": X1 should build rosters through the generator's gates. |
| No owned-gear credit, no tax, stand priced as `demandOf` prices it | Slight over-statement for owners; none for the empty-equipment case measured. |
| `demandOf(scene)` costs the scene (the way `briefFeasibility.consequence` does) | This IS what the card will say, so card = scene holds. |
| Brackish (5 archetypes, 15 candidates) | No roster, so withheld (Q3). They cost **0 survivors** in every table. |
| Terrarium / paludarium figures | `demandOf` has a dry / fresh blend only; their numbers are the least modelled (Q2) and are provisional by the accepted rule; they are counted here as eligible so the world counts show the pool, not the policy. |

`gen` mode cross-checks with the REAL `suggestSetups` (23 demand concepts: freshwater 4, saltwater 1, terrarium 17, vivarium 1; no paludarium, no brackish). Its counts are concepts after strategies and the finish ladder, **not comparable one to one** with the VD pool, but they show where the real gates land.

## 1. The pool, built without rendering

### 1.1 Wall time (130 candidates, Node, no browser; `pool` mode)
Two full runs; the first was on a quieter moment. Per-candidate stage times, ms:

| stage | n | run 1 mean / median / p95 | run 2 mean / median / p95 / max |
|---|---|---|---|
| roster (`stockingSuggestion` ladder + cheapest-build floor) | 129 | 223 / 191 / 619 | 294 / 227 / 762 / 4,083 |
| scene (`recipeBase`: the density trio, up to 12 composition seeds searched) | 129 | 476 / 163 / 1,980 | 1,112 / 201 / 2,566 / 40,477 |
| scene, the cheaper in-hand path (`tiles.ts previewOf(a, tank, inHand)`: the roster's balanced build, the look laid over it, no seed search) | 112 | not measured | 270 / **18** / 1,535 / 4,380 |
| figures (`demandOf` on the scene) | 129 | 26 / 30 / 44 | 39 / 34 / 81 / 634 |
| welfare gate (`summaryOf`) | 129 | 0 | 0 |
| **whole pool** | 130 | **95 s** | **219 s** |

By world, scene build (ms, run 2): the **`recipeBase` trio** FW mean 150 / median 75; **SW 3,621 / 1,016** (reef scenes: coral + rock; p95 27.9 s, one 40 s outlier); BK 172 / 120; TE 823 / 292; PA 715 / 156. The **in-hand path** FW mean 20; **SW 939**; TE 11; PA 69 (the render run's `buildMs` agrees: FW 5-46 ms, TE 42-112, PA 94-110, SW 0.9-1.4 s).
Scene snapshot size (what the candidate store keeps): **mean 10 kB, median 8, p95 23, max 30 kB** as JSON; 60 records is about 0.6 MB.

What this says:
1. The pure pool is **not** the cheap part the reconcile assumed: the roster ladder alone is 0.2-0.3 s per candidate (`suitableAnimals` + up to three `summaryOf` calls). 130 candidates = 38 s of rosters.
2. **Rosters do not depend on the limits** (no locked animals in Explore): compute them once per (archetype, tank) and keep them (memoise, or write a small generated table). Then a constraint change costs only the gates (figures 0.03 s each) and the scenes of the cards actually shown.
3. Use the **in-hand scene path** for cards (median 18 ms, SW the exception at ~1 s) instead of the `recipeBase` trio (median 163-201 ms, SW up to 40 s); the density slider stays the editor's job.
4. Build **incrementally**: the first batch needs about 12 gated candidates, not 130. Round-robin by world / family, stop once about 24 have passed the gates, and finish the rest in idle chunks. Reef (SW) candidates are the slow ones: build them last or only when the limits can carry saltwater at all.
5. The real generator's own pass (`gen` mode, `suggestSetups`, warm) is **0.8-2.9 s** for the whole 23-concept pool with strategies and finish ladders (none 1.2 s, $300 2.0 s, $600 1.6 s, space 2.9 s, care 0.8 s, $120 / month 2.6 s, tight 0.8 s, roomy 1.3 s). If X1 routes candidates through `conceptMaker`, a pool is a 1-3 s job per change of constraints.

### 1.2 What the pool holds
| world | archetypes | candidates | stocked | welfare pass | no roster | set-up $ min / p10 / median (Balanced scene) | min a week min / median | $ a month median |
|---|---|---|---|---|---|---|---|---|
| FW | 18 | 54 | 52 | 48 | 2 | 302 / 575 / 1,118 | 34 / 45 | 35 |
| SW | 10 | 30 | 30 | 30 | 0 | 1,636 / 2,092 / 2,991 | 81 / 94 | 154 |
| BK | 5 | 15 | 0 | 0 | 15 | - | - | - |
| TE | 7 | 19 | 19 | 19 | 0 | 460 / 558 / 1,007 | 12 / 20 | 22 |
| PA | 4 | 12 | 12 | 12 | 0 | 881 / 1,255 / 1,789 | 32 / 51 | 38 |
| all | 44 | 130 | 113 | 109 | 17 | | | |

Welfare turned away 4 stocked candidates (African Cichlid Rockscape in all three sizes, White Sand and Stone in 10 gal). Cheapest candidates on the VD side: Silk Plant Natural 5 gal and Betta Retreat 5 gal ($195 with no finish, $302 / $420 at the Balanced scene), the two jumping-spider terrariums ($213-221 floor).

## 2. Survivors under typical firm limits
Each cell is candidates / distinct archetypes ("looks"); a batch of six needs six looks to be varied. Space limit 36 x 18 in is on the tank's outside footprint. "Real" is `suggestSetups` (concepts / archetypes, mean-based gates).

| limit set | Balanced scene, high end (Q1) | Balanced, mean | Open density, high end | cheapest build, no finish, mean | **Real generator** | worlds left (VD, Balanced high end) |
|---|---|---|---|---|---|---|
| none | 109 / 38 | 109 / 38 | 109 / 38 | 109 / 38 | 33 / 23 | FW SW TE PA (4) |
| firm $300 start-up | **0 / 0** | 0 / 0 | 0 / 0 | 7 / 6 | 15 / 9 (FW 2, TE 7) | none |
| firm $600 start-up | **1 / 1** | 10 / 8 | 4 / 4 | 40 / 23 | 26 / 19 (FW 4, TE 15) | FW |
| firm 36 x 18 in | 48 / 32 | 48 / 32 | 48 / 32 | 48 / 32 | 33 / 23 | FW SW TE PA |
| firm 30 min a week | **10 / 5** | 16 / 7 | 10 / 5 | 16 / 7 | 26 / 17 (terrarium only) | **TE only** |
| firm $120 a month | 80 / 29 | 83 / 30 | 80 / 29 | 83 / 30 | 32 / 23 | FW SW(2) TE PA |
| tight: $300 + 30 min + 36 x 18 in | **0 / 0** | 0 / 0 | 0 / 0 | 2 / 1 | 14 / 7 (terrarium only) | none |
| roomy: $600 + 60 min + 48 x 24 in | **1 / 1** | 10 / 8 | 4 / 4 | 36 / 22 | 27 / 19 | FW |

Set-up budget curve (VD pool, eligible candidates / looks, by which scene the money reads):

| firm start-up cap | Balanced mean | Balanced high end | cheapest build (no finish) |
|---|---|---|---|
| $100, $150 | 0 | 0 | 0 |
| $200 | 0 | 0 | 2 / 2 looks |
| $300 | 0 | 0 | 7 / 6 looks, 2 worlds |
| $400 | 1 | 0 | 16 / 14 looks, 3 worlds |
| $600 | 10 | 1 / 1 look | 40 / 23 looks, 3 worlds |
| $1,000 | 30 | 14 / 10 looks, 2 worlds | 68 / 29 looks, 4 worlds |
| $1,500 | 51 | 35 / 19 looks, 3 worlds | 83 / 37 looks, 4 worlds |
| $3,000 | 89 | 65 / 28 looks, 4 worlds | 104 / 38 looks, 4 worlds |

Reading it:
- **Care time is a world filter.** A firm 30 min a week leaves terrariums only (FW minimum 34 min, PA 32, SW 81), in the VD pool and in the real generator alike. Spec criterion 2 (two worlds in the first batch) cannot hold there, and that is correct behaviour to explain, not a bug.
- **Saltwater is a money filter**: no SW candidate under $1,636 (VD) and none under $600 in the real generator either. Paludariums start at $881.
- **Budget under $300** leaves FW + terrarium only; the real generator still finds 15 concepts because its finish ladder and small tanks reach $120.
- The Q1 high-end rule costs a factor of 10 at the Balanced scene (10 -> 1 at $600). The truth for X1 sits between the Balanced-scene column and the generator column: X1 should build each card from the **cheapest build plus the finish ladder** (what `conceptMaker.attempt` does) and gate that scene, not from the Balanced build.

### 2.1 "Fewer than six, here is why": how often
Counting a batch as full only when it has six distinct looks (the diversity rule):

| pool definition | limit sets (of 8) with fewer than six looks |
|---|---|
| VD, Balanced scene, high end | **5** ($300, $600, care time, tight, roomy) |
| VD, Balanced, mean | 2 ($300, tight) |
| VD, cheapest build, no finish | 1 (tight) |
| Real generator | 0 (but 2 of the 8 are one world only, and at $300 FW has 2 looks) |

So the "fewer than six, here is why" message is a **normal state for any firm limit of $300 or less or 30 min a week or less**, and the per-limit reasons are cheap to collect (the `stats` counters the generator already keeps: say which firm limit removed which worlds: "saltwater starts at about $1,600", "freshwater tanks need 34+ minutes a week"). Under the Q1 rule the state is common even at $600.

## 3. Rendering a batch (Edge headless, `render` mode)
Path = the discovery flow's own: `Previews` (`ui/discovery/tiles.ts`) with the `shot` callback of `panels.ts` (scene put in the store for one draw, `viewer.thumbnail(480)`, tank put back), one page, canvas 930 x 800, thumbnail 480 wide JPEG (**20-30 kB each**, mean 24). Cards had full rosters (in-hand path). The rosters were made before the timer (about 2 s for the 12 cards, a pool cost). Batch 1 = FW, FW, SW, TE, PA, FW (6 different looks), batch 2 = FW, SW, FW, TE, PA, FW (6 more). Run on **Intel Arc Pro (iGPU), ANGLE D3D11**; the software run on SwiftShader Vulkan.

| run (fresh browser each) | batch 1, 6 cards, cold | batch 2, 6 NEW cards | batch 1 redrawn (scenes rebuilt, warm) | batch 1 again from the cache |
|---|---|---|---|---|
| GPU #1 (also pays the dev server's first module transforms) | **20.9 s** | **6.2 s** | 1.15 s | 0 ms |
| GPU #2 (server warm) | **20.5 s** | **6.0 s** | 1.16 s | 0 ms |
| Software GL (SwiftShader) | **86.8 s** | **61.7 s** | 49.6 s | 0 ms |

Per card on the GPU (build ms + shot ms, run #2; shot includes the viewer rebuilding the scene into three.js):

| batch 1 (cold) | | batch 2 (new looks, shaders warm) | |
|---|---|---|---|
| Dutch Garden (FW) | 7 + **8,286** | Stone and Wood Sculpture (FW) | 30 + 910 |
| Iwagumi Stone Garden (FW) | 17 + 3,552 | Reef Arches (SW) | 887 + 298 |
| LPS Coral Garden (SW) | 1,362 + 755 | Silk Plant Natural (FW) | 19 + 999 |
| Dart Frog Rainforest (TE) | 112 + 2,879 | Rocky Desert Canyon (TE) | 42 + 580 |
| Rainforest Waterfall (PA) | 94 + 2,522 | Riverbank Shore (PA) | 107 + 1,130 |
| Blackwater Creek (FW) | 25 + 898 | Big Fish Showcase (FW) | 0 + 984 |

What it says:
1. **Cold cost is first-use warm-up** (shaders, plant / fish / terrain assets), not the card: the first draw is 8.3 s, the same scenes drawn again take 0.1-0.2 s each (1.15 s for six). The dev server's transform cost is NOT the cause (run #1 and #2 agree within 0.4 s), but production caches may differ; **in the app** the editor's viewer has already drawn once, which removes some of this: not measured.
2. **A new look still costs about 1 s on a GPU** (0.3-1.1 s) even with warm shaders; this is per-look asset build. Six new cards = about 6 s of main-thread time. Each shot is synchronous, so the UI must **yield between cards**.
3. **Software GL is unusable for six**: 4.5-21 s per card, 87 s for a cold batch, even a warm redraw is 50 s. On software GL show three cards, text first, and draw each on request.
4. **Pre-warming is free time**: Equipment and Limits steps come first and last tens of seconds; draw one planted FW scene and one terrarium scene to an offscreen shot then (about 10 s of the 21 s).

## 4. Recommendations for the plan (X1-X3)

| Decision | Number / policy | Basis |
|---|---|---|
| Batch size | **6 on a GPU; 3 on software GL** | 6.0-6.2 s warm, 20.5 s cold; software 62-87 s |
| First paint | cards appear with name + stats + flat family-colour placeholder **at once** (the numbers do not need the picture); pictures stream in, view order | picture is the slow part (0.3-8 s each), figures are 40 ms |
| Pre-render | **no** next batch (a Like / Pass changes it); **2-card lookahead after the 4th reaction** (about 2 s); **pre-warm the renderer during Equipment / Limits** | adaptive batches; cold warm-up 10 s |
| "Show more" | draw the first 3 of the new batch in the first 3 s, the rest as they come | 1 s per new card |
| Image cache | in-memory `Map` by candidate id for the session (as `Previews`); persist a 320 px thumbnail only for **liked / saved** (about 10-15 kB x 60 = under 1 MB) | thumbs 20-30 kB at 480 px; localStorage shares its 5 MB with "My tanks" |
| Scene cache | none for passed / unreacted cards; the snapshot is stored only for liked / saved (mean 10 kB, max 30 kB, 60 records = 0.6 MB) | rebuild + redraw is 0.2 s warm |
| Pool | rosters cached per (archetype, tank) (or a generated table); gates per constraint change; build **round-robin by world, stop at about 24 gated, finish in idle chunks**; **cards use the cheapest build + finish ladder**, then are re-gated on the scene | 0.2-0.3 s per roster; 18-20 ms in-hand scene; saltwater scenes 1 s; Balanced-build scenes are too dear to ever fit $300 |
| Is 6 affordable | **yes on a GPU**; the cost is a one-time warm-up and about 1 s per new card, not the pool | section 3 |
| "Fewer than six" | design it as a **normal state**: per-limit reason lines ("no saltwater under about $1,600", "30 min a week leaves terrariums only", "no paludarium under about $880") from the stats counters | section 2.1 |
| Q1 width | decide the range width on purpose: high end = about 1.4 x the mean today, a $600 limit goes from 10 to 1 candidate on the Balanced scene; dogfooding should look at this first | section 2 |

## 5. Not measured / caveats
- Not idle (25-45 % CPU, 16-20 Edge processes); GPU is an integrated Intel Arc Pro: a discrete GPU will be faster, a low-end laptop slower. Headless Edge, 1280 x 800, one device-pixel ratio.
- The dev server was used (Vite per-module transform); a production build was not measured (the `__gb` handle is dev-only). Runs #1 and #2 agree, so the transform is not the cold cost, but production load times are not included.
- The first page had the app's default scene, not a user project; in the real flow the viewer will already have drawn.
- One concept per archetype x tank, no owned-gear credit, no tax, no second density; the finish ladder is not modelled in the VD pool (bracketed by the "cheapest build" column and the real generator).
- The in-hand scene path was timed for 112 candidates in Node; the browser draw was timed for 12 (6 FW, 2 SW, 2 TE, 2 PA). Counts per world in the render sample are small.
- Brackish: no roster, so no candidates (Q3). Paludarium / terrarium figures are the least modelled (Q2) and counted as eligible here.
- Re-run after OX3 lands: `node scripts/explore-spike.mjs gen` shows the real pool; the `pool` mode should then be rewritten onto `candidatePool` and compared with these tables.

## 6. Reproduce
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/explore-spike.mjs pool out=<file.json>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/explore-spike.mjs gen out=<file.json>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/explore-spike.mjs render out=<file.json> gl=d3d11,d3d11,swiftshader [save=<dir>]
```
Options are `key=value` (the PowerShell binder in `lowprio.ps1` swallows `--out`). `render` waits 3 s after the app is up before the first card (`settle=`): a thumbnail taken in the first moments of a GPU page is a blank 2 kB frame, so check `kB` (a real card is 15-30 kB).
