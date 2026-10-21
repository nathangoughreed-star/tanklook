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
