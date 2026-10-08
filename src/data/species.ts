import data from './species.json';

export interface Species {
  id: string;
  name: string;
  sci: string;
  tl: number;     // adult total length, mm == card width
  aspect: number; // card height / width
  art: string;
}

export const SPECIES: Species[] = data.species;
const byId = new Map(SPECIES.map(s => [s.id, s]));

export const getSpecies = (id: string) => byId.get(id);
export const hasSpecies = (id: string) => byId.has(id);

/** Case- and accent-insensitive search over common and scientific names; prefix matches rank first. */
export function searchSpecies(q: string): Species[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...SPECIES].sort((a, b) => a.name.localeCompare(b.name));
  const scored: [number, Species][] = [];
  for (const s of SPECIES) {
    const hay = norm(s.name + ' ' + s.sci + ' ' + s.id), words = hay.split(/\s+/);
    if (!terms.every(t => hay.includes(t))) continue;
    const prefix = terms.filter(t => words.some(w => w.startsWith(t))).length;
    scored.push([prefix, s]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}
