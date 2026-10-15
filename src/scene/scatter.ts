// Shuffle: every animal to a fresh spot, as if the tank were photographed a moment later. Each keeps its species, size
// and id; the rules come from the species data: bottom dwellers on the ground, land animals on land, clinging animals
// (snails, shrimp, plecos) on the substrate, the glass or the hardscape as their species allows, swimmers in their
// favoured band of the water column ('level'), groups of 3+ of a 'school' species in a tight aligned school and of a
// 'shoal' species in a loose group, everyone else spread apart.
import { clingsTo, fishTL, getSpecies, speciesOf, type Species } from '../data/species';
import { backdropDepth, clamp, clampFish, spawnSnail, waterY } from './physics';
import { hardscape } from './items';
import { inside } from './shape';
import { groundHeight, randomLand } from './terrain';
import type { Fish, TankSetup } from './types';

/** Random heading around `dir` (0 or 180) with a little pitch, roll and bend; bottom dwellers face anywhere, level. */
export function randomPose(sp: Species, r: () => number, dir: number, spread = 80) {
  if (sp.zone === 'bottom') return { yaw: Math.round(r() * 360 - 180), pitch: 0, roll: 0, bend: +((r() - 0.5) * 0.8).toFixed(2) };
  return { yaw: wrap(Math.round(dir + (r() - 0.5) * spread)), pitch: Math.round((r() - 0.5) * 16), roll: Math.round((r() - 0.5) * 10), bend: +((r() - 0.5) * 0.8).toFixed(2) };
}
const wrap = (a: number) => (a > 180 ? a - 360 : a <= -180 ? a + 360 : a);

/** Body length drawn around `pct` % of adult (normal, sd 8 % of adult, kept within 15–130 %), so no two fish are
 *  quite the same size. Snails and shrimp vary a little less. Stored as no override when it lands on adult. */
export function randomSize(f: Fish, sp: Species, pct: number, r: () => number) {
  const n = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); // standard normal (Box–Muller)
  const sd = sp.kind === 'snail' || sp.surfaces ? 5 : 8;
  const adult = fishTL({ sex: f.sex }, sp), tl = Math.round(adult * clamp(pct + n * sd, 15, 130) / 100);
  if (tl === adult) delete f.tl; else f.tl = tl;
}

/** Share of a species with `cling: "top"` (African dwarf frog) floating at the surface after a Shuffle. */
export const FLOAT_FROG = 1 / 3;

/** Part of the water column (0 = just above the ground, 1 = just under the surface) each level favours. */
const BANDS = { top: [0.65, 0.98], mid: [0.2, 0.8], low: [0.02, 0.4] } as const;

/** Put a land or amphibious animal on a random spot of land (amphibians: half the time in the water if there is any). */
export function placeOnLand(s: TankSetup, sp: Species, f: Fish, r: () => number) {
  if (sp.habitat === 'both' && s.water.on && r() < 0.5) return;
  const p = randomLand(s, s.tank, s.water.on ? waterY(s.tank, s.water.level) : -1, r); if (!p) return;
  f.x = p.x; f.depth = p.depth; f.y = groundHeight(s, s.tank, p.x, p.depth);
}

/** Move every animal in the tank to a new spot and pose under the rules above. */
/** `only` = move just that species, or the animals the test picks; everyone else stays put and is kept clear of.
 *  `sizePct` = also re-roll each moved animal's size around that % of adult (randomSize). */
