# Price sweep (lane S232)

Re-reads every library variant's retailer page, records price / list price (sale) / dead links, ONE commit for Nathan's yes. Nothing pushes.
Fields stay price_usd / regular_usd / sale_ends / checked (the 30-day `saleLive` rule in src/data/tanks.ts is why a sweep must run at least every ~3 weeks).

## One sweep
1. `node scripts/price-sweep.mjs fetch --out research/price-sweep/<date>` : plain fetch of everything that allows it (about 30 s, no model tokens).
   Writes `results.json` and `browser-queue.json` (Petco and Chewy always; PetSmart reads fine by plain fetch, 15-20 s a page, redirects followed; any page whose source has no price).
2. For each queue entry, read the page in **Claude in Chrome** (petco.com blocks WebFetch and the built-in browser) and write
   `browser-results.json`: `{"results":[{"key","url","status":"ok","price":N,"regular":N|omit,"sale_ends":"YYYY-MM-DD"|omit,"available":bool}]}`
   (status "dead" with a note for a gone page). `price` = the price shown now (the sale price if struck-through list price appears; `regular` = the struck-through one). Use the page's visible `$` figures for the product's own size; multi-size pages: the size in the variant's name. Keep batches to 3 pages with a `computer` wait of 7 s between `navigate` and `javascript_tool` (no wait = body is null); a page that freezes the renderer (javascript_tool times out at 45 s, seen on petco black-framed-10-gallon-3966935) is skipped and left for a human; the next `navigate` recovers the tab; Chewy shows a blank page in Chrome (bot wall); a Petco h1 of "Sorry! We can't find that page" = dead link; the page shows sale price and list price as its first two `$` figures, but a multi-size kit page shows several, so match the variant's size; `navigate` then `javascript_tool` returning `document.body.innerText.match(/\$\d[\d,]*\.\d\d/g)` plus the h1.
3. `node scripts/price-sweep.mjs apply research/price-sweep/<date> --commit` : merges both files into tanks.json, writes `report.md`, makes one commit.
   Not applied automatically (listed in the report): prices far from the stored one (x0.55..x1.6), entries with no stored price, dead links, unreadable pages.
4. Nathan reads report.md; the coordinator pushes.
