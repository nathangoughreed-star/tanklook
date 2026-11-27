"""SB1 (2026-11-26): research/substrates/data/*.json (subagent sweep) -> src/data/substrateBrands.json (what the app reads).
Run: py -3 scripts/substrate-brands-build.py   Picks the products the picker shows; each entry keeps its source URL and date."""
import json, re, io
R = 'research/substrates/data/'
src = {p['id']: p for f in ('gravel-sand.json', 'soils.json') for p in json.load(open(R + f, encoding='utf8'))}
def lerp(h, k):  # darken (k<1) / lighten (k>1)
    c = [int(h[i:i+2], 16) for i in (1, 3, 5)]
    c = [round(v * k) if k <= 1 else round(v + (255 - v) * (k - 1)) for v in c]
    return '#%02x%02x%02x' % tuple(min(255, v) for v in c)
def shades(c): return c.get('shades') or [c['hex'], lerp(c['hex'], .8), lerp(c['hex'], 1.25), lerp(c['hex'], .65), lerp(c['hex'], 1.45)]
EST = 'Colour estimated from its name (Petco blocked automated reads); grain size is the usual coated-gravel range.'
# (source id, colour name or None, app id suffix, picker type, name, colour label, mm override, note override)
PICK = [
 ('topfin-premium-gravel', 'Rainbow Mix', 'topfin-rainbow', 'gravel', 'Premium Gravel', 'Rainbow Mix', None, None),
 ('topfin-premium-gravel', 'Raspberry Red', 'topfin-raspberry', 'gravel', 'Premium Gravel', 'Raspberry Red', None, None),
 ('topfin-premium-gravel', 'Bright Pink', 'topfin-pink', 'gravel', 'Premium Gravel', 'Bright Pink', None, None),
 ('topfin-premium-gravel', 'Green Mix', 'topfin-green', 'gravel', 'Premium Gravel', 'Green Mix', None, None),
 ('topfin-premium-gravel', 'Blue, Green & Purple', 'topfin-bgp', 'gravel', 'Premium Gravel', 'Blue/Green/Purple', None, None),
 ('topfin-premium-gravel', 'Mardi Gras Mix', 'topfin-mardigras', 'gravel', 'Premium Gravel', 'Mardi Gras', None, None),
 ('glofish-gravel', 'Pink/Green/Blue (multi-colour)', 'glofish-pgb', 'gravel', 'Gravel', 'Pink/Green/Blue', None, None),
 ('imagitarium-gravel', 'Dark Blue', 'imagitarium-darkblue', 'gravel', 'Gravel', 'Dark Blue', None, EST),
 ('imagitarium-gravel', 'Black Lagoon', 'imagitarium-black', 'gravel', 'Gravel', 'Black Lagoon', None, EST),
 ('topfin-premium-gravel', 'Classic Beach', 'topfin-beach', 'natural', 'Premium Gravel', 'Classic Beach', None, None),
 ('topfin-premium-gravel', 'River Rock', 'topfin-river', 'natural', 'Premium Gravel', 'River Rock', None, None),
 ('generic-pea-gravel', None, 'pea-bagged', 'pea', 'Bagged pea gravel', None, None, 'Hardware-store pea gravel; no page could be opened (bot checks), so price and size are snippets and the usual 6-13 mm definition.'),
 ('caribsea-super-naturals', 'Peace River', 'caribsea-peace-river', 'sand', 'Super Naturals', 'Peace River', None, None),
 ('seachem-flourite-black-sand', 'Black Sand', 'flourite-black-sand', 'sand', 'Flourite Black Sand', None, [0.5, 2], 'Seachem does not state a grain size; drawn as fine gravel-sand from the bag photo.'),
 ('quikrete-play-sand', None, 'quikrete-play-sand', 'sand', 'Play sand', None, None, 'Not sold for aquariums, but widely used. Price is a store snippet (the page refused automated reads) and the grain size an estimate. Rinse very well.'),
 ('black-diamond-blasting-abrasive', None, 'black-diamond', 'sand', 'Blasting grit', None, [0.4, 1.4], 'Tractor Supply Black Diamond is coal slag, an industrial abrasive not sold for aquariums; hobbyists use it as black sand (rinse very well). Price and size from store snippets.'),
 ('fluval-stratum', None, 'fluval-stratum', 'soil', 'Plant & Shrimp Stratum', None, None, None),
 ('eco-complete-black', None, 'ecocomplete-black', 'soil', 'Eco-Complete Black', None, [1, 5], None),
 ('eco-complete-red', None, 'ecocomplete-red', 'soil', 'Eco-Complete Red', None, None, None),
 ('seachem-flourite-red', None, 'flourite-red', 'soil', 'Flourite Red', None, [3, 6], 'Seachem does not state a grain size; 3-6 mm is read off the photo.'),
 ('seachem-flourite-dark', None, 'flourite-dark', 'soil', 'Flourite Dark', None, [3, 6], 'Seachem does not state a grain size; 3-6 mm is read off the photo.'),
 ('ada-aqua-soil-amazonia', None, 'ada-amazonia', 'soil', 'Aqua Soil Amazonia', None, None, None),
 ('controsoil', 'Black', 'uns-controsoil', 'soil', 'Controsoil', 'Black', [3, 5], None),
 ('caribsea-arag-alive', 'Special Grade (white)', 'aragalive-special', 'marine', 'Arag-Alive Special Grade', None, None, None),
 ('caribsea-arag-alive', 'Natural Reef', 'aragalive-natural', 'marine', 'Arag-Alive Natural Reef', None, None, None),
 ('caribsea-arag-alive', 'Fiji Pink (Special Grade)', 'aragalive-fiji', 'marine', 'Arag-Alive Fiji Pink', None, None, None),
 ('caribsea-florida-crushed-coral', None, 'caribsea-coral', 'marine', 'Florida Crushed Coral', None, None, None),
]
DYED = 'Dyed, coated gravel; rinse before use. The maker states no grain size or pH effect, so the 4-9 mm size is read from the bag photos beside a dime.'
NOTES = {
 'topfin-rainbow': DYED, 'topfin-raspberry': DYED, 'topfin-pink': DYED, 'topfin-green': DYED, 'topfin-bgp': DYED, 'topfin-mardigras': DYED,
 'topfin-beach': 'Natural-looking coated gravel in tan and brown tones; rinse before use. Grain size read from the bag photos.',
 'topfin-river': 'Natural-looking coated gravel in tan and brown tones; rinse before use. Grain size read from the bag photos.',
 'glofish-pgb': 'Dyed gravel meant to make fluorescent fish and decor stand out under blue light; rinse first. Size read from photos.',
 'caribsea-peace-river': 'All-natural river gravel, no dyes or paints; the maker says it will not raise hardness (pH neutral).',
 'flourite-black-sand': 'Porous fired clay with its nutrients built in, so no supplement is needed; rinse until the water runs clear.',
 'fluval-stratum': 'Volcanic soil granules from Japan; the maker says they soften water and lower carbonate hardness without staining.',
 'ecocomplete-black': 'Basaltic volcanic gravel with iron and other minerals, packed wet with live bacteria; the maker says it will not raise pH or hardness. Sizes run from fine to chunky.',
 'ecocomplete-red': 'Shale with no dyes or coatings. The pile mixes rust red, brown and near-black chips, so the bed reads dark brick red.',
 'ada-amazonia': 'Japanese soil with a nutrient supplement; makers and retailers say it lowers hardness and brings pH to about 5.5-6.5. Sold by the litre.',
 'uns-controsoil': 'Retailer says it holds pH near 6.8 and lowers hardness. Sold by the litre; Fine Black shown.',
 'aragalive-special': 'Live aragonite reef sand, pre-packed with bacteria; holds pH near 8.2. Do not rinse; pour in gently.',
 'aragalive-natural': 'Live aragonite reef sand in natural reef colours; holds pH near 8.2. Do not rinse.',
 'aragalive-fiji': 'Live aragonite reef sand, white with a pink cast; holds pH near 8.2. Do not rinse.',
 'caribsea-coral': 'Coarse crushed coral that buffers pH for saltwater, reef or cichlid tanks; rinse until the water runs clear.',
}
BRAND = {'topfin': 'Top Fin', 'glofish': 'GloFish', 'imagitarium': 'Imagitarium', 'caribsea': 'CaribSea', 'seachem': 'Seachem', 'quikrete': 'Quikrete', 'fluval': 'Fluval', 'eco': 'CaribSea', 'ada': 'ADA', 'controsoil': 'UNS', 'generic': 'Generic', 'black': 'Black Diamond'}
def trim(t, n=230):  # whole sentences only, at most n characters
    t = t.strip()
    if len(t) <= n: return t
    cut = t[:n]; i = max(cut.rfind('. '), cut.rfind('; '))
    return (cut[:i + 1] if i > 60 else cut.rsplit(' ', 1)[0] + '...').strip()
