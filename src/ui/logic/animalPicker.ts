// Lane P2 (UI2 §7 P2): the animal picker's fit / gate / readout logic moved out of ui/panels.ts. No DOM, no store:
// the caller passes the tank, the units and the rule set. Lane P10 will replace the experience input (`ex`, read from
// `layout.expertise` in ONE place: `experienceIn`) with one experienceOf(area).
import { EXPERTISE_NAME } from '../../data/care';
import { getSpecies, SPECIES, type Species } from '../../data/species';
import { gateOf, hasCorals, whysAnimal, type AnimalWhy } from '../../scene/animalfit';
import type { Rules } from '../../scene/brief';
import { OK_FIT, fitFrom, type Fit } from '../../scene/pickerKind';
import { tempEvidence } from '../../scene/tech';
import { minFit } from '../../scene/tankMin';
import { volume, fmtLen } from '../../scene/physics';
import type { Fish, TankSetup, Units } from '../../scene/types';
import { pickerReader } from '../pickerStrict';
import type { Viewer } from '../../render/viewer';

/** The one place the gate reads the keeper's experience (1 / 2 / 3). P10 swaps this for experienceOf(area). */
export const experienceIn = (s: TankSetup): 1 | 2 | 3 => (s.layout.expertise ?? 1) as 1 | 2 | 3;

/** What each care level asks of the keeper: rough, typical aquarium / vivarium practice, not a rule. */
export const CARE_LEVEL: Record<1 | 2 | 3, string> = {
  1: 'Hardy, forgiving animals that take small mistakes: a basic filter or a simple setup, a weekly water change of about a quarter, and 15 to 30 minutes of care a week.',
  2: 'Animals that are fussier about temperature, water chemistry or food: stable, tested water, steady routines, a tuned or planted setup, and about an hour a week.',
  3: 'Demanding or delicate animals: tight water parameters with frequent tests and changes, special foods, quarantine for new arrivals, and several hours a week plus a daily check.',
};

/** What the picker's fit reading depends on (the memo key): any change here redraws the list from scratch. */
export const stockKey = (s: TankSetup, units: Units, rules: Rules) => JSON.stringify([s.tank, s.water, s.tech, s.fish.map(f => [f.species, f.sex, f.gender, f.tl]), s.items.map(it => [it.kind, it.variant]), s.layout.gateStock, s.layout.gateAnimals, s.layout.expertise, s.constraints, s.stand, s.lid, units, rules]);

/** The tank's environment as the fit rules see it: its target, or with no heater the room it follows. */
const envOf = (s: TankSetup, units: Units) => ({ corals: hasCorals(s.items), water: s.tech ? tempEvidence(s, undefined, units === 'in') : undefined, fit: minFit(s) });
/** The distinct species in the tank, resolved. */
const presentOf = (s: TankSetup) => [...new Set(s.fish.map(f => f.species))].map(getSpecies).filter((x): x is Species => !!x);

/** The care gates' state for the Quick Setup box: shown while "Stock by care gates" is on; the list is grayed by them when its own box is ticked too. */
export function gateView(s: TankSetup) {
  const stock = !!s.layout.gateStock, on = stock && !!s.layout.gateAnimals, ex = experienceIn(s);
  return {
    stock, on, ex, animals: !!s.layout.gateAnimals, name: EXPERTISE_NAME[ex], care: CARE_LEVEL[ex],
    hint: on ? 'Grayed in the list: does not suit this tank, the care level or the animals already in it. They can still be added.' : '',
  };
}
/** The gate reader: per species, the main blocking reason and how many other concerns stand under it (all of them in the tooltip);
 *  with no blocker the first concern is the visible message (a note, the item not grayed), so an advisory never hides behind a
 *  clean-looking row. Null while the gates are off. */
export function animalGate(s: TankSetup, units: Units): ((sp: Species) => (AnimalWhy & { more: string[]; block: boolean }) | null) | null {
  if (!gateView(s).on) return null;
  const litres = volume(s.tank).litres, present = presentOf(s), ex = experienceIn(s), env = envOf(s, units);
  return sp => gateOf(whysAnimal(sp, litres, ex, present, env));
}

/** How each species sits in this tank. Two readings (lane S254): the cheap per-species one (animalfit.ts) is drawn at once; the exact one is the
 *  Suggest rule (pickerStrict.ts: would the stocking summary word a new Caution / Problem with it added?), worked out a slice at a time after the
 *  first paint, kept per stock signature (the picker opens often), and replaces the cheap one as it arrives. */
