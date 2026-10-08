import { artMeta } from '../art/fishgen';
import { snailAspect, snailRest } from '../art/snails';
import data from './species.json';

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
  /** v (in widths, + down) of the lowest point of the drawing; a resting animal's centre sits this far above the floor. */
  rest: number;
  note?: string;
}

interface RawSpecies { id: string; name: string; sci: string; tl: number; art: string; aspect?: number; zone?: string; kind?: string; note?: string }

function resolve(r: RawSpecies): Species {
  const kind = r.kind === 'snail' ? 'snail' as const : undefined, zone = r.zone === 'bottom' ? 'bottom' as const : undefined;
  const meta = kind ? { aspect: snailAspect(r.art, 'side'), rest: snailRest(r.art) } : artMeta(r.art);
  const aspect = r.aspect ?? meta?.aspect ?? 0.4, rest = meta?.rest ?? aspect / 2;
  return { id: r.id, name: r.name, sci: r.sci, tl: r.tl, art: r.art, aspect, rest, zone, kind, note: r.note };
}

export const SPECIES: Species[] = (data.species as RawSpecies[]).map(resolve);
const byId = new Map(SPECIES.map(s => [s.id, s]));

export const getSpecies = (id: string) => byId.get(id);
export const hasSpecies = (id: string) => byId.has(id);
/** This fish's total length (mm): its custom size if set, else the species' adult length. */
export const fishTL = (f: { tl?: number }, sp: Species) => f.tl ?? sp.tl;
/** Rests on the substrate (bottom dwellers and floor snails). */
export const restsOnFloor = (sp: Species, surface?: string) => sp.zone === 'bottom' || (sp.kind === 'snail' && (surface ?? 'floor') === 'floor');

/** Case- and accent-insensitive search over common and scientific names; prefix matches rank first. */
export function searchSpecies(q: string): Species[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...SPECIES].sort((a, b) => a.name.localeCompare(b.name));
  const scored: [number, Species][] = [];
  for (const s of SPECIES) {
    const tags = (s.zone === 'bottom' ? ' bottom' : '') + (s.kind === 'snail' ? ' snail' : '');
    const hay = norm(s.name + ' ' + s.sci + ' ' + s.id + tags), words = hay.split(/\s+/);
    if (!terms.every(t => hay.includes(t))) continue;
    const prefix = terms.filter(t => words.some(w => w.startsWith(t))).length;
    scored.push([prefix, s]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}
