// Expert calibration rounds (research/expert-calibration.md): the scenario generator.
// GEN_CALIB=1 npx vitest run test/calib.test.ts writes research/calib/round-1.json (scenarios, engine tables, share links).
import { describe, expect, it } from 'vitest';
import { classOf, fitsTank, makeRound, readSpace, setupOf, type Scenario } from '../src/calib/scenario';
import { SPACE_FACTOR } from '../src/data/spacefactor';
import { compatRisks, crowdWarnings } from '../src/scene/territory';
import { groupShort } from '../src/scene/animalfit';
import { getSpecies } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { shareHash } from '../src/scene/share';

const R = makeRound({ seed: 1 });
const fresh = R.filter(s => s.role === 'fresh');
const waterAt = (s: Scenario, n: number) => Object.values(s.table[n].water).reduce((a, b) => a + b, 0);

describe('calibration round generator', () => {
  it('is deterministic for a seed, and another seed gives other tanks', () => {
    expect(JSON.stringify(makeRound({ seed: 1 }))).toBe(JSON.stringify(R));
    expect(makeRound({ seed: 2 }).map(s => s.stock.join())).not.toEqual(R.map(s => s.stock.join()));
  });
  it('holds 20 fresh tanks (8 one species, 8 passing mixes, 4 flagged mixes), 2 anchors and 2 repeats', () => {
    expect(R.length).toBe(24);
    expect(fresh.length).toBe(20);
    expect(fresh.filter(s => s.kind === 'single').length).toBe(8);
    expect(fresh.filter(s => s.kind === 'mix-ok').length).toBe(8);
    expect(fresh.filter(s => s.kind === 'mix-flagged').length).toBe(4);
    expect(R.filter(s => s.role === 'anchor').length).toBe(2);
    expect(R.filter(s => s.role === 'repeat').length).toBe(2);
  });
  it('uses the same held-out anchors whatever the round seed', () => {
    const a = (r: Scenario[]) => r.filter(s => s.role === 'anchor').map(s => s.stock.join() + s.gal).sort();
    expect(a(makeRound({ seed: 9 }))).toEqual(a(R));
  });
  it('shows every repeat at least 5 tanks after its original, unchanged but for the layout', () => {
    for (const r of R.filter(s => s.role === 'repeat')) {
      const o = R.find(s => s.id === r.of)!;
      expect(R.indexOf(r) - R.indexOf(o)).toBeGreaterThanOrEqual(5);
      expect(r.stock).toEqual(o.stock);
      expect(r.seed).not.toBe(o.seed);
    }
  });
  it('never shows a tank too small for a species, a short group or a fighting warning', () => {
    for (const s of R) {
      expect(fitsTank(s.dimsIn, s.stock.map(x => x[0])), s.id).toBe(true);
      for (const [id, n] of s.stock) expect(groupShort(getSpecies(id)!, n), `${s.id} ${id}`).toBeNull();
      expect(crowdWarnings(setupOf(s.dimsIn, s.stock)), s.id).toEqual([]);
    }
  });
  it('labels mixes by the compatibility gates: passing mixes have no risk, flagged ones do', () => {
    for (const s of R.filter(x => x.kind !== 'single')) {
      const cr = compatRisks(setupOf(s.dimsIn, s.stock));
      if (s.kind === 'mix-ok') expect(cr, s.id).toBeNull(); else expect(cr?.level, s.id).toMatch(/high|concern/);
    }
  });
  it('aims the readings at the anchors: most fresh tanks read 50-150 % of space', () => {
    expect(fresh.filter(s => s.pct.space >= 50 && s.pct.space <= 150).length).toBeGreaterThanOrEqual(16);
  });
  it('stores an engine table that matches the tank as shown and grows with the focal count', () => {
    for (const s of R) {
      const n = s.stock.find(x => x[0] === s.focal)![1];
      expect(Math.max(waterAt(s, n), s.table[n].floor), s.id).toBeCloseTo(s.pct.space, 6);
      for (let k = 1; k < s.table.length; k++) expect(waterAt(s, k) + s.table[k].floor, `${s.id} n=${k}`).toBeGreaterThanOrEqual(waterAt(s, k - 1) + s.table[k - 1].floor - 1e-9);
      expect(readSpace(s.dimsIn, s.stock).space).toBeCloseTo(s.pct.space, 6);
    }
  });
  if ((globalThis as any).process?.env.GEN_CALIB) {
    it('writes research/calib/round-1.json', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      const out = [];
      for (const s of R) {
        const sc = defaultScene(); sc.name = `Survey ${s.id}`; sc.tanks = [setupOf(s.dimsIn, s.stock, s.seed)];
        out.push({ ...s, names: Object.fromEntries(s.stock.map(([id]) => [id, getSpecies(id)!.name])), tlMm: Object.fromEntries(s.stock.map(([id]) => [id, getSpecies(id)!.tl])), cls: Object.fromEntries(s.stock.map(([id]) => [id, classOf(id)])), ownRow: Object.fromEntries(s.stock.map(([id]) => [id, !!SPACE_FACTOR[id]])), share: await shareHash(sc) });
      }
      fs.mkdirSync(new URL('../research/calib/', import.meta.url), { recursive: true });
      fs.writeFileSync(new URL('../research/calib/round-1.json', import.meta.url), JSON.stringify({ round: 1, seed: 1, made: '2026-10-23', ideal: 75, limit: 100, scenarios: out }) + '\n');
    }, 120000);
  }
});
