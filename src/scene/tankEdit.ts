// The tank edit rules (UI2 §7 P1, 2026-11-13): what a size, shape, lid, door, rim, glass, table or setup-kind edit does to a
// tank setup. Plain functions on the scene data, no DOM; the old shell (ui/panels.ts) runs them inside store.edit, and the
// new shell's Tank section and custom tank maker will call the same ones.
import { breakNote, releaseProduct, type Held } from './integrated';
import { STYLE_KIND } from './items';
import { fitFixture, fixtureOf, TECHS, techOf } from './lightout';
import { hoodExists, hoodOf, hoodLight } from '../data/hoods';
import { clamp, fromUnit } from './physics';
import { applyKind, type SetupKind } from './pickerKind';
import { adaptToTank } from './reeval';
import { BOWL_DEFAULT, PIE_DEFAULT, shapeOf } from './shape';
import { sameGrid, sampleTerrain } from './terrain';
import type { DoorType, LidType, Scene, TableSettings, Tank, TankSetup, TankShape } from './types';
import { LIMITS } from './validate';

/** A change that breaks what the tank's product holds releases the product (scene/integrated.ts); the caller asked first. */
export function unhold(s: TankSetup, what: Held): void { if (breakNote(s, what)) releaseProduct(s); }

/** Hood and peninsula (left / right wall) ends exist for rectangles, bowfronts and curved fronts only (Nathan 2026-10-08). */
export const flatEnds = (T: Tank): boolean => ['rect', 'bow', 'arch'].includes(shapeOf(T));

/** What fits the setup to a new tank: by default scene/reeval's adaptToTank; the old shell passes ui/briefFeasibility's
 *  adaptForEdit, which does the same and also posts the "what changed" note. */
export type Adapt = (s: TankSetup, next: Tank, thin: boolean) => void;
const plainAdapt: Adapt = (s, next, thin) => { adaptToTank(s, next, { thin }); };

export interface TankEditOpts {
  /** The glass thickness a library pick brings (mm). */
  glass?: number;
  /** A library pick: sets the product (ui/tankPick.ts applyTankPick). Without it the edit releases a held size. */
  also?: (s: TankSetup) => void;
  /** Thin plants and post the stocking warning: true for a one-off edit, false while a slider drags (a coalesced edit). */
  thin: boolean;
  adapt?: Adapt;
}

/** Resize / reshape one tank setup from its own current tank (each edited tank of a split gets its own call, so only what
 *  was set changes). Fish and pieces keep their relative spot, the terrain is resampled into the new shape's grid, the
 *  substrate stays under half the height, and a shape without flat ends loses its hood and its side wall. */
export function applyTankEdit(s: TankSetup, next: (T: Tank) => Tank, o: TankEditOpts): void {
  if (o.also) o.also(s); else unhold(s, 'size');
  const T = next(s.tank);
  if (o.glass != null) s.render.glass = o.glass;
  (o.adapt ?? plainAdapt)(s, T, o.thin); // lane GS6: rescaleTank plus scaled hardscape, thinned plants and a stocking warning; never a regenerated scene
  // round tanks and bowls shape their terrain on rings, a pie slice on arcs, any other on a rectangular grid: resample into the new kind
  const te = s.terrain;
  if (te.h.length && !sameGrid(te, s.tank)) s.terrain = { ...sampleTerrain(s, s.tank, te.cols), on: te.on };
  const max = T.H * 0.5;
  for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = Math.min(s.substrate[k], max);
  if (!flatEnds(s.tank)) { if (s.lid === 'hood') s.lid = 'glass'; if (s.wall.side === 'left' || s.wall.side === 'right') s.wall.side = 'back'; }
}

/** Each shape keeps its own length / depth for a visit: a round or pie tank derives one from the other, so going back to a
 *  rectangle brings its own size back (audit #5); leaving a bowl brings the height back too, since a bowl derives it. */
export type ShapeMemory = Map<TankShape, Pick<Tank, 'L' | 'H' | 'D'>>;
export const shapeMemory = (): ShapeMemory => new Map();

/** A shape pick: remembers the current tank's size under its shape and returns the edit to apply to each edited tank.
 *  `current` is the active tank (the one whose size is remembered and whose shape is left). */
export function reshape(mem: ShapeMemory, current: Tank, shape: TankShape): (T: Tank) => Tank {
  const from = current.shape ?? 'rect', back = mem.get(shape);
  mem.set(from, { L: current.L, H: current.H, D: current.D });
  return T => ({
    ...T, ...(back ? { L: back.L, D: back.D, ...(from === 'bowl' ? { H: back.H } : {}) } : {}), shape,
    sides: T.sides ?? 6, bowMin: T.bowMin ?? T.D * 0.7, bowlFloor: T.bowlFloor ?? T.L * BOWL_DEFAULT,
    bowlTop: T.bowlTop ?? T.L * BOWL_DEFAULT, pieDeg: T.pieDeg ?? PIE_DEFAULT,
  });
}

