import { describe, expect, it } from 'vitest';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { bareSetup } from '../src/scene/defaults';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { heatLoss, inferTech, SUMP_FILL, SUMP_MODELS, SUMP_SHARE, sumpOf, techOf, withUnits, type TechSetup } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

// Lane SF (sump follow-ups, 2026-10-23).
const tankOf = (id: string, salt = true, tech?: TechSetup): TankSetup => {
  const S = bareSetup();
  S.tank = tankFromModel(getTankModel(id)!);
  S.water.on = true; S.water.level = 0.9; S.water.salt = salt; S.lid = 'open';
  if (tech) S.tech = tech;
  return S;
};
const room = { roomC: 19, targetC: 25.5 };

describe('SF: the sump loses heat too', () => {
  it('its wetted glass, floor and open water surface add to the loss; the heater and the kWh grow', () => {
    const plain = tankOf('g75', true, { rows: { filter: 'canister' }, ...room });
    const sumped = tankOf('g75', true, { ...withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]), ...room });
    const a = heatLoss(plain), b = heatLoss(sumped), z = sumpOf(sumped)!;
    const wall = 2 * (z.L + z.D) / 1000 * z.H * SUMP_FILL / 1000, floor = z.L * z.D / 1e6;
    expect(b.wallM2 - a.wallM2).toBeCloseTo(wall, 6);
    expect(b.floorM2 - a.floorM2).toBeCloseTo(floor, 6);
    expect(b.surfaceM2 - a.surfaceM2).toBeCloseTo(floor, 6); // the sump's water is open to the cabinet
    expect(b.wPerK - a.wPerK).toBeCloseTo(6 * wall + 2 * floor + 18 * floor, 6);
    expect(b.kwhMo).toBeGreaterThan(a.kwhMo);
    expect(b.totalW).toBeGreaterThanOrEqual(a.totalW);
  });
  it('a bigger sump loses more; the display lid does not cover the sump', () => {
    const t = (m: string): TechSetup => ({ ...withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]), sump: { model: m, ...tankFromModel(getTankModel(m)!) }, ...room });
    expect(heatLoss(tankOf('g75', true, t('g40b'))).lossW).toBeGreaterThan(heatLoss(tankOf('g75', true, t('g10'))).lossW);
    const lid = { ...tankOf('g75', true, t('g20h')), lid: 'glass' as const }, lidPlain = { ...tankOf('g75', true, { rows: { filter: 'canister' }, ...room }), lid: 'glass' as const };
    const z = sumpOf(lid)!;
    expect(heatLoss(lid).wPerK - heatLoss(lidPlain).wPerK).toBeCloseTo(6 * 2 * (z.L + z.D) / 1000 * z.H * SUMP_FILL / 1000 + 20 * z.L * z.D / 1e6, 6);
  });
  it('no sump, no change', () => {
    const S = tankOf('g75', true, { rows: { filter: 'canister' }, sump: { model: 'g20h', ...tankFromModel(getTankModel('g20h')!) }, ...room });
    const T = tankFromModel(getTankModel('g75')!), hw = T.H * 0.9 / 1000;
    expect(heatLoss(S).wallM2).toBeCloseTo(2 * (T.L + T.D) / 1000 * hw, 6);
  });
});

describe('SF: the inferred skimmer follows the filter', () => {
  it('a salt tank without a sump gets a hang-on skimmer (not an in-sump one)', () => {
    for (const id of ['g40b', 'g75', 'g125']) {
      const t = inferTech(tankOf(id));
      expect(t.rows.filter, id).not.toBe('sump');
      expect(t.rows.skimmer, id).toBe('hob');
    }
  });
  it('every salt example scene: the skimmer it lists is one its filter can carry', () => {
    for (const id of Object.keys(SCENES)) {
      const S = parseScene(SCENES[id]).scene.tanks[0];
      if (!S.water.on || !S.water.salt) continue;
      const t = techOf(S);
      if (t.rows.skimmer === 'sump') expect(t.rows.filter, id).toBe('sump');
    }
  });
});

describe('SF: a saved tech without a skimmer row', () => {
  it('fills the skimmer from its own filters: a sump gets the in-sump one, a canister the hang-on one', () => {
    expect(techOf(tankOf('g75', true, withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]))).rows.skimmer).toBe('sump');
    expect(techOf(tankOf('g75', true, withUnits({ rows: {} }, 'filter', [{ kind: 'canister' }, { kind: 'sump' }]))).rows.skimmer).toBe('sump');
    expect(techOf(tankOf('g75', true, { rows: { filter: 'canister' } })).rows.skimmer).toBe('hob');
    expect(techOf(tankOf('g75', true, { rows: { filter: 'canister', skimmer: 'none' } })).rows.skimmer).toBe('none');
  });
});

describe('SF: a nano gets a sump of its own 25 % (Nathan 2026-10-23: "Allow a smaller sump on nanos")', () => {
  it('the sump sizes start at 5 gal; a 20 gal high gets the 5.5 gal (the smallest of its 25 %), not the 10', () => {
    expect(Math.min(...SUMP_MODELS.map(m => m.ratedGal))).toBe(5);
    expect(SUMP_MODELS.some(m => m.id === 'g2_5' || m.id === 'g3c')).toBe(false);
    const S = tankOf('g20h', true, withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]));
    const z = sumpOf(S)!, litres = (b: { L: number; D: number; H: number }) => b.L * b.D * b.H / 1e6;
    expect(z.model).toBe('g5_5');
    expect(litres(z)).toBeGreaterThanOrEqual(SUMP_SHARE * litres(S.tank));
  });
});
