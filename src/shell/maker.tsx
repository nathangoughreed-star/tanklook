// UI2 shell step 3 (lane S3, 2026-11-13): the custom tank maker, its own workspace (screen map §2a, mockup 07) with the glass panel
// (request R30, GS1 solver). The setup is not edited while it is open: the view draws a scratch setup (an empty tank on a plain floor) as a
// preview; Save writes the library (P9) and, for "Save and use", the setup through one store edit.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Tank, TankSetup, TankShape, CameraSettings } from '../scene/types';
import { applyTankEdit, reshape, shapeMemory, setGlass, setRim } from '../scene/tankEdit';
import { addCustomTank, dimName, editCustomTank, loadLibrary, saveLibrary, type CustomTankSpec } from '../scene/customTanks';
import { IN_MM, type BraceLocks, type BraceSpec } from '../scene/glassSolver';
import { customGlass } from '../scene/autoGlass';
import { GlassOptions } from './glassOptions';
import { FailLabels } from './failView';
import { failOverlay } from './failOverlay';
import { EDGE_HELP, EDGE_OPTS, edgeSummary, edgeWarnings, edgeOf } from './logic/edges';
import type { EdgeFinish } from '../scene/customTanks';
import { SizeMode, FreeSize, PolyFreeSize, GlassPriceFields, WideView, type SolveMode } from './glassSolve';
import type { PaneThick, UpgradeOption } from './logic/glassUpgrade';
import type { SizeCell, SolveInputs, SolveToggles } from './logic/tankEnvelope';
import { LIMITS } from '../scene/validate';
import { IN } from '../scene/physics';
import { POLY_MAX, POLY_MIN, pieRadius, pieDepth, polySides, PIE_MIN, PIE_MAX, shapeOf } from '../scene/shape';
import { makerSetup, makerFacts, dimAnchors, placeDims, applyDim, parseLen, setPieAngle, setPolySide, makeRegular, setPolyCount, roundAsPie, type PlacedDim, previewSpec, priceView, chooseCustom, glassText, galText, usd, SHAPE_WORD, SHAPE_MAIN, SHAPE_MORE, SIDE_RANGE, specChanged, type Units } from './logic/tank';
import { glassPanel, defaultChoice, optimizeChoice, startBrace, DISCLAIMER, type GlassChoice, type GlassPanel } from './logic/tankGlass';
import { LenRow, Seg, Toggle } from './tank';
import { Group, Icon, Pill } from './ui';
import type { Viewer } from '../render/viewer';
import { Vector3 } from 'three';

export interface MakerInit { spec: CustomTankSpec; libId?: string }
export type MakerEnd = 'cancel' | 'saved' | 'used';

/** The maker's view: the setup's own camera, turned to show the tank's three sides (restored on close: the setup is not changed). */
// zoom is a field-of-view crop at a fixed eye distance, and below 0.5 the eye also steps back (scene/orbit.ts): measured on the build, the
// drawn size goes as span x zoom^2.15, so this frames every size about as a 24 in tank fills the view at 0.75
const MAKER_CAM = (c: CameraSettings, T: Tank): CameraSettings => ({ ...c, az: -24, el: 14, zoom: Math.max(0.08, Math.min(2.5, 0.75 * (652 / Math.max(T.L, T.H * 1.5, T.D * 1.4)) ** (1 / 2.15))) });

/** The sizes written ON the tank's edges (length / depth / height, or radius / angle / height, or every side of a polygon); redrawn each frame. Click one
 *  to type a new value: Enter or leaving the box applies it (through the same ranges as the side panel), Esc cancels. `onCommit` returns a refusal or null. */
function EdgeLabels({ store, getViewer, T, u, onCommit }: { store: Store; getViewer?: () => Viewer | undefined; T: Tank; u: Units; onCommit: (id: string, raw: string) => string | null }) {
  const [labels, setLabels] = useState<PlacedDim[]>([]);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [err, setErr] = useState<{ id: string; msg: string } | null>(null);
  const key = JSON.stringify([T.L, T.D, T.H, T.sides, T.sideLens, T.pieDeg, T.shape, u]);
  useEffect(() => {
    const v = getViewer?.(); if (!v) return;
    let alive = true;
    const tick = () => {
      const vp = v.vps[store.scene.active]; if (!alive || !vp) return;
      vp.cam.updateMatrixWorld();
      const p = new Vector3();
      const next = placeDims(dimAnchors(T, u), (x, y, z) => { p.set(x, y, z).project(vp.cam); return p.z > 1 ? null : [(p.x + 1) / 2 * vp.w, (1 - p.y) / 2 * vp.h]; });
      setLabels(prev => prev.length === next.length && prev.every((l, i) => l.id === next[i].id && Math.abs(l.x - next[i].x) < 0.5 && Math.abs(l.y - next[i].y) < 0.5 && l.text === next[i].text) ? prev : next);
    };
    tick(); v.onDrawn(tick); v.invalidate();
    return () => { alive = false; };
  }, [key]);
  const live = useRef(false); // one end per edit: Enter / Esc unmount the input, whose blur must not end it a second time
  const done = (apply: boolean) => {
    const e = editing; if (!e || !live.current) return;
    live.current = false;
    setEditing(null);
    if (!apply) { setErr(null); return; }
    const msg = onCommit(e.id, e.text); setErr(msg ? { id: e.id, msg } : null);
  };
  return <>{labels.map(l => editing?.id === l.id
    ? <input key={l.id} class="ov edgelab edgeinput glass" style={{ left: `${l.x}px`, top: `${l.y}px` }} value={editing.text} aria-label={`Edit ${l.id}`} autoFocus
        onInput={e => setEditing({ id: l.id, text: (e.target as HTMLInputElement).value })}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } }}
        onBlur={() => done(true)} ref={el => { if (el && document.activeElement !== el) { el.focus(); el.select(); } }} />
    : <button key={l.id} type="button" class="ov edgelab glass editable" style={{ left: `${l.x}px`, top: `${l.y}px` }} title="Click to type a new size" aria-label={`${l.id} ${l.text}, click to edit`}
        onClick={() => { setErr(null); live.current = true; setEditing({ id: l.id, text: l.text.replace(/ (in|cm)$/, '') }); }}>{l.text}</button>)}
    {err ? <div class="ov mrefuse glass" role="alert">{err.msg}</div> : null}</>;
}

