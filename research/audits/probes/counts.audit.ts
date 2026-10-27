// S242 probe (2026-10-26), not part of the suite. To re-run: copy to test/zz-s242.scratch.test.ts, fix the ../ import depth (two more levels become one), run `npx vitest run --reporter=verbose --silent=false` on it (counts.audit.ts needs OUTF=<json path>), delete the copy.
import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { SPECIES } from '../../../src/data/species';
import { CARE } from '../../../src/data/care';
import { WATER } from '../../../src/data/climatedata';
import { minDataOf } from '../../../src/scene/tankMin';
import bm from '../../../src/data/bodymass.json';
import { SPACE_FACTOR } from '../../../src/data/spacefactor';
import { HERP } from '../../../src/data/herpstock';
import { whysAnimal } from '../../../src/scene/animalfit';
import { walk } from '../../../scripts/source-audit';

test('s242', () => {
  const vals = walk();
  const st = new Map<string, string>();
  for (const v of vals) st.set(v.target + ':' + v.path, v.status ?? 'UNSOURCED');
  const S = (t: string, p: string) => st.get(t + ':' + p) ?? 'absent';
  const out: any = { n: SPECIES.length, cats: {} as any, fields: {} as any, lists: {} as any };
  for (const s of SPECIES) out.cats[s.cat] = (out.cats[s.cat] ?? 0) + 1;
  const aq = SPECIES.filter(s => s.habitat !== 'land');
  const fw = aq.filter(s => !s.salt);
  out.aquatic = aq.length; out.fw = fw.length; out.salt = aq.length - fw.length;
  out.land = SPECIES.length - aq.length;
  const fields: Record<string, (s: any) => string> = {
    'temp (aquatic)': s => (CARE[s.id]?.temp ? S('CARE', `${s.id}.temp.0`) : 'MISSING'),
    'tol (aquatic)': s => (CARE[s.id]?.tol ? S('CARE', `${s.id}.tol.0`) : 'MISSING'),
    'pH (aquatic)': s => (CARE[s.id]?.ph ? S('CARE', `${s.id}.ph.0`) : 'MISSING'),
    'phOk (fw)': s => (CARE[s.id]?.phOk ? 'has' : 'MISSING'),
    'GH (fw)': s => (CARE[s.id]?.gh ? S('CARE', `${s.id}.gh.0`) : 'MISSING'),
    'ghOk (fw)': s => (CARE[s.id]?.ghOk ? 'has' : 'MISSING'),
    'group min (aquatic)': s => (CARE[s.id]?.bands || CARE[s.id]?.group ? S('CARE', CARE[s.id]?.bands ? `${s.id}.bands.ok` : `${s.id}.group`) : 'MISSING'),
    'flow (aquatic)': s => (CARE[s.id]?.flow ? S('CARE', `${s.id}.flow`) : 'MISSING'),
    'zone (aquatic)': s => (CARE[s.id]?.zone ? 'has' : 'MISSING'),
    'minL': s => (CARE[s.id] ? S('CARE', `${s.id}.minL`) : 'NO CARE ROW'),
    'temper': s => (CARE[s.id] ? S('CARE', `${s.id}.temper`) : 'NO CARE ROW'),
    'tankmin red line (aquatic)': s => (minDataOf(s.id)?.red ? S('TANKMIN', `${s.id}.red.L`) : 'MISSING'),
    'bodymass a (aquatic)': s => ((bm.species as any)[s.id] ? S('BODYMASS', `${s.id}.a`) : 'MISSING'),
    'own space factor (aquatic)': s => ((SPACE_FACTOR as any)[s.id] ? 'has' : 'MISSING (class fallback)'),
  };
  const scope: Record<string, (s: any) => boolean> = {
    'temp (aquatic)': s => s.habitat !== 'land', 'tol (aquatic)': s => s.habitat !== 'land', 'pH (aquatic)': s => s.habitat !== 'land',
    'phOk (fw)': s => s.habitat !== 'land' && !s.salt, 'GH (fw)': s => s.habitat !== 'land' && !s.salt, 'ghOk (fw)': s => s.habitat !== 'land' && !s.salt,
    'group min (aquatic)': s => s.habitat !== 'land', 'flow (aquatic)': s => s.habitat !== 'land', 'zone (aquatic)': s => s.habitat !== 'land',
    'minL': () => true, 'temper': () => true, 'tankmin red line (aquatic)': s => s.habitat !== 'land', 'bodymass a (aquatic)': s => s.habitat !== 'land', 'own space factor (aquatic)': s => s.habitat !== 'land',
  };
  for (const [k, f] of Object.entries(fields)) {
    const c: Record<string, number> = {}; const miss: string[] = [];
    for (const s of SPECIES.filter(scope[k])) { const r = f(s); c[r] = (c[r] ?? 0) + 1; if (r.startsWith('MISSING') || r === 'NO CARE ROW') miss.push(s.id); }
    out.fields[k] = { scope: SPECIES.filter(scope[k]).length, ...c, missingIds: miss.length > 0 && miss.length <= 60 ? miss : miss.length + ' ids' };
  }
  out.lists.waterEst = Object.entries(WATER).filter(([, w]) => w.est).map(([id]) => id);
  out.lists.noCareRow = SPECIES.filter(s => !CARE[s.id]).map(s => s.id);
  out.lists.herpRules = Object.keys(HERP).length;
  // marine species chem
  out.lists.marineNoTemp = aq.filter(s => s.salt && !CARE[s.id]?.temp).map(s => s.id);
  // pair analysis (freshwater aquatic, ordered pairs -> unordered)
  let pairs = 0, phSkip = 0, ghSkip = 0, phBoth = 0, ghBoth = 0, noTempPair = 0, anyChemSkip = 0;
  const skipSp = new Map<string, number>();
  for (let i = 0; i < fw.length; i++) for (let j = i + 1; j < fw.length; j++) {
    const a = CARE[fw[i].id], b = CARE[fw[j].id]; if (!a || !b) continue; pairs++;
    if (!(a.ph && b.ph)) phSkip++; else phBoth++;
    if (!(a.gh && b.gh)) { ghSkip++; for (const x of [fw[i], fw[j]]) if (!CARE[x.id]?.gh) skipSp.set(x.id, 1); } else ghBoth++;
    if (!(a.temp && b.temp)) noTempPair++;
    if (!(a.ph && b.ph) && !(a.gh && b.gh)) anyChemSkip++;
  }
  out.pairs = { fwPairs: pairs, phChecked: phBoth, phSkipped: phSkip, ghChecked: ghBoth, ghSkippedBecauseOneSideLacksGH: ghSkip, bothChemSkipped: anyChemSkip, tempMissingEitherSide: noTempPair };
  // 'no reasons' pairs: how many pairs show NO compat reason (green) among fw water pairs, and of those how many rest on a missing GH
  let green = 0, greenGhMissing = 0, greenPhGhDefault = 0;
  for (let i = 0; i < fw.length; i++) for (let j = i + 1; j < fw.length; j++) {
    const r = [...whysAnimal(fw[i], Infinity, 3, [fw[j]]), ...whysAnimal(fw[j], Infinity, 3, [fw[i]])].filter(w => !(w as any).temp || true);
    if (r.length === 0) { green++; if (!(CARE[fw[i].id].gh && CARE[fw[j].id].gh)) greenGhMissing++; }
  }
  out.pairs.noReasonAtAll = green; out.pairs.noReasonButGhNotCompared = greenGhMissing;
  writeFileSync(process.env.OUTF!, JSON.stringify(out, null, 1));
});
