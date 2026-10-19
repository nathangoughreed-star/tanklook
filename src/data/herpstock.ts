// Stocking rules for reptiles and amphibians (Nathan 2026-10-19; research/research-herp-stocking.md). Advice only, like care.ts:
// the view warns, nothing is blocked. Space is FLOOR AREA in sq ft (a gallon figure hides the footprint), plus a minimum height
// for the climbers. Sources are mostly keeper and retailer practice and disagree with each other, so `min` is the smallest figure
// the mainstream sources accept and `rec` the one most of them give; the gap between the two is a note, below `min` a warning.
// Rules are keyed by scientific name, so the two crested gecko morphs count as one species.

export interface HerpRule {
  name: string;
  /** floor area (sq ft) for one adult: below `min` warns, below `rec` notes */
  min: number;
  rec: number;
  /** floor area (sq ft) added by each further animal */
  each: number;
  /** shortest enclosure (in) the sources accept; the climbers */
  hMin?: number;
  /** most animals any source supports together; more warns */
  max: number;
  /** from this many animals on, the sex and size-match advice applies */
  group: string;
  /** other categories it can share with (its own species always can) */
  mates: string[];
  /** why it keeps no other company, or what it can have */
  mateNote: string;
  /** a pair or more is the better way to keep it (animals), else alone is fine */
  social?: number;
  /** needs water in the enclosure */
  water?: true;
  /** length (mm) by age (months since hatching or metamorphosis); the age of a juvenile is read back from its length */
  grow: [number, number][];
  /** space for a juvenile, by its length: up to `to` mm it needs `k` of the adult floor (and `h` in of height). The last stage is the adult. */
  stages: { to: number; k: number; h?: number }[];
  /** how to tell the sex, and from when (months) it can be told */
  sexing: { from: number; how: string };
  /** sex rules: two males fight / two females fight / a male and a female breed */
  males2?: true;
  females2?: true;
  mixed?: true;
}

