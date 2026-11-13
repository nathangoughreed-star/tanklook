# New UI build: rules for every build lane (Coordinator 24, 2026-11-13; request R27)

Also follow `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots).

- **The design is approved:** `research/design/ui2-screen-map.md` (read §1, §1a, §2a, §3, §5, §7 and the row(s) for your step; grep the rest). Mockups: `research/design/ui2/*.html` + `tokens.css`; PNGs `research/screens/UI2/`. Nathan's product vision: §1 (anyone, every level; Plan / Evaluate / Explore / Learn / Best fit / Money; no care guidance).
- **Two kinds of lane:**
  - **P lanes** (engine extraction, §7 P1-P10): move logic out of the old UI files into plain, tested modules. The old shell must behave EXACTLY as before (it is the live site); it just calls the new module. No visible change. Each moved function gets node tests.
  - **Shell lanes** (§7 steps 1-12): build the new UI under `src/shell/` with **Preact** (decision 6), shown only with `?ui=2`. Without `?ui=2` the app is unchanged. Use the component set of §5 and `tokens.css`; never import from `panels.ts`, `index.html` ids or the old `style.css`.
- **Tests:** node-only (decision 7, no happy-dom): logic in plain modules with tests; the shell proven with real-app screenshots at 1600x900 and 390x844 under `research/screens/<LANE>/`.
- **Old-shell freeze (from 2026-11-13):** no new features in `index.html` / `panels.ts` / old `style.css`. P lanes may edit them only to replace moved code with a call.
- **One writer per file set:** your brief names your files. If you need a file another lane owns, stop and ask Coordinator 24.
- Bundle size: the live bundle must not grow by more than ~10 KB gzip unless `?ui=2` code is split into its own lazy chunk (it should be).
- Add a dated HANDOFF.md section for your lane.
