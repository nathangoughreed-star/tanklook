// "Suggest a setup" (lane C8, 2026-10-27; spec (d) Help me discover as an action): a panel over the viewer. One card of guardrails (set-up $,
// $ a month, minutes a week, space; each with its own box, nothing pre-filled that the person did not have) and optional appeal chips, then up to
// three proposals, each pictured in 3D in its own tank with the numbers the engines give and every enabled guardrail's state. Pick one and it opens
// in the editor with those guardrails set (Undo brings the old tank back). Logic is demand/suggest.ts (pure, tested); this file draws it. When no
// setup passes every enabled guardrail and the husbandry checks it says exactly "No available suggestions satisfy all your enabled guardrails".
import { getSpecies } from '../data/species';
import { demandOf } from '../demand/engine';
import { pinDeal } from '../demand/pinned';
import { rhythmOf } from '../demand/rhythm';
import { suggestSetups, OWNED, TAGS, type OwnedKey, FAMILY_LABEL, type Proposal, type Suggestions, type Tag } from '../demand/suggest';
import { CYCLE_NOTE } from '../scene/plan';
import { compliance, lastUsed, rememberLastUsed, type Constraints } from '../scene/constraints';
import type { Store } from '../scene/store';
import { tankLabel } from '../scene/tankfit';
import type { Viewer } from '../render/viewer';
import type { SpaceLimit, Units } from '../scene/types';
import { loadProfile } from './demandPanel';
import { placedSetup, sceneForBuild } from './buildPick';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const MM_IN = 25.4;

/** The guardrails card's fields as the panel holds them (empty = that guardrail has no value yet, so it is off). */
export interface Fields { startup: string; monthly: string; time: string; spaceOn: boolean; w: string; d: string; needStand: boolean; owned: OwnedKey[] }
const num = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) && v >= 0 ? v : undefined; };
/** Fields -> the constraints and space the generator checks. A box with no number is off; the space box needs both sizes. */
export function wantsFrom(f: Fields, units: Units): { constraints: Constraints; space?: SpaceLimit; spaceMissing: boolean; needStand: boolean; owned: OwnedKey[] } {
  const c: Constraints = {}, s = num(f.startup), m = num(f.monthly), t = num(f.time);
  if (s !== undefined) c.startupUsd = { on: true, value: s };
  if (m !== undefined) c.monthlyUsd = { on: true, value: m };
  if (t !== undefined) c.minutesPerWeek = { on: true, value: t };
  const k = units === 'in' ? MM_IN : 10, w = num(f.w), d = num(f.d);
  let space: SpaceLimit | undefined;
  if (f.spaceOn) { c.space = { on: true }; if (w !== undefined && d !== undefined && w > 0 && d > 0) space = { w: Math.round(w * k), d: Math.round(d * k) }; }
  return { constraints: c, ...(space ? { space } : {}), spaceMissing: f.spaceOn && !space, needStand: f.needStand, owned: f.owned };
}

