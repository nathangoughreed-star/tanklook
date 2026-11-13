// UI2 shell step 3 (lane S3, 2026-11-13): the Tank section (screen map §2a, mockup 01) and its docked tank picker (mockups 06 / 06b).
// Components only draw logic/tank.ts and call its edits; the custom tank maker is its own workspace (maker.tsx).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { LIMITS } from '../scene/validate';
import { CEILING_MAX, CEILING_MIN, ceilingH, fromUnit, toUnit, IN } from '../scene/physics';
import { setLid, lidLocked, setDoors, doorLocked, type DoorKind } from '../scene/tankEdit';
import { lockNote } from '../scene/integrated';
import { lockObject, unlockObject, isLocked } from '../scene/locks';
import { placementOf, putOnFloor, putOnStand, putOnMyFurniture, putOnFurniture, minTop, type Placement } from '../scene/placement';
import { tankKind } from '../scene/pickerKind';
import { keepInWater } from '../scene/water';
import { clampItem } from '../scene/items';
import { loadLibrary, type CustomTank } from '../scene/customTanks';
import { pinPreset } from '../demand/pinned';
import { soleProduct } from '../data/tanks';
import {
  modelCard, sitsOnSummary, lidSummary, bgSummary, roomSummary, heightText, len, LIDS, lidHeld, customRows, customLine, commercialRows, commercialLine,
  previewRow, chooseCommercial, chooseCustom, saleOf, SIZE_CHIPS, loadGroups, saveGroups, type PickRow, type SizeChip, type TankGroup, type Units,
} from './logic/tank';
import { Group, Icon, Pill } from './ui';

export type MakerHow = { how: 'new' | 'copy' | 'edit' } | { how: 'lib'; id: string };

/** A slider row with its typed value (§1a.4: typed values on every slider). Values in mm; shown in the scene's units. */
export function LenRow({ label, mm, min, max, u, onMm, step }: { label: string; mm: number; min: number; max: number; u: Units; onMm: (mm: number, done: boolean) => void; step?: number }) {
  const st = step ?? (u === 'in' ? 0.5 : 1);
  return (
    <div class="row">
      <span class="lbl">{label}</span>
      <input class="slider" type="range" min={toUnit(min, u)} max={toUnit(max, u)} step={st} value={toUnit(mm, u)} aria-label={label}
        onInput={e => onMm(fromUnit(+(e.target as HTMLInputElement).value, u), false)} />
      <span class="val"><input class="input num" type="number" min={toUnit(min, u)} max={toUnit(max, u)} step="any" value={toUnit(mm, u)} aria-label={`${label} (${u})`}
        onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v) && v > 0) onMm(Math.min(max, Math.max(min, fromUnit(v, u))), true); }} /><span class="unit">{u}</span></span>
    </div>
  );
}

export function Seg<T extends string>({ value, opts, onPick, label, disabled }: { value: T; opts: [T, string][]; onPick: (v: T) => void; label: string; disabled?: (v: T) => string | false }) {
  return (
    <div class="seg full" role="group" aria-label={label}>
      {opts.map(([v, t]) => { const d = disabled?.(v); return <button type="button" class={value === v ? 'on' : ''} aria-pressed={value === v} disabled={!!d} title={d || undefined} onClick={() => onPick(v)}>{t}</button>; })}
    </div>
  );
}

export const Toggle = ({ on, label, onFlip }: { on: boolean; label: ComponentChildren; onFlip: (on: boolean) => void }) => (
  <button type="button" class="tglrow" role="switch" aria-checked={on} onClick={() => onFlip(!on)}><span class={`toggle${on ? ' on' : ''}`} />{label}</button>
);

function useGroups() {
  const [g, setG] = useState(loadGroups);
  const flip = (k: TankGroup) => { const n = { ...g, [k]: !g[k] }; setG(n); saveGroups(n); };
  return [g, flip] as const;
}

// ---------------------------------------------------------------- Tank section

