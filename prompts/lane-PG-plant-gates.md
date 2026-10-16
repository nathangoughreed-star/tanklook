Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes), its Lane PG stub (plain-words
summary) and the section "Feature to add: plant / coral light-and-feeding advice" (the detailed plan; Nathan wrote the
brief on 2026-10-16). Memory: shared-folder-commits.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane PG: plant / coral light and care gating. Worktree C:\Users\nreed\Glass-Box-plant-gates, branch plant-gates,
launch config `plant-gates`, port 5673 (npm ci is done). First git fetch + merge origin/main.

Goal in one line: the tank knows how much light it gives and how much care (low-tech / ferts / CO2) the owner will give,
and plants and corals are matched to that: flagged when wrong, and auto-populated from only the ones that fit.
Do it in this order, one batch per push, pictures / screenshots before shipping each:
1. Data: tag every plant and coral variant in the LIBRARY (scene/items.ts) with a light band (low / medium / high; reef:
   soft / LPS / SPS PAR tiers) and a care demand (none, recommended, required for CO2 / ferts; reef: dosing level), from
   the PAR guide tiers in ui/parGuide.ts. Keep the tier numbers in ONE place so the guide and the checks cannot drift.
   Cite sources for any number you set; flag the ones you are unsure about to Nathan with the species list.
2. Scape shading (step 0 in the section): a "Account for the aquascape" toggle in Light map mode, default off (off = today's
   numbers): floaters (per-species transmission x cover), canopy, hardscape shadow. The JS (lightout.ts bandsAt) and the
   light-map shader (render/lighting.ts) must stay in step, and the hover readout honours the toggle.
3. Checks: sample the PAR at each plant / coral (with shading when the toggle is on) and compare with its band: a small
   badge on the item (too dim / fine / too bright) and a one-line tank summary ("medium light with stems and carpets:
   CO2 recommended"; "Acropora at 90 PAR: too dim"). Advice only: never block placing an item.
4. Auto-populate: two controls in the starter-set UI, light level (or read from the fixture's PAR at the substrate) and
   care level (GrowFeed in scene/growtime.ts: low-tech / ferts / CO2 + ferts); starterItems then picks only plants whose
   band and demand fit, with the same layout quality either way; a one-line caption says what was chosen and why. Low care +
   low light = a beautiful scape from anubias, java fern, crypts, mosses, swords, floaters on wood and rock.
Open questions for Nathan (ask in your own chat when you reach them): does care also set the dosing advice shown, and do
we offer a "stretch" slider (one tier above the tank's means, with a warning)?
Old files must draw and load exactly as before; no scene version bump without asking Nathan.

Files you own: plant / coral entries of scene/items.ts LIBRARY, the plant-pick filter inside starterItems (scene/items.ts),
ui/parGuide.ts, scene/lightout.ts, render/lighting.ts, scene/growtime.ts, the starter-set controls and badges in
ui/panels.ts / index.html. Running at the same time: lane SS2 (starter styles: starterStyle and the style data; keep both
sides when you both edit items.ts), lane SB (scatter brush: src/interact, render/scatter.ts). Merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about a plant / item / screen WITH its picture.
