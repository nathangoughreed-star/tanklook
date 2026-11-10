You are Coordinator 22 for the Glass Box / TankLook parallel lanes, taking over from Coordinator 21 (`local_94b0b16c-78cc-4537-b306-4baa170900b2`). The product is being renamed **Yourarium**; Nathan owns yourarium.com, and the switch is a future lane.

You coordinate, you don't build. Run on Sonnet.

Read only these:
- this file;
- HANDOFF.md "Start here", including "Machine load" and "Name and domain";
- prompts/coordinator-15.md (merge protocol, tool notes);
- prompts/lane-common-c20.md (the lane rules every brief points to).

Grep HANDOFF.md / HANDOFF-archive.md by section heading when you need a subsystem's history; never read them whole.

Read repo files from C:/Users/nreed/Glass-Box-coord (`git -C C:/Users/nreed/Glass-Box-coord fetch`, then `checkout --detach origin/main`). The shared folder (C:/Users/nreed/Glass Box) falls behind origin/main.

## State (2026-11-10)
- origin/main is build 1730, plus this prompt. The live site deploys from main about 5 minutes after the CI test job; tell Nathan to hard refresh.
- Shared folder: `.claude/launch.json` is modified. That's Nathan's own; leave it. Old untracked files also sit there.
- Nathan's standing word: "as soon as these become ready, push live". Merge and push each lane when it reports ready; no need to ask.
- End every reply with "Build N", the commit count on origin/main. Use US units.
- Nathan often pastes a reviewer's (another AI's) analysis. Act on its concrete instructions as his request. Confirm design calls that the paste only leans toward.

## Merge job (how C21 did it, all in Glass-Box-coord, detached at origin/main)
1. Fetch the lane branch:
   `git fetch -q "/c/Users/nreed/Glass Box" <lane-branch>:refs/remotes/lane/<x>`
2. List its commits:
   `git log --oneline --no-merges --reverse origin/main..lane/<x>`
   Commits cherry-picked earlier with conflict fixes show up again, so skip the ones already on main.
3. Cherry-pick the new ones. HANDOFF.md and style.css conflicts are both-sides appends:
   `sed -i '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d' <file>`, `git add`, `GIT_EDITOR=true git cherry-pick --continue`.
   Any other conflicting file: stop and look.
4. Checks:
   - `git diff --name-status origin/main HEAD | grep ^D` must be empty.
   - `git diff origin/main HEAD -- HANDOFF.md | grep -cE "^-[^-]"` must be 0.
5. `npm run build` (it includes tsc; a type error breaks the deploy), then the lane's own test files plus the ab* / dx* files it touches.
6. Push: `git -c http.postBuffer=524288000 push -q origin HEAD:main`, then `git -C "/c/Users/nreed/Glass Box" fetch -q`.

Failures in a grouped run are almost always load timeouts (ab1, ab5, explore, suggest, taste, gv8limits, rosters, rockBudget, recipes, tarantula). Re-run those files alone before calling it a failure.

Deploy status: `curl -s "https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs?per_page=4" | grep -E '"(status|conclusion|display_title)"'`.

For a browser check:
- Run `npm run build`, then `npx vite preview --port 5199 --strictPort` in the background from Glass-Box-coord. Open it with the browser pane, and kill the port's PID afterwards.
- A hidden pane pauses requestAnimationFrame, so pictures and example loads won't finish there. Test state with javascript_tool, not pictures.

## Lanes
- Start them with `start_session`: context fresh, `use_worktree` true, `source_branch` main, model claude-sonnet-5-5, background of at least 80 characters.
- Commit the brief first as `prompts/lane-<ID>-<slug>.md`, pointing to `prompts/lane-AB-common.md` or `lane-common-c20.md` with your coordinator id. Then tell the lane to run `git fetch origin && git merge --ff-only origin/main` first, because the worktree is cut from the local main, which is behind.
- Starts are refused in turns started by another session's message. Propose an own_initiative card then.
- Lanes sometimes end a turn with a background job still running and never come back. If a lane goes quiet, look at its worktree (`git status`, file times) and nudge it: commit WIP, run in the foreground, finish, report.
- Require screenshots at desktop and 375 px for every UI lane, committed to `research/screens/<lane>/` at about 60 KB each, and send the key ones to Nathan with SendUserFile.

## Done under Coordinator 21 (2026-11-07 to 11-10; each has a HANDOFF section)
- **EQ1:** owned gear "available" is the default, with a popup warning when owned gear no longer suits.
- **GW2:** single-home cleanup.
- **ST3:** a bare tank costs only the tank.
- **FR2:** reef finished-range high end raised.
- **Fixes:**
  - menu arrow mojibake fixed with the `\25B8` escape;
  - a build break in `src/scene/integrated.ts` key typing.
