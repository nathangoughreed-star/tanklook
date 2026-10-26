// Water-chemistry audit (2026-10-26), not part of the suite. To regenerate research/chem-audit.md:
//   git show origin/main:src/data/waterchem.ts > test/waterchem-main.ts   (the "before" records)
//   copy this file to test/chem-audit.test.ts, run `npx vitest run test/chem-audit.test.ts`, delete both copies.
// Grades every pair of the freshwater species with a pH record under live main's water records and under this branch's, through the
// real engine (whysAnimal both ways, compatibility reasons only).
import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CARE } from '../src/data/care';
import { CHEM } from '../src/data/waterchem';
// @ts-ignore: present only while the audit runs (see above)
import { CHEM as MAIN } from './waterchem-main';
import { getSpecies, type Species } from '../src/data/species';
import { whysAnimal } from '../src/scene/animalfit';

type R = [number, number];
type W = { ph: R; gh?: R; phOk?: R; ghOk?: R };
type G = 'green' | 'amber' | 'red';
const fmt = (r?: R) => r ? r.join('-') : '';

function grade(a: Species, b: Species): { g: G; why: string[] } {
  const w = [...whysAnimal(a, 1e6, 3, [b]), ...whysAnimal(b, 1e6, 3, [a])].filter(x => x.kind === 'compat');
  const red = w.filter(x => !x.concern), amb = w.filter(x => x.concern);
  return red.length ? { g: 'red', why: red.map(x => x.text) } : amb.length ? { g: 'amber', why: amb.map(x => x.text) } : { g: 'green', why: [] };
}
const MALAWI = ['yellowlab', 'peacock', 'demasoni', 'kadango', 'syno', 'labeo', 'auratus', 'livingstonii', 'afra'];

