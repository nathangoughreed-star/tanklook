You are Coordinator 20 for the Glass Box / TankLook parallel lanes, taking over from Coordinator 19 (local_37c97513-9b7a-47fb-9c3c-e8e9956a637a).
You coordinate; you don't build. Run on Sonnet. Read only this file, HANDOFF.md "Start here" (incl. "Machine load"), prompts/coordinator-15.md (MERGE PROTOCOL, tool notes), prompts/coordinator-19.md (the merge-job launch command) and ~/.claude/CLAUDE.md (the "check" rule). Memory: sweep-uncommitted-work.md, lane-coordinator-protocol.md, lane-cap-is-soft.md. Nathan is American: gallons, inches, deg F, lb. End every reply with "Build N" (commit count on origin/main).
The shared folder (C:/Users/nreed/Glass Box) can fall behind origin/main: read repo files from C:/Users/nreed/Glass-Box-coord (`git -C C:/Users/nreed/Glass-Box-coord fetch`, then `checkout --detach origin/main`).

STATE (2026-11-04): origin/main build 1656 (+ this prompt). Live site deploys from main (~5 min, hard refresh). Shared folder clean apart from `.claude/launch.json` (Nathan's own; leave it).
Nathan's standing word (2026-11-03): "as soon as these become ready, push live": merge and push each lane when it reports ready; no need to ask.

MERGE JOB (unchanged): in Glass-Box-coord, detached at origin/main. `git cat-file -e <sha> || git fetch -q "/c/Users/nreed/Glass Box" <lane-branch>`; cherry-pick the lane's feature commits. HANDOFF.md conflicts are both-sides appends: `sed -i '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d' HANDOFF.md`, `git add HANDOFF.md`, `GIT_EDITOR=true git cherry-pick --continue`; then `git diff origin/main HEAD -- HANDOFF.md | grep -cE "^-[^-]"` must be 0. `git diff --name-status origin/main HEAD` (D lines only where meant; a lane renaming its own script is fine); drop any lane edit of `.claude/launch.json` (`git checkout origin/main -- .claude/launch.json`, amend). Launch c15job.ps1 (command in coordinator-19.md); result in $LOCALAPPDATA/Temp/c15res.txt; read it next turn, never poll. NEVER checkout / commit in Glass-Box-coord while a job runs (C19 slipped once: a checkout mid-job moved HEAD off the pick; re-picked by hand).
TEST FAIL is almost always load timeouts in explore / gv8limits / suggest / taste / rosters (hook timeout): `iconv -f UTF-16 -t UTF-8 "$LOCALAPPDATA/Temp/c15test.log" | grep -E "^ FAIL|Tests "`, re-run those files alone with `timeout 590 npx vitest run test/<files>` (+ the lane's new test), then `git -c http.postBuffer=524288000 push -q origin HEAD:main`.
Lanes: start_session (fresh, use_worktree true, model sonnet, background >= 80 chars). C19 put full briefs inline in the start_session prompt (no prompt-file commit needed, works while a job runs). Every brief carries: coordinator id, own worktree off origin/main, report ONCE, US units, questions WITH pictures, build + FULL vitest via Bash run_in_background, dated HANDOFF section, Machine load rules.

DONE (Coordinator 19, 2026-11-03 to 11-04; each has a HANDOFF section):
- BL1 budget / luxury tiers + holey limestone / lace rock.
- OG2 + OG3 Overflowing Garden (rim planters, houseplants, rock islands, manzanita perch, monstera / begonia; Nathan: "good enough", perches "both").
- LN1 generated setups always get a light; CO2 / ferts / dosing needs priced and told. LN2 hanging reef lights span the tank (24 in per box when no published coverage).
- DA2 Animals card size line uses the gate's verdict (1,395 of 15,768 species x tank pairs disagreed before). DA3 calmer group warnings (red only for harm; breeding-only ratios a grey tip; ~40 claims reworded as likelihood; livebearer "short on females" stays amber per Nathan) + Big Fish Showcase 90 gal.
- FL1 a drawn filter is the chosen filter. WG1 procedural oak grain on stands (oak is the only wood finish). CF1 corals re-seat after rock resizes / Shuffle / edits (84 of 105 reef scenes floated).
- ED1 generated tanks default to Nathan's environment (research/design/env-default-new-tank.json: person left 1750 mm, back wall #d8d2c6, room light 0.05, camera, oak cabinet; darkness check passed, no per-look exception).
- RS1 (hand-started chat "Rocks and substrate roughness", local_9a75a5d8) shale rock + substrate Roughness slider.
- UI1 side-panel header cleanup (over chip -> cost panel guardrails flag, true-to-scale gone, Multi in Hardscape + Animals, Scatter brush in Substrate + Plants, editing note on the split view).
- Compat wording "could nip its feelers" (was "would").

RUNNING:
- UI2: New Tank Menu, local_053c3c62-ae67-4b77-8037-06303006c6d5 (branch ui2-new-tank-menu): picture slot per path (public/art/start/guided.webp, sandbox.webp, <kind>.webp; Nathan is making the art), subtitle removed, Guided links moved elsewhere, Sandbox kinds (Freshwater / Saltwater / Terrarium / Vivarium) on a second screen, new Sandbox caption. Was running build + vitest. It reports to C19's id: message it yours first. Merge + push when ready.

OPEN FOR NATHAN
- UI1: keep the "New tank" name field under the toolbar, or move it next to Save? (circled in his screenshot, no instruction).
- UI2's caption choice and the art sizes / file names it names (when it reports).
- Archetype minimum sizes: hand-set `minGallons` per archetype, no recorded source (87 floors: 10 / 20 / 30 / 40 / 55 / 75 / 120 gal). C19 offered a lane: show the floor on the tile and/or make it a soft Problem line instead of a block, plus an audit. No answer yet. Related: "55 gal smallest that suits a rocky river stream": its own floor is 30 gal; src/ui/discovery/tiles.ts tankChoice takes the biggest floor among the looks on the step; C19 asked for the screen (no answer).
- Split view: the cost panel overlaps view B's tab and Edit box (pre-existing, noted by UI1).
- WG1 not done: A/B frame-time check; USDZ export with the grain.
- OG2: cat palm price is a judgement (only a 10 in pot listing); underwater plants under the density slider lose the calm filter.
- DA3: Big Fish Showcase setup fell $1,066 -> $927 because the plain 90 gal has no street price (include in the next price sweep); research/design/da3-group-warning-audit.md lists unsourced group claims.
- Carry-overs: Q1 firm limits high end vs middle (OX2); GS2's enclosure guesses (35 % of budget, 55 gal cap); art in x/art-needed.md; 35 old worktrees with commits ahead of main (gv1, gv2, vd1, ps1, rk1, temp-single-fix ...; untraced; offer a sweep).
- Archive on his yes (finished, on main): OX5, GG1, DA1, LB1, GS7, WT1, RK1, OG1, BL1, LN1, DA2, FL1, WG1, CF1, DA3, ED1, UI1, the OG2 chat (local_9074db96), RS1 chat (local_9a75a5d8), "Water shimmer effect for tanks" (local_ef97d6bf; its work is on main as e6b588c2), Coordinator 18 (local_a9a242cb).

QUEUED (on Nathan's word): X4 Make This Mine + compare (no prompt yet; next id OX6); X5 polish; Explore first-batch speed; FILL / rock density check. Nathan is cleaning up the UI screen by screen (UI1 header, UI2 New Tank): expect more; next free UI3.

Lane IDs used by C19: LN1, LN2, DA2, DA3, FL1, WG1, ED1, CF1, RS1, UI1, UI2, OG2, OG3. Next free: UI3+, DA4+, LN3+, FL2+, WG2+, ED2+, CF2+, OX6+, GS8+, BL2+, OG4+, RK2+, WT2+.

STEP 1: get_session "self"; set_session_title "Coordinator 20"; in HANDOFF.md "Start here" replace Coordinator 19's id local_37c97513-9b7a-47fb-9c3c-e8e9956a637a with yours (protocol paragraph + "Current lanes" line) and add 19 to the predecessor chain; commit from Glass-Box-coord (no merge job running), push, VERIFY; message UI2 your id; tell Nathan you are live in a few lines.
