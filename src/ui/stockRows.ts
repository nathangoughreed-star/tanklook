// The roster rows of the stocking screen, drawn from picks (lane GS5, 2026-11-02: split out of ui/stockPlan.ts so the side panel (Sandbox / direct use) and Animals First's embedded
// roster picker (ui/guided/animalsFirst.ts) draw the same row: counts by sex, life stage, pairing, per-animal conflicts and the graded group message). Pure strings, no scene writes;
// the caller wires the [data-act] buttons.
import { getSpecies } from '../data/species';
import { lifeStages } from '../data/lifestages';
import type { Units } from '../scene/types';
import { conflictsOf, groupLineIn, isSexed, notesOf, type Pairing, type Pk, type Plan } from './stockPlanLogic';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const PAIR_OPTS: [Pairing, string][] = [['established', 'Established'], ['unconfirmed', 'Not confirmed'], ['unknown', "Don't know"]];
const bandClass = (b: string) => `spb-${b}`;

// S228: the editor's life-stage buttons on a pick (herps, fish 100 mm or longer); adult is the default and clears the size
export function stageRowHtml(p: Pk, units: Units): string {
  const sp = getSpecies(p.id), st = sp && lifeStages(sp); if (!st || !sp) return '';
  const cur = p.tl ?? sp.tl, u = units;
  return `<div class="spStage"><span class="spLab">Size now</span>${st.map(([n, mm], i) => { const adult = i === st.length - 1, on = adult ? !p.tl : p.tl === mm;
    return `<button type="button" data-act="stage" data-id="${p.id}" data-mm="${adult ? 0 : mm}"${on ? ' class="on"' : ''} aria-pressed="${on}" title="${n}: about ${u === 'in' ? `${+(mm / 25.4).toFixed(1)} in` : `${Math.round(mm / 10)} cm`}">${n}</button>`; }).join('')}${p.tl ? `<span class="spNote">about ${u === 'in' ? `${+(cur / 25.4).toFixed(1)} in` : `${Math.round(cur / 10)} cm`} now</span>` : ''}</div>`;
}

/** One roster row. `picks` is the whole roster (conflicts are between animals), `plan` the tank plan the group message is judged in. */
export function pickRowHtml(p: Pk, picks: Pk[], plan: Plan, units: Units): string {
  const sp = getSpecies(p.id)!, nt = notesOf(p, units), sexed = isSexed(p.id);
  const step = (which: 'n' | 'f' | 'u', label: string, v: number) =>
    `<span class="spStep"><span class="spLab">${label}</span><button type="button" data-act="dec" data-id="${p.id}" data-w="${which}" aria-label="One fewer ${esc(label || sp.name)}"${v <= 0 ? ' disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="inc" data-id="${p.id}" data-w="${which}" aria-label="One more ${esc(label || sp.name)}">+</button></span>`;
  return `<li class="spPick"><div class="spName"><b>${esc(sp.name)}</b><i>${esc(sp.sci)}</i><button type="button" class="spX" data-act="del" data-id="${p.id}" aria-label="Take ${esc(sp.name)} out">✕</button></div>
<div class="spSteps">${sexed ? step('n', 'Males', p.n) + step('f', 'Females', p.f ?? 0) + step('u', 'Unsexed', p.u ?? 0) : step('n', '', p.n)}</div>
${stageRowHtml(p, units)}${nt.pairing ? `<div class="spPair"><span class="spLab">Pair</span>${PAIR_OPTS.map(([v, t]) => `<button type="button" data-act="pair" data-id="${p.id}" data-v="${v}"${nt.pairing!.status === v ? ' class="on"' : ''} aria-pressed="${nt.pairing!.status === v}">${t}</button>`).join('')}</div><div class="${nt.pairing.status === 'established' ? 'spNote' : 'spWarn'}">${esc(nt.pairing.line)}</div>` : ''}
${conflictsOf(picks, p.id, units === 'in').filter(w => /^expertise:/.test(w.text)).map(w => `<div class="${w.block ? 'spWarn' : 'spNote'}">${esc(w.text)}</div>`).join('')}${(() => { const g = groupLineIn(nt, plan); return nt.line ? `<div class="spMsg ${g.held ? 'spb-held' : nt.band === 'avoid' && nt.tone === 'warn' ? 'spb-ok' : bandClass(nt.band)}">${esc(nt.line)}</div>` : ''; })()}${nt.ratio ? `<div class="spNote">${esc(nt.ratio)}</div>` : ''}
${nt.habitat.length ? `<div class="spNote">${nt.habitat.map(esc).join(' · ')}</div>` : ''}</li>`;
}
