// Guided v2, steps 1-4 (lane GV1, 2026-10-30): the pure part. Step order, the picture cards (kind, start from), what each start
// intent routes to, and the Guided position saved IN THE BRIEF (`dialog.answered` entries prefixed "gv:"), so reload and share keep the place.
// Nothing here draws: flow.ts does. Nothing hard-gates: every step can be skipped, Back works everywhere.
import { clearItem, dialogOf, setDialog, setItem, type Brief } from '../../scene/brief';
import type { Kind } from '../../demand/suggest';
import type { SetupKind } from '../../scene/pickerKind';

export type GStep = 'kind' | 'start' | 'have' | 'limits';
export const STEP_ORDER: readonly GStep[] = ['kind', 'start', 'have', 'limits'];
export const STEP_LABEL: Record<GStep, string> = { kind: 'Kind', start: 'Start from', have: 'What you have', limits: 'Limits' };
export const STEP_ASK: Record<GStep, string> = {
  kind: 'What kind of tank?', start: 'Where do you want to start?', have: 'What do you already have?', limits: 'Should I keep to limits?',
};

export type GKind = 'freshwater' | 'saltwater' | 'terrarium' | 'paludarium' | 'any';
export type GIntent = 'animals' | 'look' | 'equipment' | 'ideas';
export interface GCard<I extends string> { id: I; title: string; line: string; /** public/art/guided/<art>.webp, when it exists */ art: string; icon: string }

/** One line each from research/design/guided-art-brief.md. */
export const KIND_CARDS: readonly GCard<GKind>[] = [
  { id: 'freshwater', title: 'Freshwater', line: 'Fish and plants in fresh water: the easiest place to start.', art: 'kind-freshwater', icon: '🐟' },
  { id: 'saltwater', title: 'Saltwater', line: 'Marine fish, corals and invertebrates: more gear and care.', art: 'kind-saltwater', icon: '🪸' },
  { id: 'terrarium', title: 'Terrarium', line: 'Land animals and plants in a closed enclosure, no open water.', art: 'kind-terrarium', icon: '🦎' },
  { id: 'paludarium', title: 'Paludarium', line: 'Land and water in one tank: the most involved.', art: 'kind-paludarium', icon: '🌿' },
  { id: 'any', title: 'Any', line: 'Not sure yet: show me options of every kind.', art: 'kind-any', icon: '✨' },
];
export const INTENT_CARDS: readonly GCard<GIntent>[] = [
  { id: 'animals', title: 'Animals', line: 'Start from the animals you want to keep.', art: 'intent-animals', icon: '🐠' },
  { id: 'look', title: 'Appearance', line: 'Start from how you want it to look.', art: 'intent-look', icon: '🌱' },
  { id: 'equipment', title: 'Existing equipment', line: 'Start from gear you already have.', art: 'intent-equipment', icon: '🧰' },
  { id: 'ideas', title: 'Open to ideas', line: "Show me a few ideas and I'll pick.", art: 'intent-ideas', icon: '💡' },
];

/** The kind card -> the engine's kind (a paludarium is the vivarium kind); "any" fixes nothing. */
export const kindOf = (k: GKind): SetupKind | undefined => k === 'any' ? undefined : k === 'paludarium' ? 'vivarium' : k;
export const briefKindOf = (k: GKind): Kind | undefined => kindOf(k);

export type GRoute = 'stocking' | 'look' | 'suggest';
/** After step 4: Animals -> the animal screen, Appearance -> the look step, Existing equipment and Open to ideas -> Suggest. */
export const routeOf = (i: GIntent): GRoute => i === 'animals' ? 'stocking' : i === 'look' ? 'look' : 'suggest';
/** The rail's fifth slot names where the intent leads. */
export const ROUTE_LABEL: Record<GRoute, string> = { stocking: 'Animals', look: 'Look', suggest: 'Ideas' };

export const nextStep = (s: GStep): GStep | undefined => STEP_ORDER[STEP_ORDER.indexOf(s) + 1];
export const prevStep = (s: GStep): GStep | undefined => STEP_ORDER[STEP_ORDER.indexOf(s) - 1];

