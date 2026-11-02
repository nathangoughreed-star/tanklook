// Personalized tiles for Visual Discovery steps 4 and 5 (lane VD6, 2026-11-02; Nathan's cutoff in research/design/visual-discovery-spec.md): steps
// 1-3 stay curated pictures, from the archetype step on every picture is a 3D render of THE PERSON'S tank. Archetype tiles = each buildable archetype
// of the chosen family at Balanced density; density tiles = the chosen archetype at Open / Balanced / Full from one `recipeBase` (so the trio shares a
// build). Rules kept here: the same tank for every tile of a step (`tankChoice`), a tank the person does not have yet is only ever a labelled
// suggestion, and a scene is built once per (archetype, tank, roster) and drawn once per density, then cached. Pure apart from the `shot` callback
// (the viewer, see panels.ts): no DOM here, so the tank choice and the scenes are tested without WebGL.
import type { Archetype, Density } from '../../scene/archetypes';
import { recipeBase, recipeDensAt, recipeLook, minTank, sceneAt, stopScene, withBg, DENSITIES } from '../../scene/recipes';
import { scapeSetup } from '../../scene/scapes';
import { buildsFor } from '../../scene/builds';
import { shuffleFish } from '../../scene/scatter';
import { rng } from '../../art/paint';
import { catalogueSizes, fitIn, type AnimalCount } from '../../scene/tankfit';
import { tankFromModel, type TankModel } from '../../data/tanks';
import { spaceFit } from '../../scene/space';
import type { SpaceLimit, TankSetup } from '../../scene/types';

/** The one view every tile is drawn from (the look picker's), so two tiles differ only in what is in the tank. */
export const TILE_VIEW = { az: 28, el: 16, zoom: 0.8 };

export interface TankChoice {
  model: TankModel;
  /** owned-required / owned-available = the tank the person has (Rev 03: only Required locks it; the pictures and the starting scene use it either way);
   *  suggested = we picked it from their limits / animals / the archetypes; picked = they changed our suggestion */
  source: 'owned-required' | 'owned-available' | 'suggested' | 'picked';
  /** what a suggestion rests on (Guided Setup Rev 03, lane GS3): the person's own tank, else known space / size limits / animals / budget (a provisional
   *  enclosure), else an editable example size when nothing at all is known. Never a question: all of it is a default the person can change. */
  basis: 'yours' | 'space' | 'size' | 'animals' | 'budget' | 'example' | 'picked';
  /** one short clause: why this tank (shown beside the label) */
  why: string;
}

const land = (arches: readonly Archetype[]) => arches.length > 0 && arches.every(a => a.env === 'terrarium');
const isBuildable = (a: Archetype) => a.support !== 'coming-soon' && !!recipeLook(a);

/** The tank every tile of a step is drawn in. The person's own tank when the brief names one; else a suggestion: the smallest catalogue tank that
 *  holds every drawn archetype of the step (the largest `minGallons`), their gallon floor (the brief's tank-size minimum) and any known animals
 *  (`fitIn`). `pick` is a catalogue tank id the person chose over the suggestion. */
