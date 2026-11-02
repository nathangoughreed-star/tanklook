// Guided Setup Rev 03, step 3: Limits (lane GS4). "What should we work around?" Space, startup budget, ongoing budget, setup time, care time, experience: a short
// form, every field optional. A blank field is UNKNOWN (never 0, never unlimited). Space is Firm by default; the budgets and the times are Flexible targets until
// the person taps "Hard cap"; experience is guidance only. A prominent "Skip for now / I'll figure this out later". The fuller panel (room, water, desires)
// stays in Make It Your Own for revisiting.
import { constraintOf, type ConstraintId, type SpaceIn } from '../../scene/project';
import { EXPERIENCE, editBrief, getBrief } from '../setupBrief';
import { LIMIT_FIELDS, ONBOARD_ASK, applyKind, applyLimit, kindOfLimit, skipLimits, type LimitField } from './logic';

const v = (n?: number) => n === undefined ? '' : String(n);

export interface LimitsStepOpts { next(): void; back(): void }
export function mountLimitsStep(root: HTMLElement, o: LimitsStepOpts) {
  const row = (f: LimitField): string => {
    const b = getBrief(), c = constraintOf(b, f.id), known = !c.unknown, kind = kindOfLimit(b, f.id);
    if (f.kind === 'experience') {
      const cur = known ? (c as { value?: number }).value : undefined;
      return `<div class="gs-lim"><div class="gs-limhead"><b>${f.label}</b> <span class="hint">${f.hint}</span></div><div class="wgChips" role="group" aria-label="Experience">${EXPERIENCE.map(e => `<button type="button" data-exp="${e.id}" class="${cur === e.id ? 'on' : ''}" aria-pressed="${cur === e.id}">${e.label}</button>`).join('')}</div></div>`;
    }
    const chips = known ? `<span class="wgChips gs-kind" role="group" aria-label="${f.label}: how firm">${f.id === 'space'
      ? `<button type="button" data-kind="hard" data-id="${f.id}" class="${kind === 'hard' ? 'on' : ''}" aria-pressed="${kind === 'hard'}">Firm</button><button type="button" data-kind="flexible" data-id="${f.id}" class="${kind === 'flexible' ? 'on' : ''}" aria-pressed="${kind === 'flexible'}">Flexible</button>`
      : `<button type="button" data-kind="flexible" data-id="${f.id}" class="${kind === 'flexible' ? 'on' : ''}" aria-pressed="${kind === 'flexible'}" title="A target: designs near it rank higher, going over it only shows a warning">Flexible target</button><button type="button" data-kind="hard" data-id="${f.id}" class="${kind === 'hard' ? 'on' : ''}" aria-pressed="${kind === 'hard'}" title="A cap: no design goes over it">Hard cap</button>`}</span>` : '<span class="hint">not set: unknown</span>';
    if (f.kind === 'space') {
      const s = known ? (c as { value?: SpaceIn }).value : undefined;
      return `<div class="gs-lim"><div class="gs-limhead"><b>${f.label}</b> <span class="hint">${f.hint}</span></div><div class="gs-limin"><input id="gsSpW" type="number" min="1" step="1" inputmode="decimal" placeholder="wide" value="${v(s?.w)}" aria-label="Space: width in inches"> x <input id="gsSpD" type="number" min="1" step="1" inputmode="decimal" placeholder="deep" value="${v(s?.d)}" aria-label="Space: depth in inches"> in ${chips}</div></div>`;
    }
    const val = known ? (c as { value?: number }).value : undefined;
    return `<div class="gs-lim"><div class="gs-limhead"><b>${f.label}</b> <span class="hint">${f.hint}</span></div><div class="gs-limin">up to ${f.unit === '$' || f.unit === '$ a month' ? '$' : ''}<input id="gs_${f.id}" type="number" min="0" step="${f.step}" inputmode="decimal" placeholder="no limit given" value="${v(val)}" aria-label="${f.label}"> ${f.unit === '$' ? '' : f.unit.replace('$ ', '')} ${chips}</div></div>`;
  };
  const draw = () => {
    root.innerHTML = `<h3 class="vd-ask">${ONBOARD_ASK.limits}</h3>
<p class="gs-bigrow"><button type="button" class="gs-big" data-gs="skip"><b>Skip for now</b><span>I'll figure this out later.</span></button></p>
<p class="hint">Everything here is optional. A blank answer is unknown, not zero and not unlimited: we pick reasonable starting points, say so when it matters, and you can add limits later. Animal welfare is not a limit; it always applies.</p>
<div class="gs-limits">${LIMIT_FIELDS.map(row).join('')}</div>
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <button type="button" class="primary" data-gs="next">Continue</button></p>`;
  };
  const num = (id: string) => { const s = root.querySelector<HTMLInputElement>('#' + id)?.value.trim(); return s ? parseFloat(s) : undefined; };
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'gsSpW' || el.id === 'gsSpD') { const w = num('gsSpW'), d = num('gsSpD'); editBrief(b => applyLimit(b, 'space', w && d ? { w, d } : undefined)); if (!!w === !!d) draw(); return; }   // one box filled: keep typing, the other box is not wiped
    if (el.id.startsWith('gs_')) { const id = el.id.slice(3) as ConstraintId; editBrief(b => applyLimit(b, id, num(el.id))); draw(); }
  });
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-gs],[data-kind],[data-exp]'); if (!t) return;
    if (t.dataset.kind) { const id = t.dataset.id as ConstraintId, k = t.dataset.kind as 'hard' | 'flexible'; editBrief(b => applyKind(b, id, k)); draw(); return; }
    if (t.dataset.exp) { const x = +t.dataset.exp, cur = constraintOf(getBrief(), 'experience'); editBrief(b => applyLimit(b, 'experience', !cur.unknown && (cur as { value?: number }).value === x ? undefined : x)); draw(); return; }
    switch (t.dataset.gs) {
      case 'skip': editBrief(skipLimits); o.next(); break;
      case 'next': o.next(); break;
      case 'back': o.back(); break;
    }
  });
  draw();
  return { destroy() { root.replaceChildren(); } };
}
