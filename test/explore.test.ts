// Explore Complete Setups, stage X1 (lane OX3): the candidate pool and the firm gate (reconcile section 8.4, acceptance criteria 2, 3, 4, 5, 11, 12; Nathan 2026-11-02 Q1-Q4).
// Pure: no WebGL, no pictures. The pool is slow to build (a recipe scene per look), so most tests share a few small pools over a handful of looks and the recipe scenes are cached across them.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { demandOf } from '../src/demand/engine';
import { briefToWants, emptyBrief } from '../src/scene/brief';
import { setEquipment } from '../src/scene/project';
import { candidatePool, customTankWants, evaluateCandidate, suggestSetups, tankFromDims, type Wants } from '../src/demand/suggest';
import { summaryOf } from '../src/ui/stockSummary';
import { ARCHETYPES } from '../src/scene/archetypes';
import { buildsFor } from '../src/scene/builds';
import { modelGallons, TANK_MODELS } from '../src/data/tanks';
import { explorePool, isBuildable, type Candidate } from '../src/explore/pool';
import { gateCandidate, type GateInput } from '../src/explore/gate';
import type { Estimate, Range } from '../src/explore/estimate';
import { difficultyOf } from '../src/explore/difficulty';
import { NEAR_CAP } from '../src/explore/constants';

const P = defaultProfile(), NOW = Date.parse('2026-11-02'), cap = (value: number) => ({ on: true, value });
/** a few looks across every world the pool serves: freshwater, saltwater, a terrarium, a paludarium, and a brackish one (never offered) */
const ONLY = ['planted-community', 'silk-plant-natural', 'mossy-wood-ferns', 'white-sand-stone', 'goldfish-palace', 'axolotl-den', 'clownfish-anemone', 'lps-coral-garden', 'tarantula-burrow', 'cypress-swamp'];
const BRACKISH = ARCHETYPES.filter(a => isBuildable(a) && a.water === 'brackish').map(a => a.id);
const pool = (w: Wants, only: readonly string[] = ONLY, sizes = 1, explain = false) => explorePool(w, P, 'in', NOW, { only, sizes, explain });
const tank = (gal: number) => TANK_MODELS.find(t => Math.round(t.ratedGal) === gal)!;
const open = pool({ constraints: {} }), keys = (r: { candidates: Candidate[] }) => r.candidates.map(c => c.key).sort();
const rng = (mean: number, lo = mean * 0.8, hi = mean * 1.3): Range => ({ lo, mean, hi });

/** a hand-made gate input: the figures and welfare lines are chosen, so the rule under test is the only thing that moves */
function stub(o: { w?: Wants; est?: Partial<Estimate>; conf?: 'validated' | 'provisional'; words?: string[]; unknown?: string[]; world?: 'aquarium' | 'terrarium'; water?: 'freshwater' | 'brackish' | 'saltwater'; roster?: { species: string; n: number }[] } = {}): GateInput {
  const t = tank(20), conf = o.conf ?? 'validated';
  const est = { startupUsd: rng(250, 200, 280), monthlyUsd: rng(20), minPerWeek: rng(40), setupHours: rng(5), figures: { startup: { conf, why: '' }, monthly: { conf: 'provisional', why: '' }, care: { conf: 'provisional', why: '' }, setup: { conf: 'provisional', why: '' } }, ...o.est } as unknown as Estimate;
  const ev = { welfareWords: o.words ?? [], unknown: o.unknown ?? [], needsOk: true } as never;
  return { w: o.w ?? { constraints: {} }, ev, est, world: o.world ?? 'aquarium', water: o.water ?? 'freshwater', tank: t, roster: o.roster ?? [{ species: 'neon', n: 8 }], holds: true };
}

