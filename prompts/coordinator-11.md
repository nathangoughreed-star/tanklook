You are the new coordinator for the Glass Box parallel lanes, taking over from session local_901f3080-a6d1-434c-9b78-3485dcfdaf02
("Coordinator 10"). You coordinate; you don't build features. Read the "HOW TO WORK" sections of coordinator-6.md through -10.md
(all still valid), then this file, which overrides them where they differ.

STATE FIRST (2026-10-26 ~17:15 UTC, build 1271, main b9c528b, deploys green as of 8d1fb4d; check the runs API).

MERGE PROTOCOL (Nathan 2026-10-26, "push all work that is ready. I dogfood with the main site"; standing): lanes DON'T push.
A lane sends a ready sha. You cherry-pick it onto origin/main in C:/Users/nreed/Glass-Box-coord (detached;
node_modules there is a junction to the shared checkout's, so build + tests run), check `git diff --name-status origin/main HEAD`
for D lines outside the lane's files (S222 deleted a prompt via a squash), run `npm run build` + `npx vitest run` IN THE BACKGROUND
(~10 min), then push and tell the lane. One at a time; when main moves under you, re-pick. Lanes whose lock tests / files conflict
go back to the lane to rebase and re-bless (never hand-resolve generated files or test locks). Render tests (growth, snake, spider,
tarantula, gpureveal, calib timeout) flake under load and pass alone.

QUEUE / RUNNING (full ids; send with SendMessage to the id)
- SR: Stocking Rescale (local_f0877f8e-c540-4d47-b9d4-65c8e47cc1a9): steps 1, 3, 4, 7 + filter cap (+50 %) + nano-starter rule ON MAIN
  (bce3458, build 1278). Open: Nathan's calls on 6 borderline expert-list tags (SR's chat). Nano tanks with no fitting school are
  listed in its report; S238's new fish should fill the freshwater gaps.
- S224b: Catalogue Merge (local_bcf39200-7006-4999-86fc-bd3eec942827): 0fa0758 HELD. Has includes (698 variants: full 108, partial
  552, none 38; lid unknown 378; gaps in research/tanks/includes-gaps.json). Before pushing it must: price each size from a standard
  rimmed non-kit variant (g50b step-up read +$689 via a $610 LANDEN rimless; Nathan: "no 50g standard? 36x18x18?"; g50b is the
  36x18x19 breeder), explain or fix negative step-ups (cardinal g20h -$63), do a ~20-variant spot-check against product pages, list
  bundles with includes gear but no kits.json record (research/tanks/kit-gaps.json), rebase over S233b (b9c528b). Then moved table.
- S229: Fullness Bars (local_c449228a-70d5-45c6-bfb3-5f265a730a87): stocking-screen gauge bcd208b conflicted with S234 in
  stockPlan.ts; asked to rebase. No sha since.
- S238: Nano Schoolers, Crayfish, Micro Crabs, Isopods (local_4046d44f-eca3-495a-a4a8-8bb9c49d442c), started 2026-10-26 on
  Nathan's "if we need to add some more small schooling fish for nano tanks lets do it. I also want some crayfish and thai micro
  crabs. Aquatic isopods too." Running. Tells you which new fish qualify for SR's nano-starter rule.
- S216: Expert Calibration Rounds (local_264b779e-f6ea-4d39-8d33-6a55f3f6e3a9): xc = bb84489 (fit-report label) + 1288c9d
  (prompts/lane-S216b-expert-calibration.md). LAST in the queue; told "your turn" at build 1278. After it lands, start S216b from that prompt.
  Decided: rounds 1-3 data used at FULL weight in one fit with v4; ChatGPT experts = one source (round-1-ngr.json = Nathan's own
  5 tanks, a small human source); global water / floor scales belong to S216b (needs human answers, held-out gain, Nathan's yes).
- S232: Scheduled Price Sweep: DONE. Task glass-box-weekly-price-sweep, Mondays ~08:10, first run 2026-11-02; each sweep
  messages the coordinator a sha + report (push it like any lane). Archive S232.

WAITING ON NATHAN
- S234 / LT questions (HANDOFF "LT"): land + water mix -> paludarium?; dry-tank gear editable in Tech + drawn in 3D?; ball python
  upkeep $69/mo (food scales by length^0.8; frozen rats ~ $15).
- Closing the "what's in the box" gap (plan Nathan asked for): step 1 = S224b (on disk); step 2 = targeted research lane over
  includes-gaps.json, measure 10 first, quote, Nathan's yes; step 3 = ratchet test (unknown count can't grow, new products need
  includes): fold into the next tank lane; step 4 = S232's sweep already flags includes text (report-only).
- Next lanes to propose once S224b lands: kit records (kits.json for every bundle that should lock), includes research (step 2).
- Backlog (not asked): territory phase 2 (S196), oto / tiny bottom-dweller visibility (S218 finding).

NATHAN CAN ARCHIVE: Coordinators 8, 9 and 10 (after you take over), SU, S166, S196, S199, S214 x2, S218, S219, S222, S224, S225,
S226, S230, S231, S234, S235, S236, S237, the "Glass Box sidebar re-sort" routine runs. S233 after S224b lands.
Shared checkout: S234 / S235 left uncommitted copies that now match main, plus .claude/launch.json (S234's land-path config) and
untracked test/_tmp/probe.test.ts. Nathan syncs it himself (`git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main` after
`git checkout -- <those files>`); the git guard blocks chats from doing it.

IDs: next free S239 (S230-S238 used today). Lanes since coordinator 8: CW, CF, SU, SN, SR (never reuse).

HOW TO WORK, changes from coordinator-10.md:
- You can't start a session on a turn another session's message triggered; and a proposal card can't name a cwd from this stale
  Glass-Box-stocking folder. Ask Nathan to say "start X", then start it with initiation user_asked, cwd "C:\Users\nreed\Glass Box",
  use_worktree true, model claude-sonnet-5-5. Keep briefs in the notes folder until then.
- Hand-started chats keep pushing directly (S234 via ship.sh, S236) and work in the shared checkout: title them S###, tell them to
  send shas instead, and to move to their own worktree.
- Nathan's 25 % rule: a chat still in use past 25 % context writes prompts/lane-<ID>b-*.md and continues fresh. Idle chats report
  context "unavailable"; use their message count (~900+ ≈ over).
- Questions to Nathan: give a recommendation; he answers in batches by quoting your bullets ("rec", "yes", "start").
- Usage 2026-10-26 17:15: weekly all-models 26 %, Fable 13 %, 5-hour 59 % (resets 20:00 UTC).

STEP 1, take over: get_session "self"; detach_session "self" if nested; set_session_title "Coordinator 11"; move into
Glass Box: Active; in HANDOFF.md "Start here" replace local_901f3080 / "Coordinator 10" (protocol paragraph and "Current lanes"
line), commit from Glass-Box-coord and push; send your full id to SR, S224b, S229, S238, S216, S232, S233; tell Nathan you're live
and Coordinator 10 can be archived. End every reply with "Build N". Hand off to coordinator-12 at about 25 % context, state first.
