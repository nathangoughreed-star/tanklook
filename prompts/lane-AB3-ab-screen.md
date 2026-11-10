# Lane AB3: A/B Discover Screen (Discovery v2, Coordinator 21, 2026-11-09)

Start with `prompts/lane-AB-common.md`. Spec sections for you: 3, 5.2-5.3, 6.3-6.4, 8, and every journey.

## Build
The Discover screen becomes the A/B compare and replaces DX4's proposal-card UI. `openDiscovery` / `registerDiscovery` (`src/ui/discover/entry.ts`) stay the one entry point every Discover button uses.

1. **Wiring:**
   - AB0 (session), AB1 (pairs) and AB2 (history) are being built in parallel. Start against `src/scene/discoveryTypes.ts` with a small fake adapter, `src/ui/ab/fake.ts`, that makes two records from the current scene.
   - As those lanes land, run `git merge origin/main` and swap in the real modules.
   - If one hasn't landed when you are otherwise done, report anyway and say which fake remains.
2. **Cards.** Two side by side on desktop. At 375 px, an A/B toggle with the metrics strip always visible. Each card shows:
   - a picture: the viewer shot path DX4 uses (`previewShot`), drawn from the snapshot;
   - title, habitat and gallons;
   - new spend, which leads the numbers;
   - weekly minutes and difficulty;
   - an expandable quick sheet: stocking with counts, plants, hardscape, substrate, equipment (must use / reused at $0 / to buy with prices), monthly cost, checks status, and what differs from the other card.
   - Estimates read "about".
3. **Choosing:**
   - Buttons: Prefer A, Prefer B, Like both, Like neither, Skip.
   - After an A or B choice, optional reason chips (`ReasonKey`) appear. They never block the next pair.
   - An "Explore Something Different" action.
   - Label the champion clearly: "Your favourite" vs "Challenger". On a fresh pair: "Fresh pair: the winner then faces your favourite".
4. **Keep / Lock from either card:**
   - A button on each stocking row and each object, AND drag onto the menu's Locked group. Reuse `ui/discover/keep.ts`.
   - Animals default to "exactly N", with the existing switch to "at least" or "species only" (plan decision 2).
   - If something kept conflicts with the champion, re-check the champion and say so.
5. **Temporary freezes:**
   - The shuffle checkboxes are the five DX7 menu switches ("Discovery can change this"). Unchecking one freezes the champion's values for that tab.
   - Each card has "Keep A's <tab> for now", which freezes that card's values (AB0 `freeze` with a source).
   - Show the frozen source next to the switch, e.g. "Hardscape: kept from A".
6. **History drawer** at the bottom:
   - Every shown candidate, with thumbnails and paging.
   - Opening one shows it read-only, with "then" vs "now" (AB2 `reEvaluate`).
   - Actions: Favourite, Bring back as challenger, Set as favourite, and "Import this <tab>" with validation and the user's consent.
7. **Make It Yours**, on any card or history item:
   - Show a diff preview, including changes outside the scope and gear to buy.
   - Conflicts offer "Adapt" (AB1 `adapt`, which makes a new record) or "Not now".
   - On accept, run `applyProposal`: one undo step, never locks, existing locks kept.
   - Then close discovery, leaving the session resumable.
8. **Other states:**
   - A no-solution panel listing conflicts and relaxations.
   - When resuming after manual edits: "Continue (re-check)" or "New session".
9. **Retire** the DX4 proposal-card list with Apply / Reject, and the Explore like/pass feed with its "Explore complete setups" entry. Point every caller at the A/B screen; re-grep for them. The engines in `src/explore/` stay.
10. **Tests and checks:**
   - `test/ab3.test.ts`, with the pure logic in `src/ui/ab/logic.ts`.
   - Browser-check journeys A, B, F and G.
   - Screenshots at desktop and 375 px: the first pair, a quick sheet open, the reasons, the history drawer, Make It Yours with conflicts, and no-solution.

## Owns
`src/ui/discover/*`, NEW `src/ui/ab/*`, the Discover hooks in `panels.ts`, the entry points in `src/ui/explore/*`, and their CSS.
