You are lane AQ (AqAdvisor ids for the new species). Worktree ../Glass-Box-aqids, branch aqids, port 5813 (not needed). Fast-forward
to origin/main first. Run on Sonnet (a Haiku subagent is fine for the lookups).

Read HANDOFF.md "Start here", scripts/aqadvisor-ids.py (its docstring), src/data/aqadvisor.json / aqadvisor.ts, and the archived CP
section (HANDOFF-archive.md: water dish, succulents, Malawi cichlids and the stand-in ids).
Work unit:
1. Re-run scripts/aqadvisor-ids.py (by hand, about 1 request per species, 1 s apart: be polite, no parallel requests) so every
   species that has an AqAdvisor entry gets its real id; the new Malawi cichlids from lane CP currently use stand-in ids. Update
   NAMES in the script only for mappings you verify. Species with no AqAdvisor entry (most herps) stay unmapped, as today.
   Include the species added since the last run (check species.json against aqadvisor.json for any freshwater / marine fish,
   inverts and amphibians with no id).
2. Add the Malawi cichlids to the Malawi starter pool (the starter / Shuffle pool where Malawi species are listed; find it from
   the CP section and starter.ts) so Malawi starters actually use them; check the stocking numbers they give against AqAdvisor's
   answer for one example tank and report the comparison.
3. Tests: aqadvisor ids are unique and well-formed; Malawi starters place only species that exist and fit the tank.
Pictures of one Malawi starter before shipping; wait for Nathan's verdict.
Files you own: scripts/aqadvisor-ids.py, src/data/aqadvisor.json, the Malawi pool entries in the starter data (src/scene/starter.ts,
one-line additions only: other chats have uncommitted edits in that file in the main checkout, so merge carefully).

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
