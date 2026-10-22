// S243 step 1 (Nathan 2026-10-27): the stocking view-model. Five categories, each one level (Compatible / Caution / Problem / Not enough
// information), built from the engine's own reasons; no engine number changes. The fullness tile draws it first; the stocking screen
// and plan sheet follow in later steps. Design: research/audits/stocking-summary.md, prototype research/audits/s243/mock.js.
// Rules (Nathan): a check with no data for a species does not fire (counted in `noData`, a small line, not a warning);
// "Not enough information" only where a requirement truly cannot be assessed (care needs the tool cannot check, temperature with no range).
import { CARE } from '../data/care';
import { needsOf } from '../data/careNeeds';
import { grazerLevel, grazerShort } from '../data/grazers';
import { getSpecies, type Species } from '../data/species';
import { whysAnimal } from '../scene/animalfit';
import { volume } from '../scene/physics';
import { pairingIn } from '../scene/pairs';
import { IDEAL_MAX, isOver, countsAgainstWater, stockingMemo, type Stocking } from '../scene/stocking';
import { notesIn, reasonIn, recommendedOf, tankMinimum, type MinRow, type TankMinimum } from '../scene/tankMin';
import { MIN_SLACK_PCT } from '../scene/animalfit';
import { groupMinimum, stockingGroupMinimum } from '../scene/groupMin';
import { plural } from '../scene/stocking';
import { AIR } from '../data/climate';
import { rangeLine, sharedRange } from '../scene/temprange';
import { coverAdvice, crowdWarnings } from '../scene/territory';
import { filterState } from '../scene/tech';
import type { TankSetup, Units } from '../scene/types';
import { notesOf } from './stockPlanLogic';

export interface MinWarn { level: 'over' | 'near'; text: string }
export type CatId = 'minimums' | 'social' | 'environment' | 'behaviour' | 'fullness';
export type CatLevel = 'ok' | 'caution' | 'problem' | 'unknown';
export interface CatItem { level: 'caution' | 'problem' | 'unknown'; text: string; /** a cross-link: the item is counted here, also relevant there */ also?: string; /** a load percent: the line is tinted along the gauge's green-amber-red scale */ pct?: number }
export interface Category { id: CatId; label: string; what: string; level: CatLevel; word: string; items: CatItem[]; /** the category's one-line answer (Tank minimums: the smallest tank holding every species' minimum group) */ answer?: string }
export interface StockSummary {
  cats: Category[];
  /** the worst of the five, for the minimized pill */
  worst: CatLevel; worstWord: string;
  /** species-checks that had no data and so did not fire (hardness range, tank minimum, ...) */
  noData: number;
  /** names of the species behind noData, for the tip */
  noDataFor: string[];
}

export const LEVEL_WORD: Record<CatLevel, string> = { ok: 'Compatible', caution: 'Caution', problem: 'Problem', unknown: 'Not enough information' };
const RANK: Record<CatLevel, number> = { ok: 0, unknown: 1, caution: 2, problem: 3 };
const LABELS: Record<CatId, [string, string]> = {
  minimums: ['Tank minimums', 'the smallest tank each species is kept in, whatever the count'],
  social: ['Social needs', 'group size, sex ratio, pairs'],
  environment: ['Environment', 'temperature, pH, hardness, cover, food, care needs'],
  behaviour: ['Behavior', 'who eats, nips or fights whom'],
  fullness: ['Spatial fullness', 'how many fit comfortably'],
};

const levelOf = (items: CatItem[]): CatLevel => items.some(i => i.level === 'problem') ? 'problem' : items.some(i => i.level === 'caution') ? 'caution' : items.some(i => i.level === 'unknown') ? 'unknown' : 'ok';
export const worstOf = (ls: CatLevel[]): CatLevel => ls.reduce((a, b) => RANK[b] > RANK[a] ? b : a, 'ok' as CatLevel);

/** Air margin: a shared air band this wide or narrower (°C) is a narrow margin. Same width as the water's NARROW_C: the air bands are
 *  recorded to whole degrees too, and a lamp or a cold night moves the air at least as much as a heater moves water. */
