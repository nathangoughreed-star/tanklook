import { describe, expect, it } from 'vitest';
import { mean3 } from '../src/demand/range';
import { defaultProfile, demandOf } from '../src/demand';
import { artificialGeometry } from '../src/render/plant3d';
import { parsePatches, plantBrushes } from '../src/scene/brush';
import { defaultScene } from '../src/scene/defaults';
import { LIBRARY, clampItem, hardscape, itemDims, layerOf, makeItem } from '../src/scene/items';
import { capacityOf } from '../src/scene/stocking';
import { setGrowTime } from '../src/scene/growtime';
import { buildSheet } from '../src/scene/setupsheet';
import { parseScene } from '../src/scene/validate';
import type { Item, TankSetup } from '../src/scene/types';

// Artificial plants (lane P4, 2026-10-20): a kind of their own, silk or plastic, no growth, priced as decoration.
const NOW = Date.parse('2026-10-20');
const FAKES = Object.entries(LIBRARY).filter(([, v]) => v.kind === 'artificial').map(([id]) => id);
const tank = (variants: string[] = FAKES): TankSetup => {
  const sc = defaultScene(), S = sc.tanks[0], T = S.tank;
  S.fish = [];
  S.items = variants.map((v, i) => makeItem(T, v, i + 1, 5 + i, T.L * (0.15 + 0.12 * i), T.D * 0.5));
  return S;
};

describe('artificial plants: data', () => {
  it('six variants, silk and plastic, in each form, all of kind artificial', () => {
    expect(FAKES.sort()).toEqual(['plasticmoss', 'plasticstem', 'plasticsword', 'silkmoss', 'silkstem', 'silksword']);
    for (const v of FAKES) {
      const f = LIBRARY[v].fake!;
      expect(v.startsWith(f.mat), v).toBe(true);
      expect(['stem', 'rosette', 'mat']).toContain(f.form);
      expect(layerOf({ kind: 'artificial' })).toBe('plant'); // they go with the plants layer (Plants section, plant regeneration)
    }
  });
  it('are not perches: no hardscape spots on them', () => {
    expect(hardscape(tank()).area).toBe(0);
  });
});

describe('artificial plants: save / load', () => {
  it('round-trips through a saved scene unchanged, and drops growth, propagation and Time fields', () => {
    const sc = defaultScene(), S = sc.tanks[0];
    S.items = FAKES.map((v, i) => ({ ...makeItem(S.tank, v, i + 1, 9 + i, 100 + 60 * i, 120), size: LIBRARY[v].size + 10 }));
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].items;
    expect(back).toEqual(S.items);
    const dirty = { ...S.items[0], growth: 0.3, planted: 0.1, parent: 2, spread: 80, stems: 4, dens: 1.5 } as Item;
    const it = parseScene(JSON.parse(JSON.stringify({ ...sc, tanks: [{ ...S, items: [dirty] }] }))).scene.tanks[0].items[0];
    for (const k of ['growth', 'planted', 'parent', 'spread', 'stems', 'dens'] as const) expect(it[k], k).toBeUndefined();
    expect(it.kind).toBe('artificial');
  });
  it('size stays inside the variant range and the tank height', () => {
    const S = tank(['silkstem']), it = { ...S.items[0], size: 5000 };
    clampItem(it, S.tank);
    expect(it.size).toBeLessThanOrEqual(Math.round(Math.min(LIBRARY.silkstem.max, S.tank.H * 1.2)));
  });
});

