// The Welcome screen's right column: "Your resources and limits" (Nathan's design note, 2026-10-28), plus the running "Your aquarium" summary.
// Money, time (set-up and upkeep apart), space, experience and the equipment already owned: the brief's Constraints, Preferences and Tank groups
// drawn as fields. Nothing is required and nothing is pre-filled: blank means unspecified. Experience is context, never a limit. Welfare checks are
// not a setting. Everywhere else the bar (briefBar.ts) shows and edits the same items.
import { ADAPTS, ADAPT_WORD, DESIRES, DESIRE_WORD, EXPERIENCE, OWNED_CHOICES, adaptOf, desiredOf, editBrief, experienceOf, getBrief, onBrief, ownedKeys, rangeOf, roomTempFOf, setAdapt, setDesired, setExperience, setFlex, setLimitBound, setOwnedKey, setRoomTempF, setSpace, setTapWater, spaceOf, summarise, tapWaterOf,
  type Adapt, type Desire, type ItemId, type WaterSrc } from './setupBrief';

const MM_IN = 25.4;
type LimId = 'constraints.budget' | 'constraints.monthly' | 'constraints.careMin' | 'constraints.tankGal';
// every limit is a range (lane GV8): the box named by the id is the upper bound ("at most"), `<id>Min` the lower bound ("at least"); empty = no bound
const LIM: Record<string, LimId> = { wgBudget: 'constraints.budget', wgMonthly: 'constraints.monthly', wgTime: 'constraints.careMin', wgGal: 'constraints.tankGal' };
const itemOf = (k: string): ItemId => LIM[k] ?? 'constraints.maxSpace';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function attachWelcomeGuard(el: HTMLElement) {
  const num = (id: string) => { const v = el.querySelector<HTMLInputElement>('#' + id)?.value.trim(); return v ? parseFloat(v) : undefined; };
  const draw = () => {
    const b = getBrief(), sp = spaceOf(b), r = (mm: number) => String(Math.round(mm / MM_IN * 10) / 10), v = (n?: number) => n === undefined ? '' : String(n), ex = experienceOf(b), own = ownedKeys(b);
    const flexBox = (id: string, item: ItemId, has: boolean) => `<label class="wgFlex"><input type="checkbox" id="${id}F" ${b.items[item]?.flex ? 'checked' : ''} ${has ? '' : 'disabled'}> willing to change</label>`;
    const field = (id: string, label: string, step: number) => {
      const item = LIM[id], rg = rangeOf(b, item), has = rg.min !== undefined || rg.max !== undefined;
      return `<div class="wgLim"><label class="wgRow"><span>${label}</span><span class="wgMax wgBand"><input id="${id}Min" type="number" min="0" step="${step}" placeholder="at least" value="${esc(v(rg.min))}" aria-label="${label}: at least"> to <input id="${id}" type="number" min="0" step="${step}" placeholder="at most" value="${esc(v(rg.max))}" aria-label="${label}: at most"></span></label>${has ? flexBox(id, item, true) : ''}</div>`;
    };
    const temp = roomTempFOf(b), tw = tapWaterOf(b), des = desiredOf(b), ad = adaptOf(b);
    const rows = summarise(b).filter(g => !g.open);
    el.innerHTML = `<h3><span class="welcomeH"><span>2</span></span> Your resources and limits</h3><div class="hint">All optional; add them whenever they matter. Blank means not specified.</div>
<fieldset class="wgSet"><legend>Money</legend>${field('wgBudget', 'Upfront budget ($)', 10)}${field('wgMonthly', 'Monthly budget ($)', 1)}</fieldset>
<fieldset class="wgSet"><legend>Time</legend>${field('wgTime', 'Upkeep (min / week)', 5)}<div class="hint">Set-up time is coming: it needs the build plan.</div></fieldset>
<fieldset class="wgSet"><legend>Space</legend><div class="wgRow"><span>Largest footprint (in)</span><span class="wgMax"><span><input id="wgW" type="number" min="0" aria-label="Width" placeholder="wide" value="${sp ? r(sp.w) : ''}"> x <input id="wgD" type="number" min="0" aria-label="Depth" placeholder="deep" value="${sp ? r(sp.d) : ''}"></span></span></div>${field('wgGal', 'Tank size (gal)', 1)}</fieldset>
<fieldset class="wgSet"><legend>Environment</legend><label class="wgRow"><span>Room temperature (deg F)</span><input id="wgTemp" type="number" min="30" max="110" step="1" placeholder="not specified" value="${temp ?? ''}"></label>
<label class="wgRow"><span>Water from</span><select id="wgWater"><option value="">not specified</option>${(['tap', 'well', 'ro'] as WaterSrc[]).map(w => `<option value="${w}" ${tw?.source === w ? 'selected' : ''}>${{ tap: 'Tap', well: 'Well', ro: 'RO / remineralized' }[w]}</option>`).join('')}</select></label>
<label class="wgRow"><span>Hardness (dGH)</span><input id="wgGH" type="number" min="0" step="1" placeholder="unknown" value="${tw?.hardnessDgh ?? ''}" ${tw ? '' : 'disabled'}></label>
<label class="wgRow"><span>pH</span><input id="wgPH" type="number" min="0" max="14" step="0.1" placeholder="unknown" value="${tw?.ph ?? ''}" ${tw ? '' : 'disabled'}></label></fieldset>
<fieldset class="wgSet"><legend>What I want from it</legend><div class="wgChips">${DESIRES.map(d => `<button type="button" data-des="${d}" class="${des.includes(d) ? 'on' : ''}" aria-pressed="${des.includes(d)}">${DESIRE_WORD[d]}</button>`).join('')}</div>
<label class="wgRow"><span>If it does not all fit</span><select id="wgAdapt"><option value="">not specified</option>${ADAPTS.map(a => `<option value="${a}" ${ad === a ? 'selected' : ''}>${ADAPT_WORD[a]}</option>`).join('')}</select></label></fieldset>
<fieldset class="wgSet"><legend>Experience <span class="hint">(context, not a limit: a demanding tank is explained, not refused)</span></legend><div class="wgChips">${EXPERIENCE.map(e => `<button type="button" data-exp="${e.id}" class="${ex === e.id ? 'on' : ''}" aria-pressed="${ex === e.id}">${e.label}</button>`).join('')}</div></fieldset>
<details class="wgOwn"${own.length ? ' open' : ''}><summary>Equipment I already have${own.length ? ` (${own.length})` : ''}</summary><div class="wgChips">${OWNED_CHOICES.map(o => `<button type="button" data-own="${o.id}" data-label="${esc(o.label)}" class="${own.includes(o.id) ? 'on' : ''}" aria-pressed="${own.includes(o.id)}">${esc(o.label)}</button>`).join('')}</div></details>
<div class="wgAqua"><b>Your aquarium</b> <span class="hint">${rows.length ? 'in progress' : 'nothing yet'}</span>${rows.length ? `<ul>${rows.map(g => `<li><i>${esc(g.label)}</i> ${esc(g.text)}</li>`).join('')}</ul>` : ''}</div>`;
  };
  el.onchange = e => {
    const tg = e.target as HTMLInputElement, id = tg.id;
    if (id.endsWith('F') && LIM[id.slice(0, -1)]) { editBrief(b => setFlex(b, itemOf(id.slice(0, -1)), tg.checked)); return; }
    if (id === 'wgTemp') { editBrief(b => setRoomTempF(b, num('wgTemp'))); return; }
    if (id === 'wgWater') { const src = tg.value as WaterSrc | ''; editBrief(b => setTapWater(b, src ? { ...tapWaterOf(b), source: src } : undefined)); return; }
    if (id === 'wgGH' || id === 'wgPH') { const gh = num('wgGH'), ph = num('wgPH'); editBrief(b => { const t = tapWaterOf(b); return t ? setTapWater(b, { source: t.source, hardnessDgh: gh, ph }) : b; }); return; }
    if (id === 'wgAdapt') { editBrief(b => setAdapt(b, (tg.value || undefined) as Adapt | undefined)); return; }
    const base = id.endsWith('Min') ? id.slice(0, -3) : id;
    if (LIM[base]) editBrief(b => setLimitBound(b, LIM[base] as LimId, base === id ? 'max' : 'min', num(id)));
    else if (id === 'wgW' || id === 'wgD') { const w = num('wgW'), d = num('wgD'); editBrief(b => w && d ? setSpace(b, { w: Math.round(w * MM_IN), d: Math.round(d * MM_IN) }, 'in') : setSpace(b, undefined)); }
  };
  el.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-exp],[data-own],[data-des]'); if (!t) return;
    if (t.dataset.des) { const d = t.dataset.des as Desire; editBrief(b => setDesired(b, desiredOf(b).includes(d) ? desiredOf(b).filter(x => x !== d) : [...desiredOf(b), d])); return; }
    if (t.dataset.exp) { const x = +t.dataset.exp as 0 | 1 | 2; editBrief(b => setExperience(b, experienceOf(b) === x ? undefined : x)); }
    else { const k = t.dataset.own!, on = !ownedKeys(getBrief()).includes(k); editBrief(b => setOwnedKey(b, k, on)); }
  };
  onBrief(() => { const ae = document.activeElement as HTMLInputElement | null; if (!el.contains(ae) || ae?.tagName !== 'INPUT' || ae.type === 'checkbox') draw(); });
  draw();
}