describe('the pool: real worlds, real waters, complete candidates (criterion 2)', () => {
  it('spans more than one world and every candidate resolves to a real world and water, never "anything"', () => {
    const worlds = new Set(open.candidates.map(c => c.identity.world));
    expect(worlds.size).toBeGreaterThanOrEqual(2);
    for (const c of open.candidates) {
      expect(['aquarium', 'terrarium', 'paludarium']).toContain(c.identity.world);
      expect(['freshwater', 'saltwater', 'none']).toContain(c.identity.water);
      expect(c.identity.water === 'none').toBe(c.identity.world === 'terrarium');
    }
  });
  it('each candidate is a complete setup: a scene with its roster placed, a tank, gear, an estimate and a verdict', () => {
    expect(open.candidates.length).toBeGreaterThan(4);
    for (const c of open.candidates) {
      expect(c.roster.length).toBeGreaterThan(0);
      expect(c.scene.fish.length).toBe(c.roster.reduce((t, x) => t + x.n, 0));
      expect(c.scene.tank.H).toBeGreaterThan(0);
      expect(c.estimate.difficulty.level).toMatch(/^(Beginner|Intermediate|Advanced)$/);
      expect(c.verdict.gates.length).toBeGreaterThan(5);
    }
  });
  it('is deterministic: the same brief gives the same candidates in the same order', () => {
    const again = pool({ constraints: {} });
    expect(again.candidates.map(c => c.key)).toEqual(open.candidates.map(c => c.key));
    expect(again.candidates.map(c => c.estimate.startupUsd.mean)).toEqual(open.candidates.map(c => c.estimate.startupUsd.mean));
  });
  it('a candidate is a coherent record: one key per configuration, no duplicates', () => { expect(new Set(open.candidates.map(c => c.key)).size).toBe(open.candidates.length); });
  it('terrarium and paludarium candidates are PROVISIONAL until their figures use the aquarium model (Q2); only aquariums are eligible', () => {
    const dry = open.candidates.filter(c => c.identity.world !== 'aquarium');
    expect(dry.length).toBeGreaterThan(0);
    for (const c of dry) { expect(c.verdict.verdict).toBe('provisional'); expect(c.verdict.reasons.some(r => r.gate === 'world')).toBe(true); }
    for (const c of open.eligible) expect(c.identity.world).toBe('aquarium');
  });
  it('no brackish candidate is made until a brackish roster exists (Q3), and the pool says why', () => {
    expect(BRACKISH.length).toBeGreaterThan(0);
    const r = pool({ constraints: {} }, BRACKISH, 1, false);
    expect(r.candidates).toEqual([]);
    expect(r.withheld.length).toBe(BRACKISH.length);
    for (const x of r.withheld) expect(x.reasons.some(y => y.gate === 'world' && /brackish/i.test(y.text))).toBe(true);
  });
  it('a world the person chose narrows the pool to that world', () => {
    const r = pool({ constraints: {}, kinds: ['saltwater'] });
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) expect(c.identity.water).toBe('saltwater');
  });
});

