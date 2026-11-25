// GS2 (2026-11-15; Nathan: "if I want to stay above a min of 3.8 SF and want to use 1/4 in glass everywhere, how large can I make my tank with
// different levels of bracing?"): the Glass check's "Solve for" modes. Glass = the existing check (the thinnest glass for this tank). Size = the
// largest tank for the glass and safety factor given. Safety factor = what this glass gives on this tank. Engine: scene/glassEnvelope.ts.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { IN_MM, STOCK_METRIC, STOCK_US_PICK, glassChoices } from '../scene/glassSolver';
import { estimateSqFt, priceKey, type GlassKind, type GlassPrices } from '../scene/glassPrice';
import { upgradeCard, type PaneThick, type UpgradeOption } from './logic/glassUpgrade';
import { BRACE_LEVELS, heightTable, type BraceLevel } from '../scene/glassEnvelope';
import type { BraceSpec } from '../scene/glassSolver';
import { Pill } from './ui';
import { FailView } from './failView';
import { diagnose } from '../scene/glassDiagnose';
import { H_MAX, baseOf, bestBrace, braceText, glassWords, lenText, levelsOf, sfPanel, sizeTable, type SizeCell, type SolveInputs, type SolveToggles } from './logic/tankEnvelope';
import { GlassOptions } from './glassOptions';
import { glassText, type Units } from './logic/tank';

/** R148: Free: size (glass and minimum SF locked, size free) or Free: glass (the size and the minimum SF are given, the glass follows). */
export type SolveMode = 'glass' | 'size';
type Tk = { L: number; D: number; H: number };

const toU = (mm: number, u: Units) => u === 'in' ? +(mm / IN_MM).toFixed(2) : +(mm / 10).toFixed(1);
const fromU = (v: number, u: Units) => u === 'in' ? v * IN_MM : v * 10;

/** Shared inputs: glass (one thickness, or front and back / ends / bottom when mixed) and depth. Bracing comes from the toggles above. */
function Inputs({ inp, setInp, T, u, mixed, depth }: { inp: SolveInputs; setInp: (i: SolveInputs) => void; T: Tk; u: Units; mixed: boolean; depth: boolean }) {
  const unit = u === 'in' ? 'in' : 'cm';
  const num = (label: string, mm: number, set: (mm: number) => void, min: number, max: number, aria: string) => (
    <div class="row"><span class="lbl">{label}</span><span class="val"><input class="input num" type="number" min={toU(min, u)} max={toU(max, u)} step={u === 'in' ? 0.25 : 0.5} value={toU(mm, u)} aria-label={aria}
      onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v)) set(Math.min(max, Math.max(min, fromU(v, u)))); }} /></span><span class="unit">{unit}</span></div>);
  const pick = (label: string, aria: string, mm: number, set: (mm: number) => void, suffix = '') => <div class="row"><span class="lbl">{label}</span>
    <select class="select" aria-label={aria} value={String(mm)} onChange={e => { const v = +(e.target as HTMLSelectElement).value; if (v > 0) set(v); }}>
      <GlassOptions u={u} extras={[mm]} suffix={suffix} />
    </select><span /></div>;
  return <>
    {mixed ? <>
      {pick('Front, back', 'Front and back glass thickness', inp.glass, mm => setInp({ ...inp, glass: mm }))}
      {pick('Ends', 'End wall glass thickness', inp.glassEnds ?? inp.glass, mm => setInp({ ...inp, glassEnds: mm }))}
      {pick('Bottom', 'Bottom glass thickness', inp.glassBottom ?? inp.glass, mm => setInp({ ...inp, glassBottom: mm }))}
    </> : pick('Glass', 'Glass thickness for every wall and the bottom', inp.glass, mm => setInp({ ...inp, glass: mm }), ' everywhere')}
    {depth ? num('Depth', inp.depth ?? T.D, mm => setInp({ ...inp, depth: mm }), 6 * IN_MM, 48 * IN_MM, 'Tank depth, front to back') : null}
  </>;
}

