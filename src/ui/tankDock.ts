// The docked tank picker (lane ST1, Nathan 2026-11-05): "let the user choose a tank to start with, show them a live render of the size as they flip through different
// options". It sits BESIDE the live view (it takes the side panel's place while open), never over it. Moving through the rows (click, arrow keys) draws that size, full
// size, on the floor beside the person, as a view-only preview (viewer.setPreview: the saved scene does not change until Choose). Each row says the size, the tank's
// price and the finished-tank range (lane FR1). Two uses:
//   'start'  the New-tank Sandbox room: nothing in the room, a tank is REQUIRED; after Choose a "Put it on" step asks floor / a stand / my own furniture;
//   'change' the Tank section's Presets button: Choose applies and closes, the close button leaves things as they were.
import type { Viewer } from '../render/viewer';
import { tankView } from '../render/tankView';
import { STAND_FINISHES } from '../render/build';
import { getTankModel, saleLive, variantByKey, type TankModel, type TankVariant } from '../data/tanks';
import { fromUnit, toUnit } from '../scene/physics';
import { PLACEMENTS, minTop, placementOf, putOnFloor, putOnFurniture, putOnMyFurniture, putOnStand, type Placement } from '../scene/placement';
import { tankKind, type SetupKind } from '../scene/pickerKind';
import type { Store } from '../scene/store';
import type { Scene, StandFinish } from '../scene/types';
import { dockGroups, emptyRoomView, isBundle, optKey, previewSetup, rangeText, roomZoom, startGear, startLight, includesText, type DockBand, type DockOpt } from './tankDockLogic';

