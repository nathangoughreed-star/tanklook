# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Lane K: light output (2026-10-14; branch `light-output`, port 5383; step 1 of 4 pushed)
- Owns `render/lighting.ts` (carved out of lane J's render/*), new `scene/lightout.ts` + `test/lightout.test.ts`, the
  light fields in scene/types.ts / defaults.ts / validate.ts, the Lighting rows in index.html / ui/panels.ts,
  ui/diff.ts, ui/parGuide.ts. Lane J: the fixture geometry (emitters, beam, fitSpots, lampHeight, CONES, LAMP_Y,
  AQ_MAX) moved from render/lighting.ts into scene/lightout.ts; lighting.ts re-exports it, no other file changed.
- Step 1 (the model, `scene/lightout.ts`): photons = W x PPE x eta, beam normalised to unit flux (points: sr; tubes:
  2D round the axis x an exact finite-length factor), glass lid 0.9, surface 0.97, paraxial refraction (depth / 1.33),
  side-glass mirror images (rect tanks, weight 0.7, only where the image ray meets the glass under water), three bands
  (blue / green / red) with pure-water absorption 0.012 / 0.07 / 0.35 per m plus half the water tint (`waterK`).
  `lightOut` gives surface / mean / min / max PAR, lux at the substrate and mid-water; `readout` the panel line;
  `renderBright` = clamp(sqrt(luxMid / 8000), 0.2, 2.5) x Exposure. New optional LightSettings: watts, tech, par,
  mapUnit (validated, kept only when present).
- Calibration (tests print the residuals): AI Hydra 32 HD in air +9 / -5 / -7%; JBL Solar Natur in water +22% just
  under the surface, +2 to -20% from 10 to 70 cm, with the glass walls assumed 1.6 x 0.8 m (no walls: -37% at 70 cm);
  T5 HO (Barr) -3 / -10% at eta 0.75 once the glass is modelled (the first hand check's 0.4-0.5 left the glass out).
- Findings for Nathan: under white / planted light lux falls a little SLOWER than PAR with depth (red goes first and
  barely counts in lux); only under blue reef light does lux fall faster. LREF is 8,000 lux, not ~2,000 (typical
  setups give 6,000-12,000 mid-water). Readout range = the tech's uncertainty (LED ±30%, others ±50%) or min-max.
- Next: step 2 (Watts / Tech / PAR override rows, readout, Brightness -> Exposure), 3 (shader port + PAR / Lux map),
  4 (hover tooltip).

## Light output: watts -> PAR / lux (2026-10-14; draft only, no src/ edits)
- Design draft `reference/light-output-draft.md`: watts + light tech -> photons -> existing beam model in real units,
  plus refraction, side-glass reflection, water absorption in three colour bands. Light map gets a PAR / Lux switch
  (separate calculations, same ramp) and a hover tooltip with both values at that spot.
- Decided (Nathan): Brightness becomes an Exposure knob when watts is set; calibration against published PAR charts
  approved. Runs as its own lane after G and G2 finish (touches scene/, render/lighting.ts, ui/panels.ts).
- Calibration first pass done: data `reference/par-calibration-data.md`, results in the draft (LED ~±30%, fluorescent
  ~±50%; T5 fixture efficiency lower than guessed).
- PAR guide shipped: Lighting menu button "PAR guide" opens `src/ui/parGuide.ts` (own dialog + styles): what PAR is,
  planted tiers with what grows / struggles / CO2 / fertiliser, reef tiers with corals and dosing; opens on the reef tab
  for a salt tank. Hooks in lane G's files: one line in index.html (the button), two in main.ts.

## Lane G: audit fixes, UI share (2026-10-14; branch `audit-fixes`; batches 1 + 2 pushed to main, DONE)
- Split with lane G2 (coordinator): G owns `src/ui/*`, `index.html`, `src/style.css`; G2 owns interact/scene/render.
  G's share is 38 findings: #2, 4, 5, 7-13, 16, 17, 22-28, 30-41, 43-46, 48, the label part of 49, 50. G2's 15: #1, 3,
  6, 14, 15, 18-21, 29, 47, the export crop of 49, 51-53. Lane I: #42. One line in `src/main.ts` (start menu call).
- **Start menu (Nathan 2026-10-14: "upon start, a menu in the middle of the screen: start fresh or from an example")**:
  `#startDlg`, shown on every load: Continue your last tank (only when one was restored; Esc does the same), Start
  fresh, the six example cards, a gesture line. How to use no longer opens itself on the first visit.
- Batch 1 (S1 + S2, browser-checked; before/after sheets in `shots/fixes/`, gitignored): #2 the tank label wraps and
  `#view` clips; #5 each shape keeps its own L/D for the visit (Rect → Pie → Rect back to 24″); #7 a split tab with no
  room beside Undo/Redo drops below them; #8 Add row sticky on phones; #9 why Add is off, as a line under it; #10/#11
  group names carry fresh/salt, an empty group offers "Switch the tank to Saltwater/Freshwater"; #12 wrong-water rows
  marked in the stocking list with Remove there; #13 leaving Swamp restores the level it lowered (unless moved since);
  #16 lift row is "Raise"; #17 light map on a bare bottom says so, links to Substrate; #22 help says tick Edit; #23 A/B
  badge on split tabs; #24 the diff chip reads "⇄ A" (copy from A).
- Nathan's calls: #29 Stand ON by default (G2 builds it); #38 only "no stocking check for salt yet".
- Batch 2 (S3, browser-checked; sheets `shots/fixes/s3_sheet_*.png`): #25 Glass type / Finish labelled rows; #26
  "Glass outlines"; #27 "Capacity … (inside the glass, to the top)" and "gal to the water line"; #28 out-of-range sizes
  say what they were set to, inputs carry min/max; #30 cm inputs to 0.1; #31 tab title = tank name · TankLook; #32 eye
  map starts hidden on a phone (until the viewer chooses); #33 40 px touch targets under `(pointer: coarse)`; #34
  "‹ Hide"; #35 Add says "Add 6" / "Add 2", new `pair` flag in species data (ocellaris, banggai); #36 a status at the
  500 cap; #37 "Turn Water on to choose"; #38 "No stocking check for saltwater tanks yet."; #39 "Adult ±10 %"; #40
  bare bottom hides the depth sliders; #41 singular counts; #43 the map steps aside while terrain points are edited;
  #44 light map unticked with no fixture; #45 "Room light (ambient)", "Height above tank"; #46 Lighting has Look from
  above / Straight on; #48 JSON rounded to 0.01, Copy button, units note; #49 plain fish-edge labels, PNG pixel sizes
  on hover; #50 the split hint says two tanks is the most.
- Fixed in batch 2: a batch-1 comment had swallowed the line that disables the light-map box with no fixture.
- #49's PNG crop and A/B labels landed in G2's batch 2 (`f7b2cc3`); the start menu hint now says "wheel or pinch".

## Lane G2: core audit fixes (2026-10-14; branch `core-fixes`, port 5363; owns src/interact, src/scene, src/render minus lane I's files)
Plan approved by Nathan (batches in severity order). Pictures: `shots/g2/` in the main checkout (before = `shots/audit/`).
- **Batch 1 (pushed `16ecc27`):**
  - #1 water level: `nearestWater` (terrain.ts) fell back to "the deepest spot", which on a flat floor was the first
    grid corner (x = 12 mm), so every fish taller than the water piled at the left glass. Now: no spot deep enough =
    the nearest spot with 3/4 of the deepest water, or stay put if here already has that; only the height drops.
    Lowering then raising the level brings fish back (setWaterLevel scales heights). At 10 % on the default sloped
    gravel the back is above the water, so fish go forward but keep their x. Test in scene.test.ts.
  - #3 aquascape drag straight on: within `EDGE_ON_EL` (20°) of level a piece slides on an upright plane facing the eye
    (`wallPlane`, pointer.ts): x follows the pointer, depth kept, it rests on what is under it. Tilted views unchanged.
    Test pointer.test.ts; browser: 128 mm right at el 0 with depth 159 kept, grabbable again at el 2.
  - #29 the Stand is ON for new tanks (defaults.ts, Nathan's call). Files without a `stand.show` still load with it off
    (validate.ts no longer falls back to the default there).
  - #47 viewer map caption: "20° below" for negative elevations (viewmap.ts).
- **Batch 2 (pushed `f7b2cc3`):**
  - #6 touch: two fingers pinch to zoom and pan together toward the point between them (pointer.ts; `zoomAt` takes the
    midpoint's old position, viewer.ts). A second finger during a fish / piece / terrain drag is ignored; only the
    first finger's lift ends a drag; a pinch undoes the first finger's orbit. Checked with synthetic touch events.
  - #18 the water itself is tinted: `waterVolumeMaterial` (lighting.ts) on the far faces of the water volume (prism, or
    a lathe for a bowl; build.ts addWater), same slab path + `waterK` as the object tint. Fragment depth pinned to the
    far plane, so it draws only where nothing is behind (no double tint on fish, background or wall).
  - #21 re-lock copies the camera of the view moved last (`Store.lastCam`), replacing Nathan's 2026-10-08 "snaps to the
    original tank" (approved in the G2 plan). Camera moves stay out of undo (the view is not part of history).
  - #49 PNG: cropped to the tanks' boxes (tank + stand + table, 6 % margin; `exportCrop`), A / B badges on split views.
    Pixel sizes on the buttons stay with lane G.
- **Batch 3 (pushed):**
  - #14 terrain from a bare bottom: `sampleTerrain` samples as if the substrate were shown (custom terrain always shows
    one), so the grid starts at the corner depths; the ground is never drawn closer than 0.6 mm to the bottom glass.
  - #15 swamp: the store keeps a swamp layout's substrate shown (`swampGround`, store.ts), so the panel says gravel, not
    "Bare bottom"; steep ground cells (n.y < 0.6) take their grain from the side they face (no streaks on pool walls).
  - #19 raised lights: framing still never counts the fixture (Nathan 2026-10-09); instead a "▲ Light 11.8″ above the
    tank" note at the top of a view whose fixture is out of frame (`markLights`, a DOM div the viewer owns).
  - #20 from above: fixture parts and the above-rim beams carry `userData.overhead` (their height) and hide while the
    eye is above it, so no dark slab and no yellow flood over the page.
  - #51 colour temp / brightness / room light no longer rebuild the scene (`buildKey` in viewer.ts leaves them out; the
    fixture glow is recoloured in place): 4-9 ms instead of ~150-570 ms on the planted example. `rebuild()` still forces.
  - #52-53 measured, NOT fixed: on real hardware (Intel Arc) an edit is ~4 ms in the store, then ~55-70 ms rebuilding
    and ~60 ms in the first draw (new materials / buffers; a steady draw is ~8 ms): ~130-230 ms per edit or drag step
    with 40 fish + 56 items. Keeping cached item geometry alive did not help. The fix is updating meshes in place
    instead of rebuilding (fish moves first): a work unit of its own.
