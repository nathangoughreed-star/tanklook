# U5: standards of a finished aquarium (lane U5, 2026-10-28)

Files: `src/demand/costlines.ts` (Layer, LAYER_LABEL, layerTotals), `src/scene/finish.ts` (bare tier, canBeBare, baselineAddUsd, lightShare), `src/demand/suggest.ts` (Wants.minimal, Proposal.layers / finishNote, fallback), `src/ui/suggest.ts` (layered card, Bare / minimal checkbox), `src/demand/engine.ts` + `demand-items.json` (supplies rows), tests `test/u5layers.test.ts`, pictures `research/audits/u5/` (`U5_CASES=1 npx vitest run test/u5cases.test.ts`, then headless Chrome).

## The four layers (every cost line carries one; `Proposal.layers` sums them; they add to the all-in total with tax as a fifth line)
1. Welfare: tank, animals, life-support gear (heat, filter, lid, UVB, lights). Never cut for price.
2. Complete: stand, water test kit, first dechlorinator, siphon / gravel vacuum, net, thermometer (salt: refractometer instead of dechlorinator; RO unit when you own one).
3. Display baseline: substrate, hardscape or shelter, plants (the starter finish and up). The default.
4. Enhancements: CO2, ferts, dosing, auto top-off, and the stronger light a tier adds (its share of the light's price: 1 - 1/lightK).

## Complete-set-up supplies, priced (new demand rows `startconditioner`, `siphon`, `net`, `thermometer`, `refractometer`)
Dechlorinator first bottle $16 ($12-18; Seachem Prime 250 mL $17.39 at Stateline Tack), siphon $14 ($8-20; Aqueon 10 in $15.99 That Pet Place, $19.79 Walmart), net $5 and thermometer $6 (judged, `est`, no retailer page read), refractometer $35 (judged). About +$44 setup on every wet freshwater tank (+$60 salt); refills stay in upkeep. Owning these is not an option in the Owned list yet (U1 brief owns OwnedKey).

## Bare / minimal
`Wants.minimal`: a bare-bottom freshwater fish tank (no substrate, no plants, one hide or rock, no background). Never for salt, terrarium, vivarium or a paludarium (their substrate is husbandry): those keep the starter finish. Welfare and equipment unchanged; the card says "chosen" and what the baseline would add.
**Honest floor**: a complete bare betta tank with a stand-free 5 gal kit is **$202** (finished starter: ~$231; U2's $257 included the stand). Under $150 is reachable only when the person already owns gear: filter + heater + lid + light owned gives **$96**; filter + heater owned about $163.

## Stated compromise
Only the cheapest-start concept (finish ceiling 0, not `climb`) may fall back to the bare tier when the ceiling cannot carry even the starter finish; it is labelled `finishNote.kind = 'compromise'` with the dollars the baseline would add. Richer concepts still step DOWN a size instead (never silently stripped). U4's infeasible branch untouched.

## Re-blessed (supplies change every wet total)
`demand.test` GOLD setup, `tech.test` and `gearFilters.test` LOCK setup (wet examples +$44 or +$60), `finish.test` climb floor 0.85 -> 0.6 (Ember tetras stop at 29 gal, $999), `provenance.ts` rule for the three judged prices.

## Open / for later
Light under a plantless bare tank is still welfare-layer gear (a lit tank is how fish are watched, not strictly care): arguably display. Owned supplies as an owned-equipment option. Terrarium enhancements (misters, programmable light) need price rows first (C9).
