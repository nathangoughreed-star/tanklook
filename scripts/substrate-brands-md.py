"""SB1: write research/substrates/brands-2026-11.md from src/data/substrateBrands.json and the sweep files. Run after substrate-brands-build.py."""
import json, io
app = json.load(open('src/data/substrateBrands.json', encoding='utf8'))['products']
sweep = {p['id']: p for f in ('gravel-sand.json', 'soils.json') for p in json.load(open('research/substrates/data/' + f, encoding='utf8'))}
L = ["# Substrate brands and types, US, 2026-11-26 (lane SB1, requests R185 / R186)", "",
"Sourced from retailer and maker pages opened on 2026-11-26 by a research sweep (raw per-product records: `data/gravel-sand.json`, `data/soils.json`; reference photos: `photos/`). `scripts/substrate-brands-build.py` compiles the products the app shows into `src/data/substrateBrands.json`; `scripts/substrate-brands-md.py` wrote this page.", "",
"**Every price is a sourced guess, not a quote**: one dated retailer page, one bag size. The app shows it with the page's retailer and date, and the user can type their own `$/lb` (`TankSetup.substrate.priceLb`; soils sold by the litre take `$/L`).", "",
"## What the app models", "",
"| Product | Picker type | Colour | Grain mm | $ per | Bag | Retailer (2026-11-26) | Nutrients | Water | Source page |", "|---|---|---|---|---|---|---|---|---|---|"]
for p in app:
    L.append(f"| {p['brand']} {p['name']} | {p['type']} | {p.get('colour') or '-'} | {p['mm'][0]}-{p['mm'][1]} | ${p['price']:.2f}/{p['per']} | {p['bag']} {p['per']} | {p['retailer']} | {p['nutrient']} | {p['ph']} | {p['url']} |")
L += ["", "Grain sizes the makers do not state (Top Fin, GloFish, Imagitarium, Flourite) are read from bag photos and marked in each product's note. Colours were sampled from the saved photos (quantised main colours) except Imagitarium, whose pages refused automated reads (colours estimated from the names).", "",
"## Found but not modelled", "",
"- **Seachem Laterite**: an additive, not a bed; no US price page found.",
"- **Tropica Aquarium Soil**: one listing (J&L Aquatics, $26.96 for 3 L) whose country and currency we could not confirm; no grain photo.",
"- **Walstad potting soil**: Home Depot and Ace refused reads; no $/lb.",
"- **Netlea / Aquarium Co-op / Mr Aqua soils**: no US listing found, or the site rate-limited us.",
"- **Fluval Biomax**: filter media, not a substrate.",
"- **Estes (Spectrastone, Special, Shallow Creek, Permaglo)**: real products, but their colours and grain sizes were not read from any page (estimated only), so they are not drawn. There is no 'Spectrum Brands Estes' line: Spectrum owns GloFish, Tetra and Marineland; Estes is a separate maker.",
"- **Black Diamond blasting grit** at Tractor Supply is coal slag, an industrial abrasive not sold for aquariums.",
"- **Other colours** each maker sells (Top Fin has 13, GloFish 5, Imagitarium 7+): only the ones with sampled photo colours or a clear name are in the picker.", "",
"## Clown puke", "",
"Every big chain sells a multicolour mix: Top Fin Rainbow Mix (pink, orange, yellow, green, blue, sampled from the bag photo), Top Fin Mardi Gras (pink, purple, green, blue, teal), GloFish pink/green/blue, Imagitarium Rainbow Confetti, Estes Permaglo Rainbow. The app's **Clown puke** preset is a custom blend of five dyed gravels (red, blue, yellow, green, pink, 20 % each, fully mixed) so it can be reshuffled and edited; the Top Fin and GloFish mixes are also pickable as products.", "",
"## Water effect by product (maker or retailer claims; see each record in the data files)", ""]
for p in app:
    s = sweep.get({'sb-topfin-rainbow': 'topfin-premium-gravel'}.get(p['id'], ''), None)
    L.append(f"- **{p['brand']} {p['name']}{', ' + p['colour'] if p.get('colour') else ''}**: {p['note']}")
io.open('research/substrates/brands-2026-11.md', 'w', encoding='utf8').write('\n'.join(L) + '\n')
