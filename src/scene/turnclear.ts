// Turning clearance for every species (lane LB, PROTOTYPE, heuristic, not wired into any gate or tile): the tank's shortest floor side must
// be at least K x the animal's adult length so it can turn round. tankMin.ts only holds LARGE_BODY_MM (150 mm) fish to a width, and only a
// stated one; a small swimmer has no width check at all. K is open (research/length-bonus.md sweeps 1, 1.5, 2); a failure here is meant to
// read yellow, never red, until Nathan decides. Elongated bodies that bend or coil to turn are exempt (their card length is mostly tail).
import type { Species } from '../data/species';
import type { Geometry } from './tankMin';

export const TURN_K_SWEEP = [1, 1.5, 2];
/** Nathan 2026-10-28: 1.5 adult body lengths, provisional; a failure is amber only (never a red gate) until the rule is reviewed. */
export const TURN_K = 1.5;
/** Bodies that bend or coil to turn: snakes, eel-shaped kuhli, long-tailed lizards (card aspect < 0.2). */
export const turnExempt = (sp: Species) => sp.body === 'snake' || sp.id === 'kuhli' || sp.aspect < 0.2;
/** Front-to-back width the species wants, mm (0 = exempt). */
export const turnNeedMm = (sp: Species, k: number) => turnExempt(sp) ? 0 : k * sp.tl;
/** Percent like the other bars: 100 = exactly the width, over 100 = short of it. */
export const turnPct = (sp: Species, g: Pick<Geometry, 'widthMm'>, k: number) => 100 * turnNeedMm(sp, k) / Math.max(1, g.widthMm);
/** The stronger of a sourced width (tankMin) and the heuristic, mm: sourced values are kept, never weakened. */
export const turnWidthMm = (sp: Species, k: number, sourcedMm = 0) => Math.max(sourcedMm, turnNeedMm(sp, k));
