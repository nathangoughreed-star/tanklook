// UI2 shell step 3 (lane S3, 2026-11-13): the custom tank maker, its own workspace (screen map §2a, mockup 07) with the glass panel
// (request R30, GS1 solver). The setup is not edited while it is open: the view draws a scratch setup (an empty tank on a plain floor) as a
// preview; Save writes the library (P9) and, for "Save and use", the setup through one store edit.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Tank, TankSetup, TankShape, CameraSettings } from '../scene/types';
import { applyTankEdit, reshape, shapeMemory, setGlass, setRim } from '../scene/tankEdit';
import { addCustomTank, editCustomTank, loadLibrary, saveLibrary, type CustomTankSpec } from '../scene/customTanks';
import { STOCK_US, STOCK_METRIC } from '../scene/glassSolver';
import { LIMITS } from '../scene/validate';
import { glassThickness, IN } from '../scene/physics';
import { POLY_SIDES, shapeOf } from '../scene/shape';
import { makerSetup, makerFacts, previewSpec, priceView, chooseCustom, glassText, galText, usd, SHAPE_WORD, SHAPE_MAIN, SHAPE_MORE, SIDE_RANGE, specChanged, type Units } from './logic/tank';
import { glassPanel, defaultChoice, DISCLAIMER, type GlassChoice, type GlassPanel } from './logic/tankGlass';
import { LenRow, Seg, Toggle } from './tank';
import { Group, Icon, Pill } from './ui';

export interface MakerInit { spec: CustomTankSpec; libId?: string }
export type MakerEnd = 'cancel' | 'saved' | 'used';

/** The maker's view: the setup's own camera, turned to show the tank's three sides (restored on close: the setup is not changed). */
// zoom is a field-of-view crop at a fixed eye distance, and below 0.5 the eye also steps back (scene/orbit.ts): measured on the build, the
// drawn size goes as span x zoom^2.15, so this frames every size about as a 24 in tank fills the view at 0.75
const MAKER_CAM = (c: CameraSettings, T: Tank): CameraSettings => ({ ...c, az: -24, el: 14, zoom: Math.max(0.08, Math.min(2.5, 0.75 * (652 / Math.max(T.L, T.H * 1.5, T.D * 1.4)) ** (1 / 2.15))) });

