# DS1: Discovery switches only during Discover; only the switch toggles (Coordinator 22)

Follow `prompts/lane-common-c20.md`. First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "DX7" and "AB12", `src/ui/discover/switches.ts` and the `.dxsw` styles in `src/style.css`. Report to Coordinator 22; never push.

## Why
Nathan, about the "Discovery can change this" switches in the five creative menu headers (Tank, Substrate, Hardscape, Plants, Animals):
- they should only be visible while Discovery is open;
- today a click on the label text also flips the switch, because the whole row is one button.

## Task
1. **Hide outside Discovery.** Show the switches only while a Discovery session is open; find the live flag the A/B screen uses. Hide them otherwise, without unmounting or losing state. Their saved values (one home, saved with the project) are unchanged.
2. **Only the track toggles.** The label becomes plain text: it is not a click target and does not look clickable.
3. **Keyboard and screen readers.** The control stays keyboard operable with a correct `role="switch"` / `aria-checked`.
4. **Check other surfaces.** Find anything else that shows the same switches (the Discover panel, coach steps) and keep it consistent.

## Done when
- Tests: the switches are hidden when Discovery is closed and shown when it is open, a label click does nothing, and a track click flips the switch.
- ab* / dx* tests pass.
- The build is clean.
- Screenshots at desktop and 375 px with Discovery open and closed, in `research/screens/DS1/`; send the key ones to Nathan.
- A HANDOFF section.
