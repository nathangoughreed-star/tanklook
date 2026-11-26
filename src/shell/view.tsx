// UI2 shell step 8 (lane S8, 2026-11-13): the viewer cluster's View popover and Another moment (screen map §2a). Draws logic/view.ts; the viewer
// itself is the unchanged render/viewer.ts. Compare comes in step 9 (its button is left out).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { SWIM_EVENT, type Viewer } from '../render/viewer';
import { setGearShown, gearShown } from '../render/gear3d';
import { Icon } from './ui';
import { Toggle, LenRow, Seg } from './tank';
import type { TankSetup } from '../scene/types';
import { LIMITS } from '../scene/validate';
import { CEILING_MAX, CEILING_MIN, ceilingH } from '../scene/physics';
import { roomSummary, heightText, conditionWord, CONDITION_STOPS, setCondition, type Units } from './logic/tank';
import { chooseFs, useFsItems } from './fullscreen';
import {
  CAM_PRESETS, CAM_SLIDERS, SHOWS, PNG_SIZES, camReadout, roomRead, roomByHand, roomAuto, ROOM_MAX, ROOM_HINT, presetNow, presetOf, loadHidden, saveHidden, loadMap, saveMap, pngName, pngTitle, anotherMoment, KEYS,
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


const ROOM_OPEN_KEY = 'tanklook.ui2.viewRoomOpen';
const loadRoomOpen = () => { try { return localStorage.getItem(ROOM_OPEN_KEY) === 'on'; } catch { return false; } };

/** VM1 (2026-11-17): the room around the tank (wall, ceiling, wall colour, you for scale) lives in View, folded to a one-line summary; it was the Tank section's Room group. Same edits as before. */
function RoomGroup({ store }: { store: Store }) {
  const S: TankSetup = store.tank, u: Units = store.scene.units;
  const [open, setOpen] = useState(loadRoomOpen);
  const flip = () => { const n = !open; setOpen(n); try { localStorage.setItem(ROOM_OPEN_KEY, n ? 'on' : 'off'); } catch { /* blocked storage: forget */ } };
  const wallSide = (side: TankSetup['wall']['side']) => store.edit(s => {
    const was = s.wall.show ? s.wall.side : 'back', b = s.render.bgSides, bgOf = (w: typeof side) => (w === 'corner' ? 'back' : w);
    if (b.length === 1 && b[0] === bgOf(was)) s.render.bgSides = [bgOf(side)]; // a background on the old wall side moves with the wall
    s.wall.side = side; s.wall.show = true;
  });
  return (
    <div class="vsec roomgrp"><h3><button type="button" class="roomhead" aria-expanded={open} onClick={flip}><span class="caret">{open ? '▾' : '▸'}</span> Room</button></h3>
      {open ? null : <div class="hint">{roomSummary(S, u)}</div>}
      {open ? <>
        <Toggle on={S.wall.show} label="A wall near the tank" onFlip={on => store.edit(s => { s.wall.show = on; })} />
        {S.wall.show ? <>
          <Seg label="Wall" value={S.wall.side} opts={[['back', 'Behind'], ['left', 'Peninsula (left end)'], ['right', 'Peninsula (right end)'], ['corner', 'Corner']]} onPick={wallSide} />
          <LenRow label="Ceiling" mm={ceilingH(S.wall)} min={CEILING_MIN} max={CEILING_MAX} u={u} step={1} onMm={(mm, done) => store.edit(s => { s.wall.height = mm; }, done ? {} : { coalesce: 'ceilH' })} />
          <div class="row"><span class="lbl">Wall color</span><input type="color" aria-label="Wall color" value={S.wall.color} onInput={e => store.edit(s => { s.wall.color = (e.target as HTMLInputElement).value; }, { coalesce: 'wallColor' })} /><span /></div>
        </> : null}
        <Toggle on={S.person.show} label={<>You, for scale <span class="hint">{heightText(S.person.height, u)}</span></>} onFlip={on => store.edit(s => { s.person.show = on; })} />
        {S.person.show ? <>
          <LenRow label="Your height" mm={S.person.height} min={LIMITS.person[0]} max={LIMITS.person[1]} u={u} onMm={(mm, done) => store.edit(s => { s.person.height = mm; }, done ? {} : { coalesce: 'personH' })} />
          <Seg label="Stand on the" value={S.person.side} opts={[['left', 'Left'], ['right', 'Right']]} onPick={v => store.edit(s => { s.person.side = v; })} />
        </> : null}
      </> : null}
    </div>
  );
}

/** R120: true while the fish are effectively swimming (setting on and not paused for a slow machine); re-renders when it changes */
export function useFishSwimming(getViewer: () => Viewer | undefined): boolean {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump(n => n + 1); addEventListener(SWIM_EVENT, f); return () => removeEventListener(SWIM_EVENT, f); }, []);
  const v = getViewer();
  return !!v && v.swim && !v.swimAuto;
}

