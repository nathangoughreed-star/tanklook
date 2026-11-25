// UI2 shell step 3 (lane S3, 2026-11-13; request R30): the custom tank maker's glass panel, a view-model over GS1's solver
// (scene/glassSolver.ts, doc research/design/gs1-glass-solver.md). Pure: the panel only draws this.
// Rimless = a free top edge (braces optional, the optimizer's table); rimmed = the trim holds the top edge (no brace table).
import { DEFAULT_SF, IN_MM, optimizeBrace, optimizeBraceCustom, solveGlass, toGlassBuild, type BraceLocks, type BraceSpec, type GlassBuild, type GlassOpts, type GlassSolution, type JointCheck, type PaneId } from '../../scene/glassSolver';
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
  /** A brace the person set field by field (or Optimize filled in); wins over `brace` (lane CT1). Rimless box tanks only. */
  custom?: BraceSpec;
  /** The Glass check's bracing toggle (Nathan 2026-11-24): 'optimized' = the optimizer's least-glass brace, whatever `brace` / `custom` say;
   *  'custom' (or unset) = the person's brace (`custom`, else the `brace` kind's row). */
  bracing?: 'optimized' | 'custom';
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
  /** The brace in force (preset, custom or Optimize's): drawn in the preview, shown in the fields; null = none (lane CT1). */
  braceNow: BraceSpec | null;
  /** What the brace does to the opening / what is wrong with its size */
  braceNote: string;
  /** Total glass: volume and weight, in the person's units */
  volume: string;
  /** One plain line: the safety factor is met (or not) and what governs */
  verdict: string;
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
  const empty = (reason: string): GlassPanel => ({ supported: false, reason, top: rim ? 'held' : 'free', topLine: '', panes: [], sfAchieved: '-', sfOk: false, braces: [], joints: [], notes: [], weight: '', use: null, braceNow: null, braceNote: '', volume: '', verdict: '' });
  if (shapeOf(T) !== 'rect') return empty('The glass check works on box tanks (rectangles) for now; other shapes keep the glass you pick.');
  const spec = { L: T.L, D: T.D, H: T.H };
  let sol: GlassSolution, braces: BraceRow[] = [], brace: BraceSpec | null = null, braceNote = '';
  if (rim) sol = solveGlass(spec, solverOpts(true, c, u));
  else {
    const opt = optimizeBrace(spec, { ...solverOpts(false, c, u), continuous: false });
    const kindOf = (b: BraceSpec | null): BraceKind => !b ? 'none' : (b.cross ?? 0) > 0 ? 'cross' : 'perimeter';
    const chosen = c.bracing === 'optimized' ? opt.best : opt.options.find(o => kindOf(o.brace) === c.brace) ?? opt.options[0];
    brace = c.bracing !== 'optimized' && c.custom ? { ...c.custom } : chosen.brace;
    if (brace && braceTooBig(spec, brace)) { braceNote = 'This brace is too wide for the tank: nothing is left open. Drawn and solved without it.'; brace = null; }
    else if (brace) { const o = openingOf(spec, brace); braceNote = `Opening left: ${fmtLenIn(o.depth, u)} front to back × ${fmtLenIn(o.length, u)} between strips${o.depth < 6 * IN_MM || o.length < 6 * IN_MM ? ' (under 6 in: tight for hands, a filter or a heater)' : ''}. Hang-on gear and lids rest on the glass edge: check they clear the strips.`; }
    braces = opt.options.map(o => ({
      kind: kindOf(o.brace), label: o.label, cost: Math.round(o.costIndex), ok: o.solution.ok, spec: o.brace, on: (c.bracing === 'optimized' || !c.custom) && o === chosen,
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
  const sfOk = sol.ok && minSf + 1e-9 >= c.sf;
  const cu = Math.round(sol.volumeIn3);
  const volume = u === 'in' ? `${cu.toLocaleString('en-US')} cu in (${(sol.volumeIn3 / 1728).toFixed(2)} cu ft) of glass, ${Math.round(sol.weightLb)} lb` : `${Math.round(sol.volumeIn3 * 0.016387)} L of glass, ${Math.round(sol.weightLb * 0.4536)} kg`;
  const verdict = sfOk ? `Meets the safety factor of ${c.sf.toFixed(1)}${sol.jointsOk ? '' : ', but a silicone joint is over its design stress'}.` : `Does not meet the safety factor of ${c.sf.toFixed(1)} (lowest ${fmtSf(minSf)}): ${sol.notes.find(n => /over|exceed|stress/i.test(n)) ?? 'make the glass or the brace thicker.'}`;
  const thick = build ? Math.max(...Object.values(build.panes)) : null;
  return {
    supported: true, top: rim ? 'held' : 'free',
    topLine: rim ? 'Rimmed: the trim holds the top edge of each pane.' : brace ? 'Rimless with a eurobrace: the brace stiffens the top edge.' : 'Rimless: the top edge of each pane is free.',
    panes, sfAchieved: fmtSf(minSf), sfOk, braces, joints, notes: sol.notes.filter(n => !/^Bottom rests/.test(n)),
    weight: `${Math.round(sol.weightLb)} lb of glass`,
    use: build && thick ? { glass: thick, build } : null,
    braceNow: brace, braceNote, volume, verdict,
  };
}

const fmtLenIn = (mm: number, u: Units) => u === 'in' ? `${+(mm / IN_MM).toFixed(1)} in` : `${Math.round(mm / 10)} cm`;

/** Clear opening between the strips (mm), front to back and along the length (between cross braces). */
const openingOf = (T: { L: number; D: number }, b: BraceSpec) => ({ depth: T.D - 2 * b.width, length: (T.L - 2 * b.width - (b.cross ?? 0) * (b.crossWidth ?? b.width)) / ((b.cross ?? 0) + 1) });
/** A brace that leaves no room (the solver and the 3D model both need some clear glass). */
export const braceTooBig = (T: { L: number; D: number }, b: BraceSpec) => { const o = openingOf(T, b); return o.depth < IN_MM || o.length < IN_MM || b.thickness <= 0; };

/** Brace fields' defaults when a person starts typing one: 2.5 in strips of 1/4 in (6 mm) glass, the thinnest sensible strip. */
export const startBrace = (u: Units): BraceSpec => ({ width: 2.5 * IN_MM, thickness: u === 'in' ? 0.25 * IN_MM : 6, cross: 0 });

export interface OptimizeResult { brace: BraceSpec | null; line: string; ok: boolean }
/**
 * The Optimize button: the least total glass that still meets the safety factor (silicone joints included), searching only the brace
 * fields the person left unlocked (`locks` holds the values of the locked ones) and filling in the rest. Pure; about a second on a big
 * tank, so call it from the button.
 */
export function optimizeChoice(T: Tank, c: GlassChoice, u: Units, locks: BraceLocks = {}): OptimizeResult {
  const spec = { L: T.L, D: T.D, H: T.H };
  const r = optimizeBraceCustom(spec, { ...solverOpts(false, c, u), locked: locks });
  if (!r.best) return { brace: null, ok: false, line: `No brace meets a safety factor of ${c.sf.toFixed(1)} with those locked fields (${r.tried} tried): unlock one, or lower the safety factor.` };
  const b = r.best.brace, less = Math.round(100 - r.best.costIndex);
  if (!b) return { brace: null, ok: true, line: `No brace: it is the least glass that meets ${c.sf.toFixed(1)} (every brace tried adds more than it saves).` };
  const walls = r.best.solution.panes.front.thickness;
  const what = `${fmtLenIn(b.width, u)} perimeter${b.cross ? `, ${b.cross} cross` : ''}, ${glassText(b.thickness, u)} strips${walls != null ? `, walls ${glassText(walls, u)}` : ''}`;
  return { brace: b, ok: true, line: `${what}: ${less >= 0 ? `${less}% less` : `${-less}% more`} glass than unbraced.` };
}
