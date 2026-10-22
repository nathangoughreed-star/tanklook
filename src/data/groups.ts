// Per-species group-keeping data for path 1 (lane P1, 2026-10-20): count bands, max per tank, sexed ratios, habitat limits and
// appeal tags. Numbers come from hobby sources (one URL per species in research/groups-sources.md; `est` rows there are judgement),
// advice only. Merged into CARE by the loop at the end of care.ts. The existing CARE.group minimums (lane CG) stay the floor:
// bands.ok equals them wherever both exist (test/groups.test.ts).
// Field meanings (lane RF, 2026-10-22). Every field judges ONE thing; none of them is the overall verdict for a tank (that is the tank fit:
// space, minimum, length, depth, floor, filtration), and none carries a care condition (feeding, maturity, a lid: data/careNeeds.ts).
export interface GroupCare {
  /** GROUP-SIZE assessment only: the count of this species where each band starts, judged for its social need, never for the tank.
   *  n < ok = 'avoid' (too few), ok <= n < good = 'ok', good <= n < great = 'good', n >= great = 'great'. Must hold ok <= good <= great,
   *  and great <= max where a max is given (a "best" group the species should not be kept at is a contradiction). */
  bands?: { ok: number; good: number; great: number };
  /** one line per band, about the GROUP only (no tank size, no care condition); defaults are generated from the numbers when absent */
  msg?: { avoid?: string; ok?: string; good?: string; great?: string };
  /** the most of this species advised in ONE tank, whatever its size (solo species = 1; a bonded pair = 2). Past it the stocking screen
   *  warns (overWarn), never blocks. Absent = no stated cap (a `solo` species reads as 1). Not a density: room is the tank fit's job. */
  max?: number;
  /** usually kept by sex in the hobby: recommended males : females, and why */
  sexed?: { ratio: [number, number]; note?: string };
  /** MAXIMUM WATER DEPTH, mm: the deepest water the animal can live in (it must reach the surface to breathe, or the shore). Not a
   *  recommended depth and not the enclosure height. A hard limit in the tank fit (tankMin tooDeep), EXCEPT where tankmin.json gives a
   *  sourced depth.maxWaterDepthMm for the species: that one governs, as advice beside the count picker (lane MM Decision 3), and this
   *  field is then not read. */
  maxDepthMm?: number;
  flow?: 'low' | 'medium' | 'high';
  /** the part of the tank it lives in; 'all' = no preference */
  zone?: 'bottom' | 'middle' | 'top' | 'all';
  /** P1's shortest tank length, mm. SUPERSEDED by the tank-minimum lines (tankmin.json red / green, lane MM): the engine does not read
   *  it; kept for the species review sheet and the comparison in scripts/tank-min-sources.mjs. */
  minLengthMm?: number;
  /** P1's shortest front-to-back, mm. Superseded like minLengthMm (not read by the engine). */
  minWidthMm?: number;
  /** P1's smallest floor area, cm2, where the source gives a footprint (120 x 30 cm = 3600). Superseded like minLengthMm. */
  minAreaCm2?: number;
  /** What keepers like about it, to rank swaps. JUDGEMENT tags, not sourced facts (PX 2026-10-20: the 29 commonly kept species were
   *  sharpened; the rest are still the coarse P1 tags). Meanings: shoal = a tight school is the display; colour; showpiece = centrepiece;
   *  personality = bold, interactive; active; peaceful = safe in a community; easy = forgiving for beginners; hands-on = needs a skilled
   *  keeper; cleanup; oddball; nocturnal; size; finnage = long flowing fins; livebearer; predator. A swap needs at least one shared tag,
   *  so a tag that nearly every species carries (personality, easy, colour) discriminates nothing: give it only where it is distinctive. */
  appeal?: string[];
}
export type GroupBand = 'avoid' | 'ok' | 'good' | 'great';
/** Recommended minimum group: bands.ok, else the older CARE.group, else 1. */
export const recommendedMin = (g: GroupCare | undefined, careGroup?: number) => g?.bands?.ok ?? careGroup ?? 1;
/** Which band a count of animals falls in (no bands = always 'ok'). */
export function bandOf(g: GroupCare | undefined, n: number): GroupBand {
  const b = g?.bands;
  return !b ? 'ok' : n < b.ok ? 'avoid' : n >= b.great ? 'great' : n >= b.good ? 'good' : 'ok';
}
/** The band's message: the species' own line, else one generated from the numbers. */
export function bandMessage(g: GroupCare | undefined, n: number): string {
  const band = bandOf(g, n), b = g?.bands;
  const own = g?.msg?.[band];
  if (own || !b) return own ?? '';
  if (band === 'avoid') return b.ok <= 1 ? 'Too few' : `Too few: wants at least ${b.ok}`;
  if (band === 'ok') return `Doable; ${b.good} or more is better`;
  if (band === 'good') return b.great > b.good ? `Good; ${b.great} or more is best` : 'Good';
  return 'Great';
}

