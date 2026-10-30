# Lane GV5: Look and plants after stocking

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b gv5-look-after-stocking origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then research/design/guided-flow-plan.md (the Guided v2 plan: Nathan's spec verbatim at the bottom, the lane table and the shared contracts). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. Nothing hard-gates in Guided: warnings with fixes, never disabled buttons; animal-welfare problems stay red and say "not a valid tradeoff". Units in UI and reports: gallons, inches, deg F, US $.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile, the items in question marked).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), a browser check of your step, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result (files / tests passed), moved numbers if any, screenshot paths. Stop preview servers when done.

Start only after lane GV2 (need-driven gear) is on main; the coordinator will tell you.
Nathan: "once they have a stocking list, tank, filter, heater (if needed) chosen, we can go into the 'how you want it to look' section, which includes the plants. The plant pricing themselves as well as the added light cost for higher-needs plants (and ferts/CO2 for some) should be included."
Today: the look step (src/ui/lookPick.ts, src/ui/scapePick.ts, src/scene/looks.ts) is look-first: pick a look, then size, then animals. Cards are priced via demandOf.
Build:
1. A "look for this tank" entry: when a roster + tank + gear exist, offer scapes that fit this tank and these animals (substrate, cover, swimming room for the roster's needs), keeping the roster and tank.
2. Each card shows its plant cost, the light upgrade the plants need and its $ (from `needsOf` light / co2 / ferts), and ferts / CO2 monthly. A low-tech option is always among the cards.
3. Picking one applies it (Undo works) and the roster's totals update. Look-first entry keeps working unchanged.
4. Taste (src/demand/taste.ts) keeps learning from picks here.
Owns: `src/ui/lookPick.ts`, `src/ui/scapePick.ts`, `src/scene/looks.ts`, `src/demand/taste.ts`, a `.look-*` block in `src/style.css`. Reads src/demand/needs.ts, does not edit it.
Tests: a fixed roster + 20 gal long gets cards that keep both; a high-light card's price includes the light delta and CO2; the low-tech card has no CO2.
Screenshots: the look-for-this-tank cards for a stocked tank; one card's cost breakdown.
