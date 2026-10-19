// Guided start (lane KW, 2026-10-19; plan lane D in research/plan-guided-start-kits.md). Lives in the start dialog's
// #startGuided slot and feeds the existing editor: stage -> goal and ONE expected-cost number -> bare tank or kit by size
// band -> result (the scene opens with that tank or kit, a starter scape for the goal, the demand panel's limits set, and
// the light's upgrade path in plain words). Pure picking / pricing first (tested in test/wizard.test.ts), then the DOM.
import { BANDS, TANK_MODELS, bandOf, dimsInches, tankFromModel, tankFromOuter, type TankBand, type TankModel } from '../data/tanks';
import { KITS, kitGear, type KitModel } from '../data/kits';
import { DEALS, pctOff, type Deal, type DealPart } from '../data/deals';
import { HERP, SQFT_MM2 } from '../data/herpstock';
import { FACTORS, demandOf, defaultProfile, type DemandOpts, type Limits, type UserProfile } from '../demand';
import { pinDeal } from '../demand/pinned';
import { applyKitLight, kitCapability, upgradePath, type KitLike } from '../scene/kitlight';
import { emptyScene } from '../scene/defaults';
import { regenerate } from '../scene/starter';
import { styleGround } from '../scene/scapeground';
import { isLandStyle } from '../scene/items';
import { IN } from '../scene/physics';
import type { FitLight } from '../scene/plantfit';
import type { LayoutId, Scene, Tank, TankSetup } from '../scene/types';

// ---- the questions ----

export type Stage = 'new' | 'have' | 'know';
export type Goal = 'community' | 'planted' | 'terrarium';
export type Pick = 'bare' | 'kit';

/** The land animals a terrarium can be planned around: species id, the HERP rule (scientific name), the starter style. */
export const TERRA_ANIMALS: { id: string; sci: string; style: LayoutId }[] = [
  { id: 'leopardgecko', sci: 'Eublepharis macularius', style: 'arid' },
  { id: 'crestedgecko', sci: 'Correlophus ciliatus', style: 'rainforest' },
  { id: 'greenanole', sci: 'Anolis carolinensis', style: 'rainforest' },
  { id: 'brownanole', sci: 'Anolis sagrei', style: 'rainforest' },
  { id: 'ballpython', sci: 'Python regius', style: 'python' },
  { id: 'dartfrog', sci: 'Dendrobates tinctorius', style: 'frogs' },
  { id: 'treefrog', sci: 'Ranoidea caerulea', style: 'frogs' },
];
export const animalName = (id: string) => { const a = TERRA_ANIMALS.find(x => x.id === id); return a ? HERP[a.sci]?.name ?? id : id; };

export const GOALS: { goal: Goal; title: string; hint: string }[] = [
  { goal: 'community', title: 'Freshwater fish', hint: 'A community of easy fish, wood and hardy plants' },
  { goal: 'planted', title: 'Planted aquarium', hint: 'Plants first: the light decides what grows' },
  { goal: 'terrarium', title: 'Terrarium', hint: 'A dry or humid home for one reptile or frog' },
];

/** The starter set the result opens with, and the light level the goal asks for. */
export function goalStyle(goal: Goal, animal?: string): LayoutId {
  if (goal === 'terrarium') return TERRA_ANIMALS.find(a => a.id === animal)?.style ?? 'rainforest';
  return goal === 'planted' ? 'planted' : 'driftwood';
}
export const goalLight = (goal: Goal): FitLight => (goal === 'planted' ? 'medium' : 'low');

// ---- the candidates ----

export interface Candidate {
  kind: Pick;
  id: string;
  name: string;
  /** what the card says under the name: outer size, what is in the box */
  detail: string;
  band: TankBand;
  gal: number;
  model: TankModel;
  tank: Tank;
  glass: number;
  kit?: KitModel;
  /** the live deal a kit is priced at (on sale or a fresher bundle price), when one is known */
  deal?: Deal;
  /** the price the engine is given for a kit (deal, else the kit's listed price); absent = priced as parts */
  kitUsd?: number;
  /** a terrarium tank smaller than the animal's recommended floor or height, but at or above the minimum */
  tight?: string;
}

