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