out = []
for sid, cname, aid, typ, name, colour, mm, note in PICK:
    p = src[sid]; c = next((x for x in p['colours'] if cname is None or x['name'] == cname), p['colours'][0])
    bags = [b for b in p['bags'] if b.get('lb') or b.get('liters')]
    b = bags[0]; per = 'lb' if b.get('lb') else 'L'
    if per == 'L': b = max(bags, key=lambda x: x['liters'])
    price = p.get('priceLb')
    if per == 'L': price = round(b['usd'] / b['liters'], 2)
    mmv = mm or p.get('grainMm') or [2, 5]
    if typ in ('gravel', 'natural') and sid in ('topfin-premium-gravel', 'glofish-gravel', 'imagitarium-gravel'): mmv = [4, 9]  # makers state no size; 4-9 mm matches the bag photos beside a dime
    brand = BRAND.get(sid.split('-')[0], p.get('brand') or sid)
    kind = 'sand' if max(mmv) <= 2.5 and typ in ('sand', 'marine') else 'pebble'
    out.append(dict(id='sb-' + aid, brand=brand, name=name, type=typ, **({'colour': colour} if colour else {}), kind=kind, base=c['hex'], shades=shades(c),
        mm=mmv, gloss=p.get('gloss') or 0.2, round=p.get('round') or 0.5,
        nutrient=p.get('nutrient') or 'inert', ph=p.get('phEffect') or 'none', marine=not p.get('fresh', True),
        price=price, per=per, bag=b.get('lb') or b['liters'], url=b['url'], date=b['date'], retailer=re.sub(r' \(.*', '', b['retailer']),
        note=trim(NOTES.get(aid) or note or (p.get('notes') or '')), photos=['research/substrates/photos/' + x['file'].split('/')[-1] for x in p.get('photos', []) if x.get('file')][:3]))
io.open('src/data/substrateBrands.json', 'w', encoding='utf8').write(json.dumps({'asOf': '2026-11-26', 'products': out}, indent=1, ensure_ascii=False) + '\n')
print(len(out), 'products')
