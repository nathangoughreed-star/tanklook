// Lights follow-ups (lane LF, 2026-10-20): the PAR check against published bars, a product's price in the cost, the
// submersible stick lit from under the water and moved off the middle of the back glass.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile, demandOf } from '../src/demand';
import { mean3 } from '../src/demand/range';
import { lightProduct } from '../src/data/gearCatalog';
import { BAR_CHECK, applyLightProduct, lightProductNote } from '../src/scene/lightproduct';
import { KWATER, SUB_DROP, TECHS, bandsAt, beamExp, emitters, lightEnv, lightOut, parOf, pointNorm, subStick, type Band, type Emitter, type LightEnv } from '../src/scene/lightout';
import { parseScene } from '../src/scene/validate';
import type { LightTech, TankSetup } from '../src/scene/types';

const planted = () => parseScene(SCENES.planted).scene.tanks[0] as TankSetup;
const withProduct = (id: string, tank: Partial<TankSetup['tank']> = {}): TankSetup => {
  const S = planted(), T = { ...S.tank, ...tank }, l = { ...S.light }; applyLightProduct(l, T, lightProduct(id)!);
  return { ...S, tank: T, lid: 'open', light: l };
};

describe('budget bars: the model against published bar readings', () => {
  // reference/par-calibration-data.md D3 (Portland Aquarium, grade C, in air, under the bar): watts, length mm, inches below, PAR
  const BARS: [number, number, number, number][] = [[5, 254, 12, 35], [20, 300, 12, 80], [30, 838, 12, 95], [26, 876, 12, 134], [19, 610, 14, 86], [35.6, 1219, 12, 90], [25, 1219, 12, 35], [65, 1371, 12, 155], [58, 1219, 14, 125]];
  const below = (t: LightTech) => {
    const r = BARS.map(([W, L, din, meas]) => {
      const E: Emitter[] = Array.from({ length: 100 }, (_, i) => [-L / 2 + L * (i + 0.5) / 100, 0, 0, 0]), m = beamExp({ type: 'led' });
      const e: LightEnv = { E, phi: W * TECHS[t].ppe * TECHS[t].eta / 100, m, norm: pointNorm(m), ind: [0, 0, 0], split: TECHS[t].split, k: KWATER.map(v => v / 1000) as Band, ys: -Infinity, trans: 1, walls: null, scale: 1 };
      return parOf(bandsAt(e, [0, -din * 25.4, 0])) / meas;
    }).sort((a, b) => a - b);
    return Math.round((1 - r[4]) * 100);
  };
  it('BAR_CHECK is the median shortfall of the model against the 9 published bars', () => {
    expect(BARS.length).toBe(BAR_CHECK.n);
    expect(below('led-white')).toBe(BAR_CHECK.highPct); expect(below('led-planted')).toBe(BAR_CHECK.lowPct);
  });
  it('the 12 W AQUANEAT bar is labelled an assumption, with that check', () => {
    expect(lightProductNote(lightProduct('aquaneat-18-24')!)).toMatch(/Assumption, not a measurement: the model reads 18-27 % below 9 published bar readings/);
    expect(lightProductNote(lightProduct('hygger-submersible-24-7')!)).not.toMatch(/Assumption/);
  });
});

describe('a light product is in the cost', () => {
  it('its listed price replaces the generic light row; generic stays as it was', () => {
    const P = defaultProfile(), now = Date.parse('2026-10-20');
    const S = withProduct('hygger-978-48-54', { L: 1219 }), G = { ...S, light: { ...S.light } }; delete G.light.product;
    const row = (T: TankSetup) => demandOf(T, P, { now }).items.find(i => i.key === 'light')!;
    const a = row(S), g = row(G), p = lightProduct('hygger-978-48-54')!;
    expect(a.label).toBe(`Light: ${p.brand} ${p.model}`);
    expect(mean3(a.setup!)).toBeGreaterThan(p.priceUsd! * 0.9); expect(mean3(a.setup!)).toBeLessThan(p.priceUsd! * 1.3);
    expect(g.label).toMatch(/^Light \(/);
    expect(a.kwhMo).toBeCloseTo(g.kwhMo ?? 0, 6);
  });
});

describe('the submersible stick', () => {
  const sub = () => withProduct('hygger-submersible-24-7', { L: 610 });
  it('is lit from under the water: its emitters sit SUB_DROP under the surface, near the back glass, no lid loss', () => {
    const S = sub(), e = lightEnv(S)!, p = lightProduct('hygger-submersible-24-7')!;
    for (const [, y, z] of e.E) { expect(y).toBeCloseTo(e.ys - SUB_DROP - p.heightMm / 2, 6); expect(z).toBeLessThan(-S.tank.D + 40); }
    expect(emitters(S.tank, S.light)[0][1]).toBeCloseTo(S.tank.H, 6); // the generic emitters stay at the rim; only lightEnv drops them
    // lighting the near water only: the substrate beside the back glass gets far more than the front corner, and the
    // numbers stay finite and positive; a glass lid changes nothing (it is not between the stick and the tank)
    const o = lightOut(S)!, glass = lightOut({ ...S, lid: 'glass' })!;
    expect(o.mean).toBeGreaterThan(0); expect(glass.mean).toBeCloseTo(o.mean, 6);
    const at = (z: number) => parOf(bandsAt({ ...e, ind: [0, 0, 0] }, [S.tank.L * 0.6, 1, z]));
    expect(at(-S.tank.D * 0.9)).toBeGreaterThan(at(-S.tank.D * 0.1));
  });
  it('does not read as a bar at the rim: no surface to cross, and nearer the floor', () => {
    const S = sub(), under = lightOut(S)!.mean;
    const rim = { ...S, light: { ...S.light, product: undefined } }; // the same bar of LEDs at the rim, generic
    expect(under).not.toBeCloseTo(lightOut(rim as TankSetup)!.mean, 0);
  });
  it('is pushed to the right end of the back glass, off the middle where a filter intake can sit, and stays on the glass', () => {
    const p = lightProduct('hygger-submersible-24-7')!;
    for (const L of [450, 610, 760, 914, 1219]) {
      const T = { L, D: 305 }, st = subStick(T, p);
      expect(st.cx + st.len / 2).toBeCloseTo(L - 10, 6); expect(st.cx - st.len / 2).toBeGreaterThanOrEqual(10 - 1e-9);
      if (L >= 610) expect(st.cx - st.len / 2).toBeGreaterThanOrEqual(L / 2 - 20); // at most a strainer's width left of the middle
      if (L >= 700) expect(st.cx - st.len / 2).toBeGreaterThanOrEqual(L / 2);       // beyond that the middle is clear
    }
    const xs = emitters({ L: 914, H: 305, D: 305 } as never, withProduct('hygger-submersible-24-7', { L: 914 }).light).map(e => e[0]);
    expect(Math.min(...xs)).toBeGreaterThan(914 / 2);
  });
});
