// "Suggest a setup" (lane C8, 2026-10-27; spec (d) Help me discover as an action): a panel over the viewer. One card of guardrails (set-up $,
// $ a month, minutes a week, space; each with its own box, nothing pre-filled that the person did not have) and optional appeal chips, then up to
// three proposals, each pictured in 3D in its own tank with the numbers the engines give and every enabled guardrail's state. Pick one and it opens
// in the editor with those guardrails set (Undo brings the old tank back). Logic is demand/suggest.ts (pure, tested); this file draws it. When no
// setup passes every enabled guardrail and the husbandry checks it says exactly "No available suggestions satisfy all your enabled guardrails".
import { getSpecies } from '../data/species';
import { demandOf } from '../demand/engine';
import { pinDeal } from '../demand/pinned';
import { rhythmOf } from '../demand/rhythm';
import { narrowBack, narrowPick, narrowStart, narrowTaste, picksOf, suggestSetups, variationsOf, type Narrowing, type Option, type Wants, DRY_GROUPS, KINDS, OWNED, PICK_CARE, PICK_UNKNOWN, asksDryGroups, type OwnedMap, type DryGroup, type Kind, TAGS, FAMILY_LABEL, type Proposal, type Suggestions, type Tag } from '../demand/suggest';
import { CYCLE_NOTE } from '../scene/plan';
import { TIER_LABEL } from '../scene/finish';
import { LAYERS, LAYER_BLURB, LAYER_LABEL, type CostLine } from '../demand/costlines';
import { compliance, lastUsed, rememberLastUsed, type Constraints } from '../scene/constraints';
import type { Store } from '../scene/store';
import { tankLabel } from '../scene/tankfit';
import type { Viewer } from '../render/viewer';
import type { SpaceLimit, Units } from '../scene/types';
import { loadProfile } from './demandPanel';
import { placedSetup, putTank, sceneForBuild } from './buildPick';
import { constraintsOf, editBrief, getBrief, lockedStock, onBrief, setBudget, setCareTime, setMonthly, setSpace } from './setupBrief';
import { recordTaste, tasteOf, tasteWhy } from '../demand/taste';
import { briefToWants, clearItem, setItem, targetOf, valueOf } from '../scene/brief';
import { openBuildPlan, confBadge } from './buildPlanSheet';
import { buildPlanOf } from '../demand/buildplan';
import { applyAlternative } from '../demand/infeasible';
import { infeasibleCard, futureHtml } from './infeasibleCard';
import { getSpecies as speciesOf } from '../data/species';
import { chipsFor, dropWish, refine, type Chip } from '../demand/refine';
import { changeStrip, inputsOf, type Inputs, type Strip } from '../demand/propagate';
import type { Wish } from '../scene/brief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const MM_IN = 25.4;

/** The guardrails card's fields as the panel holds them (empty = that guardrail has no value yet, so it is off). */
export interface Fields { startup: string; monthly: string; time: string; spaceOn: boolean; w: string; d: string; needStand: boolean; owned: OwnedMap; kinds: Kind[]; groups: DryGroup[] }
const num = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) && v >= 0 ? v : undefined; };
/** Fields -> the constraints and space the generator checks. A box with no number is off; the space box needs both sizes. */
export function wantsFrom(f: Fields, units: Units): { constraints: Constraints; space?: SpaceLimit; spaceMissing: boolean; needStand: boolean; owned: OwnedMap; kinds: Kind[]; groups: DryGroup[] } {
  const c: Constraints = {}, s = num(f.startup), m = num(f.monthly), t = num(f.time);
  if (s !== undefined) c.startupUsd = { on: true, value: s };
  if (m !== undefined) c.monthlyUsd = { on: true, value: m };
  if (t !== undefined) c.minutesPerWeek = { on: true, value: t };
  const k = units === 'in' ? MM_IN : 10, w = num(f.w), d = num(f.d);
  let space: SpaceLimit | undefined;
  if (f.spaceOn) { c.space = { on: true }; if (w !== undefined && d !== undefined && w > 0 && d > 0) space = { w: Math.round(w * k), d: Math.round(d * k) }; }
  return { constraints: c, ...(space ? { space } : {}), spaceMissing: f.spaceOn && !space, needStand: f.needStand, owned: f.owned, kinds: f.kinds, groups: f.groups };
}