/** "Size": the largest tank for this glass and safety factor, by length and bracing. */
export function SizeMode({ T, rim, inp, setInp, sf, bottom, u, tg, onPick, onChart }: { T: Tk; rim: boolean; inp: SolveInputs; setInp: (i: SolveInputs) => void; sf: number; bottom: 'full' | 'perimeter'; u: Units; tg: SolveToggles; onPick: (c: SizeCell, D: number) => void; onChart: () => void }) {
  const [tab, setTab] = useState<ReturnType<typeof sizeTable> | null>(null);
  const key = JSON.stringify([inp, sf, bottom, u, rim, Math.round(T.D), Math.round(T.L), tg]);
  useEffect(() => { setTab(null); const t = setTimeout(() => setTab(sizeTable(T, rim, inp, sf, T.D, bottom, u, tg)), 300); return () => clearTimeout(t); }, [key]);
  const gl = glassWords(inp, tg, u);
  return <>
    <Inputs inp={inp} setInp={setInp} T={T} u={u} mixed={tg.mixed} depth />
    <div class="cap">Largest tank for {gl} glass at a safety factor of {sf.toFixed(1)}</div>
    <div class="hint">Height that still passes, filled to the brim, for each length{rim ? ' (the trim holds the top edge)' : tg.bracing === 'optimized' ? '. Optimized bracing: each brace row uses the strongest strips that fit (as wide as leaves 6 in clear, up to 4 in, in the wall glass); hover a number for its strips' : ''}. Tap a number to load that tank.</div>
    {!tab ? <div class="hint" aria-live="polite">Working it out…</div> : <div class="gscroll"><table class="gtable gsize" aria-label="Largest height by length and bracing">
      <thead><tr><th>Bracing</th>{tab.cols.map(c => <th class={c.own ? 'own' : ''} title={c.own ? 'This tank’s length' : undefined}>{c.text}</th>)}</tr></thead>
      <tbody>{tab.rows.map(r => <tr class={r.level === 'rimmed' && !rim ? 'ref' : ''}><td>{r.label}</td>{r.cells.map(c => <td class="cellx">{c.none ? <span class="hint" title={c.title}>–</span>
        : <button type="button" class={`cellb${c.warn ? ' warnc' : ''}`} title={c.title} aria-label={c.title} onClick={() => onPick(c, tab.D)}>{c.text}{c.warn ? <span class="wmark" aria-hidden="true"> ⚠</span> : null}</button>}</td>)}</tr>)}</tbody>
    </table></div>}
    {tab && tab.rows.some(r => r.cells.some(c => c.warn)) ? <div class="dwarn warn">⚠ These sizes pass on glass strength, but a silicone joint is over its design stress there. Widen the bond or use more silicone; hover a number to see which joint.</div> : null}
    <div class="hint">{u === 'in' ? 'Inches tall' : 'cm tall'}. A dash means the strips leave under 6 in clear. Thicker glass can only raise these numbers. Stress is sampled on a grid, so rows within 0.1 in are equal. A brace row can sit below the one above it when the strips themselves are the weak link (hover the number).</div>
    <button type="button" class="btn sm" onClick={onChart}>Open the chart</button>
  </>;
}

/** "Free: size" (R148): the glass and the minimum safety factor are locked; the size is the tank's own and is never blocked. Live per-pane
 *  safety factors at the tank's own glass, and when a pane is under the minimum the upgrade card (thicker glass or a cheaper brace, with cost). */
