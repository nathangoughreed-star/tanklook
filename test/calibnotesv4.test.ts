// Survey v4 notes as the lens on their tank (scripts/calib-notes-v4.mjs, research/calib/v4/note-reading.md; Nathan 2026-10-26): a file
// with an unread note is refused, every answered field gets a status from the note, a restated value must be one the survey offers, a
// conditional answer is fitted and reviewed on the tank as the note describes it, and the notes' claims form a ledger of their own.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain node script, no types
import { applyNotes, checkNotes, fieldsOf, ledger, noteHash, skeleton } from '../scripts/calib-notes-v4.mjs';
// @ts-expect-error plain node script, no types
import { fileV4, roundV4 } from '../scripts/calib-fit.mjs';
// @ts-expect-error plain node script, no types
import { reviewV4 } from '../scripts/calib-review-v4.mjs';
// @ts-expect-error plain node script, no types
import { synthV4 } from '../scripts/calib-synth-v4.mjs';
import { condKey, condScenario, retableV4, type V4Doc } from '../src/calib/v4';
import V4J from '../research/calib/v4/scenarios-v4.json';
import T4 from '../research/calib/tables/v4.json';

const J = V4J as any, T = T4 as any, sc = (id: string) => J.scenarios.find((s: any) => s.id === id);
const NOTE = {
  A13: 'My counts assume young shop neons at about 2 cm; full-grown adults I would keep fewer. Twenty in a ten is a classic beginner mistake.',
  B07: 'I said caution because of the 13 inch width for demasoni, not the numbers. Mbuna keepers overstock on purpose to spread aggression.',
  A02: 'Not sure about the pair question, I have never kept nerites with neons.',
};
/** The synthetic agreeing expert, with three notes. */
function noted(expert = 'synth-agree', kind = 'ai') {
  const f = structuredClone(synthV4(J, T, { expert }));
  f.expertKind = kind;
  for (const [id, n] of Object.entries(NOTE)) f.answers[id].note = n;
  return f;
}
/** A complete reading of those notes. */
function read(f: any) {
  const R = skeleton(f);
  R.readBy = 'test'; R.read = '2026-10-26';
  const all = (id: string) => Object.fromEntries(fieldsOf(f.answers[id]).map((k: string) => [k, { status: 'as-clicked' }]));
  R.tanks.A13 = { ...R.tanks.A13, summary: 'counts assume juveniles at 20 mm', condition: { text: 'neons at 20 mm (juveniles)', quote: 'young shop neons at about 2 cm', tl: { neon: 20 } },
    fields: { ...all('A13'), ideal: { status: 'conditional', quote: 'My counts assume young shop neons', why: 'the counts are for juveniles' }, limit: { status: 'conditional', quote: 'My counts assume young shop neons', why: 'the counts are for juveniles' } },
    claims: [{ species: ['neon'], rule: 'space.water-small', claim: '20 neons in a 10 gal is overstocked', quote: 'Twenty in a ten is a classic beginner mistake', firm: true }] };
  R.tanks.B07 = { ...R.tanks.B07, summary: 'caution is about width, not numbers; mbuna overstocking is deliberate',
    fields: { ...all('B07'), reasons: { status: 'restated', value: ['aggression'], quote: 'because of the 13 inch width for demasoni', why: 'the caution is territory width, not temperature' } },
    claims: [{ species: ['demasoni', 'yellowlab'], rule: 'space.mbuna-convention', claim: 'mbuna are overstocked on purpose to spread aggression', quote: 'Mbuna keepers overstock on purpose to spread aggression', firm: true }] };
  R.tanks.A02 = { ...R.tanks.A02, summary: 'no experience of nerites with neons',
    fields: { ...all('A02'), together: { status: 'aside', quote: 'I have never kept nerites with neons', why: 'outside the expert\'s experience' }, reasons: { status: 'aside', quote: 'I have never kept nerites with neons', why: 'goes with together' } } };
  return R;
}
const condTables = (f: any, R: any) => ({ build: T.build, made: 'test', tanks: { [condKey('A13', f.expert)]: { base: 'A13', condition: R.tanks.A13.condition, ...retableV4(J as V4Doc, condScenario(sc('A13'), R.tanks.A13.condition, condKey('A13', f.expert))) } } });

