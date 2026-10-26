// S242 probe (2026-10-26), not part of the suite. To re-run: copy to test/zz-s242.scratch.test.ts, fix the ../ import depth (two more levels become one), run `npx vitest run --reporter=verbose --silent=false` on it (counts.audit.ts needs OUTF=<json path>), delete the copy.
import { test } from 'vitest';
import { SPECIES } from '../../../src/data/species';
import { CARE } from '../../../src/data/care';
test('d', () => {
  const fw = SPECIES.filter(s => s.habitat !== 'land' && !s.salt);
  const sh = (a: number[], b: number[]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  let tn = 0, tDisjointTolOverlap = 0, tDisjointTolDisjoint = 0, tSingle = 0, phBlock = 0, phComp = 0, phPref = 0, ghBlock = 0, ghComp = 0, ghBoth = 0, phTight = 0, tolEst = 0;
  const wide: string[] = [];
  for (let i = 0; i < fw.length; i++) for (let j = i + 1; j < fw.length; j++) {
    const a = CARE[fw[i].id], b = CARE[fw[j].id];
    const o = sh(a.temp!, b.temp!); tn++;
    if (o < 0) { const ta = a.tol ?? [a.temp![0]-2,a.temp![1]+2], tb = b.tol ?? [b.temp![0]-2,b.temp![1]+2]; if (sh(ta, tb) >= 0) tDisjointTolOverlap++; else tDisjointTolDisjoint++; }
    const pa = a.phOk ?? a.ph!, pb = b.phOk ?? b.ph!;
    if (sh(pa, pb) < 0.2) phBlock++; else if (sh(a.ph!, b.ph!) < 0.2) phComp++; else phPref++;
    if (a.gh && b.gh) { ghBoth++; const ga = a.ghOk ?? a.gh, gb = b.ghOk ?? b.gh; if (sh(ga, gb) < 2) ghBlock++; else if (sh(a.gh, b.gh) < 2) ghComp++; }
  }
  for (const s of fw) { const p = CARE[s.id].ph!; if (p[1]-p[0] >= 2) wide.push(s.id + ':' + p.join('-')); }
  console.log('D temp pairs', tn, 'disjoint-comfort & tol overlaps', tDisjointTolOverlap, 'disjoint both', tDisjointTolDisjoint);
  console.log('D pH block', phBlock, 'compromise', phComp, 'preferred overlap', phPref, '| GH compared', ghBoth, 'block', ghBlock, 'comp', ghComp);
  console.log('D wide-pH species (>=2 units, used as preferred):', wide.length, wide.join(' '));
  console.log('D species with phOk', fw.filter(s => CARE[s.id].phOk).map(s=>s.id).join(','));
  const marine = SPECIES.filter(s => s.salt && s.habitat !== 'land').length; console.log('D marine species', marine);
});
