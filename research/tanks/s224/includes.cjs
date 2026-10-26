// Fill TankVariant.includes (what ships in the box) from what is on disk: the S224 research rows (their `includes` token lists), the
// variant's price_note / line text, and the price kind. Absent key = unknown. Never new web research.
//   node includes.cjs <tanks.json> <gaps.json> [--write]
const fs = require('fs'), path = require('path');
const [tp, gp] = process.argv.slice(2), WRITE = process.argv.includes('--write');
const raw = fs.readFileSync(tp, 'utf8'), crlf = raw.includes('\r\n'), J = JSON.parse(raw);
const dir = __dirname, byUrl = new Map();
for (const f of fs.readdirSync(dir).filter(f => /^retailer-.*json$|^maker-lineups/.test(f))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), a = Array.isArray(j) ? j : Object.values(j).find(Array.isArray);
  for (const r of a) if (r.url) { const e = byUrl.get(r.url) ?? { inc: new Set(), txt: [] }; (r.includes ?? []).forEach(x => e.inc.add(String(x).toLowerCase())); e.txt.push(`${r.line ?? ''} ${r.notes ?? ''}`); byUrl.set(r.url, e); }
}
const vkey = v => [v.brand, v.line ?? '', `${v.L_in}x${v.D_in}x${v.H_in}`, v.retailer ?? ''].join('|');
const kitName = /\bkit\b|starter|bundle|aio\b|all-in-one|ensemble|system|combo|set\b|biorb|\bflex\b|\bspec\b|\bevo\b|fluval (chi|edge|vicenza|siena|shaker)|\bled\b.*\b(tank|aquarium)\b/i;
const stats = { full: 0, partial: 0, none: 0, lidUnknown: 0, total: 0 }, gaps = [];
const KEYS = ['lid', 'light', 'filter', 'heater', 'stand'];
for (const m of J.tanks) for (const v of m.variants ?? []) {
  if (v.kit) continue; // inherits kits.json
  stats.total++;
  const e = byUrl.get(v.url), toks = new Set(e?.inc ?? []);
  const txt = `${v.line ?? ''} ${v.price_note ?? ''} ${(e?.txt ?? []).join(' ')}`.toLowerCase();
  const inc = {};
  // positive evidence
  if (toks.has('light') || toks.has('led') || /\b(led|light|lighting)\b(?! ?(bar|ing)? ?not)/.test(`${v.line ?? ''}`.toLowerCase()) || /with (an? )?(led|light)|kit with (led|light)|hood\/light|\bled (light|lighting|hood)/.test(txt)) inc.light = true;
  if (toks.has('filter') || /\bfilter(ed|s)?\b/.test(`${v.line ?? ''}`.toLowerCase()) || /with (an? )?(power )?filter|\/filter|, filter|and filter|kit with led and filter|filter,? and/.test(txt)) inc.filter = true;
  if (toks.has('heater') || /with (an? )?heater|\bheater\b included|, heater/.test(txt)) inc.heater = true;
  if (toks.has('stand') || toks.has('cabinet') || /with (an? )?(stand|cabinet)|and stand|& stand|and cabinet|, stand|\bstand included/.test(`${v.line ?? ''} ${txt}`.toLowerCase())) inc.stand = true;
  // lid
  const noLid = /\b(no|without) (a )?(lid|hood|top|cover|canopy)|tank only|tank-only|bare tank|no hood|top-?less/.test(txt);
  if (/\bmesh (top|lid|cover)|screen (top|lid)/.test(txt)) inc.lid = 'mesh';
  else if (/glass (top|lid|cover|canopy)|with (a )?glass (top|lid)|glass top with clips|\bglass top\b/.test(txt)) inc.lid = 'glass';
  else if (toks.has('hood') || toks.has('lid') || toks.has('canopy') || /\b(full |led )?hood\b|\bcanopy\b|\bhood\/|lid and light|lid, light/.test(txt) && !noLid) inc.lid = 'hood';
  else if (noLid) inc.lid = 'none';
  // Nathan 2026-10-26: the rimless Imagitarium tanks ship with a glass top
  if (inc.lid === undefined && /imagitarium/i.test(v.brand) && /rimless|frameless|open-glass/i.test(v.line ?? '')) inc.lid = 'glass';
  // a street / msrp price is the bare tank (price_kind 'kit' = tank + gear): nothing but the glass (and any lid above) ships with it
  const bare = v.price_kind !== 'kit' && !kitName.test(`${v.line ?? ''} ${v.price_note ?? ''}`.slice(0, 160)) && toks.size === 0;
  if (bare) for (const k of ['light', 'filter', 'heater', 'stand']) if (inc[k] === undefined) inc[k] = false;
  // a kit-priced row with partial evidence: gear named is in, the rest unknown
  const have = KEYS.filter(k => inc[k] !== undefined).length;
  if (have) v.includes = Object.fromEntries(KEYS.filter(k => inc[k] !== undefined).map(k => [k, inc[k]])); else delete v.includes;
  if (have === 5) stats.full++; else if (have) stats.partial++; else stats.none++;
  if (inc.lid === undefined) stats.lidUnknown++;
  const miss = KEYS.filter(k => inc[k] === undefined);
  if (miss.length) gaps.push({ key: `${m.id}|${vkey(v)}`, maker: v.brand, retailer: v.retailer ?? null, url: v.url ?? null, unknown: miss });
}
console.log(stats);
const by = {}; for (const g of gaps) { const k = `${g.maker} @ ${g.retailer ?? '-'}`; by[k] = (by[k] ?? 0) + 1; }
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${n}  ${k}`).join('\n'));
if (WRITE) {
  let out = JSON.stringify(J, null, 1) + '\n'; if (crlf) out = out.replace(/\n/g, '\r\n'); fs.writeFileSync(tp, out);
  fs.writeFileSync(gp, JSON.stringify({ note: 'variants whose includes has unknown keys (lid unknown, or light / filter / heater / stand); feeds a follow-up research lane', count: gaps.length, gaps }, null, 1) + '\n');
}
