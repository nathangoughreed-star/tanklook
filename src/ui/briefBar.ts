// The setup brief bar (lane U3, 2026-10-28): one slim bar across the top of the view, shown in every entry point (stocking builder, look
// picker, tank chooser, Sandbox, Suggest). Five chips (Animals, Appearance, Tank and equipment, Constraints, Preferences) say what is set and
// what is open; the card under it holds the limits, locks, the next question (setupBrief.nextQuestions) and what the choices cost so far
// (briefFeasibility: the existing totals and guardrail check). Entry points only pre-fill; Sandbox needs nothing from it. The brief itself is
// the active tank's `TankSetup.brief` (scene/brief.ts), so it saves and undoes with the tank.
import type { Store } from '../scene/store';
import { onBuildPicked } from './buildPick';
import { loadProfile } from './demandPanel';
import {
  answer, answeredOf, directionOf, recordAnswer, setDirection, budgetOf, careTimeOf, editBrief, rangeOf, getBrief, isEmpty, lockedStock, nextQuestions, onBrief, removeItem, setTank, spaceOf, summarise, toggleLock,
  emptyBrief, setBrief, type Direction, type ItemId, type QId, type Question,
} from './setupBrief';
import { applyRetainedFix, consequence, evaluateAnimals, feasibilityNow, onReeval, retainedHtml, type ReevalNote } from './briefFeasibility';
import { pinnedKit } from '../demand/pinned';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const MM_IN = 25.4;

