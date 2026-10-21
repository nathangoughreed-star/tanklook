You are lane MX: Tank Minimum Sourcing (Coordinator 6, session local_cd7298f9-aef8-4622-b47e-d9f3fcc54479, assigned this ID; never
rename the chat). Work in your own worktree: from "C:\Users\nreed\Glass Box" run
git fetch origin; git worktree add ".claude/worktrees/mx" -b mx origin/main; then work only in .claude/worktrees/mx.
If this file is missing there, git show origin/main:prompts/lane-MX-min-sourcing.md. Reply in US units (gal, in, sq in, deg F).

Read first: HANDOFF.md "Start here" (lane rules; run `npm run build` before EVERY push), section "S165: Tank minimum policy" and the
source-traceability sections (S168 / ST: provenance.ts, test/sources.test.ts ratchet, research/sourcing/decisions.md);
research/tank-minimum-first-principles.md, all of it, "Decisions" 1, 3, 4 and 5 are binding.

Scope (work unit 2 of 3: research only, NO changes to src/ data or logic; lane MM migrates later):
For every species in CARE (84), find the tank-geometry minimum a credible source states, per measure, kept separate:
footprint (length x width, or floor area, with the group size it assumes), length alone, minimum WATER depth (required) vs
recommended tank height (Recommended mark), and any gallon figure with its conditions (adult or juvenile, group size). Start the
depth list with tall-bodied / vertical species (angelfish, discus, others the shallow-tray case would wrongly pass); morphology-only
depth stays "estimated advisory". Known doubts to settle: swordtail (80 cm FishBase vs 120 x 30 cm Seriously Fish), kuhli loach
(80 L / 24 in, page never fetched), cleaner shrimp and royal gramma (no footprint sources found).
Rules (Decision 5): rank by credibility, then applicability, then specificity (footprint with stated group > length > gallons), not by
site. One credible applicable source is enough (mark "single source"); unstated conditions = (est). Never average. Conflicts over
~25 %, or any that flip pass / fail, go to research/sourcing/decisions.md as proposals for Nathan. A gallon figure may be converted
to geometry via a reference tank (the catalogue tank of that volume) only as DERIVED (est), keeping volume, url, reference tank, logic.

Output: research/sourcing/tank-minimum/<batch>.json (one row per species per measure: value, unit, url, quote under 15 words, conditions,
mark sourced / derived (est) / advisory) and a summary research/tank-minimum-sources.md.
COST GATE (CLAUDE.md): Sonnet subagents only. Run ONE batch (about 10 species) first, measure its tokens, then quote Nathan the
per-batch cost and the total in this chat and wait for his yes before the rest. Research lanes today overran quotes by 2x: quote
from the measured batch, not a guess.
Done = all species covered or listed as "no source found", decisions.md proposals written, pushed (git fetch; git rebase
origin/main; git push origin HEAD:main), a "## Lane MX" HANDOFF section saying what MM should take. Then send_message the coordinator
(local_cd7298f9-aef8-4622-b47e-d9f3fcc54479) a short report with token cost vs quote and the build number.