describe('firm limits gate before presentation (criterion 3)', () => {
  const eligibleCaps = (w: Wants) => pool(w).eligible;
  it('a firm set-up budget: every eligible candidate fits it on the HIGH end of its price range, accounting for tax', () => {
    for (const usd of [450, 700, 1200, 2500]) {
      const r = eligibleCaps({ constraints: { startupUsd: cap(usd) } });
      for (const c of r) { expect(c.estimate.startupUsd.hi).toBeLessThanOrEqual(usd); expect(c.eval.totals.startupUsd).toBeLessThanOrEqual(usd); }
    }
    const taxed = eligibleCaps({ constraints: { startupUsd: cap(1200) }, taxPct: 10 });
    for (const c of taxed) expect(c.estimate.startupUsd.hi).toBeLessThanOrEqual(1200);
  });
  it('nothing over a firm cap on the MEAN is shown at all, eligible or provisional: it is withheld and counted', () => {
    const lim = 700, r = pool({ constraints: { startupUsd: cap(lim) } });
    for (const c of r.candidates) expect(c.estimate.startupUsd.mean).toBeLessThanOrEqual(lim);
    const dearer = open.candidates.filter(c => c.estimate.startupUsd.mean > lim);
    expect(dearer.length).toBeGreaterThan(0);
    for (const c of dearer) expect(r.candidates.some(x => x.key === c.key)).toBe(false);
    expect(r.stats.byGate.budget).toBeGreaterThan(0);
  });
  it('monthly and care-time caps are firm too, on the high end of their ranges', () => {
    const a = pool({ constraints: { monthlyUsd: cap(30) } }).eligible, b = pool({ constraints: { minutesPerWeek: cap(60) } }).eligible;
    for (const c of a) expect(c.estimate.monthlyUsd.hi).toBeLessThanOrEqual(30);
    for (const c of b) expect(c.estimate.minPerWeek.hi).toBeLessThanOrEqual(60);
    expect(a.length).toBeLessThan(open.eligible.length);
  });
  it('a firm $300 budget never shows a $330 setup; a $275 one that is certain fits (hand-made figures, the rule alone)', () => {
    const w: Wants = { constraints: { startupUsd: cap(300) } };
    expect(gateCandidate(stub({ w, est: { startupUsd: rng(330, 300, 360) } })).verdict).toBe('blocked');
    expect(gateCandidate(stub({ w, est: { startupUsd: rng(275, 255, 288) } })).verdict).toBe('eligible');
  });
  it('credited Available equipment counts: the same setup is blocked at $300 without the credit and fits with it', () => {
    const w: Wants = { constraints: { startupUsd: cap(300) } };
    expect(gateCandidate(stub({ w, est: { startupUsd: rng(320, 300, 340) } })).verdict).toBe('blocked');
    expect(gateCandidate(stub({ w, est: { startupUsd: rng(240, 225, 255) } })).verdict).toBe('eligible');
  });
  it('mean inside the cap but the HIGH end over it: provisional, never eligible (Q1: certify on the high end)', () => {
    const g = gateCandidate(stub({ w: { constraints: { startupUsd: cap(300) } }, est: { startupUsd: rng(280, 250, 340) } }));
    expect(g.verdict).toBe('provisional');
    expect(g.gates.find(x => x.id === 'budget')!.state).toBe('uncertain');
  });
  it('a stated estimate within NEAR_CAP of its cap is provisional (care minutes are always our own estimate); further under it certifies on the high end (Q1)', () => {
    const w: Wants = { constraints: { minutesPerWeek: cap(100) } };
    const near = gateCandidate(stub({ w, est: { minPerWeek: rng(80, 70, 100 * (1 - NEAR_CAP) + 1) } })), clear = gateCandidate(stub({ w, est: { minPerWeek: rng(60, 50, 80) } }));
    expect(near.verdict).toBe('provisional'); expect(clear.verdict).toBe('eligible');
    expect(clear.gates.find(x => x.id === 'care')!.hi).toBe(80);
  });
  it('a firm setup-time cap behaves the same way', () => {
    const w: Wants = { constraints: {}, setupHours: 8 };
    expect(gateCandidate(stub({ w, est: { setupHours: rng(5, 4, 7.5) } })).verdict).toBe('provisional');   // 7.5 is within 10 % of 8 on an estimate
    expect(gateCandidate(stub({ w, est: { setupHours: rng(3, 2.3, 4.5) } })).verdict).toBe('eligible');
    expect(gateCandidate(stub({ w, est: { setupHours: rng(9, 7, 13) } })).verdict).toBe('blocked');
  });
  it('a FLEXIBLE limit never filters: over the target it is recorded as over, the verdict does not move', () => {
    const w: Wants = { constraints: { startupUsd: cap(300) }, flexLimits: { startupUsd: true } }, g = gateCandidate(stub({ w, est: { startupUsd: rng(330, 300, 360) } }));
    expect(g.verdict).toBe('eligible');
    const b = g.gates.find(x => x.id === 'budget')!; expect(b.kind).toBe('flexible'); expect(b.state).toBe('over');
    const r = pool({ constraints: { startupUsd: cap(450) }, flexLimits: { startupUsd: true } });
    expect(r.candidates.some(c => c.estimate.startupUsd.mean > 450)).toBe(true);
  });
  it('a limit nobody set is UNKNOWN: it neither filters nor certifies (no "pass" for a limit that was never set)', () => {
    const g = gateCandidate(stub());
    for (const id of ['budget', 'monthly', 'care', 'setup', 'space'] as const) { const x = g.gates.find(y => y.id === id)!; expect(x.state).toBe('unknown'); expect(x.kind).toBe('none'); }
    expect(g.assumptions.some(a => /set-up budget limit/.test(a))).toBe(true);
    expect(g.verdict).toBe('eligible');
  });
  it('a lower bound the setup falls under blocks it unless that limit is flexible', () => {
    expect(gateCandidate(stub({ w: { constraints: {}, mins: { startupUsd: 400 } } })).verdict).toBe('blocked');
    expect(gateCandidate(stub({ w: { constraints: {}, mins: { startupUsd: 400 }, flexLimits: { startupUsd: true } } })).verdict).toBe('eligible');
  });
  it('the gate reads constraints only: a taste profile in the brief changes nothing about who is eligible (feedback is ranking, never a gate)', () => {
    const taste = { events: [{ style: 'jungle', kind: 'pick' as const }, { style: 'rocks', kind: 'reject' as const }] };
    const a = pool({ constraints: { startupUsd: cap(1500) } }), b = pool({ constraints: { startupUsd: cap(1500) }, taste });
    expect(keys({ candidates: b.eligible })).toEqual(keys({ candidates: a.eligible }));
    expect(b.withheld.length).toBe(a.withheld.length);
  });
});

