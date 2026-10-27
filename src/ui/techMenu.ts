// The Tech menu (lane TM step 4, 2026-10-19): the owner picks the tank's tech level, Walstad to high-tech planted / SPS
// reef. A presets ladder, then one row per choice (filtration, heating, CO2, ferts, ... salt gear); each option shows its
// expected setup $, $/month (consumables + power at the profile's rate), minutes a week and what it buys, all for THIS
// tank (scene/tech.ts). Hovering or focusing an option previews the change in the four demand numbers. The Lighting
// section sits inside the Tech section (index.html), unchanged. grow.feed follows the CO2 + ferts rows; the Plant care
// slider / Feeding select set those rows back (sync below).
// Heating and Filtration (Nathan 2026-10-20) list the units the tank has, one card each (its name first; a bundle's own
// with its price crossed out), and an Add button: a heater (generic, its watts editable, or any catalogued one), a filter
// (its type, then generic or a catalogued one of that type). Removing the last shows "No heater" / "None (Walstad)".
import { standMisfit } from '../scene/standspace';
import { FACTORS, demandOf } from '../demand/engine';
import { pinnedKit } from '../demand/pinned';
import { mean3 as mean } from '../demand/range';
import { defaultProfile, type UserProfile } from '../demand/types';
import { FEED_NAMES, GROW_RATE } from '../scene/growtime';
import type { Store } from '../scene/store';
import {
  ROOM_C, applyPreset, feedFor, feedOf, filterFor, filterSteps, filterUnits, heatLoss, offerChiller,
  optionCost, optionDef, presetsFor, pumpFor, REEF_FLOW_X, reefFeedOf, rowsFor, setFeed, singleFilter, stockCapacity, techOf, tempEvidence, unitCosts, walstadGaps, withChoice,
  withUnits, withoutUnit, reefChecks, rowProduct, sumpDefault, sumpFromModel, sumpLitres, sumpName, sumpOf, SUMP_FILL, sumpDrainDown, sumpTooSmall, type FilterUnit, type SumpSize, type HeaterUnit, type OptionCost, type TechSetup,
} from '../scene/tech';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, reefOptionProducts, filtersNear, genericHeaterW, heatersNear, lightProduct, lightsFor, productName, pumpRatedFor, pumpsFor, type FilterProduct, type HeaterProduct, type LightProduct, type PumpProduct, type ReefProduct } from '../data/gearCatalog';
import { applyLightProduct, lightProductNote, productOn } from '../scene/lightproduct';
import { TECHS, lightOutCached } from '../scene/lightout';
import { integratedKit, lockNote, locksOf } from '../scene/integrated';
import { unholdBtn } from './tankPick';
import type { FilterKind } from '../demand/gear';
import { volume } from '../scene/physics';
import type { TankSetup } from '../scene/types';
import { getSpecies } from '../data/species';
import { holdCheck, measuredCheck, operatingCheck, sharedRange } from '../scene/temprange';
import type { TankModel } from '../data/tanks';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const usd = (v: number) => v >= 100 ? `$${Math.round(v / 5) * 5}` : v >= 10 ? `$${Math.round(v)}` : `$${v.toFixed(v < 1 ? 2 : 1)}`;
const REEF_NAME: Record<string, string> = { low: 'soft corals and mushrooms', ferts: 'up to LPS', co2: 'up to SPS and clams' };
const toF = (c: number) => Math.round(c * 9 / 5 + 32);
const fromF = (f: number) => Math.round((f - 32) * 5 / 9 * 2) / 2;
const KIND_NAME: Record<string, string> = { sponge: 'sponge filter', internal: 'internal filter', hob: 'hang-on-back filter', canister: 'canister filter', sump: 'sump' };
const BUNDLE_PARTS = ['tank', 'stand', 'lid', 'light', 'filter', 'heater'];
type UnitRow = 'heater' | 'filter';

interface Totals { setup: number; upkeep: number; minutes: number; risk: number }

