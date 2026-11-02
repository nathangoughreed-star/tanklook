// Guided Setup Rev 03, step 4: Starting Point (lane GS4). "Where would you like to start?" Two equally prominent cards, the only major branch: Animals First and Look
// First. Both are orders of decisions on the one project state, never modes: picking one keeps every answer so far.
import { routeOf } from '../../scene/project';
import type { Route } from '../../scene/brief';
import { editBrief, getBrief } from '../setupBrief';
import { ONBOARD_ASK, START_CARDS, WELFARE_LINE, chooseRoute, skippedLine } from './logic';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface StartStepOpts { pick(route: Route): void; back(): void }
export function mountStartStep(root: HTMLElement, o: StartStepOpts) {
  const b = getBrief(), cur = routeOf(b), sk = skippedLine(b);
  root.innerHTML = `<h3 class="vd-ask">${ONBOARD_ASK.start}</h3>
<div class="gs-start" role="group" aria-label="Starting point">${START_CARDS.map(c => `<button type="button" class="gs-card${cur === c.id ? ' on' : ''}" data-route="${c.id}" aria-pressed="${cur === c.id}"><b>${esc(c.title)}</b><span>${esc(c.line)}</span></button>`).join('')}</div>
${sk ? `<p class="hint gs-skipped">${esc(sk)}</p>` : ''}
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <span class="hint">${esc(WELFARE_LINE)}</span></p>`;
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-route],[data-gs]'); if (!t) return;
    if (t.dataset.route) { const r = t.dataset.route as Route; editBrief(bb => chooseRoute(bb, r)); o.pick(r); }
    else if (t.dataset.gs === 'back') o.back();
  });
  return { destroy() { root.replaceChildren(); } };
}
