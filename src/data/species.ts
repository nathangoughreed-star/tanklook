import { artMeta } from '../art/fishgen';
import { herpMeta } from '../art/herps';
import { snailAspect, snailRest } from '../art/snails';
import type { Surface } from '../scene/types';
import data from './species.json';

export type Habitat = 'water' | 'land' | 'both';
/** The Animals panel's sub menus, in menu order (Nathan 2026-10-13). */
export const CATEGORIES = [
  ['fw-fish', 'Freshwater fish'], ['fw-invert', 'Freshwater inverts'], ['sw-fish', 'Saltwater fish'], ['sw-invert', 'Saltwater inverts'],
  ['amphibian', 'Amphibians'], ['reptile', 'Reptiles'], ['land-invert', 'Land inverts'],
] as const;
export type Category = typeof CATEGORIES[number][0];

export interface Species {
  id: string;
  name: string;
  sci: string;
  tl: number;     // typical adult total length, mm == card width (snails: crawling length)
  aspect: number; // card height / width (snails: the side view on the substrate)
  art: string;
  /** 'bottom': always rests on the substrate; dragging slides it along the floor. */
  zone?: 'bottom';
  /** 'snail': clings to the substrate, a glass pane or hardscape. */
  kind?: 'snail';
  /** Surfaces it can cling to (steers Shuffle and drags): snails and plecos anywhere, shrimp on the floor or hardscape.
   * Absent = the floor (or the water) only. */
  surfaces?: Surface[];
  /** Where it lives: 'water' (fish; hidden in a dry tank), 'land' (rests on ground above the water line), 'both' (on land, or
   * swimming where the water is deep enough for it). Snails are 'both'. */
  habitat: Habitat;
  /** Marine species (added 2026-10-13); absent = freshwater. Salt tanks list only these, fresh tanks only the rest. */
  salt?: boolean;
  /** The Animals sub menu it is listed under. */
  cat: Category;
  /** v (in widths, + down) of the lowest point of the drawing; a resting animal's centre sits this far above the floor. */
  rest: number;
  /** How a group of 3+ swims (steers Shuffle only): 'school' tight and aligned, 'shoal' loose. Absent = keeps apart. */
  group?: 'school' | 'shoal';
  /** Kept as a pair (clownfish, Banggai cardinals): Add starts at 2. */
  pair?: boolean;
  /** The part of the water column a swimmer favours (steers Shuffle only). Absent = mid water. */
  level?: 'top' | 'low';
  note?: string;
  /** 'snake': a limbless body (render/snake3d.ts); its pose family rides in `Fish.bend` and Shuffle picks its size by life stage (lane BP). */
  body?: 'snake';
  /** Texture / material cache key: the id, or `<id>~f` for the female look. */
  look: string;
  /** Sexually dimorphic species: the female look (own drawing, adult length, card aspect). The species itself is the male. */
  female?: Species;
  sex?: Sex;
}
/** 'f' = female; absent = male (or a species drawn the same either way). */
export type Sex = 'f';

interface RawSpecies { id: string; cat?: string; name: string; sci: string; tl: number; art: string; aspect?: number; zone?: string; kind?: string; group?: string; pair?: boolean; level?: string; habitat?: string; cling?: string; note?: string; body?: string; female?: { art: string; tl: number } }

