// Moved numbers for lane GA1 (Available vs Required, flexible limits): the suggestions for briefs that carry an owned tank / owned gear / a flexible limit.
//   node scripts/moved-numbers-ga1.mjs out.json     run from the repo root, once on main and once on the branch, then
//   node scripts/moved-numbers-ga1.mjs --diff main.json branch.json out.txt
// Briefs are built through the GS2 setters (scene/project.ts), so the same script runs on both trees.
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv.slice(2);
if (arg[0] === '--diff') {
  const [a, b] = [arg[1], arg[2]].map(p => JSON.parse(readFileSync(p, 'utf8')));
  const lines = []; let moved = 0;
  for (const k of Object.keys(a)) {
    const same = JSON.stringify(a[k]) === JSON.stringify(b[k]);
    if (!same) moved++;
    lines.push(`${same ? 'same ' : 'MOVED'} | ${k}\n    before: ${a[k].join('\n            ')}\n    after:  ${b[k].join('\n            ')}`);
  }
  writeFileSync(arg[3], `GA1 moved numbers: ${moved} of ${Object.keys(a).length} briefs changed\n\n${lines.join('\n')}\n`);
  console.log(`changed briefs: ${moved} of ${Object.keys(a).length}`);
  process.exit(0);
}
const NOW = Date.parse('2026-11-02T12:00:00Z');
const { createServer } = await import('vite');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = p => server.ssrLoadModule(p);
try {
  const { defaultProfile } = await load('/src/demand/types.ts');
  const { emptyBrief, setItem } = await load('/src/scene/brief.ts');
  const { suggestFromBrief } = await load('/src/demand/suggest.ts');
  const { setEquipment, setConstraint } = await load('/src/scene/project.ts');
  const { TANK_MODELS } = await load('/src/data/tanks.ts');
  const P = defaultProfile(), tank = gal => TANK_MODELS.find(t => Math.round(t.ratedGal) === gal).id;
  const gold = b => setItem(b, 'animals.stock', [{ species: 'goldfish', count: 2 }], 'locked');
  const tk = (b, gal, use) => setEquipment(b, 'tank', { use, model: tank(gal) });
  const cases = {
    'no equipment, no limits': emptyBrief(),
    'budget $400 hard': setConstraint(emptyBrief(), 'startup', 400, 'hard'),
    'budget $400 flexible': setConstraint(emptyBrief(), 'startup', 400, 'flexible'),
    'budget $200 hard, 2 goldfish locked': setConstraint(gold(emptyBrief()), 'startup', 200, 'hard'),
    'budget $200 flexible, 2 goldfish locked': setConstraint(gold(emptyBrief()), 'startup', 200, 'flexible'),
    'space 24x12 in flexible, 2 goldfish': setConstraint(gold(emptyBrief()), 'space', { w: 24, d: 12 }, 'flexible'),
    'owned 20 gal Required, budget $600': tk(setConstraint(emptyBrief(), 'startup', 600, 'hard'), 20, 'required'),
    'owned 20 gal Available, budget $600': tk(setConstraint(emptyBrief(), 'startup', 600, 'hard'), 20, 'available'),
    'owned 10 gal Required, 4 goldfish': tk(setItem(emptyBrief(), 'animals.stock', [{ species: 'goldfish', count: 4 }], 'locked'), 10, 'required'),
    'owned 10 gal Available, 4 goldfish': tk(setItem(emptyBrief(), 'animals.stock', [{ species: 'goldfish', count: 4 }], 'locked'), 10, 'available'),
    'owned 40 gal Available, no limits': tk(emptyBrief(), 40, 'available'),
    'owned filter + heater (Available), betta': setEquipment(setEquipment(setItem(emptyBrief(), 'animals.stock', [{ species: 'betta', count: 1 }], 'locked'), 'filter', { pick: 'care' }), 'heater', { pick: 'care' }),
    'owned filter + heater (Required), betta': setEquipment(setEquipment(setItem(emptyBrief(), 'animals.stock', [{ species: 'betta', count: 1 }], 'locked'), 'filter', { pick: 'care', use: 'required' }), 'heater', { pick: 'care', use: 'required' }),
  };
  const out = {};
  for (const [k, b] of Object.entries(cases)) {
    const r = suggestFromBrief(b, P, 'in', NOW);
    out[k] = r.proposals.length ? r.proposals.map((p, i) => `#${i + 1} ${p.archetype.id} | ${Math.round(p.build.tank.ratedGal)} gal | $${p.totals.startupUsd} | ${p.strategyLabel}${p.tankSource ? ' | ' + p.tankSource : ''}${p.warnings?.length ? ' | ' + p.warnings.join(' ') : ''}`) : [`(none) ${r.infeasible ? r.infeasible.limitingFactor + ': ' + r.infeasible.alternatives.map(a => a.kind).join(',') : r.message ?? ''}`];
  }
  writeFileSync(arg[0], JSON.stringify(out, null, 1));
} finally { await server.close(); }
