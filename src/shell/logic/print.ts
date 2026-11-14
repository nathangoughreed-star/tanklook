// UI2 shell step 8 (lane S8, 2026-11-13): the Print section's one page builder (screen map §2a "Section Print", mockup 08, decision 5).
// Three presets: Shopping list, Setup sheet, Full report (Build plan was dropped 11-13: care guidance is out of scope). A preset only picks which
// parts are ticked; a tick changes the page. Nothing is re-priced or re-worded here: the numbers come from the old builders as they are
// (ui/report.ts reportOf / reportHtml, scene/setupsheet.ts buildSheet / sheetText / sheetCsv, scene/plan.ts planOf for the sales). Pure.
import type { Scene } from '../../scene/types';
import { reportOf, reportHtml, REPORT_PARTS } from '../../ui/report';
import { buildSheet, sheetCsv, sheetText, type Sheet } from '../../scene/setupsheet';
import { planOf } from '../../scene/plan';
import { KINDS } from '../../scene/items';
import type { UserProfile } from '../../demand/types';

export type PresetId = 'shopping' | 'setup' | 'report';
export interface PartDef { id: string; label: string; note?: string }
export interface Preset { id: PresetId; title: string; blurb: string; parts: PartDef[]; defaults: string[]; file: string }

const SHOPPING_PARTS: PartDef[] = [
  { id: 'tank', label: 'Tank and stand' }, { id: 'equipment', label: 'Equipment' }, { id: 'substrate', label: 'Substrate and rock' },
  { id: 'plants', label: 'Plants' }, { id: 'animals', label: 'Animals' }, { id: 'owned', label: 'Already owned', note: 'listed apart, $0' },
  { id: 'prices', label: 'Prices and totals' }, { id: 'where', label: 'Where to buy', note: 'sales that fit' }, { id: 'picture', label: 'Picture of the tank' },
];
const SETUP_PARTS: PartDef[] = [
  { id: 'tank', label: 'Tank, water and weight' }, { id: 'substrate', label: 'Substrate and rock', note: 'bag counts' }, { id: 'plants', label: 'Plants' },
  { id: 'animals', label: 'Animals' }, { id: 'equipment', label: 'Equipment' }, { id: 'owned', label: 'Already owned', note: '$0' },
];
export const PRESETS: Preset[] = [
  { id: 'shopping', title: 'Shopping list', blurb: 'what to buy, what you have', parts: SHOPPING_PARTS, defaults: SHOPPING_PARTS.slice(0, 7).map(p => p.id), file: 'shopping-list' },
  { id: 'setup', title: 'Setup sheet', blurb: 'bags, rock, layout, amounts', parts: SETUP_PARTS, defaults: SETUP_PARTS.map(p => p.id), file: 'setup' },
  { id: 'report', title: 'Full report', blurb: 'picture, checks, costs, notes', parts: REPORT_PARTS.map(p => ({ id: p.id, label: p.label })), defaults: REPORT_PARTS.map(p => p.id), file: 'report' },
];
export const presetById = (id: PresetId) => PRESETS.find(p => p.id === id)!;
export const tickCount = (p: Preset, ticks: ReadonlySet<string>) => p.parts.filter(x => ticks.has(x.id)).length;

// ---------- the ticks, remembered per preset in this browser ----------
const KEY = 'tanklook.ui2.print';
type Mem = Pick<Storage, 'getItem' | 'setItem'>;
const mem = (): Mem | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
export interface PrintPrefs { preset: PresetId; ticks: Record<PresetId, string[]> }
export const defaultPrefs = (): PrintPrefs => ({ preset: 'shopping', ticks: { shopping: [...PRESETS[0].defaults], setup: [...PRESETS[1].defaults], report: [...PRESETS[2].defaults] } });
export function loadPrefs(st: Mem | null = mem()): PrintPrefs {
  const d = defaultPrefs();
  try {
    const v = JSON.parse(st?.getItem(KEY) ?? 'null');
    if (v && PRESETS.some(p => p.id === v.preset)) d.preset = v.preset;
    for (const p of PRESETS) { const t = v?.ticks?.[p.id]; if (Array.isArray(t)) d.ticks[p.id] = t.filter((x: unknown) => p.parts.some(q => q.id === x)); }
  } catch { /* nothing saved */ }
  return d;
}
export const savePrefs = (p: PrintPrefs, st: Mem | null = mem()) => { try { st?.setItem(KEY, JSON.stringify(p)); } catch { /* lasts this visit */ } };
/** Choosing a preset puts back that preset's own ticks; a single tick changes one part. */
export const choosePreset = (p: PrintPrefs, id: PresetId): PrintPrefs => ({ preset: id, ticks: { ...p.ticks, [id]: [...presetById(id).defaults] } });
export const toggleTick = (p: PrintPrefs, part: string): PrintPrefs => {
  const cur = new Set(p.ticks[p.preset]); if (cur.has(part)) cur.delete(part); else cur.add(part);
  return { ...p, ticks: { ...p.ticks, [p.preset]: presetById(p.preset).parts.map(x => x.id).filter(id => cur.has(id)) } };
};

