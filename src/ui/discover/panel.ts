// The Discovery screen (lane DX4): scope checkboxes, objective chips, proposal cards with a preview, a before / after diff and Apply / Apply and keep /
// Reject / More like this. Built on propose (scene/discover.ts) and applyCard (logic.ts). It never edits the project except through Apply; exiting
// leaves the project as it is, and reopening starts fresh. The pure decisions live in logic.ts.
import { propose, type Discovery, type DiscoveryProposal, type Objective } from '../../scene/discover';
import { TABS, type Tab } from '../../scene/scope';
import { discoverTabs } from '../../scene/discoverScope';
import { switchHtml, syncSwitches, wireSwitches } from './switches';
import { previewProposal } from '../../scene/proposal';
import type { VerdictOpts } from '../../scene/verdict';
import { getBrief } from '../setupBrief';
import { OBJECTIVES, SECTION_OF, TAB_LABEL, applyCard, costLines, defaultScope, dependencies, diffRows, lockedSummary, previewShot } from './logic';
import type { Store } from '../../scene/store';
import type { Viewer } from '../../render/viewer';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const VERB = { add: '+', remove: '−', change: '~' } as const;

export interface DiscoverDeps { status: (msg: string, warn?: boolean) => void; opts: () => VerdictOpts }
export interface DiscoverUI { open(scope?: Tab | Tab[], quick?: boolean): void; close(): void }

