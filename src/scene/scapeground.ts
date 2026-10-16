// Quick aquascape setup (lane SS, 2026-10-15; Nathan: the substrate's type, mixing and terrain randomized and tailored
// to the style, like the plants and hardscape): the ground a style is drawn on. Each style has its own substrates (a
// preset or a custom blend) and its own slope; the composition's groups stand on low hills, as a custom terrain grid
// the user can then reshape in the Substrate menu. Drawn from its own random stream (seed x layer 4), so the density
// sliders never touch it; a new style, Shuffle and a new composition redraw it.
import { rng } from '../art/paint';
import { defaultSetup } from './defaults';
import { isSwampy, styleFoci } from './items';
import { clamp } from './physics';
import { sampleTerrain, swampTerrain, terrainPoints } from './terrain';
import type { Grain, LayoutId, LeafKind, SubstrateBlend, SubstrateType, TankSetup } from './types';

type Sub = { type: SubstrateType; custom?: SubstrateBlend; litter?: { leaf: LeafKind; density: number } };
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
  // lane SS2: terrarium grounds (soil, sand, clay, bark), with leaf litter where the floor of the forest has it
  rainforest: [{ type: 'soil', litter: { leaf: 'mixed', density: 65 } }, { type: 'layered', litter: { leaf: 'mixed', density: 55 } }, { type: 'soil', litter: { leaf: 'magnolia', density: 70 } }],
  jumper: [{ type: 'soil', litter: { leaf: 'oak', density: 40 } }, { type: 'layered', litter: { leaf: 'mixed', density: 35 } }],
  frogs: [{ type: 'soil', litter: { leaf: 'mixed', density: 40 } }, { type: 'layered', litter: { leaf: 'catappa', density: 35 } }],
  arid: [{ type: 'tsand' }, { type: 'clay' }, { type: 'tsand' }],
  python: [{ type: 'bark' }, { type: 'bark' }, { type: 'soil' }],
  burrow: [{ type: 'soil' }, { type: 'soil', litter: { leaf: 'oak', density: 12 } }, { type: 'tsand' }],
  paludarium: [{ type: 'soil', litter: { leaf: 'mixed', density: 30 } }, { type: 'layered', litter: { leaf: 'mixed', density: 25 } }],
  blackwater: [blend('sand', '#6a5238', 'mud', '#3a2c20', 30, 0.6), blend('sand', '#7a6446', 'gravel', '#3a2c22', 20, 0.5)].map(b => ({ ...b, litter: { leaf: 'catappa' as const, density: 70 } })),
  malawi: [blend('sand', '#ece3cf'), blend('sand', PALE, 'sand', SAND, 30, 0.3), { type: 'white' }],
  stream: [blend('sand', '#b6a587', 'pebble', '#8d8173', 25, 0.5), blend('sand', SAND, 'gravel', '#7a6a55', 30, 0.4)],
  hillstream: [blend('pebble', '#8d8173', 'gravel', '#b5a58c', 40, 0.6), blend('gravel', '#7e756a', 'sand', SAND, 25, 0.3), { type: 'gravel' }],
  softreef: [{ type: 'aragonite' }, { type: 'coral' }],
  spsreef: [{ type: 'aragonite' }, { type: 'aragonite' }],
  clownnano: [{ type: 'aragonite' }, { type: 'coral' }],
};
/** Slope and relief per style: back depth as [lo, hi] times the front's, hills under the groups (times the front
 *  depth), and roughness (soft waves over the floor). A swamp's land and pools are drawn by swampTerrain. */
const SHAPE: Record<StyleId, { back: [number, number]; hill: number; rough: number }> = {
  stones: { back: [1.5, 2.2], hill: 0.6, rough: 0.1 }, driftwood: { back: [1.5, 2.5], hill: 0.5, rough: 0.1 },
  planted: { back: [2, 3], hill: 0.3, rough: 0 }, iwagumi: { back: [2.5, 3.5], hill: 1.2, rough: 0.1 },
  swamp: { back: [1, 1.5], hill: 0, rough: 0 }, reef: { back: [1, 1.4], hill: 0.4, rough: 0.15 },
  nature: { back: [2.5, 3.5], hill: 1, rough: 0.15 }, dutch: { back: [2, 2.6], hill: 0.2, rough: 0 },
  jungle: { back: [1.5, 2.5], hill: 0.8, rough: 0.35 }, forest: { back: [2, 3], hill: 0.9, rough: 0.15 },
  rainforest: { back: [1.6, 2.4], hill: 0.7, rough: 0.2 }, jumper: { back: [1.5, 2.2], hill: 0.6, rough: 0.2 }, frogs: { back: [1.5, 2.3], hill: 0.8, rough: 0.25 },
  arid: { back: [1.4, 2], hill: 0.5, rough: 0.2 }, python: { back: [1.2, 1.6], hill: 0.2, rough: 0.1 }, burrow: { back: [2.5, 3.5], hill: 0.8, rough: 0.2 },
  paludarium: { back: [1, 1.5], hill: 0, rough: 0 }, blackwater: { back: [1.6, 2.4], hill: 0.5, rough: 0.2 }, malawi: { back: [1.8, 2.6], hill: 0.3, rough: 0.05 },
  stream: { back: [1.8, 2.8], hill: 0.5, rough: 0.2 }, hillstream: { back: [1.8, 2.6], hill: 0.6, rough: 0.25 },
  softreef: { back: [1, 1.4], hill: 0.3, rough: 0.15 }, spsreef: { back: [1, 1.3], hill: 0.2, rough: 0.1 }, clownnano: { back: [1, 1.3], hill: 0.2, rough: 0.1 },
};
/** Styles from lane SS2 (and so the ones that set or clear leaf litter; an older style leaves the user's litter alone). */
const SS2_IDS: ReadonlySet<string> = new Set(['rainforest', 'arid', 'jumper', 'python', 'burrow', 'frogs', 'paludarium', 'blackwater', 'malawi', 'stream', 'hillstream', 'softreef', 'spsreef', 'clownnano']);

