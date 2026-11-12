# Lane DQ11: Keep / Like / Dislike buttons (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ11: Keep / Like / Dislike". Wave 3 of the Discover redesign; lane DQ12 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 3, 7 (D4, D5, D10) and 8 (your row). Nathan ACCEPTED all decisions D1-D11.
- HANDOFF sections DQ6 (including Nathan's tank decision), DQ8 (the feedback API: add / remove entries), DQ10 (the in-editor Discover card) and AB9 / PS1 (locks). Grep by heading; never read HANDOFF.md whole.

## Task
1. Three icons everywhere (D10): **Keep this** (padlock), **Like**, **Dislike**. They appear:
   - on an item, in the selection popover and in the Animals / Plants / Hardscape lists;
   - on each category header;
   - on DQ10's preview card, for the whole design.
2. Keep = the existing locks; no new store. Default (D4) = identity + count: the piece or species stays and may move. "Pin position" also holds placement, through the lock `props`. A padlock badge shows on kept items, and hovering it says what is held.
3. Like / Dislike write DQ8 feedback entries at the right `level` (design / category / item):
   - clicking again takes it back;
   - Keep and Like / Dislike can sit on the same item;
   - a short confirmation says what was learned (for example "fewer pieces like this rock").
   - On request only, a chip row asks "what do you like?" (material / count / placement / look), which sets `attr`.
4. DQ10's card shows "N kept, M open" from the same locks. Check it updates live; the lane's own screenshot showed "0 kept" when a piece was kept.
5. Tests:
   - Keep writes a lock with the default props;
   - Pin position adds position;
   - Like / Dislike entries at each level, including take-back;
   - the kept count.

## Files
- Yours: `ui/discover/keep.ts`, the selection popover, the list / category-header renderers in `ui/panels.ts` (only those rows), a `.dq11-*` block in `style.css`.
- Not yours (DQ12): `ui/discover/inline.ts`, `ui/discover/logic.ts`, `scene/breadth.ts`, `ui/infeasibleCard.ts`. To put buttons on DQ10's preview card, expose a small render hook from your file and ask DQ12 (via the coordinator) to call it, or add one mount line in `inline.ts` and say so in your report.
- Screen questions to Nathan come with screenshots, asked in your own chat.

## Done
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "DQ11: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha, the result and screenshots: item popover, list row, category header and preview card. Stop your preview servers.
5. Never end a turn with anything running in the background.
