// R111 / WS2 (2026-11-16): the Scape workspace (frame A). Stones / Wood / Caves / Decor as big tiles with search, the "In this tank" tray with the facts box,
// and the substrate & ground section (swatches, typed depths, slope presets, leaf litter, a cross-section drawing, custom terrain, scatter brush).
// Every edit is the old panel's own (logic/scape.ts through store.edit), so undo works as it did.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { drawSubstrate, drawBlendTile, SUBSTRATES, type PresetSubstrate } from '../art/placeholder';
import { groundVolume } from '../scene/setupsheet';
import { ideasLabel } from './logic/discover';
import { substrateView, terrainView, brushView, placedView, setSubstrateType, setRough, slopePreset, setLitterLeaf, setLitterDensity, shuffleLitter, setCorner, addPiece, LEAVES } from './logic/scape';
import { tankFraming, SCAPE_TABS, scapeTiles, scapeFacts, crossSection, substrateSwatches, enterVisit, revertVisit, visitDirty, type ScapeTab, type Visit, type CrossSection } from './logic/workspace';
import { Group, Icon } from './ui';
import { LenRow } from './tank';
import { dragPiece } from './drag';
import { PieceEditor, Placed, Search, SliderRow, Blend, TerrainBlock, BrushBlock, pickItems } from './scape';
import { WorkspaceFrame, Tile, Tray } from './workspace';

/** One substrate swatch: the real procedural ground texture the 3D view uses, drawn small. */
function Swatch({ type, blend }: { type: string; blend?: Store['tank']['substrate']['custom'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, x = c?.getContext('2d'); if (!c || !x) return;
    if (type === 'bare') { x.fillStyle = '#0d1116'; x.fillRect(0, 0, c.width, c.height); const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, 'rgba(120,170,200,.28)'); g.addColorStop(1, 'rgba(120,170,200,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); return; }
    try { if (type === 'custom' && blend) drawBlendTile(x, c.width, blend, 'm'); else drawSubstrate(x, c.width, type as PresetSubstrate); } catch { x.fillStyle = '#555'; x.fillRect(0, 0, c.width, c.height); }
  }, [type, blend?.grain, blend?.grain2, blend?.color, blend?.color2, blend?.mix, blend?.share]);
  return <canvas ref={ref} class="wsswatch" width={72} height={72} aria-hidden="true" />;
}

/** The side view of the ground: tank depth across, height up, 1 in squares, the front and back depths marked. */
export function CrossSectionView({ cs, base }: { cs: CrossSection; base: string }) {
  const pad = 36, W = 520, k = (W - pad * 2) / cs.D, H = cs.H * k, h = H + 34;
  const X = (d: number) => pad + d * k, Y = (v: number) => 10 + H - v * k;
  const pts = cs.ground.map((g, i) => `${X(cs.D * i / (cs.ground.length - 1)).toFixed(1)},${Y(g).toFixed(1)}`);
  const vlines: number[] = [], hlines: number[] = [];
  for (let d = 0; d <= cs.D + 0.1; d += cs.grid) vlines.push(d);
  for (let v = 0; v <= cs.H + 0.1; v += cs.grid) hlines.push(v);
  const label = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'middle') => <text x={x} y={y} text-anchor={anchor} class="xslab">{t}</text>;
  return (
    <svg class="xsec" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`Cross-section, front to back. Front depth ${cs.frontText}, back depth ${cs.backText}. ${cs.gridText}.`}>
      <rect x={X(0)} y={Y(cs.H)} width={cs.D * k} height={H} class="xsglass" />
      <rect x={X(0)} y={Y(cs.water)} width={cs.D * k} height={Math.max(0, cs.water * k)} class="xswater" />
      {vlines.map(d => <line x1={X(d)} x2={X(d)} y1={Y(cs.H)} y2={Y(0)} class="xsgrid" />)}
      {hlines.map(v => <line x1={X(0)} x2={X(cs.D)} y1={Y(v)} y2={Y(v)} class="xsgrid" />)}
      <polygon points={`${X(0)},${Y(0)} ${pts.join(' ')} ${X(cs.D)},${Y(0)}`} fill={base} class="xsground" />
      <polyline points={pts.join(' ')} class="xsline" />
      <rect x={X(0)} y={Y(cs.H)} width={cs.D * k} height={H} class="xsframe" />
      {label(X(0) - 4, Y(cs.front / 2) + 4, cs.frontText, 'end')}
      {label(X(cs.D) + 4, Y(cs.back / 2) + 4, cs.backText, 'start')}
      {label(X(0), Y(0) + 16, 'FRONT', 'start')}{label(X(cs.D), Y(0) + 16, 'BACK', 'end')}
    </svg>
  );
}

