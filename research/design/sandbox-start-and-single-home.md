# Sandbox start, finished-price range, My Equipment, and the guide that walks the real menus

Nathan, 2026-11-05 (Coordinator 20 plan). Status: PLAN, lanes ST1 / FR1 / EQ1 / GW1 in phase 1, GW2 queued.

## What Nathan asked

1. Sandbox from scratch starts with NOTHING in the room except the person (his default environment).
2. The user then chooses a tank; as they flip through options the tank is drawn live, full size, in the room.
3. The tank starts on the floor; then ask whether to use a stand or existing furniture.
4. While choosing, show a rough FINISHED-tank price range per size: low = lightly stocked tank with cheap decor, high = semi-professional setup. Bigger tank, higher range.
5. A totally separate "existing equipment" menu, reachable at any time.
6. Guided setup becomes the tool walking you through the EXISTING menus, so every variable has one proper home (no second screen that sets the same thing).

## Where things are today (map, 2026-11-05, build 1661)

- Sandbox: `startMode.ts` kind card -> `panels.ts:315` host -> `newEmptyTank(kind)` -> `emptyScene()` (`scene/defaults.ts`): a bare 24x12x12 in tank on a black 30 in cabinet, no wall, no person, room light 0.15. ED1's environment (`scene/defaultEnvironment.ts`, `withDefaultEnvironment`) is NOT applied to Sandbox, only to generated setups.
- A room + person with no tank already half exists: `tankView.ghost` (`render/tankView.ts`, view-only) skips glass / water / substrate / lid / light but still draws stand, wall, person, floor (`render/build.ts` ~1436). Only `stockPlan.ts` uses it. Gaps: `addStand` sizes from the tank; `personSpot` places the person from the tank outline.
- Tank picker: modal `#tankDlg` (`panels.ts:426-485`, `ui/tankPick.ts applyTankPick`), catalogue `data/tanks.json` / `tanks.ts` (`TANK_MODELS`, `BANDS`, `tankChoices`). No live preview: the modal covers the viewer, the tank changes only on click.
- Stands: no catalogue; `TankSetup.stand {show, height, finish, style (cabinet / frame / custom / table), table, need ('ask'|'none'|'added')}`; terrariums offer "I'll use my own furniture". Existing furniture has no dimensions.
- Price: no size -> range function. Building blocks: `buildSpan` / `buildTotals(animals, tank, 'cheapest'|'balanced')` (`scene/tankfit.ts:346-348`), `rosterTiers` / `costTiers` (`demand/tiers.ts`), `tierPair` budget / designed / luxury (`scene/materialTiers.ts`, BL1), `estimateOf` lo / mean / hi (`explore/estimate.ts`), `demandOf` (`demand/engine.ts:90`).
- Owned gear is set in FIVE places: Setup brief "What you already have" (`briefBar.ts` -> `ownedGear.ts attachOwnedGear`), Guided Equipment step (`guided/equipmentStep.ts`, same `mountOwnedSheet`), Suggest "Equipment I already have" (`ui/suggest.ts:183`), Tech menu "I own one" (`ui/techMenu.ts:54-64`), Room stand prompts + Tank Presets. Data: `constraints.existingTank`, `constraints.owned` (OwnedMap), `project.use[EquipKey]`, `project.tankDims`, and on the scene `S.light.owned/paidUsd/product`, `S.tech` units `{owned, product, paidUsd}`, `S.product`.
- Guided (`guided/shell.ts`): World -> Equipment -> Limits -> Starting Point -> Look First (Visual Discovery) | Animals First | Explore -> editor. Duplicates (step : also set in):
  - World / kind : Animals "Kind of setup" (`#spKinds`), Water section.
  - Equipment : Tank Presets, Tech "I own one", Room stand, Setup brief button.
  - Limits : Setup brief inputs, "Your limits" button, cost-panel Guardrails, Quick Setup "Care level", fullness tile "Set my space".
  - Look : Quick Setup Style / densities / composition / plant care (+ Substrate / Hardscape / Plants / Background).
  - Animals First : Animals roster, Quick Setup "Stocking", Tank Presets.
