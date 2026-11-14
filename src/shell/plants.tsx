// UI2 shell step 7 (lane S7, 2026-11-14): the Plants section: the library greyed by light with P3's one-line reason, placed plants, and
// growth over time (the Time preview, with its keep / undo question). Components only draw logic/plants.ts.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { canPrebuild, plantWarm, prebuildHooks, prebuildPlants } from '../render/items';
import { placedView } from './logic/scape';
import { plantLibrary, setPlantsGate, growthView, createGrowth, type Growth } from './logic/plants';
import { Library, Placed, PieceEditor, Search, SliderRow, sealer } from './scape';
import { addPiece } from './logic/scape';
import { Group } from './ui';

export function PlantsSection({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  sealer.store = store;
  const S = store.tank;
  const [q, setQ] = useState('');
  const [, setN] = useState(0);
  const [open, setOpen] = useState({ growth: true });
  const grow = useRef<Growth | null>(null);
  if (!grow.current) grow.current = createGrowth(store, () => setN(n => n + 1), { warm: plantWarm, worker: canPrebuild, prebuild: prebuildPlants });
  const g = grow.current;
  useEffect(() => () => g.dispose(), []);
  // build every plant's full growth ahead (in a worker) while this section is open, so Time moves smoothly
  useEffect(() => {
    const v = getViewer(); if (v) prebuildHooks.renderer = v.renderer;
    let t = 0; const soon = () => { clearTimeout(t); t = window.setTimeout(() => prebuildPlants(store.scene.tanks), 300); };
    soon(); const off = store.subscribe(kind => { if (kind !== 'select') soon(); });
    return () => { clearTimeout(t); off(); };
  }, [store]);

  const lib = plantLibrary(S, q), gv = growthView(S, g.state);
  const placed = placedView(S, 'plants', null, new Set());
  const gate = lib.gate;

  return (
    <div class="plants">
      <PieceEditor store={store} sec="plants" />
      <Placed store={store} sec="plants" pv={placed} onPick={id => store.selectItem(id)} />

      <Group title="Growth over time" sum={gv.plants ? `${gv.timeText} · ${gv.over} of ${gv.plants} overgrown` : 'no plants'} open={open.growth} onToggle={() => setOpen({ growth: !open.growth })}>
        <SliderRow label="Time" title="Grow the whole tank, from now or from planting. No days or weeks: how fast plants really grow depends on light, CO2 and ferts. Each plant grows at its own speed."
          min={0} max={100} value={gv.time} text={gv.timeText} disabled={!gv.plants} onInput={v => g.move(v)} onDone={() => g.release()} />
        <div class="row"><span class="lbl">Feeding</span>
          <select class="select" aria-label="Feeding" value={gv.feed} disabled={!gv.plants} onChange={e => g.setFeed((e.target as HTMLSelectElement).value as never)}>{gv.feeds.map(f => <option value={f.id}>{f.label}</option>)}</select><span /></div>
        <div class="row"><span class="lbl">Grow from</span>
          <div class="seg" role="group" aria-label="Grow from">
            <button type="button" class={gv.mode === 'rel' ? 'on' : ''} disabled={!gv.plants} title="Time 0 is the tank as it is now" onClick={() => g.setMode('rel')}>Now</button>
            <button type="button" class={gv.mode === 'abs' ? 'on' : ''} disabled={!gv.plants} title="Time 0 is every plant just planted" onClick={() => g.setMode('abs')}>Planting</button>
          </div><span /></div>
        <div class="hint" role="status">{gv.hint}</div>
        {gv.ask ? (
          <div class="growask card" role="group" aria-label="Keep this growth?">
            <div>Keep these plants at this growth?</div>
            <div class="btns"><button type="button" class="btn sm" onClick={() => g.keep()}>Keep</button><button type="button" class="btn sm" onClick={() => g.undo()}>Undo</button></div>
          </div>
        ) : null}
      </Group>

      <div class="cap">Add plants</div>
      <Search q={q} onQ={setQ} placeholder="Search plants" />
      <button type="button" class="tglrow" role="switch" aria-checked={gate.on} onClick={() => setPlantsGate(store, !gate.on)}>
        <span class={`toggle${gate.on ? ' on' : ''}`} />Show only plants that suit the tank{lib.greyed ? <span class="hint"> · {lib.greyed} greyed</span> : null}
      </button>
      {gate.on ? <div class="hint">{gate.hint} <span class="dim">{gate.careLine}.</span></div> : <div class="hint">Greyed plants do not suit the tank's light and care, each with its reason. They can still be added.</div>}
      <Library lib={lib} onAdd={id => addPiece(store, id)} />
    </div>
  );
}
