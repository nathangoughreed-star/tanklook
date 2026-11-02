// Personalized tiles for Visual Discovery steps 4 and 5 (lane VD6, 2026-11-02; Nathan's cutoff in research/design/visual-discovery-spec.md): steps
// 1-3 stay curated pictures, from the archetype step on every picture is a 3D render of THE PERSON'S tank. Archetype tiles = each buildable archetype
// of the chosen family at Balanced density; density tiles = the chosen archetype at Open / Balanced / Full from one `recipeBase` (so the trio shares a
// build). Rules kept here: the same tank for every tile of a step (`tankChoice`), a tank the person does not have yet is only ever a labelled
// suggestion, and a scene is built once per (archetype, tank, roster) and drawn once per density, then cached. Pure apart from the `shot` callback
// (the viewer, see panels.ts): no DOM here, so the tank choice and the scenes are tested without WebGL.
import type { Archetype, Density } from '../../scene/archetypes';
import { recipeBase, recipeDens, recipeLook, minTank, sceneAt, withBg, DENSITIES } from '../../scene/recipes';
import { scapeSetup } from '../../scene/scapes';
import { catalogueSizes, fitIn, type AnimalCount } from '../../scene/tankfit';
import type { TankModel } from '../../data/tanks';
import type { TankSetup } from '../../scene/types';

/** The one view every tile is drawn from (the look picker's), so two tiles differ only in what is in the tank. */
export const TILE_VIEW = { az: 28, el: 16, zoom: 0.8 };

export interface TankChoice {
  model: TankModel;
  /** yours = the tank the person told us about; suggested = we picked it from their limits / animals / the archetypes; picked = they changed our suggestion */
  source: 'yours' | 'suggested' | 'picked';
  /** one short clause: why this tank (shown beside the label) */
  why: string;
}

const land = (arches: readonly Archetype[]) => arches.length > 0 && arches.every(a => a.env === 'terrarium');
const isBuildable = (a: Archetype) => a.support !== 'coming-soon' && !!recipeLook(a);

/** The tank every tile of a step is drawn in. The person's own tank when the brief names one; else a suggestion: the smallest catalogue tank that
 *  holds every drawn archetype of the step (the largest `minGallons`), their gallon floor (the brief's tank-size minimum) and any known animals
 *  (`fitIn`). `pick` is a catalogue tank id the person chose over the suggestion. */
export function tankChoice(arches: readonly Archetype[], o: { yours?: TankModel; pick?: string; floorGal?: number; animals?: AnimalCount[] } = {}): TankChoice | undefined {
  const drawn = arches.filter(isBuildable);
  if (!drawn.length) return undefined;
  const sizes = catalogueSizes(land(drawn));
  if (o.yours) return { model: o.yours, source: 'yours', why: 'your tank' };
  const picked = o.pick ? sizes.find(c => c.m.id === o.pick) : undefined;
  if (picked) return { model: picked.m, source: 'picked', why: 'the one you chose' };
  const archMin = Math.max(...drawn.map(a => minTank(a).ratedGal)), need = Math.max(o.floorGal ?? 0, archMin);
  const ok = (m: TankModel) => m.ratedGal >= need && (!o.animals?.length || !fitIn(o.animals, m)?.fails.length);
  const m = sizes.find(c => ok(c.m))?.m ?? sizes[sizes.length - 1].m;
  const why = o.animals?.length ? 'big enough for your animals' : (o.floorGal ?? 0) > archMin ? 'from your size limit' : 'big enough for every look here';
  return { model: m, source: 'suggested', why };
}

/** Catalogue tanks the person can switch the suggestion to: any that holds every drawn archetype of the step. */
export function tankOptions(arches: readonly Archetype[]): TankModel[] {
  const drawn = arches.filter(isBuildable), need = Math.max(0, ...drawn.map(a => minTank(a).ratedGal));
  return catalogueSizes(land(drawn)).map(c => c.m).filter(m => m.ratedGal >= need);
}

