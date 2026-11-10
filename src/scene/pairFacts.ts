// Discovery v2, lane AB1 (spec sections 7 and 9): the FACTS of one candidate, filled the SAME way for every candidate (A and B, Explore recipe or DX2 proposal), so two cards are always comparable.
// Pure. One path: equipPlan (what is still to buy for THIS user, owned and capable gear = $0, Must-use always in) -> the demand model's rows (the spread behind each range, minutes a week)
// -> Explore's Estimate shape -> Explore's firm gate (gate.ts) -> CandidateFacts. Figures built from the model's own rows are marked `est`; nothing here invents a price or a spec.
import type { TankSetup } from './types';
import type { Brief } from './brief';
import { equipPlan, type EquipPlan } from './equipPlan';
import { equipmentOf } from './project';
import { demandOf } from '../demand/engine';
import { mean3 } from '../demand/range';
import { careFigure } from '../demand/effort';
import { PRICES_AS_OF } from '../demand/prices';
import { defaultProfile, type UserProfile } from '../demand/types';
import type { Wants } from '../demand/suggest';
import { tankFromDims } from '../demand/suggest';
import { difficultyOf } from '../explore/difficulty';
import { gateCandidate, type GateVerdict } from '../explore/gate';
import type { Estimate, Range } from '../explore/estimate';
import { featuresOf, type AspectSubject } from '../explore/aspects';
import type { Fingerprint } from '../explore/candidate';
import { idOf } from '../explore/candidate';
import { getTankModel, modelGallons, type TankModel } from '../data/tanks';
import { getSpecies } from '../data/species';
import { layerOf } from './items';
import { volume } from './physics';
import { filterUnits, heaterUnits } from './tech';
import type { Figure as FactFigure, CandidateFacts } from './discoveryTypes';
import type { Env } from './archetypes';

const IN = 25.4, r0 = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const rng = (mean: number, lo: number, hi: number, d = 0): Range => ({ lo: r0(Math.max(0, Math.min(lo, mean)), d), mean: r0(mean, d), hi: r0(Math.max(hi, mean), d) });
const fig = (r: Range, est = true): FactFigure => ({ lo: r.lo, mean: r.mean, hi: r.hi, ...(est ? { est: true } : {}) });

/** The world a scene lives in, in Explore's terms. */
export function worldOf(S: TankSetup): { env: Env; water: 'freshwater' | 'saltwater' | 'none' } {
  if (!S.water.on) return { env: 'terrarium', water: 'none' };
  return { env: 'aquarium', water: S.water.salt ? 'saltwater' : 'freshwater' };
}
/** The catalogue tank a scene stands on (its product), else the owned / available tank when the size matches, else a synthetic model of the dimensions. */
export function tankModelOf(S: TankSetup, w: Wants): TankModel {
  const m = S.product?.model ? getTankModel(S.product.model) : undefined; if (m) return m;
  const near = (x: TankModel | undefined) => !!x && Math.abs(x.outer.L - S.tank.L) < 2 && Math.abs(x.outer.D - S.tank.D) < 2 && Math.abs(x.outer.H - S.tank.H) < 2;
  if (near(w.ownTank)) return w.ownTank!; if (near(w.availTank)) return w.availTank!;
  return tankFromDims({ L: S.tank.L / IN, D: S.tank.D / IN, H: S.tank.H / IN });
}
export const rosterOf = (S: TankSetup): { species: string; n: number }[] => {
  const m = new Map<string, number>(); for (const f of S.fish) m.set(f.species, (m.get(f.species) ?? 0) + 1);
  return [...m].map(([species, n]) => ({ species, n })).sort((a, b) => a.species.localeCompare(b.species));
};

export interface Scored { plan: EquipPlan; estimate: Estimate; gate: GateVerdict; totals: { setupUsd: number; upkeepUsdMo: number; minPerWeek: number } }

