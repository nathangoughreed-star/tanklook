// UI2 shell step 7 (lane S7, 2026-11-14): the Scape section's view-models and edits (screen map §2a row "Section Scape"):
// Substrate (type, blend, slopes, roughness, leaf litter), Terrain (slopes and corners, custom grid, pools), the Hardscape and Decor
// library with search, placed pieces (select, remove, Keep), the piece editor and the brush / group bars. No DOM. Engine calls go
// ONLY through P3's scene/itemEdit.ts and the existing scene modules; the substrate / terrain edits are the old panel's, moved here
// unchanged in behaviour (ui/panels.ts "Substrate" and "Custom terrain" blocks).
import { GRAIN_LOOK, SUBSTRATES } from '../../art/placeholder';
import { BLEND_PRESETS, addGrain, nextBlendSeed, removeGrain, setShare } from '../../scene/blend';
import { isClump, isFloat, isPatch, growthOf, type PlantType } from '../../art/plants';
import { clumpAuto } from '../../render/plant3d';
import { itemLights } from '../../scene/lightcheck';
import { KINDS, LIBRARY, LIFT_SINK, clampItem, hasSpread, itemDims, spreadMax, variantInScope } from '../../scene/items';
import * as IE from '../../scene/itemEdit';
import { HS_LABEL, ROCK_GEN, WOOD_GEN, colours, hsFields, hsv, seedName } from '../../scene/hardgen';
import { type ScapeSec, scapeSec } from '../../scene/itemEdit';
import { isLocked, lockObject, unlockObject } from '../../scene/locks';
import { IN, fmtLen } from '../../scene/physics';
import { NEW_POOL, sampleTerrain } from '../../scene/terrain';
import { isSalt } from '../../scene/stockEdit';
import { aquariumOnly } from '../../scope';
import { BRUSHES, brushDef, isPlantBrush, plantBrushes } from '../../scene/brush';
import { COPY_DEFAULTS, copyGroup, groupSize, removeGroup, scaleGroup, turnGroup, type Group } from '../../scene/duplicate';
import { MAX_ITEMS } from '../../scene/items';
import { LIMITS } from '../../scene/validate';
import { roughOf, type Item, type ItemKind, type TankSetup, type Units } from '../../scene/types';
import type { Store } from '../../scene/store';

export { scapeSec, type ScapeSec };

// ---------------------------------------------------------------------------------------------------------------- substrate
export interface SubOption { id: string; label: string }
export interface SubstrateView {
  /** 'bare' = bare-bottom glass (substrate.show off; the last type is kept for when it comes back) */
  type: string;
  groups: { label: string; options: SubOption[] }[];
  custom: boolean;
  rough: number;
  roughText: string;
  /** corner depths in mm, front-left, front-right, back-left, back-right */
  corners: { key: 'fl' | 'fr' | 'bl' | 'br'; label: string; mm: number; text: string }[];
  slopes: { id: string; label: string; active: boolean }[];
  litter: { leaf: string; density: number; on: boolean };
  summary: string;
}
/** Slope presets: corner depths in inches (the old panel's four buttons). */
export const SLOPES: { id: string; label: string; d: [number, number, number, number] }[] = [
  { id: 'level', label: 'Level', d: [2, 2, 2, 2] },
  { id: 'fb', label: 'Front to back', d: [1, 1, 3, 3] },
  { id: 'lr', label: 'Left to right', d: [1, 3, 1, 3] },
  { id: 'corner', label: 'Back-left corner', d: [1, 1, 4, 1] },
];
export const LEAVES: [string, string][] = [['mixed', 'Mixed leaves'], ['oak', 'Oak'], ['magnolia', 'Magnolia'], ['catappa', 'Indian almond (catappa)']];
export const GRAINS = Object.entries(GRAIN_LOOK).map(([id, g]) => ({ id, label: g.label }));

