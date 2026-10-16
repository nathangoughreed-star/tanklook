// Scatter brush (lane SB, 2026-10-16): a patch is a seed + stroke path + settings; its points are deterministic, stay
// inside the brush radius, drop out where erased; patches save / load, move, turn, copy and delete with a group; erase
// and undo work as single steps.
import { describe, expect, it } from 'vitest';
import { BRUSHES, erasePatches, extendPath, newPatch, parsePatches, patchAt, patchPoints } from '../src/scene/brush';
import { emptyScene } from '../src/scene/defaults';
import { copyGroup, groupSize, moveGroup, removeGroup, scaleGroup, turnGroup, COPY_DEFAULTS } from '../src/scene/duplicate';
import { Store } from '../src/scene/store';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

const tank = () => { const S = structuredClone(emptyScene().tanks[0]); S.tank = { ...S.tank, L: 900, D: 450, H: 450 }; S.items = []; S.fish = []; return S; };
const stroke = (S: TankSetup, brush: Parameters<typeof newPatch>[1], x0: number, d0: number, x1: number, size = 50, density = 70, seed = 5) => {
  const p = newPatch(S, brush, size, density, seed); for (let x = x0; x <= x1; x += 10) extendPath(p, x, d0); (S.patches ??= []).push(p); return p;
};

describe('patch points', () => {
  it('are the same every time and stay within the brush radius of the stroke', () => {
    const S = tank(), p = stroke(S, 'pebble', 200, 200, 500);
    const a = patchPoints(p), b = patchPoints(structuredClone(p));
    expect(a.length).toBeGreaterThan(30);
    expect(b).toEqual(a);
    for (const [x, d] of a) expect(Math.abs(d - 200) <= p.size && x > 200 - p.size && x < 500 + p.size).toBe(true);
  });
  it('density scales the count and a different seed moves them', () => {
    const S = tank(), lo = stroke(S, 'pebble', 200, 200, 500, 50, 20), hi = stroke(S, 'pebble', 200, 200, 500, 50, 80), other = { ...hi, seed: 99 };
    expect(patchPoints(hi).length).toBeGreaterThan(patchPoints(lo).length * 2);
    expect(patchPoints(other)).not.toEqual(patchPoints(hi));
  });
  it('overlapping stroke points do not double the density', () => {
    const S = tank(), once = newPatch(S, 'gravel', 60, 50, 3); extendPath(once, 300, 200);
    const many = { ...once, path: Array.from({ length: 10 }, () => [300, 200]).flat() };
    expect(patchPoints(many).length).toBeLessThan(patchPoints(once).length * 1.6);
  });
  it('adding to the end of a stroke leaves the earlier things where they were', () => {
    const S = tank(), p = stroke(S, 'pebble', 200, 200, 400), before = patchPoints(p);
    const q = { ...p, path: [...p.path] }; extendPath(q, 700, 200);
    const after = patchPoints(q).map(v => v.join());
    const kept = before.filter(v => after.includes(v.join()));
    expect(kept.length / before.length).toBeGreaterThan(0.85);
  });
  it('are dropped inside an erased circle', () => {
    const S = tank(), p = stroke(S, 'pebble', 200, 200, 500), n0 = patchPoints(p).length;
    p.cuts = [350, 200, 40];
    const pts = patchPoints(p); expect(pts.length).toBeLessThan(n0);
    for (const [x, d] of pts) expect(Math.hypot(x - 350, d - 200)).toBeGreaterThanOrEqual(40);
  });
  it('a fast drag is filled in, a tiny move is ignored', () => {
    const S = tank(), p = newPatch(S, 'leaf', 60, 50, 1); extendPath(p, 100, 100); expect(extendPath(p, 102, 100)).toBe(false);
    extendPath(p, 400, 100); expect(p.path.length / 2).toBeGreaterThan(8);
  });
});

describe('storing', () => {
  it('a patch is small and survives save / load exactly', () => {
    const S = tank(), p = stroke(S, 'moss', 100, 100, 600); p.cuts = [200, 100, 30];
    expect(JSON.stringify(p).length).toBeLessThan(900);
    const sc = emptyScene(); sc.tanks[0] = S;
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0];
    expect(back.patches).toEqual(S.patches);
    expect(patchPoints(back.patches![0])).toEqual(patchPoints(p));
  });
  it('a scene without patches loads without them; bad ones are dropped', () => {
    expect(parseScene(JSON.parse(JSON.stringify(emptyScene()))).scene.tanks[0].patches).toBeUndefined();
    expect(parsePatches([{ brush: 'nope', path: [1, 2] }, { brush: 'leaf', path: [1] }, 5, { brush: 'leaf', path: [10, 10, 40, 40], size: 9999, density: -3 }])).toHaveLength(1);
    const q = parsePatches([{ brush: 'leaf', path: [10, 10], size: 9999, density: -3 }])![0];
    expect(q.size).toBe(BRUSHES[0].radius[1]); expect(q.density).toBe(1);
  });
});

