You are lane SE (our own stocking engine). Worktree ../Glass-Box-stocking, branch stocking, port 5843. Fast-forward to
origin/main first. Run on Sonnet. Subagents on Sonnet only; before any fan-out over 3 subagents or about 1 M tokens, measure
one batch and quote it to Nathan.

Why (Nathan 2026-10-19): AqAdvisor (aqadvisor.com) is no longer reliable (it was unreachable all day; lane AQ could not fetch ids;
the app's stocking line points at it through a proxy, src/data/aqadvisor.ts + the Check / link code near panels.ts line ~1650). We
build our own stocking engine that gives the same kind of answer ("stocking level 78%", over / under, why, what to change) from our
own data, and can explain itself. AqAdvisor stays only as an optional comparison when it is up; nothing depends on it.

The model (Nathan's reasoning, keep it this simple):
- LOAD has two variables per animal: its MASS and its relative METABOLISM.
  * Mass: do NOT use length alone. Take the animal's real volume from its 3D model (the models are drawn at true adult size; fish in
    src/render/fish3d.ts, herps in herp3d.ts / lizard3d.ts, shrimp and snails have builders too): enclosed mesh volume in real
    units, times a body density of about 1.0 to 1.05 g/cm3. A discus, an eel and a goldfish of one length then differ the way real
    fish do. Caveats to check per species: the mesh must be closed (holes or overlaps give wrong volume), fins and other thin parts
    add mesh volume but almost no mass (count body parts only, or fins at a small weight), and a model slightly slim or fat must show
    up as an outlier: cross-check every species against FishBase length-weight (a * L^b; src/data/waterchem.ts was checked against
    FishBase by lane CG) and flag disagreements instead of silently trusting either. Compute once with a script into a data file
    (e.g. scripts/body-mass.mjs -> src/data/bodymass.json); no mesh work at run time.
  * Metabolism: a per-species relative factor for food eaten and waste produced per unit mass: diet and activity class (active
    carnivore or schooling fast swimmer high; sedentary, herbivore, or cold-water low) plus a temperature adjustment (a Q10 style
    rise with water temperature; the tank temperature is in the setup / tech model). Waste per animal is about mass^0.75 times the
    metabolism factor (standard metabolic scaling: big fish count for less per gram). Keep the factor table small, data driven and
    sourced (one line each), not 80 hand-tuned numbers: derive from a few classes and give exceptions by id.
- CAPACITY is the other half: how much load the tank clears. From water volume (bioloadLitres in src/scene/starter.ts), filter
  turnover and type (stockCapacity and optionCost in src/scene/tech.ts, owned by lane TM: call it, do not edit it), the water-change
  schedule if the setup has one, and optionally live plants (a planted tank clears more; keep this small and documented). Salt
  tanks and the terrarium / paludarium water part: say what you assume.
- VERDICT: one number (load / capacity as a percent, over 100 = overstocked), the biggest contributors, the reason in plain words
  ("overstocked mainly because of the 2 oscars; or add a filter turnover of 6x to reach 100%"), the existing compatibility
  warnings kept separate (lane CG: waterchem.ts, animalfit.ts, group minimums). Land animals are not counted against the water load.
  Frogs, newts and axolotls in the water are.

Work unit, in order, each step pushed on its own when green:
1. FEASIBILITY PROBE (a few hours, report before building the rest): compute mesh volumes for a handful of shapes (discus, an eel
   or loach, goldfish, neon tetra, a pleco, a shrimp, an axolotl) in a script, compare with FishBase mass at the model's length,
   and tell the coordinator (message) whether volume-from-model works, what has to be fixed (open meshes, fins), and the typical
   error. Pictures of the comparison table are enough. If it does not work for a body plan, fall back to a FishBase length-weight
   per species for that plan and say so. Do not continue past this step on a guess: Nathan decides from the numbers.
2. Data + pure engine: src/scene/stocking.ts (new), bodymass.json, metabolism classes, loadOf / capacityOf / stockingOf(S)
   returning { percent, contributors, reasons, capacity parts }. Tests: known-good and known-bad stockings (ten or more cases:
   a lightly stocked 20 gal community, an overstocked 10 gal with cichlids, a goldfish in a bowl, a reef with a big tang, a
   heavily filtered planted tank that holds more) with sane percentages and ordering; monotonic in animals, filter and volume.
3. Calibrate against today: the density slider and the starters use litresFor() in src/scene/starter.ts (a rule of thumb: about 3 L
   per neon, 30 L per angelfish). Replace it with the new load, calibrated so the starters and the density stops come out close to
   today's (the 11 example tanks keep their look; show a before / after table of animal counts per starter and tank). This file is
   shared: keep edits to the bioload helpers, one-line hooks otherwise.
4. UI: replace the AqAdvisor-driven stocking line (panels.ts ~1650 to ~1690) with ours: the percent, a short reason line, and the
   contributors on hover or in an expandable list; keep an "AqAdvisor ↗" comparison link and the optional Check only when the site is
   up. The demand panel and the wizard may read stockingOf; expose it, do not wire them.
5. Pictures of the line and an example breakdown before shipping; wait for Nathan's verdict.

Files you own: new src/scene/stocking.ts, src/data/bodymass.json, scripts/body-mass.mjs, test/stocking.test.ts, the stocking line in
src/ui/panels.ts and its markup in index.html, litresFor / bioload helpers in src/scene/starter.ts, src/data/aqadvisor.ts (demote it).
Read only: src/scene/tech.ts and tech.json (lane TM is still editing them), waterchem.ts, animalfit.ts, care.ts (lane CG, done),
src/render/*3d.ts (read the geometry, change nothing). The main checkout holds other chats' uncommitted edits (items.ts, starter.ts,
plant3d.ts, launch.json): never commit, pull, reset or stash there. Lanes TM and TG run now; do not edit their files.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched (the full suite is about 855 tests and takes
about 90 s), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash. No scene version bump. Add your own dated
section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in). Model changes, if any, are recorded on /review.html.
preview_stop when done. preview_start serves the folder the chat was opened in: open this chat inside the worktree. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message after step 1 (the feasibility numbers),
and whenever work lands on main, and when you are done: commit hash, what landed, what is still open, which files are free. Questions
for Nathan stay in your own chat, with pictures. The coordinator cannot relay approvals.
