// Lane U6: refinement chips edit the brief, the generator recomputes, locks stay, the card says the tradeoff.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { emptyBrief, getItem, setItem, valueOf, lock, type Brief } from '../src/scene/brief';
import { suggestFromBrief } from '../src/demand/suggest';
import { chipsFor, refine, tradeoffLine, dropWish, addAnimals, type Chip, type ChipId } from '../src/demand/refine';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const run = (b: Brief) => suggestFromBrief(b, P, 'cm', NOW);
const budget = (b: Brief, usd: number) => setItem(b, 'constraints.budget', usd, 'hard');
const base = (usd = 600) => budget(setItem(emptyBrief(), 'animals.kinds', ['freshwater'], 'preference'), usd);
const chip = (b: Brief, id: ChipId): Chip => chipsFor(b, run(b)).find(c => c.id === id)!;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

describe('refinement chips', () => {
  it('offers the chips for a result and hides one already applied', () => {
    const b = base(), ids = chipsFor(b, run(b)).map(c => c.id);
    expect(ids).toEqual(expect.arrayContaining(['more-planted', 'larger-tank', 'own-filter', 'cut-budget']));
    const r = refine(b, chip(b, 'larger-tank'), run(b), run);
    expect(chipsFor(r.brief, r.result).map(c => c.id)).not.toContain('larger-tank');
    expect(valueOf(dropWish(r.brief, 'larger-tank'), 'preferences.wishes')).toBeUndefined();
  });

  it('larger tank: edits the brief, recomputes, the tradeoff names the gallons and the price, the budget stays a ceiling', () => {
    const b = base(900), before = run(b), r = refine(b, chip(b, 'larger-tank'), before, run);
    expect(valueOf(r.brief, 'preferences.wishes')).toContain('larger-tank');
    expect(r.ok).toBe(true);
    const i = r.result.proposals.findIndex((p, k) => before.proposals[k] && p.build.tank.ratedGal > before.proposals[k].build.tank.ratedGal);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(r.cards[i]).toMatch(/tank \d+ -> \d+ gal/);
    for (const p of r.result.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(900);
  });

  it('more planted: some concept reaches the lushest finish and its line says the finish changed', () => {
    const b = base(1200), before = run(b), r = refine(b, chip(b, 'more-planted'), before, run);
    expect(r.ok).toBe(true);
    expect(r.result.proposals.some(p => p.build.finish?.level === 3)).toBe(true);
    expect(r.unchanged || r.cards.some(c => /finish /.test(c))).toBe(true);
  });

  it('I own a filter: the set-up gets cheaper and the line says so', () => {
    const b = base(), r = refine(b, chip(b, 'own-filter'), run(b), run);
    expect(valueOf(r.brief, 'constraints.owned')).toMatchObject({ filter: 'care' });
    expect(r.result.proposals.some(p => p.saved > 0)).toBe(true);
    expect(r.cards.join(' ')).toMatch(/Better: .*set-up -\$/);
  });

  it('cut $40: the ceiling drops 40 under the shown concepts and no concept costs more than it', () => {
    const b = base(), before = run(b), top = Math.round(Math.max(...before.proposals.map(p => p.totals.startupUsd))), c = chip(b, 'cut-budget'), r = refine(b, c, before, run);
    expect(valueOf(c.edit(b), 'constraints.budget')).toBe(Math.min(600, top) - 40);
    if (r.ok) for (const p of r.result.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(top - 40);
  });

  it('locked animals are never changed by a chip; add animals EXTENDS the lock', () => {
    const b = budget(setItem(base(), 'animals.stock', [{ species: 'betta', count: 1 }], 'locked'), 900), before = run(b);
    expect(before.proposals.length).toBeGreaterThan(0);
    for (const id of ['more-planted', 'larger-tank', 'own-filter', 'cut-budget'] as ChipId[]) {
      const c = chipsFor(b, before).find(x => x.id === id); if (!c) continue;
      const r = refine(b, c, before, run);
      expect(getItem(r.brief, 'animals.stock')).toMatchObject({ status: 'locked', value: [{ species: 'betta', count: 1 }] });
      for (const p of r.result.proposals) expect(p.build.animals).toEqual([{ species: 'betta', n: 1 }]);
    }
    const added = addAnimals(b, [], { species: 'pygmycory', n: 6 });
    expect(getItem(added, 'animals.stock')!.value).toEqual([{ species: 'betta', count: 1 }, { species: 'pygmycory', count: 6 }]);
    expect(getItem(added, 'animals.stock')!.status).toBe('locked');
  });

  it('add pygmy corydoras on an open result locks the card animals plus the new ones; welfare may refuse and the old result stays', () => {
    const b = base(900), c = chipsFor(b, run(b)).find(x => x.id === 'add-animals');
    if (!c) return;
    const r = refine(b, c, run(b), run);
    if (r.ok) { expect(getItem(r.brief, 'animals.stock')!.status).toBe('locked'); expect(r.result.proposals.every(p => p.build.animals.some(a => a.species === 'pygmycory' && a.n >= 6))).toBe(true); }
    else { expect(r.line).toMatch(/^Not applied/); expect(r.brief).toBe(b); }
  });

  it('an edit that leaves nothing is refused: the old brief and result stay', () => {
    const b = base(), before = run(b);
    const c: Chip = { id: 'cut-budget', label: 'Cut $40', edit: x => budget(x, 5) };
    const r = refine(b, c, before, run);
    expect(r.ok).toBe(false); expect(r.brief).toBe(b); expect(r.result).toBe(before); expect(r.line).toMatch(/^Not applied/);
  });

  it('tradeoffLine words better and costs apart, with numbers', () => {
    const p = run(base()).proposals[0], q = { ...p, totals: { ...p.totals, startupUsd: p.totals.startupUsd + 55 } };
    expect(tradeoffLine(q, p)).toBe(`Costs: set-up +$55 (${usd(p.totals.startupUsd)} -> ${usd(q.totals.startupUsd)}).`);
    expect(tradeoffLine(p, p)).toBe('Nothing else changed.');
  });

  it('owned gear stays through a chip', () => {
    const b = lock(setItem(base(), 'constraints.owned', { heater: 'care' }, 'hard'), 'constraints.owned');
    const r = refine(b, chip(b, 'own-filter'), run(b), run);
    expect(valueOf(r.brief, 'constraints.owned')).toMatchObject({ heater: 'care', filter: 'care' });
  });
});
