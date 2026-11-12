# Lane HM2: view toolbar tidy (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "HM2: View Toolbar Tidy".

## Nathan's ask (2026-11-12)
His screenshot shows the toolbar over the 3D view: Undo, Redo, View, Another moment, Re-centre, the light slider with Auto, and below them the "Fullness: Compatible" tile.
1. "Let's have the light slider go into the View menu."
2. "Let's move the undo and redo buttons to the top of the left menu, always available, not just at the top. So if you're in a menu editing something below, they are always visible."
3. "Let's have the save button as an icon on the main screen as well as where it is now."
4. "Let's also change the title of the overall wellness menu there, since it has fullness as well as things like tank size, social needs, etc."

## Today
- Toolbar buttons: `index.html` around lines 429-440 (`#undo`, `#redo`, `#viewBtn` and the View popover `#viewPop`, the light slider with Auto).
- The header is New / Open… / Save / Discover (HM1).
- The Fullness tile: `src/ui/fullnessTile.ts` (title `.ftTitle` "Fullness", line 169).
- The left panel `#side` is now drag-resizable (LP1, `--side-w`).

## Task
1. **Light slider + Auto:** move them into the View menu, with the same behavior and storage, and remove them from the toolbar.
2. **Undo / Redo:**
   - move them to the top of the left panel, sticky, so they stay visible however far down you scroll or whichever section is open;
   - remove them from the view toolbar;
   - keep Ctrl+Z / Ctrl+Shift+Z, the disabled states and the tooltips;
   - check them with the panel collapsed (LP1). If the panel is hidden, Undo / Redo must still be reachable, e.g. they reappear on the view toolbar only while the panel is collapsed.
3. **Save icon:** add one on the view toolbar (floppy / disk icon, tooltip "Save (Ctrl+S)"), doing the same as the header Save; keep the header Save. It shows the same saved / unsaved state if the header shows one.
4. **Rename the Fullness tile:**
   - it covers fullness, tank size, social needs and more;
   - send Nathan 3 title options with a screenshot of the tile for each, in your own chat, with your recommendation first (e.g. "Animal wellbeing", "Habitat check", "Welfare");
   - use his pick, and update the tooltip ("Minimize the fullness tile") and any text that names it.
5. The phone layout must still work: check it at phone width and fix only what this change breaks.
6. Tests for anything with logic (sticky undo state, save icon calling the same save). Screenshots before / after on desktop and phone.

## Files and collisions
- Yours: `index.html` (toolbar, View popover), the toolbar / undo wiring in `src/ui/panels.ts`, `src/ui/fullnessTile.ts` (title only), an `.hm2-*` block in `style.css`.
- Lane DQ11 is editing the list and category-header rows in `ui/panels.ts`, so stay out of them.
- Lane DQ12 owns `ui/discover/inline.ts` (the Discover card, bottom right of the view). Don't move that card.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "HM2: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the result and screenshots. Stop your preview servers.
5. Never end a turn with anything running in the background.
