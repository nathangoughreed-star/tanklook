// UI2 shell step 5 (lane S5, 2026-11-14): the Preferences section as pure view-models + edits (screen map §2a "Section Preferences", R26, DS1 plan P3).
// Style cards are the Quick Preferences catalogue (scene/quickArchetypes.ts) plus the decorative looks DS3 added (castle on coloured gravel, the pirate scene), which the
// catalogue does not hold: those are kept under `project.quick.arch` too (so they save, share and undo with the tank) and steer the ranking through the same "You told us" keys.
// The don't-want list is QP1's AVOIDS. No DOM; every edit takes a Brief and returns one, written by the component with `setBrief`.
import type { Brief } from '../../scene/brief';
import { emptyBrief, projectExtras, setProjectExtras } from '../../scene/brief';
import { archetypesFor, archetypeByKey, type QuickArchetype } from '../../scene/quickArchetypes';
import { AVOIDS, answersOf, applyQuickPrefs, type ArchState, type AvoidId } from '../../scene/quickPrefs';
import { press } from '../../ui/quickPrefs';
import { tellAspect } from '../../explore/aspects';
import { forgetStyle, recordWish, tasteOf, wishesOf } from '../../demand/taste';
import { ARCHETYPES } from '../../scene/archetypes';
import { isBuildable } from '../../explore/pool';
import type { HabitatDirection } from '../../scene/discoveryTypes';
import { tankKind } from '../../scene/pickerKind';
import type { TankSetup } from '../../scene/types';

export interface StyleCard { key: string; label: string; blurb: string; state: ArchState | undefined; /** a decorative look the old catalogue lacks */ extra: boolean; /** needs live plants (the No live plants answer removes it) */ live: boolean }

/** The decorative looks (DS1 plan P3): not in QUICK_ARCHETYPES, so held beside it. `told` = the aspect keys a card writes (+1 Interested, -1 Avoid). */
export const EXTRA_CARDS: readonly { key: string; habitat: 'freshwater'; label: string; blurb: string; told: readonly string[] }[] = [
  { key: 'freshwater-decorative', habitat: 'freshwater', label: 'Colorful decorative', blurb: 'A classic castle on bright gravel with silk and plastic plants in pink, red and blue.', told: ['layout:castle-coloured-gravel'] },
  { key: 'freshwater-themed', habitat: 'freshwater', label: 'Themed centrepiece', blurb: 'A story in the tank: a sunken pirate ship and a treasure chest, framed by live plants.', told: ['layout:themed-scene'] },
];
const extraOf = (key: string) => EXTRA_CARDS.find(c => c.key === key);

/** What kind of looks to show: the setup's own direction, else the tank on screen. */
export function directionFor(b: Brief | undefined, S?: TankSetup): HabitatDirection {
  const d = b ? projectExtras(b).direction : undefined; if (d) return d;
  const k = S ? tankKind(S) : 'freshwater';
  return k === 'saltwater' ? 'saltwater' : k === 'terrarium' ? 'terrarium' : k === 'vivarium' ? 'paludarium' : 'freshwater';
}
const quick = (b: Brief) => projectExtras(b).quick;
const extraState = (b: Brief, key: string): ArchState | undefined => { const v = (quick(b)?.arch as Record<string, string> | undefined)?.[key]; return v === 'interested' || v === 'avoid' ? v : undefined; };

export function styleCards(b: Brief | undefined, d: HabitatDirection): StyleCard[] {
  const brief = b ?? emptyBrief(), a = answersOf(brief);
  const real = archetypesFor(d).map((c: QuickArchetype) => ({ key: c.key, label: c.label, blurb: c.blurb, state: a.arch[c.key], extra: false, live: c.needsLive }));
  const extras = (d === 'freshwater' || d === 'unsure' ? EXTRA_CARDS : []).map(c => ({ key: c.key, label: c.label, blurb: c.blurb, state: extraState(brief, c.key), extra: true, live: false }));
  return [...real, ...extras];
}
const NEXT: Record<string, ArchState | undefined> = { none: 'interested', interested: 'avoid', avoid: undefined };
export const STATE_WORD: Record<string, string> = { none: 'Not chosen', interested: 'Interested', avoid: 'Avoid' };

