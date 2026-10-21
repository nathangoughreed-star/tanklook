// Source audit (2026-10-20): walks every advice value the tool holds at run time, applies src/data/provenance.ts and counts how many
// trace to a source. Used by test/sources.test.ts (ratchet + registry checks); `GEN_SOURCES=1 npx vitest run test/sources.test.ts`
// rewrites research/source-coverage.md and research/source-baseline.json.
import sourcesJson from '../src/data/sources.json';
import speciesJson from '../src/data/species.json';
import bodymass from '../src/data/bodymass.json';
import factors from '../src/data/factors.json';
import demandDefaults from '../src/data/demand-defaults.json';
import demandItems from '../src/data/demand-items.json';
import tech from '../src/data/tech.json';
import gearCatalog from '../src/data/gear-catalog.json';
import tanks from '../src/data/tanks.json';
import tankmin from '../src/data/tankmin.json';
import kits from '../src/data/kits.json';
import deals from '../src/data/deals.json';
import gearDeals from '../src/data/gear-deals.json';
import { CARE } from '../src/data/care';
import { AIR } from '../src/data/climate';
import { MARINE_PH } from '../src/data/waterchem';
import { HERP } from '../src/data/herpstock';
import { SPACE_FACTOR, SPACE_FACTOR_CLASS } from '../src/data/spacefactor';
import { FILTER_MEDIA_L } from '../src/data/filtermedia';
import { FRESH_TIERS, REEF_TIERS, NEEDS, isLand } from '../src/scene/lightneeds';
// @ts-expect-error node only (no node types in this project)
const { readFileSync } = await import('node:fs');
import { ENGINE_FILES, EXCLUDED, FORMULAS, RULES, STATUSES, TABLES, type Rule, type Status } from '../src/data/provenance';

type Obj = Record<string, unknown>;
const byId = (rows: Obj[], key = 'id') => Object.fromEntries(rows.map((r, i) => [String(r[key] ?? i), r]));
const pick = (o: Obj, keys: string[]) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]]));

