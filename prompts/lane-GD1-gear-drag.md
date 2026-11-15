# Lane GD1: click and drag equipment in the view (R64)

Nathan 2026-11-15: "im finding it difficult to move equipment like the heater, filters, and co2 sstem tubes. it should just be a click on it, it highlights with its hitbox, heaters become draggable to any glass surface (horizontla or vertical available in the menu), and HOB filters just become slideable on the top rim to any location"

## Today
Find out first and write it down in your report: how gear is placed and moved now in the new UI (`?ui=2`) and the old one.
- Is there picking for gear, and is there a gizmo?
- Where are the mount rules? Lane GM8 did suction mounts, and lane CB2 is doing HOB wall clearance and the background notch right now (R59). Don't touch CB2's files without telling the coordinator.
- How are CO2 diffuser, tubing, intake and outlet positions stored?

## Do
1. **Click to select:** a click on any equipment piece (heater, HOB / internal / sponge filter, canister intake and outlet, CO2 diffuser and its tube, air stone, powerhead, thermometer ...) selects it. It is drawn with its hitbox outline (the same selection look as hardscape), and its menu opens at its options (CM2 click-to-open already routes this; keep it).
2. **Drag on its mount surface:** each kind moves only where it can really mount, with snapping and no clipping.
   - **Heater:** any inside glass face: back, front, sides, and the bottom where that's allowed. Its menu has Orientation: Vertical / Horizontal / Angled (45°), applied on the current face.
   - **HOB filter, HOB skimmer, overflow box:** slide along the top rim (back by default; a side if the tank is a peninsula or the person picks a side), clamped clear of corners, braces and other rim gear.
   - **Suction-mounted gear** (CO2 diffuser, intake strainer, outlet, thermometer, air stone line): drag on the inside glass faces. Tubes and hoses re-route live to their mount (the CB2 / GM8 tubing code).
   - **Bottom gear** (air stone, sponge filter): drag on the substrate.
3. Dragging is one undo step. Arrow keys nudge the selected piece by 0.25 in along its surface. Esc deselects. Phone: long-press to pick up, then drag.
4. Picking order: gear in front of plants and fish when they overlap, or a click cycles through the stack.

## Checks
- `npm run build`.
- Tests for mount surfaces (a heater can't leave the glass; an HOB stays on the rim and clamps at the corners), undo, and save/load.
- A short sequence of shots (select, mid-drag, dropped) for a heater going from back glass to side glass vertical then horizontal, an HOB slid along the rim, and a CO2 diffuser moved with its tube following, at 1280. Save them in `research/screens/GD1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
