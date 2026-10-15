// Quick aquascape setup (lane SS, 2026-10-15; Nathan: the substrate's type, mixing and terrain randomized and tailored
// to the style, like the plants and hardscape): the ground a style is drawn on. Each style has its own substrates (a
// preset or a custom blend) and its own slope; the composition's groups stand on low hills, as a custom terrain grid
// the user can then reshape in the Substrate menu. Drawn from its own random stream (seed x layer 4), so the density
// sliders never touch it; a new style, Shuffle and a new composition redraw it.
import { rng } from '../art/paint';
import { defaultSetup } from './defaults';
import { styleFoci } from './items';
import { clamp } from './physics';
import { sampleTerrain, terrainPoints } from './terrain';
import type { Grain, LayoutId, SubstrateBlend, SubstrateType, TankSetup } from './types';

type Sub = { type: SubstrateType; custom?: SubstrateBlend };
const blend = (grain: Grain, color: string, grain2: Grain | 'none' = 'none', color2 = '#6f6556', share = 30, mix = 0.5): Sub =>
  ({ type: 'custom', custom: { grain, color, grain2, color2, share, mix } });
// aquasoil (dark brown granules), sand, leaf-litter brown; mix near 0 = sand in patches, near 1 = mixed grain by grain
const SOIL = '#2f2620', SAND = '#cbb894', PALE = '#e2d8c4', LEAF = '#4a3626';
type StyleId = Exclude<LayoutId, 'none'>;
const SUBS: Record<StyleId, Sub[]> = {
  stones: [{ type: 'gravel' }, { type: 'pea' }, blend('pebble', '#8d8173', 'gravel', '#b5a58c', 40, 0.7)],
  driftwood: [{ type: 'white' }, { type: 'pea' }, blend('sand', SAND, 'gravel', '#7a6a55', 25, 0.4)],
  planted: [blend('gravel', SOIL), { type: 'gravel' }, blend('gravel', SOIL, 'sand', SAND, 20, 0.1)],
  iwagumi: [blend('gravel', SOIL), { type: 'black' }, blend('gravel', '#3a3530', 'sand', '#d8d0c0', 25, 0.1)],
  swamp: [blend('mud', '#4a3a2c', 'gravel', '#5a4f43', 30, 0.6), { type: 'gravel' }],
  reef: [{ type: 'aragonite' }, { type: 'aragonite' }, { type: 'coral' }],
  nature: [blend('gravel', SOIL, 'sand', SAND, 25, 0.1), blend('gravel', SOIL, 'sand', PALE, 35, 0.15), blend('gravel', SOIL)],
  dutch: [blend('gravel', SOIL), { type: 'onyx' }, blend('gravel', '#3a2c22', 'gravel', '#241e17', 40, 1)],
  jungle: [blend('gravel', LEAF, 'sand', '#6b5440', 35, 0.8), { type: 'black' }, blend('mud', '#3e3022', 'gravel', SOIL, 40, 0.6)],
  forest: [blend('gravel', SOIL, 'sand', SAND, 25, 0.05), blend('gravel', SOIL, 'sand', PALE, 20, 0.1)],
};
/** Slope and relief per style: back depth as [lo, hi] times the front's, hills under the groups (times the front
 *  depth), and roughness (soft waves over the floor). A swamp keeps its own land (no terrain grid). */
const SHAPE: Record<StyleId, { back: [number, number]; hill: number; rough: number }> = {
  stones: { back: [1.5, 2.2], hill: 0.6, rough: 0.1 }, driftwood: { back: [1.5, 2.5], hill: 0.5, rough: 0.1 },
  planted: { back: [2, 3], hill: 0.3, rough: 0 }, iwagumi: { back: [2.5, 3.5], hill: 1.2, rough: 0.1 },
  swamp: { back: [1, 1.5], hill: 0, rough: 0 }, reef: { back: [1, 1.4], hill: 0.4, rough: 0.15 },
  nature: { back: [2.5, 3.5], hill: 1, rough: 0.15 }, dutch: { back: [2, 2.6], hill: 0.2, rough: 0 },
  jungle: { back: [1.5, 2.5], hill: 0.8, rough: 0.35 }, forest: { back: [2, 3], hill: 0.9, rough: 0.15 },
};

/** The ground a style draws for the tank's layout (id, seed, composition): substrate type and blend, corner depths and
 *  terrain. Leaves a bare tank alone. Marks the layout as styled (`ground`), so a later hand edit can be spotted. */
export function styleGround(s: TankSetup): void {
  const id = s.layout.id;
  if (id === 'none') return;
  const T = s.tank, r = rng(s.layout.seed * 7919 + id.length * 104729 + 4 * 1000003);
  const salt = !!(s.water.on && s.water.salt), subs = SUBS[salt ? 'reef' : id], sub = subs[Math.floor(r() * subs.length) % subs.length];
  s.substrate = { ...s.substrate, show: true, type: sub.type, ...(sub.custom ? { custom: { ...sub.custom } } : {}) };
  const sh = SHAPE[id], f = clamp(T.H * 0.05, 15, 40), back = sh.back[0] + r() * (sh.back[1] - sh.back[0]);
  const tilt = (r() - 0.5) * 0.4, ph = [r() * 6.28, r() * 6.28], foci = styleFoci(id, s.layout.seed, s.layout.comp);
  const height = (x: number, d: number) => {
    const u = clamp(x / T.L, 0, 1), t = clamp(d / T.D, 0, 1), ease = t * t * (3 - 2 * t);
    let h = f * (1 + (back - 1) * ease) * (1 + tilt * (u - 0.5));
    for (const g of foci) h += sh.hill * f * Math.sqrt(g.k) * Math.exp(-(((u - g.x) ** 2) / 0.03 + ((t - g.d) ** 2) / 0.06));
    h += sh.rough * f * (Math.sin(u * 7 + ph[0]) * Math.sin(t * 5 + ph[1]));
    return +clamp(h, 8, T.H * 0.35).toFixed(1);
  };
  s.substrate.fl = height(0, 0); s.substrate.fr = height(T.L, 0); s.substrate.bl = height(0, T.D); s.substrate.br = height(T.L, T.D);
  if (id === 'swamp') s.terrain = { ...s.terrain, on: false };
  else {
    const t = sampleTerrain(s, T, s.terrain.cols || 7);
    t.h = terrainPoints(t, T).map(p => height(p.x, p.depth));
    s.terrain = t;
  }
  s.layout.ground = true;
}

const groundKey = (s: Pick<TankSetup, 'substrate' | 'terrain'>) => JSON.stringify([s.substrate, s.terrain.on ? s.terrain : null]);
/** Would redrawing the ground lose a hand edit? A styled ground: changed since it was drawn. A ground never styled
 *  (older tanks, examples, the user's own): anything but the default substrate on a flat floor. */
export function groundEdited(s: TankSetup): boolean {
  if (!s.layout.ground) { const d = defaultSetup(); return groundKey(s) !== groundKey({ substrate: d.substrate, terrain: { ...d.terrain, on: false } }); }
  const t: TankSetup = { ...s, substrate: { ...s.substrate, custom: { ...s.substrate.custom } }, terrain: { ...s.terrain }, layout: { ...s.layout } };
  styleGround(t);
  return groundKey(t) !== groundKey(s);
}
