// Source traceability (2026-10-20): every advice number should trace to a source (src/data/provenance.ts, src/data/sources.json).
// The ratchet: the count of unsourced values and engine constants may only go down. After sourcing more, lower the baseline with
// GEN_SOURCES=1 npx vitest run test/sources.test.ts (also rewrites research/source-coverage.md).
import { describe, expect, it } from 'vitest';
import { engineConstants, registryProblems, report, summarize, walk } from '../scripts/source-audit';

const BASE = 'research/source-baseline.json';
// @ts-expect-error node only (no node types in this project)
const { readFileSync, writeFileSync } = await import('node:fs');
describe('source traceability', () => {
  const vals = walk(), consts = engineConstants(), s = summarize(vals, consts);
  if ((globalThis as any).process?.env.GEN_SOURCES) {
    writeFileSync('research/source-coverage.md', report(vals, consts));
    writeFileSync(BASE, JSON.stringify({ unsourced: s.unsourced, constUnsourced: s.constUnsourced, total: s.total, byStatus: s.byStatus }, null, 1) + '\n');
  }
  it('every source id, symbol and target in the provenance rules exists', () => {
    expect(registryProblems()).toEqual([]);
    expect(consts.flatMap(c => c.missingSymbols.map(m => `${c.file}: ${m}`))).toEqual([]);
  });
  it('unsourced values do not rise above the baseline (ratchet)', () => {
    const base = JSON.parse(readFileSync(BASE, 'utf8'));
    expect(s.unsourced, 'new advice values need a rule in src/data/provenance.ts').toBeLessThanOrEqual(base.unsourced);
    expect(s.constUnsourced, 'new engine constants need a FORMULAS or EXCLUDED entry').toBeLessThanOrEqual(base.constUnsourced);
  });
});