export const HERP: Record<string, HerpRule> = {
  'Eublepharis macularius': {
    name: 'Leopard gecko', min: 4.5, rec: 6, each: 3, hMin: 12, max: 2,
    group: 'Keep alone unless you know both are female: two males always fight and a male pesters females. Two females need a bigger enclosure and a watch for bullying.',
    mates: [], mateNote: 'It wants a dry, hot enclosure and eats small frogs and insects; every amphibian needs damp air.',
    grow: [[0, 80], [2, 125], [6, 150], [12, 185], [18, 220]], stages: [{ to: 120, k: 0.3 }, { to: 180, k: 0.55 }, { to: 1e9, k: 1 }],
    sexing: { from: 6, how: 'From about 5 to 6 in (4 to 6 months or more): males show a V of pores and two bulges behind the vent, females neither. Before that, call it unsexed.' },
    males2: true, mixed: true,
  },
  'Correlophus ciliatus': {
    name: 'Crested gecko', min: 2.25, rec: 4, each: 2.25, hMin: 24, max: 3,
    group: 'Never two males. Females only, similar size, moved in together, with several food dishes and hides; a lone gecko is the safe default.',
    mates: [], mateNote: 'It is a climber that eats small frogs and needs moist air, so a dry-ground species is wrong too.',
    grow: [[0, 70], [2, 90], [6, 130], [12, 180], [18, 200]], stages: [{ to: 120, k: 0.44, h: 12 }, { to: 165, k: 0.44, h: 18 }, { to: 1e9, k: 1 }],
    sexing: { from: 6, how: 'A bulge below the vent shows in males from about 6 months (18 to 25 g); pores under a loupe come earlier but mislead. Wait for the bulge.' },
    males2: true, mixed: true,
  },
  'Anolis carolinensis': {
    name: 'Green anole', min: 1.5, rec: 2.25, each: 0.75, hMin: 24, max: 4,
    group: 'One male only (males fight and display at each other); a male with up to three females works. Keep them similar in size.',
    mates: [], mateNote: 'It is a small climber that wants humid air and a warm basking spot; a bigger lizard or a frog is the wrong company.',
    // growth and sexing from general keeper knowledge, not searched (research gap): hatchlings are about 50 mm, adult at 8 to 12 months
    grow: [[0, 50], [3, 100], [8, 160], [12, 180]], stages: [{ to: 100, k: 0.5, h: 12 }, { to: 1e9, k: 1 }],
    sexing: { from: 3, how: 'Males show a pink dewlap (throat fan) and a bigger head from about 3 months, with a pair of bulges behind the vent; females have a small or no dewlap, often a white stripe down the back.' },
    males2: true,
  },
  // no brown anole figure was found (research/research-herp-stocking.md, gap): borrowed from the green anole, which keeps the same way
  'Anolis sagrei': {
    name: 'Brown anole', min: 1.5, rec: 2.25, each: 0.75, hMin: 18, max: 4,
    group: 'One male only; a male with up to three females is the usual group. No brown-anole-specific figure was found, so this follows the green anole.',
    mates: [], mateNote: 'It is a small, fast lizard that wants a basking spot and moderate humidity; it outcompetes and eats smaller lizards.',
    grow: [[0, 45], [3, 90], [8, 150], [12, 180]], stages: [{ to: 90, k: 0.5, h: 12 }, { to: 1e9, k: 1 }],
    sexing: { from: 3, how: 'Males have a red-orange dewlap, a bigger head and body and a pair of bulges behind the vent; females have a small dewlap or none and often a pale back stripe.' },
    males2: true,
  },
  'Python regius': {
    name: 'Ball python', min: 4.5, rec: 8, each: 0, hMin: 18, max: 1,
    group: 'Every source says one per enclosure: fights, stress and shared disease.',
    mates: [], mateNote: 'It eats anything small enough and wants a hot, dry-to-moderate enclosure.',
    grow: [[0, 250], [6, 500], [12, 600], [24, 850], [36, 1000], [48, 1200]], stages: [{ to: 350, k: 0.3 }, { to: 610, k: 0.55 }, { to: 1000, k: 0.9 }, { to: 1e9, k: 1 }],
    sexing: { from: 0, how: 'It cannot be seen from outside. An experienced keeper or vet probes or pops it (best on a hatchling or adult), or send a shed for a DNA test.' },
  },
  'Dendrobates tinctorius': {
    name: 'Dyeing dart frog', min: 1.5, rec: 2.25, each: 1, hMin: 12, max: 3,
    group: 'A male and a female is the standard pair. Females turn on each other from about 10 to 16 months; two or three males with one female is reported to work. Be ready to separate them.',
    mates: [], mateNote: 'It is toxic to tankmates and shy; other species compete for food and carry different diseases.',
    grow: [[0, 12], [3, 16], [8, 30], [15, 45]], stages: [{ to: 25, k: 0.6 }, { to: 1e9, k: 1 }],
    sexing: { from: 9, how: 'Hard before 8 to 10 months. Males have wider toe discs; females are larger, rounder and carry eggs. A DNA test settles it.' },
    females2: true,
  },
  'Ranoidea caerulea': {
    name: "White's tree frog", min: 2.25, rec: 3, each: 0.75, hMin: 24, max: 5,
    group: 'Easy-going in a group, but keep them similar in size: a bigger frog eats a smaller one. Three or more want about 36 in of height.',
    mates: [], mateNote: 'A big frog eats smaller frogs, spiders and anything that fits in its mouth.',
    grow: [[0, 35], [4, 75], [10, 95], [24, 100]], stages: [{ to: 60, k: 0.6, h: 12 }, { to: 1e9, k: 1 }],
    sexing: { from: 12, how: 'Roughly after a year: males have a grey, wrinkled throat and dark pads at the thumb base; females a white throat. Buy 4 or 5 if you want both sexes.' },
  },
  'Bombina orientalis': {
    name: 'Fire-bellied toad', min: 1.4, rec: 2, each: 0.5, hMin: 12, max: 8, water: true,
    group: 'Social and peaceful in a group; about half the floor should be water.',
    mates: [], mateNote: 'Its skin is toxic to other animals and no source recommends tankmates.',
    grow: [[0, 15], [6, 35], [12, 45]], stages: [{ to: 25, k: 0.6 }, { to: 1e9, k: 1 }],
    sexing: { from: 12, how: 'Adult males have nuptial pads on the first two fingers and a rougher back, clearest in the breeding season. Juveniles cannot be sexed.' },
  },
  'Cynops orientalis': {
    name: 'Chinese fire-bellied newt', min: 1.4, rec: 2.5, each: 0.6, max: 8, water: true,
    group: 'Peaceful in groups of its own kind; a tight lid, since it climbs out.',
    mates: ['fw-invert'], mateNote: 'Cherry shrimp and snails are fine; fish are not recommended.',
    grow: [[0, 30], [12, 55], [24, 80], [36, 90]], stages: [{ to: 50, k: 0.6 }, { to: 1e9, k: 1 }],
    sexing: { from: 18, how: 'Only in adults, best in the breeding season: males have a swollen cloaca and a taller tail. Juveniles are almost impossible and take 1 to 3 years.' },
  },
  'Hymenochirus boettgeri': {
    name: 'African dwarf frog', min: 1.25, rec: 1.4, each: 0.4, max: 8, social: 3, water: true,
    group: 'Social: keep three or more rather than one or two.',
    mates: ['fw-fish', 'fw-invert'], mateNote: 'Small, peaceful fish of 3 in or less. Not bettas or fancy guppies (they get their fins nipped), cichlids, or anything it can swallow.',
    grow: [[0, 10], [3, 20], [9, 32], [12, 35]], stages: [{ to: 1e9, k: 1 }],
    sexing: { from: 9, how: 'Males have a small white gland behind each front leg and hum; females are larger and rounder. About 9 months.' },
  },
  'Ambystoma mexicanum': {
    name: 'Axolotl', min: 2.5, rec: 2.5, each: 1.25, max: 3, water: true,
    group: 'Best alone. Two or three only if they are within about 2 in of one another in length (a bigger one eats a smaller one), with extra hides.',
    mates: [], mateNote: 'Fish and shrimp nip its gills and compete for food, and big axolotls eat small tankmates.',
    grow: [[0, 12], [3, 75], [6, 150], [9, 210], [12, 230]], stages: [{ to: 130, k: 0.5 }, { to: 200, k: 0.75 }, { to: 1e9, k: 1 }],
    sexing: { from: 9, how: 'From about 8 to 12 months: males have a swollen cloaca and a slimmer body. Early bumps can shrink again, so wait.' },
  },
};

export const SQFT_MM2 = 92903.04;
/** Floor needed (sq ft) for n animals of a rule: [bare minimum, recommended]. */
export const floorFor = (r: HerpRule, n: number): [number, number] => [r.min + r.each * (n - 1), r.rec + r.each * (n - 1)];

const lerp = (c: [number, number][], by: 0 | 1, v: number): number => {
  const o = by ? 0 : 1;
  if (v <= c[0][by]) return c[0][o];
  for (let i = 1; i < c.length; i++) if (v <= c[i][by]) return c[i - 1][o] + (c[i][o] - c[i - 1][o]) * (v - c[i - 1][by]) / (c[i][by] - c[i - 1][by]);
  return c[c.length - 1][o];
};
/** Age in months at which a rule's animal is `mm` long, and its length at a given age. */
export const ageAtLength = (r: HerpRule, mm: number) => lerp(r.grow, 1, mm);
export const lengthAtAge = (r: HerpRule, months: number) => lerp(r.grow, 0, months);
/** The stage a juvenile of this length is in. */
export const stageOf = (r: HerpRule, mm: number) => r.stages.findIndex(st => mm <= st.to);
