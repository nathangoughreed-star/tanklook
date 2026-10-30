// The "why not" card (lane U4; moved out of ui/suggest.ts and reworked by lane NG4): the limiting factor in plain words with the numbers, then FOUR PATHS (keep the vision, keep the limits, keep the look,
// save the ambition), each with its verified buttons or the plain reason it has none, and the list of ambitions already saved. A button edits the brief (locks kept) and the generator re-runs.
// The button index is the alternative's index in `inf.alternatives` (suggest.ts reads data-alt).
// Lane GV7: the "keep the look" path also carries a compound compromise (compromise.ts: drop / shrink a group, a smaller tank, a plainer tier, low-tech plants, all verified) and the
// other style with the roster kept; "Compare" opens the two side by side in the split view, with the broken limit and the money / care differences first on the tabs (diff.ts).
// The search takes a second or two, so the card holds a slot that is filled once it is on screen (`attachCompare`, hooked from panels.ts; the same slot sits in the look step).
import type { Alternative, ConflictPath, Infeasible, LookCtx } from '../demand/infeasible';
import type { Anchor, CompromiseResult, LimitKey } from '../demand/compromise';
import type { Proposal } from '../demand/suggest';
import { futureOf, editBrief, getBrief, lockAnimals, setLook, setTank } from './setupBrief';
import { compareRows, setCompare, type CompareLimit } from './diff';
import { valueOf, type Brief } from '../scene/brief';
import type { Store } from '../scene/store';
import type { TankSetup, Units } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

const altLi = (a: Alternative, i: number) => `<li class="sgAlt" data-kind="${a.kind}"><div>${esc(a.text)}</div>${a.edit ? `<button type="button" class="primary" data-alt="${i}">${esc(a.label)}</button>` : ''}</li>`;

const pathHtml = (p: ConflictPath, inf: Infeasible) => {
  const f = p.facts;
  const facts = f ? `<div class="sgTrue"><b>The true build:</b> ${esc(f.animals)} in ${f.gal} gal (${f.outerIn[0]} x ${f.outerIn[1]} in outside): ${usd(f.usd)} to set up, ${usd(f.monthlyUsd)} a month, about ${Math.round(f.minPerWeek)} minutes a week.<ul class="bpGear sgCost" aria-label="What the true build is made of">${f.gear.map(g => `<li>${esc(g)}</li>`).join('')}</ul>${f.breaks.length ? `<div class="spWarn">Against your limits: ${esc(f.breaks.join('; '))}.</div>` : ''}</div>` : '';
  const keep = p.id === 'look' && inf.look ? compromiseSlot(inf.look) : ''; // lane GV7: the compound compromise that keeps the look, filled in once shown
  const body = (p.alts.length ? `<ul class="sgAlts">${p.alts.map(i => altLi(inf.alternatives[i], i)).join('')}</ul>` : keep ? '' : `<div class="spNote sgNoPath">${esc(p.none ?? 'Nothing verified for this path.')}</div>`) + keep;
  return `<section class="sgPath" data-path="${p.id}"><h4>${esc(p.title)}</h4><div class="spNote">${esc(p.blurb)}</div>${facts}${body}</section>`;
};

/** The ambitions saved in the brief (futureOf), as a small list; empty string when there are none. Also shown under the setups, once a saved ambition has led to a smaller project. */
export const futureHtml = (brief?: Brief) => {
  const saved = brief ? futureOf(brief) : [];
  return saved.length ? `<div class="sgFuture" aria-label="Saved ambitions"><b>Saved for later</b><ul>${saved.map(a => `<li>${esc(a.text)}</li>`).join('')}</ul></div>` : '';
};

