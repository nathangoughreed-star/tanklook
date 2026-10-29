// Infeasibility as a first-class result (lane U4, 2026-10-28). When no concept passes every check the generator does not say "nothing found": it names the LIMITING FACTOR with the real numbers
// ("the cheapest welfare-appropriate build is $345 all-in, $145 over your $200 ceiling") and offers ALTERNATIVES, each one click: the alternative carries an `edit` that `applyAlternative` writes into
// the setup brief (locks kept, except an explicit change of species, which is the click itself), after which the UI re-runs the generator.
// Rules (Nathan): welfare is never compromised and never traded for price; locked animals are never swapped to hit a number (a different species is only ever an OPTION the person clicks); nothing
// necessary is silently stripped. Every alternative is VERIFIED by running the generator with the edit applied: nothing is promised that the engine does not deliver.
import { getSpecies } from '../data/species';
import { TANK_MODELS } from '../data/tanks';
import { TIER_LABEL } from '../scene/finish';
import { clearItem, setItem, valueOf, type Brief } from '../scene/brief';
// Lane NG4 (2026-10-29): every conflict is framed as FOUR PATHS (keep the vision, keep the limits, keep the look, save the ambition), each one verified by re-running the generator (`pathsOf` at the bottom).
// Nothing here loosens a welfare gate: a path whose animals cannot be kept well says so and offers no button.
import { OWNED, PICK_CARE, lockedArchetype, ownedAssess, type Miss, type OwnedKey, type OwnedMap, type Proposal, type Suggestions, type Wants } from './suggest';
import type { CostLine } from './costlines';
import type { SpaceLimit } from '../scene/types';
import type { Units } from '../scene/types';
import type { UserProfile } from './types';

export type LimitingFactor = 'budget' | 'upkeep' | 'time' | 'space' | 'tank' | 'animals' | 'welfare';

/** What a one-click alternative writes into the brief. */
export type AltEdit =
  | { op: 'budget'; usd: number } | { op: 'upkeep'; usd: number } | { op: 'time'; min: number }
  | { op: 'owned'; keys: OwnedKey[]; tank?: string }
  | { op: 'species'; animals: { species: string; n: number }[] }
  | { op: 'phased' } | { op: 'lowtech' }
  | { op: 'space'; w?: number; d?: number } | { op: 'ownTank' }
  /** several edits in one click (the vision path: every limit it breaks, together) */
  | { op: 'all'; edits: AltEdit[] }
  /** save an ambition in the brief (preferences.future), then optionally also a smaller project now */
  | { op: 'future'; text: string; from?: string; now?: AltEdit };

/** The four ways out of a conflict (the design plan's section 05). */
export type PathId = 'vision' | 'limits' | 'look' | 'future';

export interface Alternative {
  kind: 'raise-budget' | 'raise-upkeep' | 'more-time' | 'use-owned' | 'bigger-space' | 'other-tank' | 'change-animals' | 'phase' | 'low-tech' | 'keep-vision' | 'save-ambition';
  /** which of the four paths this belongs to (set by pathsOf) */
  path?: PathId;
  /** one or two plain sentences with the numbers */
  text: string;
  /** the short button label */
  label: string;
  /** the amount to raise, set-up $ / $ a month / min a week, when the kind is a raise */
  delta?: number;
  /** the brief edit one click makes (then the generator re-runs) */
  edit?: AltEdit;
  /** the purchase order, for kind 'phase' */
  phases?: Phases;
  /** what the generator gives with this edit applied, as a set-up all-in $ (verified, not promised) */
  resultUsd?: number;
}
export interface Phases { phase1Usd: number; phase2Usd: number; totalUsd: number; phase1: string[]; phase2: string[]; note: string }
export interface Infeasible {
  limitingFactor: LimitingFactor;
  /** the headline, in plain words with the numbers */
  text: string;
  alternatives: Alternative[];
  /** the cheapest honest build when the limit is money or time: its name, all-in $, how far over, and what it is made of */
  cheapest?: { title: string; usd: number; over: number; lines: { label: string; usd: number }[] };
  /** the four paths, always all four, each with its verified buttons (indexes into `alternatives`) or the plain reason it has none */
  paths?: ConflictPath[];
}
/** The true build behind the vision: what it really is and costs, and which of the person's limits it breaks. */
export interface VisionFacts { title: string; animals: string; gal: number; outerIn: [number, number]; usd: number; monthlyUsd: number; minPerWeek: number; gear: string[]; breaks: string[] }
export interface ConflictPath { id: PathId; title: string; blurb: string; alts: number[]; none?: string; facts?: VisionFacts }

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const inch = (mm: number) => Math.round(mm / 25.4);
const animalsText = (a: { species: string; n: number }[]) => a.map(x => `${x.n} ${getSpecies(x.species)?.name ?? x.species}`).join(', ');
const tankText = (p: Proposal) => `${Math.round(p.build.tank.ratedGal)} gal`;
const list = (a: string[]) => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
const FIRST = (lines: CostLine[]) => lines.filter(l => l.usd > 0).map(l => `${l.label.replace(/ \(.*\)$/, '').toLowerCase()} ${usd(l.usd)}`);

