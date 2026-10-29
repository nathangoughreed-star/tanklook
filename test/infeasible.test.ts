// Infeasibility as a first-class result (lane U4): the limiting factor in plain words with the numbers, alternatives that are one click each
// (a brief edit, locks kept), and the rules: welfare is never traded for price, a locked animal is never swapped to hit a number, nothing is silently stripped.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { briefFromWants, parseBrief, serializeBrief, valueOf, type Brief } from '../src/scene/brief';
import { suggestFromBrief, suggestSetups, type Alternative, type Suggestions, type Wants } from '../src/demand/suggest';
import { applyAlternative } from '../src/demand/infeasible';
import { TANK_MODELS } from '../src/data/tanks';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const gold = [{ species: 'goldfish', n: 2 }], betta = [{ species: 'betta', n: 1 }];
const go = (w: Wants) => suggestSetups(w, P, 'cm', NOW);
const again = (b: Brief) => suggestFromBrief(b, P, 'cm', NOW);
const welfareOk = (r: Suggestions) => { for (const p of r.proposals) expect(summaryOf(p.scene, 'cm').cats.every(k => k.level !== 'problem' && k.level !== 'caution')).toBe(true); };
const by = (alts: Alternative[], kind: Alternative['kind']) => alts.filter(a => a.kind === kind);

