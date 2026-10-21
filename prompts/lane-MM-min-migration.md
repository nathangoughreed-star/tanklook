You are lane MM: Tank Minimum Migration (Coordinator 6, session local_cd7298f9-aef8-4622-b47e-d9f3fcc54479, assigned this ID; never
rename the chat). Work in your own worktree: from "C:\Users\nreed\Glass Box" run
git fetch origin; git worktree add ".claude/worktrees/mm" -b mm origin/main; then work only in .claude/worktrees/mm.
If this file is missing there, git show origin/main:prompts/lane-MM-min-migration.md. Reply in US units (gal, in, sq in, deg F).

Read first: HANDOFF.md "Start here" (lane rules; run `npm run build` before EVERY push) and sections "S165: Tank minimum policy",
"Lane MA", "Lane MX"; research/tank-minimum-first-principles.md (the "Decisions" are binding); research/space-audit.md,
research/clearance-sweep.md, research/tank-minimum-sources.md; research/sourcing/decisions.md (proposals MX1-MX9 and Nathan's answers).

Precondition: Nathan answers MX1-MX9 in chat MX (local_8f720fdf). Check decisions.md first. Anything still unanswered: do not load
those numbers if they flip a pass / fail; list them and ask Nathan in this chat.

Scope (work unit 3 of 3: make the code follow the Decisions; src/scene/tankMin.ts is yours):
1. Load research/sourcing/tank-minimum/summary.json into the species data (via scripts/tank-min-sources.mjs or a generated data file):
   kind `min` + mark sourced = required; `rec` / `recommended` = the optional Recommended mark; `derived (est)` = derived; `advisory`
   never fails. Each value carries its provenance (src/data/provenance.ts; test/sources.test.ts ratchet must stay green).
2. Turn MA's `it.fails` into plain passing tests (test/minimum.test.ts), per HANDOFF "Lane MA" items 1-5:
   water never fails a species on its own (volume = advisory note + difficulty); the mystery snail's 5 gal becomes its Recommended mark;
   a floor area DERIVED from litres never silently fails a swimmer; bottom dwellers are held to a stated (sourced) length; the kuhli
   in a 2 in tray reads "not assessed", not a pass.
3. Depth field (Decision 4): required only where a source states a minimum water depth (MX found none), tank height = Recommended
   (angelfish 50 cm), morphology-only (discus etc.) = estimated advisory; usable depth = water level minus substrate, 90 % of height only
   as a labelled fallback. ADF max depth 24 in = advisory with the count picker.
4. Ball python (MA item 6): it passes no catalogue terrarium today because floor area is estimated from 450 L over 19.7 in of "water".
   Land animals must use their sourced footprint, never a litres-derived one.
5. Wording: "Recommended" mark (never "comfortable"); the amber note becomes "below the recommended size"; a derived failure reads
   differently from a sourced one ("estimated from a gallon figure"). AqAdvisor shape stays: say nothing when every species has its minimum.
Out of scope: the Space bar's habitat model (MA item 7: needs evidence-backed coefficients; note it as a gap); nitrogen / water-change
code (lane NB owns nitrogen.ts and the water-change lines of stocking.ts; chat S187 is changing snails' Space in stocking.ts).
Keep every consumer on the one evaluation (Fullness tile, tankfit.ts, whyAnimal, hard truths, demand warnings, swaps, starter stocking);
update test fixtures and locked examples deliberately, listing each moved number in your HANDOFF section.
Questions for Nathan about how a screen reads go in this chat WITH screenshots. No subagent fan-out.
Done = `npm run build` and the full suite pass, pushed (git fetch; git rebase origin/main; git push origin HEAD:main), a "## Lane MM"
HANDOFF section with gaps, then send_message the coordinator (local_cd7298f9-aef8-4622-b47e-d9f3fcc54479) a short report with the
build number.
