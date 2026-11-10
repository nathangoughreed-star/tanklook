import { describe, it, expect } from 'vitest';
import { emptyBrief } from '../src/scene/brief';
import { setDirection } from '../src/scene/project';
import { applyQuickPrefs, answersOf, emptyAnswers } from '../src/scene/quickPrefs';
import { archetypesFor } from '../src/scene/quickArchetypes';
import { prefsHtml, press, archRowHtml } from '../src/ui/quickPrefs';

const cardsIn = (h: string) => [...h.matchAll(/data-arch="([^"]+)"/g)].map(m => m[1]);
describe('QP2 archetype cards', () => {
  it('replaces Look and Live plants: cards per habitat, 4-6 (3-4 where the catalogue has fewer), small sample for unsure', () => {
    for (const d of ['freshwater', 'saltwater', 'terrarium', 'paludarium'] as const) expect(cardsIn(prefsHtml(d, emptyAnswers()))).toEqual(archetypesFor(d).map(c => c.key));
    expect(cardsIn(prefsHtml('unsure', emptyAnswers())).length).toBeLessThanOrEqual(4);
    const f = prefsHtml('freshwater', emptyAnswers()); expect(f).not.toContain('aria-label="Look"'); expect(f).not.toContain('aria-label="Live plants"'); expect(f).toContain('No live plants');
    expect(f).toContain('Not chosen'); expect(f).toContain('art/quick/freshwater-jungle.webp');
  });
  it('three states cycle and label themselves without colour: Not chosen -> Interested -> Avoid -> Not chosen; several interests at once', () => {
    let a = emptyAnswers(); const k = 'freshwater-jungle';
    a = press(a, { arch: k }); expect(a.arch[k]).toBe('interested'); expect(prefsHtml('freshwater', a)).toContain('Interested');
    a = press(a, { arch: 'freshwater-blackwater' }); expect(Object.keys(a.arch)).toHaveLength(2);
    a = press(a, { arch: k }); expect(a.arch[k]).toBe('avoid'); expect(prefsHtml('freshwater', a)).toContain('Avoid');
    a = press(a, { arch: k }); expect(a.arch[k]).toBeUndefined();
  });
  it('No live plants is a hard exclusion in Don\'t want; the compromise note shows only for a live-planted card + exclusion', () => {
    const base = press(emptyAnswers(), { arch: 'freshwater-dutch' });
    expect(archRowHtml('freshwater', base)).not.toContain('qp-note');
    const both = press(base, { avoid: 'no-live-plants' }); expect(archRowHtml('freshwater', both)).toContain('qp-note'); expect(archRowHtml('freshwater', both)).toContain('not passed off');
    const rock = press(press(emptyAnswers(), { arch: 'freshwater-iwagumi' }), { avoid: 'no-live-plants' }); expect(archRowHtml('freshwater', rock)).not.toContain('qp-note');
  });
  it('the left block and the screen read and write the same brief fields', () => {
    const b = applyQuickPrefs(setDirection(emptyBrief(), 'freshwater'), press(emptyAnswers(), { arch: 'freshwater-jungle' }));
    const a = answersOf(b); expect(a.arch['freshwater-jungle']).toBe('interested'); expect(prefsHtml('freshwater', a)).toMatch(/qp-card interested" data-arch="freshwater-jungle"/);
    const b2 = applyQuickPrefs(b, press(a, { arch: 'freshwater-jungle' })); expect(answersOf(b2).arch['freshwater-jungle']).toBe('avoid');
  });
  it('Skip and Start building stay in the screen', () => { expect(archRowHtml('freshwater', emptyAnswers())).not.toMatch(/disabled|required/); });
});
