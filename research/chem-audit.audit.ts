// Water-chemistry audit (2026-10-26), not part of the suite: copy into test/ as a .test.ts and run with vitest to regenerate
// research/chem-audit.md. Grades every pair of the freshwater species with a pH record under three kuhli records, through the
// real engine, and lists the snail pairs that stay green.
import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CARE } from '../src/data/care';
import { CHEM } from '../src/data/waterchem';
import { getSpecies, type Species } from '../src/data/species';
import { whysAnimal } from '../src/scene/animalfit';

type R = [number, number];
type G = 'green' | 'amber' | 'red';
const ov = (a: R, b: R) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const iv = (a: R, b: R): string => ov(a, b) < 0 ? 'none' : `${Math.max(a[0], b[0])}-${Math.min(a[1], b[1])}`;

function grade(a: Species, b: Species): { g: G; why: string[] } {
  const w = [...whysAnimal(a, 1e6, 3, [b]), ...whysAnimal(b, 1e6, 3, [a])].filter(x => x.kind === 'compat');
  const red = w.filter(x => !x.concern), amb = w.filter(x => x.concern);
  return red.length ? { g: 'red', why: red.map(x => x.text) } : amb.length ? { g: 'amber', why: amb.map(x => x.text) } : { g: 'green', why: [] };
}
/** snail needs Nathan quoted (Aquarium Co-Op, 2026-10-26): mystery pH >= 7.2 and GH >= 8; nerite pH above 7. Not yet in the data. */
const SNAIL_NEED: Record<string, { ph?: number; gh?: number }> = { mystery: { ph: 7.2, gh: 8 }, nerite: { ph: 7.0 } };

test('chem audit', () => {
  const ids = Object.keys(CHEM).filter(id => CARE[id] && getSpecies(id));
  const sp = ids.map(id => getSpecies(id)!);
  const pairs: [number, number][] = [];
  for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) pairs.push([i, j]);
  const K = CARE.kuhli, now = { ph: K.ph!, gh: K.gh!, phOk: K.phOk, ghOk: K.ghOk };
  const run = (ph: R, gh: R, phOk?: R, ghOk?: R) => {
    K.ph = ph; K.gh = gh; K.phOk = phOk; K.ghOk = ghOk;
    return pairs.map(([i, j]) => grade(sp[i], sp[j]));
  };
  const orig = run([5.5, 6.5], [1, 6]);
  const live = run([5.5, 7.5], [1, 10]);
  const model = run(now.ph, now.gh, now.phOk, now.ghOk);
  const cnt = (gs: { g: G }[]) => (['green', 'amber', 'red'] as G[]).map(g => `${g} ${gs.filter(x => x.g === g).length}`).join(', ');

  const L: string[] = [`# Water-chemistry audit: preferred + acceptable ranges`, '',
    `Generated 2026-10-26 (branch s225). ${ids.length} freshwater species with a pH record, ${pairs.length} pairs, graded by the real engine`,
    `(whysAnimal both ways, compatibility reasons only; size and expertise ignored), so a pair already red for predation, aggression or`,
    `temperature stays red whatever its water.`, '',
    `Model (Nathan 2026-10-26): preferred ranges share enough = green; only the documented acceptable ranges do = amber; not even those = red.`,
    `No range is widened automatically: a species without an acceptable range is held to its preferred one. Only the kuhli has one so far.`, '',
    `| Kuhli record | pH | GH | Totals |`, `|---|---|---|---|`,
    `| Original (before d7b6c89) | 5.5-6.5 | 1-6 | ${cnt(orig)} |`,
    `| Live main (d7b6c89) | 5.5-7.5 | 1-10 | ${cnt(live)} |`,
    `| This model | preferred ${now.ph.join('-')}, acceptable ${now.phOk!.join('-')} | preferred ${now.gh.join('-')}, acceptable ${now.ghOk!.join('-')} | ${cnt(model)} |`, ''];

  L.push(`## 1. Every pair whose grade changes (original -> live main -> this model)`, '', `| Pair | Original | Live main | This model | This model's reasons |`, `|---|---|---|---|---|`);
  pairs.forEach(([i, j], k) => { if (orig[k].g !== model[k].g || live[k].g !== model[k].g)
    L.push(`| ${sp[i].name} + ${sp[j].name} | ${orig[k].g} | ${live[k].g} | **${model[k].g}** | ${model[k].why.map(t => t.replace('compatibility: ', '')).join('; ')} |`); });
  L.push('');

  L.push(`## 2. Snail pairs still green under this model`, '',
    `Shared preferred pH and GH for each green pair with a snail. "Gap" = the shared preferred range cannot meet the snail need Nathan quoted`,
    `(Aquarium Co-Op: mystery pH 7.2 or higher, GH 8 or higher; nerite pH above 7). Ramshorn and trumpet snails have no such figure yet.`, '',
    `| Snail | With | Shared pH | Shared GH | Gap |`, `|---|---|---|---|---|`);
  const rows: string[] = [];
  pairs.forEach(([i, j], k) => { if (model[k].g !== 'green') return;
    for (const [s, o] of [[i, j], [j, i]]) { const a = sp[s], b = sp[o]; if (a.kind !== 'snail' || b.kind === 'snail') continue;
      const ca = CARE[a.id], cb = CARE[b.id], need = SNAIL_NEED[a.id], gap: string[] = [];
      const sp_ = ov(ca.ph!, cb.ph!) >= 0 ? [Math.max(ca.ph![0], cb.ph![0]), Math.min(ca.ph![1], cb.ph![1])] : null;
      const sg = ca.gh && cb.gh ? [Math.max(ca.gh[0], cb.gh[0]), Math.min(ca.gh[1], cb.gh[1])] : null;
      if (need?.ph !== undefined && sp_ && sp_[1] < need.ph + (a.id === 'nerite' ? 0.2 : 0)) gap.push(`pH tops out at ${sp_[1]}`);
      if (need?.gh !== undefined && sg && sg[1] < need.gh) gap.push(`GH tops out at ${sg[1]}`);
      rows.push(`| ${a.name} | ${b.name} | ${iv(ca.ph!, cb.ph!)} | ${ca.gh && cb.gh ? iv(ca.gh, cb.gh) : `no GH record (${!ca.gh ? a.name : b.name})`} | ${gap.join('; ') || '-'} |`); } });
  rows.sort();
  L.push(...rows, '', `${rows.length} green snail pairs, ${rows.filter(r => !r.endsWith('| - |')).length} with a gap.`, '');

  L.push(`## 3. Full matrix under this model`, '', `G green, a amber, R red; rows and columns in the same order.`, '', '```');
  L.push('              ' + ids.map((_, c) => String(c).padStart(2)).join(''));
  const at = (i: number, j: number) => model[pairs.findIndex(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j))].g;
  sp.forEach((_, i) => L.push(`${String(i).padStart(2)} ${ids[i].slice(0, 10).padEnd(11)}` + sp.map((__, j) => i === j ? ' .' : ` ${at(i, j) === 'green' ? 'G' : at(i, j) === 'amber' ? 'a' : 'R'}`).join('')));
  L.push('```', '');
  writeFileSync('research/chem-audit.md', L.join('\n'));
  K.ph = now.ph; K.gh = now.gh; K.phOk = now.phOk; K.ghOk = now.ghOk;
});
