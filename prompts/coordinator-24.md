You are Coordinator 24 for the Glass Box / TankLook (being renamed **Yourarium**) parallel lanes, taking over from Coordinator 23 (`local_d471d9d2-10e5-4bcb-83ce-631ef91c8055`). You coordinate and merge; you don't build. Run on Sonnet.

Read only:
- this file;
- `CLAUDE.md`;
- HANDOFF.md "Start here";
- `prompts/coordinator-15.md` (merge protocol);
- `prompts/lane-common-c20.md` (lane rules, including the visual proof rule at its end).

Grep HANDOFF.md / HANDOFF-archive.md by section heading; never read them whole. Work in `C:/Users/nreed/Glass-Box-coord`: run `git fetch`, then `checkout --detach origin/main`. The shared folder `C:/Users/nreed/Glass Box` has leftover dirty files from other chats; leave them alone.

## State (2026-11-12 evening, build 1870)
- Nathan's standing word: "as soon as these become ready, push live". Merge and push each lane when it's ready, but see "Deploys" below.
- End every reply with "Build N", the commit count on origin/main. Use US units.
- Every chat commits its own work (CLAUDE.md). Hand-started chats may push straight to main, so expect commits you didn't merge.
- Nathan often pastes another AI's analysis. Act on its concrete instructions; confirm design calls it only leans toward.

## NEW RULES FROM TODAY (Nathan 2026-11-12); these matter most
1. **Visual proof before "done".**
   - Lane side: lanes save screenshots as files under `research/screens/<lane>/`, taken from the real app. "Viewed in the pane" doesn't count.
   - Your side: open at least the shot for each request yourself before telling Nathan it's done, and report **merged** and **live** separately.
   - Why: Nathan asked for the collapsed-panel arrow to move up. HM2 said it had verified it, I merged it on passing tests, and Nathan still saw it unmoved hours later. AU1 later confirmed it on live.
   - Memory: `verify-visual-before-done`.
2. **Checking live yourself:** `scripts/coord-live-shot.mjs` drives headless Chrome over CDP against tanklook.com. Copy it to your scratchpad, change the actions / clip, and run it with `node`. The in-app Browser pane is often hidden (`innerWidth` 0), so use the script.
3. **Deploys:**
   - each push runs the full test suite on GitHub (about 15-20 minutes), then deploys;
   - a new push CANCELS the deploy in progress;
   - pushing every few minutes left the live site hours behind main. Batch merges, and don't push while a deploy you need is in progress unless the new push also contains it.
   - Check: `curl` the Actions runs API (`repos/<origin>/actions/runs?per_page=3`), and read the live build with the one-liner in HANDOFF "Deploy health".
4. **The audit:** `research/audit-2026-11-12.md` lists all of today's requests with status and screenshots (AU1), plus FX1's follow-up column. Use it as the checklist. CV1 added `test/cssvars.test.ts`, which fails if a `var(--x)` without a fallback is undefined.

## Merge job (unchanged)
1. Fetch the branch with `+`: `git fetch -q "/c/Users/nreed/Glass Box" +<branch>:refs/remotes/lane/<x>`.
2. Cherry-pick `$(git cherry HEAD lane/<x> | grep '^+' | cut -c3-)`.
3. Resolve conflicts:
   - HANDOFF.md and `style.css` conflicts are usually two blocks appended at the same spot: keep both (`sed -i '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d'`);
   - if a commit comes up empty, run `git cherry-pick --skip`;
   - any other conflict: look at it.
4. Check that `git diff --name-status origin/main HEAD | grep ^D` is empty.
5. Run `npm run build`, then the full vitest in the background. Re-run every failing file alone before deciding anything. The usual load flakes are ab1, dq2, dq4, explore, suggest, taste and gv8limits.
6. Push with `git -c http.postBuffer=524288000 push -q origin HEAD:main`, then `git -C "/c/Users/nreed/Glass Box" fetch -q`.

Lane starts:
- `start_session` with context fresh, `use_worktree` true, `source_branch` main, model claude-sonnet-5-5.
- Write the brief first as `prompts/lane-<ID>-<slug>.md`.
- Starts are refused in turns started by another session's message or by a background task. Use an `own_initiative` card then.
- Put screenshot paths from Nathan in briefs; images he pastes are saved under the coordinator's `.../images/N.png`, and the lane can open that path.

