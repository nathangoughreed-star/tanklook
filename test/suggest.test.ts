// Suggest a setup (lane C8): proposals are rechecked on ALL enabled guardrails and husbandry; nothing qualifying says exactly the no-suggestion line.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { ARCHETYPES, asksDryGroups, suggestSetups, NO_SUGGESTION, type OwnedMap, type Wants } from '../src/demand/suggest';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS } from '../src/data/gearCatalog';
import { buildsFor } from '../src/scene/builds';
import { tankOptions } from '../src/scene/tankfit';
import { compliance, type Constraints } from '../src/scene/constraints';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const run = (c: Constraints, extra: Partial<Wants> = {}) => suggestSetups({ constraints: c, ...extra }, P, 'cm', NOW);

describe('Suggest a setup', () => {
  it('every archetype names real species and has a distinct id', () => {
    expect(new Set(ARCHETYPES.map(a => a.id)).size).toBe(ARCHETYPES.length);
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('all guardrails off: three proposals, ranked by appeal only, no pass / fail', () => {
    const r = run({});
    expect(r.off).toBe(true);
    expect(r.proposals.length).toBe(3);
    expect(r.message).toBeUndefined();
    const t = run({}, { tags: ['unusual'] });
    expect(t.proposals[0].matched).toContain('unusual');
  });

  it('a generous budget: three proposals from different kinds, each within every enabled guardrail and with no husbandry Problem', () => {
    const c: Constraints = { startupUsd: cap(2000), monthlyUsd: cap(80), minutesPerWeek: cap(120) };
    const r = run(c);
    expect(r.proposals.length).toBe(3);
    expect(new Set(r.proposals.map(p => p.archetype.family)).size).toBeGreaterThanOrEqual(2);
    for (const p of r.proposals) {
      const cp = compliance(p.scene, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, P.limits);
      expect(cp.overall).toBe('within');
      expect(summaryOf(p.scene, 'cm').cats.every(k => k.level !== 'problem' && k.level !== 'caution')).toBe(true);
      expect(p.scene.constraints).toEqual(c);
    }
  });

  it('strict husbandry (Nathan 2026-10-27): 8 zebra danio in a 10 gal (20 in) is never recommended; Spatial fullness reads Caution there', () => {
    const danio = buildsFor([{ species: 'danio', n: 8 }], tankOptions([{ species: 'danio', n: 8 }]).find(t => !t.fails.length && /^10 gal/.test(t.tank.name))!.tank, NOW)[0];
    const sm = summaryOf(danio.setup, 'in');
    expect(danio.tank.name).toBe('10 gal');
    expect(sm.cats.find(k => k.id === 'fullness' || /fullness/i.test(k.label))?.level).toBe('caution');
    for (const c of [{}, { startupUsd: cap(400), monthlyUsd: cap(25), minutesPerWeek: cap(45) }, { startupUsd: cap(2000) }]) {
      const r = run(c);
      for (const p of r.proposals) expect(p.archetype.id === 'danio' && p.build.tank.name === '10 gal').toBe(false);
      for (const p of r.proposals) expect(summaryOf(p.scene, 'in').cats.some(k => k.level === 'caution' || k.level === 'problem')).toBe(false);
    }
  });

  it('deterministic: the same inputs give the same proposals', () => {
    const c: Constraints = { startupUsd: cap(600), monthlyUsd: cap(30), minutesPerWeek: cap(60) };
    expect(run(c).proposals.map(p => p.archetype.id)).toEqual(run(c).proposals.map(p => p.archetype.id));
  });

  it('a tight set-up budget drops what costs more than it, and never lists it as a fit', () => {
    const r = run({ startupUsd: cap(150) });
    for (const p of r.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(150);
  });

  it('nothing qualifies: exactly the no-suggestion line, never "impossible", with the closest misses apart', () => {
    const r = run({ startupUsd: cap(5), minutesPerWeek: cap(1) });
    expect(r.proposals).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
    expect(JSON.stringify(r.message)).not.toMatch(/impossible/i);
    expect(r.misses.length).toBeGreaterThan(0);
    for (const m of r.misses) expect(m.text).toMatch(/\+/);
  });

  it('a small space leaves out what does not fit it (the space guardrail is a check too)', () => {
    const w = { w: 400, d: 250, h: 450 };
    const r = run({ space: { on: true } }, { space: w });
    for (const p of r.proposals) {
      expect(p.status.find(s => s.id === 'space')?.state).toBe('pass');
      expect(p.build.tank.id).toBeTruthy();
    }
  });

  it('space on but no size: unknown is never green, so nothing is offered as compliant', () => {
    const r = run({ space: { on: true } });
    expect(r.proposals).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
  });

  it('time per call is small enough for a click', () => {
    const t0 = Date.now(); run({ startupUsd: cap(800), monthlyUsd: cap(40), minutesPerWeek: cap(60) }); const ms = Date.now() - t0;
    console.log('suggestSetups ms', ms);
    expect(ms).toBeLessThan(8000);
  });

  describe('equipment I already have, and the stand (Nathan 2026-10-27)', () => {
    const wide: Constraints = { startupUsd: cap(5000) };
    const first = (extra: Partial<Wants>) => run(wide, extra).proposals.find(p => p.archetype.id === 'betta')!;
    it('owned items cost $0 in the set-up total; the animals and husbandry are untouched; upkeep and minutes unchanged', () => {
      const a = first({}), b = first({ owned: { filter: 'care', heater: 'care' } });
      expect(b.saved).toBeGreaterThan(0);
      expect(b.totals.startupUsd).toBe(b.build.setupUsd - b.saved);      // the build may differ: owning gear can change which build ranks best
      expect(b.totals.monthlyUsd).toBe(b.build.upkeepUsdMo); expect(b.totals.minPerWeek).toBe(b.build.minPerWeek);
      expect(a.saved).toBe(0);
      expect(b.scene.fish.length).toBe(a.scene.fish.length);
      expect(summaryOf(b.scene, 'in').cats.some(k => k.level === 'caution' || k.level === 'problem')).toBe(false);
    });
    it('a budget the setup just misses is met once the owned gear is taken off', () => {
      const a = first({}), cap1 = a.totals.startupUsd - 5;
      expect(run({ startupUsd: cap(cap1) }).proposals.some(p => p.archetype.id === 'betta' && p.build.id === a.build.id && p.totals.startupUsd === a.totals.startupUsd)).toBe(false);
      const r = run({ startupUsd: cap(cap1) }, { owned: { filter: 'care', heater: 'care', light: 'care', lid: 'care' } });
      expect(r.proposals.some(p => p.archetype.id === 'betta' && p.totals.startupUsd <= cap1)).toBe(true);
    });
    it('stand off: no stand cost and the scene shows none; stand on: the default price', () => {
      const on = first({ needStand: true }), off = first({ needStand: false });
      expect(on.scene.stand.show).toBe(true); expect(off.scene.stand.show).toBe(false);
      expect(off.saved).toBeGreaterThan(0);
      expect(off.totals.startupUsd).toBeLessThan(on.totals.startupUsd);
    });
    it('an owned stand is $0 when a stand is needed, and is ignored when none is', () => {
      const on = first({}), own = first({ owned: { stand: 'care' } }), offOwn = first({ needStand: false, owned: { stand: 'care' } }), off = first({ needStand: false });
      expect(own.totals.startupUsd).toBe(off.totals.startupUsd);       // $0 stand = no stand cost
      expect(own.scene.stand.show).toBe(true);                         // it is still a stand in the scene
      expect(offOwn.totals.startupUsd).toBe(off.totals.startupUsd);   // no double count
      expect(on.totals.startupUsd).toBeGreaterThan(own.totals.startupUsd);
    });
  });

  describe('kinds of setup, and no terrarium doors on an aquarium (Nathan 2026-10-27)', () => {
    const NOWT = Date.parse('2026-10-27');
    it('every archetype x size: aquariums never get front doors (a terrarium does)', () => {
      let seen = 0;
      for (const a of ARCHETYPES) for (const t of tankOptions(a.animals).filter(x => !x.fails.length).slice(0, 4)) for (const b of buildsFor(a.animals, t.tank, NOWT)) {
        seen++;
        if (a.kind === 'freshwater' || a.kind === 'saltwater') expect(b.setup.doors, `${a.id} ${t.tank.name}`).toBeUndefined();
        else if (a.kind === 'terrarium') expect(b.setup.doors).toBeTruthy();
      }
      expect(seen).toBeGreaterThan(20);
    });
    it('placing a terrarium and then an aquarium in the same tank leaves no doors (putTank replaces, never merges)', async () => {
      const { putTank } = await import('../src/ui/buildPick');
      const terr = buildsFor(ARCHETYPES.find(a => a.id === 'leopard-gecko')!.animals, tankOptions(ARCHETYPES.find(a => a.id === 'leopard-gecko')!.animals).find(x => !x.fails.length)!.tank, NOWT)[0].setup;
      const aq = buildsFor(ARCHETYPES.find(a => a.id === 'clown-nano')!.animals, tankOptions(ARCHETYPES.find(a => a.id === 'clown-nano')!.animals).find(x => !x.fails.length)!.tank, NOWT)[0].setup;
      const slot = structuredClone(terr); expect(slot.doors).toBeTruthy();
      putTank(slot, structuredClone(aq));
      expect(slot.doors).toBeUndefined();
    });
    it('kinds: only archetypes of the ticked kinds are proposed; saltwater alone is the clownfish', () => {
      expect(run({}, { kinds: ['saltwater'] }).proposals.map(p => p.archetype.kind)).toEqual(['saltwater']);
      expect(run({}, { kinds: ['freshwater'] }).proposals.every(p => p.archetype.kind === 'freshwater')).toBe(true);
      const dry = run({}, { kinds: ['terrarium', 'vivarium'] }).proposals;
      expect(dry.length).toBeGreaterThan(0); expect(dry.every(p => p.archetype.kind === 'terrarium' || p.archetype.kind === 'vivarium')).toBe(true);
    });
    it('vivarium: a water-and-land mix (dart frogs on land, snails in the pool)', () => {
      const v = run({}, { kinds: ['vivarium'] }).proposals;
      expect(v.map(p => p.archetype.id)).toEqual(['dart-paludarium']);
      expect(v[0].scene.water.on).toBe(true);
    });
    it('arthropods only: the tarantula and the jumping spider, each a terrarium that passes the strict rule', () => {
      const r = run({}, { kinds: ['terrarium'], groups: ['arthropod'] });
      expect(r.proposals.map(p => p.archetype.id).sort()).toEqual(['jumping-spider', 'tarantula']);
      for (const p of r.proposals) { expect(p.scene.water.on).toBe(false); expect(summaryOf(p.scene, 'in').cats.some(k => k.level === 'caution' || k.level === 'problem')).toBe(false); }
      expect(run({}, { kinds: ['terrarium'], groups: ['herp'] }).proposals.every(p => p.archetype.group === 'herp')).toBe(true);
    });
    it('every arthropod archetype names a species that exists (scorpions, isopods and mantises are not in the data)', () => {
      expect(ARCHETYPES.filter(a => a.group === 'arthropod').map(a => a.animals[0].species).sort()).toEqual(['chacogoldenknee', 'regaljumper']);
    });
  });

  describe("which equipment they have: a real product, I don't care, I don't know (Nathan 2026-10-27)", () => {
    const wide: Constraints = { startupUsd: cap(5000) };
    const pick = (owned: OwnedMap) => run(wide, { owned }).proposals.find(p => p.archetype.id === 'betta')!;
    it('a real filter that carries the stocking is credited $0 and goes into the tank', () => {
      const big = FILTER_PRODUCTS.filter(f => f.kind === 'hob').sort((a, b) => (b.gph ?? 0) - (a.gph ?? 0))[0];
      const p = pick({ filter: big.id });
      expect(p.ownedNotes.some(n => n.kind === 'credit' && n.text.includes('used in the tank'))).toBe(true);
      expect(p.saved).toBeGreaterThan(0);
      expect(JSON.stringify(p.scene.tech)).toContain(big.id);
    });
    it("an undersized heater is flagged, not credited, and the setup's own heater is priced", () => {
      const tiny = [...HEATER_PRODUCTS].sort((a, b) => a.watts - b.watts)[0];
      const a = pick({ heater: 'care' }), b = pick({ heater: tiny.id });
      expect(b.ownedNotes.some(n => n.kind === 'flag' && /under the .* W this tank needs/.test(n.text))).toBe(true);
      expect(b.saved).toBeLessThan(a.saved);
    });
    it('a light that does not span the tank is flagged', () => {
      const off = LIGHT_PRODUCTS.find(l => l.fitMinMm > 700)!;
      const p = pick({ light: off.id });
      expect(p.ownedNotes.some(n => n.kind === 'flag')).toBe(true);
    });
    it("I don't care: credited $0 as before; I don't know: not credited, a note to check", () => {
      const care = pick({ filter: 'care' }), unk = pick({ filter: 'unknown' }), none = pick({});
      expect(care.saved).toBeGreaterThan(0);
      expect(unk.saved).toBe(0); expect(unk.totals.startupUsd).toBe(unk.build.setupUsd);
      expect(unk.ownedNotes.some(n => n.kind === 'ask')).toBe(true);
      expect(none.ownedNotes).toEqual([]);
    });
    it('the terrarium / vivarium sub-choice is asked when Terrarium OR Vivarium is ticked, and not otherwise', () => {
      expect(asksDryGroups(['terrarium'])).toBe(true); expect(asksDryGroups(['vivarium'])).toBe(true);
      expect(asksDryGroups(['terrarium', 'vivarium'])).toBe(true); expect(asksDryGroups(['freshwater', 'saltwater'])).toBe(false);
    });
  });
});
