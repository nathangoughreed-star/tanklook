// Guided Setup Rev 03 (lane GA1): the generator HONOURS Available vs Required and flexible vs hard, it does not just store them (Nathan 2026-11-02).
//   Available tank: not a restriction; used (and credited, ranked a little higher) when it suits, a different tank with a one-line reason when it does not. Required tank: today's behaviour.
//   Available gear: credited when it suits, replaced with a reason when it does not. Required gear: kept, warned about, never swapped.
//   Flexible limits rank and warn instead of filtering; hard limits still filter; an unknown limit neither filters nor ranks.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { briefFromWants, briefToWants, emptyBrief, type Brief } from '../src/scene/brief';
import { constraintOf, setConstraint, setEquipment, type ConstraintId } from '../src/scene/project';
import { suggestFromBrief, suggestSetups, AVAIL_BONUS_MAX, type Suggestions, type Wants } from '../src/demand/suggest';
import { applyAlternative, explainInfeasible } from '../src/demand/infeasible';
import { buildsFor } from '../src/scene/builds';
import { HEATER_PRODUCTS } from '../src/data/gearCatalog';
import { TANK_MODELS } from '../src/data/tanks';
import { ownedAssess } from '../src/demand/suggest';
import { tankOptions } from '../src/scene/tankfit';
import { compliance } from '../src/scene/constraints';

const P = defaultProfile(), NOW = Date.parse('2026-11-02');
const cap = (value: number) => ({ on: true, value });
const go = (w: Wants) => suggestSetups(w, P, 'in', NOW);
const again = (b: Brief) => suggestFromBrief(b, P, 'in', NOW);
const tank = (gal: number) => TANK_MODELS.find(t => Math.round(t.ratedGal) === gal)!;
const gold = [{ species: 'goldfish', n: 2 }];
const flat = (r: Suggestions) => r.proposals.map(p => `${p.archetype.id}|${p.build.tank.id}|${p.totals.startupUsd}|${p.score.toFixed(2)}`);

describe('an owned tank marked Available is credited, never a restriction', () => {
  const own = tank(20), w: Wants = { constraints: { startupUsd: cap(600) } };
  const avail = go({ ...w, availTank: own }), req = go({ ...w, ownTank: own }), none = go(w);

  it('Required: only setups in that tank, as before', () => {
    expect(req.proposals.length).toBeGreaterThan(0);
    for (const p of req.proposals) { expect(p.build.tank.id).toBe(own.id); expect(p.tankSource).toBe('owned-required'); expect(p.tankNote).toContain('Required'); }
  });
  it('Available: setups in the owned tank are offered, credited its price and ranked a little higher for it', () => {
    const used = avail.proposals.filter(p => p.tankSource === 'owned-available');
    expect(used.length).toBeGreaterThan(0);
    for (const p of used) {
      expect(p.build.tank.id).toBe(own.id);
      expect(p.tankCreditUsd).toBeGreaterThan(0);
      expect(p.tankBonus).toBeGreaterThan(0); expect(p.tankBonus).toBeLessThanOrEqual(AVAIL_BONUS_MAX);
      expect(p.tankNote).toMatch(/^Uses your 20 gal: its price is credited \(\$\d+ off\)/);
      expect(p.costLines.some(l => l.label.toLowerCase().includes('tank') && l.usd === 0)).toBe(true);
    }
  });
  it('Available: setups in OTHER tanks still appear, and each says why it is not the owned one', () => {
    const other = avail.proposals.filter(p => p.tankSource === 'new');
    expect(other.length).toBeGreaterThan(0);
    for (const p of other) { expect(p.build.tank.id).not.toBe(own.id); expect(p.tankNote).toMatch(/^A \d+ gal instead: /); expect(p.tankCreditUsd).toBeUndefined(); }
  });
  it('with nothing owned a proposal carries no tank source or note', () => {
    for (const p of none.proposals) { expect(p.tankSource).toBeUndefined(); expect(p.tankNote).toBeUndefined(); }
  });
  it('an Available tank is not offered a setup it cannot hold: the card names the reason, and the Required tank says nothing fits', () => {
    const small = tank(10), animals = [{ species: 'goldfish', n: 4 }];
    const a = go({ constraints: {}, animals, availTank: small }), r = go({ constraints: {}, animals, ownTank: small });
    expect(a.proposals.length).toBeGreaterThan(0);
    for (const p of a.proposals) { expect(p.tankSource).toBe('new'); expect(p.tankNote).toMatch(/your 10 gal is too small/); }
    expect(r.proposals).toEqual([]);
    expect(r.infeasible!.limitingFactor).toBe('tank');
    expect(r.infeasible!.text).toContain('marked Required');
  });
});

