// Scatter brush (lane SB, 2026-10-16): paint litter, pebbles, moss, twigs and carpet plants onto the ground or a piece.
// A stroke is stored as a "patch": a seed, the path the brush went along and its settings. The things themselves are
// drawn from that (patchPoints, pure and seeded), so a patch is a few hundred bytes in the file, saves / loads / shares
// to the very same layout, and moves, erases and copies as a unit. Erasing adds `cuts` (circles) to the patches it
// touches; a patch with nothing left is dropped.
import { rng } from '../art/paint';
import { clamp } from './physics';
import type { BrushId, LeafKind, Patch, TankSetup } from './types';

export interface BrushDef {
  id: BrushId; label: string;
  /** Ground one thing takes at 100 % density (mm²): 100 % is a dense cover, 10 % a light sprinkling. */
  area: number;
  /** Brush radius range (mm). */
  radius: [number, number];
}
export const BRUSHES: BrushDef[] = [
  { id: 'leaf', label: 'Leaf litter', area: 1300, radius: [30, 250] },
  { id: 'pebble', label: 'Pebbles', area: 330, radius: [20, 200] },
  { id: 'gravel', label: 'Gravel', area: 40, radius: [15, 150] },
  { id: 'moss', label: 'Moss patches', area: 110, radius: [20, 200] },
  { id: 'twig', label: 'Fallen twigs', area: 4500, radius: [40, 250] },
  { id: 'hairgrass', label: 'Hairgrass lawn', area: 190, radius: [20, 200] },
  { id: 'javamoss', label: 'Java moss', area: 150, radius: [20, 200] },
  { id: 'sphagnum', label: 'Sphagnum', area: 140, radius: [20, 200] },
];
/** The brush tool's settings (a UI state, in the Store). */
export interface BrushState { on: boolean; erase: boolean; id: BrushId; size: number; density: number; leaf: LeafKind }
export const brushDef = (id: BrushId) => BRUSHES.find(b => b.id === id) ?? BRUSHES[0];
export const MAX_PATCHES = 200, MAX_PATH = 400, MAX_POINTS = 6000;

/** Things per disc of radius `r` (mm) at `density` % for the brush. */
export const perDisc = (b: BrushDef, r: number, density: number) => density / 100 * Math.PI * r * r / b.area;

/** Append a stroke point (x, depth), thinned: ignored when within a quarter radius of the last one. */
export function extendPath(p: Patch, x: number, d: number) {
  const n = p.path.length, step = Math.max(6, p.size / 4);
  if (n >= 2) {
    const px = p.path[n - 2], pd = p.path[n - 1], L = Math.hypot(x - px, d - pd);
    if (L < step) return false;
    // a fast drag skips ground: fill the gap with points a quarter radius apart (a straight line over the floor plan)
    const k = Math.floor(L / step);
    for (let i = 1; i <= k && p.path.length / 2 < MAX_PATH; i++) p.path.push(Math.round((px + (x - px) * i / k) * 10) / 10, Math.round((pd + (d - pd) * i / k) * 10) / 10);
    return true;
  }
  p.path.push(Math.round(x * 10) / 10, Math.round(d * 10) / 10); return true;
}

/** True if (x, d) is inside one of the patch's erased circles. */
export function cut(p: Patch, x: number, d: number) {
  const c = p.cuts; if (!c) return false;
  for (let i = 0; i + 2 < c.length; i += 3) if ((x - c[i]) ** 2 + (d - c[i + 1]) ** 2 < c[i + 2] ** 2) return true;
  return false;
}

/**
 * The floor-plan points (x, depth, mm) of a patch, in a stable order: each stroke point drops its share into a disc of the
 * brush radius; a point is kept only where its own stroke point is the nearest one (so overlapping discs do not double
 * the density), and not in an erased circle. Seeded per stroke point, so adding to the end of a stroke leaves the rest
 * where it was.
 */
export function patchPoints(p: Patch): [number, number][] {
  const b = brushDef(p.brush), n = Math.floor(p.path.length / 2), out: [number, number][] = [], r = p.size;
  for (let i = 0; i < n && out.length < MAX_POINTS; i++) {
    const cx = p.path[2 * i], cd = p.path[2 * i + 1], g = rng(p.seed * 104729 + i * 7919 + 17);
    const want = perDisc(b, r, p.density), k = Math.floor(want) + (g() < want - Math.floor(want) ? 1 : 0);
    for (let j = 0; j < k; j++) {
      const a = g() * Math.PI * 2, rr = r * Math.sqrt(g()), x = cx + Math.cos(a) * rr, d = cd + Math.sin(a) * rr;
      let own = true; // its own stroke point is the nearest (ties to the earlier one); a few neighbours either side suffice
      const di = (x - cx) ** 2 + (d - cd) ** 2;
      for (let m = Math.max(0, i - 8); m <= Math.min(n - 1, i + 8) && own; m++) {
        if (m === i) continue;
        const dm = (x - p.path[2 * m]) ** 2 + (d - p.path[2 * m + 1]) ** 2;
        if (dm < di || (dm === di && m < i)) own = false;
      }
      if (own && !cut(p, x, d)) out.push([x, d]);
    }
  }
  return out;
}

/** A new, empty patch for the setup (the id is the next free one). */
export function newPatch(S: TankSetup, brush: BrushId, size: number, density: number, seed: number, leaf?: LeafKind): Patch {
  const id = (S.patches ?? []).reduce((a, q) => Math.max(a, q.id), 0) + 1, b = brushDef(brush);
  return { id, brush, seed: Math.round(seed) % 1000000 || 1, size: Math.round(clamp(size, b.radius[0], b.radius[1])), density: Math.round(clamp(density, 1, 100)), path: [], ...(brush === 'leaf' ? { leaf: leaf ?? 'mixed' } : {}) };
}