describe('erase and groups', () => {
  it('erase cuts only the patches it touches and removes a patch with nothing left', () => {
    const S = tank(), a = stroke(S, 'pebble', 100, 100, 200), b = stroke(S, 'moss', 100, 400, 200);
    expect(erasePatches(S, 150, 100, 40)).toBe(true);
    expect(S.patches!.find(p => p.id === a.id)!.cuts?.length).toBe(3); expect(S.patches!.find(p => p.id === b.id)!.cuts).toBeUndefined();
    erasePatches(S, 150, 100, 200); // covers all of a, not b
    expect(S.patches!.some(p => p.id === a.id)).toBe(false); expect(S.patches!.some(p => p.id === b.id)).toBe(true);
  });
  it('patchAt finds the patch under a point', () => {
    const S = tank(), p = stroke(S, 'leaf', 100, 100, 300, 60);
    expect(patchAt(S, 200, 120)?.id).toBe(p.id); expect(patchAt(S, 600, 300)).toBeNull();
  });
  it('move, turn, resize and delete act on a selected patch with the others', () => {
    const S = tank(), p = stroke(S, 'pebble', 200, 200, 300), g = { fish: [], items: [], patches: [p.id] };
    expect(groupSize(g)).toBe(1);
    const x0 = p.path[0]; moveGroup(S, g, 30, 10); expect(p.path[0]).toBeCloseTo(x0 + 30, 0);
    const s0 = p.size; scaleGroup(S, g, 1.2); expect(p.size).toBe(Math.round(s0 * 1.2));
    const w0 = p.path[p.path.length - 2] - p.path[0]; turnGroup(S, g, 90); expect(Math.abs(p.path[p.path.length - 2] - p.path[0])).toBeLessThan(w0 / 4);
    removeGroup(S, g); expect(S.patches).toBeUndefined();
  });
  it('copies are new patches, beside the original, with their own seed', () => {
    const S = tank(), p = stroke(S, 'leaf', 200, 200, 300), g = { fish: [], items: [], patches: [p.id] };
    const out = copyGroup(S, g, { ...COPY_DEFAULTS, n: 2, seed: 4 }, { fish: 1, item: 1 });
    expect(out.patches).toHaveLength(2); expect(S.patches).toHaveLength(3);
    const c = S.patches!.find(q => q.id === out.patches![0])!;
    expect(c.seed).not.toBe(p.seed); expect(c.path[0]).not.toBe(p.path[0]); expect(c.brush).toBe('leaf');
  });
  it('the store keeps patches in the selection and one undo step undoes a stroke', () => {
    const st = new Store(), sc = emptyScene(); sc.tanks[0].patches = undefined; st.replace(sc);
    st.edit(t => { const p = newPatch(t, 'pebble', 50, 50, 1); extendPath(p, 100, 100); extendPath(p, 300, 100); (t.patches ??= []).push(p); }, { coalesce: 'x' });
    const id = st.tank.patches![0].id; st.togglePatch(id);
    expect(st.group.patches).toEqual([id]); st.select(null); expect(st.group.patches ?? []).toEqual([]);
    st.undo(); expect(st.tank.patches).toBeUndefined();
  });
});

describe('plant brushes', () => {
  it('list the upright library plants, parse from a file and size from the plant', async () => {
    const { plantBrushes, brushDef } = await import('../src/scene/brush');
    const ids = plantBrushes().map(b => b.id);
    expect(ids).toContain('plant:crypt'); expect(ids).not.toContain('plant:salvinia'); expect(ids).not.toContain('plant:hairgrass');
    expect(brushDef('plant:crypt').area).toBeGreaterThan(400);
    const q = parsePatches([{ brush: 'plant:crypt', path: [1, 2, 30, 40] }, { brush: 'plant:nonsense', path: [1, 2] }]);
    expect(q).toHaveLength(1); expect(q![0].brush).toBe('plant:crypt');
  });
});

describe('editing a patch', () => {
  it('erase can be limited to one patch, adding area lifts the cuts it covers, a click selects it alone', async () => {
    const { addArea, erasable } = await import('../src/scene/brush');
    const S = tank(), a = stroke(S, 'pebble', 100, 100, 200), b = stroke(S, 'pebble', 100, 120, 200);
    expect(erasable(S, 150, 100, 20, b.id)).toBe(true);
    erasePatches(S, 150, 110, 30, a.id);
    expect(a.cuts?.length).toBe(3); expect(b.cuts).toBeUndefined();
    addArea(a, 150, 100); a.size = a.size; expect(a.cuts).toBeUndefined();
    const st = new Store(); st.replace(emptyScene()); st.edit(t => { (t.patches ??= []).push({ ...a, id: 1 }); });
    st.selectPatch(1); expect(st.group.patches).toEqual([1]); expect(st.groupCount).toBe(1);
  });
  it('plant patches keep a growth stage through save / load', () => {
    const q = parsePatches([{ brush: 'plant:crypt', path: [1, 2], growth: 0.8 }, { brush: 'pebble', path: [1, 2], growth: 0.8 }])!;
    expect(q[0].growth).toBe(0.8); expect(q[1].growth).toBeUndefined();
  });
});

describe('single things', () => {
  it('each click puts one thing exactly there, on one shared patch per brush', async () => {
    const { placeSingle } = await import('../src/scene/brush');
    const S = tank();
    placeSingle(S, 'pebble', undefined, 100, 120, 1); placeSingle(S, 'pebble', undefined, 300, 200, 2); placeSingle(S, 'leaf', 'oak', 50, 50, 3);
    expect(S.patches).toHaveLength(2);
    const pb = S.patches!.find(p => p.brush === 'pebble')!;
    expect(patchPoints(pb)).toEqual([[100, 120], [300, 200]]);
    erasePatches(S, 100, 120, 10); expect(patchPoints(S.patches!.find(p => p.brush === 'pebble')!)).toEqual([[300, 200]]);
    expect(parsePatches(JSON.parse(JSON.stringify(S.patches)))![0].single).toBe(true);
  });
});
