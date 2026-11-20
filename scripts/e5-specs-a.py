#!/usr/bin/env python3
"""E5 arm (a): landmarks Claude read off gridded side panels (sheet px). Writes research/fish-specs/e5/<fish>-a.json."""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'research', 'fish-specs', 'e5')
O = 'C:/Users/nreed/fish-sheets/e5/'
F = {
 'oscar': dict(sheet='oscar-d1', name='Oscar', sci='Astronotus ocellatus', tl=300, ped=[235, 263],
   dorsal=[[720, 81], [500, 66], [300, 181]], anal=[[490, 421], [380, 416], [260, 336]], eye=[905, 234, 22],
   pec=[[735, 299], [575, 251], [640, 391]], pel=[[715, 411], [565, 541], [610, 431]], pell=130, erase=[540, 405, 730, 545]),
 'clownfish': dict(sheet='clownfish-d2', name='Clownfish', sci='Amphiprion ocellaris', tl=100, ped=[350, 268],
   dorsal=[[930, 100], [720, 85], [610, 92], [480, 150], [385, 188]], anal=[[610, 400], [480, 405], [385, 345]], eye=[1110, 218, 26],
   pec=[[945, 290], [820, 232], [850, 380]], pel=[[880, 415], [790, 510], [910, 440]], pell=100, erase=[755, 410, 915, 520]),
 'pleco': dict(sheet='pleco-d3', name='Pleco', sci='Hypostomus plecostomus', tl=380, ped=[400, 275],
   dorsal=[[1090, 153], [850, 178], [600, 195]], anal=[[660, 330], [560, 327], [500, 327]], eye=[1310, 227, 12],
   pec=[[1215, 335], [1000, 305], [950, 400]], pel=[[895, 340], [730, 395], [780, 335]], pell=170, erase=[710, 335, 905, 410]),
}
for k, f in F.items():
    spec = {'id': 'e5%sa' % k, 'sheet': O + f['sheet'] + '.png', 'species': {'name': f['name'], 'sci': f['sci'], 'tl': f['tl']},
            'landmarks': {'ped': f['ped'], 'dorsalBase': f['dorsal'], 'analBase': f['anal']}, 'eye': f['eye'],
            'pectoral': {'root': f['pec'][0], 'poly': f['pec'], 'spread': 1.0},
            'pelvic': {'root': f['pel'][0], 'len': f['pell'], 'poly': f['pel']}, 'erase': [f['erase']],
            'measured_width': True, 'plan': 'oscar'}
    json.dump(spec, open(os.path.join(R, k + '-a.json'), 'w'), indent=1)
