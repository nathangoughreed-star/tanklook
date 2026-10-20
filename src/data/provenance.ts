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

export type Status = 'cited' | 'fitted' | 'derived' | 'researched' | 'claimed' | 'assumption';
export const STATUSES: Status[] = ['cited', 'fitted', 'derived', 'researched', 'claimed', 'assumption'];
export interface Rule {
  /** dot path under the target; `*` = one segment, `**` = any number of segments, `{a,b}` = either. Later rules win. */
  path: string;
  status: Status;
  /** ids in src/data/sources.json */
  src?: string[];
  why: string;
  /** cited only if the value's row (nearest object up the path) has an http `url` / `priceUrl` / `source` and is not `est: true`;
   *  otherwise this rule is skipped and an earlier one applies */
  rowUrl?: true;
}
export interface Formula { file: string; symbols: string[]; status: Status; src?: string[]; why: string }
/** Top-level constants in the engine files that are not advice (rendering, UI, timing); the audit lists them, never counts them. */
export interface Excluded { file: string; symbols: string[]; why: string }

const PLANT_SRC = ['par-chart-nathan', 'tropica', 'walstad', 'barr-report', 'aquarium-coop'];
const REEF_SRC = ['par-chart-nathan', 'reef-par-charts', 'brs-par'];
const MASS = bm.species as Record<string, { src: string }>;
/** research/groups-sources.md: one url per species for the group data (lane P1); `(est)` = judgement, not quoted from the page. */
const GROUP_ROWS = [...groupsMd.matchAll(/^- \*\*(\w+)\*\*[^:]*: (https?:\S+?)(?: \((est)\))?\.?(?=\s|$)/gm)].map(m => ({ id: m[1], url: m[2], est: !!m[3] }));
const GROUP_FIELDS = '{bands,max,sexed,maxDepthMm,minLengthMm}.**';

