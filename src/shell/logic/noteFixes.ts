// NF1: the Notes panel's "Fix these" buttons (Nathan 2026-11-17). A FIX REGISTRY: each fixable note maps to a pure fix that edits a
// TankSetup (the store runs it as ONE undo step) and to a one-sentence description with the numbers, drawn from a dry run on a
// copy, so the hover text is exactly what the click does. Notes are grouped by fix KIND; one button per kind that applies.
// Only an exact, minimal, non-destructive fix is offered: nothing is removed, no animal or item is moved or swapped. Anything the
// note does not state as a number (a bigger tank, fewer animals, a different grain, a stronger light) has no button.
//   deepen   substrate:plant:*, substrate:needs:depth:*   raise the ground by exactly the shortfall, only where it is short
//   time     limit:time                                    raise the time limit to the figure the note names
//   budget   limit:startup                                 likewise for the set-up budget
//   monthly  limit:monthly                                 likewise for the monthly limit
//   lid      lid:open (LW1)                                 the engine's own lid for these animals, with its price
//   heater   temp:hold:noheater, temp:hold:weak (LW1)       the smallest generic heater that holds the target (or one to add)
//   chiller  temp:hold:cool, temp:chiller (LW1)             add a chiller; every other temperature note is warning only
import { MM_IN, PLANT_DEPTH, DWELLER } from '../../data/substrateTraits';
import { bedOf, bedDepths, substrateCheck } from '../../scene/substrateCheck';
import { groundHeight, sampleTerrain, terrainPoints } from '../../scene/terrain';
import { tankWeight } from '../../scene/weight';
import type { Issue } from '../../scene/verdict';
import type { TankSetup } from '../../scene/types';
import { lidFix, tempFixes, type PriceOf } from './lidTemp';
import { emptyBrief, setBudget, setCareTime, setMonthly, syncCaps } from '../../ui/setupBrief';

export type FixKindId = 'deepen' | 'time' | 'budget' | 'monthly' | 'lid' | 'heater' | 'chiller';
export interface FixPlan {
  kind: FixKindId;
  /** the button's headline: "Fix these (6)" / "Fix this" */
  label: string;
  /** what it does, in a few words (shown under the headline) */
  what: string;
  /** how many notes it clears */
  count: number;
  /** the note ids it covers */
  ids: string[];
  /** the hover text: exactly what changes, with the numbers */
  describe: string;
  /** the edit, on a tank being edited (run inside one store update) */
  apply: (t: TankSetup) => void;
}

/** R117: where the user goes to fix an issue by hand (the "Fix it" button on a Habitat-check row and the Notes list). It navigates, it never applies.
 *  Keyed by the issue id's prefix; an issue with no obvious home has no entry. `section` is a workspace id (logic/sections.ts), `group` a group / category inside it. */
export interface GoTarget { section: 'tank' | 'equipment' | 'scape'; group: string; label: string }
export const GO_LID: GoTarget = { section: 'tank', group: 'lid', label: 'Lid and top' };
export const GO_FILTER: GoTarget = { section: 'equipment', group: 'filter', label: 'Filter' };
export const GO_HEATER: GoTarget = { section: 'equipment', group: 'heater', label: 'Heater' };
export function goTargetOf(issueId: string): GoTarget | undefined {
  if (issueId === 'lid:open') return GO_LID;
  if (issueId === 'temp:hold:noheater' || issueId === 'temp:hold:weak') return { section: 'equipment', group: 'heater', label: 'Heater' };
  if (issueId === 'temp:hold:cool' || issueId === 'temp:chiller') return { section: 'equipment', group: 'chiller', label: 'Chiller' };
  if (issueId.startsWith('substrate:plant:') || issueId.startsWith('substrate:needs:depth:')) return { section: 'scape', group: 'substrate', label: 'Substrate' };
  return undefined;
}

const inch = (mm: number) => `${+(mm / MM_IN).toFixed(1)} in`;
const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const lbOf = (kg: number) => +(kg * 2.20462).toFixed(1);
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

export interface DeepenReport {
  /** the whole bed raised to give a bottom dweller its depth: mm, and who asked */
  bed?: { mm: number; from: number; to: number };
  /** plants that were short: the ground where each stands, before and after (mm) */
  plants: { variant: string; id: number; need: number; from: number; to: number }[];
  /** converted a flat-cornered substrate to custom terrain to shape the hills */
  convertedToTerrain: boolean;
}

