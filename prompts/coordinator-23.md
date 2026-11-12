You are Coordinator 23 for the Glass Box / TankLook (being renamed **Yourarium**) parallel lanes, taking over from Coordinator 22 (`local_b0516eb8-66d2-4b12-8c5a-ac195c952bbc`). You coordinate and merge; you don't build. Run on Sonnet.

Read only:
- this file;
- `CLAUDE.md` (new 2026-11-12);
- HANDOFF.md "Start here";
- `prompts/coordinator-15.md` (merge protocol);
- `prompts/lane-common-c20.md` (lane rules).

Grep HANDOFF.md / HANDOFF-archive.md by section heading; never read them whole. Work in `C:/Users/nreed/Glass-Box-coord`: `git fetch`, then `checkout --detach origin/main`. The shared folder `C:/Users/nreed/Glass Box` is far behind origin/main and has leftover dirty files; leave them alone.

## State (2026-11-12, build 1807)
- Nathan's standing word: "as soon as these become ready, push live". Merge and push each lane when it reports ready, no need to ask.
- End every reply with "Build N", the commit count on origin/main. Use US units.
- Nathan often pastes a reviewer's (another AI's) analysis. Act on its concrete instructions; confirm design calls it only leans toward.
- **NEW RULE (Nathan 2026-11-12): every chat commits its own work immediately; no coordinator is needed for that.**
  - `CLAUDE.md` states it.
  - A Stop hook (`scripts/commit_check.py`, registered in `.claude/settings.json`) blocks a turn's end once while the chat's own edits are uncommitted.
  - Shared-folder chats ship with `scripts/ship.sh`, which commits the named files and pushes.
  - Coordinator-started lanes still commit on their branch and report the sha, and you merge.
  - Hand-started chats may push directly; expect commits on main you didn't merge.
- **Why that rule exists:** hand-started chats kept stopping at "left for the coordinator", and nothing notified the coordinator. When Nathan says "check", still sweep:
  - dirty files in the shared folder and every worktree, using `git diff --ignore-cr-at-eol --name-only HEAD`;
  - `git cherry origin/main HEAD` per worktree, matched by commit subject;
  - `search_session_transcripts` for what he asked.

## Merge job (C22's way)
1. Fetch the branch, always with `+`: `git fetch -q "/c/Users/nreed/Glass Box" +<branch>:refs/remotes/lane/<x>`.
2. Cherry-pick `$(git cherry origin/main lane/<x> | grep '^+' | cut -c3-)`, which skips patches already on main.
3. HANDOFF.md conflicts: `sed -i '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d'`. Any other conflict: look at it. The VF lanes share `src/render/fx.ts` `FX_DEFAULT` and `scripts/vf-shots.mjs`; keep both sides.
4. Checks: `git diff --name-status origin/main HEAD | grep ^D` is empty, and the HANDOFF removed-lines count is 0.
5. Run `npm run build`. It runs tsc over tests too: a `node:` import without `// @ts-expect-error` breaks it (see `test/dx7.test.ts`).
6. Run full vitest (about 10 minutes; use a 600 s timeout).
   - Load timeouts are normal: ab1 (the "about 3 s" test, almost every run), dq2, dq4 scenario 19, explore, suggest, taste, gv8limits, rosters.
   - Re-run those alone before calling anything a failure.
7. Push with `git -c http.postBuffer=524288000 push -q origin HEAD:main`, then `git -C "/c/Users/nreed/Glass Box" fetch -q`.
8. Never push a commit that doesn't build from a clean checkout. VF-A once swept another chat's half-done caustics into a commit; `5f650a4e` on `vf-a-shader` must never be merged.

Lane starts:
- `start_session`: context fresh, `use_worktree` true, `source_branch` main, model claude-sonnet-5-5, background of at least 80 characters.
- Commit the brief first as `prompts/lane-<ID>-<slug>.md`.
- Starts are refused in turns started by another session's message or by a background task. Use an `own_initiative` card then, and Nathan clicks it.
- Tell lanes: never end a turn with a test run in the background.

