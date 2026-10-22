// Whole-stocking water temperature (temp-tiers, 2026-10-22): the shared range in three states, the setpoint kept apart, every
// reason shown with the main blocking one first.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies, type Species } from '../src/data/species';
import { whyAnimal, whysAnimal } from '../src/scene/animalfit';
import { checkLevel, holdCheck, measuredCheck, NARROW_C, operatingCheck, rangeLine, rangeVerdict, sharedRange, type TempEvidence } from '../src/scene/temprange';
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

describe('shared range: its states', () => {
  it('pairs sharing 0, 1, 2 and 4 °C: single, narrow, narrow, broad; apart: none', () => {
    expect(NARROW_C).toBe(2);
    expect(sharedRange([fake('tA'), fake('tB0')])).toMatchObject({ state: 'single', range: [25, 25] }); // they meet at one value
    expect(sharedRange([fake('tA'), fake('tD')]).state).toBe('none'); // 20-25 against 26-28: no overlap
    expect(sharedRange([fake('tA'), fake('tB1')])).toMatchObject({ state: 'narrow', range: [24, 25] });
    expect(sharedRange([fake('tA'), fake('tB2')])).toMatchObject({ state: 'narrow', range: [23, 25] });
    expect(sharedRange([fake('tA'), fake('tB4')])).toMatchObject({ state: 'broad', range: [21, 25] });
  });
  it('none and one value block, each said as what it is; narrow is a concern that never reads as incompatible', () => {
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tD')])?.text).toMatch(/No suitable shared temperature identified/);
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tB0')])?.text).toMatch(/Only one shared temperature \(25 °C\); no operating margin/);
    expect(rangeLine(sharedRange([fake('tA'), fake('tB0')]))).toMatch(/^Temperature: Only one shared temperature \(25 °C\); no operating margin/);
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tB1')])).toBeNull();
    const narrow = whysAnimal(fake('tA'), 1e9, 3, [fake('tB2')]);
    expect(narrow).toHaveLength(1);
    expect(narrow[0]).toMatchObject({ concern: true, temp: true });
    expect(narrow[0].text).toMatch(/shared range 23–25 °C/);
    expect(narrow[0].text).not.toMatch(/compatib(le|ility):|incompatible with|cannot/i);
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB4')])).toEqual([]);
  });
  it('passing temperature says "temperature: shared range", never "compatible"', () => {
    for (const ids of [['tA', 'tB4'], ['tA', 'tB2'], ['tA', 'tB0'], ['tA', 'tD']]) expect(rangeLine(sharedRange(ids.map(fake)))).not.toMatch(/\bcompatible\b|ideal|optimal/i);
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

describe("this plan's water: target, holding it, a measurement, kept apart", () => {
  let broad: ReturnType<typeof sharedRange>;
  beforeAll(() => { broad = sharedRange([fake('tA'), fake('tB4')]); }); // 21-25
  const ev = (x: Partial<TempEvidence>): TempEvidence => ({ heater: true, chiller: false, room: 21, roomSet: true, ...x });

  it('a target outside a broad range: no positive verdict, the correction offered, the combination not flagged', () => {
    for (const target of [19, 27]) {
      const k = operatingCheck(broad, ev({ target })), v = rangeVerdict(broad, [k]);
      expect(k.state).toBe('outside');
      expect(v.level).toBe('warn'); // not positive, and not a species clash
      expect(v.text).toMatch(/^Temperature: shared range 21–25 °C; this plan's water is outside it as set/);
      expect(k.text).not.toMatch(/incompatib|cannot share|No suitable shared|not at fault/i);
    }
    expect(operatingCheck(broad, ev({ target: 19 })).fix).toBe('raise the target to 21–25 °C');
    expect(operatingCheck(broad, ev({ target: 27 })).fix).toBe('lower the target to 21–25 °C');
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tB4')])).toBeNull();
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB4')]).filter(w => w.temp)).toEqual([]);
  });
  it('a target inside: the operating check passes, but holding it is a separate answer (a heater setting alone is not green)', () => {
    expect(operatingCheck(broad, ev({ target: 23 })).state).toBe('inside');
    expect(holdCheck(ev({ target: 23, heatHolds: true }))).toMatchObject({ state: 'inside', text: expect.stringMatching(/expected, not measured/) });
    expect(holdCheck(ev({ target: 23, heatHolds: false }))?.state).toBe('outside');
    expect(holdCheck(ev({ target: 23, heater: false }))).toMatchObject({ state: 'outside', text: expect.stringMatching(/requires heating/) });
    expect(holdCheck(ev({ target: 23, room: 28 }))).toMatchObject({ state: 'outside', text: expect.stringMatching(/requires cooling.*a fan, a chiller or a cooler room/) });
    expect(holdCheck(ev({ target: 23, room: 28, chiller: true }))?.state).toBe('inside');
    expect(holdCheck(ev({ target: 23, heater: false, roomSet: false }))?.state).toBe('conditional'); // the room is only assumed
    expect(holdCheck(ev({}))).toBeNull(); // no target, nothing to hold
  });
  it('no heater: an ENTERED room is assessed as a modelled estimate, labelled so; the correction follows the direction', () => {
    const cold = operatingCheck(broad, ev({ heater: false, room: 19 })), warm = operatingCheck(broad, ev({ heater: false, room: 28 }));
    expect(cold.state).toBe('outside'); expect(warm.state).toBe('outside');
    expect(cold.text).toMatch(/estimated at the 19 °C room \(a model, not a measurement\)/);
    expect(cold.fix).toBe('raise the temperature to 21–25 °C: add a heater set to 21–25 °C');
    expect(warm.fix).toBe('lower the temperature to 21–25 °C: cool it with a fan, a chiller or a cooler room');
    expect(warm.fix).not.toMatch(/heater/); // an unheated tank in a warm room is never told to add a heater
    expect(operatingCheck(broad, ev({ heater: false, room: 23 })).state).toBe('inside');
  });
  it('no heater, the room only ASSUMED: a conditional concern, never a definitive failure or "this plan runs outside it"', () => {
    const k = operatingCheck(broad, ev({ heater: false, room: 19, roomSet: false }));
    expect(k.state).toBe('conditional');
    expect(k.text).toMatch(/^Water temperature: if the room is about 19 °C \(assumed, not entered\)/);
    expect(checkLevel(k)).toBe('warn');
    expect(rangeVerdict(broad, [k])).toEqual({ level: 'ok', text: 'Temperature: shared range 21–25 °C' });
    expect(operatingCheck(broad, ev({ heater: false, room: 23, roomSet: false })).state).toBe('unchecked'); // inside, but assumed: not passed
  });
  it('a measurement is assessed directly, apart from the target', () => {
    expect(measuredCheck(broad, ev({ measured: 24 }))?.state).toBe('inside');
    expect(measuredCheck(broad, ev({ measured: 27, target: 23 }))).toMatchObject({ state: 'outside', fix: 'lower the temperature to 21–25 °C: cool it with a fan, a chiller or a cooler room' });
    expect(measuredCheck(broad, ev({}))).toBeNull();
  });
  it('unknown: unchecked, never passed', () => {
    expect(operatingCheck(broad).state).toBe('unchecked');
    expect(operatingCheck(broad, ev({}))).toMatchObject({ state: 'unchecked', text: expect.stringMatching(/no target water temperature set \(set it inside 21–25 °C/) });
  });
});

describe('the species card: the setup, not the combination, and fixable', () => {
  it('no heater in an entered cold room: requires heating, with the fix; an assumed room is a concern only', () => {
    const neon = sp('neon');
    const w = whyAnimal(neon, 200, 3, [], { water: { heater: false, chiller: false, room: 17, roomSet: true } });
    expect(w?.text).toMatch(/^water temperature: requires heating, wants 21–25 °C, no heater, the water is estimated at the 17 °C room: raise the temperature to 21–25 °C: add a heater/);
    expect(whyAnimal(neon, 200, 3, [], { water: { heater: false, chiller: false, room: 17, roomSet: false } })).toBeNull();
    expect(whysAnimal(neon, 200, 3, [], { water: { heater: false, chiller: false, room: 17, roomSet: false } })[0]).toMatchObject({ concern: true });
    expect(whyAnimal(sp('goldfish'), 500, 3, [], { water: { heater: false, chiller: false, room: 30, roomSet: true } })?.text).toMatch(/requires cooling.*a fan, a chiller or a cooler room/);
    expect(whyAnimal(neon, 200, 3, [], { water: { heater: true, chiller: false, room: 17, roomSet: true, target: 28 } })?.text).toMatch(/requires cooling, wants 21–25 °C, the target is 28 °C: lower the target to 21–25 °C/);
    expect(whyAnimal(neon, 200, 3, [], {})).toBeNull();
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
    expect(t.setpoint).toMatch(/^Water temperature: unchecked, no tank set up yet/);
  });
});

describe('the plan sheet: the two outputs, said once for the whole stocking', () => {
  const tank = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
  it('reef, heated, no target: a narrow shared range, the water unchecked; no per-species temperature lines', () => {
    const S = tank('reef'), t = hardTruths(S, animalsOfSetup(S), true);
    expect(t.filter(x => /^Temperature: /.test(x.text))).toEqual([{ text: expect.stringMatching(/shared range 24–25 °C, a narrow margin/), level: 'warn' }]);
    expect(t.find(x => /^Water temperature: /.test(x.text))).toMatchObject({ level: 'warn', text: expect.stringMatching(/unchecked, no target water temperature set/) });
    expect(t.some(x => /: (water )?temperature/.test(x.text))).toBe(false);
  });
  it('betta, no heater, the room entered as 20 °C: a broad range the modelled water misses, naming who', () => {
    const S = { ...tank('betta'), tech: { rows: { heater: 'none' }, roomC: 20 } } as ReturnType<typeof tank>, t = hardTruths(S, animalsOfSetup(S), false);
    expect(t.find(x => /^Temperature: /.test(x.text))).toMatchObject({ level: 'warn', text: expect.stringMatching(/^Temperature: shared range 24–27 °C; this plan's water is outside it as set/) });
    expect(t.find(x => /^Water temperature: /.test(x.text))).toMatchObject({ level: 'bad', text: expect.stringMatching(/estimated at the 20 °C room \(a model, not a measurement\), outside the shared range 24–27 °C \(too cold for Betta.*\): raise the temperature to 24–27 °C: add a heater/) });
    expect(t.some(x => /incompatib|No suitable shared/i.test(x.text))).toBe(false);
  });
  it('betta, no heater, the room NOT entered: a conditional concern; the range line stays about the species', () => {
    const S = { ...tank('betta'), tech: { rows: { heater: 'none' } } } as ReturnType<typeof tank>, t = hardTruths(S, animalsOfSetup(S), false);
    expect(t.find(x => /^Temperature: /.test(x.text))).toMatchObject({ level: 'ok', text: 'Temperature: shared range 24–27 °C' });
    expect(t.find(x => /^Water temperature: /.test(x.text))).toMatchObject({ level: 'warn', text: expect.stringMatching(/^Water temperature: if the room is about 21 °C \(assumed, not entered\)/) });
    expect(t.some(x => x.level === 'bad' && /temperature/i.test(x.text))).toBe(false);
  });
  it('a target and a measurement each get their own line', () => {
    const S = { ...tank('betta'), tech: { rows: {}, roomC: 20, targetC: 26, measuredC: 23 } } as ReturnType<typeof tank>, t = hardTruths(S, animalsOfSetup(S), true);
    expect(t.find(x => /^Target water temperature/.test(x.text))).toMatchObject({ level: 'ok' });
    expect(t.find(x => /^Holding 26 °C/.test(x.text))).toBeTruthy();
    expect(t.find(x => /^Measured water temperature 23 °C/.test(x.text))).toMatchObject({ level: 'bad', text: expect.stringMatching(/raise the temperature to 24–27 °C: turn the heater up/) });
    expect(t.some(x => /not at fault/.test(x.text))).toBe(false);
  });
});
