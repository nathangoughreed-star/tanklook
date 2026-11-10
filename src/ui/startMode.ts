// DX5 (2026-11-09): ONE project. New tank offers three ENTRY SHORTCUTS into the same project, not modes: Just exploring (empty project, opens Discovery with every tab),
// I have some ideas (empty room, you add and lock what you know, then Discover), I have an existing setup (My equipment + Tank first). No mode is stored any more; the
// old Sandbox flags bar is retired (the Checks strip, lane DX1, is the one verdict). History: New tank: Guided or Sandbox (lane NG1, Nathan 2026-10-29). Two equal cards. Guided enters the Welcome workspace (ui/welcome.ts);
// Sandbox (UI2 2026-11-04: Start sandbox opens a second screen of four kind cards) is an empty tank of the chosen kind with the checks shown as flags that
// never block; an animal-welfare problem is always red and says it is not a valid tradeoff. A Guardrails list shows the brief items
// switched off (`off`) and turns them back on; one button switches Sandbox to Guided and keeps the tank. The pure part is testable.
import type { Store } from '../scene/store';
import { ITEM_IDS, type Brief, type ItemId } from '../scene/brief';
import type { HabitatDirection } from '../scene/discoveryTypes';
import { HABITAT_PICS } from './habitatPics';
import { showIntro } from './introPopup';
import { labelOf, getBrief, editBrief, onBrief, rangeOf } from './setupBrief';
import { demandOf } from '../demand';
import { setOff, against } from '../scene/brief';
import { STEP_TITLE, HABITAT_CHOICES, canClose, backOf, routeChoice, type StartStep, type StartChoice } from './startScreenLogic';
import { summaryOf, LEVEL_WORD, type StockSummary } from './stockSummary';

export const NOT_VALID_TRADEOFF = 'not a valid tradeoff';

/** The brief items switched off, in display order, with their labels. */
export function guardrailRows(b: Brief): { id: ItemId; label: string }[] {
  return ITEM_IDS.filter(i => b.items[i]?.off).map(id => ({ id, label: labelOf(b, id) }));
}
/** The brief items still checking (on), the ones the Guardrails dialog can turn off. Welfare checks are not brief items, so never appear. */
export function activeRows(b: Brief): { id: ItemId; label: string }[] {
  return ITEM_IDS.filter(i => b.items[i] && !b.items[i]!.off).map(id => ({ id, label: labelOf(b, id) }));
}

/** Cost against the brief's ranges (lane GV8): red above an upper bound, amber below a lower bound; never blocks. `item` is the brief item that can be turned off. */
export function costFlags(b: Brief, setupUsd: number, monthlyUsd: number): Flag[] {
  const out: Flag[] = [], usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const one = (id: 'constraints.budget' | 'constraints.monthly', what: string, v: number, unit: string) => {
    const r = rangeOf(b, id), at = against(r, v);
    if (at === 'above') out.push({ level: 'problem', side: 'over', welfare: false, cat: 'Cost', item: id, text: `${what} ${usd(v)}${unit} is over your ${usd(r.max!)}${unit} maximum.` });
    else if (at === 'below') out.push({ level: 'caution', side: 'under', welfare: false, cat: 'Cost', item: id, text: `${what} ${usd(v)}${unit} is under your ${usd(r.min!)}${unit} minimum.` });
  };
  one('constraints.budget', 'Set-up', setupUsd, ''); one('constraints.monthly', 'Upkeep', monthlyUsd, ' a month');
  return out;
}