/** Open a left-panel section (a relaxation button only ever opens the setting, it never changes it). */
export function openSection(name: string) {
  const sec = document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${SECTION_OF[name] ?? name}"]`);
  if (!sec) return;
  sec.open = true; sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function attachDiscoverPanel(store: Store, viewer: Viewer, deps: DiscoverDeps): DiscoverUI {
  const root = document.createElement('aside');
  root.className = 'dxp'; root.hidden = true; root.setAttribute('aria-label', 'Discovery');
  document.body.append(root);
  let quickOpen = false, only: Tab[] | undefined, objective: Objective = 'explore', focus = '', result: Discovery | undefined, runRev = -1, shooting = false, stale = false, rejected = new Set<string>(), seedShift = 0, busy = false, note = '';
  const rid = { n: 0 };
  let skipStale = false;   // set while one of OUR switches is being flipped: that changes the scope, not the design
  // the run's tabs: the menu switches (the one home, project state), unless the panel was opened from one menu / one start flow (a run-only override)
  const scopeNow = (): Tab[] => only ?? defaultScope(store.tank);
  // Quick setup (Style, Shuffle, plant care, densities, stocking gates: the old menu) lives in the panel; its live controls move in and out, never copied
  const quickEl = document.getElementById('quickBlock'), quickHome = document.getElementById('quickHome');
  const doorsEl = document.getElementById('doorsBlock');   // Browse looks / Explore complete setups: options inside Discover (were Quick Setup's doors)
  const closeQuick = () => { for (const el of [doorsEl, quickEl]) if (el && quickHome && el.parentElement !== quickHome) quickHome.append(el); };

  const close = () => { closeQuick(); root.hidden = true; root.innerHTML = ''; result = undefined; };
  store.subscribe(kind => { if (root.hidden || shooting || kind === 'view' || kind === 'select') return; syncSwitches(store, root); if (skipStale) return; if (result && store.rev !== runRev && !stale) { stale = true; draw(); } });

  const run = (family?: string) => {
    busy = true; stale = false; rejected = new Set(); note = ''; draw();
    const my = ++rid.n;
    setTimeout(() => {   // let the "Looking..." paint first: the engine is synchronous
      if (my !== rid.n) return;
      try {
        runRev = store.rev;
        result = propose(store, getBrief(), { scope: scopeNow(), objective, ...(focus.trim() ? { focus: { tab: scopeNow()[0] ?? 'tank', text: focus.trim() } } : {}) }, 3, { ...deps.opts(), units: store.scene.units, seed: store.tank.layout.seed + 977 * seedShift });
      } catch (e) { result = { proposals: [] }; note = 'Discovery could not run on this tank.'; console.error(e); }
      if (family && result.proposals.some(q => q.source.startsWith(family))) result = { proposals: result.proposals.filter(q => q.source.startsWith(family)) };
      busy = false; draw();
    }, 30);
  };

  /** One preview picture per card, one per frame (each is a full draw), through the store-neutral previewShot. */
  const pictures = (my: number) => {
    const cards = [...root.querySelectorAll<HTMLElement>('.dxcard')];
    const next = () => {
      const card = cards.shift(); if (!card || my !== rid.n || root.hidden) return;
      const p = result?.proposals[+card.dataset.i!]; const img = card.querySelector<HTMLImageElement>('img.dxpic');
      if (p && img) { shooting = true; try { img.src = previewShot(store, previewProposal(store.tank, p), () => viewer.thumbnail(480)); } catch { /* no picture */ } finally { shooting = false; } }
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  };

  const cardHtml = (p: DiscoveryProposal, i: number) => {
    const rows = diffRows(store.tank, p), deps_ = dependencies(store.tank, p), cost = costLines(p), v = p.verdict;
    const diff = TABS.map(t => ({ t, rs: rows.filter(r => r.tab === t) })).filter(g => g.rs.length).map(g => `<li><b>${TAB_LABEL[g.t]}</b> ${g.rs.map(r => `<span class="dxv ${r.verb}">${VERB[r.verb]}</span> ${esc(r.text)}`).join('; ')}</li>`).join('')
      + (p.gear.length ? `<li><b>To buy / change</b> ${p.gear.map(esc).join(', ')}</li>` : '');
    const buy = p.cost.buy.length ? `<ul class="dxbuy">${p.cost.buy.map(l => `<li>${esc(l.label)} <span>${'$' + Math.round(l.usd)}</span></li>`).join('')}</ul><div class="hint">Applying accepts these purchases.</div>` : '';
    const notes = v.advisories.length + v.targets.length;
    return `<article class="dxcard" data-i="${i}">
      <img class="dxpic" alt="Preview of this proposal" width="480" height="270">
      <div class="dxbody">
        <p class="dxsum">${esc(p.summary)}</p>
        <p class="dxchar">${esc([p.axes.style, p.axes.sizeClass, p.axes.stocking, p.axes.tech].filter(Boolean).join(' · '))}</p>
        <div class="dxfig"><span title="Left to buy after what you own">Start-up <b>${esc(cost.startup)}</b></span><span>Upkeep <b>${esc(cost.monthly)}</b></span><span title="Checks on the result">${v.feasible ? (notes ? `${notes} note${notes === 1 ? '' : 's'}` : 'All checks pass') : 'Has problems'}</span></div>
        ${deps_.length ? `<p class="dxdep">${deps_.map(esc).join(' ')}</p>` : ''}
        <details class="dxdiff" open><summary>What changes</summary><ul>${diff || '<li>No design change.</li>'}</ul><p class="hint">${esc(lockedSummary(store.tank))}</p>${buy}</details>
        <div class="dxmsg" role="status"></div>
        <div class="btns dxact"><button class="primary" data-a="apply" title="Apply as one undo step; nothing is locked">Apply</button><button data-a="keep" title="Apply, then lock exactly what was applied so later runs leave it alone">Apply and keep</button><button data-a="more" title="More proposals in this direction">More like this</button><button data-a="reject">Reject</button></div>
      </div></article>`;
  };

  const noSolution = (r: Discovery) => {
    const n = r.noSolution;
    if (!n) return '<p class="dxnone">No proposal this time. Try another objective, or add a tab to the scope.</p>';
    const tabs = [...new Set(n.conflicts.map(c => c.tab))];
    return `<div class="dxnone"><p><b>No proposal fits.</b> What blocks it:</p><ul>${n.conflicts.map(c => `<li>${esc(c.text)}</li>`).join('') || '<li>Every candidate broke a lock or a limit.</li>'}</ul>
      <p><b>Smallest change that would help</b> (nothing is changed for you):</p><ul>${n.relaxations.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="btns">${tabs.map(t => `<button data-open="${esc(t)}">Open ${esc(SECTION_OF[t] ? TAB_LABEL[t as Tab] ?? t : t)} settings</button>`).join('')}</div></div>`;
  };

  const draw = () => {
    if (root.hidden) return;
    const shown = (result?.proposals ?? []).map((p, i) => ({ p, i })).filter(x => !rejected.has(String(x.i)));
    root.innerHTML = `<header><h2>Discover</h2><button class="dxx" aria-label="Close Discovery" data-a="close">✕</button></header>
      <div class="dxsetup">
        <div class="flabel">Discovery can change</div><div class="dxtabs">${TABS.map(t => switchHtml(t, discoverTabs(store.tank).includes(t), TAB_LABEL[t])).join('')}</div>
        ${only ? `<p class="hint dxonly">This run looks only at ${only.map(t => TAB_LABEL[t]).join(', ')} (opened from there). <button type="button" class="spLink" data-a="allsw">Use my switches instead</button></p>` : '<p class="hint dxonly">Same switches as the menu headers: they are saved with the project.</p>'}
        <div class="flabel">What for</div><div class="dxobj" role="group">${OBJECTIVES.map(o => `<button class="chip${o.id === objective ? ' on' : ''}" aria-pressed="${o.id === objective}" data-obj="${o.id}" title="${esc(o.hint)}">${esc(o.label)}</button>`).join('')}</div>
        <input class="dxfocus" type="text" placeholder="Anything in particular? (optional)" value="${esc(focus)}" aria-label="Focus">
        <p class="hint dxlock">${esc(lockedSummary(store.tank))} </p>
        <div id="dxdSlot"></div>
        <div class="btns"><button class="primary" data-a="run"${scopeNow().length ? '' : ' disabled'}>${result ? 'Run again' : 'Find proposals'}</button></div>
        <details class="dxq"${quickOpen ? ' open' : ''}><summary>Quick setup: look, shuffle, density</summary><div id="dxqSlot"></div></details>
      </div>
      ${stale ? `<div class="dxstale" role="alert">The project changed since these were made, so Apply is switched off. <button data-a="run">Refresh</button></div>` : ''}
      ${note ? `<p class="dxnone">${esc(note)}</p>` : ''}
      <div class="dxres">${busy ? '<p class="hint">Looking…</p>' : !result ? '' : shown.length ? shown.map(x => cardHtml(x.p, x.i)).join('') : result.proposals.length ? '<p class="hint">All rejected. Run again for new ones.</p>' : noSolution(result)}</div>`;
    const slot = root.querySelector('#dxqSlot'); if (slot && quickEl) slot.append(quickEl);
    const dslot = root.querySelector('#dxdSlot'); if (dslot && doorsEl) dslot.append(doorsEl);
    wire();
    if (result && !busy) pictures(rid.n);
  };

  const afterSwitch = () => {   // a flipped switch is a new scope, not a changed design: results already shown stay applicable
    if (only) only = undefined;
    if (result && !stale) runRev = store.rev;
    const run_ = root.querySelector<HTMLButtonElement>('[data-a="run"]'); if (run_) run_.disabled = !scopeNow().length;
  };
  root.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-sw]')) skipStale = true; });
  wireSwitches(store, root, () => { afterSwitch(); skipStale = false; });
  const wire = () => {
    root.querySelector<HTMLDetailsElement>('.dxq')?.addEventListener('toggle', e => { quickOpen = (e.target as HTMLDetailsElement).open; });
    root.querySelector<HTMLButtonElement>('[data-a="allsw"]')?.addEventListener('click', () => { only = undefined; draw(); });
    root.querySelectorAll<HTMLButtonElement>('[data-obj]').forEach(b => b.onclick = () => { focus = root.querySelector<HTMLInputElement>('.dxfocus')!.value; objective = b.dataset.obj as Objective; draw(); });
    root.querySelector<HTMLInputElement>('.dxfocus')?.addEventListener('input', e => { focus = (e.target as HTMLInputElement).value; });
    root.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b => b.onclick = () => openSection(b.dataset.open!));
    root.querySelectorAll<HTMLButtonElement>('[data-a="run"]').forEach(b => b.onclick = () => { seedShift = 0; run(); });
    root.querySelector<HTMLButtonElement>('[data-a="close"]')!.onclick = close;
    root.querySelectorAll<HTMLElement>('.dxcard').forEach(card => {
      const i = +card.dataset.i!, msg = card.querySelector<HTMLElement>('.dxmsg')!, p = () => result!.proposals[i];
      const apply = (keep: boolean) => {
        if (stale || store.rev !== runRev) { stale = true; draw(); return; }
        const r = applyCard(store, p(), keep);
        if (r.ok) { deps.status(keep ? 'Applied and kept (undo steps back).' : 'Applied (undo steps back).'); close(); return; }
        if (r.reason === 'stale') { stale = true; draw(); return; }
        msg.textContent = r.reason === 'locks' ? `Not applied: it would change something you kept. ${r.violations.map(v => v.detail).join(' ')}` : `Not applied: it reaches outside the checked tabs (${r.outside.join(', ')}).`;
      };
      card.querySelector<HTMLButtonElement>('[data-a="apply"]')!.onclick = () => apply(false);
      card.querySelector<HTMLButtonElement>('[data-a="keep"]')!.onclick = () => apply(true);
      card.querySelector<HTMLButtonElement>('[data-a="reject"]')!.onclick = () => { rejected.add(String(i)); draw(); };
      card.querySelector<HTMLButtonElement>('[data-a="more"]')!.onclick = () => { seedShift++; run(p().source.split(' #')[0]); };
    });
  };

  return {
    open(arg, quick = false) { quickOpen = quick; only = Array.isArray(arg) ? TABS.filter(t => arg.includes(t)) : arg ? [arg] : undefined; objective = 'explore'; focus = ''; result = undefined; stale = false; busy = false; note = ''; rejected = new Set(); seedShift = 0; rid.n++; root.hidden = false; draw(); root.scrollTop = 0; },
    close,
  };
}
