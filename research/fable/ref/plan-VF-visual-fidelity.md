# Plan VF: visual fidelity, cheap (2026-11-11)

Goal: the same layouts look more three-dimensional, less repetitive, seated in the ground and clearly underwater,
with no noticeable cost in frame time or first-load time. Sources: the realism review in chat (2026-11-11) plus a
second opinion (YourArium_Visual_Fidelity_Claude_Handoff.pdf), merged.

## What the code already is (checked 2026-11-11)
- Almost every material is unlit (MeshBasicMaterial). Light comes from `aqPatch` in render/lighting.ts (~line 466),
  spliced into every program via onBeforeCompile. That is the single place to add caustics, depth and tone mapping.
- Nothing in src includes `tonemapping_fragment`, so setting `renderer.toneMapping` would do **nothing** to these
  materials. Tone mapping has to go into aqPatch itself.
- Solid surfaces already get a facing term; fish and plant cards skip it on purpose (they would go black). Rocks look
  flat because the light comes almost straight down, not because they lack a facing term.
- Plants (render/plant3d.ts) already bake form shading (base and inside darker) into vertex colours and come from a
  seed. Growth (lane GR1) added its own random stream so saved plants keep their look: copy that pattern.
- Coarse grounds already have 3D grains (render/grains.ts). Fine grounds (sand, mud, soil) are a painted tile: this is
  the "sprinkles" look in screenshot 1.
- render/scatter.ts is an instanced, seeded strewing tool: reuse it for contact blobs and coarse-grain clusters.
- Known cost: aqPatch is in every program, so every line added there lengthens the cold shader link on Windows
  (lanes EF1 / SG). Keep its GLSL small, switch effects with **uniforms, not #defines** (defines multiply programs).

## Rules for every stage
- Toggles: each effect gets its own switch (`?fx=` query flag or a dev settings object: caustics, depth, contact,
  tonemap, variety). No all-or-nothing refactor.
- Measure with alternating before/after frames (memory perf-ab-alternate-frames): GPU ms, p95 frame, draw calls,
  cold link time. Budget for the whole plan: about +0.5 ms GPU on the reef scene, +1 draw call, link time within noise.
- Every stage that changes the look: before/after pictures of the three reference scenes to Nathan, his yes before
  push. No scene version bump; saved tanks keep their layout and every plant keeps its identity.

## Stages

**VF0 Baseline (half a day).** Save the three reference tanks as fixed setups: planted 4 ft (screenshot 1), small
neon tank (2), reef bow-front (3). Lock the camera, light preset and seed. Record pictures and numbers
(scripts/perf-baseline.mjs, scripts/cold-ab.mjs) into research/visual/vf0/. Everything after compares to this.

**VF1 Toggles + tone mapping (lighting.ts).** Add the fx switches. In aqPatch, apply AgX (or ACES) just before
`colorspace_fragment`, behind a uniform; room and gear materials need the same so the room does not shift against
the tank. Render the three scenes unchanged / AgX / ACES and let Nathan pick. Only then retune palettes.

**VF2 Plant variety (plant3d.ts, art/plants.ts).** From a new random stream (as GR1 did), never the existing draws:
per plant small changes in height, lean, turn and hue/brightness; per leaf a small hue jitter in the vertex colour.
Stay inside the species (a sword stays a sword; memory real-gear-true-colours). Pull the lime greens in PLANT3D
toward real aquarium greens: deeper, a touch olive, varied between species. Build time only; no per-frame cost.

**VF3 Substrate (art/placeholder GRAIN_LOOK, render/textures.ts, grains.ts).** Fine grounds: add broad, faint colour
patches (low-frequency world-space noise) and make the dark flecks cluster (thin them with a clumping field, more near
slopes and hardscape) instead of spreading evenly. A few coarse grains near rocks via scatter.ts. Front cross-section
through the glass: darker and denser toward the bottom. No new pebble meshes in bulk.

**VF4 Grounding (new render/contact.ts, hooked from build.ts).** One InstancedMesh of soft radial blobs on the ground
under every hardscape piece and plant clump (darker for wood and rock, faint for plants), multiply-blended, no depth
write: one draw call total. Rock recesses: darken by height above the ground in vertex colour; try concavity only where
the mesh is dense enough to show it (the PDF's warning), otherwise skip. Plant bases are already darker: strengthen
only for grass.

**VF5 Caustics (lighting.ts aqPatch).** One small tileable caustic texture made once at startup (procedural, 256 px),
sampled twice at different scroll speeds and combined with min(), projected straight down in world xz. Weight by
upward facing (vAqN.y), the light level already computed there, and fade with depth below the surface. Sharper under
spots, softer under tubes and LED bars (ties into the light model). Cards take a weak share. Off for dry and
terrestrial setups. Cost: two texture reads per pixel.

**VF6 Water line, depth, glass (lighting.ts, items.ts glassMats).** Depth: with distance from the front glass, lower
saturation and move slightly toward the water hue, max about 15 %. Not the earlier "fog inside the tank" that Nathan
rejected: no haze, no brightness loss. Water line: a thin bright mirrored band at waterY seen through the front and
side glass, plus a faint meniscus. Glass: a faint diagonal reflection gradient on the front pane.

**VF7 Re-compare and tune (all).** Freshwater and reef separately. Reef: darker, richer coralline purple on live rock,
a blue actinic cast when the light is reef-type, recess darkening on rock. Remove any effect that is noticeable but
not convincing. Final pictures and numbers against VF0.

## Lanes (three, files do not overlap)
- **VF-A shader:** VF0, then VF1, then VF5, then VF6 (all lighting.ts, so in series in one lane).
- **VF-B plants:** VF2 (plant3d.ts, art/plants.ts). Starts once VF0 (reference tanks, scripts/vf-shots.mjs,
  render/fx.ts) is merged; colour retune waits for VF1's pick. VF-C starts at the same point.
- **VF-C ground:** VF3, then VF4 (grains.ts, textures.ts, placeholder GRAIN_LOOK, new contact.ts, one hook in
  build.ts).
- VF7 runs last, in VF-A, once B and C have landed.
Check lane LA (leaf algae, plant material hook in plant3d.ts) and any open lighting.ts lane before starting B and A.
