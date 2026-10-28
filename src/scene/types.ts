// Scene data: the single source of truth. All lengths in mm, all angles in degrees.
// Coordinates: x along the tank length 0..L, y up from the tank floor 0..H, depth = mm behind the front glass 0..D.
// Tank L/H/D are INTERIOR dimensions; glass is added outside. Fish positions live in their own tank's space.
// Split tanks (scene v7): up to two fully independent setups, each with its own contents, room and camera.
// Aquascape items (scene v9): every rock, piece of wood, cave and plant is its own placeable item.

export const SCENE_VERSION = 9;
/** Pairing of a pair-forming species, where a rule depends on it (rules-spec section 4): an established pair, one not yet confirmed,
 *  or unknown (the default). Two animals, even 1 male + 1 female, are never assumed to be a pair. */
export type Pairing = 'established' | 'unconfirmed' | 'unknown';

export type Units = 'in' | 'cm';
export type EdgeMode = 'cutout' | 'a2c';
export type Background = 'black' | 'blue' | 'gradient' | 'grey' | 'frosted' | 'custom' | 'none';
/** A side of the tank the background can cover. */
export type BgSide = 'back' | 'left' | 'right' | 'front';
/** How an uploaded background picture fills the glass it covers. */
export type BgFit = 'fill' | 'fit' | 'stretch' | 'tile';
/**
 * An uploaded background picture (Nathan 2026-10-14) on one side or across touching sides (one run round the corner).
 * `img` = id in the picture store (scene/images.ts; files carry the pictures in a top-level `images` map).
 * `scale` = tile height, % of the tank height (tile only).
 */
export interface BgImage { img: string; fit: BgFit; sides: BgSide[]; scale: number }
export type GlassType = 'standard' | 'lowiron';
export type LightType = 'flat' | 'spot' | 'tube' | 'led';
export type SubstrateType = 'gravel' | 'pea' | 'clown' | 'blue' | 'onyx' | 'black' | 'white' | 'aragonite' | 'coral'
  // terrestrial ground (lane T1, 2026-10-16; no version bump): soil / coco fibre, terrarium sand, clay, orchid bark, and
  // 'layered' = a clay-ball drainage layer under soil, its cross-section showing through the glass
  | 'soil' | 'tsand' | 'clay' | 'bark' | 'layered' | 'custom';
/** Leaf litter look (lane T1): one leaf kind, or a mix of all three. */
export type LeafKind = 'mixed' | 'oak' | 'magnolia' | 'catappa';
/** Leaf litter scattered over the ground (render/scatter.ts). `density` 0-100 %: 100 = the floor mostly covered,
 *  piled in drifts; `seed` = where the leaves fall. Absent (older files) = no litter. */
export interface Litter { leaf: LeafKind; density: number; seed: number }
/** Grain size of a custom substrate, finest to coarsest. */
export type Grain = 'mud' | 'sand' | 'gravel' | 'pebble';
/**
 * Custom substrate (Nathan 2026-10-13): a grain and a colour, optionally blended with a second grain and colour.
 * `share` = % of the floor that is the second grain; `mix` 0-1: 0 = separate patches (no mixing), 1 = mixed grain
 * by grain, between = clumps of each with mixed ground between them.
 */
export interface SubstrateBlend { grain: Grain; color: string; grain2: Grain | 'none'; color2: string; share: number; mix: number }

/** Tank floor outline (scene v8). L x D is always the bounding box; see scene/shape.ts. */
export type TankShape = 'rect' | 'bow' | 'round' | 'poly' | 'bowl' | 'pie' | 'arch';
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
  /**
   * arch only (Fluval Flex): the front pane is curved about a HORIZONTAL axis, an arc in side view, flush with the frame at the floor and
   * the opening and bulging out by this many mm at mid-height. The flat sides and back make a rectangle of depth D - frontBulge; D is the
   * full depth at the bulge (the front-most point, depth 0).
   */
  frontBulge?: number;
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
  /** Reptiles and amphibians: the animal's tracked sex, for the stocking check (drawing is unchanged). Absent = not sexed yet. */
  gender?: 'm' | 'f';
  /** Clinging animals only (species `surfaces`): the surface it clings to. On glass, (x, depth) is a point on the glass and
   * yaw its heading there; on hardscape it sits on top of the solid piece under (x, depth) (the floor if none is). */
  surface?: Surface;
}

