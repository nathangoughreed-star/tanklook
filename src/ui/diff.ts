// What differs between two split tanks, for the viewport tabs (Nathan 2026-10-08). Dimension-like values show their
// numbers ("Stand 30″" vs "Stand 24″"); finer details only name each side ("Stocking A" vs "Stocking B",
// "Water tint A" vs "Water tint B"). Nothing different = no entries: the tanks are the same.
import { SUBSTRATES } from '../art/placeholder';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { LAYOUTS } from '../render/layouts';
import { fmtDims, fmtLen, glassThickness, waterY } from '../scene/physics';
import type { TankSetup, Units } from '../scene/types';

/** One differing setting: the text for tank A and for tank B. */
export type DiffItem = [a: string, b: string];

const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const LIGHTS = { flat: 'Flat light', spot: 'Spot lights', tube: 'Tube lights', led: 'LED array' } as const;
const LIDS = { open: 'Open top', glass: 'Glass lid', hood: 'Hood' } as const;
const WALLS = { back: 'Wall behind', left: 'Wall at left end', right: 'Wall at right end' } as const;

export function tankDiff(a: TankSetup, b: TankSetup, u: Units): DiffItem[] {
  const out: DiffItem[] = [];
  const len = (mm: number) => fmtLen(mm, u, mm >= 100 ? 0 : 1);
  /** Add an entry when the two settings differ and read differently; `f` renders each side. Settings, not derived values:
   * a size change alone does not list auto glass thickness or the depth of a full tank. */
  const add = <T>(x: T, y: T, f: (v: T, side: 'A' | 'B') => string) => {
    if (same(x, y)) return;
    const fa = f(x, 'A'), fb = f(y, 'B');
    if (fa !== fb || fa.endsWith(' A')) out.push([fa, fb]);
  };
  const named = (name: string) => (_: unknown, side: 'A' | 'B') => `${name} ${side}`;

  add(a.tank, b.tank, T => fmtDims(T, u).replace(' (L×H×D)', ''));
  add(a.render.glass, b.render.glass, (g, side) => `Glass ${glassThickness((side === 'A' ? a : b).tank, g)} mm${g === 'auto' ? ' (auto)' : ''}`);
  add(a.render.glassType, b.render.glassType, t => (t === 'lowiron' ? 'Low-iron glass' : 'Standard glass'));
  add(a.render.rim, b.render.rim, r => (r ? 'Rimmed' : 'Rimless'));
  add(a.lid, b.lid, l => LIDS[l]);
  add(a.render.bg, b.render.bg, bg => `Background: ${BACKGROUNDS[bg].label.toLowerCase()}`);
  add(a.render.grid, b.render.grid, g => (g ? 'Grid' : 'No grid'));

  // stand, room, person: details only when both have one
  add(a.stand.show, b.stand.show, s => (s ? 'Stand' : 'No stand'));
  if (a.stand.show && b.stand.show) {
    add(a.stand.height, b.stand.height, h => `Stand ${len(h)}`);
    add(a.stand.style, b.stand.style, s => (s === 'frame' ? 'Frame stand' : 'Cabinet stand'));
    add(a.stand.finish, b.stand.finish, f => `Stand: ${STAND_FINISHES[f].label.toLowerCase()}`);
  }
  add(a.wall.show, b.wall.show, w => (w ? 'Wall' : 'No wall'));
  if (a.wall.show && b.wall.show) {
    add(a.wall.side, b.wall.side, s => WALLS[s]);
    add(a.wall.color, b.wall.color, named('Wall colour'));
  }
  add(a.person.show, b.person.show, p => (p ? 'Person' : 'No person'));
  if (a.person.show && b.person.show) {
    add(a.person.height, b.person.height, h => `Person ${(h / 1000).toFixed(2)} m`);
    add(a.person.side, b.person.side, s => `Person at ${s}`);
  }

  // contents
  add(a.fish, b.fish, named('Stocking'));
  add(a.substrate.show ? a.substrate.type : 'bare', b.substrate.show ? b.substrate.type : 'bare',
    t => (t === 'bare' ? 'Bare bottom' : `Substrate: ${SUBSTRATES[t as keyof typeof SUBSTRATES].label.toLowerCase()}`));
  if (a.substrate.show && b.substrate.show && !a.terrain.on && !b.terrain.on) {
    const c = (t: TankSetup) => [t.substrate.fl, t.substrate.fr, t.substrate.bl, t.substrate.br];
    add(c(a), c(b), named('Substrate slope'));
  }
  add(a.terrain.on, b.terrain.on, on => (on ? 'Custom terrain' : 'No custom terrain'));
  if (a.terrain.on && b.terrain.on) add(a.terrain, b.terrain, named('Terrain'));
  add(a.layout.id, b.layout.id, id => `Layout: ${LAYOUTS[id].label.toLowerCase()}`);
  if (a.layout.id === b.layout.id && a.layout.id !== 'none') add(a.layout.seed, b.layout.seed, named('Arrangement'));

  // water
  add(a.water.on, b.water.on, on => (on ? 'Water' : 'Dry'));
  if (a.water.on && b.water.on) {
    add(a.water.level, b.water.level, (lv, side) => (lv >= 1 ? 'Water full' : `Water ${len(waterY((side === 'A' ? a : b).tank, lv))} deep`));
    add([a.water.color, a.water.opacity], [b.water.color, b.water.opacity], (_, side) => {
      const t = side === 'A' ? a : b;
      return t.water.opacity < 0.01 ? 'Clear water' : `Water tint ${side}`;
    });
  }

  // light
  add(a.light.type, b.light.type, t => LIGHTS[t]);
  if (a.light.type === b.light.type) {
    if (a.light.type === 'spot' || a.light.type === 'tube') add(a.light.count, b.light.count, n => `${n} ${a.light.type === 'tube' ? 'tube' : 'bulb'}${n > 1 ? 's' : ''}`);
    if (a.light.type !== 'flat' && a.lid !== 'hood' && b.lid !== 'hood') add(a.light.height, b.light.height, h => `Light ${len(h)} up`);
  }
  add(a.light.bright, b.light.bright, v => `Brightness ×${v.toFixed(2)}`);
  add(a.light.kelvin, b.light.kelvin, k => `${k} K`);
  add(a.light.room, b.light.room, v => `Room light ${v.toFixed(2)}`);

  // viewpoint (differs only while the cameras are unlocked)
  add(a.camera.dist, b.camera.dist, d => `Eye ${(d / 1000).toFixed(2)} m away`);
  add([a.camera.az, a.camera.el], [b.camera.az, b.camera.el], ([az, el]) =>
    az === 0 && el === 0 ? 'Straight on' : `View ${Math.abs(az)}° ${az < 0 ? 'left' : 'right'}${el ? `, ${el}° up` : ''}`);
  add(a.camera.zoom, b.camera.zoom, z => `Zoom ×${z.toFixed(2)}`);
  return out;
}
