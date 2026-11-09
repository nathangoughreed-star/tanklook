// DX5 (2026-11-09): ONE project. New tank offers three ENTRY SHORTCUTS into the same project, not modes: Just exploring (empty project, opens Discovery with every tab),
// I have some ideas (empty room, you add and lock what you know, then Discover), I have an existing setup (My equipment + Tank first). No mode is stored any more; the
// old Sandbox flags bar is retired (the Checks strip, lane DX1, is the one verdict). History: New tank: Guided or Sandbox (lane NG1, Nathan 2026-10-29). Two equal cards. Guided enters the Welcome workspace (ui/welcome.ts);
// Sandbox (UI2 2026-11-04: Start sandbox opens a second screen of four kind cards) is an empty tank of the chosen kind with the checks shown as flags that
// never block; an animal-welfare problem is always red and says it is not a valid tradeoff. A Guardrails list shows the brief items
// switched off (`off`) and turns them back on; one button switches Sandbox to Guided and keeps the tank. The pure part is testable.
import type { Store } from '../scene/store';
import { ITEM_IDS, type Brief, type ItemId } from '../scene/brief';
import { SETUP_KINDS, type SetupKind } from '../scene/pickerKind';
import { labelOf, getBrief, editBrief, onBrief, rangeOf } from './setupBrief';
import { demandOf } from '../demand';
import { setOff, against } from '../scene/brief';
import { summaryOf, LEVEL_WORD, type StockSummary } from './stockSummary';

/** The three ways to begin (entry shortcuts, not modes). */
export type StartEntry = 'exploring' | 'ideas' | 'existing';
export const START_ENTRIES: readonly { id: StartEntry; label: string }[] = [
  { id: 'exploring', label: 'Just exploring' }, { id: 'ideas', label: 'I have some ideas' }, { id: 'existing', label: 'I have an existing setup' },
];

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
  /** "Just exploring": an empty project (after the new-project warning), then Discovery with every tab ticked; false when cancelled. */ exploring(): boolean | Promise<boolean>;
  /** "I have some ideas": an empty room of the kind (after the warning); the person adds and locks what they know, then Discovers. false when cancelled. */ ideas(kind: SetupKind): boolean | Promise<boolean>;
  /** "I have an existing setup": an empty project (after the warning), then My equipment with the Tank row first. false when cancelled. */ existing(): boolean | Promise<boolean>;
  /** The owned-gear sheet (ui/ownedGear.ts): tick the tank, light, heater and filter you already have. */ owned(): void;
  /** The deals / starters / saved-tank lists. */ browse(menu: 'new' | 'open', tab?: 'starters' | 'open'): void;
  /** The demand profile for the cost flags (lazy: the demand panel loads after start-up). */ profile?(): Parameters<typeof demandOf>[1] | undefined;
}

/** The retired Sandbox flags bar (kept for its tests; nothing switches it on). */
const SANDBOX_BAR = false as boolean;
export function attachStartMode(store: Store, host: StartModeHost) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const dlg = $<HTMLDialogElement>('modeDlg'), guard = $<HTMLDialogElement>('guardDlg'), bar = $('sandboxBar');
  const main = $('modeMain'), kinds = $('modeKinds'), kindList = $('modeKindList');
  const base = import.meta.env.BASE_URL;
  /** A picture slot shows a neutral placeholder; public/art/<data-art>.webp (1536 x 1024) fills it when it exists, a missing file just leaves the placeholder. */
  const fillPics = (root: HTMLElement) => { for (const p of root.querySelectorAll<HTMLElement>('.mode-pic[data-art]:not(:has(img))')) { const i = document.createElement('img'); i.alt = ''; i.decoding = 'async'; i.onload = () => i.classList.add('ok'); i.onerror = () => i.remove(); i.src = `${base}art/${p.dataset.art}.webp`; p.append(i); } };
  kindList.replaceChildren(...SETUP_KINDS.map(([k, label, tip]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.kind = k; b.className = 'start-mode-card';
    b.innerHTML = `<div class="mode-pic" data-art="start/${k}"></div><b>${label}</b><span class="hint">${esc(tip)}</span>`;
    b.onclick = async () => { if (await host.ideas(k)) dlg.close(); };
    return b;
  }));
  const screen = (kindsOn: boolean) => { main.hidden = kindsOn; kinds.hidden = !kindsOn; $('modeTitle').textContent = 'New tank'; fillPics(dlg); (kindsOn ? kindList.querySelector<HTMLElement>('button') : $('modeExploring'))?.focus(); };

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
  $('modeExploring').onclick = async () => { if (await host.exploring()) dlg.close(); };
  $('modeIdeas').onclick = () => screen(true);
  $('modeExisting').onclick = async () => { if (await host.existing()) dlg.close(); };
  $('modeBack').onclick = () => screen(false);
  store.subscribe(drawBar); onBrief(drawBar); drawBar();
  return { show() { if (!dlg.open) dlg.showModal(); screen(false); }, /** the kind cards (the picker's way back, lane ST1) */ showKinds() { if (!dlg.open) dlg.showModal(); screen(true); }, drawBar };
}