export function attachTechMenu(store: Store, mount: HTMLElement, o: { profile: () => UserProfile | undefined; /** lane SU: opens the tank-size picker for the sump */ pickSump?: (done: (m: TankModel) => void) => void }) {
  let open: string | null = null, base: Totals | null = null, baseKey = '';
  /** the Add picker open under Heating / Filtration (for filters: the type picked, then generic or a product) */
  let adding: { row: UnitRow; kind?: string } | null = null;
  const P = () => o.profile() ?? defaultProfile();
  const kwhUsd = () => P().kwhUsd ?? (FACTORS.kwhUsd.lo + FACTORS.kwhUsd.mode + FACTORS.kwhUsd.hi) / 3;
  const fahr = () => store.scene.units === 'in';
  const totals = (S: TankSetup): Totals => { const t = demandOf(S, P(), { kit: pinnedKit(S, store.scene.active, P()) }).totals; return { setup: t.setupUsd, upkeep: t.upkeepUsdMo, minutes: t.minPerWeek, risk: t.risk }; };
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
    render(); renderLight();
  });
  /** One expected value per figure (Nathan 2026-10-19: no ranges or percentiles shown): the mean of each lo / mode / hi. */
  const range = (c: OptionCost, covered = 0) => {
    const setup = mean(c.setup), mo = mean(c.monthlyUsd), min = mean(c.minutes);
    const set = covered > 0.5 ? `<s title="In the bundle's price">${usd(covered)}</s>${setup - covered > 0.5 ? ` + <b>${usd(setup - covered)}</b>` : ''}` : `<b>${setup <= 0.5 ? '$0' : usd(setup)}</b>`;
    return `<span class="tcost">${set}${c.est ? '<i title="A first guess: no store price researched yet">est</i>' : ''} · ${mo > 0.005 ? usd(mo) + '/mo' : '$0/mo'}${c.kwhMo > 0.05 ? ` <span class="tk">(${c.kwhMo.toFixed(c.kwhMo < 10 ? 1 : 0)} kWh)</span>` : ''} · ${Math.abs(min) < 0.05 ? '0' : (min > 0 ? '' : '−') + Math.abs(min).toFixed(Math.abs(min) < 10 ? 1 : 0)} min/wk</span>`;
  };

  /** "What you get": chips computed from the model for this option on this tank. */
  const chips = (S: TankSetup, row: string, opt: string, c: OptionCost): string => {
    const out: string[] = [], t = withChoice(S, row, opt), def = optionDef(row, opt), chip = (cls: string, txt: string, tip = '') => out.push(`<span class="tchip ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(txt)}</span>`);
    if (row === 'filter') {
      if (c.turnover !== undefined) chip(c.turnover >= 4 ? 'good' : 'warn', `${c.turnover.toFixed(1)}× / hour`, 'Water through the filter each hour, as a multiple of the tank volume: 4-10× is the usual aim');
      const cap = stockCapacity(S, t);
      chip(cap >= 1 ? 'good' : cap >= 0.8 ? '' : 'warn', `Stocking ${Math.round(cap * 100)} %`, 'How much of a normal stocking this filtration carries (AqAdvisor\'s figure assumes a matched filter)');
    }
    if (row === 'flow' && c.turnover !== undefined) chip(c.turnover >= REEF_FLOW_X.sps ? 'good' : c.turnover >= REEF_FLOW_X.lps ? '' : 'warn', `${c.turnover.toFixed(c.turnover < 10 ? 1 : 0)}× / hour`, `The picked pump's rated flow each hour, as a multiple of the tank volume: about ${REEF_FLOW_X.lps}× holds soft corals and LPS, ${REEF_FLOW_X.sps}× SPS (a rule of thumb; the Corals chip follows it)`);
    if (row === 'co2' || row === 'ferts') {
      const f = feedOf(t);
      chip(f === 'co2' ? 'good' : f === 'ferts' ? '' : 'mute', `Growth: ${FEED_NAMES[f]} (fast growers ×${GROW_RATE[f].fast})`, 'How fast the plants grow with this feeding: stem plants and grass gain most, anubias and ferns hardly notice');
    }
    if (row === 'skimmer' || row === 'flow' || row === 'dosing') {
      const f = reefFeedOf(t, 'low', volume(S.tank).gallons);
      chip(f === 'co2' ? 'good' : f === 'ferts' ? '' : 'mute', `Corals: ${REEF_NAME[f]}`, 'The corals this gear keeps: the lowest of skimmer, water movement and calcium / alkalinity dosing sets it (light still has to match)');
    }
    if (row === 'heater' && opt === 'none') {
      // no heater: the water is modelled from the room (temprange.ts operatingCheck, the plan sheet's own check), never passed on an assumed room
      const ev = tempEvidence({ ...S, tech: { ...t, rows: { ...t.rows, heater: 'none' } } }, false), shared = sharedRange([...new Set(S.fish.map(f => f.species))].map(getSpecies).filter((x): x is NonNullable<typeof x> => !!x));
      const k = ev && shared.range && ev.target === undefined ? operatingCheck(shared, ev) : null;
      if (k?.state === 'outside' || k?.state === 'conditional') chip('warn', `${k.state === 'conditional' ? 'If the room is ' : ''}${room(t)} room: outside the shared range${k.state === 'conditional' ? ' (assumed)' : ' (estimate)'}`, k.text);
      else if (k?.state === 'inside') chip('good', `In range at the ${room(t)} room (estimate)`, k.text);
      else if (k) chip('mute', 'Enter the room temperature to check', k.text);
    }
    if (row === 'heater' && opt !== 'none') { const h = heatLoss(S, t); if (h.n) chip('', `${h.n > 1 ? h.n + ' × ' : ''}${h.heater.watts} W, on ${Math.round(h.duty * 100)} % of the time`, `The tank loses about ${Math.round(h.lossW)} W at ${tempTxt(h.targetC)} in a ${tempTxt(h.roomC)} room; sized for a night ${3} °C colder`); }
    if ((def?.risk ?? 0) >= 0.25) chip('warn', 'Harder +', def?.note ?? ''); // small risks (a HOB's 0.1) are not worth a flag
    else if ((def?.risk ?? 0) <= -0.15) chip('good', 'Risk −', def?.note ?? '');
    return out.join('');
  };
  const tempTxt = (c: number) => fahr() ? `${toF(c)} °F` : `${c} °C`;
  const room = (t: TechSetup) => tempTxt(t.roomC ?? ROOM_C);

  // ---- heaters and filters as units
  /** Each unit of `row`: is its price in the pinned bundle's? (the bundle's own unit; all of them when none is flagged) */
  const inBundle = (S: TankSetup, t: TechSetup, row: UnitRow): boolean[] => {
    const us: { kit?: boolean }[] = row === 'heater' ? heatLoss(S, t).units : filterUnits(t), k = pinnedKit(S, store.scene.active, P());
    if (!k || !(k.includes ?? BUNDLE_PARTS).includes(row)) return us.map(() => false);
    const flagged = us.some(u => u.kit);
    return us.map(u => flagged ? !!u.kit : true);
  };
  /** The setup $ of `row` the bundle's price covers. */
  const coveredOf = (S: TankSetup, t: TechSetup, row: string): number => {
    if (row !== 'heater' && row !== 'filter') return 0;
    const k = inBundle(S, t, row);
    if (!k.some(Boolean)) return 0;
    return unitCosts(S, row, { tech: t, kwhUsd: kwhUsd() }).reduce((a, c, i) => a + (k[i] ? mean(c.setup) : 0), 0);
  };
  /** The heaters as saved units, each at the size it has now (a heater sized to the need keeps that size once another is added). */
  const heatersNow = (S: TankSetup, t: TechSetup): HeaterUnit[] => heatLoss(S, t).units.map(u => ({ ...(u.product ? { product: u.product.id } : { w: u.watts }), ...(u.kit ? { kit: true } : {}) }));
  const filterLabel = (S: TankSetup, u: FilterUnit) => {
    if (u.kind === 'sump') return `Sump · ${sumpTitle(sumpOf(S, true)!)}`;
    const kind = optionDef('filter', u.kind)?.kind;
    if (!kind) return optionDef('filter', u.kind)?.label ?? u.kind;
    const f = filterFor(S, kind, u.model, u.product), n = f.n > 1 ? ` × ${f.n}` : '';
    return f.product ? `${productName(f.product)}${f.product.gph ? ` · ${f.product.gph} gph` : ''}${n}` : `Generic ${KIND_NAME[u.kind]} · ${f.model.label.replace(/^.*\((.*)\)$/, '$1')} ${f.model.gph} gph${n}`;
  };
  /** The generic heater to add: the size still missing for a cold night, else a full-size backup. */
  const nextHeaterW = (S: TankSetup, t: TechSetup) => { const h = heatLoss(S, t), more = h.needW - h.totalW; return genericHeaterW(Math.max(more > 0.5 ? more : h.needW, 1)); };
  /** What a tech-changing button does to the tank's tech ('|'-separated: verb, row or kind, index or product). */
  const candidate = (act: string, S: TankSetup): TechSetup | undefined => {
    const [a, b, c] = act.split('|'), t = techOf(S);
    if (a === 'del') return b === 'heater' ? withoutUnit({ ...t, heaters: heatersNow(S, t) }, 'heater', +c) : withoutUnit(t, 'filter', +c);
    if (a === 'addh') return withUnits(t, 'heater', [...heatersNow(S, t), b ? { product: b } : { w: nextHeaterW(S, t) }]);
    if (a === 'addf') return withUnits(t, 'filter', [...filterUnits(t), { kind: b, ...(c ? { product: c } : {}) }]);
    if (a === 'sump' && b === 'add') return { ...withUnits(t, 'filter', [...filterUnits(t), { kind: 'sump' }]), sump: t.sump ?? sumpDefault(S) };
    if (a === 'sump' && b === 'del') return withoutUnit(t, 'filter', filterUnits(t).findIndex(u => u.kind === 'sump'));
    if (a === 'fm') return withUnits(t, 'filter', filterUnits(t).map((u, i) => i === +b ? { ...u, model: c } : u));
    return undefined;
  };
  const card = (name: string, c: OptionCost | undefined, kit: boolean, del: string, body = '') =>
    `<div class="tunit${kit ? ' kit' : ''}"><div class="tuh"><span class="tun">${name}</span>${del ? `<button type="button" class="tux" data-act="${del}" title="Remove it" aria-label="Remove">×</button>` : ''}</div>`
    + (c ? `<div class="tuc">${range(c, kit ? mean(c.setup) : 0)}${kit ? '<span class="tkit" title="Came with the bundle the tank was started from: its price is in the bundle\'s">in the bundle</span>' : ''}</div>` : '') + body + '</div>';
  const prodBtn = (act: string, label: string, priceUsd?: number, tip = '') => `<button type="button" data-act="${esc(act)}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${priceUsd ? `<span class="tpp">$${Math.round(priceUsd)}</span>` : ''}</button>`;
  const heaterBtn = (h: HeaterProduct) => prodBtn(`addh|${h.id}`, productName(h), h.priceUsd, `${h.watts} W · ${h.lengthMm} mm long`);
  const filterBtn = (p: FilterProduct) => prodBtn(`addf|${p.kind}|${p.id}`, `${productName(p)}${p.gph ? ` · ${p.gph} gph` : ''}`, p.priceUsd, `${p.galMin ?? '?'}-${p.galMax ?? '?'} gal`);

  /** A pump product picker (lane GP) for a gear part (airpump, powerhead, wavemaker): generic by default; a chosen product's price, watts and
   *  flow replace the generic part's, and what the listing rates it for is checked against this tank. */
  const pumpPicker = (S: TankSetup, t: TechSetup, gear: string, label = 'Product'): string => {
    const gal = volume(S.tank).gallons, cur = pumpFor(t, gear), list = pumpsFor(gear, gal), ok = list.filter(p => pumpRatedFor(p, gal) !== false), no = list.filter(p => pumpRatedFor(p, gal) === false);
    const opt = (p: PumpProduct) => `<option value="${p.id}"${p === cur ? ' selected' : ''}>${esc(`${productName(p)} · ${p.watts} W${p.gph ? ` · ${p.gph} gph` : p.airGph ? ` · ${p.airGph} gph of air` : ''} · ${usd(p.priceUsd)}`)}</option>`;
    let html = `<div class="trow2" style="display:block"><label for="pp-${gear}" style="display:block;margin:.4em 0 .15em" title="A real pump from the catalogue (Amazon best sellers, read 2026-10-27): its listed price and watts are used instead of the generic part's. Generic: the sized default">${esc(label)}</label><select id="pp-${gear}" data-pump="${gear}" style="width:100%;max-width:100%;min-width:0"><option value="">Generic (sized to the tank)</option>${ok.length ? `<optgroup label="Rated for this tank, or no range listed">${ok.map(opt).join('')}</optgroup>` : ''}${no.length ? `<optgroup label="Rated for other tank sizes">${no.map(opt).join('')}</optgroup>` : ''}</select></div>`;
    if (cur) {
      const chips: string[] = [], chip = (cls: string, txt: string, tip = '') => chips.push(`<span class="tchip ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(txt)}</span>`);
      const rated = pumpRatedFor(cur, gal);
      if (rated !== undefined) chip(rated ? 'good' : 'warn', `Rated ${cur.galMin ?? 0}-${cur.galMax ?? '∞'} gal`, `The listing's tank range; this tank holds ${Math.round(gal)} gal`);
      if (cur.gph) chip('', `${cur.gph} gph`, 'Rated flow from the listing');
      if (cur.outlets) chip('', `${cur.outlets} outlet${cur.outlets > 1 ? 's' : ''}`);
      if (cur.depthIn !== undefined) { const water = S.tank.H * S.water.level / 25.4; chip(water > cur.depthIn ? 'warn' : '', `Water depth to ${cur.depthIn} in`, `The listing's depth rating; this tank's water is about ${Math.round(water)} in deep`); }
      if (cur.dB) chip('', `up to ${cur.dB} dB`, 'The loudest figure the listing gives');
      if (cur.controller) chip('good', 'Wave controller');
      html += `<div class="tchips">${chips.join('')}</div>`;
    }
    return html;
  };

  /** Heating, opened: a card per heater, or "No heater", and the Add picker. */
  const heaterBody = (S: TankSetup, t: TechSetup, cur: string, c: OptionCost): string => {
    const h = heatLoss(S, t), costs = unitCosts(S, 'heater', { tech: t, kwhUsd: kwhUsd() }), kit = inBundle(S, t, 'heater');
    let html = '<div class="tunits">';
    if (!h.n) html += card('No heater', undefined, false, '', `<span class="tchips">${chips(S, 'heater', 'none', c)}</span>`);
    h.units.forEach((u, i) => {
      const name = u.product ? esc(productName(u.product)) : 'Generic heater';
      html += card(name, costs[i], kit[i], `del|heater|${i}`, u.product ? '' : `<label class="tuw">Watts <input type="number" data-hw="${i}" min="5" max="2000" step="5" value="${u.watts}"></label>`);
    });
    html += '</div>';
    if (h.n) {
      const out: string[] = [];
      out.push(`<span class="tchip${h.totalW < h.needW ? ' warn' : ''}" title="${esc(`The tank loses about ${Math.round(h.lossW)} W at ${tempTxt(h.targetC)} in a ${tempTxt(h.roomC)} room; a cold night (3 °C colder) needs about ${Math.round(h.needW)} W`)}">${h.totalW} W${h.n > 1 ? ' in all' : ''}, on ${Math.round(h.duty * 100)} % of the time</span>`);
      if (h.totalW < h.needW) out.push(`<span class="tchip warn">Short of the ${Math.round(h.needW)} W a cold night needs</span>`);
      const def = optionDef('heater', cur);
      if ((def?.risk ?? 0) >= 0.25) out.push(`<span class="tchip warn" title="${esc(def?.note ?? '')}">Harder +</span>`);
      html += `<span class="tchips">${out.join('')}</span>`;
    }
    if (adding?.row !== 'heater') return html + `<button type="button" class="tadd" data-act="adding|heater">+ Add ${h.n ? 'another' : 'a'} heater</button>`;
    const more = Math.max(h.needW - h.totalW, 0), g = nextHeaterW(S, t), near = heatersNear(g);
    const rest = HEATER_PRODUCTS.filter(x => !near.includes(x)).sort((a, b) => a.watts - b.watts || productName(a).localeCompare(productName(b)));
    html += `<div class="tpick"><div class="hint">${!h.n ? `The tank needs about ${Math.round(h.needW)} W.` : more > 0.5 ? `About ${Math.round(more)} W more for a cold night.` : 'These cover a cold night: another one is a backup.'}</div>`;
    html += `<div class="tstep">${prodBtn('addh|', `Generic ${g} W`, undefined, 'A generic heater: set its watts once added')}${near.map(heaterBtn).join('')}</div>`;
    if (rest.length) html += `<details><summary>All ${rest.length} other heaters</summary><div class="tstep">${rest.map(heaterBtn).join('')}</div></details>`;
    return html + '<button type="button" class="tcancel" data-act="adding">Cancel</button></div>';
  };

  /** Filtration, opened: a card per filter, or "None (Walstad)", and the Add picker (type, then generic or a product). */
  const filterBody = (S: TankSetup, t: TechSetup, cur: string, c: OptionCost, rowDef: { options: { id: string; label: string }[] }): string => {
    const us = filterUnits(t), costs = unitCosts(S, 'filter', { tech: t, kwhUsd: kwhUsd() }), kit = inBundle(S, t, 'filter');
    let html = '<div class="tunits">';
    if (!us.length) html += card('None (Walstad)', undefined, false, '', `<span class="tchips">${chips(S, 'filter', 'none', c)}</span>`);
    us.forEach((u, i) => {
      const kind = optionDef('filter', u.kind)?.kind, f = kind ? filterFor(S, kind, u.model, u.product) : undefined, st = kind && f && !f.product ? filterSteps(kind, f.model.id) : undefined;
      const turn = costs[i].turnover, steps = st ? `${st.down ? `<button type="button" data-act="fm|${i}|${st.down.id}">Smaller</button>` : ''}${st.up ? `<button type="button" data-act="fm|${i}|${st.up.id}">Larger</button>` : ''}` : '';
      const body = `<span class="tchips"><span class="tchip mute">${esc(optionDef('filter', u.kind)?.label ?? u.kind)}</span>${turn !== undefined && us.length > 1 ? `<span class="tchip">${turn.toFixed(1)}× / hour</span>` : ''}</span>${steps ? `<div class="tstep">${steps}</div>` : ''}`;
      html += card(esc(filterLabel(S, u)), costs[i], kit[i], `del|filter|${i}`, body);
    });
    html += '</div>';
    if (us.length) html += `<span class="tchips">${chips(S, 'filter', cur, c)}</span>`;
    if (adding?.row !== 'filter') return html + `<button type="button" class="tadd" data-act="adding|filter">+ Add ${us.length ? 'more ' : ''}filtration</button>`;
    html += '<div class="tpick">';
    if (!adding.kind) {
      html += '<div class="hint">What kind?</div>';
      for (const op of rowDef.options) {
        if (op.id === 'none') continue;
        const oc = optionCost(S, 'filter', op.id, { tech: singleFilter(t, { kind: op.id }), kwhUsd: kwhUsd() });
        html += `<button type="button" class="topt" data-act="${op.id === 'sump' ? 'sump|add' : `adding|filter|${op.id}`}"><span class="tol">${esc(op.label)}</span>${range(oc)}</button>`;
      }
      return html + '<button type="button" class="tcancel" data-act="adding">Cancel</button></div>';
    }
    const k = adding.kind, gal = volume(S.tank).gallons, near = filtersNear(k, gal), rest = FILTER_PRODUCTS.filter(p => p.kind === k && !near.includes(p)).sort((a, b) => (a.gph ?? 0) - (b.gph ?? 0));
    const gen = filterFor(S, optionDef('filter', k)!.kind as FilterKind);
    html += `<div class="hint">${esc(optionDef('filter', k)?.label ?? k)}: generic, or one we have modelled</div>`;
    html += `<div class="tstep">${prodBtn(`addf|${k}|`, `Generic · ${gen.model.gph} gph${gen.n > 1 ? ` × ${gen.n}` : ''}`, undefined, 'Sized for this tank; step it smaller or larger once added')}${near.map(filterBtn).join('')}</div>`;
    if (rest.length) html += `<details><summary>All ${rest.length} other ${KIND_NAME[k]}s</summary><div class="tstep">${rest.map(filterBtn).join('')}</div></details>`;
    return html + '<button type="button" class="tcancel" data-act="adding|filter">Back</button></div>';
  };

  // ---- the sump (lane SU, Nathan 2026-10-22): a second tank under the display, sized from the tank presets or a custom size
  const lenIn = (mm: number) => fahr() ? `${Math.round(mm / 25.4 * 10) / 10}` : `${Math.round(mm / 10 * 10) / 10}`;
  /** "20 gal high tank, 39 L of water"; a custom size in the viewer's units. */
  const sumpTitle = (z: SumpSize) => z.model ? sumpName(z) : `${lenIn(z.L)} × ${lenIn(z.D)} × ${lenIn(z.H)} ${fahr() ? 'in' : 'cm'} tank, ${Math.round(z.L * z.D * z.H / 1e6 * SUMP_FILL)} L of water`;
  const sumpRow = (S: TankSetup, t: TechSetup): string => {
    const z = sumpOf(S), miss = z ? standMisfit(S, z) : [], isOpen = open === 'sump', c = z ? optionCost(S, 'filter', 'sump', { tech: singleFilter(t, { kind: 'sump' }), kwhUsd: kwhUsd() }) : undefined;
    let html = `<div class="trow${isOpen ? ' open' : ''}" data-row="sump"><button type="button" class="thead" aria-expanded="${isOpen}"><span class="tlab">Sump</span><span class="tcur">${z ? esc(sumpTitle(z)) : 'None'}${miss.length ? ' <b class="bad">Won’t fit in the stand</b>' : ''}</span>${c ? '<span class="tcost" title="The sump tank, its plumbing and the return pump are priced in the Filtration row">in Filtration</span>' : ''}</button>`;
    if (!isOpen) return html + '</div>';
    html += '<div class="topts">';
    
    if (!z) return html + `<div class="hint">A second tank in the stand: the display drains into it and a return pump sends the water back. It hides the heater and skimmer and adds its water to the system.</div><button type="button" class="tadd" data-act="sump|add">+ Add a sump</button></div></div>`;
    const u = fahr() ? 'in' : 'cm', water = sumpLitres(S);
    const size = ['L', 'D', 'H'].map(k => `<input type="number" data-sz="${k}" min="1" step="${fahr() ? 0.5 : 1}" value="${lenIn(z[k as 'L' | 'D' | 'H'])}" aria-label="${{ L: 'Length', D: 'Depth', H: 'Height' }[k]}" title="${{ L: 'Length', D: 'Depth (front to back)', H: 'Height' }[k]}">`).join(' × ');
    const body = `<div class="tsz" title="Inside size; type to make it a custom size">${z.model ? 'Inside' : 'Custom, inside'} ${size} ${u}</div>`
      + `<span class="tchips"><span class="tchip good" title="${esc(`Its water dilutes the waste with the display's (run ${Math.round(SUMP_FILL * 100)} % full: the rest is room for what drains down when the pump stops). It adds no swimming room.`)}">+${Math.round(water)} L of water</span></span>`
      + `<div class="tstep"><button type="button" data-act="sump|pick">Pick a size…</button></div>`;
    // lane SF (Nathan 2026-10-26): a sump that does not fit inside the stand says so (and is not drawn under the tank)
    if (miss.length) {
      const u = fahr() ? ' in' : ' cm', both = (k: 'size' | 'room') => miss.map(x => `${lenIn(x[k])}${u} ${x.side}`).join(' and ');
      html += `<div class="hint bad"><b>Won’t fit in the stand: this sump is ${both('size')}; the ${S.stand.style === 'cabinet' || S.stand.style === 'custom' ? 'cabinet' : 'stand'} is ${both('room')} inside.</b> Pick a smaller sump, or a longer stand. The sump is not drawn under the tank until it fits.</div>`;
    }
    // lane SF: no fixed minimum; a sump that cannot hold what drains down when the power goes says so
    if (sumpTooSmall(S)) { const v = (l: number) => fahr() ? `${(l / 3.785).toFixed(1)} gal` : `${l.toFixed(1)} L`, room = z.L * z.D * z.H / 1e6 * (1 - SUMP_FILL);
      html += `<div class="hint warn">Too small: when the power goes, about ${v(sumpDrainDown(S))} drains down from the display and this sump has room for ${v(room)}. Pick a bigger sump.</div>`; }
    html += `<div class="tunits">${card(esc(sumpTitle(z)), c, false, 'sump|del', body)}</div><div class="hint">Sump tank, plumbing and return pump: part of the Filtration total above, not added again.</div>`;
    return html + `<div class="hint">${esc(optionDef('filter', 'sump')?.note ?? '')}</div></div></div>`;
  };

  // ---- reef / planted gear (lane GX, 2026-10-27): a real skimmer, UV, CO2 kit, ATO or chiller picked from the catalogue
  /** One product's specs as read from its listing, and what was not readable. */
  const specText = (p: ReefProduct): string => {
    const q = p as ReefProduct & Record<string, unknown>, bits: string[] = [];
    if (q.kind) bits.push(String(q.kind === 'hob' ? 'hang-on' : q.kind === 'sump' ? 'in-sump' : q.kind === 'surface' ? 'surface skimmer' : q.kind));
    if (q.hp) bits.push(`${q.hp} HP`);
    if (q.ratedGal) bits.push(`rated ${q.ratedGal} gal`);
    if (q.galMin || q.galMax) bits.push(`for ${q.galMin ?? 0}-${q.galMax ?? '?'} gal`);
    if (q.gph) bits.push(`${q.gph} gph`);
    if (p.watts !== undefined) bits.push(`${p.watts} W${p.est?.includes('watts') ? ' (pump only)' : ''}`);
    if (q.sensors) bits.push(`${q.sensors} sensors`);
    if (q.pump) bits.push(String(q.pump));
    if (q.coolF) bits.push(`cools ${(q.coolF as number[]).join('-')} °F`);
    if (q.dropF) bits.push(`drops ${([] as number[]).concat(q.dropF as number | number[]).join('-')} °F`);
    if (q.cartridgeG) bits.push(`${q.cartridgeG} g cartridge, up to ${q.lastsDays} days`);
    if (q.stages) bits.push(`${q.stages}-stage`);
    return bits.join(' · ');
  };
  const reefPicker = (S: TankSetup, t: TechSetup, row: string, opt: string): string => {
    const list = reefOptionProducts(row, opt);
    if (!list.length) return '';
    const cur = rowProduct(t, row, opt), label = (p: ReefProduct) => `${productName(p)}${p.priceUsd ? ` · ${usd(p.priceUsd)}` : ''}`;
    let h = `<div class="row"><label for="rp-${row}" title="A real product from the catalogue (Amazon listings read 2026-10-27): its price, watts and size checks replace the generic part's">Product</label><select id="rp-${row}" class="span2" data-prod="${row}"><option value="">Generic</option>${list.map(p => `<option value="${p.id}"${p === cur ? ' selected' : ''}>${esc(label(p))}</option>`).join('')}</select></div>`;
    if (!cur) return h;
    const chk = reefChecks(S, t).filter(c => c.row === row).map(c => `<span class="tchip ${c.level === 'warn' ? 'warn' : 'mute'}">${esc(c.text)}</span>`).join('');
    return h + `<div class="tunit"><div class="tuh"><span class="tun">${esc(productName(cur))}</span></div><div class="hint">${esc(specText(cur))}${cur.note ? `. ${esc(cur.note)}` : ''}</div>`
      + (cur.needSpec?.length ? `<div class="hint">Not stated on the listing: ${esc(cur.needSpec.join(', '))}.</div>` : '')
      + (chk ? `<span class="tchips">${chk}</span>` : '')
      + (cur.popularity ? `<div class="hint">${esc(cur.popularity.evidence)} (seen ${esc(cur.popularity.seen)})</div>` : '')
      + `<div class="hint"><a href="${esc(cur.url)}" target="_blank" rel="noopener">Listing</a></div></div>`;
  };

  const delta = (d: Totals, b: Totals) => {
    const part = (v: number, f: (x: number) => string, cut: number) => Math.abs(v) < cut ? '<span class="tz">±0</span>' : `<span class="${v > 0 ? 'tup' : 'tdn'}">${v > 0 ? '+' : '−'}${f(Math.abs(v))}</span>`;
    return `Setup ${part(d.setup - b.setup, usd, 1)} · Monthly ${part(d.upkeep - b.upkeep, v => usd(v), 0.05)} · Time ${part(d.minutes - b.minutes, v => `${v.toFixed(v < 10 ? 1 : 0)} min/wk`, 0.05)} · Difficulty ${part(d.risk - b.risk, v => v.toFixed(1), 0.05)}`;
  };

  /** The wet tank's head: presets, room temperature, heat loss and the warnings. */
  const wetHead = (S: TankSetup, t: TechSetup) => {
    const presets = presetsFor(S), h = heatLoss(S, t);
    const shownPreset = S.tech ? (t.preset ?? 'custom') : '';
    let html = `<div class="tpre" role="group" aria-label="Tech presets">${presets.map(p => `<button type="button" data-pre="${p.id}" class="${shownPreset === p.id ? 'on' : ''}">${esc(p.label)}</button>`).join('')}<span class="tcustom">${shownPreset === 'custom' ? 'Custom' : !S.tech ? 'Not set: the usual gear for this tank' : ''}</span></div>`;
    html += `<div class="trow2"><label for="tRoom" title="Where the tank stands: the heater makes up the difference to the tank temperature, and with no heater the water follows the room">Room temperature</label><input id="tRoom" type="number" step="${fahr() ? 1 : 0.5}" value="${fahr() ? toF(t.roomC ?? ROOM_C) : t.roomC ?? ROOM_C}"><span>${fahr() ? '°F' : '°C'}</span></div>`;
    const tv = (c?: number) => c === undefined ? '' : String(fahr() ? toF(c) : c);
    html += `<div class="trow2"><label for="tTarget" title="The water temperature this tank is meant to run at, whatever holds it (heater, cooling or the room). Checked against the shared range of its animals; empty = not set">Target water temperature</label><input id="tTarget" type="number" step="${fahr() ? 1 : 0.5}" placeholder="not set" value="${tv(t.targetC)}"><span>${fahr() ? '°F' : '°C'}</span></div>`;
    html += `<div class="trow2"><label for="tMeasured" title="An existing tank: the water temperature you measured. Checked as it is; empty = none">Measured water temperature</label><input id="tMeasured" type="number" step="${fahr() ? 1 : 0.5}" placeholder="optional" value="${tv(t.measuredC)}"><span>${fahr() ? '°F' : '°C'}</span></div>`;
    html += `<div class="hint">Tank ${tempTxt(h.targetC)} (${t.targetC !== undefined ? 'your target' : 'what its animals agree on; set a target above'}). ${h.lossW > 0.5 ? `It loses about ${Math.round(h.lossW)} W through ${(h.wallM2 + h.floorM2).toFixed(2)} m² of glass and ${h.surfaceM2.toFixed(2)} m² of ${S.lid === 'open' ? 'open ' : ''}water surface${sumpOf(S) ? ' (the sump included)' : ''}.` : h.coolW > 0.5 ? `The room is warmer than the tank: ${Math.round(h.coolW)} W to take out.` : 'The room holds it there: no heat needed.'}</div>`;
    const warn: string[] = [];
    if (t.rows.filter === 'none' || shownPreset === 'walstad') warn.push(...walstadGaps(S));
    // the same temperature checks as the plan sheet (temprange.ts): the target or the modelled unheated water, holding it, a measurement
    const shared = sharedRange([...new Set(S.fish.map(f => f.species))].map(getSpecies).filter((x): x is NonNullable<typeof x> => !!x)), ev = tempEvidence(S);
    if (ev && shared.range) for (const k of [operatingCheck(shared, ev), holdCheck(ev), measuredCheck(shared, ev)]) if (k && (k.state === 'outside' || k.state === 'conditional')) warn.push(`${k.text}.`);
    if (offerChiller(S) && t.rows.chiller !== 'chiller') warn.push(`The room (${room(t)}) is warmer than the tank should be (${tempTxt(h.targetC)}): a chiller, or a cooler room.`);
    for (const c of reefChecks(S, t)) if (c.level === 'warn') warn.push(c.text);
    if (t.rows.co2 === 'pressurized' && t.rows.air === 'airstone') warn.push('An airstone running by day blows off the injected CO2: put it on a timer for the night.');
    if (warn.length) html += `<div class="hint why">${warn.map(esc).join('<br>')}</div>`;
    return html;
  };

  function render() {
    const S = store.tank, t = techOf(S), rows = rowsFor(S);
    const dry = !S.water.on;
    let html = '';
    // a dry tank: one gear model (S240, 2026-10-26): these rows are what the totals price and what is drawn, whichever path made the tank
    if (dry) html += '<div class="hint">A terrarium: heat, thermostat, UVB, gauge, misting and a timer. Each is priced in the totals and drawn on the tank. Drag a lamp or the mister anywhere on the top while this menu is open.</div>';
    else html += wetHead(S, t);
    const all = rows.map(r => optionCost(S, r.id, t.rows[r.id] ?? 'none', { tech: t, kwhUsd: kwhUsd() })), sum = (f: (c: OptionCost) => { lo: number; mode: number; hi: number }) => all.reduce((a, c) => ({ lo: a.lo + f(c).lo, mode: a.mode + f(c).mode, hi: a.hi + f(c).hi }), { lo: 0, mode: 0, hi: 0 });
    html += `<div class="ttot"><span>All this gear</span>${range({ ...all[0], setup: sum(c => c.setup), monthlyUsd: sum(c => c.monthlyUsd), minutes: sum(c => c.minutes), kwhMo: all.reduce((a, c) => a + c.kwhMo, 0), est: all.some(c => c.est) }, dry ? 0 : coveredOf(S, t, 'heater') + coveredOf(S, t, 'filter'))}</div>`;
    html += `<div class="tprev" aria-live="polite"></div>`;
    for (const r of rows) {
      if (r.id === 'chiller' && !offerChiller(S) && t.rows.chiller !== 'chiller') continue;
      if (r.qol && !rows.some(x => x.qol && x.id !== r.id && rows.indexOf(x) < rows.indexOf(r))) html += '<div class="hint" style="margin-top:.6em"><b>Quality of life</b>: gear that takes chores off your hands, for a price.</div>';
      const cur = t.rows[r.id] ?? 'none', def = optionDef(r.id, cur), c = optionCost(S, r.id, cur, { tech: t, kwhUsd: kwhUsd() });
      let name = def?.label ?? cur;
      // heaters and filters: the units by name (Nathan 2026-10-20: "Top Fin Submersible Heater 50 W" readily seen)
      if (r.id === 'heater' && cur !== 'none') name = heatLoss(S, t).units.map(u => u.product ? productName(u.product) : `Generic heater ${u.watts} W`).join(' + ');
      if (r.id === 'filter' && cur !== 'none') name = filterUnits(t).map(u => filterLabel(S, u)).join(' + ');
      { const rp = rowProduct(t, r.id, cur); if (rp) name = productName(rp); }
      html += `<div class="trow${open === r.id ? ' open' : ''}" data-row="${r.id}"><button type="button" class="thead" aria-expanded="${open === r.id}"><span class="tlab">${esc(r.label)}</span><span class="tcur">${esc(name)}</span>${range(c, coveredOf(S, t, r.id))}</button>`;
      // an integrated kit's own filter (or heater): shown, not opened (scene/integrated.ts)
      if ((r.id === 'filter' && locksOf(S)?.filter) || (r.id === 'heater' && locksOf(S)?.heater)) { html += `<div class="hint">${esc(lockNote(S, r.id))}${unholdBtn(r.id)}</div></div>`; continue; }
      if (open === r.id && (r.id === 'heater' || r.id === 'filter')) {
        html += `<div class="topts">${r.id === 'heater' ? heaterBody(S, t, cur, c) : filterBody(S, t, cur, c, r)}${def?.note ? `<div class="hint">${esc(def.note)}</div>` : ''}${r.id === 'filter' && filterUnits(t).some(u => u.kind === 'sponge') ? pumpPicker(S, t, 'airpump', 'Air pump for the sponge') : ''}</div></div>`;
        if (r.id === 'filter') html += sumpRow(S, t);
        continue;
      }
      if (open === r.id) {
        html += '<div class="topts">';
        for (const op of r.options) {
          const oc = optionCost(S, r.id, op.id, { tech: t, kwhUsd: kwhUsd() });
          html += `<button type="button" class="topt${op.id === cur ? ' on' : ''}" data-opt="${op.id}" aria-pressed="${op.id === cur}"${op.note ? ` title="${esc(op.note)}"` : ''}><span class="tol">${esc(op.label)}</span>${range(oc)}<span class="tchips">${chips(S, r.id, op.id, oc)}</span></button>`;
        }
        html += reefPicker(S, t, r.id, cur);
        if (def?.note) html += `<div class="hint">${esc(def.note)}</div>`;
        const pg = r.id === 'air' ? 'airpump' : r.id === 'flow' ? def?.parts[0] : undefined;
        if (pg && cur !== 'none') html += pumpPicker(S, t, pg, r.id === 'air' ? 'Air pump' : pg === 'wavemaker' ? 'Wavemaker' : 'Powerhead');
        html += '</div>';
      }
      html += '</div>';
      if (r.id === 'filter') html += sumpRow(S, t);
    }
    mount.innerHTML = html;
  }

  const prev = () => mount.querySelector<HTMLElement>('.tprev');
  const preview = (row: string | undefined, opt: string | undefined) => {
    const el = prev(); if (!el) return;
    const S = store.tank;
    if (!row || !opt) { el.innerHTML = ''; return; }
    const b = baseOf(S), d = totals(withTech(S, withChoice(S, row, opt)));
    el.innerHTML = `<div><b>If picked:</b> ${delta(d, b)}</div>`;
  };
  const techPreview = (tech: TechSetup) => { const el = prev(); if (el) el.innerHTML = `<div><b>If picked:</b> ${delta(totals(withTech(store.tank, tech)), baseOf(store.tank))}</div>`; };
  const presetPreview = (id: string | undefined) => {
    const el = prev(); if (!el) return;
    const S = store.tank;
    if (!id) { el.innerHTML = ''; return; }
    el.innerHTML = `<div><b>${esc(presetsFor(S).find(p => p.id === id)?.label ?? id)}:</b> ${delta(totals(withTech(S, applyPreset(S, id))), baseOf(S))}</div>`;
  };
  const optOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-opt]');
  const preOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-pre]');
  const actOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  const over = (e: Event) => {
    const op = optOf(e), pre = preOf(e), act = actOf(e), cand = act && candidate(act.dataset.act!, store.tank);
    if (cand) techPreview(cand);
    else if (op) preview(op.closest<HTMLElement>('[data-row]')?.dataset.row, op.dataset.opt);
    else if (pre) presetPreview(pre.dataset.pre);
  };
  const out = (e: Event) => { if (optOf(e) || preOf(e) || actOf(e)) preview(undefined, undefined); };
  mount.addEventListener('mouseover', over); mount.addEventListener('focusin', over);
  mount.addEventListener('mouseout', out); mount.addEventListener('focusout', out);
  mount.addEventListener('click', e => {
    const el = e.target as HTMLElement, rowEl = el.closest<HTMLElement>('[data-row]'), row = rowEl?.dataset.row;
    const pre = el.closest<HTMLElement>('[data-pre]');
    if (pre) { edit(s => applyPreset(s, pre.dataset.pre!)); return; }
    const lk = locksOf(store.tank);
    if (el.closest('.thead') && row && ((row === 'filter' && lk?.filter) || (row === 'heater' && lk?.heater))) return;
    if (el.closest('.thead') && row) { open = open === row ? null : row; adding = null; render(); return; }
    const act = el.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act) {
      const [a, b, c] = act.split('|');
      if (a === 'adding') { adding = b ? { row: b as UnitRow, ...(c ? { kind: c } : {}) } : null; render(); return; }
      if (a === 'addh' || a === 'addf') adding = null;
      if (a === 'sump' && b === 'pick') { o.pickSump?.(m => edit(s => ({ ...techOf(s), sump: sumpFromModel(m) }))); return; }
      if (a === 'sump' && b === 'add') { open = 'sump'; adding = null; }
      if (candidate(act, store.tank)) edit(s => candidate(act, s)!);
      return;
    }
    const op = el.closest<HTMLElement>('[data-opt]');
    if (op && row) { edit(s => withChoice(s, row, op.dataset.opt!)); return; }
  });
  mount.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.pump) { // a pump product (or generic: empty)
      const gear = el.dataset.pump, id = (el as unknown as HTMLSelectElement).value;
      edit(s => { const t = { ...techOf(s) }, pumps = { ...t.pumps }; if (id) pumps[gear] = id; else delete pumps[gear]; if (Object.keys(pumps).length) t.pumps = pumps; else delete t.pumps; return t; });
      return;
    }
    if (el.dataset.prod) { // a catalogue product for a reef / planted row (lane GX); empty = the generic part
      const row = el.dataset.prod, id = el.value;
      edit(s => { const t = { ...techOf(s) }, products = { ...t.products }; if (id) products[row] = id; else delete products[row]; if (Object.keys(products).length) t.products = products; else delete t.products; return t; });
      return;
    }
    if (el.dataset.hw !== undefined) { // a generic heater's watts
      const i = +el.dataset.hw, w = Math.round(+el.value);
      if (el.value !== '' && isFinite(w)) edit(s => { const t = techOf(s); return withUnits(t, 'heater', heatersNow(s, t).map((u, k) => k === i ? { ...u, w: Math.min(2000, Math.max(5, w)) } : u)); });
      return;
    }
    if (el.dataset.sz) { // a custom sump size, in the viewer's units
      const v = +el.value, k = el.dataset.sz as 'L' | 'D' | 'H';
      if (el.value !== '' && isFinite(v) && v > 0) edit(s => { const t = techOf(s), z = sumpOf(s, true)!, mm = Math.min(3000, Math.max(50, Math.round(v * (fahr() ? 25.4 : 10)))); return { ...t, sump: { L: z.L, D: z.D, H: z.H, [k]: mm } }; });
      return;
    }
    if ((el.id === 'tTarget' || el.id === 'tMeasured') && (el.value === '' || isFinite(+el.value))) { // empty clears it
      const key = el.id === 'tTarget' ? 'targetC' : 'measuredC';
      edit(s => { const t = { ...techOf(s) }; if (el.value === '') delete t[key]; else t[key] = Math.min(40, Math.max(0, fahr() ? fromF(+el.value) : +el.value)); return t; });
      return;
    }
    if (el.id !== 'tRoom' || !isFinite(+el.value) || el.value === '') return;
    const c = Math.min(40, Math.max(0, fahr() ? fromF(+el.value) : +el.value));
    edit(s => ({ ...techOf(s), roomC: c }));
  });
  // ---- Lighting (2026-10-20, Nathan: the best-selling lights modelled as the real products): a catalogued light that fits
  // the tank's length (its brackets' range), or the generic fixture set by the controls below. A product sets the fixture,
  // its lamp and its watts; with no PAR published the light model's estimate from those watts stands, and the card says so.
  const lightMount = document.getElementById('lProduct');
  const MOUNT_NAME: Record<LightProduct['mount'], string> = {
    bar: 'slim bar on extendable brackets resting on the rim', 'rim-legs': 'slab on two clip legs on the rim',
    gooseneck: 'disc on a gooseneck clamp', submersible: 'submersible stick on suction cups',
    hanging: 'compact fixture on a rim arm or hanging kit',
  };
  let lightKey = '';
  function renderLight() {
    if (!lightMount) return;
    const S = store.tank, l = S.light, cur = productOn(l), inch = (mm: number) => Math.round(mm / 25.4), o = cur ? lightOutCached(S) : null;
    const kitLight = locksOf(S)?.light ? integratedKit(S) : undefined;
    const key = JSON.stringify([S.lid, S.tank.L, cur?.id, o && Math.round(o.mean), store.scene.units, kitLight?.id, l.watts]);
    if (key === lightKey) return;
    lightKey = key;
    if (kitLight) { // an integrated kit has its own light: no catalogue to pick from
      const t = TECHS[l.tech ?? kitLight.light.tech];
      lightMount.innerHTML = `<div class="tunit"><div class="tuh"><span class="tun">${esc(kitLight.name)}: its own light</span></div><div class="hint">${l.watts ?? kitLight.light.watts ?? '?'} W ${esc(t?.label ?? 'LED')}${kitLight.light.spec === 'published' ? '' : ' (from the listing)'}. ${esc(lockNote(S, 'light'))}${unholdBtn('light')}</div></div>`;
      return;
    }
    if (S.lid === 'hood') { lightMount.innerHTML = '<div class="hint">The hood holds its own lamps: take the hood off (Lid) to fit one of the catalogued lights.</div>'; return; }
    const fits = lightsFor(S.tank.L), list = cur && !fits.includes(cur) ? [cur, ...fits] : fits;
    const label = (p: LightProduct) => `${productName(p)} · ${p.watts} W${p.est?.includes('watts') ? ' (est.)' : ''}${p.priceUsd ? ` · ${usd(p.priceUsd)}` : ''}`;
    let html = `<div class="row"><label for="lProd" title="A real light from the catalogue (the Amazon best sellers), drawn at its own size and colours: the ones whose brackets fit this tank's length. Generic: the fixture set below">Product</label><select id="lProd" class="span2"><option value="">Generic (set below)</option>${list.map(p => `<option value="${p.id}"${p === cur ? ' selected' : ''}>${esc(label(p))}</option>`).join('')}</select></div>`;
    if (!fits.length) html += `<div class="hint">No catalogued light fits a ${Math.round(S.tank.L)} mm (${inch(S.tank.L)} in) long tank: the generic fixture below.</div>`;
    if (cur) {
      const sz = ['lengthMm', 'widthMm', 'heightMm'].some(f => cur.est?.includes(f)) ? ' (size estimated)' : '';
      const fit = cur.mount === 'bar' || cur.mount === 'rim-legs' ? `, fits ${inch(cur.fitMinMm)}-${inch(cur.fitMaxMm)} in tanks` : '';
      const par = o ? ` About ${Math.round(o.mean)} PAR on the substrate here (${cur.par ? 'scaled to the published figure' : 'estimated'}).` : '';
      html += `<div class="tunit"><div class="tuh"><span class="tun">${esc(productName(cur))}</span></div>`
        + `<div class="hint">${cur.lengthMm} × ${cur.widthMm} × ${cur.heightMm} mm ${esc(MOUNT_NAME[cur.mount])}${fit}${sz}. ${esc(lightProductNote(cur))}${par}</div>`
        + `${cur.popularity ? `<div class="hint">${esc(cur.popularity.evidence)} (seen ${esc(cur.popularity.seen)})</div>` : ''}`
        + `<div class="hint"><a href="${esc(cur.url)}" target="_blank" rel="noopener">Listing</a>${cur.controller ? ` · controller: ${esc(cur.controller)}` : ''}</div></div>`;
    }
    lightMount.innerHTML = html;
  }
  lightMount?.addEventListener('change', e => {
    const el = e.target as HTMLSelectElement;
    if (el.id !== 'lProd') return;
    store.edit(s => applyLightProduct(s.light, s.tank, lightProduct(el.value)));
  });
  render(); renderLight();
  return { render };
}
