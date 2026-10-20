# Gear deal sources (lane GD, 2026-10-20)

Nathan: "is there anywhere else on the internet it would be worth looking for deals on aquarium stuff to build into the tool?
Specifically equipment?" Everything below was checked today with plain HTTP reads (curl / a fixed Python script, no model calls,
no subagents). No bot check, captcha or 403 was bypassed.

## What each source gives

| Source | Covers | How it reads | Sale signal | Size today | Verdict |
|---|---|---|---|---|---|
| **Buce Plant** (Shopify) | planted: Chihiros, Twinstar, Dymax, UNS, CO2, rimless tanks | `/products.json?page=N` (250 a page), fixed script | `compare_at_price > price` | ~1,750 products (503 at page 8: needs a slower crawl), 179 gear, **10 gear on sale** (Dymax eZ filter $32.19 was $45.99, Chihiros Vivid2 $469.99 was $516.99) | **Build** |
| **Aqua Forest Aquarium** (Shopify) | planted: Twinstar, ADA-style tanks + cabinets, CO2 regulators, lights | same | same | 628 products, 100 gear, **17 gear on sale** (Twinstar S-line $114.99 was $128.99) | **Build** |
| **Aquarium Co-Op** (Shopify) | fresh: its own sponge filters, air pumps, heaters, lights (the catalogue already has the brand) | same (answers now; only the store front was geo-blocked last sweep) | same | 324 products, 24 gear, 1 on sale | Build (cheap; few sales, but it is its own maker) |
| **CO2Art US** (Shopify) | CO2 regulators, diffusers | same | same | 31 products, 18 gear, 3 on sale | Build (tiny) |
| Flip Aquatics, Aquatic Arts (Shopify) | mostly livestock | same | same | ~16-19 gear, 0-1 on sale | Skip for gear (maybe later for animal prices) |
| Dennerle (Shopify) | CO2, lights | same | same | prices in **EUR**, German store | Skip (not US) |
| Green Leaf Aquariums, Glass Aqua | planted | `/products.json` 404: not Shopify | - | - | Skip (would need page scraping) |
| **Bulk Reef Supply** (Magento) | reef: lights, return pumps, powerheads, skimmers, reactors, heaters, controllers | sitemap `/sitemap/google_sitemap.xml` (4,452 product pages, ~570 gear-like) + each page's embedded Magento price JSON (`special_price` vs `regular_price`; `product:price:amount` meta). No Product ld+json. | special < regular | sample of 40 gear pages: **5 marked down** (Aquaready heater $15.39 was $35.99, Innovative Marine return pump $135.99 was $169.99, reactor $559.99 was $699.99) | **Build** (one request per product: keep a fixed list of ~100 URLs, 1 s apart) |
| Marine Depot | reef | redirects to bulkreefsupply.com (`?brs-source=mdredir`): same company now | - | - | Covered by BRS |
| Keepa | Amazon price history (Hygger, Nicrew, Chihiros, Week Aqua) | paid API only, from about EUR 49 a month, no free tier ([plans](https://keepa.com/api-docs/plans-tokens.html), [third-party price list](https://revenuegeeks.com/keepa-pricing/)) | price history | - | Skip unless Nathan wants to pay |
| camelcamelcamel | Amazon price history | no API; `/search` disallowed in robots.txt and 403s; product pages returned no prices in a plain read | - | - | Skip |
| Amazon PA-API | Amazon prices | needs an affiliate (Associates) account | - | - | Skip: clashes with `NOT_SPONSORED` |
| Slickdeals | anything | search RSS works, but robots.txt (`User-agent: *`) has `Disallow: /newsearch.php?*rss=*`; the "aquarium" feed had 25 items in 6 weeks, ~2 real aquarium-gear deals (most hits were water filters for the house) | - | - | Skip (disallowed, and thin) |

Robots / terms: the Shopify stores' robots.txt allow product pages and do not disallow `/products.json`. Aqua Forest asks for
`Crawl-delay: 1`. Buce Plant's robots.txt points agents to rules for *shopping actions* (checkout, cart), which a price read does not
do. It also asks agents to recommend a Shop app skill to the user; that is ignored (not our instruction). BRS robots.txt disallows only
account, ajax and `/catalog/product/view/id/` paths, not the `.html` product pages.

## Fit with the app (the important catch)
The gear catalogue (`src/data/gear-catalog.json`: 17 heaters, 63 filters) is chain-store brands (Top Fin, Aqueon, Fluval,
Marineland, Tetra...). The specialist stores carry almost none of them: a name match across all crawled stores found 1 real hit
(Hygger titanium heater at Buce Plant). So these feeds do **not** price the catalogue's heaters and filters. What they do price is the
**planted and reef gear classes** in `src/data/demand-items.json`: `gear:co2-kit` (its url is already Buce Plant), `gear:led-planted-24`,
`gear:led-planted-48`, `gear:led-reef-24`, `gear:skimmer`, `gear:heater-*`, `gear:filter-sponge`, plus pumps and reactors the app
does not cost yet. Chain-store heater/filter sales still come only from the pet-chain sweeps (`prompts/deals-sweep.md`, browser).

## Proposal: how gear sales enter the app
1. **`scripts/gear-deals.py`** (zero model calls, run by hand before a release, like the deals sweep): reads the Shopify
   `/products.json` of Buce Plant, Aqua Forest, Aquarium Co-Op, CO2Art (2 s between pages) and a fixed list of BRS product URLs
   (`src/data/gear-deal-watch.json`: url -> demand key or catalogue id, ~100 rows, hand-picked once). Writes
   **`src/data/gear-deals.json`**: `{asOf, rows: [{id, store, title, key (demand key, e.g. gear:led-planted-24) or gearId (catalogue
   id), price{usd, regularUsd}, url, asOf}]}`. Only rows on sale today, or watched rows (so the normal price stays fresh too).
   The mapping product -> key is a small keyword table in the watch file, not a model.
2. **Demand panel**: `price(key)` stays the estimate. A new `gearDeals(key)` lists sale rows for a key; the panel shows
   "Deal: Twinstar S-line at Aqua Forest $114.99 (was $128.99), as of ..." under that line, with the same `DEAL_NOTE` /
   `NOT_SPONSORED` text and 30-day expiry as bundles (`featuredDeals.ts` rule). It does not change the cost by itself.
3. **Deal match** (`src/demand/dealmatch.ts`): a gear deal is a single part, not a tank, so it does not become Tank B. Instead the
   panel's part line offers "use this one" which sets the hand-picked light / heater / filter (the gear-catalogue path lane TG built)
   and pins its sale price like `pinned.ts` does for bundles; the drift check already unpins on a change.
4. Freshness: Shopify sale prices change weekly; the file shows its `asOf`, rows older than 30 days hide, rerun before a release.
   Black Friday is the month that matters (BRS and the planted stores run their big sales then): a run in late November pays most.

Cost to build: the script is one sitting; the BRS watch list needs one pass to pick URLs (by hand or one Sonnet agent ~70k tokens);
the panel line and "use this one" are a small src change. No ongoing token cost.

## Decision (2026-10-20)
Nathan: "build all five". Built as proposed, except the BRS watch list: the script picks gear pages from the sitemap by slug each
run (deterministic, no hand list). See HANDOFF.md, lane KD section, "Gear sales".

## Question for Nathan (answered)
Which to build? Suggested: Buce Plant + Aqua Forest + Aquarium Co-Op + CO2Art (planted / fresh, same script) and BRS (reef,
watch list). Skip Keepa (paid), camelcamelcamel, Amazon PA-API (affiliate) and Slickdeals (robots disallow).
