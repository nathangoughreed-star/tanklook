// Refinement chips on a Suggest result (lane U6, 2026-10-28; plan research/design/unified-setup-plan.md): one-click edits of the setup brief
// ("more planted", "larger tank", "I own a filter", "add 6 pygmy corydoras", "cut $40"). A chip only EDITS THE BRIEF; the generator runs again
// on the edited brief and the card says what the edit bought and what it cost in one line. Rules: locked items (the locked stock, an existing tank,
// owned gear) are never changed by a chip, except that the add-animals chip EXTENDS the locked stock (never removes or swaps one); welfare is the
// generator's own gate (a chip that leaves no setup passing it is refused and the old result stays); the budget stays a ceiling.
import { getSpecies } from '../data/species';
import { TIER_LABEL } from '../scene/finish';
import { clearItem, getItem, setItem, valueOf, type Brief, type Wish } from '../scene/brief';
import { PICK_CARE, type OwnedKey, type Proposal, type Suggestions } from './suggest';

export type ChipId = 'more-planted' | 'larger-tank' | 'own-filter' | 'add-animals' | 'cut-budget' | 'own-heater';
export interface Chip { id: ChipId; label: string; edit: (b: Brief) => Brief }

const usd = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
const sgn = (n: number) => `${n < 0 ? '-' : '+'}${usd(n)}`;
const nameOf = (id: string) => getSpecies(id)?.name ?? id;
const wishes = (b: Brief): Wish[] => valueOf(b, 'preferences.wishes') ?? [];
const addWish = (b: Brief, w: Wish): Brief => setItem(b, 'preferences.wishes', [...new Set([...wishes(b), w])], 'preference');
/** The species the add-animals chip offers, in order: the first the card does not already hold. */
export const ADD_SPECIES: readonly { id: string; n: number }[] = [{ id: 'pygmycory', n: 6 }, { id: 'ottocat', n: 4 }];
export const CUT_USD = 40;

/** Merge animals into the locked stock (counts add; nothing is removed or swapped). */
export function addAnimals(b: Brief, base: { species: string; n: number }[], add: { species: string; n: number }): Brief {
  const cur = getItem(b, 'animals.stock'), have = cur && !cur.off && cur.status === 'locked' ? cur.value.map(x => ({ species: x.species, count: x.count })) : base.map(x => ({ species: x.species, count: x.n }));
  const hit = have.find(x => x.species === add.species);
  if (hit) hit.count += add.n; else have.push({ species: add.species, count: add.n });
  return setItem(b, 'animals.stock', have, 'locked');
}

/** The ceiling a "cut" chip sets: $40 under what the shown concepts cost (or under the ceiling when that is lower); never below $0. */
export function cutCeiling(b: Brief, r: Suggestions): number {
  const top = Math.max(0, ...r.proposals.map(p => p.totals.startupUsd)), cap = valueOf(b, 'constraints.budget');
  return Math.max(0, Math.round(Math.min(cap ?? Infinity, top)) - CUT_USD);
}

/** The chips that make sense for this result and brief: an applied wish or owned item is not offered again. */
export function chipsFor(b: Brief, r: Suggestions): Chip[] {
  const out: Chip[] = [], top = r.proposals[0];
  if (!top) return out;
  const owned = valueOf(b, 'constraints.owned') ?? {};
  const own = (k: OwnedKey) => (x: Brief) => setItem(x, 'constraints.owned', { ...(valueOf(x, 'constraints.owned') ?? {}), [k]: PICK_CARE }, 'hard');
  const freshFish = r.proposals.some(p => p.archetype.family === 'fish');
  if (!wishes(b).includes('more-planted') && r.proposals.some(p => p.archetype.family !== 'terrarium' || p.build.finish)) out.push({ id: 'more-planted', label: 'More planted', edit: x => addWish(x, 'more-planted') });
  if (!wishes(b).includes('larger-tank')) out.push({ id: 'larger-tank', label: 'Larger tank', edit: x => addWish(x, 'larger-tank') });
  if (!owned.filter && r.proposals.some(p => p.build.setup.water.on)) out.push({ id: 'own-filter', label: 'I own a filter', edit: own('filter') });
  if (!owned.heater && r.proposals.some(p => p.build.setup.water.on)) out.push({ id: 'own-heater', label: 'I own a heater', edit: own('heater') });
  if (freshFish) {
    const held = new Set(top.build.animals.map(a => a.species)), lockedHeld = new Set((getItem(b, 'animals.stock')?.value ?? []).map(x => x.species));
    const add = ADD_SPECIES.find(a => !held.has(a.id) && !lockedHeld.has(a.id) && getSpecies(a.id));
    if (add) out.push({ id: 'add-animals', label: `Add ${add.n} ${nameOf(add.id).toLowerCase()}`, edit: x => addAnimals(x, top.build.animals, { species: add.id, n: add.n }) });
  }
  const cut = cutCeiling(b, r);
  if (top.totals.startupUsd >= CUT_USD && cut < (valueOf(b, 'constraints.budget') ?? Infinity)) out.push({ id: 'cut-budget', label: `Cut ${usd(CUT_USD)}`, edit: x => setItem(x, 'constraints.budget', cut, 'hard') });
  return out;
}

