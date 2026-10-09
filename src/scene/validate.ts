// Load-time validation and migration. Untrusted JSON in, a complete valid Scene out (plus warnings), or an error.
import { getSpecies, hasSpecies } from '../data/species';
import { defaultSetup } from './defaults';
import { LIBRARY, MAX_ITEMS, clampItem, starterItems } from './items';
import { clamp, mapToTank } from './physics';
import { normTank } from './shape';
import { TABLE_MAX, fitTable } from './table';
import { keepInWater } from './water';
import { SCENE_VERSION, type Fish, type Item, type Scene, type Tank, type TankSetup } from './types';

export class SceneError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export const LIMITS = {
  tankMin: 50, tankMax: 5000,     // mm, per interior dimension
  dist: [400, 5000] as const,
  az: [-180, 180] as const,
  el: [-20, 85] as const,
  zoom: [0.5, 4] as const,
  count: [1, 6] as const,
  rows: [1, 4] as const,
  spacing: [0, 1500] as const,     // mm, 0 = auto
  cone: [15, 120] as const,        // degrees, full beam angle
  bright: [0.2, 2.5] as const,
  kelvin: [2700, 14000] as const,
  room: [0, 0.8] as const,
  lampH: [20, 900] as const,
  yaw: [-180, 180] as const,
  tilt: [-30, 30] as const,
  bend: [-1, 1] as const,
  maxFish: 500,
  stand: [12 * 25.4, 48 * 25.4] as const, // mm
  person: [900, 2100] as const,            // mm
  size: [0.15, 1.3] as const,              // custom fish length, fraction of the adult length
  level: [0.1, 1] as const,
  terrainCols: [3, 25] as const,             // custom terrain grid points along the length
  terrainMax: 0.95,                        // highest point, fraction of interior height                // water level, fraction of full
  opacity: [0, 0.95] as const,             // water tint after 300 mm
};
export const SURFACES = ['floor', 'glass'] as const;
/** The v7 rectangle panes a glass snail could be on, with the coordinate that put it on that pane. */
const OLD_PANES: Record<string, (f: Obj, T: Tank) => void> = {
  front: f => { f.depth = 0; }, back: (f, T) => { f.depth = T.D; }, left: f => { f.x = 0; }, right: (f, T) => { f.x = T.L; },
};
export const LAYOUT_IDS = ['none', 'stones', 'driftwood', 'planted', 'iwagumi', 'swamp'] as const;
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
  // v5 adds water (level, colour); older files get the default: full, clear. v6 adds custom terrain (off).
  // v8 adds tank shapes (absent = rect) and glass snails anywhere on the glass (old pane names are mapped in parseSetup).
  // v9 adds aquascape items: a file without them gets its layout's starter set (parseSetup), so it looks much as it did.
  if (v < 7) {
    // v7: split tanks. One flat setup (tankA + contents) becomes tanks[0]; a shown Tank B (v6 mirrored A's contents at
    // B's size) becomes an independent copy of A at B's size, fish at the same relative spots.
    const { version: _v, name, units, tankA, tankB, compare, ...rest } = raw;
    const A: Obj = { ...rest, tank: tankA }, tanks = [A];
    const tA = isObj(tankA) ? tankA as unknown as Tank : null, tB = isObj(tankB) ? tankB as unknown as Tank : null;
    if (compare === true && tA && tB && [tA.L, tA.H, tA.D, tB.L, tB.H, tB.D].every(n => typeof n === 'number' && n > 0)) {
      const B = structuredClone(A); B.tank = tB;
      if (Array.isArray(B.fish)) B.fish = B.fish.map(f => (isObj(f) && typeof f.x === 'number' && typeof f.y === 'number' && typeof f.depth === 'number'
        ? { ...f, ...mapToTank(tA, tB, f as unknown as Fish) } : f));
      tanks.push(B);
    }
    for (const k of Object.keys(raw)) delete raw[k];
    Object.assign(raw, { name, units, tanks, active: 0, camLock: true });
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
  if (!(('tankA' in input && 'fish' in input) || Array.isArray(input.tanks))) throw new SceneError('Not a scene file (missing tank or fish).');
  const raw = migrate(structuredClone(input), warn);
  const rawTanks = (Array.isArray(raw.tanks) ? raw.tanks as unknown[] : []).filter(isObj).slice(0, 2);
  if (!rawTanks.length) throw new SceneError('Not a scene file (no tank).');
  const tanks = rawTanks.map((t, i) => parseSetup(t, warn, rawTanks.length > 1 ? `Tank ${'AB'[i]}: ` : ''));
  for (const t of tanks) t.render.edge = tanks[0].render.edge; // an app preference, the same everywhere
  const scene: Scene = {
    version: SCENE_VERSION,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'My tank',
    units: raw.units === 'cm' ? 'cm' : 'in',
    tanks,
    active: raw.active === 1 && tanks.length > 1 ? 1 : 0,
    camLock: typeof raw.camLock === 'boolean' ? raw.camLock : true,
  };
  if (scene.camLock && tanks.length > 1) tanks[1].camera = { ...tanks[0].camera };
  return { scene, warnings };
}