const subOptions = (terra: boolean): SubOption[] => Object.entries(SUBSTRATES).filter(([, t]) => !!t.terra === terra).map(([id, t]) => ({ id, label: t.label }));
const slopeOf = (s: TankSetup, d: [number, number, number, number]) => {
  const max = s.tank.H * 0.5, c = (v: number) => Math.min(v * IN, max), q = s.substrate;
  return Math.abs(q.fl - c(d[0])) < 0.5 && Math.abs(q.fr - c(d[1])) < 0.5 && Math.abs(q.bl - c(d[2])) < 0.5 && Math.abs(q.br - c(d[3])) < 0.5;
};
export function substrateView(s: TankSetup, units: Units): SubstrateView {
  const q = s.substrate, type = q.show ? q.type : 'bare';
  const groups = [{ label: 'Aquarium', options: subOptions(false) }, ...(aquariumOnly() ? [] : [{ label: 'Terrarium', options: subOptions(true) }])];
  const label = type === 'bare' ? 'Bare bottom' : type === 'custom' ? 'Custom blend' : SUBSTRATES[type as keyof typeof SUBSTRATES]?.label ?? type;
  const corners = ([['fl', 'Front left'], ['fr', 'Front right'], ['bl', 'Back left'], ['br', 'Back right']] as const).map(([key, l]) => ({ key, label: l, mm: q[key], text: fmtLen(q[key], units) }));
  const l = q.litter;
  return {
    type, groups, custom: type === 'custom', rough: roughOf(q), roughText: `${Math.round(roughOf(q))} %`, corners,
    slopes: SLOPES.map(x => ({ id: x.id, label: x.label, active: q.show && slopeOf(s, x.d) })),
    litter: { leaf: l?.leaf ?? 'mixed', density: l?.density ?? 0, on: !!l?.density },
    summary: label,
  };
}
type Sub = TankSetup['substrate'];
/** The type pick: 'bare' turns the substrate off (and custom terrain with it, its grid kept for when it comes back). */
export function setSubstrateType(store: Store, v: string): void {
  const bare = v === 'bare';
  store.edit(s => { s.substrate.show = !bare; if (!bare) s.substrate.type = v as Sub['type']; if (bare) s.terrain.on = false; });
}
export const setRough = (store: Store, v: number) => store.edit(s => { s.substrate.rough = v; }, { coalesce: 'subRoughness' });
export const setCorner = (store: Store, k: 'fl' | 'fr' | 'bl' | 'br', mm: number) => store.edit(s => { s.substrate[k] = mm; }, { coalesce: 'sub' + k });
export function slopePreset(store: Store, id: string): void {
  const p = SLOPES.find(x => x.id === id); if (!p) return;
  store.edit(s => {
    const max = s.tank.H * 0.5, c = (v: number) => Math.min(v * IN, max);
    Object.assign(s.substrate, { show: true, fl: c(p.d[0]), fr: c(p.d[1]), bl: c(p.d[2]), br: c(p.d[3]) });
  });
}
/** Custom blend (GB1): an ordered list of 1-5 grains, each with a colour and a share (summing to 100), and how mixed they are. */
export function setBlendGrain(store: Store, i: number, v: string): void {
  store.edit(s => { const g = s.substrate.custom.grains[i]; if (g) { g.grain = v as typeof g.grain; delete s.substrate.custom.preset; } }, { coalesce: 'blendGrain' + i });
}
export function setBlendColor(store: Store, i: number, v: string): void {
  store.edit(s => { const g = s.substrate.custom.grains[i]; if (g) { g.color = v; delete s.substrate.custom.preset; } }, { coalesce: 'blendColor' + i });
}
/** One grain's share; the others are scaled to fill the rest. */
export function setBlendShare(store: Store, i: number, v: number): void {
  store.edit(s => { const c = s.substrate.custom; c.grains = setShare(c.grains, i, v); delete c.preset; }, { coalesce: 'blendShare' + i });
}
export const setBlendMix = (store: Store, v: number) => store.edit(s => { s.substrate.custom.mix = v / 100; delete s.substrate.custom.preset; }, { coalesce: 'blendMix' });
/** SB1: pick a blend preset (clown puke...): the substrate becomes the custom blend with these grains. */
export function setBlendPreset(store: Store, name: string): void {
  const b = BLEND_PRESETS[name]; if (!b) return;
  store.edit(s => { s.substrate.show = true; s.substrate.type = 'custom'; s.substrate.custom = JSON.parse(JSON.stringify(b)); });
}
/** SB1: the user's own price per lb for the chosen product (null clears it back to the sourced guess). */
export const setPriceLb = (store: Store, v: number | null) => store.edit(s => { if (v == null || !Number.isFinite(v) || v < 0) delete s.substrate.priceLb; else s.substrate.priceLb = Math.round(Math.min(500, v) * 100) / 100; }, { coalesce: 'subPriceLb' });
/** Shuffle: the same grains, colours, shares and mix laid out afresh. */
export const shuffleBlend = (store: Store) => store.edit(s => { const c = s.substrate.custom; c.seed = nextBlendSeed(c); });
export const addBlendGrain = (store: Store) => store.edit(s => { const c = s.substrate.custom; c.grains = addGrain(c.grains); delete c.preset; });
export const removeBlendGrain = (store: Store, i: number) => store.edit(s => { const c = s.substrate.custom; c.grains = removeGrain(c.grains, i); delete c.preset; });
const litterOf = (s: TankSetup) => (s.substrate.litter ??= { leaf: 'mixed', density: 0, seed: 1 });
export const setLitterLeaf = (store: Store, leaf: string) => store.edit(s => { const l = litterOf(s); l.leaf = leaf as typeof l.leaf; if (!l.density) l.density = 40; });
export const setLitterDensity = (store: Store, v: number) => store.edit(s => { litterOf(s).density = v; }, { coalesce: 'litDens' });
export const shuffleLitter = (store: Store) => store.edit(s => { const l = litterOf(s); l.seed = l.seed % 999999 + 1; if (!l.density) l.density = 40; });