/** Outer floor area in sq ft. */
const floorSqft = (m: TankModel) => (m.outer.L * m.outer.D) / SQFT_MM2;

/** Does a terrarium tank house one adult of this animal? 'fit', 'tight' (at or above the minimum, below the recommended
 *  floor) or 'no' (below the minimum floor or the minimum height). */
export function terraFit(m: TankModel, animal: string): { fit: 'fit' | 'tight' | 'no'; why: string } {
  const a = TERRA_ANIMALS.find(x => x.id === animal), r = a && HERP[a.sci];
  if (!r) return { fit: 'fit', why: '' };
  const f = floorSqft(m), hIn = m.outer.H / IN;
  if (r.hMin && hIn < r.hMin - 0.5) return { fit: 'no', why: `${r.name} climbs: needs ${r.hMin} in of height` };
  if (f < r.min - 0.05) return { fit: 'no', why: `${r.name} needs ${r.min} sq ft of floor` };
  if (f < r.rec - 0.05) return { fit: 'tight', why: `the minimum for one ${r.name.toLowerCase()}; ${r.rec} sq ft is better` };
  return { fit: 'fit', why: '' };
}

/** The catalog tank a kit sits on: its own id, else its outer size, else the nearest rectangle by rated gallons. */
export function kitTank(k: KitModel, models: TankModel[] = TANK_MODELS): { model: TankModel; tank: Tank; glass: number } {
  const own = k.tank ? models.find(m => m.id === k.tank) : undefined;
  const near = own ?? models.filter(m => !m.terrarium && m.shape === 'rect').reduce((a, b) => (Math.abs(b.ratedGal - k.tankRatedGal) < Math.abs(a.ratedGal - k.tankRatedGal) ? b : a));
  if (!own && k.tankDims) { const { tank, glass } = tankFromOuter({ outer: k.tankDims }); return { model: near, tank, glass }; }
  return { model: near, tank: tankFromModel(near), glass: near.glassMm };
}

const DAY = 864e5;
/** The cheapest live deal for this kit (checked in the last 30 days, sale not ended, not an estimate row). */
export function kitDeal(k: KitModel, now = Date.now(), deals: Deal[] = DEALS): Deal | undefined {
  return deals.filter(d => d.kit === k.id && !d.est && now - Date.parse(d.asOf) <= 30 * DAY && !(d.saleEnds && Date.parse(d.saleEnds + 'T23:59:59') < now))
    .sort((a, b) => a.price.usd - b.price.usd)[0];
}

/** Every tank or kit the goal can use: freshwater aquaria for fish and plants (no tank under 5 gal: too small to keep
 *  fish stable), terrarium tanks that house the named animal; kits only for the water goals (fresh kits). */
export function candidates(goal: Goal, kind: Pick, animal?: string, now = Date.now()): Candidate[] {
  const out: Candidate[] = [];
  if (kind === 'bare') {
    for (const m of TANK_MODELS) {
      if (goal === 'terrarium' ? !m.terrarium : m.terrarium || m.ratedGal < 5) continue;
      let tight: string | undefined;
      if (goal === 'terrarium' && animal) { const f = terraFit(m, animal); if (f.fit === 'no') continue; if (f.fit === 'tight') tight = f.why; }
      out.push({ kind, id: m.id, name: m.terrarium && !/gal/i.test(m.name) ? `${m.name} (${Math.round(m.ratedGal)} gal)` : m.name, detail: `${dimsInches(m.outer)} in outside`, band: m.band, gal: m.ratedGal, model: m, tank: tankFromModel(m), glass: m.glassMm, tight });
    }
  } else if (goal !== 'terrarium') {
    for (const k of KITS) {
      if (k.water !== 'fresh') continue;
      const t = kitTank(k), deal = kitDeal(k, now), usd = deal?.price.usd ?? k.price?.usd;
      const has = ['light', 'filter', ...(k.heater ? ['heater'] : []), ...(k.stand ? ['stand'] : [])].join(', ');
      out.push({ kind, id: k.id, name: `${k.brand} ${k.name}`, detail: `${k.tankRatedGal} gal with ${has}`, band: bandOf(k.tankRatedGal), gal: k.tankRatedGal, model: t.model, tank: t.tank, glass: t.glass, kit: k, deal, kitUsd: usd });
    }
  }
  return out.sort((a, b) => a.gal - b.gal || a.name.localeCompare(b.name));
}