/** One tank's setup from untrusted JSON. `pre` prefixes warnings (which tank). */
function parseSetup(raw: Obj, warn0: (m: string) => void, pre: string): TankSetup {
  const d = defaultSetup(), warn = (m: string) => warn0(pre + m);

  const num = (v: unknown, def: number, lo = -Infinity, hi = Infinity) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def;
  const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
  const pick = <T extends string>(v: unknown, opts: readonly T[], def: T): T =>
    (typeof v === 'string' && (opts as readonly string[]).includes(v) ? (v as T) : def);
  const sub = (k: string) => (isObj(raw[k]) ? raw[k] as Obj : {});
  const tank = (v: unknown, def: Tank): Tank => {
    const o = isObj(v) ? v : {};
    const T: Tank = { L: num(o.L, def.L, LIMITS.tankMin, LIMITS.tankMax), H: num(o.H, def.H, LIMITS.tankMin, LIMITS.tankMax), D: num(o.D, def.D, LIMITS.tankMin, LIMITS.tankMax) };
    const shape = pick(o.shape, ['rect', 'bow', 'round', 'poly'] as const, 'rect'); // v8; older files: rect
    if (shape === 'rect') return T;
    return normTank({ ...T, shape, ...(shape === 'poly' ? { sides: num(o.sides, 6) } : {}), ...(shape === 'bow' ? { bowMin: num(o.bowMin, T.D * 0.75, 0, T.D) } : {}) });
  };

  const tankA = tank(raw.tank, d.tank);
  const c = sub('camera'), r = sub('render'), l = sub('light'), s = sub('substrate'), lay = sub('layout');
  const te = sub('terrain'), wa = sub('water'), st = sub('stand'), w = sub('wall'), pe = sub('person');
  const glass = r.glass === 'auto' ? 'auto' : typeof r.glass === 'number' && GLASS_CHOICES.includes(r.glass) ? r.glass : 'auto';
  const subMax = tankA.H * 0.5;

  const fish: Fish[] = [], seen = new Set<number>();
  let nextId = 1;
  const rawFish = Array.isArray(raw.fish) ? raw.fish : [];
  for (const f of rawFish) if (isObj(f) && typeof f.id === 'number') nextId = Math.max(nextId, f.id + 1);
  let unknown = 0;
  for (const f of rawFish.slice(0, LIMITS.maxFish)) {
    if (!isObj(f)) continue;
    if (typeof f.surface === 'string' && f.surface in OLD_PANES) { OLD_PANES[f.surface](f, tankA); f.surface = 'glass'; } // v7 pane -> v8 glass
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

  const setup: TankSetup = {
    tank: tankA,
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
      type: pick(l.type, ['flat', 'spot', 'tube', 'led'] as const, 'flat'), count: Math.round(num(l.count, 2, ...LIMITS.count)), rows: Math.round(num(l.rows, 1, ...LIMITS.rows)),
      // added 2026-10-09 (no version bump); older files: the old filled grid and 52° beam
      pattern: pick(l.pattern, ['grid', 'tri'] as const, 'grid'), spacing: Math.round(num(l.spacing, 0, ...LIMITS.spacing)), cone: Math.round(num(l.cone, 52, ...LIMITS.cone)),
      bright: num(l.bright, 1, ...LIMITS.bright), kelvin: num(l.kelvin, 6500, ...LIMITS.kelvin), room: num(l.room, 0.15, ...LIMITS.room),
      height: num(l.height, 50, ...LIMITS.lampH), // added 2026-10-08; older files: the old fixed 50 mm
    },
    substrate: {
      show: bool(s.show, d.substrate.show), type: pick(s.type, ['gravel', 'black', 'white'] as const, 'gravel'),
      fl: num(s.fl, d.substrate.fl, 0, subMax), fr: num(s.fr, d.substrate.fr, 0, subMax),
      bl: num(s.bl, d.substrate.bl, 0, subMax), br: num(s.br, d.substrate.br, 0, subMax),
    },
    layout: { id: pick(lay.id, LAYOUT_IDS, d.layout.id), seed: Math.round(num(lay.seed, 1, 1, 1e9)) },
    water: {
      on: bool(wa.on, true), level: num(wa.level, d.water.level, ...LIMITS.level), opacity: num(wa.opacity, d.water.opacity, ...LIMITS.opacity),
      color: typeof wa.color === 'string' && /^#[0-9a-f]{6}$/i.test(wa.color) ? wa.color.toLowerCase() : d.water.color,
    },
    terrain: (() => {
      const cols = Math.round(num(te.cols, d.terrain.cols, ...LIMITS.terrainCols)), rows = Math.round(num(te.rows, 0, 0, 25));
      const h = Array.isArray(te.h) && rows >= 2 && te.h.length === cols * rows && te.h.every(v => typeof v === 'number' && Number.isFinite(v))
        ? (te.h as number[]).map(v => clamp(v, 0, tankA.H * LIMITS.terrainMax)) : [];
      return h.length ? { on: bool(te.on, false), cols, rows, h } : { on: false, cols, rows: 0, h: [] };
    })(),
    lid: pick(raw.lid, ['open', 'glass', 'hood'] as const, d.lid),
    stand: {
      show: bool(st.show, d.stand.show), height: num(st.height, d.stand.height, ...LIMITS.stand),
      finish: pick(st.finish, ['black', 'white', 'oak'] as const, d.stand.finish),
      style: pick(st.style, ['cabinet', 'frame', 'table'] as const, d.stand.style),
      table: (() => { // added 2026-10-09 (no version bump); fitTable below grows it to the tank and keeps the tank on it
        const tb = isObj(st.table) ? st.table as Obj : {}, dt = d.stand.table, shape = pick(tb.shape, ['rect', 'round'] as const, 'rect');
        const L = num(tb.L, dt.L, 0, TABLE_MAX), D = shape === 'round' ? L : num(tb.D, dt.D, 0, TABLE_MAX);
        return { shape, L, D, x: num(tb.x, 0, -TABLE_MAX, TABLE_MAX), z: num(tb.z, 0, -TABLE_MAX, TABLE_MAX) };
      })(),
    },
    person: {
      show: bool(pe.show, d.person.show), height: num(pe.height, d.person.height, ...LIMITS.person),
      side: pick(pe.side, ['left', 'right'] as const, d.person.side),
    },
    wall: {
      show: bool(w.show, d.wall.show), side: pick(w.side === 'peninsula' ? 'right' : w.side, ['back', 'left', 'right'] as const, d.wall.side), // 'peninsula' (session 3) was the right end
      color: typeof w.color === 'string' && /^#[0-9a-f]{6}$/i.test(w.color) ? w.color.toLowerCase() : d.wall.color,
    },
    fish,
    items: [],
  };
  setup.items = Array.isArray(raw.items) ? parseItems(raw.items, tankA, warn) : starterItems(setup);
  keepInWater(setup); fitTable(setup);
  return setup;
}

