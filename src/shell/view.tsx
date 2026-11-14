// UI2 shell step 8 (lane S8, 2026-11-13): the viewer cluster's View popover and Another moment (screen map §2a). Draws logic/view.ts; the viewer
// itself is the unchanged render/viewer.ts. Compare comes in step 9 (its button is left out).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { setGearShown, gearShown } from '../render/gear3d';
import { Icon } from './ui';
import { Toggle } from './tank';
import {
  CAM_PRESETS, CAM_SLIDERS, SHOWS, PNG_SIZES, camReadout, presetNow, presetOf, loadHidden, saveHidden, loadMap, saveMap, pngName, pngTitle, anotherMoment, KEYS,
  type ShowId,
} from './logic/view';

const MAP_EVENT = 'ui2:viewmap';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Called once by boot.tsx after the viewer exists: the saved Show / display choices, and the viewpoint map's elements the viewer looks for. */
export function applyViewPrefs(viewer: Viewer, host: HTMLElement) {
  for (const k of loadHidden()) viewer.hidden.add(k);
  try { viewer.hideOverhead = localStorage.getItem(KEYS.hideLight) === 'on'; } catch { /* default */ }
  // the viewer draws the map into #vmap0 / #vmap1 and reads #mapOn (render/viewer.ts): an unseen switch, driven by View > Viewpoint map (off by default)
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'mapOn'; cb.hidden = true; cb.checked = loadMap();
  host.append(cb);
  for (const k of [0, 1]) {
    const box = document.createElement('div'); box.className = 'vmap'; box.id = `vmap${k}`;
    const cv = document.createElement('canvas'); cv.setAttribute('aria-label', k ? 'Viewpoint map for Tank B' : 'Viewpoint map: where the eye is relative to the tank');
    const x = document.createElement('button'); x.type = 'button'; x.className = 'vmapHide'; x.title = 'Hide the viewpoint map'; x.setAttribute('aria-label', 'Hide the viewpoint map'); x.textContent = '×';
    x.onclick = () => { cb.checked = false; saveMap(false); viewer.invalidate(); dispatchEvent(new Event(MAP_EVENT)); };
    box.append(cv, x); host.append(box);
  }
  addEventListener(MAP_EVENT, () => viewer.invalidate());
  viewer.invalidate();
}

export function ViewCluster({ store, getViewer, phone }: { store: Store; getViewer: () => Viewer | undefined; phone: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [, bump] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const v = getViewer(), cam = store.tank.camera, u = store.scene.units;
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); e.stopPropagation(); } };
    addEventListener('pointerdown', away); addEventListener('keydown', key, true);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', key, true); };
  }, [open]);
  useEffect(() => { const f = () => bump(n => n + 1); addEventListener(MAP_EVENT, f); return () => removeEventListener(MAP_EVENT, f); }, []);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(''), 3500); return () => clearTimeout(t); }, [note]);

  const shown = (id: ShowId) => id === 'gear' ? gearShown() : !v?.hidden.has(id);
  const setShow = (id: ShowId, on: boolean) => {
    if (id === 'gear') setGearShown(on);
    else if (v) { if (on) v.hidden.delete(id); else v.hidden.add(id); saveHidden(v.hidden); }
    v?.invalidate(); bump(n => n + 1);
  };
  const mapOn = () => (document.getElementById('mapOn') as HTMLInputElement | null)?.checked ?? false;
  const setMap = (on: boolean) => { const cb = document.getElementById('mapOn') as HTMLInputElement | null; if (cb) cb.checked = on; saveMap(on); v?.invalidate(); bump(n => n + 1); };
  const sheetOf = (k: keyof typeof cam, val: number) => store.cam(c => { (c as unknown as Record<string, number>)[k] = val; });
  const on = presetNow(cam);
  const png = async (m: number) => { try { download(await v!.exportPNG(m), pngName(store.scene.name, m)); } catch (e) { setNote((e as Error).message); } };
  const moment = () => { if (anotherMoment(store)) setNote('Another moment in the tank. Ctrl+Z brings the last one back.'); };
  const px = (m: number) => { const h = v?.host; return h ? pngTitle(h.clientWidth, h.clientHeight, devicePixelRatio || 1, m) : ''; };

  return (
    <div class="ov cluster" ref={wrap}>
      <div class="toolbar glass">
        <button type="button" class={`btn sm${open ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={open} title="Camera, what is shown, viewpoint map, export a picture" onClick={() => setOpen(!open)}><Icon name="eye" /> View{phone ? '' : ' ▾'}</button>
        <button type="button" class="btn sm" disabled={!store.tank.fish.length} title={store.tank.fish.length ? 'Every animal in a new spot, as if the tank were photographed a little later. Plants and scape stay.' : 'Add an animal first'} onClick={moment}><Icon name="shuffle" /> {phone ? 'Moment' : 'Another moment'}</button>
      </div>
      {note ? <div class="viewnote glass" role="status">{note}</div> : null}
      {open ? (
        <div class="pop viewpop" role="dialog" aria-label="View">
          <div class="vsec"><h3>Camera</h3>
            <div class="chips">{CAM_PRESETS.map(p => <button type="button" class={`btn sm chip${on === p.id ? ' on' : ''}`} aria-pressed={on === p.id} onClick={() => store.cam(c => Object.assign(c, presetOf(p.id)!.cam))}>{p.label}</button>)}
              <button type="button" class="btn sm chip" title="Re-centre the panned view (Home)" onClick={() => v?.resetPan()}>⌖ Re-centre</button></div>
            {CAM_SLIDERS.map(s => (
              <div class="row"><span class="lbl">{s.label}</span>
                <input class="slider" type="range" min={s.min} max={s.max} step={s.step} value={cam[s.key]} aria-label={s.label} onInput={e => sheetOf(s.key, +(e.target as HTMLInputElement).value)} onChange={() => store.seal()} />
                <span class="val">{camReadout(s.key, cam[s.key], u)}</span></div>))}
          </div>
          <div class="vsec"><h3>Show</h3>
            {SHOWS.map(s => <span title={s.title}><Toggle on={shown(s.id)} label={s.label} onFlip={on2 => setShow(s.id, on2)} /></span>)}
            <div class="hint">What the view shows; PNG exports follow it. Something hidden cannot be picked.</div>
          </div>
          <div class="vsec"><h3>Viewpoint map</h3>
            <Toggle on={mapOn()} label="Top view of where you stand" onFlip={setMap} />
          </div>
          <div class="vsec"><h3>Export PNG</h3>
            <div class="chips">{PNG_SIZES.map(m => <button type="button" class="btn sm chip" title={px(m)} onClick={() => png(m)}>{m}×</button>)}</div>
            <div class="hint">1× is the view's size on screen.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
