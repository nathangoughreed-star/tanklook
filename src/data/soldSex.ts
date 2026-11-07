// How each species with a sex-ratio, males or pair rule is usually SOLD (lane DA4, 2026-11-06, Nathan: "we should only include info like
// this when the species is commonly sold by the correct sex"). A mixed bag is the normal purchase for most schooling fish, so telling the
// owner their mix is "short on females" is not actionable there. The sex-mix verdict (CARE.sexed "Your mix is ...", the males-fight line
// and the "keep 1 male to N females" advice on a fight warning) is shown only where `by` is 'sexed'; an unsexed species gets at most a
// grey tip (stockPlanLogic.notesOf). Group-size minimums and the pairing question are not touched by this.
// `by`: 'sexed' = retailers commonly offer or sell it by sex (male / female / pair / trio listings, or males only); 'unsexed' = sold as
// juveniles or a mixed bag with no sex choice. `sure`: false = a judgement from thin evidence (no listing found either way, or mixed).
// `basis`: what the call rests on; the pages were checked 2026-11-06 (retailer listings: Aquatic Arts, LiveFishDirect, aquariumfish.com,
// PlantedAquaria, iFISH, Finchville, Josh's Frogs, Tails and Scales; Aquahuna, which picks sex at random).
export interface SoldBy { by: 'sexed' | 'unsexed'; sure: boolean; basis: string }
const S = (by: SoldBy['by'], sure: boolean, basis: string): SoldBy => ({ by, sure, basis });
export const SOLD_BY: Record<string, SoldBy> = {
  // schooling fish: bags of mixed fish
  cpd: S('unsexed', true, 'LiveAquaria sells it as a group; eBay lists it unsexed; Aquahuna picks the sex at random'),
  cherrybarb: S('sexed', true, 'iFISH, Finchville and Tails and Scales sell males only (the red ones); other shops sell a mixed 3-pack'),
  boesemani: S('unsexed', true, 'sold almost only as drab juveniles; listings say "unsexed juvenile"; Aquatic Arts and iFISH list no sex choice'),
  // livebearers (Nathan kept the livebearer ratio warning at DA3)
  guppy: S('sexed', true, 'male, female, pair and trio listings (PlantedAquaria, Flip Aquatics, Light.fish); males are sold apart because they are the colourful ones'),
  platy: S('sexed', false, 'no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3)'),
  molly: S('sexed', false, 'no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3)'),
  swordtail: S('sexed', false, 'no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3)'),
  // gouramis
  gourami: S('unsexed', false, 'pearl gourami listings are often marked "unsexed" (BioAcuatica) and shops say they cannot guarantee sex; males are the showy ones, so some shops sell males'),
  dwarfgourami: S('sexed', false, 'shops sell mostly males (the colourful ones); no male / female choice found, the existing males rule stays'),
  // cichlids
  kribensis: S('sexed', true, 'sold as 1 male + 1 female pairs (Dan\'s Fish, Light.fish, Imperial Tropicals)'),
  cockatoo: S('sexed', true, 'aquariumfish.com sells pairs and males; Fish Barn sells females alone; schools of 4 for juveniles'),
  yellowlab: S('unsexed', true, 'sold as unsexed juveniles (Capital Cichlids sellers, LiveFishDirect "unsexed juvenile" option, Guidarium)'),
  peacock: S('sexed', true, 'LiveFishDirect offers Male / Female / Unsexed; ThatPetPlace and Rockland sell adult males; "assorted" bags are mixed'),
  demasoni: S('unsexed', false, 'no listing found with a sex option; sold as small juveniles that cannot be sexed (the species note says so)'),
  kadango: S('sexed', false, 'a peacock-type haplochromine: adult males are the product, but juveniles are common; no listing found either way'),
  labeo: S('unsexed', false, 'no listing found with a sex option; mbuna juveniles are sold unsexed'),
  auratus: S('unsexed', false, 'sold as small juveniles; a breeder lists a 1 male + 1 female pair (ohmy.ca), but the usual lot is unsexed'),
  livingstonii: S('unsexed', false, 'no listing found with a sex option; sold by size'),
  afra: S('unsexed', false, 'no listing found with a sex option; mbuna juveniles are sold unsexed'),
  // pair formers (the pairing question is a separate rule and stays)
  gbr: S('sexed', false, 'sold as pairs or by sex by specialist shops; pet-store fish are often unsexed'),
  bolivianram: S('unsexed', false, 'sold as singles or "pairs" of unsexed fish; no confirmed M / F listing found'),
  angel: S('unsexed', true, 'sold as juveniles by size; only "breeding pairs" are sold paired'),
  discus: S('unsexed', true, 'sold as juveniles by size; only proven pairs are sold paired, and discus cannot be sexed by eye'),
  ocellaris: S('unsexed', true, 'sold singly or as a matched pair; all clownfish start male, so the sex is not offered'),
  banggai: S('unsexed', true, 'sold singly or as a pair; the sexes look alike'),
  firefish: S('unsexed', true, 'sold singly or as a pair; the sexes look alike'),
  watchman: S('unsexed', true, 'sold singly or as a pair; the sexes look alike'),
  // catfish, puffers
  bristlenose: S('sexed', false, 'LiveFishDirect offers a sex selection on its bristlenose pages; eBay sells 2 male + 1 female colony packs; many shops sell unsexed juveniles (sexing a 1 in fish is guesswork)'),
  peapuffer: S('unsexed', false, 'sold unsexed; sexing small puffers is hard; no listing found with a sex option'),
  // inverts
  cherryshrimp: S('unsexed', false, 'sold by the dozen with no sex choice (the ratio is only a breeding tip)'),
  cpo: S('sexed', true, 'Aquatic Arts sells an unsexed single, a guaranteed female and a male / female pair; males and females are easy to tell apart'),
  cajundwarf: S('sexed', false, 'same dwarf-crayfish trade as the CPO (Aquatic Arts-style male / female / pair listings); none found for this one by name'),
  // herps
  dartfrog: S('unsexed', true, 'captive-bred juveniles are "unsexed unless otherwise noted" (Josh\'s Frogs, breeders); proven pairs are rare and expensive'),
  greenanole: S('unsexed', false, 'wild-import green anoles are listed "Sex: Unsexed" (Tails and Scales); pet stores sell them mixed'),
  greenanolebrown: S('unsexed', false, 'as the green anole'),
  brownanole: S('unsexed', false, 'as the green anole'),
};
/** Is the species commonly sold by sex? (Absent from the table: true, so a species without a call keeps its rule.) */
export const soldBySex = (id: string): boolean => SOLD_BY[id] ? SOLD_BY[id].by === 'sexed' : true;
