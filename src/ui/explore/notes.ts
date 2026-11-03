// Explore Complete Setups, stage X3 (lane OX5): the words around the cards, as markup (pure): the limits the screen applied, the progress line, "fewer than six, here is why", and the NO RESULT state
// (reconcile 8.4 criterion 11: explain the constraints and offer CONTROLLED edits; never fabricate a compliant setup). A controlled edit is a button the person presses: mark the Required tank Available,
// make one limit a flexible target, open Adjust constraints (Limits), pick a world. Nothing is changed on its own, and no reaction on a card can reach any of them.
import type { AltEdit, FlexKey, Infeasible } from '../../demand/infeasible';
import type { NoResult, ControlledEdit } from '../../explore/pool';
import type { GateId } from '../../explore/gate';
import type { Brief } from '../../scene/brief';
import { infeasibleCard } from '../infeasibleCard';
import { esc } from './card';
import { gateWords } from './session';

export const limitsHtml = (l: { set: string[]; unset: string[] }): string =>
  `<p class="hint ex-limits">${l.set.length ? `Checked against: ${esc(l.set.join('; '))}.` : 'No limits set, so none was applied.'}${l.unset.length ? ` Not set (unknown, not zero): ${esc(l.unset.join(', '))}.` : ''}</p>`;

export const progressHtml = (p: { checked: number; of: number }, found: number): string =>
  `<p class="ex-progress" role="status"><span class="ex-spin" aria-hidden="true"></span> Checking looks against your limits: ${p.checked} of ${p.of} done, ${found} complete setup${found === 1 ? '' : 's'} so far.</p>`;

/** "Fewer than six, here is why": the batch is short; which limits left looks out, and the two buttons that change it. */
export function fewerHtml(shown: number, size: number, why: readonly string[], blocker: GateId | undefined): string {
  return `<div class="ex-fewer" role="status"><p><b>${shown === 1 ? 'Only one setup' : `Only ${shown} setups`} here, not ${size}.</b> ${blocker ? `Most were left out by ${esc(gateWords(blocker))}.` : 'That is every complete setup that passed.'}</p>`
    + (why.length ? `<ul>${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '')
    + `<p><button type="button" data-ex="adjust">Adjust constraints</button> <button type="button" class="linkbtn" data-ex="world">or pick a world</button></p></div>`;
}

/** One controlled edit as a button (or a plain line when the edit is not a button here). `alt` is applied through the same `applyAlternative` the Suggest card uses. */
export interface EditButton { text: string; label: string; act: 'adjust' | 'world' | 'alt'; alt?: AltEdit }
const FLEX_OF: Partial<Record<GateId, FlexKey>> = { budget: 'budget', monthly: 'upkeep', care: 'time', space: 'space', setup: 'setup' };
export function editButtons(r: NoResult): EditButton[] {
  const out: EditButton[] = [];
  for (const e of r.edits as ControlledEdit[]) {
    if (e.kind === 'adjust-limit') out.push({ text: e.text, label: 'Adjust constraints', act: 'adjust' });
    else if (e.kind === 'make-flexible') { const k = FLEX_OF[e.limit]; out.push(k ? { text: e.text, label: 'Make it a flexible target', act: 'alt', alt: { op: 'flexible', limits: [k] } } : { text: e.text, label: 'Adjust constraints', act: 'adjust' }); }
    else if (e.kind === 'change-required') out.push({ text: e.text, label: 'Mark my tank Available', act: 'alt', alt: { op: 'available', keys: ['tank'] } });
    else out.push({ text: e.text, label: 'Pick a world', act: 'world' });
  }
  return out;
}

/** The state with nothing eligible: the limit that held it back (named), the controlled edits, and the generator's own verified alternatives (the same card Suggest shows, without its paths). */
export function noResultHtml(r: NoResult, brief?: Brief): string {
  const btns = editButtons(r);
  const alts = r.infeasible?.alternatives.length ? `<div class="ex-alts"><b>What would change that</b> <span class="hint">(checked by running the generator)</span>${infeasibleCard({ ...r.infeasible, paths: undefined, look: undefined } as Infeasible, brief)}</div>` : '';
  return `<div class="ex-none" role="status" data-blocker="${r.blocker}"><h4>No complete setup fits all of that.</h4><p class="ex-blocker"><b>What is holding it back:</b> ${esc(gateWords(r.blocker))}. ${esc(r.text)}</p>`
    + `<p class="hint">Nothing is shown that breaks a firm limit, and nothing was made up to fill the space. These are the edits that could change it; each one is yours to press.</p>`
    + `<ul class="ex-edits">${btns.map((b, i) => `<li><span>${esc(b.text)}</span> <button type="button" data-ex-edit="${i}">${esc(b.label)}</button></li>`).join('')}</ul>${alts}</div>`;
}
