// The coach in the page (lane GW1, 2026-11-05): opens the real side-panel sections and dialogs, softly spotlights the control and shows a small card (title, why, Back / Skip /
// Next, step n of m). The walk itself is runner.ts; the steps are steps.ts. Checked in the browser (shots/gw1/), the runner is tested without one (test/coach.test.ts).
import './coach.css';
import type { Store } from '../../scene/store';
import { emptyBrief, hasState, projectExtras, setProjectExtras } from '../../scene/brief';
import { createCoach, type CoachCard, type CoachHost, type CoachOpened, type CoachProgress } from './runner';
import { DEMO_STEPS, type CoachCtx, type CoachStep, type CoachTarget } from './steps';

/** What the page lets the coach open: dialog names used by `CoachTarget.dialog`. Each returns once the dialog is (about to be) open. */
export interface CoachDialogs { [name: string]: () => void | Promise<void> }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const visible = (el: Element) => el.getClientRects().length > 0;

export function attachCoach(store: Store, dialogs: CoachDialogs, steps: readonly CoachStep[] = DEMO_STEPS) {
  const btn = $<HTMLButtonElement>('guideBtn');
  let cardEl: HTMLElement | undefined, scrim: HTMLElement | undefined, ring: HTMLElement | undefined, spot: Element | null = null, openDlg: HTMLDialogElement | null = null;
  let shown: CoachCard | undefined;
  const listeners = new Set<() => void>();
  const notify = () => { for (const fn of listeners) fn(); };

  const ctx = (): CoachCtx => ({ scene: store.scene, tank: store.tank, brief: store.tank.brief ?? emptyBrief() });

  /** Where the card sits: at the bottom of the 3D view (on a phone just above the panel), or inside the dialog the step opened (a modal dialog makes the rest of the page inert). */
  const parent = (dlg?: Element | null) => (dlg as HTMLElement | null | undefined) ?? $('view');

  // ---- the spotlight: a ring round the control, the rest of the PANEL dimmed (never the 3D view, and pointer-events are off, so nothing is blocked) ----
  function place() {
    if (!ring || !scrim) return;
    if (!spot || !visible(spot)) { scrim.hidden = true; return; }
    const side = $('side').getBoundingClientRect(), r = spot.getBoundingClientRect(), inSide = !!spot.closest('#side');
    const box = inSide ? side : new DOMRect(0, 0, innerWidth, innerHeight);
    scrim.hidden = false;
    Object.assign(scrim.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    scrim.classList.toggle('dim', inSide);
    Object.assign(ring.style, { left: r.left - box.left - 4 + 'px', top: r.top - box.top - 3 + 'px', width: r.width + 8 + 'px', height: r.height + 6 + 'px' });
  }
  const onMove = () => place();

  function drawCard(c: CoachCard) {
    shown = c;
    if (!cardEl) return;
    cardEl.classList.toggle('done', c.done);
    cardEl.innerHTML = `<div class="coachHead"><span class="coachN">Step ${c.n} of ${c.m}</span><span class="coachTick" ${c.done ? '' : 'hidden'}>✓ Done</span><button type="button" class="coachX" data-a="close" aria-label="Close the guide" title="Close the guide (Esc); Guide me picks up here">✕</button></div>
      <h3 class="coachT">${esc(c.step.title)}</h3><p class="coachWhy">${esc(c.step.why)}</p>
      <div class="coachBtns"><button type="button" data-a="back" ${c.canBack ? '' : 'disabled'}>Back</button>${c.canSkip ? '<button type="button" data-a="skip">Skip</button>' : ''}<button type="button" class="primary" data-a="next" ${c.canNext ? '' : 'disabled'}>${c.last ? 'Finish' : 'Next ›'}</button></div>`;
  }
  const ensureCard = () => {
    if (cardEl) return cardEl;
    cardEl = document.createElement('section'); cardEl.className = 'coachCard'; cardEl.setAttribute('role', 'region'); cardEl.setAttribute('aria-label', 'Guide'); cardEl.setAttribute('aria-live', 'polite');
    cardEl.addEventListener('click', e => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (a === 'next') void coach.next(); else if (a === 'back') void coach.back(); else if (a === 'skip') void coach.skip(); else if (a === 'close') coach.stop();
    });
    return cardEl;
  };
  const ensureScrim = () => {
    if (scrim) return;
    scrim = document.createElement('div'); scrim.className = 'coachScrim'; scrim.hidden = true; scrim.setAttribute('aria-hidden', 'true');
    ring = document.createElement('div'); ring.className = 'coachRing'; scrim.append(ring); document.body.append(scrim);
    $('side').addEventListener('scroll', onMove, { passive: true }); addEventListener('resize', onMove);
  };

  // ---- opening a target ----
  /** The panel is hidden (the "‹ Hide" button, or the phone's arrow tab): bring it back with the same button the person would press. */
  const showPanel = () => { if ($('app').classList.contains('collapsed')) $('sideOpen').click(); };
  const closeOwnDialog = () => { if (openDlg) { openDlg.style.paddingBottom = ''; if (openDlg.open) openDlg.close(); } openDlg = null; };

  async function open(t: CoachTarget): Promise<CoachOpened | null> {
    closeOwnDialog();
    if (t.dialog) {
      const run = dialogs[t.dialog]; if (!run) return null;
      await run();
      for (let i = 0; i < 30 && !document.querySelector('dialog[open]'); i++) await wait(50);   // some dialogs load their code on first use
      const dlg = document.querySelector<HTMLDialogElement>('dialog[open]'); if (!dlg) return null;
      openDlg = dlg; dlg.addEventListener('close', onDialogClose, { once: true });
      return { el: dlg, dialog: dlg };
    }
    if (!t.section && !t.control) return { el: null };
    showPanel();
    let sec: HTMLDetailsElement | null = null;
    if (t.section) {
      sec = document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${t.section}"]`); if (!sec) return null;
      if (!sec.open) { sec.open = true; await wait(80); }                                      // opening one section closes the others (panels.ts): let that settle before measuring
    }
    const el = t.control ? (sec ?? document).querySelector(t.control) : sec?.querySelector('summary') ?? null;
    if (!el || !visible(el)) return null;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    await wait(30);
    return { el };
  }
  /** The person closed the dialog the coach opened: the card comes back to the page, the step stays until they press Next / Skip or it completes. */
  function onDialogClose() {
    if (openDlg) openDlg.style.paddingBottom = '';
    openDlg = null;
    if (cardEl && shown) { parent().append(cardEl); cardEl.classList.remove('inDlg'); }
    notify();
  }

  const host: CoachHost = {
    open,
    show(c, o) {
      ensureScrim(); const el = ensureCard();
      parent(o.dialog).append(el); el.classList.toggle('inDlg', !!o.dialog);
      drawCard(c);
      // the card sits over a dialog: leave room under its content so the last fields can scroll clear of it
      if (o.dialog) (o.dialog as HTMLElement).style.paddingBottom = el.offsetHeight + 24 + 'px';
      spot = o.dialog ? null : o.el; place();
      for (const d of [100, 300]) setTimeout(place, d);                                         // a section that was still opening / the phone's panel resizing
      (el.querySelector<HTMLElement>('[data-a=next]:not([disabled])') ?? el.querySelector<HTMLElement>('[data-a=skip]'))?.focus({ preventScroll: true });
    },
    update(c) { drawCard(c); place(); },
    hide() { if (openDlg) openDlg.style.paddingBottom = ''; cardEl?.remove(); scrim?.remove(); scrim = ring = undefined; cardEl = undefined; spot = null; shown = undefined; btn.textContent = label(); },
    read: ctx,
    subscribe(fn) { listeners.add(fn); const off = store.subscribe(() => fn()); return () => { listeners.delete(fn); off(); }; },
    load: () => store.tank.brief?.project?.coach,
    save(p: CoachProgress | undefined) {
      const b = store.tank.brief ?? emptyBrief(), x = projectExtras(b), { coach: _c, ...rest } = x;
      if (!p && !x.coach) return;
      if (p && x.coach && JSON.stringify(x.coach) === JSON.stringify(p)) return;
      const nb = setProjectExtras(b, p ? { ...rest, coach: p } : rest);
      store.update(s => { const T = s.tanks[s.active]; if (hasState(nb)) T.brief = nb; else delete T.brief; }, { kind: 'view', history: false });   // progress is not an edit: no undo step, no rebuild
    },
    warn: m => console.warn(m),
  };
  const coach = createCoach(steps, host);

  const label = () => coach.resumable() ? 'Continue guide' : 'Guide me';
  btn.onclick = () => { if (coach.state.running) coach.stop(); else void coach.start().then(() => { btn.textContent = 'Close guide'; }); };
  btn.textContent = label();
  // the card belongs to the tank it started on: a new / opened tank ends the walk (its own progress, if any, waits in that tank's brief)
  store.subscribe(kind => { if (kind === 'load' && coach.state.running) coach.stop(); if (!coach.state.running) btn.textContent = label(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && coach.state.running && !document.querySelector('dialog[open]')) coach.stop(); });
  return coach;
}
