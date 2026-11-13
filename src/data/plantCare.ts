// Keeper difficulty of each aquarium / riparium plant item (src/scene/items.ts ids), lane CL1 2026-11-13. ESTIMATES from 2-3 care pages each
// (research/sourcing/cl1/CL1-plant-difficulty.json holds the pages, labels and reasons). Scale: 1 = forgiving for a first-timer, 2 = needs some research or attention, 3 = fails often without experience.
// NOT WIRED to anything yet (UI2 decision 16, experience gate). conf low = one page or a real split.
export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY_NAME: Record<Difficulty, string> = { 1: "Beginner", 2: "Intermediate", 3: "Expert" };
export interface PlantCare { level: Difficulty; conf: "high" | "medium" | "low"; /** pages opened */ n: number; why: string }
export const PLANT_CARE: Record<string, PlantCare> = {
  anubias: { level: 1, conf: 'high', n: 3, why: "Three sources agree: very forgiving, slow, low light; only rule is do not bury the rhizome." },
  sword: { level: 1, conf: 'high', n: 3, why: "All three say easy; the only demand is root feeding (tabs) and room to grow." },
  rotala: { level: 1, conf: 'medium', n: 2, why: "Plain R. rotundifolia is easy; deep red or H'ra forms are level 2 (high light + CO2). Only two pages opened (Petco 403)." },
  carpet: { level: 3, conf: 'medium', n: 3, why: "Labels split 3/2/2 but all reasons need strong light + CO2 + rich substrate for HC; Monte Carlo is easier (closer to 2). Flip Aquatics 429, Petco/2Hr Aquarist 4" },
  moss: { level: 1, conf: 'high', n: 3, why: "Three sources agree; main chore is trimming and keeping debris/algae off." },
  hairgrass: { level: 2, conf: 'high', n: 2, why: "Two sources agree and none disagree: carpets reliably only with strong light, CO2 and rich substrate; slow without." },
  frogbit: { level: 1, conf: 'medium', n: 2, why: "Easy to grow; the real work is calm surface, thinning and keeping leaves dry; Guidarium hedges toward middle." },
  crypt: { level: 1, conf: 'high', n: 4, why: "Wendtii clearly beginner; parva is slower and fussier (borderline 2). Main risk is melt after changes, which usually recovers." },
  stemred: { level: 2, conf: 'medium', n: 3, why: "Staying alive is easy (1) but a good red look needs bright light, iron and nitrate tuning (2); plain green-red Ludwigia repens is easier, reineckii and Super Re" },
  pothos: { level: 1, conf: 'medium', n: 2, why: "Easy as long as only roots are wet and leaves stay dry; two sources, no disagreement but both hobby/retail sites." },
  fern: { level: 1, conf: 'high', n: 4, why: "4 sources agree; only failure mode is burying the rhizome" },
  grass: { level: 1, conf: 'high', n: 3, why: "3 sources agree; main risks are liquid carbon and soft water" },
  stem: { level: 1, conf: 'high', n: 3, why: "3 sources agree for the plain green species; trimming workload is the main cost" },
  buce: { level: 1, conf: 'high', n: 3, why: "3 sources agree; expect slow growth, algae-prone leaves, and costly specimens that melt" },
  ludwigia: { level: 1, conf: 'medium', n: 3, why: "plain L. repens is easy; red cultivars and L. arcuata want high light and CO2 (Guidarium rates Rubin intermediate)" },
  balansae: { level: 1, conf: 'medium', n: 3, why: "easy once rooted, but all sources flag melt after planting or any change, so a beginner may see a scary melt phase" },
  ozelot: { level: 1, conf: 'high', n: 3, why: "3 sources agree; needs root tabs in inert substrate and space for its size" },
  sagittaria: { level: 1, conf: 'high', n: 3, why: "3 sources say easy; only issues are iron and melt after transplant" },
  redroot: { level: 1, conf: 'medium', n: 3, why: "2 easy, Aquasabi medium mainly for shipping/condensation fragility; kept 1 once established" },
  salvinia: { level: 1, conf: 'high', n: 3, why: "all say easy; only chore is frequent thinning" },
  lettuce: { level: 1, conf: 'medium', n: 3, why: "split; plant is hardy but open-top tanks and bright light cause leaf burn/decline, so a beginner often gets poor results" },
  lotus: { level: 1, conf: 'medium', n: 3, why: "2 easy, Aquasabi medium; explainable split (size, root feeding, bulb handling)" },
  hornwort: { level: 1, conf: 'high', n: 3, why: "3 sources easy; main cost is trimming and needle shed" },
  anacharis: { level: 1, conf: 'high', n: 3, why: "3 sources easy; warm tanks and diggers are the only cautions" },
};
