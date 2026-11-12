# Lane DQ13: retire the A/B Discover entry (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ13: Retire A/B Entry". Last lane of the Discover redesign. Nathan said "Start DQ13" on 2026-11-12.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 7 (D1, D8) and 8 (your row).
- HANDOFF sections DQ6 and DQ10-DQ12 (grep by heading; never read HANDOFF.md whole).

## Task (D1: hide the entry, keep the code)
1. The header **Discover** button (HM1: New / Open… / Save / Discover) opens the in-editor Discover card (DQ10), not the A/B screen. Every other way into A/B goes there too: the `ui/discover/entry.ts` routes, startup / resume (SL2) and any links.
2. An optional **"Compare 2-3"** view in the Discover card (D1, D8):
   - it shows the current preview beside 1-2 back-list previews;
   - you pick one to keep previewing, then Apply as usual;
   - no voting, no learning from the pick beyond a Like entry on the picked design (DQ8 API).
   If reusing the A/B side-by-side renderer is cheap, use it; otherwise use simple thumbnails.
3. The A/B code stays (`ui/ab/*`, `discoverySession`, `pairGen`), with no route to it except `?ab=1` for debugging. Its tests keep running.
4. A saved A/B session (SL2 resume) no longer reopens A/B. It opens the editor, with Discover's card available.
5. Docs: update the HANDOFF "Start here" lines that describe Discovery as the A/B screen, and any in-app help text ("How to use").
6. Tests:
   - the header Discover button opens the card;
   - `?ab=1` still reaches A/B;
   - resume no longer lands in A/B;
   - Compare picks a preview without writing the design.
7. Screenshots sent to Nathan in your chat: header Discover → card, the Compare view.

## Files
- Yours: `ui/discover/entry.ts`, `ui/discover/inline.ts` (Compare view), the header Discover wiring, `ui/ab/*` (entry guard only), a `.dq13-*` block in `style.css`.
- No other lanes are running right now.

## Done
1. Run `npm run build` and the full vitest in the foreground with a 600 s timeout, re-running any failing files alone.
2. Add your HANDOFF section "DQ13: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha and the result. Stop your preview servers.
5. Never end a turn with anything running in the background.
