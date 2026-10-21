// Lane MX (2026-10-21): merges the tank-minimum sourcing batches (research/sourcing/tank-minimum/M*.json, brief
// research/sourcing/brief-tank-minimum.md) into one row per species per measure, research only (src/ is not touched).
// Per measure: the agent's pick unless its quote failed the re-fetch check (<batch>.verify.json: miss / label-only), then the
// next credible min-kind source. Values in mm (lengths, depth, height) and US gal (volume). A gallon figure becomes geometry
// only as DERIVED (est): the catalogue rectangle of that rated volume (src/data/tanks.json, inner = outer - 2 glass),
// "long" over "high" unless the species is tall-bodied. Flags: credible sources of one measure apart by > 25 %, and sourced
// geometry that moves our current minLengthMm / minL by > 25 % (proposals for research/sourcing/decisions.md).
// Usage: node scripts/tank-min-sources.mjs   (writes research/sourcing/tank-minimum/summary.json, prints counts)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'research/sourcing/tank-minimum';
const input = Object.fromEntries(JSON.parse(readFileSync(`${DIR}/input.json`, 'utf8')).map(s => [s.id, s]));
const tanks = JSON.parse(readFileSync('src/data/tanks.json', 'utf8'));
const REF = (Array.isArray(tanks) ? tanks : tanks.tanks).filter(t => /^g\d/.test(t.id) && t.shape === 'rect');
const TALL = new Set(['angel', 'discus']);
const MM = { mm: 1, cm: 10, in: 25.4, ft: 304.8, m: 1000 };
const toMm = (v, u) => v * (MM[String(u).toLowerCase().replace(/es$|s$/, '')] ?? NaN);
const toGal = (v, u) => /^l/i.test(u) ? v / 3.785 : v;
const MEASURES = ['footprint', 'length', 'width', 'water_depth', 'tank_height', 'volume', 'body_height'];

function refTank(gal, id) {
  const near = [...REF].sort((a, b) => Math.abs(a.ratedGal - gal) - Math.abs(b.ratedGal - gal) || a.ratedGal - b.ratedGal);
  const same = near.filter(t => t.ratedGal === near[0].ratedGal);
  const t = same.length > 1 ? same.find(x => TALL.has(id) ? /high/.test(x.name) : !/high/.test(x.name)) ?? same[0] : same[0];
  const g = 2 * t.glassMm;
  return { id: t.id, name: t.name, ratedGal: t.ratedGal, L: Math.round(t.outer.L - g), W: Math.round(t.outer.D - g), H: Math.round(t.outer.H - g) };
}
const norm = (m, s) => {
  if (m === 'volume') return toGal(+s.value, s.unit);
  if (m === 'footprint') return Array.isArray(s.value) ? s.value.map(v => toMm(+v, s.unit)) : null;
  return toMm(+s.value, s.unit);
};
const size = (m, v) => m === 'footprint' ? (v ? v[0] * v[1] : NaN) : v;
const inch = mm => Math.round(mm / 25.4 * 10) / 10;