/**
 * Where a clinging animal sits: the substrate, the inside of the glass at (x, depth) on the outline, any pane or curved
 * shell (v8; before that the four rectangle panes 'front' | 'back' | 'left' | 'right', migrated to 'glass'), or the top
 * of a rock, piece of wood or cave ('hardscape'), or floating at the water surface ('top': African dwarf frog; its height

 * is the water line's, the stored y is ignored), or hanging under a broad plant leaf ('under': snails, shrimp, otos; (x, depth) is
 * the point under the leaf, y the height of its underside, the leaf nearest that height; the floor if none is there).
 */
export type Surface = 'floor' | 'glass' | 'hardscape' | 'top' | 'under';

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
  /** The 'custom' background's colour (lane EN, 2026-10-19; absent = dark green). */
  bgColor?: string;
  /** Sides the background covers (added 2026-10-12; older files: the side against the room wall, as it was then). */
  bgSides: BgSide[];
  /** Round tanks only: degrees of the shell the background covers, centred on each chosen side (older files: 145). */
  bgArc: number;
  /** Uploaded pictures, each on its own sides (added 2026-10-14; older files: none). They cover those sides whatever `bg` is. */
  bgImages: BgImage[];
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
  /** How the fixture is held (added 2026-10-15, Nathan): 'legs' = on legs standing on the tank rim, 'hang' = cables from
   * the ceiling. Absent = by height (lightout mountOf: hung above 110 mm, else on legs). Ignored with a hood. */
  mount?: 'legs' | 'hang';
  /** Bar fixtures (tubes, LED bar; added 2026-10-15, Nathan): where the fixture sits front to back, mm from the middle,
   * + toward the back; held over the tank (lightout barZ). Absent = centred. */
  pos?: number;
  /** LED in a hood (added 2026-10-20, Nathan): a few stick-on strips joined by a wire, or one full-length bar. Absent =
   * 'strips'. Only the look (render/lighting addHoodLamps). */
  hoodLed?: 'strips' | 'bar';
  /** A catalogued light (added 2026-10-20, data/gear-catalog.json `lights`): drawn as that product at its own size and
   * colours, its emitters along its own body (scene/lightproduct.ts sets type, tech, watts). Absent = the generic fixture. */
  product?: string;
  /** Light output (added 2026-10-14, all optional, no version bump; model in scene/lightout.ts). Power draw (W); 0 or
   * absent = off, Brightness stays the manual knob. Set: the render brightness follows the computed lux, `bright` is an exposure. */
  watts?: number;
  /** The lamp; it also tells the spot styles apart (scene/lightout fixtureOf: halide = pendant, screw-in = bulb, else LED
   * puck). Absent or not one the fixture comes in = the fixture's first. */
  tech?: LightTech;
  /** Metal halide pendants: W per bulb (MH_BULBS; added 2026-10-15); absent = 150. Tubes and pendants take their power
   * from the lamps, not `watts` (lightout wattsOf). */
  bulbW?: number;
  /** Measured or published PAR at the substrate (µmol/m²/s); 0 or absent = estimate. Set, the estimate is scaled to match. */
  par?: number;
  /** What the Light map shows when watts is set (an app preference, like `beams`); absent = 'par'. */
  mapUnit?: 'par' | 'lux';
  /** PAR between the Light map's contour lines, a multiple of 5 (5-100; an app preference); absent = 10. */
  mapStep?: number;
  /** Lux between the contour lines when the map shows lux, a multiple of 250 (250-5000); absent = 500. */
  mapStepLux?: number;
  /** A Light map layer across the tank at this height above the floor (mm; an app preference, added 2026-10-15); 0 or
   * absent = the substrate only. */
  mapSlice?: number;
  /** Dark spots: a surface round every pocket of water below `mapDark` (an app preference, added 2026-10-15). */
  mapShells?: boolean;
  /** Light map: count the aquascape's shade (floaters, canopy, hardscape); absent = the fixture only (an app preference, added 2026-10-16). */
  mapShade?: boolean;
  /** Show expected plant outcomes (an app preference, added 2026-10-16): a plant that will struggle in this tank's light or care is drawn the way it would look (pale, leggy, small). Absent = every plant drawn healthy. */
  outcomes?: boolean;
  /** Dark spots: the level below which the water counts as dark, PAR (lux: x 50); absent = 30. */
  mapDark?: number;
}

