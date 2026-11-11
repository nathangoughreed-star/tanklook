# Discovery algorithm: the LIVE path map (DQ1, 2026-11-11)

Read this instead of re-exploring (lanes DQ2-DQ5). Verified against origin/main at `5946dd96`. Paths are under `src/`.
Inactive/legacy: the Explore grid UI (`ui/explore/*`), `demand/taste.ts`, `ui/discover/panel.ts`. They share modules with the live path (`explore/pool.ts`, `explore/gate.ts`, `explore/aspects.ts`, `demand/suggest.ts` Wants), so edit those with care.

## 1. Preferences in: quick cards -> brief
| Step | Where |
|---|---|
| Cards (image tiles), habitat catalogue, per-card `layouts`, `families`, `told` keys, `axes` (natural / lush / colourful / ordered) | `scene/quickArchetypes.ts` `QUICK_ARCHETYPES` |
| Answers model + the ONE writer | `scene/quickPrefs.ts` `applyQuickPrefs(brief, answers)`; reader `answersOf(brief)`; `readQuickPrefs(brief)` -> `QuickPrefs` |
| What a card writes | Interested/Avoid -> `preferences.aspects.told` keys (+1 / -1, `explore/aspects.ts` `tell`); size band -> brief item `constraints.tankGal` at status `'preference'`; budget / care -> `constraints.budget` / `constraints.careMin` max, status `'hard'` if "firm" else `'preference'`; No live plants -> `appearance.plantMode='artificial'` status `hard`; No CO2 -> `preferences.lowtech` status `hard`. Card/size/avoid answers also live in project extras `quick` |
| Strength model | `Pref<T> = {value, strength: 'hard' \| 'prefer'}`; `passesHard(QuickPrefs, PrefFacts)` is the only quick-pref filter |
| UI that sets "firm" | Limits panel (`ui/setupBrief.ts`, `ui/report.ts`, `ui/welcomeGuard.ts`) sets an item's `status` to `hard`; the quick-pref screen sets `firm` on budget/care only. Size has no firm toggle on the quick screen: a firm size comes from the limit item's status |

## 2. Brief -> search rules (Wants)
- `scene/brief.ts` `briefToWants(brief)` -> `Wants` (`demand/suggest.ts`): `constraints.{startupUsd,monthlyUsd,minutesPerWeek}` as `{on,value}`, `flexLimits` (a limit whose status is not `hard`, or has `flex`, is FLEXIBLE: `explore/gate.ts` `numeric()` never filters on it), `mins` (lower bounds), `tankGal` (range), `kinds`, `ownTank`/`availTank`, owned gear.
- `demand/suggest.ts` `customTankWants` adds a custom existing tank.
- **P1 defect (verified)**: `briefToWants` copies `constraints.tankGal` into `w.tankGal` WITHOUT looking at status, and `w.tankGal` is a FIRM filter in `explore/pool.ts` `tanksFor` (catalogue sizes) and `explore/gate.ts` (`galBad` -> `block('size')`). Budget / care / monthly were already soft via `flexLimits`.

