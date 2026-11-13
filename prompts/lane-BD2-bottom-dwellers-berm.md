# Lane BD2: bottom dwellers sink into the embed berm (Coordinator 24, 2026-11-13; request R33)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/BD2/`).

## Nathan's report (2026-11-13)
"it looks like we have an issue with the new embed function and bottom dwellers, their "surface" they rest on seems to be below where the substrate now visually rises to."
His screenshot (not saved to disk; describe from this): a pale bottom fish (looks like a corydoras / otocinclus-type) lying on the gravel near rocks, its belly and lower body hidden by the raised substrate mound around the rocks, gravel grains drawn over it.

## Likely cause (check, don't assume)
VF-C2 `embed` (HANDOFF "VF-C2"; `render/contact.ts`, `build.ts groundSkin`): each hardscape piece gets a **berm** mound of ground texture (2-9 mm high, falling off over ~1.75 footprints), and stones sink 5-15 %. The berm is render-only, so the ground height that bottom dwellers, snails (`surface: "floor"`), plants and leaf litter rest on probably does not include it.

## Job
- Reproduce with a tank that has corydoras / otos / loaches / nerites on the floor near rocks and wood (e.g. `research/visual/vf0/scenes/planted4.json`, Nathan's 20g long scene `nathan-20g-long-2026-11-13.json`).
- Make the ground height everything rests on include the berm (one function, used by fish rest height, snails on the floor, plants and leaf litter placement), or cap the berm under where an animal rests; your call, say why. Same for any grain scatter (`mix`) drawn above the surface.
- Check plants and leaf litter near rocks too (same bug class).
- No new per-frame cost (berm height can be baked once per build).

## Proof
Before / after shots close to the floor near rocks with bottom dwellers, at two camera angles; a test that a fish resting on the floor next to an embedded stone is not below the berm surface. Add a dated HANDOFF.md section "BD2".
