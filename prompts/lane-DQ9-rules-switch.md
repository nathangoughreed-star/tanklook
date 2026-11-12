# Lane DQ9: Guided / Sandbox rules switch (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ9: Guided / Sandbox Switch". Wave 2 of the Discover redesign; lane DQ10 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 5, 7 (D7, D11) and 8 (your row). Nathan ACCEPTED all decisions D1-D11.
- HANDOFF sections DQ6, DQ8 and ST1 (grep by heading; never read HANDOFF.md whole).

## Task
1. Add a saved field `brief.project.rules: 'guided' | 'sandbox'`:
   - default `guided`;
   - old saves load as `guided`; validate it in `scene/validate.ts`.
2. Add a Guided / Sandbox toggle in the header. Keep it compact: the header is New / Open… / Save / Discover (HM1).
3. Three readers of the field:
   - the picker gate (`ui/pickerStrict.ts`): Guided grays out species that would add a Caution / Problem, as today; Sandbox allows anything;
   - the Checks strip wording: the same checks in both modes, but Sandbox says they are information only;
   - the Discover candidate filter (D7): Sandbox Discover is still welfare-safe, with the same gates as Guided, but may ignore budget, care time and experience limits. Expose that as a function DQ10 calls (e.g. `discoverGates(rules)`). Don't wire it into DQ10's preview code.
4. Switching Sandbox to Guided on a design that breaks gates (e.g. an overcrowded tank):
   - show the violations from `verdictOf` and offer `solve` fixes, one at a time;
   - never delete or change anything automatically.
5. Tests:
   - default and migration;
   - picker gating by mode;
   - Sandbox Discover gates;
   - the switch keeps the design byte-identical.

## Files
- Yours: `scene/brief.ts` (only your field), `scene/validate.ts`, `ui/startMode.ts`, `ui/pickerStrict.ts`, the picker call in `ui/panels.ts`, the header toggle, a `.dq9-*` block in `style.css`.
- Not yours (DQ10): `ui/discover/*`, `scene/candidates.ts`, `scene/store.ts`.
- Screen questions to Nathan come with screenshots, asked in your own chat.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "DQ9: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the result and a screenshot of the toggle. Stop your preview servers.
5. Never end a turn with anything running in the background.