describe('survey v4 notes as the lens on their tank', () => {
  it('refuses a file whose notes are not read, and names what is open', () => {
    const f = noted();
    expect(() => applyNotes(J, f, null)).toThrow(/notes are not all read/);
    const R = skeleton(f);
    expect(Object.keys(R.tanks).sort()).toEqual(['A02', 'A13', 'B07']);
    const c = checkNotes(J, f, R);
    expect(c.open.sort()).toEqual(['A02', 'A13', 'B07']);
    expect(c.problems).toContain('A13: ideal: no status');
    // a file without notes needs no readings
    expect(applyNotes(J, synthV4(J, T, { expert: 'plain' }), null).readings).toEqual([]);
  });

  it('holds a reading to the note it read: a changed note reopens the tank', () => {
    const f = noted(), R = read(f);
    expect(checkNotes(J, f, R).problems).toEqual([]);
    f.answers.A13.note += ' Edited.';
    expect(checkNotes(J, f, R).problems).toEqual(['A13: the note changed since it was read']);
    const again = skeleton(f, R);
    expect(again.tanks.A13.stale).toMatch(/changed/);
    expect(again.tanks.B07).toEqual(R.tanks.B07); // untouched notes keep their reading
    expect(again.tanks.A13.hash).toBe(noteHash(f.answers.A13.note));
  });

  it('checks quotes, restated values and conditions', () => {
    const f = noted(), R = read(f);
    R.tanks.B07.fields.reasons.quote = 'words the expert never wrote';
    R.tanks.A02.fields.together = { status: 'restated', value: 'maybe', quote: 'Not sure about the pair question', why: 'x' };
    R.tanks.A13.condition = { text: 'juveniles', quote: 'young shop neons at about 2 cm' }; // words only: the app cannot re-read it
    const p = checkNotes(J, f, R).problems;
    expect(p).toContain(`B07: reasons: restated needs the note's own words in "quote"`);
    expect(p.some((x: string) => /^A02: together: restated value "maybe" is not a valid answer/.test(x))).toBe(true);
    expect(p).toContain('A13: ideal: conditional, but the tank has no condition the app can model (stock, tempC or tl); set it aside instead');
  });

  it('reads every answer through the note: aside out, restated replaced, conditional moved to the tank the note describes', () => {
    const f = noted(), R = read(f), a = applyNotes(J, f, R), k = condKey('A13', f.expert);
    expect(a.answers.A13.ideal).toBeUndefined();
    expect(a.answers.A13.verdict).toBe(f.answers.A13.verdict); // as clicked, after reading the note
    expect(a.cond[k].answer).toMatchObject({ ideal: f.answers.A13.ideal, limit: f.answers.A13.limit, confidence: 'medium' });
    expect(a.answers.B07.reasons).toEqual(['aggression']);
    expect(a.answers.A02.together).toBeUndefined();
    expect(a.readings.map((x: any) => `${x.tank} ${x.field} ${x.status}`).sort()).toEqual(['A02 reasons aside', 'A02 together aside', 'A13 ideal conditional', 'A13 limit conditional', 'B07 reasons restated']);
    expect(a.claims.length).toBe(2);
  });

  it('fits a conditional count on the engine reading of the tank as the note describes it', () => {
    const f = noted(), R = read(f), a = applyNotes(J, f, R), C = condTables(f, R), k = condKey('A13', f.expert);
    const Rd = roundV4(J, T, C), s = Rd.scenarios.find((x: any) => x.id === k);
    expect(s.base).toBe('A13');
    // juvenile neons read emptier at every count than the adults the tank shows
    const base = Rd.scenarios.find((x: any) => x.id === 'A13'), w = (tb: any, n: number) => Object.values(tb[n].water as Record<string, number>).reduce((x, y) => x + y, 0);
    expect(w(s.table, 20)).toBeLessThan(w(base.table, 20));
    const fv = fileV4(a, Rd);
    expect(fv.answers.find((x: any) => x.id === k).focal.ideal).toBe(f.answers.A13.ideal);
    expect(fv.answers.find((x: any) => x.id === 'A13').focal.ideal).toBeNull();
    // without the conditional tables the counts are not fitted on the tank shown either
    expect(fileV4(a, roundV4(J, T)).v4.condOut).toBe(1);
  });

  it('shows each noted tank with its reading, the conditional answers against the app, and the ledger', () => {
    const f = noted(), R = read(f), a = applyNotes(J, f, R), C = condTables(f, R);
    const { md, flags } = reviewV4(J, T, [a], C);
    expect(md).toMatch(/## Each noted tank, read through its note/);
    expect(md).toMatch(/- reasons: restated \["temperature"\] -> \["aggression"\]: the caution is territory width/);
    expect(md).toMatch(/## Answered under the note's condition\n[\s\S]*\| A13 \| synth-agree \| neons at 20 mm \(juveniles\) \|/);
    expect(md).toMatch(/## What the notes claim, by rule/);
    // one AI model alone raises no rule
    expect(flags.filter((x: any) => x.kind === 'claim')).toEqual([]);
  });

  it('raises a claim made by two experts, or firmly by one person with high confidence', () => {
    const one = noted('model-a'), two = noted('model-b');
    const a1 = applyNotes(J, one, read(one)), a2 = applyNotes(J, two, read(two));
    expect(ledger([a1]).every((r: any) => !r.raised)).toBe(true);
    expect(ledger([a1, a2]).map((r: any) => [r.rule, r.raised])).toEqual([['space.mbuna-convention', true], ['space.water-small', true]]);
    const keeper = noted('keeper-x', 'keeper');
    keeper.answers.B07.confidence = 'high';
    const r = ledger([applyNotes(J, keeper, read(keeper))]);
    expect(r.find((x: any) => x.rule === 'space.mbuna-convention').raised).toBe(true);
    expect(r.find((x: any) => x.rule === 'space.water-small').raised).toBe(false); // medium confidence
  });
});
