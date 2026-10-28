// The setup brief bar (lane U3, 2026-10-28): one slim bar across the top of the view, shown in every entry point (stocking builder, look
// picker, tank chooser, Sandbox, Suggest). Five chips (Animals, Appearance, Tank and equipment, Constraints, Preferences) say what is set and
// what is open; the card under it holds the limits, locks, the next question (setupBrief.nextQuestions) and what the choices cost so far
// (briefFeasibility: the existing totals and guardrail check). Entry points only pre-fill; Sandbox needs nothing from it.
import type { Store } from '../scene/store';
import { tankLabel } from '../scene/tankfit';
import { onBuildPicked } from './buildPick';
import { loadProfile } from './demandPanel';
import * as brief from './setupBrief';
import {
  answer, budgetOf, careTimeOf, editBrief, getBrief, isEmpty, nextQuestions, onBrief, removeItem, setBrief, setBudget, setCareTime, setSpace, setTank, spaceOf, summarise, toggleLock,
  emptyBrief, type Brief, type GroupView, type Question,
} from './setupBrief';
import { consequence, evaluateAnimals } from './briefFeasibility';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const MM_IN = 25.4;
const SHORT: Record<string, string> = { animals: 'Animals', appearance: 'Look', tank: 'Tank', constraints: 'Limits', preferences: 'Preferences' };

