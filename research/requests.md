# Nathan's requests: open until seen on live

Started 2026-11-12 by Coordinator 24 (Nathan: "my concern is forgotten or lost work I already instructed a chat to fix").

Workflow (Nathan 2026-11-13): every new fix or feature goes through the coordinator. The coordinator adds the row here FIRST, then starts the lane (its own worktree, its own branch, backed up to GitHub). Each row carries an "Expected by" point (the build or event after which it SHOULD be live). The coordinator sweeps the list whenever one of those points passes, i.e. on: a lane report, a deploy landing after a push, every "check", and the start of each coordinator turn from Nathan. Sweep = `bash scripts/unmerged.sh`, then each open row whose point has passed is shot on tanklook.com; unfixed rows go back to their lane or a new one. No timers or polling (global rule): the sweep rides on those events.

Rules:
- Every instruction Nathan gives the coordinator gets a row BEFORE a lane starts. Instructions he gives other chats directly (hand-started) get a row at the next "check".
- A row closes ONLY when the coordinator has looked at it on tanklook.com: the live build number plus a screenshot file. Then move it to "Closed". "Merged" is not closed.
- Fill each column as the work moves: chat, then branch / sha (lanes push their branch to GitHub after every commit), then merged build, then live check.
- At every "check": run `bash scripts/unmerged.sh`, then walk this table top to bottom.
- Older detail: `research/audit-2026-11-12.md` (AU1 + FX1 columns). Rows there that are still PARTIAL / NOT CHECKED are copied below.

## Open

| # | Asked (date) | Nathan's ask (short) | Chat | Branch / sha | Merged (build) = expected live by | Live check | Next step |
|---|---|---|---|---|---|---|---|
| R2 | 11-12 | Hard angular dark shadow patches on sand (images/7.png) | VF-C2 | claude/confident-sutherland-a9c8ce 6a19630e | 1879 | **FAIL on Nathan's tank** (11-13, images/3.png: pale/dark angular patches still on the sand, seen from above) | VF-C3 31b23ba4 (contact grid 21 + depth offset) in build 1884: live shot from his tank's camera after deploy |
| R3 | 11-12 | Leaf litter standing up and hovering (images/8.webp) | VF-C2 | same | 1879 | **FAIL on Nathan's tank** (11-13, images/3.png: leaves on the right stand steep / hang) | VF-C3 31b23ba4 (leaf brush rests on the drawn sand, 10 deg / 3 mm) in build 1884: live shot after deploy |
| R7 | 11-12 | Name for the Habitat check tile (alternatives: Animal wellbeing, Welfare) | - | - | - | - | waits on Nathan |
| R8 | 11-12 | Hoses enter the cabinet through the back panel (audit #31) | CB1 | 22352e75 | yes | 11-13 wall hidden, from behind (sw-R8-behind.png): canister hoses run down OUTSIDE the back panel nearly to the floor, no visible entry hole | ask Nathan; likely back to CB |
| R9 | 11-12 | Weird substrate bug round rock bases, in HIS tank (audit #3) | VF-C2 | 1bfbc99f, fc1412f4 | yes | PARTIAL: test scenes fine, his own tank not available | ask Nathan for the scene (Scene data JSON) or recheck his screenshot case |
| R10 | 11-12 | Habitat tile / Map card float over the tank when the panel is collapsed (audit C, found, not asked) | - | - | - | - | ask Nathan if he wants it fixed |
| R11 | 11-10 | Quick-preferences "Don't want" section question (Coordinator 22) | - | - | - | - | may be stale after the Discover redesign; ask Nathan |
| R12 | 11-13 | Map button out of the viewer's lower left, into the View menu | HM3 | - | - | - | lane started |
| R13 | 11-13 | Undo / Redo / Save off the viewer; only at the top of the left menu | HM3 | - | - | - | lane started |
| R14 | 11-13 | Discover button off the viewer; only in the left menu | HM3 | - | - | - | lane started |
| R15 | 11-13 | Split view: shared controls (View, Another moment) in one cluster top-middle between the views | HM3 | - | - | - | lane started |
| R16 | 11-13 | Split view: a "Notes" section per side with that tank's warnings | HM3 | - | - | - | lane started |
| R17 | 11-13 | Split tab ("A  Stocking 58% ▾"): should highlight the differences between the two tanks | - | - | - | - | asked Nathan: today it only shows "N diffs" when the setups differ, the list on hover |

## Closed (seen on live)

| # | Ask | Live build | Screenshot |
|---|---|---|---|
| R5 | Discover: orbit works while a preview shows (zoom: Nathan's case only partly reproduced; reopen if he still can't zoom) | 1880 | BG1 live-2-preview-showing-wheel/orbit.png: Map 90° left -> 144° left with the Dutch Garden preview up (11-13) |
| R6 | Split view: each side its own Habitat check, cost pill, Water chip | 1879 | Nathan's own live screenshot images/4.webp (11-13) |
| R4 | HOB filter box no longer clips through a 3D backdrop (Nathan's tank, rock) | 1879 | C24 scratchpad sw-R4-hob-rock.png (11-13) |
| R1 | Habitat check tile starts minimized on every load | 1879 | C24 scratchpad live-R3-litter-low.png (stocked tank: tile shown as the minimized pill) |
| C1 | FX1: Discover pill above the Water chip; Checks a compact closed pill; plain Graphics settings labels | 1869 | Coordinator 24 scratchpad live-deskT.png / live-phoneT.png (2026-11-12); labels read from the live bundle |