// ---------------------------------------------------------------------------------------------------------------- terrain
export interface TerrainView {
  on: boolean; cols: number; colsText: string; hasGrid: boolean; pools: number; pool: number;
  poolFields: { key: 'x' | 'd' | 'rx' | 'rd' | 'bank'; label: string; value: number; min: number; max: number; text: string }[];
  summary: string; radial: boolean;
}
const pct = (v: number) => `${(v * 100).toFixed(0)} %`;
export function terrainView(s: TankSetup, poolIx: number): TerrainView {
  const t = s.terrain, n = t.pools?.length ?? 0, k = Math.max(0, Math.min(poolIx, n - 1)), p = t.pools?.[k];
  const f = (key: 'x' | 'd' | 'rx' | 'rd' | 'bank', label: string, min: number, max: number) => ({ key, label, value: p ? p[key] * 100 : 0, min, max, text: p ? pct(p[key]) : '' });
  return {
    on: t.on, cols: t.cols, colsText: `${t.cols} points across`, hasGrid: t.h.length > 0, pools: n, pool: k, radial: !!t.radial,
    poolFields: p ? [f('x', 'Left / right', 0, 100), f('d', 'Front / back', 0, 100), f('rx', 'Width', 2, 50), f('rd', 'Length', 2, 50), f('bank', 'Bank', 5, 100)] : [],
    summary: t.on ? `custom${n ? `, ${n} pool${n > 1 ? 's' : ''}` : ''}` : 'slopes',
  };
}
/** Custom terrain on / off (on starts from the floor you see; a grid kept from before is reused). */
export function setTerrainOn(store: Store, on: boolean): void {
  store.edit(s => {
    if (on && !s.terrain.h.length) s.terrain = sampleTerrain(s, s.tank, s.terrain.cols);
    s.terrain.on = on;
    if (on) s.substrate.show = true; // shaped ground on a bare bottom: bring back the last substrate type
  });
}
export const setTerrainCols = (store: Store, cols: number) => store.edit(s => {
  if (cols === s.terrain.cols && s.terrain.h.length) return;
  s.terrain = sampleTerrain(s, s.tank, cols); // resample the current surface, so shaping survives a grid change
}, { coalesce: 'terCols' });
export const flattenTerrain = (store: Store) => store.edit(s => {
  const t = s.terrain, avg = t.h.reduce((a, v) => a + v, 0) / Math.max(1, t.h.length);
  t.h = t.h.map(() => +avg.toFixed(1));
});
export const addPool = (store: Store) => store.edit(s => { (s.terrain.pools ??= []).push({ ...NEW_POOL }); s.substrate.show = true; });
export const removePool = (store: Store, k: number) => store.edit(s => { s.terrain.pools?.splice(k, 1); });
export const setPoolField = (store: Store, k: number, f: 'x' | 'd' | 'rx' | 'rd' | 'bank', pctValue: number) => store.edit(s => {
  const p = s.terrain.pools?.[k]; if (p) p[f] = Math.round(pctValue * 100) / 1e4;
}, { coalesce: 'pool' + f });

