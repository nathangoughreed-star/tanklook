// Guided Setup Rev 03, the shared onboarding shell (lane GS4, 2026-11-02): the pure part. World -> Equipment -> Limits -> Starting Point, then the route's own
// steps (discovery/). No DOM here: every step module (worldStep / equipmentStep / limitsStep / startStep) draws, this decides, and test/guidedShell.test.ts checks
// it. Everything is written to the ONE project state (scene/project.ts setters over the brief); a skipped step is UNKNOWN (never 0), and no step ever deletes the scene.
import { worldInScope } from '../../scope';
import { ENVIRONMENTS, family, archetype, type Card, type Env } from '../../scene/archetypes';
import { ANY_CARD, ANY_WORLD, CARD_COLOUR } from '../discovery/logic';
import {
  CONSTRAINT_IDS, constraintOf, equipmentOf, markSkipped, routeOf, setConstraint, setLimitKind, setRoute, setWorld, skipConstraint, worldOf,
  type ConstraintId, type ConstraintKind, type SpaceIn,
} from '../../scene/project';
import { ONBOARDING_STEPS, clearItem, getItem, projectExtras, setItem, setVision, visionOf, type Brief, type OnboardingStep, type Route, type World } from '../../scene/brief';
import { getTankModel, bandOf, type TankModel } from '../../data/tanks';
import { catalogueSizes } from '../../scene/tankfit';
import { galOfDims, defaultKindOf } from '../../scene/project';
import { IN } from '../../scene/physics';
import type { AnimalCount } from '../../scene/tankfit';

// ---------------------------------------------------------------------------------------------------------------- the breadcrumb
export type OnboardStep = OnboardingStep;
export const ONBOARD_STEPS: readonly OnboardStep[] = ONBOARDING_STEPS;
export const ONBOARD_LABEL: Record<OnboardStep, string> = { world: 'World', equipment: 'Equipment', limits: 'Limits', start: 'Starting Point' };
export const ONBOARD_ASK: Record<OnboardStep, string> = {
  world: 'What kind of world are we creating?', equipment: 'Are you bringing anything with you?', limits: 'What should we work around?', start: 'Where would you like to start?',
};
export interface ShellCrumb { id: string; label: string; state: 'done' | 'current' | 'todo' }
/** `World > Equipment > Limits > Starting Point` with the current one marked (the shared onboarding, before the branch). */
export const onboardCrumbs = (at: OnboardStep, world?: World): ShellCrumb[] => ONBOARD_STEPS.map((id, i) => ({ id, label: id === 'start' && world === 'any' ? EXPLORE_LABEL : ONBOARD_LABEL[id], state: id === at ? 'current' : i < ONBOARD_STEPS.indexOf(at) ? 'done' : 'todo' }));
/** "Open to anything" does not defer the world (Nathan, revised 2026-11-02): after Limits the branch step is Explore (complete setups to react to), not Animals First / Look First. */
export const EXPLORE_LABEL = 'Explore';
export const exploresOf = (b: Brief): boolean => worldOf(b) === 'any';
export const nextOnboard = (s: OnboardStep): OnboardStep | undefined => ONBOARD_STEPS[ONBOARD_STEPS.indexOf(s) + 1];
export const prevOnboard = (s: OnboardStep): OnboardStep | undefined => ONBOARD_STEPS[ONBOARD_STEPS.indexOf(s) - 1];
/** Once the person has gone past Starting Point, the rail shows only the chosen route's steps (the discovery's own crumbs): this is what the shell draws then. */
export const routeCrumbs = (steps: readonly { id: string; label: string; state: ShellCrumb['state'] }[]): ShellCrumb[] => steps.map(s => ({ ...s }));

/** Where Guided opens: the step asked for, else the first onboarding step still pending (a skipped step counts as answered). A project that already has a route
 *  and every onboarding step settled reopens inside the route. */
export type Place = { at: OnboardStep } | { route: Route };
export function placeOf(b: Brief, ask?: OnboardStep): Place {
  if (ask) return { at: ask };
  const sk = projectExtras(b).skipped ?? [], eq = equipmentOf(b).status, route = routeOf(b);
  const done: Record<OnboardStep, boolean> = {
    world: !!worldOf(b) || sk.includes('world'), equipment: eq !== 'unanswered' || sk.includes('equipment'),
    limits: CONSTRAINT_IDS.some(id => !constraintOf(b, id).unknown) || sk.includes('limits'), start: !!route,
  };
  const first = ONBOARD_STEPS.find(s => !done[s]);
  return first ? { at: first } : exploresOf(b) || !route ? { at: 'start' } : { route };
}

