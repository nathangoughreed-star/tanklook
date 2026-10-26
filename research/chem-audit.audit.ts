// Water-chemistry audit (2026-10-26), not part of the suite: copy into test/ and run with vitest to regenerate research/chem-audit.md.
import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CARE } from '../src/data/care';
import { CHEM } from '../src/data/waterchem';
import { getSpecies, type Species } from '../src/data/species';
import { whysAnimal } from '../src/scene/animalfit';

type R = [number, number];
const ov = (a: R, b: R) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const iv = (a: R, b: R) => `${Math.max(a[0], b[0])}-${Math.min(a[1], b[1])}`;
type G = 'green' | 'amber' | 'red';

function grade(a: Species, b: Species): { g: G; why: string[] } {
  const w = [...whysAnimal(a, 1e6, 3, [b]), ...whysAnimal(b, 1e6, 3, [a])].filter(x => x.kind === 'compat');
  const red = w.filter(x => !x.concern), amb = w.filter(x => x.concern);
  return red.length ? { g: 'red', why: red.map(x => x.text) } : amb.length ? { g: 'amber', why: amb.map(x => x.text) } : { g: 'green', why: [] };
}
/** candidate rule: shared pH <= phT or shared GH <= ghT (inclusive), only where the engine already passes both */
function narrow(a: string, b: string, phT: number, ghT: number): string[] {
  const x = CARE[a], y = CARE[b], out: string[] = [];
  if (x.ph && y.ph) { const s = ov(x.ph, y.ph); if (s >= 0.2 && s <= phT + 1e-9) out.push(`pH ${iv(x.ph, y.ph)} (${s.toFixed(1)} wide)`); }
  if (x.gh && y.gh) { const s = ov(x.gh, y.gh); if (s >= 2 && s <= ghT + 1e-9) out.push(`GH ${iv(x.gh, y.gh)} (${s} dGH wide)`); }
  return out;
}

