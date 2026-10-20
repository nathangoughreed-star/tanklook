"""Gear sale prices from five specialist stores (lane GD, 2026-10-20). No model calls: plain HTTP reads, run by hand.

    python scripts/gear-deals.py            # writes src/data/gear-deals.json, prints a summary
    python scripts/gear-deals.py --dry      # summary only

Sources (research/gear-deal-sources.md):
  Shopify `/products.json` (price vs compare_at_price): Buce Plant, Aqua Forest Aquarium, Aquarium Co-Op, CO2Art US.
  Bulk Reef Supply (Magento; Marine Depot redirects there): product pages picked from its sitemap by slug, sale = the
  page's embedded `special_price` below `regular_price`.
Only gear the demand engine prices is kept (slots light, filter, heater, skimmer, co2), only variants in stock and at least
5 % off. Sizes are read from the names (light length or the tank length it is for, heater watts, rated gallons); a row
without a size still lands in the file, but the app only offers sized rows (co2 needs none). Polite: 2 s between Shopify
pages, 1 s between BRS pages; a refusal (403/429/503) stops that store, never retried around.
"""
import html, json, re, sys, time, urllib.error, urllib.request
from datetime import date
from pathlib import Path

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'gear-deals.json'
SHOPIFY = [('Buce Plant', 'buceplant.com'), ('Aqua Forest Aquarium', 'aquaforestaquarium.com'),
           ('Aquarium Co-Op', 'aquariumcoop.com'), ('CO2Art', 'co2art.us')]
MIN_OFF = 0.05

# ---- what a product is (slot), from its name; accessories and spare parts are left out
NOT_GEAR = (r'replacement|spare|parts?\b|guard|cover|bracket|mount|arm\b|hanging|leg|stand\b|cable|cord|adapter|clip|holder|'
            r'extension|power supply|controller|lightcontrol|timer|dimmer|thermometer|probe|sensor|o-ring|gasket|impeller|'
            r'media|cartridge|pad\b|intake|pre-?filter|refill|manifold|block\b|fitting|tubing|hose|'
            r'check valve|bubble counter|diffuser|drop checker|cup\b|upgrade|reflector|lens|bulb|t5|e-?book|gift|merch|shirt|'
            r'sock|surface|film|calendar')
SLOTS = [
    ('skimmer', r'protein skimmer|\bskimmer\b(?!.*surface)'),
    ('co2', r'co2.*(regulator|system|kit)|(regulator|system|kit).*co2'),
    ('heater', r'\bheater\b'),
    ('light', r'\bled\b.*\b(light|fixture|lamp)\b|\b(light|lighting|fixture)\b'),
    ('filter', r'sponge filter|canister|hang[- ]on[- ]back|\bhob\b|power filter|internal filter|undergravel filter|ez ?filter|\bfilter\b'),
]
REEF = r'reef|marine|coral|saltwater|\bsps\b|\blps\b'


def slot_of(name: str) -> str | None:
    # the product itself: the name before a variant "(...)" and before "with ..." (a light "with adjustable leg" is still a light)
    n = re.split(r'\(|\bwith\b|\bw/', name.lower())[0]
    if re.search(NOT_GEAR, n) or re.search(r'surface skimmer|water filter for|faucet|shower', n):
        return None
    for s, pat in SLOTS:
        if re.search(pat, n):
            return s
    return None


def sizes(text: str, slot: str) -> dict:
    """Light: the tank length range it fits (mm), from 'for 30~36cm tank', '24-30 inch' or a fixture length.
    Heater: watts. Filter / skimmer: rated gallons (the top of the range)."""
    t = text.lower().replace('”', '"').replace('″', '"')
    out: dict = {}
    if slot == 'light':
        m = re.search(r'(\d{2,4})\s*(?:~|-|to)\s*(\d{2,4})\s*(cm|"|in\b|inch)', t)
        tank = re.search(r'for\s*(\d{2,3})\s*(cm|"|in\b|inch)', t)
        model = re.search(r'twinstar.*?\b(\d{3,4})\s*(?:c|sa|sm|e|ea|b|s|p)\b', t)
        if m:
            k = 10 if m.group(3) == 'cm' else 25.4
            if k == 10 and int(m.group(1)) >= 300:
                k = 1  # "for 1200~1300cm tank": the store meant mm
            out['fitMm'] = [round(int(m.group(1)) * k), round(int(m.group(2)) * k)]
        elif tank or model:  # "for 60cm tank", or a Twinstar size class (600SA = a 60 cm tank)
            n = int(tank.group(1)) * (10 if tank.group(2) == 'cm' else 25.4) if tank else int(model.group(1))
            out['fitMm'] = [round(n * 0.95), round(n * 1.2)]
        else:
            m = re.search(r'(\d{2,3})\s*(cm|"|in\b|inch)', t)
            if m:
                f = int(m.group(1)) * (10 if m.group(2) == 'cm' else 25.4)
                out['fitMm'] = [round(f / 1.05), round(f / 0.7)]  # a fixture of length f suits tanks a little longer
    if slot == 'heater':
        m = re.search(r'(\d{1,4})\s*-?\s*w(?:att)?s?\b', t)
        if m:
            out['watts'] = int(m.group(1))
    if slot in ('filter', 'skimmer'):
        m = re.search(r'(\d{1,4})\s*(?:-|~|to)\s*(\d{1,4})\s*(?:us\s*)?gal', t) or re.search(r'(\d{1,4})\s*(?:us\s*)?gal', t)
        if m:
            out['galMax'] = int(m.group(m.lastindex))
    return out


