# Common lane rules (current coordinator: Coordinator 22, local_b0516eb8-66d2-4b12-8c5a-ac195c952bbc; report to the CURRENT coordinator, never an earlier one)

- Coordinator: Coordinator 22, session `local_b0516eb8-66d2-4b12-8c5a-ac195c952bbc`. Report to it ONCE (send_message): branch + sha rebased on origin/main, build + test result, screenshots, open questions. Never push; the coordinator merges.
- Own worktree off origin/main (`git fetch`, base on origin/main; rebase on origin/main before reporting).
- Read first: HANDOFF.md "Start here" incl. "Machine load" (renders / screenshot sheets via `scripts/lowprio.ps1`, test suites via Bash run_in_background, kill Chrome / node / vite when done), then `research/design/sandbox-start-and-single-home.md` (the plan: "What Nathan asked", "Where things are today", your lane, and which files the other lanes own: stay out of theirs).
- Nathan is American: gallons, inches, deg F, lb, dollars.
- Any question for Nathan comes WITH pictures (cropped screenshots, the part marked), sent with SendUserFile.
- Before reporting: `npm run build` and the FULL vitest (known load timeouts in gv8limits / taste / rosters / suggest / explore: re-run those files alone), screenshots saved as files in your worktree.
- Add a dated HANDOFF.md section for your lane.
