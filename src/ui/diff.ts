// What differs between two split tanks, for the viewport tabs (Nathan 2026-10-08). Dimension-like values show their
// numbers ("Stand 30″" vs "Stand 24″"); finer details only name each side ("Stocking A" vs "Stocking B",
// "Water tint A" vs "Water tint B"). Nothing different = no entries: the tanks are the same.
import { SUBSTRATES, blendLabel } from '../art/placeholder';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { BACKDROPS } from '../render/backdrop';
import { fmtSize, fmtLen, glassThickness, rescaleTank, waterY } from '../scene/physics';
import { FIXTURES, TECHS, fixtureOf, mountOf, techOf, wattsOf } from '../scene/lightout';
import { shapeOf } from '../scene/shape';
import { setWaterLevel } from '../scene/water';
import type { TankSetup, Units } from '../scene/types';
import { productLabel } from '../scene/integrated';

/** Make tank `to` match tank `from` in one setting. */
export type Match = (to: TankSetup, from: TankSetup) => void;
/** One differing setting: the text for tank A and for tank B, and how to make one side match the other. */
export type DiffItem = [a: string, b: string, match: Match];

const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const LIDS = { open: 'Open top', glass: 'Glass lid', hood: 'Hood', mesh: 'Mesh lid' } as const;
const WALLS = { back: 'Wall behind', left: 'Wall at left end', right: 'Wall at right end', corner: 'Room corner' } as const;

/** Copy settings by path ("light.bright") from one tank to the other. */
const copyPaths = (paths: string[]): Match => (to, from) => {
  for (const p of paths) {
    const k = p.split('.'), last = k.pop()!;
    const dst = k.reduce((o: any, x) => o[x], to), src = k.reduce((o: any, x) => o[x], from); // eslint-disable-line @typescript-eslint/no-explicit-any
    dst[last] = structuredClone(src[last]);
  }
};

// Compare (lane GV7): a compromise opened beside another style shows the money and care first: the limit that was broken, then set-up / a month / care where they differ.
// The figures were priced when Compare was pressed, so they show only while both tanks are still as they were opened (`sigOf`); an edit to either drops them.
export interface Totals { startupUsd: number; monthlyUsd: number; minPerWeek: number }
export type CompareLimit = 'startup' | 'monthly' | 'care';
interface Compare { rows: [string, string][]; sigs: [string, string] }
let compare: Compare | undefined;
/** What a compare's figures hold for: the tank's size, its animals and its scape. */
export const sigOf = (t: TankSetup) => JSON.stringify([t.tank.L, t.tank.D, t.tank.H, t.fish.map(f => f.species).sort(), t.items.map(i => i.variant).sort()]);
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
/** Rows for two priced tanks: the broken limit first (with the bound), then each figure that differs. */
export function compareRows(a: Totals, b: Totals, lead?: CompareLimit, bound?: number): [string, string][] {
  const defs: [CompareLimit, (t: Totals) => string, (n: number) => string][] = [
    ['startup', t => `Set-up ${money(t.startupUsd)}`, n => `limit ${money(n)}`],
    ['monthly', t => `${money(t.monthlyUsd)} a month`, n => `limit ${money(n)}`],
    ['care', t => `${Math.round(t.minPerWeek)} min a week`, n => `limit ${n} min`]];
  const rows: [string, string][] = [];
  for (const [k, f, lim] of [...defs.filter(d => d[0] === lead), ...defs.filter(d => d[0] !== lead)]) {
    const x = f(a), y = f(b);
    if (k === lead && bound !== undefined) rows.push([`${x} (${lim(bound)})`, `${y} (${lim(bound)})`]);
    else if (x !== y) rows.push([x, y]);
  }
  return rows;
}
/** Show `rows` first on the split tabs while tanks A and B are still `a` and `b` (undefined clears). */
export function setCompare(a?: TankSetup, b?: TankSetup, rows: [string, string][] = []) { compare = a && b ? { rows, sigs: [sigOf(a), sigOf(b)] } : undefined; }

