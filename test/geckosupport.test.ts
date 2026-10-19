// Gecko support surfaces (lane GS, 2026-10-19): geckos never take a plant leaf, a Shuffle spot a few cm off its limb finds the limb
// (restNear), and nothing a gecko stands on or beside lifts it off the surface it rests on.
import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { getSpecies, leafUp, onLeaves } from '../src/data/species';
import { buildTank } from '../src/render/build';
import { itemMesh, solidProbe } from '../src/render/items';
import { anchors, type AnchorProbe } from '../src/scene/anchors';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY } from '../src/scene/items';
import { shuffleFish } from '../src/scene/scatter';
import { groundHeight } from '../src/scene/terrain';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const GECKOS = ['crestedgecko', 'crestedharlequin', 'leopardgecko'];
const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
function dry(items: Item[]): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 600, D: 450, H: 450 }; S.water.on = false; S.items = items; S.fish = [];
  return S;
}
const gecko = (id: number, species: string): Fish => ({ id, species, x: 300, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor' });
const scene = () => {
  const S = dry([piece(1, 'climb', 250, 230, { size: 520, yaw: 15 }), piece(2, 'climb', 400, 250, { size: 600, yaw: -20, pitch: 8 }), piece(3, 'corkflat', 150, 120), piece(4, 'corktube', 470, 280), piece(5, 'crypt', 300, 340)]);
  S.fish = Array.from({ length: 8 }, (_, i) => gecko(i + 1, GECKOS[i % 3]));
  return S;
};

describe('geckos never take a leaf', () => {
  it('no gecko is a leaf-sitter, and Shuffle never hangs one under anything', () => {
    for (const id of GECKOS) { const sp = getSpecies(id)!; expect(onLeaves(sp), id).toBe(false); expect(leafUp(sp), id).toBe(0); }
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const S = scene(); shuffleFish(S, rng(seed));
      for (const f of S.fish) expect(f.surface, `seed ${seed} ${f.species}`).not.toBe('under');
      for (const m of buildTank({ ...S, units: 'cm' }, S.tank, null).fishMeshes) expect(m.userData.perch, `seed ${seed}`).not.toBe('leaf');
    }
  }, 60000);
  it('the leopard gecko does not climb glass; the crested gecko does', () => {
    expect(getSpecies('leopardgecko')!.surfaces).not.toContain('glass');
    expect(getSpecies('crestedgecko')!.surfaces).toContain('glass');
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const S = scene(); shuffleFish(S, rng(seed)); for (const f of S.fish) if (f.species === 'leopardgecko') expect(f.surface).not.toBe('glass'); }
  });
});

describe('restNear: a spot a few cm off its limb', () => {
  // a limb 10 mm wide along x at depth 200, top at height 300, found only straight below its own width
  const probe: AnchorProbe = { down: (x, d) => Math.abs(d - 200) <= 6 ? { y: 300, n: [0, 1, 0], item: 1, local: [x, 0, 0], toTank: v => v } : null };
  const S = dry([piece(1, 'climb', 300, 200)]);
  const A = anchors(S, S.tank, probe);
  it('finds the limb within reach and the right height; plain rest() finds only the ground', () => {
    expect(A.rest(100, 215).kind).toBe('floor');
    const a = A.restNear(100, 215, 300);
    expect(a.kind).toBe('branch'); expect(a.p[1]).toBe(300); expect(Math.abs(a.p[2] - 200)).toBeLessThanOrEqual(6);
  });
  it('keeps the ground where nothing is near, or only at the wrong height', () => {
    expect(A.restNear(100, 280, 300).kind).toBe('floor'); // out of reach
    expect(A.restNear(100, 215, 120).kind).toBe('floor'); // a limb 180 mm above the height asked for
  });
  it('a spot already on the surface at its height is left where it is', () => {
    const a = A.restNear(100, 201, 305); expect(a.kind).toBe('branch'); expect(a.p[2]).toBe(201);
  });
});

describe('geckos on hardscape stay on what holds them', () => {
  it('Shuffle spots find their limbs, and no gecko hangs in the air off the surface under it', () => {
    let perched = 0, hard = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const S = scene(); shuffleFish(S, rng(seed));
      const built = buildTank({ ...S, units: 'cm' }, S.tank, null);
      const solids = S.items.filter(i => i.kind !== 'plant').map(it => itemMesh(S, S.tank, it)!); for (const m of solids) m.updateMatrixWorld(true);
      const down = solidProbe(S.tank, solids);
      for (const m of built.fishMeshes) {
        const f = S.fish.find(q => q.id === m.userData.id)!, sp = getSpecies(f.species)!;
        if (f.surface !== 'hardscape') continue;
        hard++; if (m.userData.perch) perched++;
        // the surface under it, straight down from its centre: the ground or the highest piece; it sits no more than its belly height
        // plus the largest lift a lizard gets (0.12 of its length) above that, wherever the hardscape beside it reaches
        const w = sp.tl * 1, x = m.position.x, d = -m.position.z, h = down(x, d), under = Math.max(groundHeight(S, S.tank, x, d), h?.y ?? -Infinity);
        if (m.userData.perch === 'branch') continue; // a branch's limb is checked along its own axis by the lizard pose tests
        if (h && h.y > m.position.y) continue; // a rim or slab it is tipped over: the probe's top is above its centre
        expect(m.position.y - under, `seed ${seed} gecko ${f.id}`).toBeLessThan((sp.rest + 0.12) * w + 30);
      }
    }
    expect(hard).toBeGreaterThan(10);
    expect(perched).toBeGreaterThan(hard * 0.3); // most of the limb spots now find their limb (before: about one in eight)
  }, 120000);
});