export function TankSection({ store, onPicker, onMaker, libN }: { store: Store; onPicker: () => void; onMaker: (h: MakerHow) => void; libN: number }) {
  const S = store.tank, u = store.scene.units;
  const lib = useMemo(() => loadLibrary(), [libN]);
  const [g, flip] = useGroups();
  const card = modelCard(S, u, lib);
  return (
    <>
      <Group title="Tank model" sum={card.sum} open={g.model} onToggle={() => flip('model')}>
        <div class="card media sel tankcard">
          <span class="thumb tthumb"><Icon name="tank" /></span>
          <span><div class="t">{card.title}</div><div class="m">{card.sub}</div></span>
          <span class="acts">
            {card.kind === 'custom' ? <button type="button" class="btn sm" onClick={() => onMaker({ how: 'edit' })}>Edit</button> : null}
            <button type="button" class="btn sm" onClick={onPicker}>Change…</button>
          </span>
        </div>
        {card.newer ? <div class="dwarn warn">Updated in my tanks (version {card.newer.version}): <button type="button" class="btn sm" onClick={() => store.edit(s => chooseCustom(s, card.newer!))}>Use the new version</button></div> : null}
        {card.lost ? <div class="dwarn">This tank was deleted from my tanks; this setup keeps its own copy. <button type="button" class="btn sm" onClick={() => onMaker({ how: 'edit' })}>Save to my tanks again…</button></div> : null}
        {card.rows.map(([k, v]) => <div class="row kv"><span class="lbl">{k}</span><span>{v}</span></div>)}
        <div class="hint">{card.note}</div>
        <div class="acts-row">
          {card.kind === 'commercial' ? <button type="button" class="btn sm" onClick={() => onMaker({ how: 'copy' })}>Make a custom tank from this…</button> : null}
          <button type="button" class={`btn sm${card.locked ? ' on' : ''}`} aria-pressed={card.locked} title="Use this one for sure: Discover and Suggest keep this tank"
            onClick={() => store.edit(s => { s.locks = isLocked(s, 'tank') ? unlockObject(s, 'tank') : lockObject(s, 'tank'); })}><Icon name="lock" /> {card.locked ? 'Used for sure' : 'Use this one for sure'}</button>
        </div>
      </Group>
      <SitsOn store={store} S={S} u={u} open={g.sits} onToggle={() => flip('sits')} />
      <LidTop store={store} S={S} open={g.lid} onToggle={() => flip('lid')} />
      <Background store={store} S={S} open={g.bg} onToggle={() => flip('bg')} />
      <Room store={store} S={S} u={u} open={g.room} onToggle={() => flip('room')} />
    </>
  );
}

function SitsOn({ store, S, u, open, onToggle }: { store: Store; S: TankSetup; u: Units; open: boolean; onToggle: () => void }) {
  const p = placementOf(S), tb = S.stand.table;
  const place = (v: Placement) => store.edit(s => { if (v === 'floor') putOnFloor(s); else if (v === 'stand') putOnStand(s); else putOnMyFurniture(s); });
  const furn = (o: Partial<{ shape: 'rect' | 'round'; L: number; D: number; height: number }>, c?: string) =>
    store.edit(s => { const t = s.stand.table; putOnFurniture(s, { shape: t.shape, L: t.L, D: t.D, height: s.stand.height, ...o }); }, c ? { coalesce: c } : {});
  const min = p === 'furniture' ? minTop(S, tb.shape) : null;
  return (
    <Group title="Sits on" sum={sitsOnSummary(S, u)} open={open} onToggle={onToggle}>
      <Seg label="Sits on" value={p} opts={[['floor', 'Floor'], ['stand', 'Stand'], ['furniture', 'My own furniture']]} onPick={place} />
      {S.stand.need === 'ask' && !S.stand.show ? <div class="hint">Not chosen yet: the budget counts a typical stand until you pick.</div> : null}
      {p === 'stand' ? <>
        <div class="row"><span class="lbl">Style</span>
          <select class="select" aria-label="Stand style" value={`${S.stand.style === 'frame' ? 'frame' : 'cabinet'}|${S.stand.finish}`}
            onChange={e => { const [st, f] = (e.target as HTMLSelectElement).value.split('|'); store.edit(s => putOnStand(s, { style: st as 'cabinet' | 'frame', finish: f as TankSetup['stand']['finish'] })); }}>
            {(['cabinet', 'frame'] as const).flatMap(st => (Object.keys(STAND_FINISHES) as TankSetup['stand']['finish'][]).map(f => <option value={`${st}|${f}`}>{st === 'cabinet' ? 'Cabinet' : 'Open frame'}, {STAND_FINISHES[f].label.toLowerCase()}</option>))}
          </select><span /></div>
        <LenRow label="Height" mm={S.stand.height} min={LIMITS.stand[0]} max={LIMITS.stand[1]} u={u} onMm={(mm, done) => store.edit(s => { s.stand.height = mm; }, done ? {} : { coalesce: 'standH' })} />
      </> : null}
      {p === 'furniture' ? <>
        <LenRow label="Height" mm={S.stand.height} min={LIMITS.stand[0]} max={LIMITS.stand[1]} u={u} onMm={(mm, done) => furn({ height: mm }, done ? undefined : 'furnH')} />
        <div class="row"><span class="lbl">Top</span><Seg label="Top shape" value={tb.shape} opts={[['rect', 'Rectangular'], ['round', 'Round']]} onPick={v => furn({ shape: v, L: v === 'round' ? Math.max(tb.L, tb.D) : tb.L })} /><span /></div>
        <LenRow label={tb.shape === 'round' ? 'Diameter' : 'Length'} mm={tb.L} min={min!.L} max={240 * IN} u={u} onMm={(mm, done) => furn({ L: mm }, done ? undefined : 'furnL')} />
        {tb.shape === 'rect' ? <LenRow label="Depth" mm={tb.D} min={min!.D} max={96 * IN} u={u} onMm={(mm, done) => furn({ D: mm }, done ? undefined : 'furnD')} /> : null}
        <div class="hint">This tank needs a top at least {tb.shape === 'round' ? `${len(min!.L, u)} across` : `${len(min!.L, u)} × ${len(min!.D, u)}`}.</div>
      </> : null}
    </Group>
  );
}

