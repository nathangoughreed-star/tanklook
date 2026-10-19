You are lane CS (CI workflow split). Worktree ../Glass-Box-cisplit, branch cisplit, port 5803 (not needed). Fast-forward to
origin/main first. Run on Sonnet.

Read HANDOFF.md "Start here" (deploy-health note) and the archived Lane CI section (HANDOFF-archive.md): the live site was stuck on
build 738 because tests failed or timed out. CI fixed that (testTimeout 120 s, discovery limited to test/**, job timeouts). Still
open, which is your work unit: .github/workflows/deploy.yml is one job, test then build then deploy, with cancel-in-progress, so a burst
of pushes cancels each run in turn and the site can trail main for a long stretch.
1. Split into a `test` job (npm ci, npm test) and a `deploy` job (needs: test; build; upload-pages-artifact; deploy-pages).
2. Make sure the site can't stay stale during bursts: the pages deployment concurrency must not cancel the run that is
   deploying, and a newer push should supersede only runs that have not started deploying; the latest commit on main must always
   end up deployed. Think through GitHub's concurrency semantics (a queued run is replaced by a newer queued run; a running one
   is cancelled only with cancel-in-progress) and pick the safest setup. Test commit-by-commit behaviour by pushing two
   harmless commits (e.g. a HANDOFF line) in quick succession and watching the Actions API (curl
   https://api.github.com/repos/nathangoughreed-star/tanklook/actions/runs, readable without login); the test gate must stay.
3. Add a one-line "live build" check to HANDOFF "Start here" if the existing note does not cover it (the build number shown on
   https://tanklook.com/ vs git rev-list --count origin/main).
Confirm with a deploy that succeeds and report the live build number. Files you own: .github/workflows/*, the deploy-health note in
HANDOFF. Others push to main constantly: keep each push small, merge origin/main first.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched (the suite has a 120 s test timeout and
takes about 90 s), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash (shared across all
worktrees). The main checkout holds other chats' uncommitted edits: never commit, pull, reset or stash there. Pictures of
anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict. Model changes are recorded on /review.html.
No scene version bump. Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in).
Subagents on Sonnet only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to Nathan.
Keep out of files you do not own; one-line hooks only in shared files, keep both sides on merge. 
preview_stop when done. preview_start serves the folder the chat was opened in: run this chat inside its worktree.
If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message when work lands on main and
when you are done: commit hash, what landed, what is still open, which files are free. Questions for Nathan stay in your own
chat, with pictures. The coordinator cannot relay approvals.
