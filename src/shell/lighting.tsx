// UI2 shell step 6 (lane S6): the Lighting group of the Light category (what is on the tank, PAR) and the Light map (starts closed).
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { lightView, mapView, setMapOn, setMapUnit, setMapStep, setMapSlice } from './logic/lighting';
import { Group } from './ui';
import { fmtLen } from '../scene/physics';
import { productName } from '../data/gearCatalog';
import { layoutView, optimizePos, setBulb, setFixture, setHoodLed, setLightField, setMount, setPattern, setTech, type LightKey, type Slider } from '../ui/logic/lightLayout';
import type { Fixture } from '../scene/lightout';
import type { LightTech } from '../scene/types';
import { MAP_DIV } from '../render/lighting';
import { parGuideHtml } from '../ui/parGuide';

/** The color ramp under the map toggle: a label at each doubling, as the old Light map key had (PG1). */
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

/** R87: how the light is laid out (the old Lighting section's fixture rows): count, rows, spacing, beam, hanging height, mount, front-to-back
 *  place with Optimize, power, exposure and color temperature. Each row shows only for the fixtures it applies to; what a catalogue light
 *  or a kit fixes reads as text. Every write is ui/logic/lightLayout.ts, the old panel's own handler. The light map follows live (it reads S.light). */
