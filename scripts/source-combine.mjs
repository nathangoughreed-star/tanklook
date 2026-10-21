// Lane CB (2026-10-21, design agreed with Nathan in chat S168): combine what the opened pages say instead of picking one page per
// value. Each verified quote (research/sourcing/<batch>.verify.json: exact / compact) becomes a claim in the unit the page states:
// litres or gallons feed the volume, a base L x W feeds the tank length, width and floor area, a tank height the height, a length the
// adult size, a word the care or temperament level. A gallon figure never sets a length. Claims are weighted (WEIGHTS below), one site
// counts once, numbers combine by weighted median (ranges end by end), words by weighted vote. Tank sizes split into two tiers when the
// claims are more than TIER_SPLIT apart: the low cluster is the floor (red line, CARE.minL), the high one the comfort mark (green line,
// the advisory volume). Our current value never votes; it only shows how far the result moves.
// No new research and no model calls: the pages and checked quotes are the A1-A9, R1-R4, pilot-01 and tank-minimum M1-M9 batches.
// Usage: node scripts/source-combine.mjs   (writes research/sourcing/combined.md and combine/proposal.json, prints counts)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createServer } from 'vite';

// ---- the weights (Nathan may change these) ------------------------------------------------------------------------------------
/** by sources.json `kind` of the page's site */
const WEIGHTS = { primary: 1, reference: 1, consensus: 0.7 /* care sheets */, retailer: 0.5 };
/** a genus-wide or generic page (the batch says so, or the url / statement does) */
const GENERIC = 0.5;
/** tank sizes: claims more than this far apart split into floor (low cluster) and comfort (high cluster) */
const TIER_SPLIT = 1.5;
/** a combined number this close to ours is the same value (unit-conversion and nominal-size noise: a 10 gal tank is 37.9 L, ours says 40) */
const SAME = 0.06;
// --------------------------------------------------------------------------------------------------------------------------------

const DIR = 'research/sourcing', TM = `${DIR}/tank-minimum`;
const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8')).sources;
// the page's site as provenance.ts names it (ca.aquariumsource.com = aquariumsource.com; x.co.uk keeps 3 labels)
const host = url => { const h = new URL(url).hostname.split('.'); return h.slice(/^(co|com|org|net|ac)$/.test(h[h.length - 2]) && h.length > 2 ? -3 : -2).join('.'); };
const GENERIC_RE = /genus|generic|general(?:ly)? (?:sheet|page|guide|anole|loach|fire-bellied)|\bgeneral\b(?= [a-z-]+ (?:sheet|page|guide))|all [a-z]+ species|Anolis generally|generic anole/i;

// ---- current values (ours) -----------------------------------------------------------------------------------------------------
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const { CARE } = await vite.ssrLoadModule('/src/data/care.ts');
const { AIR } = await vite.ssrLoadModule('/src/data/climate.ts');
await vite.close();
const SPECIES = Object.fromEntries(JSON.parse(readFileSync('src/data/species.json', 'utf8')).species.map(s => [s.id, s]));
const TANKMIN = JSON.parse(readFileSync('src/data/tankmin.json', 'utf8')).species;
const oursOf = (id, f) => f === 'tl' ? SPECIES[id]?.tl : f === 'female.tl' ? SPECIES[id]?.female?.tl : f.startsWith('air.') ? AIR[id]?.[f.slice(4)] : CARE[id]?.[f];

