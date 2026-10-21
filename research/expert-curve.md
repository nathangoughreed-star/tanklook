# Expert counts vs tank size (2026-10-21)

73 points, 17 species, in `research/expert-curve.json`: 54 recommended groups and 19 stated maximums. Main sources: light.fish, Fishkeeping World, Gensou, Aquarium Co-Op, Aquarium Source, Tankarium. Picture: `expert-curve.svg`.

**Fit of log count on log gallons (slope 1 = proportional):**
- Within one species, all sources pooled: 0.69. This is noisy across sources; single species run from -1.75 to 1.64.
- Within one species and one source: 0.79 (45 points, 17 groups). Recommended groups give 0.89, stated maximums 0.73 (only 3 groups).
- The engine's SCHOOL_EXP 0.85 sits inside this range: keep it.

**The experts' "full" and maximum stockings read only 59 % median in our engine** (25 of them; 12 to 101 %), while their nano lists read 101-126 %.
- One percentage cannot make both read 90 %. Calibrating so "full" reads 90 % would put the nano lists at about 150-190 %.
- The low maximums are temperament limits, not room: dwarf gourami (1 more per 5 gal; 8 in 55 gal reads 31 %), angelfish (4 in 75 gal), chromis (3 in 75 gal), cherry barb 10 in 30 gal. Fish count is capped by aggression or territory before bioload.
- Recommendation (waiting on Nathan): the space level and the 0.85 curve stay. Temperament caps belong in a separate per-species rule (max per tank / per territory), not in the stocking percent.