test('chem audit', () => {
  const ids = Object.keys(CHEM).filter(id => CARE[id] && getSpecies(id));
  const sp = ids.map(id => getSpecies(id)!);
  const main = MAIN as Record<string, W>, now = CHEM as Record<string, W>;
  const pairs: [number, number][] = [];
  for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) pairs.push([i, j]);
  const set = (recs: Record<string, W>) => { for (const id of ids) { const c = CARE[id], w = recs[id];
    c.ph = w.ph; c.gh = w.gh; c.phOk = w.phOk; c.ghOk = w.ghOk; } };
  const run = (recs: Record<string, W>) => { set(recs); return pairs.map(([i, j]) => grade(sp[i], sp[j])); };
  const live = run(main), model = run(now);
  const cnt = (gs: { g: G }[]) => (['green', 'amber', 'red'] as G[]).map(g => `${g} ${gs.filter(x => x.g === g).length}`).join(', ');
  const changed = ids.filter(id => JSON.stringify(main[id]) !== JSON.stringify(now[id]));
  const reasons = (why: string[]) => [...new Set(why.map(t => t.replace('compatibility: ', '').replace(/ \([^)]*\)$/, '')))].join('; ');

  const L: string[] = [`# Water-chemistry audit: soft-water fish acceptable ranges`, '',
    `Generated 2026-10-26 (branch S226). ${ids.length} freshwater species with a pH record, ${pairs.length} pairs, graded by the real engine`,
    `(whysAnimal both ways, compatibility reasons only; size and expertise ignored), so a pair already red for predation, aggression or`,
    `temperature stays red whatever its water. Before = live main's src/data/waterchem.ts, after = this branch's.`, '',
    `Model (Nathan 2026-10-26): preferred ranges share at least 0.2 pH and 2 dGH = green; only the documented acceptable ranges do = amber;`,
    `not even those = red. Nothing is widened automatically.`, '',
    `Totals: live main ${cnt(live)}; this step ${cnt(model)}.`, '',
    `## Records changed by this step`, '', `| Species | Preferred pH / GH | Acceptable pH / GH, live main | Acceptable pH / GH, this step |`, `|---|---|---|---|`];
  for (const id of changed) { const m = main[id], c = now[id];
    L.push(`| ${getSpecies(id)!.name} | ${fmt(c.ph)} / ${fmt(c.gh) || 'none'} | ${m.phOk || m.ghOk ? `${fmt(m.phOk ?? m.ph)} / ${fmt(m.ghOk ?? m.gh) || 'none'}` : 'none'} | ${fmt(c.phOk ?? c.ph)} / ${fmt(c.ghOk ?? c.gh) || 'none'} |`); }
  L.push('');

  const moved = pairs.map((p, k) => ({ p, k })).filter(({ k }) => live[k].g !== model[k].g || live[k].why.join() !== model[k].why.join());
  const groups = new Map<string, number>();
  for (const { k } of moved) { const key = `${live[k].g} -> ${model[k].g}`; groups.set(key, (groups.get(key) ?? 0) + 1); }
  L.push(`## 1. Every pair whose grade or reasons change (live main -> this step)`, '',
    `${moved.length} pairs: ${[...groups].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}.`, '');
  const byFish = new Map<string, number>();
  for (const { p: [i, j], k } of moved) if (live[k].g !== model[k].g) for (const s of [sp[i], sp[j]]) if (changed.includes(s.id)) byFish.set(s.name, (byFish.get(s.name) ?? 0) + 1);
  L.push(`Biggest groups (colour changes per changed species): ${[...byFish].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${c}`).join(', ') || 'none'}.`, '',
    `Colour changes:`, '', `| Pair | Live main | This step | This step's reasons |`, `|---|---|---|---|`);
  for (const { p: [i, j], k } of moved) if (live[k].g !== model[k].g)
    L.push(`| ${sp[i].name} + ${sp[j].name} | ${live[k].g} | **${model[k].g}** | ${reasons(model[k].why) || '-'} |`);
  const same = moved.filter(({ k }) => live[k].g === model[k].g);
  L.push('', `Same colour, reasons reworded (the quoted acceptable range changes), ${same.length} pairs: ${same.map(({ p: [i, j], k }) => `${sp[i].name} + ${sp[j].name} (${model[k].g})`).join(', ') || 'none'}.`, '');

  // the guard Nathan asked for: no soft-water fish with a Lake Malawi cichlid leaves red
  const leak = pairs.map((p, k) => ({ p, k })).filter(({ p: [i, j], k }) => live[k].g === 'red' && model[k].g !== 'red'
    && (MALAWI.includes(sp[i].id) || MALAWI.includes(sp[j].id)));
  L.push(`## 2. Lake Malawi check`, '', leak.length ? `${leak.length} pairs with a Malawi species leave red:` : `No pair with a Lake Malawi species (${MALAWI.length} species) leaves red.`, '');
  for (const { p: [i, j], k } of leak) L.push(`- ${sp[i].name} + ${sp[j].name}: ${model[k].g}`);
  if (leak.length) L.push('');

  const snails = sp.filter(s => s.kind === 'snail'), soft = sp.filter(s => s.kind !== 'snail' && (now[s.id].ph[1] <= 7 || (now[s.id].gh?.[1] ?? 99) <= 8));
  L.push(`## 3. Shell-builders with soft-water fish`, '',
    `Soft-water fish here = preferred pH tops out at 7.0 or lower, or preferred GH at 8 or lower. R red, a amber, G green; "was -> now" where it moves.`, '',
    `| Fish (preferred pH / GH; acceptable) | ${snails.map(s => s.name).join(' | ')} |`, `|---|${snails.map(() => '---|').join('')}`);
  for (const f of soft) { const c = now[f.id];
    L.push(`| ${f.name} (${fmt(c.ph)} / ${fmt(c.gh) || 'none'}${c.phOk || c.ghOk ? `; ${fmt(c.phOk ?? c.ph)} / ${fmt(c.ghOk ?? c.gh) || 'none'}` : ''}) | ${snails.map(s => {
      const k = pairs.findIndex(([x, y]) => (sp[x] === f && sp[y] === s) || (sp[x] === s && sp[y] === f)); const g = model[k].g, was = live[k].g;
      return g === was ? g : `${was} -> **${g}**`; }).join(' | ')} |`); }
  L.push('');

  L.push(`## 4. Full matrix under this step`, '', `G green, a amber, R red; rows and columns in the same order.`, '', '```');
  L.push('              ' + ids.map((_, c) => String(c).padStart(2)).join(''));
  const at = (i: number, j: number) => model[pairs.findIndex(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j))].g;
  sp.forEach((_, i) => L.push(`${String(i).padStart(2)} ${ids[i].slice(0, 10).padEnd(11)}` + sp.map((__, j) => i === j ? ' .' : ` ${at(i, j) === 'green' ? 'G' : at(i, j) === 'amber' ? 'a' : 'R'}`).join('')));
  L.push('```', '');
  writeFileSync('research/chem-audit.md', L.join('\n'));
});
