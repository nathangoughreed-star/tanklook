# Plan VF2: reach the graphics bar (approved by Nathan, 2026-11-27)

R192. Nathan: "I think these are the two programs we need to look at and try to figure out how to get to their level
on graphics. I am pretty confident we can do better than them in other ways but none of that matters if they have a
more beautiful final product."

The targets are **Behind Glass** (Steam, $14.99) for atmosphere and **Aquascaper Studio** (aquascaperstudio.com) for
crisp hardscape and light. Screenshots and analysis are in `research/competitors/dogfood/` and
`research/competitors/dogfood-sheet.md`. Round 1 is `prompts/plan-VF-visual-fidelity.md`; its tools are reused here
(`scripts/vf-shots.mjs`, `src/render/fx.ts`, the reference tanks, and the fx toggles).

This plan folds in the cards that are already waiting: **SH1** (cast shadows, R191a), **BG2** (Behind Glass cues,
R190), and **HG1** (procedural rock and driftwood, running now). It does not duplicate them.

## What we're aiming at
- **Aquascaper Studio, edit view:** hard-edged shadows from one key light (every twig shadows the floor); dark pockets
  in each rock's crevices drawn into its color texture; spider wood with many thin tips; a neutral room with no haze.
  Weak spots: blotchy, smeared rock textures, the stock three.js gizmo, and a moss ball that is a plain blob.
- **Behind Glass, viewed from the front:** the water surface reflects the scape from below (the top third of the
  front view); bright top light fading with depth; moss and epiphytes on rock and wood; three dense planting layers;
  a school of small fish far back; thick glass with a green edge. Weak spots: game-like fish at the wrong scale, and
  generic gear.
- **Where we win:** our fish (build B), real gear in its true colors, and two looks where each of them has one:
  **Edit** (crisp, like Aquascaper Studio) while building, and **Show** (atmospheric, like Behind Glass) while
  watching.

## Constraints to know before starting
- **Shadows:** almost every material is unlit (MeshBasicMaterial plus `aqPatch` in render/lighting.ts), so three's
  built-in shadows will not appear on them. Receiving shadows has to be one shadow-map lookup added to `aqPatch`,
  switched by a uniform, never a #define. The hardscape and gear don't move, so the depth pass re-renders only when
  the scene changes (and when the light preset changes). Fish and swaying plants cast no shadows at first.
- **Haze is allowed if it's done right (Nathan 2026-11-27):** "im not attached to that rule as long as we can do the haze
  right." This lifts round 1's VF6 "no haze" rule. Done right means the front of the tank keeps its full brightness
  and color; only distance fades it toward the water hue; nothing looks milky or grey; and a side-by-side against
  the Behind Glass shots gets his yes.
- **Fish stay ours:** photo-like fish were rejected (R144). Take scene cues from Behind Glass, never its fish.
- **Browser, not desktop GPU:** each effect gets a quality tier. Phones get shadows, crevice shading and depth tint.
  The mirrored water surface and the Show view are Full quality only. Measure with alternating A/B frames (memory
  perf-ab-alternate-frames), including the cold shader link on Windows (EF1).

## Stages
**S0 Bar shots (agent, no purchase).** Nathan won't buy Behind Glass (2026-11-27). Its bar is his two screenshots
(`research/competitors/dogfood/behind-glass/`) plus frames from its public Steam store screenshots and trailer.
Aquascaper Studio is free in the browser: the agent builds roughly a 40 gallon breeder there with stone, wood and
plants, and shoots it from fixed views (front, three-quarter, a close-up of the hardscape) in the built-in browser.
Save everything to `research/visual/vf2/bar/`, with each source URL noted.

**S1 Match and rank (agent, a day).** Extend `vf-shots.mjs` with the same views. Build the matching TankLook scene,
make a triptych per view (Behind Glass / Aquascaper Studio / TankLook), and write a ranked gap list
(`research/visual/vf2/gaps.md`): what reads worse, an estimated fix cost, and its tier. Nathan reorders it. The stages
below are the expected order, to be replaced by his.

**S2 Cast shadows (SH1).** One key light per light preset (spot = sharp, LED bar = softer), a 2048 px map fitted to the
tank, PCF soft edges, receiving in aqPatch, and casting from hardscape and gear. Then trees and plant clumps as static
casters.

**S3 Crevices and contact.** Darken rock crevices in the baked color or vertex color (HG1 owns the rock generator, so
this rides on its output). Strengthen VF4's contact blobs where rock meets ground. Wood: thin tips and branch counts
(HG1).

**S4 Water surface mirror (Full only).** From a low front view, the underside of the surface reflects the scape:
render the tank flipped at waterY into a half-resolution target and sample it on the surface plane with a Fresnel
cutoff and ripple distortion. Re-render only while the camera moves or the scene changes. Round 1's VF6 water line
band remains the cheap tier.

**S5 Glass, light and depth.** Thick glass edge with a green tint, a brighter top light, stronger caustics (VF5) under
spots, and the depth falloff (haze done right, see Constraints).

**S6 Show view.** One switch: camera to the front at eye level, UI hidden, Full effects, depth falloff if approved,
fish schooling at the back. This is the screenshot people share.

**S7 Life on hardscape (existing JM / java moss lanes) and planting density (generator).** Moss and epiphytes over
rock and wood; the generator plans three planting layers. Mostly in progress elsewhere; S1's gap list decides if
anything more is needed.

**S8 Re-compare.** New triptychs against S0, with numbers against round 1's VF0. Drop any effect that is noticeable but
not convincing.

## Every stage
A triptych for each changed view goes to Nathan in chat; his yes comes before pushing (like a fish review). Each
effect has its own fx toggle and tier. Saved tanks keep their layout; no scene version bump.

## Lanes (three at most, files don't overlap)
- **VF2-A light (lighting.ts, new render/shadow.ts):** S1, then S2 (absorbs card SH1), then S5. All lighting.ts work
  runs in series here.
- **VF2-B water and Show (new render/surface.ts, items.ts glass, the view switch):** S4, then S6 (absorbs card BG2).
  Its one aqPatch hook is requested from lane A, never edited directly.
- **HG1 (running):** gets S3's rock crevice and wood-tip goals added to its brief. It doesn't restart.
- DF1 (scoping differentiation, R189) stays separate: it is about product and voice, not rendering.

## Decisions for Nathan
1. ~~Buy Behind Glass?~~ No (2026-11-27). S0 uses public shots, and the agent shoots Aquascaper Studio.
2. ~~Haze?~~ Yes, if it's done right (2026-11-27). Where it applies (Show only, or Edit too) follows the S1 comparisons.
3. ~~Edit + Show split?~~ Yes, two looks (2026-11-27). The plan is approved; lanes VF2-A and VF2-B can start.