export type LightTech = 'led-white' | 'led-planted' | 'led-reef' | 't5-refl' | 't5-bare' | 't8' | 't12' | 'led-tube' | 'cfl' | 'led-bulb' | 'mh' | 'mh-20k' | 'halogen';

export interface SubstrateSettings {
  show: boolean;
  type: SubstrateType;
  custom: SubstrateBlend; // used when type is 'custom'
  litter?: Litter; // leaf litter on the ground (lane T1, 2026-10-16); absent = none
  fl: number; fr: number; bl: number; br: number; // depth at each corner, mm
}

/**
 * Custom terrain: a cols x rows grid of ground heights (mm above the tank floor, Tank A) spread evenly over the
 * floor, corners included, with a smooth curve through every point. When on, it replaces the substrate's corner
 * slopes. Heights are physical (like the substrate).
 * Radial (round tanks and bowls, added 2026-10-12, no version bump): `rows` concentric rings round a centre point, ring k holding
 * round(2 pi k) points evenly spaced (so arc spacing matches ring spacing), the outer ring on the glass (a bowl's: at the floor); h runs centre,
 * ring 1, ring 2, ... each ring starting at the front. `cols` stays the slider value it was made from.
 */
/** radial: rings round the centre (round tank, bowl); with arc (degrees): arcs round a pie slice's apex (2026-10-13).
 *  pools (2026-10-16): sharp-banked hollows cut into the grid surface down to the substrate's corner slope (the swamp's
 *  pools, now plain data). Every file saved since has the list, empty or not; its absence marks an older file. */
export interface TerrainSettings { on: boolean; cols: number; rows: number; h: number[]; radial?: boolean; arc?: number; pools?: TerrainPool[] }
/**
 * A pool in the custom terrain: an ellipse centred at (x, d) with half-axes rx, rd, all fractions of the tank's L and
 * D (so Tank B has it at the same relative spot). Inside the core (1 - bank of the way out) the ground is the
 * substrate's corner slope; across the bank it rises (smoothstep) to the grid surface.
 */
export interface TerrainPool { x: number; d: number; rx: number; rd: number; bank: number }

/**
 * Starter set (scene v9; before that the whole aquascape): choosing one places a fresh set of editable items made from
 * the tank size and the seed. It stays recorded as the set the tank started from; 'swamp' also shapes the land. 'reef'
 * (2026-10-14): live rock and corals, offered in a saltwater tank only.
 */
export type LayoutId = 'none' | 'stones' | 'driftwood' | 'planted' | 'iwagumi' | 'swamp' | 'reef' | 'nature' | 'dutch' | 'jungle' | 'forest'
  // lane SS2 (2026-10-16): terrarium starters (water off; 'paludarium' keeps its pools), freshwater biotopes, marine sub-styles
  | 'rainforest' | 'arid' | 'jumper' | 'python' | 'burrow' | 'frogs' | 'paludarium' | 'blackwater' | 'malawi' | 'stream' | 'hillstream' | 'softreef' | 'spsreef' | 'clownnano';
/** Where a starter set's weight sits (lane SS, 2026-10-15): 'any' = the seed rolls it (as before); the others fix the
 *  groups (scene/items.ts `starterStyle`): one centred mound, one side (a triangle), U (both sides high, open middle),
 *  V (two islands, a valley between), scattered groups. */
export type CompId = 'any' | 'mound' | 'side' | 'u' | 'v' | 'scattered';
/**
 * How full each layer of a starter set is (lane SD, 2026-10-15): a stop 0..4 per layer, set by the stepped sliders
 * beside the layout picker (Sparse .. Packed; animals None .. Full). Each stop is a fraction of the layout's own range
 * (scene/items.ts STYLES), so a stop never breaks a style's rules. Absent (files before lane SD) = the stops nearest the
 * density the seed used to roll (`legacyDens`), animals None.
 */
export interface LayerDens { hard: number; plant: number; animal: number }
/** `seed` draws the style and the hardscape (and a swamp's land); `plantSeed` / `animalSeed` draw the plants and the
 *  starter animals, so each menu's Shuffle redraws its own layer only (Nathan 2026-10-15). Absent = `seed`. */