/** One target per data table, in the order the report ranks them (most user-facing first), with which leaves count as advice. */
interface Target { name: string; label: string; data: unknown; leaf: (key: string, v: unknown, path: string[]) => boolean }
const num = (_k: string, v: unknown) => typeof v === 'number';
const numBool = (_k: string, v: unknown) => typeof v === 'number' || typeof v === 'boolean';
const species = (speciesJson as { species: Obj[] }).species;
export const TARGETS: Target[] = [
  { name: 'CARE', label: 'Animal care: min tank, temperament, temperature, pH / GH, group, predation (data/care.ts)', data: CARE,
    leaf: (k, v) => k !== 'tolEst' && (numBool(k, v) || k === 'fam') },
  { name: 'TANKMIN', label: 'Tank minimum red / green lines, heights, depth notes, advisory gallons (tankmin.json, lane MM)', data: (tankmin as { species: Obj }).species,
    leaf: (k, v) => typeof v === 'number' && ['L', 'W', 'areaCm2', 'H', 'gal', 'recommendedTankHeightMm', 'advisoryTankHeightMm', 'maxWaterDepthMm'].includes(k) },
  { name: 'SPECIES', label: 'Adult length per species (species.json tl)', data: byId(species.map(s => ({ id: s.id, tl: s.tl, ...(s.female ? { female: s.female } : {}) }))),
    leaf: (k, v) => k === 'tl' && typeof v === 'number' },
  { name: 'MARINE_PH', label: 'Marine pH band (data/waterchem.ts)', data: MARINE_PH, leaf: num },
  { name: 'HERP', label: 'Reptile / amphibian floor area, height, groups, growth (data/herpstock.ts)', data: HERP, leaf: numBool },
  { name: 'AIR', label: 'Terrarium air temperature and humidity (data/climate.ts AIR)', data: AIR, leaf: num },
  { name: 'NEEDS', label: 'Plant and coral light, CO2, fertiliser, dosing (scene/lightneeds.ts)', data: Object.fromEntries(Object.entries(NEEDS).filter(([, n]) => !isLand(n))),
    leaf: (k, v) => typeof v === 'number' || ['band', 'co2', 'ferts', 'dosing'].includes(k) },
  { name: 'FRESH_TIERS', label: 'Freshwater PAR tiers', data: FRESH_TIERS, leaf: (k, v) => typeof v === 'number' && (k === 'lo' || k === 'hi') },
  { name: 'REEF_TIERS', label: 'Reef PAR tiers', data: REEF_TIERS, leaf: (k, v) => typeof v === 'number' && (k === 'lo' || k === 'hi') },
  { name: 'BODYMASS', label: 'Body mass (length-weight a, b) for the stocking engine', data: Object.fromEntries(Object.entries((bodymass as { species: Obj }).species).map(([id, m]) => [id, pick(m as Obj, ['a', 'b'])])), leaf: num },
  { name: 'SPACE_FACTOR', label: 'Per-species space factors', data: SPACE_FACTOR, leaf: (k, v) => k === '0' && typeof v === 'number' },
  { name: 'SPACE_FACTOR_CLASS', label: 'Space factor classes', data: SPACE_FACTOR_CLASS, leaf: (k, v) => k === '0' && typeof v === 'number' },
  { name: 'FILTER_MEDIA', label: 'Biological media litres per filter (data/filtermedia.ts)', data: FILTER_MEDIA_L, leaf: (k, v) => k === '0' && typeof v === 'number' },
  { name: 'TECH', label: 'Gear sizing, minutes, watts, heat loss (tech.json)', data: pick(tech as Obj, ['gear', 'heat', 'rows', 'roomC']), leaf: numBool },
  { name: 'DEMAND_DEFAULTS', label: 'Category cost / time defaults (demand-defaults.json)', data: demandDefaults, leaf: num },
  { name: 'FACTORS', label: 'Shared cost factors: kWh, water, salt, losses (factors.json)', data: factors, leaf: num },
  { name: 'DEMAND_ITEMS', label: 'Per-item retail prices (demand-items.json)', data: (demandItems as { rows: Obj }).rows, leaf: (k, v) => typeof v === 'number' && ['lo', 'mode', 'hi'].includes(k) },
  { name: 'GEAR_CATALOG', label: 'Filter and heater specs (gear-catalog.json)', data: { filters: byId((gearCatalog as { filters: Obj[] }).filters), heaters: byId((gearCatalog as { heaters: Obj[] }).heaters) },
    leaf: (k, v) => typeof v === 'number' && ['gph', 'galMin', 'galMax', 'watts', 'priceUsd'].includes(k) },
  { name: 'TANKS', label: 'Tank sizes and prices (tanks.json)', data: byId((tanks as { tanks: Obj[] }).tanks),
    leaf: (k, v, p) => typeof v === 'number' && !['bowMin', 'sides', 'pieDeg'].includes(k) && !p.includes('price_note') },
  { name: 'KITS', label: 'Kit specs and prices (kits.json)', data: byId(kits as Obj[]), leaf: num },
  { name: 'DEALS', label: 'Deals (deals.json)', data: byId((deals as { deals: Obj[] }).deals), leaf: num },
  { name: 'GEAR_DEALS', label: 'Gear deals (gear-deals.json)', data: byId((gearDeals as { rows: Obj[] }).rows), leaf: num },
];

// ---- path matching
const segMatch = (pat: string, seg: string) => pat === '*' || (pat.startsWith('{') ? pat.slice(1, -1).split(',').includes(seg) : pat === seg);
function match(pat: string[], path: string[]): boolean {
  if (!pat.length) return !path.length;
  if (pat[0] === '**') return match(pat.slice(1), path) || (path.length > 0 && match(pat, path.slice(1)));
  return path.length > 0 && segMatch(pat[0], path[0]) && match(pat.slice(1), path.slice(1));
}
const splitPath = (p: string) => p.match(/\{[^}]*\}|[^.]+/g) ?? [];
/** Does the value's row carry an http url and is the field not marked estimated? Nearest object with a url-like field decides. */
function rowCited(chain: Obj[], key: string): boolean {
  for (let i = chain.length - 1; i >= 0; i--) {
    const o = chain[i];
    if (o.est === true || (Array.isArray(o.est) && o.est.includes(key))) return false;
    for (const f of ['url', 'priceUrl', 'source']) {
      const v = o[f];
      if (typeof v === 'string') return /^https?:/.test(v);
      if (Array.isArray(v)) return v.some(x => typeof x === 'string' && /^https?:/.test(x));
    }
  }
  return false;
}