/** Press a card: not chosen -> Interested -> Avoid -> not chosen (the old screen's order). */
export function cycleCard(b: Brief | undefined, key: string): Brief {
  const brief = b ?? emptyBrief(), ex = extraOf(key);
  if (!ex) return keepExtras(brief, applyQuickPrefs(brief, press(answersOf(brief), { arch: key })));
  const cur = extraState(brief, key), nx = NEXT[cur ?? 'none'];
  const q = { ...(quick(brief) ?? {}) } as Record<string, unknown>, arch = { ...((q.arch ?? {}) as Record<string, string>) };
  if (nx) arch[key] = nx; else delete arch[key];
  if (Object.keys(arch).length) q.arch = arch; else delete q.arch;
  const pj = { ...projectExtras(brief) } as Record<string, unknown>; if (Object.keys(q).length) pj.quick = q; else delete pj.quick;
  let out = setProjectExtras(brief, pj as never);
  for (const t of ex.told) out = tellAspect(out, t, nx === 'interested' ? 1 : nx === 'avoid' ? -1 : 0);
  return out;
}
/** `applyQuickPrefs` rewrites `quick` from the catalogue cards only; keep the decorative ones across it. */
export function keepExtras(before: Brief, after: Brief): Brief {
  const keep: Record<string, string> = {}; for (const c of EXTRA_CARDS) { const s = extraState(before, c.key); if (s) keep[c.key] = s; }
  if (!Object.keys(keep).length || Object.keys(keep).every(k => extraState(after, k))) return after;
  const q = { ...(quick(after) ?? {}) } as Record<string, unknown>; q.arch = { ...((q.arch ?? {}) as Record<string, string>), ...keep };
  return setProjectExtras(after, { ...projectExtras(after), quick: q as never });
}

// ---------- the don't-want list ----------
export interface AvoidRow { id: AvoidId; label: string; on: boolean }
export function avoidRows(b: Brief | undefined, d: HabitatDirection): AvoidRow[] {
  const on = new Set(answersOf(b ?? emptyBrief()).avoid);
  return AVOIDS.filter(v => v.shown(d)).map(v => ({ id: v.id, label: v.label(d), on: on.has(v.id) }));
}
export const toggleAvoid = (b: Brief | undefined, id: AvoidId): Brief => { const brief = b ?? emptyBrief(); return keepExtras(brief, applyQuickPrefs(brief, press(answersOf(brief), { avoid: id }))); };

// ---------- browse looks (the old Visual Discovery grid, folded in) ----------
export interface LookRow { id: string; name: string; tagline: string; liked: boolean }
const waterOf = (d: HabitatDirection) => d === 'saltwater' ? 'saltwater' : d === 'freshwater' || d === 'unsure' ? 'freshwater' : undefined;
const envOf = (d: HabitatDirection) => d === 'terrarium' ? 'terrarium' : d === 'paludarium' ? 'paludarium' : 'aquarium';
export function browseLooks(b: Brief | undefined, d: HabitatDirection, limit = 24): LookRow[] {
  const liked = new Set(wishesOf(tasteOf(b ?? emptyBrief())));
  return ARCHETYPES.filter(a => isBuildable(a) && a.env === envOf(d) && (waterOf(d) === undefined || a.water === waterOf(d))).slice(0, limit)
    .map(a => ({ id: a.id, name: a.name, tagline: a.tagline, liked: liked.has(a.id) }));
}
export const toggleLook = (b: Brief | undefined, id: string): Brief => {
  const brief = b ?? emptyBrief();
  return wishesOf(tasteOf(brief)).includes(id) ? forgetStyle(brief, id) : recordWish(brief, id);
};

/** The one-line group summary (the old brief card's lines). */
export function prefsSummary(b: Brief | undefined, d: HabitatDirection): { looks: string; avoid: string } {
  const cards = styleCards(b, d), yes = cards.filter(c => c.state === 'interested').length, no = cards.filter(c => c.state === 'avoid').length;
  const av = avoidRows(b, d).filter(r => r.on);
  return { looks: yes || no ? [yes ? `${yes} liked` : '', no ? `${no} avoided` : ''].filter(Boolean).join(', ') : 'No look chosen', avoid: av.length ? av.map(r => r.label.toLowerCase()).join(', ') : 'Nothing ruled out' };
}
export const cardOf = (key: string) => extraOf(key) ?? archetypeByKey(key);
