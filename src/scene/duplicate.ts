// Groups (lane MS, 2026-10-16): a selection of animals and aquascape pieces acted on as one. Move, turn, resize and delete
// keep the pieces' layout relative to each other; copyGroup places N copies in a row, grid or cloud with a seeded jitter
// in angle, scale and spacing, so repeats do not look cloned. Everything here is a plain edit of a tank, so it is one undo
// step, saves with the scene and (the jitter being applied once, then stored as positions) needs no new field.
import { fishTL, getSpecies, speciesOf } from '../data/species';
import { rng } from '../art/paint';
import { D2R, backdropDepth, clamp, clampFish } from './physics';
import { MAX_ITEMS, clampItem, itemDims } from './items';
import { placeNew } from './scatter';
import { fitFish } from './water';
import { groundHeight } from './terrain';
import { LIMITS } from './validate';
import type { Fish, Item, TankSetup } from './types';

/** The ids of a selection, per kind (the two id spaces are separate). */
export interface Group { fish: number[]; items: number[] }
export const groupSize = (g: Group) => g.fish.length + g.items.length;

/** The members that still exist in this tank. */
export function members(S: TankSetup, g: Group) {
  const fi = new Set(g.fish), ii = new Set(g.items);
  return { fish: S.fish.filter(f => fi.has(f.id)), items: S.items.filter(it => ii.has(it.id)) };
}

/** Footprint centre and size of a group (x / depth, mm): its fish by body length, its pieces by their own size. */
export function groupBox(S: TankSetup, g: Group) {
  const m = members(S, g);
  let x0 = Infinity, x1 = -Infinity, d0 = Infinity, d1 = -Infinity;
  const take = (x: number, d: number, rx: number, rd: number) => { x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); d0 = Math.min(d0, d - rd); d1 = Math.max(d1, d + rd); };
  for (const f of m.fish) { const sp = speciesOf(f), r = sp ? fishTL(f, sp) / 2 : 20; take(f.x, f.depth, r, r * 0.5); }
  for (const it of m.items) { const [l, , w] = itemDims(it), r = it.kind === 'plant' ? Math.max(l, w) / 2 : Math.max(l, w) / 2; take(it.x, it.depth, r, r); }
  if (x0 === Infinity) return null;
  return { cx: (x0 + x1) / 2, cd: (d0 + d1) / 2, w: x1 - x0, d: d1 - d0 };
}

/** Mean x / depth / height of the members' anchors: the point turns and resizes are about. */
export function groupCentre(S: TankSetup, g: Group) {
  const m = members(S, g), n = m.fish.length + m.items.length; if (!n) return null;
  let x = 0, d = 0, y = 0;
  for (const f of m.fish) { x += f.x; d += f.depth; y += f.y; }
  for (const it of m.items) { x += it.x; d += it.depth; y += groundHeight(S, S.tank, it.x, it.depth) + it.lift; }
  return { x: x / n, depth: d / n, y: y / n };
}

/** Settle one animal after a change (inside the glass and the water; clinging animals stay on their surface). */
export function settleFish(S: TankSetup, f: Fish) {
  clampFish(f, S.tank, backdropDepth(S.backdrop, S.tank), S.render.bgSides);
  if (S.water.on) fitFish(f, S);
}

/** Every member moved by (dx, dd) mm across the tank (animals also up by dy). Pieces keep their height above the ground (a plant on a rock
 *  stays with the rock because both move); animals keep theirs. */
export function moveGroup(S: TankSetup, g: Group, dx: number, dd: number, dy = 0) {
  const m = members(S, g);
  for (const f of m.fish) { f.x += dx; f.depth += dd; f.y += dy; settleFish(S, f); }
  for (const it of m.items) { it.x += dx; it.depth += dd; clampItem(it, S.tank, S); }
}

/** Turn the whole group `deg` degrees about its centre (positions and headings together, the same way a piece's yaw
 *  turns: a quarter turn puts what was on the right at the back). Animals on the glass keep their heading there. */
