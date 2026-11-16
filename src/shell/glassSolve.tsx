// GS2 (2026-11-15; Nathan: "if I want to stay above a min of 3.8 SF and want to use 1/4 in glass everywhere, how large can I make my tank with
// different levels of bracing?"): the Glass check's "Solve for" modes. Glass = the existing check (the thinnest glass for this tank). Size = the
// largest tank for the glass and safety factor given. Safety factor = what this glass gives on this tank. Engine: scene/glassEnvelope.ts.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { IN_MM, glassChoices } from '../scene/glassSolver';
import { BRACE_LEVELS, heightTable, type BraceLevel } from '../scene/glassEnvelope';
import { Pill } from './ui';
import { FailView } from './failView';
import { diagnose } from '../scene/glassDiagnose';
import { H_MAX, baseOf, lenText, sfPanel, sizeTable, type SizeCell, type SolveInputs } from './logic/tankEnvelope';
import { GlassOptions } from './glassOptions';
import { glassText, type Units } from './logic/tank';

export type SolveMode = 'glass' | 'size' | 'sf';
type Tk = { L: number; D: number; H: number };

const toU = (mm: number, u: Units) => u === 'in' ? +(mm / IN_MM).toFixed(2) : +(mm / 10).toFixed(1);
const fromU = (v: number, u: Units) => u === 'in' ? v * IN_MM : v * 10;

/** Shared inputs: glass, strips, depth. */
function Inputs({ inp, setInp, T, u, strips, depth }: { inp: SolveInputs; setInp: (i: SolveInputs) => void; T: Tk; u: Units; strips: boolean; depth: boolean }) {
  const unit = u === 'in' ? 'in' : 'cm';
  const num = (label: string, mm: number, set: (mm: number) => void, min: number, max: number, aria: string) => (
    <div class="row"><span class="lbl">{label}</span><span class="val"><input class="input num" type="number" min={toU(min, u)} max={toU(max, u)} step={u === 'in' ? 0.25 : 0.5} value={toU(mm, u)} aria-label={aria}
      onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v)) set(Math.min(max, Math.max(min, fromU(v, u)))); }} /></span><span class="unit">{unit}</span></div>);
  return <>
    <div class="row"><span class="lbl">Glass</span>
      <select class="select" aria-label="Glass thickness for every wall and the bottom" value={String(inp.glass)} onChange={e => setInp({ ...inp, glass: +(e.target as HTMLSelectElement).value })}>
        <GlassOptions u={u} extras={[inp.glass]} suffix=" everywhere" />
      </select><span /></div>
    {depth ? num('Depth', inp.depth ?? T.D, mm => setInp({ ...inp, depth: mm }), 6 * IN_MM, 48 * IN_MM, 'Tank depth, front to back') : null}
    {strips ? <>
      {num('Strip width', inp.stripWidth, mm => setInp({ ...inp, stripWidth: mm }), 2 * IN_MM, 4 * IN_MM, 'Brace strip width')}
      <div class="row"><span class="lbl">Strip glass</span>
        <select class="select" aria-label="Smallest brace strip thickness" value={String(inp.strip)} onChange={e => setInp({ ...inp, strip: +(e.target as HTMLSelectElement).value })}>
          <GlassOptions u={u} extras={[inp.strip]} suffix=" or thicker" />
        </select><span /></div>
    </> : null}
  </>;
}

/** "Size": the largest tank for this glass and safety factor, by length and bracing. */
export function SizeMode({ T, rim, inp, setInp, sf, bottom, u, onPick, onChart }: { T: Tk; rim: boolean; inp: SolveInputs; setInp: (i: SolveInputs) => void; sf: number; bottom: 'full' | 'perimeter'; u: Units; onPick: (c: SizeCell, D: number) => void; onChart: () => void }) {
  const [tab, setTab] = useState<ReturnType<typeof sizeTable> | null>(null);
  const key = JSON.stringify([inp, sf, bottom, u, rim, Math.round(T.D), Math.round(T.L)]);
  useEffect(() => { setTab(null); const t = setTimeout(() => setTab(sizeTable(T, rim, inp, sf, T.D, bottom, u)), 300); return () => clearTimeout(t); }, [key]);
  const gl = glassText(inp.glass, u);
  return <>
    <Inputs inp={inp} setInp={setInp} T={T} u={u} strips={!rim} depth />
    <div class="cap">Largest tank for {gl} glass at a safety factor of {sf.toFixed(1)}</div>
    <div class="hint">Height that still passes, filled to the brim, for each length{rim ? ' (the trim holds the top edge)' : ''}. Tap a number to load that tank.</div>
    {!tab ? <div class="hint" aria-live="polite">Working it out…</div> : <div class="gscroll"><table class="gtable gsize" aria-label="Largest height by length and bracing">
      <thead><tr><th>Bracing</th>{tab.cols.map(c => <th class={c.own ? 'own' : ''} title={c.own ? 'This tank’s length' : undefined}>{c.text}</th>)}</tr></thead>
      <tbody>{tab.rows.map(r => <tr class={r.level === 'rimmed' && !rim ? 'ref' : ''}><td>{r.label}</td>{r.cells.map(c => <td class="cellx">{c.none ? <span class="hint" title={c.title}>–</span>
        : <button type="button" class={`cellb${c.warn ? ' warnc' : ''}`} title={c.title} aria-label={c.title} onClick={() => onPick(c, tab.D)}>{c.text}{c.warn ? <span class="wmark" aria-hidden="true"> ⚠</span> : null}</button>}</td>)}</tr>)}</tbody>
    </table></div>}
    {tab && tab.rows.some(r => r.cells.some(c => c.warn)) ? <div class="dwarn warn">⚠ These sizes pass on glass strength, but a silicone joint is over its design stress there. Widen the bond or use more silicone; hover a number to see which joint.</div> : null}
    <div class="hint">{u === 'in' ? 'Inches tall' : 'cm tall'}. A dash means the strips leave under 6 in clear. Glass thicker than the minimum can only raise these numbers. Stress is sampled on a grid, so rows within 0.1 in are equal. A brace row can sit below the one above it when the strips themselves are the weak link (hover the number): widen them or use thicker strip glass.</div>
    <button type="button" class="btn sm" onClick={onChart}>Open the chart</button>
  </>;
}

