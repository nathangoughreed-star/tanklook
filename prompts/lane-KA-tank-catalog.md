Read HANDOFF.md "Start here" first, then research/plan-guided-start-kits.md (decisions, "L0 audit and schema", "Amendments").
You are lane KA (tank catalog). Worktree, branch and port: the coordinator assigns them (../Glass-Box-tankcat, branch tankcat);
fast-forward to origin/main first. Run on Sonnet.

Work unit: a full catalog of real aquarium tanks, nano to monster, replacing the 9-entry TANK_PRESETS (src/scene/defaults.ts:56,
used by src/ui/panels.ts ~line 313). Data and a checker; no new geometry (bow / pie / poly / round / bowl already render).

1. src/data/tanks.json + src/data/tanks.ts (typed loader like species.ts). One TankModel per the plan schema: id, name, ratedGal,
   shape (+ sides / bowMin / pieDeg where needed), OUTER dimensions in mm (what people measure and what the label says; Nathan
   2026-10-19), glassMm, rimless?, band (nano / small / mid / large / monster), tags, note.
2. Derivation: the app's Tank is INTERIOR mm with glass added outside. Interior L and D = outer minus 2 x glass; interior H = outer H
   minus the bottom pane. Catalog tanks carry their own glassMm, so there is no circularity. Provide
   `tankFromModel(m): Tank` and the reverse for a custom tank typed in outer dimensions (a 2-3 step fixed-point loop on
   glassThickness() in scene/physics.ts, which derives thickness from interior height).
3. Size ladder to cover (verify real outer dimensions from manufacturer / retailer listings; cite the source URL in the note; where a
   size has several makers pick the common one and say so): nano 2.5, 3 cube, 5, 5.5, 6 bow/cube, 8 cube, 10; small and mid 15, 20 high,
   20 long, 29, 30 breeder, 37, 40 breeder; large 45 cube, 50 breeder, 55, 60 breeder, 65, 75, 90, 120; bowfront and corner 36 bow, 46
   bow, 72 bow, 24 corner, 35 hex, 50 corner; monster 125, 135, 150, 180, 210, 240, 300, plus 6 / 8 / 10 ft custom-build sizes. Keep the
   existing 10 terrarium presets (a separate list: `terrarium: true`).
4. scripts/check-tanks.mjs + test/tanks.test.ts: for every entry, compute volume() from the derived interior and compare with
   ratedGal (flag more than 8 % off, with a short list of known honest exceptions: a "40 breeder" is about 40, a "20 long" about 19-20,
   but nominal sizes like "300" can be far off; list these explicitly, don't loosen the tolerance), check outer -> interior -> outer
   round-trips exactly, ids unique, band matches gallons (under 15 / 15-40 / 40-75 / 75+).
5. Picker (src/ui/panels.ts): replace the Presets dropdown with a grouped one (optgroup per band, terrariums last), kept as a dropdown
   for now. Nathan wants a toggle Bare tanks / Kits later (lane KD); leave a clean seam: a function `tankChoices()` that the future
   wizard can call. Do NOT redesign the left panel (a revamp is a separate, later track). Check it in the browser: pick a bow and a
   corner tank, confirm shape and size look right and the weight / volume readouts agree with the catalog.
6. Existing saved scenes must load unchanged; no scene version bump.

Files you own: src/data/tanks.*, scripts/check-tanks.mjs, test/tanks.test.ts, the preset code in src/scene/defaults.ts, and the preset
picker lines in src/ui/panels.ts only. The coordinator tells KK when your panels.ts change lands (KK adds its panel after).

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check, git push origin HEAD:main, then
git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Stage by path, never commit -a. Add your own dated section under
"Lane sections (current)" in HANDOFF.md. Record any model changes on /review.html.

Coordinator protocol: message the coordinator COORD_ID (send_message) when work lands on main and when you are done: commit hash,
what's open, which files are free. preview_stop your dev server when finished. Questions for Nathan stay in your own chat, with a
picture for anything about a tank shape or layout. If the chat gets long, hand off to a fresh chat at a work-unit boundary after
writing your state into your HANDOFF section.
