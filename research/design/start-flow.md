# Start flow: Guided design and Sandbox (design spec, 2026-10-27, for Nathan's review; no app code yet)

> **Revision 2026-10-27 (Nathan): Guardrails replace the Guided / Sandbox mode.** Nathan: a "guardrails" menu with a
> checkbox per gate (budget money, budget time, effort, experience level) that runs *separately* from how the user
> starts (a wanted stocking, a look, or sandbox). Section **(R)** below is the revised model; where it conflicts with
> (a), (b), (g) or (h), (R) wins. The rest (paths' screens, Evaluate, the rhythm model, Discover's generator, Create a look) stands.

## (R) Guardrails: one menu, independent of the start

**Two independent choices.** *How you start* (Welcome: An animal / A look / Help me discover / Sandbox, plus Open) only decides
the first screens and what gets pinned. *Which guardrails are on* decides what the tool enforces, from any start, at any time.
There is no Guided / Sandbox mode any more: Sandbox is just the empty-tank start, and a Sandbox user can tick the budget
guardrail; an animal-path user can untick everything.

**The menu** (a builder header button "Guardrails 3", count = how many are on; same panel opens from each path's first screen):
```
 Guardrails                                         what it does when ticked
 [x] Start-up budget    [$ 300     ]               gear / tank / animal choices over it are greyed, with the unlock cost
 [x] Monthly budget     [$ 20 / mo ]               same, on $ a month (power, food, ferts, CO2, losses)
 [ ] Care time          (5 min daily + weekends)   options that break the rhythm or the away-days are greyed
     Away from home     [up to 3 days]
 [x] Effort             (low | some | any)         CO2, high-light plants, salt, demanding species greyed above the level
 [ ] Experience         (new | some | experienced) per domain (fish, planted, salt, terrarium): risk scaling + species / gear
                                                   above the level greyed ("needs: some planted experience")
 --- always on, not in this list ---
 Animal welfare: eaten, temperature, outgrows the tank, too few in a group (hard truths; "I understand" to override, as today)
```
Ticked = enforced as a **trade-off card** when broken, greyed only when nothing can make it fit (Revision 2 below). Unticked = the number is
still shown (a badge on the option, the bar in the demand panel), never enforced. That is today's "Sandbox keeps gates as
badges only", now per guardrail.

**Data: it already exists.** `UserProfile.limits` (setupUsd, upkeep, minPerWeek, risk) and `UserProfile.skill` (per
domain) hold the values; the guardrails add one field `UserProfile.on: Partial<Record<'setup'|'upkeep'|'time'|'effort'|'skill', boolean>>`.
A value with its box unticked is kept (untick and re-tick loses nothing). Profile, not scene: guardrails are about the
person; the scene's `brief` keeps only what the start pinned (animals, style, space). `UserProfile.mode` is retired.

**Effort vs experience.** Effort = how much the setup asks (minutes, CO2, salt, misting by hand): what the user is
willing to do. Experience = what they know: it scales risk (`skillMul`, existing) and gates species and gear
`care` levels above their level. Two boxes because a beginner may accept effort and an expert may refuse it.

**What changes elsewhere in this spec:**
- (a) Welcome: four start tiles in one row (An animal / A look / Help me discover / Start empty), no Guided / Sandbox split;
  the goal-picker screen disappears (one click less). Discover *needs* guardrail values (its limits card *is* the Guardrails
  panel with the boxes pre-ticked); the other starts show a one-line "Guardrails: off. Set them" link and ask nothing.
- (b) "Switching modes" becomes ticking a box: the scene never changes; options re-grey live. The guided overlay's proposal
  cards (L9) appear only for guardrails that are ticked and broken ("$40 over your start-up budget: 3 ways back").
- (g) L1 becomes the four-tile Welcome (no mode split); L2 becomes **Guardrails menu** (profile field, panel, gating
  hook `gateOf(option, P)` used by tank / tech / animal / plant pickers, badges when unticked); the rest unchanged.
- (h) Q7 (mode toggle) is void; new questions R1-R3 below.

**Revision 2 (Nathan 2026-10-27): a ticked guardrail is a trade-off, not a wall.** Grey out only what the tool cannot
make work. People trade time for money or money for time to get the build they want, so when an action breaks a ticked
guardrail, the tool says so at that moment and offers the ways back, priced on every axis:
```
 Those 6 Cardinal tetras push your care time over: 52 of 45 min a week.
   Undo adding them                                    0 min over   $0
   4 Cardinals instead of 6                            44 min       -$9
   Water-change hose (fills and drains from the tap)   41 min       +$28
   Live plants: 8 stems (they eat nitrate: smaller
     water changes)                                    43 min       +$35 start-up, +$2 / mo
   Keep it, raise my care time to 55 min               (unticks nothing; edits the limit)
```
- **When it fires:** after any change (add an animal or plant, pick gear, resize the tank) that pushes a *ticked*
  guardrail over. One card, on the viewer, dismissable; never blocks the click. Unticked guardrails never raise it.
- **The options** are scene diffs searched over every lever the engines model: fewer or swapped animals (`swapsFor`,
  existing), gear and tech rows (water-change hose, auto feeder, ATO for salt, misting system for dry tanks, filter
  upgrade), live plants (the nitrogen model's uptake), tank size (step-up offers, existing). Each option shows its effect on
  *all* the guardrails, so a time fix that costs money shows the money.
- **Other ticked guardrails filter the options:** an option that breaks another ticked guardrail is not offered (a +$28
  hose is dropped if the start-up budget is ticked and has less than $28 left). If time and money are both ticked and full,
  the only option left may be Undo, as Nathan says.
- **Grey-out (absolute gate) only when nothing works:** in a picker, an option is greyed only if no option set makes it
  fit the ticked guardrails (the search above, run as a check: "even with a hose and plants, a 75 gal is 80 min a week").
  The greyed option's tooltip names the guardrail and the nearest miss. Everything else stays clickable and leads to the card.
- **Engine honesty, to settle before L9:** in today's model a **bigger filter does not cut water changes**: the
  water-change share comes from the nitrogen budget (`waterChangeFraction` in scene/stocking.ts: nitrate to remove, after
  plant uptake), and a filter turns ammonia into nitrate, it does not remove it. A bigger filter lowers the Filtration bar
  (fullness), not the minutes. So the levers that move *time* today are: fewer / smaller animals, live plants, the
  water-change hose (`wcmethod` row), auto feeder, ATO, misting system. An **automatic water-change system** is not in the
  catalogue: a new tech row (price, minutes saved, provenance), from the gear research lane. See question R4.
- Builds on: `swapsFor` / `applySwap` (demand/swaps.ts), `fitToLimits` (demand/fit.ts, greedy over swaps today; extended
  with tech-row and plant moves), `limitState`, the fork card's step-up offers. The card is lane L9; the "can anything make
  it fit" check is part of it, shared with the pickers' grey-out.

**R questions (with recommendations):**
- R4. Bigger filter vs water changes. Rec: keep the engine as it is (filters do not remove nitrate; sourced in the
  nitrogen model) and leave a bigger filter out of the *time* options; offer it where it belongs, against the Filtration
  bar. Add an automatic water-change system as a new researched tech row.
- R5. How many options on the card? Rec: Undo plus the best 3, ranked by the smallest change to what the user just did
  (keep their fish first), each with its full cost line; "more ways" folds out the rest.
- R1. Name. Rec: **"Guardrails"** (Nathan's word; plain, says "keeps me in" not "forbids"). Alternatives: "My limits", "Ground rules".
- R2. Default for a first-time user? Rec: all **off**, values empty; Discover pre-ticks the ones it asked. No silent gates.
- R3. Experience: one level or per domain? Rec: one control shown ("new / some / experienced"), with "set per kind of tank"
  folding out to the existing four domains in `UserProfile.skill`.

Source: Nathan's two-mode proposal, relayed by Coordinator 12, reconciled with the 2026-10-20 five-path design (HANDOFF-archive.md, "User flow: paths, budget, deals") and with what is built on main (build after 09ad88d).

## 0. Reconciling the two designs

| 2026-10-20 (five paths) | This spec | Status on main |
|---|---|---|
| An animal I want | Guided > **Build around an animal** | Built: stocking screen (ui/stockPlan.ts), three builds (ui/buildPick.ts, scene/builds.ts), scape choice (ui/scapePick.ts) |
| A look I want | Guided > **Create a look** | Style tiles exist only after a build (scapePick); no look-first entry |
| Just want to try the hobby | Guided > **Help me discover** | Not built; the demand engine, `fitToLimits`, `buildsFor` exist |
| A tank I already own | Not a path: **Evaluate my setup**, a builder action in both modes | Pieces exist: stockSummary, fullness tile, plan / setup sheets, `tankDiff`, deal drift |
| Sandbox | **Sandbox** mode | = today's "Start from scratch"; gates as badges only (Nathan's standing answer) |

Kept from 10-20 unchanged: pins, not a mode (the guided layer only fills what is not pinned); budget is a layer in every path; deals wherever a purchase is decided; AI-proof (our numbers, their tank to scale, one line for general knowledge); the fork card when the anchor does not fit; three finished tanks side by side. What changes: "mode" now names the *amount of help* (Guided / Sandbox), and both modes edit the same scene, so it is a view setting, not a fork in the data.

## (a) Start screen and each path's first three screens

**Welcome** (replaces the New menu's first view; first launch opens it; a shared link skips it, as today):
```
+------------------------------------------------------------------+
|                      Welcome to TankLook                         |
|  +---------------------------+   +---------------------------+   |
|  |  GUIDED DESIGN            |   |  SANDBOX                  |   |
|  |  Tell us what you want,   |   |  Build, explore and       |   |
|  |  we'll help plan a setup  |   |  experiment, complete     |   |
|  |  that suits it.           |   |  freedom.                 |   |
|  +---------------------------+   +---------------------------+   |
|  On sale now: [deal] [deal] [deal]   (featuredDeals, as today)   |
|  Open a saved tank / starter tank >        Already have a tank? > |
+------------------------------------------------------------------+
```
"Already have a tank?" = Sandbox with an empty tank of the size they type, and the Evaluate button pulsing once (see c, Q1).

**Guided > goal** (one screen, three tiles, each with a 3D thumbnail from the examples):
```
 What do you have in mind?
 [ Build around an animal ]  choose a species, we design its home
 [ Create a look ]           start from a style or a picture
 [ Help me discover ]        find a setup for your budget, space, life
 < back                                   just let me build (Sandbox) >
```

**Path 1, Build around an animal** (built; only the entry changes):
1. Stocking screen (stockPlan.ts): search, count picker with bands, tankmates, the bare tank growing in the viewer. The enclosure is visible from the first click.
2. Three builds (buildPick.ts): cheapest / least work / balanced, each in 3D with setup $, $ a month, minutes a week.
3. Scape choice (scapePick.ts): live / artificial / mixed, style tiles rendered in their tank. Then the builder, guided layer on.

**Path 2, Create a look:**
```
 1  Pick a look                       2  Your tank                       3  Animals that suit it
 [nature][iwagumi][dutch][jungle]     viewer: the style in a 20 gal      ranked list (rankStyles reversed),
 [reef][paludarium][arid][rainfor.]   long; size chips 10/20L/29/40/75   each with count picker; "skip,
 [ Use my own picture ]               live / artificial / mixed          no animals yet"
 each tile: setup $ span, min/wk,     growth slider: today / month 6     -> builder, guided layer on
 light / CO2 need                     (full vs low-tech side by side)
```
Screen 2 is already an editable tank; screen 3 is optional.

**Path 3, Help me discover:**
```
 1  Four limits (one card)            2  Three proposals                  3  The picked one in the builder
 Start-up budget   [$ 250   ]         [planted shrimp][community][gecko]   guided layer on; the limits show
 Monthly budget    [$ 20 /mo]         each: 3D, $ start, $/mo, rhythm      as a pin chip; Refine chips move
 Setup time        (one evening |     ("5 min daily + 30 min Sat"),        to the side panel
                    one weekend | more) away-days, why it fits
 Care rhythm       (a few min daily | Refine: [space] [water / land]
                    weekends only |   [plants / animals] [colorful | active
                    every few days)   | natural | low-maint]
 Away from home    [up to 3 days]     each chip re-ranks live
                    [ Show me setups ]
```
Space and preferences are refinements on screen 2, not questions before it: the user sees three tanks after one card (the "no long questionnaire" rule). Every field has a default (unset = no limit), so "Show me setups" works with nothing filled in.

## (b) Pinned answers and switching modes

**State.** One optional field per tank, no scene-version bump (same pattern as `dealPin` / `gearPins`):
```
TankSetup.brief?: {
  goal?: 'animal' | 'look' | 'discover';
  pins: {                         // each value carries how it was set
    animals?, style?, plantMode?, space?: {L,W,H mm},
    setupUsd?, upkeepUsdMo?, setupHours?, rhythm?: Rhythm, awayDays?, prefs?: string[]
  };
  src: Record<pinKey, 'asked' | 'clicked' | 'derived'>;   // "clicks count as answers"
  evalBase?: PartSig & { demand: totals };                  // (c) the Evaluate baseline
}
```
Budget pins write through to the existing `UserProfile.limits` (setupUsd, upkeep, minPerWeek), so the demand panel and `fitToLimits` read them unchanged. `UserProfile.mode` ('guided' | 'free') already exists and becomes the mode switch.

**Switching never loses work** because the mode owns no scene data:
- The scene (tanks, items, fish, tech, brief) is the one source; Guided and Sandbox both edit it through `Store`, so undo spans the switch.
- Guided = an overlay that *reads* scene + brief and *proposes* diffs: proposal cards (built from `swapsFor`, `fitToLimits`, the fork card, step-up offers), each a scene -> scene' with its Delta (setup, upkeep, minutes, risk). Accept applies through Store (one undo step); dismiss records nothing in the scene.
- Sandbox hides the overlay; fit gates show as badges; hard truths still show (as today). Pins stay in the brief, untouched.
- Sandbox -> Guided: the overlay derives pins from the scene (animals present = animal pins with src 'derived'), asks only what is missing, never resets the tank.
- The brief saves with the scene and rides the share link; a pin chip in the builder header lists pins and reopens the path's card to edit one.

## (c) Evaluate my setup

A builder toolbar button in both modes ("Evaluate"), opening a side panel; no new engine.
```
 Your setup: 29 gal, 14 animals, 6 plants          [Set as my starting point]
 Stocking      five-category summary (stockSummary.ts), worst first, each opens its items
 Fullness      space / filtration bars (fullnessTile.ts)
 Running it    $ a month, care rhythm (d), minutes a week, risk word (demand engine)
 Light         plant light check (lightcheck)            Lid   lidAdvice
 Plan          plan sheet verdict + shopping list traced to needs (planSheet.ts / scene/plan.ts)
 --- after "Set as my starting point" ---
 What changed  tankDiff(base, now): +4 cardinals, 20 gal -> 29 gal
 It costs      +$212 to buy (only the changed parts: changedParts + setup sheet rows),
               +$3.10 / mo, +6 min / wk; deals for the changed parts (gearOffers, dealMatches)
```
- Owners model their tank in Sandbox (or any mode), press Evaluate, then "Set as my starting point" stores `brief.evalBase` (partSig of the priced parts plus demand totals). From then on the panel prices the change, not the tank (the 10-20 owner rule); setup $ of what they already own is shown greyed as "already yours".
- Depth follows the goal (10-20): the panel asks nothing; plants count for the numbers, the scape only if they model it.
- Reuse: stockSummary, fullnessTile, demandOf / limitState, setupsheet (diff rows only), planSheet, tankDiff (ui/diff.ts), dealdrift partSig / changedParts, gearOffers.

## (d) Help me discover

**Maintenance as a rhythm.** Today every `work` row in demand/engine.ts is a mean `minPerWeek` (water change, feeding, glass, testing, filter, salt work, misting, yearly). Add a cadence to each row, keeping its weekly mean identical (no numbers move, no re-bless):
```
Chore { key, label, minutes, everyDays: 1 | 2-3 | 7 | 14 | 30 | 365, skippable: days }
Rhythm (derived) = { dailyMin, weeklySessionMin, monthlyMin, maxAwayDays, needs: ['daily feeding', ...] }
```
`maxAwayDays` = the smallest "skippable" over the tank's chores, raised by automation already in tech.json (auto feeder, ATO, misting system). User inputs map 1:1: care rhythm vs dailyMin / weeklySessionMin; away-days vs maxAwayDays. "5 min daily" and "35 min on Saturday" are then different tanks, as Nathan wants.

**Setup time** is two things, shown apart: hands-on hours (assemble, scape, plant, fill) and calendar wait (cycling, 4-6 weeks for fish; plants grow-in). The input is hands-on time; the wait is always stated on the proposal ("fish in about 5 weeks").

**Data: what exists vs must be researched** (every new number gets a provenance.ts rule; unsourced ones are status `assumption` and shown as "estimate", never hidden, never guessed silently):

| Datum | Per | Exists | Must research |
|---|---|---|---|
| Minutes per chore (water change per gal, testing, glass, filter, salt, misting, yearly) | tank | `demand-defaults.json` time.*, all `assumption`; MW proposal research/minutes-a-week.md | sources for the main rows |
| Chore cadence (every N days) | chore | none | care sheets / keeper guides |
| Feeding interval and fasting tolerance (days) | species | none (demand-items mins per animal only) | per species (fish 3-7 days typical, snakes weekly, geckos 2-3 days, shrimp grazers longer) |
| Humidity / misting cadence | dry species | misting rows in tech.json | per species (dart frog, crested gecko, tree frog) |
| Evaporation top-off cadence | salt, open tops | ATO row | salt nano, open-top rule |
| Plant trimming cadence | growth rate | `growRate` per variant | interval by growth class |
| Hands-on setup hours | tank type, scape | none | by kind (bare, planted, hardscape count, terrarium, paludarium) |
| Cycling / grow-in weeks | domain | CYCLE_NOTE text only | a sourced range per domain |
| Appeal tags (colorful, active, naturalistic) | species, style | none (10-20 already asked for them) | per species and style |
| Terrestrial invertebrates (isopods, tarantula, millipede) | species | **none in species.json** | the proposal's example needs a species research lane, or Q4 drops it |

**Generating three distinct proposals.** Pure logic in a new scene/discover.ts, run on the user's limits:
1. Candidates = archetypes: a scene template (examples/*.json, starter styles) + a stocking seed, tagged with family (fish / planted-invert / terrestrial / salt) and appeal tags. About 10 to start: betta, planted shrimp nano, small community, GloFish (needs species), cory + tetra planted, paludarium, crested gecko, leopard gecko, dart frog, clown nano.
2. Each candidate is sized to the space pin with tankfit / `buildsFor`, and the build variant chosen by the user's tightest limit (cheapest or least work).
3. Viability check with existing engines, all must pass: `meetsNeeds` (space and filtration), stockSummary with no `problem`, `demandOf` setup and upkeep within the budget pins, rhythm within the care-rhythm and away-days pins, setup hours within the pin.
4. Distinctness: greedy pick of the best-scoring viable candidate, then the best from a different family, then a third family; if only one or two families pass, the next pick must differ on the main axis (cheapest vs least work) and the card says "only 2 kinds fit your limits" with the nearest miss ("a leopard gecko fits with +$90 start-up"). Never pad with a tank that fails a check.
5. Score = preference tags matched + headroom under each limit. Deterministic (fixed seeds), so the same inputs give the same three, and a test can lock them.

## (e) Create a look

Entry = **style tiles first, picture second.** The tiles are the existing scape styles and example scenes, each rendered in a default tank. `scapeSetup(build, style, mode)` needs a Build; a look-first tank has no animals, so lane L6 adds a `Build` for an empty stocking (tank from the size chip, gear from `buildsFor`'s balanced rules with no animals), then the hand-off is the existing function. Screen 3 inverts `allowedStyles(animals)`: animals whose allowed styles include the chosen one, ranked by `rankStyles`.

"Use my own picture" v1: the image is pinned as a reference panel beside the viewer (stays local, not uploaded), and the user picks the closest tile with it in view. No automatic matching in v1 (no model calls, per the tools rule). A later deterministic step could rank tiles by the picture's colour mix (green share, rock grey, sand), see Q3.

## (f) Reuse vs retire

Reuse as is: stockPlan, buildPick, scapePick, builds.ts, tankfit, demand engine, fitToLimits, swapsFor, stockSummary, fullnessTile, plan / setup sheets, tankDiff, deal drift, featuredDeals, gearOffers, examples, `UserProfile.mode`, `limits`.
Change: startEntries.ts New menu (its first view becomes Welcome; On sale / Bundles become the deal strip on Welcome and stay a tab in Open; Start from scratch becomes Sandbox); first-launch default (New -> Welcome).
Retire: the five-path "What do you have so far?" wording; "Just want to try the hobby" (now Discover); "A tank I already own" as a path (now Evaluate); the `wizard` branch (dbc7aa6) stays parked, nothing more taken from it.

## (g) Build order (Sonnet-sized lanes, one at a time per file set)

| # | Lane | Files | Done when | Size |
|---|---|---|---|---|
| L1 | Two-mode Welcome + goal screen | new ui/welcome.ts, startEntries.ts, main.ts (wiring), index.html, style.css, test/welcome.test.ts | First launch shows Welcome; Sandbox opens an empty tank; Guided > animal opens the stocking screen; look / discover tiles show "coming soon"; shared link skips it; Open menu unchanged; build + tests pass | S (~300 lines) |
| L2 | Brief + mode switch | scene/types.ts (brief), new scene/brief.ts, demandPanel.ts (limits write-through), share.ts, a header pin chip + Guided/Sandbox toggle | brief saves and shares; toggling 20 times leaves the scene byte-identical; Sandbox shows gates as badges; stockPlan / buildPick write their pins | M |
| L3 | Evaluate my setup | new ui/evaluate.ts, uses stockSummary, fullnessTile, setupsheet, diff, dealdrift | panel shows the six rows; "starting point" prices only the change; test on a 20 -> 29 gal change | M |
| L4 | Research: rhythm, setup hours, cycling (no code) | research/maintenance/*.json + .md, sources | each datum in (d) sourced or marked assumption with the page that says it | M (research) |
| L5 | Engine: chore cadence + Rhythm | demand/engine.ts, types.ts, demand-defaults.json, provenance.ts, demandPanel (show rhythm) | weekly totals unchanged (calib tables pass with no re-bless); Rhythm and maxAwayDays per tank; auto feeder raises away-days | M |
| L6 | Create a look entry | ui/scapePick.ts (look-first mode), scene/scapes.ts (empty-stocking build), welcome.ts tile | tiles -> tank -> optional animals -> builder; reference picture panel | M |
| L7 | Discover generator (pure) | new scene/discover.ts, data/archetypes.json, tests | 3 distinct viable proposals for 6 locked input sets; honest "only N fit" case | M-L |
| L8 | Discover screens | new ui/discover.ts, welcome.ts tile | limits card -> three 3D proposals -> builder; refine chips re-rank live | M |
| L9 | Guided overlay cards in the builder | new ui/guide.ts over swapsFor / fitToLimits / fork card | proposals with deltas; accept = one undo step; hidden in Sandbox | M |

L1, L3 and L4 touch disjoint files and can run in parallel (within the 3-lane cap); L5 waits for L4, L7 for L5, L8 for L7.

## (h) Open questions for Nathan (each with a recommendation)

1. **Owner entry on Welcome?** Nathan said owners are not a path. Rec: one small "Already have a tank?" link on Welcome that opens Sandbox at their size with Evaluate highlighted; no path, no questions.
2. **Budget question in the animal path?** Rec: no question; the stocking screen's live cost span is the budget conversation, and a budget pin is set only from the demand panel or a fork-card choice.
3. **Picture upload depth.** Rec: v1 reference panel only (local, no matching); revisit colour-mix ranking after L6 ships.
4. **Terrestrial invertebrates** (Nathan's example) are not in species.json. Rec: drop them from v1 proposals (geckos and frogs cover "terrestrial"); add isopods / tarantula later through the normal species research lane.
5. **Discover inputs as presets or numbers?** Rec: the care rhythm and setup time as three chips each (examples above), budgets as numbers with an empty default; away-days as a number.
6. **What a proposal that uses `assumption` data shows.** Rec: allowed, with "estimate" on that number and its source status on hover, same as the rest of the app.
7. **Mode switch placement.** Rec: a Guided / Sandbox toggle in the builder header beside the pin chip, always visible, never a dialog.
