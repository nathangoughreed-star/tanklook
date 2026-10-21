// One tank-minimum evaluation (scene/tankMin.ts) is read by the Fullness bar, the tank-fit engine, the animal gate and the hard truths:
// behavioural invariants, not fixed percentages (Nathan 2026-10-21).
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { SPECIES, getSpecies } from '../src/data/species';
import { MIN_SLACK_PCT, whyAnimal } from '../src/scene/animalfit';
import { bareSetup } from '../src/scene/defaults';
import { hardTruths } from '../src/scene/plan';
import { volume } from '../src/scene/physics';
import { tankFor } from '../src/scene/tankfit';
import { bowlDims } from '../src/scene/shape';
import { geometryOf, measureMinimum, minFit, speciesMinimum, tankMinimum, type Geometry } from '../src/scene/tankMin';
import { withChoice } from '../src/scene/tech';
import type { Fish, TankSetup } from '../src/scene/types';
// @ts-expect-error node only (no node types in this project)
const { writeFileSync } = await import('node:fs');

const IDS = ['swordtail', 'oscar', 'danio', 'adf', 'neon', 'bristlenose', 'guppy'];
const SP = IDS.map(id => getSpecies(id)!);
const base: Geometry = { litres: 150, areaCm2: 4000, lengthMm: 900, widthMm: 450 };
const worse = (a: number, b: number) => a > b + 1e-9;

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
  it('a stated width counts in full: a very long, very narrow tank cannot bypass it', () => {
    const narrow: Geometry = { litres: 200, areaCm2: 2000, lengthMm: 2000, widthMm: 100 };
    const m = measureMinimum('middle', 50, 600, 300, narrow);
    expect(m.pct).toBeGreaterThan(100); expect(m.limiting).toBe('width');
  });
});

describe('a tall, narrow or tiny-floored tank cannot bypass the horizontal needs', () => {
  it('a tall cube is not roomy for a long swimmer or a big-bodied fish', () => {
    const tall: Geometry = { litres: 400, areaCm2: 900, lengthMm: 300, widthMm: 300 };
    for (const id of ['swordtail', 'oscar', 'danio']) expect(speciesMinimum(getSpecies(id)!, tall).pct, id).toBeGreaterThan(100);
  });
  it('a stated floor area is held in full (swordtail: 120 x 30 cm or equivalent), not the area estimated from litres', () => {
    const sw = getSpecies('swordtail')!, breeder: Geometry = { litres: 110, areaCm2: 4186, lengthMm: 910, widthMm: 460 };
    expect(speciesMinimum(sw, breeder).pct).toBeLessThan(100); // a 36 x 18 breeder: more floor than 120 x 30, less length
    expect(speciesMinimum(sw, { litres: 110, areaCm2: 3000, lengthMm: 1000, widthMm: 300 }).limiting).toBe('floor area');
  });
});

