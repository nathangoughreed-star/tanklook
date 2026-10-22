# Habitat model for the Space bar (lane HB, 2026-10-21)

Question (Nathan 2026-10-21, research/tank-minimum-first-principles.md Decision 6): Space should measure usable habitat, with bottom
habitat for bottom dwellers, horizontal run for swimmers, and height only where it helps. What do sources support? Reading notes, with every URL:
`research/habitat/floor.md`, `run.md`, `activity.md` (3 Sonnet agents, about 0.25 M tokens). Numbers below come from
`test/_tmp` scratch runs against the live engine (default filter, water at 90 % of the tank height).

## What the sources say

**Floor area for bottom dwellers.** No regulator states one: German BMEL 1998 (species table gives litres only: 60 L for cories,
kuhli, otos; 150 L for clown loach), Swiss TSchV and Austrian 2. THVO (volume, edge-length classes, nothing per bottom fish), RSPCA,
OATA and zebrafish lab guidance are all per litre. Some hobby and species sources do give a figure, and those scale with the fish's LENGTH, not its length squared:

| Source | Stated | Per inch of adult fish |
|---|---|---|
| Scotcat (hobby article), cories | "six to eight inches of fish to every square foot of base area" | 18-24 sq in |
| Seriously Fish, bronze cory | 31 x 12 in recommended for a group of 6 | about 20 sq in (on SL; 18 on TL) |
| Seriously Fish, kuhli loach | at least 24 x 12 in for 5-6 | about 12 sq in |
| Seriously Fish, clown loach | 71 x 24 in absolute minimum for 5-6 (prefers 10+) | 10-17 sq in |
| Surface-area rule (oxygen, not floor) | 1 in of fish per 12 sq in of surface | 12 sq in (a different purpose; a cross-check only) |
| Aquaculture, Plotosus catfish | 25 / m2 judged best | about 62 sq in per fish (not transferable) |

Our current tankfit rule (FLOOR_K 4 x tl^2, est) grows with length squared: right for a 3 in cory (37 sq in), but 4x too much for a
12 in clown loach (576 sq in each) against Seriously Fish. Length-linear fits all three Seriously Fish species within the source spread.

**Run length for swimmers.** No regulator multiplier was retrievable (BMEL text, Swiss Anhang 2, Austrian table unread). Hobby only:
Hemdal (Practical Fishkeeping) (L+W)/adult length >= 3.5 sedentary, 5 maneuverable, 6 open-water (the author does not recommend adopting
it); Reef Builders (L+W)/size > 4, > 8 for active swimmers. Nothing scales run with shoal size. Run is already held per species as a pass /
fail red-line length by the tank minimum (lane MM, sourced). **No new run coefficient is justified**; length stays in the tank minimum.

**Height.** Only opinion ("depth matters little", footprint and surface matter more). No data either way for midwater fish.

**Activity.** No sourced multiplier (hobby remarks that danios want long tanks; regulators scale by size only). AqAdvisor shows no
activity term (lane SE fit: metabolism does not show in its stocking level). **Activity stays in Filtration only.**

**Invertebrates.** No guideline counts shrimp or snails against floor or swimming room (only "one nerite per 5 gal"-type counts); MX6 holds
aquatic invertebrates to clearance only.

## Calibration

