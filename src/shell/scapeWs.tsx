// R111 / WS2 (2026-11-16): the Hardscape workspace (frame A; was Scape until 2026-11-17). Stones / Wood / Caves / Decor as big tiles with search, the "In this tank" tray with the facts box,
// and the substrate & ground section (swatches, typed depths, slope presets, custom terrain as an either/or switch). SC1 (2026-11-17): leaf litter and the scatter brush moved to the piece tabs; the cross-section drawing and the Add-a-pool button are gone.
// Every edit is the old panel's own (logic/scape.ts through store.edit), so undo works as it did.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { drawSubstrate, drawBlendTile, type PresetSubstrate } from '../art/placeholder';
import { groundVolume } from '../scene/setupsheet';
import { ideasLabel } from './logic/discover';
import { substrateView, terrainView, brushView, placedView, setSubstrateType, setRough, slopePreset, setLitterLeaf, setLitterDensity, shuffleLitter, setCorner, addPiece, LEAVES } from './logic/scape';
import { tankFraming, SCAPE_TABS, scapeTiles, scapeFacts, substrateSwatches, terrainMode, enterVisit, revertVisit, visitDirty, type ScapeTab, type Visit } from './logic/workspace';
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

/** Substrate & ground: swatches, an either/or terrain switch (slopes and typed depths OR the custom grid), typed depths. */
function GroundSection({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  const S = store.tank, units = store.scene.units, sv = substrateView(S, units), tv = terrainView(S, 0);
  const swatches = substrateSwatches(), tm = terrainMode(tv.on);
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

      <h3>Terrain <span class="hint">slopes and depths, or a custom grid of heights</span></h3>
      <TerrainBlock store={store} getViewer={getViewer} slopes={tm.slopes ? (<>
      <div class="chips">{sv.slopes.map(s => <button type="button" class={`chip${s.active ? ' on' : ''}`} aria-pressed={s.active} onClick={() => slopePreset(store, s.id)}>{s.label}</button>)}</div>
      <fieldset class="wsfield" disabled={!S.substrate.show}>
        {corner('fl', 'Front left')}{corner('fr', 'Front right')}{corner('bl', 'Back left')}{corner('br', 'Back right')}
      </fieldset>
      <div class="hint">{!S.substrate.show ? 'Bare bottom: pick a substrate to set its depth.' : `Depth at the four corners, up to ${units === 'in' ? `${(max / 25.4).toFixed(1)} in` : `${Math.round(max / 10)} cm`} (half the tank's height).`}</div>
      </>) : null} />
      {gv ? <div class="card wsfacts"><div class="drow"><span>Substrate needed</span><b>{units === 'in' ? `about ${gal < 10 ? gal.toFixed(1) : Math.round(gal)} gal (${Math.round(gal * 4)} qt)` : `about ${Math.round(gv.litres)} L`}</b></div></div> : null}
    </div>
  );
}

/** Leaf litter and the scatter brush: they sit on the ground between the pieces, so they live on the stones / wood / caves / decor tabs. */
function LitterBrush({ store }: { store: Store }) {
  const sv = substrateView(store.tank, store.scene.units), bv = brushView(store, store.scene.units);
  const [open, setOpen] = useState(false);
  return (
    <div class="wsground" onChange={() => store.seal()}>
      <h3>Leaf litter <span class="hint">for tannins, shrimp and blackwater setups</span></h3>
      <div class="chips"><button type="button" class={`chip${!sv.litter.on ? ' on' : ''}`} onClick={() => setLitterDensity(store, 0)}>None</button>
        {LEAVES.map(([k, l]) => <button type="button" class={`chip${sv.litter.on && sv.litter.leaf === k ? ' on' : ''}`} onClick={() => setLitterLeaf(store, k)}>{l}</button>)}</div>
      <SliderRow label="Amount" min={0} max={100} value={sv.litter.density} text={sv.litter.on ? `${sv.litter.density}%` : 'none'} onInput={v => setLitterDensity(store, v)} />
      <button type="button" class="btn sm" disabled={!sv.litter.on} onClick={() => shuffleLitter(store)}>Shuffle the leaves</button>
      <Group title="Scatter brush" sum={bv.on ? bv.label : 'off'} open={open} onToggle={() => setOpen(!open)}><BrushBlock store={store} /></Group>
    </div>
  );
}

export function ScapeWorkspace({ store, getViewer, phone, onDone, onIdeas }: { store: Store; getViewer: () => Viewer | undefined; phone: boolean; onDone: () => void; onIdeas?: () => void }) {
  const visit = useRef<Visit>();
  if (!visit.current) visit.current = enterVisit(store);
  const S = store.tank;
  const [tab, setTab] = useState<ScapeTab>('stone');
  const [menu, setMenu] = useState<'substrate' | 'objects'>('objects');
  const [q, setQ] = useState('');
  const dirty = useMemo(() => visitDirty(store, visit.current!), [store.rev, store.mark]);
  const searching = !!q.trim();
  const { groups, shown, none } = scapeTiles(S, tab, q);
  const facts = scapeFacts(S);
  // pieces can be picked in the view while the workspace is open (App sets this from the open section as well; this keeps tests and the first frame right)
  useEffect(() => { pickItems.sec = 'hardscape'; const f = tankFraming(store.tank.camera); if (f) store.cam(c => { Object.assign(c, f); }); }, []);   // WS3: opens framed on the tank, not the room
  const add = (id: string) => { addPiece(store, id); };
  const ideas = ideasLabel('scape');
  return (
    <WorkspaceFrame title="Hardscape" sub="Substrate, stones, wood, caves, decor" mode="live" phone={phone} dirty={dirty} onDone={onDone} onUndoAll={() => revertVisit(store, visit.current!)}
      count={`${facts.total} placed`} side={<ScapeSide store={store} />}
      extra={ideas && onIdeas ? <button type="button" class="btn sm ideas" title="Ideas that change only the Hardscape" onClick={onIdeas}><Icon name="ideas" /> {ideas}</button> : null}>
      <div class="wstabs wsmenus" role="tablist" aria-label="Hardscape">
        {([['substrate', 'Substrate'], ['objects', 'Objects']] as const).map(([id, label]) => <button type="button" role="tab" class={`chip big${menu === id ? ' on' : ''}`} aria-selected={menu === id} onClick={() => setMenu(id)}>{label}</button>)}
      </div>
      {menu === 'substrate' ? <GroundSection store={store} getViewer={getViewer} /> : (
        <>
          <div class="wstabs" role="tablist" aria-label="Objects">
            {SCAPE_TABS.map(t => <button type="button" role="tab" class={`chip${tab === t.id ? ' on' : ''}`} aria-selected={tab === t.id} onClick={() => { setTab(t.id); }}>{t.label}</button>)}
          </div>
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
          <LitterBrush store={store} />
        </>
      )}
    </WorkspaceFrame>
  );
}
