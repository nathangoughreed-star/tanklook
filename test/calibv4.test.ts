// Survey v4 tooling (research/calib/v4/survey-v4-design.md section 9): the answer parser (scripts/calib-parse-v4.mjs), the fit on v4
// answers (scripts/calib-fit.mjs) and the per-tag review (scripts/calib-review-v4.mjs), on synthetic experts made from the app's own
// readings (scripts/calib-synth-v4.mjs): one that agrees with the app raises nothing, one with a known shift raises the right flags.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain node script, no types
import { buildV4, checkAnswer, checkFile, jsonOf, merge } from '../scripts/calib-parse-v4.mjs';
// @ts-expect-error plain node script, no types
import { answersFit, combine, fileV4, fitRound, roundV4, withTables } from '../scripts/calib-fit.mjs';
// @ts-expect-error plain node script, no types
import { countFix, optionOf, reviewV4 } from '../scripts/calib-review-v4.mjs';
// @ts-expect-error plain node script, no types
import { synthV4 } from '../scripts/calib-synth-v4.mjs';
import V4J from '../research/calib/v4/scenarios-v4.json';
import T4 from '../research/calib/tables/v4.json';
import R1 from '../research/calib/round-1.json';
import R2 from '../research/calib/round-2.json';
import R3 from '../research/calib/round-3.json';
import R3A from '../research/calib/round-3a.json';
import A1 from '../research/calib/answers/round-1-ngr.json';
import A2 from '../research/calib/answers/round-2-ngr-ai.json';
import A3 from '../research/calib/answers/round-3-chatgpt-high.json';
import A3A from '../research/calib/answers/round-3-chatgpt.json';
import T1 from '../research/calib/tables/round-1.json';
import T2 from '../research/calib/tables/round-2.json';
import T3 from '../research/calib/tables/round-3.json';
import T3A from '../research/calib/tables/round-3a.json';
import FIT_OLD from '../research/calib/fit-round-1-2-3a-3.json';

const J = V4J as any, T = T4 as any, sc = (id: string) => J.scenarios.find((s: any) => s.id === id);
const agree = synthV4(J, T, { expert: 'synth-agree' }), shift = synthV4(J, T, { expert: 'synth-shift', load: 1.3, milder: true });

