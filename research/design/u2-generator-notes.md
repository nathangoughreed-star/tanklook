# U2: generator rework (lane U2, 2026-10-28)

Files: `src/demand/suggest.ts` (rewritten below `Wants`), `src/demand/costlines.ts` (tax + supplies lines), `src/scene/finish.ts` (`finishTiers(..., maxLevel)`), tests in `test/suggest.test.ts` / `test/finish.test.ts`, pictures in `research/audits/u2/` (regenerate: `U2_CASES=1 npx vitest run test/u2cases.test.ts`, which writes `cases.json`).
No UI file touched; no Brief type created. Every new input is an optional field on `Wants`.

## What changed
1. **Pool.** For each archetype (or the one locked archetype), tank sizes (`sizesFor`: smallest .. biggest the ceiling allows, bisection as before) x design strategies (`STRATEGIES`) x finish tier. Memoised per call (strategies that land on one concept share one evaluation).
2. **Rejection.** Welfare = the unchanged strict rule (any Caution/Problem in the stocking summary, before AND after finishing) plus `meetsNeeds`. Hard constraints: set-up ceiling (all-in, tax included), upkeep / time caps, space, new `maxLengthMm`, new `ownTank`. An existing tank that does not hold the animals gives NO concept (never silently resized; U4 owns the explanation).
3. **Selection.** `selectDiverse(pool, 3)`: strongest first, then each next maximises `score + 14 x distance-to-nearest-chosen`; a pick must be at least `MIN_DISTANCE` (0.30) from every chosen one or it is not shown (so a locked animal at a tight budget may show 2, not 3 look-alikes).
4. **Budget = ceiling.** The set-up cap is no longer in `headroom` and no longer scored (no reward for spending, none for saving). `Proposal.underCeilingUsd` reports money left, information only. `capNote` and `USES_BUDGET` survive, only under `climb: true`.
5. **All-in cost.** `costLines` now: Tank, Stand, Substrate/hardscape/plants, Animals, Supplies (the water test kit and RO unit: the only set-up consumables the demand model prices), Gear, `Sales tax (x%)`, then owned items as $0 "you have". Lines still sum exactly to `totals.startupUsd`. New on `Proposal`: `preTaxUsd`, `taxUsd`, `taxPct`.
6. **Owned credits** unchanged; `ownedAssess` gains an `ownTank` flag (Tank row $0, note "Your tank").

## Strategies (named; `Proposal.strategy / strategyLabel / strategyBlurb`)
| id | open animals | locked animals | size | gear build | finish tier (non-climb) |
|---|---|---|---|---|---|
| economy | Cheapest start | Economy | smallest | cheapest | starter |
| size | Size first | Room to grow | biggest the ceiling allows (open: also a bigger group when the stocking rules allow, never for locked) | cheapest | lean |
| look | Look first | Aquascape first | middle | cheapest | lush |
| balanced | Balanced | (not used) | middle | balanced (filter headroom) | standard |
| equipment | (not used) | Equipment quality | middle | least-work gear | lean |
A strategy's tier is the TOP it may climb to: the best tier at or below it that passes every check is taken (`finishTiers(..., maxLevel)` never builds the richer ones). A size the money cannot carry falls back one size down, at most three tries.

## Diversity scoring
`conceptDistance` (0..1, weights sum to 1): different family .25, different archetype .25, different tank .15, different finish tier .10, price bands >= 25 % apart .10, different strategy .15. Base `score` = tags matched x 10 + headroom on the monthly / time caps x 5 + finish level x 1.5 - 0.5 per "not enough information" line (+ the old usage term x 20 only under `climb`). The diversity bonus (up to 14) outweighs the small quality terms, so variety wins over a second near-copy; tag matches (10 each) still win over variety.

## Budget semantics: tests changed deliberately
- `finish.test.ts` "the budget is a target ... 85 %" -> now runs with `climb: true` (and no longer asserts the three archetype ids: the pool is chosen by diversity). New "ceiling (the default)" test: at $3,000 a terrarium card may sit under 85 %, with no `capNote`.
- `finish.test.ts` "a bigger budget buys a bigger or richer tank" (>= 85 % of $1,500) -> `climb: true`.
- `suggest.test.ts`: saltwater alone / vivarium / arthropods asserted an exact one- or two-item archetype list; one archetype can now fill several slots with different concepts, so they assert kind, id sets and that every pick passes the strict rule.
- Added: diversity (pairwise distance), locked animal, ceiling, tax, max length / own tank, welfare gate.

