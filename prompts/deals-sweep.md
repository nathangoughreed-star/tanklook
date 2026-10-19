# Deals sweep (lane KD) - how to refresh src/data/deals.json

Purpose: keep the tank+stand bundle prices honest. The app shows them "as of <date>, check current price"; sales
change weekly, so rerun this before a release or whenever the list is more than ~4 weeks old.

## Rules
- SONNET subagents only (Haiku for a pure grep). At most 3 at once, ONE web search at a time each: search rate-limits when
  many run together (lane KK phase 2: 12 at once failed, 3 at a time worked).
- Measure one batch first, quote per-row and total tokens to Nathan, wait for his yes before more agents.
- A few well-sourced current deals beat many weak rows. If no live listing is found, either leave the row out or set `est: true`
  with a note. Never invent a price. Price on a retailer page that shows "out of stock" still counts, say so in `note`.

## Batch split (one agent each; scope = rated gallons 10-75, fresh water)
1. PetSmart + Petco: stand-and-tank combos, "tank + stand" bundles, starter kits sold with a stand, sale pages.
2. Amazon + Walmart + Chewy: Aqueon / Marineland / Fluval / SeaClear / Aquatic Fundamentals combos with cabinet stand.
3. Local-brand and big-box combos (Tractor Supply, Lowe's/Home Depot, Big Al's, Aquarium Co-Op, That Pet Place) + any seasonal
   sale ("$1 per gallon", Black Friday, Labor Day) that is live.

## Agent brief (paste, fill `{scope}`)
> Find CURRENT (live listing today) aquarium deals where the tank is sold WITH its stand (or a kit that includes a stand), {scope}.
> One web search at a time. For each deal return one JSON object: {"id": "retailer-slug-gal", "retailer", "name", "gal" (rated gallons),
> "includes": subset of ["tank","stand","lid","light","filter","heater"], "price": {"usd", "regularUsd" (only if the page shows a list
> price)}, "saleEnds" (ISO, only if the page says), "url" (the listing), "asOf" (today ISO), "est" (true only if you could not open a live
> listing), "note"}. 3-6 solid rows max, 12 searches max. Report only the JSON array plus one line on what you could not find.

## Starter kits (added 2026-10-19)
The same file also holds starter kits without a stand (tank + hood + light + filter, usually a heater), from PetSmart, Petco, Walmart, Chewy
and Amazon. Walmart, Petco, Chewy and Amazon block page reads from WebFetch and the in-app browser (bot check / 403 / captcha, never bypass it),
but load normally in Nathan's Chrome through the Claude in Chrome extension: open one listing per site, then fetch the others from that tab
(Walmart: `__NEXT_DATA__` product.priceInfo; Petco: ld+json and the size picker; Chewy: switch the size and read "Chewy Price";
Amazon: buy-box price and `#availability`). Out of stock = `est: true`; gone = drop the row. A price that only a search snippet gives
gets `price: from a search result ...` in `look.guessed`. Map each kit to the nearest catalog tank (`tank`) so it is a one-click start;
say so in `guessed` when the shape differs.

## Merging
Append the rows to `deals` in src/data/deals.json (unique ids; replace a row by id on rerun; drop rows whose listing is gone),
bump top-level `asOf`, run `npx vitest run test/kits.test.ts test/demand.test.ts` and `npx tsc --noEmit`.
The app (demand panel, Quick Setup) shows the best-saving deal that fits the tank size and stand, with its url, the sale end date and
the as-of date; expired `saleEnds` rows are hidden automatically.

## Card pictures
Each featured deal needs `src/data/deal-pics/<deal id>.jpg` (400 px wide, like the examples' pictures; without one the card falls back to a
drawn sketch). Make it: run the dev server, clear localStorage, click the deal's card on the start dialog, close the eye inset, scroll the
wheel 3 ticks out so the tank and stand fill the frame, crop the canvas to roughly 400x345, save as that jpg. It shows the real starting point.
