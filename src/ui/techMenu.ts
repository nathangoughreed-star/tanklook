// The Tech menu (lane TM step 4, 2026-10-19): the owner picks the tank's tech level, Walstad to high-tech planted / SPS
// reef. A presets ladder, then one row per choice (filtration, heating, CO2, ferts, ... salt gear); each option shows its
// expected setup $, $/month (consumables + power at the profile's rate), minutes a week and what it buys, all for THIS
// tank (scene/tech.ts). Hovering or focusing an option previews the change in the four demand numbers. The Lighting
// section sits inside the Tech section (index.html), unchanged. grow.feed follows the CO2 + ferts rows; the Plant care
// slider / Feeding select set those rows back (sync below).
import { FACTORS, demandOf } from '../demand/engine';
import { pinnedKit } from '../demand/pinned';
import { mean3 as mean } from '../demand/range';
import { defaultProfile, type UserProfile } from '../demand/types';
import { FEED_NAMES, GROW_RATE } from '../scene/growtime';
import type { Store } from '../scene/store';
import {
  ROOM_C, applyPreset, coldSpecies, feedFor, feedOf, filterFor, filterSteps, heatLoss, offerChiller, offerTwoHeaters,
  optionCost, optionDef, presetsFor, reefFeedOf, rowsFor, setFeed, stockCapacity, techOf, walstadGaps, withChoice, type OptionCost, type TechSetup,
} from '../scene/tech';
import { genericHeaterW, heaterProduct, heatersNear } from '../data/gearCatalog';
import type { TankSetup } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const usd = (v: number) => v >= 100 ? `$${Math.round(v / 5) * 5}` : v >= 10 ? `$${Math.round(v)}` : `$${v.toFixed(v < 1 ? 2 : 1)}`;
const REEF_NAME: Record<string, string> = { low: 'soft corals and mushrooms', ferts: 'up to LPS', co2: 'up to SPS and clams' };
const toF = (c: number) => Math.round(c * 9 / 5 + 32);
const fromF = (f: number) => Math.round((f - 32) * 5 / 9 * 2) / 2;

interface Totals { setup: number; upkeep: number; minutes: number; risk: number }

