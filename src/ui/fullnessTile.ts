// Fullness tile (lane P3, path 1, Nathan 2026-10-20): a minimizable tile on the viewer with the stocking engine's two
// limits as bars, space and filtration (scene/stocking.ts stockingOf; the sidebar stocking line moved in here 2026-10-22), live as animals
// are added; hovering (or tapping) a bar lists who fills it most. "Set my space" records the area the owner has
// (layout.space, scene/space.ts), drawn in the viewer as a dashed outline (render/spaceOutline.ts); an edit that takes
// the tank past it calls the fork card hook (`onSpaceFork`: make room / swap; the card itself is lane P5's).
// The tile follows the view: hidden while the Animals Show box is off, faded with the rest while another menu is in focus.
// The pure helpers (bars, top lists, tileState, nitrogen rows, space lines) live in ui/logic/habitat.ts (UI2 P6, 2026-11-13); re-exported here for old importers.
import { crowdWarnings, coverAdvice } from '../scene/territory';
import type { Viewer } from '../render/viewer';
import { writeSpace as writeSpaceTo } from '../scene/spaceStore';
import { defaultSpace, spaceFit, tankExtent, SPACE_MAX, SPACE_MIN } from '../scene/space';
import { plural, stockingDetail, stockingMemo } from '../scene/stocking';
import { setFilterless } from '../scene/tech';
import type { Store } from '../scene/store';
import { tankView } from '../render/tankView';
import { GAUGE_TIP, gaugeStyle } from './gauge';
import { stockSummary, summaryHtml, minWarnings, toUnits, type MinWarn } from './stockSummary';
import { topBy, tileState, nitrogenRows, overLine, forkDue, fromUnits, tankSizeLine, fmtLen as fmt, fmtBox, type Bar, type TopRow, type SpaceFork } from './logic/habitat';
export { minWarnings, toUnits, type MinWarn };
export { NEAR_FULL, bar, topBy, MIN_WORD, minBar, topMin, tankSizeLine, spaceReason, tileState, mg, nitrogenRows, waterChangeText, forkDue, fromUnits, overLine,
  type Level, type Bar, type TopRow, type TileState, type NRow, type SpaceFork } from './logic/habitat';

type ForkFn = (f: SpaceFork) => void;
let forkFn: ForkFn | null = null;
/** Lane P5's fork card registers here; returns the unregister. While none is registered the tile only says it is too big. */
export function onSpaceFork(fn: ForkFn) { forkFn = fn; return () => { if (forkFn === fn) forkFn = null; }; }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const N_KEY = 'tanklook.ftN', C_KEY = 'tanklook.ftCounts';

