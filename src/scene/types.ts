// Scene data: the single source of truth. All lengths in mm, all angles in degrees.
// Coordinates: x along the tank length 0..L, y up from the tank floor 0..H, depth = mm behind the front glass 0..D.
// Tank L/H/D are INTERIOR dimensions; glass is added outside. Fish positions live in their own tank's space.
// Split tanks (scene v7): up to two fully independent setups, each with its own contents, room and camera.
// Aquascape items (scene v9): every rock, piece of wood, cave and plant is its own placeable item.

export const SCENE_VERSION = 9;

export type Units = 'in' | 'cm';
export type EdgeMode = 'cutout' | 'a2c';
export type Background = 'black' | 'blue' | 'gradient' | 'grey' | 'frosted' | 'none';
/** A side of the tank the background can cover. */
export type BgSide = 'back' | 'left' | 'right' | 'front';
export type GlassType = 'standard' | 'lowiron';
export type LightType = 'flat' | 'spot' | 'tube' | 'led';
export type SubstrateType = 'gravel' | 'pea' | 'clown' | 'blue' | 'onyx' | 'black' | 'white' | 'aragonite' | 'coral' | 'custom';
/** Grain size of a custom substrate, finest to coarsest. */
export type Grain = 'mud' | 'sand' | 'gravel' | 'pebble';
/**
 * Custom substrate (Nathan 2026-10-13): a grain and a colour, optionally blended with a second grain and colour.
 * `share` = % of the floor that is the second grain; `mix` 0-1: 0 = separate patches (no mixing), 1 = mixed grain
 * by grain, between = clumps of each with mixed ground between them.
 */
export interface SubstrateBlend { grain: Grain; color: string; grain2: Grain | 'none'; color2: string; share: number; mix: number }

/** Tank floor outline (scene v8). L x D is always the bounding box; see scene/shape.ts. */
export type TankShape = 'rect' | 'bow' | 'round' | 'poly' | 'bowl' | 'pie';
export interface Tank {
  L: number; H: number; D: number;
  /**
   * Absent = 'rect' (files before v8). round: D = L (diameter). poly: L = width, D derived from it. bow: D = centre depth. pie: D = radius, L derived.
   * bowl: a sphere of diameter L = D cut flat at the floor and at the opening; H is derived from the three diameters.
   */
  shape?: TankShape;
  /** poly only: 3, 5 or 6 sides, a flat face toward the viewer. */
  sides?: number;
  /** bow only: depth at the ends (mm); the front is a circular arc from the ends to the full depth D at the centre. */
  bowMin?: number;
  /** bowl only: diameters (mm) of the flat floor and of the opening at the top, both less than L. */
  bowlFloor?: number;
  bowlTop?: number;
  /** pie only: angle (45-180°) between the two flat panes at the back; D is the radius and L the chord it spans. */
  pieDeg?: number;
}

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
  /** Dimorphic species only (species `female`): 'f' = drawn and sized as a female. Absent = male. */
  sex?: 'f';
  /** Clinging animals only (species `surfaces`): the surface it clings to. On glass, (x, depth) is a point on the glass and
   * yaw its heading there; on hardscape it sits on top of the solid piece under (x, depth) (the floor if none is). */
  surface?: Surface;
}

/**
 * Where a clinging animal sits: the substrate, the inside of the glass at (x, depth) on the outline, any pane or curved
 * shell (v8; before that the four rectangle panes 'front' | 'back' | 'left' | 'right', migrated to 'glass'), or the top
 * of a rock, piece of wood or cave ('hardscape').
 */
export type Surface = 'floor' | 'glass' | 'hardscape';

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
  /** Thin black lines on every glass edge, inside and out (added 2026-10-12; older files: shown). */
  edges: boolean;
  /** Light beams drawn where each fixture falls to half strength (added 2026-10-13; older files: hidden). */
  beams: boolean;
  /** Fish stand out, 0-1 (added 2026-10-13; older files: 0.15): an app preference. 0 = the plain lit render; higher
   * lifts fish bodies' brightness and colour, darkens their outline and lets the water haze them less. */
  pop: number;
  bg: Background;
  /** Sides the background covers (added 2026-10-12; older files: the side against the room wall, as it was then). */
  bgSides: BgSide[];
  /** Round tanks only: degrees of the shell the background covers, centred on each chosen side (older files: 145). */
  bgArc: number;
  glass: 'auto' | number; // mm, or auto by interior height
  glassType: GlassType;
}

export interface LightSettings {
  type: LightType;
  count: number;
  /** Spot lights only (grid / tri): rows front to back, so the bulbs form a count × rows grid (added 2026-10-08; older files: 1). */
  rows: number;
  /** Spot lights only (added 2026-10-09; older files: 'grid', 0, 52): 'tri' staggers alternate rows by half a step and
   * drops one bulb from them, a triangular lattice that suits a round tank. 'fit' (added 2026-10-13) places `count`
   * bulbs to cover the tank's own outline evenly (rows and spacing unused): see `fitSpots`. */
  pattern: 'grid' | 'tri' | 'fit';
  /** Spot lights only: centre-to-centre bulb spacing (mm); 0 = auto, spread to fill the tank. */
  spacing: number;
  /** Spot lights only: full beam angle (degrees), as printed on the bulb. */
  cone: number;
  bright: number;
  kelvin: number;
  room: number;
  /** Fixture height above the top of the tank (mm). Higher = dimmer, more even, more spill into the room. Ignored with a hood. */
  height: number;
}

