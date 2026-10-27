"""Merge the three lane files into cadence.json and the two .md tables (run from research/maintenance)."""
import json, collections
from urllib.parse import urlparse

R = 'raw/'
items = []
for lane in ['aquatic', 'herp', 'setup-auto']:
    d = json.load(open(R + lane + '.json', encoding='utf8'))
    for i in d['items']:
        i['lane'] = lane
        items.append(i)


def cls(i):
    a = (i['applies_to'] + ' ' + i['id']).lower()
    if i['lane'] == 'setup-auto':
        if i['id'].startswith(('cyc', 'setup', 'hands')): return 'setup'
        if i['id'].startswith('awc'): return 'auto-water-change'
        if i['id'].startswith('feed'): return 'auto-feeder'
        if i['id'].startswith('ato'): return 'ato'
    if i['lane'] == 'herp': return 'terrarium'
    if any(k in a for k in ['salt', 'reef', 'marine', 'coral']): return 'saltwater'
    if 'plant' in a or i['id'].startswith(('jbl', 'ag_')): return 'planted'
    return 'freshwater'


for i in items:
    i['group'] = cls(i)
    if i['id'] in ('adf-water', 'adf-feed', 'adf-filter'): i['group'] = 'freshwater'
    if i['id'].startswith('pal-'): i['group'] = 'paludarium'
    if i['id'].startswith('cyc-palu'): i['group'] = 'setup'
    if not i.get('sources') and i['status'] == 'sourced': i['status'] = 'assumption'

model = [
    dict(id='m-water-change', chore='Water change (fresh, hose or bucket)', everyDays=7, minutesPerSession='12 + 0.5 x gal changed (bucket); 8 + 0.2 x gal (hose)', weeklyMean='same per week', status='assumption',
         basis='demand-defaults time.waterChange*; interval 7 d cited (americanaquariumproducts 10-20 % weekly); minutes per job not stated on any page (research/sourcing/minutes/minutes-A.json)'),
    dict(id='m-testing', chore='Water testing (established)', everyDays=14, minutesPerSession=6, weeklyMean=3, status='assumption',
         basis='demand-defaults testingMin 3 min/wk = 6 min every 2 weeks; model interval cited FishyHub 2-4 wk, but aquatic sources here say 1-2 wk for goldfish (goldfish_test) and weekly for reef (salt_testing): the model sits at the lax end for fresh'),
    dict(id='m-filter', chore='Filter media rinse', everyDays=14, minutesPerSession=4, weeklyMean=2, status='assumption',
         basis='demand-defaults filterCleanMinPerWeek mode 2; interval 14 d (JBL internal every 2 wk, cited); canister about 28 d (JBL) would be 8 min a job'),
    dict(id='m-feeding', chore='Feeding trip (fish, by hand)', everyDays=1, minutesPerSession=0.5, weeklyMean=3.5, status='assumption',
         basis='demand-defaults feedingTripMinPerWeek 3.5; daily interval cited (goldfish_feed, crayfish_feed); 30 s a trip is stated nowhere'),
    dict(id='m-glass', chore='Glass wipe', everyDays=7, minutesPerSession='1-4 (light-scaled)', weeklyMean='1-4', status='assumption',
         basis='demand-defaults glass.*; weekly cited (Charterhouse, via the MW lane); reef sources say every other day to weekly (salt_glass_carbon_pumps)'),
    dict(id='m-yearly', chore='Yearly jobs (deep clean, swaps, rescape)', everyDays=365, minutesPerSession=208, weeklyMean=4, status='assumption',
         basis='demand-defaults yearlyJobsMinPerWeek 4 x 52'),
    dict(id='m-salt', chore='Salt work (mix, top-off, dosing, skimmer)', everyDays='1-7 mixed', minutesPerSession='n/a', weeklyMean=15, status='assumption',
         basis='demand-defaults saltExtraMin 15 min/wk; cadences cited: top-off daily without ATO (salt_topoff), skimmer cup daily-weekly (salt_skimmer), dosing weekly (salt_dosing). The 15 min cannot be split across them from sources'),
    dict(id='m-mist', chore='Terrarium misting + spot clean', everyDays=1, minutesPerSession='about 1.3 (9 / 7)', weeklyMean=9, status='assumption',
         basis='demand-defaults terrariumMistMin 9; daily misting cited for crested gecko, anole, White\'s frog, dart frogs; with an auto mister the model uses 7 (terrariumAutoMistMin, est)'),
    dict(id='m-terr-dry', chore='Dry terrarium spot clean', everyDays=1, minutesPerSession='about 0.7 (5 / 7)', weeklyMean=5, status='assumption',
         basis='demand-defaults terrariumDryMin 5; daily spot clean cited (leopard / crested gecko)'),
]

cnt = collections.Counter((i['group'], i['status']) for i in items)
out = dict(
    asOf='2026-10-27', lane='C6',
    note='Research only; not wired into the app. status sourced = a page opened with WebFetch states it (quote in sources); assumption = basis says what it was derived from. Minutes per task are NOT stated by any opened page: every minute figure is an assumption (model_chores reuse demand-defaults.json weekly means and only add the interval).',
    items=[{k: v for k, v in i.items() if k != 'lane'} for i in items], model_chores=model)
out['counts'] = {
    'items_total': len(items),
    'items_sourced': sum(i['status'] == 'sourced' for i in items),
    'items_assumption': sum(i['status'] == 'assumption' for i in items),
    'model_chores_assumption': len(model),
    'by_group': {g: {s: cnt[(g, s)] for s in ('sourced', 'assumption')} for g in sorted({i['group'] for i in items})}}
json.dump(out, open('cadence.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(out['counts'])


def host(s): return urlparse(s['url']).netloc.replace('www.', '')


def row(i):
    srcs = ', '.join(f"[{host(s)}]({s['url']})" for s in i.get('sources', [])[:2]) or '-'
    st = 'sourced' if i['status'] == 'sourced' else 'ASSUMPTION'
    unit = i.get('unit', '')
    v = str(i['value']).replace('|', '/')
    return f"| {i['applies_to']} | {i['field']} | {v}{'' if not unit or unit in v else ' ' + unit} | {st} | {srcs} |"


def table(groups, title):
    s = f"## {title}\n| applies to | field | value | status | source |\n|---|---|---|---|---|\n"
    for i in items:
        if i['group'] in groups: s += row(i) + '\n'
    return s + '\n'


hdr = lambda t: f"# {t}\n\nLane C6, 2026-10-27. Research only, not wired into the app. Each row's quote is in cadence.json (items[].sources[].quote). ASSUMPTION rows give their basis there. No opened page states minutes per task.\n\n"
open('cadence-by-class.md', 'w', encoding='utf8').write(
    hdr('Care cadence and neglect tolerance by animal class and tank type')
    + table(['freshwater'], 'Freshwater (community, betta, goldfish, cichlid, shrimp, crayfish, ADF)')
    + table(['planted'], 'Planted tank') + table(['saltwater'], 'Saltwater / reef')
    + table(['terrarium'], 'Terrarium animals (reptiles, amphibians, land inverts)') + table(['paludarium'], 'Paludarium'))
open('setup-and-automation.md', 'w', encoding='utf8').write(
    hdr('Setup, cycling weeks and automation')
    + table(['setup'], 'One-time setup and cycling') + table(['auto-water-change'], 'Automatic water changer')
    + table(['auto-feeder'], 'Automatic feeder') + table(['ato'], 'Auto top-off (ATO)'))
