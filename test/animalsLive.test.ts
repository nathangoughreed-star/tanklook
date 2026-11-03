// Lane DA1: the Animals step's live numbers (src/ui/discovery/animalsLive.ts), pure: meter, totals, steppers, welfare lines and fixes. No DOM, no WebGL, no pixel asserts.
import { describe, expect, it } from 'vitest';
import { TANK_MODELS } from '../src/data/tanks';
import { CARE } from '../src/data/care';
import type { AnimalCount } from '../src/scene/tankfit';
import {
  applyFixToChosen, deltaOf, groupMin, meterOf, moneyOf, picksOfChosen, rosterKeyOf, rosterLive, speciesLive, stepCount, usdWord,
} from '../src/ui/discovery/animalsLive';
import { addAnimal, dropAnimal } from '../src/ui/discovery/animals';

const tank = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const B60 = tank('60 gal breeder'), G10 = tank('10 gal');
const MBUNA: AnimalCount = { species: 'labeo', n: 5 }, LAB: AnimalCount = { species: 'yellowlab', n: 5 }, PUFFER: AnimalCount = { species: 'peapuffer', n: 4 };
const NATHAN = [MBUNA, LAB];

describe('the stocking meter', () => {
  it('is empty with nothing chosen and fills as animals are added', () => {
    const m0 = meterOf([], B60), m1 = meterOf([MBUNA], B60), m2 = meterOf(NATHAN, B60);
    expect(m0).toMatchObject({ pct: 0, band: 'empty' });
    expect(m1.pct).toBeGreaterThan(0);
    expect(m2.pct).toBeGreaterThan(m1.pct);
    expect(m2.band).not.toBe('empty');
  });
  it('goes red (over) when the tank is over-stocked, and says why', () => {
    const many: AnimalCount[] = [{ species: 'labeo', n: 40 }, { species: 'yellowlab', n: 40 }];
    const m = meterOf(many, B60);
    expect(m.band).toBe('over');
    expect(m.pct).toBeGreaterThan(100);
    expect(m.word).toMatch(/over|does not suit/i);
  });
  it('the same animals fill a smaller tank more', () => {
    expect(meterOf([MBUNA], G10).pct).toBeGreaterThan(meterOf([MBUNA], B60).pct);
  });
});

describe('cost and care time', () => {
  it('is nothing without animals; the animals add set-up, monthly and care time to the same tank empty', () => {
    expect(moneyOf([], B60)).toBeUndefined();
    const m = moneyOf(NATHAN, B60)!;
    expect(m.setupUsd).toBeGreaterThan(0);
    expect(m.addSetupUsd).toBeGreaterThan(0);
    expect(m.addSetupUsd).toBeLessThanOrEqual(m.setupUsd);
    expect(m.minSetupUsd).toBeLessThanOrEqual(m.setupUsd);
    expect(m.monthlyUsd).toBeGreaterThanOrEqual(m.addMonthlyUsd);
  });
  it('more animals never cost less to set up', () => {
    expect(moneyOf(NATHAN, B60)!.setupUsd).toBeGreaterThanOrEqual(moneyOf([MBUNA], B60)!.setupUsd);
  });
  it('deltaOf is what the last change did, an empty roster counting as zero', () => {
    const a = moneyOf([MBUNA], B60), b = moneyOf(NATHAN, B60);
    expect(deltaOf(a, b).setupUsd).toBe(b!.setupUsd - a!.setupUsd);
    expect(deltaOf(undefined, a).setupUsd).toBe(a!.setupUsd);
    expect(deltaOf(a, undefined).setupUsd).toBe(-a!.setupUsd);
    expect(usdWord(38, true)).toBe('+$38');
    expect(usdWord(-1204, true)).toBe('-$1,204');
  });
});