/** The same concept before and after: by strategy first, else by archetype. */
const twin = (p: Proposal, before: Proposal[]) => before.find(q => q.strategy === p.strategy && q.archetype.id === p.archetype.id) ?? before.find(q => q.archetype.id === p.archetype.id) ?? before.find(q => q.strategy === p.strategy);
const gal = (p: Proposal) => Math.round(p.build.tank.ratedGal);
const level = (p: Proposal) => p.build.finish?.level ?? 0;
const count = (p: Proposal) => p.build.animals.reduce((t, a) => t + a.n, 0);
const sameConcept = (a: Proposal, b: Proposal) => a.archetype.id === b.archetype.id && a.build.tank.id === b.build.tank.id && a.build.finish?.tier === b.build.finish?.tier && a.totals.startupUsd === b.totals.startupUsd && count(a) === count(b) && a.totals.monthlyUsd === b.totals.monthlyUsd;

/** One line: what got better, what cost more or was dropped (real numbers); welfare is never one of the things traded. */
export function tradeoffLine(p: Proposal, b?: Proposal): string {
  if (!b) return 'A new concept this edit brought in.';
  const better: string[] = [], cost: string[] = [];
  if (gal(p) !== gal(b)) (gal(p) > gal(b) ? better : cost).push(`tank ${gal(b)} -> ${gal(p)} gal`);
  const tier = (x: Proposal) => x.build.finish ? TIER_LABEL[x.build.finish.tier].toLowerCase() : 'no finish';
  if (level(p) !== level(b) || p.build.finish?.tier !== b.build.finish?.tier) (level(p) >= level(b) ? better : cost).push(`finish ${tier(b)} -> ${tier(p)}`);
  if (count(p) !== count(b)) (count(p) > count(b) ? better : cost).push(count(p) > count(b) ? `${count(p) - count(b)} more animals` : `${count(b) - count(p)} fewer animals`);
  const d = Math.round(p.totals.startupUsd - b.totals.startupUsd);
  if (d) (d < 0 ? better : cost).push(`set-up ${sgn(d)} (${usd(b.totals.startupUsd)} -> ${usd(p.totals.startupUsd)})`);
  const m = Math.round(p.totals.monthlyUsd - b.totals.monthlyUsd);
  if (m) (m < 0 ? better : cost).push(`${sgn(m)} a month`);
  const t = p.totals.minPerWeek - b.totals.minPerWeek;
  if (t) (t < 0 ? better : cost).push(`${t > 0 ? '+' : '-'}${Math.abs(t)} min a week`);
  if (!better.length && !cost.length) return 'Nothing else changed.';
  return `${better.length ? `Better: ${better.join(', ')}.` : ''}${better.length && cost.length ? ' ' : ''}${cost.length ? `Costs: ${cost.join(', ')}.` : ''}`;
}

const SAME: Record<ChipId, string> = {
  'more-planted': 'Already at the most planted finish your ceiling and the animals allow.',
  'larger-tank': 'Already the largest tank your ceiling and the animals allow.',
  'own-filter': 'Your filter changed nothing: the setups already counted what they need.',
  'own-heater': 'Your heater changed nothing: the setups already counted what they need.',
  'add-animals': 'Those animals changed nothing.',
  'cut-budget': 'These setups already cost less than that.',
};

export interface Refined {
  /** false: the edit left no setup that passes (welfare, a hard limit); the old brief and result are returned untouched */
  ok: boolean;
  brief: Brief;
  result: Suggestions;
  /** the headline above the cards: what the chip did */
  line: string;
  /** one tradeoff line per card of `result.proposals` */
  cards: string[];
  /** every concept came out identical */
  unchanged: boolean;
}

/** Apply a chip: edit the brief, run the generator again (`run` is the caller's generator call), keep the old result when the edit leaves nothing. */
export function refine(b: Brief, chip: Chip, before: Suggestions, run: (b: Brief) => Suggestions): Refined {
  const nb = chip.edit(b), after = run(nb);
  if (!after.proposals.length) {
    const why = after.infeasible?.text ?? after.message ?? after.unavailable ?? 'no setup passes every check';
    return { ok: false, brief: b, result: before, line: `Not applied: "${chip.label}" leaves no setup that passes every check (${why}) Your previous setups stay.`, cards: before.proposals.map(() => ''), unchanged: true };
  }
  const cards = after.proposals.map(p => { const t = twin(p, before.proposals); return t && sameConcept(p, t) ? '' : tradeoffLine(p, t); });
  const unchanged = after.proposals.length === before.proposals.length && after.proposals.every((p, i) => before.proposals[i] && sameConcept(p, before.proposals[i]));
  const lockedNote = chip.id === 'add-animals' ? ' Your animals are now locked in as listed.' : '';
  return { ok: true, brief: nb, result: after, cards: unchanged ? after.proposals.map(() => '') : cards, unchanged, line: unchanged ? SAME[chip.id] : `${chip.label}: applied.${lockedNote}` };
}

/** Switch an applied wish back off. */
export function dropWish(b: Brief, w: Wish): Brief {
  const left = wishes(b).filter(x => x !== w);
  return left.length ? setItem(b, 'preferences.wishes', left, 'preference') : clearItem(b, 'preferences.wishes');
}