/** The purchase order of a concept: every animal-care essential first (tank, stand, gear, supplies, substrate and plants), the animals second, once the tank has cycled. Sales tax follows its items. */
export function phasesOf(p: Proposal): Phases {
  const animals = p.costLines.filter(l => l.label === 'Animals').reduce((t, l) => t + l.usd, 0), tax = Math.round(animals * p.taxPct / 100);
  const phase2Usd = animals + tax, phase1Usd = Math.max(0, p.totals.startupUsd - phase2Usd);
  const names = p.costLines.filter(l => l.usd > 0 && l.label !== 'Animals' && !l.label.startsWith('Sales tax'));
  return { phase1Usd, phase2Usd, totalUsd: p.totals.startupUsd, phase1: FIRST(names), phase2: animals > 0 ? [`animals ${usd(animals)}${tax ? `, tax ${usd(tax)}` : ''}`] : [],
    note: 'Phase 1 first: set the tank up and cycle it with no animals in it (the water has to grow its filter bacteria anyway, usually 4 to 6 weeks). The animals are bought in phase 2, only once everything they need is in.' };
}

/** Apply an alternative's edit to the brief. Everything the person locked stays; only a species change replaces the locked animals, and only because they clicked it. */
export function applyAlternative(b: Brief, e: AltEdit): Brief {
  switch (e.op) {
    case 'budget': return setItem(b, 'constraints.budget', e.usd, 'hard');
    case 'upkeep': return setItem(b, 'constraints.monthly', e.usd, 'hard');
    case 'time': return setItem(b, 'constraints.careMin', e.min, 'hard');
    case 'owned': { const map: OwnedMap = { ...(valueOf(b, 'constraints.owned') ?? {}) }; for (const k of e.keys) map[k] = PICK_CARE; const n = e.keys.length ? setItem(b, 'constraints.owned', map, 'hard') : b; return e.tank ? setItem(n, 'constraints.existingTank', { model: e.tank }, 'hard') : n; }
    case 'species': return setItem(b, 'animals.stock', e.animals.map(a => ({ species: a.species, count: a.n })), 'locked');
    case 'phased': return setItem(b, 'constraints.phased', true, 'hard');
    case 'lowtech': return setItem(clearItem(b, 'preferences.hightech'), 'preferences.lowtech', true, 'hard');
    case 'space': return e.w && e.d ? setItem(b, 'constraints.maxSpace', { w: e.w, d: e.d }, 'hard') : clearItem(b, 'constraints.maxSpace');
    case 'ownTank': return clearItem(b, 'constraints.existingTank');
    case 'all': return e.edits.reduce(applyAlternative, b);
    case 'future': { const n = e.text.trim() ? setItem(b, 'preferences.future', [...(valueOf(b, 'preferences.future') ?? []), { text: e.text.trim(), ...(e.from ? { from: e.from } : {}) }], 'preference') : b; return e.now ? applyAlternative(n, e.now) : n; } // same write as setupBrief.addFuture
  }
}

export interface Ctx { w: Wants; misses: Miss[]; stats: Suggestions['stats']; locked: boolean; space?: SpaceLimit; P: UserProfile; units: Units; now: number; run: (w: Wants) => Suggestions }

const capsOff = (w: Wants): Wants => { const c = w.constraints, off = <T extends { on: boolean }>(x: T | undefined) => x ? { ...x, on: false } : undefined; return { ...w, phased: false, constraints: { ...c, startupUsd: off(c.startupUsd), monthlyUsd: off(c.monthlyUsd), minutesPerWeek: off(c.minutesPerWeek) } }; };
const cheapestOf = (r: Suggestions): Proposal | undefined => r.cheapest ?? r.proposals[0];

