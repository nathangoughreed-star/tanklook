# TankLook (aquarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Status (2026-10-08)

Phase 1 proof of concept: done and accepted. Kept at `reference/aquarium-poc.html` (reference only).

**Phase 2 build: done locally, not yet deployed.** Vite + TypeScript project at the repo root (see README.md for
layout). Verified: `npm test` 24/24 (perspective ratio = d/(d+z) straight on, same pixel size across tank depths,
zoom never moves the eye, glass table, bilinear substrate, v1→v2 migration, clamping, undo coalescing, storage);
`npm run build` clean; production build exercised in the browser: add, drag, undo/redo (buttons + Ctrl+Z/Shift+Z),
compare + LED lighting, orbit, PNG 2× export, JSON save/open, bad-file rejection, autosave + restore on reload,
375 px phone layout with no sideways scroll.

Shipped features: species search (common/scientific, accent-insensitive), add / add school / drag / duplicate /
flip / delete / delete-all (armed), save/load (localStorage autosave + JSON file), PNG export 1×/2×/4×, undo/redo
(200 steps; slider and pointer drags coalesce into one step; camera moves are saved but not undoable), interior
volume readout, more tank presets.

Next: **create the public GitHub repo, first commit + push, enable Pages (Settings → Pages → Source: GitHub
Actions)**, then check the live URL.
**Domain: tanklook.com** (bought by Nathan 2026-10-08 at Namecheap, 1 year; personal learning project). **LIVE 2026-10-08** over
http at tanklook.com (DNS done: 4 A records + www CNAME). Pending: GitHub HTTPS certificate, then tick Enforce HTTPS;
the www check was still yellow from cached parking DNS. Custom domain must be set in Settings (Actions deploys ignore
public/CNAME).
Repo: github.com/nathangoughreed-star/tanklook (public; Pages source = GitHub Actions; commits use the GitHub no-reply
email, repo-local git config, never the work address). Push to `main` = test + deploy in ~2 min. `gh` is not installed.

## Next work unit: fish art style (agreed 2026-10-08)

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
- **Perspective rule:** the eye is a fixed physical distance from the front glass (default 1200 mm), the same for every
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
  only lens control. Side effect: orbiting toward the scale person can put them between eye and tank (physically
  right, unhelpful); auto-hiding the person when it blocks the view is offered, not built.
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
whether lighting ships in v1; hardscape scope; React vs plain TS for the UI layer (see Phase 2 plan).

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
- Layouts are presets only (no custom plant/hardscape placement, by Nathan's call 2026-10-08).
- Scene rebuilds fully on every change, including each drag step; fine at hundreds of fish, revisit if schools get big.
