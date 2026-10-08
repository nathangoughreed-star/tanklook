// Load-time validation and migration. Untrusted JSON in, a complete valid Scene out (plus warnings), or an error.
import { getSpecies, hasSpecies } from '../data/species';
import { defaultScene } from './defaults';
import { clamp } from './physics';
import { SCENE_VERSION, type Fish, type Scene, type Tank } from './types';

export class SceneError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export const LIMITS = {
  tankMin: 50, tankMax: 5000,     // mm, per interior dimension
  dist: [400, 3000] as const,
  az: [-180, 180] as const,
  el: [-20, 85] as const,
  zoom: [0.5, 4] as const,
  count: [1, 6] as const,
  bright: [0.2, 2.5] as const,
  kelvin: [2700, 14000] as const,
  room: [0, 0.8] as const,
  yaw: [-180, 180] as const,
  tilt: [-30, 30] as const,
  bend: [-1, 1] as const,
  maxFish: 500,
  stand: [12 * 25.4, 48 * 25.4] as const, // mm
  person: [900, 2100] as const,            // mm
  size: [0.15, 1.3] as const,              // custom fish length, fraction of the adult length
};
export const SURFACES = ['floor', 'front', 'back', 'left', 'right'] as const;
export const LAYOUT_IDS = ['none', 'stones', 'driftwood', 'planted', 'iwagumi'] as const;
export const GLASS_CHOICES = [4, 5, 6, 8, 10, 12, 15, 19];

/** Upgrade older saved shapes to the current version, in place. */
function migrate(raw: Obj, warn: (m: string) => void): Obj {
  const v = typeof raw.version === 'number' ? raw.version : 1;
  if (v > SCENE_VERSION) throw new SceneError(`This file was saved by a newer version (scene v${v}); this app reads up to v${SCENE_VERSION}.`);
  if (v < 2) {
    // v1 (the Phase 1 prototype): glass stored as a string, 'soft' edge mode existed, no name.
    if (isObj(raw.render)) {
      const r = raw.render;
      if (typeof r.glass === 'string' && r.glass !== 'auto') r.glass = Number(r.glass);
      if (r.edge === 'soft') { r.edge = 'cutout'; warn('Edge mode "soft blend" was removed; using cutout.'); }
    }
  }
  if (v < 4) {
    // v3: one sample plant card. v4: layout presets; a shown sample plant becomes the planted preset.
    const p = isObj(raw.plant) ? raw.plant : {};
    raw.layout = { id: p.show === false ? 'none' : 'planted', seed: 1 };
    delete raw.plant;
  }
  raw.version = SCENE_VERSION;
  return raw;
}

