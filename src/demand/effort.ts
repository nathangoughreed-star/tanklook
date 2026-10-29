// Setup effort, care commitment and confidence (lane NG6, 2026-10-29). Everything here is derived from the build's own parts and the demand
// model's rhythm rows, never typed per proposal. Every figure carries a confidence: 'validated' = the number rests on a retailer listing or a cited
// page; 'provisional' = an assumption we state (shown with a dotted underline and the reason). Information only: no gate or score reads it.
import { priceRow, PRICES_AS_OF } from './prices';
import { demandOf } from './engine';
import { mean3 } from './range';
import type { Proposal } from './suggest';
import type { UserProfile } from './types';
import type { Habitat } from './buildplan';

export type Confidence = 'validated' | 'provisional';
export interface Figure { conf: Confidence; why: string }
export interface EffortPart { id: 'tank' | 'hardscape' | 'planting' | 'plumbing' | 'habitat' | 'cycling' | 'animals'; label: string; hours: number; basis: string }
export interface SetupEffort extends Figure { hours: number; parts: EffortPart[] }
export interface CareCommitment extends Figure { minPerWeek: number; waterChange?: { gal: number; pct: number }; text: string }
export interface Figures { startup: Figure; monthly: Figure; care: Figure; setup: Figure; setupHours: number }

// Assumptions, hours. No page states how long a set-up takes, so each is a stated estimate (one line of basis each).
export const EFFORT = {
  tankBase: 0.5, tankPerGal: 0.01,      // unbox, rinse, place on the stand, level, fill; a bigger tank is heavier to lift and fill (assumption)
  hardPerPiece: 0.15, hardBase: 0.25,   // rinse and arrange each rock or wood piece, a first look at the layout (assumption)
  plantBase: 0.2, plantPerPlant: 0.04,  // rinse, trim and place each pot or bunch (assumption)
  plumbBase: 0.5, plumbSump: 2,         // hang or seat the filter and heater, set the timer; a sump / RO unit adds plumbing (assumption)
  habitatDry: 1.5,                      // substrate, hides, heat and UVB fitted, then the 2-day gradient check (assumption)
  testMin: 6, doseMin: 5, testEveryDays: 3, // one cycle test is the demand model's test session (6 min); dosing ammonia 5 min (assumption)
  stageMin: 30,                         // drip-acclimating one batch of animals (assumption)
} as const;

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** Setup hours from the build's parts. The cycling line is only the hands-on time (tests and dosing), not the waiting. */
export function setupEffortOf(p: Proposal, h: Habitat, gal: number, P: UserProfile, cycleWeeks?: [number, number]): SetupEffort {
  const items = demandOf(p.build.setup, P).items, E = EFFORT;
  const count = (pre: string) => items.filter(c => c.key.startsWith(pre)).reduce((t, c) => t + (c.n ?? 1), 0);
  const parts: EffortPart[] = [];
  const add = (id: EffortPart['id'], label: string, hours: number, basis: string) => { if (hours > 0) parts.push({ id, label, hours, basis }); };
  if (h === 'dry') {
    add('tank', 'Enclosure and stand', E.tankBase + gal * E.tankPerGal, `assumption: ${E.tankBase} h + ${E.tankPerGal} h per gallon`);
    add('habitat', 'Habitat, heat and UVB, gradient check', E.habitatDry, 'assumption');
  } else {
    add('tank', 'Tank on its stand, rinse, level, fill', E.tankBase + gal * E.tankPerGal, `assumption: ${E.tankBase} h + ${E.tankPerGal} h per gallon`);
    const hard = count('hard:');
    add('hardscape', 'Hardscape', hard ? E.hardBase + hard * E.hardPerPiece : 0, `assumption: ${E.hardBase} h + ${E.hardPerPiece} h per piece (${hard})`);
    const plants = count('plant:') + count('bundle:') + (items.some(c => c.key === 'patch') ? 2 : 0);
    add('planting', 'Planting', plants ? E.plantBase + plants * E.plantPerPlant : 0, `assumption: ${E.plantBase} h + ${E.plantPerPlant} h per plant (${plants})`);
    const sump = items.some(c => c.key === 'rounit' || c.key === 'skimmer');
    add('plumbing', sump ? 'Filter, heater, light, RO unit / skimmer' : 'Filter, heater, light', E.plumbBase + (sump ? E.plumbSump : 0), 'assumption');
    const [lo, hi] = cycleWeeks ?? [0, 0], wk = (lo + hi) / 2;
    add('cycling', 'Cycling: tests and dosing (hands-on only)', wk * 7 / E.testEveryDays * (E.testMin + E.doseMin) / 60, `${round(wk, 1)} weeks x a test every ${E.testEveryDays} days x ${E.testMin + E.doseMin} min (test session from the demand model; dosing assumed)`);
  }
  add('animals', 'Bringing the animals home', p.build.animals.length ? E.stageMin / 60 * (p.build.animals.length > 1 ? 2 : 1) : 0, `assumption: ${E.stageMin} min per batch`);
  const hours = round(parts.reduce((t, x) => t + x.hours, 0));
  return { hours, parts, conf: 'provisional', why: 'No page states how long a set-up takes. Each part is a stated estimate of our own (shown against it); the cycling line counts only your hands-on time, not the weeks of waiting.' };
}

/** The weekly care commitment: demand minutes plus the water change as gallons, in one sentence. */
export function careCommitmentOf(p: Proposal, h: Habitat, gal: number, P: UserProfile): CareCommitment {
  const D = demandOf(p.build.setup, P), min = Math.round(D.totals.minPerWeek);
  const wc = D.items.find(c => c.key === 'waterchange'), pct = wc ? Number(/(\d+) %/.exec(wc.label)?.[1]) : NaN;
  const waterChange = h !== 'dry' && Number.isFinite(pct) ? { pct, gal: Math.max(0.5, round(gal * pct / 100)) } : undefined;
  const text = `about ${min} min a week${waterChange ? `, 1 x ${waterChange.gal} gal water change` : ''}`;
  return { minPerWeek: min, waterChange, text, ...careFigure() };
}

export function careFigure(): Figure {
  return { conf: 'provisional', why: 'How often each job comes round is from the maintenance research; the minutes per job are our estimate, because no page states them.' };
}

/** Is the set-up price listing-backed? Share of the set-up dollars whose row has a retailer listing (priceRow without est). */
export function costFigure(p: Proposal, P: UserProfile): Figure {
  const items = demandOf(p.build.setup, P).items.filter(c => c.setup);
  let all = 0, listed = 0;
  for (const c of items) { const v = mean3(c.setup!); all += v; const r = priceRow(c.key); if (c.key === 'kit' || (r && !r.est)) listed += v; }
  const share = all > 0 ? listed / all : 1;
  return share >= 0.8
    ? { conf: 'validated', why: `${Math.round(share * 100)} % of the set-up price comes from retailer listings (dated ${PRICES_AS_OF}); the rest is a rule of thumb.` }
    : { conf: 'provisional', why: `Only ${Math.round(share * 100)} % of the set-up price comes from a retailer listing; the rest is a rule of thumb.` };
}

export function figuresOf(p: Proposal, h: Habitat, gal: number, P: UserProfile, cycleWeeks?: [number, number]): Figures {
  const cost = costFigure(p, P), s = setupEffortOf(p, h, gal, P, cycleWeeks);
  return { startup: cost, monthly: { conf: 'provisional', why: 'Monthly cost is food, conditioner, power and the expected loss of animals, from listing prices plus a stated loss rate.' }, care: careFigure(), setup: s, setupHours: s.hours };
}
