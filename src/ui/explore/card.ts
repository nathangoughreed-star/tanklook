// Explore Complete Setups, stage X3 (lane OX5): ONE CANDIDATE CARD as markup. Pure strings over a stored record (`StoredLite`: the frozen estimate, roster, verdict and reaction a card is shown with),
// so the numbers on a card are the numbers the pool certified, and the same card draws a fresh pick, a saved favourite and a provisional concept. The compact card carries the picture, the name, the
// world and water, and four prominent figures (start-up $ range, care time on the high end, tank gallons, difficulty); "Details" opens the roster, the rest of the figures, the verdict (a provisional
// concept says why) and the assumptions. Reactions: Like / Pass / Save / Unrated (neutral); the "What caught your eye?" panel offers aspect TAGS only (aspects.ts: no money, room or time tag exists).
import { FAMILIES } from '../../scene/archetypes';
import { getSpecies } from '../../data/species';
import { TAGS, tagOf, type AspectTag, type TagGroup } from '../../explore/aspects';
import type { StoredLite } from '../../explore/candidate';
import type { PickRole } from '../../explore/rank';
import type { GateId } from '../../explore/gate';

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const to = (n: number, step: number) => Math.round(n / step) * step;

// ---------------------------------------------------------------------------------------------------------------- words and figures
const WORLD_WORD = { terrarium: 'Terrarium', paludarium: 'Paludarium' } as const;
/** "Freshwater aquarium", "Saltwater aquarium", "Terrarium", "Paludarium": always a real world, never "anything". */
export function worldLabel(c: Pick<StoredLite, 'identity'>): string {
  const { world, water } = c.identity;
  if (world !== 'aquarium') return WORLD_WORD[world];
  return `${water === 'saltwater' ? 'Saltwater' : water === 'brackish' ? 'Brackish' : 'Freshwater'} aquarium`;
}
export const familyName = (c: Pick<StoredLite, 'identity'>): string => FAMILIES.find(f => f.id === c.identity.familyId)?.name ?? '';
export const familyColour = (c: Pick<StoredLite, 'identity'>): string => FAMILIES.find(f => f.id === c.identity.familyId)?.colour ?? '#5f7f6a';
export const speciesName = (id: string): string => getSpecies(id)?.name ?? id;
/** "6 Cardinal tetra": no plural to get wrong. */
export const rosterLine = (r: { species: string; n: number }): string => `${r.n} ${speciesName(r.species)}`;

/** Start-up cost as a range ("$480 - $690"): the price spread behind the figure, not one invented number. */
export function startupText(c: Pick<StoredLite, 'estimate'>): string {
  const r = c.estimate.startupUsd, lo = to(r.lo, 10), hi = to(r.hi, 10);
  return hi - lo < 20 ? `about ${usd(to(r.mean, 10))}` : `${usd(lo)} to ${usd(hi)}`;
}
/** Care time on the HIGH end of its range, as an estimate ("up to 70 min a week"); the typical figure is the small line. */
export function careText(c: Pick<StoredLite, 'estimate'>): { main: string; sub: string } {
  const r = c.estimate.minPerWeek;
  return { main: `up to ${to(r.hi, 5)} min a week`, sub: `about ${to(r.mean, 5)} typical` };
}
export const galText = (c: Pick<StoredLite, 'estimate'>): string => `${Math.round(c.estimate.gal * 10) / 10} gal`;
/** The four prominent figures of the compact card, in order. */
export function statsOf(c: Pick<StoredLite, 'estimate'>): { id: 'startup' | 'care' | 'gal' | 'difficulty'; label: string; value: string; sub: string; title: string }[] {
  const e = c.estimate, care = careText(c);
  return [
    { id: 'startup', label: 'Start-up', value: startupText(c), sub: 'to buy and set up', title: e.figures.startup.why },
    { id: 'care', label: 'Care time', value: care.main, sub: care.sub, title: e.figures.care.why },
    { id: 'gal', label: 'Tank', value: galText(c), sub: `${e.footprintIn.L} x ${e.footprintIn.D} in outside`, title: 'Outside footprint, length x depth.' },
    { id: 'difficulty', label: 'Difficulty', value: e.difficulty.level, sub: 'for a first-time keeper', title: e.difficulty.why.join('. ') },
  ];
}

