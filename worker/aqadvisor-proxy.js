// Cloudflare Worker: AqAdvisor stocking level for TankLook.
// GET /stocking?sel=<id>:<n>::,...&l=<in>&d=<in>&h=<in>  ->  {"stocking": 92}
// Only well-formed stocking requests are forwarded (not an open proxy); answers are cached for a week, so each
// distinct tank + stocking reaches aqadvisor.com at most once a week, and no more than 2 new requests go out a minute. Deploy: see worker/README.md.

const AQ = 'http://aqadvisor.com/AqAdvisor.php';
const ORIGINS = /^(https?:\/\/(www\.)?tanklook\.com|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/; // http too: Pages HTTPS isn't enforced yet
const SEL = /^\d{6,14}:\d{1,3}::(,\d{6,14}:\d{1,3}::){0,59}$/;
const CACHE_S = 7 * 24 * 3600;
const TIMEOUT_MS = 8000; // give up on AqAdvisor after 8 s

/** "Your aquarium stocking level is 66% ." -> 66; null when the page has no result. */
export function parseStocking(html) {
  const m = /stocking level is\s*(\d{1,5})\s*%/i.exec(html.replace(/<[^>]+>/g, ' '));
  return m ? Number(m[1]) : null;
}

/** The validated AqAdvisor query, or null. */
export function aqParams(search) {
  const sel = search.get('sel') ?? '';
  const dims = ['l', 'd', 'h'].map(k => Number(search.get(k)));
  if (!SEL.test(sel) || dims.some(v => !(v >= 1 && v <= 400))) return null;
  const [l, d, h] = dims;
  return new URLSearchParams({
    AquListBoxTank: 'User Defined', AquTankLength: String(l), AquTankDepth: String(d), AquTankHeight: String(h),
    AquListBoxFilter: 'Choose', AquListBoxFilter2: 'Choose', FormSubmit: 'Update', AlreadySelected: sel,
    FilterMode: 'Display all species', AqTempUnit: 'C', AqVolUnit: 'gUS', AqLengthUnit: 'inch', AqSortType: 'cname',
    AqSpeciesWindowSize: 'short', AqSearchMode: 'simple',
  });
}

function json(body, status, origin, cacheS = 0) {
  const h = { 'content-type': 'application/json', 'vary': 'Origin' };
  if (origin && ORIGINS.test(origin)) h['access-control-allow-origin'] = origin;
  if (cacheS) h['cache-control'] = `public, max-age=${cacheS}`;
  return new Response(JSON.stringify(body), { status, headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get('origin');
    if (request.method !== 'GET' || url.pathname !== '/stocking') return json({ error: 'not found' }, 404, origin);
    const q = aqParams(url.searchParams);
    if (!q) return json({ error: 'bad request' }, 400, origin);

    // answers kept 7 days in KV under the normalised AqAdvisor query, independent of the caller's origin
    const key = q.toString();
    const kept = await env.AQ_CACHE.get(key);
    if (kept !== null) return json({ stocking: Number(kept) }, 200, origin, 3600);
    // at most 2 new questions to AqAdvisor a minute (per Cloudflare location); it is a small site that went down twice
    // under light automatic use (2026-10-09)
    if (!(await env.AQ_GATE.limit({ key: 'aqadvisor' })).success) return json({ error: 'busy' }, 429, origin);
    let res;
    try {
      res = await fetch(`${AQ}?${q}`, { headers: { 'user-agent': 'TankLook stocking check (tanklook.com; results kept 7 days)' },
        signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return json({ error: 'aqadvisor unreachable' }, 502, origin);
    }
    const stocking = res.ok ? parseStocking(await res.text()) : null;
    if (stocking === null) return json({ error: 'no result' }, 502, origin);
    ctx.waitUntil(env.AQ_CACHE.put(key, String(stocking), { expirationTtl: CACHE_S }));
    return json({ stocking }, 200, origin, 3600);
  },
};
