// Plant types, their sizing rules and the 3D plant table (render/plant3d.ts builds the meshes).
export type PlantType = 'stem' | 'stemred' | 'grass' | 'sword' | 'fern' | 'anubias' | 'carpet' | 'crypt'
  | 'buce' | 'rotala' | 'ludwigia' | 'balansae' | 'sagittaria' | 'ozelot' | 'moss'
  | 'redroot' | 'salvinia' | 'frogbit' | 'lettuce' | 'lotus'
  | 'pothos' | 'bromeliad' | 'tropfern' | 'fittonia' | 'sphagnum' | 'creeper'
  | 'hairgrass' | 'hornwort' | 'anacharis'
  | 'echeveria' | 'haworthia' | 'jade' | 'aloe' | 'burrotail' | 'barrel'
  | 'sansevieria' | 'agave' | 'columnar';

/** Height / width per plant type (sizes and footprints; the ratio of the old 2D cards). */
export const PLANT_ASPECT: Record<PlantType, number> = { stem: 3.2, stemred: 3.2, grass: 3.6, sword: 1.1, fern: 1.3, anubias: 0.8, carpet: 0.32, crypt: 1,
  buce: 0.9, rotala: 3.6, ludwigia: 3, balansae: 3, sagittaria: 0.45, ozelot: 1.1, moss: 0.45,
  redroot: 0.35, salvinia: 0.25, frogbit: 0.4, lettuce: 0.45, lotus: 0.85,
  pothos: 1.3, bromeliad: 0.6, tropfern: 1, fittonia: 0.5, sphagnum: 0.35, creeper: 1.2,
  hairgrass: 0.4, hornwort: 3, anacharis: 3.2,
  echeveria: 0.55, haworthia: 0.7, jade: 1.1, aloe: 1.1, burrotail: 0.5, barrel: 1,
  sansevieria: 1.6, agave: 0.8, columnar: 2.4 };
/** Plants that grow as a low patch (size = patch width, height = CARPET_H) rather than upright (size = height). */
export const isCarpet = (v: string) => v === 'carpet';
/** Plants that float at the water line (size = patch width; roots hang below; not drawn in a dry tank). */
export const isFloat = (v: string) => v === 'redroot' || v === 'salvinia' || v === 'frogbit' || v === 'lettuce';
/** Plants that grow as several stems or crowns, so a clump has its own spread and count (Item.spread / stems). */
export const isClump = (v: string) => PLANT3D[v as PlantType]?.form === 'stem' || PLANT3D[v as PlantType]?.form === 'vine' || !!PLANT3D[v as PlantType]?.crowns;
/** Vines (lane T2): size = the longest vine's length, not a height (it climbs, trails and hangs). */
export const isVine = (v: string) => PLANT3D[v as PlantType]?.form === 'vine';
/** Land plants (lane T2): grown above water, in a terrarium (no current: they stand still). */
export const isLand = (v: string) => !!PLANT3D[v as PlantType]?.land;
/** Plants whose size is the width of a patch, not a height. */
export const isPatch = (v: string) => isCarpet(v) || isFloat(v);

const GREENS: [string, string][] = [['#2f5e2a', '#5f9a48'], ['#36682e', '#6aa64e'], ['#2a5428', '#558c40'], ['#3d6e30', '#78b05a']];

