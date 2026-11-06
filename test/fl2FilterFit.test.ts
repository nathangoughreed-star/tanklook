// Lane FL2 (Nathan 2026-11-06, a 1-2 gal tank with a big HOB floating off its back corner): the filter a tank gets is rated for it, and
// whatever kind it is, the drawn piece sits on / in the tank (HOB over the back rim, intake in the water; sponge / internal inside).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { emptyScene } from '../src/scene/defaults';
import { buildGear, gearPicks } from '../src/render/gear3d';
import { FILTER_MODELS, type FilterKind } from '../src/demand/gear';
import { filterFor } from '../src/scene/tech';
import { volume } from '../src/scene/physics';
import type { TankSetup } from '../src/scene/types';

/** one tank per size the lane names (1, 2.5, 5, 10, 20, 40, 75 gal) plus the awkward shapes: a rimless cube, a bowfront, a hex, a pie, an arch */
const TANKS: [string, string][] = [
  ['1 gal', 'n_vehipa_vehipa_betta_fish_1_a'], ['1 gal rimless cube', 'n_aqueon_frameless_cube_1'], ['2.5 gal', 'g2_5'], ['5 gal', 'g5_5'], ['10 gal', 'g10'],
  ['20 gal', 'g20h'], ['40 gal', 'g40b'], ['75 gal', 'g75'], ['6 gal bowfront', 'bow6'], ['36 gal bowfront', 'bow36'], ['35 gal hex', 'hex35'], ['50 gal pie', 'cor50'], ['9 gal arch', 'n_flex_9gal'],
];
const setup = (id: string, stand = true): TankSetup => { const S = emptyScene().tanks[0]; S.tank = tankFromModel(getTankModel(id)!); S.stand = { ...S.stand, show: stand }; return S; };
const galOf = (S: TankSetup) => volume(S.tank).gallons;
/** the box of the meshes `pick` keeps */
const bounds = (ms: THREE.Mesh[], pick: (m: THREE.Mesh) => boolean = () => true) => { const b = new THREE.Box3(); for (const m of ms) if (pick(m)) b.expandByObject(m); return b; };
const inWater = (m: THREE.Mesh) => !m.userData.room; // wet + clear + glow: the parts that are in the tank (or its lily pipes, airline, cords)
const solidWet = (m: THREE.Mesh) => !m.userData.room && !m.userData.nolight; // the wet bucket alone: bodies, no clear tubing

describe('FL2: the filter is rated for the tank', () => {
  it('every tank size gets a generic filter rated for its volume, of each kind that makes sense there', () => {
    for (const [n, id] of TANKS) {
      const S = setup(id), gal = galOf(S);
      for (const kind of ['hob', 'internal', 'sponge'] as FilterKind[]) {
        const f = filterFor(S, kind);
        expect(gal, `${n} ${kind} ${f.model.id}`).toBeGreaterThanOrEqual(f.model.galMin * 0.9);
        expect(gal, `${n} ${kind} ${f.model.id}`).toBeLessThanOrEqual(f.model.galMax * f.n * 1.15);
        expect(f.turnover, `${n} ${kind} turnover`).toBeLessThanOrEqual(60); // never one rated far above the tank (a 100 gph HOB on 1 gal was 99x)
      }
      if (gal >= 20) { const f = filterFor(S, 'canister'); expect(f.model.galMin, `${n} canister`).toBeLessThanOrEqual(gal); }
    }
  });
  it('a 1 to 4 gal tank gets the nano models, a 5 gal and up the standard ones', () => {
    expect(filterFor(setup('n_vehipa_vehipa_betta_fish_1_a'), 'hob').model.id).toBe('hob-xs');
    expect(filterFor(setup('g2_5'), 'hob').model.id).toBe('hob-xs');
    expect(filterFor(setup('g2_5'), 'internal').model.id).toBe('internal-xs');
    expect(filterFor(setup('g5_5'), 'hob').model.id).toBe('hob-s');
    expect(filterFor(setup('g40b'), 'hob').model.id).toBe('hob-l');
  });
  it('the filter a new tank draws by default is rated for it', () => {
    for (const [n, id] of TANKS) {
      const S = setup(id), gal = galOf(S), pick = gearPicks(S).find(p => p.row === 'filter');
      const m = FILTER_MODELS.find(x => x.id === pick?.id)!;
      expect(m, n).toBeTruthy();
      expect(gal, `${n} ${m.id}`).toBeGreaterThanOrEqual(m.galMin * 0.9);
      expect(gal, `${n} ${m.id}`).toBeLessThanOrEqual(m.galMax * (pick?.n ?? 1) * 1.15);
    }
  });
});

