# QP4: Per-archetype backgrounds in the quick-preference thumbnails (Coordinator 22)

Follow `prompts/lane-common-c20.md`. First `git fetch origin && git merge --ff-only origin/main`. Read `scripts/qp3-thumbs.mjs`, `src/scene/quickArchetypes.ts`, HANDOFF "QP3". Report to Coordinator 22; never push. Do not edit `src/ui/`.

## Why
Nathan, looking at the freshwater cards: every thumbnail has the same blue background. "Lets choose backgrounds that better fit each style rather than them all being the same (and blue)."

## Task
1. For every archetype in every habitat (19 plus the unsure sample), choose a background that fits the style, using only backgrounds the app can really draw (the existing backdrop / background options: solid colours, 3D backdrop, photo-style options; check what the design model offers). Examples to test, not mandated: Blackwater = dark warm brown or black; Iwagumi = plain light or black; Dutch = black or deep green; Jungle = dark green foliage; Nature/River = stone or natural backdrop; Clean and minimal = plain neutral. Reef / terrarium / paludarium get their own fitting choices. Siblings should still be distinguishable at 160 px.
2. Decide where it belongs: the thumbnail script only, or the archetype definition so the A/B candidates the generator makes for that archetype use the same background (preferred if the generator already varies backgrounds; if it does, keep thumbnail and candidates consistent). Say which you did and why. If it changes candidates, keep the hard checks and the stand/background attributes working (stand default black stays).
3. Re-render the thumbnails (`scripts/qp3-thumbs.mjs`), keep each webp about 15-25 KB, total size within the QP3 budget, regenerate the contact sheets in `research/screens/QP4/`, review them for distinctness yourself, and send the contact sheets to Nathan via SendUserFile.

## Done when
All thumbnails re-rendered with per-style backgrounds; contact sheets reviewed; tests for any model change; build clean; ab* / quick* tests pass (load timeouts re-run alone); HANDOFF section. Report with branch + sha rebased on origin/main.
