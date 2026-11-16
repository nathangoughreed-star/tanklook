// GS4 (2026-11-16; R110): "where the glass fails" and an exaggerated deflection view, drawn from the solver's own plate grids (scene/glassDiagnose.ts).
// Stress: each pane coloured by the local safety factor (green: 25 % or more to spare, amber: passes with less, red: fails) with the peak marked.
// Deflection: each pane shaded by deflection, plus its deformed profile through the deepest point both ways, exaggerated by the factor shown, over the
// faint undeformed outline; the true maximum and the allowed limit in the person's units.
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Vector3 } from 'three';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { failOverlay, type FailPane } from './failOverlay';
import { GLASS_MOR } from '../scene/glassSolver';
import { deflText, exaggeration, verdictText, type Diagnosis, type PaneDiag, type Tone } from '../scene/glassDiagnose';
import { Pill } from './ui';
import { Seg, Toggle } from './tank';
import { lenText } from './logic/tankEnvelope';
import type { Units } from './logic/tank';

const COL: Record<Tone, string> = { ok: 'var(--ok)', near: 'var(--warn)', bad: 'var(--bad)' };
const WORD: Record<Tone, string> = { ok: 'safe', near: 'close', bad: 'fails' };
const PILL: Record<Tone, 'ok' | 'warn' | 'bad'> = { ok: 'ok', near: 'warn', bad: 'bad' };

function Pane({ p, mode, target, u, hot, setHot }: { p: PaneDiag; mode: 'stress' | 'defl'; target: number; u: Units; hot: FailPane | null; setHot: (h: FailPane | null) => void }) {
  const { nx, ny, w, sigma } = p.grid, allow = GLASS_MOR / target;
  const prof = mode === 'defl' ? 0.2 * p.b : 0, gap = mode === 'defl' ? 0.04 * p.b : 0, W = p.a + gap + prof, H = p.b + gap + prof;
  const N = exaggeration(p.w, p.b), sx = (i: number) => p.a * i / (nx - 1), sy = (j: number) => p.b - p.b * j / (ny - 1);
  let wi = 0, wj = 0, wm = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (Math.abs(w[j][i]) > wm) { wm = Math.abs(w[j][i]); wi = i; wj = j; }
  const cw = p.a / (nx - 1) * 2, ch = p.b / (ny - 1) * 2, cells: JSX.Element[] = [];
  for (let j = 0; j < ny; j += 2) for (let i = 0; i < nx; i += 2) {
    if (mode === 'stress') { const r = sigma[j][i] / allow, tone: Tone = r <= 1 / 1.25 ? 'ok' : r <= 1 ? 'near' : 'bad'; cells.push(<rect x={sx(i) - cw / 2} y={sy(j) - ch / 2} width={cw} height={ch} fill={COL[tone]} fill-opacity={0.18 + 0.6 * Math.min(1, r)} />); }
    else cells.push(<rect x={sx(i) - cw / 2} y={sy(j) - ch / 2} width={cw} height={ch} fill="var(--accent)" fill-opacity={wm > 0 ? 0.08 + 0.7 * Math.abs(w[j][i]) / wm : 0} />);
  }
  // deformed profiles through the deepest point: vertical (a column, drawn right of the pane) and horizontal (a row, drawn under it)
  const px0 = p.a + gap + prof / 2, py0 = p.b + gap + prof / 2;
  const vprof = Array.from({ length: ny }, (_, j) => `${px0 + w[j][wi] * N},${sy(j)}`).join(' ');
  const hprof = Array.from({ length: nx }, (_, i) => `${sx(i)},${py0 + w[wj][i] * N}`).join(' ');
  const line = { stroke: 'var(--text-3)', 'stroke-width': p.b / 300, 'stroke-opacity': 0.7 };
  return (
    <div class={`failcard${hot === p.id ? ' hot' : ''}`} onPointerEnter={e => { if (e.pointerType !== 'touch') setHot(p.id); }} onPointerLeave={e => { if (e.pointerType !== 'touch') setHot(null); }} onClick={e => { if ((e as unknown as PointerEvent).pointerType === 'touch' || !(e as unknown as PointerEvent).pointerType) setHot(hot === p.id ? null : p.id); }}>
      <div class="drow"><b>{p.label}</b><Pill tone={p.onStand ? 'ok' : PILL[p.tone]}>{p.onStand ? 'on stand' : `SF ${Number.isFinite(p.sf) ? p.sf.toFixed(1) : '-'} · ${WORD[p.tone]}`}</Pill></div>
      <svg viewBox={`${-p.b * 0.06} ${-p.b * 0.06} ${W + p.b * 0.12} ${H + p.b * 0.12}`} role="img" aria-label={`${p.label}: ${mode === 'stress' ? 'stress map' : 'exaggerated deflection'}`} class="failsvg">
        <rect x={0} y={0} width={p.a} height={p.b} fill="var(--bg-sunken)" />
        {cells}
        <rect x={0} y={0} width={p.a} height={p.b} fill="none" {...line} />
        {mode === 'stress' && !p.onStand ? <g><circle cx={p.at.x} cy={p.b - p.at.y} r={p.b * 0.035} fill="none" stroke="var(--text)" stroke-width={p.b / 120} /><line x1={p.at.x - p.b * 0.06} x2={p.at.x + p.b * 0.06} y1={p.b - p.at.y} y2={p.b - p.at.y} stroke="var(--text)" stroke-width={p.b / 200} /><line y1={p.b - p.at.y - p.b * 0.06} y2={p.b - p.at.y + p.b * 0.06} x1={p.at.x} x2={p.at.x} stroke="var(--text)" stroke-width={p.b / 200} /></g> : null}
        {mode === 'defl' ? <g>
          <line x1={px0} x2={px0} y1={0} y2={p.b} {...line} stroke-dasharray={`${p.b / 60} ${p.b / 60}`} /><polyline points={vprof} fill="none" stroke="var(--accent)" stroke-width={p.b / 110} />
          <line x1={0} x2={p.a} y1={py0} y2={py0} {...line} stroke-dasharray={`${p.b / 60} ${p.b / 60}`} /><polyline points={hprof} fill="none" stroke="var(--accent)" stroke-width={p.b / 110} />
          <circle cx={sx(wi)} cy={sy(wj)} r={p.b * 0.03} fill="var(--accent)" />
        </g> : null}
      </svg>
      {mode === 'stress'
        ? <div class="hint">{p.onStand ? 'Rests on a flat stand: matched to the walls, not checked as a plate. ' : `Peak stress ${(p.sigma * 145.038).toFixed(0)} psi (${p.sigma.toFixed(2)} MPa) of ${(allow * 145.038).toFixed(0)} psi allowed, ${lenText(p.at.x, u)} along and ${lenText(p.at.y, u)} ${p.id === 'bottom' ? 'from the front' : 'above the bottom'}${p.id !== 'bottom' && p.at.y >= 0.98 * p.b ? ', on the free top edge' : ''} (×).`}</div>
        : <div class="hint"><b>{deflText(p.w, u)}</b> true maximum; limit {deflText(p.wLimit, u)} (1 × the glass). Drawn ×{N} (profile through the deepest point, dashed = undeformed).</div>}
    </div>
  );
}

