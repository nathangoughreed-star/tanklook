// UI2 shell step 9 (lane S9, 2026-11-14): Compare, the side-by-side view. Pure helpers on top of the Store's own split API
// (splitTank / closeTank / setCamLock / setEditing) and ui/diff.ts's tankDiff; ui/sideStore.ts is used as it is. No DOM, no Preact.
import type { Store } from '../../scene/store';
import type { TankSetup, Units } from '../../scene/types';
import { fmtSize } from '../../scene/physics';
import { tankDiff } from '../../ui/diff';
import { CHECKS, type CheckId, type ChecksModel, type Tone } from './checks';

export const SIDE_LETTERS = ['A', 'B'] as const;
export type Side = 0 | 1;
/** Which tank(s) the panel edits: the "Editing A / B / Both" switch (screen map §2a, decision 8). `none` = no box ticked. */
export type EditMode = 'A' | 'B' | 'Both' | 'none';
export const EDIT_MODES: Exclude<EditMode, 'none'>[] = ['A', 'B', 'Both'];

export const letterOf = (i: number) => SIDE_LETTERS[i] ?? 'A';
export const isSplit = (store: Pick<Store, 'scene'>) => store.scene.tanks.length > 1;

export function editModeOf(targets: number[]): EditMode {
  const a = targets.includes(0), b = targets.includes(1);
  return a && b ? 'Both' : a ? 'A' : b ? 'B' : 'none';
}
/** Apply a mode through the Store's own Edit ticks (the shown tank follows, as setEditing documents). */
export function setEditMode(store: Pick<Store, 'setEditing' | 'scene'>, mode: Exclude<EditMode, 'none'>) {
  if (!isSplit(store)) return;
  const want = mode === 'Both' ? [true, true] : [mode === 'A', mode === 'B'];
  // tick before untick so the shown tank never has nothing to fall back to
  want.forEach((on, i) => { if (on) store.setEditing(i, true); });
  want.forEach((on, i) => { if (!on) store.setEditing(i, false); });
}

/** Start comparing: tank B is a copy of A (Store.splitTank, one undo step). */
export function startCompare(store: Pick<Store, 'splitTank' | 'scene'>): boolean {
  if (isSplit(store)) return false;
  store.splitTank(); return true;
}
/** End compare, keeping the one tank the user is looking at: the Store's active (shown) tank. */
export function endCompare(store: Pick<Store, 'closeTank' | 'scene'>): void {
  if (!isSplit(store)) return;
  store.closeTank(1 - Math.min(store.scene.active, 1));
}
/** "Use this one": keep side `i`, drop the other (Store.closeTank, undoable). Returns the note to show. */
export function useSide(store: Pick<Store, 'closeTank' | 'scene'>, i: number): string {
  if (!isSplit(store) || (i !== 0 && i !== 1)) return '';
  store.closeTank(1 - i);
  return `Kept Tank ${letterOf(i)}; Tank ${letterOf(1 - i)} is gone. Ctrl+Z brings it back.`;
}
/** Views linked toggle (Store.setCamLock; re-linking snaps to the view moved last). */
export function setLinked(store: Pick<Store, 'setCamLock'>, on: boolean) { store.setCamLock(on); }
export const linkedOf = (store: Pick<Store, 'scene'>) => !!store.scene.camLock;
export const linkWord = (linked: boolean) => linked ? 'Views linked' : 'Views independent';
export const linkTitle = (linked: boolean) => linked
  ? 'Views linked: orbit, pan and zoom move both tanks. Click to let each view move on its own.'
  : 'Views independent: each tank orbits on its own. Click to link them again.';

// ---------- what differs ----------
export interface DiffRow { a: string; b: string }
/** The settings that differ between tank A and tank B, as plain rows (ui/diff.ts's list without its "match" actions). */
export function diffRows(a: TankSetup, b: TankSetup, units: Units): DiffRow[] {
  return tankDiff(a, b, units).map(([x, y]) => ({ a: x, b: y }));
}
export const diffWord = (n: number) => n === 0 ? 'same' : n === 1 ? '1 diff' : `${n} diffs`;

/** One side's tab (top outer corner): letter, size line, what it is doing, how many differences. */
export interface SideTab { letter: string; size: string; editing: boolean; diffs: number; diffWord: string }
export function sideTab(S: TankSetup, i: number, units: Units, editing: boolean, diffs: number): SideTab {
  return { letter: letterOf(i), size: fmtSize(S.tank, units, S.water.on), editing, diffs, diffWord: diffWord(diffs) };
}

/** The one figure each check bar button / drawer shows for a side, as text. */
export function checkFigure(m: ChecksModel, id: CheckId): string {
  switch (id) {
    case 'habitat': return m.habitat.pill.word;
    case 'cost': return m.cost ? `${m.cost.setup} · ${m.cost.monthly}` : 'No price yet';
    case 'water': return `${m.water.temp} ${m.water.pill.word}`;
    case 'notes': return String(m.notes.count);
  }
}
const toneOf = (m: ChecksModel, id: CheckId): Tone => id === 'habitat' ? m.habitat.pill.tone : id === 'water' ? m.water.pill.tone : id === 'notes' ? m.notes.tone : 'neutral';
/** Which of the four checks read differently between the two sides (the marks on the check bars and the drawer's "Differences"). */
export function checkDiffs(a: ChecksModel, b: ChecksModel): Record<CheckId, boolean> {
  const r = {} as Record<CheckId, boolean>;
  for (const c of CHECKS) r[c.id] = checkFigure(a, c.id) !== checkFigure(b, c.id) || toneOf(a, c.id) !== toneOf(b, c.id);
  return r;
}
export interface CheckCompare { id: CheckId; title: string; a: string; b: string; differs: boolean }
/** The drawer's top block: each check's figure for A and B, the differing ones flagged. */
export function checkCompare(a: ChecksModel, b: ChecksModel): CheckCompare[] {
  const d = checkDiffs(a, b);
  return CHECKS.map(c => ({ id: c.id, title: c.title, a: checkFigure(a, c.id), b: checkFigure(b, c.id), differs: d[c.id] }));
}