export interface LayoutSettings { id: LayoutId; seed: number; plantSeed?: number; animalSeed?: number;
  /** The ground's own draws (Shuffle with parts locked, 2026-10-16): `gSeed` the substrate and terrain, `gFoc` where its hills stand (the groups' seed). Absent = `seed`. */
  gSeed?: number; gFoc?: number;
  /** The substrate's type and blend have their own draw, so Shuffle can keep the type while it reshapes the ground (and the reverse). Absent = `gSeed`, then `seed`. */
  tSeed?: number; dens?: LayerDens; comp?: CompId;
  /** The substrate and terrain were drawn for this style by the Quick aquascape setup (scene/scapeground.ts). */
  ground?: boolean;
  /** Auto-populate by light (lane PG step 4, 2026-10-16): the starter set keeps only plants / corals that fit this light level and the tank's care (grow.feed). Absent = every plant the style draws. */
  fit?: 'low' | 'medium' | 'high';
  /** The owner picked a care level (Care menu), so gating can use it (lane AD, 2026-10-16). */
  careSet?: true;
  /** "Show only tank-appropriate" toggles in the Plants and Animals lists: unfit ones sink to the bottom, grayed, each with its reason. Advice only. */
  gatePlants?: true; gateAnimals?: true; gateStock?: true;
  /** The keeper's expertise (1 beginner .. 3 expert), chosen in Animals; gating waits for it. */
  expertise?: 1 | 2 | 3;
  /** The kind of setup the owner chose (lane S252, 2026-10-27): steers the species picker. Used only while it agrees with the water (scene/pickerKind.ts); absent = read from the water and the style. */
  kind?: 'freshwater' | 'saltwater' | 'terrarium' | 'vivarium';
  /** The owner's space for the tank (lane P3, 2026-10-20, no version bump): "Set my space" on the fullness tile, drawn as a dashed outline. Absent = not set. */
  space?: SpaceLimit }
/** The area the owner has for the tank, mm: w along the tank's length, d front to back, h (optional) the height it may reach (scene/space.ts). */
export interface SpaceLimit { w: number; d: number; h?: number }

/** Library item kinds; the variant names the generator (scene/items.ts LIBRARY). */
export type ItemKind = 'stone' | 'wood' | 'cave' | 'plant' | 'coral' | 'artificial';
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
  /** Plants that grow as several stems or crowns (isClump): the circle they start in, mm, and how many. Absent = the
   *  species' own look, drawn from the seed (added 2026-10-14, no version bump). Floaters have a spread too (the circle
   *  the patch covers fully grown) and, instead of a count, `dens` (times the species' own rosettes per area) (2026-10-15).
   *  A spread may reach past the glass: what would land outside is set down inside. */
  spread?: number;
  stems?: number;
  dens?: number;
  /** Plants: 0 = just planted, ~0.5 = established, 1 = fully grown / overgrown (lane GR1, 2026-10-15). Absent = the
   *  growth at which the species reaches `size` (growthOf in art/plants.ts), so older files draw as they did. With it,
   *  `size` stays the plant's own scale and growth sets how big and how dense it is. */
  growth?: number;
  /** Plants, set by the tank's growth Time (scene/growtime.ts, lane GR3): the growth this plant had at Time 0, so
   *  moving Time back returns it exactly. Below 0 = put in after Time 0 (it shows as just planted until then). */
  planted?: number;
  /** Plants that spread (lane PR, 2026-10-16, no version bump): the plant this one grew from (a runner's daughter, a pup, a
   *  cutting). Only a note: it is a real plant that can be selected, moved and deleted on its own. Absent = planted. */
  parent?: number;
  /** A daughter shown in a Time preview (scene/propagate.ts): who and which (`<root id>/<n>/...`). Never saved: keeping
   *  the preview drops it and the daughter stays as a plant. */
  brood?: string;
}

/**
 * Water: level as a fraction of a full tank (1 = full, i.e. WATERLINE_GAP below the interior top), so a resized tank
 * keeps the same fill. Colour tints what is seen through the water; opacity = how much of that colour
 * shows after 300 mm of water (physical: a deeper tank looks more tinted). Opacity 0 = clear water.
 */
