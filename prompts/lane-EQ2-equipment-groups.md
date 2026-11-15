# Lane EQ2: Equipment organized into categories, types and size bands (R58)

Nathan 2026-11-15. Pictures: `research/screens/EQ2/nathan-before.png` (today's new-UI Equipment section: one flat row of 17 chips, and a flat "Buy" list) and `research/screens/EQ2/nathan-categories.png` (the categories he wants).

"i'd like to organize the equipment better, into these categories. also I then want subcategories like heaters vs chillers, HOB filters, cannister, bubble filters, etc. then maybe another sub groups under that pertaining to things like size 'heaters rated for up to 20g' 'Filters rated for 30-40 gallons' etc."

## Three levels
1. **Category**, his five:
   - Filtration & Water Clarity: Filter, Surface skimmer, UV
   - Temperature Control: Heater, Chiller
   - Lighting: Light
   - Aeration & CO2: Air, CO2
   - Maintenance & Water Care: Top-off, Water changes, RO/DI, Conditioner, Fertilizer, Feeder
2. **Type** within each kind, from the product data:
   - Filter: HOB, canister, sponge / bubble, internal, sump, undergravel ...
   - Heater: submersible, inline, substrate ...
   - Light: LED bar, hanging pendant, clip-on ...
   - Use whatever field the catalog already has (`type` / `style`, e.g. the "sponge" shown on today's rows). Don't invent types the data can't fill.
3. **Size band** within a type: products grouped by their rated range, e.g. "Rated up to 20 gal", "20-40 gal", "40-75 gal", "75+ gal" for filters and heaters (watts or gal for heaters, whichever the data has). The band holding this tank comes first and is open; the others are collapsed with counts. Lights band by length in inches, if the data has it.

## UI (new UI, `src/shell/equipment.tsx`)
- Replace the flat chip row with the five categories, collapsible, each showing its kinds with a one-line status: what's chosen, or "none".
- Opening a kind shows "I own" (unchanged) and then Buy, grouped Type → Size band, with counts at each level.
- The Walstad / Low-tech / Planted mid / High-tech presets stay at the top.
- **Product rows:** the names are cut off today ("Aquarium Co-...", "Hygger Doubl..."). Let the name wrap to two lines, and put the full name in the title.
- Keep Use / I own it / lock and the "fits 27 gal" pill working exactly as now.
- Phone 390: same tree, and nothing scrolls sideways.

## Checks
- `npm run build`; the shell equipment tests.
- A new test: every catalog product lands in exactly one category / type / band, and the tank's band sorts first.
- Shots at 1280 and 390: the category list, Filter opened with type and band groups, Heater opened. Save them in `research/screens/EQ2/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
