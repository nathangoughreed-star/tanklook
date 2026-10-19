// Demand model types (lane KK, 2026-10-19). Three live readouts for the current tank: money (setup + upkeep), time, risk.
// Every contributor carries a range; the totals are an expected value with a likely range (see cost.ts).
export type Range3 = { lo: number; mode: number; hi: number };
/** A plain number means no spread. */
export type Rangeish = Range3 | number;
export type Domain = 'fish' | 'planted' | 'salt' | 'terrarium';
export const DOMAINS: Domain[] = ['fish', 'planted', 'salt', 'terrarium'];
/** 0 new, 1 some, 2 experienced; unset = 0. */
export type Skill = 0 | 1 | 2;
export type WaterSource = 'tap' | 'well' | 'bought-ro' | 'own-ro';

/** One demand shape for every contributor (data tables, gear, and what the engine derives from the scene). */
export interface DemandAdd {
  setupUsd?: Rangeish;
  upkeepUsdMo?: Rangeish;
  /** averaged over the year, yearly jobs included */
  minPerWeek?: Rangeish;
  /** 0-10 raw points, before the user's skill scaling */
  risk?: number;
  riskDomain?: Domain;
}

export interface Limits {
  setupUsd?: number;
  upkeep?: 'free' | 'low' | 'flex';
  minPerWeek?: number;
  risk?: 'safe' | 'moderate' | 'any';
  /** how a $ limit is read: against the expected value, or as the most the user can spend (the 85th percentile) */
  budgetMode?: 'expected' | 'cap';
}
export interface UserProfile {
  skill: { fundamentals: Skill; fish: Skill; planted: Skill; salt: Skill; terrarium: Skill };
  waterSource: WaterSource;
  /** USD per kWh; absent = the default US band */
  kwhUsd?: number;
  limits: Limits;
  mode?: 'guided' | 'free';
}
export const defaultProfile = (): UserProfile => ({ skill: { fundamentals: 0, fish: 0, planted: 0, salt: 0, terrarium: 0 }, waterSource: 'tap', limits: {} });

export type Group = 'tank' | 'gear' | 'plant' | 'animal' | 'hardscape' | 'consumable' | 'work';
/** What one thing in the build adds, normalised (ranges, skill-scaled risk). */
export interface Contribution {
  key: string;
  label: string;
  group: Group;
  setup?: Range3;
  /** USD per month, without electricity and without the loss replacement (cost.ts adds those) */
  upkeep?: Range3;
  /** kWh per month; priced at the user's rate */
  kwhMo?: number;
  minutes?: Range3;
  /** risk points after skill scaling */
  risk: number;
  domain?: Domain;
  /** replaced when it dies: cost.ts adds setup x annual loss rate / 12 to the upkeep */
  livestock?: boolean;
  /** USD per month expected replacement of what dies (the mean of the loss term cost.ts samples) */
  lossMo?: number;
  /** how many of this kind the row stands for (grouping in the driver list) */
  n?: number;
}
export interface Demand {
  items: Contribution[];
  /** means, plus the 0-10 risk score */
  totals: { setupUsd: number; upkeepUsdMo: number; minPerWeek: number; riskRaw: number; risk: number };
  domain: Domain;
  gallons: number;
  warnings: string[];
}