export function Maker({ store, init, viewHost, getViewer, preview, onEnd }: { store: Store; init: MakerInit; viewHost: HTMLElement; getViewer?: () => Viewer | undefined; preview: (S: TankSetup | null) => void; onEnd: (e: MakerEnd) => void }) {
  const u: Units = store.scene.units;
  const [spec, setSpec] = useState<CustomTankSpec>(() => { const sp = structuredClone(init.spec); sp.tank = roundAsPie(sp.tank); return sp; });
  const [refuse, setRefuse] = useState('');
  const [choice, setChoice] = useState<GlassChoice>(() => ({ ...defaultChoice(), bracing: 'optimized' }));
  const [panel, setPanel] = useState<GlassPanel | null>(null);
  const [inSetup, setInSetup] = useState(false);
  const [shownBrace, setShownBrace] = useState<BraceSpec | null>(null); // the last worked-out brace: drawn while the panel recomputes
  const [locks, setLocks] = useState<Record<BraceField, boolean>>({ width: false, thickness: false, cross: false, crossWidth: false });
  const [opt, setOpt] = useState<{ text: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // GS2: the Glass check's Solve for modes (Glass = the check below; Size = the largest tank for this glass; Safety factor = what this glass gives)
  const [solve, setSolve] = useState<SolveMode>('size');
  const [sin, setSin] = useState<SolveInputs>(() => ({ glass: typeof init.spec.glass === 'number' ? init.spec.glass : 0.25 * IN_MM, strip: 0.25 * IN_MM, stripWidth: 3 * IN_MM, depth: null }));
  const [wide, setWide] = useState(false);
  const mem = useRef(shapeMemory());
  const viewRef = useRef<HTMLElement>(null);
  // GS4: the 3D overlay of "Where it fails" is attached for as long as the maker is open (removed with it)
  useEffect(() => { failOverlay.attach(() => getViewer?.(), store, viewHost); return () => failOverlay.detach(); }, []);
  const cam0 = useRef<CameraSettings>(structuredClone(store.tank.camera));
  const name = store.scene.name || 'Untitled';

  // the shared viewer moves into the maker's view; the setup's camera is turned for the maker and put back on close
  useEffect(() => {
    viewRef.current?.prepend(viewHost);
    const set = (c: CameraSettings) => store.update(s => { s.tanks[s.active].camera = c; }, { kind: 'view', history: false });
    set(MAKER_CAM(cam0.current, spec.tank));
    return () => { preview(null); set(cam0.current); };
  }, []);
  // the brace in the panel is drawn at once (before "Use this glass" writes it into the spec)
  const braceKey = JSON.stringify(shownBrace);
  useEffect(() => { preview(inSetup ? previewSpec(store.tank, spec, shownBrace) : makerSetup(spec, store.tank, shownBrace)); }, [spec, inSetup, braceKey]);
  // a new size is framed again once it settles (the person can still orbit and zoom in between)
  useEffect(() => { if (inSetup) return; const t = setTimeout(() => store.update(s => { s.tanks[s.active].camera = { ...s.tanks[s.active].camera, zoom: MAKER_CAM(cam0.current, spec.tank).zoom }; }, { kind: 'view', history: false }), 400); return () => clearTimeout(t); }, [spec.tank.L, spec.tank.D, spec.tank.H]);
  // "Preview in my setup" shows it in the room until the person clicks Back now (no timer; Nathan 2026-11-14, R39)
  useEffect(() => {
    if (!inSetup) return;
    store.update(s => { s.tanks[s.active].camera = cam0.current; }, { kind: 'view', history: false });
    return () => { store.update(s => { s.tanks[s.active].camera = MAKER_CAM(cam0.current, spec.tank); }, { kind: 'view', history: false }); };
  }, [inSetup]);
  // the glass solver runs after edits settle (a box tank: about half a second with the brace optimizer)
  useEffect(() => { setPanel(null); const t = setTimeout(() => { const p = glassPanel(spec.tank, spec.rim, choice, u); setPanel(p); setShownBrace(p.braceNow); }, 250); return () => clearTimeout(t); }, [spec.tank, spec.rim, choice, u]);

  /** Every tank edit runs P1's rules on a scratch setup and reads the spec back; a size / glass change drops a glass build that no longer fits. */
  const edit = (fn: (s: TankSetup) => void, keepBuild = false) => setSpec(sp => {
    const s = makerSetup(sp); fn(s);
    const next: CustomTankSpec = { ...sp, tank: s.tank, glass: s.render.glass, glassType: s.render.glassType, rim: s.render.rim };
    if (!keepBuild) delete next.glassBuild;
    return next;
  });
  const size = (next: (T: Tank) => Tank) => edit(s => applyTankEdit(s, next, { thin: false }), solve === 'size'); // Free: size keeps the glass build: the glass is locked
  /** A box on the preview was edited: parsed in the scene's units, then through the same ranges as the side panel; returns a refusal (or null). */
  const commitDim = (id: string, raw: string): string | null => {
    const deg = id === 'A' ? parseFloat(raw) : undefined, mm = id === 'A' ? 1 : parseLen(raw, u);
    if (mm == null) return `"${raw.trim()}" is not a length${u === 'in' ? ' (inches, like 36 or 3 1/2)' : ' (centimeters)'}.`;
    const r = applyDim(spec.tank, id, mm, deg);
    if ('error' in r) { setRefuse(r.error); return r.error; }
    size(r.edit); setRefuse(r.note ?? ''); return null;
  };
  const T = spec.tank, shape = shapeOf(T), facts = useMemo(() => makerFacts(spec, u), [spec, u]), price = priceView(spec);
  const gNow = customGlass(spec.glass, T, spec.rim);
  const changed = specChanged(spec, init.spec);

  const key = () => JSON.stringify([spec.tank, choice]);
  /** The Optimize button: fills the unlocked brace fields with the least glass that meets the safety factor. */
  const optimize = () => {
    setBusy(true);
    setTimeout(() => {
      const nb = panel?.braceNow ?? startBrace(u), lk: BraceLocks = {};
      if (locks.width) lk.width = nb.width;
      if (locks.thickness) lk.thickness = nb.thickness;
      if (locks.cross) lk.cross = nb.cross ?? 0;
      if (locks.crossWidth && (nb.cross ?? 0) > 0) lk.crossWidth = nb.crossWidth ?? nb.width;
      const r = optimizeChoice(T, choice, u, lk);
      const next: GlassChoice = r.ok ? { ...choice, brace: r.brace ? ((r.brace.cross ?? 0) > 0 ? 'cross' : 'perimeter') : 'none', custom: r.brace ?? undefined } : choice;
      setChoice(next); setOpt({ text: r.line, key: JSON.stringify([spec.tank, next]) }); setBusy(false);
    }, 30);
  };
  const setBrace = (b: BraceSpec) => setChoice({ ...choice, custom: b });
  /** The two toggles (Nathan 2026-11-24): mixed glass = the Glass mode's per-pane solve; bracing optimized / custom, for every Solve for mode. */
  const tg: SolveToggles = { mixed: choice.mode === 'perPane', bracing: choice.bracing ?? 'optimized', brace: choice.custom ?? null };
  /** Free: size (R148): the tank's own glass per wall and the brace in force. */
  const gb = spec.glassBuild;
  const panes: PaneThick = gb ? { long: gb.panes.front, end: gb.panes.left, bottom: gb.panes.bottom } : { long: gNow, end: gNow, bottom: gNow };
  const braceNow: BraceSpec | null = spec.rim ? null : tg.bracing === 'custom' ? choice.custom ?? null : gb?.brace ?? null;
  /** An upgrade option was clicked: its glass and brace are written into the tank (never automatic). */
  const applyUpgrade = (o: UpgradeOption) => {
    const p = o.panes, build = { panes: { front: p.long, back: p.long, left: p.end, right: p.end, bottom: p.bottom }, brace: o.brace, safetyFactor: choice.sf };
    setSpec(sp => ({ ...sp, glass: Math.max(p.long, p.end, p.bottom), glassBuild: build }));
    if (o.kind === 'brace') setChoice({ ...choice, bracing: 'custom', brace: !o.brace ? 'none' : (o.brace.cross ?? 0) > 0 ? 'cross' : 'perimeter', custom: o.brace ?? undefined });
  };
  /** A number in the Size table was tapped: that tank (length, depth, height), that glass and the brace it was solved with go into the maker. */
  const loadCell = (c: SizeCell, D: number) => {
    const thick = tg.mixed ? Math.max(sin.glass, sin.glassEnds ?? sin.glass, sin.glassBottom ?? sin.glass) : sin.glass;
    edit(s => { setGlass(s, String(thick)); if (c.level === 'rimmed') setRim(s, true); });
    size(t => ({ ...t, L: c.L, D, H: c.H }));
    if (c.level !== 'rimmed') setChoice({ ...choice, bracing: 'custom', brace: !c.brace ? 'none' : (c.brace.cross ?? 0) > 0 ? 'cross' : 'perimeter', custom: c.brace ?? undefined });
  };

  const save = (use: boolean) => {
    const lib = loadLibrary();
    // a brace in the panel is part of the tank: saving writes its glass build (the brace would be dropped otherwise)
    const out: CustomTankSpec = { ...spec, name: spec.name.trim() || dimName(spec.tank), ...(!spec.rim && panel?.braceNow && panel.use ? { glass: panel.use.glass, glassBuild: panel.use.build } : {}) };
    const r = init.libId && lib.some(e => e.id === init.libId) ? editCustomTank(lib, init.libId, out) : addCustomTank(lib, out);
    if (!saveLibrary(r.lib)) { alert('Could not save in this browser (storage is blocked or full).'); return; }
    if (use && r.entry) { const e = r.entry; store.edit(s => chooseCustom(s, e)); }
    onEnd(use ? 'used' : 'saved');
  };
  const cancel = () => { if (!changed || confirm('Leave the custom tank maker without saving? Your setup stays as it was.')) onEnd('cancel'); };
  // a dimension box being edited takes its own Esc (cancels the edit, not the maker)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement | null)?.classList?.contains('edgeinput')) { e.preventDefault(); e.stopImmediatePropagation(); if (inSetup) setInSetup(false); else cancel(); } };
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
        <button type="button" class={`btn ghost${inSetup ? ' on' : ''}`} aria-pressed={inSetup} onClick={() => setInSetup(!inSetup)} title="Shows it in your room until you click Back now"><Icon name="eye" /> {inSetup ? 'Back to the maker' : 'Preview in my setup'}</button>
        <button type="button" class="btn" onClick={cancel}>Cancel</button>
        <button type="button" class="btn" onClick={() => save(false)}>Save to my tanks</button>
        <button type="button" class="btn primary" onClick={() => save(true)}>Save and use in this setup</button>
      </header>
      <aside class="mform">
        <div class="row"><span class="lbl">Name</span><input class="input" value={spec.name} placeholder={dimName(T)} title="Leave it empty and the name follows the size" aria-label="Name" maxLength={76} onInput={e => setSpec({ ...spec, name: (e.target as HTMLInputElement).value })} /><span /></div>
        <Group title="Shape" sum={SHAPE_WORD[shape]} open={open.shape} onToggle={fold('shape')}>
          <div class="seg full" role="group" aria-label="Shape">
            {SHAPE_MAIN.map(sh => <button type="button" class={shape === sh ? 'on' : ''} aria-pressed={shape === sh} onClick={() => size(reshape(mem.current, T, sh))}>{SHAPE_WORD[sh]}</button>)}
            <select class={`segsel${SHAPE_MORE.includes(shape) || shape === 'arch' ? ' on' : ''}`} aria-label="More shapes" value={SHAPE_MORE.includes(shape) ? shape : shape === 'arch' ? 'bow' : ''} onChange={e => { const v = (e.target as HTMLSelectElement).value as TankShape; if (v) size(reshape(mem.current, T, v)); }}>
              <option value="">More ▾</option>{SHAPE_MORE.map(sh => <option value={sh}>{SHAPE_WORD[sh]}</option>)}
            </select>
          </div>
          {shape === 'bow' || shape === 'arch' ? <div class="row"><span class="lbl">Curve</span><Seg label="Bowfront curve" value={shape} opts={[['bow', 'Horizontal'], ['arch', 'Vertical']]} onPick={v => size(reshape(mem.current, T, v as TankShape))} /><span /></div> : null}
          {shape === 'poly' ? <div class="row"><span class="lbl">Sides</span><input class="input num" type="number" min={POLY_MIN} max={POLY_MAX} step={1} value={T.sides ?? 6} aria-label="Number of sides" onChange={e => { const v = parseInt((e.target as HTMLInputElement).value, 10); if (Number.isFinite(v) && v >= POLY_MIN && v <= POLY_MAX) { setRefuse(''); size(t => setPolyCount(t, v)); } else setRefuse(`A polygon has ${POLY_MIN} to ${POLY_MAX} sides.`); }} /><span class="unit">{POLY_MIN}-{POLY_MAX}</span></div> : null}
          {shape === 'rect' ? <button type="button" class="btn sm" onClick={() => size(t => ({ ...t, D: t.L, H: t.L }))}>Make it a cube</button> : null}
        </Group>
        <Group title="Size" sum={galText(facts.gross)} open={open.size} onToggle={fold('size')}>
          {shape === 'bowl' || (shape === 'poly' && !T.sideLens) || shape === 'rect' || shape === 'bow' || shape === 'arch' ? <LenRow label={shape === 'bowl' ? 'Diameter' : shape === 'poly' ? 'Width' : 'Length'} mm={T.L} min={Math.max(LIMITS.tankMin, SIDE_RANGE.L[0])} max={SIDE_RANGE.L[1]} u={u} onMm={mm => { setRefuse(''); size(t => ({ ...t, L: mm })); }} /> : null}
          {shape === 'poly' ? <PolySides T={T} u={u} refuse={refuse} onSide={(i, mm) => { const r = setPolySide(T, i, mm); if ('error' in r) { setRefuse(r.error); return false; } setRefuse(''); size(r.edit); return true; }} onRegular={() => { setRefuse(''); size(makeRegular); }} /> : null}
          {shape === 'pie' ? <LenRow label="Radius" mm={pieRadius(T)} min={SIDE_RANGE.D[0]} max={SIDE_RANGE.D[1]} u={u} onMm={mm => size(t => ({ ...t, D: pieDepth(mm, t.pieDeg ?? 90) }))} /> : null}
          {shape === 'rect' || shape === 'bow' || shape === 'arch' ? <LenRow label={shape === 'bow' ? 'Depth at centre' : 'Depth'} mm={T.D} min={SIDE_RANGE.D[0]} max={SIDE_RANGE.D[1]} u={u} onMm={mm => size(t => ({ ...t, D: mm }))} /> : null}
          {shape !== 'bowl' ? <LenRow label="Height" mm={T.H} min={SIDE_RANGE.H[0]} max={SIDE_RANGE.H[1]} u={u} onMm={mm => size(t => ({ ...t, H: mm }))} /> : null}
          {shape === 'bow' ? <LenRow label="Bow depth" mm={T.D - (T.bowMin ?? T.D * 0.7)} min={0.5 * IN} max={T.D * 0.6} u={u} onMm={mm => size(t => ({ ...t, bowMin: Math.max(t.D * 0.4, t.D - mm) }))} /> : null}
          {shape === 'pie' ? <div class="row"><span class="lbl">Angle</span><input class="slider" type="range" min={PIE_MIN} max={PIE_MAX} step={5} value={T.pieDeg ?? 90} aria-label="Angle" onInput={e => size(t => setPieAngle(t, +(e.target as HTMLInputElement).value))} /><span class="val"><input class="input num" type="number" min={PIE_MIN} max={PIE_MAX} step={1} value={T.pieDeg ?? 90} aria-label="Angle value" onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v)) size(t => setPieAngle(t, v)); }} /><span class="unit">°</span></span></div> : null}
          {shape === 'pie' ? <div class="hint">Width {facts.L} across (worked out from the angle and radius){(T.pieDeg ?? 90) >= 360 ? '. 360° is a full round tank.' : ''}</div> : null}
          {shape === 'bowl' ? <>
            <LenRow label="Floor" mm={T.bowlFloor ?? T.L * 0.5} min={T.L * 0.2} max={T.L * 0.95} u={u} onMm={mm => size(t => ({ ...t, bowlFloor: mm }))} />
            <LenRow label="Opening" mm={T.bowlTop ?? T.L * 0.5} min={T.L * 0.2} max={T.L * 0.95} u={u} onMm={mm => size(t => ({ ...t, bowlTop: mm }))} />
          </> : null}
        </Group>
        <Group title="Glass and rim" sum={`${spec.glassType === 'lowiron' ? 'low-iron' : 'float'} · ${spec.rim ? 'rimmed' : 'rimless'} · ${edgeSummary(edgeOf(spec.edge, spec.rim))}`} open={open.glass} onToggle={fold('glass')}>
          <div class="row"><span class="lbl">Glass</span><Seg label="Glass" value={spec.glassType} opts={[['standard', 'Float'], ['lowiron', 'Low-iron']]} onPick={v => edit(s => { s.render.glassType = v; }, true)} /><span /></div>
          <div class="row"><span class="lbl">Thickness</span>
            <select class="select" aria-label="Glass thickness" value={spec.glass === 'auto' ? 'auto' : String(spec.glass)} onChange={e => edit(s => setGlass(s, (e.target as HTMLSelectElement).value))}>
              <option value="auto">Typical for the height ({glassText(customGlass('auto', T, spec.rim), u)})</option>
              <GlassOptions u={u} extras={spec.glass === 'auto' ? [] : [spec.glass]} />
            </select><span /></div>
          <div class="row"><span class="lbl">Rim</span><Seg label="Rim" value={spec.rim ? 'y' : 'n'} opts={[['y', 'Rimmed'], ['n', 'Rimless']]} onPick={v => edit(s => setRim(s, v === 'y'))} /><span /></div>
          <EdgeRows spec={spec} setEdge={e => setSpec(sp => ({ ...sp, edge: e }))} glassMm={gNow} />
        </Group>
        <GlassGroup solve={solve} setSolve={setSolve} sin={sin} setSin={setSin} tg={tg} T={T} loadCell={loadCell} openWide={() => setWide(true)} panes={panes} braceNow={braceNow} kind={spec.glassType} over={spec.glassPrices} setOver={o => setSpec(sp => { const { glassPrices: _g, ...r } = sp; return o ? { ...r, glassPrices: o } : r; })} onApply={applyUpgrade} panel={panel} choice={choice} setChoice={setChoice} locks={locks} setLocks={setLocks} onOptimize={optimize} busy={busy} optLine={opt && opt.key === key() ? opt.text : ''} setBrace={setBrace} rim={spec.rim} u={u} glassNow={gNow} build={!!spec.glassBuild} open={open.solver} onToggle={fold('solver')}
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
        {inSetup ? <div class="ov mbanner glass">Your setup with this tank. <button type="button" class="btn sm" onClick={() => setInSetup(false)}>Back now</button></div> : <>
          <EdgeLabels store={store} getViewer={getViewer} T={spec.tank} u={u} onCommit={commitDim} />
          <FailLabels store={store} getViewer={getViewer} />
          <div class="ov dims glass" aria-label="Dimensions"><span><b>{facts.L}</b> {shape === 'round' || shape === 'bowl' ? 'across' : 'length'}</span><span><b>{facts.D}</b> {shape === 'bow' ? 'depth at centre' : 'depth'}</span><span><b>{facts.H}</b> height</span>{facts.bow ? <span><b>{facts.bow}</b> bow</span> : null}</div>
        </>}
        <div class="ov mfacts">
          <span class="glass fchip"><b>{galText(facts.gross)}</b> gross · about {galText(facts.water)} of water</span>
          <span class="glass fchip"><b>about {Math.round(facts.lb / 10) * 10} lb</b> filled</span>
          <span class="glass fchip"><b>{facts.footprint}</b> footprint</span>
        </div>
      </main>
      {wide && T ? <WideView T={T} rim={spec.rim} inp={sin} setInp={setSin} sf={choice.sf} bottom={choice.bottom} u={u} tg={tg} onClose={() => setWide(false)} /> : null}
    </div>
  );
}

