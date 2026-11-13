# Lane HD1: hoods are real products with their built-in light (Coordinator 24, 2026-11-13; request R32)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/HD1/`). Old-shell freeze: this is engine / data / catalogue work; the old UI only changes where its lid list must stop offering a hood that does not exist.

## Nathan's ask (2026-11-13), picture `research/screens/HD1/nathan-before.webp`
"here we have a hood being priced separately from the light, which isnt really a thing. lights come integrated with the hood. And hoods should only be available if they actually exist. A glass lid can easily be made for a custom tank, a hood not. The hood/light combo should probably be reduced to specific products. Like thats a Top fin 20g long hood with light. It only fits 20 gallon long tanks and costs X, and ideally we know something about its light, wattage ideally, but at least the type whether LED or fluorescent, etc."

In his shot (a 20 gal long with a hood): the cost breakdown lists "Light (30 W) $117" and "Lid (hood) $68" as two items.

## Today
- `src/demand/engine.ts:122` prices the lid row as `gear:lid-hood` independent of the light; the light is priced separately.
- `src/data/tanks.json` sets `lid: "hood"` on several catalogue tanks / kits; `src/demand/dealmatch.ts:73`, `dealscene.ts:23` default a lid to 'hood'.
- The light catalogue is `src/data/gear/lights.json`.

## Job
1. **Hood products catalogue:** research real hood-with-light products sold in the US now (Top Fin, Aqueon (LED and fluorescent), Marineland, Tetra, Imagitarium, etc.) for the standard footprints: 10, 20 high, 20 long, 29, 30, 40 breeder if any, 55, 75. For each: name, brand, fits (exact tank footprints, in), price (with source and date, like the other gear deals), light type (LED / T8 / T5 / CFL / incandescent), wattage, and if known lumen / PAR / Kelvin. Put it in the gear data next to lights (`src/data/gear/hoods.json` or inside lights.json; your call, say why), with provenance like other gear.
2. **One item, one price:** a hood is ONE line item that includes its light. When the lid is a hood, the light row comes from the hood (its type and wattage feed the light model: PAR, plant growth, power cost), and there is no separate light purchase unless the user adds an extra light. Kits / deals that include a hood use the same product.
3. **Only real hoods:** a hood is offered only when a product fits the tank's footprint (catalogue tanks: their own hood if known; others: matching size). Custom tanks and odd sizes: no hood; a glass lid (custom-cut glass is easy) or open / mesh. Saved scenes with a hood on a tank no product fits: keep drawing it, but show a note ("No hood is sold for this size; a glass lid is the usual choice") and price as a glass lid + the light they had; don't silently change the scene.
4. **Generator and Discover:** never pick a hood that doesn't exist for that tank.
5. **Render:** keep the existing hood look, sized to the product's footprint.

## Tests / proof
- Tests: 20 gal long with a hood -> one hood line item, no separate light; its wattage feeds the light model; a custom 37 x 15 in tank -> no hood offered; every hood product has fits, price and light type.
- Shots: Nathan's scene (20 gal long, hood) cost breakdown before / after; a custom tank's lid choices. Add a dated HANDOFF.md section "HD1".