export function Maker({ store, init, viewHost, preview, onEnd }: { store: Store; init: MakerInit; viewHost: HTMLElement; preview: (S: TankSetup | null) => void; onEnd: (e: MakerEnd) => void }) {
  const u: Units = store.scene.units;
  const [spec, setSpec] = useState<CustomTankSpec>(() => structuredClone(init.spec));
  const [choice, setChoice] = useState<GlassChoice>(defaultChoice);
  const [panel, setPanel] = useState<GlassPanel | null>(null);
  const [inSetup, setInSetup] = useState(false);
  const mem = useRef(shapeMemory());
  const viewRef = useRef<HTMLElement>(null);
  const cam0 = useRef<CameraSettings>(structuredClone(store.tank.camera));
  const name = store.scene.name || 'Untitled';

  // the shared viewer moves into the maker's view; the setup's camera is turned for the maker and put back on close
  useEffect(() => {
    viewRef.current?.prepend(viewHost);
    const set = (c: CameraSettings) => store.update(s => { s.tanks[s.active].camera = c; }, { kind: 'view', history: false });
    set(MAKER_CAM(cam0.current, spec.tank));
    return () => { preview(null); set(cam0.current); };
  }, []);
  useEffect(() => { preview(inSetup ? previewSpec(store.tank, spec) : makerSetup(spec, store.tank)); }, [spec, inSetup]);
  // a new size is framed again once it settles (the person can still orbit and zoom in between)
  useEffect(() => { if (inSetup) return; const t = setTimeout(() => store.update(s => { s.tanks[s.active].camera = { ...s.tanks[s.active].camera, zoom: MAKER_CAM(cam0.current, spec.tank).zoom }; }, { kind: 'view', history: false }), 400); return () => clearTimeout(t); }, [spec.tank.L, spec.tank.D, spec.tank.H]);
  // "Preview in my setup" shows it in the room for a moment, then comes back (§2a)
  useEffect(() => {
    if (!inSetup) return;
    store.update(s => { s.tanks[s.active].camera = cam0.current; }, { kind: 'view', history: false });
    const t = setTimeout(() => setInSetup(false), 5000);
    return () => { clearTimeout(t); store.update(s => { s.tanks[s.active].camera = MAKER_CAM(cam0.current, spec.tank); }, { kind: 'view', history: false }); };
  }, [inSetup]);
  // the glass solver runs after edits settle (a box tank: about half a second with the brace optimizer)
  useEffect(() => { setPanel(null); const t = setTimeout(() => setPanel(glassPanel(spec.tank, spec.rim, choice, u)), 250); return () => clearTimeout(t); }, [spec.tank, spec.rim, choice, u]);

  /** Every tank edit runs P1's rules on a scratch setup and reads the spec back; a size / glass change drops a glass build that no longer fits. */
  const edit = (fn: (s: TankSetup) => void, keepBuild = false) => setSpec(sp => {
    const s = makerSetup(sp); fn(s);
    const next: CustomTankSpec = { ...sp, tank: s.tank, glass: s.render.glass, glassType: s.render.glassType, rim: s.render.rim };
    if (!keepBuild) delete next.glassBuild;
    return next;
  });
  const size = (next: (T: Tank) => Tank) => edit(s => applyTankEdit(s, next, { thin: false }));
  const T = spec.tank, shape = shapeOf(T), facts = useMemo(() => makerFacts(spec, u), [spec, u]), price = priceView(spec);
  const stock = u === 'in' ? STOCK_US : STOCK_METRIC, gNow = glassThickness(T, spec.glass);
  const changed = specChanged(spec, init.spec);

  const save = (use: boolean) => {
    const lib = loadLibrary();
    const r = init.libId && lib.some(e => e.id === init.libId) ? editCustomTank(lib, init.libId, spec) : addCustomTank(lib, spec);
    if (!saveLibrary(r.lib)) { alert('Could not save in this browser (storage is blocked or full).'); return; }
    if (use && r.entry) { const e = r.entry; store.edit(s => chooseCustom(s, e)); }
    onEnd(use ? 'used' : 'saved');
  };
  const cancel = () => { if (!changed || confirm('Leave the custom tank maker without saving? Your setup stays as it was.')) onEnd('cancel'); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (inSetup) setInSetup(false); else cancel(); } };
    addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true);
  });

  const [open, setOpen] = useState({ shape: true, size: true, glass: true, solver: true, price: true });
  const fold = (k: keyof typeof open) => () => setOpen({ ...open, [k]: !open[k] });
  return (
    <div class="maker" role="dialog" aria-label="Custom tank maker">
      <header class="mhead">
        <b class="mtitle">Custom tank maker</b>
        <span class="hint msub">Your setup "{name}" is not touched until you save</span>
        <span class="grow" />
        <button type="button" class={`btn ghost${inSetup ? ' on' : ''}`} aria-pressed={inSetup} onClick={() => setInSetup(!inSetup)} title="Shows it in your room for a moment, then comes back here"><Icon name="eye" /> {inSetup ? 'Back to the maker' : 'Preview in my setup'}</button>
        <button type="button" class="btn" onClick={cancel}>Cancel</button>
        <button type="button" class="btn" onClick={() => save(false)}>Save to my tanks</button>
        <button type="button" class="btn primary" onClick={() => save(true)}>Save and use in this setup</button>
      </header>
      <aside class="mform">
        <div class="row"><span class="lbl">Name</span><input class="input" value={spec.name} aria-label="Name" maxLength={76} onInput={e => setSpec({ ...spec, name: (e.target as HTMLInputElement).value })} /><span /></div>
        <Group title="Shape" sum={SHAPE_WORD[shape]} open={open.shape} onToggle={fold('shape')}>
          <div class="seg full" role="group" aria-label="Shape">
            {SHAPE_MAIN.map(sh => <button type="button" class={shape === sh ? 'on' : ''} aria-pressed={shape === sh} onClick={() => size(reshape(mem.current, T, sh))}>{SHAPE_WORD[sh]}</button>)}
            <select class={`segsel${SHAPE_MORE.includes(shape) ? ' on' : ''}`} aria-label="More shapes" value={SHAPE_MORE.includes(shape) ? shape : ''} onChange={e => { const v = (e.target as HTMLSelectElement).value as TankShape; if (v) size(reshape(mem.current, T, v)); }}>
              <option value="">More ▾</option>{SHAPE_MORE.map(sh => <option value={sh}>{SHAPE_WORD[sh]}</option>)}
            </select>
          </div>
          {shape === 'poly' ? <Seg label="Sides" value={String(T.sides ?? 6)} opts={POLY_SIDES.map(n => [String(n), `${n} sides`] as [string, string])} onPick={n => size(t => ({ ...t, sides: +n }))} /> : null}
          {shape === 'rect' ? <button type="button" class="btn sm" onClick={() => size(t => ({ ...t, D: t.L, H: t.L }))}>Make it a cube</button> : null}
        </Group>
        <Group title="Size" sum={galText(facts.gross)} open={open.size} onToggle={fold('size')}>
          <LenRow label={shape === 'round' || shape === 'bowl' ? 'Diameter' : shape === 'pie' ? 'Width' : 'Length'} mm={T.L} min={Math.max(LIMITS.tankMin, SIDE_RANGE.L[0])} max={SIDE_RANGE.L[1]} u={u} onMm={mm => size(t => ({ ...t, L: mm }))} />
          {shape !== 'round' && shape !== 'bowl' && shape !== 'poly' ? <LenRow label={shape === 'pie' ? 'Radius' : shape === 'bow' ? 'Depth at centre' : 'Depth'} mm={T.D} min={SIDE_RANGE.D[0]} max={SIDE_RANGE.D[1]} u={u} onMm={mm => size(t => ({ ...t, D: mm }))} /> : null}
          {shape !== 'bowl' ? <LenRow label="Height" mm={T.H} min={SIDE_RANGE.H[0]} max={SIDE_RANGE.H[1]} u={u} onMm={mm => size(t => ({ ...t, H: mm }))} /> : null}
          {shape === 'bow' ? <LenRow label="Bow depth" mm={T.D - (T.bowMin ?? T.D * 0.7)} min={0.5 * IN} max={T.D * 0.6} u={u} onMm={mm => size(t => ({ ...t, bowMin: Math.max(t.D * 0.4, t.D - mm) }))} /> : null}
          {shape === 'pie' ? <div class="row"><span class="lbl">Angle</span><input class="slider" type="range" min={45} max={180} step={5} value={T.pieDeg ?? 90} aria-label="Angle" onInput={e => size(t => ({ ...t, pieDeg: +(e.target as HTMLInputElement).value }))} /><span class="val">{T.pieDeg ?? 90}°</span></div> : null}
          {shape === 'bowl' ? <>
            <LenRow label="Floor" mm={T.bowlFloor ?? T.L * 0.5} min={T.L * 0.2} max={T.L * 0.95} u={u} onMm={mm => size(t => ({ ...t, bowlFloor: mm }))} />
            <LenRow label="Opening" mm={T.bowlTop ?? T.L * 0.5} min={T.L * 0.2} max={T.L * 0.95} u={u} onMm={mm => size(t => ({ ...t, bowlTop: mm }))} />
          </> : null}
        </Group>
        <Group title="Glass and rim" sum={`${spec.glassType === 'lowiron' ? 'low-iron' : 'float'} · ${spec.rim ? 'rimmed' : 'rimless'}`} open={open.glass} onToggle={fold('glass')}>
          <div class="row"><span class="lbl">Glass</span><Seg label="Glass" value={spec.glassType} opts={[['standard', 'Float'], ['lowiron', 'Low-iron']]} onPick={v => edit(s => { s.render.glassType = v; }, true)} /><span /></div>
          <div class="row"><span class="lbl">Thickness</span>
            <select class="select" aria-label="Glass thickness" value={spec.glass === 'auto' ? 'auto' : String(spec.glass)} onChange={e => edit(s => setGlass(s, (e.target as HTMLSelectElement).value))}>
              <option value="auto">Typical for the height ({glassText(glassThickness(T, 'auto'), u)})</option>
              {[...new Set([...stock, ...(spec.glass === 'auto' ? [] : [spec.glass])])].sort((a, b) => a - b).map(t => <option value={String(t)}>{glassText(t, u)}</option>)}
            </select><span /></div>
          <div class="row"><span class="lbl">Rim</span><Seg label="Rim" value={spec.rim ? 'y' : 'n'} opts={[['y', 'Rimmed'], ['n', 'Rimless']]} onPick={v => edit(s => setRim(s, v === 'y'))} /><span /></div>
        </Group>
        <GlassGroup panel={panel} choice={choice} setChoice={setChoice} rim={spec.rim} u={u} glassNow={gNow} build={!!spec.glassBuild} open={open.solver} onToggle={fold('solver')}
          onUse={() => panel?.use && setSpec({ ...spec, glass: panel.use.glass, glassBuild: panel.use.build })} />
        <Group title="Price" sum={spec.priceUsd != null ? `${usd(spec.priceUsd)} yours` : price.estimate != null ? `about ${usd(price.estimate)}` : 'no estimate'} open={open.price} onToggle={fold('price')}>
          <div class="drow"><span>Our estimate</span><b>{price.estimate != null ? usd(price.estimate) : '-'}</b></div>
          <div class="hint">{price.how}</div>
          <div class="drow"><Toggle on={spec.priceUsd != null} label="Use my own price" onFlip={on => setSpec(on ? { ...spec, priceUsd: Math.round(price.estimate ?? 100) } : (({ priceUsd: _p, ...r }) => r)(spec))} />
            {spec.priceUsd != null ? <span><input class="input num" type="number" min={0} step={1} value={spec.priceUsd} aria-label="My own price, dollars" onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v) && v >= 0) setSpec({ ...spec, priceUsd: Math.round(v) }); }} /><span class="unit">$</span></span> : null}</div>
          <div class="hint">e.g. a glass shop quote or your DIY cost. Used everywhere (cost bar, shopping list, Print), marked "your figure".</div>
        </Group>
        <Toggle on={!!spec.owned} label="I own this tank" onFlip={on => setSpec({ ...spec, owned: on })} />
      </aside>
      <main class="mview" ref={viewRef}>
        {inSetup ? <div class="ov mbanner glass">Your setup with this tank, for a moment. <button type="button" class="btn sm" onClick={() => setInSetup(false)}>Back now</button></div> : <>
          <div class="ov dims glass" aria-label="Dimensions"><span><b>{facts.L}</b> {shape === 'round' || shape === 'bowl' ? 'across' : 'length'}</span><span><b>{facts.D}</b> {shape === 'bow' ? 'depth at centre' : 'depth'}</span><span><b>{facts.H}</b> height</span>{facts.bow ? <span><b>{facts.bow}</b> bow</span> : null}</div>
        </>}
        <div class="ov mfacts">
          <span class="glass fchip"><b>{galText(facts.gross)}</b> gross · about {galText(facts.water)} of water</span>
          <span class="glass fchip"><b>about {Math.round(facts.lb / 10) * 10} lb</b> filled</span>
          <span class="glass fchip"><b>{facts.footprint}</b> footprint</span>
        </div>
      </main>
    </div>
  );
}

