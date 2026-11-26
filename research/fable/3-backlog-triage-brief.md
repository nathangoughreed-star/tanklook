# TankLook backlog triage: evidence brief for Fable

Written 2026-11-25 from origin/main fcca8621 (build 2777). Read-only evidence; the judgment is yours.

## THE QUESTION

"Here is everything open or proposed for TankLook. Rank it by value to users ÷ effort, against the product vision. Which items should be cut, merged or deferred? Propose the next two weeks as at most 3 parallel lanes, each a coherent work unit."

## Product and vision (Nathan, 2026-11-13, research/design/w1-ab-context.md "Nathan's answers")

TankLook (tanklook.com, planned rename Yourarium, domain bought) is Nathan's personal learning side project: a browser 3D aquarium / vivarium planner (Vite + TypeScript + three.js). Users: anyone interested in aquariums, every experience level. Purpose: plan, evaluate, be inspired, learn; design something that fits their needs, preferences and constraints; explore ideas they would not have had; find the best tank. Experience level is an optional gate (animals, plants, gear), not automatic guidance. Money matters: accurate budget, deal sweeps, cheaper equivalents, bundles. Out of scope: care and build-plan guidance (cycling, upkeep); the product should supply what is "hard to replicate in an AI chatbot": info, experience, customizability. No monetization, no users, no analytics yet. Work is done by parallel Claude chats ("lanes") briefed from prompts/*.md and tracked in research/requests.md.

## What exists today (so you can judge value)

- New shell UI (default since 2026-11-15; old UI at ?ui=1 until about 11-29): left menu sections Tank, Scape (hardscape, substrate, backgrounds), Plants, Animals, Equipment, Preferences, Constraints, View, Settings, Print, Compare; header with habitat check, cost pill, water chip. Start sheet (blank tank, starters and kits, from an animal I want, open saved, example tanks, bundles and sales). Source: src/shell, src/ui (subdirs and files: discover, guided, ab, coach, explore, buildPlanSheet, dealMatch, featuredDeals, stockPlan, parGuide, lightContours, planSheet, report).
- Tank model: commercial tank products (picker with filters, baked tiles) plus a custom tank maker (box, polygon, pie, braces, glass-thickness solver with safety factor, "Free: size / Free: glass" modes, glass price estimates; box-only so far, R149 asks for polygon).
- Stocking and habitat checks: about 120 species (freshwater, marine, inverts, herps) with sourced care data, compatibility, stocking density, welfare gates, origin / continent filters; species care levels audited; plant and gear difficulty tables exist (data; the optional experience gate uses them).
- Fish: 3D photo-built "build B" models from ChatGPT 5-row sheets; 45 approved fish are live (src/data/fishLive.json "live" has 45 entries), the rest still use the older procedural model. Swim simulation with per-species behavior (schooling, burst and coast, bottom dwellers, habits, frogs, crawlers, otos clinging).
- Plants: procedural 3D plants (about 25 types) with growth timeline, sway, emersed forms, algae condition slider; R151 is adding painted leaf textures.
- Scene and rendering: substrate blends and contours, rock / wood hardscape, 3D and photo backgrounds, caustics, light map with PAR bands, split view, AR (hidden: ?ar=ios, WebXR on Android), full screen, PNG export, phone / tablet pass.
- Gear: catalogue of real filters, heaters, lights, hoods, stands, canisters, sumps, overflows with prices, fit rules, "I own it" and lock; Plumbing view; deals engine with re-check sweeps (37 deals plus 75 gear sales swept 11-18), kits and bundles (Apply on the bundle card), cost and upkeep drawer ("Lower it?").
- Discover: in-editor "Ideas" with Keep / Like / Dislike, A/B compare screen (stays), Guided setup.
- Aquarium-only switch (AQ1): terrarium / paludarium / herp features exist but are hidden on the live site.
- Process: 277 lane briefs, about 150 requests (R1-R151), 2,777 commits. Deploys to GitHub Pages; a deploy was stuck at build 2696 until fcca8621 today.

## How status was decided

