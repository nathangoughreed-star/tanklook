// Load-time validation and migration. Untrusted JSON in, a complete valid Scene out (plus warnings), or an error.
import { fishTL, getSpecies, hasSpecies } from '../data/species';
import { defaultSetup } from './defaults';
import { LIBRARY, MAX_ITEMS, clampItem, starterItems } from './items';
import { CEILING_H, CEILING_MAX, CEILING_MIN, WALL_GAP, WALL_GAP_MAX, clamp, mapToTank } from './physics';
import { TECH_IDS } from './lightout';
import { normTank } from './shape';
import { TABLE_MAX, fitTable } from './table';
import { keepInWater } from './water';
import { pieSize, radialSize, sameGrid, sampleTerrain, type Ground } from './terrain';
import { SCENE_VERSION, type BgImage, type BgSide, type Fish, type Item, type LightTech, type Scene, type Tank, type TankSetup } from './types';
import { adoptImages, sidesTouch } from './images';

const GRAINS = ['mud', 'sand', 'gravel', 'pebble'] as const;

export class SceneError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const BG_SIDES = ['back', 'left', 'right', 'front'] as const;

export const LIMITS = {
  tankMin: 50, tankMax: 5000,     // mm, per interior dimension
  dist: [400, 5000] as const,
  bgArc: [20, 360] as const,
  bgScale: [10, 200] as const,    // a tiled background picture's height, % of the tank height      // degrees of a round tank's shell the background covers
  az: [-180, 180] as const,
  el: [-20, 85] as const,
  zoom: [0.25, 12] as const, // below 0.5 the eye steps back (scene/orbit.ts eyeDist); was 0.5 before 2026-10-14, older readers clamp
  count: [1, 12] as const,                   // above 6 only reachable with the optimised spot pattern
  rows: [1, 4] as const,
  spacing: [0, 1500] as const,     // mm, 0 = auto
  cone: [15, 120] as const,        // degrees, full beam angle
  bright: [0.2, 2.5] as const,
  kelvin: [2700, 14000] as const,
  room: [0, 0.8] as const,
  lampH: [20, 900] as const,
  watts: [0, 2000] as const,
  par: [0, 2500] as const,
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
export const SURFACES = ['floor', 'glass', 'hardscape'] as const;
/** The v7 rectangle panes a glass snail could be on, with the coordinate that put it on that pane. */
const OLD_PANES: Record<string, (f: Obj, T: Tank) => void> = {
  front: f => { f.depth = 0; }, back: (f, T) => { f.depth = T.D; }, left: f => { f.x = 0; }, right: (f, T) => { f.x = T.L; },
};
export const LAYOUT_IDS = ['none', 'stones', 'driftwood', 'planted', 'iwagumi', 'swamp', 'reef'] as const;
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
  adoptImages(input.images); // a downloaded file's background pictures
  const raw = migrate(structuredClone(input), warn);
  const rawTanks = (Array.isArray(raw.tanks) ? raw.tanks as unknown[] : []).filter(isObj).slice(0, 2);
  if (!rawTanks.length) throw new SceneError('Not a scene file (no tank).');
  const tanks = rawTanks.map((t, i) => parseSetup(t, warn, rawTanks.length > 1 ? `Tank ${'AB'[i]}: ` : ''));
  for (const t of tanks) { t.render.edge = tanks[0].render.edge; t.render.pop = tanks[0].render.pop; } // app preferences, the same everywhere
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

/** Background pictures: at most 4, each side under one picture only, a picture's sides touching (else it keeps its first). */
function parseBgImages(v: unknown): BgImage[] {
  if (!Array.isArray(v)) return [];
  const taken = new Set<BgSide>(), out: BgImage[] = [];
  for (const b of v.filter(isObj).slice(0, 4)) {
    if (typeof b.img !== 'string' || !/^[a-z0-9]{1,24}$/.test(b.img)) continue;
    let sides = BG_SIDES.filter(k => Array.isArray(b.sides) && (b.sides as unknown[]).includes(k) && !taken.has(k));
    if (!sidesTouch(sides)) sides = sides.slice(0, 1);
    sides.forEach(k => taken.add(k));
    const fit = (['fill', 'fit', 'stretch', 'tile'] as const).find(f => f === b.fit) ?? 'fill';
    const scale = typeof b.scale === 'number' && Number.isFinite(b.scale) ? clamp(Math.round(b.scale), ...LIMITS.bgScale) : 50;
    out.push({ img: b.img, fit, sides, scale });
  }
  return out;
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
    const shape = pick(o.shape, ['rect', 'bow', 'round', 'poly', 'bowl', 'pie'] as const, 'rect'); // v8; older files: rect
    if (shape === 'rect') return T;
    return normTank({ ...T, shape, ...(shape === 'poly' ? { sides: num(o.sides, 6) } : {}), ...(shape === 'bow' ? { bowMin: num(o.bowMin, T.D * 0.75, 0, T.D) } : {}),
      ...(shape === 'bowl' ? { bowlFloor: num(o.bowlFloor, T.L * 0.6, 0, T.L), bowlTop: num(o.bowlTop, T.L * 0.6, 0, T.L) } : {}),
      ...(shape === 'pie' ? { pieDeg: num(o.pieDeg, 90, 45, 180) } : {}) });
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
    const base = getSpecies(f.species)!, sex = f.sex === 'f' && base.female ? 'f' as const : undefined, adult = fishTL({ sex }, base), tl = typeof f.tl === 'number' ? Math.round(num(f.tl, adult, adult * LIMITS.size[0], adult * LIMITS.size[1])) : adult;
    fish.push({
      id, species: f.species,
      x: num(f.x, tankA.L / 2, 0, tankA.L), y: num(f.y, tankA.H / 2, 0, tankA.H), depth: num(f.depth, tankA.D / 2, 0, tankA.D),
      yaw: num(f.yaw, 0, ...LIMITS.yaw), pitch: num(f.pitch, 0, ...LIMITS.tilt), roll: num(f.roll, 0, ...LIMITS.tilt),
      bend: num(f.bend, 0, ...LIMITS.bend),
      ...(getSpecies(f.species)!.surfaces ? { surface: pick(f.surface, getSpecies(f.species)!.surfaces!, 'floor') } : {}),
      ...(tl !== adult ? { tl } : {}),
      ...(sex ? { sex } : {}),
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
      edge: pick(r.edge, ['cutout', 'a2c'] as const, d.render.edge), grid: bool(r.grid, d.render.grid), rim: bool(r.rim, d.render.rim), edges: bool(r.edges, d.render.edges), beams: bool(r.beams, false), pop: num(r.pop, 0.15, 0, 1),
      bg: pick(r.bg, ['black', 'blue', 'gradient', 'grey', 'frosted', 'none'] as const, d.render.bg), glass,
      // added 2026-10-12 (no version bump); older files: the side the background then followed, the room wall's
      bgSides: Array.isArray(r.bgSides)
        ? BG_SIDES.filter(k => (r.bgSides as unknown[]).includes(k))
        : [bool(w.show, d.wall.show) && (w.side === 'left' || w.side === 'right' || w.side === 'peninsula') ? (w.side === 'left' ? 'left' : 'right') : 'back'],
      bgArc: Math.round(num(r.bgArc, 145, ...LIMITS.bgArc)),
      bgImages: parseBgImages(r.bgImages), // added 2026-10-14 (no version bump); older files: none
      glassType: pick(r.glassType, ['standard', 'lowiron'] as const, 'standard'),
    },
    light: {
      type: pick(l.type, ['flat', 'spot', 'tube', 'led'] as const, 'flat'), count: Math.round(num(l.count, 2, ...LIMITS.count)), rows: Math.round(num(l.rows, 1, ...LIMITS.rows)),
      // added 2026-10-09 (no version bump); older files: the old filled grid and 52° beam
      pattern: pick(l.pattern, ['grid', 'tri', 'fit'] as const, 'grid'), spacing: Math.round(num(l.spacing, 0, ...LIMITS.spacing)), cone: Math.round(num(l.cone, 52, ...LIMITS.cone)),
      bright: num(l.bright, 1, ...LIMITS.bright), kelvin: num(l.kelvin, 6500, ...LIMITS.kelvin), room: num(l.room, 0.15, ...LIMITS.room),
      height: num(l.height, 50, ...LIMITS.lampH), // added 2026-10-08; older files: the old fixed 50 mm
      // light output (added 2026-10-14, no version bump): kept only when present, so older files load unchanged
      ...(l.watts != null ? { watts: Math.round(num(l.watts, 0, ...LIMITS.watts) * 10) / 10 } : {}),
      ...(typeof l.tech === 'string' && (TECH_IDS as readonly string[]).includes(l.tech) ? { tech: l.tech as LightTech } : {}),
      ...(l.par != null ? { par: Math.round(num(l.par, 0, ...LIMITS.par)) } : {}),
      ...(l.mapUnit === 'par' || l.mapUnit === 'lux' ? { mapUnit: l.mapUnit } : {}),
      ...(l.mapStep != null ? { mapStep: Math.round(num(l.mapStep, 10, 5, 100) / 5) * 5 } : {}),
    },
    substrate: {
      show: bool(s.show, d.substrate.show), type: pick(s.type, ['gravel', 'pea', 'clown', 'blue', 'onyx', 'black', 'white', 'aragonite', 'coral', 'custom'] as const, 'gravel'),
      custom: (() => { // added 2026-10-13 (no version bump); older files: the default blend
        const c = (s.custom && typeof s.custom === 'object' ? s.custom : {}) as Record<string, unknown>, dc = d.substrate.custom;
        const hex = (v: unknown, f: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : f;
        return {
          grain: pick(c.grain, GRAINS, dc.grain), color: hex(c.color, dc.color),
          grain2: pick(c.grain2, ['none', ...GRAINS] as const, dc.grain2), color2: hex(c.color2, dc.color2),
          share: Math.round(num(c.share, dc.share, 5, 95)), mix: num(c.mix, dc.mix, 0, 1),
        };
      })(),
      fl: num(s.fl, d.substrate.fl, 0, subMax), fr: num(s.fr, d.substrate.fr, 0, subMax),
      bl: num(s.bl, d.substrate.bl, 0, subMax), br: num(s.br, d.substrate.br, 0, subMax),
    },
    layout: { id: pick(lay.id, LAYOUT_IDS, d.layout.id), seed: Math.round(num(lay.seed, 1, 1, 1e9)) },
    water: {
      on: bool(wa.on, true), level: num(wa.level, d.water.level, ...LIMITS.level), opacity: num(wa.opacity, d.water.opacity, ...LIMITS.opacity),
      color: typeof wa.color === 'string' && /^#[0-9a-f]{6}$/i.test(wa.color) ? wa.color.toLowerCase() : d.water.color,
      ...(bool(wa.salt, false) ? { salt: true } : {}),
    },
    terrain: (() => {
      const cols = Math.round(num(te.cols, d.terrain.cols, ...LIMITS.terrainCols)), rows = Math.round(num(te.rows, 0, 0, 25));
      const radial = te.radial === true, arc = radial && typeof te.arc === 'number' ? Math.round(clamp(te.arc, 45, 180)) : 0;
      const size = radial ? (rows >= 1 ? (arc ? pieSize(rows, arc) : radialSize(rows)) : -1) : rows >= 2 ? cols * rows : -1;
      const h = Array.isArray(te.h) && te.h.length === size && te.h.every(v => typeof v === 'number' && Number.isFinite(v))
        ? (te.h as number[]).map(v => clamp(v, 0, tankA.H * LIMITS.terrainMax)) : [];
      return h.length ? { on: bool(te.on, false), cols, rows, h, ...(radial ? { radial } : {}), ...(arc ? { arc } : {}) } : { on: false, cols, rows: 0, h: [] };
    })(),
    lid: pick(raw.lid, ['open', 'glass', 'hood'] as const, d.lid),
    stand: { // no `show` = a file older than stands: off (new tanks start with one on, audit #29)
      show: bool(st.show, false), height: num(st.height, d.stand.height, ...LIMITS.stand),
      finish: pick(st.finish, ['black', 'white', 'oak'] as const, d.stand.finish),
      style: pick(st.style, ['cabinet', 'frame', 'table', 'custom'] as const, d.stand.style),
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
      show: bool(w.show, d.wall.show), side: pick(w.side === 'peninsula' ? 'right' : w.side, ['back', 'left', 'right', 'corner'] as const, d.wall.side), // 'peninsula' (session 3) was the right end
      color: typeof w.color === 'string' && /^#[0-9a-f]{6}$/i.test(w.color) ? w.color.toLowerCase() : d.wall.color,
      ...(w.gap !== undefined ? { gap: num(w.gap, WALL_GAP, 0, WALL_GAP_MAX) } : {}),
      ...(w.height !== undefined ? { height: num(w.height, CEILING_H, CEILING_MIN, CEILING_MAX) } : {}),
    },
    fish,
    items: [],
  };
  setup.items = Array.isArray(raw.items) ? parseItems(raw.items, tankA, warn, setup) : starterItems(setup);
  // a grid saved before its tank's shape had its own kind (a pie slice before 2026-10-13 kept the rectangular grid):
  // resample the same surface onto the tank's grid, as changing the shape in the panel does
  const te2 = setup.terrain;
  if (te2.h.length && !sameGrid(te2, setup.tank)) setup.terrain = { ...sampleTerrain(setup, setup.tank, te2.cols), on: te2.on };
  keepInWater(setup); fitTable(setup);
  return setup;
}

function parseItems(raw: unknown[], T: Tank, warn: (m: string) => void, g: Ground): Item[] {
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
      yaw: Math.round(fin(o.yaw, 0)), pitch: Math.round(fin(o.pitch, 0)), tilt: Math.round(fin(o.tilt, 0)), size: fin(o.size, v.size),
      ...(typeof o.spread === 'number' && Number.isFinite(o.spread) ? { spread: o.spread } : {}),
      ...(typeof o.stems === 'number' && Number.isFinite(o.stems) ? { stems: o.stems } : {}),
    };
    clampItem(it, T, g); out.push(it);
  }
  if (bad) warn(`${bad} unknown aquascape items were skipped.`);
  if (raw.length > MAX_ITEMS) warn(`Only the first ${MAX_ITEMS} aquascape items were loaded.`);
  return out;
}

export const nextFishId = (s: TankSetup) => s.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
