// Guided Setup Rev 03, Animals First (lane GS5, 2026-11-02; research/design/guided-setup-rev03.md section 3): the roster, what suits together, then the enclosure, drawn into the
// shell's own dialog body. The old side panel (ui/stockPlan.ts: "An animal I want") stays for Sandbox and direct use; this is the embedded route, so it never replaces the scene,
// never ghosts or boxes the tank, and never offers the P6 "ways to build it" exit. The roster is written to the project state (the brief, locked) as it changes; the enclosure
// is written when it is confirmed; then `done()` hands the shell the animals to render in Family -> Archetype -> Density -> Make It Your Own (GS6's hand-off keeps both).
// Conflicts are explained with viable adjustments the person applies; no animal is dropped and no incompatible group is called fine (GS6 invariant 5).
import { CARE } from '../../data/care';
import { CATEGORIES, SPECIES, getSpecies, searchSpecies, type Category, type Species } from '../../data/species';
import { minOf, valueOf } from '../../scene/brief';
import { envOf } from '../../scene/project';
import type { TankModel } from '../../data/tanks';
import { tankLabel, tempVerdict } from '../../scene/tankfit';
import { editBrief, getBrief } from '../setupBrief';
import { pickRowHtml } from '../stockRows';
import { applyRosterFix, animalsOf, bump, planFor, rosterWarnings, startPick, tempLinesOf, totalOf, type Pairing, type Pk, type RosterFixOp } from '../stockPlanLogic';
import type { AnimalsEntry } from './shell';
import {
  applyFix, inWorld, issuesOf, ownedCheck, picksOf, recommendEnclosure, setEnclosure, sizeOptions, waterLine, withRoster,
  type EnclosureRec,
} from './animalsLogic';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const SHOWN = 24;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const animalsFirst: AnimalsEntry = c => {
  const root = c.root, units = c.store.scene.units, plain = (m: TankModel) => tankLabel(m, units).replace(/^About /, '');
  let picks: Pk[] = picksOf(c.roster()), q = '', cat: Category | 'all' = 'all', everything = false, step: 'roster' | 'enclosure' = 'roster';
  let undo: { picks: Pk[]; label: string } | undefined, rec: EnclosureRec | 'working' | undefined, recKey = '', sizes = false, alive = true, focusSearch = false;

  const write = () => editBrief(b => withRoster(b, picks));   // the roster is the project's: every change lands in the one state, never in a scene
  const env = () => envOf(getBrief());
  const pool = (): Species[] => {
    const e = env(), list = (q.trim() ? searchSpecies(q, cat === 'all' ? undefined : cat) : SPECIES.filter(s => cat === 'all' || s.cat === cat)).filter(s => !picks.some(p => p.id === s.id));
    return everything ? list : list.filter(s => inWorld(s, e));
  };
  const catsHere = () => CATEGORIES.filter(([id]) => everything || SPECIES.some(s => s.cat === id && inWorld(s, env())));

  // ---------- 1. the roster ----------
  const results = () => {
    const list = pool();
    if (!list.length) return `<p class="spNote">${q.trim() ? 'No animal by that name' + (everything ? '' : ' in this world') + '.' : 'Nothing more to add here.'}</p>`;
    const cut = q.trim() || cat !== 'all' ? list.slice(0, 60) : list.slice(0, SHOWN);
    return `<ul class="spRes afRes">${cut.map(s => `<li><button type="button" data-act="add" data-id="${s.id}"><b>${esc(s.name)}</b><i>${esc(s.sci)}</i><span>${CARE[s.id]?.group ? `group of ${CARE[s.id].bands?.ok ?? CARE[s.id].group}+` : ''}</span></button></li>`).join('')}</ul>${list.length > cut.length ? `<p class="spNote">${list.length - cut.length} more: search by name or pick a group.</p>` : ''}`;
  };
  const rosterLimits = () => { const b = getBrief(); return { maxUsd: valueOf(b, 'constraints.budget'), minUsd: minOf(b, 'constraints.budget') }; };
  // the project's own water conflict already says fresh and salt cannot share a tank (with both ways out), so the per-animal lines saying the same thing are not repeated
  const warnings = () => { const ws = rosterWarnings({ picks }, rosterLimits(), units === 'in'), water = issuesOf(getBrief()).some(i => i.id === 'water-vs-animals'); return water ? ws.filter(w => !/cannot share a tank/.test(w.text)) : ws; };
  /** What suits together and what does not: the animals' own conflicts (temperament, temperature, group size), the project's (world, water, tank) and the temperature they share. */
  const suitBlock = () => {
    if (!picks.length) return '<p class="spNote">Search for an animal, or browse a group. Each goes in at the smallest group it is kept in; add as many species as you like.</p>';
    const ws = warnings(), is = issuesOf(getBrief()), plan = planFor(picks), tl = tempLinesOf(picks, units === 'in'), tv = tempVerdict(animalsOf(picks));
    const water = waterLine(getBrief());
    const smallest = plan.need ? `<div class="spNote">The smallest tank that holds them: ${esc(tankLabel(plan.need.tank, units).replace(/^About /, ''))}.</div>` : `<div class="spWarn">${esc(plan.problem ?? 'No tank on the list holds these.')}</div>`;
    return `<div class="spHd">Do they suit together?</div>${water ? `<div class="spNote">${esc(water)}</div>` : ''}${smallest}
${tl ? `<div class="${tl.rangeState === 'none' ? 'spWarn' : 'spNote'}">${esc(tl.range)}</div>` : ''}${tv.level === 'compromise' ? `<div class="spNote">${esc(plan.caution ?? '')}</div>` : ''}
${ws.length || is.length ? `<ul class="gvWarns">${ws.map((w, i) => `<li class="${w.welfare ? 'gvRed' : 'gvAmber'}"><span>${esc(w.text)}${w.welfare ? ' <em>Not a valid tradeoff.</em>' : ''}</span>${w.fix ? `<button type="button" data-act="fix" data-i="${i}">${esc(w.fix.label)}</button>` : ''}</li>`).join('')}${is.map((x, i) => `<li class="${x.welfare ? 'gvRed' : 'gvAmber'}"><span>${esc(x.text)}</span>${x.fixes.map((f, j) => `<button type="button" data-act="pfix" data-i="${i}" data-j="${j}">${esc(f.label)}</button>`).join('')}</li>`).join('')}</ul>` : '<p class="spNote">No conflicts so far.</p>'}${undo ? `<button type="button" class="spLink" data-act="undofix">Undo: ${esc(undo.label)}</button>` : ''}`;
  };
  const drawRoster = () => {
    const keep = root.querySelector<HTMLInputElement>('.spQ'), had = document.activeElement === keep, pos = keep?.selectionStart ?? q.length, sy = root.querySelector<HTMLElement>('.gs-af')?.scrollTop ?? 0;
    const e = env(), plan = planFor(picks);
    root.innerHTML = `<div class="gs-af"><h3 class="vd-ask">Which animals do you want?</h3>
<p class="hint">Pick the species and how many. The list shows what suits together and what needs a bigger tank; nothing is taken out for you.${e && e !== 'paludarium' && !everything ? ` Showing animals for ${e === 'aquarium' ? 'an aquarium' : 'a terrarium'}. <button type="button" class="linkbtn" data-act="all">Show every animal</button>` : everything && e && e !== 'paludarium' ? ' <button type="button" class="linkbtn" data-act="all">Only this world</button>' : ''}</p>
<div class="sp af"><input class="spQ" type="search" placeholder="Search an animal by name (e.g. betta, neon tetra, clownfish)" aria-label="Search animals" value="${esc(q)}" autocomplete="off">
<div class="afChips" role="group" aria-label="Animal groups"><button type="button" data-act="cat" data-cat="all"${cat === 'all' ? ' class="on"' : ''} aria-pressed="${cat === 'all'}">All</button>${catsHere().map(([id, name]) => `<button type="button" data-act="cat" data-cat="${id}"${cat === id ? ' class="on"' : ''} aria-pressed="${cat === id}">${esc(name)}</button>`).join('')}</div>
<div class="spResWrap">${results()}</div>
${picks.length ? `<div class="spHd">Your animals</div><ul class="spPicks">${picks.map(p => pickRowHtml(p, picks, plan, units)).join('')}</ul>` : ''}
${suitBlock()}</div>
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <button type="button" class="primary" data-act="next"${picks.length ? '' : ' disabled'}>Continue: choose the enclosure</button> <span class="hint">${picks.length ? `${picks.reduce((a, p) => a + totalOf(p), 0)} animals chosen. They stay editable in the editor.` : 'No animals chosen yet.'}</span></p></div>`;
    const af = root.querySelector<HTMLElement>('.gs-af'); if (af) af.scrollTop = sy;
    if (had || focusSearch) { const i = root.querySelector<HTMLInputElement>('.spQ')!; i.focus(); i.setSelectionRange(pos, pos); focusSearch = false; }
  };

  // ---------- 2. the enclosure ----------
  const animals = () => animalsOf(picks);
  const wantRec = () => {
    const b = getBrief(), key = JSON.stringify([animals(), valueOf(b, 'constraints.existingTank'), b.items['equipment.tank'], b.items['constraints.budget'], b.items['constraints.maxSpace'], b.items['constraints.owned']]);
    if (recKey === key && rec) return;
    recKey = key; rec = 'working';
    setTimeout(() => {   // the generator is not instant: the card says so, then shows what it found
      if (!alive || recKey !== key) return;
      rec = recommendEnclosure(getBrief(), units); if (step === 'enclosure') drawEnclosure();
    }, 0);
  };
  const recCard = (r: EnclosureRec) => `<div class="afRec"><div class="spTank"><b>Recommended: ${esc(plain(r.model))}</b></div>
${r.tankNote ? `<div class="spNote">${esc(r.tankNote)}</div>` : r.source === 'new' ? '<div class="spNote">A tank to buy: the smallest setup that passes every check you gave.</div>' : ''}
${r.because ? `<div class="spWarn">${esc(r.because)}</div>` : ''}${r.startupUsd !== undefined ? `<div class="spNote">Complete set-up about ${usd(r.startupUsd)}${r.savedUsd ? `, ${usd(r.savedUsd)} off for what you own` : ''}.</div>` : ''}
${r.warnings.map(w => `<div class="spWarn">${esc(w)}</div>`).join('')}
<button type="button" class="primary" data-act="use" data-id="${r.source === 'owned-available' ? '' : r.model.id}">${r.source === 'owned-available' ? 'Use my tank' : 'Use this tank'} and pick the look</button></div>`;
  const drawEnclosure = () => {
    const b = getBrief(), oc = ownedCheck(b, animals()), req = oc?.use === 'required';
    if (!req) wantRec();
    let body = '';
    if (oc && req) {
      body = oc.fits
        ? `<div class="afRec"><div class="spTank"><b>${esc(cap(plain(oc.model)))}</b><span class="spPct">Your tank, marked Required.</span></div><div class="spNote">It holds these animals.</div><button type="button" class="primary" data-act="use" data-id="">Use my tank and pick the look</button></div>`
        : `<div class="afRec"><div class="spTank"><b>${esc(cap(plain(oc.model)))}</b><span class="spPct">Your tank, marked Required.</span></div><div class="spWarn">${esc(oc.why ?? '')}</div>
<p class="spNote">You said you want to use it, so nothing else is suggested. Either let TankLook recommend a tank that holds them, or keep yours and the editor keeps this flagged.</p>
<button type="button" class="primary" data-act="avail">Mark my tank Available: recommend one that fits</button> <button type="button" data-act="use" data-id="">Keep my tank anyway (stays flagged)</button></div>`;
    } else if (rec === 'working' || !rec) body = '<p class="spNote">Working out the best fit...</p>';
    else body = `${oc ? `<div class="spNote">You have ${esc(oc.label)}${oc.fits ? '' : ' but it is too small for these animals'}; it is free to swap.</div>` : ''}${recCard(rec)}`;
    const opts = !req && sizes ? sizeOptions(b, units) : [];
        root.innerHTML = `<div class="gs-af"><h3 class="vd-ask">Where will they live?</h3>
<p class="hint">The enclosure that suits these animals and what you told us. The pictures that follow are drawn in it, with the animals in place; you can change it any time.</p>
<div class="sp af">${body}
${!req ? `<p><button type="button" class="spLink" data-act="sizes">${sizes ? 'Hide the other sizes' : 'Choose a different size'}</button></p>${sizes ? `<ul class="spSizes afSizes">${opts.map(o => `<li><button type="button" data-act="use" data-id="${o.model.id}"${o.fits ? '' : ' disabled'} title="${o.fits ? '' : esc(o.why)}"><span class="spLbl">${esc(o.label)}${o.fits ? '' : `<em>${esc(o.why)}</em>`}${o.fits && !o.inSpace ? '<em class="cr">over your space</em>' : ''}</span></button></li>`).join('')}</ul>` : ''}` : ''}
</div>
<p class="vd-nav"><button type="button" data-act="toroster">Back to the animals</button></p></div>`;
  };

  const draw = () => step === 'roster' ? drawRoster() : drawEnclosure();
  const change = () => { write(); rec = undefined; draw(); };
  const fixesNow = () => warnings().map(w => w.fix);

  root.oninput = e => { const t = e.target as HTMLInputElement; if (t.classList.contains('spQ')) { q = t.value; const w = root.querySelector('.spResWrap'); if (w) w.innerHTML = results(); } };
  root.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-gs]'); if (!t) return;
    if (t.dataset.gs === 'back') { c.back(); return; }
    const id = t.dataset.id ?? '', i = picks.findIndex(p => p.id === id);
    switch (t.dataset.act) {
      case 'cat': cat = (t.dataset.cat as Category | 'all'); draw(); break;
      case 'all': everything = !everything; draw(); break;
      case 'add': if (i < 0 && getSpecies(id)) { picks.push(startPick(id)); q = ''; undo = undefined; change(); } break;
      case 'del': if (i >= 0) { picks.splice(i, 1); change(); } break;
      case 'inc': case 'dec': if (i >= 0) { picks[i] = bump(picks[i], t.dataset.w as 'n' | 'f' | 'u', t.dataset.act === 'inc' ? 1 : -1); if (!totalOf(picks[i])) picks.splice(i, 1); change(); } break;
      case 'stage': if (i >= 0) { const mm = +(t.dataset.mm ?? 0), { tl: _was, ...rest } = picks[i]; picks[i] = mm > 0 ? { ...rest, tl: mm } : rest; change(); } break;
      case 'pair': if (i >= 0) { picks[i] = { ...picks[i], pair: t.dataset.v as Pairing }; change(); } break;
      case 'fix': {   // a verified fix from the list, applied only because the person pressed it; the roster before it is kept for Undo
        const f = fixesNow()[+(t.dataset.i ?? -1)]; if (!f) break;
        undo = { picks, label: f.label.split(':')[0] }; picks = applyRosterFix({ picks }, f.op as RosterFixOp).picks; change(); break;
      }
      case 'pfix': {   // a project-level adjustment (the world, the water, the tank): applied to the one state, the animals untouched unless that very fix says so
        const is = issuesOf(getBrief()), f = is[+(t.dataset.i ?? -1)]?.fixes[+(t.dataset.j ?? -1)]; if (!f) break;
        const before = JSON.stringify(valueOf(getBrief(), 'animals.stock'));
        editBrief(b => applyFix(b, f.patch));
        if (JSON.stringify(valueOf(getBrief(), 'animals.stock')) !== before) { undo = { picks, label: f.label }; picks = picksOf((valueOf(getBrief(), 'animals.stock') ?? []).map(s => ({ species: s.species, n: s.count }))); }
        rec = undefined; draw(); break;
      }
      case 'undofix': if (undo) { picks = undo.picks; undo = undefined; change(); } break;
      case 'next': if (picks.length) { write(); step = 'enclosure'; sizes = false; draw(); } break;
      case 'toroster': step = 'roster'; draw(); break;
      case 'sizes': sizes = !sizes; draw(); break;
      case 'avail': editBrief(b => applyFix(b, { equipment: [{ key: 'tank', use: 'available' }] })); rec = undefined; draw(); break;
      case 'use': editBrief(b => setEnclosure(b, id || undefined)); c.done(); break;
    }
  };
  focusSearch = !picks.length; draw();
  return { destroy() { alive = false; root.onclick = null; root.oninput = null; root.replaceChildren(); } };
};