export interface Value { target: string; path: string; group: string; status: Status | null; rule?: Rule }
export function walk(): Value[] {
  const out: Value[] = [];
  for (const t of TARGETS) {
    const rules = RULES[t.name] ?? [];
    const rec = (v: unknown, path: string[], group: string[], chain: Obj[]) => {
      if (v && typeof v === 'object') {
        const entries = Object.entries(v as Obj);
        const many = Array.isArray(v) || (!path.length && entries.length > 12) || (entries.length >= 4 && entries.every(([k, x]) => k.startsWith('_') || (x && typeof x === 'object' && !Array.isArray(x))));
        for (const [k, x] of entries) rec(x, [...path, k], [...group, many ? '*' : k], [...chain, v as Obj]);
        return;
      }
      const key = path[path.length - 1];
      if (!t.leaf(key, v, path)) return;
      let rule: Rule | undefined;
      for (let i = rules.length - 1; i >= 0; i--) {
        const r = rules[i];
        if (!match(splitPath(r.path), path)) continue;
        if (r.rowUrl && !rowCited(chain, key)) continue;
        rule = r; break;
      }
      out.push({ target: t.name, path: path.join('.'), group: group.join('.').replace(/\.(lo|mode|hi)$/,'.{lo,mode,hi}'), status: rule?.status ?? null, rule });
    };
    rec(t.data, [], [], []);
  }
  return out;
}

// ---- engine constants
export interface ConstReport { file: string; documented: string[]; excluded: string[]; unsourced: string[]; inline: number; missingSymbols: string[] }
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
export function engineConstants(root = '.'): ConstReport[] {
  return ENGINE_FILES.map(file => {
    const text = readFileSync(`${root}/${file}`, 'utf8'), code = stripComments(text), lines = code.split('\n');
    // a top-level declaration runs until its brackets close on a line ending in `;` (or the next top-level line)
    const names: string[] = [], inDecl = new Set<number>();
    lines.forEach((l, i) => {
      if (!/^(export )?const [A-Z]/.test(l)) return;
      let depth = 0, j = i;
      for (; j < lines.length; j++) {
        if (j > i && depth <= 0 && /^\S/.test(lines[j])) { j--; break; }
        inDecl.add(j);
        for (const ch of lines[j].replace(/'[^'\n]*'|"[^"\n]*"/g, '')) depth += '([{'.includes(ch) ? 1 : ')]}'.includes(ch) ? -1 : 0;
        if (depth <= 0 && /;\s*$/.test(lines[j])) break;
      }
      if (!/\d/.test(lines.slice(i, j + 1).join('\n'))) return;
      for (const m of l.matchAll(/\b([A-Z][A-Z0-9_]*)\s*(?::[^=]*)?=(?![=>])/g)) if (m[1].length > 1) names.push(m[1]);
    });
    const doc = new Set(FORMULAS.filter(f => f.file === file).flatMap(f => f.symbols));
    const exc = new Set([...EXCLUDED, ...TABLES].filter(f => f.file === file).flatMap(f => f.symbols));
    const missingSymbols = [...doc, ...exc].filter(s => !new RegExp(`\\b${s}\\b`).test(code));
    // numbers written inside functions (not top-level constants), other than the trivial ones: what still needs a by-hand look
    const inline = lines.filter((l, i) => !inDecl.has(i) && !/^\s*(import|export type|type |interface )/.test(l))
      .join('\n').replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, '')
      .match(/(?<![\w.])\d+(?:\.\d+)?(?:e-?\d+)?(?![\w.])/g)?.filter(n => !['0', '1', '2', '3', '10', '100', '1000', '0.5'].includes(n)).length ?? 0;
    return { file, documented: names.filter(n => doc.has(n)), excluded: names.filter(n => exc.has(n)), unsourced: names.filter(n => !doc.has(n) && !exc.has(n)), inline, missingSymbols };
  });
}

// ---- registry checks
export function registryProblems(): string[] {
  const ids = new Set(Object.keys((sourcesJson as { sources: Obj }).sources)), bad: string[] = [];
  for (const [t, rules] of Object.entries(RULES)) for (const r of rules) {
    for (const s of r.src ?? []) if (!ids.has(s)) bad.push(`RULES.${t} ${r.path}: unknown source ${s}`);
    if (!r.why) bad.push(`RULES.${t} ${r.path}: no why`);
    if (r.status === 'cited' && !r.src?.length) bad.push(`RULES.${t} ${r.path}: cited without a source`);
  }
  for (const f of FORMULAS) {
    for (const s of f.src ?? []) if (!ids.has(s)) bad.push(`FORMULAS ${f.file} ${f.symbols}: unknown source ${s}`);
    if (f.status === 'cited' && !f.src?.length) bad.push(`FORMULAS ${f.file} ${f.symbols}: cited without a source`);
  }
  for (const t of Object.keys(RULES)) if (!TARGETS.some(x => x.name === t)) bad.push(`RULES.${t}: no such target`);
  return bad;
}

