# Tank dimensions dig brief (S224, 2026-10-26)

Research task, read-only on the web, NO repository edits. `dims-worklist.json` in this folder lists products whose outer
dimensions are missing or fail a reasonableness check against the advertised gallons (field `why`). Your task names which
rows are yours (by `file`). For each row, find the TANK's own outer dimensions (L = front length, D = front-to-back depth,
H = height, inches; glass only, not the box, hood, light or cabinet).

Nathan (2026-10-26): "make sure you expand all menus in the product description and look at all pictures, tank dimensions are
often there and only mentioned once. You may have to dig a bit." So, on every page:
1. Expand every collapsed section: Description, Specifications, Details, "Show more", Q&A / Questions, Reviews mentions.
2. Look at EVERY product image in the gallery (click through them; zoom / screenshot each). Dimension drawings with arrows and
   numbers are common on the 3rd-8th image. Use the zoom action at modest scale to read small print.
3. Check: outer L*D*H/231 should be about 1.0-1.35x the rated gallons for a glass tank. If what you find still fails, say why
   (e.g. "the image shows 24 x 12 x 16 with the hood").
4. If the page has nothing, the maker's own page for the same product is a fair second source (say so).

How: Chrome (Claude in Chrome tools; load them with ToolSearch in ONE call; create your OWN tab, close it when done; other agents
share the browser, never touch tabs you did not create) or curl / WebFetch where the site allows. Keep batches to 3-4 pages and
pause a few seconds between pages: Chewy and Walmart block bursts; if a site shows a CAPTCHA or blocks you, stop that site and
record the rows as unresolved ("blocked"). Never solve CAPTCHAs, sign in, add to cart or submit anything. Decline cookie banners.

Output, one object per worklist row you handled, in the file your task names, in this folder:
{ "url", "brand", "line", "L_in", "D_in", "H_in" (numbers or null), "dims_basis" ("tank" | "with hood/light" | "box" |
  "estimate: <how>"), "found_in" ("specifications" | "description" | "image <n>" | "Q&A" | "maker page" | "none"),
  "gal_rated", "ratio" (L*D*H/231 / gal_rated, 2 decimals), "confidence" ("high" read as the tank's dims; "medium" inferred;
  "low" estimate), "notes" }
Final message under 120 words: rows resolved (high / medium), unresolved and why, sites that blocked you. No JSON in the message.
