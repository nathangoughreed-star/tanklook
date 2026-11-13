# Lane VF8: faster water light motion (Coordinator 24, 2026-11-13)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + only your own tests; push your branch after every commit; real-app shots under `research/screens/VF8/`).

## Nathan's ask (2026-11-13, request R18)
"can we increase the rate of the rolling water shadows and ripples? approximately double?"

## Job
- Double the speed of BOTH:
  - the moving caustic pattern on the substrate and surfaces (`src/render/lighting.ts`, the `uFxTime * vec2(...)` scroll terms, including the slow `aqNoise` modulation);
  - the moving water-surface shimmer / ripple band (VF6, `src/render/build.ts` water-shimmer shader, and whatever drives its time).
- Do it through ONE named speed constant (e.g. `WATER_MOTION_SPEED = 2`) applied to the clock, not by editing each vector, so a later setting can scale it.
- Keep the step rate (`CAUS_FPS` 20 in `src/render/viewer.ts`) and its CPU safeguards as they are. Check the motion still reads smooth at 20 steps per second at double speed. If it strobes, say so with numbers (pattern movement in px per step) rather than raising the rate.
- Frozen clocks for pictures and A/B frames (`fxClock.frozen`, `freezeFx`) must stay frozen.
- Reduced-motion behaviour unchanged.
- Proof: two shots 1 s apart at the old speed and two at the new speed, or a short frame strip, under `research/screens/VF8/`.
- Pending Nathan: whether this also gets a setting (a "Water motion" choice in Graphics settings). Do NOT build a setting unless the coordinator tells you he said yes.
- Add a dated HANDOFF.md section "VF8".