/** Erase every patch's things inside the circle (x, depth, r). Patches that lose their last stroke point's cover vanish. */
export function erasePatches(S: TankSetup, x: number, d: number, r: number) {
  if (!S.patches?.length) return false;
  let hit = false;
  for (const p of S.patches) {
    let near = false; for (let i = 0; i + 1 < p.path.length; i += 2) if (Math.hypot(p.path[i] - x, p.path[i + 1] - d) < p.size + r) { near = true; break; }
    if (!near) continue;
    const c = p.cuts ?? (p.cuts = []), l = c.length;
    if (l >= 3 && Math.hypot(c[l - 3] - x, c[l - 2] - d) < r / 4 && c[l - 1] >= r) continue; // the last circle already covers this
    if (c.length / 3 >= 600) continue;
    c.push(Math.round(x), Math.round(d), Math.round(r)); hit = true;
  }
  if (hit) S.patches = S.patches.filter(p => patchPoints(p).length > 0);
  if (!S.patches.length) delete S.patches;
  return hit;
}

/** Map every point of a patch (path and erased circles' centres) through f. */
export function mapPatch(p: Patch, f: (x: number, d: number) => [number, number]) {
  for (let i = 0; i + 1 < p.path.length; i += 2) { const [x, d] = f(p.path[i], p.path[i + 1]); p.path[i] = Math.round(x * 10) / 10; p.path[i + 1] = Math.round(d * 10) / 10; }
  if (p.cuts) for (let i = 0; i + 2 < p.cuts.length; i += 3) { const [x, d] = f(p.cuts[i], p.cuts[i + 1]); p.cuts[i] = Math.round(x); p.cuts[i + 1] = Math.round(d); }
}
/** Centre of a patch's stroke and its reach from it (mm, brush radius included). */
export function patchBox(p: Patch) {
  let x0 = Infinity, x1 = -Infinity, d0 = Infinity, d1 = -Infinity;
  for (let i = 0; i + 1 < p.path.length; i += 2) { x0 = Math.min(x0, p.path[i]); x1 = Math.max(x1, p.path[i]); d0 = Math.min(d0, p.path[i + 1]); d1 = Math.max(d1, p.path[i + 1]); }
  return { cx: (x0 + x1) / 2, cd: (d0 + d1) / 2, rx: (x1 - x0) / 2 + p.size, rd: (d1 - d0) / 2 + p.size };
}
/** The patch whose cover the floor point (x, d) lies in (nearest stroke point within the brush radius), or null. */
export function patchAt(S: TankSetup, x: number, d: number): Patch | null {
  let best: Patch | null = null, bd = Infinity;
  for (const p of S.patches ?? []) for (let i = 0; i + 1 < p.path.length; i += 2) {
    const k = Math.hypot(p.path[i] - x, p.path[i + 1] - d) / p.size; if (k < 1.1 && k < bd) { bd = k; best = p; }
  }
  return best;
}
/** Does erasing at (x, d, r) touch any patch's cover? */
export function erasable(S: TankSetup, x: number, d: number, r: number) {
  for (const p of S.patches ?? []) for (let i = 0; i + 1 < p.path.length; i += 2) if (Math.hypot(p.path[i] - x, p.path[i + 1] - d) < p.size + r) return true;
  return false;
}
/** Move a patch by (dx, dd) mm (path and erased circles together). */
export function movePatch(p: Patch, dx: number, dd: number) {
  for (let i = 0; i + 1 < p.path.length; i += 2) { p.path[i] += dx; p.path[i + 1] += dd; }
  if (p.cuts) for (let i = 0; i + 2 < p.cuts.length; i += 3) { p.cuts[i] += dx; p.cuts[i + 1] += dd; }
}

/** Patches read from a file: anything malformed is dropped, numbers clamped. */
export function parsePatches(raw: unknown): Patch[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Patch[] = [], ids = new Set<number>(), ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  for (const q of raw.slice(0, MAX_PATCHES)) {
    if (!q || typeof q !== 'object') continue;
    const o = q as Record<string, unknown>, def = BRUSHES.find(b => b.id === o.brush); if (!def || !Array.isArray(o.path)) continue;
    const path = (o.path as unknown[]).slice(0, MAX_PATH * 2).filter(ok); if (path.length < 2) continue;
    path.length -= path.length % 2;
    let id = ok(o.id) ? Math.round(o.id) : 0; while (id < 1 || ids.has(id)) id++; ids.add(id);
    const cuts = Array.isArray(o.cuts) ? (o.cuts as unknown[]).slice(0, 1800).filter(ok) : [];
    cuts.length -= cuts.length % 3;
    out.push({
      id, brush: def.id, seed: ok(o.seed) ? Math.round(clamp(o.seed, 1, 1e6)) : 1, size: ok(o.size) ? Math.round(clamp(o.size, def.radius[0], def.radius[1])) : def.radius[0],
      density: ok(o.density) ? Math.round(clamp(o.density, 1, 100)) : 50, path,
      ...(cuts.length ? { cuts } : {}),
      ...(def.id === 'leaf' ? { leaf: (['mixed', 'oak', 'magnolia', 'catappa'] as const).find(l => l === o.leaf) ?? 'mixed' } : {}),
    });
  }
  return out.length ? out : undefined;
}