/** "I like this one" -> make it mine (lane GV6): the option replaces the open project as one undoable step, named after it, with the brief, the limits, the stand choice and the space kept. */
export function makeItMine(store: Store, p: Proposal) {
  if (p.build.bundle) pinDeal(p.build.bundle);
  const next = sceneForBuild(p.build, store.scene.units);
  next.name = p.archetype.title;
  const T = next.tanks[next.active];
  if (store.tank.brief) T.brief = structuredClone(store.tank.brief); // the brief stays with the project (lane U3)
  T.constraints = p.scene.constraints; T.stand = { ...T.stand, show: p.scene.stand.show }; if (p.scene.layout.space) T.layout = { ...T.layout, space: p.scene.layout.space };
  rememberLastUsed(p.scene.constraints);
  store.replace(next); store.seal();
  return T;
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
  let f: Fields = { startup: '', monthly: '', time: '', spaceOn: false, w: '', d: '', needStand: true, owned: {}, kinds: KINDS.map(k => k.id), groups: DRY_GROUPS.map(g => g.id) };
  let tags = new Set<Tag>(), res: Suggestions | undefined, pics: string[] = [], note = '';
  /** refinement chips (lane U6): what the last chip did, and one tradeoff line per card */
  let refineLine = '', cardLines: string[] = [];
  /** live loop (lane NG3): what the last run was asked, what it said changed, and the debounce timer */
  let lastAsk: Inputs | undefined, strip: Strip | undefined, timer: number | undefined, muted = false;
  const LIVE_MS = 400;
  /** narrowing (lane GV6): the rounds shown so far (round 1 = the generator's set; each pick adds a round of its variations), each round's pictures, and the Wants they were made under */
  let narrow: Narrowing | undefined, roundPics: string[][] = [], asked: Wants | undefined;
  const cur = () => narrow?.rounds[narrow.rounds.length - 1];
  const shownNow = (): Option[] => cur()?.options ?? res?.proposals ?? [];
  const units = () => store.scene.units ?? 'in';

  /** Start from what this tank already has as guardrails, else the person's last-used set. */
  const seed = () => {
    const c = store.tank.constraints ?? lastUsed(), sp = store.tank.layout.space, k = units() === 'in' ? MM_IN : 10;
    const v = (x?: { on: boolean; value: number }) => x && x.on ? String(x.value) : '';
    f = { startup: v(c?.startupUsd), monthly: v(c?.monthlyUsd), time: v(c?.minutesPerWeek), spaceOn: !!(c?.space?.on && sp), w: sp ? String(Math.round(sp.w / k * 10) / 10) : '', d: sp ? String(Math.round(sp.d / k * 10) / 10) : '', needStand: f.needStand, owned: f.owned, kinds: f.kinds, groups: f.groups };
    // the setup brief wins over the tank's own guardrails: what the person already told us is not asked again (lane U3)
    const bc = constraintsOf(getBrief());
    if (bc.startupUsd !== undefined) f.startup = String(bc.startupUsd);
    if (bc.monthlyUsd !== undefined) f.monthly = String(bc.monthlyUsd);
    if (bc.minutesPerWeek !== undefined) f.time = String(bc.minutesPerWeek);
    if (bc.space) { f.spaceOn = true; f.w = String(Math.round(bc.space.w / k * 10) / 10); f.d = String(Math.round(bc.space.d / k * 10) / 10); }
    const bo = valueOf(getBrief(), 'constraints.owned'); if (bo) f.owned = { ...bo };
    tags = new Set(); res = undefined; pics = []; note = ''; strip = undefined; narrow = undefined; roundPics = [];
  };
  const readFields = () => {
    const g = (id: string) => el.querySelector<HTMLInputElement>(`#sg${id}`);
    f = { startup: g('Startup')?.value ?? '', monthly: g('Monthly')?.value ?? '', time: g('Time')?.value ?? '', spaceOn: !!g('SpaceOn')?.checked, w: g('W')?.value ?? '', d: g('D')?.value ?? '', needStand: g('NeedStand')?.checked ?? true,
      owned: Object.fromEntries([...el.querySelectorAll<HTMLInputElement>('.sgOwn:checked')].map(x => [x.value, el.querySelector<HTMLSelectElement>(`.sgOwnPick[data-k="${x.value}"]`)?.value ?? PICK_CARE])) as OwnedMap,
      kinds: [...el.querySelectorAll<HTMLInputElement>('.sgKind:checked')].map(x => x.value as Kind), groups: [...el.querySelectorAll<HTMLInputElement>('.sgGroup:checked')].map(x => x.value as DryGroup) };
  };

  const close = () => { el.hidden = true; side(false); };
  const lenU = () => units() === 'in' ? 'in' : 'cm';

  /** The set-up price by the four standards of a finished tank (lane U5), each with what it is for; sales tax last. */
  const layered = (lines: CostLine[]) => {
    const item = (l: CostLine) => `<li>${esc(l.label)}${l.note ? ` (${esc(l.note)})` : ''}: ${usd(l.usd)}</li>`;
    const blocks = LAYERS.filter(y => y !== 'tax').map(y => {
      const own = lines.filter(l => (l.layer ?? 'welfare') === y); if (!own.length) return '';
      return `<li class="sgLayer" data-layer="${y}"><b>${LAYER_LABEL[y]}: ${usd(own.reduce((t, l) => t + l.usd, 0))}</b> <span class="spNote">${esc(LAYER_BLURB[y])}</span><ul>${own.map(item).join('')}</ul></li>`;
    }).join('');
    const none = ['display', 'enhance'].filter(y => !lines.some(l => l.layer === y && l.usd > 0)).map(y => `${LAYER_LABEL[y as 'display']}: none included`);
    return `${blocks}${lines.filter(l => l.layer === 'tax').map(item).join('')}${none.length ? `<li class="spNote">${none.join('; ')}</li>` : ''}`;
  };

  const card = (p: Option, i: number) => {
    const b = p.build, sp = placedSetup(b), D = demandOf(sp, loadProfile()), rh = rhythmOf(D, sp), cf = buildPlanOf(p, loadProfile()).figures;
    const checks = p.status.map(s => `<li class="sgOk">${esc(s.label)}: ${esc(s.text)}</li>`).join('');
    const animals = b.animals.map(a => `${a.n} ${esc(getSpecies(a.species)?.name ?? a.species)}`).join(', ');
    return `<li class="bpCard" data-i="${i}">
<div class="bpPic">${pics[i] ? `<img src="${pics[i]}" alt="${esc(p.archetype.title)}: ${esc(tankLabel(b.tank, units()))} with the animals">` : ''}</div>
${p.variation ? `<div class="sgTrade sgVar" data-axis="${p.variation.axis}"><b>${esc(p.variation.label)}</b>: ${esc(p.variation.deltaText)}</div>` : cardLines[i] ? `<div class="sgTrade" data-trade="${i}">${esc(cardLines[i])}</div>` : ''}
<div class="bpHead"><b>${esc(p.archetype.title)}</b><span class="spNote">${esc(FAMILY_LABEL[p.archetype.family])}</span></div>
<div class="spNote">${esc(p.archetype.why)} ${esc(tankLabel(b.tank, units()))} with ${animals}. ${esc(b.label)} build.</div>
${b.finish ? `<ul class="bpGear sgFinish">${b.finish.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
${p.costLines.length ? `<ul class="bpGear sgCost" aria-label="What the set-up price is made of, by standard">${layered(p.costLines)}</ul>` : ''}
<div class="bpNums"><span><b>${usd(p.totals.startupUsd)}</b>set-up${confBadge(cf.startup)}${p.saved ? `<i>${usd(p.saved)} less: what you have</i>` : ''}</span><span><b>${usd(p.totals.monthlyUsd)}</b>a month${confBadge(cf.monthly)}</span><span><b>${p.totals.minPerWeek}</b>min a week${confBadge(cf.care)}</span><span><b>${cf.setupHours}</b>h to set up${confBadge(cf.setup)}</span></div>
${p.phases ? `<div class="sgPhases"><b>Buy in two phases</b><div>Phase 1, ${usd(p.phases.phase1Usd)} now: ${esc(p.phases.phase1.join(', '))}.</div><div>Phase 2, ${usd(p.phases.phase2Usd)} after the tank has cycled: ${esc(p.phases.phase2.join(', ') || 'the animals')}.</div><div class="spNote">${esc(p.phases.note)}</div></div>` : ''}
<div class="spNote">Rhythm: ${esc(rh.text)} (estimate)${rh.awayText ? `. Can be left: ${esc(rh.awayText)}.` : ''}</div>
${p.ownedNotes.map(n => `<div class="${n.kind === 'credit' ? 'spNote' : 'spWarn'}">${esc(n.text)}</div>`).join('')}
${p.matched.length ? `<div class="spNote">Matches: ${p.matched.map(m => esc(TAGS.find(t => t.id === m)!.label.toLowerCase())).join(', ')}</div>` : ''}
${checks ? `<ul class="bpGear sgChecks">${checks}</ul>` : ''}
${p.capNote ? `<div class="spNote">${esc(p.capNote)}</div>` : ''}
${tasteWhy(tasteOf(getBrief()), b.finish?.style) ? `<div class="spNote sgTaste">${esc(tasteWhy(tasteOf(getBrief()), b.finish?.style)!)}</div>` : ''}
${p.unknown.length ? `<div class="spNote">Not enough information: ${esc(p.unknown[0])}</div>` : ''}
<div class="spNote">${b.setup.water.on ? `${esc(CYCLE_NOTE)} ` : ''}${b.finish ? `${esc(TIER_LABEL[b.finish.tier])}: the look, substrate, hardscape and plants are in the price and the time.` : ''}</div>
<button type="button" class="primary" data-act="pick" data-i="${i}" title="Make it mine: it opens in the editor, where you can add or remove anything (Undo steps back)">I like this one</button> <button type="button" data-act="narrow" data-i="${i}" title="Show variations of this one, each changing one thing">More like this</button> <button type="button" data-act="plan" data-i="${i}">Build plan</button></li>`;
  };

  /** The refinement chips (lane U6): one click edits the brief (locks kept) and the setups are worked out again; an applied wish can be switched back off. */
  const chipRow = () => {
    if (!res?.proposals.length || (narrow && narrow.rounds.length > 1)) return '';
    const b = getBrief(), on = (valueOf(b, 'preferences.wishes') ?? []).filter(w => w === 'more-planted' || w === 'larger-tank');
    const WORD: Record<string, string> = { 'more-planted': 'More planted', 'larger-tank': 'Larger tank' };
    return `<div class="sgChips" role="group" aria-label="Refine these setups"><span class="spNote">Refine:</span>${chipsFor(b, res).map(c => `<button type="button" class="sgChip" data-chip="${c.id}">${esc(c.label)}</button>`).join('')}${on.map(w => `<button type="button" class="sgChip on" data-drop="${w}" title="Switch off">${WORD[w]} âœ“</button>`).join('')}</div>${refineLine ? `<div class="spNote sgRefined" role="status">${esc(refineLine)}</div>` : ''}`;
  };

  /** The "what changed" strip (lane NG3): the edit that moved, then what it bought. */
  const stripHtml = () => strip ? `<div class="sgChange" id="sgChange" role="status"><b>What changed:</b> ${esc(strip.text)}${strip.lines.map(l => ` <span class="spNote">${esc(l)}.</span>`).join('')}</div>` : '';

  /** The narrowing trail (lane GV6): the round, the picks so far (oldest first), Back to the previous round, and the current anchor with its own "I like this one". */
  const trailHtml = () => {
    if (!narrow || narrow.rounds.length < 2) return res?.proposals.length ? `<p class="spNote sgRound">Round 1: pick the one you like most and we show variations of it, or take it as it is.</p>` : '';
    const picks = picksOf(narrow), a = cur()!.anchor!;
    return `<div class="sgChips sgTrail" role="navigation" aria-label="Your picks"><button type="button" data-act="back">&larr; Back</button><span class="spNote">Round ${narrow.rounds.length}: ${picks.map(p => esc(p.variation?.label ?? p.archetype.title)).join(' &rsaquo; ')}</span></div>
<div class="sgAnchor"><span class="spNote">Your pick: <b>${esc(a.archetype.title)}</b>, ${esc(tankLabel(a.build.tank, units()))}, ${usd(a.totals.startupUsd)} set-up, ${usd(a.totals.monthlyUsd)} a month, ${a.totals.minPerWeek} min a week.</span> <button type="button" class="primary" data-act="pickAnchor">I like this one</button></div>
${cur()!.options.length ? '<p class="spNote">Each variation changes one thing and keeps the rest; all fit your limits.</p>' : '<p class="spWarn">No variation of this one fits your limits: take it as it is, or go back.</p>'}`;
  };

  const draw = () => {
    const scroll = el.scrollTop, k = lenU(), nOwned = Object.keys(f.owned).length;
    let out = '';
    if (res) {
      if (res.proposals.length) out = `<p class="spNote">${esc(res.off ? 'No guardrail is on, so these are ranked by what you picked below, not checked against a limit.' : 'Each one passes every guardrail you switched on and the animals\' care checks. Prices are expected costs; minutes are estimates.')}</p>
${res.note ? `<p class="spWarn sgNote">${esc(res.note)}</p>` : ''}${futureHtml(getBrief())}${stripHtml()}${chipRow()}${trailHtml()}<ul class="bpCards">${shownNow().map(card).join('')}</ul>`;
      else if (res.infeasible) out = infeasibleCard(res.infeasible, getBrief());
      else out = `<p class="spWarn" id="sgNone">${esc(res.message ?? res.unavailable ?? '')}</p>`;
      if (res.misses.length && !res.unavailable) out += `<div class="sgMiss"><b>Closest, if you raise a limit</b> (these do not fit your guardrails as set)<ul>${res.misses.map(m => `<li>${esc(m.archetype.title)}: ${esc(m.text)}</li>`).join('')}</ul></div>`;
    }
    el.innerHTML = `<div class="spHead"><h2>Fill in what I left open</h2><button type="button" data-act="close" aria-label="Close">âœ•</button></div>
<p class="spNote">Your setup brief (the bar above) already holds what you told us; fill in or change the rest here. Tick the limits that matter to you and we propose setups that fit them, each checked against all of them and against what the animals need. Leave a box empty to keep that limit off.</p>
<div class="sgCard">
<fieldset class="sgKinds"><legend>What kind of setup?</legend>${KINDS.map(k => `<label><input class="sgKind" type="checkbox" value="${k.id}" ${f.kinds.includes(k.id) ? 'checked' : ''}> ${k.label} <span class="spNote">${k.blurb}</span></label>`).join('')}
${asksDryGroups(f.kinds) ? `<div class="sgSub" role="group" aria-label="Terrarium and vivarium animals"><span class="spNote">For a terrarium or vivarium, which animals?</span>${DRY_GROUPS.map(g => `<label><input class="sgGroup" type="checkbox" value="${g.id}" ${f.groups.includes(g.id) ? 'checked' : ''}> ${g.label}</label>`).join('')}</div>` : ''}
${f.kinds.length ? '' : '<div class="spWarn">Tick at least one kind.</div>'}</fieldset>
${lockedStock(getBrief()).length ? `<div class="spNote sgLocked">Locked animals: ${lockedStock(getBrief()).map(a => `${a.n} ${esc(speciesOf(a.species)?.name ?? a.species)}`).join(', ')}. They stay as you chose them; the limits below are checked against them.</div>` : ''}
<label class="sgRow"><span>Set-up budget ($)</span><input id="sgStartup" type="number" min="0" step="10" inputmode="decimal" value="${esc(f.startup)}" placeholder="no limit"></label>
<label class="sgRow"><span>Monthly budget ($ a month)</span><input id="sgMonthly" type="number" min="0" step="1" inputmode="decimal" value="${esc(f.monthly)}" placeholder="no limit"></label>
<label class="sgRow"><span>Care time (min a week)</span><input id="sgTime" type="number" min="0" step="5" inputmode="decimal" value="${esc(f.time)}" placeholder="no limit"></label>
<div class="sgRow"><label><input id="sgSpaceOn" type="checkbox" ${f.spaceOn ? 'checked' : ''}> Space (${k})</label><span class="sgSp"><input id="sgW" type="number" min="0" aria-label="Width" value="${esc(f.w)}" placeholder="wide"> x <input id="sgD" type="number" min="0" aria-label="Depth" value="${esc(f.d)}" placeholder="deep"></span></div>
<label class="sgRow"><span><input id="sgNeedStand" type="checkbox" ${f.needStand ? 'checked' : ''}> I'll need a stand</span></label>
<details class="sgOwned"${nOwned ? ' open' : ''}><summary>Equipment I already have${nOwned ? ` (${nOwned})` : ''}</summary><div class="sgOwnList">${OWNED.map(o => { const on = o.id in f.owned, pick = f.owned[o.id] ?? PICK_CARE;
  return `<div class="sgOwnRow"><label><input class="sgOwn" type="checkbox" value="${o.id}" ${on ? 'checked' : ''}${o.id === 'stand' && !f.needStand ? ' disabled' : ''}> ${o.label}</label>${on ? `<select class="sgOwnPick" data-k="${o.id}" aria-label="Which ${esc(o.label.toLowerCase())}"><option value="${PICK_CARE}"${pick === PICK_CARE ? ' selected' : ''}>I don't care</option><option value="${PICK_UNKNOWN}"${pick === PICK_UNKNOWN ? ' selected' : ''}>I don't know</option>${o.products ? `<optgroup label="From the catalogue">${o.products().map(p => `<option value="${p.id}"${pick === p.id ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</optgroup>` : ''}</select>` : ''}</div>`; }).join('')}</div><div class="spNote">Pick the real one and it is credited at its real size (too small and we say so and price a new one). "I don't care": $0, the setup's own is assumed to suit it. "I don't know": priced as bought, with a note to check yours.</div></details>
<label class="sgRow"><span><input id="sgHigh" type="checkbox" ${valueOf(getBrief(), 'preferences.hightech') ? 'checked' : ''}> High-tech planted tank (CO2, strong light)</span></label>
<label class="sgRow"><span><input id="sgPhased" type="checkbox" ${valueOf(getBrief(), 'constraints.phased') ? 'checked' : ''}> Buy in phases (animals later, after the tank has cycled)</span></label>
<div class="sgTags" role="group" aria-label="What appeals to you">${TAGS.map(t => `<button type="button" class="sgTag${tags.has(t.id) ? ' on' : ''}" data-tag="${t.id}" aria-pressed="${tags.has(t.id)}">${t.label}</button>`).join('')}</div>
<button type="button" class="primary" data-act="go">Show me setups</button>${note ? `<div class="spWarn">${esc(note)}</div>` : ''}
</div>${out}`;
    el.scrollTop = scroll;
  };

  /** One picture per proposal: show it in the main viewer, take the picture, then roll the editor back to the tank the person had. */
  const shoot = (list: Proposal[]) => {
    const was = el.hidden, m = store.mark; el.hidden = true;
    pics = list.map(p => { store.update(s => { putTank(s.tanks[s.active], placedSetup(p.build)); }, { coalesce: 'suggest' }); return viewer.thumbnail(720); });
    store.rollback(m); el.hidden = was;
  };

  const go = (live = false) => {
    readFields();
    const w = wantsFrom(f, units());
    note = '';
    // what was filled in here goes back into the brief, so every entry point shows it
    editBrief(b => { const c = w.constraints; let n = setMonthly(setBudget(b, c.startupUsd?.on ? c.startupUsd.value : undefined), c.monthlyUsd?.on ? c.monthlyUsd.value : undefined); n = setCareTime(n, c.minutesPerWeek?.on ? c.minutesPerWeek.value : undefined); return w.space ? setSpace(n, w.space, units()) : n; });
    const hi = !!el.querySelector<HTMLInputElement>('#sgHigh')?.checked, ph = !!el.querySelector<HTMLInputElement>('#sgPhased')?.checked;
    editBrief(b => { let n = hi ? setItem(b, 'preferences.hightech', true, 'hard') : clearItem(b, 'preferences.hightech'); n = ph ? setItem(n, 'constraints.phased', true, 'hard') : clearItem(n, 'constraints.phased'); return Object.keys(w.owned).length ? setItem(n, 'constraints.owned', { ...w.owned }, 'hard') : clearItem(n, 'constraints.owned'); });
    if (!w.kinds.length) { note = 'Tick at least one kind of setup.'; res = undefined; draw(); return; }
    if (w.spaceMissing) { note = 'Enter the width and depth of your space, or untick Space.'; res = undefined; draw(); return; }
    const before = res, asked = inputsOf(wantsAsked(w), getBrief());
    muted = true; try { res = generate(w); } finally { muted = false; }
    strip = live && lastAsk ? changeStrip(lastAsk, asked, before, res) : undefined; lastAsk = asked;
    refineLine = ''; cardLines = []; pics = [];
    if (res.proposals.length) shoot(res.proposals);
    narrow = narrowStart(res.proposals); roundPics = [pics];
    draw();
    el.querySelector('.bpCards, #sgNone')?.scrollIntoView?.({ block: 'nearest' });
  };

  /** The Wants the generator is given, for the diff (the same call `generate` makes). */
  const wantsAsked = (w: ReturnType<typeof wantsFrom>) => { const bw = briefToWants(getBrief()); return { kinds: w.kinds, constraints: w.constraints, ...(bw.setupHours !== undefined ? { setupHours: bw.setupHours } : {}), ...(bw.animals ? { animals: bw.animals } : {}), ...(bw.ownTank ? { ownTank: bw.ownTank } : {}), owned: w.owned }; };

  /** The generator call from the boxes plus what the brief holds that this panel has no box for: locked animals, an existing tank, tax, the high-tech, phased and refinement choices. */
  const generate = (w: ReturnType<typeof wantsFrom>): Suggestions => {
    const bw = briefToWants(getBrief());
    return suggestSetups(asked = { kinds: w.kinds, groups: w.groups, needStand: w.needStand, owned: w.owned, constraints: w.constraints, ...(w.space ? { space: w.space } : {}), tags: [...tags],
      ...(bw.taste ? { taste: bw.taste } : {}), // lane NG5 hook: ranking only
      ...(bw.animals ? { animals: bw.animals } : {}), ...(bw.ownTank ? { ownTank: bw.ownTank } : {}), ...(bw.taxPct !== undefined ? { taxPct: bw.taxPct } : {}), ...(bw.hightech ? { hightech: true } : {}), ...(bw.phased ? { phased: true } : {}), ...(bw.lowtech ? { lowtech: true } : {}), ...(bw.planted ? { planted: true } : {}), ...(bw.larger ? { larger: true } : {}), ...(bw.mins ? { mins: bw.mins } : {}), ...(bw.tankGal ? { tankGal: bw.tankGal } : {}), ...(briefToWants(getBrief()).setupHours !== undefined ? { setupHours: briefToWants(getBrief()).setupHours! } : {}), ...(targetOf(getBrief(), 'constraints.setupHours') !== undefined ? { setupHoursTarget: targetOf(getBrief(), 'constraints.setupHours')! } : {}), ...(targetOf(getBrief(), 'constraints.budget') !== undefined ? { startupTarget: targetOf(getBrief(), 'constraints.budget')! } : {}) }, loadProfile(), units());
  };

  /** One click on a chip: edit the brief, run the generator on it, keep the old setups when the edit leaves none (the brief goes back too). */
  const takeChip = (c: Chip) => {
    const before = res; if (!before) return;
    readFields();
    const old = getBrief(), keep = new Set(tags), kinds = f.kinds, groups = f.groups, stand = f.needStand, oldPics = pics;
    const restore = () => { seed(); f = { ...f, kinds, groups, needStand: stand }; tags = new Set(keep); };
    const r = refine(old, c, before, nb => { editBrief(() => nb); restore(); return generate(wantsFrom(f, units())); });
    if (!r.ok) editBrief(() => old);
    restore(); res = r.result; refineLine = r.line; cardLines = r.cards;
    if (r.ok && !r.unchanged) { pics = []; shoot(res.proposals); } else pics = oldPics;
    narrow = narrowStart(res.proposals); roundPics = [pics];
    draw();
  };

  /** Picks and passes teach taste (demand/taste.ts, ranking only); the brief edit is muted so the live loop does not re-run Suggest over the rounds. */
  const teach = (options: Proposal[], i: number) => { const ev = narrowTaste(options, i); if (!ev.length) return; muted = true; try { editBrief(b => ev.reduce((n, e) => recordTaste(n, e), b)); } finally { muted = false; } };

  /** "More like this": the pick anchors a new round of its variations (one axis each, all inside the limits). */
  const narrowOn = (i: number) => {
    if (!narrow || !asked) return;
    const opts = shownNow(); if (!opts[i]) return;
    teach(opts, i);
    const w = asked;
    narrow = narrowPick(narrow, i, a => variationsOf(a, w, loadProfile(), units()));
    pics = []; shoot(cur()!.options); roundPics = [...roundPics, pics];
    draw(); el.querySelector('.sgTrail')?.scrollIntoView?.({ block: 'nearest' });
  };
  /** Back: the previous round as it was, pictures and all. */
  const back = () => { if (!narrow || narrow.rounds.length < 2) return; narrow = narrowBack(narrow); roundPics = roundPics.slice(0, narrow.rounds.length); pics = roundPics[roundPics.length - 1] ?? []; draw(); };

  /** "I like this one" -> make it mine: the option opens in the editor (the brief stays with the tank; Undo steps back). i = -1: the current round's anchor. */
  const pick = (i: number) => {
    const opts = shownNow(), p = i < 0 ? cur()?.anchor : opts[i]; if (!p) return;
    if (i >= 0) teach(opts, i);
    const T = makeItMine(store, p); close();
    const c = compliance(T, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, loadProfile().limits, units());
    status(`${p.archetype.title} is yours to edit: ${usd(p.totals.startupUsd)} set-up, ${usd(p.totals.monthlyUsd)} a month. ${c.line}. Add or remove anything; Undo steps back.`);
  };

  /** One click on an alternative: write its edit into the brief (locks kept), refill the boxes from the brief, run the generator again. */
  const takeAlt = (i: number) => {
    const a = res?.infeasible?.alternatives[i]; if (!a?.edit) return;
    const keep = new Set(tags), kinds = f.kinds, groups = f.groups, stand = f.needStand;
    const e = a.edit; editBrief(b => applyAlternative(b, e));
    seed(); f = { ...f, kinds, groups, needStand: stand }; tags = keep; draw(); go();
  };
  el.onclick = e => {
    const alt = (e.target as HTMLElement).closest<HTMLElement>('[data-alt]'); if (alt) { takeAlt(+(alt.dataset.alt ?? -1)); return; }
    const ch = (e.target as HTMLElement).closest<HTMLElement>('[data-chip],[data-drop]');
    if (ch?.dataset.chip && res) { const c = chipsFor(getBrief(), res).find(x => x.id === ch.dataset.chip); if (c) takeChip(c); return; }
    if (ch?.dataset.drop) { editBrief(b => dropWish(b, ch.dataset.drop as Wish)); readFields(); go(); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-tag]'); if (!t) return;
    if (t.dataset.tag) { readFields(); const id = t.dataset.tag as Tag; tags.has(id) ? tags.delete(id) : tags.add(id); draw(); return; }
    switch (t.dataset.act) { case 'close': close(); break; case 'go': go(); break; case 'pick': pick(+(t.dataset.i ?? -1)); break; case 'pickAnchor': pick(-1); break; case 'narrow': narrowOn(+(t.dataset.i ?? -1)); break; case 'back': back(); break; case 'plan': { const q = shownNow()[+(t.dataset.i ?? -1)]; if (q) openBuildPlan(q, loadProfile()); break; } }
  };
  el.onchange = e => { if ((e.target as HTMLElement).id === 'sgNeedStand' || (e.target as HTMLElement).classList.contains('sgKind') || (e.target as HTMLElement).classList.contains('sgOwn')) { readFields(); draw(); } };
  el.onkeydown = e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') go(); };

  /** Live loop (lane NG3): a brief edit made elsewhere (bar, welcome, tank) or a box edited here re-runs Suggest ~400 ms later, locks and direction kept
   *  (the brief's dialog is never touched here); nothing re-runs when what the generator would be asked has not changed. */
  const live = (fromBrief: boolean) => {
    if (muted || el.hidden || !res || !lastAsk) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (el.hidden || !res) return;
      if (fromBrief) { const keep = new Set(tags), kinds = f.kinds, groups = f.groups, stand = f.needStand, r0 = res, p0 = pics, a0 = lastAsk, s0 = strip, n0 = narrow, rp0 = roundPics; seed(); f = { ...f, kinds, groups, needStand: stand }; tags = keep; res = r0; pics = p0; lastAsk = a0; strip = s0; narrow = n0; roundPics = rp0; draw(); } // the boxes are redrawn from the brief, or go() would read the stale ones back over it
      else readFields();
      const w = wantsFrom(f, units());
      if (!w.kinds.length || w.spaceMissing) return;
      if (JSON.stringify(inputsOf(wantsAsked(w), getBrief())) === JSON.stringify(lastAsk)) { if (fromBrief) draw(); return; }
      go(true);
    }, LIVE_MS);
  };
  onBrief(() => live(true));
  el.oninput = e => { const t = e.target as HTMLElement; if (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'number') live(false); };

  const open = () => { seed(); lastAsk = undefined; strip = undefined; side(true); el.hidden = false; draw(); el.querySelector<HTMLInputElement>('#sgStartup')?.focus(); };
  return { open, close };
}