export function tankChoice(arches: readonly Archetype[], o: { yours?: TankModel; use?: 'required' | 'available'; pick?: string; floorGal?: number; maxGal?: number; maxSpace?: SpaceLimit; budgetKnown?: boolean; animals?: AnimalCount[] } = {}): TankChoice | undefined {
  const drawn = arches.filter(isBuildable);
  if (!drawn.length) return undefined;
  const sizes = catalogueSizes(land(drawn));
  if (o.yours) return { model: o.yours, source: o.use === 'available' ? 'owned-available' : 'owned-required', basis: 'yours', why: o.use === 'available' ? 'your tank, free to swap' : 'your tank' };
  const picked = o.pick ? sizes.find(c => c.m.id === o.pick) : undefined;
  if (picked) return { model: picked.m, source: 'picked', basis: 'picked', why: 'the one you chose' };
  // the provisional enclosure (spec 4): known dimensions first (the biggest size that fits the space), else known size limits / animals / budget (the
  // smallest that suits), else an example size. A limit no size can meet is dropped rather than asked about: the suggestion stays editable.
  const archMin = Math.max(...drawn.map(a => minTank(a).ratedGal)), need = Math.max(o.floorGal ?? 0, archMin);
  const holds = (m: TankModel) => m.ratedGal >= need && (!o.maxGal || m.ratedGal <= o.maxGal) && (!o.animals?.length || !fitIn(o.animals, m)?.fails.length);
  const inSpace = (m: TankModel) => !o.maxSpace || spaceFit(tankFromModel(m), o.maxSpace).fits;
  const both = sizes.filter(c => holds(c.m) && inSpace(c.m)).map(c => c.m);
  if (o.maxSpace && both.length) return { model: both[both.length - 1], source: 'suggested', basis: 'space', why: 'the biggest that fits your space' };
  const ok = sizes.find(c => holds(c.m))?.m ?? sizes.find(c => c.m.ratedGal >= need)?.m ?? sizes[sizes.length - 1].m;
  if (o.animals?.length) return { model: ok, source: 'suggested', basis: 'animals', why: 'big enough for your animals' };
  if ((o.floorGal ?? 0) > archMin || o.maxGal) return { model: ok, source: 'suggested', basis: 'size', why: 'from your size limit' };
  if (o.budgetKnown) return { model: ok, source: 'suggested', basis: 'budget', why: 'the smallest that suits, to keep within your budget' };
  return { model: ok, source: 'suggested', basis: 'example', why: 'an example size: big enough for every look here' };
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

/** The scene Make It Your Own opens when animals were added at the Suitable Animals step: exactly what the density step showed (same tank, look, density stop,
 *  hardscape and plants), plus the animals and the gear their balanced build needs, the animals placed round the pieces already there. The look never moves
 *  and the density never changes the animals (Rev 03 section 4). `pv` is the Previews cache of the flow, so the bare scene is the one already drawn. */
export function sceneWithAnimals(pv: Previews, a: Archetype, tank: TankModel, animals: AnimalCount[], stop: number): TankSetup | undefined {
  const bare = pv.scenesOf(a, tank)?.stop(stop); if (!bare) return undefined;
  if (!animals.length) return bare;
  const hand = buildsFor(animals, tank)[2].setup, withAn = new Previews().scenesOf(a, tank, hand)?.stop(stop);
  if (!withAn) return undefined;
  const T: TankSetup = { ...withAn, items: structuredClone(bare.items), layout: structuredClone(bare.layout) };   // the pieces and the density settings the person saw
  shuffleFish(T, rng(11 + T.layout.id.length * 17 + T.fish.length), undefined, 100);
  return T;
}

export interface Preview { archetype: Archetype; scenes: Record<Density, TankSetup>; /** the scene of slider stop 0..4 (0 Open, 2 Balanced, 4 Full; 1 and 3 are drawn on first use), a copy */ stop(i: number): TankSetup; /** ms spent building the three named scenes */ buildMs: number }
export interface Shot { url: string; ms: number }

/** The three scenes of an archetype. With animals in hand the person's own tank is kept (roster, size, gear) and only the scape changes, drawn
 *  with the same density stops as recipes.ts; else one `recipeBase` in the chosen tank. */
export function previewOf(a: Archetype, tank: TankModel, inHand?: TankSetup): Preview | undefined {
  if (!isBuildable(a)) return undefined;
  const t0 = performance.now();
  if (inHand?.fish.length) {
    const look = recipeLook(a)!, animals = rosterOf(inHand), mode = a.recipe.plantMode ?? 'live';
    const scenes = {} as Record<Density, TankSetup>, made = new Map<number, TankSetup>();
    const at = (i: number) => { i = Math.max(0, Math.min(4, Math.round(i))); if (!made.has(i)) made.set(i, withBg(a, a.recipe.looks[0] === 'none' ? structuredClone(inHand) : scapeSetup({ animals, setup: inHand } as never, look, mode, inHand, { dens: recipeDensAt(a, i) }))); return structuredClone(made.get(i)!); };
    for (const d of DENSITIES) scenes[d] = at(d === 'open' ? 0 : d === 'balanced' ? 2 : 4);
    return { archetype: a, scenes, stop: at, buildMs: performance.now() - t0 };
  }
  const base = recipeBase(a, tank);
  if (!base) return undefined;
  const scenes = {} as Record<Density, TankSetup>;
  for (const d of DENSITIES) scenes[d] = sceneAt(base, d);
  return { archetype: a, scenes, stop: i => stopScene(base, i), buildMs: performance.now() - t0 };
}

/** Scenes and pictures, cached per (archetype, tank, roster) and per density. One draw at a time; `draw` returns '' when nothing can be pictured
 *  (no WebGL, a collapsed view), and that tile then keeps its flat colour. */
export class Previews {
  private scenes = new Map<string, Preview | null>();
  private shots = new Map<string, Shot>();
  /** every picture drawn so far: for the measurements the lane reports */
  readonly log: { id: string; stop: number; tank: string; buildMs: number; shotMs: number }[] = [];
  constructor(private draw?: (T: TankSetup) => string) {}

  private keyOf = (a: Archetype, tank: TankModel, inHand?: TankSetup) =>
    `${a.id}|${inHand?.fish.length ? 'hand:' + rosterOf(inHand).map(r => r.species + r.n).join(',') + ':' + tank.id : tank.id}`;
  scenesOf(a: Archetype, tank: TankModel, inHand?: TankSetup): Preview | undefined {
    const k = this.keyOf(a, tank, inHand);
    if (!this.scenes.has(k)) this.scenes.set(k, previewOf(a, tank, inHand) ?? null);
    return this.scenes.get(k) ?? undefined;
  }
  shotOf(a: Archetype, stop: number, tank: TankModel, inHand?: TankSetup): Shot | undefined { return this.shots.get(`${this.keyOf(a, tank, inHand)}|${stop}`); }
  /** Build (if needed) and draw one picture; undefined when it cannot be drawn. */
  render(a: Archetype, stop: number, tank: TankModel, inHand?: TankSetup): Shot | undefined {
    const k = `${this.keyOf(a, tank, inHand)}|${stop}`, have = this.shots.get(k);
    if (have) return have;
    if (!this.draw) return undefined;
    const t0 = performance.now(), pv = this.scenesOf(a, tank, inHand);
    if (!pv) return undefined;
    const t1 = performance.now(), sc = pv.stop(stop), url = this.draw({ ...sc, camera: { ...sc.camera, ...TILE_VIEW } });
    if (!url) return undefined;
    const shot = { url, ms: Math.round(performance.now() - t0) };
    this.shots.set(k, shot);
    this.log.push({ id: a.id, stop, tank: tank.name, buildMs: Math.round(t1 - t0), shotMs: Math.round(performance.now() - t1) });
    return shot;
  }
}
