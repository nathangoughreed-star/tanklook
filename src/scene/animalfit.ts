// Animal gating (lane AD, 2026-10-16): why a species does not suit this tank, its keeper and the animals already in it
// (data/care.ts). whyAnimal returns the main blocking reason, or null when nothing blocks; whysAnimal returns every reason, blocking
// ones first, then the material concerns that do not block (`concern`), for the display. Advice only: the list grays it, nothing
// blocks adding it. Temperature is judged on the whole stocking (temprange.ts), not pair by pair (2026-10-22).
import { CARE, EXPERTISE_NAME, SHRIMP, type Expertise } from '../data/care';
import type { Species } from '../data/species';
import { fmtC, operatingCheck, sharedRange, NARROW_C, type TempEvidence } from './temprange';

/** A species' smallest tank is allowed 10 % slack (a 5 gal, 19 L, takes a 20 L species); shared by the animal gate, the tank-fit engine and the hard truths. */
export const MIN_SLACK_PCT = 100 / 0.9;

export interface AnimalWhy {
  kind: 'expertise' | 'size' | 'compat'; text: string;
  /** a material concern that does not block (a narrow shared temperature range); absent = blocking */
  concern?: true;
  /** the reason is about water temperature (the plan sheet reports the whole stocking's range itself) */
  temp?: true;
}
/** Do two species share space? A land animal and a water-only one never meet: they cannot be kept together, so whyAnimal gates the pair. */
const meet = (a: Species, b: Species) => !((a.habitat === 'land' && b.habitat === 'water') || (a.habitat === 'water' && b.habitat === 'land'));

const shared = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const band = (r: [number, number], d = 0) => `${r[0].toFixed(d)}-${r[1].toFixed(d)}`;
/** The tank around the animal: `corals`: any coral in it (not macroalgae or the anemone). */
export interface AnimalEnv { /** the tank's own answer (tankMin.ts minFit): size is judged by floor area, length and water, not litres alone; absent = litres only */ fit?: (sp: Species) => { pct: number; reason: string }; corals?: boolean; /** this tank's water temperature inputs (tech.ts tempEvidence): its target, or with no heater the room it follows */ water?: TempEvidence }

/** Predation between two animals that share space (lane IP 2026-10-22): 'eats' when `pred` takes `prey`, 'young' when only its young
 *  and small ones are at risk (prey.young: keep large adults). Reads lengths and kinds only, never temperature, so a band edit that
 *  lets the pair share water cannot hide it. prey.inverts 'shrimp' targets shrimp; without it snails in range are prey too. */
export function preyRisk(pred: Species, prey: Species): 'eats' | 'young' | null {
  const p = CARE[pred.id]?.prey;
  if (!p || pred.id === prey.id || (p.cats && !p.cats.includes(prey.cat)) || (p.inverts === 'shrimp' && prey.cat.endsWith('-invert') && !SHRIMP.has(prey.id))) return null;
  return p.mm >= prey.tl ? 'eats' : p.young && p.young >= prey.tl ? 'young' : null;
}

/** `litres`: the tank's volume; `present`: the species already stocked (one entry per species). The main blocking reason, or null. */
export function whyAnimal(sp: Species, litres: number, expertise: Expertise, present: Species[], env: AnimalEnv = {}): AnimalWhy | null {
  return whysAnimal(sp, litres, expertise, present, env).find(w => !w.concern) ?? null;
}

/** Every reason this species does not suit (same arguments as whyAnimal): the blocking ones in check order, the first being the main
 *  one, then the concerns that do not block. Empty when it suits. */
export function whysAnimal(sp: Species, litres: number, expertise: Expertise, present: Species[], env: AnimalEnv = {}): AnimalWhy[] {
  const c = CARE[sp.id];
  if (!c) return [];
  const out: AnimalWhy[] = [];
  if (c.care > expertise) out.push({ kind: 'expertise', text: `expertise: ${EXPERTISE_NAME[c.care].toLowerCase()} animal, you chose ${EXPERTISE_NAME[expertise].toLowerCase()}` });
  if (env.fit) { const m = env.fit(sp); if (m.pct > MIN_SLACK_PCT) out.push({ kind: 'size', text: `tank size: ${m.reason}` }); }
  else if (litres < c.minL) out.push({ kind: 'size', text: `tank size: wants at least ${c.minL} L, this tank is ${Math.round(litres)} L` });
  if (c.coral && env.corals) out.push({ kind: 'compat', text: c.coral === 2 ? 'compatibility: eats corals, not for a reef tank' : 'compatibility: may nip the corals, add with caution' });
  for (const o of present) {
    const oc = CARE[o.id];
    if (!oc) continue;
    const bad = (t: string, concern?: true) => { out.push({ kind: 'compat', text: `compatibility: ${t} (${o.name})`, ...(concern ? { concern } : {}) }); };
    if (o.id === sp.id) { if (c.solo) bad('keeps one per tank, you already have one'); continue; }
    if (c.fam && c.fam === oc.fam) bad(`rivals of its look-alike, keep one ${c.fam}`);
    if (!meet(sp, o)) {
      // frogs share a paludarium with fish; reptiles and land invertebrates (snakes, geckos, spiders) need a dry enclosure
      const dry = (x: Species) => x.habitat === 'land' && (x.cat === 'reptile' || x.cat === 'land-invert');
      if (dry(sp) || dry(o)) bad(dry(sp) ? 'needs a dry enclosure, this one lives in the water' : 'lives in the water, it needs a dry enclosure');
      continue;
    }
    const eats = preyRisk(sp, o), eaten = preyRisk(o, sp);   // lane IP: blocking when it takes the adults, a concern when only the young
    if (eats === 'eats') bad('would eat it');
    if (eaten === 'eats') bad('it would eat this one');
    if (eats === 'young') bad('would eat its young and small ones, keep large adults only', true);
    if (eaten === 'young') bad('it would eat young and small ones of this, keep large adults only', true);
    if (sp.habitat !== 'land' && o.habitat !== 'land') {
      if (c.temper >= 1 && oc.slow || c.nip && oc.slow) bad('would harass its long fins');
      if (oc.temper >= 1 && c.slow || oc.nip && c.slow) bad("it would harass this one's long fins");
      if (c.temper === 2 && oc.temper === 0) bad('too aggressive for it');
      if (oc.temper === 2 && c.temper === 0) bad('it is too aggressive for this one');
      if (c.ph && oc.ph && shared(c.ph, oc.ph) < 0.2) bad(`water chemistry: pH ${band(c.ph, 1)} against its ${band(oc.ph, 1)}`);
      if (c.gh && oc.gh && shared(c.gh, oc.gh) < 2) bad(`water hardness: GH ${band(c.gh)} against its ${band(oc.gh)}`);
    }
  }
  out.push(...tempWhys(sp, present)); // the combination first: no setting fixes it
  const setup = setupTemp(sp, env.water); if (setup) out.push(setup); // then the setup, not the combination: fixable, said with the fix
  return [...out.filter(w => !w.concern), ...out.filter(w => w.concern)];
}

