# Expert calibration rounds (design, 2026-10-23, chat XC; branch `xc`)

Goal: a repeatable way to refine the stocking engine's numbers from expert opinions gathered over several randomized rounds,
so that hand tuning (SPACE_NUDGE) becomes a fit with a report instead of a multiplier.

Status: design + first slice built (scenario generator with tests, round-1 survey of 24 tanks, fit script proven on synthetic
answers). No engine number has moved; no real expert answer exists yet. Section 8 has what the build changed in this design.

## 0. The scale the experts answer on (Nathan 2026-10-23, in this chat)

- **75 % = ideal**: the stocking experienced keepers would aim for; healthy and comfortable for the long term with ordinary,
  consistent maintenance. Green up to here.
- **100 % = limit**: past it, long-term problems become likely (stress, aggression, water quality) even with good care. Not
  recommended beyond it (red).
- **75-100 %**: an ever increasing "tread carefully" (yellow).

This differs from the lane SR prompt on origin/main (fb2059e: 100 % = recommended capacity, yellow to 115 / 130). The survey and
the fit use the scale above; the two anchors are constants in one place (`IDEAL_PCT = 75`, `LIMIT_PCT = 100` in
src/calib/scenario.ts) so they follow whatever SR finally exports. S214 (2026-10-23) put the same cut in code as IDEAL_MAX = 75 in
scene/stocking.ts (on main as 7d6325e; NEAR_FULL equals it; src/calib/scenario.ts imports it); the basis: published lists read a median 74 % at their own maximum counts.

## 1. What can be fitted (checked against main fb2059e)

| parameter | where | now | provenance | in the fit? |
|---|---|---|---|---|
| SPACE_FACTOR, 55 species rows | data/spacefactor.ts | 0.29-3.36 | fitted to AqAdvisor one-species tanks (SE2, 2026-10-20) | yes: per-species log multiplier `d_j` |
| SPACE_FACTOR_CLASS, 5 classes | data/spacefactor.ts | tiny 1.47, mid 0.93, big 1.45, invert 0.48, amphibian 0.56 | medians of the rows | yes: per-class `c_k`; species without a row use only this |
| TINY_EXPERT | scene/stocking.ts | 0.8 (fish < 2 g) | grid on 34 published lists | folded into the tiny class `c_tiny` |
| SPACE_NUDGE | data/spacefactor.ts on branch s214 only (aa426e8) | discus 1.435 | Nathan's hand target, 6 discus in 55 gal = 85 % on the old scale | retired: becomes a golden row (section 5) |
| SPACE_PER_L | scene/stocking.ts | 1.564 x 0.9374 / 3.96 | AqAdvisor fit, re-centred twice on the published lists | yes: global `g` |
| FLOOR_SQIN_PER_IN | scene/stocking.ts | 15 | sources 12-24 | yes: global floor `f` (6 of the 24 round-1 tanks are floor-bound) |
| FLOOR_FACTOR | data/spacefactor.ts | kuhli 0.6 | estimate | round 2 |
| SCHOOL_EXP / SCHOOL_REF | scene/stocking.ts | 0.72 / 10 | AqAdvisor six-answer fit | not fitted (structural; the fit holds it). Checked instead: the ratio of each expert's limit count to ideal count is a direct test of the curve (section 4) |
| SPACE_EXP, height curve HS_* | scene/stocking.ts | 0.45 / ... | AqAdvisor fit / Nathan's call | no |
| LU_PER_L | scene/stocking.ts | 0.3 | starters only | **no**: since SE2 the filtration % comes from scene/nitrogen.ts (ammoniaPercent), not LU_PER_L |
| filter capacities | data/tech.json `capacity`, nitrogen.ts MEDIA_RATE / THROUGH / HEADROOM | | estimates | later, filtration rounds (section 3) |
| NEAR_FULL = 85 | ui/fullnessTile.ts | 85 | UI cut | **no**: a definition, not a parameter. Replaced by the 75 / 100 anchors above |

