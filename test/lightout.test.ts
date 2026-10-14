import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import {
  KWATER, LREF, TECHS, TECH_IDS, bandsAt, beam, lightEnv, lightOut, lineNorm, luxOf, luxPer, parOf, pointNorm, readout, renderBright,
  techOf, techsFor, type Band, type Emitter, type LightEnv, type LightScene,
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
function env(E: Emitter[], total: number, cone: [number, number], tech: LightTech, ys = -Infinity, k: Band = KWATER.map(v => v / 1000) as Band): LightEnv {
  const line = E[0][3] > 0;
  return { E, phi: total / E.length, cone, norm: line ? lineNorm(cone) : pointNorm(cone), split: TECHS[tech].split, k, ys, trans: 1, walls: null, scale: 1 };
}
const photons = (W: number, t: LightTech) => W * TECHS[t].ppe * TECHS[t].eta;
const par = (e: LightEnv, p: number[], n?: number[]) => parOf(bandsAt(e, p, n));

describe('light output model', () => {
  it('doubling watts doubles PAR and lux everywhere', () => {
    const a = lightOut(scene({ watts: 20 }))!, b = lightOut(scene({ watts: 40 }))!;
    for (const k of ['mean', 'min', 'max', 'surface', 'luxMean', 'luxMid'] as const) expect(b[k] / a[k]).toBeCloseTo(2, 6);
  });
  it('no watts, or a flat light: no estimate (the manual Brightness as before)', () => {
    expect(lightOut(scene({ watts: 0 }))).toBeNull();
    expect(lightOut(scene({ type: 'flat' }))).toBeNull();
    expect(lightEnv(scene({ watts: undefined }))).toBeNull();
  });
  it('a point source in air falls off with the inverse square, beam normalised to its flux', () => {
    const cone = beam({ type: 'spot', cone: 60 } as LightSettings).cone, e = env([[0, 1000, 0, 0]], 100, cone, 'led-white');
    expect(par(e, [0, 0, 0]) / par(e, [0, -1000, 0])).toBeCloseTo(4, 6);
    // the profile integrates to the flux: sum E dA over a large plane 1 m below = flux (within the grid error)
    let s = 0; const step = 25;
    for (let x = -3000; x < 3000; x += step) for (let z = -3000; z < 3000; z += step) s += par(e, [x + step / 2, 0, z + step / 2]) * (step / 1000) ** 2;
    expect(s).toBeCloseTo(100, 0);
  });
  it('a line source conserves flux too, and is 1/r under its middle', () => {
    const e = env([[0, 500, 0, 600]], 100, beam({ type: 'tube' } as LightSettings).cone, 't5-refl');
    let s = 0; const step = 20;
    for (let x = -4000; x < 4000; x += step) for (let z = -4000; z < 4000; z += step) s += par(e, [x + step / 2, 0, z + step / 2]) * (step / 1000) ** 2;
    expect(s / 100).toBeGreaterThan(0.9); // missing: the tails past ±4 m, and what a bare tube sends above horizontal
    expect(s / 100).toBeLessThan(1.001);
    const f = (r: number) => 600 / Math.hypot(r, 600); // the finite-length factor under the middle
    expect(par(e, [0, 400, 0]) / par(e, [0, 300, 0])).toBeCloseTo(2 * f(100) / f(200), 6); // 100 mm vs 200 mm: 1/r
  });
  it('refraction: a deep tank loses less light than straight-line inverse square (water absorption off)', () => {
    const cone = beam({ type: 'spot', cone: 60 } as LightSettings).cone, wet = env([[0, 300, 0, 0]], 100, cone, 'led-white', 0, [0, 0, 0]);
    const at = (d: number) => par(wet, [0, -d, 0]) / (par(wet, [0, -0.01, 0]) / 0.97 * 0.97);
    expect(at(500)).toBeCloseTo((300 / (300 + 500 / 1.33)) ** 2, 3);
    expect(at(500)).toBeGreaterThan((300 / 800) ** 2 * 1.3);
  });
  it('water absorbs red most, so lux and PAR fall off at different rates with depth; murky water dims both', () => {
    // red photons count fully in PAR but little in lux, and water takes them first: under white light PAR falls a
    // little faster than lux; under blue reef light (little red) the green share goes first and lux falls faster
    const cone = beam({ type: 'spot', cone: 60 } as LightSettings).cone;
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
    const want: Record<LightTech, number> = { 'led-white': 67, 'led-planted': 48, 'led-reef': 26, 't5-refl': 74, 't5-bare': 74, 't8': 74, 'cfl': 72, 'mh': 71, 'halogen': 52 };
    for (const t of TECH_IDS) {
      expect(TECHS[t].split.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      expect(Math.abs(luxPer(t) / want[t] - 1)).toBeLessThan(0.05);
    }
  });
  it('techs are filtered by fixture type; an unfit tech falls back to the type default', () => {
    expect(techsFor('tube')).toContain('t5-refl');
    expect(techsFor('spot')).not.toContain('t5-refl');
    expect(techOf({ type: 'spot', tech: 't8' } as LightSettings)).toBe('led-white');
    expect(techOf({ type: 'tube' } as LightSettings)).toBe('t5-refl');
    expect(techOf({ type: 'led', tech: 'led-reef' } as LightSettings)).toBe('led-reef');
  });
  it('readout line and render brightness', () => {
    const o = lightOut(scene({}))!;
    expect(readout(o)).toMatch(/^PAR at substrate ≈ \d+-\d+ µmol \([a-z -]+\) · surface ≈ \d+ · ≈ [\d,]+ lux · estimate$/);
    expect(renderBright(o, 1)).toBeGreaterThanOrEqual(0.2);
    expect(renderBright(o, 2) / renderBright(o, 1)).toBeCloseTo(2, 6);
    expect(renderBright({ ...o, luxMid: 4 * LREF }, 1)).toBeCloseTo(2, 6);
    const typical = lightOut(scene({ watts: 20 }))!;
    expect(renderBright(typical, 1)).toBeGreaterThan(0.85); expect(renderBright(typical, 1)).toBeLessThan(1.15);
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
    const cone = beam({ type: 'spot', cone: 100 } as LightSettings).cone, e = env([[0, 0, 0, 0]], photons(90.5, 'led-reef'), cone, 'led-reef');
    const res = log('AI Hydra 32 HD (in air)', ([[170, 1908], [370, 462], [570, 197]] as const).map(([d, m]) => [`${d / 10} cm`, m, par(e, [0, -d, 0])]));
    for (const r of res) expect(Math.abs(r)).toBeLessThan(0.3);
  });
  it('JBL LED Solar Natur 68 W (white LED bar, 1149 mm), 45 mm above the water, in water under the centre (grade A)', () => {
    // the bar as a dense row of LEDs, mean of the 2700 / 4000 / 6700 K columns. The tank is a 1 m deep glass koi
    // aquarium of unstated size: assumed 1.6 x 0.8 m, bar centred along it. With no walls at all the model reads
    // 20-37% low below 50 cm (the glass returns light at depth), so the walls are part of the fit, not a fudge.
    const T = { L: 1600, D: 800 }, n = 100, E: Emitter[] = Array.from({ length: n }, (_, i) => [T.L / 2 - 574.5 + 1149 * (i + 0.5) / n, 45, -T.D / 2, 0]);
    const e = { ...env(E, photons(68, 'led-white'), beam({ type: 'led' } as LightSettings).cone, 'led-white', 0), walls: { ...T, w: 0.7 } };
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
    const e = env(E, photons(108, 't5-refl'), beam({ type: 'tube' } as LightSettings).cone, 't5-refl', 560), w = { ...e, walls: { ...T, w: 0.7 } };
    // one 54 W tube at the rim of a 24 in tank, substrate 610 mm below it: ~40 (assumed 48 x 18 in, water 50 mm below the tube)
    const T2 = { L: 1219, D: 457 }, one = { ...env([[T2.L / 2, 610, -T2.D / 2, 574.5]], photons(54, 't5-refl'), beam({ type: 'tube' } as LightSettings).cone, 't5-refl', 560), walls: { ...T2, w: 0.7 } };
    const res = log('T5 HO (substrate, assumptions above)', [['2x54 no walls', 60, par(e, [T.L / 2, 0, -T.D / 2])], ['2x54 glass', 60, par(w, [T.L / 2, 0, -T.D / 2])],
      ['1x54 glass', 40, par(one, [T2.L / 2, 0, -T2.D / 2])]]);
    for (const r of res.slice(1)) expect(Math.abs(r)).toBeLessThan(0.5);
  });
});
