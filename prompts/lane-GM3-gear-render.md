# Lane GM3: Generic gear render (lane G3 in research/design/gear-model.md section 9)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE with send_message (session_id = that id) when ready to merge, done, or blocked. Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, cropped, marked, sent with SendUserFile).
Read research/design/gear-model.md (sections 2, 8 and 11), HANDOFF.md "Start here" + lane rules, memories "Fish art must not look cartoony" spirit and "Real gear in true colours" (in ~/.claude/projects/C--Users-nreed-Glass-Box/memory/). GM1 split gear3d.ts into src/render/gear/* (co2, common, dry, filter, heater, pump, reef); GM2 put a gear card (Generic | Library | I own one) on Heating, Filtration and Lighting in ui/techMenu.ts.
Start: `git fetch`, then `git checkout -b gm3-gear-render origin/main`.

Owns: src/render/gear/* (add light.ts etc. as needed), src/render/gear3d.ts, src/render/equipment.ts, src/scene/equipment.ts, their tests.
Do (section 8):
- Generic models: one simple, crisp neutral model per type, scaled by the tunables (heater length follows watts; light bar length follows its length; canister / HOB body size follows gph). Neutral grey / white, matching the tank render, never cartoony.
- Product models: the same builder fed the product's per-part colours and dims (true colours; geometry may be simple).
- Move the lily pipe and mister pieces from render/equipment.ts into per-type builders; then retire render/equipment.ts, scene/equipment.ts and the `equip` item kind, with saved `equip` items loading as plain objects (no crash, test it). Ask Nathan before any scene version bump.
- The generic slider in GM2's card should visibly resize the model (if that needs a hook in ui/techMenu.ts, one line only and say so).
- No engine number moves, no pricing change (G2), no UI beyond that one hook. Sibling lanes running: NG3 (demand/suggest, ui/suggest, demand/propagate, refine) and R7 (pricing / light efficiency).
Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots SAVED AS FILES: each generic model at two slider settings, two library products in their true colours, an old saved tank with an equip item loading. Don't push: send sha(s), suite result and file paths; the coordinator merges. Stop your preview servers when done (check the port is free after).
