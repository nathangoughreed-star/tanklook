# Lane VD4: Density recipes

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start ONLY after VD1 milestone 1 is on main (the coordinator tells you): `git fetch`, then `git checkout -b vd4-density-recipes origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then the plan and spec, which live ONLY in the shared folder (read by absolute path): `research/design/visual-discovery-plan.md` and `research/design/visual-discovery-spec.md` (Nathan's spec, Revision 02; sections 03 and 04 are yours). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. No engine numbers move outside starter / density code; if calibration tables move, stop and report.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result, moved numbers, files now free. Stop your preview servers when done.
Nathan (2026-10-30): "I am trying to get the proper tree built and functional now."

Make the density step real: for each archetype with mapped looks, `recipeScene(archetype, density, tank)` builds the starting scene. Open / balanced / full change ONLY visual amount: plant or coral cover, hardscape coverage, ornament frequency, exposed substrate, negative space. Camera, tank footprint, light, background and focal animals stay fixed. Use the spec 04 table for the archetypes it names; for the rest, each archetype's `density` notes (VD1).
What dense means per archetype (spec 03): Iwagumi = richer stone composition, not a jungle; Dutch = fuller groups, not messy; coral = more cover with safe spacing; terrarium open never removes hides, climbing, cover or thermal structure.
Build on what exists: layer densities (`LayerDens`, `STYLES`, `starterStyle` in `src/scene/items.ts`) and composition (`CompId`). No new art; archetypes without looks stay coming-soon.
Owns: new `src/scene/recipes.ts`, `test/recipes.test.ts`, the density / starter parts of `src/scene/items.ts` (ask the coordinator first if another lane holds items.ts).
Tests: for every archetype with looks, on a 20 gal long, a 40 gal breeder and the archetype's min tank, the three densities give the same animal list, pass the same welfare checks, and cover strictly increases open -> balanced -> full; terrarium open keeps at least the hides / climbing items balanced has.
Screenshots: one density trio per family that has a partial archetype, same camera.
