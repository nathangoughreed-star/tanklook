# Aquascape / vivarium design software research (2026-10-15)

Search results were thin and polluted with spam pages (asesordocente.com, direct-jobs.nl, cristoforoprodan.xyz, "Eco-Draft 4D", "Einstapp" - unverifiable, ignore). Several tool names from the brief ("Aquaria Designer", "Tankfolio") could NOT be verified; not found. Brand sites (ADA, Green Aqua, Tropica, Aquasabi) have no layout configurator.

## Tools verified

1. Aquascape (joebarbere) - https://github.com/joebarbere/aquascape - web PWA (Angular) + Electron desktop - active-ish (186 commits, no live demo link) - free, MIT.
   2D canvas editor + read-only Three.js 3D view of same doc. 36 tank presets + custom dims + aspect-ratio warnings; fill line in mm or gallons; multi-region substrate with PROFILE CURVE editor; 19 rock/wood entries, 28 plants with growth params; 10 procedural ornaments; drag/scale/rotate, multi-select, SNAPPING + ALIGNMENT GUIDES, layers panel, undo/redo; TIME SLIDER weeks 0-52 seeded plant growth; 24 livestock + 18 equipment (9 real LED lights); rule-based stocking warnings (bioload vs volume, temp/pH range, temperament); caustics, AO, day/night, plant sway; fish schooling/territory sim; nitrogen cycle, test-kit readout, algae, flow/bubbles; 4 starter templates + user templates; .aqua save, autosave; PNG/JPEG export 1080p/2K/4K; MARKDOWN/JSON SETUP-SHEET export; mini-games.
2. Aquarium Planner AR (John Ostler) - https://apps.apple.com/app/id1290236851 - iOS 17.5+ - active (v2.0.1, Nov 2025), $1.99, 1 rating.
   Custom dims incl. rimless, overflow options (center back/corner/ghost), substrates, pendant/strip LED with blue/white ratio + night mode, powerheads/gyres, procedural rock with caves, chromis fish, AR walk-around/clearance check, multiple named designs, SIDE-BY-SIDE COMPARE carousel, glass thickness/panel config.
3. Aquarium Builder (D-D) - https://theaquariumbuilder.com/builder/ - web - active (2024 article) - free.
   Retailer configurator: tank + cabinet colour, lighting, sump, dosing, rock; equipment shown to scale; SHOPPING LIST + total price, emailable/printable, sent to a retailer by access code. 19 tanks, 11 cabinet colours, 85 equipment options.
4. Behind Glass: Aquarium Simulator - https://store.steampowered.com/app/1611580 - Windows Steam - active (Jan 2025) - ~$15.
   Designer (aquascape sandbox) + Simulator (water chemistry) modes; 260-280 fish species, crabs, turtles, axolotls; fish/plants/decor/algae; behaviours.
5. Aquarium Designer (Sigur Studio) - https://store.steampowered.com/app/1339000 - Windows Steam - 2021 - ~$10 (often $2). Client-brief game: pick fish/plants/heater/filter/substrate, watch pH; Casual vs Realistic mode; DLC packs (Sea Life, Japan, Amazon). Light sim, not a real planner.
6. We Love Fish Tanks - game, up to 9 tanks, backgrounds, wall styles, water colour, lighting; cozy builder.
7. TankFlare - https://tankflare.com/ - web - active - stocking checker, 496 freshwater species (cycle, readings, flow, bioload, compatibility); no 3D.
8. Aquascape Pro (aquascape.app, via mergeek listing) - mobile, AI layouts from photo/text, species ID; store availability unconfirmed.
9. Tropica app - iOS/Android - virtual tank collection, plant recommendations per tank, guides. No layout tool.
10. TidyTank Aquascape - iOS - photo diagnosis of tank problems; not a planner.
11. Generic: SketchUp (free web; used by hobbyists for paludarium/viv, 3D Warehouse models), Homestyler, Live Home 3D, Fusion; Sweet Home 3D / Planner 5D (room placement only). No dedicated vivarium/paludarium/dart-frog planner found.
12. Hobby practice (not software): Gensou guides - rule of thirds/golden ratio power points; substrate formula L x W x avg depth / 1000 = litres, +10-15% waste, +~30% for steep iwagumi slopes; example slope 8-10 cm at focal point falling to 4-5 cm. https://gensou.sg/how-much-substrate-aquarium/ , https://gensou.sg/hardscape-layout-aquascaping-guide/
13. Reef: no reef-specific 3D planner found; reefs.com forum thread says hobbyists use general CAD. Reef guides: diagram rockwork + pump/overflow positions first.
Also non-aquarium: iScape (AR landscape, iOS/Android), VizTerra (paid pro hardscape w/ auto material quantity calcs).

## Features TankLook seems to lack, ranked (value for hobbyist, effort)

1. Shopping list / BOM + setup sheet export (substrate litres/bags, rock/wood count and rough weight, plants, fixture, water volume, total mass). Best: D-D Aquarium Builder (list/price/print), Aquascape (Markdown/JSON setup sheet).
2. Substrate volume + bag calculator from the actual sculpted slope (needs depth profile; add waste %). Best: Aquascape (profile curve editor) + Gensou formula. Pairs with already-existing weight calc (add substrate + rock weight).
3. Composition guides overlay: rule-of-thirds / golden-ratio grid and power points on the front view, plus a "focal point score" hint. Best: no tool does it digitally; Gensou guides define it. Cheap, distinctive.
4. Stocking / compatibility warnings (bioload vs volume, temp/pH overlap, aggression, school size). Best: Aquascape, TankFlare (496 species). Fits TankLook's species-aware fish.
5. Time slider for growth / grow-in preview (weeks 0-52, seeded) - TankLook has a growth slider; extend to timeline with trim, plus before/after. Best: Aquascape.
6. Snapping/alignment guides, multi-select, layers, undo/redo for hardscape. Best: Aquascape.
7. Named design variants with side-by-side compare (A/B layouts) and PNG export at 1080p/2K/4K. Best: Aquarium Planner AR (compare carousel), Aquascape (export).
8. Equipment placement: filter/heater/powerhead/overflow with flow arrows; light colour ratio/night mode/day-night cycle. Best: Aquarium Planner AR, Aquascape. (TankLook has light beam/PAR already; add day/night and spectrum.)
9. Photo import / reference image overlay (trace a photo of real stones, or AI layout from a photo). Best: Aquascape Pro (AI from photo, unverified); no tool does stone scanning.
10. Water-line/fill-level slider and glass thickness/structural check (tank build). Best: Aquarium Planner AR (glass), Aquascape (fill line).
11. Starter templates saved by users (TankLook has example tanks; add save-as-template). Aquascape.
12. Paludarium/viv: land/water zone split with water-depth readout over land, ledge/background and plant-light zoning; nothing on market -> open niche.
13. Water chemistry / nitrogen-cycle / algae sim as optional "living" mode - Aquascape, Behind Glass. Large effort, off-core.
