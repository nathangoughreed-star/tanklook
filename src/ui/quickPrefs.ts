// AB6 (2026-11-10): the quick-preferences form, drawn twice from ONE function: on the one optional screen after the habitat question (`showQuickPrefs`, replaces the AB4 intro
// popup) and as the "Your preferences" block in the Constraints menu (`attachPrefsBlock`). Nothing is required: Skip and Start building both go straight to the editor, every
// row has an "Unsure" way out (press the chosen button again). Size, Look and Live plants are visible; Practical limits and Don't want are collapsed.
// The screen holds its answers in a DRAFT and writes them when "Start building" is pressed (Skip writes nothing); the menu block writes as you press. Both write through
// scene/quickPrefs.ts `applyQuickPrefs`, so they are the same fields and either can change them later.
import { editBrief, getBrief, onBrief } from './setupBrief';
import { projectExtras } from '../scene/brief';
import type { HabitatDirection } from '../scene/discoveryTypes';
import { SIZE_CHOICES, SIZE_LABEL, sizeText, type SizeChoice } from '../scene/sizePrefs';
import { AVOIDS, LARGE_IN, LOOK_CHIPS, PLANT_ANSWERS, answersOf, applyQuickPrefs, normalize, plantsLabel, plantsShown, type AvoidId, type Limit, type LookChip, type PlantsAnswer, type QuickAnswers } from '../scene/quickPrefs';
import { INTRO_BUTTON, INTRO_LINES, INTRO_TITLE, introHtml, spotlight } from './introPopup';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const btn = (data: string, on: boolean, label: string, sub = '') => `<button type="button" class="qp-opt${on ? ' on' : ''}" ${data} aria-pressed="${on}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
const limitRow = (key: 'budget' | 'care', label: string, unit: string, l: Limit | undefined) =>
  `<div class="qp-limit"><span>${label}</span><span class="qp-num">${unit === '$' ? '$' : ''}<input type="number" inputmode="numeric" min="0" step="${unit === '$' ? 50 : 15}" data-limit="${key}" value="${l?.max ?? ''}" aria-label="${esc(label)}">${unit === '$' ? '' : ' min'}</span>`
  + `<span class="qp-seg" role="group" aria-label="${esc(label)}: target or firm maximum">${btn(`data-firm="${key}:0"`, !!l && !l.firm, 'Target')}${btn(`data-firm="${key}:1"`, !!l && l.firm, 'Firm maximum')}</span></div>`;

/** The rows' markup for one habitat and one set of answers (pure: the tests read it). Size, Look and Live plants are always visible; Practical limits and Don't want are collapsed (`open` re-opens one). */
export function prefsHtml(d: HabitatDirection, a: QuickAnswers, open: { limits?: boolean; avoid?: boolean } = {}): string {
  const rows: string[] = [];
  rows.push(`<div class="qp-row" role="group" aria-label="Size"><b>Size</b><div class="qp-opts">${SIZE_CHOICES.map(s => btn(`data-size="${s}"`, a.size === s, SIZE_LABEL[s], sizeText(d, s))).join('')}</div></div>`);
  rows.push(`<div class="qp-row" role="group" aria-label="Look"><b>Look <span class="hint">pick any</span></b><div class="qp-opts">${LOOK_CHIPS.map(c => btn(`data-look="${c.id}"`, a.look.includes(c.id), c.label)).join('')}</div></div>`);
  if (plantsShown(d)) rows.push(`<div class="qp-row" role="group" aria-label="Live plants"><b>${esc(plantsLabel(d))}</b><div class="qp-opts">${PLANT_ANSWERS.map(p => btn(`data-plants="${p.id}"`, a.plants === p.id, p.label)).join('')}${btn('data-plants="unsure"', !a.plants, 'Unsure')}</div></div>`);
  rows.push(`<details class="qp-more" data-x="limits"${open.limits || a.budget || a.care ? ' open' : ''}><summary>Practical limits</summary>${limitRow('budget', 'Set-up cost under', '$', a.budget)}${limitRow('care', 'Weekly upkeep under', 'min', a.care)}<p class="hint">Target = I’d prefer it; Firm maximum = never go over.</p></details>`);
  rows.push(`<details class="qp-more" data-x="avoid"${open.avoid || a.avoid.length ? ' open' : ''}><summary>Don’t want</summary><div class="qp-opts">${AVOIDS.filter(x => x.shown(d)).map(x => btn(`data-avoid="${x.id}"`, a.avoid.includes(x.id), x.label(d), x.id === 'large-animals' ? `over ${LARGE_IN} in` : '')).join('')}</div><p class="hint">Firm: designs with these are left out. A look you dislike is better said with the Look chips.</p></details>`);
  return rows.join('');
}
/** Press a button: the next answers. Pressing the chosen button again clears it (that is "Unsure"). */
export function press(a: QuickAnswers, t: { size?: string; look?: string; plants?: string; avoid?: string; firm?: string }): QuickAnswers {
  const n: QuickAnswers = { ...a, look: [...a.look], avoid: [...a.avoid] }, tog = <T>(xs: T[], x: T) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  if (t.size) { if (a.size === t.size) delete n.size; else n.size = t.size as SizeChoice; }
  if (t.look) n.look = tog(n.look, t.look as LookChip);
  if (t.plants) { if (t.plants === 'unsure' || a.plants === t.plants) delete n.plants; else n.plants = t.plants as PlantsAnswer; }
  if (t.avoid) n.avoid = tog(n.avoid, t.avoid as AvoidId);
  if (t.firm) { const [k, v] = t.firm.split(':') as ['budget' | 'care', string], l = n[k]; if (l) n[k] = { max: l.max, firm: v === '1' }; }
  return normalize(n);
}
/** Type a limit: a number sets it (keeping target / firm; a new one starts as a Target), blank or 0 clears it. */
export function setLimit(a: QuickAnswers, key: 'budget' | 'care', v: number): QuickAnswers {
  const n = { ...a }; if (!Number.isFinite(v) || v <= 0) delete n[key]; else n[key] = { max: v, firm: a[key]?.firm ?? false };
  return normalize(n);
}
const dirNow = (): HabitatDirection => projectExtras(getBrief()).direction ?? 'unsure';

interface Form { redraw(): void }
function mountForm(host: HTMLElement, get: () => QuickAnswers, set: (a: QuickAnswers) => void): Form {
  const redraw = () => {
    const open = { limits: host.querySelector<HTMLDetailsElement>('details[data-x=limits]')?.open, avoid: host.querySelector<HTMLDetailsElement>('details[data-x=avoid]')?.open };
    host.innerHTML = prefsHtml(dirNow(), get(), open);
  };
  host.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.qp-opt'); if (!t) return;
    set(press(get(), { size: t.dataset.size, look: t.dataset.look, plants: t.dataset.plants, avoid: t.dataset.avoid, firm: t.dataset.firm })); redraw();
  });
  host.addEventListener('change', e => {
    const i = e.target as HTMLInputElement; if (!i.dataset?.limit) return;
    set(setLimit(get(), i.dataset.limit as 'budget' | 'care', parseFloat(i.value))); redraw();
  });
  redraw(); return { redraw };
}

/** The "Your preferences" block in the Constraints menu: live, the same fields as the screen. */
export function attachPrefsBlock(host: HTMLElement) {
  host.classList.add('qp');
  host.innerHTML = '<div class="qp-form"></div><p class="hint">All optional. Definitely, Definitely not, Firm maximum and Don’t want are requirements; everything else only nudges the order of what Discover shows you.</p>';
  const form = mountForm(host.querySelector<HTMLElement>('.qp-form')!, () => answersOf(getBrief()), a => editBrief(b => applyQuickPrefs(b, a)));
  onBrief(() => { if (!(document.activeElement instanceof HTMLInputElement && host.contains(document.activeElement))) form.redraw(); });
}

/** The one screen after the habitat question. Resolves when the person starts building or skips (the dialog's Esc counts as Skip). Both buttons go straight to the editor; nothing is required. */
export function showQuickPrefs(root: Document = document): Promise<void> {
  return new Promise(res => {
    let draft = answersOf(getBrief()), committed = false;
    const dlg = root.createElement('dialog'); dlg.id = 'introDlg'; dlg.className = 'libdlg introdlg qpdlg'; dlg.setAttribute('aria-labelledby', 'introTitle');
    dlg.innerHTML = `<h2 id="introTitle">${esc(INTRO_TITLE)}</h2><div class="qp qp-form"></div>`
      + `${INTRO_LINES.map(l => `<p class="qp-intro">${introHtml(l)}</p>`).join('')}<div class="btns qp-actions"><button type="button" id="qpSkip">Skip</button><button type="button" class="primary" id="introOk">${INTRO_BUTTON}</button></div>`;
    root.body.append(dlg);
    mountForm(dlg.querySelector<HTMLElement>('.qp-form')!, () => draft, a => { draft = a; });
    const finish = (write: boolean) => { if (committed) return; committed = true; if (write) editBrief(b => applyQuickPrefs(b, draft)); if (dlg.open) dlg.close(); };
    dlg.querySelector<HTMLElement>('#introOk')!.onclick = () => finish(true);
    dlg.querySelector<HTMLElement>('#qpSkip')!.onclick = () => finish(false);
    dlg.addEventListener('close', () => { dlg.remove(); spotlight(root); res(); });
    dlg.showModal(); dlg.querySelector<HTMLElement>('#introOk')!.focus();
  });
}
