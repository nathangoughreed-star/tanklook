# Known products library (PL1, 2026-11-16)

Nathan's rule: whenever a chat meets a popular product we do not have, it goes into the catalogue, whatever the product type.
The library is the set of JSON files in `src/data/gear/` (stands, hoods, lights, filters, heaters, pumps, ...). One file per type, one row per product.

## What counts as popular
Any one of: Amazon Best Sellers rank in its category or "N+ bought in past month"; 100+ reviews on Amazon, Chewy, Petco or PetSmart; on the first listing page of Chewy / Petco / PetSmart sorted Bestselling or Most Reviewed;
or the house brand a big-box store sells for a standard tank (Top Fin, Imagitarium, Aqueon, Marineland, Tetra, Fluval, Seapora). Record the evidence in the row (`popularity` in lights.json, `note` elsewhere).

## Check before you add
```bash
node scripts/product-sweep-check.mjs titles.txt
```
One title or URL per line (or pipe them in). Prints KNOWN (with the file:id it matched), MAYBE (same brand and some tokens; look by eye) or NEW. Fuzzy by brand + model/size tokens; the same URL always matches.

## Dedupe key
brand + model/line + size (footprint or gallons). One row per product: if two retailers sell it, keep the cheapest verified price and name that seller in `seller`; put the other price in the note.
Colour variants are separate rows only when the drawn finish differs (black / oak / white).

## How to add
1. Follow the file's existing schema exactly (`stands.json`: brand, line, kind, finish, color, fits, heightIn, priceUsd, seller, url, asOf, est, note; `hoods.json`: lengthIn, depthIn, fitsGal, light{...}; `lights.json`: copy a neighbouring row).
2. Every number read from the page; anything not read goes in `est`, with the reason in `note`. Skip a product rather than invent it.
3. `asOf` = date the price was read; `url` = the product page.
4. Add only; never delete a row. Re-price existing rows in place.
5. Run `npx vitest run test/stands.test.ts test/hoods.test.ts test/lightfit.test.ts test/sources.test.ts` and `npm run build`. A new cheapest stand changes the default stand: re-bless and list before/after in HANDOFF.

## Method that works (2026-11-16)
- Claude in Chrome, one tab, one retailer page at a time. Listing pages give titles and live prices cheaply; read them with JS (`querySelectorAll`) instead of whole-page text.
- Amazon: search `s?k=...&s=review-rank`; titles carry the dimensions, spec tables are mostly missing from `innerText`.
- Chewy and Petco product pages print no dimensions (Chewy none, Petco only weight), so height and kind are `est` there.
- Petco category URLs: `https://www.petco.com/shop/en/petcostore/category/...` (redirects to `/category/...`). Walmart blocks the fetch tool.
