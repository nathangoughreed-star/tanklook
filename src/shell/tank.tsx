// UI2 shell step 3 (lane S3, 2026-11-13): the Tank section (screen map §2a, mockup 01) and its docked tank picker (mockups 06 / 06b).
// Components only draw logic/tank.ts and call its edits; the custom tank maker is its own workspace (maker.tsx).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { OPEN_EVENT } from './open';
import { KITS_EVENT } from './kits';
import { hasWork } from '../ui/newTank';
import { takeOpen } from './logic/sections';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { STAND_FINISHES } from '../render/build';
import { LIMITS } from '../scene/validate';
import { fromUnit, toUnit, volume, IN } from '../scene/physics';
import { setLid, lidLocked, takeStandNote, clearStandNote, setDoors, doorLocked, type DoorKind } from '../scene/tankEdit';
import { lockNote } from '../scene/integrated';
import { lockObject, unlockObject, isLocked } from '../scene/locks';
import { placementOf, putOnFloor, putOnStand, putOnMyFurniture, putOnFurniture, minTop, setStandProduct, type Placement } from '../scene/placement';
import { standsFor, standOf, standProduct, standRatingLine, standCheck, GENERIC_STAND_NOTE, type StandProduct } from '../data/stands';
import { tankKind, type SetupKind } from '../scene/pickerKind';
import { keepInWater } from '../scene/water';
import { clampItem } from '../scene/items';
import { loadLibrary, type CustomTank } from '../scene/customTanks';
import { pinPreset } from '../demand/pinned';
import { soleProduct } from '../data/tanks';
import {
  modelCard, sitsOnSummary, lidSummary, bgSummary, bdShown, bdDepthShown, BD_KINDS, BD_TITLE, BD_DEPTH_MM, len, LIDS, lidHeld, customRows, customLine, commercialRows, commercialLine,
  previewRow, chooseCommercial, chooseCustom, saleOf, filledLb, SIZE_CHIPS, loadGroups, saveGroups, GROUP_DEFAULT, type PickRow, type SizeChip, type TankGroup, type Units, kindView, setKind,
  conditionWord, CONDITION_STOPS, setCondition, bgArcShown, arcText, setBgArc, PIC_SIDES, PIC_FITS, PIC_MAX, addPicture, removePicture, togglePicSide, setPicFit, setPicScale,
  hoodView, chooseHood, lidProductView, chooseLidProduct, tablePos, setTableX, setTableZ, placeTank, setStandFinish, finishCss, tableOn,
} from './logic/tank';
import { getImage, putImage, readPicture } from '../scene/images';
import { Group, Icon, Pill } from './ui';
import { lidView, lidFix, lidFreeView, setNoLid } from './logic/lidTemp';
import { demandFor } from './logic/checks';
import { SITS_TILES, BG_TILES, sitsTileOn, tileSrc } from './logic/tankTiles';
import { defaultProfile } from '../demand/types';
import { TankFilters } from './tankFilters';
import { freshFilter, loadFilter, saveFilter, type TankFilter } from './logic/tankFilter';
import { waterLook, setLevel, setTint, setColor, applyPreset } from './logic/animals';

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
  // CM2: a click on the stand / lid in the view asks for its group (open.ts): open it and bring it into view
  useEffect(() => {
    const take = () => {
      const k = takeOpen('tank') as TankGroup | undefined; if (!k || !(k in GROUP_DEFAULT)) return;
      setG(p => { const n = { ...p, [k]: true }; saveGroups(n); return n; });
      setTimeout(() => document.querySelector(`[data-group="${k}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
    };
    take(); addEventListener(OPEN_EVENT, take); return () => removeEventListener(OPEN_EVENT, take);
  }, []);
  return [g, flip] as const;
}

// ---------------------------------------------------------------- Tank section

function KindRow({ store, S }: { store: Store; S: TankSetup }) {
  const k = kindView(S), [said, setSaid] = useState('');
  if (k.opts.length < 2) return null;
  return (
    <div class="field"><div class="cap" title="What the setup is: the Animals list and the clear-water colour follow">Type</div>
      <Seg<SetupKind> label="Kind" value={k.on} opts={k.opts.map(([id, t]) => [id, t] as [SetupKind, string])} onPick={v => setSaid(setKind(store, v))} />
      {said ? <div class="hint" role="status">{said}</div> : null}</div>
  );
}

export function TankSection({ store, onPicker, onMaker, libN }: { store: Store; onPicker: () => void; onMaker: (h: MakerHow) => void; libN: number }) {
  const S = store.tank, u = store.scene.units;
  const lib = useMemo(() => loadLibrary(), [libN]);
  const [g, flip] = useGroups();
  const card = modelCard(S, u, lib);
  return (
    <>
      <Group id="model" title="Tank model" sum={card.sum} open={g.model} onToggle={() => flip('model')}>
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

      <WaterLook store={store} open={g.water} onToggle={() => flip('water')} />
      <SitsOn store={store} S={S} u={u} open={g.sits} onToggle={() => flip('sits')} />
      <LidTop store={store} S={S} open={g.lid} onToggle={() => flip('lid')} />
      <Background store={store} S={S} u={u} open={g.bg} onToggle={() => flip('bg')} />
    </>
  );
}

/** AT1 (R41): Water look (level, tint, colour, presets) lives with the tank, not with the animals. R84 (Nathan 2026-11-15): the group is "Water" and holds the water type (fresh / salt) on top. */
function WaterLook({ store, open, onToggle }: { store: Store; open: boolean; onToggle: () => void }) {
  const wl = waterLook(store.tank, store.scene.units), kv = kindView(store.tank), kt = kv.opts.find(([id]) => id === kv.on)?.[1];
  return (
    <Group title="Water" sum={[kt, wl.on ? `${wl.levelText} · ${wl.tintText}` : 'off'].filter(Boolean).join(' · ')} open={open} onToggle={onToggle}>
      <KindRow store={store} S={store.tank} />
      {wl.off ? <div class="hint">{wl.off}</div> : null}
      <div class="row"><span class="lbl">Level</span>
        <input class="slider" type="range" min={0.1} max={1} step={0.01} value={wl.level} disabled={!wl.on} aria-label="Water level" onInput={e => setLevel(store, +(e.target as HTMLInputElement).value)} />
        <span class="val">{wl.levelText}</span></div>
      <div class="row"><span class="lbl">Tint</span>
        <input class="slider" type="range" min={0} max={0.95} step={0.01} value={wl.opacity} disabled={!wl.on} aria-label="Water tint" onInput={e => setTint(store, +(e.target as HTMLInputElement).value)} />
        <span class="val">{wl.tintText}</span></div>
      <div class="row"><span class="lbl">Colour</span>
        <input type="color" class="colorbox" value={wl.color} disabled={!wl.on} aria-label="Water colour" onInput={e => setColor(store, (e.target as HTMLInputElement).value)} /><span /></div>
      <div class="row"><span class="lbl" title="How long since the tank was cleaned: algae on the glass, rocks, wood and substrate. Only changes the look.">Condition</span>
        <input class="slider" type="range" min={0} max={100} step={1} value={Math.round(store.tank.condition.level * 100)} aria-label="Condition: how long since the tank was cleaned" onInput={e => store.edit(s => setCondition(s, +(e.target as HTMLInputElement).value / 100), { coalesce: 'cond' })} />
        <span class="val" data-testid="cond-word">{conditionWord(store.tank.condition.level)}</span></div>
      <div class="condstops" role="group" aria-label="Condition presets">{CONDITION_STOPS.map(([l, w]) => <button type="button" class={`condstop${conditionWord(store.tank.condition.level) === w ? ' on' : ''}`} aria-pressed={conditionWord(store.tank.condition.level) === w} title={`${w}: algae on the glass and rock`}
        onClick={() => store.edit(s => setCondition(s, l))}><span class="condpic" style={{ '--algae': l } as never} /><small>{w}</small></button>)}</div>
      <div class="chips">{wl.presets.map(p => <button type="button" class={`chip${wl.current === p.id ? ' on' : ''}`} disabled={!wl.on} onClick={() => applyPreset(store, p)}>{p.label}</button>)}</div>
      <div class="hint">Condition shows the tank weeks after a clean, or neglected: algae on the glass, then on the lit tops of rock and wood; it only changes the look. Tint is how much of the colour shows through 12 in of water, so a deeper tank looks more tinted. The water numbers (temperature) are in the Water check.</div>
    </Group>
  );
}

function SitsOn({ store, S, u, open, onToggle }: { store: Store; S: TankSetup; u: Units; open: boolean; onToggle: () => void }) {
  const p = placementOf(S), tb = S.stand.table;
  const place = (v: Placement) => store.edit(s => { if (v === 'floor') putOnFloor(s); else if (v === 'stand') putOnStand(s); else putOnMyFurniture(s); });
  const furn = (o: Partial<{ shape: 'rect' | 'round'; L: number; D: number; height: number }>, c?: string) =>
    store.edit(s => { const t = s.stand.table; putOnFurniture(s, { shape: t.shape, L: t.L, D: t.D, height: s.stand.height, ...o }); }, c ? { coalesce: c } : {});
  const min = p === 'furniture' ? minTop(S, tb.shape) : null, product = !!S.stand.product && standOf(S)?.id === S.stand.product, standNote = takeStandNote();
  return (
    <Group id="sits" title="Sits on" sum={sitsOnSummary(S, u)} open={open} onToggle={onToggle}>
      <PicTiles label="Sits on" tiles={SITS_TILES} on={sitsTileOn(S)} onPick={place} />
      {S.stand.need === 'ask' && !S.stand.show ? <div class="hint">Not chosen yet: the budget counts a typical stand until you pick.</div> : null}
      {p === 'stand' ? <>
        {standNote ? <div class="hint warn" role="status" data-testid="stand-note">{standNote}</div> : null}
        {!product ? <>
        <div class="row"><span class="lbl">Style</span>
          <select class="select" aria-label="Stand style" value={`${S.stand.style === 'frame' ? 'frame' : 'cabinet'}|${S.stand.finish}`}
            onChange={e => { const [st, f] = (e.target as HTMLSelectElement).value.split('|'); store.edit(s => putOnStand(s, { style: st as 'cabinet' | 'frame', finish: f as TankSetup['stand']['finish'] })); }}>
            {(['cabinet', 'frame'] as const).flatMap(st => (Object.keys(STAND_FINISHES) as TankSetup['stand']['finish'][]).map(f => <option value={`${st}|${f}`}>{st === 'cabinet' ? 'Cabinet' : 'Open frame'}, {STAND_FINISHES[f].label.toLowerCase()}</option>))}
          </select><span /></div>
        <FinishRow store={store} S={S} />
        <LenRow label="Height" mm={S.stand.height} min={LIMITS.stand[0]} max={LIMITS.stand[1]} u={u} onMm={(mm, done) => store.edit(s => { s.stand.height = mm; }, done ? {} : { coalesce: 'standH' })} />
        </> : null}
        <TablePos store={store} S={S} u={u} />
        <StandPicker S={S} store={store} />
      </> : null}
      {p === 'furniture' ? <>
        <LenRow label="Height" mm={S.stand.height} min={LIMITS.stand[0]} max={LIMITS.stand[1]} u={u} onMm={(mm, done) => furn({ height: mm }, done ? undefined : 'furnH')} />
        <div class="row"><span class="lbl">Top</span><Seg label="Top shape" value={tb.shape} opts={[['rect', 'Rectangular'], ['round', 'Round']]} onPick={v => furn({ shape: v, L: v === 'round' ? Math.max(tb.L, tb.D) : tb.L })} /><span /></div>
        <LenRow label={tb.shape === 'round' ? 'Diameter' : 'Length'} mm={tb.L} min={min!.L} max={240 * IN} u={u} onMm={(mm, done) => furn({ L: mm }, done ? undefined : 'furnL')} />
        {tb.shape === 'rect' ? <LenRow label="Depth" mm={tb.D} min={min!.D} max={96 * IN} u={u} onMm={(mm, done) => furn({ D: mm }, done ? undefined : 'furnD')} /> : null}
        <FinishRow store={store} S={S} />
        <TablePos store={store} S={S} u={u} />
        <div class="hint">This tank needs a top at least {tb.shape === 'round' ? `${len(min!.L, u)} across` : `${len(min!.L, u)} × ${len(min!.D, u)}`}.</div>
      </> : null}
    </Group>
  );
}

/** VT1: a grid of picture tiles (baked still + label), one chosen; reflows from 4+ columns to 2 on a phone. The picture is optional: a missing file leaves the label. */
function PicTiles<T extends string>({ label, tiles, on, onPick }: { label: string; tiles: { id: T; label: string; sub?: string; img: string }[]; on: T | ''; onPick: (v: T) => void }) {
  const [bad, setBad] = useState<Record<string, boolean>>({});
  return (
    <div class="vtgrid" role="group" aria-label={label} data-testid={`tiles-${label.toLowerCase().replace(/\W+/g, '-')}`}>
      {tiles.map(t => <button type="button" class={`vttile${on === t.id ? ' on' : ''}`} aria-pressed={on === t.id} data-tile={t.id} title={t.sub ? `${t.label}: ${t.sub}` : t.label} onClick={() => onPick(t.id)}>
        <span class="vtpic">{bad[t.img] ? null : <img src={tileSrc(import.meta.env.BASE_URL, t.img)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setBad(b => ({ ...b, [t.img]: true }))} />}</span>
        <span class="vtlbl">{t.label}</span>{t.sub ? <small>{t.sub}</small> : null}
      </button>)}
    </div>
  );
}

/** TS1 (rank 10): the stand / table finish as swatches (the old Finish select). */
function FinishRow({ store, S }: { store: Store; S: TankSetup }) {
  return (
    <div class="row"><span class="lbl">Finish</span><div class="finsw" role="group" aria-label="Stand finish">
          {(Object.keys(STAND_FINISHES) as TankSetup['stand']['finish'][]).map(f => <button type="button" class={`finbtn${S.stand.finish === f ? ' on' : ''}`} aria-pressed={S.stand.finish === f} title={STAND_FINISHES[f].label}
            onClick={() => store.edit(s => setStandFinish(s, f))}><span class="finchip" style={{ background: finishCss(f) }} /><small>{STAND_FINISHES[f].label}</small></button>)}</div><span /></div>
  );
}

/** TS1 (parity audit rank 10): where the tank sits on a table top; the old panel's two sliders and Centre / Back / Front. Shown only on a table or custom stand. */
function TablePos({ store, S, u }: { store: Store; S: TankSetup; u: Units }) {
  if (!tableOn(S)) return null;
  const tp = tablePos(S, mm => len(mm, u)), step = u === 'in' ? 0.5 : 1;
  const sl = (label: string, v: number, lo: number, hi: number, text: string, set: (s: TankSetup, mm: number) => void, key: string, neg: string, pos: string) => (
    <div class="row"><span class="lbl">{label}</span>
      <input class="slider" type="range" min={toUnit(lo, u)} max={toUnit(hi, u)} step={step} value={toUnit(v, u)} aria-label={`${label}: ${neg} to ${pos}`} onInput={e => store.edit(s => set(s, fromUnit(+(e.target as HTMLInputElement).value, u)), { coalesce: key })} />
      <span class="val" data-testid={`${key}-text`}>{text}</span></div>);
  return (
    <div class="tablepos" data-testid="table-pos">
      {sl('Left / right', tp.x, tp.x0, tp.x1, tp.xText, setTableX, 'tableX', 'left', 'right')}
      {sl('Front / back', tp.z, tp.z0, tp.z1, tp.zText, setTableZ, 'tableZ', 'front', 'back')}
      <div class="acts-row" role="group" aria-label="Place the tank on the top">
        {(['centre', 'back', 'front'] as const).map(w => <button type="button" class="btn sm" onClick={() => store.edit(s => placeTank(s, w))}>{w === 'centre' ? 'Centre' : w === 'back' ? 'Back' : 'Front'}</button>)}
      </div>
    </div>
  );
}

/** LW1: the open top's warning (who needs a lid), the one-click fix with its price, the pros and cons of going without, and the "lid-free anyway" choice. */
function OpenTop({ store, S }: { store: Store; S: TankSetup }) {
  const v = lidView(S), pc = lidFreeView(S);
  const fix = lidFix(S, T => demandFor(T, store.scene.active, defaultProfile()).totals.setupUsd);
  return (
    <div class="opentop" data-open-top>
      {v.warn ? <div class="why warn lidwarn" role="status"><b>Problem:</b> {v.warn.text}{fix ? <> <button type="button" class="linkbtn" title={fix.describe} onClick={() => store.edit(s => { fix.apply(s); })}>{fix.what}</button></> : null}</div> : null}
      <div class="lidpc">
        <div><b>No lid: what you get</b><ul>{pc.pros.map(x => <li>{x}</li>)}</ul></div>
        <div><b>What it costs</b><ul>{pc.cons.map(x => <li>{x}</li>)}</ul></div>
      </div>
      <div class="row"><button type="button" class={`btn${v.lidFree ? ' on' : ''}`} aria-pressed={v.lidFree} onClick={() => store.edit(s => setNoLid(s, !v.lidFree))}>{v.lidFree ? 'Lid-free: your choice (tap to undo)' : 'Go lid-free anyway'}</button></div>
    </div>
  );
}

/** TK2: the hood products sold for this tank, as picture tiles like the stands (brand, name, price, store, which tanks); the live view draws the chosen one. */
function HoodPicker({ store, S }: { store: Store; S: TankSetup }) {
  const v = hoodView(S), [bad, setBad] = useState<Record<string, boolean>>({});
  if (v.none) return <div class="hint" data-testid="hood-none">No hood product is sold for this size, so a glass lid is the usual choice.</div>;
  return (
    <div class="standpick" role="group" aria-label="Hoods that fit this tank" data-testid="hood-picker">
      <div class="cap">Hoods that fit this tank <span class="n">{v.tiles.length}</span></div>
      <div class="pgrid">
        {v.tiles.map(t => (
          <button type="button" class={`ptile stile${t.on ? ' on' : ''}`} aria-pressed={t.on} data-hood={t.id} onClick={() => store.edit(s => chooseHood(s, t.id))}>
            <div class="tart">{bad[t.id] ? null : <img class="stillart" src={`${import.meta.env.BASE_URL}gallery/gear/${t.art}.webp`} alt={`${t.brand} ${t.name}`} loading="lazy" onError={() => setBad(b => ({ ...b, [t.id]: true }))} />}</div>
            <div class="tname">{t.brand}</div>
            <div class="tmeta"><span>{t.price}</span></div><div class="tmeta"><span>{t.name.startsWith(t.brand + ' ') ? t.name.slice(t.brand.length + 1) : t.name}</span></div>
            <small class="why">{t.store} · {t.fits}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** TL1 (R123): the glass lids / mesh tops sold for this tank, as tiles like the hoods; picking one sets the lid to its kind. */
function LidProductPicker({ store, S }: { store: Store; S: TankSetup }) {
  const v = lidProductView(S), what = v.kind === 'mesh' ? 'Mesh tops' : 'Glass lids';
  if (v.none) return <div class="hint" data-testid="lidprod-none">No {what.toLowerCase()} are listed for this size yet; the price shown is a typical estimate.</div>;
  return (
    <div class="standpick" role="group" aria-label={`${what} that fit this tank`} data-testid="lidprod-picker">
      <div class="cap">{what} that fit this tank <span class="n">{v.tiles.length}</span></div>
      <div class="pgrid">
        {v.tiles.map(t => (
          <button type="button" class={`ptile stile${t.on ? ' on' : ''}`} aria-pressed={t.on} data-lidprod={t.id} onClick={() => store.edit(s => chooseLidProduct(s, t.id))}>
            <div class="tname">{t.brand}</div>
            <div class="tmeta"><span>{t.price}</span></div><div class="tmeta"><span>{t.name.startsWith(t.brand + ' ') ? t.name.slice(t.brand.length + 1) : t.name}</span></div>
            <small class="why">{t.store} · {t.fits}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function LidTop({ store, S, open, onToggle }: { store: Store; S: TankSetup; open: boolean; onToggle: () => void }) {
  const held = lidHeld(S), k = tankKind(S), dry = k === 'terrarium' || k === 'vivarium';
  const lidWhy = (l: TankSetup['lid']) => lidLocked(S.tank, held.lid, l) && l !== S.lid ? (held.lid ? lockNote(S, 'lid') : 'A hood fits box, bow and curved-front tanks only') : false;
  return (
    <Group id="lid" title="Lid and top" sum={lidSummary(S)} open={open} onToggle={onToggle}>
      <Seg label="Lid" value={S.lid} opts={LIDS} disabled={lidWhy} onPick={l => store.edit(s => { setLid(s, l); setNoLid(s, l === 'open'); })} />
      {held.lid ? <div class="hint">{lockNote(S, 'lid')}</div> : S.bundleLid && S.lid !== 'open' ? <div class="hint" data-testid="bundle-lid">{lockNote(S, 'lid')}{S.lid === 'hood' && !S.hoodProduct ? ' Pick a hood below to swap it for a catalogue one.' : ''}</div> : null}
      {S.lid === 'open' && !held.lid ? <OpenTop store={store} S={S} /> : null}
      {S.lid === 'hood' && !held.lid ? <HoodPicker store={store} S={S} /> : null}
      {(S.lid === 'glass' || S.lid === 'mesh') && !held.lid ? <LidProductPicker store={store} S={S} /> : null}
      {dry ? <div class="row"><span class="lbl">Front doors</span>
        <Seg<DoorKind> label="Front doors" value={S.doors ?? 'none'} opts={[['none', 'None'], ['hinged', 'Hinged'], ['sliding', 'Sliding']]}
          disabled={d => doorLocked(S, d, held.doors) ? (held.doors ? lockNote(S, 'doors') : 'Doors fit box tanks only') : false} onPick={d => store.edit(s => setDoors(s, d))} /><span /></div> : null}
    </Group>
  );
}

const SIDES = [['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['front', 'Front']] as const;
/** After the background's sides change the 3D wall follows them: animals and pieces are kept in front of it (the old shell's wallFit). */
const wallFit = (s: TankSetup) => { keepInWater(s); for (const it of s.items) clampItem(it, s.tank, s); };

function Background({ store, S, u, open, onToggle }: { store: Store; S: TankSetup; u: Units; open: boolean; onToggle: () => void }) {
  return (
    <Group title="Background" sum={bgSummary(S)} open={open} onToggle={onToggle}>
      <PicTiles label="Background" tiles={BG_TILES} on={S.render.bg} onPick={v => store.edit(s => { s.render.bg = v; })} />
      {S.render.bg === 'custom' ? <div class="row"><span class="lbl">Colour</span><input type="color" aria-label="Background colour" value={S.render.bgColor ?? '#2f4a36'} onInput={e => store.edit(s => { s.render.bgColor = (e.target as HTMLInputElement).value; }, { coalesce: 'bgColor' })} /><span /></div> : null}
      {S.render.bg !== 'none' ? <div class="row"><span class="lbl">On sides</span><div class="chips">
        {SIDES.map(([v, t]) => { const on = S.render.bgSides.includes(v); return <button type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on}
          onClick={() => store.edit(s => { const b = s.render.bgSides; s.render.bgSides = b.includes(v) ? b.filter(x => x !== v) : [...b, v]; wallFit(s); })}>{t}</button>; })}
      </div><span /></div> : null}
      {bgArcShown(S) ? <div class="row"><span class="lbl" title="How much of the round wall the background covers, centred on each chosen side">Arc</span>
        <input class="slider" type="range" min={20} max={360} step={5} value={S.render.bgArc} aria-label="Background arc" onInput={e => store.edit(s => setBgArc(s, +(e.target as HTMLInputElement).value), { coalesce: 'bgArc' })} />
        <span class="val">{arcText(S.render.bgArc)}</span></div> : null}
      <BgPictures store={store} S={S} />
      {bdShown(S) ? <>
        <div class="row" title={BD_TITLE}><span class="lbl">3D background</span>
          <select class="select" aria-label="3D background" title={BD_TITLE} value={S.backdrop.kind} onChange={e => store.edit(s => { s.backdrop.kind = (e.target as HTMLSelectElement).value as TankSetup['backdrop']['kind']; wallFit(s); })}>
            {BD_KINDS.map(([k, l]) => <option value={k}>{l}</option>)}
          </select>
          {S.backdrop.kind !== 'none' ? <button type="button" class="chip" title="Another arrangement of the same wall" onClick={() => store.edit(s => { s.backdrop.seed = 1 + Math.floor(Math.random() * 1e6); })}>Shuffle</button> : <span />}
        </div>
        {bdDepthShown(S) ? <LenRow label="Depth" mm={S.backdrop.depth} min={BD_DEPTH_MM[0]} max={BD_DEPTH_MM[1]} u={u} step={u === 'in' ? 0.25 : 5}
          onMm={(mm, done) => store.edit(s => { s.backdrop.depth = mm; wallFit(s); }, done ? {} : { coalesce: 'bdDepth' })} /> : null}
        {bdDepthShown(S) ? <div class="hint">It takes up depth: animals and plants stay in front of it.</div> : null}
      </> : null}
    </Group>
  );
}

/** TS1 (parity audit rank 9): your own pictures on the glass, up to 4, each on one side or round a corner; fit mode, tile size, remove. Pictures live in scene/images by id. */
function BgPictures({ store, S }: { store: Store; S: TankSetup }) {
  const [say, setSay] = useState<{ t: string; bad: boolean } | null>(null);
  const file = useRef<HTMLInputElement>(null), L = S.render.bgImages;
  const onFile = async (e: Event) => {
    const inp = e.target as HTMLInputElement, f = inp.files?.[0]; inp.value = ''; if (!f) return;
    if (store.tank.render.bgImages.length >= PIC_MAX) { setSay({ t: `At most ${PIC_MAX} background pictures per tank.`, bad: true }); return; }
    let data: string; try { data = await readPicture(f); } catch { setSay({ t: 'That file is not a picture this browser can read.', bad: true }); return; }
    const { id, stored } = putImage(data); let r = { ok: false, say: '' };
    store.edit(s => { r = addPicture(s, id); });
    setSay({ t: r.say + (r.ok && !stored ? ' This browser’s storage is full, so the picture is kept for this visit only; Save as… keeps it in the file.' : ''), bad: !r.ok || !stored });
  };
  return (
    <div class="bgpics" data-testid="bg-pictures">
      <div class="row"><span class="lbl" title="Your own pictures on the glass: each on one side, or running round a corner across sides that touch.">Pictures</span>
        <button type="button" class="btn sm" disabled={L.length >= PIC_MAX} onClick={() => file.current?.click()}>Add picture…</button>
        <span class="val">{L.length}/{PIC_MAX}</span>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onFile} /></div>
      {L.map(b => { const data = getImage(b.img); return (
        <div class="bgpic card" data-img={b.img}>
          {data ? <img class="bgthumb" alt="" src={data} /> : <span class="bgthumb missing" title="This picture is not in this browser (share links do not carry pictures; a downloaded file does)">missing</span>}
          <div class="bgctl">
            <div class="chips">{PIC_SIDES.map(([k, t]) => { const on = b.sides.includes(k); return <button type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on} data-side={k}
              onClick={() => { let why = ''; store.edit(s => { why = togglePicSide(s, b.img, k); }); setSay(why ? { t: why, bad: true } : null); }}>{t}</button>; })}</div>
            <div class="row"><select class="select" aria-label="Picture fit" value={b.fit} onChange={e => store.edit(s => setPicFit(s, b.img, (e.target as HTMLSelectElement).value as typeof b.fit))}>
              {PIC_FITS.map(([k, t, tip]) => <option value={k} title={tip}>{t}</option>)}</select>
              <button type="button" class="btn sm ghost" aria-label="Remove picture" title="Remove this picture" onClick={() => store.edit(s => removePicture(s, b.img))}>✕</button></div>
            {b.fit === 'tile' ? <div class="row"><span class="lbl">Size</span>
              <input class="slider" type="range" min={LIMITS.bgScale[0]} max={LIMITS.bgScale[1]} step={5} value={b.scale} aria-label="Tile size" title="Tile height, % of the tank height" onInput={e => store.edit(s => setPicScale(s, b.img, +(e.target as HTMLInputElement).value), { coalesce: 'bgScale:' + b.img })} />
              <span class="val">{b.scale}%</span></div> : null}
          </div>
        </div>); })}
      {say ? <div class={`hint${say.bad ? ' warn' : ''}`} role="status">{say.t}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------- the docked picker

export function TankPicker({ store, preview, onClose, onMaker, libN }: { store: Store; preview: (S: TankSetup | null) => void; onClose: () => void; onMaker: (h: MakerHow) => void; libN: number }) {
  const S = store.tank, u = store.scene.units;
  const lib: CustomTank[] = useMemo(() => loadLibrary(), [libN]);
  const [g, flip] = useGroups();
  const [q, setQ] = useState('');
  const [chips, setChips] = useState<Set<SizeChip>>(new Set());
  const [fits, setFits] = useState(false), [sale, setSale] = useState(false);
  const [tf, setTf] = useState<TankFilter>(() => loadFilter()); // TP1: remembered per browser
  const setFilter = (n: TankFilter) => { setTf(n); saveFilter(n); };
  const clearAll = () => { setFilter({ ...freshFilter(), sort: tf.sort }); setChips(new Set()); setFits(false); setSale(false); };
  const [sel, setSel] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searching = !!q.trim();
  const custom = customRows(S, lib, u, q), comm = useMemo(() => commercialRows(S, u, { q, chips, fits, sale, f: tf }), [S, u, q, chips, fits, sale, tf]);
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
      <TankTile r={r} />
      <span class="pbody"><div class="t">{r.name}</div><div class="m">{r.meta}{r.price ? ` · ${r.price}` : ''}</div>
        {r.sale ? <div class="m sale" data-sale>{r.sale.text}</div> : null}
        {r.comes ? <div class="m">comes with: {r.comes}</div> : null}
        {r.range ? <div class="m range" title="A rough finished tank at this size: lightly stocked with cheap decor at the low end, semi-professional at the high end">finished {r.range}</div> : null}
        {r.inUse || r.owned ? <div class="pills">{r.inUse ? <Pill tone="accent">In use</Pill> : null}{r.owned ? <Pill tone="ok">Owned</Pill> : null}</div> : null}</span>
      <span class="acts">
        {r.custom ? <><button type="button" class="btn sm ghost" onClick={e => { e.stopPropagation(); onMaker({ how: 'lib', id: r.custom!.id }); }}>Edit</button></> : null}
        <button type="button" class={`btn icon sm ghost lockbtn${r.locked ? ' on' : ''}`} aria-pressed={r.locked} disabled={!r.inUse}
          title={r.inUse ? (r.locked ? 'Used for sure: Discover and Suggest keep this tank. Click to release.' : 'Use this one for sure') : 'Choose this tank first, then lock it'}
          onClick={e => { e.stopPropagation(); store.edit(s => { s.locks = isLocked(s, 'tank') ? unlockObject(s, 'tank') : lockObject(s, 'tank'); }); }}><Icon name="lock" /></button>
      </span>
    </div>
  );
  return (
    <section class="panel picker" aria-label="Choose a tank" onKeyDown={onKey}>
      <div class="sec-head"><button type="button" class="btn icon ghost" aria-label="Back to the Tank section" title="Back (Esc)" onClick={onClose}>◂</button><h2>Choose a tank</h2>
        <button type="button" class={`btn kitsbtn${hasWork(store.scene) ? ' ghost sm' : ' primary'}`} title="Browse bundles, kits and sales instead of picking a single tank" onClick={() => dispatchEvent(new Event(KITS_EVENT))}>Start from a bundle or kit</button>
        <span class="hint">arrow keys flip, the tank redraws</span></div>
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
              <button type="button" class={`chip${sale ? ' on' : ''}`} aria-pressed={sale} title="Only tanks with a sale price on record; each row says when it was last checked" onClick={() => setSale(!sale)}>On sale</button>
            </div>
            <TankFilters f={tf} set={setFilter} shown={comm.rows.length} total={comm.total} brands={comm.brands} u={u} extra={chips.size + (fits ? 1 : 0) + (sale ? 1 : 0)} onClear={clearAll} />
            <div class="hint" data-testid="tank-count">{comm.rows.length} of {comm.total} shown</div>
            {comm.rows.map(row)}
            {!comm.rows.length ? <div class="hint">{sale ? 'No tank sale is on record.' : 'No commercial tank matches.'}</div> : null}
          </div> : null}
        </div>
        {!showCustom && !showComm ? <div class="hint">Open a group to browse; the tank you flip to redraws in the room.</div> : null}
      </div>
      {cur ? <div class="pickfoot"><button type="button" class="btn primary wide" onClick={() => choose(cur)}>{cur.inUse ? `Keep ${cur.name}` : `Choose ${cur.name}`}</button></div> : null}
    </section>
  );
}

/** TP1: the row's picture, a baked still of our own 3D model of that tank (public/gallery/tanks, shared by tanks that look alike); the generic icon when there is none. */
function TankTile({ r }: { r: PickRow }) {
  const [bad, setBad] = useState(false);
  if (!r.tile || bad) return <span class="thumb tthumb"><Icon name="tank" /></span>;
  return <span class="thumb tthumb tpic"><img src={`${import.meta.env.BASE_URL}gallery/tanks/${r.tile}.webp`} alt="" loading="lazy" onError={() => setBad(true)} /></span>;
}

/** SP1: real stands that fit this tank, as picture tiles (price, style, where sold); "Generic" is the fallback estimate. */
function StandPicker({ S, store }: { S: TankSetup; store: Store }) {
  const lb = filledLb(S), gal = volume(S.tank).gallons, fit = standsFor(S.tank), cur = standOf(S), explicit = !!S.stand.product && !!standProduct(S.stand.product) && cur?.id === S.stand.product;
  if (!fit.length) return <div class="hint" data-testid="stand-generic">No stand product is listed for this size, so the budget uses a generic estimate ({GENERIC_STAND_NOTE.split(': ')[1]}).</div>;
  return (
    <div class="standpick" role="group" aria-label="Stands that fit this tank">
      <div class="cap">Stands that fit this tank <span class="n">{fit.length}</span></div>
      <div class="pgrid">
        {fit.map(p => { const rate = standRatingLine(p), chk = standCheck(p, lb, gal); return (
          <button type="button" class={`ptile stile${cur?.id === p.id ? ' on' : ''}`} aria-pressed={cur?.id === p.id} onClick={() => { clearStandNote(); store.edit(s => setStandProduct(s, p)); }}>
            <div class="tart"><StandArt p={p} /></div>
            <div class="tname">{p.brand} {p.line}</div>
            <div class="tmeta"><span>${Math.round(p.priceUsd)}</span><span>{p.kind === 'cabinet' ? 'Cabinet' : 'Open frame'}, {p.color.split(',')[0].split(' (')[0]}</span></div>
            {rate ? <small class="why rating" data-testid="stand-rating">{rate}</small> : null}
            {chk ? <small class={`why ${chk.level === 'over' ? 'bad' : 'warn'}`} data-testid="stand-check">{chk.text}</small> : null}
            <small class="why">{p.seller}{p.est.includes('priceUsd') ? ' · price is a guess' : ''}</small>
          </button>
        ); })}
        <button type="button" class={`ptile stile${!explicit && !cur ? ' on' : ''}`} onClick={() => { clearStandNote(); store.edit(s => { setStandProduct(s, undefined); }); }} title="Keeps the drawn style and prices a typical stand by tank size">
          <div class="tname">Generic</div><div class="tmeta"><span>estimate</span></div><small class="why">Typical price by tank size, not a product</small>
        </button>
      </div>
    </div>
  );
}
/** A small drawing of the stand in its finish: a cabinet (box, doors) or an open frame (legs, a shelf). */
function StandArt({ p }: { p: StandProduct }) {
  const [bad, setBad] = useState(false); // R96: the baked still of the product's model (public/gallery/stands), the drawing below when it is missing
  if (!bad) return <img class="stillart" src={`${import.meta.env.BASE_URL}gallery/stands/${p.id}.webp`} alt={`${p.brand} ${p.line}`} onError={() => setBad(true)} />;
  const c = '#' + STAND_FINISHES[p.finish].color.toString(16).padStart(6, '0');
  return p.kind === 'cabinet'
    ? <svg viewBox="0 0 80 50" aria-hidden="true"><rect x="4" y="6" width="72" height="5" fill={c} /><rect x="6" y="11" width="68" height="34" fill={c} opacity=".92" /><path d="M40 12v32M34 28h3M43 28h3" stroke="#0007" stroke-width="1.2" /></svg>
    : <svg viewBox="0 0 80 50" aria-hidden="true"><rect x="4" y="6" width="72" height="3" fill={c} /><rect x="8" y="9" width="3" height="37" fill={c} /><rect x="69" y="9" width="3" height="37" fill={c} /><rect x="8" y="34" width="64" height="2" fill={c} /></svg>;
}
