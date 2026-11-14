# Lane S11: phone and tablet pass on the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 11; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Read UI2 §1a and §6 (layout), shot `research/screens/UI2/02-editor-phone.png`, and HANDOFF "SC".

## Base
origin/main with SC on it: check `git log origin/main --oneline --grep "^SC:"`. If SC isn't there yet, merge `origin/claude/sc-cleanup` onto origin/main first.

## Job (behind ?ui=2 only)
1. **Go through every section** on a phone (390x844 and 360x780) and a tablet (768x1024 portrait, 1024x768 landscape): Tank (picker, custom tank maker, glass check), Scape, Plants, Animals, Equipment (each category, light map), Preferences, Constraints, Discover (every mode, This or that), Print, Settings, Compare, the file menu, the Get started checklist, and the drawers.
2. **Fix what breaks.** Already known:
   - on phone the check bar runs off the right edge, cutting off the water temperature (live build 2030). It should wrap, scroll, or shorten so every check is reachable.
   - dragging an animal from the list into the tank doesn't drop (SC's browser run). Fix it for mouse, and give touch a working path ("Add" then place, or a long press).
3. **Touch targets** at least 44 px. No horizontal page scroll. Sheets / drawers can be closed with one tap. Text never overlaps the viewer controls.
4. **Desktop at 1600x900 and 1280x720** must still look like the approved mockups.

- **Your files:** `src/shell/**` (CSS and component tweaks), new tests if logic changes. Do not edit `panels.ts`.
- **Proof:**
  - a contact sheet per device size (one image with every section) under `research/screens/S11/`, before and after;
  - a list of every fix with its shot;
  - `facts.json` with no page errors.
- **Report:** anything you could not fix, with the reason, instead of retrying for long.
