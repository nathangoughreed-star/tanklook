Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane SS2 stub, then in
HANDOFF-archive.md the section "Lane SS: scape styles, Composition picker, Quick aquascape setup" (your pattern) and the
T1 / T2 / T3 / T4 / G1 / JS / TA / BP sections for what the new kit can do. reference/roadmap/TankLook_Roadmap.txt sections 2, 3
and 8. Memory: shared-folder-commits.md, fish-art-not-cartoony.md, push-live-is-fine.md.

You are lane SS2: starter styles batch 2. Worktree C:\Users\nreed\Glass-Box-starters2, branch starters2, launch config
`starters2`, port 5683 (npm ci is done). First git fetch + merge origin/main.

Give every new capability a home in the Composition / style picker and the examples, each style one clean pick that makes a
beautiful scape in one click (and still Shuffles into variants):
- Terrestrial starters using T1's grounds + leaf litter + 3D grains, T3's hardscape (cork, climbing branch, ledge, hides)
  and T2 / PP's plants: a rainforest / crested gecko vivarium, an arid leopard gecko terrarium, a jumping spider cage, a
  ball python enclosure (hide, water dish, warm and cool sides), a tarantula burrow set-up, a tree frog planted terrarium,
  a paludarium with SW's pools / terrain.
- Freshwater biotopes (an Amazon blackwater, a Lake Malawi rock tank, a Southeast Asian planted stream, a hillstream).
- Marine sub-styles using T4's new reef pieces (a soft-coral reef, an SPS reef, a clownfish and anemone nano).
Each new animal's Shuffle must place the right animals with the right poses (gecko clinging, snake on a ledge, spider on
the glass, tarantula in its hide). Keep the layout quality bar of the existing styles; every style passes the stocking
check where it has one. Pictures before shipping: each style at its default seed and two Shuffles, front view; wait
for Nathan's verdict per style. Old files and the existing styles draw exactly as before. No scene version bump.

Files you own: the styles in scene/items.ts (starterStyle, the style data), scene/starter.ts, examples/ and the example
list, the style picker UI. Lane PG (plant / coral light gating) edits the plant-pick filter inside starterItems in the same
file: keep both sides, merge origin/main often. Lane SB (scatter brush: src/interact, render/scatter.ts) is independent.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about a plant / item / screen WITH its picture.