function GlassGroup({ panes, braceNow, kind, over, setOver, onApply, solve, setSolve, sin, setSin, tg, T, loadCell, openWide, panel, choice, setChoice, locks, setLocks, onOptimize, busy, optLine, setBrace, rim, u, glassNow, build, open, onToggle, onUse }: {
  solve: SolveMode; setSolve: (m: SolveMode) => void; sin: SolveInputs; setSin: (i: SolveInputs) => void; panes: PaneThick; braceNow: BraceSpec | null; kind: 'standard' | 'lowiron'; over?: Record<string, number>; setOver: (o: Record<string, number> | undefined) => void; onApply: (o: UpgradeOption) => void; tg: SolveToggles; T: Tank; loadCell: (c: SizeCell, D: number) => void; openWide: () => void;
  panel: GlassPanel | null; choice: GlassChoice; setChoice: (c: GlassChoice) => void; locks: Record<BraceField, boolean>; setLocks: (l: Record<BraceField, boolean>) => void; onOptimize: () => void; busy: boolean; optLine: string; setBrace: (b: BraceSpec) => void; rim: boolean; u: Units; glassNow: number; build: boolean; open: boolean; onToggle: () => void; onUse: () => void;
}) {
  const sum = !panel ? 'working it out…' : !panel.supported ? 'box tanks only' : solve === 'size' ? `${glassText(panes.long, u)} front · free size · min SF ${choice.sf.toFixed(1)}` : `${panel.panes[0].thickness} front · SF ${panel.sfAchieved}`;
  const kindOf = (b: BraceSpec | null) => !b ? 'none' : (b.cross ?? 0) > 0 ? 'cross' : 'perimeter';
  /** Custom bracing starts from the brace in force (the optimizer's), so switching never jumps. */
  const setBracing = (m: 'optimized' | 'custom') => {
    if (m === 'optimized') { setChoice({ ...choice, bracing: 'optimized' }); return; }
    const from = choice.custom ?? panel?.braceNow ?? null;
    setChoice({ ...choice, bracing: 'custom', brace: kindOf(from), custom: from ?? undefined });
  };
  /** The custom brace kind: no brace, perimeter only, or perimeter + cross (keeps the strip sizes already set). */
  const setKind = (k: 'none' | 'perimeter' | 'cross') => {
    const cur = choice.custom ?? panel?.braceNow ?? startBrace(u);
    setChoice({ ...choice, bracing: 'custom', brace: k, custom: k === 'none' ? undefined : { ...cur, cross: k === 'cross' ? Math.max(1, cur.cross ?? 0) : 0 } });
  };
  const poly = !!panel?.poly; // polygon tanks: flat sides, one wall thickness, no brace (scene/polyGlass.ts)
  const custom = !rim && !poly && tg.bracing === 'custom';
  return (
    <Group title="Glass check" sum={sum} open={open} onToggle={onToggle}>
      {panel && !panel.supported ? <div class="hint">{panel.reason}</div> : <>
        <Seg label="Solve for" value={solve} opts={[['size', 'Free: size'], ['glass', 'Free: glass']]} onPick={setSolve} />
        <div class="hint">{solve === 'size' ? 'Free: size. The glass and the minimum safety factor are fixed; change the size as you like and see which panes fall short, and what it takes to fix them.' : 'Free: glass. You set the size and the minimum safety factor; the glass follows.'}</div>
        <div class="row"><span class="lbl">{solve === 'glass' ? 'Safety factor' : 'Safety factor at least'}</span><input class="slider" type="range" min={2} max={6} step={0.1} value={choice.sf} aria-label="Safety factor" onInput={e => setChoice({ ...choice, sf: +(e.target as HTMLInputElement).value })} />
          <span class="val"><input class="input num" type="number" min={1.5} max={8} step={0.1} value={choice.sf} aria-label="Safety factor value" onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v) && v >= 1.5 && v <= 8) setChoice({ ...choice, sf: v }); }} /></span></div>
 {poly ? null : <div class="row"><span class="lbl">Glass</span><Seg label="Glass thicknesses" value={tg.mixed ? 'mixed' : 'same'} opts={[['same', 'Same everywhere'], ['mixed', 'Mixed']]} onPick={m => setChoice({ ...choice, mode: m === 'mixed' ? 'perPane' : 'uniform' })} /><span /></div>}
        {!rim && !poly ? <div class="row"><span class="lbl">Bracing</span><Seg label="Bracing" value={tg.bracing} opts={[['optimized', 'Optimized'], ['custom', 'Custom']]} onPick={setBracing} /><span /></div> : null}
        {poly ? null : <div class="hint">{tg.mixed ? 'Mixed: front and back, ends and bottom can each be a different thickness.' : 'One thickness for every wall and the bottom.'}{rim ? '' : tg.bracing === 'optimized' ? ' Bracing is chosen for you.' : ' Bracing is yours: set the strips below.'}</div>}
        {custom ? <>
          <Seg label="Brace" value={kindOf(choice.custom ?? null)} opts={[['none', 'No brace'], ['perimeter', 'Perimeter'], ['cross', 'Perimeter + cross']]} onPick={setKind} />
          <BraceFields b={choice.custom ?? null} u={u} locks={locks} setLocks={setLocks} setBrace={setBrace} onOptimize={solve === 'glass' ? onOptimize : undefined} busy={busy} optLine={solve === 'glass' ? optLine : ''} note={solve === 'glass' && panel ? panel.braceNote : ''} />
        </> : null}
        {solve === 'size' && poly ? <PolyFreeSize T={T} rim={rim} panes={panes} sf={choice.sf} bottom={choice.bottom} u={u} kind={kind} over={over} onApply={onApply} /> : null}
        {solve === 'size' && !poly ? <>
          <FreeSize T={T} rim={rim} panes={panes} brace={braceNow} sf={choice.sf} bottom={choice.bottom} u={u} tg={tg} kind={kind} over={over} onApply={onApply} />
          <details class="gprices" onToggle={e => { if ((e.target as HTMLDetailsElement).open) setSin({ ...sin, glass: panes.long, glassEnds: panes.end, glassBottom: panes.bottom }); }}><summary>See options: the largest tank for a glass</summary>
            <SizeMode T={T} rim={rim} inp={sin} setInp={setSin} sf={choice.sf} bottom={choice.bottom} u={u} tg={tg} onPick={loadCell} onChart={openWide} /></details>
        </> : null}
        {solve !== 'glass' ? null : <>
        {!rim && panel && !custom && panel.braceNow ? <div class="hint">Brace: {braceWords(panel.braceNow, u)}. {panel.braceNote}</div> : null}
        {!panel ? <div class="hint">Working out the glass…</div> : <>
          <div class="hint">{panel.topLine}</div>
          {!rim && panel.braces.length ? <table class="gtable" aria-label="Brace options">
            <thead><tr><th>Brace</th><th>Walls (front / ends)</th><th title="Glass used, no brace = 100">Glass</th></tr></thead>
            <tbody>{panel.braces.map(b => <tr class={b.on ? 'on' : ''} title="Use this brace (switches bracing to Custom)" onClick={() => setChoice({ ...choice, bracing: 'custom', brace: b.kind, custom: b.spec ?? undefined })}><td>{b.label}<div class="hint">{b.opening}</div></td><td>{b.walls}</td><td>{b.cost}</td></tr>)}</tbody>
          </table> : null}
          <table class="gtable" aria-label="Glass per pane">
            <thead><tr><th>Pane</th><th>Glass</th><th>SF</th><th>Set by</th></tr></thead>
            <tbody>{panel.panes.map(p => <tr><td>{p.label}</td><td><b>{p.thickness}</b></td><td class={p.ok ? '' : 'bad'}>{p.sf}</td><td class="hint">{p.governs}</td></tr>)}</tbody>
          </table>
          <div class="drow"><span>Safety factor achieved</span><Pill tone={panel.sfOk ? 'ok' : 'bad'}>{panel.sfAchieved}</Pill></div>
          <div class={`hint${panel.sfOk ? '' : ' bad'}`} aria-live="polite">{panel.verdict}</div>
          <div class="hint">{panel.volume}</div>
          {panel.joints.length ? <><div class="cap">Silicone joints</div>{panel.joints.map(j => <div class="drow"><span>{j.label}</span><Pill tone={j.ok ? 'ok' : 'bad'}>{j.use}</Pill></div>)}</> : null}
          {panel.notes.map(n => <div class="dwarn warn">{n}</div>)}
          <div class="drow"><span class="hint">{panel.weight}</span>
            {panel.use ? <button type="button" class="btn sm" disabled={build && Math.abs(panel.use.glass - glassNow) < 0.01} onClick={onUse}>{build && Math.abs(panel.use.glass - glassNow) < 0.01 ? 'In use' : `Use this glass (${glassText(panel.use.glass, u)})`}</button> : null}</div>
        </>}</>}
        <GlassPriceFields kind={kind} over={over} set={setOver} u={u} />
        <div class="hint disclaimer">{DISCLAIMER}</div>
      </>}
    </Group>
  );
}

