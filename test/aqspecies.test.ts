// Per-species space calibration (lane SE2): one species at a time in a 55 gal (48x13x20 in), filter on Choose, count sized so our
// space reads about 100 %. GEN_AQSP=1 npx vitest run test/aqspecies.test.ts writes scripts/aq-queries.json (same format as
// aqcompare.test.ts, so `node scripts/aq-compare.mjs` runs it) and research/aq-species.json (species -> key, n).
import { describe, expect, it } from 'vitest';
import { aqKey, aqQuery } from '../src/data/aqadvisor';
import { stockingOf } from '../src/scene/stocking';
import { comboTank } from './aqcompare.test';
import ids from '../src/data/aqadvisor.json';
import { getSpecies } from '../src/data/species';

const AQ = ids as Record<string, { aq: string; salt?: boolean; standIn?: boolean }>;
export const SPECIES = Object.keys(AQ).filter(k => !AQ[k].salt && !AQ[k].standIn && getSpecies(k) && getSpecies(k)!.habitat !== 'land');
const TANK: [number, number, number] = [48, 13, 20];
export function nFor(id: string) {
  const one = stockingOf(comboTank({ name: id, tank: TANK, stock: [[id, 1]] })).spacePercent;
  return Math.max(1, Math.min(20, Math.round(100 / one)));
}
describe('single species queries', () => {
  if ((globalThis as any).process?.env.GEN_AQSP) {
    it('writes the queries', async () => {
      // @ts-expect-error node only
      const fs = await import('node:fs');
      const out = SPECIES.map(id => { const n = nFor(id), q = aqQuery(comboTank({ name: id, tank: TANK, stock: [[id, n]] }))!; return { id, n, name: id + ' x' + n, key: aqKey(q), sel: q.sel, l: q.l, d: q.d, h: q.h }; });
      fs.writeFileSync(new URL('../scripts/aq-queries.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
      fs.writeFileSync(new URL('../research/aq-species.json', import.meta.url), JSON.stringify(out.map(({ id, n, key }) => ({ id, n, key })), null, 1) + '\n');
    });
    return;
  }
  it('has species to probe', () => { expect(SPECIES.length).toBeGreaterThan(40); expect(nFor('neon')).toBeGreaterThan(1); });
});