export function shuffleFish(s: TankSetup, r: () => number, only?: string | ((f: Fish) => boolean), sizePct?: number) {
  const A = s.tank, top = s.water.on ? waterY(A, s.water.level) : A.H - 10, g = (x: number, d: number) => groundHeight(s, A, x, d), wb = backdropDepth(s.backdrop, A);
  const placed: { x: number; y: number; depth: number; w: number }[] = [];
  const note = (f: Fish, w: number) => placed.push({ x: f.x, y: f.y, depth: f.depth, w });
  /** A random footprint spot `inset` from the glass with at least `need` mm of water over the ground (best effort). */
  const spot = (inset: number, need: number) => {
    let best = { x: A.L / 2, depth: A.D / 2 }, bw = -Infinity;
    for (let k = 0; k < 60; k++) {
      const x = A.L * r(), depth = A.D * r(); if (!inside(A, x, depth, inset)) continue;
      const w = top - g(x, depth); if (w >= need) return { x, depth };
      if (w > bw) { bw = w; best = { x, depth }; }
    }
    return best;
  };
  /** Centre height for a body `h` tall at (x, depth), fraction `t` of the way up the free water there. */
  const bandY = (x: number, depth: number, h: number, t: number) => {
    const lo = g(x, depth) + h / 2, hi = Math.max(lo, top - h / 2);
    return lo + clamp(t, 0, 1) * (hi - lo);
  };
  const bandT = (sp: Species) => { const [a, b] = BANDS[sp.level ?? 'mid']; return a + r() * (b - a); };
  /** Of a few candidates, the one farthest (relative to body sizes) from everything placed so far. */
  const roomiest = <T extends { x: number; y: number; depth: number }>(w: number, make: () => T) => {
    let best = make(), bs = -1;
    for (let k = 0; k < 8; k++) {
      const c = k ? make() : best;
      let m = Infinity; for (const p of placed) m = Math.min(m, Math.hypot(c.x - p.x, c.y - p.y, c.depth - p.depth) / (w + p.w));
      if (m > bs) { bs = m; best = c; }
      if (!placed.length) break;
    }
    return best;
  };

  const bySpecies = new Map<string, Fish[]>();
  for (const f of s.fish) {
    if (only && (typeof only === 'string' ? f.species !== only : !only(f))) { const sp = getSpecies(f.species); if (sp) note(f, fishTL(f, sp)); continue; }
    if (sizePct !== undefined) { const sp = getSpecies(f.species); if (sp) randomSize(f, sp, sizePct, r); }
    const l = bySpecies.get(f.species); if (l) l.push(f); else bySpecies.set(f.species, [f]);
  }
  // groups first (they need the room), then the loners, which keep clear of everything already placed
  const groups = [...bySpecies.entries()].map(([id, fish]) => ({ sp: getSpecies(id)!, fish })).filter(e => e.sp)
    .sort((a, b) => +grouped(b.sp, b.fish.length) - +grouped(a.sp, a.fish.length));

  const hard = hardscape(s);
  for (const e of groups) {
    const sp = e.sp;
    if (sp.surfaces) {
      // clinging animals: a spot on any surface they can use, in proportion to its area; snails stay wherever that is,
      // the rest of a group of shrimp or otos left on the floor forage there as usual. A clinging fish (oto, pleco) takes
      // the glass at a third of its area: in a tall tank the panes outsize the floor two to one and would hold nearly all
      // A land climber (tree frog) takes the dry glass and hardscape above the water line; on the floor it goes to land.
      const land = sp.habitat === 'land', glass = clingsTo(sp, 'glass') && (sp.kind === 'snail' || (land ? GLASS_FROG : GLASS_FISH));
      const on = { glass, hard: clingsTo(sp, 'hardscape') ? hard : undefined, above: land && s.water.on ? waterY(A, s.water.level) : undefined }, left: Fish[] = [];
      for (const f of e.fish) {
        // a dwarf frog floats at the surface (its "zen" pose) about a third of the time, else it rests on the bottom
        if (clingsTo(sp, 'top')) {
          if (!s.water.on || r() >= FLOAT_FROG) { f.surface = 'floor'; left.push(f); continue; }
          const w = fishTL(f, sp), q = roomiest(w, () => { const c = spot(w / 2, w); return { ...c, y: top }; });
          Object.assign(f, q, { surface: 'top' as const, yaw: Math.round(r() * 360 - 180), pitch: Math.round(4 + r() * 8), roll: 0, bend: 0 }); note(f, w);
          continue;
        }
        const p = spawnSnail(g, A, fishTL(f, sp), r, land ? A.H - 10 : top, on);
        if (sp.kind !== 'snail' && p.surface === 'floor') { f.surface = 'floor'; left.push(f); continue; }
        // a frog on the glass sits head up, more or less
        if (land && p.surface === 'glass') p.yaw = Math.round(90 + (r() - 0.5) * 80);
        Object.assign(f, p, { pitch: 0, roll: 0, bend: sp.kind === 'snail' || land ? 0 : +((r() - 0.5) * 0.4).toFixed(2) }); note(f, fishTL(f, sp));
      }
      if (sp.kind === 'snail' || !left.length) continue;
      e.fish = left;
    }
    const { fish } = e;
    if (sp.habitat === 'land' || sp.habitat === 'both') {
      for (const f of fish) {
        const w = fishTL(f, sp), a = speciesOf(f)!.aspect, p = spot(w / 2, w * a * 1.5);
        Object.assign(f, { x: p.x, depth: p.depth, y: bandY(p.x, p.depth, w * a, 0.1 + r() * 0.5) }, randomPose(sp, r, r() < 0.5 ? 0 : 180));
        placeOnLand(s, sp, f, r); clampFish(f, A, wb); note(f, w);
      }
      continue;
    }
    if (!grouped(sp, fish.length)) {
      for (const f of fish) {
        const w = fishTL(f, sp), h = w * speciesOf(f)!.aspect;
        const p = roomiest(w, () => { const q = spot(w / 2, h * 1.5); return { ...q, y: sp.zone === 'bottom' ? g(q.x, q.depth) : bandY(q.x, q.depth, h, bandT(sp)) }; });
        Object.assign(f, p, randomPose(sp, r, r() < 0.5 ? 0 : 180)); clampFish(f, A, wb); note(f, w);
      }
      continue;
    }
    // a school or shoal; a big one sometimes splits in two
    const n = fish.length, tight = sp.group === 'school';
    const cut = n >= (tight ? 14 : 6) && r() < (tight ? 0.35 : 0.5) ? Math.round(n * (0.4 + r() * 0.2)) : n;
    for (const part of cut < n ? [fish.slice(0, cut), fish.slice(cut)] : [fish]) school(sp, part, tight);
  }

  function school(sp: Species, fish: Fish[], tight: boolean) {
    const w = fishTL(fish[0], sp), h = w * sp.aspect, n = fish.length, bottom = sp.zone === 'bottom';
    // half-sizes of the group: grows with the cube root of its size (the square root on the floor), wider for a shoal
    const ax = Math.min(A.L * 0.45, w * (bottom ? 1.1 * Math.sqrt(n) : 1.4 * Math.cbrt(n)) * (tight ? 1 : 2.2));
    const ad = Math.min(A.D * 0.45, ax * 0.7), ay = ax * 0.45;
    const c = roomiest(ax, () => { const q = spot(Math.min(ax, ad) * 0.6, h * 2); return { ...q, y: bottom ? g(q.x, q.depth) : bandY(q.x, q.depth, h, bandT(sp)) }; });
    const t0 = bottom ? 0 : (c.y - g(c.x, c.depth) - h / 2) / Math.max(1, top - g(c.x, c.depth) - h);
    const head = wrap(Math.round((r() < 0.5 ? 0 : 180) + (r() - 0.5) * 90)); // the whole group's heading
    const mine: { x: number; y: number; depth: number }[] = [];
    for (const f of fish) {
      const fw = fishTL(f, sp);
      let p = { x: c.x, y: c.y, depth: c.depth };
      for (let k = 0; k < 12; k++) { // a uniform point in the group's ellipsoid, not on top of a schoolmate
        let u, v, z; do { u = r() * 2 - 1; v = r() * 2 - 1; z = r() * 2 - 1; } while (u * u + v * v + z * z > 1);
        const x = c.x + u * ax, depth = c.depth + z * ad;
        if (!inside(A, x, depth, fw / 2)) continue;
        const y = bottom ? g(x, depth) : bandY(x, depth, fw * sp.aspect, t0 + v * ay / Math.max(1, top - g(x, depth)));
        p = { x, y, depth };
        if (mine.every(m => Math.hypot(m.x - x, m.y - y, m.depth - depth) > fw * 0.6)) break;
      }
      mine.push(p);
      // a school all heads one way; in a shoal most roughly follow, the rest wander
      const pose = bottom && !tight ? randomPose(sp, r, 0) : tight ? randomPose(sp, r, head, 24) : r() < 0.7 ? randomPose(sp, r, head, 80) : randomPose(sp, r, r() * 360 - 180, 0);
      if (bottom && r() < 0.6) pose.yaw = wrap(Math.round(head + (r() - 0.5) * 120)); // foraging corys drift the same way
      Object.assign(f, p, pose); clampFish(f, A, wb); note(f, fw);
    }
  }
}

