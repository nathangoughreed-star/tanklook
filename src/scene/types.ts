// Scene data: the single source of truth. All lengths in mm, all angles in degrees.
// Coordinates: x along the tank length 0..L, y up from the tank floor 0..H, depth = mm behind the front glass 0..D.
// Tank L/H/D are INTERIOR dimensions; glass is added outside. Fish positions live in their own tank's space.
// Split tanks (scene v7): up to two fully independent setups, each with its own contents, room and camera.

export const SCENE_VERSION = 7;

export type Units = 'in' | 'cm';
export type EdgeMode = 'cutout' | 'a2c';
export type Background = 'black' | 'blue' | 'gradient' | 'grey' | 'frosted' | 'none';
export type GlassType = 'standard' | 'lowiron';
export type LightType = 'flat' | 'spot' | 'tube' | 'led';
export type SubstrateType = 'gravel' | 'black' | 'white';

export interface Tank { L: number; H: number; D: number }

export interface Fish {
  id: number;
  species: string;
  x: number;
  y: number;
  depth: number;
  yaw: number;
  pitch: number;
  roll: number;
  bend: number; // -1..1, body curve
  /** Custom total length, mm (juveniles, or a big individual). Absent = the species' adult length. */
  tl?: number;
  /** Snails only: the surface it clings to. On glass, yaw is its heading within the pane. */
  surface?: Surface;
}

/** Where a snail sits: the substrate, or the inside of one of the four glass panes. */
export type Surface = 'floor' | 'front' | 'back' | 'left' | 'right';

export interface CameraSettings {
  dist: number; // eye to centre of the front glass, mm; identical for every tank
  az: number;   // left/right orbit, degrees
  el: number;   // from above, degrees
  zoom: number; // field-of-view crop only; never changes perspective
}

export interface RenderSettings {
  edge: EdgeMode;
  grid: boolean;
  rim: boolean;
  bg: Background;
  glass: 'auto' | number; // mm, or auto by interior height
  glassType: GlassType;
}

export interface LightSettings {
  type: LightType;
  count: number;
  /** Spot lights only: rows front to back, so the bulbs form a count × rows grid (added 2026-10-08; older files: 1). */
  rows: number;
  bright: number;
  kelvin: number;
  room: number;
  /** Fixture height above the top of the tank (mm). Higher = dimmer, more even, more spill into the room. Ignored with a hood. */
  height: number;
}

export interface SubstrateSettings {
  show: boolean;
  type: SubstrateType;
  fl: number; fr: number; bl: number; br: number; // depth at each corner, mm
}

/**
 * Custom terrain: a cols x rows grid of ground heights (mm above the tank floor, Tank A) spread evenly over the
 * floor, corners included, with a smooth curve through every point. When on, it replaces the substrate's corner
 * slopes and the swamp land. Heights are physical (like the substrate).
 */
export interface TerrainSettings { on: boolean; cols: number; rows: number; h: number[] }

/** Preset aquascape (rocks, wood, plants), generated from the tank size and a seed; not hand-placed. */
export type LayoutId = 'none' | 'stones' | 'driftwood' | 'planted' | 'iwagumi' | 'swamp';
export interface LayoutSettings { id: LayoutId; seed: number }

/**
 * Water: level as a fraction of a full tank (1 = full, i.e. WATERLINE_GAP below the interior top), so a resized tank
 * keeps the same fill. Colour tints what is seen through the water; opacity = how much of that colour
 * shows after 300 mm of water (physical: a deeper tank looks more tinted). Opacity 0 = clear water.
 */
export interface WaterSettings { on: boolean; level: number; color: string; opacity: number }
// on = false: a dry tank (terrarium for reptiles, amphibians, insects). Fish are kept in the data but not shown.

export type StandFinish = 'black' | 'white' | 'oak';
/** 'cabinet' = closed box with doors; 'frame' = open welded steel skeleton (square tube legs and rails). */
export type StandStyle = 'cabinet' | 'frame';
/** Stand under the tank: same footprint as the tank's outer glass, adjustable height (mm, floor to tank bottom). */
export interface StandSettings { show: boolean; height: number; finish: StandFinish; style: StandStyle }

/** Top of the tank: open, glass canopy panels, or a classic black moulded hood (lights inside). */
export type LidType = 'open' | 'glass' | 'hood';

/** 'back' = wall behind the tank; 'left' / 'right' = peninsula, that end of the tank against the wall (Nathan 2026-10-08:
 * the user picks the end, reversing the earlier single 'peninsula' = right end). */
export type WallSide = 'back' | 'left' | 'right';
export interface WallSettings { show: boolean; side: WallSide; color: string }

/** Human silhouette standing beside the tank for scale. height in mm, head to toe. */
export interface PersonSettings { show: boolean; height: number; side: 'left' | 'right' }

/** Everything that belongs to one tank. Split tanks are fully independent (Nathan 2026-10-08), camera included. */
export interface TankSetup {
  tank: Tank;
  camera: CameraSettings;
  render: RenderSettings; // render.edge is an app preference: kept the same in every setup
  light: LightSettings;
  substrate: SubstrateSettings;
  layout: LayoutSettings;
  terrain: TerrainSettings;
  water: WaterSettings;
  lid: LidType;
  stand: StandSettings;
  wall: WallSettings;
  person: PersonSettings;
  fish: Fish[];
}

export interface Scene {
  version: number;
  name: string;
  units: Units;
  /** One tank, or two after a split (tanks[0] = the original, "A"). */
  tanks: TankSetup[];
  /** Index of the tank the panel edits. */
  active: number;
  /** Split view: orbit and zoom move both views together (one shared field of view). */
  camLock: boolean;
}
