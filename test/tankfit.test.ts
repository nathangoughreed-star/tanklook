// Tank fit engine (lane P2): real stockings give the right tank, step-ups are monotonic and catalogue-only, long-tank species skip short ones.
import { afterEach, describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { buildSpan, needsOf, recommendedMin, stepUps, tankFor, tankLabel, type AnimalCount } from '../src/scene/tankfit';

const CASES: Record<string, AnimalCount[]> = {
  frogs: [{ species: 'adf', n: 2 }],
  neons: [{ species: 'neon', n: 6 }],
  kribs: [{ species: 'kribensis', n: 2 }],
  oscar: [{ species: 'oscar', n: 1 }],
  danios: [{ species: 'danio', n: 8 }, { species: 'bristlenose', n: 1 }],
  reef: [{ species: 'ocellaris', n: 2 }],
};
const fit = (k: string) => tankFor(CASES[k])!;
const care = CARE as unknown as Record<string, Record<string, unknown>>;

describe('tank fit engine (lane P2)', () => {
  it('every real case lands on a catalogue tank that meets the space limit, and sizes grow with the stocking', () => {
    for (const k of Object.keys(CASES)) { const t = fit(k); expect(t.fails, k).toEqual([]); expect(t.spacePct, k).toBeLessThanOrEqual(100); expect(getTankModel(t.tank.id), k).toBeTruthy(); }
    expect(fit('frogs').gallons).toBeLessThan(15);
    expect(fit('neons').gallons).toBeLessThan(15);
    expect(fit('kribs').gallons).toBeGreaterThanOrEqual(15); expect(fit('kribs').gallons).toBeLessThan(40);
    expect(fit('oscar').gallons).toBeGreaterThanOrEqual(75);
    expect(fit('danios').gallons).toBeGreaterThanOrEqual(20); expect(fit('danios').gallons).toBeLessThan(40);
    expect(fit('oscar').gallons).toBeGreaterThan(fit('kribs').gallons);
    expect(tankFor([{ species: 'neon', n: 30 }])!.litres).toBeGreaterThan(fit('neons').litres);
  });
  it('it is the SMALLEST tank: the step below it is not offered because it fails (space or the species minimum)', () => {
    const t = fit('danios'), smaller = stepUps(CASES.danios, 'g5', 40).filter(s => s.litres < t.litres);
    expect(smaller.every(s => s.spacePct > 100 || s.litres < 0.9 * needsOf(CASES.danios).minLitres)).toBe(true);
  });
  it('steps are monotonic: each is bigger than the last, the space bar falls, every tank is from the catalogue, the cost rises overall', () => {
    for (const k of Object.keys(CASES)) {
      const t = fit(k), s = stepUps(CASES[k], t.tank, 3);
      expect(s.length, k).toBe(3); // (before the nitrogen model the catalogue ran out above the oscar's filtration-driven tank: 2 steps)
      let prev = t.litres, prevSpace = t.spacePct;
      for (const x of s) { expect(getTankModel(x.tank.id), k).toBeTruthy(); expect(x.litres, k).toBeGreaterThan(prev); expect(x.spacePct, k).toBeLessThan(prevSpace); prev = x.litres; prevSpace = x.spacePct; }
      expect(s[s.length - 1].costDeltaUsd, k).toBeGreaterThan(0);
      expect(s.every(x => x.filtrationPct > 0)).toBe(true);
    }
    expect(stepUps(CASES.neons, 'g10', 2)).toHaveLength(2);
    expect(stepUps(CASES.neons, 'c8', 3)).toEqual([]); // nothing bigger in the catalogue
  });
  it('a species that needs a long tank skips the short ones (GroupCare minLengthMm)', () => {
    const base = care.danio;
    try {
      base.minLengthMm = 1000;
      const t = tankFor(CASES.danios)!;
      expect(t.fails).toEqual([]); expect(t.tank.outer.L).toBeGreaterThan(1000); expect(t.needs.minLengthMm).toBe(1000);
      for (const s of stepUps(CASES.danios, 'g5', 5)) expect(s.tank.outer.L, s.tank.id).toBeGreaterThan(1000);
    } finally { delete base.minLengthMm; }
  });
  it('a shallow-water species skips tall tanks (GroupCare maxDepthMm)', () => {
    const base = care.adf;
    try {
      base.maxDepthMm = 300;
      const t = tankFor(CASES.frogs)!;
      expect(t.fails).toEqual([]);
      for (const s of [t, ...stepUps(CASES.frogs, t.tank, 4)]) expect(tankFromModel(s.tank).H * 0.9, s.tank.id).toBeLessThanOrEqual(300);
    } finally { delete base.maxDepthMm; }
  });
  it('the floor need is by zone: a pleco wants bottom floor, danios the middle, nothing from land animals', () => {
    const n = needsOf(CASES.danios);
    expect(n.floorCm2.bottom).toBeGreaterThan(0); expect(n.floorCm2.middle).toBeGreaterThan(0); expect(n.floorCm2.top).toBe(0);
    expect(needsOf([{ species: 'treefrog', n: 2 }]).floorCm2).toEqual({ bottom: 0, middle: 0, top: 0, all: 0 });
    expect(needsOf(CASES.reef).salt).toBe(true); expect(needsOf(CASES.neons).salt).toBe(false);
  });
  it('the build span runs from the cheapest to the balanced build and grows with the tank', () => {
    for (const k of Object.keys(CASES)) {
      const b = buildSpan(CASES[k], fit(k).tank)!;
      expect(b.setupUsd.cheapest, k).toBeGreaterThan(50); expect(b.setupUsd.balanced, k).toBeGreaterThanOrEqual(b.setupUsd.cheapest);
      expect(b.minPerWeek.cheapest, k).toBeGreaterThan(0); expect(b.minPerWeek.balanced, k).toBeGreaterThanOrEqual(b.minPerWeek.cheapest - 1);
    }
    expect(buildSpan(CASES.oscar, 'g120')!.setupUsd.balanced).toBeGreaterThan(buildSpan(CASES.oscar, 'g75')!.setupUsd.balanced);
    expect(buildSpan(CASES.reef, 'g20h')!.setupUsd.balanced).toBeGreaterThan(buildSpan(CASES.neons, 'g20h')!.setupUsd.balanced); // salt costs more
    expect(buildSpan(CASES.neons, 'nosuchtank')).toBeUndefined();
  });
  it('filtration is judged too: an oscar never lands on a tank no catalogue filter can carry, and a stocking nothing can carry fails hard', () => {
    const t = fit('oscar');
    expect(t.filtrationPct).toBeLessThanOrEqual(100); expect(t.fails).not.toContain('filtration');
    for (const s of stepUps(CASES.oscar, t.tank, 3)) expect(s.filtrationPct, s.tank.id).toBeLessThanOrEqual(100);
    const crowd = tankFor([{ species: 'oscar', n: 400 }])!;
    expect(crowd.fails).toContain('filtration'); expect(crowd.filtrationPct).toBeGreaterThan(100);
  });
  it('the span counts a light (both builds) and a heater only where the animals need one', () => {
    const g10 = getTankModel('g10')!;
    const warm = buildSpan([{ species: 'neon', n: 2 }], g10)!, room = buildSpan([{ species: 'danio', n: 2 }], g10)!; // neon band misses 21 C, danio holds it
    expect(room.setupUsd.cheapest).toBeGreaterThan(200); // tank + filter + light + kit, not the old animal-only $60-odd
    expect(warm.setupUsd.cheapest - room.setupUsd.cheapest).toBeGreaterThan(15); // the heater
  });
  it('no animals in the water means no tank, no steps; the label reads like the viewer wants', () => {
    expect(tankFor([])).toBeUndefined(); expect(tankFor([{ species: 'treefrog', n: 2 }])).toBeUndefined(); expect(stepUps([], 'g10')).toEqual([]);
    expect(tankLabel(getTankModel('g20l')!)).toBe('About a 20 gal long (77 x 33 cm)');
    expect(recommendedMin('neon')).toBeGreaterThanOrEqual(1);
    expect(recommendedMin('nosuchfish')).toBe(1);
  });
  afterEach(() => { delete care.danio?.minLengthMm; delete care.adf?.maxDepthMm; });
});