/** Edge finish (GS3): one finish for the whole tank, recorded with it; the glass check does not change with it. */
function EdgeRows({ spec, setEdge, glassMm }: { spec: CustomTankSpec; setEdge: (e: EdgeFinish) => void; glassMm: number }) {
  const e = edgeOf(spec.edge, spec.rim), warns = edgeWarnings(e, glassMm, spec.rim);
  return <>
    <div class="row"><span class="lbl">Edges</span><Seg label="Edge finish" value={e} opts={EDGE_OPTS} onPick={setEdge} /><span /></div>
    <div class="hint">{EDGE_HELP[e]}.</div>
    {warns.map(w => <div class="dwarn warn">{w}</div>)}
    <div class="hint">Edge finish is recorded with the tank and goes on the quote to the glass shop. It does not change the safety factor: there is no independent strength data for raw, ground, polished and beveled edges on annealed glass.</div>
  </>;
}

type BraceField = 'width' | 'thickness' | 'cross' | 'crossWidth';

/** "2.5 in perimeter + 1 cross, 1/4 in strips" */
const braceWords = (b: BraceSpec, u: Units) => `${+(b.width / (u === 'in' ? IN_MM : 10)).toFixed(2)} ${u === 'in' ? 'in' : 'cm'} perimeter${b.cross ? ` + ${b.cross} cross` : ''}, ${glassText(b.thickness, u)} strips`;

