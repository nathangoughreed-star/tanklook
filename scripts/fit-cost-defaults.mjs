// Derive demand-defaults cost bands from the cited listings already in the repo. Plain node, no deps, prints only.
// Usage: node scripts/fit-cost-defaults.mjs [--json]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const DEF = rd('src/data/demand-defaults.json'), ITEMS = rd('src/data/demand-items.json').rows, GEAR = rd('src/data/gear-catalog.json');
const TANKS = rd('src/data/tanks.json').tanks, SPECIES = rd('src/data/species.json').species;

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const i = (s.length - 1) * p, f = Math.floor(i), c = Math.ceil(i); return s[f] + (s[c] - s[f]) * (i - f); };
const ols = (pts) => {
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  const b = sxx ? sxy / sxx : 0;
  return { b, a: my - b * mx };
};
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
/** OLS line = mode; lo/hi = 10th/90th percentile of 500 seeded bootstrap refits. */
function fit(pts) {
  const m = ols(pts), A = [], B = [];
  for (let k = 0; k < 500; k++) {
    const s = pts.map(() => pts[Math.floor(rnd() * pts.length)]);
    if (new Set(s.map((p) => p[0])).size < 2) continue;
    const r = ols(s); A.push(r.a); B.push(r.b);
  }
  return { base: { lo: q(A, 0.1), mode: m.a, hi: q(A, 0.9) }, per: { lo: q(B, 0.1), mode: m.b, hi: q(B, 0.9) }, n: pts.length };
}
const mid = (x) => (x.galMin + x.galMax) / 2;
const priced = (x) => !(x.est || []).includes('priceUsd');
const rows = [];
const add = (path, ours, d, n, method) => {
  const ratio = d && ours ? d.mode / ours.mode : NaN;
  rows.push({ path, ours, d, n, ratio, agrees: Math.abs(ratio - 1) <= 0.25, method });
};
const pctBand = (v) => ({ lo: q(v, 0.1), mode: q(v, 0.5), hi: q(v, 0.9) });

