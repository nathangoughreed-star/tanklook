# Lane VD5: Retire the old Guided steps (after VD3)

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start ONLY after VD3 is on main (the coordinator tells you): `git fetch`, then `git checkout -b vd5-retire-old-guided origin/main` in your own worktree (never the shared folder). Read HANDOFF.md "Start here" + lane rules, research/design/visual-discovery-plan.md (question 2, answered 2026-11-02) and the GV1, GV5, GV6 sections of HANDOFF.md. Beyond that grep, don't read whole files.
Rules: Units gallons, inches, deg F, US $. Questions for Nathan stay in your chat WITH pictures (files, SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait, no polling), browser check, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result, moved numbers if any, screenshot paths. Stop preview servers.

Nathan (2026-11-02): the Guided path "should reflect the most recent document I have sent about the topic. This likely means getting rid of aspects of the old plan." The most recent document is the Visual Discovery spec, Revision 02: Environment -> Water -> Family -> Archetype -> Density -> Make It Your Own, practical constraints edited in Make It Your Own. VD3 made discovery the Guided entry; you remove what it replaced:
1. **GV1 kind + start-from cards** (src/ui/guided/): remove from the Guided path, with their tests and the `public/art/guided/` slots + research/design/guided-art-brief.md (mark the brief superseded; art for discovery lives at `public/art/discovery/`). Keep the step-rail / dock pieces only if discovery uses them.
2. **Owned gear + stand, and Limits** (GV1 steps 3-4, GV8 range editors): no longer guided steps. Make them two panels reachable from Make It Your Own ("What you already have", "Your limits"), same brief data, same editors (src/ui/ownedGear.ts, src/ui/setupBrief.ts / welcomeGuard.ts). Old saves keep their owned gear and limits.
3. **GV5 "look for this tank"** (src/ui/lookPick.ts look-for-this-tank entry): discovery after stocking replaces it. Remove the entry and its tests; keep the look-first lookPick only if anything outside Guided still opens it (say which).
4. **GV6 variation rounds** (src/ui/suggest.ts, src/demand/suggest.ts narrowing): remove from Guided. Suggest outside Guided keeps round 1 and "I like this one"; drop "More like this", the breadcrumb and their tests unless Nathan says otherwise.
5. Keep: GV2 need-driven gear, GV3 report (end of Make It Your Own), GV4 roster (behind "I already know my animals"), GV7 compromise, GV8 ranges.
Delete dead code rather than hiding it; name every removed export. No engine numbers should move; if any do, list them.
Screenshots: New > Guided start, Make It Your Own with the two new panels, Suggest outside Guided.