export interface WaterSettings { on: boolean; level: number; color: string; opacity: number; salt?: boolean; /** tap (source) water nitrate, ppm as NO3 (lane NB) */ tapNitrate?: number }
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
/** need (Nathan 2026-10-19; absent = the old behaviour, `show` alone): after a tank or bundle that comes without a stand is
 *  chosen the stand is not added for the user. 'ask' = undecided (none drawn, the budget still counts a typical stand),
 *  'none' = "I don't need a stand" (nothing counted), 'added' = the user added one. */
export interface StandSettings { show: boolean; height: number; finish: StandFinish; style: StandStyle; table: TableSettings; need?: 'ask' | 'none' | 'added' }
/** Undecided: no stand on the tank yet, but one is still expected in the budget. */
export const standAsked = (st: StandSettings) => !st.show && st.need === 'ask';

/** Top of the tank: open, glass canopy panels, or a classic black moulded hood (lights inside). */
export type LidType = 'open' | 'glass' | 'hood' | 'mesh';
/** Front opening (lane EN, 2026-10-16; absent = none): a terrarium's hinged or sliding glass doors, drawn on a rectangle's front pane. */
export type DoorType = 'none' | 'hinged' | 'sliding';
/** Terrarium gear read off the Tech rows (scene/drygear.ts dryGearOf): heat source, its thermostat, UVB, a temperature / humidity gauge, misting, a timer on the lights. */
export interface DryGear { heat: 'lamp' | 'mat' | 'none'; thermostat: 'onoff' | 'dimming' | 'none'; uvb: 't5' | 'low' | 'none'; gauge: boolean; mist: 'hand' | 'auto' | 'none'; timer: boolean }

/** 'back' = wall behind the tank; 'left' / 'right' = peninsula, that end of the tank against the wall (Nathan 2026-10-08:
 * the user picks the end, reversing the earlier single 'peninsula' = right end). 'corner' = two walls meeting behind the
 * tank, each at 45° (Nathan 2026-10-13: a corner tank's apex in the room corner). */
export type WallSide = 'back' | 'left' | 'right' | 'corner';
/** gap: distance (mm) from the tank or table to the wall (added 2026-10-13; absent = 50). height: floor to ceiling
 * (mm; added 2026-10-14; absent = 8 ft, physics CEILING_H). */
export interface WallSettings { show: boolean; side: WallSide; color: string; gap?: number; height?: number }

/** Human silhouette standing beside the tank for scale. height in mm, head to toe. */
export interface PersonSettings { show: boolean; height: number; side: 'left' | 'right' }

/** Everything that belongs to one tank. Split tanks are fully independent (Nathan 2026-10-08), camera included. */
/** A 3D background panel inside the tank against the back glass: a relief wall of rock, river stones, live rock, cork bark
 * or moss (added 2026-10-15; older files: none). `depth` = how far it reaches in from the glass at its deepest (mm). */
export type BackdropKind = 'none' | 'rock' | 'river' | 'reef' | 'cork' | 'moss' | 'jungle';
export interface BackdropSettings { kind: BackdropKind; depth: number; seed: number }

/** How fast plants grow (lane GR3, 2026-10-15; no calendar units): the tank's feeding scales each species' speed, and
 *  `time` (0 = as planted .. 1 = everything overgrown in a low-tech tank) is where the tank's growth Time slider stands.
 *  Older files: low-tech, Time 0. */
export type GrowFeed = 'low' | 'ferts' | 'co2';
/** Where Time 0 stands (2026-10-15): 'rel' = the tank as it is now, 'abs' = every plant just planted (a baby). A Time
 *  move is a preview kept or undone when it ends; `time` stays where it was kept in 'abs' (the tank's age), 0 in 'rel'. */
export type GrowMode = 'rel' | 'abs';
export interface GrowSettings { feed: GrowFeed; time: number; mode: GrowMode }

/** How clean the tank looks (lane AL, 2026-10-15), display only: 0 = pristine .. 1 = neglected (algae on the glass,
 *  hardscape and substrate). One slider. Older files: pristine. */