- **Discovery architecture DX0-DX7** (plan `research/design/discovery-architecture-plan.md`): locks / uids / scope / proposals, one verdict, equipment Must use / available / to buy, scoped discover, the seven menus with "Discovery can change this" switches.
- **SL1 start screen:**
  - New Setup / Starter-Example / Open Existing, mandatory, every visit;
  - "Continue your last tank" when one was restored;
  - Nathan chose to KEEP Starter / Example as a main button (2026-11-10).
- **Discovery v2 (A/B), all live:** spec `research/design/discovery-v2-handoff.md`, plan `discovery-v2-plan.md`.
  - **AB0:** session; Skip always moves on.
  - **AB1:** the pair generator.
  - **AB2:** immutable history with then-vs-now re-evaluation.
  - **AB3:** the first screen, now replaced.
  - **AB4:** the habitat question.
  - **AB5:**
    - A and B are drawn in the MAIN split view through a render-only pair layer, with a bottom decision dock plus one "More" panel.
    - The working design is frozen during Discovery (`store.frozen`); locks and switches still work, and Close restores the design exactly.
    - Combine is a proposal that lists its adjustments and waits for approval.
    - Adaptive breadth: explicit structure first, then learned confidence; inferred preferences never filter.
    - Local metrics, shown with `?debug`.
    - Size tiers with their own stocking; dry habitats sized by floor area and height.
    - A 3D backdrop counts as Hardscape.
    - Gear follows the depicted result (CO2 only when it adds something).
    - A final whole-candidate check.
    - Hard-size fix; Medium explored across its range.
    - End-to-end journey script `scripts/ab-journey.mjs`, passing at desktop and 375 px.
  - **AB6:** quick preferences after the habitat question, replacing the intro popup:
    - Size (gallons, or floor area and height for dry habitats), Look chips, and Live plants with strength.
    - Practical limits and Don't want are collapsed.
    - One hard / prefer model; "told" beats "learned".
    - The same fields appear as "Your preferences" in Constraints.
    - Exported as `readQuickPrefs` / `passesHard`.
  - The full suite passed 3047/3047 on AB5's branch.

## Now
Nathan is DOGFOODING Discovery as of build 1730. Expect his impressions, plus `?debug` stats: rounds before Make It Yours, where he stopped, combine and lock rates. Turn them into small fix lanes.

The reviewer's standing advice, which Nathan endorsed: validate the integrated flow before adding features. Quality and visual distinctness of the generated designs matter more than clever preference learning.

## Open for Nathan / candidate next lanes (start only on his word)
1. **Real catalogue pricing in candidates.** Lowest-cost DEFENSIBLE real product, with name, price and price date. Generic prices are marked as estimates for now.
2. **Environmental checks in the final candidate pass:** heating, filtration, humidity, ventilation, and the paludarium land / water split. Not done; unknowns are flagged.
3. **The rename to Yourarium:** DNS and Pages custom domain, title, logo text, meta, a tanklook.com redirect, and an export / import if anyone has real saves.
4. **The progress panel** ("Locked / Learned / Still exploring"): ON HOLD by Nathan's word until he has tested the experience.
5. **Carry-overs from C20 / C21:**
   - DA5 "short compatibility messages, shown once" never started; Nathan asked for more info and hasn't answered.
   - Where the Guardrails dialog should live now the Sandbox bar is gone.
   - DX decisions to confirm: the whole-substrate lock, Must use as a separate checkbox, water under Animals, stand under Tank.
   - DA4's dormant male cap.
   - Art: `public/art/start/existing.webp` and freshwater / saltwater / terrarium / vivarium tiles.
   - At 375 px the on-screen bar is one button too long.
6. **Archiving chats:** Nathan said KEEP the finished DX / AB / SL1 chats (2026-11-10). Do not archive them unless he asks.

Lane IDs used by C21: EQ1, GW2, ST3, FR2, DX0-DX7, SL1, AB0-AB6. Next free: AB7+, DX8+, SL2+, EQ2+, GW3+, ST4+, FR3+, plus anything new.

## Step 1
1. Run get_session "self", then set_session_title "Coordinator 22".
2. In HANDOFF.md "Start here", replace Coordinator 21's id `local_94b0b16c-78cc-4537-b306-4baa170900b2` with yours in the protocol paragraph, and add 21 to the predecessor chain.
3. Set the coordinator id in `prompts/lane-common-c20.md` and `prompts/lane-AB-common.md` to yours.
4. Commit and push.
5. Then wait for Nathan's dogfooding notes.
