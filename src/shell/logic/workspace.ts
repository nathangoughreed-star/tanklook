// R111 / WS2 (2026-11-16): the full-screen workspace shell's pure parts. No DOM.
//  - the visit: what a live workspace remembers from the moment you came in, so "Revert this visit" can undo everything since in one click;
//  - which rail sections open a workspace instead of a side panel (only Scape so far; later lanes add theirs);
//  - the layout switch (side by side, or stacked on a phone);
//  - the Scape workspace's tiles, facts box.
import { CHEM } from '../../data/waterchem';
import { KINDS, LIBRARY, isLimbWood, itemDims, variantInScope } from '../../scene/items';
import { footprint } from '../../scene/shape';
import { isSalt } from '../../scene/stockEdit';
import { getSpecies } from '../../data/species';
import { scapeSec } from '../../scene/itemEdit';
import { SUBSTRATES } from '../../art/placeholder';
import { aquariumOnly } from '../../scope';
import { volume } from '../../scene/physics';
import { categories, inUseItem, itemName } from './equipment';
import { galText, sitsOnSummary } from './tank';
import type { CameraSettings, ItemKind, TankSetup } from '../../scene/types';
import type { Store } from '../../scene/store';
import type { SectionId } from './sections';
import type { Tone } from './checks';

// ---------------------------------------------------------------------------------------------------------------- which sections
/** Rail sections that open a full-screen workspace (frame A) instead of the narrow side panel (WS3, 2026-11-17: Tank, Plants, Animals and Equipment join Scape; Preferences, Constraints, Discover, Print and Settings stay panels). */
export const WORKSPACES: readonly SectionId[] = ['scape', 'tank', 'plants', 'animals', 'equipment'];
export const isWorkspace = (id: SectionId | null): id is SectionId => !!id && WORKSPACES.includes(id);

/** Frame A on a screen at least 700 px wide: the live view left, the catalogue right. Below it the two stack (view strip over the grid). */
export const PHONE_MAX = 699;
export const workspaceLayout = (width: number): 'side' | 'stack' => (width <= PHONE_MAX ? 'stack' : 'side');

// ---------------------------------------------------------------------------------------------------------------- the visit
export interface Visit { snap: ReturnType<Store['snapshotAll']> }
/** Remember the design and its undo / redo history exactly as they are right now (the view and camera are not part of it). */
export const enterVisit = (store: Store): Visit => ({ snap: store.snapshotAll() });
/** Has anything changed since the visit began? (undo back to the entry point counts as unchanged.) */
export const visitDirty = (store: Store, v: Visit): boolean => store.mark !== v.snap.undo.length || JSON.stringify(store.scene) !== v.snap.scene;
/** Put the design back as it was on entry, and the undo / redo stacks with it: one click undoes the whole visit. */
export function revertVisit(store: Store, v: Visit): void {
  if (!visitDirty(store, v)) return;
  store.restoreAll(v.snap);
}

// ---------------------------------------------------------------------------------------------------------------- tiles
export type ScapeTab = 'stone' | 'wood' | 'cave' | 'ornament';
export const SCAPE_TABS: { id: ScapeTab; label: string }[] = [
  { id: 'stone', label: 'Stones' }, { id: 'wood', label: 'Wood' }, { id: 'cave', label: 'Caves' }, { id: 'ornament', label: 'Decor' },
];
export interface TilePill { text: string; tone: Tone }
export interface ScapeTile {
  id: string; label: string; kind: ItemKind;
  /** one line of facts (the first sentence of the hint, cut) */
  facts: string;
  /** the whole hint, for the tooltip */
  hint: string;
  pills: TilePill[];
  /** how many of this are placed */
  count: number;
  /** one line why this tile is flagged for the animals in this tank ('' = fine) */
  why: string;
  /** baked render path under public/ (TA1); the component falls back when it is missing */
  img: string;
}
export interface ScapeTileGroup { kind: ItemKind; label: string; tiles: ScapeTile[] }