export function attachSuggest(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp bp sg'; el.hidden = true; el.setAttribute('aria-label', 'Suggest a setup');
  view.append(el);
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };
  let f: Fields = { startup: '', monthly: '', time: '', spaceOn: false, w: '', d: '', needStand: true, owned: [] };
  let tags = new Set<Tag>(), res: Suggestions | undefined, pics: string[] = [], note = '';
  const units = () => store.scene.units ?? 'in';

  /** Start from what this tank already has as guardrails, else the person's last-used set. */
  const seed = () => {
    const c = store.tank.constraints ?? lastUsed(), sp = store.tank.layout.space, k = units() === 'in' ? MM_IN : 10;
    const v = (x?: { on: boolean; value: number }) => x && x.on ? String(x.value) : '';
    f = { startup: v(c?.startupUsd), monthly: v(c?.monthlyUsd), time: v(c?.minutesPerWeek), spaceOn: !!(c?.space?.on && sp), w: sp ? String(Math.round(sp.w / k * 10) / 10) : '', d: sp ? String(Math.round(sp.d / k * 10) / 10) : '', needStand: f.needStand, owned: f.owned };
    tags = new Set(); res = undefined; pics = []; note = '';
  };
  const readFields = () => {
    const g = (id: string) => el.querySelector<HTMLInputElement>(`#sg${id}`);
    f = { startup: g('Startup')?.value ?? '', monthly: g('Monthly')?.value ?? '', time: g('Time')?.value ?? '', spaceOn: !!g('SpaceOn')?.checked, w: g('W')?.value ?? '', d: g('D')?.value ?? '', needStand: g('NeedStand')?.checked ?? true,
      owned: [...el.querySelectorAll<HTMLInputElement>('.sgOwn:checked')].map(x => x.value as OwnedKey) };
  };

  const close = () => { el.hidden = true; side(false); };
  const lenU = () => units() === 'in' ? 'in' : 'cm';

  const card = (p: Proposal, i: number) => {
    const b = p.build, sp = placedSetup(b), D = demandOf(sp, loadProfile()), rh = rhythmOf(D, sp);
    const checks = p.status.map(s => `<li class="sgOk">${esc(s.label)}: ${esc(s.text)}</li>`).join('');
    const animals = p.archetype.animals.map(a => `${a.n} ${esc(getSpecies(a.species)?.name ?? a.species)}`).join(', ');
    return `<li class="bpCard" data-i="${i}">
<div class="bpPic">${pics[i] ? `<img src="${pics[i]}" alt="${esc(p.archetype.title)}: ${esc(tankLabel(b.tank, units()))} with the animals">` : ''}</div>
<div class="bpHead"><b>${esc(p.archetype.title)}</b><span class="spNote">${esc(FAMILY_LABEL[p.archetype.family])}</span></div>
<div class="spNote">${esc(p.archetype.why)} ${esc(tankLabel(b.tank, units()))} with ${animals}. ${esc(b.label)} build.</div>
<div class="bpNums"><span><b>${usd(p.totals.startupUsd)}</b>set-up${p.saved ? `<i>${usd(p.saved)} less: what you have</i>` : ''}</span><span><b>${usd(p.totals.monthlyUsd)}</b>a month</span><span><b>${p.totals.minPerWeek}</b>min a week<i>estimate</i></span></div>
<div class="spNote">Rhythm: ${esc(rh.text)} (estimate)${rh.awayText ? `. Can be left: ${esc(rh.awayText)}.` : ''}</div>
${p.matched.length ? `<div class="spNote">Matches: ${p.matched.map(m => esc(TAGS.find(t => t.id === m)!.label.toLowerCase())).join(', ')}</div>` : ''}
${checks ? `<ul class="bpGear sgChecks">${checks}</ul>` : ''}
${p.unknown.length ? `<div class="spNote">Not enough information: ${esc(p.unknown[0])}</div>` : ''}
<div class="spNote">${b.setup.water.on ? `${esc(CYCLE_NOTE)} ` : ''}Plants and the look are yours to add in the editor.</div>
<button type="button" class="primary" data-act="pick" data-i="${i}">Use this setup</button></li>`;
  };

  const draw = () => {
    const scroll = el.scrollTop, k = lenU();
    let out = '';
    if (res) {
      if (res.proposals.length) out = `<p class="spNote">${esc(res.off ? 'No guardrail is on, so these are ranked by what you picked below, not checked against a limit.' : 'Each one passes every guardrail you switched on and the animals\' care checks. Prices are expected costs; minutes are estimates.')}</p>
${res.note ? `<p class="spWarn sgNote">${esc(res.note)}</p>` : ''}<ul class="bpCards">${res.proposals.map(card).join('')}</ul>`;
      else out = `<p class="spWarn" id="sgNone">${esc(res.message ?? '')}</p>`;
      if (res.misses.length) out += `<div class="sgMiss"><b>Closest, if you raise a limit</b> (these do not fit your guardrails as set)<ul>${res.misses.map(m => `<li>${esc(m.archetype.title)}: ${esc(m.text)}</li>`).join('')}</ul></div>`;
    }
    el.innerHTML = `<div class="spHead"><h2>Suggest a setup</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<p class="spNote">Tick the limits that matter to you and we propose setups that fit them, each checked against all of them and against what the animals need. Leave a box empty to keep that limit off.</p>
<div class="sgCard">
<label class="sgRow"><span>Set-up budget ($)</span><input id="sgStartup" type="number" min="0" step="10" inputmode="decimal" value="${esc(f.startup)}" placeholder="no limit"></label>
<label class="sgRow"><span>Monthly budget ($ a month)</span><input id="sgMonthly" type="number" min="0" step="1" inputmode="decimal" value="${esc(f.monthly)}" placeholder="no limit"></label>
<label class="sgRow"><span>Care time (min a week)</span><input id="sgTime" type="number" min="0" step="5" inputmode="decimal" value="${esc(f.time)}" placeholder="no limit"></label>
<div class="sgRow"><label><input id="sgSpaceOn" type="checkbox" ${f.spaceOn ? 'checked' : ''}> Space (${k})</label><span class="sgSp"><input id="sgW" type="number" min="0" aria-label="Width" value="${esc(f.w)}" placeholder="wide"> x <input id="sgD" type="number" min="0" aria-label="Depth" value="${esc(f.d)}" placeholder="deep"></span></div>
<label class="sgRow"><span><input id="sgNeedStand" type="checkbox" ${f.needStand ? 'checked' : ''}> I'll need a stand</span></label>
<details class="sgOwned"${f.owned.length ? ' open' : ''}><summary>Equipment I already have${f.owned.length ? ` (${f.owned.length})` : ''}</summary><div class="sgOwnList">${OWNED.map(o => `<label><input class="sgOwn" type="checkbox" value="${o.id}" ${f.owned.includes(o.id) ? 'checked' : ''}${o.id === 'stand' && !f.needStand ? ' disabled' : ''}> ${o.label}</label>`).join('')}</div><div class="spNote">Owned items cost $0 in the set-up total and the budget. They still count for the animals' needs, so the one you own should be as good as the one the setup calls for.</div></details>
<div class="sgTags" role="group" aria-label="What appeals to you">${TAGS.map(t => `<button type="button" class="sgTag${tags.has(t.id) ? ' on' : ''}" data-tag="${t.id}" aria-pressed="${tags.has(t.id)}">${t.label}</button>`).join('')}</div>
<button type="button" class="primary" data-act="go">Show me setups</button>${note ? `<div class="spWarn">${esc(note)}</div>` : ''}
</div>${out}`;
    el.scrollTop = scroll;
  };

  /** One picture per proposal: show it in the main viewer, take the picture, then roll the editor back to the tank the person had. */
  const shoot = (list: Proposal[]) => {
    const was = el.hidden, m = store.mark; el.hidden = true;
    pics = list.map(p => { store.update(s => { Object.assign(s.tanks[s.active], placedSetup(p.build)); }, { coalesce: 'suggest' }); return viewer.thumbnail(720); });
    store.rollback(m); el.hidden = was;
  };

  const go = () => {
    readFields();
    const w = wantsFrom(f, units());
    note = '';
    if (w.spaceMissing) { note = 'Enter the width and depth of your space, or untick Space.'; res = undefined; draw(); return; }
    res = suggestSetups({ needStand: w.needStand, owned: w.owned, constraints: w.constraints, ...(w.space ? { space: w.space } : {}), tags: [...tags] }, loadProfile(), units());
    pics = [];
    if (res.proposals.length) shoot(res.proposals);
    draw();
    el.querySelector('.bpCards, #sgNone')?.scrollIntoView?.({ block: 'nearest' });
  };

  const pick = (i: number) => {
    const p = res?.proposals[i]; if (!p) return;
    if (p.build.bundle) pinDeal(p.build.bundle);
    const next = sceneForBuild(p.build, store.scene.units);
    next.name = p.archetype.title;
    const T = next.tanks[next.active];
    T.constraints = p.scene.constraints; T.stand = { ...T.stand, show: p.scene.stand.show }; if (p.scene.layout.space) T.layout = { ...T.layout, space: p.scene.layout.space };
    rememberLastUsed(p.scene.constraints);
    store.replace(next); close(); store.seal();
    const c = compliance(T, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, loadProfile().limits, units());
    status(`${p.archetype.title} opened in the editor: ${usd(p.totals.startupUsd)} set-up, ${usd(p.totals.monthlyUsd)} a month. ${c.line}. Undo steps back.`);
  };

  el.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-tag]'); if (!t) return;
    if (t.dataset.tag) { readFields(); const id = t.dataset.tag as Tag; tags.has(id) ? tags.delete(id) : tags.add(id); draw(); return; }
    switch (t.dataset.act) { case 'close': close(); break; case 'go': go(); break; case 'pick': pick(+(t.dataset.i ?? -1)); break; }
  };
  el.onchange = e => { if ((e.target as HTMLElement).id === 'sgNeedStand') { readFields(); draw(); } };
  el.onkeydown = e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') go(); };

  const open = () => { seed(); side(true); el.hidden = false; draw(); el.querySelector<HTMLInputElement>('#sgStartup')?.focus(); };
  return { open, close };
}
