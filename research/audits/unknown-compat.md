# Unknown is not compatible: where missing data reads as green (lane S242, 2026-10-26)

Review only. No engine, data or UI file was changed. Base: origin/main 6a1dfda. Counts come from the probes in
`research/audits/probes/` (they run the real engine: `whysAnimal`, `tankFor`, the provenance walk of `scripts/source-audit.ts`).
96 species: 71 freshwater aquatic, 14 saltwater aquatic (`habitat` water or both), 11 land. "Aquatic" below = 85 (water + both).

## 1. The one-paragraph answer

The engine never *invents* a compatible verdict from nothing, but it has one habit that does the same job: **a check with no data to run
returns no reason, and no reason is rendered as "fine"** (no line on the tile, no grey in the list, `ok: !why` in the tankmate ranking).
Missing knowledge, missing tank settings and "nothing wrong found" are three different situations and all three print the same nothing.
The biggest leaks, by how many results they touch:

1. **Hardness (GH) is compared for only 33 % of freshwater pairs** (820 of 2485). 30 of 71 freshwater species have no GH. 707 pairs show no
   reason at all, and **495 of those (70 %) are green only because GH was not compared.**
2. **16 aquatic species have no tank-minimum line, so they never fail on size**, and the care table's own `minL` is not read in that path:
   the smallest tank that "holds" a red claw crayfish (20 cm, minL 200 L, solo, aggressive) is a 3 gal cube; a signal crayfish-class
   75 L animal (red swamp) 2.5 gal; cherry shrimp (minL 20 L) 2.5 gal.
3. **"Tolerates the same pH" reads as "prefers the same pH" for most species**: only 15 of 71 freshwater species carry a documented acceptable
   range (`phOk`); 23 carry a "preferred" band 2 or more pH units wide (a tolerance in disguise); 660 pairs are green on a 0.2-0.6 pH sliver.
4. **A default room is stated as fact**: with no room temperature entered the plan sheet says "your animals are comfortable at room
   temperature" (19 species) and sizes heaters from a species-derived setpoint.
5. **Predation: absence means harmless.** 23 species carry prey data (all of it `assumption`); the other 73 have no entry, and nothing
   separates "researched, safe" from "never researched".
6. **There is no tank water-chemistry input at all** (no pH, GH, KH, salinity, flow). pH / GH are only species-against-species, so
   situation 3 ("species compatible, actual water unverified") cannot even be said for them. Temperature is the only tank setting with the
   proper `unchecked / conditional` treatment, and it is a good model for the rest.

## 2. The three situations, as the code sees them today

| Situation | Today | Where |
|---|---|---|
| 1. Knowledge present and overlapping | green by silence (no line) | `whysAnimal` returns nothing |
| 2. Knowledge missing for a species | skipped, **same silence as 1** (GH: 30 species; tank minimum: 16; predation: 73) | `if (c.gh && oc.gh)`, `minDataOf` undefined, `prey` absent |
| 3. Tank setting not entered | **only temperature is handled** (`unchecked` / `conditional` in `temprange.ts`); pH / GH / flow have no tank input; default room is asserted | `tempEvidence`, `plan.ts:151` |

Missing tank settings must not create hundreds of warnings: the proposal below makes every "unknown" one line per tank per cause, never one
per species pair.

## 3. Assessment by assessment

Status words are the provenance kinds of `src/data/provenance.ts` (cited / derived / researched / claimed / assumption, UNSOURCED = no rule).

### 3.1 Tank minimum (size)
- **Data:** `src/data/tankmin.json` (red = minimum, green = Recommended), read by `scene/tankMin.ts`; the older `CARE.minL` litres is read only when no tank geometry is passed.
- **Missing:** 16 of 85 aquatic species have no red line: cherry shrimp, amano, nerite, mystery, ramshorn, trumpet, cleaner shrimp, turbo, hermit, asellus,
  Thai crab, CPO, Cajun dwarf, red swamp crayfish, red claw, fire-bellied toad. The "inverts never fail on size" rule is documented in `tankMin.ts`;
  it was written for shrimp and snails, and the crayfish and the toad now ride on it.
- **Engine:** pct 0 = pass, in the hard truths, the tile and `tankFor`. `CARE.minL` is ignored (`whysAnimal` uses `env.fit` instead of `litres < c.minL`).
  Probe: `tankFor(red claw x1)` = 3 gal cube, no fails (CARE.minL 200 L); red swamp 2.5 gal (75 L); cherry shrimp 2.5 gal (20 L); fire-bellied toad fails only on depth.
  The stocking percent still counts them, so a tiny tank usually reads too full, but the *minimum* row says nothing.
