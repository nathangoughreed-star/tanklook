# Lane NG5: Discover taste through examples (closes gap 7)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE with send_message (session_id = that id) when ready to merge, done, or blocked; questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, cropped, marked, sent with SendUserFile). Read research/design/guided-sandbox-plan.md, HANDOFF.md "Start here" + lane rules, and the HANDOFF "NG2" section (the brief v2 API you build on: targetOf, isFlex, futureOf, addFuture, answeredOf, directionOf ...). NG1 (Guided / Sandbox entry), NG2 and NG6 (effort, validated / provisional badges) are on main.
Start: `git fetch`, then create your branch from origin/main (`git checkout -b <name> origin/main`; reset --hard may be denied).
Rules: touch only the files you own (a one-line hook elsewhere is fine, say so). Sibling lanes at the same time: NG3 (live loop), NG4 (conflict paths), NG5 (taste). Never loosen a welfare gate; a strong preference never compensates for a welfare failure. US units in chat (gal, in, deg F). Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots SAVED AS FILES (paths in your report). Do not push: send sha(s), suite result, screenshot paths; the coordinator merges. Stop your preview servers when done.

Owns: src/demand/taste.ts (new), src/ui/lookPick.ts, src/scene/looks.ts, a .look-* block in src/style.css. One hook line in src/demand/suggest.ts at the score (NG3 owns that file: if NG3 already added `tasteBonus`, implement it in taste.ts; otherwise add the single call line and say so).
Do:
- Seeded variant tiles per look (several real rendered examples per style, e.g. Lush & natural, Clean & minimal, Wild & atmospheric), filterable by upfront cost and care minutes / week. Tiles are style cues, not promises of species or gear.
- Picks, rejections ("not this") and refinements write preference weights into the brief (a new brief item via NG2's setters pattern; if you need a new item, add it in taste.ts with a one-line registration in scene/brief.ts and say so).
- The scorer reads the weights; ranking only, never feasibility. Cards say why: "because you picked Clean & minimal twice".
- Early picks never lock the project: weights decay and are clearable.
- Moves ranking: moved-numbers table and calib regen per the lane rules.
Report: shas, suite, moved-numbers table, screenshots of the variant tiles with filters and a card showing the "because" line.
