// Checks a sourcing batch (research/sourcing/*.json, shape in research/sourcing/brief-care-tl.md): every source's quote must be
// on the live page at its url. Fetches each url once, strips the HTML to text and looks for the quote (whitespace, case,
// quotes and dashes normalised). Exact = the whole quote is there; near = at least 85 % of its words appear in order in one
// window (the agent's fetch tool sometimes rewraps a table row); miss = neither; nofetch = the page could not be read here
// (blocked, script-built page): those need a by-hand look, they are not proof of a fake.
// Usage: node scripts/verify-quotes.mjs research/sourcing/pilot-01.json   (writes <file>.verify.json, prints a summary)
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const batch = JSON.parse(readFileSync(file, 'utf8'));
const norm = s => s.toLowerCase()
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&deg;|&#176;/g, '°').replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, '-')
  .replace(/&#8217;|&rsquo;|&#8216;|&lsquo;|&#39;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
const text = html => norm(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
const words = s => s.replace(/[^a-z0-9.°%-]+/g, ' ').replace(/\.(?!\d)/g, ' ').trim().split(/ +/).filter(Boolean);
// the same characters in the same order with every space and punctuation mark dropped: a table cell split by markup
// ('~54<small>litres</small>') or a table row the fetch tool re-piped ('| Easy |') still matches, a changed number does not
const compact = s => s.replace(/[^a-z0-9]+/g, '');

function near(page, quote) {
  const q = words(quote), p = words(page);
  if (!q.length) return 0;
  let best = 0;
  // anchor on each occurrence of the quote's rarest-looking (longest) word, then match in order within a window
  const anchor = [...q].sort((a, b) => b.length - a.length)[0];
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== anchor) continue;
    const from = Math.max(0, i - q.length * 2), to = Math.min(p.length, i + q.length * 2);
    let k = 0;
    for (let j = from; j < to && k < q.length; j++) if (p[j] === q[k]) k++;
    // in-order match from the window start can miss a reordered head; also count the set overlap
    const set = new Set(p.slice(from, to));
    const hit = Math.max(k, q.filter(w => set.has(w)).length * 0.95);
    best = Math.max(best, hit / q.length);
  }
  return best;
}

// The quote must carry the value, not only the field's label ('Maximum Size' with the number in another cell proves nothing).
// Sizes, counts, pH, climate: a number from `states` (number words count: 'six', 'half a dozen', 'an inch'). Care level and
// temperament: a rating word. Other fields (solo, prey): any value word from `states`.
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50 };
const digits = q => q.replace(/half a dozen/g, '6').replace(/\ba dozen\b/g, '12').replace(/\ban? (inch|gallon|foot)/g, '1 $1')
  .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty)\b/g, w => String(NUMW[w]));
const RATING = { care: /easy|easi|medium|challeng|manageable|hard to keep|sensitive|low-maintenance|beginner|novice|first-time|new to the hobby|hardy|moderate|intermediate|difficult|expert|advanced|demanding/,
  temper: /peace|aggress|territor|docile|calm|feisty|nipp|bull|tolerant|community|timid|shy|boisterous|quarrel/ };
const LABEL = new Set(['care', 'level', 'temperament', 'size', 'maximum', 'minimum', 'max', 'min', 'tank', 'length', 'adult', 'group', 'difficulty', 'aquarium', 'volume', 'not', 'said', 'type', 'the', 'and', 'for', 'per', 'approx', 'about', 'quick', 'facts']);
function carries(field, quote, states = '') {
  const q = norm(quote);
  if (RATING[field]) return RATING[field].test(q);
  const nums = digits(norm(states)).match(/\d+(?:\.\d+)?/g) || [], dq = digits(q);
  if (nums.length || /^(tl|female\.tl|minL|group|ph|air\.)/.test(field))
    return nums.some(n => new RegExp(`(^|[^\d.])${n.replace('.', '\.')}(?!\d)`).test(dq));
  const w = words(norm(states)).filter(x => x.length >= 3 && !LABEL.has(x));
  return !w.length || w.some(x => q.includes(x.slice(0, 5)));
}
const pages = new Map();
async function page(url) {
  if (!pages.has(url)) pages.set(url, (async () => {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'accept-language': 'en' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
      if (!r.ok) return { err: `HTTP ${r.status}` };
      return { body: text(await r.text()) };
    } catch (e) { return { err: String(e.message || e).slice(0, 80) }; }
  })());
  return pages.get(url);
}

const rows = [];
for (const [id, sp] of Object.entries(batch.species ?? batch.items)) for (const [field, f] of Object.entries(sp.fields)) for (const s of f.sources || []) {
  const p = await page(s.url);
  let result, score = 0;
  if (p.err) result = 'nofetch';
  else if (p.body.includes(norm(s.quote))) { result = 'exact'; score = 1; }
  else if (compact(p.body).includes(compact(norm(s.quote)))) { result = 'compact'; score = 1; }
  else { score = near(p.body, norm(s.quote)); result = score >= 0.85 ? 'near' : 'miss'; }
  // the quote must carry the value, not just its label ('Maximum Size' with the number in another cell proves nothing)
  if ((result === 'exact' || result === 'compact') && !carries(field, s.quote, s.states)) result = 'label';
  rows.push({ id, field, verdict: f.verdict, url: s.url, result, score: +score.toFixed(2), err: p.err, quote: s.quote });
}
writeFileSync(file.replace(/\.json$/, '.verify.json'), JSON.stringify(rows, null, 1));
const count = k => rows.filter(r => r.result === k).length;
const fields = Object.values(batch.species ?? batch.items).flatMap(sp => Object.values(sp.fields));
const v = k => fields.filter(f => f.verdict === k).length;
console.log(`${file}: ${Object.keys(batch.species ?? batch.items).length} species, ${fields.length} fields (agrees ${v('agrees')}, disagrees ${v('disagrees')}, not-stated ${v('not-stated')}, behaviour-only ${v('behaviour-only')})`);
console.log(`sources ${rows.length} on ${pages.size} pages: exact ${count('exact')}, compact ${count('compact')}, label-only ${count('label')}, near ${count('near')}, miss ${count('miss')}, nofetch ${count('nofetch')}`);
for (const r of rows.filter(r => r.result === 'miss' || r.result === 'nofetch' || r.result === 'label')) console.log(`  ${r.result} ${r.id}.${r.field} ${r.score} ${r.err || ''} ${r.url}`);
