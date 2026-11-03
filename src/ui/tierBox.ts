// Budget / As designed / Luxury in the demand panel (lane BL1, Nathan 2026-11-03): the same design built with cheaper or dearer real materials and gear, side by side.
// "Compare" opens GV7's split view (Tank A and B, the price differences first on the tabs) in ONE undo step; "Use A / Use B" brings the chosen version back
// as one tank through GS6's hand-off rules (the tank, animals and the rest of the design stay; the look and the gear change), also one undo step.
import { handOff } from '../scene/reeval';
import { priceDiff, rockLine, tierOf, TIER_LABEL, type Tier, type TierResult } from '../scene/materialTiers';
import { setCompare, sigOf } from './diff';
import type { UserProfile } from '../demand/types';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { visionOf } from '../scene/brief';

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The design the open compare was made from, and the two versions on Tank A and Tank B. */
interface Open { orig: TankSetup; res: [TierResult, TierResult]; sigs: [string, string] }
let open: Open | undefined;

const archIdOf = (S: TankSetup) => (S.brief ? visionOf(S.brief).archetypeId : undefined);
const rockText = (r: TierResult) => { const k = rockLine(r); return k.lb >= 1 ? `${k.names.join(' + ')}, ${Math.round(k.lb)} lb, ${usd(k.usd)}` : ''; };

/** Open Tank A = version `a`, Tank B = version `b` of the current design, as one undo step. */
function openCompare(store: Store, orig: TankSetup, res: [TierResult, TierResult]) {
  const [a, b] = res, rows: [string, string][] = [[`${TIER_LABEL[a.tier]}: set-up ${usd(a.setupUsd)}`, `${TIER_LABEL[b.tier]}: set-up ${usd(b.setupUsd)}`]];
  for (const l of priceDiff(a, b).slice(0, 6)) rows.push([`${l.label} ${l.a}`, `${l.label} ${l.b}`]);
  store.editOn = [false, true];
  store.update(s => { s.tanks = [structuredClone(a.scene), structuredClone(b.scene)]; s.active = 1; });
  store.seal();
  setCompare(store.scene.tanks[0], store.scene.tanks[1], rows);
  open = { orig, res, sigs: [sigOf(store.scene.tanks[0]), sigOf(store.scene.tanks[1])] };
}

/** Bring version `i` back as the one tank: the look and gear change, everything else stays (GS6's hand-off). Returns what changed, in words. */
function useVersion(store: Store, o: Open, i: 0 | 1): string[] {
  const v = o.res[i], ho = handOff(o.orig, v.scene, { accept: o.orig.fish.map(f => f.species), brief: o.orig.brief });
  const out = ho.scene;
  if (v.scene.tech) out.tech = structuredClone(v.scene.tech); else delete out.tech;
  store.editOn = [true, false];
  store.update(s => { s.tanks = [out]; s.active = 0; });
  store.seal(); setCompare(); open = undefined;
  return [`Kept the ${TIER_LABEL[v.tier]} version, ${usd(v.setupUsd)} to set up.`, ...v.swaps.map(w => `${w.n} x ${w.from} -> ${w.to}`), ...ho.warnings];
}

/** Add the box to the deals area `el` (after it is filled). `changed` re-renders the panel. */
export function renderTierBox(el: HTMLElement, store: Store, P: UserProfile, changed: () => void) {
  const sc = store.scene, box = document.createElement('div');
  box.className = 'dmtier';
  box.style.cssText = 'margin-top:6px;padding:6px;border:1px solid var(--line);border-radius:6px';
  if (sc.tanks.length > 1) {
    // a tier compare still on screen: the per-line difference and the two ways back to one tank
    if (!open || sigOf(sc.tanks[0]) !== open.sigs[0] || sigOf(sc.tanks[1]) !== open.sigs[1]) return;
    const [a, b] = open.res, rows = priceDiff(a, b);
    box.innerHTML = `<div><b>${esc(TIER_LABEL[a.tier])} (Tank A) ${usd(a.setupUsd)} · ${esc(TIER_LABEL[b.tier])} (Tank B) ${usd(b.setupUsd)}</b> to set up</div>`
      + (rows.length ? `<table style="width:100%;font-size:11px;border-collapse:collapse"><tr><th align=left>Line</th><th align=right>A</th><th align=right>B</th></tr>${rows.map(r => `<tr><td>${esc(r.label)}</td><td align=right>${esc(r.a)}</td><td align=right>${esc(r.b)}</td></tr>`).join('')}</table>` : '')
      + [a, b].map((r, i) => r.swaps.length ? `<div style="font-size:11px;opacity:.85">${'AB'[i]}: ${r.swaps.map(w => esc(`${w.n} x ${w.from} -> ${w.to}${w.match === 'nearest' ? ' (nearest drawn texture)' : ''}`)).join('; ')}</div>` : '').join('')
      + `<div style="margin-top:4px"><button type="button" class="tbuse" data-i="0">Use Tank A (${esc(TIER_LABEL[a.tier])})</button> <button type="button" class="tbuse" data-i="1">Use Tank B (${esc(TIER_LABEL[b.tier])})</button></div><div style="font-size:11px;opacity:.7">Ctrl+Z goes back to the design as it was.</div>`;
    box.querySelectorAll<HTMLButtonElement>('.tbuse').forEach(btn => btn.onclick = () => {
      const lines = useVersion(store, open!, +btn.dataset.i! as 0 | 1); changed();
      const note = document.createElement('div'); note.className = 'dmtier'; note.style.cssText = 'font-size:11px;margin-top:6px'; note.textContent = lines.join(' ');
      el.prepend(note); setTimeout(() => note.remove(), 8000);
    });
    el.prepend(box); return;
  }
  const S = store.tank;
  if (!S.water.on || !S.items.some(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'plant')) return;
  const o = { archetypeId: archIdOf(S), P };
  const r: Record<Tier, TierResult> = { budget: tierOf(S, 'budget', o), designed: tierOf(S, 'designed', o), luxury: tierOf(S, 'luxury', o) };
  if (!r.budget.swaps.length && !r.luxury.swaps.length) return;
  const pair = (x: Tier, y: Tier) => `<button type="button" class="tbcmp" data-a="${x}" data-b="${y}">${TIER_LABEL[x]} vs ${TIER_LABEL[y]}</button>`;
  const rock = (t: Tier) => rockText(r[t]) ? `<div style="font-size:11px">${TIER_LABEL[t]} rock: ${esc(rockText(r[t]))}</div>` : '';
  box.innerHTML = `<div><b>Same look, three builds:</b> Budget ${usd(r.budget.setupUsd)} · As designed ${usd(r.designed.setupUsd)} · Luxury ${usd(r.luxury.setupUsd)} to set up</div>`
    + rock('budget') + rock('luxury')
    + `<div style="margin-top:4px">${pair('budget', 'luxury')} ${pair('budget', 'designed')} ${pair('designed', 'luxury')}</div>`
    + `<div style="font-size:11px;opacity:.7">Only materials and gear change: same tank, animals, and piece positions and sizes. Water rules are kept (limestone only for hard-water looks).</div>`;
  box.querySelectorAll<HTMLButtonElement>('.tbcmp').forEach(btn => btn.onclick = () => {
    openCompare(store, structuredClone(S), [r[btn.dataset.a as Tier], r[btn.dataset.b as Tier]]); changed();
  });
  el.prepend(box);
}
