// Price sweep (lane S232, 2026-10-26): re-reads every tank-library variant's retailer page, records the price, the list price when
// it is on sale, and dead links, and writes the changes to src/data/tanks.json as ONE commit for Nathan's yes (nothing pushes).
// Fields are the existing ones: price_usd / regular_usd / sale_ends / checked (the 30-day saleLive rule in src/data/tanks.ts stays).
//
//   node scripts/price-sweep.mjs fetch  [--limit N] [--host h] [--out dir]   plain-fetch every variant that has a url (no model tokens);
//                                                                            writes <out>/results.json and <out>/browser-queue.json
//   node scripts/price-sweep.mjs apply  <out> [--commit]                     merge results.json + browser-results.json into tanks.json,
//                                                                            write <out>/report.md; --commit makes the single commit
//   node scripts/price-sweep.mjs queue  <out>                                print the browser queue (Petco / Chewy / PetSmart ...) compactly
//
// New library entries are picked up on their own: the sweep walks tanks.json, so any variant with a url is swept. Hosts with no
// rule below get the generic JSON-LD / meta-tag read; if that finds no price the variant goes to the browser queue.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FILE = join(ROOT, 'src/data/tanks.json');
const today = () => new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** Hosts that need a real browser (Claude in Chrome): they refuse a plain fetch. */
const BROWSER_HOSTS = /(^|\.)(petco|chewy)\.com$/;
/** Not a product page for a US price: secondary sources, category pages, other currencies. Never swept. */
const SKIP_HOSTS = /(aquariumdepot\.ca|desertcart|hugglepets\.co\.uk|modelnet\.cs\.princeton|vintagevinylnews|saltwateraquariumblog|forums\.reefcentral|houstonfishbox|monsterfishkeepers)/;
const SKIP_PATH = /\/(c|category|collections|collection)\/[^/]*$|\/aquariums\/?$/;

const arg = (n) => { const i = process.argv.indexOf(n); return i < 0 ? undefined : process.argv[i + 1]; };
const loadLib = () => JSON.parse(readFileSync(FILE, 'utf8'));
const saveLib = (d) => writeFileSync(FILE, JSON.stringify(d, null, 1).replace(/\n/g, '\r\n') + '\r\n');
const money = (x) => { const n = Number(String(x).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined; };

/** Every sweepable variant: { key, model, idx, host, url, stored }. */
export function sweepList(lib) {
  const out = [];
  for (const m of lib.tanks) (m.variants ?? []).forEach((v, idx) => {
    if (!v.url || v.discontinued) return;
    let u; try { u = new URL(v.url); } catch { return; }
    if (SKIP_HOSTS.test(u.host) || SKIP_PATH.test(u.pathname)) return;
    out.push({ key: `${m.id}|${idx}`, model: m.id, idx, host: u.host, url: v.url, stored: { price: v.price_usd ?? null, regular: v.regular_usd ?? null, kind: v.price_kind ?? null, name: `${v.brand}${v.line ? ' ' + v.line : ''}` } });
  });
  return out;
}

const closest = (xs, to) => (to == null ? xs[0] : xs.reduce((a, b) => (Math.abs(b.price - to) < Math.abs(a.price - to) ? b : a)));

/** Offers from every JSON-LD Product on the page: [{ price, available }]. */
function ldOffers(html) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const t = [].concat(n['@type'] ?? []);
    if (t.includes('Product') || t.includes('ProductGroup')) {
      for (const o of [].concat(n.offers ?? [])) {
        const p = money(o.price ?? o.lowPrice ?? o.priceSpecification?.price);
        if (p) out.push({ price: p, available: !/OutOfStock|Discontinued|SoldOut/i.test(String(o.availability ?? '')) });
      }
      if (n.hasVariant) walk(n.hasVariant);
    }
    if (n['@graph']) walk(n['@graph']);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { walk(JSON.parse(m[1])); } catch { /* skip bad block */ } }
  return out;
}

async function get(url, ms = 60000) {
  return fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
}