export function tankDiff(a: TankSetup, b: TankSetup, u: Units): DiffItem[] {
  const out: DiffItem[] = [];
  // the compare's figures first (lane GV7); matching one takes the other tank whole
  if (compare && compare.sigs[0] === sigOf(a) && compare.sigs[1] === sigOf(b)) for (const r of compare.rows) out.push([r[0], r[1], (to, from) => { Object.assign(to, structuredClone(from)); }]);
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

  add(a.tank, b.tank, T => fmtSize(T, u), (to, from) => rescaleTank(to, from.tank));
  // the product each tank is (2026-10-26): matching takes the other's size, product and what the product holds
  add(productLabel(a), productLabel(b), l => l, (to, from) => {
    rescaleTank(to, from.tank); to.render.rim = from.render.rim;
    if (from.product) to.product = structuredClone(from.product); else delete to.product;
    if (from.integrated) to.integrated = structuredClone(from.integrated); else delete to.integrated;
  });
  add(a.render.glass, b.render.glass, (g, side) => `Glass ${glassThickness((side === 'A' ? a : b).tank, g)} mm${g === 'auto' ? ' (auto)' : ''}`, ['render.glass']);
  add(a.render.glassType, b.render.glassType, t => (t === 'lowiron' ? 'Low-iron glass' : 'Standard glass'), ['render.glassType']);
  add(a.render.rim, b.render.rim, r => (r ? 'Rimmed' : 'Rimless'), ['render.rim']);
  add(a.render.edges, b.render.edges, e => (e ? 'Glass edges shown' : 'Glass edges hidden'), ['render.edges']);
  add(a.render.beams, b.render.beams, e => (e ? 'Light beams shown' : 'Light beams hidden'), ['render.beams']);
  add(a.lid, b.lid, l => LIDS[l], ['lid']);
  add(a.render.bg, b.render.bg, bg => `Background: ${BACKGROUNDS[bg].label.toLowerCase()}`, ['render.bg']);
  const sidesTxt = (b: string[]) => (b.length ? ['back', 'left', 'right', 'front'].filter(k => b.includes(k)).join(' + ') : 'no sides');
  add(a.render.bgImages, b.render.bgImages, v => (v.length ? `${v.length} background picture${v.length > 1 ? 's' : ''}` : 'No background pictures'), ['render.bgImages']);
  if (a.render.bg !== 'none' && b.render.bg !== 'none') {
    add(a.render.bgSides, b.render.bgSides, v => `Background on ${sidesTxt(v)}`, ['render.bgSides']);
    if (shapeOf(a.tank) === 'round' && shapeOf(b.tank) === 'round') add(a.render.bgArc, b.render.bgArc, v => `Background arc ${v}°`, ['render.bgArc']);
  }
  add(a.backdrop, b.backdrop, v => (v.kind === 'none' ? 'No 3D wall' : `3D wall: ${BACKDROPS[v.kind].toLowerCase()}`), ['backdrop']);
  add(a.render.grid, b.render.grid, g => (g ? 'Grid' : 'No grid'), ['render.grid']);

  // stand, room, person: details only when both have one
  add(a.stand.show, b.stand.show, s => (s ? 'Stand' : 'No stand'), ['stand.show']);
  if (a.stand.show && b.stand.show) {
    add(a.stand.height, b.stand.height, h => `Stand ${len(h)}`, ['stand.height']);
    add(a.stand.style, b.stand.style, s => (s === 'frame' ? 'Frame stand' : s === 'table' ? 'Table' : s === 'custom' ? 'Custom-size stand' : 'Cabinet stand'), ['stand.style', 'stand.table']);
    if (a.stand.style === b.stand.style && (a.stand.style === 'table' || a.stand.style === 'custom')) {
      const ta = a.stand.table, tb = b.stand.table, w = a.stand.style === 'custom' ? 'Stand' : 'Table';
      add({ sh: ta.shape, L: ta.L, D: ta.D }, { sh: tb.shape, L: tb.L, D: tb.D }, ({ sh, L, D }) => (sh === 'round' ? `Round ${w.toLowerCase()} ${len(L)}` : `${w} ${len(L)} × ${len(D)}`), ['stand.table']);
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
  // stocking = how many of each species; where the fish sit and how they pose is not a difference (Nathan 2026-10-09)
  const stock = (t: TankSetup) => {
    const n: Record<string, number> = {};
    for (const f of t.fish) n[f.species] = (n[f.species] ?? 0) + 1;
    return Object.keys(n).sort().map(s => [s, n[s]]);
  };
  add(stock(a), stock(b), named('Stocking'), (to, from) => {
    to.fish = from.fish.map(f => ({ ...structuredClone(f), x: f.x * to.tank.L / from.tank.L, y: f.y * to.tank.H / from.tank.H, depth: f.depth * to.tank.D / from.tank.D }));
  });
  const subOf = (t: TankSetup) => !t.substrate.show ? 'bare' : t.substrate.type === 'custom' ? blendLabel(t.substrate.custom) : SUBSTRATES[t.substrate.type].label;
  add(subOf(a), subOf(b), t => (t === 'bare' ? 'Bare bottom' : `Substrate: ${t.toLowerCase()}`), ['substrate.show', 'substrate.type', 'substrate.custom']);
  if (a.substrate.show && b.substrate.show && !a.terrain.on && !b.terrain.on) {
    const c = (t: TankSetup) => [t.substrate.fl, t.substrate.fr, t.substrate.bl, t.substrate.br];
    add(c(a), c(b), named('Substrate slope'), ['substrate.fl', 'substrate.fr', 'substrate.bl', 'substrate.br']);
  }
  add(a.terrain.on, b.terrain.on, on => (on ? 'Custom terrain' : 'No custom terrain'), ['terrain']);
  if (a.terrain.on && b.terrain.on) add(a.terrain, b.terrain, named('Terrain'), ['terrain']);
  // aquascape: which pieces and plants (by variant); where they sit is the arrangement. A swamp's land is its terrain.
  const scape = (t: TankSetup) => { const n: Record<string, number> = {}; for (const it of t.items) n[it.variant] = (n[it.variant] ?? 0) + 1; return Object.keys(n).sort().map(k => [k, n[k]]); };
  const copyScape: Match = (to, from) => {
    to.layout = { ...from.layout };
    to.items = from.items.map(it => ({ ...it, x: it.x * to.tank.L / from.tank.L, depth: it.depth * to.tank.D / from.tank.D }));
  };
  add(scape(a), scape(b), named('Aquascape'), copyScape);
  // positions relative to the tank (to 1 %), so resizing a tank alone is not a new arrangement
  const placed = (t: TankSetup) => t.items.map(it => ({ ...it, x: Math.round(it.x / t.tank.L * 100), depth: Math.round(it.depth / t.tank.D * 100), lift: Math.round(it.lift) }));
  if (same(scape(a), scape(b))) add(placed(a), placed(b), named('Arrangement'), copyScape);

  // water
  add(a.water.on, b.water.on, on => (on ? 'Water' : 'Dry'), ['water.on']);
  if (a.water.on && b.water.on) {
    add(!!a.water.salt, !!b.water.salt, salt => (salt ? 'Saltwater' : 'Freshwater'), ['water.salt']);
    add(a.water.level, b.water.level, (lv, side) => (lv >= 1 ? 'Water full' : `Water ${len(waterY((side === 'A' ? a : b).tank, lv))} deep`), (to, from) => setWaterLevel(to, from.water.level));
    add([a.water.color, a.water.opacity], [b.water.color, b.water.opacity], (_, side) => {
      const t = side === 'A' ? a : b;
      return t.water.opacity < 0.01 ? 'Clear water' : `Water tint ${side}`;
    }, ['water.color', 'water.opacity']);
  }

  // light
  add(fixtureOf(a.light), fixtureOf(b.light), f => FIXTURES[f].label, ['light.type', 'light.tech']);
  if (a.light.type === b.light.type) {
    if (a.light.type === 'spot' || a.light.type === 'tube') add(a.light.count, b.light.count, n => `${n} ${a.light.type === 'tube' ? 'tube' : 'bulb'}${n > 1 ? 's' : ''}`, ['light.count']);
    if (a.light.type === 'spot') {
      add(a.light.rows, b.light.rows, r => `${r} row${r > 1 ? 's' : ''} of bulbs`, ['light.rows']);
      add(a.light.pattern, b.light.pattern, p => p === 'tri' ? 'Triangular bulb pattern' : p === 'fit' ? 'Bulbs placed to fit the tank' : 'Grid bulb pattern', ['light.pattern']);
      add(a.light.spacing, b.light.spacing, v => v ? `Lights ${len(v)} apart` : 'Lights spread to fit', ['light.spacing']);
      add(a.light.cone, b.light.cone, v => `${v}° beam`, ['light.cone']);
    }
    if (a.light.type !== 'flat' && a.lid !== 'hood' && b.lid !== 'hood') add(a.light.height, b.light.height, h => `Light ${len(h)} up`, ['light.height']);
    if (a.light.type !== 'flat' && a.lid !== 'hood' && b.lid !== 'hood') add(mountOf(a.light), mountOf(b.light), m => m === 'legs' ? 'Light on legs' : 'Light hung from the ceiling', ['light.mount']);
    if ((a.light.type === 'tube' || a.light.type === 'led') && a.lid !== 'hood' && b.lid !== 'hood') add(a.light.pos ?? 0, b.light.pos ?? 0, v => (v ? `Light ${len(Math.abs(v))} ${v > 0 ? 'back' : 'forward'}` : 'Light centred front to back'), ['light.pos']);
    if (a.light.type !== 'flat') { // light output (lane K)
      const wa = wattsOf(a), wb = wattsOf(b);
      add(wa, wb, w => (w ? `${w} W light` : 'Light power not set'), ['light.watts', 'light.bulbW', 'light.count']);
      if (wa && wb) {
        add(techOf(a.light), techOf(b.light), t => TECHS[t].label, ['light.tech']);
        add(a.light.par ?? 0, b.light.par ?? 0, v => (v ? `Measured PAR ${v} µmol` : 'PAR estimated'), ['light.par']);
      }
    }
  }
  add(a.light.bright, b.light.bright, v => `${a.light.watts && b.light.watts ? 'Exposure' : 'Brightness'} ×${v.toFixed(2)}`, ['light.bright']);
  add(a.light.kelvin, b.light.kelvin, k => `${k} K`, ['light.kelvin']);
  add(a.light.room, b.light.room, v => `Room light ${v.toFixed(2)}`, ['light.room']);

  // viewpoint (differs only while the cameras are unlocked)
  add(a.camera.dist, b.camera.dist, d => `Eye ${(d / 1000).toFixed(2)} m away`, ['camera.dist']);
  add([a.camera.az, a.camera.el], [b.camera.az, b.camera.el], ([az, el]) =>
    (az === 0 ? 'Straight on' : `View ${Math.abs(az)}° ${az < 0 ? 'left' : 'right'}`) + (el ? `, ${el}° up` : ''), ['camera.az', 'camera.el']);
  add(a.camera.zoom, b.camera.zoom, z => `Zoom ×${z.toFixed(2)}`, ['camera.zoom']);
  return out;
}
