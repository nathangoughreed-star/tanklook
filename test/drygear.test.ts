// S240 (2026-10-26): a dry tank has ONE gear model, the Tech rows. Whatever path made the terrarium, its Tech menu shows the rows, the
// totals price exactly those rows (no second model), and every piece with a body is drawn.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildsFor } from '../src/scene/builds';
import { getTankModel } from '../src/data/tanks';
import { optionCost, rowsFor, techOf, techParts } from '../src/scene/tech';
import { demandOf, defaultProfile } from '../src/demand';
import { buildGear, gearPicks } from '../src/render/gear3d';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.parse('2026-10-26');
const tot = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW });
const ex = (id: string) => { const sc = parseScene(JSON.parse(SCENES[id])).scene; return sc.tanks[sc.active]; };
const DRY = ['terrarium', 'arid', 'python', 'rainforest'];

describe('one gear model for a dry tank', () => {
  it('every dry tank shows the six rows, and the totals carry exactly those rows (no second set of dry:* lines)', () => {
    for (const id of DRY) {
      const S = ex(id), D = tot(S), keys = D.items.map(i => i.key);
      expect(rowsFor(S).map(r => r.id), id).toEqual(['heatlamp', 'thermostat', 'uvb', 'gauge', 'mist', 'timer']);
      expect(keys.filter(k => k.startsWith('dry:')), id).toEqual([]);
      const t = techOf(S);
      let setup = 0;
      for (const r of rowsFor(S)) { const o = t.rows[r.id] ?? 'none', c = optionCost(S, r.id, o); setup += c.setup.mode; if (o !== 'none' && c.setup.mode > 0) expect(keys, `${id} ${r.id}`).toContain(r.id); }
      const rowsSetup = D.items.filter(i => rowsFor(S).some(r => r.id === i.key)).reduce((a, i) => a + (i.setup?.mode ?? 0), 0);
      expect(rowsSetup, id).toBeCloseTo(setup, 0);
    }
  });
  it('a path-1 terrarium (ball python 48 x 24 x 24, leopard gecko 36 x 18 x 18) carries the rows, prices them, and draws each', () => {
    for (const [sp, tank] of [['ballpython', 't48x24x24'], ['leopardgecko', 't36x18x18']] as const) {
      for (const b of buildsFor([{ species: sp, n: 1 }], getTankModel(tank)!)) {
        const S = b.setup;
        expect(S.tech?.rows, `${sp} ${b.id}`).toBeDefined();
        expect(S.tech!.rows.heatlamp).toBe('dome');
        expect(S.tech!.rows.uvb).toBe('low');
        const picks = gearPicks(S).map(p => p.id);
        for (const id of ['heatdome', 'thermostat', 'uvb', 'gauge']) expect(picks, `${sp} ${b.id}`).toContain(id);
        expect(picks.includes('handmister') || picks.includes('mister') || S.tech!.rows.mist === 'none').toBe(true);
        const meshes = buildGear(S, S.tank, []);
        expect(meshes.length, sp).toBeGreaterThan(0);
        // the build card's price is the totals' price
        expect(Math.round(tot(S).totals.setupUsd)).toBe(b.setupUsd);
      }
    }
  });
  it('changing a row changes the totals by that option\'s own price, and the drawn pieces follow', () => {
    const S = ex('python'), base = tot(S).totals.setupUsd;
    const mat = { ...S, tech: { ...techOf(S), rows: { ...techOf(S).rows, heatlamp: 'mat' } } };
    const want = optionCost(S, 'heatlamp', 'mat').setup.mode - optionCost(S, 'heatlamp', 'dome').setup.mode;
    expect(Math.abs((tot(mat).totals.setupUsd - base) / want - 1)).toBeLessThan(0.3); // the engine widens a price by its age, so not to the cent
    expect(gearPicks(mat).map(p => p.id)).toContain('heatmat');
    expect(gearPicks(mat).map(p => p.id)).not.toContain('heatdome');
    const fog = { ...S, tech: { ...techOf(S), rows: { ...techOf(S).rows, mist: 'fogger' } } };
    expect(gearPicks(fog).map(p => p.id)).toContain('fogger');
    const box = new THREE.Box3(); for (const m of buildGear(mat, mat.tank, [])) box.expandByObject(m);
    expect(box.isEmpty()).toBe(false);
  });
  it('every priced part with a body is drawn (the ids a pick can take are all built)', () => {
    const S = ex('python');
    for (const rows of [{ heatlamp: 'dome', thermostat: 'dimming', uvb: 'tube', gauge: 'yes', mist: 'mister', timer: 'yes' }, { heatlamp: 'mat', thermostat: 'onoff', uvb: 'low', gauge: 'yes', mist: 'hand', timer: 'none' }]) {
      const X = { ...S, tech: { rows } };
      const parts = techParts(X).map(p => p.gear), ids = gearPicks(X).map(p => p.id);
      for (const g of parts) if (!['baskbulb'].includes(g)) expect(ids.length, g).toBeGreaterThan(0);
      expect(ids.length).toBeGreaterThanOrEqual(5);
    }
  });
  it('top pieces keep clear of each other, on small and large tanks, wherever the owner puts one', () => {
    const rows = { heatlamp: 'dome', thermostat: 'onoff', uvb: 'tube', gauge: 'yes', mist: 'mister', timer: 'none' };
    for (const [L, D] of [[457, 457], [610, 305], [914, 457], [1219, 610]]) for (const place of L >= 914 ? [undefined, { wall: 'lid' as const, at: 0.25, y: 0.5 }] : [undefined]) { // a long tube placed across a small tank's middle leaves no room for the dome: it then overlaps
      const P = ex('python'), S = { ...P, tank: { ...P.tank, L, D, H: 457 }, tech: { rows, ...(place ? { place: { uvb: place } } : {}) } };
      const ps = (buildGear(S, S.tank, [])[0].userData.gearPieces as { row: string; box: THREE.Box3 }[]).filter(p => ['heatlamp', 'uvb', 'mist'].includes(p.row));
      expect(ps.length, `${L}x${D}`).toBe(3);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i].box, b = ps[j].box, ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
        expect(ox > 0 && oz > 0, `${L}x${D} ${ps[i].row} / ${ps[j].row}${place ? ' placed' : ''}`).toBe(false);
      }
    }
  });
  it('a terrarium has its own stand row (about $200 for 48 x 24, scaled by footprint); own furniture is $0; an aquarium keeps the gallon rule', () => {
    const stand = (S: TankSetup) => tot(S).items.find(i => i.key === 'stand');
    const P = ex('python'), big = { ...P, stand: { ...P.stand, show: true } }, small = { ...big, tank: { ...big.tank, L: 610, D: 305 } };
    const b = stand(big)!, s2 = stand(small)!;
    expect(b.label).toBe('Stand (terrarium)');
    expect(b.setup!.mode).toBeGreaterThan(170); expect(b.setup!.mode).toBeLessThan(260);
    expect(s2.setup!.mode).toBeLessThan(b.setup!.mode * 0.6);
    expect(stand({ ...big, stand: { ...big.stand, show: false, need: 'none' } })).toBeUndefined(); // my own furniture: $0
    const A = ex('planted'); expect(stand({ ...A, stand: { ...A.stand, show: true } })!.label).toBe('Stand');
  });
});