/** Explain why nothing passed and what would change that. Each alternative is checked by running the generator with its edit. */
function explainBase(x: Ctx): Infeasible {
  const { w, locked } = x, C = w.constraints;
  const cap = C.startupUsd?.on ? C.startupUsd.value : undefined, mo = C.monthlyUsd?.on ? C.monthlyUsd.value : undefined, mi = C.minutesPerWeek?.on ? C.minutesPerWeek.value : undefined;
  const what = locked && w.animals ? animalsText(w.animals) : w.hightech ? 'a high-tech planted tank' : 'any kind of setup you ticked';
  const alts: Alternative[] = [];
  const rel = cap !== undefined || mo !== undefined || mi !== undefined ? x.run(capsOff(w)) : undefined;
  const cheap = rel ? cheapestOf(rel) : undefined;

  if (cheap) {
    // ---- a money or time limit is what stops it: the cheapest honest build, how far over, and every way out ----
    const t = cheap.totals, overS = cap !== undefined ? Math.max(0, Math.ceil(t.startupUsd - cap)) : 0, overM = mo !== undefined ? Math.max(0, Math.ceil(t.monthlyUsd - mo)) : 0, overT = mi !== undefined ? Math.max(0, Math.ceil(t.minPerWeek - mi)) : 0;
    const rel3 = [['budget', cap ? overS / cap : 0], ['upkeep', mo ? overM / mo : 0], ['time', mi ? overT / mi : 0]] as [LimitingFactor, number][];
    const factor = rel3.reduce((m, r) => r[1] > m[1] ? r : m, rel3[0])[0];
    const parts = [overS ? `${usd(t.startupUsd)} all-in to set up, ${usd(overS)} over your ${usd(cap!)} ceiling` : '', overM ? `about ${usd(t.monthlyUsd)} a month, ${usd(overM)} over your ${usd(mo!)} a month limit` : '', overT ? `about ${Math.round(t.minPerWeek)} minutes a week, ${overT} over your ${mi} minute limit` : ''].filter(Boolean);
    const lines = cheap.costLines.filter(l => l.usd > 0).map(l => ({ label: l.label, usd: l.usd }));
    const breakdown = FIRST(cheap.costLines).slice(0, 6).join(', ');
    const text = `The cheapest welfare-appropriate build for ${what} is ${parts.join('; and ')}. That is ${cheap.archetype.title} in a ${tankText(cheap)} tank (${cheap.build.finish ? TIER_LABEL[cheap.build.finish.tier].toLowerCase() : 'no finish'}): ${breakdown}. Nothing was cut to get there, and nothing is cut to fit your limits.`;
    if (overS) alts.push({ kind: 'raise-budget', label: `Raise the budget to ${usd(cap! + overS)}`, delta: overS, edit: { op: 'budget', usd: cap! + overS }, text: `Raise the set-up ceiling by ${usd(overS)}, to ${usd(cap! + overS)}: that buys exactly this build.` });
    if (overM) alts.push({ kind: 'raise-upkeep', label: `Allow ${usd(mo! + overM)} a month`, delta: overM, edit: { op: 'upkeep', usd: mo! + overM }, text: `Allow ${usd(overM)} more a month, ${usd(mo! + overM)} in all.` });
    if (overT) alts.push({ kind: 'more-time', label: `Allow ${mi! + overT} min a week`, delta: overT, edit: { op: 'time', min: mi! + overT }, text: `Allow ${overT} more minutes a week, ${mi! + overT} in all.` });

    if (overS) {
      // use what you already own: the pieces of this build that would close the gap (verified by a run)
      const need = overS / (1 + cheap.taxPct / 100), have = x.w.owned ?? {}, needStand = x.w.needStand ?? true;
      const pieces: { key: OwnedKey | 'tank'; label: string; saved: number }[] = [];
      for (const o of OWNED) if (!(o.id in have)) { const s = ownedAssess(cheap.build, { [o.id]: PICK_CARE }, needStand, x.P).saved; if (s >= 5) pieces.push({ key: o.id, label: o.label.toLowerCase(), saved: s }); }
      if (!w.ownTank) { const s = ownedAssess(cheap.build, {}, needStand, x.P, true).saved; if (s >= 5) pieces.push({ key: 'tank', label: `${tankText(cheap)} tank`, saved: s }); }
      pieces.sort((a, b) => b.saved - a.saved);
      const pick: typeof pieces = []; let got = 0;
      for (const p of pieces) { if (got >= need) break; pick.push(p); got += p.saved; }
      if (pick.length && got >= need) {
        const keys = pick.filter(p => p.key !== 'tank').map(p => p.key as OwnedKey), tank = pick.some(p => p.key === 'tank') ? cheap.build.tank.id : undefined;
        const r = x.run({ ...w, owned: { ...have, ...Object.fromEntries(keys.map(k => [k, PICK_CARE])) }, ...(tank ? { ownTank: TANK_MODELS.find(m => m.id === tank) } : {}) });
        if (r.proposals.length) alts.push({ kind: 'use-owned', label: `I already have: ${pick.map(p => p.label).join(', ')}`, edit: { op: 'owned', keys, ...(tank ? { tank } : {}) }, resultUsd: Math.min(...r.proposals.map(p => p.totals.startupUsd)),
          text: `If you already own or can borrow ${list(pick.map(p => `a ${p.label}`))} (worth about ${usd(got)} here), it fits your ${usd(cap!)} ceiling at ${usd(Math.min(...r.proposals.map(p => p.totals.startupUsd)))}.` });
      }
      // phased purchase: only when the essentials alone fit; the animals are a second purchase after the tank has cycled
      const ph = phasesOf(cheap);
      if (ph.phase1Usd <= cap!) alts.push({ kind: 'phase', label: 'Buy in two phases', edit: { op: 'phased' }, phases: ph, resultUsd: ph.phase1Usd,
        text: `Buy in two phases, with the tank unstocked until every animal-care essential is in. Phase 1, ${usd(ph.phase1Usd)} now: ${ph.phase1.join(', ')}. Phase 2, ${usd(ph.phase2Usd)} after the tank has cycled: ${ph.phase2.join(', ') || 'the animals'}. Total ${usd(ph.totalUsd)}, the same ${usd(overS)} over, spread out.` });
      else alts.push({ kind: 'phase', label: 'Why not phases?', text: `Even the essentials alone (everything except the animals) come to ${usd(ph.phase1Usd)}, over your ${usd(cap!)}: buying in phases does not close this gap.` });
    }
    // a different species, only as an option: the nearest welfare-fine animals that DO fit the limits (never applied without the click)
    if (locked && w.animals) {
      const la = lockedArchetype(w.animals);
      const r = x.run({ ...w, animals: undefined, ...(la ? { kinds: [la.kind], ...(la.group ? { groups: [la.group] } : {}) } : {}) });
      const opts = r.proposals.filter(p => p.archetype.id !== la?.id).filter((p, i, a) => a.findIndex(q => q.archetype.id === p.archetype.id) === i).slice(0, 2);
      for (const p of opts) alts.push({ kind: 'change-animals', label: `Use ${animalsText(p.build.animals)} instead`, edit: { op: 'species', animals: p.build.animals }, resultUsd: p.totals.startupUsd,
        text: `Different animals, only if you want them: ${animalsText(p.build.animals)} fit your limits at ${usd(p.totals.startupUsd)} in a ${tankText(p)} tank. Your ${animalsText(w.animals)} stay locked until you choose this.` });
    }
    // the look and the equipment approach are two different things: keep the look, drop the expensive approach
    if (w.hightech) {
      const r = x.run({ ...w, hightech: false, lowtech: true });
      const p = r.proposals[0];
      if (p) alts.push({ kind: 'low-tech', label: 'Keep the planted look, low-tech', edit: { op: 'lowtech' }, resultUsd: p.totals.startupUsd,
        text: `Keep the planted look and drop the high-tech gear: ${p.build.finish ? TIER_LABEL[p.build.finish.tier].toLowerCase() : 'a planted finish'} in a ${tankText(p)} tank for ${usd(p.totals.startupUsd)}, ${p.build.finish && p.build.finish.level < 2 ? 'with plant fertiliser but no CO2 rig and no extra-strong light, so less to buy and less to run. ' : ''}The look is the goal; CO2 and strong light are only one way to get it.` });
    }
    return { limitingFactor: factor, text, alternatives: alts, cheapest: { title: cheap.archetype.title, usd: t.startupUsd, over: overS, lines } };
  }

  // ---- nothing passes even with every money / time limit off: a structural limit (the tank you own, the space, the animals) ----
  const relOpen = (patch: Partial<Wants>, caps = true) => x.run({ ...(caps ? w : capsOff(w)), ...patch });
  const la = locked && w.animals ? lockedArchetype(w.animals) : undefined;
  const nearest = (r: Suggestions, label: (p: Proposal) => string, n = 2) => r.proposals.filter(p => p.archetype.id !== la?.id).filter((p, i, a) => a.findIndex(q => q.archetype.id === p.archetype.id) === i).slice(0, n)
    .map((p): Alternative => ({ kind: 'change-animals', label: `Use ${animalsText(p.build.animals)} instead`, edit: { op: 'species', animals: p.build.animals }, resultUsd: p.totals.startupUsd, text: label(p) }));
  if (w.ownTank) {
    const own = w.ownTank, r = relOpen({ ownTank: undefined }, false), c = cheapestOf(r);
    alts.push(...(c ? [{ kind: 'other-tank', label: 'Use a new tank instead', edit: { op: 'ownTank' }, resultUsd: c.totals.startupUsd, text: `Use a new tank instead: the smallest that holds ${what} is ${tankText(c)} (${c.totals.startupUsd ? usd(c.totals.startupUsd) + ' all-in' : ''}).` } as Alternative] : []));
    if (locked) alts.push(...nearest(relOpen({ animals: undefined, ...(la ? { kinds: [la.kind] } : {}) }), p => `Different animals, only if you want them: ${animalsText(p.build.animals)} fit your ${own.name} (${Math.round(own.ratedGal)} gal). ${locked && w.animals ? `Your ${animalsText(w.animals)} stay locked until you choose this.` : ''}`));
    return { limitingFactor: 'tank', alternatives: alts, text: `Your ${own.name} (${Math.round(own.ratedGal)} gal) does not hold ${what} to the stocking rules${c ? `: the smallest tank that does is ${tankText(c)}` : ''}. We never put animals in a tank that is too small, and we do not resize your tank.` };
  }
  if (x.space) {
    const sp = x.space, r = relOpen({ space: undefined, constraints: { ...C, space: C.space ? { ...C.space, on: false } : undefined } }, false), c = cheapestOf(r);
    if (c) { const L = c.build.tank.outer.L, D = c.build.tank.outer.D;
      alts.push({ kind: 'bigger-space', label: `Make room for ${inch(L)} x ${inch(D)} in`, edit: { op: 'space', w: Math.max(sp.w, L), d: Math.max(sp.d, D) }, text: `The smallest tank that holds ${what} is ${tankText(c)}, ${inch(L)} x ${inch(D)} in outside; your space is ${inch(sp.w)} x ${inch(sp.d)} in. Make about ${inch(Math.max(sp.w, L))} x ${inch(Math.max(sp.d, D))} in available.` }); }
    if (locked) alts.push(...nearest(relOpen({ animals: undefined, ...(la ? { kinds: [la.kind] } : {}) }), p => `Different animals, only if you want them: ${animalsText(p.build.animals)} fit your ${inch(sp.w)} x ${inch(sp.d)} in space (${tankText(p)}). Your animals stay locked until you choose this.`));
    return { limitingFactor: 'space', alternatives: alts, text: c ? `No tank that holds ${what} fits your ${inch(sp.w)} x ${inch(sp.d)} in space: the smallest that does is ${tankText(c)} (${inch(c.build.tank.outer.L)} x ${inch(c.build.tank.outer.D)} in).` : `No tank fits your ${inch(sp.w)} x ${inch(sp.d)} in space with these animals.` };
  }
  if (locked && w.animals) {
    const welfare = x.stats.rejectedWelfare > 0;
    alts.push(...nearest(relOpen({ animals: undefined, ...(la ? { kinds: [la.kind], ...(la.group ? { groups: [la.group] } : {}) } : {}) }), p => `Different animals, only if you want them: ${animalsText(p.build.animals)} can be kept well here, for ${usd(p.totals.startupUsd)} all-in. Your ${animalsText(w.animals!)} stay locked until you choose this.`));
    return { limitingFactor: welfare ? 'welfare' : 'animals', alternatives: alts, text: welfare ? `${animalsText(w.animals)} cannot be kept to the stocking rules in any tank we can build (tank size, group size, water and care), whatever the budget. We will not propose a setup that fails them, and your animals stay as you locked them.` : 'Those animals are not in the data yet, so no setup can be checked for them.' };
  }
  return { limitingFactor: 'budget', alternatives: alts, text: 'Nothing passes every check with these limits. Loosen a limit or tick another kind of setup.' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Lane NG4: the four paths. Each is built from real generator runs; a path with nothing that verifies says so in words and has no button (never a silent swap, never a welfare failure shown as a tradeoff).

/** The same edit applied to the generator's input, so an alternative can be verified without a brief. */
const wantsWith = (w: Wants, e: AltEdit): Wants => {
  const C = w.constraints, on = (value: number) => ({ on: true, value });
  switch (e.op) {
    case 'budget': return { ...w, constraints: { ...C, startupUsd: on(e.usd) } };
    case 'upkeep': return { ...w, constraints: { ...C, monthlyUsd: on(e.usd) } };
    case 'time': return { ...w, constraints: { ...C, minutesPerWeek: on(e.min) } };
    case 'owned': { const have = { ...(w.owned ?? {}) }; for (const k of e.keys) have[k] = PICK_CARE; return { ...w, owned: have, ...(e.tank ? { ownTank: TANK_MODELS.find(m => m.id === e.tank) } : {}) }; }
    case 'species': return { ...w, animals: e.animals };
    case 'phased': return { ...w, phased: true };
    case 'lowtech': return { ...w, hightech: false, lowtech: true };
    case 'space': return e.w && e.d ? { ...w, space: { w: e.w, d: e.d }, constraints: { ...C, ...(C.space ? { space: { ...C.space, on: true } } : {}) } } : { ...w, space: undefined, constraints: { ...C, space: C.space ? { ...C.space, on: false } : undefined } };
    case 'ownTank': return { ...w, ownTank: undefined };
    case 'all': return e.edits.reduce(wantsWith, w);
    case 'future': return e.now ? wantsWith(w, e.now) : w;
  }
};

/** How alike two animals are in what a person sees and gets: same family of animal, same genus, same way of swimming, similar size, same water level. Only used to order the "nearest animals" shown. */
function likeness(a: string, b: string): { score: number; keeps: string[] } {
  const A = getSpecies(a), B = getSpecies(b); if (!A || !B) return { score: 0, keeps: [] };
  const keeps: string[] = []; let score = 0;
  if (A.sci.split(' ')[0] === B.sci.split(' ')[0]) { score += 3; keeps.push('the same genus'); }
  if (A.cat === B.cat) score += 2;
  if (A.group && A.group === B.group) { score += 1; keeps.push(A.group === 'school' ? 'a tight school' : 'a loose shoal'); }
  if ((A.level ?? 'mid') === (B.level ?? 'mid')) score += 0.5;
  const r = Math.min(A.tl, B.tl) / Math.max(A.tl, B.tl); score += r * 1.5; if (r > 0.6) keeps.push('a similar size');
  return { score, keeps };
}

/** Money / time edits scaled up in small steps until a real run passes: the build's own price is not always a limit the generator accepts (it checks the all-in price with its margins). */
const scaled = (e: AltEdit, f: number): AltEdit => e.op === 'budget' ? { op: 'budget', usd: Math.ceil(e.usd * f) } : e.op === 'upkeep' ? { op: 'upkeep', usd: Math.ceil(e.usd * f) } : e.op === 'time' ? { op: 'time', min: Math.ceil(e.min * f) } : e.op === 'all' ? { op: 'all', edits: e.edits.map(x => scaled(x, f)) } : e;
function verified(x: Ctx, e: AltEdit): { edit: AltEdit; best: number } | undefined {
  for (const f of [1, 1.03, 1.06, 1.1, 1.15, 1.2, 1.3]) { const edit = scaled(e, f), r = x.run(wantsWith(x.w, edit)); if (r.proposals.length) return { edit, best: Math.min(...r.proposals.map(p => p.totals.startupUsd)) }; }
  return undefined;
}

const key = (e?: AltEdit) => JSON.stringify(e);
const PATH_OF: Partial<Record<Alternative['kind'], PathId>> = { 'raise-budget': 'vision', 'raise-upkeep': 'vision', 'more-time': 'vision', 'use-owned': 'vision', 'phase': 'vision', 'other-tank': 'vision', 'bigger-space': 'vision', 'change-animals': 'limits', 'low-tech': 'look' };

/** Explain why nothing passed and what would change that, as four verified paths (keep the vision, keep the limits, keep the look, save the ambition). Every button re-runs the generator before it is offered. */
export function explainInfeasible(x: Ctx): Infeasible {
  const base = explainBase(x), { w, locked } = x, C = w.constraints;
  const cap = C.startupUsd?.on ? C.startupUsd.value : undefined, mo = C.monthlyUsd?.on ? C.monthlyUsd.value : undefined, mi = C.minutesPerWeek?.on ? C.minutesPerWeek.value : undefined;
  const what = locked && w.animals ? animalsText(w.animals) : 'this setup';
  const la = locked && w.animals ? lockedArchetype(w.animals) : undefined;
  const alts: Alternative[] = [];
  const add = (path: PathId, a: Alternative) => { alts.push({ ...a, path }); return alts.length - 1; };
  const paths: ConflictPath[] = [
    { id: 'vision', title: 'Keep the vision', blurb: 'The true build, whatever it takes: the tank, gear and care it really needs.', alts: [] },
    { id: 'limits', title: 'Keep the limits', blurb: 'Your budget, tank and time stay as they are; the animals or design change, and we say so.', alts: [] },
    { id: 'look', title: 'Keep the look', blurb: 'The same animals and look with less equipment or complexity, only where welfare still holds.', alts: [] },
    { id: 'future', title: 'Save the ambition', blurb: 'Keep the dream in your brief with what it really needs, and start something responsible now.', alts: [] }];
  const P = (id: PathId) => paths.find(p => p.id === id)!;

  // ---- the single-purpose alternatives that still verify by a real run (raise a limit, use what you own, phases, a new tank, more room) belong to the vision; the animal ones are rebuilt below ----
  for (let a of base.alternatives) {
    const path = PATH_OF[a.kind]; if (!path || a.kind === 'change-animals') continue;
    if (a.edit && a.kind !== 'phase' && a.kind !== 'low-tech') { // phase and low-tech were verified where they were made; the rest get a real run now
      const v = verified(x, a.edit); if (!v) continue;
      if (key(v.edit) !== key(a.edit)) { // the exact raise was not enough: the verified amount, said as it is
        const e = v.edit;
        if (e.op === 'budget' && cap !== undefined) a = { ...a, edit: e, delta: e.usd - cap, label: `Raise the budget to ${usd(e.usd)}`, text: `Raise the set-up ceiling by ${usd(e.usd - cap)}, to ${usd(e.usd)}: that buys this build, with the margin the price check needs.` };
        else if (e.op === 'upkeep' && mo !== undefined) a = { ...a, edit: e, delta: e.usd - mo, label: `Allow ${usd(e.usd)} a month`, text: `Allow ${usd(e.usd - mo)} more a month, ${usd(e.usd)} in all.` };
        else if (e.op === 'time' && mi !== undefined) a = { ...a, edit: e, delta: e.min - mi, label: `Allow ${e.min} min a week`, text: `Allow ${e.min - mi} more minutes a week, ${e.min} in all.` };
        else a = { ...a, edit: e };
      }
      a = { ...a, resultUsd: a.resultUsd ?? v.best }; }
    add(path, a);
  }

  // ---- keep the vision: the true build with every money / time / tank / space limit off ----
  const vw: Wants = { ...capsOff(w), ownTank: undefined, space: undefined }; vw.constraints = { ...vw.constraints, space: C.space ? { ...C.space, on: false } : undefined };
  const vb = cheapestOf(x.run(vw));
  let ambition = '', reqs = '';
  if (vb) {
    const t = vb.totals, o = vb.build.tank.outer, L = inch(o.L), D = inch(o.D), gal = Math.round(vb.build.tank.ratedGal), sp = x.space;
    const breaks: string[] = [], edits: AltEdit[] = [];
    if (cap !== undefined && t.startupUsd > cap) { breaks.push(`${usd(t.startupUsd - cap)} over your ${usd(cap)} set-up ceiling`); edits.push({ op: 'budget', usd: Math.ceil(t.startupUsd) }); }
    if (mo !== undefined && t.monthlyUsd > mo) { breaks.push(`${usd(t.monthlyUsd - mo)} a month over your ${usd(mo)} limit`); edits.push({ op: 'upkeep', usd: Math.ceil(t.monthlyUsd) }); }
    if (mi !== undefined && t.minPerWeek > mi) { breaks.push(`${Math.round(t.minPerWeek - mi)} minutes a week over your ${mi}`); edits.push({ op: 'time', min: Math.ceil(t.minPerWeek) }); }
    if (w.ownTank && vb.build.tank.ratedGal > w.ownTank.ratedGal + 0.5) { breaks.push(`a ${gal} gal tank, not your ${Math.round(w.ownTank.ratedGal)} gal`); edits.push({ op: 'ownTank' }); }
    if (sp && !((o.L <= sp.w && o.D <= sp.d) || (o.L <= sp.d && o.D <= sp.w))) { breaks.push(`${L} x ${D} in of floor, your space is ${inch(sp.w)} x ${inch(sp.d)} in`); edits.push({ op: 'space', w: Math.max(sp.w, o.L), d: Math.max(sp.d, o.D) }); }
    const facts: VisionFacts = { title: vb.archetype.title, animals: animalsText(vb.build.animals), gal, outerIn: [L, D], usd: t.startupUsd, monthlyUsd: t.monthlyUsd, minPerWeek: t.minPerWeek, gear: FIRST(vb.costLines).slice(0, 6), breaks };
    P('vision').facts = facts;
    reqs = `needs a ${gal} gal tank (${L} x ${D} in outside), ${usd(t.startupUsd)} to set up, about ${usd(t.monthlyUsd)} a month and about ${Math.round(t.minPerWeek)} minutes a week`;
    ambition = `${facts.animals} in a ${gal} gal tank`;
    if (edits.length) {
      const v = verified(x, edits.length === 1 ? edits[0] : { op: 'all', edits }), edit = v?.edit ?? edits[0], best = v?.best;
      const rise = edit.op === 'budget' ? ` Set-up ceiling: ${usd(edit.usd)}.` : edit.op === 'all' ? (() => { const b = edit.edits.find(e => e.op === 'budget'); return b && b.op === 'budget' ? ` Set-up ceiling: ${usd(b.usd)}.` : ''; })() : '';
      const dup = edits.length === 1 && alts.some(a => a.path === 'vision' && a.edit?.op === edits[0].op && a.kind !== 'keep-vision'); // the single raise is already there, verified
      if (best !== undefined && !dup) add('vision', { kind: 'keep-vision', label: `Keep it: ${gal} gal, ${usd(best)}`, edit, resultUsd: best, text: `Keep ${what}, as it really is: ${gal} gal, ${usd(t.startupUsd)} to set up, ${usd(t.monthlyUsd)} a month, about ${Math.round(t.minPerWeek)} minutes a week. This changes your limits, not the animals: ${breaks.join('; ')}.${rise}` });
    } else P('vision').none = 'This build already fits every limit you set.';
  } else P('vision').none = `${what} cannot be kept to the stocking rules in any tank we can build, whatever the budget, so there is no way to keep this vision. That is a welfare limit, not a tradeoff: we will not offer it.`;

  // ---- keep the limits: every limit stays; the nearest animals that are kept well here, each with what it keeps and what it changes ----
  if (locked && w.animals && la) {
    const r = x.run({ ...w, animals: undefined, kinds: [la.kind], ...(la.group ? { groups: [la.group] } : {}) });
    const from = w.animals.filter(a => a.n > 0), seen = new Set<string>();
    const opts = r.proposals.filter(p => { const k = animalsText(p.build.animals); return !seen.has(k) && seen.add(k) && p.archetype.id !== la.id; })
      .map(p => { const best = p.build.animals.flatMap(a => from.map(f => ({ a, ...likeness(f.species, a.species) }))).sort((m, n) => n.score - m.score)[0]; return { p, score: best?.score ?? 0, keeps: best?.keeps ?? [] }; })
      .sort((m, n) => n.score - m.score).slice(0, 2);
    for (const { p, keeps } of opts) {
      const t = p.totals, now = animalsText(p.build.animals);
      add('limits', { kind: 'change-animals', label: `Use ${now} instead`, edit: { op: 'species', animals: p.build.animals }, resultUsd: t.startupUsd,
        text: `Different animals, only if you want them: ${now} instead of ${animalsText(from)}, in a ${tankText(p)} tank for ${usd(t.startupUsd)} to set up, ${usd(t.monthlyUsd)} a month, about ${Math.round(t.minPerWeek)} minutes a week. ${keeps.length ? `Keeps ${list(keeps)}; ` : 'Keeps little of the look or the behaviour; '}it is not the same animal. Your ${animalsText(from)} stay locked until you choose this.` });
    }
    if (!opts.length) P('limits').none = `No other animals of this kind can be kept well within your limits (${[cap !== undefined ? `${usd(cap)} to set up` : '', w.ownTank ? `your ${Math.round(w.ownTank.ratedGal)} gal tank` : '', x.space ? `${inch(x.space.w)} x ${inch(x.space.d)} in of space` : ''].filter(Boolean).join(', ') || 'the limits you set'}), so there is no honest swap to offer.`;
  } else P('limits').none = locked ? 'Those animals are not in the data yet, so nothing can be compared.' : 'Your animals are not locked, so there is no animal to swap: nothing in the catalogue of that kind fits these limits either.';

  // ---- keep the look: same animals, every limit; less complexity, only if the engine still passes welfare ----
  if (!alts.some(a => a.path === 'look') && !w.lowtech) {
    const edit: AltEdit = { op: 'lowtech' }, r = x.run(wantsWith(w, edit)), p = r.proposals[0];
    if (p) add('look', { kind: 'low-tech', label: w.hightech ? 'Keep the planted look, low-tech' : 'Same look, low-tech', edit, resultUsd: p.totals.startupUsd,
      text: `Keep ${what} and the look, with less to buy and run: ${p.build.finish ? TIER_LABEL[p.build.finish.tier].toLowerCase() : 'a planted finish'} in a ${tankText(p)} tank for ${usd(p.totals.startupUsd)}, no CO2 rig and no extra-strong light. Welfare checks are the same.` });
  }
  if (!alts.some(a => a.path === 'look')) P('look').none = `Nothing simpler passes: the cost here comes from what ${what} need (tank size, group size, filtration), not from the look, so there is nothing safe to take out.`;

  // ---- save the ambition: stored in the brief with its real requirements, plus the smaller project now ----
  if (ambition) {
    const nowAlt = alts.find(a => a.path === 'limits' && a.edit), now = nowAlt?.edit, text = `${ambition}: ${reqs}.`;
    add('future', { kind: 'save-ambition', label: nowAlt ? 'Save it, start smaller now' : 'Save it for later', edit: { op: 'future', text, from: 'conflict', ...(now ? { now } : {}) }, resultUsd: nowAlt?.resultUsd,
      text: `Save "${ambition}" in your brief for later: it ${reqs}.${nowAlt ? ` And start with something smaller now: ${nowAlt.label.replace(/^Use /, '').replace(/ instead$/, '')}, ${nowAlt.resultUsd !== undefined ? usd(nowAlt.resultUsd) + ' to set up, ' : ''}within your limits.` : ' We found no smaller project that fits your limits yet, so only the ambition is saved and your animals stay as they are.'}` });
  } else P('future').none = 'There is no build to save yet: this vision cannot be kept well at any size, so it is not stored as a plan.';

  alts.forEach((a, i) => P(a.path!).alts.push(i));
  for (const p of paths) if (p.alts.length) p.none = undefined;
  return { ...base, alternatives: alts, paths };
}
