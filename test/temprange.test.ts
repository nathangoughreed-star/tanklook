// Whole-stocking water temperature (temp-tiers, 2026-10-22): the shared range in three states, the setpoint kept apart, every
// reason shown with the main blocking one first.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies, type Species } from '../src/data/species';
import { gateOf, whyAnimal, whysAnimal } from '../src/scene/animalfit';
import { checkLevel, holdCheck, measuredCheck, NARROW_C, operatingCheck, rangeLine, rangeVerdict, sharedRange, type TempEvidence } from '../src/scene/temprange';
import { conflictOf, conflictsOf, rankTankmates, tempLinesOf } from '../src/ui/stockPlanLogic';
import { animalsOfSetup, hardTruths, planOf } from '../src/scene/plan';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';

const sp = (id: string) => getSpecies(id)!;
// synthetic fish: only the temperature differs, so nothing else can fire
const FAKE: Record<string, [number, number]> = { tA: [20, 25], tB0: [25, 30], tB1: [24, 30], tB2: [23, 30], tB4: [21, 30], tC: [22, 27], tD: [26, 28] };
const fake = (id: string) => ({ ...sp('neon'), id, name: id }) as Species;
beforeAll(() => { for (const [id, temp] of Object.entries(FAKE)) CARE[id] = { ...CARE.neon, temp, fam: undefined, prey: undefined }; });
afterAll(() => { for (const id of Object.keys(FAKE)) delete CARE[id]; });

