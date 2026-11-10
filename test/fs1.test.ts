// FS1 (2026-11-10): Siamese algae eater stocking audit. The reviewer saw 6 SAE in 42.5 gal and 5 in 50.6 gal pass with an 85-89 % stocking score. The stocking percent measures
// room and load only; SAE rank-fight below a group of ~6 and are 6 in constant swimmers, so a count-scaled tank minimum (tankmin.json groupVol) is a welfare GATE.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { volume } from '../src/scene/physics';
import { verdictOf } from '../src/scene/verdict';
import { emptyBrief } from '../src/ui/setupBrief';
import { tankMinimum, minDataOf } from '../src/scene/tankMin';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';

const fishOf = (sp: string, n: number, from: number): any[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, size: 1 }));
const mk = (dims: [number, number, number], fish: any[]) => {
  const t: any = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: dims[0] * IN, D: dims[1] * IN, H: dims[2] * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  regenerate(t, 'all', 1); t.fish = fish; return ensureUids(t);
};
const gal = (t: any) => volume(t.tank).gallons;
const gated = (t: any) => verdictOf(t, emptyBrief()).gates.some(g => /Siamese/i.test(g.text));

describe('FS1 SAE group gate', () => {
  it('data: species record is the true SAE at adult size, with a count-scaled floor', () => {
    expect(minDataOf('sae')?.groupVol?.map(s => [s.from, s.gal])).toEqual([[2, 40], [5, 75]]);
  });
  it('reviewer candidate A (6 SAE, ~42 gal, 12 CPD, 16 ember) is gated', () => {
    const t = mk([36, 18, 16], [...fishOf('cpd', 12, 100), ...fishOf('ember', 16, 200), ...fishOf('sae', 6, 300)]);
    expect(gal(t)).toBeLessThan(60);
    expect(gated(t)).toBe(true);
    expect(verdictOf(t, emptyBrief()).feasible).toBe(false);
  });
  it('reviewer candidate B size (5 SAE, ~50 gal) is gated', () => {
    const t = mk([48, 13, 20], [...fishOf('sae', 5, 300), ...fishOf('neon', 12, 400)]);
    expect(gated(t)).toBe(true);
  });
  it('a single SAE and a pair keep their old, smaller floors', () => {
    expect(gated(mk([36, 18, 16], fishOf('sae', 1, 300)))).toBe(false);
    expect(gated(mk([36, 18, 16], fishOf('sae', 2, 300)))).toBe(false);
    expect(gated(mk([36, 18, 16], fishOf('sae', 3, 300)))).toBe(false);
  });
  it('a group of 6 in a 75 gal tank passes the group gate', () => {
    const t = mk([48, 18, 20], fishOf('sae', 6, 300));
    expect(gal(t)).toBeGreaterThan(65);
    expect(gated(t)).toBe(false);
    expect(tankMinimum(t).rows.find(r => r.id === 'sae')!.n).toBe(6);
  });
});

describe('FS1 generator never offers an under-sized SAE group', () => {
  it('candidates from a SAE-stocked ~40 gal project', () => {
    clearPairCache();
    const t = mk([36, 18, 16], [...fishOf('sae', 6, 300), ...fishOf('ember', 10, 400)]);
    const s: DiscoverySession = { id: 's1', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'unsure', comparisons: [], status: 'active' };
    const r = nextPair({ tank: t, rev: 1 }, emptyBrief(), s, () => undefined as CandidateRecord | undefined, {});
    if (!r.ok) return;   // an honest no-solution is fine
    for (const c of [r.a, r.b]) {
      const n = c.snapshot.fish.filter((f: any) => f.species === 'sae').length;
      const g = volume(c.snapshot.tank).gallons;
      if (n >= 5) expect(g).toBeGreaterThanOrEqual(75 / 1.12);
      if (n >= 2) expect(g).toBeGreaterThanOrEqual(40 / 1.12);
    }
  });
});
