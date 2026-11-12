// AB6 (2026-11-10): the quick-preferences form, drawn twice from ONE function: on the one optional screen after the habitat question (`showQuickPrefs`, replaces the AB4 intro
// popup) and as the "Your preferences" block in the Constraints menu (`attachPrefsBlock`). Nothing is required: Skip and Start building both go straight to the editor, every
// row has an "Unsure" way out (press the chosen button again). Size (and, from QP2, the archetype cards) are visible; Practical limits and Don't want are collapsed.
// The screen holds its answers in a DRAFT and writes them when "Start building" is pressed (Skip writes nothing); the menu block writes as you press. Both write through
// scene/quickPrefs.ts `applyQuickPrefs`, so they are the same fields and either can change them later.
import { editBrief, getBrief, onBrief } from './setupBrief';
import { projectExtras } from '../scene/brief';
import type { HabitatDirection } from '../scene/discoveryTypes';
import { SIZE_CHOICES, SIZE_LABEL, galAt, galTickText, galRangeText, galSpan, galTicks, galToPos, isDry, posToGal, sizeAtBand, sizeAtMid, sizeRange, sizeText, type GalRange, type SizeChoice } from '../scene/sizePrefs';
import { AVOIDS, LARGE_IN, answersOf, compromiseNote, applyQuickPrefs, normalize, type ArchState, type AvoidId, type Limit, type QuickAnswers } from '../scene/quickPrefs';
import { archetypesFor, type QuickArchetype } from '../scene/quickArchetypes';
import { INTRO_BUTTON, INTRO_LINES, INTRO_TITLE, introHtml, spotlight } from './introPopup';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const btn = (data: string, on: boolean, label: string, sub = '') => `<button type="button" class="qp-opt${on ? ' on' : ''}" ${data} aria-pressed="${on}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
const limitRow = (key: 'budget' | 'care', label: string, unit: string, l: Limit | undefined) =>
  `<div class="qp-limit"><span>${label}</span><span class="qp-num">${unit === '$' ? '$' : ''}<input type="number" inputmode="numeric" min="0" step="${unit === '$' ? 50 : 15}" data-limit="${key}" value="${l?.max ?? ''}" aria-label="${esc(label)}">${unit === '$' ? '' : ' min'}</span>`
  + `<span class="qp-seg" role="group" aria-label="${esc(label)}: target or firm maximum">${btn(`data-firm="${key}:0"`, !!l && !l.firm, 'Target')}${btn(`data-firm="${key}:1"`, !!l && l.firm, 'Firm maximum')}</span></div>`;

/** The Size row: ONE slider over three marked bands (Small | Medium | Large, each with its gallons or floor size). The thumb picks a spot; the band it is in is the answer
 *  (same as the old buttons), and the readout names the figure. "Unsure" clears it, as every row's way out. */
export function sizeSliderHtml(d: HabitatDirection, a: QuickAnswers): string {
  if (!isDry(d)) return galRangeHtml(d, a);
  const at = a.size ? (a.sizeAt !== undefined && sizeAtBand(a.sizeAt) === a.size ? a.sizeAt : sizeAtMid(a.size)) : undefined;
  const read = at === undefined ? 'Not set' : `${SIZE_LABEL[sizeAtBand(at)]}${isDry(d) ? '' : `: about ${galAt(d, at)} gal`}`;
  const bands = SIZE_CHOICES.map(s => `<span class="qp-band${a.size === s ? ' on' : ''}"><b>${SIZE_LABEL[s]}</b><small>${esc(sizeText(d, s))}</small></span>`).join('');
  return `<div class="qp-row" role="group" aria-label="Size"><b>Size <span class="qp-read" aria-live="polite">${esc(read)}</span></b>`
    + `<div class="qp-slide${at === undefined ? ' unset' : ''}"><input type="range" class="qp-range" data-sizeat min="0" max="1000" step="1" value="${Math.round((at ?? 0.5) * 1000)}" aria-label="Size, small to large" aria-valuetext="${esc(read)}"><div class="qp-bands" aria-hidden="true">${bands}</div></div>`
    + `<div class="qp-opts">${btn('data-size="unsure"', !a.size, 'Unsure')}</div>`
    + `<div class="qp-limit"><span class="qp-seg" role="group" aria-label="Size: preference or firm range">${btn('data-sizefirm="0"', !!a.size && !a.sizeFirm, 'Preference')}${btn('data-sizefirm="1"', !!a.size && !!a.sizeFirm, 'Firm')}</span></div>`
    + `<p class="hint">Preference = bigger or smaller tanks rank lower the further they are from this range; Firm = never outside it.</p></div>`;
}

const STATE_TXT: Record<string, string> = { interested: '✓ Interested', avoid: '✕ Avoid', none: '○ Not chosen' };
/** One image card: a button that cycles Not chosen -> Interested -> Avoid -> Not chosen. State is shown by a text label + icon + border style (never colour alone). The image is
 *  public/art/quick/<key>.webp (QP3); until it exists (or if it fails to load) the labelled placeholder tile behind it shows. */
export function archCardHtml(c: QuickArchetype, st: ArchState | undefined, base = ''): string {
  const k = st ?? 'none';
  return `<button type="button" class="qp-card ${k}" data-arch="${c.key}" aria-pressed="${st === 'interested' ? 'true' : st === 'avoid' ? 'mixed' : 'false'}" aria-label="${esc(c.label)}: ${STATE_TXT[k].slice(2)}. ${esc(c.blurb)} Press to change.">`
    + `<span class="qp-thumb"><span class="qp-ph" aria-hidden="true">${esc(c.label.split(/[ /&]/)[0])}</span><img src="${base}art/quick/${c.key}.webp" alt="" loading="lazy" decoding="async"></span>`
    + `<span class="qp-cn">${esc(c.label)}</span><span class="qp-cd">${esc(c.blurb)}</span><span class="qp-st">${STATE_TXT[k]}</span></button>`;
}
/** The "What kinds of setups appeal to you?" row for one habitat (a small mixed sample for "I don't know yet"), plus QP1's compromise note when a live-planted card is Interested with No live plants on. */
export function archRowHtml(d: HabitatDirection, a: QuickAnswers, base = ''): string {
  const cards = archetypesFor(d);
  const note = compromiseNote({ prohibit: a.avoid, arch: { interested: Object.keys(a.arch).filter(k => a.arch[k] === 'interested'), avoid: Object.keys(a.arch).filter(k => a.arch[k] === 'avoid'), layouts: {}, families: {} } });
  return `<div class="qp-row qp-arch" role="group" aria-label="What kinds of setups appeal to you?"><b>What kinds of setups appeal to you?</b><p class="hint">Choose any that catch your eye; press again for Avoid, again to clear. A look, not a commitment.${d === 'unsure' ? ' A few examples; pick a habitat for more.' : ''}</p>`
    + `<div class="qp-cards">${cards.map(c => archCardHtml(c, a.arch[c.key], base)).join('')}</div>${note.flag ? `<p class="qp-note" role="status">${esc(note.text)}</p>` : ''}</div>`;
}
/** The rows' markup for one habitat and one set of answers (pure: the tests read it). Size is always visible; Practical limits and Don't want are collapsed (`open` re-opens one). */
export function prefsHtml(d: HabitatDirection, a: QuickAnswers, open: { limits?: boolean; avoid?: boolean } = {}, base = ''): string {
  const rows: string[] = [];
  rows.push(sizeSliderHtml(d, a));
  rows.push(archRowHtml(d, a, base));
  rows.push(`<details class="qp-more" data-x="limits"${open.limits || a.budget || a.care ? ' open' : ''}><summary>Practical limits</summary>${limitRow('budget', 'Set-up cost under', '$', a.budget)}${limitRow('care', 'Weekly upkeep under', 'min', a.care)}<p class="hint">Target = I’d prefer it; Firm maximum = never go over.</p></details>`);
  rows.push(`<details class="qp-more" data-x="avoid"${open.avoid || a.avoid.length ? ' open' : ''}><summary>Don’t want</summary><div class="qp-opts">${AVOIDS.filter(x => x.shown(d)).map(x => btn(`data-avoid="${x.id}"`, a.avoid.includes(x.id), x.label(d), x.id === 'large-animals' ? `over ${LARGE_IN} in` : '')).join('')}</div><p class="hint">Firm: designs with these are left out. </p></details>`);
  return rows.join('');
}
const GAL_STEPS = 400;   // thumb positions along the line (gallons snap, so this only sets drag smoothness)
const pct = (p: number) => `${(p * 100).toFixed(2)}%`;
/** The range an aquarium answer stands for (the two thumbs), or undefined when size is not set. */
export const galOf = (d: HabitatDirection, a: QuickAnswers): GalRange | undefined => a.gal ?? (a.size ? sizeRange(d, a.size) : undefined);
/** GR-RANGE: the aquarium Size row. ONE continuous gallon number line (log scale, graduated in round tank sizes) with TWO thumbs, min and max. Nathan 2026-11-12: no
 *  Small / Medium / Large bands or labels, no Unsure / Preference / Firm buttons: the range is always FIRM, and its ends are open (bottom stop = "5 gal and under",
 *  top stop = "150 gal+"), so both thumbs at the stops is no limit at all. Unset shows the whole line, dimmed. */
function galRangeHtml(d: HabitatDirection, a: QuickAnswers): string {
  const r = galOf(d, a), sp = galSpan(d), cur = r ?? sp, lo = galToPos(d, cur.lo), hi = galToPos(d, cur.hi);
  const read = r ? galRangeText(d, r) : 'Not set';
  const ticks = galTicks(d).map(g => `<span class="qp-tick" style="left:${pct(galToPos(d, g))}">${galTickText(d, g)}</span>`).join('');
  const thumb = (k: 'lo' | 'hi', p: number, g: number) => `<input type="range" class="qp-range" data-gal="${k}" min="0" max="${GAL_STEPS}" step="1" value="${Math.round(p * GAL_STEPS)}" aria-label="${k === 'lo' ? 'Smallest' : 'Largest'} tank you would like, gallons" aria-valuetext="${galTickText(d, g)} gal">`;
  return `<div class="qp-row" role="group" aria-label="Size"><b>Size <span class="qp-read" aria-live="polite">${esc(read)}</span></b>`
    + `<div class="qp-slide qp-gal${r ? '' : ' unset'}"><div class="qp-axis" aria-hidden="true"><span class="qp-track"></span><span class="qp-fill" style="left:${pct(lo)};width:${pct(hi - lo)}"></span>${ticks}</div>`
    + `<div class="qp-dual">${thumb('lo', lo, cur.lo)}${thumb('hi', hi, cur.hi)}</div></div></div>`;
}
/** Move a thumb of the gallon line: `lo` / `hi` are 0..GAL_STEPS positions (either order: the smaller is the minimum). The range is always firm. */
export function slideGal(d: HabitatDirection, a: QuickAnswers, lo: number, hi: number): QuickAnswers {
  const [x, y] = lo <= hi ? [lo, hi] : [hi, lo], n = { ...a, gal: { lo: posToGal(d, x / GAL_STEPS), hi: posToGal(d, y / GAL_STEPS) }, sizeFirm: true }; delete n.size; delete n.sizeAt; return normalize(n);
}
/** Press a button: the next answers. Pressing the chosen button again clears it (that is "Unsure"). */
export function press(a: QuickAnswers, t: { size?: string; arch?: string; avoid?: string; firm?: string; sizefirm?: string }): QuickAnswers {
  const n: QuickAnswers = { ...a, arch: { ...a.arch }, avoid: [...a.avoid] }, tog = <T>(xs: T[], x: T) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  if (t.size === 'unsure') { delete n.size; delete n.sizeAt; delete n.gal; }
  else if (t.size) { delete n.gal; if (a.size === t.size) { delete n.size; delete n.sizeAt; } else { n.size = t.size as SizeChoice; delete n.sizeAt; } }
  if (t.arch) { const cur: ArchState | undefined = a.arch[t.arch], nx: ArchState | undefined = cur === undefined ? 'interested' : cur === 'interested' ? 'avoid' : undefined; if (nx) n.arch[t.arch] = nx; else delete n.arch[t.arch]; }   // unselected -> interested -> avoid -> unselected
  if (t.avoid) n.avoid = tog(n.avoid, t.avoid as AvoidId);
  if (t.sizefirm && (n.size || n.gal)) n.sizeFirm = t.sizefirm === '1';
  if (t.firm) { const [k, v] = t.firm.split(':') as ['budget' | 'care', string], l = n[k]; if (l) n[k] = { max: l.max, firm: v === '1' }; }
  return normalize(n);
}
/** Move the size slider: `v` is 0..1000 along the track. */
export function slideSize(a: QuickAnswers, v: number): QuickAnswers {
  const at = Math.min(1, Math.max(0, v / 1000)); return normalize({ ...a, size: sizeAtBand(at), sizeAt: at });
}
/** Type a limit: a number sets it (keeping target / firm; a new one starts as a Target), blank or 0 clears it. */
export function setLimit(a: QuickAnswers, key: 'budget' | 'care', v: number): QuickAnswers {
  const n = { ...a }; if (!Number.isFinite(v) || v <= 0) delete n[key]; else n[key] = { max: v, firm: a[key]?.firm ?? false };
  return normalize(n);
}
const dirNow = (): HabitatDirection => projectExtras(getBrief()).direction ?? 'unsure';

interface Form { redraw(): void }
function mountForm(host: HTMLElement, get: () => QuickAnswers, set: (a: QuickAnswers) => void): Form {
  const redraw = () => {
    const open = { limits: host.querySelector<HTMLDetailsElement>('details[data-x=limits]')?.open, avoid: host.querySelector<HTMLDetailsElement>('details[data-x=avoid]')?.open };
    host.innerHTML = prefsHtml(dirNow(), get(), open, import.meta.env?.BASE_URL ?? '');
  };
  host.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.qp-opt, .qp-card'); if (!t) return;
    set(press(get(), { size: t.dataset.size, arch: t.dataset.arch, avoid: t.dataset.avoid, firm: t.dataset.firm, sizefirm: t.dataset.sizefirm })); redraw();
  });
  host.addEventListener('error', e => { const i = e.target as HTMLElement; if (i instanceof HTMLImageElement && i.closest('.qp-thumb')) i.remove(); }, true);   // no thumbnail yet: the labelled placeholder tile stays
  host.addEventListener('input', e => {   // the slider: the answer follows the thumb, only the readout is redrawn (a full redraw would drop the drag)
    const i = e.target as HTMLInputElement;
    if (i.dataset?.gal) {   // the gallon line: thumbs may not cross (the moved one stops at the other); readout, fill and bands follow live
      const row = i.closest('.qp-row')!, lo = row.querySelector<HTMLInputElement>('[data-gal=lo]')!, hi = row.querySelector<HTMLInputElement>('[data-gal=hi]')!;
      if (+lo.value > +hi.value) { if (i === lo) lo.value = hi.value; else hi.value = lo.value; }
      const d = dirNow(), a = slideGal(d, get(), +lo.value, +hi.value), r = a.gal!; set(a);
      lo.setAttribute('aria-valuetext', `${galTickText(d, r.lo)} gal`); hi.setAttribute('aria-valuetext', `${galTickText(d, r.hi)} gal`);
      row.querySelector('.qp-read')!.textContent = galRangeText(d, r);
      const f = row.querySelector<HTMLElement>('.qp-fill')!, p0 = +lo.value / GAL_STEPS, p1 = +hi.value / GAL_STEPS; f.style.left = pct(p0); f.style.width = pct(p1 - p0);
      row.querySelector('.qp-slide')!.classList.remove('unset');
      return;
    }
    if (!i.dataset || !('sizeat' in i.dataset)) return;   // DQ4: `data-sizeat` has an EMPTY value, so testing its truthiness ignored every slider move
    const a = slideSize(get(), +i.value); set(a);
    const row = i.closest('.qp-row')!, fresh = document.createElement('div'); fresh.innerHTML = sizeSliderHtml(dirNow(), a);
    row.querySelector('.qp-read')!.textContent = fresh.querySelector('.qp-read')!.textContent; i.setAttribute('aria-valuetext', fresh.querySelector('.qp-read')!.textContent!);
    row.querySelector('.qp-slide')!.classList.remove('unset'); row.querySelectorAll('.qp-band').forEach((b, k) => b.classList.toggle('on', SIZE_CHOICES[k] === a.size));
    row.querySelector('[data-size=unsure]')?.classList.remove('on'); row.querySelector('[data-size=unsure]')?.setAttribute('aria-pressed', 'false');
  });
  host.addEventListener('change', e => {
    const i = e.target as HTMLInputElement; if (i.dataset && ('sizeat' in i.dataset || i.dataset.gal)) { redraw(); return; } if (!i.dataset?.limit) return;
    set(setLimit(get(), i.dataset.limit as 'budget' | 'care', parseFloat(i.value))); redraw();
  });
  redraw(); return { redraw };
}

/** The "Your preferences" block in the Constraints menu: live, the same fields as the screen. */
export function attachPrefsBlock(host: HTMLElement) {
  host.classList.add('qp');
  host.innerHTML = '<div class="qp-form"></div><p class="hint">All optional. Definitely, Definitely not, Firm maximum and Don’t want are requirements; everything else only nudges the order of what Discover shows you.</p>';
  const form = mountForm(host.querySelector<HTMLElement>('.qp-form')!, () => answersOf(getBrief()), a => editBrief(b => applyQuickPrefs(b, a)));
  onBrief(() => { if (!(document.activeElement instanceof HTMLInputElement && host.contains(document.activeElement))) form.redraw(); });
}

/** The one screen after the habitat question. Resolves when the person starts building or skips (the dialog's Esc counts as Skip). Both buttons go straight to the editor; nothing is required. */
export function showQuickPrefs(root: Document = document): Promise<void> {
  return new Promise(res => {
    let draft = answersOf(getBrief()), committed = false;
    const dlg = root.createElement('dialog'); dlg.id = 'introDlg'; dlg.className = 'libdlg introdlg qpdlg'; dlg.setAttribute('aria-labelledby', 'introTitle');
    dlg.innerHTML = `<h2 id="introTitle">${esc(INTRO_TITLE)}</h2><div class="qp qp-form"></div>`
      + `${INTRO_LINES.map(l => `<p class="qp-intro">${introHtml(l)}</p>`).join('')}<div class="btns qp-actions"><button type="button" id="qpSkip">Skip</button><button type="button" class="primary" id="introOk">${INTRO_BUTTON}</button></div>`;
    root.body.append(dlg);
    mountForm(dlg.querySelector<HTMLElement>('.qp-form')!, () => draft, a => { draft = a; });
    const finish = (write: boolean) => { if (committed) return; committed = true; if (write) editBrief(b => applyQuickPrefs(b, draft)); if (dlg.open) dlg.close(); };
    dlg.querySelector<HTMLElement>('#introOk')!.onclick = () => finish(true);
    dlg.querySelector<HTMLElement>('#qpSkip')!.onclick = () => finish(false);
    dlg.addEventListener('close', () => { dlg.remove(); spotlight(root); res(); });
    dlg.showModal(); dlg.querySelector<HTMLElement>('#introOk')!.focus();
  });
}