function LidTop({ store, S, open, onToggle }: { store: Store; S: TankSetup; open: boolean; onToggle: () => void }) {
  const held = lidHeld(S), k = tankKind(S), dry = k === 'terrarium' || k === 'vivarium';
  const lidWhy = (l: TankSetup['lid']) => lidLocked(S.tank, held.lid, l) && l !== S.lid ? (held.lid ? lockNote(S, 'lid') : 'A hood fits box, bow and curved-front tanks only') : false;
  return (
    <Group title="Lid and top" sum={lidSummary(S)} open={open} onToggle={onToggle}>
      <Seg label="Lid" value={S.lid} opts={LIDS} disabled={lidWhy} onPick={l => store.edit(s => setLid(s, l))} />
      {held.lid ? <div class="hint">{lockNote(S, 'lid')}</div> : null}
      {dry ? <div class="row"><span class="lbl">Front doors</span>
        <Seg<DoorKind> label="Front doors" value={S.doors ?? 'none'} opts={[['none', 'None'], ['hinged', 'Hinged'], ['sliding', 'Sliding']]}
          disabled={d => doorLocked(S, d, held.doors) ? (held.doors ? lockNote(S, 'doors') : 'Doors fit box tanks only') : false} onPick={d => store.edit(s => setDoors(s, d))} /><span /></div> : null}
    </Group>
  );
}