export function attachBriefBar(store: Store, host: { suggest(): void }) {
  const view = document.getElementById('view')!;
  const bar = document.createElement('div');
  bar.className = 'bb'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Setup brief');
  view.append(bar);
  let openCard = false;
  const units = () => (store.scene.units ?? 'in') as 'in' | 'cm';
  const k = () => units() === 'in' ? MM_IN : 10;

  // a build picked in the three-builds screen is a tank choice and the animals behind it
  onBuildPicked(e => editBrief(b => setTank(b, { id: e.build.tank.id, label: tankLabel(e.build.tank, store.scene.units) })));

  const chip = (g: GroupView) => {
    const locked = g.items.some(i => i.status === 'locked');
    return `<button type="button" class="bbChip ${g.open ? 'open' : 'set'}${locked ? ' locked' : ''}" data-g="${g.id}" title="${esc(g.label)}: ${esc(g.text)}"><i>${esc(SHORT[g.id])}</i><span>${esc(g.text)}</span></button>`;
  };
  const input = (id: string, label: string, v: string, unit: string, step = 1) =>
    `<label class="bbIn"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" inputmode="decimal" value="${esc(v)}" placeholder="open">${unit ? `<em>${unit}</em>` : ''}</label>`;
  const askCard = (q: Question) => `<div class="bbAsk" data-q="${q.id}"><b>${esc(q.text)}</b> <span class="spNote">${esc(q.why)}</span><div class="bbOpts">${q.options.map(o => `<button type="button" data-ans="${o.id}">${esc(o.label)}</button>`).join('')}<button type="button" class="spLink" data-skip="${q.id}">Not sure</button></div></div>`;

  const draw = () => {
    const b = getBrief(), rows = summarise(b);
    let next = nextQuestions(b), ev: ReturnType<typeof evaluateAnimals> | undefined;
    if (next.action === 'evaluate' || rows[0].items.length) {
      try { ev = evaluateAnimals(b); } catch { ev = undefined; }
      if (ev?.gal !== undefined) next = nextQuestions(b, { animalTankGal: ev.gal });
    }
    const nq = next.questions.length;
    bar.innerHTML = `<button type="button" class="bbHead" data-act="toggle" aria-expanded="${openCard}"><b>Setup brief</b>${isEmpty(b) ? '<span class="bbNone">nothing set: optional</span>' : ''}${nq ? `<span class="bbBadge">${nq} to ask</span>` : ''}</button>${rows.map(chip).join('')}`;
    bar.classList.toggle('empty', isEmpty(b));
    if (!openCard) return;
    let cons = '';
    try { const c = consequence(store.tank, b, loadProfile(), units()); cons = `<div class="bbCons${c.over ? ' over' : ''}"><b>This tank now:</b> ${esc(c.totals)}.${c.line ? ` <span>${esc(c.line)}</span>` : ''}</div>`; } catch { /* no tank to price yet */ }
    const items = rows.map(r => `<div class="bbRow"><b>${esc(r.label)}</b>${r.items.length ? r.items.map(i => `<span class="bbItem ${i.status}">${esc(i.label)}${i.status === 'hard' ? ' <i>limit</i>' : ''}<button type="button" data-lock="${esc(i.key)}" aria-pressed="${i.status === 'locked'}" title="${i.status === 'locked' ? 'Locked: suggestions keep it. Click to unlock.' : 'Lock it: suggestions will keep it.'}">${i.status === 'locked' ? 'Locked' : 'Lock'}</button><button type="button" data-del="${esc(i.key)}" aria-label="Remove ${esc(i.label)}">✕</button></span>`).join('') : `<span class="bbOpen">${esc(r.text)}</span>`}</div>`).join('');
    const sp = spaceOf(b), cap = budgetOf(b), t = careTimeOf(b), r1 = (mm: number) => String(Math.round(mm / k() * 10) / 10);
    const evalBox = next.action === 'evaluate' && ev?.text ? `<div class="bbEval ${ev.fits === false ? 'bad' : ''}" role="status"><b>Checked before proposing:</b> ${esc(ev.text)}</div>` : '';
    bar.insertAdjacentHTML('beforeend', `<div class="bbCard">${evalBox}${next.questions[0] ? askCard(next.questions[0]) : ''}
<div class="bbLimits">${input('bbBudget', 'Up to', cap === undefined ? '' : String(cap), '$ set-up', 10)}${input('bbTime', 'Time', t === undefined ? '' : String(t), 'min a week', 5)}<span class="bbIn"><span>Space</span><input id="bbW" type="number" min="0" aria-label="Width" placeholder="wide" value="${sp ? r1(sp.w) : ''}"> x <input id="bbD" type="number" min="0" aria-label="Depth" placeholder="deep" value="${sp ? r1(sp.d) : ''}"><em>${units()}</em></span></div>
${items}${cons}
<div class="bbFoot"><button type="button" class="primary" data-act="fill">Fill in what I left open</button><button type="button" class="spLink" data-act="clear">Clear the brief</button><span class="spNote">Locked items stay as they are. Welfare checks always apply; they are not a setting.</span></div></div>`);
  };

  bar.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!t) return;
    if (t.dataset.ans) { const q = (t.closest('[data-q]') as HTMLElement).dataset.q as Question['id']; editBrief(b => answer(b, q, t.dataset.ans!, units())); return; }
    if (t.dataset.skip) { const q = t.dataset.skip as Question['id']; editBrief(b => answer(b, q, q === 'space' || q === 'careTime' ? 'none' : q === 'activity' ? 'either' : 'small', units())); return; }
    if (t.dataset.lock) { editBrief(b => toggleLock(b, t.dataset.lock!)); return; }
    if (t.dataset.del) { editBrief(b => removeItem(b, t.dataset.del!)); return; }
    if (t.dataset.g || t.dataset.act === 'toggle') { openCard = t.dataset.act === 'toggle' ? !openCard : true; draw(); return; }
    if (t.dataset.act === 'clear') { setBrief(emptyBrief()); return; }
    if (t.dataset.act === 'fill') { openCard = false; draw(); host.suggest(); }
  };
  bar.onchange = e => {
    const el = e.target as HTMLInputElement, v = el.value.trim() === '' ? undefined : parseFloat(el.value);
    if (el.id === 'bbBudget') editBrief(b => setBudget(b, v));
    else if (el.id === 'bbTime') editBrief(b => setCareTime(b, v));
    else if (el.id === 'bbW' || el.id === 'bbD') {
      const w = parseFloat((bar.querySelector('#bbW') as HTMLInputElement).value), d = parseFloat((bar.querySelector('#bbD') as HTMLInputElement).value);
      editBrief(b => Number.isFinite(w) && Number.isFinite(d) && w > 0 && d > 0 ? setSpace(b, { w: Math.round(w * k()), d: Math.round(d * k()) }, units()) : setSpace(b, undefined));
    }
  };
  bar.onkeydown = e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') (e.target as HTMLInputElement).blur(); };
  if (import.meta.env.DEV) (window as unknown as { __brief?: typeof brief }).__brief = brief; // dev hook for the screenshot driver, like __gb
  onBrief(() => draw());
  let tick: ReturnType<typeof setTimeout> | undefined; // the totals follow the tank while the card is open, at most a few times a second
  store.subscribe(() => { if (openCard && !tick) tick = setTimeout(() => { tick = undefined; if (!bar.contains(document.activeElement)) draw(); }, 400); });
  draw();
  return { open() { openCard = true; draw(); }, close() { openCard = false; draw(); }, draw };
}
export type { Brief };