/** This species against this setup's water (the same assessment as the plan sheet's, temprange.ts operatingCheck on its own range):
 *  outside = the setup as configured does not suit it, said as what it requires and the fix; an assumed room = a concern only. */
function setupTemp(sp: Species, water?: TempEvidence): AnimalWhy | null {
  const t = CARE[sp.id]?.temp;
  if (!t || !water || sp.habitat === 'land') return null;
  const k = operatingCheck(sharedRange([sp]), water);
  if (k.state !== 'outside' && k.state !== 'conditional') return null;
  const at = water.target ?? water.room, need = at < t[0] ? 'requires heating' : 'requires cooling';
  const why = water.target !== undefined ? `the target is ${at} °C` : `no heater, the water is estimated at the ${water.roomSet ? '' : 'assumed '}${at} °C room`;
  return { kind: 'compat', temp: true, ...(k.state === 'conditional' ? { concern: true as const } : {}), text: `water temperature: ${need}, wants ${fmtC(t)}, ${why}: ${k.fix}` };
}

/** Water temperature on the whole stocking (temprange.ts): adding `sp` empties the shared comfortable range (blocking), or leaves it
 *  NARROW_C wide or less (a concern, not an incompatibility). When the others already share nothing, `sp` is judged against each. */
function tempWhys(sp: Species, present: Species[]): AnimalWhy[] {
  const t = CARE[sp.id]?.temp;
  if (!t || sp.habitat === 'land') return [];
  const others = sharedRange(present.filter(o => o.id !== sp.id));
  if (others.state === 'unknown') return [];
  const none = (o: Species) => ({ kind: 'compat' as const, temp: true as const, text: `water temperature: No suitable shared temperature identified: its ${fmtC(t)} against ${fmtC(CARE[o.id].temp!)} (${o.name})` });
  if (others.state === 'none' || others.state === 'single') return others.counted.filter(o => Math.min(t[1], CARE[o.id].temp![1]) < Math.max(t[0], CARE[o.id].temp![0])).map(none);
  const all = sharedRange([sp, ...others.counted]);
  if (all.state === 'none') return [none(t[1] < others.range![0] ? others.floor! : others.ceiling!)];
  if (all.state === 'single') return [{ kind: 'compat', temp: true, text: `water temperature: Only one shared temperature (${all.range![0]} °C); no operating margin (${(t[1] <= others.range![0] ? others.floor! : others.ceiling!).name})` }];
  if (all.state === 'narrow') return [{ kind: 'compat', temp: true, concern: true, text: `temperature: shared range ${fmtC(all.range!)}, a narrow margin (${NARROW_C} °C or less), not an incompatibility` }];
  return [];
}

/** What the species list shows for a species (ui/panels.ts): a blocker = the first blocking reason, prominent (the item grayed), the
 *  others under it; concerns only = the first concern as a note, the animal still selectable; no reasons = nothing. */
export function gateOf(all: AnimalWhy[]): (AnimalWhy & { block: boolean; more: string[] }) | null {
  const main = all.find(w => !w.concern) ?? all[0];
  return main ? { ...main, block: !main.concern, more: all.filter(w => w !== main).map(w => w.text) } : null;
}

/** Group advice for a stocked species (lane CG): `n` of it in the tank, under its smallest group. Null when it is fine. */
export function groupShort(sp: Species, n: number): string | null {
  const g = CARE[sp.id]?.group;
  return g && n > 0 && n < g ? `group: wants ${g} or more, you have ${n}` : null;
}
/** Whether a tank's items hold corals the coral gate counts (macroalgae and the anemone do not). */
export const hasCorals = (items: { kind: string; variant: string }[]) => items.some(it => it.kind === 'coral' && it.variant !== 'macroalgae' && it.variant !== 'anemone');