describe('the brief decides Required vs Available (GS2 state -> Wants)', () => {
  const own = tank(20);
  const bt = (use: 'required' | 'available'): Brief => setEquipment(emptyBrief(), 'tank', { use, model: own.id });
  it('Required -> ownTank; Available -> availTank; neither sets the other', () => {
    const r = briefToWants(bt('required')), a = briefToWants(bt('available'));
    expect(r.ownTank?.id).toBe(own.id); expect(r.availTank).toBeUndefined();
    expect(a.availTank?.id).toBe(own.id); expect(a.ownTank).toBeUndefined();
  });
  it('owned gear defaults to Available; only gear marked Required is kept', () => {
    const b0 = setEquipment(setEquipment(emptyBrief(), 'heater', { pick: 'care' }), 'filter', { pick: 'care', use: 'required' });
    const w = briefToWants(b0);
    expect(w.requiredOwned).toEqual(['filter']);
    expect(briefToWants(setEquipment(emptyBrief(), 'heater', { pick: 'care' })).requiredOwned).toBeUndefined();
  });
  it('the same brief, one switch: Available gives other tanks, Required does not', () => {
    const ra = again(bt('available')), rr = again(bt('required'));
    expect(ra.proposals.some(p => p.build.tank.id !== own.id)).toBe(true);
    expect(rr.proposals.every(p => p.build.tank.id === own.id)).toBe(true);
  });
});

describe('owned gear: Available is replaced when it does not suit, Required is kept and warned about', () => {
  const tiny = [...HEATER_PRODUCTS].sort((a, b) => a.watts - b.watts)[0];
  const base = go({ constraints: { startupUsd: cap(5000) }, animals: [{ species: 'betta', n: 1 }] }).proposals[0];
  const b = buildsFor(base.build.animals, base.build.tank, NOW).find(x => x.id === base.build.id) ?? base.build;
  const care = ownedAssess(b, { heater: 'care' }, true, P), avail = ownedAssess(b, { heater: tiny.id }, true, P), kept = ownedAssess(b, { heater: tiny.id }, true, P, false, { required: ['heater'] });
  it('Available + too small: not credited, replaced, with the reason', () => {
    expect(avail.saved).toBeLessThan(care.saved);
    expect(avail.notes.some(n => n.kind === 'flag' && /priced instead/.test(n.text))).toBe(true);
  });
  it('Required + too small: kept and credited, with a warning that says so and how to change it', () => {
    expect(kept.saved).toBe(care.saved);
    const n = kept.notes.find(x => x.kind === 'flag')!;
    expect(n.text).toContain('You marked it Required'); expect(n.text).not.toContain('priced instead'); expect(n.text).toContain('mark it Available');
  });
  it('a setup carries Required-gear warnings in its warnings list', () => {
    const r = go({ constraints: { startupUsd: cap(5000) }, animals: [{ species: 'betta', n: 1 }], owned: { heater: tiny.id }, requiredOwned: ['heater'] });
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) expect(p.warnings?.some(x => x.includes('You marked it Required'))).toBe(true);
  });
  it('when Required gear is what leaves nothing, the explanation names it and offers "mark it Available"', () => {
    const w: Wants = { constraints: {}, animals: gold, owned: { filter: 'care' }, requiredOwned: ['filter'] };
    const empty = { off: false, proposals: [], qualified: [], kinds: [], misses: [], stats: { pool: 0, rejectedWelfare: 0, rejectedConstraint: 0 } } as Suggestions;
    const inf = explainInfeasible({ w, misses: [], stats: empty.stats, locked: true, space: undefined, P, units: 'in', now: NOW, run: x => x.requiredOwned?.length ? empty : go(x) });
    expect(inf.limitingFactor).toBe('equipment');
    expect(inf.text).toMatch(/Your filter \(marked Required\)/);
    const alt = inf.alternatives.find(a => a.kind === 'mark-available')!;
    expect(alt.edit).toEqual({ op: 'available', keys: ['filter'] });
    const b2 = applyAlternative(setEquipment(emptyBrief(), 'filter', { pick: 'care', use: 'required' }), alt.edit!);
    expect(briefToWants(b2).requiredOwned).toBeUndefined();
  });
});

