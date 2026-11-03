// Lane GG1 (Nathan 2026-11-03): the heater, filter and light choices are grouped so a list scans by size, not by brand.
// Heaters and filters group by the RATED range the maker advertises ("Rated for 30-40 gal"), small to large; lights group
// by the tank length they fit ("Fits 24-30 in tanks"), with the pucks and clip-on spot lights by themselves. Pure: the
// Tech menu and the Equipment step both render these groups (no DOM here).

export interface RatedItem { galMin?: number; galMax?: number; est?: string[] }
export interface GearGroup<T> { id: string; label: string; items: T[]; /** a rated group whose range holds the tank */ fits: boolean }

/** A tank's computed volume reads a little over its nominal gallons (a "10 gal" is about 10.3), so a range holds 5 % more. */
const SLACK = 1.05;
const num = (n: number) => String(Math.round(n * 10) / 10);

const hasRange = (p: RatedItem) => p.galMin !== undefined || p.galMax !== undefined;
const lo = (p: RatedItem) => p.galMin ?? 0;
const hi = (p: RatedItem) => p.galMax ?? Infinity;
/** Does the maker's rated range hold a tank of `gal` gallons? Undefined: no range listed. */
export const ratedFits = (p: RatedItem, gal: number): boolean | undefined => hasRange(p) ? gal >= lo(p) && gal <= hi(p) * SLACK : undefined;
/** A range that was estimated, not read from the listing (est names galMin or galMax). */
const estimated = (p: RatedItem) => !!p.est?.some(f => f === 'galMin' || f === 'galMax');

/** "Rated for 30-40 gal", "Rated for up to 20 gal", "Rated for 40+ gal"; "(estimated)" when we filled the range in. */
export function ratedLabel(p: RatedItem): string {
  if (!hasRange(p)) return 'No rated range listed';
  const a = lo(p), b = hi(p);
  const core = b === Infinity ? `${num(a)}+ gal` : a <= 0 ? `up to ${num(b)} gal` : a === b ? `${num(a)} gal` : `${num(a)}-${num(b)} gal`;
  return `Rated for ${core}${estimated(p) ? ' (estimated)' : ''}`;
}

/** Group heaters or filters by rated range, ranges ordered small to large (by top of range, then bottom), products with
 *  no range last in "No rated range listed"; inside a group `order` (watts / gph). A group that holds the tank (`gal`)
 *  says "fits your NN gal"; none is hidden. */
export function ratedGroups<T extends RatedItem>(items: T[], gal: number, order: (a: T, b: T) => number): GearGroup<T>[] {
  const by = new Map<string, GearGroup<T> & { rep: T }>();
  for (const p of items) {
    const base = ratedLabel(p), id = base;
    let g = by.get(id);
    if (!g) { const f = ratedFits(p, gal); g = { id, label: f ? `${base} · fits your ${Math.round(gal)} gal` : base, items: [], fits: !!f, rep: p }; by.set(id, g); }
    g.items.push(p);
  }
  const groups = [...by.values()];
  groups.sort((a, b) => (+!hasRange(a.rep) - +!hasRange(b.rep)) || hi(a.rep) - hi(b.rep) || lo(a.rep) - lo(b.rep) || +estimated(a.rep) - +estimated(b.rep));
  for (const g of groups) g.items.sort(order);
  return groups.map(({ rep: _r, ...g }) => g);
}

// ---- lights

/** Mounts counted as "puck and clip-on" lights: a nano disc on a bendable neck from a screw clamp (gooseneck) and a small
 *  submersible stick on suction cups. Bars and rim-legs slabs span the tank, so they sort by the length they fit; hanging
 *  reef fixtures fit any length (a box per coverage), so they get a group of their own at the end. */
export const PUCK_MOUNTS: readonly string[] = ['gooseneck', 'submersible'];
export const PUCK_GROUP = 'Puck and clip-on lights';
export const HANGING_GROUP = 'Hanging reef fixtures (fit any tank length)';

export interface LightLike { mount: string; fitMinMm: number; fitMaxMm: number; watts: number; popularity?: { evidence: string } }
const inch = (mm: number) => Math.round(mm / 25.4);
const rank = (p: LightLike) => Number(/#(\d+)/.exec(p.popularity?.evidence ?? '')?.[1] ?? 999);

/** Group lights by the tank length they fit (inches, as the maker's span rounds), shortest tanks first; pucks and clip-ons,
 *  then hanging fixtures, in groups after the length order. Inside a group: most popular first, then watts. */
export function lightGroups<T extends LightLike>(items: T[]): GearGroup<T>[] {
  const by = new Map<string, GearGroup<T> & { a: number; b: number }>();
  const put = (id: string, label: string, a: number, b: number, p: T) => { const g = by.get(id) ?? { id, label, items: [], fits: false, a, b }; g.items.push(p); by.set(id, g); };
  for (const p of items) {
    if (PUCK_MOUNTS.includes(p.mount)) put('puck', PUCK_GROUP, 1e6, 0, p);
    else if (p.mount === 'hanging') put('hanging', HANGING_GROUP, 2e6, 0, p);
    else { const a = inch(p.fitMinMm), b = inch(p.fitMaxMm); put(`${a}-${b}`, `Fits ${a}-${b} in tanks`, a, b, p); }
  }
  const groups = [...by.values()].sort((x, y) => x.a - y.a || x.b - y.b);
  for (const g of groups) g.items.sort((x, y) => rank(x) - rank(y) || x.watts - y.watts);
  return groups.map(({ a: _a, b: _b, ...g }) => g);
}

/** Group id + label + options in the shape the gear card's Library select takes. */
export const asLibraryGroups = <T>(groups: GearGroup<T>[], opt: (p: T) => { id: string; label: string }) => groups.map(g => ({ label: g.label, options: g.items.map(opt) }));
