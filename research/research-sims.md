# Aquarium sims and planner apps: research (2026-10-15)
Source: web search snippets only (WebSearch standard, 8 queries); no pages fetched. Status/price claims are unverified unless noted.

## Games / sims
| Tool | URL | Platform | Status | Price | Notable |
|---|---|---|---|---|---|
| Behind Glass: Aquarium Simulator | store.steampowered.com/app/1611580 | Steam (PC) | Active, 1.0 Jan 2025, updates (axolotl, turtles) | unverified | Designer sandbox mode (no constraints) plus Simulator mode (temp, pH, flow, oxygen, filters, salinity); algae as decor; closest competitor to TankLook |
| Aquarist | store.steampowered.com/app/1430760 | Steam, Steam Deck | Active, 1.0 launched | unverified | Tank builder (size, layout, substrate, plants, rocks, filtration), custom photo backgrounds, customer jobs, shop/oceanarium business loop |
| Aquarium Designer | Steam (see Destructoid review) | Steam | Active/low-key | unverified | Client-driven tank builds, budget, buy gear; pH/heater/filter checks; "bare-bones" |
| Biotope | store.steampowered.com/app/549040 | Steam | Early access since 2019, likely stale (last update >19 months, snapshot undated) | ~$19.99 | Photoreal; temp/pH/KH/nitrate/ammonia; plant and fish growth; equipment breaks and needs repair; breeding/trading; starter setups (Amazon, Malawi) |
| Fishkeeper | store.steampowered.com/app/1425780 | Steam | "Coming soon" per snapshot, unclear/possibly dead | n/a | Tamagotchi-like needs, breeding and auctions, pilot a bathyscaphe inside tank to clean |
| Aquascapers | store.steampowered.com/app/2299400 | Steam | Unclear | unverified | Single/co-op, collect rocks, wood, plants, fish for scapes |
| Aquatic Store Simulator | store.steampowered.com/app/3073580 | Steam | Demo/playtest | n/a | Store management; not relevant |
| Aquarium Land | xbox/nintendo/ms store | Console, PC, mobile | Active | unverified | Casual tycoon, not relevant |
| Dream Aquarium | various | Win/Mac screensaver | Old, maintained sporadically | ~$20 | 27 species, light rays, ground ripples, crab cleaner, follow-a-fish camera, auto feeding |

Not found / unverified: Fish Tycoon, My Aquarium sims, Ecosystem evolution sim, Fishi (no results).

## Planner / log / calculators
| Tool | URL | Platform | Notable |
|---|---|---|---|
| Aquascape (joebarbere) | github.com/joebarbere/aquascape | Web + desktop, MIT | 2D editor + three.js 3D from same doc; 24 species, 18 equipment items (9 real LEDs with lumen/Kelvin); explainable rule-based stocking warnings (bioload, temp, pH). Nearest open-source peer |
| AqAdvisor | aqadvisor.com | Web | 917 species, stocking % plus filter advisor, compatibility notes, flags species too big for tank; shareable stock lists; site design from ~2010 |
| Aquarium Manager (CoddyKit) | coddykit.com/apps/aquarium-manager | iOS/Android, free | Cycling coach (reads NH3/NO2/NO3, says when safe to stock), maintenance reminders, trend charts, compatibility check, photo disease ID |
| Aquarimate | apps.apple.com/app/id587215055 | iOS | 20+ parameters with colour graphs, multi-tank, reef, dosing calculators, unit converters, test timers, reminders, livestock library, expenses, cloud backup; ~$9.99 (conflicting) |
| Aquarium Note / Note 2 | (Play / App Store) | Android/iOS | 24 parameters, graphs, timers, livestock, expenses; Note 2 last updated 2021 |
| AquaLog | appgoblin.info/apps/6785401592 | iOS | 50+ parameters, reef-focused |
| Aquarium Planner & Tank Math | apps.apple.com/app/id432881871 | iOS | Volume for hex/cylinder/quarter tanks, water weight, dosing, logs |
| Tetra 3D app | practicalfishkeeping.co.uk (article) | Mobile AR | AR placement of Tetra tanks in room; no design depth |
| Seneye | reefs.com/seneye | Hardware plus cloud | Sensor: temp, NH3, pH, level, light (Reef adds PAR/lux/Kelvin), alerts; ~$198 |
| Chihiros / Fluval Connect / Orphek apps | vendor | Mobile, BLE | 24 h light schedules, sunrise/sunset ramps, per-channel spectrum; PAR figures only as published measurements (e.g. Chihiros 60 cm ~100-120 PAR at 30 cm, one retailer review) |
| Kessil app, flow/wavemaker visualizers, CO2 drop checker tools | not found | | search turned up nothing usable |

Reliability note: several hits (direct-jobs.nl, asesordocente.com, nursingguru.in, edx.ipeindia.org) are SEO spam; ignored.

## Features TankLook likely lacks, ranked (assumes current feature list in the brief)
1. Day/night + light schedule slider (photoperiod ramp, sunrise/sunset, moon). Best: Chihiros/Fluval apps, Dream Aquarium. Small-medium; ties directly to coming timeline and light coverage.
2. Per-light PAR/lumen presets from real fixtures (library of real LEDs, hang height, PAR at depth, low/med/high verdict). Best: Aquascape (lumen/K specs), manufacturer PAR charts. Medium; extends existing light coverage; needs data table.
3. Explainable stocking warnings with reasons (bioload, temp/pH overlap, aggression, adult size, school minimum, filter turnover %). Best: AqAdvisor, Aquascape. Small-medium; check what current stocking check explains.
4. Nitrogen-cycle / water-chemistry simulator on the timeline (ammonia-nitrite-nitrate curves from bioload, filter maturity, water-change schedule; fishless cycle coach says when safe to stock). Best: Aquarium Manager, Biotope, Behind Glass. Medium-large; pure JS model, no rendering.
5. Algae response to light, nutrients, plant mass, with visible algae (green film on glass, hair algae) in 3D. Best: Behind Glass (decor only), Biotope. Medium; ties plant growth to light and the timeline.
6. Equipment sizing panel: filter turnover (x/hr), heater wattage by volume and delta-T, CO2 drop-checker, dosing. Best: Aquarimate, Aquarium Planner & Tank Math. Small; mostly forms and formulas.
7. Flow / circulation visualization (filter outlet position, particle streaks, dead-zone overlay, plants and fish react). Best: Dream Aquarium (ripples), Behind Glass (flow param); no strong dedicated visualizer found. Medium-large; fake it with a 2D vector field plus instanced particles.
8. Budget / shopping list (cost per item, running total, export) and maintenance reminder schedule exported to calendar. Best: Aquarist, Aquarium Designer, Aquarimate (expenses). Small-medium; needs price fields on catalogue.
9. Behaviour polish: schooling, territories, follow-a-fish camera, feeding events, cleaner crab/shrimp. Best: Dream Aquarium, Fishkeeper. Medium; follow camera is small.
10. Starter tank presets (Amazon, Malawi, shrimp nano, biotope) and photo backgrounds. Best: Biotope, Aquarist. Small.
11. Equipment wear / maintenance events (filter clogging, dosing failures) as timeline hazards. Best: Biotope. Medium; novelty value.
12. Community gallery of shared builds beyond link share. Few tools do it well. Medium-large (needs backend); skip unless wanted.

Positioning note: no tool found combines a browser 3D designer, light coverage, stocking check, and AR; Behind Glass is the closest but is a PC game, not a planning tool, and Aquascape is a small open-source peer. Biggest gap overall is time-based simulation (cycle, algae, growth) wired to the planned timeline.
