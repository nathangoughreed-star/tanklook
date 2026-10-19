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
}

export const HERP: Record<string, HerpRule> = {
  'Eublepharis macularius': {
    name: 'Leopard gecko', min: 4.5, rec: 6, each: 3, hMin: 12, max: 2,
    group: 'Keep alone unless you know both are female: two males always fight and a male pesters females. Two females need a bigger enclosure and a watch for bullying.',
    mates: [], mateNote: 'It wants a dry, hot enclosure and eats small frogs and insects; every amphibian needs damp air.',
  },
  'Correlophus ciliatus': {
    name: 'Crested gecko', min: 2.25, rec: 4, each: 2.25, hMin: 24, max: 3,
    group: 'Never two males. Females only, similar size, moved in together, with several food dishes and hides; a lone gecko is the safe default.',
    mates: [], mateNote: 'It is a climber that eats small frogs and needs moist air, so a dry-ground species is wrong too.',
  },
  'Anolis carolinensis': {
    name: 'Green anole', min: 1.5, rec: 2.25, each: 0.75, hMin: 24, max: 4,
    group: 'One male only (males fight and display at each other); a male with up to three females works. Keep them similar in size.',
    mates: [], mateNote: 'It is a small climber that wants humid air and a warm basking spot; a bigger lizard or a frog is the wrong company.',
  },
  // no brown anole figure was found (research/research-herp-stocking.md, gap): borrowed from the green anole, which keeps the same way
  'Anolis sagrei': {
    name: 'Brown anole', min: 1.5, rec: 2.25, each: 0.75, hMin: 18, max: 4,
    group: 'One male only; a male with up to three females is the usual group. No brown-anole-specific figure was found, so this follows the green anole.',
    mates: [], mateNote: 'It is a small, fast lizard that wants a basking spot and moderate humidity; it outcompetes and eats smaller lizards.',
  },
  'Python regius': {
    name: 'Ball python', min: 4.5, rec: 8, each: 0, hMin: 18, max: 1,
    group: 'Every source says one per enclosure: fights, stress and shared disease.',
    mates: [], mateNote: 'It eats anything small enough and wants a hot, dry-to-moderate enclosure.',
  },
  'Dendrobates tinctorius': {
    name: 'Dyeing dart frog', min: 1.5, rec: 2.25, each: 1, hMin: 12, max: 3,
    group: 'A male and a female is the standard pair. Females turn on each other from about 10 to 16 months; two or three males with one female is reported to work. Be ready to separate them.',
    mates: [], mateNote: 'It is toxic to tankmates and shy; other species compete for food and carry different diseases.',
  },
  'Ranoidea caerulea': {
    name: "White's tree frog", min: 2.25, rec: 3, each: 0.75, hMin: 24, max: 5,
    group: 'Easy-going in a group, but keep them similar in size: a bigger frog eats a smaller one. Three or more want about 36 in of height.',
    mates: [], mateNote: 'A big frog eats smaller frogs, spiders and anything that fits in its mouth.',
  },
  'Bombina orientalis': {
    name: 'Fire-bellied toad', min: 1.4, rec: 2, each: 0.5, hMin: 12, max: 8, water: true,
    group: 'Social and peaceful in a group; about half the floor should be water.',
    mates: [], mateNote: 'Its skin is toxic to other animals and no source recommends tankmates.',
  },
  'Cynops orientalis': {
    name: 'Chinese fire-bellied newt', min: 1.4, rec: 2.5, each: 0.6, max: 8, water: true,
    group: 'Peaceful in groups of its own kind; a tight lid, since it climbs out.',
    mates: ['fw-invert'], mateNote: 'Cherry shrimp and snails are fine; fish are not recommended.',
  },
  'Hymenochirus boettgeri': {
    name: 'African dwarf frog', min: 1.25, rec: 1.4, each: 0.4, max: 8, social: 3, water: true,
    group: 'Social: keep three or more rather than one or two.',
    mates: ['fw-fish', 'fw-invert'], mateNote: 'Small, peaceful fish of 3 in or less. Not bettas or fancy guppies (they get their fins nipped), cichlids, or anything it can swallow.',
  },
  'Ambystoma mexicanum': {
    name: 'Axolotl', min: 2.5, rec: 2.5, each: 1.25, max: 3, water: true,
    group: 'Best alone. Two or three only if they are within about 2 in of one another in length (a bigger one eats a smaller one), with extra hides.',
    mates: [], mateNote: 'Fish and shrimp nip its gills and compete for food, and big axolotls eat small tankmates.',
  },
};

export const SQFT_MM2 = 92903.04;
/** Floor needed (sq ft) for n animals of a rule: [bare minimum, recommended]. */
export const floorFor = (r: HerpRule, n: number): [number, number] => [r.min + r.each * (n - 1), r.rec + r.each * (n - 1)];
