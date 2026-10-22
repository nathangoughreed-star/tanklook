// Whole-stocking water temperature (temp-tiers, 2026-10-22): the shared range in three states, the setpoint kept apart, every
// reason shown with the main blocking one first.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies, type Species } from '../src/data/species';
import { whyAnimal, whysAnimal } from '../src/scene/animalfit';
import { NARROW_C, rangeLine, setpointCheck, sharedRange } from '../src/scene/temprange';
import { conflictsOf, tempLinesOf } from '../src/ui/stockPlanLogic';
import { animalsOfSetup, hardTruths } from '../src/scene/plan';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';

const sp = (id: string) => getSpecies(id)!;
// synthetic fish: only the temperature differs, so nothing else can fire
const FAKE: Record<string, [number, number]> = { tA: [20, 25], tB0: [25, 30], tB1: [24, 30], tB2: [23, 30], tB4: [21, 30], tC: [22, 27], tD: [26, 28] };
const fake = (id: string) => ({ ...sp('neon'), id, name: id }) as Species;
beforeAll(() => { for (const [id, temp] of Object.entries(FAKE)) CARE[id] = { ...CARE.neon, temp, fam: undefined, prey: undefined }; });
afterAll(() => { for (const id of Object.keys(FAKE)) delete CARE[id]; });

describe('shared range: three states', () => {
  it('pairs sharing 0, 1, 2 and 4 °C: none, narrow, narrow, broad', () => {
    expect(NARROW_C).toBe(2);
    expect(sharedRange([fake('tA'), fake('tB0')]).state).toBe('none'); // 25 alone: they meet at one value
    expect(sharedRange([fake('tA'), fake('tB1')])).toMatchObject({ state: 'narrow', range: [24, 25] });
    expect(sharedRange([fake('tA'), fake('tB2')])).toMatchObject({ state: 'narrow', range: [23, 25] });
    expect(sharedRange([fake('tA'), fake('tB4')])).toMatchObject({ state: 'broad', range: [21, 25] });
  });
  it('only none blocks; narrow is a concern that never reads as incompatible', () => {
    const none = whyAnimal(fake('tA'), 1e9, 3, [fake('tB0')]);
    expect(none?.text).toMatch(/No suitable shared temperature identified/);
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tB1')])).toBeNull();
    const narrow = whysAnimal(fake('tA'), 1e9, 3, [fake('tB2')]);
    expect(narrow).toHaveLength(1);
    expect(narrow[0]).toMatchObject({ concern: true, temp: true });
    expect(narrow[0].text).toMatch(/shared range 23–25 °C/);
    expect(narrow[0].text).not.toMatch(/compatib(le|ility):|incompatible with|cannot/i);
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB4')])).toEqual([]);
  });
  it('passing temperature says "temperature: shared range", never "compatible"', () => {
    for (const ids of [['tA', 'tB4'], ['tA', 'tB2'], ['tA', 'tB0']]) expect(rangeLine(sharedRange(ids.map(fake)))).not.toMatch(/\bcompatible\b|ideal|optimal/i);
    expect(rangeLine(sharedRange([fake('tA'), fake('tB4')]))).toBe('Temperature: shared range 21–25 °C');
  });
  it('three species: the whole list is judged, and it is as narrow as its narrowest pair', () => {
    // tA 20-25, tC 22-27, tB1 24-30: pairs share 3, 1 and 3 °C; the whole list shares 24-25. For intervals, pairs that all overlap
    // always have a common value (Helly), so the whole-stock range is empty exactly when some pair's is: it never finds a clash the
    // pairs miss, it reports the range they all share and judges the setpoint against it.
    const r = sharedRange([fake('tA'), fake('tC'), fake('tB1')]);
    expect(r).toMatchObject({ state: 'narrow', range: [24, 25] });
    expect(r.floor?.id).toBe('tB1'); expect(r.ceiling?.id).toBe('tA');
    // a newcomer that empties the shared range is named against the species setting the bound it misses
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tC'), fake('tD')])?.text).toMatch(/No suitable shared temperature identified.*\(tD\)/);
  });
  it('land animals and species with no recorded range are left out, and said so', () => {
    const r = sharedRange([fake('tA'), sp('leopardgecko')]);
    expect(r.counted.map(s => s.id)).toEqual(['tA']);
  });
});