export interface SubstrateSettings {
  show: boolean;
  type: SubstrateType;
  custom: SubstrateBlend; // used when type is 'custom'
  fl: number; fr: number; bl: number; br: number; // depth at each corner, mm
}

/**
 * Custom terrain: a cols x rows grid of ground heights (mm above the tank floor, Tank A) spread evenly over the
 * floor, corners included, with a smooth curve through every point. When on, it replaces the substrate's corner
 * slopes and the swamp land. Heights are physical (like the substrate).
 * Radial (round tanks and bowls, added 2026-10-12, no version bump): `rows` concentric rings round a centre point, ring k holding
 * round(2 pi k) points evenly spaced (so arc spacing matches ring spacing), the outer ring on the glass (a bowl's: at the floor); h runs centre,
 * ring 1, ring 2, ... each ring starting at the front. `cols` stays the slider value it was made from.
 */
/** radial: rings round the centre (round tank, bowl); with arc (degrees): arcs round a pie slice's apex (2026-10-13). */
export interface TerrainSettings { on: boolean; cols: number; rows: number; h: number[]; radial?: boolean; arc?: number }

/**
 * Starter set (scene v9; before that the whole aquascape): choosing one places a fresh set of editable items made from
 * the tank size and the seed. It stays recorded as the set the tank started from; 'swamp' also shapes the land.
 */
export type LayoutId = 'none' | 'stones' | 'driftwood' | 'planted' | 'iwagumi' | 'swamp';
export interface LayoutSettings { id: LayoutId; seed: number }

/** Library item kinds; the variant names the generator (scene/items.ts LIBRARY). */
export type ItemKind = 'stone' | 'wood' | 'cave' | 'plant' | 'coral';
/**
 * One placed piece of hardscape or one plant (scene v9). Its shape is generated from (variant, seed, size), so a
 * file stores no meshes. (x, depth) = the anchor on the floor plan; the piece rests on the ground there, raised by
 * `lift` when it sits on another piece.
 */
export interface Item {
  id: number;
  kind: ItemKind;
  variant: string;
  seed: number;
  x: number;
  depth: number;
  /** Base above the ground under (x, depth), mm: 0 = on the substrate; more = resting on another piece or floating where
   *  it was put (pieces may pass through each other); less = sunk into the substrate (2026-10-12). */
  lift: number;
  /** Turn about the vertical (yaw), degrees. */
  yaw: number;
  /** Tip forward / back about its own crosswise axis (pitch), degrees, -90..90 (added 2026-10-12; older files: 0). */
  pitch: number;
  /** Lean sideways about its own length (roll), degrees, -180..180 (was -45..45 before 2026-10-12). */
  tilt: number;
  /** mm: the length of a stone, wood or cave, the height of a plant, the width of a carpet patch. */
  size: number;
}

/**
 * Water: level as a fraction of a full tank (1 = full, i.e. WATERLINE_GAP below the interior top), so a resized tank
 * keeps the same fill. Colour tints what is seen through the water; opacity = how much of that colour
 * shows after 300 mm of water (physical: a deeper tank looks more tinted). Opacity 0 = clear water.
 */
export interface WaterSettings { on: boolean; level: number; color: string; opacity: number; salt?: boolean }
// on = false: a dry tank (terrarium for reptiles, amphibians, insects). Fish are kept in the data but not shown.
// salt = true: a marine tank (added 2026-10-13, no version bump; absent = freshwater).

export type StandFinish = 'black' | 'white' | 'oak';
/** 'cabinet' = closed box with doors; 'frame' = open welded steel skeleton (square tube legs and rails); 'table' = a
 * table top larger than the tank, the tank placed anywhere on it (2026-10-09); 'custom' = a cabinet sized and placed
 * like the table (its top is the table's settings), for any tank (2026-10-13). */
export type StandStyle = 'cabinet' | 'frame' | 'table' | 'custom';
/**
 * Table top (scene/table.ts): rectangular L x D or round (diameter L = D), mm. (x, z) = the tank's offset from the
 * table centre, mm, x to the right, z toward the back; kept so the tank's outline stays on the top.
 */
export interface TableSettings { shape: 'rect' | 'round'; L: number; D: number; x: number; z: number }
/**
 * Stand under the tank, adjustable height (mm, floor to tank bottom). Cabinet and frame: the tank's footprint.
 * `table` is kept while another style is chosen (added 2026-10-09; older files get one sized to the tank).
 */
export interface StandSettings { show: boolean; height: number; finish: StandFinish; style: StandStyle; table: TableSettings }

/** Top of the tank: open, glass canopy panels, or a classic black moulded hood (lights inside). */
export type LidType = 'open' | 'glass' | 'hood';

/** 'back' = wall behind the tank; 'left' / 'right' = peninsula, that end of the tank against the wall (Nathan 2026-10-08:
 * the user picks the end, reversing the earlier single 'peninsula' = right end). 'corner' = two walls meeting behind the
 * tank, each at 45° (Nathan 2026-10-13: a corner tank's apex in the room corner). */
export type WallSide = 'back' | 'left' | 'right' | 'corner';
/** gap: distance (mm) from the tank or table to the wall (added 2026-10-13; absent = 50). */
export interface WallSettings { show: boolean; side: WallSide; color: string; gap?: number }

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
  /** Rocks, wood, caves and plants (scene v9). */
  items: Item[];
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
