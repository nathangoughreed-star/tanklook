# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

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
  only the close button. Items wrap; "× Close" sits at the bottom of the tab. Tabs sit in each view's TOP-RIGHT corner and
  the panel's "› Edit" button is TOP-LEFT (Nathan 2026-10-08); Tank A's tab keeps 80 px clear of Edit when the panel is hidden.
  Each difference is its own quiet box (faint fill + hairline border). Single tank: the size label carries a
  "⧉ Split to compare" button (same action as Compare -> Split tank).
- **Deselect (Nathan 2026-10-08):** a plain click on empty space (under 4 px of movement) clears the selection; Esc did
  already. A drag still orbits and keeps it. Single tank: the plain size label as before.
- The readout's "Same fish in Tank B" row is gone (the tanks are independent now).
- **Saving (Nathan 2026-10-08):** autosave (localStorage `tanklook.scene`) and Save… hold the WHOLE scene (both tanks;
  the file reopens split). Each split tab also has **Save** (left of × Close): that tank alone as an ordinary single-tank
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

## Still open

Release camera limits; species sizes review (list built, 37); art pipeline + provenance policy;
whether lighting ships in v1; hardscape scope (now: roadmap steps 3-5); React vs plain TS for the UI layer (see Phase 2 plan).

## Phase 2 build decisions (2026-10-08)

- Scene format v2: `glass` is `'auto' | number` (v1 stored a string); `edge` is `cutout | a2c` (the PoC's "soft"
  demo mode was dropped and migrates to cutout); added `name`. Unknown species are skipped on load with a warning.
- One `Store` owns scene + selection + history; every mutation goes through `store.update()`. UI re-syncs all
  controls from the scene on every change (one `sync()`), so undo, file open and pointer drags refresh identically.
- Readout is computed right after the synchronous draw (fixes the PoC's one-frame lag).
- Lighting in compare view: checked, works (uniforms are set per viewport before each render).
- Removed PoC test aids: depth ladder, "what to test" list. Kept the perspective readout (it is the proof).
- Autosave key `tanklook.scene` in localStorage, debounced 400 ms and flushed on `pagehide`.
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

## Known gaps

- Illustrated (generated) art for 34 of 37 species; image-based art still blocked on the provenance policy.
- Layouts are presets only; custom placement is now planned (roadmap step 3, Nathan 2026-10-09).
- Scene rebuilds fully on every change, including each drag step; fine at hundreds of fish, revisit if schools get big.