describe('count steppers', () => {
  it('step one animal at a time and stop at one (Remove takes the last out)', () => {
    expect(stepCount({ species: 'tigerbarb', n: 6 }, 1).n).toBe(7);
    expect(stepCount({ species: 'tigerbarb', n: 6 }, -1).n).toBe(5);
    expect(stepCount({ species: 'tigerbarb', n: 1 }, -1).n).toBe(1);
  });
  it('a count under the group minimum is allowed, flagged and never corrected', () => {
    const gm = groupMin('tigerbarb');
    expect(gm).toBeGreaterThan(3);
    const c = stepCount({ species: 'tigerbarb', n: gm }, -1);
    expect(c.n).toBe(gm - 1);
    const sl = speciesLive([c], B60)[0];
    expect(sl.belowGroup).toBe(true);
    expect(sl.lines.some(l => l.tone === 'bad' || l.tone === 'warn' || /group/i.test(l.text))).toBe(true);
    expect(speciesLive([{ species: 'tigerbarb', n: gm }], B60)[0].belowGroup).toBe(false);
  });
  it('a species kept by sex keeps near its ratio as it steps', () => {
    const r = CARE.labeo.sexed?.ratio ?? CARE.yellowlab.sexed?.ratio;
    const sexed = Object.keys(CARE).find(id => CARE[id].sexed && CARE[id].sexed!.ratio[0] > 0 && CARE[id].sexed!.ratio[1] > 0)!;
    const [rm, rf] = CARE[sexed].sexed!.ratio, per = rm + rf;
    let c: AnimalCount = { species: sexed, n: per * 2, f: rf * 2 };
    for (let i = 0; i < 6; i++) c = stepCount(c, 1);
    expect(c.n).toBe(per * 2 + 6);
    const fShare = (c.f ?? 0) / c.n, want = rf / per;
    expect(Math.abs(fShare - want)).toBeLessThan(0.15);
    void r;
    let d = c; for (let i = 0; i < 6; i++) d = stepCount(d, -1);
    expect(d.n).toBe(per * 2);
  });
  it('picks keep the males in n and the females in f', () => {
    expect(picksOfChosen([{ species: 'x', n: 6, f: 4 }])).toEqual([{ id: 'x', n: 2, f: 4 }]);
    expect(picksOfChosen([{ species: 'x', n: 6 }])).toEqual([{ id: 'x', n: 6 }]);
  });
});

describe('welfare, per species', () => {
  it('names temperature in deg F, and the tank minimum in inches and gallons', () => {
    const sl = speciesLive([LAB], B60, true)[0], text = sl.lines.map(l => l.text).join('\n');
    expect(text).toMatch(/Water .*°F/);
    expect(text).not.toMatch(/°C/);
    expect(text).toMatch(/Tank at least \d+ in long|Tank of about \d+ gal/);
  });
  it('flags a tank too small for a species, in plain words', () => {
    const sl = speciesLive([LAB], G10, true)[0];
    expect(sl.lines.some(l => l.tone === 'bad')).toBe(true);
  });
});

describe('welfare, the whole roster (Nathan case: 60 gal breeder, mbuna + yellow labs)', () => {
  it('mbuna and yellow labs together raise no clash', () => {
    const r = rosterLive(NATHAN, B60, { us: true });
    expect(r.lines.filter(l => l.kind === 'temperament' || l.kind === 'temperature')).toEqual([]);
    expect(r.temp?.tone).toBe('ok');
    expect(r.temp?.text).toMatch(/°F/);
  });
  it('adding a pea puffer to mbuna is a flagged clash with a Remove fix; nothing is removed for the person', () => {
    const roster = addAnimal(NATHAN, PUFFER), r = rosterLive(roster, B60, { us: true });
    const clash = r.lines.filter(l => l.kind === 'temperament' || l.kind === 'temperature');
    expect(clash.length).toBeGreaterThan(0);
    expect(clash.every(l => l.welfare)).toBe(true);
    expect(clash.some(l => l.fix?.op.op === 'remove')).toBe(true);
    expect(roster.map(c => c.species)).toContain('peapuffer');   // still there
    const fix = clash.find(l => l.fix?.op.op === 'remove')!.fix!;
    const after = applyFixToChosen(roster, fix.op);
    expect(after.length).toBeLessThan(roster.length);            // only because the fix was applied
  });
  it('one animal that clashes with two others is one warning with one button, naming both', () => {
    const r = rosterLive(addAnimal(NATHAN, PUFFER), B60, { us: true }), removes = r.lines.filter(l => l.fix?.op.op === 'remove' && l.fix.op.id === 'peapuffer');
    expect(removes.length).toBe(1);
    expect(removes[0].text).toMatch(/Blue-nosed mbuna, Yellow lab cichlid|Yellow lab cichlid, Blue-nosed mbuna/);
  });
  it('over-stocking is flagged as a welfare line with the engine\'s fix', () => {
    const many: AnimalCount[] = [{ species: 'labeo', n: 40 }, { species: 'yellowlab', n: 40 }], r = rosterLive(many, B60, { us: true });
    expect(r.lines.some(l => l.kind === 'tank' && l.welfare)).toBe(true);
  });
  it('a tank fix is left out when the tank cannot change (the person\'s own, Required), the line stays', () => {
    const many: AnimalCount[] = [{ species: 'labeo', n: 40 }, { species: 'yellowlab', n: 40 }];
    const free = rosterLive(many, B60, { us: true, canChangeTank: true }), locked = rosterLive(many, B60, { us: true, canChangeTank: false });
    expect(locked.lines.some(l => l.fix?.op.op === 'tank')).toBe(false);
    expect(locked.lines.length).toBe(free.lines.length);
  });
  it('a group below its minimum is a school warning with an Add fix that raises the count to the minimum', () => {
    const roster: AnimalCount[] = [{ species: 'tigerbarb', n: 3 }], r = rosterLive(roster, B60, { us: true }), w = r.lines.find(l => l.kind === 'school')!;
    expect(w).toBeTruthy();
    expect(w.fix?.op.op).toBe('add');
    expect(applyFixToChosen(roster, w.fix!.op)[0].n).toBe(groupMin('tigerbarb'));
  });
  it('an empty roster says nothing', () => {
    expect(rosterLive([], B60)).toEqual({ lines: [] });
    expect(speciesLive([], B60)).toEqual([]);
  });
});

