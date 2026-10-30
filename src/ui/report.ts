// The printable report (lane GV3, Guided v2, 2026-10-30): one paper-white US Letter page over the app, the end of Guided and the menu's Report
// button. Nathan: "the quick rundown, a picture of the tank, existing equipment, shopping list, expected costs, plant/coral list, etc. Also include
// any basic warnings or cautions." Everything comes from the existing sheets' data (scene/plan.ts, scene/setupsheet.ts, ui/stockSummary.ts,
// demand/tiers.ts); nothing is re-priced here. Always US units. Print uses the browser's print dialog ("Save as PDF" is in it).
import { planNeeds } from './planSheet';
import { planOf, type PlanRow } from '../scene/plan';
import { buildSheet } from '../scene/setupsheet';
import { ownedGearLines } from '../scene/ownedGear';
import { volume, IN } from '../scene/physics';
import { SETUP_KINDS, tankKind } from '../scene/pickerKind';
import { valueOf } from '../scene/brief';
import { getSpecies } from '../data/species';
import { costTiers, type CostTiers } from '../demand/tiers';
import type { UserProfile } from '../demand/types';
import type { Scene } from '../scene/types';
import type { Store } from '../scene/store';
import { summaryOf } from './stockSummary';
import { difficultyOf, type Difficulty } from './stockPlanLogic';
import { OWNED_CHOICES } from './setupBrief';
import { loadProfile } from './demandPanel';

