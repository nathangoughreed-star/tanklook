// What differs between two split tanks, for the viewport tabs (Nathan 2026-10-08). Dimension-like values show their
// numbers ("Stand 30″" vs "Stand 24″"); finer details only name each side ("Stocking A" vs "Stocking B",
// "Water tint A" vs "Water tint B"). Nothing different = no entries: the tanks are the same.
import { SUBSTRATES } from '../art/placeholder';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { LAYOUTS } from '../render/layouts';
import { fmtDims, fmtLen, glassThickness, rescaleTank, waterY } from '../scene/physics';
import { setWaterLevel } from '../scene/water';
import type { TankSetup, Units } from '../scene/types';

/** Make tank `to` match tank `from` in one setting. */
export type Match = (to: TankSetup, from: TankSetup) => void;
/** One differing setting: the text for tank A and for tank B, and how to make one side match the other. */
export type DiffItem = [a: string, b: string, match: Match];

const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const LIGHTS = { flat: 'Flat light', spot: 'Spot lights', tube: 'Tube lights', led: 'LED array' } as const;
const LIDS = { open: 'Open top', glass: 'Glass lid', hood: 'Hood' } as const;
const WALLS = { back: 'Wall behind', left: 'Wall at left end', right: 'Wall at right end' } as const;

/** Copy settings by path ("light.bright") from one tank to the other. */
const copyPaths = (paths: string[]): Match => (to, from) => {
  for (const p of paths) {
    const k = p.split('.'), last = k.pop()!;
    const dst = k.reduce((o: any, x) => o[x], to), src = k.reduce((o: any, x) => o[x], from); // eslint-disable-line @typescript-eslint/no-explicit-any
    dst[last] = structuredClone(src[last]);
  }
};

