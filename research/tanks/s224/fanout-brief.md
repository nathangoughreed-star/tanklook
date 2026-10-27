# Tank catalogue fan-out brief (S224, 2026-10-26)

Research task, read-only on the web, NO repository edits. Today is 2026-10-26.

Glass Box is a fish-tank planning app. Its tank library (one row per real product, outer inches) is listed in
`library-2026-10-26.txt` in this folder; read it first. A sibling agent already covered PetSmart (`retailer-petsmart.json`);
you may read it to see the expected output and to avoid re-researching PetSmart products. Goal (Nathan 2026-10-26): a model for
every currently available aquarium tank, kit, or bundle.

## Scope
Glass and acrylic aquariums, fresh and salt, every size (1 gal betta tanks through 300+ gal): bare tanks, kits (tank + light /
filter / hood / heater), all-in-ones, and tank+stand bundles / ensembles. EXCLUDE reptile terrariums, bowls under 1 gal,
sumps, replacement lids, stands sold alone, custom-quote builders, used / marketplace resellers, and pages that say discontinued
or not found. A product out of stock online but still listed counts (say so in notes). Find products from category pages
(paginate to the end) and the brand lists, not only the brands named in your task.

## How
Try WebFetch first. If a site blocks it, use the Claude in Chrome browser tools (load them with ToolSearch in ONE call; create
your OWN tab with tabs_create_mcp and close it when done; other agents use the same Chrome, so never touch tabs you did not
create; keep batches to 3-4 pages). Specs often sit in the page's embedded JSON: search document.documentElement.outerHTML for
"Length" / "Width" / "Height" / "Dimensions" near numbers, and return short extracts (long dumps with URLs get blocked).
Decline cookie banners. Never sign in, add to cart, or submit anything.

## One JSON object per product (a page with a size selector = one object per size, each with its own dims and price)
{ "brand", "line" (name as sold, with gallons, e.g. "Standard Glass Rectangle 20 gal long"), "gal_rated", "L_in", "D_in", "H_in"
  (OUTER inches: L front length, D front-to-back depth, H height), "dims_basis" ("tank" | "with hood/light" | "box" |
  "estimate: <how>"), "glass_mm" (number or null; only if stated), "rimless" (true only when the page says rimless / frameless or
  the photo plainly shows no rim), "material" ("glass" | "acrylic" | "unknown"), "price_usd", "regular_usd" (struck-through list
  price if on sale, else null), "sale_ends" (ISO date or null), "price_kind" ("street" bare tank, "kit" for kit / all-in-one /
  bundle, "msrp" for a maker's list price with no retailer), "includes" (["light","filter","heater","hood","stand",...], [] for
  bare), "sku", "url", "retailer", "checked": "2026-10-26", "confidence" ("high" dims and price read from this page; "medium" one
  value inferred or from Q&A; "low" box / estimate), "in_library" (matching library line text if already listed, else null),
  "notes" }
Never guess a dimension silently: if one is missing, estimate it, say how in dims_basis, set confidence "low".
Also list library rows from your retailer / makers that are no longer sold, as objects with "discontinued": true and the url.

## Output
Write the JSON array (pretty-printed) to the file named in your task, in this folder:
C:\Users\nreed\AppData\Roaming\Claude\side-session-notes\local_19f3cf2d-b519-4798-9a0a-72d8f0a81403\
Final message under 150 words: products found, new vs already in the library, price changes vs the library, discontinued rows,
pages you could not read and why, WebFetch vs Chrome. Do not paste the JSON.