describe('infeasible requests explain themselves', () => {
  it('locked goldfish, all new, $200: names the cheapest honest build and how far over, with numbers that add up', () => {
    const r = go({ constraints: { startupUsd: cap(200) }, animals: gold });
    const inf = r.infeasible!;
    expect(r.proposals).toEqual([]);
    expect(inf.limitingFactor).toBe('budget');
    expect(inf.cheapest!.over).toBe(inf.cheapest!.usd - 200);
    expect(inf.cheapest!.over).toBeGreaterThan(0);
    expect(inf.text).toContain('cheapest welfare-appropriate build');
    expect(inf.text).toContain(`$${inf.cheapest!.usd.toLocaleString('en-US')}`);
    expect(inf.text).toContain(`$${inf.cheapest!.over.toLocaleString('en-US')} over your $200`);
    expect(Math.abs(inf.cheapest!.lines.reduce((t, l) => t + l.usd, 0) - inf.cheapest!.usd)).toBeLessThanOrEqual(2);
  }, 120000);

  it('every alternative is one click: applying its edit to the brief and re-running gives real proposals, locks kept, welfare intact', () => {
    const w: Wants = { constraints: { startupUsd: cap(200) }, animals: gold };
    const inf = go(w).infeasible!, b0 = briefFromWants(w);
    expect(by(inf.alternatives, 'raise-budget')[0].delta).toBe(inf.cheapest!.over);
    for (const a of inf.alternatives.filter(x => x.edit)) {
      const r = again(applyAlternative(b0, a.edit!));
      expect(r.proposals.length, a.kind).toBeGreaterThan(0);
      welfareOk(r);
      if (a.kind !== 'change-animals' && a.kind !== 'save-ambition') for (const p of r.proposals) expect(p.build.animals).toEqual(gold); // save-ambition carries the explicit smaller-project swap (lane NG4) // a locked animal is never swapped to hit a number
    }
    const o = by(inf.alternatives, 'use-owned')[0]; // what you own comes off the cost: it fits the same $200
    for (const p of again(applyAlternative(b0, o.edit!)).proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(200);
    expect(o.resultUsd).toBeLessThanOrEqual(200);
  }, 300000);

  it('a different species is only an option: the locked animals change only when that alternative is clicked', () => {
    const w: Wants = { constraints: { startupUsd: cap(230) }, animals: gold };
    const inf = go(w).infeasible!, b0 = briefFromWants(w), sp = by(inf.alternatives, 'change-animals');
    expect(sp.length).toBeGreaterThan(0);
    expect(sp.every(a => a.text.includes('only if you want them') && a.text.includes('stay locked until you choose'))).toBe(true);
    for (const a of inf.alternatives.filter(x => x.kind !== 'change-animals' && x.kind !== 'save-ambition' && x.edit)) expect(valueOf(applyAlternative(b0, a.edit!), 'animals.stock')).toEqual([{ species: 'goldfish', count: 2 }]);
    const after = applyAlternative(b0, sp[0].edit!);
    expect(valueOf(after, 'animals.stock')).not.toEqual([{ species: 'goldfish', count: 2 }]);
    expect(again(after).proposals.length).toBeGreaterThan(0);
  }, 300000);

  it('phased purchase: when the essentials alone fit, the tank stays unstocked until they are in, with phase 1 / phase 2 costs', () => {
    // lane U5: a bare-bottom freshwater tank is now offered (compromise stated) whenever it fits, so with goldfish the essentials never fit without the whole build; a terrarium animal has no bare option
    const pricey = [{ species: 'leopardgecko', n: 1 }];
    const base = go({ constraints: { startupUsd: cap(100) }, animals: pricey }).infeasible!.cheapest!;
    const essentials = base.lines.filter(l => l.label !== 'Animals' && !l.label.startsWith('Sales tax')).reduce((t, l) => t + l.usd, 0);
    const c = Math.round(essentials) + 10; // the essentials fit, the whole build does not
    const w: Wants = { constraints: { startupUsd: cap(c) }, animals: pricey };
    const inf = go(w).infeasible!, ph = by(inf.alternatives, 'phase')[0];
    expect(ph.edit).toEqual({ op: 'phased' });
    expect(ph.phases!.phase1Usd).toBeLessThanOrEqual(c);
    expect(ph.phases!.phase1Usd + ph.phases!.phase2Usd).toBe(ph.phases!.totalUsd);
    expect(ph.phases!.totalUsd).toBeGreaterThan(c);
    expect(ph.phases!.phase2[0]).toContain('animals');
    expect(ph.text).toContain('unstocked until every animal-care essential is in');
    const r = again(applyAlternative(briefFromWants(w), ph.edit!));
    expect(r.proposals.length).toBeGreaterThan(0);
    welfareOk(r);
    for (const p of r.proposals) { expect(p.build.animals).toEqual(pricey); expect(p.phases!.phase1Usd).toBeLessThanOrEqual(c); expect(p.phases!.phase2Usd).toBeGreaterThan(0); }
  }, 300000);

  it('phases that cannot close the gap say so instead of offering them', () => {
    const inf = go({ constraints: { startupUsd: cap(200) }, animals: gold }).infeasible!, ph = by(inf.alternatives, 'phase');
    expect(ph.length).toBe(1);
    expect(ph[0].edit).toBeUndefined();
    expect(ph[0].text).toContain('does not close this gap');
  }, 120000);

  it('high-tech planted for $200: the look is separated from the equipment approach, and the low-tech version is offered and verified', () => {
    const w: Wants = { constraints: { startupUsd: cap(180) }, hightech: true, kinds: ['freshwater'], tags: ['natural'] };
    const inf = go(w).infeasible!;
    expect(inf.limitingFactor).toBe('budget');
    expect(inf.text).toContain('high-tech planted tank');
    const lt = by(inf.alternatives, 'low-tech')[0];
    expect(lt.text).toContain('The look is the goal');
    const r = again(applyAlternative(briefFromWants(w), lt.edit!));
    expect(r.proposals.length).toBeGreaterThan(0);
    welfareOk(r);
    for (const p of r.proposals) { expect(p.totals.startupUsd).toBeLessThanOrEqual(180); expect(p.build.finish).toBeDefined(); }
  }, 300000);

  it('a stated high-tech approach is never silently swapped for a plainer one: with money enough every proposal is a CO2 tier', () => {
    const r = go({ constraints: { startupUsd: cap(900) }, hightech: true, kinds: ['freshwater'] });
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) expect(p.build.finish!.level).toBeGreaterThanOrEqual(2);
  }, 120000);

  it('an owned tank that is too small: the limiting factor is the tank, never resized, with another tank as an option', () => {
    const five = TANK_MODELS.find(m => m.ratedGal === 5)!;
    const w: Wants = { constraints: {}, animals: gold, ownTank: five };
    const r = go(w), inf = r.infeasible!;
    expect(r.proposals).toEqual([]);
    expect(inf.limitingFactor).toBe('tank');
    expect(inf.text).toContain('does not hold');
    expect(inf.text).toContain('do not resize your tank');
    const ot = by(inf.alternatives, 'other-tank')[0];
    expect(valueOf(applyAlternative(briefFromWants(w), ot.edit!), 'constraints.existingTank')).toBeUndefined();
    expect(again(applyAlternative(briefFromWants(w), ot.edit!)).proposals.length).toBeGreaterThan(0);
  }, 300000);

  it('a space too small: names the smallest tank that holds them and offers the room', () => {
    const w: Wants = { constraints: { space: { on: true } }, space: { w: 300, d: 200 }, animals: gold };
    const inf = go(w).infeasible!;
    expect(inf.limitingFactor).toBe('space');
    expect(inf.text).toContain('smallest');
    const bs = by(inf.alternatives, 'bigger-space')[0];
    expect(bs.edit!.op).toBe('space');
    expect(again(applyAlternative(briefFromWants(w), bs.edit!)).proposals.length).toBeGreaterThan(0);
  }, 300000);

  it('a monthly limit that cannot be met: says so with the numbers, and raising it works', () => {
    const w: Wants = { constraints: { monthlyUsd: cap(2) }, animals: betta };
    const inf = go(w).infeasible!;
    expect(inf.limitingFactor).toBe('upkeep');
    expect(inf.text).toMatch(/a month, \$\d+ over your \$2 a month/);
    const up = by(inf.alternatives, 'raise-upkeep')[0];
    expect(again(applyAlternative(briefFromWants(w), up.edit!)).proposals.length).toBeGreaterThan(0);
  }, 120000);

  it('the new brief items survive save and load', () => {
    const b = briefFromWants({ constraints: { startupUsd: cap(300) }, hightech: true, phased: true });
    const back = parseBrief(JSON.parse(serializeBrief(b)))!;
    expect(valueOf(back, 'preferences.hightech')).toBe(true);
    expect(valueOf(back, 'constraints.phased')).toBe(true);
  });
});

describe('one source for the cheapest honest build', () => {
  it('the brief bar evaluate line and the infeasible card give the same figure', async () => {
    const { evaluateAnimals } = await import('../src/ui/briefFeasibility');
    const w: Wants = { constraints: { startupUsd: cap(200) }, animals: gold };
    const inf = suggestSetups(w, defaultProfile(), 'in', Date.now()).infeasible!, ev = evaluateAnimals(briefFromWants(w));
    expect(ev.cheapestUsd).toBe(inf.cheapest!.usd);
    expect(ev.text).toContain(`$${inf.cheapest!.usd.toLocaleString('en-US')}`);
    expect(ev.fits).toBe(false);
  }, 120000);
});