/** The ground a style draws for the tank's layout (id, seed, composition): substrate type and blend, corner depths and
 *  terrain. Leaves a bare tank alone. Marks the layout as styled (`ground`), so a later hand edit can be spotted. */
export function styleGround(s: TankSetup, part: 'both' | 'type' | 'shape' = 'both'): void {
  const id = s.layout.id;
  if (id === 'none') return;
  const gs = s.layout.gSeed ?? s.layout.seed, T = s.tank, r = rng(gs * 7919 + id.length * 104729 + 4 * 1000003);
  r(); // the substrate's pick used to come off this stream: skipped, so the shape is drawn as before the type got its own seed
  const salt = !!(s.water.on && s.water.salt);
  if (part !== 'shape') {
    const ts = s.layout.tSeed ?? gs, rt = rng(ts * 7919 + id.length * 104729 + 5 * 1000003), subs = SUBS[salt ? 'reef' : id], sub = subs[Math.floor(rt() * subs.length) % subs.length];
    s.substrate = { ...s.substrate, show: true, type: sub.type, ...(sub.custom ? { custom: { ...sub.custom } } : {}) };
    if (SS2_IDS.has(id) && !salt) { if (sub.litter) s.substrate.litter = { ...sub.litter, seed: 1 + Math.floor(rt() * 1e6) }; else delete s.substrate.litter; }
  }
  if (part === 'type') { s.layout.ground = true; return; }
  const sh = SHAPE[id], f = clamp(T.H * 0.08, 20, 70), back = sh.back[0] + r() * (sh.back[1] - sh.back[0]);
  const tilt = (r() - 0.5) * 0.4, ph = [r() * 6.28, r() * 6.28], relief = 0.6 + r() * 1.8, bumps = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ u: 0.1 + r() * 0.8, t: 0.15 + r() * 0.7, a: (r() < 0.75 ? 1 : -0.7) * (0.4 + r() * 0.6), w: 0.015 + r() * 0.03 })), foci = styleFoci(id, s.layout.gFoc ?? s.layout.seed, s.layout.comp);
  const height = (x: number, d: number) => {
    const u = clamp(x / T.L, 0, 1), t = clamp(d / T.D, 0, 1), ease = t * t * (3 - 2 * t);
    let h = f * (1 + (back - 1) * ease) * (1 + tilt * (u - 0.5));
    for (const g of foci) h += relief * sh.hill * f * Math.sqrt(g.k) * Math.exp(-(((u - g.x) ** 2) / 0.03 + ((t - g.d) ** 2) / 0.06));
    h += relief * sh.rough * f * (Math.sin(u * 7 + ph[0]) * Math.sin(t * 5 + ph[1]));
    if (sh.hill > 0) for (const b of bumps) h += relief * Math.max(0.3, sh.hill) * f * b.a * Math.exp(-(((u - b.u) ** 2) + ((t - b.t) ** 2)) / b.w); // the style's own mounds and dips, new with every shuffle
    return +clamp(h, 8, T.H * 0.35).toFixed(1);
  };
  // corners on the sliders' 1 mm step, so a hand can set them exactly (generator audit 2026-10-16)
  s.substrate.fl = Math.round(height(0, 0)); s.substrate.fr = Math.round(height(T.L, 0)); s.substrate.bl = Math.round(height(0, T.D)); s.substrate.br = Math.round(height(T.L, T.D));
  if (isSwampy(id)) s.terrain = swampTerrain(s, T, gs); // its land and pools, as terrain the user edits
  else {
    const t = sampleTerrain({ ...s, terrain: undefined }, T, s.terrain.cols || 7); // no pools: hills only
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
