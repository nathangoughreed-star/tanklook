// Expert calibration rounds (research/expert-calibration.md): the scenario generator, from round 2 on (survey v2).
// Round 1 (research/calib/round-1.json) is frozen data from the first generator and is not regenerated.
// GEN_CALIB=1 GEN_CALIB_R3=1 npx vitest run test/calib.test.ts rewrites research/calib/round-3.json (GEN_CALIB_R2=1: round-2.json); both are
// published and answered, so this redraws tanks under the same ids: only for a new round, never for an engine change (use GEN_RETABLE).
import { describe, expect, it } from 'vitest';
import { classOf, fitsTank, makeRound, readSpace, setupOf, SIZES_R3, SLOTS, tightOf, type Scenario } from '../src/calib/scenario';
import { SPACE_FACTOR } from '../src/data/spacefactor';
import { compatRisks, crowdWarnings } from '../src/scene/territory';
import { groupShort } from '../src/scene/animalfit';
import { getSpecies } from '../src/data/species';
import { zoneOf } from '../src/scene/zone';
import { sharedRange } from '../src/scene/temprange';
import { GROUPS } from '../src/data/groups';

const SEED = 2, R = makeRound({ seed: SEED });
// round 3 (Nathan 2026-10-23): fixed tank sizes centred on the common ones (SIZES_R3), seed 3
const R3 = makeRound({ seed: 3, sizes: SIZES_R3, anchorStock: [['harlequin', 87], ['rummynose', 28]] }); // round 2's anchor stock
const fresh = R.filter(s => s.role === 'fresh');
const readAt = (t: Scenario['table'], n: number) => Math.max(Object.values(t[n].water).reduce((a, b) => a + b, 0), t[n].floor);