describe('survey v4 answer parser', () => {
  it('reads the build the survey prints', () => expect(buildV4(J)).toBe('c7cb52e6'));

  it('keeps valid values and sets aside everything the survey does not offer, never coercing', () => {
    const r = checkAnswer(sc('B07'), { verdict: 'caution', change: 'fewer', changeSp: ['yellowlab', 'oscar'], together: 'maybe', reasons: ['aggression', 'boredom'],
      ideal: 6, limit: '10', max: { demasoni: '12', yellowlab: '4' }, confidence: 'high', colour: 'blue' });
    expect(r.answer).toEqual({ verdict: 'caution', change: 'fewer', changeSp: ['yellowlab'], reasons: ['aggression'], ideal: 6, max: { demasoni: '12' }, confidence: 'high' });
    const why = Object.fromEntries(r.aside.map((x: any) => [x.field, x.value]));
    expect(why).toEqual({ changeSp: ['oscar'], together: 'maybe', reasons: ['boredom'], limit: '10', 'max.yellowlab': '4', colour: 'blue' });
  });

  it('reads skip either way, refuses fields the tank does not ask, and a count status beside counts', () => {
    expect(checkAnswer(sc('A01'), { verdict: 'skip', change: 'fewer' })).toEqual({ answer: { skip: true }, aside: [{ tank: 'A01', field: 'change', value: 'fewer', why: 'the tank was skipped: no other answer is read' }] });
    expect(checkAnswer(sc('A01'), { skip: true }).answer).toEqual({ skip: true });
    const r = checkAnswer(sc('A01'), { verdict: 'ideal', ideal: 3, bigEnough: 'yes', smallest: '5 gal (16 x 8 x 10 in)' });
    expect(r.answer).toEqual({ verdict: 'ideal', bigEnough: 'yes', smallest: '5 gal (16 x 8 x 10 in)' });
    expect(r.aside.map((x: any) => x.field)).toEqual(['ideal']);
    const c = checkAnswer(sc('A04'), { verdict: 'caution', ideal: 8, countStatus: 'cant-say' });
    expect(c.answer).toEqual({ verdict: 'caution' });
    expect(c.aside.length).toBe(2);
  });

  it('reads the LLM template shape inside a fenced reply and the HTML export shape alike', () => {
    const llm = 'Here you go:\n```json\n' + JSON.stringify({ survey: 'v4', build: 'c7cb52e6', module: 'D', expert: 'model-x', expertKind: 'ai', answers: { D02: { verdict: 'problems', change: 'ratio', together: 'caution', reasons: ['breeding'], max: { leopardgecko: '2' }, confidence: 'low', note: '' } } }) + '\n```';
    const html = { survey: 'v4', build: 'c7cb52e6', expert: 'model-x', expertKind: 'ai', modules: ['A'], answers: { A01: { verdict: 'ideal', change: 'nothing', bigEnough: 'yes', smallest: 'larger', confidence: 'medium', ms: 9000 } } };
    const a = checkFile(J, jsonOf(llm), 'v4-model-x-D.json'), b = checkFile(J, html, 'export.json');
    expect(a.answers.D02.max).toEqual({ leopardgecko: '2' });
    expect(a.open.length).toBe(15); // module D has 16 tanks
    const m = merge([a, b]);
    expect(m.modules).toEqual(['A', 'D']);
    expect(Object.keys(m.answers).sort()).toEqual(['A01', 'D02']);
    expect(m.build).toBe('c7cb52e6');
    expect(checkFile(J, { ...html, build: '859f1696' }).ok).toBe(false);
    expect(() => merge([a, checkFile(J, { ...html, expert: 'someone-else' })])).toThrow(/different experts/);
  });

  it('passes a synthetic expert with nothing set aside', () => {
    const c = checkFile(J, agree);
    expect(c.aside).toEqual([]);
    expect(Object.keys(c.answers).length).toBe(60);
  });
});

describe('survey v4 in the fit', () => {
  const R = roundV4(J, T);
  it('reads only the count tanks with a space.* or golden.* tag, on their tables', () => {
    expect(R.scenarios.length).toBe(22);
    expect(R.scenarios.every((s: any) => s.tests.some((t: string) => /^(space|golden)\./.test(t)))).toBe(true);
    expect(R.scenarios.map((s: any) => s.id)).not.toContain('A08'); // counts asked, but tagged tankmin / compat only
    const c4 = R.scenarios.find((s: any) => s.id === 'C04');
    expect(c4.salt).toBe(true);
    expect(c4.cls.chromis).toBe('salt');
  });
  it('matches v4 files by build, and never a v4 file to an old round', () => {
    expect(answersFit(R, fileV4(agree, R))).toBe(true);
    expect(answersFit(R, { ...fileV4(agree, R), build: 'deadbeef' })).toBe(false);
    expect(answersFit(R1 as any, fileV4(agree, R))).toBe(false);
  });
  it('maps verdict, confidence, skip and change onto the survey-2 rows', () => {
    const f = fileV4({ ...agree, answers: { A04: { verdict: 'unworkable', change: 'drop', confidence: 'high', ideal: 8, limit: 12 }, A05: { skip: true }, A01: { verdict: 'ideal' } } }, R);
    expect(f.answers).toEqual([{ id: 'A04', focal: { ideal: 8, limit: 12, status: {} }, overall: 2, floor: null, water: null, confidence: 2, limits: null, bigEnough: {}, together: null,
      review: { skip: ['overall'], why: 'v4 change "drop": a compatibility answer, not a room band' } }]);
    expect(f.v4).toEqual({ outside: 1, skipped: 1, carried: 0 });
  });
  it('moves nothing much for an expert who agrees with the app', () => {
    const fit = fitRound(R, [fileV4(agree, R)]);
    expect(Math.abs(Math.log(fit.g))).toBeLessThan(0.03);
    expect(Math.abs(Math.log(fit.f))).toBeLessThan(0.05);
  });
  it('reads the water scale down for an expert who keeps 30 % more fish', () => {
    const fit = fitRound(R, [fileV4(shift, R)]);
    expect(fit.g).toBeLessThan(0.85); // the round's cap is x0.8
  });
  it('fits rounds 1-3a exactly as before (fit-round-1-2-3a-3.json)', () => {
    const tabled = [[R1, T1], [R2, T2], [R3A, T3A], [R3, T3]].map(([r, t]) => withTables(r, t));
    const { round, files } = combine(tabled, [A1, A2, A3A, A3]);
    const fit = JSON.parse(JSON.stringify(fitRound(round, files), (k, v) => k === 'theta' ? undefined : v));
    const { tables: _cli, ...old } = FIT_OLD as any; // the CLI adds which tables it read
    expect(fit).toEqual(JSON.parse(JSON.stringify(old)));
  });
});

