# PB2: overflow boxes and sumps (2026-11-17)

Rows: `src/data/gear/overflows.json` (8) and `src/data/gear/sumps.json` (10). Every row's numbers were read from the product page named in its `url` on 2026-11-17.

## Fields PB1 (Plumbing view) can rely on
Overflow (`OverflowProduct` in `src/data/gearCatalog.ts`, list `OVERFLOW_PRODUCTS`):
- `ratedGph`: the maker's stated maximum flow, gal/h. Never ours. Compare a return pump's gph against it.
- `kind`: `hang-on` (box over the rim) or `external` (box on the glass / outside of a drilled tank). `est` lists it when read from context (INOUT).
- `ratedGal` (tank rating, when stated), `drains` (count), `drainBulkheadIn` (size in inches, as printed), `maxGlassMm`, `dimsIn {l,w,h}` (exterior box, inches).
Sump (`SumpProduct`, `SUMP_PRODUCTS`):
- `waterGal`: total water volume the seller states, gal (absent + `needSpec` when the page gives none; ECO 30 is the marketing "20-gallon" figure, in `est`).
- `ratedGal`: the display tank the maker rates it for. `ratedGph`: stated sump flow (RS-75 only). `dimsIn {l,w,h}`: outer size, inches. `material`.
Both: `priceUsd`, `seller`, `url`, `asOf`, `est`, `needSpec`, `note`.

## How they are wired
- They are two picker categories, `overflow` and `sump` (Equipment tab > More equipment), offered only when the Tech filter row is the sump option.
- Picked products live in `tech.products.overflow` / `tech.products.sump` (the same map the skimmer / UV / chiller products use); `rowProduct(tech, 'sump' | 'overflow')` reads them, and they are dropped when the filter stops being a sump.
- Cost: a sump product replaces the bare-glass sump tank's price; an overflow box is added on top of the generic plumbing part. The demand engine counts both (`optionCost`).
- A picked sump also sets `tech.sump` to its own outer size (so the 3D / volume use it); choosing another sump size drops the product.
- Overflow fit: `ratedGph` against 6 gal/h per display gallon (the engine's return pump, `GEAR.returnpump.gphPerGal`).

## Not verified (not added)
- Reef Octopus OCTO 15A / 24A / 30A / 36A sumps: Bulk Reef Supply now redirects the pages to its category; only search snippets (OS-30A 29.92 x 15.75 x 15.75 in, price varied $659-693 by seller) seen. Read a live page before adding.
- Eshopps RS-100 / RS-300 4th gen, ADV-100 (That Pet Place page 404; BRS pages not found): only snippets.
- Nature Aquariums PRO 48 in. glass sump ($749.95 in a snippet): page returned 429.
- AquaMaxx Pro-Flex 2 / BioMaxx 30 ($199.99 / unknown): no page found.
- Aqueon ProFlex sumps: only a forum post with dimensions.
- Amazon: automated access is refused, so no Amazon-only overflow boxes (Aqueon, Coralife, Marineland) were read.
- Open points on read rows: Eshopps PF-800 is 800 gph on That Pet Place and 600 gph on other retailers; PF-1000 / PF-1200 titles say 200 / 300 gal while the Max Tank Size fields say 150 / 200 (the field values are used); RS-200's title and description disagree on the tank rating (none recorded); RS-75 priced at the open-box page's struck-through new price ($249.99, open box $212.49).