export interface RailItem { id: string; label: string; state: 'done' | 'current' | 'todo'; /** what a click does: a step, the routed screen, or the report */ go: GStep | GRoute | 'report' }
/** The step rail: Kind > Start from > What you have > Limits > (Animals | Look | Ideas) > Report. `at` is a step, or the routed screen once step 4 is passed. */
export function railOf(at: GStep | GRoute, intent: GIntent | undefined): RailItem[] {
  const routed = !(STEP_ORDER as readonly string[]).includes(at), idx = routed ? STEP_ORDER.length : STEP_ORDER.indexOf(at as GStep);
  const rail: RailItem[] = STEP_ORDER.map((s, i) => ({ id: s, label: STEP_LABEL[s], state: i < idx ? 'done' : i === idx ? 'current' : 'todo', go: s }));
  const route = intent ? routeOf(intent) : undefined;
  rail.push({ id: 'route', label: route ? ROUTE_LABEL[route] : 'Next', state: routed ? 'current' : 'todo', go: route ?? 'suggest' });
  rail.push({ id: 'report', label: 'Report', state: 'todo', go: 'report' });
  return rail;
}

// ---- the position, saved in the brief ----
const PRE = 'gv:';
export interface GState { step: GStep; kind?: GKind; intent?: GIntent; /** the limits question: undefined = not answered yet */ limits?: boolean }
const KINDS_ALL = KIND_CARDS.map(c => c.id), INTENTS_ALL = INTENT_CARDS.map(c => c.id);
export function readState(b: Brief): GState {
  const get = (k: string) => dialogOf(b).answered.find(a => a.startsWith(PRE + k + ':'))?.slice(PRE.length + k.length + 1);
  const step = get('step'), kind = get('kind'), from = get('from'), lim = get('lim');
  return {
    step: (STEP_ORDER as readonly string[]).includes(step ?? '') ? step as GStep : 'kind',
    ...(KINDS_ALL.includes(kind as GKind) ? { kind: kind as GKind } : {}),
    ...(INTENTS_ALL.includes(from as GIntent) ? { intent: from as GIntent } : {}),
    ...(lim === 'yes' || lim === 'no' ? { limits: lim === 'yes' } : {}),
  };
}
/** Replace the Guided entries of the dialog with this state; every other answered question is kept. */
export function writeState(b: Brief, s: GState): Brief {
  const d = dialogOf(b), keep = d.answered.filter(a => !a.startsWith(PRE));
  const mine = [`${PRE}step:${s.step}`, ...(s.kind ? [`${PRE}kind:${s.kind}`] : []), ...(s.intent ? [`${PRE}from:${s.intent}`] : []), ...(s.limits === undefined ? [] : [`${PRE}lim:${s.limits ? 'yes' : 'no'}`])];
  return setDialog(b, { ...d, answered: [...keep, ...mine] });
}

/** Step 1 writes the kind into the brief (animals.kinds); "any" fixes nothing. */
export function applyKindChoice(b: Brief, k: GKind): Brief {
  const kd = briefKindOf(k);
  return kd ? setItem(b, 'animals.kinds', [kd], 'hard') : clearItem(b, 'animals.kinds');
}

/** The limits step's "No": nothing is set. Clears every limit item, target and flag the editors write. */
export const LIMIT_ITEMS = ['constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.maxSpace', 'constraints.spaceGate', 'constraints.roomTempC', 'constraints.tapWater'] as const;
export const clearLimits = (b: Brief): Brief => LIMIT_ITEMS.reduce((x, id) => clearItem(x, id), b);
/** Set-up time (hours): the one limit the Welcome editors do not draw yet. */
export const setSetupHours = (b: Brief, h: number | undefined): Brief => h === undefined || !(h >= 0) ? clearItem(b, 'constraints.setupHours') : setItem(b, 'constraints.setupHours', h, 'hard');
/** "Do you need a stand?": yes / no / not answered. */
export const setNeedStand = (b: Brief, v: boolean | undefined): Brief => v === undefined ? clearItem(b, 'equipment.needStand') : setItem(b, 'equipment.needStand', v, 'preference');

/** Where a card's picture lives; the card shows its placeholder until this file exists. */
export const artPath = (art: string) => `art/guided/${art}.webp`;
