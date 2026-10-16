// Light and care needs of every plant and coral variant (lane PG, 2026-10-16). The ONE place the PAR tier numbers live:
// ui/parGuide.ts draws its chart from TIERS, and the per-item checks and the starter-set filter read the same bands, so
// the guide and the advice cannot drift. Advice only: nothing here ever blocks placing an item.
//
// Sources: the PAR guide tiers (Nathan's chart, 2026-10-14), which follow the planted-tank convention (Tropica growing
// guides; Barr Report / Dr. Walstad low-tech notes; Diana Walstad's "Ecology of the Planted Aquarium"; the Aquarium
// Co-Op and Tropica light ratings) and reef practice (Reef2Reef / Advanced Aquarist PAR charts, Bulk Reef Supply:
// soft 50-150, LPS 75-150, SPS 150-400). A species' own range can differ by hobbyist; the ones marked `check` in the
// notes are the ones to review with Nathan.

export type Demand = 'none' | 'recommended' | 'required';
export type FreshBand = 'low' | 'medium' | 'high';
export type ReefBand = 'soft' | 'lps' | 'sps';
export type Dosing = 'none' | 'light' | 'regular' | 'daily';

export interface Tier { par: string; lo: number; hi: number; name: string }

/** Freshwater PAR at the substrate (µmol/m²/s). */
export const FRESH_TIERS: Tier[] = [
  { par: 'under 15', lo: 0, hi: 15, name: 'Very low' },
  { par: '15–30', lo: 15, hi: 30, name: 'Low' },
  { par: '30–50', lo: 30, hi: 50, name: 'Medium' },
  { par: '50–80', lo: 50, hi: 80, name: 'High' },
  { par: '80+', lo: 80, hi: 150, name: 'Very high' },
];
/** Reef PAR at the coral. Soft (50-150) and LPS (75-150) overlap on purpose, as in the guide. */
export const REEF_TIERS: Tier[] = [
  { par: '25–50', lo: 25, hi: 50, name: 'Fish only' },
  { par: '50–150', lo: 50, hi: 150, name: 'Soft corals' },
  { par: '75–150', lo: 75, hi: 150, name: 'LPS' },
  { par: '150–400', lo: 150, hi: 400, name: 'SPS and clams' },
];

/** The PAR range a band is happy in, built from the tiers: a plant is "fine" inside it, "too dim" below, "too bright"
 *  above. Low = the shade plants (anything under High: they collect algae from 50); medium = Low through High (15-80:
 *  most stems grow from 15-30 slowly, and the guide's High tier is where reds and carpets begin); high = High and up. */
export const FRESH_RANGE: Record<FreshBand, [number, number]> = {
  low: [0, FRESH_TIERS[3].lo],
  medium: [FRESH_TIERS[1].lo, FRESH_TIERS[4].lo],
  high: [FRESH_TIERS[3].lo, 400],
};
export const REEF_RANGE: Record<ReefBand, [number, number]> = {
  soft: [REEF_TIERS[1].lo, REEF_TIERS[1].hi],
  lps: [REEF_TIERS[2].lo, REEF_TIERS[2].hi + 50], // some LPS take up to 200 (guide)
  sps: [REEF_TIERS[3].lo, REEF_TIERS[3].hi],
};

export interface PlantNeed {
  band: FreshBand;
  co2: Demand;
  ferts: Demand;
  /** this species' own PAR range where it differs from its band's */
  par?: [number, number];
  /** a floater / carpet / stem etc., for the one-line tank summary */
  note?: string;
}
export interface CoralNeed { band: ReefBand; dosing: Dosing; par?: [number, number]; note?: string }
/** Terrarium plants live above the water: PAR in the water does not apply. */
export interface LandNeed { band: 'land' }

const P = (band: FreshBand, co2: Demand, ferts: Demand, extra: Partial<PlantNeed> = {}): PlantNeed => ({ band, co2, ferts, ...extra });
const C = (band: ReefBand, dosing: Dosing, par?: [number, number]): CoralNeed => (par ? { band, dosing, par } : { band, dosing });