// ---------------------------------------------------------------------------------------------------------------- library
export interface LibChip { id: string; label: string; hint: string; salt: boolean; /** one line why it is greyed ('' = suits) */ why: string }
export interface LibRow { kind: ItemKind; label: string; chips: LibChip[] }
export interface LibraryView { rows: LibRow[]; shown: number; none: string; }
/** The kinds of a menu, in the old order. */
export const kindsOf = (sec: ScapeSec): ItemKind[] => (Object.keys(KINDS) as ItemKind[]).filter(k => scapeSec(k) === sec);
/** Library rows of one menu: only what the setup offers (corals in saltwater only, terrarium pieces out of aquarium-only scope), narrowed by the search.
 *  `why` (variant -> reason) greys chips (the plant gate); it is advice, a greyed chip can still be added. */
export function libraryView(s: TankSetup, sec: ScapeSec, q: string, why: Map<string, string> = new Map()): LibraryView {
  const salt = isSalt(s), needle = q.trim().toLowerCase();
  const rows: LibRow[] = [];
  for (const k of kindsOf(sec)) {
    if (k === 'coral' && !salt) continue; // live rock and corals show in a saltwater tank only
    const chips = Object.entries(LIBRARY).filter(([id, v]) => v.kind === k && variantInScope(id) && (!v.salt || salt) && (!needle || `${v.label} ${v.hint} ${KINDS[k]}`.toLowerCase().includes(needle)))
      .map(([id, v]) => ({ id, label: v.label, hint: v.hint, salt: !!v.salt, why: why.get(id) ?? '' }))
      // greyed ones sink below the rest of their row, as in the old gate
      .sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0));
    if (chips.length) rows.push({ kind: k, label: KINDS[k], chips });
  }
  const shown = rows.reduce((n, r) => n + r.chips.length, 0);
  return { rows, shown, none: shown ? '' : needle ? `Nothing in ${sec === 'plants' ? 'Plants' : 'Hardscape and Decor'} matches "${q.trim()}".` : 'Nothing to offer for this kind of setup.' };
}

// ---------------------------------------------------------------------------------------------------------------- placed pieces
export const KEEP_PROPS: readonly string[] = ['look', 'size', 'pose', 'other']; // as Discover's "Keep this": a piece keeps what it is but may move
export const isKept = (T: TankSetup, it: Item) => !!it.uid && isLocked(T, it.uid);
export const growthWord = (g: number) => `${Math.round(g * 100)} % ${g < 0.1 ? 'just planted' : g < 0.35 ? 'growing in' : g < 0.65 ? 'established' : g < 0.9 ? 'grown' : 'overgrown'}`;
const groupName = (it: Item) => `${LIBRARY[it.variant]?.label ?? it.variant}${it.kind === 'plant' && isClump(it.variant) ? ' cluster' : ''}`;
export const pieceName = (s: TankSetup, it: Item) => `${groupName(it)} ${s.items.filter(q => q.variant === it.variant && q.id <= it.id).length}`;
export interface PieceRow { id: number; name: string; note: string; kept: boolean; selected: boolean }
export interface PlacedGroup { variant: string; name: string; rows: PieceRow[]; open: boolean }
export interface PlacedView { total: number; count: string; groups: PlacedGroup[]; empty: string }
/** Placed pieces of a menu, grouped by variant (a species with one piece shows that piece's row alone). `open` = groups the caller opened. */
export function placedView(s: TankSetup, sec: ScapeSec, selId: number | null, open: Set<string>): PlacedView {
  const its = s.items.filter(it => scapeSec(it.kind) === sec), by = new Map<string, Item[]>();
  for (const it of its) { const g = by.get(it.variant); if (g) g.push(it); else by.set(it.variant, [it]); }
  const row = (it: Item): PieceRow => ({ id: it.id, name: pieceName(s, it), note: it.kind === 'plant' ? growthWord(it.growth ?? growthOf(it.variant as PlantType, it.size)) : '', kept: isKept(s, it), selected: it.id === selId });
  const groups = [...by].map(([variant, list]) => ({ variant, name: groupName(list[0]), rows: list.map(row), open: open.has(variant) || list.some(it => it.id === selId) }));
  const nk = (k: ItemKind) => its.filter(q => q.kind === k).length;
  const ks = kindsOf(sec).filter(nk);
  return {
    total: its.length, groups,
    count: ks.map(k => `${nk(k)} ${nk(k) === 1 && k !== 'wood' ? KINDS[k].toLowerCase().replace(/s$/, '') : KINDS[k].toLowerCase()}`).join(', '),
    empty: sec === 'plants' ? 'No plants yet. Pick one below to add it.' : 'Nothing placed yet. Pick one below to add it.',
  };
}