export function attachBriefBar(store: Store, host: { suggest(): void; /** opens the My equipment menu */ owned(): void; /** the "Your limits" panel */ limits(): void; /** the printable report */ report(): void }) {
  const host_ = document.getElementById('briefHost')!; // the Setup brief section of the side panel (UI3)
  const bar = document.createElement('div');
  bar.className = 'bb'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Setup brief');
  host_.append(bar);
  let openCard = true; // the card is the section's content now (UI3)
  // lane GS6: what the last tank change did to the design (adapted, never replaced), shown until dismissed; and what was asked for but cannot work now, with its fixes
  let note: ReevalNote | undefined;
  onReeval(n => { note = n; openCard = true; draw(); });
  // what the person said that the items cannot show (a "no limit", the direction that matters most) lives in the brief's dialog: saved, shared, undoable
  const units = () => (store.scene.units ?? 'in') as 'in' | 'cm';
  const k = () => units() === 'in' ? MM_IN : 10;

  // a build picked in the three-builds screen is a tank choice
  onBuildPicked(e => editBrief(b => setTank(b, { id: e.build.tank.id })));

  const askCard = (q: Question) => `<div class="bbAsk" data-q="${q.id}"><b>${esc(q.text)}</b> <span class="spNote">${esc(q.why)}</span><div class="bbOpts">${q.options.map(o => `<button type="button" data-ans="${o.id}">${esc(o.label)}</button>`).join('')}<button type="button" class="spLink" data-skip="${q.id}">Not sure</button></div></div>`;

  let keep: ReturnType<typeof feasibilityNow> | undefined;
  const draw = () => {
    const b = getBrief(), rows = summarise(b);
    const ctx = { direction: directionOf(b), answered: answeredOf(b), animalTankGal: undefined as number | undefined };
    let next = nextQuestions(b, ctx), ev: ReturnType<typeof evaluateAnimals> | undefined;
    if (lockedStock(b).length) {
      try { ev = evaluateAnimals(b); } catch { ev = undefined; }
      if (ev?.gal !== undefined) { ctx.animalTankGal = ev.gal; next = nextQuestions(b, ctx); }
    }
    const nq = next.questions.length;
    bar.innerHTML = `<button type="button" class="bbHead" data-act="toggle" aria-expanded="${openCard}"><b>Setup brief</b>${isEmpty(b) ? '<span class="bbNone">nothing set: optional</span>' : ''}${nq ? `<span class="bbBadge">${nq} to ask</span>` : ''}</button><button type="button" class="bbChip bbPanel" data-act="limits" title="Money, time, space, room and water: all optional"><span>Your limits</span></button>`;
    bar.classList.toggle('empty', isEmpty(b));
    if (!openCard) return;
    let cons = '';
    try { const P = loadProfile(), c = consequence(store.tank, b, P, units(), pinnedKit(store.tank, store.scene.active, P)); cons = `<div class="bbCons${c.over ? ' over' : ''}"><b>This tank now:</b> ${esc(c.totals)}.${c.line ? ` <span>${esc(c.line)}</span>` : ''}</div>`; } catch { /* no tank to price yet */ }
    const items = rows.map(r => `<div class="bbRow"><b>${esc(r.label)}</b>${r.rows.length ? r.rows.map(i => `<span class="bbItem ${i.status}">${esc(i.label)}${i.status === 'hard' ? ' <i>limit</i>' : ''}<button type="button" data-lock="${i.id}" aria-pressed="${i.status === 'locked'}" title="${i.status === 'locked' ? 'Locked: suggestions keep it. Click to unlock.' : 'Lock it: suggestions will keep it.'}">${i.status === 'locked' ? 'Locked' : 'Lock'}</button><button type="button" data-del="${i.id}" aria-label="Remove ${esc(i.label)}">✕</button></span>`).join('') : `<span class="bbOpen">${esc(r.text)}</span>`}</div>`).join('');
    const sp = spaceOf(b), cap = budgetOf(b), t = careTimeOf(b), rb = rangeOf(b, 'constraints.budget'), rt = rangeOf(b, 'constraints.careMin'), r1 = (mm: number) => String(Math.round(mm / k() * 10) / 10);
    const noteBox = note ? `<div class="bbEval${note.warning ? ' bad' : ''}" role="status"><b>Your design was adapted, not replaced:</b> ${note.lines.map(esc).join(' ')}${note.warning ? ` <b>${esc(note.warning)}</b>` : ''} <button type="button" class="spLink" data-act="dismissnote">Dismiss</button></div>` : '';
    keep = feasibilityNow(b, store.tank);
    const keepBox = retainedHtml(keep, esc);
    const rng = (r: { min?: number; max?: number }, f: (n: number) => string) => r.min !== undefined && r.max !== undefined ? `${f(r.min)} to ${f(r.max)}` : r.max !== undefined ? `up to ${f(r.max)}` : r.min !== undefined ? `at least ${f(r.min)}` : '';
    const lim = [['Set-up', rng({ min: rb.min, max: cap }, n => '$' + n)], ['Time', rng({ min: rt.min, max: t }, n => n + ' min a week')], ['Space', sp ? `${r1(sp.w)} x ${r1(sp.d)} ${units()}` : '']].filter(x => x[1]);
    const limitsLine = `<span class="bbLimLine">${lim.length ? lim.map(([l, v]) => `<b>${l}</b> ${esc(v)}`).join(' · ') : 'No limits set: optional.'}</span> `;
    const evalBox = next.action === 'evaluate' && ev?.text ? `<div class="bbEval ${ev.fits === false ? 'bad' : ''}" role="status"><b>Checked before proposing:</b> ${esc(ev.text)}</div>` : '';
    bar.insertAdjacentHTML('beforeend', `<div class="bbCard">${noteBox}${keepBox}${evalBox}${next.questions[0] ? askCard(next.questions[0]) : ''}
<div class="bbLimits">${limitsLine}<button type="button" class="spLink" data-act="limits" title="Money, time, space and care level are set in Your limits (one home); this line only shows them">Edit in Your limits</button></div>
${items}${cons}
<div class="bbFoot"><button type="button" class="primary" data-act="fill">Fill in what I left open</button><button type="button" class="spLink" data-act="clear">Clear the brief</button><button type="button" disabled title="Coming: shopping list, set-up steps, cycling and stocking order">Build plan</button><span class="spNote">Locked items stay as they are. Welfare checks always apply; they are not a setting.</span></div></div>`);
  };

  const take = (q: QId, option: string) => {
    editBrief(b => { let n = recordAnswer(answer(b, q, option), q); if (q === 'priority') n = setDirection(n, option as Direction); return n; });
    draw();
  };
  bar.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!t) return;
    if (t.dataset.ans) { take((t.closest('[data-q]') as HTMLElement).dataset.q as QId, t.dataset.ans); return; }
    if (t.dataset.skip) { const q = t.dataset.skip as QId; take(q, q === 'space' || q === 'careTime' ? 'none' : q === 'activity' ? 'either' : 'small'); return; }
    if (t.dataset.lock) { editBrief(b => toggleLock(b, t.dataset.lock as ItemId)); return; }
    if (t.dataset.del) { editBrief(b => removeItem(b, t.dataset.del as ItemId)); return; }
    if (t.dataset.keepfix && keep) { const n = applyRetainedFix(getBrief(), keep, t.dataset.keepfix); if (n) editBrief(() => n); return; }
    if (t.dataset.act === 'dismissnote') { note = undefined; draw(); return; }
    if (t.dataset.act === 'limits') { host.limits(); return; }
    if (t.dataset.g || t.dataset.act === 'toggle') { openCard = t.dataset.act === 'toggle' ? !openCard : true; draw(); return; }
    if (t.dataset.act === 'clear') { setBrief(emptyBrief()); return; }
    if (t.dataset.act === 'fill') { openCard = false; draw(); host.suggest(); }
  };
  bar.onkeydown = e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') (e.target as HTMLInputElement).blur(); };
  onBrief(() => draw());
  let tick: ReturnType<typeof setTimeout> | undefined; // the totals follow the tank while the card is open, at most a few times a second
  store.subscribe(() => { if (openCard && !tick) tick = setTimeout(() => { tick = undefined; if (!bar.contains(document.activeElement)) draw(); }, 400); });
  draw();
  return { open() { openCard = true; draw(); }, close() { openCard = false; draw(); }, draw };
}