AqAdvisor gives no zone split, but a model that ADDS a floor limit can keep it: Space = the larger of the water limit (today's per-litre
number, AqAdvisor-fitted, unchanged) and a floor limit. On the 24 AqAdvisor mixes the median ours / AqAdvisor stays 1.03 (it is 1.03
today) for floor coefficients 12-18 sq in per inch; 24 lifts it to 1.11. Two more anchors:
1. **Our own sourced footprints** (research/sourcing/tank-minimum, MX): a viable group in its own sourced minimum tank must not read over
   100 % on floor. With length-linear need, the kuhli fails this (6 kuhlis in Seriously Fish's 24 x 12 in read 127 %): an eel-shaped
   fish is long but light. Counting each fish by its **mass-equivalent length** (the length of a cory-shaped fish of the same mass,
   from bodymass.json, which Space already uses) fixes it: kuhli 78 %, every other sourced bottom species 13-45 %.
2. **The audit cases** (test/spaceaudit.test.ts): the smallest coefficient where C (equal water, shallow-wide vs tall) reads the right
   way is 15; at 12 the floor never binds in C.

## Candidate model (for Nathan's approval)

| # | Item | Proposal | Evidence |
|---|---|---|---|
| 1 | Floor need per bottom dweller | **15 sq in per inch** of mass-equivalent length (bronze cory 2.6 in: 38 sq in each) | sources 12-24 (Scotcat, Seriously Fish x3); 15 = smallest that fixes audit C; AqAdvisor median unchanged (calibrated) |
| 2 | Length used | mass-equivalent (cory-shaped) length, not total length | (est), our choice; fixes kuhli vs its own sourced tank |
| 3 | Who counts on the floor | bottom zone 1, "all"-zone fish 0.5, midwater / top 0 | 1 / 0 sourced by class (Decision 3); 0.5 (est) |
| 4 | Invertebrates (snails, shrimp, crabs) | 0 on the floor (snails stay 0 in the water too) | no source counts them (MX6) |
| 5 | Space % | larger of water limit (unchanged) and floor limit | AqAdvisor median 1.03 -> 1.03 |
| 6 | Run length / activity | no new coefficient; length stays the tank minimum's sourced pass / fail; activity only in Filtration | nothing sourced |
| 7 | tankfit | reads the engine only: space (now incl. floor), filtration, minimum (incl. length), depth moved into the engine | brief points 3-4 |

What it changes (Space before -> after; water / floor):
- A: 15 cory + 5 danio, 40 breeder 80 -> 92 % (floor binds); 5 cory + 15 danio 71 -> 71 %.
- B: 6 cory + 8 danio: 20 long 104 % (water binds; floor 60), 20 high 107 % (floor 80).
- C: same stock, equal water: 24 x 12 x 24 in 74 -> 80 % (floor), 48 x 24 x 6 in 74 % (floor 20).
- D: 30 x 12 in floor: 12 in high 118 %, 24 in high 59 -> 64 % (the cories' floor holds it up).
- E: 10 bronze cory, 30 x 12 in floor: 107 % at every height (was 95 % at 12 in, 32 % at 36 in). Scotcat's rule gives 5-7 cories on that floor.
- 13 kuhlis in a 20 long: 97 -> 123 %: the 20 long fails on Space again for that count (S188 was about the tank minimum, which stays at 94 %).

## 2026-10-22: kuhli sanity check, tank-wide school discount, kuhli floor factor (Nathan's own chat)

**Question (Nathan):** 17 kuhli loaches + 15 zebra danios in a 50 gal (36 x 18 x 18 in) read Stocking 100 % (water column 100, floor 96,
filtration 23). Is that sane?

**Findings** (engine at main aa97ef4, water at 90 % of the height):
- Ours 104 % (water 104, floor 95, filtration 30). AqAdvisor, same tank and counts, queried 2026-10-22 (the comparison path of
  scripts/aq-compare.mjs): 74 %; 17 kuhli alone 49 %, 15 danio alone 41 %.
- Floor 95 %: 36 sq in per kuhli (15 sq in per inch of mass-equivalent length, 2.42 in), linear in count, calibrated on one point
  (Seriously Fish's 24 x 12 in base for 5-6, which read 75 %). No published list in research/expert-stockings.md has kuhlis. Aquarium
  Co-Op's guide gives a starting group of 3-6 in a 20 gal or larger; neither source gives a per-fish floor figure.
- Water 104 %: the kuhlis were 56 % of the water load (2.5 units each against 2.2 per danio), and the two schools added linearly.
  A floor change alone leaves the verdict at 104 %; a water change alone leaves it at 95 % (floor).
- **AqAdvisor is concave in the whole tank's load, not per species.** Six answers for the same tank: 17 kuhli 49 %, 15 danio 41 %,
  8 + 8 45 %, 17 + 1 50 %, 1 + 15 43 %, 17 + 15 74 % (not 90 %); 17 + 15 in 48 x 18 x 18 in 57 % (linear in volume). All fit
  stocking ~ (weighted fish)^0.72 across species, the parts within 1 %. Our rule (Nathan 2026-10-21) discounted above 10 fish of ONE
  species (exp 0.85) and added species linearly, so two big schools read far higher with us than with AqAdvisor.

**Candidates measured** (scratch overrides on the engine; every one against the locked audits in test/spaceaudit.test.ts, the lane SE
tests, the 24 AqAdvisor mixes and the 37 published lists; user's tank at 90 % fill, AqAdvisor rows at full fill):

| Option | User's tank | 17 kuhli alone | 6 kuhli in SF's minimum | 13 kuhli, 20 long | AqAdvisor median (24) | Expert median | Lists over 100 % |
|---|---|---|---|---|---|---|---|
| As was | 104 | 95 | 75 | 131 | 0.96 | 74 | 12 |
| A. kuhli floor x0.6 only | 104 | 58 | 62 | 103 | 0.96 | 74 | 12 |
| B. A + kuhli water x0.55 | 78 | 57 | 45 | 78 | 0.95 | 74 | 12 |
| C. A + one school curve over the tank, exp 0.72 | 80 | 57 | 62 | 100 | 0.92 | 71 | 9 |
| D. A + bottom fish count 0.75 in the water | 89 | 57 | 46 | 78 | 0.87 | 72 | 12 |

Rejected: floor sublinear in count (breaks audit F, Space proportional to count, Nathan's Decision 1); bottom fish at 0.5 in the water
column (AqAdvisor median 0.82, the 20 gal neon-cory-pleco test of lane SE fails).

**Decision (Nathan 2026-10-22): C.**
1. One school curve over every fish that takes room in the water (snails excluded): `SCHOOL_EXP` 0.72 (was 0.85 per species),
   `SCHOOL_REF` 10 unchanged. The exponent is the AqAdvisor fit above.
2. `FLOOR_FACTOR` (data/spacefactor.ts): kuhli 0.6 (est): eel-shaped and gregarious, piles into one shared cave. The floor stays linear
   in count (audit F); every other bottom dweller stays at 1.
3. `SPACE_PER_L` x 0.9374: the 37 published lists keep their median 74 % at the published max (71.1 % before re-centring).

**Result:** the tank reads 86 % at 90 % fill (water 86, floor 57, filtration 30), 82 % at full fill against AqAdvisor's 74. 17 kuhli alone
57 %; 6 kuhli in Seriously Fish's minimum 66 % (floor 45); 13 kuhlis in a nominal 30 x 12 x 12 in box 106 % by water (floor 79; was 131 by floor), and in
the catalogue 20 long (smaller inside) 96 %, cramped but doable, no longer failing (the S188 test in test/minimum.test.ts re-worded). Published lists over 100 %: 12 -> 10. AqAdvisor median over
31 combinations 1.01; the seven new answers are in research/aq-compare.json and the COMBOS of test/aqcompare.test.ts (this tank 1.11).
Caveat: a lone big fish among many small ones gets the same tank-wide discount as the school; AqAdvisor's curve does the same in effect.
A load-weighted count is the refinement if a case shows it wrong.
**2026-10-22, later: a case showed it wrong.** One flat factor on every animal let an added animal LOWER the reading (6 angels in a 55 gal
79 % -> 65 % with 30 cherry shrimp; 10 angels 131 -> 120 % with 10 embers). Now each animal takes the curve's share for its rank, biggest
space first (`schoolShare`, scene/stocking.ts): a single species reads exactly as before, a big fish keeps its full count, and no addition
lowers the reading (test/stocking.test.ts). The AqAdvisor and published-list tests pass unchanged; SPACE_PER_L not re-centred.

**2026-10-22, bottom dwellers and height (Nathan, from two screenshots).** 10 kuhli on a 30 x 12 in floor read water 146 % at 6 in tall
and 54 % at 50 in, floor 61 % in both: the water limit still gave bottom dwellers the lane HC height curve (room = floor x credited height),
so a shallow tank was punished and a tall one credited height the loaches never use. Now a bottom-zone animal is credited the curve at
`BOTTOM_REF_CM` 35 cm of water whatever the depth, so its water reading depends on the floor only (10 kuhli: 76 % at every height;
8 neon + 4 bronze cory + 1 bristlenose in 30 x 12 in: 6 in 163 -> 110 %, 16 in 79 -> 80 %, 50 in 49 -> 71 %). Measured 30 / 33 / 35 /
37 / 40 cm against the full suite: 33 and under fail the 17 kuhli + 15 danio test (over 92 %), 37 and over the 13-kuhlis-in-a-20-long
test; 35 passes every AqAdvisor, published-list and audit test unchanged. Dropping bottom fish from the water limit stays rejected (above).
"All"-zone fish keep the half curve.
