import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { SPECIES } from '../src/data/species';
import { GROUPS, bandMessage, bandOf, recommendedMin } from '../src/data/groups';

describe('group data (lane P1, 2026-10-20)', () => {
  it('every species has a group entry with bands, a zone and appeal tags', () => {
    for (const s of SPECIES) {
      const g = GROUPS[s.id];
      expect(g, `${s.id}: no GROUPS entry`).toBeTruthy();
      expect(g.bands, `${s.id}: no bands`).toBeTruthy();
      expect(g.zone, `${s.id}: no zone`).toBeTruthy();
      expect(g.appeal?.length, `${s.id}: no appeal`).toBeGreaterThan(0);
    }
    for (const id of Object.keys(GROUPS)) expect(SPECIES.some(s => s.id === id), `${id}: unknown species`).toBe(true);
  });
  it('bands are in order and the caps make sense', () => {
    for (const [id, g] of Object.entries(GROUPS)) {
      const b = g.bands!;
      expect(b.ok >= 1 && b.ok <= b.good && b.good <= b.great, `${id}: bands out of order`).toBe(true);
      if (g.max != null) expect(g.max, `${id}: max below ok`).toBeGreaterThanOrEqual(b.ok);
      if (g.sexed) { expect(g.sexed.ratio[0], id).toBeGreaterThanOrEqual(0); expect(g.sexed.ratio[1], id).toBeGreaterThanOrEqual(0); }
      if (g.maxDepthMm != null) expect(g.maxDepthMm, id).toBeGreaterThan(0);
      if (g.minLengthMm != null) expect(g.minLengthMm, id).toBeGreaterThan(0);
    }
  });
  it('solo species are capped at one (or a pair) and land animals carry no water limits', () => {
    for (const s of SPECIES) {
      const g = GROUPS[s.id], c = CARE[s.id];
      if (c.solo) expect(g.max, `${s.id}: solo but max ${g.max}`).toBeLessThanOrEqual(2);
      if (s.habitat === 'land') { expect(g.flow, `${s.id}: land with flow`).toBeUndefined(); expect(g.maxDepthMm, `${s.id}: land with depth`).toBeUndefined(); }
    }
  });
  it('the older CG group minimums stay consistent with bands.ok', () => {
    for (const s of SPECIES) {
      const c = CARE[s.id];
      if (c.group != null) expect(GROUPS[s.id].bands!.ok, `${s.id}: bands.ok vs CARE.group`).toBe(c.group);
    }
  });
  it('merges into CARE', () => {
    for (const s of SPECIES) expect(CARE[s.id].bands, s.id).toEqual(GROUPS[s.id].bands);
  });
  it("Nathan's dwarf frog: 1 avoid, 2-4 doable, 5-6 good, 7+ great, shallow", () => {
    const g = GROUPS.adf;
    expect(g.bands).toEqual({ ok: 2, good: 5, great: 7 });
    expect([1, 2, 4, 5, 6, 7, 9].map(n => bandOf(g, n))).toEqual(['avoid', 'ok', 'ok', 'good', 'good', 'great', 'great']);
    expect(g.maxDepthMm).toBeGreaterThanOrEqual(300);
    expect(g.maxDepthMm).toBeLessThanOrEqual(450);
    expect(g.flow).toBe('low');
    expect(recommendedMin(g)).toBe(2);
  });
  it('recommended minimum falls back to CARE.group, then 1; messages default from the numbers', () => {
    expect(recommendedMin(undefined, 6)).toBe(6);
    expect(recommendedMin(undefined)).toBe(1);
    expect(recommendedMin({ bands: { ok: 3, good: 5, great: 8 } }, 6)).toBe(3);
    expect(bandMessage({ bands: { ok: 3, good: 5, great: 8 } }, 2)).toMatch(/at least 3/);
    expect(bandMessage({ bands: { ok: 3, good: 5, great: 8 }, msg: { good: 'own line' } }, 6)).toBe('own line');
  });
});
