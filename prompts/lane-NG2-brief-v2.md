# Lane NG2: Brief v2, persistent design state (closes gaps 2, 3, 4)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE (send_message) when ready to merge, done, or blocked; questions for Nathan stay in your own chat and come WITH pictures (screenshots, cropped, marked). Read research/design/guided-sandbox-plan.md (whole file, short), HANDOFF.md "Start here" and the lane rules there. Your worktree may start from a stale local main: `git fetch` then `git reset --hard origin/main` in YOUR worktree first.
Rules: touch only the files you own (a one-line hook elsewhere is fine, say so). Sibling lanes running at the same time: NG1 (entry), NG2 (brief v2), NG6 (effort). Never loosen a welfare gate. US units in chat (gal, in, deg F). Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots. Do not push: send the sha(s), suite result and screenshots; the coordinator merges. Stop your preview servers when done.

Owns: src/scene/brief.ts, src/scene/validate.ts (parseBrief only), src/ui/setupBrief.ts, src/ui/welcomeGuard.ts, src/ui/briefBar.ts, their tests.
Do:
- Each limit stores max (hard ceiling) vs target (flexible) and a "willing to change" flag; e.g. budget max $250 vs target $200. UI in welcomeGuard: a small max/target toggle per money / time / space item.
- New brief items: room temperature (deg F, stored metric per scene rules), tap water (source tap / well / RO, hardness, pH; move or mirror profile waterSource without breaking pricing), desired experience (watch activity, grow plants, breed, centerpiece ...), willingness to adapt, and an EMPTY `future` slot (future ambition) that lane NG4 fills later.
- Open questions, answered questions and the chosen direction (briefBar's session-only state) persist in the brief: saved, shared, undoable.
- Old saves and share links load unchanged (version bump inside brief only; ask Nathan before any SCENE version bump). Provide a clean API (getters, setters, types) that NG3 / NG4 / NG5 will read: document it in a short section of your HANDOFF entry.
- No engine number moves: the generator does not read target yet (NG3 does that). Calib tables must regenerate identical.
Report: shas, suite, screenshots of the resources-and-limits column with max/target and the new environment inputs, a reload showing questions persisted, the API summary.