const GATE_LABEL: Partial<Record<GateId, string>> = { budget: 'Set-up budget', monthly: 'Monthly cost', care: 'Care time', setup: 'Set-up time', space: 'Space', size: 'Tank size' };
const CAP_TEXT: Partial<Record<GateId, (n: number) => string>> = { budget: usd, monthly: n => `${usd(n)} a month`, care: n => `${Math.round(n)} min a week`, setup: n => `${Math.round(n * 10) / 10} h` };
/** What the card was checked against: one line per limit the person set (never a line for an unset one: it is unknown, so it says so in the assumptions). */
export function limitLines(c: Pick<StoredLite, 'verdict' | 'provenance'>): string[] {
  const out: string[] = [];
  for (const [id, label] of Object.entries(GATE_LABEL) as [GateId, string][]) {
    const state = c.verdict.gates[id], lim = c.provenance.limits[id];
    if (!state || state === 'unknown' || (!lim && id !== 'space' && id !== 'size')) continue;
    const kind = lim?.kind === 'flexible' ? 'target' : 'firm limit', cap = lim && CAP_TEXT[id] ? ` ${CAP_TEXT[id]!(lim.cap)}` : '';
    out.push(state === 'pass' ? `${label}: within your ${kind}${cap}.` : state === 'over' ? `${label}: over your ${kind}${cap}.` : `${label}: an estimate close to your ${kind}${cap}, so not certified.`);
  }
  return out;
}

export type Tone = 'ok' | 'prov' | 'stale';
/** The verdict a card shows: a pill, its tone, and the lines behind it. A provisional concept always says why; a stale one names the limit that broke. */
export function verdictOf(c: Pick<StoredLite, 'verdict' | 'status' | 'staleBecause' | 'provenance'>): { pill: string; tone: Tone; lines: string[] } {
  if (c.status === 'stale') return { pill: 'No longer fits your limits', tone: 'stale', lines: [c.staleBecause ?? 'A limit changed.', 'It is kept here, marked, and comes back if the limit allows it again.'] };
  const lines = limitLines(c);
  if (c.verdict.state === 'provisional') return { pill: 'Provisional', tone: 'prov', lines: [...c.verdict.reasons, ...lines] };
  return { pill: lines.length ? 'Within your limits' : 'No limits set', tone: 'ok', lines: lines.length ? lines : ['You set no limits, so none was applied.'] };
}

// ---------------------------------------------------------------------------------------------------------------- the tag panel
export const TAG_GROUPS: readonly { id: TagGroup; label: string }[] = [{ id: 'visual', label: 'How it looks' }, { id: 'animals', label: 'The animals' }, { id: 'world', label: 'The world' }, { id: 'ownership', label: 'Owning it' }];
/** The tags that apply to this candidate (it has an aspect under them), in the vocabulary's own order: only things about the setup, never a limit. */
export function tagsOffered(c: Pick<StoredLite, 'features'>): AspectTag[] {
  const has = new Set(c.features.map(tagOf).filter((t): t is AspectTag => !!t));
  return TAGS.filter(t => has.has(t.id)).map(t => t.id);
}
export interface TagPanel { mode: 'like' | 'pass'; chosen: readonly AspectTag[] }
function tagPanelHtml(c: StoredLite, p: TagPanel): string {
  const offered = new Set(tagsOffered(c)), groups = TAG_GROUPS.map(g => ({ g, tags: TAGS.filter(t => t.group === g.id && offered.has(t.id)) })).filter(x => x.tags.length);
  return `<div class="ex-tags" role="group" aria-label="${p.mode === 'like' ? 'What caught your eye?' : 'What would you change?'}"><b>${p.mode === 'like' ? 'What caught your eye?' : 'What would you change?'}</b> <span class="hint">Optional: it teaches the next batch which parts you mean. Money, size and time are limits: change those with Adjust constraints.</span>`
    + groups.map(x => `<div class="ex-tg"><span class="ex-tgl">${esc(x.g.label)}</span>${x.tags.map(t => `<button type="button" class="ex-tag" data-ex="tag" data-tag="${t.id}" aria-pressed="${p.chosen.includes(t.id)}">${esc(t.label)}</button>`).join('')}</div>`).join('')
    + `<p class="ex-tgn"><button type="button" class="primary" data-ex="tags-done">Done</button> <button type="button" class="linkbtn" data-ex="tags-skip">Skip</button></p></div>`;
}

// ---------------------------------------------------------------------------------------------------------------- the card
export interface CardView {
  c: StoredLite;
  /** how the batch placed it: a match for what was learned, or a surprise */
  role?: PickRole; why?: readonly string[];
  /** the picture, once drawn; absent = the family-colour placeholder (`wait` = it is queued to be drawn) */
  shot?: string; wait?: boolean;
  open?: boolean; tags?: TagPanel;
  /** a card in the favourites review: no Make This Mine for a stale one, never a role line */
  review?: boolean;
}
const ACTS: { id: 'like' | 'pass' | 'save' | 'unrated'; label: string; title: string }[] = [
  { id: 'like', label: 'Like', title: 'Positive evidence for what this setup is made of. Not a promise that you want every part of it.' },
  { id: 'pass', label: 'Pass', title: 'Not this one. It does not rule out its kind of setup.' },
  { id: 'save', label: 'Save', title: 'Keep it in Favourites for later. It teaches only a little and commits nothing.' },
  { id: 'unrated', label: 'Unrated', title: 'No opinion yet. A card you skip counts for nothing, for or against.' },
];
const pressed = (c: StoredLite, id: string) => id === 'save' ? c.reaction.saved : id === 'like' ? c.reaction.state === 'liked' : id === 'pass' ? c.reaction.state === 'passed' : c.reaction.state === 'unrated';