/** Animals' pH preference, by species name: soft = preferred pH tops out under 7.2, hard = floor at 7.0 or more (as scene/materialTiers). */
export function waterNeeds(S: TankSetup): { soft: string[]; hard: string[] } {
  const soft = new Set<string>(), hard = new Set<string>();
  if (S.water.on && !isSalt(S)) for (const f of S.fish) {
    const c = CHEM[f.species]; if (!c) continue;
    const name = getSpecies(f.species)?.name ?? f.species;
    if (c.ph[1] < 7.2) soft.add(name);
    if (c.ph[0] >= 7.0) hard.add(name);
  }
  return { soft: [...soft], hard: [...hard] };
}
const names = (l: string[]) => l.length <= 2 ? l.join(' and ') : `${l.slice(0, 2).join(', ')} and ${l.length - 2} more`;
/** What a piece does to the water, and the flag it earns for THIS tank's animals. */
export function effectOf(S: TankSetup, variant: string): { pills: TilePill[]; why: string } {
  const v = LIBRARY[variant]; if (!v) return { pills: [], why: '' };
  const n = waterNeeds(S);
  if (v.hardens) {
    const why = n.soft.length ? `Your ${names(n.soft)} like soft water. This rock buffers pH and hardness up.` : '';
    return { pills: [{ text: 'Raises pH + hardness', tone: why ? 'warn' : 'neutral' }], why };
  }
  if (v.kind === 'wood' && isLimbWood(variant)) {
    const why = n.hard.length ? `Your ${names(n.hard)} need hard water. Wood tannins soften and acidify it.` : '';
    return { pills: [{ text: 'Tannins', tone: why ? 'warn' : 'accent' }], why };
  }
  return { pills: [{ text: 'Neutral', tone: 'ok' }], why: '' };
}
const oneLine = (hint: string, max = 64) => {
  const first = hint.split(/(?<=[.;:])\s/)[0].replace(/[.;:]$/, '');
  return first.length <= max ? first : first.slice(0, max - 1).replace(/[\s,]+\S*$/, '') + '…';
};
export const tileImg = (id: string) => `gallery/scape/${encodeURIComponent(id)}.webp`;

/** Tiles of the Hardscape and Decor library, grouped by kind. A search shows every kind that matches; with none, only the open tab. */
export function scapeTiles(S: TankSetup, tab: ScapeTab, q: string): { groups: ScapeTileGroup[]; shown: number; none: string } {
  const salt = isSalt(S), needle = q.trim().toLowerCase(), searching = !!needle;
  const have = new Map<string, number>(); for (const it of S.items) have.set(it.variant, (have.get(it.variant) ?? 0) + 1);
  const groups: ScapeTileGroup[] = [];
  for (const kind of Object.keys(KINDS) as ItemKind[]) {
    if (scapeSec(kind) !== 'hardscape' || (!searching && kind !== tab)) continue;
    const tiles = Object.entries(LIBRARY)
      .filter(([id, v]) => v.kind === kind && variantInScope(id) && (!v.salt || salt) && (!searching || `${v.label} ${v.hint} ${KINDS[kind]}`.toLowerCase().includes(needle)))
      .map(([id, v]): ScapeTile => { const e = effectOf(S, id); return { id, label: v.label, kind, facts: oneLine(v.hint), hint: v.hint, pills: e.pills, count: have.get(id) ?? 0, why: e.why, img: tileImg(id) }; })
      .sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0));
    if (tiles.length) groups.push({ kind, label: KINDS[kind], tiles });
  }
  const shown = groups.reduce((n, g) => n + g.tiles.length, 0);
  return { groups, shown, none: shown ? '' : searching ? `Nothing in Hardscape and Decor matches "${q.trim()}".` : 'Nothing to offer for this kind of setup.' };
}

// ---------------------------------------------------------------------------------------------------------------- facts box
export interface ScapeFacts {
  /** share of the floor the pieces cover, 0-100, and its text ("14 %") */
  cover: number; coverText: string;
  /** one line of what the pieces do to the water */
  chem: string;
  /** one flagged line per placed piece type that the animals dislike */
  flags: string[];
  /** placed pieces by variant, for the tray */
  tray: { id: string; label: string; n: number; kind: ItemKind }[];
  total: number;
}
export function scapeFacts(S: TankSetup): ScapeFacts {
  const hard = S.items.filter(it => scapeSec(it.kind) === 'hardscape');
  const area = footprint(S.tank).area || S.tank.L * S.tank.D;
  let on = 0; for (const it of hard) { const [w, , d] = itemDims(it); on += Math.PI / 4 * w * d; }
  const cover = Math.min(100, area > 0 ? on / area * 100 : 0);
  const by = new Map<string, number>(); for (const it of hard) by.set(it.variant, (by.get(it.variant) ?? 0) + 1);
  const up: string[] = [], down: string[] = [], flags: string[] = [];
  for (const id of by.keys()) {
    const v = LIBRARY[id], e = effectOf(S, id);
    if (v?.hardens) up.push(v.label); else if (v?.kind === 'wood' && isLimbWood(id)) down.push(v.label);
    if (e.why) flags.push(`${v.label}: ${e.why}`);
  }
  const chem = !S.water.on || isSalt(S) ? 'None you need to track' : [up.length ? `+ hardness (${up.join(', ')})` : '', down.length ? `− pH, tannins (${down.join(', ')})` : ''].filter(Boolean).join('; ') || 'None';
  return { cover, coverText: `${cover < 1 && hard.length ? '<1' : Math.round(cover)} %`, chem, flags, tray: [...by].map(([id, n]) => ({ id, label: LIBRARY[id]?.label ?? id, n, kind: LIBRARY[id]?.kind ?? 'stone' })), total: hard.length };
}

