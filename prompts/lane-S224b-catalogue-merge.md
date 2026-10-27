# Lane S224b: finish the every-retailer tank catalogue merge (handoff from S224, 2026-10-26)

## State first
- Worktree `C:\Users\nreed\Glass Box\.claude\worktrees\s223`, branch `s223` (node_modules is a junction to the shared checkout's;
  delete the link with `[IO.Directory]::Delete` before any worktree removal). Never edit `C:\Users\nreed\Glass-Box-stocking`
  (frozen copy) or the shared checkout `C:\Users\nreed\Glass Box`.
- Already on main from this lane: 8606dfc (Petco rimless Imagitarium, g6c resized, `scripts/moved-numbers.mjs`) and 8d1fb4d (picks
  set the rim via `src/ui/tankPick.ts`; `saleLive` / `variantUsd` in `src/data/tanks.ts`: a sale not seen for 30 days reads the list
  price in the picker, tankSaleFor and tankfit). The price-staleness work is DONE and pushed; nothing of it is uncommitted.
- On branch s223, NOT pushed: one WIP commit "S224b WIP: catalogue merge" = `src/data/tanks.json` rewritten by the merge
  (59 -> 142 models) + `research/tanks/s224/` (merge.cjs, worklist.cjs, both briefs, every research output, merge-report.json)
  + this file.

## Nathan's decisions (2026-10-26, all in the S224 chat)
- Goal: "a model for every currently available tank, kit, or bundle. Not just rimless."
- New sizes with no generic entry are LIBRARY PRELOADS ONLY: a product-named base (`n_<brand>_<slug>`, name starts with the brand),
  never a name matching `/^[\d.]+ (gal|ft)/`, so tankFor / step-ups / starters / builds never pick it.
- His 10-20 rule stands: an `estimate` size takes the first high-confidence bare glass listing (the merge resizes g3c to Aqueon's
  9.25 in Frameless Cube 3; an engine move to list).
- All new sizes go in; acrylic included and marked "(acrylic)" in the line.
- Weak dims: "do a reasonableness check against the advertised gallons. make sure you expand all menus in the product description
  and look at all pictures ... You may have to dig a bit." Done: outer L*D*H/231 must be 0.85-1.5x the rating (high + tank-only
  rows 0.6-2.0x); 214 rows were dug (dims-*.json); rows still failing are left out and listed.
- Prices: keep `price_usd` / `regular_usd` / `checked` (no sale record); saleLive's 30-day rule handles staleness (pushed). A
  scheduled price sweep (Claude in Chrome for Petco) is the NEXT lane after this merge: note it in HANDOFF.

## Research (research/tanks/s224/, copies of the side-session notes)
| file | rows | notes |
|---|---|---|
| retailer-petsmart.json | 104 | category fully crawled |
| retailer-petco.json | 198 | Chrome only; rimless Imagitarium skipped (already on main) |
| retailer-specialists.json | 265 | Bulk Reef Supply (Marine Depot redirects there) |
| maker-lineups.json | 161 | Aqueon, Marineland, Tetra, Fluval, Coralife; MSRP rows |
| retailer-amazon.json | 131 | searches, not the Best Sellers list; box dims common |
| retailer-walmart.json | 30 | Walmart's own stock is small kits only; one CAPTCHA, not bypassed |
| retailer-chewy.json | 24 | PARTIAL: Chewy's bot wall (Kasada) blocked after ~130 pages; retry slowly another day |
| dims-petco / dims-makers / dims-amazon-walmart.json | 89 / 58 / 45 | the gallons dig |
Agent spend: ~1.87 M tokens (pilot 274 k, six slices 995 k, dig 605 k) vs the quotes Nathan approved (2-2.5 M slices, ~0.85 M dig).

## Merge (research/tanks/s224/merge.cjs; dry run `node merge.cjs src/data/tanks.json research/tanks/s224`, `--write` rewrites)
Run on main 8d1fb4d's tanks.json: 913 rows, 182 dims from the dig, 618 products: 86 already listed (8 price updates), 532 variants
added, 83 new product-named bases (34 carry "(N gal inside, rated R)" because the label is nominal), 1 estimate resized (g3c),
9 discontinued flags; left out: gallons check 55, no dims 38, curved / round 119 (needs bow / hex / cylinder bases: a later lane),
other 3. check-tanks: 142 tanks, 0 problems. Build OK.

## Steps left
1. Rebase s223 on origin/main (S233, product gate, branch s233, appends helpers at the END of src/data/tanks.ts and adds
   `KitModel.kind 'starter'` in src/data/kits.ts; whoever lands second rebases).
2. Fix the source ratchet: test/sources.test.ts fails 487 > 479. New bases with low-confidence dims carry `est: ['L','D','H']`;
   add a TANKS rule in src/data/provenance.ts for est rows (status 'researched' or 'derived', with the why), as S224 did for the
   Frameless Shallow depths.
3. Re-run the full suite. calib "is deterministic for a seed", growth and spider failed once under load (growth and spider
   timed out earlier and passed alone; check calib alone on main and on the branch before blaming load).
4. Spot-check the merged rows by eye: ~20 random new variants against their pages (brand, line, dims, price, kit vs bare,
   rimless); check that every product named rimless / frameless carries the flag (test/tankpick.test.ts guards it).
5. Kits: merged kit rows are plain variants (price_kind 'kit', no `kit` record). After S233 lands, starter / LED bundles should get
   KitModel.kind 'starter' records and true all-in-ones locked records (S223's part 2: 34 on main plus the merged ones). Big enough
   for its own lane; propose it, do not fold it in here.
6. Moved-numbers gate: `node scripts/moved-numbers.mjs before.json --now 2026-10-26` in a scratch worktree of origin/main and the
   same on the branch, then `--diff`. Expected: g3c resize (starters in a 3 gal cube, maybe picks), price-driven step-up / build
   costs from the 8 price updates and the new cheaper variants under generic sizes; new library rows in sumps. The last run's main
   side timed out under load (vite transport 60 s): run it alone.
7. HANDOFF.md: extend the S224 section (decisions above, numbers, left-out lists, the sweep as the next lane).
8. Send the moved-numbers table to Coordinator 10, list the exact outgoing commits, push only on Nathan's yes in your chat.