/** The brace fields (lane CT1): widths, strip thickness and cross count, each lockable, and the Optimize button. */
function BraceFields({ b, u, locks, setLocks, setBrace, onOptimize, busy, optLine, note }: {
  b: BraceSpec | null; u: Units; locks: Record<BraceField, boolean>; setLocks: (l: Record<BraceField, boolean>) => void; setBrace: (b: BraceSpec) => void;
  /** absent: no Optimize button (Size and Safety factor modes, where the Optimized toggle does that job) */
  onOptimize?: () => void; busy: boolean; optLine: string; note: string;
}) {
  const cur = b ?? startBrace(u), cross = cur.cross ?? 0, cw = cur.crossWidth ?? cur.width;
  const conv = u === 'in' ? IN_MM : 10, unit = u === 'in' ? 'in' : 'cm', step = u === 'in' ? 0.25 : 0.5;
  const show = (mm: number) => +(mm / conv).toFixed(2);
  const lock = (k: BraceField) => <label class="lockbox" title="Optimize leaves a locked field as it is"><input type="checkbox" checked={locks[k]} aria-label={`Lock ${k}`} onChange={() => setLocks({ ...locks, [k]: !locks[k] })} /> lock</label>;
  const num = (k: 'width' | 'crossWidth', v: number, label: string) => <div class="row"><span class="lbl">{label}</span>
    <span class="val"><input class="input num" type="number" min={0.5} step={step} value={show(v)} aria-label={label} onChange={e => { const x = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(x) && x >= 0.5 * (u === 'in' ? 1 : 2.54)) setBrace({ ...cur, [k]: x * conv }); }} /><span class="unit">{unit}</span></span>{lock(k)}</div>;
  return <>
    {b ? <>
      {num('width', cur.width, 'Perimeter width')}
      <div class="row"><span class="lbl">Strip thickness</span>
        <select class="select" aria-label="Brace strip thickness" value={String(cur.thickness)} onChange={e => setBrace({ ...cur, thickness: +(e.target as HTMLSelectElement).value })}>
          <GlassOptions u={u} extras={[cur.thickness]} />
        </select>{lock('thickness')}</div>
      <div class="row"><span class="lbl">Cross braces</span>
        <select class="select" aria-label="Number of cross braces" value={String(cross)} onChange={e => setBrace({ ...cur, cross: +(e.target as HTMLSelectElement).value })}>
          {[0, 1, 2, 3].map(n => <option value={String(n)}>{n === 0 ? 'none' : n}</option>)}
        </select>{lock('cross')}</div>
      {cross > 0 ? num('crossWidth', cw, 'Cross width') : null}
    </> : null}
    {onOptimize ? <div class="drow"><button type="button" class="btn sm primary" disabled={busy} onClick={onOptimize} title="Fills the unlocked fields: least total glass that still meets the safety factor, joints included">{busy ? 'Optimizing…' : 'Fill unlocked'}</button><span class="hint">least glass at your safety factor</span></div> : null}
    {optLine ? <div class="hint" role="status">{optLine}</div> : null}
    {note ? <div class="hint">{note}</div> : null}
  </>;
}


