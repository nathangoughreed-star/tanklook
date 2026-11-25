// GS2 (2026-11-15): the view-model of the glass solver's "Size" and "Safety factor" modes (engine: scene/glassEnvelope.ts). Pure.
import { IN_MM, STOCK_METRIC, STOCK_US_PICK, optimizeBraceCustom, type BraceSpec } from '../../scene/glassSolver';
import { BRACE_LEVELS, braceFor, braceFits, checkTank, heightTable, wallsOf, type BraceLevel, type EnvelopeBase, type EnvelopeCell, type TankCheck } from '../../scene/glassEnvelope';
import type { Units } from './tank';
import { glassText } from './tank';

/** Tank heights the maker allows (SIDE_RANGE.H): the table stops there. */
export const H_MAX = 48 * IN_MM;
export interface SolveInputs {
  /** front and back (and every pane when the glass is not mixed) */
  glass: number;
  /** mixed glass: the ends and the bottom */
  glassEnds?: number; glassBottom?: number;
  strip: number; stripWidth: number; /** null = the tank's own depth */ depth: number | null;
}

/** The Glass check's two toggles (Nathan 2026-11-24: "a toggle for allowing glass of different thicknesses in the same build, and a toggle for
 *  bracing (optimized or custom)"), shared by all three Solve for modes. */
export interface SolveToggles {
  mixed: boolean;
  bracing: 'optimized' | 'custom';
  /** the person's brace when bracing is custom (null = no brace) */
  brace: BraceSpec | null;
}
export const TOGGLES0: SolveToggles = { mixed: false, bracing: 'optimized', brace: null };

export const lenText = (mm: number, u: Units) => u === 'in' ? `${+(mm / IN_MM).toFixed(1)} in` : `${Math.round(mm / 10)} cm`;
/** Columns of the table: round lengths in the person's units, plus this tank's own length. */
export function columns(L: number, u: Units): number[] {
  const base = (u === 'in' ? [24, 36, 48, 72] : [60, 90, 120, 180]).map(v => v * (u === 'in' ? IN_MM : 10));
  const own = Math.round(L / (u === 'in' ? IN_MM : 10)) * (u === 'in' ? IN_MM : 10);
  return [...new Set([...base, ...(base.some(b => Math.abs(b - own) < 0.5 * (u === 'in' ? IN_MM : 10)) ? [] : [own])])].sort((a, b) => a - b);
}

export const baseOf = (inp: SolveInputs, sf: number, D: number, bottom: 'full' | 'perimeter', tg: SolveToggles = TOGGLES0): EnvelopeBase => ({
  glass: inp.glass, strip: inp.strip, stripWidth: inp.stripWidth, sf, D: inp.depth ?? D, bottom,
  ...(tg.mixed ? { glassEnds: inp.glassEnds ?? inp.glass, glassBottom: inp.glassBottom ?? inp.glass } : {}),
  brace: tg.brace, autoStrips: tg.bracing === 'optimized',
});

/** The thickness words for a caption: "1/4 in", or "1/4 in front and back, 3/16 in ends, 3/8 in bottom". */
export function glassWords(inp: SolveInputs, tg: Pick<SolveToggles, 'mixed'>, u: Units): string {
  if (!tg.mixed) return glassText(inp.glass, u);
  const w = wallsOf({ glass: inp.glass, glassEnds: inp.glassEnds, glassBottom: inp.glassBottom });
  return `${glassText(w.long, u)} front and back, ${glassText(w.end, u)} ends, ${glassText(w.bottom, u)} bottom`;
}

/** Bracing rows of the Size table and the chart. Optimized: every level with the strongest strips that fit; custom: the person's brace. */
export const levelsOf = (rim: boolean, tg: SolveToggles): BraceLevel[] => rim ? ['rimmed'] : tg.bracing === 'custom' ? ['custom', 'rimmed'] : ['none', 'perimeter', 'cross1', 'cross2', 'rimmed'];
export const braceText = (b: BraceSpec | null, u: Units): string => !b ? 'No brace' : `${lenText(b.width, u)} perimeter${b.cross ? ` + ${b.cross} cross` : ''}, ${glassText(b.thickness, u)} strips`;