// ---- summary and report
export interface Summary { total: number; unsourced: number; byStatus: Record<string, number>; constUnsourced: number; constDocumented: number; inline: number }
export function summarize(vals = walk(), consts = engineConstants()): Summary {
  const byStatus: Record<string, number> = Object.fromEntries([...STATUSES, 'unsourced'].map(s => [s, 0]));
  for (const v of vals) byStatus[v.status ?? 'unsourced']++;
  return { total: vals.length, unsourced: byStatus.unsourced, byStatus,
    constUnsourced: consts.reduce((n, c) => n + c.unsourced.length, 0), constDocumented: consts.reduce((n, c) => n + c.documented.length, 0),
    inline: consts.reduce((n, c) => n + c.inline, 0) };
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '-');
export function report(vals = walk(), consts = engineConstants()): string {
  const s = summarize(vals, consts), cols = [...STATUSES, 'unsourced'];
  const L: string[] = [];
  L.push('# Source coverage', '', `Generated by \`GEN_SOURCES=1 npx vitest run test/sources.test.ts\` (scripts/source-audit.ts) from src/data/provenance.ts and`,
    'src/data/sources.json. Status, strongest first: cited (a registered source or the row\'s own url states the value), fitted (fitted to a',
    'named tool by a committed script), derived (worked out from cited values), researched (a committed research note covers it, not tied to',
    'one page), claimed (the code names a source or "practice" for a group of values; needs a per-value check), assumption (our own choice,',
    'with a reason), unsourced (nothing). Strong = cited + fitted + derived. A product row (tank, gear, kit, deal, price) counts as cited',
    'when it carries the url of the listing it was read from and does not mark the field `est`; a value the listing does not state must be marked `est`.', '');
  L.push('## Totals', '', `| | values | ${cols.join(' | ')} | strong |`, `|---|---|${cols.map(() => '---').join('|')}|---|`);
  const strong = (b: Record<string, number>) => b.cited + b.fitted + b.derived;
  L.push(`| **all data** | ${s.total} | ${cols.map(c => `${s.byStatus[c]} (${pct(s.byStatus[c], s.total)})`).join(' | ')} | ${pct(strong(s.byStatus), s.total)} |`);
  for (const t of TARGETS) {
    const vs = vals.filter(v => v.target === t.name); if (!vs.length) continue;
    const b: Record<string, number> = Object.fromEntries(cols.map(c => [c, 0])); for (const v of vs) b[v.status ?? 'unsourced']++;
    L.push(`| ${t.label} | ${vs.length} | ${cols.map(c => b[c] || '').join(' | ')} | ${pct(strong(b), vs.length)} |`);
  }
  L.push('', `Engine constants (top-level numbers in ${ENGINE_FILES.length} engine files): ${s.constDocumented} documented in FORMULAS, ${s.constUnsourced} unsourced.`,
    `Numbers written inline in those files' functions (not counted above, a by-hand review list): ${s.inline}.`, '');
  // ranked work list: unsourced first, then claimed, grouped by field, in target order
  const grouped = (status: Status | null) => {
    const m = new Map<string, { target: string; n: number; why?: string }>();
    for (const v of vals) if (v.status === status) { const k = `${v.target} ${v.group}`; const e = m.get(k) ?? { target: v.target, n: 0, why: v.rule?.why }; e.n++; m.set(k, e); }
    return [...m].sort((a, b) => TARGETS.findIndex(t => t.name === a[1].target) - TARGETS.findIndex(t => t.name === b[1].target) || b[1].n - a[1].n);
  };
  L.push('## Work list 1: unsourced values (most user-facing first)', '', '| field | values |', '|---|---|');
  for (const [k, e] of grouped(null)) L.push(`| \`${k}\` | ${e.n} |`);
  L.push('', '### Unsourced engine constants', '', '| file | constants | inline numbers |', '|---|---|---|');
  for (const c of consts) if (c.unsourced.length || c.inline) L.push(`| ${c.file} | ${c.unsourced.join(', ') || '-'} | ${c.inline} |`);
  L.push('', '## Work list 2: claimed values (a source is named for the group, not checked per value)', '', '| field | values | why |', '|---|---|---|');
  for (const [k, e] of grouped('claimed')) L.push(`| \`${k}\` | ${e.n} | ${e.why ?? ''} |`);
  L.push('', '## Work list 3: researched values (tie each to the page it came from)', '', '| field | values |', '|---|---|');
  for (const [k, e] of grouped('researched')) L.push(`| \`${k}\` | ${e.n} |`);
  L.push('', '## Engine formulas', '', '| file | symbols | status | why |', '|---|---|---|---|');
  for (const f of FORMULAS) L.push(`| ${f.file} | ${f.symbols.join(', ')} | ${f.status} | ${f.why} |`);
  return L.join('\n') + '\n';
}