function GlassGroup({ panel, choice, setChoice, rim, u, glassNow, build, open, onToggle, onUse }: {
  panel: GlassPanel | null; choice: GlassChoice; setChoice: (c: GlassChoice) => void; rim: boolean; u: Units; glassNow: number; build: boolean; open: boolean; onToggle: () => void; onUse: () => void;
}) {
  const sum = !panel ? 'working it out…' : !panel.supported ? 'box tanks only' : `${panel.panes[0].thickness} front · SF ${panel.sfAchieved}`;
  return (
    <Group title="Glass check" sum={sum} open={open} onToggle={onToggle}>
      {panel && !panel.supported ? <div class="hint">{panel.reason}</div> : <>
        <div class="row"><span class="lbl">Safety factor</span><input class="slider" type="range" min={2} max={6} step={0.1} value={choice.sf} aria-label="Safety factor" onInput={e => setChoice({ ...choice, sf: +(e.target as HTMLInputElement).value })} />
          <span class="val"><input class="input num" type="number" min={1.5} max={8} step={0.1} value={choice.sf} aria-label="Safety factor value" onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v) && v >= 1.5 && v <= 8) setChoice({ ...choice, sf: v }); }} /></span></div>
        <Seg label="Thickness" value={choice.mode} opts={[['uniform', 'One thickness'], ['perPane', 'Per pane']]} onPick={m => setChoice({ ...choice, mode: m })} />
        {!rim ? <Seg label="Brace" value={choice.brace} opts={[['none', 'No brace'], ['perimeter', 'Perimeter'], ['cross', 'Perimeter + cross']]} onPick={b => setChoice({ ...choice, brace: b })} /> : null}
        {!panel ? <div class="hint">Working out the glass…</div> : <>
          <div class="hint">{panel.topLine}</div>
          {!rim && panel.braces.length ? <table class="gtable" aria-label="Brace options">
            <thead><tr><th>Brace</th><th>Walls (front / ends)</th><th title="Glass used, no brace = 100">Glass</th></tr></thead>
            <tbody>{panel.braces.map(b => <tr class={b.on ? 'on' : ''} onClick={() => setChoice({ ...choice, brace: b.kind })}><td>{b.label}<div class="hint">{b.opening}</div></td><td>{b.walls}</td><td>{b.cost}</td></tr>)}</tbody>
          </table> : null}
          <table class="gtable" aria-label="Glass per pane">
            <thead><tr><th>Pane</th><th>Glass</th><th>SF</th><th>Set by</th></tr></thead>
            <tbody>{panel.panes.map(p => <tr><td>{p.label}</td><td><b>{p.thickness}</b></td><td class={p.ok ? '' : 'bad'}>{p.sf}</td><td class="hint">{p.governs}</td></tr>)}</tbody>
          </table>
          <div class="drow"><span>Safety factor achieved</span><Pill tone={panel.sfOk ? 'ok' : 'bad'}>{panel.sfAchieved}</Pill></div>
          {panel.joints.length ? <><div class="cap">Silicone joints</div>{panel.joints.map(j => <div class="drow"><span>{j.label}</span><Pill tone={j.ok ? 'ok' : 'bad'}>{j.use}</Pill></div>)}</> : null}
          {panel.notes.map(n => <div class="dwarn warn">{n}</div>)}
          <div class="drow"><span class="hint">{panel.weight}</span>
            {panel.use ? <button type="button" class="btn sm" disabled={build && Math.abs(panel.use.glass - glassNow) < 0.01} onClick={onUse}>{build && Math.abs(panel.use.glass - glassNow) < 0.01 ? 'In use' : `Use this glass (${glassText(panel.use.glass, u)})`}</button> : null}</div>
        </>}
        <div class="hint disclaimer">{DISCLAIMER}</div>
      </>}
    </Group>
  );
}
