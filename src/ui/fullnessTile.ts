// Fullness tile (lane P3, path 1, Nathan 2026-10-20): a minimizable tile on the viewer with the stocking engine's two
// limits as bars, space and filtration (scene/stocking.ts stockingOf; the sidebar stocking line stays), live as animals
// are added; hovering (or tapping) a bar lists who fills it most. "Set my space" records the area the owner has
// (layout.space, scene/space.ts), drawn in the viewer as a dashed outline (render/spaceOutline.ts); an edit that takes
// the tank past it calls the fork card hook (`onSpaceFork`: make room / swap; the card itself is lane P5's).
// The tile follows the view: hidden while the Animals Show box is off, faded with the rest while another menu is in focus.
import type { Viewer } from '../render/viewer';
import { defaultSpace, spaceFit, tankExtent, SPACE_MAX, SPACE_MIN, type SpaceFit } from '../scene/space';
import { stockingMemo, type Stocking } from '../scene/stocking';
import { tankMinimum, type MinRow, type TankMinimum } from '../scene/tankMin';
import { PLANT_SHARE_MAX, type Nitrogen } from '../scene/nitrogen';
import type { Store } from '../scene/store';
import type { SpaceLimit, TankSetup, Units } from '../scene/types';

/** A bar at or over this reads "near full" (amber); over 100 is over (red). */
export const NEAR_FULL = 85;
export type Level = 'ok' | 'near' | 'over';
export interface Bar { pct: number; /** fill width, 0..100 */ fill: number; level: Level; text: string }
export interface TopRow { name: string; n: number; /** share of this bar's load, 0..1 */ share: number; /** printed in place of the share (the minimum bar: what the species wants) */ note?: string }
export interface TileState {
  /** anything to show: water on, and animals in it or a space set */
  show: boolean;
  space: Bar; filt: Bar; /** tank size against the most demanding species' minimum (scene/tankMin.ts) */ min: Bar;
  topSpace: TopRow[]; topFilt: TopRow[]; topMin: TopRow[];
  /** the larger of the two, for the minimized pill */
  head: Bar;
  reason: string;
  limit?: SpaceLimit; fit?: SpaceFit;
}

export function bar(pct: number): Bar {
  const p = Number.isFinite(pct) ? Math.max(0, pct) : Infinity, r = p === Infinity ? 'over 999' : String(Math.round(p));
  return { pct: p, fill: Math.min(100, p), level: p > 100 ? 'over' : p >= NEAR_FULL ? 'near' : 'ok', text: `${r}%` };
}

/** The k animals that fill a bar most: by space or by waste load, with their share of it. */
export function topBy(r: Stocking, by: 'space' | 'load', k = 3): TopRow[] {
  const tot = r.contributors.reduce((s, c) => s + c[by], 0);
  return [...r.contributors].sort((a, b) => b[by] - a[by]).slice(0, k).map(c => ({ name: c.name, n: c.n, share: tot ? c[by] / tot : 0 }));
}

/** The species that want the biggest tank, each with the litres and length it asks for (the percent is the bar's own). */
export function topMin(m: TankMinimum, units: Units, k = 3): TopRow[] {
  const sq = (cm2: number) => units === 'in' ? `${Math.round(cm2 / 6.4516)} sq in` : `${Math.round(cm2)} cm²`, len = (mm: number) => `${toUnits(mm, units)}${units === 'in' ? '"' : ' cm'} long`;
  const one = (x: MinRow, l: number, mm: number, cm2: number) => [l > 0 && `${l} L`, x.kind === 'area' ? cm2 > 0 && `${sq(cm2)} of floor` : mm > 0 && len(mm)].filter(Boolean).join(', ');
  return [...m.rows].sort((a, b) => b.comfortPct - a.comfortPct).filter(x => x.comfortL > 0 || x.comfortLengthMm > 0).slice(0, k).map(x => ({ name: x.name, n: x.n, share: 0,
    note: x.floorL < x.comfortL || x.floorLengthMm < x.comfortLengthMm ? `at least ${one(x, x.floorL, x.floorLengthMm, x.floorCm2)}; happier at ${one(x, x.comfortL, x.comfortLengthMm, x.comfortCm2)}` : one(x, x.comfortL, x.comfortLengthMm, x.comfortCm2) }));
}

