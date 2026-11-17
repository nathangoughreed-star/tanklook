// UI2 shell step 7 (lane S7, 2026-11-14): the Scape section's parts (WS2 2026-11-16: the section itself is now the Scape workspace, shell/scapeWs.tsx; this file keeps its shared pieces) (Substrate, Terrain, Hardscape and Decor library, placed pieces, the piece
// editor with Keep) and the brush / group bars over the view. Components only draw logic/scape.ts and call its edits.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { supportLift } from '../interact/pointer';
import {
  terrainView, placedView, pieceView, brushView, groupBarView, scapeSec, type ScapeSec, type LibraryView, type PlacedView,
  setBlendGrain, setBlendColor, setBlendShare, setBlendMix, addBlendGrain, removeBlendGrain, setTerrainOn, setTerrainCols, flattenTerrain,
  removePool, setPoolField, removePiece, duplicatePiece, clearPieces, toggleKeep, reshapePiece, dropPiece, nudgePiece, setField,
  brushOn, pickBrush, groupTurn, groupSizeBy, groupDelete, groupDuplicate, GRAINS, KEEP_PROPS,
} from './logic/scape';
import { Icon } from './ui';
import { MAX_GRAINS } from '../scene/blend';

/** Pieces can be picked and dragged in the view only while their section is open (as the old shell: its menu open). Boot's attachPointer reads this. */
export const pickItems: { sec: ScapeSec | null } = { sec: null };

/** A slider drag is one undo step: its edits coalesce until the drag ends (change), which seals. The open section sets the store. */
export const sealer: { store: Store | null } = { store: null };
const val = (e: Event) => (e.target as HTMLInputElement).value;

/** A labelled slider row with its readout. */
export function SliderRow({ label, title, min, max, step = 1, value, text, onInput, onDone, disabled }: { label: string; title?: string; min: number; max: number; step?: number; value: number; text: string; onInput: (v: number) => void; onDone?: () => void; disabled?: boolean }) {
  return (
    <div class="row" title={title}><span class="lbl">{label}</span>
      <input class="slider" type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} onInput={e => onInput(+val(e))} onChange={() => { onDone?.(); sealer.store?.seal(); }} />
      <span class="val">{text}</span></div>
  );
}

