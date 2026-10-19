// Asks aqadvisor.com for the stocking level of each query in scripts/aq-queries.json (written by
// `GEN_AQ=1 npx vitest run test/aqcompare.test.ts`) and keeps the answers in research/aq-compare.json, keyed like aqKey().
// Politeness (the site has gone down under automatic checks): one request at a time, 30 s apart, resumes where it stopped,
// stops at the first failure. Also keeps the sentences that mention filtration, for fitting the filtration side later.
// Run: node scripts/aq-compare.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const queries = JSON.parse(readFileSync('scripts/aq-queries.json', 'utf8'));
const OUT = 'research/aq-compare.json', got = JSON.parse(readFileSync(OUT, 'utf8'));
const url = q => 'http://aqadvisor.com/AqAdvisor.php?' + new URLSearchParams({
  AquListBoxTank: 'User Defined', AquTankLength: String(q.l), AquTankDepth: String(q.d), AquTankHeight: String(q.h),
  AquListBoxFilter: 'Choose', AquListBoxFilter2: 'Choose', FormSubmit: 'Update', AlreadySelected: q.sel,
  FilterMode: 'Display all species', AqTempUnit: 'C', AqVolUnit: 'gUS', AqLengthUnit: 'inch', AqSortType: 'cname',
  AqSpeciesWindowSize: 'short', AqSearchMode: 'simple' });
let first = true;
for (const q of queries) {
  if (got[q.key]) continue;
  if (!first) await new Promise(r => setTimeout(r, 30000));
  first = false;
  try {
    const res = await fetch(url(q), { headers: { 'user-agent': 'TankLook stocking check (comparison run, 2026-10-19)' }, signal: AbortSignal.timeout(20000) });
    const text = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const m = /stocking level is\s*(\d{1,5})\s*%/i.exec(text);
    if (!m) { console.log('no result for', q.name); continue; }
    got[q.key] = { name: q.name, pct: +m[1], text: [...text.matchAll(/[^.]*\b(filtration|filter)\b[^.]*\./gi)].map(x => x[0].trim()).slice(0, 6) };
    writeFileSync(OUT, JSON.stringify(got, null, 1) + '\n');
    console.log(q.name, m[1] + '%');
  } catch (e) { console.log('stopped: aqadvisor.com did not answer (' + (e.cause?.code ?? e.message) + ')'); break; }
}
