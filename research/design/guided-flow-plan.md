# Guided path v2 (plan, 2026-10-30, Coordinator 17)

Source: Nathan's Guided-path spec, pasted to Coordinator 17 on 2026-10-30 (quoted in full at the bottom).
Builds on the NG1-NG6 work (research/design/guided-sandbox-plan.md), all on main by build 1524.

## Target flow (Guided)
1. **What kind of tank?** Freshwater / saltwater / terrarium / paludarium / "any". Picture cards + one-line explanation each.
2. **Where do you want to start?** Animals / Appearance / Existing equipment / Open to ideas. Picture cards (AI art, Nathan makes it separately; see guided-art-brief.md).
3. **What do you already have?** Owned gear (tank, light, heater, filter, **stand**), and "do you need a stand?".
4. **Limits (optional).** "Do you want me to keep to limits?" If yes: budget (max / target), monthly, care time, setup hours, space, room temp (deg F), tap water. If no, nothing is gated.
5. **Animals** (when the intent is Animals). Pick an animal, then the list re-sorts: species that fit the roster so far are shown, the ones that do not are **greyed but still clickable** with the reason. Running totals as the roster grows: difficulty, set-up cost (**minimum viable** vs **ideal**), monthly, care time. Nothing is hard-gated: conflicts accumulate as warnings, each with a fix offer ("Upgrade to a comfortable tank: 20 gal long, +$30 set-up").
6. **Need-driven gear.** The tool assumes nothing until a species needs it: heater, filtration, light, tank size are prompted only when the roster creates the need. Light starts cheap / basic until plants that need more are added.
7. **Look and plants** (after stocking + tank + filter + heater are chosen). Plant prices, the extra light cost for higher-need plants, and ferts / CO2 where needed are all in the cost.
8. **Compromise and compare.** When the wanted style does not fit a limit, the tool offers a compound compromise ("Keep this style in budget: drop the neon tetra school and go 75 gal -> 40 gal breeder") next to the alternative (a cheaper style), and can open them side by side in the split view.
9. **Narrowing.** The tool shows a few feasible options; the person picks the one they like most; the next screen shows variations around that pick; repeat. At any stage "I like this one" -> **make it mine** (manual editing).
10. **Report.** One printable report: quick rundown, picture of the tank, existing equipment, shopping list, expected costs, plant / coral list, warnings and cautions.

## What exists today (build 1524)
- Guided card -> Welcome workspace: four text intent tiles (welcome.ts), no tank-kind step (SETUP_KINDS only on the Sandbox card), no pictures.
- Brief already holds every limit (budget max/target, monthly, careMin, setupHours, maxSpace, roomTempC, tapWater, `off`, `phased`), `equipment.needStand`, and `constraints.owned` (incl. `stand`). The owned-gear sheet (ownedGear.ts) covers tank/light/heater/filter, not the stand.
- Animal screen (stockPlan*): `rankTankmates` returns fits / needs-bigger / incompatible-with-reason; a fork card for space; budget check via `budgetGap`. No running difficulty / cost / time totals; no fix offers with $ deltas except space.
- A stock-first tank starts with filter and heater 'none' (scene/tech.ts:180) and stays bare; Suggest sizes gear itself. Default light is a fixed flat fixture and never upgrades; plants that need more only produce a warning (scapes.ts:211).
- Look step (lookPick / scapePick) is look-first, priced through demandOf.
- Suggest: up to 3 diverse proposals + whole-brief refine chips + "what changed" strip; "Use this setup" opens the editor. No pick-one-see-variations loop.
- Conflicts: four verified paths (infeasible.ts), each a single edit; no compound trade; split view exists in the editor (store.splitTank, ui/diff.ts) but not proposal-vs-proposal.
- Print: three separate sheets (planSheet, setupsheet, buildPlanSheet) with `@media print`; no render image, no plant list.

## Lanes
Max 3 at once. File ownership is exclusive; a one-line hook in another lane's file is allowed and must be named in the report.