// ---------- 3D plants (render/plant3d.ts) ----------
/** One kind of leaf: a curved sheet along a centreline that rises at `rise` from the vertical and bends `arch` more by the tip. */
export interface Leaf3D {
  /** Leaf length, fraction of the plant's height (min, max); the whole plant is then scaled to its height. Carpet: mm. */
  len: [number, number];
  /** Widest point / length. */
  wid: number;
  /** Width profile along the blade: sin(pi t^k)^p (k < 1 widest near the base, p small = parallel sides). */
  prof: [number, number];
  /** Angle from the vertical at the base, rad (min, max): first leaves / outer leaves get the max. */
  rise: [number, number];
  /** Extra bend toward the ground by the tip, rad. */
  arch: number;
  /** Turn of the blade about its own midrib by the tip, rad (random sign). */
  twist: number;
  /** Cross-section: + edges up (cupped), - edges down (a ridged blade); fraction of the half width. */
  fold: number;
  /** Edge ripple out of the blade's plane, fraction of the width, and ripples along the blade. */
  wave: [number, number];
  /** Bare stalk below the blade, fraction of the length. */
  pet: number;
  /** Upper side: [edge, midrib] colour pairs, one picked per leaf. */
  cols: [string, string][];
  /** Underside colour (paler, duller). */
  under: string;
  /** A pale midrib line down the middle of the upper side, optional. */
  rib?: string;
  /** Tip colour and how far down it runs (0..1 of the blade), optional. */
  tip?: [string, number];
  /** Spots on the upper side, optional: colour, spots per leaf (min, max), radius as a fraction of the blade length. */
  spots?: { col: string; n: [number, number]; r: number };
  /** Base colour and how far up the blade it runs (0..1), optional: a bromeliad's red heart (lane T2). */
  heart?: [string, number];
  /** A net of veins on the upper side, optional (fittonia, lane T2): colour, side veins per blade, line width (fraction
   *  of a vein's spacing). Drawn from the shape alone (no random draws). */
  veins?: { col: string; n: number; w: number };
  /** A compound frond (lane T2): the blade is a thin rachis carrying `n` pairs of leaflets (`leaf`, its len a fraction
   *  of the frond's length), `ang` off the rachis toward the tip, rad; their length along the frond as `prof`. */
  pinnae?: { n: [number, number]; ang: number; prof: [number, number]; leaf: Leaf3D };
  /** A fleshy leaf (lane CP, succulents): half its thickness over the blade's width at the middle; the upper side bulges up
   *  and the underside down, meeting at the rim (absent = a flat sheet). */
  thick?: number;
  /** Samples along the blade and across it (3 = a midrib, 5 = room for a cup or a ripple). */
  seg: [number, number];
}
export interface Plant3D {
  /** rosette = leaves from one crown; rhizome = leaves along a creeping root; stem = upright stems with paired leaves;
   *  carpet = tiny leaflets over a patch; moss = tiny fronds all over a low ragged mound; float = small rosettes lying
   *  on the water over a patch, roots hanging under them; vine = long vines from a crown (lane T2), climbing up behind
   *  it or trailing along the ground, leaves (len in mm) on them. */
  form: 'rosette' | 'rhizome' | 'stem' | 'carpet' | 'moss' | 'float' | 'vine';
  /** Leaves (rosette, rhizome), stems (stem), or leaflets per 1000 mm² of patch (carpet) or of the mound's footprint
   *  (moss): min, max. */
  n: [number, number];
  /** How much it gives to the water current: 0 = stiff, 1 = limp (tall thin leaves lean and wave, short stiff ones barely). */
  sway: number;
  /** Width over which leaves / stems / crowns start, fraction of the card width. */
  spread: number;
  leaf: Leaf3D;
  /** Stalks and the rhizome. */
  stalk: string;
  /** Stem plants: leaf pairs up a stem; the top keeps getting smaller leaves. */
  nodes?: number;
  /** Stem plants: the leaf colours from this far up the stem (0..1), e.g. the red tops. */
  top?: { cols: [string, string][]; from: number };
  /** Crowns (rosette): several plants in one clump (vallisneria runners). */
  crowns?: [number, number];
  /** Floating plants: rosettes per 1000 mm² of patch, leaves per rosette, roots per rosette and root length (mm). */
  float?: { per: [number, number]; leaves: [number, number]; roots: [number, number]; rootLen: [number, number] };
  /** How it grows (lane GR1, 2026-10-15). */
  grow: Grow;
  /** A land plant (lane T2): grows above the water, in a terrarium. */
  land?: true;
  /** Vines (lane T2): share that climb (the rest trail), leaf spacing along a vine (mm), how far the climbers lean back
   *  from upright (rad: toward the wall behind, where the glass turns them up along it), how wide they fan (rad either
   *  side of upright), vine thickness (mm), how much a vine wanders (rad). */
  vine?: { climb: number; node: number; back: number; fan: number; thick: number; wander: number; branch?: number;
    /** With wood in reach (lane T2, T3's anchors): share of the vines that run along it, and mm per turn round a limb
     *  (0 / absent = along its top). */
    follow?: number; wrap?: number };
  /** Stem plants: leaves per node, set round the stem (absent = a pair; lane T2: hornwort, anacharis). */
  whorl?: number;
  /** Stem plants: stem radius as a fraction of the height (absent = 0.006; lane CP: a jade plant's thick trunk). */
  stemK?: number;
  /** Stem plants: how far the stems lean out by the top, times the usual (lane T2: fittonia sprawls; absent = 1). */
  lean?: number;
  /** The most a plant's later growth lengthens its stems / leaves, times their length at the species' `size` (absent = no cap;
   *  lane PP: fittonia stays a compact mound instead of sending up tall bare stems). */
  cap?: number;
  /** Rosettes: the most leaves the plant has grown to (absent = 600; lane PP: a hairgrass patch fills out to a lawn). */
  lawn?: number;
  /** Moss: grown as distinct heads (capitula) this far apart, times its height (lane PP: sphagnum; absent = fronds all over). */
  heads?: number;
  /** 'emerge' plants: the leaf above the water (lane GR2): stiffer, rounder, darker; `k` = its length over the leaf it
   *  replaces, `stiff` its stiffness out of the water as a length (mm: about how long a piece can stand out before its
   *  tip droops 1 rad), `land` the radius (mm) it levels out on coming down onto the water (soft for a sword leaf,
   *  tight for a creeping stem), the rest overrides the submersed leaf. */
  emersed?: Partial<Leaf3D> & { k?: number; stiff?: number; land?: number };
  /** Lily form (lane GR2): pads on long stalks from the crown, lying on the water surface. `n` = pads at growth `from`
   *  and at growth 1; pad length mm; `out` = how far from the crown they reach by growth 1, mm. */
  pads?: { n: [number, number]; from: number; len: [number, number]; out: number; leaf: Leaf3D; stalk: string };
}

/**
 * Growth (lane GR1, 2026-10-15): 0 = just planted, ~0.5 = established, 1 = fully grown / overgrown. The plant's size (its
 * length; a patch's width) runs `len[0]` mm at 0 to `len[1]` at 1 on an even ratio per step; `more` = how many times the
 * leaves / stems / leaflets multiply from 0 to 1 (and per growth step the same ratio). A saved plant without a growth
 * (every file before GR1, every starter set) is at the growth whose size is its saved size (growthOf), so it draws as
 * before.
 */
export interface Grow {
  /** Speed on the timeline (lane GR3). */
  speed: 'slow' | 'medium' | 'fast';
  /** What it does once longer than the water above it: trail along the surface, emerge above it (lane GR2), spread
   *  sideways, or none (it only gets denser). GR1 trails every plant that reaches the surface. */
  overflow: 'trail' | 'emerge' | 'spread' | 'none';
  /** Size, mm, at growth 0 and at growth 1 (height or leaf length; a carpet's or floater's patch width). */
  len: [number, number];
  /** Leaves / stems / leaflets at growth 1 over growth 0. */
  more: number;
  /** Stem plants: side shoots per stem by growth 1. */
  shoots?: number;
  /** Leaves grown on keep their shape (as wide for their length as the plant's own; lane T2: a bromeliad), instead of
   *  widening with the square root of their length. */
  prop?: boolean;
}

