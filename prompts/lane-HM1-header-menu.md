# HM1: Header menu cut to New / Open / Save / Discover (Coordinator 22)

Follow `prompts/lane-common-c20.md`. First `git fetch origin && git merge --ff-only origin/main`. Read the header toolbar in `index.html` / `src/style.css` (commit 1c7aae88 "Header: toolbar regrouped"), `src/ui/panels.ts`, `src/ui/discover/keep.ts`, and HANDOFF "SL2" (New / Starter-Example / Open in the left menu) and "EQ1" (My equipment). Report to Coordinator 22; never push.

## Nathan, 2026-11-11
"In this menu I only want new, open (which asks if you want to open a saved tank or starter tank), save (which has save or save as), and discover. Remove my equipment."

## Task
1. **The header toolbar holds exactly four buttons:** New, Open…, Save, Discover. Lay them out cleanly at the real panel width and at 375 px.
2. **Open…** asks first: "A saved tank" (today's Open file / saved-tank path) or "A starter tank" (today's Starter / Example picker). Remove the separate Starter / Example button.
3. **Save** offers "Save" (today's save) and "Save as…" (save under a new name or file).
   - Fold today's Download into Save as… so no function is lost: Save as… writes the downloadable file. Say exactly what you did.
   - Keep the "✓ Autosaved" indicator.
4. **Remove My equipment** from the header. It stays reachable from the Equipment section ("Open My equipment…"); verify that.
5. **Guide me:** leave it where and as it is for now. Nathan is deciding whether to keep it, and the coordinator will message you.
6. Update anything that pointed at the removed buttons: SL2 start / resume paths, coach steps, tests, the start screen.

## Done when
- UI tests for the four buttons, the Open chooser and the Save / Save as menu.
- ab* / dx* / sl* tests pass.
- The build is clean.
- Real-UI screenshots at desktop and 375 px in `research/screens/HM1/`; send the key ones to Nathan.
- A HANDOFF section.