export interface SizeCell { text: string; title: string; warn: boolean; none: boolean; L: number; H: number; level: BraceLevel; /** the brace this cell was solved with */ brace: BraceSpec | null }
export interface SizeRow { level: BraceLevel; label: string; cells: SizeCell[] }
export interface SizeTable { cols: { L: number; text: string; own: boolean }[]; rows: SizeRow[]; D: number }

const GOV: Record<string, string> = { front: 'the front and back walls', ends: 'the end walls', bottom: 'the bottom', brace: 'the brace strips', deflection: 'wall bending (deflection)' };
const JOINT: Record<string, string> = { 'cross tie': 'cross brace ends', 'brace to wall': 'brace to wall', 'wall to bottom': 'walls on the bottom', corner: 'corners' };

/** Largest height (fully filled) for each brace level at each length. Slow (about a second): call from an effect after a pause. */
export function sizeTable(T: { L: number }, rim: boolean, inp: SolveInputs, sf: number, D: number, bottom: 'full' | 'perimeter', u: Units, tg: SolveToggles = TOGGLES0): SizeTable {
  const b = baseOf(inp, sf, D, bottom, tg), cols = columns(T.L, u);
  const levels = levelsOf(rim, tg);
  const grid = heightTable(levels, cols, b, { max: H_MAX });
  const cell = (c: EnvelopeCell): SizeCell => {
    const v = c.solved.value, at = c.solved.at, brace = braceFor(c.level, b, c.L);
    if (!c.fits) return { text: '–', title: 'The strips leave less than 6 in clear: too tight for hands and gear.', warn: false, none: true, L: c.L, H: v, level: c.level, brace };
    if (v <= 0) return { text: '–', title: 'Even a short tank fails at this glass and safety factor.', warn: false, none: true, L: c.L, H: v, level: c.level, brace };
    const txt = c.solved.capped ? `${u === 'in' ? Math.round(v / IN_MM) : Math.round(v / 10)}+` : u === 'in' ? (v / IN_MM).toFixed(1) : String(Math.round(v / 10));
    const warn = !!at && !at.jointsOk, joints = at ? at.badJoints.map(j => JOINT[j] ?? j).join(', ') : '';
    const strips = brace && c.level !== 'custom' && tg.bracing === 'optimized' ? ` Strips: ${braceText(brace, u)}.` : '';
    const title = `${lenText(c.L, u)} long, up to ${lenText(v, u)} tall${c.solved.capped ? ' (the tallest the maker allows)' : `, set by ${at ? GOV[at.governs] : ''}`}.${strips}${warn ? ` Silicone over its design stress at: ${joints}. Widen the bond or add silicone.` : ''}`;
    return { text: txt, title, warn, none: false, L: c.L, H: v, level: c.level, brace };
  };
  const label = (l: BraceLevel) => l === 'rimmed' && !rim ? 'Rimmed (trim): the limit' : l === 'custom' ? braceText(tg.brace, u) : BRACE_LEVELS.find(x => x.id === l)!.label;
  return { D: b.D, cols: cols.map(L => ({ L, text: lenText(L, u), own: Math.abs(L - T.L) < 0.5 * (u === 'in' ? IN_MM : 10) })), rows: grid.map((r, i) => ({ level: levels[i], label: label(levels[i]), cells: r.map(cell) })) };
}

export interface SfRow { label: string; sf: string; ok: boolean; note: string }
export interface SfPanel { rows: SfRow[]; min: string; ok: boolean; verdict: string; joints: { label: string; use: string; ok: boolean }[]; fits: boolean }
const f1 = (v: number) => Number.isFinite(v) ? v.toFixed(1) : '-';

