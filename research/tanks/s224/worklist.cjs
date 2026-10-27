// Dims reasonableness check vs the advertised gallons, and the dig worklist. node worklist.cjs <notesDir>
// Outer box volume over the rating: a glass tank's outside holds about 1.0-1.35x its rated gallons (glass, the rim, the water
// line below the top). Outside 0.85-1.5 = suspect (box size, with hood / cabinet, axes swapped, wrong size pasted).
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => /^(retailer|maker)-.*\.json$/.test(f));
const NONRECT = /\b(bow ?front|bowfront|hex|hexagon|pentagon|corner|cylinder|round|bowl|curved|column|sphere|globe|tube|panoramic|flat back)\b/i;
const out = [], stats = {};
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
  if (r.discontinued || !r.url || r.material === 'plastic' || NONRECT.test(r.line ?? '') || (/biorb/i.test(r.brand) && !/cube/i.test(r.line ?? ''))) continue;
  const has = r.L_in > 0 && r.D_in > 0 && r.H_in > 0, gal = r.gal_rated;
  const ratio = has && gal ? (r.L_in * r.D_in * r.H_in / 231) / gal : null;
  let why = null;
  if (!has) why = 'no dims';
  else if (!gal) why = 'no rated gallons';
  else if (ratio < 0.85 || ratio > 1.5) why = `outer volume ${ratio.toFixed(2)}x the rating`;
  else if (/^(box|with)/i.test(r.dims_basis ?? '') || /^estimate/i.test(r.dims_basis ?? '')) why = `dims basis: ${r.dims_basis}`;
  const k = `${f.replace(/\.json$/, '')} ${why ? 'dig' : 'ok'}`; stats[k] = (stats[k] ?? 0) + 1;
  if (why) out.push({ file: f, retailer: r.retailer, brand: r.brand, line: r.line, gal_rated: gal ?? null, listed: has ? [r.L_in, r.D_in, r.H_in] : null, why, url: r.url, sku: r.sku ?? null });
}
fs.writeFileSync(path.join(dir, 'dims-worklist.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(stats), 'worklist', out.length);
