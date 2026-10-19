You are lane AN (anole models). Worktree ../Glass-Box-anoles, branch anoles, port 5753. Fast-forward to origin/main first.

Nathan 2026-10-19 asked: "can we add some Anole models?" Add the common pet anoles on the lizard body plan from lane G1
(render/lizard3d.ts, parameterized for new lizards). Species, with real proportions and colours (research reference photos
and typical sizes; sources in your HANDOFF section):
- Green anole (Anolis carolinensis): green to brown colour change, pink dewlap, slender, ~20 cm TL with tail.
- Brown anole (Anolis sagrei): brown, patterned back, dewlap (orange / red with a yellow edge), male and female look.
- Optionally, if time allows and Nathan likes the first two: knight anole (Anolis equestris), the big one.
For each: species data in data/species.json (terrestrial / arboreal reptile category, not aquatic; AqAdvisor does not apply;
care notes: UVB, temperature, humidity, tank minimums that fit the app's care data), a look or two (male / female or colour
phase), the dewlap as a visible, correct feature (folded vs displayed pose is a bonus), slim toe pads, a long whip tail.
Poses on scene/anchors.ts surfaces: clinging up a branch or the back wall (head up), resting on a branch, on hardscape,
basking on a flat top; never floating, never underwater. Anoles are LIGHT (about 5 g green anole): lane GS is adding a
weight / leaf flag in species.json; anoles are allowed on leaves, so use its flag once it is on main (merge origin/main often;
until then they may use leaves as the current code does, and say so). Shuffle must place them sensibly (arboreal species
higher in the tank).
Art rule: they must look like the crisp tank render, not cartoony (memory: fish-art-not-cartoony.md). Sheets on /review.html
(all four views, both lights), pictures of each pose in a dry terrarium before shipping; wait for Nathan's yes.
Tests: poses stay on their anchor through save / load / Shuffle; no part clips into the glass or the perch.

Files you own: render/lizard3d.ts additions (parameters only; if you must change the shared body code, keep geckos identical:
compare before / after pictures), anole entries in data/species.json and the animal look tables. Lane GS owns scene/anchors.ts
and render/items.ts surface selection: do not edit those.

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
