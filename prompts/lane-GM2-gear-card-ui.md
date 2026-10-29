# Lane GM2: Gear card UI (lane G1 in research/design/gear-model.md section 9)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE with send_message (session_id = that id) when ready to merge, done, or blocked. Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, cropped, marked, sent with SendUserFile).
Read research/design/gear-model.md fully (sections 2, 4, 5 and 11 = Nathan's approvals), HANDOFF.md "Start here" + lane rules. GM1 (foundation) is on main: src/scene/gearSpec.ts (StatBlock, statsOf), src/data/gear/*, src/render/gear/*.
Start: `git fetch`, then `git checkout -b gm2-gear-card origin/main`.

Owns: src/ui/gearCard.ts (new), src/ui/techMenu.ts, a .gear-card block in src/style.css, their tests.
Do (Nathan approved, section 11):
- A gear card in each Tech-menu row with tabs Generic | Library | I own one. Items panel stays decor only.
- Generic: sliders for the type's stat block (wattage, flow, ...) within gearSpec limits. Library: real products with locked specs. "Tune as generic..." stays on library products. I own one: marks owned (UI only; pricing and the owned / paidUsd fields are lane G2's, so store nothing new in demand/*; if you need a field, add a TODO and say so).
- Wire Heating first, then Filtration, then Lighting. Units shown per scene units (US: gal, in, deg F, W, gph).
- No engine number moves, no render change (G3 owns render), no pricing change (G2). EQUIP_ENABLED stays false. Never loosen a welfare gate.
- Sibling lanes running now: NG3 (demand/suggest.ts, ui/suggest.ts, demand/propagate.ts, refine.ts) and R7 (pricing / light efficiency). Don't touch their files.
Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots SAVED AS FILES (card on Heating with each tab, Filtration, Lighting). Don't push: send sha(s), suite result and file paths; the coordinator merges. Stop your preview servers when done.
