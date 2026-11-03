import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { itemMesh } from '../src/render/items';
import { ARCHETYPES } from '../src/scene/archetypes';
import { recipeBase, recipeLook, stopScene } from '../src/scene/recipes';
import { catalogueSizes } from '../src/scene/tankfit';
import { emptyBuild } from '../src/scene/builds';
import { scapeSetup } from '../src/scene/scapes';
import { regenerate, shuffleHard } from '../src/scene/starter';
import { itemDims } from '../src/scene/items';
import { Store } from '../src/scene/store';
import { groundHeight } from '../src/scene/terrain';
import type { TankSetup } from '../src/scene/types';

/** The most (inches) any coral's base stands above the highest rock / ground point under its foot, with which coral. */
export function coralGap(S: TankSetup) {
  const T = S.tank;
  const rocks = S.items.filter(i => i.kind !== 'plant' && i.kind !== 'coral' && i.kind !== 'artificial').map(i => itemMesh(S, T, i)).filter((m): m is THREE.Mesh => !!m);
  rocks.forEach(m => m.updateMatrixWorld(true));
  const rc = new THREE.Raycaster(); let gap = 0, who = '';
  for (const c of S.items) if (c.kind === 'coral') {
    const base = groundHeight(S, T, c.x, c.depth) + c.lift, r = itemDims(c)[0] * 0.08;
    let hi = -Infinity;
    for (const [dx, dd] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      rc.set(new THREE.Vector3(c.x + dx, 1e5, -(c.depth + dd)), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObjects(rocks, false)[0];
      hi = Math.max(hi, groundHeight(S, T, c.x + dx, c.depth + dd), h ? h.point.y : -Infinity);
    }
    const g = (base - hi) / 25.4; if (g > gap) { gap = g; who = `${c.variant}@${Math.round(c.x)},${Math.round(c.depth)} lift ${Math.round(c.lift)}`; }
  }
  return { gap, who, n: S.items.filter(i => i.kind === 'coral').length };
}
const MAX_GAP = 0.2;
const sizes = () => { const all = catalogueSizes(false).map(c => c.m); return [20, 55, 120].map(g => all.find(m => m.ratedGal >= g) ?? all[all.length - 1]); };

describe('no coral floats (lane CF1, 2026-11-03)', () => {
  it('every reef archetype x 3 tank sizes x all 5 density stops: each coral rests on rock or sand', () => {
    const bad: string[] = [];
    for (const a of ARCHETYPES) if (recipeLook(a) === 'reef') for (const m of sizes()) {
      const b = recipeBase(a, m); if (!b) continue;
      for (let s = 0; s <= 4; s++) { const r = coralGap(stopScene(b, s)); if (r.gap > MAX_GAP) bad.push(`${a.id} ${m.name} stop ${s}: ${r.gap.toFixed(1)} in, ${r.who}`); }
    }
    expect(bad).toEqual([]);
  }, 900000);

  it('Look First (the reef look drawn straight, 3 sizes x 3 seeds x 3 densities), then a Shuffle and the density sliders', () => {
    const bad: string[] = [];
    for (const m of sizes()) for (const seed of [3, 17, 91]) for (const d of [0.5, 1, 1.8]) {
      const build = emptyBuild(m, 0), setup = structuredClone(build.setup); setup.layout = { ...setup.layout, seed };
      const S = scapeSetup(build, 'reef', 'live', setup, { dens: { hard: d, plant: d } });
      const tag = `${m.name} seed ${seed} dens ${d}`;
      let r = coralGap(S); if (r.gap > MAX_GAP) bad.push(`${tag}: ${r.gap.toFixed(1)} in, ${r.who}`);
      if (d === 1) {
        shuffleHard(S, seed + 5); r = coralGap(S); if (r.gap > MAX_GAP) bad.push(`${tag} shuffled: ${r.gap.toFixed(1)} in, ${r.who}`);
        for (const w of ['hard', 'plant'] as const) { S.layout.dens = { ...S.layout.dens!, [w]: 2.2 }; regenerate(S, w, 0); r = coralGap(S); if (r.gap > MAX_GAP) bad.push(`${tag} slider ${w}: ${r.gap.toFixed(1)} in, ${r.who}`); }
      }
    }
    expect(bad).toEqual([]);
  }, 900000);

  it('a rock resized, moved or removed in the editor: its corals follow it or drop to the sand', () => {
    const m = sizes()[1], build = emptyBuild(m, 0), S0 = scapeSetup(build, 'reef', 'live', structuredClone(build.setup), { dens: { hard: 1.5, plant: 1.5 } });
    const st = new Store({ ...(JSON.parse(JSON.stringify({ x: 0 })) as object), tanks: [S0], active: 0 } as never);
    const rocks = () => st.tank.items.filter(i => i.kind === 'stone');
    const biggest = () => rocks().sort((a, b) => b.size - a.size)[0];
    st.edit(t => { t.items.forEach(() => 0); }); // first sight of the tank
    expect(coralGap(st.tank).gap).toBeLessThan(MAX_GAP);
    const id = biggest().id;
    st.edit(t => { const r = t.items.find(i => i.id === id)!; r.size *= 0.6; r.lift *= 0.6; });
    expect(coralGap(st.tank).gap).toBeLessThan(MAX_GAP);
    st.edit(t => { const r = t.items.find(i => i.id === id)!; r.x = Math.min(t.tank.L - 60, r.x + 200); });
    expect(coralGap(st.tank).gap).toBeLessThan(MAX_GAP);
    st.edit(t => { t.items = t.items.filter(i => i.kind !== 'stone'); });
    expect(coralGap(st.tank).gap).toBeLessThan(MAX_GAP);
  }, 300000);
});