const SIDES = [['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['front', 'Front']] as const;
/** After the background's sides change the 3D wall follows them: animals and pieces are kept in front of it (the old shell's wallFit). */
const wallFit = (s: TankSetup) => { keepInWater(s); for (const it of s.items) clampItem(it, s.tank, s); };

function Background({ store, S, open, onToggle }: { store: Store; S: TankSetup; open: boolean; onToggle: () => void }) {
  return (
    <Group title="Background" sum={bgSummary(S)} open={open} onToggle={onToggle}>
      <div class="row"><span class="lbl">Background</span>
        <select class="select" aria-label="Background" value={S.render.bg} onChange={e => store.edit(s => { s.render.bg = (e.target as HTMLSelectElement).value as TankSetup['render']['bg']; })}>
          {Object.entries(BACKGROUNDS).map(([k, b]) => <option value={k}>{b.label}</option>)}
        </select>
        {S.render.bg === 'custom' ? <input type="color" aria-label="Background colour" value={S.render.bgColor ?? '#2f4a36'} onInput={e => store.edit(s => { s.render.bgColor = (e.target as HTMLInputElement).value; }, { coalesce: 'bgColor' })} /> : <span />}
      </div>
      {S.render.bg !== 'none' ? <div class="row"><span class="lbl">On sides</span><div class="chips">
        {SIDES.map(([v, t]) => { const on = S.render.bgSides.includes(v); return <button type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on}
          onClick={() => store.edit(s => { const b = s.render.bgSides; s.render.bgSides = b.includes(v) ? b.filter(x => x !== v) : [...b, v]; wallFit(s); })}>{t}</button>; })}
      </div><span /></div> : null}
    </Group>
  );
}

function Room({ store, S, u, open, onToggle }: { store: Store; S: TankSetup; u: Units; open: boolean; onToggle: () => void }) {
  const wallSide = (side: TankSetup['wall']['side']) => store.edit(s => {
    const was = s.wall.show ? s.wall.side : 'back', b = s.render.bgSides, bgOf = (w: typeof side) => (w === 'corner' ? 'back' : w);
    if (b.length === 1 && b[0] === bgOf(was)) s.render.bgSides = [bgOf(side)]; // a background on the old wall side moves with the wall
    s.wall.side = side; s.wall.show = true;
  });
  return (
    <Group title="Room" sum={roomSummary(S, u)} open={open} onToggle={onToggle}>
      <Toggle on={S.wall.show} label="A wall near the tank" onFlip={on => store.edit(s => { s.wall.show = on; })} />
      {S.wall.show ? <>
        <Seg label="Wall" value={S.wall.side} opts={[['back', 'Behind'], ['left', 'Left end'], ['right', 'Right end'], ['corner', 'Corner']]} onPick={wallSide} />
        <LenRow label="Ceiling" mm={ceilingH(S.wall)} min={CEILING_MIN} max={CEILING_MAX} u={u} step={u === 'in' ? 1 : 1} onMm={(mm, done) => store.edit(s => { s.wall.height = mm; }, done ? {} : { coalesce: 'ceilH' })} />
        <div class="row"><span class="lbl">Wall colour</span><input type="color" aria-label="Wall colour" value={S.wall.color} onInput={e => store.edit(s => { s.wall.color = (e.target as HTMLInputElement).value; }, { coalesce: 'wallColor' })} /><span /></div>
      </> : null}
      <Toggle on={S.person.show} label={<>You, for scale <span class="hint">{heightText(S.person.height, u)}</span></>} onFlip={on => store.edit(s => { s.person.show = on; })} />
      {S.person.show ? <>
        <LenRow label="Your height" mm={S.person.height} min={LIMITS.person[0]} max={LIMITS.person[1]} u={u} onMm={(mm, done) => store.edit(s => { s.person.height = mm; }, done ? {} : { coalesce: 'personH' })} />
        <Seg label="Stand on the" value={S.person.side} opts={[['left', 'Left'], ['right', 'Right']]} onPick={v => store.edit(s => { s.person.side = v; })} />
      </> : null}
    </Group>
  );
}

// ---------------------------------------------------------------- the docked picker

export function TankPicker({ store, preview, onClose, onMaker, libN }: { store: Store; preview: (S: TankSetup | null) => void; onClose: () => void; onMaker: (h: MakerHow) => void; libN: number }) {
  const S = store.tank, u = store.scene.units;
  const lib: CustomTank[] = useMemo(() => loadLibrary(), [libN]);
  const [g, flip] = useGroups();
  const [q, setQ] = useState('');
  const [chips, setChips] = useState<Set<SizeChip>>(new Set());
  const [fits, setFits] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searching = !!q.trim();
  const custom = customRows(S, lib, u, q), comm = useMemo(() => commercialRows(S, u, { q, chips, fits }), [S, u, q, chips, fits]);
  const showCustom = g.custom || searching, showComm = g.commercial || searching;
  const visible: PickRow[] = [...(showCustom ? custom : []), ...(showComm ? comm.rows : [])];
  const cur = visible.find(r => r.key === sel) ?? [...custom, ...comm.rows].find(r => r.key === sel);

  useEffect(() => () => preview(null), []); // closing the picker drops the preview
  const pick = (r: PickRow) => { setSel(r.key); preview(r.inUse ? null : previewRow(store.tank, r)); };
  const choose = (r: PickRow | undefined) => {
    if (!r || r.inUse) { onClose(); return; }
    preview(null);
    if (r.opt) { const o = r.opt; store.edit(s => chooseCommercial(s, o)); pinPreset(store.scene.active, store.tank, saleOf(o.m, o.v ?? soleProduct(o.m))); }
    else store.edit(s => chooseCustom(s, r.custom!));
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' && e.key !== 'ArrowDown') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!visible.length) return;
      const i = visible.findIndex(r => r.key === sel), n = i < 0 ? (e.key === 'ArrowDown' ? 0 : visible.length - 1) : Math.max(0, Math.min(visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      pick(visible[n]); setTimeout(() => listRef.current?.querySelector(`[data-key="${CSS.escape(visible[n].key)}"]`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && cur) { e.preventDefault(); choose(cur); }
  };
  const row = (r: PickRow) => (
    <div class={`card media pick${r.key === sel ? ' sel' : ''}${r.inUse ? ' inuse' : ''}`} role="option" aria-selected={r.key === sel} data-key={r.key} onClick={() => pick(r)} onDblClick={() => choose(r)}>
      <span class="thumb tthumb"><Icon name="tank" /></span>
      <span class="pbody"><div class="t">{r.name}</div><div class="m">{r.meta}{r.price && !r.opt ? '' : r.price ? ` · ${r.price}` : ''}</div>
        {r.inUse || r.owned ? <div class="pills">{r.inUse ? <Pill tone="accent">In use</Pill> : null}{r.owned ? <Pill tone="ok">Owned</Pill> : null}</div> : null}</span>
      <span class="acts">
        {r.range ? <span class="range" title="A rough finished tank at this size, lightly stocked at the low end, semi-professional at the high end">{r.range}</span> : null}
        {r.custom ? <><span class="range">{r.price ?? ''}</span><button type="button" class="btn sm ghost" onClick={e => { e.stopPropagation(); onMaker({ how: 'lib', id: r.custom!.id }); }}>Edit</button></> : null}
        <button type="button" class={`btn icon sm ghost lockbtn${r.locked ? ' on' : ''}`} aria-pressed={r.locked} disabled={!r.inUse}
          title={r.inUse ? (r.locked ? 'Used for sure: Discover and Suggest keep this tank. Click to release.' : 'Use this one for sure') : 'Choose this tank first, then lock it'}
          onClick={e => { e.stopPropagation(); store.edit(s => { s.locks = isLocked(s, 'tank') ? unlockObject(s, 'tank') : lockObject(s, 'tank'); }); }}><Icon name="lock" /></button>
      </span>
    </div>
  );
  return (
    <section class="panel picker" aria-label="Choose a tank" onKeyDown={onKey}>
      <div class="sec-head"><button type="button" class="btn icon ghost" aria-label="Back to the Tank section" title="Back (Esc)" onClick={onClose}>◂</button><h2>Choose a tank</h2><span class="hint">arrow keys flip, the tank redraws</span></div>
      <div class="sec-body" ref={listRef} role="listbox" aria-label="Tanks" tabIndex={-1}>
        <label class="search"><Icon name="search" /><input class="input" type="search" placeholder="Search tanks" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} aria-label="Search tanks" /></label>
        <div class={`group${showCustom ? ' open' : ''}`}>
          <button type="button" class="gh" aria-expanded={showCustom} onClick={() => flip('custom')}>Custom tanks <span class="n">{lib.length}</span><span class="sum">{showCustom ? 'yours, kept across setups' : customLine(lib)}</span></button>
          {showCustom ? <div class="gb">{custom.map(row)}{!custom.length && searching ? <div class="hint">No custom tank matches.</div> : null}
            <button type="button" class="btn sm" onClick={() => onMaker({ how: 'new' })}><Icon name="plus" /> New custom tank</button></div> : null}
        </div>
        {showCustom ? null : <button type="button" class="btn sm newct" onClick={() => onMaker({ how: 'new' })}><Icon name="plus" /> New custom tank</button>}
        <div class={`group${showComm ? ' open' : ''}`}>
          <button type="button" class="gh" aria-expanded={showComm} onClick={() => flip('commercial')}>Commercial tanks <span class="n">{comm.total}</span><span class="sum">{showComm ? 'fixed size and build' : commercialLine(S, comm.total).replace(/^\d+ · /, '')}</span></button>
          {showComm ? <div class="gb">
            <div class="chips">
              {SIZE_CHIPS.map(([c, t]) => <button type="button" class={`chip${chips.has(c) ? ' on' : ''}`} aria-pressed={chips.has(c)} onClick={() => { const n = new Set(chips); if (n.has(c)) n.delete(c); else n.add(c); setChips(n); }}>{t}</button>)}
              <button type="button" class={`chip${fits ? ' on' : ''}`} aria-pressed={fits} disabled={comm.noSpace} title={comm.noSpace ? 'Set your space in Constraints first (comes in shell step 5)' : 'Only tanks that fit the space you set'} onClick={() => setFits(!fits)}>Fits my space</button>
            </div>
            {comm.rows.length < comm.total ? <div class="hint">{comm.rows.length} of {comm.total} shown</div> : null}
            {comm.rows.map(row)}
            {!comm.rows.length ? <div class="hint">No commercial tank matches.</div> : null}
          </div> : null}
        </div>
        {!showCustom && !showComm ? <div class="hint">Open a group to browse; the tank you flip to redraws in the room.</div> : null}
      </div>
      {cur ? <div class="pickfoot"><button type="button" class="btn primary wide" onClick={() => choose(cur)}>{cur.inUse ? `Keep ${cur.name}` : `Choose ${cur.name}`}</button></div> : null}
    </section>
  );
}