/** Red below the absolute floor, amber while under the comfortable size, green past it; the fill is the floor's percent. */
const minBar = (m: TankMinimum): Bar => { const b = bar(m.percent); return b.level !== 'over' && m.comfortPercent > 100 ? { ...b, level: 'near' } : b; };

export function tileState(S: TankSetup, r: Stocking, units: Units = 'cm'): TileState {
  const m = tankMinimum(S), limit = S.layout.space, fit = limit ? spaceFit(S.tank, limit) : undefined;
  return {
    show: S.water.on && (r.contributors.length > 0 || !!limit),
    space: bar(r.spacePercent), filt: bar(r.filtrationPercent), min: minBar(m), head: bar(Math.max(r.percent, m.percent)),
    topSpace: topBy(r, 'space'), topFilt: topBy(r, 'load'), topMin: topMin(m, units), reason: m.percent > 100 ? `Too small for the ${m.rows[0].name.toLowerCase()}, however few you keep: it needs ${topMin(m, units, 1)[0].note}.`
      : m.comfortPercent > 100 ? `Workable, but cramped for the ${[...m.rows].sort((a, b) => b.comfortPct - a.comfortPct)[0].name.toLowerCase()}: ${topMin(m, units, 1)[0].note}.` : r.reasons[0] ?? '',
    ...(limit ? { limit, fit } : {}),
  };
}

/** mg a day, as the breakdown prints it: one decimal under 10. */
export const mg = (g: number) => { const m = g * 1000; return `${m < 10 ? m.toFixed(1) : Math.round(m)} mg`; };
export interface NRow { label: string; value: string; note?: string }
/** Where the day's ammonia goes (the nitrogen budget behind the filtration bar), for the expanded tile. */
export function nitrogenRows(n: Nitrogen): NRow[] {
  const rows: NRow[] = [
    { label: 'Animals make', value: mg(n.tan), note: `on ${n.feeding} feeding` },
    { label: 'Plants take', value: mg(n.byPlants), note: !n.plants.count ? 'no live plants'
      : `of about ${mg(n.plants.gN)} they can`
        + (n.byPlants >= n.tan * PLANT_SHARE_MAX - 1e-9 ? `; held to ${Math.round(PLANT_SHARE_MAX * 100)}% of the animals' ammonia, the filter keeps the rest for nights and feeding peaks` : '')
        + (n.plants.rootCount ? `. ${n.plants.rootCount} root feeder${n.plants.rootCount > 1 ? 's' : ''} counted at half: they feed from the substrate` : '') },
    { label: 'Filter bacteria', value: mg(n.byBacteria), note: `of about ${mg(n.filterG)} they can; the bar is full at ${mg(n.safeG)} (${n.filter.label})` },
  ];
  if (n.unprocessed > 0) rows.push({ label: 'Left in the water', value: mg(n.unprocessed), note: 'ammonia builds up' });
  if (n.fert.gN > 0) rows.push({ label: 'Fertilizer adds', value: `${mg(n.fert.gN)} N`, note: `as nitrate; plants use ${mg(n.fert.toPlants)}`
    + (n.fert.toNitrate > 1e-6 ? `, ${mg(n.fert.toNitrate)} is left to change out${n.fert.option === 'ei' ? ' (the big weekly EI change does that)' : ''}` : '') });
  if (n.plants.gN > 0) rows.push(n.fishCoverPlants
    ? { label: 'Plant nitrogen', value: 'from the animals', note: 'their waste covers what the plants take: a fertilizer without nitrogen (potassium, iron, trace) is enough' }
    : n.plantRoom > 1e-6 ? { label: 'Plants could use', value: `${mg(n.plantRoom)} more`, note: 'nitrogen a day beyond what the animals and fertilizer give: more animals or a fertilizer with nitrogen' }
    : { label: 'Plant nitrogen', value: 'animals + fertilizer', note: 'the fertilizer makes up what the animals do not give' });
  rows.push({ label: 'Nitrate', value: n.waterChangePct >= 1 ? `${Math.round(n.waterChangePct)}% a week` : 'plants take it', note: n.waterChangePct >= 1 ? 'water change to hold about 40 ppm' : undefined });
  return rows;
}