def get(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()


def shopify(store: str, host: str, today: str, log: list) -> list:
    rows, page, n = [], 1, 0
    while page <= 40:
        try:
            ps = json.loads(get(f'https://{host}/products.json?limit=250&page={page}'))['products']
        except urllib.error.HTTPError as e:
            log.append(f'{store}: HTTP {e.code} at page {page}, stopped'); break
        if not ps:
            break
        n += len(ps)
        for p in ps:
            s = slot_of(p['title'] + ' ' + (p.get('product_type') or ''))
            if not s:
                continue
            for v in p['variants']:
                was, now = float(v.get('compare_at_price') or 0), float(v['price'])
                if not v.get('available') or was <= 0 or now > was * (1 - MIN_OFF):
                    continue
                name = p['title'] + ('' if v['title'] == 'Default Title' else f" ({v['title']})")
                salt = bool(re.search(REEF, name.lower()))
                rows.append({'id': f"{host.split('.')[0]}-{p['handle']}-{v['id']}"[:120], 'store': store, 'slot': s,
                             'salt': salt, 'title': html.unescape(name), **sizes(name, s),
                             'price': {'usd': now, 'regularUsd': was},
                             'url': f"https://{host}/products/{p['handle']}?variant={v['id']}", 'asOf': today})
        page += 1
        time.sleep(2)
    log.append(f'{store}: {n} products read, {len(rows)} gear variants on sale')
    return rows


BRS_SLUGS = {'heater': r'heater', 'skimmer': r'protein-skimmer',
             'light': r'led-(reef-)?light|led-fixture|light-fixture|led-aquarium-light',
             'filter': r'canister-filter|hang-on-back-filter|hob-power-filter|power-filter', 'co2': r'co2-regulator|co2-system'}


def brs(today: str, log: list) -> list:
    sm = get('https://www.bulkreefsupply.com/sitemap/google_sitemap.xml').decode('utf-8', 'replace')
    locs = [u for u in re.findall(r'<loc>([^<]*)</loc>', sm) if u.endswith('.html') and u.count('/') == 3]
    picks = []
    for u in locs:
        slug = u.rsplit('/', 1)[-1][:-5].replace('-', ' ')
        for s, pat in BRS_SLUGS.items():
            if re.search(pat, u.rsplit('/', 1)[-1]) and slot_of(slug) == s:
                picks.append((u, s)); break
    rows = []
    for u, s in picks:
        try:
            h = get(u).decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            log.append(f'Bulk Reef Supply: HTTP {e.code}, stopped'); break
        time.sleep(1)
        sp = re.search(r'"special_price":"?([0-9.]+)', h)
        rg = re.search(r'"regular_price":"?<span class=\\"price\\">\$([0-9,.]+)', h)
        stock = 'InStock' in h or '"is_salable":true' in h or 'Add to Cart' in h
        if not (sp and rg and stock):
            continue
        now, was = float(sp.group(1)), float(rg.group(1).replace(',', ''))
        if was <= 0 or now > was * (1 - MIN_OFF):
            continue
        t = re.search(r'<meta property="og:title" content="([^"]*)"', h)
        d = re.search(r'<meta name="description" content="([^"]*)"', h)
        name = html.unescape(t.group(1) if t else u.rsplit('/', 1)[-1][:-5].replace('-', ' '))
        fresh = re.search(r'freshwater|planted', name.lower())
        rows.append({'id': 'brs-' + u.rsplit('/', 1)[-1][:-5][:100], 'store': 'Bulk Reef Supply', 'slot': s, 'salt': not fresh,
                     'title': name, **sizes(name + ' ' + html.unescape(d.group(1) if d else ''), s),
                     'price': {'usd': now, 'regularUsd': was}, 'url': u, 'asOf': today})
    log.append(f'Bulk Reef Supply: {len(picks)} gear pages read, {len(rows)} on sale')
    return rows


def main():
    today, log, rows = date.today().isoformat(), [], []
    for store, host in SHOPIFY:
        rows += shopify(store, host, today, log)
    rows += brs(today, log)
    for line in log:
        print(line)
    by = {}
    for r in rows:
        k = r['slot'] + (' sized' if any(x in r for x in ('fitMm', 'watts', 'galMax')) or r['slot'] == 'co2' else ' unsized')
        by[k] = by.get(k, 0) + 1
    print('rows', len(rows), dict(sorted(by.items())))
    if '--dry' not in sys.argv:
        OUT.write_text(json.dumps({'asOf': today, 'note': 'Gear on sale at five specialist stores, read by scripts/gear-deals.py '
                                   '(lane GD). price.usd = sale price, regularUsd = the store\'s own was-price. Rerun before a release.',
                                   'rows': rows}, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        print('wrote', OUT)


if __name__ == '__main__':
    main()
