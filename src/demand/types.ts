// Demand model types (lane KK, 2026-10-19). Three live readouts for the current tank: money (setup + upkeep), time, risk.
// Every contributor carries a lo / mode / hi triangle only so its mean (the expected value) and the price-age widening are exact;
// the user sees one expected number per bar (decision 2026-10-19, lane DS).
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
  /** A dollar cap a month (Guardrails, scene/constraints.ts); wins over `upkeep` when set. */
  upkeepUsd?: number;
  minPerWeek?: number;
  risk?: 'safe' | 'moderate' | 'any';
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
  /** USD per month, without electricity and without the loss replacement (engine.ts adds those) */
  upkeep?: Range3;
  /** kWh per month; priced at the user's rate */
  kwhMo?: number;
  minutes?: Range3;
  /** days between sessions of this task (1 = daily, 7 = weekly); `minutes` stays the weekly mean, so one session is about minutes x everyDays / 7 */
  everyDays?: number;
  /** risk points after skill scaling */
  risk: number;
  domain?: Domain;
  /** replaced when it dies: engine.ts adds setup x annual loss rate / 12 to the upkeep */
  livestock?: boolean;
  /** USD per month expected replacement of what dies (mean replacement, added to the expected upkeep) */
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
