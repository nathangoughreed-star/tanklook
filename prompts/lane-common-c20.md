# Common lane rules (current coordinator: Coordinator 23, local_d471d9d2-10e5-4bcb-83ce-631ef91c8055; report to the CURRENT coordinator, never an earlier one)

- Coordinator: Coordinator 23, session `local_d471d9d2-10e5-4bcb-83ce-631ef91c8055`. Report to it ONCE (send_message): branch + sha rebased on origin/main, build + test result, screenshots, open questions. Never push; the coordinator merges.
- Own worktree off origin/main (`git fetch`, base on origin/main; rebase on origin/main before reporting).
- Read first: HANDOFF.md "Start here" incl. "Machine load" (renders / screenshot sheets via `scripts/lowprio.ps1`, test suites via Bash run_in_background, kill Chrome / node / vite when done), then `research/design/sandbox-start-and-single-home.md` (the plan: "What Nathan asked", "Where things are today", your lane, and which files the other lanes own: stay out of theirs).
- Nathan is American: gallons, inches, deg F, lb, dollars.
- Any question for Nathan comes WITH pictures (cropped screenshots, the part marked), sent with SendUserFile.
- Before reporting: `npm run build` and the FULL vitest (known load timeouts in gv8limits / taste / rosters / suggest / explore: re-run those files alone), screenshots saved as files in your worktree.
- Add a dated HANDOFF.md section for your lane.
- **Visual proof rule (Nathan 2026-11-12, after a "verified in the pane" arrow fix that never worked):** every visible change ships with screenshots SAVED AS FILES under `research/screens/<lane-id>/`, taken from the real app built from your branch, one per thing Nathan asked for, named after the request. "Viewed in the pane" without a file does not count. If you could not take a shot, say so in the report as NOT VERIFIED. The coordinator opens them before telling Nathan it is done, and reports "merged" and "live" separately.