export function turnGroup(S: TankSetup, g: Group, deg: number) {
  const c = groupCentre(S, g); if (!c) return;
  const m = members(S, g), co = Math.cos(deg * D2R), si = Math.sin(deg * D2R);
  const spin = (o: { x: number; depth: number }) => {
    const dx = o.x - c.x, dz = -(o.depth - c.depth);
    o.x = c.x + dx * co + dz * si; o.depth = c.depth - (-dx * si + dz * co);
  };
  for (const f of m.fish) { spin(f); if (f.surface !== 'glass') f.yaw = wrap(f.yaw + deg); settleFish(S, f); }
  for (const it of m.items) { spin(it); it.yaw = wrap(it.yaw + deg); clampItem(it, S.tank, S); }
}

/** Resize the whole group by `k` about its centre: pieces and animals grow or shrink and their spacing with them. */
export function scaleGroup(S: TankSetup, g: Group, k: number) {
  const c = groupCentre(S, g); if (!c) return;
  const m = members(S, g);
  for (const f of m.fish) { f.x = c.x + (f.x - c.x) * k; f.depth = c.depth + (f.depth - c.depth) * k; f.y = c.y + (f.y - c.y) * k; sizeFish(f, k); settleFish(S, f); }
  for (const it of m.items) {
    it.x = c.x + (it.x - c.x) * k; it.depth = c.depth + (it.depth - c.depth) * k;
    it.size = Math.round(it.size * k); if (it.spread != null) it.spread = Math.round(it.spread * k);
    it.lift = Math.round(it.lift * k); clampItem(it, S.tank, S);
  }
}

/** Remove the members from the tank. */
export function removeGroup(S: TankSetup, g: Group) {
  const fi = new Set(g.fish), ii = new Set(g.items);
  S.fish = S.fish.filter(f => !fi.has(f.id)); S.items = S.items.filter(it => !ii.has(it.id));
}

const wrap = (a: number) => Math.round(((a + 540) % 360) - 180);

/** An animal's length times `k`, kept within 15-130 % of its adult length (the range Shuffle draws from). */
function sizeFish(f: Fish, k: number) {
  const sp = speciesOf(f); if (!sp) return;
  const adult = fishTL({ sex: f.sex }, sp), tl = Math.round(clamp(fishTL(f, sp) * k, adult * 0.15, adult * 1.3));
  if (tl === adult) delete f.tl; else f.tl = tl;
}

export interface CopyOpts {
  /** How many copies of the whole selection (1 = a plain duplicate). */
  n: number;
  /** Random jitter amounts: angle +/- degrees, scale +/- percent, spacing +/- percent of the step between copies. 0 = none. */
  angle: number; scale: number; spacing: number;
  /** Seed of the jitter (the same seed, the same layout). */
  seed: number;
  /** Give each copied piece a new shape seed, so copies of a plant or rock are not identical. */
  reshape: boolean;
  /** Height of the highest solid piece (not one in `skip`) over the ground at (x, depth), mm; absent = copies sit on the ground. */
  support?: (x: number, depth: number, skip: Set<number>) => number;
}
export const COPY_DEFAULTS: Omit<CopyOpts, 'seed' | 'support'> = { n: 1, angle: 0, scale: 0, spacing: 0, reshape: false };
export const MAX_COPIES = 50;

/**
 * Add `o.n` copies of the group. `ids` = the first free animal and piece id (free in every edited tank). Pieces go in a
 * row beside the group (the side with more room), wrapping to further rows in depth; a group of animals only is a cloud
 * round the originals, each copy a body length or so from its source, so a school stays a school. Each copy is then
 * jittered (a turn of the whole copy about its own centre, a scale, a shift of the step) and its members a third as much
 * again. Animals go through the Shuffle rules (inside the glass and the water; clinging animals are placed by the same
 * code as new animals, placeNew); a piece rests on the piece under it that is not in the group, else on the ground.
 * Returns the new members, in the order made.
 */