function detailsHtml(c: StoredLite): string {
  const e = c.estimate, v = verdictOf(c), cyc = e.cycleWeeks ? `, then ${e.cycleWeeks[0] === e.cycleWeeks[1] ? e.cycleWeeks[0] : `${e.cycleWeeks[0]} to ${e.cycleWeeks[1]}`} weeks of cycling before the animals` : '';
  const note = c.provenance.tankNote ? `<li>${esc(c.provenance.tankNote)}</li>` : '';
  return `<div class="ex-details"><h5>The animals</h5><ul class="ex-roster">${c.roster.map(r => `<li>${esc(rosterLine(r))}</li>`).join('')}</ul>`
    + `<h5>More figures</h5><ul><li>Monthly: about ${usd(e.monthlyUsd.mean)} (up to ${usd(e.monthlyUsd.hi)}) for food, power and consumables.</li>`
    + `<li>Hands-on set-up: about ${Math.round(e.setupHours.mean * 10) / 10} h (up to ${Math.round(e.setupHours.hi * 10) / 10} h)${esc(cyc)}.</li>`
    + `<li>Footprint: ${e.footprintIn.L} x ${e.footprintIn.D} x ${e.footprintIn.H} in outside, ${galText(c)}.</li>${note}</ul>`
    + `<h5>Verdict: ${esc(v.pill)}</h5><ul class="ex-verdict" data-tone="${v.tone}">${v.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`
    + `<h5>Assumptions</h5><ul class="ex-assume">${c.provenance.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
}

/** One card. `data-ex` names what a click means; the screen listens once on the container. */
export function cardHtml(v: CardView): string {
  const c = v.c, vd = verdictOf(c), st = statsOf(c), name = esc(c.identity.name);
  const art = `<span class="ex-art${v.shot ? '' : v.wait ? ' ex-wait' : ''}"><span class="ex-ph" aria-hidden="true">${v.shot ? '' : esc(v.wait ? 'Drawing…' : c.identity.name)}</span>${v.shot ? `<img class="ex-shot" src="${v.shot}" alt="${name}, drawn as set up">` : ''}`
    + `${vd.tone !== 'ok' ? `<i class="ex-pill" data-tone="${vd.tone}">${esc(vd.pill)}</i>` : ''}</span>`;
  const why = v.role === 'explore' ? 'A different direction, to keep the choices wide.' : v.why?.length ? `Because you like ${v.why.join(' and ').toLowerCase()}.` : '';
  const acts = ACTS.map(a => `<button type="button" class="ex-act" data-ex="${a.id}" aria-pressed="${pressed(c, a.id)}" title="${esc(a.title)}">${a.label}</button>`).join('');
  return `<article class="ex-card" data-ex-id="${esc(c.id)}" data-state="${c.reaction.state}" data-verdict="${c.verdict.state}" data-status="${c.status}" data-saved="${c.reaction.saved}" style="--ex-c:${esc(familyColour(c))}">`
    + `<div class="ex-pic">${art}</div><div class="ex-body"><h4 class="ex-name">${name}</h4><p class="ex-world">${esc(worldLabel(c))}${familyName(c) ? ` · ${esc(familyName(c))}` : ''}</p>`
    + `<p class="ex-line">${esc(c.identity.tagline)}</p>`
    + `<dl class="ex-stats">${st.map(s => `<div class="ex-stat" data-stat="${s.id}" title="${esc(s.title)}"><dt>${s.label}</dt><dd>${esc(s.value)}</dd><span>${esc(s.sub)}</span></div>`).join('')}</dl>`
    + (vd.tone !== 'ok' ? `<p class="ex-flag" data-tone="${vd.tone}"><b>${esc(vd.pill)}.</b> ${esc(vd.lines[0] ?? '')}</p>` : '')
    + (why && !v.review ? `<p class="ex-because">${esc(why)}</p>` : '')
    + `<div class="ex-acts" role="group" aria-label="Your reaction to ${name}">${acts}</div>`
    + (v.tags ? tagPanelHtml(c, v.tags) : '')
    + `<p class="ex-foot"><button type="button" class="linkbtn" data-ex="details" aria-expanded="${!!v.open}">${v.open ? 'Hide details' : 'Details: animals, assumptions, verdict'}</button> `
    + `<button type="button" class="primary ex-mine" data-ex="mine"${c.status === 'stale' ? ' disabled title="It no longer fits your limits."' : ''}>Make This Mine</button></p>`
    + (v.open ? detailsHtml(c) : '') + `</div></article>`;
}