// ---------------------------------------------------------------------------------------------------------------- 1. World
/** The four World cards: Aquarium, Terrarium, Paludarium, Open to anything. Water is not asked here (it belongs to Look First, or the animals answer it). */
export const WORLD_CARDS: readonly Card[] = [...ENVIRONMENTS, { ...ANY_CARD, tagline: 'Not sure yet? We will show you complete setups to react to.' }];
/** The cards offered in this scope (src/scope.ts): aquarium only while only aquariums are in scope. */
export const worldCards = (): readonly Card[] => WORLD_CARDS.filter(c => worldInScope(c.id));
export const WORLD_IDS: readonly World[] = ['aquarium', 'terrarium', 'paludarium', 'any'];
export const worldColour = (id: string): string => CARD_COLOUR[id] ?? '#5f7f6a';
/** Answer the world. The same answer again changes nothing; a different one keeps every pick that still belongs in it and drops only the picks that cannot stand
 *  in the new world (a family or look of another world, the water of an aquarium that is no longer one). 'any' (Open to anything) leads to Explore after Limits. */
export function chooseWorld(b: Brief, id: World): Brief {
  if (projectExtras(b).world === id) return b;
  const before = worldOf(b);
  let out = setWorld(b, id);
  let v = visionOf(out);
  if (id === ANY_WORLD) { const { environment: _e, waterType: _w, ...rest } = v; v = { ...rest, secondaryLikes: v.secondaryLikes }; }
  else if (before && before !== id) {
    const fits = (e?: Env) => !e || e === id;
    const famOk = !v.familyId || fits(family(v.familyId)?.env), archOk = !v.archetypeId || fits(archetype(v.archetypeId)?.env);
    if (!famOk || !archOk) { const { familyId: _f, archetypeId: _a, density: _d, densityStop: _s, renderRecipe: _r, ...rest } = v; v = { ...rest, secondaryLikes: v.secondaryLikes }; }
    if (id !== 'aquarium' && v.waterType) { const { waterType: _w, ...rest } = v; v = { ...rest, secondaryLikes: v.secondaryLikes }; }
  }
  out = setVision(out, v);
  // a skipped World step that is now answered is simply answered: nothing else to record
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- 3. Limits
/** The six onboarding limits (spec section 2, step 3), in the order asked. */
export interface LimitField { id: ConstraintId; label: string; hint: string; unit: string; step: number; kind: 'num' | 'space' | 'experience' }
export const LIMIT_FIELDS: readonly LimitField[] = [
  { id: 'space', label: 'Space', hint: 'The largest footprint you can give it', unit: 'in', step: 1, kind: 'space' },
  { id: 'startup', label: 'Startup budget', hint: 'What you would like to spend getting set up', unit: '$', step: 10, kind: 'num' },
  { id: 'ongoing', label: 'Ongoing budget', hint: 'Per month, once it is running', unit: '$ a month', step: 1, kind: 'num' },
  { id: 'setup', label: 'Setup time', hint: 'How long you can spend building it', unit: 'hours', step: 1, kind: 'num' },
  { id: 'care', label: 'Care time', hint: 'The upkeep you can give it', unit: 'min a week', step: 5, kind: 'num' },
  { id: 'experience', label: 'Experience', hint: 'Guidance only: nothing is ruled out for it', unit: '', step: 1, kind: 'experience' },
];
/** What a typed limit is when the person does not say (Nathan 2026-11-02, Q3): space is Firm (a tank either fits or it does not); the budgets and the setup and
 *  care time are Flexible targets until the person taps "hard cap"; experience is advisory (never a filter). GS6 moves this per-id map into scene/project.ts
 *  (`DEFAULT_LIMIT_KINDS`); until it lands this is the one place the shell reads it. */
// per-constraint default kinds live in scene/project.ts (GS6, Nathan 2026-11-02)
export const kindOfLimit = (b: Brief, id: ConstraintId): ConstraintKind => { const c = constraintOf(b, id); return c.unknown ? defaultKindOf(id) : c.kind; };
/** Set one limit. An empty or non-positive value goes back to UNKNOWN (never 0); a value keeps the kind already chosen, else the id's default. */
export function applyLimit(b: Brief, id: ConstraintId, value: number | SpaceIn | undefined): Brief {
  const none = value === undefined || (typeof value === 'number' ? !(value > 0) || !Number.isFinite(value) : !(value.w > 0 && value.d > 0));
  if (none) return id === 'space' ? clearItem(skipConstraint(b, id), 'constraints.spaceGate') : skipConstraint(b, id);
  const kind = kindOfLimit(b, id);
  let out = setConstraint(b, id, id === 'experience' ? Math.round(value as number) : value as number | SpaceIn, kind);
  if (id === 'space') out = kind === 'hard' ? setItem(out, 'constraints.spaceGate', true, 'hard') : clearItem(out, 'constraints.spaceGate');
  return out;
}
/** Firm / Flexible (hard cap) for a limit already given; an unknown limit stays unknown. Space also moves the Guardrails space switch with it. */
export function applyKind(b: Brief, id: ConstraintId, kind: ConstraintKind): Brief {
  const out = setLimitKind(b, id, kind);
  if (id !== 'space' || constraintOf(b, id).unknown) return out;
  return kind === 'hard' ? setItem(out, 'constraints.spaceGate', true, 'hard') : clearItem(out, 'constraints.spaceGate');
}
/** "Skip for now / I'll figure this out later": every limit stays (or goes back to) unknown, and the step counts as answered. Typed values are kept only if
 *  the person already gave them, so this clears nothing they entered: it records the skip. */
export const skipLimits = (b: Brief): Brief => markSkipped(b, 'limits');
export const skipEquipment = (b: Brief): Brief => markSkipped(b, 'equipment');
export const skipWorld = (b: Brief): Brief => markSkipped(b, 'world');

// ---------------------------------------------------------------------------------------------------------------- 4. Starting Point
export interface StartCard { id: Route; title: string; line: string }
export const START_CARDS: readonly StartCard[] = [
  { id: 'animals', title: 'Animals First', line: 'Choose the creatures you love, and we\'ll build a world around them.' },
  { id: 'look', title: 'Look First', line: 'Create a world you love, then discover who can live there.' },
];
export const WELFARE_LINE = 'Welfare checks always apply; they are not a setting.';
/** Choose the route. Everything already answered is kept; only the order of the next decisions changes. */
export const chooseRoute = (b: Brief, route: Route): Brief => setRoute(b, route);

/** What the person skipped, in words, for the Starting Point step: skipped is unknown, and unknown is not zero. */
export function skippedLine(b: Brief): string {
  const sk = projectExtras(b).skipped ?? [], bits: string[] = [];
  if (equipmentOf(b).status === 'skipped' || (sk.includes('equipment') && equipmentOf(b).status === 'unanswered')) bits.push('equipment');
  if (sk.includes('limits') && CONSTRAINT_IDS.every(id => constraintOf(b, id).unknown)) bits.push('limits');
  return bits.length ? `You skipped ${bits.join(' and ')}: nothing is assumed to be zero or unlimited, and you can add ${bits.length > 1 ? 'them' : 'it'} any time from Make It Your Own.` : '';
}

// ---------------------------------------------------------------------------------------------------------------- 2. Equipment: the tank
/** The generic catalogue sizes the person can name in one tap (the same list the group-minimum tank uses): plain rectangles, or terrariums for a land world, smallest first. */
export const ownedTankList = (land: boolean): TankModel[] => catalogueSizes(land).map(c => c.m);
export const tankLabel = (m: TankModel): string => `${m.name.replace(/\s*\(.*$/, '')}, ${Math.round(m.outer.L / IN * 10) / 10} x ${Math.round(m.outer.D / IN * 10) / 10} x ${Math.round(m.outer.H / IN * 10) / 10} in`;
/** A tank the person measured by hand (outer inches): a stand-in model so the pictures can be drawn in it. */
export function customTankModel(d: { L: number; D: number; H: number }): TankModel {
  const gal = galOfDims(d);
  return { id: `custom-${d.L}x${d.D}x${d.H}`, name: `Your ${d.L} x ${d.D} x ${d.H} in tank`, ratedGal: gal, shape: 'rect', outer: { L: d.L * IN, D: d.D * IN, H: d.H * IN }, glassMm: 6, band: bandOf(gal), source: 'you' };
}
export interface OwnedTank { model: TankModel; use: 'required' | 'available'; custom: boolean }
/** The tank the person has, as the pictures need it: the catalogue model, else the one built from the dimensions they typed. Undefined when they own none. */
export function ownedTankOf(b: Brief): OwnedTank | undefined {
  const t = equipmentOf(b).items.find(i => i.key === 'tank');
  if (!t || !getItem(b, 'constraints.existingTank')) return undefined;
  const m = t.model ? getTankModel(t.model) : undefined;
  if (m) return { model: m, use: t.use, custom: false };
  return t.dimsIn ? { model: customTankModel(t.dimsIn), use: t.use, custom: true } : undefined;
}
/** Parse the three typed tank dimensions (inches, outer); undefined until all three are sensible. */
export function parseDims(L: string, D: string, H: string): { L: number; D: number; H: number } | undefined {
  const n = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) && v >= 4 && v <= 240 ? Math.round(v * 10) / 10 : undefined; };
  const l = n(L), d = n(D), h = n(H);
  return l && d && h ? { L: l, D: d, H: h } : undefined;
}

// ---------------------------------------------------------------------------------------------------------------- Suitable Animals, kept in the project
/** The Suitable Animals the person chose in Look First, as the project keeps them: `animals.stock` with status 'preference' (unlocked suggestions: the editor and
 *  the generator may still change them). Animals the person LOCKED (Animals First) are never overwritten or cleared from here. */
export function suggestedOf(b: Brief): AnimalCount[] {
  const it = getItem(b, 'animals.stock');
  return it && !it.off && it.status !== 'locked' ? it.value.map(a => ({ species: a.species, n: a.count })) : [];
}
export function setSuggested(b: Brief, list: readonly AnimalCount[]): Brief {
  const it = getItem(b, 'animals.stock');
  if (it && !it.off && it.status === 'locked') return b;
  const rows = list.filter(a => a.n > 0).map(a => ({ species: a.species, count: a.n }));
  return rows.length ? setItem(b, 'animals.stock', rows, 'preference') : it ? clearItem(b, 'animals.stock') : b;
}