/** One entry per LIBRARY plant / coral key (test/lightneeds.test.ts enforces it). */
export const NEEDS: Record<string, PlantNeed | CoralNeed | LandNeed> = {
  // low light, undemanding: epiphytes and shade rosettes
  anubias: P('low', 'none', 'none'),
  fern: P('low', 'none', 'none'),
  buce: P('low', 'none', 'recommended'),
  moss: P('low', 'none', 'none'),
  crypt: P('low', 'none', 'recommended'),
  balansae: P('low', 'none', 'recommended'),
  // medium: swords, grasses, easy stems; CO2 helps but is not required
  sword: P('medium', 'none', 'recommended'), // heavy root feeder: root tabs
  ozelot: P('medium', 'none', 'recommended'),
  grass: P('medium', 'none', 'recommended'),
  sagittaria: P('medium', 'recommended', 'recommended', { par: [15, 80] }),
  lotus: P('medium', 'none', 'recommended', { par: [20, 90] }),
  hornwort: P('medium', 'none', 'none', { par: [10, 80] }), // grows in any light, floats; check
  anacharis: P('medium', 'none', 'none', { par: [10, 80] }),
  stem: P('medium', 'recommended', 'recommended', { par: [30, 100] }), // generic stems: below ~30 only the slow green ones cope
  // high: reds and carpets
  stemred: P('high', 'required', 'required', { par: [40, 150] }),
  ludwigia: P('medium', 'recommended', 'recommended', { par: [30, 120] }), // reds from 40+
  rotala: P('high', 'recommended', 'required', { par: [35, 150] }),
  carpet: P('high', 'required', 'required'),
  hairgrass: P('high', 'recommended', 'recommended', { par: [30, 150] }),
  // floaters: surface plants take full light; they are the shade source (see shading, step 2)
  redroot: P('high', 'none', 'recommended', { par: [0, 400], note: 'floater' }),
  salvinia: P('medium', 'none', 'none', { par: [0, 400], note: 'floater' }),
  frogbit: P('medium', 'none', 'none', { par: [0, 400], note: 'floater' }),
  lettuce: P('medium', 'none', 'recommended', { par: [0, 400], note: 'floater' }),
  // land plants (terrarium)
  pothos: { band: 'land' }, bromeliad: { band: 'land' }, tropfern: { band: 'land' },
  fittonia: { band: 'land' }, sphagnum: { band: 'land' }, creeper: { band: 'land' },
  // succulents (lane CP): the PG tiers' high light, low care, no CO2 (they grow above water: the PAR is read at the plant)
  echeveria: P('high', 'none', 'none', { par: [50, 400], note: 'succulent' }),
  haworthia: P('high', 'none', 'none', { par: [30, 400], note: 'succulent' }), // shades a little: low end of the band
  jade: P('high', 'none', 'none', { par: [50, 400], note: 'succulent' }),
  aloe: P('high', 'none', 'none', { par: [50, 400], note: 'succulent' }),
  burrotail: P('high', 'none', 'none', { par: [50, 400], note: 'succulent' }),
  barrel: P('high', 'none', 'none', { par: [60, 400], note: 'succulent' }),
  sansevieria: P('high', 'none', 'none', { par: [10, 400], note: 'succulent' }), // takes almost any light
  agave: P('high', 'none', 'none', { par: [60, 400], note: 'succulent' }),
  columnar: P('high', 'none', 'none', { par: [60, 400], note: 'succulent' }),
  // reef
  mushroom: C('soft', 'none', [30, 100]), // lowest-light coral: bleaches shrink above ~100
  zoanthid: C('soft', 'light', [50, 200]),
  leather: C('soft', 'light'),
  macroalgae: C('soft', 'none', [40, 200]), // check: caulerpa and ogo grow in almost any reef light
  seafan: C('soft', 'regular', [30, 150]), // check: photosynthetic gorgonian assumed (non-photo fans need no light)
  hammer: C('lps', 'regular'),
  torch: C('lps', 'regular'),
  anemone: C('lps', 'regular', [100, 300]), // check: bubble-tip, steady 150+ is the usual advice
  montipora: C('sps', 'regular', [100, 250]), // guide: Montipora 150-250, lower end tolerated
  montiplate: C('sps', 'regular', [100, 250]),
  acropora: C('sps', 'daily', [250, 400]),
  acrofine: C('sps', 'daily', [250, 400]),
};

export const needOf = (variant: string) => NEEDS[variant];
export const isLand = (n: unknown): n is LandNeed => (n as LandNeed)?.band === 'land';
export const isCoralNeed = (n: unknown): n is CoralNeed => !!n && 'dosing' in (n as object);

/** The PAR range a need is happy in. */
export function parRange(n: PlantNeed | CoralNeed): [number, number] {
  if (n.par) return n.par;
  return isCoralNeed(n) ? REEF_RANGE[n.band] : FRESH_RANGE[n.band];
}

export type LightVerdict = 'dim' | 'fine' | 'bright';
/** Compare the PAR an item really gets with its range (a land plant is always fine). */
export function lightVerdict(variant: string, par: number): LightVerdict {
  const n = NEEDS[variant];
  if (!n || isLand(n)) return 'fine';
  const [lo, hi] = parRange(n);
  return par < lo ? 'dim' : par > hi ? 'bright' : 'fine';
}
