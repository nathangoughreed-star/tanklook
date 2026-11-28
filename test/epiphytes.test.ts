// Lane EP1 (R197 / R198, 2026-11-27): no tied plant (java fern, anubias, buce, java moss) hangs in the water over its
// rock or wood. "Floats" = its base (ground + lift) more than 0.1 in (2.5 mm) off the real surface of its host's mesh.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { hostMeshes, isTied, nearestSurface } from '../src/render/epiphytes';
import '../src/render/items';
import { ARCHETYPES } from '../src/scene/archetypes';
import { emptyBuild } from '../src/scene/builds';
import { EPIPHYTES } from '../src/scene/items';
import { recipeBase, recipeLook, stopScene } from '../src/scene/recipes';
import { scapeSetup } from '../src/scene/scapes';
import { shuffleHard } from '../src/scene/starter';
import { Store } from '../src/scene/store';
import { catalogueSizes } from '../src/scene/tankfit';
import { groundHeight } from '../src/scene/terrain';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

// @ts-expect-error node:fs has no types in this project (as test/ab3)
const fs = await import('node:fs');
const readFileSync = (f: string, _e: string): string => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const MAX_IN = 0.1;
/** The worst tied plant of a tank: inches off its host's surface (Infinity = tied to a piece that has no mesh), and which. */
function worst(S: TankSetup) {
  const meshes = hostMeshes(S), byId = new Map(meshes.map(m => [m.userData.item as number, m]));
  let gap = 0, who = '', n = 0;
  for (const it of S.items) {
    if (!isTied(it)) continue;
    n++;
    const host = it.host != null ? byId.get(it.host) : undefined;
    const base = new THREE.Vector3(it.x, groundHeight(S, S.tank, it.x, it.depth) + it.lift, -it.depth);
    const h = host ? nearestSurface([host], base) : null, g = h ? h.d / 25.4 : Infinity;
    if (g > gap) { gap = g; who = `${it.variant}#${it.id} @${Math.round(it.x)},${Math.round(it.depth)} lift ${Math.round(it.lift)} host ${it.host ?? '-'}`; }
  }
  return { gap, who, n };
}
const sizes = () => { const all = catalogueSizes(false).map(c => c.m); return [20, 75].map(g => all.find(m => m.ratedGal >= g) ?? all[all.length - 1]); };

describe('tied plants sit on their rock or wood (lane EP1, R197)', () => {
  it('every freshwater recipe x 2 tank sizes x 3 density stops', () => {
    const bad: string[] = []; let tied = 0;
    for (const a of ARCHETYPES) if (recipeLook(a) !== 'reef') for (const m of sizes()) {
      const b = recipeBase(a, m); if (!b) continue;
      for (const s of [0, 2, 4]) { const r = worst(stopScene(b, s)); tied += r.n; if (r.gap > MAX_IN) bad.push(`${a.id} ${m.name} stop ${s}: ${r.gap.toFixed(2)} in, ${r.who}`); }
    }
    expect(bad).toEqual([]);
    expect(tied).toBeGreaterThan(20); // the check saw tied plants at all
  }, 900000);

  it('every planted look (3 seeds), and after a hardscape Shuffle', () => {
    const bad: string[] = [];
    for (const look of ['nature', 'dutch', 'jungle', 'forest', 'iwagumi'] as const) for (const seed of [1, 17, 91]) {
      const build = emptyBuild(sizes()[1], 0), setup = structuredClone(build.setup); setup.layout = { ...setup.layout, seed };
      // a look reaches the tank through a store edit (the layout itself is drawn unseated, so its search is not changed by seating)
      const st = new Store({ tanks: [scapeSetup(build, look, 'live', setup, { dens: { hard: 1.2, plant: 1.5 } })], active: 0 } as never);
      st.edit(() => {});
      const S = st.tank;
      let r = worst(S); if (r.gap > MAX_IN) bad.push(`${look} seed ${seed}: ${r.gap.toFixed(2)} in, ${r.who}`);
      st.edit(t => shuffleHard(t, seed + 5)); r = worst(st.tank); if (r.gap > MAX_IN) bad.push(`${look} seed ${seed} shuffled: ${r.gap.toFixed(2)} in, ${r.who}`);
    }
    expect(bad).toEqual([]);
  }, 900000);

  it("Nathan's scene (photo-60t, saved before HG1 with guessed tie heights) loads with every fern on its wood", () => {
    const S = parseScene(readFileSync('research/visual/vf0/scenes/photo-60t.json', 'utf8')).scene.tanks[0];
    const r = worst(S);
    expect(r.n).toBe(3);
    expect(r.gap, r.who).toBeLessThanOrEqual(MAX_IN);
    for (const it of S.items) if (EPIPHYTES.has(it.variant)) expect(it.host, `${it.variant}#${it.id}`).toBeTypeOf('number');
  });

  it('an old file with a fern hanging 5 in over a log comes out tied to the log; one far from any piece drops to the sand', () => {
    const S0 = parseScene(readFileSync('research/visual/vf0/scenes/photo-60t.json', 'utf8')).scene.tanks[0];
    const log = S0.items.find(i => i.kind === 'wood')!;
    const raw = JSON.parse(readFileSync('research/visual/vf0/scenes/photo-60t.json', 'utf8'));
    const t = raw.tanks?.[0] ?? raw;
    t.items.push({ id: 900, kind: 'plant', variant: 'anubias', seed: 5, x: log.x, depth: log.depth, lift: 260, size: 120, yaw: 0, pitch: 0, tilt: 0 });
    t.items.push({ id: 901, kind: 'plant', variant: 'buce', seed: 6, x: 1000, depth: 290, lift: 40, size: 80, yaw: 0, pitch: 0, tilt: 0 });
    const S = parseScene(JSON.stringify(raw)).scene.tanks[0];
    const a = S.items.find(i => i.id === 900)!, b = S.items.find(i => i.id === 901)!;
    expect(a.host).toBe(log.id);
    expect(worst(S).gap).toBeLessThanOrEqual(MAX_IN);
    expect(b.lift).toBe(0); expect(b.host).toBeUndefined();
  });

  it('a tied plant follows its piece when the piece is moved, turned, resized or reshuffled in the editor', () => {
    const S0 = parseScene(readFileSync('research/visual/vf0/scenes/photo-60t.json', 'utf8')).scene.tanks[0];
    const st = new Store({ tanks: [S0], active: 0 } as never);
    st.edit(() => {}); // first sight
    const fern = () => st.tank.items.find(i => i.id === 9)!, host = fern().host!;
    const wood = () => st.tank.items.find(i => i.id === host)!;
    const x0 = fern().x;
    st.edit(t => { t.items.find(i => i.id === host)!.x += 80; });
    expect(fern().host).toBe(host);
    expect(Math.abs(fern().x - (x0 + 80))).toBeLessThan(15);
    expect(worst(st.tank).gap).toBeLessThanOrEqual(MAX_IN);
    st.edit(t => { t.items.find(i => i.id === host)!.yaw += 30; });
    expect(worst(st.tank).gap).toBeLessThanOrEqual(MAX_IN);
    st.edit(t => { t.items.find(i => i.id === host)!.size *= 0.8; });
    expect(worst(st.tank).gap).toBeLessThanOrEqual(MAX_IN);
    st.edit(t => { t.items.find(i => i.id === host)!.seed += 1; });
    expect(fern().host).toBe(host);
    expect(worst(st.tank).gap).toBeLessThanOrEqual(MAX_IN);
    expect(wood().kind).toBe('wood');
  });
});