// ---- parsers: `states` -> claims in the page's own unit -------------------------------------------------------------------------
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const LEN_U = { mm: 1, cm: 10, in: 25.4, inch: 25.4, inches: 25.4, ft: 304.8, m: 1000 };
const segs = s => s.split(/[;,]/).map(x => x.trim()).filter(Boolean);
/** adult length, mm, of the measure the field holds (TL; SL, SVL and leg span are other measures and do not count) */
function parseLength(s, female, id) {
  if (SPECIES[id]?.cat === 'land-invert' && /diameter|leg span/i.test(s)) return { fail: 'states the leg span, not the body length' };
  const all = segs(s), fem = all.filter(x => /\bfemales?\b/i.test(x));
  const use = female ? (fem.length ? fem : all) : all.filter(x => !/\bfemales?\b/i.test(x));
  if (!use.length) return { fail: 'states only a female size' };
  const toks = [];
  for (const g of use) {
    if (/\bcommon\b/i.test(g) && !/max/i.test(g)) continue;
    // a number may carry a fraction (1 1/8 in) or be one (1/2 to 1 inch); a range keeps its upper end (the stated maximum)
    const re = /(\d+(?:\.\d+)?(?:\s+\d\/\d)?|\d\/\d)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?(?:\s+\d\/\d)?|\d\/\d))?\s*\+?\s*(mm|cm|inches|inch|in|ft|m)\b\.?\s*(TL|SL|SVL|DLS)?/g;
    const num = x => x.trim().split(/\s+/).reduce((a, t) => a + (t.includes('/') ? +t.split('/')[0] / +t.split('/')[1] : +t), 0);
    for (const m0 of g.matchAll(re)) {
      if (/common\s*$/i.test(g.slice(0, m0.index))) continue;
      const m = [m0[0], null, null, null, m0[2], m0[3], m0[4]], v = num(m0[2] ?? m0[1]);
      toks.push({ mm: v * LEN_U[m[5].toLowerCase()], unit: m[5].toLowerCase(), type: (m[6] ?? (/\bSVL\b/.test(g) ? 'SVL' : /\bDLS\b|leg span/i.test(g) ? 'DLS' : /\bSL\b/.test(g) && !/\bTL\b/.test(g) ? 'SL' : 'TL')).toUpperCase() });
    }
  }
  const tl = toks.filter(t => t.type === 'TL');
  if (!tl.length) return { fail: toks.length ? `states ${[...new Set(toks.map(t => t.type))].join(' / ')}, not total length` : 'no length found' };
  const best = ['mm', 'cm'].find(u => tl.some(t => t.unit === u));
  const pick = best ? tl.filter(t => t.unit === best) : tl;
  return { v: Math.round(Math.max(...pick.map(t => t.mm))) };
}
/** volume, litres: the first figure the page gives (the lower end of a range); a later "recommended / better" figure is a comfort claim */
function parseVolume(s) {
  if (/juvenile|grow-?out|breed/i.test(s)) return { fail: 'a juvenile or breeding figure, not an adult minimum' };
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to|or)\s*(\d+(?:\.\d+)?))?\s*\+?\s*(US gal(?:lons?)?|gal(?:lons?)?|litres|liters|L)\b/gi;
  const out = [];
  let last = -1;
  for (const m of s.matchAll(re)) {
    const pre = s.slice(Math.max(0, last), m.index);
    // a figure in brackets right after another one is its conversion
    if (last >= 0 && /^\s*\(?\s*[~≈]?\s*$/.test(pre.replace(/[=/]/, '').replace(/about|approx\.?/i, ''))) { last = m.index + m[0].length; continue; }
    const dims = /\d\s*x\s*\d+(?:\s*x\s*\d+)?\s*(?:in|cm)?\s*(?:\/[^=]*)?=\s*~?\s*$/i.test(s.slice(0, m.index));
    if (dims && /L$|litres|liters/i.test(m[3])) { last = m.index + m[0].length; continue; }   // litres worked out from stated dimensions: the page states geometry
    const L = /gal/i.test(m[3]) ? +m[1] * 3.785 : +m[1];
    const rec = /recommend|better|ideal|prefer/i.test(s.slice(Math.max(0, m.index - 20), m.index + m[0].length + 14)) && out.length > 0;
    out.push({ v: Math.round(L * 10) / 10, kind: rec ? 'rec' : 'min' });
    last = m.index + m[0].length;
  }
  if (!out.length) return { fail: /\d\s*x\s*\d/.test(s) ? 'geometry only, no volume stated' : 'no volume found' };
  return { claims: [out[0], ...out.slice(1).filter(c => c.kind === 'rec').slice(0, 1)] };
}
/** a base or full tank, mm: L x W (x H) */
function parseDims(s) {
  const m = s.match(/(\d+(?:\.\d+)?)\s*[x∗×]\s*(\d+(?:\.\d+)?)(?:\s*[x∗×]\s*(\d+(?:\.\d+)?))?\s*(cm|in|mm)\b/i);
  if (!m) return null;
  const k = LEN_U[m[4].toLowerCase()];
  return { L: +m[1] * k, W: +m[2] * k, ...(m[3] ? { H: +m[3] * k } : {}) };
}
function parseCare(s) {
  const t = s.toLowerCase().replace(/not for beginners/g, 'moderate');
  const lv = new Set();
  if (/easy|easiest|beginner|hardy|hardiest|low-maintenance|first-time/.test(t) && !/no label/.test(t)) lv.add(1);
  if (/moderate|intermediate|medium|some basic experience/.test(t)) lv.add(2);
  if (/difficult|challenging|expert|advanced/.test(t)) lv.add(3);
  return lv.size ? { votes: [...lv] } : { fail: 'no care level stated' };
}
function parseTemper(s) {
  const t = s.toLowerCase();
  if (/not especially aggressive|seldom|rarely/.test(t)) return { fail: 'relative wording (not especially / rarely), no level' };
  if (/unknown/.test(t) || !/peace|docile|calm|shy|timid|easy-going|mild|aggress|territorial|vigorous|bull|belligerent/.test(t)) return { fail: 'no temperament word' };
  if (/highly aggressive|most aggressive|notoriously aggressive|belligerent|(?<!semi-)aggressive \d+\/10|^aggressive|territorial and aggressive|aggressive, territorial|pretty aggressive|territorial bullies|reputation for aggression/.test(t)) return { votes: [2] };
  const calm = /peace|docile|calm|shy|timid|easy-going|mild/.test(t);
  const pushy = /semi-aggressive|territorial|vigorous|can be aggressive|aggressive tendencies|can become aggressive|more aggressive|aggressive toward/.test(t);
  // aggression only when breeding or toward its own kind is the solo / group flags' business, not the temperament
  const ownKind = /breeding|spawning|own (kind|species)|conspecific|similar colou?r|each other|other females|too few females|over shells/.test(t);
  if (calm && pushy) return ownKind ? { votes: [0] } : { votes: [0, 1] };
  return pushy ? { votes: [1] } : { votes: [0] };
}
function parseGroup(s) {
  const t = s.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g, w => NUMW[w]);
  const keep = segs(t).filter(x => !/ideal|prefer|recommend|better/.test(x));
  const m = keep.join(', ').match(/(\d+)/);
  return m ? { v: +m[1] } : { fail: /ideal|prefer/.test(t) ? 'states only an ideal count' : 'no count stated' };
}
function parseMax(s) {
  if (/pair/i.test(s)) return { v: 2 };
  if (/\bone\b/i.test(s)) return { v: 1 };
  return { fail: 'no count stated' };
}
/** a range (pH, deg C, %RH): [lo, hi]; F converts to C; a single figure is both ends */
function parseRange(s, field) {
  const temp = /temp|tol|warm/.test(field);
  const re = /(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(°?\s*[CF]\b|%)?/g;
  const rs = [...s.matchAll(re)].filter(m => m[1] && (!temp || m[3])).map(m => ({ lo: +m[1], hi: +(m[2] ?? m[1]), u: (m[3] ?? '').replace(/[°\s]/g, '') }));
  const r = rs.find(x => x.u === 'C' && x.lo !== x.hi) ?? rs.find(x => x.lo !== x.hi) ?? rs.find(x => x.u === 'C') ?? rs[0];
  if (!r) return { fail: 'no range found' };
  if (field === 'ph' && (r.lo < 2 || r.hi > 11)) return { fail: 'no pH range found' };
  const c = r.u === 'F' ? x => Math.round((x - 32) / 1.8 * 10) / 10 : x => x;
  if (r.lo === r.hi) {
    // one end only: "above 7.0" is a low end, "below 50 %" a high end; a bare single figure is not a range
    if (/above|over|not below|at least|min/i.test(s)) return { v: [c(r.lo), null] };
    if (/below|under|up to|max/i.test(s)) return { v: [null, c(r.hi)] };
    return { fail: 'a single figure, not a range' };
  }
  return { v: [c(r.lo), c(r.hi)] };
}
const PARSE = { tl: (s, id) => parseLength(s, false, id), 'female.tl': (s, id) => parseLength(s, true, id), care: parseCare, temper: parseTemper, group: parseGroup, max: parseMax,
  ph: s => parseRange(s, 'ph'), temp: s => parseRange(s, 'temp'), tol: s => parseRange(s, 'tol'), 'air.rh': s => parseRange(s, 'air.rh'), 'air.warm': s => parseRange(s, 'air.warm') };
/** fields not combined, and why */
const SKIP = {
  'air.c': 'pages state zones (cool side, day) that do not map onto one comfort band', 'air.tol': 'pages state night lows, not a tolerance band',
  'air.rhTol': 'pages state a humid hide or a shed figure, not a tolerance band', minLengthMm: 'superseded by the tank-minimum lines (tankmin.json)',
  solo: 'yes / no behaviour, not combined', slow: 'yes / no behaviour, not combined', nip: 'yes / no behaviour, not combined', prey: 'no page states a prey size',
  fam: 'a rivalry group, not combined', coral: 'one page', bands: 'count bands are judgement over the group figure',
};

// ---- claims ---------------------------------------------------------------------------------------------------------------------
// decisions recorded only in decisions.md, not in a batch's `decision` field (SQ batch 1)
const claims = {}, fails = [], unknownSites = new Set(), DECIDED = { 'sixline|minL (floor, L)': 'adopted: SQ batch 1 (decisions.md), 208 L; kept (Nathan 2026-10-21)' };
const add = (id, f, c) => (claims[`${id}|${f}`] ??= []).push(c);
const weigh = (url, generic) => { const h = host(url), k = sources[h]?.kind; if (!k) unknownSites.add(h); const w = (WEIGHTS[k] ?? 0) * (generic ? GENERIC : 1); return { host: h, kind: k ?? 'unregistered', w }; };
const genericOf = (s, v) => {
  if (GENERIC_RE.test(`${s.url} ${s.states}`)) return true;
  // a sentence of the field's note / decision that names this site and calls a page generic
  return `${v.note ?? ''}. ${v.decision ?? ''}`.split(/(?<=[.;])\s/).some(x => GENERIC_RE.test(x) && x.toLowerCase().includes(String(s.site ?? '').toLowerCase().split(' ')[0]));
};
const ok = r => r === 'exact' || r === 'compact';

// care batches: A1-A9, R1-R4, pilot-01
const careFiles = readdirSync(DIR).filter(f => /^([AR]\d+|pilot-\d+)\.json$/.test(f));
for (const f of careFiles) {
  const b = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')), vf = `${DIR}/${f.replace('.json', '.verify.json')}`;
  const ver = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')) : [];
  for (const [id, sp] of Object.entries(b.species)) for (const [field, v] of Object.entries(sp.fields)) {
    if (SKIP[field] || !(PARSE[field] || field === 'minL')) continue;
    if (v.decision) DECIDED[`${id}|${field === 'minL' ? 'minL (floor, L)' : field}`] = `${v.verdict}: ${v.decision.replace(/^Nathan [\d-]+: /, '')}`;
    for (const s of v.sources ?? []) {
      const check = ver.find(c => c.id === id && c.field === field && c.url === s.url)?.result ?? 'unchecked';
      if (!ok(check)) continue;
      const g = genericOf(s, v), base = { batch: f.replace('.json', ''), site: s.site, url: s.url, states: s.states, quote: s.quote, check, generic: g, ...weigh(s.url, g) };
      if (field === 'minL') {
        const p = parseVolume(s.states);
        if (p.fail && p.fail !== 'geometry only, no volume stated') fails.push({ id, field: 'volume', ...base, why: p.fail });
        for (const c of p.claims ?? []) add(id, 'volume', { ...base, v: c.v, kind: c.kind });
        continue;
      }
      const p = PARSE[field](s.states, id);
      if (p.fail) { fails.push({ id, field, ...base, why: p.fail }); continue; }
      add(id, field, { ...base, ...(p.votes ? { votes: p.votes } : { v: p.v }) });
    }
  }
}
// what Nathan decided when the combination was applied (research/sourcing/combined.json, scripts/source-combine-apply.mjs): labels only
if (existsSync(`${DIR}/combined.json`)) for (const [id, sp] of Object.entries(JSON.parse(readFileSync(`${DIR}/combined.json`, 'utf8')).species))
  for (const [field, v] of Object.entries(sp.fields)) if (v.verdict === 'kept' || /Nathan 2026-10-21:/.test(v.decision ?? '')) DECIDED[`${id}|${field === 'minL' ? 'minL (floor, L)' : field}`] = `${v.verdict === 'kept' ? 'kept' : 'picked'}: ${v.decision.replace(/^.*?(Nathan 2026-10-21: |kept \(Nathan 2026-10-21\): )/, '')}`;
// tank-minimum batches M1-M9: values already parsed by the agents (value + unit + kind); the same filters MM decided (Decision 1:
// adult figures only; low-credibility pages set no line)
const TO_MM = { mm: 1, cm: 10, in: 25.4, inch: 25.4, inches: 25.4, ft: 304.8, feet: 304.8, m: 1000 };
const toMm = (v, u) => v * (TO_MM[String(u).toLowerCase()] ?? NaN);
for (const f of readdirSync(TM).filter(x => /^M\d+\.json$/.test(x))) {
  const b = JSON.parse(readFileSync(`${TM}/${f}`, 'utf8')), ver = JSON.parse(readFileSync(`${TM}/${f.replace('.json', '.verify.json')}`, 'utf8'));
  for (const [id, sp] of Object.entries(b.species)) for (const m of ['footprint', 'length', 'tank_height', 'volume']) for (const s of sp.fields?.[m]?.sources ?? []) {
    const check = ver.find(x => x.id === id && x.field === m && x.url === s.url && x.quote === s.quote)?.result ?? 'unchecked';
    if (!ok(check) || s.kind === 'max') continue;
    const g = genericOf(s, sp.fields[m]), base = { batch: f.replace('.json', ''), site: s.site, url: s.url, states: s.states, quote: s.quote, check, generic: g, ...weigh(s.url, g), kind: s.kind ?? 'min' };
    if (/breed|spawn|\bfry\b|grow-?out|juvenile/i.test(`${s.stage ?? ''} ${s.conditions ?? ''}`) && !/adult/i.test(s.stage ?? '')) { fails.push({ id, field: m, ...base, why: 'a breeding or juvenile figure' }); continue; }
    if (s.credibility === 'low') { fails.push({ id, field: m, ...base, why: 'low-credibility page (sets no line, MX rule)' }); continue; }
    if (m === 'volume') { const v = /^l/i.test(s.unit) ? +s.value : +s.value * 3.785; add(id, 'volume', { ...base, v: Math.round(v * 10) / 10 }); continue; }
    if (m === 'footprint' && Array.isArray(s.value)) add(id, 'geometry', { ...base, L: toMm(+s.value[0], s.unit), W: toMm(+s.value[1], s.unit), from: 'tank-min' });
    else if (m === 'length') add(id, 'geometry', { ...base, L: toMm(+s.value, s.unit), from: 'tank-min' });
    else if (m === 'tank_height') add(id, 'height', { ...base, H: toMm(+s.value, s.unit), from: 'tank-min' });
    else fails.push({ id, field: m, ...base, why: `value not usable (${JSON.stringify(s.value)} ${s.unit})` });
  }
}

// ---- combining ------------------------------------------------------------------------------------------------------------------
/** one site counts once: its claims fold into one (the median of its values, its largest weight) */
function perSite(cs, val) {
  const by = new Map();
  for (const c of cs) by.set(c.host, [...(by.get(c.host) ?? []), c]);
  return [...by.values()].map(g => { const vs = g.map(val).sort((a, b) => a - b); return { ...g[0], val: vs[Math.floor((vs.length - 1) / 2)], w: Math.max(...g.map(c => c.w)), pages: g }; }).filter(c => c.w > 0);
}
function wmedian(xs) {
  const s = [...xs].sort((a, b) => a.val - b.val), tot = s.reduce((a, c) => a + c.w, 0);
  let acc = 0;
  for (let i = 0; i < s.length; i++) {
    acc += s[i].w;
    if (Math.abs(acc - tot / 2) < 1e-9 && i + 1 < s.length) return (s[i].val + s[i + 1].val) / 2;
    if (acc > tot / 2) return s[i].val;
  }
  return s[s.length - 1]?.val;
}
/** floor / comfort: 'rec' claims are comfort; the min claims split at their widest gap when more than TIER_SPLIT apart */
function tiers(sites) {
  const mins = sites.filter(c => c.kind !== 'rec').sort((a, b) => a.val - b.val), recs = sites.filter(c => c.kind === 'rec');
  let floor = mins, comfort = [...recs];
  if (mins.length > 1 && mins[mins.length - 1].val > mins[0].val * TIER_SPLIT) {
    let cut = 1, gap = 0;
    for (let i = 1; i < mins.length; i++) { const r = mins[i].val / mins[i - 1].val; if (r > gap) { gap = r; cut = i; } }
    floor = mins.slice(0, cut); comfort = [...comfort, ...mins.slice(cut)];
  }
  const f = floor.length ? wmedian(floor) : undefined, c = comfort.length ? wmedian(comfort) : undefined;
  return { floor: f, comfort: c != null && (f == null || c > f * 1.05) ? c : undefined, floorSites: floor, comfortSites: comfort };
}
const r1 = x => Math.round(x * 10) / 10;
const differs = (a, b) => a == null || b == null ? a !== b : Math.abs(a - b) > SAME * Math.max(Math.abs(a), Math.abs(b), 1e-9) && Math.abs(a - b) >= 0.05;

const rows = [];
const fmtSites = xs => xs.map(c => `${c.site ?? c.host} ${fmtVal(c.val ?? c.votes)}${c.kind === 'rec' ? ' rec' : ''} (w ${c.w}${c.generic ? ', generic' : ''})`).join('; ');
let fmtVal = v => Array.isArray(v) ? v.join('/') : typeof v === 'number' ? String(r1(v)) : String(v);
const status = n => n >= 2 ? 'derived' : 'researched (one source)';
for (const [key, cs] of Object.entries(claims)) {
  const [id, field] = key.split('|');
  if (field === 'care' || field === 'temper') {
    const sites = perSite(cs.map(c => ({ ...c, n: c.votes.reduce((a, b) => a + b, 0) / c.votes.length })), c => c.n);
    const tally = new Map();
    for (const s of sites) for (const v of s.pages[0].votes) tally.set(v, (tally.get(v) ?? 0) + s.w / s.pages[0].votes.length);
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const tie = sorted.length > 1 && Math.abs(sorted[0][1] - sorted[1][1]) < 1e-9;
    const ours = oursOf(id, field), win = tie ? undefined : sorted[0][0];
    rows.push({ id, field, ours, combined: win, tie, n: sites.length, spread: sorted.map(([v, w]) => `${v}: ${r1(w)}`).join(', '),
      sites: sites.map(s => ({ site: s.site, host: s.host, w: s.w, generic: s.generic, val: s.pages[0].votes.join('/'), url: s.url, states: s.states, batch: s.batch })),
      change: !tie && win !== ours });
    continue;
  }
  if (['ph', 'temp', 'tol', 'air.rh', 'air.warm'].includes(field)) {
    const lo = perSite(cs.filter(c => c.v[0] != null), c => c.v[0]), hi = perSite(cs.filter(c => c.v[1] != null), c => c.v[1]), ours = oursOf(id, field);
    // an end no page states stays ours
    const comb = [lo.length ? r1(wmedian(lo)) : ours?.[0], hi.length ? r1(wmedian(hi)) : ours?.[1]];
    const tol = field === 'ph' ? 0.3 : field.startsWith('air.rh') ? 3 : 0.5, far = (a, b) => a == null || b == null ? a !== b : Math.abs(a - b) >= tol;
    const sites = perSite(cs, c => c.v[0] ?? c.v[1]);
    rows.push({ id, field, ours, combined: comb, n: sites.length, spread: '',
      sites: sites.map(c => ({ site: c.site, host: c.host, w: c.w, generic: c.generic, val: `${c.pages[0].v[0] ?? ''}-${c.pages[0].v[1] ?? ''}`, url: c.url, states: c.states, batch: c.batch })),
      change: comb[0] > comb[1] ? false : !ours || far(comb[0], ours[0]) || far(comb[1], ours[1]) });
    continue;
  }
  if (field === 'volume' || field === 'geometry' || field === 'height') continue;
  const sites = perSite(cs, c => c.v), comb = r1(wmedian(sites)), ours = oursOf(id, field);
  const vals = sites.map(c => c.val);
  rows.push({ id, field, ours, combined: field === 'tl' || field === 'female.tl' ? Math.round(comb) : comb, n: sites.length,
    spread: vals.length > 1 ? `${Math.min(...vals)}-${Math.max(...vals)}` : '',
    sites: sites.map(c => ({ site: c.site, host: c.host, w: c.w, generic: c.generic, val: c.val, url: c.url, states: c.states, batch: c.batch })), change: differs(comb, ours) });
}
// Tank sizes. The tiers are decided across units (design point 4: danio, Fishkeeping World 10 gal = floor, Seriously Fish base 90 x 30 cm,
// about 81 L = comfort): each site's litres (its volume claims) put the site in the floor or the comfort tier, and the site's footprint and
// height go with it. A site with geometry but no litres joins by its own wording (min = floor, recommended = comfort). Then each measure
// combines on its own: floor volume = CARE.minL; comfort volume (else the floor one) = the advisory tankmin vol; floor geometry = the red line,
// comfort geometry = the green line. A gallon figure never sets a length: a floor tier with litres only has no red geometry of its own.
// Geometry comes from the tank-minimum batches M1-M9 only (their kind / credibility marks; the care batches' bases are the same pages).
// Aquatic invertebrates have no lines (Decision 3: clearance only); the crested harlequin is the crested gecko (same species, MM).
const ids = new Set(Object.keys(claims).map(k => k.split('|')[0]));
const tankRows = [];
const L_GAL = 3.785;
const siteList = xs => xs.map(c => ({ site: c.site, host: c.host, w: c.w, generic: c.generic, val: c.val, kind: c.kind, url: c.url, states: c.states, batch: c.batch }));
const lineFree = id => /^(fw|sw)-invert$/.test(SPECIES[id]?.cat ?? '');
const tankOut = {};
for (const id of new Set([...ids, ...Object.keys(TANKMIN)])) {
  const src = id === 'crestedharlequin' ? 'crestedgecko' : id;
  const vol = claims[src + '|volume'] ?? [], geo = claims[src + '|geometry'] ?? [], hgt = claims[src + '|height'] ?? [], tm = TANKMIN[id];
  const t = tiers(perSite(vol.filter(c => c.kind !== 'rec'), c => c.v));
  const recVol = perSite(vol.filter(c => c.kind === 'rec'), c => c.v);
  const floorHosts = new Set(t.floorSites.map(c => c.host)), comfortHosts = new Set(t.comfortSites.map(c => c.host));
  const tierOf = c => c.kind === 'rec' || comfortHosts.has(c.host) ? 'comfort' : 'floor';
  const comfortVol = [...t.comfortSites, ...recVol.filter(c => !floorHosts.has(c.host))];
  const fV = t.floorSites.length ? Math.round(wmedian(t.floorSites)) : undefined, cV = comfortVol.length ? Math.round(wmedian(comfortVol)) : undefined;
  const all = [...t.floorSites, ...comfortVol];
  const out = tankOut[id] = { minL: fV, volGal: cV != null && (fV == null || cV > fV * 1.05) ? r1(cV / L_GAL) : fV != null ? r1(fV / L_GAL) : undefined };
  if (vol.length) {
    const minL = CARE[id]?.minL;
    tankRows.push({ id, field: 'minL (floor, L)', ours: minL, combined: fV, n: t.floorSites.length, sites: siteList(t.floorSites),
      spread: all.length > 1 ? r1(Math.min(...all.map(x => x.val)) / L_GAL) + '-' + r1(Math.max(...all.map(x => x.val)) / L_GAL) + ' gal' : '', change: fV != null && differs(fV, minL), target: 'CARE.minL' });
    if (tm && !lineFree(id)) tankRows.push({ id, field: 'vol (' + (out.volGal !== r1((fV ?? NaN) / L_GAL) ? 'comfort' : 'one tier') + ', gal)', ours: tm.vol?.gal, combined: out.volGal,
      n: (out.volGal !== r1((fV ?? NaN) / L_GAL) ? comfortVol : t.floorSites).length, sites: siteList(out.volGal !== r1((fV ?? NaN) / L_GAL) ? comfortVol : t.floorSites), spread: '',
      change: out.volGal != null && differs(out.volGal, tm.vol?.gal), target: 'tankmin.vol' });
  }
  if (lineFree(id) || !tm) continue;
  // geometry and height: by the site's tier
  for (const [m, pool, val, oursR, oursG, tr, tg] of [
    ['L', geo, c => c.L, tm.red?.L, tm.green?.L, 'red.L', 'green.L'], ['W', geo, c => c.W, tm.red?.W, tm.green?.W, 'red.W', 'green.W'],
    ['H', hgt, c => c.H, tm.hRed?.H, tm.hGreen?.H, 'hRed.H', 'hGreen.H']]) {
    const ps = pool.filter(c => val(c) > 0);
    if (!ps.length && oursR == null && oursG == null) continue;
    const fl = perSite(ps.filter(c => tierOf(c) === 'floor'), val), co = perSite(ps.filter(c => tierOf(c) === 'comfort'), val);
    const f = fl.length ? Math.round(wmedian(fl)) : undefined, c0 = co.length ? Math.round(wmedian(co)) : undefined;
    // Three rules keep what the pages do not speak to (they never remove a line):
    //  - a tier with no claim leaves that line as it is;
    //  - a red line derived from a gallon figure (MM, MX2: the lower of the stated geometry and the gallon figure's tank) stays when the
    //    pages' floor is longer: a gallon figure never sets a length, but it may keep the lower bar it already set (Nathan to confirm);
    //  - a green line is only a green line above the red one.
    const redMark = m === 'H' ? tm.hRed?.mark : tm.red?.mark;
    // a line is one object: its width follows its length (a kept red length keeps its width; no green length, no green width)
    const keepDerived = redMark === 'derived (est)' && oursR != null && (m === 'W' ? out.keptRed : f == null || f > oursR);
    let red = f == null || keepDerived || (m === 'W' && out.keptRed) ? oursR : f;
    if (m === 'L') out.keptRed = red === oursR;
    let c = c0 != null && (red == null || c0 > red * 1.05) ? c0 : undefined;
    if (m === 'L') out.newGreen = c != null;
    if (m === 'W' && !out.newGreen) c = undefined;
    out[tr] = red; out[tg] = c ?? oursG;
    tankRows.push({ id, field: tr + ' (floor, mm)', ours: oursR, oursMark: redMark, combined: red, pages: f, n: fl.length, sites: siteList(fl), spread: '',
      change: differs(red, oursR), target: 'tankmin.' + tr, ...(keepDerived ? { fromGallons: true } : {}) });
    tankRows.push({ id, field: tg + ' (comfort, mm)', ours: oursG, combined: c ?? oursG, n: co.length, sites: siteList(co), spread: '', change: c != null && differs(c, oursG), target: 'tankmin.' + tg });
  }
}


// ---- the open disagreements of decisions.md R3 / R4 -------------------------------------------------------------------------------
const OPEN = [['harlequin', 'minL (floor, L)'], ['syno', 'minL (floor, L)'], ['mandarin', 'max'], ['discus', 'temp'], ['comet', 'temp'], ['comet', 'tol'], ['axolotl', 'temp']];

// ---- output ---------------------------------------------------------------------------------------------------------------------
const all = [...rows, ...tankRows];
const changed = all.filter(r => r.change);
const IN = 25.4;
const us = (r, v) => {
  if (v == null) return '-';
  if (Array.isArray(v)) return /temp|tol|warm/.test(r.field) ? `${v.map(x => Math.round(x * 1.8 + 32)).join('-')} F [${v.join('-')} C]` : v.join('-');
  if (/\(.*mm\)/.test(r.field) || r.field === 'tl' || r.field === 'female.tl') return `${r1(v / IN)} in [${Math.round(v)} mm]`;
  if (/, L\)/.test(r.field)) return `${r1(v / L_GAL)} gal [${Math.round(v)} L]`;
  return String(v);
};
const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const move = r => typeof r.ours === 'number' && typeof r.combined === 'number' && r.ours ? `${r.combined > r.ours ? '+' : ''}${Math.round((r.combined / r.ours - 1) * 100)} %` : '';
const srcCell = r => cell(r.sites.map(s => `${s.site} ${typeof s.val === 'number' ? (/mm|tl/.test(r.field) ? `${r1(s.val / IN)} in` : /, L\)/.test(r.field) ? `${r1(s.val / L_GAL)} gal` : /gal\)/.test(r.field) ? `${r1(s.val / L_GAL)} gal` : s.val) : s.val}${s.kind === 'rec' ? ' rec' : ''} (w ${s.w}${s.generic ? ' generic' : ''})`).join('; '));
const order = r => (OPEN.some(([i, f]) => i === r.id && f === r.field) ? 0 : 1);
const sorted = changed.filter(r => !r.fromGallons).sort((a, b) => order(a) - order(b) || a.field.localeCompare(b.field) || a.id.localeCompare(b.id));
const fromGal = all.filter(r => r.fromGallons);
const md = [
  '# Combined sources: proposed changes', '',
  `Generated by \`node scripts/source-combine.mjs\` (lane CB, ${new Date().toISOString().slice(0, 10)}). Weights: ${Object.entries(WEIGHTS).map(([k, w]) => `${k} ${w}`).join(', ')} (consensus = care sheets); a generic or genus-wide page x ${GENERIC}; one site counts once; only re-fetched quotes (exact / compact) count. Numbers: weighted median (ranges end by end); words: weighted vote. Tank sizes: claims more than ${TIER_SPLIT}x apart split into a floor (red) and a comfort (green) tier. A result within ${SAME * 100} % of ours counts as the same. Status after applying: 2+ sites = derived (cites every page), one site = researched (one source). Units: US first, metric in brackets.`, '',
  `Claims: ${Object.values(claims).flat().length} from ${new Set(Object.values(claims).flat().map(c => c.host)).size} sites; fields compared ${all.length}; **changes ${sorted.length}**; parse failures ${fails.length}.`, '',
  '## Summary', '', ...Object.entries(sorted.reduce((a, r) => (a[r.field.split(' (')[0]] = (a[r.field.split(' (')[0]] ?? 0) + 1, a), {})).map(([k, v]) => `- ${k}: ${v}`),
  '', `Against an earlier decision (column "earlier decision"): ${sorted.filter(r => DECIDED[`${r.id}|${r.field}`]?.startsWith('kept')).map(r => `${r.id} ${r.field.split(' (')[0]}`).join(', ')}.`, '',
  '## Changes', '', '`*` = one of the 7 open disagreements in decisions.md (R3 / R4).', '',
  '| species | field | ours | combined | move | sites | status | pages (value, weight) | earlier decision |', '|---|---|---|---|---|---|---|---|---|',
  ...sorted.map(r => `| ${r.id}${order(r) === 0 ? ' *' : ''} | ${r.field} | ${cell(us(r, r.ours))}${r.oursMark ? ` (${r.oursMark})` : ''} | **${cell(r.tie ? 'tie, no change' : us(r, r.combined))}** | ${move(r)} | ${r.n} | ${r.n ? status(r.n) : ''} | ${srcCell(r)} | ${cell(DECIDED[`${r.id}|${r.field}`] ?? (/^tankmin\.(vol|red\.)/.test(r.target ?? '') ? 'kept: tank sizes follow the MX rule, lowest well-supported (Nathan 2026-10-21)' : ''))} |`),
  '', `## Red lines kept from a gallon figure (${fromGal.filter(r => r.field.startsWith('red.L')).length} species)`, '',
  'Design point 1: a gallon figure never sets a length. MM (MX1 / MX2, decided) made the red line the LOWER of a stated geometry and the catalogue tank a gallon figure implies (derived, est), and Decision 2 keeps volume from gating the Fullness tile. Dropping these lines would leave a species with no red line where its pages give gallons only, or raise the red line to one page’s footprint (danio 20 -> 35.5 in, the jump Nathan questioned in MX2). **Proposed: keep these derived (est) red lines as they are (the table above already assumes so). Question for Nathan: keep, or drop them?**', '',
  '| species | red line now (derived, est) | the pages’ floor geometry | from |', '|---|---|---|---|',
  ...fromGal.filter(r => r.field.startsWith('red.L')).map(r => `| ${r.id} | ${r1(r.ours / IN)} in [${r.ours} mm] | ${r.pages != null ? `${r1(r.pages / IN)} in (${cell(r.sites.map(x => x.site).join(', '))})` : 'none (gallons only)'} | ${cell(TANKMIN[r.id]?.red?.site)}: ${cell(TANKMIN[r.id]?.red?.states)} |`),
  '', `## Parse failures and excluded claims (${fails.length})`, '', 'Listed, not guessed.', '',
  '| species | field | site | states | why |', '|---|---|---|---|---|',
  ...fails.map(f => `| ${f.id} | ${f.field} | ${cell(f.site)} | ${cell(f.states)} | ${f.why} |`),
  '', `## Not combined`, '', ...Object.entries(SKIP).map(([k, v]) => `- ${k}: ${v}`),
  ...(unknownSites.size ? ['', `Unregistered sites (weight 0): ${[...unknownSites].join(', ')}`] : []), '',
];
writeFileSync(`${DIR}/combined.md`, md.join('\n'));
writeFileSync(`${DIR}/combine/proposal.json`, JSON.stringify({ generated: 'scripts/source-combine.mjs', weights: { ...WEIGHTS, generic: GENERIC, tierSplit: TIER_SPLIT, same: SAME }, rows: all, fails }, null, 1));
const by = {};
for (const r of sorted) by[r.field] = (by[r.field] ?? 0) + 1;
console.log(`claims ${Object.values(claims).flat().length}, compared ${all.length}, changes ${sorted.length} (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}), gallon-only red lines ${fromGal.length}, parse failures ${fails.length}, unregistered ${[...unknownSites].join(' ') || 'none'}`);
for (const [i, f] of OPEN) { const r = all.find(x => x.id === i && x.field === f); console.log(`open ${i}.${f}: ours ${JSON.stringify(r?.ours)} -> ${JSON.stringify(r?.combined)} (${r?.n} sites)`); }
