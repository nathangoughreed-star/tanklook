// Lane S5 (UI2 §7 step 5, P10 follow-up): leave experience-gated plants and gear out of Discover and Suggest, the same as gated animals.
// One pure place. The switch lives in demand/experience.ts (`experienceOf`, `plantGated`, `gearGated`); this reads a finished design and says
// which of ITS plants / gear are rated harder than the keeper said. Off (the default) = nothing is gated, null everywhere.
import type { TankSetup } from './types';
import { careGate, gearGated, plantGated } from '../demand/experience';
import { wattsOf } from './lightout';
import { volume } from './physics';

/** tech.json row option -> data/gearCare.ts kind (the rows a design can hold; rows with no entry here are not rated). */
const GEAR_OF: Record<string, Record<string, string>> = {
  filter: { sponge: 'sponge', internal: 'internal', hob: 'hob', canister: 'canister', sump: 'sump' },
  chiller: { fan: 'chillerfan', chiller: 'chillercomp' },
  co2: { liquid: 'co2liquid', diy: 'co2diy', cartridge: 'co2diy', pressurized: 'co2pressurized' },
  air: { airstone: 'airpump' }, uv: { uv: 'uvinternal' }, rodi: { unit: 'rodi' }, ato: { ato: 'ato' }, feeder: { auto: 'feeder' },
  skimmer: { hob: 'skimmerhob', sump: 'skimmersump' }, flow: { one: 'powerhead', two: 'powerhead', wave: 'wavemaker' }, dosing: { doser: 'doser' },
};
/** Watts per US gallon at which a light is a strong one: high-PAR planted (needs CO2 and ferts) or a reef lamp. Below it the light is the basic kind. */
export const STRONG_WPG = 0.9;
/** Which rated light kind the design's light is: a strong light over live plants = lightplanted, a strong one over salt water = lightreef, else lightbasic.
 *  null on a dry tank or one with no light. (SC: the light gear kind the experience gate was missing.) */
export function lightKindOf(S: TankSetup): string | null {
  if (!S.water.on) return null;
  const gal = volume(S.tank).gallons; if (gal <= 0) return null;
  const strong = wattsOf(S) / gal >= STRONG_WPG;
  if (!strong) return 'lightbasic';
  if (S.water.salt) return 'lightreef';
  return S.items.some(i => i.kind === 'plant') ? 'lightplanted' : 'lightbasic';
}
/** The rated gear kinds a design uses (from its tech rows, filter units and its light). */
export function gearKindsOf(S: TankSetup): string[] {
  const out = new Set<string>(), rows = S.tech?.rows ?? {};
  for (const [row, opt] of Object.entries(rows)) { const k = GEAR_OF[row]?.[opt as string]; if (k) out.add(k); }
  for (const f of S.tech?.filters ?? []) { const k = GEAR_OF.filter[f.kind]; if (k) out.add(k); }
  const l = lightKindOf(S); if (l) out.add(l);
  return [...out];
}
/** The live plant variants a design holds. */
export const plantVariantsOf = (S: TankSetup): string[] => [...new Set(S.items.filter(i => i.kind === 'plant').map(i => i.variant))];

export interface Gated { what: 'plant' | 'gear'; id: string; why: string }
/** Everything in `after` (and not already in `before`, when given) that the keeper's experience gates. Empty while the switch is off. */
export function gatedIn(after: TankSetup, before?: TankSetup): Gated[] {
  if (careGate('planted') === null && careGate('fundamentals') === null) return [];
  const out: Gated[] = [], had = new Set(before ? plantVariantsOf(before) : []), hadG = new Set(before ? gearKindsOf(before) : []);
  for (const v of plantVariantsOf(after)) { if (had.has(v)) continue; const why = plantGated(v); if (why) out.push({ what: 'plant', id: v, why }); }
  for (const k of gearKindsOf(after)) { if (hadG.has(k)) continue; const why = gearGated(k); if (why) out.push({ what: 'gear', id: k, why }); }
  return out;
}
/** One line for a rejected candidate, or null when nothing is gated. */
export function gateReason(after: TankSetup, before?: TankSetup): string | null {
  const g = gatedIn(after, before);
  return g.length ? `needs ${g.map(x => `${x.what === 'plant' ? 'a plant' : 'gear'} (${x.id})`).join(', ')}, rated harder than your experience` : null;
}
