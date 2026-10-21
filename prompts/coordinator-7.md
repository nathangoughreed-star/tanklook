You are the new coordinator for the Glass Box parallel lanes, taking over from session local_cd7298f9-aef8-4622-b47e-d9f3fcc54479
("Coordinator 6"). You coordinate; you don't build features. This file overrides coordinator-6.md, -5.md and -4.md where they differ;
read coordinator-6.md "HOW TO WORK" too (still valid), then this.

STATE FIRST (2026-10-21 ~16:00 UTC, build 1068, live site green at cceaa80):

RUNNING
- MM: Tank Minimum Migration (local_a6c62452), prompt prompts/lane-MM-min-migration.md, worktree .claude/worktrees/mm. Last of the
  tank-minimum chain: loads MX's summary.json lines (Nathan's rule: RED = minimum, fails below; GREEN = Recommended; YELLOW between,
  allowed), turns MA's 4 `it.fails` into passing tests, depth field, ball python (fits NO terrarium today: litres spread over 19.7 in),
  wording. Owns src/scene/tankMin.ts. When it reports: verify the commit is an ancestor of origin/main, watch the deploy, list its gaps.
- S188: Animal-First Screen Without a Tank (local_82ace766), Nathan's hand-started chat, running. Likely touches the stocking screen
  (stockPlan / stockGallery / tankfit): check for overlap with MM's consumers (tankfit, whyAnimal) and warn both if they collide.
- S189: Minimum Tank Size Behavior (local_971a3f4f), hand-started, idle. I did NOT read its last report (list_events showed only
  "done"; page back with before_uuid). Check whether it edited anything (its cwd is the stale Glass-Box-stocking folder: nothing there
  ships) and whether it overlaps MM.

WAITING ON NATHAN
- S168: Source Traceability Setup (local_48e505b2): the 7 data disagreements; Nathan asked whether one source is enough. Coordinator 6
  recommended: yes when nothing contradicts it (mark single source); for conflicts take the stronger source, else the more cautious
  value. (Decision 5 in research/tank-minimum-first-principles.md says the same: one credible applicable source is enough.)
- The shared checkout "C:\Users\nreed\Glass Box" is stuck at 32e50e9: 4 leftover edits block the fast-forward. All four checked safe
  to discard (plant3d.ts / items.ts / starter.ts are already on main; launch.json is an obsolete p3fullness --prefix). Nathan must run:
  git -C "C:/Users/nreed/Glass Box" checkout -- .claude/launch.json src/render/plant3d.ts src/scene/items.ts src/scene/starter.ts
  git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main
  (scripts/git_guard.py blocks us; chats keep reporting the failed ff: point them here.)
- S182 (mystery snail) judgement items, mostly absorbed by MX/MM: mbuna 250 L / oscar 540 L feel demanding; kadango fits one tank;
  amano / nerite volume-only. Re-check after MM lands.

DONE TODAY (Coordinator 6), all verified ancestors of origin/main: S175 tank minimum by floor/length, S176 hardscape density, S177/S178
Flex curved front + integrated kits + tank picker by gallons, S180 choose-your-tank list, S181 Flex glass, PX (items 3-5; items 1-2
dropped, branch px b6d3da6 keeps the search preview), FT flaky render tests (27dd6e1: per-file timeouts removed), S168 R1-R5 sourcing +
grazer check + "Relative difficulty", MW minutes a week, S169 build pill in toolbar, S183 build fix bb778da + tank-minimum policy
(Decisions), MA audit (ffdd57e), MX sourcing (49c2cf7, 00853f0; 0.78 M tokens, on quote), NB nitrogen balance (8afc8e4: ledger tests,
tap nitrate, Decision 2 states, filter gate + Walstad box), S187 snails zero Space (1ad9439), 63084a1 filter-gate follow-ups.
Deploy incident: builds 1048-1052 never deployed (test-file type error; `npm run build` = tsc over src AND test). HANDOFF lane rules now
say: run `npm run build` before every push. Check the deploy job, not only the test job, when a run is red.

GAPS worth a chat (none started): NB's 50 % cap in the minutes-a-week schedule (high-maintenance state not shown there); MW filter
cleaning not scaled by bioload; Space bar habitat model (MA item 7, needs evidence-backed coefficients: research first, quote Nathan);
S174 perched herps can clip the glass; S170 bottom dwellers with no zone treated as swimmers; S181 Flex bulge limits (no slider, dry
substrate gap, light spill ignores bulge); S184 species table (/species-data.html, dev only) unverified as excluded from the build.

NATHAN CAN ARCHIVE (we can't): Coordinators 3-6 (after you take over), P1-P6b, SE, SE2, LO, ST, SQ, LF, SF, TV, PX, FT, MW, MA, MX, NB,
S164-S167, S169-S187 except S168 and S183 (S183 is the S165 policy chat; keep until MM lands), S185, S186.
Worktrees to clean after archiving (look at git status first): px (keep branch px), mw, sq, tv, lf, s166, s167, s187, ma, mx, nb,
compat-gates-3aa180 and musing-snyder-0e96c4 (old CG leftovers, 4 small real edits each, 129 behind: ask Nathan before removing),
ft-flaky-tests-e5f039 folder (git entry gone, Windows kept the folder).

IDs: next free S190. Lanes used today: FT, MA, MX, NB, MM (never reuse). Chats Nathan starts by hand land in the stale
C:\Users\nreed\Glass-Box-stocking (no .git); the lane prompts make them create their own worktree, which works. Hand-started side chats
that edit files there lose the work (S187 did): tell them to move (git worktree add .claude/worktrees/<id> -b <id> origin/main).

HOW TO WORK, changes from coordinator-6.md:
- Nathan asked for PASTE PROMPTS this time ("paste the prompts for the chats you recommend starting now"). Give one fenced line per chat,
  pointing at prompts/<file> with the git show fallback, and say "start it in C:\Users\nreed\Glass Box". Then title the chats he starts
  (`ID: Short Title`) and mention they may be on Opus (set_session_model on a chat we didn't start prompts Nathan).
- The auto-mode classifier blocks some chats' `git push origin HEAD:main` as a production deploy (S187). Never push for them: tell
  Nathan to approve in that chat or run the push himself (give the exact git -C ... push command).
- Pictures rule: when a chat asks Nathan about a layout, ask that chat to re-post with screenshots (SendUserFile) rather than relaying.
- Chats sharing one worktree (s165 hosted 7) ship in a stated order, each by path, waiting for the previous commit on origin/main.
- A background bash loop polling the deploy run by head_sha (30 s, 20 min cap) is the way to confirm a fix went live.
- Usage 2026-10-21 ~15:30 UTC: weekly all-models 42 % (resets Fri 2026-10-24 04:00 UTC), 5-hour 29 %, Fable 0 %. Research quotes:
  MW overran 2x (209 k vs 100 k), MX landed on quote by measuring one batch first: insist on the measured-batch quote.

STEP 1, take over: get_session "self", set_session_title "Coordinator 7"; in HANDOFF.md "Start here" replace local_cd7298f9 /
"Coordinator 6" with yours (protocol paragraph, "Current lanes" line) and in prompts/lane-MM-min-migration.md (MM reports there);
send_message MM, S188 and S168 your id; tell Nathan you're live and Coordinator 6 can be archived. End every reply with "Build N".
Hand off to coordinator-8 once this chat reaches about a third of its context, state first.