// edits (each is one store edit, as the old panel did; the caller draws ids and seeds)
const seedNow = () => 1 + Math.floor(Math.random() * 1e9);
export function addPiece(store: Store, variant: string): number | null {
  if (!LIBRARY[variant]) return null;
  if (store.tank.items.length >= MAX_ITEMS) return null;
  const id = store.nextItemId(), seed = seedNow();
  store.edit(s => { IE.addItem(s, variant, id, seed); });
  store.selectItem(id);
  return id;
}
export function removePiece(store: Store, id: number): void {
  store.edit(s => { IE.removeItem(s, id); });
  if (store.selectedItem?.id === id) store.selectItem(null);
}
export function duplicatePiece(store: Store, src: number): void {
  const id = store.nextItemId();
  store.edit(s => { IE.duplicateItem(s, src, id); });
  store.selectItem(id);
}
/** Remove all: that menu's pieces only. */
export function clearPieces(store: Store, sec: ScapeSec): void { store.selectItem(null); store.edit(s => { IE.clearSection(s, sec); }); }
export function toggleKeep(store: Store, id: number): boolean {
  const it = store.tank.items.find(q => q.id === id); if (!it?.uid) return false;
  const uid = it.uid, on = !isLocked(store.tank, uid);
  store.edit(s => { if (on) lockObject(s, uid, [...KEEP_PROPS]); else unlockObject(s, uid); });
  return on;
}
export const reshapePiece = (store: Store, id: number) => { const seed = seedNow(); store.edit(s => IE.editItem(s, id, it => IE.reshape(it, seed))); };
export const colourPiece = (store: Store, id: number, col: number | null) => store.edit(s => IE.editItem(s, id, it => IE.setColour(it, col)));
export const typePiece = (store: Store, id: number, variant: string) => store.edit(s => IE.editItem(s, id, (it, t) => IE.setType(it, variant, t)));
export const resetLookPiece = (store: Store, id: number) => store.edit(s => IE.editItem(s, id, it => IE.resetLook(it)));
export const dropPiece = (store: Store, id: number) => store.edit(s => IE.editItem(s, id, it => IE.dropToGround(it)));
export const nudgePiece = (store: Store, id: number, axis: 'x' | 'y' | 'd', dir: number, step: number) =>
  store.edit(s => IE.editItem(s, id, (it, t) => IE.nudge(it, t, axis, dir, step)), { coalesce: 'nudge' });