// ---- the scene and its price ----

/** The deal the demand panel prices the kit by: a real live deal, else one made from the kit's own listing. */
export function kitAsDeal(c: Candidate): Deal | undefined {
  const k = c.kit;
  if (!k) return undefined;
  if (c.deal) return c.deal;
  if (!k.price) return undefined;
  const includes: DealPart[] = ['tank', 'lid', 'light', 'filter', ...(k.heater ? ['heater' as const] : []), ...(k.stand ? ['stand' as const] : [])];
  return { id: `kit:${k.id}`, retailer: k.brand, name: k.name, gal: k.tankRatedGal, tank: c.model.id, kit: k.id, includes, price: { usd: k.price.usd }, url: k.price.url, asOf: k.price.asOf };
}

/** The engine's kit option for a candidate (undefined = priced as separate parts). */
export function kitOpt(c: Candidate): DemandOpts['kit'] {
  const d = kitAsDeal(c), k = c.kit;
  if (!d || !k) return undefined;
  const g = kitGear(k);
  return { id: d.id, priceUsd: d.price.usd, asOf: d.asOf, includes: d.includes, label: `${d.retailer} ${d.name}`, filter: g.filter, heater: d.includes.includes('heater') ? g.heater : undefined };
}

/** The light the tank is judged with: the kit's own, else a stand-in LED bar the user would buy with a bare tank (no
 *  watts: the tier default for this size, labelled a rough guess; a mid-power planted LED for a planted goal (the plant tier reads 'very bright' from 40 gal up), a budget one otherwise). */
export function lightKit(c: Candidate, goal: Goal): KitLike {
  if (c.kit) return c.kit as KitLike;
  return { light: { type: 'led', tech: goal === 'planted' ? 'led-planted' : 'led-white', count: 1, watts: null, spec: 'guess' }, lid: 'open', water: 'fresh', tier: goal === 'planted' ? 'mid' : 'budget', tankRatedGal: c.gal };
}

/** The tank on its own: catalog size and glass, a stand from 15 gal up (a nano sits on a desk), the kit's light and lid
 *  (a bare tank: the stand-in LED, no lid). */
export function baseSetup(c: Candidate, goal: Goal = 'community'): TankSetup {
  let S = emptyScene().tanks[0];
  S.tank = c.tank; S.render.glass = c.glass;
  S.camera = { ...S.camera, az: 35, el: 22, zoom: 0.8 };
  // a terrarium sits on furniture (most are sold without a stand); priced and drawn without one
  S.stand = { ...S.stand, show: c.model.terrarium && !c.kit ? false : c.kit ? !!c.kit.stand || c.gal >= 15 : c.gal >= 15 };
  S = applyKitLight(S, lightKit(c, goal));
  if (c.kit) S.lid = c.kit.lid;
  return S;
}

/** The scene the result opens: the base tank with the goal's starter set (ground, hardscape, plants; no animals, the
 *  user adds those). A terrarium turns the water off and gets a mesh top. Planted plants are kept to what the light grows. */
export function wizardScene(c: Candidate, goal: Goal, animal?: string): Scene {
  const sc = emptyScene(), S = baseSetup(c, goal), style = goalStyle(goal, animal);
  S.layout = { ...S.layout, id: style, seed: 1 + (c.id.length * 31) % 97, dens: { hard: 2, plant: 2, animal: 0 } };
  if (isLandStyle(style)) { S.water.on = false; if (!c.kit) S.lid = 'mesh'; }
  S.substrate.show = true; S.render.bg = 'blue';
  if (!S.water.on) S.render.bg = 'none';
  if (goal === 'planted') { const lv = kitCapability(S).level; if (lv !== 'none') S.layout.fit = lv; S.grow.feed = lv === 'high' ? 'ferts' : 'low'; }
  styleGround(S);
  regenerate(S, 'all', 1);
  sc.tanks[0] = S;
  sc.name = goal === 'terrarium' ? `${animalName(animal ?? '')} terrarium` : `${c.name} ${goal === 'planted' ? 'planted' : 'community'}`;
  return sc;
}

