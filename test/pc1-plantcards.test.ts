// Lane PC1 (2026-11-15): the Plants picker as picture cards (src/shell/logic/plantcards.ts).
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { LIBRARY } from '../src/scene/items';
import { addPiece } from '../src/shell/logic/scape';
import { GROUPS, groupOf, plantDetail, plantPick } from '../src/shell/logic/plantcards';

const ids = Object.keys(LIBRARY).filter(k => LIBRARY[k].kind === 'plant' || LIBRARY[k].kind === 'artificial');
const all = (p: ReturnType<typeof plantPick>) => p.groups.flatMap(g => g.cards.map(c => c.id));

describe('plant cards', () => {
  it('every plant lands in exactly one group, and every group has a heading', () => {
    for (const id of ids) expect(GROUPS.filter(g => g.id === groupOf(id)).length, id).toBe(1);
    const p = plantPick(new Store().tank, '', 'in', null), got = all(p);
    expect(new Set(got).size).toBe(got.length);
    expect(p.chips[0].n).toBe(got.length);
    expect(p.chips.slice(1).reduce((n, c) => n + c.n, 0)).toBe(got.length);
    for (const g of p.groups) for (const c of g.cards) expect(c.group).toBe(g.id);
  });
  it('artificial plants are their own group and say Artificial instead of a care level', () => {
    const p = plantPick(new Store().tank, '', 'in', null), fake = p.groups.find(g => g.id === 'fake')!;
    expect(fake.cards.length).toBe(ids.filter(i => LIBRARY[i].kind === 'artificial').length);
    expect(fake.cards.every(c => c.care === 'Artificial' && c.fake && !c.light)).toBe(true);
  });
  it('plants already in the tank leave the cards and the counts; the rest stay', () => {
    const st = new Store(), before = all(plantPick(st.tank, '', 'in', null));
    addPiece(st, 'anubias');
    const p = plantPick(st.tank, '', 'in', null), now = all(p);
    expect(now).not.toContain('anubias'); expect(now.length).toBe(before.length - 1); expect(p.inTank).toBe(1);
    expect(p.chips[0].n).toBe(now.length);
  });
  it('a filter chip shows one group; a search that only matches in-tank plants says so', () => {
    const st = new Store(); addPiece(st, 'anubias');
    expect(plantPick(st.tank, '', 'in', 'float').groups.map(g => g.id)).toEqual(['float']);
    expect(plantPick(st.tank, 'anubias', 'in', null).none).toMatch(/already in the tank/);
    expect(plantPick(st.tank, 'zzzz', 'in', null).none).toMatch(/matches/);
  });
  it('the detail uses sizes in the chosen units and counts the plants in the tank', () => {
    const st = new Store(); addPiece(st, 'sword'); addPiece(st, 'sword');
    const d = plantDetail(st.tank, 'sword', 'in')!;
    expect(d.inTank).toBe(2); expect(d.rows.find(r => r[0] === 'Placement')![1]).toMatch(/ground|Background|Midground/i);
    expect(d.rows.find(r => r[0] === 'Height, grown')![1]).toMatch(/″|in/);
    expect(plantDetail(st.tank, 'silkstem', 'in')!.rows.map(r => r[0])).toContain('Material');
  });
});
