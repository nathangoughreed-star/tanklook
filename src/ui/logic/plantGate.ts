// Lane P3 (UI2 §7 P3): the "Show only tank-appropriate plants" gate moved out of ui/panels.ts (renderPlantGate). No DOM.
// Advice only: a grayed plant can still be added. Needs a light level and a care level; until both are chosen the toggle
// only says so. `chosen` (the care level) stays ONE parameter: P10 swaps it for experienceOf(area).
import { isSalt } from '../../scene/stockEdit';
import { lightOutCached, wattsOf } from '../../scene/lightout';
import { CARE_NAME, FIT_PAR, whyNot } from '../../scene/plantfit';
import type { TankSetup } from '../../scene/types';

/** Has the owner chosen a care level? The one place the gate reads it (P10 swaps this for experienceOf(area)). */
export const careChosen = (s: TankSetup): boolean => !!s.layout.careSet;

export interface GateView {
  on: boolean;
  /** PAR at the plants (null until a light level or a fixture Power is set). */
  par: number | null;
  salt: boolean;
  /** What is still to choose. */
  missing: string[];
  /** On and nothing missing: the list is being filtered. */
  active: boolean;
  /** Hint line under the toggle ('' = hidden). */
  hint: string;
}
export function gateView(s: TankSetup, chosen: boolean = careChosen(s)): GateView {
  const on = !!s.layout.gatePlants, lo = lightOutCached(s), salt = isSalt(s);
  const par = s.layout.fit ? FIT_PAR[salt ? 'reef' : 'fresh'][s.layout.fit] : lo && wattsOf(s) > 0 ? lo.mean : null;
  const missing = [par == null && 'a light level (Plants fit above, or set the fixture Power in Lighting)', !chosen && 'a care level (Care above)'].filter(Boolean) as string[];
  const active = on && !missing.length;
  const hint = on && missing.length ? `Choose ${missing.join(' and ')} first, then this list can be filtered to what suits the tank.`
    : on ? `Grayed: does not suit ${Math.round(par!)} PAR at ${CARE_NAME[s.grow.feed]} care. They can still be added.` : '';
  return { on, par, salt, missing, active, hint };
}
/** Of these library chips (variant id + whether it is a coral / live rock chip), which the gate grays, each with its
 *  reason. A salt-only chip in a fresh tank is never listed (it is hidden there). */
export function gatedChips(v: GateView, s: TankSetup, chips: { variant: string; salt: boolean }[]): { variant: string; why: string }[] {
  if (!v.active) return [];
  const out: { variant: string; why: string }[] = [];
  for (const c of chips) {
    const w = whyNot(c.variant, v.par!, s.grow.feed);
    if (w && !(c.salt && !v.salt)) out.push({ variant: c.variant, why: w.text });
  }
  return out;
}
/** The toggle's edit. */
export function setGate(s: TankSetup, on: boolean): void { if (on) s.layout.gatePlants = true; else delete s.layout.gatePlants; }
