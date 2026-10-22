You are the new coordinator for the Glass Box parallel lanes, taking over from session local_c5a46899-38c9-4c95-9310-9f70ff941a97
("Coordinator 7"). You coordinate; you don't build features. Read coordinator-6.md "HOW TO WORK" and coordinator-7.md "HOW TO WORK"
(both still valid), then this file, which overrides them where they differ.

STATE FIRST (2026-10-22, build 1126, live site green at 27328ec):

RUNNING / OPEN
- S196: Expert Stocking Validation (local_4a7419c5-6623-43a7-bcd7-1b3e106ea149), worktree .claude/worktrees/s196 (3 uncommitted research
  files). Shipped d04cacc (water space: n_eff = n up to 10, 10 x (n/10)^0.85 above). Now building per-species territorial caps (warning
  only, never in the percent; shared territory across species = phase 2; Nathan yes 2026-10-21). WAITING ON NATHAN in its chat: dwarf
  gourami rule (1 scale with tank, FKW/Aquarium Source, S196 recommends; 2 one male; 3 no cap). Touches the stocking engine.
- S199: Dry-Tank Lamps on the Lid (local_4f569338), branch claude/lid-lamps-9806d8 bd75679, NOT pushed: waits for Nathan's push OK in
  its chat. Open items there: python example has no lid, LED clashes with the dome, lamp costs not in totals. No engine overlap.
- S166: Python Fish Compatibilities Origin (local_4fb7dfe3): land-vs-aquatic rule (ball pythons offered fish tankmates). Coordinator 6
  recommended yes; never answered.
- UF (local_eda2d645): research/rules-spec.md expected verdicts are UF's guesses until Nathan or the reviewer approves them. UF knows to
  route lanes to the coordinator (it once sent RF to retired Coordinator 5).

DONE BY COORDINATOR 7 (all verified ancestors of origin/main, deploys green): S190 collapsible animal checks, S191 half-inch arrows,
MM tank minimum migration (9df608f, 9db5367: tankmin.json red/green lines, bar back, kuhli case), S193 heater + plural, CB source
combining (91c4289 + corrections e3559d7: 139 combined values, Nathan's earlier decisions and MX tank rule kept), HB habitat model
(b431169: Space = max(water, floor), Water column + Floor bars, 15 sq in per inch of bottom dweller), S196 expert curve (d04cacc),
HC swimmer height curve (c2bc386, started by S206; sibling worktree C:\Users\nreed\Glass-Box-heightcurve, clean), S188 red minimum
warns + Continue stays on (36e2871, Nathan 2026-10-22), RF path 1 rule fixes (e90ac5c..27328ec: careNeeds.ts, "Group size:" label +
Tank verdict, sex/pairing inputs, builds merged by gear, adf max removed, adf 450 mm depth = hard limit with warning), and side chats
S197 wording, S200 substrate stones, S201 US units + pickable small tanks, S203 ramshorn.

GAPS worth a chat (none started):
- HC: 5 oscars read 73 % of the ~170 gal tank that holds one (oscar class may be too loose); paludarium starter seed 1 goes 22 -> 38
  animals and drops its ember-tetra school at the third stop.
- HB: floor numbers are calibrated, not per-species sourced; stocking-screen tank list and plan.ts still show one Space number;
  hardscape / paludarium land not subtracted from floor.
- MM: terrarium example shows red (3 White's tree frogs fail the corner terrarium on floor area; Nathan's rule = floor area): fix the
  example (18x18x24 rectangular or fewer frogs) needs Nathan's pick. LARGE_BODY_MM / not-assessed rule are assumptions.
- Older: NB 50 % cap missing from the minutes schedule; MW filter cleaning not scaled by bioload; S174 perched herps clip glass; S181
  Flex bulge limits; S184 /species-data.html build exclusion unverified.

WAITING ON NATHAN (outside chats)
- Shared checkout "C:\Users\nreed\Glass Box" is ~210 builds behind; 4 leftover edits block the ff (all safe to discard; plant3d.ts one
  breaks the moss growth test there, and previews read its launch.json):
  git -C "C:/Users/nreed/Glass Box" checkout -- .claude/launch.json src/render/plant3d.ts src/scene/items.ts src/scene/starter.ts
  git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main
- Branch sb2 (S194, duplicate of CB, 9e9eb4c): drop when Nathan agrees.

NATHAN CAN ARCHIVE: Coordinators 5, 6, 7 (after you take over), MM, MX, MA, CB, HB, HC, RF, ST, S168, S183, S188-S195, S197, S198,
S200-S206 (S199 and S196 stay open; S166 until answered). Worktrees to clean after archiving (look at git status first): mm, cb, hb,
rf (has an untracked shots-rf/ folder), s168, s190, s191, s193, plus the coordinator-6 list (px keep branch, mw, sq, tv, lf, s166, s167,
s187, ma, mx, nb, compat-gates-3aa180 and musing-snyder-0e96c4 ask first, ft-flaky-tests-e5f039 folder).

IDs: next free S207. Lanes used: FT, MA, MX, NB, MM, CB, HB, HC, RF (never reuse; the code list in coordinator-6.md HOW TO WORK too).

HOW TO WORK, changes from coordinator-7.md:
- Nathan starts most chats by hand now, many in the shared checkout or the stale Glass-Box-stocking folder. On every "check", list_sessions
  (limit 10-12) and title every untitled chat `S###: Title` at once; read last reports with list_events (limit 2-3, page back with
  before_uuid when it shows only "done").
- Work done in Glass-Box-stocking (no .git) never ships: S196 lost its first engine change that way until told to move. Check for it.
- A lane prompt handed to Nathan can get started twice (S168's "SB2" placeholder + CB). Fill IDs before handing a prompt out.
- When a lane changes engine numbers, ask for the moved-numbers table and read it for side effects before advising Nathan to push
  (S196's first curve raised singles 1.41x; caught and capped).
- Lanes Nathan starts may run on Opus (RF did); mention it.
- Usage was not re-checked by Coordinator 7 (get_usage before any new research fan-out).

STEP 1, take over: get_session "self", set_session_title "Coordinator 8"; in HANDOFF.md "Start here" replace local_c5a46899 /
"Coordinator 7" with yours (protocol paragraph, "Current lanes" line); send_message S196 and S199 your id; tell Nathan you're live and
Coordinator 7 can be archived. End every reply with "Build N". Hand off to coordinator-9 at about a third of context, state first.
