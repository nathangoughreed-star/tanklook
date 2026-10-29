// Build plan (lane U7): the ordered buy list, cycling, staged stocking and maintenance, worked out from a chosen proposal.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, type Proposal, type Wants } from '../src/demand/suggest';
import { demandOf } from '../src/demand/engine';
import { buildPlanOf, buildPlanText, habitatOf } from '../src/demand/buildplan';
import { buildPlanHtml } from '../src/ui/buildPlanSheet';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const find = (w: Wants, id: string): Proposal | undefined => suggestSetups(w, P, 'cm', NOW).proposals.find(p => p.archetype.id === id);
const betta = () => find({ constraints: { startupUsd: cap(400) }, kinds: ['freshwater'], tags: ['calm'] }, 'betta') ?? find({ constraints: {}, kinds: ['freshwater'] }, 'betta');
const reef = () => find({ constraints: { startupUsd: cap(3000) }, kinds: ['saltwater'] }, 'clown-nano') ?? suggestSetups({ constraints: {}, kinds: ['saltwater'] }, P, 'cm', NOW).proposals[0];
const dry = () => suggestSetups({ constraints: {}, kinds: ['terrarium'], groups: ['herp'] }, P, 'cm', NOW).proposals[0];

describe('Build plan', () => {
  it('betta: owned gear first at $0, tank before animals, animals last, total equals the card', () => {
    const p = betta(); expect(p).toBeDefined();
    const b = buildPlanOf(p!, P);
    expect(b.habitat).toBe('fresh');
    const ids = b.buy.map(g => g.id), first = b.buy.find(g => g.id === 'first')!;
    expect(ids[ids.length - 1]).toBe('later');
    expect(first.rows[0].label).toMatch(/^(Tank|Starter kit)/); // lane U5: a kit's one price is its own line
    const sum = b.buy.reduce((t, g) => t + g.usd, 0);
    expect(sum).toBe(b.totalUsd);
    expect(b.cycling?.weeks[0]).toBeGreaterThanOrEqual(4);
    expect(b.cycling?.tests.join(' ')).toMatch(/Ammonia[\s\S]*Nitrite[\s\S]*Nitrate/);
    expect(b.maintenance.join(' ')).toMatch(/25 %/);
    expect(buildPlanText(b)).toContain('Buy last');
    expect(buildPlanHtml(b)).toContain('When to add the animals');
  });

  it('a test kit is recommended in the cycling section whenever the price leaves it out, and not listed as bought', () => {
    for (const p of [betta(), reef()]) {
      const b = buildPlanOf(p!, P), priced = demandOf(p!.build.setup, P).items.some(c => c.key === 'testkit');
      expect(b.cycling).toBeDefined();
      expect(/test kit[^.]*recommended/i.test(b.cycling!.text), b.title).toBe(!priced);
      expect(b.buy.flatMap(g => g.rows).some(r => /test kit/i.test(r.label)), b.title).toBe(priced);
    }
    expect(demandOf(betta()!.build.setup, P).items.some(c => c.key === 'testkit')).toBe(false); // a simple betta tank does not pay for one
    expect(demandOf(reef()!.build.setup, P).items.some(c => c.key === 'testkit')).toBe(true);
  });

  it('what you own is listed as you have at $0 and moves the total down', () => {
    const own = find({ constraints: { startupUsd: cap(400) }, kinds: ['freshwater'], tags: ['calm'], owned: { filter: 'care', heater: 'care' } }, 'betta');
    expect(own!.ownedNotes.length).toBeGreaterThan(0);
    expect(own).toBeDefined();
    const b = buildPlanOf(own!, P);
    expect(own!.saved).toBeGreaterThan(0);
    const have = b.buy.find(g => g.id === 'have'); expect(have?.rows.every(r => r.owned && r.usd === 0)).toBe(true);
    expect(b.buy.reduce((t, g) => t + g.usd, 0)).toBe(b.totalUsd);
  });

  it('saltwater: a longer fishless cycle with salinity, clean-up crew or fish first, corals last', () => {
    const p = reef(); expect(habitatOf(p)).toBe('salt');
    const b = buildPlanOf(p, P);
    expect(b.cycling!.weeks[1]).toBeGreaterThanOrEqual(8);
    expect(b.cycling!.tests.join(' ')).toMatch(/Salinity/);
    expect(b.stocking[b.stocking.length - 1].title).toMatch(/Corals/);
    expect(b.maintenance.join(' ')).toMatch(/15 %/);
  });

  it('terrarium: no cycling, a habitat check before the animal, no water change', () => {
    const p = dry(); expect(habitatOf(p)).toBe('dry');
    const b = buildPlanOf(p, P);
    expect(b.cycling).toBeUndefined();
    expect(b.stocking[0].title).toMatch(/habitat/i);
    expect(b.maintenance.join(' ')).not.toMatch(/water change/);
  });

  it('the plan shows the own tank and strategy; the Extras row names only what the finish includes; fish-in is explained', () => {
    const all = suggestSetups({ constraints: { startupUsd: cap(400) }, kinds: ['freshwater'], tags: ['calm'] }, P, 'cm', NOW).proposals.filter(p => p.archetype.id === 'betta');
    expect(all.length).toBeGreaterThan(0);
    for (const p of all) {
      const b = buildPlanOf(p, P);
      expect(b.title).toContain(p.strategyLabel);
      const ex = b.buy.flatMap(g => g.rows).find(r => r.layer === 'enhance');
      if (ex) { expect(ex.label).not.toMatch(/dosing/); expect(ex.label.startsWith('Extras')).toBe(true); }
      expect(b.cycling!.text).toMatch(/Why not fish-in/);
    }
    const look = all.find(p => p.strategy === 'look');
    if (look) expect(buildPlanOf(look, P).gallons).toBeGreaterThanOrEqual(10);
  });
});