- No design doc yet proposes "one home per variable in the UI" or "guide walks the real menus" (unified-setup-plan.md is about one data model; guided-setup-rev03.md keeps its own screens). This plan is new and supersedes rev03's separate guided screens once GW2 lands.

## Single homes (proposed; Nathan to confirm, GW2 applies them)

| Variable | ONE home | Others become |
|---|---|---|
| Kind (fresh / salt / terrarium / vivarium) | New Tank dialog + Tank section | Animals "Kind of setup" removed; Water shows params only |
| Tank model / size | Tank section picker (ST1's live picker) | Presets button opens the same picker; Animals First "enclosure" opens it |
| Placement (floor / stand / own furniture) | Room section | picker's "Put it on" step writes the same field |
| Owned gear (incl. owned tank, stand, furniture) | My Equipment (EQ1) | Tech "I own one" = shortcut that opens My Equipment at that item; Suggest field and brief button removed / link |
| Limits (budget, monthly, care, space, hours, experience) | Your limits dialog | brief / guardrail / care / fullness tile show the value and open the dialog |
| Look (style, density, composition) | Quick Setup | Visual Discovery becomes Quick Setup's big "browse looks" view |
| Animals | Animals section | Stocking slider stays as a shortcut into it |

Rule: a shortcut may OPEN the home; it may not hold its own copy of the control.

## The flows after this work

Sandbox: New Tank -> Sandbox -> kind -> empty room with person (Nathan's environment) -> tank picker docked beside the live view (arrow keys / list flip redraws the tank on the floor, each row shows size, price, finished range "$X-$Y") -> Choose -> "Put it on: floor (keep) / a stand / my own furniture (height, top width x depth)" -> editor.

Guided: the same editor with a coach card. Each step opens the real side-panel section (or dialog), highlights the control, says what to decide and why, waits for a change or Skip, then Next. Order: Kind -> Tank (live picker + ranges) -> Placement -> My Equipment -> Your limits -> Look or Animals -> review (cost panel + Problems). Explore stays as the "Open to anything" branch until GW2 decides.

## Lanes

Phase 1, in parallel (files mostly disjoint; overlaps named):

- ST1 Sandbox empty room + live tank picker + placement. Owns: `startMode.ts` sandbox path, `panels.ts newEmptyTank` and the `#tankDlg` picker (or its replacement), `tankPick.ts`, `render/build.ts` ghost / stand / person placement, `scene/defaults.ts`, Room section stand/furniture UI, new `stand.furniture` dims. Consumes FR1's `finishedRange` (stub until it lands).
- FR1 Finished-price range by size. Owns new `src/demand/finishedRange.ts` + precomputed table + tests. No UI except a tiny export ST1 calls. Pure, sourced from existing priced rows.
- EQ1 My Equipment menu. Owns `ownedGear.ts`, `briefBar.ts` owned button, `suggest.ts` owned field, `techMenu.ts` "I own one", a toolbar entry + one side-panel entry. Reads ST1's furniture field only through `TankSetup.stand` (does not add stand UI).
- GW1 Coach engine (guide that walks the real menus). Owns new `src/ui/coach/*`: open a section / dialog by id, highlight a control, card with why / Skip / Back / Next, wait for a store change; a step list in data. Ships behind a "Guide me" toggle in the editor with a short demo path (Kind -> Tank -> Limits) using today's controls. Does NOT remove duplicates.

Phase 2 (queued until ST1 + EQ1 + GW1 land and Nathan confirms the table above):
- GW2 Single-home cleanup + Guided = coach. Remove / redirect each duplicate per the table, switch the Guided entry to the coach path, retire `guided/*` screens that duplicate a home, decide Visual Discovery / Explore placement. Probably split into GW2a (duplicate removal) and GW2b (guided switch) by files.

## Open questions for Nathan

1. Does the table of single homes match what you want (especially Look: Visual Discovery folded into Quick Setup)?
2. Picker: can the user leave the empty room without picking a tank (e.g. "Skip, I'll decide later" -> 20 gal placeholder), or is a tank required?
3. "Own furniture": ask only height, or height + top size (so the tool can warn when the tank overhangs)?
4. Price range: per kind (a reef 40 gal range is not a freshwater 40 gal range). Default yes.
