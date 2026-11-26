# Unshipped-work sweep, 2026-11-26

Nathan asked for a thorough sweep for finished work that never reached main (origin/main at build 2832, 527c2e46).
Read-only: nothing was merged, deleted or pruned.

## What was checked

| Place | Count | Result |
|---|---|---|
| Shared folder, uncommitted edits | 9 files | 1 real (HOB on slanted tanks); the other 8 are stale copies of work already on main, or local config |
| Shared folder, local-only commits | 7 | all on main under other shas, or superseded by later commits |
| Shared folder, untracked | 769 files | competitor research is on main byte for byte; the rest is scratch, outbound ChatGPT snapshots, or old lane briefs |
| Stash | 1 (2026-10-19 autostash) | all 3 code changes are on main |
| Worktrees | 340 | 304 clean, nothing unmerged; 22 in emptied Temp scratchpads (files gone, commits kept on branches); the rest listed below |
| Branch tips not merged into origin/main | 435 | 21 add nothing; 274 have >= 90 % of their added lines on main; 100 had every commit re-land under a new sha; ~40 checked by hand |
| Chat transcripts | "haven't committed", "not committed", "left uncommitted" | each idle hit read; listed below where the work is still off main |

Method for branches: `git merge-tree` against origin/main, then the share of each branch's added lines (>= 12 chars) present in
origin/main's copy of the same file, then commit subjects matched against origin/main's log, then hand checks with `git grep`.

## Off main: real work, by priority

| # | Work | Where | Chat | State |
|---|---|---|---|---|
| 1 | **Perf: lighting uniform arrays as flat Float32Arrays.** About half the CPU frame on Planted community (16.8 -> 9.0 ms, 10.7 -> 5.2 ms) | `claude/quizzical-pasteur-e02470` 734eea00 | Planted community lag (local_fe41b2d8) | waiting since 2026-11-25 on Nathan's yes to push |
| 2 | **Batch b6: 19 build-B fish** (115 files) plus fin classes for 16 + panda cory, and pipeline fixes: `sat_lin` hue-keeping saturation, near-black fish masks (`--mask-thr 12`), Corydoras belly bound, CPD fin hue | `claude/glbfish-e5` (8 commits after its 11-24 merge), `claude/intelligent-pike-038994`, `claude/cranky-borg-04a29e`, `claude/awesome-volhard-f67d0f` (shader sheen, "held for Nathan's yes") | Batch B6 (local_ae85410c) and its three children | "merging waits on Nathan" (HANDOFF-batch-b6.md). b7/b8 were built on main without these fixes |
| 3 | **Price sweep 2026-11-23**: 145 price changes, 3 sales, 19 dead links in `src/data/tanks.json` | `price-sweep-2026-11-23` 477d7083 | Weekly tank price sweep (local_de9607f4) | report never delivered: the coordinator it was told to report to is archived. Last sweep on main is 11-16 |
| 4 | **HOB filter on odd polygon / pie tanks**: `hobPane()`, the gear-side back pane, square to it | shared folder, uncommitted: `src/render/gear/common.ts`, `filter.ts`, `src/render/gear3d.ts` | HOB filter defaults for polygon tanks (local_032ed07b) | unverified: screenshots never came back, chat idle since 11-25 |
| 5 | **R145 air gulping**: roster research + surface trip in the swim sim (`swimGulp.test.ts`) | `claude/r145-air-gulping-752836` 9990c595 | unknown | unmerged since 11-24 |
| 6 | **R143 backfill batch 1** (endler, convict, peacock gudgeon, rainbow shark, red-tail shark): FishBase length-weight, sold-by-sex, substrate/needs | `claude/vigilant-cori-0f54f0` 9f52e496 | RX2 / C28 | partly on main (bodymass, provenance lines missing) |
| 7 | BR unit 1 (animals notice each other) | `br-behavior-relations` (2 commits + 3 dirty files) | BR (local_13de2767) | lane idle since 14:43, waiting on a background run that never reported |
| 8 | HV units 2.2-2.3 (judgment-only rules never red, Fix-it in one undo) | `hv-honest-verdict` (2 commits) | HV (local_1313b42b) | lane idle since 15:04, waiting on a screenshot run |

## Off main on purpose (no action unless Nathan wants it)

- R147 colour forms (`claude/fervent-agnesi-dabc03`, `claude/color-types`): paused by Nathan 2026-11-25, "species first".
- `claude/fish-lesson-ratchet`, `b7-build`: today's, in progress.
- Experiments: label-map build (`claude/labelmap-build-8b4a9b`), orchid dottyback painter (`claude/fishpainter-d`), GS2 solver mocks, A3 arthropod candidate ("superseded"), `enclosure` ("WIP, on hold").
- October leftovers whose features later landed in another form: `wizard` (lane KW; guided setup replaced it), `px`, `backup/shared-main-2026-10-30` (owned-gear start menu; now the guided Equipment step), `s222` / `su` preservation commits.
- TL1 R134/R135 bundle-lid branch: lid handling exists on main in other files. Not traced line by line.

## Safe, nothing lost

- Shared folder `deals.json` (11-16 repricing; KD2 re-read it live 11-18), `equipmentStep.ts`, `fullnessTile.ts`, `techMenu.ts` and `style.css`: all on main in a later form.
- `.claude/launch.json`: only dev-server entries.
- `handoff/chatgpt-batch1` (+ zip, 30 MB) and `handoff/chatgpt-ember`: outbound code snapshots sent to ChatGPT.
- `aquascape/`: a clean clone of a public reference repo.
- Fable answers F1-F7: on main.
- `prompts/lane-*.md` (45 untracked Oct lane briefs) and `agentC/plant-audit-*.json`: history only, not on main.

## Housekeeping the sweep turned up

- 340 worktrees and 677 local branches make every sweep slow. 22 worktrees point at emptied Temp scratchpads and can be pruned.
- The weekly price-sweep task reports to an archived coordinator, so it will fail the same way next week.