/** A typed tank side (in the scene's units): null for nothing usable (not a number, or 0 and below), else the size in mm
 *  inside LIMITS and whether it had to be clamped (an out-of-range value is not taken silently, audit #28). */
export function sideFromInput(v: number, units: Scene['units']): { mm: number; clamped: boolean } | null {
  if (!Number.isFinite(v) || v <= 0) return null;
  const want = fromUnit(v, units), mm = clamp(want, LIMITS.tankMin, LIMITS.tankMax);
  return { mm, clamped: mm !== want };
}
/** A tank side's arrow step in inches: half inches under 18", whole inches from there (going down from 18: half; Nathan 2026-10-21). */
export const inchStep = (v: number, dir: number): number => (dir > 0 ? v < 18 : v <= 18) ? 0.5 : 1;

/** A light's colour temperature back inside its technology's range (its default when outside). */
export function fitK(l: TankSetup['light']): void { const [a, b, d] = TECHS[techOf(l)].k; if (l.kelvin < a || l.kelvin > b) l.kelvin = d; }

/** Rim on or off (the caller asked the product gate for 'rim'). */
export function setRim(s: TankSetup, on: boolean): void { unhold(s, 'rim'); s.render.rim = on; }

/** A lid pick (the caller asked the product gate for 'lid'). A hood has no room for a metal halide pendant (too hot): it becomes LED. */
export function setLid(s: TankSetup, lid: LidType): void {
  unhold(s, 'lid'); s.lid = lid;
  if (lid === 'hood') { const h = hoodOf(s); if (h) { s.hoodProduct = h.id; s.light = hoodLight(s, h); } } else delete s.hoodProduct; // HD1: the hood's own light (type, watts) is the scene's light
  if (lid === 'hood' && fixtureOf(s.light) === 'pendant') { s.light.tech = 'led-white'; fitK(s.light); fitFixture(s.light, s.tank, true); }
}
/** Whether a lid button is off: a kit that keeps its own lid locks all of them, and a hood needs flat ends and a product sold for the size (HD1). */
export const lidLocked = (T: Tank, lockedByKit: boolean, lid: LidType): boolean => lockedByKit || (lid === 'hood' && (!flatEnds(T) || !hoodExists(T)));

export type DoorKind = 'none' | DoorType;
export function setDoors(s: TankSetup, d: DoorKind): void { if (d === 'none') delete s.doors; else s.doors = d; }
/** Front doors: rectangles only, and not on a product that holds its own. "None" is always open. */
export const doorLocked = (s: TankSetup, d: DoorKind, lockedByKit: boolean): boolean => d !== 'none' && (shapeOf(s.tank) !== 'rect' || lockedByKit);
/** The left / right wall needs a flat end on the tank. */
export const sideWallLocked = (T: Tank): boolean => !flatEnds(T);

/** Glass thickness: 'auto' (by height) or a thickness in mm. */
export function setGlass(s: TankSetup, v: string): void { s.render.glass = v === 'auto' ? 'auto' : +v; }

/** A table-stand edit: the table style goes on (a custom stand keeps its style) and the stand shows. store.update -> fitTable
 *  keeps the tank on the top afterwards. */
export function editTable(s: TankSetup, fn: (tb: TableSettings, s: TankSetup) => void): void {
  fn(s.stand.table, s); if (s.stand.style !== 'custom') s.stand.style = 'table'; s.stand.show = true; s.stand.need = 'added';
}
/** A round top is as wide as it is deep: the larger side. */
export function tableRound(tb: TableSettings): void { tb.shape = 'round'; tb.L = tb.D = Math.max(tb.L, tb.D); }
/** The top's length; a round top keeps its depth equal. */
export function tableLength(tb: TableSettings, v: number): void { tb.L = v; if (tb.shape === 'round') tb.D = tb.L; }

/** Clear water of each type: [colour, opacity]. */
export const FRESH_CLEAR: [string, number] = ['#7fb8a8', 0], SALT_CLEAR: [string, number] = ['#8ec9ec', 0];
/** A setup kind (freshwater, saltwater, terrarium, ...): the other type's clear water becomes this type's (as setSalt does),
 *  and a layout style of the other water is cleared (the reef starter is salt only). The caller skips it when the kind is the same. */
export function applySetupKind(s: TankSetup, k: SetupKind): void {
  const was = !!s.water.salt;
  applyKind(s, k);
  if (was !== (k === 'saltwater') && k !== 'terrarium') {
    const [c, o] = k === 'saltwater' ? FRESH_CLEAR : SALT_CLEAR;
    if (s.water.color === c && s.water.opacity === o) [s.water.color, s.water.opacity] = k === 'saltwater' ? SALT_CLEAR : FRESH_CLEAR;
    if (STYLE_KIND[s.layout.id] === (k === 'saltwater' ? 'fresh' : 'salt')) s.layout = { ...s.layout, id: 'none' };
  }
}