// ---------- the page ----------
export interface PaperLine { qty: string; name: string; note: string; usd: number | null; sub?: boolean }
export interface PaperGroup { id: string; title: string; total: number | null; lines: PaperLine[] }
export interface Paper {
  kind: PresetId; title: string; sub: string;
  /** shopping list */ groups: PaperGroup[]; owned: PaperGroup | null; prices: boolean;
  totals: { toBuy: string; ownedCount: string; monthly: string; spread: string } | null;
  where: string[] | null; picture: boolean; /** the tank render as a data URL ('' = none) */ shot: string;
  /** setup sheet */ sheet: Sheet | null;
  /** full report: the report's own page markup (ui/report.ts reportHtml) with the unticked parts left out */ html: string | null;
  /** nothing ticked */ empty: boolean;
}
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Which shopping part a plan row belongs to (the plan's rows are named by what they are). */
export function partOfRow(label: string): 'tank' | 'substrate' | 'plants' | 'animals' | 'equipment' {
  if (/^(Tank\b|Stand\b|Cabinet|Kit\b|Starter kit|Bundle)/i.test(label)) return 'tank';
  if (/^(Substrate|Hardscape|Ground)/i.test(label)) return 'substrate';
  if (/^(Live plants|Artificial plants|Plants|Corals)/i.test(label)) return 'plants';
  if (/^Animals/i.test(label)) return 'animals';
  return 'equipment';
}
const GROUP_TITLE: Record<string, string> = { tank: 'Tank and stand', equipment: 'Equipment', substrate: 'Substrate and rock', plants: 'Plants', animals: 'Animals' };
/** Section of the setup sheet -> its part. */
const SHEET_PART = (t: string): string => t === 'Tank' ? 'tank' : t === 'Equipment' ? 'equipment' : t === 'Animals' ? 'animals' : t === 'Already have' ? 'owned'
  : t === 'Plants' || t === KINDS.coral || t === KINDS.artificial ? 'plants' : 'substrate';
/** What the setup sheet lists under each shopping group (the amounts: no price is made up for them). */
const DETAIL_OF: Record<string, string[]> = { substrate: ['Substrate', 'Hardscape'], plants: ['Plants'], animals: ['Animals'] };

export const filterSheet = (s: Sheet, ticks: ReadonlySet<string>): Sheet => ({ ...s, sections: s.sections.filter(x => ticks.has(SHEET_PART(x.title))) });
/** The report page without the parts that are not ticked. */
export function filterReportHtml(html: string, ticks: ReadonlySet<string>): string {
  return html.replace(/<section class="rp-sec[^"]*" data-rp="(\w+)">[\s\S]*?<\/section>/g, (m, id: string) => ticks.has(id) ? m : '');
}

export interface PaperInput { scene: Scene; active: number; profile: UserProfile; now?: number; bagL?: number; /** a data URL of the tank render, '' = none */ shot?: string }
/** The page for a preset and its ticks. */
export function paperOf(preset: PresetId, ticks: ReadonlySet<string>, inp: PaperInput): Paper {
  const { scene, active } = inp, S = scene.tanks[active] ?? scene.tanks[0], empty = ![...ticks].some(t => presetById(preset).parts.some(p => p.id === t));
  const base: Paper = { kind: preset, title: scene.name || 'Your tank', sub: '', groups: [], owned: null, prices: false, totals: null, where: null, picture: false, shot: '', sheet: null, html: null, empty };
  if (preset === 'report') {
    const r = reportOf(scene, active, inp.profile, inp.now);
    return { ...base, title: r.title, sub: `${r.kind} · ${r.gallons} gal · ${r.dims}`, html: filterReportHtml(reportHtml(r, ticks.has('picture') ? inp.shot ?? '' : ''), ticks) };
  }
  if (preset === 'setup') {
    const sheet = filterSheet(buildSheet(scene, active, { bagL: inp.bagL }), ticks);
    return { ...base, title: sheet.title, sub: `Setup sheet${scene.tanks.length > 1 ? ` · tank ${'AB'[active]}` : ''}`, sheet };
  }
  // shopping list: the report's lines (owned gear already moved apart at $0), sorted into parts
  const r = reportOf(scene, active, inp.profile, inp.now), detail = buildSheet({ ...scene, units: 'in' }, active);
  const rows = [...r.buyFirst, ...r.buyLater], by = new Map<string, PaperLine[]>();
  for (const row of rows) {
    const part = partOfRow(row.label); if (!ticks.has(part)) continue;
    const L = by.get(part) ?? []; by.set(part, L);
    L.push({ qty: '1', name: row.label, note: row.note ?? '', usd: row.usd });
    for (const t of DETAIL_OF[part] ?? []) {
      // only the group's own line gets its amounts (the Hardscape row, the Plants row, ...): the sheet's rows, with no price of their own
      if (part === 'substrate' && !(t === 'Hardscape' ? /^Hardscape/i.test(row.label) : /^Substrate/i.test(row.label))) continue;
      const sec = detail.sections.find(x => x.title === t);
      for (const d of sec?.rows ?? []) if (d.item !== 'None' && d.item !== 'Total') L.push({ qty: d.qty, name: d.item, note: d.detail.replace(' (assumed, change it above)', ' (assumed)'), usd: null, sub: true });
    }
  }
  const groups = ['tank', 'equipment', 'substrate', 'plants', 'animals'].filter(id => by.has(id)).map(id => {
    const lines = by.get(id)!; return { id, title: GROUP_TITLE[id], total: lines.reduce((t, l) => t + (l.usd ?? 0), 0), lines };
  });
  const owned: PaperGroup | null = ticks.has('owned') ? { id: 'owned', title: 'Already owned', total: 0, lines: r.have.map(h => ({ qty: '1', name: h.label, note: h.note && h.note !== 'you have' ? h.note : '', usd: 0 })) } : null;
  const toBuy = groups.reduce((t, g) => t + (g.total ?? 0), 0);
  const prices = ticks.has('prices');
  const where = ticks.has('where') ? planOf(S, undefined, inp.now, 'in').deals.map(d => d.text) : null;
  return {
    ...base, title: 'Shopping list', sub: `${r.title} · ${r.kind} · ${r.gallons} gal, ${r.dims}`, groups, owned, prices, where, picture: ticks.has('picture'), shot: ticks.has('picture') ? inp.shot ?? '' : '',
    totals: prices ? { toBuy: usd(toBuy), ownedCount: `${r.have.length} item${r.have.length === 1 ? '' : 's'}`, monthly: `${usd(r.tiers.ideal.upkeepUsdMo)}/mo`, spread: r.spreadUsd ? `Prices vary between stores: the set-up cost in the Cost check adds about ${usd(r.spreadUsd)} to these listed prices.` : '' } : null,
  };
}
export const shoppingTotal = (p: Paper) => p.groups.reduce((t, g) => t + (g.total ?? 0), 0);

// ---------- .txt and .csv ----------
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const allGroups = (p: Paper) => [...p.groups, ...(p.owned ? [p.owned] : [])];
export function paperText(p: Paper): string {
  if (p.kind === 'setup' && p.sheet) return sheetText(p.sheet);
  if (p.kind === 'report') return reportText(p);
  const out = [p.title, '='.repeat(Math.max(8, p.title.length)), p.sub, ''];
  for (const g of allGroups(p)) {
    out.push(`${g.title.toUpperCase()}${p.prices && g.id !== 'owned' ? `  ${usd(g.total ?? 0)}` : ''}`);
    for (const l of g.lines) out.push(`  ${l.sub ? '  ' : ''}${l.qty ? l.qty + ' x ' : ''}${l.name}${l.note ? ` (${l.note})` : ''}${p.prices && l.usd !== null && !l.sub ? `  ${usd(l.usd)}` : ''}`);
    out.push('');
  }
  if (p.totals) out.push(`To buy: ${p.totals.toBuy}`, `Already owned (not counted): ${p.totals.ownedCount}`, `Monthly upkeep: ${p.totals.monthly}`, ...(p.totals.spread ? ['', p.totals.spread] : []));
  if (p.where) out.push('', 'WHERE TO BUY', ...(p.where.length ? p.where.map(w => `  ${w}`) : ['  No sales tracked for these items right now.']));
  return out.join('\n') + '\n';
}
export function paperCsv(p: Paper): string {
  if (p.kind === 'setup' && p.sheet) return sheetCsv(p.sheet);
  if (p.kind === 'report') return reportCsv(p);
  const head = ['Group', 'Qty', 'Item', 'Note', ...(p.prices ? ['Price'] : [])];
  return [head.join(','), ...allGroups(p).flatMap(g => g.lines.map(l => [g.title, l.qty, l.name, l.note, ...(p.prices ? [l.usd === null ? '' : String(l.usd)] : [])].map(q).join(',')))].join('\r\n') + '\r\n';
}
/** The report as plain text: the page's visible text, section by section. */
function reportText(p: Paper): string {
  const html = p.html ?? '';
  const t = html.replace(/<h1>/g, '\n').replace(/<h2>/g, '\n\n').replace(/<\/(h1|h2|h3|p|tr|li)>/g, '\n').replace(/<\/t[dh]>/g, '  ').replace(/<br\s*\/?>/g, '\n').replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return `${p.title}\n${p.sub}\n${t.trim()}\n`;
}
function reportCsv(p: Paper): string {
  const rows: string[][] = [['Section', 'Line']]; let sec = '';
  for (const m of (p.html ?? '').matchAll(/<h2>([^<]*)<\/h2>|<tr[^>]*>([\s\S]*?)<\/tr>|<li[^>]*>([\s\S]*?)<\/li>/g)) {
    if (m[1] !== undefined) { sec = m[1]; continue; }
    const cells = [...(m[2] ?? m[3] ?? '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => c[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
    rows.push([sec, (cells.length ? cells : [(m[3] ?? '').replace(/<[^>]+>/g, '').trim()]).join(' | ')]);
  }
  return rows.map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
}
export const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank';
export const fileName = (sceneName: string, preset: PresetId, ext: 'txt' | 'csv') => `${slug(sceneName)}-${presetById(preset).file}.${ext}`;
