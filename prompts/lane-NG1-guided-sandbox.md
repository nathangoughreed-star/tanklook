# Lane NG1: New tank, Guided or Sandbox (closes gaps 1 and 9)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE (send_message) when ready to merge, done, or blocked; questions for Nathan stay in your own chat and come WITH pictures (screenshots, cropped, marked). Read research/design/guided-sandbox-plan.md (whole file, short), HANDOFF.md "Start here" and the lane rules there. Your worktree may start from a stale local main: `git fetch` then `git reset --hard origin/main` in YOUR worktree first.
Rules: touch only the files you own (a one-line hook elsewhere is fine, say so). Sibling lanes running at the same time: NG1 (entry), NG2 (brief v2), NG6 (effort). Never loosen a welfare gate. US units in chat (gal, in, deg F). Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots. Do not push: send the sha(s), suite result and screenshots; the coordinator merges. Stop your preview servers when done.

Nathan 2026-10-29: "when you click new to start a new tank, I want the two options to be guided or sandbox."
Owns: src/ui/startMode.ts (new), the New / Open / chooser block of src/ui/panels.ts (~140-310 ONLY), #welcomeDlg / #startDlg in index.html, src/ui/welcome.ts, a .start-mode block in src/style.css.
Do:
- New (and first launch with no restored tank) shows two equal cards: **Guided** (enters today's Welcome workspace: tiles, resources and limits, Explore setup ideas) and **Sandbox** (empty tank with the tank-type picker, free building).
- Retire the old #startDlg chooser or fold it in; deals / bundles / starters / saved tanks become links under Guided (Open still opens saved tanks). Remove the dead #startGuided slot. test/uiids.test.ts must stay green (every $('id') exists).
- Sandbox contract: every check (welfare, compat, temperature, stocking, cost) shows as a flag and never blocks; welfare failures always red and labelled "not a valid tradeoff", never offered as a choice. A Guardrails view lists the brief items marked off (brief `off` flags) and lets the user turn them back on. From Sandbox, one click switches to Guided keeping the tank.
- Guided keeps everything Welcome does today; no brief schema changes (NG2 owns scene/brief.ts, setupBrief.ts, welcomeGuard.ts, briefBar.ts).
Report: shas, suite, screenshots of New (both cards), Sandbox with a red welfare flag, Guided entry, Guardrails view.
