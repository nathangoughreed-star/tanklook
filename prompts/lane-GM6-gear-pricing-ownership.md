# Lane GM6: Ownership and pricing (G2 in research/design/gear-model.md section 9)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477 (if a newer coordinator is named in HANDOFF.md "Start here", report there). Report ONCE with send_message when ready to merge, done, or blocked. Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile).
Read research/design/gear-model.md (sections 2, 4, 5, 9, 11), HANDOFF.md "Start here" + lane rules. On main: GM1 (gearSpec.ts, src/data/gear/*), GM2 (gear card in ui/techMenu.ts + ui/gearCard.ts; "I own one" is session-only with a TODO(lane G2)), GM3 (render/gear/*, equip kind retired), GM4 / GM5 (library data), NG1-NG6 (brief v2, suggest live loop, owned-gear credit in demand/suggest.ts).
Start: `git fetch`, then `git checkout -b <branch> origin/main`.
Rules: touch only your files (a one-line hook elsewhere is fine, say so). Sibling lane running: GM6 (pricing / ownership) and GM7 (generic-only types). Never loosen a welfare gate; a cheaper pick is offered only if it passes the welfare check. Any moved engine / price number: moved-numbers table and calib regen per the lane rules. Run build + FULL vitest with the Bash tool run_in_background (it wakes you; never Start-Process). Browser check with preview_start, screenshots SAVED AS FILES. Do not push: send sha(s), suite, moved numbers, file paths. Stop preview servers when done.

Owns: GearRef in src/scene/types.ts (+ its parse in src/scene/validate.ts), src/demand/* pricing files (cost, costlines, engine price parts, swaps.ts), src/scene/setupsheet.ts, src/ui/buildPlanSheet.ts "Already have" rows, and the GM2 TODO(lane G2) spot in src/ui/techMenu.ts (that hook only). Branch: gm6-gear-pricing.
Do (section 4):
- GearRef gets `owned` and optional `paidUsd`; saved, shared, undoable; old saves load unchanged. GM2's "I own one" tab writes it (replace the session-only state). An owned piece can be a library product, a generic, or "my own: name + stats".
- Cost lines: owned gear shows $0 "you have" (electricity and welfare still count); plan / setup sheets list it under "Already have". Keep NG3's owned-gear credit in demand/suggest.ts consistent (read the same flag; one-line hook there if needed).
- Library types: generic price = curve per stat (watts or gph) fitted from the library's own prices of that type, replacing hand-set gear-models.json price rows where the fit is good (list the fit and residuals).
- Swap menu (demand/swaps.ts): each alternative shows stat deltas, price delta and welfare effect.
Report: sha, suite, moved-numbers table (expected: generic prices move), price-curve fit table per type, screenshots: I own one on a heater -> $0 line + plan sheet "Already have"; a swap menu.
