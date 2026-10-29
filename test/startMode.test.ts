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
