// R208 BH-S1: the review tank of the behavior slice (bh1-first-slice.md): 36 x 18 x 16 in (45 gal), 2 in of sand, one cave, one wood piece
// with an overhang, a rock pile with crevices, a root mass, a sword, and the five pilots. Opened by `?scene=bh1`; never saved.
import { bareSetup } from '../scene/defaults';
import { defaultScene } from '../scene/defaults';
import { makeItem } from '../scene/items';
import { ensureUids } from '../scene/uid';
import type { Fish, Scene } from '../scene/types';

const IN = 25.4;
export function bh1Scene(): Scene {
  const S = bareSetup();
  S.tank = { L: 36 * IN, H: 16 * IN, D: 18 * IN };
  S.customTank = { name: 'BH1 review tank (36 x 18 x 16 in)' };
  S.render.bg = 'blue'; S.render.bgSides = ['back'];
  S.substrate = { ...S.substrate, show: true, type: 'aragonite', fl: 2 * IN, fr: 2 * IN, bl: 2 * IN, br: 2 * IN };
  S.camera = { ...S.camera, el: 8 };
  let id = 1;
  const T = S.tank, it = (v: string, seed: number, x: number, depth: number, extra = {}) => makeItem(T, v, id++, seed, x, depth, extra);
  S.items = [
    it('coconut', 3, 150, 260, { size: 190, yaw: 20 }),
    it('branch', 5, 400, 230, { size: 430 }),
    it('river', 2, 600, 170, { size: 150, yaw: 10 }),
    it('river', 4, 690, 190, { size: 130, yaw: -20 }),
    it('river', 6, 650, 175, { size: 110, lift: 85, yaw: 30 }),
    it('spider', 7, 810, 300, { size: 260 }),
    it('sword', 1, 470, 330, { size: 230 }),
  ];
  let fid = 1;
  const fish = (species: string, x: number, y: number, depth: number, extra: Partial<Fish> = {}): Fish => ({ id: fid++, species, x, y, depth, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra });
  S.fish = [
    ...[[300, 120], [340, 90], [520, 100], [560, 140]].map(([x, d]) => fish('pandacory', x, 70, d)),
    fish('kribensis', 330, 90, 200), fish('kribensis', 300, 90, 215, { sex: 'f' }),
    ...[[780, 270], [840, 330], [880, 290]].map(([x, d]) => fish('kuhli', x, 70, d)),
    fish('peacockgudgeon', 180, 100, 190), fish('peacockgudgeon', 215, 110, 170),
    fish('bristlenose', 120, 70, 300),
  ];
  ensureUids(S);
  return { ...defaultScene(), name: 'BH1 review tank', tanks: [S] };
}