/** Raise the ground of `t` by exactly the shortfall, only where a note says it is short. Never lowers; idempotent (a second run finds nothing short). Returns what changed, or null if nothing. */
export function deepenBed(t: TankSetup): DeepenReport | null {
  if (!bedOf(t)) return null;
  const T = t.tank, rep: DeepenReport = { plants: [], convertedToTerrain: false }, cap = T.H * 0.5;
  const g = () => ({ substrate: t.substrate, layout: t.layout, terrain: t.terrain });
  // 1. a bottom dweller that needs more depth on average: the whole bed rises by the shortfall (corners, and the grid when there is one)
  const want = Math.max(0, ...substrateCheck(t).filter(n => n.id.startsWith('substrate:needs:depth:')).map(n => DWELLER[n.id.split(':')[3]]?.minDepth ?? 0));
  if (want > 0) {
    const from = bedDepths(t).mean;
    for (let k = 0; k < 6; k++) {
      const gap = want - bedDepths(t).mean;
      if (gap <= 0.3) break;
      for (const c of ['fl', 'fr', 'bl', 'br'] as const) t.substrate[c] = Math.min(cap, +(t.substrate[c] + gap).toFixed(1));
      if (t.terrain.on) t.terrain.h = t.terrain.h.map(h => Math.min(T.H * 0.95, +(h + gap).toFixed(1)));
    }
    const to = bedDepths(t).mean;
    if (to > from + 0.05) rep.bed = { mm: +(to - from).toFixed(1), from, to };
  }
  // 2. plants whose roots would not reach: a smooth mound at and around each, up to exactly what it needs
  const short = t.items.filter(it => it.kind === 'plant' && PLANT_DEPTH[it.variant] && groundHeight(g(), T, it.x, it.depth) + 1 < PLANT_DEPTH[it.variant].min);
  if (short.length) {
    const base = structuredClone(g());
    if (!t.terrain.on || !t.terrain.h.length) {
      const cols = Math.min(25, Math.max(9, Math.round(T.L / 50) + 1));
      t.terrain = sampleTerrain({ substrate: t.substrate, layout: t.layout, terrain: undefined }, T, cols);
      t.substrate.show = true; rep.convertedToTerrain = true;
    }
    const tt = t.terrain, pts = terrainPoints(tt, T), R = 1.7 * Math.sqrt(T.L * T.D / pts.length);
    const before = new Map(short.map(it => [it.id, groundHeight(g(), T, it.x, it.depth)]));
    const raisePlants = () => {
    for (let k = 0; k < 40; k++) {
        let moved = false;
        for (const it of short) {
          const need = PLANT_DEPTH[it.variant].min + 0.2, e = need - groundHeight(g(), T, it.x, it.depth);
          if (e <= 0.1) continue;
          const w = pts.map(p => smooth(1 - Math.hypot(p.x - it.x, p.depth - it.depth) / R)), n2 = w.reduce((s, v) => s + v * v, 0);
          if (n2 <= 0) continue;
          tt.h = tt.h.map((h, i) => w[i] > 0 ? Math.min(T.H * 0.95, +(h + e * w[i] / n2).toFixed(2)) : h);
          moved = true;
        }
        if (!moved) break;
      }
    };
    raisePlants();
    // the smooth surface can dip between grid points beside a raised mound (spline undershoot): lift those dips back to the old ground, never lower it
    const lat: [number, number][] = []; for (let i = 0; i <= 40; i++) for (let j = 0; j <= 20; j++) lat.push([T.L * i / 40, T.D * j / 20]);
    const was = lat.map(([x, d]) => groundHeight(base, T, x, d));
    for (let k = 0; k < 30; k++) {
      let moved = false;
      lat.forEach(([x, d], n) => {
        const e = was[n] - groundHeight(g(), T, x, d); if (e <= 0.15) return;
        const w = pts.map(p => smooth(1 - Math.hypot(p.x - x, p.depth - d) / R)), n2 = w.reduce((q, v) => q + v * v, 0); if (n2 <= 0) return;
        tt.h = tt.h.map((h, i) => w[i] > 0 ? Math.min(T.H * 0.95, +(h + e * w[i] / n2).toFixed(2)) : h); moved = true;
      });
      if (!moved) break;
    }
    tt.h = tt.h.map(h => +h.toFixed(1));
    raisePlants(); tt.h = tt.h.map(h => +h.toFixed(1));
    for (const it of short) rep.plants.push({ variant: it.variant, id: it.id, need: PLANT_DEPTH[it.variant].min, from: before.get(it.id)!, to: groundHeight(g(), T, it.x, it.depth) });
  }
  return rep.bed || rep.plants.length ? rep : null;
}

