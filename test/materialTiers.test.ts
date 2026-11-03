// Lane BL1: Budget / As designed / Luxury versions of the same design (Nathan 2026-11-03: holey limestone vs dragon stone for a Malawi rockscape).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { recipeBase, sceneAt, minTank } from '../src/scene/recipes';
import { aquasoilOk, groundKind, limestoneOk, priceDiff, rockLine, tierOf, tierPair, TIERS, type Tier } from '../src/scene/materialTiers';
import { LIBRARY, stoneDims } from '../src/scene/items';
import { pieceKg } from '../src/scene/setupsheet';
import { TANK_MODELS } from '../src/data/tanks';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import rows from '../src/data/demand-items.json';

const NOW = Date.UTC(2026, 10, 3);
const byName = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const looks = ARCHETYPES.filter(a => a.recipe.looks.length && a.support !== 'coming-soon');
const built = looks.flatMap(a => { const b = recipeBase(a, minTank(a), undefined, NOW); return b ? [{ a, S: sceneAt(b, 'balanced') }] : []; });

describe('holey limestone and lace rock exist as real hardscape (lane BL1)', () => {
  it('library entries, drawn size, weight and a sourced price row per lb', () => {
    for (const v of ['holey', 'lace']) {
      expect(LIBRARY[v]?.kind).toBe('stone'); expect(LIBRARY[v].hardens).toBe(true);
      const [l, h, w] = stoneDims(v, 3, 140); expect(h).toBeGreaterThan(0); expect(w).toBeGreaterThan(0); expect(l).toBe(140);
      expect(pieceKg({ kind: 'stone', variant: v, seed: 3, size: 300 })).toBeGreaterThan(1);
      const r = (rows.rows as Record<string, { lo: number; mode: number; hi: number; unit: string; url: string }>)[`hard:${v}`];
      expect(r.unit.startsWith('per lb')).toBe(true); expect(r.url).toMatch(/^https:/); expect(r.lo).toBeLessThanOrEqual(r.mode); expect(r.mode).toBeLessThanOrEqual(r.hi);
    }
    expect(LIBRARY.dragon.hardens).toBeUndefined();
  });
});

describe('the three versions are the same design', () => {
  it('only materials and gear differ: tank, animals, layout, piece count, positions and sizes are identical', () => {
    for (const { a, S } of built) for (const t of ['budget', 'luxury'] as Tier[]) {
      const r = tierOf(S, t, { archetypeId: a.id, now: NOW }).scene;
      expect(r.tank, `${a.id} ${t}`).toEqual(S.tank); expect(r.fish).toEqual(S.fish); expect(r.layout).toEqual(S.layout); expect(r.water).toEqual(S.water);
      expect(r.items.length).toBe(S.items.length);
      r.items.forEach((it, i) => { const o = S.items[i]; expect([it.id, it.kind, it.x, it.depth, it.size, it.seed]).toEqual([o.id, o.kind, o.x, o.depth, o.size, o.seed]); });
    }
  });
  it('Budget <= As designed <= Luxury in set-up dollars for every buildable archetype at Balanced', () => {
    let moved = 0;
    for (const { a, S } of built) {
      const p = tierPair(S, { archetypeId: a.id, now: NOW });
      expect(p.budget.setupUsd, a.id).toBeLessThanOrEqual(p.designed.setupUsd + 1e-6);
      expect(p.luxury.setupUsd, a.id).toBeGreaterThanOrEqual(p.designed.setupUsd - 1e-6);
      if (p.budget.setupUsd < p.designed.setupUsd - 1 || p.luxury.setupUsd > p.designed.setupUsd + 1) moved++;
    }
    console.log(`BL1: ${moved} of ${built.length} buildable archetypes differ between the versions`);
    expect(moved).toBeGreaterThan(3);
  });
  it('the designed version is the scene itself', () => {
    const { S } = built[0]; expect(tierOf(S, 'designed', { now: NOW }).scene).toEqual(S);
  });
});

