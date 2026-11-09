# Lane SL1: first-load screen with three plain choices (Coordinator 21, 2026-11-09)

Follow `prompts/lane-common-c20.md`: report ONCE to Coordinator 21 (`local_94b0b16c-78cc-4537-b306-4baa170900b2`) and never push. Before reporting, take screenshots at desktop and 375 px. Title this chat "SL1: Start Screen Three Choices".

## Nathan's words (2026-11-09)
"when you first load into the site I want the option to plainly be 'New Setup', 'Starter/Example Setups' or 'Open Existing', where the existing ones would be previously saved tanks, the option to open a file directly from your computer (upload). The user must make a choice at this screen before continuing."

## Build
1. **First load opens one start screen with three large plain buttons:** New Setup, Starter / Example Setups, and Open Existing. Nothing else competes on that screen; no extra links, no deals strip, no art carousel.
2. **The choice is mandatory on first load.** No close X. Esc and a backdrop click do nothing. The editor behind it is not usable until the user picks something. If the user backs out of a sub-step, they return to the three choices, never to the editor.
3. **New Setup** leads to the existing entry shortcuts on one second step: Just exploring, I have some ideas, and I have an existing setup. These live in `ui/startMode.ts` and are wired in `panels.ts` around `attachStartMode`. Keep them behaving exactly as they do now: same handlers, same `welcomeFirst` handling. Deals and bundles are currently on the New menu of `showChooser`. Keep them reachable from this second step as a small secondary link, not a fourth main choice.
4. **Starter / Example Setups** opens the starter tanks gallery, which is `showChooser('open', 'starters')` today. Picking one loads it and closes the screen.
5. **Open Existing** shows two things together:
   - the saved tanks list from `scene/library.ts` (`listLib` / `loadFromLib`), newest first, each with its name and date;
   - an "Open a file from your computer" button that uses the existing `fileIn` / `openFile` path in `panels.ts`.
   With no saved tanks, the list shows one plain line ("No saved tanks yet in this browser") and the upload button still works. A failed or cancelled upload returns to this screen.
6. **The toolbar New and Open buttons** open the same screen, starting at the matching step. There it CAN be closed, because a project is already open. Every route that would replace the current project keeps DX5's ask-first (`startProject` / `confirmStart`).
7. **Retire whatever this replaces.** Where these paths now duplicate the old New / Open chooser tabs and the start-mode first screen, delete the old code rather than leaving two doors. Re-grep for every caller.
8. **Tests:** `test/sl1.test.ts`. Pure logic goes in a small `src/ui/startScreenLogic.ts` (which step, whether the screen can close, empty-library state). Cover these cases:
   - on first load the screen cannot close;
   - opened from the toolbar it can close;
   - each choice routes to the right handler;
   - an empty library shows the empty state.
9. **Checks before reporting:**
   - Browser-check each path, and each path again after a reload.
   - Screenshots at desktop and 375 px of the three-choice screen, the New Setup second step, the starter gallery, and Open Existing both with and without saved tanks.
   - Run `npm run build` and the targeted tests.

## Owns
`src/ui/startMode.ts`, `src/ui/startEntries.ts`, NEW `src/ui/startScreen*.ts`, the start-dialog markup in `index.html`, and the start-chooser block of `panels.ts` (around `showChooser`, `startMode` and `showStart`). Keep your `panels.ts` edits to that block.

## Report
Send your commit sha, the screenshot paths, and anything you decided that Nathan should know. In particular, say where you put the deals and bundles link, and whether anything else got dropped from the old screen.
