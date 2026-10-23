You are the new coordinator for the Glass Box parallel lanes, taking over from session local_c8c29767-10c6-4b72-87cc-7d54a6f06bbd
("Coordinator 8"). You coordinate; you don't build features. Read coordinator-6.md "HOW TO WORK", coordinator-7.md "HOW TO WORK" and
coordinator-8.md "HOW TO WORK" (all still valid), then this file, which overrides them where they differ.

STATE FIRST (2026-10-23, build 1191, main fc02dbd, deploys green):

WAITING ON NATHAN (each yes goes in the lane's own chat)
- S212: Stocking Assessment Clarity (shrimp floor) (local_08ca100b): branch shrimp-floor, 8 commits b354fd1..1f71d09, fast-forward of
  fc02dbd, 1295 tests pass. Floor bar only (no stocking % or water % moves on 39 probe rows): 6 open-water species take no floor and 6 rock
  dwellers half, white cloud floor 0, shrimp/crabs take floor x0.3 (Nathan re-confirmed "Keep shrimp floor"), females sized at their own length
  in the tank list, advice names the binding limit, test timeouts fixed, calib generator floorShareOf x FLOOR_FACTOR. Coordinator 8 recommends yes.
- SU: Sump Section in Tech (local_f88c8ff2, started by Coordinator 8): branch su e8829ca, NOT rebased on the latest main. Tech > Sump row
  (size from the tank presets or custom, min 10 gal), sumpOffered = salt >= 29 gal, fresh >= 75 gal, used by tankfit AND builds, so 0 picks
  disagree with the builds. Sump water counts in nitrogen only, priced as tank + plumbing + return pump, counted once (in Filtration). Moved
  picks vs main at 5f2ad4c: mystery x50 30b -> 75, blue tang x12 300 -> 6 ft, turbo x12 20L -> 29, axolotl x6 60b -> 75. On Nathan's yes
  it rebases, re-runs the table and sends only the differences BEFORE pushing. Picture: side-session-notes/<coord-8 id>/SU-sump-section-draft.png.
- SR: Stocking Rescale (prompt prompts/lane-SR-stocking-rescale.md, commit 6394b16; not started). Nathan's scale is S214's: 75 % ideal
  (green), 75-100 caution (amber), over 100 problems (red), IDEAL_MAX = 75 (on main). Open question to Nathan: start SR now WITHOUT its
  step 3 (re-centring SPACE_PER_L), because S216's calibration owns the global water / floor scales (S216 and Coordinator 8 both recommend
  this split). SR must also fix scripts/space-factors.mjs, which rewrites spacefactor.ts and drops SPACE_NUDGE and FLOOR_FACTOR. Start
  SR after S212 and SU land (both touch stocking.ts).
- S166: Python fish compatibilities (land-vs-aquatic rule): never answered; still in the Finished section (id not found).

RUNNING / OPEN
- S216: Expert Calibration Rounds (local_264b779e, nested under S214): rounds 1-3 of Nathan's expert survey. It applies NO global scale
  until round 3 has human answers and Nathan says yes (today's fit is water x0.83, floor x0.85, not decision material).
- S217: Species Length Audit (local_92e8260b): aeda1f5 on main (11 adult lengths, 3 female lengths, 22 space factors refitted). Moved
  a lot: paludarium 129 -> 62 %, blackwater 74 -> 53 %, iwagumi 65 -> 83 %, starters' Full median 60 -> 55 % (small planted starters
  87 -> 54 %). Table: side-session-notes/local_5626e7ee.../aeda1f5-moved-numbers.md. Nathan has not commented on these moves.
- S214: Stocking Fullness Threshold (local_5626e7ee, and its part 2 local_b094b09b): bands pushed (9ee4fe0, 7d6325e, baf734a). Done.
- S196 (local_4a7419c5): next it reviews every count warning (Nathan yes); CW (nested under it) is done.
- S199: Dry-Tank Lamps on the Lid (local_4f569338), branch claude/lid-lamps-9806d8 bd75679, unpushed, waits on Nathan.
- UF (local_eda2d645): design chat; rules-spec verdicts are UF's guesses until approved.

DONE BY COORDINATOR 8 (verified ancestors of main): S196 territorial caps (eac7923), CW count warnings = fighting limits only + dwarf
gourami males 1 from 10 gal +1 per 15 gal (31e954d..4045ec3), S207 code review (aa97ef4), CF review fixes done in coordinator 8
(0e5bece: room temperature, filterless, all-female wording, planFor memo, ghost box size), SN snail waste + floor (273bd21, 39d80b9),
S211 tank-wide school discount 0.72 + kuhli floor 0.6 (980bafa, 8ad16ea), S213 rock max size (a77026e), S214 bands.

NATHAN CAN ARCHIVE: Coordinators 5, 6, 7, 8 (after you take over), CW, SN, CF n/a, S207, S211, S213, S214 (both parts), S188, HC, S206,
RF, MM, CB, HB, ST, S208-S210, and the coordinator-7 list.

IDs: next free S218. Lanes used since coordinator 7: CW, CF, SU, SN, SR (never reuse).

HOW TO WORK, changes from coordinator-8.md:
- SIDEBAR (Nathan 2026-10-22): two sections, "Glass Box: Active" (cg-353f4d2f-6e1e-4ed2-8850-05435931acf5, flat, by recency) and "Glass
  Box: Finished" (cg-daf0f22f-...). Move every new or newly-live chat into Active and every finished one into Finished, on each event.
  Nested chats move with their parent (move the parent). Ungrouped Glass Box chats show as a separate "tanklook" block: file them.
- Nathan starts many chats by hand, often several on the same question. Two chats got contradictory decisions from him on the same day
  (S215's 100 % scale vs S214's 75 % scale): when two chats decide the same thing, put both side by side to Nathan with a picture, and
  take his latest word only after he has seen both.
- Hand-started chats commit in the shared checkout (S213 did) or leave edits there (S214 did); check `git -C "C:/Users/nreed/Glass Box"
  status` and `log origin/main..HEAD` on every check. Nathan fast-forwards it himself (`merge --ff-only origin/main`).
- Every engine-number lane: ask for the moved-numbers table (starters, example scenes, tankFor x 1/3/6/12/25/50) before the push, and
  re-ask after every rebase. Main moves several times an hour.

STEP 1, take over: get_session "self", set_session_title "Coordinator 9", move yourself into "Glass Box: Active"; in HANDOFF.md "Start
here" replace local_c8c29767 / "Coordinator 8" with yours (protocol paragraph and "Current lanes" line), commit from Glass-Box-coord;
send_message your id to S212, SU, S216, S217, S196, S199; tell Nathan you're live and Coordinator 8 can be archived. End every reply with
"Build N". Hand off to coordinator-10 at about a third of context, state first.
