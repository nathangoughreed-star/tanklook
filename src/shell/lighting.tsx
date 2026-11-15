// UI2 shell step 6 (lane S6): the Lighting group of the Light category (what is on the tank, PAR) and the Light map (starts closed).
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { lightView, mapView, setMapOn, setMapUnit, setMapStep, setMapSlice } from './logic/lighting';
import { Group } from './ui';
import { MAP_DIV } from '../render/lighting';
import { parGuideHtml } from '../ui/parGuide';

/** The colour ramp under the map toggle: a label at each doubling, as the old Light map key had (PG1). */
const RAMP = 'linear-gradient(90deg,#0d0d40 0%,#1a40d9 14.3%,#00b3e6 28.6%,#26cc40 42.9%,#f2e61a 57.1%,#ff8c0d 71.4%,#e61a1a 85.7%,#ffe6e6 100%)';
const TICKS: Record<'par' | 'lux', [number, string][]> = {
  par: [[5, '5'], [10, '10'], [20, '20'], [40, '40'], [80, '80'], [160, '160'], [320, '320']],
  lux: [[250, '250'], [1000, '1k'], [4000, '4k'], [16000, '16k']],
};
const BANDS: Record<string, [number, number, string][]> = {
  salt: [[0, 25, 'dim'], [25, 50, 'fish'], [50, 75, 'soft'], [75, 150, 'LPS'], [150, 640, 'SPS']],
  fresh: [[0, 30, 'low'], [30, 50, 'med'], [50, 80, 'high'], [80, 640, 'very high']],
};
function MapKey({ unit, salt }: { unit: 'par' | 'lux'; salt: boolean }) {
  const at = (v: number) => Math.log2(v / MAP_DIV[unit]) / 7 * 100, tx = (x: number) => (x <= 0 ? 0 : x >= 100 ? -100 : -50);
  return (
    <div class="mapkey">
      <div class="ramp" style={{ background: RAMP }} />
      <div class="ticks">{TICKS[unit].map(([v, t]) => <span style={{ left: `${at(v)}%`, transform: `translateX(${tx(at(v))}%)` }}>{t}</span>)}</div>
      {unit === 'par' ? <div class="bands">{BANDS[salt ? 'salt' : 'fresh'].map(([a, b, t]) => { const x0 = a ? Math.max(at(a), 0) : 0, x1 = Math.min(at(b), 100); return <span style={{ left: `${x0}%`, width: `${x1 - x0}%` }}>{t}</span>; })}</div> : null}
    </div>
  );
}

export function LightingGroup({ store }: { store: Store }) {
  const [open, setOpen] = useState(false), [guide, setGuide] = useState(false), S = store.tank, lv = lightView(S), mv = mapView(S), salt = S.water.on && !!S.water.salt;
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
      <MapKey unit={mv.unit} salt={salt} />
      <button type="button" class="linkbtn parcue" aria-expanded={guide} onClick={() => setGuide(!guide)}>{guide ? '▾' : '▸'} PAR guide: what {salt ? 'corals' : 'plants'} need</button>
      {guide ? <div class="parguide" dangerouslySetInnerHTML={{ __html: parGuideHtml(salt) }} /> : null}
    </Group>
  );
}