/** "In this tank": the tray, the facts box (floor cover, water effect, flags), the selected piece's settings and the full piece list. */
function ScapeSide({ store }: { store: Store }) {
  const S = store.tank, f = scapeFacts(S), sel = store.selectedItem;
  return (
    <div class="wsside-in">
      <Tray sub={f.total ? `${f.total} hardscape piece${f.total === 1 ? '' : 's'}` : ''} chips={f.tray}
        onPick={id => { const it = S.items.find(x => x.variant === id); if (it) store.selectItem(sel?.id === it.id ? null : it.id); }} empty="Nothing placed yet. Click a tile to add it." />
      <div class="wsfacts card" aria-label="Facts">
        <div class="drow"><span>Rock and wood cover</span><b>{f.coverText} of the floor</b></div>
        <div class="drow"><span>Water chemistry effect</span><b>{f.chem}</b></div>
        {f.flags.length ? f.flags.map(t => <div class="hint warnline">{t}</div>) : <div class="hint">{f.total ? 'Nothing here clashes with the animals in this tank.' : 'Place something and its effect on your water shows here.'}</div>}
      </div>
      <PieceEditor store={store} sec="hardscape" />
      <Placed store={store} sec="hardscape" pv={placedView(S, 'hardscape', null, new Set())} onPick={id => store.selectItem(id)} />
    </div>
  );
}