export function ViewCluster({ store, getViewer, phone, compare }: { store: Store; getViewer: () => Viewer | undefined; phone: boolean; /** step 9: the Compare / Views linked / End compare buttons (compare.tsx) */ compare?: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [, bump] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const fs = useFsItems();
  const swimming = useFishSwimming(getViewer);
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
  const on = presetNow(cam), room = roomRead(store);
  const png = async (m: number) => { try { download(await v!.exportPNG(m), pngName(store.scene.name, m)); } catch (e) { setNote((e as Error).message); } };
  const moment = () => { if (anotherMoment(store)) setNote('Another moment in the tank. Ctrl+Z brings the last one back.'); };
  const px = (m: number) => { const h = v?.host; return h ? pngTitle(h.clientWidth, h.clientHeight, devicePixelRatio || 1, m) : ''; };

  return (
    <div class="cluster inhead" ref={wrap}>
      <div class="toolbar">
        <button type="button" class={`btn sm${open ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={open} title="Camera, what is shown, viewpoint map, export a picture" onClick={() => setOpen(!open)}><Icon name="eye" /><span class="lb"> View{phone ? '' : ' ▾'}</span></button>
        {phone ? null : <>{compare}
        {swimming ? null : <button type="button" class="btn sm" disabled={!store.tank.fish.length} title={store.tank.fish.length ? 'Every animal in a new spot, as if the tank were photographed a little later. Plants and scape stay.' : 'Add an animal first'} onClick={moment}><Icon name="shuffle" /><span class="lb"> {phone ? 'Moment' : 'Another moment'}</span></button>}</>}
      </div>
      {note ? <div class="viewnote glass" role="status">{note}</div> : null}
      {open ? (
        <div class="pop viewpop" role="dialog" aria-label="View">
          {phone ? <div class="vsec phoneacts" onClick={() => setOpen(false)}><h3>Actions</h3><div class="chips">{compare}
        {swimming ? null : <button type="button" class="btn sm chip" disabled={!store.tank.fish.length} title={store.tank.fish.length ? 'Every animal in a new spot, as if the tank were photographed a little later. Plants and scape stay.' : 'Add an animal first'} onClick={moment}><Icon name="shuffle" /><span class="lb"> {phone ? 'Moment' : 'Another moment'}</span></button>}</div></div> : null}
          <div class="vsec"><h3>Camera</h3>
            <div class="chips">{CAM_PRESETS.map(p => <button type="button" class={`btn sm chip${on === p.id ? ' on' : ''}`} aria-pressed={on === p.id} onClick={() => store.cam(c => Object.assign(c, presetOf(p.id)!.cam))}>{p.label}</button>)}
              <button type="button" class="btn sm chip" title="Re-center the panned view (Home)" onClick={() => v?.resetPan()}>⌖ Re-center</button></div>
            {CAM_SLIDERS.map(s => (
              <div class="row"><span class="lbl">{s.label}</span>
                <input class="slider" type="range" min={s.min} max={s.max} step={s.step} value={cam[s.key]} aria-label={s.label} onInput={e => sheetOf(s.key, +(e.target as HTMLInputElement).value)} onChange={() => store.seal()} />
                <span class="val">{camReadout(s.key, cam[s.key], u)}</span></div>))}
          </div>
          <div class="vsec"><h3>Room light</h3>
            <div class="row"><span class="lbl"><Icon name="sun" /></span>
              <input class="slider" type="range" min={0} max={ROOM_MAX} step={0.01} value={room.value} aria-label="Room light" onInput={e => roomByHand(store, +(e.target as HTMLInputElement).value)} onChange={() => store.seal()} />
              <span class="val">{room.word}</span></div>
            <div class="hint">{room.auto ? ROOM_HINT : <><button type="button" class="btn sm chip" title="Let the room light follow the tank again (bright with no light, dim with one)" onClick={() => roomAuto(store)}>Auto</button> · {ROOM_HINT}</>}</div>
          </div>
          <div class="vsec"><h3>Condition</h3>
            <div class="row"><span class="lbl" title="How long since the tank was cleaned: algae on the glass, rocks, wood and substrate. Only changes the look.">Condition</span>
              <input class="slider" type="range" min={0} max={100} step={1} value={Math.round(store.tank.condition.level * 100)} aria-label="Condition: how long since the tank was cleaned" onInput={e => store.edit(s => setCondition(s, +(e.target as HTMLInputElement).value / 100), { coalesce: 'cond' })} />
              <span class="val" data-testid="cond-word">{conditionWord(store.tank.condition.level)}</span></div>
            <div class="condstops" role="group" aria-label="Condition presets">{CONDITION_STOPS.map(([l, w]) => <button type="button" class={`condstop${conditionWord(store.tank.condition.level) === w ? ' on' : ''}`} aria-pressed={conditionWord(store.tank.condition.level) === w} title={`${w}: algae on the glass and rock`}
              onClick={() => store.edit(s => setCondition(s, l))}><span class="condpic" style={{ '--algae': l } as never} /><small>{w}</small></button>)}</div>
            <div class="hint">The tank weeks after a clean, or neglected: algae on the glass, then on the lit tops of rock and wood. It only changes the look.</div>
          </div>
          <div class="vsec"><h3>Show</h3>
            {SHOWS.map(s => <span title={s.title}><Toggle on={shown(s.id)} label={s.label} onFlip={on2 => setShow(s.id, on2)} /></span>)}
            <div class="hint">What the view shows; PNG exports follow it. Something hidden cannot be picked.</div>
          </div>
          <div class="vsec"><h3>Viewpoint map</h3>
            <Toggle on={mapOn()} label="Top view of where you stand" onFlip={setMap} />
          </div>
          <RoomGroup store={store} />
          <div class="vsec"><h3>Window</h3>
            {fs.items.map(it => <button type="button" class="btn sm fsitem" title={it.hint} onClick={() => { setOpen(false); chooseFs(it.id); }}>{it.label}{it.id === 'full' ? <span class="kbd">F</span> : null}</button>)}
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