export function FreeSize({ T, rim, panes, brace, sf, bottom, u, tg, kind, over, onApply }: { T: Tk; rim: boolean; panes: PaneThick; brace: BraceSpec | null; sf: number; bottom: 'full' | 'perimeter'; u: Units; tg: SolveToggles; kind: GlassKind; over?: GlassPrices; onApply: (o: UpgradeOption) => void }) {
  const inp = useMemo<SolveInputs>(() => ({ glass: panes.long, glassEnds: panes.end, glassBottom: panes.bottom, strip: 0.25 * IN_MM, stripWidth: 3 * IN_MM, depth: null }), [panes.long, panes.end, panes.bottom]);
  const p = useMemo(() => sfPanel(T, rim, brace, inp, sf, bottom, u, true), [T.L, T.D, T.H, rim, JSON.stringify(brace), inp, sf, bottom, u]);
  const diag = useMemo(() => diagnose(T.L, T.H, rim ? 'rimmed' : 'custom', { ...baseOf(inp, sf, T.D, bottom, { mixed: true, bracing: 'custom', brace }), D: T.D }), [T.L, T.D, T.H, rim, JSON.stringify(brace), inp, sf, bottom]);
  // Optimized bracing: the least-glass brace at this glass is offered as one of the ways back (about a second, so after a pause, and only when something fails)
  const auto = !rim && tg.bracing === 'optimized' && !p.ok && p.fits;
  const [best, setBest] = useState<{ brace: BraceSpec | null; meets: boolean } | null>(null);
  const bKey = JSON.stringify([T.L, T.D, T.H, inp, sf, bottom, u, auto]);
  useEffect(() => { setBest(null); if (!auto) return; const t = setTimeout(() => setBest(bestBrace(T, inp, sf, bottom, u, true)), 250); return () => clearTimeout(t); }, [bKey]);
  const card = useMemo(() => p.ok ? null : upgradeCard({ T, rim, panes, brace, sf, bottom, mixed: tg.mixed, kind, over, u, best }), [p.ok, T.L, T.D, T.H, rim, panes.long, panes.end, panes.bottom, JSON.stringify(brace), sf, bottom, tg.mixed, kind, JSON.stringify(over), u, best]);
  const same = panes.long === panes.end && panes.end === panes.bottom;
  return <>
    <div class="hint">This tank, {lenText(T.L, u)} × {lenText(T.D, u)} × {lenText(T.H, u)}, filled to the brim, at its own glass ({same ? glassText(panes.long, u) : `${glassText(panes.long, u)} front and back, ${glassText(panes.end, u)} ends, ${glassText(panes.bottom, u)} bottom`}){rim ? ', the trim holding the top edge' : brace ? ` with ${braceText(brace, u)}` : ', no brace'}. Change the size above: nothing is blocked, the safety factors follow.</div>
    <table class="gtable" aria-label="Safety factor by pane"><thead><tr><th>Pane</th><th>Glass</th><th>SF</th><th>Set by</th></tr></thead>
      <tbody>{p.rows.map((r, i) => <tr><td>{r.label}</td><td>{i === 0 ? glassText(panes.long, u) : i === 1 ? glassText(panes.end, u) : i === 2 ? glassText(panes.bottom, u) : ''}</td><td class={r.ok ? '' : 'bad'}><b>{r.sf}</b></td><td class="hint">{r.note}</td></tr>)}</tbody></table>
    <div class="drow"><span>Lowest safety factor (minimum {sf.toFixed(1)})</span><Pill tone={p.ok ? 'ok' : 'bad'}>{p.min}</Pill></div>
    <div class={`hint${p.ok ? '' : ' bad'}`} aria-live="polite">{p.ok ? `Meets the minimum of ${sf.toFixed(1)}.` : `Under the minimum of ${sf.toFixed(1)}: lowest ${p.min}.`}</div>
    {card && !p.ok ? <div class="dwarn warn upgrade" role="region" aria-label="Ways to get back over the minimum">
      <b>Back over {sf.toFixed(1)}</b>
      {!p.fits ? <div class="hint">The brace strips leave less than 6 in clear: make them narrower first.</div> : null}
      {auto && !best ? <div class="hint" aria-live="polite">Looking for a brace…</div> : null}
      {p.fits && !card.options.length && !(auto && !best) ? <div class="hint">No stock glass or brace gets this tank to {sf.toFixed(1)}: make it smaller, add a rim or lower the minimum.</div> : null}
      {card.options.map((o, i) => <div class="drow" key={o.label}><span>{o.label}<div class="hint">SF {o.sf.toFixed(1)} · about +${Math.max(0, Math.round(o.costUsd)).toLocaleString('en-US')}{o.own ? ' (your prices)' : ' (estimate)'}{i === 0 ? ' · cheapest' : ''}</div></span>
        <button type="button" class="btn sm" onClick={() => onApply(o)}>Apply</button></div>)}
      <div class="hint">{tg.mixed ? 'Mixed: only the failing panes go up.' : 'Same everywhere: the whole tank’s glass goes up.'} Set your own glass prices below.</div>
    </div> : null}
    {p.joints.some(j => !j.ok) ? <div class="dwarn warn">⚠ A silicone joint is over its design stress: widen the bond or use more silicone.</div> : null}
    {p.fits ? <FailView d={diag} u={u} dims={{ L: T.L, D: T.D, H: T.H }} /> : null}
  </>;
}

/** "Your price per sq ft": one field per stock thickness, the estimate as the placeholder; blank = the estimate. */
export function GlassPriceFields({ kind, over, set, u }: { kind: GlassKind; over?: GlassPrices; set: (o: GlassPrices | undefined) => void; u: Units }) {
  const ts = (u === 'in' ? STOCK_US_PICK : STOCK_METRIC).filter(t => t >= 3 && t <= 26);
  return <details class="gprices"><summary>Glass prices ($ per sq ft){over && Object.keys(over).length ? ' · yours set' : ''}</summary>
    <div class="hint">Cut to size at a glass shop, {kind === 'lowiron' ? 'low-iron' : 'clear float'}. Estimates from research/glass-prices.md; type your own quote to replace one. Upgrade costs use these.</div>
    {ts.map(t => { const k = priceKey(t), e = estimateSqFt(t, kind); return <div class="row" key={k}><span class="lbl">{glassText(t, u)}</span>
      <span class="val"><input class="input num" type="number" min={0} step={0.5} value={over?.[k] ?? ''} placeholder={e.toFixed(2)} aria-label={`Price per square foot, ${glassText(t, u)} glass`}
        onChange={ev => { const raw = (ev.target as HTMLInputElement).value, v = parseFloat(raw), n = { ...(over ?? {}) }; if (raw === '' || !Number.isFinite(v) || v < 0) delete n[k]; else n[k] = Math.round(v * 100) / 100; set(Object.keys(n).length ? n : undefined); }} /></span><span class="unit">$/sq ft</span></div>; })}
    {over && Object.keys(over).length ? <button type="button" class="btn sm" onClick={() => set(undefined)}>Back to estimates</button> : null}
  </details>;
}

