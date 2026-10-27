// The demand panel (lane KK phase 4): three live readouts for the current tank (money, time, risk), in Quick Setup. Each is an
// one expected number per bar; limits turn a bar red; a click lists what drives it and which swap lowers it.
// Computed when the scene settles (debounced), never per frame. The profile (skill, water, kWh rate, limits) is an app pref.
import { defaultProfile, demandOf, drivers, limitState, type LimitState, type UserProfile } from '../demand';
import { swapsFor, type Bar } from '../demand/swaps';
import type { Demand } from '../demand';
import type { Store } from '../scene/store';
import { dealOffers } from '../demand/deals';
import { dealDrift, onSceneLoad, pinnedDeal, pinnedKit, pinnedPreset, presetDrift, unpinDeal } from '../demand/pinned';
import { partList, type PricedPart } from '../demand/dealdrift';
import type { TankSetup } from '../scene/types';
import { showPriceNotice } from './priceNotice';
import { DEAL_NOTE, NOT_SPONSORED, dealGuesses, savingLine, type Deal } from '../data/deals';
import { renderDealMatch } from './dealMatch';
import { GEAR_SLOT_NAME, gearOffers, gearParts, pinGear, pinnedGear, unpinGear } from '../demand/gearDeals';
import { GEAR_DEALS, gearPctOff } from '../data/gearDeals';
import { compliance, constraintsFromLimits, effectiveLimits, parseConstraints, rememberLastUsed, type Cap, type Constraints } from '../scene/constraints';
import { summaryOf } from './stockSummary';
import { findSolutions, type Option, type Solutions } from '../demand/makefit';
import { lidAdvice, type LidAdvice } from '../demand/lid';
import { rhythmNote, rhythmOf } from '../demand/rhythm';

const KEY = 'tanklook.demand';
const DOMAIN_LABEL: [keyof UserProfile['skill'], string][] = [['fundamentals', 'Keeping a tank at all'], ['fish', 'Freshwater fish'], ['planted', 'Planted tanks'], ['salt', 'Saltwater'], ['terrarium', 'Terrariums']];
const SKILL = ['New to it', 'Some experience', 'Experienced'];
const BARS: { bar: Bar; title: string; tip: string }[] = [
  { bar: 'setup', title: 'To set up', tip: 'What it costs to buy everything in this tank once.' },
  { bar: 'upkeep', title: 'Upkeep a month', tip: 'Power, water, food, filter parts, and replacing what dies.' },
  { bar: 'minutes', title: 'Time a week', tip: 'Minutes a week on average, yearly jobs included.' },
  { bar: 'risk', title: 'Relative difficulty', tip: 'How hard this tank is likely to be for your experience: the animals and plants you chose, and any problems in the plan (listed with their fixes). Easy under 3, moderate under 6, demanding above.' },
];
const usd = (v: number) => '$' + Math.round(v).toLocaleString();
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function load(): UserProfile {
  const d = defaultProfile();
  try { const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<UserProfile> | null; if (j) { const { budgetMode: _old, ...limits } = (j.limits ?? {}) as Partial<UserProfile['limits']> & { budgetMode?: string }; return { ...d, ...j, skill: { ...d.skill, ...j.skill }, limits }; } } catch { /* ignore */ } // an old save's budgetMode is dropped, the number kept
  return d;
}

