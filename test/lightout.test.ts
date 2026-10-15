import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import {
  EXPOSE, EXP_MAX, KWATER, LREF, TECHS, TECH_IDS, bandsAt, beamExp, lightEnv, lightEnvCached, lightOut, lightOutCached, lineNorm, luxOf, luxPer, parOf, pointNorm, readout, renderBright,
  fitFixture, fixtureOf, powerRange, techOf, techsFor, tubeOf, wattsOf, type Band, type Emitter, type LightEnv, type LightScene,
} from '../src/scene/lightout';
import { normTank } from '../src/scene/shape';
import { parseScene } from '../src/scene/validate';
import type { LightSettings, LightTech, Tank } from '../src/scene/types';

/** A setup with the light set to `l` (watts on). */
function scene(l: Partial<LightSettings>, tank?: Tank, extra: Partial<LightScene> = {}): LightScene {
  const s = defaultSetup();
  return { ...s, tank: tank ?? s.tank, lid: 'open', light: { ...s.light, type: 'led', watts: 30, ...l }, ...extra } as LightScene;
}
/** A hand-built environment: emitters with a total output, in air (ys = -Infinity) unless a surface is given. */
function env(E: Emitter[], total: number, m: number, tech: LightTech, ys = -Infinity, k: Band = KWATER.map(v => v / 1000) as Band): LightEnv {
  const line = E[0][3] > 0;
  return { E, phi: total / E.length, m, norm: line ? lineNorm(m) : pointNorm(m), ind: [0, 0, 0], split: TECHS[tech].split, k, ys, trans: 1, walls: null, scale: 1 };
}
const photons = (W: number, t: LightTech) => W * TECHS[t].ppe * TECHS[t].eta;
const par = (e: LightEnv, p: number[], n?: number[]) => parOf(bandsAt(e, p, n));

