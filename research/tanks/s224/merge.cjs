// Merge the retailer / maker research (side-session notes) into src/data/tanks.json (S224, 2026-10-26).
//   node merge.cjs <tanks.json> <notesDir> [--write]     dry run prints the summary; --write rewrites tanks.json
// Decisions (Nathan 2026-10-26): every product with real dims goes in; sizes with no generic entry get a product-named base (library
// preload, never an engine pick); acrylic included and marked; dims checked against the rated gallons, rows the dig could not size
// are left out (listed in merge-report.json); prices keep price_usd / regular_usd / checked (a stale sale reads the list price).
const fs = require('fs'), path = require('path');
const [tanksPath, dir] = process.argv.slice(2), WRITE = process.argv.includes('--write');
const IN = 25.4, TOL = 0.15, DAY = '2026-10-26';
const raw = fs.readFileSync(tanksPath, 'utf8'), crlf = raw.includes('\r\n'), J = JSON.parse(raw);
const files = fs.readdirSync(dir).filter(f => /^(retailer|maker)-.*\.json$/.test(f));
const norm = s => String(s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9.]+/g, ' ').trim();
const brandOf = b => norm(b).replace(/\b(aquatics?|aquariums?|inc|llc|\(petco\)|petco)\b/g, '').replace(/\s+/g, ' ').trim();
// the dig's dims, by url + brand + line (category and lineup pages hold many products under one url)
const fixes = new Map(), fixKey = r => `${r.url}|${brandOf(r.brand)}|${norm(r.line)}`;
for (const f of fs.readdirSync(dir).filter(f => /^dims-.*\.json$/.test(f) && f !== 'dims-worklist.json'))
  for (const d of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) if (d.url && d.L_in > 0 && d.D_in > 0 && d.H_in > 0) fixes.set(fixKey(d), d);
const NONRECT = /\b(bow ?front|bowfront|hex|hexagon|pentagon|corner|cylinder|round|bowl|curved|column|sphere|globe|tube|panoramic|flat back|half ?moon|aquasphere|360)\b/i;
const COLORS = /\b(black|white|silver|grey|gray|blue|pink|purple|green|red|clear|matte|frosted|oak|walnut|espresso|cherry)\b/g;
const R = { galCheck: [], nodims: [], nonrect: [], other: [], discontinued: [], priceUpdates: [], added: [], newBases: [], resized: [], ratedInName: [] };
const conf = { high: 3, medium: 2, low: 1 };