export function attachDemandPanel(store: Store, mount: HTMLElement) {
  let sol: Solutions | null = null, P = load(), D: Demand | null = null, B: Demand | null = null, lid: (LidAdvice & { usd: number }) | null = null, open: Bar | null = null, timer = 0;
  /** What the last edit moved each bar by, shown as a chip for a few seconds so a change is seen as it happens. */
  let prev: Record<Bar, number> | null = null, chips: Partial<Record<Bar, { d: number; until: number }>> = {}, chipTimer = 0;
  /** The profile with this tank's guardrails in place of its limits (a tank with none keeps the browser profile's limits). */
  const Pe = (): UserProfile => ({ ...P, limits: effectiveLimits(store.tank, P.limits) });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* ignore */ } };
  const OPEN_KEY = 'tanklook.demandOpen';
  let shown = (() => { try { const v = localStorage.getItem(OPEN_KEY); if (v !== null) return v === '1'; } catch { /* ignore */ } return window.innerWidth > 900; })();
  mount.innerHTML = `<div class="dm"><button type="button" class="dmtog" aria-expanded="true" title="Show or hide what this tank costs and asks of you; it updates as you edit"><span class="dmhead">What this tank asks of you</span><span class="dmsum"></span><span class="dmcaret" aria-hidden="true">▾</span></button>
    <div class="dmbody"><div class="dmmode"></div><div class="dmbars"></div><div class="dmlid" hidden></div><div class="dmdeals" style="font-size:11px;opacity:.85"></div><div class="dmdrill" hidden></div>
    <details class="dmset dmguard"><summary>Guardrails</summary><div class="dmlimits"></div></details>
    <div class="dmcomp" role="status"></div><div class="dmsol" hidden></div>
    <details class="dmset"><summary>Your situation</summary><div class="dmsit"></div></details></div></div>`;
  const q = <T extends HTMLElement>(s: string) => mount.querySelector(s) as T;
  const bars = q('.dmbars'), drill = q('.dmdrill'), tog = q('.dmtog'), body = q('.dmbody');
  const setShown = (v: boolean) => {
    shown = v; body.hidden = !v; tog.setAttribute('aria-expanded', String(v)); mount.classList.toggle('closed', !v);
    try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };
  tog.onclick = () => setShown(!shown);
  setShown(shown);

  function recompute() {
    const S = store.tank;
    sol = null; // a result is for the scene it was found on
    const kit = pinnedKit(S, store.scene.active, P);
    const parts = gearParts(S);
    D = demandOf(S, P, { kit, parts });
    // the same tank without its animals: what keeping just the plants (or the bare tank) costs, so adding animals reads as a jump from it
    B = S.fish.length ? demandOf({ ...S, fish: [] }, P, { kit, parts }) : null;
    // animals that get out of an open top: suggest the lid, with what adding it costs (not counted until it is added)
    const adv = lidAdvice(S);
    lid = adv ? { ...adv, usd: demandOf({ ...S, lid: adv.lid }, P, { kit, parts }).totals.setupUsd - D.totals.setupUsd } : null;
    const now = { setup: D.totals.setupUsd, upkeep: D.totals.upkeepUsdMo, minutes: D.totals.minPerWeek, risk: D.totals.risk };
    if (prev) {
      const T: Record<Bar, number> = { setup: 1, upkeep: 0.5, minutes: 0.5, risk: 0.05 }, until = Date.now() + 6000;
      for (const b of Object.keys(now) as Bar[]) { const d = now[b] - prev[b]; if (Math.abs(d) >= T[b]) chips[b] = { d, until }; }
      clearTimeout(chipTimer); chipTimer = window.setTimeout(render, 6100);
    }
    prev = now;
    render();
  }
  const soon = () => { clearTimeout(timer); timer = window.setTimeout(recompute, 150); };
  // an edit to a part the starting price covers: say once that the bundle (or the preset's sale) no longer applies; undo restores it
  let lost = '', warned: object | null = null, limitsReady = false;
  /** After a change to a bundled part: is the bundle still bought, with the new part on top? (pinnedKit picks the cheaper way) */
  const keepsBundle = (S: TankSetup, i: number, pin: Deal, drift: PricedPart[]) => !!drift.length && pinnedKit(S, i, P)?.id === pin.id;
  const checkStartPrice = (quiet = false) => {
    const S = store.tank, i = store.scene.active, pin = pinnedDeal(S), drift = dealDrift(S, i), key = drift.join();
    if (pin && key && !lost && !quiet) showPriceNotice(keepsBundle(S, i, pin, drift)
      ? `You already have a ${esc(partList(drift))} from the bundle, buying ${drift.length > 1 ? 'these' : 'this one'} will cost extra.`
      : `You changed the ${esc(partList(drift))}, so this is no longer the ${esc(pin.retailer + ' ' + pin.name)} bundle: ${drift.includes('tank') ? 'the bundle is that tank, so' : 'buying the bundle and your new part on top would cost more, so'} the bundle discount (${usd(pin.price.usd)}) no longer applies and each part is priced on its own.`, () => store.undo());
    lost = key;
    const ps = pinnedPreset(), pd = presetDrift(S, i);
    if (ps && pd && warned !== ps && !quiet) showPriceNotice(`You changed the tank size, so this is no longer the ${esc(ps.product)} on sale at ${esc(ps.retailer)} (${usd(ps.usd)}): that price no longer applies.`, () => store.undo());
    if (pd) warned = ps; else if (warned === ps) warned = null;
  };
  store.subscribe(kind => {
    // undo / redo keeps the starting price and says nothing: undoing the change that broke a bundle prices the bundle again
    if (kind === 'load' && store.loadedBy === 'history') checkStartPrice(true);
    else if (kind === 'load') { onSceneLoad(store.scene.active, store.tank); lost = ''; warned = null; limitsReady && limits(); }
    if (kind === 'scene') checkStartPrice();
    if (kind === 'scene' || kind === 'load') soon();
  });

  function render() {
    if (!D) return;
    const L = limitState(D, Pe());
    bars.innerHTML = '';
    for (const b of BARS) bars.append(row(b, L));
    const S = store.tank, nA = S.fish.length, nP = S.items.filter(i => i.kind === 'plant' || i.kind === 'coral').length;
    q('.dmmode').textContent = nA ? `With ${nA} animal${nA > 1 ? 's' : ''}${B ? `; without them: ${usd(B.totals.setupUsd)} to set up, ${usd(B.totals.upkeepUsdMo)} a month` : ''}`
      : nP ? 'Plants only: what it costs to keep this planted tank running. Add animals and watch it climb.' : 'Empty tank: the gear and upkeep before anything lives in it.';
    q('.dmsum').textContent = `${usd(D.totals.setupUsd)} · ${usd(D.totals.upkeepUsdMo)}/mo · ${Math.round(D.totals.minPerWeek)} min/wk · difficulty ${D.totals.risk.toFixed(1)}`;
    renderCompliance();
    renderLid();
    renderDeals();
    drill.hidden = !open;
    if (open) fillDrill(open);
  }

  /** The compliance line (C2): amber under the Guardrails controls and a small header chip. It never interrupts an edit; welfare (stocking) is separate. */
  const chip = document.getElementById('guardChip') as HTMLButtonElement | null;
  function renderCompliance() {
    const S = store.tank, rhy = D ? rhythmOf(D, S) : undefined, c = compliance(S, D?.totals, Pe().limits, store.scene.units, rhy), el = q('.dmcomp');
    let welfare = '';
    try { const w = S.fish.length ? summaryOf(S, store.scene.units) : null; if (w && w.worst === 'problem') welfare = `Welfare: ${w.cats.filter(k => k.level === 'problem').map(k => k.label).join(', ')} has a problem (see the stocking summary). Guardrails do not change that.`; } catch { /* ignore */ }
    const cls = c.overall === 'within' ? 'ok' : c.overall === 'off' ? 'off' : 'warn';
    el.className = 'dmcomp ' + cls;
    el.innerHTML = `<div>${esc(c.line)}</div>` + (c.overall === 'over' && c.unknown ? `<div>${esc(c.results.filter(r => r.state === 'unknown').map(r => r.text).join('; '))} (unknown)</div>` : '')
      + (c.overall === 'within' && welfare ? `<div>Within your guardrails does not mean the stocking is fine.</div>` : '') + (welfare ? `<div class="dmwelf">${esc(welfare)}</div>` : '')
      + (c.overall === 'over' ? `<button type="button" class="dmfind" title="Try a few changes on a copy of this tank and check each against all your guardrails and the animals' needs">Find solutions</button>` : '');
    el.querySelector('.dmfind')?.addEventListener('click', () => { const S2 = store.tank; sol = findSolutions(S2, Pe(), { demand: { kit: pinnedKit(S2, store.scene.active, P), parts: gearParts(S2) }, units: store.scene.units, previous: store.previousTank }); renderSolutions(); });
    renderSolutions();
    if (chip) {
      chip.hidden = c.overall === 'off'; chip.className = 'guardchip ' + cls;
      chip.textContent = c.overall === 'within' ? 'Within guardrails' : c.overall === 'over' ? `${c.over} over` : 'Guardrails: unknown';
      chip.title = c.line + (welfare ? ' ' + welfare : '') + ' Click to open the Guardrails.';
    }
  }
  /** The Find solutions card (C3): fully compliant options first, those that need a limit raised apart; every enabled limit shown per option. */
  function renderSolutions() {
    const el = q('.dmsol');
    el.hidden = !sol || sol.status !== 'over';
    if (!sol || sol.status !== 'over') return;
    const sgn = (v: number, f: (n: number) => string) => (v < 0 ? '−' : '+') + f(Math.abs(v));
    const deltas = (o: Option) => [Math.abs(o.delta.startupUsd) >= 1 ? `${sgn(o.delta.startupUsd, usd)} set-up` : '', Math.abs(o.delta.monthlyUsd) >= 0.5 ? `${sgn(o.delta.monthlyUsd, usd)}/mo` : '',
      Math.abs(o.delta.minPerWeek) >= 0.5 ? `${sgn(o.delta.minPerWeek, n => Math.round(n) + ' min/wk')}${o.estimate ? ' (estimate)' : ''}` : ''].filter(Boolean).join(', ') || 'no change in cost or time';
    const need = (o: Option) => [o.needs.startupUsd ? `+${usd(o.needs.startupUsd)} set-up` : '', o.needs.monthlyUsd ? `+${usd(o.needs.monthlyUsd)}/mo` : '', o.needs.minPerWeek ? `+${o.needs.minPerWeek} min/wk` : ''].filter(Boolean).join(', ');
    const card = (o: Option, relax: boolean) => `<div class="dmopt"><b>${esc(o.title)}</b><div class="dmoptd">${esc(o.detail)}</div><div>${esc(deltas(o))}</div>
      <ul class="dmoptst">${o.status.map(r => `<li class="${r.state}">${r.state === 'pass' ? '✓' : r.state === 'over' ? '✗' : '?'} ${esc(r.label)}: ${esc(r.text)}</li>`).join('')}</ul>
      ${relax ? `<div class="dmneeds">Needs ${esc(need(o))} on your limit</div>` : ''}${o.newUnknown.length ? `<div class="dmoptd">Not enough information to check: ${esc(o.newUnknown[0])}</div>` : ''}
      <button type="button" class="dmapply" data-opt="${esc(o.id)}">Apply</button></div>`;
    const all = [...sol.compliant, ...sol.needsRelaxing];
    el.innerHTML = `<div class="dmsolh">Find solutions <button type="button" class="dmsolx" aria-label="Close">×</button></div>`
      + (sol.compliant.length ? `<div class="dmsolg">Fits all your guardrails and the animals' needs</div>${sol.compliant.map(o => card(o, false)).join('')}` : `<div class="dmnone">${esc(sol.message ?? '')}</div>`)
      + (sol.needsRelaxing.length ? `<div class="dmsolg">${sol.compliant.length ? 'Needs a limit raised' : 'Closest, each needs a limit raised'}</div>${sol.needsRelaxing.map(o => card(o, true)).join('')}` : '')
      + (!sol.compliant.length ? `<div class="dmoptd">You can also undo, change the animals yourself, or raise a limit. These figures are estimates and the search tries only a few changes.</div>` : '')
      + (sol.rejected.length ? `<div class="dmsolg">Tried, but not suitable</div><ul class="dmoptst">${sol.rejected.map(r => `<li>${esc(r.title)}: ${esc(r.reason)}</li>`).join('')}</ul>` : '');
    el.querySelector('.dmsolx')?.addEventListener('click', () => { sol = null; renderSolutions(); });
    el.querySelectorAll<HTMLButtonElement>('.dmapply').forEach(b => b.addEventListener('click', () => {
      const o = all.find(x => x.id === b.dataset.opt); if (!o) return;
      store.edit(t => { t.fish = structuredClone(o.scene.fish); t.items = structuredClone(o.scene.items); t.tank = structuredClone(o.scene.tank); if (o.scene.tech) t.tech = structuredClone(o.scene.tech); else delete t.tech; if (o.scene.product) t.product = o.scene.product; else delete t.product; });
    }));
  }
  chip?.addEventListener('click', () => { setShown(true); (q('.dmguard') as HTMLDetailsElement).open = true; q('.dmguard').scrollIntoView({ block: 'nearest' }); });
  function renderLid() {
    const el = q('.dmlid');
    el.hidden = !lid;
    if (!lid) return;
    const name = lid.lid === 'mesh' ? 'mesh top' : 'glass top';
    el.innerHTML = `${esc(lid.text)} <a href="#" class="dmaddlid">Add a ${name}</a>${lid.usd >= 1 ? ` (about ${usd(lid.usd)})` : ''}`;
    el.querySelector<HTMLAnchorElement>('.dmaddlid')!.addEventListener('click', e => {
      e.preventDefault(); const want = lid?.lid; if (want) store.update(s => { s.tanks[s.active].lid = want; });
    });
  }

  /** Retailer tank+stand bundles that fit this build, with what each saves against buying the parts (data: src/data/deals.json). */
  function renderDeals() {
    const el = q('.dmdeals'), pin = pinnedDeal(store.tank), drift = pin ? dealDrift(store.tank, store.scene.active) : [];
    // priced as a bundle: another deal only counts by what it saves against that bundle (D), not against the parts (lane DM)
    const vsPin = !!pin && (!drift.length || keepsBundle(store.tank, store.scene.active, pin, drift)), offers = dealOffers(store.tank, P).map(o => (vsPin ? { ...o, savingUsd: D!.totals.setupUsd - o.withDealUsd } : o)).filter(o => o.savingUsd > 1).slice(0, 2);
    el.innerHTML = (pin && keepsBundle(store.tank, store.scene.active, pin, drift) ? `<div>Priced as the ${esc(pin.retailer + ' ' + pin.name)} bundle (${usd(pin.price.usd)}) with your own ${esc(partList(drift))} bought on top: cheaper than buying every part separately. <a href="${esc(pin.url)}" target="_blank" rel="noopener">See it at ${esc(pin.retailer)} &#8599;</a> &middot; <a href="#" class="dmunpin">Price the parts instead</a></div>` : pin && drift.length ? `<div style="color:var(--warn)">Not priced as the ${esc(pin.retailer + ' ' + pin.name)} bundle: you changed its ${esc(partList(drift))}. ${drift.includes('tank') ? '' : `Buying the bundle and your ${esc(partList(drift))} on top would cost more than the parts. `}Put ${drift.length > 1 ? 'them' : 'it'} back (Undo) to price the bundle again.</div>` : pin ? `<div>Priced as the ${esc(pin.retailer + ' ' + pin.name)} bundle (${usd(pin.price.usd)}, ${esc(pin.asOf)}). <a href="${esc(pin.url)}" target="_blank" rel="noopener">See it at ${esc(pin.retailer)} &#8599;</a> &middot; <a href="#" class="dmunpin">Price the parts instead</a>${dealGuesses(pin).length ? `<br><i>Guessed: ${esc(dealGuesses(pin).join('; '))}</i>` : ''}</div>` : '') + offers.filter(o => o.deal.id !== pin?.id).map(o => `<div>Deal: <a href="${esc(o.deal.url)}" target="_blank" rel="noopener">${esc(o.deal.retailer + ' ' + o.deal.name)}</a> ${usd(o.deal.price.usd)}${o.deal.price.regularUsd ? ` (was ${usd(o.deal.price.regularUsd)})` : ''}. ${esc(vsPin ? `About ${usd(o.savingUsd)} less than the ${pin!.retailer} bundle` : savingLine(o.deal, o.savingUsd))}${o.deal.est ? ' (estimate)' : ''}${o.deal.saleEnds ? `, sale ends ${esc(o.deal.saleEnds)}` : ''}; ${esc(o.deal.asOf)}</div>`).join('') + (offers.length || pin ? `<div style="opacity:.7">Prices ${esc(DEAL_NOTE)}. ${esc(NOT_SPONSORED)}.</div>` : '');
    el.querySelector<HTMLAnchorElement>('.dmunpin')?.addEventListener('click', e => { e.preventDefault(); unpinDeal(store.tank); recompute(); });
    renderGearDeals(el);
    renderDealMatch(el, store, P, recompute);
  }

  /** Gear on sale at specialist stores that fits this build's light, filter, heater, skimmer or CO2 (lane GD, data:
   *  src/data/gear-deals.json). "Price my ... as this" prices that row at the sale price; the row's typical price comes back on undo-pin. */
  function renderGearDeals(el: HTMLElement) {
    const S = store.tank, pinned = pinnedGear(S), offers = gearOffers(S, D!);
    if (!pinned.length && !offers.length) return;
    const link = (d: { url: string; title: string }) => `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a>`;
    const box = document.createElement('div');
    box.className = 'dmgear';
    box.innerHTML = pinned.map(d => `<div>Your ${GEAR_SLOT_NAME[d.slot]}: ${link(d)} at ${esc(d.store)}, ${usd(d.price.usd)} on sale (was ${usd(d.price.regularUsd)}); ${esc(d.asOf)}. <a href="#" data-unpin="${d.slot}">Price a typical one instead</a></div>`).join('')
      + offers.map(d => `<div>On sale for your ${GEAR_SLOT_NAME[d.slot]}: ${link(d)} at ${esc(d.store)}, ${usd(d.price.usd)} (was ${usd(d.price.regularUsd)}, ${gearPctOff(d)} % off); ${esc(d.asOf)}. <a href="#" data-pin="${esc(d.id)}">Price my ${GEAR_SLOT_NAME[d.slot]} as this</a></div>`).join('')
      + `<div style="opacity:.7">Gear prices ${esc(DEAL_NOTE)}. ${esc(NOT_SPONSORED)}.</div>`;
    box.querySelectorAll<HTMLAnchorElement>('[data-pin]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); const d = GEAR_DEALS.find(x => x.id === a.dataset.pin); if (d) { pinGear(store.tank, d); recompute(); }
    }));
    box.querySelectorAll<HTMLAnchorElement>('[data-unpin]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); unpinGear(store.tank, a.dataset.unpin as keyof typeof GEAR_SLOT_NAME); recompute();
    }));
    el.append(box);
  }

  /** Under the minutes figure: the same minutes as a rhythm, and how long the tank can be left (demand/rhythm.ts; information only). */
  function rhythmLine() {
    const r = rhythmOf(D!, store.tank);
    return `<div class="dmrhythm" style="font-size:11px;opacity:.85" title="${esc(rhythmNote(r))}">Rhythm: ${esc(r.text)} <em>(estimate)</em>${r.awayText ? `<br>Can be left: ${esc(r.awayText)}` : ''}</div>`;
  }

  function row(b: typeof BARS[number], L: LimitState) {
    const el = document.createElement('div'), st = L[b.bar];
    el.className = 'dmrow' + (st.over ? ' over' : '') + (open === b.bar ? ' sel' : '');
    const max = b.bar === 'risk' ? 10 : Math.max(st.value * 1.3, (st.limit ?? 0) * 1.1, 1);
    const x = (v: number) => `${Math.min(100, Math.max(0, v / max * 100)).toFixed(1)}%`;
    let value: string, range: string, track: string;
    if (b.bar !== 'risk') {
      const per = b.bar === 'setup' || b.bar === 'upkeep' ? usd : (v: number) => `${Math.round(v)} min`;
      value = per(st.value); range = '';
      track = `<i class="dmmean" style="left:${x(st.value)}"></i>` + (st.limit !== undefined ? `<i class="dmlim" style="left:${x(st.limit)}"></i>` : '');
      el.title = `${b.tip}
Expected ${per(st.value)}.${st.limit !== undefined ? `
Your limit: ${per(st.limit)}.` : ''}`;
    } else {
      const r = L.risk;
      value = `${D!.totals.risk.toFixed(1)} / 10`; range = r.label === 'safe' ? 'easy' : r.label; // the bar reads as difficulty (Nathan 2026-10-21): safe = easy
      track = `<i class="dmz" style="left:0;width:30%"></i><i class="dmz m" style="left:30%;width:30%"></i><i class="dmz d" style="left:60%;width:40%"></i><i class="dmmean" style="left:${x(D!.totals.risk)}"></i>`;
      el.title = `${b.tip}
Relative to your stated experience (see Your situation).`;
    }
    const base = B ? (b.bar === 'risk' ? B.totals.risk : b.bar === 'setup' ? B.totals.setupUsd : b.bar === 'upkeep' ? B.totals.upkeepUsdMo : B.totals.minPerWeek) : undefined, chip = chips[b.bar];
    if (base !== undefined) track += `<i class="dmbase" style="left:${x(base)}" title="Without the animals"></i>`;
    const dtxt = chip && chip.until > Date.now() ? `<span class="dmchg ${chip.d > 0 ? 'up' : 'down'}">${chip.d > 0 ? '+' : '−'}${b.bar === 'risk' ? Math.abs(chip.d).toFixed(1) : b.bar === 'minutes' ? `${Math.round(Math.abs(chip.d))} min` : usd(Math.abs(chip.d))}</span>` : '';
    el.innerHTML = `<div class="dmtop"><span class="dmname">${b.title}</span><b class="dmval">${esc(value)}</b>${dtxt}<span class="dmrange">${esc(range)}</span></div><div class="dmtrack">${track}</div>${b.bar === 'minutes' ? rhythmLine() : ''}`;
    el.onclick = () => { open = open === b.bar ? null : b.bar; render(); };
    return el;
  }

  function fillDrill(bar: Bar) {
    const dr = drivers(D!, P, bar, 6), S = store.tank, unit = bar === 'setup' || bar === 'upkeep' ? usd : (v: number) => (bar === 'risk' ? v.toFixed(1) : `${Math.round(v)} min`);
    const head = BARS.find(b => b.bar === bar)!.title;
    let h = `<div class="dmdt">What drives “${head}”</div>`;
    for (const r of dr) {
      const sw = r.key.startsWith('animal:') || r.key.startsWith('plant:') ? swapsFor(S, P, r.key, bar, {}, 2) : [];
      h += `<div class="dmitem"><span>${esc(r.label)}${r.n > 1 ? ` ×${r.n}` : ''}</span><b>${unit(r.mean)}</b><span></span></div>`;
      for (const s of sw) h += `<div class="dmswap">${s.kind === 'remove' ? 'Leave them out' : `Swap for <b>${esc(s.to)}</b>`}: ${eff(s.delta)}</div>`;
    }
    if (D!.warnings.length && bar === 'risk') h += `<div class="dmdt">Why</div>` + D!.warnings.slice(0, 8).map(w => `<div class="dmwarn">${esc(w)}</div>`).join('');
    drill.innerHTML = h || '<div class="hint">Nothing in this tank adds to it.</div>';
  }
  const eff = (d: { setup: number; upkeep: number; minutes: number; risk: number }) => [
    `set-up ${sgn(d.setup, usd)}`, `upkeep ${sgn(d.upkeep, usd)}/mo`, `time ${sgn(d.minutes, v => `${Math.round(v)} min`)}`, `risk ${sgn(d.risk, v => v.toFixed(1))}`].join(' · ');
  const sgn = (v: number, f: (n: number) => string) => (f(Math.abs(v)).replace(/[^0-9.]/g, '').replace(/^0+(\.0+)?$/, '') === '' ? 'same' : (v < 0 ? '−' : '+') + f(Math.abs(v)));

  // ---- limits and situation forms
  const lim = q('.dmlimits'), sit = q('.dmsit');
  function limits() {
    const C: Constraints = store.tank.constraints ?? constraintsFromLimits(P.limits), L = P.limits, sp = store.tank.layout.space;
    const capRow = (id: string, label: string, c: Cap | undefined, step: number, unit: string) =>
      `<label class="dmcap"><input type="checkbox" id="${id}On" ${c?.on ? 'checked' : ''}> ${label} <input type="number" min="0" step="${step}" id="${id}" value="${c?.value ?? ''}" ${c?.on ? '' : 'disabled'}> ${unit}</label>`;
    lim.innerHTML = `<div class="hint">Switch a guardrail on to check this tank against it. A limit that is off is never held against the build; its cost and time still show above.</div>`
      + capRow('dmSetup', 'Set-up cost under', C.startupUsd, 10, '$')
      + capRow('dmMonthly', 'Upkeep under', C.monthlyUsd, 5, '$ a month')
      + capRow('dmMin', 'Time under', C.minutesPerWeek, 5, 'minutes a week')
      + `<label class="dmcap"><input type="checkbox" id="dmSpaceOn" ${C.space?.on !== false && sp ? 'checked' : ''} ${sp ? '' : 'disabled'}> Fits my space ${sp ? '' : '<i>(set your space on the fullness tile first)</i>'}</label>
      <label>Difficulty <select id="dmRisk"><option value="any">no limit</option><option value="moderate">moderate at most</option><option value="safe">easy only</option></select></label>
      <label>Care effort (advice only) <select id="dmEffort"><option value="">any</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
      <label>Experience (advice only) <select id="dmExp"><option value="">not said</option>${SKILL.map((t, i) => `<option value="${i}">${t}</option>`).join('')}</select></label>`;
    (q('#dmRisk') as HTMLSelectElement).value = L.risk ?? 'any'; (q('#dmEffort') as HTMLSelectElement).value = C.effort ?? ''; (q('#dmExp') as HTMLSelectElement).value = C.experience === undefined ? '' : String(C.experience);
    const START: Record<string, number> = { dmSetup: 300, dmMonthly: 40, dmMin: 60 }; // what a newly switched-on limit starts at
    const cap = (id: string, prev?: Cap): Cap | undefined => {
      const on = (q(`#${id}On`) as HTMLInputElement).checked, v = (q('#' + id) as HTMLInputElement).value;
      return v === '' ? (on ? { on: true, value: prev?.value || START[id] } : undefined) : { on, value: Math.max(0, +v) || START[id] };
    };
    const change = () => {
      const c: Constraints = {}, s = cap('dmSetup', C.startupUsd), m = cap('dmMonthly', C.monthlyUsd), t = cap('dmMin', C.minutesPerWeek);
      if (s) c.startupUsd = s; if (m) c.monthlyUsd = m; if (t) c.minutesPerWeek = t;
      if (sp || C.space) c.space = { on: (q('#dmSpaceOn') as HTMLInputElement).checked };
      const ef = (q('#dmEffort') as HTMLSelectElement).value, ex = (q('#dmExp') as HTMLSelectElement).value;
      if (ef) c.effort = ef as Constraints['effort']; if (ex !== '') c.experience = +ex as Constraints['experience'];
      P.limits = { ...P.limits, risk: (q('#dmRisk') as HTMLSelectElement).value as UserProfile['limits']['risk'] };
      const out = parseConstraints(c) ?? {}; // an empty set is still "this tank has guardrails, all off"
      store.edit(t2 => { t2.constraints = out; }, { coalesce: 'guardrails' });
      rememberLastUsed(out); save(); limits(); render();
    };
    lim.querySelectorAll('input,select').forEach(e => e.addEventListener('change', change));
  }
  function situation() {
    sit.innerHTML = DOMAIN_LABEL.map(([k, name]) => `<label>${name} <select data-sk="${k}">${SKILL.map((s, i) => `<option value="${i}" ${P.skill[k] === i ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`).join('')
      + `<label>Water for changes <select id="dmWater">${(['tap', 'well', 'bought-ro', 'own-ro'] as const).map(w => `<option value="${w}" ${P.waterSource === w ? 'selected' : ''}>${{ tap: 'Tap', well: 'Well', 'bought-ro': 'Bought RO water', 'own-ro': 'My own RO unit' }[w]}</option>`).join('')}</select></label>
      <label>Electricity <input type="number" id="dmKwh" min="0" step="0.01" placeholder="US average" value="${P.kwhUsd ?? ''}"> $ per kWh</label>
      <div class="hint">Left alone, you count as new to everything. Each answer changes the difficulty and money figures.</div>`;
    const change = () => {
      sit.querySelectorAll<HTMLSelectElement>('select[data-sk]').forEach(s => { P.skill[s.dataset.sk as keyof UserProfile['skill']] = +s.value as 0 | 1 | 2; });
      P.waterSource = (q('#dmWater') as HTMLSelectElement).value as UserProfile['waterSource'];
      const k = (q('#dmKwh') as HTMLInputElement).value; P.kwhUsd = k === '' ? undefined : +k;
      save(); recompute();
    };
    sit.querySelectorAll('input,select').forEach(e => e.addEventListener('change', change));
  }
  limits(); situation(); limitsReady = true;
  recompute();
  /** Set some limits from outside (the care slider's shortcut): saved, the form and the bars follow. */
  const setLimits = (l: Partial<UserProfile['limits']>) => {
    P.limits = { ...P.limits, ...l }; save();
    if (store.tank.constraints) { // this tank has guardrails: the shortcut moves its time and upkeep caps too
      const { upkeep, minPerWeek } = l, c = constraintsFromLimits({ upkeep, minPerWeek });
      store.edit(t => { const k = { ...t.constraints }; if (minPerWeek !== undefined) k.minutesPerWeek = c.minutesPerWeek ?? { on: false, value: k.minutesPerWeek?.value ?? 0 }; if (upkeep !== undefined) k.monthlyUsd = c.monthlyUsd ?? { on: false, value: k.monthlyUsd?.value ?? 0 }; t.constraints = k; }, { coalesce: 'guardrails' });
    }
    limits(); render();
  };
  return { recompute, setLimits, profile: Pe, state: () => (D ? { demand: D, limits: limitState(D, Pe()) } : null) };
}