/** Place just the animals in `ids` (newly added), leaving everyone else where they are. A newcomer to a school or shoal
 *  already in the tank joins it: next to a random member (either sex), heading its way. The rest go by the shuffle rules. */
export function placeNew(s: TankSetup, r: () => number, ids: Set<number>) {
  const A = s.tank, top = s.water.on ? waterY(A, s.water.level) : A.H - 10, g = (x: number, d: number) => groundHeight(s, A, x, d), wb = backdropDepth(s.backdrop, A);
  const joined = new Set<number>();
  for (const id of new Set(s.fish.filter(f => ids.has(f.id)).map(f => f.species))) {
    const sp = getSpecies(id); if (!sp || sp.surfaces || !grouped(sp, s.fish.filter(f => f.species === id).length)) continue;
    const mates = s.fish.filter(f => f.species === id && !ids.has(f.id)); if (!mates.length) continue;
    const tight = sp.group === 'school', bottom = sp.zone === 'bottom';
    for (const f of s.fish.filter(q => q.species === id && ids.has(q.id))) {
      const m = mates[Math.floor(r() * mates.length)], fw = fishTL(f, sp), h = fw * sp.aspect;
      let p = { x: m.x, y: m.y, depth: m.depth };
      for (let k = 0; k < 16; k++) { // a spot a body length or two from the mate (wider in a shoal), clear of the others
        const a = r() * 2 * Math.PI, e = (r() - 0.5) * (bottom ? 0 : 1.2), d = fw * (tight ? 0.8 + r() * 0.8 : 1.5 + r() * 2);
        const x = m.x + Math.cos(a) * Math.cos(e) * d, depth = m.depth + Math.sin(a) * Math.cos(e) * d;
        if (!inside(A, x, depth, fw / 2)) continue;
        const y = bottom ? g(x, depth) : clamp(m.y + Math.sin(e) * d * 0.6, g(x, depth) + h / 2, Math.max(g(x, depth) + h / 2, top - h / 2));
        p = { x, y, depth };
        if (mates.every(q => Math.hypot(q.x - x, q.y - y, q.depth - depth) > fw * 0.6)) break;
      }
      const pose = bottom ? randomPose(sp, r, 0) : tight ? randomPose(sp, r, m.yaw, 24) : r() < 0.7 ? randomPose(sp, r, m.yaw, 80) : randomPose(sp, r, r() * 360 - 180, 0);
      if (bottom && r() < 0.6) pose.yaw = wrap(Math.round(m.yaw + (r() - 0.5) * 120));
      Object.assign(f, p, pose); clampFish(f, A, wb); mates.push(f); joined.add(f.id);
    }
  }
  if ([...ids].some(id => !joined.has(id))) shuffleFish(s, r, f => ids.has(f.id) && !joined.has(f.id));
}

/** Weight of the glass, per mm², for a clinging fish choosing where to sit (floor 1, hardscape tops GRAZE). */
const GLASS_FISH = 0.35;
/** The same for a tree frog: dry glass is where you mostly see one. */
const GLASS_FROG = 0.6;

/** Does this many of a species move as a group? */
const grouped = (sp: Species, n: number) => !!sp.group && n >= 3 && sp.kind !== 'snail' && sp.habitat === 'water';