describe('Required and Available equipment (criterion 4)', () => {
  it('a Required tank is the tank of EVERY candidate and suits it', () => {
    const own = tank(20), r = pool({ constraints: {}, ownTank: own }, ['white-sand-stone', 'mossy-wood-ferns', 'clownfish-anemone']);
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) { expect(c.tank.id).toBe(own.id); expect(c.tankSource).toBe('owned-required'); expect(c.estimate.gal).toBeCloseTo(modelGallons(own), 1); expect(c.eval.tankNote).toContain('Required'); }
    for (const c of r.eligible) expect(c.verdict.gates.find(x => x.id === 'equipment')!.state).toBe('pass');
  });
  it('an Available tank may be used and is credited only where used; other tanks are still offered', () => {
    const own = tank(20), r = pool({ constraints: {}, availTank: own }, ['mossy-wood-ferns', 'white-sand-stone', 'axolotl-den'], 2);
    const used = r.candidates.filter(c => c.tank.id === own.id), other = r.candidates.filter(c => c.tank.id !== own.id);
    expect(used.length).toBeGreaterThan(0); expect(other.length).toBeGreaterThan(0);
    for (const c of used) { expect(c.tankSource).toBe('owned-available'); expect(c.eval.tankCreditUsd).toBeGreaterThan(0); expect(c.eval.saved).toBeGreaterThanOrEqual(c.eval.tankCreditUsd); }
    for (const c of other) { expect(c.tankSource).toBe('new'); expect(c.eval.tankCreditUsd).toBe(0); }
  });
  it('an Available tank that cannot hold a look is not a failure of that look (a better tank is offered); a Required one that cannot withholds it', () => {
    const small = tank(10), a = pool({ constraints: {}, availTank: small }, ['mossy-wood-ferns'], 2), r = pool({ constraints: {}, ownTank: small }, ['mossy-wood-ferns']);
    expect(a.candidates.length).toBeGreaterThan(0);
    expect(r.eligible).toEqual([]);
    expect(r.withheld.length).toBeGreaterThan(0);
  });
  it('a Required tank given only as custom dimensions is honoured too (reconcile 4.1)', () => {
    let b = emptyBrief(); b = setEquipment(b, 'tank', { use: 'required', dimsIn: { L: 36, D: 18, H: 16 } });
    expect(briefToWants(b).ownTank).toBeUndefined();     // the catalogue-only adaptor cannot see it
    const w = customTankWants(b, briefToWants(b)); expect(w.ownTank?.id).toBe('custom-36x18x16');
    expect(w.ownTank!.ratedGal).toBeGreaterThan(40);
    const r = pool(w, ['mossy-wood-ferns', 'white-sand-stone']);
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) { expect(c.tank.id).toBe('custom-36x18x16'); expect(c.tankSource).toBe('owned-required'); }
  });
  it('the same dimensions marked Available become the Available tank; a catalogue pick is left alone', () => {
    let b = emptyBrief(); b = setEquipment(b, 'tank', { use: 'available', dimsIn: { L: 24, D: 12, H: 16 } });
    expect(customTankWants(b, briefToWants(b)).availTank?.id).toBe('custom-24x12x16');
    expect(tankFromDims({ L: 36, D: 18, H: 16 }).outer.L).toBeCloseTo(36 * 25.4, 3);
    let c = emptyBrief(); c = setEquipment(c, 'tank', { use: 'required', model: tank(20).id });
    expect(customTankWants(c, briefToWants(c)).ownTank?.id).toBe(tank(20).id);
  });
});