export interface ConditionSettings { level: number }

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
  doors?: DoorType;
  stand: StandSettings;
  wall: WallSettings;
  person: PersonSettings;
  backdrop: BackdropSettings;
  grow: GrowSettings;
  condition: ConditionSettings;
  fish: Fish[];
  /** Rocks, wood, caves and plants (scene v9). */
  items: Item[];
  /** Painted scatter (lane SB, 2026-10-16, no version bump): seeded patches of leaves, pebbles, moss, twigs and carpet. Absent = none. */
  patches?: Patch[];
  /** The tank's tech level (lane TM, 2026-10-19, no version bump): filter, heater, CO2, ferts, salt gear; scene/tech.ts. Absent = the gear the demand engine infers. */
  tech?: import('./tech').TechSetup;
  /** How heavily the animals are fed (lane SE2, 2026-10-20, no version bump): sets the waste in the nitrogen budget (scene/nitrogen.ts). Absent = 'normal' (1 % of body weight a day). */
  feeding?: 'light' | 'normal' | 'heavy';
  /** Started from path 1, "An animal I want" (Nathan 2026-10-21, no version bump): the view draws no filter until the owner adds one
   *  (render/gear3d.ts; the inferred one is not drawn). Absent = an ordinary tank, inferred gear drawn (DRAW_INFERRED). */
  stockFirst?: boolean;
  /** Pairing per pair-forming species id (data/groups.ts PAIR_FORMERS), as the owner set it on the stocking screen or in the editor
   *  (2026-10-22, no version bump), for the two animals `ids` (fish ids, ascending). It applies only while exactly those two are the
   *  tank's animals of that species (scene/pairs.ts pairingIn); the store prunes it when they change. Absent or missing id = unknown. */
  pairs?: Record<string, { status: Exclude<Pairing, 'unknown'>; ids: [number, number] }>;
  /** An integrated kit (2026-10-20, Nathan: an all-in-one such as a Fluval Flex runs only on its own light, filter and lid; no version bump).
   *  Picked from the tank picker: the kit's gear is applied once and then held (scene/integrated.ts). Absent = a bare or ordinary tank. */
  integrated?: IntegratedKit;
  /** The library pick this tank is (2026-10-26, Nathan: "clearly distinguish if the tank being worked on is a real commercially
   *  available tank or a custom size"; no version bump). Absent = a custom size. scene/integrated.ts holds what the product fixes. */
  product?: TankProduct;
  /** Guardrails (lane C1, 2026-10-27, no version bump): this tank's limits on startup $, monthly $, minutes a week and space; scene/constraints.ts. Absent = none set, the browser profile's limits apply. */
  constraints?: import('./constraints').Constraints;
  /** The setup brief (lane U1, 2026-10-28, no version bump): hard constraints, preferences and locked choices every entry point pre-fills; scene/brief.ts. Absent = none yet. */
  brief?: import('./brief').Brief;
}

/** `model` a data/tanks.json size id; `key` the maker's product at that size (data/tanks.ts variantKey), absent for the catalogue size
 *  with no maker; `sig` the tank as picked (scene/integrated.ts tankSig), filled in on the first edit. */
export interface TankProduct { model: string; key?: string; sig?: string }

/** `kit` is an id in data/kits.json; the rest is what holding it needs: `sig` the tank it was applied to (any other size or shape
 *  releases it), and the kit's own settings as applied. All filled in by scene/integrated.ts. */
export interface IntegratedKit {
  kit: string; sig?: string; lid?: LidType;
  light?: Partial<LightSettings>;
  filter?: { row?: string; units?: import('./tech').FilterUnit[] };
  heater?: { row?: string; units?: import('./tech').HeaterUnit[] };
}

/** What a scatter brush drops (lane SB). */
export type LiteBrushId = 'leaf' | 'pebble' | 'gravel' | 'moss' | 'twig' | 'hairgrass' | 'javamoss' | 'sphagnum';
/** A built-in scatter, or `plant:<library variant>`: that plant's own clumps painted over the area. */
export type BrushId = LiteBrushId | `plant:${string}`;
/**
 * One painted patch: a seed, the stroke's path and the brush settings; the things themselves are redrawn from these, so a
 * patch is tiny in the file and moves / copies / erases as a unit. `path` = x, depth pairs (mm, flat); `size` = brush
 * radius (mm); `density` 0-100; `cuts` = x, depth, radius triples erased from it afterwards; `leaf` = the leaf look.
 */
export interface Patch { id: number; brush: BrushId; seed: number; size: number; density: number; path: number[]; cuts?: number[]; leaf?: LeafKind; /** Plant brushes: growth stage 0-1 (absent = the plant's own). */ growth?: number; /** One thing per path point, exactly there (a single pebble or leaf placed by hand). */ single?: boolean }

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
