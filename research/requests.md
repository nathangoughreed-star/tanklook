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
| R2 | 11-12 | Hard angular dark shadow patches on sand (images/7.png) | VF-C2 | claude/confident-sutherland-a9c8ce 6a19630e | 1879 | **FAIL on Nathan's tank** (11-13, images/3.png: pale/dark angular patches still on the sand, seen from above) | back to VF-C2 (11-13): top-down repro, bisect by effect |
| R3 | 11-12 | Leaf litter standing up and hovering (images/8.webp) | VF-C2 | same | 1879 | **FAIL on Nathan's tank** (11-13, images/3.png: leaves on the right stand steep / hang) | back to VF-C2 (11-13) |
| R4 | 11-12 | HOB filter box clips through 3D backdrops (images/9.png) | CB1 | claude/cb1-cabinet-d26901 777b7745 | batch after 1872 | - | live shot; side-wall backdrops not covered |
| R5 | 11-12 | Discover: can pan but not zoom or orbit | BG1 | claude/bg1-discover-orbit-480dad 3376ea85 | batch after 1872 | - | live shot; zoom only partly reproduced, ask Nathan how he zooms (wheel / pinch) if it still fails |
| R6 | 11-12 | Split view: each side its own Habitat check, cost pill, Water chip | SV1 | claude/sv1-split-overlays-18cc33 1b8e5d1e | batch after 1872 | - | live shot; phone (390 px) split is crowded, follow-up |
| R7 | 11-12 | Name for the Habitat check tile (alternatives: Animal wellbeing, Welfare) | - | - | - | - | waits on Nathan |
| R8 | 11-12 | Hoses enter the cabinet through the back panel (audit #31) | CB1 | 22352e75 | yes | not verified: room wall hides the back of the stand | needs a camera behind the wall, or a cutaway shot |
| R9 | 11-12 | Weird substrate bug round rock bases, in HIS tank (audit #3) | VF-C2 | 1bfbc99f, fc1412f4 | yes | PARTIAL: test scenes fine, his own tank not available | ask Nathan for the scene (Scene data JSON) or recheck his screenshot case |
| R10 | 11-12 | Habitat tile / Map card float over the tank when the panel is collapsed (audit C, found, not asked) | - | - | - | - | ask Nathan if he wants it fixed |
| R11 | 11-10 | Quick-preferences "Don't want" section question (Coordinator 22) | - | - | - | - | may be stale after the Discover redesign; ask Nathan |

## Closed (seen on live)

| # | Ask | Live build | Screenshot |
|---|---|---|---|
| R1 | Habitat check tile starts minimized on every load | 1879 | C24 scratchpad live-R3-litter-low.png (stocked tank: tile shown as the minimized pill) |
| C1 | FX1: Discover pill above the Water chip; Checks a compact closed pill; plain Graphics settings labels | 1869 | Coordinator 24 scratchpad live-deskT.png / live-phoneT.png (2026-11-12); labels read from the live bundle |