/** The safety factor each member has at this glass and this tank (fully filled), with this brace (rimmed: the trim). One solve. */
export function sfPanel(T: { L: number; D: number; H: number }, rim: boolean, brace: BraceSpec | null, inp: SolveInputs, sf: number, bottom: 'full' | 'perimeter', u: Units, mixed = false): SfPanel {
  const b = baseOf(inp, sf, T.D, bottom, { mixed, bracing: 'custom', brace }), c: TankCheck = checkTank(T.L, T.H, rim ? 'rimmed' : 'custom', { ...b, D: T.D });
  const rows: SfRow[] = [
    { label: 'Front and back', sf: f1(c.sf.front), ok: c.sf.front + 1e-9 >= sf, note: 'strength' },
    { label: 'Ends', sf: f1(c.sf.ends), ok: c.sf.ends + 1e-9 >= sf, note: 'strength' },
    c.sf.bottom == null ? { label: 'Bottom', sf: 'on stand', ok: true, note: 'matched to walls' } : { label: 'Bottom', sf: f1(c.sf.bottom), ok: c.sf.bottom + 1e-9 >= sf, note: 'strength' },
    ...(c.sf.brace != null ? [{ label: 'Brace strips', sf: f1(c.sf.brace), ok: c.sf.brace + 1e-9 >= sf, note: 'strength' }] : []),
    { label: 'Wall bending', sf: `${c.deflRatio.toFixed(2)} t`, ok: c.deflRatio <= 1 + 1e-9, note: 'limit 1 t' },
  ];
  const ok = c.ok, gl = glassWords(inp, { mixed }, u);
  const verdict = !c.fits ? 'The strips leave less than 6 in clear: make them narrower.' : ok ? `${gl} glass meets the safety factor of ${sf.toFixed(1)} on this tank.` : `${gl} glass does not meet ${sf.toFixed(1)} (lowest ${f1(c.minSf)}, set by ${GOV[c.governs]}): use thicker glass, add bracing or make the tank smaller.`;
  const joints = c.solution.joints.map(j => ({ label: JOINT[j.joint] ?? j.joint, use: `${Math.round(j.utilization * 100)} % of design stress`, ok: j.ok }));
  return { rows, min: f1(c.minSf), ok, verdict, joints, fits: c.fits };
}
/**
 * "Optimized" bracing when solving for the safety factor: the brace with the least glass that meets the safety factor at THIS glass (the same
 * search as the maker's Optimize, walls held at the thicknesses given), or, when none does, the strongest brace that fits (the highest lowest
 * safety factor). About a second on a big tank: call it from an effect.
 */
export function bestBrace(T: { L: number; D: number; H: number }, inp: SolveInputs, sf: number, bottom: 'full' | 'perimeter', u: Units, mixed: boolean): { brace: BraceSpec | null; meets: boolean; line: string } {
  const b = { ...baseOf(inp, sf, T.D, bottom, { mixed, bracing: 'optimized', brace: null }), D: T.D }, w = wallsOf(b);
  // the strongest brace first (widest strips that fit, in the wall glass): if even it fails, no search can pass, so skip it (it is the slow part)
  let top: { brace: BraceSpec | null; c: TankCheck } = { brace: null, c: checkTank(T.L, T.H, 'none', b) };
  for (const lv of ['perimeter', 'cross1', 'cross2'] as BraceLevel[]) {
    const br = braceFor(lv, b, T.L);
    if (!br || !braceFits(T.L, T.D, br)) continue;
    const c = checkTank(T.L, T.H, lv, b);
    if (c.minSf > top.c.minSf + 1e-9 || (c.ok && !top.c.ok)) top = { brace: br, c };
  }
  const fail = { brace: top.brace, meets: false, line: `No brace gets this glass to ${sf.toFixed(1)} (best ${top.c.minSf.toFixed(1)}, set by ${GOV[top.c.governs]}). Strongest that fits: ${braceText(top.brace, u)}.` };
  if (!top.c.ok) return fail;
  const strips = (u === 'in' ? STOCK_US_PICK : STOCK_METRIC).filter(t => t <= Math.max(w.long, w.end) + 1e-9);
  const r = optimizeBraceCustom({ L: T.L, D: T.D, H: T.H, waterDepth: T.H }, { safetyFactor: sf, fixed: w, continuous: false, bottomSupport: bottom, stock: strips, widthStep: IN_MM / 2 });
  if (r.best) return { brace: r.best.brace, meets: true, line: r.best.brace ? `Least glass that meets ${sf.toFixed(1)}: ${braceText(r.best.brace, u)}.` : `No brace needed: this glass meets ${sf.toFixed(1)} on its own.` };
  return { brace: top.brace, meets: true, line: `Meets ${sf.toFixed(1)} with the strongest brace that fits: ${braceText(top.brace, u)}.` };
}

export { braceFor, braceFits };