// ---------------------------------------------------------------------------------------------------------------- the piece editor
export interface Field { id: string; label: string; title: string; min: number; max: number; step: number; value: number; text: string }
export interface PieceView {
  id: number; name: string; dims: string; kind: ItemKind; plant: boolean; kept: boolean; light: string;
  fields: Field[]; nudge: boolean;
  /** HG1: a generated stone or wood: its seed, the types it can switch to, its colour swatches, its look sliders */
  gen: null | { variant: string; seed: string; types: { id: string; label: string }[]; swatches: { i: number; label: string; hex: string; on: boolean }[]; look: Field[]; changed: boolean };
}
/** The sliders one piece shows (the old item box, by kind): size or growth, clump spread / stems, floater spread / density, yaw, pitch, roll, raise, and left-right / front-back for decor. */
export function pieceView(s: TankSetup, it: Item, units: Units): PieceView {
  const A = s.tank, v = LIBRARY[it.variant], [l, h, w] = itemDims(it), fmt = (mm: number) => fmtLen(mm, units);
  const plant = it.kind === 'plant', clump = plant && isClump(it.variant), float = plant && isFloat(it.variant);
  const f = (id: string, label: string, title: string, min: number, max: number, value: number, text: string, step = 1): Field => ({ id, label, title, min, max, step, value, text });
  const fields: Field[] = [];
  if (plant) {
    const g = it.growth ?? growthOf(it.variant as PlantType, it.size);
    fields.push(f('iGrowth', 'Growth', 'From just planted to fully grown. How big and how dense it gets depends on the species.', 0, 100, Math.round(g * 100), growthWord(g)));
  } else {
    const label = it.kind === 'artificial' ? (v.fake?.form === 'mat' ? 'Width' : 'Height') : it.variant === 'manzanita' ? 'Height' : it.kind === 'coral' ? 'Width' : 'Length';
    const probe = { ...it, size: 1e6 }; clampItem(probe, A);
    fields.push(f('iSize', label, 'How big it is', Math.min(v.min, probe.size), probe.size, it.size, fmt(it.size)));
  }
  if (plant && (clump || float) && hasSpread(it.variant)) {
    const auto = clump ? clumpAuto(it.variant as PlantType, it.seed, it.size).spread : Math.round(itemDims({ ...it, spread: undefined, growth: 1 })[0]), sp = it.spread ?? auto;
    fields.push(f('iSpread', 'Spread', 'Across the circle its stems start in. What would land past the glass grows inside it.', 10, Math.max(sp, spreadMax(A, it.x, it.depth)), sp, fmt(sp) + (it.spread == null ? ' auto' : '')));
  }
  if (clump) { const n = it.stems ?? clumpAuto(it.variant as PlantType, it.seed, it.size).stems; fields.push(f('iStems', 'Stems', 'How many stems (or crowns) this one plant has.', 1, 40, n, n + (it.stems == null ? ' auto' : ''))); }
  if (float) { const d = it.dens ?? 1; fields.push(f('iDens', 'Density', 'How thickly it covers the water, against the species\' own.', 10, 300, Math.round(d * 100), Math.round(d * 100) + '%' + (it.dens == null ? ' auto' : ''), 5)); }
  fields.push(f('iYaw', 'Turn', 'Turn about the vertical', -180, 180, it.yaw, `${it.yaw}°`), f('iPitch', 'Tip', 'Tip forward or back', -90, 90, it.pitch, `${it.pitch}°`), f('iTilt', 'Roll', 'Lean sideways, all the way over', -180, 180, it.tilt, `${it.tilt}°`));
  fields.push(f('iLift', 'Raise', 'Raise it above the ground (0 = sitting on it)', -Math.round(A.H * LIFT_SINK), Math.round(A.H), Math.round(it.lift),
    Math.abs(it.lift) < 1 ? 'On the ground' : it.lift < 0 ? fmt(-it.lift) + ' in' : fmt(it.lift)));
  if (it.kind === 'ornament') fields.push(f('iX', 'Left / right', 'Slide it left or right in the tank', 0, Math.round(A.L), Math.round(it.x), fmt(it.x)), f('iDepth', 'Front / back', 'Slide it toward the front glass or the back wall', 0, Math.round(A.D), Math.round(it.depth), fmt(it.depth)));
  const fam = it.kind === 'wood' ? WOOD_GEN : it.kind === 'stone' ? ROCK_GEN : null, gen = fam?.has(it.variant) ? {
    variant: it.variant, seed: seedName(it.seed), changed: !!it.hs,
    types: [...fam].filter(variantInScope).map(id => ({ id, label: LIBRARY[id].label })),
    swatches: colours(it.variant).map((c, i) => ({ i, label: c.label, hex: c.hex, on: it.hs?.col === i })),
    look: hsFields(it.variant).map(k => { const v = Math.round(hsv(it.hs, k) * 100); return f(`h_${k}`, HS_LABEL[k][0], HS_LABEL[k][1], 0, 100, v, it.hs?.[k] == null ? 'its own' : v === 50 ? 'its own' : `${v > 50 ? '+' : ''}${v - 50}`); }),
  } : null;
  const lt = plant || it.kind === 'coral' ? itemLights(s)?.get(it.id) : undefined;
  return { id: it.id, name: v?.label ?? it.variant, dims: `${fmt(l)} × ${fmt(h)} high × ${fmt(w)}`, kind: it.kind, plant, kept: isKept(s, it), nudge: !plant,
    light: lt ? `Light here: ${Math.round(lt.par)} PAR${lt.outcome.state === 'thrive' ? ', fine' : `. ${lt.outcome.text}`}` : '', fields, gen };
}
/** One slider's edit (value as the control reads it), through P3's ITEM_FIELDS. */
export function setField(store: Store, id: number, field: string, v: number): void {
  const fn = IE.ITEM_FIELDS[field]; if (!fn) return;
  store.edit(s => IE.editItem(s, id, (it, t) => fn(it, v, t)), { coalesce: field });
}
export const isPatchVariant = isPatch;

