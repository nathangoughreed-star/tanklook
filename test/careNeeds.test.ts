// Essential care conditions are evaluated apart from the group count (lane RF; research/rules-spec.md section 6, first finding).
import { describe, expect, it } from 'vitest';
import { GROUPS } from '../src/data/groups';
import { NEEDS } from '../src/data/careNeeds';
import { notesOf } from '../src/ui/stockPlanLogic';

describe('care needs', () => {
  it('the mandarin feeding and maturity lines show at every count, whatever the group band', () => {
    for (const n of [1, 2, 3]) {
      const t = notesOf({ id: 'mandarin', n }).needs.map(x => x.text).join(' | ');
      expect(t).toMatch(/copepods/);
      expect(t).toMatch(/mature reef/);
    }
  });
  it('a species with needs keeps them in a favourable band', () => {
    const nt = notesOf({ id: 'hatchet', n: 10 });
    expect(nt.band).not.toBe('avoid');
    expect(nt.needs.some(x => /lid/.test(x.text))).toBe(true);
  });
  it('no care condition is left inside a group band message', () => {
    for (const id of Object.keys(NEEDS)) for (const m of Object.values(GROUPS[id]?.msg ?? {})) expect(m).not.toMatch(/pod|lid|shell/i);
  });
});

describe('group-size line beside the tank (lane RF item 2)', () => {
  it('is labelled as the group size, and a failing tank holds it (9 dwarf frogs in a 10 gal never read "Great" as the verdict)', async () => {
    const { planFor, groupLineIn } = await import('../src/ui/stockPlanLogic');
    const { tankOptions, tankLabel } = await import('../src/scene/tankfit');
    const p = { id: 'adf', n: 9 }, t = tankOptions([{ species: 'adf', n: 9 }]).find(o => tankLabel(o.tank, 'in').includes('10 gal'))!;
    const plan = planFor([p], t.tank.id), nt = notesOf(p);
    expect(nt.line).toMatch(/^Group size: /);
    expect(plan.problem).toBeTruthy();
    const g = groupLineIn(nt, plan);
    expect(g.held).toBe(true);
    expect(g.text).toMatch(/group only: this tank fails \(too full/);
    const roomy = tankOptions([{ species: 'adf', n: 9 }]).find(o => !o.fails.length)!;
    expect(groupLineIn(nt, planFor([p], roomy.tank.id)).held).toBe(false);
  });
});

describe('GroupCare fields agree with their documented meaning (lane RF item 3)', () => {
  // adf: great 7 > max 6 waits for Nathan (which number is the husbandry intent); remove it from here once reconciled
  const OPEN = new Set(['adf']);
  it('bands ascend, and the best group never exceeds the most one tank takes', () => {
    for (const [id, g] of Object.entries(GROUPS)) {
      const b = g.bands; if (!b) continue;
      expect(b.ok <= b.good && b.good <= b.great, id).toBe(true);
      if (g.max !== undefined && !OPEN.has(id)) expect(b.great, id).toBeLessThanOrEqual(g.max);
    }
  });
});

describe('sex and pairing are separate inputs (lane RF item 4)', () => {
  it('two of a pair species are never assumed to be a pair, even 1 male + 1 female', async () => {
    const { notesOf: notes } = await import('../src/ui/stockPlanLogic');
    const krib = notes({ id: 'kribensis', n: 1, f: 1 });
    expect(krib.pairing?.status).toBe('unknown');
    expect(krib.line).toMatch(/only if they are a pair/);
    const ram = notes({ id: 'bolivianram', n: 2 });
    expect(ram.pairing?.line).toMatch(/not assumed/);
    const est = notes({ id: 'bolivianram', n: 2, pair: 'established' });
    expect(est.line).not.toMatch(/only if/);
    expect(notes({ id: 'bolivianram', n: 4 }).pairing).toBeUndefined();
    expect(notes({ id: 'neon', n: 2 }).pairing).toBeUndefined();
  });
  it('the pair list follows the data: every "bonded" or "male/female pair" species is on it', async () => {
    const { PAIR_FORMERS } = await import('../src/ui/stockPlanLogic');
    for (const [id, g] of Object.entries(GROUPS)) if (/bonded|male\/female pair/i.test([...Object.values(g.msg ?? {}), g.sexed?.note ?? ''].join(' '))) expect(PAIR_FORMERS.has(id), id).toBe(true);
  });
  it('unsexed animals count in the total and are named, never guessed into the ratio', async () => {
    const { notesOf: notes, totalOf, bump } = await import('../src/ui/stockPlanLogic');
    const p = bump(bump({ id: 'guppy', n: 1, f: 2 }, 'u', 1), 'u', 1);
    expect(totalOf(p)).toBe(5);
    const r = notes(p).ratio!;
    expect(r).toMatch(/2 unsexed: the mix can only be checked once they are sexed/);
    expect(r).not.toMatch(/short on females/);
    expect(notes({ id: 'guppy', n: 0, f: 0, u: 3 }).ratio).not.toMatch(/short on females/);
  });
});