- **Open question for Nathan (#29):** with the stand on, a new 24×12×12″ tank sits small on top of a 30″ cabinet in the
  default view (`shots/g2/29_stand_default_after.jpg`). Keep it, or frame the tank and let the stand run off the bottom?
- Dev server: `preview_start core-fixes` hit the five-servers-per-folder limit, so Vite runs from the shell on 5363.

## Lane D: first-visit audit + review pack (2026-10-14; no src/ edits)
- `shots/audit/AUDIT.md`: 53 ranked findings with cropped, marked shots (headless Chrome, fresh profile = true first
  visit, desktop + 375 px phone + 768 px tablet, on main `c67aeb7`: before lanes A / E / H merged). Both re-checked S1s
  reproduced. Fix lane G owns the fixes.
- `shots/review/REVIEW.md`: one picture page per item awaiting Nathan (R1-R12), listed under "Still open" at the bottom.
- "Still open" and "Known gaps" at the bottom rewritten to the current state.
- Tooling (scratchpad, not in the repo): a ~80-line CDP driver over Node's built-in WebSocket + system Chrome; each run
  gets its own profile, so parallel agents do not share localStorage. Worth adding to scripts/ if audits recur.

## Tree frogs climb the glass (2026-10-14; Nathan: "like otos and snails cling to the glass")
- White's tree frog has `cling: any` (glass, hardscape, floor). Shuffle / Add use the oto path (`spawnSnail`) with a new
  `on.above` = the water line, so a frog on the glass or hardscape is always out of the water; glass weight `GLASS_FROG`
  0.6 (otos 0.35); on the glass it sits head up (yaw 90 ± 40) and unbent. Floor picks still go to land.
- `glassBand` (water.ts) is the height range on the glass: land climbers from the water line (or ground) to the top of
  the pane, everything else ground to water line. Used by `onGlass` (build.ts) and `fitFish`; `maxFishY` leaves a
  frog's height alone when the water level changes. Rendering needed nothing new: `onGlass` already lays any
  card + 3D body belly to the pane. Test in scatter.test.ts. Checked in the tree frog terrarium example.
- Dart frogs, toads, newts unchanged (no `cling`).
- **Glass pose (Nathan's two photos, same day):** `HERP3D_GLASS.treefrog` (`frogOnGlass3D`, herps.ts): belly levelled
  flat onto the pane, arms folded under the chin, hind legs folded tight along the flanks, toe pads turned in under
  the belly; cream starts lower round the section. `herpBody(art, w, glass)`; build.ts passes `f.surface === 'glass'`.
  Picture `shots/92_treefrog_glass_sheet.png`. Awaiting Nathan's look.
- **Bug found on the way: every 3D amphibian body was inside out** (bodyGeometry wound inward, so you saw the far
  side's inside: cream flank seen from above, the far eye showing through; the old "far eye shows as a lid bump"
  watch item). Winding flipped in `bodyGeometry`; the vertex shading now darkens the real underside. Affects all
  frogs, newts, axolotl and the hermit crab's body.

## Lane A: 3D plants (2026-10-14; Nathan approved the style test "looks good, roll out"; pushed to main)

Roadmap step 5. All seven plant types are real 3D; the crossed cards stay as the fallback (`plant3d.on = false`,
or a type with no `PLANT3D` entry). No scene version bump: plants were already items (variant / seed / size).
- `render/plant3d.ts`: ONE generator. A leaf = a curved sheet along a centreline (`rise` from vertical, `arch` toward
  the ground by the tip, `twist` about the midrib, `fold` cupped / ridged, `wave` edge ripple, `pet` stalk strip in the
  stalk colour, optional pale `rib` line), built twice: upper side and paler `under` side, each FrontSide. Forms:
  `rosette` (crown, golden-angle spiral; `crowns` = several plants in a clump), `rhizome` (creeping root tube),
  `stem` (stems with crossed leaf pairs, leaves shrink to the top; `top` = tip colours, the red stem), `carpet`
  (leaflets over a ragged disc, lower to the edge). Vertex colours with form shading baked in (up-facing lighter,
  base and middle darker); one shared MeshBasicMaterial, lit by aqPatch as a card (so the same saturation lift).
  Size: the plant is scaled to its exact height (`size`); leaves reaching wider than the card are pulled in by up to
  a quarter so it fits where the card did. Swords now draw at their real height (the card's picture never filled it).
- Data: `PLANT3D` in `art/plants.ts` (fern, sword, carpet, anubias, grass = vallisneria, stem, stemred).
- Cost: dense planted 24" starter set 418 k triangles (stem plant ~9 k, carpet patch ~18 k). A carpet is generated
  once per (seed, size) (`plantGeometry`), then `carpetOnGround` moves each leaflet onto the ground under it on every
  drag step (only positions are new; colours / normals / index shared). Leaflets capped at 3000 per patch (bigger
  leaflets past that).
- Hook (my lane): plant branch of `itemMesh` in `render/items.ts`. `scene/items.ts` not touched.
- Sheets (worktree `shots/`, not in git): `9{1,2}_{fern,sword,carpet}_sheet.png` (style test), `94_*` (rollout),
  `96_planted_sheet.png` (dense planted, card / 3D). Capture helper `shots/cap.js` (card vs 3D at the same framing).
- Watch items: vallisneria clumps spread wider than their card; the sword is taller than its old card; the carpet sits
  lower than the card from the front. Crypts: not built yet (next).

## Lane H: AqAdvisor for salt tanks (2026-10-14; Nathan: leave it off; pushed to main)

- **AqAdvisor's saltwater calculator gives no stocking %.** `AqAdvisorMarine.php` (79 fish, no invertebrates) takes the
  same form as the freshwater page, lists the selection ("Total selected: N fishes.") and stops: no "stocking level"
  anywhere. Checked 2026-10-14 three ways (Update with a custom 36x18x16, the "40g breeder" preset, Add > like a user)
  and in a real browser. It did work once: Reef2Reef, Feb 2015, "Calculator says my stocking level is 172%"; the form
  is unchanged since (Wayback 2015-01-11), so it is broken on their side, not a missing field. Nathan 2026-10-14:
  leave stocking off for salt tanks.
- **Mapping kept for when it works again**: `scripts/aqadvisor-ids.py` resolves `MARINE` + `MARINE_STAND_INS` on the
  marine page; `aqadvisor.json` now holds all 12 marine species flagged `salt` (55 entries). Stand-ins (no marine
  inverts on AqAdvisor): cleaner shrimp = Neon Goby (5 cm cleaner), turbo snail = Tail Spot Blenny (small rock grazer),
  hermit crab = Yellow Clown Goby (3.5 cm perching goby). Bangaii Cardinal is AqAdvisor's spelling for the banggai.
- `aqQuery` never sends a `salt` id: salt tanks still return null, and a marine animal left in a fresh tank (a misfit)
  is "Not counted". Worker unchanged, not redeployed.
- Readout wording only (`panels.ts`, lane E's file: two strings): "not available for saltwater (AqAdvisor gives none)";
  the sidebar note says the saltwater calculator gives no stocking level.
- Tests: the expected map includes the marine species again (every non-land species mapped, `salt` exactly on the
  marine ones, 6 stand-ins); new test: a clownfish in a fresh tank is not counted. tsc clean, 182/182.
- To turn it on if AqAdvisor fixes the page: pass a `salt` flag through `AqQuery` -> proxy `sw=1` -> `AqAdvisorMarine.php`
  (no filter fields), include it in the worker's cache key, redeploy the worker.

## Lane E: live rock + corals (2026-10-14; branch `corals`; Nathan approved the style test, live rock salt only; pushed to main)

- **Library** (`scene/items.ts`): `liverock` (kind `stone`, size = length) and new kind `coral` ("Corals" row): `acropora`
  Branching, `montipora` Plate, `mushroom` Mushroom corals (disc cluster on its own small live rock), `leather` Leather
  (toadstool). Coral size = width (item panel says "Width"). `Variant.salt` marks all five; the Aquascape buttons carry
  `data-salt` and `render()` hides them unless the tank is saltwater with water on. `ItemKind` + `'coral'` (one line in
  `types.ts`). No scene version bump: older files have none; an older app skips them as unknown variants.
- **Shapes** (`render/coral3d.ts`, `reefShape`): procedural from (variant, seed, size), base on y = 0, cached / light-baked
  / glass-clipped by `render/items.ts` like the stones (dispatch in `solidShape`; `waves`, `paint`, `clean`, `grit` now
  exported). Live rock = 3-5 overlapping knobbly lumps with holes, fitted to `stoneDims`, cream under pink / purple
  coralline patches. Acropora = 6-9 recursive tapered tube trunks, tips paler (5 colour morphs). Plate = spiral whorl of
  thin cupped discs tipped up at the rim (4 morphs). Mushroom = 6-10 ribbed discs with a pale mouth, set on the rock's top
  (5 morphs). Leather = lathe stalk + folded cap (3 morphs). Grit kinds 11 (hard coral cups) and 12 (soft polyp fuzz).
- **Reef example** finished (lane F's steps): `src/examples/reef.json` + `reef.jpg` re-saved, renamed "Reef": 24x18x18 in,
  5 live rocks, 7 corals (all four kinds), 2 ocellaris, royal gramma, firefish, watchman goby, cleaner shrimp, 2 turbo
  snails, 3 hermit crabs (no yellow tang: too big for 24 in).
- Tests: `test/reef.test.ts` (library flags, save / load, shapes deterministic, on y = 0, about their size), examples test
  checks the reef's rock, corals and marine-only animals. 186/186. Browser: buttons hidden in fresh, shown in salt, Add
  works, no console errors. Style-test pictures: worktree `shots/e1_{front,above,seeds,reef}.png`, `e2_reef_full.png`.
- **Open / later**: live rock still a little rounded from straight on and its holes barely show; corals are not in any
  starter set (a "Reef" Aquascape start set would need a `LayoutId`, i.e. a types/validate change); the other five
  examples' thumbnails predate lane A's 3D plants (the scenes turn 3D by themselves, the pictures do not).

## Lane C: marine species (2026-10-13; Nathan approved the sheets, hermit "fine for now"; pushed to main)

12 species, all `salt: true` (cat `sw-fish` / `sw-invert`), approved list (Nathan, same day, hermit crab as shell + limbs).
TL = typical adult in an aquarium (as the freshwater list), checked against the cited max:
| id | species | TL mm | source (max) |
|---|---|---|---|
| ocellaris | *Amphiprion ocellaris* | 80 | FishBase 11 cm TL |
| royalgramma | *Gramma loreto* | 75 | FishBase 8 cm TL |
| yellowtang | *Zebrasoma flavescens* | 180 | FishBase 20 cm TL |
| firefish | *Nemateleotris magnifica* | 75 | FishBase 9 cm TL |
| banggai | *Pterapogon kauderni* | 70 | FishBase 8.6 cm TL |
| sixline | *Pseudocheilinus hexataenia* | 75 | FishBase 10 cm TL |
| chromis | *Chromis viridis* | 75 | FishBase 10 cm TL |
| coralbeauty | *Centropyge bispinosa* | 90 | FishBase 11.5 cm TL |
| watchman | *Cryptocentrus cinctus* | 90 | FishBase 10 cm SL (so about 12 cm TL) |
| cleanershrimp | *Lysmata amboinensis* | 55 | about 6 cm body, antennae excluded (CMFRI eprint 14967, reefguide.org; SeaLifeBase blank) |
| turbo | *Turbo fluctuosus* | 50 | shell 2.5-8.6 cm (WoRMS via Wikipedia; SeaLifeBase blank) |
| hermit | *Clibanarius tricolor* | 30 | about 2.5 cm incl. shell (retailers; no published size found) |
FishBase pages: `https://www.fishbase.se/summary/<Genus-species>.html`.

Built (data first, generators reused):
- 9 fish = `PLANS` entries in `art/fishgen.ts` (marine block above the bottom dwellers), thick per the recipe; watchman
  = goby bottom fish (`back` .6, `belly` .5, `wide` .3, `eye.up` .35). Added to `fish3d.species`.
- Cleaner shrimp = a `SHRIMP` spec. New optional spec fields: `back` (broad band over the upper flank), `stripeW`
  (back stripe width), `ant` (antenna colour, length factor).
- Turbo = a fifth snail kind in `art/snails.ts` (`SHELL3D.turbo`, card drawn by the mystery snail's branch).
- Hermit crab = a herp-family entry in `art/herps.ts` (`HERMITS`, `drawHermit`, `HERP3D.hermit`): small lofted body,
  2 walking legs + claw per side, eye stalks and antennae as `Limb3D` tubes, one joint table for card and 3D. Species
  `zone: bottom`, `cling: hardscape`.
Generic additions (no species code; all optional, existing species unchanged):
- `fishgen.Limb.c` + fish3d `limbMeshes` per-limb colour (white antennae).
- `Herp3D.shell` (a carried shell from the snail generator: snail3d `shellMesh`, now also used by `snailBody`),
  `Herp3D.eye.at` (eye on a stalk tip), `Limb3D.c` (own limb colour).
- `Shell3D.open` (which way the aperture faces; default unchanged) and `Shell3D.tilt` (lean the spire back).
Tests: `aqadvisor.test.ts` now leaves the marine species out of the AqAdvisor map (the app asks AqAdvisor for freshwater
  tanks only; AqAdvisor HAS a saltwater calculator, Nathan same day: mapping the marine species to it is a follow-up unit); `scene.test.ts` snail
count 4 -> 5. tsc clean, 173/173. Checked in the browser: a salt tank lists 9 marine fish + 3 marine inverts, no
freshwater species.
Sheets (worktree `shots/`): `91_marine_{A,B,C}.png` (card / 3D, four views, same framing). My review: the 9 fish pass;
watch items: watchman head-on is a pointed snout (the 75° foreshortening, lesson 38); sixline stripes ring head-on;
cleaner shrimp legs comb head-on (as the other shrimp); turbo aperture lip reads as a visor at 50° (as the mystery);
hermit shell is a tilted turbo-like coil, its side view shows the aperture lip as a wedge, card shell is rounder.

## Lane F: example tanks (2026-10-13; branch `examples`, shipped to main)

- **Open… lists six Examples** above "Saved in this browser": Planted community (40 breeder), Iwagumi (rimless 24 in),
  Betta bowl (30 cm bowl on a round oak table), Paludarium (swamp set, water 42 %, toads + dart frogs on land, chilis +
  shrimp in the pool), Tree frog terrarium (18x18x24 dry, custom soil), Reef (placeholder: salt, aragonite, reef-blue,
  lava rock, no animals). Nathan approved the six from draft pictures.
- **Opens like a file**: `parseScene` + `store.replace`, so one undo step back to the previous tank; `setLibId(null)`, so
  Save makes the user's own copy and never touches the example. Status: "Opened the example ...".
- **Files**: `src/examples/<id>.json` (ordinary downloaded scenes) + `<id>.jpg` (400 px thumbnail), listed in
  `src/examples/index.ts` and imported with `?raw` / `?inline`, so they are in the JS bundle and the single-file build
  (checked: `dist-single/tanklook.html` holds all six, no fetch). About 110 kB JSON + 100 kB pictures.
- **Re-saving after lanes A / C / E land** (the point of keeping them as plain scene files): open the example, adjust,
  *Download*, replace `src/examples/<id>.json`; for a new picture, *Save* it and copy the thumbnail, or in the dev
  server `__gb.viewer.thumbnail(400)` and save the JPEG as `<id>.jpg`. Plants turn 3D by themselves once lane A merges
  (items store only variant/seed/size). The reef wants marine fish (lane C) and corals / live rock (lane E); rename it
  from "Reef (placeholder)" then, and update its `name` + `hint` in `index.ts` (the test checks the file name matches).
- `test/examples.test.ts`: six examples, each parses with no warnings, every species exists, reef is salt, terrarium dry.
- Touched outside my files: two CSS rules in `src/style.css` (`.libsub`, `#exList`). The examples were built in the dev
  server from the app's own `defaultSetup` / `starterItems` / `shuffleFish`, then hand-tuned (paludarium land plants
  thinned near the frogs, terrarium frogs moved to the front, betta bowl water 85 %).

## Lane B: fresh or salt tank (2026-10-13; branch `salt-tank`, shipped to main)

- **Water section: Type = Freshwater | Saltwater** (`water.salt`, the seam's flag; off when Water is off). One undo step.
  Switching swaps clear water for the other type's clear (fresh `#7fb8a8`, marine `#8ec9ec`, both opacity 0); any other
  colour is the user's and stays.
- **Animals list filtered by water** (`fitsWater` in `ui/panels.ts`): a saltwater tank (salt and water on) lists species
  with `salt: true`, a fresh or dry tank lists the rest. Group chip counts follow; an empty search says how many matches
  the other water has ("switch the tank in Water").
- **Animals that no longer fit are offered for removal, not removed**: a row under Type names them ("Not saltwater
  animals: 6 Neon tetra") with **Remove N**; one undo step, Ctrl+Z restores. The row stays while any misfit is in the
  tank (also after undo or a loaded file).
- **Marine water presets**, shown only on a salt tank (Blackwater / Green hidden): Reef blue `#2f86d0` 22 %, Deep blue
  `#1f5fb0` 40 %; Clear follows the type. 12 % was invisible in a 12-inch-deep tank. With no background behind the tank
  the tint stays subtle, because the water model tints only what is inside the water.
- **Substrates** `aragonite` (fine bright cream sand) and `coral` (crushed coral: coarse flat chalky chips). Coral began
  as pebble gravel, but the pebble shading (rim darkening, contact shadows, layer darkening) made it mid-grey, so it is
  now a coarse "sand". Both listed for any tank, labelled "(marine)". `SubstrateType` + validate list extended, no
  version bump.
- **AqAdvisor off for salt**: `aqQuery` returns null for a salt tank. The view label reads "Stocking: not available for
  saltwater (AqAdvisor is freshwater only)", with a matching sidebar note. Compare lists Freshwater / Saltwater as a
  difference.
- **One-line hook in lane C's `data/species.ts`**: `resolve()` dropped unknown JSON fields, so `"salt": true` never
  reached the species. Added `if ((r as { salt?: unknown }).salt === true) sp.salt = true;` before the female block.
  Lane C: keep it (or fold it into `RawSpecies`) when merging.
- Tested with a temporary local `"salt": true` on the angelfish (not committed): filter, counts, misfit row, Remove +
  undo, presets, both substrates in the browser; `test/salt.test.ts` covers AqAdvisor off and the reload round-trip.
- Not done / for later: `Species.cat` and `salt` are independent (a salt species in `fw-fish` still lists under
  "Freshwater fish"), so lane C should set both. Live rock and corals wait for lane E.

## Parallel lanes (2026-10-13, Nathan: fill the gaps before showing other people)

Four chats at once, each owning its files. Seam already on main (`cb7783c`): optional `salt?: boolean` on `Species`
(absent = freshwater) and on `WaterSettings` (validated, default fresh, no version bump).
| Lane | Folder / branch | Launch config | Owns |
|---|---|---|---|
| A 3D plants | `../Glass-Box-plants3d` / `plants3d` | `plants3d` 5283 | `art/plants.ts`, new `render/plant3d.ts`, plant branch of `render/items.ts`, plant entries of `scene/items.ts` |
| B Salt tank | `../Glass-Box-salt-tank` / `salt-tank` | `salt-tank` 5293 | `src/ui/*` (salt toggle, species filter), water + substrate presets, `scene/defaults.ts`, `scene/water.ts`, AqAdvisor off for salt |
| C Marine fish | `../Glass-Box-marine-fish` / `marine-fish` | `marine-fish` 5303 | `data/species.json` + `species.ts` data, `art/fishgen.ts` PLANS, `art/paint.ts`; `render/fish3d.ts` generic fixes only |
| D Audit + review | main checkout, no `src/` edits | `dev` 5173 | `shots/audit/`, the "Still open" / "Known gaps" sections below |
Rules: touch another lane's file only for a one-line hook, and say so in your section. No scene version bump without
asking Nathan. Shipping: in the worktree `git fetch` + `git merge origin/main`, tsc + tests + browser check, then
`git push origin HEAD:main` and `git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main`. HANDOFF.md
conflicts on merge: keep both sections. Each lane adds its own dated section at the top of this file.
Lane B DONE (`ff590db`). Lane F DONE (see its section). Lane F added 2026-10-13: example tanks, `../Glass-Box-examples` / `examples`, launch config
`examples` 5313; owns the Open dialog's examples list in `src/ui/panels.ts` + `index.html`, and new example files.
Lane G (fixes from shots/audit/AUDIT.md) waits for lane D's report; it takes over `src/ui/*` after F lands.
Lane H DONE (salt stocking stays off, see its section). Lane C DONE (`2c38519`). Lane F DONE (`829929a`). Lane H added 2026-10-13: AqAdvisor saltwater, `../Glass-Box-aq-salt` /
`aq-salt`, launch config `aq-salt` 5333 (aq mode; needs `aq-proxy` 8787); owns `data/aqadvisor.*`, `worker/*`, and the
salt switch-off in the AqAdvisor code. Lane E also re-saves the examples and fills the reef example when it lands.
Lane A DONE (`29515de`). Lane G opened 2026-10-14 ahead of the audit: `../Glass-Box-audit-fixes` / `audit-fixes`, launch
config `audit-fixes` 5343; waits for lane D's message that shots/audit/AUDIT.md is written. Owns `src/ui/*`, `index.html`,
`src/style.css` (lanes E and H keep their small panels.ts hooks); a finding in another lane's files goes to that lane.
Lane H DONE (`6c91148`). Lane E DONE (`e8ccd65`). Lane I opened 2026-10-14: E's leftovers + example refresh,
`../Glass-Box-reef-polish` / `reef-polish`, launch config `reef-polish` 5353; owns `scene/items.ts` (lane A may add one
crypts LIBRARY line), the non-plant branches of `render/items.ts`, `render/coral3d.ts`, `src/examples/*`, LayoutId in
`scene/types.ts` / `scene/validate.ts`. Lane G owns `src/ui/*`.
Audit written 2026-10-14: `shots/audit/AUDIT.md` in the MAIN checkout only (shots/ is gitignored), 53 findings. Split
into two fix lanes: G (`src/ui/*`, `index.html`, `src/style.css`) and G2, core fixes, `../Glass-Box-core-fixes` /
`core-fixes`, launch config `core-fixes` 5363 (`src/interact/*`, `src/scene/*`, `src/render/*` except lane I's files).
A finding that spans both goes to the lane holding the root cause, with at most a one-line hook in the other's files.
Audit ownership (lane G's split, 2026-10-14): G2 = #1, 3, 6, 14, 15, 18-21, 29, 47, the PNG crop/margins/A-B labels
part of #49, 51-53; I = #42; G = the other 38. Nathan's calls: #29 the Stand is ON by default for new tanks (G2, scene/defaults.ts);
#38 salt tanks show only "no stocking check for salt yet" (G).
Lane G DONE (`59025b3`). Lane G2 DONE (`4667d9f`; #52-53 measured, not fixed). Lane J opened 2026-10-14: edit
performance (#52-53, in-place mesh updates instead of a full rebuild per edit), `../Glass-Box-perf` / `perf`, launch
config `perf` 5373; owns `src/render/*` and `src/scene/store.ts` except lane I's `render/coral3d.ts` and G2's possible
#29 framing in `render/camera.ts` / `render/viewer.ts`.
Lane K opened 2026-10-14: light output (watts -> PAR / lux, light map units + hover), `../Glass-Box-light-output` /
`light-output`, launch config `light-output` 5383. Owns `render/lighting.ts` (carved out of lane J's `src/render/*`; J
keeps the rest), new `scene/lightout.ts` + test, the light fields in `scene/types.ts` / `defaults.ts` / `validate.ts`,
the Lighting rows in `index.html` / `ui/panels.ts`, `ui/parGuide.ts`. Spec: `reference/light-output-draft.md`.
**Coordinator protocol (Nathan 2026-10-13):** the coordinator chat is session `local_e1923781-40bc-48d3-84f3-ed380e471779`
("Lanes coordinator"). Every lane messages it (send_message to that id) when its work is pushed to main, when it is done,
and at any milestone that unblocks another lane (A: plants pushed; D: shots/audit/AUDIT.md written). The message says
what landed (commit), what is still open, and which files are now free. The coordinator then sends Nathan the prompts
for any chats that can start now. If a prompt is still waiting when another lane opens, it sends all waiting prompts again
in one new message. Every new lane prompt includes this protocol. When a lane is done it stops its own preview servers (preview_stop): the app allows only five
per folder, and finished lanes holding them blocked lane G on 2026-10-14. Questions for Nathan stay in the lane's own chat.
Lane E DONE (see its section). Lane E (corals + live rock as items) OPENED 2026-10-13 early, per lane A: A's change in `render/items.ts` is a ~4-line
hook in the plant branch of itemMesh and A does not touch `scene/items.ts`. E: `../Glass-Box-corals` / `corals`, launch
config `corals` 5323; owns `scene/items.ts`, the non-plant branches of `render/items.ts`, new `render/coral3d.ts`.

## Pan stays put (2026-10-13)

Nathan: snapping back after every pan was limiting; asked about SolidWorks-style free pan + orbit. Decided against
moving the eye/pivot (breaks the fixed eye distance and like-for-like tank comparison, and orbit then swings the tank
out of view). Instead the middle-drag pan (still a lens shift, viewer.ts `pans`, one per view; locked views pan
together) no longer eases back on release: orbit and zoom keep it, a second drag continues from it. Three resets,
all easing back (220 ms): double middle-click, Home (F is taken by flip), and a "Re-centre" button in the view tools
that shows only while panned. Not reset by opening a tank or changing layout.
- Same day (Nathan: "always zooming toward the point the mouse is at"): wheel zoom pans so the point under the
  pointer stays under it (viewer `zoomAt` records the tan-space point before the zoom; the next draw solves the pan;
  measured within 0.3 px over 7 ticks in and out). So zooming off-centre shows Re-centre too. The panel zoom slider
  still zooms about the framing. Double-click straight-on now also re-centres.

## Fish stand out (2026-10-13)

Nathan: fish washed out against sand, backgrounds and plants; asked for an option, or hard-coded if truer to life.
It is not physical (real fish separate from the ground mostly by cast shadows and sheen), so it is an option, not a
fix: Display & export > **Fish stand out** slider (`render.pop`, 0-1, default 0.15 (Nathan, same day; was 0.5, then 0.25); an app preference kept equal across
tanks like `edge`; older files 0.15; 0 = the old look). Shader only (lighting.ts `aqPatch`, uniform `uPop`, set with
the water uniforms): 3D fish bodies get up to +20 % brightness and saturation 1.35 -> 1.7, a darker outline where the
body turns edge-on (up to 55 %), and up to 60 % less water haze; fish cards (`userData.fishCard`, set in build.ts) get
the lift and the haze cut. Shot `shots/pop_compare.png` (off / 50 / 100).
- Same day (Nathan: "also increase the lineweight of the outline"): a real dark outline, width = 2.5 px x pop on
  screen. Solid body: its back faces pushed out along the normals (fish3d `OUTLINE` / `outlineMat`, a ShaderMaterial
  child of the body; uniforms set per viewport by the viewer, `uVpH` = viewport height; none on see-through bodies).
  Cards (fins, flat fish): a ring just outside the painted alpha in AQ_MAP (8 taps at the line width), as faint as a
  see-through fin.
- Same day (Nathan, a betta: fins had no line): paired fins (fish3d `finMeshes`) are flagged `fishCard` too; the ring
  is drawn where the alpha drops off (neighbour alpha minus own > 0.1-0.35), not only past zero alpha, so soft feathered
  fin edges get it; at least 1 px wide. Shot `shots/betta_compare.png`.
- Same day (Nathan: every outer edge the same treatment, see-through fins fainter): body and fin lines share one width,
  max(2.5 px x pop, 1 px); an opaque fin's line is as dark as the body's, a see-through fin's at half strength.
- Same day (Nathan, a round table: "everything looks a bit mushy"): the furniture is inked, ALWAYS ON (Nathan: a fixed
  visual style, not tied to the fish slider; it briefly followed the slider, reverted the same day). Every
  `shadedBox` / `shadedSolid` (stand, table, frame, doors, handles, skirting) gets build.ts `ink()`: 1 px lines on
  creases (EdgesGeometry 30 deg) plus a 1 px silhouette hull (fish3d `hullMaterial`, now shared with the fish body), in
  the piece's colour x 0.35; faces polygon-offset back so the lines win.
  Shot `shots/ink_compare.png`.

## Custom substrate: grain, colour, blends (2026-10-13)

Nathan: pick a grain size (mud, sand, gravel, pebbles) and then any colour; optionally blend two grains with their own
colours, a share ("30 % pebbles") and a Mixing slider (none = separate patches, full = mixed grain by grain, between =
clumps). Substrate type "Custom grain and colour" (`substrate.type: 'custom'`, `substrate.custom` = SubstrateBlend,
validated with defaults, no version bump). Presets unchanged.
- Art (art/placeholder.ts `drawBlendTile`, `GRAIN_LOOK`): grain sizes in mm, so a grain keeps its real size; shades
  generated round the picked colour (HSL jitter, some greyer stones). Tiles 'a' (grain 1), 'b' (grain 2), 'm' (mixed:
  the finer grain as the bed, the coarser covering its share; same grain twice = each stone one colour or the other).
  A fine bed under a coarse tile is drawn at its own repeat and laid as a pattern (grain-by-grain sand on a pebble tile
  took 11 s; now ~0.3 s). Tiles 1024 px, own LRU cache of 18 (render/textures.ts `blendTexture`).
- Placement (render/build.ts `blendGrains`): a seamless 256² noise mask over the floor; thresholds from the mask's own
  sorted values (`maskQuantile`) so the shares are exact: pure patches take (1 - mix) of each share, mixed ground the
  rest; patch size shrinks as the mix rises (mask repeat 900 mm at 0 to 250 mm at 1). Done in the lit shader via a new
  `userData.post` hook in lighting.ts `aqPatch` (runs after AQ_MAP, swaps its `texture2D(map, ...)` for `aqBlend`).

## Optimized spot pattern (2026-10-13)

Nathan: on a 90° pie corner tank he wanted one puck toward the corner and one near each end of the arc; asked for an
"optimized" pattern for odd shapes given N lights. Spot Pattern "Optimized for the tank shape" (`pattern: 'fit'`):
`fitSpots(T, n)` in render/lighting.ts places `count` bulbs as a centroidal Voronoi layout of the footprint (Lloyd on a
48x48 sample grid, 5 deterministic farthest-point starts, lowest mean squared floor-to-nearest-bulb distance kept;
cached). Rows and Spacing hidden in this mode; Count goes to 12 here (6 otherwise; capped back when leaving it).
90° pie, r 600, N=3: one on the bisector 200 mm in from the corner, two ~180 mm out from the centre line near the arc
ends (cell centres, so inset from the glass rather than in the corners). Rect N=2 = quarter points. Shot
`shots/pie_fit3_top.jpg`. Tests test/lightfit.test.ts.

## Hardscape surface grit (2026-10-13)

Nathan: driftwood, caves and rocks looked too clean; wanted randomly generated knots, crevices and cracks.
- Per-pixel, in the hardscape shader (render/items.ts `GRIT`, run by `solidMaterial`): every solid geometry carries
  `aGrit` = (noise coordinates in mm, kind). Stone / arch: fine grain, blotches, pits and pocks (by roughness: river
  least, lava most), crack networks (cellular edges, masked so only some stretches show; seiryu most). Slate adds
  fissures along its layers. Wood: coordinates along the limb / around / radius, so grain streaks and splits run along
  the limb; knots (dark core, rings, grain bent round them) at random spots. Terracotta tube: clay grain, blotches,
  pale grit, pinholes. Coconut: fibres. Detail finer than a pixel fades out. Pattern shifted per seed.
- Geometry: wood limbs get 0-2 broken-off side-branch stubs with a dark ringed end (own rng, so limb shapes are unchanged).
- Fixed on the way: the lighting pass (`aqPatch`) replaced the hardscape material's own patch, so the bowl clip and the
  darker cut face were not applied under lighting; it now runs `userData.pre` first (program key gets 'h').
- Cost measured: about 2.6 ms more per frame for 11 pieces at 930x860 (frames are drawn on change only).

## Pie slice tank shape (2026-10-13)

Nathan asked for a "pie slice" aquarium (half round or 90° corner tank): set radius, height and degrees.
`shape: 'pie'`, `pieDeg` 45-180 (default 90; capped at 180 so the outline stays convex, which insideBy / clampIn rely on).
D = radius, L derived = chord 2r sin(θ/2) (normTank); apex at the back centre, arc toward the viewer, two flat panes
back to the apex (one back pane at 180°). UI: "Pie slice (corner / half round)" in Shape, Length hidden, Depth reads
Radius, Angle slider (type-in). Flat-ends rules apply (no hood, back wall only). Shots `shots/pie_{90,120,180}.png`.
- Same day (Nathan): wall placement **Corner** (`wall.side = 'corner'`, any shape): two walls at right angles, each 45°
  to the back, meeting behind the tank; `cornerWalls()` in scene/table.ts pushes each in to the gap off the outer glass
  (or table), so a 90° pie sits flush with its corner in the room corner. Orbit limit, person placement and the view map
  know both walls; not a peninsula (no back doors); background on the panes facing back.
- **Distance to wall** slider (`wall.gap`, mm, 0-1000, absent = the old 50; `wallGap()`), for every placement (behind,
  ends, corner). At least 1 mm in effect, so the background film (0.5 mm outside the glass) stays in front of the wall;
  the skirting board thins to fit a small gap. Shots `shots/corner_{gap50,gap0_top,gap300}.png`.
- Same day (Nathan): a pie slice's custom terrain is polar like a round tank's: `TerrainSettings.arc` (degrees) with
  `radial`; ring k = an arc of radius k/rows round the apex, pane to pane, `pieSegs(k, arc)` segments (ring 0 = the apex
  dot). Rings from the Grid slider at the same spacing as a rectangle ((cols-1) x D/L). `sameGrid()` resamples when the
  shape or angle changes. In a non-pie Tank B the slice is stretched to L x D. Shot `shots/pie_terrain_grid.png`.
  Fix after deploy (Nathan saw the old rectangular grid): a grid of the wrong kind is now resampled on load (validate;
  that part landed inside `bdcb3a8`, another chat's commit, shared checkout) and after every scene edit (store), so
  scenes saved before the change and terrain copied between tanks of different shapes are converted too.

## Light beam overlay (2026-10-13)

Nathan asked for a Lighting-tab toggle showing the light cones from height and beam angle, and an analog for the other
fixtures. `render.beams` (default off; older files off), checkbox "Show light beams" in Lighting (disabled for flat).
`addBeams` in render/lighting.ts: a faint solid per beam from the fixture to the tank floor at the HALF-STRENGTH angle =
middle of the shader's cone ramp (acos of the mean of the two cosines), so it matches the light model: spot = cone at
about half the printed beam angle; tube (line source) = a wedge along the tube with rounded ends (~81° half-angle in the
model); LED bar = one such wedge per row of emitters (outline of a row of identical cones, ~61°). Above the rim drawn
whole (light missing the tank shows), inside clipped at the glass (footprint planes; a bowl discards outside its sphere);
the substrate hides the rest, leaving the footprint. Note: a raised tube's model beam is very wide, so its overlay is a
big sheet above the rim; that is the model, not the overlay (tube cone [0.45, -0.15] may be worth narrowing later).
- Same day, made a working view for placing lights (Nathan: "turned on, lighting tweaked, then turned off, so it doesn't
  have to be subtle"). Checkbox now "Light map". The tank holds **only its substrate** (no plants, hardscape, fish:
  `bare` in buildTank). Beams bold yellow above the rim (0.3), faint inside (0.1), drawn once as a union (stencil); no
  outline lines (Nathan asked them gone). The substrate shows a **physical light map** (`aqIrr` in the light shader):
  per emitter, beam profile at that angle x cos of incidence x inverse square distance (tube: inverse distance),
  summed; 1 = one standard 52° bulb 300 mm straight above a level surface (x beam gain x Brightness; an LED bar's
  emitters share four bulbs' output). False colour on a log scale, a step per doubling (1/16 navy ... 1 yellow ... 8
  white), faint contour per doubling, grain kept faintly; replaces lit colour and water haze. Legend under the checkbox
  (`lMapKey`). So a sloped or mounded substrate gives brighter, smaller, non-circular footprints where it rises toward
  a light. Shots `shots/lightmap_{angle,narrow_angle,narrow_top}.png`.
Open question (asked 2026-10-13): the bright patch on the room wall is the spill model (nearest point of the tank box,
extended UP TO THE FIXTURE), not a reflection; it should probably follow the actual beams instead.

## Aquascape Shuffle rolls a style (2026-10-13)

Nathan: with hardscape now easy to size and place, Shuffle should give much more diverse outcomes, dense vs sparse.
- `starterStyle(seed)` in scene/items.ts. **Seed 1 = the starter set as designed** (the default scene and "Start from"
  until the first Shuffle); any other seed rolls: density (sparse 0.3-0.6 / medium 0.8-1.2 / packed 1.5-2.4, a third
  each), scale 0.65-1.45, composition (centre, one side, two groups with a valley, thirds, 3-4 scattered groups),
  materials, and `wild` (pitch / roll of solid pieces).
- Per set: stones = one cluster per group in river / seiryu / dragon / lava / slate (slate stacks into ledges), some
  with plants at the foot; iwagumi = main stone + 0-9 satellites per group, any lean, carpet full / front only / patchy;
  driftwood = one piece per group (branch, spider, manzanita, mopani), epiphytes tied on its limbs, optional back row
  and carpet; planted = palette, back-row density, open-water gap placed by the composition, optional rock / wood
  accent; swamp = spacing and stone type. Sparse styles leave the carpet patchy.
- Tests: shuffles of each set must differ in piece count (>2.5x), materials and where the weight sits.
- Later the same day (Nathan: short plants in a neat front row, tall at the back "looks like a farm"): plants no longer
  go in rows. `scatter(weights, clumps, {d0, d1, gap, half})` drops clumps (stems 2-5, grass 2-4, sword 1-2, fern /
  anubias 1-2) at best-of-3 random spots; depth only sets the odds: each kind has a soft heat zone (anubias 0.2,
  fern 0.4, sword 0.5, stems / grass 0.8 of D, plus a 20 % floor so strays happen), the back fills more than the front,
  reachable height rises front to back, clumps keep off hardscape and mostly out of the open-water gap. Used by
  planted (rect; also the default seed 1), the driftwood background and iwagumi's back grass. Carpet = jittered grid
  with a ragged back edge. Planted keeps at least 0.6 density. Disc planted (spiral mound) and swamp unchanged.

## Male / female fish (2026-10-13; DEPLOYED `23633f2`)

Nathan asked for a male/female selector with matching shape, colouring and size, starting with the most dimorphic species.
- Batch 1 (done): betta, guppy, swordtail, dwarf gourami, honey gourami, cherry barb, kribensis, GBR, pearl gourami.
  species.json `female: {art, tl}`; the species itself is the male. Female plans = `her(male, overrides)` in fishgen.ts
  (data only, same generator + loft; keys `<art>_f`, also listed in `fish3d.species`). Adult lengths (male / female, mm):
  betta 65/55, guppy 35/50, swordtail 120 incl. sword/115, dwarf gourami 80/65, honey 45 (was 50)/50, cherry barb 50/50,
  kribensis 90/75, GBR 60/50, pearl 120/110.
- Code: `Fish.sex = 'f'` (absent = male); `speciesOf(f)` = the look a fish is drawn and sized with; `fishTL` is sex-aware;
  textures key on `Species.look` (`<id>` / `<id>~f`). Stocking list: a row per sex for dimorphic species (both shown
  while either has fish); Add starts a group 1 male : 2 females, a lone fish male. Selected fish: Sex switch (custom size
  keeps its share of adult). Preview tile: Male / Female toggle. "(male)" dropped from guppy / betta / swordtail names.
- Review sheets `shots/90_sexes_{A,B}.png` (`scripts/sex-sheet.py`; shot helper takes `sex`). Pass by my review; after
  the sheets the honey gourami female's stripe was softened and the swordtail female went 100 -> 115 mm (not re-shot).
- Pea puffer added 2026-10-13 (Nathan): `peapuffer` / `peapuffer_f`, 30 mm both, shoal; male = dark belly keel stripe +
  wrinkle lines behind the eye, female rounder and plainer. No pelvic fins, dorsal + anal small and far back, eye r .05
  up .3. AqAdvisor "Dwarf Puffer" 200909300063. Sheet `shots/91_peapuffer.png`.
- 2026-10-13 (Nathan): Add takes the sex highlighted on the preview tile's Male / Female toggle (button reads "Add males" /
  "Add females"; the whole start count is that sex); stocking rows show only the sexes present, named "Betta (male)" /
  "Betta (female)". Replaces the earlier 1 male : 2 females start and the always-both rows.
- Added 2026-10-13: celestial pearl danio `cpd` / `cpd_f` (25 mm, shoal; male blue with an orange belly and red fins
  barred black, female green-grey and plain) and marbled hatchetfish `hatchet` (35 mm, school, top; `back: 0.2` gives
  the straight back over a deep keel; marbled slanting bands = `poly` marks). AqAdvisor ids resolved. Sheet `shots/92_cpd_hatchet.png`.
- Batch 2 candidates (moderate dimorphism): platy and molly (female bigger, gravid spot; male platy ~45 / female ~60),
  Bolivian ram, bristlenose (male bristles: card only, not 3D yet), cherry shrimp (female more coloured, saddle).
  Male kribensis could get a pointed tail with ocelli and longer dorsal/anal (left as before).
- Note: other chats' commits 728dad9 / acdfd9c swept this change's renderer + panel edits in and pushed them before the
  data landed (main briefly did not build); 23633f2 completed it.

## Hardscape placement: yaw / pitch / roll, resize, free move, cut off by the glass (2026-10-12)

Nathan asked for yaw, pitch, roll and resizing of hardscape, free placement anywhere in the tank (pieces may pass through
each other), and pieces that go through the glass instead of stopping short, drawn cut off at the inner glass surface.
- `Item.pitch` (new, -90..90; older files 0); `tilt` is now roll, -180..180 (was -45..45). Euler (pitch, yaw, roll) 'YXZ'.
  A turned solid is raised so its lowest point sits where the unturned base did (`userData.rise` in `bakedShape`).
- Item panel: Size, Yaw, Pitch, Roll, Height (may go negative = sunk into the substrate, down to `LIFT_SINK` 0.5 H) and a
  Move pad (Left/Right, Up/Down, Forward/Back; 5 mm a click, hold repeats, Shift 1 mm). Keys: arrows = x / depth,
  Page Up/Down = height, + / - = size x1.1. A sideways step keeps the piece's height in the tank.
- Dragging a piece placed off any surface slides it level at its height; one on the ground / another piece slides over surfaces as before.
- Hardscape anchors clamp only to the glass itself (plants unchanged). `solidMaterial(T)` in render/items.ts: one clipping
  plane per footprint edge + the floor (all outlines convex), a bowl clips to its sphere in the shader; both sides drawn,
  back faces darkened so a cut piece reads solid. `renderer.localClippingEnabled` in viewer.ts.

## Bowl tank shape (2026-10-12; DEPLOYED: pushed to origin/main `84595e5`, merged with main's background sides / arc)

The local main in this shared folder was NOT fast-forwarded (other chats' uncommitted edits block it); `git pull --rebase` brings it in.
The bowl background uses `backgroundRuns` like a round tank (the arc slider shows for bowls).

Nathan asked for a globular tank: a sphere cut flat at the floor and at the opening, with the bowl, floor and opening
sizes adjustable. Built in a worktree because main holds other chats' WIP in the same files. Dev server: launch config `bowl` (port 5253).
- `shape: 'bowl'`, `bowlFloor` / `bowlTop` = diameters (mm), each 0.2..0.95 x L (default 0.6). D = L; H is DERIVED
  (sqrt(R²-rb²) + sqrt(R²-rt²)), so the Height input is locked. UI: "Floor ⌀" / "Opening ⌀" sliders, Diameter label.
  The user said "radius"; diameters chosen to match the existing Diameter field (easy to flip).
- Design: the footprint is the FLOOR DISC, so the substrate, items, terrain, stand and table work unchanged; everything that
  depends on height asks `bowlRadius(T, y)`: `clampFish` (fish within the sphere's circle at their height), `nearestGlass(T, x, d, y)`
  (glass snails on the sphere), `volumeBetween` (sphere slice: volume, weight, AqAdvisor),
  water surface + meniscus, substrate spread radially to meet the flaring glass. `bulge(T)` = equator past floor
  (halfWidth for the person, view map outline). Renderer `addBowl`: concentric shell t thick (28 bands + equator row,
  72 segments, back / front halves), background on the inside of the sphere facing the room wall, round bottom pane,
  outline at floor / opening / equator, glass lid = disc over the opening. No rim, hood or peninsula for a bowl.
- AqAdvisor (Nathan 2026-10-12): a bowl's area = halfway between the equator circle and the circle at the substrate
  line (mean ground height round the floor edge); box d = area / L, h = volume / area (volume kept).
- tsc, vite build clean; tests 138/138 (5 new). Checked in the browser straight on and from above.
  2026-10-12 later: glass snails, clinging fish and the snail drag plane tilt with the sphere (`glassFrame`: point on
  the glass at a height + 3D outward normal; deployed `f148646`). Not done: items near the floor edge sit on the
  unspread ground height; lighting spill uses the bounding-box ellipse (as round).
- 2026-10-12, aquascape spread in bowls: plants and hardscape had been clamped to the floor disc (footprint), so a
  layout piled into one ring at the middle. Now `clampItem(it, T, g)` takes the ground and, for a bowl, clamps to the
  sphere's circle at the ground height (`clampGround` / `groundInsideBy` in terrain.ts; a plant stays inside over its
  whole height). `starterItems` maps the L x D box onto the disc of ground (elliptical grid mapping) for round tanks
  and bowls instead of clamping, and in a bowl shortens rim plants to fit under the sphere (to half height at most).
  Carpet cards near the glass use the same ground-level edge. Terrain sculpting grid still spans only the floor disc.
  Then (Nathan: "now plants aren't generating in the center"): Planted on a disc (round tank or bowl) is its own
  arrangement, as the rows along the back glass became an arc round the rim with a bare middle: a sunflower-spiral
  mound of stems just behind the centre, swords / ferns / grass round it, anubias front sides, carpet front.

## NEXT (Nathan 2026-10-09, closing session 11): 3D sequence

Verdicts: alpha fix approved; pilot passed (geometry generation, NOT yet the final visual-quality test); generic 3D
architecture validated for rollout; head-on marking distortion is now a systematic problem: fix it before the full
rollout; the remaining 34 species are on hold until the merge and the mapping fix. QC list adds: the guppy's broad
tail becomes an edge-on sheet at extreme angles (acceptable for now).
Order, one work unit per chat:
1. DONE 2026-10-09 (session 12): `fix-canvas-alpha` merged into main (`1cd57d6`, local, not pushed). The other
   chats' uncommitted edits on main (middle-drag pan: `pointer.ts`, `viewer.ts`, `style.css`; round-tank spill:
   `lighting.ts`) were stashed for the merge and restored, still uncommitted. No textual overlap; tsc clean, tests 110/110.
2. DONE 2026-10-09 (session 12): the other chats' work committed first (`0ca1ac2` round-tank spill, `92cb931`
   middle-drag pan), then `audit-3d` merged (`5476b2e`): auto-merged, no conflicts (its alpha fix is the same
   change already on main, present once). tsc clean, tests 110/110. Visual spot check on the dev server, straight-on
   view of tiger barb, harlequin, clown loach, GBR, danio, dwarf gourami: all six draw in 3D, flank colours read like
   the cards, no white pectoral blades, no see-through. Main is local only, NOT pushed. Branches `fix-canvas-alpha`,
   `audit-3d` and their worktrees still exist (safe to delete).
3. BUILT 2026-10-09 (session 14; uncommitted, awaiting Nathan's verdict): head-on marking wrapping, generic. Where
   the body turns away from the side, the paint fades to a copy smeared LENGTHWISE (`bledTexture`, two box passes of
   `SMEAR` 0.08 W, then the old round blur) instead of only the round blur, and the fade starts earlier (`SIDE`
   |n.z| 0.45..0.9, was 0.3..0.75; shader uniform `uSide`). Bar contrast on the turned-away copy (row through the bars,
   luminance min..max): clown loach 84..165 -> 125..150, tiger barb 109..180 -> 150..157. Switch `fish3d.wrap` (off
   = before). Flank views unchanged. Tests 132/132.
   Shot helper updated: one tank, no hardscape, `crop: 'fit'` frames the fish by its projected box; `wrapViews`.
4. Verify it on discus, tiger barb, clown loach, harlequin (same four views): sheets `shots/61_<species>_sheet.png`
   (top row before, bottom after). Awaiting Nathan.
5. Roll 3D out to the remaining fish, flat cards kept as fallbacks until each passes review.
   STARTED 2026-10-09 (session 14; uncommitted). Lessons from sessions 9-11 collected in `shots/3d_lessons.md`
   (36 rules, rejected list, per-species recipe). Batch 1 = the 14 fish with body plans, data only (recipe: `thick`;
   bottom fish the cory / loach fields): ember .42, chili .42, rummynose .42, cherrybarb .4, platy .5, molly .5,
   swordtail .45, betta .45, honeygourami .32, bolivianram .36, kribensis .45 + belly .2, oscar .48, pandacory = bronze
   cory fields, sae .55 + belly .3. Sheets `shots/63_rollout_{A..D}.png` (card / 3D, same framing). All pass by my
   review; awaiting Nathan. A thinner `thick` was tried on eight and reverted: the round head-on look is the 15° of
   foreshortened length at 75°, not thickness (`shots/63_thick_tune.png`).
   Left (`shots/64_remaining.png`): neon + pearl gourami (hand-drawn, no Plan); shrimp; 4 snails; 5 amphibians.
   Nathan 2026-10-09: yes, neon + pearl gourami next, then the non-fish generators (shrimp, snails, amphibians).
   Batch 2 DONE (uncommitted): `PLANS.tetra` (neon) and `PLANS.gourami` (pearl) replace `drawTetra` / `drawGourami`
   (same as the angel: GEN_ART overrides FISH_ART; species `aspect` overrides removed, planMeta computes it). Built
   from the hand-drawn coordinates; zigzag lateral line = a `poly` mark from the new `zigzag()` helper (data, no new
   Mark kind). Sheets `shots/65_handdrawn_vs_plan.png`, `shots/65_rollout_E.png`: both pass by my review.
   `drawTetra` / `drawGourami` are now unused (kept until Nathan approves).
   Shrimp DONE (uncommitted): three generic Plan fields, reusable by any drawn body: `outline` (closed side polygon
   replaces the parametric profile: `outlineProfile`), `pectoral: false`, `limbs` (tapered tubes on both flanks from
   a surface point along a quadratic curve: `limbMeshes` in fish3d). `SHRIMP_PLANS` built from `SHRIMP_OUTLINE`
   (shared with the card drawing); `bodyPlan(art)` = PLANS ?? SHRIMP_PLANS, used by has3D / fishBody / the card cut.
   `drawShrimp` skips legs + antennae when `style.paired` is off and the eye when `features` is off. Shrimp: thick .6,
   eye u .835 r .022, 5 walking legs + 4 swimmerets + 2 antennae per side. Sheet `shots/66_shrimp.png`: pass by my
   review; watch item: legs fan like a comb head-on.
   Snails DONE on the floor (uncommitted): `render/snail3d.ts`, ONE shell generator for all four (logarithmic spiral:
   aperture ellipse swept round the coil axis, `grow` per turn, `drop` = spire slide). Data `SHELL3D` in
   `art/snails.ts` (turns, grow, drop, ap, axis, size, tall, at, foot, tent, mark). Placement is generic: the shell is
   turned so the aperture opens down onto the foot, then spun so the spire points nearest `axis`; scaled to fit the
   card's shell length AND height (`size`, `tall`). Paint follows the coil (uv = along the coil, around the whorl):
   `axial` zebra (nerite), `spiral` bands (mystery), `growth` lines (ramshorn), `spots` (trumpet). Foot = flat-soled
   half ellipsoid, tentacles = `taperTube` (shared with the shrimp legs, exported from fish3d). The card stays as the
   invisible picking target (`HIDDEN` material in build.ts), 3D body is its child; floor snails now get a contact
   shadow. Glass snails still use the two flat cards. Rules learned: whorls touch only if `ap[1]` >=
   drop*(1-1/grow)/(1+1/grow) (the trumpet was a corkscrew at 0.55); a nerite is a fast-growing coil with its axis
   sideways, not a short cone. Sheet `shots/70_snails.png`: all four pass by my review; watch item: the mystery's
   spire sits low at the back (card: on top) and its aperture lip shows as a pale notch at 50°.
   Amphibians DONE 2026-10-13 (committed, not pushed; awaiting Nathan's verdict): `render/herp3d.ts`, ONE limbed-body
   generator for all five, data `HERP3D` in `art/herps.ts` (frogs share `frog3D`, newt + axolotl share `sal3D`).
   Body lofted from the card's own side outline (`FROG_TORSO` / `salSide`, now shared with the card painter) with a
   half-width table `wid`; paint laid out ROUND the body (u along, a = 0 back midline .. 1 belly midline, mirrored), so
   marks are data (`band` / `spots` / `line`) and stay put from above. Legs = Catmull-Rom tubes through jointed points
   (`Limb3D`), toes to tips on the ground, round pads (tree frog); limb spots box-mapped on the CPU (the lighting
   patch replaces onBeforeCompile, so no shader tricks on fish materials). Eyes = domes on the surface looking out
   sideways (pupil round / horizontal slit / all dark). Axolotl: tail-fin membranes on the midline + gill stalks with
   filament fringes. The card is the invisible picking target (`HIDDEN`), as the snails. Sheets
   `shots/81_frogs_v2.png`, `shots/81_sals_v2.png` (v1 = `80_*`: eyes looked at the sky, toad red too high).
   Watch items: frog thighs read as tubes (card: a big oval); the far eye shows as a lid bump at 50°.
   Sheet script used: a 30-line PIL card/3D grid (scratchpad, not in the repo).
   NOTE: `src/render/items.ts` is modified by another chat (not this work).
   Shot helper: `cardViews` (card at the 3D shot's framing), warm-up render instead of a timer (hidden tabs throttle
   timers), several tabs on one dev server run species in parallel.

## Hardscape system: roadmap steps 3 + 4 built (2026-10-09, session 13; committed and pushed, checked in the browser)

Nathan chose hardscape ahead of 3D fish steps 3-5 (those stay pending, order unchanged). Scene **v9**.
- **Items** (`types.ts` `Item`): `{id, kind: stone|wood|cave|plant, variant, seed, x, depth, lift, yaw, tilt, size}`.
  `lift` = base above the ground under (x, depth) (0 = on the substrate); `size` = length (stone, wood, cave),
  height (plant, manzanita), width (carpet patch). Shapes come from (variant, seed, size); files hold no meshes.
- **Library** (`scene/items.ts` `LIBRARY`, 19 variants): stones river / seiryu / dragon / lava / slate; wood branch /
  spider / manzanita / mopani; caves stone arch / clay tube / coconut; plants = the 7 existing card types (fern,
  anubias, sword, grass, stem, stemred, carpet patch). Pure skeletons (`stoneDims`, `woodLimbs`, `itemDims`) shared
  by renderer and starter code. Meshes: `render/items.ts`, one mesh per item, light baked per turn (cached by
  variant|seed|size|yaw|tilt), plants still crossed cards (3D plants = step 5).
- **Layouts became starter sets**: the Aquascape select ("Start from") replaces all items with that set's pieces
  (undoable), Shuffle = same set, new seed. `layout.id` is kept as the set started from; 'swamp' still shapes land.
  The old driftwood layout is now one `branch` piece with ferns / anubias tied on (raised by `lift`).
  `render/layouts.ts` deleted; `LAYOUTS` moved to `scene/items.ts`.
- **Migration**: a pre-v9 file (no `items`) gets `starterItems()` of its layout, so it looks much as before.
- **Editing**: library buttons add a piece at an open spot (all ticked tanks, shared id + seed). Click selects
  (`store.selItem`, exclusive with the fish `selId`; blue bounding box). Drag: the grabbed point stays under the
  pointer and the base slides over the ground and other pieces (`surfaceHit` + `supportLift` in `pointer.ts`), so
  pieces stack; pieces resting on the dragged one ride along. Shift + wheel or R turns 15°. Panel: size, turn, lean,
  raised, New shape (reseed), Drop, Duplicate (Ctrl+D), Delete (Del), Remove all. Picking: nearest fish or solid
  piece; plants only when nothing else is under the pointer. Tank resize keeps pieces at the same relative spot
  (`rescaleTank`), sizes physical. Split diff: "Aquascape A/B" by variant counts, "Arrangement" by relative spots.
- Tests 127/127 (`test/items.test.ts` new; `split.test.ts` resizes with `rescaleTank` now). Browser-checked
  (other chat's server on 5173; this chat could not start its own, 5-server cap): all 12 solid variants render,
  stacking and riders work, driftwood starter OK, no console errors. The shared browser scene was restored after.
- **Open / for Nathan's look**: visual quality of each generator (dragon stone pits read weakly at small sizes;
  wood end caps look light); no collision between pieces (they can overlap); fish ignore rocks (a bottom dweller can
  sit inside a stone); tank weight ignores rocks.

## Muse UX feedback fixes (2026-10-09; uncommitted, checked on the dev server)

- Fish readout: calibration rows (px, measured ratio, d/(d+z), angle off side-on) only with `?debug` in the URL;
  normal users see name, size, depth and "Looks, vs. at the front glass: N % as big".
- Area labels: the canvas header says "288 in² floor" (interior); the Tank panel says "footprint 24.4″ × 12.2″
  outside the glass (298 sq in)". Muse read the two unlabelled numbers as a maths error.
- "New" asks for confirmation when either tank has animals.
- Species rows: name + tag and size on line one, the Latin name on its own line, no wrap, ellipsis.
- First visit (`tanklook.seen` not in localStorage) opens "How to use".
- Still open from that feedback: tick Enforce HTTPS (Pages settings, Nathan; http:// still serves 200 with no
  redirect); shareable scene URLs; a real mobile check.

## HTTPS live (2026-10-09)

The Pages certificate had never been issued (the site served GitHub's `*.github.io` cert, so browsers showed a privacy
error). Provisioning ran from Settings -> Pages once the custom domain was (re)checked; tanklook.com now
serves a Let's Encrypt cert for `tanklook.com` + `www.tanklook.com`. Remaining: tick Enforce HTTPS once GitHub enables it.

## Stocking list replaces per-fish chips (2026-10-09, Nathan; uncommitted, checked on the dev server)

Nathan: no need to pick and place single fish; manage stocking by species and let the shuffle rules place them.
The Fish section's chip per animal is gone; `#list` is one row per species (order of arrival): name, −, a count
box, +. Add puts the picked species on the list (6 for a `group` species, else 1; already listed = a hint to use +).
− from 1 or typing 0 takes the species off; re-adding goes through Add. "Add school ×" removed. Each count change
(`setCount` in `panels.ts`, coalesced into one undo step per burst) adds or removes that species' last animals
and re-places **only that species** with `shuffleFish(s, r, only)` (new param: everyone else stays put and is kept
clear of). Shuffle still moves everyone. Canvas click / drag / the selected-fish controls are unchanged.
Test: `scatter.test.ts` "moves only that species" (134/134).
Possible next (Nathan's "gates and heatmaps"): per-species placement maps (e.g. near plants / caves, shade), today
it is only `level` bands, `zone` bottom and school / shoal shapes.

## Shuffle button (2026-10-09, Nathan; uncommitted, not yet checked in the browser)

"Shuffle" in the Fish section (next to Delete all) moves every animal to a fresh spot and pose, "a new slice in time";
one undo step, the same seed in every ticked split view. Ids, species, sizes kept. Rules (`src/scene/scatter.ts`
`shuffleFish`, which now also owns `randomPose` / `placeOnLand`): bottom dwellers on the ground, land / amphibious
animals via `placeOnLand`, snails via `spawnSnail` (floor or glass); swimmers in a band of the free water by the new
species field `level` ('top' 0.65-0.98, mid 0.2-0.8, 'low' 0.02-0.4); 3+ of a species with `group` 'school' form a
tight aligned school (heading ±12°), 'shoal' a loose group 2.2× wider (70 % follow the heading); big groups sometimes
split in two; everyone else is spread apart (best of 8 candidates). Data: school = neon, cardinal, ember, rummynose,
harlequin, chili, danio, tiger barb; shoal = cherry barb, livebearers, angel, discus, goldfish, corys, oto, kuhli,
clown loach, both shrimps; top = betta, the gouramis, guppy; low = cherry barb, GBR, Bolivian ram, kribensis.
Tests `test/scatter.test.ts` (117/117 total).

## Species preview tile (2026-10-09, Nathan; committed, ships in the next deploy)

Clicking a species in the Fish picker opens a tile under the list with its painted card (`drawFishCard`, or the
snail's side card), name, adult size, tag and note; clicking another swaps it, × closes it until the next click.
Canvases are cached per species (640 px wide). `panels.ts` `showPreview`,
markup `#spPreview` in index.html, `.spCard` / `.spHide` in style.css. Tests 114/114.
2026-10-09 (Nathan: "make the title cards 3D, orbit them before placing"; uncommitted, checked on the dev server):
the tile now shows the tank's own model (card + `fishBody`, or `snailBody`; flat card for species without 3D) on a
second small WebGLRenderer, `render/preview3d.ts` `SpeciesPreview`. Drag to turn (pitch clamped ±77°), double-click
resets to the 3/4 start view. Rendered on demand only; uses the flat-light key and no water tint (the shared `LU`
uniforms are swapped for its draw and restored). Framing fits 85 % of the bounding sphere, so it never rezooms while
turning. Tile 170 px tall in 3D. No WebGL: falls back to the 2D card. Tests 134/134.

## Deployed 2026-10-09: build 63 (`e721433`), everything on main incl. the 3D pilot, Edit boxes, cabinet doors

**Version number:** the sidebar header shows "build N" (N = commit count on main, from `scripts/build-info.mjs` via
Vite `define`; CI checks out full history for it); hover shows date + commit. It rises by itself with every push.

## Split view: per-view "Edit" boxes (2026-10-09, Nathan; committed `80379ef`, deployed in build 63)

Replaces "click a view to choose which tank the panel edits". Each split view's tab has an **Edit** checkbox; the
panel's changes go to every ticked tank (one undo step). After a split only B is ticked (as before); at least one box
stays ticked (the last one is disabled). Store: `editOn` (UI state, not saved), `targets`, `isEditing(i)`,
`setEditing(i, on)`, `edit()` loops over targets, `editTank(i)` for direct drags, `cam(fn, i?)`, `nextId()` (one id
free in every tank, so an added fish shares its id and the selection covers both). `scene.active` = the ticked tank
the panel SHOWS; pressing in a ticked view shows it. An unticked view only orbits / zooms / pans (no fish or terrain
drags). Dragging a fish or terrain dot changes only that view's tank. Tank size / shape writes are per-tank (only the
changed dimension is copied); adds use one seeded RNG so both tanks get the same placement. A ticked view's tab
(card) gets the blue border; the viewport itself is not framed (Nathan 2026-10-09). **Panel rule (Nathan 2026-10-09, later):** split, the panel is open exactly while a box
is ticked: unticking the last box closes the panel, ticking one opens it, closing the panel unticks all, the
"› Edit" button re-ticks the tank last shown. `targets` may be empty when split (a single tank is always [0]);
`store.clearEditing()`; panels.ts `keepRule` enforces it after split / undo / load and at startup. Tests 114/114 (split.test updated + 4 new). Checked on dev-5 (port 5243, new in
launch.json): boxes, frames, message, lid / length edits to B only, both, A only; fish add to both.

## Status (2026-10-09, session 11c: alpha fix on `fix-canvas-alpha`; 8-species pilot on `audit-3d`; neither merged)

Nathan 2026-10-09: four fixes accepted; fix the canvas compositing first, kept separate; then an 8-species pilot
(danio, male guppy, dwarf gourami, German blue ram = `gbr`, harlequin, oto, clown loach, goldfish), four views vs
the card, acceptance: side silhouette not worse, 3/4 plausible, head-on recognisable, no egregious wrapping, no
lighting / transparency defects, no species code; record the configuration effort. Do NOT merge `audit-3d` into a
dirty main: reconcile `viewer.ts` / `lighting.ts` with the other chat's changes after it finishes, rerun tests, and
re-check the lighting visually. No more polish on tiger barb / angel / bristlenose. QC list: angel pelvic filaments
splay near head-on, angel dark upper-edge line, bars ringing heads near head-on. Backlog: sucker mouth + bristles as
reusable anatomical features.
- **Alpha fix** (worktree `../Glass-Box-alphafix`, branch `fix-canvas-alpha` = `3d4eb5c` + `49b713d`, launch config
  `alphafix` port 5233): `viewer.ts` only. Verified by reading the drawing buffer after a frame and decoding the
  exported PNG (`shots/_verify.js`): before 10,920 / 10,920 / 88,038 translucent pixels (blue water / frosted white /
  iwagumi stones: plant edges too), after 0 / 0 / 0 in both. Picture `shots/57_alpha_sheet.png` (each export over
  white and over the page colour: before they differ, after identical). Tests 110/110. Ready to merge into main
  once the other chat's `viewer.ts` edit is in (same function; small conflict expected).
- **Pilot** (`audit-3d` `aa68521`): all 8 passed on the FIRST data-only pass: one line each (`thick`; oto also
  `belly 0.8, wide 0.4, noseW 0.5, eye.up 0.3`; clown loach `belly 0.4`), no tuning round, no new code. Sheets
  `shots/58_pilot_A.png` (harlequin, danio, guppy, gourami), `58_pilot_B.png` (GBR, goldfish, oto, clown loach),
  `58_guppy_sheet.png`. Watch items: head-on wrapping of the GBR eye bar, clown loach bars, danio stripes and the
  harlequin patch (same QC item as above); goldfish reads ball-like at 50° (the card is a fancy goldfish, not the
  common one Nathan named). Effort: configuration is minutes per species; the real cost is the four-view review.

## Status (2026-10-09, session 11b: four generic 3D fixes built on branch `audit-3d`, NOT merged)

**Nathan's decisions (2026-10-09, on the audit):** general 3D approach approved. Verdicts: tiger barb pass, kuhli pass
(most important: a radically different length/depth ratio with no special generator), bristlenose conditional
(geometry works; head, eyes, mouth, bristles not pleco enough yet), angelfish needs revision (round body lost the
identity). Do the four generic fixes before any rollout; add the straight-sided outline NOW and redo the angel (target
= the hand-drawn silhouette; angular but with some convexity, narrow peduncle, data-driven, not an angel exception).
Do NOT merge `audit-3d` or mass-convert yet. After the fixes: a production PILOT of 6-8 species spanning body plans,
then the full rollout; flat cards stay as the fallback until each 3D model passes its visual review.
Pre-release checklist item: bars ringing the head at extreme angles (tiger barb, angel). Later: reusable anatomical
features (ventral sucker mouth, snout bristles) for the bristlenose, not a reason to drop the generic geometry.

Built (worktree `../Glass-Box-audit3d` on branch `audit-3d`, commit `1e34b03`; launch config `audit3d`, port 5223;
pictures in that worktree's `shots/`: `55_tigerbarb_lighting.png`, `56_angel_sheet.png`, `56_bristlenose_sheet.png`,
`56_angel_card.png`). Tests 110/110, tsc clean.
1. **Lighting** (`lighting.ts`): fish facing is measured against the flank facing the viewer (`aqFishFacing`, slope
   0.5 both ways), so a side view equals the card under the reference flat light; the old fish "roll-off" boosted
   darks up to 1.7x (that, not the key, washed out the pleco) and is now a shoulder above 0.6; fish saturation = card
   (1.35). Tiger barb flank luminance: card 143, 3D before 161, now 142.
2. **Pectorals**: the "white blades" were a RENDERER bug: the canvas has alpha, and alpha-to-coverage fins wrote
   alpha < 1, so the page (on screen) or the PNG viewer's background (white) showed through every translucent fin,
   cards included. Fix in `viewer.ts`: alpha writes off while the scene draws. Also pectoral tint 35% toward the
   flank colour, softer spine. Candidate to cherry-pick to main on its own (affects live cards' fins too).
3. **Outline**: `Plan.angular` 0..1 (straight lines from peduncle and nose, smooth-min apex), fin shape `swept`
   (straight-edged sails), `pelvic.angle` (thread steepness). Angel: `angular 0.8, peak 0.375`, swept dorsal/anal,
   filament at 68°. Card now close to the hand-drawn one (`56_angel_card.png`).
4. **Eyes**: `Plan.eye.up` 0..1 turns the 3D eye along the section from the flank toward the top of the head
   (`EYE_TOP` 0.5 rad); bristlenose 0.7.
Next: Nathan reviews the three sheets; then the pilot (6-8 species).

## Status (2026-10-09, session 11: species audit (d) done; awaiting Nathan's call on the open points)

Dev server `dev-4` (port 5213) added: other chats held 5173/5183/5193. Card sheets: `scripts/card-sheet.js`
(`sheet(name, ids)`, before = pre-3D art modules copied from `de92c7f` into `shots/_art_before/`, after = `src/art`).
Stress-test sheets: rows card / 3D, same four views. Pictures: `shots/50_cards_{a,b,armour}.png`,
`shots/52_{tigerbarb,bristlenose}_sheet.png`, `shots/54_{angel,kuhli}_sheet.png`, `shots/54_angel_kuhli_card.png`.
Gotcha: the browser pane is 0×0 while hidden, so `exportPNG` fails; `resize_window` 1280×800 first. Bottom fish
leave the frame at high zoom: use zoom 2-2.6, `mult: 4`, small `crop`.
- **1. Card regressions from the paint pass (21 species checked, incl. hand-drawn neon / gourami / angel, shrimp,
  frog):** eyes, patterns, silhouettes and fins all intact. Changes are the intended ones (scale net, tone mottling,
  mouth line). One real regression, fixed ON MAIN: armoured catfish (panda cory, bristlenose, oto) got a fish-scale
  net; now `plates: true`. Minor, not changed: danio stripes slightly muted by the tone multiply; black molly shows the
  scale net strongly.
- **2. 3D stress tests: the loft generalises; the gaps are plan vocabulary + two generic rendering issues.** Species-
  specific CODE needed: none for any of the four (no `if species`). Per species (branch `audit-3d`, not on main):
  - tiger barb (ordinary): `thick: 0.38` only. Convincing.
  - kuhli: `thick: 0.85` + one generic fix ON MAIN: pectoral length capped at 0.75 × body depth (changes only kuhli;
    it had tetra-sized "wings"). Convincing as a striped tube.
  - bristlenose: `thick 1.3, belly 1, wide 0.6, noseW 0.8` (fields from the cory). Shape reads as a flat-bellied
    pleco. Open: eyes sit on the flanks (plecos: on top of the head; needs a generic eye-elevation field); bristles
    and sucker mouth are not 3D (would be species features = new code); paler than its card (see lighting below).
  - angelfish: hand-drawn, so it needed a full Plan (data; replaces the hand-drawn card with generated art) + one new
    generic fin shape `swept`. Loft handles the tall compressed body well. But the generated card is WORSE than the
    hand-drawn one: body is a disc, not the angel's diamond (`profile` can only make convex curves; needs a generic
    straight-flank option), fins still rounder than the hand sails.
  - Generic issues seen on all: (a) the flat-light key in fish mode (`lighting.ts`, `1 + 0.6 n·L`) brightens the
    3D flank ~1.2× and an up-facing back ~1.55× vs the card, so dark, broad-backed fish wash out (bristlenose);
    (b) 3D pectorals read as bright white blades (tiger barb, angel). (c) Bars still ring the head near head-on
    (soft, known).
- **Recommendation:** expand 3D to all species (step 2), after a short generic list: eye elevation, straight-flank
  profile option, key-light normalised to the flank, pectoral brightness. Keep angel hand-drawn (no 3D) until the
  profile option exists.

## Status (2026-10-09, session 10: 3D fish (a) markings + (b) cory shape built, committed, NOT pushed; awaiting Nathan's review)

Deployed first: the other chat's spot-light / size-label commit `305e490` only (pushed `305e490:main`; live on http and
github.io; HTTPS tanklook.com did not connect from here). The 3D fish commits stay local until Nathan approves.
Pictures (same four views, LEFT before = session 9, RIGHT after): `shots/48_discus_sheet.png`, `shots/49_cory_sheet.png`;
cardinal unchanged `shots/48_cardinal_*`. Toggle `__gb.fish3d.fade` (off = session-9 look, for pictures).
- **(a) Discus "eye-bar ring": root cause was the CARD, not the body texture.** The card's painted body rim (outline +
  bar) stuck out past the solid and read as a dark hoop at the head seen at an angle. Fix (all 3D species): the card of
  a 3D fish is cut out (`drawFishCard(..., hollow)`), past the outline where no median fin is rooted, 0.012 inside it
  at the dorsal / anal / adipose / tail roots. Needed `ctx.save/restore` round the art (an art leaves a clip set).
- Also general: on the 3D body, paint fades to a blurred copy (`PLAIN_BLUR` 0.03 W) where the surface turns away from
  the side (`aSide` = |n.z| attribute) and, mildly, where it is seen edge-on (shader, `uPlain`, program key 'p'). Colour
  fields stay (cardinal red holds), narrow bars and bands go soft. A faint far-flank arc remains near head-on (real).
- **(b) Cory**: new optional Plan fields, generic for the audit's stress tests (pleco, kuhli): `belly` (boxier lower
  half), `wide` (section widest low +), `pedT` (thickness at peduncle), `step` (head narrower than trunk from the gill
  cover), `noseW` (thickness kept to the snout: shovel). Cory: 0.9 / 0.5 / 0.28 / 0.18 / 0.4. Surface lookup is now
  numeric (`ringPt`, `thetaAt`, `normalAt`), so eyes and fins follow any section shape. 3D barbels: two tapering pairs
  per side (`barbelMeshes`, from `Plan.barbels`); the card / body texture no longer paints barbels for 3D fish.
  Not done (time-box): cory-specific dorsal (spine), stronger head step, side-profile changes.
- **Review pictures tooling**: dev-only `/__shot` endpoint (`scripts/shots-plugin.mjs`, in vite.config) saves PNGs to
  `shots/`; `scripts/shot-helpers.js` (`views(prefix, species, {zoom, crop, dist, mult})`) shoots the four views
  before/after, crop centred on the fish. Third dev server `dev-3` (port 5193) in launch.json.
- **Next (agreed):** Nathan reviews the two sheets; then (d) the audit: 1. card regressions from the global paint
  changes; 2. (more important) kuhli loach, bristlenose pleco, angelfish in 3D with as little species code as possible.

## AqAdvisor stocking level (2026-10-09, separate chat; LIVE with the proxy)

**State (2026-10-09):** proxy deployed on Nathan's personal Cloudflare (nathangoughreed@gmail.com, workers.dev subdomain
`tanklook`): https://tanklook-aq.tanklook.workers.dev, URL in `.env.production`. Redeploy: `npx wrangler deploy` in
`worker/` (wrangler login done on this PC). Nathan 2026-10-09: the % shows in the size label above the tank
("24 × 12 × 12″, 15 gallons, 288 in² | Stocking 72% (AqAdvisor)", red over 100 %, click = AqAdvisor's full report) and
updates by itself 1 s after the stocking or size settles (no Check button); single-tank view only (split tabs show
differences). Fish panel keeps a readout + "Not counted" note. Panel sections start collapsed on every load.
Same push shipped the approved 3D fish (`f77f791`, `66c69af`). Nathan's fish review (2026-10-09): discus pass, cory
pass for this iteration (still smooth / egg-shaped head-on, weak head-trunk step, generic dorsal; stop there);
**next work unit = the species audit** (kuhli, bristlenose, angelfish + one ordinary species, same multi-angle sheets).
- **Outage #3 (2026-10-09, two tanks refreshed close together) and gates.** Measured right after: AqAdvisor answers a
  stocking calc in 0.23-0.33 s whatever the species count (2, 6, 15 species), and 6 requests in ~4 min (two ~30 s
  apart) did nothing to it. So two requests are NOT heavy load; most likely the site (shared Apache/PHP host) is flaky
  on its own or its host throttles bursts from Cloudflare IPs (first probe after the outage hung 6 s at connect, the next
  was fine). Not proven; the worker now logs every upstream call (Workers Logs, `[observability]`) so the next outage
  has evidence. Gates: worker breaker (any failure -> KV `breaker:down`, no upstream calls for 10 min, cached answers
  still served, page shows "AqAdvisor is resting"); responses carry `cached: true`; the page sends one request at a
  time and waits 30 s after any uncached answer (`fetchStocking` queue; the label shows "Stocking: queued, ~N s" counting down). Proxy limit stays 2 a minute, plus a cap of
  200 fresh requests a UTC day (KV counter `day:<date>`). Deployed 2026-10-09 (version 70dcde85).
- **Outage #4 (2026-10-09 ~19:22 UTC):** site down for everyone (no answer from Nathan's PC either) after only 6
  proxy calls all day; points away from our traffic. **Uptime log** (Nathan: find out what brings it down, without load
  testing): worker cron HEADs aqadvisor.com every 5 min (`checkHealth`), and every upstream stocking call is logged;
  both in KV per day (`health:<date>`, `calls:<date>`, 30 days), served at `/log?days=N`. Summary:
  `node scripts/aq-health.mjs [days]` prints uptime %, each outage with its length and our calls in the hour before.
  Read it after a day or two before changing the gates.
- **Species policy (Nathan 2026-10-09), applies to every future species addition:**
  1. Choose which fish to add next from AqAdvisor's published most-popular list (location not found yet: not linked
     from the calculator, its articles or the report page; ask Nathan for the URL).
  2. Prefer species that are on AqAdvisor; add each new one's AqAdvisor name to `NAMES` in `scripts/aqadvisor-ids.py`
     and rerun it (only new / changed names are requested).
  3. Species not on AqAdvisor: count them as a similar fish in size and type (`STAND_INS` in the same script, flagged
     `standIn`; the Fish panel says "counted as a similar fish"). Now: axolotl = Dojo Loach, fire-bellied newt = Zebra
     Loach, fire-bellied toad = White Cloud Mountain Minnow. Land-only animals (dart frog, White's tree frog) stay
     uncounted.
- AqAdvisor has no API but its form is a stateless GET: `AlreadySelected=<id>:<n>::,...` + tank in inches +
  `FormSubmit=Update` returns "Your aquarium stocking level is N%". Filter choice doesn't change the %. http only, no
  CORS -> needs a proxy. No robots.txt (404).
- `src/data/aqadvisor.json`: 37 TankLook species -> AqAdvisor ids (all aquatic species; the 5 herps aren't in
  AqAdvisor and show as "Not counted"). Rebuilt by `scripts/aqadvisor-ids.py`. Choices: rummy-nose = H. bleheri,
  betta = male, goldfish = fancy, cherry shrimp = Red Cherry (N. heteropoda), nerite = zebra.
- `src/data/aqadvisor.ts`: request per tank (non-rect tanks: depth = floor area / length, so bottom area and volume match the real tank; Nathan: stocking goes by bottom area),
  link URL, `fetchStocking`. Proxy URL from `VITE_AQ_PROXY` (unset = link only, the current production state).
- `worker/aqadvisor-proxy.js`: Cloudflare Worker, only accepts well-formed `/stocking` requests, CORS for tanklook.com
  + localhost, 7-day cache. `worker/dev.mjs` runs it locally (launch configs `aq-proxy` + `dev-aq`, port 5203, with
  `.env.aq.local`). Deploy steps: `worker/README.md` (needs Nathan's own Cloudflare account; Claude can't create it).
- UI: Fish section, "Stocking  [Check]  AqAdvisor ↗"; result "72% (per AqAdvisor)", red with ", overstocked" over
  100 %. Verified in the browser: default tank 72 %, same as aqadvisor.com for the same link. Tests 110/110, tsc clean.

## Status (2026-10-09, session 9: 3D fish style test built, NOT committed; awaiting Nathan's verdict)

Roadmap step 1. Started late in the weekly window by Nathan's choice. `npm test` 104/104, `tsc` clean, checked in the browser
(dev server `dev-alt`, port 5183). Pictures: `shots/46_{discus,cardinal,bronzecory}_sheet.png` (before/after; straight on,
50° right, 25° above, 75° near head-on).
- **`src/render/fish3d.ts`** (new): a solid body lofted from `profile(plan)` (now exported from fishgen) between `pedU` and
  the nose: 40 stations (denser at the nose) × 28-point superellipse rings (exponent 2.4), with a capped peduncle.
  Thickness = `Plan.thick` (new optional field: max thickness / max depth; cardinal 0.42, discus 0.2, bronze cory 0.72)
  × depth, fuller toward the head. UVs = side projection of the existing card texture onto both flanks. Inset 0.006 W
  inside the painted outline, plus a colour-bled copy of the texture (opaque material), so the nose never shows the black
  of empty texels (seen on the first pass). Vertex colours darken the underside slightly. Geometry cached per
  species + bend (0.05 steps), `userData.keep`; material cached per texture.
- **Wiring** (build.ts): the body is a child of the existing card mesh, so the card stays as the fins (its painted body
  sits inside the solid) and picking, selection outline, rest offset and TL are unchanged. Only species in
  `fish3d.species` (the three above) with `thick` set; `fish3d.on` toggles (dev handle `__gb.fish3d`).
- Seen in the pictures: side view identical (as intended); the difference shows from 50° on and is clear near head-on
  (card goes edge-on, body keeps its volume). Artefacts: side projection stretches paint over the back and belly (cory's
  gill line becomes a crease over the top; discus bars wrap onto the front face); the far eye shows past the snout at
  50° on the thin discus; paired fins (pectoral, pelvic) are still painted on the flank, not 3D.
- Not done: bend shape check, a2c vs cutout check, performance with a school.

**Nathan's verdict (2026-10-09): "too cartoony... doesn't match how good and crisp the rest of the model displays."**
The 3D shape is not the problem; the procedural PAINTING is (flat saturated fills, blurred bands, no sheen / scales,
fins as tints). Picture `shots/47_cartoon_cues.png`. Decision pending: how to get realistic texture (see options in the
session 9 chat: photo textures on the 3D body vs a procedural realism pass vs bought models); this reopens the
art provenance policy.
Nathan 2026-10-09: NOT buying models; Meshy (AI image-to-3D) "seemed cool". **Proposed next work unit (fresh chat after the
weekly reset):** a head-to-head on cardinal, discus, bronze cory, same four views as `46_*_sheet`: (a) Meshy GLBs that
Nathan generates himself (Claude cannot make accounts; check Meshy's output licence per plan and that the reference
images are his or CC), loaded with GLTFLoader, scaled to adult TL, compressed by script (gltf-transform, no Blender),
water lighting via `aqPatch`; vs (b) CC-licensed photos (e.g. Wikimedia Commons, credited) projected onto the
session-9 loft. Ask Nathan before each download. Watch: fused or opaque fins in AI meshes; single-file size (about
10-20 MB for 42 Meshy fish vs 0.57 MB now; the website could load them on demand).

**Nathan 2026-10-09: "let's see how well we can refine the models without Meshy."** Realism pass done in session 9
(same three fish, sheets `shots/46_*_sheet.png` regenerated; uncommitted, tests 104/104):
- **Bug found:** the first 3D sheets were wrong. The loft's triangles were wound inward, so FrontSide culled the near
  flank and the pictures mostly showed the flat card. Fixed (`idx` order in `bodyGeometry`). Nathan's "too cartoony"
  verdict was on those broken pictures.
- Shader fish mode (`userData.fish` -> `uFish`, program key 'f'): facing = 1 + 0.6 n·L, Blinn highlight (x0.16), faint
  edge sheen, saturation 1.28, a soft roll-off instead of the hard max clamp (which erased form shading). In flat light
  (the default!) fish get a fixed key from above-front; without it the 3D body had no shading at all.
- Painting (affects every species' card too): eye with a shaded socket, faint rim, dim catchlight; tone multiply over
  markings (darker back / belly + mottling); scale net (`scales`, `Plan.scale`, default 0.024 W, discus 0.014);
  corydoras plates (`Plan.plates`); wavy bands (`band.wave`, discus); mouth line; fins at alpha 0.36 with a2c (cutout
  keeps 0.62; `fishTexture(id, edge)`).
- 3D body uses `fishBodyTexture` (painted with `style.features = false`: no eye / gill / mouth, which smeared over the
  curved head) with the nose tip blurred; real eyes = flattened domes along the surface normal, set in (`eyeSpot`).
- Nathan's review (2026-10-09): "materially closer... first real proof 3D fish can work". Discus best, cardinal good,
  bronze cory weakest (smooth blimp; needs ventral flattening, head structure, barbels, plated feel). Agreed order:
  (1) real fins, (2) contact shadow, (3) stretched markings, (4) species geometry (cory first).
- **(1) + (2) done:** pectoral + pelvic fins are their own membranes on both flanks (`pairedFins` / `drawPairedFin` in
  fishgen, `pairedFinTexture`, `finMeshes` in fish3d: rooted on the surface, pelvic swung 0.6 rad about the body axis,
  pectoral 0.75 rad about a vertical base + 0.25 down), with a dark leading spine; the 3D species' card and body texture
  leave them out (`style.paired`). Pectoral length 0.17 of the body (was 0.12; card too). Contact shadow for EVERY fish
  (build.ts `contactShadow`: soft ellipse on the ground, 0.5 x exp(-lift / 0.8 TL), widens with height). Cory plates
  kept off the back and belly (they ringed the body).
- Nathan's review of fins + shadow (2026-10-09): "credible low-complexity 3D aquarium assets"; remaining issues are
  species-specific polish, not viability. Cory improved most but is still weakest: head-on view too smooth / generic;
  wants a flatter belly, a less symmetric torpedo, a shovel-like head with a clearer head-to-trunk step, a more
  distinct peduncle, a cory-specific dorsal, and visible barbels. Cardinal: broadly convincing (slightly capsule-like
  head-on); don't spend more there yet. Discus: strongest; its eye-bar wrap is the most distracting texture issue.
  **Agreed order:** (a) stretched markings, (b) cory shape + barbels, (c) subtle cues (fin posture, tetra head), then
  (d) a quick audit of a representative subset of the other 34 species, to check the pipeline generalises
  (detail density, fin treatment, art that converts badly to 3D). Not a polish pass.
- **Nathan 2026-10-09 (session 10), plan refined:** validate the general method, don't build three beautiful exceptions.
  - (a) + (b) stay but are TIME-BOXED: fix the discus eye-bar wrap and reshape the cory, no further polish on either.
    Review = the same four views as `46_*_sheet` (straight on, 50° right, 25° above, 75° near head-on), before/after,
    so only those two changes show.
  - (c) subtle cues: deferred until after the audit.
  - (d) audit answers TWO separate questions:
    1. Regressions from the global paint changes on the other species' CARDS: eyes, patterns, scale texture, fin
       visibility, recognisable silhouettes.
    2. **(more important)** Does the 3D loft handle structurally different body plans? Stress tests: **kuhli loach**
       (eel-like), **bristlenose pleco** (flat-bellied, depressed, sucker mouth), **angelfish** (tall, laterally
       compressed, long fins; hand-drawn, may need a plan). Count the species-specific code each needs: convincing
       with little of it = the approach scales; lots of it = rethink parts of the architecture before step 2.
  - The audit's outcome decides: expand the 3D pipeline to all species, or rework the architecture.
- **Next: (3)** stretched markings: side projection smears where the surface turns away from the side (discus eye bar
  rings the head). Then (4) cory geometry. Not checked yet: the global paint changes on the other 34 species' cards.
- **Committed 2026-10-09 (session 10):** the other chat's spot-light pattern / spacing / beam angle and size label as
  `305e490` (split.test updated to the new label), session 9's 3D fish as `f77f791`. Not deployed. Tests 104/104.

**(superseded)** Nathan judges the direction. If yes: fixes for the artefacts above (eye and gill per flank instead of projected,
real pectoral fins), then roadmap step 2 (all 42 species, a `thick` per plan; hand-drawn neon / gourami / angel need plans
or their own loft).

## Status (2026-10-09, session 8: tank shapes phases 1 + 2 deployed `9286b85`)

Built on top of the uncommitted phase 1. `npm test` 104/104 (new `test/table.test.ts`), `tsc` and `vite build` clean,
checked in the browser (dev server `dev` on 5173), shots `shots/28_table_*`.
- **Stand style 'table'** with `stand.table { shape: 'rect' | 'round', L, D, x, z }` (mm; x, z = the tank's offset from
  the table centre, x right, z toward the back). Always present, kept while another style is chosen; older files get
  the default 36″ × 18″ top. No version bump (like `light.rows`).
- **`scene/table.ts`** (new): `fitTable` (run in `store.update` and on load) grows the top to hold the tank's rim
  outline (never shrinks), round keeps D = L, clamps the offset so the outline stays on the top; `tableRange` = slider
  limits; `roomBox` / `wallPlane` = tank glass ∪ table top, used by the wall (build), the orbit limit (`orbit.ts`), the
  person (wall check, and half-width taken from the table's edge too) and the view map.
- Renderer: top (32 mm) + apron set 50 mm in + four square legs (round: at the diagonals), finish colour. Camera
  framing includes the table's corners. View map draws the top under the tank.
- UI (Room): Table option; Rectangular / Round; length + depth (or diameter); tank left/right and front/back sliders;
  Centre / At the back / At the front buttons. Split diff lists table size and tank placement.
- **Deviation from the brief**: tank placement is sliders + buttons only, no drag-to-move mode (the brief allowed
  either). Add drag later if the sliders feel clumsy.
- Not checked: split view with two tables; PNG export with a table.

**NEXT:** roadmap step 1, the 3D fish style test (see "Roadmap (2026-10-09)" below). Tank shapes phase 3 (exact
lighting water path for shaped tanks, layouts tuned per shape) is still open; "layouts tuned per shape" folds into
roadmap step 3, where layouts become starter sets.

## Roadmap (2026-10-09, agreed with Nathan)

Nathan's goals: better-looking fish and plants; custom placement from a large library of hardscape (rock, caves,
wood) and plant species; more animals, including saltwater. **Static render only, still no animation.**

**Decision: fully 3D fish, built from the existing parametric body plan (`src/art/fishgen.ts`), not sourced models.**
- Performance is not a concern: about 2-4 k triangles per fish, so even a 200-fish tank stays under 1 M triangles. Build
  each species' geometry once, cache it and share it (InstancedMesh or a shared BufferGeometry); never regenerate it
  per rebuild (the scene rebuilds on every drag step). The `aqPatch` lighting (`onBeforeCompile` in
  `render/lighting.ts`) applies to any material, so 3D fish get the water lighting unchanged.
- Method: loft a body from the side profile with a width per station (add width to `Plan`); project the painted side
  texture onto both flanks; fins stay thin membranes (a2c, one alpha per fin). Nose-to-tail stays exactly adult TL.
  A static pose (curved body, tilt) becomes possible.
- Rejected: downloaded or bought glTF models (blocked by the art provenance policy, inconsistent style, the single file
  grows from about 0.57 MB to several MB, sourcing every species forever); AI-generated 3D (unclear rights, uneven
  quality).

**Reversal (Nathan 2026-10-09): custom hardscape and plant placement is now wanted** (replaces the 2026-10-08 call
"layouts are presets only").
- Scene items: each rock, wood, cave or plant carries `{kind, variant, seed, position, rotation, scale}`; pick and drag
  like fish, plus rotate and scale. Existing layouts become starter sets that place editable items. This needs a scene
  version bump plus a migration.
- Library = procedural generators with a seed, so variety costs no file size and needs no licence. Stones: seiryu,
  dragon stone, lava, river, slate. Wood: spider, manzanita, mopani, branch. Caves: stone arches, tubes, coconut.
- Plants become real 3D (leaf cards arranged along stems, per species: java fern, anubias, crypts, swords, vallisneria,
  stem plants, carpets), replacing the crossed cards.

**Saltwater last**, since it reuses both systems: a fresh or salt setting on each tank (filters the species list),
marine fish via the 3D generator, live rock and corals (branching, plate, mushroom, soft) as library items,
aragonite sand and clearer blue water presets.

**Order (one work unit per session):**
1. 3D fish style test: three fish, before/after pictures at the default 1200 mm, Nathan judges the direction.
2. Roll 3D out to all 42 species.
3. Placeable scene items + pick/drag/rotate/scale; layouts become starter sets.
4. Hardscape library.
5. 3D plant species.
6. Saltwater.

## Status (2026-10-08, session 7: tank shapes phase 1 built, NOT committed)

Spot-light grid committed as `fda7d88`. Then phase 1 of tank shapes (brief below), uncommitted, `npm test` 98/98,
`tsc` and `vite build` clean, checked in the browser (dev server `dev-alt` on 5183, since another chat held 5173):
- **Scene v8**: `Tank.shape?` 'rect' | 'bow' | 'round' | 'poly', `sides?` (3/5/6), `bowMin?`. A rectangle is stored
  as plain `{L, H, D}` (no shape key), so v7 files and rect tanks are unchanged. `normTank` enforces: round D = L,
  poly D = L x polyRatio(n), bow bowMin between max(20, D - L/2) (arc at most a half circle) and D.
- **`scene/shape.ts`** (new): footprint (walls = flat panes or one curved shell; ring; edges with outward normals),
  inside / insideBy / clampIn, nearestGlass + glassAt (point, smooth normal, arc length), offsetWalls / offsetRing
  (mitred, so rect outer glass is exactly (L+2t) x (D+2t)), clipToFootprint, chord, halfWidth, facingRuns.
  Polygons have a flat face toward the viewer (triangle: point to the back). Front-most point is at depth 0 on the
  centre line for every shape, so the camera / `dist` / orbit needed no change (answer 2).
- **Snails (answer 4)**: `Surface` is now 'floor' | 'glass'; a glass snail's (x, depth) IS its point on the glass
  (deviation from the brief's "wall index + arc length": same information, and no extra fields). v7 'front' etc.
  migrate to 'glass' with the coordinate snapped onto that pane. Rendered at nearestGlass, foot toward the local
  normal; dragging slides over the glass (the drag plane turns with it, so snails round curves and corners).
  spawnSnail weights floor area vs perimeter x wetted height.
- Renderer: panes from the outline (custom prisms, wound outward; EdgesGeometry at 20° so a curved shell shows no facet
  seams), bottom pane, rim rings, background on the glass facing the room wall (wraps round the back of round /
  angled tanks), wall + floor grid, water surface + meniscus, substrate grid clipped to the outline + skirt, terrain
  dots outside the outline hidden, cabinet = extruded outline with doors on the front-facing run (curved on a bow),
  frame stand = legs round the outline, hood warped to the bow, glass lid = one plate for non-rect, person half-width
  from the outline, view map draws the outline. Layout items clamped into the outline (non-rect only, so rect
  layouts are unchanged). Volume = area x H; weight masks the grid and uses outer-minus-inner ring for the glass
  (identical to the old rect formula, tested).
- UI: Shape select, Sides 3/5/6, bowfront End depth slider, labels Diameter / Width / Centre depth, Depth input locked
  for round / poly. Hood and peninsula end buttons disabled for round / poly; switching to those shapes turns a hood
  into a glass top and a peninsula into a back wall.
- Not done (by plan): lighting shader still uses the bounding box for the water path and spill (phase 3); table stand
  + tank placement (phase 2). Not checked: split view with two different shapes, PNG export of a shaped tank.

**NEXT:** Nathan reviews the shapes (`shots/27_*`), then commit + deploy; then phase 2 (table stand).

## Status (2026-10-08, session 6: split-view polish deployed `eee6334`; spot-light grid committed `fda7d88`)

Shipped in `eee6334`: panel collapse button outside the panel; locked views share one image window (equal tanks line
up); person framing from the card's real edges; stocking diff ignores the resize rescale; × on each difference makes
that tank match the other (`DiffItem[2]` = match fn); tab "× Close" hides the tab (☰ chip restores), "Delete" removes
the tank; one viewpoint map per view with its own hide/show; orbit cannot pass through the room wall
(`scene/orbit.ts`, 150 mm clearance, also enforced after edits and on lock); peninsula cabinets get back doors;
renamed "Vivarium Visualizer". After that (not yet committed): spot lights form a count × rows grid
(`light.rows` 1-4, default 1, no version bump). `npm test` 88/88.

**NEXT WORK UNIT: tank shapes + table stands** (Nathan 2026-10-08), ahead of land + semi-aquatic species below.

## Tank shapes + table stands (requested 2026-10-08; phase 1 built 2026-10-08 session 7, phases 2-3 not built)

Request: circular, regular triangle, pentagon, hexagon, bowfront ("model it as a rectangle but just have min and max
widths and have the tool do a smooth curve between them"); stand geometry for each; and a stand that is a table
(rectangular or circular) with the tank movable along its top.

Survey of rectangular assumptions done 2026-10-08 (Explore subagent): about 40 sites. Biggest risks: the glass pane
generator (build.ts addTank 35-78, five BoxGeometry panes), the substrate mesh (addSubstrate 279-315, quad grid +
4 side strips), snail `Surface` enum ('front'|'back'|'left'|'right', physics spawnSnail, build snailMeshes 398-424),
and the lighting shader's axis-aligned water box (lighting.ts uWater/uTankMin/Max, aqWaterPath).

Proposed design (for Nathan to confirm at the start of the work unit):
- **Scene v8** `tank.shape`: 'rect' | 'bow' | 'round' | 'poly' (+ `sides` 3/5/6, + `bowMin` = end depth for 'bow').
  Keep L/H/D as the BOUNDING BOX (bow: D = centre depth; round: L = D = diameter; poly: width across, D derived), so
  the heightfield (u = x/L, v = depth/D), camera, walls, orbit, diff and fish storage keep working.
- One new helper, `footprint(T)`: outline polygon (round ~64 segments, bow front ~32) plus inside / clamp-to-inset /
  area / perimeter. Everything else calls it: clampFish, nearestWater/Land/randomLand, fitFish, spawn, pointer drag,
  volume, tankWeight (mask the grid), water plane + meniscus, substrate (clip the grid to the outline, skirt along it),
  glass (extrude the outline ring; flat panes per edge, curved = one shell), rim, glass lid, view map (polygon),
  person half-width, stand footprint.
- Bowfront curve: back flat; front goes from `bowMin` at the ends to D at the centre along a smooth curve (circular
  arc through three points is the real-world shape; confirm).
- "Eye distance from the front glass" for non-rect shapes = from the front-most point of the outline.
- Hood: rect and bow only; other shapes get open top or glass lid. Peninsula end walls: rect and bow only (or: wall
  sits against the bounding box; confirm).
- Snails on glass: phase 1 only on flat panes of rect/bow/poly (Surface becomes pane index + position); round: floor
  only until curved-glass snails are built.
- Lighting shader: phase 1 keeps the bounding-box water path (small error outside the outline, where there is no
  water to see through); exact prism/cylinder path later if it shows.
- **Stands**: cabinet = footprint extruded (doors on the front-facing flat faces); frame stand = legs at the outline's
  vertices. **Table**: new stand style with its own top (rect L×D or round diameter, thickness, legs) larger than the
  tank; `stand.table { shape, L, D, x, z }` = the tank's offset on the top, clamped so the footprint stays on it.
  Move the tank by dragging it in a "move tank" mode, or with two sliders. Walls and person go relative to the
  table edge when a table is used (confirm).
- **Nathan's answers (2026-10-08), these override the proposals above:**
  1. Bowfront front = a true circular arc through (0, bowMin), (L/2, D), (L, bowMin). Yes.
  2. Eye distance: "whatever is most analogous to how it's done now". Now: `dist` = eye to the centre of the front
     glass, straight on. So for every shape, `dist` = eye to the front-most point of the outline on the tank's
     centre line (round: the front of the circle; bow: the bow's apex; poly: the front vertex or the front face's
     midpoint, whichever is nearer the eye). Orbit stays about the bounding-box centre.
  3. Hood and peninsula end walls: rect and bow only, for now.
  4. Snails on curved glass: build it NOW, not later ("we will have to revisit... easier now"). So the Surface
     model becomes general in this work unit: a glass wall index + position along the outline (arc length) + height,
     for flat panes AND the curved shell (round and bow front), with the snail oriented to the local glass normal.
  5. With a table stand, the wall and the scale person sit relative to the table's edge. Yes.
- Phases: (1) footprint + shapes + glass + water + substrate + fish + snails on any glass (answer 4) +
  volume/weight + view map + cabinet; (2) table + tank placement (answer 5); (3) exact lighting path, layouts tuned
  per shape.

## Status (2026-10-08, session 5: split tanks deployed)

Open next: Nathan's review of the amphibian art + sizes (`shots/26_amphibian_cards`), then climbing.

## Status (2026-10-08, end of session 2)

**Live at tanklook.com** (GitHub Pages, push to `main` = test + deploy in ~1-2 min; last deploy `80a860d`).
Repo: github.com/nathangoughreed-star/tanklook (public; commits use the GitHub no-reply email via repo-local git
config, never the work address). `gh` is not installed. HTTPS: check the Pages certificate, then tick Enforce HTTPS.
**Domain: tanklook.com** (bought by Nathan 2026-10-08 at Namecheap, 1 year; personal learning project).
Phase 1 PoC kept at `reference/aquarium-poc.html`. Vite + TypeScript, see README.md. `npm test` 45/45, build clean.

Shipped by end of session 2: restyled fish art, 37 species (generated body plans), bottom dwellers, snails on
floor/glass, aquascape presets, custom fish sizes, fixed orbit lens, scale person (stays put), viewpoint map,
peninsula wall, room lighting with tank spill, default eye distance 3 m. Details in the sections below.

Verification method for looks: dev page + `window.__gb = {store, viewer}`; `viewer.exportPNG(n)` POSTed to a
throwaway local python sink (port 4199) writing `shots/` (gitignored); pictures sent to Nathan with SendUserFile.
Note: another chat's dev server may already hold port 5173 (same folder, HMR works): open http://localhost:5173.

## Water level + colour + swamp + frame stand: built and deployed (session 3, 2026-10-08)

- **Scene v5** `water { level, color, opacity }`. Deviation from the proposal below: `level` is a **fraction of full**
  (0.1-1; 1 = `WATERLINE_GAP` below the top), not mm, so Tank B and a resized tank keep the same fill (fish map by
  fraction too). `waterY(T, level)` in physics.ts. v4 files load full / clear.
- **Tint** (lighting.ts `aqWaterPath`): every lit material blends toward the lit water colour by
  `1 - exp(-k * path)`, path = length of the eye-to-point sightline inside the water box (slab test), so it works for
  fish, plants, substrate, the background and the room seen through the tank; nothing above the water is tinted.
  `opacity` = share of the colour after 300 mm (`waterK`): physical, so a deeper tank looks more tinted.
- Surface: a faint transparent plane at the level + a meniscus line round the glass (edge-on straight on).
- **Fish in the water**: `scene/water.ts`. `keepInWater` runs after every 'scene' store update and on load (swimmers:
  centre <= surface - half card height; glass snails below the line; bottom dwellers / floor snails untouched).
  The level slider uses `setWaterLevel`, which scales swimmers' heights with the water so schools keep their shape.
  Render also clamps per tank (Tank B). New fish / schools spawn relative to the water; snail spawn takes the line.
- UI: Water section (Level, Tint, colour picker, quick picks Clear / Blackwater #6b3d14 60 % / Green #5d8a2e 50 %;
  picking a colour on clear water sets tint 30 %). Tests 52/52.
- Pictures: `shots/12_water_full_clear` .. `17_blackwater_low_orbit`.
- **Swamp (Nathan 2026-10-08: no preference between layout and terrain setting -> built as the recommended layout
  preset; snails may sit on land too).** `scene/terrain.ts`: `groundHeight(S, T, x, d)` = substrate, or swamp land
  where higher; it replaced `substrateHeight(S.substrate, ...)` everywhere in the renderer. Land ~62 % of H (gentle
  waves, a bit lower at the front), 1-2 elliptical pools with smooth banks; pool 1 always opens onto the front glass.
  Fractions of L/D/H, so Tank B matches. Land is fixed (physical): raising the water floods it. Choosing the layout
  drops the water to 42 % if it is higher. Substrate mesh 72x72 for swamp; front/end faces follow the ground; emerged
  ground tinted soil/moss by vertex colour. Plants: grass, fern, anubias, sword, mud stones on land; stems and grass
  growing out of the pools. Substrate "Show" off still draws swamp land.
- `fitFish` (water.ts) now also keeps swimmers above the ground, and moves any fish over land (or bottom dweller on
  emerged ground) to the nearest spot with enough water for its card (`nearestWater`, 41x41 grid); a fish taller than
  the deepest pool goes to the deepest spot (it then pokes into the bank; seen with an angel in a 16" swamp).
- Pictures: `shots/18_swamp_straight`, `19_swamp_orbit`, `20_swamp_top`.
- **Open metal frame stand (Nathan 2026-10-08)**: `stand.style: cabinet | frame` (scene v5, default cabinet). Frame =
  38 mm square tube legs, top and bottom rails, levelling feet, extra legs every ~90 cm on long tanks; the finish
  colour applies. Picture `shots/21_frame_stand`.
- Tests 55/55. Deployed 2026-10-08 (session 3, `8fddff8`). HTTPS on tanklook.com still serves the github.io
  certificate (curl: wrong principal); http works. Nathan to check Settings -> Pages and tick Enforce HTTPS.

## Custom terrain (Nathan's idea, 2026-10-08; built and deployed session 3, `2e9ce54`)

- **Scene v6** `terrain { on, cols, rows, h[] }`: a grid of ground heights (mm, Tank A, physical like the substrate)
  spread evenly over the floor, corners included. When on it replaces the corner slopes and the swamp land
  (`groundHeight`), so fish, plants, snails and the water rules all follow it. Broken grids load as off.
- Interpolation: bicubic **Catmull-Rom** (passes exactly through every point, smooth across them), clamped to
  0..0.95 H (overshoot near a sharp dip can otherwise go below the floor).
- UI (Substrate): Custom terrain checkbox (first turn-on samples the current floor, so a swamp or slope becomes the
  starting shape; a grid kept from before is reused), Grid slider = points along the length 3-25 (rows follow D/L
  for square cells; changing it RESAMPLES the current surface), Edit points / Done editing, Flatten (all points to
  the average). Corner sliders and slope buttons disabled while on.
- Editing (UI state `viewer.terrainEdit`, not scene data): dots on every grid point in Tank A, drawn over everything,
  faint grid lines on the ground. Drag a dot up/down: height follows the pointer at the dot's on-screen scale
  (works from any angle); one undo step per drag. Verified with real pointer events: 120 px -> +188 mm, undo exact.
- Known: sampling a swamp onto a coarse grid turns round pools into V-notches (raise the Grid first); the layout
  rebuilds on every drag step (fine so far).
- Pictures: `shots/22_terrain_dots`, `23_terrain_pulled`, `24_terrain_result`. Tests 60/60.

## Dry tank / terrarium (Nathan 2026-10-08: "TankLook, not AquariumLook"; built and deployed session 3, `2e9ce54`)

- `water.on` (scene v6, default true; older files load with water). Off: no tint, no surface, water controls disabled,
  fish (everything not a snail) **hidden but kept in the data** and not clamped; Add / Add school disabled for fish
  with a hint; status line says how many are hidden. Snails stay (read as land snails) and may use the whole glass.
- Verified in the dev page: 7 fish hidden, back on water -> 7 shown. Picture `shots/25_dry_terrarium`. Tests 61/61.

## Approximate tank weight (Nathan 2026-10-08; built and deployed session 3, `2e9ce54`)

- `scene/weight.ts` `tankWeight(S)`: water = water depth over the ground integrated on a 60x60 floor grid (so level,
  slopes, terrain and swamp land count; dry = 0); substrate = ground volume x 1.6 kg/L bulk + 0.35 kg/L pore water
  where submerged; glass = the renderer's pane sizes at the actual thickness (`glassThickness`) x 2.5 kg/L, + 4 mm
  lid panels with a glass lid. Not included: stand, rocks, wood, plants, rim trim, equipment.
- Readout under the tank volume: "≈ N lb filled: water, substrate, glass" (kg in cm mode).
- Sanity: standard 55 gal (48x21x13) with 2" gravel = 587 lb (water 406, substrate 88, glass 92 at auto 8 mm);
  the commonly quoted "~625 lb" assumes nominal water and no substrate. A 36x16x18 swamp is mostly land: ~350 lb of
  substrate, little water. Tests 64/64.

## NEXT WORK UNIT: land + semi-aquatic species (Nathan 2026-10-08: "mixed land and water animals in the same tank")

Decided (Nathan 2026-10-08, session 4): sizes are **total length** (nose to tail tip, like the fish); first batch =
**frogs, newts, axolotl** only (dart frog, White's tree frog, fire-bellied toad, fire-bellied newt, axolotl: one
quadruped painter); **climbing is in this unit** (tree frog on glass and branches from the start). Lizards, turtle,
snakes, crabs and inverts come later.

Progress (session 4, 2026-10-08):
- Site title "TankLook: Vivarium Visualizer" (Nathan, 2026-10-08; was "Arium"), tagline "Vivarium visualizer · true-to-scale · beta".
- Single "Add" now randomizes spot, heading, pitch, roll and bend like a school member (`randomPose`, panels.ts).
- **Step 1 done (not pushed):** species `habitat` (resolved; snails 'both', default 'water'). `restsOnGround` (water.ts)
  decides rest vs swim: bottom / land always rest; 'both' rests where the water at its spot is shallower than its
  card height, or in a dry tank. `fitFish`: land animals go to `nearestLand` (terrain.ts; left in place if the tank
  has no land), 'both' swimmers clamp between ground and surface. Dry tank hides only 'water' species. Add / Add
  school blocked with a reason (`blocked`) for fish in a dry tank and land animals with no land; land spawns use
  `randomLand`, amphibians land half the time. Drag slides resting animals along the ground; list tags land /
  amphibious. Five species in species.json (sizes provisional, Nathan to review with pictures): dart frog 45, White's
  tree frog 100, fire-bellied toad 45, fire-bellied newt 90, axolotl 230 (water, bottom). Art keys exist but have no
  painter yet. Tests 68/68.
- **Step 2 first pass (not pushed):** `art/herps.ts` paints sitting frogs (`drawFrog`, one design frame scaled by
  aspect) and newts / axolotl (`drawSal`: tail to u = 0, splayed legs, axolotl tail fin + external gills), limbs as
  tapered tubes, far legs darker. `herpMeta` gives aspect + rest (= ground line). Picture `shots/26_amphibian_cards`.
  Awaiting Nathan's review of looks and sizes.
- **Bare bottom (Nathan 2026-10-08):** the hidden Substrate "Show" checkbox became a "Bare bottom (no substrate)"
  choice at the top of the substrate list (still `substrate.show = false`; the last type is kept). Depth sliders
  disabled while bare. The tan backing plane under the substrate is no longer drawn on a bare bottom, so the stand
  top or the room shows through the bottom pane (picture `shots/27_bare_bottom`).
- **Substrate back face (Nathan 2026-10-08):** the substrate mesh had front and end faces only, so from behind (clear back
  glass in a peninsula) you saw into it and onto the tan backing. Back face added. Picture `shots/28_terrain_from_back`.
- **Peninsula end is the user's choice again (Nathan 2026-10-08, reversing session 3):** `wall.side` = back | left |
  right; Room buttons Behind / Left end / Right end. Session-3 files with 'peninsula' load as 'right'. Background plane,
  grid lines, person placement, wall and view map all follow the chosen end. Picture `shots/29_peninsula_left`. Tests 69/69.
- **Background on any sides; round-tank arc (Nathan 2026-10-12):** the background no longer follows the
  room wall. `render.bgSides` (any of back / left / right / front, buttons under Background) and `render.bgArc`
  (round tanks only, 20..360°, default 145 = the old wrap) via `backgroundRuns` (shape.ts): panes facing any chosen
  side (an angled pane between two chosen sides counted once); on a round tank an arc centred on each chosen side,
  overlaps merged, 360 = the whole shell. Older files load with the side the wall gave them (no version bump). A Room
  end button still carries a background that sat only on the old wall side along with it. Grid lines follow the
  background. Tests 138/138.
- **Orbit framing (Nathan 2026-10-08: "tank and person should be centred"):** the lens SIZE still comes from the
  straight-on view (unchanged decision), but the image window is re-centred at every orbit angle on tank + stand +
  person (`frameBox` at the current camera). Zoom no longer pulls toward a point between tank and person: `windowCentre`
  (camera.ts) keeps the bounds centre but moves just enough to keep the tank itself whole while it fits, so zooming crops
  the room first. Picture `shots/35_framing_sheet` (straight-on 1.5x, 54 deg right, 50 deg left + 20 up, 54 deg at 1x).
- **View map shows the real framing (Nathan 2026-10-08):** the map drew the cone symmetric about the eye-to-tank-centre
  line, ignoring the lens shift, so it claimed "centred" when the picture was not. It now unprojects the image's left /
  right edges and centre from the actual camera (shift included). Nathan's split-view screenshot (42x17x15, 57 deg
  right) was the OLD frozen-shift framing; with the re-centring above, single and split views both centre tank +
  person (picture `shots/44_map_matches_view`).
- Dev-server gotcha: the shared Vite server sometimes keeps serving a stale module after an edit; `touch` the file.
- **Light height (Nathan 2026-10-08):** `light.height` (mm above the tank top, 20-900, default 50 = the old fixed
  `LAMP_Y`; older files load 50). Lighting is normalised with the fixture at 50 mm, so raising it dims the tank
  (falloff) and evens it out (wider footprint); the room spill source extends up to the fixture and grows up to 1.8x
  at 450 mm+. Above 110 mm the fixture hangs on thin cables to the ceiling (room height 2700 mm). Hood: fixed inside
  the hood, slider disabled. Lighting slider "Height". Picture `shots/38_light_height_compare` (50 vs 450 mm). Tests 71/71.
- **Collapsible panel (Nathan 2026-10-08):** every panel section is a `details.sec`, closed by default; open sections and
  the hidden-panel state are per-viewer prefs (`localStorage['tanklook.ui']`). Selecting an animal opens Fish. The
  panel hides with the ‹ button (top right of the panel); "› Edit" (top right of the view) brings it back.
- Next: revise art per Nathan, then sizes review, then climbing.

## Split tanks: built and deployed (session 5, 2026-10-08)

As built (the design notes below still hold, with these specifics):
- **Scene v7** `{ name, units, tanks: TankSetup[1..2], active, camLock }`; `TankSetup` = everything one tank has (`tank`
  dims, camera, render, light, substrate, layout, terrain, water, lid, stand, wall, person, fish). Fish live in their own
  tank's mm (no more Tank A space / `mapToTank` at render). `render.edge` stays inside each setup but is an app
  preference: the Edge control and load keep it equal in every tank. v6 files: one tank, or (compare on) a second copy
  at Tank B's size with fish mapped by fraction; v6 `tankB` is dropped when compare was off.
- Every scene helper (water, terrain, weight, build, layouts, viewmap) takes a `TankSetup`; `rescaleTankA` -> `rescaleTank`.
- Store: `store.tank` (active setup), `edit(fn)` (active tank), `cam(fn)` (mirrors to both while locked), `setActive`,
  `splitTank` (copy, new one active), `closeTank(i)`, `setCamLock` (re-lock copies tanks[0]'s camera). Undo keeps each
  tank's current camera and the lock; split/close are undoable. Selection stays when switching tanks if the same fish
  id exists there (true right after a split).
- UI: Compare section = "Split tank" button (Tank B size box removed; the Tank section sizes the active tank). Panel shows
  "Editing Tank A/B". Pressing (or wheeling) in a view activates it first; the active view gets an accent frame.
  Padlock button on the divider (SVG, shackle swings open when unlocked; the tab refresh key includes `camLock`, which
  it first forgot, so the icon lagged a toggle). Locked = one shared FOV; unlocked = each view frames itself.
- **Viewport tabs (Nathan 2026-10-08):** `ui/diff.ts` `tankDiff(a, b, units)` lists only differing SETTINGS (a size
  change alone does not list auto glass or a full tank's depth); numbers for dimension-like values, "X A" / "X B" for
  details (Stocking, Water tint, Wall colour, Terrain, Arrangement, Substrate slope). Nothing different = no labels,
  only Save/Delete. Items wrap. **Folded (Nathan 2026-10-09):** the differences + Save/Delete row shows only while the
  tab is hovered (or a button in it has keyboard focus); folded, a faint "N diffs ▾" hint sits in the top row. The
  "× Close" (hide tab) button and its ☰ restore chip were removed the same day as redundant. Tabs sit in each view's TOP-RIGHT corner and
  the panel's "› Edit" button is TOP-LEFT (Nathan 2026-10-08); Tank A's tab keeps 80 px clear of Edit when the panel is hidden.
  Each difference is its own quiet box (faint fill + hairline border). Single tank: the size label carries a
  "⧉ Split to compare" button (same action as Compare -> Split tank).
- **Deselect (Nathan 2026-10-08):** a plain click on empty space (under 4 px of movement) clears the selection; Esc did
  already. A drag still orbits and keeps it. Single tank: the plain size label as before.
- The readout's "Same fish in Tank B" row is gone (the tanks are independent now).
- **Saving (Nathan 2026-10-08):** autosave (localStorage `tanklook.scene`) and Save… hold the WHOLE scene (both tanks;
  the file reopens split). Each split tab also has **Save** (left of Delete): that tank alone as an ordinary single-tank
  file named "<scene> - Tank A/B".
- Verified in a dev page (own port 5175, so Nathan's 5173 scene was not touched): tabs, frame, lock, independent orbit,
  re-lock snap, close either tank, undo. Tests 81/81 (new `test/split.test.ts`).

### Original design notes (split tanks)

Nathan: "the comparison is strongest when you can compare literally any variable. Let the user split their current tank
and then edit them separately by selecting either viewport, which changes which is being edited on the left." And:
"have a tab at the top of each viewport that the user can choose to exit that tank from."
Today Tank B is only a size (`tankB`); it mirrors Tank A's contents at the same relative positions.
Design so far:
- **Split** copies the current tank into a second, independent tank. Clicking a viewport makes it the active one (clear
  highlight); the whole left panel edits the active tank. Fish drags act on the tank they are in.
- **Each viewport gets a tab at the top** (its name / size, e.g. "A · 36x16x18") with an x to close that tank; closing one
  leaves the other as the single tank. (Answers the "which tank stays" question.)
- **Fully independent tanks (Nathan 2026-10-08):** "two totally independent tanks; let the user change whatever they want
  between them." Every setting is per tank: size, hardware, stand, room (wall, person, room light), contents AND the
  camera. Only app preferences stay global (units, quality / edge mode).
- **Camera lock toggle (Nathan 2026-10-08):** orbit + zoom are linked between the two views today ("cool") but must be
  switchable: an on/off lock button overlaid on the divider between the two views (padlock style; default locked).
  Locked: dragging / zooming either view moves both (same az, el, dist, zoom). Unlocked: each view has its own camera.
  Keep the one-FOV rule while locked so sizes stay directly comparable; when unlocked each view frames itself.
  Re-locking after the views were moved apart snaps the second tank's camera (orbit angle, eye distance, zoom) to the
  ORIGINAL tank's (the one that existed before the split, `tanks[0]`), not to whichever view is active (Nathan 2026-10-08).
- **Difference labels (Nathan 2026-10-08):** the label at the top of each viewport (today "Tank A: 42 × 17 × 15" (L×H×D)")
  lists the variables that differ between the two tanks. Numbers are shown for dimension-like values (size, stand
  height, eye distance, water level, light height...); finer details get a name per side only: "Stocking A" vs
  "Stocking B", "Gravel: black sand" vs "Gravel: white sand", "Water tint A" vs "Water tint B". Built from a
  `tankDiff(a, b)` over two setups (one entry per differing setting, label for each side). Assumed until Nathan says
  otherwise: size is always shown (it names the tank), the rest only when it differs; the label sits in the viewport
  tab with the close x; a long list wraps. Today Tank B can only differ in size, so this lands with split tanks.
- Data: scene v7 `tanks: [TankSetup, TankSetup?]` + `active` + `camLock`, each setup holding its own camera; migrate v6 (tankA + global contents; tankB + compare ->
  a second setup copied from A at tankB's size, fish mapped by fraction as today). Everything that reads `S.tankA` /
  global contents (panels, physics helpers, water.ts, terrain.ts, weight.ts, build.ts, pointer.ts, validate.ts, tests)
  takes a tank setup instead. Undo stays one stack over the whole scene.
- Open: does the old "same setup, different size" mirror mode survive (e.g. a "linked" toggle)? Recommended: no; split
  is a copy, and editing one leaves the other alone.
- Lesson (session 4): editing index.html makes Vite do a full page reload, which drops the undo stack. Before
  test edits in Nathan's dev scene, copy `localStorage['tanklook.scene']` to a file (not a page variable) and
  restore it from there afterwards.

Original proposal:
- species.json `habitat: 'water' | 'land' | 'both'` (default water; snails 'both'). Land animals rest on ground
  above the water line (any ground when dry), like bottom dwellers (rest offset, drag slides along the ground);
  'both' (frogs, newts, turtles, crabs) may be on land or in the water. Add the rule to `fitFish` / `nearestWater`
  (a `nearestLand` twin) and the spawners.
- Starter list (~15, sizes need Nathan's review like the fish): leopard gecko, crested gecko, bearded dragon, corn
  snake, dart frog, White's tree frog, fire-bellied toad, axolotl (water), fire-bellied newt, musk turtle, red-claw
  crab, fiddler crab, isopods, millipede, praying mantis, tarantula. Length convention to decide (snout-vent vs total).
- Art: fishgen body plans do not fit. New painters: quadruped side view (lizard / frog / newt / turtle), snake
  (side view lying in curves, or a ground decal), arthropod. Same style rules as the fish (no outlines, soft shading).
- Later: climbing (geckos / tree frogs on glass and branches, like glass snails), terrarium hardscape (cork bark
  background, mesh lid, heat lamp / UVB fixture), and the site tagline "aquarium visualizer" -> "tank visualizer".

## Next work unit: water level + water colour (requested by Nathan 2026-10-08)

Nathan: "Water level, as well as water color. Be able to create swampy tanks with land rising above the water level
creating pocket(s) of water. This restricts where fish spawn to the actual water. Default water level 'full' with a
slider to bring it down. Colour: default = clear water, plus an opacity slider and a continuous colour picker."

Proposed design (confirm the open points with Nathan, with pictures, before building):
- **Scene v5** `water: { level: number (mm above the tank floor; default = full), color: '#rrggbb', opacity: 0..1 }`.
  "Full" = interior height minus a small gap (reuse `WATERLINE_GAP` = 25 mm, which snails already use). Slider in
  the user's units; migration: older files get full / clear.
- **Render:**
  - water surface: a horizontal plane at the level, seen from above or when orbiting;
  - tint below the level: a colour mix in the lighting shader for in-tank materials (`vAqP.y < level`), stronger
    with distance through water (front glass to the point), scaled by opacity;
  - the glass above the line stays clear; a faint meniscus line on the panes;
  - default "clear" = barely visible blue-green at opacity ~0.
- **Fish:** spawn and drag clamp to the water: fish y + half card height <= level. Where land rises above the water,
  add / add school / drag must pick spots with water above the substrate (sample x/depth where
  `substrateHeight < level - fish height`). Bottom dwellers only on submerged substrate. Snails: glass spawning
  bounded by the water line (pass the level into `spawnSnail` instead of `WATERLINE_GAP`); decide whether snails
  may sit on emerged land (real snails do).
- **Swamp terrain (the big open point):** the substrate today is 4 corner depths, bilinear, capped at 60 % of H; it
  cannot make pockets. Options:
  (a) a new **layout preset "Swamp / paludarium"**: a noise heightfield with land masses above the water and 1-2
      water pockets, seeded + Shuffle like the other layouts (fits "no custom hardscape design yet");
  (b) a **substrate heightfield** setting ("terrain: flat slope | islands | bank"), independent of layouts.
  Recommendation: (a), and make the substrate mesh and `substrateHeight()` read a heightfield so fish placement and
  bottom dwellers follow it. Emerged land needs its own look (moss, soil, emersed plants) vs submerged gravel.
- Open: does the light fixture move down with the level (no, it sits on the tank); colour presets (tannin/blackwater,
  green) as quick picks next to the picker?
- Tests to add: v4->v5 migration, fish clamping to the level, spawn never on land / above the line, heightfield
  `substrateHeight` matches the mesh.

## Fish art style (done 2026-10-08)

Problem (Nathan): fish read as cartoons next to the tank render. Goal: not photoreal, but matching the tank's style
(no outlines, textures, soft shading, muted natural colour).

Cartoon cues in `src/art/placeholder.ts`: thick black outlines (wider than a neon's stripe at adult size), flat
fills with hard colour blocks, big white-ringed eyes, solid opaque fins.

**Step 1 (do this): restyle the three procedural fish in code** as a style test:
- no black outline, or a thin edge one shade darker than the local body colour;
- countershading: darker back to lighter belly, soft gradients that round the body;
- soft-edged internal colour bands (keep the SILHOUETTE crisp: cards use alpha-test cutout);
- small realistic eyes (dark pupil, metallic/coloured iris, no white ring);
- fins as faint tinted membranes with fine rays (consider alpha-to-coverage for partial fin alpha);
- keep nose/tail tips exact: card width == adult TL is the size calibration.
Deliver before/after pictures of each fish in the tank at the default 1200 mm distance (per working rules: pictures
with any question about the look), then ask Nathan to judge the direction.

**Step 1 status (2026-10-08): direction approved by Nathan; polish pass done.** `src/art/placeholder.ts` rewritten:
body on its own layer (countershading gradient, markings painted source-atop so the silhouette never changes, soft
inner rim + thin edge at 20 % dark), fins as separate membranes (alpha 0.62 so they survive the 0.5 alpha test,
rays fan from a root), small eyes (iris gradient, forward pupil, tiny catchlight). Nose/tail 'c' tips unchanged at
u = 1 / u = 0. Angel dorsal/anal and gourami dorsal/anal are now separate fin shapes, not part of the body outline.
Pictures: `shots/` (gitignored): 1_tank, 2_angelfish, 3_pearl_gourami, 4_neon_tetra, 5_fin_modes. In cutout mode
fins render opaque (any alpha >= 0.5 is solid), so fin tints were darkened to read as translucent; alpha-to-coverage
shows real see-through fins.
- **Default edge mode is now alpha-to-coverage (Nathan, 2026-10-08)**: fins see-through. Files that stored `cutout`
  keep it; a missing/invalid edge falls back to the default. UI lists the a2c option first.
- **Rule learned: no smooth alpha gradients in fin art.** a2c has only a few coverage levels (MSAA samples), so an
  alpha fade shows as hard stripes. Keep each fin at one alpha; vary colour, not alpha.
- Angel body is now a sloped diamond (forehead runs straight up to the dorsal origin) reaching into the fin bases,
  so body + fins read as one shape. Pictures 6_tank_v2, 7_angelfish_v2 in `shots/`.
Capture method: dev page + `window.__gb`, `viewer.exportPNG(4)` POSTed to a throwaway local sink (python, port 4199).

**Step 2 (later, needs a decision): image-based fish** if more realism is wanted or the species list grows to 25-30.
Side-view cutout PNGs, scaled so nose-to-tail == TL; `species.json` already has an `art` field, extend it to accept
an image path. Blocked on the art provenance policy: own photos / Creative Commons (attribution) / commissioned
illustrator / AI-generated (murkier reuse rights).
Alternative considered: one parametric shaded "body plan" generator (scales better than hand-coding each species,
no licensing, but stays illustrated).

## Species, layouts, snails, custom sizes (2026-10-08; pushed for dogfooding, sizes table still to review)

- **37 species** (`src/data/species.json` v2): 33 fish/shrimp + 4 snails, typical adult TL in aquaria (snails: crawling
  length). Scale anchors tested (neon 35, chili 18, angel 150, oscar 300). Clown loach 200 mm with a note (to 30 cm).
  The size table needs Nathan's eye: these are the tool's main promise.
- **Art: parametric body-plan painter** (`src/art/fishgen.ts`), the "alternative considered" in Step 2 below: profile
  (depth, peak, back share, snout, mouth), tail type (fork/notch/round/veil/lyre/double/sword), dorsal/anal shapes, pelvic,
  adipose, barbels, markings (band/bars/spots/blob/poly) on body and fins. Card aspect and resting offset are computed
  from the plan (`planMeta`), so species.json needs no aspect for generated art. Shrimp have a custom painter. Neon,
  pearl gourami, angel keep their hand-drawn art. Shared helpers moved to `src/art/paint.ts`.
- **Bottom dwellers** (`zone: 'bottom'`): corys, bristlenose, oto, kuhli, clown loach, SAE, both shrimp. Always rest on
  the substrate (centre = surface + rest x TL; stored y ignored); drag slides along the floor; Y slider disabled.
- **Snails** (`kind: 'snail'`, Fish.surface floor|front|back|left|right): spawn area-weighted over the substrate and the
  inside of the four panes below the water line (`spawnSnail`, tested: every point equally likely, so each surface in
  proportion to its area; Nathan said "equally likely on any surface", flagged as an interpretation). Floor: upright
  side-view card. Glass: two one-sided cards back to back, foot toward the glass (seen through that pane), shell toward
  the tank; yaw = heading in the pane; drag stays in the pane.
- **Layouts replace the sample plant (scene v4)**: `layout {id, seed}`: none / stones / driftwood / planted / iwagumi,
  with Shuffle (new seed). Generated from tank size, physical sizes (bigger tank = more pieces, not bigger ones).
  Stones = displaced icosphere (smooth, or faceted for iwagumi), driftwood = tapered tube limbs, both with baked
  vertex shading; plants = crossed cards (`src/art/plants.ts`: stem, red stem, grass, sword, java fern, anubias,
  carpet). Built groups cached by (layout, seed, tank, substrate, edge) and cloned per rebuild. v3 files: shown
  plant -> 'planted', hidden -> 'none'. Default scene: planted.
- Drag step cost measured in the (hidden, emulated) preview pane: 51 ms with no layout, +0-20 ms with a layout.
  The baseline was already there; worth profiling in a real browser before schools get big.
- **Custom sizes (Nathan, 2026-10-08)**: `Fish.tl` optional mm override (juveniles or big individuals), absent =
  adult; validated to 15-130 % of adult and dropped when equal to adult. "New fish size" slider (default Adult)
  applies to Add / Add school / snails; selected fish has a Size slider + Adult / Half / Quarter. Same art scaled
  (juvenile proportions such as bigger eyes are not modelled). Verified: 40 % angel measures exactly 0.4x on screen.
- Pictures: `shots/8_species_scale`, `9_layouts`, `10_orbit_driftwood`, `11_snails`.
- Weak spots: discus fins read as separate flaps; cherry shrimp is crude; stem plants still a bit regular.

## Decisions made (2026-10-08)

- **Rendering: Three.js, fish as flat textured cards ("planes") in a simple 3D box tank.** Not a 2D canvas with
  hand-rolled projection, and not Konva. Reason: perspective, occlusion, camera moves, picking and export come free;
  the custom-2D route re-implements a mini 3D engine.
- **Perspective rule:** the eye is a fixed physical distance from the front glass (default 3000 mm since 2026-10-08, was 1200; range 400-5000), the same for every
  tank; zoom only changes field of view (crop), never perspective. Comparison view uses one FOV for both tanks so pixel
  sizes are directly comparable. Verified: measured on-screen ratio = d / (d + z) exactly, straight-on.
- **Units:** all scene data in mm. Coordinates: x along length 0..L, y up 0..H, depth z = mm behind the front glass
  (three.js z = -depth). Tank L/H/D are **interior** dimensions; glass is added outside.
- **Scene data is the source of truth**, serialisable JSON with a `version` field; the renderer rebuilds from it.
- **Card edges:** alpha-test cutouts (hard silhouettes). Art rule: clean outlines, transparent background, no soft glows
  or baked shadows. Alpha-to-coverage is the smoother option.
- **Camera:** free orbit by dragging empty space (pivot = tank centre, radius chosen so straight-on eye distance is exact).
  Proposed release limits still ±30° left/right, 0-25° from above (sliders flag beyond). Not yet decided whether to enforce.
- **Orbit keeps the lens (Nathan, 2026-10-08):** FOV and lens shift come from the straight-on framing
  (`frameStraightOn`) and stay fixed while orbiting; only the angle changes. Before, each angle was re-framed, and the
  stand/person near the eye widened the lens so the tank shrank as if the viewer stepped back. Zoom (0.5-4x) is the
  only lens control.
- **Scale person stays put + viewpoint map (Nathan, 2026-10-08):** the person has one fixed spot in the room
  (`personSpot`), chosen from the straight-on view: beside the tank on the chosen side, as far from that eye as the
  tank centre; the open side if the chosen one is behind the wall. A first version followed the orbit to keep the
  scale constant, but it jumped sides when the wall got in the way; at the 3 m default the scale swing is ~1.3x. Viewpoint map: top-down inset (tank, wall, person, eye, view cone,
  distance/angles), DOM overlay so never in PNG exports, toggle in Display (browser storage, not scene data).
- **Wall: back | peninsula (Nathan, 2026-10-08).** Left/right end merged into one 'peninsula' (right end against
  the wall; old left/right saves load as peninsula). In a peninsula the background panel and grid move to the wall
  end and the long back glass is clear.
- **Default viewing distance 3 m (Nathan, 2026-10-08)**, max raised to 5 m. Fish look smaller until zoomed; less perspective distortion; the room reads as Nathan wanted.
- **Room light lights the room (Nathan, 2026-10-08):** wall, floor, stand, hood and person are room surfaces
  (`userData.room`): brightness = `roomLevel(room)` (0 at 0, full from 0.3, eased; default 0.15 = 0.75) + light
  spilling from the tank (nearest point of the tank box, falloff over `spillReach`, facing term, fixture colour x
  brightness; fades as the room brightens). The void beyond the room dims too. At 0 the tank is the only light.
- **Fish drag plane follows the view:** front-ish = parallel to glass; >45° from above = floor plan (sets depth);
  side-on = side plane.
- **Substrate:** four corner depths, bilinear surface, physical thickness (not scaled between tanks), mm-sized grain;
  anti-tiling = two rotated texture samples blended by value noise + soft brightness patches.
- **Glass:** auto thickness by interior height (<=13" 5 mm, <=17" 6, <=21" 8, <=25" 10, <=30" 12, else 15); standard
  (green edge) or low-iron. Rimmed / rimless.
- **Lighting:** custom shader injection into MeshBasicMaterial (not three.js lights; those leave edge-on cards black).
  Emitters above water: spot (cone), tube (line segment), LED array (grid). Normalised so every fixture type has the
  same mean brightness at mid-height; colour temperature via Kelvin to RGB at unit luminance; room-light ambient.
  Cards take the light level at their position (no facing term). Saturation lift 1.35 on cards, hue-preserving clamp.
- **Hosting goal (Nathan, 2026-10-08):** a publicly hosted website.
- **Phase 2 stack (Nathan, 2026-10-08):** Vite + plain TypeScript (no React); GitHub Pages via GitHub Actions;
  **public** repo. Only procedural placeholder art is committed until the art provenance policy is settled.

## Still open (rewritten 2026-10-14, lane D)

Waiting on Nathan, one picture page each in `shots/review/` (index `shots/review/REVIEW.md`; shots/ is local, gitignored):
- R1 3D amphibians: accept, or fix the frog thighs (tubes) and the far-eye knob at 50°?
- R2 head-on marking wrap (discus, tiger barb, clown loach, harlequin, GBR): pass? (the harlequin patch smudges head-on)
- R3 3D rollout batch 1 (14 fish): pass? (ember / chili blocky head-on, honey gourami belly block, betta fin slab)
- R4 delete the unused hand-drawn `drawTetra` / `drawGourami` (art/placeholder.ts)?
- R5 3D shrimp: accept, or fix the comb-like leg fan head-on?
- R6 3D snails: accept? (mystery spire low at the back, pale lip notch)
- R7 male / female looks and sizes, 11 species (re-shot after the honey stripe and swordtail 115 mm changes)
- R8 hardscape generators good enough to show? (coconut doorway sawtooth, thin wood, flat end caps)
- R9 wall spill: follow the actual beams instead of the box-to-fixture model?
- R10 adult sizes of all 57 species (fresh, salt, herps, inverts; females separate)
- R11 tick Enforce HTTPS in GitHub Pages settings (http still serves 200, no redirect)
- R12 shareable scene URLs (not built)
First-visit audit: `shots/audit/AUDIT.md`, 53 findings (4 S1, 20 S2, 29 S3) with shots; fix lane G works from it.
The S1s: water level piles every fish at x = 12 mm; phone label overflow widens the page; aquascape drag erratic in the
straight-on view; first visit is an empty box (no pointer to Examples / Animals).
Not decided, low priority: camera limits (orbit already clamps elevation -20..85; "release" never defined); fish ignore
rocks (a bottom dweller can sit inside a stone); tank weight ignores hardscape.

Settled since this list was first written (2026-10-08), kept here so nobody reopens them: plain TypeScript, no React
(Phase 2 stack); lighting shipped (spot / tube / LED, light map, beams); art is procedural generators only (Nathan
rejected bought / AI models, repo is public), so the provenance question is moot; hardscape steps 3-4 shipped, step 5
(3D plants) shipped as lane A, corals + live rock as lane E.

## Phase 2 build decisions (2026-10-08)

- Scene format v2: `glass` is `'auto' | number` (v1 stored a string); `edge` is `cutout | a2c` (the PoC's "soft"
  demo mode was dropped and migrates to cutout); added `name`. Unknown species are skipped on load with a warning.
- One `Store` owns scene + selection + history; every mutation goes through `store.update()`. UI re-syncs all
  controls from the scene on every change (one `sync()`), so undo, file open and pointer drags refresh identically.
- Readout is computed right after the synchronous draw (fixes the PoC's one-frame lag).
- Lighting in compare view: checked, works (uniforms are set per viewport before each render).
- Removed PoC test aids: depth ladder, "what to test" list. Kept the perspective readout (it is the proof).
- Autosave key `tanklook.scene` in localStorage, debounced 400 ms and flushed on `pagehide`.
- Save… downloads `<name>.json` (application/json), not `.tank`: browsers flagged `.tank` as an untrusted file type (Nathan 2026-10-12). Open… still accepts old `.tank` files.
- **Saved tanks in the browser (Nathan 2026-10-12):** toolbar is New / Open… / Save / Download. Save puts the scene, with a
  320 px JPEG preview, into `src/scene/library.ts` (index `tanklook.library` = names + pictures; each scene under
  `tanklook.lib.<id>`; `tanklook.libCurrent` = the entry this scene came from). Same name as that entry: updated silently;
  same name as another: confirm before replacing; new name: new entry. Open… is a dialog of cards plus "Open a downloaded
  file…". Storage-full saves roll back and say to Download. ~9 KB scene + ~15 KB picture, so ~5 MB holds a few hundred.
  Browser-only (Safari clears after 7 days unvisited), so Download stays the real backup; the per-view tab button is now
  Download too. The autosave slot is separate and unchanged (readout now says "Autosaved").
- **Room + lid (Nathan, 2026-10-08), scene v3** (v2 files load with these off/open):
  - `stand {show, height 12-48 in (default 30), finish black|white|oak}`: same footprint as the outer glass, from the
    floor up to the tank underside (`tankUnderside()` / `floorY()` in physics.ts).
  - `wall {show, side back|left|right, color}`: room wall 50 mm off the glass; left/right = peninsula. One-sided, so
    it vanishes when orbiting behind it. A plain floor is drawn whenever stand or wall is on.
  - `lid open|glass|hood`: glass = two 4 mm panels + hinge strip (on the rim lip, or on the panes if rimless);
    hood = low-profile moulded lid (38 mm back, 22 mm rounded front, feeding hatch) after Nathan's reference photo;
    with a hood the light fixture is not drawn (it is inside) but its light still applies.
  - `person {show, height 0.9-2.1 m (default 1.75), side left|right}`: neutral flat silhouette for scale, standing on
    the floor 250 mm beside the tank at mid-depth; turns to face the viewer (billboard about the vertical axis).
    Placeholder art, same pipeline as the fish cards.
- **Framing:** bounds now include the stand; the image window is shifted (lens shift via `setViewOffset`) so the
  bounds are centred. Eye point unchanged, so perspective and the d/(d+z) rule hold (tested). The shift fades as
  zoom rises (`offset / zoom`), so zooming closes on the tank, not the cabinet.
- **Glass edges:** every pane gets an outline (light on dark backgrounds, dark on light); low-iron edge tint made
  stronger. Thin glass edge faces are sub-pixel, outlines are always at least 1 px.
- Checked, not a bug: from steep angles the black top rim hides a strip of the interior behind the front glass
  (pixel readback confirmed the sightline passes through the rim).
- **Single-file build (Nathan, 2026-10-08):** `npm run build:single` -> `dist-single/tanklook.html` (~560 kB), made by
  `scripts/build-single.mjs`, which inlines dist/'s script and CSS (no plugin). Opens from disk with no install;
  verified self-contained (served alone: one request, no errors). Gitignored; attach or share the file.
- Dev server exposes `window.__gb = {store, viewer}` for debugging (dev only, not in the production build).
- Bundle is ~520 kB (137 kB gzip), almost all three.js. Fine for now.

## Phase 2 plan (approved 2026-10-08, built as above)

1. Repo + hosting skeleton first: Vite + TypeScript, GitHub repo, auto-deploy (GitHub Pages or Vercel/Netlify).
   Deploy a "hello tank" on day one so hosting risk is retired early.
2. Port the PoC into modules: `scene/` (types + JSON versioning + validation), `render/` (tank, substrate, glass,
   lighting shader, cards), `interact/` (pick, drag, orbit), `ui/` (panels), `data/species.json`.
3. Then the Phase 2 feature list from the original spec: species search, add/drag/duplicate/delete, save/load
   (localStorage + JSON file), PNG export, undo/redo.
Each module is a separable unit, so subagents can build in parallel once the types in `scene/` exist.

## Known gaps (rewritten 2026-10-14, lane D)

- Every one of the 57 species (12 salt) draws in 3D from a generator (fish PLANS incl. shrimp, `HERP3D`, snail shells;
  11 with a female look); flat cards remain only as the fallback / picking target. Watch items are R1-R6 above.
- Mobile: usable but rough (audit S1 #2, S2 #6-8): no pinch zoom, page overflow from the tank label, half-screen panel.
- No stocking guidance for salt tanks (AqAdvisor's marine calculator is broken on their side; Nathan: leave it off).
- Scene rebuilds fully on every change; the audit timed Split / Undo / colour-temperature changes at 0.7-1.7 s, but on
  software GL, so re-measure on real hardware before acting.
- Examples (Open…) are plain scene files: re-save them when art changes (see Lane F).
- Many "uncommitted" / "not pushed" notes in the dated sections below 2026-10-12 are stale: all that work is on main.