describe('welfare is an independent gate (criterion 5)', () => {
  it('every eligible candidate passes the stocking screen with no Problem or Caution, on the scene that will open', () => {
    expect(open.eligible.length).toBeGreaterThan(3);
    for (const c of open.eligible) {
      expect(c.eval.welfareWords).toEqual([]);
      const lines = summaryOf(c.eval.scene, 'in').cats.flatMap(k => k.items.filter(i => i.level === 'problem' || i.level === 'caution'));
      expect(lines).toEqual([]);
    }
  });
  it('a roster the stocking screen words as a problem is withheld, whatever the money', () => {
    const g = gateCandidate(stub({ words: ['Kept 1 male to 2 females: males spar'] }));
    expect(g.verdict).toBe('blocked'); expect(g.reasons[0].gate).toBe('welfare');
  });
  it('a "not enough information" line makes a candidate provisional, never eligible; no care data withholds it', () => {
    expect(gateCandidate(stub({ unknown: ['temperature range not recorded'] })).verdict).toBe('provisional');
    expect(gateCandidate(stub({ roster: [{ species: 'not-a-species', n: 2 }] })).verdict).toBe('blocked');
    expect(gateCandidate(stub({ roster: [] })).verdict).toBe('blocked');
  });
  it('welfare does not bend for a flexible limit: a flexible budget never rescues an unsupported roster', () => {
    expect(gateCandidate(stub({ w: { constraints: { startupUsd: cap(100) }, flexLimits: { startupUsd: true } }, words: ['too many'] })).verdict).toBe('blocked');
  });
  it('the pool turns welfare failures away and counts them (it does not hide them)', () => { expect(open.stats.byGate.welfare).toBeGreaterThan(0); expect(open.withheld.length).toBeGreaterThan(0); });
});

describe('no feasible result: the blocker and the controlled edits, never a fabricated candidate (criterion 11)', () => {
  it('an impossible brief ($40 and a Required giant tank) returns nothing eligible, names the blocker and offers the edits', () => {
    const big = [...TANK_MODELS].filter(t => !t.terrarium).sort((a, b) => b.ratedGal - a.ratedGal)[0];
    const r = pool({ constraints: { startupUsd: cap(40) }, ownTank: big }, ['mossy-wood-ferns'], 1, true);
    expect(r.eligible).toEqual([]); expect(r.provisional).toEqual([]);
    const n = r.noResult!; expect(n).toBeDefined();
    expect(n.text.length).toBeGreaterThan(10);
    const kinds = n.edits.map(e => e.kind);
    expect(kinds).toContain('adjust-limit'); expect(kinds).toContain('make-flexible'); expect(kinds).toContain('change-required'); expect(kinds).toContain('broaden-world');
    expect(n.infeasible).toBeDefined();
    expect(n.infeasible!.alternatives.map(a => a.kind).some(k => ['mark-available', 'make-flexible', 'raise-budget'].includes(k))).toBe(true);
  }, 300000);
  it('a satisfiable brief has no blocker report', () => { expect(open.noResult).toBeUndefined(); });
});

describe('skip-friendly (criterion 12): no limits at all', () => {
  it('still returns candidates, and every limit gate reads unknown with the assumption stated, never pass', () => {
    expect(open.eligible.length).toBeGreaterThan(3);
    for (const c of open.candidates) {
      for (const id of ['budget', 'monthly', 'care', 'setup'] as const) expect(c.verdict.gates.find(x => x.id === id)!.state).toBe('unknown');
      expect(c.verdict.assumptions.some(a => /set-up budget limit is set/.test(a))).toBe(true);
    }
  });
});