export interface DockHost {
  /** Choose a size / product: the same edit the old modal made (brief, size, product, stand, pinned price). */
  apply(m: TankModel, v?: TankVariant): void;
  /** Start mode only: the way back to the kind screen. */
  back?(): void;
  /** The scene was replaced from elsewhere (Open, Undo, another New) while the picker was up: it has closed itself. */
  abandoned?(): void;
}
export type DockMode = 'start' | 'change';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function attachTankDock(store: Store, viewer: Viewer, host: DockHost) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const app = $('app'), dock = $('tankDock'), list = $('tdList'), q = $<HTMLInputElement>('tdQ'), detail = $('tdDetail'), choose = $<HTMLButtonElement>('tdChoose');
  const pick = $('tdPick'), put = $('tdPut'), back = $<HTMLButtonElement>('tdBack'), closeBtn = $<HTMLButtonElement>('tdClose');
  let mode: DockMode = 'change', kind: SetupKind = 'freshwater', opts: DockOpt[] = [], sel = -1, cur: DockOpt | undefined, openBands = new Set<string>(), autoZoom: number | undefined, userZoomed = false, onClose: (() => void) | undefined, step: 'pick' | 'put' = 'pick', isOpen = false;
  const units = (): Scene['units'] => store.scene.units;

  // ---------- the view ----------
  const emptyNow = () => isOpen && mode === 'start' && step === 'pick' && !cur;
  const show = (on: boolean) => { isOpen = on; dock.hidden = !on; app.classList.toggle('docking', on); app.classList.toggle('dockempty', emptyNow()); viewer.invalidate(); };
  /** Start mode: open the lens with the tank so the person stays in the picture (the scene's camera, so the person can still orbit and zoom; a zoom they set themselves is left alone). */
  const frameRoom = (T: { L: number; H: number }) => {
    if (mode !== 'start' || userZoomed) return;
    const z = roomZoom(T), now = store.tank.camera.zoom;
    if (autoZoom !== undefined && Math.abs(now - autoZoom) > 1e-6) { userZoomed = true; return; }
    autoZoom = z; if (Math.abs(now - z) > 1e-6) store.update(s => { s.tanks[s.active].camera = { ...s.tanks[s.active].camera, zoom: z }; }, { kind: 'view', history: false });
  };
  const setPreview = () => {
    if (!cur) { tankView.empty = mode === 'start'; if (mode === 'start') frameRoom(store.tank.tank); viewer.setPreview(mode === 'start' ? emptyRoomView(store.tank) : null); return; }
    const p = previewSetup(store.tank, cur, mode === 'start');
    tankView.empty = false; frameRoom(p.tank); viewer.setPreview(p);
  };
  const clearPreview = () => { tankView.empty = false; viewer.setPreview(null); };

  // ---------- step 1: the list ----------
  const rowHtml = (o: DockOpt, i: number) => {
    const sale = o.v && saleLive(o.v);
    const price = o.usd == null ? '<span class="hint">price n/a</span>' : o.typical ? `~${usd(o.usd)}` : `${usd(o.usd)}${sale ? ' <i>sale</i>' : ''}`;
    const r = o.typical ? rangeText(o.range) : '';
    return `<div class="td-opt${o.typical ? ' gen' : ' var'}" role="option" id="tdo${i}" data-i="${i}" aria-selected="${o.key === cur?.key}" tabindex="-1">` +
      `<span class="n">${o.typical ? `<b>${esc(o.name)}</b>` : esc(o.name)}</span><span class="d">${o.dims} in</span><span class="p">${price}</span>${r ? `<span class="r" title="A rough finished tank: lightly stocked with cheap decor at the low end, a semi-professional setup at the high end">finished ${r}</span>` : ''}</div>`;
  };
  const drawDetail = () => {
    const o = cur; choose.disabled = !o;
    if (!o) { detail.innerHTML = mode === 'start' ? '<p class="hint">The room is empty. Open a size group and pick a tank: it appears on the floor next to the person (5 ft 9 in). Arrow keys flip through the open sizes; drag to look around.</p>' : '<p class="hint">Open a size group and pick a tank to see it in the room. Arrow keys flip through the open sizes; drag to look around.</p>'; return; }
    const r = rangeText(o.range);
    detail.innerHTML = `<div class="td-name"><b>${esc(o.v ? o.name : o.m.name)}</b> <span class="hint">${o.dims} in outer</span></div>` +
      `<div class="td-line">${o.usd != null ? `<span>${o.v && isBundle(o.v) ? 'Kit' : 'Tank'} ${o.typical ? 'about ' : ''}<b>${usd(o.usd)}</b></span>` : ''}${r ? `<span title="${esc(o.range?.basis ?? '')}">Finished tank about <b>${r}</b></span>` : ''}</div>` + (includesText(o.v) ? `<div class="td-line hint">${esc(includesText(o.v))}</div>` : '');
  };
  const bandHead = (b: DockBand, open: boolean) => `<button type="button" class="td-band" data-band="${b.id}" aria-expanded="${open}"><span class="chev" aria-hidden="true">${open ? '▾' : '▸'}</span><span class="bn">${esc(b.title)}</span><span class="bc">${b.n} ${b.n === 1 ? 'choice' : 'choices'}</span>${b.lo != null ? `<span class="bp">${b.lo === b.hi ? usd(b.lo) : `${usd(b.lo)} - ${usd(b.hi!)}`}</span>` : ''}</button>`;
  const drawList = () => {
    const keep = list.scrollTop, groups = dockGroups(kind, q.value), searching = !!q.value.trim(), isOpenBand = (id: string) => searching || openBands.has(id);
    opts = groups.flatMap(g => g.bands.filter(b => isOpenBand(b.id)).flatMap(b => b.opts)); sel = cur ? opts.findIndex(o => o.key === cur!.key) : -1;
    let i = 0;
    list.innerHTML = groups.map(g => `<h3 class="td-group">${esc(g.title)} <span class="hint">${esc(g.hint)}</span></h3>` + g.bands.map(b => { const o = isOpenBand(b.id); return bandHead(b, o) + (o ? b.opts.map(x => rowHtml(x, i++)).join('') : ''); }).join('')).join('') || '<p class="hint">No tank matches that search.</p>';
    list.scrollTop = keep; drawDetail();
  };
  const markSel = () => {
    for (const el of list.querySelectorAll<HTMLElement>('.td-opt')) el.setAttribute('aria-selected', String(+el.dataset.i! === sel));
    const el = sel >= 0 ? document.getElementById(`tdo${sel}`) : null; el?.scrollIntoView({ block: 'nearest' }); list.setAttribute('aria-activedescendant', el?.id ?? '');
  };
  const select = (i: number) => { if (i < 0 || i >= opts.length) return; sel = i; cur = opts[i]; markSel(); drawDetail(); setPreview(); app.classList.toggle('dockempty', emptyNow()); };
  const toggleBand = (id: string) => { if (openBands.has(id)) openBands.delete(id); else openBands.add(id); drawList(); };
  const doChoose = () => {
    const o = cur; if (!o) return;
    clearPreview();
    host.apply(o.m, o.v);
    if (mode === 'start') { store.edit(s => { const g = startGear(s, o); if (g) s.tech = g; startLight(s, o); if (!s.stand.show) putOnFloor(s); if (!userZoomed) s.camera = { ...s.camera, zoom: roomZoom(s.tank) }; }); toStep('put'); } else close(); // start: the view stays as wide as the picker's, person included
  };
  list.onclick = e => {
    const t = e.target as HTMLElement, b = t.closest<HTMLElement>('.td-band'), el = t.closest<HTMLElement>('.td-opt');
    if (b) { toggleBand(b.dataset.band!); list.focus({ preventScroll: true }); } else if (el) { select(+el.dataset.i!); list.focus({ preventScroll: true }); }
  };
  list.ondblclick = e => { if ((e.target as HTMLElement).closest('.td-opt')) doChoose(); };
  /** The first size to land on when nothing is open: open the first band of the first group (a bare tank). */
  const openFirst = () => { const g = dockGroups(kind, q.value)[0]; if (g?.bands[0]) { openBands.add(g.bands[0].id); drawList(); } };
  const step1 = (dir: 1 | -1) => { if (!opts.length) openFirst(); if (opts.length) select(sel < 0 ? (dir > 0 ? 0 : opts.length - 1) : Math.max(0, Math.min(opts.length - 1, sel + dir))); };
  list.onkeydown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); step1(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); if (opts.length) select(e.key === 'Home' ? 0 : opts.length - 1); }
    else if (e.key === 'Enter' && cur) { e.preventDefault(); doChoose(); }
  };
  q.oninput = () => { drawList(); app.classList.toggle('dockempty', emptyNow()); };
  q.onkeydown = e => { if (e.key === 'ArrowDown') { e.preventDefault(); step1(1); list.focus({ preventScroll: true }); } };
  choose.onclick = doChoose;

  // ---------- step 2: what it stands on ----------
  const inVal = (mm: number) => String(toUnit(mm, units()));
  const drawPut = () => {
    const S = store.tank, now = placementOf(S), u = units() === 'in' ? 'in' : 'cm', tb = S.stand.table;
    const card = (p: Placement, label: string, hint: string) => `<label class="td-card${now === p ? ' on' : ''}"><input type="radio" name="tdPlace" value="${p}"${now === p ? ' checked' : ''}><span><b>${label}</b><span class="hint">${esc(hint)}</span></span></label>`;
    let more = '';
    if (now === 'stand') {
      more = `<div class="td-more"><div class="field"><span class="flabel">Kind</span><span class="seg" data-g="style"><button type="button" data-v="cabinet" class="${S.stand.style !== 'frame' ? 'on' : ''}">Cabinet</button><button type="button" data-v="frame" class="${S.stand.style === 'frame' ? 'on' : ''}">Open frame</button></span></div>` +
        `<div class="field"><span class="flabel">Finish</span><span class="seg" data-g="finish">${(Object.keys(STAND_FINISHES) as StandFinish[]).map(f => `<button type="button" data-v="${f}" class="${S.stand.finish === f ? 'on' : ''}">${esc(STAND_FINISHES[f].label)}</button>`).join('')}</span></div></div>`;
    }
    if (now === 'furniture') {
      const min = minTop(S, tb.shape);
      more = `<div class="td-more"><div class="field"><label class="flabel" for="tdFh">Height (floor to top, ${u})</label><input id="tdFh" type="number" min="1" step="any" value="${inVal(S.stand.height)}"></div>` +
        `<div class="field"><span class="flabel">Top</span><span class="seg" data-g="shape"><button type="button" data-v="rect" class="${tb.shape === 'rect' ? 'on' : ''}">Rectangular</button><button type="button" data-v="round" class="${tb.shape === 'round' ? 'on' : ''}">Round</button></span></div>` +
        `<div class="field"><label class="flabel" for="tdFl">${tb.shape === 'round' ? `Diameter (${u})` : `Length (${u})`}</label><input id="tdFl" type="number" min="1" step="any" value="${inVal(tb.L)}">` +
        (tb.shape === 'rect' ? ` <label class="flabel" for="tdFd">Depth (${u})</label><input id="tdFd" type="number" min="1" step="any" value="${inVal(tb.D)}">` : '') + '</div>' +
        `<div class="hint bad" id="tdFwarn" hidden></div><div class="hint">This tank needs a top at least ${tb.shape === 'round' ? `${inVal(min.L)} ${u} across` : `${inVal(min.L)} × ${inVal(min.D)} ${u}`} (the glass and rim sit on it).</div></div>`;
    }
    $('tdPutBody').innerHTML = PLACEMENTS.map(([p, l, h]) => card(p, l, h)).join('') + more;
  };
  const toStep = (s: 'pick' | 'put') => {
    step = s; pick.hidden = s !== 'pick'; put.hidden = s !== 'put';
    back.hidden = !(mode === 'start' && s === 'pick'); closeBtn.hidden = mode === 'start' && s === 'pick';
    $('tdTitle').textContent = s === 'pick' ? (mode === 'start' ? 'Choose a tank' : 'Tank sizes') : 'Put it on';
    if (s === 'put') drawPut();
    app.classList.toggle('dockempty', emptyNow()); viewer.invalidate();
  };
  const place = (p: Placement) => store.edit(s => {
    if (p === 'floor') putOnFloor(s);
    else if (p === 'stand') putOnStand(s);
    else putOnMyFurniture(s);
  });
  const readFurniture = () => {
    const S = store.tank, g = (id: string) => document.getElementById(id) as HTMLInputElement | null;
    const num = (id: string, d: number) => { const v = parseFloat(g(id)?.value ?? ''); return Number.isFinite(v) && v > 0 ? fromUnit(v, units()) : d; };
    const shape = S.stand.table.shape, L = num('tdFl', S.stand.table.L), D = shape === 'round' ? L : num('tdFd', S.stand.table.D), h = num('tdFh', S.stand.height);
    const min = minTop(S, shape), small = L + 0.5 < min.L || (shape === 'rect' && D + 0.5 < min.D);
    store.edit(s => { putOnFurniture(s, { shape, L, D, height: h }); }, { coalesce: 'tdFurniture' });
    const w = document.getElementById('tdFwarn'); if (w) { w.hidden = !small; w.textContent = small ? 'That top is smaller than the tank, so the tank would overhang it. It is drawn at the smallest top that holds the tank.' : ''; }
  };
  put.onchange = e => { const t = e.target as HTMLInputElement; if (t.name === 'tdPlace') { place(t.value as Placement); drawPut(); } };
  put.oninput = e => { const t = e.target as HTMLInputElement; if (t.id === 'tdFh' || t.id === 'tdFl' || t.id === 'tdFd') readFurniture(); };
  put.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.seg button[data-v]'); if (!b) return;
    const g = b.parentElement!.dataset.g, v = b.dataset.v!;
    if (g === 'style') store.edit(s => putOnStand(s, { style: v as 'cabinet' | 'frame' }));
    else if (g === 'finish') store.edit(s => putOnStand(s, { finish: v as StandFinish }));
    else if (g === 'shape') store.edit(s => { const t = s.stand.table; putOnFurniture(s, { shape: v as 'rect' | 'round', L: v === 'round' ? Math.max(t.L, t.D) : t.L, D: t.D, height: s.stand.height }); });
    drawPut();
  };

  // ---------- open / close ----------
  function close() {
    if (!isOpen) return;
    clearPreview(); show(false);
    const f = onClose; onClose = undefined; f?.();
  }
  $('tdDone').onclick = () => close();
  closeBtn.onclick = () => close();
  back.onclick = () => { clearPreview(); show(false); const f = onClose; onClose = undefined; host.back?.(); f?.(); };
  store.subscribe(k => { if (k === 'scene' && isOpen && mode === 'start') setPreview(); /* the room-light slider moved (UI4) */ if (k === 'load' && isOpen) { clearPreview(); show(false); host.abandoned?.(); const f = onClose; onClose = undefined; f?.(); } });
  dock.addEventListener('keydown', e => { if (e.key === 'Escape' && mode === 'change' && isOpen) { e.preventDefault(); close(); } });
  return {
    /** Open the picker: 'start' = the empty Sandbox room (no way out without a tank), 'change' = swap the tank in the editor. */
    open(m: DockMode, done?: () => void) {
      mode = m; onClose = done; kind = tankKind(store.tank); q.value = ''; sel = -1; cur = undefined; openBands = new Set(); autoZoom = undefined; userZoomed = false;
      // reopened from the Tank section: the band of the tank in use is open and that tank highlighted (the preview already is it)
      if (m === 'change') {
        const pr = store.tank.product, mod = pr && getTankModel(pr.model), v = mod && pr.key ? variantByKey(mod, pr.key) : undefined;
        const key = mod ? optKey(mod, v) : undefined;
        for (const g of dockGroups(kind)) for (const bd of g.bands) { const o = bd.opts.find(x => x.key === key); if (o) { openBands.add(bd.id); cur = o; } }
      }
      tankView.empty = m === 'start'; if (m === 'start') { viewer.resetPan(); frameRoom(store.tank.tank); } // a new room starts centred, not where the last tank was panned to viewer.setPreview(m === 'start' ? emptyRoomView(store.tank) : null);
      drawList(); toStep('pick'); show(true); if (cur) setTimeout(() => document.querySelector('.td-opt[aria-selected="true"]')?.scrollIntoView({ block: 'center' }), 0);
      setTimeout(() => q.focus({ preventScroll: true }), 150); // after a modal dialog behind it has closed
    },
    close,
    get isOpen() { return isOpen; },
  };
}
export type TankDock = ReturnType<typeof attachTankDock>;