export function createFitter() {
  let fitKey = '', fitMemo = new Map<string, Fit>(), exact = new Map<string, Fit>(), exactRead: ((sp: Species) => Fit) | undefined, gen = 0, refining = -1;
  function fitsFor(s: TankSetup, units: Units, rules: Rules): (sp: Species) => Fit {
    const gated = !!s.layout.gateStock && !!s.layout.gateAnimals, ex = experienceIn(s), present = [...new Set(s.fish.map(f => f.species))].sort();
    const key = stockKey(s, units, rules);
    if (key !== fitKey) {
      fitKey = key; fitMemo = new Map(); exact = new Map(); gen++; refining = -1;
      const litres = volume(s.tank).litres, have = present.map(getSpecies).filter((x): x is Species => !!x);
      const env = envOf(s, units);
      const sandbox = rules === 'sandbox';   // DQ9: Sandbox grays nothing
      for (const sp of SPECIES) fitMemo.set(sp.id, sandbox ? OK_FIT : fitFrom(whysAnimal(sp, litres, ex, have, env), gated));
      exactRead = pickerReader(rules, s, units, sp => fitMemo.get(sp.id) ?? OK_FIT);
    }
    return sp => exact.get(sp.id) ?? fitMemo.get(sp.id) ?? OK_FIT;
  }
  /** The exact reading of one species now (the picked one: Add anyway must read what the summary will say). */
  const exactNow = (s: TankSetup, units: Units, rules: Rules, sp: Species): Fit => { fitsFor(s, units, rules); let f = exact.get(sp.id); if (!f && exactRead) exact.set(sp.id, f = exactRead(sp)); return f ?? OK_FIT; };
  /** Works the exact reading through the species the picker lists (the open group first) in ~20 ms slices, then calls `done` once. */
  function refineFits(s: TankSetup, units: Units, rules: Rules, list: Species[], done: () => void) {
    fitsFor(s, units, rules); const mine = gen, todo = list.filter(sp => !exact.has(sp.id));
    if (!todo.length || !exactRead || refining === mine) return;
    refining = mine;
    const step = () => {
      if (gen !== mine || !exactRead) return;
      const t0 = performance.now();
      while (todo.length && performance.now() - t0 < 20) { const sp = todo.shift()!; if (!exact.has(sp.id)) exact.set(sp.id, exactRead(sp)); }
      if (todo.length) setTimeout(step, 0); else { refining = -1; done(); }
    };
    setTimeout(step, 0);
  }
  return { fitsFor, exactNow, refineFits };
}

/** Sort a list to the rows the picker shows is `groupPicker` (scene/pickerKind); "Fits this tank" = the rows whose fit level is 'ok'. */
export const fitsThisTank = (list: Species[], fitOf: (sp: Species) => Fit) => list.filter(sp => fitOf(sp).level === 'ok');

/** The selected fish's readout (the "Select a fish..." line when nothing is selected). `m` = viewer.measure(f). */
export const READOUT_NONE = '<span class="hint">Select a fish to see its size on screen.</span>';
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export function readoutHtml(f: Fish | null | undefined, sp: Species | null | undefined, m: ReturnType<Viewer['measure']>, units: Units, debug: boolean): string {
  if (!f || !m || !sp) return READOUT_NONE;
  const fmt = (mm: number) => fmtLen(mm, units);
  const a = m.sideAngle, cls = a < 40 ? 'ok' : a < 55 ? 'warn' : 'bad';
  const txt = a < 40 ? 'reads fine' : a < 55 ? 'marginal' : 'too thin: card looks flat';
  let html = `<div><span><b>${esc(sp.name)}${sp.sex === 'f' ? ' ♀' : getSpecies(f.species)!.female ? ' ♂' : ''}</b> <i>${esc(sp.sci)}</i></span><span>${f.tl ? `${fmt(f.tl)} (adult ${fmt(sp.tl)})` : `adult ${fmt(sp.tl)}`}</span></div>
      <div><span>Depth behind glass</span><span>${fmt(f.depth)}</span></div>
      <div><span>Looks, vs. at the front glass</span><span>${Math.round(100 * m.len / m.ref)} % as big</span></div>`;
  // calibration readouts only with ?debug in the URL (Muse feedback 2026-10-09: cryptic for normal users)
  if (debug) html += `<div><span>On screen</span><span>${m.len.toFixed(0)} px</span></div>
      <div><span>Same pose at the front glass</span><span>${m.ref.toFixed(0)} px</span></div>
      <div><span>Measured ratio</span><span>×${(m.len / m.ref).toFixed(3)}</span></div>
      <div><span>Straight-on formula d ÷ (d + z)</span><span>×${m.formula.toFixed(3)}</span></div>
      <div><span>Angle off side-on</span><span class="${cls}">${a.toFixed(0)}°: ${txt}</span></div>`;
  return html;
}