/** One library: a search box is the caller's; chips add a piece, a greyed chip says why on its own line and can still be added. */
export function Library({ lib, onAdd, onDrag }: { lib: LibraryView; onAdd: (id: string) => void; onDrag?: (e: PointerEvent, id: string) => void }) {
  return (
    <div class="lib">
      {lib.none ? <div class="hint">{lib.none}</div> : null}
      {lib.rows.map(r => (
        <div class="libRow"><div class="cap">{r.label} <span class="n">{r.chips.length}</span></div>
          <div class="chips">{r.chips.filter(c => !c.why).map(c => <button type="button" class="chip" title={`Add: ${c.hint}${onDrag ? ' (or drag it into the tank)' : ''}`} onClick={() => onAdd(c.id)} onPointerDown={e => onDrag?.(e, c.id)}>{c.label}</button>)}</div>
          {r.chips.some(c => c.why) ? (
            <div class="gatedList">{r.chips.filter(c => c.why).map(c => (
              <div class="gatedRow"><button type="button" class="chip gated" title={`Add anyway: ${c.hint}`} onClick={() => onAdd(c.id)} onPointerDown={e => onDrag?.(e, c.id)}>{c.label}</button><span class="why warn">{c.why}</span></div>
            ))}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** The placed pieces of one menu: a row per piece (a group row when a species has several), select / remove, Keep, and the piece editor under the open row. */
export function Placed({ store, sec, pv, onPick }: { store: Store; sec: ScapeSec; pv: PlacedView; onPick: (id: number | null) => void }) {
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => { if (!armed) return; const t = window.setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  const list = placedView(store.tank, sec, store.selectedItem && scapeSec(store.selectedItem.kind) === sec ? store.selectedItem.id : null, open);
  void pv;
  const toggle = (v: string) => { const n = new Set(open); if (n.has(v)) { n.delete(v); const s = store.selectedItem; if (s?.variant === v) store.selectItem(null); } else n.add(v); setOpen(n); };
  const row = (r: PlacedView['groups'][number]['rows'][number]) => (
    <div class={`pr${r.selected ? ' open' : ''}`} data-id={r.id}>
      <button type="button" class="pn" aria-expanded={r.selected} title={r.selected ? 'Close its settings' : 'Select it and open its settings'} onClick={() => onPick(r.selected ? null : r.id)}>
        <span class="car">{r.selected ? '▾' : '▸'}</span><span class="nm">{r.name}</span>{r.kept ? <Icon name="lock" /> : null}<span class="gw">{r.note}</span></button>
      <button type="button" class="btn icon sm ghost" aria-label={`Remove ${r.name}`} title="Take it out" onClick={() => removePiece(store, r.id)}><Icon name="x" /></button>
    </div>
  );
  return (
    <div class="placed">
      <div class="cap">Placed {list.total ? <span class="n">{list.count}</span> : null}</div>
      {list.total ? null : <div class="hint">{list.empty}</div>}
      {list.groups.map(g => g.rows.length === 1 ? row(g.rows[0]) : (
        <div class={`pg${g.open ? ' open' : ''}`}>
          <button type="button" class="pn" aria-expanded={g.open} onClick={() => toggle(g.variant)}><span class="car">{g.open ? '▾' : '▸'}</span><span class="nm">{g.name}</span><span class="gw">×{g.rows.length}</span></button>
          {g.open ? <div class="prs">{g.rows.map(row)}</div> : null}
        </div>
      ))}
      {list.total ? <button type="button" class={`btn sm${armed ? ' on' : ''}`} onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); clearPieces(store, sec); }}>{armed ? 'Sure? Click again' : 'Remove all'}</button> : null}
    </div>
  );
}

/** The selected piece's settings (the old item box), with Keep. Shown at the top of its section while a piece of that section is selected. */
export function PieceEditor({ store, sec }: { store: Store; sec: ScapeSec }) {
  const it = store.selectedItem;
  if (!it || scapeSec(it.kind) !== sec) return null;
  const v = pieceView(store.tank, it, store.scene.units), id = it.id;
  const hold = useRef<{ t: number; again: number }>({ t: 0, again: 0 });
  const stop = () => { clearTimeout(hold.current.t); clearTimeout(hold.current.again); };
  useEffect(() => stop, []);
  const press = (axis: 'x' | 'y' | 'd', dir: number, shift: boolean) => {
    const step = shift ? 1 : 5; nudgePiece(store, id, axis, dir, step);
    const again = (wait: number) => { hold.current.again = window.setTimeout(() => { nudgePiece(store, id, axis, dir, step); again(60); }, wait); };
    again(350);
  };
  const N = ({ axis, dir, label, title }: { axis: 'x' | 'y' | 'd'; dir: number; label: string; title: string }) => (
    <button type="button" class="btn sm" title={title} onPointerDown={e => press(axis, dir, e.shiftKey)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>{label}</button>
  );
  return (
    <div class="card pieced" aria-label="Selected piece">
      <div class="t">{v.name} <span class="m">{v.dims}</span></div>
      {v.light ? <div class={`hint${/fine/.test(v.light) ? '' : ' warnline'}`}>{v.light}</div> : null}
      {v.fields.map(f => <SliderRow label={f.label} title={f.title} min={f.min} max={f.max} step={f.step} value={f.value} text={f.text} onInput={n => setField(store, id, f.id, n)} />)}
      {v.nudge ? (
        <div class="nudge" title="Free placement: step the piece (hold Shift for 1 in steps)">
          <N axis="x" dir={-1} label="←" title="Move left" /><N axis="x" dir={1} label="→" title="Move right" />
          <N axis="d" dir={-1} label="Front" title="Toward the front glass" /><N axis="d" dir={1} label="Back" title="Toward the back wall" />
          <N axis="y" dir={1} label="Up" title="Raise it" /><N axis="y" dir={-1} label="Down" title="Lower it" />
        </div>
      ) : null}
      <div class="btns">
        <button type="button" class={`btn sm${v.kept ? ' on' : ''}`} aria-pressed={v.kept} title={v.kept ? 'Kept: Discover will not change it. Press to release.' : `Keep this: Discover will not change what it is (${KEEP_PROPS.join(', ')}); it may still move.`}
          onClick={() => toggleKeep(store, id)}><Icon name="lock" /> {v.kept ? 'Kept' : 'Keep'}</button>
        <button type="button" class="btn sm" title="A new random look" onClick={() => reshapePiece(store, id)}>Reshape</button>
        <button type="button" class="btn sm" title="Set it down on the ground" onClick={() => dropPiece(store, id)}>Drop</button>
        <button type="button" class="btn sm" title="A copy beside it, turned" onClick={() => duplicatePiece(store, id)}>Duplicate</button>
        <button type="button" class="btn sm danger" onClick={() => removePiece(store, id)}>Delete</button>
      </div>
    </div>
  );
}

export function Search({ q, onQ, placeholder }: { q: string; onQ: (q: string) => void; placeholder: string }) {
  return <label class="search"><Icon name="search" /><input class="input" type="search" placeholder={placeholder} value={q} aria-label={placeholder} onInput={e => onQ(val(e))} /></label>;
}

export const Select = ({ value, onChange, children, label, disabled }: { value: string; onChange: (v: string) => void; children: ComponentChildren; label: string; disabled?: boolean }) => (
  <select class="select" value={value} aria-label={label} disabled={disabled} onChange={e => onChange(val(e))}>{children}</select>
);

/** Custom terrain: an either/or switch. Off: the slopes / typed depths (passed in as `slopes`). On: the grid of heights and point editing, and nothing else.
 *  Pools are no longer added here (sculpt the ground and lower the water instead); pools already saved still draw, and can be tuned or removed below. */
export function TerrainBlock({ store, getViewer, slopes }: { store: Store; getViewer: () => Viewer | undefined; slopes?: ComponentChildren }) {
  const S = store.tank;
  const [pool, setPool] = useState(0);
  const [, setN] = useState(0);
  const tv = terrainView(S, pool), edit = !!getViewer()?.terrainEdit.on;
  const terrainEdit = (on: boolean, k = pool) => { const v = getViewer(); if (!v) return; v.terrainEdit.on = on; v.terrainEdit.pool = k; v.rebuild(); setN(n => n + 1); };
  // leaving ends the point editing, as closing the old menu does
  useEffect(() => () => { const v = getViewer(); if (v?.terrainEdit.on) { v.terrainEdit.on = false; v.rebuild(); } }, []);
  return (
    <>
      <button type="button" class="tglrow" role="switch" aria-checked={tv.on} onClick={() => { const on = !tv.on; const v = getViewer(); if (v) { v.terrainEdit.on = on; } setTerrainOn(store, on); v?.rebuild(); setN(n => n + 1); }}>
        <span class={`toggle${tv.on ? ' on' : ''}`} />Custom terrain</button>
      <div class="hint">{tv.on ? 'A grid of heights you shape by dragging its points in the tank. Lower the water to make pools.' : 'Off: set the depth at each corner or pick a slope. Turn on for a grid of heights you shape in the tank.'}</div>
      {!tv.on ? slopes : (<>
        <SliderRow label="Grid" title="More points shape finer detail" min={3} max={25} value={tv.cols} text={tv.colsText} onInput={v => setTerrainCols(store, v)} />
        <div class="btns">
          <button type="button" class={`btn sm${edit ? ' on' : ''}`} aria-pressed={edit} onClick={() => terrainEdit(!edit)}>{edit ? 'Done editing' : 'Edit points'}</button>
          <button type="button" class="btn sm" title="Level the ground at its average height" onClick={() => flattenTerrain(store)}>Flatten</button>
        </div>
        {tv.pools ? <>
          <div class="row"><span class="lbl">Pool</span>
            <Select label="Pool" value={String(tv.pool)} onChange={v => { setPool(+v); if (edit) terrainEdit(true, +v); }}>{Array.from({ length: tv.pools }, (_, i) => <option value={String(i)}>{`Pool ${i + 1}`}</option>)}</Select><span /></div>
          {tv.poolFields.map(f => <SliderRow label={f.label} min={f.min} max={f.max} value={f.value} text={f.text} onInput={v => setPoolField(store, tv.pool, f.key, v)} />)}
          <div class="btns"><button type="button" class="btn sm danger" onClick={() => { removePool(store, tv.pool); setPool(Math.max(0, tv.pool - 1)); }}>Remove pool</button></div>
        </> : null}
      </>)}
    </>
  );
}

/** The scatter brush picker (the strip over the tank has size and density). */
export function BrushBlock({ store }: { store: Store }) {
  const bv = brushView(store, store.scene.units);
  return (
    <>
      <div class="hint">Paint litter, pebbles, moss, twigs and carpet plants onto the ground or a piece. The strip over the tank has the size and density.</div>
      <div class="row"><span class="lbl">Brush</span>
        <Select label="Brush" value={bv.id} onChange={v => { pickBrush(store, v); }}>{bv.groups.map(g => <optgroup label={g.label}>{g.options.map(o => <option value={o.id}>{o.label}</option>)}</optgroup>)}</Select><span /></div>
      <button type="button" class={`btn sm${bv.on ? ' on' : ''}`} aria-pressed={bv.on} onClick={() => brushOn(store, !bv.on)}>{bv.on ? 'Brush on: Done' : 'Paint with it'}</button>
    </>
  );
}

export function Blend({ store }: { store: Store }) {
  const c = store.tank.substrate.custom, n = c.grains.length;
  return (
    <div class="blend">
      {c.grains.map((g, i) => (
        <div class="blendgrain" key={i}>
          <div class="row"><span class="lbl">{n === 1 ? 'Grain' : `Grain ${i + 1}`}</span>
            <Select label={`Grain ${i + 1}`} value={g.grain} onChange={v => setBlendGrain(store, i, v)}>{GRAINS.map(o => <option value={o.id}>{o.label}</option>)}</Select>
            <input type="color" class="colorbox" value={g.color} aria-label={`Grain ${i + 1} colour`} onInput={e => setBlendColor(store, i, val(e))} /></div>
          {n > 1 ? <>
            <SliderRow label="Share" title={`Grain ${i + 1}: the others adjust to fill 100 %`} min={0} max={100} value={g.share} text={`${g.share}%`} onInput={v => setBlendShare(store, i, v)} />
            <button type="button" class="btn sm" aria-label={`Remove grain ${i + 1}`} title="Remove this grain" onClick={() => removeBlendGrain(store, i)}>Remove</button>
          </> : null}
        </div>
      ))}
      {n < MAX_GRAINS ? <button type="button" class="btn sm" onClick={() => addBlendGrain(store)}>Add grain</button> : <div class="hint">Five grains is the most.</div>}
      {n > 1 ? <SliderRow label="Mixed" min={0} max={100} value={Math.round(c.mix * 100)} text={`${Math.round(c.mix * 100)}%`} onInput={v => setBlendMix(store, v)} /> : null}
    </div>
  );
}

/** The strips over the view: the brush bar (Paint / Erase, size, density, Done) while a brush is on, and the group bar for a selection of two or more. */
export function ScapeBars({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  const bv = brushView(store, store.scene.units), gv = groupBarView(store.group);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);
  if (!(bv.on && bv.target == null) && !gv.show && !msg) return null;
  const dup = () => {
    const vp = getViewer()?.vps[store.scene.active];
    const r = groupDuplicate(store, vp ? (t, x, d, skip) => supportLift(vp, t, x, d, skip) : undefined);
    setMsg('why' in r ? r.why : 'Copy made. Ctrl+Z takes it back.');
  };
  return (
    <div class="ov scapebars">
      {bv.on && bv.target == null ? (
        <div class="bar2 glass" role="toolbar" aria-label="Brush">
          <b>{bv.label}</b>
          <div class="seg" role="group" aria-label="Paint or erase">
            <button type="button" class={!bv.erase && !bv.single ? 'on' : ''} onClick={() => store.setBrush({ erase: false, single: false })}>Paint</button>
            <button type="button" class={bv.single ? 'on' : ''} title="One thing per click" onClick={() => store.setBrush({ single: !bv.single, erase: false })}>One</button>
            <button type="button" class={bv.erase ? 'on' : ''} onClick={() => store.setBrush({ erase: true })}>Erase</button>
          </div>
          {bv.single && !bv.erase ? null : <label class="mini">Size <input class="slider" type="range" min={bv.sizeMin} max={bv.sizeMax} value={bv.size} onInput={e => store.setBrush({ size: +val(e) })} /> {bv.sizeText}</label>}
          {bv.erase || bv.single ? null : <label class="mini">Density <input class="slider" type="range" min={5} max={100} value={bv.density} onInput={e => store.setBrush({ density: +val(e) })} /> {bv.densityText}</label>}
          <button type="button" class="btn sm" onClick={() => brushOn(store, false)}>Done</button>
        </div>
      ) : null}
      {gv.show ? (
        <div class="bar2 glass" role="toolbar" aria-label="Selection group">
          <b>{gv.text}</b>
          <button type="button" class="btn sm" title="Another one beside each (Ctrl+D)" onClick={dup}>Duplicate</button>
          <button type="button" class="btn sm" title="Turn 15 degrees (Shift+R the other way)" onClick={() => groupTurn(store, 15)}>Turn</button>
          <button type="button" class="btn sm" title="10 % smaller (-)" onClick={() => groupSizeBy(store, 1 / 1.1)}>Smaller</button>
          <button type="button" class="btn sm" title="10 % bigger (+)" onClick={() => groupSizeBy(store, 1.1)}>Bigger</button>
          <button type="button" class="btn sm danger" onClick={() => groupDelete(store)}>Delete</button>
          <button type="button" class="btn sm ghost" onClick={() => store.select(null)}>Clear</button>
        </div>
      ) : null}
      {msg ? <div class="bar2 glass" role="status">{msg}</div> : null}
    </div>
  );
}
