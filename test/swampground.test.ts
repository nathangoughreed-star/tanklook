// Swamp land as editable ground (2026-10-16, Nathan: "The program should never be able to generate a scape that
// couldn't theoretically be exactly recreated in the manual mode"). The swamp's land used to be drawn from the layout
// seed inside groundHeight; it is now plain terrain data (a grid plus pools). This holds the ground of every old swamp
// file (the paludarium example, and swamp layouts on rect, round, bowl and pie tanks) to the heights it had before.
// Re-record (only on purpose, from a build that still has the seed-driven land): RECORD=1 npx vitest run test/swampground.test.ts
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultSetup } from '../src/scene/defaults';
import { shapeOf } from '../src/scene/shape';
import { groundHeight, groundInsideBy, sampleTerrain, terrainDisc } from '../src/scene/terrain';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';
import BASE from './fixtures/swamp-baseline.json';

const N = 48;
/** Old-format swamp files (layout 'swamp', custom terrain off), as they were saved before the change. */
function files(): [string, string][] {
  const out: [string, string][] = [['paludarium', SCENES.paludarium]];
  const shapes: [string, Record<string, unknown>][] = [
    ['rect', {}], ['round', { L: 600, D: 600, H: 600, shape: 'round' }], ['bowl', { L: 400, D: 400, H: 350, shape: 'bowl' }],
    ['pie', { L: 700, D: 500, H: 450, shape: 'pie' }], ['long', { L: 1200, D: 450, H: 500 }],
  ];
  for (const [name, tk] of shapes) for (const seed of [1, 2, 7, 13]) {
    const s = defaultSetup() as unknown as Record<string, any>;
    s.tank = { ...s.tank, ...tk }; s.layout = { id: 'swamp', seed, ground: true }; s.water.level = 0.42;
    s.substrate = { ...s.substrate, show: true, fl: 25, fr: 30, bl: 50, br: 60 };
    s.terrain = { on: false, cols: 7, rows: 0, h: [] }; s.items = [];
    out.push([`${name}/${seed}`, JSON.stringify({ version: 9, tanks: [s] })]);
  }
  return out;
}
const heights = (S: TankSetup) => {
  const T = S.tank, h: number[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) h.push(+groundHeight(S, T, T.L * i / N, T.D * j / N).toFixed(2));
  return h;
};

describe('old swamp files keep their ground', () => {
  const all = Object.fromEntries(files().map(([k, raw]) => [k, heights(parseScene(raw).scene.tanks[0])]));
  if ((globalThis as any).process?.env.RECORD) {
    it('recorded', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      fs.writeFileSync(new URL('./fixtures/swamp-baseline.json', import.meta.url), JSON.stringify(all));
    });
    return;
  }
  const base = BASE as Record<string, number[]>;
  const tanks = Object.fromEntries(files().map(([k, raw]) => [k, parseScene(raw).scene.tanks[0]]));
  for (const [k, now] of Object.entries(all)) it(k, () => {
    const was = base[k], S = tanks[k], T = S.tank;
    const disc = terrainDisc(T);
    let worst = 0, sum = 0, n = 0, flare = 0;
    for (let i = 0; i < now.length; i++) {
      const x = T.L * (i % (N + 1)) / N, d = T.D * Math.floor(i / (N + 1)) / N;
      if (groundInsideBy(S, T, x, d) < 0) continue; // outside the glass (a round tank's corners): never seen
      const e = Math.abs(now[i] - was[i]);
      // a bowl's terrain grid spans its floor disc and holds the outer ring out to the sloping glass, so the land's
      // roll there is flattened a little (known, reported 2026-10-16); pools stay exact
      if (shapeOf(T) === 'bowl' && Math.hypot((x - disc.x) / disc.rx, (d - disc.depth) / disc.rd) > 1) { flare = Math.max(flare, e); continue; }
      worst = Math.max(worst, e); sum += e; n++;
    }
    expect(worst, `${k}: worst ${worst.toFixed(2)} mm`).toBeLessThan(1);
    expect(sum / n, `${k}: mean`).toBeLessThan(0.2);
    expect(flare, `${k}: bowl flare`).toBeLessThan(10);
  });
});

describe('swamp land is plain terrain data', () => {
  const old = () => parseScene(SCENES.paludarium).scene.tanks[0];
  it('an old swamp loads as custom terrain with pools', () => {
    const S = old();
    expect(S.terrain.on).toBe(true);
    expect(S.terrain.pools!.length).toBeGreaterThan(0);
  });
  it('the ground no longer reads the layout seed', () => {
    const S = old(), T = S.tank, a = heights(S);
    S.layout = { ...S.layout, seed: S.layout.seed + 11 };
    expect(heights(S)).toEqual(a);
    S.layout = { ...S.layout, id: 'none' };
    expect(heights(S)).toEqual(a);
    expect(groundHeight(S, T, T.L / 2, T.D / 2)).toBeGreaterThan(0);
  });
  it('a saved swamp is not converted again: terrain switched off stays off', () => {
    const S = old(); S.terrain.on = false;
    const again = parseScene(JSON.stringify({ version: 9, tanks: [S] })).scene.tanks[0];
    expect(again.terrain.on).toBe(false);
    expect(again.terrain.pools).toEqual(S.terrain.pools);
    const flat = { ...S, terrain: { on: false, cols: 7, rows: 0, h: [], pools: [] } }; // pools all removed: none come back
    expect(parseScene(JSON.stringify({ version: 9, tanks: [flat] })).scene.tanks[0].terrain.on).toBe(false);
  });
  it('a new grid resolution keeps the pools and the land they are cut into', () => {
    const S = old(), T = S.tank;
    const r = { ...S, terrain: sampleTerrain(S, T, 25) };
    expect(r.terrain.pools).toEqual(S.terrain.pools);
    const p = S.terrain.pools![0], x = p.x * T.L, d = Math.min(p.d + p.rd * 0.2, 1) * T.D; // inside the pool: its floor
    expect(groundHeight(r, T, x, d)).toBeCloseTo(groundHeight(S, T, x, d), 1);
    expect(Math.abs(groundHeight(r, T, T.L * 0.5, T.D * 0.9) - groundHeight(S, T, T.L * 0.5, T.D * 0.9))).toBeLessThan(1);
  });
});