// heaters / filters: price vs gallons
const H = GEAR.heaters.filter(priced).map((h) => [mid(h), h.priceUsd]);
const hf = fit(H);
add('gear.heater.base', DEF.gear.heater.base, hf.base, H.length, 'OLS price~gal, bootstrap p10/p90; listed (non-est) prices; gal = mid of galMin..galMax');
add('gear.heater.perGal', DEF.gear.heater.perGal, hf.per, H.length, 'same fit, slope');
const F = GEAR.filters.filter(priced).filter((f) => f.kind !== 'canister').map((f) => [mid(f), f.priceUsd]);
const ff = fit(F);
add('gear.filter.base', DEF.gear.filter.base, ff.base, F.length, 'OLS price~gal; hob+internal+sponge, listed prices, canisters excluded');
add('gear.filter.perGal', DEF.gear.filter.perGal, ff.per, F.length, 'same fit, slope');
const Fa = GEAR.filters.filter(priced).map((f) => [mid(f), f.priceUsd]);
const fa = fit(Fa);
add('gear.filter.base (incl. canister)', DEF.gear.filter.base, fa.base, Fa.length, 'OLS incl. canisters');
add('gear.filter.perGal (incl. canister)', DEF.gear.filter.perGal, fa.per, Fa.length, 'OLS incl. canisters');
// total at reference tank sizes (base and slope are collinear: compare the sum)
for (const g of [20, 55]) {
  const tot = (k, p) => DEF.gear[k].base[p] + DEF.gear[k].perGal[p] * g;
  const ours = (k) => ({ lo: tot(k, 'lo'), mode: tot(k, 'mode'), hi: tot(k, 'hi') });
  add(`gear.heater @${g} gal`, ours('heater'), { lo: NaN, mode: hf.base.mode + hf.per.mode * g, hi: NaN }, H.length, 'base + perGal*gal at the mode');
  add(`gear.filter @${g} gal`, ours('filter'), { lo: NaN, mode: ff.base.mode + ff.per.mode * g, hi: NaN }, F.length, 'base + perGal*gal at the mode (hob/internal/sponge fit)');
}
// stand: two items only
{
  const a = ITEMS['gear:stand-20'], b = ITEMS['gear:stand-55'];
  const per = (b.mode - a.mode) / 35, perLo = (b.lo - a.lo) / 35, perHi = (b.hi - a.hi) / 35;
  add('gear.stand.perGal', DEF.gear.stand.perGal, { lo: perLo, mode: per, hi: perHi }, 2, 'line through the stand-20 and stand-55 rows (2 points)');
  add('gear.stand.base', DEF.gear.stand.base, { lo: a.lo - perLo * 20, mode: a.mode - per * 20, hi: a.hi - perHi * 20 }, 2, 'same line, intercept');
}
// tanks per class: street tank-only prices / rated gallons
const cls = DEF.gear.tank, per = cls.map(() => []);
for (const t of TANKS) for (const v of t.variants || []) if (v.price_usd && v.price_kind === 'street') per[cls.findIndex((c) => t.ratedGal <= c.maxGal)].push(v.price_usd / t.ratedGal);
cls.forEach((c, i) => add(`gear.tank.${i}.perGal (<=${c.maxGal} gal)`, c.perGal, pctBand(per[i]), per[i].length, 'price_kind=street variants, USD/ratedGal; median, p10, p90 (kit, msrp rows excluded)'));
// lids, co2, skimmer, ferts: demand-items rows
const R = (k) => ITEMS[k];
const rowBand = (path, ours, keys, method) => {
  const rs = keys.map(R).filter(Boolean);
  add(path, ours, { lo: q(rs.map((r) => r.lo), 0.5), mode: q(rs.map((r) => r.mode), 0.5), hi: q(rs.map((r) => r.hi), 0.5) }, rs.length, method);
};
for (const k of ['glass', 'mesh', 'hood']) rowBand(`gear.lid.${k}`, DEF.gear.lid[k], [`gear:lid-${k}`], 'the one gear:lid row (lo/mode/hi as stored; n = rows)');
rowBand('gear.co2.setup', DEF.gear.co2.setup, ['gear:co2-kit', 'gear:diy-co2'], 'median of co2-kit and diy-co2 rows (n = rows)');
rowBand('gear.skimmer.setup', DEF.gear.skimmer.setup, ['gear:skimmer', 'gear:skimmer-hob'], 'median of in-sump and HOB skimmer rows (n = rows)');
rowBand('gear.ferts.upkeepUsdMo', DEF.gear.ferts.upkeepUsdMo, ['gear:ferts'], 'the one gear:ferts row, per month (dose is a judgement)');
// animals: scale each row's mode to the category refMm by (ref/tl)^1.2
const spById = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
for (const [cat, u] of Object.entries(DEF.animals)) {
  if (cat[0] === '_') continue;
  const v = [];
  for (const [k, r] of Object.entries(ITEMS)) {
    if (!k.startsWith('animal:')) continue;
    const s = spById[k.slice(7)];
    if (s && (s.cat || 'fw-fish') === cat) v.push(r.mode * Math.pow(u.refMm / s.tl, 1.2));
  }
  add(`animals.${cat}.setup`, u.setup, v.length ? pctBand(v) : null, v.length, `species row mode scaled to refMm=${u.refMm} by (ref/tl)^1.2; median, p10, p90 over species`);
}
// plants and corals by class (rules mirror src/demand/engine.ts plantDifficulty / cls)
const needsSrc = readFileSync(join(root, 'src/scene/lightneeds.ts'), 'utf8');
const NEEDS = {};
{
  const body = needsSrc.slice(needsSrc.indexOf('export const NEEDS'), needsSrc.indexOf('const MIN_PAR'));
  for (const line of body.split('\n')) {
    for (const m of line.matchAll(/(\w+):\s*P\('(\w+)',\s*'(\w+)'/g)) NEEDS[m[1]] = { band: m[2], co2: m[3], note: (line.match(/note:\s*'(\w+)'/) || [])[1] };
    for (const m of line.matchAll(/(\w+):\s*C\('(\w+)'/g)) NEEDS[m[1]] = { coral: m[2] };
    for (const m of line.matchAll(/(\w+):\s*\{ band: 'land' \}/g)) NEEDS[m[1]] = { land: true };
  }
}
const EPI = new Set(['anubias', 'moss', 'fern', 'buce']);
const pclass = (id) => {
  const n = NEEDS[id];
  if (!n) return null;
  if (n.land) return 'land';
  if (n.coral) return `coral-${n.coral === 'soft' ? 'soft' : n.coral}`;
  if (n.note === 'succulent') return 'succulent';
  if (n.note === 'floater' || EPI.has(id)) return 'easy';
  const s = { low: 0, medium: 1, high: 2 }[n.band] + { none: 0, recommended: 1, required: 2 }[n.co2];
  return s >= 3 ? 'hard' : s >= 1 ? 'medium' : 'easy';
};
const pv = {};
for (const [k, r] of Object.entries(ITEMS)) if (k.startsWith('plant:')) { const c = pclass(k.slice(6)); if (c) (pv[c] ||= []).push(r.mode); }
for (const [c, u] of Object.entries(DEF.plants)) {
  if (!u.setup) continue;
  const v = pv[c] || [];
  add(`plants.${c}.setup`, u.setup, v.length ? pctBand(v) : null, v.length, 'plant rows of that derived class (per pot / frag); median, p10, p90 of row modes');
}
// hardscape: stone and live rock rows are USD per lb, the bands are per item
const grp = { wood: ['branch', 'climb', 'corkflat', 'corktube', 'manzanita', 'mopani', 'spider'], cave: ['arch', 'coconut', 'dish', 'halflog', 'stonedish', 'tube'], liverock: ['liverock'], stone: ['lava', 'ledge', 'river', 'seiryu', 'slate', 'dragon'] };
for (const [g, ks] of Object.entries(grp)) {
  const v = ks.map((k) => R(`hard:${k}`)).filter(Boolean).map((r) => r.mode);
  const perLb = g === 'stone' || g === 'liverock';
  add(`hardscape.${g}.setup`, DEF.hardscape[g].setup, v.length ? pctBand(v) : null, v.length, perLb ? 'rows are USD PER LB, band is per item: ratio = implied lb per item' : 'median, p10, p90 of per-piece row modes');
  if (perLb) rows[rows.length - 1].perLb = true;
}

const f = (x) => (Number.isFinite(x) ? (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2)) : '-');
const t3 = (r) => r && !(r.lo <= r.mode && r.mode <= r.hi) && [r.lo, r.mode, r.hi].every(Number.isFinite) ? t3s([r.lo, r.mode, r.hi].sort((a, b) => a - b)) : t3n(r);
const t3s = (a) => a.map(f).join('/');
const t3n = (r) => (r ? `${f(r.lo)}/${f(r.mode)}/${f(r.hi)}` : 'n/a');
const verdict = (r) => (!r.d || !r.n ? 'no data' : r.perLb ? `not comparable (per lb; band = ${f(1 / r.ratio)} lb of rock)` : r.agrees ? 'agrees' : `${r.n < 5 ? 'weak n<5: ' : ''}suggest ${r.d.lo === r.d.lo ? t3(r.d) : 'mode ' + f(r.d.mode)}`);
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
else {
  console.log('band path | ours lo/mode/hi | derived lo/mode/hi | n | mode ratio | verdict | method');
  for (const r of rows) console.log([r.path, t3(r.ours), t3(r.d), r.n, f(r.ratio), verdict(r), r.method].join(' | '));
}