/** The fork card is due when an edit takes the tank from inside the space to past it (not every frame it stays past). */
export const forkDue = (was: boolean | undefined, fits: boolean | undefined) => was === true && fits === false;

/** mm in the scene's units, as typed in the fields: whole cm, or inches to a tenth. */
export const toUnits = (mm: number, u: Units) => u === 'in' ? Math.round(mm / 25.4 * 10) / 10 : Math.round(mm / 10);
export const fromUnits = (v: number, u: Units) => Math.round(u === 'in' ? v * 25.4 : v * 10);
const fmt = (mm: number, u: Units) => `${toUnits(mm, u)}${u === 'in' ? '"' : ' cm'}`;
const fmtBox = (w: number, d: number, u: Units) => `${toUnits(w, u)} × ${toUnits(d, u)}${u === 'in' ? ' in' : ' cm'}`;

/** One line on what goes past the space: "14 cm too long and 5 cm too deep for your space." */
export function overLine(f: SpaceFit, u: Units): string {
  const p = [f.over.w && `${fmt(f.over.w, u)} too long`, f.over.d && `${fmt(f.over.d, u)} too deep`, f.over.h && `${fmt(f.over.h, u)} too tall`].filter(Boolean) as string[];
  return p.length ? `${p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0]} for your space.`.replace(/^./, c => c.toUpperCase()) : '';
}

/** What the fork card gets: the tank, the space, how far past it, and the stocking that asked for the tank. */
export interface SpaceFork { setup: TankSetup; limit: SpaceLimit; fit: SpaceFit; stocking: Stocking }
type ForkFn = (f: SpaceFork) => void;
let forkFn: ForkFn | null = null;
/** Lane P5's fork card registers here; returns the unregister. While none is registered the tile only says it is too big. */
export function onSpaceFork(fn: ForkFn) { forkFn = fn; return () => { if (forkFn === fn) forkFn = null; }; }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const plural = (n: number, name: string) => n === 1 ? `1 ${name}` : `${n} ${name}${/(s|ish|ox)$/i.test(name) ? '' : 's'}`;
const MIN_KEY = 'tanklook.ftMin', N_KEY = 'tanklook.ftN';

