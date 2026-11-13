# Lane VF9: sharp shadow lines through rocks (Coordinator 24, 2026-11-13; request R31)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/VF9/`).

## Nathan's report (2026-11-13), picture `research/screens/VF9/nathan-before.png`, scene `research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json`
"im getting this bug where I am seeing sharp shadow lines through hardscape like rocks. Its not on the surface because when I orbit it is at a different field of depth."

In his shot: thin, sharp, dark, roughly parallel lines cross the white river stones (and the wood behind), like a shadow edge or a plane cutting through them. When he orbits, the lines shift as if they lie at a different depth from the rock surface, so they are not painted on the texture.

Earlier related work: Nathan's "harsh geometric shadows" (fixed in VF-C3: contact shadow grid and polygon offset; HANDOFF "VF-C3"). This may be a different cause.

## Job
1. Load his scene (localStorage `tanklook.scene`, stringified once) on origin/main and reproduce at his camera (az 9, el 21, zoom 1.91) and while orbiting. Confirm the lines.
2. Find the cause. Candidates to rule in or out, with a toggle test for each: shadow-map acne / cascade or frustum edges of the main light's shadow camera; the hood / lid / light bar or rim casting a hard shadow edge; the water surface or caustics projection (does it move with time?); a transparent plane (water surface, glass, contact-shadow or decal plane) intersecting the rocks and drawn with depth issues; the contact grid from VF-C3. Say which it is, with before / after shots that isolate it.
3. Fix it at the cause, not by hiding shadows on rocks. Naturalistic look unchanged elsewhere; check his scene plus two others (a planted tank and a rock-backdrop tank) at three camera angles.
4. Performance: no measurable frame-time increase (alternate A/B per frame if you measure; HANDOFF has the rule).

## Proof
Before / after at his camera and two orbit angles, zoomed crops of the rocks. Add a dated HANDOFF.md section "VF9".