const LEAF_GREENS: [string, string][] = GREENS;
export const PLANT3D: Partial<Record<PlantType, Plant3D>> = {
  fern: { grow: { speed: 'slow', overflow: 'none', len: [60, 300], more: 4 }, sway: 0.3, form: 'rhizome', n: [13, 18], spread: 0.6, stalk: '#5a4a32', leaf: {
    len: [0.7, 1], wid: 0.1, prof: [0.8, 0.8], rise: [0.08, 0.6], arch: 0.4, twist: 0.5, fold: -0.25, wave: [0.1, 4], pet: 0.06,
    cols: [['#244a22', '#3e7038'], ['#2a5226', '#4a7e40']], under: '#355a30', rib: '#7aa060', tip: ['#3c7034', 0.3], seg: [10, 5] } },
  sword: { grow: { speed: 'medium', overflow: 'emerge', len: [90, 600], more: 4 }, sway: 0.3, form: 'rosette', n: [16, 24], spread: 0.05, stalk: '#3a6a2c', leaf: {
    len: [0.75, 1], wid: 0.15, prof: [0.75, 0.8], rise: [0.05, 0.75], arch: 0.4, twist: 0.5, fold: -0.15, wave: [0.03, 3], pet: 0.3,
    cols: [['#3d7a2e', '#6aa64e'], ['#468a34', '#7ab85a'], ['#36702a', '#62a048']], under: '#5a8a48', rib: '#b0d098', seg: [10, 5] },
    // emersed: broad oval blades held up on long stiff stalks, a deeper green
    emersed: { k: 0.95, stiff: 230, land: 70, wid: 0.22, prof: [0.6, 0.6], pet: 0.55, twist: 0.15, fold: -0.08, wave: [0.01, 2],
      cols: [['#2c5c22', '#4a8236'], ['#32662a', '#528c3c'], ['#2a5420', '#467a32']], under: '#4a6e3a', rib: '#8ab470' } },
  carpet: { grow: { speed: 'medium', overflow: 'spread', len: [50, 450], more: 1 }, sway: 0.1, form: 'carpet', n: [60, 70], spread: 1, stalk: '#3f6a2e', leaf: {
    len: [5, 7.5], wid: 0.75, prof: [0.9, 0.5], rise: [0.9, 1.5], arch: 0.1, twist: 0.3, fold: 0.2, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [2, 3] } },
  anubias: { grow: { speed: 'slow', overflow: 'none', len: [40, 180], more: 4 }, sway: 0.08, form: 'rhizome', n: [10, 14], spread: 0.4, stalk: '#2e5226', leaf: {
    len: [0.6, 0.95], wid: 0.4, prof: [0.7, 0.55], rise: [0.1, 0.6], arch: 0.25, twist: 0.3, fold: 0.15, wave: [0.02, 2], pet: 0.25,
    cols: [['#1e3e1c', '#3a6a32'], ['#22441e', '#40723a']], under: '#3e6236', rib: '#5a8a4a', seg: [8, 5] } },
  grass: { grow: { speed: 'fast', overflow: 'trail', len: [120, 900], more: 6 }, sway: 1, form: 'rosette', n: [16, 24], crowns: [3, 5], spread: 0.5, stalk: '#3f6a2e', leaf: {
    len: [0.6, 1], wid: 0.035, prof: [1, 0.12], rise: [0.02, 0.3], arch: 0.5, twist: 1.5, fold: 0, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [12, 3] } },
  stem: { grow: { speed: 'fast', overflow: 'emerge', len: [70, 900], more: 4, shoots: 1 }, sway: 0.65, form: 'stem', n: [5, 7], nodes: 22, spread: 0.5, stalk: '#3f6a2e', top: { cols: [['#4a8a34', '#80b85a']], from: 0.8 }, leaf: {
    len: [0.11, 0.14], wid: 0.3, prof: [0.8, 0.6], rise: [0.5, 1.2], arch: 0.3, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [4, 3] },
    // emersed: shorter, rounder, held up along the stem, a darker glossy green
    emersed: { k: 0.8, stiff: 140, land: 35, wid: 0.5, prof: [0.9, 0.55], rise: [0.35, 0.8], arch: 0.12, twist: 0.1, fold: 0.12,
      cols: [['#2a5622', '#467c34'], ['#2e5c24', '#4c8438']], under: '#4a6a3e' } },
  stemred: { grow: { speed: 'medium', overflow: 'emerge', len: [70, 900], more: 4, shoots: 1 }, sway: 0.65, form: 'stem', n: [5, 7], nodes: 22, spread: 0.5, stalk: '#6a4a2a', top: { cols: [['#8a3a2a', '#c0604a'], ['#7e3426', '#b4583e']], from: 0.55 }, leaf: {
    len: [0.11, 0.14], wid: 0.3, prof: [0.8, 0.6], rise: [0.5, 1.2], arch: 0.3, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: [['#4e5a2a', '#7e8a42'], ['#56602e', '#86904a']], under: '#7a7a4a', seg: [4, 3] },
    // emersed: rounder, darker, green-bronze rather than red
    emersed: { k: 0.8, stiff: 140, land: 35, wid: 0.5, prof: [0.9, 0.55], rise: [0.35, 0.8], arch: 0.12, twist: 0.1, fold: 0.12,
      cols: [['#3a4a22', '#5e6e34'], ['#4a3e22', '#725a34']], under: '#6a4a3a' } },
  // Cryptocoryne wendtii: short stalked lance leaves with rippled edges, olive-brown to bronze, reddish underneath
  crypt: { grow: { speed: 'slow', overflow: 'none', len: [45, 300], more: 5 }, sway: 0.15, form: 'rosette', n: [12, 18], crowns: [1, 3], spread: 0.3, stalk: '#5a4a30', leaf: {
    len: [0.75, 1], wid: 0.32, prof: [0.6, 0.8], rise: [0.15, 0.9], arch: 0.35, twist: 0.15, fold: -0.08, wave: [0.06, 5], pet: 0.28,
    cols: [['#44502a', '#72783e'], ['#4e4a2a', '#7e7040'], ['#5a462a', '#8a6a40'], ['#3e4c26', '#66763c']], under: '#84563c', rib: '#a09060', seg: [12, 5] } },
  // Bucephalandra: a small creeping rhizome of stiff lance leaves, dark green with blue-grey and wine casts
  buce: { grow: { speed: 'slow', overflow: 'none', len: [30, 150], more: 4 }, sway: 0.05, form: 'rhizome', n: [8, 12], spread: 0.45, stalk: '#3a3028', leaf: {
    len: [0.55, 0.9], wid: 0.28, prof: [0.7, 0.6], rise: [0.2, 0.8], arch: 0.2, twist: 0.25, fold: 0.1, wave: [0.04, 3], pet: 0.15,
    cols: [['#2a4a36', '#527a5e'], ['#323e4e', '#5e6e80'], ['#4a3438', '#7a5e62'], ['#2c4e38', '#58805e']], under: '#5e4a4e', rib: '#8aa898', seg: [8, 5] } },
  // Rotala rotundifolia: many fine stems of small narrow leaves, pink to orange at the top
  rotala: { grow: { speed: 'fast', overflow: 'trail', len: [70, 900], more: 4, shoots: 1.5 }, sway: 0.7, form: 'stem', n: [7, 10], nodes: 30, spread: 0.55, stalk: '#6a5a3a', top: { cols: [['#b0606a', '#e0909a'], ['#b06a50', '#e09a78']], from: 0.6 }, leaf: {
    len: [0.07, 0.09], wid: 0.2, prof: [0.8, 0.6], rise: [0.45, 1.1], arch: 0.25, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: [['#4a7a34', '#78a856'], ['#52823a', '#86b45e']], under: '#8a8a5a', seg: [4, 3] } },
  // Ludwigia repens 'Rubin': fewer, thicker stems of broad oval leaves, olive-brown below, deep red at the top, red underneath
  ludwigia: { grow: { speed: 'medium', overflow: 'emerge', len: [70, 800], more: 4, shoots: 1 }, sway: 0.55, form: 'stem', n: [4, 6], nodes: 16, spread: 0.45, stalk: '#6a3a2a', top: { cols: [['#7a2a22', '#b04a3a'], ['#6e2a2a', '#a04440']], from: 0.4 }, leaf: {
    len: [0.12, 0.15], wid: 0.55, prof: [1, 0.6], rise: [0.6, 1.25], arch: 0.25, twist: 0.2, fold: 0.1, wave: [0, 0], pet: 0.05,
    cols: [['#5a4a2a', '#8a6a3e'], ['#5e4228', '#8e603c']], under: '#8a3a3a', seg: [5, 3] },
    // emersed: round, glossy, dark green with a red flush, red underneath
    emersed: { k: 0.8, stiff: 150, land: 22, wid: 0.7, prof: [1, 0.5], rise: [0.4, 0.85], arch: 0.1, twist: 0.1, fold: 0.15,
      cols: [['#2e4a22', '#4a6a32'], ['#3e3e22', '#5e5a32']], under: '#7a3434' } },
  // Cryptocoryne balansae: tall narrow straps, the blade puckered all along, green to bronze; gives to the current
  balansae: { grow: { speed: 'medium', overflow: 'trail', len: [120, 900], more: 5 }, sway: 0.6, form: 'rosette', n: [8, 14], crowns: [1, 3], spread: 0.25, stalk: '#4a4a2a', leaf: {
    len: [0.6, 1], wid: 0.08, prof: [0.9, 0.3], rise: [0.03, 0.35], arch: 0.45, twist: 0.4, fold: -0.1, wave: [0.1, 16], pet: 0.08,
    cols: [['#3a5a26', '#5e8040'], ['#4a5428', '#727a3e'], ['#42502a', '#6a7440']], under: '#6a5a3a', seg: [28, 5] } },
  // Dwarf sagittaria (S. subulata): a run of small grassy rosettes joined by runners, the start of a lawn
  sagittaria: { grow: { speed: 'fast', overflow: 'spread', len: [30, 150], more: 10 }, sway: 0.25, form: 'rosette', n: [40, 60], crowns: [6, 10], spread: 0.9, stalk: '#4a7a34', leaf: {
    len: [0.6, 1], wid: 0.05, prof: [1, 0.25], rise: [0.05, 0.75], arch: 0.4, twist: 0.6, fold: 0, wave: [0, 0], pet: 0,
    cols: [['#3e7a2e', '#6aa64e'], ['#468634', '#76b456'], ['#3a722a', '#62a046']], under: '#5e8a48', seg: [8, 3] } },
  // Echinodorus 'Ozelot': a mid-sized sword, broader leaves speckled maroon, younger leaves a little redder
  ozelot: { grow: { speed: 'medium', overflow: 'emerge', len: [80, 500], more: 4 }, sway: 0.25, form: 'rosette', n: [12, 18], spread: 0.05, stalk: '#4a6a2c', leaf: {
    len: [0.75, 1], wid: 0.22, prof: [0.7, 0.75], rise: [0.08, 0.8], arch: 0.4, twist: 0.4, fold: -0.12, wave: [0.04, 3], pet: 0.25,
    cols: [['#3a6e2c', '#64984a'], ['#42762e', '#70a252'], ['#4a6a2c', '#76904a']], under: '#5a7a46', rib: '#a8c690',
    spots: { col: '#5e2a1e', n: [14, 24], r: 0.035 }, seg: [24, 7] },
    emersed: { k: 0.95, stiff: 210, land: 70, wid: 0.26, prof: [0.6, 0.6], pet: 0.5, twist: 0.15, fold: -0.08, wave: [0.01, 2],
      cols: [['#2e5a24', '#4a7e38'], ['#34622a', '#52863e']], under: '#4a6a3a', rib: '#88b070' } },
  // Java moss (Taxiphyllum barbieri): a low ragged mound of tiny dark fronds over a dark core, on the ground or lifted
  // onto wood or rock. Frond length: a fraction of the mound's height
  moss: { grow: { speed: 'medium', overflow: 'none', len: [20, 100], more: 6 }, sway: 0.05, form: 'moss', n: [280, 340], spread: 0.95, stalk: '#16281a', leaf: {
    len: [0.07, 0.13], wid: 0.55, prof: [0.6, 0.5], rise: [0, 0], arch: 0.8, twist: 1.2, fold: 0.2, wave: [0, 0], pet: 0,
    cols: [['#1e3a1c', '#3a6230'], ['#24421e', '#426c36'], ['#1a341a', '#34582c'], ['#22401c', '#3e6a2e']], under: '#2a4a26', seg: [2, 3] } },
  // Red root floaters (Phyllanthus fluitans): small rosettes of round, cupped leaves, green to bronze-red, red roots.
  // Leaf length in mm (like the carpet)
  redroot: { grow: { speed: 'fast', overflow: 'spread', len: [60, 600], more: 1 }, sway: 0, form: 'float', n: [0, 0], spread: 1, stalk: '#7a3e34', float: { per: [2.5, 3.2], leaves: [5, 7], roots: [1, 3], rootLen: [12, 45] }, leaf: {
    len: [6, 10], wid: 0.95, prof: [1, 0.55], rise: [1.35, 1.5], arch: 0.05, twist: 0.2, fold: 0.35, wave: [0, 0], pet: 0.05,
    cols: [['#3e7a2e', '#7ab04e'], ['#4a7e30', '#86b858'], ['#447a2c', '#7eae4c'], ['#5e6a2c', '#94984a'], ['#7a3a28', '#a85a3e']], under: '#7a4a3a', seg: [2, 4] } },
  // Salvinia: floating chains of paired oval leaves, cupped and velvety pale green, short brown roots
  salvinia: { grow: { speed: 'fast', overflow: 'spread', len: [60, 600], more: 1 }, sway: 0, form: 'float', n: [0, 0], spread: 1, stalk: '#4e3e2a', float: { per: [2.5, 3.5], leaves: [4, 8], roots: [1, 2], rootLen: [8, 25] }, leaf: {
    len: [8, 13], wid: 0.75, prof: [0.9, 0.55], rise: [1.3, 1.5], arch: 0.05, twist: 0.1, fold: 0.5, wave: [0, 0], pet: 0,
    cols: [['#4a7e30', '#86b858'], ['#548836', '#92c262'], ['#46782c', '#7eb052']], under: '#6a8a4a', seg: [2, 4] } },
  // Amazon frogbit (Limnobium laevigatum): rosettes of round, glossy, slightly cupped leaves on short stalks, spongy
  // and pale underneath; long fine pale roots (lane GR2)
  frogbit: { grow: { speed: 'fast', overflow: 'spread', len: [70, 700], more: 1 }, sway: 0, form: 'float', n: [0, 0], spread: 1, stalk: '#b8b898', float: { per: [0.45, 0.6], leaves: [4, 6], roots: [3, 6], rootLen: [40, 140] }, leaf: {
    len: [16, 28], wid: 0.95, prof: [1, 0.45], rise: [1.3, 1.48], arch: 0.05, twist: 0.1, fold: 0.18, wave: [0, 0], pet: 0.3,
    cols: [['#3a7a2a', '#6cb04a'], ['#42842e', '#78bc54'], ['#367226', '#64a844']], under: '#8a9a6a', rib: '#8cc070', seg: [4, 7] } },
  // Water lettuce (Pistia stratiotes): open rosettes of thick, velvety, ridged, pale grey-green leaves, broadest at the
  // tip; feathery dark roots (lane GR2)
  lettuce: { grow: { speed: 'medium', overflow: 'spread', len: [90, 700], more: 1 }, sway: 0, form: 'float', n: [0, 0], spread: 1, stalk: '#4a4636', float: { per: [0.13, 0.18], leaves: [7, 11], roots: [6, 10], rootLen: [40, 110] }, leaf: {
    len: [28, 55], wid: 0.62, prof: [1.7, 0.6], rise: [0.55, 1.25], arch: 0.45, twist: 0.1, fold: 0.3, wave: [0.04, 7], pet: 0,
    cols: [['#6e905a', '#a2be86'], ['#7a9a64', '#aac48c'], ['#729a5e', '#a6c48a']], under: '#b4c0a0', seg: [8, 7] } },
  // Tiger lotus (Nymphaea zenkeri): a bulb with broad, rounded, red leaves blotched dark maroon; grown on, it sends lily
  // pads up on long stalks to lie on the water (lane GR2). Size = the submersed leaves' height
  lotus: { grow: { speed: 'fast', overflow: 'spread', len: [40, 250], more: 3 }, sway: 0.15, form: 'rosette', n: [7, 11], spread: 0.08, stalk: '#5a2a26', leaf: {
    len: [0.7, 1], wid: 0.72, prof: [0.5, 0.55], rise: [0.25, 1.05], arch: 0.3, twist: 0.2, fold: 0.06, wave: [0.03, 4], pet: 0.4,
    cols: [['#6e2424', '#a4443a'], ['#7a2a26', '#b05040'], ['#82322a', '#b45a44']], under: '#4e1e2a', rib: '#c0705a',
    spots: { col: '#34121a', n: [10, 18], r: 0.07 }, seg: [10, 7] },
    pads: { n: [1, 7], from: 0.35, len: [60, 130], out: 220, stalk: '#5a3a26', leaf: {
      len: [1, 1], wid: 0.95, prof: [0.75, 0.35], rise: [1.5708, 1.5708], arch: 0, twist: 0, fold: 0.04, wave: [0.01, 3], pet: 0,
      cols: [['#3e6a2a', '#5e8a3e'], ['#5a5a2a', '#7e7a40'], ['#6a3a26', '#8e5a3a']], under: '#6e2a2e', spots: { col: '#4a1e1a', n: [6, 14], r: 0.08 }, seg: [8, 9] } } },

  // ---------- Land plants (lane T2, 2026-10-16): terrarium plants, grown above water (no current: sway 0) ----------
  // Golden pothos (Epipremnum aureum): long vines of glossy heart-shaped leaves streaked gold; some climb up behind it,
  // the rest trail along the ground or hang down off what it sits on. Size = the longest vine. Leaf length in mm
  pothos: { land: true, grow: { speed: 'fast', overflow: 'trail', len: [80, 1800], more: 2.5 }, sway: 0, form: 'vine', n: [4, 6], spread: 0.15, stalk: '#5e7a34',
    vine: { climb: 0.4, node: 30, back: 0.35, fan: 0.55, thick: 1.8, wander: 0.35, branch: 1, follow: 0.6 }, leaf: {
    len: [48, 92], wid: 0.8, prof: [0.45, 0.45], rise: [0.9, 1.35], arch: 0.55, twist: 0.2, fold: 0.12, wave: [0.015, 2], pet: 0.3,
    cols: [['#22501e', '#3a742c'], ['#285a22', '#427e32'], ['#204a1c', '#386e2c']], under: '#4e7038', rib: '#7aa04e',
    spots: { col: '#c4b85a', n: [1, 5], r: 0.09 }, seg: [10, 7] } },
  // Neoregelia-type bromeliad: a stiff open rosette of broad, channelled straps, olive-green flushing wine-red into the
  // heart (the cup), maroon underneath; sits on wood or cork like an epiphyte. Grown on, it puts out a pup
  bromeliad: { land: true, grow: { speed: 'slow', overflow: 'none', len: [50, 320], more: 4, prop: true }, sway: 0, form: 'rosette', n: [18, 26], crowns: [1, 1], spread: 0.05, stalk: '#4a5a2a', leaf: {
    len: [0.55, 0.8], wid: 0.3, prof: [0.2, 0.12], rise: [0.6, 1.35], arch: 0.6, twist: 0.1, fold: 0.3, wave: [0.01, 2], pet: 0,
    cols: [['#3e6a2a', '#5e8e3e'], ['#447030', '#66944a'], ['#4a6a2c', '#6a8e44']], under: '#6a4a3a', heart: ['#b02a3e', 0.35], seg: [12, 7] } },
  // Tropical fern (Nephrolepis-type, Boston / sword fern): arching fronds of many small leaflets, a fine-textured mass
  tropfern: { land: true, grow: { speed: 'medium', overflow: 'none', len: [60, 480], more: 3 }, sway: 0, form: 'rosette', n: [16, 24], crowns: [1, 3], spread: 0.15, stalk: '#5a6a34', leaf: {
    len: [0.7, 1], wid: 0.012, prof: [1, 0.3], rise: [0.25, 1.3], arch: 1.15, twist: 0.25, fold: 0, wave: [0, 0], pet: 0.12,
    cols: [['#3e7a2e', '#5a9640']], under: '#5a8040', seg: [24, 3],
    pinnae: { n: [36, 44], ang: 1.15, prof: [0.6, 0.5], leaf: {
      len: [0.12, 0.14], wid: 0.26, prof: [0.7, 0.6], rise: [0, 0], arch: 0.2, twist: 0, fold: 0.25, wave: [0, 0], pet: 0,
      cols: [['#3a7a2c', '#62a046'], ['#42822e', '#6aa84c'], ['#367226', '#5a9840']], under: '#6a9050', seg: [3, 3] } } } },
  // Fittonia (nerve plant): a low, spreading mound of soft oval leaves, dark green netted with bright pink veins
  fittonia: { land: true, grow: { speed: 'medium', overflow: 'none', len: [35, 160], more: 4, shoots: 1.5 }, sway: 0, form: 'stem', n: [10, 16], nodes: 4, lean: 3, cap: 1.3, spread: 0.55, stalk: '#6a4a3e', leaf: {
    len: [0.62, 0.72], wid: 0.62, prof: [0.85, 0.55], rise: [1.1, 1.5], arch: 0.3, twist: 0.15, fold: 0.18, wave: [0.01, 2], pet: 0.12,
    cols: [['#1e3a1e', '#2a4a26'], ['#22401e', '#2e5028']], under: '#5a6a4a', veins: { col: '#d8687e', n: 5, w: 0.11 }, seg: [12, 9] } },
  // Sphagnum moss: soft, springy cushions of small starry heads, lime-green to straw, a few blushing pink-brown
  sphagnum: { land: true, grow: { speed: 'slow', overflow: 'none', len: [20, 90], more: 5 }, sway: 0, form: 'moss', n: [420, 500], heads: 0.15, spread: 0.95, stalk: '#3e4a22', leaf: {
    len: [0.1, 0.16], wid: 0.42, prof: [0.6, 0.5], rise: [0, 0], arch: 0.3, twist: 0.8, fold: 0.35, wave: [0, 0], pet: 0,
    cols: [['#4a6a2a', '#7a9a44'], ['#527430', '#86a44c'], ['#5e7a32', '#94aa56'], ['#46602a', '#72903e'], ['#6e6a3c', '#9a9058']], under: '#5a6a34', seg: [2, 3] } },
  // Creeping fig (Ficus pumila): a flexible vine of small round-heart leaves that climbs flat up the back wall and links
  // up branches; mostly climbers. Size = the longest vine
  creeper: { land: true, grow: { speed: 'medium', overflow: 'trail', len: [60, 1400], more: 3 }, sway: 0, form: 'vine', n: [8, 12], spread: 0.25, stalk: '#6a6a3a',
    vine: { climb: 0.85, node: 11, back: 0.5, fan: 0.85, thick: 0.9, wander: 0.6, branch: 3, follow: 0.6, wrap: 140 }, leaf: {
    len: [14, 26], wid: 0.78, prof: [0.5, 0.55], rise: [1.15, 1.45], arch: 0.25, twist: 0.15, fold: 0.15, wave: [0, 0], pet: 0.18,
    cols: [['#2e5a24', '#4a7e36'], ['#34622a', '#52863c'], ['#2a5422', '#467a34']], under: '#5a7a46', seg: [5, 5] } },

  // ---------- Succulents (lane CP, 2026-10-16): the arid starter's plants, drawn dry; slow, high light, hardly any care ----------
  // Echeveria: a tight rosette of thick, spoon-shaped blue-grey leaves, the tips blushing pink; inner leaves stand up cupped
  echeveria: { land: true, grow: { speed: 'slow', overflow: 'none', len: [30, 150], more: 3, prop: true }, cap: 1.5, sway: 0, form: 'rosette', n: [60, 80], crowns: [1, 1], spread: 0.03, stalk: '#7a8a72', leaf: {
    len: [0.5, 1], wid: 0.6, prof: [1.2, 0.45], rise: [0.1, 1.1], arch: -0.05, twist: 0.05, fold: 0.3, thick: 0.4, wave: [0, 0], pet: 0,
    cols: [['#6f8f86', '#9bb8ac'], ['#7a9a8e', '#a6c2b4'], ['#6a8a84', '#94b0a6']], under: '#86a498', tip: ['#c4687a', 0.22], seg: [8, 5] } },
  // Haworthia (zebra type): a small rosette of stiff, pointed, dark leaves banded with white tubercles
  haworthia: { land: true, grow: { speed: 'slow', overflow: 'none', len: [25, 110], more: 3, prop: true }, cap: 1.6, sway: 0, form: 'rosette', n: [14, 22], crowns: [1, 3], spread: 0.1, stalk: '#4a5a3a', leaf: {
    len: [0.5, 0.95], wid: 0.4, prof: [0.6, 0.5], rise: [0.08, 0.75], arch: 0.2, twist: 0.05, fold: 0.15, thick: 0.5, wave: [0, 0], pet: 0,
    cols: [['#26462a', '#46743c'], ['#2c4e2e', '#4c7a42']], under: '#4a6e3e', spots: { col: '#e8f0e0', n: [12, 24], r: 0.022 }, seg: [8, 5] } },
  // Jade plant (Crassula ovata): a thick brown trunk branching into fat, glossy, oval leaves in pairs, red at the rims
  jade: { land: true, grow: { speed: 'slow', overflow: 'none', len: [50, 420], more: 3, shoots: 1 }, sway: 0, form: 'stem', n: [2, 3], nodes: 7, lean: 0.8, stemK: 0.03, spread: 0.18, stalk: '#7a6a52', leaf: {
    len: [0.14, 0.2], wid: 0.8, prof: [1, 0.5], rise: [0.8, 1.45], arch: 0.2, twist: 0.1, fold: 0.25, thick: 0.7, wave: [0, 0], pet: 0,
    cols: [['#2e6a3a', '#58a060'], ['#34723e', '#62aa66'], ['#2a6236', '#4e9658']], under: '#4a8a52', tip: ['#b04a3e', 0.18], seg: [5, 5] } },
  // Small aloe (Aloe vera type): thick, upright, spear-shaped grey-green leaves, flecked cream, a brown tip
  aloe: { land: true, grow: { speed: 'slow', overflow: 'none', len: [40, 240], more: 3, prop: true }, cap: 1.5, sway: 0, form: 'rosette', n: [12, 18], crowns: [1, 1], spread: 0.04, stalk: '#5a7a52', leaf: {
    len: [0.7, 1], wid: 0.17, prof: [0.6, 0.65], rise: [0.05, 0.85], arch: 0.3, twist: 0.1, fold: 0.5, thick: 0.55, wave: [0, 0], pet: 0,
    cols: [['#4a7a56', '#74a47c'], ['#52825c', '#7aaa84']], under: '#5e8a62', tip: ['#7a6a4a', 0.08], spots: { col: '#d6e4cc', n: [6, 14], r: 0.02 }, seg: [10, 5] } },
  // Burro's tail (Sedum morganianum): trailing stems packed with plump, pale blue-green teardrop leaves
  burrotail: { land: true, grow: { speed: 'slow', overflow: 'trail', len: [50, 500], more: 2.5 }, sway: 0, form: 'vine', n: [4, 6], spread: 0.1, stalk: '#7a9a84',
    vine: { climb: 0, node: 6, back: 0, fan: 1.3, thick: 3.2, wander: 0.2, follow: 0.8 }, leaf: {
    len: [13, 18], wid: 0.7, prof: [0.8, 0.7], rise: [0.9, 1.4], arch: 0.1, twist: 0.2, fold: 0.5, thick: 0.9, wave: [0, 0], pet: 0,
    cols: [['#6a9a84', '#98c4aa'], ['#74a48c', '#a0ccb2']], under: '#88b09a', seg: [3, 4] } },
  // Barrel cactus (Echinocactus type): a squat ribbed ball of green with rows of pale spines
  barrel: { land: true, grow: { speed: 'slow', overflow: 'none', len: [30, 150], more: 1.5, prop: true }, cap: 1.2, sway: 0, form: 'rosette', n: [14, 18], crowns: [1, 1], spread: 0.02, stalk: '#3a6a3a', leaf: {
    len: [1, 1], wid: 0.7, prof: [0.5, 0.45], rise: [0.8, 1.2], arch: -1.8, twist: 0, fold: 0.1, thick: 0.8, wave: [0, 0], pet: 0,
    cols: [['#2a5a34', '#42744a'], ['#2e6038', '#487a4e']], under: '#2a5a34', tip: ['#e8dcb0', 0.1], seg: [10, 5] } },

  // Snake plant (Sansevieria / Dracaena trifasciata): stiff, upright, sword-shaped leaves, dark green banded, yellow rims
  sansevieria: { land: true, grow: { speed: 'slow', overflow: 'none', len: [60, 420], more: 3, prop: true }, cap: 1.4, sway: 0, form: 'rosette', n: [7, 11], crowns: [1, 2], spread: 0.12, stalk: '#3a5a2e', leaf: {
    len: [0.7, 1], wid: 0.16, prof: [0.7, 0.6], rise: [0.02, 0.28], arch: 0.1, twist: 0.25, fold: 0.15, thick: 0.45, wave: [0, 0], pet: 0,
    cols: [['#7e8a3a', '#2e5a34'], ['#88903e', '#366238'], ['#747e36', '#2a5030']], under: '#3a6a3c', spots: { col: '#8aae7a', n: [14, 22], r: 0.05 }, seg: [12, 5] } },
  // Agave (small, Agave americana / Parryi type): a tight rosette of thick, stiff, blue-grey spears with a dark tip
  agave: { land: true, grow: { speed: 'slow', overflow: 'none', len: [40, 260], more: 3, prop: true }, cap: 1.4, sway: 0, form: 'rosette', n: [22, 32], crowns: [1, 1], spread: 0.03, stalk: '#6a8a7a', leaf: {
    len: [0.6, 1], wid: 0.17, prof: [0.65, 0.6], rise: [0.08, 1.0], arch: 0.1, twist: 0.05, fold: 0.35, thick: 0.6, wave: [0, 0], pet: 0,
    cols: [['#6a8a86', '#9ab4ae'], ['#72928c', '#a2bab2']], under: '#7a9a92', tip: ['#5a3a2a', 0.07], seg: [10, 5] } },
  // Columnar cactus (Cereus type): a tall, ribbed, blue-green column with pale spines
  columnar: { land: true, grow: { speed: 'slow', overflow: 'none', len: [60, 420], more: 1.5, prop: true }, cap: 1.2, sway: 0, form: 'rosette', n: [10, 12], crowns: [1, 1], spread: 0.02, stalk: '#3a6a4a', leaf: {
    len: [1, 1], wid: 0.17, prof: [0.4, 0.4], rise: [0.12, 0.22], arch: -0.2, twist: 0, fold: 0.1, thick: 0.9, wave: [0, 0], pet: 0,
    cols: [['#3a6a56', '#58907a'], ['#3e705a', '#5c9480']], under: '#3a6a56', tip: ['#e8dcb0', 0.06], seg: [12, 5] } },
  // ---------- Aquatic follow-ons (lane T2, roadmap section 6; Monte Carlo stays the existing carpet: Nathan 2026-10-14) ----------
  // Dwarf hairgrass (Eleocharis acicularis): dense tufts of needle-fine bright green blades on runners, a fine lawn
  hairgrass: { grow: { speed: 'medium', overflow: 'spread', len: [25, 140], more: 10 }, sway: 0.35, form: 'rosette', n: [320, 420], lawn: 2400, crowns: [9, 14], spread: 0.9, stalk: '#4a7a30', leaf: {
    len: [0.5, 1], wid: 0.014, prof: [1, 0.2], rise: [0.04, 0.6], arch: 0.5, twist: 0.4, fold: 0, wave: [0, 0], pet: 0,
    cols: [['#3e8a2e', '#6ab84e'], ['#468e34', '#74bc56'], ['#3a8028', '#62ae46']], under: '#5e9a48', seg: [6, 3] } },
  // Hornwort (Ceratophyllum demersum): bushy stems of whorled, stiff, needle-like dark green leaves, a foxtail at each tip
  hornwort: { grow: { speed: 'fast', overflow: 'trail', len: [80, 900], more: 4, shoots: 1.5 }, sway: 0.55, form: 'stem', n: [5, 8], nodes: 34, whorl: 9, lean: 1.6, spread: 0.9, stalk: '#3a5a26', leaf: {
    len: [0.075, 0.095], wid: 0.05, prof: [1, 0.35], rise: [0.35, 0.9], arch: -0.25, twist: 0.3, fold: 0, wave: [0, 0], pet: 0,
    cols: [['#2a5a20', '#467e32'], ['#2e6224', '#4c8638'], ['#264e1e', '#3e722e']], under: '#3e6a30', seg: [5, 3] } },
  // Anacharis (Egeria densa): long stems densely set with whorls of small, bright green strap leaves, curled back
  anacharis: { grow: { speed: 'fast', overflow: 'trail', len: [80, 900], more: 4, shoots: 1 }, sway: 0.6, form: 'stem', n: [5, 8], nodes: 46, whorl: 4, lean: 1.6, spread: 0.9, stalk: '#5a8a3a', leaf: {
    len: [0.065, 0.08], wid: 0.17, prof: [0.8, 0.45], rise: [0.9, 1.45], arch: 0.45, twist: 0.2, fold: 0.1, wave: [0, 0], pet: 0,
    cols: [['#3a7a2a', '#5e9e42'], ['#428430', '#66a648'], ['#367026', '#58963e']], under: '#5a8a46', seg: [4, 3] } },
};

/** Growth when a plant has none of its own: the growth at which the species reaches its saved size (0..1). */
export function growthOf(type: PlantType, size: number) {
  const g = PLANT3D[type]?.grow;
  if (!g) return 0.5;
  return Math.min(1, Math.max(0, Math.log(Math.max(1e-3, size) / g.len[0]) / Math.log(g.len[1] / g.len[0])));
}
/** The species' size (mm) at growth g. */
export function growthLen(type: PlantType, g: number) {
  const s = PLANT3D[type]?.grow;
  return s ? s.len[0] * (s.len[1] / s.len[0]) ** Math.min(1, Math.max(0, g)) : 100;
}
/** A plant's own size at its growth: its saved size at growthOf(size), up or down from there by the species' curve
 *  (a saved size outside the species' range keeps its own scale). */
export function grownSize(type: PlantType, size: number, growth?: number) {
  if (growth == null) return size;
  return size * growthLen(type, growth) / growthLen(type, growthOf(type, size));
}