/** SV1: `host` puts the tile inside one side of a split view (its `store` is then a sideStore: that side's tank); `gate` says whether this copy is the one in use right now. */
export interface FullnessOpts { host?: HTMLElement; gate?: () => boolean }
export function attachFullnessTile(viewer: Viewer, store: Store, opts: FullnessOpts = {}) {
  const gate = opts.gate ?? (() => true);
  const host = opts.host ?? document.getElementById('view')!, tools = opts.host ? null : host.querySelector('.viewtools'); // top-left, under the view's buttons (the demand panel holds the top right)
  const el = document.createElement('section');
  el.className = opts.host ? 'ft sv' : 'ft'; el.hidden = true; el.setAttribute('aria-label', 'How full the tank is');
  el.innerHTML = `<button class="ftHead" type="button" aria-expanded="true" title="Minimize the habitat check"><span class="ftTitle">Habitat check</span><span class="ftPill"></span><span class="ftChev" aria-hidden="true">▾</span></button>
<div class="ftBody"><div class="ftBars"></div><details class="ftN ftCounts"><summary>What counts</summary><ul class="ftCountsBody"></ul></details>
<details class="ftN"><summary>Where the ammonia goes, per day</summary><div class="ftNCtl">
<label>Feeding <select class="ftFeed" title="How heavily the animals are fed: sets the waste they make"><option value="light">Light (0.5 % of body weight a day)</option><option value="normal">Normal (1 %)</option><option value="heavy">Heavy (2 %)</option></select></label>
<label>Tap nitrate <input class="ftTap" type="number" min="0" max="200" step="1" placeholder="0" title="Nitrate in your tap (source) water, ppm as NO3, from a test kit or your water report; blank = 0"> ppm</label></div><div class="ftNBody"></div></details><div class="ftSpace"></div>
<form class="ftForm" hidden><div class="ftFields">
<label>Width <input name="w" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Depth <input name="d" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Height <input name="h" type="number" inputmode="decimal" min="1" step="any" placeholder="any"></label>
<span class="ftU"></span></div>
<div class="ftBtns"><button type="submit" class="primary">Done</button><button type="button" class="ftClear">Remove my space</button></div></form></div>`;
  host.append(el);
  // the button row wraps on a narrow view: the tile starts below its last row
  const place = () => { const v = host.getBoundingClientRect(), t = tools?.getBoundingClientRect(); el.style.top = `${t && t.height ? Math.round(t.bottom - v.top + 8) : 10}px`; };
  if (tools) new ResizeObserver(place).observe(tools);
  if (!opts.host) place(); // (a side copy is placed by its container, ui/sideOverlays.ts)
  const $ = <T extends Element>(s: string) => el.querySelector(s) as T;
  const head = $<HTMLButtonElement>('.ftHead'), pill = $<HTMLElement>('.ftPill'), bars = $<HTMLElement>('.ftBars'), spaceEl = $<HTMLElement>('.ftSpace');
  const nEl = $<HTMLDetailsElement>('.ftN:not(.ftCounts)'), nBody = $<HTMLElement>('.ftNBody'), feed = $<HTMLSelectElement>('.ftFeed'), tap = $<HTMLInputElement>('.ftTap');
  const cEl = $<HTMLDetailsElement>('.ftCounts'), cBody = $<HTMLElement>('.ftCountsBody');
  try { nEl.open = localStorage.getItem(N_KEY) === '1'; } catch { /* storage blocked */ }
  try { cEl.open = localStorage.getItem(C_KEY) === '1'; } catch { /* storage blocked */ }
  cEl.ontoggle = () => { try { localStorage.setItem(C_KEY, cEl.open ? '1' : '0'); } catch { /* ignore */ } };
  nEl.ontoggle = () => { try { localStorage.setItem(N_KEY, nEl.open ? '1' : '0'); } catch { /* ignore */ } };
  const form = $<HTMLFormElement>('.ftForm'), inp = (n: string) => form.elements.namedItem(n) as HTMLInputElement;

  let min = true; // Nathan 2026-11-12: starts minimized on every load (expanded it covers much of the tank); a click opens it for this visit
  const setMin = (m: boolean) => {
    min = m; el.classList.toggle('min', m); head.setAttribute('aria-expanded', String(!m)); head.title = m ? 'Show the habitat check' : 'Minimize the habitat check';
  };
  setMin(min);
  head.onclick = () => setMin(!min);

  // Load bars (water, floor; Nathan 2026-10-26): the whole-scale gauge (ui/gauge.ts, style.css .gauge), shared with the stocking
  // screen's space bars. The minimum bar keeps one colour per level: its yellow line is Recommended, not the ideal.
  const row = (key: string, label: string, b: Bar, top: TopRow[], what: string, hd = `Most of the ${what}:`, tip = '', none = 'No animals in the water yet.', load = key !== 'min') => {
    const t = (tip + (load ? ` ${GAUGE_TIP}` : '')).trim();
    return `<div class="ftRow ft-${b.level}${load ? ' ftLoad' : ''}" tabindex="0" data-row="${key}"${t ? ` title="${esc(t)}"` : ''}><div class="ftLab"><span>${label}</span><b>${b.text}</b></div>`
      + `<div class="ftTrack${load ? ' gauge' : ''}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(b.pct, 999))}" style="${load ? gaugeStyle(b.pct) : `--pct:${Math.min(b.pct, 999)}`}"><i></i></div>`
      + `<div class="ftTop">${top.length ? `<div class="ftTopHd">${hd}</div>` + top.map(t => `<div>${esc(plural(t.n, t.name))} <b>${t.note ? esc(t.note) : `${Math.round(t.share * 100)}%`}</b></div>`).join('') : `<div>${none}</div>`}</div></div>`;
  };

  let lastSig = '', editing = false;
  const fitWas = new Map<number, boolean>(); // per tank: did it fit the space after the last edit

  const render = () => {
    if (!gate()) { el.hidden = true; lastSig = ''; return; } // the other copy (split view / single tank) is the one showing
    const S = store.tank, r = stockingMemo(S), u = store.scene.units, st = tileState(S, r, u);
    const animalsHidden = viewer.hidden.has('fish');
    el.hidden = !st.show || animalsHidden || tankView.ghost; // no tank chosen yet on the stocking screen: nothing to be full
    const crowd = crowdWarnings(S), cover = coverAdvice(S); // S196: fighting limits, a warning only (never in the percents); lane CP2: cover
    const sm = stockSummary(S, r, st.mins, u);
    const sig = JSON.stringify([st, sm, u, editing, !!forkFn, tankExtent(S.tank), crowd, cover, stockingDetail(r), r.capacity, r.nitrogen, S.water.tapNitrate ?? 0]);
    if (sig === lastSig) return;
    lastSig = sig;
    el.classList.toggle('over', st.head.level === 'over' || st.fit?.fits === false);
    // Nathan 2026-10-27: closed, the pill is the WORST of the five categories; the fullness number means room only
    pill.textContent = st.fit?.fits === false ? `${sm.worstWord} · too big` : sm.worstWord;
    pill.title = [st.compat?.text, ...sm.cats.filter(c => c.level !== 'ok').map(c => `${c.label}: ${c.word}`)].filter(Boolean).join('\n');
    pill.className = `ftPill ftc-${sm.worst}`;
    pill.style.background = ''; pill.style.color = '';
    const box = (on: boolean) => `<label class="ftNoFilt"><input type="checkbox" class="ftNoFilter"${on ? ' checked' : ''}> No filter: I am keeping this tank filterless (Walstad style)</label>`;
    // lane HB (Nathan 2026-10-21): Space split into its two limits; the pill and the tank fit use the larger
    const spaceRows = row('water', 'Water column', st.water, topBy(r, 'space'), 'water column', undefined, 'How full the water is: body size against the litres (fitted to AqAdvisor). More height counts here.')
      + row('floor', 'Floor', st.floor, st.topFloor, 'floor', 'Most of the floor:', 'Floor the bottom dwellers use: 15 sq in per inch of fish (research/habitat-model.md). A taller tank adds no floor.', 'No bottom dwellers: the floor is free.');
    bars.innerHTML = `<div class="ftWhy ftSize">${esc(tankSizeLine(S, r, u))}</div>` + (r.contributors.length ? summaryHtml(sm, esc) : '') + (st.compat ? `<div class="ftWarn ft-${st.compat.level} ftCompat">${esc(st.compat.text)}</div>` : '') + spaceRows
      + (st.filter === 'unset' ? `<div class="ftWarn ft-near ftNeedFilter"><b>No filter chosen.</b> A filter sized for this tank is strongly recommended: it circulates and aerates the water, catches debris and holds the bacteria that clear ammonia. Pick one in Tech › Filtration.${box(false)}</div>` : '')
      + (st.topMin.length ? row('min', 'Tank minimum', st.min, st.topMin, 'minimum', 'Smallest tank they want, whatever the count:', Number.isFinite(st.min.pct) ? `Their minimum tank is ${Math.round(st.min.pct)}% of this one: green past every Recommended size, yellow between the minimum and Recommended, red below the minimum.` : '') : '')
      + st.mins.map(w => `<div class="ftWarn ft-${w.level}">${esc(w.text)}</div>`).join('')
      + crowd.map(t => `<div class="ftWarn ft-near ftCrowd">${esc(t)}</div>`).join('')
      + cover.map(t => `<div class="ftWarn ft-near ftCover">${esc(t)}</div>`).join('')
      + (st.reason ? `<div class="ftWhy">${esc(st.reason)}</div>` : '');
    cEl.hidden = !r.contributors.length;
    if (!cEl.hidden) cBody.innerHTML = stockingDetail(r).map(t => `<li>${esc(t)}</li>`).join('') + `<li class="dim">Water ${u === 'in' ? `${Math.round(r.capacity.litres / 3.785)} gal` : `${Math.round(r.capacity.litres)} L`}, filter x${r.capacity.filter.toFixed(2)}${r.capacity.plantCount ? `, plants x${r.capacity.plants.toFixed(2)}` : ''}, ${u === 'in' ? `${Math.round(r.capacity.tempC * 9 / 5 + 32)} °F` : `${Math.round(r.capacity.tempC)} °C`}.</li>`;
    const n = r.nitrogen;
    if (document.activeElement !== feed) feed.value = n.feeding;
    if (document.activeElement !== tap) tap.value = S.water.tapNitrate ? String(S.water.tapNitrate) : '';
    nEl.hidden = !r.contributors.length || n.tan <= 0;
    if (!nEl.hidden) {
      const seg = (cls: string, g: number) => g > 0 ? `<i class="${cls}" style="width:${g / n.tan * 100}%"></i>` : '';
      nBody.innerHTML = `<div class="ftNSplit" aria-hidden="true">${seg('p', n.byPlants)}${seg('b', n.byBacteria)}${seg('u', n.unprocessed)}</div>`
        + nitrogenRows(n).map(x => `<div class="ftNRow"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>${x.note ? `<div class="ftNNote">${esc(x.note)}</div>` : ''}`).join('')
        + `<div class="ftNNote">Nitrate rises about ${n.nitrateMgNPerWeek.toFixed(1)} mg N/L a week.</div>`
        + `<div class="ftNNote">${st.filter === 'filterless' ? 'With no filter the bacteria build up on the surfaces slowly: let the plants grow in and add the animals a few at a time.' : 'A new filter has no bacteria yet: cycle it (about 4-6 weeks, ammonia and nitrite at 0) before the full stock goes in.'}</div>`
        + `<div class="ftNNote ftNCaveat">Rough figures: animals ±40 %, plant and bacteria rates from few studies.</div>`;
    }
    const e = tankExtent(S.tank);
    spaceEl.innerHTML = editing ? `<div class="ftHint">The dashed outline in the view is your space; the tank's back sits on its back edge.</div>`
      : !st.limit ? `<button type="button" class="ftSet" title="Enter the area you have for the tank; it is drawn as a dashed outline">Set my space</button>`
      : `<div class="ftMine ${st.fit!.fits ? 'ok' : 'bad'}"><span>Your space ${fmtBox(st.limit.w, st.limit.d, u)}${st.limit.h ? `, ${fmt(st.limit.h, u)} high` : ''} · tank ${fmtBox(e.w, e.d, u)}</span><button type="button" class="ftSet ftEdit">Edit</button></div>`
        + (st.fit!.fits ? '' : `<div class="ftOver">${esc(overLine(st.fit!, u))}${forkFn ? ' <button type="button" class="ftFork">Make room or swap…</button>' : ''}</div>`);
  };

  const fork = () => {
    const S = store.tank, limit = S.layout.space; if (!limit || !forkFn) return;
    if (opts.host) { const i = store.scene.active; store.setEditing(i, true); store.setActive(i); } // SV1: the fork card edits the tank the panel shows: make it this side's
    const f = forkFn; queueMicrotask(() => f({ setup: S, limit, fit: spaceFit(S.tank, limit), stocking: stockingMemo(S) })); // after this change's listeners
  };
  const openForm = () => {
    const S = store.tank, s = S.layout.space ?? defaultSpace(S.tank, store.scene.units), u = store.scene.units;
    inp('w').value = String(toUnits(s.w, u)); inp('d').value = String(toUnits(s.d, u)); inp('h').value = s.h ? String(toUnits(s.h, u)) : '';
    $<HTMLElement>('.ftU').textContent = u === 'in' ? 'inches' : 'cm';
    editing = true; form.hidden = false;
    if (!S.layout.space) writeSpace(); // the outline shows at once, from the starting size
    inp('w').focus(); inp('w').select();
  };
  const closeForm = () => { editing = false; form.hidden = true; lastSig = ''; render(); };
  /** The fields to layout.space, clamped; one undo step per editing session (coalesced). */
  const writeSpace = () => {
    const u = store.scene.units, mm = (n: string) => { const v = parseFloat(inp(n).value); return Number.isFinite(v) && v > 0 ? Math.min(SPACE_MAX, Math.max(SPACE_MIN, fromUnits(v, u))) : 0; };
    const w = mm('w'), d = mm('d'), h = mm('h'); if (!w || !d) return;
    const i = store.scene.active;
    store.update(s => { writeSpaceTo(s.tanks[i], { w, d, ...(h ? { h } : {}) }); }, { coalesce: 'ftSpace' });
  };
  form.oninput = writeSpace;
  form.onsubmit = ev => { ev.preventDefault(); writeSpace(); store.seal(); closeForm(); const S = store.tank; if (S.layout.space && !spaceFit(S.tank, S.layout.space).fits) fork(); }; // a space smaller than the tank: the fork card at once
  form.onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); store.seal(); closeForm(); } };
  $<HTMLButtonElement>('.ftClear').onclick = () => {
    const i = store.scene.active; store.seal();
    store.update(s => { writeSpaceTo(s.tanks[i], undefined); }); closeForm();
  };
  bars.onchange = ev => {
    const t = ev.target as HTMLInputElement;
    if (!t.classList.contains('ftNoFilter')) return;
    store.seal(); store.edit(s => setFilterless(s, t.checked)); store.seal();
  };
  feed.onchange = () => { const v = feed.value as 'light' | 'normal' | 'heavy'; store.edit(s => { s.feeding = v === 'normal' ? undefined : v; }); };
  tap.onchange = () => { const v = parseFloat(tap.value); store.edit(s => { s.water.tapNitrate = v > 0 ? v : undefined; }); };
  spaceEl.onclick = ev => {
    const t = ev.target as HTMLElement;
    if (t.closest('.ftSet')) openForm(); else if (t.closest('.ftFork')) fork();
  };
  // touch: a tap on a bar shows / hides who fills it (hover does it with a mouse)
  bars.onclick = ev => { const r = (ev.target as HTMLElement).closest('.ftRow'); if (r) r.classList.toggle('open'); };

  store.subscribe(kind => {
    if (kind === 'load') { fitWas.clear(); if (editing) closeForm(); }
    const S = store.tank, i = store.scene.active, fits = S.layout.space ? spaceFit(S.tank, S.layout.space).fits : undefined;
    if (kind === 'scene' && gate() && !editing && forkDue(fitWas.get(i), fits)) fork(); // an edit took the tank past the space
    if (fits === undefined) fitWas.delete(i); else fitWas.set(i, fits);
    render();
  });
  // the Show boxes and the menu focus live on the viewer: follow them after each frame (class / hidden flips only)
  viewer.onDrawn(() => {
    const mf = document.getElementById('app')?.classList.contains('collapsed') ? null : viewer.menuFocus;
    el.classList.toggle('ftFade', !!mf && mf !== 'fish');
    render();
  });
  render();
  return { render, el };
}
