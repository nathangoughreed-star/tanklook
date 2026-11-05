// The docked tank picker (lane ST1, Nathan 2026-11-05): "let the user choose a tank to start with, show them a live render of the size as they flip through different
// options". It sits BESIDE the live view (it takes the side panel's place while open), never over it. Moving through the rows (click, arrow keys) draws that size, full
// size, on the floor beside the person, as a view-only preview (viewer.setPreview: the saved scene does not change until Choose). Each row says the size, the tank's
// price and the finished-tank range (lane FR1). Two uses:
//   'start'  the New-tank Sandbox room: nothing in the room, a tank is REQUIRED; after Choose a "Put it on" step asks floor / a stand / my own furniture;
//   'change' the Tank section's Presets button: Choose applies and closes, the close button leaves things as they were.
import type { Viewer } from '../render/viewer';
import { tankView } from '../render/tankView';
import { STAND_FINISHES } from '../render/build';
import { saleLive, type TankModel, type TankVariant } from '../data/tanks';
import { fromUnit, toUnit } from '../scene/physics';
import { PLACEMENTS, minTop, placementOf, putOnFloor, putOnFurniture, putOnMyFurniture, putOnStand, type Placement } from '../scene/placement';
import { tankKind, type SetupKind } from '../scene/pickerKind';
import type { Store } from '../scene/store';
import type { Scene, StandFinish } from '../scene/types';
import { dockGroups, emptyRoomView, previewSetup, rangeText, roomZoom, type DockOpt } from './tankDockLogic';

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
  let mode: DockMode = 'change', kind: SetupKind = 'freshwater', opts: DockOpt[] = [], sel = -1, onClose: (() => void) | undefined, step: 'pick' | 'put' = 'pick', isOpen = false;
  const units = (): Scene['units'] => store.scene.units;

  // ---------- the view ----------
  const emptyNow = () => isOpen && mode === 'start' && step === 'pick' && sel < 0;
  const show = (on: boolean) => { isOpen = on; dock.hidden = !on; app.classList.toggle('docking', on); app.classList.toggle('dockempty', emptyNow()); viewer.invalidate(); };
  const setPreview = () => {
    const o = opts[sel];
    if (!o) { tankView.empty = mode === 'start'; viewer.setPreview(mode === 'start' ? emptyRoomView(store.tank) : null); return; }
    tankView.empty = false; viewer.setPreview(previewSetup(store.tank, o, mode === 'start'));
  };
  const clearPreview = () => { tankView.empty = false; viewer.setPreview(null); };

  // ---------- step 1: the list ----------
  const rowHtml = (o: DockOpt, i: number) => {
    const sale = o.v && saleLive(o.v);
    const price = o.usd == null ? '<span class="hint">price n/a</span>' : o.typical ? `~${usd(o.usd)}` : `${usd(o.usd)}${sale ? ' <i>sale</i>' : ''}`;
    const r = o.typical ? rangeText(o.range) : '';
    return `<div class="td-opt${o.typical ? ' gen' : ' var'}" role="option" id="tdo${i}" data-i="${i}" aria-selected="${i === sel}" tabindex="-1">` +
      `<span class="n">${o.typical ? `<b>${esc(o.name)}</b>` : esc(o.name)}</span><span class="d">${o.dims} in</span><span class="p">${price}</span>${r ? `<span class="r" title="A rough finished tank: lightly stocked with cheap decor at the low end, a semi-professional setup at the high end">finished ${r}</span>` : ''}</div>`;
  };
  const drawDetail = () => {
    const o = opts[sel]; choose.disabled = !o;
    if (!o) { detail.innerHTML = mode === 'start' ? '<p class="hint">The room is empty. Pick a size and it appears on the floor next to the person (5 ft 9 in). Arrow keys flip through the sizes.</p>' : '<p class="hint">Pick a size to see it in the room. Arrow keys flip through the sizes.</p>'; return; }
    const r = rangeText(o.range);
    detail.innerHTML = `<div class="td-name"><b>${esc(o.v ? o.name : o.m.name)}</b> <span class="hint">${o.dims} in outer</span></div>` +
      `<div class="td-line">${o.usd != null ? `<span>Tank ${o.typical ? 'about ' : ''}<b>${usd(o.usd)}</b></span>` : ''}${r ? `<span title="${esc(o.range?.basis ?? '')}">Finished tank about <b>${r}</b></span>` : ''}</div>`;
  };
  const drawList = () => {
    const prev = opts[sel]?.key, groups = dockGroups(kind, q.value);
    opts = groups.flatMap(g => g.opts); sel = prev ? opts.findIndex(o => o.key === prev) : -1;
    let i = 0;
    list.innerHTML = groups.map(g => `<h3>${esc(g.title)}</h3>` + g.opts.map(o => rowHtml(o, i++)).join('')).join('') || '<p class="hint">No tank matches that search.</p>';
    drawDetail();
  };
  const markSel = () => {
    for (const el of list.querySelectorAll<HTMLElement>('.td-opt')) el.setAttribute('aria-selected', String(+el.dataset.i! === sel));
    const el = sel >= 0 ? document.getElementById(`tdo${sel}`) : null; el?.scrollIntoView({ block: 'nearest' }); list.setAttribute('aria-activedescendant', el?.id ?? '');
  };
  const select = (i: number) => { if (i < 0 || i >= opts.length) return; sel = i; markSel(); drawDetail(); setPreview(); app.classList.toggle('dockempty', emptyNow()); };
  const doChoose = () => {
    const o = opts[sel]; if (!o) return;
    clearPreview();
    host.apply(o.m, o.v);
    if (mode === 'start') { store.edit(s => { if (!s.stand.show) putOnFloor(s); s.camera = { ...s.camera, zoom: roomZoom(s.tank) }; }); toStep('put'); } else close(); // start: the view stays as wide as the picker's, person included
  };
  list.onclick = e => { const el = (e.target as HTMLElement).closest<HTMLElement>('.td-opt'); if (el) { select(+el.dataset.i!); list.focus({ preventScroll: true }); } };
  list.ondblclick = e => { if ((e.target as HTMLElement).closest('.td-opt')) doChoose(); };
  list.onkeydown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); select(sel < 0 ? 0 : Math.max(0, Math.min(opts.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)))); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(e.key === 'Home' ? 0 : opts.length - 1); }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); doChoose(); }
  };
  q.oninput = () => { drawList(); setPreview(); app.classList.toggle('dockempty', emptyNow()); };
  q.onkeydown = e => { if (e.key === 'ArrowDown') { e.preventDefault(); select(sel < 0 ? 0 : sel + 1); list.focus({ preventScroll: true }); } };
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
  store.subscribe(k => { if (k === 'load' && isOpen) { clearPreview(); show(false); host.abandoned?.(); const f = onClose; onClose = undefined; f?.(); } });
  dock.addEventListener('keydown', e => { if (e.key === 'Escape' && mode === 'change' && isOpen) { e.preventDefault(); close(); } });
  return {
    /** Open the picker: 'start' = the empty Sandbox room (no way out without a tank), 'change' = swap the tank in the editor. */
    open(m: DockMode, done?: () => void) {
      mode = m; onClose = done; kind = tankKind(store.tank); q.value = ''; sel = -1;
      tankView.empty = m === 'start'; viewer.setPreview(m === 'start' ? emptyRoomView(store.tank) : null);
      drawList(); toStep('pick'); show(true); setTimeout(() => q.focus({ preventScroll: true }), 150); // after a modal dialog behind it has closed
    },
    close,
    get isOpen() { return isOpen; },
  };
}
export type TankDock = ReturnType<typeof attachTankDock>;