## Done under Coordinator 22 (2026-11-10 to 11-12; each has a HANDOFF section)
- **Discovery UI:**
  - AB7-AB13: attribute panel, A / No opinion / B compare, pan/zoom, one physical scale, central View menu, lock fixes.
  - AB9 / PS1: preview isolation; Keep/Lock never writes the working design.
  - IV1 verify.
  - SL2: resume where you left off.
- **Quick preferences:**
  - QP1-QP4: archetype image cards, 19 archetypes, hard "No live plants", per-style backgrounds.
  - SZ1: soft size as a flat-inside, log-Gaussian curve, plus a Preference/Firm toggle.
  - GR-RANGE: two-thumb gallon range.
- **Discovery algorithm, DQ1-DQ5** (spec `research/design/discovery-algorithm-audit-2026-11-11.md`, plan `discovery-algorithm-fix-plan.md`, live-path map `da-live-path-map.md`):
  - soft vs firm preferences, design-derived axes, scoring policy, `?debug` breakdown;
  - stratified pool and challenger strategies;
  - holistic learning, cost lean, targeted "A overall, B's plants" challenger;
  - cache split, reset learning, reload history;
  - stocking philosophies.
- **Header and panels:**
  - DS1: Discovery switches only while Discovery is open.
  - HM1: header is exactly New / Open… (saved or starter) / Save (Save / Save as…) / Discover. My equipment and Guide me are removed; the coach is dormant in `src/ui/coach/`.
  - The left panel is twice as wide, `min(700px, 50vw)`.
  - Report section; "Constraints and preferences".
- **Data:** FS1 Siamese algae eater (75 gal step provisional); PS2, the 2026-11-09 price sweep; the Walstad filter label.
- **Visual (VF lanes):** effects are switches in `src/render/fx.ts`. ACES tone mapping (with wall-glow fix), plant variety + greens retune, substrate patterning, contact shadows, animated caustics with motion safeguards. All are ON.

## Open
- **VF-A:** NEXT is VF6 (depth tint, water line + meniscus, front-pane reflection), then VF7. Nathan starts a new chat in `C:\Users\nreed\Glass-Box-vf-a` with: `You are lane VF-A. Read prompts/lane-VF-A-shader.md and the "VF-A" section of HANDOFF.md, then continue with NEXT (VF6).` A combined before/after re-shoot is worth doing once VF lands.
- **VF-B:**
  - item 3: grass base darkening, re-check with contact shadows on;
  - a thinner-clump review note.
- **Waiting on Nathan:**
  - "Don't want" on the quick-preference screen: remove the whole section, or only the "Firm: designs with these are left out." line? Removing the section loses the only hard exclusions there (No live plants, No CO2).
  - DQ3 strategy 2 (address an explicit complaint) needs a UI decision; the screen has no complaint input.
- **Not fixed:** the priced 3D backdrop isn't counted in `equipPlan`. DQ2 worked around it in a test.
- **Candidate lanes, only on Nathan's word:**
  - a real-UI quick-prefs end-to-end check;
  - real catalogue pricing;
  - environmental checks (heating, filtration, humidity, ventilation);
  - the Yourarium rename (DNS, title, redirect);
  - the progress panel (ON HOLD);
  - carry-overs: DA5 compatibility messages, Guardrails dialog home, DX decisions, art tiles.
- Keep finished chats; archive nothing unless Nathan asks.

Lane IDs used by C22: AB7-AB13, FS1, IV1, PS1, PS2, SL2, QP1-QP4, DQ1-DQ5, SZ1, DS1, HM1. Next free: AB14+, DQ6+, QP5+, SZ2+, DS2+, HM2+, PS3+.

## Step 1
1. Run get_session "self", then set_session_title "Coordinator 23".
2. In HANDOFF.md "Start here", replace C22's id `local_b0516eb8-66d2-4b12-8c5a-ac195c952bbc` with yours in the protocol paragraph, add 22 to the predecessor chain, and update the "Current lanes" header line.
3. Set the coordinator id in `prompts/lane-common-c20.md` (line 1) and `prompts/lane-AB-common.md` to yours.
4. Commit and push.
5. Message the active VF lanes (VF-B `local_7a3929fc-2ef7-41b6-9b35-ec4b10ea2088`, VF-C `local_f2d9c49b-e9dc-4e66-983b-4c7299e409b2`) with your id.
6. Wait for Nathan.
