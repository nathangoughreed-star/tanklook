// @ts-nocheck (node globals: a measurement script, not part of the build)
// DQ2 scenario 24: first-pair cold / warm timings and pool quality, printed (not asserted). Run: DQ2_MEASURE=1 npx vitest run test/dq2-measure.test.ts
import { it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { clearPairCache, nextPair, type PoolMetrics } from '../src/scene/pairGen';
import { emptyBrief } from '../src/ui/setupBrief';
import type { Fish, TankSetup } from '../src/scene/types';
const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass'; t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201); return ensureUids(t); }
it.skipIf(!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.DQ2_MEASURE)('first-pair timings', () => {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    clearPairCache(); let m: PoolMetrics | undefined; const t0 = performance.now();
    const r = nextPair({ tank: project(), rev: 1 }, emptyBrief(), { id: `s${i}`, baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'freshwater', comparisons: [], status: 'active' }, () => undefined, { metrics: x => { m = x; } });
    out.push(`${i === 0 ? 'cold' : 'warm'} ${Math.round(performance.now() - t0)} ms ok=${r.ok} ${JSON.stringify({ stop: m?.stop, tried: m?.tried, yield: m?.yield, usable: m?.usable, pooled: m?.pooled, pruned: m?.pruned, fams: m?.families, sizes: m?.sizeClasses, looks: m?.looksTried, dist: m?.pairDistance })}`);
  }
  console.log('DQ2 MEASURE\n' + out.join('\n'));
}, 300000);

// DQ2: a real first pair and three refinement rounds, dumped as JSON (specs + the scenes) for the screenshot script. Run: DQ2_DUMP=<dir> npx vitest run test/dq2-measure.test.ts
import { writeFileSync, mkdirSync } from 'node:fs';
const DUMP = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.DQ2_DUMP;
it.skipIf(!DUMP)('dump a first pair and its refinement', () => {
  clearPairCache(); const t = project(), hist = new Map<string, import('../src/scene/discoveryTypes').CandidateRecord>(), rounds: unknown[] = [];
  const sess = (champ?: string, n = 0) => ({ id: 'dump', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'] as never, freezes: [], direction: 'freshwater' as const, comparisons: Array.from({ length: n }, (_, k) => ({ id: `c${k}`, type: 'champion', aId: champ, bId: 'x', outcome: 'A' } as never)), status: 'active' as const, ...(champ ? { championId: champ } : {}) });
  const row = (c: import('../src/scene/discoveryTypes').CandidateRecord) => ({ id: c.id, title: c.facts.title, gallons: c.facts.gallons, stocking: c.facts.stocking, newSpendUsd: c.facts.newSpendUsd?.mean, weeklyMin: c.facts.weeklyMin?.mean, layout: c.snapshot.layout.id, plants: c.snapshot.items.filter(i => i.kind === 'plant').length, snapshot: c.snapshot });
  const shown = new Set<string>(); let m: PoolMetrics | undefined;
  const first = nextPair({ tank: t, rev: 1 }, emptyBrief(), sess(), id => hist.get(id), { metrics: x => { m = x; }, shownKeys: shown }); if (!first.ok) throw new Error('no pair');
  for (const c of [first.a, first.b]) { hist.set(c.id, c); shown.add(c.key!); }
  rounds.push({ round: 'first', metrics: m, a: row(first.a), b: row(first.b) });
  for (let i = 0; i < 3; i++) {
    const r = nextPair({ tank: t, rev: 1 }, emptyBrief(), sess(first.a.id, i), id => hist.get(id), { metrics: x => { m = x; }, shownKeys: shown, next: 'champion' }); if (!r.ok) break;
    hist.set(r.b.id, r.b); shown.add(r.b.key!); rounds.push({ round: `champion ${i + 1}`, metrics: m, a: row(r.a), b: row(r.b) });
  }
  mkdirSync(DUMP!, { recursive: true }); writeFileSync(`${DUMP}/example.json`, JSON.stringify(rounds));
}, 300000);
