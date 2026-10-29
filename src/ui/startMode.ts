// New tank: Guided or Sandbox (lane NG1, Nathan 2026-10-29). Two equal cards. Guided enters the Welcome workspace (ui/welcome.ts);
// deals, starters and saved tanks are links under it. Sandbox is an empty tank of the chosen kind with the checks shown as flags that
// never block; an animal-welfare problem is always red and says it is not a valid tradeoff. A Guardrails list shows the brief items
// switched off (`off`) and turns them back on; one button switches Sandbox to Guided and keeps the tank. The pure part is testable.
import type { Store } from '../scene/store';
import { ITEM_IDS, type Brief, type ItemId } from '../scene/brief';
import { SETUP_KINDS, type SetupKind } from '../scene/pickerKind';
import { labelOf, getBrief, editBrief, onBrief } from './setupBrief';
import { setOff } from '../scene/brief';
import { summaryOf, LEVEL_WORD, type StockSummary } from './stockSummary';

export type Mode = 'guided' | 'sandbox';
const KEY = 'tanklook.mode';
export const getMode = (): Mode | undefined => { try { const m = localStorage.getItem(KEY); return m === 'guided' || m === 'sandbox' ? m : undefined; } catch { return undefined; } };
export const setMode = (m: Mode) => { try { localStorage.setItem(KEY, m); } catch { /* private mode: the mode lasts this page only */ } };

export const NOT_VALID_TRADEOFF = 'not a valid tradeoff';

/** The brief items switched off, in display order, with their labels. */
export function guardrailRows(b: Brief): { id: ItemId; label: string }[] {
  return ITEM_IDS.filter(i => b.items[i]?.off).map(id => ({ id, label: labelOf(b, id) }));
}

export interface Flag { level: 'problem' | 'caution'; text: string; /** an animal-welfare failure: always red, never a choice */ welfare: boolean; cat: string }
/** Sandbox flags from the stocking summary: every Problem is a welfare failure (red, labelled), every Caution an amber flag. Nothing here blocks. */
export function sandboxFlags(sm: StockSummary): Flag[] {
  const out: Flag[] = [];
  for (const c of sm.cats) for (const i of c.items) if (i.level === 'problem') out.push({ level: 'problem', welfare: true, cat: c.label, text: i.text }); else if (i.level === 'caution') out.push({ level: 'caution', welfare: false, cat: c.label, text: i.text });
  return out.sort((a, b) => +(b.level === 'problem') - +(a.level === 'problem'));
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface StartModeHost {
  /** Enter the Welcome workspace (Guided). */ guided(): void;
  /** An empty tank of the kind (false when the person cancelled the replace warning). */ sandbox(kind: SetupKind): boolean;
  /** The deals / starters / saved-tank lists. */ browse(menu: 'new' | 'open', tab?: 'starters' | 'open'): void;
  /** An extra flag line (cost against the brief's ceiling); optional. */ costFlag?(): string | undefined;
}

export function attachStartMode(store: Store, host: StartModeHost, initialKind: SetupKind = 'freshwater') {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const dlg = $<HTMLDialogElement>('modeDlg'), guard = $<HTMLDialogElement>('guardDlg'), bar = $('sandboxBar');
  let kind = initialKind;
  const kindBox = $('modeKind');
  kindBox.replaceChildren(kindBox.firstElementChild!, ...SETUP_KINDS.map(([k, label, tip]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.kind = k; b.textContent = label; b.title = tip;
    b.onclick = () => { kind = k; paintKind(); };
    return b;
  }));
  const paintKind = () => { for (const x of kindBox.querySelectorAll<HTMLButtonElement>('button')) { const on = x.dataset.kind === kind; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); } };
  paintKind();

  const drawBar = () => {
    if (getMode() !== 'sandbox') { bar.hidden = true; return; }
    let flags: Flag[] = [];
    try { flags = sandboxFlags(summaryOf(store.tank, (store.scene.units ?? 'in') === 'in' ? 'in' : 'cm')); } catch { /* an empty tank has nothing to flag */ }
    const cost = host.costFlag?.(), off = guardrailRows(getBrief()).length;
    bar.hidden = false;
    bar.innerHTML = `<div class="sb-head"><b>Sandbox</b> <span class="hint">every check is a flag; none blocks you</span>` +
      `<span class="sb-btns"><button type="button" class="linkbtn" data-sb="guard">Guardrails${off ? ` (${off} off)` : ''}</button> · <button type="button" class="linkbtn" data-sb="guided" title="Keep this tank and open the Guided workspace">Switch to Guided</button></span></div>` +
      (flags.length || cost ? `<ul class="sb-flags">${flags.map(f => `<li class="sb-flag ${f.level}"><i>${f.welfare ? 'Welfare problem, ' + NOT_VALID_TRADEOFF : LEVEL_WORD.caution}</i> ${esc(f.text)}</li>`).join('')}${cost ? `<li class="sb-flag caution"><i>Cost</i> ${esc(cost)}</li>` : ''}</ul>` : '<div class="hint">No flags.</div>');
  };
  const drawGuard = () => {
    const rows = guardrailRows(getBrief());
    $('guardList').innerHTML = rows.length
      ? rows.map(r => `<div class="bbRow"><b>${esc(r.label)}</b> <span class="hint">off</span> <button type="button" data-on="${r.id}">Turn back on</button></div>`).join('')
      : '<p class="hint">Nothing is switched off: every item in your brief is being checked.</p>';
  };
  bar.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-sb]'); if (!t) return;
    if (t.dataset.sb === 'guard') { drawGuard(); guard.showModal(); } else { setMode('guided'); drawBar(); host.guided(); }
  };
  guard.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-on]'); if (!t) return;
    editBrief(b => setOff(b, t.dataset.on as ItemId, false)); drawGuard();
  });
  dlg.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-browse]'); if (!t) return;
    const w = t.dataset.browse!; dlg.close(); setMode('guided'); drawBar();
    host.browse(w === 'new' ? 'new' : 'open', w === 'starters' ? 'starters' : w === 'open' ? 'open' : undefined);
  });
  $('modeGuided').onclick = () => { setMode('guided'); dlg.close(); drawBar(); host.guided(); };
  $('modeSandbox').onclick = () => { if (host.sandbox(kind)) { setMode('sandbox'); dlg.close(); drawBar(); } };
  store.subscribe(drawBar); onBrief(drawBar); drawBar();
  return { show() { paintKind(); if (!dlg.open) dlg.showModal(); $('modeGuided').focus(); }, drawBar };
}
