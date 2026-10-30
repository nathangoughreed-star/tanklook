// Guided v2 stepper (lane GV1, 2026-10-30): Kind > Start from > What you have > Limits, then the screen the intent leads to. One dialog (the Welcome
// dialog of index.html), a step rail, Back on every step, nothing disabled. The position is saved in the brief (steps.ts), so reload and share keep the place.
// The destination screens are other lanes' (stocking: GV4, look: GV5, Suggest: GV6, Report: GV3); this file only calls their existing entries.
import type { Store } from '../../scene/store';
import { applyKind, tankKind } from '../../scene/pickerKind';
import { editBrief, getBrief, onBrief, ownedKeys } from '../setupBrief';
import { attachWelcomeGuard } from '../welcomeGuard';
import { mountOwnedSheet, emptyOwned, type OwnedHost } from '../ownedGear';
import { valueOf } from '../../scene/brief';
import {
  INTENT_CARDS, KIND_CARDS, STEP_ASK, applyKindChoice, artPath, clearLimits, kindOf, nextStep, prevStep, railOf, readState, routeOf, setSetupHours, writeState,
  type GCard, type GIntent, type GKind, type GRoute, type GState, type GStep, type RailItem,
} from './steps';

export interface GuidedHost extends OwnedHost {
  /** The animal screen (Animals). */ stocking(): void;
  /** The look step (Appearance). */ look(): void;
  /** Suggest (Existing equipment, Open to ideas). */ suggest(): void;
  /** The printable report (lane GV3). Absent until that lane lands: the rail's last slot then waits. */ openReport?(): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const GO_LABEL: Record<GRoute, string> = { stocking: 'Choose animals', look: 'Explore looks', suggest: 'See ideas' };

/** A picture card: the art file when it exists (the <img> removes itself on error), else a soft gradient and an icon. Pure markup. */
export function cardHtml<I extends string>(c: GCard<I>, group: 'kind' | 'from', i: number, on: boolean, base = '/'): string {
  return `<button type="button" class="gv-card${on ? ' on' : ''}" data-gv="${group}:${c.id}" aria-pressed="${on}">`
    + `<span class="gv-art" style="--gv-h:${(i * 47 + 175) % 360}"><i class="gv-ph" aria-hidden="true">${c.icon}</i><img class="gv-img" src="${esc(base + artPath(c.art))}" alt="" loading="lazy" decoding="async"></span>`
    + `<b>${esc(c.title)}</b><span class="gv-line">${esc(c.line)}</span></button>`;
}
export function railHtml(items: RailItem[], reportReady: boolean): string {
  return items.map(r => `<li class="gv-r ${r.state}"${r.state === 'current' ? ' aria-current="step"' : ''}><button type="button" data-rail="${r.go}"${r.id === 'report' && !reportReady ? ' title="The report comes at the end of the setup" class="soon"' : ''}>${esc(r.label)}</button></li>`).join('');
}

export function attachGuidedFlow(dlg: HTMLDialogElement, store: Store, host: GuidedHost) {
  const $ = <T extends HTMLElement>(id: string) => dlg.querySelector<T>('#' + id)!;
  const rail = $('gvRail'), stepEl = $('gvStep'), back = $<HTMLButtonElement>('gvBack'), next = $<HTMLButtonElement>('gvNext'), hint = $('gvHint');
  const base = import.meta.env.BASE_URL;
  let g: GState = readState(getBrief()), owned = emptyOwned();
  let guardEl: HTMLElement | undefined, ownedBox: HTMLElement | undefined;

  const save = (s: GState) => { g = s; editBrief(b => writeState(b, s)); };
  const dock = document.createElement('nav'); dock.className = 'gv-dock'; dock.id = 'gvDock'; dock.hidden = true; dock.setAttribute('aria-label', 'Guided steps');
  document.body.append(dock);

  const goStep = (step: GStep) => { save({ ...g, step }); draw(); };
  const route = () => {
    const r = routeOf(g.intent ?? 'ideas');
    dlg.close(); drawDock(r);
    // the animal screen starts a fresh tank (stockPlan.open), which would drop the brief: carry the Guided brief over to it
    if (r === 'stocking') { const keep = getBrief(); host.stocking(); if (getBrief() !== keep) editBrief(() => keep); } else if (r === 'look') host.look(); else host.suggest();
  };
  const drawDock = (at: GStep | GRoute) => {
    dock.hidden = false;
    dock.innerHTML = `<ol class="gv-rail">${railHtml(railOf(at, g.intent), !!host.openReport)}</ol><button type="button" class="linkbtn" data-rail="${g.step}">Back to the steps</button>`;
  };

  function drawStep() {
    const s = g.step;
    $('gvAsk').textContent = STEP_ASK[s];
    stepEl.className = `gv-step gv-${s}`;
    if (s === 'kind') stepEl.innerHTML = `<p class="hint">Pick the kind of tank. "Any" keeps every kind open for the later steps.</p><div class="gv-cards">${KIND_CARDS.map((c, i) => cardHtml(c, 'kind', i, g.kind === c.id, base)).join('')}</div>`;
    else if (s === 'start') stepEl.innerHTML = `<p class="hint">Whichever you pick, you can add the rest as you go.</p><div class="gv-cards">${INTENT_CARDS.map((c, i) => cardHtml(c, 'from', i, g.intent === c.id, base)).join('')}</div>`;
    else if (s === 'have') {
      stepEl.replaceChildren(ownedBox ??= document.createElement('div'));
      if (!ownedBox.dataset.mounted) { ownedBox.dataset.mounted = '1'; mountOwnedSheet(store, host, ownedBox, { state: owned }); }
    } else {
      const lim = g.limits;
      stepEl.innerHTML = `<p class="hint">Limits are optional and never stop you: a plan that goes over one shows a warning with a fix. Animal welfare is not a limit; it always applies.</p>
        <div class="gv-yn" role="group" aria-label="Keep to limits?"><button type="button" data-gv="lim:yes" class="${lim === true ? 'on' : ''}" aria-pressed="${lim === true}">Yes, keep to limits</button><button type="button" data-gv="lim:no" class="${lim === false ? 'on' : ''}" aria-pressed="${lim === false}">No, nothing set</button></div>
        <div class="gv-limbox" id="gvLimBox"${lim ? '' : ' hidden'}></div>`;
      if (lim) {
        const box = stepEl.querySelector<HTMLElement>('#gvLimBox')!;
        if (!guardEl) { guardEl = document.createElement('section'); guardEl.className = 'welcomeGuard'; attachWelcomeGuard(guardEl); }
        const h = valueOf(getBrief(), 'constraints.setupHours');
        const hours = document.createElement('label'); hours.className = 'wgRow gv-hours';
        hours.innerHTML = `<span>Set-up time you will spend (hours)</span><input id="gvHours" type="number" min="0" step="1" placeholder="not specified" value="${h ?? ''}">`;
        box.append(guardEl, hours);
      }
    }
  }
  function updateNext() {
    if (g.step === 'have') {
      const any = owned.on.size > 0 || ownedKeys(getBrief()).includes('stand');
      next.textContent = any ? 'Next' : 'Nothing yet'; next.title = any ? '' : 'Skip: you have none of it';
    } else if (g.step === 'limits') { next.textContent = GO_LABEL[routeOf(g.intent ?? 'ideas')]; next.title = ''; }
    else { next.textContent = 'Next'; next.title = (g.step === 'kind' && !g.kind) || (g.step === 'start' && !g.intent) ? 'Skip: nothing fixed here' : ''; }
  }
  function draw() {
    rail.innerHTML = railHtml(railOf(g.step, g.intent), !!host.openReport);
    drawStep(); updateNext();
    back.hidden = !prevStep(g.step);
    hint.textContent = '';
  }

  const pickKind = (k: GKind) => {
    editBrief(b => applyKindChoice(b, k));
    const sk = kindOf(k);
    if (sk && !store.tank.fish.length && tankKind(store.tank) !== sk) store.edit(S => applyKind(S, sk)); // a populated tank keeps its water: the brief still holds the kind
    save({ ...g, kind: k, step: 'start' }); draw();
  };
  const pickIntent = (i: GIntent) => { save({ ...g, intent: i, step: 'have' }); draw(); };
  const answerLimits = (yes: boolean) => {
    if (!yes) editBrief(b => clearLimits(b)); // No = nothing set
    save({ ...g, limits: yes }); draw();
  };

  dlg.addEventListener('error', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('gv-img')) t.remove(); }, true);
  dlg.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-gv],[data-rail]'); if (!t) return;
    if (t.dataset.gv) {
      const [grp, id] = t.dataset.gv.split(':');
      if (grp === 'kind') pickKind(id as GKind); else if (grp === 'from') pickIntent(id as GIntent); else if (grp === 'lim') answerLimits(id === 'yes');
    } else goRail(t.dataset.rail!);
  });
  dock.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-rail]'); if (t) goRail(t.dataset.rail!); });
  const goRail = (to: string) => {
    if (to === 'report') { host.openReport?.(); return; }
    if (to === 'stocking' || to === 'look' || to === 'suggest') { if (g.step !== 'limits') save({ ...g, step: 'limits' }); route(); return; }
    save({ ...g, step: to as GStep }); dock.hidden = true; if (!dlg.open) dlg.showModal(); draw();
  };
  dlg.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'gvHours') { const n = el.value.trim() === '' ? undefined : parseFloat(el.value); editBrief(b => setSetupHours(b, n)); }
    updateNext();
  });
  dlg.addEventListener('click', () => queueMicrotask(updateNext));
  back.onclick = () => { const p = prevStep(g.step); if (p) goStep(p); };
  next.onclick = () => { const n = nextStep(g.step); if (n) goStep(n); else route(); };
  onBrief(() => { if (dlg.open) updateNext(); });
  store.subscribe(() => { if (dlg.open) updateNext(); });

  return {
    /** Open the stepper at the saved step (a fresh tank starts at Kind). */
    show() { g = readState(getBrief()); dock.hidden = true; if (!dlg.open) dlg.showModal(); draw(); (stepEl.querySelector('button') as HTMLElement | null)?.focus(); },
    state: () => g,
  };
}