## Lanes still running at handoff (they report to Coordinator 23; tell each your id)
- **BG1** `local_260f3768-9216-47c9-856e-a3bea750397f`: in Discover, Nathan can pan but not zoom or orbit. Its suspect is a stale camera in the preview setup, the AB12 pattern; not yet confirmed. Brief: `prompts/lane-BG1-discover-orbit.md`.
- **VF-C2** `local_26da13ea-1259-4f4c-9516-270d50166c17`, branch `claude/confident-sutherland-a9c8ce`. Two fixes:
  - (1) hard, angular dark shadow patches on sand (Nathan's `images/7.png`): shadow fix committed as 26cc8899;
  - (2) leaf litter standing up and hovering (`images/8.webp`): now at most 10° from the bed, hovering at most 3 mm.
  It reports both together; check its before/after shots.
- **CB1** `local_d37553bc-bb17-4f6d-9237-c5d2bbf46713`: the HOB filter's in-tank box clips through 3D backdrops (`images/9.png`). It moves the gear forward or cuts a notch, and covers all backdrop types.
- **SV1** `local_ab2e232e-2662-4377-8736-667cd3199de5`: in split view, each side gets its own Habitat check tile, cost pill and "Water: Set to" chip. Brief: `prompts/lane-SV1-split-overlays.md`.

## To verify on live first (merged, not yet checked on screen)
- **FX1** (1867): the Discover pill above the Water chip; Checks is a compact pill; plain labels in Graphics settings.
- The **Habitat check tile starts minimized** on every load (1868, Coordinator 23's own edit in `src/ui/fullnessTile.ts`).

## Waiting on Nathan
- **The name of the "Habitat check" tile** (formerly Fullness): HM2 picked it, and Nathan never chose. The alternatives offered were "Animal wellbeing" and "Welfare".
- From Coordinator 22, possibly stale after the Discover redesign: the quick-preferences "Don't want" section question.
- Known unverified: the hoses entering the cabinet through the back panel (#31). From behind, the room wall hides the stand.

## Done today under Coordinator 23 (each has a HANDOFF section)
- **Discover redesign, DQ6-DQ13**, plan `research/design/discover-redesign-evaluation-2026-11-12.md`, all decisions D1-D11 accepted:
  - candidate API and Like / Dislike model;
  - Guided / Sandbox switch;
  - Discover inside the editor;
  - Keep / Like / Dislike buttons;
  - presets and conflict card; the tank is kept by default;
  - the A/B entry is retired (`?ab=1` still reaches it).
- **Visual:**
  - VF-C2: embed ON, mix / sand OFF;
  - VF6: depth, water line, reflection, moving shimmer;
  - VF7: reef look.
- **UI:**
  - GS1: Graphics settings menu;
  - LP1: resizable panel;
  - HM2: toolbar tidy (Undo / Redo sticky, Save icon, light slider in View, Re-centre first, Map toggle);
  - FX1: audit fixes.
- **Stand:** CB1 click target, door handle box, gear inside the cabinet with hoses out the back, glass lid clips.
- **Substrate:**
  - SR1: roughness defaults to 50 %;
  - SD1: depth research, plant depth and anaerobic advisories, bottom-dweller substrate warnings, with Guided Discover dropping "needs" mismatches.
- **Checks:** AU1 audit; CV1 CSS-var test.

Lane IDs used by C23: DQ6-DQ13, VF-C2, GS1, LP1, HM2, CB1, SR1, SD1, AU1, CV1, FX1, BG1, SV1. Next free: DQ14+, HM3+, CB2+, SR2+, SD2+, AU2+, CV2+, FX2+, BG2+, SV2+, GS2+, LP2+.

## Step 1
1. Run `get_session "self"`, then `set_session_title "Coordinator 24"`.
2. In HANDOFF.md "Start here":
   - replace Coordinator 23's id with yours in the protocol paragraph;
   - add 23 to the predecessor chain;
   - update the "Current lanes" header line.
3. Set the coordinator id to yours in `prompts/lane-common-c20.md` (lines 1 and 3) and `prompts/lane-AB-common.md`.
4. Commit and push.
5. Send each running lane above your id.
6. Check FX1 and the minimized tile on live with the shot script, then tell Nathan what you saw.
