// Where each species lives in the wild (lane OR1, R104, 2026-11-16). One row per species id in origin.json:
//   c    continent / ocean-region keys (several when the range crosses one), r the short region line,
//   s    where the range comes from (FishBase, SeaLifeBase, AmphibiaWeb, Reptile Database, World Spider Catalog),
//   est  1 = we are less sure of the range or of the species' identity: shown as "est.",
//   form 'captive-bred' = the animal sold is a hobby form; the range is the wild ancestor's.
// A species with no row simply shows no origin (never a guess).
import raw from './origin.json';

export const CONTINENTS = [
  ['asia', 'Asia'], ['africa', 'Africa'], ['samerica', 'South America'], ['namerica', 'North America'], ['camerica', 'Central America'],
  ['oceania', 'Australia / Oceania'], ['europe', 'Europe'],
  ['indopacific', 'Indo-Pacific'], ['caribbean', 'Caribbean / West Atlantic'], ['redsea', 'Red Sea'],
] as const;
export type Continent = typeof CONTINENTS[number][0];
export const CONTINENT_NAME = Object.fromEntries(CONTINENTS) as Record<Continent, string>;

export interface Origin { c: Continent[]; r: string; s: string; est?: 1; form?: 'captive-bred' }
const DATA = raw as unknown as Record<string, Origin>;

export const originOf = (id: string): Origin | undefined => DATA[id];
export const originIds = () => Object.keys(DATA);
/** Does the species' range touch this continent? */
export const inContinent = (id: string, c: Continent) => !!DATA[id]?.c.includes(c);
/** The info-screen line: "South America", "Asia and Africa" ... */
export const continentText = (o: Origin) => o.c.map(c => CONTINENT_NAME[c]).join(', ').replace(/, ([^,]*)$/, ' and $1');
/** The region line with the honest marks: a hobby form says so (its range is the wild ancestor's), "est." where we are unsure. */
export const regionText = (o: Origin) => `${o.form === 'captive-bred' ? 'Captive-bred form; wild range: ' : ''}${o.form === 'captive-bred' ? o.r.replace(/^Wild ancestor: /, '') : o.r}${o.est ? ' (est.)' : ''}`;
