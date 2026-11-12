// DQ8: Like / Dislike feedback store (brief.project.feedback): thumbs migration, own cap, ranking only, no category ban, reset.
import { describe, expect, it } from 'vitest';
import { emptyBrief, MAX_FEEDBACK, projectExtras, setProjectExtras, type Feedback } from '../src/scene/brief';
import { feedbackScore, FEEDBACK_CAP, setAttrFeedback, setFeedback, setThumb, thumbBonus, thumbMapOf } from '../src/scene/attrs';
import { resetLearnedBrief } from '../src/scene/learning';
import { scoreBreakdown } from '../src/scene/scorePolicy';
import { defaultSetup } from '../src/scene/defaults';
import { emptyAnswers, readQuickPrefs, applyQuickPrefs } from '../src/scene/quickPrefs';
import type { CandidateFacts } from '../src/scene/discoveryTypes';

const S = defaultSetup(), facts = { gallons: 20, substrate: [], stocking: [{ n: 3, name: 'Ember', species: 'ember' }] } as unknown as CandidateFacts;
const base = () => ({ pf: readQuickPrefs(emptyBrief()), S, facts, features: [] as string[], archetypeId: 'a', familyId: 'f', totals: { setupUsd: 100, minPerWeek: 10 }, weights: new Map() });

describe('DQ8 feedback model', () => {
  it('migrates legacy thumbs into attr entries and round-trips through JSON', () => {
    const th = setThumb(setThumb(undefined, 'stocking', ['ember', 'neon'], 1), 'plants', ['java'], -1);
    const b = setProjectExtras(emptyBrief(), { thumbs: th });
    const x = projectExtras(b); expect(x.thumbs).toBeUndefined(); expect(x.feedback).toHaveLength(2);
    expect(x.feedback![0]).toMatchObject({ level: 'attr', cat: 'stocking', v: 1, elements: ['ember', 'neon'] });
    expect(thumbMapOf(x.feedback)).toEqual(th);
    const again = projectExtras(setProjectExtras(emptyBrief(), JSON.parse(JSON.stringify(x)))); expect(again.feedback).toEqual(x.feedback);   // a share link / save loads unchanged
    expect(projectExtras(setProjectExtras(emptyBrief(), { feedback: [{ v: 2, level: 'attr', at: 1 }, { v: 1, level: 'bogus', at: 1 }] as never })).feedback).toBeUndefined();
  });
  it('like and dislike replace each other, 0 takes back, FIFO bound', () => {
    let l = setAttrFeedback(undefined, 'plants', ['a'], 1); l = setAttrFeedback(l, 'plants', ['a'], -1); expect(l).toHaveLength(1); expect(l[0].v).toBe(-1);
    expect(setAttrFeedback(l, 'plants', ['a'], 0)).toHaveLength(0);
    let m: Feedback[] | undefined; for (let i = 0; i < MAX_FEEDBACK + 10; i++) m = setFeedback(m, { level: 'item', target: 'u' + i, elements: ['e' + i], v: 1 });
    expect(m).toHaveLength(MAX_FEEDBACK); expect(m![0].target).toBe('u10');
  });
  it('the attr entries score as the old thumbs did', () => {
    const el = ['ember'], f = setAttrFeedback(undefined, 'stocking', el, 1), t = setThumb(undefined, 'stocking', el, 1);
    expect(feedbackScore(f, S, facts).total).toBeCloseTo(thumbBonus(t, S, facts), 10);
  });
  it('has its own cap (0.8), separate from the learned cap', () => {
    let l: Feedback[] | undefined; for (let i = 0; i < 40; i++) l = setFeedback(l, { level: 'item', target: 'f' + i, elements: ['f' + i], v: 1 });
    const feats = Array.from({ length: 40 }, (_, i) => 'f' + i);
    const fs = feedbackScore(l, S, facts, feats); expect(fs.raw).toBeGreaterThan(FEEDBACK_CAP); expect(fs.total).toBe(FEEDBACK_CAP);
    const bd = scoreBreakdown({ ...base(), features: feats, feedback: l }); expect(bd.feedback).toBe(FEEDBACK_CAP); expect(bd.terms.find(t => t.name === 'feedback')?.group).toBe('feedback');
    expect(bd.learned).toBe(0); expect(bd.total).toBeCloseTo(bd.stated + bd.learned + FEEDBACK_CAP, 10);
  });
  it('ranks only: bounded, never filters, and a Dislike on one element does not ban the category', () => {
    const dis = setFeedback(undefined, { level: 'item', target: 'rock1', elements: ['rock1'], v: -1 });
    const withIt = feedbackScore(dis, S, facts, ['rock1']), without = feedbackScore(dis, S, facts, ['rock2', 'layout:rocky']);
    expect(withIt.total).toBeLessThan(0); expect(withIt.total).toBeGreaterThanOrEqual(-FEEDBACK_CAP); expect(without.total).toBe(0);   // other rocks / the rocky layout untouched
    const lay = setFeedback(undefined, { level: 'attr', cat: 'hardscape', attr: 'placement', elements: ['layout:rocky'], v: -1 });
    expect(Number.isFinite(feedbackScore(lay, S, facts, ['layout:rocky']).total)).toBe(true);
    const b0 = applyQuickPrefs(emptyBrief(), emptyAnswers()), b1 = setProjectExtras(b0, { feedback: dis });
    expect(readQuickPrefs(b1)).toEqual(readQuickPrefs(b0)); expect((b1.project as Record<string, unknown>).locks).toBeUndefined();   // no hard preference, told answer or lock appears
  });
  it('an unchanged brief scores exactly as before (no feedback term)', () => {
    const bd = scoreBreakdown(base()); expect(bd.feedback).toBe(0); expect(bd.terms.some(t => t.name === 'feedback')).toBe(false); expect(bd.total).toBe(bd.stated + bd.learned);
  });
  it('reset clears feedback and legacy thumbs, keeps the rest of the project', () => {
    const b = setProjectExtras(emptyBrief(), { direction: 'freshwater' as never, feedback: setAttrFeedback(undefined, 'plants', ['a'], 1), thumbs: { 'plants|b': { v: 1, e: ['b'] } } });
    const r = projectExtras(resetLearnedBrief(b)); expect(r.feedback).toBeUndefined(); expect(r.thumbs).toBeUndefined();
  });
});
