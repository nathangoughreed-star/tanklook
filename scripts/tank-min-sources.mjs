// Lane MX (2026-10-21): merges the tank-minimum sourcing batches (research/sourcing/tank-minimum/M*.json, brief
// research/sourcing/brief-tank-minimum.md) into one row per species per measure, research only (src/ is not touched).
// Per measure: the agent's pick unless its quote failed the re-fetch check (<batch>.verify.json: miss / label-only), then the
// next credible min-kind source. Values in mm (lengths, depth, height) and US gal (volume). A gallon figure becomes geometry
// only as DERIVED (est): the catalogue rectangle of at least that rated volume (src/data/tanks.json, inner = outer - 2 glass),
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
  // the smallest catalogue tank that holds at least the stated volume (a smaller one would not meet the page's figure)
  const near = [...REF].filter(t => t.ratedGal >= gal - 0.05).sort((a, b) => a.ratedGal - b.ratedGal);
  const same = near.filter(t => t.ratedGal === near[0].ratedGal);
  const t = same.length > 1 ? same.find(x => TALL.has(id) ? /high/.test(x.name) : !/high/.test(x.name)) ?? same[0] : same[0];
  const g = 2 * t.glassMm;
  return { id: t.id, name: t.name, ratedGal: t.ratedGal, L: Math.round(t.outer.L - g), W: Math.round(t.outer.D - g), H: Math.round(t.outer.H - g) };
}
// decisions.md MX4-MX8 (Nathan 2026-10-21): hand-set lines where the rule alone would not say what was decided
const IN = 25.4;
const OVERRIDE = {
  swordtail: { why: 'MX4: FishBase length and SF floor area, each held on its own',
    red: { L: 800, area: 1200 * 300, est: true, site: 'FishBase + Seriously Fish', url: 'https://www.fishbase.net.br/summary/3231', states: 'minimum aquarium size 80 cm; area of 120 x 30 cm "or equivalent"', from: 'length + footprint area' }, green: null },
  // heights by site name: that batch's own tank_height source (url, quote) is used
  crestedgecko: { why: 'MX8: 18 x 18 x 24 in required (two pages), 36 in tall Recommended', hredSite: 'ReptiFiles', hgreenSite: 'Reptiles Magazine' },
  crestedharlequin: { why: 'MX8: as crested gecko', hredSite: 'ReptiFiles', hgreenSite: 'Reptiles Magazine' },
  firetoad: { why: "MX8: 12 in tall required (vet page), 18 x 18 x 18 Recommended (Josh's Frogs)", hredSite: 'Vet Desk', hgreenSite: "Josh's Frogs" },
  ballpython: { why: 'MX8 / S168: ReptiFiles 4 x 2 x 2 ft adult kept over the 40 gal retail figure', redSite: 'ReptiFiles', green: null },
  chacogoldenknee: { why: 'MX8: 20 x 10 in floor (Dubia Roaches); Josh\'s Frogs rule 4 x diagonal leg span, 7 in adult span on the same page = 28 in (derived, est)',
    red: { L: 20 * IN, W: 10 * IN, site: 'Dubia Roaches', url: 'https://dubiaroaches.com/blogs/invert-care/chaco-golden-knee-tarantula-care-sheet', states: '20"L x 10"W', from: 'footprint' },
    green: { L: 28 * IN, W: 28 * IN, mark: 'derived (est)', site: "Josh's Frogs", url: 'https://www.joshsfrogs.com/chaco-golden-knee-tarantula-grammostola-pulchripes-captive-bred.html', states: "four times the spider's diagonal leg span (7 in)", from: 'rule' } },
};
// MX7: no page states a required minimum water depth; these are the depth notes MM carries
const DEPTH = {
  angel: { recommendedTankHeightMm: 500, mark: 'sourced', note: 'Seriously Fish: a tall tank of at least 50 cm, for adults; body height 20 cm' },
  discus: { advisoryTankHeightMm: Math.round(18 * IN), mark: 'estimated advisory', note: 'one low-credibility page: 18-20 in of water height; tall body' },
  adf: { maxWaterDepthMm: Math.round(24 * IN), mark: 'advisory', note: 'Modest Fish: no deeper than 2 ft; must reach the surface to breathe' },
  kuhli: { note: 'no page states a water depth; the 2 in tray is not assessed' },
};
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
    const geo = [], hgt = [];
    for (const m of MEASURES) {
      const fld = sp.fields?.[m];
      const srcs = (fld?.sources ?? []).map((s, i) => ({ ...s, i, v: norm(m, s), check: status(id, m, s) }));
      // breeding, spawning, fry and juvenile figures are not an adult keeping minimum (Decision 1: full-grown animal)
      const notAdult = s => /breed|spawn|\bfry\b|grow-?out|juvenile/i.test(`${s.stage ?? ''} ${s.conditions ?? ''}`) && !/adult/i.test(s.stage ?? '');
      const ok = s => !['miss', 'label'].includes(s.check) && s.v != null && !Number.isNaN(size(m, s.v)) && !notAdult(s);
      const want = sp.pick?.[m]?.source;
      const credible = srcs.filter(s => ok(s) && s.credibility !== 'low');
      for (const s of credible) {
        const c = { kind: s.kind ?? 'min', site: s.site, url: s.url, states: s.states, quote: s.quote, est: !!s.est, from: m };
        if (m === 'footprint' && s.kind !== 'max') geo.push({ ...c, L: s.v[0], W: s.v[1] });
        if (m === 'length' && s.kind !== 'max') geo.push({ ...c, L: s.v });
        if (m === 'tank_height' && s.kind !== 'max') hgt.push({ ...c, H: s.v });
      }
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
        logic: `smallest catalogue tank of at least that rated volume (${t.name}), inner L x W; ${TALL.has(id) ? 'tall-bodied: high variant' : 'long over high'}` };
    }
    // The two lines (Nathan 2026-10-21, MX1 / MX2, decisions.md): red = minimum (below it fails), green = Recommended (between
    // the two = yellow, allowed). Red = the lowest well-supported figure: with two or more geometry pages the lowest stated minimum;
    // with one page or none, the gallon figure's catalogue tank (derived, est) also competes. Green = the strictest credible
    // geometry above red. Never averaged. Aquatic invertebrates: clearance only (Decision 3), no lines.
    const cur = input[id] ?? {};
    // a low-credibility gallon page never sets a line; land animals: aquarium tanks are no reference once a page states geometry
    const land = /reptile|land-invert/.test(cur.cat ?? '') || (cur.cat === 'amphibian' && !['adf', 'axolotl', 'firenewt'].includes(id));
    const derivedC = vol?.value && vol.credibility !== 'low' && !(land && geo.length) ? (() => { const t = row.measures.footprint_derived?.ref ?? refTank(vol.value, id);
      return { kind: 'min', L: t.L, W: t.W, mark: 'derived (est)', site: vol.site, url: vol.url, states: `${Math.round(vol.value * 10) / 10} gal -> ${t.name}`, from: 'volume', ref: t.id }; })() : null;
    const line = c => c && { L: Math.round(c.L), W: c.W ? Math.round(c.W) : null, ...(c.area ? { areaMm2: c.area } : {}), mark: c.mark ?? (c.est ? 'sourced (est)' : 'sourced'),
      site: c.site, url: c.url, states: c.states, ...(c.quote ? { quote: c.quote } : {}), from: c.from, ...(c.ref ? { ref: c.ref } : {}), ...(c.note ? { note: c.note } : {}) };
    let red = null, green = null, why = '';
    if (/invert/.test(cur.cat ?? '') && cur.cat !== 'land-invert') why = 'aquatic invertebrate: clearance only (Decision 3)';
    else {
      const pages = new Set(geo.map(g => g.url)).size;
      const mins = geo.filter(g => g.kind === 'min');
      const pool = pages >= 2 && mins.length ? mins : [...mins, ...(derivedC ? [derivedC] : [])];
      red = [...pool].sort((a, b) => a.L - b.L)[0] ?? null;
      const top = [...geo].sort((a, b) => b.L - a.L)[0];
      green = top && (!red || top.L > red.L * 1.05) ? top : null;
      why = pages >= 2 ? `${pages} geometry pages: lowest stated minimum` : pages === 1 ? 'one geometry page: it or the gallon figure\'s tank, whichever is lower' : 'no geometry page: derived from gallons';
    }
    const heights = { red: null, green: null };
    if (hgt.length) {
      const hm = hgt.filter(h => h.kind === 'min').sort((a, b) => a.H - b.H)[0], ht = [...hgt].sort((a, b) => b.H - a.H)[0];
      heights.red = hm ?? null; heights.green = ht && (!hm || ht.H > hm.H * 1.05) ? ht : null;
    }
    // decided by hand (decisions.md MX4-MX8, Nathan 2026-10-21 "I agree with your recommendations")
    const O = OVERRIDE[id];
    const hSite = site => { const s = (sp.fields?.tank_height?.sources ?? []).find(x => x.site.includes(site));
      return s && { H: norm('tank_height', s), site: s.site, url: s.url, states: s.states, quote: s.quote, est: !!s.est }; };
    if (O) { if ('red' in O) red = O.red; if (O.redSite) { const g = geo.find(x => x.site.includes(O.redSite)); if (g) red = { ...g, kind: 'min' }; } if ('green' in O) green = O.green; if (O.hredSite) heights.red = hSite(O.hredSite); if (O.hgreenSite) heights.green = hSite(O.hgreenSite); why = O.why; }
    const hl = h => h && { H: Math.round(h.H), mark: h.mark ?? (h.est ? 'sourced (est)' : 'sourced'), site: h.site, url: h.url, states: h.states, ...(h.quote ? { quote: h.quote } : {}) };
    row.lines = { red: line(red), green: line(green), why, heightRed: hl(heights.red), heightGreen: hl(heights.green), depth: DEPTH[id] ?? null };
    // against our current values
    const len = row.measures.footprint?.value?.[0] ?? row.measures.length?.value;
    if (len && cur.minLengthMm && Math.abs(len / cur.minLengthMm - 1) > 0.25)
      flags.push({ id, kind: 'length-vs-ours', ours: cur.minLengthMm, sourced: Math.round(len), oursIn: inch(cur.minLengthMm), sourcedIn: inch(len) });
    if (vol?.value && cur.minL && Math.abs(vol.value * 3.785 / cur.minL - 1) > 0.25)
      flags.push({ id, kind: 'volume-vs-ours', oursGal: Math.round(cur.minL / 3.785 * 10) / 10, sourcedGal: Math.round(vol.value * 10) / 10 });
    out[id] = row;
  }
}
// same species, a colour morph: the crested harlequin takes the crested gecko's lines
if (out.crestedharlequin && out.crestedgecko) out.crestedharlequin.lines = { ...out.crestedgecko.lines, why: 'same species as crestedgecko (Correlophus ciliatus): its lines' };
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
const ln2 = c => !c ? '-' : `${f1(c.L)}${c.W ? ' x ' + f1(c.W) : ''}${c.areaMm2 ? ` + ${Math.round(c.areaMm2 / 645.16)} sq in` : ''}${c.mark === 'sourced' ? '' : c.mark === 'derived (est)' ? ' DERIVED (est)' : ' (est)'} ${c.site ?? ''}`.trim();
const hh = c => !c ? '-' : `${f1(c.H)} ${c.site ?? ''}`.trim();
const lines = ['| species | RED minimum in (L x W) | GREEN Recommended in | height red / green in | depth note | volume gal (advisory) | ours: length in / gal |', '|---|---|---|---|---|---|---|'];
for (const [id, r] of Object.entries(out)) {
  const l = r.lines, cur = input[id] ?? {};
  const red = l.red ? ln2(l.red) : l.why.startsWith('aquatic invertebrate') ? 'clearance only' : 'none';
  const dep = l.depth ? (l.depth.recommendedTankHeightMm ? `Rec tank height ${f1(l.depth.recommendedTankHeightMm)}` : l.depth.advisoryTankHeightMm ? `advisory ${f1(l.depth.advisoryTankHeightMm)} tall` : l.depth.maxWaterDepthMm ? `max water ${f1(l.depth.maxWaterDepthMm)} (advisory)` : 'not assessed') : '';
  lines.push(`| ${id} | ${red} | ${ln2(l.green)} | ${hh(l.heightRed)} / ${hh(l.heightGreen)} | ${dep} | ${cell(r.measures.volume, gal)} | ${cur.minLengthMm ? f1(cur.minLengthMm) : '-'} / ${gal(cur.minL / 3.785)} |`);
}
writeFileSync(`${DIR}/table.md`, lines.join('\n') + '\n');