export const infeasibleCard = (inf: Infeasible, brief?: Brief) => {
  const future = futureHtml(brief);
  if (inf.paths) return `<div class="sgNone sgWhy sgPaths" id="sgNone" data-factor="${inf.limitingFactor}"><p class="spWarn"><b>No setup fits all of that.</b> ${esc(inf.text)}</p><div class="spNote">Four ways forward. Each button was checked by working the setups out again; nothing changes until you press one.</div>${inf.paths.map(p => pathHtml(p, inf)).join('')}${future}</div>`;
  const lines = inf.cheapest ? `<ul class="bpGear sgCost" aria-label="The cheapest honest build, itemised">${inf.cheapest.lines.map(l => `<li>${esc(l.label)}: ${usd(l.usd)}</li>`).join('')}<li><b>Total ${usd(inf.cheapest.usd)}</b>${inf.cheapest.over ? ` (${usd(inf.cheapest.over)} over)` : ''}</li></ul>` : '';
  return `<div class="sgNone sgWhy" id="sgNone" data-factor="${inf.limitingFactor}"><p class="spWarn"><b>No setup fits all of that.</b> ${esc(inf.text)}</p>${lines}${inf.alternatives.length ? `<b>What would change that</b><ul class="sgAlts">${inf.alternatives.map(altLi).join('')}</ul>` : ''}${future}</div>`;
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Lane GV7: compromise slots, their boxes, Use this and Compare.

/** What a slot searches: the full input (the conflict card), or the look alone with the brief and profile read when it fills (the look step). */
type Slot = { anchor: Anchor; units: Units; now?: number; w?: LookCtx['w']; P?: LookCtx['P']; /** say nothing when the look fits every limit */ quiet?: boolean };
const SLOTS = new Map<string, Slot>(), RESULTS = new Map<string, CompromiseResult>(), DONE = new Map<string, CompromiseResult | undefined>();
let seq = 0;
const remember = <V>(m: Map<string, V>, k: string, v: V) => { m.set(k, v); if (m.size > 24) m.delete(m.keys().next().value!); };
const slotHtml = (s: Slot) => { const id = `cmp${++seq}`; remember(SLOTS, id, s); return `<div class="cmpSlot" data-cmp-slot="${id}"><div class="spNote">Looking for a smaller version of this look (a second or two)…</div></div>`; };
/** The slot on the conflict card's "keep the look" path. */
export const compromiseSlot = (ctx: LookCtx) => slotHtml(ctx);
const LEAD: Partial<Record<LimitKey, CompareLimit>> = { startup: 'startup', monthly: 'monthly', care: 'care' };
const leadOf = (r: CompromiseResult) => r.broken.find(b => b.side === 'above')?.key;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The box: the look as chosen and what it breaks, the 1-2 compromises, the other style, Compare. */
export function compromiseHtml(id: string, r: CompromiseResult, label: string): string {
  const a = r.anchor, f = a.build.finish, as = `${a.build.tank.name}${f ? `, ${f.tier === 'lowtech' ? 'low-tech' : f.tier} finish` : ''}`;
  const items = r.compromises.map((c, i) => `<li class="sgAlt cmpAlt"><div>${esc(c.text)}</div><button type="button" class="primary" data-cmp-use="${id},${i}">Use this</button></li>`).join('');
  const n = a.build.animals.filter(x => x.n > 0).length;
  const other = r.other ? `<li class="sgAlt cmpAlt cmpOther"><div>${esc(r.other.text)}</div><button type="button" data-cmp-use="${id},o">Use this look</button></li>`
    : n ? '<li class="spNote sgNoPath">No other look keeps all of these animals within your limits either.</li>' : '';
  const cmp = r.compromises.length && r.other ? `<div class="spFoot cmpAct"><button type="button" class="primary cmpGo" data-cmp-compare="${id}">Compare side by side</button><span class="spNote">A keeps the look, B ${r.anchor.build.animals.some(x => x.n > 0) ? 'keeps the animals in another look' : 'is the other look'}; each view's tab shows what it costs.</span></div>` : '';
  return `<div class="sgPath cmpBox" data-cmp="${id}"><b>Keep the look: ${esc(cap(label))}</b><div class="spNote">Built in full (${esc(as)}, with everything its plants and animals need): ${esc(r.broken.map(b => b.text).join('; '))}.</div>
${items || other ? `<ul class="sgAlts">${items}${other}</ul>` : ''}${r.none && !items ? `<div class="spNote sgNoPath">${esc(r.none)}</div>` : ''}${cmp}</div>`;
}

/** The look step's slot (one template line in lookPick.ts): `data-cmp-look` = {style, tank id, animals}; it shows only when that look breaks a limit of the brief. */
async function lookSlot(el: HTMLElement, units: Units): Promise<string | undefined> {
  const { getTankModel } = await import('../data/tanks');
  try { const v = JSON.parse(el.dataset.cmpLook!) as { style: Anchor['style']; tank: string; animals: Anchor['animals'] }, tank = getTankModel(v.tank); if (!tank) return undefined;
    const id = `cmp${++seq}`; remember(SLOTS, id, { anchor: { style: v.style, tank, animals: v.animals, level: 3 }, units, quiet: true }); return id; } catch { return undefined; }
}

async function fill(slot: HTMLElement, units: Units) {
  if (slot.dataset.cmpLook && !slot.dataset.cmpSlot) { const id = await lookSlot(slot, units); if (!id) { slot.remove(); return; } slot.dataset.cmpSlot = id; }
  const id = slot.dataset.cmpSlot!, s = SLOTS.get(id);
  if (!s) { slot.remove(); return; }
  const [{ compromiseFor, styleLabel }, { briefToWants }, { loadProfile }] = await Promise.all([import('../demand/compromise'), import('../scene/brief'), import('./demandPanel')]);
  await new Promise(res => setTimeout(res, 0)); // let the "looking" line paint before the search holds the page
  if (!slot.isConnected) return;
  const w = s.w ?? briefToWants(getBrief()), P = s.P ?? loadProfile(), key = JSON.stringify([s.anchor.style, s.anchor.tank.id, s.anchor.animals, s.anchor.level, w, s.units]);
  const r = DONE.has(key) ? DONE.get(key) : compromiseFor(s.anchor, w, P, s.units, s.now ?? Date.now());
  remember(DONE, key, r);
  if (!r || (s.quiet && !r.broken.some(b => b.side === 'above'))) {
    if (s.quiet) slot.remove(); else slot.innerHTML = '<div class="spNote sgNoPath">This look cannot be built well for these animals at any size, so there is no smaller version to offer.</div>';
    return;
  }
  remember(RESULTS, id, r);
  slot.innerHTML = compromiseHtml(id, r, styleLabel(r.style));
}

/** A design as an editor tank, the way "make it mine" opens one (suggest.ts): the build placed, the brief, limits, stand choice and space kept, a starter kit's price pinned to the tank. */
async function tankFor(p: Proposal, base: TankSetup): Promise<TankSetup> {
  const [{ placedSetup }, { pinTank }] = await Promise.all([import('./buildPick'), import('../demand/pinned')]);
  const T = placedSetup(p.build);
  if (base.brief) T.brief = structuredClone(base.brief);
  T.constraints = p.scene.constraints; T.stand = { ...T.stand, show: p.scene.stand.show }; if (p.scene.layout.space) T.layout = { ...T.layout, space: p.scene.layout.space };
  if (p.build.bundle) pinTank(T, p.build.bundle);
  return T;
}

/** Compare: the first compromise as Tank A, the other style as Tank B, in the split view, with the broken limit and the money / care rows first on the tabs. */
export async function openCompare(store: Store, r: CompromiseResult): Promise<string | undefined> {
  const c = r.compromises[0], o = r.other; if (!c || !o) return undefined;
  const lead = LEAD[leadOf(r) ?? 'startup'], C = c.proposal.scene.constraints, usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  const bound = lead === 'startup' ? C?.startupUsd?.value : lead === 'monthly' ? C?.monthlyUsd?.value : lead === 'care' ? C?.minutesPerWeek?.value : undefined;
  const base = store.tank, A = await tankFor(c.proposal, base), B = await tankFor(o.proposal, base);
  if (store.split) store.closeTank(1);
  store.update(s => { s.tanks[0] = A; s.active = 0; }); store.seal();
  store.splitTankWith(() => B);
  setCompare(store.scene.tanks[0], store.scene.tanks[1], compareRows(c.proposal.totals, o.proposal.totals, lead, bound));
  return `Compare: A keeps the look (${c.proposal.build.tank.name}, ${usd(c.proposal.totals.startupUsd)}), B ${c.proposal.build.animals.some(x => x.n > 0) || o.proposal.build.animals.some(x => x.n > 0) ? 'keeps the animals' : 'is the other look'} (${o.label}). The differences are on each view's tab.`;
}

/** Lane GV7, hooked once from panels.ts: fill compromise slots as they appear; Use this puts a design in the tank; Compare opens the compromise (A) beside the other style (B). */
export function attachCompare(store: Store, status: (m: string, bad?: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scan = () => {
    timer = undefined;
    const s = document.querySelector<HTMLElement>('[data-cmp-slot]:not([data-busy]), [data-cmp-look]:not([data-busy])'); if (!s) return;
    s.dataset.busy = '1'; void fill(s, store.scene.units).finally(() => { if (!timer) timer = setTimeout(scan, 30); });
  };
  new MutationObserver(() => { if (!timer) timer = setTimeout(scan, 60); }).observe(document.body, { childList: true, subtree: true });
  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  // the panel the button sat in steps aside (hidden, not cancelled: a cancel would put the old tank back)
  const shut = (from: HTMLElement) => { const p = from.closest<HTMLElement>('.sp'); if (p) p.hidden = true; };
  document.addEventListener('click', e => {
    const t = e.target as HTMLElement, use = t.closest<HTMLElement>('[data-cmp-use]'), go = t.closest<HTMLElement>('[data-cmp-compare]');
    if (use) {
      const [id, k] = use.dataset.cmpUse!.split(','), r = RESULTS.get(id); if (!r) return;
      const c = k === 'o' ? undefined : r.compromises[+k], p = c ? c.proposal : r.other?.proposal, style = c ? r.style : r.other?.style; if (!p || !style) return;
      shut(use);
      void import('./suggest').then(({ makeItMine }) => {
        makeItMine(store, p); // the same open as Suggest's "I like this one": brief, limits and a starter kit's price kept
        const a = p.build.animals.filter(x => x.n > 0);
        editBrief(b => { // the look, the animals and the tank in the brief follow the design taken
          let n = setLook(b, style); if (a.length) n = lockAnimals(n, a.map(x => ({ species: x.species, n: x.n })));
          return valueOf(n, 'equipment.tank') ? setTank(n, { id: p.build.tank.id, label: p.build.tank.name }) : n; });
        status(`${c ? `Kept the look: ${c.steps.map(x => x.text).join(', ')}` : r.other!.label}. ${usd(p.totals.startupUsd)} to set up. Undo steps back.`);
      });
    } else if (go) {
      const r = RESULTS.get(go.dataset.cmpCompare!); if (!r) return;
      shut(go); void openCompare(store, r).then(m => { if (m) status(m); });
    }
  });
}
