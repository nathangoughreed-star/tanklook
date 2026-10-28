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

## Merge with U4 (rebased onto dd70deb0)
The compromise fallback is off under `hightech` (a stated approach is never swapped for a plainer one). U4's `infeasible.test.ts` re-blessed for the +$44 supplies: change-animals and high-tech cases at $230 (were $200); phased case uses a leopard gecko at $100, because a bare freshwater tank now fits whenever the essentials do (goldfish animals cost less than the finish), so the phased scenario only exists where no bare option does.

## Follow-up (Nathan's $100-120 bare betta lead, 2026-10-28)
Done: owned supplies (siphon, net, dechlorinator, thermometer, bucket; test kit already) credit $0; bucket row ($5, judged); dechlorinator now $4 mode (Top Fin, Nathan lead, not re-verified; Prime up to $16), siphon $8 (Aqueon mini lead $7.52; others $16-20); cheapest start also tries starter kits that include tank + filter + heater (within 2x the smallest size, two cheapest) via `kitTanks`; the Top Fin Cube kit now credits its thermometer and net. Verified on the PetSmart page 2026-10-28: Top Fin Cube 10 gal kit $44.99 (reg $89.99), 50 W heater, thermometer, 4 in net, test vial, PF10 filter, LED hood; page states no end date (Nathan: through 2026-11-01, treat as sale-limited; the card does not yet say so).
NOT reached: bare betta from nothing is still about $200, not $105-120. (1) The cube kit is a 14.09 in cube (catalogue g8c, 8 gal): our own betta rule fails it ("minimum", "length"), so the generator rejects it for a betta; welfare was not overridden. (2) Model prices above Nathan's lead prices: test kit $39 API master (strips $14.97 do not read ammonia, so are a cycling-safety question), heater $28 vs $12.97, betta $15 vs $3.99, price-level factor ~1.07 and kit shipping, hide ~$16. (3) Not re-verified: strips, Top Fin conditioner, betta, plants, pot, siphon, bucket.

## Round 3 (Nathan's answers via Coordinator 15, 2026-10-28)
- **No bare tanks.** Wants.minimal, the Bare checkbox, the bare tier and the compromise fallback are removed. The cheapest honest concept keeps substrate + the welfare set; at a tight budget U4's infeasible card names the real cheapest price and alternatives.
- **Betta rule.** One betta is comfortable in a 12 in cube (Nathan). Red run length 398 -> 305 mm; because only the run gated swimmers, a 2.5 gal 12 in tank would then have passed, so `volGate` (tankmin.json, tankMin.ts) makes the 5 gal figure a gate for the betta: 12 in cube (7.5 gal) and the 8 gal cube kit pass, 2.5 and 3 gal fail. minimum.test notes the volGate exception.
- **Ammonia tests (read 2026-10-28).** API Ammonia Test Kit 130 tests $15.05 (Walmart); Aquarium Co-Op ammonia strips 25 ct $15.99; Seachem Ammonia Alert badge $8.95 Walmart / $13.68 Bluviva (qualitative only, a continuous badge, no number); Tetra EasyStrips 25 ct $13.24 (no ammonia). Model test kit now = API ammonia + Tetra strips = $28.29 (ammonia + nitrite + nitrate + pH, enough to confirm a cycle); API Master Kit $39-42 is the one-box upgrade (band hi).
- **Price rows from the sweep:** betta $3.99 (PetSmart veiltail, in store), dechlorinator $4.99 (Top Fin 4 oz, item 5291857), siphon $5.75-7.61 (Aqueon mini), heaters by class (<=25 W median $9.99: Aquaneat / Datoo / Orlushy / Pulaco; 50 W $13.97) from the Amazon / Chewy / Petco / Walmart catalogue rows. Bucket has no source (est $5). Not found: a Walmart bucket price.
- **Kit stand credit fixed.** ownedAssess / costLines scaled owned and stand credits against the parts total instead of the kit-priced total (the stand credit on a kit build was about 40 % short). Owning a part of a kit now falls back to the parts build (a kit price cannot be split).
- **Result.** Cheapest betta card (Top Fin Cube kit, starter finish, no stand) is $160 at default prices; the Aqua Culture 5 gal kit $166-193. Gap to Nathan's $115-135: plants (the starter finish draws hornwort + vallisneria ~$22-35 where he priced java fern + anubias $13.98), kit shipping $5.99, price-level factor ~1.07, no bucket/hide pricing.
