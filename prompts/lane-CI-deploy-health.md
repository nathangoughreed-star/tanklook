You are lane CI (get the live deploy working again). Worktree ../Glass-Box-ci, branch ci, port 5773 (a dev server
is probably not needed). Fast-forward to origin/main first. Run on Sonnet. Subagents on Sonnet only.

Problem (2026-10-19): the live site is stuck on build 738 (commit 95e482d, deployed 14:36 UTC). Every deploy since has failed,
been cancelled or sat queued. .github/workflows/deploy.yml runs `npm ci`, then `npm test` (vitest run, the WHOLE suite), then
`npm run build`; one failing or slow test blocks the deploy, and the runs pile up (one deploy at a time; 11 of the last 30
runs failed, 12 cancelled; the 6ae9df9 run was still going after 26 minutes). Nathan reviews on the live site, so this blocks
his review of everything since build 738.

Read first: HANDOFF.md "Start here" (lane rules), .github/workflows/deploy.yml, vite.config.ts (test: environment node, no
timeouts or excludes), package.json scripts. Memory: shared-folder-commits.md, push-live-is-fine.md. The GitHub API is readable
without a login (curl https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs ...) but job logs are not: a
failing step needs reproducing locally in a CLEAN worktree.

Work unit, in this order, each as its own small commit pushed to main as soon as it is green (the deploy needs it):
1. Reproduce on a quiet machine, in this worktree only (no other worktrees under it: vitest in the main checkout also picked up
   .claude/worktrees/* and aquascape/*, which CI does not have, so its results are noise). Time the suite (vitest run, with
   --reporter=default) and list every FAIL, separating (a) real failures that fail in milliseconds, e.g. about 19 python
   anchorbase cases (`python/N/none|rock|cork` in the anchor baseline tests: likely a missing or stale baseline for the python
   model, which lane BP / the python models changed), (b) tests that fail only by timeout under load (5 s default).
2. Fix the real failures (re-record a baseline only after checking the change is intended and say so in the commit).
3. Make the suite fast and robust: find the slowest test files (the density, scene, growth, lizard, anole, geckosupport,
   layout files take 5-40 s each), give slow tests an explicit timeout where they lack one, and set sensible defaults
   (vitest testTimeout, and exclude `.claude/**`, `aquascape/**`, worktree folders from test discovery so local and CI runs
   match). Target: the full suite well under 5 minutes on the CI runner. If a test is slow only because it builds many
   scenes, reduce its sample count rather than its meaning, and note it.
4. Workflow: keep `npm test` before the build (Nathan wants the gate), but make the workflow not waste runs: concurrency with
   cancel-in-progress is fine for the deploy job; consider splitting into a quick `test` job and the deploy so a slow test run
   does not queue deploys behind it, and add `timeout-minutes` (e.g. 20). Do not weaken the gate by skipping failing tests
   silently: a test you must skip gets a dated TODO in the HANDOFF section and a message to the coordinator.
5. Confirm: watch the Actions API until a run for your last commit completes with conclusion success and a deployment appears
   (GET /deployments), then read the live page (https://nathangoughreed-star.github.io/tanklook/) and report the build number now
   live. Then add a two-line "deploy health" note to HANDOFF "Start here": how to check the live build and the Actions state.

Files you own: .github/workflows/deploy.yml, vite.config.ts (test block only), test files you must fix, anchor baselines,
HANDOFF section. Other chats keep adding tests at the same time: keep changes to their tests minimal (timeouts, sample counts),
one-line hooks only, keep both sides on merge, merge origin/main before each push. Do NOT use git stash (it is shared across all
worktrees and another lane's stash was popped into another's). The main checkout holds other chats' uncommitted edits: never
commit, pull, reset or stash there.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched, commit by path only (never -a), git push
origin HEAD:main. No scene version bump. Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub
exists: fill it in). If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into
your section. Run this chat inside its worktree (preview_start serves the folder the chat was opened in).

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message when each of steps 2, 3, 4 lands
on main and when the live site shows the new build: commit hash, what landed, what is still open. Questions for Nathan stay in
your own chat. The coordinator cannot relay approvals.