describe('setpoint: a separate output', () => {
  let broad: ReturnType<typeof sharedRange>;
  beforeAll(() => { broad = sharedRange([fake('tA'), fake('tB4')]); }); // 21-25
  it('a broad range still fails at a setpoint outside it', () => {
    expect(broad.state).toBe('broad');
    expect(setpointCheck(broad, { kind: 'room', c: 19, set: true })).toMatchObject({ state: 'outside' });
    expect(setpointCheck(broad, { kind: 'room', c: 19, set: false }).state).toBe('outside');
    expect(setpointCheck(broad, { kind: 'room', c: 23, set: true }).state).toBe('inside');
  });
  it('no setpoint known: unchecked, never passed', () => {
    expect(setpointCheck(broad).state).toBe('unchecked');
    expect(setpointCheck(broad, { kind: 'heater' })).toMatchObject({ state: 'unchecked' });
    expect(setpointCheck(broad, { kind: 'heater' }).text).toMatch(/set it inside 21–25 °C/);
    expect(setpointCheck(broad, { kind: 'room', c: 23, set: false }).state).toBe('unchecked'); // an assumed room proves nothing
  });
});

describe('the cardinal (23-29 °C) at exactly 2 °C: narrow, not a clash', () => {
  for (const id of ['gbr', 'neon', 'pandacory', 'cpd', 'hillstream', 'cherryshrimp']) it(id, () => {
    const r = sharedRange([sp('cardinal'), sp(id)]);
    expect(r.state, id).toBe('narrow');
    expect(r.range![1] - r.range![0]).toBe(2);
    const t = whysAnimal(sp(id), 1e9, 3, [sp('cardinal')]).filter(w => w.temp);
    expect(t).toHaveLength(1); expect(t[0].concern).toBe(true);
  });
});

describe('display: main reason first, other concerns under it', () => {
  it('conflictsOf keeps every reason, blocking ones first', () => {
    // an oscar eats neons, and the neon / oscar ranges are judged too
    const w = conflictsOf([{ id: 'oscar', n: 1 }, { id: 'neon', n: 6 }, { id: 'cardinal', n: 6 }], 'neon');
    expect(w[0]).toMatchObject({ block: true }); expect(w[0].text).toMatch(/eat/);
    const firstConcern = w.findIndex(x => !x.block);
    if (firstConcern >= 0) expect(w.slice(firstConcern).every(x => !x.block)).toBe(true);
  });
  it('the planner shows the shared range and an unchecked setpoint as two lines', () => {
    const t = tempLinesOf([{ id: 'cardinal', n: 6 }, { id: 'gbr', n: 2 }])!;
    expect(t.rangeState).toBe('narrow');
    expect(t.range).toMatch(/shared range 27–29 °C, a narrow margin/);
    expect(t.setpoint).toMatch(/^Setpoint: unchecked/);
  });
});

describe('the plan sheet: the two outputs, said once for the whole stocking', () => {
  const tank = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
  it('reef, heated: a narrow shared range, setpoint unchecked; no per-species temperature lines', () => {
    const S = tank('reef'), t = hardTruths(S, animalsOfSetup(S), true);
    expect(t.filter(x => /^Temperature: /.test(x.text))).toEqual([{ text: expect.stringMatching(/shared range 24–25 °C, a narrow margin/), level: 'warn' }]);
    expect(t.find(x => /^Setpoint: /.test(x.text))).toMatchObject({ level: 'warn', text: expect.stringMatching(/unchecked, the plan records no heater setting/) });
    expect(t.some(x => /: (water )?temperature/.test(x.text))).toBe(false);
  });
  it('betta, no heater, the room set to 20 °C: a broad range that the setpoint misses', () => {
    const S = { ...tank('betta'), tech: { rows: {}, roomC: 20 } } as ReturnType<typeof tank>, t = hardTruths(S, animalsOfSetup(S), false);
    expect(t.find(x => /^Temperature: /.test(x.text))).toMatchObject({ level: 'ok', text: 'Temperature: shared range 24–27 °C' });
    expect(t.find(x => /^Setpoint: /.test(x.text))).toMatchObject({ level: 'bad', text: expect.stringMatching(/20 °C room, outside the shared range 24–27 °C/) });
  });
});
