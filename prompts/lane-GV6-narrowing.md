# Lane GV6: Narrowing (pick one, see variations; make it mine)

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b gv6-narrowing origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then research/design/guided-flow-plan.md (the Guided v2 plan: Nathan's spec verbatim at the bottom, the lane table and the shared contracts). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. Nothing hard-gates in Guided: warnings with fixes, never disabled buttons; animal-welfare problems stay red and say "not a valid tradeoff". Units in UI and reports: gallons, inches, deg F, US $.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile, the items in question marked).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), a browser check of your step, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result (files / tests passed), moved numbers if any, screenshot paths. Stop preview servers when done.

Nathan: "The tool chooses and presents the user with a few options that are all feasible within the user's existing setup decisions, and we subsequently narrow in on a build that the user wants to try. The user chooses which out of the group they like the most, then the next screen with multiple options each with some sort of variation focused around the original choice are presented. At any stage, the user can choose 'I like this one', at which point they can 'make it theirs' and add or remove anything manually."
Today: Suggest (src/demand/suggest.ts, src/ui/suggest.ts) gives up to 3 diverse proposals; refine chips (src/demand/refine.ts) edit the whole brief; a "what changed" strip (src/demand/propagate.ts); "Use this setup" opens the editor.
Build:
1. Round 1: 3-4 feasible options under every choice made so far (kind, owned gear, limits, roster, look if any).
2. Picking one anchors the next round: 3-4 variations around it, each changing one axis (stocking, look / plants, tank size, finish tier), each labelled with what changed and the $ / care difference. All feasible; nothing beyond the brief's max limits unless labelled as a compromise.
3. Repeatable; a breadcrumb of picks; Back returns to the previous round's set unchanged.
4. Every card: "I like this one" -> make it mine: applies it to the tank, opens the editor, keeps the brief, Undo works. Rename "Use this setup" to match.
5. Picks and passes feed taste (src/demand/taste.ts weights; call its API, don't edit it).
Owns: `src/demand/suggest.ts`, `src/ui/suggest.ts`, `src/demand/refine.ts`, `src/demand/propagate.ts` + tests. Do not touch the infeasible card (GV7).
If ranking numbers move, write research/design/moved-numbers-gv6.txt and regen calib per HANDOFF.
Tests: each variation differs from the anchor in exactly its labelled axis; all pass the brief's max limits; Back restores the previous round; make it mine applies and is undoable.
Screenshots: round 1, round 2 anchored on a pick, the make-it-mine result.