describe('Setup effort, care commitment and confidence (lane NG6)', () => {
  it('betta plan: hours derived from parts, care line, gates, badges', () => {
    const b = buildPlanOf(betta()!, P);
    expect(b.effort.hours).toBeGreaterThan(1);
    expect(b.effort.hours).toBeCloseTo(b.effort.parts.reduce((t, x) => t + x.hours, 0), 0);
    expect(b.effort.parts.every(x => x.basis.length > 0)).toBe(true);
    expect(b.effort.conf).toBe('provisional');
    expect(b.care.text).toMatch(/^about \d+ min a week, 1 x [\d.]+ gal water change$/);
    expect(b.care.minPerWeek).toBe(Math.round(demandOf(betta()!.build.setup, P).totals.minPerWeek));
    expect(b.setupGates.length).toBe(b.setup.length);
    expect(b.setupGates.join(' ')).toMatch(/Ammonia 0 and nitrite 0 for 7 days/);
    expect(b.stocking.some(s => /Ammonia 0/.test(s.gate ?? ''))).toBe(true);
    const html = buildPlanHtml(b);
    expect(html).toContain('Ready when:');
    expect(html).toMatch(/data-conf="provisional"[^>]*title="[^"]+"/);
    expect(buildPlanText(b)).toContain('Your time: about');
  });
  it('a bigger tank takes longer to set up; dry has no cycling hours', () => {
    const d = buildPlanOf(dry(), P), r = buildPlanOf(reef(), P);
    expect(d.effort.parts.some(x => x.id === 'cycling')).toBe(false);
    expect(r.effort.parts.some(x => x.id === 'cycling')).toBe(true);
    expect(d.care.waterChange).toBeUndefined();
  });
  it('cost confidence is validated only when listings back most of the price', () => {
    const f = buildPlanOf(betta()!, P).figures.startup;
    expect(['validated', 'provisional']).toContain(f.conf);
    expect(f.why).toMatch(/\d+ %/);
  });
});
