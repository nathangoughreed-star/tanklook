# Lane DQ12: breadth presets, conflict card, tank default (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ12: Breadth + Conflicts". Wave 3 of the Discover redesign; lane DQ11 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 4, 7 (D2, D3, D7, D9) and 8 (your row). Nathan ACCEPTED all decisions D1-D11.
- HANDOFF sections DQ6 (including Nathan's tank decision), DQ7, DQ9 and DQ10. Grep by heading; never read HANDOFF.md whole.

## Task
1. **Tank kept by default (Nathan 2026-11-12):** "Finish my setup" never changes the tank unless the user has unlocked it, even when the Tank tab is checked. This refines D2.
   - Make the rule visible on the card (e.g. "Tank: kept, unlock to let Discover change it").
   - The generation path is DQ7's `finishSetup` (tank out of scope, look adapted with `adaptToTank`).
2. **DQ9 gates:** replace DQ10's `discoverGates()` stub in `ui/discover/logic.ts` (it returns 'guided', with a TODO naming DQ9) with DQ9's real `discoverGates(rules)`. Sandbox Discover stays welfare-safe and may ignore budget, care time and experience limits (D7).
3. **Breadth (D3):**
   - three presets, Explore / Remix / Refine, over one `breadth` number in `scene/breadth.ts`;
   - no slider;
   - the starting preset is inferred (more kept means Refine), and the user's pick then sticks for the session.
   - Show "N designs fit" / "Only this one fits".
4. **Conflict card (D9):**
   - when no design fits, list each conflict in plain words and the smallest relaxations, one button each;
   - apply them one at a time, each re-checked, never as a bundle;
   - it replaces DQ10's minimal no-fit text, using `noSolution` and `ui/infeasibleCard.ts`.
   - Example to test: a kept 20 gal tank plus a kept Oscar.
5. Tests:
   - tank untouched by Finish my setup unless unlocked;
   - gates by mode;
   - preset mapping and inference;
   - the conflict card's relaxations applied one at a time;
   - kept items never broken.

## Files
- Yours: `ui/discover/inline.ts`, `ui/discover/logic.ts`, `scene/breadth.ts`, `ui/infeasibleCard.ts`, a `.dq12-*` block in `style.css`.
- Not yours (DQ11): `ui/discover/keep.ts`, the selection popover, list and header rows in `ui/panels.ts`. DQ11 may add one mount line in `inline.ts` for Keep / Like / Dislike on the preview card; keep both sides on rebase.
- Screen questions to Nathan come with screenshots, asked in your own chat.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "DQ12: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the result and screenshots: the presets, "N designs fit" and the conflict card. Stop your preview servers.
5. Never end a turn with anything running in the background.