describe('the Fullness bar, the tank-fit engine, the animal gate and the hard truths agree', () => {
  const tanks = TANK_MODELS.filter(m => !m.terrarium && /^[\d.]+ (gal|ft)/.test(m.name)).filter((_, i) => i % 4 === 0).slice(0, 14);
  const setup = (m: (typeof TANK_MODELS)[number]) => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = true; S.water.level = 0.9; return S; };
  const fishOf = (ids: string[]): Fish[] => ids.map((species, id) => ({ id: id + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
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
// own, surplus in one never covers a shortfall in another, and filtration, volume and height never rescue geometry. The `it.fails` cases
// are where today's weighted max breaks a Decision; they pass once lane MM (migration) lands and must then turn into plain `it`.
describe('noncompensation: each measure on its own', () => {
  const roomy: Geometry = { litres: 2000, areaCm2: 40000, lengthMm: 2400, widthMm: 1200 };
  it('a length shortfall fails whatever the surplus in water, floor and width (swimmers)', () => {
    for (const zone of ['top', 'middle', 'all'] as const) {
      const m = measureMinimum(zone, 40, 900, 0, { ...roomy, lengthMm: 600 });
      expect(m.pct, zone).toBeGreaterThan(100); expect(m.limiting, zone).toBe('length');
    }
  });
  it('a stated width or stated floor area fails whatever the surplus elsewhere', () => {
    for (const zone of ['bottom', 'top', 'middle', 'all'] as const) {
      expect(measureMinimum(zone, 40, 600, 400, { ...roomy, widthMm: 300 }).limiting, zone).toBe('width');
      expect(measureMinimum(zone, 40, 600, 0, { ...roomy, areaCm2: 3000 }, 3600).limiting, zone).toBe('floor area');
    }
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
      S.fish = [{ id: 1, species: id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
      const low = tankMinimum(S).percent, tall = tankMinimum({ ...S, tank: { ...S.tank, H: 3000 } }).percent;
      expect(low, id).toBeGreaterThan(100); expect(tall, id).toBeGreaterThan(100);
    }
  });
  it('filtration never rescues geometry: the filter choice does not move the minimum', () => {
    const S = bareSetup(); S.water.on = true; S.water.level = 0.9; S.fish = [{ id: 1, species: 'swordtail', x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
    const a = tankMinimum({ ...S, tech: withChoice(S, 'filter', 'none') }).percent, b = tankMinimum({ ...S, tech: withChoice(S, 'filter', 'canister') }).percent;
    expect(b).toBeCloseTo(a, 9);
  });
  // Decision 2: volume is advisory for the enclosure check and can never fail a species on its own. Today water is a weighted share
  // (bottom 0.25, swimmers 0.5, VOLUME_ONLY 1), so a tank with ample geometry and little water still fails. For lane MM.
  // Decision 3: kuhli in 2 in of water is NOT ASSESSED (open question), not a pass. Today it passes at about 85 % (water share 0.25 x
  // 80 L / 24 L): there is no depth field yet (Decision 4, lane MM), so the tray case cannot be told apart from a real tank.
  it.todo('Decision 3: kuhli in a 36 x 20 in tray at 2 in of water reads "not assessed", not a pass (needs the depth field)');
  it.fails('Decision 2: water alone never fails a midwater swimmer (danio, long and wide floor, shallow water)', () => {
    const m = speciesMinimum(getSpecies('danio')!, { litres: 12, areaCm2: 6000, lengthMm: 1200, widthMm: 500 });
    expect(m.limiting === 'water' && m.pct > 100).toBe(false);
  });
  it.fails('Decision 2: the mystery snail\'s 5 gal is its Recommended mark, not a failure (VOLUME_ONLY holds it to water in full)', () => {
    const m = speciesMinimum(getSpecies('mystery')!, { litres: 10, areaCm2: 1500, lengthMm: 400, widthMm: 250 });
    expect(m.pct).toBeLessThanOrEqual(100);
  });
  // Overall rule + Decision 3: swimmers are held to length; a floor area DERIVED from their gallon figure is an estimate and may not
  // silently fail them. Today the derived area counts at weight 0.4 (middle / all) or 0.6 (top). For lane MM.
  it.fails('overall rule: a floor area derived from litres never fails a swimmer that has its length (tiger barb, 48 x 3 in floor, 18 in of water)', () => {
    const m = speciesMinimum(getSpecies('tigerbarb')!, { litres: 48 * 3 * 18 * 0.016387, areaCm2: 48 * 3 * 6.4516, lengthMm: 48 * 25.4, widthMm: 3 * 25.4 });
    expect(m.limiting === 'floor area' && m.pct > 100).toBe(false);
  });
  // Decision 3: bottom dwellers are held to floor area PLUS length / width where a source states them. Today the run weight is 0 for the
  // bottom zone, so a stated length is ignored (minLengthMm is stored for all 84; MM must also mark which are sourced, see groups-sources.md).
  it.fails('Decision 3: a bottom dweller\'s stated length is held (30 x 12 vs 60 x 6 in: same floor, different shape)', () => {
    expect(measureMinimum('bottom', 40, 760, 0, { litres: 200, areaCm2: 6000, lengthMm: 600, widthMm: 1000 }).pct).toBeGreaterThan(100);
  });
});

// Turning-clearance diagnostic sweep (lane MA 2026-10-21, Decision 3): shortest floor side >= adult length, for every species, in the
// smallest catalogue tank that passes the gate today and in four extreme shapes. Diagnostic only, NOT a gate: it decides whether the
// rule is defensible. `GEN_CLEARANCE=1 npx vitest run test/minimum.test.ts` rewrites research/clearance-sweep.md.
describe('turning-clearance sweep (diagnostic)', () => {
  const IN_MM = 25.4;
  const setupOf = (tank: TankSetup['tank'], wet: boolean, level = 0.9): TankSetup => { const S = bareSetup(); S.tank = tank; S.water.on = wet; S.water.level = level; S.water.salt = false; return S; };
  const rectIn = (L: number, D: number, H: number): TankSetup['tank'] => ({ ...bareSetup().tank, shape: 'rect', L: L * IN_MM, D: D * IN_MM, H: H * IN_MM });
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
