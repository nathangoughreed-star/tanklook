// Where every advice number comes from (2026-10-20). Read only by the source audit (test/sources.test.ts, scripts/source-audit.ts),
// never by the app, so nothing here reaches the bundle. Two parts:
//   RULES     data values (care, chemistry, climate, herp rules, light needs, body mass, space factors, costs, products), by target and path
//   FORMULAS  engine constants and inline formula numbers (stocking, nitrogen, light, tech, tank fit ...), by file and symbol
// Status, strongest first:
//   cited       a registered source (or the row's own url) gives this value; anyone can check it
//   fitted      fitted by a committed script to a named tool or dataset (says so: a fit is not a biological claim)
//   derived     worked out from cited values by a stated method
//   researched  a committed research note covers this value and lists the pages it read, but the value is not tied to one page
//   claimed     the code names a source or "common practice" for a group of values, not per value; needs a per-value check
//   assumption  our own choice, and the rule says why
// A value no rule covers is UNSOURCED. The ratchet test fails when that count rises. NEVER tag a value with a source that does
// not state it: if the source disagrees, change the value or say so in `why`.
import { AIRDATA, WATER } from './climatedata';
import { CHEM } from './waterchem';
import bm from './bodymass.json';
import { FILTER_MEDIA_L } from './filtermedia';
import { NEEDS, isCoralNeed, isLand } from '../scene/lightneeds';
import groupsMd from '../../research/groups-sources.md?raw';
import { CARE } from './care';
import { AIR } from './climate';
import speciesJson from './species.json';
import tankminJson from './tankmin.json';

export type Status = 'cited' | 'fitted' | 'derived' | 'researched' | 'claimed' | 'assumption';
/** What TankLook did with the source (UF, research/rules-spec.md section 2, 2026-10-21), a second axis beside status:
 *  measured             a measurement the source reports (a population, a lab reading)
 *  source-stated        the source states this value, or the range it sits at the edge of, as advice or spec
 *  interpretation       TankLook's reading or judgement: thresholds, bands, a pick between pages, our own estimate
 *  derived              calculated from stated values by a stated method (fit, median, unit conversion, formula)
 *  conservative-default a cautious pick inside or beyond what sources state (the safer side of a range, a safety margin)
 *  A citation for "keep in groups" never vouches for "5 or more": that threshold is basis interpretation, and `says` holds
 *  what the page actually says. */
export type Basis = 'measured' | 'source-stated' | 'interpretation' | 'derived' | 'conservative-default';
export const BASES: Basis[] = ['measured', 'source-stated', 'interpretation', 'derived', 'conservative-default'];
export const BASIS_NAME: Record<Basis, string> = { measured: 'measured', 'source-stated': 'source-stated', interpretation: 'TankLook interpretation', derived: 'derived calculation', 'conservative-default': 'conservative default' };
export const STATUSES: Status[] = ['cited', 'fitted', 'derived', 'researched', 'claimed', 'assumption'];
export interface Rule {
  /** dot path under the target; `*` = one segment, `**` = any number of segments, `{a,b}` = either. Later rules win. */
  path: string;
  status: Status;
  basis: Basis;
  /** what the source itself says, in short; required for basis measured / source-stated / conservative-default with an outside source */
  says?: string;
  /** ids in src/data/sources.json */
  src?: string[];
  why: string;
  /** cited only if the value's row (nearest object up the path) has an http `url` / `priceUrl` / `source` and is not `est: true`;
   *  otherwise this rule is skipped and an earlier one applies */
  rowUrl?: true;
}
export interface Formula { file: string; symbols: string[]; status: Status; basis: Basis; says?: string; src?: string[]; why: string }
/** Top-level constants in the engine files that are not advice (rendering, UI, timing); the audit lists them, never counts them. */
export interface Excluded { file: string; symbols: string[]; why: string }

const PLANT_SRC = ['par-chart-nathan', 'tropica', 'walstad', 'barr-report', 'aquarium-coop'];
const REEF_SRC = ['par-chart-nathan', 'reef-par-charts', 'brs-par'];
const MASS = bm.species as Record<string, { src: string }>;
/** research/groups-sources.md: one url per species for the group data (lane P1); `(est)` = judgement, not quoted from the page. */
const GROUP_ROWS = [...groupsMd.matchAll(/^- \*\*(\w+)\*\*[^:]*: (https?:\S+?)(?: \((est)\))?\.?(?=\s|$)/gm)].map(m => ({ id: m[1], url: m[2], est: !!m[3] }));
const GROUP_FIELDS = '{bands,max,sexed,maxDepthMm,minLengthMm,minWidthMm,minAreaCm2}.**';