describe('shared range: its states', () => {
  it('pairs sharing 0, 1, 2 and 4 °C: single, narrow, broad, broad; apart: none', () => {
    expect(NARROW_C).toBe(0); // any range is green: only one value (yellow) and none (red) are flagged
    expect(sharedRange([fake('tA'), fake('tB0')])).toMatchObject({ state: 'single', range: [25, 25] }); // they meet at one value
    expect(sharedRange([fake('tA'), fake('tD')]).state).toBe('none'); // 20-25 against 26-28: no overlap
    expect(sharedRange([fake('tA'), fake('tB1')])).toMatchObject({ state: 'broad', range: [24, 25] });
    expect(sharedRange([fake('tA'), fake('tB2')])).toMatchObject({ state: 'broad', range: [23, 25] }); // 2 °C wide is not a caution (Nathan 2026-10-27)
    expect(sharedRange([fake('tA'), fake('tB4')])).toMatchObject({ state: 'broad', range: [21, 25] });
  });
  it('none and one value block, each said as what it is; narrow is a concern that never reads as incompatible', () => {
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tD')])?.text).toMatch(/No suitable shared temperature identified/);
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB0')])[0]?.text).toMatch(/Only one shared temperature \(25 °C\); no operating margin/);
    expect(rangeLine(sharedRange([fake('tA'), fake('tB0')]))).toMatch(/^Temperature: Only one shared temperature \(25 °C\); no operating margin/);
    expect(whyAnimal(fake('tA'), 1e9, 3, [fake('tB1')])).toBeNull();
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB2')])).toEqual([]);
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB1')])).toEqual([]); // a 1 °C range is a range: green
    const one = whysAnimal(fake('tA'), 1e9, 3, [fake('tB0')]);
    expect(one).toHaveLength(1); expect(one[0]).toMatchObject({ concern: true, temp: true }); // one value: yellow, never blocking
    expect(rangeVerdict(sharedRange([fake('tA'), fake('tB0')]), []).level).toBe('warn');
    expect(rangeVerdict(sharedRange([fake('tA'), fake('tB1')]), []).level).toBe('ok');
    expect(rangeVerdict(sharedRange([fake('tA'), fake('tD')]), []).level).toBe('bad');
    expect(rangeLine(sharedRange([fake('tA'), fake('tB0')]), true)).toMatch(/\(77 °F\)/);
    expect(whysAnimal(fake('tA'), 1e9, 3, [fake('tB4')])).toEqual([]);
  });
  it('passing temperature says "temperature: shared range", never "compatible"', () => {
    for (const ids of [['tA', 'tB4'], ['tA', 'tB1'], ['tA', 'tB0'], ['tA', 'tD']]) expect(rangeLine(sharedRange(ids.map(fake)))).not.toMatch(/\bcompatible\b|ideal|optimal/i);
    expect(rangeLine(sharedRange([fake('tA'), fake('tB4')]))).toBe('Temperature: shared range 21–25 °C');
  });
  it('three species: the whole list is judged, and it is as narrow as its narrowest pair', () => {
    // tA 20-25, tC 22-27, tB1 24-30: pairs share 3, 1 and 3 °C; the whole list shares 24-25. For intervals, pairs that all overlap
    // always have a common value (Helly), so the whole-stock range is empty exactly when some pair's is: it never finds a clash the
    // pairs miss, it reports the range they all share and judges the setpoint against it.
    const r = sharedRange([fake('tA'), fake('tC'), fake('tB1')]);
    expect(r).toMatchObject({ state: 'broad', range: [24, 25] });
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
  it('one shared degree: say "set it to X" and keep checking the target and the measurement', () => {
    const one = sharedRange([fake('tA'), fake('tB0')]);
    expect(operatingCheck(one, ev({}))).toMatchObject({ state: 'unchecked', text: expect.stringMatching(/no target water temperature set \(set it to 25 °C/) });
    expect(operatingCheck(one, ev({ target: 25 })).state).toBe('inside');
    expect(operatingCheck(one, ev({ target: 27 })).state).toBe('outside');
    expect(measuredCheck(one, ev({ measured: 25 }))?.state).toBe('inside');
    expect(measuredCheck(one, ev({ measured: 27 }))?.state).toBe('outside');
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

describe('the cardinal (23-29 °C): 2 °C shared is broad, 1 °C is narrow', () => {
  for (const id of ['gbr', 'neon', 'pandacory', 'cpd', 'hillstream', 'cherryshrimp']) it(`${id}: 2 °C wide, broad, no temperature line`, () => {
    const r = sharedRange([sp('cardinal'), sp(id)]);
    expect(r.state, id).toBe('broad');
    expect(r.range![1] - r.range![0]).toBe(2);
    expect(whysAnimal(sp(id), 1e9, 3, [sp('cardinal')]).filter(w => w.temp)).toHaveLength(0);
  });
  it('goldfish (20-24 °C): 1 °C wide is still a range: green, no temperature line', () => {
    const r = sharedRange([sp('cardinal'), sp('goldfish')]);
    expect(r).toMatchObject({ state: 'broad', range: [23, 24] });
    expect(whysAnimal(sp('goldfish'), 1e9, 3, [sp('cardinal')]).filter(w => w.temp)).toEqual([]);
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
    const t = tempLinesOf([{ id: 'cardinal', n: 6 }, { id: 'goldfish', n: 2 }])!;
    expect(t.rangeState).toBe('broad');
    expect(t.range).toBe('Temperature: shared range 23–24 °C');
    expect(t.setpoint).toMatch(/^Water temperature: unchecked, no tank set up yet/);
  });
});

describe('the plan sheet: the two outputs, said once for the whole stocking', () => {
  const tank = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
  it('reef, heated, no target: a narrow shared range, the water unchecked; no per-species temperature lines', () => {
    const S = tank('reef'), t = hardTruths(S, animalsOfSetup(S), true);
    expect(t.filter(x => /^Temperature: /.test(x.text))).toEqual([{ text: expect.stringMatching(/shared range 24–25 °C/), level: 'ok' }]);
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
  it('through planOf: the Tech menu choice of no heater wins over the shopping list heater row (found in the browser check)', () => {
    const S = { ...tank('betta'), tech: { rows: { heater: 'none' }, roomC: 20 } } as ReturnType<typeof tank>;
    expect(planOf(S).verdict.find(v => /^Water temperature: /.test(v.text))).toMatchObject({ level: 'bad', text: expect.stringMatching(/estimated at the 20 °C room/) });
  });
  it('a line with several reasons keeps the main one and lists the others under it', () => {
    const S = tank('betta'), more = hardTruths({ ...S, fish: [] }, [{ species: 'oscar', n: 1 }, { species: 'neon', n: 6 }, { species: 'cardinal', n: 6 }], true).find(v => v.text.startsWith('Oscar'))!;
    expect(more.more?.length).toBeGreaterThan(0);
    expect(more.more!.every(m => !/^compatibility: /.test(m))).toBe(true);
  });
  it('a measured temperature out of range keeps the whole assessment problematic even when target and holding pass', () => {
    const S = { ...tank('betta'), tech: { rows: { heater: 'one' }, roomC: 22, targetC: 26, measuredC: 31 } } as ReturnType<typeof tank>, p = planOf(S);
    const line = (re: RegExp) => p.verdict.find(v => re.test(v.text));
    expect(line(/^Target water temperature 26 °C/)?.level).toBe('ok');
    expect(line(/^Holding 26 °C/)?.level).toBe('ok');
    expect(line(/^Measured water temperature 31 °C/)).toMatchObject({ level: 'bad', text: expect.stringMatching(/lower the temperature to 24–27 °C: cool it with a fan, a chiller or a cooler room/) });
    expect(line(/^Temperature: /)?.level).toBe('warn'); // the range line is not positive either
    expect(p.fits).toBe(false);
  });
  it('a 1 °C range: no blocking reason, no risk points, and green', () => {
    const S = { ...tank('betta'), fish: [], tech: { rows: { heater: 'one' }, targetC: 23 } } as ReturnType<typeof tank>;
    const t = hardTruths(S, [{ species: 'cardinal', n: 6 }, { species: 'goldfish', n: 2 }], true);
    expect(t.find(v => /^Temperature: /.test(v.text))).toMatchObject({ level: 'ok', text: expect.stringMatching(/shared range 23–24 °C/) });
    expect(t.some(v => v.level === 'bad' && /temperature/i.test(v.text))).toBe(false);
    expect(whyAnimal(sp('goldfish'), 1e9, 3, [sp('cardinal')])).toBeNull();
    expect(whysAnimal(sp('goldfish'), 1e9, 3, [sp('cardinal')])).toEqual([]);
  });
  it('a combination with no shared range leads with that, ahead of the setup fix (found in the browser check)', () => {
    const w = whysAnimal(sp('gbr'), 1e9, 3, [sp('amano')], { water: { heater: true, chiller: false, room: 21, roomSet: true, target: 24 } }).filter(x => !x.concern);
    expect(w[0].text).toMatch(/No suitable shared temperature identified/);
    expect(w[1].text).toMatch(/requires heating/);
  });
});

describe('species list (panels.ts animalGate via gateOf): blocker, concerns only, nothing', () => {
  it('a blocker is shown first and grays the item, the rest stay accessible', () => {
    const g = gateOf(whysAnimal(fake('tA'), 1e9, 3, [fake('tD'), sp('oscar')]))!;
    expect(g.block).toBe(true); expect(g.more.length).toBeGreaterThan(0);
  });
  it('a lone one-value temperature concern is the visible note, the animal not grayed', () => {
    const g = gateOf(whysAnimal(fake('tA'), 1e9, 3, [fake('tB0')]))!;
    expect(g).toMatchObject({ block: false, concern: true, more: [] });
    expect(g.text).toMatch(/Only one shared temperature/);
  });
  it('a lone advisory of any kind (e.g. the Amano predation note on invert-prey) is shown the same way', () => {
    expect(gateOf([{ kind: 'compat', concern: true, text: 'compatibility: may eat its small ones (Amano shrimp)' }])).toMatchObject({ block: false, text: expect.stringMatching(/Amano/) });
  });
  it('no reasons: nothing shown', () => { expect(gateOf(whysAnimal(fake('tA'), 1e9, 3, [fake('tB4')]))).toBeNull(); });
});

describe('a one-value pair is flagged even when the others already share nothing (invert-prey finding, 2026-10-22)', () => {
  it('ember 23-27 with a German blue ram 27-30, alone and beside Amano shrimp and cardinals', () => {
    for (const have of [['gbr'], ['gbr', 'amano'], ['gbr', 'amano', 'cardinal']]) {
      const w = whysAnimal(sp('ember'), 600, 3, have.map(sp)).find(x => x.temp); // yellow (a concern), never blocking
      expect(w?.text, have.join('+')).toMatch(/Only one shared temperature \(27 °C\); no operating margin \(German blue ram\)/);
    }
  });
});

describe('US units: every temperature in the water checks reads in °F', () => {
  const ev = (o: Partial<TempEvidence> = {}): TempEvidence => ({ heater: true, chiller: false, room: 21, roomSet: true, us: true, ...o });
  it("the 'set it to / inside' text and the band say °F, with the same values in °C when not US", () => {
    const r = sharedRange([fake('tA'), fake('tB4')]); // 21-25 °C = 70-77 °F
    expect(operatingCheck(r, ev()).text).toMatch(/set it inside 70–77 °F/);
    expect(operatingCheck(r, undefined, true).text).toMatch(/set it inside 70–77 °F/);
    expect(operatingCheck(r, ev({ us: false })).text).toMatch(/set it inside 21–25 °C/);
    const t = operatingCheck(r, ev({ target: 30 }));
    expect(t.text).toMatch(/Target water temperature 86 °F: outside the shared range 70–77 °F/);
    expect(t.fix).toMatch(/lower the target to 70–77 °F/);
    expect(operatingCheck(r, ev({ heater: false, room: 15 })).text).toMatch(/59 °F room.*70–77 °F/);
    expect(measuredCheck(r, ev({ measured: 16 }))!.text).toMatch(/Measured water temperature 61 °F: outside the shared range 70–77 °F/);
    expect(holdCheck(ev({ target: 24, room: 18, heater: false }))!.text).toMatch(/Holding 75 °F.*64 °F room/);
    expect(rangeVerdict(r, [], true).text).toBe('Temperature: shared range 70–77 °F');
    for (const k of [operatingCheck(r, ev({ target: 30 })), operatingCheck(r, ev()), measuredCheck(r, ev({ measured: 16 }))!]) expect(k.text + (k.fix ?? '')).not.toMatch(/°C/);
  });
});

describe('US units in the stock planner: the species-list temperature reasons read in °F', () => {
  const picks = [{ id: 'gbr', n: 2 }];
  it('conflictsOf says the clash in °F when `us`, in °C otherwise', () => {
    const f = conflictsOf(picks, 'amano', true).find(w => /temperature/.test(w.text))!, c = conflictsOf(picks, 'amano').find(w => /temperature/.test(w.text))!;
    expect(f.text).toMatch(/°F/); expect(f.text).not.toMatch(/°C/);
    expect(c.text).toMatch(/°C/); expect(c.text).not.toMatch(/°F/);
    expect(conflictOf(picks, 'amano', true)).toMatch(/°F/);
  });
  it('the tankmate ranking names the clash in °F too', () => {
    const m = rankTankmates(picks, undefined, true).find(x => x.sp.id === 'amano');
    expect(m?.why ?? '').toMatch(/°F/);
  });
});