export interface Priced { setup: number; upkeep: number }
/** Expected setup $ and upkeep $/month (the engine's means) for a setup, with the candidate's kit price when it has one. */
export function priceOf(S: TankSetup, c: Candidate, P: UserProfile = defaultProfile(), now = Date.now()): Priced {
  const D = demandOf(S, P, { kit: kitOpt(c), now });
  return { setup: D.totals.setupUsd, upkeep: D.totals.upkeepUsdMo };
}

/** Where the opened scene's price (tank, gear and starter scape) leaves the budget: 'fits' with room left for animals,
 *  'tight' (fits, but under ROOM of the budget is left for them), 'over'. No budget = everything fits. */
export const ROOM = 0.1;
export function budgetFit(p: Priced, setupUsd?: number, upkeepUsdMo?: number): 'fits' | 'tight' | 'over' {
  if (setupUsd && p.setup > setupUsd) return 'over';
  if (upkeepUsdMo && p.upkeep > upkeepUsdMo) return 'over';
  if (setupUsd && p.setup > setupUsd * (1 - ROOM)) return 'tight';
  return 'fits';
}

/** The upkeep $/month typed by the user as the demand panel's upkeep chip (near free / low / flexible). */
export function upkeepChip(usd: number | undefined, cuts: { free: number; low: number }): Limits['upkeep'] {
  if (!usd || !(usd > 0)) return undefined;
  return usd <= cuts.free ? 'free' : usd <= cuts.low ? 'low' : 'flex';
}

/** The upgrade path in plain words: what this light grows, and what the goal's light level would take. */
export function upgradeWords(S: TankSetup, c: Candidate, goal: Goal): string[] {
  if (!S.water.on) return [];
  const cap = kitCapability(S), out = [`${c.kit ? 'This light' : `A typical ${goal === 'planted' ? 'planted' : 'budget'} LED for this size (a guess until you set yours)`}: ${cap.sentence}`];
  const kit = lightKit(c, goal);
  const goals: FitLight[] = goal === 'planted' ? ['medium', 'high'] : ['medium'];
  for (const g of goals) {
    const up = upgradePath(kit, S.tank, g, false), what = g === 'medium' ? 'most stem plants and swords' : 'carpets and red stems';
    const usd = up.steps.reduce((a, s) => a + (s.priceUsd?.mode ?? 0), 0);
    const steps = up.steps.map(s => s.reason).join('; ');
    out.push(up.verdict === 'works as is' ? `For ${what}: the light is already enough${steps ? `; add ${steps}` : ''}.`
      : up.verdict === 'swap the light' ? `For ${what}: swap the light (${steps})${usd ? `, about $${Math.round(usd)}` : ''}.`
      : `For ${what}: effectively a new build (${steps}).`);
  }
  return out;
}

// ---- the dialog ----

export interface WizardHooks {
  /** open the finished scene (replace the store's scene; the caller clears its saved-tank link) */
  open: (scene: Scene) => void;
  /** the demand panel's limits */
  limits: (l: Partial<Limits>) => void;
  status: (msg: string) => void;
  /** leave the wizard for the chooser's tabs (and Start from scratch) */
  dialog: HTMLDialogElement;
}

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const usd = (v: number) => '$' + Math.round(v).toLocaleString();
const num = (v: string) => { const n = parseFloat(v.replace(/[$,\s]/g, '')); return n > 0 ? n : undefined; };

interface State { step: 0 | 1 | 2 | 3; stage: Stage; goal: Goal; animal: string; setupUsd?: number; upkeepUsd?: number; kind: Pick; band: TankBand | 'all'; showOver: boolean; pick?: Candidate }