const TANKMIN = (tankminJson as { species: Record<string, Record<string, { mark?: string } | string>> }).species;
export const RULES: Record<string, Rule[]> = {
  // lane MM (2026-10-21): the decided tank-minimum lines. A line whose page states its conditions is cited by its own url; "(est)" = the
  // page states no conditions (researched); "derived (est)" = a gallon figure turned into the smallest catalogue tank holding it.
  TANKMIN: [
    { path: '**', status: 'researched', basis: 'interpretation', says: "the page gives a tank size but states no conditions (dimensions, number of animals)", src: ['tank-min-sourcing'], why: 'stated on the page named in the row, but without conditions (est), or a depth note (MX7); quotes re-fetched' },
    { path: '*.{red,green,hRed,hGreen,vol}.*', status: 'cited', basis: 'source-stated', says: "the page states this tank size (url and quote in the row); which line it is (red minimum / green Recommended) is Nathan's decision", src: ['tank-min-sourcing'], rowUrl: true, why: 'stated on the page named in the row (url, quote re-fetched), decided as a red (minimum) or green (Recommended) line by Nathan, MX1-MX9' },
    ...Object.entries(TANKMIN).flatMap(([id, d]) => (['red', 'green'] as const).filter(k => typeof d[k] === 'object' && (d[k] as { mark?: string }).mark === 'derived (est)')
      .map((k): Rule => ({ path: `${id}.${k}.*`, status: 'derived', basis: 'derived', src: ['tank-min-sourcing'], why: "derived (est): a page's gallon figure as the smallest catalogue tank holding it, inner L x W (scripts/tank-min-sources.mjs refTank)" }))),
    // S238b (Nathan 2026-10-26, "rec"): the three small Boraras take the chili rasbora's gallon-derived minimum (8 gal cube) as the red line; Seriously Fish's 45 x 30 cm stays as their green (Recommended) line
    ...['merah', 'exclamation', 'dwarfrasbora'].map((id): Rule => ({ path: `${id}.red.*`, status: 'assumption', basis: 'interpretation', says: "Fishkeeping World (chili rasbora, Boraras brigittae): 6-8 gallons for a school of 8-10", src: ['tank-min-sourcing'], why: "precedent: the congener chili rasbora's 8 gal figure (turned into the 8 gal cube) is applied to this species; no page about this species states a gallon figure; Nathan chose it 2026-10-26" })),
    // lane CB (2026-10-21): a value combined from 2+ sites is derived (weighted median, research/sourcing/combined.md); from one site it stays cited by its row url
    ...Object.entries(TANKMIN).flatMap(([id, d]) => (['red', 'green', 'hRed', 'hGreen', 'vol'] as const)
      .filter(k => typeof d[k] === 'object' && ((d[k] as { combined?: unknown[] }).combined?.length ?? 0) >= 2)
      .map((k): Rule => ({ path: `${id}.${k}.*`, status: 'derived', basis: 'derived', src: ['tank-min-sourcing'], why: `weighted median of ${(d[k] as { combined: unknown[] }).combined.length} sites (lane CB, research/sourcing/combined.md; the pages are in the row's combined list)` }))),
  ],
  SPECIES: [
    // S238: Seriously Fish gives standard length for the nano fish; the species tl is total length, taken as 1.2 x SL (our estimate)
    ...[['greenneon', 25], ['merah', 20], ['exclamation', 16], ['dwarfrasbora', 25]].map(([id, sl]): Rule => ({ path: `${id}.tl`, status: 'derived', basis: 'derived', says: `Seriously Fish: ${sl} mm SL`, src: ['seriouslyfish.com'], why: `total length = 1.2 x ${sl} mm standard length (the factor is our estimate)` })),
    { path: 'cpo.tl', status: 'cited', basis: 'source-stated', says: 'The Shrimp Farm: "a maximum size of around 2 inches (5 cm)"', src: ['theshrimpfarm.com'], why: 'body length' },
    { path: 'cajundwarf.tl', status: 'assumption', basis: 'interpretation', says: 'Aquatic Arts: average adult size 1.6 inches (4 cm)', src: ['aquaticarts.com'], why: 'the retailer average adult size' },
    { path: 'rswcrayfish.tl', status: 'cited', basis: 'source-stated', says: 'Guidarium: "maximum size of approximately 12 cm"', src: ['guidarium.com'], why: 'body length' },
    { path: 'redclaw.tl', status: 'assumption', basis: 'interpretation', says: 'Fishkeeper: up to 20 cm (7.9 in)', src: ['fishkeeper.co.uk'], why: 'the page 20 cm maximum' },
    { path: 'thaicrab.tl', status: 'cited', basis: 'source-stated', says: 'Aquariadise: "their carapace grows to a maximum size of around 1 cm"; Aquatic Arts: about 0.5 inch', src: ['aquariadise.com'], why: 'carapace width, 10 mm; the card is drawn 12 mm across with its legs' },
    { path: 'asellus.tl', status: 'cited', basis: 'source-stated', says: 'Pond Informer: average size 5 - 12 mm', src: ['pondinformer.com'], why: 'the top of the page average size' },
  ],
  BODYMASS: Object.entries(MASS).map(([id, m]): Rule =>
    m.src === 'fishbase-bayes' ? { path: `${id}.*`, status: 'cited', basis: 'source-stated', says: "FishBase species summary: a and b of the length-weight relationship (Bayesian body-shape estimate)", src: ['fishbase-lw-bayes'], why: 'a, b from the FishBase species summary (scripts/lw-sources.json)' }
    : m.src === 'fishbase-measured' ? { path: `${id}.*`, status: 'cited', basis: 'measured', says: "FishBase: a and b fitted to a measured population (Florida)", src: ['fishbase-lw-measured'], why: 'a, b of a measured FishBase population' }
    : m.src === 'sealifebase-congener' ? { path: `${id}.*`, status: 'cited', basis: 'source-stated', says: "SeaLifeBase: a and b of a congener's measured length-weight relationship", src: ['sealifebase-lw-congener'], why: 'a, b of a congener measured by SeaLifeBase (turbo: Turbo cornutus; research/snail-load.md)' }
    : { path: `${id}.*`, status: 'claimed', basis: 'interpretation', why: 'FishBase has no length-weight row (shrimp, snails, herps): a "keeper-reference" typical adult mass turned into a, b; the reference was not recorded' }),
  SPACE_FACTOR: [{ path: '**', status: 'fitted', basis: 'derived', src: ['aqadvisor', 'aq-compare'], why: 'AqAdvisor % over ours for a one-species 55 gal tank (scripts/space-factors.mjs)' }],
  SPACE_FACTOR_CLASS: [{ path: '**', status: 'fitted', basis: 'derived', src: ['aqadvisor', 'aq-compare'], why: 'median of the fitted species factors in each class' }],
  CARE: [
    // care, minL, temper, prey, solo / slow / nip, coral and group have no rule: care.ts calls them estimates from common practice.
    // Kept against the pages (Nathan 2026-10-20: trust the research where independent sources agree; here they split): see research/sourcing/decisions.md.
    { path: 'yellowtang.care', status: 'assumption', basis: 'interpretation', says: "LiveAquaria: care level Easy", why: 'one retailer page (LiveAquaria) says Easy; tangs are disease-prone in practice, so we keep intermediate (2)' },
    { path: 'betta.care', status: 'assumption', basis: 'interpretation', says: "Seriously Fish: Moderate; Fishkeeping World: fine for first-time owners", why: 'pages split: Seriously Fish says Moderate, Fishkeeping World calls it fine for first-time owners; we keep beginner (1)' },
    { path: 'mystery.minL', status: 'assumption', basis: 'interpretation', says: "Aquarium Co-Op: 5 US gal for one mystery snail, 10 gal more forgiving", why: 'Aquarium Co-Op: 5 US gal (19 L) for one mystery snail, 10 gal more forgiving; the tank-minimum gate no longer reads minL (lane MM: its 5 gal is the advisory Recommended mark in tankmin.json)' },
    { path: 'ballpython.minL', status: 'assumption', basis: 'conservative-default', says: "PetSmart, BeWild: a 40 gal tank; Zen Habitats, Reptile Direct: 4 x 2 x 2 ft (about 120 gal) is the adult minimum", why: 'pages split: PetSmart and BeWild accept a 40 gal (about 151 L) tank, Zen Habitats and Reptile Direct call 4x2x2 ft (about 120 gal, 450 L) the adult minimum and the 40 gal rule outdated; we keep the larger modern figure' },
    // S230 (2026-10-26): ReptiFiles feeding chapter, opened; it names rodents, birds and lizards as prey, never amphibians or snails
    { path: 'ballpython.prey.mm', status: 'assumption', basis: 'interpretation', says: 'ReptiFiles: "feeders that are 10-15% of your ball python\'s body weight"; prey "rodents, birds, and lizards"', src: ['reptifiles.com'], why: 'the source states what it takes (small mammals, birds, lizards) and a weight rule for feeders, not a length line; 600 mm (about 24 in, a bit over half an adult\'s length) is our reading, so any small animal up to it is unsafe beside a ball python; amphibians and snails are not named as prey but one tankmate is never advised (solo), so the line stays' },
    // invertebrate predation (lane IP 2026-10-22, research/sourcing/R6-invert-prey.json): which prey and the large-adult line are judgement
    { path: 'gbr.prey.cats.*', status: 'assumption', basis: 'interpretation', says: "UKAPS keepers: rams ate a cherry colony, juvenile shrimp; larger shrimp left alone", src: ['ukaps.org', 'aquaticarts.com'], why: 'shrimp are the stated prey; est.' },
    { path: 'gbr.prey.inverts', status: 'assumption', basis: 'interpretation', says: "Aquatic Arts: safe to keep with larger species of shrimp, snails", src: ['aquaticarts.com'], why: 'the pages report shrimp eaten and none reports snails, so the rule targets shrimp; est.' },
    { path: 'gbr.prey.young', status: 'assumption', basis: 'interpretation', says: "Aquatic Arts: safe with larger species of shrimp; UKAPS: larger shrimp fare a little better", src: ['aquaticarts.com', 'ukaps.org'], why: '60 mm puts an adult Amano (51 mm) under the keep-large-adults advisory; the length is est.' },
    { path: 'angel.prey.inverts', status: 'claimed', basis: 'interpretation', why: 'of the invertebrates angelfish take shrimp, not snails (common practice, no page opened); est. (lane IP 2026-10-22)' },
    // lane CP (2026-10-22): flags added after an outside stocking audit; common practice, no page opened
    ...['dwarfgourami', 'honeygourami', 'gourami'].map((id): Rule => ({ path: `${id}.feelers`, status: 'claimed', basis: 'interpretation', why: 'the long pelvic feelers of gouramis are a classic target for fin nippers (common practice, no page opened); est. (lane CP)' })),
    { path: 'peapuffer.alone', status: 'claimed', basis: 'interpretation', why: 'pea puffers are usually advised for a species-only tank: they nip slow fish and fins (common practice and the audit, no page opened); est. (lane CP)' },
    ...[['gbr', 'rams'], ['bolivianram', 'rams'], ['cockatoo', 'cockatoo dwarf cichlids'], ['angel', 'angelfish']].map(([id, who]): Rule => ({ path: `${id}.guard`, status: 'assumption', basis: 'interpretation', why: `breeding ${who} are widely said to guard a spawning site against tankmates; the guarded floor is our estimate (lane CP2)` })),
    ...['kribensis', 'cockatoo', 'peapuffer'].map((id): Rule => ({ path: `${id}.cover`, status: 'claimed', basis: 'interpretation', why: 'cave spawners want a cave; pea puffers want dense planting to break sight lines (common practice and groups.ts notes, no page opened); est. (lane CP2)' })),
    { path: 'kribensis.guard', status: 'assumption', basis: 'interpretation', why: 'a breeding krib pair is widely said to claim a large share of a small tank; 1800 cm2 (about 2 x 1 ft) is our estimate of the guarded patch (lane CP)' },
    // S238 (2026-10-26): nano schoolers, crayfish, micro crab, isopod. Pages opened that day; quotes are the pages' words.
    ...['greenneon', 'merah', 'exclamation', 'dwarfrasbora'].flatMap((id): Rule[] => [
      { path: `${id}.care`, status: 'cited', basis: 'source-stated', says: 'Seriously Fish: Moderate (7 of 8): "Rated moderate because it needs a well-established tank and stable water."', src: ['seriouslyfish.com'], why: 'the care rating the page gives, as Intermediate (2)' },
      { path: `${id}.minL`, status: 'cited', basis: 'source-stated', says: 'Seriously Fish: a base of 45 x 30 cm (18 x 12 in) or larger, about 41 litres (11 US gal)', src: ['seriouslyfish.com'], why: 'the volume the page states for its recommended base' },
      { path: `${id}.temper`, status: 'cited', basis: 'source-stated', says: 'Seriously Fish: "very peaceful" (peaceful for the green neon), timid, not an ideal community fish at this size', src: ['seriouslyfish.com'], why: 'peaceful (0); the timidity is the group message, not temper' },
      { path: `${id}.group`, status: 'cited', basis: 'source-stated', says: 'Seriously Fish: "a group of at least 8-10 specimens" (green neon: "8-10 specimens is the minimum recommended purchase")', src: ['seriouslyfish.com'], why: 'the smallest group is 8, the low end of the pages 8-10' },
    ]),
    { path: 'thaicrab.care', status: 'cited', basis: 'source-stated', says: 'Aquatic Arts: moderate difficulty and peaceful', src: ['aquaticarts.com'], why: 'moderate (2)' },
    { path: 'thaicrab.temper', status: 'cited', basis: 'source-stated', says: 'Aquatic Arts: peaceful; Aquariadise: practically defenseless', src: ['aquaticarts.com', 'aquariadise.com'], why: 'peaceful (0)' },
    { path: 'thaicrab.minL', status: 'cited', basis: 'source-stated', says: 'Aquariadise and Aquatic Arts: a minimum tank of 5 gallons (19 L)', src: ['aquariadise.com', 'aquaticarts.com'], why: 'two pages give 5 gal' },
    { path: 'thaicrab.group', status: 'cited', basis: 'source-stated', says: 'Aquariadise: "in groups of at least five"', src: ['aquariadise.com'], why: 'the smallest group the page names' },
    { path: 'cajundwarf.minL', status: 'cited', basis: 'source-stated', says: 'Aquatic Arts: minimum tank size 5 gallons', src: ['aquaticarts.com'], why: 'the retailer page minimum (19 L); other care sheets say 30 L for a pair' },
    { path: 'cpo.minL', status: 'cited', basis: 'source-stated', says: 'The Shrimp Farm: "Something around 10 gallons (38L) would be a great place to start."', src: ['theshrimpfarm.com'], why: 'a starting size, not a stated minimum' },
    { path: 'rswcrayfish.minL', status: 'cited', basis: 'source-stated', says: 'Guidarium: "minimum volume of 75 litres and a tank length of at least 60 cm"', src: ['guidarium.com'], why: 'the volume the page states for one adult' },
    { path: 'redclaw.minL', status: 'assumption', basis: 'interpretation', says: 'Fishkeeper gives no minimum ("very spacious"); a search-result summary of one care guide (page not opened) said 200 L for an adult', src: ['fishkeeper.co.uk'], why: '200 L is our pick for one adult of a 20-25 cm crayfish; no page we opened states a minimum' },
    ...['cpo', 'cajundwarf', 'rswcrayfish', 'redclaw'].map((id): Rule => ({ path: `${id}.prey.**`, status: 'assumption', basis: 'interpretation', says: 'The Shrimp Farm: "Peaceful fish only"; Aquatic Arts: may eat adult shrimp; Guidarium: "any fish small enough to fit in its mouth will likely be eaten", shrimp and snails are food; Fishkeeper: "they will eat anything they can grab hold of"', src: ['theshrimpfarm.com', 'aquaticarts.com', 'guidarium.com', 'fishkeeper.co.uk'], why: 'what each crayfish takes is our reading of the pages; the length lines (dwarfs 40 mm of invertebrates, red swamp 60 mm, redclaw 100 mm of anything) are our estimates' })),
    ...['cpo', 'cajundwarf', 'rswcrayfish', 'redclaw', 'asellus'].flatMap((id): Rule[] => [
      { path: `${id}.care`, status: 'assumption', basis: 'interpretation', says: 'retailer pages call the dwarf crayfish easy and hardy; the large ones need space and a lid', why: 'care level is our reading of the retailer pages (dwarfs and isopod beginner 1, red swamp and redclaw intermediate 2); no page rates them' },
      { path: `${id}.temper`, status: 'assumption', basis: 'interpretation', says: 'The Shrimp Farm / Your Local Fish Store: males mildly territorial; Guidarium: highly aggressive; Aquatic Arts: aggressive / territorial with its own kind', why: 'dwarfs pushy (1), the two large crayfish aggressive (2), the isopod peaceful (0): our reading' },
    ]),
    { path: 'asellus.minL', status: 'assumption', basis: 'interpretation', says: 'Pond Informer gives no tank size', src: ['pondinformer.com'], why: '8 L is our floor for a small colony of 5-12 mm animals; no page states one' },
    { path: '{rswcrayfish,redclaw}.solo', status: 'assumption', basis: 'interpretation', says: 'Guidarium: highly aggressive; Aquatic Arts: aggressive / territorial with its own kind', src: ['guidarium.com', 'aquaticarts.com'], why: 'one per tank is our reading of "aggressive toward their own kind"' },
    { path: 'asellus.group', status: 'assumption', basis: 'interpretation', says: 'Pond Informer: no colony size', src: ['pondinformer.com'], why: 'a colony of 10 is our floor for a self-breeding detritus eater' },
    { path: '{cpo,cajundwarf}.group', status: 'assumption', basis: 'interpretation', says: 'retailer pages: one hide each; males territorial', why: 'one is fine, so the floor is 1; the 1 male : 2 females ratio is judgement' },
    { path: '{rswcrayfish,redclaw}.group', status: 'assumption', basis: 'interpretation', says: 'retailer pages: aggressive toward their own kind', why: 'one is the floor' },
    ...Object.keys(WATER).flatMap((id): Rule[] => ['temp', 'tol'].map(k => ({ path: `${id}.${k}.*`, status: 'researched', basis: 'interpretation', says: "pages give comfortable and tolerable temperature ranges that differ; the band is our synthesis of them", src: ['climate-research'], why: 'researched band (data/climatedata.ts) replaces the first guess' }))),
    ...GROUP_ROWS.map(({ id, url, est }): Rule => est
      ? { path: `${id}.${GROUP_FIELDS}`, status: 'claimed', basis: 'interpretation', says: "the page gives general group-keeping advice at most; the counts are judgement", src: ['groups-research'], why: `group bands, max, sex ratio, depth and tank length: judgement from hobby practice; page named ${url}` }
      : { path: `${id}.${GROUP_FIELDS}`, status: 'researched', basis: 'interpretation', says: "the page gives the group advice (e.g. \"keep at least 6\"); the ok / good / great thresholds, max and lengths are our reading of it", src: ['groups-research'], why: `group bands, max, sex ratio, depth and tank length rest on ${url} (one page per species, not checked per field)` }),
    // S196 (2026-10-22): size-scaled fighting limits; each row's quotes in research/territory-batch1.json / territory-batch2.json
    { path: '*.males.*', status: 'assumption', basis: 'interpretation', says: "Aquarium Co-Op and Seriously Fish (dwarf gourami): one male only; no page gives a tank size for more", src: ['territory-research'], why: "Nathan 2026-10-22: 'require like 15 gallons for each additional male'; one male from 10 gal (the territory rule's first step)" },
    { path: 'kribensis.territory.**', status: 'researched', basis: 'interpretation', says: "Seriously Fish (Pelvicachromis pulcher): \"24\" x 15\" x 12\" (60x37.5x30cm) - 71 litres is suitable for a single pair\"; \"a large tank is required if more than one pair is to be kept\"; \"the fish become very territorial when breeding\"", src: ['seriouslyfish.com'], why: 'one pair per 24 in of tank length is our reading: the page gives the first pair a 24 in tank but no increment for more (Nathan chose this, option C, 2026-10-23; replaces the one-retailer 20 gal +12.5 gal rule)' },
    { path: '*.territory.**', status: 'researched', basis: 'source-stated', says: "Fishkeeping World (dwarf gourami): \"Two or three gouramis can be easily kept in a 10-gallon tank.\" \"For each additional fish make sure to add 5 gallons.\"", src: ['territory-research'], why: 'the first size and the per-fish step as each page states them (research/territory-caps.md); kribensis from one retailer page' },
    ...Object.keys(CHEM).map((id): Rule => ({ path: `${id}.{ph,gh,phOk,ghOk}.*`, status: 'claimed', basis: 'interpretation', says: "FishBase lists a pH / dH range for some species; others follow practice", src: ['fishbase-chem'], why: 'FishBase pH / dH range where it lists one, otherwise practice; which rows are which was not recorded' })),
  ],
  // runtime air table (data/climate.ts AIR): the researched rows (climatedata AIRDATA) replace the first guesses; note and est are not values
  AIR: Object.entries(AIRDATA).flatMap(([id, d]) => Object.keys(d).filter(k => k !== 'est').map((k): Rule => ({ path: `${id}.${k}.*`, status: 'researched', basis: 'interpretation', says: "pages give air temperature and humidity ranges that differ; the band is our synthesis", src: ['climate-research'], why: 'air temperature and humidity bands, research/climate batches' }))),
  MARINE_PH: [{ path: '*', status: 'cited', basis: 'conservative-default', says: "7.8-8.5 acceptable for reef aquaria; natural seawater about 8.2", src: ['holmes-farley-ph'], why: '7.8-8.5 acceptable for reef aquaria, natural seawater about 8.2; 8.0-8.4 sits inside (quote checked, research/sourcing/other/E1.json)' }],
  HERP: [{ path: '**', status: 'researched', basis: 'interpretation', says: "care sheets give differing minimum enclosure sizes; min = the smallest mainstream figure, rec = the most common", src: ['herp-research'], why: 'floor area, height, group and growth from keeper / vet care sheets (research-herp-stocking.md)' }],
  NEEDS: Object.entries(NEEDS).filter(([, n]) => !isLand(n)).map(([id, n]): Rule => isCoralNeed(n)
    ? { path: `${id}.**`, status: 'claimed', basis: 'interpretation', says: "reef PAR charts give a PAR range per coral group (soft / LPS / SPS), not per coral", src: REEF_SRC, why: 'band and dosing per coral after reef PAR charts; no per-coral page recorded' }
    : { path: `${id}.**`, status: 'claimed', basis: 'interpretation', says: "planted-tank ratings give low / medium / high light, CO2 and fert needs per plant, not PAR numbers", src: PLANT_SRC, why: 'band, CO2 and ferts per plant after the planted-tank ratings; no per-plant page recorded' }),
  FRESH_TIERS: [{ path: '*.{lo,hi}', status: 'claimed', basis: 'interpretation', says: "planted-tank guides describe low / medium / high light in PAR bands that differ by source", src: PLANT_SRC, why: "Nathan's PAR tiers, following the planted-tank convention" }],
  REEF_TIERS: [
    { path: '*.{lo,hi}', status: 'cited', basis: 'source-stated', says: "BRS: soft corals and LPS 75-150 PAR, SPS 200-350", src: ['brs-par'], why: 'soft / LPS 75-150 and SPS 200-350 PAR as the BRS article states them (quote checked, research/sourcing/other/E1.json; soft and SPS adopted by Nathan 2026-10-20)' },
    { path: '0.{lo,hi}', status: 'claimed', basis: 'interpretation', src: ['par-chart-nathan'], why: 'fish-only tier from the PAR chart' },
  ],
  FACTORS: [
    { path: 'priceLevel.*', status: 'assumption', basis: 'interpretation', why: 'one multiplier for store, sales and inflation since the prices were read' },
    { path: 'kwhUsd.*', status: 'claimed', basis: 'interpretation', why: 'the lo / hi band is the cheapest and dearest US states, read by eye; not checked per state' },
    { path: 'kwhUsd.mode', status: 'cited', basis: 'interpretation', says: "EIA table 5.6.A: US residential 18.31 c/kWh in July 2026, 17.45 a year before", src: ['eia.gov'], why: 'EIA Electric Power Monthly table 5.6.A: US residential 18.31 c/kWh in July 2026 (17.45 a year before); 0.17 is 7 % under the summer month (research/sourcing/other/E1.json); kept at 0.17 by Nathan 2026-10-20, July is the summer high' },
  ],
  // lane D (research/sourcing/other/D-cost-defaults.md, scripts/fit-cost-defaults.mjs): every band refit to the cited listings
  // (demand-items, gear-catalog, tanks). Where the listings cover a band with 5+ rows and the mode lands within 25 %, the mode is
  // derived; the rest stay our rule of thumb, and the bands the fit disagrees with wait in research/sourcing/decisions.md.
  DEMAND_DEFAULTS: [
    // S239 (2026-10-26): the ball python's food was the reptile class band scaled by length^0.8 ($69 a month); now price x feeding rate
    // S240 (2026-10-26, Nathan's yes via Coordinator 11): the insect eaters likewise, listed insect price x a care sheet's feeding rate
    { path: 'foodMo.leopardgecko.*', status: 'derived', basis: 'interpretation', says: 'PetSmart: adults "Feed every other day"; Josh\'s Frogs: 1/2" banded crickets 250 for $9.99, 100 medium dubia $19.99', src: ['petsmart.com', 'joshsfrogs.com'], why: 'about 15 meals a month; the page gives no insect count, so 4-8 a meal is our reading; crickets $0.04 each, dubia $0.15-0.20: lo 4 crickets $2.4, mode 6 at a blend about $0.09 = $8, hi 6 dubia about $0.20 = $18' },
    { path: 'foodMo.{greenanole,greenanolebrown,brownanole}.*', status: 'derived', basis: 'interpretation', says: 'PetSmart: "2 to 5 appropriately sized gut-loaded crickets or dubia roaches" each day; Josh\'s Frogs: crickets 250 for $9.99', src: ['petsmart.com', 'joshsfrogs.com'], why: '2-5 insects a day x 30 days: lo 2 crickets $0.04 = $2.4, mode 3.5 at about $0.06 = $6.4, hi 5 at $0.10 = $15; the brown anole is read from the green anole page (no brown anole feeding page opened)' },
    { path: 'foodMo.ballpython.*', status: 'derived', basis: 'derived', says: 'Zen Habitats: adults "every 2-3 weeks" (over 1,500 g "every 4-6 weeks"); RodentPro: large rats, 5 count, $24.95', src: ['zenhabitats.com', 'rodentpro.com'], why: 'one large frozen rat ($24.95 / 5 = $4.99) every 2-3 weeks = $7-11 a month, mode every 2.5 weeks $8.7; lo one every 5 weeks (over 1,500 g) $3.6; hi every 2 weeks $10.8 (ReptiFiles: feeders 10-15 % of body weight, wild adults about 10 meals a year)' },
    { path: '**', status: 'assumption', basis: 'interpretation', why: 'rule-of-thumb band (our judgement); refit to the cited listings in research/sourcing/other/D-cost-defaults.md: too few listings or a different unit, so kept by Nathan 2026-10-20' },
    { path: 'time.waterChangeFraction.floor', status: 'cited', basis: 'source-stated', says: "a weekly water change of 10-20 % (fresh) or 10 % (salt) is best practice", src: ['americanaquariumproducts.com', 'bulkreefsupply-video'], why: 'a weekly water change of 10-20 % (fresh) or 10 % (salt) is the stated best practice; the model changes at least 10 % (research/sourcing/minutes/minutes-A.json)' },
    { path: '{time,risk}.**', status: 'assumption', basis: 'interpretation', why: 'minutes a week and risk points are our model; no listing or page states them' },
    { path: 'gear.{heater,filter}.perGal.mode', status: 'derived', basis: 'derived', src: ['product-pages'], why: 'least-squares price per gallon over the catalogued heaters (13) / filters (19) agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
    { path: 'animals.{fw-invert,sw-fish,amphibian}.setup.mode', status: 'derived', basis: 'derived', src: ['kk-prices'], why: 'median of the cited per-species prices scaled to the reference size agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
    { path: 'gear.{heater,filter}.base.*', status: 'derived', basis: 'derived', src: ['product-pages'], why: 'refit to the catalogued heaters (13) / filters (19): least-squares base, bootstrap p10 / p90 (adopted by Nathan 2026-10-20, scripts/fit-cost-defaults.mjs)' },
    { path: 'gear.tank.{0,1,2}.perGal.*', status: 'derived', basis: 'derived', src: ['product-pages'], why: 'street tank-only price / rated gallons over the catalogued tanks, median p10 p90 per class, n 10-20 (adopted by Nathan 2026-10-20); the >75 gal class stays our band (premium rimless skews the listings)' },
    { path: '{animals.fw-fish,plants.easy,plants.medium,plants.land,plants.succulent,hardscape.wood}.setup.*', status: 'derived', basis: 'derived', src: ['kk-prices'], why: 'median p10 p90 of the cited per-item prices (adopted by Nathan 2026-10-20, scripts/fit-cost-defaults.mjs)' },
    { path: '{plants.coral-soft,hardscape.cave}.setup.mode', status: 'derived', basis: 'derived', src: ['kk-prices'], why: 'median of the cited per-item prices agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
  ],
  DEMAND_ITEMS: [
    { path: '*.{lo,hi}', status: 'assumption', basis: 'interpretation', why: 'band around the one listing: sales and other stores, partly judgement (demand-items _note)' },
    { path: 'hard:silkmoss.mode', status: 'assumption', basis: 'interpretation', why: 'no silk moss mat listing found: judged from the plastic mats and silk plants (lane P4)' },
    { path: '*.mode', status: 'cited', basis: 'source-stated', says: "the listing's price on the day it was read", src: ['kk-prices'], why: 'the listing at the row url', rowUrl: true },
  ],
  FILTER_MEDIA: [
    { path: '*.0', status: 'cited', basis: 'source-stated', says: "the manual or spec page's media volume (or the retailer's figure)", src: ['product-pages', 'nitrogen-research'], why: "manufacturer manual or spec page ('manual') or retailer figure ('retail'); urls in research/filtration/research-filter-media-volumes.md" },
  ],
  TECH: [
    { path: 'heat.**', status: 'assumption', basis: 'interpretation', why: 'linearised heat-loss coefficients (W per m2 per K), checked against the 3-5 W/gal heater rule (tech.json heat._note)' },
    { path: 'gear.*.monthly.months', status: 'claimed', basis: 'interpretation', why: 'how long a pack lasts at the ref size, "researched 2026-10-19, step 2"; pages not recorded' },
    // lane C (research/sourcing/other/C.json): no maker or care page states upkeep minutes or run hours; those are our model
    { path: 'gear.*.minutes.{lo,mode,hi}', status: 'assumption', basis: 'interpretation', why: 'minutes a week of upkeep: our estimate per task; no opened page states a time (manuals give only how often, research/sourcing/other/C.json)' },
    { path: 'gear.*.hours', status: 'assumption', basis: 'interpretation', why: 'hours a day: pumps, skimmers, UV run around the clock (24), CO2 and dosing follow the photoperiod (8); spec pages do not state it' },
    { path: 'gear.{co2kit,airpump,uv}.watts', status: 'cited', basis: 'source-stated', says: "the spec page's power draw for a typical unit at the ref size", src: ['dennerle.com', 'thatpetplace.com', 'fishtanksdirect.com'], why: 'a typical unit at the ref size, its spec page states this draw (quote checked, research/sourcing/other/C.json)' },
    { path: 'gear.{returnpump,ato,skimmerhob,powerhead}.watts', status: 'cited', basis: 'source-stated', says: "the BRS page's power draw for a typical unit at the ref size", src: ['bulkreefsupply.com'], why: 'a typical unit at the ref size, its BRS page states this draw (quote checked, research/sourcing/other/C.json; adopted by Nathan 2026-10-20)' },
    { path: 'gear.skimmerhob.ref', status: 'cited', basis: 'source-stated', says: "AquaReady HOB-1.5: rated for 40-75 gal, 11 W", src: ['bulkreefsupply.com'], why: 'the AquaReady HOB-1.5 is rated for 40-75 gal; its 11 W is for about a 55 gal tank (research/sourcing/other/C.json)' },
    { path: 'gear.doser.watts', status: 'assumption', basis: 'interpretation', says: "Jebao DP-4 page: 8.5 W (the adapter rating)", why: 'kept 1 W (Nathan 2026-10-20): the 8.5 W on the Jebao DP-4 page is the adapter rating; the pumps idle most of the day (research/sourcing/other/C.json)' },
    { path: 'gear.roottabs.monthly.months', status: 'derived', basis: 'derived', src: ['seachem.com'], why: 'Seachem: 6 tabs per 10 gal every 3-4 months, so 12 a round at 20 gal; a 40-pack lasts about 12 months (research/sourcing/other/C.json)' },
    { path: 'gear.{heatdome,baskbulb,heatmat,thermoonoff,thermodim,uvblow,uvbtube,gauge,handmister,mister,fogger,timer}.**', status: 'assumption', basis: 'interpretation', why: "a dry tank's lamps and misting (2026-10-21): first guesses for a dome with a 75 W basking bulb and a thermostat, a T5 UVB kit (24 W, tube yearly), a misting starter kit (its minutes net of the hand spraying it saves: refills less ~5 min a week of spraying), a reptile fogger; no listing opened yet, so the Tech menu marks them est" },
    { path: 'gear.liquidcarbon.monthly.months', status: 'derived', basis: 'derived', src: ['seachem.com'], why: 'Seachem dose 5 mL per 50 gal a day on 20 gal = 2 mL a day: a 500 mL bottle lasts about 8 months' },
  ],
  GEAR_CATALOG: [{ path: '*.*.{gph,galMin,galMax,watts,priceUsd}', status: 'cited', basis: 'source-stated', says: "the product page's figure", src: ['product-pages'], why: 'the product page at the row url', rowUrl: true }],
  TANKS: [{ path: '**', status: 'cited', basis: 'source-stated', says: "the listing's figure", src: ['product-pages'], why: 'the listing at the row url', rowUrl: true },
    // S224 (2026-10-26): Petco lists no depth for its Frameless Shallow line; the row's `est` keeps the depth off the listing
    { path: '{n_imagitarium_shallow_6_8,n_imagitarium_shallow_13_3,n_imagitarium_shallow_28}.outer.D', status: 'derived', basis: 'derived', src: ['product-pages'], why: "Petco lists width and height only: depth back-solved from the rated gallons (the 6.8's shrimp kit box gives 20 x 10 x 8.62 in; Petco customer service gave roughly 32 x 15 for the 28)" },
    // S224b (2026-10-26): product-named library bases whose listing gave only a low-confidence size (a box or shipping size, or one
    // retailer's figure that failed the gallons check and was not dug further); the row's `est` marks them, the gallons check bounds them
    { path: '{n_marineland_standard_rectangu______,n_lifegard_lifegard_bookshelf__,n_aqua_daren_15_rimless_ultra_,n_fluval_kuhl_microscaping_bla,n_jbj_all_in_one_rimless_flat_,n_tropical_marine_centre_kreis}.outer.{L,D,H}', status: 'researched', basis: 'interpretation', src: ['product-pages'], says: "one retailer's listing size, low confidence", why: "the listing gives one size (often a box or shipping size) that no second page confirms; kept because the outer size passes the 0.85-1.5x gallons check (research/tanks/s224/merge-report.json)" }],
  KITS: [{ path: '**', status: 'cited', basis: 'source-stated', says: "the listing's figure", src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
  DEALS: [{ path: '**', status: 'cited', basis: 'source-stated', says: "the listing's figure", src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
  GEAR_DEALS: [{ path: '**', status: 'cited', basis: 'source-stated', says: "the listing's figure", src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
};
// Per-value web sourcing (research/sourcing/<batch>.json, brief research/sourcing/brief-care-tl.md): research agents record, per
// species field, the pages they opened with a verbatim quote; scripts/verify-quotes.mjs checks each quote on the live page
// (<batch>.verify.json). A field is cited only when the batch says it agrees, its value is still the one the batch checked, and at
// least one quote was found on its page. Disagreements are not cited: they wait for a decision (research/sourcing/decisions.md).
// The source id is the page's host (registered in sources.json); the url and quote stay in the batch file.
interface Src { url: string; quote?: string; states?: string }
// Nathan's decisions (research/sourcing/decisions.md): an adopted value is 'agrees' and cites only its `use` sources (indices) when
// given; 'derived' = worked out from the stated values (decision says how); 'kept' = our number stays, an assumption (decision says why).
// 'combined' (lane CB, research/sourcing/combined.json): the weighted combination of every opened page (research/sourcing/combined.md),
// quotes checked there; 2+ sites = derived, one site = researched (one source).
interface Field { ours: unknown; verdict: 'agrees' | 'disagrees' | 'not-stated' | 'behaviour-only' | 'derived' | 'kept' | 'combined'; sources: Src[]; use?: number[]; decision?: string }
interface Batch { batch: string; species: Record<string, { fields: Record<string, Field> }> }
interface Check { id: string; field: string; url: string; result: 'exact' | 'compact' | 'label' | 'near' | 'miss' | 'nofetch' }
const SOURCING = import.meta.glob('../../research/sourcing/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const host = (url: string) => { const h = new URL(url).hostname.split('.'); return h.slice(/^(co|com|org|net|ac)$/.test(h[h.length - 2]) && h.length > 2 ? -3 : -2).join('.'); };   // ca.aquariumsource.com = aquariumsource.com; x.co.uk keeps 3
const speciesValue = (id: string, f: string) => {
  const sp = (speciesJson as unknown as { species: { id: string; tl: number; female?: { tl?: number } }[] }).species.find(s => s.id === id);
  return f === 'tl' ? sp?.tl : f === 'female.tl' ? sp?.female?.tl : undefined;
};
for (const [file, b] of Object.entries(SOURCING)) {
  if (file.endsWith('.verify.json')) continue;
  const batch = b as Batch, name = file.replace(/^.*\//, '');
  const checks = (SOURCING[file.replace(/\.json$/, '.verify.json')] ?? []) as Check[];
  for (const [id, sp] of Object.entries(batch.species)) for (const [f, v] of Object.entries(sp.fields)) {
    const isSpecies = f === 'tl' || f === 'female.tl', isAir = f.startsWith('air.');
    const now = isSpecies ? speciesValue(id, f) : isAir ? (AIR[id] as unknown as Record<string, unknown>)?.[f.slice(4)]
      : f === 'prey' ? CARE[id]?.prey?.mm : (CARE[id] as unknown as Record<string, unknown>)?.[f];
    if (JSON.stringify(now) !== JSON.stringify(v.ours)) continue;   // the value changed since the batch checked it
    const target = isSpecies ? 'SPECIES' : isAir ? 'AIR' : 'CARE';
    const path = `${id}.${isAir ? `${f.slice(4)}.*` : f === 'prey' ? 'prey.mm' : now && typeof now === 'object' ? `${f}.*` : f}`;   // a range (ph, temp, tol) or a group (bands) covers its parts
    const used = v.use ? v.use.map(i => v.sources[i]) : v.sources;
    const found = used.filter(s => checks.some(c => c.id === id && c.field === f && c.url === s.url && (c.result === 'exact' || c.result === 'compact')));
    const src = [...new Set(used.map(s => host(s.url)))];
    // what the pages themselves say: up to two quotes, host first (UF 2026-10-21: keep the source's words apart from our use of them)
    const says = (list: Src[]) => list.filter(s => s?.quote ?? s?.states).slice(0, 2)
      .map(s => { const q = (s.quote ?? s.states)!; return `${host(s.url)}: "${q.length > 160 ? q.slice(0, 157) + '...' : q}"`; }).join('; ') || undefined;
    if (v.verdict === 'combined')
      RULES[target].push(src.length >= 2
        ? { path, status: 'derived', basis: 'derived', says: says(used), src, why: `weighted median of ${src.length} sites, every opened page weighted by kind (research/sourcing/combined.md, applied ${name})` }
        : { path, status: 'researched', basis: 'source-stated', says: says(used), src, why: `one source: the only opened page that states it (research/sourcing/combined.md, applied ${name})` });
    else if (v.verdict === 'agrees' && found.length)
      RULES[target].push({ path, status: 'cited', basis: 'source-stated', says: says(found), src: [...new Set(found.map(s => host(s.url)))], why: `stated on ${found.length} opened page(s), quote checked (research/sourcing/${name})` });
    else if (v.verdict === 'agrees')
      RULES[target].push({ path, status: 'researched', basis: 'source-stated', says: says(used), src, why: `agrees with the pages in research/sourcing/${name}, but no quote was found on the live page` });
    else if (v.verdict === 'derived')
      RULES[target].push({ path, status: 'derived', basis: 'derived', says: says(used), src, why: `${v.decision?.replace(/^Nathan [\d-]+: derived, /, '') ?? 'worked out from the stated values'} (research/sourcing/${name})` });
    else if (v.verdict === 'kept')
      RULES[target].push({ path, status: 'assumption', basis: 'interpretation', says: says(used), src, why: `${v.decision?.replace(/^Nathan ([\d-]+): kept, /, 'kept (Nathan $1): ') ?? 'kept'}; pages in research/sourcing/${name}` });
    else if (v.verdict === 'behaviour-only')
      RULES[target].push({ path, status: 'assumption', basis: 'interpretation', says: says(used), src, why: `the predation is stated (research/sourcing/${name}); the prey length is our estimate` });
  }
}
// every salt species carries the one marine band (care.ts copies MARINE_PH into CARE), so it is cited the same way
for (const sp of (speciesJson as unknown as { species: { id: string; salt?: boolean }[] }).species) if (sp.salt)
  RULES.CARE.push({ path: `${sp.id}.ph.*`, status: 'cited', basis: 'conservative-default', says: "7.8-8.5 acceptable for reef aquaria; natural seawater about 8.2", src: ['holmes-farley-ph'], why: 'the shared marine band (MARINE_PH): 8.0-8.4 inside the 7.8-8.5 reef range (research/sourcing/other/E1.json)' });
// FILTER_MEDIA 'derived' rows are worked out from cartridge weights (about +-50 %), not read off a page.
for (const [id, r] of Object.entries(FILTER_MEDIA_L)) if (r[1] === 'derived')
  RULES.FILTER_MEDIA.push({ path: `${id}.0`, status: 'derived', basis: 'derived', src: ['product-pages'], why: `${r[2]} (about +-50 %)` });

export const FORMULAS: Formula[] = [
  { file: 'src/data/careNeeds.ts', symbols: ['NEEDS'], status: 'claimed', basis: 'interpretation', why: 'wording only, no numbers: the care conditions that were group-band messages in groups.ts (P1 data, research/groups-sources.md: mandarin pods, hatchetfish lid, hermit shells), moved so they show at any count (lane RF)' },
  { file: 'src/data/grazers.ts', symbols: ['GRAZE'], status: 'cited', basis: 'source-stated', says: "turbo 3 per 20 gal, nerite 1 per 5 gal, oto 6 in a 20 gal, amano 1 per 2 gal (the most generous guideline each page states)", src: ['topshelfaquatics.com', 'aquariuminfo.org', 'furrycritter.com', 'fishkeepingworld.com'], why: 'grazers per tank: the most generous stocking guideline an opened page states (turbo 3 per 20 gal, nerite 1 per 5 gal, oto 6 in a 20 gal, amano 1 per 2 gal) and the feeding it names; quotes checked (research/sourcing/R5-grazers.json)' },
  // stocking engine
  { file: 'src/scene/stocking.ts', symbols: ['Q10', 'T_REF'], status: 'claimed', basis: 'interpretation', src: ['metabolic-scaling'], why: 'waste doubles about every 10 K, 25 C reference; no fish paper recorded' },
  { file: 'src/scene/stocking.ts', symbols: ['massG'], status: 'derived', basis: 'derived', src: ['fishbase-lw-bayes'], why: 'FishBase length-weight: mass g = a (tl cm)^b' },
  { file: 'src/scene/stocking.ts', symbols: ['MET_CLASS', 'MET_BY_ID'], status: 'assumption', basis: 'interpretation', why: 'our class multipliers after the usual bioload rules of thumb; no page states per-class ratios (looked for, research/sourcing/other/E2.json). applesnail (lane SN, Nathan 2026-10-22): mystery snails waste like a fish of their mass, after furrycritter "waste equivalent to several small fish" (research/snail-load.md)' },
  { file: 'src/scene/stocking.ts', symbols: ['SALT_LOAD'], status: 'assumption', basis: 'interpretation', why: 'the hobby rule of thumb "half again" for marine fish; no page states it (looked for, research/sourcing/other/E2.json)' },
  { file: 'src/scene/stocking.ts', symbols: ['LU_PER_L'], status: 'fitted', basis: 'derived', src: ['stocking-calibration'], why: 'calibrated so the starters keep their old animal counts, which came from a rule of thumb (3 L x (tl/35)^1.6). Outside checks bracket it widely: the AqAdvisor filtration probes imply 0.22, our nitrogen budget about 1.7 (research/sourcing/other/E3-lu-per-l.md); kept, since it now only sizes the starters (the filtration % comes from scene/nitrogen.ts)' },
  { file: 'src/scene/stocking.ts', symbols: ['SPACE_EXP', 'SPACE_PER_L'], status: 'fitted', basis: 'derived', src: ['aqadvisor', 'aq-compare'], why: 'fit to 24 AqAdvisor combinations (scripts/aq-compare.mjs)' },
  { file: 'src/scene/stocking.ts', symbols: ['TINY_EXPERT', 'SCHOOL_EXP', 'SCHOOL_REF'], status: 'fitted', basis: 'derived', src: ['expert-stockings', 'aq-compare'], why: 'grid over 34 published lists and 24 AqAdvisor combinations: the only setting that lowered the scatter of both; expert counts across sizes grow as gallons^0.79; the curve applies above 10 fish only (test/expert.test.ts). 2026-10-22: one curve over all the fish in the water, exponent 0.72: six AqAdvisor answers for one tank (17 kuhli + 15 danio 74 %, the parts 49 % and 41 %) fit it; SPACE_PER_L re-centred (research/habitat-model.md). Later 2026-10-22: shares by rank, biggest first (schoolShare), so adding an animal never lowers the reading' },
  { file: 'src/scene/stocking.ts', symbols: ['IDEAL_MAX'], status: 'assumption', basis: 'interpretation', src: ['expert-stockings'], why: 'the ideal / caution line (Nathan 2026-10-23): published expert lists read a median 74 % at their own maximum counts (research/expert-stockings.md), so 75 is ideal, 75-100 caution, over 100 likely to cause problems long term' },
  { file: 'src/data/spacefactor.ts', symbols: ['SPACE_NUDGE'], status: 'assumption', basis: 'interpretation', why: 'a hand-set target on top of the AqAdvisor fit: 6 discus in a 55 gal read 85 % (2026-10-22)' },
  { file: 'src/data/spacefactor.ts', symbols: ['FLOOR_FACTOR'], status: 'assumption', basis: 'interpretation', src: ['habitat-model', 'seriouslyfish.com'], why: 'a species that piles into shared caves spreads over less floor than its footprint: kuhli 0.6 (est, Nathan 2026-10-22); at 1.0 17 kuhlis read 95 % of a 36 x 18 in floor' },
  { file: 'src/scene/stocking.ts', symbols: ['HS_MIN_CM', 'HS_K', 'HS_LOW', 'HS_HIGH', 'ALL_CURVE', 'HS_LOW_IDS', 'HS_HIGH_IDS'], status: 'assumption', basis: 'interpretation', src: ['expert-stockings'], why: 'height curve (lane HC): Nathan 2026-10-21 decided floor area counts linearly and height with diminishing returns, per species; no source states the scale. Hs = 8 x body depth, min 12 in, x 0.7 (fast schoolers, surface fish) or 1.5 (tall-bodied, gouramis, big cichlids): our estimates, picked mild; the 37 published lists do not separate the classes (research/height-curve.md)' },
  { file: 'src/scene/stocking.ts', symbols: ['BOTTOM_REF_CM'], status: 'fitted', basis: 'interpretation', src: ['habitat-model'], why: 'bottom dwellers do not use the height (Nathan 2026-10-22): their water room is credited at one reference depth; 35 cm is where the AqAdvisor, published-list and kuhli tests all still pass (33 and 37 each fail one)' },
  { file: 'src/scene/stocking.ts', symbols: ['FLOOR_SQIN_PER_IN'], status: 'fitted', basis: 'interpretation', says: "Scotcat: 18-24 sq in of floor per inch of bottom dweller; Seriously Fish group footprints about 10-20", src: ['habitat-model', 'scotcat-floor', 'seriouslyfish.com', 'aq-compare'], why: 'sources give 12-24 sq in of floor per inch of bottom dweller (Scotcat 18-24; Seriously Fish group footprints: bronze cory ~20, kuhli ~12, clown loach 10-17); 15 is the smallest that reads a shallow-wide tank roomier than a tall one of equal water (test/spaceaudit.test.ts C) and leaves the AqAdvisor median at 1.03' },
  { file: 'src/scene/stocking.ts', symbols: ['FLOOR_REF'], status: 'derived', basis: 'derived', src: ['habitat-model'], why: 'mass-equivalent length: the length of a bronze cory (65 mm, the fish the floor sources measure) of the same mass; keeps 6 kuhlis inside the Seriously Fish minimum tank for them' },
  { file: 'src/scene/stocking.ts', symbols: ['SNAIL_FOOT_K', 'SNAIL_ROOM', 'snailFloorCm2'], status: 'assumption', basis: 'interpretation', src: ['snail-load', 'petfishonline.com'], why: 'lane SN (Nathan 2026-10-22: snails take SOME space relative to adult size, fish treat them as hardscape): floor = shell footprint 3.2 x mass^(2/3) cm2 (mystery 19 cm2, trumpet 1.3) x 3 footprints each (Nathan picked 3 of 2 / 3 / 5); no source states a snail floor share (petfishonline gives 2.5 gal per mystery snail, a volume rule; research/snail-load.md)' },
  { file: 'src/scene/stocking.ts', symbols: ['INVERT_FLOOR'], status: 'assumption', basis: 'interpretation', src: [], why: 'Nathan 2026-10-22 ("apply similar ground/floor rules to inverts as we do for things like kuhlis"): shrimp and crabs take the fish floor rule x 0.3, set so 10 cherry shrimp per gallon fill the floor, the top of the common 5-10 per gallon keeper guidance; no source states an invertebrate floor share (research/habitat-model.md row 4)' },
  { file: 'src/scene/stocking.ts', symbols: ['FLOOR_SHARE'], status: 'assumption', basis: 'interpretation', src: ['habitat-model'], why: 'bottom dwellers 1 and midwater / top fish 0 by class (Decision 3); "all"-zone fish 0.5 is our estimate (no source splits their time)' },
  { file: 'src/scene/stocking.ts', symbols: ['PLANT_MAX', 'PLANTS_PER_100L_FULL', 'PATCH_PLANTS'], status: 'assumption', basis: 'interpretation', why: 'plants take up nitrogen, so they add some filtration; the size (+25 % at 15 plants per 100 L) is "a documented guess"' },
  // nitrogen engine
  { file: 'src/scene/nitrogen.ts', symbols: ['BASE', 'TAN_PER_FEED', 'FEED_PCT', 'tanOf'], status: 'researched', basis: 'derived', says: "excretion studies: fasted TAN about 350 x W^-0.25 mg/kg/day; about 0.02 g TAN per g feed", src: ['nitrogen-research'], why: 'fasted TAN 350 x W^-0.25 mg/kg/day and 0.02 g TAN per g feed, +-40 % (research-fish-nitrogen, research-ornamental-excretion)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['MEDIA_RATE', 'THROUGH', 'SURFACE_RATE', 'warm'], status: 'researched', basis: 'interpretation', says: "ceramic media nitrified 0.06 g TAN/L/day in one fish farm; foam not measured", src: ['nitrogen-research'], why: 'nitrification per litre of media, low confidence: ceramic 0.06 g TAN/L/day measured in a fish farm, foam rate extrapolated (research-nitrification)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['HEADROOM'], status: 'assumption', basis: 'conservative-default', why: 'run the filter at 70 % of its capacity: a 30 % safety margin' },
  { file: 'src/scene/nitrogen.ts', symbols: ['FILTER_BOOST_MAX'], status: 'assumption', basis: 'interpretation', why: 'a filter bigger than the tank baseline (the generic model of its kind fitted to the tank) adds at most 50 % capacity (Nathan 2026-10-26: "sure"); it never changes space or floor' },
  { file: 'src/scene/nitrogen.ts', symbols: ['NITRATE_TARGET_N'], status: 'cited', basis: 'conservative-default', says: "aquariumscience.org: keep nitrate at 40-80 ppm", src: ['aquariumscience.org'], why: '9 mg N/L = about 40 ppm as NO3 (x 4.43), the bottom of the 40-80 ppm range aquariumscience.org states (research/sourcing/other/E2.json)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['plantUptake'], status: 'researched', basis: 'interpretation', says: "one measured Egeria study; the other classes are extrapolated", src: ['nitrogen-research'], why: 'slow / medium / fast 0.001 / 0.003 / 0.006 g N per 100 g a day, extrapolated from one measured Egeria study (research-plant-nitrogen)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['RATE_100G', 'FLOAT_M2', 'DIE_OFF_RETURN'], status: 'researched', basis: 'interpretation', says: "one measured Egeria study; the other classes are extrapolated", src: ['nitrogen-research'], why: 'plant N uptake per 100 g, floaters 0.3 g N/m2/day, 30 % die-off return; classes EXTRAPOLATED from one measured Egeria study (research-plant-nitrogen, research-plant-validation)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['ROOT_FEEDERS', 'ROOT_WATER', 'PLANT_SHARE_MAX'], status: 'assumption', basis: 'interpretation', why: 'root feeders draw about half their N from the substrate; plants take at most 60 % of the daily TAN as ammonium (bacteria compete, little uptake at night), the filter always sees the rest: guesses (Nathan 2026-10-20)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['FERT_N'], status: 'claimed', basis: 'interpretation', why: 'nitrate a water-column fert adds: all-in-one about 5 ppm NO3 a week, dosing pump about 10, EI 3 x 20 ppm; typical label doses, no source recorded' },
  { file: 'src/scene/nitrogen.ts', symbols: ['PLANTS', 'DEFAULT_PLANT', 'PATCH_FW', 'PATCH_PLANTS'], status: 'assumption', basis: 'interpretation', why: "growth class and fresh weight per plant item: guesses at the item's default size" },
{ file: 'src/scene/nitrogen.ts', symbols: ['NO3_TO_N'], status: 'derived', basis: 'derived', why: 'ppm as NO3 to mg N/L: the molar masses, N 14.007 / NO3 62.004 g/mol' },  { file: 'src/scene/nitrogen.ts', symbols: ['ONE_CHANGE_MAX', 'CHANGES_MAX', 'waterChangeState'], status: 'assumption', basis: 'interpretation', why: 'Decision 2 (research/tank-minimum-first-principles.md, Nathan via S165): one change over 50 % is high maintenance, split in two a week (linear steady-state model); past two 50 % changes, or tap nitrate at or above the target, is an environmental failure' },
  // filter media
  { file: 'src/data/filtermedia.ts', symbols: ['MEDIA_L_PER_GPH', 'SPONGE_L_PER_GAL'], status: 'derived', basis: 'derived', src: ['product-pages', 'nitrogen-research'], why: 'media litres per gph from the FILTER_MEDIA_L rows (AquaClear, Fluval), sponge from Hydro-Sponge / Co-Op (research-filter-media-volumes, research-hob-media-derived)' },
  // light
  { file: 'src/scene/lightout.ts', symbols: ['NWATER'], status: 'cited', basis: 'source-stated', says: "refractive index of water 1.333 at 20 C", src: ['engineeringtoolbox.com'], why: 'refractive index of water 1.333 at 20 C (Engineering Toolbox table, research/sourcing/other/E2.json)' },
  { file: 'src/scene/lightout.ts', symbols: ['KEEP_SURFACE', 'KEEP_GLASS'], status: 'derived', basis: 'derived', why: 'diffuse light totally reflected back in, about 1 - 1/n^2' },
  { file: 'src/scene/lightout.ts', symbols: ['KWATER', 'TINT_SHARE', 'FRESNEL', 'GLASS_LID', 'MESH_LID', 'WALL_W'], status: 'claimed', basis: 'interpretation', why: 'water attenuation, lid and wall transmission: typical optics values, none recorded' },
  { file: 'src/scene/lightout.ts', symbols: ['LUXW'], status: 'derived', basis: 'derived', src: ['apogee-lux-ppfd'], why: '683 lm/W x V(lambda) x photon energy per band; checked against the Apogee / Thimijan & Heins lux factors' },
  { file: 'src/scene/lightout.ts', symbols: ['TECHS'], status: 'fitted', basis: 'derived', src: ['par-calibration', 'jbl-solar-par', 'danireef-hydra32', 'barr-t5ho-par', 'nelson-bugbee-2014'], why: 'PPE and eta fitted to graded PAR datasets (reef LED, white LED, T5 HO, metal halide); ESTIMATES: CFL eta, halogen, T8, T12, LED bulb and tube, the 20K split' },
  { file: 'src/scene/lightout.ts', symbols: ['TUBES', 'TUBE_ENDS', 'MH_BULBS'], status: 'claimed', basis: 'interpretation', why: 'standard lamp lengths, watts and bulb sizes; maker tables not recorded' },
  { file: 'src/scene/lightout.ts', symbols: ['TUBE_DIA'], status: 'derived', basis: 'derived', why: 'a T-number is the tube diameter in eighths of an inch (T5 16 mm, T8 26 mm, T12 38 mm)' },
  { file: 'src/scene/lightout.ts', symbols: ['FIX_SPEC', 'BULB_W'], status: 'assumption', basis: 'interpretation', why: 'what each fixture style is usually like (hanging height, beam, power): defaults and slider ranges (Nathan 2026-10-15)' },
  { file: 'src/scene/lightout.ts', symbols: ['SUB_DROP'], status: 'assumption', basis: 'interpretation', why: 'a submersible stick hangs 18 mm under the surface (read off the product photos; no spec)' },
  { file: 'src/scene/lightout.ts', symbols: ['SUB_ALBEDO'], status: 'assumption', basis: 'interpretation', why: 'diffuse PAR reflectance per substrate: our estimates; only tan sand is bounded by a page (desert sand 0.40 broadband, Wikipedia albedo; research/sourcing/other/E2.json)' },
  { file: 'src/scene/lightneeds.ts', symbols: ['FRESH_RANGE', 'REEF_RANGE'], status: 'derived', basis: 'derived', why: 'built from the PAR tiers; LPS reaches 50 over its tier because "some LPS take up to 200 (guide)"' },
  { file: 'src/scene/lightneeds.ts', symbols: ['MIN_PAR'], status: 'claimed', basis: 'interpretation', src: PLANT_SRC, why: 'per-plant minimum PAR for hardy species; the ones marked check are for Nathan to review' },
  { file: 'src/scene/kitlight.ts', symbols: ['TIER_W_PER_GAL', 'TIER_W_MIN'], status: 'claimed', basis: 'interpretation', why: '"ESTIMATES from typical hood LEDs (budget hoods ~4-15 W)"; shown with a "rough" confidence label' },
  { file: 'src/scene/kitlight.ts', symbols: ['LEVEL_MIN'], status: 'derived', basis: 'derived', why: 'fresh = the FRESH_TIERS lows; reef = midpoints between the wizard reef levels' },
  { file: 'src/scene/kitlight.ts', symbols: ['MAX_W_PER_GAL'], status: 'assumption', basis: 'interpretation', why: 'most LED watts per gallon a swap can ask before the tank is the problem (fresh 2.5, reef 6)' },
  { file: 'src/scene/plantfit.ts', symbols: ['FIT_PAR'], status: 'assumption', basis: 'interpretation', why: 'one representative PAR inside each light level' },
  { file: 'src/scene/growtime.ts', symbols: ['GROW_RATE'], status: 'assumption', basis: 'interpretation', why: 'growth multipliers by feeding and plant speed (CO2 helps stems most); not measured' },
  { file: 'src/scene/animalfit.ts', symbols: ['MIN_SLACK_PCT'], status: 'assumption', basis: 'interpretation', why: "a species' smallest tank allows 10 % slack: a 5 gal (19 L) takes a 20 L species" },
  { file: 'src/scene/tankMin.ts', symbols: ['LARGE_BODY_MM'], status: 'assumption', basis: 'interpretation', why: 'Decision 3 holds large-bodied swimmers to length + width; which fish count as large-bodied (adult 15 cm / 6 in and over) is our cut, no page states one' },
  { file: 'src/scene/tech.ts', symbols: ['SUMP_FILL'], status: 'assumption', basis: 'conservative-default', why: 'lane SU: a sump runs about half full, the rest is room for the water that drains down from the display when the return pump stops; our estimate, no page opened states a share' },
  { file: 'src/scene/tech.ts', symbols: ['SUMP_DRAIN_MM', 'SUMP_LINE_L'], status: 'assumption', basis: 'conservative-default', why: 'lane SF (Nathan 2026-10-26: no fixed minimum sump): the water that drains down when the return pump stops, about 1 in over the display surface plus about 0.1 gal from the return line; our estimate, no page opened' },
  { file: 'src/scene/tech.ts', symbols: ['SUMP_SHARE'], status: 'assumption', basis: 'interpretation', why: 'lane SU: the sump a display gets until the owner picks one, at least a quarter of its volume (the hobby rule of thumb "20-30 %"; no page opened) and no longer than the display' },
  { file: 'src/scene/tankfit.ts', symbols: ['FILTRATION_TARGET'], status: 'assumption', basis: 'interpretation', why: 'preset filtration targets: cheapest 100 %, balanced 70 %' },
  { file: 'src/scene/starter.ts', symbols: ['ANIMAL_FILL', 'KINDS_PER_STOP', 'LAND_MOST', 'FULL_READING'], status: 'assumption', basis: 'interpretation', why: 'how full each starter stop is and how many kinds; land counts kept inside the herp research maxima; the Full stop reads one point under IDEAL_MAX in the stocking engine (lane SR 2026-10-26: a full stocking by a respected keeper is ideal, the experts room-limited lists read a median 74 %)' },
  { file: 'src/scene/lightproduct.ts', symbols: ['BAR_CHECK'], status: 'derived', basis: 'derived', why: 'median of model / published PAR over 9 LED bars (5-65 W) in air at 12-14 in (reference/par-calibration-data.md D3, Portland Aquarium round-up, no method stated): 27 % below for white-LED, 18 % for planted-RGB lamps; pinned by test/lightfollowups.test.ts' },
  { file: 'src/scene/kitlight.ts', symbols: ['PUBLISHED_PM'], status: 'assumption', basis: 'interpretation', why: 'a maker measures PAR at one spot; +-15 % elsewhere in the tank' },
  { file: 'src/scene/kitlight.ts', symbols: ['SWAP_MAX_RATIO'], status: 'assumption', basis: 'interpretation', why: 'over 5x the kit light is a new build, not a swap (UI choice)' },
  { file: 'src/scene/plantfit.ts', symbols: ['TOO_BRIGHT'], status: 'assumption', basis: 'interpretation', why: 'a plant must be 1.4x over its range before it counts as struggling' },
  { file: 'src/scene/growtime.ts', symbols: ['GROW_RATE_MAX'], status: 'assumption', basis: 'interpretation', why: 'cap on the light / ferts / CO2 growth multiplier' },
  // tech, cost
  { file: 'src/scene/tech.ts', symbols: ['KWH_USD'], status: 'cited', basis: 'interpretation', says: "EIA table 5.6.A: US residential 18.31 c/kWh in July 2026", src: ['eia.gov'], why: 'same 0.17 USD/kWh as factors.json kwhUsd: EIA table 5.6.A, US residential 18.31 c/kWh July 2026 (research/sourcing/other/E1.json)' },
  { file: 'src/scene/tech.ts', symbols: ['EST_WIDEN', 'pricePoint'], status: 'assumption', basis: 'interpretation', why: 'estimated rows get a 25 % wider band; one listed price gets +-10 % for sales and other stores' },
  { file: 'src/demand/prices.ts', symbols: ['EST_WIDEN'], status: 'assumption', basis: 'interpretation', why: 'estimated rows get a 25 % wider band' },
  { file: 'src/demand/engine.ts', symbols: ['RISK_REPEAT'], status: 'assumption', basis: 'interpretation', why: 'weight of a repeated risk' },
  { file: 'src/demand/dealmatch.ts', symbols: ['MIN_SAVING_USD', 'MIN_SAVING_FRAC', 'FLOW_OK', 'HEAT_OK', 'SIDE_TOL', 'SIDE_MIN_MM'], status: 'assumption', basis: 'interpretation', why: 'when a deal counts as a saving and a fit (product choices)' },
  { file: 'src/demand/gear.ts', symbols: ['L_PER_GAL'], status: 'cited', basis: 'source-stated', says: "1 US gal = 3.785411784 L (definition)", src: ['si-units'], why: '1 US gal = 3.785 L' },
  // climate, tanks, weight
  { file: 'src/data/climate.ts', symbols: ['FINE'], status: 'assumption', basis: 'interpretation', why: 'a compromise a third of the way into the tolerable margin is still fine long term' },
  { file: 'src/scene/builds.ts', symbols: ['FILTRATION_LIMIT'], status: 'assumption', basis: 'conservative-default', why: 'cheapest and least-work builds keep filtration at or under 100 % (the stocking engine limit itself); balanced keeps 70 % or less, headroom for a missed water change (same as tankfit FILTRATION_TARGET)' },
  { file: 'src/scene/builds.ts', symbols: ['WATER_LEVEL', 'BASE_PRESET'], status: 'assumption', basis: 'interpretation', why: 'tank filled to the top; the starting gear is the bare-minimum preset (low-tech fresh, fish-only salt), as in tankfit' },
  { file: 'src/scene/tankfit.ts', symbols: ['WATER_LEVEL', 'STEP_RATIO'], status: 'assumption', basis: 'interpretation', why: 'tank filled to the top; a next size must hold 25 % more water' },
  { file: 'src/data/tankcheck.ts', symbols: ['VOL_TOL'], status: 'assumption', basis: 'interpretation', why: 'catalogue check: interior volume within 8 % of the label' },
  { file: 'src/scene/weight.ts', symbols: ['DENSITY'], status: 'cited', basis: 'source-stated', says: "water 0.998 kg/L at 20 C; glass 2.4-2.8; dry gravel / sand 1.56-1.68; porosity 0.36-0.43", src: ['engineeringtoolbox.com', 'sera.de', 'wikipedia.org'], why: 'water 0.998 kg/L at 20 C, glass 2.4-2.8, gravel / sand 1.56-1.68 dry, porosity 0.36-0.43 (research/sourcing/other/E2.json)' },
  { file: 'src/scene/weight.ts', symbols: ['LID_GLASS'], status: 'assumption', basis: 'interpretation', why: 'lid panels drawn as 4 mm glass' },
  { file: 'src/data/herpstock.ts', symbols: ['SQFT_MM2'], status: 'cited', basis: 'source-stated', says: "1 sq ft = 92903.04 mm2 (definition)", src: ['si-units'], why: '1 sq ft = 92903.04 mm2' },
];

export const EXCLUDED: Excluded[] = [
  { file: 'src/scene/stocking.ts', symbols: ['SQIN_CM2', 'IN_MM'], why: 'unit conversions (sq in in cm2, inch in mm)' },
  { file: 'src/scene/tankMin.ts', symbols: ['MINL_SITE'], why: "S245: a label, no number. A species with no red line in tankmin.json takes CARE.minL (its own provenance rule, TANKMIN / CARE: cited, researched or assumption per species) as its minimum volume, held against the tank's full volume with the 10 % slack" },
  { file: 'src/scene/tankMin.ts', symbols: ['CM', 'GAL_L'], why: 'the default print format (cm) and the US gallon in litres (3.785), a unit conversion' },
  { file: 'src/scene/builds.ts', symbols: ['BUILD_BLURB'], why: 'card wording (mentions the 70 % headroom, which FILTRATION_LIMIT documents)' },
  { file: 'src/scene/lightout.ts', symbols: ['AQ_MAX', 'LAMP_Y', 'TUBE_SP_MAX', 'LREF', 'EXPOSE', 'EXP_MIN', 'EXP_MAX'], why: 'render exposure and slider ranges' },
  { file: 'src/scene/propagate.ts', symbols: ['MAX_PLANTS', 'FLOAT_COVER', 'POOL', 'POOL_SEED'], why: 'scatter limits and seeds' },
  { file: 'src/demand/dealscene.ts', symbols: ['DAY', 'FRESH_DAYS'], why: 'how old a deal may be before it is re-checked' },
  { file: 'src/data/aqadvisor.ts', symbols: ['IN', 'AQ_HEALTH_STALE_MS', 'AQ_GAP_MS'], why: 'AqAdvisor proxy plumbing' },
  { file: 'src/scene/kitlight.ts', symbols: ['DOSING', 'CARE_ORDER'], why: 'label and order maps' },
  { file: 'src/scene/lightcheck.ts', symbols: ['DEMAND'], why: 'enum order' },
  { file: 'src/scene/tech.ts', symbols: ['TIER_FEED'], why: 'enum map' },
  { file: 'src/scene/plantfit.ts', symbols: ['FIT_LABEL', 'CARE_NAME', 'DOSE_MAX', 'DOSE', 'OK'], why: 'labels, enum order, the empty outcome' },
  { file: 'src/scene/growtime.ts', symbols: ['FEED_NAMES'], why: 'labels' },
  { file: 'src/scene/propagate.ts', symbols: ['D2R'], why: 'degrees to radians' },
  { file: 'src/data/tankcheck.ts', symbols: ['VOL_EXCEPTIONS'], why: 'catalogue self-check, not advice' },
  { file: 'src/demand/tech.ts', symbols: ['REPLACED', 'CONSUMABLE'], why: 'row-name sets' },
];
/** Top-level tables in the engine files that the audit walks value by value as a data target (RULES), so they are not constants. */
export const TABLES: Excluded[] = [
  { file: 'src/scene/lightneeds.ts', symbols: ['FRESH_TIERS', 'REEF_TIERS', 'NEEDS'], why: 'targets FRESH_TIERS, REEF_TIERS, NEEDS' },
  { file: 'src/data/herpstock.ts', symbols: ['HERP'], why: 'target HERP' },
  { file: 'src/data/filtermedia.ts', symbols: ['FILTER_MEDIA_L'], why: 'target FILTER_MEDIA' },
  { file: 'src/data/climate.ts', symbols: ['AIR'], why: 'target AIR' },
];

/** The engine files whose top-level constants must each have a FORMULAS or EXCLUDED entry. */
export const ENGINE_FILES = [
  'src/scene/stocking.ts', 'src/scene/nitrogen.ts', 'src/scene/lightout.ts', 'src/scene/kitlight.ts', 'src/scene/lightcheck.ts',
  'src/scene/lightneeds.ts', 'src/scene/tech.ts', 'src/scene/tankfit.ts', 'src/scene/tankMin.ts', 'src/scene/builds.ts', 'src/scene/plantfit.ts', 'src/scene/animalfit.ts',
  'src/scene/growtime.ts', 'src/scene/propagate.ts', 'src/scene/weight.ts', 'src/scene/starter.ts', 'src/data/climate.ts',
  'src/data/filtermedia.ts', 'src/data/herpstock.ts', 'src/data/tankcheck.ts', 'src/data/aqadvisor.ts',
  'src/demand/engine.ts', 'src/demand/dealmatch.ts', 'src/demand/dealscene.ts', 'src/demand/gear.ts', 'src/demand/prices.ts',
  'src/demand/tech.ts', 'src/demand/fit.ts', 'src/demand/swaps.ts', 'src/demand/cost.ts',
];