export function attachTechMenu(store: Store, mount: HTMLElement, o: { profile: () => UserProfile | undefined }) {
  let open: string | null = null, base: Totals | null = null, baseKey = '';
  const P = () => o.profile() ?? defaultProfile();
  const kwhUsd = () => P().kwhUsd ?? (FACTORS.kwhUsd.lo + FACTORS.kwhUsd.mode + FACTORS.kwhUsd.hi) / 3;
  const fahr = () => store.scene.units === 'in';
  const totals = (S: TankSetup): Totals => { const t = demandOf(S, P(), { kit: pinnedKit(S, store.scene.active) }).totals; return { setup: t.setupUsd, upkeep: t.upkeepUsdMo, minutes: t.minPerWeek, risk: t.risk }; };
  /** The tank priced with its tech made explicit (an older file's inferred gear becomes rows), the base for previews. */
  const withTech = (S: TankSetup, t: TechSetup): TankSetup => { const x = { ...S, tech: t }; return { ...x, grow: { ...S.grow, feed: feedFor(x) } }; };
  const baseOf = (S: TankSetup) => {
    const k = JSON.stringify([S.tech, S.tank, S.fish.length, S.items.length, S.grow.feed, S.lid, S.water, P()]);
    if (k !== baseKey || !base) { base = totals(withTech(S, techOf(S))); baseKey = k; }
    return base;
  };

  const edit = (fn: (s: TankSetup) => TechSetup) => store.edit(s => { s.tech = fn(s); if (s.water.on) s.grow.feed = feedFor(s); });

  // the Plant care slider and the Feeding select write grow.feed: carry it into the CO2 + ferts rows (one source of truth)
  store.subscribe(kind => {
    if (kind === 'view') return;
    const S = store.tank;
    if (S.tech && S.water.on && feedFor(S) !== S.grow.feed)
      queueMicrotask(() => { const s = store.tank; if (s.tech && s.water.on && feedFor(s) !== s.grow.feed) store.edit(x => { x.tech = setFeed(techOf(x), x.grow.feed, !!x.water.salt); }, { history: false }); });
    render();
  });
  /** One expected value per figure (Nathan 2026-10-19: no ranges or percentiles shown): the mean of each lo / mode / hi. */
  const range = (c: OptionCost) => {
    const setup = mean(c.setup), mo = mean(c.monthlyUsd), min = mean(c.minutes);
    return `<span class="tcost"><b>${setup <= 0.5 ? '$0' : usd(setup)}</b>${c.est ? '<i title="A first guess: no store price researched yet">est</i>' : ''} · ${mo > 0.005 ? usd(mo) + '/mo' : '$0/mo'}${c.kwhMo > 0.05 ? ` <span class="tk">(${c.kwhMo.toFixed(c.kwhMo < 10 ? 1 : 0)} kWh)</span>` : ''} · ${Math.abs(min) < 0.05 ? '0' : (min > 0 ? '' : '−') + Math.abs(min).toFixed(Math.abs(min) < 10 ? 1 : 0)} min/wk</span>`;
  };

  /** "What you get": chips computed from the model for this option on this tank. */
  const chips = (S: TankSetup, row: string, opt: string, c: OptionCost): string => {
    const out: string[] = [], t = withChoice(S, row, opt), def = optionDef(row, opt), chip = (cls: string, txt: string, tip = '') => out.push(`<span class="tchip ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(txt)}</span>`);
    if (row === 'filter') {
      if (c.turnover !== undefined) chip(c.turnover >= 4 ? 'good' : 'warn', `${c.turnover.toFixed(1)}× / hour`, 'Water through the filter each hour, as a multiple of the tank volume: 4-10× is the usual aim');
      const cap = stockCapacity(S, t);
      chip(cap >= 1 ? 'good' : cap >= 0.8 ? '' : 'warn', `Stocking ${Math.round(cap * 100)} %`, 'How much of a normal stocking this filtration carries (AqAdvisor\'s figure assumes a matched filter)');
    }
    if (row === 'co2' || row === 'ferts') {
      const f = feedOf(t);
      chip(f === 'co2' ? 'good' : f === 'ferts' ? '' : 'mute', `Growth: ${FEED_NAMES[f]} (fast growers ×${GROW_RATE[f].fast})`, 'How fast the plants grow with this feeding: stem plants and grass gain most, anubias and ferns hardly notice');
    }
    if (row === 'skimmer' || row === 'flow' || row === 'dosing') {
      const f = reefFeedOf(t);
      chip(f === 'co2' ? 'good' : f === 'ferts' ? '' : 'mute', `Corals: ${REEF_NAME[f]}`, 'The corals this gear keeps: the lowest of skimmer, water movement and calcium / alkalinity dosing sets it (light still has to match)');
    }
    if (row === 'heater' && opt === 'none') {
      const cold = coldSpecies({ ...S, tech: t }, t);
      if (cold.length) chip('warn', `${cold.length} species too cold at ${room(t)}`, cold.map(x => x.name).join(', '));
      else if (S.fish.length) chip('good', `Everyone fine at ${room(t)}`);
    }
    if (row === 'heater' && opt !== 'none') { const h = heatLoss(S, t); if (h.n) chip('', `${h.n > 1 ? h.n + ' × ' : ''}${h.heater.watts} W, on ${Math.round(h.duty * 100)} % of the time`, `The tank loses about ${Math.round(h.lossW)} W at ${tempTxt(h.targetC)} in a ${tempTxt(h.roomC)} room; sized for a night ${3} °C colder`); }
    if ((def?.risk ?? 0) >= 0.25) chip('warn', 'Risk +', def?.note ?? ''); // small risks (a HOB's 0.1) are not worth a flag
    else if ((def?.risk ?? 0) <= -0.15) chip('good', 'Risk −', def?.note ?? '');
    return out.join('');
  };
  const tempTxt = (c: number) => fahr() ? `${toF(c)} °F` : `${c} °C`;
  const room = (t: TechSetup) => tempTxt(t.roomC ?? ROOM_C);

  const delta = (d: Totals, b: Totals) => {
    const part = (v: number, f: (x: number) => string, cut: number) => Math.abs(v) < cut ? '<span class="tz">±0</span>' : `<span class="${v > 0 ? 'tup' : 'tdn'}">${v > 0 ? '+' : '−'}${f(Math.abs(v))}</span>`;
    return `Setup ${part(d.setup - b.setup, usd, 1)} · Monthly ${part(d.upkeep - b.upkeep, v => usd(v), 0.05)} · Time ${part(d.minutes - b.minutes, v => `${v.toFixed(v < 10 ? 1 : 0)} min/wk`, 0.05)} · Risk ${part(d.risk - b.risk, v => v.toFixed(1), 0.05)}`;
  };

  function render() {
    const S = store.tank, t = techOf(S), rows = rowsFor(S);
    if (!S.water.on) { mount.innerHTML = '<div class="hint">A dry tank: no filter, heater or water gear. Heat lamps, misting and UVB come later.</div>'; return; }
    const presets = presetsFor(S), h = heatLoss(S, t);
    const shownPreset = S.tech ? (t.preset ?? 'custom') : '';
    let html = `<div class="tpre" role="group" aria-label="Tech presets">${presets.map(p => `<button type="button" data-pre="${p.id}" class="${shownPreset === p.id ? 'on' : ''}">${esc(p.label)}</button>`).join('')}<span class="tcustom">${shownPreset === 'custom' ? 'Custom' : !S.tech ? 'Not set: the usual gear for this tank' : ''}</span></div>`;
    html += `<div class="trow2"><label for="tRoom" title="Where the tank stands: the heater makes up the difference to the tank temperature, and with no heater the water follows the room">Room temperature</label><input id="tRoom" type="number" step="${fahr() ? 1 : 0.5}" value="${fahr() ? toF(t.roomC ?? ROOM_C) : t.roomC ?? ROOM_C}"><span>${fahr() ? '°F' : '°C'}</span></div>`;
    html += `<div class="hint">Tank ${tempTxt(h.targetC)} (what its animals agree on). ${h.lossW > 0.5 ? `It loses about ${Math.round(h.lossW)} W through ${(h.wallM2 + h.floorM2).toFixed(2)} m² of glass and ${h.surfaceM2.toFixed(2)} m² of ${S.lid === 'open' ? 'open ' : ''}water surface.` : h.coolW > 0.5 ? `The room is warmer than the tank: ${Math.round(h.coolW)} W to take out.` : 'The room holds it there: no heat needed.'}</div>`;
    const warn: string[] = [];
    if (t.rows.filter === 'none' || shownPreset === 'walstad') warn.push(...walstadGaps(S));
    const cold = coldSpecies(S, t);
    if (cold.length) warn.push(`No heater at ${room(t)}: too cold for ${cold.map(x => x.name).join(', ')}.`);
    if (offerChiller(S) && t.rows.chiller !== 'chiller') warn.push(`The room (${room(t)}) is warmer than the tank should be (${tempTxt(h.targetC)}): a chiller, or a cooler room.`);
    if (t.rows.co2 === 'pressurized' && t.rows.air === 'airstone') warn.push('An airstone running by day blows off the injected CO2: put it on a timer for the night.');
    if (warn.length) html += `<div class="hint why">${warn.map(esc).join('<br>')}</div>`;
    const all = rows.map(r => optionCost(S, r.id, t.rows[r.id] ?? 'none', { tech: t, kwhUsd: kwhUsd() })), sum = (f: (c: OptionCost) => { lo: number; mode: number; hi: number }) => all.reduce((a, c) => ({ lo: a.lo + f(c).lo, mode: a.mode + f(c).mode, hi: a.hi + f(c).hi }), { lo: 0, mode: 0, hi: 0 });
    html += `<div class="ttot"><span>All this gear</span>${range({ ...all[0], setup: sum(c => c.setup), monthlyUsd: sum(c => c.monthlyUsd), minutes: sum(c => c.minutes), kwhMo: all.reduce((a, c) => a + c.kwhMo, 0), est: all.some(c => c.est) })}</div>`;
    html += `<div class="tprev" aria-live="polite"></div>`;
    for (const r of rows) {
      if (r.id === 'chiller' && !offerChiller(S) && t.rows.chiller !== 'chiller') continue;
      const cur = t.rows[r.id] ?? 'none', def = optionDef(r.id, cur), c = optionCost(S, r.id, cur, { tech: t, kwhUsd: kwhUsd() });
      let name = def?.label ?? cur;
      if (r.id === 'heater' && cur !== 'none') { const hp = heaterProduct(t.heaterProduct); name += ` · ${hp ? `${hp.brand} ${hp.model}` : `generic ${t.heaterW ?? genericHeaterW(heatLoss(S, t).needW / (cur === 'two' ? 2 : 1))} W`}`; }
      if (r.id === 'filter' && def?.kind) { const f = filterFor(S, def.kind, t.filterModel); name += ` · ${f.n > 1 ? f.n + ' × ' : ''}${f.model.label.replace(/^.*\((.*)\)$/, '$1')} ${f.model.gph} gph`; }
      html += `<div class="trow${open === r.id ? ' open' : ''}" data-row="${r.id}"><button type="button" class="thead" aria-expanded="${open === r.id}"><span class="tlab">${esc(r.label)}</span><span class="tcur">${esc(name)}</span>${range(c)}</button>`;
      if (open === r.id) {
        html += '<div class="topts">';
        for (const op of r.options) {
          if (op.id === 'two' && r.id === 'heater' && !offerTwoHeaters(S) && cur !== 'two') continue;
          const oc = optionCost(S, r.id, op.id, { tech: t, kwhUsd: kwhUsd() });
          html += `<button type="button" class="topt${op.id === cur ? ' on' : ''}" data-opt="${op.id}" aria-pressed="${op.id === cur}"${op.note ? ` title="${esc(op.note)}"` : ''}><span class="tol">${esc(op.label)}</span>${range(oc)}<span class="tchips">${chips(S, r.id, op.id, oc)}</span></button>`;
        }
        if (r.id === 'filter' && def?.kind) {
          const f = filterFor(S, def.kind, t.filterModel), st = filterSteps(def.kind, f.model.id);
          html += `<div class="tstep">${st.down ? `<button type="button" data-fm="${st.down.id}">Smaller: ${esc(st.down.label)}</button>` : ''}${st.up ? `<button type="button" data-fm="${st.up.id}">Larger: ${esc(st.up.label)}</button>` : ''}${t.filterModel ? '<button type="button" data-fm="">Sized for the tank</button>' : ''}</div>`;
        }
        if (r.id === 'heater' && cur !== 'none') { // lane TG: the generic heater the tank needs, or a real one of about that size
          const need = heatLoss(S, t).needW / (cur === 'two' ? 2 : 1), g = genericHeaterW(need);
          html += `<div class="tstep"><span class="hint">Needs about ${Math.round(need)} W${cur === 'two' ? ' each' : ''}:</span><button type="button" data-hp=""${t.heaterProduct ? '' : ' class="on"'}>Generic ${g} W</button>${heatersNear(need).map(h => `<button type="button" data-hp="${h.id}"${t.heaterProduct === h.id ? ' class="on"' : ''} title="${esc(`${h.lengthMm} mm long${h.priceUsd ? ` · about $${Math.round(h.priceUsd)}` : ''}`)}">${esc(`${h.brand} ${h.model}`)}</button>`).join('')}</div>`;
        }
        if (def?.note) html += `<div class="hint">${esc(def.note)}</div>`;
        html += '</div>';
      }
      html += '</div>';
    }
    mount.innerHTML = html;
  }

  const prev = () => mount.querySelector<HTMLElement>('.tprev');
  const preview = (row: string | undefined, opt: string | undefined) => {
    const el = prev(); if (!el) return;
    const S = store.tank;
    if (!row || !opt) { el.innerHTML = ''; return; }
    const b = baseOf(S), d = totals(withTech(S, withChoice(S, row, opt)));
    el.innerHTML = `<b>If picked:</b> ${delta(d, b)}`;
  };
  const presetPreview = (id: string | undefined) => {
    const el = prev(); if (!el) return;
    const S = store.tank;
    if (!id) { el.innerHTML = ''; return; }
    el.innerHTML = `<b>${esc(presetsFor(S).find(p => p.id === id)?.label ?? id)}:</b> ${delta(totals(withTech(S, applyPreset(S, id))), baseOf(S))}`;
  };
  const optOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-opt]');
  const preOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-pre]');
  const over = (e: Event) => {
    const op = optOf(e), pre = preOf(e);
    if (op) preview(op.closest<HTMLElement>('[data-row]')?.dataset.row, op.dataset.opt);
    else if (pre) presetPreview(pre.dataset.pre);
  };
  const out = (e: Event) => { if (optOf(e) || preOf(e)) preview(undefined, undefined); };
  mount.addEventListener('mouseover', over); mount.addEventListener('focusin', over);
  mount.addEventListener('mouseout', out); mount.addEventListener('focusout', out);
  mount.addEventListener('click', e => {
    const el = e.target as HTMLElement, rowEl = el.closest<HTMLElement>('[data-row]'), row = rowEl?.dataset.row;
    const pre = el.closest<HTMLElement>('[data-pre]');
    if (pre) { edit(s => applyPreset(s, pre.dataset.pre!)); return; }
    if (el.closest('.thead') && row) { open = open === row ? null : row; render(); return; }
    const op = el.closest<HTMLElement>('[data-opt]');
    if (op && row) { edit(s => withChoice(s, row, op.dataset.opt!)); return; }
    const hpEl = el.closest<HTMLElement>('[data-hp]');
    if (hpEl) { edit(s => { const t = { ...techOf(s), preset: 'custom' }; delete t.heaterW; if (hpEl.dataset.hp) t.heaterProduct = hpEl.dataset.hp; else delete t.heaterProduct; return t; }); return; }
    const fm = el.closest<HTMLElement>('[data-fm]');
    if (fm) edit(s => { const t = { ...techOf(s), preset: 'custom' }; if (fm.dataset.fm) t.filterModel = fm.dataset.fm; else delete t.filterModel; return t; });
  });
  mount.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.id !== 'tRoom' || !isFinite(+el.value) || el.value === '') return;
    const c = Math.min(40, Math.max(0, fahr() ? fromF(+el.value) : +el.value));
    edit(s => ({ ...techOf(s), roomC: c }));
  });
  render();
  return { render };
}