export const NARROW_AIR_C = 0;
/** A shared humidity band this many points wide or narrower is a narrow margin (misting and ventilation hold it only loosely). */
export const NARROW_RH = 10;
type R2 = [number, number];
const meet = (list: R2[]): R2 | null => { const lo = Math.max(...list.map(r => r[0])), hi = Math.min(...list.map(r => r[1])); return hi < lo ? null : [lo, hi]; };
/** The land animals' shared air temperature and humidity, mirroring the water check (2026-10-28, lane E1): comfortable bands, no overlap or
 *  a single value = Caution, any real band green. Humidity is adjustable by misting, so with no shared comfortable band but a shared
 *  tolerable one it is a Caution, and a Problem only when even the tolerable bands do not meet. Animals with no recorded air band: unknown. */
function airChecks(land: Species[], add: (c: CatId, level: CatItem['level'], text: string) => void, us = false) {
  const F = (c: number) => us ? Math.round(c * 9 / 5 + 32) : c, U = us ? '°F' : '°C';
  if (!land.length) return;
  const rec = land.filter(x => AIR[x.id]), miss = land.filter(x => !AIR[x.id]);
  if (miss.length) add('environment', 'unknown', `No recorded air range for ${miss.map(x => x.name).join(', ')}`);
  if (rec.length < 2) return; // one animal always fits its own band; the tank's setting follows it
  const pair = (pick: (a: typeof AIR[string]) => R2, unit: string) => { const ps = rec.slice().sort((a, b) => pick(AIR[b.id])[0] - pick(AIR[a.id])[0]), hot = ps[0], cold = rec.slice().sort((a, b) => pick(AIR[a.id])[1] - pick(AIR[b.id])[1])[0]; const v = (x: number) => unit === '°C' ? F(x) : x, u = unit === '°C' ? U : unit; return `${hot.name} (${v(pick(AIR[hot.id])[0])}-${v(pick(AIR[hot.id])[1])} ${u}) and ${cold.name} (${v(pick(AIR[cold.id])[0])}-${v(pick(AIR[cold.id])[1])} ${u})`; };
  const t = meet(rec.map(x => AIR[x.id].c));
  if (!t) add('environment', 'problem', `Air temperature: no shared range. ${pair(a => a.c, '°C')} have none in common`);
  else if (t[0] === t[1]) add('environment', 'caution', `Air temperature: only one shared value (${F(t[0])} ${U}); no operating margin. ${pair(a => a.c, '°C')} meet there`);
  const h = meet(rec.map(x => AIR[x.id].rh));
  if (!h) {
    const tol = meet(rec.map(x => AIR[x.id].rhTol ?? [Math.max(0, AIR[x.id].rh[0] - 10), Math.min(100, AIR[x.id].rh[1] + 10)] as R2));
    add('environment', tol ? 'caution' : 'problem', `Humidity: no shared comfortable range. ${pair(a => a.rh, '%')} ${tol ? `only overlap in the tolerable ${tol[0]}-${tol[1]} %` : 'have none in common'}`);
  } else if (h[1] - h[0] <= NARROW_RH) add('environment', 'caution', `Humidity: shared range ${h[0]}-${h[1]} %, a narrow margin`);
}

/**
 * @param mins the tank-minimum lines (ui/fullnessTile.ts minWarnings), passed in so this file does not import the tile.
 */
