// UI2 shell step 6 (lane S6): the Lighting group of the Light category (what is on the tank, PAR) and the Light map (starts closed).
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { lightView, mapView, setMapOn, setMapUnit, setMapStep, setMapSlice } from './logic/lighting';
import { Group } from './ui';

export function LightingGroup({ store }: { store: Store }) {
  const [open, setOpen] = useState(false), S = store.tank, lv = lightView(S), mv = mapView(S);
  return (
    <Group title="Light map" sum={mv.on ? 'on' : 'off'} open={open} onToggle={() => setOpen(!open)}>
      <div class="catnote"><b>{lv.name}.</b> {lv.parText}</div>
      {lv.inHood ? <div class="hint">The hood holds its own lamps: pick a light product above to put the hood away.</div> : null}
      <button type="button" class="tglrow" role="switch" aria-checked={mv.on} disabled={!mv.canShow} onClick={() => store.edit(s => setMapOn(s, !mv.on))}>
        <span class={`toggle${mv.on ? ' on' : ''}`} />Show the light map on the tank
      </button>
      {mv.whyNot ? <div class="hint">{mv.whyNot}</div> : null}
      <div class="lightmap">
        <div class="row"><span class="lbl">Map shows</span>
          <div class="seg" role="group" aria-label="Map unit">{(['par', 'lux'] as const).map(u => <button type="button" class={mv.unit === u ? 'on' : ''} aria-pressed={mv.unit === u} onClick={() => store.edit(s => setMapUnit(s, u))}>{u === 'par' ? 'PAR' : 'Lux'}</button>)}</div><span /></div>
        <div class="row"><span class="lbl">Contour every</span>
          <input class="slider" type="range" min={mv.stepMin} max={mv.stepMax} step={mv.stepStep} value={mv.step} aria-label="Contour spacing" onInput={e => store.edit(s => setMapStep(s, +(e.target as HTMLInputElement).value), { coalesce: 'lStep' })} />
          <span class="val">{mv.step} {mv.stepUnit}</span></div>
        <div class="row"><span class="lbl">Layer height</span>
          <input class="slider" type="range" min={0} max={600} step={5} value={mv.slice} aria-label="Layer height" onInput={e => store.edit(s => setMapSlice(s, +(e.target as HTMLInputElement).value), { coalesce: 'lSlice' })} />
          <span class="val">{mv.slice ? `${mv.slice} mm` : 'floor'}</span></div>
      </div>
      <div class="hint">{mv.note}</div>
    </Group>
  );
}
