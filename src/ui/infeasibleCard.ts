// The "why not" card (lane U4; moved out of ui/suggest.ts and reworked by lane NG4): the limiting factor in plain words with the numbers, then FOUR PATHS (keep the vision, keep the limits, keep the look,
// save the ambition), each with its verified buttons or the plain reason it has none, and the list of ambitions already saved. A button edits the brief (locks kept) and the generator re-runs.
// The button index is the alternative's index in `inf.alternatives` (suggest.ts reads data-alt).
import type { Alternative, ConflictPath, Infeasible } from '../demand/infeasible';
import { futureOf } from './setupBrief';
import type { Brief } from '../scene/brief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

const altLi = (a: Alternative, i: number) => `<li class="sgAlt" data-kind="${a.kind}"><div>${esc(a.text)}</div>${a.edit ? `<button type="button" class="primary" data-alt="${i}">${esc(a.label)}</button>` : ''}</li>`;

const pathHtml = (p: ConflictPath, inf: Infeasible) => {
  const f = p.facts;
  const facts = f ? `<div class="sgTrue"><b>The true build:</b> ${esc(f.animals)} in ${f.gal} gal (${f.outerIn[0]} x ${f.outerIn[1]} in outside): ${usd(f.usd)} to set up, ${usd(f.monthlyUsd)} a month, about ${Math.round(f.minPerWeek)} minutes a week.<ul class="bpGear sgCost" aria-label="What the true build is made of">${f.gear.map(g => `<li>${esc(g)}</li>`).join('')}</ul>${f.breaks.length ? `<div class="spWarn">Against your limits: ${esc(f.breaks.join('; '))}.</div>` : ''}</div>` : '';
  const body = p.alts.length ? `<ul class="sgAlts">${p.alts.map(i => altLi(inf.alternatives[i], i)).join('')}</ul>` : `<div class="spNote sgNoPath">${esc(p.none ?? 'Nothing verified for this path.')}</div>`;
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
