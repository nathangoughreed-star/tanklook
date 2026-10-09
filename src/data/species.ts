import { artMeta } from '../art/fishgen';
import { herpMeta } from '../art/herps';
import { snailAspect, snailRest } from '../art/snails';
import data from './species.json';

export type Habitat = 'water' | 'land' | 'both';

export interface Species {
  id: string;
  name: string;
  sci: string;
  tl: number;     // typical adult total length, mm == card width (snails: crawling length)
  aspect: number; // card height / width (snails: the side view on the substrate)
  art: string;
  /** 'bottom': always rests on the substrate; dragging slides it along the floor. */
  zone?: 'bottom';
  /** 'snail': clings to the substrate or a glass pane. */
  kind?: 'snail';
  /** Where it lives: 'water' (fish; hidden in a dry tank), 'land' (rests on ground above the water line), 'both' (on land, or
   * swimming where the water is deep enough for it). Snails are 'both'. */
  habitat: Habitat;
  /** v (in widths, + down) of the lowest point of the drawing; a resting animal's centre sits this far above the floor. */
  rest: number;
  /** How a group of 3+ swims (steers Shuffle only): 'school' tight and aligned, 'shoal' loose. Absent = keeps apart. */
  group?: 'school' | 'shoal';
  /** The part of the water column a swimmer favours (steers Shuffle only). Absent = mid water. */
  level?: 'top' | 'low';
  note?: string;
}

interface RawSpecies { id: string; name: string; sci: string; tl: number; art: string; aspect?: number; zone?: string; kind?: string; group?: string; level?: string; habitat?: string; note?: string }

function resolve(r: RawSpecies): Species {
  const kind = r.kind === 'snail' ? 'snail' as const : undefined, zone = r.zone === 'bottom' ? 'bottom' as const : undefined;
  const meta = kind ? { aspect: snailAspect(r.art, 'side'), rest: snailRest(r.art) } : artMeta(r.art) ?? herpMeta(r.art);
  const aspect = r.aspect ?? meta?.aspect ?? 0.4, rest = meta?.rest ?? aspect / 2;
  const habitat: Habitat = kind ? 'both' : r.habitat === 'land' || r.habitat === 'both' ? r.habitat : 'water';
  const group = r.group === 'school' || r.group === 'shoal' ? r.group : undefined, level = r.level === 'top' || r.level === 'low' ? r.level : undefined;
  return { id: r.id, name: r.name, sci: r.sci, tl: r.tl, art: r.art, aspect, rest, zone, kind, habitat, group, level, note: r.note };
}

export const SPECIES: Species[] = (data.species as RawSpecies[]).map(resolve);
const byId = new Map(SPECIES.map(s => [s.id, s]));

export const getSpecies = (id: string) => byId.get(id);
export const hasSpecies = (id: string) => byId.has(id);
/** This fish's total length (mm): its custom size if set, else the species' adult length. */
export const fishTL = (f: { tl?: number }, sp: Species) => f.tl ?? sp.tl;
/** Always rests on the ground (bottom dwellers, land animals and floor snails); 'both' animals depend on the water at their spot. */
export const restsOnFloor = (sp: Species, surface?: string) => sp.zone === 'bottom' || sp.habitat === 'land' || (sp.kind === 'snail' && (surface ?? 'floor') === 'floor');
/** Needs water: hidden in a dry tank. */
export const needsWater = (sp: Species) => sp.habitat === 'water';
/** Short list tag: snail, bottom, land or amphibious. */
export const speciesTag = (sp: Species) => sp.kind === 'snail' ? 'snail' : sp.zone === 'bottom' ? 'bottom' : sp.habitat === 'land' ? 'land' : sp.habitat === 'both' ? 'amphibious' : '';

/** Case- and accent-insensitive search over common and scientific names; prefix matches rank first. */
export function searchSpecies(q: string): Species[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...SPECIES].sort((a, b) => a.name.localeCompare(b.name));
  const scored: [number, Species][] = [];
  for (const s of SPECIES) {
    const tags = ' ' + speciesTag(s);
    const hay = norm(s.name + ' ' + s.sci + ' ' + s.id + tags), words = hay.split(/\s+/);
    if (!terms.every(t => hay.includes(t))) continue;
    const prefix = terms.filter(t => words.some(w => w.startsWith(t))).length;
    scored.push([prefix, s]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}
