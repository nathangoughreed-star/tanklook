# Lane SM1: blended substrate mixes smoothly, with local pockets (Coordinator 24, 2026-11-14; request R36)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/SM1/`).

## Nathan's request (2026-11-14), picture `research/screens/SM1/nathan-before.webp`
"I want to change how the mixing substrate works. I want to get rid of the binary between patches of full mix and patches of no mix. I want fluid transitions and localized pockets of areas mixed more than others."

His shot: a custom blend (tan sand + a darker grain). The floor is a speckled mixed field with flat, sharp-edged islands of pure tan sand and a pure-dark drift. Each spot is one of three looks with a thin edge between them.

## Where it is today
- `src/render/build.ts` `blendGrains` / `blendUniforms` (comment "Custom substrate with a second grain"): a floor noise mask (`substrateMaskTexture`, `blendZone` in `src/render/textures.ts`) picks one of THREE textures per point (first alone = `map`, second alone = `uMapB`, premixed = `uMapM`, from `blendTexture`) with a narrow smoothstep (`uZone.w`). That three-way switch is the binary he sees.
- 3D stones of a blend follow the same patches: `src/render/grains.ts` (`at`: "the share of the floor it covers at a point", line ~185 `g.at`), plus VF-C2's `sortField` / `clumpField`.
- Settings: `substrate.custom` { grain, color, grain2, color2, share (% of grain 2), mix 0..1 } (scene/defaults.ts; UI in the substrate menu and the new shell's Scape section).

## Job
1. Replace the three-zone switch with a continuous local ratio field r(x, depth) in 0..1 (the share of grain 2 at that spot), from smooth multi-octave world-space noise: broad gentle drifts plus smaller local pockets that are noticeably richer in one grain. Its floor-wide mean stays `share`.
2. Draw the ground from that ratio grain by grain: each grain-sized cell shows grain 2 where a fine per-grain hash is below r, otherwise grain 1. So a 20 % area reads as sparse speckles, a 60 % area as dense, and the change between them is gradual, with no visible edge or flat single-texture island. Pure grain 1 or 2 only appears where r truly reaches 0 or 1 (rare, small, soft-edged). Keep the gap darkening (`uDark` / GAPS) per grain.
3. The `mix` slider now sets how uneven the ratio is: 1 = nearly even everywhere (r close to share), 0 = strong drifts and pockets (r spans near 0..1 but still with smooth transitions). Saved files keep their numbers; the default 0.5 should look like natural, unevenly settled substrate.
4. 3D grains of a blend (grains.ts `at`, scatter) read the SAME r so stones thin out and thicken with the painted ground; sorting / clumping from VF-C2 stays on top.
5. Old textures (`blendTexture` 'b' / 'm', `substrateMaskTexture`) can go if nothing else uses them. Rebuilds stay in place where they are now (patchLook updates uniforms on slider moves, no full rebuild).
6. Performance: no measurable frame-time increase (alternate A/B per frame; HANDOFF has the rule); one texture lookup budget similar to today.

## Proof
Before / after on Nathan's kind of blend (tan sand + dark gravel, share 30) at mix 0, 0.5, 1, top view and his usual angle (az 9, el 21), plus a zoomed crop of a transition; and one blend of two 3D grains (gravel + pebbles) to show the stones follow. Tests for the ratio field (mean equals share within a few %, smooth: neighbor difference bounded, mix 1 nearly flat). Add a dated HANDOFF.md section "SM1".
