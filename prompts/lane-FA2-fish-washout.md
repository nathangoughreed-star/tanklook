# Lane FA2: fish trend toward a flat white body (blanket fix) (Coordinator 24, 2026-11-14; request R35)

Rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/FA2/`). Memory rule: fish must not look cartoony; match the crisp tank render.

## Nathan's report (2026-11-14)
"why does this seem to happen to the fish? its like they get super washed out. Take the pygmy corydora for example. but its not just this fish. Its like they trend toward a flat white body. I had you fix the zebra danios that were doing the same thing but id rather find a blanket fix."
- His render: `research/screens/FA2/nathan-pygmy-cory-render.webp`. The pygmy cory is a flat pale white-grey body with one black line.
- His reference: `research/screens/FA2/nathan-pygmy-cory-reference.png`. The real fish is tan / olive-grey with a silvery sheen, darker back, a black lateral stripe and a darker spot at the tail base.
- FA1 (HANDOFF "FA1") fixed danios in the recipe only and said no shared cause. Nathan sees a pattern across many fish, so look for a shared cause first.

## Job
1. **Measure the whole roster.** For every fish species, render it in the tank under default light (and a side shot of the model sheet). Then measure the mean body color: lightness and chroma (saturation) of the flank, excluding fins and eyes. Compare that with:
   - (a) the recipe's own base colors;
   - (b) the color the species should have (a few words per species from a known description; mark it as estimated).
   Output a table (`research/sourcing/FA2-fish-color-audit.csv`) and a short summary listing which fish render much lighter / greyer than their recipe or than the real fish.
2. **Find the cause, with a toggle test for each candidate:**
   - shared shading: material type, emissive / ambient term, specular or sheen that whitens, the fake subsurface or iridescence pass;
   - tone mapping / exposure, or color space (sRGB vs linear on the fish texture, which makes a darker texture read pale);
   - texture mip / downsample washing the pattern out;
   - the fish generator's default base or belly color, used where a recipe gives none (many recipes falling back to a pale default would explain "trend toward white");
   - water tint or fog applied to fish.
   Say which it is, with before / after shots that isolate it.
3. **Fix it at the cause, once, for all fish.** If it is a shared render or color-space issue, fix that. If it is recipe defaults, fix the default and give each listed species its real base color in the recipe data.
   - The danio (FA1) must still look right.
   - No cartoony look: keep sheen and shading.
   - Bump model versions and regenerate model sheets for changed species, following FA1's steps.
4. **Performance:** no measurable frame-time increase (alternate A/B per frame; HANDOFF rule).

## Proof
- The pygmy cory before / after, next to the reference, at a normal and a close view.
- A grid of the 12 most-affected fish before / after.
- The audit CSV with the after values.
- Add a dated HANDOFF.md section "FA2".
