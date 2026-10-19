// The demand panel (lane KK phase 4): three live readouts for the current tank (money, time, risk), in Quick Setup. Each is an
// expected value with a likely range; limits turn a bar red; a click lists what drives it and which swap lowers it.
// Computed when the scene settles (debounced), never per frame. The profile (skill, water, kWh rate, limits) is an app pref.
import { costDistribution, defaultProfile, demandOf, drivers, limitState, pct, type CostResult, type LimitState, type UserProfile } from '../demand';
import { swapsFor, type Bar } from '../demand/swaps';
import type { Demand } from '../demand';
import type { Store } from '../scene/store';
import { dealOffers } from '../demand/deals';
import { onSceneLoad, pinnedDeal, pinnedKit, unpinDeal } from '../demand/pinned';
import { DEAL_NOTE, dealGuesses } from '../data/deals';

const KEY = 'tanklook.demand';
const DOMAIN_LABEL: [keyof UserProfile['skill'], string][] = [['fundamentals', 'Keeping a tank at all'], ['fish', 'Freshwater fish'], ['planted', 'Planted tanks'], ['salt', 'Saltwater'], ['terrarium', 'Terrariums']];
const SKILL = ['New to it', 'Some experience', 'Experienced'];
const BARS: { bar: Bar; title: string; tip: string }[] = [
  { bar: 'setup', title: 'To set up', tip: 'What it costs to buy everything in this tank once.' },
  { bar: 'upkeep', title: 'Upkeep a month', tip: 'Power, water, food, filter parts, and replacing what dies.' },
  { bar: 'minutes', title: 'Time a week', tip: 'Minutes a week on average, yearly jobs included.' },
  { bar: 'risk', title: 'Risk', tip: 'How likely things are to go wrong, for your experience. Safe is under 3, moderate under 6, demanding above.' },
];
const usd = (v: number) => '$' + Math.round(v).toLocaleString();
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function load(): UserProfile {
  const d = defaultProfile();
  try { const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<UserProfile> | null; if (j) return { ...d, ...j, skill: { ...d.skill, ...j.skill }, limits: { ...j.limits } }; } catch { /* ignore */ }
  return d;
}

