// The A/B Discover screen (lane AB3): two complete habitats side by side (A/B toggle at 375 px), Prefer A / Prefer B / Like both / Like neither / Skip with optional reasons,
// Explore Something Different, Keep / Lock from either card (button AND drag onto the Locked bar), "Keep A's <tab> for now", the five shuffle switches (the DX7 menu switches),
// a bottom history drawer, Make It Yours with a preview and conflicts, and a no-solution panel. It talks only to an AbEngine (adapter.ts); the decisions live in logic.ts.
// Nothing here writes the working project except Make It Yours (applyProposal) and an explicit Keep / Lock.
// The Discovery A/B comparison (lanes AB3, AB5). Nathan 2026-11-10: it happens in the MAIN view. The two candidates are drawn by the viewer's render-only pair layer (viewer.showPair) in the same split view the compare tool
// uses; this file is only the bottom dock: Prefer A / Prefer B / Like both / Like neither / Skip, one facts line per side (the favourite starred) and Close, with ONE expandable panel above it (reasons, Explore Something Different,
// Combine, Keep / Lock, "Keep A's <tab> for now", quick sheets and costs, history, Make It Yours). While it is open the working DESIGN is frozen (store.frozen): ordinary edits are refused, Close restores it exactly, and locks and
// the Discovery switches (the menus' shuffle checkboxes) still work. It talks only to an AbEngine (adapter.ts); the decisions live in logic.ts.
import { TABS, type Tab } from '../../scene/scope';
import { discoverIsOn } from '../../scene/discoverScope';
import { toggleSwitch } from '../discover/switches';
import { SECTION_OF, TAB_LABEL } from '../discover/logic';
import { headline } from '../checksStrip';
import { layerOf, LIBRARY } from '../../scene/items';
import { getSpecies } from '../../data/species';
import { locksOf, rosterMet } from '../../scene/locks';
import { ROLE_LABEL, KEEP_MODES, acceptPlan, differs, figText, isKept, keepForNowLabel, keepFromRecord, makePlan, metricsOf, roleOf, toggleReason, championConflicts, type KeepTarget, type Plan } from './logic';
import type { Store } from '../../scene/store';
import type { Viewer } from '../../render/viewer';
import type { CandidateRecord, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';
import type { RosterMode } from '../../scene/types';
import type { AbEngine, CombineProposal, ReEval } from './adapter';
import { REASONS } from './logic';
import { createMetrics, statsHtml, summarize } from './metrics';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const VERB = { add: '+', remove: '−', change: '~' } as const;

export interface AbDeps { status: (msg: string, warn?: boolean) => void }
export interface AbUI { open(scope?: Tab[]): void; close(): void; isOpen(): boolean }

export function attachAbScreen(store: Store, viewer: Viewer | undefined, engine: AbEngine, deps: AbDeps): AbUI {
  const root = document.createElement('aside');
  root.className = 'abdock'; root.hidden = true; root.setAttribute('aria-label', 'Discover'); (document.getElementById('view') ?? document.body).append(root);
  let result: PairResult | undefined, busy = false, pending: { outcome: Outcome; why: ReasonKey[]; other: ReasonKey[] } | undefined, note = '', side: 'A' | 'B' = 'A', sheets = new Set<string>(), proposal: CombineProposal | undefined, panelOpen = false, shownKey = '';
  let histOpen = false, histPage = 0, detail: string | undefined, plan: (Plan & { adaptNote?: string }) | undefined, importTab: Tab | undefined, resume = false, rid = 0;
  const modes = new Map<string, RosterMode>(); let sugNo = '', adopted = false;
  const metrics = createMetrics(), DEBUG = new URLSearchParams(location.search).has('debug'), rounds = () => engine.session().comparisons.length;
  const menuNote = (() => { const el = document.createElement('div'); el.className = 'abmenunote'; el.hidden = true; el.setAttribute('role', 'status'); el.textContent = 'Discovery is on: inspecting A and B. Your design is unchanged.'; document.getElementById('side')?.prepend(el); return el; })();
  const frozenNow = (on: boolean) => { store.frozen = on; store.onBlocked = on ? () => deps.status('Discovery is on: your design is unchanged. Make It Yours or Close to edit it.', true) : undefined; document.body.classList.toggle('discovering', on); menuNote.hidden = !on; };
  /** Close: the working design was never touched. A lock that the design does not meet yet is said once, never inserted. */
  const lockLine = () => {
    const t = store.tank, miss = locksOf(t).roster.filter(r => !rosterMet(t, r));
    return miss.length ? `Your design doesn't include the locked ${miss.map(r => `${r.mode === 'exact' ? r.n : r.mode === 'atLeast' ? `at least ${r.n}` : ''} ${getSpecies(r.species)?.name ?? r.species}`.replace(/\s+/g, ' ').trim()).join(', ')} yet.` : '';
  };

  const close = () => {
    const was = !root.hidden;
    if (was) { metrics.log({ k: 'close', t: Date.now(), adopted, rounds: rounds() }); engine.pause(); }
    viewer?.showPair(null); viewer?.setReserve(0); shownKey = ''; frozenNow(false);
    root.hidden = true; root.innerHTML = ''; result = undefined; plan = undefined; detail = undefined; pending = undefined; proposal = undefined; panelOpen = false; rid++;
    if (was) { const l = lockLine(); if (l) deps.status(l); }
  };
  store.subscribe(kind => { if (root.hidden || kind === 'view' || kind === 'select') return; if (kind === 'load') { close(); return; } syncScope(); });   // another project was opened: Discovery ends   // the menus' shuffle switches are the scope

  // ------------------------------------------------------------------------------------------------ engine plumbing
  const look = (fn: () => PairResult) => {   // paint "Looking…" first: the engine is synchronous
    busy = true; note = ''; draw(); const my = ++rid;
    setTimeout(() => { if (my !== rid || root.hidden) return; try { result = fn(); } catch (e) { console.error(e); result = { ok: false, conflicts: ['Discovery could not run on this design.'], relaxations: [] }; } busy = false; side = 'A'; sheets = new Set(); proposal = undefined; if (result?.ok) metrics.shown(); draw(); }, 30);
  };
  const commit = (): PairResult | undefined => {   // an A / B choice waits for its optional reasons; anything that moves on commits it
    if (!pending) return undefined; const p = pending; pending = undefined;
    const type = engine.session().current?.type ?? 'champion', ms = metrics.elapsed();
    metrics.log({ k: 'compare', t: Date.now(), type, outcome: p.outcome, ms, ...(p.why.length ? { why: [...p.why] } : {}), n: rounds() + 1 });
    return engine.choose(p.outcome, p.why.length ? p.why : undefined, p.other.length ? p.other : undefined);
  };
  const nextPair = (out?: Outcome) => { if (out && out !== 'A' && out !== 'B') pending = { outcome: out, why: [], other: [] }; look(() => commit() ?? engine.next()); };
  const syncScope = () => { const s = engine.session(); for (const t of TABS) { const on = discoverIsOn(store.tank, t); if (on !== s.scope.includes(t)) engine.setScope(t, on); } };
  const isFav = (id: string) => { for (let p = 0, n = 1; p < n; p++) { const x = engine.history(p); n = x.pages; const q = x.rows.find(r => r.rec.id === id); if (q) return q.favourite; } return false; };
  const recOf = (which: 'A' | 'B') => { const c = engine.session().current; const id = c && (which === 'A' ? c.aId : c.bId); return id ? engine.record(id) : undefined; };

  // ------------------------------------------------------------------------------------------------ markup
  const sheetHtml = (r: CandidateRecord, other: CandidateRecord, w: 'A' | 'B') => {
    const f = r.facts, S = r.snapshot, tank = store.tank;
    const group = (tab: 'plants' | 'hardscape') => {
      const by = new Map<string, string[]>(); for (const it of S.items) if ((layerOf(it) === 'plant') === (tab === 'plants') && it.uid) (by.get(it.variant) ?? by.set(it.variant, []).get(it.variant)!).push(it.uid);
      return [...by].map(([v, uids]) => row(`${uids.length > 1 ? uids.length + ' ' : ''}${esc(LIBRARY[v]?.label ?? v)}`, { kind: 'item', uid: uids[0] }, { uids }, w)).join('') || '<li class="hint">None</li>';
    };
    function row(label: string, t: KeepTarget, drag: { uids?: string[] }, wd: 'A' | 'B', extra = '') {
      const kept = t.kind === 'item' ? (drag.uids ?? []).every(u => isKept(tank, { kind: 'item', uid: u })) : isKept(tank, t);
      return `<li class="abrow" draggable="true" data-drag="${esc(JSON.stringify({ id: r.id, t, uids: drag.uids }))}"><span>${label}</span>${extra}<button type="button" class="abkeep${kept ? ' on' : ''}" data-act="keep" data-side="${wd}" data-t="${esc(JSON.stringify(t))}"${drag.uids ? ` data-uids="${esc(JSON.stringify(drag.uids))}"` : ''} aria-label="Keep ${label.replace(/<[^>]+>/g, '')}">${kept ? 'Kept' : 'Keep'}</button></li>`;
    }
    const fishRows = f.stocking.map(s => {
      const m = modes.get(s.species) ?? 'exact';
      const sel = `<select class="abmode" data-act="mode" data-sp="${esc(s.species)}" aria-label="How to keep ${esc(s.name)}">${KEEP_MODES.map(k => `<option value="${k.mode}"${k.mode === m ? ' selected' : ''} title="${k.hint}">${k.label}</option>`).join('')}</select>`;
      return row(`${s.n} ${esc(s.name)}`, { kind: 'fish', species: s.species, mode: m }, {}, w, sel);
    }).join('') || '<li class="hint">No animals</li>';
    const d = differs(f, other.facts), buy = f.toBuy, otherRole = roleOf(engine.session(), other.id);
    const into = otherRole === 'favourite' ? 'your favourite' : engine.session().championId ? 'the challenger' : `${w === 'A' ? 'B' : 'A'}`;
    const combineHtml = engine.combine ? `<h4>Combine</h4><p class="hint">Take one part of this design into ${into}. That makes a new design to compare; nothing is changed or locked.</p><div class="abnowbtns abcomb">${TABS.map(t => `<button type="button" data-act="combine" data-donor="${esc(r.id)}" data-target="${esc(other.id)}" data-tab="${t}" title="Use these ${TAB_LABEL[t].toLowerCase()} in ${into}"${discoverIsOn(tank, t) ? '' : ' disabled'}>Use these ${TAB_LABEL[t].toLowerCase()} in ${into}</button>`).join('')}</div>` : '';
    return `<div class="absheet"><p class="hint">Keep locks something for good: Discovery will never change it (you can unlock it any time). To hold a whole tab only for now, use "Keep ${w}'s … for now" above.</p>
      ${combineHtml}
      <h4>Animals</h4><ul>${fishRows}</ul>
      <h4>Plants</h4><ul>${group('plants')}</ul>
      <h4>Hardscape</h4><ul>${group('hardscape')}</ul>
      <h4>Substrate</h4><ul>${row(esc(f.substrate.join(', ') || 'Substrate'), { kind: 'substrate' }, {}, w)}</ul>
      <h4>Tank</h4><ul>${row(f.gallons == null ? 'Dry build' : `${f.gallons} gal`, { kind: 'tank' }, {}, w)}</ul>
      <h4>Equipment</h4>
      <p class="abeq"><b>Must use:</b> ${f.mustUse.length ? f.mustUse.map(esc).join(', ') : 'none'}<br><b>Reused at $0:</b> ${f.reused.length ? f.reused.map(esc).join(', ') : 'none'}</p>
      <ul class="abbuy">${buy.length ? buy.map(l => `<li>${esc(l.label)} <span>$${Math.round(l.usd)}</span></li>`).join('') : '<li class="hint">Nothing to buy.</li>'}</ul>
      <p class="abeq"><b>Monthly:</b> ${f.monthlyUsd ? figText(f.monthlyUsd, { kind: 'usd', unit: 'a month' }) : 'not estimated'}<br><b>Checks:</b> ${esc(headline(r.verdict))}</p>
      <h4>Differs from ${w === 'A' ? 'B' : 'A'}</h4>${d.length ? `<ul>${d.map(x => `<li><b>${TAB_LABEL[x.tab]}</b> ${esc(x.text)}</li>`).join('')}</ul>` : '<p class="hint">Nothing.</p>'}
      ${r.assumptions.length ? `<p class="hint">${r.assumptions.map(esc).join(' ')}</p>` : ''}
    </div>`;
  };
  // The dock (Nathan 2026-11-10): the tanks are drawn in the MAIN view by the viewer's pair layer; this is only the bottom bar (the A/B decision, one facts line per side, Close) and ONE expandable panel above it.
  const bits = (r: CandidateRecord, w: 'A' | 'B') => {
    const m = metricsOf(r.facts), role = roleOf(engine.session(), r.id);
    return `<button type="button" class="abfact${side === w ? ' cur' : ''}" data-act="side" data-side="${w}" title="${esc(r.facts.title)}: show this one${'' }"><b class="abk ${role}">${w}${role === 'favourite' ? ' ★' : ''}</b> ${role === 'favourite' || role === 'challenger' ? `<span class="abrl">${ROLE_LABEL[role]}</span>` : ''}<span>New spend <b>${esc(m.spend)}</b></span><span>Upkeep <b>${esc(m.minutes)}</b></span><span>${esc(m.difficulty)}</span></button>`;
  };
  const sideBlock = (r: CandidateRecord, other: CandidateRecord, w: 'A' | 'B') => `<section class="abside${side === w ? ' cur' : ''}" data-side="${w}" data-id="${esc(r.id)}">
    <h3>${w}${roleOf(engine.session(), r.id) === 'favourite' ? ' ★' : ''} ${esc(r.facts.title)} <small>${esc(r.facts.habitat)}${r.facts.gallons != null ? ` · ${r.facts.gallons} gal` : ''}</small></h3>
    ${(() => { const u = r.assumptions.filter(x => /not assumed|not modelled|may grow thinner|not confirmed/.test(x)); return u.length ? `<details class="abprov"><summary>Provisionally feasible: ${u.length} need${u.length > 1 ? 's' : ''} not checked</summary><ul>${u.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '<p class="hint abprov">Every check the engine has is satisfied.</p>'; })()}
    <div class="btns abact"><button type="button" class="primary" data-act="miy" data-id="${esc(r.id)}" title="Use this design as your working design. You can still edit it; nothing is locked.">Make It Yours</button></div>
    <details class="abnow"><summary>Keep ${w}'s … for now</summary><p class="hint">A temporary hold for this search only. Nothing is locked, and your design is not changed.</p><div class="abnowbtns">${(['tank', 'animals', 'plants', 'hardscape', 'substrate'] as Tab[]).map(t => `<button type="button" data-act="keepnow" data-side="${w}" data-tab="${t}">${esc(keepForNowLabel(w, t))}</button>`).join('')}</div></details>
    ${sheetHtml(r, other, w)}</section>`;
  const choiceBtns = () => {
    const sel = pending?.outcome;
    const btn = (o: Outcome, label: string, cls = '') => `<button type="button" class="${cls}${sel === o ? ' on' : ''}" data-act="choose" data-o="${o}" aria-pressed="${sel === o}">${label}</button>`;
    return `<div class="abchoices" role="group" aria-label="Which would you rather build?">${btn('A', 'Prefer A', 'primary')}${btn('B', 'Prefer B', 'primary')}${btn('both', 'Like both')}${btn('neither', 'Like neither')}${btn('skip', 'Skip')}</div>`;
  };
  const reasonsHtml = () => pending && (pending.outcome === 'A' || pending.outcome === 'B') ? `<div class="abwhy" role="group" aria-label="Why? (optional)"><div class="flabel">Why ${pending.outcome}? <small>optional, pick any</small></div>
      <div class="abchips">${REASONS.map(x => `<button type="button" class="chip${pending!.why.includes(x.key) ? ' on' : ''}" data-act="why" data-k="${x.key}" aria-pressed="${pending!.why.includes(x.key)}">${x.label}</button>`).join('')}</div>
      <details class="abother"><summary>Anything good about the other one?</summary><div class="abchips">${REASONS.map(x => `<button type="button" class="chip${pending!.other.includes(x.key) ? ' on' : ''}" data-act="other" data-k="${x.key}" aria-pressed="${pending!.other.includes(x.key)}">${x.label}</button>`).join('')}</div></details>
      <div class="btns"><button type="button" class="primary" data-act="next">Next pair</button></div></div>` : '';

  const noSolution = (r: Extract<PairResult, { ok: false }>) => `<div class="abnone" role="status"><h3>No design fits right now</h3><p>What blocks it:</p><ul>${r.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <p><b>Smallest change that would help</b> (nothing is changed for you):</p><ul>${r.relaxations.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="btns"><button type="button" class="primary" data-act="retry">Try again</button>${TABS.filter(t => !discoverIsOn(store.tank, t)).map(t => `<button type="button" data-act="enable" data-tab="${t}">Let Discovery change ${TAB_LABEL[t]}</button>`).join('')}</div></div>`;

  const planHtml = (p: Plan & { adaptNote?: string }) => {
    const by = TABS.map(t => ({ t, rs: p.rows.filter(r => r.tab === t) })).filter(g => g.rs.length);
    const gear = p.rows.filter(r => r.tab === 'gear');
    return `<div class="abmodal" role="dialog" aria-modal="true" aria-label="Make It Yours"><div class="abmbox">
      <h3>Make It Yours: ${esc(p.rec.facts.title)}</h3>
      <p class="hint">This becomes your working design. Nothing is locked by it, your locks and gear stay, and Undo steps back.</p>
      ${p.adaptNote ? `<p class="abok">${esc(p.adaptNote)}</p>` : ''}
      <h4>What changes</h4><ul class="abdiff">${by.map(g => `<li><b>${TAB_LABEL[g.t]}</b> ${g.rs.map(r => `<span class="dxv ${r.verb}">${VERB[r.verb]}</span> ${esc(r.text)}`).join('; ')}</li>`).join('') || '<li>No design change.</li>'}${gear.map(g => `<li><b>Gear</b> ${esc(g.text)}</li>`).join('')}</ul>
      ${p.outside.length ? `<p class="abwarn">This reaches beyond the tabs Discovery may change: ${p.outside.map(t => TAB_LABEL[t]).join(', ')}.</p>` : ''}
      ${p.buy.length ? `<h4>To buy</h4><ul class="abbuy">${p.buy.map(l => `<li>${esc(l.label)} <span>$${Math.round(l.usd)}</span></li>`).join('')}</ul><p class="hint">Accepting this accepts these purchases (new spend ${esc(figText(p.rec.facts.newSpendUsd))}).</p>` : ''}
      ${p.conflicts.length ? `<div class="abconf" role="alert"><b>It conflicts with what you kept:</b><ul>${[...new Set(p.conflicts)].map(c => `<li>${esc(c)}</li>`).join('')}</ul><p>Nothing was changed. Adapt makes a new design that keeps what you kept, or leave it for now.</p></div>` : ''}
      <div class="abmsg" role="status">${esc(note)}</div>
      <div class="btns">${p.conflicts.length ? '<button type="button" class="primary" data-act="adapt">Adapt</button><button type="button" data-act="miy-cancel">Not now</button>' : '<button type="button" class="primary" data-act="miy-accept">Make it mine</button><button type="button" data-act="miy-cancel">Not now</button>'}</div>
    </div></div>`;
  };

  const detailHtml = (id: string) => {
    const r = engine.record(id); if (!r) return '';
    let now: ReEval | undefined; try { now = engine.reEvaluate(id); } catch { now = undefined; }
    const th = metricsOf(r.facts), nw = now && metricsOf(now.facts), allFav = isFav(id);
    const rowsT = [['New spend', th.spend, nw?.spend], ['Upkeep', th.minutes, nw?.minutes], ['Difficulty', th.difficulty, nw?.difficulty], ['Checks', headline(r.verdict), now ? headline(now.verdict) : '']];
    return `<div class="abmodal" role="dialog" aria-modal="true" aria-label="Earlier design (read-only)"><div class="abmbox">
      <h3>${esc(r.facts.title)} <small>(read-only)</small></h3>
      <img class="abpic" alt="" width="480" height="270"${r.thumb ? ` src="${esc(r.thumb)}"` : ''}>
      <table class="abthen"><thead><tr><th></th><th>Then</th><th>Now</th></tr></thead><tbody>${rowsT.map(x => `<tr><th>${x[0]}</th><td>${esc(x[1] ?? '')}</td><td>${esc(x[2] ?? '')}</td></tr>`).join('')}</tbody></table>
      <p class="hint">"Then" is exactly what was shown when it was made. "Now" is checked again against your project today.</p>
      ${now?.conflicts.length ? `<div class="abconf" role="alert"><b>Today it conflicts with what you kept:</b><ul>${now.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
      <p class="abeq">${[...r.facts.stocking.map(s => `${s.n} ${esc(s.name)}`), ...r.facts.plants.map(esc), ...r.facts.hardscape.map(esc)].join(', ')}</p>
      ${importTab ? `<div class="abconf"><p>Use this design's <b>${TAB_LABEL[importTab]}</b> for future candidates? Your working design is not changed.</p><div class="btns"><button type="button" class="primary" data-act="import-yes">Yes, use it</button><button type="button" data-act="import-no">No</button></div></div>` : ''}
      <div class="abmsg" role="status">${esc(note)}</div>
      <div class="btns"><button type="button" data-act="hist-fav" data-id="${esc(id)}" aria-pressed="${allFav}">${allFav ? 'Unfavourite' : 'Favourite'}</button><button type="button" data-act="hist-back" data-id="${esc(id)}">Bring back as challenger</button><button type="button" data-act="hist-setfav" data-id="${esc(id)}">Set as favourite</button><button type="button" class="primary" data-act="miy" data-id="${esc(id)}">Make It Yours</button></div>
      <details class="abnow"><summary>Import a part</summary><div class="abnowbtns">${TABS.map(t => `<button type="button" data-act="import" data-tab="${t}">Import this ${TAB_LABEL[t].toLowerCase()}</button>`).join('')}</div></details>
      <div class="btns"><button type="button" data-act="hist-close">Close</button></div>
    </div></div>`;
  };
  const historyHtml = () => {
    const h = engine.history(histPage);
    return `<footer class="abhist"><div class="abhh"><button type="button" data-act="hist-toggle" aria-expanded="${histOpen}" title="Every design you have been shown">History (${h.total})</button>${histOpen ? '<small class="hint">Every design you have been shown. Tap one to look at it again.</small>' : ''}${histOpen ? `<span class="abpg"><button type="button" data-act="hist-prev" ${h.page <= 0 ? 'disabled' : ''} aria-label="Newer">‹</button> ${h.page + 1} / ${h.pages} <button type="button" data-act="hist-next" ${h.page >= h.pages - 1 ? 'disabled' : ''} aria-label="Older">›</button></span>` : ''}</div>
      ${histOpen ? `<div class="abstrip">${h.rows.map(x => `<button type="button" class="abth" data-act="hist-open" data-id="${esc(x.rec.id)}" title="${esc(x.rec.facts.title)}"><img alt="" width="96" height="54" data-hid="${esc(x.rec.id)}"${x.rec.thumb ? ` src="${esc(x.rec.thumb)}"` : ''}><span>${x.champion ? '★ ' : ''}${x.favourite ? '♥ ' : ''}${esc(x.rec.facts.title)}</span></button>`).join('') || '<span class="hint">Nothing yet.</span>'}</div>` : ''}</footer>`;
  };

  const proposalHtml = (p: CombineProposal) => `<div class="abprop" role="alert"><h3>Proposed combination</h3>
      <p>${esc(TAB_LABEL[p.tab])} from ${esc(engine.record(p.donorId)?.facts.title ?? 'the other design')} in ${esc(engine.record(p.targetId)?.facts.title ?? 'your design')}.</p>
      ${p.adjustments.length ? `<p><b>To make it fit:</b></p><ul>${p.adjustments.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>No other changes are needed.</p>'}
      ${p.spendLine ? `<p>${esc(p.spendLine)}</p>` : ''}<p class="hint">Your locks are never overridden. Nothing is shown or stored until you approve; Cancel leaves everything as it was.</p>
      <div class="btns"><button type="button" class="primary" data-act="combine-ok">Approve and compare</button><button type="button" data-act="combine-no">Cancel</button></div></div>`;
  const syncViewer = () => {
    if (!viewer) return;
    if (result && !result.ok && result.single) { const k = 'single|' + result.single.id; if (k !== shownKey) { shownKey = k; viewer.showPair([result.single.snapshot, result.single.snapshot], { only: 0, info: ['The only design that fits', ''] }); } return; }
    if (!result?.ok) { viewer.showPair(null); viewer.setReserve(0); shownKey = ''; return; }
    const mobile = window.innerWidth < 700, r = result, key = [r.a.id, r.b.id, mobile ? side : '', roleOf(engine.session(), r.a.id), roleOf(engine.session(), r.b.id)].join('|');
    if (key !== shownKey) {
      shownKey = key; const role = (x: CandidateRecord) => { const k = roleOf(engine.session(), x.id); return `${k === 'favourite' ? '★ ' : ''}${ROLE_LABEL[k]}`; };
      viewer.showPair([r.a.snapshot, r.b.snapshot], { ...(mobile ? { only: side === 'A' ? 0 : 1 } : {}), info: [role(r.a), role(r.b)] });
    }
  };
  const draw = () => {
    if (root.hidden) return;
    let panel = '';
    const ok = !busy && !resume && result?.ok ? result : undefined;
    const force = resume || (!busy && !!result && !result.ok) || !!proposal || !!pending;
    if (resume) panel += `<div class="abnone" role="alert"><h3>You changed the design since this session</h3><p>Discovery can re-check your favourite against the design as it is now, or start over.</p><div class="btns"><button type="button" class="primary" data-act="continue">Continue (re-check)</button><button type="button" data-act="restart">New session</button></div></div>`;
    else if (!busy && result && !result.ok) panel += noSolution(result);
    if (note && !plan && !detail) panel += `<p class="abnote" role="status">${esc(note)}</p>`;
    if (ok && !plan && !detail) { const g = engine.suggestion?.(); if (g && g.text !== sugNo) panel += `<p class="hint absug" role="note">${esc(g.text)} <button type="button" data-act="sug-do" data-tab="${g.tab}" data-text="${esc(g.text)}">Switch ${TAB_LABEL[g.tab]} off</button> <button type="button" data-act="sug-no" data-text="${esc(g.text)}">Not now</button></p>`; }
    if (proposal) panel += proposalHtml(proposal);
    if (ok) {
      panel += `${reasonsHtml()}<div class="btns"><button type="button" data-act="different" title="Two new ideas away from your favourite; the winner then faces your favourite">Explore Something Different</button></div>
        <div class="abcols">${sideBlock(ok.a, ok.b, 'A')}${sideBlock(ok.b, ok.a, 'B')}</div>`;
      panel += historyHtml();
    } else if (!busy && result && !result.ok) { if (result.single) panel += sideBlock(result.single, result.single, 'A'); panel += historyHtml(); }
    if (DEBUG) panel += statsHtml(summarize(metrics.all()));
    const open = (panelOpen || force) && !busy;
    const only = !busy && result && !result.ok ? result.single : undefined;
    const bar = ok ? `${choiceBtns()}<div class="abfacts">${bits(ok.a, 'A')}${bits(ok.b, 'B')}</div>` : only ? `<div class="abfacts">${bits(only, 'A')}</div>` : `<span class="hint abbusy" role="status">${busy ? 'Looking…' : 'Discovery'}</span>`;
    root.innerHTML = `${open ? `<div class="abpanel" role="region" aria-label="Discovery details">${panel}</div>` : ''}<div class="abbar" role="group" aria-label="Discovery"><div class="abbarmain">${bar}</div><div class="abbarend"><button type="button" data-act="more" aria-expanded="${open}" title="Reasons, Explore Something Different, Combine, Keep, history, Make It Yours">${open ? 'Less ▾' : 'More ▴'}</button><button type="button" class="dxx" aria-label="Close Discovery" data-act="close">✕ Close</button></div></div>${plan ? planHtml(plan) : detail ? detailHtml(detail) : ''}`;
    syncViewer(); viewer?.setReserve(root.offsetHeight); shots();
  };

  // ------------------------------------------------------------------------------------------------ pictures (one per frame, through the store-neutral previewShot)
  const shots = () => {
    if (!viewer) return;
    const todo: { img: HTMLImageElement; rec: CandidateRecord }[] = [];
    root.querySelectorAll<HTMLImageElement>('img.abpic:not([src])').forEach(img => { const rec = engine.record(detail ?? ''); if (rec) todo.push({ img, rec }); });
    root.querySelectorAll<HTMLImageElement>('img[data-hid]:not([src])').forEach(img => { const rec = engine.record(img.dataset.hid!); if (rec) todo.push({ img, rec }); });
    const next = () => {
      const t = todo.shift(); if (!t || root.hidden) return;
      try { t.rec.thumb ??= viewer.pairShot(t.rec.snapshot, 480); t.img.src = t.rec.thumb; } catch (e) { console.warn('[ab] picture failed', e); }
      requestAnimationFrame(next);
    };
    if (todo.length) requestAnimationFrame(next);
  };

  // ------------------------------------------------------------------------------------------------ actions
  const plain = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x.replace(/\.$/, ''), (m.get(x.replace(/\.$/, '')) ?? 0) + 1); return [...m].map(([t, n]) => n > 1 ? `${t} (${n} times)` : t).join('; '); };
  const afterKeep = (msg: string) => {
    const c = engine.recheckChampion();
    note = c.ok ? msg : `${msg} Your favourite does not include what you just kept (${plain(c.conflicts)}), so it was set aside. The next pair starts from your kept items.`;
    deps.status(note);
    if (c.ok) draw(); else { const n = note; look(() => engine.next()); setTimeout(() => { note = n; draw(); }, 60); }
  };
  const doKeep = (w: 'A' | 'B' | undefined, id: string | undefined, t: KeepTarget, uids?: string[]) => {
    const rec = id ? engine.record(id) : recOf(w!); if (!rec) return;
    metrics.log({ k: 'keep', t: Date.now(), target: t.kind, locked: true, n: rounds() });
    if (t.kind === 'item' && uids?.length) { let last = { ok: true, message: '' }; for (const u of uids) last = keepFromRecord(store, rec, { kind: 'item', uid: u }); afterKeep(uids.length > 1 ? `Kept ${uids.length} pieces.` : last.message); return; }
    const r = keepFromRecord(store, rec, t); afterKeep(r.message);
  };
  const openPlan = (id: string) => { const rec = engine.record(id); if (!rec) return; note = ''; plan = makePlan(store, rec, engine.session()); draw(); };
  const act = (a: string, el: HTMLElement) => {
    const id = el.dataset.id, w = el.dataset.side as 'A' | 'B' | undefined;
    switch (a) {
      case 'close': close(); break;
      case 'choose': { const o = el.dataset.o as Outcome; if (o === 'A' || o === 'B') { pending = { outcome: o, why: [], other: [] }; draw(); } else if (o === 'skip') { pending = { outcome: 'skip', why: [], other: [] }; nextPair(); } else nextPair(o); break; }
      case 'why': pending!.why = toggleReason(pending!.why, el.dataset.k as ReasonKey); draw(); break;
      case 'other': pending!.other = toggleReason(pending!.other, el.dataset.k as ReasonKey); draw(); break;
      case 'next': nextPair(); break;
      case 'different': pending = undefined; look(() => engine.different()); break;
      case 'retry': look(() => engine.next()); break;
      case 'enable': toggleSwitch(store, el.dataset.tab as Tab, true); syncScope(); look(() => engine.next()); break;
      case 'side': side = w!; draw(); break;
      case 'sheet': sheets.has(id!) ? sheets.delete(id!) : sheets.add(id!); draw(); break;
      case 'keep': { const t = JSON.parse(el.dataset.t!) as KeepTarget; const uids = el.dataset.uids ? JSON.parse(el.dataset.uids) as string[] : undefined; doKeep(w, undefined, t, uids); break; }
      case 'keepnow': { const rec = recOf(w!); if (!rec) break; const tab = el.dataset.tab as Tab; metrics.log({ k: 'freeze', t: Date.now(), tab, n: rounds() }); toggleSwitch(store, tab, false); syncScope(); engine.freeze(tab, rec.id); note = `${TAB_LABEL[tab]}: kept from ${w} for the next candidates. Your design is not changed; turn the switch back on to release it.`; draw(); break; }
      case 'combine': {
        const donor = el.dataset.donor!, target = el.dataset.target!, tab = el.dataset.tab as Tab;
        pending = undefined; busy = true; note = ''; proposal = undefined; draw(); const my = ++rid;
        setTimeout(() => {
          if (my !== rid || root.hidden) return;
          let out: ReturnType<NonNullable<AbEngine['combine']>>;
          try { out = engine.combine!(target, donor, tab); } catch (e) { console.error(e); out = { ok: false, reason: 'Combining did not work on this design.', relaxations: [] }; }
          busy = false; metrics.log({ k: 'combine', t: Date.now(), tab, ok: out.ok, n: rounds() }); panelOpen = true;
          if (out.ok) proposal = out.proposal;
          else note = `Not combined: ${out.reason}${out.relaxations.length ? ` Smallest change that would help: ${out.relaxations.join('; ')}.` : ''}`;
          draw();
        }, 30);
        break;
      }
      case 'combine-ok': { const p = proposal; if (!p) break; proposal = undefined; result = engine.acceptCombine!(p); side = 'A'; metrics.shown(); note = `Combined: a new design with the ${TAB_LABEL[p.tab].toLowerCase()} from the other one. Pick it to make it your favourite. Both originals are unchanged in History.`; panelOpen = false; draw(); break; }
      case 'combine-no': proposal = undefined; note = ''; draw(); break;
      case 'more': panelOpen = !panelOpen; draw(); break;
      case 'stats-clear': metrics.clear(); draw(); break;
      case 'sug-no': sugNo = el.dataset.text ?? ''; draw(); break;
      case 'sug-do': { const tab = el.dataset.tab as Tab; toggleSwitch(store, tab, false); syncScope(); sugNo = el.dataset.text ?? ''; note = `${TAB_LABEL[tab]} is switched off for the next pairs. Switch it back on any time.`; draw(); break; }
      case 'miy': openPlan(id!); break;
      case 'miy-cancel': plan = undefined; note = ''; draw(); break;
      case 'miy-accept': {
        frozenNow(false);   // Make It Yours is the one edit that is allowed: the working design may change now
        adopted = true; const r = acceptPlan(store, plan!.rec, engine.session());
        if (!r.ok) { adopted = false; frozenNow(true); }
        if (r.ok) { adopted = true; metrics.log({ k: 'miy', t: Date.now(), rounds: rounds() }); plan = undefined; deps.status('Made yours: it is now your working design (Undo steps back). Nothing was locked.'); close(); }
        else { note = r.reason === 'stale' ? 'Your project changed while this was open: look again.' : 'It conflicts with what you kept.'; plan = makePlan(store, plan!.rec, engine.session()); draw(); }
        break;
      }
      case 'adapt': {
        const r = engine.adapt(plan!.rec.id);
        if (r.ok) { plan = { ...makePlan(store, r.record, engine.session()), adaptNote: 'Adapted: a new design that keeps what you kept. The original stays in History untouched.' }; note = ''; }
        else note = `Not adapted: ${plain([r.reason])}`;
        draw(); break;
      }
      case 'continue': engine.rebase(); resume = false; look(() => { const c = engine.recheckChampion(); void c; return engine.next(); }); break;
      case 'restart': engine.restart(); resume = false; syncScope(); look(() => engine.next()); break;
      case 'hist-toggle': histOpen = !histOpen; draw(); break;
      case 'hist-prev': histPage = Math.max(0, histPage - 1); draw(); break;
      case 'hist-next': histPage++; draw(); break;
      case 'hist-open': metrics.log({ k: 'history', t: Date.now(), op: 'open' }); detail = id; note = ''; importTab = undefined; draw(); break;
      case 'hist-close': detail = undefined; note = ''; importTab = undefined; draw(); break;
      case 'hist-fav': engine.favourite(id!, !isFav(id!)); draw(); break;
      case 'hist-back': { metrics.log({ k: 'history', t: Date.now(), op: 'bringBack' }); detail = undefined; pending = undefined; look(() => engine.bringBack(id!)); break; }
      case 'hist-setfav': { metrics.log({ k: 'history', t: Date.now(), op: 'setFavourite' }); const r = engine.setFavourite(id!); if (r.ok) { detail = undefined; look(() => engine.next()); } else { note = `Not set: ${r.reason}`; draw(); } break; }
      case 'import': importTab = el.dataset.tab as Tab; draw(); break;
      case 'import-no': importTab = undefined; draw(); break;
      case 'import-yes': { const tab = importTab!; metrics.log({ k: 'history', t: Date.now(), op: 'import' }); engine.freeze(tab, detail!); toggleSwitch(store, tab, false); importTab = undefined; note = `${TAB_LABEL[tab]} from this design will be used for the next candidates. Your design is not changed.`; draw(); break; }
    }
  };
  root.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!el || !root.contains(el) || el.tagName === 'SELECT') return;
    act(el.dataset.act!, el);
  });
  root.addEventListener('change', e => { const el = e.target as HTMLSelectElement; if (el.dataset?.act === 'mode') { modes.set(el.dataset.sp!, el.value as RosterMode); draw(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) { if (plan || detail) { plan = undefined; detail = undefined; draw(); } else close(); } });
  // drag a row onto the Locked bar (the explicit Keep button does the same for touch / keyboard)
  root.addEventListener('dragstart', e => { const r = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]'); if (r && e.dataTransfer) { e.dataTransfer.setData('text/plain', r.dataset.drag!); e.dataTransfer.effectAllowed = 'copy'; } });
  root.addEventListener('dragover', e => { if ((e.target as HTMLElement).closest('[data-drop]')) { e.preventDefault(); (e.target as HTMLElement).closest('[data-drop]')!.classList.add('over'); } });
  root.addEventListener('dragleave', e => (e.target as HTMLElement).closest('[data-drop]')?.classList.remove('over'));
  root.addEventListener('drop', e => {
    if (!(e.target as HTMLElement).closest('[data-drop]')) return; e.preventDefault();
    try { const p = JSON.parse(e.dataTransfer!.getData('text/plain')) as { id: string; t: KeepTarget; uids?: string[] }; doKeep(undefined, p.id, p.t, p.uids); } catch { /* not ours */ }
  });
  void championConflicts; void SECTION_OF; void getSpecies;

  return {
    isOpen: () => !root.hidden,
    close,
    open(scope) {
      adopted = false; engine.open(scope); metrics.log({ k: 'open', t: Date.now(), resumed: engine.session().comparisons.length > 0 }); histPage = 0; histOpen = false; detail = undefined; plan = undefined; pending = undefined; note = ''; sheets = new Set(); result = undefined; busy = false;
      proposal = undefined; panelOpen = false; shownKey = ''; if (!scope) syncScope();
      frozenNow(true); root.hidden = false; resume = engine.isStale(); draw();
      if (!resume) look(() => engine.next());
    },
  };
}
