// UI2 shell step 3 (lane S3, 2026-11-13; request R30): the custom tank maker's glass panel, a view-model over GS1's solver
// (scene/glassSolver.ts, doc research/design/gs1-glass-solver.md). Pure: the panel only draws this.
// Rimless = a free top edge (braces optional, the optimizer's table); rimmed = the trim holds the top edge (no brace table).
import { DEFAULT_SF, IN_MM, optimizeBrace, solveGlass, toGlassBuild, type BraceSpec, type GlassBuild, type GlassOpts, type GlassSolution, type JointCheck, type PaneId } from '../../scene/glassSolver';
import { shapeOf } from '../../scene/shape';
import type { Tank } from '../../scene/types';
import { glassText, type Units } from './tank';

export type BraceKind = 'none' | 'perimeter' | 'cross';
export interface GlassChoice {
  /** safety factor, default 3.8 */
  sf: number;
  mode: 'uniform' | 'perPane';
  brace: BraceKind;
  /** what the bottom rests on: a flat stand / mat (full) or only its edges (a framed tank on its trim) */
  bottom: 'full' | 'perimeter';
}
/** The bottom rests on a flat stand / mat by default, rimmed or not: matched to the thickest wall (GS1's builder rule; a rimmed 75 gal then
 *  comes out at 3/8 in all round, what framed 75s are sold with). */
export const defaultChoice = (): GlassChoice => ({ sf: DEFAULT_SF, mode: 'uniform', brace: 'none', bottom: 'full' });

export const DISCLAIMER = 'These thicknesses are an estimate from a standard engineering model (an elastic plate under water pressure, with the safety factor you chose). '
  + 'They are not an engineering approval. Real tanks also depend on glass quality, edge finish, silicone work, the stand, and loads this model does not include. '
  + 'Have a qualified builder or engineer check any tank before you fill it.';

export interface PaneRow { label: string; thickness: string; mm: number | null; sf: string; governs: string; ok: boolean }
export interface BraceRow { kind: BraceKind; label: string; walls: string; cost: number; opening: string; ok: boolean; spec: BraceSpec | null; on: boolean }
export interface JointRow { label: string; use: string; ok: boolean }
export interface GlassPanel {
  /** false: not a box tank, the solver covers rectangles only */
  supported: boolean;
  reason?: string;
  top: 'free' | 'held';
  topLine: string;
  panes: PaneRow[];
  /** the smallest SF over the panes at the chosen glass */
  sfAchieved: string;
  sfOk: boolean;
  braces: BraceRow[];
  joints: JointRow[];
  notes: string[];
  weight: string;
  /** what "Use this glass" writes: the drawn thickness (thickest pane) and the build saved with the custom tank */
  use: { glass: number; build: GlassBuild } | null;
}

const PANE_ROWS: [PaneId, string][] = [['front', 'Front and back'], ['left', 'Ends'], ['bottom', 'Bottom']];
const GOVERNS: Record<string, string> = { stress: 'strength', deflection: 'bending', rule: 'matched to walls' };
const JOINT: Record<string, string> = { 'cross tie': 'Cross brace ends', 'brace to wall': 'Brace to wall', 'wall to bottom': 'Walls on the bottom', corner: 'Corners' };

/** Solver opts for a spec and a choice; braces only on a rimless tank. */
export function solverOpts(rim: boolean, c: GlassChoice, units: Units, brace: BraceSpec | null = null): GlassOpts {
  return { safetyFactor: c.sf, mode: c.mode, units: units === 'in' ? 'us' : 'metric', topEdge: rim ? 'held' : 'free', bottomSupport: c.bottom, brace: rim ? null : brace };
}

const fmtSf = (v: number) => Number.isFinite(v) ? v.toFixed(1) : '-';

/** The whole panel. A rimless tank runs the brace optimizer (its table); a rimmed one is solved with its top held and has no brace table. */
export function glassPanel(T: Tank, rim: boolean, c: GlassChoice, u: Units): GlassPanel {
  const empty = (reason: string): GlassPanel => ({ supported: false, reason, top: rim ? 'held' : 'free', topLine: '', panes: [], sfAchieved: '-', sfOk: false, braces: [], joints: [], notes: [], weight: '', use: null });
  if (shapeOf(T) !== 'rect') return empty('The glass check works on box tanks (rectangles) for now; other shapes keep the glass you pick.');
  const spec = { L: T.L, D: T.D, H: T.H };
  let sol: GlassSolution, braces: BraceRow[] = [], brace: BraceSpec | null = null;
  if (rim) sol = solveGlass(spec, solverOpts(true, c, u));
  else {
    const opt = optimizeBrace(spec, { ...solverOpts(false, c, u), continuous: false });
    const kindOf = (b: BraceSpec | null): BraceKind => !b ? 'none' : (b.cross ?? 0) > 0 ? 'cross' : 'perimeter';
    const chosen = opt.options.find(o => kindOf(o.brace) === c.brace) ?? opt.options[0];
    brace = chosen.brace;
    braces = opt.options.map(o => ({
      kind: kindOf(o.brace), label: o.label, cost: Math.round(o.costIndex), ok: o.solution.ok, spec: o.brace, on: o === chosen,
      walls: `${o.solution.panes.front.label} / ${o.solution.panes.left.label}`,
      opening: o.brace ? `${fmtLenIn(o.opening.depth, u)} × ${fmtLenIn(o.opening.length, u)} open` : 'fully open',
    }));
    sol = solveGlass(spec, solverOpts(false, c, u, brace)); // the chosen row, with the continuous thickness and joints
  }
  const panes = PANE_ROWS.map(([id, label]) => {
    const p = sol.panes[id];
    // a bottom on a flat stand is matched to the walls (a rule, not a plate check): its plate SF is shown but does not set the verdict
    const rule = p.governs === 'rule';
    return { label, mm: p.thickness, thickness: p.thickness == null ? 'over stock' : glassText(p.thickness, u), sf: rule ? 'on stand' : fmtSf(p.sf), governs: GOVERNS[p.governs] ?? p.governs, ok: p.thickness != null && (rule || p.sf + 1e-9 >= c.sf) };
  });
  const sfs = PANE_ROWS.filter(([id]) => sol.panes[id].governs !== 'rule').map(([id]) => sol.panes[id].sf).concat(sol.brace ? [sol.brace.sf] : []);
  const minSf = Math.min(...sfs);
  const joints = sol.joints.map((j: JointCheck) => ({ label: JOINT[j.joint] ?? j.joint, use: `${Math.round(j.utilization * 100)} % of design stress`, ok: j.ok }));
  const build = toGlassBuild(sol, brace, c.sf);
  const thick = build ? Math.max(...Object.values(build.panes)) : null;
  return {
    supported: true, top: rim ? 'held' : 'free',
    topLine: rim ? 'Rimmed: the trim holds the top edge of each pane.' : brace ? 'Rimless with a eurobrace: the brace stiffens the top edge.' : 'Rimless: the top edge of each pane is free.',
    panes, sfAchieved: fmtSf(minSf), sfOk: sol.ok && minSf + 1e-9 >= c.sf, braces, joints, notes: sol.notes.filter(n => !/^Bottom rests/.test(n)),
    weight: `${Math.round(sol.weightLb)} lb of glass`,
    use: build && thick ? { glass: thick, build } : null,
  };
}

const fmtLenIn = (mm: number, u: Units) => u === 'in' ? `${+(mm / IN_MM).toFixed(1)} in` : `${Math.round(mm / 10)} cm`;
