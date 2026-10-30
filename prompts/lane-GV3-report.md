# Lane GV3: One printable report

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b gv3-report origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then research/design/guided-flow-plan.md (the Guided v2 plan: Nathan's spec verbatim at the bottom, the lane table and the shared contracts). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. Nothing hard-gates in Guided: warnings with fixes, never disabled buttons; animal-welfare problems stay red and say "not a valid tradeoff". Units in UI and reports: gallons, inches, deg F, US $.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile, the items in question marked).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), a browser check of your step, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result (files / tests passed), moved numbers if any, screenshot paths. Stop preview servers when done.

Nathan: "once it's finished and the way they like, they can print out the report that has the quick rundown, a picture of the tank, existing equipment, shopping list, expected costs, plant/coral list, etc. Also include any basic warnings or cautions."
Today: three separate sheets (src/ui/planSheet.ts, src/scene/setupsheet.ts + src/ui/setupsheet.ts, src/ui/buildPlanSheet.ts via src/demand/buildplan.ts) share a page style and `@media print` (style.css ~418-434). None carries a render image or a plant list.
Build `src/ui/report.ts` (new): one paper-white, print-ready report (US Letter, `window.print()`; "Save as PDF" through the print dialog):
1. Rundown: tank (gal, L x W x H in), kind, animals with counts, difficulty, care min / week.
2. Picture: a still of the current tank render (front view), captured through one hook in the renderer (name it), embedded as an image; falls back cleanly when WebGL is off.
3. Existing equipment: everything owned, $0 "you have".
4. Shopping list: grouped like the build plan (buy first / buy later), each line priced.
5. Costs: set-up minimum viable vs ideal (`costTiers` from src/demand/tiers.ts if lane GV4 has landed; otherwise the single set-up total plus a one-line TODO), monthly.
6. Plant / coral list with counts.
7. Warnings and cautions: the stocking summary problems / cautions, welfare in red.
Export `openReport()`; reachable from the end of Guided (lane GV1 adds the button) and from the menu where the plan sheet lives (one-line hook).
Owns: `src/ui/report.ts` + test, a `.rp-*` print block in `src/style.css`, one capture hook in the renderer, one menu hook. Reuse the existing sheets' data functions; do not rewrite them.
Tests: every section present for the paludarium example; owned gear priced $0; an empty section shows a "none" line.
Screenshots: the report's first page and the print preview.