const out = {}, flags = [];
const files = readdirSync(DIR).filter(f => /^M\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
for (const f of files) {
  const batch = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  const vf = `${DIR}/${f.replace('.json', '.verify.json')}`;
  const ver = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')) : null;
  const status = (id, m, s) => ver?.find(x => x.id === id && x.field === m && x.url === s.url && x.quote === s.quote)?.result ?? (ver ? 'unchecked' : 'unverified');
  for (const [id, sp] of Object.entries(batch.species)) {
    const row = { batch: f.replace('.json', ''), sci: sp.sci, measures: {}, conflict: sp.conflict ?? null, checked: (sp.checked ?? []).length };
    for (const m of MEASURES) {
      const fld = sp.fields?.[m];
      const srcs = (fld?.sources ?? []).map((s, i) => ({ ...s, i, v: norm(m, s), check: status(id, m, s) }));
      // breeding, spawning, fry and juvenile figures are not an adult keeping minimum (Decision 1: full-grown animal)
      const notAdult = s => /breed|spawn|\bfry\b|grow-?out|juvenile/i.test(`${s.stage ?? ''} ${s.conditions ?? ''}`) && !/adult/i.test(s.stage ?? '');
      const ok = s => !['miss', 'label'].includes(s.check) && s.v != null && !Number.isNaN(size(m, s.v)) && !notAdult(s);
      const want = sp.pick?.[m]?.source;
      const credible = srcs.filter(s => ok(s) && s.credibility !== 'low');
      const agentPick = want != null && srcs[want] && ok(srcs[want]) ? srcs[want] : null;
      const kindOf = s => s.kind ?? 'min';
      // Decision 1: 100 % = the lowest WELL-SUPPORTED minimum; a stricter credible figure is the Recommended candidate
      const credMin = credible.filter(s => kindOf(s) === 'min').sort((a, b) => size(m, a.v) - size(m, b.v));
      const pick = (m !== 'body_height' && credMin.length ? credMin[0] : null) ?? agentPick ?? credible.find(s => kindOf(s) !== 'max') ?? srcs.find(ok);
      const excluded = srcs.filter(notAdult).length;
      if (!pick) { if (fld) row.measures[m] = { mark: 'not-stated', note: fld.note ?? null, ...(excluded ? { excluded } : {}) }; continue; }
      const sameKind = credible.filter(s => kindOf(s) === kindOf(pick));
      const vals = sameKind.map(s => size(m, s.v)).filter(x => x > 0);
      const spread = vals.length > 1 ? Math.max(...vals) / Math.min(...vals) - 1 : 0;
      const strict = credible.filter(s => s !== pick && (kindOf(s) === 'rec' || kindOf(s) === 'min') && size(m, s.v) > size(m, pick.v) * 1.25).sort((a, b) => size(m, b.v) - size(m, a.v))[0];
      row.measures[m] = {
        value: pick.v, unit: m === 'volume' ? 'gal' : 'mm', kind: pick.kind ?? 'min', url: pick.url, site: pick.site, quote: pick.quote,
        conditions: [pick.group != null ? `group ${pick.group}` : null, pick.stage, pick.conditions].filter(Boolean).join('; '),
        mark: m === 'body_height' ? 'advisory' : pick.est ? 'sourced (est)' : 'sourced', single: sameKind.length < 2,
        check: pick.check, credibility: pick.credibility, spread: Math.round(spread * 100), n: srcs.length,
        ...(agentPick && agentPick !== pick ? { agentPick: `${agentPick.site}: ${agentPick.states}` } : {}),
        ...(strict ? { recommended: { value: strict.v, site: strict.site, states: strict.states, url: strict.url, quote: strict.quote, kind: kindOf(strict) } } : {}),
        ...(excluded ? { excluded } : {}),
      };
      if (spread > 0.25) flags.push({ id, kind: 'conflict', measure: m, spreadPct: Math.round(spread * 100), values: sameKind.map(s => `${s.site}: ${s.states}`) });
    }
    // DERIVED (est): gallons -> the catalogue rectangle of that volume, only for geometry no page states
    const vol = row.measures.volume;
    if (vol?.value && !row.measures.footprint?.value && !row.measures.length?.value) {
      const t = refTank(vol.value, id);
      row.measures.footprint_derived = { value: [t.L, t.W], unit: 'mm', mark: 'derived (est)', from: `${vol.value.toFixed(1)} gal, ${vol.url}`, ref: t,
        logic: `catalogue tank of the nearest rated volume (${t.name}), inner L x W; ${TALL.has(id) ? 'tall-bodied: high variant' : 'long over high'}` };
    }
    // against our current values
    const cur = input[id] ?? {};
    const len = row.measures.footprint?.value?.[0] ?? row.measures.length?.value;
    if (len && cur.minLengthMm && Math.abs(len / cur.minLengthMm - 1) > 0.25)
      flags.push({ id, kind: 'length-vs-ours', ours: cur.minLengthMm, sourced: Math.round(len), oursIn: inch(cur.minLengthMm), sourcedIn: inch(len) });
    if (vol?.value && cur.minL && Math.abs(vol.value * 3.785 / cur.minL - 1) > 0.25)
      flags.push({ id, kind: 'volume-vs-ours', oursGal: Math.round(cur.minL / 3.785 * 10) / 10, sourcedGal: Math.round(vol.value * 10) / 10 });
    out[id] = row;
  }
}
const missing = Object.keys(input).filter(id => !out[id]);
writeFileSync(`${DIR}/summary.json`, JSON.stringify({ generated: 'scripts/tank-min-sources.mjs', species: out, flags, missing }, null, 1));
const has = m => Object.values(out).filter(r => r.measures[m]?.value != null).length;
console.log(`${Object.keys(out).length} species from ${files.length} batches; missing ${missing.length}${missing.length ? ': ' + missing.join(' ') : ''}`);
console.log(`sourced: footprint ${has('footprint')}, length ${has('length')}, width ${has('width')}, water_depth ${has('water_depth')}, tank_height ${has('tank_height')}, volume ${has('volume')}, body_height ${has('body_height')}; derived footprint ${has('footprint_derived')}`);
console.log(`no geometry at all (no footprint / length / derived): ${Object.entries(out).filter(([, r]) => !r.measures.footprint?.value && !r.measures.length?.value && !r.measures.footprint_derived).map(([id]) => id).join(' ') || 'none'}`);
console.log(`flags: conflict ${flags.filter(f => f.kind === 'conflict').length}, length-vs-ours ${flags.filter(f => f.kind === 'length-vs-ours').length}, volume-vs-ours ${flags.filter(f => f.kind === 'volume-vs-ours').length}`);

// US-unit table for research/tank-minimum-sources.md (pasted under "Per species"; regenerate after re-running)
const f1 = mm => (Math.round(mm / 25.4 * 2) / 2).toString();
const cell = (x, fmt) => {
  if (!x || x.value == null) return x?.mark === 'not-stated' ? 'n/s' : '';
  const v = fmt(x.value), tag = x.mark === 'sourced' ? '' : x.mark === 'sourced (est)' ? ' (est)' : ` (${x.mark})`;
  const rec = x.recommended ? `; Rec ${fmt(x.recommended.value)}` : '';
  return `${v}${x.kind && x.kind !== 'min' ? ' ' + x.kind : ''}${tag}${x.single ? ' 1src' : ''}${rec}`;
};
const fp = v => `${f1(v[0])} x ${f1(v[1])}`, ln = v => f1(v), gal = v => String(Math.round(v * 10) / 10);
const lines = ['| species | footprint in (L x W) | length in | water depth in | tank height in | volume gal (advisory) | ours: length in / gal |', '|---|---|---|---|---|---|---|'];
for (const [id, r] of Object.entries(out)) {
  const m = r.measures, cur = input[id] ?? {};
  const foot = m.footprint?.value ? cell(m.footprint, fp) : m.footprint_derived ? `${fp(m.footprint_derived.value)} DERIVED (est, ${m.footprint_derived.ref.name})` : 'none found';
  lines.push(`| ${id} | ${foot} | ${cell(m.length, ln)} | ${cell(m.water_depth, ln)} | ${cell(m.tank_height, ln)} | ${cell(m.volume, gal)} | ${cur.minLengthMm ? f1(cur.minLengthMm) : '-'} / ${gal(cur.minL / 3.785)} |`);
}
writeFileSync(`${DIR}/table.md`, lines.join('\n') + '\n');