export function FailView({ d, u, dims }: { d: Diagnosis; u: Units; dims: { L: number; D: number; H: number } }) {
  const [mode, setMode] = useState<'stress' | 'defl'>('stress'), [show3d, setShow3d] = useState(true), [hot, setHot] = useState<FailPane | null>(null);
  const uu = u === 'in' ? 'in' : 'cm';
  // the 3D overlay lives exactly as long as this section is open and switched on; leaving restores the plain glass
  useEffect(() => { if (show3d) failOverlay.show(d, mode, { ...dims, t: d.glass }, uu); else failOverlay.hide(); }, [d, mode, show3d, uu]);
  useEffect(() => () => failOverlay.hide(), []);
  useEffect(() => failOverlay.onHot(h => setHot(h)), []);
  return <div class="failview">
    <div class="cap">Where it fails</div>
    <div class={`hint${d.ok ? '' : ' bad'}`} aria-live="polite">{verdictText(d, uu)}</div>
    <Seg label="View" value={mode} opts={[['stress', 'Stress'], ['defl', 'Deflection']]} onPick={setMode} />
    <Toggle on={show3d} label="Show it on the 3D tank" onFlip={setShow3d} />
    <div class="failgrid">{d.panes.map(p => <Pane p={p} mode={mode} target={d.target} u={u} hot={hot} setHot={h => { setHot(h); if (show3d) failOverlay.setHot(h); }} />)}</div>
    {d.brace ? <div class="drow"><span>Brace strips</span><Pill tone={PILL[d.brace.tone]}>{`SF ${d.brace.sf.toFixed(1)} · ${WORD[d.brace.tone]}`}</Pill></div> : null}
    <div class="hint">Green: 25 % or more to spare over the safety factor; amber: passes with less; red: fails. The shapes are the solver's own plate solution (the series the strength check uses), exaggerated; the numbers are true. Front and back are identical, and so are the two ends.{show3d ? ' On the 3D tank the same map is painted on the glass (deflection bows the panes outward by the factor shown); hover or tap a pane there or a card here to find its twin.' : ''}</div>
  </div>;
}

/** The marker labels on the 3D view ("1,544 psi · SF 1.8" / "0.163 in"): projected from the overlay's anchors, following the camera. */
export function FailLabels({ store, getViewer }: { store: Store; getViewer?: () => Viewer | undefined }) {
  const [labels, setLabels] = useState<{ id: string; x: number; y: number; text: string }[]>([]);
  useEffect(() => {
    const tick = () => {
      const v = getViewer?.(), vp = v?.vps[store.scene.active];
      if (!v || !vp || !failOverlay.on) { setLabels(prev => prev.length ? [] : prev); return; }
      vp.cam.updateMatrixWorld();
      const p = new Vector3(), next = failOverlay.anchors.flatMap(a => { p.copy(a.world).project(vp.cam); return p.z > 1 ? [] : [{ id: a.id, text: a.text, x: (p.x + 1) / 2 * vp.w, y: (1 - p.y) / 2 * vp.h }]; });
      setLabels(prev => prev.length === next.length && prev.every((l, i) => l.id === next[i].id && l.text === next[i].text && Math.abs(l.x - next[i].x) < 0.5 && Math.abs(l.y - next[i].y) < 0.5) ? prev : next);
    };
    tick(); const off = failOverlay.onFrame(tick); getViewer?.()?.invalidate();
    return off;
  }, []);
  return <>{labels.map(l => <div key={l.id} class="ov failtag glass" style={{ left: `${l.x}px`, top: `${l.y}px` }}>{l.text}</div>)}</>;
}
