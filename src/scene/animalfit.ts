// Animal gating (lane AD, 2026-10-16): why a species does not suit this tank, its keeper and the animals already in it
// (data/care.ts). Returns the first reason, or null when it suits. Advice only: the list grays it, nothing blocks adding it.
import { CARE, EXPERTISE_NAME, type Expertise } from '../data/care';
import type { Species } from '../data/species';

export interface AnimalWhy { kind: 'expertise' | 'size' | 'compat'; text: string }
/** Do two species share space? A land animal and a water-only one never meet. */
const meet = (a: Species, b: Species) => !((a.habitat === 'land' && b.habitat === 'water') || (a.habitat === 'water' && b.habitat === 'land'));

const shared = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const band = (r: [number, number], d = 0) => `${r[0].toFixed(d)}-${r[1].toFixed(d)}`;
/** The tank around the animal: `corals`: any coral in it (not macroalgae or the anemone). */
export interface AnimalEnv { corals?: boolean; /** no heater (lane TM): the water stays at this room temperature, deg C */ unheatedC?: number }

/** `litres`: the tank's volume; `present`: the species already stocked (one entry per species). */
export function whyAnimal(sp: Species, litres: number, expertise: Expertise, present: Species[], env: AnimalEnv = {}): AnimalWhy | null {
  const c = CARE[sp.id];
  if (!c) return null;
  if (c.care > expertise) return { kind: 'expertise', text: `expertise: ${EXPERTISE_NAME[c.care].toLowerCase()} animal, you chose ${EXPERTISE_NAME[expertise].toLowerCase()}` };
  if (litres < c.minL) return { kind: 'size', text: `tank size: wants at least ${c.minL} L, this tank is ${Math.round(litres)} L` };
  if (env.unheatedC !== undefined && c.temp && (env.unheatedC < c.temp[0] || env.unheatedC > c.temp[1])) return { kind: 'compat', text: `water temperature: wants ${c.temp[0]}-${c.temp[1]} C, no heater in a ${env.unheatedC} C room` }; // lane TM
  if (c.coral && env.corals) return { kind: 'compat', text: c.coral === 2 ? 'compatibility: eats corals, not for a reef tank' : 'compatibility: may nip the corals, add with caution' };
  for (const o of present) {
    const oc = CARE[o.id];
    if (!oc) continue;
    const bad = (t: string) => ({ kind: 'compat' as const, text: `compatibility: ${t} (${o.name})` });
    if (o.id === sp.id) { if (c.solo) return bad('keeps one per tank, you already have one'); continue; }
    if (c.fam && c.fam === oc.fam) return bad(`rivals of its look-alike, keep one ${c.fam}`);
    if (!meet(sp, o)) continue;
    if (c.prey && c.prey.mm >= o.tl && (!c.prey.cats || c.prey.cats.includes(o.cat))) return bad('would eat it');
    if (oc.prey && oc.prey.mm >= sp.tl && (!oc.prey.cats || oc.prey.cats.includes(sp.cat))) return bad('it would eat this one');
    if (sp.habitat !== 'land' && o.habitat !== 'land') {
      if (c.temper >= 1 && oc.slow || c.nip && oc.slow) return bad('would harass its long fins');
      if (oc.temper >= 1 && c.slow || oc.nip && c.slow) return bad('it would harass this one\'s long fins');
      if (c.temper === 2 && oc.temper === 0) return bad('too aggressive for it');
      if (oc.temper === 2 && c.temper === 0) return bad('it is too aggressive for this one');
      if (c.temp && oc.temp && Math.min(c.temp[1], oc.temp[1]) - Math.max(c.temp[0], oc.temp[0]) < 2) return bad(`water temperature: ${c.temp[0]}-${c.temp[1]} C against its ${oc.temp[0]}-${oc.temp[1]} C`);
      if (c.ph && oc.ph && shared(c.ph, oc.ph) < 0.2) return bad(`water chemistry: pH ${band(c.ph, 1)} against its ${band(oc.ph, 1)}`);
      if (c.gh && oc.gh && shared(c.gh, oc.gh) < 2) return bad(`water hardness: GH ${band(c.gh)} against its ${band(oc.gh)}`);
    }
  }
  return null;
}

/** Group advice for a stocked species (lane CG): `n` of it in the tank, under its smallest group. Null when it is fine. */
export function groupShort(sp: Species, n: number): string | null {
  const g = CARE[sp.id]?.group;
  return g && n > 0 && n < g ? `group: wants ${g} or more, you have ${n}` : null;
}
/** Whether a tank's items hold corals the coral gate counts (macroalgae and the anemone do not). */
export const hasCorals = (items: { kind: string; variant: string }[]) => items.some(it => it.kind === 'coral' && it.variant !== 'macroalgae' && it.variant !== 'anemone');
