You are lane GD (gear deals: where to find EQUIPMENT sale prices for the tool). Read HANDOFF.md first, the "Lane KD: bundle deals"
section and its NEXT note, then prompts/deals-sweep.md (how the tank/kit sweeps ran and what blocked them).
Coordinator: the current lanes coordinator chat (find it with list_sessions). Message it when you start, when you push, and when done.
Run on Opus for the design, Sonnet subagents only (Haiku for a grep). Research first; no src/ change until Nathan says yes.

Nathan 2026-10-20 (his words): "is there anywhere else on the internet it would be worth looking for deals on aquarium stuff to build
into the tool? Specifically equipment?"

Step 1, verify the candidate sources (they come from memory, not checked):
- Which specialist stores run on Shopify and answer `/products.json` (price + compare_at_price): Buce Plant, Green Leaf Aquariums,
  Glass Aqua, Aquarium Co-Op, and any other planted / reef store you find. For each: does it answer, how many gear products, are sale
  prices present, robots.txt / terms on automated reads.
- Bulk Reef Supply and Marine Depot: is there a readable sale page or structured data (ld+json) for lights, pumps, heaters, skimmers?
- Keepa / camelcamelcamel for Amazon-first budget gear (Hygger, Nicrew, Chihiros, Week Aqua): is the price history usable without an
  affiliate account or paid key? Amazon PA-API needs an affiliate account, which clashes with NOT_SPONSORED in src/data/deals.ts.
- Slickdeals aquarium category: is there an RSS feed, and how many equipment deals a month?
Rules: never bypass a bot check, captcha or 403; plain links only (no affiliate codes). Before any subagent fan-out, measure one agent
and quote per-source and total tokens to Nathan, and wait for his yes (the last deals sweeps cost ~70-105k Sonnet tokens per agent).

Step 2, a one-page recommendation (research/gear-deal-sources.md): per source, what it covers (fresh / planted / reef gear), how it can
be read (a fixed script with no model calls is preferred, per Nathan's tool rules), how fresh it stays, and the risks. Then a proposal
for how gear sale prices enter the app: today equipment prices live in src/data/demand-items.json `gear:*` rows (read by
src/demand/prices.ts price()), src/data/gear-catalog.json (real heaters with priceUsd / url / asOf) and src/data/gear-models.json
(generic filter / heater classes); a gear sale could feed the demand panel and deal match (src/demand/dealmatch.ts) the way
deals.json feeds bundles. Ask Nathan which sources to build, and wait for his answer.

Ship per the lane rules: in the shared folder, commit and push only with `bash scripts/ship.sh -m "msg" <files>`; never stash, pull,
push, reset or commit -a there. In your own worktree (if you make one): git fetch + merge origin/main, tsc + the tests you touched,
commit by path, git push origin HEAD:main.