export function LightLayoutGroup({ store }: { store: Store }) {
  const [open, setOpen] = useState(false), S = store.tank, v = layoutView(S), u = store.scene.units === 'cm' ? 'cm' : 'in', fmt = (mm: number) => fmtLen(mm, u, u === 'in' ? 1 : 0);
  const edit = (k: LightKey, x: number) => store.edit(s => setLightField(s, k, x), { coalesce: `l_${k}` });
  const ro = v.locked;
  const SliderRow = ({ label, k, sl, out, fixed, title }: { label: string; k: LightKey; sl: Slider; out: string; fixed?: boolean; title?: string }) => sl.show ? (
    <div class="row"><span class="lbl" title={title}>{label}</span>
      <input class="slider" type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.value} disabled={ro || fixed || sl.disabled} aria-label={label} onInput={e => edit(k, +(e.target as HTMLInputElement).value)} />
      <span class="val">{out}</span></div>
  ) : null;
  const sum = v.flat ? 'none' : v.product ? productName(v.product) : v.fixtureOptions.find(o => o.id === v.fixture)?.label ?? '';
  const fixedNote = v.locked ? 'This kit comes with its own light, so its fixture is fixed.' : v.product ? `Fixed by the ${productName(v.product)}: its fixture, lamp and power. The rest you can still move.` : '';
  return (
    <Group title="Light layout" sum={sum} open={open} onToggle={() => setOpen(!open)}>
      <div class="lightlayout">
        <div class="row"><span class="lbl">Fixture</span>
          <select class="select" aria-label="Fixture" disabled={ro || !!v.product} value={v.product ? '' : v.fixture} onChange={e => store.edit(s => setFixture(s, (e.target as HTMLSelectElement).value as Fixture))}>
            {v.product ? <option value="">{productName(v.product)}</option> : null}
            {v.fixtureOptions.map(o => <option value={o.id} disabled={o.disabled}>{o.label}</option>)}
          </select><span /></div>
        {!v.flat ? <div class="row"><span class="lbl">Lamp</span>
          <select class="select" aria-label="Lamp" disabled={ro || !!v.product} value={v.tech} onChange={e => store.edit(s => setTech(s, (e.target as HTMLSelectElement).value as LightTech))}>
            {v.techOptions.map(o => <option value={o.id}>{o.label}</option>)}
          </select><span /></div> : null}
        {fixedNote ? <div class="hint">{fixedNote}</div> : null}
        {v.flat ? <div class="hint">No fixture: only the room light. Pick a fixture above, or a light product in Buy.</div> : null}
        {v.pattern.show ? <div class="row"><span class="lbl">Arrangement</span>
          <select class="select" aria-label="Arrangement" disabled={ro || v.fixed.count} value={v.pattern.value} onChange={e => store.edit(s => setPattern(s, (e.target as HTMLSelectElement).value as never))}>
            <option value="grid">Grid</option><option value="tri">Staggered (round tank)</option><option value="fit">Fit the tank outline</option>
          </select><span /></div> : null}
        <SliderRow label={v.count.label} k="count" sl={v.count} fixed={v.fixed.count} out={v.count.total > v.count.value ? `${v.count.value} · ${v.count.total} total` : String(v.count.value)} />
        <SliderRow label="Rows" k="rows" sl={v.rows} fixed={v.fixed.count} out={String(v.rows.value)} />
        <SliderRow label={v.spacing.tube ? 'Tube spacing' : 'Spacing'} k="spacing" sl={v.spacing} fixed={v.fixed.count && !v.spacing.tube}
          out={v.spacing.tube ? (v.spacing.value ? `${fmt(v.spacing.value)} · hood ${fmt(v.spacing.hoodDepth)} deep` : 'Auto') : v.spacing.value ? fmt(v.spacing.value) : 'Auto'}
          title="Center to center. Tubes: the spacing sizes the hood." />
        <SliderRow label="Beam angle" k="cone" sl={v.cone} fixed={v.fixed.cone} out={`${v.cone.value}°`} />
        <SliderRow label="Hangs above" k="height" sl={v.height} out={v.hood ? 'In hood' : `${fmt(v.height.value)} above`} title="Distance above the top of the tank. Higher is dimmer and more even." />
        {v.mount.show ? <div class="row"><span class="lbl">Mount</span>
          <select class="select" aria-label="Mount" disabled={ro} value={v.mount.value} onChange={e => store.edit(s => setMount(s, (e.target as HTMLSelectElement).value as 'legs' | 'hang'))}>
            <option value="legs">{v.fixture === 'puck' ? 'Clipped to the rim, on goosenecks' : 'On legs, resting on the tank rim'}</option><option value="hang">Hung from the ceiling</option>
          </select><span /></div> : null}
        {v.hoodLed.show ? <div class="row"><span class="lbl">Hood LED</span>
          <select class="select" aria-label="Hood LED" disabled={ro} value={v.hoodLed.value} onChange={e => store.edit(s => setHoodLed(s, (e.target as HTMLSelectElement).value as 'bar' | 'strips'))}>
            <option value="strips">Strips</option><option value="bar">Full-length bar</option>
          </select><span /></div> : null}
        {v.pos.show ? <>
          <SliderRow label="Front to back" k="pos" sl={v.pos} out={`${fmt(S.tank.D / 2 - v.pos.value)} from back${v.pos.even ? ' · even' : ''}`} title="Where the light's center sits, measured from the back glass." />
          <div class="btns"><button type="button" class="btn sm" disabled={ro || v.pos.even} onClick={() => store.edit(optimizePos)} title="Move it to where the floor is lit most evenly">Optimize front to back</button></div>
        </> : null}
        {!v.flat ? <>
          {v.wattsSlider.show ? <SliderRow label="Power" k="watts" sl={v.wattsSlider} fixed={v.fixed.power} out={`${v.watts} W${v.wattsSlider.typical ? ' · typical' : ''}`} />
            : <div class="row"><span class="lbl">Power</span><span class="val wide">{v.wattsFixedText} · {v.watts} W</span></div>}
          {v.bulb.show ? <div class="row"><span class="lbl">Bulb</span>
            <select class="select" aria-label="Bulb watts" disabled={ro} value={String(v.bulb.value)} onChange={e => store.edit(s => setBulb(s, +(e.target as HTMLSelectElement).value))}>
              {[70, 150, 250, 400].map(w => <option value={String(w)}>{w} W</option>)}
            </select><span /></div> : null}
          {v.par.show ? <SliderRow label="Measured PAR" k="par" sl={v.par} fixed={v.fixed.par} out={v.par.value ? `${v.par.value} µmol` : 'Estimate'} title="Your own PAR-meter reading at the substrate, or the maker's figure. Set, the estimate is scaled to match. 0 = estimate." /> : null}
          <SliderRow label={v.bright.exposure ? 'Exposure' : 'Brightness'} k="bright" sl={v.bright} out={`×${v.bright.x.toFixed(2)}`} title={v.bright.exposure ? 'Like a camera: how bright the render looks. The PAR and lux do not change.' : ''} />
          <SliderRow label="Color temp" k="kelvin" sl={v.kelvin} fixed={v.fixed.kelvin} out={`${v.kelvin.value.toLocaleString('en-US')} K`} />
          {v.kelvin.off ? <div class="hint">{v.kelvin.value.toLocaleString('en-US')} K is not a color {v.techOptions.find(o => o.id === v.tech)?.label} usually comes in (usually {v.kelvin.lo.toLocaleString('en-US')}-{v.kelvin.hi.toLocaleString('en-US')} K).</div> : null}
        </> : null}
      </div>
    </Group>
  );
}