/** The plan for the substrate notes, from a dry run on a copy; undefined when there is nothing to deepen or the run would clear nothing. */
function deepenPlan(S: TankSetup, ids: string[]): FixPlan | undefined {
  const copy = structuredClone(S), rep = deepenBed(copy);
  if (!rep) return undefined;
  const after = new Set(substrateCheck(copy).map(n => n.id)), cleared = ids.filter(i => !after.has(i));
  if (!cleared.length) return undefined;
  const parts: string[] = [];
  if (rep.bed) parts.push(`Raises the whole bed by ${inch(rep.bed.mm)} (average ${inch(rep.bed.from)} to ${inch(rep.bed.to)}) so the bottom dwellers can dig in.`);
  if (rep.plants.length) {
    const by = new Map<string, { from: number; to: number; need: number }>();
    for (const p of rep.plants) { const c = by.get(p.variant); if (!c || p.from < c.from) by.set(p.variant, { from: p.from, to: p.to, need: p.need }); }
    parts.push(`Raises the ground only under and around ${rep.plants.length === 1 ? 'the plant' : 'the plants'} that sit too shallow, by exactly the shortfall: ${[...by].map(([v, c]) => `the ${v} to ${inch(c.to)} (+${inch(c.to - c.from)})`).join(', ')}. The slope eases out smoothly; nothing else moves, and pieces stand on the new ground.`);
  }
  const lb = lbOf(tankWeight(copy).substrate - tankWeight(S).substrate);
  if (lb > 0) parts.push(`Adds about ${lb} lb of substrate (and its water).`);
  if (rep.convertedToTerrain) parts.push('The ground becomes custom terrain so the mounds can be shaped; you can edit it in Scape.');
  const left = ids.filter(i => after.has(i)).length;
  if (left) parts.push(`${left} note${left === 1 ? '' : 's'} stay${left === 1 ? 's' : ''}: it cannot be fixed this way.`);
  const was = new Set(substrateCheck(S).map(n => n.id)), fresh = [...after].filter(i => !was.has(i));
  if (fresh.length) parts.push('This leaves the bed deeper than its grain likes, which adds its own note.');
  return {
    kind: 'deepen', label: 'Fix', what: 'Deepen the substrate where it is needed', count: cleared.length, ids: cleared,
    describe: parts.join(' '), apply: t => { deepenBed(t); },
  };
}

const LIMIT_KIND = { time: 'time', startup: 'budget', monthly: 'monthly' } as const;
function limitPlan(i: Issue): FixPlan | undefined {
  const f = i.fix; if (!f) return undefined;
  const kind = LIMIT_KIND[f.id];
  const what = f.id === 'time' ? `Raise the time limit to ${Math.ceil(f.to)} min a week` : f.id === 'startup' ? `Raise the budget to ${usd(f.to)}` : `Raise the monthly limit to ${usd(f.to)}`;
  const from = f.id === 'time' ? `${Math.round(f.from)} min a week` : usd(f.from), to = f.id === 'time' ? `${Math.ceil(f.to)} min a week` : usd(f.to);
  return {
    kind, label: 'Fix', what, count: 1, ids: [i.id],
    describe: `Changes your ${f.id === 'time' ? 'time limit' : f.id === 'startup' ? 'set-up budget' : 'monthly limit'} from ${from} to ${to}, the smallest change that makes this design fit. The design itself is not touched.`,
    apply: t => {
      const b0 = t.brief ?? emptyBrief(), b = f.id === 'time' ? setCareTime(b0, Math.ceil(f.to)) : f.id === 'startup' ? setBudget(b0, f.to) : setMonthly(b0, f.to);
      syncCaps(t, b0, b); t.brief = b;
    },
  };
}

/** The buttons to show under the notes: one per fix kind that applies, in a fixed order. */
export function fixPlans(S: TankSetup, issues: Issue[], ctx: { price?: PriceOf; units?: 'cm' | 'in' } = {}): FixPlan[] {
  const out: FixPlan[] = [];
  const sub = issues.filter(i => i.id.startsWith('substrate:plant:') || i.id.startsWith('substrate:needs:depth:')).map(i => i.id);
  if (sub.length) { const p = deepenPlan(S, sub); if (p) out.push(p); }
  for (const id of ['time', 'startup', 'monthly']) { const i = issues.find(x => x.id === `limit:${id}`); const p = i && limitPlan(i); if (p) out.push(p); }
  // LW1: the lid, the heater, the chiller
  if (issues.some(i => i.id === 'lid:open')) { const f = lidFix(S, ctx.price); if (f) out.push({ kind: 'lid', label: 'Fix', what: f.what, count: 1, ids: ['lid:open'], describe: f.describe, apply: f.apply }); }
  const tids = issues.filter(i => i.id.startsWith('temp:')).map(i => i.id);
  if (tids.length) for (const f of tempFixes(S, tids, ctx.price, ctx.units)) out.push({ kind: f.kind, label: 'Fix', what: f.what, count: f.ids.length, ids: f.ids, describe: f.describe, apply: f.apply });
  return out.map(p => ({ ...p, label: p.count === 1 ? 'Fix this' : `Fix these (${p.count})` }));
}
