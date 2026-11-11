# SZ1: Smooth soft size preference plus a Firm toggle on Size (Coordinator 22)

Follow `prompts/lane-DQ-common.md`, then read HANDOFF "DQ1" and `src/scene/scorePolicy.ts`.

## Why
Nathan, 2026-11-11: the quick-preference size should score like a bell curve, not in-or-out. Today `STATED.sizeIn` is +0.5 inside the range and `sizeOut` is −0.2 anywhere outside, so 41 gal and 150 gal score the same.

## Task
1. **Soft size score**, agreed with Nathan:
   - Full score anywhere inside [lo, hi]: a flat plateau, with no peak in the middle.
   - Outside the range, a Gaussian falloff on a LOG scale: `z = ln(g/hi)/sigma` above, `ln(lo/g)/sigma` below, score `exp(-z^2/2)`.
   - `sigma = ln(hi/lo)/2`, so the edges sit at ±1 SD in log space, with a floor of about `ln(1.25)` so narrow ranges are not a cliff.
   - Check, for a 20–40 gal range: 55 gal ≈ 0.66, 80 gal ≈ 0.14, 10 gal ≈ 0.14.
   - Map onto the stated term so the range from in to far-out roughly keeps today's sizeIn..sizeOut span, and document the constants.
2. **Same curve for dry habitats:** floor area and height get the same shape.
3. **Firm toggle on the Size row** of the quick-preference screen (`src/ui/quickPrefs.ts`), like the budget and care rows already have. It also appears in the left Preferences block, which is drawn from the same function. Firm = a hard filter at the edges, using the existing firm path from DQ1.
4. **`?debug` breakdown:** show the size score value.

## Done when
- Unit tests for the curve values above.
- Live `nextPair` tests: a soft 20–40 range ranks 55 gal above 80 gal, and both remain eligible; Firm excludes 55 gal.
- A UI test for the toggle and its sync with the left block.
- Screenshots of the Size row at desktop and 375 px.
- The build is clean and full vitest passes.