export function attachFullnessTile(viewer: Viewer, store: Store) {
  const host = document.getElementById('view')!, tools = host.querySelector('.viewtools'); // top-left, under the view's buttons (the demand panel holds the top right)
  const el = document.createElement('section');
  el.className = 'ft'; el.hidden = true; el.setAttribute('aria-label', 'How full the tank is');
  el.innerHTML = `<button class="ftHead" type="button" aria-expanded="true" title="Minimize the fullness tile"><span class="ftTitle">Fullness</span><span class="ftPill"></span><span class="ftChev" aria-hidden="true">▾</span></button>
<div class="ftBody"><div class="ftBars"></div><details class="ftN"><summary>Where the ammonia goes, per day</summary><div class="ftNBody"></div></details><div class="ftSpace"></div>
<form class="ftForm" hidden><div class="ftFields">
<label>Width <input name="w" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Depth <input name="d" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Height <input name="h" type="number" inputmode="decimal" min="1" step="any" placeholder="any"></label>
<span class="ftU"></span></div>
<div class="ftBtns"><button type="submit" class="primary">Done</button><button type="button" class="ftClear">Remove my space</button></div></form></div>`;
  host.append(el);
  // the button row wraps on a narrow view: the tile starts below its last row
  const place = () => { const v = host.getBoundingClientRect(), t = tools?.getBoundingClientRect(); el.style.top = `${t && t.height ? Math.round(t.bottom - v.top + 8) : 10}px`; };
  if (tools) new ResizeObserver(place).observe(tools);
  place();
  const $ = <T extends Element>(s: string) => el.querySelector(s) as T;
  const head = $<HTMLButtonElement>('.ftHead'), pill = $<HTMLElement>('.ftPill'), bars = $<HTMLElement>('.ftBars'), spaceEl = $<HTMLElement>('.ftSpace');
  const nEl = $<HTMLDetailsElement>('.ftN'), nBody = $<HTMLElement>('.ftNBody');
  try { nEl.open = localStorage.getItem(N_KEY) === '1'; } catch { /* storage blocked */ }
  nEl.ontoggle = () => { try { localStorage.setItem(N_KEY, nEl.open ? '1' : '0'); } catch { /* ignore */ } };
  const form = $<HTMLFormElement>('.ftForm'), inp = (n: string) => form.elements.namedItem(n) as HTMLInputElement;

  let min = matchMedia('(max-width: 700px)').matches; // a phone's view is short: minimized until opened once
  try { const v = localStorage.getItem(MIN_KEY); if (v) min = v === '1'; } catch { /* storage blocked */ }
  const setMin = (m: boolean, save = true) => {
    min = m; el.classList.toggle('min', m); head.setAttribute('aria-expanded', String(!m)); head.title = m ? 'Show the fullness tile' : 'Minimize the fullness tile';
    if (save) try { localStorage.setItem(MIN_KEY, m ? '1' : '0'); } catch { /* ignore */ }
  };
  setMin(min, false);
  head.onclick = () => setMin(!min);

  const row = (key: string, label: string, b: Bar, top: TopRow[], what: string, hd = `Most of the ${what}:`) =>
    `<div class="ftRow ft-${b.level}" tabindex="0" data-row="${key}"><div class="ftLab"><span>${label}</span><b>${b.text}</b></div>`
    + `<div class="ftTrack" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(b.pct, 999))}"><i style="width:${b.fill}%"></i></div>`
    + `<div class="ftTop">${top.length ? `<div class="ftTopHd">${hd}</div>` + top.map(t => `<div>${esc(plural(t.n, t.name))} <b>${t.note ? esc(t.note) : `${Math.round(t.share * 100)}%`}</b></div>`).join('') : '<div>No animals in the water yet.</div>'}</div></div>`;

  let lastSig = '', editing = false;
  const fitWas = new Map<number, boolean>(); // per tank: did it fit the space after the last edit

  const render = () => {
    const S = store.tank, r = stockingMemo(S), u = store.scene.units, st = tileState(S, r, u);
    const animalsHidden = viewer.hidden.has('fish');
    el.hidden = !st.show || animalsHidden;
    const sig = JSON.stringify([st, u, editing, !!forkFn, tankExtent(S.tank)]);
    if (sig === lastSig) return;
    lastSig = sig;
    el.classList.toggle('over', st.head.level === 'over' || st.fit?.fits === false);
    pill.textContent = st.fit?.fits === false ? `${st.head.text} · too big` : st.head.text;
    pill.className = `ftPill ft-${st.fit?.fits === false ? 'over' : st.head.level}`;
    bars.innerHTML = row('space', 'Space', st.space, st.topSpace, 'space') + row('filt', 'Filtration', st.filt, st.topFilt, 'waste')
      + row('min', 'Tank minimum', st.min, st.topMin, 'minimum', 'Smallest tank they want, whatever the count:')
      + (st.reason ? `<div class="ftWhy">${esc(st.reason)}</div>` : '');
    const n = r.nitrogen;
    nEl.hidden = !r.contributors.length || n.tan <= 0;
    if (!nEl.hidden) {
      const seg = (cls: string, g: number) => g > 0 ? `<i class="${cls}" style="width:${g / n.tan * 100}%"></i>` : '';
      nBody.innerHTML = `<div class="ftNSplit" aria-hidden="true">${seg('p', n.byPlants)}${seg('b', n.byBacteria)}${seg('u', n.unprocessed)}</div>`
        + nitrogenRows(n).map(x => `<div class="ftNRow"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>${x.note ? `<div class="ftNNote">${esc(x.note)}</div>` : ''}`).join('')
        + `<div class="ftNNote ftNCaveat">Rough figures: animals ±40 %, plant and bacteria rates from few studies.</div>`;
    }
    const e = tankExtent(S.tank);
    spaceEl.innerHTML = editing ? `<div class="ftHint">The dashed outline in the view is your space; the tank's back sits on its back edge.</div>`
      : !st.limit ? `<button type="button" class="ftSet" title="Enter the area you have for the tank; it is drawn as a dashed outline">Set my space</button>`
      : `<div class="ftMine ${st.fit!.fits ? 'ok' : 'bad'}"><span>Your space ${fmtBox(st.limit.w, st.limit.d, u)}${st.limit.h ? `, ${fmt(st.limit.h, u)} high` : ''} · tank ${fmtBox(e.w, e.d, u)}</span><button type="button" class="ftSet ftEdit">Edit</button></div>`
        + (st.fit!.fits ? '' : `<div class="ftOver">${esc(overLine(st.fit!, u))}${forkFn ? ' <button type="button" class="ftFork">Make room or swap…</button>' : ''}</div>`);
  };

  const fork = () => {
    const S = store.tank, limit = S.layout.space; if (!limit || !forkFn) return;
    const f = forkFn; queueMicrotask(() => f({ setup: S, limit, fit: spaceFit(S.tank, limit), stocking: stockingMemo(S) })); // after this change's listeners
  };
  const openForm = () => {
    const S = store.tank, s = S.layout.space ?? defaultSpace(S.tank, store.scene.units), u = store.scene.units;
    inp('w').value = String(toUnits(s.w, u)); inp('d').value = String(toUnits(s.d, u)); inp('h').value = s.h ? String(toUnits(s.h, u)) : '';
    $<HTMLElement>('.ftU').textContent = u === 'in' ? 'inches' : 'cm';
    editing = true; form.hidden = false;
    if (!S.layout.space) writeSpace(); // the outline shows at once, from the starting size
    inp('w').focus(); inp('w').select();
  };
  const closeForm = () => { editing = false; form.hidden = true; lastSig = ''; render(); };
  /** The fields to layout.space, clamped; one undo step per editing session (coalesced). */
  const writeSpace = () => {
    const u = store.scene.units, mm = (n: string) => { const v = parseFloat(inp(n).value); return Number.isFinite(v) && v > 0 ? Math.min(SPACE_MAX, Math.max(SPACE_MIN, fromUnits(v, u))) : 0; };
    const w = mm('w'), d = mm('d'), h = mm('h'); if (!w || !d) return;
    const i = store.scene.active;
    store.update(s => { s.tanks[i].layout.space = { w, d, ...(h ? { h } : {}) }; }, { coalesce: 'ftSpace' });
  };
  form.oninput = writeSpace;
  form.onsubmit = ev => { ev.preventDefault(); writeSpace(); store.seal(); closeForm(); const S = store.tank; if (S.layout.space && !spaceFit(S.tank, S.layout.space).fits) fork(); }; // a space smaller than the tank: the fork card at once
  form.onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); store.seal(); closeForm(); } };
  $<HTMLButtonElement>('.ftClear').onclick = () => {
    const i = store.scene.active; store.seal();
    store.update(s => { delete s.tanks[i].layout.space; }); closeForm();
  };
  spaceEl.onclick = ev => {
    const t = ev.target as HTMLElement;
    if (t.closest('.ftSet')) openForm(); else if (t.closest('.ftFork')) fork();
  };
  // touch: a tap on a bar shows / hides who fills it (hover does it with a mouse)
  bars.onclick = ev => { const r = (ev.target as HTMLElement).closest('.ftRow'); if (r) r.classList.toggle('open'); };

  store.subscribe(kind => {
    if (kind === 'load') { fitWas.clear(); if (editing) closeForm(); }
    const S = store.tank, i = store.scene.active, fits = S.layout.space ? spaceFit(S.tank, S.layout.space).fits : undefined;
    if (kind === 'scene' && !editing && forkDue(fitWas.get(i), fits)) fork(); // an edit took the tank past the space
    if (fits === undefined) fitWas.delete(i); else fitWas.set(i, fits);
    render();
  });
  // the Show boxes and the menu focus live on the viewer: follow them after each frame (class / hidden flips only)
  viewer.onDrawn(() => {
    const mf = document.getElementById('app')?.classList.contains('collapsed') ? null : viewer.menuFocus;
    el.classList.toggle('ftFade', !!mf && mf !== 'fish');
    render();
  });
  render();
  return { render, el };
}
