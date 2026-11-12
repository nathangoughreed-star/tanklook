# Lane DQ10: Discover as an in-editor preview (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ10: In-Editor Discover". Wave 2 of the Discover redesign; lane DQ9 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 0, 2, 4, 6, 7 (D2, D8, D9) and 8 (your row). Nathan ACCEPTED all decisions D1-D11.
- HANDOFF sections DQ6, DQ7 (the candidate API: `nextCandidates`, `finishSetup`, handOff `mode:'fill'`), DQ8, AB9 and PS1 (grep by heading; never read HANDOFF.md whole).

## Task
1. Discover becomes a **non-freezing preview overlay on the live editor**:
   - render through `effTank` / `previewShot`, and do not set `Store.frozen`;
   - the A/B screen stays as it is and stays reachable (D1).
2. Actions in the editor:
   - **Finish my setup** (everything not kept, within the checked tabs, D2);
   - **Fill this section** (the `complete` objective on one tab);
   - **Regenerate**;
   - **Apply**.
   - Before generating, show a count such as "3 kept, 12 open".
3. D8:
   - the preview writes nothing to the design;
   - Regenerate replaces the preview;
   - the earlier previews stay in a short back list for the session;
   - Apply goes through `applyProposal`, as ONE undo step.
4. If the design changes while a preview is open (manual edit, undo), the preview is stale: mark it, and refresh it or drop it. Never apply a stale preview.
5. When no design fits (D9), show the conflicts and the smallest relaxations, one button each, applied one at a time and re-checked after each. Use the existing `noSolution` data. A full conflict card is DQ12's job, so keep this minimal.
6. Use DQ9's mode gates through a single function call. If DQ9 hasn't landed yet, use the Guided gates and leave a one-line TODO naming DQ9.
7. Tests:
   - preview writes nothing;
   - Apply is one undo step;
   - stale preview refused;
   - kept items untouched;
   - A/B unchanged.

## Files
- Yours: new `ui/discover/inline.ts`, `ui/discover/logic.ts`, `scene/candidates.ts` (small additions only), `scene/store.ts` (read only, plus a preview hook if unavoidable), a `.dq10-*` block in `style.css`.
- Not yours (DQ9): `scene/brief.ts`, `ui/startMode.ts`, `ui/pickerStrict.ts`, header.
- Screen questions to Nathan come with screenshots, asked in your own chat.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "DQ10: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the result and screenshots: before generating, the preview, and after Apply. Stop your preview servers.
5. Never end a turn with anything running in the background.