/** "Safety factor": what this glass gives on this tank. */
export function SfMode({ T, rim, inp, setInp, sf, bottom, u, level, setLevel }: { T: Tk; rim: boolean; inp: SolveInputs; setInp: (i: SolveInputs) => void; sf: number; bottom: 'full' | 'perimeter'; u: Units; level: BraceLevel; setLevel: (l: BraceLevel) => void }) {
  const lv: BraceLevel = rim ? 'rimmed' : level === 'rimmed' ? 'none' : level;
  const p = useMemo(() => sfPanel(T, lv, inp, sf, bottom, u), [T.L, T.D, T.H, lv, JSON.stringify(inp), sf, bottom, u]);
  const diag = useMemo(() => diagnose(T.L, T.H, lv, { ...baseOf(inp, sf, T.D, bottom), D: T.D }), [T.L, T.D, T.H, lv, JSON.stringify(inp), sf, bottom]);
  return <>
    <Inputs inp={inp} setInp={setInp} T={T} u={u} strips={!rim && lv !== 'none'} depth={false} />
    {!rim ? <div class="seg full" role="group" aria-label="Bracing">{BRACE_LEVELS.filter(l => l.id !== 'rimmed').map(l => <button type="button" class={lv === l.id ? 'on' : ''} aria-pressed={lv === l.id} onClick={() => setLevel(l.id)}>{l.label.replace('Perimeter + ', '+ ').replace(' cross', 'x')}</button>)}</div> : null}
    <div class="hint">This tank, {lenText(T.L, u)} × {lenText(T.D, u)} × {lenText(T.H, u)}, filled to the brim.</div>
    <table class="gtable" aria-label="Safety factor by member"><thead><tr><th>Member</th><th>SF</th><th>Set by</th></tr></thead>
      <tbody>{p.rows.map(r => <tr><td>{r.label}</td><td class={r.ok ? '' : 'bad'}><b>{r.sf}</b></td><td class="hint">{r.note}</td></tr>)}</tbody></table>
    <div class="drow"><span>Lowest safety factor</span><Pill tone={p.ok ? 'ok' : 'bad'}>{p.min}</Pill></div>
    <div class={`hint${p.ok ? '' : ' bad'}`} aria-live="polite">{p.verdict}</div>
    {p.joints.length ? <><div class="cap">Silicone joints</div>{p.joints.map(j => <div class="drow"><span>{j.label}</span><Pill tone={j.ok ? 'ok' : 'bad'}>{j.use}</Pill></div>)}</> : null}
    {p.joints.some(j => !j.ok) ? <div class="dwarn warn">⚠ A silicone joint is over its design stress: widen the bond or use more silicone.</div> : null}
    {p.fits ? <FailView d={diag} u={u} /> : null}
  </>;
}

const LCOL: Record<BraceLevel, string> = { none: 'var(--bad)', perimeter: 'var(--warn)', cross1: 'var(--ok)', cross2: 'var(--accent)', rimmed: 'var(--text-2)' };
const DASH: Record<BraceLevel, string> = { none: '', perimeter: '7 3', cross1: '', cross2: '2 3', rimmed: '10 4' };