/** The animals already in a tank, as counts. */
export function rosterOf(T: TankSetup): AnimalCount[] {
  const out: AnimalCount[] = [];
  for (const f of T.fish) { const x = out.find(y => y.species === f.species); if (x) x.n++; else out.push({ species: f.species, n: 1 }); }
  return out;
}

export interface Preview { archetype: Archetype; scenes: Record<Density, TankSetup>; /** ms spent building the three scenes */ buildMs: number }
export interface Shot { url: string; ms: number }

/** The three scenes of an archetype. With animals in hand the person's own tank is kept (roster, size, gear) and only the scape changes, drawn
 *  with the same density stops as recipes.ts; else one `recipeBase` in the chosen tank. */
export function previewOf(a: Archetype, tank: TankModel, inHand?: TankSetup): Preview | undefined {
  if (!isBuildable(a)) return undefined;
  const t0 = performance.now();
  if (inHand?.fish.length) {
    const look = recipeLook(a)!, animals = rosterOf(inHand), mode = a.recipe.plantMode ?? 'live';
    const scenes = {} as Record<Density, TankSetup>;
    for (const d of DENSITIES) scenes[d] = withBg(a, a.recipe.looks[0] === 'none' ? structuredClone(inHand) : scapeSetup({ animals, setup: inHand } as never, look, mode, inHand, { dens: recipeDens(a, d) }));
    return { archetype: a, scenes, buildMs: performance.now() - t0 };
  }
  const base = recipeBase(a, tank);
  if (!base) return undefined;
  const scenes = {} as Record<Density, TankSetup>;
  for (const d of DENSITIES) scenes[d] = sceneAt(base, d);
  return { archetype: a, scenes, buildMs: performance.now() - t0 };
}

/** Scenes and pictures, cached per (archetype, tank, roster) and per density. One draw at a time; `draw` returns '' when nothing can be pictured
 *  (no WebGL, a collapsed view), and that tile then keeps its flat colour. */
export class Previews {
  private scenes = new Map<string, Preview | null>();
  private shots = new Map<string, Shot>();
  /** every picture drawn so far: for the measurements the lane reports */
  readonly log: { id: string; density: Density; tank: string; buildMs: number; shotMs: number }[] = [];
  constructor(private draw?: (T: TankSetup) => string) {}

  private keyOf = (a: Archetype, tank: TankModel, inHand?: TankSetup) =>
    `${a.id}|${inHand?.fish.length ? 'hand:' + rosterOf(inHand).map(r => r.species + r.n).join(',') + ':' + tank.id : tank.id}`;
  scenesOf(a: Archetype, tank: TankModel, inHand?: TankSetup): Preview | undefined {
    const k = this.keyOf(a, tank, inHand);
    if (!this.scenes.has(k)) this.scenes.set(k, previewOf(a, tank, inHand) ?? null);
    return this.scenes.get(k) ?? undefined;
  }
  shotOf(a: Archetype, d: Density, tank: TankModel, inHand?: TankSetup): Shot | undefined { return this.shots.get(`${this.keyOf(a, tank, inHand)}|${d}`); }
  /** Build (if needed) and draw one picture; undefined when it cannot be drawn. */
  render(a: Archetype, d: Density, tank: TankModel, inHand?: TankSetup): Shot | undefined {
    const k = `${this.keyOf(a, tank, inHand)}|${d}`, have = this.shots.get(k);
    if (have) return have;
    if (!this.draw) return undefined;
    const t0 = performance.now(), pv = this.scenesOf(a, tank, inHand);
    if (!pv) return undefined;
    const t1 = performance.now(), url = this.draw({ ...pv.scenes[d], camera: { ...pv.scenes[d].camera, ...TILE_VIEW } });
    if (!url) return undefined;
    const shot = { url, ms: Math.round(performance.now() - t0) };
    this.shots.set(k, shot);
    this.log.push({ id: a.id, density: d, tank: tank.name, buildMs: Math.round(t1 - t0), shotMs: Math.round(performance.now() - t1) });
    return shot;
  }
}
