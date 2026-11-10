# SL2: Open where the last session left off; New / Open as left-menu buttons (Coordinator 22)

Follow `prompts/lane-common-c20.md`. First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "SL1" (the start screen) and `src/ui/startScreen*`, `startMode.ts`, `projectStart.ts`, `startEntries.ts`. Report once to Coordinator 22; never push.

## Nathan's change (2026-11-10), replacing SL1's "mandatory every visit"
- On load the tool opens EXACTLY where the last session left off: the same design, view, mode and open panels (including a Discovery session in progress if feasible; at minimum the working design, camera, and which main mode was active). No start-menu interstitial on a return visit.
- Only a true first visit (nothing saved) shows the start screen, as today.
- The start choices become separate buttons in the LEFT MENU, near the top: New (setup), Starter / Example, Open (existing), and the rest of what the start screen offered ("Continue your last tank" disappears as redundant). Keep their existing behavior and warnings (e.g. replacing an unsaved/edited design asks first, undo still works).
- Reuse the saved-state restore that already exists (autosave / `persistBase`); do not invent a second persistence path. A corrupted or incompatible save falls back to the start screen with a clear message, never a blank app.
- Do not touch the Discovery locks/preview code (PS1 just landed) or the top-bar menu (AB12 just landed) beyond what restore needs.

## Done when
Tests: restore round-trip (design, mode, view), first-visit start screen, corrupt-save fallback, and the new left-menu buttons each doing what the old start entries did. Browser check at desktop and 375 px (left menu may be a drawer there). Screenshots in `research/screens/SL2/` (~60 KB), key ones to Nathan via SendUserFile. HANDOFF: update the SL1 section to say it is superseded.
