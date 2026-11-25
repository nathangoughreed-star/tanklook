// GS4 (2026-11-16; R110, Nathan: "show where the glass fails ... an exaggerated deflection visual, with actual deflections shown in true numbers"):
// the plates of ONE tank at ONE glass thickness, each with the solver's own stress / deflection grid, which member governs and which check.
// Same plate model as solveGlass (scene/glassSolver.ts platesAt) and the same brace check as checkTank (scene/glassEnvelope.ts): nothing new is computed.
import { GAMMA_FRESH, GLASS_MOR, platesAt, type PlateResult } from './glassSolver';
import { braceFor, checkTank, wallsOf, type BraceLevel, type EnvelopeBase } from './glassEnvelope';

/** Colour of a safety factor against the target: green with 25 % to spare, amber when it passes with less, red when it fails. */
export type Tone = 'ok' | 'near' | 'bad';
export const NEAR_BAND = 1.25;
export const toneOf = (sf: number, target: number): Tone => sf + 1e-9 >= target * NEAR_BAND ? 'ok' : sf + 1e-9 >= target ? 'near' : 'bad';

export type Member = 'front' | 'ends' | 'bottom' | 'brace';
export interface PaneDiag {
  id: 'front' | 'ends' | 'bottom';
  label: string;
  /** plate size (mm): span a along x, height b along y (the bottom: length by depth) */
  a: number; b: number; t: number;
  /** largest principal bending stress (MPa) and the safety factor it gives (modulus of rupture / stress) */
  sigma: number; sf: number;
  /** the bottom resting on a flat stand is matched to the walls (GS1 rule), not checked as a plate: its numbers are shown, never governing */
  onStand: boolean;
  /** largest deflection (mm) and the allowed one (mm) */
  w: number; wLimit: number;
  /** where the stress peaks (mm, from the left edge and from the bottom edge of the plate) */
  at: { x: number; y: number };
  grid: NonNullable<PlateResult['grid']>;
  tone: Tone;
}
export interface Diagnosis {
  panes: PaneDiag[];
  brace: { sf: number; tone: Tone } | null;
  target: number;
  glass: number;
  /** the member with the lowest safety factor */
  governing: { member: Member; sf: number; label: string };
  /** which check is closer to its limit: strength (target / sf, 1 = at the limit) or bending (deflection / limit) */
  check: 'stress' | 'deflection';
  usage: { stress: number; deflection: number };
  ok: boolean;
}

const LABEL: Record<Member, string> = { front: 'Front and back', ends: 'Ends', bottom: 'Bottom', brace: 'Brace strips' };

/** Diagnose a tank (length L, height H, depth in `b.D`, mm) at its glass (one thickness, or mixed: wallsOf) and a bracing level. Fully filled, as the size table. */
export function diagnose(L: number, H: number, level: BraceLevel, b: EnvelopeBase): Diagnosis {
  const br = braceFor(level, b, L), target = b.sf, t = b.glass, ws = wallsOf(b);
  const pl = platesAt({ L, D: b.D, H, waterDepth: H }, ws, { safetyFactor: target, topEdge: level === 'rimmed' ? 'held' : 'free', brace: br, bottomSupport: b.bottom ?? 'full', gamma: b.gamma ?? GAMMA_FRESH });
  const onStand = (b.bottom ?? 'full') === 'full';
  const mk = (id: PaneDiag['id'], p: PlateResult, a: number, bb: number, t: number, stand = false): PaneDiag => {
    const sf = p.sigma > 0 ? GLASS_MOR / p.sigma : Infinity;
    return { id, label: LABEL[id], a, b: bb, t, sigma: p.sigma, sf, onStand: stand, w: p.w, wLimit: pl.r.defl * t, at: p.at, grid: p.grid!, tone: stand ? 'ok' : toneOf(sf, target) };
  };
  const panes = [mk('front', pl.front, L, H, ws.long), mk('ends', pl.left, b.D, H, ws.end), mk('bottom', pl.bottom, L, b.D, ws.bottom, onStand)];
  const chk = checkTank(L, H, level, b), braceSf = chk.sf.brace;
  const brace = braceSf != null ? { sf: braceSf, tone: toneOf(braceSf, target) } : null;
  const cand: { member: Member; sf: number }[] = [...panes.filter(p => !p.onStand).map(p => ({ member: p.id as Member, sf: p.sf })), ...(brace ? [{ member: 'brace' as Member, sf: brace.sf }] : [])];
  cand.sort((x, y) => x.sf - y.sf);
  const g = cand[0], usage = { stress: target / g.sf, deflection: Math.max(panes[0].w / panes[0].wLimit, panes[1].w / panes[1].wLimit) };
  return { panes, brace, target, glass: t, governing: { member: g.member, sf: g.sf, label: LABEL[g.member] }, check: usage.deflection > usage.stress ? 'deflection' : 'stress', usage, ok: usage.stress <= 1 + 1e-9 && usage.deflection <= 1 + 1e-9 };
}

/** True deflection in the person's units: inches to 3 decimals, or millimetres to 2. */
export const deflText = (mm: number, u: 'in' | 'cm'): string => u === 'in' ? `${(mm / 25.4).toFixed(3)} in` : `${mm.toFixed(2)} mm`;

/** Exaggeration for the deformed drawing: a round factor (1, 2, 5 x 10^k) that makes the largest deflection about `frac` of the pane height. */
export function exaggeration(wMax: number, paneHeight: number, frac = 0.12): number {
  if (!(wMax > 0)) return 1;
  const raw = frac * paneHeight / wMax, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return Math.max(1, (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p);
}

/** Plain words: which check governs and by how much. */
export function verdictText(d: Diagnosis, u: 'in' | 'cm'): string {
  const g = d.governing, sf = Number.isFinite(g.sf) ? g.sf.toFixed(1) : '-', pct = (v: number) => `${Math.round(v * 100)} %`;
  const fw = d.panes[0].w / d.panes[0].wLimit >= d.panes[1].w / d.panes[1].wLimit ? d.panes[0] : d.panes[1];
  const strength = `${g.label}: safety factor ${sf} against ${d.target.toFixed(1)} needed (${pct(d.usage.stress)} of the strength limit)`;
  const bend = `bending ${deflText(fw.w, u)} against ${deflText(fw.wLimit, u)} allowed (${pct(d.usage.deflection)} of the limit)`;
  return `${d.ok ? 'Passes.' : 'Fails.'} ${d.check === 'stress' ? 'Strength' : 'Bending'} ${d.ok ? 'is the closer check' : 'governs'}: ${strength}; ${bend}.`;
}
