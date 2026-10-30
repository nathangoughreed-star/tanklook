# Lane VD2: Capability audit

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start ONLY after VD1 milestone 2 and VD4 are on main (the coordinator tells you): `git fetch`, then `git checkout -b vd2-capability-audit origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then `research/design/visual-discovery-plan.md` and section 09 of `research/design/visual-discovery-spec.md`. Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below). No engine numbers move.
Questions for Nathan stay in your own chat and come WITH pictures (saved as files, sent with SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (no polling). Don't push: send branch, sha(s), suite result, files now free. Stop your preview servers when done. Keep images out of your own context once a rule is verified: have scripts write contact sheets to files.

Audit every archetype (spec 09): render it from its mapped looks at open / balanced / full (VD4's `recipeScene`), compare with its `fingerprint` and its `contrast.sibling`, and set `support` to supported / partial / coming-soon with a one-line reason. Confirm each density trio stays the same archetype and keeps animal counts.
Rank feature packs by archetypes unlocked, interest (taste `wish` events if any; research popularity otherwise), fidelity gained and effort. "Decor first" is a hypothesis to test, not a given.
Owns: `research/taste-tree/audit/` (one contact sheet per family as an image file, `audit.md`), and ONLY the `support`, `deps`, `alternative` and `recipe.looks` fields of `src/scene/archetypes.ts`.
Report: counts per support state before / after, the ranked pack list with the archetypes each unlocks, the contact sheets' paths.
