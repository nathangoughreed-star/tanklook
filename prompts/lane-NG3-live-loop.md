# Lane NG3: Live recommendation loop and propagation (closes gap 5)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE with send_message (session_id = that id) when ready to merge, done, or blocked; questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, cropped, marked, sent with SendUserFile). Read research/design/guided-sandbox-plan.md, HANDOFF.md "Start here" + lane rules, and the HANDOFF "NG2" section (the brief v2 API you build on: targetOf, isFlex, futureOf, addFuture, answeredOf, directionOf ...). NG1 (Guided / Sandbox entry), NG2 and NG6 (effort, validated / provisional badges) are on main.
Start: `git fetch`, then create your branch from origin/main (`git checkout -b <name> origin/main`; reset --hard may be denied).
Rules: touch only the files you own (a one-line hook elsewhere is fine, say so). Sibling lanes at the same time: NG3 (live loop), NG4 (conflict paths), NG5 (taste). Never loosen a welfare gate; a strong preference never compensates for a welfare failure. US units in chat (gal, in, deg F). Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots SAVED AS FILES (paths in your report). Do not push: send sha(s), suite result, screenshot paths; the coordinator merges. Stop your preview servers when done.

Owns: src/ui/suggest.ts (except the infeasible card, which NG4 moves to src/ui/infeasibleCard.ts: leave infeasibleCard alone and expect a one-line import there), src/demand/suggest.ts, src/demand/refine.ts, src/demand/propagate.ts (new). NG5 adds ONE hook line in demand/suggest.ts near the score (~507); keep that seam simple (a `tasteBonus(proposal, brief)` call returning 0 by default is fine to add yourself).
Do:
- Brief or tank edits re-run Suggest (debounced ~400 ms), keeping locked picks and the user's chosen direction (NG2 `directionOf`).
- A "what changed" strip on the results: e.g. "Budget $300 -> $450: 2 upgrades now fit", "20 gal high -> 20 gal long: more swim length, 4 more neons". Compute diffs in demand/propagate.ts (pure, tested).
- An owned filter added reassesses flow and reallocates startup spend (not a plain price subtraction).
- Generator reads target vs max: max filters, target ranks (closer to target scores higher); flex items may be offered for relaxation in refine chips.
- If NG6's setupHours / care minutes are available, the generator may respect a setupHours limit. This moves ranking: produce a moved-numbers table and regenerate calib tables per the lane rules (GEN_RETABLE / GEN_RETABLE_V4).
Report: shas, suite, moved-numbers table, screenshots: budget raise with the change strip; 20 high -> 20 long.
