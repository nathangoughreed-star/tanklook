# Swimming-room evidence (run length / water column) - research notes 2026-10-21

## Gaps first
- German BMEL 1998/99 Gutachten (Kantenlaenge rules): NOT retrieved. Only citation found (FishBase ref 51539 "Gutachten ueber Mindestanforderungen an die Haltung von Zierfischen (Suesswasser)", BMELF 1999; revision draft under consultation 2025, ZZF/DVG/BTK statements at lobbyregister.bundestag.de). No multipliers verified. Any "5x / 2x" figure from memory is UNVERIFIED - do not use.
- Swiss TSchV Anhang 2 Tab 8: only "spacious, hiding places, BLV recommends not below 54 L (14.3 gal)" (via tierimrecht.org). No length multiples found.
- Austrian 2. Tierhaltungsverordnung Anlage 5 (BGBl II 486/2004): table in point 1.2 keyed to fish length with edge lengths in cm - table text not retrievable (PDFs compressed). Found: permanent keeping below 54 L (14.3 gal) banned even for small species; reference sizes 60x30x30 cm (23.6x11.8x11.8 in, 54 L) and 100x40x50 cm (39.4x15.7x19.7 in, 200 L / 53 gal); schooling fish = needs >=10 of species, "gesellig" >=5; sizes are for adult size, juveniles kept in same size. URLs: https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR40061210/NOR40061210.pdf and .../NOR40204335/NOR40204335.pdf (second-hand via search snippets).
- No OATA/public-aquarium/zebrafish-lab length-multiple rule found.

## 1. Length vs body length
- Hemdal / Practical Fishkeeping "How much swimming space do your fish need?" https://www.practicalfishkeeping.co.uk/features/how-much-swimming-space-do-your-fish-need/
  Ratio = (open-water length + open-water width) / max captive fish length (captive adult = 0.66 x FishBase max). Height excluded "because it tracks length and width". Category 1 sedentary: abs min 1:3.5, preferred 1:5. Cat 2 maneuverable: 1:5 / 1:7. Cat 3 pelagic/open-water: 1:6 / 1:8. Derived from 50 fish in well-run aquariums. Authors say "We are not recommending that you adopt it." Stated rule (hobby-expert method), not law. No shoal-size term.
  Their worked outputs (cm->in): discus 8 cm (3.1 in): min 27x13 cm (10.6x5.1 in), pref 37x18 cm. Oscar 30 cm (11.8 in): min 101x51 cm (40x20 in). Bronze cory 5 cm (2 in): min 11x6 cm, pref 17x8 cm - they admit small species come out tiny.
  Inference (est): if W ~ L/2, L = (2/3) x ratio x fish length -> run length ~2.3x (cat1 min), 3.3x (cat1 pref / cat2 min), 4x (cat3 min), 4.7x (cat2 pref), 5.3x (cat3 pref) adult length.
- Reef Builders (Kurtz 2014) https://reefbuilders.com/2014/06/13/how-to-estimate-the-right-aquarium-size-for-any-given-fish-species
  (L+W)/est captive size (0.75 x max) must be >4, >6 "even better"; active swimmers (surgeonfish, sharks) >8; width test: fish <=80% of tank width to turn. Marine focus, informal single-aquarium data.
- RSPCA Freshwater Fish Care PDF (rspca.org.uk/documents/1494939/7712578/Freshwater+Fish+Care.pdf; per search snippet, direct fetch 404): ~1.5-2 L water per cm of tropical fish length excl. tail = 3.8-5.1 L/in = ~1.0-1.3 gal per inch. Volume rule, no length rule, no shoal term.
- OATA (snippet): absolute min 4 L (1 gal) small fish; beginners not under 10 L (2.6 gal).

## 2. Shoal size
- No source found where run length scales with shoal count. Volume-per-cm rules (RSPCA) are linear in total fish length so they scale with count implicitly (est).
- Zebrafish shoal cohesion (Density and group size influence shoal cohesion, ASU/Dryad): inter-fish distance explained mainly by available space; shoal dimensions additive in space and group size - fish do not use most of the space. https://asu.elsevierpure.com/en/publications/density-and-group-size-influence-shoal-cohesion-but-not-coordinat (snippet only)
- Austria: schooling fish minimum 10 animals - count minimum, not space.

## 3. Height vs length
- Hemdal method explicitly drops height. Reef Builders: depth matters little for commercial tanks. Hobby/forum consensus (gravitee.io page, MonsterFishKeepers): footprint > height for active fish; oxygen via surface area. All opinion, no data. Zebrafish 2022 (below) found distance-to-bottom behaviour changes with tank size - fish use vertical space differently, but top-zone use mostly rose at LOW density.

## 4. Behaviour studies
- Low Holding Densities Increase Stress Response and Aggression in Zebrafish (Frontiers Behav Neurosci 2022) https://pmc.ncbi.nlm.nih.gov/articles/PMC9139139/ : 3.5 L tanks (25x10x12 cm = 9.8x3.9x4.7 in, 3 L water, 0.8 gal), 1,4,8,12,16 fish/L for 9 wk. 1 fish/L: chasing 71% of obs vs 21% at 16/L; highest water cortisol; more time in upper half. Authors: avoid <=1 fish/L; no welfare problem at 4-16 fish/L on measures. (4 fish/L = ~15 fish/gal.)
- Optimizing zebrafish rearing (Frontiers 2023) https://pmc.ncbi.nlm.nih.gov/articles/PMC10340554 : optimum likely 3-6 fish/L (11-23 per gal); high density lowers/variabilises growth. Lab practice 5-20 fish/L.
- Effect of fish density and tank size on adult zebrafish behavior (PMC9581232): 1.5, 10, 50 L at 1,2,4 fish/L, 2 wk; significant tank-size and density effects on immobility, speed, turn angle, distance to bottom. Direction details not read.
- Uppsala thesis 2026 (Sen Sarma): 6 vs 9.5 L tank volume no significant effect.
- IMPLICATION: studies are about too FEW/too crowded in tiny tanks; zebrafish tolerate 3-4 fish/L at ~10 in run. They show density floor (social) and no measured length requirement. Not evidence for needing long tanks.

## 5. Per-length volume anchors
- RSPCA 1.5-2 L per cm (above) - linear in length. Practical Fishkeeping notes volume vs length "doesn't work" since volume ~ length^3 (their stated reason for linear-dimension method). No length-squared/cubed stocking rule found.

## Candidate coefficients
| Use | Coefficient | Source | Status |
| run length k_run, sedentary (cat1) | 2.3 x adult L min / 3.3 x pref (with W=L/2) | Hemdal/PFK 1:3.5, 1:5 | (est) derived from stated ratio |
| run, maneuverable (cat2) | 3.3 x min / 4.7 x pref | PFK 1:5, 1:7 | (est) |
| run, open-water/pelagic (cat3) | 4.0 x min / 5.3 x pref | PFK 1:6, 1:8 | (est) |
| run, active marine | (L+W)/size >8 => ~5.3 x | Reef Builders | (est) |
| width >= 1.25 x adult L (turn) | Reef Builders 80% rule | stated |
| water per fish | 1.5-2 L per cm = ~1.0-1.3 gal per inch of adult length | RSPCA | stated (via snippet) |
| absolute volume floor | 54 L = 14.3 gal (AT/CH) ; 4-10 L OATA | stated |
| zebrafish social density floor | >=4 fish/L (15/gal) in lab tank; avoid 1/L | Frontiers 2022/2023 | stated, lab |
| German Gutachten multiples | NOT FOUND | - | gap |
