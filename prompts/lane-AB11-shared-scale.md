# AB11: A/B tanks at one physical scale (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First `git fetch origin && git merge --ff-only origin/main`. Read HANDOFF "AB5" and "AB8" (camera sync, padlock, side-B camera) plus `src/ui/ab/` and the pair render layer. Report once to Coordinator 22; never push.

## Nathan's requirement (2026-11-10, endorsed reviewer advice)
Tank size is itself a discovery variable, so A and B must be drawn at the SAME PHYSICAL SCALE, not each fitted to fill its half of the screen. A 20 gal long must look smaller than a 75 gal.
- One common scale: identical pixels per real inch in both views. With perspective cameras, equal FOV is not enough when distances differ: use consistent world-unit scale at the reference plane (or a shared orthographic scale if the architecture allows).
- On opening a pair, compute one zoom that fits the LARGER projected envelope and apply it to both. Align tank bottoms so height differences show. Start both at the same front-facing angle.
- Zoom is synchronized by default (changes both together, relative scale preserved); independent pan allowed without changing relative scale. This is the default for EVERY comparison, not an optional mode, and includes mixed habitats (aquatic, paludarium, terrarium).
- Add a "Fit Both" control restoring the shared framing (never separate auto-fit).
- Show actual enclosure dimensions (L x W x H in inches) next to gallons for A and B.
- Check that AB8's camera sync and re-lock behaviour still preserve the rule; the padlock must keep working with it.

## Done when
Tests for the scale math (e.g. 20 gal long vs 75 gal: pixel ratio equals the inch ratio; mixed habitats); build clean; ab* + journey pass at desktop and 375 px. REQUIRED: a screenshot comparing two noticeably different sizes (20 gal long vs 75 gal) at desktop and 375 px in `research/screens/AB11/` (~60 KB), sent to Nathan with SendUserFile before you report done. HANDOFF section.
