You are the new coordinator for the Glass Box parallel lanes, taking over from session local_e8a444fa-b53d-499f-aee5-caa8843ca028
("Coordinator 9"). You coordinate; you don't build features. Read the "HOW TO WORK" sections of coordinator-6.md, -7.md, -8.md and
-9.md (all still valid), then this file, which overrides them where they differ.

STATE FIRST (2026-10-26 ~15:00 UTC, build 1244, main e544a63, deploys green):

WAITING ON NATHAN (each yes goes in the lane's own chat; ids are full local_ ids)
- S220: Survey v4 Calibration Tooling (local_49e7af9c-1cd4-4395-a832-a913712db197): branch calib-v4, 3 commits over e544a63:
  ff4515d ("Too small" is its own verdict, Nathan's Q1), d562b3b and 99b9c6c (S227's note reading + first real v4 answers,
  chatgpt high 2). Suite 1357, no engine numbers move. Coordinator 9 recommends yes.
- S226: Soft-Water Fish Acceptable Ranges (local_74a4c558-4eac-4d09-994d-736a0153e48b): 75a9c6c on claude/zen-pare-e75cd5 over e544a63.
  Acceptable pH for neon, ember, rummy-nose, harlequin, marbled hatchetfish (one quoted source each); 19 pairs red -> amber; v4 A02 / A06
  unworkable -> problems; regenerations done. Coordinator 9 recommends yes.
- S228: Fine Now, Outgrows It in N Months (local_46450db6-9a28-48ff-a6ba-52e0091f9f54, nested under S227): branch s228, 3 commits over
  e544a63 (juveniles judged at size + growth, amber "for now, about N months", land herps get a planner tank list). OPEN: should land
  animals be held to tankmin.json red lines (tankMinimum skips !countsAgainstWater, on main too)? Ball python is picked a 50 breeder
  (36x18) against ReptiFiles 48x24; anoles / crested geckos / White's tree frog x1 get a 37 gal under their 18x18 / 24x24 lines. Picture:
  .claude/worktrees/s228/research/outgrows/land-herp-picks.png. Coordinator 9 recommends yes; a yes moves more numbers (new table).
  Its survey module E (juvenile tanks) goes to the calibration lane after calib-v4 lands.
- S229: Fullness Bars Ideal Line and Gradient (local_c449228a-70d5-45c6-bfb3-5f265a730a87, hand-started): branch ftg 124b5f6, 1 commit
  (line at IDEAL_MAX on the water / floor / filtration bars, green->amber->red gradient). Told to run npm run build + FULL suite and check
  S214's spaceBand at 74.6 / 74.99 / 100.4 before asking for the push.
- S222: Sump Follow-ups (local_c9ad6430-d676-41b1-ab59-d8c6b4fa0c37), worktree sf, branch s222 f2fcc45 (3D sump in the stand, doors
  open on click, sump on the floor when the stand is off, sizes that don't fit greyed out). It had stalled waiting for "any reply";
  Coordinator 9 sent "go" (not a push yes) at ~14:55: preview, screenshots to Nathan, rebase (16 behind), moved table (only the 125 gal:
  default sump 30 breeder -> 37 gal, 14 stockings, filtration -1..-2 points, least-work builds ~+$20), then ask.
- Rounds 1-3 vs v4: S221 says Nathan rejected the rounds 1-3 design; S216 kept round 3 live. Proposed (S216 agrees): retire rounds 1-3,
  stop extending them, keep their 4 answer files as held-out data for the v4 fit. Not answered yet.
- S216: Expert Calibration Rounds (local_264b779e-f6ea-4d39-8d33-6a55f3f6e3a9): one cosmetic commit on xc (fit report called round 3a
  "round 3"), push waits on Nathan. Fit on main: water 0.876, floor 1.014, held-out worse; NO global scale.
- SR: Stocking Rescale (prompts/lane-SR-stocking-rescale.md): not started; needs Nathan's yes to start WITHOUT its re-centring step
  (S216 owns global scales). Must also fix scripts/space-factors.mjs (drops SPACE_NUDGE / FLOOR_FACTOR / GROUP_GROW). Start it yourself
  (start_session, worktree sr, Sonnet) on his yes.
- S166 (local_4fb7dfe3-ca59-4c5c-beb2-4593465c827b): land-vs-aquatic rule (ball pythons offered fish tankmates). Never answered.
- S199 (local_4f569338-7c73-4fb1-a552-6036f0d4aad7, nested under local_51c92c78): lid lamps, claude/lid-lamps-9806d8 bd75679, 181
  behind main. Push yes still pending; needs a rebase.

RUNNING / OPEN
- S224: Rimless Imagitarium Tanks into Library (local_8d0c38dd-3da0-4bed-9764-26af53be675d): 8606dfc landed (rimless library tanks,
  g6c = Petco 11.49 in cube). Now the every-retailer catalogue (Nathan approved 6 research agents after a PetSmart pilot, 274k tokens).
  Worktree s223 has 4 uncommitted files; at 14:50 it looked idle mid Chrome call: check it. Its catalogue merge must: be its own commit
  with a moved-numbers table, store {regular price, checked date, sale {price, seenOn}}, fix the picker onSale label and tankfit's stale
  sale price. NEXT LANE after it (Nathan 2026-10-26 "ideally our tool would do a sweep every now and then for sales and to see if prices
  were still accurate"): a scheduled price sweep (Claude in Chrome; petco blocks WebFetch), commit per sweep for Nathan's yes. Propose it
  when the catalogue lands.
- S227: V4 Survey Calibration for Stocking Meters (local_6036cf1f-f118-4916-93c0-16bf75ffc62e): worktree calib-v4-notes has 7
  UNCOMMITTED files although S227 called it redundant; don't remove it until S227 is done. Its v4 review findings (one AI expert, leads
  only): one-degree shared temperature rule calls tanks unworkable where the expert says caution; big-animal minimums harsher than the
  expert (oscar 180 vs 75 gal, goldfish 40B vs 29, angel 75 vs 55); missing rules: leopard / crested gecko cohabitation, grazer food in a
  new tank, mandarin food. Candidate lanes once a human expert agrees; not started.
- S221 (local_47b5aef3-f9d8-485f-93d8-01ce5224b51d): survey v4 designer; nothing running.
- S196 (local_4a7419c5-6623-43a7-bcd7-1b3e106ea149): count-warning review; CW nested under it is done.

DONE BY COORDINATOR 9 (all verified on main): CW krib limit by length (8d3f117), S212 shrimp floor (44b48e4), S216 calibration lock +
one floorShare rule (ae5aab6, f52efb3), SU sump in tech (d3ab311), S222 heat loss / skimmer / no fixed min sump (77b4af6, df9e583),
kuhli chemistry d7b6c89 (S225), S220 survey v4 (7bc8536), S225 preferred + acceptable ranges and snail minimums (5b2a285, e544a63),
S224 rimless library (8606dfc), S214 otos (08046dc: water x0.63, GROUP_GROW 0.09 past 12, red grazing past 4x, spaceBand label fix).
HANDOFF lane rules extended (516482e, ae18210): after any engine change run GEN_RETABLE, GEN_RETABLE_V4, the fit in the exact file order
of test/calibv4.test.ts, and calib-review for rounds 1-3a; never hand-merge generated files (take main's, regenerate).

NATHAN CAN ARCHIVE: Coordinators 8 and 9 (after you take over), SU, CW, S212, S213, S214 (both parts), S215, S217, S223 (audit), S225,
and the hourly "Glass Box sidebar re-sort" chats. Ask before archiving S218 / S219 (never reviewed).
Worktrees to clean after archiving (git status first; all 0 ahead): fg, nt, oto-render, cw, su, xc, s225, vibrant-moser-c339ca,
wonderful-ellis-b34271, plant-propagation-e50e2c, p6bscape-e62f17, agitated-lumiere-a79eba (1 dirty file: look), plus
C:/Users/nreed/AppData/Local/Temp/su-base. Shared checkout: clean, up to date, one old autostash (the 4 known-safe leftover edits);
Nathan can `git -C "C:/Users/nreed/Glass Box" stash drop stash@{0}`.

IDs: next free S230. Lanes since coordinator 8: CW, CF, SU, SN, SR (never reuse).

HOW TO WORK, changes from coordinator-9.md:
- Sidebar groups are named "Glass Box: Active" (cg-353f4d2f-...) and "Glass Box: Inactive" (cg-daf0f22f-...). Nested chats move with
  their parent; a coordinator started from another is nested: detach_session "self" first, or archiving the old coordinator archives you
  (Coordinator 9 had to have Coordinator 8 detach SU).
- send_message needs the FULL local_ id; the short 8-hex form fails "not found".
- Chats rename themselves despite the rule (S221, S226 did): reset the title to `S###: Short Title`.
- Several calibration files are shared by every engine lane; whoever lands second regenerates (HANDOFF lane rule). Expect each push to
  trigger "rebase + regenerate + send differences" messages to every other waiting engine lane: send them at once after verifying.
- Hand-started chats keep landing in Glass-Box-stocking (no git) or the shared checkout; on each check, title and brief them (worktree,
  regenerations, moved table, Nathan's yes). A lane may stall waiting for "any reply" after a folder move: read its last report.
- Usage 2026-10-26 15:00: weekly all-models 15 %, Fable 7 %, resets 2026-10-31 04:00.

STEP 1, take over: get_session "self"; detach_session "self" if nested; set_session_title "Coordinator 10"; move into Glass Box: Active;
in HANDOFF.md "Start here" replace local_e8a444fa / "Coordinator 9" (protocol paragraph and "Current lanes" line) and commit from
Glass-Box-coord; send your full id to S220, S222, S224, S226, S227, S228, S229, S216, S196; tell Nathan you're live and Coordinator 9 can
be archived. End every reply with "Build N". Hand off to coordinator-11 at about a third of context, state first.