Hierarchy (log scale, relative to today's values, so 0 = no change): a species factor is
`today x exp(g + c_k(j) + d_j)`. Priors: `d_j ~ N(0, 0.10^2)` shrinks a species toward its class, `c_k ~ N(0, 0.15^2)` shrinks
a class toward the AqAdvisor fit, `g ~ N(0, 0.3^2)`, `f ~ N(0, 0.2^2)` (widths chosen on synthetic rounds, section 8). A species with no data does not move except with its class and `g`.

Why multipliers on today's values and not new absolute values: today's values already carry AqAdvisor, the 37 published lists and
the kuhli / nano checks. The prior IS that history; the experts move it only as far as their answers justify.

## 2. Question formats (what the survey asks, per tank)

Experts never see the engine's percent. They see a front render (sparse decor, every animal visible; Nathan 2026-10-23), the
dimensions, gallons and litres, each species with count and adult length, and "assume ample filtration and weekly water changes;
judge room only".

1. **Band** (ordinal): at or under ideal / past ideal, tread carefully / not recommended. Cut points at 75 and 100.
2. **Ideal count**: "keeping the others as shown, how many <focal> would be ideal here?" -> that count should read 75 %.
3. **Limit count**: "how many <focal> at most before long-term problems become likely?" -> that count should read 100 %.
4. **Together?** (mixed tanks only): yes / with caution / no, which pair in the note. Not fitted: compared with the compatibility
   gates (Nathan 2026-10-23: "use the compatibility gates to include both species-only and mixed species tanks so we can assess
   those rules as well").

The counts are the most informative and the cheapest to fit (two exact anchors per tank); the band catches answers given without
counts. Pairwise ("which tank is fuller?", Bradley-Terry on the difference of log %) and free percent stay in the fit's
vocabulary but are not asked in round 1.

Filtration is not asked in round 1: the scenario fixes ample filtration. A filtration round fixes the room instead (a big tank,
few large messy fish) and names the filter; it waits until the filtration scale is settled (SR step 4).

## 3. Rounds

Generator: `src/calib/scenario.ts`, seeded (mulberry32), deterministic for a given seed and engine.

- **Kinds**: about 40 % one species, 40 % mixes the compatibility gates pass (`compatRisks` null, temperatures overlap),
  20 % mixes the gates flag (`concern` or `high`), to test the gates.
- **Tanks**: the standard US sizes 10-125 gal (the published-list table in test/expert.test.ts). Every species must pass
  the tank minimum (`tankMinimum`: percent <= 100, not too short, not too deep), so "tank too small" never masquerades as stocking.
  Each species meets its group minimum (`groupShort`).
- **Where to ask**: species are weighted by information need, `1 / (1 + answers so far)`, doubled for species with no own
  SPACE_FACTOR row (they ride on a class factor). Counts are set so the engine's reading lands near the anchors: a target drawn
  half around 75, half around 100 (log-normal, sd 0.25), then the focal species' count solved for it.
- **Per round**: ~20 fresh tanks + ~10 % repeats (the same tank again, later in the order, to measure each expert's own
  consistency) + ~10 % held-out anchors (a fixed pool from its own seed, the same every round, never fitted, to measure fit) +
  Nathan's goldens.
- **Engine table**: for each tank the generator stores, for every focal count 0..nmax, each species' water-% contribution and the
  floor %. The fit recomputes any reading under new multipliers from this table without running the engine.

Files per round: `research/calib/round-N.json` (scenarios, tables, share links), `research/calib/round-N/*.png` (renders),
`research/calib/survey-round-N.html` (the single file sent to experts), `research/calib/answers/round-N-<expert>.json`
(what comes back), `research/calib/fit-round-N.{json,md}`.

## 4. Fit (`scripts/calib-fit.mjs`, plain node, no dependencies)

Reading of tank s at focal count n under parameters theta:
`W_s(n) = sum_j today_contribution_sj(n) x exp(g + c_k(j) + d_j)`, `L_s(n) = log max(W_s(n), F_s(n))`.
(Ranks in the school curve are held at today's order; after a fit the real engine re-reads every tank and the script reports the
largest disagreement, which must stay under 1 point.)

Likelihood per answer of expert e, with bias `b_e` (sum over experts = 0, so the experts' mean sets the scale) and noise `s`:
- ideal count n: `L_s(n) - log 75 - b_e ~ N(0, s^2)`; limit count: `L_s(n) - log 100 - b_e ~ N(0, s^2)`.
- band: ordinal logit, `P(y <= k) = sigmoid((cut_k - L_s - b_e) / (s x 0.55))`, cuts log 75 and log 100.
- pairwise (later): `P(A over B) = sigmoid((L_A - L_B) / s)`.
- `s` is set from the repeats (pooled within-expert sd of log implied %), floor 0.10; 0.2 before any repeats exist.

Minimised: negative log-likelihood + the priors of section 1, by BFGS with an analytic gradient. Each round may move a
parameter by at most x1.25 (`|delta| <= log 1.25`); a capped parameter is reported.

Report (`fit-round-N.md`): held-out anchor error (rms of log %, before / after), inter-expert disagreement (sd across experts on
the same tank, bias removed), each expert's repeat consistency and bias, every parameter that moved more than 5 % with its
answer count, the capped ones, the limit / ideal count ratio against the engine's (tests SCHOOL_EXP), and the compatibility
table (gate verdict vs expert verdict, per pair).

Stop rule: when held-out error is within inter-expert disagreement (x1.1), further rounds cannot improve the fit, only the experts.

## 5. Provenance

- Fitted multipliers go to `src/data/expertfit.json` (`round`, `date`, `g`, `class`, `species`, each with answer counts),
  multiplied into `spaceFactor()`. The AqAdvisor table stays as it is (it is the prior). One provenance rule:
  status 'fitted', basis 'derived', src ['expert-round-N'], sources.json gets the round with its experts (names only with consent).
- Goldens (`research/calib/goldens.json`): Nathan's own targets, each restated on the 75 / 100 scale. They are fit rows with
  heavy weight AND vitest oracle cases (test/calib.test.ts reads them against the engine with a tolerance). SPACE_NUDGE retires
  into its golden: "6 discus in a 55 gal" needs restating, since 85 % meant "just inside yellow" on the old scale.
- scripts/space-factors.mjs rewrote spacefactor.ts whole and dropped FLOOR_FACTOR (and SPACE_NUDGE on s214). Fixed in this
  slice: it keeps everything after the generated SPACE_FACTOR table.

## 6. Tooling

- Survey: one self-contained HTML per round (renders inlined, no network, no install). Answers autosave in the browser;
  "Export answers" downloads a JSON file the expert sends back.
- Renders: each tank's share link opened in the app (dev server), panel and Fullness tile hidden, front view captured.
- Fit: `node scripts/calib-fit.mjs research/calib/round-1.json research/calib/answers/*.json`. No Python, no model calls.
- Synthetic check: `node scripts/calib-synth.mjs` makes experts with known biases and noise from a known parameter shift;
  the fit must recover it (test/calibfit.test.ts).

## 7. Open

- The scale differs from the SR prompt (section 0); SR and this lane must use the same two anchors.
- Who the experts are, and how many per round (3-5 gives a usable disagreement estimate).
- Goldens: the discus golden stays as it is (6 discus in a 55 gal = 85 %, now in the caution band; S214 2026-10-23). The other
  old-scale targets (FLOOR_FACTOR kuhli, the S196 / HC / HB test targets) still need restating on the new scale.
- Round 2: a plainer substrate for the renders so small bottom fish stand out; per-species FLOOR_FACTOR, pairwise questions, information weights from round 1's answer counts; renders scripted (now by hand).

## 8. Built 2026-10-23 (slice 1): what changed against the design above

Files: src/calib/scenario.ts (generator), test/calib.test.ts (9 tests; `GEN_CALIB=1` writes research/calib/round-1.json),
scripts/calib-fit.mjs, scripts/calib-synth.mjs, test/calibfit.test.ts (4 tests), scripts/calib-survey.mjs,
research/calib/round-1/*.png (24 renders), research/calib/survey-round-1.html (4.4 MB, the file for experts),
research/calib/fit-round-1-synth.md (the synthetic check's report).

Commands, in order:
1. `GEN_CALIB=1 npx vitest run test/calib.test.ts` -> round-N.json (scenarios, engine tables, share links).
2. Renders: open each share link in the dev server, hide the panel overlays, capture the front view to round-N/<id>.png (done by hand
   with the browser pane in slice 1; about 5 s a tank).
3. `node scripts/calib-survey.mjs research/calib/round-1.json` -> survey-round-1.html.
4. Answers back: `node scripts/calib-fit.mjs research/calib/round-1.json research/calib/answers/*.json` -> fit-round-1.{json,md}.
5. Synthetic check: `node scripts/calib-synth.mjs`.

Changes found while building:
- **Priors tightened** (0.25 / 0.20 -> 0.10 / 0.15 for species / class). With only an ideal and a limit count per tank, a tankmate held at
  one count trades off against the focal species; at 0.25 the noisy fit recovered species worse than no fit at all. At 0.10 the focal
  species' error halved on four seeds (0.034 vs 0.074 unfitted).
- **Floor fitted from round 1** (global `f`), not round 2: a quarter of the tanks are floor-bound.
- **Smooth max** of water and floor in the fit (log-sum-exp, k = 50; at most 1.4 % above the engine where the two are equal): BFGS
  stalled on the hard max's kink.
- **Generator filters**: no tank that trips a fighting limit (`crowdWarnings`: 43 pea puffers would be judged on aggression, not room);
  at least 3 of the focal species (2 vs 3 fish is a 50 % step, mostly rounding); the target reading clamped to 50-150 %.
- **Count rounding** enters the fit as extra variance (log step between neighbouring counts, squared, / 12).

Synthetic check (5 experts, bias -8..+7 %, noise 0.12; truth water x0.9, floor x1.1, tiny +15 %, ember +20 %):
species multiplier error 0.045 vs 0.077 with no fit; ember recovered x1.23 (truth x1.24); held-out anchors 0.138 -> 0.120 against an
expert disagreement of 0.109. A pure global shift (x0.9) comes back x0.91 and the experts' biases within 0.03. A mixed shift is only
partly recovered for the mid class (x0.96 vs x0.90): 24 tanks give it few clean answers. That is the case for more rounds.

Round 1 as generated (seed 1): 20 fresh tanks (8 one species, 8 passing mixes, 4 flagged), 2 anchors, 2 repeats; 10-125 gal. It already
shows engine readings worth an expert's eye, e.g. 90 otocinclus in a 55 gal read 111 %, 126 embers in a 40 gal 93 %.

Render limits: otocinclus render but blend into the gravel (f13, f19; checked in chat "Otocinclus invisible in the 3D view", no bug); amano shrimp are nearly
transparent at survey scale. The survey tells experts the animal list is what counts.

## 9. The working process: batches, review, broad changes (Nathan 2026-10-23)

Nathan: "do maybe 10-20 tanks and stocking combinations within a certain expected stocking band, give opinions on every one of them,
write that up into a doc, then we make broad changes through pattern recognition. Then make that process iterative."
His choices: he gives the opinions himself, through the survey; the band is spread (about 50-130 %, round 1 reaches 150 on three tanks).
This is the main loop. The fit of section 4 stays as a cross-check on the patterns, not the decision.

One iteration:
1. **Batch**: a round of 10-20 fresh tanks plus a repeat or two (round 1: 20 fresh, 2 anchors, 2 repeats, already rendered).
2. **Opinions**: Nathan answers research/calib/survey-round-N.html and exports the JSON into research/calib/answers/.
3. **Write-up**: `node scripts/calib-review.mjs research/calib/round-N.json research/calib/answers/round-N-<name>.json` writes
   research/calib/review-round-N-<name>.md:
   - tank by tank: the engine's reading and band, his band, the engine's reading at his ideal and limit counts, and the "fix"
     (the multiplier the engine's reading needs to match him);
   - patterns: the median fix by body class, zone, floor or water bound, one species or a mix, tank size and school size, flagged at
     3+ tanks and more than 15 % off;
   - his repeat consistency, and the compatibility gates against his "keep together?" answers.
   Claude adds a hand-written "## Findings" section (kept on reruns): the patterns, the broad change each suggests (a class factor, the
   school curve, the floor scale, a zone), and what the next batch should test.
4. **Change**: Nathan approves the broad changes. They go into the engine with provenance (src 'expert-round-N'), and the tests
   re-bless.
5. **Next batch**: the generator weights toward the groups that were flagged or thin, and the next round starts from the changed
   engine.

Notes:
- The limit / ideal count ratio is reported for one-species tanks only. In a mix the tankmates already take much of the room, so a
  small difference of opinion moves the count a lot. Even on one species it is a noisy statistic: read it over several rounds, not one.
- Test: test/calibfit.test.ts "calibration batch review" (a known global shift reads back in the median fix; an expert who agrees with
  the engine gets no flags).

## 10. Survey v2 and round 2 (Nathan 2026-10-23, after answering 5 round-1 tanks; relayed by chat S214, approved from a mockup)

**Why.** Round 1's renders biased the answers: camera and zoom change how crowded a tank looks, decor and substrate how busy it
feels (the otos and amanos showed it). And one overall answer only informs the larger of the engine's two dimensions.

**Round 1's answers** (Nathan, 5 tanks: research/calib/answers/round-1-ngr.json) stay as data, tagged `picture: true`. f5 holds the
new answer type "no valid count with the fixed inhabitants" (the 19 cm synodontis alone makes the tank too small; 0 would say the rest
is fine); f20's shrimp limit is "not assessable" (grazing and food set it). Both are stored as `countStatus`, not as missing or 0.
round-1.json and survey-round-1.html are frozen: the generator has changed since, and his answers are tied to those tanks.

**The screen** (scripts/calib-survey.mjs -> research/calib/survey-round-2.html, 23 kB): a text card (tank L x D x H, gallons, floor
area; a filter stated as never the limit; no plants, a few rocks; each species with count, adult length and what the engine counts it
on: water, floor + water, or water + floor half the time). Questions per tank:
1. floor room (only when there are floor animals), water column room (only when there are swimmers), overall: ideal / caution / problems;
2. what limits the room first: a species, or "not room: habitat or compatibility decides it";
3. is the tank big enough for each species at all (yes / no);
4. ideal and "at most" counts for the focal species, and an ideal count for one tankmate; each count can be "can't say" or "no count
   works with these tankmates";
5. keep together (mixes), confidence (low / medium / high), would dense plants and cover raise the counts (the same / a little / a lot).
"Import answers" restores this round's file or carries an earlier round's (it goes out with the export). No schematic in round 2
(Nathan: text only); the picture effect can later be measured by splitting experts between picture and text, not by one expert
re-answering (he remembers his answers).

**Round 2** (src/calib/scenario.ts, seed 2, research/calib/round-2.json): 16 slots: 6 floor-tight (bottom dwellers fill the floor),
6 water-tight (schools, tall-bodied fish), 4 both tight; 2 pairs (the same stock in two footprints of the same gallons: 20 high vs
20 long, 40 breeder vs 40 long; tests Nathan's f12 note that footprint matters more than height); 1 held-out anchor; 1 repeat:
22 tanks. Every species meets its *recommended* minimum tank, not only the red line (the f5 fix). Shrimp are never the focal species
or the main school (they stay as tankmates), so no limit count is asked of an invert.

**The fit** (scripts/calib-fit.mjs):
- each count on the dimension its species fills: floor for bottom dwellers, water for swimmers (and shrimp), the larger for "all"-zone
  fish; the tankmate count through its own engine table;
- floor and water bands on their own dimension, the overall band on the larger; a round-1 band on the larger only;
- left out: tanks answered "not room", and tanks the expert called too small for a species (those are tank-minimum answers);
- a count where both dimensions sit near the anchor (both at 80 % of it or more, within 20 % of each other) is flagged and weighs half;
- confidence weighs 0.5 / 1 / 1.5; every expert, Nathan included, has a bias term (one expert among several, not ground truth);
- rounds fit together (`combine`: ids "<round>:<id>"), and a round-1 file carried inside a round-2 export joins round 1 once;
- the report adds the max-rule check (does the overall follow the tighter of floor and water? if not, the engine's "larger of the
  two" needs revisiting) and lists the ambiguous and left-out answers.
Synthetic round 2 (5 experts, noise 0.12; truth water x0.9, floor x1.1, tiny +15 %, bronze cory +20 %): floor x1.093, species error
0.038 vs 0.059 unfitted, held-out 0.149 -> 0.128. A floor-only and a water-only shift each come back within 5 % and leave the other
dimension alone (test/calibfit.test.ts "calibration fit, survey 2").

**The review** (scripts/calib-review.mjs) reads survey 1 and 2 files: per tank engine water / floor next to the floor / water / overall
answers and the counts; patterns now by the engine's tight dimension too; the max rule; what limits the room (vs the engine's biggest
contributor on the binding dimension); "too small" answers (each a tank-minimum disagreement); the pairs side by side; confidence and
plants; the notes, below the tables.

**Survey 2.1 (2026-10-23, after a dogfood answer from ChatGPT on f10: 11 marbled hatchetfish, 8 honey gouramis, 8 chili rasboras in a
40 breeder).** It answered "not room", gave no counts at all ("no suitable count as shown: habitat needs correcting") and overall
"problems" against water "caution". Nathan asked whether experts should be forced to give numbers: no, a forced number from an expert
who thinks none works is invented data. The answer showed four survey flaws, fixed:
- the decor line ("no plants; a few rocks") made habitat a limit, while the engine does not count decor in room. Now "furnished as these
  species need (plants, cover, sight breaks): never the limit", like the filter; the plants question flips to "in a bare tank, your
  counts would be the same / a little lower / a lot lower" (`bare`), which still measures the cover effect;
- the status option was "no count works with these tankmates"; its reason was habitat. Now "no count works as described" (same stored
  value, `no-valid-count`);
- "overall" mixed compatibility into a room answer. Now "Overall room, as shown", with compatibility pointed to "keep together";
- the "water" tag hid that hatchetfish and honey gouramis share the surface. The tag now says "water, near the surface" or "water column".
Who is answering is asked (`expertKind`: keeper, professional, AI model): an AI model is one expert among several with its own bias,
and the fit report shows the kind next to each expert.
Its other catch is a data question for the engine, not the survey: chili rasbora `tl` 35 mm in species.json, where *Boraras brigittae*
reaches about 2 cm (a standard vs total length mix-up?). Mass goes with length cubed; its AqAdvisor space factor (3.36) was fitted at
that length, so the two partly cancel. Proposed as its own audit (all species' lengths), not changed here.
The 8 honey gouramis passed the fighting check because the honey gourami has no territory rule (data/groups.ts): a gap for the
territory lane, recorded here.

**Survey 2.2: no dropdowns (Nathan 2026-10-23).** LLM experts get the survey as a screenshot, so no option may hide in a menu.
"Answering as" is three buttons; under each count box a dashed line "or, instead of a number:" holds "Can't say" and "No count
works as described" (picking one clears the number, typing a number clears it, clicking it again unselects it). Stored answers
are unchanged (`status`, `expertKind`), so earlier answer files still import.

## 11. Round 3: tank sizes people keep, survey v3 (Nathan 2026-10-23)

Round 2 drew every standard size alike, and the fit gate (every species at its recommended minimum) turned failed draws in small tanks
into retries that landed in big ones: none of its 22 tanks was 10 or 15 gal, 40 gal came up 8 times, the median was 40 gal. Nathan
caught it 11 tanks in. Round 3 (`makeRound({ seed: 3, sizes: SIZES_R3 })`, research/calib/round-3.json) fixes the 16 fresh tank sizes:
10 x3, 15, 20 high x2, 20 long x2, 29 x3, 40 breeder x2, 55 x2, 75. Each size keeps its tank and redraws the species, relaxing the slot
(flagged mix to passing mix to single) before giving up; a 5.5 gal nano was tried and dropped (every fish's recommended minimum is
above it). With the pairs, the anchor and the repeat: 20 of 22 tanks are 10-55 gal. Panda corydoras is the focal species in 7 of
them (it is one of the few floor fish that fit 10-30 gal at its recommended minimum): a known skew.
Survey v3 (survey-round-3.html) comes from the round-2 notes of an AI-model expert (research/calib/review-round-2-ngr-ai.md): counts
labelled by the band line they mark with the others held, animals' assumptions stated (adults, no breeding, sexes as chosen), every
species in the water-column question, food named as a non-room limit. Round 2 is closed (its survey stays at 2.2). The fit reads a
reviewer's `review.skip` / `review.set` on an answer and lists what was set aside.
**Round 3 rebuilt on the length audit (aeda1f5, same day).** Same seed and sizes; the new lengths and 22 refitted factors redraw every
tank (still 20 of 22 at 10-55 gal). The anchor holds round 2's stock (87 harlequin + 28 rummy-nose, `anchorStock`), read under today's
factors (66 % space; the free draw had moved to 171 harlequins). Round 2's tanks are frozen: GEN_CALIB no longer rewrites
round-2.json (GEN_CALIB_R2=1 does); its engine tables are still the pre-audit ones, a question for the fit.

## 12. Engine tables on the current engine (chat XC, 2026-10-23, after the length audit)

**Rule.** A round's tanks and counts are frozen once answered: the answers are about them. What the engine reads of them is not:
after any engine change (a length, a factor, a curve) the fit must compare the answers with today's engine, not with the engine
the round was drawn on. So the readings live apart from the round: `research/calib/tables/round-N.json` holds, per tank, the
reading as shown and the focal and tankmate tables, recomputed by `GEN_RETABLE=1 npx vitest run test/calibtables.test.ts` (about 45 s
for rounds 1-3). scripts/calib-fit.mjs and scripts/calib-review.mjs use it by default (`withTables`; `--as-made` fits on the stored
readings) and say which they used. A lock in the same test re-reads each tank as shown on every suite run (one engine run per tank)
and fails when the engine has moved without a retable.

**What the length audit moved** (aeda1f5: 11 lengths, 22 refitted space factors). Tanks whose reading as shown moved more than 5 %:
round 1: 13 of 24 (up to 76 %); round 2: 9 of 22 (up to 81 %); round 3: none (built on it). Fitting rounds 1-2 on their stored
readings would have compared the answers with an engine that no longer exists.

**First fit on today's engine** (rounds 1 + 2: Nathan's 5 round-1 tanks with pictures, the AI model's round-2 export; 53 answers):
water x0.83, floor x0.85, but the held-out error rises (0.299 -> 0.498; on the stored readings it fell, 0.113 -> 0.049). The held-out
tank is round 2's anchor, 87 harlequins + 28 rummy-noses in a 125 gal: the audit took it from 97 % to 66 % (harlequin's refitted
factor). The AI's counts on it now read low (ideal 70 -> 59 % against 75, limit 110 -> 75 % against 100; before the audit 85 % and
112 %): on this tank the expert says the new engine reads too empty, while the fitted tanks pull the water scale down. One tank, one
AI expert: a flag for the harlequin refit, not a result. **Nothing is applied**: two experts (one an AI), no repeats answered yet, no
inter-expert overlap. The fit becomes decision material once round 3 has answers from people.

## 13. Builds: answers tied to the tanks they answered (chat XC, 2026-10-23)

**What happened.** ChatGPT's first round-3 answers (5 tanks, forwarded by S214) were about round 3 as first published (8a609a8). Round 3
was then rebuilt on the length audit (91a51bb) under the same tank ids, and every tank redrew. Matching answers by round and id put
2 of the 5 on tanks with other species (f12: rummy-noses became platies; f14: bristlenose + otos became bronze cory + hatchetfish) and
the other 3 on tanks with other counts. Nothing in an answer file said which tanks it answered.
**Fixed.**
- `research/calib/round-3a.json` (and survey-round-3a.html) keep round 3 as first published, frozen, `label: "3a"`; its answers live in
  answers/round-3-chatgpt.json and its review in review-round-3a-chatgpt.md. It has a tables file like every round.
- A round's **build** is a hash of its tanks (`buildOf` in calib-fit.mjs; round 3: 859f1696, round 3a: 84910225). Survey 3.1 carries it
  into every export; saved progress or an imported file from another build is set aside (carried in the export), never loaded onto
  these tanks. Files without a build (everything before 3.1) are matched by their answers' species and tankmates.
- The fit joins each answer file to the round whose tanks it answered (`answersFit`), never by round number alone, and lists files
  that fit no round. The review refuses a file that does not answer the round given.
- Round 3 is frozen now that it is answered: `GEN_CALIB` no longer rewrites it (`GEN_CALIB_R3=1` does, only for a new round). An engine
  change re-reads it (`GEN_RETABLE`), it never redraws it.
**S214's readings of the ChatGPT notes**, stored as `review` on the answers: f1's "not room" was the pea puffer's compatibility, its
counts are room answers (`review.set.limits = null`; the fit now reads `set.limits` before it skips a tank); f14's "no count works" is
an ideal of 0 bristlenoses (the 45 otos alone are Ideal; the 1:3 ratio allowed only 0, 4, 8), shown as "0 (on review)", not fitted.
**Survey 3.1 wording** (S214, from the same notes): the M:F split is kept "roughly, rounded as you would stock them"; "not room" is habitat
or food only (compatibility goes in "keep together"); 0 is a valid count ("enter 0 if even one would pass the line").
**Reviews**: calib-review.mjs no longer overwrites a hand-written review (it writes `.generated.md` beside it). S214's hand-written
round-2 review, overwritten once, is restored as review-round-2-ngr-ai-notes.md.
**Fit on rounds 1, 2 and 3a, today's engine** (fit-round-1-2-3a.md): water x0.80, floor x0.85; held-out error 0.273 -> 0.521 (worse,
as in section 12). ChatGPT's round-3a counts read the engine too full on 3 of 5 tanks (median fix -15 %). Not applied.

## 14. Round 3, first full answer set: chatgpt-high (2026-10-23, forwarded by S214)

ChatGPT at a higher reasoning setting answered all 22 tanks of round 3 (build 859f1696, matched by species: the export predates the
3.1 stamp). Stored as answers/round-3-chatgpt-high.json with S214's readings: p1b's "molly: tank too small" contradicts its own note
(the 48 in length is praised; same 12 / 19 as the 40 breeder) and is read as a misclick (`review.set.bigEnough`, which the fit and the
review now honour); f16's krib counts and its floor / overall bands are territory answers (pairs defend bottom territories), set aside
from room. The krib territory rule (groups.ts) let 10 kribs in a 75 gal through `crowdWarnings`: an engine data question for Nathan.
Review (review-round-3-chatgpt-high.md): water reads too full (water-tight tanks median fix -7 %; on water bands the engine is a band
fuller on 9 of 21), floor reads too empty (floor-tight +11 %, mid-size fish +21 %, both-tight +21 %, flagged). The max rule held on all
15 tanks with floor, water and overall answers (26 of 26 across all experts). Panda thresholds are consistent: 12 / 18 on a 30 x 12 in
floor whatever the height, 15 / 22 on 36 x 12 in.
Fit, all rounds and files (fit-round-1-2-3a-3.md): water x0.84, floor x0.87, tiny fish -10 %, mid +11 %; fitted error 0.280 -> 0.209,
held-out 0.232 -> 0.375 (worse again). Three of the four experts are AI models (chatgpt, chatgpt-high, ngr-ai, possibly one model at
different settings: Nathan to confirm), and no tank has two experts' answers yet. **Nothing is applied** (Coordinator 9: no global scale
until round 3 has human answers and Nathan's yes).
Open: a count past the end of a tank's engine table (ngr-ai 2:f9, 40 guppies vs a table to 36) is skipped, though it says the engine
reads far too full there; the tables should run further, or the fit should read such a count as "at least the last row".

## 15. Mix labels follow the app's temperature gate (2026-10-23, from S214's finding)

S214 traced the white cloud + neon and white cloud + bristlenose mixes that round 3 labelled "passing": the app is right, the generator
was wrong. The app blocks a single shared degree (white cloud 16-22 °C, bristlenose 22-27: 'single') and warns on a narrow overlap
(white cloud with neon 21-22 °C: 'narrow'); the generator only rejected no overlap at all. `gateOf` (scenario.ts) now judges a mix as the
app does (compatRisks, plus none / single = high, narrow = concern; only a broad overlap is clean) and is used by the draws and by the
pinned anchor (87 harlequins + 28 rummy-noses: narrow, so a flagged mix). Passing-mix slots take more tries (2000, the flagged-to-passing
fallback at 1000). Frozen rounds keep their stored labels; the tables files now carry today's gate per mix, which the reviews use.
Labels that change on today's rules: round 1: 7 mixes ok -> concern; round 2: 4; round 3: 6 (f11 and its repeat r1 -> high); round 3a: 3.
"Keep together" against today's gates: ngr 2 -> 3 of 4 agree, chatgpt-high 5 -> 7 of 12, chatgpt (3a) 2 -> 1 of 3, ngr-ai 3 -> 0 of 7
(it answered "yes" to the narrow-range mixes). So the AI experts split on whether a 1-2 °C shared range is a concern: evidence for the
temperature gate's narrow band (NARROW_C = 2 in temprange.ts), Nathan's call, not changed here.

## 16. One fit over rounds 1-3 and v4 (S216b, 2026-10-26)

Decisions (Nathan 2026-10-26, via Coordinator 10): rounds 1-3 answers stay in at full weight (1.0, like v4's) in one fit with v4; the
AI-model experts (ngr-ai, chatgpt, chatgpt-high, v4 chatgpt high 2) count as ONE source (`--one-ai`: one bias term); round-1-ngr (Nathan, 5 tanks,
pictures) is the second, human source. Global water / floor scales belong to this lane; applying one needs human answers, a held-out gain and Nathan's yes.
No new round from makeRound without asking.

Run (current engine, tables locks for both): `node scripts/calib-fit.mjs research/calib/round-1.json round-2.json round-3a.json round-3.json research/calib/v4/scenarios-v4.json research/calib/answers/{round-1-ngr,round-2-ngr-ai,round-3-chatgpt,round-3-chatgpt-high,v4-chatgpt_high_2}.json --one-ai --out research/calib/fit-all-one-ai`

| fit | water | floor | held-out rms before -> after | fitted rms before -> after |
|---|---|---|---|---|
| rounds 1-3 only (fit-round-1-2-3a-3) | x0.876 | x1.014 | 0.219 -> 0.311 | 0.28 -> 0.21 |
| v4 only (fit-v4-only; no held-out anchors) | x0.932 | x1.170 | n/a | 0.289 -> 0.205 |
| all, one AI source (fit-all-one-ai) | x0.948 | x1.057 | 0.263 -> 0.357 | 0.334 -> 0.293 |
| all, one bias per file (fit-all-per-file) | x0.879 | x1.036 | 0.234 -> 0.400 | |

Reading: the held-out error RISES in every combination (10 anchors), no tank has two experts (disagreement n/a), and there is one human source of 5 tanks.
By the lane rule this is not decision material: **no global scale is proposed or applied**. The v4 data pull water toward x0.93-0.95 and floor up
(+4 to +17 %); rounds 1-3 pull water down (x0.88). The sources agree on goldfish (+25 %, capped) and on tiny / invert classes reading fuller than the engine.
Bias with one AI source: ai -3 %, ngr +3 %. Revisit when a human expert's answers on v4 arrive; ask Nathan before weighting them against the AI source.
Implausible-count tanks (e.g. 87 harlequins, panda cory in 19 of 90 round-1-3 tanks) stay in at full weight as decided; they are the likely reason rounds 1-3 pull tiny species harder.

Implausible-count flags (S216b, 2026-10-26): `implausibleOf` in scripts/calib-review.mjs (30+ of one species, 40+ shrimp / snails, 15+ corydoras, or 50+ animals) marks tanks with ⚠ in the review tables and adds an "Implausible-count tanks" section (rounds 1, 2, 3a, 3 reviews regenerated; the fit is unchanged, they stay at full weight). Flagged tanks: 12 of 24 (round 1), 16 of 22 (round 2), 12 of 22 (3a), 12 of 22 (3). Median fix on flagged tanks vs the others: round 1 +6 % / -22 %, round 2 +15 % / -25 %, round 3 +11 % / -11 %, round 3a 0 % / -17 %: on the plausible tanks the engine reads fuller than the experts, on the implausible ones it reads emptier or level, so the old rounds' implausible counts push the fit toward a less-negative water scale than the plausible tanks alone would.


### Dry run of the combined one-AI fit (S216b, 2026-10-26, nothing applied)

Patch (not committed): every species' space x its fitted total move (class x global where it has no row), floor x f, from fit-all-one-ai.json; scripts/moved-numbers.mjs on main vs patched, listed in research/calib/moved-numbers-fit-one-ai.txt. Changed rows: tankFor 506 of 576, steps 140 of 576, builds 506 of 576, starters 1569 of 1620, examples 7 of 11, sumps 0. tankFor picks: 464 same, 31 bigger tank, 81 smaller. Examples: oto x12 15 gal -> 10 gal; guppy x12 20 long -> 15 gal; goldfish x3 37 -> 50 breeder; angel x6 40 breeder -> 50 breeder; neon x12 stays 10 gal 96 -> 99 %; ember x12 70 -> 65 %. The plausible-only variant (--no-implausible, fit-all-one-ai-plausible) drops 43 tanks and every held-out anchor and pins floor at the x1.25 cap: not usable.