export function tankDiff(a: TankSetup, b: TankSetup, u: Units): DiffItem[] {
  const out: DiffItem[] = [];
  const len = (mm: number) => fmtLen(mm, u, mm >= 100 ? 0 : 1);
  /** Add an entry when the two settings differ and read differently; `f` renders each side. Settings, not derived values:
   * a size change alone does not list auto glass thickness or the depth of a full tank.
   * `m` makes one side match: setting paths to copy ("light.bright"), or a function. */
  const add = <T>(x: T, y: T, f: (v: T, side: 'A' | 'B') => string, m: string[] | Match) => {
    if (same(x, y)) return;
    const fa = f(x, 'A'), fb = f(y, 'B');
    if (fa !== fb || fa.endsWith(' A')) out.push([fa, fb, typeof m === 'function' ? m : copyPaths(m)]);
  };
  const named = (name: string) => (_: unknown, side: 'A' | 'B') => `${name} ${side}`;

  add(a.tank, b.tank, T => fmtDims(T, u).replace(' (L×H×D)', ''), (to, from) => rescaleTank(to, from.tank));
  add(a.render.glass, b.render.glass, (g, side) => `Glass ${glassThickness((side === 'A' ? a : b).tank, g)} mm${g === 'auto' ? ' (auto)' : ''}`, ['render.glass']);
  add(a.render.glassType, b.render.glassType, t => (t === 'lowiron' ? 'Low-iron glass' : 'Standard glass'), ['render.glassType']);
  add(a.render.rim, b.render.rim, r => (r ? 'Rimmed' : 'Rimless'), ['render.rim']);
  add(a.lid, b.lid, l => LIDS[l], ['lid']);
  add(a.render.bg, b.render.bg, bg => `Background: ${BACKGROUNDS[bg].label.toLowerCase()}`, ['render.bg']);
  add(a.render.grid, b.render.grid, g => (g ? 'Grid' : 'No grid'), ['render.grid']);

  // stand, room, person: details only when both have one
  add(a.stand.show, b.stand.show, s => (s ? 'Stand' : 'No stand'), ['stand.show']);
  if (a.stand.show && b.stand.show) {
    add(a.stand.height, b.stand.height, h => `Stand ${len(h)}`, ['stand.height']);
    add(a.stand.style, b.stand.style, s => (s === 'frame' ? 'Frame stand' : s === 'table' ? 'Table' : 'Cabinet stand'), ['stand.style', 'stand.table']);
    if (a.stand.style === 'table' && b.stand.style === 'table') {
      const ta = a.stand.table, tb = b.stand.table;
      add({ sh: ta.shape, L: ta.L, D: ta.D }, { sh: tb.shape, L: tb.L, D: tb.D }, ({ sh, L, D }) => (sh === 'round' ? `Round table ${len(L)}` : `Table ${len(L)} × ${len(D)}`), ['stand.table']);
      add([ta.x, ta.z], [tb.x, tb.z], named('Tank placement'), (to, from) => { to.stand.table.x = from.stand.table.x; to.stand.table.z = from.stand.table.z; });
    }
    add(a.stand.finish, b.stand.finish, f => `Stand: ${STAND_FINISHES[f].label.toLowerCase()}`, ['stand.finish']);
  }
  add(a.wall.show, b.wall.show, w => (w ? 'Wall' : 'No wall'), ['wall.show']);
  if (a.wall.show && b.wall.show) {
    add(a.wall.side, b.wall.side, s => WALLS[s], ['wall.side']);
    add(a.wall.color, b.wall.color, named('Wall colour'), ['wall.color']);
  }
  add(a.person.show, b.person.show, p => (p ? 'Person' : 'No person'), ['person.show']);
  if (a.person.show && b.person.show) {
    add(a.person.height, b.person.height, h => `Person ${(h / 1000).toFixed(2)} m`, ['person.height']);
    add(a.person.side, b.person.side, s => `Person at ${s}`, ['person.side']);
  }

  // contents
  // positions relative to the tank (rescaleTank moves fish with a resize), rounded so float drift is not a difference
  const stock = (t: TankSetup) => t.fish.map(f => ({ ...f, x: +(f.x / t.tank.L).toFixed(4), y: +(f.y / t.tank.H).toFixed(4), depth: +(f.depth / t.tank.D).toFixed(4) }));
  add(stock(a), stock(b), named('Stocking'), (to, from) => {
    to.fish = from.fish.map(f => ({ ...structuredClone(f), x: f.x * to.tank.L / from.tank.L, y: f.y * to.tank.H / from.tank.H, depth: f.depth * to.tank.D / from.tank.D }));
  });
  add(a.substrate.show ? a.substrate.type : 'bare', b.substrate.show ? b.substrate.type : 'bare',
    t => (t === 'bare' ? 'Bare bottom' : `Substrate: ${SUBSTRATES[t as keyof typeof SUBSTRATES].label.toLowerCase()}`), ['substrate.show', 'substrate.type']);
  if (a.substrate.show && b.substrate.show && !a.terrain.on && !b.terrain.on) {
    const c = (t: TankSetup) => [t.substrate.fl, t.substrate.fr, t.substrate.bl, t.substrate.br];
    add(c(a), c(b), named('Substrate slope'), ['substrate.fl', 'substrate.fr', 'substrate.bl', 'substrate.br']);
  }
  add(a.terrain.on, b.terrain.on, on => (on ? 'Custom terrain' : 'No custom terrain'), ['terrain']);
  if (a.terrain.on && b.terrain.on) add(a.terrain, b.terrain, named('Terrain'), ['terrain']);
  add(a.layout.id, b.layout.id, id => `Layout: ${LAYOUTS[id].label.toLowerCase()}`, ['layout']);
  if (a.layout.id === b.layout.id && a.layout.id !== 'none') add(a.layout.seed, b.layout.seed, named('Arrangement'), ['layout.seed']);

  // water
  add(a.water.on, b.water.on, on => (on ? 'Water' : 'Dry'), ['water.on']);
  if (a.water.on && b.water.on) {
    add(a.water.level, b.water.level, (lv, side) => (lv >= 1 ? 'Water full' : `Water ${len(waterY((side === 'A' ? a : b).tank, lv))} deep`), (to, from) => setWaterLevel(to, from.water.level));
    add([a.water.color, a.water.opacity], [b.water.color, b.water.opacity], (_, side) => {
      const t = side === 'A' ? a : b;
      return t.water.opacity < 0.01 ? 'Clear water' : `Water tint ${side}`;
    }, ['water.color', 'water.opacity']);
  }

  // light
  add(a.light.type, b.light.type, t => LIGHTS[t], ['light.type']);
  if (a.light.type === b.light.type) {
    if (a.light.type === 'spot' || a.light.type === 'tube') add(a.light.count, b.light.count, n => `${n} ${a.light.type === 'tube' ? 'tube' : 'bulb'}${n > 1 ? 's' : ''}`, ['light.count']);
    if (a.light.type === 'spot') add(a.light.rows, b.light.rows, r => `${r} row${r > 1 ? 's' : ''} of bulbs`, ['light.rows']);
    if (a.light.type !== 'flat' && a.lid !== 'hood' && b.lid !== 'hood') add(a.light.height, b.light.height, h => `Light ${len(h)} up`, ['light.height']);
  }
  add(a.light.bright, b.light.bright, v => `Brightness ×${v.toFixed(2)}`, ['light.bright']);
  add(a.light.kelvin, b.light.kelvin, k => `${k} K`, ['light.kelvin']);
  add(a.light.room, b.light.room, v => `Room light ${v.toFixed(2)}`, ['light.room']);

  // viewpoint (differs only while the cameras are unlocked)
  add(a.camera.dist, b.camera.dist, d => `Eye ${(d / 1000).toFixed(2)} m away`, ['camera.dist']);
  add([a.camera.az, a.camera.el], [b.camera.az, b.camera.el], ([az, el]) =>
    (az === 0 ? 'Straight on' : `View ${Math.abs(az)}° ${az < 0 ? 'left' : 'right'}`) + (el ? `, ${el}° up` : ''), ['camera.az', 'camera.el']);
  add(a.camera.zoom, b.camera.zoom, z => `Zoom ×${z.toFixed(2)}`, ['camera.zoom']);
  return out;
}