describe('FL2: the drawn filter sits on / in the tank', () => {
  const all = TANKS.flatMap(([n, id]) => [true, false].flatMap(stand => (['left', 'right'] as const).map(side => ({ n: `${n} ${stand ? 'on a stand' : 'on the floor'} ${side}`, id, stand, side }))));
  it('a hang-on-back body stays over the back glass, rim to intake, whatever the tank size', () => {
    for (const { n, id, stand, side } of all) {
      for (const hobId of ['hob-xs', 'hob-s', 'hob-l']) {
        const S = setup(id, stand), T = S.tank, ms = buildGear(S, T, [], [{ id: hobId }], side);
        const whole = bounds(ms), wet = bounds(ms, inWater);
        // the whole piece (body, motor, lip, ripples) is no wider than the tank; the intake and strainer stand in the water, above the floor
        expect(whole.min.x, `${n} ${hobId}`).toBeGreaterThanOrEqual(-1); expect(whole.max.x, `${n} ${hobId}`).toBeLessThanOrEqual(T.L + 1);
        expect(wet.min.x, `${n} ${hobId} intake`).toBeGreaterThanOrEqual(0); expect(wet.max.x, `${n} ${hobId} intake`).toBeLessThanOrEqual(T.L);
        expect(wet.min.y, `${n} ${hobId} strainer`).toBeGreaterThanOrEqual(-2);
        // over the rim: the lip reaches from behind the glass to inside it at the rim's height
        expect(whole.max.y, `${n} ${hobId} rim`).toBeGreaterThan(T.H);
        if (!T.shape || T.shape === 'rect' || T.shape === 'bow' || T.shape === 'arch') expect(whole.min.z, `${n} ${hobId} behind the glass`).toBeLessThan(-T.D + 1); // a flat back; a pie's depth is its radius
      }
    }
  });
  it('a hang-on-back box never goes below the floor it stands near', () => {
    for (const { n, id, stand } of all.filter(a => a.side === 'left')) {
      const S = setup(id, stand), T = S.tank, ms = buildGear(S, T, [], [{ id: 'hob-s' }], 'left');
      const room = bounds(ms, m => !!m.userData.room);
      expect(room.min.y, n).toBeGreaterThanOrEqual(stand ? -700 : -20); // the tank's own underside is about -7 mm; the bare-floor case is the one that bites
    }
  });
  it('sponge and internal filters stand inside the tank, under the rim', () => {
    for (const { n, id, stand, side } of all) {
      for (const fid of ['sponge-s', 'internal-xs', 'internal-s']) {
        const S = setup(id, stand), T = S.tank, ms = buildGear(S, T, [], [{ id: fid }], side), wet = bounds(ms, solidWet);
        expect(wet.min.x, `${n} ${fid}`).toBeGreaterThanOrEqual(-1); expect(wet.max.x, `${n} ${fid}`).toBeLessThanOrEqual(T.L + 1);
        expect(wet.min.y, `${n} ${fid} floor`).toBeGreaterThanOrEqual(-8);
        if (fid === 'sponge-s') expect(wet.max.y, `${n} ${fid} lift tube`).toBeLessThanOrEqual(T.H + 1); // its lift tube ends under the water line
      }
    }
  });
  it('a canister keeps its pipes inside the glass where the tank is long enough for it', () => {
    for (const { n, id, stand, side } of all.filter(a => galOf(setup(a.id)) >= 20)) {
      const S = setup(id, stand), T = S.tank, ms = buildGear(S, T, [], [{ id: 'canister-m' }], side), pipes = bounds(ms, m => !!m.userData.nolight);
      expect(pipes.min.x, n).toBeGreaterThanOrEqual(0); expect(pipes.max.x, n).toBeLessThanOrEqual(T.L);
    }
  });
  it('a heater stays inside the glass on every tank size', () => {
    for (const { n, id, stand, side } of all) {
      const S = setup(id, stand), T = S.tank, ms = buildGear(S, T, [], [{ id: 'heater-25', watts: 25 }], side), wet = bounds(ms, inWater);
      expect(wet.min.x, n).toBeGreaterThanOrEqual(-1); expect(wet.max.x, n).toBeLessThanOrEqual(T.L + 1); expect(wet.min.y, n).toBeGreaterThanOrEqual(-8); // a body may sink a few mm into the substrate line
    }
  });
});