/** One plain-fetch read. -> { status: ok|dead|browser|error, price?, regular?, available?, note? } */
async function readPage(item) {
  const u = new URL(item.url);
  if (BROWSER_HOSTS.test(u.host)) return { status: 'browser', note: 'needs Claude in Chrome' };
  try {
    // Shopify stores expose clean price / compare-at: <product url>.js
    if (/\/products\/[^/]+\/?$/.test(u.pathname)) {
      const r = await get(u.origin + u.pathname.replace(/\/$/, '') + '.js');
      if (r.ok && /json/.test(r.headers.get('content-type') ?? '')) {
        const j = await r.json();
        const vs = (j.variants ?? []).map(v => ({ price: v.price / 100, regular: v.compare_at_price ? v.compare_at_price / 100 : undefined, available: v.available }));
        if (vs.length) { const v = closest(vs, item.stored.price); return { status: 'ok', price: v.price, regular: v.regular && v.regular > v.price ? v.regular : undefined, available: v.available, note: vs.length > 1 ? `${vs.length} variants, nearest taken` : undefined }; }
      }
    }
    const r = await get(item.url);
    if (r.status === 404 || r.status === 410) return { status: 'dead', note: `HTTP ${r.status}` };
    if (!r.ok) return { status: 'browser', note: `HTTP ${r.status}` };
    const html = await r.text();
    const finalPath = new URL(r.url).pathname;
    if (finalPath === '/' && u.pathname !== '/') return { status: 'dead', note: 'redirects to the home page' };
    const offers = ldOffers(html);
    if (offers.length) { const o = closest(offers, item.stored.price); return { status: 'ok', price: o.price, available: o.available, note: offers.length > 1 ? `${offers.length} offers, nearest taken` : undefined }; }
    const meta = money((html.match(/product:price:amount"\s+content="([\d.,]+)/) ?? html.match(/itemprop="price"\s+content="([\d.,]+)/) ?? [])[1]);
    if (meta) return { status: 'ok', price: meta };
    return { status: 'browser', note: 'no price in the page source' };
  } catch (e) { return { status: 'browser', note: String(e.message ?? e).slice(0, 80) }; }
}

async function cmdFetch() {
  const out = resolve(arg('--out') ?? join(ROOT, 'research/price-sweep', today()));
  mkdirSync(out, { recursive: true });
  let list = sweepList(loadLib());
  if (arg('--host')) list = list.filter(i => i.host.includes(arg('--host')));
  if (arg('--limit')) list = list.slice(0, +arg('--limit'));
  const byHost = new Map();
  for (const i of list) (byHost.get(i.host) ?? byHost.set(i.host, []).get(i.host)).push(i);
  const results = [];
  // one request at a time per host, hosts in parallel
  await Promise.all([...byHost.values()].map(async (items) => {
    for (const i of items) { results.push({ key: i.key, url: i.url, host: i.host, ...(await readPage(i)) }); await new Promise(r => setTimeout(r, 700)); }
  }));
  results.sort((a, b) => a.key.localeCompare(b.key));
  writeFileSync(join(out, 'results.json'), JSON.stringify({ date: today(), results }, null, 1));
  const queue = results.filter(r => r.status === 'browser').map(r => ({ key: r.key, url: r.url, host: r.host }));
  writeFileSync(join(out, 'browser-queue.json'), JSON.stringify(queue, null, 1));
  const c = {}; for (const r of results) c[r.status] = (c[r.status] ?? 0) + 1;
  console.log(`${list.length} variants swept:`, JSON.stringify(c), `-> ${out}`);
}

function cmdQueue() {
  const dir = resolve(process.argv[3]);
  for (const q of JSON.parse(readFileSync(join(dir, 'browser-queue.json'), 'utf8'))) console.log(`${q.key}\t${q.url}`);
}

/** Merge the results into the library. Returns the report lines. */
function cmdApply() {
  const dir = resolve(process.argv[3]);
  const read = (f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')).results ?? [] : []);
  const browser = new Map(read('browser-results.json').map(r => [r.key, r]));
  // a browser reading replaces a plain-fetch 'browser' placeholder
  const all = read('results.json').map(r => (r.status === 'browser' && browser.has(r.key) ? { ...r, ...browser.get(r.key) } : r));
  const lib = loadLib(), day = today();
  const rep = { changed: [], sales: [], saleEnded: [], filled: [], dead: [], held: [], unreadable: [], same: 0, soldOut: [] };
  const money2 = (n) => `$${n.toFixed(2)}`;
  for (const r of all) {
    const [id, idxS] = r.key.split('|'), m = lib.tanks.find(t => t.id === id);
    let v = m?.variants?.[+idxS];
    if (!v || v.url !== r.url) v = m?.variants?.find(x => x.url === r.url); // the list moved since the fetch
    if (!v) continue;
    const name = `${id}: ${v.brand}${v.line ? ' ' + v.line : ''}${v.retailer ? ' (' + v.retailer + ')' : ''}`;
    if (r.status === 'dead') { rep.dead.push(`${name} - ${r.note} - ${r.url}`); continue; }
    if (r.status !== 'ok' || !r.price) { rep.unreadable.push(`${name} - ${r.note ?? r.status}`); continue; }
    const old = v.price_usd ?? null, oldReg = v.regular_usd ?? null, p = r.price;
    // a price far off the stored one is more likely a different size / bundle / currency than a real move: hold it for a human
    if (old && (p / old > 1.6 || p / old < 0.55)) { rep.held.push(`${name}: stored ${money2(old)}, page ${money2(p)} (x${(p / old).toFixed(2)}) - ${r.url}`); continue; }
    if (r.available === false) rep.soldOut.push(`${name} - page lists it unavailable - ${r.url}`);
    const onSale = r.regular && r.regular > p;
    // an unpriced entry is not filled by a sweep: the first price needs a human to check the page is the same size / kit
    if (old == null) { rep.filled.push(`${name}: no price stored, page shows ${money2(p)}${r.note ? ' (' + r.note + ')' : ''} - NOT applied - ${r.url}`); continue; }
    if (Math.abs(old - p) >= 0.005) rep.changed.push(`${name}: ${money2(old)} -> ${money2(p)}${onSale ? ' (on sale)' : ''}${r.note ? ' [' + r.note + ']' : ''}`);
    else rep.same++;
    v.price_usd = p; v.checked = day;
    if (onSale) {
      v.regular_usd = r.regular; if (r.sale_ends) v.sale_ends = r.sale_ends;
      if (oldReg == null || oldReg !== r.regular || Math.abs(old - p) >= 0.005) rep.sales.push(`${name}: ${money2(p)}, list ${money2(r.regular)} (${Math.round((1 - p / r.regular) * 100)} % off)${r.sale_ends ? ', ends ' + r.sale_ends : ''}`);
    } else if (oldReg != null && r.regular == null && p < oldReg * 0.98) {
      // this reader cannot see a struck-through list price (JSON-LD has none): the stored sale price still stands, so the sale stays
    } else {
      if (oldReg != null) rep.saleEnded.push(`${name}: sale gone, now ${money2(p)} (was ${money2(old)} off ${money2(oldReg)})`);
      delete v.regular_usd; delete v.sale_ends;
    }
  }
  const lines = [`# Price sweep ${day}`, '', `${all.length} variants read: ${rep.same} unchanged, ${rep.changed.length} price changes, ${rep.sales.length} sales seen, ${rep.saleEnded.length} sales ended, ${rep.filled.length} unpriced ones with a price shown, ${rep.dead.length} dead links, ${rep.held.length} held for review, ${rep.unreadable.length} unreadable.`, ''];
  const sec = (t, a) => { if (a.length) lines.push(`## ${t} (${a.length})`, ...a.map(x => '- ' + x), ''); };
  sec('Sales seen', rep.sales); sec('Price changes', rep.changed); sec('Sales ended', rep.saleEnded); sec('Unpriced entries that now show a price (NOT applied)', rep.filled);
  sec('Dead links', rep.dead); sec('Held for review (price far from the stored one; NOT applied)', rep.held); sec('Listed unavailable', rep.soldOut); sec('Unreadable (left as they were)', rep.unreadable);
  writeFileSync(join(dir, 'report.md'), lines.join('\n'));
  saveLib(lib);
  console.log(lines.slice(0, 3).join('\n'));
  return { lines, rep, day, dir };
}

function cmdCommit() {
  const { lines, rep, day, dir } = cmdApply();
  const rel = (p) => p.replace(/\\/g, '/');
  const report = join(dir, 'report.md');
  execFileSync('git', ['add', FILE, report], { cwd: ROOT });
  const body = [`Price sweep ${day}: ${rep.changed.length} price changes, ${rep.sales.length} sales, ${rep.saleEnded.length} sales ended, ${rep.dead.length} dead links`, '', ...lines.slice(2)].join('\n');
  execFileSync('git', ['commit', '-m', body + '\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>'], { cwd: ROOT, stdio: 'inherit' });
  console.log('committed (not pushed):', rel(report));
}

const cmd = process.argv[2];
if (cmd === 'fetch') await cmdFetch();
else if (cmd === 'queue') cmdQueue();
else if (cmd === 'apply') (process.argv.includes('--commit') ? cmdCommit : cmdApply)();
else if (cmd) console.log('usage: price-sweep.mjs fetch|apply <dir> [--commit]|queue <dir>');
