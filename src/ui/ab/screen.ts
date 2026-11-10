// The A/B Discover screen (lane AB3): two complete habitats side by side (A/B toggle at 375 px), Prefer A / Prefer B / Like both / Like neither / Skip with optional reasons,
// Explore Something Different, Keep / Lock from either card (button AND drag onto the Locked bar), "Keep A's <tab> for now", the five shuffle switches (the DX7 menu switches),
// a bottom history drawer, Make It Yours with a preview and conflicts, and a no-solution panel. It talks only to an AbEngine (adapter.ts); the decisions live in logic.ts.
// Nothing here writes the working project except Make It Yours (applyProposal) and an explicit Keep / Lock.
import { TABS, type Tab } from '../../scene/scope';
import { discoverIsOn } from '../../scene/discoverScope';
import { switchHtml, syncSwitches, toggleSwitch } from '../discover/switches';
import { SECTION_OF, TAB_LABEL, lockedSummary, previewShot } from '../discover/logic';
import { headline } from '../checksStrip';
import { layerOf, LIBRARY } from '../../scene/items';
import { getSpecies } from '../../data/species';
import { ROLE_LABEL, KEEP_MODES, acceptPlan, bannerOf, differs, figText, freezeNote, isKept, keepForNowLabel, keepFromRecord, makePlan, metricsOf, roleOf, stripText, toggleReason, championConflicts, type KeepTarget, type Plan } from './logic';
import type { Store } from '../../scene/store';
import type { Viewer } from '../../render/viewer';
import type { CandidateRecord, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';
import type { RosterMode } from '../../scene/types';
import type { AbEngine, ReEval } from './adapter';
import { REASONS } from './logic';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const VERB = { add: '+', remove: '−', change: '~' } as const;

export interface AbDeps { status: (msg: string, warn?: boolean) => void }
export interface AbUI { open(scope?: Tab[]): void; close(): void; isOpen(): boolean }

export function attachAbScreen(store: Store, viewer: Viewer | undefined, engine: AbEngine, deps: AbDeps): AbUI {
  const root = document.createElement('aside');
  root.className = 'abx'; root.hidden = true; root.setAttribute('aria-label', 'Discover'); document.body.append(root);
  let result: PairResult | undefined, busy = false, pending: { outcome: Outcome; why: ReasonKey[]; other: ReasonKey[] } | undefined, note = '', side: 'A' | 'B' = 'A', sheets = new Set<string>(), shooting = false;
  let only: Tab[] | undefined, histOpen = false, histPage = 0, detail: string | undefined, plan: (Plan & { adaptNote?: string }) | undefined, importTab: Tab | undefined, resume = false, rid = 0;
  const modes = new Map<string, RosterMode>();
  const quickEl = document.getElementById('quickBlock'), quickHome = document.getElementById('quickHome'), doorsEl = document.getElementById('doorsBlock');
  const returnBlocks = () => { for (const el of [doorsEl, quickEl]) if (el && quickHome && el.parentElement !== quickHome) quickHome.append(el); };

  const close = () => { returnBlocks(); if (!root.hidden) engine.pause(); root.hidden = true; root.innerHTML = ''; result = undefined; plan = undefined; detail = undefined; pending = undefined; };
  store.subscribe(kind => { if (root.hidden || shooting || kind === 'view' || kind === 'select') return; syncSwitches(store, root); });

  // ------------------------------------------------------------------------------------------------ engine plumbing
  const look = (fn: () => PairResult) => {   // paint "Looking…" first: the engine is synchronous
    busy = true; note = ''; draw(); const my = ++rid;
    setTimeout(() => { if (my !== rid || root.hidden) return; try { result = fn(); } catch (e) { console.error(e); result = { ok: false, conflicts: ['Discovery could not run on this design.'], relaxations: [] }; } busy = false; side = 'A'; sheets = new Set(); draw(); }, 30);
  };
  const commit = (): PairResult | undefined => {   // an A / B choice waits for its optional reasons; anything that moves on commits it
    if (!pending) return undefined; const p = pending; pending = undefined;
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
    const d = differs(f, other.facts), buy = f.toBuy;
    return `<div class="absheet">
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
  const cardHtml = (r: CandidateRecord, other: CandidateRecord, w: 'A' | 'B') => {
    const s = engine.session(), m = metricsOf(r.facts), role = roleOf(s, r.id), open = sheets.has(r.id), f = r.facts;
    return `<article class="abcard${side === w ? ' cur' : ''}" data-side="${w}" data-id="${esc(r.id)}">
      <div class="abrole ${role}">${w} · ${ROLE_LABEL[role]}</div>
      <img class="abpic" alt="Picture of ${esc(f.title)}" width="480" height="270"${r.thumb ? ` src="${esc(r.thumb)}"` : ''}>
      <div class="abbody">
        <h3>${esc(f.title)}</h3><p class="absub">${esc(f.habitat)}${f.gallons != null ? ` · ${f.gallons} gal` : ''}</p>
        <div class="abspend" title="What is left to buy after what you own">New spend <b>${esc(m.spend)}</b></div>
        <div class="abfig"><span>Upkeep <b>${esc(m.minutes)}</b></span><span>Difficulty <b>${esc(m.difficulty)}</b></span>${m.upkeep ? `<span>Running <b>${esc(m.upkeep)}</b></span>` : ''}<span>${esc(headline(r.verdict))}</span></div>
        <div class="btns abact"><button type="button" data-act="sheet" data-id="${esc(r.id)}" aria-expanded="${open}">${open ? 'Hide quick sheet' : 'Quick sheet'}</button><button type="button" class="primary" data-act="miy" data-id="${esc(r.id)}" title="Install this design as your working design (nothing is locked)">Make It Yours</button></div>
        <details class="abnow"><summary>Keep ${w}'s … for now</summary><div class="abnowbtns">${(['tank', 'animals', 'plants', 'hardscape', 'substrate'] as Tab[]).map(t => `<button type="button" data-act="keepnow" data-side="${w}" data-tab="${t}">${esc(keepForNowLabel(w, t))}</button>`).join('')}</div></details>
        ${open ? sheetHtml(r, other, w) : ''}
      </div></article>`;
  };
  const switchesHtml = () => {
    const s = engine.session(), a = s.current?.aId, b = s.current?.bId;
    return `<div class="abswitches" role="group" aria-label="Discovery can change this">${TABS.map(t => `<div class="abswi">${switchHtml(t, discoverIsOn(store.tank, t), TAB_LABEL[t])}${freezeNote(s, t, a, b) ? `<small class="abfrz">${esc(freezeNote(s, t, a, b))}</small>` : ''}</div>`).join('')}</div>`;
  };
  const choiceHtml = () => {
    const sel = pending?.outcome;
    const btn = (o: Outcome, label: string, cls = '') => `<button type="button" class="${cls}${sel === o ? ' on' : ''}" data-act="choose" data-o="${o}" aria-pressed="${sel === o}">${label}</button>`;
    const reasons = pending && (pending.outcome === 'A' || pending.outcome === 'B') ? `<div class="abwhy" role="group" aria-label="Why? (optional)"><div class="flabel">Why ${pending.outcome}? <small>optional, pick any</small></div>
      <div class="abchips">${REASONS.map(x => `<button type="button" class="chip${pending!.why.includes(x.key) ? ' on' : ''}" data-act="why" data-k="${x.key}" aria-pressed="${pending!.why.includes(x.key)}">${x.label}</button>`).join('')}</div>
      <details class="abother"><summary>Anything good about the other one?</summary><div class="abchips">${REASONS.map(x => `<button type="button" class="chip${pending!.other.includes(x.key) ? ' on' : ''}" data-act="other" data-k="${x.key}" aria-pressed="${pending!.other.includes(x.key)}">${x.label}</button>`).join('')}</div></details>
      <div class="btns"><button type="button" class="primary" data-act="next">Next pair</button></div></div>` : '';
    return `<div class="abchoose"><div class="btns abchoices">${btn('A', 'Prefer A', 'primary')}${btn('B', 'Prefer B', 'primary')}${btn('both', 'Like both')}${btn('neither', 'Like neither')}${btn('skip', 'Skip')}</div>${reasons}
      <div class="btns"><button type="button" data-act="different" title="Two new ideas away from your favourite; the winner then faces your favourite">Explore Something Different</button></div></div>`;
  };
  const noSolution = (r: Extract<PairResult, { ok: false }>) => `<div class="abnone" role="status"><h3>No design fits right now</h3><p>What blocks it:</p><ul>${r.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <p><b>Smallest change that would help</b> (nothing is changed for you):</p><ul>${r.relaxations.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="btns"><button type="button" class="primary" data-act="retry">Try again</button>${TABS.filter(t => !discoverIsOn(store.tank, t)).map(t => `<button type="button" data-act="enable" data-tab="${t}">Let Discovery change ${TAB_LABEL[t]}</button>`).join('')}</div></div>`;
  const mobileStrip = (a: CandidateRecord, b: CandidateRecord) => `<div class="abtoggle" role="tablist"><button type="button" role="tab" data-act="side" data-side="A" aria-selected="${side === 'A'}"><b>A</b> ${esc(stripText(a.facts))}</button><button type="button" role="tab" data-act="side" data-side="B" aria-selected="${side === 'B'}"><b>B</b> ${esc(stripText(b.facts))}</button></div>`;

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
      ${p.conflicts.length ? `<div class="abconf" role="alert"><b>It conflicts with what you kept:</b><ul>${p.conflicts.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p>Nothing was changed. Adapt makes a new design that keeps what you kept, or leave it for now.</p></div>` : ''}
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
    return `<footer class="abhist"><div class="abhh"><button type="button" data-act="hist-toggle" aria-expanded="${histOpen}">History (${h.total})</button>${histOpen ? `<span class="abpg"><button type="button" data-act="hist-prev" ${h.page <= 0 ? 'disabled' : ''} aria-label="Newer">‹</button> ${h.page + 1} / ${h.pages} <button type="button" data-act="hist-next" ${h.page >= h.pages - 1 ? 'disabled' : ''} aria-label="Older">›</button></span>` : ''}</div>
      ${histOpen ? `<div class="abstrip">${h.rows.map(x => `<button type="button" class="abth" data-act="hist-open" data-id="${esc(x.rec.id)}" title="${esc(x.rec.facts.title)}"><img alt="" width="96" height="54" data-hid="${esc(x.rec.id)}"${x.rec.thumb ? ` src="${esc(x.rec.thumb)}"` : ''}><span>${x.champion ? '★ ' : ''}${x.favourite ? '♥ ' : ''}${esc(x.rec.facts.title)}</span></button>`).join('') || '<span class="hint">Nothing yet.</span>'}</div>` : ''}</footer>`;
  };

  const draw = () => {
    if (root.hidden) return;
    const s = engine.session();
    let body = '';
    if (resume) body = `<div class="abnone" role="alert"><h3>You changed the design since this session</h3><p>Discovery can re-check your favourite against the design as it is now, or start over.</p><div class="btns"><button type="button" class="primary" data-act="continue">Continue (re-check)</button><button type="button" data-act="restart">New session</button></div></div>`;
    else if (busy) body = '<p class="hint abbusy" role="status">Looking…</p>';
    else if (!result) body = '';
    else if (!result.ok) body = noSolution(result);
    else body = `<p class="abbanner">${esc(bannerOf(s))}</p>${mobileStrip(result.a, result.b)}<div class="abgrid">${cardHtml(result.a, result.b, 'A')}${cardHtml(result.b, result.a, 'B')}</div>${choiceHtml()}`;
    root.innerHTML = `<header class="abhead"><h2>Discover</h2><button type="button" class="dxx" aria-label="Close Discovery" data-act="close">✕</button></header>
      <div class="abtop"><div class="flabel">Discovery can change this</div>${switchesHtml()}
        <div class="ablocked" data-drop="1" role="note"><b>Locked</b> ${esc(lockedSummary(store.tank).replace(/^Locked \(kept as it is\): /, '').replace(/\.$/, ''))}<small> · drag a row here, or use Keep, to lock it</small></div>
        <div id="abDoors"></div><details class="abq"><summary>Quick setup: look, shuffle, density</summary><div id="abQuick"></div></details></div>
      ${only ? `<p class="hint abonly">This run looks only at ${only.map(t => TAB_LABEL[t]).join(', ')} (opened from there). Flip any switch to use your own.</p>` : ''}
      ${note && !plan && !detail ? `<p class="abnote" role="status">${esc(note)}</p>` : ''}
      <div class="abmain">${body}</div>${historyHtml()}${plan ? planHtml(plan) : detail ? detailHtml(detail) : ''}`;
    const q = root.querySelector('#abQuick'); if (q && quickEl) q.append(quickEl);
    const d = root.querySelector('#abDoors'); if (d && doorsEl) d.append(doorsEl);
    shots();
  };

  // ------------------------------------------------------------------------------------------------ pictures (one per frame, through the store-neutral previewShot)
  const shots = () => {
    if (!viewer) return;
    const my = rid, todo: { img: HTMLImageElement; rec: CandidateRecord }[] = [];
    root.querySelectorAll<HTMLImageElement>('img.abpic:not([src])').forEach(img => { const rec = engine.record(img.closest<HTMLElement>('[data-id]')?.dataset.id ?? detail ?? ''); if (rec) todo.push({ img, rec }); });
    root.querySelectorAll<HTMLImageElement>('img[data-hid]:not([src])').forEach(img => { const rec = engine.record(img.dataset.hid!); if (rec) todo.push({ img, rec }); });
    const next = () => {
      const t = todo.shift(); if (!t || my !== rid && !result || root.hidden) return;
      shooting = true;
      try { t.rec.thumb ??= previewShot(store, t.rec.snapshot, () => viewer.thumbnail(480)); t.img.src = t.rec.thumb; } catch { /* no picture */ } finally { shooting = false; }
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  };

  // ------------------------------------------------------------------------------------------------ actions
  const afterKeep = (msg: string) => {
    const c = engine.recheckChampion();
    note = c.ok ? msg : `${msg} Your favourite no longer fits what you kept (${c.conflicts.join(' ')}), so it was set aside and a new pair is coming.`;
    deps.status(note);
    if (c.ok) draw(); else { const n = note; look(() => engine.next()); setTimeout(() => { note = n; draw(); }, 60); }
  };
  const doKeep = (w: 'A' | 'B' | undefined, id: string | undefined, t: KeepTarget, uids?: string[]) => {
    const rec = id ? engine.record(id) : recOf(w!); if (!rec) return;
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
      case 'keepnow': { const rec = recOf(w!); if (!rec) break; const tab = el.dataset.tab as Tab; toggleSwitch(store, tab, false); syncScope(); engine.freeze(tab, rec.id); note = `${TAB_LABEL[tab]}: kept from ${w} for the next candidates. Your design is not changed; turn the switch back on to release it.`; draw(); break; }
      case 'miy': openPlan(id!); break;
      case 'miy-cancel': plan = undefined; note = ''; draw(); break;
      case 'miy-accept': {
        const r = acceptPlan(store, plan!.rec, engine.session());
        if (r.ok) { plan = undefined; deps.status('Made yours: it is now your working design (Undo steps back). Nothing was locked.'); close(); }
        else { note = r.reason === 'stale' ? 'Your project changed while this was open: look again.' : 'It conflicts with what you kept.'; plan = makePlan(store, plan!.rec, engine.session()); draw(); }
        break;
      }
      case 'adapt': {
        const r = engine.adapt(plan!.rec.id);
        if (r.ok) { plan = { ...makePlan(store, r.record, engine.session()), adaptNote: 'Adapted: a new design that keeps what you kept. The original stays in History untouched.' }; note = ''; }
        else note = `Not adapted: ${r.reason}`;
        draw(); break;
      }
      case 'continue': engine.rebase(); resume = false; look(() => { const c = engine.recheckChampion(); void c; return engine.next(); }); break;
      case 'restart': engine.restart(); resume = false; syncScope(); look(() => engine.next()); break;
      case 'hist-toggle': histOpen = !histOpen; draw(); break;
      case 'hist-prev': histPage = Math.max(0, histPage - 1); draw(); break;
      case 'hist-next': histPage++; draw(); break;
      case 'hist-open': detail = id; note = ''; importTab = undefined; draw(); break;
      case 'hist-close': detail = undefined; note = ''; importTab = undefined; draw(); break;
      case 'hist-fav': engine.favourite(id!, !isFav(id!)); draw(); break;
      case 'hist-back': { detail = undefined; pending = undefined; look(() => engine.bringBack(id!)); break; }
      case 'hist-setfav': { const r = engine.setFavourite(id!); if (r.ok) { detail = undefined; look(() => engine.next()); } else { note = `Not set: ${r.reason}`; draw(); } break; }
      case 'import': importTab = el.dataset.tab as Tab; draw(); break;
      case 'import-no': importTab = undefined; draw(); break;
      case 'import-yes': { const tab = importTab!; engine.freeze(tab, detail!); toggleSwitch(store, tab, false); importTab = undefined; note = `${TAB_LABEL[tab]} from this design will be used for the next candidates. Your design is not changed.`; draw(); break; }
    }
  };
  root.addEventListener('click', e => {
    const sw = (e.target as HTMLElement).closest<HTMLElement>('[data-sw]');
    if (sw) { e.preventDefault(); e.stopPropagation(); only = undefined; toggleSwitch(store, sw.dataset.sw as Tab); syncScope(); syncSwitches(store, document); draw(); return; }
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
      engine.open(scope); histPage = 0; histOpen = false; detail = undefined; plan = undefined; pending = undefined; note = ''; sheets = new Set(); result = undefined; busy = false;
      only = scope; if (!scope) syncScope();
      root.hidden = false; resume = engine.isStale(); draw(); root.scrollTop = 0;
      if (!resume) look(() => engine.next());
    },
  };
}
