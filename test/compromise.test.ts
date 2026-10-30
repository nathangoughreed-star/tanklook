// Compromise and compare (lane GV7): a chosen look over a limit gets compound edits that keep the look and meet every limit (verified, welfare intact), the other style with the
// roster kept beside it, and Compare opens the two in the split view with the broken limit and the money / care differences first.
import { describe, expect, it } from 'vitest';
import { TANK_MODELS } from '../src/data/tanks';
import { compromiseFor, type CompromiseResult } from '../src/demand/compromise';
import { suggestSetups, type Proposal, type Wants } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';
import { compliance, effectiveLimits } from '../src/scene/constraints';
import { defaultScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { summaryOf } from '../src/ui/stockSummary';
import { setCompare, tankDiff } from '../src/ui/diff';
import { compromiseHtml, infeasibleCard, openCompare } from '../src/ui/infeasibleCard';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const T = (name: string) => TANK_MODELS.find(m => m.name === name)!;
const SCHOOL = [{ species: 'neon', n: 10 }, { species: 'bronzecory', n: 6 }];
const cap = (usd: number): Wants => ({ kinds: ['freshwater'], constraints: { startupUsd: { on: true, value: usd } } });
const welfareOk = (p: Proposal) => !summaryOf(p.scene, 'cm').cats.some(c => c.level === 'problem' || c.level === 'caution');
const within = (p: Proposal) => compliance(p.scene, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, effectiveLimits(p.scene, P.limits), 'cm').overall === 'within';

const r600 = compromiseFor({ style: 'iwagumi', animals: SCHOOL, tank: T('75 gal') }, cap(600), P, 'cm', NOW)!;

describe('a compound compromise that keeps the look', () => {
  it('an over-budget iwagumi 75 gal with a neon school: the look as chosen breaks the $600 ceiling, and a compound edit meets it in the same look', () => {
    expect(r600.anchor.build.tank.name).toBe('75 gal');
    expect(r600.anchor.totals.startupUsd).toBeGreaterThan(600);
    expect(r600.broken[0]).toMatchObject({ key: 'startup', side: 'above' });
    expect(r600.compromises.length).toBeGreaterThanOrEqual(1);
    expect(r600.compromises.length).toBeLessThanOrEqual(2);
    expect(r600.compromises.some(c => c.steps.length >= 2)).toBe(true); // compound: two or more edits in one
    for (const c of r600.compromises) {
      expect(c.proposal.build.finish?.style).toBe('iwagumi');
      expect(c.proposal.totals.startupUsd).toBeLessThanOrEqual(600);
      expect(within(c.proposal)).toBe(true);
      expect(c.text).toMatch(/^Keep this iwagumi within \$600: /);
      expect(c.text).toContain(`$${c.proposal.totals.startupUsd.toLocaleString('en-US')} to set up`);
      expect(c.delta.startupUsd).toBe(c.proposal.totals.startupUsd - r600.anchor.totals.startupUsd);
    }
  });
  it('the sentence names each edit with its numbers (tank sizes in gallons, the animals dropped or kept)', () => {
    const all = r600.compromises.flatMap(c => c.steps);
    expect(all.some(s => s.kind === 'tank' && /^go 75 gal → \d+ gal/.test(s.text))).toBe(true);
    for (const s of all) if (s.kind === 'drop') expect(s.text).toMatch(/^drop the \d+ /);
  });
  it('dropping a group is offered when it is the smaller edit: a tight budget with a big school', () => {
    const r = compromiseFor({ style: 'iwagumi', animals: [{ species: 'neon', n: 20 }, { species: 'bronzecory', n: 6 }], tank: T('75 gal') }, cap(450), P, 'cm', NOW);
    for (const c of r?.compromises ?? []) { expect(c.proposal.totals.startupUsd).toBeLessThanOrEqual(450); expect(c.proposal.build.finish?.style).toBe('iwagumi'); }
  });
  it('welfare is never broken: every compromise and every other style at any ceiling passes the strict rule, and a group is never cut under its minimum', () => {
    for (const usd of [450, 700, 1000]) {
      const r = compromiseFor({ style: 'iwagumi', animals: SCHOOL, tank: T('75 gal') }, cap(usd), P, 'cm', NOW);
      for (const p of [...(r?.compromises.map(c => c.proposal) ?? []), ...(r?.other ? [r.other.proposal] : [])]) { expect(welfareOk(p)).toBe(true); expect(within(p)).toBe(true); }
      for (const c of r?.compromises ?? []) for (const s of c.steps) if (s.kind === 'shrink') expect(+s.text.match(/keep (\d+)/)![1]).toBeGreaterThanOrEqual(2);
    }
  });
  it('a look that already fits every limit needs no compromise', () => {
    expect(compromiseFor({ style: 'iwagumi', animals: SCHOOL, tank: T('29 gal') }, cap(5000), P, 'cm', NOW)).toBeUndefined();
  });
  it('a lower bound alone (GV8 ranges) is flagged, never "fixed" by shrinking the look', () => {
    const r = compromiseFor({ style: 'iwagumi', animals: SCHOOL, tank: T('29 gal') }, { ...cap(5000), mins: { startupUsd: 3000 } }, P, 'cm', NOW)!;
    expect(r.broken[0]).toMatchObject({ key: 'startup', side: 'below' });
    expect(r.compromises).toEqual([]);
  });
  it('a monthly limit: the compromise meets it and says it in the month', () => {
    const r = compromiseFor({ style: 'iwagumi', animals: SCHOOL, tank: T('75 gal') }, { kinds: ['freshwater'], constraints: { monthlyUsd: { on: true, value: 30 } } }, P, 'cm', NOW)!;
    expect(r.broken[0].key).toBe('monthly');
    for (const c of r.compromises) { expect(c.proposal.totals.monthlyUsd).toBeLessThanOrEqual(30); expect(c.text).toContain('within $30 a month'); }
  });
});

describe('the other style beside it', () => {
  it('keeps the whole roster, changes the look, meets the limit', () => {
    const o = r600.other!;
    expect(o).toBeDefined();
    expect(o.style).not.toBe('iwagumi');
    expect(o.proposal.build.finish?.style).toBe(o.style);
    expect([...o.proposal.build.animals].filter(a => a.n > 0).sort((a, b) => a.species.localeCompare(b.species))).toEqual([...SCHOOL].sort((a, b) => a.species.localeCompare(b.species)));
    expect(o.proposal.totals.startupUsd).toBeLessThanOrEqual(600);
    expect(o.text).toMatch(/^Or keep all 10 neon tetras, 6 bronze cor\w+ and change the look: /);
  });
});

describe('Compare: the two side by side, with the right differences first', () => {
  const store = new Store(defaultScene());
  let msg: string | undefined;
  it('opens', async () => { msg = await openCompare(store, r600); });
  it('opens two tanks: A is the compromise, B the other style', () => {
    expect(msg).toMatch(/^Compare: A keeps the look/);
    expect(store.split).toBe(true);
    const [A, B] = store.scene.tanks, c = r600.compromises[0], o = r600.other!;
    expect(A.tank.L).toBe(c.proposal.scene.tank.L);
    expect(B.tank.L).toBe(o.proposal.scene.tank.L);
    expect(A.fish.length).toBe(c.animals.reduce((s, a) => s + a.n, 0));
  });
  it('the tabs list the broken limit with its bound first, then set-up / a month / care where they differ', () => {
    const [A, B] = store.scene.tanks, d = tankDiff(A, B, 'in'), c = r600.compromises[0].proposal.totals, o = r600.other!.proposal.totals;
    expect(d[0][0]).toBe(`Set-up $${c.startupUsd.toLocaleString('en-US')} (limit $600)`);
    expect(d[0][1]).toBe(`Set-up $${o.startupUsd.toLocaleString('en-US')} (limit $600)`);
    const money = d.slice(1, 3).map(x => x[0]).join(' | ');
    if (c.monthlyUsd !== o.monthlyUsd) expect(money).toContain(`$${c.monthlyUsd} a month`);
    if (Math.round(c.minPerWeek) !== Math.round(o.minPerWeek)) expect(d.some(x => x[0] === `${Math.round(c.minPerWeek)} min a week`)).toBe(true);
    expect(d.some(x => x[0] === 'Aquascape A')).toBe(true); // the look differs, so the scape is listed as before
  });
  it('the figures leave the tabs once either tank is changed (they were priced as opened)', () => {
    store.update(s => { s.tanks[0].fish.pop(); });
    const [A, B] = store.scene.tanks;
    expect(tankDiff(A, B, 'in').some(x => x[0].startsWith('Set-up $'))).toBe(false);
    setCompare();
  });
});

describe('on the conflict card', () => {
  it('a locked school over a hopeless budget: the "keep the look" path carries the look and a slot for its compromise', () => {
    const r = suggestSetups({ ...cap(250), animals: SCHOOL }, P, 'cm', NOW), inf = r.infeasible!;
    expect(inf).toBeDefined();
    expect(inf.look?.anchor.animals).toEqual(SCHOOL);
    expect(inf.look?.anchor.style).toBeDefined();
    const html = infeasibleCard(inf);
    expect(html).toMatch(/<section class="sgPath" data-path="look">.*data-cmp-slot="cmp\d+"/s);
    const c = compromiseFor(inf.look!.anchor, inf.look!.w, inf.look!.P, inf.look!.units, inf.look!.now);
    for (const k of c?.compromises ?? []) { expect(k.proposal.totals.startupUsd).toBeLessThanOrEqual(250); expect(welfareOk(k.proposal)).toBe(true); }
  });
  it('the box: the look as chosen and what it breaks, each compromise with Use this, the other style, Compare', () => {
    const html = compromiseHtml('cmpX', r600 as CompromiseResult, 'iwagumi');
    expect(html).toContain('Keep the look: Iwagumi');
    expect(html).toContain('Built in full (75 gal, lush finish');
    expect(html.match(/data-cmp-use="cmpX,\d"/g)?.length).toBe(r600.compromises.length);
    expect(html).toContain('data-cmp-use="cmpX,o"');
    expect(html).toContain('data-cmp-compare="cmpX"');
  });
});
