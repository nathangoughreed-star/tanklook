// GS2 (2026-11-15): the view-model of the glass solver's "Size" and "Safety factor" modes (engine: scene/glassEnvelope.ts). Pure.
import { IN_MM } from '../../scene/glassSolver';
import { BRACE_LEVELS, braceFor, braceFits, checkTank, heightTable, type BraceLevel, type EnvelopeBase, type EnvelopeCell, type TankCheck } from '../../scene/glassEnvelope';
import type { Units } from './tank';
import { glassText } from './tank';

/** Tank heights the maker allows (SIDE_RANGE.H): the table stops there. */
export const H_MAX = 48 * IN_MM;
export interface SolveInputs { glass: number; strip: number; stripWidth: number; /** null = the tank's own depth */ depth: number | null }

export const lenText = (mm: number, u: Units) => u === 'in' ? `${+(mm / IN_MM).toFixed(1)} in` : `${Math.round(mm / 10)} cm`;
/** Columns of the table: round lengths in the person's units, plus this tank's own length. */
export function columns(L: number, u: Units): number[] {
  const base = (u === 'in' ? [24, 36, 48, 72] : [60, 90, 120, 180]).map(v => v * (u === 'in' ? IN_MM : 10));
  const own = Math.round(L / (u === 'in' ? IN_MM : 10)) * (u === 'in' ? IN_MM : 10);
  return [...new Set([...base, ...(base.some(b => Math.abs(b - own) < 0.5 * (u === 'in' ? IN_MM : 10)) ? [] : [own])])].sort((a, b) => a - b);
}

export const baseOf = (inp: SolveInputs, sf: number, D: number, bottom: 'full' | 'perimeter'): EnvelopeBase => ({ glass: inp.glass, strip: inp.strip, stripWidth: inp.stripWidth, sf, D: inp.depth ?? D, bottom });

export interface SizeCell { text: string; title: string; warn: boolean; none: boolean; L: number; H: number; level: BraceLevel }
export interface SizeRow { level: BraceLevel; label: string; cells: SizeCell[] }
export interface SizeTable { cols: { L: number; text: string; own: boolean }[]; rows: SizeRow[]; D: number }

const GOV: Record<string, string> = { front: 'the front and back walls', ends: 'the end walls', bottom: 'the bottom', brace: 'the brace strips', deflection: 'wall bending (deflection)' };
const JOINT: Record<string, string> = { 'cross tie': 'cross brace ends', 'brace to wall': 'brace to wall', 'wall to bottom': 'walls on the bottom', corner: 'corners' };

/** Largest height (fully filled) for each brace level at each length. Slow (about a second): call from an effect after a pause. */
export function sizeTable(T: { L: number }, rim: boolean, inp: SolveInputs, sf: number, D: number, bottom: 'full' | 'perimeter', u: Units): SizeTable {
  const b = baseOf(inp, sf, D, bottom), cols = columns(T.L, u);
  const levels: BraceLevel[] = rim ? ['rimmed'] : ['none', 'perimeter', 'cross1', 'cross2', 'rimmed'];
  const grid = heightTable(levels, cols, b, { max: H_MAX });
  const cell = (c: EnvelopeCell): SizeCell => {
    const v = c.solved.value, at = c.solved.at;
    if (!c.fits) return { text: '–', title: 'The strips leave less than 6 in clear: too tight for hands and gear.', warn: false, none: true, L: c.L, H: v, level: c.level };
    if (v <= 0) return { text: '–', title: 'Even a short tank fails at this glass and safety factor.', warn: false, none: true, L: c.L, H: v, level: c.level };
    const txt = c.solved.capped ? `${u === 'in' ? Math.round(v / IN_MM) : Math.round(v / 10)}+` : u === 'in' ? (v / IN_MM).toFixed(1) : String(Math.round(v / 10));
    const warn = !!at && !at.jointsOk, joints = at ? at.badJoints.map(j => JOINT[j] ?? j).join(', ') : '';
    const title = `${lenText(c.L, u)} long, up to ${lenText(v, u)} tall${c.solved.capped ? ' (the tallest the maker allows)' : `, set by ${at ? GOV[at.governs] : ''}`}.${warn ? ` Silicone over its design stress at: ${joints}. Widen the bond or add silicone.` : ''}`;
    return { text: txt, title, warn, none: false, L: c.L, H: v, level: c.level };
  };
  const label = (l: BraceLevel) => l === 'rimmed' && !rim ? 'Rimmed (trim): the limit' : BRACE_LEVELS.find(x => x.id === l)!.label;
  return { D: b.D, cols: cols.map(L => ({ L, text: lenText(L, u), own: Math.abs(L - T.L) < 0.5 * (u === 'in' ? IN_MM : 10) })), rows: grid.map((r, i) => ({ level: levels[i], label: label(levels[i]), cells: r.map(cell) })) };
}

export interface SfRow { label: string; sf: string; ok: boolean; note: string }
export interface SfPanel { rows: SfRow[]; min: string; ok: boolean; verdict: string; joints: { label: string; use: string; ok: boolean }[]; fits: boolean }
const f1 = (v: number) => Number.isFinite(v) ? v.toFixed(1) : '-';

/** The safety factor each member has at this glass and this tank (fully filled). One solve. */
export function sfPanel(T: { L: number; D: number; H: number }, level: BraceLevel, inp: SolveInputs, sf: number, bottom: 'full' | 'perimeter', u: Units): SfPanel {
  const b = baseOf(inp, sf, T.D, bottom), c: TankCheck = checkTank(T.L, T.H, level, { ...b, D: T.D });
  const rows: SfRow[] = [
    { label: 'Front and back', sf: f1(c.sf.front), ok: c.sf.front + 1e-9 >= sf, note: 'strength' },
    { label: 'Ends', sf: f1(c.sf.ends), ok: c.sf.ends + 1e-9 >= sf, note: 'strength' },
    c.sf.bottom == null ? { label: 'Bottom', sf: 'on stand', ok: true, note: 'matched to walls' } : { label: 'Bottom', sf: f1(c.sf.bottom), ok: c.sf.bottom + 1e-9 >= sf, note: 'strength' },
    ...(c.sf.brace != null ? [{ label: 'Brace strips', sf: f1(c.sf.brace), ok: c.sf.brace + 1e-9 >= sf, note: 'strength' }] : []),
    { label: 'Wall bending', sf: `${c.deflRatio.toFixed(2)} t`, ok: c.deflRatio <= 1 + 1e-9, note: 'limit 1 t' },
  ];
  const ok = c.ok, gl = glassText(inp.glass, u);
  const verdict = !c.fits ? 'The strips leave less than 6 in clear: make them narrower.' : ok ? `${gl} glass meets the safety factor of ${sf.toFixed(1)} on this tank.` : `${gl} glass does not meet ${sf.toFixed(1)} (lowest ${f1(c.minSf)}, set by ${GOV[c.governs]}): use thicker glass, add bracing or make the tank smaller.`;
  const joints = c.solution.joints.map(j => ({ label: JOINT[j.joint] ?? j.joint, use: `${Math.round(j.utilization * 100)} % of design stress`, ok: j.ok }));
  return { rows, min: f1(c.minSf), ok, verdict, joints, fits: c.fits };
}
export { braceFor, braceFits };
