// Explore Complete Setups, stage X3 (lane OX5): the SESSION behind the screens. Pure (no DOM, no pictures): the pool is built in small chunks so the screen can paint between them (a whole pool is
// minutes, explore-cost-spike.md section 1), looks go round the worlds and families so the first chunks are already varied, and a batch is stage B's `assembleBatch` over what the gate let through.
// Two inputs stay two arguments all the way: the gate's output (what may be shown, built from the brief's limits) and the preference profile (only the order). Nothing here writes the scene or a limit.
import { ARCHETYPES } from '../../scene/archetypes';
import type { Wants } from '../../demand/suggest';
import type { UserProfile } from '../../demand/types';
import type { Units } from '../../scene/types';
import { explorePool, identityOf, isBuildable, noResultOf, type Candidate, type NoResult, type Withheld } from '../../explore/pool';
import { entryOf, entryOfStored, type Entry, type StoredLite } from '../../explore/candidate';
import { assembleBatch, type Batch } from '../../explore/rank';
import type { Aspects } from '../../explore/aspects';
import type { GateId } from '../../explore/gate';

/** Looks gated per chunk (each costs up to a second or two: a roster, a recipe scene, the gate), and how many eligible setups beyond the batch are wanted before a batch is made, so ranking has something to choose from. */
export const CHUNK_LOOKS = 2, POOL_AHEAD = 2;
/** The setups shown beyond the recommendation set, at most (the provisional strip). */
export const PROVISIONAL_SHOWN = 6;

export type PoolEntry = Entry & { candidate: Candidate };

/** The buildable looks in the order the pool tries them: round-robin over the worlds (fresh aquarium, salt aquarium, terrarium, paludarium) and, inside a world, over the families, so any prefix is varied. Brackish looks are left out (no roster exists, Q3). */
export function lookOrder(only?: readonly string[]): string[] {
  const groups = new Map<string, Map<string, string[]>>();
  for (const a of ARCHETYPES) {
    if (!isBuildable(a) || (only && !only.includes(a.id))) continue;
    const id = identityOf(a); if (id.water === 'brackish') continue;
    const g = `${id.world}:${id.water}`, fam = groups.get(g) ?? new Map<string, string[]>();
    fam.set(a.familyId, [...(fam.get(a.familyId) ?? []), a.id]); groups.set(g, fam);
  }
  const inGroup = [...groups.values()].map(fam => { const lists = [...fam.values()], out: string[] = []; for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]); return out; });
  const out: string[] = [];
  for (let i = 0; inGroup.some(l => i < l.length); i++) for (const l of inGroup) if (i < l.length) out.push(l[i]);
  return out;
}

export interface ExplorerInput { w: Wants; P: UserProfile; units: Units; now: number; /** only these looks (tests) */ only?: readonly string[]; chunk?: number; sizes?: number }

export class Explorer {
  readonly order: string[];
  cursor = 0;
  eligible: PoolEntry[] = []; provisional: PoolEntry[] = []; withheld: Withheld[] = [];
  byGate: Partial<Record<GateId, number>> = {};
  tried = 0;
  /** everything already put in a batch (and so never offered again) */
  readonly shown = new Map<string, PoolEntry>();
  constructor(private o: ExplorerInput) { this.order = lookOrder(o.only); }

  get done(): boolean { return this.cursor >= this.order.length; }
  /** looks checked so far and in all, for the progress line */
  get progress(): { checked: number; of: number } { return { checked: Math.min(this.cursor, this.order.length), of: this.order.length }; }
  /** eligible setups not yet shown */
  get left(): PoolEntry[] { return this.eligible.filter(e => !this.shown.has(e.id)); }

  /** Gate the next chunk of looks through the pool (stage A) and add what it turned out. Synchronous; the caller yields to the screen between calls. */
  step(): void {
    if (this.done) return;
    const only = this.order.slice(this.cursor, this.cursor + (this.o.chunk ?? CHUNK_LOOKS)); this.cursor += only.length;
    const r = explorePool(this.o.w, this.o.P, this.o.units, this.o.now, { only, explain: false, ...(this.o.sizes ? { sizes: this.o.sizes } : {}) });
    const have = new Set([...this.eligible, ...this.provisional].map(e => e.candidate.key));
    for (const c of r.eligible) if (!have.has(c.key)) this.eligible.push(entryOf(c));
    for (const c of r.provisional) if (!have.has(c.key)) this.provisional.push(entryOf(c));
    this.withheld.push(...r.withheld); this.tried += r.stats.tried;
    for (const [g, n] of Object.entries(r.stats.byGate)) this.byGate[g as GateId] = (this.byGate[g as GateId] ?? 0) + (n ?? 0);
  }