describe('flexible limits rank and warn instead of filtering; hard limits still filter', () => {
  const hard: Wants = { constraints: { startupUsd: cap(200) }, animals: gold };
  const flex: Wants = { ...hard, flexLimits: { startupUsd: true } };
  it('hard: nothing at $200 for two goldfish, and the explanation offers "make the budget flexible"', () => {
    const r = go(hard);
    expect(r.proposals).toEqual([]);
    const alt = r.infeasible!.alternatives.find(a => a.kind === 'make-flexible')!;
    expect(alt.edit).toEqual({ op: 'flexible', limits: ['budget'] });
    expect(alt.resultUsd).toBeGreaterThan(200);
    expect(r.infeasible!.text).toContain('set as hard');
  });
  it('flexible: the same request offers setups over the target, each saying by how much, and the card still shows the cap', () => {
    const r = go(flex);
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) {
      const over = Math.round(p.totals.startupUsd - 200);
      expect(over).toBeGreaterThan(0);
      expect(p.warnings).toContain(`Over your $200 setup target by $${over.toLocaleString('en-US')}.`);
      const cp = compliance(p.scene, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, P.limits);
      expect(cp.results.find(x => x.id === 'startup')!.state).toBe('over');
    }
  });
  it('the click "make the budget flexible" writes the kind into the brief and the re-run offers setups', () => {
    const alt = go(hard).infeasible!.alternatives.find(a => a.kind === 'make-flexible')!;
    const b0 = briefFromWants(hard), b1 = applyAlternative(b0, alt.edit!);
    expect(constraintOf(b0, 'startup')).toMatchObject({ kind: 'hard' });
    expect(constraintOf(b1, 'startup')).toMatchObject({ kind: 'flexible', value: 200 });
    expect(again(b0).proposals).toEqual([]);
    expect(again(b1).proposals.length).toBeGreaterThan(0);
  });
  it('an over-target setup ranks below the same setup with the limit out of the way', () => {
    const f = go(flex).cheapest!, h = go({ ...hard, constraints: { startupUsd: cap(5000) } }).cheapest!;
    expect(f.build.tank.id).toBe(h.build.tank.id);
    expect(f.score).toBeLessThan(h.score);
  });
  it('a limit that is not set is unknown: flexible or not, it neither filters nor ranks', () => {
    const a = go({ constraints: {}, animals: gold }), b = go({ constraints: {}, animals: gold, flexLimits: { startupUsd: true, monthlyUsd: true, minPerWeek: true, setupHours: true, space: true } });
    expect(flat(b)).toEqual(flat(a));
    for (const p of b.proposals) expect(p.warnings).toBeUndefined();
  });
  it('a flexible limit that nothing exceeds changes nothing', () => {
    const w: Wants = { constraints: { startupUsd: cap(5000) }, animals: gold };
    expect(flat(go({ ...w, flexLimits: { startupUsd: true } }))).toEqual(flat(go(w)));
  });
  it('flexible monthly and time targets warn too; hard ones filter', () => {
    const w: Wants = { constraints: { monthlyUsd: cap(1), minutesPerWeek: cap(1) }, animals: gold };
    expect(go(w).proposals).toEqual([]);
    const r = go({ ...w, flexLimits: { monthlyUsd: true, minPerWeek: true } });
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) { expect(p.warnings!.some(x => /a month target by/.test(x))).toBe(true); expect(p.warnings!.some(x => /min a week target by/.test(x))).toBe(true); }
  });
  it('a flexible space shows a tank bigger than the space with a warning; a hard space still filters', () => {
    const space = { w: 300, d: 300 }, w: Wants = { constraints: {}, animals: gold, space };
    expect(go(w).proposals).toEqual([]);
    const r = go({ ...w, flexLimits: { space: true } });
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) expect(p.warnings!.some(x => /your space is/.test(x))).toBe(true);
  });
});

describe('the brief: limit kind and Required / Available reach the generator by the GS2 rule', () => {
  const ids: Exclude<ConstraintId, 'experience'>[] = ['startup', 'ongoing', 'setup', 'care', 'space'];
  const key = { startup: 'startupUsd', ongoing: 'monthlyUsd', setup: 'setupHours', care: 'minPerWeek', space: 'space' } as const;
  it('flexLimits equals constraintOf(kind) for every limit, and an unknown limit is neither', () => {
    for (const kind of ['hard', 'flexible'] as const) {
      let b = emptyBrief();
      for (const id of ids) b = setConstraint(b, id, id === 'space' ? { w: 30, d: 12 } : 10, kind);
      const fl = briefToWants(b).flexLimits ?? {};
      for (const id of ids) expect(!!fl[key[id]], `${kind} ${id}`).toBe(constraintOf(b, id).unknown === false && (constraintOf(b, id) as { kind: string }).kind === 'flexible');
    }
    expect(briefToWants(emptyBrief()).flexLimits).toBeUndefined();
  });
  it('typed limits take the per-constraint default kind (Nathan 2026-11-02: a budget is a flexible target, space is firm)', () => {
    expect(briefToWants(setConstraint(emptyBrief(), 'startup', 300)).flexLimits).toEqual({ startupUsd: true });
    expect(briefToWants(setConstraint(emptyBrief(), 'startup', 300, 'hard')).flexLimits).toBeUndefined();
  });
});

describe('tank list still has room for the owned tank only when it holds the animals', () => {
  it('the owned tank is a candidate only when it passes the stocking rules (never resized, never forced)', () => {
    const animals = [{ species: 'goldfish', n: 4 }], small = tank(10);
    expect(tankOptions(animals).some(t => t.tank.id === small.id && !t.fails.length)).toBe(false);
  });
});
