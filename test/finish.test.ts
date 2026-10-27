// Finished suggestions (lane C9, 2026-10-27): every proposal is a complete tank, never a bare shell: substrate priced in the set-up total,
// hardscape, plants that suit the build's light, a scape; cheaper tiers scale down but are never empty; the card takes the best tier that passes.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { demandOf } from '../src/demand/engine';
import { ARCHETYPES, suggestSetups } from '../src/demand/suggest';
import { buildsFor, distinctBuilds, meetsNeeds } from '../src/scene/builds';
import { finishTiers } from '../src/scene/finish';
import { itemLights } from '../src/scene/lightcheck';
import { tankOptions } from '../src/scene/tankfit';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const caution = (S: Parameters<typeof summaryOf>[0]) => summaryOf(S, 'in').cats.some(c => c.level === 'caution' || c.level === 'problem');
const decor = (S: { items: { kind: string }[] }) => S.items.filter(i => i.kind === 'plant' || i.kind === 'artificial' || i.kind === 'coral').length;

describe('finished builds', () => {
  for (const a of ARCHETYPES) {
    it(`${a.id}: each size has priced substrate, a scape, no struggling plants and no new Caution, tiers rise in cost`, () => {
      const sizes = tankOptions(a.animals).filter(t => !t.fails.length).slice(0, 3);
      expect(sizes.length).toBeGreaterThan(0);
      for (const t of sizes) {
        const b = distinctBuilds(buildsFor(a.animals, t.tank, NOW)).filter(meetsNeeds)[0];
        if (!b) continue;
        const baseBad = caution(b.setup), tiers = [...finishTiers(b, NOW)];
        expect(tiers.map(f => f.finish!.tier)).toEqual(['lush', 'standard', 'lean', 'starter']);
        for (const f of tiers) {
          expect(f.setup.substrate.show).toBe(true);
          expect(demandOf(f.setup, P).items.some(i => i.key === 'substrate' && !!i.setup)).toBe(true);
          expect(f.finish!.lines.some(l => l.startsWith('Substrate:'))).toBe(true);
          expect(decor(f.setup)).toBeGreaterThan(0);
          expect(f.setup.items.length).toBeGreaterThan(1);
          expect(f.setupUsd).toBeGreaterThan(b.setupUsd);
          const lights = itemLights(f.setup);
          if (lights) expect([...lights.values()].filter(l => l.outcome.state === 'struggle').length).toBe(0);
          if (!baseBad) expect(caution(f.setup)).toBe(false);
        }
        // more finish costs more (slack where two tiers draw nearly the same pieces)
        expect(tiers[0].setupUsd).toBeGreaterThanOrEqual(tiers[1].setupUsd * 0.9);
        expect(tiers[1].setupUsd).toBeGreaterThanOrEqual(tiers[2].setupUsd * 0.9);
        expect(tiers[2].setupUsd).toBeGreaterThanOrEqual(tiers[3].setupUsd * 0.9);
        expect(tiers[0].setupUsd).toBeGreaterThan(tiers[3].setupUsd);
      }
    }, 120000);
  }

  it('a school of danios or tetras never comes bare, at any tier', () => {
    for (const id of ['danio', 'neon-cory', 'ember-nano']) {
      const a = ARCHETYPES.find(x => x.id === id)!;
      for (const t of tankOptions(a.animals).filter(x => !x.fails.length).slice(0, 3)) {
        const b = buildsFor(a.animals, t.tank, NOW)[0];
        for (const f of finishTiers(b, NOW)) {
          expect(f.setup.substrate.show).toBe(true);
          expect(decor(f.setup)).toBeGreaterThan(0);
          expect(f.setup.items.some(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'cave')).toBe(true);
        }
      }
    }
  }, 120000);

  it('Suggest: every proposal is finished, at low, mid and high budget; more money buys a finish at least as good', () => {
    const level = (usd: number) => {
      const r = suggestSetups({ constraints: { startupUsd: cap(usd) } }, P, 'cm', NOW);
      for (const p of r.proposals) {
        expect(p.build.finish).toBeTruthy();
        expect(p.scene.substrate.show).toBe(true);
        expect(decor(p.scene)).toBeGreaterThan(0);
        expect(p.totals.startupUsd).toBeLessThanOrEqual(usd);
      }
      return r.proposals.length ? Math.max(...r.proposals.map(p => p.build.finish!.level)) : -1;
    };
    const lo = level(500), mid = level(900), hi = level(3000);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(mid).toBeGreaterThanOrEqual(lo);
    expect(hi).toBeGreaterThanOrEqual(mid);
    expect(hi).toBe(3);
  }, 300000);

  it('the budget is a target (Nathan 2026-10-27): at $900 each terrarium card lands at 85 % of it or more, or says the animals cap it; never over', () => {
    const r = suggestSetups({ constraints: { startupUsd: cap(900) }, kinds: ['terrarium'], groups: ['herp'] }, P, 'cm', NOW);
    const ids = r.proposals.map(p => p.archetype.id);
    for (const id of ['dart-frogs', 'crested-gecko', 'leopard-gecko']) expect(ids).toContain(id);
    for (const p of r.proposals) {
      expect(p.totals.startupUsd).toBeLessThanOrEqual(900);
      expect(p.totals.startupUsd >= 0.85 * 900 || !!p.capNote).toBe(true);
      expect(caution(p.scene)).toBe(false);
    }
  }, 300000);

  it('a bigger budget buys a bigger or richer tank, still within every guardrail and the husbandry rule', () => {
    const at = (usd: number) => suggestSetups({ constraints: { startupUsd: cap(usd), monthlyUsd: cap(80), minutesPerWeek: cap(120) }, kinds: ['freshwater'] }, P, 'cm', NOW);
    const lo = at(500), hi = at(1500);
    for (const p of [...lo.proposals, ...hi.proposals]) { expect(caution(p.scene)).toBe(false); expect(p.totals.monthlyUsd).toBeLessThanOrEqual(80); expect(p.totals.minPerWeek).toBeLessThanOrEqual(120); }
    for (const p of lo.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(500);
    const spend = (r: typeof lo) => Math.max(...r.proposals.map(p => p.totals.startupUsd));
    expect(spend(hi)).toBeGreaterThan(spend(lo));
    for (const p of hi.proposals.filter(q => !q.capNote)) expect(p.totals.startupUsd).toBeGreaterThanOrEqual(0.85 * 1500);
  }, 300000);
});
