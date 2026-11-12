# Lane GS1: Graphics settings menu (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "GS1: Graphics Settings".

## Why (Nathan 2026-11-12)
Nathan refreshed his live build and the caustic animation had stopped. It is still ON by default. What stopped it is the VF5b motion safeguards in `src/render/viewer.ts` (around line 172, `causState()`):
- it moves only at the Full quality performance level;
- it pauses after 60 s with no input;
- a slow-machine back-off halves the rate and then holds it still, and that sticks until the level or the switch changes.

`src/render/perf.ts` Auto can also step the level down, and it never steps back up; the level is saved in localStorage. His words: "we need a graphics settings menu that has this kind of thing available so the user can see what's going on rather than a black box."

## Task
1. Grow the existing Performance setting (`src/ui/panels.ts` around line 1287: slider + Auto checkbox, `LEVELS` in `perf.ts`) into a **Graphics settings** menu. Its contents:
   - the quality level and Auto, with **why the level is where it is** (for example: "Auto lowered this from Full quality on <date/time> because frames missed 30 fps"), and a "Back to Full quality" button;
   - one switch per effect in `src/render/fx.ts` `FX` (tone mapping, plant variety, substrate patterning, contact shadows, caustics, and later effects as they land), in plain words, defaults marked;
   - **live caustic motion status** from `causState()`, in words: moving / paused, no input for 60 s (moves again when you move the mouse) / still, quality level not Full / still, this machine is slow (with a "Try again" that resets the back-off) / off;
   - a "Restore defaults" button.
2. Switches are per viewer (localStorage, like `tanklook.perf`), never scene data. A `?fx=` URL still overrides them. Apply changes live with `setFx`. Keep your storage in a new file (e.g. `src/render/fxPrefs.ts`) rather than rewriting `fx.ts`.
3. Find where the menu belongs: the central View menu, or the place the Performance setting lives now. If it's a judgment call, send Nathan a screenshot of each option and ask in your own chat.
4. Check the Auto behavior: on a reload, does the slow-machine back-off trip from page-load stalls before any input? If so, ignore frames during load / reveal and report it.
5. Tests for prefs round-trip, URL override, and the status wording.

## Files and collisions
- Lane VF-C2 is editing `src/render/fx.ts` and `src/render/viewer.ts` right now (adding switches `embed`, `mix`, `sand`):
  - touch them minimally (read `FX`, call `setFx`, call `causState()` / add a back-off reset method only);
  - build the effect list from `FX`'s keys plus a label table, so new switches show up without more edits.
- Lane LP1 is editing the left-panel show/hide and width code in `panels.ts` (around lines 1320-1360), `style.css` (#side) and `index.html`. Stay out of that region.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "GS1: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the test result and a screenshot of the menu. Stop your preview servers.
5. Never end a turn with anything running in the background.
