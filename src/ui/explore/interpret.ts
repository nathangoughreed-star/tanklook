// Explore Complete Setups, stage X3 (lane OX5): the INTERPRETATION LINE between rounds, "what we learned", and the person's edit of it. The sentence is aspects.ts `interpretationOf` (derived from the
// profile, never stored); the edit writes the profile directly through `tellAspect` ("You told us": more / less / drop an aspect, which beats what was learned), or clears it. "Something different"
// asks the NEXT batch for breadth (the ranker ignores the profile for that batch) and changes nothing stored. Nothing here can touch a limit: the aspects are tags about a setup, never money, size or time.
import type { Brief } from '../../scene/brief';
import { aspectsOf, clearAspects, interpretationOf, tellAspect, weightsOf, type Interpretation } from '../../explore/aspects';
import { esc } from './card';

export type InterpretEdit = { kind: 'more' | 'less' | 'drop'; key: string } | { kind: 'reset' };

/** Apply the person's correction to the line. `drop` hands the aspect back to what was learned (v 0); `more` / `less` set it by hand. */
export function applyInterpret(b: Brief, e: InterpretEdit): Brief {
  if (e.kind === 'reset') return clearAspects(b);
  return tellAspect(b, e.key, e.kind === 'more' ? 1 : e.kind === 'less' ? -1 : 0);
}
/** The interpretation of the brief's profile now. */
export const interpretOf = (b: Brief): Interpretation | undefined => interpretationOf(aspectsOf(b));

/** The line, its three answers ("More like that", "Something different", "Edit"), and (when editing) one row per learned aspect with More / Less / Drop. `broad` = the next batch is asked to ignore the profile. */
export function interpretHtml(i: Interpretation | undefined, o: { editing: boolean; broad: boolean; told: readonly string[] }): string {
  if (!i) return '';
  const shown = [...i.toward, ...i.away];
  const rows = o.editing ? `<ul class="ex-learned">${shown.map(l => `<li data-key="${esc(l.key)}"><span>${esc(l.label)}${l.source === 'told' || o.told.includes(l.key) ? ' <i class="ex-told">you told us</i>' : ''} <em>${l.w > 0 ? 'more' : 'less'}</em></span>`
    + `<span class="ex-learnedb"><button type="button" data-ex="tell" data-key="${esc(l.key)}" data-v="more">More</button><button type="button" data-ex="tell" data-key="${esc(l.key)}" data-v="less">Less</button><button type="button" data-ex="tell" data-key="${esc(l.key)}" data-v="drop">Drop</button></span></li>`).join('')}</ul>`
    + `<p><button type="button" class="linkbtn" data-ex="reset">Forget everything we learned</button></p>` : '';
  return `<div class="ex-interp" role="status"><p class="ex-i-text">${esc(i.text)}</p><p class="ex-i-acts"><button type="button" class="primary" data-ex="more-like" aria-pressed="${!o.broad}">More like that</button> `
    + `<button type="button" data-ex="broad" aria-pressed="${o.broad}">Something different</button> <button type="button" class="linkbtn" data-ex="edit" aria-expanded="${o.editing}">${o.editing ? 'Done editing' : 'Edit what we learned'}</button></p>${rows}</div>`;
}
/** The aspect keys the person set by hand (for the "you told us" flag). */
export const toldKeys = (b: Brief): string[] => [...weightsOf(aspectsOf(b)).values()].filter(w => w.source === 'told').map(w => w.key);
