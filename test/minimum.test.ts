// One tank-minimum evaluation (scene/tankMin.ts) is read by the Fullness tile, the tank-fit engine, the animal gate and the hard truths:
// behavioural invariants, not fixed percentages (Nathan 2026-10-21). Lane MM: the red (minimum) / green (Recommended) lines Nathan decided.
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { SPECIES, getSpecies } from '../src/data/species';
import { MIN_SLACK_PCT, whyAnimal } from '../src/scene/animalfit';
import { bareSetup } from '../src/scene/defaults';
import { hardTruths } from '../src/scene/plan';
import { volume } from '../src/scene/physics';
import { tankFor, tankOptions } from '../src/scene/tankfit';
import { planFor } from '../src/ui/stockPlanLogic';
import { bowlDims } from '../src/scene/shape';
import { MINL_SITE, floorOf, geometryOf, measureLines, minDataOf, minFit, notesIn, speciesMinimum, tankMinimum, type Geometry, type MinData, type Who } from '../src/scene/tankMin';
import { withChoice } from '../src/scene/tech';
import { floorUseCm2 } from '../src/scene/stocking';
import { minBar, minWarnings, topMin } from '../src/ui/fullnessTile';
import type { Fish, TankSetup } from '../src/scene/types';
// @ts-expect-error node only (no node types in this project)
const { writeFileSync } = await import('node:fs');

