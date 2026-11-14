// UI2 shell step 6 (lane S6): the Lighting group of the Light category and the Light map controls (screen map §2a "Section Equipment", inventory rows 146, 147).
// Pure view-models; the edits write `S.light` / `S.render` through store.edit exactly as the old Lighting section does.
import { lightOutCached, wattsOf } from '../../scene/lightout';
import { withHoodLight, hoodOf } from '../../data/hoods';
import { productOn } from '../../scene/lightproduct';
import { productName } from '../../data/gearCatalog';
import type { TankSetup } from '../../scene/types';

export interface LightView {
  /** "Mount: Fluval Plant 3.0, 32 W" or "Hood: ..., 22 W built in" or "Generic LED, 24 W" */
  name: string;
  watts: number;
  /** PAR on the substrate, or null when no power is set */
  par: number | null;
  parText: string;
  /** a hood's light cannot be swapped without taking the hood off */
  inHood: boolean;
}
export function lightView(S: TankSetup): LightView {
  const T = withHoodLight(S), hood = S.lid === 'hood' ? hoodOf(S) : undefined, p = productOn(S.light), w = wattsOf(T);
  const o = w > 0 ? lightOutCached(T) : null, par = o ? Math.round(o.mean) : null;
  const inHood = !!hood && !S.light.product;
  const name = inHood ? `${productName(hood!)} hood, ${hood!.light.watts} W built in` : p ? `${productName(p)}, ${p.watts} W` : w > 0 ? `Generic light, ${Math.round(w)} W` : 'No light power set';
  return { name, watts: Math.round(w), par, parText: par === null ? 'Set the light\'s power to see PAR.' : `About ${par} PAR on the substrate (${p?.par ? 'published figure' : 'estimated from the watts'}).`, inHood };
}

export type MapUnit = 'par' | 'lux';
export interface MapView {
  on: boolean;
  /** the map needs a fixture: a flat (no) light cannot draw one */
  canShow: boolean;
  whyNot: string;
  unit: MapUnit;
  step: number; stepMin: number; stepMax: number; stepStep: number; stepUnit: string;
  slice: number;
  note: string;
}
export function mapView(S: TankSetup): MapView {
  const l = S.light, unit: MapUnit = l.mapUnit ?? 'par', lux = unit === 'lux', canShow = l.type !== 'flat' || S.lid === 'hood';
  return {
    on: S.render.beams && canShow, canShow, whyNot: canShow ? '' : 'No fixture yet: pick a light first to see the light map.',
    unit, step: lux ? l.mapStepLux ?? 500 : l.mapStep ?? 10, stepMin: lux ? 250 : 5, stepMax: lux ? 5000 : 100, stepStep: lux ? 250 : 5, stepUnit: lux ? 'lux' : 'PAR',
    slice: l.mapSlice ?? 0,
    note: S.render.beams && S.light.type !== 'flat' && !S.substrate.show ? 'The map needs a floor to draw on: turn the substrate on.' : 'The map draws the light on the substrate and hides plants, hardscape and animals while it is on.',
  };
}
export const setMapOn = (S: TankSetup, on: boolean): void => { S.render.beams = on; };
export const setMapUnit = (S: TankSetup, u: MapUnit): void => { S.light.mapUnit = u; };
export const setMapStep = (S: TankSetup, v: number): void => { if ((S.light.mapUnit ?? 'par') === 'lux') S.light.mapStepLux = v; else S.light.mapStep = v; };
export const setMapSlice = (S: TankSetup, v: number): void => { if (v > 0) S.light.mapSlice = v; else delete S.light.mapSlice; };