export function parseScene(input: unknown): { scene: Scene; warnings: string[] } {
  const warnings: string[] = [], warn = (m: string) => warnings.push(m);
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { throw new SceneError('Not a valid JSON file.'); }
  }
  if (!isObj(input)) throw new SceneError('Not a scene file (expected a JSON object).');
  if (!('tankA' in input) || !('fish' in input)) throw new SceneError('Not a scene file (missing tank or fish).');
  const raw = migrate(structuredClone(input), warn), d = defaultScene();

  const num = (v: unknown, def: number, lo = -Infinity, hi = Infinity) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def;
  const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
  const pick = <T extends string>(v: unknown, opts: readonly T[], def: T): T =>
    (typeof v === 'string' && (opts as readonly string[]).includes(v) ? (v as T) : def);
  const sub = (k: string) => (isObj(raw[k]) ? raw[k] as Obj : {});
  const tank = (v: unknown, def: Tank): Tank => {
    const o = isObj(v) ? v : {};
    return { L: num(o.L, def.L, LIMITS.tankMin, LIMITS.tankMax), H: num(o.H, def.H, LIMITS.tankMin, LIMITS.tankMax), D: num(o.D, def.D, LIMITS.tankMin, LIMITS.tankMax) };
  };

  const tankA = tank(raw.tankA, d.tankA), tankB = tank(raw.tankB, d.tankB);
  const c = sub('camera'), r = sub('render'), l = sub('light'), s = sub('substrate'), lay = sub('layout');
  const st = sub('stand'), w = sub('wall'), pe = sub('person');
  const glass = r.glass === 'auto' ? 'auto' : typeof r.glass === 'number' && GLASS_CHOICES.includes(r.glass) ? r.glass : 'auto';
  const subMax = tankA.H * 0.5;

  const fish: Fish[] = [], seen = new Set<number>();
  let nextId = 1;
  const rawFish = Array.isArray(raw.fish) ? raw.fish : [];
  for (const f of rawFish) if (isObj(f) && typeof f.id === 'number') nextId = Math.max(nextId, f.id + 1);
  let unknown = 0;
  for (const f of rawFish.slice(0, LIMITS.maxFish)) {
    if (!isObj(f)) continue;
    if (typeof f.species !== 'string' || !hasSpecies(f.species)) { unknown++; continue; }
    const id = typeof f.id === 'number' && Number.isInteger(f.id) && f.id > 0 && !seen.has(f.id) ? f.id : nextId++;
    seen.add(id);
    const adult = getSpecies(f.species)!.tl, tl = typeof f.tl === 'number' ? Math.round(num(f.tl, adult, adult * LIMITS.size[0], adult * LIMITS.size[1])) : adult;
    fish.push({
      id, species: f.species,
      x: num(f.x, tankA.L / 2, 0, tankA.L), y: num(f.y, tankA.H / 2, 0, tankA.H), depth: num(f.depth, tankA.D / 2, 0, tankA.D),
      yaw: num(f.yaw, 0, ...LIMITS.yaw), pitch: num(f.pitch, 0, ...LIMITS.tilt), roll: num(f.roll, 0, ...LIMITS.tilt),
      bend: num(f.bend, 0, ...LIMITS.bend),
      ...(getSpecies(f.species)!.kind === 'snail' ? { surface: pick(f.surface, SURFACES, 'floor') } : {}),
      ...(tl !== adult ? { tl } : {}),
    });
  }
  if (unknown) warn(`${unknown} fish of unknown species were skipped.`);
  if (rawFish.length > LIMITS.maxFish) warn(`Only the first ${LIMITS.maxFish} fish were loaded.`);

  const scene: Scene = {
    version: SCENE_VERSION,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : d.name,
    units: pick(raw.units, ['in', 'cm'] as const, d.units),
    tankA, tankB,
    compare: bool(raw.compare, false),
    camera: {
      dist: num(c.dist, d.camera.dist, ...LIMITS.dist), az: num(c.az, 0, ...LIMITS.az),
      el: num(c.el, 0, ...LIMITS.el), zoom: num(c.zoom, 1, ...LIMITS.zoom),
    },
    render: {
      edge: pick(r.edge, ['cutout', 'a2c'] as const, d.render.edge), grid: bool(r.grid, d.render.grid), rim: bool(r.rim, d.render.rim),
      bg: pick(r.bg, ['black', 'blue', 'gradient', 'grey', 'frosted', 'none'] as const, d.render.bg), glass,
      glassType: pick(r.glassType, ['standard', 'lowiron'] as const, 'standard'),
    },
    light: {
      type: pick(l.type, ['flat', 'spot', 'tube', 'led'] as const, 'flat'), count: Math.round(num(l.count, 2, ...LIMITS.count)),
      bright: num(l.bright, 1, ...LIMITS.bright), kelvin: num(l.kelvin, 6500, ...LIMITS.kelvin), room: num(l.room, 0.15, ...LIMITS.room),
    },
    substrate: {
      show: bool(s.show, d.substrate.show), type: pick(s.type, ['gravel', 'black', 'white'] as const, 'gravel'),
      fl: num(s.fl, d.substrate.fl, 0, subMax), fr: num(s.fr, d.substrate.fr, 0, subMax),
      bl: num(s.bl, d.substrate.bl, 0, subMax), br: num(s.br, d.substrate.br, 0, subMax),
    },
    layout: { id: pick(lay.id, LAYOUT_IDS, d.layout.id), seed: Math.round(num(lay.seed, 1, 1, 1e9)) },
    lid: pick(raw.lid, ['open', 'glass', 'hood'] as const, d.lid),
    stand: {
      show: bool(st.show, d.stand.show), height: num(st.height, d.stand.height, ...LIMITS.stand),
      finish: pick(st.finish, ['black', 'white', 'oak'] as const, d.stand.finish),
    },
    person: {
      show: bool(pe.show, d.person.show), height: num(pe.height, d.person.height, ...LIMITS.person),
      side: pick(pe.side, ['left', 'right'] as const, d.person.side),
    },
    wall: {
      show: bool(w.show, d.wall.show), side: pick(w.side === 'left' || w.side === 'right' ? 'peninsula' : w.side, ['back', 'peninsula'] as const, d.wall.side), // left/right end: before 2026-10-08
      color: typeof w.color === 'string' && /^#[0-9a-f]{6}$/i.test(w.color) ? w.color.toLowerCase() : d.wall.color,
    },
    fish,
  };
  return { scene, warnings };
}

export const nextFishId = (s: Scene) => s.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