export function attachDemandPanel(store: Store, mount: HTMLElement) {
  let P = load(), D: Demand | null = null, C: CostResult | null = null, open: Bar | null = null, timer = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* ignore */ } };
  mount.innerHTML = `<div class="dm"><div class="dmhead">What this tank asks of you</div><div class="dmbars"></div><div class="dmdeals" style="font-size:11px;opacity:.85"></div><div class="dmdrill" hidden></div>
    <details class="dmset"><summary>Set limits</summary><div class="dmlimits"></div></details>
    <details class="dmset"><summary>Your situation</summary><div class="dmsit"></div></details></div>`;
  const q = <T extends HTMLElement>(s: string) => mount.querySelector(s) as T;
  const bars = q('.dmbars'), drill = q('.dmdrill');

  function recompute() {
    const S = store.tank;
    D = demandOf(S, P, { kit: pinnedKit() }); C = costDistribution(D, P);
    render();
  }
  const soon = () => { clearTimeout(timer); timer = window.setTimeout(recompute, 450); };
  store.subscribe(kind => { if (kind === 'load') onSceneLoad(); if (kind === 'scene' || kind === 'load') soon(); });

  function render() {
    if (!D || !C) return;
    const L = limitState(D, C, P);
    bars.innerHTML = '';
    for (const b of BARS) bars.append(row(b, L));
    renderDeals();
    drill.hidden = !open;
    if (open) fillDrill(open);
  }

  /** Retailer tank+stand bundles that fit this build, with what each saves against buying the parts (data: src/data/deals.json). */
  function renderDeals() {
    const el = q('.dmdeals'), pin = pinnedDeal(), offers = dealOffers(store.tank, P).filter(o => o.savingUsd > 1).slice(0, 2);
    el.innerHTML = (pin ? `<div>Priced as the ${esc(pin.retailer + ' ' + pin.name)} bundle (${usd(pin.price.usd)}, ${esc(pin.asOf)}). <a href="#" class="dmunpin">Price the parts instead</a>${dealGuesses(pin).length ? `<br><i>Guessed: ${esc(dealGuesses(pin).join('; '))}</i>` : ''}</div>` : '') + offers.filter(o => o.deal.id !== pin?.id).map(o => `<div>Deal: <a href="${esc(o.deal.url)}" target="_blank" rel="noopener">${esc(o.deal.retailer + ' ' + o.deal.name)}</a> ${usd(o.deal.price.usd)}${o.deal.price.regularUsd ? ` (was ${usd(o.deal.price.regularUsd)})` : ''}, about ${usd(o.savingUsd)} under buying the parts${o.deal.est ? ' (estimate)' : ''}${o.deal.saleEnds ? `, sale ends ${esc(o.deal.saleEnds)}` : ''}; ${esc(o.deal.asOf)}</div>`).join('') + (offers.length || pin ? `<div style="opacity:.7">Prices ${esc(DEAL_NOTE)}.</div>` : '');
    el.querySelector<HTMLAnchorElement>('.dmunpin')?.addEventListener('click', e => { e.preventDefault(); unpinDeal(); recompute(); });
  }

  function row(b: typeof BARS[number], L: LimitState) {
    const el = document.createElement('div'), st = L[b.bar === 'minutes' ? 'minutes' : b.bar], dist = b.bar === 'risk' ? null : C![b.bar];
    el.className = 'dmrow' + (st.over ? ' over' : '') + (open === b.bar ? ' sel' : '');
    const max = b.bar === 'risk' ? 10 : Math.max(dist!.p90 * 1.15, (st.limit ?? 0) * 1.1, 1);
    const x = (v: number) => `${Math.min(100, Math.max(0, v / max * 100)).toFixed(1)}%`;
    let value: string, range: string, track: string;
    if (dist) {
      const per = b.bar === 'setup' ? usd : b.bar === 'upkeep' ? (v: number) => usd(v) : (v: number) => `${Math.round(v)} min`;
      const shown = b.bar === 'setup' && P.limits.budgetMode === 'cap' ? pct(dist, 85) : dist.mean;
      value = per(dist.mean); range = `likely ${per(dist.p10)} to ${per(dist.p90)}`;
      track = `<i class="dmband" style="left:${x(dist.p10)};width:calc(${x(dist.p90)} - ${x(dist.p10)})"></i><i class="dmmean" style="left:${x(dist.mean)}"></i>`
        + (st.limit !== undefined ? `<i class="dmlim" style="left:${x(st.limit)}"></i>` : '') + (b.bar === 'setup' && P.limits.budgetMode === 'cap' ? `<i class="dmcap" style="left:${x(shown)}"></i>` : '');
      el.title = `${b.tip}\nExpected ${per(dist.mean)}; 10 in 100 times it comes in under ${per(dist.p10)}, and 10 in 100 over ${per(dist.p90)}.${st.limit !== undefined ? `\nYour limit: ${per(st.limit)} (${P.limits.budgetMode === 'cap' ? 'checked against a bad-luck 85-in-100 figure' : 'checked against the expected figure'}).` : ''}`;
    } else {
      const r = L.risk;
      value = `${D!.totals.risk.toFixed(1)} / 10`; range = r.label;
      track = `<i class="dmz" style="left:0;width:30%"></i><i class="dmz m" style="left:30%;width:30%"></i><i class="dmz d" style="left:60%;width:40%"></i><i class="dmmean" style="left:${x(D!.totals.risk)}"></i>`;
      el.title = `${b.tip}\nRelative to your stated experience (see Your situation).`;
    }
    el.innerHTML = `<div class="dmtop"><span class="dmname">${b.title}</span><b class="dmval">${esc(value)}</b><span class="dmrange">${esc(range)}</span></div><div class="dmtrack">${track}</div>`;
    el.onclick = () => { open = open === b.bar ? null : b.bar; render(); };
    return el;
  }

  function fillDrill(bar: Bar) {
    const dr = drivers(D!, C!, bar, 6), S = store.tank, unit = bar === 'setup' || bar === 'upkeep' ? usd : (v: number) => (bar === 'risk' ? v.toFixed(1) : `${Math.round(v)} min`);
    const head = BARS.find(b => b.bar === bar)!.title;
    let h = `<div class="dmdt">What drives “${head}”</div>`;
    for (const r of dr) {
      const sw = r.key.startsWith('animal:') || r.key.startsWith('plant:') ? swapsFor(S, P, r.key, bar, {}, 2) : [];
      h += `<div class="dmitem"><span>${esc(r.label)}${r.n > 1 ? ` ×${r.n}` : ''}</span><b>${unit(r.mean)}</b>${bar !== 'risk' ? `<span class="dmshare" title="How much of the uncertainty in this number comes from this item">${Math.round(r.share * 100)}% of the doubt</span>` : '<span></span>'}</div>`;
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
    const L = P.limits;
    lim.innerHTML = `<label>Set-up money <input type="number" min="0" step="10" id="dmSetup" placeholder="no limit" value="${L.setupUsd ?? ''}"> $</label>
      <div class="dmask" ${L.setupUsd === undefined ? 'hidden' : ''}>Is that what you expect to spend, or the most you can spend?
        <label><input type="radio" name="dmMode" value="expected" ${L.budgetMode === 'expected' ? 'checked' : ''}> What I expect to spend</label>
        <label><input type="radio" name="dmMode" value="cap" ${L.budgetMode === 'cap' ? 'checked' : ''}> The most I can spend</label></div>
      <label>Upkeep <select id="dmUpkeep"><option value="">no limit</option><option value="free">near free (under $10 a month)</option><option value="low">low (under $40 a month)</option><option value="flex">flexible</option></select></label>
      <label>Time <input type="number" min="0" step="5" id="dmMin" placeholder="no limit" value="${L.minPerWeek ?? ''}"> minutes a week</label>
      <label>Risk <select id="dmRisk"><option value="any">no limit</option><option value="moderate">moderate at most</option><option value="safe">safe only</option></select></label>`;
    (q('#dmUpkeep') as HTMLSelectElement).value = L.upkeep ?? ''; (q('#dmRisk') as HTMLSelectElement).value = L.risk ?? 'any';
    const num = (id: string) => { const v = (q(id) as HTMLInputElement).value; return v === '' ? undefined : Math.max(0, +v); };
    const change = () => {
      P.limits = { ...P.limits, setupUsd: num('#dmSetup'), minPerWeek: num('#dmMin'), upkeep: ((q('#dmUpkeep') as HTMLSelectElement).value || undefined) as UserProfile['limits']['upkeep'], risk: (q('#dmRisk') as HTMLSelectElement).value as UserProfile['limits']['risk'] };
      const m = mount.querySelector('input[name=dmMode]:checked') as HTMLInputElement | null;
      if (m) P.limits.budgetMode = m.value as 'expected' | 'cap';
      (q('.dmask') as HTMLElement).hidden = P.limits.setupUsd === undefined;
      save(); render();
    };
    lim.querySelectorAll('input,select').forEach(e => e.addEventListener('change', change));
  }
  function situation() {
    sit.innerHTML = DOMAIN_LABEL.map(([k, name]) => `<label>${name} <select data-sk="${k}">${SKILL.map((s, i) => `<option value="${i}" ${P.skill[k] === i ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`).join('')
      + `<label>Water for changes <select id="dmWater">${(['tap', 'well', 'bought-ro', 'own-ro'] as const).map(w => `<option value="${w}" ${P.waterSource === w ? 'selected' : ''}>${{ tap: 'Tap', well: 'Well', 'bought-ro': 'Bought RO water', 'own-ro': 'My own RO unit' }[w]}</option>`).join('')}</select></label>
      <label>Electricity <input type="number" id="dmKwh" min="0" step="0.01" placeholder="US average" value="${P.kwhUsd ?? ''}"> $ per kWh</label>
      <div class="hint">Left alone, you count as new to everything. Each answer changes the risk and money figures.</div>`;
    const change = () => {
      sit.querySelectorAll<HTMLSelectElement>('select[data-sk]').forEach(s => { P.skill[s.dataset.sk as keyof UserProfile['skill']] = +s.value as 0 | 1 | 2; });
      P.waterSource = (q('#dmWater') as HTMLSelectElement).value as UserProfile['waterSource'];
      const k = (q('#dmKwh') as HTMLInputElement).value; P.kwhUsd = k === '' ? undefined : +k;
      save(); recompute();
    };
    sit.querySelectorAll('input,select').forEach(e => e.addEventListener('change', change));
  }
  limits(); situation();
  recompute();
  return { recompute, profile: () => P, state: () => (D && C ? { demand: D, cost: C, limits: limitState(D, C, P) } : null) };
}
