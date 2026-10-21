You are lane CB: Source Combining (Coordinator 7, local_c5a46899-38c9-4c95-9310-9f70ff941a97, assigned this ID; never rename the chat). Work in your own
worktree: from "C:\Users\nreed\Glass Box" run git fetch origin; git worktree add ".claude/worktrees/cb" -b cb origin/main; then work
only in that worktree. If this file is missing there, git show origin/main:prompts/lane-source-combine.md. Reply in US units (gal, in,
deg F) with metric in brackets where the data is metric.

Read first: HANDOFF.md "Start here" (lane rules; run `npm run build` before EVERY push) and the "Source traceability" section (chat
S168's entries are the latest); research/sourcing/decisions.md; src/data/provenance.ts (the per-value batch loader: verdicts agrees /
COLLISION RULE (Coordinator 7): lane MM (local_a6c62452-7e37-4135-91e5-e598ab736ba2) owns src/scene/tankMin.ts and the tank-minimum data until it reports done. Build the script and combined.md now, but apply nothing to tankMin.ts or the tank-minimum fields until the coordinator tells you MM has landed; then rebase on origin/main first.
derived / kept, `use`, `decision`); src/scene/tankMin.ts (TIERS floor / comfort, MIN_WEIGHTS vol / area / run); src/data/sources.json
(each site's `kind`).

Goal (Nathan 2026-10-21): combine what the opened pages say instead of picking one page per value: weight the sources, and let pages
that give different units (a floor area / base, a volume, a length) each feed the measure they actually state. Deterministic, a script;
no new research and no model calls (the pages and checked quotes are already in research/sourcing/A1-A9, R1-R4, pilot-01, other/).

Design (agreed with Nathan 2026-10-21, chat S168):
1. Claims in their own unit. Parse each source's `states` into a claim: litres (gal x 3.785), base L x W cm (-> tank length mm and floor
   area cm2), full L x W x H (all three), a range (each end), a word (care / temperament level). A gallon figure never sets a length.
   Where `states` cannot be parsed, list it, do not guess.
2. Weights: sources.json `kind` primary / reference = 1, care sheets = 0.7, retailer = 0.5; a genus-wide or generic page (the batch
   note says so) x 0.5; one site counts once however many of its pages agree; only quotes the verifier found (exact / compact) count.
   Put the weights in one table at the top of the script, so Nathan can change them.
3. Combine: weighted median for numbers (robust to one odd page); ranges end by end; words by weighted vote. Keep the spread per field
   for the future "why?" link ("54 L (Seriously Fish 54, Fishkeeping World 57)").
4. Two tiers: when a field's claims are more than 1.5x apart, the low cluster is `floor` and the higher one `comfort` (tankMin.ts TIERS,
   today unsourced estimates). Example: danio, Fishkeeping World 10 gal (floor) vs Seriously Fish base 90 x 30 cm (comfort).
5. Status: combined from 2+ independent sites = derived, citing every page; one site = researched (one source). Our current number
   never votes; it only flags how far the result moves.
6. Output: research/sourcing/combined.md, ONE table of only the values that would change (field, ours -> combined, tier, sources with
   weights, spread), plus the parse failures. Nathan approves that table once; then apply it (data files + batch files, as decisions.md
   describes) and re-bless what moves (tests that lock starters / examples; say which numbers moved).
7. The 7 disagreements still open in decisions.md (R3 harlequin, syno; R4 mandarin max, discus / comet / axolotl temperatures) are
   settled by the combination, not by hand.

Context: Nathan cannot judge the biology himself ("trust the research, especially where independent sources agree"). 268 cited fields
rest on 2+ sites, 169 on one (26 of those changed our number). Unsourced on main: 491 of 5169 (9 %); keep the ratchet
(`GEN_SOURCES=1 npx vitest run test/sources.test.ts`).

Done = the script and its weights table committed; combined.md reviewed by Nathan; the approved values applied with provenance; full
suite and `npm run build` green; HANDOFF "Source traceability" updated (dated); pushed to main; report to the current coordinator.