// rows, with the dig's dims applied
const rows = [];
for (const f of files) for (const r0 of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
  const r = { ...r0, _file: f }, fx = r.url && fixes.get(fixKey(r));
  if (fx) Object.assign(r, { L_in: fx.L_in, D_in: fx.D_in, H_in: fx.H_in, dims_basis: fx.dims_basis, confidence: fx.confidence, _dug: fx.found_in });
  rows.push(r);
}
// the library, to find what is already there
const lib = [];
for (const m of J.tanks) for (const v of m.variants ?? []) lib.push({ m, v });
const bare = u => String(u ?? '').replace(/[?#].*$/, '').replace(/\/$/, '');
const near = (x, r) => !(r.L_in > 0) || ['L_in', 'D_in', 'H_in'].every(k => Math.abs(x.v[k] / r[k] - 1) <= 0.03);
const findLib = r => lib.find(x => r.url && x.v.url && bare(x.v.url) === bare(r.url) && near(x, r))
  ?? lib.find(x => brandOf(x.v.brand) === brandOf(r.brand) && norm(x.v.line) === norm(r.line) && near(x, r))
  ?? (r.in_library ? lib.find(x => brandOf(x.v.brand) === brandOf(r.brand) && norm(r.in_library).includes(norm(x.v.line)) && near(x, r)) : undefined);

// 1. discontinued flags
for (const r of rows.filter(r => r.discontinued)) {
  const x = findLib(r);
  if (x && !x.v.discontinued) { x.v.discontinued = true; x.v.price_note = `${x.v.price_note ? x.v.price_note + '; ' : ''}no longer sold (${r.retailer ?? 'maker'} checked ${DAY})`; R.discontinued.push(`${x.m.id}: ${x.v.brand} ${x.v.line}`); }
}
// 2. group live rows into products: brand + dims to 0.5 in + kit or bare + the line without gallons / colours / brackets
const groups = new Map();
for (const r of rows) {
  if (r.discontinued) continue;
  if (!(r.L_in > 0 && r.D_in > 0 && r.H_in > 0)) { R.nodims.push(`${r._file} | ${r.brand} | ${r.line} | ${r.url}`); continue; }
  if (r.material === 'plastic') { R.other.push(`plastic: ${r.brand} | ${r.line}`); continue; }
  if (NONRECT.test(r.line ?? '') || (/biorb/i.test(r.brand) && !/cube/i.test(r.line ?? ''))) { R.nonrect.push(`${r.brand} | ${r.line} | ${r.L_in} x ${r.D_in} x ${r.H_in} | ${r.url}`); continue; }
  if ((r.H_in > 30 && r.H_in > 1.4 * r.L_in) || (/stand|cabinet/i.test(r.line ?? '') && r.H_in > 36)) { R.other.push(`height with the cabinet: ${r.brand} | ${r.line} | ${r.H_in} in`); continue; }
  const ratio = r.gal_rated ? r.L_in * r.D_in * r.H_in / 231 / r.gal_rated : 1;
  if ((ratio < 0.85 || ratio > 1.5) && !(r.confidence === 'high' && (r.dims_basis ?? 'tank') === 'tank' && ratio >= 0.6 && ratio <= 2)) { R.galCheck.push(`${r._file} | ${r.brand} | ${r.line} | ${r.L_in} x ${r.D_in} x ${r.H_in} = ${ratio.toFixed(2)}x ${r.gal_rated} gal | ${r.url}`); continue; }
  const q = x => Math.round(x * 2) / 2, kit = r.price_kind === 'kit' || (r.includes ?? []).length > 0;
  const stem = norm(String(r.line ?? '').replace(/\([^)]*\)/g, '')).replace(/\b\d+(\.\d+)? ?(gal|gallons?|g)\b/g, '').replace(COLORS, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
  const k = [brandOf(r.brand), q(r.L_in), q(r.D_in), q(r.H_in), kit ? 'kit' : 'bare', stem].join('|');
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push({ ...r, _kit: kit });
}
// 3. place each product
const glassFor = Hin => (Hin <= 13 ? 5 : Hin <= 17 ? 6 : Hin <= 21 ? 8 : Hin <= 25 ? 10 : Hin <= 30 ? 12 : 15); // physics.glassThickness on the height
const framedGlass = Hin => (Hin <= 17 ? 5 : Hin <= 22 ? 6 : Hin <= 25 ? 8 : Hin <= 30 ? 10 : 12); // the catalogue's framed sizes (g20h 5, g29 / g55 6, g37 8)
const bandOf = g => (g < 15 ? 'nano' : g < 40 ? 'small' : g < 75 ? 'mid' : g < 125 ? 'large' : 'monster');
const interiorGal = (o, g) => (o.L - 2 * g) * (o.D - 2 * g) * (o.H - g) / 3785411.784;
const rel = (a, b) => Math.abs(a / b - 1);
const rectBases = () => J.tanks.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect');
const placeOf = d => {
  let best, bestE = Infinity;
  for (const m of rectBases()) {
    const e = [rel(d.L_in, m.outer.L / IN), rel(d.D_in, m.outer.D / IN), rel(d.H_in, m.outer.H / IN)];
    if (Math.max(...e) > TOL) continue;
    const s = e[0] + e[1] + e[2] + (d.gal_rated ? rel(d.gal_rated, m.ratedGal) : 0);
    if (s < bestE) { bestE = s; best = m; }
  }
  return best;
};
const ids = new Set(J.tanks.map(m => m.id));
const slug = s => norm(s).replace(/\b(aquarium|tank|kit|system|complete|reef|gallons?|gal)\b/g, ' ').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28);
const money = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
let updated = 0, kept = 0;
for (const rs of groups.values()) {
  // dims from the best-sized row (confidence, then a tank-only basis, then the maker), price from the cheapest live offer
  const dimsRow = [...rs].sort((a, b) => (conf[b.confidence] ?? 0) - (conf[a.confidence] ?? 0) || (b.dims_basis === 'tank') - (a.dims_basis === 'tank') || (b._file.startsWith('maker')) - (a._file.startsWith('maker')))[0];
  const offers = rs.filter(r => r.price_usd > 0 && r.price_kind !== 'msrp').sort((a, b) => a.price_usd - b.price_usd);
  const p = offers[0] ?? rs.find(r => r.price_usd > 0) ?? dimsRow;
  const hit = rs.map(findLib).find(Boolean);
  if (hit) { // already listed: refresh its price when the same retailer shows another one
    const same = offers.find(r => (r.retailer ?? '') === (hit.v.retailer ?? '') || (r.url && bare(r.url) === bare(hit.v.url)));
    if (same && (same.price_usd !== hit.v.price_usd || (same.regular_usd ?? undefined) !== hit.v.regular_usd)) {
      R.priceUpdates.push(`${hit.m.id}: ${hit.v.brand} ${hit.v.line}: ${hit.v.price_usd ?? '-'}${hit.v.regular_usd ? ' reg ' + hit.v.regular_usd : ''} -> ${same.price_usd}${same.regular_usd ? ' reg ' + same.regular_usd : ''} (${same.retailer})`);
      hit.v.price_usd = same.price_usd;
      if (same.regular_usd > same.price_usd) hit.v.regular_usd = same.regular_usd; else delete hit.v.regular_usd;
      hit.v.checked = DAY; hit.v.retailer ??= same.retailer;
      hit.v.price_note = `${same.retailer} ${money(same.price_usd)}${same.regular_usd > same.price_usd ? ', regular ' + money(same.regular_usd) : ''}; page read ${DAY}`;
      updated++;
    } else kept++;
    continue;
  }
  const acrylic = rs.some(r => r.material === 'acrylic'), gal = dimsRow.gal_rated ?? p.gal_rated;
  // the line without the brand repeated in front ("MarineLand Marineland Portrait 5" -> "Portrait 5")
  const own = (b, l) => { const s = String(l ?? '').trim(), w = String(b).split(' ')[0].toLowerCase(); return s.toLowerCase().startsWith(w + ' ') ? s.slice(w.length + 1) : s; };
  let line = own(p.brand, p.line ?? dimsRow.line);
  if (gal && !/\d+(\.\d+)? ?(gal|gallon)/i.test(line)) line += ` (${gal} gal)`;
  if (acrylic && !/acrylic/i.test(line)) line += ' (acrylic)';
  const others = offers.slice(1).filter(o => o.retailer !== p.retailer).map(o => `${o.retailer} ${money(o.price_usd)}`);
  const kind = p.price_kind === 'msrp' ? 'msrp' : rs.some(r => r._kit) ? 'kit' : 'street';
  const note = [
    `${p.retailer ?? p.brand} ${kind === 'kit' ? 'kit ' : kind === 'msrp' ? 'list ' : ''}${money(p.price_usd ?? 0)}${p.regular_usd > p.price_usd ? ', regular ' + money(p.regular_usd) : ''}; page read ${DAY}`,
    p.sku ? `SKU ${p.sku}` : '', (p.includes ?? []).length ? (p.includes).join(', ') : '',
    dimsRow.dims_basis && dimsRow.dims_basis !== 'tank' ? `dims: ${dimsRow.dims_basis}` : dimsRow._dug && dimsRow._dug !== 'specifications' ? `dims from the ${dimsRow._dug}` : '',
    others.length ? `also ${others.join(', ')}` : '', (dimsRow.notes ?? '').slice(0, 160),
  ].filter(Boolean).join('; ');
  const v = { brand: p.brand, line, L_in: dimsRow.L_in, D_in: dimsRow.D_in, H_in: dimsRow.H_in, ...(dimsRow.glass_mm ? { glass_mm: dimsRow.glass_mm } : {}),
    ...(rs.some(r => r.rimless) ? { rimless: true } : {}), ...(p.price_usd > 0 ? { price_usd: p.price_usd } : {}), price_kind: kind,
    ...(p.regular_usd > p.price_usd ? { regular_usd: p.regular_usd } : {}), ...(p.sale_ends ? { sale_ends: p.sale_ends } : {}),
    retailer: p.retailer ?? p.brand, price_note: note, url: p.url ?? dimsRow.url, checked: DAY, confidence: dimsRow.confidence ?? 'low' };
  let m = placeOf({ ...dimsRow, gal_rated: gal });
  if (!m) { // a size of its own: a product-named base (library preload, never an engine pick)
    const o = { L: +(dimsRow.L_in * IN).toFixed(1), H: +(dimsRow.H_in * IN).toFixed(1), D: +(dimsRow.D_in * IN).toFixed(1) };
    const g = dimsRow.glass_mm ?? (v.rimless ? glassFor(dimsRow.H_in) : framedGlass(dimsRow.H_in)), inside = interiorGal(o, g);
    let rated = gal ?? +inside.toFixed(1), name = `${p.brand} ${own(p.brand, p.line).replace(/\([^)]*\)/g, '').replace(/\s+-\s+.*$/, '').replace(/\s+/g, ' ').trim()}`.slice(0, 64);
    if (/^[\d.]+ (gal|ft)/.test(name)) name = 'Model ' + name;
    if (Math.abs(inside / rated - 1) > 0.08) { R.ratedInName.push(`${name}: rated ${rated}, ${inside.toFixed(1)} inside`); name = `${name} (${inside.toFixed(1)} gal inside, rated ${rated})`; rated = +inside.toFixed(1); }
    let id = 'n_' + slug(`${brandOf(p.brand)} ${p.line ?? ''}`) || 'n_tank'; while (ids.has(id)) id += '_';
    ids.add(id);
    const cube = Math.max(rel(dimsRow.L_in, dimsRow.D_in), rel(dimsRow.L_in, dimsRow.H_in)) < 0.06;
    m = { id, name, ratedGal: rated, shape: 'rect', outer: o, glassMm: g, ...(v.rimless ? { rimless: true } : {}), band: bandOf(rated), ...(cube ? { tags: ['cube'] } : {}),
      source: v.url, ...(dimsRow.confidence === 'low' ? { est: ['L', 'D', 'H'] } : {}),
      note: `${p.brand} ${p.line}, ${dimsRow.L_in} x ${dimsRow.D_in} x ${dimsRow.H_in} in (${v.retailer} listing, ${DAY}). Library preload only, not an engine pick (Nathan 2026-10-26).`, variants: [] };
    J.tanks.push(m); R.newBases.push(`${id}: ${name} ${dimsRow.L_in} x ${dimsRow.D_in} x ${dimsRow.H_in}`);
  }
  (m.variants ??= []).push(v); R.added.push(`${m.id}: ${v.brand} | ${v.line} | ${v.L_in} x ${v.D_in} x ${v.H_in} | ${v.confidence}`);
}
// 4. Nathan's 10-20 rule: an estimated generic size takes the first checked bare glass tank listed at it
for (const m of J.tanks) {
  if (!/^estimate/.test(m.source)) continue;
  const v = (m.variants ?? []).find(v => v.confidence === 'high' && v.price_kind !== 'kit' && !v.discontinued && !/acrylic/i.test(`${v.line ?? ''} ${v.price_note ?? ''}`));
  if (!v) continue;
  const was = `${(m.outer.L / IN).toFixed(2)} x ${(m.outer.D / IN).toFixed(2)} x ${(m.outer.H / IN).toFixed(2)}`;
  m.outer = { L: +(v.L_in * IN).toFixed(1), H: +(v.H_in * IN).toFixed(1), D: +(v.D_in * IN).toFixed(1) };
  m.source = v.url; m.note = `${v.brand} ${v.line}, ${v.L_in} x ${v.D_in} x ${v.H_in} in (${v.retailer} listing, ${DAY}); was an estimate of ${was} in.`;
  R.resized.push(`${m.id} ${m.name}: ${was} -> ${v.L_in} x ${v.D_in} x ${v.H_in} (${v.brand} ${v.line})`);
}
console.log(`rows ${rows.length} (${fixes.size} dims from the dig), products ${groups.size}: already listed ${updated + kept} (${updated} price updates), added ${R.added.length} variants, new bases ${R.newBases.length}, rated in name ${R.ratedInName.length}; resized estimates ${R.resized.length}; discontinued ${R.discontinued.length}; left out: gallons check ${R.galCheck.length}, no dims ${R.nodims.length}, curved / round ${R.nonrect.length}, other ${R.other.length}`);
fs.writeFileSync(path.join(dir, 'merge-report.json'), JSON.stringify(R, null, 1));
if (WRITE) { let out = JSON.stringify(J, null, 1) + '\n'; if (crlf) out = out.replace(/\n/g, '\r\n'); fs.writeFileSync(tanksPath, out); console.log('written', J.tanks.length, 'models'); }