export interface Flag { level: 'problem' | 'caution'; /** cost flags: above the upper bound or below the lower one */ side?: 'over' | 'under'; text: string; /** an animal-welfare failure: always red, never a choice */ welfare: boolean; cat: string; /** the brief item behind this flag; only such flags can be turned off */ item?: ItemId }
/** Sandbox flags from the stocking summary: every Problem is a welfare failure (red, labelled), every Caution an amber flag. Nothing here blocks. */
export function sandboxFlags(sm: StockSummary): Flag[] {
  const out: Flag[] = [];
  for (const c of sm.cats) for (const i of c.items) if (i.level === 'problem') out.push({ level: 'problem', welfare: true, cat: c.label, text: i.text }); else if (i.level === 'caution') out.push({ level: 'caution', welfare: false, cat: c.label, text: i.text });
  return out.sort((a, b) => +(b.level === 'problem') - +(a.level === 'problem'));
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface StartModeHost {
  /** AB4: an empty project of the answered habitat (after the new-project warning), the direction stored as a soft preference; false when cancelled. */ begin(direction: HabitatDirection): boolean | Promise<boolean>;
  /** The owned-gear sheet (ui/ownedGear.ts): tick the tank, light, heater and filter you already have. */ owned(): void;
  /** Fill a step's lists when it opens (starters gallery, saved tanks, deals); the screen itself only shows and hides the steps. */ enter?(step: StartStep): void;
  /** The demand profile for the cost flags (lazy: the demand panel loads after start-up). */ profile?(): Parameters<typeof demandOf>[1] | undefined;
}

/** The retired Sandbox flags bar (kept for its tests; nothing switches it on). */
const SANDBOX_BAR = false as boolean;
export function attachStartMode(store: Store, host: StartModeHost) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const dlg = $<HTMLDialogElement>('startDlg'), guard = $<HTMLDialogElement>('guardDlg'), bar = $('sandboxBar');
  const kindList = $('habitatList'), closeBtn = $<HTMLButtonElement>('startClose'), backBtn = $<HTMLButtonElement>('startBack');
  const base = import.meta.env.BASE_URL;
  /** SL1: true from first load until a project is started; then the screen can be closed (the toolbar New / Open open it again). */
  let first = false, step: StartStep = 'home';
  /** A picture slot shows a neutral placeholder; public/art/<data-art>.webp (1536 x 1024) fills it when it exists, a missing file just leaves the placeholder. */
  const fillPics = (root: HTMLElement) => { for (const p of root.querySelectorAll<HTMLElement>('.mode-pic[data-art]:not(:has(img))')) { const i = document.createElement('img'); i.alt = ''; i.decoding = 'async'; i.onload = () => i.classList.add('ok'); i.onerror = () => i.remove(); i.src = `${base}art/${p.dataset.art}.webp`; p.append(i); } };
  /** The project started (or a tank opened): the screen closes and stays closable from now on. */
  const done = () => { first = false; if (dlg.open) dlg.close(); };
  kindList.replaceChildren(...HABITAT_CHOICES.map(({ id, label, tip }) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.habitat = id; b.className = 'start-mode-card habitat-card';
    b.innerHTML = `<div class="mode-pic habitat-pic">${HABITAT_PICS[id]}</div><b>${esc(label)}</b><span class="hint">${esc(tip)}</span>`;
    // the intro popup shows on every NEW project (spec 2.2); done() first so the start screen is gone behind it
    b.onclick = async () => { if (await host.begin(id)) { done(); await showIntro(); } };
    return b;
  }));
  const show = (s: StartStep) => {
    step = s;
    for (const sec of dlg.querySelectorAll<HTMLElement>('section[data-step]')) sec.hidden = sec.dataset.step !== s;
    $('startTitle').textContent = STEP_TITLE[s];
    closeBtn.hidden = !canClose(first); backBtn.hidden = backOf(s) === null;
    host.enter?.(s); fillPics(dlg);
    (dlg.querySelector<HTMLElement>(`section[data-step="${s}"] button`) ?? backBtn).focus?.();
  };
  /** Open the screen at a step. first = this is the first-load screen (mandatory); otherwise it can be closed. */
  const open = (s: StartStep, isFirst = false) => { first = isFirst || (first && dlg.open); if (!dlg.open) dlg.showModal(); show(s); };
  dlg.addEventListener('cancel', e => { if (!canClose(first)) e.preventDefault(); }); // Esc does nothing on first load
  closeBtn.onclick = () => { if (canClose(first)) dlg.close(); };
  backBtn.onclick = () => { const to = backOf(step); if (to) show(to); };
  for (const [id, c] of [['startNew', 'new'], ['startStarters', 'starters'], ['startOpen', 'open']] as [string, StartChoice][]) $(id).onclick = () => show(routeChoice(c));
  $('startDeals').onclick = () => show('deals');

  const drawBar = () => {
    if (!SANDBOX_BAR) { bar.hidden = true; return; } // DX5: retired, there is no Sandbox mode any more
    let flags: Flag[] = [];
    try { flags = sandboxFlags(summaryOf(store.tank, (store.scene.units ?? 'in') === 'in' ? 'in' : 'cm')); } catch { /* an empty tank has nothing to flag */ }
    try { const P = host.profile?.(); if (P) { const t = demandOf(store.tank, P).totals; flags.push(...costFlags(getBrief(), t.setupUsd, t.upkeepUsdMo)); } } catch { /* no price yet */ }
    flags.sort((a, c) => +(c.level === 'problem') - +(a.level === 'problem'));
    const off = guardrailRows(getBrief()).length;
    bar.hidden = false;
    bar.innerHTML = `<div class="sb-head"><b>Sandbox</b> <span class="hint">every check is a flag; none blocks you</span>` +
      `<span class="sb-btns"><button type="button" class="linkbtn" data-sb="guard">Guardrails${off ? ` (${off} off)` : ''}</button> · <button type="button" class="linkbtn" data-sb="guided" title="Keep this tank and open the Guided workspace">Switch to Guided</button></span></div>` +
      (flags.length ? `<ul class="sb-flags">${flags.map(f => `<li class="sb-flag ${f.level}"><i>${f.welfare ? 'Welfare problem, ' + NOT_VALID_TRADEOFF : f.cat === 'Cost' ? (f.side === 'under' ? 'Under budget' : 'Over budget') : LEVEL_WORD.caution}</i> ${esc(f.text)}${f.item ? ` <button type="button" class="linkbtn" data-off="${f.item}" title="Stop checking this against your brief (Guardrails turns it back on)">Turn off this check</button>` : ''}</li>`).join('')}</ul>` : '<div class="hint">No flags.</div>');
  };
  const drawGuard = () => {
    const b = getBrief(), off = guardrailRows(b), on = activeRows(b);
    $('guardList').innerHTML = (off.length ? `<h3>Off</h3>${off.map(r => `<div class="bbRow"><b>${esc(r.label)}</b> <span class="hint">off</span> <button type="button" data-on="${r.id}">Turn back on</button></div>`).join('')}` : '<p class="hint">Nothing is switched off: every item in your brief is being checked.</p>')
      + (on.length ? `<h3>Checking</h3>${on.map(r => `<div class="bbRow"><b>${esc(r.label)}</b> <button type="button" data-off="${r.id}">Turn off this check</button></div>`).join('')}` : '')
      + '<p class="hint">Animal welfare checks always apply: they are not listed because they cannot be turned off.</p>';
  };
  bar.onclick = e => {
    const o = (e.target as HTMLElement).closest<HTMLElement>('[data-off]');
    if (o) { editBrief(b => setOff(b, o.dataset.off as ItemId, true)); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-sb]'); if (!t) return;
    if (t.dataset.sb === 'guard') { drawGuard(); guard.showModal(); } else { drawBar(); }
  };
  guard.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-on],[data-off]'); if (!t) return;
    const id = (t.dataset.on ?? t.dataset.off) as ItemId, off = t.dataset.off !== undefined;
    editBrief(b => setOff(b, id, off)); drawGuard();
  });
  store.subscribe(drawBar); onBrief(drawBar); drawBar();
  return { open, done, isOpen: () => dlg.open, drawBar };
}