describe('survey v4 review', () => {
  it('raises no flag for an expert who answers as the app does', () => {
    const r = reviewV4(J, T, [agree]);
    expect(r.flags).toEqual([]);
    expect(r.md).toMatch(/## Verdict per tag/);
    expect(r.md).toMatch(/None: the answers agree/);
  });
  it('raises the known shift: counts read too full on the space tags, room verdicts and pairs milder, nothing else', () => {
    const { flags } = reviewV4(J, T, [shift]), kinds = new Set(flags.map((f: any) => f.kind));
    expect([...kinds].sort()).toEqual(['compat', 'count', 'verdict']);
    const count = flags.filter((f: any) => f.kind === 'count');
    expect(count.every((f: any) => f.dir === 'engine too full')).toBe(true);
    for (const tag of ['space.water', 'space.floor', 'space.canonical-20', 'space.reef-40']) expect(count.map((f: any) => f.key), tag).toContain(tag);
    expect(flags.filter((f: any) => f.kind !== 'count').every((f: any) => f.dir === 'milder')).toBe(true);
    // a pair the app blocks, answered one step milder
    expect(flags.find((f: any) => f.kind === 'compat' && f.key === 'A07')?.detail).toBe('app no, experts caution');
  });
  it('flags a minimum and a maximum the experts read differently', () => {
    const a = JSON.parse(JSON.stringify(agree));
    a.answers.A01.smallest = '20 gal long (30 x 12 x 12 in)';
    a.answers.D02.max.leopardgecko = '4+';
    const { flags } = reviewV4(J, T, [a]);
    expect(flags.map((f: any) => `${f.kind} ${f.key} ${f.dir}`).sort()).toEqual(['max D02 leopardgecko experts allow more', 'tankmin A01 betta experts want larger']);
  });
  it('allows for rounding: a count is a disagreement only past the step to its neighbours', () => {
    const tbl = [0, 40, 80, 120].map((p, n) => ({ n, water: { x: p }, floor: 0 }));
    expect(countFix(tbl, 2, 75, 'water').least).toBe(1); // 80 % is the nearest count to 75
    expect(countFix(tbl, 1, 75, 'water').least).toBeCloseTo(75 / Math.sqrt(40 * 80), 6); // 40 % is not: move to the midpoint
  });
  it('places the app\'s figure among the offered counts', () => {
    expect(optionOf(2, ['1', '2', '3', '4+'])).toBe(1);
    expect(optionOf(9, ['0', '4', '6', '8', '12', '16+'])).toBe(3);
    expect(optionOf(null, ['0', '1', '2', '3'])).toBe(3);
    expect(optionOf(20, ['0', '4', '6', '8', '12', '16+'])).toBe(5);
  });
});