describe('artificial plants: no growth', () => {
  it('moving the tank Time changes nothing on them', () => {
    const S = tank(), before = JSON.stringify(S.items);
    setGrowTime(S, 1); setGrowTime(S, 0.2);
    expect(JSON.stringify(S.items)).toBe(before);
  });
  it('the same geometry every time, height = size (a mat: width = size), no growth attributes', () => {
    for (const v of FAKES) {
      const f = LIBRARY[v].fake!, g = artificialGeometry(f.mat, f.form, 7, 200), h = artificialGeometry(f.mat, f.form, 7, 200);
      expect(Array.from(g.attributes.position.array)).toEqual(Array.from(h.attributes.position.array));
      expect(Object.keys(g.attributes).sort(), v).toEqual(['color', 'normal', 'position']);
      const bb = g.boundingBox!;
      if (f.form === 'mat') expect(bb.max.x - bb.min.x).toBeCloseTo(200, 0);
      else expect(bb.max.y).toBeCloseTo(200, 0);
      expect(bb.min.y).toBeGreaterThan(-1);
      expect(g.attributes.position.count, v).toBeLessThan(60000);
      // the dims the editor uses are near the drawn size
      const d = itemDims({ kind: 'artificial', variant: v, seed: 7, size: 200 });
      expect(d[1] / (bb.max.y - bb.min.y), v).toBeGreaterThan(f.form === 'mat' ? 0.5 : 0.95);
    }
  });
});

describe('artificial plants: scatter brush', () => {
  it('the upright ones can be painted, the mats cannot, and a painted patch loads back', () => {
    const ids = plantBrushes().map(b => b.id);
    for (const v of ['silkstem', 'plasticstem', 'silksword', 'plasticsword']) expect(ids).toContain(`plant:${v}`);
    for (const v of ['silkmoss', 'plasticmoss']) expect(ids).not.toContain(`plant:${v}`);
    const p = parsePatches([{ id: 1, brush: 'plant:silkstem', seed: 3, size: 80, density: 40, path: [100, 100, 200, 120], growth: 0.4 }]);
    expect(p?.[0].brush).toBe('plant:silkstem');
  });
});

describe('artificial plants: demand and stocking', () => {
  it('priced once as decoration (a hardscape row), no plant row, no light / CO2 / fertiliser, no minutes', () => {
    const S = tank(), P = defaultProfile(), base = demandOf(tank([]), P, { now: NOW }), D = demandOf(S, P, { now: NOW });
    for (const v of FAKES) {
      const r = D.items.find(c => c.key === `hard:${v}`);
      expect(r, v).toBeTruthy();
      expect(r!.group).toBe('hardscape');
      expect(r!.setup!.mode).toBeGreaterThan(2);
      expect(r!.upkeep).toBeUndefined();
      expect(r!.minutes).toBeUndefined();
    }
    expect(D.items.some(c => c.key.startsWith('plant:'))).toBe(false);
    expect(D.items.some(c => c.key === 'co2' || c.key === 'ferts')).toBe(false);
    expect(D.totals.upkeepUsdMo).toBeCloseTo(base.totals.upkeepUsdMo, 5);
    // no trimming minutes of their own; they only add a wipe to the glass row (lane MW)
    const noGlass = (x: typeof D) => x.totals.minPerWeek - x.items.filter(c => c.key === 'glass').reduce((a, c) => a + mean3(c.minutes!), 0);
    expect(noGlass(D)).toBeCloseTo(noGlass(base), 5);
    expect(D.totals.minPerWeek).toBeGreaterThan(base.totals.minPerWeek);
  });
  it('take up no nitrate: the stocking capacity does not change', () => {
    expect(capacityOf(tank()).plants).toBe(capacityOf(tank([])).plants);
    expect(capacityOf(tank()).plantCount).toBe(0);
  });
  // lane SE2's hook (isLivePlantPatch, 1ceb3fa): painted artificial patches are not live plants
  it('a painted patch of artificial plants takes up no nitrate either', () => {
    const S = tank([]), n0 = capacityOf(S).plantCount;
    S.patches = parsePatches([{ id: 1, brush: 'plant:silksword', seed: 3, size: 80, density: 40, path: [100, 100, 200, 120] }]);
    expect(capacityOf(S).plantCount).toBe(n0);
  });
  it('listed on the setup sheet under their own heading', () => {
    const sc = defaultScene(); sc.tanks[0] = tank(['silkstem', 'silkstem', 'plasticmoss']);
    const sec = buildSheet(sc).sections.find(s => s.title === 'Artificial plants');
    expect(sec?.rows.map(r => [r.item, r.qty])).toEqual([['Silk stem plant', '2'], ['Plastic moss mat', '1']]);
  });
});