- Requests: research/requests.md "Open" table (a long table that also contains finished rows; the "Closed" table holds only about 12), cross-checked with `git log origin/main` grep on each R-number. Nearly every row R8-R143 has a commit citing it, so "open" below means: no cite, a "not started" / "waiting" / "on hold" note, or Nathan said later it is not right yet. The file is stale in places (R148 says "pending merge" but 881a2469 is on main; R7 and R9 were answered 11-16 "keep Habitat" / "fine").
- Lanes: 277 distinct lane briefs: 234 committed in the worktree prompts/ plus 43 untracked-only in `C:\Users\nreed\Glass Box\prompts\` (marked * in the appendix; all dated 10-13 to 10-16 and mostly landed). Status = commits on origin/main whose subject cites the lane ID. "landed sha date" = latest citing commit; "cited" = only one commit cites it, or the ID is a 1-2 letter code that may be noise (probably landed, unverified); "unknown" = nothing cites it. Size S / M / L is a proxy from brief length (under 2.5 KB / under 4 KB / longer) plus my reading of scope.
- HANDOFF.md is stale (its newest state block is C27, 2026-11-18); live state is in git log and research/fish-sheets/HANDOFF-batch-b8.md.
- Counts: 277 lane briefs = about 168 landed (2+ citing commits), about 106 "cited" (probably landed), 3 unknown; plus manual calls: AD never started, LB prototype only, GX landed, PT in progress. Open requests: about 14 genuinely open or unverified (R144, R145, R146 tail, R147 x2, R142, R143, R148 tail, R149, R150, R151, R98, R124, plus the shelved R75) out of 151.

## OPEN OR PROPOSED ITEMS (by area)

Size: S = under a day of one lane; M = a few days; L = a week or more, or heavy review by Nathan. "Nathan-gated" = he must generate ChatGPT sheets or judge on screen.

### Visuals / art
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| R151 / PT | Plant leaf textures | Painted leaf atlas cut from ChatGPT sheets on the procedural plants ("plants look kind of crappy" next to build-B fish). Pilot crypt, vallisneria, Monte Carlo carpet, then batch 2 ten more families; relief, backlight, sheen, soft edges, AO | M (more families Nathan-gated) | IN PROGRESS: about 16 commits on main today (766d29b1 .. 55ccf7c0, 85f41835). Open: remaining plant types; shader +0.57 ms GPU measured; plantFx review switch | plants, performance (atlas size, shader), fish sheet workflow |
| R144 | Fish art style | Move from photo-wrapped toward a stylized look between photo and cartoon ("never photo-realistic"; painted rejected twice) | M | IN DISCUSSION: flag-gated 2D card options for Nathan to pick; default unchanged | conflicts with R146 (45 photo-built fish live) and the b7/b8 pipeline |
| E-GEN | Generated fish models | Image-to-3D with finless body plus fin cut-outs; Nathan 11-22 "better than build B" (oscar); needs a Hugging Face Pro account he has not bought | L, experimental | EXPERIMENT: one species built, pipeline not yet repeatable (prompts/coordinator-egen.md, research/multiview-to-3d.md) | competes with build-B for the same fish; R144 |
| R98 / PM1 | Gear drawn from product photos | All ~290 gear products in true colors, sheen, shape; visible-gear batch ~94 looks (~10 % of a weekly bucket), full ~170 (~16 %) | L (token-costly) | ON HOLD: Nathan 11-18 "revisit it on friday" (11-20); hood tiles still have no pictures | memory real-gear-true-colours; R96 stands (done) |
| VF plan | Visual fidelity stages (shader, plant variety, substrate) | | - | landed (f7cb679e, 11-13) | PT builds on it |
| (ideas) | Rule-of-thirds overlay, named layout variants + hi-res PNG, follow-a-fish camera, photo overlay for tracing stones | inspiration / sharing | S each | PROPOSED only (research/feature-ideas.md) | |

### Fish models and roster
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| R146 / b7 / b8 | Build-B fish approvals | Every species on the build-B photo model, one by one as Nathan approves | M, long tail, Nathan-gated | b7 done (45 live). b8: 21 remaining old-model fish, prompts written; group 1-3 built not live (06d18c8f: merah, exclamation, chili, clownpleco, pleco, demasoni, kadango, livingstonii, afra, syno); royal gramma (should be purple) and blackskirt (dark "skirt") NEED WORK; fancy goldfish, kuhli, hillstream excluded | R147, R144, load size |
| R147 | Colour types under one species | Colour-type menu within a species (discus red-turquoise, swordtail green, albino as one form); one new sheet per form; 19 f1-gen folders exist, unsheeted | L | NOT STARTED (interim: forms repaint the old model, species.ts formBase) | R146, albino AL1, CM3 forms (13 species) |
| R145 | Air-gulping behavior | Research which species surface-gulp (bichir, bettas, gouramis, corydoras, kuhli, plecos) and add a surface-trip behavior | S-M | NOT STARTED | fishBehavior.ts; R105 / R106 / R118 landed |
| R142 / R143 | Backfill species onboarding gaps | About 100 older species: 76 needs lines, 42 behavior rows, 33 space facts (research/species-onboarding-baseline.json) | M-L | UNKNOWN (R142 logged 11-19 "after RX1"; no citing commit found) | R141 checklist landed |
| R150 | Yellow lab roll fix | Fish stop banking onto their sides | S | BUILT (745ff9dc on main); Nathan said "NOT fixed" before fix 2; unconfirmed on live | swimSim |
| R139 roster | Roster expansion | 15 freshwater + marine gaps | M | landed in batches (RX1 / RX2) | b8 |
| (ideas) | Reef-safe flags, pair ratings with reason + fix, juvenile vs adult check | stocking checks | S-M | PROPOSED (feature-ideas 2, 3, 9); may partly exist, unverified | R143 |

### Plants
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| AD | Plant and coral light-and-feeding advice | Warn when light / CO2 tier is below need, auto-populate to fit, scape shading; effort tiers (Nathan 10-16 "no stretch slider") | L | NEVER STARTED (brief only in shared `prompts/lane-AD-plant-advice.md`) | "expected plant outcomes" idea, plant difficulty table, light map (PAR), R151 |
| (idea) | Expected plant outcomes toggle | Render a struggling plant leggy / pale at a too-low tier; per species ideal, minimum, "struggles below" tier | L | PROPOSED 2026-10-16 (Nathan, research/feature-ideas.md) | AD (same data), PT |
| (idea) | Time-based sim (nitrogen, algae) | | L | PROPOSED, deferred ("would change what the tool is") | |

### Gear and deals
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| R148 / R149 / GC | Glass check | R148 Free: size / Free: glass, mixed thickness, bracing optimizer: landed 881a2469. R149: same for polygon tanks (flat panes, corner angle) | R149 M | R148 landed; R149 NOT STARTED | custom tank maker (advanced users only) |
| Deals sweep | Re-check sweep | Deals stay until a sweep proves them gone (R112); last sweep 11-18; recurring manual work (prompts/deals-sweep.md) | S, recurring | OPEN chore: most deals dated 11-18 are aging again | deals are a vision pillar |
| R124 | Which 55 gal kit includes a lid | check kit lid | S | WAITING on Nathan | KB kit-catalog landed |
| Audit items not started | Habitat load table + nitrogen budget; cost drawer with three builds / Show as Tank B (BL1 R75 SHELVED 11-18); constraint fields; light-map shade / dark spots; preferences size slider and avoid / exclusions; growth line; filterless gear; delete-all-animals | | each S-M | NOT STARTED, "only on his request" (HANDOFF "STATE AT C26") | |
| (idea) | Equipment sizing (filter turnover, heater watts, flow arrows) | | S math, M placement | PROPOSED (feature-ideas 7); partly in catalogue fit rules | |

### Planner and guided UX
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| Generate vs build-it-yourself | One look brief across steps | Nathan's open design question 11-18: shared Look brief chip row above all steps; every step Mine / Suggest with scope chip; order rocks, plants, fish, background; Discover becomes whole-tank ideas (prompts/coordinator-28.md item 3) | L (design first) | UNKNOWN whether any lane started; no commit found | R69, Discover, guided v2 landed, research/design/unified-setup-plan.md |
| R69 / DM1 | Discover six modes into three | Ideas / Fill the gaps / This or that | M | DISCUSSION, folded into the item above | |
| ?ui=1 removal | Delete old UI | Promised about 11-29 (README, R65) | M, low risk | DUE in 4 days | smaller bundle |
| Yourarium rename | Rename product, title, logo, domain redirect | | S-M | NOT SCHEDULED (HANDOFF 11-09) | |
| Shopping list / setup sheet | Bags, weight, plants, fixture as printable list | | S | feature-ideas #1 (10-15) says "not in src"; src now has buildPlanSheet / planSheet / setupsheet, so probably built; unverified | |
| R7 / R9 | Habitat tile name; round-rock substrate bug | | - | ANSWERED 11-16 (keep Habitat; fine); table not cleaned | |

### Performance and infrastructure
| ID | Title | Goal | Size | Status | Overlaps |
|---|---|---|---|---|---|
| R146 load | Lazy-load approved fish images | Every approved fish image (~380 KB each, 45 fish) loads before the app starts; load only fish in the tank, bake gallery stills (public/gallery/<look>.webp) | M | OPEN (noted in the R146 row) | grows with every b8 approval, the plant atlas, R98 images |
| CI / deploy health | Deploy guard | 45-minute test limit; live stuck at 2696; fcca8621 re-pinned baselines by hand | S | landed 0fc146f0 (11-24); fragile | every lane |
| E1 / E2, EF1-EF3, PL, SF | Perf baseline, code audit, shader link time, progressive load, single file | | - | landed (10-15 to 11-25) | |

### Herps / terrarium
Herp lanes (O herps-p1, R p2-small, G1 crested gecko, AN anoles, T1-T3 dry ground / terrestrial plants / dry hardscape, T4 aqua roster) all landed 10-14 to 10-29. AQ1 (R19) hides terrarium and herp features on the live site (code kept, one switch); African dwarf frogs stay. No open herp work. Deferred by Nathan's own choice.

### AR / mobile
| ID | Title | Goal | Size | Status |
|---|---|---|---|---|
| Q / T | AR view | WebXR (Android); AR Quick Look (iPhone, ?ar=ios), hidden | - | landed 10-14 (74bfd049, 8baa141f), hidden |
| W android-app | PWA + TWA APK | Steps 1-3 done (APK works on S24+) | M | PAUSED 10-14 before Play store material |
| S11 / PV1 | Phone and tablet pass | | - | landed |

### Other
| ID | Title | Size | Status |
|---|---|---|---|
| Monetization, analytics, accounts, community gallery | none exist; "back pocket" (needs a backend) | L | NOT PLANNED |
| LB length-bonus | tank shape in stocking density | M | PROTOTYPE only, "not shipped" (prompts/lane-LB-length-bonus.md, research/length-bonus.md) |

## Dependencies and overlaps

1. Load size and first visit: R146 (45 fish images before app start), R151 plant atlas, R98 gear images, and b8 (21 more fish) all add bytes; the lazy-load item fixes the first and caps the rest. Earlier load work (EF1-EF3, PL, SF) is landed.
2. Fish pipeline: b8 approvals, R147 colour types (one sheet per form, 19 folders), R144 style change and E-GEN all compete for Nathan's ChatGPT-sheet time and could invalidate each other (a style change would redo approved models).
3. Plants: R151 (look), AD plus "expected outcomes" (behavior and data), plant difficulty table, light map. AD and expected outcomes are one data model and should be one lane if either runs.
4. Glass / custom tank: R149 depends on the custom tank maker, which only advanced users reach.
5. Deals: the sweep is manual and recurring; Nathan repeatedly says deals are a main job; stale deals undercut it.
6. Process: every lane commits itself and ships through scripts/ship.sh; HANDOFF.md and requests.md are stale, so any plan starts with a state sweep.

## Known Nathan priorities (dated quotes)

- 2026-11-13 vision (research/design/w1-ab-context.md; memory product-vision): "provide the info and experience and customizability that would be hard to replicate in an ai chatbot." Care guidance "does not fit that scope." Deals / cheaper equivalents / bundles are a main job; no monetization yet.
- 2026-11-12 (research/requests.md header): "my concern is forgotten or lost work I already instructed a chat to fix"; 2026-11-18: "I need you to be keeping track of everything I point out that needs fixing and whether or not a solution has been implemented, and whether that solution is pushed live yet or not."
- 2026-11-12 (HANDOFF "NO LOST WORK"): prefers slow-to-live over lost work or a slow PC.
- 2026-11-14: likes the new UI more, keep it; 2026-11-15 "yea lets go ahead" (flip default).
- 2026-11-13: "Just double it" (caustics speed); "Hover is fine"; custom tank maker and commercial / custom tank groups approved.
- 2026-11-18: BL1 cost comparison "shelve this for now"; PM1 gear models "revisit it on friday"; "id rather find a blanket fix" (fish washout); deals keep showing until a sweep proves them gone.
- 2026-11-20 (R144): "The point was never to be photo-realistic"; fish look out of place next to substrate, equipment and plants; not cartoony.
- 2026-11-22 (E-GEN): the generated oscar "looks really good, better than build B."
- 2026-11-24 (R146): "can we just push them as they are approved?"; (R147) colour types "keeping them under the same species name but have a color type selection within the species ... This is where albino would go too."
- 2026-11-24 (R145): asked for an air-gulping research lane.
- 2026-11-25 (R151): "with how good our fish models are now, it makes the plants look kind of crappy by comparison."
- 2026-11-25 (R149): "why is the glass check box tanks only?"; "polygon isnt round though".
- Usage rule (user CLAUDE.md, 2026-10-27): the weekly bucket binds; lanes on Sonnet; at most 3 lanes; measure one batch before any big fan-out. Reference costs: PM1 all gear looks about 16 % of a weekly bucket; CL1 care-level audit about 833k tokens for 83 species.

## Files worth opening (about 15)

research/requests.md; research/design/w1-ab-context.md; prompts/coordinator-28.md; prompts/lane-PT-plant-textures.md; prompts/lane-GC-glass-check-redesign.md; prompts/coordinator-egen.md; research/multiview-to-3d.md; research/fish-sheets/HANDOFF-batch-b8.md; research/fish-sheets/PIPELINE.md; research/feature-ideas.md; research/roster-expansion-plan.md; research/species-onboarding-baseline.json; research/design/unified-setup-plan.md; prompts/deals-sweep.md; shared-folder-only `C:\Users\nreed\Glass Box\prompts\lane-AD-plant-advice.md`.

## Appendix: every lane brief, as "ID slug [size; status]" (* = brief exists only untracked in the shared folder)

Most are finished work from 2026-10-13 to 11-18, listed so you can see what already exists before cutting or merging. Areas are assigned by keyword and are approximate.

**plants** (19): A2 plant-library [M;cited: 72fd66e5 10-14] *; AD plant-advice [M;NEVER STARTED] *; AL algae [M;cited: c6c51549 10-15]; GR1 plant-growth [L;landed 6f700456 10-15] *; GR2 emersed-floaters [M;landed 74e8c5e0 10-15] *; GR3 growth-timeline [M;landed 0df94b10 10-15] *; GX reef-planted-gear [L;landed 840e1c02 (10-27)] *; LA leaf-algae [M;cited: aeda1f5b 10-23] *; LN1 light-and-plant-needs [M;landed 5678991d 11-03]; OG1 overgrown-garden [M;landed 40f30e8b 11-03]; P3 item-plant-edit [S;cited: ba93cba9 11-14]; P4 artificial-plants [M;cited: a2c7be83 11-14]; PC1 plant-cards [M;landed 03387a1d 11-15]; PG plant-gates [L;cited: 784260d9 10-16]; PP plant-polish [M;cited: 76970d1d 10-16]; PT plant-textures [L;cited: 3a129523 11-25]; S7 scape-plants [S;cited: accfd016 11-14]; VF B-plants [M;cited: f7cb679e 11-13] *; Z coral-seat [M;cited: 94f521c4 10-14] *

**other** (68): AB common [S;cited: 35ebdb6f 11-12]; AQ aqadvisor-ids [M;cited: 95b6b67f 10-19]; AQ1 aquarium-only [M;landed 6eda3c6e 11-13]; AT1 animals-tab [L;landed 646bdffb 11-15]; BC1 bare-and-clean [S;landed 62b2bd33 11-02]; BD2 bottom-dwellers-berm [S;landed 6e65e2c3 11-13]; BL1 budget-vs-luxury [M;landed 2b7054be 11-18]; BP ball-python [M;cited: c46ff784 10-16]; BP2 python-followups [M;landed 9b0096ac 10-16]; CB1 cabinet [L;landed deabab3f 11-12]; CB2 hose-cutout [S;landed e4d66ef2 11-13]; CG compat-gates [M;cited: e22d3095 10-19] *; CP content-pack [M;cited: 9c12b563 10-16]; DA1 animals-step-live [M;landed 40f30e8b 11-03]; DA2 length-flag [S;landed d4ebdf69 11-03]; DS expected-cost [L;cited: 062d35c9 10-19]; DS2 pirate-slice [S;landed adb15ea8 11-13]; DX0 foundation [S;landed ab2532ce 11-09]; ED1 default-environment [M;landed a13974f0 11-04]; EN enclosure [M;cited: b49fd69c 10-19]; GA1 available-generator [M;landed 47635284 11-02]; GL2 needs-spec [S;cited: b3fe4bcd 10-28] *; GM7 generic-only-types [M;landed c1db14c1 10-29]; GM8 suction-mounts [S;landed c18f07d3 11-13]; GR4 gpu-reveal [M;landed 06198381 10-15] *; GS1 graphics-settings [M;landed 004fa03e 11-13]; GS2 project-state [M;landed fb7820d3 11-16]; GS5 animals-first [M;landed 000c54df 11-03]; GS6 preserve-reeval [L;landed 81e9b092 11-02]; GV10 followups [M;landed fac31b82 10-30]; GV3 report [M;cited: b9698722 10-30]; GV6 narrowing [M;landed e2d3673d 11-02]; GV8 limit-ranges [L;landed 800e7505 10-30]; HC1 hob-clearance [S;landed 1d147abc 11-15]; IV1 integration-verify [M;landed c63cc677 11-10]; JS jumping-spider [M;cited: 3eee8bd4 10-16]; LB length-bonus [M;prototype, not shipped (research/length-bonus.md)] *; MM min-migration [L;cited: 65a18af9 10-21]; NB nitrogen-balance [M;cited: 8afc8e45 10-21]; NG3 live-loop [M;cited: 4912c5a2 10-29]; NG4 conflict-paths [M;landed 272370d0 10-29]; NG5 taste [M;landed aa8f8bd1 10-29]; NG6 effort-confidence [S;landed 94838d28 10-29]; OX2 explore-cost-spike [S;landed 939d9f96 11-02]; OX3 explore-pool-gate [M;landed 53e7e35d 11-02]; OX4 explore-store-rank [M;landed 0673fc0f 11-03]; P1 group-data [L;cited: 60ae2d74 11-13]; P10 experience [M;landed fdebd039 11-14]; P2 stock-edit [S;cited: 6d0b9c67 11-13]; P3 fullness-tile [M;cited: ba93cba9 11-14]; P5 one-home-limits [M;cited: 7ce8f042 11-14]; P7 file-ops [S;cited: 6e65e2c3 11-13]; QP3 archetype-thumbnails [S;landed cff9601e 11-10]; R p2-small [S;cited: 6bdc81e6 11-23] *; RF path1-rule-fixes [M;cited: 27328ec8 10-22]; S216b expert-calibration [L;landed fce561b2 10-26]; S4 animals [S;cited: c83bbc1c 11-14]; SB scatter-brush [M;cited: 88b1d7a1 10-19]; SE stocking-engine [L;cited: b3d3efa2 10-20]; SL2 resume-where-left-off [S;landed 10d38f2b 11-10]; SR stocking-rescale [L;cited: 01c73127 10-26]; SR1 rough-default [S;landed fb86abb1 11-12]; TA tarantula [M;cited: 7407dd1b 10-16]; UF1 flip-default [S;landed 5949b77b 11-15]; VD1 archetype-registry [M;landed 907e3ea4 10-30]; VD6 personalized-archetypes [M;landed ac232e04 11-02]; common c20 [S;landed dc1d6710 11-25]; source combine [L;landed 4ede86e0 11-25]

**planner/guided UX** (67): AB0 session [S;landed 32e2f0a0 11-10]; AB1 pairs [M;landed 8e34589b 11-10]; AB10 lock-contradiction [S;landed 11e3f069 11-10]; AB11 shared-scale [S;landed b7ffee0a 11-10]; AB12 top-menu [S;landed cd5b5cd8 11-12]; AB13 attribute-compare [S;landed 3821f1cc 11-10]; AB2 history [S;landed 32e2f0a0 11-10]; AB3 ab-screen [M;landed bc470f27 11-10]; AB4 start [M;landed 3476fd1e 11-09]; AB5 combine [L;landed 86a9c168 11-10]; AB6 quick-prefs [L;landed 9bd2d28e 11-10]; AB7 attribute-panel [S;landed 46335325 11-10]; AB9 preview-isolation [S;landed 26b5d1f3 11-10]; CM2 click-open-shell [S;landed b2173507 11-14]; CP1 split-constraints-prefs [S;landed 9238f947 11-13]; CS ci-split [M;cited: 22c83119 10-19]; DB1 demand-breakdown [S;landed dee9e08f 11-15]; DQ common [S;cited: 5946dd96 11-11]; DQ1 da-correctness [S;landed 2f9538df 11-11]; DQ10 inline-discover [M;landed b4fa79af 11-12]; DQ11 keep-like-dislike-ui [M;landed 436dc09b 11-12]; DQ12 breadth-conflicts [M;landed 8bc6770f 11-12]; DQ13 retire-ab [S;landed 5b51c08e 11-12]; DQ2 da-search [S;landed d80ef9b8 11-11]; DQ3 da-learning [S;landed eb3a3589 11-11]; DQ5 da-stocking [S;landed b016243a 11-11]; DQ6 discover-redesign-eval [M;landed 69064dd3 11-12]; DQ7 candidate-api [S;landed 5db3b5ff 11-12]; DQ9 rules-switch [S;landed a3cd4c16 11-12]; DS1 switches-discover-only [S;landed e0a268d3 11-18]; DX1 verdict [S;landed ab2532ce 11-09]; DX2 scoped-discovery [M;landed 3f34d58a 11-09]; DX4 discovery-ui [M;landed d78f2290 11-10]; DX5 one-project-start [M;landed 885d318a 11-09]; GV1 guided-shell [M;landed e2d3673d 11-02]; GV7 compromise-compare [M;landed b7a7c83c 10-30]; GW1 coach-engine [S;landed 3010d8bc 11-05]; HB1 header-bars [M;landed 59092102 11-15]; HM1 header-menu [S;landed 3e6e8c33 11-11]; HM2 view-toolbar [M;landed e96511aa 11-12]; HM3 split-toolbar [M;landed 251ec928 11-13]; KW start-wizard [L;cited: 593d2991 10-20]; LP1 panel-resize [M;landed 497ed3ce 11-12]; MS multiselect [M;cited: 88b1d7a1 10-19]; NG1 guided-sandbox [S;cited: 5f2156a9 10-29]; NG2 brief-v2 [S;landed c855a883 10-29]; NW1 new-starts-clean [S;landed 6ff2cc57 11-02]; OX5 explore-ui [M;landed 5b37f014 11-03]; P5 stocking-screen [M;cited: 7ce8f042 11-14]; P6a builds [M;landed 56f6e40d 10-20]; PS1 preview-state [M;landed 0b400ef5 11-14]; QP2 archetype-cards-ui [S;cited: cff9601e 11-10]; R9 port-owned-start [M;cited: e97c5343 11-16]; S1 shell-skeleton [S;cited: 2ab1f62d 11-13]; S10 discover [M;landed ea0bc0f2 11-14]; S11 phone-tablet [S;landed ec565514 11-14]; S2 files-start [S;cited: 6d0b9c67 11-13]; S5 constraints-prefs [M;cited: 67f2c792 11-14]; S8 view-settings-print [S;cited: 6d0b9c67 11-13]; S9 compare [S;cited: 24c42cd0 11-14]; SD start-chooser [M;cited: 37c8058b 10-19]; SL1 start-three [M;landed 73b1c645 11-09]; SS2 starters2 [M;landed b27d5608 10-19]; UI1 ui-inventory [M;landed b115cb49 11-13]; UI2 screen-map [L;landed d5ebb44b 11-13]; VD3 discovery-flow [L;landed 66e90a4e 11-02]; VD5 retire-old-guided [M;landed e2d3673d 11-02]

**AR/mobile** (17): AB8 pan-zoom-visible [S;landed 90572809 11-10]; CV1 css-var-check [S;landed e96511aa 11-12]; GD gear-deals [M;cited: c117bf92 10-20]; GD1 gear-drag [M;landed 3863afa7 11-15]; GG1 gear-groups [M;landed 40f30e8b 11-03]; GM1 gear-foundation [S;landed 38813040 10-29]; GM2 gear-card-ui [S;landed bd5da7a0 10-29]; GM3 gear-render [S;landed 2970495a 10-29]; GM5 gear-library [M;landed 8b02b7f6 10-29]; GM6 gear-pricing-ownership [M;landed 8b02b7f6 10-29]; P8 gear-own-lock [M;cited: 0b400ef5 11-14]; PM1 gear-photo-models [M;landed 8ebdc735 11-18]; Q ar-view [L;cited: 74bfd049 10-14] *; T ar-iphone [L;cited: 8baa141f 11-16] *; TG tech-gear-3d [L;cited: b81bd651 10-20]; V zoom-out [M;cited: 57e15c99 10-14] *; W android-app [L;cited: 175004f4 11-19]

**fish models** (26): AL1 albino-forms [L;landed 0b9308e9 11-15]; BT1 betta-cube-green [S;landed 2bb66694 11-02]; DQ8 feedback-model [S;landed 5db3b5ff 11-12]; F2 fish-hard [M;cited: 73831701 10-14] *; FA1 zebra-danio [S;landed e4d66ef2 11-13]; FA2 fish-washout [M;landed 5340c28a 11-14]; FE1 fin-erect [S;landed 1cc5dcba 11-15]; FM fish-merge [M;cited: 9273a773 10-16] *; FR1 finished-price-range [S;landed 5f1b7bdc 11-05]; FS1 sharks [M;landed eafd6c05 11-17]; GS4 onboarding-shell [L;landed 3aa81b93 11-16]; GS7 roster-memory [M;landed 40f30e8b 11-03]; GV4 animal-roster [L;landed 1fe1b722 10-30]; HB habitat-model [L;cited: 549c75a0 10-21]; KK demand-model [L;cited: 2f2c2153 10-19]; P final-fixes [M;cited: dc1d6710 11-25] *; QP1 archetype-model [M;landed 30179590 11-10]; RC1 roster-coherence [M;landed 6b39833c 11-03]; S fish-fins [M;cited: 0241ebc2 11-12] *; S2 fish-batch4 [M;cited: 6d0b9c67 11-13] *; SE2 species-calibration [L;landed 3364ed58 10-20]; SH setup-sheet [M;cited: 99dd3161 10-16]; T4 aqua-roster [M;cited: fc8f7854 10-16] *; X fish-p2-fresh [M;cited: 7fca7390 11-16] *; X2 fish-leftovers [M;cited: 48b28aa5 11-03] *; Y fish-p2-bottom-marine [M;cited: 06b37cc2 10-14] *

**herps/terrarium** (7): AN anoles [L;cited: 343437aa 10-19]; G1 crested-gecko [M;cited: 3e4c8dc3 10-29] *; GS gecko-support [M;cited: 4959cebb 10-19]; O herps-p1 [M;cited: e36b0473 10-14] *; T1 dry-ground [M;cited: 7480f70b 10-16] *; T2 terra-plants [M;cited: 3900fa9b 10-16] *; T3 dry-hardscape [M;cited: 1fd0ce3f 10-16] *

**performance** (24): AU1 request-audit [M;landed 9d6e6eeb 11-12]; CI deploy-health [L;cited: 0fc146f0 11-24]; DS1 styles-audit [M;landed e0a268d3 11-18]; DS3 decorative-recipe [M;landed fd8ff511 11-13]; E1 perf-baseline [M;cited: 4a0fac1f 11-20]; E2 code-audit [M;cited: 4a0fac1f 11-20]; EF1 shader-link [M;landed 3c47ffdf 10-15] *; EF2 edit-speed [M;landed 7f3c603b 10-15] *; EF3 download-size [M;landed ce0b5984 10-15] *; FS1 siamese-audit [S;landed eafd6c05 11-17]; FX1 audit-fixes [M;landed 2fc3c7a8 11-15]; GS1 reconcile [S;landed 004fa03e 11-13]; GV9 cleanup [M;landed f952e975 10-30]; MA min-audit [M;cited: ffdd57e5 10-21]; MX min-sourcing [M;cited: e3559d73 10-21]; OX1 explore-reconcile [M;landed b738d83c 11-02]; PL progressive-load [M;cited: 69f1ab67 10-15] *; S12 cleanup [M;unknown (no commit cites it)]; SF single-file [M;cited: 881a2469 11-25] *; SZ1 size-curve [S;landed 9d26ec7d 11-11]; VD2 capability-audit [S;landed ac232e04 11-02]; VD4 density-recipes [M;landed c451667e 11-02]; VF A-shader [L;cited: f7cb679e 11-13] *; VF8 water-motion-speed [S;landed 63abf321 11-13]

**gear & deals** (35): CT1 maker-braces [L;landed a1e1611f 11-15]; DM deal-match [L;cited: cfc5a6ca 10-20] *; DQ4 da-plumbing [S;cited: 127a60b2 11-11]; DX3 equipment [S;landed 3f34d58a 11-09]; EQ1 my-equipment-menu [S;landed 2ad19546 11-09]; EQ2 equipment-groups [M;landed 68c2d34a 11-15]; FL1 filter-unset [S;landed bad2e78c 11-03]; GC glass-check-redesign [L;cited: be40bbc6 11-25]; GL lights [M;cited: 18d1bafb 10-28] *; GM4 lights-library [S;landed 46488b90 10-29]; GP pumps [M;cited: 6ea29e00 10-27] *; GS1 glass-solver [L;landed 004fa03e 11-13]; GV2 need-driven-gear [L;landed 83d93f74 10-30]; HD1 hood-products [M;landed b857cd35 11-16]; IL1 inline-canister-gear [M;landed 4b8e4996 11-16]; KA tank-catalog [L;cited: fdbd4459 10-19]; KB kit-catalog [M;cited: 85f41835 11-25]; KC kit-light [M;cited: c6613eaf 10-19]; NT1 new-tank-fresh [M;landed bc3f8919 11-14]; P1 tank-edit [S;cited: 60ae2d74 11-13]; P2 tank-fit [M;cited: 6d0b9c67 11-13]; P2b tankfit-fixes [S;cited: 9c795cb9 10-20]; P4 tech-edit-units [S;cited: a2c7be83 11-14]; P9 custom-tank-library [S;cited: 60ae2d74 11-13]; PS1 price-sweep-moved [S;landed 0b400ef5 11-14]; PS2 price-sweep-1109 [S;landed 55410d69 11-11]; PV1 plumbing-mockups [M;landed 72bde51c 11-16]; S224b catalogue-merge [L;landed 6a1dfda9 10-26]; S3 tank-section [S;cited: a34b1a70 11-13]; S6 equipment [M;cited: 1aeba134 11-14]; SP1 stand-products [M;landed b857cd35 11-16]; ST1 sandbox-room-tank-picker [M;landed f7f7dc83 11-05]; TM tech-menu [L;cited: ee83337a 10-19]; WG1 stand-wood-grain [S;landed cf8b2f1a 11-03]; WT1 tinted-glass-water [M;landed 40f30e8b 11-03]

**visuals/art** (14): DF1 look-step-next [S;landed c0a15613 11-03]; GS3 look-first-tail [M;landed d205a68c 11-16]; GV5 look-after-stocking [M;landed e2d3673d 11-02]; LB1 lid-and-background [L;landed 40f30e8b 11-03]; P6b scape-plan [M;landed 4af5d701 10-20]; QP4 archetype-backgrounds [S;landed b9b4a7c9 11-10]; RK1 rock-weight-budget [M;landed 40f30e8b 11-03]; SD scape-density [M;cited: 37c8058b 10-19]; SG stone-grain [M;cited: e5ff62d5 10-16] *; SM1 substrate-mix-gradient [M;landed a5d607f0 11-14]; SS scape-styles [M;cited: f0b65e07 10-16] *; VF C-ground [M;cited: f7cb679e 11-13] *; VF C2-substrate-embed [M;cited: f7cb679e 11-13]; VF9 shadow-lines [S;landed a0b0e687 11-13]

## What a good answer looks like

1. A ranked table (value to users ÷ effort, against the vision) covering every OPEN or PROPOSED row above, with a one-line reason and the factor that moved it (for example "chatbot-hard", "deals pillar", "adds load size", "only advanced users").
2. A cut / merge / defer list with reasons: for example whether to cut E-GEN or R144 given 45 build-B fish are live; whether R147 colour types, AD, expected plant outcomes and R149 are worth their cost; whether R98 gear photo models, the Android app, AR and herp work stay deferred; which stale or answered rows to close; what to merge into one lane (AD + expected outcomes; lazy-load + gallery stills).
3. A plan for the next two weeks of at most 3 parallel lanes, each a coherent work unit with a one-paragraph brief: goal, scope, files to start in, definition of done (including a live check by build number and screenshot, per Nathan's "merged is not live" rule), rough token cost, and what it must not touch. Say which lane Nathan must feed (ChatGPT sheets) and which is autonomous, and name the first housekeeping step (stale requests.md and HANDOFF.md; ?ui=1 removal due about 11-29).
4. Flag any assumption the evidence cannot support (my gaps: R142 and generate-vs-build status, the "cited" lanes, whether feature-ideas items 1-10 already exist).

## THE QUESTION (restated)

"Here is everything open or proposed for TankLook. Rank it by value to users ÷ effort, against the product vision. Which items should be cut, merged or deferred? Propose the next two weeks as at most 3 parallel lanes, each a coherent work unit."
