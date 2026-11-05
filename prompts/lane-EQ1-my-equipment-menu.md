# Lane EQ1: one "My equipment" menu, reachable any time

Follow `prompts/lane-common-c20.md` first.

Nathan (2026-11-05): "I think we should have a totally separate menu for existing equipment that can be accessed at any time." and "everything has a single proper home rather than multiple places to access the same variable."

Owned gear is set in five places today (see the plan's map): Setup brief "What you already have" (`briefBar.ts` -> `ownedGear.ts attachOwnedGear`), Guided Equipment step (`guided/equipmentStep.ts`, `mountOwnedSheet`), Suggest "Equipment I already have" (`ui/suggest.ts:183`), Tech menu "I own one" (`ui/techMenu.ts:54-64`), Room stand prompts and Tank Presets.

Build:
1. A "My equipment" menu (own dialog or sheet; a toolbar button that is always visible plus one entry in the left panel; works at 375 px): owned tank (model or dims), stand or furniture (reads / writes `TankSetup.stand`, own furniture is the existing `table` style with `stand.table` L / D and `stand.height`; do not build stand drawing or the placement prompt, ST1 owns those), filter, heater, light, skimmer, flow, lid, test kit, dry heat, care basics. Keep today's data model (`constraints.owned`, `constraints.existingTank`, `project.use`, `applyOwned` onto the scene); old saves must load unchanged.
2. Every other place becomes a SHORTCUT that opens My equipment at that item: Tech "I own one" opens it at that heater / filter / light; the Setup brief button opens it; Suggest shows a one-line summary + "Edit my equipment". No second copy of the controls. The Guided Equipment step may keep mounting the same menu body (lane GW2 reworks Guided later).
3. Tests: one write path (an item owned from the menu gives the $0 "you have" line in the cost panel); each shortcut opens the right item; old saves unchanged.

Screenshots: the menu (desktop + 375 px), a Tech shortcut opening it, the cost panel with owned items.
