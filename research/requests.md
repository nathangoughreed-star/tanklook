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
| R7 | 11-12 | Name for the Habitat check tile (alternatives: Animal wellbeing, Welfare) | - | - | - | - | waits on Nathan |
| R8 | 11-12 | Hoses enter the cabinet through the back panel (audit #31) | CB1 | 22352e75 | yes | 11-13 wall hidden, from behind (sw-R8-behind.png): canister hoses run down OUTSIDE the back panel nearly to the floor, no visible entry hole | ask Nathan; likely back to CB |
| R9 | 11-12 | Weird substrate bug round rock bases, in HIS tank (audit #3) | VF-C2 | 1bfbc99f, fc1412f4 | yes | PARTIAL: test scenes fine, his own tank not available | ask Nathan for the scene (Scene data JSON) or recheck his screenshot case |
| R10 | 11-12 | Habitat tile / Map card float over the tank when the panel is collapsed (audit C, found, not asked) | - | - | - | - | ask Nathan if he wants it fixed |
| R11 | 11-10 | Quick-preferences "Don't want" section question (Coordinator 22) | - | - | - | - | may be stale after the Discover redesign; ask Nathan |
| R15 | 11-13 | Split view: shared controls (View, Another moment) in one cluster top-middle between the views | HM3 | - | - | - | lane started |
| R18 | 11-13 | Rolling water shadows (caustics) and surface ripples about twice as fast; maybe a setting | VF8 | - | - | - | lane started; no setting (Nathan 11-13: "Just double it") |
| R19 | 11-13 | Aquarium-only live site: hide terrarium / paludarium / herp features (code kept, one switch) | AQ1 | df572949 + c0bc3102 | 1898 (queued behind the 1896 deploy) | - | live shot of New habitat + Animals; African dwarf frogs stay (Nathan 11-13), AQ1 follow-up |
| R20 | 11-13 | Visual styles direction (decorative / themed / hybrid): audit + first slice, per research/design/styles-direction-2026-11-13.md section 20 | DS1 | 1eeb761e | doc only | - | Nathan 11-13: approved 1-4, 7-10; 5 = one Decor category (no per-ornament buttons); 6 rejected |
| R21 | 11-13 | Pirate-tank first slice (ornament kind, ship + chest, themed-scene recipe); visual proof sheet first | DS2 | - | - | - | stop 1 sheet 980778cd: Nathan 11-13 "Fix my notes first" (sail tears, size S/M/L default ~10 in, duller gold, less boxy castles, sail curve); stop 1b e26d4ec4 APPROVED by Nathan 11-13; stop 2 (recipe, prices, Decor, tests) started; stop 2 f7b7b0cb merged 51ed3ffe (recipe partial, Decor category, prices, tests B/H/I + looks snapshot); live check pending; chest often hidden by tall plants -> Nathan 11-13 "Yes, fix it": DS2 keeps ornaments clear of tall plants; stop 2b visibility fix 35d3fa78 merged 75049d62 (ornaments get a clear front lane; chest in the open) |
| R22 | 11-13 | Plant sway half the amplitude | Coordinator 24 (one constant, PLANT_SWAY_AMP 0.5 in render/viewer.ts) | - | pending push | - | Nathan's look on live (motion can't be shot) |
| R23 | 11-13 | Lid clips: one middle clip per long side up to 48 in (was two above 31.5 in) | Coordinator 24 (MID_CLIPS_2 = 1220 mm, render/lidClips.ts) | - | pending push | - | live shot of a 36-48 in rimless tank with a glass lid |
| R24 | 11-13 | Turn off automatic quality changes (keep the code) | Coordinator 24 (AUTO_QUALITY = false, render/perf.ts; caustics back-off off; a self-lowered saved level is restored; Auto checkbox hidden) | - | pending push | - | Nathan: quality and moving caustics stay on |
| R25 | 11-13 | Suction-cup gear sticks only to glass (moves off a 3D background to a side pane); drop checker away from the CO2 diffuser | GM8 | gm8-suction-mounts a53ba72f | merged fb945055 | live check pending | shots reviewed (after-rock-34, -34r); not verified: manual drag in the live UI, 3D backdrop on bow / poly tanks; brief prompts/lane-GM8-suction-mounts.md; picture research/screens/GM8/nathan-before.webp; Nathan 11-13 follow-up: heaters only vertical or horizontal, no diagonal (GM8 shot had one at ~45 deg on side glass) -> GM8b 112d87b3 merged 727726a4 (upright or flat only; saved tilts snap; Shift+wheel flips) |
| R26 | 11-13 | Split the left menu's "Constraints and preferences" into two sections: Preferences and Constraints | CP1 | claude/brave-swirles-657683 a54583f1 | merged 1d35e795 | live check pending | shots reviewed (research/screens/cp1); brief prompts/lane-CP1-split-constraints-prefs.md |
| R27 | 11-13 | UI rebuild: keep the engine, design a new UI on paper, new shell beside the old behind a switch. Step 1 inventory (UI1, Sonnet), step 2 screen-map proposal with mockups for Nathan (UI2, Opus, starts when UI1 reports) | UI1 then UI2 | - | - | - | Nathan 11-13 "I would like you to start that, yes"; brief prompts/lane-UI1-ui-inventory.md. UI requests to the OLD shell should pause once UI2 is approved |

## Closed (seen on live)

| # | Ask | Live build | Screenshot |
|---|---|---|---|
| R2 | Sand shards around the wood (Nathan's tank) | 1901 | C24 leaf-1896-his.png (live 1901, his camera) |
| R3 | Leaf litter / leaf-brush pile lies flat (Nathan's tank) | 1901 | C24 leaf-1896-low.png (live 1901, el 4 deg) + leaf-1896-his.png |
| R12 | Map button off the viewer | 1901 | C24 leaf-1896-low.png (no Map button) |
| R13 | Undo / Redo / Save off the viewer | 1901 | C24 leaf-1896-low.png (toolbar: arrow, View, Another moment only) |
| R14 | Discover pill off the viewer | 1901 | C24 leaf-1896-low.png |
| R16 | Notes pill per tank (single view seen; split per-side seen in HM3 shots) | 1901 | C24 leaf-1896-low.png ('Notes: 1 advice') |
| R17 | Split tab differences: no change, Nathan 11-13 "Hover is fine" (the tab shows "N diffs", the list on hover) | - | - |
| R5 | Discover: orbit works while a preview shows (zoom: Nathan's case only partly reproduced; reopen if he still can't zoom) | 1880 | BG1 live-2-preview-showing-wheel/orbit.png: Map 90° left -> 144° left with the Dutch Garden preview up (11-13) |
| R6 | Split view: each side its own Habitat check, cost pill, Water chip | 1879 | Nathan's own live screenshot images/4.webp (11-13) |
| R4 | HOB filter box no longer clips through a 3D backdrop (Nathan's tank, rock) | 1879 | C24 scratchpad sw-R4-hob-rock.png (11-13) |
| R1 | Habitat check tile starts minimized on every load | 1879 | C24 scratchpad live-R3-litter-low.png (stocked tank: tile shown as the minimized pill) |
| C1 | FX1: Discover pill above the Water chip; Checks a compact closed pill; plain Graphics settings labels | 1869 | Coordinator 24 scratchpad live-deskT.png / live-phoneT.png (2026-11-12); labels read from the live bundle |
