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
import { notesIn, reasonIn, tankMinimum, type MinRow, type TankMinimum } from '../scene/tankMin';
import { MIN_SLACK_PCT } from '../scene/animalfit';
import { groupMinimum, stockingGroupMinimum } from '../scene/groupMin';
import { plural } from '../scene/stocking';
import { rangeLine, sharedRange } from '../scene/temprange';
import { coverAdvice, crowdWarnings } from '../scene/territory';
import type { TankSetup, Units } from '../scene/types';
import { notesOf } from './stockPlanLogic';

export interface MinWarn { level: 'over' | 'near'; text: string }
export type CatId = 'minimums' | 'social' | 'environment' | 'behaviour' | 'fullness';
export type CatLevel = 'ok' | 'caution' | 'problem' | 'unknown';
export interface CatItem { level: 'caution' | 'problem' | 'unknown'; text: string; /** a cross-link: the item is counted here, also relevant there */ also?: string }
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

/**
 * @param mins the tank-minimum lines (ui/fullnessTile.ts minWarnings), passed in so this file does not import the tile.
 */
export function stockSummary(S: TankSetup, r: Stocking, mins: { level: 'over' | 'near'; text: string }[]): StockSummary {
  const by: Record<CatId, CatItem[]> = { minimums: [], social: [], environment: [], behaviour: [], fullness: [] };
  const add = (c: CatId, level: CatItem['level'], text: string, also?: string) => by[c].push({ level, text, ...(also ? { also } : {}) });
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
  const sh = sharedRange(sp);
  if (sh.state === 'none' || sh.state === 'single') add('environment', 'problem', rangeLine(sh));
  else if (sh.state === 'narrow') add('environment', 'caution', `Shared temperature range ${sh.range![0]}-${sh.range![1]} °C: a narrow margin`);
  else if (sh.state === 'unknown') add('environment', 'unknown', 'No recorded temperature range for some of these animals');
  for (const t of coverAdvice(S)) add('environment', 'caution', t.replace(/\.$/, ''), 'it also limits fighting: see Behavior');
  for (const s of sp) for (const n of needsOf(s.id)) if (n.status === 'unchecked') add('environment', 'unknown', `${s.name}: ${n.text} (the tool cannot check this)`);
  const litres = volume(S.tank).litres;
  for (const s of sp) {
    const g = grazerShort(s.id, count.get(s.id)!, litres);
    if (g) add('environment', grazerLevel(s.id, count.get(s.id)!, litres) === 'severe' ? 'problem' : 'caution', `${s.name}: ${g.replace(/^algae: /, 'food: ')}`);
  }

  // (e) spatial fullness: room only (water column or floor), never filtration (Nathan 2026-10-27)
  if (r.contributors.length) {
    const p = r.spacePercent, where = r.spaceBy === 'floor' ? 'floor' : 'swimming room';
    if (isOver(p)) add('fullness', 'problem', `${Number.isFinite(p) ? Math.round(p) : 'Over 999'}% of the ${where}: too many for this tank`);
    else if (Math.round(p) >= IDEAL_MAX) add('fullness', 'caution', `${Math.round(p)}% of the ${where}: past ideal`);
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
 * Below the recommended size is said by the yellow bar and its list, not by a line. Same 10 % slack as the animal gate and the
 * tank-fit engine (MIN_SLACK_PCT) on the red line.
 */
export function minWarnings(m: TankMinimum, units: Units): MinWarn[] {
  const f = fmtOf(units), name = (x: MinRow) => plural(x.n, x.name), out: MinWarn[] = [];
  for (const x of [...m.rows].sort((a, b) => b.pct - a.pct)) if (x.pct > MIN_SLACK_PCT) out.push({ level: 'over', text: `${name(x)}: ${reasonIn(x, f)}` });
  for (const x of m.rows) if (x.pct <= MIN_SLACK_PCT) for (const n of notesIn(x, f)) out.push({ level: 'near', text: `${name(x)}: ${n}` });
  return out;
}

/** The five-category summary as the tile draws it (S243 step 1): one chip per category, each expanding into its reasons. */
export function summaryHtml(sm: StockSummary, esc: (s: string) => string): string {
  const rows = sm.cats.map(c => `<details class="ftCat"${c.level === 'problem' ? ' open' : ''}><summary><span>${esc(c.label)}</span><span class="ftChip ftc-${c.level}">${esc(c.word)}</span></summary>`
    + `<div class="ftCatWhat">${esc(c.what)}</div>` + (c.answer ? `<div class="ftCatAns">${esc(c.answer)}</div>` : '') + (c.items.length ? `<ul>${c.items.map(i => `<li class="ftc-${i.level}">${esc(i.text)}${i.also ? ` <em>(${esc(i.also)})</em>` : ''}</li>`).join('')}</ul>` : '<ul><li class="ftc-ok">Nothing found against it.</li></ul>') + '</details>').join('');
  return `<div class="ftCats">${rows}${sm.noData ? `<div class="ftNoData" title="${esc(sm.noDataFor.join(', '))}">${sm.noData} check${sm.noData === 1 ? '' : 's'} had no data for this species</div>` : ''}</div>`;
}


/** The summary for a tank as it stands (the tile, the stocking screen and the plan sheet all read this one). */
export const summaryOf = (S: TankSetup, units: Units = 'cm'): StockSummary => stockSummary(S, stockingMemo(S), minWarnings(tankMinimum(S), units));

/** The same summary as plain lines (the plan sheet's .txt): headline, then one line per category with its reasons indented. */
export function summaryText(sm: StockSummary): string[] {
  const L = [`Stocking summary: ${sm.worstWord}`];
  for (const c of sm.cats) { L.push(`  ${c.label}: ${c.word}`); if (c.answer) L.push(`      ${c.answer}`); for (const i of c.items) L.push(`      ${i.text}${i.also ? ` (${i.also})` : ''}`); }
  if (sm.noData) L.push(`  ${sm.noData} check${sm.noData === 1 ? '' : 's'} had no data for this species`);
  return L;
}