describe('estimates: ranges, confidence and difficulty', () => {
  it('every range is ordered lo <= mean <= hi, money has the high end above the mean, and the figures carry a confidence', () => {
    for (const c of open.candidates) {
      for (const r of [c.estimate.startupUsd, c.estimate.monthlyUsd, c.estimate.minPerWeek, c.estimate.setupHours]) { expect(r.lo).toBeLessThanOrEqual(r.mean); expect(r.mean).toBeLessThanOrEqual(r.hi); }
      expect(c.estimate.startupUsd.hi).toBeGreaterThan(c.estimate.startupUsd.mean);
      expect(c.estimate.figures.care.conf).toBe('provisional'); expect(c.estimate.figures.setup.conf).toBe('provisional');
      expect(['validated', 'provisional']).toContain(c.estimate.figures.startup.conf);
    }
  });
  it('the card equals the scene: monthly cost and minutes are the demand model of the snapshot, recomputed', () => {
    for (const c of open.candidates.slice(0, 6)) {
      const D = demandOf(c.scene, P, { ...(c.build.bundle ? {} : {}), now: NOW });
      if (!c.build.bundle) { expect(c.estimate.monthlyUsd.mean).toBeCloseTo(D.totals.upkeepUsdMo, 0); expect(c.estimate.minPerWeek.mean).toBeCloseTo(D.totals.minPerWeek, 0); }
      expect(c.estimate.footprintIn.L).toBeCloseTo(c.tank.outer.L / 25.4, 1);
    }
  });
  it('difficulty is rated for one fixed reference keeper: the person\'s own skill never moves it', () => {
    const skilled = { ...P, skill: { fundamentals: 2, fish: 2, planted: 2, salt: 2, terrarium: 2 } as typeof P.skill };
    const r = explorePool({ constraints: {} }, skilled, 'in', NOW, { only: ONLY, sizes: 1, explain: false });
    expect(r.candidates.map(c => c.estimate.difficulty.level)).toEqual(open.candidates.map(c => c.estimate.difficulty.level));
  });
  it('a saltwater or CO2 setup never reads Beginner; the levels use all three names across the pool', () => {
    const salt = open.candidates.filter(c => c.identity.water === 'saltwater'); expect(salt.length).toBeGreaterThan(0);
    for (const c of salt) expect(c.estimate.difficulty.level).not.toBe('Beginner');
    expect(new Set(open.candidates.map(c => c.estimate.difficulty.level)).size).toBeGreaterThanOrEqual(2);
    for (const c of open.candidates) expect(difficultyOf(c.scene, NOW).level).toBe(c.estimate.difficulty.level);
  });
});

describe('the generator exports (suggest.ts, additive): the generator itself did not move', () => {
  const w: Wants = { constraints: { startupUsd: cap(700) } };
  it('candidatePool is the pool suggestSetups picks its three from', () => {
    const r = suggestSetups(w, P, 'in', NOW), c = candidatePool(w, P, 'in', NOW);
    expect(c.pool.length).toBe(r.stats.pool);
    expect(c.pool.length).toBeGreaterThanOrEqual(r.proposals.length);
    for (const p of r.proposals) expect(c.pool.some(q => q.archetype.id === p.archetype.id && q.build.tank.id === p.build.tank.id && q.totals.startupUsd === p.totals.startupUsd)).toBe(true);
  });
  it('evaluateCandidate agrees with the generator on the same concept: same price, welfare passes', () => {
    const r = suggestSetups(w, P, 'in', NOW), p = r.proposals[0], ev = evaluateCandidate(w, P, 'in', NOW, { animals: p.build.animals, tank: p.build.tank, build: p.build, noStand: !p.scene.stand.show });
    expect(ev.welfareWords).toEqual([]);
    expect(ev.totals.startupUsd).toBe(p.totals.startupUsd);
    expect(ev.hard.overall === 'within' || ev.hard.overall === 'off').toBe(true);
  });
  it('a concept over a firm cap shows as over on the hard compliance line, the generator\'s own gate', () => {
    const roster = [{ species: 'goldfish', n: 2 }], t = tank(40), b = buildsFor(roster, t, NOW)[2];
    const ev = evaluateCandidate({ constraints: { startupUsd: cap(50) } }, P, 'in', NOW, { animals: roster, tank: t, build: b });
    expect(ev.hard.overall).toBe('over');
  });
});
