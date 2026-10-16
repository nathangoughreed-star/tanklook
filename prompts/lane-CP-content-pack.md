Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane CP stub, then in
HANDOFF-archive.md the sections "Lane SS2: starter styles batch 2" (its Open list is your scope), "Lane T2: terrestrial
plants", "Lane T3: dry hardscape pieces" and "Lane T4: aquatic roster" (the way new pieces, plants and fish are added).
Memory: shared-folder-commits.md, fish-art-not-cartoony.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane CP: content pack. Worktree C:\Users\nreed\Glass-Box-content, branch content-pack, launch config
`content-pack`, port 5683 (npm ci is done). First git fetch + merge origin/main.

Build, with pictures before shipping each batch (each new piece / plant / fish in a fitting tank, front and 3/4, and at
growth 0 / 0.5 / 1 for plants; wait for Nathan's verdict per item):
1. Water / food dish piece (a shallow bowl, ceramic or stone, with a water surface; a few sizes): the python starter needs
   it, and it is the roadmap's "feeding dish". A dish is a hardscape piece (rests on the ground or a ledge via
   scene/anchors.ts), holds water that reads as water (clear, slightly blue, a meniscus line), works dry-tank and wet-tank.
2. Succulents for the arid starter: echeveria rosette, haworthia, jade / crassula, a small aloe, a sedum trailing form, and
   a cactus or two; true to their growth forms with the growth slider (GR3 timeline), drawn dry (no haze), plantable in sand
   and clay, with light and care data in scene/lightneeds.ts (PG's tiers: high light, low care, no CO2) so the plant
   gates and auto-populate know them.
3. Malawi fish for the Malawi starter: only species that read differently from the existing cichlids (yellow lab is in):
   a peacock (Aulonocara), a Demasoni or other small mbuna, a Haplochromis / Copadichromis, a Synodontis catfish;
   add them with the T4 process (species.json + aqadvisor entries, a body plan from the existing generators, model sheet
   on /review.html, stocking-check data), and then update the Malawi starter to use them.
Then ask Nathan if he wants the next batch (more arid plants, more cichlids). Old files and starters draw exactly as before
unless a starter is deliberately updated. No scene version bump.

Files you own: the new piece / plant entries of scene/items.ts LIBRARY, art/plants.ts, render/plant3d.ts, render/items.ts
(the dish), scene/lightneeds.ts (new rows only), species.json / aqadvisor.json / fish art (new fish), the Malawi starter
branch. Running at the same time: lane EN (enclosure: tank presets, lids, equipment in NEW files + one LIBRARY hook line in
scene/items.ts: keep both sides). Keep out of its files; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an item / screen WITH its picture.