## Tax: how it is handled, and rate-source options
`Wants.taxPct` (default 0, clamped 0..25), applied to ALL set-up dollars after owned credits (animals included: a conservative over-estimate; several US states exempt livestock or food, one line to change if Nathan wants animals excluded). The budget ceiling is checked on the ALL-IN number. Options for a rate source, none built: (a) the editable % in the brief (what exists); (b) a state dropdown with a static table of state base rates (small data file; local add-ons ignored; roughly +/- 2 points); (c) ZIP lookup (needs a service or a big table; adds a privacy question and a network dependency). Recommendation: (a) now, (b) later as a pre-fill of (a).

## Speed (per call, same machine, `now` fixed; baseline = origin/main 48d98251)
Same script, one process, calls in this order (cap $150, $200, $500, $800, $2,000, then no cap), ms: before 3061 / 641 / 1849 / 4211 / 2806 / 5540; after 2633 / 475 / 1874 / 4280 / 2952 / 3165. So no slower where the old code was already working. Different cold start (the audit script, which begins at $350 and $800 in a fresh process): 5.9 s and 7.3 s for the first open-animal call at each cap (the build caches are empty), 5.6 s at $2,500, and a locked animal 0.2-0.8 s. The generator evaluates 4 strategies per archetype instead of the first qualifying rung, offset by the per-call memo and the lazier `maxLevel` ladder. If it must be faster: evaluate only the three strongest archetypes per family, or cache `attempt` across calls (keyed on gear and tank, not on the day's prices).

## Observations for the coordinator / U4 / U5
- Finished tanks have a floor: the cheapest finished betta (5 gal, starter finish, with a stand) is $257, so a $200 ceiling with defaults yields nothing; with a stand, filter and heater already owned a $149 concept appears under the $200 ceiling (picture `cap200own.png`). A true $145 concept from nothing needs U5's bare-bottom / unfinished option.
- Only the water test kit is a priced set-up supply; dechlorinator, first food and salt mix are in upkeep. Adding them is a demand-model change (not done: nothing is credited that the model does not support).
- An existing tank skips bundled builds (a kit price cannot be split into "tank is $0"), so a few cheaper kit prices are not offered with `ownTank`.
- "Size first" on an animal that gains nothing from more room (jumping spider) shows the same size as the others; the label is the strategy, the tank is what the ceiling and the animal allow.

## Added after plan v2 (same lane)
- **Brief entry.** `suggestFromBrief(brief, P, units, now)` = `suggestSetups(briefToWants(brief))`; `Wants` entry point unchanged. Three one-block hooks in U1's `src/scene/brief.ts` (`briefToWants` / `briefFromWants`): `constraints.taxPct` <-> `Wants.taxPct`, a LOCKED `animals.stock` <-> `Wants.animals`, `constraints.existingTank` (model id) <-> `Wants.ownTank`. A preference-status stock is NOT a lock and is ignored by the generator for now. Max tank length has no brief item yet: `Wants.maxLengthMm` exists, U1/U3 can add `constraints.maxLength`.
- **Experience** (`Constraints.experience` 0/1/2, from `preferences.experience`): `Proposal.complexity` (0..1, from minutes a week, salt, CO2, very small volume, lush tier) moves the score gently (beginner -6 x complexity, expert +3 x complexity), never the pool; `Proposal.experienceNote` says so where it matters. Nothing is ever removed for experience.
- **Trade-off line** `Proposal.tradeoff`: strategy text with the real numbers (gallons, tier, minutes, $ under the ceiling, and "No stand: sits on a sturdy counter (a stand would add about $N)"). Welfare is never one of the things traded.
- **Sixth strategy `scape`** ("Different look" / "Alternative aquascape"): the same animals in the second-best aquascape style (`finishTiers(..., forceStyle)`; a style that draws no plants is rejected). `conceptDistance` now includes the style (+0.10; family and archetype are .20 each).
- **No stand on a small tank**: when `needStand` is unset, a tank of 10 gal or less is priced without a stand for the cheapest start, and for any other strategy that fails only because of the stand; each says so. A stated `needStand` (true or false) is always respected. This is what makes "$200 and nothing else" return three concepts (betta cheapest start, betta other look, jumping spider).
- **Infeasible** (`Suggestions.infeasible`): `{ limitingFactor: budget | upkeep | time | space | tank | animals | welfare, text, alternatives: [{ kind, text, delta? }] }`, filled from the closest misses; U4 owns the words and more alternatives. `Miss` is unchanged.
- **For U7**: cost lines are stable and itemised (Tank, Stand, finish, Animals, Supplies, Gear, tax, owned $0); `build.gear` and `build.finish.lines` are the gear items.
