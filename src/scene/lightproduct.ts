// A catalogued light on the tank (2026-10-20, Nathan: the Amazon best sellers modelled as the real products). Picking one
// writes its fixture into LightSettings so the EXISTING light model (lightout.ts) runs on it: an LED bar (bar, rim-leg slab,
// submersible stick) or one LED puck (the gooseneck nano), its lamp, its watts and, when published, its PAR. None of the 18
// publishes a PAR, so the model's estimate from the watts stands, and the UI says so.
import { lightProduct, type LightMount, type LightProduct } from '../data/gearCatalog';
import { TECHS, fitFixture } from './lightout';
import type { LightSettings, Tank } from './types';

/** How high each mount holds the LEDs above the rim (mm), read off the product photos: a bracket bar sits just above the
 *  rim, the rim-leg slab on its legs about 60 mm up, the nano disc on its neck. The submersible stick hangs in the water
 *  (SUB_DROP under the surface, lightout.ts lightEnv puts its emitters there), so its height is the rim's (0). ESTIMATES. */
export const MOUNT_H: Record<LightMount, number> = { bar: 25, 'rim-legs': 60, gooseneck: 80, submersible: 0, hanging: 200 };

/** The model against published LED-bar readings (reference/par-calibration-data.md D3: 9 bars, 5-65 W, in air, under the bar at
 *  12-14 in, Portland Aquarium round-up, grade C): the median of model / published, as percent BELOW (white-LED / planted-RGB lamps).
 *  Pinned by test/lightfollowups.test.ts. So a 12 W bar's ~70 PAR is not high against these; they are mid-priced brands, and a
 *  budget bar's driver may sit under them, which no reading we found settles. */
export const BAR_CHECK = { n: 9, lowPct: 42, highPct: 42 };

/** How many boxes of a hanging fixture the tank's length takes: its published coverage, else one. */
export const hangingUnits = (T: Pick<Tank, 'L'>, p: Pick<LightProduct, 'coverageMm'>) => (p.coverageMm ? Math.max(1, Math.ceil(T.L / p.coverageMm)) : 1);

/** Put `p` on the light (undefined: back to the generic fixture, everything else kept). */
export function applyLightProduct(l: LightSettings, T: Tank, p: LightProduct | undefined) {
  if (!p) { delete l.product; return; }
  l.product = p.id; l.tech = p.tech; l.count = 1; l.rows = 1; l.mount = 'legs';
  delete l.par; delete l.bulbW; delete l.pos; delete l.hoodLed;
  const spot = p.mount === 'gooseneck' || p.mount === 'hanging';
  if (spot) { l.type = 'spot'; l.pattern = 'grid'; l.spacing = 0; } else l.type = 'led';
  fitFixture(l, T, true);
  l.height = MOUNT_H[p.mount];
  if (p.mount === 'gooseneck') l.cone = 100; // a bare nano disc, no optic: a wide beam (ESTIMATE)
  // a hanging reef fixture: one box per published coverage of the tank's length (one when none is published: the light check then
  // says whether it carries the tank), the watts per box, the beam angle when the maker gives it (else a wide one, ESTIMATE)
  const units = p.mount === 'hanging' ? hangingUnits(T, p) : 1;
  if (p.mount === 'hanging') { l.count = units; l.cone = p.beamDeg ?? 100; }
  l.watts = p.watts * units; l.kelvin = p.kelvin ?? TECHS[p.tech].k[2];
  if (p.par && p.par > 0) l.par = p.par;
}

/** The product on the light, if it is still one (a fixture or lamp changed by hand since leaves it the generic one). */
export const productOn = (l: Pick<LightSettings, 'product'>) => lightProduct(l.product);

/** What the numbers rest on, for the picker: watts published or estimated, PAR published or estimated from the watts. */
export function lightProductNote(p: LightProduct): string {
  const w = p.est?.includes('watts') ? `${p.watts} W (estimated: not published)` : `${p.watts} W`;
  const cover = p.mount === 'hanging' ? (p.coverageMm ? ` One covers about ${Math.round(p.coverageMm / 25.4)} in of tank length.` : ' Coverage not published: one fixture is placed, and the light check says whether it carries the tank.') : '';
  const par = p.par ? `PAR ${p.par} (published)` : `PAR not published: estimated from the ${p.watts} W by the light model (LED, about ±${Math.round(TECHS[p.tech].unc * 100)} %)`;
  // the one outside check there is (test/lightfollowups.test.ts): the model against published bar readings
  return `${w}. ${par}.${cover}${p.par || (p.mount !== 'bar' && p.mount !== 'rim-legs') ? '' : ` Assumption, not a measurement: the model reads ${BAR_CHECK.lowPct === BAR_CHECK.highPct ? BAR_CHECK.lowPct : `${BAR_CHECK.lowPct}-${BAR_CHECK.highPct}`} % below ${BAR_CHECK.n} published bar readings (mid-priced brands, in air); a budget bar's driver may fall short of those.`}`;
}
