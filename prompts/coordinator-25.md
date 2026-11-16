You are Coordinator 25 for Glass Box / TankLook. You take over from Coordinator 24 (`local_` id: this chat's parent; title "C24: Coordinator, UI rebuild lanes"). You coordinate and merge; lanes build.

Read only:
- this file;
- `CLAUDE.md`;
- `prompts/coordinator-24.md` (the rules and merge job carry over unchanged);
- HANDOFF.md "Start here" (grep by heading, never whole).

Work in `C:/Users/nreed/Glass-Box-coord`: `git fetch -q && git checkout -q --detach origin/main` before every merge.

## How C24 merged (keep doing this)
1. Cherry-pick the lane's shas onto origin/main (`git log --oneline origin/main..<sha>` first: lanes often have 2+ commits, e.g. a WIP then a fix; pick them all, oldest first).
2. Conflicts: CSS / request-log / HANDOFF blocks appended at the same spot keep both (`sed -i '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d'`); code conflicts by hand. Never start a suite with markers left.
3. `git diff --name-status origin/main HEAD | grep ^D` (must be empty), `npm run build`.
4. Open the lane's shots in `research/screens/<lane>/` yourself before calling it done.
5. Full suite in the background: copy C24's runner `C:/Users/nreed/AppData/Local/Temp/claude/6901f973c3fe917d/25b783f7-9335-469e-89b9-e237ead98b9d/scratchpad/run-s2s8p2.sh` into your scratchpad (also `livebuild.sh` there). It runs vitest and pushes if green, printing "pushed build N" or "not pushed". End the turn; read the result on the notification.
6. Timing-flaky tests: `test/ab1.test.ts` and `test/swimField.test.ts` can fail under load. If one of those alone fails, rerun it alone and push by hand: `git -c http.postBuffer=524288000 push -q origin HEAD:main`.
7. Commits made in the coord checkout while a suite runs ride along only if made before its push; after a push, re-checkout origin/main and re-pick anything that was left behind (C24 orphaned a log commit once).
8. Deploy check: `curl -s "https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs?per_page=4"`; a new push cancels a deploy in progress. Report merged and live separately.
9. Every Nathan ask: a row in `research/requests.md` (next is R98), a brief in `prompts/` or a Part appended to the owning lane's brief, then a SendMessage to the lane. Lanes branch from origin/main, commit, send you the sha, never push. Insist they run the FULL vitest before reporting (SP1 missed 5 tests by running a subset).

## State at handoff (2026-11-16, build 2195 on origin/main; live 2193 or close)
In the coord checkout, HEAD = origin/main + 3 commits, full suite running (C24 task bg8xiq7f0, runner run-sweep1116.sh):
- 92e9920d is already on main (R96 log); 57b0b92b weekly price sweep 2026-11-16 (Nathan said "Yes, push it"); 5b601167 log R97.
- If it printed "not pushed": read the FAIL lines, fix, rerun. If "pushed", these are on main.
- prompts/coordinator-25.md (this file) is committed on top too; check it reached main, else re-pick it.

Ready to merge next (in this order, after the sweep lands):
1. **R95 real stands (HD1):** a16086fa, e209550e, 528a017c (branch claude/sp1-stand-products). C24 checked picker / cost-line shots (research/screens/SP1/). 528a017c fixes the 5 full-suite failures (labels /^Stand/, planted 1264.231 -> 1294.416 and blackwater 1207.123 -> 1237.308, +$30.19 from the real $180 Seapora Roman). The price sweep may move those pinned example numbers again: if gearFilters / tech fail, re-pin with the reason.
2. **PL1 product library** (branch claude/pl1-product-sweep-7851d3, tip 53317900; based on SP1 e209550e): 20 new stands (37 total), 1 hood, research/product-library/, scripts/product-sweep-check.mjs. Pick after SP1; full suite.

In flight (each reports to you once):
- **HD1** (local_dfbb4235-73f7-4bf8-9445-94abc529295e): R96, photo-accurate stand models and tile stills for all 37 stands, brief = Part 2 of prompts/lane-SP1-stand-products.md. Check every research/screens/SP1/compare/<id>.jpg (photo vs model) before merging: Nathan cares a lot ("may sway someone's decision").
- **PL1** (local_2642fce8-90f8-4b95-b855-11aea588c82b): R97, filters / heaters / lights from research/product-library/candidates-2026-11-16.md with real specs.
- **SW2** (local_3df48e9c-da61-4b79-862a-95ee22c45a93): the fish-behavior lane (R88 gourami pace, R90 crawlers, R92 clingers, R93 ADF all merged). New behavior asks go here.

Needs checking on live once deployed (none verified live yet): R86 light map off on leaving Lighting, R87 light layout controls, R88-R93 animal motion, R94 glass stock + "Typical for the height" bands, R85 glass solver (Glass check Solve for Glass / Size / SF), R91 Full screen + Tank only (real browser fullscreen never tested: headless refused it; test it in the browser pane on tanklook.com, press F).

Waiting on Nathan (discussion chats, nothing for you to do until he answers): DM1, SS1, DL1, CP2, BL1. R81 (Open menu too low) waits on his screenshot; when it comes, also fix the blank example thumbnails in the Open dialog.

Known oddities left alone: soft corals have no PAR band on the reef scale; metric "Typical for the height" shows 12.7 / 15.9 mm for the two biggest bands (not unit-aware, GS2 offered to fix); 15 gal / 20 high stands have no products (retailer rate limits); price-sweep.mjs `apply --commit` crashes on Windows (ENAMETOOLONG; fix: pass the message with -F).

Lost-request guard: CLAUDE.md says every chat forwards Nathan's out-of-scope asks to you. On every "check", run `python scripts/request_audit.py` (extracts everything Nathan typed in Glass Box chats) and compare with research/requests.md; also compare live build vs main.

House rules: end every reply with "Build N"; US units; screen questions come with pictures; verify visually before "done"; no polling or waiting turns; hand off at ~12 % context or ~120 turns.
