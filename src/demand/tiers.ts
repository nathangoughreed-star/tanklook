// Minimum viable vs ideal (lane GV4, 2026-10-30; contract in research/design/guided-flow-plan.md). A new view on existing numbers, no engine
// number moves. Minimum = the animal-care essentials only: the tank, a filter and heater, a basic light, water care and the animals, with
// no plants, hardscape or stand (the brief's `phased` meaning, minus the animals' own phase). Ideal = the full build as the scene stands.
import type { TankSetup } from '../scene/types';
import type { AnimalCount } from '../scene/tankfit';
import { buildTotals } from '../scene/tankfit';
import type { TankModel } from '../data/tanks';
import { demandOf } from './engine';
import type { Demand, UserProfile } from './types';

export type Totals = Demand['totals'];
export interface CostTiers { minimum: Totals; ideal: Totals }

const clampDown = (a: Totals, b: Totals): Totals => ({
  setupUsd: Math.min(a.setupUsd, b.setupUsd), upkeepUsdMo: Math.min(a.upkeepUsdMo, b.upkeepUsdMo), minPerWeek: Math.min(a.minPerWeek, b.minPerWeek),
  riskRaw: Math.min(a.riskRaw, b.riskRaw), risk: Math.min(a.risk, b.risk),
});

/** The two tiers of a scene: `ideal` is the scene as it stands (gear a stock-first tank has not chosen yet is counted: this is the "good setup"
 *  for the stocking), `minimum` strips what the animals do not need to live. Minimum never exceeds ideal, field by field. */
export function costTiers(S: TankSetup, P: UserProfile): CostTiers {
  const full: TankSetup = { ...S, stockFirst: false };
  const lean: TankSetup = { ...full, items: full.items.filter(i => i.kind !== 'plant' && i.kind !== 'coral' && i.kind !== 'artificial'), stand: { ...full.stand, show: false } };
  const ideal = demandOf(full, P).totals;
  return { minimum: clampDown(demandOf(lean, P).totals, ideal), ideal };
}

/** The same two tiers for a roster that is not a scene yet (the stocking screen): these animals in this catalogue tank, cheapest build
 *  against balanced build (the engine's own two builds, scene/tankfit.ts). Minimum never exceeds ideal. */
export function rosterTiers(animals: AnimalCount[], tank: TankModel): CostTiers {
  const ideal = buildTotals(animals, tank, 'balanced');
  return { minimum: clampDown(buildTotals(animals, tank, 'cheapest'), ideal), ideal };
}
