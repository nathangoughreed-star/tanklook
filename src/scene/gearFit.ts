// Discovery v2, lane AB5: the design's gear must be able to produce what is DRAWN, not merely keep it alive. Run on every candidate before it is judged and priced:
//   - plants that REQUIRE injected CO2 set the design's feed to CO2 (the demand model then prices the kit and its refills); with a "No CO2" requirement they are left out instead, so the scape is drawn as it would grow without;
//   - plants that want more light than the design's own light gives get the smallest stronger light (a purchase the gear prices); if no light reaches them, or the light is owned / required and too weak, the plants it cannot carry are left out.
// CO2 is added only when a drawn species requires it (it changes what grows); "recommended" CO2 never forces it. Pure; returns the scene (a copy) and what it did, in words.
import { NEEDS, type PlantNeed } from './lightneeds';
import { dropPlants, strongerLight, strugglingPlants } from './combine';
import { layerOf } from './items';
import { isFloat } from '../art/plants';
import type { TankSetup } from './types';

const needsCo2 = (v: string): boolean => { const n = NEEDS[v] as PlantNeed | undefined; return !!n && (n as { co2?: string }).co2 === 'required'; };
export interface GearFit { scene: TankSetup; said: string[] }
export function fitGear(S: TankSetup, o: { noCo2?: boolean } = {}): GearFit {
  let scene = S, said: string[] = [];
  if (!S.water.on || !S.items.some(i => layerOf(i) === 'plant')) return { scene, said };
  const co2 = S.items.filter(i => layerOf(i) === 'plant' && !isFloat(i.variant) && needsCo2(i.variant));
  if (co2.length) {
    if (o.noCo2) { const d = dropPlants(scene, new Set(co2.map(i => i.uid!).filter(Boolean))); if (d) { scene = d.scene; said.push(`left out ${co2.length} plant${co2.length > 1 ? 's' : ''} that need injected CO2 (you said no CO2)`); } }
    else if (scene.grow.feed !== 'co2') { scene = structuredClone(scene); scene.grow = { ...scene.grow, feed: 'co2' }; said.push('CO2 injection, because the plants drawn need it'); }
  }
  if (o.noCo2 && scene.grow.feed === 'co2') { scene = structuredClone(scene); scene.grow = { ...scene.grow, feed: 'ferts' }; said.push('no CO2 system (you said no CO2); plain fertilizer instead'); }
  const L = strongerLight(scene); if (L) { scene = L.scene; said.push(L.said); }
  const sad = strugglingPlants(scene); if (sad.length) { const d = dropPlants(scene, new Set(sad)); if (d) { scene = d.scene; said.push(d.said); } }
  return { scene, said };
}