export function copyGroup(S: TankSetup, g: Group, o: CopyOpts, ids: { fish: number; item: number }): Group {
  const src = members(S, g), out: Group = { fish: [], items: [] };
  const box = groupBox(S, g); if (!box) return out;
  const r = rng(o.seed), rr = (a: number) => (r() * 2 - 1) * a, T = S.tank;
  const room = LIMITS.maxFish - S.fish.length, roomI = MAX_ITEMS - S.items.length;
  const n = clamp(Math.round(o.n), 0, MAX_COPIES);
  const cloud = !src.items.length;
  // the step between copies: the group's own size and a small gap; toward the side with more room
  const gap = Math.max(15, Math.min(box.w, 200) * 0.1);
  const sx = box.w + gap, sd = box.d + gap;
  const dirX = box.cx > T.L / 2 ? -1 : 1, dirD = box.cd > T.D / 2 ? -1 : 1;
  const perRow = Math.max(1, Math.floor((dirX > 0 ? T.L - box.cx - box.w / 2 : box.cx - box.w / 2) / sx));
  const fishAdded = new Set<number>();
  let fid = ids.fish, iid = ids.item;
  const skip = new Set(g.items);
  for (let k = 1; k <= n; k++) {
    // where this copy's centre goes, and its own turn and scale
    let ox: number, od: number;
    if (cloud) { ox = 0; od = 0; } else {
      const col = (k - 1) % perRow + 1, row = Math.floor((k - 1) / perRow);
      ox = dirX * sx * col + rr(o.spacing / 100 * sx); od = dirD * sd * row + rr(o.spacing / 100 * sd);
    }
    const turn = rr(o.angle), grow = 1 + rr(o.scale / 100);
    const co = Math.cos(turn * D2R), si = Math.sin(turn * D2R);
    const place = (p: { x: number; depth: number }) => {
      const dx = (p.x - box.cx) * grow, dz = -(p.depth - box.cd) * grow;
      return { x: box.cx + ox + dx * co + dz * si, depth: box.cd + od - (-dx * si + dz * co) };
    };
    for (const f of src.fish) {
      if (out.fish.length >= room) break;
      const sp = getSpecies(f.species), tl = sp ? fishTL(f, sp) : 40;
      const n0: Fish = { ...f, id: fid++ };
      if (cloud) { // a body length or two from its source, in any direction
        const a = r() * 2 * Math.PI, e = (r() - 0.5) * (sp?.zone === 'bottom' || f.surface ? 0 : 1.2), d = tl * (0.7 + r() * (0.8 + o.spacing / 50));
        n0.x = f.x + Math.cos(a) * Math.cos(e) * d; n0.depth = f.depth + Math.sin(a) * Math.cos(e) * d; n0.y = f.y + Math.sin(e) * d * 0.6;
      } else { const p = place(f); n0.x = p.x; n0.depth = p.depth; }
      if (f.surface !== 'glass') n0.yaw = wrap(f.yaw + (cloud ? 0 : turn) + rr(o.angle / 3 + (cloud ? o.angle : 0)));
      if (o.angle) { n0.pitch = Math.round(clamp(f.pitch + rr(o.angle / 6), -45, 45)); n0.bend = +clamp(f.bend + rr(o.angle / 150), -1, 1).toFixed(2); }
      sizeFish(n0, grow * (1 + rr(o.scale / 300)));
      settleFish(S, n0);
      S.fish.push(n0); out.fish.push(n0.id);
      if (sp?.surfaces) fishAdded.add(n0.id);
    }
    for (const it of src.items) {
      if (out.items.length >= roomI) break;
      const n0: Item = { ...it, id: iid++ }, p = place(it);
      n0.x = p.x; n0.depth = p.depth; n0.yaw = wrap(it.yaw + turn + rr(o.angle / 3));
      n0.size = Math.round(it.size * grow * (1 + rr(o.scale / 300)));
      if (n0.spread != null) n0.spread = Math.round(n0.spread * grow);
      if (o.reshape) n0.seed = 1 + Math.floor(r() * 999999);
      // height: kept where it rode on another member (that one moves too), else down to what is under it there
      const rode = it.lift > 0 && src.items.some(q => q !== it && Math.hypot(q.x - it.x, q.depth - it.depth) < Math.max(...itemDims(q).filter((_, i) => i !== 1)) / 2 && q.lift < it.lift);
      n0.lift = rode ? it.lift : 0;
      clampItem(n0, T, S);
      if (!rode && o.support) n0.lift = Math.max(0, Math.round(o.support(n0.x, n0.depth, skip)));
      S.items.push(n0); out.items.push(n0.id);
    }
  }
  // clinging animals (snails, shrimp, plecos): the same placement as a new animal, so they land on a surface they can use
  if (fishAdded.size) placeNew(S, rng(o.seed + 1), fishAdded);
  return out;
}
