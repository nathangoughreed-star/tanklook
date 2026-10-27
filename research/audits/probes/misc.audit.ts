// S242 probe (2026-10-26), not part of the suite. To re-run: copy to test/zz-s242.scratch.test.ts, fix the ../ import depth (two more levels become one), run `npx vitest run --reporter=verbose --silent=false` on it (counts.audit.ts needs OUTF=<json path>), delete the copy.
import { test } from 'vitest';
import { SPECIES } from '../../../src/data/species';
import { CARE } from '../../../src/data/care';
import { AIR } from '../../../src/data/climate';
import { ROOM_C } from '../../../src/scene/tech';
test('e', () => {
  const fw = SPECIES.filter(s => s.habitat !== 'land' && !s.salt), sh = (a: number[], b: number[]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  let thin = 0, thinPh = 0;
  for (let i = 0; i < fw.length; i++) for (let j = i + 1; j < fw.length; j++) { const o = sh(CARE[fw[i].id].ph!, CARE[fw[j].id].ph!); const pa = CARE[fw[i].id].phOk ?? CARE[fw[i].id].ph!, pb = CARE[fw[j].id].phOk ?? CARE[fw[j].id].ph!; if (sh(pa,pb) >= 0.2 && o >= 0.2 && o < 0.6) thinPh++; thin++; }
  console.log('E thin pH overlap (0.2..0.6 shared, reads green)', thinPh, 'of', thin);
  console.log('E ROOM_C', ROOM_C, 'aquatic species with comfortable range containing the default room:', SPECIES.filter(s => s.habitat !== 'land' && CARE[s.id].temp && CARE[s.id].temp![0] <= ROOM_C && CARE[s.id].temp![1] >= ROOM_C).map(s => s.id).join(','));
  const hi = SPECIES.filter(s => CARE[s.id]?.flow === 'high').map(s => s.id), lo = SPECIES.filter(s => s.habitat !== 'land' && CARE[s.id]?.flow === 'low').length;
  console.log('E flow high', hi.join(','), 'low count', lo);
  console.log('E bottom zone aquatic', SPECIES.filter(s => s.habitat !== 'land' && (CARE[s.id] as any).zone === 'bottom').length);
  console.log('E AIR crested', JSON.stringify(AIR.crestedgecko), 'leopard', JSON.stringify(AIR.leopardgecko));
  console.log('E tolEst species', SPECIES.filter(s => CARE[s.id]?.tolEst).map(s => s.id).join(','));
});
