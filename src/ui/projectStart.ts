// One project, no silent wipes (lane DX5; research/design/discovery-architecture-handoff.md sections 1, 6, 11, invariant 11).
// Every place that used to swap the whole scene is now one of two things:
//   (a) a PROPOSAL applied with `applyProposal` (`adoptTank`): one undo step, scope = every tab, locks respected, never adds a lock; or
//   (b) "start a different project" (Open file, share link, New tank, a saved tank, a deal): `startProject` asks first when the current project holds
//       unsaved work or locks (Save copy / Replace / Cancel) and only then calls `store.replace`.
// The pure parts live here so test/dx5.test.ts can spy on `store.replace`.
import type { Scene, TankSetup } from '../scene/types';
import type { Store } from '../scene/store';
import type { Tab } from '../scene/scope';
import { applyProposal, deltaBetween, type ApplyResult, type Proposal } from '../scene/proposal';
import { confine } from '../scene/discover';
import { regenerate } from '../scene/starter';
import type { Layer } from '../scene/items';
import { atStake, hasWork } from './newTank';

export const ALL_TABS: readonly Tab[] = ['tank', 'animals', 'plants', 'hardscape', 'substrate'];

/** Does any tank in the scene hold a lock (object or roster)? A lock is a decision the person made: replacing the project loses it. */
export const hasLocks = (scene: Scene): boolean => scene.tanks.some(t => !!t.locks && (t.locks.objects.length > 0 || t.locks.roster.length > 0));
/** Something a new project would throw away: work, or locks, not already saved as it stands. */
export const needsAsk = (scene: Scene, savedText?: string | null): boolean => (hasWork(scene) || hasLocks(scene)) && JSON.stringify(scene) !== savedText;
export { atStake };

/** The ask-first hook: the page sets the real dialog (Save copy / Replace / Cancel); tests set a spy. Resolves true to go ahead. */
type Ask = () => boolean | Promise<boolean>;
let asker: Ask | undefined;
export const setProjectAsker = (fn: Ask | undefined) => { asker = fn; };

/** Ask-first on its own, for doors that must show a spinner between the answer and the replace (Open file, a saved tank, a share link). true = go ahead. */
export async function confirmStart(scene: Scene, savedText?: string | null): Promise<boolean> {
  return !needsAsk(scene, savedText) || !!(await (asker?.() ?? false));
}
/** "Start a new project?": replaces the whole scene, but only after the person agreed when the current project holds unsaved work or locks. The ONLY door to `store.replace` for the start flows. */
export async function startProject(store: Store, scene: Scene, savedText?: string | null): Promise<boolean> {
  if (!await confirmStart(store.scene, savedText)) return false;
  store.replace(scene);
  return true;
}

export type AdoptResult = { ok: true; apply: Extract<ApplyResult, { ok: true }> } | { ok: false; reason: 'locks' | 'scope' | 'stale'; message: string };
const why = (r: Exclude<ApplyResult, { ok: true }>): string =>
  r.reason === 'stale' ? 'The project changed while this was open; try again.'
  : r.reason === 'locks' ? `This would change something you locked (${r.violations.slice(0, 3).map(v => v.detail).join('; ')}). Unlock it, or start a new project instead.`
  : `This reaches outside the parts it may change (${r.outside.join(', ')}).`;

/** Make `next` (a whole tank a generator, a picker or a look hand-off produced) the project's tank as a PROPOSAL: the delta from the current tank, applied with `applyProposal`
 *  (one undo step; scope = every tab; refused when it would break a lock; never locks anything). The brief the project holds stays unless `next` carries its own. */
export function adoptTank(store: Store, next: TankSetup, summary: string, opts: { scope?: readonly Tab[]; /** a new project name, in the same undo step */ name?: string } = {}): AdoptResult {
  const scope = opts.scope ?? ALL_TABS;
  const cur = store.tank, want = structuredClone(next);
  if (cur.brief && !want.brief) want.brief = structuredClone(cur.brief);
  const p: Proposal = { baseRev: store.rev, scope: [...scope], delta: deltaBetween(cur, want), summary };
  const m = store.mark, r = applyProposal(store, p);
  if (r.ok && opts.name) { store.update(x => { x.name = opts.name!; }); store.squash(m); } // the name and the delta are one undo step
  return r.ok ? { ok: true, apply: r } : { ok: false, reason: r.reason, message: why(r) };
}

/** `regenerate` that respects the locks: the redraw runs, then every locked piece, animal and property comes back from before (DX2's `confine`). Without locks it is `regenerate`. */
export function regenerateKeepingLocks(s: TankSetup, layer: Layer | 'all', fishId0: number): void {
  const L = s.locks, held = !!L && (L.objects.length > 0 || L.roster.length > 0);
  if (!held) { regenerate(s, layer, fishId0); return; }
  const orig = structuredClone(s);
  regenerate(s, layer, fishId0);
  const c = confine(orig, s, ALL_TABS) ?? orig;
  for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k];
  Object.assign(s, c);
}