describe('light output model', () => {
  it('doubling watts doubles PAR and lux everywhere', () => {
    const a = lightOut(scene({ watts: 20 }))!, b = lightOut(scene({ watts: 40 }))!;
    for (const k of ['mean', 'min', 'max', 'surface', 'luxMean', 'luxMid'] as const) expect(b[k] / a[k]).toBeCloseTo(2, 6);
  });
  it('the caches scale one 1 W run: same numbers as a full run, PAR override included', () => {
    for (const l of [{ watts: 37 }, { watts: 120, type: 'spot' as const, cone: 40 }, { watts: 60, par: 45 }]) {
      const S = scene(l), a = lightOut(S)!, b = lightOutCached(S)!;
      for (const k of ['surface', 'mean', 'min', 'max', 'luxMean', 'luxMid', 'scale'] as const) expect(b[k] / a[k]).toBeCloseTo(1, 9);
      expect(b.band).toBe(a.band);
      const e = { ...lightEnv(S)!, scale: a.scale }, c = lightEnvCached(S)!, p = [S.tank.L / 3, 40, -S.tank.D / 2];
      expect(parOf(bandsAt(c, p)) / parOf(bandsAt(e, p))).toBeCloseTo(1, 9);
    }
  });
  it('the cache key holds only what the model reads (lane EF2): water colour and substrate looks reuse the run', () => {
    const S = scene({ watts: 30 }), env0 = lightEnvCached(S)!;
    const re = (f: (s: LightScene) => LightScene) => lightEnvCached(f(structuredClone(S)))!;
    // the cached env is copied out per call; its emitters array is the cached one, so identity = same run
    expect(re(s => ({ ...s, water: { ...s.water, color: '#224466', salt: true } })).E).toBe(env0.E);
    expect(re(s => ({ ...s, substrate: { ...s.substrate, custom: { ...s.substrate.custom, color2: '#123456', share: 70, mix: 0.9 } } })).E).toBe(env0.E);
    expect(re(s => ({ ...s, light: { ...s.light, watts: 90, kelvin: 4000 } })).E).toBe(env0.E);
    expect(re(s => ({ ...s, water: { ...s.water, opacity: 0.4 } })).E).not.toBe(env0.E);
    expect(re(s => ({ ...s, substrate: { ...s.substrate, type: s.substrate.type === 'white' ? 'onyx' : 'white' } })).E).not.toBe(env0.E);
    expect(re(s => ({ ...s, substrate: { ...s.substrate, fl: s.substrate.fl + 10 } })).E).not.toBe(env0.E);
  });
  it('no watts, or a flat light: no estimate (the manual Brightness as before)', () => {
    expect(lightOut(scene({ watts: 0 }))).toBeNull();
    expect(lightOut(scene({ type: 'flat' }))).toBeNull();
    expect(lightEnv(scene({ watts: undefined }))).toBeNull();
  });
  it('a point source in air falls off with the inverse square, beam normalised to its flux', () => {
    const cone = beamExp({ type: 'spot', cone: 60 }), e = env([[0, 1000, 0, 0]], 100, cone, 'led-white');
    expect(par(e, [0, 0, 0]) / par(e, [0, -1000, 0])).toBeCloseTo(4, 6);
    // the profile integrates to the flux: sum E dA over a large plane 1 m below = flux (within the grid error)
    let s = 0; const step = 25;
    for (let x = -3000; x < 3000; x += step) for (let z = -3000; z < 3000; z += step) s += par(e, [x + step / 2, 0, z + step / 2]) * (step / 1000) ** 2;
    expect(s).toBeCloseTo(100, 0);
  });
  it('a line source conserves flux too, and is 1/r under its middle', () => {
    const e = env([[0, 500, 0, 600]], 100, beamExp({ type: 'tube' }), 't5-refl');
    let s = 0; const step = 20;
    for (let x = -4000; x < 4000; x += step) for (let z = -4000; z < 4000; z += step) s += par(e, [x + step / 2, 0, z + step / 2]) * (step / 1000) ** 2;
    expect(s / 100).toBeGreaterThan(0.9); // missing: the tails past ±4 m, and what a bare tube sends above horizontal
    expect(s / 100).toBeLessThan(1.001);
    const f = (r: number) => 600 / Math.hypot(r, 600); // the finite-length factor under the middle
    expect(par(e, [0, 400, 0]) / par(e, [0, 300, 0])).toBeCloseTo(2 * f(100) / f(200), 6); // 100 mm vs 200 mm: 1/r
  });
  it('refraction: a deep tank loses less light than straight-line inverse square (water absorption off)', () => {
    const cone = beamExp({ type: 'spot', cone: 60 }), wet = env([[0, 300, 0, 0]], 100, cone, 'led-white', 0, [0, 0, 0]);
    const at = (d: number) => par(wet, [0, -d, 0]) / (par(wet, [0, -0.01, 0]) / 0.97 * 0.97);
    expect(at(500)).toBeCloseTo((300 / (300 + 500 / 1.33)) ** 2, 3);
    expect(at(500)).toBeGreaterThan((300 / 800) ** 2 * 1.3);
  });
  it('water absorbs red most, so lux and PAR fall off at different rates with depth; murky water dims both', () => {
    // red photons count fully in PAR but little in lux, and water takes them first: under white light PAR falls a
    // little faster than lux; under blue reef light (little red) the green share goes first and lux falls faster
    const cone = beamExp({ type: 'spot', cone: 60 });
    const keep = (t: LightTech) => { const e = env([[0, 300, 0, 0]], 100, cone, t, 0), a = bandsAt(e, [0, -10, 0]), b = bandsAt(e, [0, -800, 0]); return [luxOf(b) / luxOf(a), parOf(b) / parOf(a)]; };
    const [wl, wp] = keep('led-white'), [rl, rp] = keep('led-reef');
    expect(wl / wp).toBeGreaterThan(1.01);
    expect(rl / rp).toBeLessThan(0.99);
    const clear = lightOut(scene({}))!, murky = lightOut(scene({}, undefined, { water: { ...defaultSetup().water, opacity: 0.5 } }))!;
    expect(murky.mean).toBeLessThan(clear.mean * 0.75);
  });
  it('side glass: a rectangular tank holds more light near the walls than the same light over open water', () => {
    const S = scene({}), e = lightEnv(S)!, open = { ...e, walls: null };
    const T = S.tank, edge = [10, 20, -T.D / 2], mid = [T.L / 2, 20, -T.D / 2];
    expect(par(e, edge) / par(open, edge)).toBeGreaterThan(1.3);
    expect(par(e, mid) / par(open, mid)).toBeLessThan(par(e, edge) / par(open, edge));
    expect(lightEnv(scene({}, normTank({ L: 600, H: 400, D: 0, shape: 'round' } as Tank)))!.walls).toBeNull();
  });
  it('a dry tank: no water, no surface loss, no wall images', () => {
    const e = lightEnv(scene({}, undefined, { water: { ...defaultSetup().water, on: false } }))!;
    expect(e.ys).toBe(-Infinity);
    expect(lightOut(scene({}, undefined, { water: { ...defaultSetup().water, on: false } }))!.mean).toBeGreaterThan(0);
  });
  it('a glass lid takes 10%; the PAR override scales everything to the reading', () => {
    const a = lightOut(scene({}))!, g = lightOut(scene({}, undefined, { lid: 'glass' }))!;
    expect(g.mean / a.mean).toBeCloseTo(0.9, 6);
    const o = lightOut(scene({ par: 45 }))!;
    expect(o.mean).toBeCloseTo(45, 6);
    expect(o.max / o.mean).toBeCloseTo(a.max / a.mean, 6);
    expect(readout(o)).toMatch(/^PAR at substrate 45 µmol \(yours; medium\)/);
  });
  it('lux factors per tech match Apogee / estimates', () => {
    const want: Record<LightTech, number> = { 'led-white': 67, 'led-planted': 48, 'led-reef': 26, 't5-refl': 74, 't5-bare': 74, 't8': 74, 't12': 74, 'led-tube': 67, 'cfl': 72, 'led-bulb': 66, 'mh': 71, 'mh-20k': 55, 'halogen': 49 };
    for (const t of TECH_IDS) {
      expect(TECHS[t].split.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      expect(Math.abs(luxPer(t) / want[t] - 1)).toBeLessThan(0.05);
    }
  });
  it('lamps are filtered by fixture; an unfit lamp falls back to the fixture default', () => {
    expect(techsFor('tube')).toContain('t5-refl');
    expect(techsFor('tube')).not.toContain('led-white');
    expect(techsFor('puck')).not.toContain('t5-refl');
    expect(techsFor('pendant')).toEqual(['mh', 'mh-20k']);
    expect(techOf({ type: 'spot', tech: 't8' } as LightSettings)).toBe('led-white');
    expect(techOf({ type: 'tube' } as LightSettings)).toBe('t5-refl');
    expect(techOf({ type: 'led', tech: 'led-reef' } as LightSettings)).toBe('led-reef');
  });
  it('spot styles are told apart by the lamp', () => {
    expect(fixtureOf({ type: 'spot' } as LightSettings)).toBe('puck');
    expect(fixtureOf({ type: 'spot', tech: 'mh' } as LightSettings)).toBe('pendant');
    expect(fixtureOf({ type: 'spot', tech: 'halogen' } as LightSettings)).toBe('bulb');
    expect(fixtureOf({ type: 'spot', tech: 'cfl' } as LightSettings)).toBe('bulb');
    expect(fixtureOf({ type: 'tube', tech: 'cfl' } as LightSettings)).toBe('tube');
  });
  it('fixture ranges: a style change takes its usual height, beam and power; old values are clamped', () => {
    const T = { ...defaultSetup().tank, L: 914 };
    const p = { ...defaultSetup().light, type: 'spot', tech: 'mh', count: 6, rows: 3, height: 50, cone: 30, watts: 0 } as LightSettings;
    fitFixture(p, T, false);
    expect(p).toMatchObject({ height: 150, cone: 60, count: 4, rows: 2 });   // clamped
    fitFixture(p, T, true);
    expect(p).toMatchObject({ height: 250, cone: 90 });                      // the pendant's usual
    const b = { ...defaultSetup().light, type: 'spot', tech: 'halogen', count: 2, rows: 1, pattern: 'grid', watts: 99 } as LightSettings;
    expect(powerRange(b, T)).toEqual([0, 200, 100]);                          // 2 bulbs: up to 100 W each, 50 W halogen
    fitFixture(b, T, true);
    expect(b.watts).toBeUndefined(); expect(wattsOf({ tank: T, light: b })).toBe(100); // the typical power, until set
    expect(wattsOf({ tank: T, light: { ...b, watts: 0 } })).toBe(100); expect(wattsOf({ tank: T, light: { ...b, watts: 30 } })).toBe(30);
    expect(wattsOf({ tank: T, light: { ...b, type: 'flat' } })).toBe(0);
    expect(powerRange({ ...b, type: 'led' }, T)![2]).toBe(36);              // LED bar: 1 W per inch of tank
  });
  it('tubes: the longest standard length that fits, power from the tubes', () => {
    const l = { type: 'tube', tech: 't5-refl', count: 2 } as LightSettings;
    expect(tubeOf(l, { L: 914 })).toMatchObject({ inch: 36, w: 39 });   // 36 in tank
    expect(tubeOf(l, { L: 1200 })).toMatchObject({ inch: 48, w: 54 });  // 4 ft
    expect(tubeOf(l, { L: 500 })).toMatchObject({ inch: 24, w: 24 });   // shorter than any: the shortest
    expect(wattsOf({ tank: { ...defaultSetup().tank, L: 914 }, light: { ...l, watts: 999 } })).toBe(78);
  });
  it('readout line and render brightness', () => {
    const o = lightOut(scene({}))!;
    expect(readout(o)).toMatch(/^PAR at substrate ≈ \d+-\d+ µmol \([a-z -]+\) · surface ≈ \d+ · ≈ [\d,]+ lux · estimate$/);
    expect(renderBright(o, 1)).toBeGreaterThanOrEqual(0.2);
    expect(renderBright(o, 2) / renderBright(o, 1)).toBeCloseTo(2, 6);
    expect(renderBright({ ...o, luxMid: 4 * LREF }, 1)).toBeCloseTo(2 * EXPOSE, 6);
    const typical = lightOut(scene({ watts: 20 }))!;
    expect(renderBright(typical, 1) / EXPOSE).toBeGreaterThan(0.85); expect(renderBright(typical, 1) / EXPOSE).toBeLessThan(1.15);
    expect(renderBright({ ...o, luxMid: 1e9 }, 99)).toBeCloseTo(EXPOSE * 5 * EXP_MAX, 6); // looking at the sun: allowed, capped
  });
  it('older files load unchanged; the new fields are validated', () => {
    const base = defaultScene(), load = (x: unknown) => parseScene(JSON.parse(JSON.stringify(x))).scene;
    const plain = load(base);
    expect(Object.keys(plain.tanks[0].light)).not.toContain('watts');
    const t = defaultSetup(); (t.light as unknown as Record<string, unknown>).watts = 5000; (t.light as unknown as Record<string, unknown>).tech = 'laser';
    t.light.par = 60; t.light.mapUnit = 'lux';
    const v = load({ ...base, tanks: [t] }).tanks[0].light;
    expect(v.watts).toBe(2000); expect(v.tech).toBeUndefined(); expect(v.par).toBe(60); expect(v.mapUnit).toBe('lux');
  });
});

// Published PAR-at-depth data (reference/par-calibration-data.md), each compared like with like (in air or in water,
// as measured). Tolerance ±30%; residuals are printed so a recalibration can see them.
describe('calibration', () => {
  const log = (name: string, rows: [string, number, number][]) => {
    console.log(`\n${name}\n` + rows.map(([at, m, p]) => `  ${at.padEnd(14)} measured ${String(m).padStart(6)}  model ${p.toFixed(0).padStart(6)}  ${((p / m - 1) * 100).toFixed(0).padStart(4)}%`).join('\n'));
    return rows.map(r => r[2] / r[1] - 1);
  };
  it('AI Hydra 32 HD (reef LED, 90.5 W, ~100° beam), in air under the centre, Apogee MQ-510 (DaniReef, grade A)', () => {
    const cone = beamExp({ type: 'spot', cone: 100 }), e = env([[0, 0, 0, 0]], photons(90.5, 'led-reef'), cone, 'led-reef');
    const res = log('AI Hydra 32 HD (in air)', ([[170, 1908], [370, 462], [570, 197]] as const).map(([d, m]) => [`${d / 10} cm`, m, par(e, [0, -d, 0])]));
    for (const r of res) expect(Math.abs(r)).toBeLessThan(0.3);
  });
  it('JBL LED Solar Natur 68 W (white LED bar, 1149 mm), 45 mm above the water, in water under the centre (grade A)', () => {
    // the bar as a dense row of LEDs, mean of the 2700 / 4000 / 6700 K columns. The tank is a 1 m deep glass koi
    // aquarium of unstated size: assumed 1.6 x 0.8 m, bar centred along it. With no walls at all the model reads
    // 20-37% low below 50 cm (the glass returns light at depth), so the walls are part of the fit, not a fudge.
    const T = { L: 1600, D: 800 }, n = 100, E: Emitter[] = Array.from({ length: n }, (_, i) => [T.L / 2 - 574.5 + 1149 * (i + 0.5) / n, 45, -T.D / 2, 0]);
    const e = { ...env(E, photons(68, 'led-white'), beamExp({ type: 'led' }), 'led-white', 0), walls: { ...T, w: 0.7 } };
    const at = (y: number) => par(e, [T.L / 2, y, -T.D / 2]);
    const meas: [number, number][] = [[0, 802], [100, 356], [200, 241], [300, 172], [400, 134], [500, 114], [600, 102], [700, 91]];
    const res = log('JBL Solar Natur 68 W (in water)', [
      ['air, surface', 849, at(0.01)],
      ...meas.map(([d, m]): [string, number, number] => [`${d / 10} cm`, m, at(-d - 0.01)])]);
    for (const r of res) expect(Math.abs(r)).toBeLessThan(0.3);
  });
  it('T5 HO with reflectors at the substrate (Barr Report, grade B, tank sizes partly assumed): ±50% with the glass', () => {
    // tank 14 in (356 mm) front to back; assumed 48 in (1219 mm) long, filled to 560 mm (so ~200 mm of air), 1149 mm
    // tubes side by side 60 mm apart over the middle. Logged with and without the side glass.
    const T = { L: 1219, D: 356 }, E: Emitter[] = [[T.L / 2, 760, -T.D / 2 - 30, 574.5], [T.L / 2, 760, -T.D / 2 + 30, 574.5]];
    const e = env(E, photons(108, 't5-refl'), beamExp({ type: 'tube' }), 't5-refl', 560), w = { ...e, walls: { ...T, w: 0.7 } };
    // one 54 W tube at the rim of a 24 in tank, substrate 610 mm below it: ~40 (assumed 48 x 18 in, water 50 mm below the tube)
    const T2 = { L: 1219, D: 457 }, one = { ...env([[T2.L / 2, 610, -T2.D / 2, 574.5]], photons(54, 't5-refl'), beamExp({ type: 'tube' }), 't5-refl', 560), walls: { ...T2, w: 0.7 } };
    const res = log('T5 HO (substrate, assumptions above)', [['2x54 no walls', 60, par(e, [T.L / 2, 0, -T.D / 2])], ['2x54 glass', 60, par(w, [T.L / 2, 0, -T.D / 2])],
      ['1x54 glass', 40, par(one, [T2.L / 2, 0, -T2.D / 2])]]);
    for (const r of res.slice(1)) expect(Math.abs(r)).toBeLessThan(0.5);
  });
  it('metal halide pendants: Joshi reflector grids in air (grade A, ±35%); in-tank sets (±50% Melev; forum logged)', () => {
    // Joshi, "Analyzing Reflectors": Ushio 14K 400 W on an IceCap ballast (428 W at the wall), in air, 13 x 13 grid at
    // 3 in; sums over the 3x3 / 2x2 / 1x1 ft squares at 24 and 30 in, as means, and the maximum. Each reflector as a
    // spot at its fitted beam angle (the angle is fitted to these grids; the output is the one TECHS value).
    const grid = (e: LightEnv, y: number) => [6, 4, 2].map(h => {
      let a = 0; for (let i = -h; i <= h; i++) for (let j = -h; j <= h; j++) a += par(e, [i * 76.2, -y, j * 76.2]);
      return a / (2 * h + 1) ** 2;
    }).concat(par(e, [0, -y, 0]));
    const R: [string, number, number[], number[]][] = [
      ['Lumenarc III', 95, [28147, 18544, 7299, 349], [22645, 13660, 4890, 222]],
      ['Lumenbrite III', 55, [35700, 28214, 13473, 669], [31586, 22171, 9361, 444]],
      ['Lumenmax Elite', 50, [33229, 26138, 13571, 711], [29080, 21735, 10219, 519]],
      ['Lumenmax large', 100, [32886, 21954, 8391, 383], [27630, 17202, 6159, 270]],
    ];
    const lab: number[] = [];
    for (const [name, cone, a24, a30] of R) {
      const e = env([[0, 0, 0, 0]], photons(428, 'mh'), beamExp({ type: 'spot', cone }), 'mh'), n = [169, 81, 25, 1];
      const rows = ([[609.6, a24, '24'], [762, a30, '30']] as const).flatMap(([y, m, at]) => grid(e, y).map((p, k): [string, number, number] =>
        [`${at} in ${['3x3 mean', '2x2 mean', '1x1 mean', 'max'][k]}`, Math.round(m[k] / n[k]), p]));
      lab.push(...log(`MH: ${name} (${cone}°), 400 W 14K, in air`, rows));
    }
    // ±35%, not ±30: the reflectors themselves differ by ±27% in what they put down (0.50-0.86 per wall W), and the
    // model has one eta for all of them
    for (const r of lab) expect(Math.abs(r)).toBeLessThan(0.35);
    // in water: a pendant as a Lumenarc-like 95° spot
    const run = (W: number, t: LightTech, T: { L: number; D: number }, ys: number, h: number, xs: number[], pts: [number, number][]) => {
      const E: Emitter[] = xs.map(dx => [T.L / 2 + dx, ys + h, -T.D / 2, 0]);
      const e = { ...env(E, photons(W, t) * E.length, beamExp({ type: 'spot', cone: 95 }), t, ys), walls: { ...T, w: 0.7 } };
      return pts.map(([d, m]): [string, number, number] => [`${(d / 25.4).toFixed(0)} in deep`, m, par(e, [T.L / 2, ys - d, -T.D / 2])]);
    };
    // Melev's Reef 2008 (grade A numbers, tank assumed): 3 x 250 W Radium 20K, 9 in above the water; assumed 24 in
    // apart over a 72 x 24 in tank (~280 gal), 30 in of water; mid-range of the readings under a bulb
    const melev = log('MH: Melev 3x250 W 20K, 9 in up (in water)', run(250, 'mh-20k', { L: 1829, D: 610 }, 760, 229, [-610, 0, 610], [[25, 698], [152, 404], [305, 316]]));
    for (const r of melev) expect(Math.abs(r)).toBeLessThan(0.5);
    // forum readings (grade B/C; meters, bulb age and positions unknown): logged only, they read 2-3x below the lab data
    log('MH: ReefCentral 250 W 14K, 12 in up (forum, not tested)', run(250, 'mh', { L: 1219, D: 610 }, 610, 305, [0], [[51, 250], [76, 150], [600, 75]]));
    log('MH: 400 W 20K, 16 in up (forum, not tested)', run(400, 'mh-20k', { L: 1219, D: 610 }, 610, 406, [0], [[25, 200], [254, 135], [508, 110]]));
  });
});