const IDS = ['swordtail', 'oscar', 'danio', 'adf', 'neon', 'bristlenose', 'guppy'];
const SP = IDS.map(id => getSpecies(id)!);
const base: Geometry = { litres: 150, areaCm2: 4000, lengthMm: 900, widthMm: 450 };
const worse = (a: number, b: number) => a > b + 1e-9;
const IN_MM = 25.4;
const src = { site: 'Test page', url: 'https://example.org', states: 'test', from: 'footprint' };
const sourced = (L: number, W?: number, areaCm2?: number): MinData => ({ red: { L, ...(W ? { W } : {}), ...(areaCm2 ? { areaCm2 } : {}), mark: 'sourced', ...src }, why: 'test' });
const swimmer: Who = { floor: false, water: true, tl: 50 }, bigSwimmer: Who = { floor: false, water: true, tl: 300 }, dweller: Who = { floor: true, water: true, tl: 50 };
const fishOf = (ids: string[]): Fish[] => ids.map((species, id) => ({ id: id + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const setupOf = (tank: TankSetup['tank'], wet: boolean, level = 0.9): TankSetup => { const S = bareSetup(); S.tank = tank; S.water.on = wet; S.water.level = level; S.water.salt = false; return S; };
const rectIn = (L: number, D: number, H: number): TankSetup['tank'] => ({ ...bareSetup().tank, shape: 'rect', L: L * IN_MM, D: D * IN_MM, H: H * IN_MM });

describe('the tank minimum is monotonic in each dimension', () => {
  it('more height (only water grows) never worsens it, and stops helping once the footprint dominates', () => {
    for (const sp of SP) {
      let prev = Infinity, floor = 0;
      for (const k of [0.5, 1, 2, 4, 8, 16]) { const p = speciesMinimum(sp, { ...base, litres: base.litres * k }).pct; expect(worse(p, prev), sp.id).toBe(false); prev = p; floor = p; }
      expect(speciesMinimum(sp, { ...base, litres: base.litres * 32 }).pct, sp.id).toBeCloseTo(floor, 6);
    }
  });
  it('more length, or more width (with the floor and water they bring) never worsens it', () => {
    for (const sp of SP) {
      for (const k of [1, 1.5, 2]) {
        const a = speciesMinimum(sp, base).pct, b = speciesMinimum(sp, { litres: base.litres * k, areaCm2: base.areaCm2 * k, lengthMm: base.lengthMm * k, widthMm: base.widthMm }).pct, c = speciesMinimum(sp, { litres: base.litres * k, areaCm2: base.areaCm2 * k, lengthMm: base.lengthMm, widthMm: base.widthMm * k }).pct;
        expect(worse(b, a), `${sp.id} length x${k}`).toBe(false); expect(worse(c, a), `${sp.id} width x${k}`).toBe(false);
      }
    }
  });
  it('a stated width counts in full for floor dwellers and large-bodied swimmers: a very long, very narrow tank cannot bypass it', () => {
    const narrow: Geometry = { litres: 200, areaCm2: 2000, lengthMm: 2000, widthMm: 100 };
    for (const w of [dweller, bigSwimmer]) { const m = measureLines(w, sourced(600, 300), narrow).red; expect(m.pct).toBeGreaterThan(100); expect(m.limiting).toBe('width'); }
  });
  it('Decision 3: a small swimmer is held to the length, not to a stated width', () => {
    expect(measureLines(swimmer, sourced(600, 300), { litres: 200, areaCm2: 2000, lengthMm: 2000, widthMm: 100 }).red.pct).toBeLessThanOrEqual(100);
  });
});

describe('a tall, narrow or tiny-floored tank cannot bypass the horizontal needs', () => {
  it('a tall cube is not roomy for a long swimmer or a big-bodied fish', () => {
    const tall: Geometry = { litres: 400, areaCm2: 900, lengthMm: 300, widthMm: 300 };
    for (const id of ['swordtail', 'oscar', 'danio']) expect(speciesMinimum(getSpecies(id)!, tall).pct, id).toBeGreaterThan(100);
  });
  it('a stated floor area is held in full (swordtail: 120 x 30 cm or equivalent) beside its stated 80 cm length', () => {
    const sw = getSpecies('swordtail')!, breeder: Geometry = { litres: 110, areaCm2: 4186, lengthMm: 910, widthMm: 460 };
    expect(speciesMinimum(sw, breeder).pct).toBeLessThan(100); // a 36 x 18 breeder: more floor than 120 x 30, longer than 80 cm
    expect(speciesMinimum(sw, { litres: 110, areaCm2: 3000, lengthMm: 1000, widthMm: 300 }).limiting).toBe('floor area');
  });
});

describe('the Fullness tile, the tank-fit engine, the animal gate and the hard truths agree', () => {
  const tanks = TANK_MODELS.filter(m => !m.terrarium && /^[\d.]+ (gal|ft)/.test(m.name)).filter((_, i) => i % 4 === 0).slice(0, 14);
  const setup = (m: (typeof TANK_MODELS)[number]) => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = true; S.water.level = 0.9; return S; };
  it('every species and tank: bar percent, gate verdict and hard truths give the same pass / fail', () => {
    for (const m of tanks) for (const sp of SP) {
      const S = { ...setup(m), fish: fishOf([sp.id]) }, row = tankMinimum(S).rows[0], fails = row.pct > MIN_SLACK_PCT;
      const why = whyAnimal(sp, volume(S.tank).litres, 3, [], { fit: minFit(S) });
      expect(why?.kind === 'size', `${sp.id} in ${m.name}: gate`).toBe(fails);
      const truths = hardTruths(S, [{ species: sp.id, n: 1 }], true).filter(t => t.text.includes('tank size'));
      expect(truths.length > 0, `${sp.id} in ${m.name}: hard truths`).toBe(fails);
    }
  });
  it('tankFor never offers a tank the bar calls too small', () => {
    for (const ids of [['swordtail'], ['oscar'], ['danio', 'bristlenose'], ['adf']]) {
      const t = tankFor(ids.map(species => ({ species, n: 1 })))!;
      expect(t.fails.includes('minimum') || t.minPct <= MIN_SLACK_PCT, ids.join()).toBe(true);
    }
  });
});

// Noncompensation (lane MA 2026-10-21, research/tank-minimum-first-principles.md "Decisions", overall rule): each measure is held on its
// own, surplus in one never covers a shortfall in another, and filtration, volume and height never rescue geometry. Lane MM turned MA's
// five `it.fails` / `it.todo` (the Decisions the old weighted max broke) into the plain tests at the end of this block.
describe('noncompensation: each measure on its own', () => {
  const roomy: Geometry = { litres: 2000, areaCm2: 40000, lengthMm: 2400, widthMm: 1200 };
  it('a length shortfall fails whatever the surplus in water, floor and width (swimmers)', () => {
    for (const w of [swimmer, bigSwimmer]) { const m = measureLines(w, sourced(900, 300), { ...roomy, lengthMm: 600 }).red; expect(m.pct).toBeGreaterThan(100); expect(m.limiting).toBe('length'); }
  });
  it('a stated width or stated floor area fails whatever the surplus elsewhere', () => {
    expect(measureLines(dweller, sourced(600, 400), { ...roomy, widthMm: 300 }).red.limiting).toBe('width');
    for (const w of [dweller, swimmer, bigSwimmer]) expect(measureLines(w, sourced(600, undefined, 3600), { ...roomy, areaCm2: 3000 }).red.limiting).toBe('floor area');
  });
  it('volume never rescues geometry: 100x the water leaves a short tank short', () => {
    for (const id of ['danio', 'swordtail', 'oscar', 'bristlenose', 'kuhli', 'bronzecory']) {
      const sp = getSpecies(id)!, short = speciesMinimum(sp, { ...base, lengthMm: 300, widthMm: 150, areaCm2: 450 });
      expect(short.pct, id).toBeGreaterThan(100);
      expect(speciesMinimum(sp, { litres: base.litres * 100, lengthMm: 300, widthMm: 150, areaCm2: 450 }).pct, id).toBeGreaterThan(100);
    }
  });
  it('height never rescues geometry: a taller tank on the same short floor still fails', () => {
    const S = bareSetup(); S.water.on = true; S.water.level = 0.9;
    S.tank = { ...S.tank, shape: 'rect', L: 300, D: 150, H: 300 };
    for (const id of ['danio', 'swordtail', 'bristlenose', 'kuhli']) {
      S.fish = fishOf([id]);
      const low = tankMinimum(S).percent, tall = tankMinimum({ ...S, tank: { ...S.tank, H: 3000 } }).percent;
      expect(low, id).toBeGreaterThan(100); expect(tall, id).toBeGreaterThan(100);
    }
  });
  it('filtration never rescues geometry: the filter choice does not move the minimum', () => {
    const S = bareSetup(); S.water.on = true; S.water.level = 0.9; S.fish = fishOf(['swordtail']);
    const a = tankMinimum({ ...S, tech: withChoice(S, 'filter', 'none') }).percent, b = tankMinimum({ ...S, tech: withChoice(S, 'filter', 'canister') }).percent;
    expect(b).toBeCloseTo(a, 9);
  });
  it('Decision 2: water alone never fails a species (danio, long and wide floor, shallow water: not assessed, never a water failure)', () => {
    const m = speciesMinimum(getSpecies('danio')!, { litres: 12, areaCm2: 6000, lengthMm: 1200, widthMm: 500 });
    expect(m.limiting === 'water' && m.pct > 100).toBe(false);
    // ample geometry and depth, almost no water: no species fails, the water shortfall is only the yellow advisory
    const dry: Geometry = { litres: 1, tankLitres: 1, areaCm2: 40000, lengthMm: 2400, widthMm: 1200, heightMm: 2000, depthMm: 550 };
    // S245 (Nathan 2026-10-26): a species with no red line takes CARE.minL as its minimum volume, so it does fail on water alone; every other species still never does
    for (const sp of SPECIES) { const r = speciesMinimum(sp, dry); if (r.measure.site === MINL_SITE || (minDataOf(sp.id) as { volGate?: string } | undefined)?.volGate) { expect(r.measure.limiting, sp.id).toBe('water'); continue; } expect(r.pct, sp.id).toBeLessThanOrEqual(100); if (minDataOf(sp.id)?.vol) expect(r.comfort.limiting, sp.id).toBe('water'); } // lane U5: a volGate species (betta, 5 gal) fails on water too
  });
  it('S245 (amends Decision 2): the mystery snail has no red line, so its care-table 19 L is its minimum: 10 L fails, 21 L passes', () => {
    const g = (litres: number) => ({ litres, tankLitres: litres, areaCm2: 1500, lengthMm: 400, widthMm: 250 });
    const small = speciesMinimum(getSpecies('mystery')!, g(10)), ok = speciesMinimum(getSpecies('mystery')!, g(21));
    expect(small.pct).toBeGreaterThan(110); expect(small.limiting).toBe('water'); expect(small.reason).toMatch(/care table/);
    expect(ok.pct).toBeLessThanOrEqual(100);
  });
  it('overall rule: a floor area derived from litres never fails a swimmer that has its length (tiger barb, 48 x 3 in floor, 18 in of water)', () => {
    const m = speciesMinimum(getSpecies('tigerbarb')!, { litres: 48 * 3 * 18 * 0.016387, areaCm2: 48 * 3 * 6.4516, lengthMm: 48 * IN_MM, widthMm: 3 * IN_MM });
    expect(m.limiting === 'floor area' && m.pct > 100).toBe(false);
    expect(m.pct).toBeLessThanOrEqual(100);
  });
  it('Decision 3: a bottom dweller\'s stated length is held (30 x 12 vs 60 x 6 in: same floor, different shape)', () => {
    expect(measureLines(dweller, sourced(760, 300), { litres: 200, areaCm2: 6000, lengthMm: 600, widthMm: 1000 }).red.pct).toBeGreaterThan(100);
    const kuhli = getSpecies('kuhli')!, g = (L: number, D: number): Geometry => ({ litres: L * D * 12 * 0.016387, areaCm2: L * D * 6.4516, lengthMm: L * IN_MM, widthMm: D * IN_MM });
    expect(speciesMinimum(kuhli, g(24, 12)).pct).toBeLessThanOrEqual(100); // its sourced 60 x 30 cm (23.5 x 12 in)
    expect(speciesMinimum(kuhli, g(60, 6)).limiting).toBe('width');
    expect(speciesMinimum(kuhli, g(60, 6)).pct).toBeGreaterThan(100);
  });
  it('Decision 3: kuhli in a 36 x 20 in tray at 2 in of water reads "not assessed", not a pass', () => {
    const S = { ...setupOf(rectIn(36, 20, 2 / 0.9), true), fish: fishOf(['kuhli']) }, row = tankMinimum(S).rows[0];
    expect(row.assessed).toBe(false); expect(row.reason).toMatch(/^not assessed/);
    expect(row.pct).toBeGreaterThan(MIN_SLACK_PCT); // not a pass anywhere: the gate, the tank fit and the hard truths read pct
    expect(whyAnimal(getSpecies('kuhli')!, volume(S.tank).litres, 3, [], { fit: minFit(S) })?.text).toMatch(/not assessed/);
    expect(minWarnings(tankMinimum(S), 'in')[0].text).toMatch(/^1 Kuhli loach: not assessed: [\d.]+" of water/);
  });
});

// Depth field (Decision 4, lane MM): no page states a minimum water depth (MX7), so nothing fails on depth; a recommended tank height
// is the Recommended mark (angelfish 50 cm), the ADF's 24 in maximum an advisory; usable depth = water level minus substrate.
describe('depth field', () => {
  const at = (id: string, tank: TankSetup['tank'], level = 0.9) => ({ ...setupOf(tank, true, level), fish: fishOf([id]) });
  it('angelfish: a tank under 50 cm tall is allowed but below the recommended size (yellow), at 50 cm it is green', () => {
    const low = tankMinimum(at('angel', rectIn(48, 18, 16))).rows[0], tall = tankMinimum(at('angel', rectIn(48, 18, 21))).rows[0];
    expect(low.pct).toBeLessThanOrEqual(100); expect(low.comfortPct).toBeGreaterThan(100); expect(low.comfort.limiting).toBe('height');
    expect(low.comfortReason).toMatch(/Seriously Fish recommends 50 cm tall/);
    expect(tall.comfortPct).toBeLessThanOrEqual(100);
  });
  it('ADF: water deeper than 24 in is an advisory, never a failure', () => {
    const deep = tankMinimum(at('adf', rectIn(48, 18, 36))).rows[0], shallow = tankMinimum(at('adf', rectIn(48, 18, 18))).rows[0];
    expect(deep.pct).toBeLessThanOrEqual(100); expect(notesIn(deep).join()).toMatch(/deeper than advised/); expect(notesIn(shallow)).toEqual([]);
    expect(minWarnings(tankMinimum(at('adf', rectIn(48, 18, 36))), 'in').every(w => w.level === 'near')).toBe(true);
  });
  it('usable depth is the water level minus the substrate', () => {
    const S = setupOf(rectIn(24, 12, 12), true); S.substrate = { ...S.substrate, show: true, fl: 50, fr: 50, bl: 50, br: 50 };
    const bare = setupOf(rectIn(24, 12, 12), true); bare.substrate = { ...bare.substrate, show: false };
    expect(geometryOf(bare).depthMm! - geometryOf(S).depthMm!).toBeCloseTo(50, 6);
    expect(geometryOf({ ...S, water: { ...S.water, on: false } }).depthMm).toBeUndefined();
  });
});

describe('sourced footprints for land animals (MA item 6)', () => {
  it('the ball python fits the usual 4 x 2 x 2 ft terrarium, and a land animal is never judged by litres', () => {
    const t = TANK_MODELS.filter(m => m.terrarium).map(m => ({ m, g: geometryOf(setupOf(tankFromModel(m), false)) }))
      .find(x => Math.abs(x.g.lengthMm - 48 * IN_MM) < 30 && Math.abs(x.g.widthMm - 24 * IN_MM) < 30 && (x.g.heightMm ?? 0) >= 23 * IN_MM);
    expect(t, 'a 48 x 24 x 24 in terrarium in the catalogue').toBeDefined();
    const bp = getSpecies('ballpython')!;
    expect(speciesMinimum(bp, t!.g).pct).toBeLessThanOrEqual(MIN_SLACK_PCT);
    expect(speciesMinimum(bp, { ...t!.g, litres: 1, tankLitres: 1 }).pct).toBeCloseTo(speciesMinimum(bp, t!.g).pct, 9);
    expect(speciesMinimum(bp, { ...t!.g, lengthMm: 36 * IN_MM, areaCm2: 36 * 24 * 6.4516 }).pct).toBeGreaterThan(MIN_SLACK_PCT);
  });
});

// Acceptance case (S188, Nathan at build 1039, "An animal I want"): 13 kuhli loaches default to a 20 gal long (30 x 12 in, 77 x 33 cm
// outer). Their red line is 60 x 30 cm (Seriously Fish / Guidarium), 80 cm the Recommended mark, the gallons advisory only: no red
// minimum, a yellow "below the recommended size" at most, and Continue ("three ways to build it", planFor(...).problem) stays enabled.
describe('13 kuhlis in a 20 long (S188 acceptance)', () => {
  const S = { ...setupOf(tankFromModel(TANK_MODELS.find(m => m.id === 'g20l')!), true), fish: fishOf(Array(13).fill('kuhli')) };
  it('no red minimum, at most the yellow Recommended note', () => {
    const m = tankMinimum(S), w = minWarnings(m, 'in');
    expect(m.rows[0].pct).toBeLessThanOrEqual(100); expect(m.rows[0].assessed).toBe(true);
    expect(w).toEqual([]); expect(minBar(m).level).toBe('near'); // 77 cm < the 80 cm Recommended mark
    expect(topMin(m, 'in')[0].note).toMatch(/^at least 23.6" x 11.8"; Recommended 31.5" long$/);
  });
  it('the tank minimum never fails it, and since 2026-10-22 neither does the Space bar: 13 kuhlis read cramped but doable (about 74 % since S253, 96 % before) by the floor / water limit, no longer 131 % by floor (kuhlis pile up, FLOOR_FACTOR 0.6)', () => {
    // 15 sq in of floor per inch of mass-equivalent length x FLOOR_FACTOR 0.6 (research/habitat-model.md, 2026-10-22): 13 kuhlis want ~264 sq in of the 20 long's 360
    // (lane HB's 440 sq in read 131 % on floor); the water limit, one school curve over the tank, reads them about 96 % in the catalogue 20 long.
    expect(13 * floorUseCm2(getSpecies('kuhli')!, getSpecies('kuhli')!.tl)).toBeLessThan(floorOf(S.tank).areaCm2);
    const at20 = tankOptions([{ species: 'kuhli', n: 13 }]).find(o => o.tank.id === 'g20l')!;
    expect(at20.fails).toEqual([]); expect(at20.spacePct).toBeGreaterThan(60); // S253: 96 % -> about 74 %: the kuhlis charge the floor in full and 0.7 of their water room expect(at20.spacePct).toBeLessThanOrEqual(100); expect(at20.minPct).toBeLessThanOrEqual(100);
    expect(planFor([{ id: 'kuhli', n: 13 }], 'g20l').fit!.fails).toEqual([]); // the stocking screen reads the same result
    const at8 = tankOptions([{ species: 'kuhli', n: 8 }]).find(o => o.tank.id === 'g20l')!;
    expect(at8.fails).toEqual([]); expect(at8.spacePct).toBeLessThan(80); // 8 fit it with room
  });
});

describe('wording (lane MM)', () => {
  const one = (id: string, L: number, D: number, H = 12) => ({ ...setupOf(rectIn(L, D, H), true), fish: fishOf([id]) });
  it('a derived failure says it is estimated from a gallon figure; a sourced one names its page', () => {
    expect(minDataOf('danio')!.red!.mark).toBe('derived (est)');
    expect(tankMinimum(one('danio', 12, 8)).rows[0].reason).toMatch(/^estimated from a gallon figure \(Fishkeeping World: 10 gal, the smallest such tank is a 10 gal\): wants about/);
    expect(minDataOf('kuhli')!.red!.mark).toBe('sourced');
    expect(tankMinimum(one('kuhli', 12, 8)).rows[0].reason).toMatch(/^wants (a tank )?at least .* \(Seriously Fish\)/);
  });
  it('between the lines the bar is yellow and lists "at least X; Recommended Y" (never "comfortable" or "cramped"); no red line (Nathan: "Bar back, keep lines")', () => {
    const m = tankMinimum(one('danio', 24, 12)), top = topMin(m, 'in');
    expect(minWarnings(m, 'in')).toEqual([]); expect(minBar(m).level).toBe('near');
    expect(top[0].note).toBe('at least 19.8" x 10.1" (est. from gallons); Recommended 35.4" x 11.8"');
    expect(m.rows[0].comfortReason).toMatch(/^below the recommended size: Seriously Fish recommends 35.4" long|^below the recommended size: Seriously Fish recommends 90 cm long/);
    expect(top.some(x => /comfortable|cramped|happier/.test(x.note ?? ''))).toBe(false);
    expect(minBar(tankMinimum(one('danio', 48, 13))).level).toBe('ok');
    expect(minBar(tankMinimum(one('danio', 12, 8))).level).toBe('over');
    // a word, not "100 %" (2026-10-22)
    expect(minBar(tankMinimum(one('danio', 48, 13))).text).toBe('Meets recommended'); expect(minBar(tankMinimum(one('danio', 12, 8))).text).toBe('Too small');
  });
});

// Turning-clearance diagnostic sweep (lane MA 2026-10-21, Decision 3): shortest floor side >= adult length, for every species, in the
// smallest catalogue tank that passes the gate today and in four extreme shapes. Diagnostic only, NOT a gate: it decides whether the
// rule is defensible. `GEN_CLEARANCE=1 npx vitest run test/minimum.test.ts` rewrites research/clearance-sweep.md.
describe('turning-clearance sweep (diagnostic)', () => {
  const EXTREME: { name: string; tank: TankSetup['tank']; level?: number }[] = [
    { name: '36 x 20 in tray, 2 in of water', tank: rectIn(36, 20, 2 / 0.9) },
    { name: '48 x 12 x 12 in long', tank: rectIn(48, 12, 12) },
    { name: '18 in cube', tank: rectIn(18, 18, 18) },
    { name: '12 in bowl', tank: { ...bareSetup().tank, shape: 'bowl', L: 12 * IN_MM, D: 12 * IN_MM, H: 0, bowlFloor: 7 * IN_MM, bowlTop: 7 * IN_MM } },
  ];
  for (const e of EXTREME) if (e.tank.shape === 'bowl') e.tank.H = bowlDims(e.tank).H;
  const sweep = () => {
    const wetModels = TANK_MODELS.filter(m => !m.terrarium), dryModels = TANK_MODELS.filter(m => m.terrarium);
    const sized = (ms: typeof TANK_MODELS, wet: boolean) => ms.map(m => ({ m, S: setupOf(tankFromModel(m), wet) })).map(x => ({ ...x, g: geometryOf(x.S) })).sort((a, b) => volume(a.S.tank).litres - volume(b.S.tank).litres);
    const wet = sized(wetModels, true), dry = sized(dryModels, false);
    return SPECIES.map(sp => {
      const land = sp.habitat === 'land', pool = land ? dry : wet, hit = pool.find(x => speciesMinimum(sp, x.g).pct <= MIN_SLACK_PCT);
      const short = hit ? hit.g.widthMm : 0, ratio = hit ? short / sp.tl : 0;
      const ex = EXTREME.map(e => { const g = geometryOf(setupOf(e.tank, !land)); return { pass: speciesMinimum(sp, g).pct <= MIN_SLACK_PCT, clear: g.widthMm >= sp.tl, pct: speciesMinimum(sp, g).pct }; });
      const flag = sp.body === 'snake' ? 'snake: coils, likely false positive' : sp.id === 'kuhli' || sp.aspect < 0.2 ? sp.id === 'kuhli' ? 'eel-shaped: bends to turn, likely false positive' : 'long tail (card aspect < 0.2): bends to turn, likely false positive' : '';
      return { sp, land, hit, short, ratio, ex, flag };
    }).sort((a, b) => (a.hit ? a.ratio : -1) - (b.hit ? b.ratio : -1));
  };
  it('covers every species, and a smallest passing tank exists for each wet one', () => {
    const rows = sweep();
    expect(rows.length).toBe(SPECIES.length);
    for (const r of rows) if (!r.land) expect(r.hit, r.sp.id).toBeDefined();
  });
  if ((globalThis as any).process?.env.GEN_CLEARANCE) it('writes research/clearance-sweep.md', () => {
    const rows = sweep(), inch = (mm: number) => (mm / IN_MM).toFixed(1), yn = (b: boolean) => b ? 'yes' : '**no**';
    const fails = rows.filter(r => r.hit && r.ratio < 1), flagged = fails.filter(r => r.flag);
    const exGateClear = EXTREME.map((e, i) => ({ e, passNoClear: rows.filter(r => r.ex[i].pass && !r.ex[i].clear).map(r => r.sp.id) }));
    const out = ['# Turning-clearance sweep (lane MA, 2026-10-21)', '',
      'Decision 3 (research/tank-minimum-first-principles.md): every species gets a turning-clearance DIAGNOSTIC, shortest floor side >=',
      'adult length (`Species.tl`), not a gate until this sweep and the extreme shapes show it is defensible. "Smallest passing tank" = the',
      'smallest catalogue tank by volume (aquariums for water / both species, terrariums for land species) whose gate percent today is within',
      '`MIN_SLACK_PCT` (111 %). Shortest side = `floorOf` widthMm (the bounding box\'s shorter side; for a bowl its full diameter, not its',
      'narrower floor). Numbers from test/minimum.test.ts (`GEN_CLEARANCE=1 npx vitest run test/minimum.test.ts`). Inches throughout.', '',
      '## Summary', '',
      `- ${rows.length} species; ${fails.length} would fail clearance in the smallest tank the gate passes today; ${flagged.length} of those are flagged as likely false positives (elongated or snake bodies that bend or coil to turn).`,
      `- Unflagged failures (would need a look before clearance becomes a gate): ${fails.filter(r => !r.flag).map(r => `${r.sp.id} (${inch(r.sp.tl)} in in a ${inch(r.short)} in wide ${r.hit!.m.name})`).join(', ') || 'none'}.`,
      ...exGateClear.map(x => `- ${x.e.name}: ${x.passNoClear.length} species pass the gate today but fail clearance${x.passNoClear.length ? `: ${x.passNoClear.join(', ')}` : ''}.`),
      '- Verdict: see "Reading" at the end.', '',
      '## All species, worst clearance first', '',
      `| Species | Adult length in | Smallest passing tank | Shortest side in | Side / length | Flag | ${EXTREME.map(e => `${e.name}: gate % / clear`).join(' | ')} |`,
      `|---|---|---|---|---|---|${EXTREME.map(() => '---').join('|')}|`,
      ...rows.map(r => `| ${r.sp.name} (${r.sp.id}) | ${inch(r.sp.tl)} | ${r.hit ? r.hit.m.name : 'none passes'} | ${r.hit ? inch(r.short) : '-'} | ${r.hit ? (r.ratio < 1 ? `**${r.ratio.toFixed(2)}**` : r.ratio.toFixed(2)) : '-'} | ${r.flag} | ${r.ex.map(x => `${Math.round(x.pct)} / ${yn(x.clear)}`).join(' | ')} |`), '',
      '## Reading', '',
      '- Clearance never binds where the gate already passes: the worst species in its smallest passing tank (clown loach, oscar) still has about 1.5x its adult length front to back. In the four extreme shapes no species passes the gate yet fails clearance. As a GATE it would add nothing today; keep it a diagnostic (Decision 3), useful only once volume stops failing species (Decision 2, lane MM) and shallow or odd shapes can start passing.',
      '- The likely false positives are as predicted: the ball python (a coiling snake, 47 in, fails clearance everywhere) and long-tailed or eel-shaped bodies (kuhli, the geckos and anoles, whose card length is mostly tail). If clearance ever becomes a gate these need body length without tail, or an exemption.',
      '- The bounding box overstates bowfronts and bowls: the shortest side of a bowfront here is its centre depth (the ends are 3-6 in shallower), and of a bowl its full diameter, not its narrower floor. A real clearance check should use the narrowest usable chord.',
      '- Side finding (not clearance): the ball python passes NO catalogue terrarium, not even the usual 4 x 2 x 2 ft (48 x 24 x 24 in) enclosure, because its 450 L figure is spread over 50 cm (19.7 in) of "water" by `refDepthCm` and asks for about 1395 sq in of floor (the 4 x 2 ft has 1152). The gallon figure of a land animal is an enclosure size, not water at depth: that conversion is exactly what Decision 5 warns about (derive it from the reference enclosure, mark it derived (est)). For lane MM.',
      '- Side finding: the kuhli passes the 36 x 20 in tray at 2 in of water (85 %), which Decision 3 says must read "not assessed"; see the it.todo in test/minimum.test.ts.', ''];
    writeFileSync('research/clearance-sweep.md', out.join('\n'));
  });
});
