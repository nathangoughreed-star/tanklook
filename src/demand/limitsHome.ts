// P5: the cost profile's ONE home is the setup's brief (scene/brief.ts: budget / monthly / careMin items + `project.home`).
// This module builds the engine's UserProfile from a brief. No DOM; storage injectable for node tests.
// Migration rule: the old per-browser profile (`tanklook.demand`, no longer written) fills only what the brief has NOT said
// (a missing item / field; a switched-off limit counts as said), read-only, so an old browser's numbers still apply to every
// setup until that setup is edited, and are then in the brief for good (file, share link).
import { defaultProfile, type Limits, type UserProfile } from './types';
import { homeOf, valueOf, getItem, type Brief } from '../scene/brief';

const KEY = 'tanklook.demand';
type Store = Pick<Storage, 'getItem'>;
let store: Store | undefined;
export const useLegacyStorage = (s: Store | undefined) => { store = s; };
const ls = (): Store | undefined => store ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);

/** What the old per-browser profile held (limits, water, electricity); `skill` is experience.ts's. */
export function legacyProfile(): Partial<UserProfile> {
  try {
    const j = JSON.parse(ls()?.getItem(KEY) ?? 'null') as Partial<UserProfile> | null;
    if (!j || typeof j !== 'object') return {};
    const { budgetMode: _old, ...limits } = (j.limits ?? {}) as Partial<Limits> & { budgetMode?: string };
    const { skill: _s, ...rest } = j;
    return { ...rest, limits };
  } catch { return {}; }
}

/** The engine's profile for this brief: brief first, the old browser profile only for what the brief lacks. */
export function profileOf(b: Brief | undefined, skill: UserProfile['skill'], legacy: Partial<UserProfile> = legacyProfile()): UserProfile {
  const d = defaultProfile(), h = homeOf(b), old = legacy.limits ?? {}, br = b ?? { v: 0, items: {} };
  const said = (id: 'constraints.budget' | 'constraints.monthly' | 'constraints.careMin') => !!getItem(br, id);
  const limits: Limits = {};
  const setup = said('constraints.budget') ? valueOf(br, 'constraints.budget') : old.setupUsd;
  const mo = said('constraints.monthly') ? valueOf(br, 'constraints.monthly') : undefined;
  const mins = said('constraints.careMin') ? valueOf(br, 'constraints.careMin') : old.minPerWeek;
  const risk = h.risk ?? old.risk;
  if (setup !== undefined) limits.setupUsd = setup;
  if (mo !== undefined) limits.upkeepUsd = mo; else if (!said('constraints.monthly')) { if (old.upkeep) limits.upkeep = old.upkeep; if (old.upkeepUsd !== undefined) limits.upkeepUsd = old.upkeepUsd; }
  if (mins !== undefined) limits.minPerWeek = mins;
  if (risk) limits.risk = risk;
  const kwhUsd = h.kwhUsd ?? legacy.kwhUsd;
  return { ...d, skill, waterSource: h.water ?? legacy.waterSource ?? d.waterSource, ...(kwhUsd !== undefined ? { kwhUsd } : {}), limits, ...(legacy.mode ? { mode: legacy.mode } : {}) };
}
