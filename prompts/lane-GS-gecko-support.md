You are lane GS (gecko support surfaces). Worktree ../Glass-Box-geckosupport, branch geckosupport, port 5743.
Fast-forward to origin/main first.

Nathan 2026-10-19: the geckos (crested, leopard) appear to float. He assumes they are standing on LEAVES, and thinks they are
too heavy for that: they should only cling to branches (wood, cork, rock and other hardscape that can bear them), not to plant
leaves.

Work unit:
1. Reproduce first: put a crested gecko and a leopard gecko in a dry terrarium with plants, Shuffle several seeds, and find out
   WHY they look floating (leaf anchors? a pose whose feet miss the surface? a leaf that sways or is thin?). Take pictures of
   the failing cases and say what the cause is before changing anything.
2. Rule (Nathan's proposal): add a weight / bearing notion per species (e.g. species.json mass or a `leafOK` flag; geckos and
   anything heavier than a small tree frog: no leaves). Leaf anchors are only used by light species. Geckos use branches,
   hardscape tops and sides, the back wall / glass if they climb it (crested: yes, leopard: no, floor and hardscape only).
   Existing animals' behaviour must not change except where this rule says so; list which species it affects.
3. Fix any real floating (feet not touching the supporting surface) you find in the reproduction, whatever the cause.
4. Tests: gecko poses never use a leaf anchor, stay on a surface through save / load / Shuffle; existing leafperch tests pass.

Files you own: scene/anchors.ts and render/items.ts surface selection (CL's area; nobody else is in them now), the weight /
leaf flag in data/species.json (lane AN also adds species entries there: add only yours, keep both sides), tests.
Lane AN (anoles) runs at the same time and owns the new anole models; it relies on your leaf rule, so tell the coordinator
the flag name as soon as it is on main.

Read HANDOFF.md "Start here" first (lane rules, coordinator protocol), then the HANDOFF sections for lane G1 (crested and
leopard gecko, render/lizard3d.ts, poses) and lane CL (cling / perch surfaces: scene/anchors.ts, render/items.ts,
test/leafperch.test.ts; Nathan's rules: clingers go on undersides and sides, perchers only on TOP of things, nothing on
glass unless the species climbs glass). Memory: shared-folder-commits.md, fish-art-not-cartoony.md, push-live-is-fine.md.
Run on Sonnet. Subagents on Sonnet only.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main (if the main
checkout has another chat's edits, skip the ff and say so). Pictures of every new or changed thing BEFORE shipping, via
SendUserFile, and wait for Nathan's verdict. Model changes are recorded on /review.html (restart the dev server after merging
main, before pressing Record; build number = commit count). No scene version bump. Add your own dated section under "Lane
sections (current)" in HANDOFF.md (a stub exists: fill it in). Keep out of files you do not own; one-line hooks only in
shared files, keep both sides on merge. When done, preview_stop your dev server.
Note: preview_start serves the folder the chat was opened in, so this chat must run inside its worktree.
If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message when work lands on main and
when you are done: commit hash, what landed, what is still open, which files are free. Questions for Nathan stay in your own
chat, with pictures. The coordinator cannot relay approvals.
