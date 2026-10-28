# Bundles, swap menu, shipping on deals (Nathan, 2026-10-27)

## Start here
Nathan's asks: (1) shipping price on every deal that ships online; (2) a bundle/swap menu that shows how much a bundle
saves and what you give up (stocking up/down, worse light, smaller filter or heater, tank size change); (3) aquascape plant
bundles you can apply to a tank, suggested when one saves money (same deal search as the other deals).
Nathan on the swap menu: "Show kits only as a swap ... say what you'd change ... clear about money saved and tradeoffs".
Same-tank rule (lane DM) stays for the "Show it as Tank B" button; a kit with a different tank is listed with the tank-size
change spelled out and a link, no Tank B button.

## Done (uncommitted, in the shared tree; ship via scripts/ship.sh)
- `src/data/shipping.json` (copied from agentC/shipping-policies.json; 15 retailers, `est:true` where not confirmed) and
  `src/data/shipping.ts`: `shipping(retailer, orderUsd, pickupOnly)` -> {usd, free, pickup, est, text}. Free over the retailer's
  threshold; `pickupOnly` rows carry none. Amazon / Etsy aliased.
- `src/data/deals.ts`: `Deal.pickupOnly` (set on the 6 Petco kits in deals.json), `dealShip(d)`, `dealTotalUsd(d)`;
  `dealAsKit` priceUsd is now price + shipping, so every saving (dealOffers, dealMatches, featured cards) already includes it.
- `src/data/gearDeals.ts`: `gearShip`, `gearTotalUsd`; `src/demand/gearDeals.ts` prices a pinned gear sale delivered and offers
  only when delivered < its regular price; `src/scene/builds.ts` pins a sale only when delivered < the row's typical;
  demand panel gear lines show the shipping text.
- Plant prices: 32 rows re-audited (see git diff of demand-items.json) and example baselines re-blessed.

## Done 2026-10-27 (second pass, uncommitted)
1. Shipping text next to every deal price: demandPanel (pinned-bundle sentences), featuredDeals card, buildPick, plan.ts deal lines.
2. Swap menu: `dealSwaps()` in src/demand/dealmatch.ts (kits within 40 % of the gallons, saving > $1, shipping included, tradeoffs:
   tank size, stocking, light PAR, filter gph, heater W, engine warnings); `renderDealMatch` shows up to 3 with changes, what you give up,
   "Show it as Tank B" only when `sameTank`, "Not now" per kit. The old "Deal:" lines in renderDeals are gone; `bestMatch` / `dealMatches`
   stay (builds.ts and tests use them).
3. Plant bundles: src/data/plant-bundles.json (20 packs, 11 in stock; counts guessed for mixed packs), src/demand/plantBundles.ts
   (pin `plantPin`, `plantBundleOpt`, `plantBundleOffers`), engine option `plantBundle` (`bundle:<id>` row), demand panel Apply / Remove.
   Aquatic Arts packs are never offered: no shipping policy in shipping.json (research it to turn them on). APF tissue-culture pack left out.
4. test/shipping.test.ts (8 tests). Full suite: 1379 pass, only the sources ratchet fails.
## Not done
- Preview check of the panel (the preview here rendered unstyled with no demand panel; not verified visually).
- Plant bundles are not in the Tech/plan text or build picks (panel only).
- Second sweep for terrarium packs and Co-Op / Modern / Amazon / Walmart / Etsy.

## Known test state
Full suite: 1371 pass, 1 fails: `test/sources.test.ts` ratchet (unsourced 503 vs baseline 479). About 22 of the +24 are from other
lanes' uncommitted `tanks.json` / care data; demand-items accounts for +2 (5 -> 7), likely the fern row's generic buceplant.com
url. Re-run `GEN_SOURCES=1 npx vitest run test/sources.test.ts` only after the other lanes' data is committed.

## Agent cost (measured)
Sonnet, ~72k tokens per 12-19 row price audit; shipping research 74k; plant-bundle sweep 97k.
