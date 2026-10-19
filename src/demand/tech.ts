// Demand rows from the tank's tech (lane TM step 3, 2026-10-19). A tank with `tech` gets its gear rows (filter, heater,
// skimmer, CO2, ferts, the filter cleaning minutes, an RO unit) from its chosen options, each sized to the tank by
// scene/tech.ts optionCost; a tank without `tech` keeps the engine's inferred rows untouched (old files do not move).
// Hooked from engine.ts with one line after the routine work rows, before the kit. Keys 'filter' and 'heater' stay, so a kit's price still covers them.
import dd from '../data/demand-defaults.json';
import { coldSpecies, inferTech, optionCost, optionDef, rowsFor, techOf, type TechSetup } from '../scene/tech';
import { matchFilter, matchHeater, type FilterSpec } from './gear';
import { volume } from '../scene/physics';
import type { TankSetup } from '../scene/types';
import type { Contribution, Domain, Group, Range3 } from './types';

/** Engine rows the tech replaces. */
const REPLACED = new Set(['filter', 'heater', 'skimmer', 'co2', 'ferts', 'filterclean', 'rounit']);
const CONSUMABLE = new Set(['ferts', 'co2', 'conditioner', 'dosing']);
const pos = (r: Range3) => r.hi > 0 || r.lo < 0;

export interface TechCtx {
  /** the engine's price-age widening */
  price: (r: Range3) => Range3;
  /** the user's skill multiplier for this tank's domain */
  riskMul: number;
  domain: Domain;
}
/** Replace the inferred gear rows with the chosen tech's rows (one per row with gear: setup, consumables, kWh, minutes, risk). */
export function techDemand(S: TankSetup, rows: Contribution[], c: TechCtx) {
  if (!S.tech || !S.water.on) return;
  for (let i = rows.length - 1; i >= 0; i--) if (REPLACED.has(rows[i].key)) rows.splice(i, 1);
  const t = techOf(S);
  for (const r of rowsFor(S)) {
    const opt = t.rows[r.id] ?? 'none', def = optionDef(r.id, opt), cost = optionCost(S, r.id, opt, { tech: t });
    // no heater: each stocked species too cold at room temperature counts as a compatibility warning (lane TM step 5)
    const cold = r.id === 'heater' ? coldSpecies(S, t).filter(x => x.fit === 'out').length * dd.risk.animalWarnPts.compat : 0;
    const risk = ((def?.risk ?? 0) + cold) * c.riskMul;
    if (!cost.parts.length && !risk) continue;
    const label = `${r.label}: ${def?.label ?? opt}`;
    const group: Group = CONSUMABLE.has(r.id) && cost.setup.mode === 0 ? 'consumable' : 'gear';
    rows.push({
      key: r.id, label, group, risk, domain: c.domain,
      ...(cost.setup.mode > 0 ? { setup: c.price(cost.setup) } : {}),
      ...(pos(cost.monthly) ? { upkeep: cost.monthly } : {}),
      ...(cost.kwhMo > 0 ? { kwhMo: cost.kwhMo } : {}),
      ...(pos(cost.minutes) ? { minutes: cost.minutes } : {}),
    });
  }
}

/** The tech of a tank started from a bundle (lane TG, 2026-10-19): the inferred rows, with the filter and heater the
 *  bundle ships with (matched to the nearest generic model), so the drawn gear and the gear rows are the bundle's own.
 *  The bundle's price still covers their setup (engine.ts: kit parts 'filter' / 'heater'). Undefined: nothing to set. */
export function kitTech(S: TankSetup, gear: { filter?: FilterSpec; heater?: { watts: number } }): TechSetup | undefined {
  if (!S.water.on || (!gear.filter && !gear.heater)) return undefined;
  const t: TechSetup = { rows: { ...inferTech(S).rows } };
  const fm = gear.filter && matchFilter({ ...gear.filter, gal: gear.filter.gal ?? volume(S.tank).gallons })?.model;
  if (fm) { t.rows.filter = fm.kind; t.filterModel = fm.id; }
  if (gear.heater?.watts) { t.rows.heater = 'one'; t.heaterW = matchHeater(gear.heater.watts).watts; }
  return t;
}