export const RULES: Record<string, Rule[]> = {
  SPECIES: [],
  BODYMASS: Object.entries(MASS).map(([id, m]): Rule =>
    m.src === 'fishbase-bayes' ? { path: `${id}.*`, status: 'cited', src: ['fishbase-lw-bayes'], why: 'a, b from the FishBase species summary (scripts/lw-sources.json)' }
    : m.src === 'fishbase-measured' ? { path: `${id}.*`, status: 'cited', src: ['fishbase-lw-measured'], why: 'a, b of a measured FishBase population' }
    : { path: `${id}.*`, status: 'claimed', why: 'FishBase has no length-weight row (shrimp, snails, herps): a "keeper-reference" typical adult mass turned into a, b; the reference was not recorded' }),
  SPACE_FACTOR: [{ path: '**', status: 'fitted', src: ['aqadvisor', 'aq-compare'], why: 'AqAdvisor % over ours for a one-species 55 gal tank (scripts/space-factors.mjs)' }],
  SPACE_FACTOR_CLASS: [{ path: '**', status: 'fitted', src: ['aqadvisor', 'aq-compare'], why: 'median of the fitted species factors in each class' }],
  CARE: [
    // care, minL, temper, prey, solo / slow / nip, coral and group have no rule: care.ts calls them estimates from common practice.
    // Kept against the pages (Nathan 2026-10-20: trust the research where independent sources agree; here they split): see research/sourcing/decisions.md.
    { path: 'adf.care', status: 'assumption', why: 'pages split: LiveAquaria says Moderate, Josh\'s Frogs fairly easy; we keep beginner (1)' },
    { path: 'yellowtang.care', status: 'assumption', why: 'one retailer page (LiveAquaria) says Easy; tangs are disease-prone in practice, so we keep intermediate (2)' },
    { path: 'betta.care', status: 'assumption', why: 'pages split: Seriously Fish says Moderate, Fishkeeping World calls it fine for first-time owners; we keep beginner (1)' },
    { path: 'ballpython.minL', status: 'assumption', why: 'pages split: PetSmart and BeWild accept a 40 gal (about 151 L) tank, Zen Habitats and Reptile Direct call 4x2x2 ft (about 120 gal, 450 L) the adult minimum and the 40 gal rule outdated; we keep the larger modern figure' },
    ...Object.keys(WATER).flatMap((id): Rule[] => ['temp', 'tol'].map(k => ({ path: `${id}.${k}.*`, status: 'researched', src: ['climate-research'], why: 'researched band (data/climatedata.ts) replaces the first guess' }))),
    ...GROUP_ROWS.map(({ id, url, est }): Rule => est
      ? { path: `${id}.${GROUP_FIELDS}`, status: 'claimed', src: ['groups-research'], why: `group bands, max, sex ratio, depth and tank length: judgement from hobby practice; page named ${url}` }
      : { path: `${id}.${GROUP_FIELDS}`, status: 'researched', src: ['groups-research'], why: `group bands, max, sex ratio, depth and tank length rest on ${url} (one page per species, not checked per field)` }),
    ...Object.keys(CHEM).map((id): Rule => ({ path: `${id}.{ph,gh}.*`, status: 'claimed', src: ['fishbase-chem'], why: 'FishBase pH / dH range where it lists one, otherwise practice; which rows are which was not recorded' })),
  ],
  // runtime air table (data/climate.ts AIR): the researched rows (climatedata AIRDATA) replace the first guesses; note and est are not values
  AIR: Object.entries(AIRDATA).flatMap(([id, d]) => Object.keys(d).filter(k => k !== 'est').map((k): Rule => ({ path: `${id}.${k}.*`, status: 'researched', src: ['climate-research'], why: 'air temperature and humidity bands, research/climate batches' }))),
  MARINE_PH: [{ path: '*', status: 'cited', src: ['holmes-farley-ph'], why: '7.8-8.5 acceptable for reef aquaria, natural seawater about 8.2; 8.0-8.4 sits inside (quote checked, research/sourcing/other/E1.json)' }],
  HERP: [{ path: '**', status: 'researched', src: ['herp-research'], why: 'floor area, height, group and growth from keeper / vet care sheets (research-herp-stocking.md)' }],
  NEEDS: Object.entries(NEEDS).filter(([, n]) => !isLand(n)).map(([id, n]): Rule => isCoralNeed(n)
    ? { path: `${id}.**`, status: 'claimed', src: REEF_SRC, why: 'band and dosing per coral after reef PAR charts; no per-coral page recorded' }
    : { path: `${id}.**`, status: 'claimed', src: PLANT_SRC, why: 'band, CO2 and ferts per plant after the planted-tank ratings; no per-plant page recorded' }),
  FRESH_TIERS: [{ path: '*.{lo,hi}', status: 'claimed', src: PLANT_SRC, why: "Nathan's PAR tiers, following the planted-tank convention" }],
  REEF_TIERS: [
    { path: '*.{lo,hi}', status: 'claimed', src: REEF_SRC, why: 'soft 50-150, SPS 150-400: the BRS PAR article states soft 75-150 and SPS 200-350 (research/sourcing/other/E1.json); wider band kept, decision pending (research/sourcing/decisions.md)' },
    { path: '2.{lo,hi}', status: 'cited', src: ['brs-par'], why: 'LPS 75-150 PAR as the BRS article states it (quote checked, research/sourcing/other/E1.json)' },
    { path: '0.{lo,hi}', status: 'claimed', src: ['par-chart-nathan'], why: 'fish-only tier from the PAR chart' },
  ],
  FACTORS: [
    { path: 'priceLevel.*', status: 'assumption', why: 'one multiplier for store, sales and inflation since the prices were read' },
    { path: 'kwhUsd.*', status: 'claimed', why: 'the lo / hi band is the cheapest and dearest US states, read by eye; not checked per state' },
    { path: 'kwhUsd.mode', status: 'cited', src: ['eia.gov'], why: 'EIA Electric Power Monthly table 5.6.A: US residential 18.31 c/kWh in July 2026 (17.45 a year before); 0.17 is 7 % under the summer month (research/sourcing/other/E1.json)' },
  ],
  // lane D (research/sourcing/other/D-cost-defaults.md, scripts/fit-cost-defaults.mjs): every band refit to the cited listings
  // (demand-items, gear-catalog, tanks). Where the listings cover a band with 5+ rows and the mode lands within 25 %, the mode is
  // derived; the rest stay our rule of thumb, and the bands the fit disagrees with wait in research/sourcing/decisions.md.
  DEMAND_DEFAULTS: [
    { path: '**', status: 'assumption', why: 'rule-of-thumb band (our judgement); refit to the cited listings in research/sourcing/other/D-cost-defaults.md: either too few listings, a different unit, or the fit disagrees (decision pending)' },
    { path: '{time,risk}.**', status: 'assumption', why: 'minutes a week and risk points are our model; no listing or page states them' },
    { path: 'gear.{heater,filter}.perGal.mode', status: 'derived', src: ['product-pages'], why: 'least-squares price per gallon over the catalogued heaters (13) / filters (19) agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
    { path: 'animals.{fw-invert,sw-fish,amphibian}.setup.mode', status: 'derived', src: ['kk-prices'], why: 'median of the cited per-species prices scaled to the reference size agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
    { path: '{plants.coral-soft,hardscape.cave}.setup.mode', status: 'derived', src: ['kk-prices'], why: 'median of the cited per-item prices agrees within 25 % (scripts/fit-cost-defaults.mjs)' },
  ],
  DEMAND_ITEMS: [
    { path: '*.{lo,hi}', status: 'assumption', why: 'band around the one listing: sales and other stores, partly judgement (demand-items _note)' },
    { path: 'hard:silkmoss.mode', status: 'assumption', why: 'no silk moss mat listing found: judged from the plastic mats and silk plants (lane P4)' },
    { path: '*.mode', status: 'cited', src: ['kk-prices'], why: 'the listing at the row url', rowUrl: true },
  ],
  FILTER_MEDIA: [
    { path: '*.0', status: 'cited', src: ['product-pages', 'nitrogen-research'], why: "manufacturer manual or spec page ('manual') or retailer figure ('retail'); urls in research/filtration/research-filter-media-volumes.md" },
  ],
  TECH: [
    { path: 'heat.**', status: 'assumption', why: 'linearised heat-loss coefficients (W per m2 per K), checked against the 3-5 W/gal heater rule (tech.json heat._note)' },
    { path: 'gear.*.monthly.months', status: 'claimed', why: 'how long a pack lasts at the ref size, "researched 2026-10-19, step 2"; pages not recorded' },
    // lane C (research/sourcing/other/C.json): no maker or care page states upkeep minutes or run hours; those are our model
    { path: 'gear.*.minutes.{lo,mode,hi}', status: 'assumption', why: 'minutes a week of upkeep: our estimate per task; no opened page states a time (manuals give only how often, research/sourcing/other/C.json)' },
    { path: 'gear.*.hours', status: 'assumption', why: 'hours a day: pumps, skimmers, UV run around the clock (24), CO2 and dosing follow the photoperiod (8); spec pages do not state it' },
    { path: 'gear.{co2kit,airpump,uv}.watts', status: 'cited', src: ['dennerle.com', 'thatpetplace.com', 'fishtanksdirect.com'], why: 'a typical unit at the ref size, its spec page states this draw (quote checked, research/sourcing/other/C.json)' },
    { path: 'gear.liquidcarbon.monthly.months', status: 'derived', src: ['seachem.com'], why: 'Seachem dose 5 mL per 50 gal a day on 20 gal = 2 mL a day: a 500 mL bottle lasts about 8 months' },
  ],
  GEAR_CATALOG: [{ path: '*.*.{gph,galMin,galMax,watts,priceUsd}', status: 'cited', src: ['product-pages'], why: 'the product page at the row url', rowUrl: true }],
  TANKS: [{ path: '**', status: 'cited', src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
  KITS: [{ path: '**', status: 'cited', src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
  DEALS: [{ path: '**', status: 'cited', src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
  GEAR_DEALS: [{ path: '**', status: 'cited', src: ['product-pages'], why: 'the listing at the row url', rowUrl: true }],
};
// Per-value web sourcing (research/sourcing/<batch>.json, brief research/sourcing/brief-care-tl.md): research agents record, per
// species field, the pages they opened with a verbatim quote; scripts/verify-quotes.mjs checks each quote on the live page
// (<batch>.verify.json). A field is cited only when the batch says it agrees, its value is still the one the batch checked, and at
// least one quote was found on its page. Disagreements are not cited: they wait for a decision (research/sourcing/decisions.md).
// The source id is the page's host (registered in sources.json); the url and quote stay in the batch file.
interface Src { url: string; quote: string }
interface Field { ours: unknown; verdict: 'agrees' | 'disagrees' | 'not-stated' | 'behaviour-only'; sources: Src[] }
interface Batch { batch: string; species: Record<string, { fields: Record<string, Field> }> }
interface Check { id: string; field: string; url: string; result: 'exact' | 'compact' | 'label' | 'near' | 'miss' | 'nofetch' }
const SOURCING = import.meta.glob('../../research/sourcing/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const host = (url: string) => new URL(url).hostname.split('.').slice(-2).join('.');   // ca.aquariumsource.com = aquariumsource.com
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
    const path = `${id}.${isAir ? `${f.slice(4)}.*` : f === 'prey' ? 'prey.mm' : f === 'ph' ? 'ph.*' : f}`;
    const found = v.sources.filter(s => checks.some(c => c.id === id && c.field === f && c.url === s.url && (c.result === 'exact' || c.result === 'compact')));
    const src = [...new Set(v.sources.map(s => host(s.url)))];
    if (v.verdict === 'agrees' && found.length)
      RULES[target].push({ path, status: 'cited', src: [...new Set(found.map(s => host(s.url)))], why: `stated on ${found.length} opened page(s), quote checked (research/sourcing/${name})` });
    else if (v.verdict === 'agrees')
      RULES[target].push({ path, status: 'researched', src, why: `agrees with the pages in research/sourcing/${name}, but no quote was found on the live page` });
    else if (v.verdict === 'behaviour-only')
      RULES[target].push({ path, status: 'assumption', src, why: `the predation is stated (research/sourcing/${name}); the prey length is our estimate` });
  }
}
// every salt species carries the one marine band (care.ts copies MARINE_PH into CARE), so it is cited the same way
for (const sp of (speciesJson as unknown as { species: { id: string; salt?: boolean }[] }).species) if (sp.salt)
  RULES.CARE.push({ path: `${sp.id}.ph.*`, status: 'cited', src: ['holmes-farley-ph'], why: 'the shared marine band (MARINE_PH): 8.0-8.4 inside the 7.8-8.5 reef range (research/sourcing/other/E1.json)' });
// FILTER_MEDIA 'derived' rows are worked out from cartridge weights (about +-50 %), not read off a page.
for (const [id, r] of Object.entries(FILTER_MEDIA_L)) if (r[1] === 'derived')
  RULES.FILTER_MEDIA.push({ path: `${id}.0`, status: 'derived', src: ['product-pages'], why: `${r[2]} (about +-50 %)` });

export const FORMULAS: Formula[] = [
  // stocking engine
  { file: 'src/scene/stocking.ts', symbols: ['Q10', 'T_REF'], status: 'claimed', src: ['metabolic-scaling'], why: 'waste doubles about every 10 K, 25 C reference; no fish paper recorded' },
  { file: 'src/scene/stocking.ts', symbols: ['massG'], status: 'derived', src: ['fishbase-lw-bayes'], why: 'FishBase length-weight: mass g = a (tl cm)^b' },
  { file: 'src/scene/stocking.ts', symbols: ['MET_CLASS', 'MET_BY_ID'], status: 'assumption', why: 'our class multipliers after the usual bioload rules of thumb; no page states per-class ratios (looked for, research/sourcing/other/E2.json)' },
  { file: 'src/scene/stocking.ts', symbols: ['SALT_LOAD'], status: 'assumption', why: 'the hobby rule of thumb "half again" for marine fish; no page states it (looked for, research/sourcing/other/E2.json)' },
  { file: 'src/scene/stocking.ts', symbols: ['LU_PER_L'], status: 'fitted', src: ['stocking-calibration'], why: 'calibrated so the starters keep their old animal counts, which came from a rule of thumb (3 L x (tl/35)^1.6). Outside checks bracket it widely: the AqAdvisor filtration probes imply 0.22, our nitrogen budget about 1.7 (research/sourcing/other/E3-lu-per-l.md); kept, since it now only sizes the starters (the filtration % comes from scene/nitrogen.ts)' },
  { file: 'src/scene/stocking.ts', symbols: ['SPACE_EXP', 'SPACE_PER_L'], status: 'fitted', src: ['aqadvisor', 'aq-compare'], why: 'fit to 24 AqAdvisor combinations (scripts/aq-compare.mjs)' },
  { file: 'src/scene/stocking.ts', symbols: ['PLANT_MAX', 'PLANTS_PER_100L_FULL', 'PATCH_PLANTS'], status: 'assumption', why: 'plants take up nitrogen, so they add some filtration; the size (+25 % at 15 plants per 100 L) is "a documented guess"' },
  // nitrogen engine
  { file: 'src/scene/nitrogen.ts', symbols: ['BASE', 'TAN_PER_FEED', 'FEED_PCT', 'tanOf'], status: 'researched', src: ['nitrogen-research'], why: 'fasted TAN 350 x W^-0.25 mg/kg/day and 0.02 g TAN per g feed, +-40 % (research-fish-nitrogen, research-ornamental-excretion)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['MEDIA_RATE', 'THROUGH', 'SURFACE_RATE', 'warm'], status: 'researched', src: ['nitrogen-research'], why: 'nitrification per litre of media, low confidence: ceramic 0.06 g TAN/L/day measured in a fish farm, foam rate extrapolated (research-nitrification)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['HEADROOM'], status: 'assumption', why: 'run the filter at 70 % of its capacity: a 30 % safety margin' },
  { file: 'src/scene/nitrogen.ts', symbols: ['NITRATE_TARGET_N'], status: 'cited', src: ['aquariumscience.org'], why: '9 mg N/L = about 40 ppm as NO3 (x 4.43), the bottom of the 40-80 ppm range aquariumscience.org states (research/sourcing/other/E2.json)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['plantUptake'], status: 'researched', src: ['nitrogen-research'], why: 'slow / medium / fast 0.001 / 0.003 / 0.006 g N per 100 g a day, extrapolated from one measured Egeria study (research-plant-nitrogen)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['RATE_100G', 'FLOAT_M2', 'DIE_OFF_RETURN'], status: 'researched', src: ['nitrogen-research'], why: 'plant N uptake per 100 g, floaters 0.3 g N/m2/day, 30 % die-off return; classes EXTRAPOLATED from one measured Egeria study (research-plant-nitrogen, research-plant-validation)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['ROOT_FEEDERS', 'ROOT_WATER', 'PLANT_SHARE_MAX'], status: 'assumption', why: 'root feeders draw about half their N from the substrate; plants take at most 60 % of the daily TAN as ammonium (bacteria compete, little uptake at night), the filter always sees the rest: guesses (Nathan 2026-10-20)' },
  { file: 'src/scene/nitrogen.ts', symbols: ['FERT_N'], status: 'claimed', why: 'nitrate a water-column fert adds: all-in-one about 5 ppm NO3 a week, dosing pump about 10, EI 3 x 20 ppm; typical label doses, no source recorded' },
  { file: 'src/scene/nitrogen.ts', symbols: ['PLANTS', 'DEFAULT_PLANT', 'PATCH_FW', 'PATCH_PLANTS'], status: 'assumption', why: "growth class and fresh weight per plant item: guesses at the item's default size" },
  // filter media
  { file: 'src/data/filtermedia.ts', symbols: ['MEDIA_L_PER_GPH', 'SPONGE_L_PER_GAL'], status: 'derived', src: ['product-pages', 'nitrogen-research'], why: 'media litres per gph from the FILTER_MEDIA_L rows (AquaClear, Fluval), sponge from Hydro-Sponge / Co-Op (research-filter-media-volumes, research-hob-media-derived)' },
  // light
  { file: 'src/scene/lightout.ts', symbols: ['NWATER'], status: 'cited', src: ['engineeringtoolbox.com'], why: 'refractive index of water 1.333 at 20 C (Engineering Toolbox table, research/sourcing/other/E2.json)' },
  { file: 'src/scene/lightout.ts', symbols: ['KEEP_SURFACE', 'KEEP_GLASS'], status: 'derived', why: 'diffuse light totally reflected back in, about 1 - 1/n^2' },
  { file: 'src/scene/lightout.ts', symbols: ['KWATER', 'TINT_SHARE', 'FRESNEL', 'GLASS_LID', 'MESH_LID', 'WALL_W'], status: 'claimed', why: 'water attenuation, lid and wall transmission: typical optics values, none recorded' },
  { file: 'src/scene/lightout.ts', symbols: ['LUXW'], status: 'derived', src: ['apogee-lux-ppfd'], why: '683 lm/W x V(lambda) x photon energy per band; checked against the Apogee / Thimijan & Heins lux factors' },
  { file: 'src/scene/lightout.ts', symbols: ['TECHS'], status: 'fitted', src: ['par-calibration', 'jbl-solar-par', 'danireef-hydra32', 'barr-t5ho-par', 'nelson-bugbee-2014'], why: 'PPE and eta fitted to graded PAR datasets (reef LED, white LED, T5 HO, metal halide); ESTIMATES: CFL eta, halogen, T8, T12, LED bulb and tube, the 20K split' },
  { file: 'src/scene/lightout.ts', symbols: ['TUBES', 'TUBE_ENDS', 'MH_BULBS'], status: 'claimed', why: 'standard lamp lengths, watts and bulb sizes; maker tables not recorded' },
  { file: 'src/scene/lightout.ts', symbols: ['TUBE_DIA'], status: 'derived', why: 'a T-number is the tube diameter in eighths of an inch (T5 16 mm, T8 26 mm, T12 38 mm)' },
  { file: 'src/scene/lightout.ts', symbols: ['FIX_SPEC', 'BULB_W'], status: 'assumption', why: 'what each fixture style is usually like (hanging height, beam, power): defaults and slider ranges (Nathan 2026-10-15)' },
  { file: 'src/scene/lightout.ts', symbols: ['SUB_DROP'], status: 'assumption', why: 'a submersible stick hangs 18 mm under the surface (read off the product photos; no spec)' },
  { file: 'src/scene/lightout.ts', symbols: ['SUB_ALBEDO'], status: 'assumption', why: 'diffuse PAR reflectance per substrate: our estimates; only tan sand is bounded by a page (desert sand 0.40 broadband, Wikipedia albedo; research/sourcing/other/E2.json)' },
  { file: 'src/scene/lightneeds.ts', symbols: ['FRESH_RANGE', 'REEF_RANGE'], status: 'derived', why: 'built from the PAR tiers; LPS reaches 50 over its tier because "some LPS take up to 200 (guide)"' },
  { file: 'src/scene/lightneeds.ts', symbols: ['MIN_PAR'], status: 'claimed', src: PLANT_SRC, why: 'per-plant minimum PAR for hardy species; the ones marked check are for Nathan to review' },
  { file: 'src/scene/kitlight.ts', symbols: ['TIER_W_PER_GAL', 'TIER_W_MIN'], status: 'claimed', why: '"ESTIMATES from typical hood LEDs (budget hoods ~4-15 W)"; shown with a "rough" confidence label' },
  { file: 'src/scene/kitlight.ts', symbols: ['LEVEL_MIN'], status: 'derived', why: 'fresh = the FRESH_TIERS lows; reef = midpoints between the wizard reef levels' },
  { file: 'src/scene/kitlight.ts', symbols: ['MAX_W_PER_GAL'], status: 'assumption', why: 'most LED watts per gallon a swap can ask before the tank is the problem (fresh 2.5, reef 6)' },
  { file: 'src/scene/plantfit.ts', symbols: ['FIT_PAR'], status: 'assumption', why: 'one representative PAR inside each light level' },
  { file: 'src/scene/growtime.ts', symbols: ['GROW_RATE'], status: 'assumption', why: 'growth multipliers by feeding and plant speed (CO2 helps stems most); not measured' },
  { file: 'src/scene/tankMin.ts', symbols: ['TIERS'], status: 'claimed', why: 'absolute floor and comfortable tank size per species (adf, danio, whitecloud, tigerbarb, cherrybarb, firenewt, firetoad): keeper-practice judgement from the examples given, no page recorded' },
  { file: 'src/scene/tankfit.ts', symbols: ['FLOOR_K'], status: 'claimed', why: '"a documented rule of thumb, not a source of record": a bottom dweller holds about two body lengths square' },
  { file: 'src/scene/tankfit.ts', symbols: ['FILTRATION_TARGET'], status: 'assumption', why: 'preset filtration targets: cheapest 100 %, balanced 70 %' },
  { file: 'src/scene/starter.ts', symbols: ['ANIMAL_FILL', 'KINDS_PER_STOP', 'LAND_MOST'], status: 'assumption', why: 'how full each starter stop is and how many kinds; land counts kept inside the herp research maxima' },
  { file: 'src/scene/lightproduct.ts', symbols: ['BAR_CHECK'], status: 'derived', why: 'median of model / published PAR over 9 LED bars (5-65 W) in air at 12-14 in (reference/par-calibration-data.md D3, Portland Aquarium round-up, no method stated): 27 % below for white-LED, 18 % for planted-RGB lamps; pinned by test/lightfollowups.test.ts' },
  { file: 'src/scene/kitlight.ts', symbols: ['PUBLISHED_PM'], status: 'assumption', why: 'a maker measures PAR at one spot; +-15 % elsewhere in the tank' },
  { file: 'src/scene/kitlight.ts', symbols: ['SWAP_MAX_RATIO'], status: 'assumption', why: 'over 5x the kit light is a new build, not a swap (UI choice)' },
  { file: 'src/scene/plantfit.ts', symbols: ['TOO_BRIGHT'], status: 'assumption', why: 'a plant must be 1.4x over its range before it counts as struggling' },
  { file: 'src/scene/growtime.ts', symbols: ['GROW_RATE_MAX'], status: 'assumption', why: 'cap on the light / ferts / CO2 growth multiplier' },
  // tech, cost
  { file: 'src/scene/tech.ts', symbols: ['KWH_USD'], status: 'cited', src: ['eia.gov'], why: 'same 0.17 USD/kWh as factors.json kwhUsd: EIA table 5.6.A, US residential 18.31 c/kWh July 2026 (research/sourcing/other/E1.json)' },
  { file: 'src/scene/tech.ts', symbols: ['EST_WIDEN', 'pricePoint'], status: 'assumption', why: 'estimated rows get a 25 % wider band; one listed price gets +-10 % for sales and other stores' },
  { file: 'src/demand/prices.ts', symbols: ['EST_WIDEN'], status: 'assumption', why: 'estimated rows get a 25 % wider band' },
  { file: 'src/demand/engine.ts', symbols: ['RISK_REPEAT'], status: 'assumption', why: 'weight of a repeated risk' },
  { file: 'src/demand/dealmatch.ts', symbols: ['MIN_SAVING_USD', 'MIN_SAVING_FRAC', 'FLOW_OK', 'HEAT_OK', 'SIDE_TOL', 'SIDE_MIN_MM'], status: 'assumption', why: 'when a deal counts as a saving and a fit (product choices)' },
  { file: 'src/demand/gear.ts', symbols: ['L_PER_GAL'], status: 'cited', src: ['si-units'], why: '1 US gal = 3.785 L' },
  // climate, tanks, weight
  { file: 'src/data/climate.ts', symbols: ['FINE'], status: 'assumption', why: 'a compromise a third of the way into the tolerable margin is still fine long term' },
  { file: 'src/scene/builds.ts', symbols: ['FILTRATION_LIMIT'], status: 'assumption', why: 'cheapest and least-work builds keep filtration at or under 100 % (the stocking engine limit itself); balanced keeps 70 % or less, headroom for a missed water change (same as tankfit FILTRATION_TARGET)' },
  { file: 'src/scene/builds.ts', symbols: ['WATER_LEVEL', 'BASE_PRESET'], status: 'assumption', why: 'tank filled to 90 %; the starting gear is the bare-minimum preset (low-tech fresh, fish-only salt), as in tankfit' },
  { file: 'src/scene/tankfit.ts', symbols: ['WATER_LEVEL', 'STEP_RATIO'], status: 'assumption', why: 'tank filled to 90 %; a next size must hold 25 % more water' },
  { file: 'src/data/tankcheck.ts', symbols: ['VOL_TOL'], status: 'assumption', why: 'catalogue check: interior volume within 8 % of the label' },
  { file: 'src/scene/weight.ts', symbols: ['DENSITY'], status: 'cited', src: ['engineeringtoolbox.com', 'sera.de', 'wikipedia.org'], why: 'water 0.998 kg/L at 20 C, glass 2.4-2.8, gravel / sand 1.56-1.68 dry, porosity 0.36-0.43 (research/sourcing/other/E2.json)' },
  { file: 'src/scene/weight.ts', symbols: ['LID_GLASS'], status: 'assumption', why: 'lid panels drawn as 4 mm glass' },
  { file: 'src/data/herpstock.ts', symbols: ['SQFT_MM2'], status: 'cited', src: ['si-units'], why: '1 sq ft = 92903.04 mm2' },
];

export const EXCLUDED: Excluded[] = [
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
