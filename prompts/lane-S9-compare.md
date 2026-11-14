# Lane S9: Compare (split view) in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 9; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S4 template (HANDOFF "S1", "S3", "S4", "S8").

## Job (behind ?ui=2 only)
- **Compare** (UI2 §2a row "Viewer cluster": Compare / Views linked / End compare; shot `research/screens/UI2/03-split-desktop.png`):
  - two setups side by side;
  - the cameras are linked by default, with a toggle to unlink;
  - the check bar and drawers show both, with differences marked;
  - "Use this one" keeps one side;
  - End compare.
- Use the existing `src/ui/sideStore.ts` as it is (§7: "`sideStore` as is"). If the shell needs a small pure helper on top of it, put it in `src/shell/logic/compare.ts` with tests; do not rewrite `sideStore`.
- Add the Compare button to the View cluster S8 built (`src/shell/view.tsx`): touch only that button.
- **Phone:** stacked or swipe between the two sides (§1a, shot 02). Choose what fits and say which.
- **Your files:**
  - new `src/shell/compare.tsx`, `src/shell/logic/compare.ts` and new tests;
  - the Compare button in `view.tsx`;
  - registration lines only in `App.tsx` / `boot.tsx` / `shell.css`. Lanes S7 and S10 register sections at the same time.
  - Do not edit `panels.ts`.
- **Proof:**
  - 1600x900 shots next to UI2 shot 03: compare open, linked orbit, the differences marked in the check bar, "Use this one";
  - phone shots at 390x844;
  - the old site's split view still works (no `?ui=2`).