describe('calibration round generator (round 2 on)', () => {
  it('is deterministic for a seed', () => {
    expect(JSON.stringify(makeRound({ seed: SEED }))).toBe(JSON.stringify(R));
  });
  it('fills the 16 slots (6 floor-tight, 6 water-tight, 4 both), 2 pairs, 1 anchor and 1 repeat', () => {
    expect(fresh.length).toBe(SLOTS.length);
    for (const t of ['floor', 'water', 'both'] as const) expect(fresh.filter(s => s.tight === t).length, t).toBe(SLOTS.filter(x => x.tight === t).length);
    expect(R.filter(s => s.role === 'pair').length).toBe(4);
    expect(R.filter(s => s.role === 'anchor').length).toBe(1);
    expect(R.filter(s => s.role === 'repeat').length).toBe(1);
  });
  it('reads each fresh tank tight where its slot says', () => {
    for (const s of fresh) expect(tightOf(s.pct.water, s.pct.floor), s.id).toBe(s.tight);
  });
  it('pairs the same stock in two footprints of about the same gallons', () => {
    for (const b of R.filter(s => s.role === 'pair' && s.of)) {
      const a = R.find(s => s.id === b.of)!;
      expect(b.stock).toEqual(a.stock);
      expect(Math.abs(b.gal - a.gal)).toBeLessThanOrEqual(1);
      expect(b.dimsIn).not.toEqual(a.dimsIn);
    }
  });
  it('never shows a tank under a species\' recommended minimum, a short group or a fighting warning', () => {
    for (const s of R) {
      expect(fitsTank(s.dimsIn, s.stock.map(x => x[0])), s.id).toBe(true);
      for (const [id, n] of s.stock) expect(groupShort(getSpecies(id)!, n), `${s.id} ${id}`).toBeNull();
      expect(crowdWarnings(setupOf(s.dimsIn, s.stock)), s.id).toEqual([]);
    }
  });
  it('never makes a shrimp the focal species', () => {
    for (const s of R) expect(getSpecies(s.focal)!.cat, s.id).not.toBe('fw-invert');
  });
  it('labels mixes by the compatibility gates and the shared temperature range, as the app judges them', () => {
    for (const r of [R, R3]) for (const s of r.filter(x => x.kind !== 'single')) {
      const cr = compatRisks(setupOf(s.dimsIn, s.stock)), temp = sharedRange(s.stock.map(([id]) => getSpecies(id)!)).state;
      const clean = !cr && (temp === 'broad' || temp === 'unknown');
      expect(clean, `${s.id} (${s.kind}, temperature ${temp})`).toBe(s.kind === 'mix-ok');
    }
  });
  it('stores engine tables that match the tank as shown and grow with the count, for the focal species and the tankmate', () => {
    for (const s of R) {
      const n = s.stock.find(x => x[0] === s.focal)![1];
      expect(readAt(s.table, n), s.id).toBeCloseTo(s.pct.space, 6);
      for (let k = 1; k < s.table.length; k++) expect(readAt(s.table, k), `${s.id} n=${k}`).toBeGreaterThanOrEqual(readAt(s.table, k - 1) - 1e-9);
      if (s.mate) { const m = s.stock.find(x => x[0] === s.mate)![1]; expect(readAt(s.mateTable!, m), s.id).toBeCloseTo(s.pct.space, 6); }
      expect(readSpace(s.dimsIn, s.stock).space).toBeCloseTo(s.pct.space, 6);
    }
  });
  it('round 3 keeps to its sizes: every fixed size used, centred on 10-55 gal', () => {
    const f3 = R3.filter(s => s.role === 'fresh');
    expect(f3.map(s => s.gal).sort((a, b) => a - b)).toEqual(SIZES_R3.map(t => t[0]).sort((a, b) => a - b));
    expect(R3.filter(s => s.gal >= 10 && s.gal <= 55).length / R3.length).toBeGreaterThanOrEqual(0.8);
  }, 300000);
  if ((globalThis as any).process?.env.GEN_CALIB) {
    // round 3 is published and being answered (2026-10-23): frozen like rounds 1-2 (an engine change re-reads it: test/calibtables.test.ts);
    // GEN_CALIB_R3=1 rewrites it, which redraws every tank under the same ids (the reason for round-3a.json and the survey's build stamp)
    if ((globalThis as any).process?.env.GEN_CALIB_R3) it('writes research/calib/round-3.json', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      const per = (s: Scenario, f: (id: string) => unknown) => Object.fromEntries(s.stock.map(([id]) => [id, f(id)]));
      const out = R3.map(s => ({ ...s, names: per(s, id => getSpecies(id)!.name), tlMm: per(s, id => getSpecies(id)!.tl), cls: per(s, classOf),
        ownRow: per(s, id => !!SPACE_FACTOR[id]), zone: per(s, id => zoneOf(getSpecies(id)!)), invert: per(s, id => getSpecies(id)!.cat === 'fw-invert'),
        // the app's own male : female ratio for fish kept by sex (Nathan 2026-10-23: give the split where it matters); shrimp have none here
        sex: per(s, id => getSpecies(id)!.cat === 'fw-invert' ? null : GROUPS[id]?.sexed?.ratio ?? null) }));
      fs.writeFileSync(new URL('../research/calib/round-3.json', import.meta.url), JSON.stringify({ round: 3, seed: 3, made: '2026-10-23', ideal: 75, limit: 100, survey: 3, scenarios: out }) + '\n');
    }, 300000);
    // round 2 is closed and answered (2026-10-23): its tanks are frozen like round 1's; GEN_CALIB_R2=1 rewrites it on today's engine
    if ((globalThis as any).process?.env.GEN_CALIB_R2) it('writes research/calib/round-2.json', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      const per = (s: Scenario, f: (id: string) => unknown) => Object.fromEntries(s.stock.map(([id]) => [id, f(id)]));
      const out = R.map(s => ({ ...s, names: per(s, id => getSpecies(id)!.name), tlMm: per(s, id => getSpecies(id)!.tl), cls: per(s, classOf),
        ownRow: per(s, id => !!SPACE_FACTOR[id]), zone: per(s, id => zoneOf(getSpecies(id)!)), invert: per(s, id => getSpecies(id)!.cat === 'fw-invert') }));
      fs.writeFileSync(new URL('../research/calib/round-2.json', import.meta.url), JSON.stringify({ round: 2, seed: SEED, made: '2026-10-23', ideal: 75, limit: 100, survey: 2, scenarios: out }) + '\n');
    }, 120000);
  }
});
