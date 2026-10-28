// The Welcome screen's right column: "Your resources and limits" (Nathan's design note, 2026-10-28), plus the running "Your aquarium" summary.
// Money, time (set-up and upkeep apart), space, experience and the equipment already owned: the brief's Constraints, Preferences and Tank groups
// drawn as fields. Nothing is required and nothing is pre-filled: blank means unspecified. Experience is context, never a limit. Welfare checks are
// not a setting. Everywhere else the bar (briefBar.ts) shows and edits the same items.
import { OWNED } from '../demand/suggest';
import { EXPERIENCE, budgetOf, careTimeOf, editBrief, experienceOf, getBrief, monthlyOf, onBrief, ownedKeys, setBudget, setCareTime, setExperience, setMonthly, setOwnedKey, setSetupTime, setSpace, setupTimeOf, spaceOf, summarise } from './setupBrief';

const MM_IN = 25.4;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function attachWelcomeGuard(el: HTMLElement) {
  const num = (id: string) => { const v = el.querySelector<HTMLInputElement>('#' + id)?.value.trim(); return v ? parseFloat(v) : undefined; };
  const draw = () => {
    const b = getBrief(), sp = spaceOf(b), r = (mm: number) => String(Math.round(mm / MM_IN * 10) / 10), v = (n?: number) => n === undefined ? '' : String(n), ex = experienceOf(b), own = ownedKeys(b);
    const field = (id: string, label: string, val: number | undefined, step: number) => `<label class="wgRow"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" placeholder="not specified" value="${esc(v(val))}"></label>`;
    const rows = summarise(b).filter(g => !g.open);
    el.innerHTML = `<h3><span class="welcomeH"><span>2</span></span> Your resources and limits</h3><div class="hint">All optional; add them whenever they matter. Blank means not specified.</div>
<fieldset class="wgSet"><legend>Money</legend>${field('wgBudget', 'Upfront budget ($)', budgetOf(b), 10)}${field('wgMonthly', 'Monthly budget ($)', monthlyOf(b), 1)}</fieldset>
<fieldset class="wgSet"><legend>Time</legend>${field('wgSetupH', 'Setting it up (hours)', setupTimeOf(b), 1)}${field('wgTime', 'Upkeep (min / week)', careTimeOf(b), 5)}</fieldset>
<fieldset class="wgSet"><legend>Space</legend><div class="wgRow"><span>Largest footprint (in)</span><span><input id="wgW" type="number" min="0" aria-label="Width" placeholder="wide" value="${sp ? r(sp.w) : ''}"> x <input id="wgD" type="number" min="0" aria-label="Depth" placeholder="deep" value="${sp ? r(sp.d) : ''}"></span></div></fieldset>
<fieldset class="wgSet"><legend>Experience <span class="hint">(context, not a limit: a demanding tank is explained, not refused)</span></legend><div class="wgChips">${EXPERIENCE.map(e => `<button type="button" data-exp="${e.id}" class="${ex === e.id ? 'on' : ''}" aria-pressed="${ex === e.id}">${e.label}</button>`).join('')}</div></fieldset>
<details class="wgOwn"${own.length ? ' open' : ''}><summary>Equipment I already have${own.length ? ` (${own.length})` : ''}</summary><div class="wgChips">${OWNED.map(o => `<button type="button" data-own="${o.id}" data-label="${esc(o.label)}" class="${own.includes(o.id) ? 'on' : ''}" aria-pressed="${own.includes(o.id)}">${esc(o.label)}</button>`).join('')}</div></details>
<div class="wgAqua"><b>Your aquarium</b> <span class="hint">${rows.length ? 'in progress' : 'nothing yet'}</span>${rows.length ? `<ul>${rows.map(g => `<li><i>${esc(g.label)}</i> ${esc(g.text)}</li>`).join('')}</ul>` : ''}</div>`;
  };
  el.onchange = e => {
    const id = (e.target as HTMLElement).id;
    if (id === 'wgBudget') editBrief(b => setBudget(b, num('wgBudget')));
    else if (id === 'wgMonthly') editBrief(b => setMonthly(b, num('wgMonthly')));
    else if (id === 'wgSetupH') editBrief(b => setSetupTime(b, num('wgSetupH')));
    else if (id === 'wgTime') editBrief(b => setCareTime(b, num('wgTime')));
    else if (id === 'wgW' || id === 'wgD') { const w = num('wgW'), d = num('wgD'); editBrief(b => w && d ? setSpace(b, { w: Math.round(w * MM_IN), d: Math.round(d * MM_IN) }, 'in') : setSpace(b, undefined)); }
  };
  el.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-exp],[data-own]'); if (!t) return;
    if (t.dataset.exp) { const x = +t.dataset.exp as 0 | 1 | 2; editBrief(b => setExperience(b, experienceOf(b) === x ? undefined : x)); }
    else { const k = t.dataset.own!, on = !ownedKeys(getBrief()).includes(k); editBrief(b => setOwnedKey(b, k, t.dataset.label!, on)); }
  };
  onBrief(() => { if (!el.contains(document.activeElement) || (document.activeElement as HTMLElement)?.tagName === 'BUTTON') draw(); });
  draw();
}