/** "What can I build?": largest height against length, one line per bracing level, same engine as the table. */
export function WideView({ T, rim, inp, setInp, sf, bottom, u, onClose }: { T: Tk; rim: boolean; inp: SolveInputs; setInp: (i: SolveInputs) => void; sf: number; bottom: 'full' | 'perimeter'; u: Units; onClose: () => void }) {
  const lens = (u === 'in' ? [12, 18, 24, 30, 36, 48, 60, 72, 96] : [30, 45, 60, 75, 90, 120, 150, 180, 240]).map(v => fromU(v, u));
  const levels: BraceLevel[] = rim ? ['rimmed'] : ['none', 'perimeter', 'cross1', 'cross2', 'rimmed'];
  const [data, setData] = useState<ReturnType<typeof heightTable> | null>(null);
  const key = JSON.stringify([inp, sf, bottom, u, rim, Math.round(T.D)]);
  useEffect(() => { setData(null); const t = setTimeout(() => setData(heightTable(levels, lens, baseOf(inp, sf, T.D, bottom), { max: H_MAX })), 300); return () => clearTimeout(t); }, [key]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, []);
  const W = 640, Ht = 300, x0 = 44, x1 = W - 12, y0 = Ht - 34, y1 = 14, lmin = lens[0], lmax = lens[lens.length - 1];
  const hs = data ? data.flat().map(c => c.solved.value).filter(v => v > 0) : [], hmax = Math.max(H_MAX * 0.5, ...hs), top = Math.ceil(hmax / (3 * (u === 'in' ? IN_MM : 10)) ) * 3 * (u === 'in' ? IN_MM : 10);
  const X = (L: number) => x0 + (L - lmin) / (lmax - lmin) * (x1 - x0), Y = (H: number) => y0 - H / top * (y0 - y1);
  const unitMm = u === 'in' ? IN_MM : 10, tick = 3 * unitMm;
  const ticks: number[] = []; for (let h = 0; h <= top + 1; h += tick) ticks.push(h);
  return (
    <div class="envov" role="dialog" aria-modal="true" aria-label="What can I build?" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="envcard">
        <div class="envhead"><b>What can I build?</b><button type="button" class="btn sm" onClick={onClose}>Close</button></div>
        <div class="hint">Largest height for each length at {glassText(inp.glass, u)} glass, safety factor {sf.toFixed(1)}, {lenText(inp.depth ?? T.D, u)} deep, filled to the brim. Set the glass, strips and depth in Glass check.</div>
        <div class="seg envin" role="group" aria-label="Glass">{glassChoices(u).flatMap(g => g.items.map(i => i.mm)).sort((a, b) => a - b).filter(t => t >= 4.7 && t <= 19.1).map(t => <button type="button" class={Math.abs(inp.glass - t) < 0.01 ? 'on' : ''} aria-pressed={Math.abs(inp.glass - t) < 0.01} onClick={() => setInp({ ...inp, glass: t })}>{glassText(t, u)}</button>)}</div>
        {!data ? <div class="hint" aria-live="polite">Working it out…</div> : <svg class="envsvg" viewBox={`0 0 ${W} ${Ht}`} role="img" aria-label="Largest height against length for each bracing level">
          {ticks.map(h => <g><line x1={x0} x2={x1} y1={Y(h)} y2={Y(h)} stroke="var(--line)" /><text x={x0 - 6} y={Y(h) + 4} text-anchor="end" font-size="11" fill="var(--text-3)">{Math.round(h / unitMm)}</text></g>)}
          {lens.map(L => <text x={X(L)} y={y0 + 16} text-anchor="middle" font-size="11" fill="var(--text-3)">{Math.round(L / unitMm)}</text>)}
          <text x={(x0 + x1) / 2} y={Ht - 4} text-anchor="middle" font-size="11" fill="var(--text-3)">Tank length ({u === 'in' ? 'in' : 'cm'})</text>
          <text x={12} y={(y0 + y1) / 2} font-size="11" fill="var(--text-3)" transform={`rotate(-90 12 ${(y0 + y1) / 2})`} text-anchor="middle">Largest height ({u === 'in' ? 'in' : 'cm'})</text>
          {data.map((row, i) => { const pts = row.filter(c => c.solved.value > 0).map(c => `${X(c.L)},${Y(c.solved.value)}`).join(' '); return pts ? <polyline points={pts} fill="none" stroke={LCOL[levels[i]]} stroke-width="2.4" stroke-dasharray={DASH[levels[i]] || undefined} /> : null; })}
          <circle cx={X(Math.min(lmax, Math.max(lmin, T.L)))} cy={Y(Math.min(top, T.H))} r="5" fill="var(--text)"><title>This tank</title></circle>
        </svg>}
        <div class="envkey">{levels.map(l => <span><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke={LCOL[l]} stroke-width="2.4" stroke-dasharray={DASH[l] || undefined} /></svg> {l === 'rimmed' && !rim ? 'Rimmed (trim): the most any brace can do' : BRACE_LEVELS.find(x => x.id === l)!.label}</span>)}<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="var(--text)" /></svg> This tank</span></div>
      </div>
    </div>
  );
}
