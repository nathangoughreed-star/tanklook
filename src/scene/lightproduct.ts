// A catalogued light on the tank (2026-10-20, Nathan: the Amazon best sellers modelled as the real products). Picking one
// writes its fixture into LightSettings so the EXISTING light model (lightout.ts) runs on it: an LED bar (bar, rim-leg slab,
// submersible stick) or one LED puck (the gooseneck nano), its lamp, its watts and, when published, its PAR. None of the 18
// publishes a PAR, so the model's estimate from the watts stands, and the UI says so.
import { lightProduct, type LightMount, type LightProduct } from '../data/gearCatalog';
import { TECHS, fitFixture } from './lightout';
import type { LightSettings, Tank } from './types';

/** How high each mount holds the LEDs above the rim (mm), read off the product photos: a bracket bar sits just above the
 *  rim, the rim-leg slab on its legs about 60 mm up, the nano disc on its neck; the submersible stick is under the
 *  water, so the model, which takes its lights from above, lights it at the surface (0). ESTIMATES. */
export const MOUNT_H: Record<LightMount, number> = { bar: 25, 'rim-legs': 60, gooseneck: 80, submersible: 0 };

/** Put `p` on the light (undefined: back to the generic fixture, everything else kept). */
export function applyLightProduct(l: LightSettings, T: Tank, p: LightProduct | undefined) {
  if (!p) { delete l.product; return; }
  l.product = p.id; l.tech = p.tech; l.count = 1; l.rows = 1; l.mount = 'legs';
  delete l.par; delete l.bulbW; delete l.pos; delete l.hoodLed;
  if (p.mount === 'gooseneck') { l.type = 'spot'; l.pattern = 'grid'; l.spacing = 0; } else l.type = 'led';
  fitFixture(l, T, true);
  l.height = MOUNT_H[p.mount];
  if (p.mount === 'gooseneck') l.cone = 100; // a bare nano disc, no optic: a wide beam (ESTIMATE)
  l.watts = p.watts; l.kelvin = p.kelvin ?? TECHS[p.tech].k[2];
  if (p.par && p.par > 0) l.par = p.par;
}

/** The product on the light, if it is still one (a fixture or lamp changed by hand since leaves it the generic one). */
export const productOn = (l: Pick<LightSettings, 'product'>) => lightProduct(l.product);

/** What the numbers rest on, for the picker: watts published or estimated, PAR published or estimated from the watts. */
export function lightProductNote(p: LightProduct): string {
  const w = p.est?.includes('watts') ? `${p.watts} W (estimated: not published)` : `${p.watts} W`;
  const par = p.par ? `PAR ${p.par} (published)` : `PAR not published: estimated from the ${p.watts} W by the light model (LED, about ±${Math.round(TECHS[p.tech].unc * 100)} %)`;
  return `${w}. ${par}.`;
}
