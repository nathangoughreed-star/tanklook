// Water-chemistry audit (2026-10-26), not part of the suite: copy into test/ as a .test.ts and run with vitest to regenerate
// research/chem-audit.md. Grades every pair of the freshwater species with a pH record before and after a data step, through the
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
  // before = live main (build 1235): the mystery snail held to pH 6.5-8.0, GH 6-18 with no acceptable range
  const M = CARE.mystery, now = { ph: M.ph!, gh: M.gh!, phOk: M.phOk, ghOk: M.ghOk };
  const run = (ph: R, gh: R, phOk?: R, ghOk?: R) => {
    M.ph = ph; M.gh = gh; M.phOk = phOk; M.ghOk = ghOk;
    return pairs.map(([i, j]) => grade(sp[i], sp[j]));
  };
  const live = run([6.5, 8.0], [6, 18]);
  const model = run(now.ph, now.gh, now.phOk, now.ghOk);
  const cnt = (gs: { g: G }[]) => (['green', 'amber', 'red'] as G[]).map(g => `${g} ${gs.filter(x => x.g === g).length}`).join(', ');

  const L: string[] = [`# Water-chemistry audit: snail minimums`, '',
    `Generated 2026-10-26 (branch s225). ${ids.length} freshwater species with a pH record, ${pairs.length} pairs, graded by the real engine`,
    `(whysAnimal both ways, compatibility reasons only; size and expertise ignored), so a pair already red for predation, aggression or`,
    `temperature stays red whatever its water.`, '',
    `Model (Nathan 2026-10-26): preferred ranges share enough = green; only the documented acceptable ranges do = amber; not even those = red.`,
    `No range is widened automatically. Acceptable ranges so far: kuhli loach (pH 5.5-7.5, GH 1-10) and mystery snail (pH 6.5-8.0, GH 6-18).`,
    `This step raises the mystery snail's preferred floor to Aquarium Co-Op's "pH of at least 7.2, and GH above 150 ppm (or 8 degrees)".`, '',
    `| Mystery snail record | pH | GH | Totals |`, `|---|---|---|---|`,
    `| Live main (build 1235) | 6.5-8.0 | 6-18 | ${cnt(live)} |`,
    `| This step | preferred ${now.ph.join('-')}, acceptable ${now.phOk!.join('-')} | preferred ${now.gh.join('-')}, acceptable ${now.ghOk!.join('-')} | ${cnt(model)} |`, ''];

  L.push(`## 1. Every pair whose grade changes (live main -> this step)`, '', `| Pair | Live main | This step | This step's reasons |`, `|---|---|---|---|`);
  pairs.forEach(([i, j], k) => { if (live[k].g !== model[k].g || live[k].why.join() !== model[k].why.join())
    L.push(`| ${sp[i].name} + ${sp[j].name} | ${live[k].g} | **${model[k].g}** | ${[...new Set(model[k].why.map(t => t.replace('compatibility: ', '').replace(/ \([^)]*\)$/, '')))].join('; ')} |`); });
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

  // why only mystery-snail pairs move: every shell-builder against every soft-water fish (preferred pH tops out at 7.0 or lower, or
  // preferred GH at 8 or lower), graded under this step
  const snails = sp.filter(s => s.kind === 'snail'), soft = sp.filter(s => s.kind !== 'snail' && (CARE[s.id].ph![1] <= 7 || (CARE[s.id].gh?.[1] ?? 99) <= 8));
  L.push(`## 3. Shell-builders with soft-water fish: why only mystery-snail pairs move`, '',
    `Soft-water fish here = preferred pH tops out at 7.0 or lower, or preferred GH at 8 or lower. Grades under this step; R red, a amber, G green.`, '',
    `| Fish (preferred pH / GH) | ${snails.map(s => s.name).join(' | ')} |`, `|---|${snails.map(() => '---|').join('')}`);
  for (const f of soft) L.push(`| ${f.name} (${CARE[f.id].ph!.join('-')} / ${CARE[f.id].gh?.join('-') ?? 'none'}) | ${snails.map(s => { const k = pairs.findIndex(([x, y]) => (sp[x] === f && sp[y] === s) || (sp[x] === s && sp[y] === f)); const g = model[k].g, was = live[k].g; return g === was ? g : `${was} -> **${g}**`; }).join(' | ')} |`);
  L.push('', `Nerite (pH 7.0-8.5) and ramshorn (pH 7.0-8.0) were already red with these fish: their preferred pH starts at 7.0, where the fish's ends, and`,
    `neither has an acceptable range to fall back on, so the pairs were already blocked. Only the mystery snail, recorded down to pH 6.5, was green with them, so raising`,
    `its preferred floor is the only change. The trumpet snail (pH 6.5-8.0, no GH record) stays green: no source minimum yet.`, '',
    `Open question: those reds are likely too harsh (neon + nerite are commonly kept together near pH 7), the kuhli's problem again. The`,
    `fix would be a documented acceptable range for the soft-water fish (farmed stock), as for the kuhli, not a looser snail record.`, '');

  L.push(`## 4. Full matrix under this model`, '', `G green, a amber, R red; rows and columns in the same order.`, '', '```');
  L.push('              ' + ids.map((_, c) => String(c).padStart(2)).join(''));
  const at = (i: number, j: number) => model[pairs.findIndex(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j))].g;
  sp.forEach((_, i) => L.push(`${String(i).padStart(2)} ${ids[i].slice(0, 10).padEnd(11)}` + sp.map((__, j) => i === j ? ' .' : ` ${at(i, j) === 'green' ? 'G' : at(i, j) === 'amber' ? 'a' : 'R'}`).join('')));
  L.push('```', '');
  writeFileSync('research/chem-audit.md', L.join('\n'));
  M.ph = now.ph; M.gh = now.gh; M.phOk = now.phOk; M.ghOk = now.ghOk;
});
