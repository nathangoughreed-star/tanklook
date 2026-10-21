// Lane MM (2026-10-21): the app's copy of the tank-minimum lines Nathan decided (research/sourcing/decisions.md MX1-MX9), from
// research/sourcing/tank-minimum/summary.json (scripts/tank-min-sources.mjs) into src/data/tankmin.json, read by scene/tankMin.ts.
// Per species: `red` = the minimum (below it the species fails), `green` = the Recommended mark (at or above it the bar is green;
// between the two = yellow, allowed), `hRed` / `hGreen` tank height, `depth` notes (Decision 4), `vol` the advisory gallon figure
// (Decision 2: never a gate), `why` the reason. Every value keeps its mark: 'sourced', 'sourced (est)' (the page states no
// conditions) or 'derived (est)' (a gallon figure turned into the smallest catalogue tank holding it), with the page's site and url;
// `est: true` marks the values the source audit must not call cited (src/data/provenance.ts TANKMIN).
// Usage: node scripts/tank-min-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const { species } = JSON.parse(readFileSync('research/sourcing/tank-minimum/summary.json', 'utf8'));
const est = mark => mark !== 'sourced';
const line = l => l && { L: l.L, ...(l.W ? { W: l.W } : {}), ...(l.areaMm2 ? { areaCm2: Math.round(l.areaMm2 / 100) } : {}), mark: l.mark, ...(est(l.mark) ? { est: true } : {}),
  site: l.site, url: l.url, states: l.states, from: l.from, ...(l.ref ? { ref: l.ref } : {}) };
const hline = h => h && { H: h.H, mark: h.mark, ...(est(h.mark) ? { est: true } : {}), site: h.site, url: h.url, states: h.states };
const out = {};
for (const [id, r] of Object.entries(species)) {
  const l = r.lines, v = r.measures.volume;
  const d = l.depth && { ...l.depth, ...(l.depth.mark && est(l.depth.mark) ? { est: true } : {}) };
  out[id] = {
    ...(l.red ? { red: line(l.red) } : {}), ...(l.green ? { green: line(l.green) } : {}),
    ...(l.heightRed ? { hRed: hline(l.heightRed) } : {}), ...(l.heightGreen ? { hGreen: hline(l.heightGreen) } : {}),
    ...(d ? { depth: d } : {}),
    // Decision 2 / MX9: the lowest well-supported gallon figure, advisory only (a low-credibility page sets nothing)
    ...(v?.value && v.credibility !== 'low' ? { vol: { gal: Math.round(v.value * 10) / 10, mark: v.mark, ...(est(v.mark) ? { est: true } : {}), site: v.site, url: v.url } } : {}),
    why: l.why,
  };
}
writeFileSync('src/data/tankmin.json', JSON.stringify({ generated: 'scripts/tank-min-data.mjs from research/sourcing/tank-minimum/summary.json', species: out }, null, 1) + '\n');
const n = k => Object.values(out).filter(x => x[k]).length;
console.log(`${Object.keys(out).length} species: red ${n('red')} (derived ${Object.values(out).filter(x => x.red?.mark === 'derived (est)').length}), green ${n('green')}, hRed ${n('hRed')}, hGreen ${n('hGreen')}, depth ${n('depth')}, vol ${n('vol')}`);