- **Seen by user:** no (silence).
- **Opposite leak:** `assessed: false` (water shallower than the animal is long) gives pct Infinity, a red fail. An unknown reads as a hard fail there, which is also not "not enough information".
- **Confidence of what exists:** `minL` is cited 48, derived 23, researched 18, assumption 7 (comet, hillstream, red claw, asellus, mystery snail, mandarin, ball python). Tankmin red lines: derived 35, cited 26, researched 5, assumption 3.

### 3.2 Social / groups / count
- **Data:** `data/groups.ts` merged into `CARE` (`bands`, `max`, `territory`, `males`, `sexed`) plus `waterchem.ts` GROUP. All 96 species have bands, so there is no missing group data today.
- **Default if missing (latent):** `bandOf` with no bands returns `'ok'` ("Doable"), `minOf` returns 1, `maxOf` 99. A species added without a group row would read fine.
- **Confidence:** of 85 aquatic species the minimum group is claimed 52 (`est` rows in groups-sources.md), researched 28, cited 4, assumption 1 (dwarf pencilfish, white cloud, CPD, hatchetfish, asellus, cleaner shrimp lead the weak rows).
- **Fighting limits missing:** of the 9 species with `temper` 2 (aggressive), 6 have no `max` / `territory` / `solo` rule (tiger barb, demasoni, labeo, auratus, Livingstone's, afra). `fightsOverCount` is false, so the "more than N may fight" warning cannot fire for them. Whether a source exists is a research question, not answered here.
- **Seen by user:** group band is shown with its message, not with its source confidence.

### 3.3 Environment

**Temperature** (best modelled, `scene/temprange.ts`)
- **Data:** `climatedata.ts` WATER, comfortable + tolerable, all 85 present, all provenance `researched` (basis interpretation); 5 carry `est` (ramshorn, syno, green neon, Thai crab, asellus); axolotl `tol` is `assumption`.
- **Uses:** comfortable range only. Tolerable is read by the Climate panel and `tempFit`, never by the compatibility result. `est` is read only by the Climate panel's asterisk.
- **Missing path (latent, 0 species today):** `sharedRange` drops species with no range into `unrecorded`; `rangeVerdict` can still return `ok` for a broad range of the others, and `tempWhys` returns `[]` for a species without a range. A new species with no temperature would pass.
- **Tier gap:** 231 of 2485 freshwater pairs have disjoint comfortable ranges but overlapping tolerable ones; today all read "No suitable shared temperature identified" (blocking). pH has the three-tier treatment, temperature does not.
- **Land:** no air / humidity check between land animals in the gate. Leopard gecko (RH 30-40 %) + crested gecko (RH 60-80 %) reads "no reasons". The Climate panel can show the disagreement; I did not trace where it surfaces on the plan sheet.
- **Tank setting (situation 3):** `tempEvidence` has target / room / heater / measured, with `unchecked` and `conditional` already. Leaks:
  `plan.ts:151` `wantsHeat` uses the default `ROOM_C` (21 °C) and `plan.ts:122` then says "Nothing here needs it: your animals are comfortable at room temperature" (19 species have 21 °C in their range: neon, danio, white cloud, platy, goldfish, comet, panda cory, oto, hillstream, cherry shrimp, amano, CPO, Cajun dwarf, red swamp, asellus, ramshorn, trumpet, fire toad, fire newt); `tech.ts:428` sizes the heater from `climateOf(...).at` (the species' recommended setpoint) when the user set no target. Both are assumptions printed as plan facts. (The *compat* line itself is fine: `operatingCheck` returns `unchecked` / `conditional` for an unset or assumed room.)

**pH / GH** (`waterchem.ts` -> `CARE.ph, phOk, gh, ghOk`; check in `whysAnimal`)
- **Preferred vs acceptable, how each check uses them:** pH: acceptable ranges (`phOk ?? ph`) share less than 0.2 -> blocking; else preferred ranges share less than 0.2 -> amber "compromise"; else green. GH: same with a 2 dGH threshold. Species with no `phOk` are held to the preferred range (a deliberate, conservative choice, `chem-audit.md`). Only 15 of 71 have `phOk`, 3 have `ghOk`.
- **Counts over 2485 freshwater pairs:** pH blocking 442, amber 101, green 1942 (660 of those overlap by only 0.2-0.6 pH). GH compared 820 (blocking 191, amber 27); **not compared 1665**.
- **Missing:** pH 0 species (but 22 `claimed`: neon, dwarf pencil, the four new Boraras/green neon, betta, krib, angel, oscar, bronze cory, sterbai, bristlenose, cherry shrimp, the four crayfish, Thai crab, asellus, mystery snail, fire toad). GH 30 of 71 missing (danio, white cloud, CPD, cherry barb, tiger barb, betta, three gouramis, Bolivian ram, krib, angel, oscar, goldfish, comet, bronze / panda / pygmy cory, bristlenose, oto, clown loach, SAE, hillstream, pea puffer, asellus, trumpet snail, fire toad, fire newt, ADF, axolotl). All 41 GH values that exist are `claimed` (FishBase is named, not per value).
- **Wide "preferred":** 23 species have a `ph` band 2 or more units wide (neon 5-7, danio 6-8, goldfish 6-8, bronze cory 6-8, bristlenose 6-8 ...). That is a documented tolerance used as a preference, so "tolerates the same pH" reads as "prefers the same pH".
- **Marine:** all 14 share one band (8.0-8.4); no salinity, alkalinity or calcium. The marine pH check cannot fire.
- **Tank side:** no pH / GH / KH / tap-water field exists in `TankSetup`; the Climate panel nonetheless prints a "pH 7.1" setpoint as if the user could dial it.
- **Salt vs fresh:** `whysAnimal` has no salinity guard; only the pick list (`conflictsOf`) and the tank mode stop it. Probe: molly + ocellaris clownfish returns no reasons.

**Flow** (`CARE.flow`)
- 84 of 85 aquatic species have a label (48 low, 32 medium, 4 high: hillstream, yellow tang, blue tang, chromis); fire toad has none. The field is a string, so the provenance walk does not audit it (unsourced by blind spot).
- Used **only** by `rankStyles` (`scene/scapes.ts`) to rank aquascape styles. No pair check, no tank flow value compared (the filter turnover exists in `tech.ts` but is not set against a species). A hillstream loach with a betta (low) is green.
- Missing flow (fire toad) is skipped silently.

**Light**
- Animals have no light field. Light is checked for plants and corals only (`scene/lightcheck.ts`, `NEEDS` all `claimed`, "Not set" -> no line). Nothing says the animals' light is not modelled.

**Substrate**
- Species have no substrate field (34 aquatic species are bottom-zone). The tank has a substrate (`S.substrate`), nothing is compared, the shopping row only says "bottom dwellers rest on it". Nothing says it is not checked.

### 3.4 Behaviour

**Predation** (`CARE.prey`, `preyRisk`)
- 23 species carry it (gbr, Livingstone's, angel, oscar, clown loach, pea puffer, four crayfish, six-line wrasse, hermit, axolotl, tree frog, five lizards, regal jumper, ball python, Chaco knee). **All 23 are `assumption`.** 73 species have no entry.
- `prey` absent = no predator. There is no way to say "checked: harmless" versus "not researched". Examples worth a research look (no claim made here): betta, kribensis, goldfish, Bolivian ram with shrimp, dwarf gourami with fry.
- `young` is an advisory (concern), correctly never a pass.

**Aggression** (`CARE.temper`)
- A required number (0/1/2), so unknown cannot exist: it is forced to a value. cited 81, derived 3, researched 3, **assumption 8** (swordtail, krib, angel, CPO, Cajun dwarf, red swamp, red claw, asellus), **UNSOURCED 1 (axolotl)**. 65 species are 0, 22 are 1, 9 are 2.
- The gate acts only on 2-against-0 ("too aggressive for it") and on fins (`slow` / `nip` / `feelers`). A temper-1 species beside a peaceful one is silent (22 x 65 species).

### 3.5 Space (stocking percent)
- `massG` returns 0 when a species has no mass; no aquatic species lacks one today (63 cited, 22 `claimed` keeper-reference masses for shrimp, snails, herps).
- 31 of 85 aquatic species have no own space factor and use the class median; all 14 marine species fall to a flat 1.0 (never fitted to anything marine).
- The bar prints one number with no confidence.

## 4. Sourced is not reliable: provenance kind -> confidence (proposal, nothing implemented)

`status` says how a value was backed; confidence says how far a verdict may lean on it. Proposed mapping, applied per value and combined per pair as the **minimum of the two sides**:

| Provenance | Confidence | May produce |
|---|---|---|
| cited + `source-stated` or `measured` | high | confirmed or incompatible |
| derived from high values; cited + `interpretation` | medium | confirmed or incompatible, labelled |
| researched (a note covers it, not one page); fitted (a fit is not a biology claim) | medium-low | incompatible stays (a clash is a clash); a *green* is at most conditional |
| claimed, assumption, `est: true`, UNSOURCED | low | at most conditional; a green is never shown without "provisional" |
| absent (no value) | none | not enough information |

Reasoning: a blocking result on thin data is the safe direction and may stay; the dangerous direction is a *green* on thin data. Today the only
confidence-like switch is `est`, and the compatibility check ignores it. Conservative-default basis (a safer-side pick) counts as medium for a
block, low for a green.

## 5. Proposal: four results per check, smallest change, ranked by user impact

Vocabulary: **confirmed** (knowledge present for both, overlap), **conditional** (overlap only on acceptable or low-confidence data, or knowledge present but the user's setting unverified), **incompatible**, **not enough information**. Situation 3 is a separate tag on the result, **"conditions unverified"**, not a fifth state: it applies to the tank, not the species.

Mechanics that keep it small: add `state?: 'unknown'` beside `concern` on `AnimalWhy` (`animalfit.ts`); emit it exactly where today's code does
`if (c.gh && oc.gh)` and falls through; aggregate at the display points (`compatRisks`, `hardTruths`, the tankmate list) into **one line per cause per
tank** ("Hardness not compared: no data for danio, tiger barb, ..."), never one per pair. `rankTankmates` marks such a mate "unverified" instead of `ok`.

| # | Check | Today -> proposed | Smallest change | Touches (about) |
|---|---|---|---|---|
| 1 | GH missing (30 species; 1665 pairs skipped) | silent -> not enough information, one line | emit `unknown` when exactly one or both sides lack `gh` and pH passes; aggregate by species. Real fix is researching GH for the 30 | pairs 495 flip from green to unverified |
| 2 | Tank minimum, 16 species with no line | pass -> not enough information (conditional if `CARE.minL` exists) | in `speciesMinimum`: with no red line, use `CARE.minL` as a conditional line marked "no tank-minimum source" instead of pct 0 | red claw / crayfish / toad rows |
| 3 | pH on wide or claimed ranges | green -> conditional when overlap under 0.6 or either range is 2+ wide and `claimed` | one extra branch beside the existing "compromise" tier; thresholds are Nathan's call (660 pairs) | pH branch only |
| 4 | Default room asserted | "comfortable at room temperature" -> "if the room is about 21 C (assumed)" | in `plan.ts` `wantsHeat` serve text: use `roomSet`; heater sizing note says the setpoint is the species' recommendation | one string, one flag |
| 5 | Tank water chemistry never entered | silent -> tag "conditions unverified" once per tank | one fixed line when any pH / GH check ran: "Species overlap on pH and hardness; your tap water is not entered." A tank pH / GH field is the larger follow-up | one tile line |
| 6 | Predation absent | green -> not enough information for species not on a reviewed list | add `preyChecked: true` to CARE rows that were researched (harmless or not); anything unreviewed with a size big enough to matter reads unknown | data + 1 branch |
| 7 | Temperature tolerable tier | blocking -> conditional when only the tolerable ranges overlap (231 pairs) | `sharedRange` over `tol` as a second pass; `est` rows cap at conditional | `temprange.ts` |
| 8 | Temperature missing (latent) | pass -> not enough information | `tempWhys` / `rangeVerdict`: a species in `unrecorded` forces `warn`; add a test that fails when any aquatic species lacks a range | 3 lines + a test |
| 9 | Flow, light (animals), substrate | silent -> "not checked" | reuse the `careNeeds` `unchecked` wording ("Not checked: ... confirm before buying") as one line per tank | tile line |
| 10 | Land pair climate (gecko pair), salt vs fresh in the scene | no reasons -> incompatible (RH / air bands disjoint; salinity) | `whysAnimal`: compare `AIR` bands for two land animals; a `salt` mismatch guard | two branches |
| 11 | Six aggressive species with no fighting rule; temper 1 vs 0 silent | silent -> not enough information / conditional | research the six; temper-1 beside a peaceful one as a concern once per tank | data first |
| 12 | Stocking percent confidence | one number -> number plus "n of m on fitted data" | derive from the existing `SPACE_FACTOR` / `BODYMASS` provenance counts; display only | tile note |

**Ranking by user impact** (people touched x how wrong the green is): 1 (hundreds of pairs, silent) > 2 (a crayfish in 3 gal is a visible miss, 16 species)
> 3 > 4 (every default tank with a cool-water species) > 5 > 7 > 6 > 8 (latent but one line of defence, cheap) > 9 > 10 > 11 > 12.

## 6. Not verified, so not claimed

- Whether any real source gives GH for the 30 species, a fighting limit for the six, or prey rules for betta / krib / goldfish; those are research tasks.
- The 81 `cited` temper values come from the provenance rules as written (`RULES.CARE`); I did not re-open each page.
- Where the Climate panel's land humidity disagreement is displayed.
- The UI was not opened: these are code paths and engine calls, no screenshots.

## 7. Reproduce

`research/audits/probes/*.audit.ts`: counts (`counts.audit.ts`), pair probes (`pair-probes.audit.ts`), tier counts (`pair-tiers.audit.ts`), room / flow / air (`misc.audit.ts`). Each file's first line says how to run it.
