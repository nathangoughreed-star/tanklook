# Lane FR1: finished-tank price range by size and kind

Follow `prompts/lane-common-c20.md` first.

Nathan (2026-11-05): "When they are selecting the tank, give them a rough range of finished tank price based on the size (size goes up, cost goes up typically). Of course the min should represent a relatively low stocked empty tank with cheap decor. And of course upper end would be a semi-professional setup."

Build `src/demand/finishedRange.ts` exporting `finishedRange(modelId: string, kind: 'freshwater'|'saltwater'|'terrarium'|'vivarium') => {lo:number, hi:number, basis?:string} | null`. Lane ST1 shows it in its tank picker; keep exactly this signature.
- lo = that tank + the cheapest adequate gear (filter / heater / light / lid; reef: minimum running gear; terrarium: heat + UVB where needed) + cheap substrate and decor + a light stock of cheap animals or plants.
- hi = semi-professional: designed / luxury hardscape and plants (BL1 tiers), quality gear (reef: good light, skimmer, flow, ATO), fuller stocking. Not the single most expensive item in the catalogue.
- Use the existing priced pieces (`buildTotals` cheapest / balanced in `scene/tankfit.ts`, `tierPair` in `scene/materialTiers.ts`, `costTiers` in `demand/tiers.ts`, `estimateOf` in `explore/estimate.ts`, `demandOf` in `demand/engine.ts`). No invented prices; where a piece has no price use the existing fallbacks and say so in `basis`.
- Fast: the picker calls it for every row. Precompute a table for every catalogue tank x kind (script + committed JSON, or memoised) and test that it is current. Round for display: nearest $10 under $500, nearest $50 above.
- Tests: lo < hi everywhere; mostly rising with gallons inside a kind (list exceptions with a reason); a 10 gal freshwater lo roughly $100-250; a 75 gal reef hi well above the 75 gal freshwater hi. Put a table of lo / hi for 10 / 20 / 40 / 75 / 125 gal per kind in your HANDOFF section and report.

No UI work beyond the export.