describe('keys and hand-off', () => {
  it('the roster key ignores order; drop / add never change the others', () => {
    expect(rosterKeyOf([MBUNA, LAB])).toBe(rosterKeyOf([LAB, MBUNA]));
    expect(dropAnimal(addAnimal(NATHAN, PUFFER), 'peapuffer')).toEqual(NATHAN);
  });
});

// Lane DA2 (2026-11-03): the per-species size line calls the gate's own verdict, across every species x every catalogue tank.
describe('the card size line agrees with the gate', async () => {
  const { SPECIES } = await import('../src/data/species');
  const { fitIn } = await import('../src/scene/tankfit');
  const { minDataOf } = await import('../src/scene/tankMin');
  const { tankFromModel } = await import('../src/data/tanks');
  const sizeLine = (id: string, m: (typeof TANK_MODELS)[number]) => speciesLive([{ species: id, n: 1 }], m, true)[0].lines.find(l => /^Tank (at least|of about|size)/.test(l.text));
  it('is bad exactly when the gate fails size, and never reads equal-against-equal while flagged', () => {
    let pairs = 0, wrong = 0, oldWrong = 0; const worst: string[] = [];
    for (const sp of SPECIES) for (const m of TANK_MODELS) {
      const fit = fitIn([{ species: sp.id, n: 1 }], m); if (!fit) continue;
      const gate = fit.fails.includes('minimum') || fit.fails.includes('length'), line = sizeLine(sp.id, m); pairs++;
      // the card line before DA2: red length with a 1 mm tolerance
      const md = minDataOf(sp.id), oldBad = md?.red ? tankFromModel(m).L < md.red.L - 1 : md?.vol ? m.ratedGal < md.vol.gal : false;
      if (oldBad !== gate) { oldWrong++; if (worst.length < 5) worst.push(`${sp.id} in ${m.name}: old ${oldBad ? 'bad' : 'ok'}, gate ${gate ? 'fails' : 'passes'}`); }
      if (gate && line?.tone !== 'bad') { wrong++; continue; }
      if (!gate && line?.tone === 'bad') { wrong++; continue; }
      if (gate && line) { const nums = [...line.text.matchAll(/(\d+(?:\.\d+)?) (in|gal|sq in)\b/g)].map(x => x[0]); const tail = line.text.split(/\. |: /).slice(1).join(' '); expect(tail).not.toMatch(/at least (\S+ \S+) .*this one is \1\b/); void nums; }
    }
    console.log(`DA2 sweep: ${pairs} species x tank pairs, card disagreed with the gate in ${oldWrong} before the fix; ${wrong} now. Examples: ${worst.join(' | ')}`);
    expect(wrong).toBe(0);
  }, 600_000);
  it('says the 24 in line for a 20 gal high tank as inside the allowance, with two different numbers', () => {
    const g = TANK_MODELS.find(m => /20 gal high/.test(m.name) && !m.terrarium)!, l = speciesLive([{ species: 'pandacory', n: 6 }], g, true)[0].lines.find(x => /^Tank at least/.test(x.text))!;
    console.log('DA2 card:', l.tone, l.text);
    expect(l.tone).toBe('note');
    expect(l.text).toMatch(/ust under, within the 10 % allowance, floor area: wants about 292 sq in, this tank has 289 sq in/);
  });
});