function resolve(r: RawSpecies): Species {
  const kind = r.kind === 'snail' ? 'snail' as const : undefined, zone = r.zone === 'bottom' ? 'bottom' as const : undefined;
  const meta = kind ? { aspect: snailAspect(r.art, 'side'), rest: snailRest(r.art) } : artMeta(r.art) ?? herpMeta(r.art);
  const aspect = r.aspect ?? meta?.aspect ?? 0.4, rest = meta?.rest ?? aspect / 2;
  const habitat: Habitat = kind ? 'both' : r.habitat === 'land' || r.habitat === 'both' ? r.habitat : 'water';
  const group = r.group === 'school' || r.group === 'shoal' ? r.group : undefined, level = r.level === 'top' || r.level === 'low' ? r.level : undefined;
  const surfaces: Surface[] | undefined = kind || r.cling === 'any' ? ['floor', 'glass', 'hardscape'] : r.cling === 'hardscape' ? ['floor', 'hardscape']
    : r.cling === 'top' ? ['floor', 'top', 'hardscape'] : undefined; // 'top': perches on the bottom, on hardscape or leaves, or floats at the water surface, never on glass (dwarf frog)
  const sp: Species = { id: r.id, name: r.name, sci: r.sci, tl: r.tl, art: r.art, aspect, rest, zone, kind, surfaces, habitat, cat: CATEGORIES.some(c => c[0] === r.cat) ? r.cat as Category : 'fw-fish', group, level, note: r.note, look: r.id, ...(r.pair ? { pair: true } : {}), ...(r.body === 'snake' ? { body: 'snake' as const } : {}) };
  if ((r as { salt?: unknown }).salt === true) sp.salt = true; // marine (lane B hook 2026-10-13; absent = freshwater)
  if (r.female) {
    const m = (artMeta(r.female.art) ?? herpMeta(r.female.art))!;
    sp.female = { ...sp, art: r.female.art, tl: r.female.tl, aspect: m.aspect, rest: m.rest, look: r.id + '~f', sex: 'f', female: undefined };
  }
  return sp;
}

export const SPECIES: Species[] = (data.species as RawSpecies[]).map(resolve);
const byId = new Map(SPECIES.map(s => [s.id, s]));

export const getSpecies = (id: string) => byId.get(id);
export const hasSpecies = (id: string) => byId.has(id);
/** The look a fish is drawn and sized with: the species, or its female for a female of a dimorphic species. */
export const speciesOf = (f: { species: string; sex?: Sex }) => { const sp = byId.get(f.species); return sp && f.sex === 'f' && sp.female ? sp.female : sp; };
/** This fish's total length (mm): its custom size if set, else the adult length of its sex. */
export const fishTL = (f: { tl?: number; sex?: Sex }, sp: Species) => f.tl ?? (f.sex === 'f' && sp.female ? sp.female.tl : sp.tl);
/** Always rests on the ground or hardscape (bottom dwellers, land animals and snails not on glass); 'both' animals depend on the water at their spot. */
export const restsOnFloor = (sp: Species, surface?: string) => surface !== 'glass' && surface !== 'top' && (sp.zone === 'bottom' || sp.habitat === 'land' || sp.kind === 'snail');
/** Can it cling to this surface? */
export const clingsTo = (sp: Species, surface: Surface) => !!sp.surfaces?.includes(surface);
/** May sit on the top of a plant leaf: a water or snail animal that uses hardscape (not land climbers, which perch on dry wood). */
export const onLeaves = (sp: Species) => sp.habitat !== 'land' && clingsTo(sp, 'hardscape');
/** How level a leaf must be for it to sit there (the y of its normal): a perching animal (dwarf frog: no glass) needs a fairly flat
 *  one, one that clings (snail, oto: they have glass) a steeper one. 0 = not on leaves. */
export const leafUp = (sp: Species) => !onLeaves(sp) ? 0 : clingsTo(sp, 'glass') ? 0.3 : 0.6;
/** Needs water: hidden in a dry tank. */
export const needsWater = (sp: Species) => sp.habitat === 'water';
/** Short list tag: snail, bottom, land or amphibious. */
export const speciesTag = (sp: Species) => sp.kind === 'snail' ? 'snail' : sp.zone === 'bottom' ? 'bottom' : sp.habitat === 'land' ? 'land' : sp.habitat === 'both' ? 'amphibious' : '';

/** Case- and accent-insensitive search over common and scientific names; prefix matches rank first. */
export function searchSpecies(q: string, cat?: Category): Species[] {
  const pool = cat ? SPECIES.filter(s => s.cat === cat) : SPECIES;
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  const scored: [number, Species][] = [];
  for (const s of pool) {
    const tags = ' ' + speciesTag(s);
    const hay = norm(s.name + ' ' + s.sci + ' ' + s.id + tags), words = hay.split(/\s+/);
    if (!terms.every(t => hay.includes(t))) continue;
    const prefix = terms.filter(t => words.some(w => w.startsWith(t))).length;
    scored.push([prefix, s]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}