export function stockSummary(S: TankSetup, r: Stocking, mins: { level: 'over' | 'near'; text: string }[], units: Units = 'cm'): StockSummary {
  const us = units === 'in';
  const by: Record<CatId, CatItem[]> = { minimums: [], social: [], environment: [], behaviour: [], fullness: [] };
  const add = (c: CatId, level: CatItem['level'], text: string, also?: string, pct?: number) => by[c].push({ level, text, ...(also ? { also } : {}), ...(pct !== undefined ? { pct } : {}) });
  const count = new Map<string, number>(), fem = new Map<string, number>();
  for (const f of S.fish) { const sp = getSpecies(f.species); if (!sp || !countsAgainstWater(sp)) continue; count.set(sp.id, (count.get(sp.id) ?? 0) + 1); if (f.sex === 'f') fem.set(sp.id, (fem.get(sp.id) ?? 0) + 1); }
  const sp = [...count.keys()].map(id => getSpecies(id)!) as Species[];
  const noData = new Map<string, Set<string>>(); // species name -> checks that did not fire
  const none = (s: Species, check: string) => { if (!noData.has(s.name)) noData.set(s.name, new Set()); noData.get(s.name)!.add(check); };

  // (a) tank minimums: the species' own red line; a species with none on record simply has no check
  for (const w of mins) add('minimums', w.level === 'over' ? 'problem' : 'caution', w.text);
  for (const s of sp) if (!groupMinimum(s)) none(s, 'tank minimum');

  // (b) social: group band, sex ratio, pairs
  for (const s of sp) {
    const n = count.get(s.id)!, f = fem.get(s.id) ?? 0, nt = notesOf({ id: s.id, n, f, pair: pairingIn(S, s.id) }, 'in');
    if (nt.band === 'avoid') add('social', 'caution', `${s.name}: ${nt.line.replace(/^Group size: /, `group of ${n}: `)}`);
    if (nt.ratio && /Your mix (has|is short)/.test(nt.ratio)) add('social', 'caution', `${s.name}: ${nt.ratio}`);
  }

  // (c) environment + (d) behaviour from the pairwise care gates, each pair said once (the engine states it from the acting side)
  const seen = new Set<string>();
  { const fresh = sp.filter(x => !x.salt), salt = sp.filter(x => x.salt); if (fresh.length && salt.length) add('environment', 'problem', `Fresh water and salt water animals cannot share a tank: ${fresh.map(x => x.name).join(', ')} with ${salt.map(x => x.name).join(', ')}`); }
  for (const s of sp) for (const o of sp) {
    if (o === s) continue;
    const ws = whysAnimal(s, Infinity, 3, [o]), blocked = ws.some(w => !w.concern && !w.temp);
    for (const w of ws) {
      if (w.concern && blocked) continue;
      const t = w.text.replace(/^compatibility: /, '');
      if (w.kind !== 'compat' || w.temp || /^it /.test(t) || (/^water (chemistry|hardness)/.test(t) && s.id > o.id)) continue;
      const key = `${s.id}|${o.id}|${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const env = /^water (chemistry|hardness)|dry enclosure/.test(t);
      add(env ? 'environment' : 'behaviour', w.concern ? 'caution' : 'problem', `${s.name} with ${o.name}: ${t.replace(/ \([^)]*\)$/, '')}`);
    }
  }
  for (const s of sp) { const c = CARE[s.id]; if (c && !c.gh) none(s, 'hardness range'); }
  for (const t of crowdWarnings(S)) {
    if (/unpaired|not set|established/i.test(t)) add('social', 'caution', t.replace(/\.$/, ''));
    else add('behaviour', 'caution', t.replace(/\.$/, ''), /fight/.test(t) ? 'cover limits fighting: see Environment' : undefined);
  }
  // prose-only aggression (Nathan 2026-10-27, demasoni): a single-species tank of a temper-2 species cautions from the rating
  if (sp.length === 1 && CARE[sp[0].id]?.temper === 2 && count.get(sp[0].id)! > 1 && !by.behaviour.length) add('behaviour', 'caution', `${sp[0].name}: rated aggressive; expect dominance fights, give them a big tank with cover`);

  // temperature of the whole stocking (the tank's own temperature is set automatically: no unverified state)
  const land = [...new Set(S.fish.map(f => getSpecies(f.species)).filter((x): x is Species => !!x && (!countsAgainstWater(x) || (!S.water.on && x.habitat === 'both' && !!AIR[x.id]))))];
  const sh = sharedRange(sp);
  if (!sp.length && land.length) { /* terrarium: the air check below replaces the (empty) water one */ }
  else if (sh.state === 'none') add('environment', 'problem', rangeLine(sh, us));
  else if (sh.state === 'single') add('environment', 'caution', rangeLine(sh, us));
  else if (sh.state === 'unknown') add('environment', 'unknown', 'No recorded temperature range for some of these animals');
  airChecks(land, add, us);
  for (const t of coverAdvice(S)) add('environment', 'caution', t.replace(/\.$/, ''), 'it also limits fighting: see Behavior');
  for (const s of sp) for (const n of needsOf(s.id)) if (n.status === 'unchecked') add('environment', 'unknown', `${s.name}: ${n.text} (the tool cannot check this)`);
  const litres = volume(S.tank).litres;
  for (const s of sp) {
    const g = grazerShort(s.id, count.get(s.id)!, litres);
    if (g) add('environment', grazerLevel(s.id, count.get(s.id)!, litres) === 'severe' ? 'problem' : 'caution', `${s.name}: ${g.replace(/^algae: /, 'food: ')}`);
  }

  // filtration is not fullness (S243 step 4): it reads under Environment, as its own item. With no filter chosen it is worked against an assumed default
  // filter and says so; the missing choice itself is "Not enough information" (never green, B1 audit, Nathan 2026-10-27)
  if (r.contributors.length) {
    const unset = filterState(S) === 'unset', f = r.filtrationPercent, wc = r.nitrogen.waterChange.state, of = unset ? `an assumed ${r.nitrogen.filter.label}` : 'what the filter and plants clear';
    if (unset) add('environment', 'unknown', 'No filter chosen: filtration below is worked out for an assumed filter, so pick one in Tech › Filtration');
    if (isOver(f)) add('environment', 'problem', `Filtration: ${Number.isFinite(f) ? Math.round(f) : 'over 999'}% of ${unset ? of : 'what the filter and plants clear'}: ${unset ? 'a filter this size cannot keep up' : 'the filter cannot keep up'}, so a bigger filter or fewer animals`);
    else if (Math.round(f) >= IDEAL_MAX) add('environment', 'caution', `Filtration: ${Math.round(f)}% of ${unset ? of : 'what the filter and plants clear'}: heavier than normal water changes`);
    if (wc === 'failure') add('environment', 'problem', 'Water changes cannot hold nitrate near 40 ppm for this stock (see the nitrate line)');
    else if (wc === 'high') add('environment', 'caution', 'High water-change maintenance to hold nitrate near 40 ppm (see the nitrate line)');
  }

  // (e) spatial fullness: room only (water column or floor), never filtration (Nathan 2026-10-27)
  if (r.contributors.length) {
    const p = r.spacePercent, where = r.spaceBy === 'floor' ? 'floor' : 'swimming room';
    if (isOver(p)) add('fullness', 'problem', `${Number.isFinite(p) ? Math.round(p) : 'Over 999'}% of the ${where}: too many for this tank`, undefined, Number.isFinite(p) ? p : 999);
    else if (Math.round(p) >= FULLNESS_WARN) add('fullness', 'caution', `${Math.round(p)}% of the ${where}: nearly full`, undefined, p); // the bar beside it says the rest: 75-90 % is just past ideal, not worth a flag (Nathan 2026-10-27)
  }

  const gm = stockingGroupMinimum(sp.map(x => x.id)).tank;
  const answer = gm ? `Smallest tank for them: ${gm.tank} (${gm.dims} in, ${gm.gal} gal), set by ${gm.by} in a group of ${gm.n}` : undefined;
  const cats = (Object.keys(by) as CatId[]).map((id): Category => { const level = levelOf(by[id]); return { id, label: LABELS[id][0], what: LABELS[id][1], level, word: LEVEL_WORD[level], items: by[id], ...(id === 'minimums' && answer ? { answer } : {}) }; });
  const worst = worstOf(cats.map(c => c.level));
  return { cats, worst, worstWord: LEVEL_WORD[worst], noData: [...noData.values()].reduce((a, s) => a + s.size, 0), noDataFor: [...noData.keys()] };
}

/** mm in the scene's units: whole cm, or inches to a tenth. */
export const toUnits = (mm: number, u: Units) => u === 'in' ? Math.round(mm / 25.4 * 10) / 10 : Math.round(mm / 10);
export const fmtOf = (units: Units) => ({ len: (mm: number) => `${toUnits(mm, units)}${units === 'in' ? '"' : ' cm'}`, area: (cm2: number) => units === 'in' ? `${Math.round(cm2 / 6.4516)} sq in` : `${Math.round(cm2)} cm²`,
  vol: (l: number) => units === 'in' ? `${Math.round(l / 3.785 * 10) / 10} gal` : `${Math.round(l)} L` });

/**
 * The tank-minimum lines under the bar (Nathan 2026-10-21): a red line per species below its minimum (or that cannot be assessed),
 * naming the unmet measure, sourced or "estimated from a gallon figure"; a yellow line for advisories (deeper water than advised).
 * A yellow line too for a species below its recommended size (Nathan 2026-10-22, reversing "Bar back, keep lines": a yellow bar at
 * 66 % read as a contradiction with nothing under it to say why), one line per species with any advisory. Same 10 % slack as the
 * animal gate and the tank-fit engine (MIN_SLACK_PCT) on the red line.
 */
export function minWarnings(m: TankMinimum, units: Units): MinWarn[] {
  const f = fmtOf(units), name = (x: MinRow) => plural(x.n, x.name), out: MinWarn[] = [];
  for (const x of [...m.rows].sort((a, b) => b.pct - a.pct)) if (x.pct > MIN_SLACK_PCT) out.push({ level: 'over', text: `${name(x)}: ${reasonIn(x, f)}` });
  for (const x of [...m.rows].sort((a, b) => b.comfortPct - a.comfortPct)) if (x.pct <= MIN_SLACK_PCT) {
    const near = [...(x.comfortPct > 100 ? [recommendedOf(x.comfort, f)] : []), ...notesIn(x, f)];
    if (near.length) out.push({ level: 'near', text: `${name(x)}: ${near.join('; ')}` });
  }
  return out;
}

/** The fullness line shows only from here up (the bar already shows the number; Nathan 2026-10-27). */
export const FULLNESS_WARN = 90;
/** The text colour of a load percent on the gauge's own scale (style.css .gauge: amber at the midpoint of ideal..100, red at 100). */
export function gaugeText(pct: number): string {
  const t = Math.max(0, Math.min(1, (pct - (IDEAL_MAX + 100) / 2) / (100 - (IDEAL_MAX + 100) / 2))), a = [240, 178, 74], b = [255, 138, 122];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
}

/** The five-category summary as the tile draws it (S243 step 1): one chip per category, each expanding into its reasons. */
export function summaryHtml(sm: StockSummary, esc: (s: string) => string): string {
  const rows = sm.cats.map(c => `<details class="ftCat"${c.level === 'problem' ? ' open' : ''}><summary><span>${esc(c.label)}</span><span class="ftChip ftc-${c.level}">${esc(c.word)}</span></summary>`
    + `<div class="ftCatWhat">${esc(c.what)}</div>` + (c.answer ? `<div class="ftCatAns">${esc(c.answer)}</div>` : '') + (c.items.length ? `<ul>${c.items.map(i => `<li class="ftc-${i.level}"${i.pct !== undefined ? ` style="color:${gaugeText(i.pct)}"` : ''}>${esc(i.text)}${i.also ? ` <em>(${esc(i.also)})</em>` : ''}</li>`).join('')}</ul>` : '<ul><li class="ftc-ok">Nothing found against it.</li></ul>') + '</details>').join('');
  return `<div class="ftCats">${rows}${sm.noData ? `<div class="ftNoData" title="${esc(sm.noDataFor.join(', '))}">${sm.noData} check${sm.noData === 1 ? '' : 's'} had no data for this species</div>` : ''}</div>`;
}


/** The summary for a tank as it stands (the tile, the stocking screen and the plan sheet all read this one). */
export const summaryOf = (S: TankSetup, units: Units = 'cm'): StockSummary => stockSummary(S, stockingMemo(S), minWarnings(tankMinimum(S), units), units);

/** The same summary as plain lines (the plan sheet's .txt): headline, then one line per category with its reasons indented. */
export function summaryText(sm: StockSummary): string[] {
  const L = [`Stocking summary: ${sm.worstWord}`];
  for (const c of sm.cats) { L.push(`  ${c.label}: ${c.word}`); if (c.answer) L.push(`      ${c.answer}`); for (const i of c.items) L.push(`      ${i.text}${i.also ? ` (${i.also})` : ''}`); }
  if (sm.noData) L.push(`  ${sm.noData} check${sm.noData === 1 ? '' : 's'} had no data for this species`);
  return L;
}
