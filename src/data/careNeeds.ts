// Essential care conditions (lane RF, 2026-10-22; research/rules-spec.md section 6, first finding): what an animal needs whatever the group
// count (feeding, tank maturity, its environment), evaluated on their own and shown beside every group result, never inside a group band.
// Before this the mandarin's live-pod line sat in groups.ts as its "avoid" band message, which a count of 1 never reaches, so it never showed.
// Wording only, no numbers: the lines that were band messages in groups.ts (P1 data, research/groups-sources.md) moved here.

/** feeding = what it eats and whether the tank supplies it; maturity = how established the tank must be; environment = a fixture or condition */
export type NeedKind = 'feeding' | 'maturity' | 'environment';
/** rules-spec section 3: S3 death or injury, S2 chronic harm, S1 reduced success */
export type NeedSeverity = 'S3' | 'S2' | 'S1';
export interface CareNeed {
  kind: NeedKind;
  severity: NeedSeverity;
  /** the condition, in words */
  text: string;
}
/** How a need stands for a given plan: 'unchecked' = the engine has no model for it (no food supply, no tank age), so it is the user's to confirm. */
export interface NeedResult extends CareNeed { status: 'met' | 'unmet' | 'unchecked' }

export const NEEDS: Record<string, CareNeed[]> = {
  mandarin: [
    { kind: 'feeding', severity: 'S3', text: 'Feeding: eats live copepods (pods) and needs a pod-rich tank or a steady pod supply' },
    { kind: 'maturity', severity: 'S3', text: 'Tank maturity: needs a mature reef with an established pod population, not a newly cycled tank' },
  ],
  hatchet: [{ kind: 'environment', severity: 'S3', text: 'Lid: hatchetfish jump; needs a tight lid' }],
  // S238 (2026-10-26): crayfish climb out of an open top (The Shrimp Farm: a lid is required; Guidarium and Aquatic Arts: escape artists); the Thai micro crab too (Aquariadise)
  ...Object.fromEntries(['cpo', 'cajundwarf', 'rswcrayfish', 'redclaw'].map(id => [id, [{ kind: 'environment', severity: 'S3', text: 'Lid: crayfish climb out; needs a tight lid, and gaps for cords and hoses closed' }]])),
  thaicrab: [{ kind: 'environment', severity: 'S2', text: 'Lid: micro crabs escape through gaps; needs a lid with small cord openings' }],
  hermit: [{ kind: 'environment', severity: 'S2', text: 'Shells: needs a spare shell each; short of shells they can attack snails' }],
  // an advisory, not a computed result: the engine does not model territorial behaviour (gbr review 2026-10-22)
  gbr: [{ kind: 'environment', severity: 'S1', text: 'Breeding territory: when breeding, rams may chase other bottom-dwelling fish; provide separate sheltered areas and watch for any fish kept away from food or cover' }],
  // RX1 (R139 phase 1, 2026-11-18): the essential conditions and warnings of the new species, from the pages in research/screens/RX1/README.md
  endler: [{ kind: 'environment', severity: 'S1', text: 'Water: moderately hard to hard and alkaline; soft acid water is tolerated but is not the long-term home (Seriously Fish)' }],
  threespot: [{ kind: 'environment', severity: 'S2', text: 'Temperament: males are territorial and some turn spiteful as they mature; keep with robust tankmates, one male' }],
  pleco: [{ kind: 'environment', severity: 'S3', text: 'Adult size: sold at 3-4 in but grows to about 15 in, needs a 75 gal or larger tank and heavy filtration; adults are territorial and very messy' }],
  glowlight: [{ kind: 'environment', severity: 'S1', text: 'Group: stays shy and stressed below six; ten or more is better' }],
  convict: [{ kind: 'environment', severity: 'S2', text: 'Breeding: becomes violent when breeding and will attack fish several times its size; a species tank or a pair, with caves' }],
  electricblueacara: [{ kind: 'environment', severity: 'S2', text: 'Pairs: peaceful for a cichlid until it pairs, then it claims the floor; other fish may need to go unless the tank is very large' }],
  clownkilli: [{ kind: 'environment', severity: 'S2', text: 'Water: soft and acidic; it is small and specialised, not an easy community fish, and wants small live or frozen foods' }],
  peacockgudgeon: [{ kind: 'environment', severity: 'S1', text: 'Territory: males flare and squabble with each other; keep a small group with cover to break sight lines' }],
  falsejulii: [{ kind: 'environment', severity: 'S1', text: 'Group: a group of at least six is best; most fish sold as julii cory are this species' }],
  koletang: [{ kind: 'feeding', severity: 'S2', text: "Feeding: grazes algae and detritus all day; needs algae growth or algae foods daily, not a nori-only diet" }, { kind: 'environment', severity: 'S1', text: "Territory: chases other bristletooth tangs and can nip fins; keep one" }],
  foxface: [{ kind: 'environment', severity: 'S2', text: "Venom: stout venomous spines on the dorsal, anal and pelvic fins; a sting is painful, so net and handle it with care" }, { kind: 'feeding', severity: 'S2', text: "Feeding: a herbivore that needs algae and greens every day; underfed it may nip corals and soft invertebrates" }],
  bichirb: [{ kind: 'environment', severity: 'S3', text: 'Adult size: sold at 2-4 in but grows to 12-16 in; needs a tank about 5-6 ft long and 2 ft front to back' }, { kind: 'environment', severity: 'S3', text: 'Lid: bichirs escape through the smallest gap; needs a tight lid with every opening covered' }, { kind: 'environment', severity: 'S2', text: 'Air: breathes air at the surface; leave a gap between the water and the lid' }, { kind: 'feeding', severity: 'S2', text: 'Feeding: a nocturnal predator of meaty foods; feed after lights out and keep fish small enough to swallow out of the tank' }],
  clownknife: [{ kind: 'environment', severity: 'S3', text: 'Adult size: sold at 3-4 in but passes 3 ft in a home tank; needs a tank about 7 ft long for life, which few homes can give' }, { kind: 'environment', severity: 'S3', text: 'Lid: knifefish jump; needs a heavy, tight lid' }, { kind: 'environment', severity: 'S2', text: 'Water: needs strongly oxygenated water, a big mature filter and large weekly water changes' }, { kind: 'feeding', severity: 'S2', text: 'Feeding: a nocturnal predator; feed prawn, fish strips and mussels, not feeder fish; dim light and cover by day' }],
  bambooshark: [{ kind: 'environment', severity: 'S3', text: 'Adult size: grows to about 3 ft and lives about 25 years; needs a floor at least as wide front to back as it is long, a custom tank about 7 ft x 41 in; no stock tank fits' }, { kind: 'environment', severity: 'S2', text: 'Rockwork: strong enough to knock over loose decor; set rock on the glass and secure it, and give it a shaded hide' }, { kind: 'feeding', severity: 'S2', text: 'Feeding: shrimp, scallop, squid and marine fish two or three times a week, with an iodine supplement; not reef-safe with crabs, shrimp or small fish' }],
  flameangel: [{ kind: 'environment', severity: 'S2', text: "Corals: reef safe with caution; some nip stony and soft corals, more when underfed" }, { kind: 'environment', severity: 'S1', text: "Territory: semi-aggressive toward other dwarf angels; keep one unless the tank is very large" }],
  lawnmowerblenny: [{ kind: 'feeding', severity: 'S2', text: "Feeding: scrapes algae and detritus off rock; needs a mature tank with algae growth, or daily algae sheets, and can starve in a clean new tank" }, { kind: 'environment', severity: 'S1', text: "Reef: may eat small crustaceans and nip an occasional polyp; fights other blennies" }],
  orchiddottyback: [{ kind: 'environment', severity: 'S2', text: "Territory: claims a cave and chases smaller fish that come near it, above all other dottybacks and look-alikes; keep one, with robust or dissimilar tankmates" }, { kind: 'environment', severity: 'S1', text: "Cover: needs caves and overhangs in the rockwork to claim" }],
  pajamacardinal: [{ kind: 'feeding', severity: 'S1', text: "Feeding: a shy, nocturnal fish that takes small meaty foods; make sure it gets fed after the lights dim" }, { kind: 'environment', severity: 'S1', text: "Group: happiest in a small school with dim hiding places, not alone; may eat tiny crustaceans such as pods and baby shrimp" }],
  yellowtailblue: [{ kind: 'environment', severity: 'S2', text: "Territory: claims a patch of rock and chases other fish, most of all other damsels, and above all while guarding eggs; give it its own rock and robust tankmates" }],
  tailspotblenny: [{ kind: 'feeding', severity: 'S2', text: "Feeding: a grazer; needs algae on the rock or daily nori and greens" }, { kind: 'environment', severity: 'S1', text: "Cover: needs holes and crevices in the rockwork to retreat to; fights other blennies of a similar shape" }, { kind: 'environment', severity: 'S3', text: "Lid: jumps; needs a tight lid" }],
  neonrainbow: [{ kind: 'environment', severity: 'S1', text: 'Group: does far better in a shoal of six to eight or more; males deepen and colour up with age' }],
  firemouth: [{ kind: 'environment', severity: 'S2', text: 'Breeding: territorial when spawning and may eat much smaller fish; best as a pair, gregarious only outside spawning' }],
  saltpepper: [{ kind: 'environment', severity: 'S1', text: 'Group: at least four to six, ideally ten or more; a small cory that stays close to the floor' }],
  clownpleco: [{ kind: 'feeding', severity: 'S2', text: 'Feeding: eats wood as part of its diet; needs driftwood in the tank, plus algae wafers and vegetables' }],
  yoyoloach: [{ kind: 'environment', severity: 'S3', text: 'Lid: yoyo loaches jump; needs a tight lid' }, { kind: 'environment', severity: 'S2', text: 'Tankmates: boisterous and can nip long, slow fins (bettas, guppies, many cichlids are poor partners); needs a group of five or six or more' }],
  glasscatfish: [{ kind: 'environment', severity: 'S2', text: 'Light and cover: timid, prefers dim light with floating plants, and does not compete with large or boisterous fish; needs a group of six or more' }],
};

const KIND_NAME: Record<NeedKind, string> = { feeding: 'food supply', maturity: 'tank age', environment: 'fixture' };

/** The species' essential conditions for a plan, independent of how many are kept. The engine models none of them yet, so each is
 *  'unchecked' (rules-spec section 3: report the limitation; never imply another answer would fix it). */
export function needsOf(id: string): NeedResult[] {
  return (NEEDS[id] ?? []).map(n => ({ ...n, status: 'unchecked' as const }));
}

/** One line per need as the screens show it. */
export function needLine(n: NeedResult): string {
  return n.status === 'unchecked' ? `${n.text}. Not checked: the tool cannot see the ${KIND_NAME[n.kind]}; confirm it before buying` : n.text;
}