export const GROUPS: Record<string, GroupCare> = {
  neon: { bands: { ok: 8, good: 10, great: 15 }, msg: { avoid: 'Neons need a school; under 8 they stress and hide' }, max: 30, flow: 'low', zone: 'middle', minLengthMm: 450, appeal: ['shoal', 'colour', 'peaceful'] },
  cardinal: { bands: { ok: 8, good: 10, great: 15 }, msg: { avoid: 'Cardinals need a shoal; under 8 they get shy and stressed' }, max: 40, flow: 'low', zone: 'middle', minLengthMm: 600, appeal: ['shoal', 'colour', 'showpiece', 'peaceful'] },
  ember: { bands: { ok: 8, good: 12, great: 20 }, msg: { avoid: 'Embers get shy in small groups; 8+ keeps them out and about' }, max: 50, flow: 'low', zone: 'middle', minLengthMm: 450, appeal: ['shoal', 'colour', 'easy'] },
  rummynose: { bands: { ok: 10, good: 10, great: 15 }, msg: { ok: 'Seriously Fish advises 10 or more; tight shoalers', good: 'Shoal tightens and holds colour at 10+' }, max: 40, flow: 'medium', zone: 'middle', minLengthMm: 750, appeal: ['shoal', 'showpiece', 'active'] },
  harlequin: { bands: { ok: 8, good: 10, great: 15 }, max: 40, flow: 'low', zone: 'middle', minLengthMm: 600, appeal: ['shoal', 'colour', 'peaceful'] },
  chili: { bands: { ok: 8, good: 12, great: 20 }, msg: { avoid: 'Tiny and shy; need a big group to show colour', great: '20+ gives the best colour and natural shoaling' }, max: 60, flow: 'low', zone: 'middle', minLengthMm: 400, appeal: ['shoal', 'colour', 'size'] },
  danio: { bands: { ok: 8, good: 8, great: 12 }, msg: { avoid: 'Small groups of danios nip fins and fight each other' }, max: 30, flow: 'medium', zone: 'middle', minLengthMm: 600, appeal: ['shoal', 'active', 'easy'] },
  whitecloud: { bands: { ok: 6, good: 8, great: 12 }, max: 30, flow: 'low', zone: 'all', minLengthMm: 600, appeal: ['easy', 'shoal', 'personality'] },
  cpd: { bands: { ok: 6, good: 8, great: 10 }, msg: { avoid: 'Shy; small groups hide constantly and stress', good: '8-10 gives bolder, more natural behaviour' }, max: 20, sexed: { ratio: [1, 2], note: 'Males spar; more females than males cuts stress' }, flow: 'low', zone: 'all', minLengthMm: 450, appeal: ['shoal', 'colour', 'peaceful'] },
  hatchet: { bands: { ok: 6, good: 8, great: 10 }, msg: { avoid: 'A pair or trio behaves very differently from a real group' }, max: 15, flow: 'low', zone: 'top', minLengthMm: 600, appeal: ['oddball', 'shoal'] },
  cherrybarb: { bands: { ok: 6, good: 8, great: 10 }, msg: { avoid: 'Below six they lose shoaling behaviour and turn skittish' }, max: 20, sexed: { ratio: [1, 2], note: 'At least two females per male so rival-male chasing is spread out' }, flow: 'low', zone: 'middle', minLengthMm: 600, appeal: ['colour', 'peaceful', 'easy'] },
  tigerbarb: { bands: { ok: 8, good: 8, great: 10 }, msg: { avoid: 'Small groups redirect fin-nipping onto tankmates', ok: '5-7 is the riskiest range for nipping; 8+ keeps the pecking order internal' }, max: 15, flow: 'medium', zone: 'middle', minLengthMm: 750, appeal: ['shoal', 'active', 'colour'] },
  boesemani: { bands: { ok: 6, good: 8, great: 10 }, msg: { avoid: 'Males harass lone females and sparring has no outlet in small groups' }, max: 15, sexed: { ratio: [1, 2], note: 'Mixed sex, slightly more females than males' }, flow: 'medium', zone: 'top', minLengthMm: 900, appeal: ['colour', 'showpiece', 'shoal', 'size'] },
  guppy: { bands: { ok: 3, good: 5, great: 8 }, msg: { avoid: 'A lone guppy is stressed; males also harass lone females', ok: 'Keep more females than males' }, max: 12, sexed: { ratio: [1, 2], note: '1 male to 2-3 females; males chase females nonstop. Mixed groups breed fast' }, flow: 'low', zone: 'top', minLengthMm: 450, appeal: ['livebearer', 'colour', 'finnage', 'easy'] },
  platy: { bands: { ok: 3, good: 4, great: 6 }, msg: { avoid: 'Singles do poorly; keep a small group', ok: 'Keep more females than males', great: 'Groups of 7+ may fight; keep sexes balanced' }, max: 10, sexed: { ratio: [1, 3], note: '3 females per male; males harass females when outnumbered' }, flow: 'low', zone: 'middle', minLengthMm: 600, appeal: ['livebearer', 'colour', 'easy'] },
  molly: { bands: { ok: 3, good: 4, great: 6 }, msg: { avoid: 'A lone molly or a male with one female gets harassed; keep 1 male : 2-3 females' }, max: 12, sexed: { ratio: [1, 3], note: 'Keep more females than males so one female is not hounded' }, flow: 'medium', zone: 'middle', minLengthMm: 750, appeal: ['livebearer', 'colour', 'easy'] },
  swordtail: { bands: { ok: 3, good: 4, great: 6 }, msg: { avoid: 'Males chase females hard; keep 1 male : 3 females' }, max: 10, sexed: { ratio: [1, 3], note: 'One male to several females disperses harassment; avoid several males' }, flow: 'medium', zone: 'top', minLengthMm: 800, minAreaCm2: 3600, appeal: ['colour', 'easy', 'personality', 'shoal'] },
  betta: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Keep one male per tank; males fight to the death' }, max: 1, flow: 'low', zone: 'top', minLengthMm: 300, appeal: ['finnage', 'showpiece', 'colour', 'personality', 'hands-on'] },
  dwarfgourami: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'One male alone is safest; a pair needs plants to break sight lines' }, max: 1, flow: 'low', zone: 'top', minLengthMm: 600, appeal: ['showpiece', 'colour', 'peaceful'] },
  honeygourami: { bands: { ok: 1, good: 2, great: 4 }, msg: { ok: 'Peaceful; fine alone but happier as a pair or small group' }, max: 6, flow: 'low', zone: 'top', minLengthMm: 450, appeal: ['easy', 'colour', 'personality'] },
  gourami: { bands: { ok: 1, good: 2, great: 4 }, msg: { ok: 'One male only unless tank is 120 cm+; add females' }, max: 5, sexed: { ratio: [1, 3], note: 'Males are territorial with each other; one male to 2-3 females' }, flow: 'low', zone: 'top', minLengthMm: 900, appeal: ['showpiece', 'finnage', 'personality'] },
  gbr: { bands: { ok: 2, good: 2, great: 2 }, msg: { avoid: 'Singles are shy; keep a bonded pair' }, max: 2, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['showpiece', 'colour', 'hands-on'] },
  bolivianram: { bands: { ok: 2, good: 4, great: 6 }, msg: { avoid: 'Singles do best only if tank is peaceful; a pair or small group is better' }, max: 8, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['personality', 'colour', 'easy'] },
  kribensis: { bands: { ok: 2, good: 2, great: 2 }, msg: { avoid: 'A lone krib is fine but a male/female pair shows the real behaviour' }, max: 2, sexed: { ratio: [1, 1], note: 'Keep as one male/female pair; breeding pairs are territorial and need hiding caves' }, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['personality', 'colour', 'easy'] },
  cockatoo: { bands: { ok: 2, good: 3, great: 4 }, msg: { avoid: 'A lone male is fine but a harem is the natural way', great: '1 male with 3 females needs dense caves and a 90 cm footprint' }, max: 5, sexed: { ratio: [1, 3], note: 'One male to 2-3 females; never two males in a small tank; add males after females settle' }, flow: 'low', zone: 'bottom', minLengthMm: 900, appeal: ['personality', 'colour', 'showpiece'] },
  yellowlab: { bands: { ok: 4, good: 6, great: 8 }, msg: { avoid: 'A lone fish or a male with too few females gets harassed or harasses' }, max: 12, sexed: { ratio: [1, 4], note: 'One male to several females to spread male aggression' }, flow: 'medium', zone: 'all', minLengthMm: 900, appeal: ['colour', 'easy', 'personality'] },
  peacock: { bands: { ok: 3, good: 4, great: 6 }, msg: { avoid: 'Singles and pairs get chased hard; keep one male with several females' }, max: 8, sexed: { ratio: [1, 3], note: 'One male to 2-4 females; two males fight unless tank is very large' }, flow: 'medium', zone: 'middle', minLengthMm: 1200, appeal: ['colour', 'showpiece', 'personality'] },
  demasoni: { bands: { ok: 6, good: 12, great: 20 }, msg: { avoid: 'Too few and the dominant fish kills the rest', ok: 'Dominance fights; only in a big tank, with rockwork' }, max: 40, sexed: { ratio: [1, 3], note: 'Several females per male; hard to sex when young so buy a big group' }, flow: 'medium', zone: 'bottom', minLengthMm: 1200, appeal: ['colour', 'showpiece', 'personality'] },
  kadango: { bands: { ok: 4, good: 5, great: 8 }, msg: { avoid: 'A male alone or with one female harasses her; need 3+ females' }, max: 12, sexed: { ratio: [1, 4], note: 'One male to 3-4+ females; males are aggressive when breeding' }, flow: 'medium', zone: 'top', minLengthMm: 1500, appeal: ['colour', 'showpiece', 'shoal'] },
  labeo: { bands: { ok: 5, good: 8, great: 12 }, msg: { avoid: 'Too few: the dominant male harasses the others without enough targets', ok: 'Workable with 1 male and several females, hiding rocks essential' }, max: 16, sexed: { ratio: [1, 4], note: 'One male to several females; sexing juveniles is hard, so start with 8+ and rehome extra males' }, flow: 'medium', zone: 'bottom', minLengthMm: 1200, appeal: ['colour', 'personality', 'easy'] },
  auratus: { bands: { ok: 6, good: 9, great: 12 }, msg: { avoid: 'Singles and pairs: the male is relentless and will kill his mate', ok: 'Only with 1 male and 5+ females; extra males will be killed' }, max: 14, sexed: { ratio: [1, 6], note: 'Single male harem; males kill rival males and some females. Start with 8-10 juveniles' }, flow: 'medium', zone: 'bottom', minLengthMm: 1220, appeal: ['colour', 'personality', 'showpiece'] },
  livingstonii: { bands: { ok: 1, good: 4, great: 5 }, msg: { ok: 'A lone specimen is fine (Seriously Fish suggests solitary)', good: '1 male with 3+ females if breeding', great: '1 male and 4+ females, needs a very large tank' }, max: 6, sexed: { ratio: [1, 4], note: 'Solitary specimen or one male harem; males are territorial and predatory' }, flow: 'medium', zone: 'middle', minLengthMm: 1500, appeal: ['showpiece', 'size', 'personality'] },
  afra: { bands: { ok: 6, good: 8, great: 12 }, msg: { avoid: 'Fewer than 6: a few fish just fight each other', ok: 'Works with 1 male to several females', great: 'Big groups spread aggression and show colonial behaviour' }, max: 20, sexed: { ratio: [1, 6], note: 'Final ratio about 1 male to 6 females; start with 8-10 juveniles. Breeding groups reported as 3M:8F' }, flow: 'medium', zone: 'bottom', minLengthMm: 1200, appeal: ['colour', 'personality', 'shoal'] },
  syno: { bands: { ok: 3, good: 5, great: 6 }, msg: { avoid: 'Singles and pairs are shy and hide constantly', good: 'Active shoal, more often seen' }, max: 8, flow: 'medium', zone: 'bottom', minLengthMm: 1200, appeal: ['nocturnal', 'cleanup', 'oddball'] },
  angel: { bands: { ok: 1, good: 5, great: 6 }, msg: { ok: 'A single or bonded pair does fine, but pairs can bully tankmates', good: 'Group of 5-6 lets pairs form naturally; remove excess if pairs fight' }, max: 8, flow: 'low', zone: 'middle', minLengthMm: 1000, appeal: ['showpiece', 'finnage', 'personality'] },
  discus: { bands: { ok: 4, good: 5, great: 8 }, msg: { avoid: 'Singles and pairs are stressed and rarely settle; a pair can be kept alone only if bonded', ok: 'Minimum, bullying likely', great: 'Larger shoal calms individuals' }, max: 10, flow: 'low', zone: 'middle', minLengthMm: 1200, appeal: ['showpiece', 'colour', 'size', 'hands-on'] },
  oscar: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'One oscar needs 75 gal+; two that have paired off 90-150 gal. Trios often fail (two pair off, the third is bullied) and males together fight even in huge tanks' }, max: 1, flow: 'medium', zone: 'all', minLengthMm: 1200, appeal: ['personality', 'size', 'predator', 'hands-on'] },
  goldfish: { bands: { ok: 2, good: 3, great: 4 }, msg: { avoid: 'Social; a single fancy is usually kept alone only by necessity', ok: 'Pair works if the tank is big enough' }, max: 6, flow: 'low', zone: 'all', minLengthMm: 900, appeal: ['personality', 'colour', 'hands-on'] },
  comet: { bands: { ok: 2, good: 3, great: 5 }, msg: { avoid: 'Active schooling-type goldfish; a lone one is stressed', ok: 'Pair is minimum; needs pond-size water' }, max: 8, flow: 'medium', zone: 'all', minLengthMm: 1500, appeal: ['personality', 'size', 'easy', 'hands-on'] },
  bronzecory: { bands: { ok: 4, good: 8, great: 12 }, msg: { avoid: 'Shoaling catfish; small groups turn shy', ok: 'Minimum shoal; more is better' }, max: 20, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['shoal', 'cleanup', 'peaceful', 'easy'] },
  pandacory: { bands: { ok: 6, good: 8, great: 12 }, msg: { avoid: 'Shoaling catfish; small groups turn shy', ok: 'Minimum shoal; more is better' }, max: 15, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['shoal', 'cleanup', 'colour', 'peaceful'] },
  pygmycory: { bands: { ok: 6, good: 10, great: 15 }, msg: { avoid: 'Tiny shoaling cory; needs a big group to feel secure', ok: 'Minimum shoal; mid-water shoalers' }, max: 30, flow: 'low', zone: 'all', minLengthMm: 450, appeal: ['shoal', 'oddball', 'personality', 'easy'] },
  bristlenose: { bands: { ok: 1, good: 2, great: 3 }, msg: { ok: 'Single fish is fine', good: 'One male plus a female avoids rival males', great: 'One male, several females, a cave each' }, max: 5, sexed: { ratio: [1, 3], note: 'Males are territorial over caves; keep one male per territory unless the tank is very large (150 cm+)' }, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['cleanup', 'oddball', 'nocturnal', 'easy'] },
  oto: { bands: { ok: 6, good: 8, great: 12 }, msg: { avoid: 'Delicate shoaler; fewer than 6 do poorly', ok: 'Minimum; 8+ is better', great: 'Large group is the most natural' }, max: 15, flow: 'low', zone: 'all', minLengthMm: 450, appeal: ['shoal', 'cleanup', 'peaceful'] },
  kuhli: { bands: { ok: 5, good: 8, great: 10 }, msg: { avoid: 'Shy and stressed alone; stay hidden' }, flow: 'low', zone: 'bottom', minLengthMm: 600, appeal: ['shoal', 'oddball', 'nocturnal', 'peaceful'] },
  clownloach: { bands: { ok: 5, good: 6, great: 8 }, msg: { avoid: 'Shy, stressed and sickly in small groups', great: 'Adults reach 25-30 cm; group needs a large tank' }, flow: 'medium', zone: 'bottom', minLengthMm: 1200, appeal: ['shoal', 'active', 'personality', 'size'] },
  sae: { bands: { ok: 3, good: 5, great: 6 }, msg: { avoid: 'Singles turn territorial and chase tankmates', ok: 'Adults squabble; more fish spread the aggression' }, flow: 'medium', zone: 'bottom', minLengthMm: 900, appeal: ['cleanup', 'easy', 'personality'] },
  hillstream: { bands: { ok: 3, good: 5, great: 6 }, msg: { avoid: 'Do poorly alone; need company and strong flow' }, flow: 'high', zone: 'bottom', minLengthMm: 750, appeal: ['oddball', 'showpiece', 'personality'] },
  peapuffer: { bands: { ok: 1, good: 3, great: 5 }, msg: { ok: 'Solo is fine in a small tank', good: 'Keep one male to several females; males fight', great: 'Needs dense planting and 15+ gal' }, max: 8, sexed: { ratio: [1, 3], note: 'One male to 2-3 females or single-sex; multiple males fight' }, flow: 'low', zone: 'all', minLengthMm: 300, appeal: ['personality', 'hands-on', 'oddball', 'size'] },
  cherryshrimp: { bands: { ok: 10, good: 15, great: 25 }, max: 100, sexed: { ratio: [1, 2], note: 'More females than males helps a breeding colony' }, flow: 'low', zone: 'all', minLengthMm: 400, appeal: ['shoal', 'colour', 'cleanup'] },
  amano: { bands: { ok: 6, good: 8, great: 10 }, msg: { great: 'Colony behaviour at 10+; cannot breed in freshwater' }, flow: 'medium', zone: 'all', minLengthMm: 450, appeal: ['cleanup', 'easy', 'personality'] },
  nerite: { bands: { ok: 1, good: 1, great: 1 }, flow: 'medium', zone: 'all', minLengthMm: 300, appeal: ['cleanup', 'easy', 'peaceful'] },
  mystery: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Fine alone; 2-4 per 10 gal, more breed fast and foul water' }, max: 4, flow: 'low', zone: 'bottom', appeal: ['cleanup', 'easy', 'oddball', 'colour'] },
  ramshorn: { bands: { ok: 1, good: 3, great: 6 }, msg: { great: 'Breeds fast; numbers track feeding, watch for a population boom' }, flow: 'low', zone: 'all', minLengthMm: 400, appeal: ['easy', 'cleanup', 'oddball'] },
  trumpet: { bands: { ok: 1, good: 5, great: 10 }, msg: { great: 'Colony self-grows; limit feeding to keep it in check' }, flow: 'low', zone: 'bottom', minLengthMm: 300, appeal: ['easy', 'cleanup', 'nocturnal'] },
  ocellaris: { bands: { ok: 2, good: 2, great: 2 }, msg: { avoid: 'A lone clown is hardy but the classic keep is a bonded pair', ok: 'A pair; more than two will fight' }, max: 2, flow: 'medium', zone: 'middle', minLengthMm: 600, appeal: ['personality', 'colour', 'showpiece', 'easy'] },
  royalgramma: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Keep one; several adults need 55 gal+ and fight' }, max: 1, flow: 'medium', zone: 'bottom', minLengthMm: 900, appeal: ['colour', 'personality', 'easy'] },
  yellowtang: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Keep one; groups only in very large tanks, added together' }, max: 1, flow: 'high', zone: 'all', minLengthMm: 1200, appeal: ['colour', 'showpiece', 'size', 'personality'] },
  bluetang: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Keep one; very large tank and long footprint needed' }, max: 1, flow: 'high', zone: 'all', minLengthMm: 1500, appeal: ['colour', 'showpiece', 'size', 'personality'] },
  firefish: { bands: { ok: 1, good: 2, great: 2 }, msg: { good: 'A pair bought together; unrelated adults often fight' }, max: 2, flow: 'medium', zone: 'middle', minLengthMm: 600, appeal: ['colour', 'personality', 'easy'] },
  banggai: { bands: { ok: 2, good: 2, great: 5 }, msg: { avoid: 'Lone Banggai are stressed; keep a bonded pair', good: 'A pair is the safest arrangement', great: 'Groups of 5+ need 55 gal+ and hiding spots; extra males squabble' }, max: 6, flow: 'low', zone: 'middle', minLengthMm: 600, appeal: ['colour', 'easy', 'personality'] },
  sixline: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'One per tank; a second is usually harassed' }, max: 1, flow: 'medium', zone: 'middle', minLengthMm: 900, appeal: ['personality', 'colour', 'cleanup'] },
  chromis: { bands: { ok: 6, good: 7, great: 9 }, msg: { avoid: 'Fewer than 6 and the dominant fish bullies the rest', great: '9+ makes a true school; needs 400 L+' }, flow: 'high', zone: 'top', minLengthMm: 900, appeal: ['shoal', 'colour', 'easy'] },
  coralbeauty: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'One per tank; a second angel fights unless the tank is very large' }, max: 1, flow: 'medium', zone: 'bottom', minLengthMm: 900, appeal: ['colour', 'personality', 'showpiece'] },
  watchman: { bands: { ok: 1, good: 2, great: 2 }, msg: { ok: 'A single is fine; a pair needs 55 gal+', good: 'A bonded pair shares one burrow' }, max: 2, flow: 'medium', zone: 'bottom', minLengthMm: 900, appeal: ['personality', 'hands-on', 'oddball'] },
  mandarin: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'One male per tank; males fight' }, max: 2, flow: 'low', zone: 'bottom', minLengthMm: 1000, appeal: ['colour', 'oddball', 'hands-on', 'showpiece'] },
  cleanershrimp: { bands: { ok: 1, good: 2, great: 3 }, msg: { ok: 'Fine alone, happier in a pair', great: 'Groups of 3+ in larger tanks' }, max: 4, flow: 'medium', zone: 'bottom', minLengthMm: 600, appeal: ['cleanup', 'personality', 'hands-on'] },
  turbo: { bands: { ok: 1, good: 2, great: 3 }, msg: { great: 'More only if the tank grows enough algae to feed them' }, max: 6, flow: 'medium', zone: 'all', minLengthMm: 600, appeal: ['cleanup', 'easy', 'hands-on'] },
  hermit: { bands: { ok: 1, good: 3, great: 5 }, max: 8, flow: 'medium', zone: 'bottom', minLengthMm: 600, appeal: ['cleanup', 'personality', 'easy'] },
  dartfrog: { bands: { ok: 2, good: 3, great: 4 }, msg: { avoid: 'Singles do poorly; keep a pair or small group', great: 'Groups of 4+ need 24x18x24 in or larger, and adult males may fight' }, max: 5, sexed: { ratio: [1, 1], note: 'Pair or juvenile group; adult tinctorius are usually kept as a pair' }, zone: 'bottom', minLengthMm: 457, appeal: ['colour', 'showpiece', 'personality'] },
  treefrog: { bands: { ok: 1, good: 2, great: 3 }, msg: { great: 'Same-size frogs only; add 10 gal per extra frog' }, max: 3, zone: 'top', minLengthMm: 457, appeal: ['easy', 'hands-on', 'nocturnal', 'personality'] },
  firetoad: { bands: { ok: 2, good: 3, great: 5 }, msg: { avoid: 'Social; a lone toad does better with company', great: 'Up to ~10 possible in a large shoreline setup' }, max: 10, maxDepthMm: 100, zone: 'bottom', minLengthMm: 600, appeal: ['easy', 'personality', 'colour'] },
  firenewt: { bands: { ok: 2, good: 4, great: 6 }, msg: { avoid: 'Do best in company; a pair is the minimum', great: '5-6 suits a large planted tank' }, max: 8, maxDepthMm: 300, flow: 'low', zone: 'all', minLengthMm: 600, appeal: ['easy', 'personality', 'colour'] },
  adf: { bands: { ok: 2, good: 5, great: 7 }, msg: { avoid: 'A lone dwarf frog gets lonely; keep 2+' }, max: 6, maxDepthMm: 450, flow: 'low', zone: 'bottom', minLengthMm: 450, appeal: ['personality', 'oddball', 'hands-on'] },
  axolotl: { bands: { ok: 1, good: 1, great: 2 }, msg: { great: 'Pairs need 10n+10 gal and similar size; nipped limbs are common' }, max: 4, flow: 'low', zone: 'bottom', minLengthMm: 800, appeal: ['oddball', 'personality', 'hands-on', 'showpiece'] },
  crestedgecko: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'A single adult is the safest; 1 male + 1-2 females works in a big tall enclosure' }, max: 1, zone: 'top', minLengthMm: 457, appeal: ['easy', 'hands-on', 'nocturnal', 'colour'] },
  crestedharlequin: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'A single adult is the safest; 1 male + 1-2 females works in a big tall enclosure' }, max: 1, zone: 'top', minLengthMm: 457, appeal: ['easy', 'hands-on', 'nocturnal', 'colour'] },
  greenanole: { bands: { ok: 1, good: 3, great: 4 }, msg: { ok: 'Fine alone or as a pair; one male only' }, max: 4, sexed: { ratio: [1, 3], note: 'One male with up to three females; males fight' }, zone: 'top', minLengthMm: 600, appeal: ['personality', 'colour', 'easy'] },
  greenanolebrown: { bands: { ok: 1, good: 3, great: 4 }, msg: { ok: 'Fine alone or as a pair; one male only' }, max: 4, sexed: { ratio: [1, 3], note: 'One male with up to three females; males fight' }, zone: 'top', minLengthMm: 600, appeal: ['personality', 'colour', 'easy'] },
  brownanole: { bands: { ok: 1, good: 3, great: 4 }, msg: { ok: 'Fine alone or as a pair; one male only' }, max: 4, sexed: { ratio: [1, 3], note: 'One male with females; males fight (judgement from green anole advice)' }, zone: 'middle', minLengthMm: 600, appeal: ['personality', 'easy', 'hands-on'] },
  leopardgecko: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Solitary: housing together risks bites and dropped tails' }, max: 1, zone: 'bottom', minLengthMm: 914, appeal: ['hands-on', 'nocturnal', 'easy', 'personality'] },
  regaljumper: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Solitary and cannibalistic; one per enclosure' }, max: 1, zone: 'top', minLengthMm: 250, appeal: ['personality', 'hands-on', 'oddball', 'easy'] },
  ballpython: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Solitary; one per enclosure' }, max: 1, zone: 'bottom', minLengthMm: 1220, appeal: ['easy', 'hands-on', 'showpiece'] },
  chacogoldenknee: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Solitary and cannibalistic; one per enclosure' }, max: 1, zone: 'bottom', minLengthMm: 450, appeal: ['showpiece', 'oddball', 'easy', 'nocturnal'] },
};