/** Cost, upkeep, difficulty and the Explore gate for one finished design: the one accounting both cards use. */
export function scoreScene(S: TankSetup, brief: Brief, w: Wants, P: UserProfile = defaultProfile(), now = Date.now()): Scored {
  const plan = equipPlan(S, brief, P), D = demandOf(plan.scene, P, { now });
  const tax = 1 + Math.min(25, Math.max(0, w.taxPct ?? 0)) / 100;
  const sum = <K extends 'upkeep' | 'minutes'>(k: K) => D.items.reduce((t, c) => { const x = c[k]; return x ? { lo: t.lo + x.lo - mean3(x), hi: t.hi + x.hi - mean3(x) } : t; }, { lo: 0, hi: 0 });
  const rem = plan.remaining, startMean = mean3(rem) * tax, kLo = mean3(rem) > 0 ? rem.lo / mean3(rem) : 1, kHi = mean3(rem) > 0 ? rem.hi / mean3(rem) : 1;
  const startupUsd = rng(startMean, startMean * kLo, startMean * kHi);
  const mo = mean3(plan.monthly), u = sum('upkeep'), monthlyUsd = rng(mo, mo + u.lo, mo + u.hi);
  const mi = D.totals.minPerWeek, m = sum('minutes'), minPerWeek = rng(mi, mi + m.lo, mi + m.hi);
  const gal = S.water.on ? modelGallons(tankModelOf(S, w)) : 0, o = tankModelOf(S, w).outer, d = difficultyOf(S, now);
  // set-up hours are not modelled for an arbitrary design (effort.ts needs a priced Build): a range of zero would pass a limit it never checked, so the figure is absent and the card says so
  const hoursSet = w.setupHours !== undefined || w.mins?.setupHours !== undefined;
  const estimate: Estimate = {
    startupUsd, monthlyUsd, minPerWeek, setupHours: { lo: 0, mean: 0, hi: 0 }, gal: r0(gal, 1), footprintIn: { L: r0(o.L / IN, 1), D: r0(o.D / IN, 1), H: r0(o.H / IN, 1) },
    figures: {
      startup: { conf: 'provisional', why: 'The remaining purchase cost from the price model: owned and capable gear is $0; a listing price where there is one, a rule of thumb where there is not.' },
      monthly: { conf: 'provisional', why: 'Monthly cost is food, conditioner, power and the expected loss of animals, from listing prices plus a stated loss rate.' },
      care: careFigure(), setup: { conf: 'provisional', why: 'Set-up hours are not estimated for this design.' },
    },
    difficulty: d,
    assumptions: [`Prices as of ${PRICES_AS_OF}, from retailer listings where there are any and a rule of thumb where there are not.`, 'Minutes a week are our own estimate: no page states them.'],
  };
  const tank = tankModelOf(S, w), world = worldOf(S);
  const wNoHours: Wants = hoursSet ? { ...w, setupHours: undefined, mins: w.mins ? { ...w.mins, setupHours: undefined } : undefined } : w;
  // welfare, the room and the filtration were judged by verdictOf (the caller): the gate here takes them as passed and judges the limits, the Required tank and the world
  const gate = gateCandidate({ w: wNoHours, ev: { welfareWords: [], unknown: [], needsOk: true } as never, est: estimate, world: world.env, water: world.water === 'none' ? 'freshwater' : world.water, tank, roster: rosterOf(S), holds: true });
  if (hoursSet) gate.assumptions.push('Set-up time is not estimated for this design, so a set-up time limit was not applied to it.');
  return { plan, estimate, gate, totals: { setupUsd: startMean, upkeepUsdMo: mo, minPerWeek: mi } };
}

const title = (S: TankSetup): string => {
  const { env, water } = worldOf(S), r = rosterOf(S).slice().sort((a, b) => b.n - a.n)[0], name = r ? getSpecies(r.species)?.name : undefined;
  const base = env === 'terrarium' ? 'Terrarium' : water === 'saltwater' ? 'Saltwater tank' : 'Freshwater tank';
  return name ? `${base}: ${name}` : base;
};
export const habitatOf = (S: TankSetup): string => {
  const { env, water } = worldOf(S), plants = S.items.filter(i => layerOf(i) === 'plant').length;
  if (env === 'terrarium') return 'Terrarium';
  return `${water === 'saltwater' ? 'Saltwater' : 'Freshwater'}${plants >= 6 ? ' planted' : plants >= 1 ? ' with plants' : ''}`;
};
const kindsOf = (S: TankSetup, plant: boolean): string[] => {
  const m = new Map<string, number>(); for (const i of S.items) if ((layerOf(i) === 'plant') === plant) { const k = `${i.kind}${i.variant && i.variant !== 'default' ? ` (${i.variant})` : ''}`; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => n > 1 ? `${k} x${n}` : k);
};

/** Is this owned item actually IN the design (Have-available gear the design left out is a purchase, not a reuse)? */
const inDesign = (S: TankSetup, key: string): boolean => key === 'light' ? !!S.light.owned : key === 'heater' ? !!S.tech && heaterUnits(S.tech).some(u => u.owned) : key === 'filter' ? !!S.tech && filterUnits(S.tech).some(u => u.owned) : true;

/** The CO2 system is priced by the demand model (its setup is inside the new spend) but equipPlan lists no line for it: show it in the to-buy list when the design runs on CO2, at the model's own price. */
import { price as rowPriceOf } from '../demand/prices';
function withCo2(S: TankSetup, lines: CandidateFacts['toBuy']): CandidateFacts['toBuy'] {
  if (S.grow.feed !== 'co2' || !S.water.on || lines.some(l => /co2/i.test(`${l.key} ${l.label}`))) return lines;
  const p = rowPriceOf('gear:co2-kit');
  return [...lines, { key: 'co2', label: 'CO2 system (regulator, cylinder, diffuser)', usd: Math.round(p?.mode ?? 90), kind: 'design' }];
}