  /** Does a batch of `size` have enough to choose from yet (or is every look checked)? */
  ready(size: number): boolean { return this.done || this.left.length >= size + POOL_AHEAD; }

  /** Stage B over what the gate let through: `aspects` only orders it, `broad` ignores it ("something different"), `known` are the saved / reacted records (never repeated, never matched by a near-copy). */
  batch(aspects: Aspects | undefined, o: { size: number; broad?: boolean; known?: readonly StoredLite[]; /** false = look without marking the picks as shown (call `commit` once the batch is final) */ commit?: boolean }): Batch<PoolEntry> {
    const seen: Entry[] = [...(o.known ?? []).map(entryOfStored), ...this.shown.values()];
    const b = assembleBatch(this.left, o.broad ? undefined : aspects, { size: o.size, seen });
    if (o.commit !== false) this.commit(b);
    return b;
  }
  /** Mark a batch's picks as shown: they are never offered again. */
  commit(b: Batch<PoolEntry>): void { for (const p of b.picks) this.shown.set(p.entry.id, p.entry); }

  /** Why nothing (or fewer than asked) is on offer: the limit that turned away the most looks, its words, and the controlled edits. `explain` adds the generator's verified one-click alternatives (a second or two). */
  why(explain = false): NoResult {
    return noResultOf(this.o.w, this.o.P, this.o.units, this.o.now, this.withheld, this.provisional.map(e => e.candidate), explain);
  }
}

// ---------------------------------------------------------------------------------------------------------------- the words around a batch
const GATE_WORDS: Record<GateId, string> = { budget: 'your set-up budget', monthly: 'your monthly limit', care: 'your care-time limit', setup: 'your set-up time', space: 'your space', size: 'your tank size range', equipment: 'your Required equipment', lower: 'a lower bound you set', world: 'the animal data for that world', welfare: 'the animal welfare rules' };
export const gateWords = (g: GateId): string => GATE_WORDS[g];

/** "Fewer than six, here is why": one sentence per limit that turned looks away, the most first, from the counters the pool kept. Empty when nothing was turned away. */
export function fewerWhy(byGate: Partial<Record<GateId, number>>, withheld: readonly Withheld[], max = 2): string[] {
  const rows = Object.entries(byGate).filter(([, n]) => (n ?? 0) > 0).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, max) as [GateId, number][];
  return rows.map(([g, n]) => {
    const sample = withheld.flatMap(x => x.reasons).find(r => r.gate === g && r.severity === 'blocked')?.text;
    return `${n} setup${n === 1 ? ' was' : 's were'} left out by ${gateWords(g)}${sample ? `: ${sample}` : '.'}`;
  });
}

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
/** The limits the screen applied, in words, with firm / flexible and what is not set (an unset limit is unknown, never zero). */
export function limitsLine(w: Wants): { set: string[]; unset: string[] } {
  const C = w.constraints, fx = w.flexLimits ?? {}, set: string[] = [], unset: string[] = [];
  const kind = (flex: boolean | undefined) => flex ? 'flexible target' : 'firm';
  const num = (label: string, on: boolean | undefined, text: string, flex: boolean | undefined) => on ? set.push(`${label} ${text} (${kind(flex)})`) : unset.push(label);
  num('set-up budget', C.startupUsd?.on, usd(C.startupUsd?.value ?? 0), fx.startupUsd);
  num('monthly cost', C.monthlyUsd?.on, `${usd(C.monthlyUsd?.value ?? 0)} a month`, fx.monthlyUsd);
  num('care time', C.minutesPerWeek?.on, `${Math.round(C.minutesPerWeek?.value ?? 0)} min a week`, fx.minPerWeek);
  num('set-up time', w.setupHours !== undefined && w.setupHours > 0, `${Math.round((w.setupHours ?? 0) * 10) / 10} h`, fx.setupHours);
  const sp = C.space?.on === false ? undefined : w.space;
  num('space', !!sp, sp ? `${Math.round(sp.w / 25.4)} x ${Math.round(sp.d / 25.4)} in` : '', fx.space);
  if (w.ownTank) set.push(`your ${Math.round(w.ownTank.ratedGal)} gal tank (Required)`);
  else if (w.availTank) set.push(`your ${Math.round(w.availTank.ratedGal)} gal tank (Available)`);
  return { set, unset };
}
