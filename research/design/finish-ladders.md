# What a budget, a good and a showpiece tank really contain (lane C9, 2026-10-28)

Purpose: decide what Suggest's finish tiers (starter / basic / full / lush, `src/scene/finish.ts`) cut first when the budget shrinks, what always stays, and what a big budget adds that a small one never has. **Evidence is thin**: web results were retailer and SEO guides (some in SGD, one from 2022); figures are rough. Items marked *(judgement)* are hobby convention from me, not from a source, and should be checked by Nathan before they drive the model.

## Freshwater (planted)
Sources: [Gensou planted-tank cost tiers (SGD)](https://gensou.sg/?p=40732), [Aquascaping Love](https://aquascapinglove.com/equipment/how-much-does-it-really-cost-to-create-an-aquascape-aquarium/), [Aquifarm](https://aquifarm.com/fish-tank-cost/).
- Roughly 55-65 % of a planted build is tank + cabinet, light and CO2; filtration next; hardscape is smaller but under-budgeted.
- Basic 60 cm planted ~$500 with entry gear vs ~$1,500 with premium light, ADA-style cabinet and imported hardscape; 90 cm showcase SGD 1,800-2,800.
- Price steps named: rimless / low-iron glass tank + cabinet (cabinet $400-1,500), programmable full-spectrum light (SGD 450-650), pressurised CO2 ($150-300: cylinder ~$110, regulator ~$63, solenoid ~$40, diffuser ~$80), premium wood $30-150 a piece (120 cm total hardscape $150-600), active substrate $25-60 a bag (5-8 bags for 120 cm). Running cost: ferts and CO2 can outrun the first budget.
- **Cut first:** CO2 and the demanding plants that need it, the premium cabinet (use a plain stand), imported hardscape, the extra substrate layer. **Stays:** a real substrate, 1-3 anchor stones or one wood piece, a few hardy low-light plants (anubias, java fern, crypts, moss), decent filter and light. *(judgement)* Artificial plants are the honest floor when light is weak.
- **Added at the top:** CO2 + stronger programmable light, carpet and red stems (the plants our model already says need strong light / CO2), larger and better-chosen hardscape (a composed 'iwagumi' or 'nature' layout, not more rocks), rimless low-iron tank, a larger tank, a bigger school or a second species group, a better filter (canister) and a controller / dosing *(judgement)*.

## Saltwater (reef)
Sources: [Aquifarm reef cost](https://aquifarm.com/reef-tank-cost), [Bulk Reef Supply: how much does it cost](https://www.bulkreefsupply.com/content/post/brs360-episode-4-how-much-does-it-cost), a nano starter guide.
- Nano entry ~$550-700 all-in; mid nano ~$900-1,200 (can hold SPS later); 60-100 gal basic $4,000-6,500; 90 gal premium $4,000-9,000.
- Named steps: LED $160-800 (premium $800-1,800), skimmer ~$400-800, controller (Apex-class) $400-800, ATO + dosing $300-600, RO/DI $150 (premium $300-500), live rock + sand ~$300 for 90 gal, corals $500-1,500 first buy.
- **Cut first:** the controller and dosing, the premium skimmer / light, expensive corals (stay with softies, zoanthids, mushrooms), the quarantine tank and refugium. **Stays:** rock and sand, a salt-grade heater/pump/light, a skimmer or equivalent for the stocking, RO/DI water (the guides call skipping it a bad saving: algae from tap metals / silicates), a test kit. A few hardy corals are what make it look like a reef.
- **Added at the top:** bigger tank (volume is stability), controller + auto top-off + dosing, premium dimmable LED with a coral-appropriate spectrum, RO/DI with booster, more varied corals (LPS then SPS and clams), a sump / refugium *(judgement)*, a larger or more varied fish list.

## Terrarium / bioactive
Sources: [Aquifarm terrarium cost](https://aquifarm.com/is-terrarium-expensive), [Exoticssource bioactive guide](https://exoticssource.com/blogs/exotic-topics/bioactive-enclosures-building-a-self-sustaining-slice-of-nature), a [MorphMarket thread on a bioactive build on a budget](https://community.morphmarket.com/t/building-bioactive-on-a-budget/49694).
- Bioactive build excluding enclosure: ~$215 low vs ~$875 'no expense spared'; hobbyists report $80-90 for small builds with gathered, sterilised materials. Drainage layer (LECA / gravel + mesh) is cheap; misting: hand sprayer vs a fogger / monsoon-type system; lighting $50+ up to programmable app-controlled.
- Not found: any cost for a custom vivarium (built-in backgrounds, drainage bulkheads, plumbed misting).
- **Cut first:** automated misting (hand spray), programmable lighting, the cleanup crew (paper-towel / simple soil substrate), the sculpted background, most live plants (a few hardy ones or silk). **Stays (husbandry, not looks):** the right heat and UVB, a thermostat, a hide per temperature zone, a humid hide for geckos, a proper substrate, a gauge. Our strict husbandry rule already forbids cutting these.
- **Added at the top:** the bioactive layer (drainage, soil, springtails / isopods) with a dense, species-correct live plant set, a 3D or foam background, cork and wood climbing structure, an automatic mister and timers, programmable dimming lights, a larger front-opening enclosure, a dimming thermostat *(judgement)*.

## What this says about our tiers (today: starter 0 / basic 1 / full 2 / lush 3)
1. The tiers currently differ only in **density** (how many plants and rocks) and **plant mode** (mixed vs live). That is not how people spend: money mostly buys **better equipment and a bigger tank**, then **composition**, and only a little more plant count. Lush = 73 live plants in a 20 gal betta tank is not a showpiece, it is clutter.
2. Proposed model (needs Nathan's yes): make the ladder **what is added, not how many**.
   - Freshwater: starter = substrate + 1-2 stones/wood + hardy plants; basic = + a tidy plant set; full = + CO2-free best plants and a canister; lush = + CO2, stronger programmable light, carpet / red stems, a composed hardscape, a bigger tank.
   - Saltwater: starter = rock, sand, softies; basic = + LPS; full = + ATO and better light; lush = + controller, dosing, premium LED, RO/DI booster, SPS/clams.
   - Terrarium: starter = plain bioactive-lite (substrate, hides, a few plants); full = + cleanup crew, drainage, real plant set; lush = + background, automatic misting, programmable lighting.
3. Cap plant and rock counts by tank size at every tier (done for rocks in commit d4f16938; plants not yet).
4. Open: the cost of these 'upgrade' items must come from `demand-items.json` rows; several (controller, dosing, CO2 kit, background, mister, cleanup crew) may not exist there yet, so a price-audit lane needs to source them before Suggest can price a lush tier honestly.

## CO2 ladder (research 2026-10-28; Nathan: DIY vs paintball / mid vs specialty)
Sources: [FishPotter CO2 systems guide](https://fishpotter.pages.dev/guides/co2-systems-guide), [UKAPS DIY thread](https://ukaps.org/forum/threads/complete-aquarium-diy-co2-system-for-tank-up-to-500l.39927/page-2), [Aquarium Co-Op nano CO2 thread](https://forum.aquariumcoop.com/topic/29985-co2-kit-for-nano-tank-suggestions/); product prices already in `src/data/demand-items.json` (`gear:diy-co2` $22-45, `gear:co2-kit` $90-250 paintball-style UNS kit $227-240, `gear:co2-refill` $15-30) and the CO2 catalogue (`gear-catalog.json` co2: Fzone regulators, desktop cartridge kits, DIY bottles).
| Tier | What | Rough price | Fits |
|---|---|---|---|
| Liquid carbon | bottle | ~$10-15 a bottle | any; weak, melts vallisneria if overdosed |
| DIY yeast / citric | 2 bottles + diffuser | $20-60 | to ~20-30 gal; refill every 2-4 weeks; uneven output |
| Disposable cartridge desktop kit | small regulator + solenoid | catalogued (Fzone desktop) | to ~45 gal; cartridge lasts 50-90 days |
| Paintball canister kit (UNS-class) | micro regulator + paintball tank | $90 regulator only, $227-240 kit; refill $15-25 | small-mid tanks |
| 5 lb cylinder + single/dual stage regulator + solenoid + diffuser + drop checker | pressurised | cylinder $50-80, regulator $40-150 (Fzone ~$60-70, GLA $120-200+), solenoid $20-40 if separate; complete $150-400 | 30-75 gal+; refill $15-25 every 3-6 months |
| Specialty: regulator with pH controller (sera Seramic ~€380, GLA / Dennerle bundles) | pH-controlled injection | $300-600 | showpiece; not found: a verified complete-system price (sources conflict / out of date) |
Model status: rows 'none / liquid / diy / cartridge / pressurized' exist in the Tech menu; **no pH-controller option exists** (data gap: add `co2: 'phcontrol'` with a priced part, $300-600).

## Status of the tier rebuild (this commit)
Tiers now add equipment, not clutter: starter (hardy plants, no CO2/ferts) -> basic (+ ferts) -> full (+ CO2: yeast to 20 gal, cartridge to 45 gal, regulator above; stronger light x1.3; reef: dosing + flow + skimmer) -> lush (+ regulator CO2 at any size, light x1.8, reef auto top-off). Plant pieces are capped by floor area (1 per 300 / 200 / 150 / 110 cm2). Terrarium tiers still only change plants/hardscape: the gear steps (auto-mister, programmable light, cleanup crew, background, bioactive drainage) need price rows first; the pH-controller CO2 step also needs one.