/** Fill #startGuided: an entry button that turns the start dialog into the four-step guided start. */
export function attachWizard(mount: HTMLElement, h: WizardHooks) {
  const dlg = h.dialog;
  let st: State = { step: 0, stage: 'new', goal: 'community', animal: TERRA_ANIMALS[0].id, kind: 'bare', band: 'all', showOver: false };
  const priceCache = new Map<string, { gear: Priced; full: Priced }>();
  mount.hidden = false;
  mount.innerHTML = `<button type="button" id="wzStart"><b>Help me choose</b><span>A few questions, then a tank that fits your goal and budget</span></button>`;
  const box = document.createElement('div');
  box.className = 'wz'; box.hidden = true;
  mount.parentElement!.after(box);
  const setOn = (on: boolean) => { dlg.classList.toggle('wzon', on); box.hidden = !on; };
  mount.querySelector<HTMLButtonElement>('#wzStart')!.onclick = () => { st = { ...st, step: 0, pick: undefined }; setOn(true); draw(); };
  dlg.addEventListener('close', () => setOn(false));

  const head = (n: number, title: string) =>
    `<div class="wzhead"><button type="button" class="wzback" data-wz="back" aria-label="Back">‹ Back</button><span class="wzstep">Step ${n} of 4</span>` +
    `<button type="button" class="wzskip" data-wz="skip">All options</button></div><h3 class="wztitle">${title}</h3>`;
  const choice = (val: string, cur: string, name: string, title: string, hint: string) =>
    `<button type="button" class="wzopt" data-${name}="${val}" aria-pressed="${val === cur}"><b>${esc(title)}</b><span>${esc(hint)}</span></button>`;

  /** Tank and gear alone, and the scene the result opens (with the goal's starter scape): a few ms each. */
  function price(c: Candidate) {
    const k = `${st.goal}:${st.animal}:${c.kind}:${c.id}`;
    let p = priceCache.get(k);
    if (!p) { p = { gear: priceOf(baseSetup(c, st.goal), c), full: priceOf(wizardScene(c, st.goal, st.animal).tanks[0], c) }; priceCache.set(k, p); }
    return p;
  }

  function draw() {
    const s = st;
    if (s.step === 0) {
      box.innerHTML = head(1, 'Where are you?') + `<div class="wzopts">` +
        choice('new', s.stage, 'stage', 'New to this', 'Pick a goal and a budget; we suggest tanks that fit') +
        choice('have', s.stage, 'stage', 'I already have a tank or kit', 'Find yours and see what it can grow and what an upgrade takes') +
        choice('know', s.stage, 'stage', 'I know what I want', 'Straight to deals, starter tanks and your saved tanks') + `</div>`;
    } else if (s.step === 1) {
      const animals = TERRA_ANIMALS.map(a => `<option value="${a.id}"${a.id === s.animal ? ' selected' : ''}>${esc(animalName(a.id))}</option>`).join('');
      box.innerHTML = head(2, s.stage === 'have' ? 'What is it for?' : 'What are you making?') + `<div class="wzopts">` +
        GOALS.map(g => choice(g.goal, s.goal, 'goal', g.title, g.hint)).join('') + `</div>` +
        `<label class="wzrow" ${s.goal === 'terrarium' ? '' : 'hidden'}>For a <select id="wzAnimal">${animals}</select></label>` +
        (s.stage === 'have' ? '' :
          `<label class="wzrow wzmoney">What do you want your expected cost to be? <span class="wzin">$<input id="wzSetup" inputmode="decimal" placeholder="e.g. 300" value="${s.setupUsd ?? ''}"></span></label>` +
          `<p class="hint">Everything to set it up: tank, gear, ground, stones, plants and animals. One number, the cost you expect.</p>` +
          `<label class="wzrow wzmoney">And upkeep a month (optional) <span class="wzin">$<input id="wzUpkeep" inputmode="decimal" placeholder="any" value="${s.upkeepUsd ?? ''}"></span></label>`) +
        `<div class="wznext"><button type="button" class="primary" data-wz="next">Next</button></div>`;
    } else if (s.step === 2) {
      const all = candidates(s.goal, s.kind, s.animal), kitsOk = s.goal !== 'terrarium';
      const bands = BANDS.filter(([b]) => all.some(c => c.band === b));
      const band = s.band !== 'all' && !bands.some(([b]) => b === s.band) ? 'all' : s.band;
      const list = all.filter(c => band === 'all' || c.band === band).map(c => ({ c, ...price(c) })).map(x => ({ ...x, fit: s.stage === 'have' ? 'fits' as const : budgetFit(x.full, s.setupUsd, s.upkeepUsd) }));
      const ok = list.filter(x => x.fit !== 'over'), over = list.filter(x => x.fit === 'over');
      const card = (x: typeof list[number]) => {
        const { c, gear, full: p, fit } = x, left = s.setupUsd ? s.setupUsd - p.setup : undefined;
        const sale = c.deal && pctOff(c.deal) ? ` <span class="wzsale">${pctOff(c.deal)}% off at ${esc(c.deal.retailer)}</span>` : c.deal ? ` <span class="wzsale">at ${esc(c.deal.retailer)}</span>` : '';
        const money = s.stage === 'have' ? '' : `<span class="wzusd">${usd(p.setup)} expected${left != null ? `, ${left >= 0 ? `${usd(left)} left for animals` : `${usd(-left)} over`}` : ''}</span>` +
          `<span class="hint">tank and gear ${usd(gear.setup)}${c.kit && c.kitUsd == null ? ' (no kit price listed: priced as parts)' : ''}${sale}; upkeep about ${usd(p.upkeep)} a month</span>`;
        return `<button type="button" class="wzcard wz-${fit}" data-pick="${esc(c.id)}"><b>${esc(c.name)}</b><span class="hint">${esc(c.detail)}</span>${money}` +
          (c.tight ? `<span class="hint wzwarn">${esc(c.tight)}</span>` : '') + `</button>`;
      };
      box.innerHTML = head(3, s.stage === 'have' ? 'Which one do you have?' : 'Pick a tank') +
        (kitsOk ? `<div class="wzseg" role="group" aria-label="Bare tank or kit">${(['bare', 'kit'] as Pick[]).map(k => `<button type="button" data-kind="${k}" aria-pressed="${s.kind === k}">${k === 'bare' ? 'Bare tank' : 'Kit (tank, light, filter)'}</button>`).join('')}</div>` : '') +
        `<div class="wzbands" role="group" aria-label="Size">${[['all', 'All sizes'] as const, ...bands].map(([b, t]) => `<button type="button" data-band="${b}" aria-pressed="${band === b}">${esc(t.replace(/ \(.*\)/, ''))}</button>`).join('')}</div>` +
        (s.stage !== 'have' && s.setupUsd ? `<p class="hint">Budget ${usd(s.setupUsd)} expected${s.upkeepUsd ? `, ${usd(s.upkeepUsd)} a month` : ''}: ${ok.length} fit${over.length ? `, ${over.length} over` : ''}. Each price is the tank as it opens: tank, gear, ground, stones and plants; animals come on top.</p>` : '') +
        `<div class="wzlist">${ok.map(card).join('') || `<p class="hint">Nothing here fits that budget. Try ${kitsOk ? 'a smaller size, a kit, ' : 'a smaller size '}or a higher number.</p>`}</div>` +
        (over.length ? `<button type="button" class="wzmore" data-wz="over">${s.showOver ? 'Hide' : 'Show'} ${over.length} over budget</button>${s.showOver ? `<div class="wzlist">${over.map(card).join('')}</div>` : ''}` : '');
    } else {
      const c = s.pick!, sc = wizardScene(c, s.goal, s.animal), S = sc.tanks[0], p = priceOf(S, c);
      const words = upgradeWords(S, c, s.goal), r = s.goal === 'terrarium' ? HERP[TERRA_ANIMALS.find(a => a.id === s.animal)!.sci] : undefined;
      const fit = s.stage === 'have' ? 'fits' : budgetFit(p, s.setupUsd, s.upkeepUsd);
      box.innerHTML = head(4, esc(c.name)) +
        `<p class="hint">${esc(c.detail)}${c.deal ? ` · ${esc(c.deal.retailer)} ${usd(c.deal.price.usd)} as of ${esc(c.deal.asOf)}` : c.kit?.price ? ` · ${usd(c.kit.price.usd)} as of ${esc(c.kit.price.asOf)}` : ''}</p>` +
        `<div class="wzsum"><div><b>${usd(p.setup)}</b><span>expected to set up, with a starter scape</span></div><div><b>${usd(p.upkeep)}</b><span>upkeep a month</span></div></div>` +
        (s.setupUsd && s.stage !== 'have' ? `<p class="hint">${fit === 'over' ? `Over your ${usd(s.setupUsd)} by ${usd(p.setup - s.setupUsd)}: the demand panel suggests swaps.` : `Within your ${usd(s.setupUsd)}, before animals: ${usd(s.setupUsd - p.setup)} left for them.`}</p>` : '') +
        (words.length ? `<ul class="wzup">${words.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '') +
        (r ? `<p class="hint">Add your ${esc(r.name.toLowerCase())} from Animals. ${esc(r.group)}</p>` : `<p class="hint">Animals are yours to add; the demand panel keeps the numbers live as you build.</p>`) +
        `<div class="wznext"><button type="button" class="primary" data-wz="open">Open this tank</button></div>`;
    }
    const first = box.querySelector<HTMLElement>('[aria-pressed="true"], .primary, .wzcard');
    first?.focus({ preventScroll: true });
  }

  const readMoney = () => {
    const a = box.querySelector<HTMLInputElement>('#wzSetup'), b = box.querySelector<HTMLInputElement>('#wzUpkeep');
    if (a) st.setupUsd = num(a.value);
    if (b) st.upkeepUsd = num(b.value);
  };
  box.addEventListener('change', e => { const t = e.target as HTMLElement; if (t.id === 'wzAnimal') st.animal = (t as HTMLSelectElement).value; else readMoney(); });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); readMoney(); st.step = 2; draw(); } });
  box.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    const d = t.dataset;
    if (d.stage) {
      st.stage = d.stage as Stage;
      if (st.stage === 'know') { setOn(false); return; }
      st.step = 1;
    } else if (d.goal) { readMoney(); st.goal = d.goal as Goal; if (st.goal === 'terrarium') st.kind = 'bare'; }
    else if (d.kind) { st.kind = d.kind as Pick; st.showOver = false; }
    else if (d.band) st.band = d.band as TankBand | 'all';
    else if (d.pick) { st.pick = candidates(st.goal, st.kind, st.animal).find(c => c.id === d.pick); if (!st.pick) return; st.step = 3; }
    else if (d.wz === 'back') { if (st.step === 0) { setOn(false); return; } st.step = (st.step - 1) as State['step']; }
    else if (d.wz === 'skip') { setOn(false); return; }
    else if (d.wz === 'next') { readMoney(); st.step = 2; }
    else if (d.wz === 'over') st.showOver = !st.showOver;
    else if (d.wz === 'open') { finish(); return; }
    else return;
    draw();
  });

  function finish() {
    const s = st, c = s.pick!, sc = wizardScene(c, s.goal, s.animal), deal = kitAsDeal(c);
    dlg.close();
    if (deal) pinDeal(deal);
    h.open(sc);
    if (s.stage !== 'have') h.limits({ setupUsd: s.setupUsd, upkeep: upkeepChip(s.upkeepUsd, { free: FACTORS.limits.upkeepNearFreeUsdMo, low: FACTORS.limits.upkeepLowUsdMo }) });
    const up = upgradeWords(sc.tanks[0], c, s.goal).slice(1).join(' ');
    h.status(`Opened ${c.name} as a ${s.goal === 'terrarium' ? `${animalName(s.animal).toLowerCase()} terrarium` : s.goal === 'planted' ? 'planted tank' : 'community tank'}.` +
      (s.setupUsd && s.stage !== 'have' ? ` Your expected cost, ${usd(s.setupUsd)}, is set as the demand panel's limit.` : '') + (up ? ' ' + up : '') + ' Undo brings the previous tank back.');
  }
}
