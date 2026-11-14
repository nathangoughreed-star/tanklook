# Lane SC: new shell cleanup: leftovers from steps 3-10 (Coordinator 24, 2026-11-14; UI2 §7; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S-lane template (HANDOFF "S1" to "S10", "S5", "S6", "S7").

## Base
origin/main, with S6 (Equipment) on it: check `git log origin/main --oneline --grep "^S6:"`. If S6 isn't there yet, base on `origin/claude/s6-equipment` merged onto origin/main.

## Job (behind ?ui=2 only). Each item gets a node test where there is logic, and a shot.
1. **Section links:**
   - S5 listens for `ui2:open`, while S6 sends `ui2:goto`. Use ONE event name, and honor `group`: the Heater row's "room 70 deg F, edit" opens Constraints > Your home, scrolled and open.
   - Every limit line in the shell (the Cost drawer, Equipment) uses it.
2. **Tank (S3 leftovers):**
   - the Kind control;
   - dimension labels pinned to the tank edges in the custom tank maker;
   - a shot of the Owned pill on a commercial tank row (S6 had no shot; the picker's open button wasn't found).
3. **Animals (S4 leftovers):**
   - "Copies..." in the Selection drawer;
   - the New animal size slider and life-stage buttons;
   - drag a species from the list into the tank;
   - AqAdvisor (`src/data/aqadvisor.json`) wherever the old UI showed it.
4. **Discover (S10):** verify Apply then Undo in the browser. The design must come back exactly the same (compare the scene JSON).
5. **Constraints / Preferences (S5):**
   - a Discover run with experience on (New to it) that leaves out a carpet plant and pressurised CO2, as a shot;
   - pictures for the two decorative style cards (castle, themed), rendered from the scene like the other cards;
   - map light gear to a gear kind for the experience gate.
6. **Equipment (S6):**
   - categories with no catalogue products still get a sub-menu, with Generic plus "Add one I own";
   - "Add one I own (any brand)" asks for a name and wattage / size where the engine needs it, instead of a bare Generic.
7. **Proof S6 couldn't take:**
   - the old UI showing the same heater chosen in `?ui=2`;
   - phone 390x844 shots of Equipment > Heater and Light;
   - the old site unchanged.

- **Your files:** `src/shell/**` and `src/shell/logic/**`, new tests, and small engine helpers with tests if needed (name them). Do not edit `panels.ts`.
- **Proof:** one shot per item at 1600x900 (plus phone where the item is on phone), under `research/screens/SC/`, and `facts.json` with no page errors.
- **Report:** list any item you could not finish, with the reason, instead of retrying for long.
