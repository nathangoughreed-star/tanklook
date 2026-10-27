// S242 probe (2026-10-26), not part of the suite. To re-run: copy to test/zz-s242.scratch.test.ts, fix the ../ import depth (two more levels become one), run `npx vitest run --reporter=verbose --silent=false` on it (counts.audit.ts needs OUTF=<json path>), delete the copy.
import { test } from 'vitest';
import { getSpecies, SPECIES } from '../../../src/data/species';
import { whysAnimal } from '../../../src/scene/animalfit';
import { tankFor, fitIn, tankOptions } from '../../../src/scene/tankfit';
import { notesOf } from '../../../src/ui/stockPlanLogic';
import { CARE } from '../../../src/data/care';
const sp = (id: string) => getSpecies(id)!;
const show = (a: string, b: string) => { const r = [...whysAnimal(sp(a), Infinity, 3, [sp(b)]), ...whysAnimal(sp(b), Infinity, 3, [sp(a)])].map(w => (w.concern ? '~' : '') + w.text); console.log('PAIR', a, '+', b, '=>', r.length ? r.join(' | ') : '(no reasons: reads compatible)'); };
test('c', () => {
  for (const [a, b] of [['guppy','ocellaris'],['molly','ocellaris'],['leopardgecko','crestedgecko'],['crestedgecko','ballpython'],['leopardgecko','ballpython'],['dartfrog','crestedgecko'],['dartfrog','leopardgecko'],['betta','cherryshrimp'],['kribensis','cherryshrimp'],['goldfish','cherryshrimp'],['bristlenose','cherryshrimp'],['discus','guppy'],['oscar','guppy'],['gourami','cherryshrimp'],['danio','yellowlab'],['goldfish','betta'],['whitecloud','discus'],['angel','neon'],['dartfrog','treefrog'],['axolotl','goldfish']] as const) show(a, b);
  for (const id of ['redclaw','rswcrayfish','cherryshrimp','mystery','firetoad']) { const t = tankFor([{ species: id, n: 1 }]); console.log('TANKFOR', id, 'minL', CARE[id].minL, '->', t ? t.tank.name + ' fails=' + t.fails.join(',') : 'none'); }
  // species with no group data
  console.log('NOGROUP', SPECIES.filter(s => !CARE[s.id]?.bands && !CARE[s.id]?.group).map(s => s.id).join(','));
  console.log('NOBANDS', SPECIES.filter(s => !CARE[s.id]?.bands).length, 'of', SPECIES.length, ' GROUPSRC bands-less aquatic:', SPECIES.filter(s => s.habitat !== 'land' && !CARE[s.id]?.bands).map(s => s.id).join(','));
});
