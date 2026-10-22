// Benchmark baseline (research/rules-spec.md section 5): what TODAY's path 1 engine says about each case. Not a regression
// test: it records behaviour so the expected verdicts can be reviewed independently and compared before / after the rules
// work. Run: GEN_BENCH=1 npx vitest run test/benchmarkBaseline.test.ts  -> research/benchmark-baseline.md
import { describe, it } from 'vitest';
import { planFor, notesOf, groupLineIn, startPick, type Pk } from '../src/ui/stockPlanLogic';
import { tankOptions, tankLabel, type TankFit } from '../src/scene/tankfit';
import { buildsFor } from '../src/scene/builds';
import { getSpecies } from '../src/data/species';
import { whyAnimal } from '../src/scene/animalfit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (globalThis as any).process?.env.GEN_BENCH ? it : it.skip;
const pk = (id: string, n: number, f?: number): Pk => ({ ...startPick(id), n, ...(f !== undefined ? { f } : {}) });
const animalsOf = (picks: Pk[]) => picks.map(p => ({ species: p.id, n: p.n + (p.f ?? 0) }));
/** the catalogue option whose label (US) contains `want`, else the nearest by gallons */
function tankNear(picks: Pk[], want: string, gal: number): TankFit {
  const opts = tankOptions(animalsOf(picks));
  return opts.find(o => tankLabel(o.tank, 'in').includes(want)) ?? opts.reduce((a, b) => Math.abs(b.gallons - gal) < Math.abs(a.gallons - gal) ? b : a);
}
const r = (x: number) => Math.round(x);

function judge(name: string, picks: Pk[], want: string, gal: number): string[] {
  const t = tankNear(picks, want, gal), plan = planFor(picks, t.tank.id), f = plan.fit!;
  const lines = [`**${name}** in ${tankLabel(t.tank, 'in')}: space ${r(f.spacePct)} %, filtration ${r(f.filtrationPct)} %, size vs minimum ${r(f.minPct)} %${f.cramped ? ', cramped' : ''}; fails: ${f.fails.join(', ') || 'none'}; problem line: ${plan.problem ?? '(none)'}`];
  for (const p of picks) {
    const n = notesOf(p, 'in');
    lines.push(`  - ${p.id} x${p.n}${p.f !== undefined ? ` + ${p.f} f` : ''}: band ${n.band}, "${n.line}"${n.ratio ? `, ratio "${n.ratio}"` : ''}${n.pairing ? `, pairing (${n.pairing.status}) "${n.pairing.line}"` : ''}${n.habitat.length ? `, habitat: ${n.habitat.join(' / ')}` : ''}`);
    { const g = groupLineIn(n, plan); if (g.held) lines.push(`    beside this tank (held, the tank verdict comes first): "${g.text}"`); }
    for (const x of n.needs) lines.push(`    care need (${x.severity}, shown at any count): ${x.text}`);
    const others = picks.filter(q => q !== p).map(q => getSpecies(q.id)!).filter(Boolean);
    const w = whyAnimal(getSpecies(p.id)!, plan.litres, 1, others);
    if (w) lines.push(`    compat/size note (beginner): ${w.kind}: ${w.text}`);
  }
  const bs = buildsFor(animalsOf(picks), t.tank);
  if (bs.length) lines.push(`  - builds: ${bs.map(b => `${b.id} $${r((b as { setupUsd?: number }).setupUsd ?? 0)}`).join(' / ')}`);
  return lines;
}

describe('benchmark baseline', () => {
  run('records what the engine says today', async () => {
    // @ts-expect-error node only (no node types in this project)
    const { execSync } = await import('node:child_process');
    const sh = (c: string) => String(execSync(c)).trim();
    const commit = sh('git rev-parse --short HEAD'), build = sh('git rev-list --count HEAD'), dirty = sh('git status --porcelain --untracked-files=no');
    const out: string[] = ['# Benchmark baseline: what path 1 says TODAY (generated, do not edit)', '',
      `Tested commit ${commit} (build ${build})${dirty ? ', WITH UNCOMMITTED CHANGES: ' + dirty.split(/\r?\n/).join('; ') : ', clean checkout'}.`, '',
      `Generated ${new Date().toISOString().slice(0, 10)} by test/benchmarkBaseline.test.ts. Expected verdicts live in research/rules-spec.md section 5; this is the engine's current answer only.`, ''];
    const sec = (h: string, cases: [string, Pk[], string, number][]) => { out.push(`## ${h}`, ''); for (const c of cases) out.push(...judge(...c), ''); };
    sec('Dwarf frogs: group size AND density together (combined)', [1, 3, 5, 9].map(n => [`adf x${n}`, [pk('adf', n)], '10 gal', 10] as [string, Pk[], string, number]));
    sec('Dwarf frogs: same group, different tanks (density only)', [['adf x5', [pk('adf', 5)], '5 gal', 5], ['adf x5', [pk('adf', 5)], '20 gal long', 20], ['adf x5', [pk('adf', 5)], '29 gal', 29], ['adf x5', [pk('adf', 5)], '75 gal', 75]]);
    sec('Neons: group size in a roomy tank (group only)', [3, 8, 15].map(n => [`neon x${n}`, [pk('neon', n)], '40 gal', 40] as [string, Pk[], string, number]));
    sec('Low waste, poor dimensions', [['oscar x1 (small fish load is not the issue: length)', [pk('oscar', 1)], '40 gal breeder', 40], ['oscar x1', [pk('oscar', 1)], '55 gal', 55]]);
    sec('Mandarin with space (feeding is the issue)', [['mandarin x1', [pk('mandarin', 1)], '75 gal', 75]]);
    sec('Two unpaired social animals', [['bolivianram x2 (sex unknown)', [pk('bolivianram', 2)], '29 gal', 29]]);
    sec('Fewer animals in an unsuitable tank (before / after)', [['neon x20 + bronzecory x8 + bolivianram x4', [pk('neon', 20), pk('bronzecory', 8), pk('bolivianram', 4)], '10 gal', 10], ['neon x10 + bronzecory x6 (fewer)', [pk('neon', 10), pk('bronzecory', 6)], '10 gal', 10]]);
    // @ts-expect-error node only (no node types in this project)
    const { writeFileSync } = await import('node:fs');
    writeFileSync('research/benchmark-baseline.md', out.join('\n') + '\n');
  });
});
