// DQ10: Discover inside the editor. A small card over the live view (no screen, no freeze): "N kept, M open", Finish my setup / Fill this section, then a PREVIEW drawn through the viewer
// (viewer.setPreview: the design is not written), with Regenerate / Apply / Close. Earlier previews stay in a short back list for the session (D8); a design that changed under the preview
// marks it stale and drops its picture (never applied); "no design fits" shows the conflicts and the smallest changes, one button each, applied one at a time (D9). The A/B screen is untouched.
import { TAB_LABEL, countText, createInline, gapTabs, type InlineController, type RunResult } from './logic';
import { registerInline } from './entry';
import { conflictCardHtml } from '../infeasibleCard';
import { PRESETS, PRESET_INFO, type Preset } from '../../scene/breadth';
import { discoverTabs } from '../../scene/discoverScope';
import { getBrief } from '../setupBrief';
import type { Tab } from '../../scene/scope';
import type { Store } from '../../scene/store';
import type { Viewer } from '../../render/viewer';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const VERB = { add: 'Adds', remove: 'Removes', change: 'Changes' } as const;

export interface InlineUI { open(): void; close(): void; ctl: InlineController }
export function attachInline(store: Store, viewer: Viewer, deps: { status: (msg: string, warn?: boolean) => void }): InlineUI {
  const host = document.getElementById('view') ?? document.body;
  const root = document.createElement('div');
  root.className = 'dq10'; root.setAttribute('aria-label', 'Discover in the editor');
  host.appendChild(root);
  const ctl = createInline(store, { brief: getBrief, show: t => viewer.setPreview(t ? structuredClone(t) : null, false) });
  let openCard = false, busy = false, note = '', fail: Extract<RunResult, { ok: false }> | undefined, fillTab: Tab | '' = '';

  const draw = () => {
    root.hidden = store.frozen;   // the A/B screen holds the store: Discover in the editor waits
    if (root.hidden) return;
    if (!openCard) { root.innerHTML = `<button type="button" class="dq10-pill" data-a="open" title="Generate designs here, on your tank">Discover</button>`; return; }
    const cur = ctl.current(), counts = countText(ctl.counts()), gaps = gapTabs(store.effTank);
    if (!fillTab || !gaps.includes(fillTab)) fillTab = gaps[0] ?? '';
    const tabSel = `<select data-a="tab" aria-label="Section to fill"${gaps.length ? '' : ' disabled'}>${gaps.length ? gaps.map(t => `<option value="${t}"${t === fillTab ? ' selected' : ''}>${TAB_LABEL[t]}</option>`).join('') : '<option>Nothing missing</option>'}</select>`;
    let body = '';
    if (busy) body = '<p class="dq10-note" role="status">Looking for designs that fit&hellip;</p>';
    else if (cur) {
      body = `<div class="dq10-prev${cur.stale ? ' stale' : ''}"><b>${esc(cur.title)}</b>`
        + (cur.stale ? '<p class="dq10-warn" role="alert">Your design changed, so this preview is out of date. Regenerate to see one for the design as it is now.</p>' : '')
        + `<ul>${cur.rows.map(r => `<li>${VERB[r.verb]} ${r.tab === 'gear' ? '' : esc(TAB_LABEL[r.tab as Tab].toLowerCase()) + ': '}${esc(r.text)}</li>`).join('') || '<li>No change</li>'}</ul>`
        + `<p class="dq12-fit" role="status">${cur.fit === 1 ? 'Only this one fits' : `${cur.fit} designs fit`}</p>`
        + `<div class="dq10-row"><button type="button" class="primary" data-a="apply"${cur.stale ? ' disabled' : ''}>Apply</button><button type="button" data-a="regen">Regenerate</button></div>`
        + (ctl.back().length ? `<div class="dq10-back">Earlier: ${ctl.back().map((p, i) => `<button type="button" data-a="back" data-i="${i}"${p.stale ? ' disabled' : ''}>${esc(p.title)}</button>`).join(' ')}</div>` : '') + '</div>';
    } else if (fail) {
      body = fail.exhausted ? `<div class="dq10-nofit dq12-card" role="status"><b>That was every design</b><p class="dq12-kept">${esc(fail.conflicts[0] ?? '')}</p></div>`
        : fail.nothingMissing ? `<div class="dq10-nofit" role="status"><b>Nothing to fill</b><ul>${fail.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`
        : conflictCardHtml({ conflicts: fail.conflicts, relaxations: fail.relaxations, ...(fail.kept ? { kept: fail.kept } : {}) });
    }
    const pre = ctl.preset(), tankOn = discoverTabs(store.effTank).includes('tank'), kept = ctl.tankKept(), g = ctl.gates();
    const presets = `<div class="dq12-presets" role="group" aria-label="How different the designs are">${PRESETS.map(p => `<button type="button" class="${p === pre ? 'on' : ''}" data-a="preset" data-p="${p}" aria-pressed="${p === pre}" title="${esc(PRESET_INFO[p].hint)}">${PRESET_INFO[p].label}</button>`).join('')}</div>`;
    const tankLine = !tankOn ? '<p class="dq12-tank">Tank: not part of Discover (switched off).</p>' : kept
      ? '<p class="dq12-tank">Tank: kept. <button type="button" data-a="unlock" title="Let Discover pick a different tank">Unlock to let Discover change it</button></p>'
      : '<p class="dq12-tank">Tank: Discover may change it. <button type="button" data-a="keeptank">Keep the tank</button></p>';
    const rules = g.rules === 'sandbox' ? '<p class="dq12-rules">Sandbox: your budget and care limits are ignored. Animal welfare still applies.</p>' : '';
    root.innerHTML = `<div class="dq10-card"><div class="dq10-head"><b>Discover</b><span class="dq10-count" title="Kept pieces are never changed">${esc(counts)}</span><button type="button" class="dq10-x" data-a="close" aria-label="Close Discover">&times;</button></div>`
      + `<div class="dq10-row"><button type="button" class="primary" data-a="finish"${busy ? ' disabled' : ''} title="New designs for everything you have not kept, in the checked menus">Finish my setup</button>`
      + `<span class="dq10-fill"><button type="button" data-a="fill"${busy || !gaps.length ? ' disabled' : ''} title="Fill a section that has nothing in it; nothing present is changed">Fill this section</button>${tabSel}</span></div>`
      + presets + tankLine + rules + (note ? `<p class="dq10-note">${esc(note)}</p>` : '') + body + '</div>';
  };

  const go = (fn: () => RunResult | undefined) => {
    busy = true; note = ''; fail = undefined; draw();
    setTimeout(() => {
      let r: RunResult | undefined;
      try { r = fn(); } catch (e) { console.error(e); r = { ok: false, conflicts: ['Discover could not run on this design.'], relaxations: [] }; }
      busy = false; if (r && !r.ok) fail = r; draw();
    }, 30);
  };

  root.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]'); if (!el || (el as HTMLButtonElement).disabled) return;
    switch (el.dataset.a) {
      case 'open': openCard = true; draw(); break;
      case 'close': openCard = false; ctl.close(); fail = undefined; note = ''; draw(); break;
      case 'preset': ctl.setPreset(el.dataset.p as Preset); draw(); break;
      case 'unlock': ctl.unlockTank(); draw(); break;
      case 'keeptank': ctl.keepTank(); draw(); break;
      case 'finish': go(() => ctl.run('finish')); break;
      case 'fill': go(() => ctl.run('fill', fillTab || undefined)); break;
      case 'regen': go(() => ctl.regenerate()); break;
      case 'back': { const ok = ctl.showBack(Number(el.dataset.i)); note = ok ? '' : 'That design no longer matches yours.'; draw(); break; }
      case 'relax': { const r = fail?.relaxations[Number(el.dataset.i)]; if (r) go(() => ctl.relax(r)); break; }
      case 'apply': {
        const r = ctl.apply();
        if (r.ok) { note = ''; deps.status('Applied: it is in your design now (Undo steps back).'); }
        else note = r.reason === 'stale' ? 'Your design changed: regenerate before applying.' : r.reason === 'none' ? 'Nothing to apply.' : 'It conflicts with what you kept.';
        draw(); break;
      }
    }
  });
  root.addEventListener('change', e => { const el = e.target as HTMLSelectElement; if (el.dataset.a === 'tab') fillTab = el.value as Tab; });
  store.subscribe(() => { ctl.onChange(); if (!busy) draw(); });
  draw();
  registerInline(() => { openCard = true; draw(); });
  return { open: () => { openCard = true; draw(); }, close: () => { openCard = false; ctl.close(); draw(); }, ctl };
}
