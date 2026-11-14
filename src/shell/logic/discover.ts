// UI2 shell step 10 (lane S10): Discover's view-models. Pure; the engines are the existing ones (ui/discover/logic createInline = breadth.ts presets,
// finishSetup, nextCandidates; ui/ab for This or that). Nothing here writes the design: only Apply / Keep (applyCard, one undo step) does.
import { TABS, type Tab } from '../../scene/scope';
import { gapsOf, type Category } from '../../scene/candidates';
import { PRESET_INFO, type Preset } from '../../scene/breadth';
import { emptyScene } from '../../scene/defaults';
import { reconcileFish, stageFish } from '../../scene/reeval';
import { placeNew, shuffleFish } from '../../scene/scatter';
import { rng } from '../../art/paint';
import { getSpecies } from '../../data/species';
import { tankFromModel } from '../../data/tanks';
import { allLand, isMixed, setPool } from '../../scene/tankfit';
import { planFor, animalsOf, startPick, bump, totalOf, type Pk, type Plan } from '../../ui/stockPlanLogic';
import { withNeedGear } from '../../demand/needs';
import type { Store } from '../../scene/store';
import type { Scene, TankSetup, Units } from '../../scene/types';
import type { SectionId } from './sections';

// ---------------------------------------------------------------------------------------------------------------- the modes
export type ModeId = 'explore' | 'remix' | 'refine' | 'gaps' | 'whole' | 'thisthat';
export interface Mode { id: ModeId; label: string; hint: string; /** the existing engine behind it */ engine: string }
export const MODES: Mode[] = [
  { id: 'explore', label: 'Explore', hint: 'Very different directions from what you have', engine: 'breadth explore' },
  { id: 'remix', label: 'Remix', hint: 'Shuffle within your style; keeps your pieces', engine: 'breadth remix' },
  { id: 'refine', label: 'Refine', hint: PRESET_INFO.refine.hint, engine: 'breadth refine' },
  { id: 'gaps', label: 'Fill only the gaps', hint: 'Finish your setup: only the empty sections', engine: 'finishSetup' },
  { id: 'whole', label: 'Whole tank', hint: 'Complete setups side by side', engine: 'breadth explore gallery' },
  { id: 'thisthat', label: 'This or that', hint: 'Pick between two tanks so it learns your taste', engine: 'A/B pairs' },
];
export const modeOf = (id: ModeId) => MODES.find(m => m.id === id)!;
/** The breadth preset a mode runs (null: not a preset mode). */
export const presetOfMode = (m: ModeId): Preset | null => m === 'explore' || m === 'remix' || m === 'refine' ? m : m === 'whole' ? 'explore' : null;

// ---------------------------------------------------------------------------------------------------------------- "Ideas for ..." scope
/** The section whose header carries an "Ideas for ..." button, and the engine tabs that button scopes Discover to. Equipment has no tab in the engine (plan decision 2): no button. */
const SCOPE: Partial<Record<SectionId, { label: string; tabs: Tab[] }>> = {
  tank: { label: 'Tank', tabs: ['tank'] },
  scape: { label: 'Scape', tabs: ['hardscape', 'substrate'] },
  plants: { label: 'Plants', tabs: ['plants'] },
  animals: { label: 'Animals', tabs: ['animals'] },
};
export const ideasLabel = (s: SectionId | null): string | undefined => s && SCOPE[s] ? `Ideas for ${SCOPE[s]!.label}` : undefined;
export const scopeOf = (s: SectionId | null): Tab[] | undefined => s ? SCOPE[s]?.tabs : undefined;
export const scopeName = (tabs: readonly Tab[] | undefined): string => !tabs || tabs.length === TABS.length ? 'Everything' : tabs.includes('hardscape') ? 'Scape' : tabs[0] === 'tank' ? 'Tank' : tabs[0] === 'plants' ? 'Plants' : 'Animals';
/** The empty categories of the tank within the scope (what Fill only the gaps can fill). */
export const gapsIn = (tank: TankSetup, scope: readonly Tab[] = TABS): Category[] => gapsOf(tank, scope);

/** A store whose Discover reads (effTank) see only `tabs` as switched on, so a scoped run changes only those sections. Writes go to the real store; the scope is never saved. */
export function scopedStore(store: Store, tabs: readonly Tab[] | undefined): Store {
  if (!tabs || tabs.length === TABS.length) return store;
  let memo: { src: TankSetup; out: TankSetup } | undefined;
  return new Proxy(store, {
    get(t, k) {
      if (k === 'effTank') { const src = t.effTank; if (!memo || memo.src !== src) memo = { src, out: { ...src, discoverOn: [...tabs] } as TankSetup }; return memo.out; }
      const v = Reflect.get(t, k, t); return typeof v === 'function' ? v.bind(t) : v;
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------- "From an animal I want"
/** The pick list of the door: one row per species, the species' own starting count (sexed groups in their ratio). */
export function addPick(picks: Pk[], id: string): Pk[] { return picks.some(p => p.id === id) || !getSpecies(id) ? picks : [...picks, startPick(id)]; }
export const removePick = (picks: Pk[], id: string): Pk[] => picks.filter(p => p.id !== id);
export const bumpPick = (picks: Pk[], id: string, d: number): Pk[] => picks.map(p => p.id === id ? bump(p, 'n', d) : p);
export interface DoorPlan { plan: Plan; tankName?: string; gallons?: number; problem?: string; ok: boolean }
export function doorPlan(picks: Pk[]): DoorPlan {
  const plan = planFor(picks.filter(p => totalOf(p) > 0));
  const m = plan.need?.tank;
  return { plan, ...(m ? { tankName: m.name, gallons: Math.round(plan.need!.gallons) } : {}), ...(plan.problem ? { problem: plan.problem } : {}), ok: !!m && !plan.problem };
}
/** A new project around these animals: the smallest catalogue tank that holds them, the animals placed, the basic light (the old stocking screen's recipe, without its screen). Undefined when no tank holds them. */
export function animalScene(picks: Pk[], units: Units, camera?: TankSetup['camera']): Scene | undefined {
  const live = picks.filter(p => totalOf(p) > 0 && getSpecies(p.id));
  const m = planFor(live).need?.tank; if (!live.length || !m) return undefined;
  const s = emptyScene(), T = s.tanks[0], an = animalsOf(live);
  s.name = 'My animal tank'; s.units = units; if (camera) T.camera = { ...camera };
  T.stand.show = false; T.stand.need = 'ask'; T.stockFirst = true;
  T.tank = tankFromModel(m); T.product = { model: m.id }; T.water.on = !allLand(an); T.water.level = 1; T.water.salt = live.some(p => !!getSpecies(p.id)?.salt);
  if (allLand(an)) { T.lid = 'mesh'; T.doors = 'hinged'; }
  if (isMixed(an)) setPool(T, an);
  const { added } = reconcileFish(T, live);
  const r = rng(1 + live.length * 7919);
  shuffleFish(T, r, undefined, 100); placeNew(T, r, added); stageFish(T, live);
  const g = withNeedGear(T); if (g !== T) T.light = g.light;
  return s;
}