function parseItems(raw: unknown[], T: Tank, warn: (m: string) => void): Item[] {
  const out: Item[] = [], seen = new Set<number>(), fin = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  let nextId = 1, bad = 0;
  for (const o of raw) if (isObj(o) && typeof o.id === 'number') nextId = Math.max(nextId, o.id + 1);
  for (const o of raw.slice(0, MAX_ITEMS)) {
    const v = isObj(o) && typeof o.variant === 'string' && Object.hasOwn(LIBRARY, o.variant) ? LIBRARY[o.variant] : null;
    if (!isObj(o) || !v) { bad++; continue; }
    const id = typeof o.id === 'number' && Number.isInteger(o.id) && o.id > 0 && !seen.has(o.id) ? o.id : nextId++;
    seen.add(id);
    const it: Item = {
      id, kind: v.kind, variant: o.variant as string, seed: Math.round(clamp(fin(o.seed, 1), 1, 2e9)),
      x: fin(o.x, T.L / 2), depth: fin(o.depth, T.D / 2), lift: fin(o.lift, 0),
      yaw: Math.round(fin(o.yaw, 0)), tilt: Math.round(fin(o.tilt, 0)), size: fin(o.size, v.size),
    };
    clampItem(it, T); out.push(it);
  }
  if (bad) warn(`${bad} unknown aquascape items were skipped.`);
  if (raw.length > MAX_ITEMS) warn(`Only the first ${MAX_ITEMS} aquascape items were loaded.`);
  return out;
}

export const nextFishId = (s: TankSetup) => s.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
