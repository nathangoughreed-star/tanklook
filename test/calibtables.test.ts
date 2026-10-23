// Expert calibration: each round's engine tables re-read on the current engine (research/expert-calibration.md section 12).
// The rounds' tanks and counts stay frozen (the answers are about them); only what the engine reads of them is recomputed, into
// research/calib/tables/round-N.json, which the fit and the review use in place of the tables stored at generation.
// GEN_RETABLE=1 npx vitest run test/calibtables.test.ts rewrites the tables files. The lock below fails when the engine has moved
// since (a length, a factor, a curve): rerun the line above, then refit.
import { describe, expect, it } from 'vitest';
import { floorShareOf, gateOf, readSpace, tableOf, tightOf } from '../src/calib/scenario';
import { getSpecies } from '../src/data/species';
import R1 from '../research/calib/round-1.json';
import R2 from '../research/calib/round-2.json';
import R3 from '../research/calib/round-3.json';
import R3A from '../research/calib/round-3a.json'; // round 3 as first published, frozen: answers exist for its tanks

type Dims = [number, number, number];
interface Tank { id: string; dimsIn: Dims; stock: [string, number][]; focal: string; mate?: string }
const ROUNDS = [R1, R2, R3, R3A] as unknown as { round: number; label?: string; scenarios: Tank[] }[];
// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const tablesUrl = (R: { round: number; label?: string }) => new URL(`../research/calib/tables/round-${R.label ?? R.round}.json`, import.meta.url);

/** What the current engine reads of a frozen tank: as shown, and over the focal (and tankmate) count; for a mix also the gate the app
 *  gives it today (compatibility and shared temperature, gateOf), so reviews compare the experts with today's rules. */
export function retable(s: Tank) {
  const r = readSpace(s.dimsIn, s.stock);
  return { pct: { space: r.space, water: r.water, floor: r.floor }, tight: tightOf(r.water, r.floor), table: tableOf(s.dimsIn, s.stock, s.focal),
    ...(s.mate ? { mateTable: tableOf(s.dimsIn, s.stock, s.mate) } : {}),
    // what each species takes as the engine counts it today (S212 2026-10-23: white cloud, pygmy cory and others no longer use the floor);
    // the fit reads a count on the dimension its species fills, so it must be today's share, not the one the survey showed
    uses: Object.fromEntries(s.stock.map(([id]) => [id, { water: true, floor: floorShareOf(getSpecies(id)!) }])),
    ...(s.stock.length > 1 ? (g => ({ gate: g.gate, gateItems: g.items }))(gateOf(s.dimsIn, s.stock.map(x => x[0]))) : {}) };
}

describe('calibration tables on the current engine', () => {
  if ((globalThis as any).process?.env.GEN_RETABLE) {
    it('rewrites research/calib/tables/round-N.json', () => {
      fs.mkdirSync(new URL('../research/calib/tables/', import.meta.url), { recursive: true });
      for (const R of ROUNDS) {
        const tanks = Object.fromEntries(R.scenarios.map(s => [s.id, retable(s)]));
        fs.writeFileSync(tablesUrl(R), JSON.stringify({ round: R.round, ...(R.label ? { label: R.label } : {}), made: new Date().toISOString().slice(0, 10), note: 'engine readings of the frozen tanks, current engine (test/calibtables.test.ts)', tanks }) + '\n');
      }
    }, 600000);
  }
  it('has a tables file for every round, read on the engine as it is now (else: GEN_RETABLE=1 npx vitest run test/calibtables.test.ts)', () => {
    for (const R of ROUNDS) {
      expect(fs.existsSync(tablesUrl(R)), `round ${R.round}: no tables file`).toBe(true);
      const T = JSON.parse(fs.readFileSync(tablesUrl(R), 'utf8'));
      for (const s of R.scenarios) {
        const t = T.tanks[s.id];
        expect(t, `round ${R.round} ${s.id}`).toBeTruthy();
        // the reading as shown is one engine run per tank: cheap enough for every suite run
        expect(readSpace(s.dimsIn, s.stock).space, `round ${R.round} ${s.id}: the engine moved since the tables were made`).toBeCloseTo(t.pct.space, 6);
      }
    }
  });
});