// ---------------------------------------------------------------------------------------------------------------- substrate section
export interface SubSwatch { id: string; label: string }
/** The swatches of the substrate section: bare bottom, the presets of this scope, then a custom blend. */
export function substrateSwatches(): { id: string; label: string; terra: boolean }[] {
  return Object.entries(SUBSTRATES).filter(([, t]) => !aquariumOnly() || !t.terra).map(([id, t]) => ({ id, label: t.label, terra: !!t.terra }));
}

/** Custom terrain is an either/or: the corner depths and slopes show when it is off, the grid controls when it is on, never both. */
export function terrainMode(on: boolean): { slopes: boolean; grid: boolean } { return { slopes: !on, grid: on }; }

// ---------------------------------------------------------------------------------------------------------------- WS3: Tank, Plants, Animals, Equipment
/** What a workspace's title bar says, by section. */
export const WS_META: Partial<Record<SectionId, { title: string; sub: string; count: (S: TankSetup) => string }>> = {
  tank: { title: 'Tank', sub: 'Model, water, stand, lid, background', count: S => galText(volume(S.tank).gallons) },
  plants: { title: 'Plants', sub: 'Pick plants, see growth over time', count: S => `${S.items.filter(it => it.kind === 'plant' || it.kind === 'coral' || it.kind === 'artificial').length} placed` },
  animals: { title: 'Animals', sub: 'Who lives here and how they fit', count: S => `${S.fish.length} animal${S.fish.length === 1 ? '' : 's'}` },
  equipment: { title: 'Equipment', sub: 'Filter, light, heater and the rest', count: S => `${categories(S).filter(c => inUseItem(S, c.id)).length} in use` },
};

export interface WsSide { sub: string; chips: { id: string; label: string; n: number }[]; lines: [string, string][]; empty: string }
/** The side column under the live view: what is in the tank for this section, as chips with counts and a few fact lines. */
export function wsSide(S: TankSetup, id: SectionId): WsSide {
  if (id === 'plants') {
    const by = new Map<string, number>(); for (const it of S.items) if (it.kind === 'plant' || it.kind === 'coral' || it.kind === 'artificial') by.set(it.variant, (by.get(it.variant) ?? 0) + 1);
    const n = [...by.values()].reduce((a, b) => a + b, 0);
    return { sub: n ? `${n} plant${n === 1 ? '' : 's'}` : '', chips: [...by].map(([v, c]) => ({ id: v, label: LIBRARY[v]?.label ?? v, n: c })), lines: [], empty: 'No plants yet. Pick one on the right to add it.' };
  }
  if (id === 'animals') {
    const by = new Map<string, number>(); for (const f of S.fish) by.set(f.species, (by.get(f.species) ?? 0) + 1);
    return { sub: S.fish.length ? `${S.fish.length} in all` : '', chips: [...by].map(([sp, c]) => ({ id: sp, label: getSpecies(sp)?.name ?? sp, n: c })), lines: [], empty: 'No animals yet. Pick one on the right to add it.' };
  }
  if (id === 'equipment') {
    const used = categories(S).map(c => ({ c, it: inUseItem(S, c.id) })).filter(x => x.it);
    return { sub: '', chips: [], lines: used.map(({ c, it }) => [c.label, itemName(c.id, it!)] as [string, string]), empty: 'No gear chosen yet.' };
  }
  const T = S.tank;
  return { sub: '', chips: [], lines: [['Volume', galText(volume(T).gallons)], ['Sits on', sitsOnSummary(S, 'in')], ['Water', S.water.on ? (isSalt(S) ? 'Saltwater' : 'Freshwater') : 'No water']], empty: '' };
}

/** A workspace opens framed on the tank, not the room: a camera that is zoomed out (zoom under 1) goes back to 1; orbit and distance are kept. Null = already fine. */
export function tankFraming(c: CameraSettings): Partial<CameraSettings> | null { return c.zoom < 1 ? { zoom: 1 } : null; }
