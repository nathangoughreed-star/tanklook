import { describe, expect, it } from 'vitest';
import { emptyBrief, setItem, setOff } from '../src/scene/brief';
import { guardrailRows, sandboxFlags, NOT_VALID_TRADEOFF } from '../src/ui/startMode';
import type { StockSummary } from '../src/ui/stockSummary';

describe('start mode: Guided or Sandbox', () => {
  it('Guardrails lists only the brief items switched off', () => {
    let b = setItem(emptyBrief(), 'constraints.budget', 300, 'hard');
    b = setItem(b, 'constraints.careMin', 60, 'hard');
    expect(guardrailRows(b)).toEqual([]);
    b = setOff(b, 'constraints.budget', true);
    expect(guardrailRows(b).map(r => r.id)).toEqual(['constraints.budget']);
    expect(guardrailRows(setOff(b, 'constraints.budget', false))).toEqual([]);
  });
  it('welfare problems are red flags, listed first; cautions are amber; nothing blocks', () => {
    const sm = { cats: [
      { id: 'social', label: 'Social needs', what: '', level: 'caution', word: '', items: [{ level: 'caution', text: 'keep 6' }] },
      { id: 'behaviour', label: 'Behavior', what: '', level: 'problem', word: '', items: [{ level: 'problem', text: 'eats the neons' }] },
    ], worst: 'problem', worstWord: '', noData: 0, noDataFor: [] } as unknown as StockSummary;
    const f = sandboxFlags(sm);
    expect(f.map(x => [x.level, x.welfare])).toEqual([['problem', true], ['caution', false]]);
    expect(NOT_VALID_TRADEOFF).toBe('not a valid tradeoff');
  });
});

import { activeRows, costFlags } from '../src/ui/startMode';
import { setRange } from '../src/scene/brief';
describe('sandbox cost flags and guardrails', () => {
  it('red above the maximum, amber below the minimum, none inside; each names the item to turn off', () => {
    let b = setItem(emptyBrief(), 'constraints.budget', 300, 'hard');
    b = setRange(b, 'constraints.budget', { min: 200, max: 300 });
    expect(costFlags(b, 250, 0)).toEqual([]);
    expect(costFlags(b, 150, 0).map(f => [f.level, f.item])).toEqual([['caution', 'constraints.budget']]);
    expect(costFlags(b, 350, 0).map(f => [f.level, f.item])).toEqual([['problem', 'constraints.budget']]);
    expect(costFlags(setOff(b, 'constraints.budget', true), 999, 0)).toEqual([]);
  });
  it('active rows are the items still on', () => {
    let b = setItem(emptyBrief(), 'constraints.budget', 300, 'hard');
    expect(activeRows(b).map(r => r.id)).toEqual(['constraints.budget']);
    expect(activeRows(setOff(b, 'constraints.budget', true))).toEqual([]);
  });
});
