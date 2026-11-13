// Difficulty of setting up and running each KIND of gear, lane CL1 2026-11-13. ESTIMATES from 1-3 pages each (research/sourcing/cl1/CL1-gear-difficulty.json).
// Scale: 1 = forgiving for a first-timer, 2 = needs some research or attention, 3 = fails often without experience. Not about price. NOT WIRED to anything yet (UI2 decision 16, experience gate). conf low = one page or a real split.
export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY_NAME: Record<Difficulty, string> = { 1: "Beginner", 2: "Intermediate", 3: "Expert" };
export interface GearCare { level: Difficulty; conf: "high" | "medium" | "low"; /** pages opened */ n: number; why: string }
export const GEAR_CARE: Record<string, GearCare> = {
  hob: { level: 1, conf: 'high', n: 3, why: "Three sources call it the beginner default; only limit is media capacity." },
  canister: { level: 2, conf: 'high', n: 3, why: "All three say more plumbing and upkeep than HOB; workable with some experience." },
  internal: { level: 1, conf: 'medium', n: 1, why: "Only one page I opened covered internals; others seen in search results (Co-Op forum) not opened." },
  sponge: { level: 1, conf: 'high', n: 3, why: "All agree it is the simplest filter; two of the three pages are the same site (Co-Op)." },
  heater: { level: 1, conf: 'high', n: 2, why: "Two sources agree it is easy; the real risk is a stuck-on unit, mitigated by thermometer and quality brand." },
  lightbasic: { level: 1, conf: 'high', n: 3, why: "All three name low light as the beginner path; two are the same site." },
  lightplanted: { level: 2, conf: 'medium', n: 3, why: "High PAR needs CO2 and ferts (3); the schedule-tuning page alone reads as moderate (2)." },
  lightreef: { level: 2, conf: 'medium', n: 2, why: "Two sources agree on moderate effort with real bleaching risk; neither rates difficulty directly." },
  co2pressurized: { level: 2, conf: 'high', n: 3, why: "Assembly is easy but tuning and overdose risk make it intermediate; one source reads it as simple." },
  co2diy: { level: 2, conf: 'medium', n: 2, why: "Two sources agree: easy to build, hard to keep steady." },
  co2liquid: { level: 2, conf: 'low', n: 1, why: "Only one page opened; Aquarium Co-Op page returned nothing on it. Plant sensitivity (Vallisneria melt) is the main catch." },
  airpump: { level: 1, conf: 'medium', n: 2, why: "Both sources are one site; no source disagrees." },
  powerhead: { level: 2, conf: 'medium', n: 3, why: "Sources describe placement and sizing judgment, not a difficulty label; electrically simple but easy to place badly." },
  wavemaker: { level: 2, conf: 'medium', n: 3, why: "All say setup is judgment and ongoing tuning; none rate difficulty directly." },
  chillerfan: { level: 1, conf: 'high', n: 2, why: "Both call fans the easy option; only catch is higher evaporation and limited cooling." },
  chillercomp: { level: 2, conf: 'high', n: 3, why: "Three sources agree: plumbing, sizing and ventilation need some experience, but nothing specialist." },
  skimmerhob: { level: 2, conf: 'medium', n: 3, why: "Easiest skimmer type to install, but all skimmers need break-in, tuning and upkeep; reef-only gear." },
  skimmersump: { level: 2, conf: 'medium', n: 3, why: "Consistent moderate tuning burden, but sources are mostly one reef retailer." },
  sump: { level: 2, conf: 'medium', n: 3, why: "Sources agree on moderate plumbing skill with real flood risk; two are the same publisher, and none rates it beginner-safe." },
  returnpump: { level: 2, conf: 'medium', n: 2, why: "Sizing math (head loss) trips beginners; installing and running it is easy. Two sources only." },
  ato: { level: 2, conf: 'medium', n: 3, why: "Simple to install, but a failure can flood or crash salinity, so safeguards and upkeep are required." },
  uvinternal: { level: 2, conf: 'low', n: 1, why: "One source opened (Aquarium Advice page returned 403); it points to moderate sizing and flow-tuning difficulty." },
  doser: { level: 2, conf: 'medium', n: 1, why: "One source opened (Aquifarm returned 403); calibration and overdose risk argue for intermediate." },
  feeder: { level: 1, conf: 'medium', n: 2, why: "Simple device; the failure mode is jamming or overfeeding, so test run it before travel." },
  rodi: { level: 2, conf: 'medium', n: 2, why: "Easy install, but needs TDS meter and timely media changes to avoid contaminated water; one retailer." },
  testkit: { level: 1, conf: 'high', n: 2, why: "Both treat testing as beginner-friendly; main failure is user error and reading colors." },
  thermometer: { level: 1, conf: 'medium', n: 2, why: "A plain thermometer is trivial; a controller with backup adds a little setup, so level 1 with an upper-end note." },
  lid: { level: 1, conf: 'high', n: 2, why: "Neither source describes setup difficulty; the issues are fit, heat and light trade-offs, easy to manage." },
};