/** The 3D relief backdrop is a physical part of the habitat (hardscape): a purchase, priced by the back-wall area at a rule of thumb (no listing exists), and said to be an estimate. */
export const backdropUsd = (S: TankSetup): number => Math.max(45, Math.min(400, Math.round(S.tank.L * S.tank.H / (25.4 * 25.4) * 0.18)));
const BACKDROP_LABEL: Record<string, string> = { rock: 'rock wall', river: 'river-stone wall', reef: 'reef wall', cork: 'cork bark wall', moss: 'mossy wall', jungle: 'jungle wall' };

/** Everything a card shows, from one scored design. `title` overrides the derived one (an Explore look has its own name). */
export function factsOf(S: TankSetup, brief: Brief, sc: Scored, name?: string): CandidateFacts {
  const eq = equipmentOf(brief).items, flagged = new Set(sc.plan.flags.map(f => f.item as string));
  const gal = S.water.on ? r0(volume(S.tank).gallons, 1) : null;
  const bd = S.backdrop && S.backdrop.kind !== 'none' ? backdropUsd(S) : 0, spend = fig(sc.estimate.startupUsd);
  if (bd) { spend.lo += bd; spend.mean += bd; spend.hi += bd; }
  return {
    title: name ?? title(S), habitat: habitatOf(S), gallons: gal,
    newSpendUsd: spend, monthlyUsd: fig(sc.estimate.monthlyUsd), weeklyMin: fig(sc.estimate.minPerWeek),
    difficulty: sc.estimate.difficulty.level, toBuy: [...withCo2(S, sc.plan.toBuy.map(l => ({ ...l }))), ...(bd ? [{ key: 'backdrop', label: `3D background: ${BACKDROP_LABEL[S.backdrop.kind] ?? S.backdrop.kind} (estimate)`, usd: bd, kind: 'design' as const }] : [])],
    reused: eq.filter(i => i.use !== 'required' && !flagged.has(i.key) && inDesign(S, i.key)).map(i => i.key), mustUse: eq.filter(i => i.use === 'required').map(i => i.key),
    stocking: rosterOf(S).map(r => ({ species: r.species, name: getSpecies(r.species)?.name ?? r.species, n: r.n })),
    plants: kindsOf(S, true), hardscape: kindsOf(S, false), substrate: S.substrate.show ? [S.substrate.type] : [],
  };
}

// ---------------------------------------------------------------------------------------------------------------- identity, distance, aspects
const bin = (n: number) => Math.round(n / 60);
/** The tokens a design is made of (tank, species, every piece by kind and rough place): content, not source. */
export function tokensOf(S: TankSetup): string[] {
  const out = [`tank:${Math.round(S.tank.L / IN)}x${Math.round(S.tank.D / IN)}x${Math.round(S.tank.H / IN)}`, `water:${S.water.on ? S.water.salt ? 'salt' : 'fresh' : 'dry'}`, `sub:${S.substrate.show ? S.substrate.type : 'none'}`, `look:${S.layout.id}`];
  for (const r of rosterOf(S)) out.push(`fish:${r.species}:${r.n}`);
  for (const i of S.items) out.push(`${layerOf(i)}:${i.kind}:${i.variant}:${bin(i.x)}:${bin(i.depth)}`);
  return out;
}
/** The design's content key: the same design is the same candidate however it was made (Explore dedupes on its own `candidateKey`; this is the key that works for every source). */
export const keyOf = (S: TankSetup): string => idOf(tokensOf(S).sort().join('|'));
const jaccard = (a: readonly string[], b: readonly string[]) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; const u = A.size + B.size - i; return u ? i / u : 1; };
/** 0..1: how different two designs are, by content (so a hardscape-only change counts, which a fingerprint alone would call identical). */
export const contentDistance = (a: readonly string[], b: readonly string[]): number => 1 - jaccard(a, b);

export function subjectOf(S: TankSetup, sc: Scored, ids: { familyId?: string; archetypeId?: string } = {}): AspectSubject {
  const w = worldOf(S), plants = S.items.filter(i => layerOf(i) === 'plant').length;
  return { world: w.env, water: w.water, familyId: ids.familyId ?? 'custom', archetypeId: ids.archetypeId ?? S.layout.id, roster: rosterOf(S), plantMode: 'live', plants, vivid: false, minPerWeek: sc.estimate.minPerWeek.mean, gal: sc.estimate.gal, difficulty: sc.estimate.difficulty.level };
}
export function fingerprintOf(S: TankSetup, sc: Scored, ids: { familyId?: string; archetypeId?: string } = {}): Fingerprint {
  const w = worldOf(S);
  return { world: w.env, water: w.water, familyId: ids.familyId ?? 'custom', archetypeId: ids.archetypeId ?? S.layout.id, tankId: S.product?.model ?? `${Math.round(S.tank.L / IN)}x${Math.round(S.tank.D / IN)}x${Math.round(S.tank.H / IN)}`, species: rosterOf(S).map(r => r.species), look: S.layout.id, startupUsd: sc.estimate.startupUsd.mean };
}
export const featuresFor = (S: TankSetup, sc: Scored, ids?: { familyId?: string; archetypeId?: string }): string[] => featuresOf(subjectOf(S, sc, ids));