test('chem audit', () => {
  const ids = Object.keys(CHEM).filter(id => CARE[id] && getSpecies(id));
  const sp = ids.map(id => getSpecies(id)!);
  const pairs: [number, number][] = [];
  for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) pairs.push([i, j]);

  const before = pairs.map(([i, j]) => grade(sp[i], sp[j]));
  const oldK = { ph: CARE.kuhli.ph!, gh: CARE.kuhli.gh! };
  CARE.kuhli.ph = [5.5, 7.5]; CARE.kuhli.gh = [1, 10];
  const after = pairs.map(([i, j]) => grade(sp[i], sp[j]));

  const L: string[] = [];
  const cnt = (gs: { g: G }[]) => ({ green: gs.filter(x => x.g === 'green').length, amber: gs.filter(x => x.g === 'amber').length, red: gs.filter(x => x.g === 'red').length });
  L.push(`# Water-chemistry audit: kuhli data fix + narrow-overlap amber rule`, '',
    `Generated 2026-10-26 by a throwaway vitest script against main. ${ids.length} freshwater species with a pH record, ${pairs.length} pairs.`,
    `Grades come from the full engine (whysAnimal both ways, compat reasons only; size and expertise ignored), so pairs already red for predation,`,
    `aggression or temperature stay red and are not counted against the rule.`, '',
    `Kuhli before: pH ${oldK.ph.join('-')}, GH ${oldK.gh.join('-')}. After: pH 5.5-7.5, GH 1-10.`, '');

  L.push(`## 1. Kuhli data fix alone`, '', `Totals before ${JSON.stringify(cnt(before))}, after ${JSON.stringify(cnt(after))}.`, '');
  L.push(`| Pair | Before | After | Before reasons |`, `|---|---|---|---|`);
  pairs.forEach(([i, j], k) => { if (before[k].g !== after[k].g) L.push(`| ${sp[i].name} + ${sp[j].name} | ${before[k].g} | ${after[k].g} | ${before[k].why.join('; ')} |`); });
  L.push('');

  const TH: [number, number][] = [[0.5, 4], [0.5, 3], [0.3, 4], [0.3, 3], [0.5, 2]];
  L.push(`## 2. Narrow-overlap rule, threshold sensitivity (on top of the kuhli fix)`, '',
    `Green pairs that would turn amber. Inclusive thresholds: shared pH <= X or shared GH <= Y.`, '', `| pH <= | GH <= | green -> amber | by pH | by GH | by both |`, `|---|---|---|---|---|---|`);
  for (const [p, g] of TH) {
    let n = 0, byP = 0, byG = 0, both = 0;
    pairs.forEach(([i, j], k) => { if (after[k].g !== 'green') return; const r = narrow(ids[i], ids[j], p, g); if (!r.length) return; n++;
      const hp = r.some(s => s.startsWith('pH')), hg = r.some(s => s.startsWith('GH')); if (hp && hg) both++; else if (hp) byP++; else byG++; });
    L.push(`| ${p} | ${g} | ${n} | ${byP} | ${byG} | ${both} |`);
  }
  L.push('');

  const [P, Gt] = TH[0];
  L.push(`## 3. Every green -> amber change at pH <= ${P}, GH <= ${Gt} (the thresholds that catch kuhli + nerite)`, '',
    `| Pair | Limiting parameter (shared interval) |`, `|---|---|`);
  const rows: string[] = [];
  pairs.forEach(([i, j], k) => { if (after[k].g !== 'green') return; const r = narrow(ids[i], ids[j], P, Gt); if (r.length) rows.push(`| ${sp[i].name} + ${sp[j].name} | ${r.join('; ')} |`); });
  L.push(...rows.sort(), '');
  L.push(`Already-amber pairs that would gain a water advisory too: ${pairs.filter(([i, j], k) => after[k].g === 'amber' && narrow(ids[i], ids[j], P, Gt).length).length}.`, '');

  L.push(`## 4. Full matrix after (kuhli fix + rule at pH <= ${P}, GH <= ${Gt})`, '', `G green, a amber, R red. Rows and columns in the same order.`, '', '```');
  const ab = ids.map(id => id.slice(0, 5).padEnd(5));
  L.push('             ' + ab.map((_, c) => String(c).padStart(2)).join(''));
  sp.forEach((s, i) => {
    let line = `${String(i).padStart(2)} ${ids[i].slice(0, 9).padEnd(10)}`;
    sp.forEach((_, j) => { if (i === j) { line += ' .'; return; } const k = pairs.findIndex(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j));
      const g = after[k].g === 'green' && narrow(ids[Math.min(i, j)], ids[Math.max(i, j)], P, Gt).length ? 'amber' : after[k].g;
      line += g === 'green' ? ' G' : g === 'amber' ? ' a' : ' R'; });
    L.push(line);
  });
  L.push('```', '');
  const shellRows: string[] = [];
  pairs.forEach(([i, j], k) => { if (after[k].g !== 'green') return;
    for (const [sn, o] of [[i, j], [j, i]]) { const a = sp[sn], b = sp[o], bg = CARE[b.id].gh;
      if (a.kind === 'snail' && CARE[a.id].gh && bg && bg[1] <= 10) shellRows.push(`| ${b.name} + ${a.name} | ${b.name} GH ${bg.join('-')}, snail GH ${CARE[a.id].gh!.join('-')} |`); } });
  L.push(`## 5. Alternative: shell-builder advisory (snail with a hardness record + a species whose preferred GH tops out at 10 or less)`, '',
    `${shellRows.length} green -> amber.`, '', `| Pair | Why |`, `|---|---|`, ...shellRows.sort(), '');
  writeFileSync('research/chem-audit.md', L.join('\n'));
  CARE.kuhli.ph = oldK.ph; CARE.kuhli.gh = oldK.gh;
});