const LCOL: Record<BraceLevel, string> = { none: 'var(--bad)', perimeter: 'var(--warn)', cross1: 'var(--ok)', cross2: 'var(--accent)', rimmed: 'var(--text-2)', custom: 'var(--accent)' };
const DASH: Record<BraceLevel, string> = { none: '', perimeter: '7 3', cross1: '', cross2: '2 3', rimmed: '10 4', custom: '' };

/** "What can I build?": largest height against length, one line per bracing level, same engine as the table. */
export function WideView({ T, rim, inp, setInp, sf, bottom, u, tg, onClose }: { T: Tk; rim: boolean; inp: SolveInputs; setInp: (i: SolveInputs) => void; sf: number; bottom: 'full' | 'perimeter'; u: Units; tg: SolveToggles; onClose: () => void }) {
  const lens = (u === 'in' ? [12, 18, 24, 30, 36, 48, 60, 72, 96] : [30, 45, 60, 75, 90, 120, 150, 180, 240]).map(v => fromU(v, u));
  const levels = levelsOf(rim, tg);
  const [data, setData] = useState<ReturnType<typeof heightTable> | null>(null);
  const key = JSON.stringify([inp, sf, bottom, u, rim, Math.round(T.D), tg]);
  useEffect(() => { setData(null); const t = setTimeout(() => setData(heightTable(levels, lens, baseOf(inp, sf, T.D, bottom, tg), { max: H_MAX })), 300); return () => clearTimeout(t); }, [key]);
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
        <div class="hint">Largest height for each length at {glassWords(inp, tg, u)} glass, safety factor {sf.toFixed(1)}, {lenText(inp.depth ?? T.D, u)} deep, filled to the brim. Set the glass, bracing and depth in Glass check.</div>
        <div class="seg envin" role="group" aria-label="Glass">{glassChoices(u).flatMap(g => g.items.map(i => i.mm)).sort((a, b) => a - b).filter(t => t >= 4.7 && t <= 19.1).map(t => <button type="button" class={Math.abs(inp.glass - t) < 0.01 ? 'on' : ''} aria-pressed={Math.abs(inp.glass - t) < 0.01} onClick={() => setInp({ ...inp, glass: t })}>{glassText(t, u)}</button>)}</div>
        {!data ? <div class="hint" aria-live="polite">Working it out…</div> : <svg class="envsvg" viewBox={`0 0 ${W} ${Ht}`} role="img" aria-label="Largest height against length for each bracing level">
          {ticks.map(h => <g><line x1={x0} x2={x1} y1={Y(h)} y2={Y(h)} stroke="var(--line)" /><text x={x0 - 6} y={Y(h) + 4} text-anchor="end" font-size="11" fill="var(--text-3)">{Math.round(h / unitMm)}</text></g>)}
          {lens.map(L => <text x={X(L)} y={y0 + 16} text-anchor="middle" font-size="11" fill="var(--text-3)">{Math.round(L / unitMm)}</text>)}
          <text x={(x0 + x1) / 2} y={Ht - 4} text-anchor="middle" font-size="11" fill="var(--text-3)">Tank length ({u === 'in' ? 'in' : 'cm'})</text>
          <text x={12} y={(y0 + y1) / 2} font-size="11" fill="var(--text-3)" transform={`rotate(-90 12 ${(y0 + y1) / 2})`} text-anchor="middle">Largest height ({u === 'in' ? 'in' : 'cm'})</text>
          {data.map((row, i) => { const pts = row.filter(c => c.solved.value > 0).map(c => `${X(c.L)},${Y(c.solved.value)}`).join(' '); return pts ? <polyline points={pts} fill="none" stroke={LCOL[levels[i]]} stroke-width="2.4" stroke-dasharray={DASH[levels[i]] || undefined} /> : null; })}
          <circle cx={X(Math.min(lmax, Math.max(lmin, T.L)))} cy={Y(Math.min(top, T.H))} r="5" fill="var(--text)"><title>This tank</title></circle>
        </svg>}
        <div class="envkey">{levels.map(l => <span><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke={LCOL[l]} stroke-width="2.4" stroke-dasharray={DASH[l] || undefined} /></svg> {l === 'rimmed' && !rim ? 'Rimmed (trim): the most any brace can do' : l === 'custom' ? braceText(tg.brace, u) : BRACE_LEVELS.find(x => x.id === l)!.label}</span>)}<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="var(--text)" /></svg> This tank</span></div>
      </div>
    </div>
  );
}
