// Light checks (lane PG step 3, 2026-10-16): the PAR each plant and coral really gets, against what its species wants
// (scene/lightneeds.ts), as a verdict per item and one line for the tank. Advice only: nothing blocks placing anything.
import { isCarpet, isFloat } from '../art/plants';
import { LIBRARY, itemDims } from './items';
import { bandsAt, lightEnvCached, lightOutCached, parOf, wattsOf, type LightScene } from './lightout';
import { FRESH_TIERS, NEEDS, isCoralNeed, isLand, lightVerdict, parRange, type LightVerdict } from './lightneeds';
import { groundHeight } from './terrain';
import type { Item } from './types';

export interface ItemLight { par: number; verdict: LightVerdict }
export const VERDICT_TEXT: Record<LightVerdict, string> = { dim: 'too dim', fine: 'fine', bright: 'too bright' };

/** PAR at each plant (at its base: the substrate figure the guide uses) and coral (at its top), with the aquascape's shade
 *  when the Light map's toggle is on. Null while Power is not set. Floaters sit at the surface: always fine. */
export function itemLights(S: LightScene & { items: Item[] }): Map<number, ItemLight> | null {
  if (!(wattsOf(S) > 0)) return null;
  const env = lightEnvCached(S);
  if (!env) return null;
  const out = new Map<number, ItemLight>();
  for (const it of S.items) {
    const n = NEEDS[it.variant];
    if (!n || isLand(n) || isFloat(it.variant)) continue;
    const base = groundHeight(S, S.tank, it.x, it.depth) + it.lift, h = itemDims(it)[1];
    const par = parOf(bandsAt(env, [it.x, base + (it.kind === 'coral' ? h * 0.8 : 4), -it.depth]));
    out.set(it.id, { par, verdict: lightVerdict(it.variant, par) });
  }
  return out;
}

const STEM = new Set(['stem', 'stemred', 'rotala', 'ludwigia', 'hornwort', 'anacharis']);
const DEMAND = { none: 0, recommended: 1, required: 2 } as const;

/** One line for the tank, e.g. "Medium light (40 PAR) with stems and carpets: CO2 required, full ferts. Acropora at 90 PAR: too dim." */
export function tankSummary(S: LightScene & { items: Item[] }): string | null {
  const lo = lightOutCached(S), lights = itemLights(S);
  if (!lo || !lights) return null;
  const plants = S.items.filter(i => i.kind === 'plant' && !isLand(NEEDS[i.variant]) && NEEDS[i.variant]);
  const corals = S.items.filter(i => i.kind === 'coral' && NEEDS[i.variant]);
  if (!plants.length && !corals.length) return null;
  const bits: string[] = [];
  if (plants.length) {
    const tier = FRESH_TIERS.find(t => lo.mean < t.hi) ?? FRESH_TIERS[FRESH_TIERS.length - 1];
    const kinds = [plants.some(p => STEM.has(p.variant)) && 'stems', plants.some(p => isCarpet(p.variant)) && 'carpets'].filter(Boolean) as string[];
    let co2 = 0, ferts = 0;
    for (const p of plants) { const n = NEEDS[p.variant] as { co2: keyof typeof DEMAND; ferts: keyof typeof DEMAND }; co2 = Math.max(co2, DEMAND[n.co2]); ferts = Math.max(ferts, DEMAND[n.ferts]); }
    const care = [co2 ? `CO2 ${co2 > 1 ? 'required' : 'recommended'}` : 'no CO2 needed', ferts > 1 ? 'full ferts' : ferts ? 'light ferts' : 'few ferts'].join(', ');
    bits.push(`${tier.name} light (${Math.round(lo.mean)} PAR)${kinds.length ? ` with ${kinds.join(' and ')}` : ''}: ${care}`);
  }
  // the first two items outside their range, worst first
  const groups = new Map<string, { gap: number; par: number; n: number; label: string; v: LightVerdict }>();
  for (const i of S.items) {
    const l = lights.get(i.id);
    if (!l || l.verdict === 'fine') continue;
    const r = parRange(NEEDS[i.variant] as never), gap = l.par < r[0] ? r[0] / Math.max(l.par, 1) : l.par / r[1], key = i.variant + l.verdict, g = groups.get(key);
    if (!g) groups.set(key, { gap, par: l.par, n: 1, label: labelOf(i), v: l.verdict });
    else { g.n++; if (gap > g.gap) { g.gap = gap; g.par = l.par; } }
  }
  const uniq = [...groups.values()].sort((a, b) => b.gap - a.gap);
  if (uniq.length) bits.push(uniq.slice(0, 2).map(g => `${g.label}${g.n > 1 ? ` (${g.n})` : ''} at ${Math.round(g.par)} PAR: ${VERDICT_TEXT[g.v]}`).join('; ') + (uniq.length > 2 ? ` (+${uniq.length - 2} more kinds)` : ''));
  else if (corals.length && isCoralNeed(NEEDS[corals[0].variant])) bits.push('corals suit the light');
  return bits.join('. ') + '.';
}
const labelOf = (i: Item) => LIBRARY[i.variant].label;
