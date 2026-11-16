# Lane SP1: stands as real products (R95, Nathan 2026-11-16)

Nathan, on a 20 gal long setup priced "Stand $88" under a black wood cabinet: "is that stand priced accurately to a real product?" Answer was no: src/demand/engine.ts:120-124 interpolates gear:stand-20 ($60/85/145) and gear:stand-55 (src/data/demand-items.json:779) by gallons; the drawn cabinet style really sells for ~$98-145. He said: "Yes, real stands".

## Do
1. Catalogue of real stands, same pattern as the tank / hood catalogues (src/data/tanks.json, the HD1 hood products): brand, line, model, footprint it fits (e.g. 30 x 12 for 20 long / 29), height, style (metal frame / wood cabinet / open shelf), color, price with a dated source URL, sold-at (Petco / PetSmart / Walmart / Amazon / LFS). Start with the common box-store and Amazon stands for the sizes on the roster: 10, 20 high, 20 long / 29, 40 breeder, 55 / 75, plus a couple of brand cabinets (Aqueon, Imagitarium, Top Fin, Aquatic Fundamentals, Seapora). Sources and provenance per the ratchet rules (test/sources.test.ts must not rise).
2. Stand picker in the new UI (the Tank section's Stand group): products that fit the tank's footprint first, with picture tiles (like gear tiles), price, style; "Generic" stays as the fallback and says it's an estimate.
3. The drawn stand follows the pick: style (frame vs cabinet), color, height, door layout close enough; geometry may be simple but true colors (memory: real gear in true colours).
4. Cost line shows the product: "Stand: Aqueon 20 long / 29 cabinet, black ($1xx)". Default for a catalogue tank: the cheapest fitting cabinet if the scene shows a cabinet, else frame; keep a custom tank on the generic estimate unless a stand fits.
5. Tests: fit filter, price row, drawn style follows pick, saved files without a stand product still load.
6. Shots at 1280 and 390: the picker with fitting stands, and the 20 long setup with a chosen cabinet and its cost line.

Fresh branch from origin/main. Commit on the branch; send C24 the sha and shot paths. Don't push.

## Part 2 (Nathan 2026-11-16) - R96
"I would really like to focus on getting accurate pictures/models made of the stands for each product, especially color/sheen/texture. That may sway someone's decision so it must be reasonably accurate."
Today the drawn finish snaps to black / white / oak and the tiles show generic silhouettes. For EVERY catalogue stand:
1. Gather 2-4 product photos per stand (maker / retailer listing; save to research/screens/SP1/ref/<id>-*.jpg with the URL in a sources.md) and record per-stand: exact color (sampled hex from the photos under neutral light, front face and top), sheen (matte / satin / gloss), texture (wood grain direction and scale, laminate, powder-coat metal), and shape facts (door count and style, handle type and color, toe-kick / legs, top overhang, open shelf, back panel, cable cutouts, frame tube size).
2. Per-stand model: geometry from those shape facts (simple is fine but the silhouette must read as that product), material with the sampled color, roughness / clearcoat for the sheen, and a procedural or small baked grain texture where the real one has grain. No snapping to three finishes.
3. Tiles: baked stills of each model (same angle and light as other gear tiles), not silhouettes.
4. Proof: research/screens/SP1/compare/<id>.jpg side by side, product photo left and our model right, same angle, for every stand; plus picker shots at 1280 and 390. Iterate any that don't match before reporting; list any you couldn't get photos for.
Same branch flow: fresh branch from origin/main once SP1 (e209550e) lands, commit, send C24 the sha. Don't push.
