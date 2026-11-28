# BH-S1: affordance map, what was built (R208, 2026-11-28)

Code: `src/behavior/` (`shapes.ts` exact local shapes, `affordance.ts` the map, `overlay.ts` the `?bh&places` dots, `params.ts`, `bh1Scene.ts` the review tank). Tests: `test/behaviorAffordance.test.ts`. Picture: `bh1/s1-places-overlay.jpg`.

Open it: `?scene=bh1&bh&places` (the review tank is never autosaved). `window.__bh` (dev) holds the map and its build time (~1.9 s on the review tank; once per scene change).

Decisions and deviations from the design doc
- The swim field stays untouched. It treats caves as solid boxes and rocks as bounding boxes, so every place is found against the new hard shapes; the glass, floor and water line are read from a second field built with no items (`env`).
- Shapes: rounded boxes (rocks, ornaments), capsules (wood limbs), hollow shells (clay tube, half-log, cork round and flat), dome (coconut, doorway on local +z, the way the art opens), half-torus arch. Yaw only, like the field (pitch and roll are ignored by both).
- Overhang = a free spot under a roof at least ~3 cm wide, open on a side; crevice = a 6-46 mm slot between two hard pieces with an open run along it. Cork flat counts as an overhang, not a cave. Castle gate and ship are not hollow yet (not in the five pilots' scape).
- Root mass = spider / redmoor / manzanita wood (permeable box, speed 1 - 0.8 density). Thicket = every upright plant 4 cm or taller (permeable cylinder). The swim field still blocks fish at those limbs; letting them in is S3.
- Sand is buryable when the substrate grain is sand or mud and the bed is at least 15 mm (kuhli rule minDepth is 25 mm; S3 applies it per species).
- Food patches: graze on glass / wood / rock, sift on open sand, amount 0..1, regrows in 7 min. Nothing draws or eats them yet.
- Review tank is 36 x 18 x 16 in (45 gal), not 30 gal: the app showed D = 18 in whatever the scene set for D = 13 in (not chased).
- Nothing changes live: no fish code reads the map yet, `behaviorLive.json` comes in S6.
