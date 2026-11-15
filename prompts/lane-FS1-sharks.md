# Lane FS1: bala shark and red-tail shark (R77)

Nathan 2026-11-15: "can we add pygmy corys and bala sharks, as well as redtail sharks?" Pygmy corydoras is already in the catalog (`pygmycory`), so this lane adds the other two.

## Do
1. **Data in `src/data/species.json`**, the same fields and sourcing as the other fish, with one source per number (FishBase / SeriouslyFish / reputable care sheets; follow how earlier fish-adding lanes cited):
   - **Bala shark** (*Balantiocheilos melanopterus*): adult about 13 in, a schooling species (5+), active open-water swimmer needing a very long tank (lane-length rules as for other big schoolers), peaceful but eats small fish, mid water. The large adult size and group must make the tank checks honest: it will fail most home tanks, and that's correct.
   - **Red-tail shark** (*Epalzeorhynchos bicolor*): adult about 5-6 in, solitary and territorial (one per tank; aggressive to its own kind and look-alikes such as rainbow sharks), bottom-to-mid, needs caves / cover.
   - Wire in the compatibility rules the app already has (territorial, fin nippers, eats small fish, one-per-tank) through the existing rule tables, not new ad hoc code.
   - Albino form: the red-tail shark is not sold as albino; the rainbow shark (*E. frenatum*) is. Leave the albino flag off for these unless a source says otherwise (lane AL1's rule).
2. **3D models:** fish plans in `src/art/fishgen.ts`, crisp and true to photos, not cartoony.
   - **Bala:** silver body with large scales, black-edged dorsal, tail and pelvic fins, deeply forked tail, big eye.
   - **Red-tail:** velvet black body, bright red forked tail, tall dorsal, small barbels.
   - Look at real photos first and iterate side by side until each matches.
   - Fin posture range (lane FE1): bala 0.8..1; red-tail 0.6..1, with the dorsal raised when displaying.
   - Swim zones for the roaming sim (FX1 / SW2): bala open water, schooling; red-tail near the bottom, staying near cover.
3. **Picture card:** bake each card picture with `scripts/bake-gallery.mjs` into `public/gallery/`.
4. **Body volume / mass:** regenerate `src/data/bodyvolume.json` for the two new species, the way lane BP1 did. If the calibration tables or the fit change, say so in your report. Don't re-bless them yourself; the coordinator does that.

## Checks
- `npm run build`, plus the species, compat, bodymass and fish render tests.
- Add a test that a 20 gal planted tank with a bala school is flagged as too small, and that two red-tail sharks are flagged.
- Side-by-side shots (model next to a description of the reference photo) at 1280, one in-tank shot each, and the picker cards. Save them in `research/screens/FS1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