## 3. The pair generator `scene/pairGen.ts`
- Entry: `nextPair(project, brief, session, lookup, opts)` (called by `ui/ab/real.ts` `pair()`; `opts.prefs` overrides `readQuickPrefs`). Also `adapt()` (a record refitted to current locks) and `combine()` (a donor tab spliced in) share `ingest`.
- Types: `type` = `first | champion | fresh | final`; `purpose`; `Breadth` from `scene/breadth.ts` `breadthOf` (objective `explore|refine`, `targetDistance`).
- Candidate sources: (1) `fromPropose` -> `scene/discover.ts` `propose` on the baseline (current project variations); (2) `fromLook` -> `explore/pool.ts` `explorePool({only:[archetype]})` one look at a time, sizes 1 (first, no size pref) / 3; `looksFor(ctx, direction, type, champ)` orders the looks (preference order, then family round-robin).
- Candidate build: `ingest(ctx, scene, label, source, ids)`: no-live swap -> `confine` (scope, locks, freezes) -> `fitGear` -> `reconcileGear` -> `checkProposal` -> roster locks -> `equipPlan` rules -> `verdictOf` (welfare / physical) -> `scoreScene` (cost, care, `gateCandidate`) -> **`passesHard(c.prefs, ...)`** (the quick-pref hard filter) -> `finalCheck` -> `factsOf` -> `Pending {rec, entry:{fp, features}, tokens, world, sc}`.
- Features / descriptors (`scene/pairFacts.ts`): `subjectOf(S, sc, ids)` -> `explore/aspects.ts` `featuresOf(subject)` gives keys `world:`, `look:<family>`, `layout:<archetype>`, `natural:`, `colors:`, `plants:`, `species:`, `behavior:`, `size:`, `number:`, `visibility:`, `daily-care:`, `maintenance:`, `complexity:`.
- **P3 defect (verified)**: `subjectOf` hard-codes `plantMode:'live'` and `vivid:false`; `plants:` uses the plant-PIECE count with `LUSH_PLANTS=6`, so nearly everything is `lush`. `quickPrefs.axesOf` gives natural / lush / colourful / ordered weights but the live scorer only read `look.lush` (as `n >= 30` plants).
- Scoring: `scoreOf(p) = aspectScore(weightsOf(aspectsOf(brief)), features) + prefOf(p)` (0 for `fresh`). `prefOf`: size range in/out, floor/height, plants prefer, `look.lush`, `thumbBonus` (`scene/attrs.ts`). `weightsOf` mixes learned AND told weights (told = cards, so a card was already counted via its told keys AND `pf.plants`).
- Pair choice: `usable()` (unseen, not blocked, `explore/rank.ts` `rankEligible`) -> `choosePair` (first/fresh) or `chooseChallenger` (champion); distance `MIN_PAIR 0.12`, `visuallyDistinct` (`breadth.ts`); loop stops at `want` usable (3 champion / 4 otherwise) or after the soft deadline (`budgetMs` 2200 ms) with the hard stop at 4x.
- Cache: `PairCache` keyed by `sig` = hash of (rev, session, scope, freezes, direction, type, champion, prefs, brief, tank). Any brief change (taste events live in the brief) changes `sig`: I1 (DQ4).
- No-solution handling: `noSolution(...)`, `single` record when exactly one design fits.

## 4. Session feedback
- `ui/ab/real.ts` `createRealEngine`: `choose(outcome, why, otherGood, rel)` -> `scene/discoverySession.ts` `record()` (champion / pending-fresh state machine, returns `next: NextPair`) and `recordPair` (`explore/aspects.ts` `pairEvents`: winner like, loser pass; reasons narrow to tags). Then, **P4**: each AB13 attribute pick (`rel`) calls `setThumb(id, attr, elements, 1)`, which writes a `thumbs` entry (`attrs.ts` `setThumb`, scored by `thumbBonus`) AND a tagged aspect event (`recordAspect(kind:'tag')`, scored by `weightsOf`): two learning events per pick, both feeding `scoreOf`.
- `different()` -> `drawFor({type:'fresh'})`; `Like neither` broaden flag is written (`NextPair.broaden`) but not read (DQ4).
- Picks UI: `ui/ab/screen.ts` (`?debug` flag `DEBUG`, `ui/ab/metrics.ts` `statsHtml`).

## 5. Tests that exercise the live path
`test/ab1.test.ts` (nextPair, adapt, baseline), `ab6.test.ts` / `qp1.test.ts` (quick prefs), `ab7.test.ts` (thumbs/locks), `ab13.test.ts` (A / No opinion / B through `createRealEngine`), `ab-integration.test.ts`. DQ1's tests: `test/dq1.test.ts`.

## 6. What DQ1 changed (see the HANDOFF "DQ1" section)
- `scene/designAxes.ts` (new): design-derived descriptors computed from the generated `TankSetup`.
- `scene/scorePolicy.ts` (new): the one scoring policy and its `breakdown`; `pairGen` `scoreOf` calls it.
- `pairGen.liveWants` softens `tankGal` unless the limit item is `hard` (nextPair, adapt, combine); `explore/pool.ts` takes `Wants.tankGalPrefer` to include a preferred-range tank.
- `looksFor`: Avoid looks keep a reserved slot (never starved); no preference ordering for Explore Something Different.
- `real.ts` `setThumb`: an attribute pick writes ONE thing (the thumb entry).
