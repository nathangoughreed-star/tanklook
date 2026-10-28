// Build plan (lane U7): the ordered buy list, cycling, staged stocking and maintenance, worked out from a chosen proposal.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, type Proposal, type Wants } from '../src/demand/suggest';
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
