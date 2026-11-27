// R131 (lane PK1, 2026-11-18): the full species list: everything the catalogue carries, as one table (common and scientific name, adult
// size, care level, where from, which kinds of tank it suits, the picker group it is listed under). Pure view-model: no DOM. The same rows
// feed research/species-list.md (scripts/species-list.mjs), so the file and the app never disagree.
import { CATEGORIES, SPECIES, gloForm, type Species } from '../../data/species';
import { CARE, EXPERTISE_NAME } from '../../data/care';
import { continentText, originOf } from '../../data/origin';
import { ALL_SETUP_KINDS, ROLES, offeredIn, roleOf, type SetupKind } from '../../scene/pickerKind';
import { LAB_LABEL } from './animals';
import { speciesInScope } from '../../scope';
import { fmtLen } from '../../scene/physics';
import type { Units } from '../../scene/types';

export interface ListRow { id: string; name: string; sci: string; cat: string; catLabel: string; tl: number; size: string; care: string; careN: number; origin: string; suits: string; group: string; /** hidden in the aquarium-only build */ hidden: boolean }
export type SortKey = 'name' | 'sci' | 'size' | 'care' | 'origin';
export const SORTS: [SortKey, string][] = [['name', 'Name'], ['sci', 'Scientific name'], ['size', 'Adult size'], ['care', 'Care level'], ['origin', 'Where from']];

const KIND_WORD: Record<SetupKind, string> = { freshwater: 'Freshwater', saltwater: 'Saltwater', terrarium: 'Terrarium', vivarium: 'Vivarium' };
/** The kinds of tank that offer this species, in the kind order the app uses. */
export const suitsOf = (sp: Species): SetupKind[] => ALL_SETUP_KINDS.map(k => k[0]).filter(k => offeredIn(sp, k));

export function rowOf(sp: Species, units: Units): ListRow {
  const c = CARE[sp.id], o = originOf(sp.id);
  return {
    id: sp.id, name: sp.name, sci: sp.sci, cat: sp.cat, catLabel: CATEGORIES.find(x => x[0] === sp.cat)?.[1] ?? sp.cat, tl: sp.tl,
    size: sp.female ? `${fmtLen(sp.tl, units)} / ${fmtLen(sp.female.tl, units)}` : fmtLen(sp.tl, units),
    care: c ? EXPERTISE_NAME[c.care] : '', careN: c?.care ?? 0, origin: (o ? continentText(o) : '') + (gloForm(sp) ? `${o ? '; ' : ''}GloFish colors: ${LAB_LABEL}` : ''),
    suits: suitsOf(sp).map(k => KIND_WORD[k]).join(', '), group: ROLES.find(r => r[0] === roleOf(sp))![1], hidden: !speciesInScope(sp),
  };
}

/** Every species the catalogue holds (hidden ones flagged, so the markdown file can list all of them). */
export const allRows = (units: Units): ListRow[] => SPECIES.map(sp => rowOf(sp, units));

const key = (r: ListRow, k: SortKey): string | number => k === 'size' ? r.tl : k === 'care' ? r.careN || 9 : k === 'sci' ? r.sci : k === 'origin' ? r.origin || '~' : r.name;
/** Search (common name, scientific name, origin, group, tank kind) and sort within each category. Categories keep the menu order; empty ones are dropped. */
export function listView(rows: ListRow[], q: string, sort: SortKey, includeHidden = false): { cat: string; label: string; rows: ListRow[] }[] {
  const t = q.trim().toLowerCase();
  const keep = rows.filter(r => (includeHidden || !r.hidden) && (!t || `${r.name} ${r.sci} ${r.origin} ${r.group} ${r.suits} ${r.catLabel}`.toLowerCase().includes(t)));
  return CATEGORIES.map(([cat, label]) => ({ cat: cat as string, label: label as string, rows: keep.filter(r => r.cat === cat).sort((a, b) => { const x = key(a, sort), y = key(b, sort); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) || a.name.localeCompare(b.name); }) })).filter(g => g.rows.length);
}

/** research/species-list.md, written from the data (scripts/species-list.mjs): every species, hidden ones marked. */
export function speciesListMarkdown(): string {
  const rows = allRows('in'), hidden = rows.filter(r => r.hidden).length;
  const L = [`# Species list`, '', `Generated from \`src/data/species.json\` by \`scripts/species-list.mjs\`; do not edit by hand. ${rows.length} species. Sizes are adult total length in inches (male / female where they differ). "Hidden on live" marks the ${hidden} terrarium animals the aquarium-only site does not offer (R19).`, ''];
  for (const g of listView(rows, '', 'name', true)) {
    L.push(`## ${g.label} (${g.rows.length})`, '', '| Common name | Scientific name | Adult size | Care level | Where from | Suits | Picker group |', '|---|---|---|---|---|---|---|');
    for (const r of g.rows) L.push(`| ${r.name}${r.hidden ? ' (hidden on live)' : ''} | *${r.sci}* | ${r.size} | ${r.care || '-'} | ${r.origin || '-'} | ${r.suits} | ${r.group} |`);
    L.push('');
  }
  return L.join('\n');
}
