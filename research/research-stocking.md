# Stocking / compatibility tool research (2026-10-15)

Web search quality was poor (spam mirrors). Items marked UNVERIFIED were not confirmed by a fetch of the primary page.

## Tools
| Tool | URL | Platform | Status | Computes / presents |
|---|---|---|---|---|
| AqAdvisor | aqadvisor.com | web | alive (docs dated 2010) | Bioload from fully grown adults, filtration % (uses 65% of rated filter capacity; must stay >100%), water-change schedule, aggression/territorial compatibility, recommended temp/pH/hardness, "show only suitable species" for tank size, juvenile mode (current sizes vs adult), Generate Image of stock %. 850+ species, 300+ filters. |
| App-aquatic | app-aquatic.com | web calculator + iOS/Android | active (store update Jul 2026) | Bioload, compatibility, pH/temp fit, planted-tank adjustments, biotope matching; each clash gets a plain-English reason AND a concrete fix. Companion tank dashboard, parameter logging. Freemium ($1-3/mo or one-time). Details from AlternativeTo listing, only partly verified. |
| Seriously Fish | seriouslyfish.com | web | active, 1,822 profiles | Reference, not a checker: temp, pH, tank size, difficulty, origin; filter by those; 4-question "Tell us about your tank" finder; cm/C and in/F toggle. Licence page not retrievable; assume all rights reserved, ask before reuse. |
| Saltwater Aquarium Blog tool | saltwateraquariumblog.com/saltwater-fish-compatibility-chart/ | web | active (c) 2026 | Pick 1-3 fish/groups (includes corals, inverts) + optional tank gallons; outputs reef-safe status and three columns Compatible / Caution / Not compatible; yellow "i" flag when the tank is below species minimum. Data source/licence not stated. Best marine example found. |
| Live Aquaria charts | liveaquaria.com (marine + freshwater/brackish compatibility chart) | web static matrix | exists, guideline only | Y / C (caution) / N matrix by group. Not interactive (UNVERIFIED current URL; fetches 404'd). |
| BRS species compatibility | bulkreefsupply.com/content/post/species-compatibility | web | active but static image chart, content Aug 2024 | Nothing computed. |
| Tropica plant pages | tropica.com/en/plants | web | active | Per plant: growth rate, height, light demand (~0.5 W/L medium), CO2 demand (6-14 mg/L medium, 15-25 high), Low/Medium/High-tech categories, Easy/Medium/Advanced. No search of an open dataset. |
| Aquasabi | aquasabi.com | shop | no plant database found | -- |
| Aquarium Co-Op | aquariumcoop.com | shop/blog | no stocking tool found | -- |
| Aquarium Calculator Plus / AquaCalc | App Store | iOS | alive | Volume, pump size, water-change maths only. |
| Not found / not verified | AqAdvisor clones, Aquarimate, Aquarium Note, Fishkeeper, Aquarium Manager, Stock My Tank, Fishtank Advisor, Fishlore tools, Reef2Reef tool, Dendroboard tools, AI stocking assistants | -- | UNVERIFIED | searches returned nothing usable; check manually. |

## Borrowable features, ranked (TankLook likely lacks)
1. Reason + fix text on every warning (App-aquatic). Cheap, big usability gain.
2. Three-level pair rating Compatible / Caution / Not (Live Aquaria, Saltwater Blog), which also gives you a marine check with no bioload model.
3. Marine/reef-safe layer: reef-safe, invert-safe, coral-safe flags with a "spectrum" (reliable/conditional/risky) rather than binary (Saltwater Blog; gensou list idea).
4. Undersized-tank flag per species, shown on the species picker too, plus "show only suitable species" filter (AqAdvisor, Saltwater Blog).
5. Filtration % vs bioload, rated capacity derated (AqAdvisor uses 65%), with filter list (AqAdvisor).
6. Juvenile vs adult mode: stock check at current size and at full growth (AqAdvisor). Fits the growth lanes in TankLook.
7. Planted-tank/plant demand matching: light (W/L), CO2 mg/L, growth rate, tech level; flag plants vs lighting (Tropica fields).
8. Biotope/parameter-overlap matching and "tell us about your tank" guided picker (App-aquatic, Seriously Fish).
9. Water-change schedule from bioload (AqAdvisor); shareable stock image (AqAdvisor).
10. Gender-ratio, schooling minimums, swim-level/territory: no tool verified doing these well; build from your own fields.

## Datasets and licences
- FishBase (fish incl. some aquarium fields): CC BY-NC 4.0 data; photos separate. rfishbase R package code is CC0 but data keeps NC. Non-commercial hobby use OK with attribution + backlink.
- SeaLifeBase (marine inverts etc.): CC BY-NC, same reuse rules as FishBase.
- WoRMS (marine taxonomy): text CC BY, images CC BY-NC-SA, no bulk redistribution of whole DB.
- AmphibiaWeb: CC BY-NC, but bans bulk downloading without permission.
- FISHMORPH: CC BY 4.0 (morphology traits only, no husbandry).
- No open aquarium-care dataset (temp/pH/tank size/temperament) found; Seriously Fish, AqAdvisor, Saltwater Blog data are not openly licensed. Plan: hand-curate own fields, use FishBase/SeaLifeBase only for size/temp ranges with attribution, and keep the project non-commercial.