| Lane | Phase | Owns | Done when |
|---|---|---|---|
| **GV1 Guided shell** | 1 | `src/ui/guided/` (new: flow, steps, step rail), `src/ui/welcome.ts`, Guided part of `src/ui/startMode.ts`, `src/ui/ownedGear.ts` (+ test), Guided markup in `index.html`, a `.gv-*` block in `src/style.css`, `public/art/guided/` (placeholders + README) | Steps 1-4 as a stepper with a step rail and Back. Picture cards with art slots (placeholder until Nathan's art lands). Stand on the owned sheet + "need a stand?". Limits step is optional and writes the brief. Routes: Animals -> the animal screen; Appearance -> the look step; Existing equipment -> narrowing seeded by owned gear; Open to ideas -> narrowing. |
| **GV2 Need-driven gear** | 1 | `src/demand/needs.ts` (new), `src/scene/tech.ts` (`inferTech` stock-first branch), `src/demand/tech.ts`, light default in `src/scene/defaults.ts`, calib regen | `needsOf(S, brief)` returns what the roster requires (heater when a species' min temp is above the room temp, filtration, light tier, min tank, CO2 / ferts for plants) with reason and species. A stock-first tank gets exactly the gear its animals and plants need, sized; nothing before. Basic light by default; a plant needing more upgrades the light tier (and adds CO2 / ferts) in the priced build. Moved-numbers table + calib regen per HANDOFF. |
| **GV4 Animal roster** | 1 | `src/ui/stockPlan.ts`, `src/ui/stockPlanLogic.ts`, `src/ui/stockGallery.ts` (+ tests), `src/demand/tiers.ts` (new) | Incompatible species greyed but clickable, reason shown; clicking one adds it and a warning. Running totals strip: difficulty, set-up **minimum viable vs ideal**, monthly, care min / week. Warnings accumulate in one list, each with a verified fix offer and its $ delta. Need prompts from GV2's `needsOf` rendered here (done last, after GV2 lands). |
| **GV3 Report** | 2 | `src/ui/report.ts` (new), its print CSS block, one capture hook in the renderer | One printable report: rundown, tank render image, owned gear, shopping list, costs (set-up min/ideal, monthly), plant / coral list, warnings. Reachable from the end of Guided and from the menu. |
| **GV5 Look after stocking** | 2 (after GV2) | `src/ui/lookPick.ts`, `src/ui/scapePick.ts`, `src/scene/looks.ts`, `src/demand/taste.ts` | When a roster + tank + gear exist, the look step offers scapes for that roster and tank; each card prices plants, the light upgrade and ferts / CO2 (from GV2). Look-first entry keeps working. |
| **GV6 Narrowing** | 2 | `src/demand/suggest.ts`, `src/ui/suggest.ts`, `src/demand/refine.ts`, `src/demand/propagate.ts` | Pick one of the options -> next screen shows 3-4 variations anchored on it (one axis each: stocking, look, size, tier), all feasible under the current choices; repeatable; breadcrumb of picks. "I like this one" -> make it mine (opens the editor, keeps the brief). |
| **GV7 Compromise + compare** | 3 (after GV4, GV5) | `src/demand/compromise.ts` (new), `src/demand/infeasible.ts`, `src/ui/infeasibleCard.ts`, compare hook into split view (`src/ui/diff.ts` + one line in panels.ts) | Over a limit with a wanted style: a compound, verified compromise (drop species X, tank A -> B, keeps the style) beside the cheapest other style; "Compare" opens both in the split view with the differing totals. |

Phase 1: GV1, GV2, GV4. Phase 2 (as phase 1 lanes land): GV3, GV5 (needs GV2), GV6. Phase 3: GV7.
Art (Nathan, separate): research/design/guided-art-brief.md lists every slot; GV1 ships placeholders that pick up a file dropped into `public/art/guided/`.

## Shared contracts (fixed now so lanes can run in parallel)
- `src/demand/needs.ts` (GV2): `export interface Need { kind: 'tank' | 'heater' | 'filter' | 'light' | 'co2' | 'ferts'; why: string; species: string[]; have: boolean; fix?: { label: string; deltaUsd: number } }` and `export function needsOf(S: TankSetup, brief?: Brief): Need[]`. GV4 renders them; GV5 reads light / co2 / ferts.
- `src/demand/tiers.ts` (GV4): `costTiers(S, P): { minimum: Totals; ideal: Totals }`. Minimum viable = animal-care essentials only (the brief's `phased` meaning); ideal = the full build. GV3 and GV7 read it.
- The Guided step state lives in the brief (`chosenDirection` / answered questions from NG2), not in localStorage, so reload / share keeps the place.
- Nothing hard-gates in Guided: limits produce warnings with fixes, never disabled buttons. Animal-welfare problems stay red and say "not a valid tradeoff" (NG1 wording).

## Collision notes
- `index.html`, `style.css`: GV1 (Guided markup, `.gv-*`), GV3 (`.rp-*` print block), others none.
- `panels.ts`: one-line hooks only (GV1 Guided entry, GV3 menu item, GV7 compare).
- `demand/suggest.ts` is GV6's; GV2 does not edit it. If GV2's need-driven gear changes Suggest numbers through `demandOf`, that is expected; it is in GV2's moved-numbers table.
- Only GV2 moves engine numbers. GV4's tiers are a new view on existing numbers.

## Nathan's spec (2026-10-30, verbatim)
guided
Freshwater aquarium, saltwater aquarium, terarrium, palludarium, any? (show pics, quick explanation of what each is broadly)
animals, appearance, existing equipment, open to ideas? (pictures again, animals showing a focus on an ecosystem of fish, the look option having a pic of an overall view of a beatiful tank, the "existing equipment" option showing a loose assorted pile of misc equipment. I dont want these renders from our engine, I want AI generated art specific to each picture. I can work on this part separately, just getting my ideas down.)
ask about any existing equipment they want to use, if they need a stand
ask if the user wants to gate by the gates we have set up, and if so what their paramters/limits are.
if they choose the "animals" option: pick the animal you want, start filtering by needs like social and environmental compatibility between the growing roster. as you build it, show the species that would be a good fit, gray out those that wouldnt and explain why. start updating things like expected difficulty, expected cost, time, etc based on a "good" setup for this stocking. Maybe this would be a good place to differentiate between "Minimum viable" and "ideal" budget-wise.
as they go, don't hard gate anything (grayed out can still be clicked), just accumulate warnings wherever conflicts arrise, and offer solutions to each (upgrade to comfortable tank?: 20g Long, +$30 for setup), etc
basically the tool doesnt assume you need anything until you add a species that needs it. Temperature, filtration need, lighting, tank size, all become prompted only once the need arises.
for lights, assume a cheap/basic light until plants are added that would require more.
once they have a stocking list, tank, filter, heater (if needed) chosen, we can go into the "how you want it to look" section, which includes the plants. The plant pricing themselves as well as the added light cost for higher needs plants (and ferts/co2 for some) should be included.
at some point, the user may realize they really want a certain style but it isnt in the budget. The tool should offer them a way to compromise, like keep this style in your budget by removing the school of neon tetras and downsizing from 75g to a 40g breeder". This would be a great use of the comparison tool as well, where they can split the tank view into two and compare if they want to keep the style and do the downsize or if theyd rather go with a cheaper (or whatever other metric was being limited) style.
this is where the multi-stage selection engine takes place. The tool chooses and presents the user with a few options that are all feasible within the users existing setup decisions, and we subsequently narrow in on a build that the user wants to try.
basically the user chooses which out of the group they like the most, then the next screen with multiple options each with some sort of variation focused around the original choice are presented
at any stage, the user can choose "I like this one", at which point they can "make it theirs" and add or remove anything manually.
once its finished and the way they like they can print out the "report" that has the quick rundown, a picture of the tank, existing equipment, shopping list, expected costs, plant/coral list, etc. Also include any basic warnings or cautions.
