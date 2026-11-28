# Substrate research brief (lane SB1, 2026-11-26)
Goal: facts for real US aquarium substrates, from retailer / maker pages opened TODAY. Never invent a number: if a page won't load, try another retailer; if still nothing, set the field to null and say why in `notes`.

For EACH product below write one object into the JSON file named in your task (array). Fields:
- id (kebab, e.g. "fluval-stratum"), brand, name, kind: "gravel" | "sand" | "soil" | "marine" | "natural"
- fresh: true/false (false = marine/reef), nutrient: "inert" | "active" (buffers/lowers pH or holds nutrients, e.g. aqua soil, laterite) | "fertilized" (nutrient rich), phEffect: "none" | "lowers" | "raises" | "buffers"
- colours: array of { name, hex (main body colour of the grains), shades: 4-6 hex values sampled from the photo (use python -I with PIL on the downloaded photo: crop the grain area, quantise to ~6 colours), photo: local file name }. One entry per colour the maker sells in the US (aquarium gravel brands sell many: list every colour name; sample hex+shades for at least 4 of them, estimate the rest and say "estimated" in notes).
- grainMm: [min, max] stated by maker (convert; 1 in = 25.4 mm); gloss: 0-1 your reading of the photo (0 matte natural, 0.6+ for epoxy/dyed coated gravel); round: 0-1 (1 = smooth round pebble, 0.3 = angular/crushed)
- bags: array of { lb, usd, retailer, url, date: "2026-11-26" } for every bag size you saw priced (at least 2 retailers if you can). priceLb = lowest sensible $/lb of the common size, computed by you (usd/lb), plus `priceLbNote`.
- coverage: if the maker states it (e.g. "1 bag covers X sq ft at 2 in") record it.
- photos: array of { url (page it came from), file (saved to research/substrates/photos/<id>-N.jpg, 2+ photos per product, of the grains up close if you can find them, one in a tank if possible), what }. Download with curl -L -o (small images only, under 1.5 MB each; skip anything not a plain jpg/png/webp).
- notes: pre-fertilized or not, effect on pH/hardness (say the maker's claim), rinse needed, shrimp/plant suitability, anything surprising. Cite which page said each claim.

Write the JSON with the Write tool, valid JSON. Also return (final message, under 200 words) only: file path, products done, products you could not price, and anything odd. Do NOT edit anything under src/ or any other file. Do not run git.
