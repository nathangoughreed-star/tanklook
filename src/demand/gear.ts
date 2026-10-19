// Generic filter / heater models and the matcher that maps a real product (or a kit's class + rating) to the nearest one.
// Data: src/data/gear-models.json. Pure functions; the demand engine uses the matched model for price row and power.
import data from '../data/gear-models.json';

export type FilterKind = 'hob' | 'canister' | 'sponge' | 'internal';
export interface FilterModel { id: string; kind: FilterKind; label: string; gph: number; galMin: number; galMax: number; watts: number; priceKey: string; aliases: string[] }
export interface HeaterModel { id: string; label: string; watts: number; galMin: number; galMax: number; priceKey: string }
export const FILTER_MODELS = data.filters as FilterModel[];
export const HEATER_MODELS = data.heaters as HeaterModel[];

/** What is known about a real filter: any of the class, a rating text (`132 gph pump`, `~230 L/h`), a product name, or a flow. */
export interface FilterSpec { kind?: FilterKind; rating?: string; name?: string; gph?: number; gal?: number }
const L_PER_GAL = 3.785;

/** Flow in GPH found in free text: `250 gph`, `GPH 250`, or `L/h` converted. Undefined when no flow is given. */
export function parseGph(text?: string): number | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  const g = t.match(/(\d+(?:\.\d+)?)\s*gph/) ?? t.match(/gph\s*[:=]?\s*(\d+(?:\.\d+)?)/);
  if (g) return +g[1];
  const l = t.match(/(\d+(?:\.\d+)?)\s*(?:l\/h|lph|l\/hr)/);
  return l ? +l[1] / L_PER_GAL : undefined;
}

export interface Match<T> { model: T; how: 'name' | 'flow' | 'size' | 'class' }

/** The generic filter that best represents `spec`: an alias hit on the product name wins; else nearest flow within the class (log distance);
 *  else, for a class alone, the model of that class whose tank range holds `gal`, else the smallest of the class. */
export function matchFilter(spec: FilterSpec, models: FilterModel[] = FILTER_MODELS): Match<FilterModel> | undefined {
  const text = `${spec.name ?? ''} ${spec.rating ?? ''}`.toLowerCase();
  const inKind = (m: FilterModel) => !spec.kind || m.kind === spec.kind;
  const pool = models.filter(inKind).length ? models.filter(inKind) : models;
  if (spec.name || spec.rating) {
    // longest alias first, so `aquaclear 70` is not shadowed by a shorter fragment
    const hits = pool.flatMap(m => m.aliases.filter(a => text.includes(a)).map(a => ({ m, n: a.length }))).sort((a, b) => b.n - a.n);
    if (hits.length && (spec.name || spec.kind)) return { model: hits[0].m, how: 'name' };
  }
  const gph = spec.gph ?? parseGph(text);
  if (gph) return { model: pool.reduce((b, m) => Math.abs(Math.log(m.gph / gph)) < Math.abs(Math.log(b.gph / gph)) ? m : b), how: 'flow' };
  if (spec.gal !== undefined) {
    const fit = pool.find(m => spec.gal! >= m.galMin && spec.gal! <= m.galMax);
    if (fit) return { model: fit, how: 'size' };
  }
  return spec.kind || pool.length ? { model: [...pool].sort((a, b) => a.gph - b.gph)[0], how: 'class' } : undefined;
}

/** The generic filter a tank of `gal` gallons would normally get (the engine's default when no product is known):
 *  HOB up to 60 gal, canister above, as before. */
export const defaultFilter = (gal: number): FilterModel =>
  matchFilter({ kind: gal <= 60 ? 'hob' : 'canister', gal })!.model;

/** The smallest heater class holding `watts`, else the largest. Models are assumed sorted by watts. */
export function matchHeater(watts: number, models: HeaterModel[] = HEATER_MODELS): HeaterModel {
  const s = [...models].sort((a, b) => a.watts - b.watts);
  return s.find(m => m.watts >= watts) ?? s[s.length - 1];
}
/** The heater a tank of `gal` gallons would normally get (3 W/gal rule, 25-300 W as before). */
export const defaultHeater = (gal: number, wattsPerGal: number): HeaterModel => matchHeater(Math.min(300, Math.max(25, wattsPerGal * gal)));

/** Names the matched generic for a kit or deal row, e.g. `HOB filter (large) · 250 gph`. */
export const filterName = (m: FilterModel) => `${m.label} · ${m.gph} gph`;