export interface ReportLine { label: string; usd: number; note?: string }
export interface ReportLiving { title: string; rows: { name: string; n: string; detail: string }[] }
export type WarnLevel = 'problem' | 'caution' | 'unknown';
export interface Report {
  title: string; kind: string; gallons: number; dims: string;
  animals: { name: string; n: number }[]; difficulty?: Difficulty; minPerWeek: number;
  /** owned gear, $0 "you have" */ have: ReportLine[];
  /** the build plan's order: everything before the animals, then the animals (after the tank has cycled) */ buyFirst: ReportLine[]; buyLater: ReportLine[];
  /** what the engine's set-up total adds to the listed prices for prices varying between stores (demand FACTORS.priceLevel) */ spreadUsd: number;
  /** minimum viable vs ideal (demand/tiers.ts), less what the brief says is owned but the scene still prices */ tiers: CostTiers;
  living: ReportLiving[];
  /** problem = animal welfare (red, never a tradeoff), caution = check it, unknown = no data to check */ warnings: { level: WarnLevel; text: string }[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** The report's numbers for the scene's active tank (pure: the profile and the clock are passed in). */
export function reportOf(scene: Scene, active: number, P: UserProfile, now = Date.now()): Report {
  const S = scene.tanks[active] ?? scene.tanks[0], plan = planOf(S, undefined, now, 'in');
  const tiers = costTiers(S, P), ideal = { ...tiers.ideal }, minimum = { ...tiers.minimum };
  // owned per the brief (Guided's "What you have", Suggest): a row the scene still prices moves to "you have" at $0, and out of the totals
  const briefOwned = S.brief ? [...Object.keys(valueOf(S.brief, 'constraints.owned') ?? {}), ...(valueOf(S.brief, 'constraints.existingTank') ? ['tank'] : [])] : [];
  const choices = [{ id: 'tank', label: 'Tank' }, ...OWNED_CHOICES].filter(o => briefOwned.includes(o.id));
  const ownedLabel = (row: PlanRow) => choices.find(o => row.item.toLowerCase().startsWith(o.label.toLowerCase()));
  const have: ReportLine[] = ownedGearLines(S).map(l => ({ label: l.label, usd: 0, note: l.note }));
  const buyFirst: ReportLine[] = [], buyLater: ReportLine[] = [];
  for (const row of plan.rows) {
    const own = ownedLabel(row);
    if (own) {
      have.push({ label: row.item, usd: 0, note: 'you have' });
      ideal.setupUsd = Math.max(0, ideal.setupUsd - row.usd);
      if (own.id !== 'stand') minimum.setupUsd = Math.max(0, minimum.setupUsd - row.usd); // the minimum has no stand in it
      continue;
    }
    (row.item === 'Animals' ? buyLater : buyFirst).push({ label: row.item, usd: row.usd, ...(row.kind === 'extra' ? { note: 'not needed' } : {}) });
  }
  for (const o of choices) if (!have.some(h => h.label.toLowerCase().startsWith(o.label.toLowerCase()))) have.push({ label: o.label, usd: 0, note: 'you have' });
  minimum.setupUsd = Math.min(minimum.setupUsd, ideal.setupUsd);

  const counts = new Map<string, number>();
  for (const f of S.fish) counts.set(f.species, (counts.get(f.species) ?? 0) + 1);
  const animals = [...counts].map(([id, n]) => ({ name: getSpecies(id)?.name ?? id, n }));
  const difficulty = difficultyOf([...counts].map(([id, n]) => ({ id, n })));

  const sheet = buildSheet({ ...scene, units: 'in' }, active), salt = S.water.on && !!S.water.salt;
  const living: ReportLiving[] = sheet.sections.filter(x => x.title === 'Plants' || x.title === 'Corals' || x.title === 'Artificial plants')
    .map(x => ({ title: x.title, rows: x.rows.filter(r => r.item !== 'None').map(r => ({ name: r.item, n: r.qty, detail: r.detail })) }));
  if (salt && !living.some(l => l.title === 'Corals')) living.push({ title: 'Corals', rows: [] });

  const warnings: Report['warnings'] = [], seen = new Set<string>();
  const warn = (level: WarnLevel, text: string) => { if (!seen.has(text)) { seen.add(text); warnings.push({ level, text }); } };
  for (const m of plan.missing) warn('problem', m);
  for (const c of summaryOf(S, 'in').cats) for (const it of c.items) warn(it.level, `${c.label}: ${it.text}`);
  for (const n of planNeeds(S)) warn(n.severity === 'S3' ? 'problem' : 'caution', n.text);
  const rank: Record<WarnLevel, number> = { problem: 0, caution: 1, unknown: 2 };
  warnings.sort((a, b) => rank[a.level] - rank[b.level]);

  const T = S.tank;
  return {
    title: scene.name || 'Your tank', kind: SETUP_KINDS.find(k => k[0] === tankKind(S))?.[1] ?? 'Aquarium',
    gallons: Math.round(volume(T).gallons), dims: `${r1(T.L / IN)} x ${r1(T.D / IN)} x ${r1(T.H / IN)} in`,
    animals, ...(difficulty ? { difficulty } : {}), minPerWeek: plan.minPerWeek,
    have, buyFirst, buyLater, spreadUsd: Math.max(0, plan.setupUsd - plan.rows.reduce((t, x) => t + x.usd, 0)), tiers: { minimum, ideal }, living, warnings,
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const none = (what: string) => `<p class="rp-none">${esc(what)}</p>`;
const lines = (l: ReportLine[], empty: string) => l.length ? `<table class="rp-lines">${l.map(x =>
  `<tr><th scope="row">${esc(x.label)}${x.note && x.note !== 'you have' ? ` <em>(${esc(x.note)})</em>` : ''}</th><td class="q">${x.usd ? usd(x.usd) : '$0 you have'}</td></tr>`).join('')}</table>` : none(empty);
const sum = (l: ReportLine[]) => l.reduce((t, x) => t + x.usd, 0);
const WORD: Record<WarnLevel, string> = { problem: 'Problem', caution: 'Caution', unknown: 'Check' };

/** The report page. `shot` is a data URL of the tank render ('' = no picture: WebGL off or nothing drawn). */
export function reportHtml(r: Report, shot = ''): string {
  const { minimum: lo, ideal: hi } = r.tiers;
  return `<header class="rp-head"><h1>${esc(r.title)}</h1><p class="sheetSub">${esc(r.kind)} · ${r.gallons} gal · ${esc(r.dims)}</p></header>
<section class="rp-sec rp-rundown" data-rp="rundown"><h2>Quick rundown</h2><table>
<tr><th scope="row">Tank</th><td>${r.gallons} gal, ${esc(r.dims)} (L x W x H)</td></tr>
<tr><th scope="row">Kind</th><td>${esc(r.kind)}</td></tr>
<tr><th scope="row">Animals</th><td>${r.animals.length ? esc(r.animals.map(a => `${a.n} ${a.name}`).join(', ')) : 'None yet'}</td></tr>
<tr><th scope="row">Difficulty</th><td>${r.difficulty ? `<b>${esc(r.difficulty.word)}</b>: ${esc(r.difficulty.why)}` : 'No animals yet'}</td></tr>
<tr><th scope="row">Your time</th><td>about ${r.minPerWeek} min a week, once it is running</td></tr></table></section>
<section class="rp-sec rp-pic" data-rp="picture"><h2>The tank</h2>${shot ? `<figure class="rp-shot"><img src="${shot}" alt="The tank from the front"></figure>` : none('No picture: the 3D view is off in this browser.')}</section>
<section class="rp-sec" data-rp="have"><h2>Equipment you have</h2>${lines(r.have, 'None: everything is on the shopping list.')}</section>
<section class="rp-sec" data-rp="shopping"><h2>Shopping list</h2>
<h3>Buy first (before any animal): ${usd(sum(r.buyFirst))}</h3>${lines(r.buyFirst, 'None.')}
<h3>Buy last (after the tank has cycled): ${usd(sum(r.buyLater))}</h3>${lines(r.buyLater, 'None: no animals yet.')}${r.spreadUsd ? `<p class="sheetNote">The costs below add about ${usd(r.spreadUsd)} to these listed prices: prices vary between stores.</p>` : ''}</section>
<section class="rp-sec" data-rp="costs"><h2>Expected costs</h2><table class="rp-costs"><tr><td></td><th scope="col">Minimum viable</th><th scope="col">Ideal</th></tr>
<tr><th scope="row">Set-up</th><td class="q">${usd(lo.setupUsd)}</td><td class="q">${usd(hi.setupUsd)}</td></tr>
<tr><th scope="row">Each month</th><td class="q">${usd(lo.upkeepUsdMo)}</td><td class="q">${usd(hi.upkeepUsdMo)}</td></tr>
<tr><th scope="row">Your time</th><td class="q">${Math.round(lo.minPerWeek)} min/wk</td><td class="q">${Math.round(hi.minPerWeek)} min/wk</td></tr></table>
<p class="sheetNote">Minimum viable: what the animals need to live well (tank, filter, heat, light, water care, the animals). Ideal: the full build as designed.</p></section>
<section class="rp-sec" data-rp="living"><h2>Plants and corals</h2>${r.living.map(l => `<h3>${esc(l.title)}</h3>${l.rows.length ? `<table class="rp-lines">${l.rows.map(x =>
  `<tr><th scope="row">${esc(x.name)}</th><td class="q">${esc(x.n)}</td><td>${esc(x.detail)}</td></tr>`).join('')}</table>` : none('None.')}`).join('') || none('None.')}</section>
<section class="rp-sec" data-rp="warnings"><h2>Warnings and cautions</h2>${r.warnings.length ? `<ul class="rp-warn">${r.warnings.map(w =>
  `<li class="rp-${w.level}"><b>${WORD[w.level]}</b> ${esc(w.text)}</li>`).join('')}</ul>${r.warnings.some(w => w.level === 'problem') ? '<p class="rp-welfare">Red items are animal-welfare problems: not a valid tradeoff. Fix them before the animals come home.</p>' : ''}` : none('None: nothing to warn about.')}</section>
<p class="sheetNote">Prices are expected costs from the listings TankLook tracks; limits come from its stocking model (good to about a factor of two, not a promise). Not advice from a vet or a shop.</p>`;
}

let bound: { store: Store; shot: () => string } | undefined;
/** Main wires the store and the renderer's picture hook (render/viewer.ts reportShot) once; a button, if given, opens the report. */
export function attachReport(store: Store, viewer: { reportShot(w?: number): string }, button?: HTMLElement | null) {
  bound = { store, shot: () => { try { return viewer.reportShot(); } catch { return ''; } } };
  button?.addEventListener('click', () => openReport());
}

/** Open the report over the app (the end of Guided, the menu). */
export function openReport() {
  if (!bound) return;
  const { store } = bound, shot = bound.shot(); // drawn before the page covers the view
  const under = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]; // Guided's dialog would sit above the page: set aside, back on Close
  for (const d of under) d.close();
  document.getElementById('sheetView')?.remove();
  const host = document.createElement('div');
  host.id = 'sheetView'; host.dataset.kind = 'report';
  host.innerHTML = `<div class="sheetBar"><b>Report</b><span class="sp"></span><button id="rpPrint" title="Print, or Save as PDF from the print dialog">Print / PDF</button><button id="rpClose">Close</button></div><div class="sheetPage rp-page" role="document">${reportHtml(reportOf(store.scene, store.scene.active, loadProfile()), shot)}</div>`;
  document.body.append(host); document.body.classList.add('sheet-open');
  const close = () => { host.remove(); document.body.classList.remove('sheet-open'); document.removeEventListener('keydown', onKey); for (const d of under) if (d.isConnected && !d.open) d.showModal(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  host.querySelector<HTMLElement>('#rpClose')!.onclick = close;
  host.querySelector<HTMLElement>('#rpPrint')!.onclick = () => window.print();
}