// ---------------------------------------------------------------------------------------------------------------- brush and group bars
export interface BrushView {
  on: boolean; erase: boolean; single: boolean; target: number | null; id: string; label: string; size: number; sizeMin: number; sizeMax: number; sizeText: string;
  density: number; densityText: string; leaf: string; showLeaf: boolean;
  groups: { label: string; options: SubOption[] }[];
}
export function brushView(store: Store, units: Units): BrushView {
  const B = store.brush, def = brushDef(B.id);
  return {
    on: B.on, erase: B.erase, single: !!B.single, target: B.target ?? null, id: B.id, label: def.label, size: B.size, sizeMin: def.radius[0], sizeMax: def.radius[1], sizeText: fmtLen(B.size, units),
    density: B.density, densityText: `${B.density}%`, leaf: B.leaf, showLeaf: B.id === 'leaf',
    groups: [{ label: 'Ground', options: BRUSHES.map(b => ({ id: b.id, label: b.label })) }, { label: 'Plants', options: plantBrushes().map(b => ({ id: b.id, label: b.label })) }],
  };
}
export const brushOn = (store: Store, on: boolean) => store.setBrush({ on, target: null });
export function pickBrush(store: Store, id: string): void {
  const d = brushDef(id as never);
  store.setBrush({ id: id as never, erase: false, size: Math.min(d.radius[1], Math.max(d.radius[0], store.brush.size)) });
}
export const brushIsPlant = isPlantBrush;

export interface GroupBarView { show: boolean; text: string; n: number }
export function groupBarView(g: Group): GroupBarView {
  const a = g.fish.length, b = g.items.length, c = g.patches?.length ?? 0, n = groupSize(g);
  const text = [a && `${a} animal${a > 1 ? 's' : ''}`, b && `${b} piece${b > 1 ? 's' : ''}`, c && `${c} patch${c > 1 ? 'es' : ''}`].filter(Boolean).join(' + ');
  return { show: n >= 2 || !!c, text: text || 'Nothing selected', n };
}
export const groupTurn = (store: Store, deg: number) => { const g = store.group; store.edit(t => turnGroup(t, g, deg), { coalesce: 'grp-turn' }); };
export const groupSizeBy = (store: Store, k: number) => { const g = store.group; store.edit(t => scaleGroup(t, g, k), { coalesce: 'grp-size' }); };
export const groupDelete = (store: Store) => { const g = store.group; store.edit(t => removeGroup(t, g)); store.select(null); };
/** Duplicate the group beside itself (one copy). `support` lifts a copy onto what is under it (the viewer's, null in tests). Returns the new group or null. */
export function groupDuplicate(store: Store, support?: (t: TankSetup, x: number, d: number, skip: Set<number>) => number): { why: string } | { made: Group } {
  const g = store.group;
  if ((g.fish.length && store.tank.fish.length >= LIMITS.maxFish) || (g.items.length && store.tank.items.length >= MAX_ITEMS)) return { why: `A tank holds at most ${LIMITS.maxFish} animals and ${MAX_ITEMS} pieces.` };
  const seed = seedNow(), ids = { fish: store.nextId(), item: store.nextItemId() };
  let made: Group = { fish: [], items: [], patches: [] };
  store.edit(t => {
    const m = copyGroup(t, g, { ...COPY_DEFAULTS, n: 1, seed, ...(support ? { support: (x: number, d: number, skip: Set<number>) => support(t, x, d, skip) } : {}) } as never, ids);
    if (!groupSize(made)) made = m;
  });
  if (!groupSize(made)) return { why: 'Nothing to copy.' };
  store.selectGroup(made);
  return { made };
}
