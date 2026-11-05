# Lane GW1: coach engine: a guide that walks the user through the real menus

Follow `prompts/lane-common-c20.md` first.

Nathan (2026-11-05): "I want to transition the guided setup to the tool basically walking you through the existing menus so that everything has a single proper home rather than multiple places to access the same variable."

This lane builds the ENGINE only. It does not remove duplicate controls or switch the Guided entry; that is lane GW2, after Nathan confirms the single-home table in the plan.

Build new `src/ui/coach/*`:
- Steps as data: {id, target (side-panel section id, control selector, or dialog to open), title, why (one or two short sentences), done (a predicate on the scene / project, or "any change to these fields"), skippable}.
- Runner: opens the target (expands and scrolls the left panel, re-opens it if collapsed with UI3's arrow-box toggle, or opens the dialog), highlights the control (soft spotlight, dims the rest, never blocks the 3D view), shows a small coach card (title, why, Back / Skip / Next, step n of m), advances when done is true or on Next, saves progress in the project so it can resume, Esc / close ends it. At 375 px the card docks at the bottom.
- Ship behind a "Guide me" button in the editor with a short demo path on TODAY's controls: Kind (Tank section) -> Tank size (Tank Presets) -> Your limits (dialog) -> Look (Quick Setup Style). Steps stay data, so GW2 can rewrite the path for ST1 / EQ1's new homes.
- Tests: the runner opens targets and advances on the predicate; a missing target is skipped with a console warning; resume works.

Screenshots: each demo step on desktop plus one at 375 px.
Stay out of files ST1 / EQ1 own (tank picker, `ownedGear.ts`, `techMenu.ts`, `briefBar.ts`). If you need a hook (an id or data attribute), keep it tiny and name it in your report.
