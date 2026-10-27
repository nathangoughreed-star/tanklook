// Light checks (lane PG step 3, 2026-10-16): the PAR each plant and coral really gets, against what its species wants
// (scene/lightneeds.ts), as a verdict per item and one line for the tank. Advice only: nothing blocks placing anything.
import { isCarpet, isFloat } from '../art/plants';
import { LIBRARY, itemDims } from './items';
import { bandsAt, lightEnvCached, lightOutCached, parOf, wattsOf, type LightScene } from './lightout';
import { FRESH_TIERS, NEEDS, isCoralNeed, isLand, parRange, type LightVerdict } from './lightneeds';
import { outcomeOf, type Outcome } from './plantfit';
import { groundHeight } from './terrain';
import { lightProduct } from '../data/gearCatalog';
import type { GrowFeed, Item } from './types';

/** `verdict` is 'dim' / 'bright' only when the item will really struggle with the light (hardy plants outside their range are 'fine'
 *  with a recommendation in `outcome`; lane OC). */
export interface ItemLight { par: number; verdict: LightVerdict; outcome: Outcome }
export const VERDICT_TEXT: Record<LightVerdict, string> = { dim: 'too dim', fine: 'fine', bright: 'too bright' };

/** PAR at each plant (at its base: the substrate figure the guide uses) and coral (at its top), with the aquascape's shade
 *  when the Light map's toggle is on. Null while Power is not set. Floaters sit at the surface: always fine. */
export function itemLights(S: LightScene & { items: Item[] }): Map<number, ItemLight> | null {
  if (!(wattsOf(S) > 0)) return null;
  const env = lightEnvCached(S);
  if (!env) return null;
  const out = new Map<number, ItemLight>();
  for (const it of S.items) { const l = lightOfItem(S, env, it); if (l) out.set(it.id, l); }
  return out;
}
/** One item's light and outcome (null for items that need none); `env` from lightEnvCached. The tank's care is its growth feed. */
export function lightOfItem(S: LightScene & { grow?: { feed: GrowFeed } }, env: NonNullable<ReturnType<typeof lightEnvCached>>, it: Item): ItemLight | null {
  const n = NEEDS[it.variant];
  if (!n || isLand(n) || isFloat(it.variant)) return null;
  const base = groundHeight(S, S.tank, it.x, it.depth) + it.lift, h = itemDims(it)[1];
  const par = parOf(bandsAt(env, [it.x, base + (it.kind === 'coral' ? h * 0.8 : 4), -it.depth]));
  const outcome = outcomeOf(it.variant, par, S.grow?.feed ?? 'low');
  return { par, outcome, verdict: outcome.why === 'dim' ? 'dim' : outcome.why === 'bright' ? 'bright' : 'fine' };
}
/** What this plant will look like in this tank, if it struggles: 0 = healthy .. 1 = badly (null/0 when the light is not set). */
export function struggleOf(S: LightScene & { grow?: { feed: GrowFeed } }, it: Item): number {
  if (it.kind !== 'plant' || !(wattsOf(S) > 0)) return 0;
  const env = lightEnvCached(S);
  return env ? lightOfItem(S, env, it)?.outcome.severity ?? 0 : 0;
}

/** A catalogued bar or slab that no longer fits the tank's length (a light picked, then the tank resized): named in the tank's line.
 *  Hanging and clip-on fixtures have no length to outgrow: for them the PAR at each plant / coral says whether the light carries. */
export function lightFitNote(S: LightScene): string | null {
  const p = lightProduct(S.light.product), L = S.tank.L;
  if (!p || (p.mount !== 'bar' && p.mount !== 'rim-legs') || (L >= p.fitMinMm && L <= p.fitMaxMm)) return null;
  const inch = (mm: number) => Math.round(mm / 25.4);
  return `${p.brand} ${p.model} is made for ${inch(p.fitMinMm)}-${inch(p.fitMaxMm)} in tanks: this one is ${inch(L)} in long, so the light is too ${L < p.fitMinMm ? 'long' : 'short'} for it`;
}

const STEM = new Set(['stem', 'stemred', 'rotala', 'ludwigia', 'hornwort', 'anacharis']);
const DEMAND = { none: 0, recommended: 1, required: 2 } as const;

/** One line for the tank, e.g. "Medium light (40 PAR) with stems and carpets: CO2 required, full ferts. Acropora at 90 PAR: too dim." */
export function tankSummary(S: LightScene & { items: Item[] }): string | null {
  const lo = lightOutCached(S), lights = itemLights(S);
  if (!lo || !lights) return null;
  const plants = S.items.filter(i => i.kind === 'plant' && !isLand(NEEDS[i.variant]) && NEEDS[i.variant]);
  const corals = S.items.filter(i => i.kind === 'coral' && NEEDS[i.variant]);
  const fit = lightFitNote(S);
  if (!plants.length && !corals.length) return fit ? fit + '.' : null;
  const bits: string[] = fit ? [fit] : [];
  if (plants.length) {
    const tier = FRESH_TIERS.find(t => lo.mean < t.hi) ?? FRESH_TIERS[FRESH_TIERS.length - 1];
    const kinds = [plants.some(p => STEM.has(p.variant)) && 'stems', plants.some(p => isCarpet(p.variant)) && 'carpets'].filter(Boolean) as string[];
    let co2 = 0, ferts = 0;
    for (const p of plants) { const n = NEEDS[p.variant] as { co2: keyof typeof DEMAND; ferts: keyof typeof DEMAND }; co2 = Math.max(co2, DEMAND[n.co2]); ferts = Math.max(ferts, DEMAND[n.ferts]); }
    const care = [co2 ? `CO2 ${co2 > 1 ? 'required' : 'recommended'}` : 'no CO2 needed', ferts > 1 ? 'full ferts' : ferts ? 'light ferts' : 'few ferts'].join(', ');
    bits.push(`${tier.name} light (${Math.round(lo.mean)} PAR)${kinds.length ? ` with ${kinds.join(' and ')}` : ''}: ${care}`);
  }
  // the first two items outside their range, worst first
  const groups = new Map<string, { gap: number; par: number; n: number; label: string; v: string; care: boolean }>();
  for (const i of S.items) {
    const l = lights.get(i.id);
    if (!l || l.outcome.state !== 'struggle') continue;
    const r = parRange(NEEDS[i.variant] as never), gap = l.outcome.why === 'care' ? 1.5 : l.par < r[0] ? r[0] / Math.max(l.par, 1) : l.par / r[1], key = i.variant + l.outcome.short, g = groups.get(key);
    if (!g) groups.set(key, { gap, par: l.par, n: 1, label: labelOf(i), v: l.outcome.short, care: l.outcome.why === 'care' });
    else { g.n++; if (gap > g.gap) { g.gap = gap; g.par = l.par; } }
  }
  const uniq = [...groups.values()].sort((a, b) => b.gap - a.gap);
  if (uniq.length) bits.push(uniq.slice(0, 2).map(g => `${g.label}${g.n > 1 ? ` (${g.n})` : ''}${g.care ? '' : ` at ${Math.round(g.par)} PAR`}: ${g.v}`).join('; ') + (uniq.length > 2 ? ` (+${uniq.length - 2} more kinds)` : ''));
  else if (corals.length && isCoralNeed(NEEDS[corals[0].variant])) bits.push('corals suit the light');
  return bits.join('. ') + '.';
}
const labelOf = (i: Item) => LIBRARY[i.variant].label;