/** Substrate & ground: everything the old Substrate / Terrain / Scatter brush groups had, with swatches, typed depths and the cross-section. */
function GroundSection({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  const S = store.tank, units = store.scene.units, sv = substrateView(S, units), tv = terrainView(S, 0), bv = brushView(store, units);
  const cs = crossSection(S, units), swatches = substrateSwatches();
  const [open, setOpen] = useState({ terrain: false, brush: false });
  const kind = (t: string) => t === 'custom' ? S.substrate.custom.color : (SUBSTRATES[t as PresetSubstrate]?.base ?? '#444');
  const base = sv.type === 'bare' ? 'transparent' : kind(sv.type === 'custom' ? 'custom' : sv.type);
  const gv = S.substrate.show ? groundVolume(S) : null;
  const pick = (t: string) => { setSubstrateType(store, t); if (t === 'bare') { const v = getViewer(); if (v?.terrainEdit.on) { v.terrainEdit.on = false; v.rebuild(); } } };
  const sw = (id: string, label: string) => (
    <button type="button" class={`wssw${sv.type === id ? ' on' : ''}`} aria-pressed={sv.type === id} title={label} onClick={() => pick(id)}>
      <Swatch type={id} blend={S.substrate.custom} /><span>{label}</span></button>
  );
  const max = S.tank.H * 0.5;
  const corner = (key: 'fl' | 'fr' | 'bl' | 'br', label: string) => <LenRow label={label} mm={S.substrate[key]} min={10} max={max} u={units} onMm={mm => setCorner(store, key, mm)} />;
  const aq = swatches.filter(s => !s.terra), terra = swatches.filter(s => s.terra);
  const gal = gv ? gv.litres / 3.785 : 0;
  return (
    <div class="wsground" onChange={() => store.seal()}>
      <h3>Substrate <span class="hint">what the floor is made of</span></h3>
      <div class="wsswatches">{sw('bare', 'Bare bottom')}{aq.map(s => sw(s.id, s.label))}{sw('custom', 'Custom blend')}</div>
      {terra.length ? <><div class="cap">Terrarium</div><div class="wsswatches">{terra.map(s => sw(s.id, s.label))}</div></> : null}
      {sv.custom ? <div class="card"><Blend store={store} /></div> : null}
      <SliderRow label="Roughness" title="Lumps and ripples on the ground's skin only" min={0} max={100} value={sv.rough} text={sv.roughText} onInput={v => setRough(store, v)} />

      <h3>Depth and slope <span class="hint">numbers are typed or dragged</span></h3>
      <div class="chips">{sv.slopes.map(s => <button type="button" class={`chip${s.active ? ' on' : ''}`} aria-pressed={s.active} onClick={() => slopePreset(store, s.id)}>{s.label}</button>)}</div>
      <fieldset class="wsfield" disabled={!S.substrate.show || tv.on}>
        {corner('fl', 'Front left')}{corner('fr', 'Front right')}{corner('bl', 'Back left')}{corner('br', 'Back right')}
      </fieldset>
      <div class="hint">{!S.substrate.show ? 'Bare bottom: pick a substrate to set its depth.' : tv.on ? 'Custom terrain is on: it replaces these depths.' : `Depth at the four corners, up to ${units === 'in' ? `${(max / 25.4).toFixed(1)} in` : `${Math.round(max / 10)} cm`} (half the tank's height).`}</div>
      {gv ? <div class="card wsfacts"><div class="drow"><span>Substrate needed</span><b>{units === 'in' ? `about ${gal < 10 ? gal.toFixed(1) : Math.round(gal)} gal (${Math.round(gal * 4)} qt)` : `about ${Math.round(gv.litres)} L`}</b></div></div> : null}

      <h3>Leaf litter <span class="hint">for tannins, shrimp and blackwater setups</span></h3>
      <div class="chips"><button type="button" class={`chip${!sv.litter.on ? ' on' : ''}`} onClick={() => setLitterDensity(store, 0)}>None</button>
        {LEAVES.map(([k, l]) => <button type="button" class={`chip${sv.litter.on && sv.litter.leaf === k ? ' on' : ''}`} onClick={() => setLitterLeaf(store, k)}>{l}</button>)}</div>
      <SliderRow label="Amount" min={0} max={100} value={sv.litter.density} text={sv.litter.on ? `${sv.litter.density}%` : 'none'} onInput={v => setLitterDensity(store, v)} />
      <button type="button" class="btn sm" disabled={!sv.litter.on} onClick={() => shuffleLitter(store)}>Shuffle the leaves</button>

      <Group title="Terrain" sum={tv.summary} open={open.terrain} onToggle={() => setOpen({ ...open, terrain: !open.terrain })}><TerrainBlock store={store} getViewer={getViewer} /></Group>
      <Group title="Scatter brush" sum={bv.on ? bv.label : 'off'} open={open.brush} onToggle={() => setOpen({ ...open, brush: !open.brush })}><BrushBlock store={store} /></Group>

      <aside class="wsxsec" aria-label="Cross-section">
        <div class="wstrayh"><b>Cross-section</b><span class="hint">side view, front to back · {cs.gridText}</span></div>
        <CrossSectionView cs={cs} base={base} />
      </aside>
    </div>
  );
}

export function ScapeWorkspace({ store, getViewer, phone, onDone, onIdeas }: { store: Store; getViewer: () => Viewer | undefined; phone: boolean; onDone: () => void; onIdeas?: () => void }) {
  const visit = useRef<Visit>();
  if (!visit.current) visit.current = enterVisit(store);
  const S = store.tank;
  const [tab, setTab] = useState<ScapeTab | 'ground'>('stone');
  const [q, setQ] = useState('');
  const dirty = useMemo(() => visitDirty(store, visit.current!), [store.rev, store.mark]);
  const searching = !!q.trim();
  const { groups, shown, none } = scapeTiles(S, tab === 'ground' ? 'stone' : tab, q);
  const facts = scapeFacts(S);
  // pieces can be picked in the view while the workspace is open (App sets this from the open section as well; this keeps tests and the first frame right)
  useEffect(() => { pickItems.sec = 'hardscape'; const f = tankFraming(store.tank.camera); if (f) store.cam(c => { Object.assign(c, f); }); }, []);   // WS3: opens framed on the tank, not the room
  const add = (id: string) => { addPiece(store, id); };
  const ideas = ideasLabel('scape');
  return (
    <WorkspaceFrame title="Scape" sub="Stones, wood, caves, decor, substrate" mode="live" phone={phone} dirty={dirty} onDone={onDone} onUndoAll={() => revertVisit(store, visit.current!)}
      count={`${facts.total} placed`} side={<ScapeSide store={store} />}
      extra={ideas && onIdeas ? <button type="button" class="btn sm ideas" title="Ideas that change only the Scape" onClick={onIdeas}><Icon name="ideas" /> {ideas}</button> : null}>
      <div class="wstabs" role="tablist" aria-label="Scape">
        {SCAPE_TABS.map(t => <button type="button" role="tab" class={`chip big${tab === t.id ? ' on' : ''}`} aria-selected={tab === t.id} onClick={() => { setTab(t.id); }}>{t.label}</button>)}
        <button type="button" role="tab" class={`chip big dashed${tab === 'ground' ? ' on' : ''}`} aria-selected={tab === 'ground'} onClick={() => setTab('ground')}>Substrate &amp; ground{phone ? '' : ' →'}</button>
      </div>
      {tab === 'ground' ? <GroundSection store={store} getViewer={getViewer} /> : (
        <>
          <Search q={q} onQ={setQ} placeholder="Search stones, wood, caves, decor" />
          {none ? <div class="hint">{none}</div> : null}
          {groups.map(g => (
            <section class="wsgroup">
              <h3>{g.label} <span class="n">{g.tiles.length}</span></h3>
              <div class="wsgrid">{g.tiles.map(t => (
                <Tile name={t.label} facts={t.facts} title={`Add: ${t.hint} (or drag it into the tank)`} img={t.img} pills={t.pills} count={t.count} selected={t.count > 0} why={t.why}
                  onClick={() => add(t.id)} onPointerDown={e => dragPiece(e, t.id, getViewer, store)} />
              ))}</div>
            </section>
          ))}
          {searching ? <div class="hint">{shown} match{shown === 1 ? '' : 'es'} across stones, wood, caves and decor.</div> : null}
        </>
      )}
    </WorkspaceFrame>
  );
}