/** A polygon's sides, each its own length (lane CT1, R38): the corners stay on one circle, so any side can change as long as the shape still closes. */
function PolySides({ T, u, refuse, onSide, onRegular }: { T: Tank; u: Units; refuse: string; onSide: (i: number, mm: number) => boolean; onRegular: () => void }) {
  const lens = polySides(T), conv = u === 'in' ? IN_MM : 10, show = (mm: number) => +(mm / conv).toFixed(2);
  return <div class="polysides">
    <div class="cap">Sides ({T.sideLens ? 'each its own length' : 'all equal'})</div>
    <div class="sidegrid">{lens.map((mm, i) => <label class="sidecell"><span>{i + 1}</span>
      <input class="input num" type="text" inputMode="decimal" value={String(show(mm))} aria-label={`Side ${i + 1} length (${u})`}
        onChange={e => { const el = e.target as HTMLInputElement, v = parseLen(el.value, u); if (v == null || !onSide(i, v)) el.value = String(show(mm)); }} /></label>)}</div>
    {T.sideLens ? <button type="button" class="btn sm" onClick={onRegular}>Make all sides equal</button> : null}
    <div class="hint">Corners lie on one circle, so the sides alone fix the shape. The longest side must be shorter than the others together.</div>
    {refuse ? <div class="dwarn warn" role="alert">{refuse}</div> : null}
  </div>;
}