describe('no swap breaks a water or welfare rule', () => {
  it('limestone is never in a look that is not hard-water: soft, marine, or flexible looks never get holey / lace', () => {
    for (const { a, S } of built) for (const t of TIERS) {
      const r = tierOf(S, t, { archetypeId: a.id, now: NOW }), has = r.scene.items.some(i => LIBRARY[i.variant]?.hardens);
      const tags = a.tags.chem ?? [];
      if (has && !S.items.some(i => LIBRARY[i.variant]?.hardens)) expect((tags.includes('hard') || tags.includes('brackish')) && !tags.includes('soft') && !tags.includes('marine'), `${a.id} ${t}`).toBe(true);
    }
  });
  it('a soft-water animal in a hard-water look withdraws the limestone; aquasoil never goes under a hard-water look', () => {
    const a = looks.find(x => x.id === 'african-cichlid-rockscape')!, base = sceneAt(recipeBase(a, byName('60 gal breeder'), undefined, NOW)!, 'balanced');
    expect(limestoneOk(base, a.id)).toBe(true);
    const neon = structuredClone(base); neon.fish = [{ ...neon.fish[0] ?? { id: 1, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }, id: 99, species: 'neon' }];
    expect(limestoneOk(neon, a.id)).toBe(false);
    expect(tierOf(neon, 'budget', { archetypeId: a.id, now: NOW }).scene.items.some(i => i.variant === 'holey' || i.variant === 'lace')).toBe(false);
    expect(aquasoilOk(base, a.id)).toBe(false);
    const planted = built.find(x => ['planted', 'nature', 'iwagumi'].includes(x.S.layout.id));
    if (planted) expect(tierOf(planted.S, 'luxury', { archetypeId: planted.a.id, now: NOW }).scene.items.every(i => !LIBRARY[i.variant]?.hardens || planted.S.items.some(j => j.variant === i.variant))).toBe(true);
    expect(groundKind(base)).toBe('engine');
  });
});

describe("Nathan's case: Malawi, 60 gal breeder", () => {
  it('shows the rock line in both versions in US $ and lb; holey limestone is lighter on the wallet than dragon stone', () => {
    const a = looks.find(x => x.id === 'african-cichlid-rockscape')!, t = byName('60 gal breeder');
    const S = sceneAt(recipeBase(a, t, undefined, NOW)!, 'balanced'), p = tierPair(S, { archetypeId: a.id, now: NOW });
    const rb = rockLine(p.budget), rd = rockLine(p.designed), rl = rockLine(p.luxury);
    console.log(`BL1 Malawi 60 gal: Budget ${rb.names.join(' + ')} ${rb.lb.toFixed(0)} lb $${rb.usd.toFixed(0)} (set-up $${p.budget.setupUsd.toFixed(0)}); As designed ${rd.names.join(' + ')} ${rd.lb.toFixed(0)} lb $${rd.usd.toFixed(0)} ($${p.designed.setupUsd.toFixed(0)}); Luxury ${rl.names.join(' + ')} ${rl.lb.toFixed(0)} lb $${rl.usd.toFixed(0)} ($${p.luxury.setupUsd.toFixed(0)})`);
    expect(rb.names).toContain('Texas holey limestone'); expect(rl.names).toContain('Dragon stone');
    expect(rb.lb).toBeGreaterThan(20); expect(rl.lb).toBeGreaterThan(20); expect(rb.usd).toBeGreaterThan(0); expect(rl.usd).toBeGreaterThan(0);
    expect(rb.usd).toBeLessThan(rl.usd);
    const diff = priceDiff(p.budget, p.luxury); expect(diff.length).toBeGreaterThan(0); expect(diff[0].deltaUsd).toBeGreaterThan(0);
    expect(p.budget.swaps.some(s => s.group === 'rock' && /limestone/i.test(s.to))).toBe(true);
    expect(demandOf(p.budget.scene, defaultProfile(), { now: NOW }).totals.setupUsd).toBeLessThan(demandOf(S, defaultProfile(), { now: NOW }).totals.setupUsd);
  });
});
