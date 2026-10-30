# Lane VD1: Archetype registry

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked; also report milestone 1, which unblocks VD3 and VD4.
Start: `git fetch`, then `git checkout -b vd1-archetype-registry origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then the plan and spec, on origin/main: `research/design/visual-discovery-plan.md` (lanes, registry contract, decisions) and `research/design/visual-discovery-spec.md` (Nathan's spec, Revision 02). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. No engine numbers move; if one does, stop and report.
Questions for Nathan stay in your own chat and come WITH pictures (saved as files, sent with SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling). Don't push: send branch, sha(s), suite result (files / tests passed), moved numbers (expect none), files now free.
Nathan (2026-10-30): "I am trying to get the proper tree built and functional now." Art: "make simple placeholders and I will replace them with better ones at a later time."

Build `src/scene/archetypes.ts`: the canonical registry of environments, water types, visual families and archetypes, exactly to the "Registry contract" in the plan (types, exports, helpers).
Sources (on origin/main): `research/taste-tree/TREE.md` (fingerprints, taglines, look mappings) and the research files A / B / C beside it (grep by node id; never read whole). The plan's "Draft taxonomy" tables are the starting list. The spec's family lists and its environment / water card copy are fixed: use them verbatim.

**Milestone 1** (report it; it unblocks VD3 and VD4): the contract types and helpers, all ENVIRONMENTS / WATERS / FAMILIES with taglines, and ONE complete archetype per family. Ship it through the coordinator as its own commit.
**Milestone 2:** every archetype. Each passes the spec's "valid ending archetype" test (02): recognizable, no palette / count / layout choice needed, distinct from siblings (merge look-alikes and say which), no unsafe default. Every family has at least 2 archetypes; no dead ends. Taglines: one line, playful, an upside and a quiet catch; no claims the engine could contradict ("cheap", "easy").

Brackish, terrarium and paludarium are the thinnest. Research them first with at most 3 Sonnet subagents (web) and write findings to NEW files `research/taste-tree/vd1-<topic>.md` in your worktree (don't recreate the shared-folder files).
Support status by rule for now: `recipe.looks.length ? 'partial' : 'coming-soon'`; every coming-soon archetype names an `alternative` that is partial. `deps` lists what the renderer lacks (from the research cues) so VD2 can rank feature packs later. Family `colour`: one flat colour per family for the placeholder tiles.

Owns: `src/scene/archetypes.ts`, `test/archetypes.test.ts`, new `research/taste-tree/vd1-*.md`. Reads `src/scene/types.ts` (LayoutId), `src/scene/scapes.ts` (PlantMode).
Tests: unique ids; every familyId / alternative / alsoIn / contrast.sibling resolves; every family has >= 2 archetypes (milestone 2); every coming-soon has a partial alternative; `familiesOf('aquarium', 'brackish')` returns the spec's five brackish families; every LayoutId in recipe.looks exists.
Report: counts per environment / water / family / support state, and the merges you made.
