# Lane LP1: resizable left panel (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "LP1: Resizable Panel".

## Nathan's ask (2026-11-12)
"I want the menu to default to its current size when expanded, but let it be continuously expandable and collapsible with the arrow click and drag cursor on the right edge of the menu."

## Today
- `#side` is `width: min(700px, 50vw)` (`src/style.css` line 19). `.status` copies that width (line 85).
- Hide / show: `#sideClose`, `#sideOpen`, `#sideTab` (`index.html` lines 429-430 and 493), `#app.collapsed`, and the handlers in `src/ui/panels.ts` around lines 1320-1360 (`showSide`).
- The phone layout has its own rules in the `@media` blocks around `style.css` lines 252-344.

## Task (desktop; leave the phone layout as it is)
1. **Default:** expanded at the current width, `min(700px, 50vw)`.
2. **Drag handle on the right edge** of the panel:
   - shows a resize cursor;
   - dragging resizes continuously, between a sensible minimum and maximum (say about 280 px up to about 80 % of the window);
   - dragging below the minimum collapses the panel;
   - dragging from the collapsed edge opens it again.
   - Double-clicking the handle resets to the default width.
3. **Arrow:** a small arrow on that edge, clicked to collapse and expand. It returns to the last dragged width, not the default. It replaces or merges with `‹ Hide` / `› Edit`; keep their behavior (split view editing hooks in `showSide`).
4. Everything that copies the panel width follows it: `.status`, the 3D view size (the view must re-fit live while dragging, without long stalls), and any overlays positioned off the panel edge. Use one CSS variable, e.g. `--side-w`.
5. Remember the width per viewer (localStorage), never in scene data.
6. Tests for width clamping and storage, and a screenshot of each state: default, dragged wide, dragged narrow, collapsed.

## Files and collisions
- Yours: `src/style.css` (#side and the side-toggle rules), `index.html` (the toggle buttons), and the side show/hide region of `src/ui/panels.ts`.
- Lane GS1 is editing the Performance / Graphics settings part of `panels.ts` (around line 1287), so stay out of it.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "LP1: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the test result and the screenshots. Stop your preview servers.
5. Never end a turn with anything running in the background.
